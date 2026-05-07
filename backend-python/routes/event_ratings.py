from fastapi import APIRouter, HTTPException, Depends
import logging

from database import get_db, dict_row, dict_rows
from auth import get_current_user, require_roles
from routes.audit import log_action

router = APIRouter(prefix="/api/event-ratings", tags=["event_ratings"])
logger = logging.getLogger(__name__)


@router.post("", status_code=201)
def rate_event(body: dict, current_user: dict = Depends(require_roles("volunteer"))):
    """
    Volunteer submits a 1–5 star rating for a Completed event they attended.
    Each volunteer can rate an event only once (upsert on conflict).
    Rating is visible to the organization only.
    """
    event_id = body.get("event_id")
    rating = body.get("rating")
    feedback = (body.get("feedback") or "").strip()

    if not event_id:
        raise HTTPException(400, "event_id is required")
    if rating is None or not isinstance(rating, int) or rating < 1 or rating > 5:
        raise HTTPException(400, "rating must be an integer between 1 and 5")

    with get_db() as db:
        vol = dict_row(db.execute(
            "SELECT id FROM volunteers WHERE user_id = %s", (current_user["id"],)
        ).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")

        event = dict_row(db.execute("SELECT id, status, name FROM events WHERE id = %s", (event_id,)).fetchone())
        if not event:
            raise HTTPException(404, "Event not found")

        # Only completed events can be rated.
        if event["status"] != "Completed":
            raise HTTPException(409, "You can only rate events that have been completed")

        # Volunteer must have attended (have an approved application + activity record).
        attended = db.execute(
            "SELECT ea.id FROM event_applications ea "
            "WHERE ea.event_id = %s AND ea.volunteer_id = %s AND ea.status = 'Approved' AND ea.cancelled_at IS NULL",
            (event_id, vol["id"]),
        ).fetchone()
        if not attended:
            raise HTTPException(403, "You can only rate events you participated in")

        # Upsert: one rating per volunteer per event.
        db.execute(
            "INSERT INTO event_ratings (event_id, volunteer_id, rating, feedback) "
            "VALUES (%s, %s, %s, %s) "
            "ON CONFLICT(event_id, volunteer_id) DO UPDATE SET rating = EXCLUDED.rating, feedback = EXCLUDED.feedback",
            (event_id, vol["id"], rating, feedback or None),
        )
        log_action(db, current_user["id"], current_user["role"], "rate_event",
                   "event", event_id, {"rating": rating, "volunteer_id": vol["id"]})
        return {"message": "Rating submitted", "rating": rating}


@router.get("/event/{event_id}")
def get_event_ratings(event_id: int, current_user: dict = Depends(require_roles("org_admin", "supervisor"))):
    """
    Org admin or supervisor retrieves rating summary and feedback for an event.
    Returns: average rating, total count, individual feedback entries (anonymous).
    """
    with get_db() as db:
        event = dict_row(db.execute("SELECT id, org_id, name FROM events WHERE id = %s", (event_id,)).fetchone())
        if not event:
            raise HTTPException(404, "Event not found")

        # Scope check.
        if current_user["role"] == "supervisor":
            sup = dict_row(db.execute(
                "SELECT org_id FROM supervisors WHERE user_id = %s", (current_user["id"],)
            ).fetchone())
            if not sup or sup["org_id"] != event["org_id"]:
                raise HTTPException(403, "You do not have permission to access this resource")
        else:
            org = dict_row(db.execute(
                "SELECT id FROM organizations WHERE admin_user_id = %s", (current_user["id"],)
            ).fetchone())
            if not org or org["id"] != event["org_id"]:
                raise HTTPException(403, "You do not have permission to access this resource")

        summary = dict_row(db.execute(
            "SELECT COUNT(*) as total_ratings, ROUND(AVG(rating)::numeric, 2) as average_rating "
            "FROM event_ratings WHERE event_id = %s",
            (event_id,),
        ).fetchone())

        feedback_rows = dict_rows(db.execute(
            "SELECT rating, feedback, created_at FROM event_ratings "
            "WHERE event_id = %s AND feedback IS NOT NULL AND feedback != '' "
            "ORDER BY created_at DESC",
            (event_id,),
        ).fetchall())

        return {
            "event_id": event_id,
            "event_name": event["name"],
            "total_ratings": summary["total_ratings"] or 0,
            "average_rating": summary["average_rating"],
            "feedback": feedback_rows,
        }
