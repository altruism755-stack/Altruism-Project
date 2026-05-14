"""Platform-admin-only routes — review and approve organizations, system oversight."""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional

from database import get_db, dict_row, dict_rows
from auth import require_platform_admin, hash_password
from routes.notifications import create_notification

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
            query += " WHERE o.status = %s"
            params.append(status)
        query += " ORDER BY o.created_at DESC"
        orgs = dict_rows(db.execute(query, params).fetchall())
        return {"organizations": orgs}


@router.get("/organizations/{org_id}")
def get_organization_detail(org_id: int, current_user: dict = Depends(require_platform_admin)):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT o.*, u.email as admin_email FROM organizations o "
            "LEFT JOIN users u ON o.admin_user_id = u.id WHERE o.id = %s",
            (org_id,),
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")
        return org


@router.put("/organizations/{org_id}/approve")
def approve_organization(org_id: int, current_user: dict = Depends(require_platform_admin)):
    with get_db() as db:
        org = dict_row(db.execute("SELECT id FROM organizations WHERE id = %s", (org_id,)).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")
        org = dict_row(db.execute("SELECT name, admin_user_id FROM organizations WHERE id = %s", (org_id,)).fetchone())
        db.execute(
            "UPDATE organizations SET status = 'approved', rejection_reason = NULL, reviewed_at = NOW() WHERE id = %s",
            (org_id,),
        )
        if org:
            create_notification(
                db,
                user_id=org["admin_user_id"],
                type="org_approved",
                title="Organization Approved",
                message=f"Your organization '{org['name']}' has been approved. You can now access your dashboard.",
                action_url="/org",
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
        org = dict_row(db.execute("SELECT id FROM organizations WHERE id = %s", (org_id,)).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")
        org = dict_row(db.execute("SELECT name, admin_user_id FROM organizations WHERE id = %s", (org_id,)).fetchone())
        db.execute(
            "UPDATE organizations SET status = 'rejected', rejection_reason = %s, reviewed_at = NOW() WHERE id = %s",
            (reason, org_id),
        )
        if org:
            msg = f"Your organization '{org['name']}' was not approved."
            if reason:
                msg += f" Reason: {reason}"
            create_notification(
                db,
                user_id=org["admin_user_id"],
                type="org_rejected",
                title="Organization Application Rejected",
                message=msg,
                action_url=None,
            )
        return {"message": "Organization rejected"}


@router.get("/stats")
def platform_stats(current_user: dict = Depends(require_platform_admin)):
    with get_db() as db:
        row = db.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM organizations)                                        AS total_organizations,
                (SELECT COUNT(*) FROM organizations WHERE status = 'pending')               AS pending_organizations,
                (SELECT COUNT(*) FROM organizations WHERE status = 'approved')              AS approved_organizations,
                (SELECT COUNT(*) FROM organizations WHERE status = 'rejected')              AS rejected_organizations,
                (SELECT COUNT(*) FROM volunteers)                                                AS total_volunteers,
                (SELECT COUNT(*) FROM supervisors)                                             AS total_supervisors,
                (SELECT COUNT(*) FROM users)                                                   AS total_users,
                (SELECT COUNT(*) FROM users WHERE role = 'platform_admin')                     AS total_platform_admins,
                (SELECT COUNT(*) FROM org_profile_change_requests WHERE status = 'pending')    AS pending_profile_changes
            """
        ).fetchone()
        return dict(row)


# ── Organization profile change requests ───────────────────────────────────


# Allowed column names for profile change approval — guards against SQL injection
# in the dynamic UPDATE below. Must mirror SENSITIVE_FIELDS in organizations.py.
_SENSITIVE_COLUMNS = frozenset({
    "name", "official_email", "org_type", "founded_year",
    "org_size", "hq_city",
})

_FIELD_LABELS: dict = {
    "name": "Organization Name",
    "official_email": "Official Email",
    "org_type": "Organization Type",
    "founded_year": "Founded Year",
    "org_size": "Organization Size",
    "hq_city": "Headquarters City",
}


@router.get("/profile-changes")
def list_profile_changes(
    status: Optional[str] = "pending",
    current_user: dict = Depends(require_platform_admin),
):
    """List organization profile change requests, defaulting to pending ones."""
    with get_db() as db:
        # Join all 7 sensitive columns in one go — avoids N extra queries per row.
        query = (
            "SELECT r.id, r.org_id, r.field, r.new_value, r.status, r.created_at, r.reviewed_at, "
            "o.name as org_name, o.logo_url as org_logo, "
            "u.email as requested_by_email, "
            "o.name as cur_name, o.official_email as cur_official_email, "
            "o.org_type as cur_org_type, o.founded_year as cur_founded_year, "
            "o.org_size as cur_org_size, o.hq_city as cur_hq_city "
            "FROM org_profile_change_requests r "
            "JOIN organizations o ON r.org_id = o.id "
            "JOIN users u ON r.requested_by = u.id"
        )
        params: list = []
        if status and status != "all":
            query += " WHERE r.status = %s"
            params.append(status)
        query += " ORDER BY r.created_at DESC"
        rows = dict_rows(db.execute(query, params).fetchall())
        for row in rows:
            field = row["field"]
            row["field_label"] = _FIELD_LABELS.get(field, field.replace("_", " ").title())
            row["current_value"] = row.get(f"cur_{field}") if field in _SENSITIVE_COLUMNS else None
        return {"changes": rows, "total": len(rows)}


@router.post("/profile-changes/{change_id}/approve")
def approve_profile_change(change_id: int, current_user: dict = Depends(require_platform_admin)):
    """Approve a pending profile change — applies the new value to the organization."""
    with get_db() as db:
        change = dict_row(db.execute(
            "SELECT * FROM org_profile_change_requests WHERE id = %s", (change_id,)
        ).fetchone())
        if not change:
            raise HTTPException(404, "Change request not found")
        if change["status"] != "pending":
            raise HTTPException(400, f"Change request is already {change['status']}")
        field = change["field"]
        if field not in _SENSITIVE_COLUMNS:
            raise HTTPException(400, f"Field '{field}' is not a recognized sensitive field")
        db.execute(
            f"UPDATE organizations SET {field} = %s WHERE id = %s",
            (change["new_value"], change["org_id"]),
        )
        db.execute(
            "UPDATE org_profile_change_requests SET status = 'approved', reviewed_at = NOW() WHERE id = %s",
            (change_id,),
        )
        org = dict_row(db.execute(
            "SELECT admin_user_id FROM organizations WHERE id = %s", (change["org_id"],)
        ).fetchone())
        if org:
            label = _FIELD_LABELS.get(field, field)
            create_notification(
                db,
                user_id=org["admin_user_id"],
                type="profile_change_approved",
                title="Profile Change Approved",
                message=f"Your requested change to '{label}' has been approved and applied to your profile.",
                action_url="/org/profile",
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
            "SELECT * FROM org_profile_change_requests WHERE id = %s", (change_id,)
        ).fetchone())
        if not change:
            raise HTTPException(404, "Change request not found")
        if change["status"] != "pending":
            raise HTTPException(400, f"Change request is already {change['status']}")
        db.execute(
            "UPDATE org_profile_change_requests "
            "SET status = 'rejected', reviewed_at = NOW() WHERE id = %s",
            (change_id,),
        )
        field = change["field"]
        org = dict_row(db.execute(
            "SELECT admin_user_id FROM organizations WHERE id = %s", (change["org_id"],)
        ).fetchone())
        org_admin_user_id = (org or {}).get("admin_user_id")
        if not org_admin_user_id:
            raise HTTPException(500, f"Organization has no admin user assigned (org_id={change['org_id']})")
        label = _FIELD_LABELS.get(field, field)
        msg = f"Your requested change to '{label}' was not approved."
        if reason:
            msg += f" Reason: {reason}"
        create_notification(
            db,
            user_id=org_admin_user_id,
            type="profile_change_rejected",
            title="Profile Change Rejected",
            message=msg,
            action_url="/org/profile",
        )
        return {"message": f"Change to '{_FIELD_LABELS.get(field, field)}' rejected"}


# ── Volunteer management ────────────────────────────────────────────────────

@router.get("/volunteers")
def list_all_volunteers(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(require_platform_admin),
):
    """List all volunteers across the platform with aggregated org and activity counts."""
    with get_db() as db:
        conditions, params = [], []
        if status:
            conditions.append("v.status = %s")
            params.append(status)
        if search:
            conditions.append("(v.name ILIKE %s OR u.email ILIKE %s)")
            params.extend([f"%{search}%", f"%{search}%"])

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        params += [limit, offset]
        volunteers = dict_rows(db.execute(
            f"""
            SELECT v.*, u.email as user_email, u.created_at as user_created_at,
                   COUNT(DISTINCT CASE WHEN ov.status = 'active' THEN ov.id END) AS active_orgs,
                   COUNT(DISTINCT a.id) AS activity_count
            FROM volunteers v
            LEFT JOIN users u ON v.user_id = u.id
            LEFT JOIN org_volunteers ov ON ov.volunteer_id = v.id
            LEFT JOIN activities a ON a.volunteer_id = v.id
            {where}
            GROUP BY v.id, u.email, u.created_at
            ORDER BY v.created_at DESC
            LIMIT %s OFFSET %s
            """,
            params,
        ).fetchall())
        return {"volunteers": volunteers, "limit": limit, "offset": offset}


@router.put("/volunteers/{volunteer_id}/status")
def update_volunteer_status(
    volunteer_id: int,
    body: dict,
    current_user: dict = Depends(require_platform_admin),
):
    new_status = (body or {}).get("status", "")
    if new_status not in ("active", "pending", "suspended"):
        raise HTTPException(400, "Status must be active, pending, or suspended")
    with get_db() as db:
        vol = dict_row(db.execute("SELECT id FROM volunteers WHERE id = %s", (volunteer_id,)).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")
        db.execute("UPDATE volunteers SET status = %s WHERE id = %s", (new_status, volunteer_id))
        return {"message": f"Volunteer status set to {new_status}"}


# ── Platform admin management ───────────────────────────────────────────────

@router.get("/platform-admins")
def list_platform_admins(current_user: dict = Depends(require_platform_admin)):
    with get_db() as db:
        rows = dict_rows(db.execute(
            "SELECT id as user_id, email, created_at FROM users WHERE role = 'platform_admin' ORDER BY created_at ASC"
        ).fetchall())
        return {"admins": rows}


@router.post("/platform-admins", status_code=201)
def add_platform_admin(body: AddAdminBody, current_user: dict = Depends(require_platform_admin)):
    with get_db() as db:
        user = dict_row(db.execute("SELECT id, email, role FROM users WHERE email = %s", (body.email,)).fetchone())
        if not user:
            raise HTTPException(404, f"No user found with email '{body.email}'")
        if user["role"] == "platform_admin":
            raise HTTPException(409, "User is already a platform admin")
        db.execute("UPDATE users SET role = 'platform_admin' WHERE id = %s", (user["id"],))
        return {"message": f"{body.email} is now a platform admin"}


@router.delete("/platform-admins/{user_id}")
def remove_platform_admin(user_id: int, current_user: dict = Depends(require_platform_admin)):
    if current_user["id"] == user_id:
        raise HTTPException(400, "You cannot remove yourself as platform admin")
    with get_db() as db:
        row = db.execute("SELECT id, role FROM users WHERE id = %s", (user_id,)).fetchone()
        if not row or row["role"] != "platform_admin":
            raise HTTPException(404, "Platform admin not found")
        db.execute("UPDATE users SET role = 'volunteer' WHERE id = %s", (user_id,))
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
            query += " WHERE oa.org_id = %s"
            params.append(org_id)
        query += " ORDER BY o.name ASC, oa.created_at ASC"
        rows = dict_rows(db.execute(query, params).fetchall())
        return {"admins": rows}


@router.post("/org-admins", status_code=201)
def add_org_admin(body: AddOrgAdminBody, current_user: dict = Depends(require_platform_admin)):
    with get_db() as db:
        org = dict_row(db.execute("SELECT id, name FROM organizations WHERE id = %s", (body.org_id,)).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")
        user = dict_row(db.execute("SELECT id, email FROM users WHERE email = %s", (body.email,)).fetchone())
        if not user:
            raise HTTPException(404, f"No user found with email '{body.email}'")
        existing = db.execute(
            "SELECT id FROM org_admins WHERE user_id = %s AND org_id = %s", (user["id"], body.org_id)
        ).fetchone()
        if existing:
            raise HTTPException(409, "User is already an organization admin for this organization")
        db.execute("INSERT INTO org_admins (user_id, org_id) VALUES (%s, %s)", (user["id"], body.org_id))
        return {"message": f"{body.email} is now an organization admin for {org['name']}"}


@router.delete("/org-admins/{admin_id}")
def remove_org_admin(admin_id: int, current_user: dict = Depends(require_platform_admin)):
    with get_db() as db:
        row = db.execute("SELECT id FROM org_admins WHERE id = %s", (admin_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Organization admin not found")
        db.execute("DELETE FROM org_admins WHERE id = %s", (admin_id,))
        return {"message": "Organization admin removed"}
