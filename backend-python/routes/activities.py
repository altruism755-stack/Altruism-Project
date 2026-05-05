from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles
from routes.notifications import create_notification

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.get("")
def list_activities(
    volunteer_id: Optional[int] = None,
    status: Optional[str] = None,
    supervisor_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    with get_db() as db:
        query = (
            "SELECT a.*, v.name as volunteer_name, e.name as event_name "
            "FROM activities a "
            "LEFT JOIN volunteers v ON a.volunteer_id = v.id "
            "LEFT JOIN events e ON a.event_id = e.id"
        )
        joins = ""
        clauses: list[str] = []
        params: list = []

        if volunteer_id:
            clauses.append("a.volunteer_id = ?")
            params.append(volunteer_id)
        if status and status != "All":
            clauses.append("a.status = ?")
            params.append(status)
        if supervisor_id:
            joins += " INNER JOIN org_volunteers ov ON ov.volunteer_id = a.volunteer_id AND ov.supervisor_id = ?"
            params.insert(0, supervisor_id)

        if joins:
            query += joins
        if clauses:
            query += " WHERE " + " AND ".join(clauses)
        query += " ORDER BY a.date DESC"
        return {"activities": dict_rows(db.execute(query, params).fetchall())}


def _resolve_caller_org_id(db, current_user: dict) -> int:
    """Return the org_id the calling user is authorised to manage."""
    if current_user["role"] == "supervisor":
        sup = dict_row(db.execute(
            "SELECT org_id FROM supervisors WHERE user_id = ?", (current_user["id"],)
        ).fetchone())
        if not sup:
            raise HTTPException(403, "Supervisor profile not found")
        return sup["org_id"]
    # org_admin
    org = dict_row(db.execute(
        "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
    ).fetchone())
    if not org:
        raise HTTPException(403, "Organization not found for this admin")
    return org["id"]


@router.post("", status_code=201)
def log_activity(body: dict, current_user: dict = Depends(require_roles("supervisor", "org_admin"))):
    with get_db() as db:
        volunteer_id = body.get("volunteer_id")
        if not volunteer_id:
            raise HTTPException(400, "volunteer_id is required")

        vol = dict_row(db.execute(
            "SELECT id, name, user_id FROM volunteers WHERE id = ?", (volunteer_id,)
        ).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")

        date = body.get("date")
        if not date:
            raise HTTPException(400, "Date is required")

        event_id = body.get("event_id")
        org_id = body.get("org_id")
        if not org_id and event_id:
            event = dict_row(db.execute("SELECT org_id FROM events WHERE id = ?", (event_id,)).fetchone())
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
            "SELECT id FROM org_volunteers WHERE org_id = ? AND volunteer_id = ? AND status = 'Active'",
            (org_id, vol["id"]),
        ).fetchone())
        if not membership:
            raise HTTPException(403, "Volunteer is not an active member of your organization")

        # Fetch org settings.
        org_row = dict_row(db.execute(
            "SELECT tracks_hours FROM organizations WHERE id = ?", (org_id,)
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

        cur = db.execute(
            "INSERT INTO activities (volunteer_id, event_id, org_id, date, hours, description, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (vol["id"], event_id, org_id, date, hours, body.get("description", ""), status),
        )

        activity = dict_row(db.execute(
            "SELECT a.*, e.name as event_name FROM activities a "
            "LEFT JOIN events e ON a.event_id = e.id WHERE a.id = ?",
            (cur.lastrowid,),
        ).fetchone())

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

        db.commit()
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
            "WHERE a.id = ?", (activity_id,)
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
                "SELECT id FROM supervisors WHERE user_id = ?", (current_user["id"],)
            ).fetchone())
            if sup:
                reviewer_id = sup["id"]

        db.execute(
            "UPDATE activities SET status = 'Approved', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?",
            (reviewer_id, activity_id),
        )

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
        db.commit()
        return {"message": "Activity approved"}


@router.put("/{activity_id}/reject")
def reject_activity(
    activity_id: int,
    current_user: dict = Depends(require_roles("supervisor", "org_admin")),
):
    with get_db() as db:
        act = dict_row(db.execute(
            "SELECT a.hours, a.status, a.org_id, e.name as event_name, v.user_id "
            "FROM activities a "
            "LEFT JOIN events e ON a.event_id = e.id "
            "JOIN volunteers v ON v.id = a.volunteer_id "
            "WHERE a.id = ?", (activity_id,)
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
                "SELECT id FROM supervisors WHERE user_id = ?", (current_user["id"],)
            ).fetchone())
            if sup:
                reviewer_id = sup["id"]

        db.execute(
            "UPDATE activities SET status = 'Rejected', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?",
            (reviewer_id, activity_id),
        )

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
        db.commit()
        return {"message": "Activity rejected"}
