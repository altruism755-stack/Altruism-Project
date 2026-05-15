import base64
import json
import os
import uuid
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_db, dict_row
from auth import hash_password, verify_password, generate_token, get_current_user, get_org_for_admin

router = APIRouter(prefix="/api/auth", tags=["auth"])
_limiter = Limiter(key_func=get_remote_address)


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
@_limiter.limit("20/minute")
def register(request: Request, body: RegisterBody):
    if not body.email or not body.password or not body.role:
        raise HTTPException(400, "Email, password, and role are required")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    with get_db() as db:
        existing = db.execute("SELECT id FROM users WHERE email = %s", (body.email,)).fetchone()
        if existing:
            raise HTTPException(409, "Email already registered")

        hashed = hash_password(body.password)

        if body.role == "volunteer":
            if body.causeAreas is not None:
                n = len(body.causeAreas)
                if n > 5:
                    raise HTTPException(422, "You can select up to 5 interests.")

            row = db.execute(
                "INSERT INTO users (email, password, role) VALUES (%s, %s, 'volunteer') RETURNING id",
                (body.email, hashed),
            ).fetchone()
            user_id = row["id"]
            db.execute(
                "INSERT INTO volunteers (user_id, name, phone, city, skills, "
                "date_of_birth, governorate, national_id, gender, health_notes, availability, "
                "hours_per_week, languages, education_level, prior_experience, prior_org, "
                "experiences, cause_areas, nationality, university_name, faculty, study_year, "
                "field_of_study, department, status) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active')",
                (user_id, body.name or "", body.phone or None, body.city or None,
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
            vol = dict_row(db.execute("SELECT * FROM volunteers WHERE user_id = %s", (user_id,)).fetchone())

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
                        db.execute("UPDATE volunteers SET profile_picture = %s WHERE id = %s", (filename, vol["id"]))
                        vol["profile_picture"] = filename
                except Exception:
                    pass  # image save failure is non-fatal

            token = generate_token({"id": user_id, "email": body.email, "role": "volunteer"})
            return {"token": token, "user": {"id": user_id, "email": body.email, "role": "volunteer"}, "volunteer": vol}

        if body.role == "org_admin":
            if not body.orgName:
                raise HTTPException(400, "Organization name is required")

            row = db.execute(
                "INSERT INTO users (email, password, role) VALUES (%s, %s, 'org_admin') RETURNING id",
                (body.email, hashed),
            ).fetchone()
            user_id = row["id"]
            # Resolve categories: prefer the canonical multi-select list; fall back to legacy comma-string.
            cats_list = body.categories or (
                [c.strip() for c in (body.category or "").split(",") if c.strip()]
                if body.category else []
            )
            initials = "".join(w[0] for w in (body.orgName or "").split() if w)[:2].upper()
            db.execute(
                """INSERT INTO organizations (
                    name, description, categories, website, phone, admin_user_id,
                    status, org_type, org_size, official_email, founded_year, hq_city,
                    branches, social_links, logo_url, documents_url,
                    submitter_name, submitter_role, additional_notes
                ) VALUES (%s, %s, %s, %s, %s, %s, 'pending', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    body.orgName, body.description or "",
                    json.dumps(cats_list),
                    body.website or "", body.phone or "", user_id,
                    body.orgType or "", body.orgSize or "",
                    body.officialEmail or body.email, body.foundedYear or "",
                    body.hqCity or body.location or "",
                    json.dumps(body.branches or []),
                    body.socialLinks or "",
                    body.logoUrl or "", body.documentsUrl or "",
                    body.submitterName or "", body.submitterRole or "",
                    body.additionalNotes or "",
                ),
            )
            org = dict_row(db.execute(
                "SELECT * FROM organizations WHERE admin_user_id = %s ORDER BY created_at DESC LIMIT 1",
                (user_id,),
            ).fetchone())
            # Invariant: creator is always an org admin from day one.
            # ON CONFLICT DO NOTHING is safe against the UNIQUE(user_id, org_id) constraint.
            if org:
                db.execute(
                    "INSERT INTO org_admins (user_id, org_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (user_id, org["id"]),
                )
            token = generate_token({"id": user_id, "email": body.email, "role": "org_admin"})
            return {
                "token": token,
                "user": {"id": user_id, "email": body.email, "role": "org_admin"},
                "organization": org,
                "message": "Registration submitted. Your organization will be reviewed by the platform admin.",
            }

        raise HTTPException(400, "Invalid role. Use 'volunteer' or 'org_admin'")


@router.post("/login")
@_limiter.limit("10/minute")
def login(request: Request, body: LoginBody):
    if not body.email or not body.password:
        raise HTTPException(400, "Email and password are required")

    with get_db() as db:
        user = dict_row(db.execute("SELECT * FROM users WHERE email = %s", (body.email,)).fetchone())
        if not user:
            raise HTTPException(401, "Invalid email or password")
        if not verify_password(body.password, user["password"]):
            raise HTTPException(401, "Invalid email or password")

        token = generate_token(user)
        profile = None
        org_status = None

        if user["role"] == "volunteer":
            profile = dict_row(db.execute("SELECT * FROM volunteers WHERE user_id = %s", (user["id"],)).fetchone())
        elif user["role"] == "supervisor":
            profile = dict_row(db.execute("SELECT * FROM supervisors WHERE user_id = %s", (user["id"],)).fetchone())
        elif user["role"] == "org_admin":
            try:
                org_ref = get_org_for_admin(db, user["id"])
                profile = dict_row(db.execute("SELECT * FROM organizations WHERE id = %s", (org_ref["id"],)).fetchone())
            except HTTPException:
                profile = None
            if profile:
                org_status = profile.get("status") or "approved"

        is_platform_admin = user["role"] == "platform_admin"

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
            "SELECT id, email, role, created_at FROM users WHERE id = %s", (current_user["id"],)
        ).fetchone())
        if not user:
            raise HTTPException(404, "User not found")

        profile = None
        if user["role"] == "volunteer":
            profile = dict_row(db.execute("SELECT * FROM volunteers WHERE user_id = %s", (user["id"],)).fetchone())
        elif user["role"] == "supervisor":
            profile = dict_row(db.execute("SELECT * FROM supervisors WHERE user_id = %s", (user["id"],)).fetchone())
        elif user["role"] == "org_admin":
            try:
                org_ref = get_org_for_admin(db, user["id"])
                profile = dict_row(db.execute("SELECT * FROM organizations WHERE id = %s", (org_ref["id"],)).fetchone())
            except HTTPException:
                profile = None

        user["is_platform_admin"] = user["role"] == "platform_admin"

        return {"user": user, "profile": profile}


