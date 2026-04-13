from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


@router.get("")
def list_announcements(
    org_ids: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    with get_db() as db:
        if org_ids:
            ids = [int(i) for i in org_ids.split(",") if i.strip().isdigit()]
            if ids:
                placeholders = ",".join("?" * len(ids))
                announcements = dict_rows(db.execute(
                    f"SELECT a.*, o.name as org_name, o.initials as org_initials, o.color as org_color "
                    f"FROM announcements a JOIN organizations o ON a.org_id = o.id "
                    f"WHERE a.org_id IN ({placeholders}) ORDER BY a.created_at DESC LIMIT 50",
                    ids,
                ).fetchall())
            else:
                announcements = []
        else:
            announcements = dict_rows(db.execute(
                "SELECT a.*, o.name as org_name, o.initials as org_initials, o.color as org_color "
                "FROM announcements a JOIN organizations o ON a.org_id = o.id "
                "ORDER BY a.created_at DESC LIMIT 50"
            ).fetchall())
        return {"announcements": announcements}


@router.post("", status_code=201)
def create_announcement(body: dict, current_user: dict = Depends(require_roles("org_admin"))):
    title = body.get("title")
    content = body.get("content", "")
    if not title:
        raise HTTPException(400, "Title is required")

    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        cur = db.execute(
            "INSERT INTO announcements (org_id, title, content) VALUES (?, ?, ?)",
            (org["id"], title, content),
        )
        announcement = dict_row(db.execute(
            "SELECT a.*, o.name as org_name FROM announcements a "
            "JOIN organizations o ON a.org_id = o.id WHERE a.id = ?",
            (cur.lastrowid,),
        ).fetchone())
        return announcement


@router.delete("/{ann_id}")
def delete_announcement(ann_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        db.execute("DELETE FROM announcements WHERE id = ?", (ann_id,))
        return {"message": "Announcement deleted"}
