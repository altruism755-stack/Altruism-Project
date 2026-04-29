"""In-app notifications for org admins."""
from fastapi import APIRouter, Depends
from typing import Optional

from database import get_db, dict_row, dict_rows
from auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def create_notification(
    db,
    user_id: int,
    type: str,
    title: str,
    message: str,
    action_url: Optional[str] = None,
) -> None:
    if not user_id:
        raise ValueError(f"Missing user_id for notification: title='{title}'")
    print("CREATING NOTIFICATION", user_id, title)
    db.execute(
        "INSERT INTO notifications (user_id, type, title, message, action_url) "
        "VALUES (?, ?, ?, ?, ?)",
        (user_id, type, title, message, action_url),
    )
    db.commit()


@router.get("")
def list_notifications(
    unread_only: bool = False,
    type: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    with get_db() as db:
        conditions = ["user_id = ?"]
        params: list = [current_user["id"]]
        if unread_only:
            conditions.append("is_read = 0")
        if type:
            conditions.append("type = ?")
            params.append(type)
        where = " AND ".join(conditions)
        rows = dict_rows(db.execute(
            f"SELECT * FROM notifications WHERE {where} ORDER BY created_at DESC LIMIT ?",
            (*params, limit),
        ).fetchall())
        unread_count = db.execute(
            "SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND is_read = 0",
            (current_user["id"],),
        ).fetchone()["c"]
        return {"notifications": rows, "unread_count": unread_count, "total": len(rows)}


@router.get("/unread-count")
def get_unread_count(current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        count = db.execute(
            "SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND is_read = 0",
            (current_user["id"],),
        ).fetchone()["c"]
        return {"unread_count": count}


# IMPORTANT: /read-all must be declared before /{notification_id} so FastAPI
# doesn't try to cast the literal "read-all" to int and 422.
@router.patch("/read-all")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        db.execute(
            "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
            (current_user["id"],),
        )
        return {"message": "All notifications marked as read"}


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
):
    with get_db() as db:
        row = dict_row(db.execute(
            "SELECT id FROM notifications WHERE id = ? AND user_id = ?",
            (notification_id, current_user["id"]),
        ).fetchone())
        if not row:
            from fastapi import HTTPException
            raise HTTPException(404, "Notification not found")
        db.execute(
            "UPDATE notifications SET is_read = 1 WHERE id = ?",
            (notification_id,),
        )
        return {"message": "Notification marked as read"}
