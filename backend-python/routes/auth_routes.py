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
    aboutMe: Optional[str] = None
    dateOfBirth: Optional[str] = None
    governorate: Optional[str] = None
    nationalId: Optional[str] = None
    profilePicture: Optional[str] = None  # base64 data URI, optional
    # Organization fields (enhanced)
    orgName: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    website: Optional[str] = None
    orgType: Optional[str] = None        # NGO, Company, Student Activity, etc.
    officialEmail: Optional[str] = None
    foundedYear: Optional[str] = None
    location: Optional[str] = None       # city / governorate
    socialLinks: Optional[str] = None
    logoUrl: Optional[str] = None
    documentsUrl: Optional[str] = None
    submitterName: Optional[str] = None
    submitterRole: Optional[str] = None


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
            cur = db.execute(
                "INSERT INTO users (email, password, role) VALUES (?, ?, 'volunteer')",
                (body.email, hashed),
            )
            user_id = cur.lastrowid
            db.execute(
                "INSERT INTO volunteers (user_id, name, email, phone, city, skills, about_me, date_of_birth, governorate, national_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')",
                (user_id, body.name or "", body.email, body.phone or "", body.city or "",
                 json.dumps(body.skills or []), body.aboutMe or "",
                 body.dateOfBirth or "", body.governorate or "", body.nationalId or ""),
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
            db.execute(
                """INSERT INTO organizations (
                    name, description, category, initials, website, phone, admin_user_id,
                    status, org_type, official_email, founded_year, location, social_links,
                    logo_url, documents_url, submitter_name, submitter_role
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    body.orgName, body.description or "", body.category or "", initials,
                    body.website or "", body.phone or "", user_id,
                    body.orgType or "", body.officialEmail or body.email, body.foundedYear or "",
                    body.location or "", body.socialLinks or "",
                    body.logoUrl or "", body.documentsUrl or "",
                    body.submitterName or "", body.submitterRole or "",
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
