"""Platform-admin-only routes — review and approve organizations, system oversight."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from database import get_db, dict_row, dict_rows
from auth import require_platform_admin, hash_password

router = APIRouter(prefix="/api/admin", tags=["platform-admin"])


class AddAdminBody(BaseModel):
    email: str


class AddOrgAdminBody(BaseModel):
    email: str
    org_id: int


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
            "pending_profile_changes": db.execute(
                "SELECT COUNT(*) c FROM org_profile_change_requests WHERE status = 'pending'"
            ).fetchone()["c"],
        }
        return counts


# ── Organization profile change requests ───────────────────────────────────


# Allowed column names for profile change approval — guards against SQL injection
# in the dynamic UPDATE below. Must mirror SENSITIVE_FIELDS in organizations.py.
_SENSITIVE_COLUMNS = frozenset({
    "name", "official_email", "org_type", "founded_year",
    "org_size", "location", "hq_city",
})

_FIELD_LABELS: dict = {
    "name": "Organization Name",
    "official_email": "Official Email",
    "org_type": "Organization Type",
    "founded_year": "Founded Year",
    "org_size": "Organization Size",
    "location": "Headquarters Governorate",
    "hq_city": "Headquarters City",
}


@router.get("/profile-changes")
def list_profile_changes(
    status: Optional[str] = "pending",
    current_user: dict = Depends(require_platform_admin),
):
    """List organization profile change requests, defaulting to pending ones."""
    with get_db() as db:
        query = (
            "SELECT r.id, r.org_id, r.field, r.new_value, r.status, r.created_at, r.reviewed_at, "
            "o.name as org_name, o.logo_url as org_logo, "
            "u.email as requested_by_email "
            "FROM org_profile_change_requests r "
            "JOIN organizations o ON r.org_id = o.id "
            "JOIN users u ON r.requested_by = u.id"
        )
        params: list = []
        if status and status != "all":
            query += " WHERE r.status = ?"
            params.append(status)
        query += " ORDER BY r.created_at DESC"
        rows = dict_rows(db.execute(query, params).fetchall())
        # Attach current field value and human-readable label to each row.
        for row in rows:
            field = row["field"]
            row["field_label"] = _FIELD_LABELS.get(field, field.replace("_", " ").title())
            org_row = dict_row(db.execute(
                f"SELECT {field} FROM organizations WHERE id = ?", (row["org_id"],)
            ).fetchone()) if field in _SENSITIVE_COLUMNS else {}
            row["current_value"] = (org_row or {}).get(field)
        return {"changes": rows, "total": len(rows)}


@router.post("/profile-changes/{change_id}/approve")
def approve_profile_change(change_id: int, current_user: dict = Depends(require_platform_admin)):
    """Approve a pending profile change — applies the new value to the organization."""
    with get_db() as db:
        change = dict_row(db.execute(
            "SELECT * FROM org_profile_change_requests WHERE id = ?", (change_id,)
        ).fetchone())
        if not change:
            raise HTTPException(404, "Change request not found")
        if change["status"] != "pending":
            raise HTTPException(400, f"Change request is already {change['status']}")
        field = change["field"]
        if field not in _SENSITIVE_COLUMNS:
            raise HTTPException(400, f"Field '{field}' is not a recognized sensitive field")
        db.execute(
            f"UPDATE organizations SET {field} = ? WHERE id = ?",
            (change["new_value"], change["org_id"]),
        )
        db.execute(
            "UPDATE org_profile_change_requests SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?",
            (change_id,),
        )
        return {"message": f"Change to '{_FIELD_LABELS.get(field, field)}' approved and applied"}


@router.post("/profile-changes/{change_id}/reject")
def reject_profile_change(
    change_id: int,
    body: dict,
    current_user: dict = Depends(require_platform_admin),
):
    """Reject a pending profile change with an optional reason."""
    reason = (body or {}).get("reason", "")
    with get_db() as db:
        change = dict_row(db.execute(
            "SELECT * FROM org_profile_change_requests WHERE id = ?", (change_id,)
        ).fetchone())
        if not change:
            raise HTTPException(404, "Change request not found")
        if change["status"] != "pending":
            raise HTTPException(400, f"Change request is already {change['status']}")
        db.execute(
            "UPDATE org_profile_change_requests "
            "SET status = 'rejected', reviewed_at = datetime('now') WHERE id = ?",
            (change_id,),
        )
        field = change["field"]
        return {"message": f"Change to '{_FIELD_LABELS.get(field, field)}' rejected"}


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


# ── Organization admin management (platform-level) ──────────────────────────

@router.get("/org-admins")
def list_org_admins(
    org_id: Optional[int] = None,
    current_user: dict = Depends(require_platform_admin),
):
    with get_db() as db:
        query = (
            "SELECT oa.id, oa.user_id, u.email, o.id as org_id, o.name as org_name, oa.created_at "
            "FROM org_admins oa JOIN users u ON oa.user_id = u.id "
            "JOIN organizations o ON oa.org_id = o.id"
        )
        params: list = []
        if org_id:
            query += " WHERE oa.org_id = ?"
            params.append(org_id)
        query += " ORDER BY o.name ASC, oa.created_at ASC"
        rows = dict_rows(db.execute(query, params).fetchall())
        return {"admins": rows}


@router.post("/org-admins", status_code=201)
def add_org_admin(body: AddOrgAdminBody, current_user: dict = Depends(require_platform_admin)):
    with get_db() as db:
        org = dict_row(db.execute("SELECT id, name FROM organizations WHERE id = ?", (body.org_id,)).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")
        user = dict_row(db.execute("SELECT id, email FROM users WHERE email = ?", (body.email,)).fetchone())
        if not user:
            raise HTTPException(404, f"No user found with email '{body.email}'")
        existing = db.execute(
            "SELECT id FROM org_admins WHERE user_id = ? AND org_id = ?", (user["id"], body.org_id)
        ).fetchone()
        if existing:
            raise HTTPException(409, "User is already an organization admin for this organization")
        db.execute("INSERT INTO org_admins (user_id, org_id) VALUES (?, ?)", (user["id"], body.org_id))
        return {"message": f"{body.email} is now an organization admin for {org['name']}"}


@router.delete("/org-admins/{admin_id}")
def remove_org_admin(admin_id: int, current_user: dict = Depends(require_platform_admin)):
    with get_db() as db:
        row = db.execute("SELECT id FROM org_admins WHERE id = ?", (admin_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Organization admin not found")
        db.execute("DELETE FROM org_admins WHERE id = ?", (admin_id,))
        return {"message": "Organization admin removed"}
