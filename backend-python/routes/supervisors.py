import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends, Query

from database import get_db, exclusive_db, dict_row, dict_rows
from auth import get_current_user, require_roles, get_org_for_admin
from routes.notifications import create_notification
from routes.audit import log_action

router = APIRouter(prefix="/api/supervisors", tags=["supervisors"])


def _get_supervisor_record(db, user_id: int) -> dict:
    """Resolve a supervisor record and their org_id from auth user id."""
    sup = dict_row(db.execute(
        "SELECT * FROM supervisors WHERE user_id = %s", (user_id,)
    ).fetchone())
    if not sup:
        raise HTTPException(404, "Supervisor profile not found")
    return sup


# ─── Org-admin routes ────────────────────────────────────────────────────────

@router.get("")
def list_supervisors(current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = get_org_for_admin(db, current_user["id"])

        supervisors = dict_rows(db.execute(
            """
            SELECT s.*,
                   COUNT(e.id) AS managed_events
            FROM supervisors s
            LEFT JOIN events e ON e.created_by_supervisor_id = s.id
            WHERE s.org_id = %s
            GROUP BY s.id
            """,
            (org["id"],),
        ).fetchall())

        return {"supervisors": supervisors}


@router.post("", status_code=201)
def create_supervisor(body: dict, current_user: dict = Depends(require_roles("org_admin"))):
    name = body.get("name")
    email = body.get("email")
    phone = body.get("phone", "")
    team = body.get("team", "")

    if not name or not email:
        raise HTTPException(400, "Name and email are required")

    with get_db() as db:
        org = get_org_for_admin(db, current_user["id"])

        existing_user = dict_row(db.execute("SELECT id, role FROM users WHERE email = %s", (email,)).fetchone())
        if existing_user:
            if existing_user["role"] != "supervisor":
                raise HTTPException(
                    409,
                    f"A user with this email already exists as a '{existing_user['role']}'. "
                    "Cannot reassign to supervisor.",
                )
            user_id = existing_user["id"]
            invite_token = None
        else:
            invite_token = secrets.token_urlsafe(32)
            invite_expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            row = db.execute(
                "INSERT INTO users (email, password, role, invite_token, invite_expires_at) "
                "VALUES (%s, '', 'supervisor', %s, %s) RETURNING id",
                (email, invite_token, invite_expires_at),
            ).fetchone()
            user_id = row["id"]

        existing_sup = dict_row(db.execute("SELECT id FROM supervisors WHERE user_id = %s", (user_id,)).fetchone())
        if existing_sup:
            raise HTTPException(409, "Supervisor already exists for this user")

        db.execute(
            "INSERT INTO supervisors (user_id, name, email, phone, team, org_id, status) "
            "VALUES (%s, %s, %s, %s, %s, %s, 'Active')",
            (user_id, name, email, phone, team, org["id"]),
        )

        sup = dict_row(db.execute("SELECT * FROM supervisors WHERE user_id = %s", (user_id,)).fetchone())
        response = dict(sup)
        if invite_token:
            response["invite_token"] = invite_token
        return response


@router.delete("/{supervisor_id}")
def delete_supervisor(supervisor_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = get_org_for_admin(db, current_user["id"])
        result = db.execute(
            "SELECT id FROM supervisors WHERE id = %s AND org_id = %s",
            (supervisor_id, org["id"]),
        ).fetchone()
        if not result:
            raise HTTPException(404, "Supervisor not found in your organization")
        # Disown their events so events are not orphaned — org admin retains them.
        db.execute(
            "UPDATE events SET created_by_supervisor_id = NULL WHERE created_by_supervisor_id = %s",
            (supervisor_id,),
        )
        db.execute(
            "DELETE FROM supervisors WHERE id = %s",
            (supervisor_id,),
        )
        return {"message": "Supervisor removed"}


# ─── Supervisor self-service routes ──────────────────────────────────────────

@router.get("/me")
def get_my_profile(current_user: dict = Depends(require_roles("supervisor"))):
    """Supervisor's own profile including their org details."""
    with get_db() as db:
        sup = dict_row(db.execute(
            "SELECT id, user_id, name, email, phone, team, org_id, status, created_at "
            "FROM supervisors WHERE user_id = %s",
            (current_user["id"],),
        ).fetchone())
        if not sup:
            raise HTTPException(404, "Supervisor profile not found")
        org = dict_row(db.execute(
            "SELECT id, name, description, category, color, initials, tracks_hours FROM organizations WHERE id = %s",
            (sup["org_id"],),
        ).fetchone())
        return {"supervisor": sup, "organization": org}


@router.get("/me/events")
def get_my_events(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(require_roles("supervisor")),
):
    """Events created by this supervisor (the ones they manage)."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])
        events = dict_rows(db.execute(
            "SELECT * FROM events WHERE org_id = %s AND created_by_supervisor_id = %s "
            "ORDER BY date DESC LIMIT %s OFFSET %s",
            (sup["org_id"], sup["id"], limit, offset),
        ).fetchall())
        return {"events": events, "limit": limit, "offset": offset}


@router.get("/me/org-events")
def get_org_events(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(require_roles("supervisor")),
):
    """All events in the supervisor's organization (visible to all volunteers)."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])
        events = dict_rows(db.execute(
            "SELECT e.*, s.name as supervisor_name "
            "FROM events e "
            "LEFT JOIN supervisors s ON e.created_by_supervisor_id = s.id "
            "WHERE e.org_id = %s ORDER BY e.date DESC LIMIT %s OFFSET %s",
            (sup["org_id"], limit, offset),
        ).fetchall())
        return {"events": events, "limit": limit, "offset": offset}


@router.get("/me/events/{event_id}")
def get_my_event_detail(event_id: int, current_user: dict = Depends(require_roles("supervisor"))):
    """Full event detail including all applicants grouped by status with attendance_status."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])

        event = dict_row(db.execute(
            "SELECT * FROM events WHERE id = %s AND created_by_supervisor_id = %s",
            (event_id, sup["id"]),
        ).fetchone())
        if not event:
            raise HTTPException(404, "Event not found or you do not own this event")

        applicants = dict_rows(db.execute(
            """
            SELECT ea.id as app_id, ea.volunteer_id, ea.status, ea.applied_date,
                   ea.attendance_status,
                   v.name as volunteer_name, v.email as volunteer_email
            FROM event_applications ea
            JOIN volunteers v ON v.id = ea.volunteer_id
            WHERE ea.event_id = %s AND ea.cancelled_at IS NULL
            ORDER BY ea.applied_date ASC
            """,
            (event_id,),
        ).fetchall())

        return {**event, "applicants": applicants}


@router.post("/me/events", status_code=201)
def create_my_event(body: dict, current_user: dict = Depends(require_roles("supervisor"))):
    """Supervisor creates a new event. They become the owner (created_by_supervisor_id)."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])

        name = body.get("name", "").strip()
        if not name:
            raise HTTPException(400, "Event name is required")
        date = body.get("date")
        if not date:
            raise HTTPException(400, "Event date is required")

        row = db.execute(
            "INSERT INTO events (org_id, name, description, location, date, time, duration, "
            "max_volunteers, required_skills, status, acceptance_mode, registration_open, created_by_supervisor_id) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, %s) RETURNING id",
            (
                sup["org_id"],
                name,
                body.get("description", ""),
                body.get("location", ""),
                date,
                body.get("time", ""),
                body.get("duration") or None,
                body.get("max_volunteers") or None,
                body.get("required_skills", ""),
                body.get("status", "Upcoming"),
                body.get("acceptance_mode", "manual"),
                sup["id"],
            ),
        ).fetchone()

        event = dict_row(db.execute("SELECT * FROM events WHERE id = %s", (row["id"],)).fetchone())
        return event


@router.put("/me/events/{event_id}")
def update_my_event(event_id: int, body: dict, current_user: dict = Depends(require_roles("supervisor"))):
    """Supervisor edits one of their own events."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])

        event = dict_row(db.execute(
            "SELECT id FROM events WHERE id = %s AND created_by_supervisor_id = %s",
            (event_id, sup["id"]),
        ).fetchone())
        if not event:
            raise HTTPException(404, "Event not found or you do not own this event")

        db.execute(
            "UPDATE events SET name = %s, description = %s, location = %s, date = %s, "
            "time = %s, duration = %s, max_volunteers = %s, required_skills = %s, "
            "status = %s, acceptance_mode = %s "
            "WHERE id = %s",
            (
                body.get("name"),
                body.get("description", ""),
                body.get("location", ""),
                body.get("date"),
                body.get("time", ""),
                body.get("duration") or None,
                body.get("max_volunteers") or None,
                body.get("required_skills", ""),
                body.get("status", "Upcoming"),
                body.get("acceptance_mode", "manual"),
                event_id,
            ),
        )
        updated = dict_row(db.execute("SELECT * FROM events WHERE id = %s", (event_id,)).fetchone())
        return updated


@router.get("/me/applications")
def get_my_applications(
    status: str = Query(default="Pending"),
    current_user: dict = Depends(require_roles("supervisor")),
):
    """Pending/all applications for events created by this supervisor."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])

        where_status = "AND ea.status = %s" if status and status != "All" else ""
        params = [sup["id"]]
        if status and status != "All":
            params.append(status)

        applications = dict_rows(db.execute(
            f"""
            SELECT ea.id, ea.volunteer_id, ea.event_id, ea.org_id, ea.status,
                   ea.applied_date, ea.attendance_status,
                   v.name as volunteer_name, v.email as volunteer_email,
                   e.name as event_name, e.date as event_date, e.time as event_time,
                   e.max_volunteers, e.acceptance_mode, e.registration_open,
                   (SELECT COUNT(*) FROM event_applications a2
                    WHERE a2.event_id = ea.event_id AND a2.status = 'Approved' AND a2.cancelled_at IS NULL
                   ) AS approved_count
            FROM event_applications ea
            JOIN volunteers v ON v.id = ea.volunteer_id
            JOIN events e ON e.id = ea.event_id
            WHERE e.created_by_supervisor_id = %s
              AND ea.cancelled_at IS NULL
              {where_status}
            ORDER BY ea.applied_date ASC
            """,
            params,
        ).fetchall())

        return {"applications": applications}


@router.put("/me/applications/{app_id}/approve")
def approve_my_application(app_id: int, current_user: dict = Depends(require_roles("supervisor"))):
    """Supervisor approves a Pending application on one of their events."""
    from routes.event_applications import _get_approved_count
    with exclusive_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])

        app = dict_row(db.execute(
            """
            SELECT ea.volunteer_id, ea.event_id, ea.status,
                   e.name as event_name, e.max_volunteers, e.status as event_status,
                   e.created_by_supervisor_id,
                   v.user_id
            FROM event_applications ea
            JOIN events e ON e.id = ea.event_id
            JOIN volunteers v ON v.id = ea.volunteer_id
            WHERE ea.id = %s AND ea.cancelled_at IS NULL
            """,
            (app_id,),
        ).fetchone())
        if not app:
            raise HTTPException(404, "Application not found")
        if app["created_by_supervisor_id"] != sup["id"]:
            raise HTTPException(403, "You can only approve applications for events you manage")
        if app["status"] == "Approved":
            raise HTTPException(400, "Application is already approved")
        if app.get("event_status") != "Upcoming":
            raise HTTPException(409, "Can only approve applications for upcoming events")

        capacity = app.get("max_volunteers") or 0
        if capacity > 0:
            approved_count = _get_approved_count(db, app["event_id"])
            if approved_count >= capacity:
                raise HTTPException(409, "Event is at full capacity — cannot approve more volunteers")

        db.execute("UPDATE event_applications SET status = 'Approved' WHERE id = %s", (app_id,))
        log_action(db, current_user["id"], current_user["role"], "approve_application",
                   "event_application", app_id,
                   {"volunteer_id": app["volunteer_id"], "event_id": app["event_id"]})

        if app.get("user_id"):
            create_notification(
                db, app["user_id"], "application_approved",
                "Event Application Approved",
                f"You have been accepted for '{app.get('event_name', 'the event')}'. See you there!",
                "/dashboard/profile",
            )
        return {"message": "Application approved"}


@router.put("/me/applications/{app_id}/reject")
def reject_my_application(app_id: int, current_user: dict = Depends(require_roles("supervisor"))):
    """Supervisor rejects a Pending application on one of their events."""
    with exclusive_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])

        app = dict_row(db.execute(
            """
            SELECT ea.volunteer_id, ea.event_id, ea.status,
                   e.name as event_name, e.created_by_supervisor_id,
                   v.user_id
            FROM event_applications ea
            JOIN events e ON e.id = ea.event_id
            JOIN volunteers v ON v.id = ea.volunteer_id
            WHERE ea.id = %s AND ea.cancelled_at IS NULL
            """,
            (app_id,),
        ).fetchone())
        if not app:
            raise HTTPException(404, "Application not found")
        if app["created_by_supervisor_id"] != sup["id"]:
            raise HTTPException(403, "You can only reject applications for events you manage")
        if app["status"] == "Rejected":
            raise HTTPException(400, "Application is already rejected")

        db.execute("UPDATE event_applications SET status = 'Rejected' WHERE id = %s", (app_id,))
        log_action(db, current_user["id"], current_user["role"], "reject_application",
                   "event_application", app_id,
                   {"volunteer_id": app["volunteer_id"], "event_id": app["event_id"]})

        if app.get("user_id"):
            create_notification(
                db, app["user_id"], "application_rejected",
                "Event Application Declined",
                f"Your application for '{app.get('event_name', 'the event')}' was not accepted.",
                "/dashboard/profile",
            )
        return {"message": "Application rejected"}


@router.get("/me/activities")
def get_my_activities(
    status: str = Query(default="Pending"),
    current_user: dict = Depends(require_roles("supervisor")),
):
    """Activity logs for events owned by this supervisor."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])

        where_status = "AND a.status = %s" if status and status != "All" else ""
        params = [sup["id"], sup["org_id"]]
        if status and status != "All":
            params.append(status)

        activities = dict_rows(db.execute(
            f"""
            SELECT a.*, v.name as volunteer_name, e.name as event_name
            FROM activities a
            LEFT JOIN volunteers v ON a.volunteer_id = v.id
            LEFT JOIN events e ON a.event_id = e.id
            WHERE e.created_by_supervisor_id = %s
              AND a.org_id = %s
              {where_status}
            ORDER BY a.date DESC
            """,
            params,
        ).fetchall())

        return {"activities": activities}
