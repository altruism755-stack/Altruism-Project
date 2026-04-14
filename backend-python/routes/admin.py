"""Platform-admin-only routes — review and approve organizations, system oversight."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from database import get_db, dict_row, dict_rows
from auth import require_platform_admin, hash_password

router = APIRouter(prefix="/api/admin", tags=["platform-admin"])


class AddAdminBody(BaseModel):
    email: str


@router.get("/organizations")
def list_organizations_for_review(
    status: Optional[str] = None,
    current_user: dict = Depends(require_platform_admin),
):
    """List all organizations with their approval status. Optionally filter by status."""
    with get_db() as db:
        query = (
            "SELECT o.*, u.email as admin_email, u.created_at as admin_registered_at "
            "FROM organizations o LEFT JOIN users u ON o.admin_user_id = u.id"
        )
        params: list = []
        if status:
            query += " WHERE o.status = ?"
            params.append(status)
        query += " ORDER BY o.created_at DESC"
        orgs = dict_rows(db.execute(query, params).fetchall())
        return {"organizations": orgs}


@router.get("/organizations/{org_id}")
def get_organization_detail(org_id: int, current_user: dict = Depends(require_platform_admin)):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT o.*, u.email as admin_email FROM organizations o "
            "LEFT JOIN users u ON o.admin_user_id = u.id WHERE o.id = ?",
            (org_id,),
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")
        return org


@router.put("/organizations/{org_id}/approve")
def approve_organization(org_id: int, current_user: dict = Depends(require_platform_admin)):
    with get_db() as db:
        org = dict_row(db.execute("SELECT id FROM organizations WHERE id = ?", (org_id,)).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")
        db.execute(
            "UPDATE organizations SET status = 'approved', rejection_reason = NULL, reviewed_at = datetime('now') WHERE id = ?",
            (org_id,),
        )
        return {"message": "Organization approved"}


@router.put("/organizations/{org_id}/reject")
def reject_organization(
    org_id: int,
    body: dict,
    current_user: dict = Depends(require_platform_admin),
):
    reason = (body or {}).get("reason", "")
    with get_db() as db:
        org = dict_row(db.execute("SELECT id FROM organizations WHERE id = ?", (org_id,)).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")
        db.execute(
            "UPDATE organizations SET status = 'rejected', rejection_reason = ?, reviewed_at = datetime('now') WHERE id = ?",
            (reason, org_id),
        )
        return {"message": "Organization rejected"}


@router.get("/stats")
def platform_stats(current_user: dict = Depends(require_platform_admin)):
    with get_db() as db:
        counts = {
            "total_organizations": db.execute("SELECT COUNT(*) c FROM organizations").fetchone()["c"],
            "pending_organizations": db.execute(
                "SELECT COUNT(*) c FROM organizations WHERE status = 'pending'"
            ).fetchone()["c"],
            "approved_organizations": db.execute(
                "SELECT COUNT(*) c FROM organizations WHERE status = 'approved'"
            ).fetchone()["c"],
            "rejected_organizations": db.execute(
                "SELECT COUNT(*) c FROM organizations WHERE status = 'rejected'"
            ).fetchone()["c"],
            "total_volunteers": db.execute("SELECT COUNT(*) c FROM volunteers").fetchone()["c"],
            "total_supervisors": db.execute("SELECT COUNT(*) c FROM supervisors").fetchone()["c"],
            "total_users": db.execute("SELECT COUNT(*) c FROM users").fetchone()["c"],
            "total_platform_admins": db.execute("SELECT COUNT(*) c FROM platform_admins").fetchone()["c"],
        }
        return counts


# ── Volunteer management ────────────────────────────────────────────────────

@router.get("/volunteers")
def list_all_volunteers(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_platform_admin),
):
    """List all volunteers across the platform with their org memberships."""
    with get_db() as db:
        query = (
            "SELECT v.*, u.email as user_email, u.created_at as user_created_at, "
            "(SELECT COUNT(*) FROM org_volunteers ov WHERE ov.volunteer_id = v.id AND ov.status = 'Active') as active_orgs, "
            "(SELECT COUNT(*) FROM activities a WHERE a.volunteer_id = v.id) as activity_count "
            "FROM volunteers v LEFT JOIN users u ON v.user_id = u.id"
        )
        conditions, params = [], []
        if status:
            conditions.append("v.status = ?")
            params.append(status)
        if search:
            conditions.append("(v.name LIKE ? OR v.email LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%"])
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY v.created_at DESC"
        volunteers = dict_rows(db.execute(query, params).fetchall())
        return {"volunteers": volunteers}


@router.put("/volunteers/{volunteer_id}/status")
def update_volunteer_status(
    volunteer_id: int,
    body: dict,
    current_user: dict = Depends(require_platform_admin),
):
    new_status = (body or {}).get("status", "")
    if new_status not in ("Active", "Pending", "Suspended"):
        raise HTTPException(400, "Status must be Active, Pending, or Suspended")
    with get_db() as db:
        vol = dict_row(db.execute("SELECT id FROM volunteers WHERE id = ?", (volunteer_id,)).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")
        db.execute("UPDATE volunteers SET status = ? WHERE id = ?", (new_status, volunteer_id))
        return {"message": f"Volunteer status set to {new_status}"}


# ── Platform admin management ───────────────────────────────────────────────

@router.get("/platform-admins")
def list_platform_admins(current_user: dict = Depends(require_platform_admin)):
    with get_db() as db:
        rows = dict_rows(db.execute(
            "SELECT pa.user_id, u.email, u.created_at, pa.created_at as promoted_at "
            "FROM platform_admins pa JOIN users u ON pa.user_id = u.id "
            "ORDER BY pa.created_at ASC"
        ).fetchall())
        return {"admins": rows}


@router.post("/platform-admins", status_code=201)
def add_platform_admin(body: AddAdminBody, current_user: dict = Depends(require_platform_admin)):
    with get_db() as db:
        user = dict_row(db.execute("SELECT id, email FROM users WHERE email = ?", (body.email,)).fetchone())
        if not user:
            raise HTTPException(404, f"No user found with email '{body.email}'")
        existing = db.execute(
            "SELECT user_id FROM platform_admins WHERE user_id = ?", (user["id"],)
        ).fetchone()
        if existing:
            raise HTTPException(409, "User is already a platform admin")
        db.execute("INSERT INTO platform_admins (user_id) VALUES (?)", (user["id"],))
        return {"message": f"{body.email} is now a platform admin"}


@router.delete("/platform-admins/{user_id}")
def remove_platform_admin(user_id: int, current_user: dict = Depends(require_platform_admin)):
    if current_user["id"] == user_id:
        raise HTTPException(400, "You cannot remove yourself as platform admin")
    with get_db() as db:
        row = db.execute("SELECT user_id FROM platform_admins WHERE user_id = ?", (user_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Platform admin not found")
        db.execute("DELETE FROM platform_admins WHERE user_id = ?", (user_id,))
        return {"message": "Platform admin removed"}
