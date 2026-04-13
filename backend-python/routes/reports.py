from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import PlainTextResponse
from typing import Optional

from database import get_db, dict_row, dict_rows
from auth import require_roles

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/summary")
def report_summary(current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        oid = org["id"]
        total_volunteers = db.execute(
            "SELECT COUNT(*) as c FROM org_volunteers WHERE org_id = ?", (oid,)
        ).fetchone()["c"]
        active_volunteers = db.execute(
            "SELECT COUNT(*) as c FROM org_volunteers WHERE org_id = ? AND status = 'Active'", (oid,)
        ).fetchone()["c"]
        total_hours = db.execute(
            "SELECT COALESCE(SUM(hours), 0) as h FROM activities WHERE org_id = ? AND status = 'Approved'", (oid,)
        ).fetchone()["h"]
        pending_activities = db.execute(
            "SELECT COUNT(*) as c FROM activities WHERE org_id = ? AND status = 'Pending'", (oid,)
        ).fetchone()["c"]
        pending_members = db.execute(
            "SELECT COUNT(*) as c FROM org_volunteers WHERE org_id = ? AND status = 'Pending'", (oid,)
        ).fetchone()["c"]
        completed_events = db.execute(
            "SELECT COUNT(*) as c FROM events WHERE org_id = ? AND status = 'Completed'", (oid,)
        ).fetchone()["c"]
        total_events = db.execute(
            "SELECT COUNT(*) as c FROM events WHERE org_id = ?", (oid,)
        ).fetchone()["c"]
        active_events = db.execute(
            "SELECT COUNT(*) as c FROM events WHERE org_id = ? AND status IN ('Active','Upcoming')", (oid,)
        ).fetchone()["c"]

        return {
            "totalVolunteers": total_volunteers,
            "activeVolunteers": active_volunteers,
            "totalHours": total_hours,
            "pendingActivities": pending_activities,
            "pendingMembers": pending_members,
            "completedEvents": completed_events,
            "totalEvents": total_events,
            "activeEvents": active_events,
        }


@router.get("/volunteer-hours")
def volunteer_hours(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(require_roles("org_admin")),
):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        oid = org["id"]
        query = (
            "SELECT v.id, v.name, v.email, v.status, "
            "COALESCE(SUM(CASE WHEN a.status = 'Approved' THEN a.hours ELSE 0 END), 0) as total_hours, "
            "COUNT(CASE WHEN a.status = 'Approved' THEN 1 END) as events_attended, "
            "MAX(CASE WHEN a.status = 'Approved' THEN a.date END) as last_activity "
            "FROM volunteers v "
            "JOIN org_volunteers ov ON v.id = ov.volunteer_id AND ov.org_id = ? "
            "LEFT JOIN activities a ON v.id = a.volunteer_id AND a.org_id = ?"
        )
        params: list = [oid, oid]

        if date_from:
            query += " AND a.date >= ?"
            params.append(date_from)
        if date_to:
            query += " AND a.date <= ?"
            params.append(date_to)

        query += " GROUP BY v.id ORDER BY total_hours DESC"

        report = dict_rows(db.execute(query, params).fetchall())
        total_hours = sum(r["total_hours"] for r in report)
        total_events = sum(r["events_attended"] for r in report)

        return {"report": report, "totalHours": total_hours, "totalEvents": total_events}


@router.get("/export-csv")
def export_csv(current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        oid = org["id"]
        rows = dict_rows(db.execute(
            "SELECT v.name, v.email, v.status, "
            "COALESCE(SUM(CASE WHEN a.status='Approved' THEN a.hours ELSE 0 END),0) as total_hours, "
            "COUNT(CASE WHEN a.status='Approved' THEN 1 END) as events "
            "FROM volunteers v JOIN org_volunteers ov ON v.id=ov.volunteer_id AND ov.org_id=? "
            "LEFT JOIN activities a ON v.id=a.volunteer_id AND a.org_id=? "
            "GROUP BY v.id ORDER BY total_hours DESC",
            (oid, oid),
        ).fetchall())

        csv = "Name,Email,Status,Total Hours,Events Attended\n"
        for r in rows:
            csv += f'"{r["name"]}","{r["email"]}","{r["status"]}",{r["total_hours"]},{r["events"]}\n'

        return PlainTextResponse(
            content=csv,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=volunteer_report.csv"},
        )
