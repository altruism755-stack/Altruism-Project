from fastapi import APIRouter, HTTPException, Depends

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.get("")
def list_organizations():
    with get_db() as db:
        orgs = dict_rows(db.execute(
            "SELECT id, name, description, category, color, secondary_color, initials, founded FROM organizations"
        ).fetchall())
        return {"organizations": orgs}


@router.get("/{org_id}")
def get_organization(org_id: int):
    with get_db() as db:
        org = dict_row(db.execute("SELECT * FROM organizations WHERE id = ?", (org_id,)).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        volunteers = dict_rows(db.execute(
            "SELECT v.id, v.name, v.email, v.phone, v.status, ov.department, ov.joined_date "
            "FROM volunteers v JOIN org_volunteers ov ON v.id = ov.volunteer_id WHERE ov.org_id = ?",
            (org["id"],),
        ).fetchall())

        supervisors = dict_rows(db.execute(
            "SELECT * FROM supervisors WHERE org_id = ?", (org["id"],)
        ).fetchall())

        events = dict_rows(db.execute(
            "SELECT * FROM events WHERE org_id = ? ORDER BY date DESC", (org["id"],)
        ).fetchall())

        return {**org, "volunteers": volunteers, "supervisors": supervisors, "events": events}


@router.get("/{org_id}/members")
def get_org_members(org_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        volunteers = dict_rows(db.execute(
            "SELECT v.*, ov.department, ov.status as org_status, ov.joined_date, s.name as supervisor_name "
            "FROM volunteers v JOIN org_volunteers ov ON v.id = ov.volunteer_id "
            "LEFT JOIN supervisors s ON ov.supervisor_id = s.id WHERE ov.org_id = ?",
            (org_id,),
        ).fetchall())

        supervisors = dict_rows(db.execute(
            "SELECT * FROM supervisors WHERE org_id = ?", (org_id,)
        ).fetchall())

        return {"volunteers": volunteers, "supervisors": supervisors}


@router.post("/{org_id}/join", status_code=201)
def join_organization(org_id: int, current_user: dict = Depends(require_roles("volunteer"))):
    with get_db() as db:
        vol = dict_row(db.execute(
            "SELECT id FROM volunteers WHERE user_id = ?", (current_user["id"],)
        ).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer profile not found")

        existing = dict_row(db.execute(
            "SELECT id FROM org_volunteers WHERE org_id = ? AND volunteer_id = ?",
            (org_id, vol["id"]),
        ).fetchone())
        if existing:
            raise HTTPException(409, "Already a member of this organization")

        db.execute(
            "INSERT INTO org_volunteers (org_id, volunteer_id, status) VALUES (?, ?, 'Pending')",
            (org_id, vol["id"]),
        )
        return {"message": "Application submitted"}


@router.put("/{org_id}/members/{vol_id}/approve")
def approve_org_member(
    org_id: int,
    vol_id: int,
    body: dict,
    current_user: dict = Depends(require_roles("org_admin")),
):
    with get_db() as db:
        db.execute(
            "UPDATE org_volunteers SET status = 'Active', supervisor_id = ?, department = ? "
            "WHERE org_id = ? AND volunteer_id = ?",
            (body.get("supervisor_id"), body.get("department"), org_id, vol_id),
        )
        return {"message": "Volunteer approved"}
