from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
import datetime
import logging

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles
from routes.notifications import create_notification
from routes.audit import log_action

router = APIRouter(prefix="/api/events", tags=["events"])
FORBIDDEN = "You do not have permission to access this resource"
logger = logging.getLogger(__name__)


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
                "SELECT org_id FROM supervisors WHERE user_id = ?", (current_user["id"],)
            ).fetchone()
            if not sup:
                raise HTTPException(403, FORBIDDEN)
            caller_org = sup["org_id"]
            if org_id and org_id != caller_org:
                raise HTTPException(403, FORBIDDEN)
            org_id = caller_org
        elif role == "org_admin":
            org = db.execute(
                "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
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
            query += " AND e.status = ?"
            params.append(status)
        if org_id:
            query += " AND e.org_id = ?"
            params.append(org_id)

        query += " ORDER BY e.date DESC"
        return {"events": dict_rows(db.execute(query, params).fetchall())}


@router.get("/{event_id}")
def get_event(event_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        event = dict_row(db.execute(
            "SELECT e.*, o.name as org_name FROM events e "
            "LEFT JOIN organizations o ON e.org_id = o.id WHERE e.id = ?",
            (event_id,),
        ).fetchone())
        if not event:
            raise HTTPException(404, "Event not found")

        role = current_user["role"]
        if role == "supervisor":
            sup = db.execute(
                "SELECT org_id, id FROM supervisors WHERE user_id = ?", (current_user["id"],)
            ).fetchone()
            if not sup or sup["org_id"] != event["org_id"]:
                raise HTTPException(403, FORBIDDEN)
            # Supervisors only see volunteers assigned to them for this event.
            volunteers = dict_rows(db.execute(
                "SELECT v.id, v.name, v.email, a.status as activity_status, a.hours "
                "FROM activities a "
                "JOIN volunteers v ON a.volunteer_id = v.id "
                "JOIN org_volunteers ov ON v.id = ov.volunteer_id AND ov.supervisor_id = ? "
                "WHERE a.event_id = ?",
                (sup["id"], event["id"]),
            ).fetchall())
        elif role == "org_admin":
            org = db.execute(
                "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
            ).fetchone()
            if not org or org["id"] != event["org_id"]:
                raise HTTPException(403, FORBIDDEN)
            volunteers = dict_rows(db.execute(
                "SELECT v.id, v.name, v.email, a.status as activity_status, a.hours "
                "FROM activities a JOIN volunteers v ON a.volunteer_id = v.id "
                "WHERE a.event_id = ?",
                (event["id"],),
            ).fetchall())
        else:
            volunteers = dict_rows(db.execute(
                "SELECT v.id, v.name, v.email, a.status as activity_status, a.hours "
                "FROM activities a JOIN volunteers v ON a.volunteer_id = v.id "
                "WHERE a.event_id = ?",
                (event["id"],),
            ).fetchall())

        return {**event, "volunteers": volunteers}


@router.post("", status_code=201)
def create_event(body: dict, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
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

        cur = db.execute(
            "INSERT INTO events "
            "(org_id, name, description, location, date, time, duration, max_volunteers, "
            "required_skills, status, acceptance_mode) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Upcoming', ?)",
            (
                org["id"], name, body.get("description", ""), body.get("location", ""),
                date, body.get("time", ""), body.get("duration", 0),
                body.get("max_volunteers", 0), body.get("required_skills", ""),
                acceptance_mode,
            ),
        )
        event = dict_row(db.execute("SELECT * FROM events WHERE id = ?", (cur.lastrowid,)).fetchone())
        return event


@router.put("/{event_id}")
def update_event(event_id: int, body: dict, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone()
        if not org:
            raise HTTPException(403, FORBIDDEN)
        event = db.execute("SELECT org_id FROM events WHERE id = ?", (event_id,)).fetchone()
        if not event or event["org_id"] != org["id"]:
            raise HTTPException(403, FORBIDDEN)

        acceptance_mode = body.get("acceptance_mode")
        if acceptance_mode is not None and acceptance_mode not in ("manual", "auto"):
            acceptance_mode = None  # ignore invalid value

        db.execute(
            "UPDATE events SET "
            "name = COALESCE(?, name), description = COALESCE(?, description), "
            "location = COALESCE(?, location), date = COALESCE(?, date), "
            "time = COALESCE(?, time), duration = COALESCE(?, duration), "
            "max_volunteers = COALESCE(?, max_volunteers), "
            "required_skills = COALESCE(?, required_skills), "
            "status = COALESCE(?, status), "
            "acceptance_mode = COALESCE(?, acceptance_mode) WHERE id = ?",
            (
                body.get("name"), body.get("description"), body.get("location"),
                body.get("date"), body.get("time"), body.get("duration"),
                body.get("max_volunteers"), body.get("required_skills"),
                body.get("status"), acceptance_mode, event_id,
            ),
        )
        return dict_row(db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone())


@router.delete("/{event_id}")
def delete_event(event_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone()
        if not org:
            raise HTTPException(403, FORBIDDEN)
        event = db.execute("SELECT org_id FROM events WHERE id = ?", (event_id,)).fetchone()
        if not event or event["org_id"] != org["id"]:
            raise HTTPException(403, FORBIDDEN)

        db.execute("DELETE FROM events WHERE id = ?", (event_id,))
        return {"message": "Event deleted"}


@router.post("/{event_id}/attendance", status_code=201)
def bulk_mark_attendance(
    event_id: int,
    body: dict,
    current_user: dict = Depends(require_roles("org_admin", "supervisor")),
):
    """
    Bulk-mark attendance after an event day.
    Creates one activity record per volunteer_id provided.
    Supervisors may only mark attendance for their assigned volunteers.
    """
    with get_db() as db:
        event = dict_row(db.execute(
            "SELECT * FROM events WHERE id = ?", (event_id,)
        ).fetchone())
        if not event:
            raise HTTPException(404, "Event not found")

        # Resolve caller org and optional supervisor id
        supervisor_id = None
        if current_user["role"] == "supervisor":
            sup = dict_row(db.execute(
                "SELECT id, org_id FROM supervisors WHERE user_id = ?", (current_user["id"],)
            ).fetchone())
            if not sup or sup["org_id"] != event["org_id"]:
                raise HTTPException(403, FORBIDDEN)
            supervisor_id = sup["id"]
            caller_org_id = sup["org_id"]
        else:
            org = db.execute(
                "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
            ).fetchone()
            if not org or org["id"] != event["org_id"]:
                raise HTTPException(403, FORBIDDEN)
            caller_org_id = org["id"]

        # Prevent marking attendance before the event date (UTC-based comparison).
        today_utc = datetime.datetime.utcnow().date().isoformat()
        if event["date"] > today_utc:
            raise HTTPException(400, "Attendance can only be recorded after the event date")

        volunteer_ids: list = body.get("volunteer_ids") or []
        if not volunteer_ids:
            raise HTTPException(400, "volunteer_ids is required and must not be empty")

        date = body.get("date") or event["date"]
        hours_raw = body.get("hours")
        description = body.get("description", "")

        # Check org tracks_hours setting
        org_row = dict_row(db.execute(
            "SELECT tracks_hours FROM organizations WHERE id = ?", (caller_org_id,)
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
            # Verify volunteer is an active member of this org.
            membership = db.execute(
                "SELECT id FROM org_volunteers "
                "WHERE org_id = ? AND volunteer_id = ? AND status = 'Active'",
                (caller_org_id, vol_id),
            ).fetchone()
            if not membership:
                skipped_count += 1
                continue

            # Supervisors may only mark attendance for their assigned volunteers.
            if supervisor_id:
                assignment = db.execute(
                    "SELECT id FROM org_volunteers WHERE volunteer_id = ? AND supervisor_id = ?",
                    (vol_id, supervisor_id),
                ).fetchone()
                if not assignment:
                    skipped_count += 1
                    continue

            # Upsert: update existing record if present, otherwise insert.
            existing = db.execute(
                "SELECT id FROM activities WHERE volunteer_id = ? AND event_id = ?",
                (vol_id, event_id),
            ).fetchone()

            if existing:
                db.execute(
                    "UPDATE activities SET date = ?, hours = ?, description = ?, status = ?, "
                    "reviewed_by = NULL, reviewed_at = NULL WHERE id = ?",
                    (date, hours, description, act_status, existing["id"]),
                )
                updated_ids.append(existing["id"])
            else:
                cur = db.execute(
                    "INSERT INTO activities (volunteer_id, event_id, org_id, date, hours, description, status) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (vol_id, event_id, caller_org_id, date, hours, description, act_status),
                )
                created_ids.append(cur.lastrowid)

            # Notify volunteer
            vol_user = db.execute(
                "SELECT user_id FROM volunteers WHERE id = ?", (vol_id,)
            ).fetchone()
            if vol_user and vol_user["user_id"]:
                if tracks_hours:
                    msg = f"Your attendance at '{event['name']}' was recorded ({hours} hrs)."
                else:
                    msg = f"Your participation in '{event['name']}' has been recorded."
                create_notification(
                    db,
                    vol_user["user_id"],
                    "activity_submitted",
                    "Attendance Recorded",
                    msg,
                    "/dashboard/profile",
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
