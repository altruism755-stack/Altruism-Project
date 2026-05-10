import json
import os
import base64
import uuid
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles, hash_password, verify_password, get_org_for_admin
from routes.lifecycle import compute_volunteer_lifecycle

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "profiles")
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/volunteers", tags=["volunteers"])

FORBIDDEN = "You do not have permission to access this resource"


def _resolve_supervisor(db, user_id: int) -> dict:
    sup = dict_row(db.execute("SELECT * FROM supervisors WHERE user_id = %s", (user_id,)).fetchone())
    if not sup:
        raise HTTPException(403, FORBIDDEN)
    return sup


def _resolve_org_admin(db, user_id: int) -> dict:
    return get_org_for_admin(db, user_id)


def _assert_supervisor_volunteer(db, supervisor_id: int, volunteer_id: int) -> None:
    """Verify volunteer is an active org member of the supervisor's org."""
    sup = dict_row(db.execute("SELECT org_id FROM supervisors WHERE id = %s", (supervisor_id,)).fetchone())
    if not sup:
        raise HTTPException(403, FORBIDDEN)
    row = db.execute(
        "SELECT id FROM org_volunteers WHERE volunteer_id = %s AND org_id = %s AND status = 'Active'",
        (volunteer_id, sup["org_id"]),
    ).fetchone()
    if not row:
        raise HTTPException(403, FORBIDDEN)


def _assert_org_volunteer(db, org_id: int, volunteer_id: int) -> None:
    row = db.execute(
        "SELECT id FROM org_volunteers WHERE volunteer_id = %s AND org_id = %s",
        (volunteer_id, org_id),
    ).fetchone()
    if not row:
        raise HTTPException(403, FORBIDDEN)


@router.get("")
def list_volunteers(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_roles("org_admin")),
):
    with get_db() as db:
        _joins = (
            "FROM volunteers v "
            "LEFT JOIN org_volunteers ov ON v.id = ov.volunteer_id"
        )
        filters: list[str] = []
        params: list = []

        org = _resolve_org_admin(db, current_user["id"])
        filters.append("ov.org_id = %s")
        params.append(org["id"])

        if status:
            filters.append("v.status = %s")
            params.append(status)
        if search:
            filters.append("(v.name ILIKE %s OR v.email ILIKE %s)")
            params.extend([f"%{search}%", f"%{search}%"])

        where = " WHERE " + " AND ".join(filters) if filters else ""

        total = db.execute(f"SELECT COUNT(*) as total {_joins}{where}", params).fetchone()["total"]

        offset = (page - 1) * limit
        query = f"SELECT v.*, ov.department {_joins}{where} LIMIT %s OFFSET %s"
        volunteers = dict_rows(db.execute(query, params + [limit, offset]).fetchall())

        return {
            "volunteers": volunteers,
            "total": total,
            "page": page,
            "totalPages": -(-total // limit),
        }


@router.get("/me")
def get_my_volunteer_profile(current_user: dict = Depends(require_roles("volunteer"))):
    """Return the current volunteer's own full profile, scoped by their user_id."""
    with get_db() as db:
        vol = dict_row(db.execute(
            "SELECT * FROM volunteers WHERE user_id = %s", (current_user["id"],)
        ).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer profile not found")
        return _build_volunteer_response(db, vol)


def _build_volunteer_response(db, vol: dict) -> dict:
    activities = dict_rows(db.execute(
        "SELECT a.*, e.name as event_name, o.name as org_name FROM activities a "
        "LEFT JOIN events e ON a.event_id = e.id "
        "LEFT JOIN organizations o ON a.org_id = o.id "
        "WHERE a.volunteer_id = %s ORDER BY a.date DESC LIMIT 50",
        (vol["id"],),
    ).fetchall())

    orgs = dict_rows(db.execute(
        "SELECT o.*, ov.status as membership_status, ov.department, ov.joined_date "
        "FROM organizations o "
        "JOIN org_volunteers ov ON o.id = ov.org_id WHERE ov.volunteer_id = %s "
        "ORDER BY ov.status DESC, ov.joined_date DESC",
        (vol["id"],),
    ).fetchall())

    certificates = dict_rows(db.execute(
        "SELECT c.*, o.name as org_name, e.name as event_name "
        "FROM certificates c "
        "JOIN organizations o ON c.org_id = o.id "
        "LEFT JOIN events e ON c.event_id = e.id "
        "WHERE c.volunteer_id = %s",
        (vol["id"],),
    ).fetchall())

    total_hours = sum(a["hours"] or 0 for a in activities if a["status"] == "Approved")
    return {**vol, "activities": activities, "organizations": orgs, "certificates": certificates, "totalHours": total_hours}


@router.get("/{volunteer_id}")
def get_volunteer(volunteer_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        vol = dict_row(db.execute("SELECT * FROM volunteers WHERE id = %s", (volunteer_id,)).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")
        role = current_user["role"]
        if role == "volunteer":
            if vol.get("user_id") != current_user["id"]:
                raise HTTPException(403, FORBIDDEN)
        elif role == "supervisor":
            sup = _resolve_supervisor(db, current_user["id"])
            _assert_supervisor_volunteer(db, sup["id"], volunteer_id)
        elif role == "org_admin":
            org = _resolve_org_admin(db, current_user["id"])
            _assert_org_volunteer(db, org["id"], volunteer_id)
        return _build_volunteer_response(db, vol)


@router.put("/{volunteer_id}")
def update_volunteer(volunteer_id: int, body: dict, current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        role = current_user["role"]
        if role == "volunteer":
            vol_check = dict_row(db.execute("SELECT user_id FROM volunteers WHERE id = %s", (volunteer_id,)).fetchone())
            if not vol_check or vol_check["user_id"] != current_user["id"]:
                raise HTTPException(403, FORBIDDEN)
        elif role == "supervisor":
            sup = _resolve_supervisor(db, current_user["id"])
            _assert_supervisor_volunteer(db, sup["id"], volunteer_id)
        elif role == "org_admin":
            org = _resolve_org_admin(db, current_user["id"])
            _assert_org_volunteer(db, org["id"], volunteer_id)

        name = body.get("name")
        phone = body.get("phone")
        city = body.get("city")
        skills = body.get("skills")
        date_of_birth = body.get("date_of_birth")
        governorate = body.get("governorate")
        gender = body.get("gender")
        health_notes = body.get("health_notes")
        availability = body.get("availability")
        hours_per_week = body.get("hours_per_week")
        languages = body.get("languages")
        education_level = body.get("education_level")
        prior_experience = body.get("prior_experience")
        prior_org = body.get("prior_org")
        experiences = body.get("experiences")
        cause_areas = body.get("cause_areas")
        if cause_areas is not None:
            n = len(cause_areas)
            if n != 0 and n != 5:
                raise HTTPException(422, "Please select exactly 5 interests, or leave it empty.")
        university_name = body.get("university_name")
        faculty = body.get("faculty")
        study_year = body.get("study_year")
        field_of_study = body.get("field_of_study")
        department = body.get("department")
        nationality = body.get("nationality")
        national_id = body.get("national_id")

        db.execute(
            "UPDATE volunteers SET "
            "nationality = COALESCE(%s, nationality), "
            "national_id = COALESCE(%s, national_id), "
            "name = COALESCE(%s, name), phone = COALESCE(%s, phone), "
            "city = COALESCE(%s, city), skills = COALESCE(%s, skills), "
            "date_of_birth = COALESCE(%s, date_of_birth), "
            "governorate = COALESCE(%s, governorate), "
            "gender = COALESCE(%s, gender), "
            "health_notes = COALESCE(%s, health_notes), "
            "availability = COALESCE(%s, availability), "
            "hours_per_week = COALESCE(%s, hours_per_week), "
            "languages = COALESCE(%s, languages), "
            "education_level = COALESCE(%s, education_level), "
            "prior_experience = COALESCE(%s, prior_experience), "
            "prior_org = COALESCE(%s, prior_org), "
            "experiences = COALESCE(%s, experiences), "
            "cause_areas = COALESCE(%s, cause_areas), "
            "university_name = COALESCE(%s, university_name), "
            "faculty = COALESCE(%s, faculty), "
            "study_year = COALESCE(%s, study_year), "
            "field_of_study = COALESCE(%s, field_of_study), "
            "department = COALESCE(%s, department) "
            "WHERE id = %s",
            (nationality, national_id,
             name, phone, city, json.dumps(skills) if skills is not None else None,
             date_of_birth, governorate,
             gender, health_notes,
             json.dumps(availability) if availability is not None else None,
             hours_per_week,
             json.dumps(languages) if languages is not None else None,
             education_level,
             (1 if prior_experience else 0) if prior_experience is not None else None,
             prior_org,
             json.dumps(experiences) if experiences is not None else None,
             json.dumps(cause_areas) if cause_areas is not None else None,
             university_name, faculty, study_year, field_of_study,
             department,
             volunteer_id),
        )

        # Handle email update
        new_email = body.get("email")
        if new_email:
            vol = dict_row(db.execute("SELECT user_id FROM volunteers WHERE id = %s", (volunteer_id,)).fetchone())
            if vol:
                conflict = db.execute(
                    "SELECT id FROM users WHERE email = %s AND id != %s",
                    (new_email, vol["user_id"]),
                ).fetchone()
                if conflict:
                    raise HTTPException(409, "Email already in use by another account")
                db.execute("UPDATE users SET email = %s WHERE id = %s", (new_email, vol["user_id"]))
                db.execute("UPDATE volunteers SET email = %s WHERE id = %s", (new_email, volunteer_id))

        # Handle password change
        new_password = body.get("new_password")
        current_password = body.get("current_password")
        if new_password and current_password:
            if len(new_password) < 8:
                raise HTTPException(400, "Password must be at least 8 characters")
            vol = dict_row(db.execute("SELECT user_id FROM volunteers WHERE id = %s", (volunteer_id,)).fetchone())
            if vol:
                user = dict_row(db.execute("SELECT * FROM users WHERE id = %s", (vol["user_id"],)).fetchone())
                if not user or not verify_password(current_password, user["password"]):
                    raise HTTPException(400, "Current password is incorrect")
                hashed = hash_password(new_password)
                db.execute("UPDATE users SET password = %s WHERE id = %s", (hashed, vol["user_id"]))

        updated = dict_row(db.execute("SELECT * FROM volunteers WHERE id = %s", (volunteer_id,)).fetchone())
        return updated


@router.put("/{volunteer_id}/profile-picture")
def upload_profile_picture(volunteer_id: int, body: dict, current_user: dict = Depends(get_current_user)):
    with get_db() as _db:
        role = current_user["role"]
        if role == "volunteer":
            vol_check = dict_row(_db.execute("SELECT user_id FROM volunteers WHERE id = %s", (volunteer_id,)).fetchone())
            if not vol_check or vol_check["user_id"] != current_user["id"]:
                raise HTTPException(403, FORBIDDEN)
        elif role == "supervisor":
            sup = _resolve_supervisor(_db, current_user["id"])
            _assert_supervisor_volunteer(_db, sup["id"], volunteer_id)
        elif role == "org_admin":
            org = _resolve_org_admin(_db, current_user["id"])
            _assert_org_volunteer(_db, org["id"], volunteer_id)

    image_data = body.get("image")
    if not image_data:
        raise HTTPException(400, "Image data is required")

    # Expect base64 data URI: data:image/png;base64,....
    if "," in image_data:
        header, data = image_data.split(",", 1)
    else:
        data = image_data
        header = ""

    ext = "png"
    if "jpeg" in header or "jpg" in header:
        ext = "jpg"
    elif "webp" in header:
        ext = "webp"

    # Validate type
    if ext not in ("png", "jpg", "webp"):
        raise HTTPException(415, "Only JPG and PNG images are allowed")

    # Validate size: 2MB binary limit
    try:
        decoded = base64.b64decode(data)
    except Exception:
        raise HTTPException(400, "Invalid image data")

    if len(decoded) > 2 * 1024 * 1024:
        raise HTTPException(413, "Image exceeds 2MB limit")

    filename = f"{volunteer_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(decoded)

    with get_db() as db:
        # Delete old picture file if exists
        old = db.execute("SELECT profile_picture FROM volunteers WHERE id = %s", (volunteer_id,)).fetchone()
        if old and old["profile_picture"]:
            old_path = os.path.join(UPLOAD_DIR, old["profile_picture"])
            if os.path.exists(old_path):
                os.remove(old_path)
        db.execute("UPDATE volunteers SET profile_picture = %s WHERE id = %s", (filename, volunteer_id))
        return {"profile_picture": filename}


@router.delete("/{volunteer_id}/profile-picture")
def remove_profile_picture(volunteer_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        role = current_user["role"]
        if role == "volunteer":
            vol_check = dict_row(db.execute("SELECT user_id FROM volunteers WHERE id = %s", (volunteer_id,)).fetchone())
            if not vol_check or vol_check["user_id"] != current_user["id"]:
                raise HTTPException(403, FORBIDDEN)
        elif role == "supervisor":
            sup = _resolve_supervisor(db, current_user["id"])
            _assert_supervisor_volunteer(db, sup["id"], volunteer_id)
        elif role == "org_admin":
            org = _resolve_org_admin(db, current_user["id"])
            _assert_org_volunteer(db, org["id"], volunteer_id)
        vol = dict_row(db.execute("SELECT profile_picture FROM volunteers WHERE id = %s", (volunteer_id,)).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")
        if vol["profile_picture"]:
            filepath = os.path.join(UPLOAD_DIR, vol["profile_picture"])
            if os.path.exists(filepath):
                os.remove(filepath)
        db.execute("UPDATE volunteers SET profile_picture = NULL WHERE id = %s", (volunteer_id,))
        return {"message": "Profile picture removed"}


@router.get("/{volunteer_id}/org/{org_id}")
def get_volunteer_org_dashboard(volunteer_id: int, org_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        org = dict_row(db.execute("SELECT * FROM organizations WHERE id = %s", (org_id,)).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        role = current_user["role"]
        if role == "volunteer":
            vol_check = dict_row(db.execute("SELECT user_id FROM volunteers WHERE id = %s", (volunteer_id,)).fetchone())
            if not vol_check or vol_check["user_id"] != current_user["id"]:
                raise HTTPException(403, FORBIDDEN)
        elif role == "supervisor":
            sup = _resolve_supervisor(db, current_user["id"])
            if sup["org_id"] != org_id:
                raise HTTPException(403, FORBIDDEN)
            _assert_supervisor_volunteer(db, sup["id"], volunteer_id)
        elif role == "org_admin":
            admin_org = _resolve_org_admin(db, current_user["id"])
            if admin_org["id"] != org_id:
                raise HTTPException(403, FORBIDDEN)
            _assert_org_volunteer(db, admin_org["id"], volunteer_id)

        activities = dict_rows(db.execute(
            "SELECT a.*, e.name as event_name, e.date as event_date "
            "FROM activities a "
            "LEFT JOIN events e ON a.event_id = e.id "
            "WHERE a.volunteer_id = %s AND a.org_id = %s ORDER BY a.date DESC",
            (volunteer_id, org_id),
        ).fetchall())

        certificates = dict_rows(db.execute(
            "SELECT c.*, e.name as event_name "
            "FROM certificates c "
            "LEFT JOIN events e ON c.event_id = e.id "
            "WHERE c.volunteer_id = %s AND c.org_id = %s",
            (volunteer_id, org_id),
        ).fetchall())

        membership = dict_row(db.execute(
            "SELECT status, joined_date, approved_at FROM org_volunteers WHERE org_id = %s AND volunteer_id = %s",
            (org_id, volunteer_id),
        ).fetchone())
        member_status = (membership or {}).get("status", "Pending")

        # Single source of truth: member_status gates all activity/certificate data.
        if member_status == "Active":
            pending_activities  = [a for a in activities if a["status"] == "Pending"]
            approved_activities = [a for a in activities if a["status"] == "Approved"]
            total_hours         = sum(a["hours"] for a in approved_activities)
            visible_activities  = activities
            visible_certs       = certificates
        else:
            pending_activities  = []
            approved_activities = []
            total_hours         = 0
            visible_activities  = []
            visible_certs       = []

        pending_applications = dict_rows(db.execute(
            "SELECT ea.*, e.name as event_name, e.date as event_date "
            "FROM event_applications ea "
            "JOIN events e ON ea.event_id = e.id "
            "WHERE ea.volunteer_id = %s AND ea.org_id = %s AND ea.status IN ('Pending', 'Waitlisted')",
            (volunteer_id, org_id),
        ).fetchall())

        lifecycle = compute_volunteer_lifecycle(member_status, visible_activities, visible_certs)

        return {
            "organization":          org,
            "activities":            visible_activities,
            "certificates":          visible_certs,
            "total_hours":           total_hours,
            "completed_activities":  len(approved_activities),
            "pending_activities":    pending_activities,
            "pending_applications":  pending_applications,
            "member_status":         member_status,
            "applied_at":            (membership or {}).get("joined_date"),
            "approved_at":           (membership or {}).get("approved_at"),
            "lifecycle":             lifecycle,
        }


@router.put("/{volunteer_id}/status")
def update_volunteer_status(
    volunteer_id: int,
    body: dict,
    current_user: dict = Depends(require_roles("org_admin")),
):
    status_val = body.get("status")
    if status_val not in ("Active", "Pending", "Suspended"):
        raise HTTPException(400, "Invalid status")

    with get_db() as db:
        db.execute("UPDATE volunteers SET status = %s WHERE id = %s", (status_val, volunteer_id))
        return {"message": "Status updated"}
