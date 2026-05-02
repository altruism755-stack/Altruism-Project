from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("")
def list_events(
    status: Optional[str] = None,
    org_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    with get_db() as db:
        query = (
            "SELECT e.*, o.name as org_name, o.student_only as org_student_only FROM events e "
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

        cur = db.execute(
            "INSERT INTO events (org_id, name, description, location, date, time, duration, max_volunteers, required_skills, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Upcoming')",
            (
                org["id"], name, body.get("description", ""), body.get("location", ""),
                date, body.get("time", ""), body.get("duration", 0),
                body.get("max_volunteers", 0), body.get("required_skills", ""),
            ),
        )
        event = dict_row(db.execute("SELECT * FROM events WHERE id = ?", (cur.lastrowid,)).fetchone())
        return event


@router.put("/{event_id}")
def update_event(event_id: int, body: dict, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        db.execute(
            "UPDATE events SET "
            "name = COALESCE(?, name), description = COALESCE(?, description), "
            "location = COALESCE(?, location), date = COALESCE(?, date), "
            "time = COALESCE(?, time), duration = COALESCE(?, duration), "
            "max_volunteers = COALESCE(?, max_volunteers), "
            "required_skills = COALESCE(?, required_skills), "
            "status = COALESCE(?, status) WHERE id = ?",
            (
                body.get("name"), body.get("description"), body.get("location"),
                body.get("date"), body.get("time"), body.get("duration"),
                body.get("max_volunteers"), body.get("required_skills"),
                body.get("status"), event_id,
            ),
        )
        return dict_row(db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone())


@router.delete("/{event_id}")
def delete_event(event_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        db.execute("DELETE FROM events WHERE id = ?", (event_id,))
        return {"message": "Event deleted"}
