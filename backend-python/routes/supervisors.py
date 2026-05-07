import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends, Query

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/supervisors", tags=["supervisors"])


def _resolve_org_for_admin(db, user_id: int) -> dict:
    """Return the org for an org_admin, checking both admin_user_id and org_admins table."""
    org = dict_row(db.execute(
        """
        SELECT id FROM organizations WHERE admin_user_id = %s
        UNION
        SELECT o.id FROM organizations o
        JOIN org_admins oa ON oa.org_id = o.id
        WHERE oa.user_id = %s AND o.status = 'approved'
        LIMIT 1
        """,
        (user_id, user_id),
    ).fetchone())
    if not org:
        raise HTTPException(404, "Organization not found")
    return org


def _get_supervisor_record(db, user_id: int) -> dict:
    """Resolve a supervisor record and their org_id from auth user id."""
    sup = dict_row(db.execute(
        "SELECT * FROM supervisors WHERE user_id = %s", (user_id,)
    ).fetchone())
    if not sup:
        raise HTTPException(404, "Supervisor profile not found")
    return sup


# ─── Org-admin routes ────────────────────────────────────────────────────────

@router.get("")
def list_supervisors(current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = _resolve_org_for_admin(db, current_user["id"])

        supervisors = dict_rows(db.execute(
            """
            SELECT s.*,
                   COUNT(ov.id) AS assigned_volunteers
            FROM supervisors s
            LEFT JOIN org_volunteers ov ON ov.supervisor_id = s.id
            WHERE s.org_id = %s
            GROUP BY s.id
            """,
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
        org = _resolve_org_for_admin(db, current_user["id"])

        existing_user = dict_row(db.execute("SELECT id, role FROM users WHERE email = %s", (email,)).fetchone())
        if existing_user:
            # Refuse to silently hijack an account that belongs to another role.
            if existing_user["role"] != "supervisor":
                raise HTTPException(
                    409,
                    f"A user with this email already exists as a '{existing_user['role']}'. "
                    "Cannot reassign to supervisor.",
                )
            user_id = existing_user["id"]
            invite_token = None
        else:
            # Issue an invite token — never store a default password.
            invite_token = secrets.token_urlsafe(32)
            invite_expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            row = db.execute(
                "INSERT INTO users (email, password, role, invite_token, invite_expires_at) "
                "VALUES (%s, '', 'supervisor', %s, %s) RETURNING id",
                (email, invite_token, invite_expires_at),
            ).fetchone()
            user_id = row["id"]

        existing_sup = dict_row(db.execute("SELECT id FROM supervisors WHERE user_id = %s", (user_id,)).fetchone())
        if existing_sup:
            raise HTTPException(409, "Supervisor already exists for this user")

        db.execute(
            "INSERT INTO supervisors (user_id, name, email, phone, team, org_id, status) "
            "VALUES (%s, %s, %s, %s, %s, %s, 'Active')",
            (user_id, name, email, phone, team, org["id"]),
        )

        sup = dict_row(db.execute("SELECT * FROM supervisors WHERE user_id = %s", (user_id,)).fetchone())
        response = dict(sup)
        if invite_token:
            response["invite_token"] = invite_token
        return response


@router.delete("/{supervisor_id}")
def delete_supervisor(supervisor_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = _resolve_org_for_admin(db, current_user["id"])
        result = db.execute(
            "DELETE FROM supervisors WHERE id = %s AND org_id = %s RETURNING id",
            (supervisor_id, org["id"]),
        ).fetchone()
        if not result:
            raise HTTPException(404, "Supervisor not found in your organization")
        return {"message": "Supervisor removed"}


# ─── Supervisor self-service routes ──────────────────────────────────────────

@router.get("/me")
def get_my_profile(current_user: dict = Depends(require_roles("supervisor"))):
    """Supervisor's own profile including their org details."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])
        org = dict_row(db.execute(
            "SELECT id, name, description, category, color, initials, tracks_hours FROM organizations WHERE id = %s",
            (sup["org_id"],),
        ).fetchone())
        return {"supervisor": sup, "organization": org}


@router.get("/me/volunteers")
def get_my_volunteers(current_user: dict = Depends(require_roles("supervisor"))):
    """Volunteers directly assigned to this supervisor."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])

        volunteers = dict_rows(db.execute(
            "SELECT v.*, ov.department, ov.status as org_status, ov.joined_date, "
            "ov.supervisor_id, s2.name as supervisor_name, "
            "(SELECT SUM(a.hours) FROM activities a WHERE a.volunteer_id = v.id AND a.status = 'Approved') as total_hours "
            "FROM volunteers v "
            "JOIN org_volunteers ov ON v.id = ov.volunteer_id "
            "LEFT JOIN supervisors s2 ON ov.supervisor_id = s2.id "
            "WHERE ov.org_id = %s AND ov.supervisor_id = %s AND ov.status = 'Active' "
            "ORDER BY v.name",
            (sup["org_id"], sup["id"]),
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
            "WHERE ov.org_id = %s AND ov.status = 'Pending' "
            "ORDER BY ov.joined_date DESC",
            (sup["org_id"],),
        ).fetchall())

        # Also get supervisors for assignment
        supervisors = dict_rows(db.execute(
            "SELECT id, name, team FROM supervisors WHERE org_id = %s AND status = 'Active'",
            (sup["org_id"],),
        ).fetchall())

        return {"pending": pending, "supervisors": supervisors}


@router.put("/me/requests/{vol_id}/approve")
def approve_request(vol_id: int, body: dict, current_user: dict = Depends(require_roles("supervisor"))):
    """Supervisor approves a pending volunteer join request for their org."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])

        # Prevent double assignment
        existing = dict_row(db.execute(
            "SELECT supervisor_id FROM org_volunteers WHERE org_id = %s AND volunteer_id = %s AND status = 'Pending'",
            (sup["org_id"], vol_id),
        ).fetchone())
        if not existing:
            raise HTTPException(404, "Pending request not found")
        if existing.get("supervisor_id") is not None:
            raise HTTPException(409, "This volunteer has already been assigned to a supervisor")

        vol = dict_row(db.execute(
            "SELECT governorate, city FROM volunteers WHERE id = %s", (vol_id,)
        ).fetchone())
        gov_snap = (vol or {}).get("governorate") or ""
        city_snap = (vol or {}).get("city") or ""
        db.execute(
            "UPDATE org_volunteers SET status = 'Active', supervisor_id = %s, department = %s, "
            "is_active = 1, joined_at = NOW(), "
            "governorate_snapshot = %s, city_snapshot = %s "
            "WHERE org_id = %s AND volunteer_id = %s AND status = 'Pending'",
            (sup["id"], body.get("department", ""),
             gov_snap, city_snap, sup["org_id"], vol_id),
        )
        return {"message": "Volunteer assigned to you"}


@router.put("/me/requests/{vol_id}/reject")
def reject_request(vol_id: int, current_user: dict = Depends(require_roles("supervisor"))):
    """Supervisor rejects a pending volunteer join request for their org."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])
        db.execute(
            "UPDATE org_volunteers SET status = 'Rejected' "
            "WHERE org_id = %s AND volunteer_id = %s AND status = 'Pending'",
            (sup["org_id"], vol_id),
        )
        return {"message": "Request rejected"}


@router.get("/me/events")
def get_my_events(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(require_roles("supervisor")),
):
    """Events for the supervisor's org."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])
        events = dict_rows(db.execute(
            "SELECT * FROM events WHERE org_id = %s ORDER BY date DESC LIMIT %s OFFSET %s",
            (sup["org_id"], limit, offset),
        ).fetchall())
        return {"events": events, "limit": limit, "offset": offset}


@router.get("/me/activities")
def get_my_activities(current_user: dict = Depends(require_roles("supervisor"))):
    """Pending activity logs for volunteers assigned to this supervisor."""
    with get_db() as db:
        sup = _get_supervisor_record(db, current_user["id"])

        activities = dict_rows(db.execute(
            "SELECT a.*, v.name as volunteer_name, e.name as event_name "
            "FROM activities a "
            "LEFT JOIN volunteers v ON a.volunteer_id = v.id "
            "LEFT JOIN events e ON a.event_id = e.id "
            "JOIN org_volunteers ov ON a.volunteer_id = ov.volunteer_id AND ov.supervisor_id = %s "
            "WHERE a.org_id = %s AND a.status = 'Pending' "
            "ORDER BY a.date DESC",
            (sup["id"], sup["org_id"]),
        ).fetchall())

        return {"activities": activities}
