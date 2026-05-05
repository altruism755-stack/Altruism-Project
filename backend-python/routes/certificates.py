import os
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles
from routes.notifications import create_notification

router = APIRouter(prefix="/api/certificates", tags=["certificates"])

CERT_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "certificates")
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}


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
        # Volunteers only see certificates with an uploaded file
        if current_user["role"] == "volunteer":
            query += " AND c.file_url IS NOT NULL"
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


@router.post("/{cert_id}/upload", status_code=200)
async def upload_certificate_file(
    cert_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles("supervisor", "org_admin")),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Only PDF and image files (.pdf, .png, .jpg, .jpeg) are allowed")

    with get_db() as db:
        cert = dict_row(db.execute("SELECT * FROM certificates WHERE id = ?", (cert_id,)).fetchone())
        if not cert:
            raise HTTPException(404, "Certificate not found")

        if current_user["role"] == "supervisor":
            sup = dict_row(db.execute(
                "SELECT org_id FROM supervisors WHERE user_id = ?", (current_user["id"],)
            ).fetchone())
            if not sup or sup["org_id"] != cert["org_id"]:
                raise HTTPException(403, "Not authorized for this certificate's organization")
        else:
            org = dict_row(db.execute(
                "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
            ).fetchone())
            if not org or org["id"] != cert["org_id"]:
                raise HTTPException(403, "Not authorized for this certificate's organization")

        # Remove old file if one exists
        old_url = cert.get("file_url")
        if old_url:
            old_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), old_url.lstrip("/"))
            if os.path.exists(old_path):
                os.remove(old_path)

        os.makedirs(CERT_UPLOAD_DIR, exist_ok=True)
        filename = f"cert_{cert_id}_{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(CERT_UPLOAD_DIR, filename)
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        file_url = f"/uploads/certificates/{filename}"
        db.execute("UPDATE certificates SET file_url = ? WHERE id = ?", (file_url, cert_id))
        db.commit()
        return {"file_url": file_url}


@router.get("/{cert_id}/file")
def download_certificate_file(cert_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        cert = dict_row(db.execute(
            "SELECT c.*, v.user_id as vol_user_id FROM certificates c "
            "JOIN volunteers v ON v.id = c.volunteer_id WHERE c.id = ?",
            (cert_id,),
        ).fetchone())
        if not cert:
            raise HTTPException(404, "Certificate not found")

        role = current_user["role"]
        if role == "volunteer":
            if cert["vol_user_id"] != current_user["id"]:
                raise HTTPException(403, "Access denied")
        elif role == "supervisor":
            sup = dict_row(db.execute(
                "SELECT org_id FROM supervisors WHERE user_id = ?", (current_user["id"],)
            ).fetchone())
            if not sup or sup["org_id"] != cert["org_id"]:
                raise HTTPException(403, "Access denied")
        elif role == "org_admin":
            org = dict_row(db.execute(
                "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
            ).fetchone())
            if not org or org["id"] != cert["org_id"]:
                raise HTTPException(403, "Access denied")

        file_url = cert.get("file_url")
        if not file_url:
            raise HTTPException(404, "No file has been uploaded for this certificate")

        file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), file_url.lstrip("/"))
        if not os.path.exists(file_path):
            raise HTTPException(404, "Certificate file not found on server")

        return FileResponse(
            file_path,
            filename=os.path.basename(file_path),
            media_type="application/octet-stream",
        )
