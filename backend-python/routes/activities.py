from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
import datetime
import logging

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles, get_org_for_admin
from routes.notifications import create_notification
from routes.audit import log_action

router = APIRouter(prefix="/api/activities", tags=["activities"])
logger = logging.getLogger(__name__)


@router.get("")
def list_activities(
    volunteer_id: Optional[int] = None,
    status: Optional[str] = None,
    supervisor_id: Optional[int] = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    with get_db() as db:
        join_parts: list[str] = []
        join_params: list = []
        where_clauses: list[str] = []
        where_params: list = []

        role = current_user["role"]
        if role == "supervisor":
            # Auto-scope: only activities for this supervisor's assigned volunteers.
            sup = dict_row(db.execute(
                "SELECT id, org_id FROM supervisors WHERE user_id = %s", (current_user["id"],)
            ).fetchone())
            if not sup:
                raise HTTPException(403, "You do not have permission to access this resource")
            join_parts.append(
                "INNER JOIN org_volunteers ov ON ov.volunteer_id = a.volunteer_id AND ov.supervisor_id = %s"
            )
            join_params.append(sup["id"])
            where_clauses.append("a.org_id = %s")
            where_params.append(sup["org_id"])
        elif role == "org_admin":
            org = get_org_for_admin(db, current_user["id"])
            where_clauses.append("a.org_id = %s")
            where_params.append(org["id"])

        if volunteer_id:
            where_clauses.append("a.volunteer_id = %s")
            where_params.append(volunteer_id)
        if status and status != "All":
            where_clauses.append("a.status = %s")
            where_params.append(status)
        # supervisor_id filter only honoured for org_admin; supervisors are already auto-scoped.
        if supervisor_id and role != "supervisor":
            join_parts.append(
                "INNER JOIN org_volunteers ov_s ON ov_s.volunteer_id = a.volunteer_id AND ov_s.supervisor_id = %s"
            )
            join_params.append(supervisor_id)

        query = (
            "SELECT a.*, v.name as volunteer_name, e.name as event_name "
            "FROM activities a "
            "LEFT JOIN volunteers v ON a.volunteer_id = v.id "
            "LEFT JOIN events e ON a.event_id = e.id"
        )
        if join_parts:
            query += " " + " ".join(join_parts)
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
        query += " ORDER BY a.date DESC LIMIT %s OFFSET %s"

        params = join_params + where_params + [limit, offset]
        return {"activities": dict_rows(db.execute(query, params).fetchall()), "limit": limit, "offset": offset}


def _resolve_caller_org_id(db, current_user: dict) -> int:
    """Return the org_id the calling user is authorised to manage."""
    if current_user["role"] == "supervisor":
        sup = dict_row(db.execute(
            "SELECT org_id FROM supervisors WHERE user_id = %s", (current_user["id"],)
        ).fetchone())
        if not sup:
            raise HTTPException(403, "Supervisor profile not found")
        return sup["org_id"]
    # org_admin — check both admin_user_id and org_admins table
    return get_org_for_admin(db, current_user["id"])["id"]


@router.post("", status_code=201)
def log_activity(body: dict, current_user: dict = Depends(require_roles("supervisor", "org_admin"))):
    with get_db() as db:
        volunteer_id = body.get("volunteer_id")
        if not volunteer_id:
            raise HTTPException(400, "volunteer_id is required")

        vol = dict_row(db.execute(
            "SELECT id, name, user_id FROM volunteers WHERE id = %s", (volunteer_id,)
        ).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")

        date = body.get("date")
        if not date:
            raise HTTPException(400, "Date is required")

        event_id = body.get("event_id") or None

        org_id = body.get("org_id")
        if not org_id and event_id:
            event = dict_row(db.execute("SELECT org_id FROM events WHERE id = %s", (event_id,)).fetchone())
            if event:
                org_id = event["org_id"]

        # Security: caller may only log activities for their own org.
        caller_org_id = _resolve_caller_org_id(db, current_user)
        if org_id and int(org_id) != caller_org_id:
            raise HTTPException(403, "You can only log activities for your own organization")
        # If org_id wasn't supplied at all, default to the caller's org.
        if not org_id:
            org_id = caller_org_id

        # Verify the volunteer is an active member of this org.
        membership = dict_row(db.execute(
            "SELECT id, supervisor_id FROM org_volunteers WHERE org_id = %s AND volunteer_id = %s AND status = 'Active'",
            (org_id, vol["id"]),
        ).fetchone())
        if not membership:
            raise HTTPException(403, "Volunteer is not an active member of your organization")

        # Supervisors may only log activities for their assigned volunteers.
        if current_user["role"] == "supervisor":
            sup_record = dict_row(db.execute(
                "SELECT id FROM supervisors WHERE user_id = %s", (current_user["id"],)
            ).fetchone())
            if not sup_record or membership.get("supervisor_id") != sup_record["id"]:
                raise HTTPException(403, "You do not have permission to access this resource")

        # Prevent recording attendance before the event date (UTC-based comparison).
        if event_id:
            event_row = dict_row(db.execute(
                "SELECT date FROM events WHERE id = %s", (event_id,)
            ).fetchone())
            if not event_row:
                raise HTTPException(404, "Event not found")
            if event_row.get("date"):
                today_utc = datetime.datetime.utcnow().date()
                event_date = event_row["date"]
                if not isinstance(event_date, datetime.date):
                    event_date = datetime.date.fromisoformat(str(event_date))
                if event_date > today_utc:
                    raise HTTPException(400, "Attendance can only be recorded after the event date")

        # Fetch org settings.
        org_row = dict_row(db.execute(
            "SELECT tracks_hours FROM organizations WHERE id = %s", (org_id,)
        ).fetchone())
        tracks_hours = bool((org_row or {}).get("tracks_hours", 1))

        if tracks_hours:
            raw_hours = body.get("hours")
            try:
                hours = float(raw_hours)
            except (TypeError, ValueError):
                raise HTTPException(400, "hours must be a valid number")
            if hours <= 0:
                raise HTTPException(400, "hours must be greater than 0")
            status = body.get("status", "Pending")
            if status not in ("Pending", "Approved", "Rejected"):
                status = "Pending"
        else:
            # Participation-only: ignore any client-supplied hours or status.
            hours = None
            status = "Completed"

        # Upsert: update existing activity if one already exists for this volunteer+event.
        existing_act = dict_row(db.execute(
            "SELECT id FROM activities WHERE volunteer_id = %s AND event_id = %s",
            (vol["id"], event_id),
        ).fetchone()) if event_id else None

        if existing_act:
            db.execute(
                "UPDATE activities SET date = %s, hours = %s, description = %s, status = %s, "
                "reviewed_by = NULL, reviewed_at = NULL WHERE id = %s",
                (date, hours, body.get("description", ""), status, existing_act["id"]),
            )
            activity = dict_row(db.execute(
                "SELECT a.*, e.name as event_name FROM activities a "
                "LEFT JOIN events e ON a.event_id = e.id WHERE a.id = %s",
                (existing_act["id"],),
            ).fetchone())
            logger.info("[EVENT %d] Activity updated for volunteer %d", event_id, vol["id"])
            log_action(db, current_user["id"], current_user["role"], "log_activity",
                       "activity", existing_act["id"],
                       {"volunteer_id": vol["id"], "event_id": event_id, "hours": hours, "upsert": True})
        else:
            row = db.execute(
                "INSERT INTO activities (volunteer_id, event_id, org_id, date, hours, description, status) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (vol["id"], event_id, org_id, date, hours, body.get("description", ""), status),
            ).fetchone()
            activity = dict_row(db.execute(
                "SELECT a.*, e.name as event_name FROM activities a "
                "LEFT JOIN events e ON a.event_id = e.id WHERE a.id = %s",
                (row["id"],),
            ).fetchone())
            logger.info("[EVENT %d] Activity created for volunteer %d", event_id, vol["id"])
            log_action(db, current_user["id"], current_user["role"], "log_activity",
                       "activity", row["id"],
                       {"volunteer_id": vol["id"], "event_id": event_id, "hours": hours})

        if vol.get("user_id"):
            event_display = (activity or {}).get("event_name") or "an activity"
            if tracks_hours:
                notif_body = f"Your supervisor logged {hours} hr(s) for {event_display}. Status: {status}."
            else:
                notif_body = f"Your participation in {event_display} has been recorded."
            create_notification(
                db,
                vol["user_id"],
                "activity_submitted",
                "Activity Logged for You",
                notif_body,
                "/dashboard/profile",
            )

        return activity


@router.put("/{activity_id}/approve")
def approve_activity(
    activity_id: int,
    current_user: dict = Depends(require_roles("supervisor", "org_admin")),
):
    with get_db() as db:
        act = dict_row(db.execute(
            "SELECT a.volunteer_id, a.hours, a.status, a.org_id, e.name as event_name, v.user_id "
            "FROM activities a "
            "LEFT JOIN events e ON a.event_id = e.id "
            "JOIN volunteers v ON v.id = a.volunteer_id "
            "WHERE a.id = %s", (activity_id,)
        ).fetchone())

        if not act:
            raise HTTPException(404, "Activity not found")

        # Participation-only records are auto-completed; they cannot be approved/rejected.
        if act.get("status") == "Completed":
            raise HTTPException(400, "Participation records cannot be approved — they are already completed")

        # Security: caller must belong to the same org as the activity.
        caller_org_id = _resolve_caller_org_id(db, current_user)
        if act.get("org_id") and act["org_id"] != caller_org_id:
            raise HTTPException(403, "You can only review activities from your own organization")

        reviewer_id = None
        if current_user["role"] == "supervisor":
            sup = dict_row(db.execute(
                "SELECT id FROM supervisors WHERE user_id = %s", (current_user["id"],)
            ).fetchone())
            if not sup:
                raise HTTPException(403, "Supervisor profile not found")
            reviewer_id = sup["id"]
            # Supervisors may only approve activities for their assigned volunteers.
            assignment = db.execute(
                "SELECT id FROM org_volunteers WHERE volunteer_id = %s AND supervisor_id = %s",
                (act["volunteer_id"], reviewer_id),
            ).fetchone()
            if not assignment:
                raise HTTPException(403, "You do not have permission to access this resource")

        db.execute(
            "UPDATE activities SET status = 'Approved', reviewed_by = %s, reviewed_at = NOW() WHERE id = %s",
            (reviewer_id, activity_id),
        )
        log_action(db, current_user["id"], current_user["role"], "approve_activity",
                   "activity", activity_id,
                   {"volunteer_id": act["volunteer_id"], "org_id": act.get("org_id")})

        if act.get("user_id"):
            hrs = act.get("hours")
            event_display = act.get("event_name") or "your activity"
            if hrs is not None:
                notif_msg = f"Your {hrs} hr(s) for {event_display} have been approved. Great work!"
            else:
                notif_msg = f"Your participation in {event_display} has been approved. Great work!"
            create_notification(
                db,
                act["user_id"],
                "activity_approved",
                "Activity Approved",
                notif_msg,
                "/dashboard/profile",
            )
        return {"message": "Activity approved"}


@router.put("/{activity_id}/reject")
def reject_activity(
    activity_id: int,
    current_user: dict = Depends(require_roles("supervisor", "org_admin")),
):
    with get_db() as db:
        act = dict_row(db.execute(
            "SELECT a.volunteer_id, a.hours, a.status, a.org_id, e.name as event_name, v.user_id "
            "FROM activities a "
            "LEFT JOIN events e ON a.event_id = e.id "
            "JOIN volunteers v ON v.id = a.volunteer_id "
            "WHERE a.id = %s", (activity_id,)
        ).fetchone())

        if not act:
            raise HTTPException(404, "Activity not found")

        # Participation-only records cannot be rejected.
        if act.get("status") == "Completed":
            raise HTTPException(400, "Participation records cannot be rejected — they are already completed")

        # Security: caller must belong to the same org as the activity.
        caller_org_id = _resolve_caller_org_id(db, current_user)
        if act.get("org_id") and act["org_id"] != caller_org_id:
            raise HTTPException(403, "You can only review activities from your own organization")

        reviewer_id = None
        if current_user["role"] == "supervisor":
            sup = dict_row(db.execute(
                "SELECT id FROM supervisors WHERE user_id = %s", (current_user["id"],)
            ).fetchone())
            if not sup:
                raise HTTPException(403, "Supervisor profile not found")
            reviewer_id = sup["id"]
            # Supervisors may only reject activities for their assigned volunteers.
            assignment = db.execute(
                "SELECT id FROM org_volunteers WHERE volunteer_id = %s AND supervisor_id = %s",
                (act["volunteer_id"], reviewer_id),
            ).fetchone()
            if not assignment:
                raise HTTPException(403, "You do not have permission to access this resource")

        db.execute(
            "UPDATE activities SET status = 'Rejected', reviewed_by = %s, reviewed_at = NOW() WHERE id = %s",
            (reviewer_id, activity_id),
        )
        log_action(db, current_user["id"], current_user["role"], "reject_activity",
                   "activity", activity_id,
                   {"volunteer_id": act["volunteer_id"], "org_id": act.get("org_id")})

        if act.get("user_id"):
            hrs = act.get("hours")
            event_display = act.get("event_name") or "your activity"
            if hrs is not None:
                notif_msg = f"Your {hrs} hr(s) for {event_display} were not approved. Contact your supervisor for details."
            else:
                notif_msg = f"Your participation record for {event_display} was not approved. Contact your supervisor for details."
            create_notification(
                db,
                act["user_id"],
                "activity_rejected",
                "Activity Not Approved",
                notif_msg,
                "/dashboard/profile",
            )
        return {"message": "Activity rejected"}
