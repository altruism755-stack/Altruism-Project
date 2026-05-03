from fastapi import APIRouter, HTTPException, Depends

from database import get_db, dict_row, dict_rows
from auth import hash_password, get_current_user, require_roles

router = APIRouter(prefix="/api/supervisors", tags=["supervisors"])


def _get_supervisor_record(db, user_id: int) -> dict:
    """Resolve a supervisor record and their org_id from auth user id."""
    sup = dict_row(db.execute(
        "SELECT * FROM supervisors WHERE user_id = ?", (user_id,)
    ).fetchone())
    if not sup:
        raise HTTPException(404, "Supervisor profile not found")
    return sup


# ─── Org-admin routes ────────────────────────────────────────────────────────

@router.get("")
def list_supervisors(current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        supervisors = dict_rows(db.execute(
            "SELECT s.*, "
            "(SELECT COUNT(*) FROM org_volunteers ov WHERE ov.supervisor_id = s.id) as assigned_volunteers "
            "FROM supervisors s WHERE s.org_id = ?",
            (org["id"],),
        ).fetchall())

        return {"supervisors": supervisors}


@router.post("", status_code=201)
def create_supervisor(body: dict, current_user: dict = Depends(require_roles("org_admin"))):
    name = body.get("name")
    email = body.get("email")
    phone = body.get("phone", "")
    team = body.get("team", "")

    if not name or not email:
        raise HTTPException(400, "Name and email are required")

    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        existing_user = dict_row(db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone())
        if existing_user:
            user_id = existing_user["id"]
            db.execute("UPDATE users SET role = 'supervisor' WHERE id = ?", (user_id,))
        else:
            hashed = hash_password("supervisor123")
            cur = db.execute(
                "INSERT INTO users (email, password, role) VALUES (?, ?, 'supervisor')",
                (email, hashed),
            )
            user_id = cur.lastrowid

        existing_sup = dict_row(db.execute("SELECT id FROM supervisors WHERE user_id = ?", (user_id,)).fetchone())
        if existing_sup:
            raise HTTPException(409, "Supervisor already exists")

        db.execute(
            "INSERT INTO supervisors (user_id, name, email, phone, team, org_id, status) VALUES (?, ?, ?, ?, ?, ?, 'Active')",
            (user_id, name, email, phone, team, org["id"]),
        )

        sup = dict_row(db.execute("SELECT * FROM supervisors WHERE user_id = ?", (user_id,)).fetchone())
        return sup


@router.delete("/{supervisor_id}")
def delete_supervisor(supervisor_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        db.execute("DELETE FROM supervisors WHERE id = ?", (supervisor_id,))
        return {"message": "Supervisor removed"}


# ─── Supervisor self-service routes ──────────────────────────────────────────

@router.get("/me")
def get_my_profile(current_user: dict = Depends(require_roles("supervisor"))):
    """Supervisor's own profile including their org details."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])
        org = dict_row(db.execute(
            "SELECT id, name, description, category, color, initials FROM organizations WHERE id = ?",
            (sup["org_id"],),
        ).fetchone())
        return {"supervisor": sup, "organization": org}


@router.get("/me/volunteers")
def get_my_volunteers(current_user: dict = Depends(require_roles("supervisor"))):
    """All volunteers in the supervisor's org (not just those directly assigned to them)."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])

        volunteers = dict_rows(db.execute(
            "SELECT v.*, ov.department, ov.status as org_status, ov.joined_date, "
            "ov.supervisor_id, s2.name as supervisor_name, "
            "(SELECT SUM(a.hours) FROM activities a WHERE a.volunteer_id = v.id AND a.status = 'Approved') as total_hours "
            "FROM volunteers v "
            "JOIN org_volunteers ov ON v.id = ov.volunteer_id "
            "LEFT JOIN supervisors s2 ON ov.supervisor_id = s2.id "
            "WHERE ov.org_id = ? AND ov.status = 'Active' "
            "ORDER BY v.name",
            (sup["org_id"],),
        ).fetchall())

        return {"volunteers": volunteers}


@router.get("/me/pending-requests")
def get_pending_requests(current_user: dict = Depends(require_roles("supervisor"))):
    """Pending volunteer join requests for the supervisor's org."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])

        pending = dict_rows(db.execute(
            "SELECT v.*, ov.id as ov_id, ov.joined_date "
            "FROM volunteers v "
            "JOIN org_volunteers ov ON v.id = ov.volunteer_id "
            "WHERE ov.org_id = ? AND ov.status = 'Pending' "
            "ORDER BY ov.joined_date DESC",
            (sup["org_id"],),
        ).fetchall())

        # Also get supervisors for assignment
        supervisors = dict_rows(db.execute(
            "SELECT id, name, team FROM supervisors WHERE org_id = ? AND status = 'Active'",
            (sup["org_id"],),
        ).fetchall())

        return {"pending": pending, "supervisors": supervisors}


@router.put("/me/requests/{vol_id}/approve")
def approve_request(vol_id: int, body: dict, current_user: dict = Depends(require_roles("supervisor"))):
    """Supervisor approves a pending volunteer join request for their org."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])
        vol = dict_row(db.execute(
            "SELECT governorate, city FROM volunteers WHERE id = ?", (vol_id,)
        ).fetchone())
        gov_snap = (vol or {}).get("governorate") or ""
        city_snap = (vol or {}).get("city") or ""
        db.execute(
            "UPDATE org_volunteers SET status = 'Active', supervisor_id = ?, department = ?, "
            "is_active = 1, joined_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), "
            "governorate_snapshot = ?, city_snapshot = ? "
            "WHERE org_id = ? AND volunteer_id = ? AND status = 'Pending'",
            (body.get("supervisor_id") or sup["id"], body.get("department", ""),
             gov_snap, city_snap, sup["org_id"], vol_id),
        )
        return {"message": "Volunteer approved"}


@router.put("/me/requests/{vol_id}/reject")
def reject_request(vol_id: int, current_user: dict = Depends(require_roles("supervisor"))):
    """Supervisor rejects a pending volunteer join request for their org."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])
        db.execute(
            "DELETE FROM org_volunteers WHERE org_id = ? AND volunteer_id = ? AND status = 'Pending'",
            (sup["org_id"], vol_id),
        )
        return {"message": "Request rejected"}


@router.get("/me/events")
def get_my_events(current_user: dict = Depends(require_roles("supervisor"))):
    """Events for the supervisor's org."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])
        events = dict_rows(db.execute(
            "SELECT * FROM events WHERE org_id = ? ORDER BY date DESC",
            (sup["org_id"],),
        ).fetchall())
        return {"events": events}


@router.get("/me/activities")
def get_my_activities(current_user: dict = Depends(require_roles("supervisor"))):
    """Pending activity logs from volunteers in the supervisor's org."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])

        activities = dict_rows(db.execute(
            "SELECT a.*, v.name as volunteer_name, e.name as event_name "
            "FROM activities a "
            "LEFT JOIN volunteers v ON a.volunteer_id = v.id "
            "LEFT JOIN events e ON a.event_id = e.id "
            "WHERE a.org_id = ? AND a.status = 'Pending' "
            "ORDER BY a.date DESC",
            (sup["org_id"],),
        ).fetchall())

        return {"activities": activities}
