from fastapi import APIRouter, HTTPException, Depends
import logging

from database import get_db, exclusive_db, dict_row, dict_rows
from auth import get_current_user, require_roles
from routes.notifications import create_notification
from routes.audit import log_action

router = APIRouter(prefix="/api/event-applications", tags=["event_applications"])
logger = logging.getLogger(__name__)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_approved_count(db, event_id: int) -> int:
    row = db.execute(
        "SELECT COUNT(*) as cnt FROM event_applications "
        "WHERE event_id = ? AND status = 'Approved' AND cancelled_at IS NULL",
        (event_id,),
    ).fetchone()
    return row["cnt"] if row else 0


def _sync_event_capacity(db, event_id: int) -> None:
    """Update current_volunteers and is_full based on live approved count."""
    approved = _get_approved_count(db, event_id)
    event = dict_row(db.execute(
        "SELECT max_volunteers FROM events WHERE id = ?", (event_id,)
    ).fetchone())
    if not event:
        return
    capacity = event.get("max_volunteers") or 0
    is_full = 1 if (capacity > 0 and approved >= capacity) else 0
    db.execute(
        "UPDATE events SET current_volunteers = ?, is_full = ? WHERE id = ?",
        (approved, is_full, event_id),
    )


def _auto_promote_next(db, event_id: int, org_id: int) -> None:
    """Promote the oldest pending waitlisted applicant when a spot opens. Must run inside exclusive_db()."""
    event = dict_row(db.execute(
        "SELECT max_volunteers, acceptance_mode FROM events WHERE id = ?", (event_id,)
    ).fetchone())
    if not event or event.get("acceptance_mode") != "auto":
        return
    capacity = event.get("max_volunteers") or 0
    if capacity == 0:
        return
    approved = _get_approved_count(db, event_id)
    if approved >= capacity:
        return

    next_app = dict_row(db.execute(
        "SELECT ea.id, ea.volunteer_id, v.user_id, v.name as vol_name, e.name as event_name "
        "FROM event_applications ea "
        "JOIN volunteers v ON v.id = ea.volunteer_id "
        "JOIN events e ON e.id = ea.event_id "
        "WHERE ea.event_id = ? AND ea.status = 'Pending' AND ea.cancelled_at IS NULL "
        "ORDER BY ea.applied_date ASC LIMIT 1",
        (event_id,),
    ).fetchone())
    if not next_app:
        return

    db.execute(
        "UPDATE event_applications SET status = 'Approved' WHERE id = ?",
        (next_app["id"],),
    )
    _sync_event_capacity(db, event_id)
    logger.info("[EVENT %d] Volunteer %d promoted from waitlist", event_id, next_app["volunteer_id"])
    log_action(db, None, "system", "auto_promote", "event_application", next_app["id"],
               {"event_id": event_id, "volunteer_id": next_app["volunteer_id"]})

    if next_app.get("user_id"):
        create_notification(
            db,
            next_app["user_id"],
            "application_approved",
            "Spot Opened — You're In!",
            f"A spot opened up for '{next_app.get('event_name', 'the event')}'. You've been automatically accepted!",
            "/dashboard/profile",
        )


# ─── Volunteer endpoints ──────────────────────────────────────────────────────

@router.get("")
def list_applications(current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        vol = dict_row(db.execute(
            "SELECT id FROM volunteers WHERE user_id = ?", (current_user["id"],)
        ).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")

        apps = dict_rows(db.execute(
            "SELECT ea.*, e.name as event_name, e.date as event_date, e.time as event_time, "
            "e.location, e.description as event_description, e.acceptance_mode, "
            "o.name as org_name "
            "FROM event_applications ea "
            "JOIN events e ON ea.event_id = e.id "
            "JOIN organizations o ON ea.org_id = o.id "
            "WHERE ea.volunteer_id = ? AND ea.cancelled_at IS NULL "
            "ORDER BY ea.applied_date DESC",
            (vol["id"],),
        ).fetchall())
        return {"applications": apps}


@router.post("", status_code=201)
def apply_to_event(body: dict, current_user: dict = Depends(require_roles("volunteer"))):
    event_id = body.get("event_id")
    if not event_id:
        raise HTTPException(400, "event_id is required")

    # exclusive_db() issues BEGIN IMMEDIATE — prevents concurrent over-capacity approvals.
    with exclusive_db() as db:
        vol = dict_row(db.execute(
            "SELECT id FROM volunteers WHERE user_id = ?", (current_user["id"],)
        ).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")

        event = dict_row(db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone())
        if not event:
            raise HTTPException(404, "Event not found")

        # Student-only eligibility check
        org = dict_row(db.execute(
            "SELECT student_only FROM organizations WHERE id = ?", (event["org_id"],)
        ).fetchone())
        if org and org.get("student_only"):
            volunteer = dict_row(db.execute(
                "SELECT education_level FROM volunteers WHERE id = ?", (vol["id"],)
            ).fetchone())
            if not volunteer or volunteer.get("education_level") != "University Student":
                raise HTTPException(
                    403,
                    "Sorry, Enactus opportunities are only available for current university students.",
                )

        # Prevent duplicate active applications
        existing = dict_row(db.execute(
            "SELECT id FROM event_applications "
            "WHERE volunteer_id = ? AND event_id = ? AND cancelled_at IS NULL",
            (vol["id"], event_id),
        ).fetchone())
        if existing:
            raise HTTPException(409, "Already applied to this event")

        capacity = event.get("max_volunteers") or 0
        mode = event.get("acceptance_mode", "manual")

        if mode == "auto":
            # Re-read approved count inside the exclusive lock to prevent race conditions.
            approved_count = _get_approved_count(db, event_id)
            if capacity > 0 and approved_count >= capacity:
                raise HTTPException(409, "This event is full and no longer accepting applications")

            cur = db.execute(
                "INSERT INTO event_applications (volunteer_id, event_id, org_id, status) "
                "VALUES (?, ?, ?, 'Approved')",
                (vol["id"], event_id, event["org_id"]),
            )
            app_id = cur.lastrowid
            _sync_event_capacity(db, event_id)
            logger.info("[EVENT %d] Volunteer %d applied and auto-approved", event_id, vol["id"])
            log_action(db, current_user["id"], current_user["role"], "apply_event",
                       "event_application", app_id,
                       {"event_id": event_id, "volunteer_id": vol["id"], "mode": "auto", "status": "Approved"})

            create_notification(
                db,
                current_user["id"],
                "application_approved",
                "You're In!",
                f"You've been automatically accepted for '{event['name']}'. See you there!",
                "/dashboard/profile",
            )

            org_admin = dict_row(db.execute(
                "SELECT admin_user_id FROM organizations WHERE id = ?", (event["org_id"],)
            ).fetchone())
            vol_info = dict_row(db.execute("SELECT name FROM volunteers WHERE id = ?", (vol["id"],)).fetchone())
            vol_name = (vol_info or {}).get("name", "A volunteer")
            if org_admin and org_admin.get("admin_user_id"):
                create_notification(
                    db,
                    org_admin["admin_user_id"],
                    "event_application",
                    "Volunteer Auto-Accepted",
                    f"{vol_name} was automatically accepted for '{event['name']}'.",
                    "/org",
                )

            return {"message": "Application approved", "status": "Approved", "auto_accepted": True}

        else:
            # Manual mode — insert pending; no capacity risk, but share the lock for consistency.
            cur = db.execute(
                "INSERT INTO event_applications (volunteer_id, event_id, org_id, status) "
                "VALUES (?, ?, ?, 'Pending')",
                (vol["id"], event_id, event["org_id"]),
            )
            app_id = cur.lastrowid
            logger.info("[EVENT %d] Volunteer %d applied (manual mode, pending)", event_id, vol["id"])
            log_action(db, current_user["id"], current_user["role"], "apply_event",
                       "event_application", app_id,
                       {"event_id": event_id, "volunteer_id": vol["id"], "mode": "manual", "status": "Pending"})

            vol_info = dict_row(db.execute("SELECT name FROM volunteers WHERE id = ?", (vol["id"],)).fetchone())
            vol_name = (vol_info or {}).get("name", "A volunteer")
            org_admin = dict_row(db.execute(
                "SELECT admin_user_id FROM organizations WHERE id = ?", (event["org_id"],)
            ).fetchone())
            if org_admin and org_admin.get("admin_user_id"):
                create_notification(
                    db,
                    org_admin["admin_user_id"],
                    "event_application",
                    "New Event Application",
                    f"{vol_name} applied to join '{event['name']}'. Review pending applications.",
                    "/org",
                )

            return {"message": "Application submitted", "status": "Pending", "auto_accepted": False}


@router.delete("/{app_id}")
def cancel_application(app_id: int, current_user: dict = Depends(require_roles("volunteer"))):
    """Volunteer withdraws their own application. Frees a spot and atomically promotes the next waitlisted applicant."""
    # exclusive_db() ensures cancel + capacity sync + auto-promote are one atomic operation.
    with exclusive_db() as db:
        vol = dict_row(db.execute(
            "SELECT id FROM volunteers WHERE user_id = ?", (current_user["id"],)
        ).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")

        app = dict_row(db.execute(
            "SELECT ea.*, e.acceptance_mode, e.org_id as event_org_id "
            "FROM event_applications ea "
            "JOIN events e ON e.id = ea.event_id "
            "WHERE ea.id = ? AND ea.cancelled_at IS NULL",
            (app_id,),
        ).fetchone())
        if not app:
            raise HTTPException(404, "Application not found")
        if app["volunteer_id"] != vol["id"]:
            raise HTTPException(403, "You can only cancel your own applications")

        was_approved = app["status"] == "Approved"
        event_id = app["event_id"]

        db.execute(
            "UPDATE event_applications SET cancelled_at = datetime('now') WHERE id = ?",
            (app_id,),
        )
        logger.info("[EVENT %d] Volunteer %d cancelled application (was_approved=%s)", event_id, vol["id"], was_approved)
        log_action(db, current_user["id"], current_user["role"], "cancel_application",
                   "event_application", app_id,
                   {"event_id": event_id, "volunteer_id": vol["id"], "was_approved": was_approved})

        if was_approved:
            _sync_event_capacity(db, event_id)
            _auto_promote_next(db, event_id, app["event_org_id"])

        return {"message": "Application cancelled"}


# ─── Org-admin / supervisor endpoints ────────────────────────────────────────

@router.get("/org/{org_id}")
def list_org_applications(org_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        apps = dict_rows(db.execute(
            "SELECT ea.*, v.name as volunteer_name, v.email as volunteer_email, e.name as event_name "
            "FROM event_applications ea "
            "JOIN volunteers v ON ea.volunteer_id = v.id "
            "JOIN events e ON ea.event_id = e.id "
            "WHERE ea.org_id = ? AND ea.cancelled_at IS NULL "
            "ORDER BY ea.applied_date DESC",
            (org_id,),
        ).fetchall())
        return {"applications": apps}


@router.put("/{app_id}/approve")
def approve_application(app_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    # exclusive_db() prevents two simultaneous approvals from both passing the capacity check.
    with exclusive_db() as db:
        app = dict_row(db.execute(
            "SELECT ea.volunteer_id, ea.event_id, ea.status, "
            "e.name as event_name, e.max_volunteers, "
            "v.user_id "
            "FROM event_applications ea "
            "JOIN events e ON e.id = ea.event_id "
            "JOIN volunteers v ON v.id = ea.volunteer_id "
            "WHERE ea.id = ? AND ea.cancelled_at IS NULL",
            (app_id,),
        ).fetchone())
        if not app:
            raise HTTPException(404, "Application not found")
        if app["status"] == "Approved":
            raise HTTPException(400, "Application is already approved")

        # Re-read approved count inside the exclusive lock.
        capacity = app.get("max_volunteers") or 0
        if capacity > 0:
            approved_count = _get_approved_count(db, app["event_id"])
            if approved_count >= capacity:
                raise HTTPException(409, "Event is at full capacity — cannot approve more volunteers")

        db.execute("UPDATE event_applications SET status = 'Approved' WHERE id = ?", (app_id,))
        _sync_event_capacity(db, app["event_id"])
        logger.info("[EVENT %d] Volunteer %d manually approved", app["event_id"], app["volunteer_id"])
        log_action(db, current_user["id"], current_user["role"], "approve_application",
                   "event_application", app_id,
                   {"volunteer_id": app["volunteer_id"], "event_id": app["event_id"]})

        if app.get("user_id"):
            create_notification(
                db,
                app["user_id"],
                "application_approved",
                "Event Application Approved",
                f"You have been accepted for '{app.get('event_name', 'the event')}'. See you there!",
                "/dashboard/profile",
            )
        return {"message": "Application approved"}


@router.put("/{app_id}/reject")
def reject_application(app_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        app = dict_row(db.execute(
            "SELECT ea.volunteer_id, ea.event_id, ea.status, e.name as event_name, v.user_id "
            "FROM event_applications ea "
            "JOIN events e ON e.id = ea.event_id "
            "JOIN volunteers v ON v.id = ea.volunteer_id "
            "WHERE ea.id = ? AND ea.cancelled_at IS NULL",
            (app_id,),
        ).fetchone())
        if not app:
            raise HTTPException(404, "Application not found")

        db.execute("UPDATE event_applications SET status = 'Rejected' WHERE id = ?", (app_id,))
        log_action(db, current_user["id"], current_user["role"], "reject_application",
                   "event_application", app_id,
                   {"volunteer_id": app["volunteer_id"], "event_id": app["event_id"]})

        # Sync capacity in case an Approved application was rejected.
        if app.get("status") == "Approved":
            _sync_event_capacity(db, app["event_id"])

        if app.get("user_id"):
            create_notification(
                db,
                app["user_id"],
                "application_rejected",
                "Event Application Declined",
                f"Your application for '{app.get('event_name', 'the event')}' was not accepted.",
                "/dashboard/profile",
            )
        db.commit()
        return {"message": "Application rejected"}
