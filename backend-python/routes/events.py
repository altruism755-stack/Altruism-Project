from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
import datetime
import logging

from database import get_db, exclusive_db, dict_row, dict_rows
from auth import get_current_user, require_roles
from routes.notifications import create_notification
from routes.audit import log_action

router = APIRouter(prefix="/api/events", tags=["events"])
FORBIDDEN = "You do not have permission to access this resource"
logger = logging.getLogger(__name__)

# Strict one-way state machine: Upcoming → Active → Completed only.
_VALID_TRANSITIONS = {
    "Upcoming": {"Active"},
    "Active": {"Completed"},
    "Completed": set(),
}


@router.get("")
def list_events(
    status: Optional[str] = None,
    org_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    with get_db() as db:
        role = current_user["role"]

        # Scope org to caller's org for supervisors and org_admins.
        if role == "supervisor":
            sup = db.execute(
                "SELECT org_id FROM supervisors WHERE user_id = %s", (current_user["id"],)
            ).fetchone()
            if not sup:
                raise HTTPException(403, FORBIDDEN)
            caller_org = sup["org_id"]
            if org_id and org_id != caller_org:
                raise HTTPException(403, FORBIDDEN)
            org_id = caller_org
        elif role == "org_admin":
            org = db.execute(
                "SELECT id FROM organizations WHERE admin_user_id = %s", (current_user["id"],)
            ).fetchone()
            if not org:
                raise HTTPException(403, FORBIDDEN)
            caller_org = org["id"]
            if org_id and org_id != caller_org:
                raise HTTPException(403, FORBIDDEN)
            org_id = caller_org

        query = (
            "SELECT e.*, o.name as org_name, o.student_only as org_student_only, "
            "o.initials as org_initials, o.color as org_color FROM events e "
            "LEFT JOIN organizations o ON e.org_id = o.id WHERE 1=1"
        )
        params: list = []

        if status and status != "All":
            query += " AND e.status = %s"
            params.append(status)
        if org_id:
            query += " AND e.org_id = %s"
            params.append(org_id)

        query += " ORDER BY e.date DESC"
        return {"events": dict_rows(db.execute(query, params).fetchall())}


@router.get("/{event_id}")
def get_event(event_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        event = dict_row(db.execute(
            "SELECT e.*, o.name as org_name FROM events e "
            "LEFT JOIN organizations o ON e.org_id = o.id WHERE e.id = %s",
            (event_id,),
        ).fetchone())
        if not event:
            raise HTTPException(404, "Event not found")

        role = current_user["role"]
        if role == "supervisor":
            sup = db.execute(
                "SELECT org_id, id FROM supervisors WHERE user_id = %s", (current_user["id"],)
            ).fetchone()
            if not sup or sup["org_id"] != event["org_id"]:
                raise HTTPException(403, FORBIDDEN)
            sup_id = sup["id"]
            # Supervisors see approved participants assigned to them, with attendance status.
            participants = dict_rows(db.execute(
                "SELECT v.id, v.name, v.email, "
                "a.id as activity_id, a.status as activity_status, a.hours "
                "FROM event_applications ea "
                "JOIN volunteers v ON ea.volunteer_id = v.id "
                "JOIN org_volunteers ov ON v.id = ov.volunteer_id AND ov.supervisor_id = %s "
                "LEFT JOIN activities a ON a.volunteer_id = v.id AND a.event_id = ea.event_id "
                "WHERE ea.event_id = %s AND ea.status = 'Approved' AND ea.cancelled_at IS NULL",
                (sup_id, event_id),
            ).fetchall())
        elif role == "org_admin":
            org = db.execute(
                "SELECT id FROM organizations WHERE admin_user_id = %s", (current_user["id"],)
            ).fetchone()
            if not org or org["id"] != event["org_id"]:
                raise HTTPException(403, FORBIDDEN)
            # Org admin sees all approved participants with attendance status.
            participants = dict_rows(db.execute(
                "SELECT v.id, v.name, v.email, "
                "a.id as activity_id, a.status as activity_status, a.hours "
                "FROM event_applications ea "
                "JOIN volunteers v ON ea.volunteer_id = v.id "
                "LEFT JOIN activities a ON a.volunteer_id = v.id AND a.event_id = ea.event_id "
                "WHERE ea.event_id = %s AND ea.status = 'Approved' AND ea.cancelled_at IS NULL",
                (event_id,),
            ).fetchall())
        else:
            # Volunteers and other roles: no participant list
            participants = []

        return {**event, "participants": participants}


@router.post("", status_code=201)
def create_event(body: dict, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = %s", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        name = body.get("name")
        date = body.get("date")
        if not name or not date:
            raise HTTPException(400, "Name and date are required")

        acceptance_mode = body.get("acceptance_mode", "manual")
        if acceptance_mode not in ("manual", "auto"):
            acceptance_mode = "manual"

        row = db.execute(
            "INSERT INTO events "
            "(org_id, name, description, location, date, time, duration, max_volunteers, "
            "required_skills, status, acceptance_mode) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Upcoming', %s) RETURNING id",
            (
                org["id"], name, body.get("description", ""), body.get("location", ""),
                date, body.get("time", ""), body.get("duration", 0),
                body.get("max_volunteers", 0), body.get("required_skills", ""),
                acceptance_mode,
            ),
        ).fetchone()
        event = dict_row(db.execute("SELECT * FROM events WHERE id = %s", (row["id"],)).fetchone())
        return event


@router.put("/{event_id}")
def update_event(event_id: int, body: dict, current_user: dict = Depends(require_roles("org_admin"))):
    with exclusive_db() as db:
        org = db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = %s", (current_user["id"],)
        ).fetchone()
        if not org:
            raise HTTPException(403, FORBIDDEN)
        event = dict_row(db.execute("SELECT org_id, status FROM events WHERE id = %s", (event_id,)).fetchone())
        if not event or event["org_id"] != org["id"]:
            raise HTTPException(403, FORBIDDEN)

        # Validate status transition if a new status is requested.
        new_status = body.get("status")
        if new_status is not None:
            current_status = event["status"]
            if new_status != current_status:
                allowed = _VALID_TRANSITIONS.get(current_status, set())
                if new_status not in allowed:
                    raise HTTPException(
                        409,
                        f"Invalid status transition: '{current_status}' → '{new_status}'. "
                        f"Allowed: {sorted(allowed) or 'none (terminal state)'}",
                    )

        acceptance_mode = body.get("acceptance_mode")
        if acceptance_mode is not None and acceptance_mode not in ("manual", "auto"):
            acceptance_mode = None

        db.execute(
            "UPDATE events SET "
            "name = COALESCE(%s, name), description = COALESCE(%s, description), "
            "location = COALESCE(%s, location), date = COALESCE(%s, date), "
            "time = COALESCE(%s, time), duration = COALESCE(%s, duration), "
            "max_volunteers = COALESCE(%s, max_volunteers), "
            "required_skills = COALESCE(%s, required_skills), "
            "status = COALESCE(%s, status), "
            "acceptance_mode = COALESCE(%s, acceptance_mode) WHERE id = %s",
            (
                body.get("name"), body.get("description"), body.get("location"),
                body.get("date"), body.get("time"), body.get("duration"),
                body.get("max_volunteers"), body.get("required_skills"),
                new_status, acceptance_mode, event_id,
            ),
        )
        log_action(db, current_user["id"], current_user["role"], "update_event",
                   "event", event_id, {"status": new_status} if new_status else {})
        return dict_row(db.execute("SELECT * FROM events WHERE id = %s", (event_id,)).fetchone())


@router.delete("/{event_id}")
def delete_event(event_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = %s", (current_user["id"],)
        ).fetchone()
        if not org:
            raise HTTPException(403, FORBIDDEN)
        event = db.execute("SELECT org_id, status FROM events WHERE id = %s", (event_id,)).fetchone()
        if not event or event["org_id"] != org["id"]:
            raise HTTPException(403, FORBIDDEN)
        if event["status"] in ("Active", "Completed"):
            raise HTTPException(409, "Cannot delete an event that is Active or Completed")

        db.execute("DELETE FROM events WHERE id = %s", (event_id,))
        return {"message": "Event deleted"}


@router.post("/{event_id}/attendance", status_code=201)
def bulk_mark_attendance(
    event_id: int,
    body: dict,
    current_user: dict = Depends(require_roles("org_admin", "supervisor")),
):
    """
    Mark attendance for a list of approved participants.
    Allowed when the event is Active or Completed.
    Supervisors may only mark attendance for their assigned volunteers.
    Idempotent: updates existing activity records rather than duplicating.
    """
    with get_db() as db:
        event = dict_row(db.execute(
            "SELECT * FROM events WHERE id = %s", (event_id,)
        ).fetchone())
        if not event:
            raise HTTPException(404, "Event not found")

        # Attendance only makes sense for Active or Completed events.
        if event["status"] not in ("Active", "Completed"):
            raise HTTPException(
                409,
                f"Attendance can only be recorded for Active or Completed events (current: {event['status']})",
            )

        # Resolve caller org and optional supervisor id.
        supervisor_id = None
        if current_user["role"] == "supervisor":
            sup = dict_row(db.execute(
                "SELECT id, org_id FROM supervisors WHERE user_id = %s", (current_user["id"],)
            ).fetchone())
            if not sup or sup["org_id"] != event["org_id"]:
                raise HTTPException(403, FORBIDDEN)
            supervisor_id = sup["id"]
            caller_org_id = sup["org_id"]
        else:
            org = db.execute(
                "SELECT id FROM organizations WHERE admin_user_id = %s", (current_user["id"],)
            ).fetchone()
            if not org or org["id"] != event["org_id"]:
                raise HTTPException(403, FORBIDDEN)
            caller_org_id = org["id"]

        volunteer_ids: list = body.get("volunteer_ids") or []
        if not volunteer_ids:
            raise HTTPException(400, "volunteer_ids is required and must not be empty")

        date = body.get("date") or event["date"]
        hours_raw = body.get("hours")
        description = body.get("description", "")

        # Determine if this org tracks hours or only participation.
        org_row = dict_row(db.execute(
            "SELECT tracks_hours FROM organizations WHERE id = %s", (caller_org_id,)
        ).fetchone())
        tracks_hours = bool((org_row or {}).get("tracks_hours", 1))

        if tracks_hours:
            try:
                hours = float(hours_raw)
                if hours <= 0:
                    raise ValueError
            except (TypeError, ValueError):
                raise HTTPException(400, "hours must be a positive number")
            act_status = "Pending"
        else:
            hours = None
            act_status = "Completed"

        created_ids: list[int] = []
        updated_ids: list[int] = []
        skipped_count = 0

        for vol_id in volunteer_ids:
            # Only mark attendance for volunteers with an Approved application for this event.
            approved_app = db.execute(
                "SELECT id FROM event_applications "
                "WHERE event_id = %s AND volunteer_id = %s AND status = 'Approved' AND cancelled_at IS NULL",
                (event_id, vol_id),
            ).fetchone()
            if not approved_app:
                skipped_count += 1
                continue

            # Verify volunteer is an active org member.
            membership = db.execute(
                "SELECT id FROM org_volunteers "
                "WHERE org_id = %s AND volunteer_id = %s AND status = 'Active'",
                (caller_org_id, vol_id),
            ).fetchone()
            if not membership:
                skipped_count += 1
                continue

            # Supervisors may only mark attendance for their assigned volunteers.
            if supervisor_id:
                assignment = db.execute(
                    "SELECT id FROM org_volunteers WHERE volunteer_id = %s AND supervisor_id = %s",
                    (vol_id, supervisor_id),
                ).fetchone()
                if not assignment:
                    skipped_count += 1
                    continue

            # Upsert: update existing record if present, otherwise insert.
            existing = db.execute(
                "SELECT id FROM activities WHERE volunteer_id = %s AND event_id = %s",
                (vol_id, event_id),
            ).fetchone()

            if existing:
                db.execute(
                    "UPDATE activities SET date = %s, hours = %s, description = %s, status = %s, "
                    "reviewed_by = NULL, reviewed_at = NULL WHERE id = %s",
                    (date, hours, description, act_status, existing["id"]),
                )
                updated_ids.append(existing["id"])
            else:
                row = db.execute(
                    "INSERT INTO activities (volunteer_id, event_id, org_id, date, hours, description, status) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (vol_id, event_id, caller_org_id, date, hours, description, act_status),
                ).fetchone()
                created_ids.append(row["id"])

            # Notify volunteer of attendance record.
            vol_user = db.execute(
                "SELECT user_id FROM volunteers WHERE id = %s", (vol_id,)
            ).fetchone()
            if vol_user and vol_user["user_id"]:
                if tracks_hours:
                    msg = f"Your attendance at '{event['name']}' was recorded ({hours} hrs)."
                else:
                    msg = f"Your participation in '{event['name']}' has been recorded."
                create_notification(
                    db, vol_user["user_id"], "activity_submitted",
                    "Attendance Recorded", msg, "/dashboard/profile",
                )

        logger.info(
            "[EVENT %d] Attendance recorded — created=%d updated=%d skipped=%d",
            event_id, len(created_ids), len(updated_ids), skipped_count,
        )
        log_action(db, current_user["id"], current_user["role"], "bulk_attendance",
                   "event", event_id,
                   {"created": len(created_ids), "updated": len(updated_ids), "skipped": skipped_count,
                    "volunteer_ids": volunteer_ids})
        db.commit()
        return {
            "created": len(created_ids),
            "updated": len(updated_ids),
            "skipped": skipped_count,
        }
