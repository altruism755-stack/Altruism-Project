import os
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable must be set")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7

security = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def generate_token(user: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    return decode_token(credentials.credentials)


def require_roles(*roles: str):
    def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return dependency


def require_platform_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Platform admin role is stored as users.role = 'platform_admin'."""
    if current_user.get("role") != "platform_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required",
        )
    return current_user


def get_org_for_admin(db, user_id: int) -> dict:
    """
    Return the org row (id, name, …) for an org_admin user.
    Checks both organizations.admin_user_id and the org_admins many-to-many table
    so that admins added via POST /me/admins work everywhere.
    Raises HTTP 403 if the user has no approved org.
    """
    org = db.execute(
        """
        SELECT o.id, o.name, o.status, o.tracks_hours, o.admin_user_id
        FROM organizations o
        WHERE (
            o.admin_user_id = %s
            OR EXISTS (
                SELECT 1 FROM org_admins oa
                WHERE oa.org_id = o.id AND oa.user_id = %s
            )
        )
        AND o.status = 'approved'
        LIMIT 1
        """,
        (user_id, user_id),
    ).fetchone()
    if not org:
        raise HTTPException(status_code=403, detail="No approved organization found for this admin")
    return dict(org)


def require_approved_org_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Org admin whose organization has been approved by the platform.
    Accepts admins registered either via organizations.admin_user_id or org_admins table.
    """
    if current_user["role"] != "org_admin":
        raise HTTPException(status_code=403, detail="Org admin access required")
    from database import get_db
    with get_db() as db:
        row = db.execute(
            """
            SELECT 1 FROM organizations o
            WHERE (
                o.admin_user_id = %s
                OR EXISTS (
                    SELECT 1 FROM org_admins oa
                    WHERE oa.org_id = o.id AND oa.user_id = %s
                )
            )
            AND o.status = 'approved'
            LIMIT 1
            """,
            (current_user["id"], current_user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=403, detail="No approved organization found for this admin")
    return current_user
