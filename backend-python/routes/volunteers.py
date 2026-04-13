import json
import os
import re
import base64
import uuid
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles, hash_password, verify_password

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "profiles")
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/volunteers", tags=["volunteers"])


@router.get("")
def list_volunteers(
    status: Optional[str] = None,
    supervisor: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_roles("org_admin", "supervisor")),
):
    with get_db() as db:
        query = (
            "SELECT v.*, ov.department, ov.supervisor_id, s.name as supervisor_name "
            "FROM volunteers v "
            "LEFT JOIN org_volunteers ov ON v.id = ov.volunteer_id "
            "LEFT JOIN supervisors s ON ov.supervisor_id = s.id "
            "WHERE 1=1"
        )
        params: list = []

        if status:
            query += " AND v.status = ?"
            params.append(status)
        if supervisor:
            query += " AND s.name = ?"
            params.append(supervisor)
        if search:
            query += " AND (v.name LIKE ? OR v.email LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])

        # Count query
        count_query = re.sub(r"SELECT .+? FROM", "SELECT COUNT(*) as total FROM", query, count=1)
        total = db.execute(count_query, params).fetchone()["total"]

        offset = (page - 1) * limit
        query += " LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        volunteers = dict_rows(db.execute(query, params).fetchall())

        return {
            "volunteers": volunteers,
            "total": total,
            "page": page,
            "totalPages": -(-total // limit),  # ceil division
        }


@router.get("/{volunteer_id}")
def get_volunteer(volunteer_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        vol = dict_row(db.execute("SELECT * FROM volunteers WHERE id = ?", (volunteer_id,)).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")

        activities = dict_rows(db.execute(
            "SELECT a.*, e.name as event_name FROM activities a "
            "LEFT JOIN events e ON a.event_id = e.id "
            "WHERE a.volunteer_id = ? ORDER BY a.date DESC",
            (vol["id"],),
        ).fetchall())

        orgs = dict_rows(db.execute(
            "SELECT o.* FROM organizations o "
            "JOIN org_volunteers ov ON o.id = ov.org_id WHERE ov.volunteer_id = ?",
            (vol["id"],),
        ).fetchall())

        certificates = dict_rows(db.execute(
            "SELECT c.*, o.name as org_name, e.name as event_name "
            "FROM certificates c "
            "JOIN organizations o ON c.org_id = o.id "
            "LEFT JOIN events e ON c.event_id = e.id "
            "WHERE c.volunteer_id = ?",
            (vol["id"],),
        ).fetchall())

        total_hours = sum(a["hours"] for a in activities if a["status"] == "Approved")

        return {**vol, "activities": activities, "organizations": orgs, "certificates": certificates, "totalHours": total_hours}


@router.put("/{volunteer_id}")
def update_volunteer(volunteer_id: int, body: dict, current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        name = body.get("name")
        phone = body.get("phone")
        city = body.get("city")
        skills = body.get("skills")
        about_me = body.get("about_me")
        date_of_birth = body.get("date_of_birth")
        governorate = body.get("governorate")

        db.execute(
            "UPDATE volunteers SET "
            "name = COALESCE(?, name), phone = COALESCE(?, phone), "
            "city = COALESCE(?, city), skills = COALESCE(?, skills), "
            "about_me = COALESCE(?, about_me), "
            "date_of_birth = COALESCE(?, date_of_birth), "
            "governorate = COALESCE(?, governorate) WHERE id = ?",
            (name, phone, city, json.dumps(skills) if skills is not None else None,
             about_me, date_of_birth, governorate, volunteer_id),
        )

        # Handle email update
        new_email = body.get("email")
        if new_email:
            vol = dict_row(db.execute("SELECT user_id FROM volunteers WHERE id = ?", (volunteer_id,)).fetchone())
            if vol:
                db.execute("UPDATE users SET email = ? WHERE id = ?", (new_email, vol["user_id"]))
                db.execute("UPDATE volunteers SET email = ? WHERE id = ?", (new_email, volunteer_id))

        # Handle password change
        new_password = body.get("new_password")
        current_password = body.get("current_password")
        if new_password and current_password:
            vol = dict_row(db.execute("SELECT user_id FROM volunteers WHERE id = ?", (volunteer_id,)).fetchone())
            if vol:
                user = dict_row(db.execute("SELECT * FROM users WHERE id = ?", (vol["user_id"],)).fetchone())
                if not user or not verify_password(current_password, user["password"]):
                    raise HTTPException(400, "Current password is incorrect")
                hashed = hash_password(new_password)
                db.execute("UPDATE users SET password = ? WHERE id = ?", (hashed, vol["user_id"]))

        updated = dict_row(db.execute("SELECT * FROM volunteers WHERE id = ?", (volunteer_id,)).fetchone())
        return updated


@router.put("/{volunteer_id}/profile-picture")
def upload_profile_picture(volunteer_id: int, body: dict, current_user: dict = Depends(get_current_user)):
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

    filename = f"{volunteer_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(base64.b64decode(data))

    with get_db() as db:
        db.execute("UPDATE volunteers SET profile_picture = ? WHERE id = ?", (filename, volunteer_id))
        return {"profile_picture": filename}


@router.get("/{volunteer_id}/org/{org_id}")
def get_volunteer_org_dashboard(volunteer_id: int, org_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        org = dict_row(db.execute("SELECT * FROM organizations WHERE id = ?", (org_id,)).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        activities = dict_rows(db.execute(
            "SELECT a.*, e.name as event_name, e.date as event_date "
            "FROM activities a "
            "LEFT JOIN events e ON a.event_id = e.id "
            "WHERE a.volunteer_id = ? AND a.org_id = ? ORDER BY a.date DESC",
            (volunteer_id, org_id),
        ).fetchall())

        certificates = dict_rows(db.execute(
            "SELECT c.*, e.name as event_name "
            "FROM certificates c "
            "LEFT JOIN events e ON c.event_id = e.id "
            "WHERE c.volunteer_id = ? AND c.org_id = ?",
            (volunteer_id, org_id),
        ).fetchall())

        pending_activities = [a for a in activities if a["status"] == "Pending"]
        approved_activities = [a for a in activities if a["status"] == "Approved"]
        total_hours = sum(a["hours"] for a in approved_activities)

        pending_applications = dict_rows(db.execute(
            "SELECT ea.*, e.name as event_name, e.date as event_date "
            "FROM event_applications ea "
            "JOIN events e ON ea.event_id = e.id "
            "WHERE ea.volunteer_id = ? AND ea.org_id = ? AND ea.status = 'Pending'",
            (volunteer_id, org_id),
        ).fetchall())

        return {
            "organization": org,
            "activities": activities,
            "certificates": certificates,
            "total_hours": total_hours,
            "completed_activities": len(approved_activities),
            "pending_activities": pending_activities,
            "pending_applications": pending_applications,
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
        db.execute("UPDATE volunteers SET status = ? WHERE id = ?", (status_val, volunteer_id))
        return {"message": "Status updated"}
