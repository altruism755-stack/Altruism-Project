import base64
import json
import os
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from database import get_db, dict_row
from auth import hash_password, verify_password, generate_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterBody(BaseModel):
    email: str
    password: str
    role: str
    # Volunteer fields
    name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    skills: Optional[list] = None
    dateOfBirth: Optional[str] = None
    governorate: Optional[str] = None
    nationalId: Optional[str] = None
    profilePicture: Optional[str] = None  # base64 data URI, optional
    gender: Optional[str] = None
    healthNotes: Optional[str] = None
    availability: Optional[list] = None
    hoursPerWeek: Optional[int] = None
    languages: Optional[list] = None
    educationLevel: Optional[str] = None
    priorExperience: Optional[bool] = None
    priorOrg: Optional[str] = None
    experiences: Optional[list] = None
    causeAreas: Optional[list] = None
    nationality: Optional[str] = None
    universityName: Optional[str] = None
    faculty: Optional[str] = None
    studyYear: Optional[str] = None
    fieldOfStudy: Optional[str] = None
    department: Optional[str] = None
    # Organization fields (enhanced — mirror of registration form)
    orgName: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None         # legacy comma-joined string
    categories: Optional[list] = None      # canonical multi-select
    website: Optional[str] = None
    orgType: Optional[str] = None
    orgSize: Optional[str] = None
    officialEmail: Optional[str] = None
    foundedYear: Optional[str] = None
    location: Optional[str] = None         # HQ governorate (legacy column name)
    hqCity: Optional[str] = None
    branches: Optional[list] = None
    socialLinks: Optional[str] = None
    logoUrl: Optional[str] = None
    documentsUrl: Optional[str] = None
    submitterName: Optional[str] = None
    submitterRole: Optional[str] = None
    additionalNotes: Optional[str] = None


class LoginBody(BaseModel):
    email: str
    password: str


@router.post("/register", status_code=201)
def register(body: RegisterBody):
    if not body.email or not body.password or not body.role:
        raise HTTPException(400, "Email, password, and role are required")

    with get_db() as db:
        existing = db.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone()
        if existing:
            raise HTTPException(409, "Email already registered")

        hashed = hash_password(body.password)

        if body.role == "volunteer":
            if body.causeAreas is not None:
                n = len(body.causeAreas)
                if 1 <= n <= 4:
                    raise HTTPException(422, "Please select exactly 5 interests, or leave it empty.")

            cur = db.execute(
                "INSERT INTO users (email, password, role) VALUES (?, ?, 'volunteer')",
                (body.email, hashed),
            )
            user_id = cur.lastrowid
            db.execute(
                "INSERT INTO volunteers (user_id, name, email, phone, city, skills, "
                "date_of_birth, governorate, national_id, gender, health_notes, availability, "
                "hours_per_week, languages, education_level, prior_experience, prior_org, "
                "experiences, cause_areas, nationality, university_name, faculty, study_year, "
                "field_of_study, department, status) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')",
                (user_id, body.name or "", body.email, body.phone or None, body.city or None,
                 json.dumps(body.skills or []),
                 body.dateOfBirth or None, body.governorate or None, body.nationalId or None,
                 body.gender or None, body.healthNotes or None,
                 json.dumps(body.availability or []), body.hoursPerWeek or 0,
                 json.dumps(body.languages or []), body.educationLevel or None,
                 1 if body.priorExperience else 0, body.priorOrg or None,
                 json.dumps(body.experiences or []),
                 json.dumps(body.causeAreas or []),
                 body.nationality or None, body.universityName or None,
                 body.faculty or None, body.studyYear or None, body.fieldOfStudy or None,
                 body.department or None),
            )
            vol = dict_row(db.execute("SELECT * FROM volunteers WHERE user_id = ?", (user_id,)).fetchone())

            # Save optional profile picture
            if body.profilePicture and vol:
                try:
                    from routes.volunteers import UPLOAD_DIR
                    pic_data = body.profilePicture
                    header, data = pic_data.split(",", 1) if "," in pic_data else ("", pic_data)
                    ext = "jpg" if ("jpeg" in header or "jpg" in header) else "png"
                    decoded = base64.b64decode(data)
                    if len(decoded) <= 2 * 1024 * 1024:
                        filename = f"{vol['id']}_{uuid.uuid4().hex[:8]}.{ext}"
                        filepath = os.path.join(UPLOAD_DIR, filename)
                        with open(filepath, "wb") as f:
                            f.write(decoded)
                        db.execute("UPDATE volunteers SET profile_picture = ? WHERE id = ?", (filename, vol["id"]))
                        vol["profile_picture"] = filename
                except Exception:
                    pass  # image save failure is non-fatal

            token = generate_token({"id": user_id, "email": body.email, "role": "volunteer"})
            return {"token": token, "user": {"id": user_id, "email": body.email, "role": "volunteer"}, "volunteer": vol}

        if body.role == "org_admin":
            if not body.orgName:
                raise HTTPException(400, "Organization name is required")

            cur = db.execute(
                "INSERT INTO users (email, password, role) VALUES (?, ?, 'org_admin')",
                (body.email, hashed),
            )
            user_id = cur.lastrowid
            initials = "".join(w[0] for w in (body.orgName or "").split() if w)[:2].upper()
            # Resolve category vs categories: prefer the canonical multi-select
            # list when provided; otherwise fall back to the legacy comma-string.
            cats_list = body.categories or (
                [c.strip() for c in (body.category or "").split(",") if c.strip()]
                if body.category else []
            )
            cats_string = ", ".join(cats_list) if cats_list else (body.category or "")
            db.execute(
                """INSERT INTO organizations (
                    name, description, category, categories, initials, website, phone, admin_user_id,
                    status, org_type, org_size, official_email, founded_year, location, hq_city,
                    branches, social_links, logo_url, documents_url,
                    submitter_name, submitter_role, additional_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    body.orgName, body.description or "",
                    cats_string, json.dumps(cats_list),
                    initials,
                    body.website or "", body.phone or "", user_id,
                    body.orgType or "", body.orgSize or "",
                    body.officialEmail or body.email, body.foundedYear or "",
                    body.location or "", body.hqCity or "",
                    json.dumps(body.branches or []),
                    body.socialLinks or "",
                    body.logoUrl or "", body.documentsUrl or "",
                    body.submitterName or "", body.submitterRole or "",
                    body.additionalNotes or "",
                ),
            )
            org = dict_row(db.execute("SELECT * FROM organizations WHERE admin_user_id = ?", (user_id,)).fetchone())
            token = generate_token({"id": user_id, "email": body.email, "role": "org_admin"})
            return {
                "token": token,
                "user": {"id": user_id, "email": body.email, "role": "org_admin"},
                "organization": org,
                "message": "Registration submitted. Your organization will be reviewed by the platform admin.",
            }

        raise HTTPException(400, "Invalid role. Use 'volunteer' or 'org_admin'")


@router.post("/login")
def login(body: LoginBody):
    if not body.email or not body.password:
        raise HTTPException(400, "Email and password are required")

    with get_db() as db:
        user = dict_row(db.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone())
        if not user or not verify_password(body.password, user["password"]):
            raise HTTPException(401, "Invalid email or password")

        token = generate_token(user)
        profile = None
        org_status = None

        if user["role"] == "volunteer":
            profile = dict_row(db.execute("SELECT * FROM volunteers WHERE user_id = ?", (user["id"],)).fetchone())
        elif user["role"] == "supervisor":
            profile = dict_row(db.execute("SELECT * FROM supervisors WHERE user_id = ?", (user["id"],)).fetchone())
        elif user["role"] == "org_admin":
            profile = dict_row(db.execute("SELECT * FROM organizations WHERE admin_user_id = ?", (user["id"],)).fetchone())
            if profile:
                org_status = profile.get("status") or "approved"

        # Check if this user is also a platform admin
        pa_row = db.execute(
            "SELECT user_id FROM platform_admins WHERE user_id = ?", (user["id"],)
        ).fetchone()
        is_platform_admin = pa_row is not None

        return {
            "token": token,
            "user": {
                "id": user["id"], "email": user["email"], "role": user["role"],
                "is_platform_admin": is_platform_admin,
            },
            "profile": profile,
            "org_status": org_status,
        }


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        user = dict_row(db.execute(
            "SELECT id, email, role, created_at FROM users WHERE id = ?", (current_user["id"],)
        ).fetchone())
        if not user:
            raise HTTPException(404, "User not found")

        profile = None
        if user["role"] == "volunteer":
            profile = dict_row(db.execute("SELECT * FROM volunteers WHERE user_id = ?", (user["id"],)).fetchone())
        elif user["role"] == "supervisor":
            profile = dict_row(db.execute("SELECT * FROM supervisors WHERE user_id = ?", (user["id"],)).fetchone())
        elif user["role"] == "org_admin":
            profile = dict_row(db.execute("SELECT * FROM organizations WHERE admin_user_id = ?", (user["id"],)).fetchone())

        pa_row = db.execute(
            "SELECT user_id FROM platform_admins WHERE user_id = ?", (user["id"],)
        ).fetchone()
        user["is_platform_admin"] = pa_row is not None

        return {"user": user, "profile": profile}
