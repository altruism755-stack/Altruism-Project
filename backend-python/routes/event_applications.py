from fastapi import APIRouter, HTTPException, Depends, Query
import logging

from database import get_db, exclusive_db, dict_row, dict_rows
from auth import get_current_user, require_roles, get_org_for_admin
from routes.notifications import create_notification
from routes.audit import log_action

router = APIRouter(prefix="/api/event-applications", tags=["event_applications"])
logger = logging.getLogger(__name__)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_approved_count(db, event_id: int) -> int:
    """Count active approved applications for capacity decisions. Always computed, never cached."""
    row = db.execute(
        "SELECT COUNT(*) as cnt FROM event_applications "
        "WHERE event_id = %s AND status = 'Approved' AND cancelled_at IS NULL",
        (event_id,),
    ).fetchone()
    return row["cnt"] if row else 0


def _sync_current_volunteers(db, event_id: int) -> None:
    """Keep current_volunteers in sync with live approved count. No is_full flag."""
    approved = _get_approved_count(db, event_id)
    db.execute(
        "UPDATE events SET current_volunteers = %s WHERE id = %s",
        (approved, event_id),
    )


def _auto_promote_next(db, event_id: int) -> None:
    """
    FIFO waitlist promotion for auto-accept events.
    Promotes the oldest Waitlisted applicant when a spot opens.
    Must run inside exclusive_db() to be atomic.
    """
    event = dict_row(db.execute(
        "SELECT max_volunteers, acceptance_mode FROM events WHERE id = %s", (event_id,)
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
        "WHERE ea.event_id = %s AND ea.status = 'Waitlisted' AND ea.cancelled_at IS NULL "
        "ORDER BY ea.applied_date ASC LIMIT 1",
        (event_id,),
    ).fetchone())
    if not next_app:
        return

    db.execute(
        "UPDATE event_applications SET status = 'Approved' WHERE id = %s",
        (next_app["id"],),
    )
    _sync_current_volunteers(db, event_id)
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


def _notify_org_slot_opened(db, event_id: int, org_id: int) -> None:
    """
    Notify the org admin that a slot has opened on a manual-approval event
    so they can review the waitlist and choose who to promote.
    """
    waitlist_count = db.execute(
        "SELECT COUNT(*) as cnt FROM event_applications "
        "WHERE event_id = %s AND status = 'Waitlisted' AND cancelled_at IS NULL",
        (event_id,),
    ).fetchone()
    count = waitlist_count["cnt"] if waitlist_count else 0
    if count == 0:
        return  # No one waiting — nothing to notify about.

    event = dict_row(db.execute("SELECT name FROM events WHERE id = %s", (event_id,)).fetchone())
    org_admin = dict_row(db.execute(
        "SELECT admin_user_id FROM organizations WHERE id = %s", (org_id,)
    ).fetchone())
    if org_admin and org_admin.get("admin_user_id"):
        create_notification(
            db, org_admin["admin_user_id"], "event_application",
            "Spot Available — Review Waitlist",
            f"A spot opened up for '{(event or {}).get('name', 'an event')}'. "
            f"There {'is' if count == 1 else 'are'} {count} volunteer{'s' if count != 1 else ''} "
            "on the waitlist. Choose who to promote.",
            "/org",
        )


# ─── Volunteer endpoints ──────────────────────────────────────────────────────

@router.get("")
def list_applications(current_user: dict = Depends(get_current_user)):
    with get_db() as db:
        vol = dict_row(db.execute(
            "SELECT id FROM volunteers WHERE user_id = %s", (current_user["id"],)
        ).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")

        apps = dict_rows(db.execute(
            "SELECT ea.*, e.name as event_name, e.date as event_date, e.time as event_time, "
            "e.location, e.description as event_description, e.acceptance_mode, e.status as event_status, "
            "o.name as org_name "
            "FROM event_applications ea "
            "JOIN events e ON ea.event_id = e.id "
            "JOIN organizations o ON ea.org_id = o.id "
            "WHERE ea.volunteer_id = %s AND ea.cancelled_at IS NULL "
            "ORDER BY ea.applied_date DESC",
            (vol["id"],),
        ).fetchall())
        return {"applications": apps}


@router.post("", status_code=201)
def apply_to_event(body: dict, current_user: dict = Depends(require_roles("volunteer"))):
    event_id = body.get("event_id")
    if not event_id:
        raise HTTPException(400, "event_id is required")

    # exclusive_db() issues a SERIALIZABLE transaction — prevents concurrent over-capacity approvals.
    with exclusive_db() as db:
        vol = dict_row(db.execute(
            "SELECT id FROM volunteers WHERE user_id = %s", (current_user["id"],)
        ).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")

        event = dict_row(db.execute("SELECT * FROM events WHERE id = %s", (event_id,)).fetchone())
        if not event:
            raise HTTPException(404, "Event not found")

        # Applications only allowed when event is Upcoming.
        if event.get("status") != "Upcoming":
            raise HTTPException(409, "Applications are only accepted for upcoming events")

        # Student-only eligibility check
        org = dict_row(db.execute(
            "SELECT student_only FROM organizations WHERE id = %s", (event["org_id"],)
        ).fetchone())
        if org and org.get("student_only"):
            volunteer = dict_row(db.execute(
                "SELECT education_level FROM volunteers WHERE id = %s", (vol["id"],)
            ).fetchone())
            if not volunteer or volunteer.get("education_level") != "University Student":
                raise HTTPException(
                    403,
                    "Sorry, Enactus opportunities are only available for current university students.",
                )

        # Prevent duplicate active applications
        existing = dict_row(db.execute(
            "SELECT id FROM event_applications "
            "WHERE volunteer_id = %s AND event_id = %s AND cancelled_at IS NULL",
            (vol["id"], event_id),
        ).fetchone())
        if existing:
            raise HTTPException(409, "Already applied to this event")

        capacity = event.get("max_volunteers") or 0
        mode = event.get("acceptance_mode", "manual")

        if mode == "auto":
            # Re-read approved count inside the exclusive lock to prevent race conditions.
            approved_count = _get_approved_count(db, event_id)
            is_full = capacity > 0 and approved_count >= capacity

            if is_full:
                row = db.execute(
                    "INSERT INTO event_applications (volunteer_id, event_id, org_id, status) "
                    "VALUES (%s, %s, %s, 'Waitlisted') RETURNING id",
                    (vol["id"], event_id, event["org_id"]),
                ).fetchone()
                app_id = row["id"]
                logger.info("[EVENT %d] Volunteer %d placed on waitlist (event full)", event_id, vol["id"])
                log_action(db, current_user["id"], current_user["role"], "apply_event",
                           "event_application", app_id,
                           {"event_id": event_id, "volunteer_id": vol["id"], "mode": "auto", "status": "Waitlisted"})
                create_notification(
                    db, current_user["id"], "application_pending",
                    "You're on the Waitlist",
                    f"'{event['name']}' is currently full. You'll be notified automatically if a spot opens up.",
                    "/dashboard/profile",
                )
                return {"message": "Event is full — added to waitlist", "status": "Waitlisted", "auto_accepted": False}

            else:
                row = db.execute(
                    "INSERT INTO event_applications (volunteer_id, event_id, org_id, status) "
                    "VALUES (%s, %s, %s, 'Approved') RETURNING id",
                    (vol["id"], event_id, event["org_id"]),
                ).fetchone()
                app_id = row["id"]
                _sync_current_volunteers(db, event_id)
                logger.info("[EVENT %d] Volunteer %d applied and auto-approved", event_id, vol["id"])
                log_action(db, current_user["id"], current_user["role"], "apply_event",
                           "event_application", app_id,
                           {"event_id": event_id, "volunteer_id": vol["id"], "mode": "auto", "status": "Approved"})

                create_notification(
                    db, current_user["id"], "application_approved",
                    "You're In!",
                    f"You've been automatically accepted for '{event['name']}'. See you there!",
                    "/dashboard/profile",
                )

                org_admin = dict_row(db.execute(
                    "SELECT admin_user_id FROM organizations WHERE id = %s", (event["org_id"],)
                ).fetchone())
                vol_info = dict_row(db.execute("SELECT name FROM volunteers WHERE id = %s", (vol["id"],)).fetchone())
                vol_name = (vol_info or {}).get("name", "A volunteer")
                if org_admin and org_admin.get("admin_user_id"):
                    create_notification(
                        db, org_admin["admin_user_id"], "event_application",
                        "Volunteer Auto-Accepted",
                        f"{vol_name} was automatically accepted for '{event['name']}'.",
                        "/org",
                    )

                return {"message": "Application approved", "status": "Approved", "auto_accepted": True}

        else:
            # Manual mode: check capacity to decide whether to queue as Pending or Waitlisted.
            approved_count = _get_approved_count(db, event_id)
            is_full = capacity > 0 and approved_count >= capacity
            initial_status = "Waitlisted" if is_full else "Pending"

            row = db.execute(
                "INSERT INTO event_applications (volunteer_id, event_id, org_id, status) "
                "VALUES (%s, %s, %s, %s) RETURNING id",
                (vol["id"], event_id, event["org_id"], initial_status),
            ).fetchone()
            app_id = row["id"]
            logger.info("[EVENT %d] Volunteer %d applied (manual mode, status=%s)", event_id, vol["id"], initial_status)
            log_action(db, current_user["id"], current_user["role"], "apply_event",
                       "event_application", app_id,
                       {"event_id": event_id, "volunteer_id": vol["id"], "mode": "manual", "status": initial_status})

            vol_info = dict_row(db.execute("SELECT name FROM volunteers WHERE id = %s", (vol["id"],)).fetchone())
            vol_name = (vol_info or {}).get("name", "A volunteer")
            org_admin = dict_row(db.execute(
                "SELECT admin_user_id FROM organizations WHERE id = %s", (event["org_id"],)
            ).fetchone())
            if org_admin and org_admin.get("admin_user_id"):
                if is_full:
                    create_notification(
                        db, org_admin["admin_user_id"], "event_application",
                        "New Waitlist Entry",
                        f"{vol_name} joined the waitlist for '{event['name']}' (event is full). "
                        "You can promote them manually if a spot opens.",
                        "/org",
                    )
                else:
                    create_notification(
                        db, org_admin["admin_user_id"], "event_application",
                        "New Event Application",
                        f"{vol_name} applied to join '{event['name']}'. Review pending applications.",
                        "/org",
                    )

            if is_full:
                return {"message": "Event is full — added to waitlist for manual review", "status": "Waitlisted", "auto_accepted": False}
            return {"message": "Application submitted", "status": "Pending", "auto_accepted": False}


@router.delete("/{app_id}")
def cancel_application(app_id: int, current_user: dict = Depends(require_roles("volunteer"))):
    """
    Volunteer withdraws their own application.
    - auto mode: if the volunteer was Approved, the next Waitlisted applicant is promoted automatically (FIFO).
    - manual mode: no automatic promotion. The org admin sees the freed slot and chooses who to promote.
    """
    with exclusive_db() as db:
        vol = dict_row(db.execute(
            "SELECT id FROM volunteers WHERE user_id = %s", (current_user["id"],)
        ).fetchone())
        if not vol:
            raise HTTPException(404, "Volunteer not found")

        app = dict_row(db.execute(
            "SELECT ea.*, e.acceptance_mode, e.org_id as event_org_id, e.status as event_status "
            "FROM event_applications ea "
            "JOIN events e ON e.id = ea.event_id "
            "WHERE ea.id = %s AND ea.cancelled_at IS NULL",
            (app_id,),
        ).fetchone())
        if not app:
            raise HTTPException(404, "Application not found")
        if app["volunteer_id"] != vol["id"]:
            raise HTTPException(403, "You can only cancel your own applications")

        # Prevent cancellation if the event is already Active or Completed.
        if app.get("event_status") in ("Active", "Completed"):
            raise HTTPException(409, "Cannot cancel an application for an event that is already active or completed")

        was_approved = app["status"] == "Approved"
        event_id = app["event_id"]

        db.execute(
            "UPDATE event_applications SET cancelled_at = NOW() WHERE id = %s",
            (app_id,),
        )
        logger.info("[EVENT %d] Volunteer %d cancelled application (was_approved=%s)", event_id, vol["id"], was_approved)
        log_action(db, current_user["id"], current_user["role"], "cancel_application",
                   "event_application", app_id,
                   {"event_id": event_id, "volunteer_id": vol["id"], "was_approved": was_approved})

        if was_approved:
            _sync_current_volunteers(db, event_id)
            # Auto-promote only for auto-accept events. Manual events leave the freed slot
            # visible to the org admin who decides which waitlisted volunteer to promote.
            if app.get("acceptance_mode") == "auto":
                _auto_promote_next(db, event_id)
            else:
                _notify_org_slot_opened(db, event_id, app["event_org_id"])

        return {"message": "Application cancelled"}


# ─── Org-admin / supervisor endpoints ────────────────────────────────────────
# IMPORTANT: static-segment routes (/org/..., /event/...) must be registered
# before the dynamic /{app_id}/... routes so FastAPI does not try to coerce
# "org" or "event" into an integer and 422 before reaching the correct handler.

@router.get("/org/{org_id}")
def list_org_applications(
    org_id: int,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(require_roles("org_admin")),
):
    with get_db() as db:
        apps = dict_rows(db.execute(
            "SELECT ea.*, v.name as volunteer_name, v.email as volunteer_email, "
            "e.name as event_name, e.status as event_status, e.acceptance_mode "
            "FROM event_applications ea "
            "JOIN volunteers v ON ea.volunteer_id = v.id "
            "JOIN events e ON ea.event_id = e.id "
            "WHERE ea.org_id = %s AND ea.cancelled_at IS NULL "
            "ORDER BY ea.applied_date DESC LIMIT %s OFFSET %s",
            (org_id, limit, offset),
        ).fetchall())
        return {"applications": apps, "limit": limit, "offset": offset}


@router.get("/event/{event_id}/waitlist")
def list_waitlist(event_id: int, current_user: dict = Depends(require_roles("org_admin", "supervisor"))):
    """
    Return the ordered waitlist for a manual-approval event.
    Ordered by applied_date ASC (FIFO) so the org can see who has been waiting longest.
    Only relevant for manual-approval events — auto events promote automatically.
    """
    with get_db() as db:
        event = dict_row(db.execute(
            "SELECT id, org_id, name, acceptance_mode FROM events WHERE id = %s", (event_id,)
        ).fetchone())
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
            org = get_org_for_admin(db, current_user["id"])
            if org["id"] != event["org_id"]:
                raise HTTPException(403, "You do not have permission to access this resource")

        waitlist = dict_rows(db.execute(
            "SELECT ea.id, ea.volunteer_id, ea.applied_date, ea.status, "
            "v.name as volunteer_name, v.email as volunteer_email "
            "FROM event_applications ea "
            "JOIN volunteers v ON ea.volunteer_id = v.id "
            "WHERE ea.event_id = %s AND ea.status = 'Waitlisted' AND ea.cancelled_at IS NULL "
            "ORDER BY ea.applied_date ASC",
            (event_id,),
        ).fetchall())

        return {
            "event_id": event_id,
            "event_name": event["name"],
            "acceptance_mode": event["acceptance_mode"],
            "waitlist": waitlist,
        }


@router.put("/{app_id}/approve")
def approve_application(app_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    # exclusive_db() prevents two simultaneous approvals from both passing the capacity check.
    with exclusive_db() as db:
        app = dict_row(db.execute(
            "SELECT ea.volunteer_id, ea.event_id, ea.status, "
            "e.name as event_name, e.max_volunteers, e.status as event_status, "
            "v.user_id "
            "FROM event_applications ea "
            "JOIN events e ON e.id = ea.event_id "
            "JOIN volunteers v ON v.id = ea.volunteer_id "
            "WHERE ea.id = %s AND ea.cancelled_at IS NULL",
            (app_id,),
        ).fetchone())
        if not app:
            raise HTTPException(404, "Application not found")
        if app["status"] == "Approved":
            raise HTTPException(400, "Application is already approved")

        # Only approve for Upcoming events.
        if app.get("event_status") != "Upcoming":
            raise HTTPException(409, "Can only approve applications for upcoming events")

        # Enforce capacity inside the exclusive lock.
        capacity = app.get("max_volunteers") or 0
        if capacity > 0:
            approved_count = _get_approved_count(db, app["event_id"])
            if approved_count >= capacity:
                raise HTTPException(409, "Event is at full capacity — cannot approve more volunteers")

        db.execute("UPDATE event_applications SET status = 'Approved' WHERE id = %s", (app_id,))
        _sync_current_volunteers(db, app["event_id"])
        logger.info("[EVENT %d] Volunteer %d manually approved", app["event_id"], app["volunteer_id"])
        log_action(db, current_user["id"], current_user["role"], "approve_application",
                   "event_application", app_id,
                   {"volunteer_id": app["volunteer_id"], "event_id": app["event_id"]})

        if app.get("user_id"):
            create_notification(
                db, app["user_id"], "application_approved",
                "Event Application Approved",
                f"You have been accepted for '{app.get('event_name', 'the event')}'. See you there!",
                "/dashboard/profile",
            )
        return {"message": "Application approved"}


@router.put("/{app_id}/promote")
def promote_waitlisted(app_id: int, current_user: dict = Depends(require_roles("org_admin", "supervisor"))):
    """
    Org admin or supervisor manually promotes a Waitlisted volunteer to Pending (for review)
    on a manual-approval event. This is intentionally a two-step action:
      1. Promote → Pending  (org decided this person is worth reviewing)
      2. Approve → Approved (final confirmation, capacity checked)
    This preserves the full approval audit trail.
    Only valid for manual-approval events — auto events promote automatically on cancellation.
    """
    with exclusive_db() as db:
        app = dict_row(db.execute(
            "SELECT ea.volunteer_id, ea.event_id, ea.status, "
            "e.name as event_name, e.max_volunteers, e.status as event_status, "
            "e.acceptance_mode, e.org_id as event_org_id, "
            "v.user_id "
            "FROM event_applications ea "
            "JOIN events e ON e.id = ea.event_id "
            "JOIN volunteers v ON v.id = ea.volunteer_id "
            "WHERE ea.id = %s AND ea.cancelled_at IS NULL",
            (app_id,),
        ).fetchone())
        if not app:
            raise HTTPException(404, "Application not found")

        # Scope check.
        if current_user["role"] == "supervisor":
            sup = dict_row(db.execute(
                "SELECT id, org_id FROM supervisors WHERE user_id = %s", (current_user["id"],)
            ).fetchone())
            if not sup or sup["org_id"] != app["event_org_id"]:
                raise HTTPException(403, "You do not have permission to access this resource")
        else:
            org = get_org_for_admin(db, current_user["id"])
            if org["id"] != app["event_org_id"]:
                raise HTTPException(403, "You do not have permission to access this resource")

        if app["acceptance_mode"] != "manual":
            raise HTTPException(
                409,
                "This event uses automatic acceptance. Waitlist promotion is handled automatically.",
            )
        if app["status"] != "Waitlisted":
            raise HTTPException(400, f"Application is '{app['status']}', not Waitlisted")
        if app["event_status"] != "Upcoming":
            raise HTTPException(409, "Can only promote waitlisted volunteers for upcoming events")

        db.execute("UPDATE event_applications SET status = 'Pending' WHERE id = %s", (app_id,))
        logger.info("[EVENT %d] Volunteer %d promoted from waitlist to Pending by %s",
                    app["event_id"], app["volunteer_id"], current_user["role"])
        log_action(db, current_user["id"], current_user["role"], "promote_waitlist",
                   "event_application", app_id,
                   {"volunteer_id": app["volunteer_id"], "event_id": app["event_id"]})

        if app.get("user_id"):
            create_notification(
                db, app["user_id"], "application_pending",
                "Waitlist Update — Under Review",
                f"Your waitlisted application for '{app.get('event_name', 'the event')}' is now under review. "
                "You'll be notified of the final decision soon.",
                "/dashboard/profile",
            )

        return {"message": "Volunteer promoted from waitlist to pending review"}


@router.put("/{app_id}/reject")
def reject_application(app_id: int, current_user: dict = Depends(require_roles("org_admin"))):
    with exclusive_db() as db:
        app = dict_row(db.execute(
            "SELECT ea.volunteer_id, ea.event_id, ea.status, e.name as event_name, "
            "e.acceptance_mode, e.org_id as event_org_id, v.user_id "
            "FROM event_applications ea "
            "JOIN events e ON e.id = ea.event_id "
            "JOIN volunteers v ON v.id = ea.volunteer_id "
            "WHERE ea.id = %s AND ea.cancelled_at IS NULL",
            (app_id,),
        ).fetchone())
        if not app:
            raise HTTPException(404, "Application not found")
        if app["status"] == "Rejected":
            raise HTTPException(400, "Application is already rejected")

        was_approved = app["status"] == "Approved"
        db.execute("UPDATE event_applications SET status = 'Rejected' WHERE id = %s", (app_id,))
        log_action(db, current_user["id"], current_user["role"], "reject_application",
                   "event_application", app_id,
                   {"volunteer_id": app["volunteer_id"], "event_id": app["event_id"]})

        # If an Approved application is rejected, free the spot and fill it.
        if was_approved:
            _sync_current_volunteers(db, app["event_id"])
            if app.get("acceptance_mode") == "auto":
                _auto_promote_next(db, app["event_id"])
            else:
                _notify_org_slot_opened(db, app["event_id"], app["event_org_id"])

        if app.get("user_id"):
            create_notification(
                db, app["user_id"], "application_rejected",
                "Event Application Declined",
                f"Your application for '{app.get('event_name', 'the event')}' was not accepted.",
                "/dashboard/profile",
            )
        return {"message": "Application rejected"}
