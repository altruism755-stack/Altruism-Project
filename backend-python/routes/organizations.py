import csv
import io
import json
import os
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any, Optional

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles, require_approved_org_admin

# Base URL for invite links — set APP_BASE_URL in env for production.
_APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173")

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

DUPLICATE_STRATEGIES = {"skip_duplicates", "update_existing", "invite_anyway"}


class AddOrgAdminBody(BaseModel):
    email: str


class ImportCSVBody(BaseModel):
    csv: str
    duplicate_strategy: str = "skip_duplicates"


def _make_invite_link(token: str) -> str:
    """Phase 1: returns a link for manual distribution.
    Phase 2: call your email service here and keep this as the single integration point."""
    return f"{_APP_BASE_URL}/accept-invite?token={token}"


def _validate_csv_row(row: dict, row_num: int) -> tuple:
    """Returns (cleaned_row, error_dict). Exactly one will be None."""
    name  = (row.get("name")  or row.get("Name")  or "").strip()
    email = (row.get("email") or row.get("Email") or "").strip().lower()
    if not name:
        return None, {"row": row_num, "reason": "Missing name"}
    if not email:
        return None, {"row": row_num, "reason": "Missing email"}
    if not _EMAIL_RE.match(email):
        return None, {"row": row_num, "reason": f"Invalid email format: {email}"}
    return {
        "name":       name,
        "email":      email,
        "phone":      (row.get("phone")      or "").strip(),
        "city":       (row.get("city")       or row.get("governorate") or "").strip(),
        "skills":     [s.strip() for s in (row.get("skills") or "").split(",") if s.strip()],
        "department": (row.get("department") or "").strip(),
        "role":       (row.get("role")       or "volunteer").strip(),
        "source":     (row.get("source")     or "manual_import").strip(),
    }, None


def _parse_csv(csv_text: str) -> tuple:
    """Parse CSV text. Returns (valid_rows, errors, duplicate_emails_in_csv)."""
    reader      = csv.DictReader(io.StringIO(csv_text.strip()))
    valid_rows  = []
    errors      = []
    seen_emails = set()
    csv_dupes   = set()

    for i, row in enumerate(reader, start=2):  # row 1 = header
        cleaned, err = _validate_csv_row(row, i)
        if err:
            errors.append(err)
            continue
        email = cleaned["email"]
        if email in seen_emails:
            csv_dupes.add(email)
            errors.append({"row": i, "reason": f"Duplicate email in CSV: {email}"})
            continue
        seen_emails.add(email)
        valid_rows.append(cleaned)

    return valid_rows, errors, csv_dupes


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
            # Join with users to expose the primary admin's email as submitter_email.
            # admin_user_id IS the submitter — derived from the authoritative users table,
            # so it's correct for all existing orgs without any column migration.
            "SELECT o.*, u.email AS submitter_email "
            "FROM organizations o JOIN users u ON u.id = o.admin_user_id "
            "WHERE o.admin_user_id = ?",
            (current_user["id"],),
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")
        org = _decode_org_json(org)

        # Forward-compat: if a created_by_user_id column is ever added it takes
        # precedence over admin_user_id as the canonical submitter identity.
        # Today the column doesn't exist so org.get() returns None and the
        # submitter_email set by the JOIN above is used unchanged.
        if org.get("created_by_user_id"):
            override = dict_row(db.execute(
                "SELECT email FROM users WHERE id = ?",
                (org["created_by_user_id"],),
            ).fetchone())
            if override:
                org["submitter_email"] = override["email"]

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

def _fetch_org_admins(db, org_id: int) -> list:
    return dict_rows(db.execute(
        "SELECT oa.id, oa.user_id, u.email, oa.created_at "
        "FROM org_admins oa JOIN users u ON oa.user_id = u.id "
        "WHERE oa.org_id = ? ORDER BY oa.created_at ASC",
        (org_id,),
    ).fetchall())


@router.get("/me/admins")
def list_my_org_admins(current_user: dict = Depends(require_approved_org_admin)):
    with get_db() as db:
        org_id = _get_my_org_id(db, current_user["id"])
        rows = _fetch_org_admins(db, org_id)
        # Backward-compat migration: if existing org has no admins, auto-add creator.
        # Guarantees the invariant even for orgs registered before this change.
        if not rows:
            db.execute(
                "INSERT OR IGNORE INTO org_admins (user_id, org_id) VALUES (?, ?)",
                (current_user["id"], org_id),
            )
            rows = _fetch_org_admins(db, org_id)
        return {"admins": rows}


@router.post("/me/admins", status_code=201)
def add_my_org_admin(body: AddOrgAdminBody, current_user: dict = Depends(require_approved_org_admin)):
    with get_db() as db:
        org_id = _get_my_org_id(db, current_user["id"])
        user = dict_row(db.execute("SELECT id, email FROM users WHERE email = ?", (body.email,)).fetchone())
        if not user:
            raise HTTPException(404, f"No user found with email '{body.email}'")
        # Idempotent check FIRST — if already admin (including self), return 200 silently.
        existing = db.execute(
            "SELECT id FROM org_admins WHERE user_id = ? AND org_id = ?", (user["id"], org_id)
        ).fetchone()
        if existing:
            return JSONResponse(status_code=200, content={"message": f"{body.email} is already an organization admin"})
        if user["id"] == current_user["id"]:
            raise HTTPException(400, "You are already the organization owner")
        # INSERT OR IGNORE defends against any concurrent race to the UNIQUE constraint.
        db.execute("INSERT OR IGNORE INTO org_admins (user_id, org_id) VALUES (?, ?)", (user["id"], org_id))
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


def _assert_org_access(db, org_id: int, user_id: int):
    org = dict_row(db.execute(
        "SELECT id, name FROM organizations WHERE id = ? AND admin_user_id = ?",
        (org_id, user_id),
    ).fetchone())
    if not org:
        raise HTTPException(403, "Not authorized for this organization")
    return org


@router.post("/{org_id}/import-csv/preview")
def preview_import_csv(
    org_id: int,
    body: ImportCSVBody,
    current_user: dict = Depends(require_roles("org_admin")),
):
    """Dry-run: parse and validate CSV, return per-row status + summary without writing."""
    if not body.csv.strip():
        raise HTTPException(400, "CSV content is required")
    if body.duplicate_strategy not in DUPLICATE_STRATEGIES:
        raise HTTPException(400, f"duplicate_strategy must be one of: {', '.join(DUPLICATE_STRATEGIES)}")

    with get_db() as db:
        _assert_org_access(db, org_id, current_user["id"])

        reader      = csv.DictReader(io.StringIO(body.csv.strip()))
        result_rows = []
        seen_emails = set()

        for i, raw_row in enumerate(reader, start=2):
            cleaned, err = _validate_csv_row(raw_row, i)

            # Build a display row regardless of validity
            name  = (raw_row.get("name")  or raw_row.get("Name")  or "").strip()
            email = (raw_row.get("email") or raw_row.get("Email") or "").strip().lower()
            phone = (raw_row.get("phone") or "").strip()
            city  = (raw_row.get("city")  or raw_row.get("governorate") or "").strip()
            skills_raw = (raw_row.get("skills") or "").strip()

            if err:
                result_rows.append({
                    "name": name, "email": email, "phone": phone, "city": city,
                    "skills": skills_raw, "status": "error", "reason": err["reason"],
                })
                continue

            if cleaned["email"] in seen_emails:
                result_rows.append({
                    "name": name, "email": email, "phone": phone, "city": city,
                    "skills": skills_raw, "status": "error",
                    "reason": f"Duplicate email in CSV: {email}",
                })
                continue

            seen_emails.add(cleaned["email"])

            # DB lookup to determine status
            user_row = dict_row(db.execute(
                "SELECT id FROM users WHERE email = ?", (cleaned["email"],)
            ).fetchone())

            if not user_row:
                row_status = "new"
            else:
                vol_row = dict_row(db.execute(
                    "SELECT id FROM volunteers WHERE user_id = ?", (user_row["id"],)
                ).fetchone())
                vol_id = vol_row["id"] if vol_row else None
                if vol_id:
                    in_org = db.execute(
                        "SELECT id FROM org_volunteers WHERE org_id = ? AND volunteer_id = ?",
                        (org_id, vol_id),
                    ).fetchone()
                    row_status = "existing"  # covers both already-in and will-link
                else:
                    row_status = "existing"

            result_rows.append({
                "name": cleaned["name"], "email": cleaned["email"],
                "phone": cleaned["phone"], "city": cleaned["city"],
                "skills": ", ".join(cleaned["skills"]),
                "status": row_status,
            })

    summary = {
        "new":      sum(1 for r in result_rows if r["status"] == "new"),
        "existing": sum(1 for r in result_rows if r["status"] == "existing"),
        "errors":   sum(1 for r in result_rows if r["status"] == "error"),
    }
    return {"summary": summary, "rows": result_rows}


@router.post("/{org_id}/import-csv")
def import_volunteers_csv(
    org_id: int,
    body: ImportCSVBody,
    current_user: dict = Depends(require_roles("org_admin")),
):
    """Bulk-import volunteers from CSV.

    Extended headers: name, email, phone, city, skills, department, role, source
    New users are created without a password and receive a secure invite link.
    Existing users are linked to the organization directly.
    """
    if not body.csv.strip():
        raise HTTPException(400, "CSV content is required")
    if body.duplicate_strategy not in DUPLICATE_STRATEGIES:
        raise HTTPException(400, f"duplicate_strategy must be one of: {', '.join(DUPLICATE_STRATEGIES)}")

    valid_rows, parse_errors, _csv_dupes = _parse_csv(body.csv)

    invited_count  = 0
    linked_count   = 0
    skipped_count  = 0
    runtime_errors = []
    invite_links   = []

    with get_db() as db:
        org = _assert_org_access(db, org_id, current_user["id"])
        org_name = org["name"]

        for r in valid_rows:
            email = r["email"]
            try:
                existing_user = dict_row(db.execute(
                    "SELECT id, role, invite_token FROM users WHERE email = ?", (email,)
                ).fetchone())

                if existing_user:
                    user_id = existing_user["id"]
                    vol_row = dict_row(db.execute(
                        "SELECT id FROM volunteers WHERE user_id = ?", (user_id,)
                    ).fetchone())
                    vol_id = vol_row["id"] if vol_row else None

                    if vol_id is None:
                        cur = db.execute(
                            "INSERT INTO volunteers (user_id, name, email, phone, city, skills, status) "
                            "VALUES (?, ?, ?, ?, ?, ?, 'Active')",
                            (user_id, r["name"], email, r["phone"] or None, r["city"] or None,
                             json.dumps(r["skills"])),
                        )
                        vol_id = cur.lastrowid

                    in_org = db.execute(
                        "SELECT id FROM org_volunteers WHERE org_id = ? AND volunteer_id = ?",
                        (org_id, vol_id),
                    ).fetchone()

                    if in_org:
                        if body.duplicate_strategy == "skip_duplicates":
                            skipped_count += 1
                            continue
                        elif body.duplicate_strategy == "update_existing":
                            db.execute(
                                "UPDATE org_volunteers SET department = ?, source = ? "
                                "WHERE org_id = ? AND volunteer_id = ?",
                                (r["department"] or None, r["source"], org_id, vol_id),
                            )
                            skipped_count += 1
                            continue
                        # invite_anyway: fall through to re-invite logic below only if pending invite
                        if existing_user.get("invite_token"):
                            token = secrets.token_urlsafe(32)
                            expires = (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat()
                            db.execute(
                                "UPDATE users SET invite_token = ?, invite_expires_at = ? WHERE id = ?",
                                (token, expires, user_id),
                            )
                            invite_links.append({"email": email, "link": _make_invite_link(token)})
                        skipped_count += 1
                        continue

                    # Existing user, not yet in this org — link them directly
                    db.execute(
                        "INSERT INTO org_volunteers (org_id, volunteer_id, status, department, source) "
                        "VALUES (?, ?, 'Active', ?, 'existing_user')",
                        (org_id, vol_id, r["department"] or None),
                    )
                    linked_count += 1

                else:
                    # Brand-new user — create without password, issue invite token
                    token   = secrets.token_urlsafe(32)
                    expires = (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat()
                    cur = db.execute(
                        "INSERT INTO users (email, password, role, invite_token, invite_expires_at) "
                        "VALUES (?, '', 'volunteer', ?, ?)",
                        (email, token, expires),
                    )
                    user_id = cur.lastrowid
                    cur = db.execute(
                        "INSERT INTO volunteers (user_id, name, email, phone, city, skills, status) "
                        "VALUES (?, ?, ?, ?, ?, ?, 'Pending')",
                        (user_id, r["name"], email, r["phone"] or None, r["city"] or None,
                         json.dumps(r["skills"])),
                    )
                    vol_id = cur.lastrowid
                    db.execute(
                        "INSERT INTO org_volunteers (org_id, volunteer_id, status, department, source) "
                        "VALUES (?, ?, 'Pending', ?, 'invite')",
                        (org_id, vol_id, r["department"] or None),
                    )
                    invite_links.append({"email": email, "link": _make_invite_link(token)})
                    invited_count += 1

            except Exception as e:
                runtime_errors.append({"row": email, "reason": str(e)})

    all_errors = parse_errors + runtime_errors
    success_count = invited_count + linked_count

    return {
        "totalRows":    len(valid_rows) + len(parse_errors),
        "successCount": success_count,
        "invitedCount": invited_count,
        "linkedCount":  linked_count,
        "skippedCount": skipped_count,
        "errorCount":   len(all_errors),
        "errors":       all_errors,
        "inviteLinks":  invite_links,
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
