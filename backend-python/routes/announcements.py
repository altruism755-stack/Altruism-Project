from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles
from routes.notifications import create_notification

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


def _resolve_org_for_admin(db, user_id: int) -> dict:
    """Return the org for an org_admin — checks both admin_user_id and org_admins table."""
    org = dict_row(db.execute(
        """
        SELECT id FROM organizations WHERE admin_user_id = %s
        UNION
        SELECT o.id FROM organizations o
        JOIN org_admins oa ON oa.org_id = o.id
        WHERE oa.user_id = %s AND o.status = 'approved'
        LIMIT 1
        """,
        (user_id, user_id),
    ).fetchone())
    if not org:
        raise HTTPException(404, "Organization not found")
    return org


@router.get("")
def list_announcements(
    org_ids: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    with get_db() as db:
        if org_ids:
            ids = [int(i) for i in org_ids.split(",") if i.strip().isdigit()]
            if not ids:
                return {"announcements": []}
            placeholders = ",".join(["%s"] * len(ids))
            announcements = dict_rows(db.execute(
                f"SELECT a.*, o.name as org_name "
                f"FROM announcements a JOIN organizations o ON a.org_id = o.id "
                f"WHERE a.org_id IN ({placeholders}) ORDER BY a.created_at DESC LIMIT 50",
                ids,
            ).fetchall())
        else:
            # Scope to caller's own org memberships — never return all-platform announcements.
            role = current_user["role"]
            if role == "volunteer":
                scoped_ids = [
                    r["org_id"] for r in db.execute(
                        "SELECT ov.org_id FROM org_volunteers ov "
                        "JOIN volunteers v ON v.id = ov.volunteer_id "
                        "WHERE v.user_id = %s AND ov.status = 'active'",
                        (current_user["id"],),
                    ).fetchall()
                ]
            elif role == "supervisor":
                row = db.execute(
                    "SELECT org_id FROM supervisors WHERE user_id = %s", (current_user["id"],)
                ).fetchone()
                scoped_ids = [row["org_id"]] if row else []
            elif role == "org_admin":
                try:
                    org = _resolve_org_for_admin(db, current_user["id"])
                    scoped_ids = [org["id"]]
                except HTTPException:
                    scoped_ids = []
            else:
                scoped_ids = []

            if not scoped_ids:
                return {"announcements": []}
            placeholders = ",".join(["%s"] * len(scoped_ids))
            announcements = dict_rows(db.execute(
                f"SELECT a.*, o.name as org_name "
                f"FROM announcements a JOIN organizations o ON a.org_id = o.id "
                f"WHERE a.org_id IN ({placeholders}) ORDER BY a.created_at DESC LIMIT 50",
                scoped_ids,
            ).fetchall())
        return {"announcements": announcements}


@router.post("", status_code=201)
def create_announcement(body: dict, current_user: dict = Depends(require_roles("org_admin"))):
    title = body.get("title")
    content = body.get("content", "")
    if not title:
        raise HTTPException(400, "Title is required")

    with get_db() as db:
        org = _resolve_org_for_admin(db, current_user["id"])

        row = db.execute(
            "INSERT INTO announcements (org_id, title, content) VALUES (%s, %s, %s) RETURNING id",
            (org["id"], title, content),
        ).fetchone()
        announcement = dict_row(db.execute(
            "SELECT a.*, o.name as org_name FROM announcements a "
            "JOIN organizations o ON a.org_id = o.id WHERE a.id = %s",
            (row["id"],),
        ).fetchone())

        # Notify every active member (volunteers + supervisor) of this org
        # within the same transaction so notifications are never orphaned.
        org_name = announcement["org_name"]
        action_url = f"/dashboard/org/{org['id']}?tab=announcements"

        member_user_ids = [
            r["user_id"] for r in db.execute(
                """
                SELECT v.user_id
                FROM org_volunteers ov
                JOIN volunteers v ON v.id = ov.volunteer_id
                WHERE ov.org_id = %s AND ov.status = 'active'
                """,
                (org["id"],),
            ).fetchall()
        ]
        supervisor_row = db.execute(
            "SELECT user_id FROM supervisors WHERE org_id = %s", (org["id"],)
        ).fetchone()
        if supervisor_row:
            member_user_ids.append(supervisor_row["user_id"])

        for uid in member_user_ids:
            create_notification(
                db,
                user_id=uid,
                type="announcement",
                title=f"New announcement from {org_name}",
                message=title,
                action_url=action_url,
            )

        return announcement


@router.delete("/{ann_id}")
def delete_announcement(ann_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = _resolve_org_for_admin(db, current_user["id"])
        result = db.execute(
            "DELETE FROM announcements WHERE id = %s AND org_id = %s RETURNING id",
            (ann_id, org["id"]),
        ).fetchone()
        if not result:
            raise HTTPException(404, "Announcement not found in your organization")
        return {"message": "Announcement deleted"}
