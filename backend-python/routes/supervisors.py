from fastapi import APIRouter, HTTPException, Depends

from database import get_db, dict_row, dict_rows
from auth import hash_password, require_roles

router = APIRouter(prefix="/api/supervisors", tags=["supervisors"])


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
