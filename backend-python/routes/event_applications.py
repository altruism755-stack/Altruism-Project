from fastapi import APIRouter, HTTPException, Depends

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles

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
        db.execute("UPDATE event_applications SET status = 'Approved' WHERE id = ?", (app_id,))
        return {"message": "Application approved"}


@router.put("/{app_id}/reject")
def reject_application(app_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        db.execute("UPDATE event_applications SET status = 'Rejected' WHERE id = ?", (app_id,))
        return {"message": "Application rejected"}
