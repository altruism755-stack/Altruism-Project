from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles
from routes.notifications import create_notification

router = APIRouter(prefix="/api/certificates", tags=["certificates"])


@router.get("")
def list_certificates(
    volunteer_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    with get_db() as db:
        query = (
            "SELECT c.*, o.name as org_name, e.name as event_name, v.name as volunteer_name "
            "FROM certificates c "
            "JOIN organizations o ON c.org_id = o.id "
            "LEFT JOIN events e ON c.event_id = e.id "
            "JOIN volunteers v ON c.volunteer_id = v.id WHERE 1=1"
        )
        params: list = []
        if volunteer_id:
            query += " AND c.volunteer_id = ?"
            params.append(volunteer_id)
        query += " ORDER BY c.issued_date DESC"
        return {"certificates": dict_rows(db.execute(query, params).fetchall())}


@router.post("", status_code=201)
def issue_certificate(body: dict, current_user: dict = Depends(require_roles("org_admin", "supervisor"))):
    with get_db() as db:
        if current_user["role"] == "supervisor":
            sup = dict_row(db.execute(
                "SELECT org_id FROM supervisors WHERE user_id = ?", (current_user["id"],)
            ).fetchone())
            if not sup:
                raise HTTPException(404, "Supervisor not found")
            org = {"id": sup["org_id"]}
        else:
            org = dict_row(db.execute(
                "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
            ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        volunteer_id = body.get("volunteer_id")
        cert_type = body.get("type")
        if not volunteer_id or not cert_type:
            raise HTTPException(400, "volunteer_id and type are required")

        cur = db.execute(
            "INSERT INTO certificates (volunteer_id, org_id, event_id, type, hours) VALUES (?, ?, ?, ?, ?)",
            (volunteer_id, org["id"], body.get("event_id"), cert_type, body.get("hours", 0)),
        )

        cert = dict_row(db.execute(
            "SELECT c.*, o.name as org_name, e.name as event_name "
            "FROM certificates c "
            "JOIN organizations o ON c.org_id = o.id "
            "LEFT JOIN events e ON c.event_id = e.id WHERE c.id = ?",
            (cur.lastrowid,),
        ).fetchone())

        # Notify volunteer about their new certificate
        vol_user = dict_row(db.execute(
            "SELECT v.user_id FROM volunteers v WHERE v.id = ?", (volunteer_id,)
        ).fetchone())
        if vol_user and vol_user.get("user_id"):
            org_name = (cert or {}).get("org_name", "the organization")
            event_name = (cert or {}).get("event_name", "")
            cert_desc = f"{cert_type} certificate" + (f" for {event_name}" if event_name else "")
            create_notification(
                db,
                vol_user["user_id"],
                "certificate_issued",
                "Certificate Issued",
                f"You've received a {cert_desc} from {org_name}. Check your profile!",
                "/dashboard/profile",
            )
        db.commit()
        return cert
