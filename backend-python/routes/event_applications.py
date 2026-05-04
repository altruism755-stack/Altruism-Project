from fastapi import APIRouter, HTTPException, Depends

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles
from routes.notifications import create_notification

router = APIRouter(prefix="/api/event-applications", tags=["event_applications"])


@router.get("")
def list_applications(current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        vol = dict_row(db.execute(
            "SELECT id FROM volunteers WHERE user_id = ?", (current_user["id"],)
        ).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")

        apps = dict_rows(db.execute(
            "SELECT ea.*, e.name as event_name, e.date as event_date, e.time as event_time, "
            "e.location, e.description as event_description, o.name as org_name "
            "FROM event_applications ea "
            "JOIN events e ON ea.event_id = e.id "
            "JOIN organizations o ON ea.org_id = o.id "
            "WHERE ea.volunteer_id = ? ORDER BY ea.applied_date DESC",
            (vol["id"],),
        ).fetchall())
        return {"applications": apps}


@router.post("", status_code=201)
def apply_to_event(body: dict, current_user: dict = Depends(require_roles("volunteer"))):
    event_id = body.get("event_id")
    if not event_id:
        raise HTTPException(400, "event_id is required")

    with get_db() as db:
        vol = dict_row(db.execute(
            "SELECT id FROM volunteers WHERE user_id = ?", (current_user["id"],)
        ).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")

        event = dict_row(db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone())
        if not event:
            raise HTTPException(404, "Event not found")

        org = dict_row(db.execute(
            "SELECT student_only FROM organizations WHERE id = ?", (event["org_id"],)
        ).fetchone())
        if org and org.get("student_only"):
            volunteer = dict_row(db.execute(
                "SELECT education_level FROM volunteers WHERE id = ?", (vol["id"],)
            ).fetchone())
            if not volunteer or volunteer.get("education_level") != "University Student":
                raise HTTPException(
                    403,
                    "Sorry, Enactus opportunities are only available for current university students.",
                )

        existing = dict_row(db.execute(
            "SELECT id FROM event_applications WHERE volunteer_id = ? AND event_id = ?",
            (vol["id"], event_id),
        ).fetchone())
        if existing:
            raise HTTPException(409, "Already applied to this event")

        db.execute(
            "INSERT INTO event_applications (volunteer_id, event_id, org_id) VALUES (?, ?, ?)",
            (vol["id"], event_id, event["org_id"]),
        )
        # Notify org admin about new event application
        vol_info = dict_row(db.execute("SELECT name FROM volunteers WHERE id = ?", (vol["id"],)).fetchone())
        vol_name = (vol_info or {}).get("name", "A volunteer")
        org_admin = dict_row(db.execute(
            "SELECT admin_user_id FROM organizations WHERE id = ?", (event["org_id"],)
        ).fetchone())
        if org_admin and org_admin.get("admin_user_id"):
            create_notification(
                db,
                org_admin["admin_user_id"],
                "event_application",
                "New Event Application",
                f"{vol_name} applied to join '{event['name']}'. Review pending applications.",
                "/org",
            )
        db.commit()
        return {"message": "Application submitted"}


@router.get("/org/{org_id}")
def list_org_applications(org_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        apps = dict_rows(db.execute(
            "SELECT ea.*, v.name as volunteer_name, v.email as volunteer_email, e.name as event_name "
            "FROM event_applications ea "
            "JOIN volunteers v ON ea.volunteer_id = v.id "
            "JOIN events e ON ea.event_id = e.id "
            "WHERE ea.org_id = ? ORDER BY ea.applied_date DESC",
            (org_id,),
        ).fetchall())
        return {"applications": apps}


@router.put("/{app_id}/approve")
def approve_application(app_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        app = dict_row(db.execute(
            "SELECT ea.volunteer_id, ea.event_id, e.name as event_name, v.user_id "
            "FROM event_applications ea "
            "JOIN events e ON e.id = ea.event_id "
            "JOIN volunteers v ON v.id = ea.volunteer_id "
            "WHERE ea.id = ?", (app_id,)
        ).fetchone())
        db.execute("UPDATE event_applications SET status = 'Approved' WHERE id = ?", (app_id,))
        if app and app.get("user_id"):
            create_notification(
                db,
                app["user_id"],
                "application_approved",
                "Event Application Approved",
                f"You have been accepted for '{app.get('event_name', 'the event')}'. See you there!",
                "/dashboard/profile",
            )
        db.commit()
        return {"message": "Application approved"}


@router.put("/{app_id}/reject")
def reject_application(app_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        app = dict_row(db.execute(
            "SELECT ea.volunteer_id, e.name as event_name, v.user_id "
            "FROM event_applications ea "
            "JOIN events e ON e.id = ea.event_id "
            "JOIN volunteers v ON v.id = ea.volunteer_id "
            "WHERE ea.id = ?", (app_id,)
        ).fetchone())
        db.execute("UPDATE event_applications SET status = 'Rejected' WHERE id = ?", (app_id,))
        if app and app.get("user_id"):
            create_notification(
                db,
                app["user_id"],
                "application_rejected",
                "Event Application Declined",
                f"Your application for '{app.get('event_name', 'the event')}' was not accepted.",
                "/dashboard/profile",
            )
        db.commit()
        return {"message": "Application rejected"}
