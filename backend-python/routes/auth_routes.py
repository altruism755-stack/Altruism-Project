import json
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
    name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    skills: Optional[list] = None
    aboutMe: Optional[str] = None
    orgName: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    website: Optional[str] = None


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
                "INSERT INTO volunteers (user_id, name, email, phone, city, skills, about_me, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')",
                (user_id, body.name or "", body.email, body.phone or "", body.city or "",
                 json.dumps(body.skills or []), body.aboutMe or ""),
            )
            vol = dict_row(db.execute("SELECT * FROM volunteers WHERE user_id = ?", (user_id,)).fetchone())
            token = generate_token({"id": user_id, "email": body.email, "role": "volunteer"})
            return {"token": token, "user": {"id": user_id, "email": body.email, "role": "volunteer"}, "volunteer": vol}

        if body.role == "org_admin":
            cur = db.execute(
                "INSERT INTO users (email, password, role) VALUES (?, ?, 'org_admin')",
                (body.email, hashed),
            )
            user_id = cur.lastrowid
            initials = "".join(w[0] for w in (body.orgName or "").split() if w)[:2].upper()
            db.execute(
                "INSERT INTO organizations (name, description, category, initials, website, phone, admin_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (body.orgName or "", body.description or "", body.category or "", initials,
                 body.website or "", body.phone or "", user_id),
            )
            org = dict_row(db.execute("SELECT * FROM organizations WHERE admin_user_id = ?", (user_id,)).fetchone())
            token = generate_token({"id": user_id, "email": body.email, "role": "org_admin"})
            return {"token": token, "user": {"id": user_id, "email": body.email, "role": "org_admin"}, "organization": org}

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

        if user["role"] == "volunteer":
            profile = dict_row(db.execute("SELECT * FROM volunteers WHERE user_id = ?", (user["id"],)).fetchone())
        elif user["role"] == "supervisor":
            profile = dict_row(db.execute("SELECT * FROM supervisors WHERE user_id = ?", (user["id"],)).fetchone())
        elif user["role"] == "org_admin":
            profile = dict_row(db.execute("SELECT * FROM organizations WHERE admin_user_id = ?", (user["id"],)).fetchone())

        return {
            "token": token,
            "user": {"id": user["id"], "email": user["email"], "role": user["role"]},
            "profile": profile,
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

        return {"user": user, "profile": profile}
