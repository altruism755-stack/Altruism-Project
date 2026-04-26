import csv
import io
import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Any, Optional

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles, require_approved_org_admin, hash_password


class AddOrgAdminBody(BaseModel):
    email: str


# Fields the org admin can update directly on their own profile.
# Mirrors the org-registration form (single source of truth) minus the
# verification step. Sensitive fields (name, official_email) are gated
# behind admin review and listed separately below.
EDITABLE_FIELDS = {
    "description", "logo_url", "phone", "website",
    "org_type", "founded_year", "org_size",
    "category", "categories",
    "location",   # HQ governorate (legacy column name)
    "hq_city", "branches",
    "submitter_name", "submitter_role", "additional_notes",
}
# Fields that require platform-admin review — changes are queued, not applied.
SENSITIVE_FIELDS = {"name", "official_email"}

# Columns whose value is a JSON-encoded array — serialized on write.
JSON_ARRAY_FIELDS = {"branches", "categories"}


class OrgProfileUpdate(BaseModel):
    # Editable
    description: Optional[str] = None
    logo_url: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    org_type: Optional[str] = None
    founded_year: Optional[str] = None
    org_size: Optional[str] = None
    category: Optional[str] = None        # legacy comma-joined string
    categories: Optional[list] = None
    location: Optional[str] = None        # HQ governorate
    hq_city: Optional[str] = None
    branches: Optional[list] = None
    submitter_name: Optional[str] = None
    submitter_role: Optional[str] = None
    additional_notes: Optional[str] = None
    # Sensitive — accepted but not applied directly.
    name: Optional[str] = None
    official_email: Optional[str] = None


def _decode_org_json(org: dict) -> dict:
    """Parse JSON-encoded list columns into native Python lists."""
    if not org:
        return org
    for f in JSON_ARRAY_FIELDS:
        raw = org.get(f)
        if isinstance(raw, str) and raw.strip():
            try:
                org[f] = json.loads(raw)
            except Exception:
                org[f] = []
        elif raw is None:
            org[f] = []
    return org


def _encode_for_db(field: str, value: Any) -> Any:
    if field in JSON_ARRAY_FIELDS:
        return json.dumps(value or [])
    return value


router = APIRouter(prefix="/api/organizations", tags=["organizations"])


# ── /me routes MUST come before /{org_id} so FastAPI doesn't try to cast
# the literal string "me" to an integer and fail with a 422. ─────────────────

def _get_my_org_id(db, user_id: int) -> int:
    org = dict_row(db.execute(
        "SELECT id FROM organizations WHERE admin_user_id = ?", (user_id,)
    ).fetchone())
    if not org:
        raise HTTPException(404, "Organization not found for this user")
    return org["id"]


# ── Organization profile (self-service) ──────────────────────────────────────

@router.get("/me/profile")
def get_my_profile(current_user: dict = Depends(require_approved_org_admin)):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT * FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")
        org = _decode_org_json(org)

        pending = dict_rows(db.execute(
            "SELECT id, field, new_value, status, created_at "
            "FROM org_profile_change_requests "
            "WHERE org_id = ? AND status = 'pending' ORDER BY created_at DESC",
            (org["id"],),
        ).fetchall())
        return {"organization": org, "pending_changes": pending}


@router.put("/me/profile")
def update_my_profile(
    body: OrgProfileUpdate,
    current_user: dict = Depends(require_approved_org_admin),
):
    payload = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")

    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT * FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        applied: list[str] = []
        queued: list[str] = []

        # Normalize JSON-array fields on the existing row before diffing,
        # so a client sending the same list twice doesn't trigger a write.
        org_decoded = _decode_org_json(dict(org))
        edits = {
            k: v for k, v in payload.items()
            if k in EDITABLE_FIELDS and v != org_decoded.get(k)
        }
        if edits:
            sets = ", ".join(f"{k} = ?" for k in edits)
            values = [_encode_for_db(k, v) for k, v in edits.items()]
            db.execute(
                f"UPDATE organizations SET {sets} WHERE id = ?",
                (*values, org["id"]),
            )
            applied = list(edits.keys())

        for field in SENSITIVE_FIELDS:
            new_val = payload.get(field)
            if new_val is None or new_val == org.get(field):
                continue
            db.execute(
                "DELETE FROM org_profile_change_requests "
                "WHERE org_id = ? AND field = ? AND status = 'pending'",
                (org["id"], field),
            )
            db.execute(
                "INSERT INTO org_profile_change_requests (org_id, requested_by, field, new_value) "
                "VALUES (?, ?, ?, ?)",
                (org["id"], current_user["id"], field, new_val),
            )
            queued.append(field)

        org_after = _decode_org_json(dict_row(db.execute(
            "SELECT * FROM organizations WHERE id = ?", (org["id"],)
        ).fetchone()))
        pending = dict_rows(db.execute(
            "SELECT id, field, new_value, status, created_at "
            "FROM org_profile_change_requests "
            "WHERE org_id = ? AND status = 'pending' ORDER BY created_at DESC",
            (org["id"],),
        ).fetchall())

        if queued and applied:
            message = "Changes saved. Updates to sensitive fields require review."
        elif queued:
            message = "This change requires review."
        elif applied:
            message = "Profile updated."
        else:
            message = "No changes to save."

        return {
            "organization": org_after,
            "applied": applied,
            "queued": queued,
            "pending_changes": pending,
            "message": message,
        }


# ── Organization admin management (org-scoped) ───────────────────────────────

@router.get("/me/admins")
def list_my_org_admins(current_user: dict = Depends(require_approved_org_admin)):
    with get_db() as db:
        org_id = _get_my_org_id(db, current_user["id"])
        rows = dict_rows(db.execute(
            "SELECT oa.id, oa.user_id, u.email, oa.created_at "
            "FROM org_admins oa JOIN users u ON oa.user_id = u.id "
            "WHERE oa.org_id = ? ORDER BY oa.created_at ASC",
            (org_id,),
        ).fetchall())
        return {"admins": rows}


@router.post("/me/admins", status_code=201)
def add_my_org_admin(body: AddOrgAdminBody, current_user: dict = Depends(require_approved_org_admin)):
    with get_db() as db:
        org_id = _get_my_org_id(db, current_user["id"])
        user = dict_row(db.execute("SELECT id, email FROM users WHERE email = ?", (body.email,)).fetchone())
        if not user:
            raise HTTPException(404, f"No user found with email '{body.email}'")
        if user["id"] == current_user["id"]:
            raise HTTPException(400, "You are already the organization owner")
        existing = db.execute(
            "SELECT id FROM org_admins WHERE user_id = ? AND org_id = ?", (user["id"], org_id)
        ).fetchone()
        if existing:
            raise HTTPException(409, "User is already an organization admin")
        db.execute("INSERT INTO org_admins (user_id, org_id) VALUES (?, ?)", (user["id"], org_id))
        return {"message": f"{body.email} is now an organization admin"}


@router.delete("/me/admins/{admin_id}")
def remove_my_org_admin(admin_id: int, current_user: dict = Depends(require_approved_org_admin)):
    with get_db() as db:
        org_id = _get_my_org_id(db, current_user["id"])
        row = dict_row(db.execute(
            "SELECT id, user_id FROM org_admins WHERE id = ? AND org_id = ?", (admin_id, org_id)
        ).fetchone())
        if not row:
            raise HTTPException(404, "Organization admin not found")
        db.execute("DELETE FROM org_admins WHERE id = ?", (admin_id,))
        return {"message": "Organization admin removed"}


# ── Public listing ────────────────────────────────────────────────────────────

@router.get("")
def list_organizations():
    with get_db() as db:
        orgs = dict_rows(db.execute(
            "SELECT id, name, description, category, color, secondary_color, initials, founded, "
            "founded_year, location, org_type, logo_url, website "
            "FROM organizations WHERE status = 'approved' OR status IS NULL"
        ).fetchall())

        for org in orgs:
            oid = org["id"]
            org["total_volunteers"] = db.execute(
                "SELECT COUNT(*) as c FROM org_volunteers WHERE org_id = ? AND status = 'Active'", (oid,)
            ).fetchone()["c"]
            org["pending_requests"] = db.execute(
                "SELECT COUNT(*) as c FROM org_volunteers WHERE org_id = ? AND status = 'Pending'", (oid,)
            ).fetchone()["c"]
            org["active_activities"] = db.execute(
                "SELECT COUNT(*) as c FROM events WHERE org_id = ? AND status IN ('Active', 'Upcoming')", (oid,)
            ).fetchone()["c"]

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


@router.put("/{org_id}/members/{vol_id}/reject")
def reject_org_member(
    org_id: int,
    vol_id: int,
    current_user: dict = Depends(require_roles("org_admin")),
):
    with get_db() as db:
        db.execute(
            "DELETE FROM org_volunteers WHERE org_id = ? AND volunteer_id = ? AND status = 'Pending'",
            (org_id, vol_id),
        )
        return {"message": "Request rejected"}


@router.post("/{org_id}/import-csv")
def import_volunteers_csv(
    org_id: int,
    body: dict,
    current_user: dict = Depends(require_roles("org_admin")),
):
    """Bulk-import volunteers from CSV content.

    Expected CSV headers: name, email, phone (optional), city (optional), skills (optional)
    Volunteers are created with a default password and auto-added to the org with 'Active' status.
    """
    csv_text = (body or {}).get("csv", "")
    if not csv_text.strip():
        raise HTTPException(400, "CSV content is required")

    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id FROM organizations WHERE id = ? AND admin_user_id = ?",
            (org_id, current_user["id"]),
        ).fetchone())
        if not org:
            raise HTTPException(403, "Not authorized for this organization")

        reader = csv.DictReader(io.StringIO(csv_text))
        created, skipped, errors = 0, 0, []
        default_pw_hash = hash_password("volunteer123")

        for row in reader:
            name = (row.get("name") or row.get("Name") or "").strip()
            email = (row.get("email") or row.get("Email") or "").strip().lower()
            if not name or not email:
                skipped += 1
                continue
            try:
                existing_user = db.execute(
                    "SELECT id FROM users WHERE email = ?", (email,)
                ).fetchone()
                if existing_user:
                    user_id = existing_user["id"]
                    vol = db.execute(
                        "SELECT id FROM volunteers WHERE user_id = ?", (user_id,)
                    ).fetchone()
                    vol_id = vol["id"] if vol else None
                else:
                    cur = db.execute(
                        "INSERT INTO users (email, password, role) VALUES (?, ?, 'volunteer')",
                        (email, default_pw_hash),
                    )
                    user_id = cur.lastrowid
                    vol_id = None

                if vol_id is None:
                    cur = db.execute(
                        "INSERT INTO volunteers (user_id, name, email, phone, city, skills, status) "
                        "VALUES (?, ?, ?, ?, ?, ?, 'Active')",
                        (
                            user_id, name, email,
                            (row.get("phone") or "").strip(),
                            (row.get("city") or row.get("governorate") or "").strip(),
                            json.dumps([s.strip() for s in (row.get("skills") or "").split(",") if s.strip()]),
                        ),
                    )
                    vol_id = cur.lastrowid

                existing_ov = db.execute(
                    "SELECT id FROM org_volunteers WHERE org_id = ? AND volunteer_id = ?",
                    (org_id, vol_id),
                ).fetchone()
                if not existing_ov:
                    db.execute(
                        "INSERT INTO org_volunteers (org_id, volunteer_id, status, department) "
                        "VALUES (?, ?, 'Active', ?)",
                        (org_id, vol_id, (row.get("department") or "").strip()),
                    )
                    created += 1
                else:
                    skipped += 1
            except Exception as e:
                errors.append(f"{email}: {e}")

        return {
            "created": created,
            "skipped": skipped,
            "errors": errors,
            "message": f"Imported {created} volunteers. Default password: volunteer123",
        }


@router.delete("/{org_id}/members/{vol_id}")
def remove_org_member(
    org_id: int,
    vol_id: int,
    current_user: dict = Depends(require_roles("org_admin")),
):
    with get_db() as db:
        db.execute(
            "DELETE FROM org_volunteers WHERE org_id = ? AND volunteer_id = ?",
            (org_id, vol_id),
        )
        return {"message": "Volunteer removed from organization"}
