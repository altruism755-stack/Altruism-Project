import os
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

JWT_SECRET = os.getenv("JWT_SECRET", "altruism-secret-key-change-in-production")
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
    """Platform admins are stored in the platform_admins table — a user may also
    have a regular role (org_admin, volunteer) and be elevated to platform level."""
    from database import get_db
    with get_db() as db:
        row = db.execute(
            "SELECT user_id FROM platform_admins WHERE user_id = ?", (current_user["id"],)
        ).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Platform admin access required",
            )
    return current_user


def require_approved_org_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Org admin whose organization has been approved by the platform."""
    if current_user["role"] != "org_admin":
        raise HTTPException(status_code=403, detail="Org admin access required")
    from database import get_db
    with get_db() as db:
        row = db.execute(
            "SELECT status FROM organizations WHERE admin_user_id = ?",
            (current_user["id"],),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Organization not found")
        if row["status"] not in ("approved", None):
            raise HTTPException(status_code=403, detail=f"Organization is {row['status']}")
    return current_user
