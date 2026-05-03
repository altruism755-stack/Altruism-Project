from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles

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


@router.post("", status_code=201)
def log_activity(body: dict, current_user: dict = Depends(require_roles("volunteer"))):
    with get_db() as db:
        vol = dict_row(db.execute(
            "SELECT id FROM volunteers WHERE user_id = ?", (current_user["id"],)
        ).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer profile not found")

        date = body.get("date")
        hours = body.get("hours")
        if not date or not hours:
            raise HTTPException(400, "Date and hours are required")

        event_id = body.get("event_id")
        org_id = None
        if event_id:
            event = dict_row(db.execute("SELECT org_id FROM events WHERE id = ?", (event_id,)).fetchone())
            if event:
                org_id = event["org_id"]

        cur = db.execute(
            "INSERT INTO activities (volunteer_id, event_id, org_id, date, hours, description, status) "
            "VALUES (?, ?, ?, ?, ?, ?, 'Pending')",
            (vol["id"], event_id, org_id, date, hours, body.get("description", "")),
        )

        activity = dict_row(db.execute(
            "SELECT a.*, e.name as event_name FROM activities a "
            "LEFT JOIN events e ON a.event_id = e.id WHERE a.id = ?",
            (cur.lastrowid,),
        ).fetchone())

        return activity


@router.put("/{activity_id}/approve")
def approve_activity(
    activity_id: int,
    current_user: dict = Depends(require_roles("supervisor", "org_admin")),
):
    with get_db() as db:
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
        return {"message": "Activity approved"}


@router.put("/{activity_id}/reject")
def reject_activity(
    activity_id: int,
    current_user: dict = Depends(require_roles("supervisor", "org_admin")),
):
    with get_db() as db:
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
        return {"message": "Activity rejected"}
