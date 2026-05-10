import os
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles, get_org_for_admin
from routes.notifications import create_notification
from routes.audit import log_action

router = APIRouter(prefix="/api/certificates", tags=["certificates"])

CERT_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "certificates")
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}


@router.get("")
def list_certificates(
    volunteer_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    with get_db() as db:
        base = (
            "SELECT c.*, o.name as org_name, e.name as event_name, v.name as volunteer_name "
            "FROM certificates c "
            "JOIN organizations o ON c.org_id = o.id "
            "LEFT JOIN events e ON c.event_id = e.id "
            "JOIN volunteers v ON c.volunteer_id = v.id"
        )
        extra_join = ""
        clauses: list[str] = ["1=1"]
        params: list = []

        role = current_user["role"]
        if role == "supervisor":
            sup = dict_row(db.execute(
                "SELECT id, org_id FROM supervisors WHERE user_id = %s", (current_user["id"],)
            ).fetchone())
            if not sup:
                raise HTTPException(403, "You do not have permission to access this resource")
            # Certs for any volunteer in the supervisor's org.
            clauses.append("c.org_id = %s")
            params.append(sup["org_id"])
        elif role == "org_admin":
            org = get_org_for_admin(db, current_user["id"])
            clauses.append("c.org_id = %s")
            params.append(org["id"])
        elif role == "volunteer":
            vol = dict_row(db.execute(
                "SELECT id FROM volunteers WHERE user_id = %s", (current_user["id"],)
            ).fetchone())
            if vol:
                clauses.append("c.volunteer_id = %s")
                params.append(vol["id"])
            clauses.append("c.file_url IS NOT NULL")

        # volunteer_id filter is only allowed for supervisors and org_admins.
        if volunteer_id and role != "volunteer":
            clauses.append("c.volunteer_id = %s")
            params.append(volunteer_id)

        query = base + extra_join + " WHERE " + " AND ".join(clauses) + " ORDER BY c.issued_date DESC"
        return {"certificates": dict_rows(db.execute(query, params).fetchall())}


@router.post("", status_code=201)
def issue_certificate(body: dict, current_user: dict = Depends(require_roles("org_admin", "supervisor"))):
    with get_db() as db:
        sup_record = None
        if current_user["role"] == "supervisor":
            sup_record = dict_row(db.execute(
                "SELECT id, org_id FROM supervisors WHERE user_id = %s", (current_user["id"],)
            ).fetchone())
            if not sup_record:
                raise HTTPException(404, "Supervisor not found")
            org = {"id": sup_record["org_id"]}
        else:
            org = get_org_for_admin(db, current_user["id"])

        volunteer_id = body.get("volunteer_id")
        certificate_title = (body.get("certificate_title") or "").strip()
        if not volunteer_id:
            raise HTTPException(400, "volunteer_id is required")
        if not certificate_title:
            raise HTTPException(400, "certificate_title is required")

        # Supervisors may issue certificates for any volunteer in their org.
        if current_user["role"] == "supervisor" and sup_record:
            membership = db.execute(
                "SELECT id FROM org_volunteers WHERE volunteer_id = %s AND org_id = %s AND status = 'Active'",
                (volunteer_id, sup_record["org_id"]),
            ).fetchone()
            if not membership:
                raise HTTPException(403, "Volunteer is not an active member of your organization")

        row = db.execute(
            "INSERT INTO certificates (volunteer_id, org_id, event_id, certificate_title) VALUES (%s, %s, %s, %s) RETURNING id",
            (volunteer_id, org["id"], body.get("event_id"), certificate_title),
        ).fetchone()

        cert = dict_row(db.execute(
            "SELECT c.*, o.name as org_name, e.name as event_name "
            "FROM certificates c "
            "JOIN organizations o ON c.org_id = o.id "
            "LEFT JOIN events e ON c.event_id = e.id WHERE c.id = %s",
            (row["id"],),
        ).fetchone())

        vol_user = dict_row(db.execute(
            "SELECT v.user_id FROM volunteers v WHERE v.id = %s", (volunteer_id,)
        ).fetchone())
        if vol_user and vol_user.get("user_id"):
            org_name = (cert or {}).get("org_name", "the organization")
            create_notification(
                db,
                vol_user["user_id"],
                "certificate_issued",
                "Certificate Issued",
                f"You've received \"{certificate_title}\" from {org_name}. Check your profile!",
                "/dashboard/profile",
            )
        log_action(db, current_user["id"], current_user["role"], "issue_certificate",
                   "certificate", row["id"],
                   {"volunteer_id": volunteer_id, "org_id": org["id"], "title": certificate_title,
                    "event_id": body.get("event_id")})
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
        cert = dict_row(db.execute("SELECT * FROM certificates WHERE id = %s", (cert_id,)).fetchone())
        if not cert:
            raise HTTPException(404, "Certificate not found")

        if current_user["role"] == "supervisor":
            sup = dict_row(db.execute(
                "SELECT id, org_id FROM supervisors WHERE user_id = %s", (current_user["id"],)
            ).fetchone())
            if not sup or sup["org_id"] != cert["org_id"]:
                raise HTTPException(403, "Not authorized for this certificate's organization")
        else:
            org = get_org_for_admin(db, current_user["id"])
            if org["id"] != cert["org_id"]:
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
        MAX_CERT_SIZE = 10 * 1024 * 1024  # 10 MB
        content = await file.read(MAX_CERT_SIZE + 1)
        if len(content) > MAX_CERT_SIZE:
            raise HTTPException(413, "Certificate file must be 10 MB or smaller")
        with open(file_path, "wb") as f:
            f.write(content)

        file_url = f"/uploads/certificates/{filename}"
        db.execute("UPDATE certificates SET file_url = %s WHERE id = %s", (file_url, cert_id))
        log_action(db, current_user["id"], current_user["role"], "upload_certificate",
                   "certificate", cert_id,
                   {"volunteer_id": cert["volunteer_id"], "org_id": cert["org_id"], "file_url": file_url})
        return {"file_url": file_url}


@router.get("/{cert_id}/file")
def download_certificate_file(cert_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        cert = dict_row(db.execute(
            "SELECT c.*, v.user_id as vol_user_id FROM certificates c "
            "JOIN volunteers v ON v.id = c.volunteer_id WHERE c.id = %s",
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
                "SELECT org_id FROM supervisors WHERE user_id = %s", (current_user["id"],)
            ).fetchone())
            if not sup or sup["org_id"] != cert["org_id"]:
                raise HTTPException(403, "Access denied")
        elif role == "org_admin":
            org = get_org_for_admin(db, current_user["id"])
            if org["id"] != cert["org_id"]:
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
