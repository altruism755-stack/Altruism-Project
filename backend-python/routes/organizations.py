import csv
import io
import json
from fastapi import APIRouter, HTTPException, Depends

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles, hash_password

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.get("")
def list_organizations():
    with get_db() as db:
        # Public listing: only show approved orgs (or legacy orgs with NULL status)
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

                # Attach to org if not already
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
