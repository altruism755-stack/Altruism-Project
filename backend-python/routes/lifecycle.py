"""
Centralized lifecycle computation — single source of truth for all role dashboards.

Every step definition (label, status, icon, tooltip, action_key) lives here.
action_key is a string token the frontend maps to an actual click handler,
keeping routing logic on the frontend while keeping all data decisions here.

HTTP endpoints expose role-specific lifecycle snapshots:
  GET /api/lifecycle/org        → org admin pipeline
  GET /api/lifecycle/supervisor → supervisor review pipeline

Volunteer lifecycle is embedded in GET /api/volunteers/{id}/org/{org_id}.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends

from database import get_db, dict_row
from auth import require_roles, get_org_for_admin

router = APIRouter(prefix="/api/lifecycle", tags=["lifecycle"])


# ── Step builder ─────────────────────────────────────────────────────────────

def _step(
    label: str,
    status: str,
    icon: Optional[str],
    tooltip: str,
    action_key: Optional[str] = None,
) -> dict:
    return {
        "label": label,
        "status": status,       # "done" | "active" | "pending"
        "icon": icon,
        "tooltip": tooltip,
        "action_key": action_key,
    }


# ── Volunteer lifecycle ───────────────────────────────────────────────────────

def compute_volunteer_lifecycle(
    member_status: str,
    activities: list,
    certificates: list,
) -> dict:
    """Full lifecycle for one (volunteer, org) pair. Called from volunteers.py.

    Hours are logged by supervisors — volunteers have no submission step.
    The journey is: Apply → Get Accepted → Supervisor Logs Hours → Certificate.
    """
    has_approved = any(a["status"] == "approved" for a in activities)
    has_any = len(activities) > 0
    has_cert = len(certificates) > 0
    is_member = member_status == "active"

    # Canonical state
    if not is_member:
        state = "APPLICATION_PENDING"
    elif not has_any:
        state = "APPLICATION_APPROVED"
    elif has_approved and not has_cert:
        state = "ACTIVITY_APPROVED"
    elif has_cert:
        state = "CERTIFICATE_ISSUED"
    else:
        state = "ACTIVITY_LOGGED"

    steps = [
        _step(
            "Applied", "done", "✓",
            "Your membership request was submitted.",
        ),
        _step(
            "Accepted" if is_member else "Awaiting Approval",
            "done" if is_member else "active",
            None if is_member else "⏳",
            "Your membership was approved." if is_member
            else "The org admin is reviewing your request.",
        ),
        _step(
            "Hours Recorded",
            "done" if has_any else ("active" if is_member else "pending"),
            "✅",
            "Your supervisor has recorded volunteer hours for you." if has_any
            else "Your supervisor will log your hours after each activity." if is_member
            else "Available after membership approval.",
        ),
        _step(
            "Certificate",
            "done" if has_cert else ("active" if has_approved else "pending"),
            "🏆",
            "Certificate earned — click to view." if has_cert
            else "The org can now issue your certificate." if has_approved
            else "Issued after your hours are recorded.",
            "view_certificates" if has_cert else None,
        ),
    ]

    stuck: dict[str, str] = {
        "APPLICATION_PENDING":  "Waiting for org admin to approve your membership.",
        "APPLICATION_APPROVED": "Your supervisor will record your hours after each activity.",
        "ACTIVITY_APPROVED":    "Hours recorded — org can now issue your certificate.",
    }

    next_actions: dict[str, str] = {
        "APPLICATION_PENDING":  "Wait for the organization to approve your membership.",
        "APPLICATION_APPROVED": "Participate in events — your supervisor will log your hours.",
        "ACTIVITY_LOGGED":      "Hours have been recorded. Awaiting certificate issuance.",
        "ACTIVITY_APPROVED":    "Your hours are approved. The org can now issue your certificate.",
        "CERTIFICATE_ISSUED":   "You have earned a certificate!",
    }

    blocking: dict[str, str] = {
        "APPLICATION_PENDING": "Membership pending admin review.",
    }

    current = next((s["label"] for s in steps if s["status"] == "active"), steps[-1]["label"])

    return {
        "steps": steps,
        "current_step": current,
        "state": state,
        "next_action": next_actions.get(state, ""),
        "blocking_reason": blocking.get(state),
        "stuck_msg": stuck.get(state),
    }


# ── Org admin lifecycle ───────────────────────────────────────────────────────

def compute_org_lifecycle(db, org_id: int) -> dict:
    """Aggregate pipeline lifecycle for an org admin."""
    pending_members = db.execute(
        "SELECT COUNT(*) c FROM org_volunteers WHERE org_id = %s AND status = 'pending'",
        (org_id,),
    ).fetchone()["c"]
    active_members = db.execute(
        "SELECT COUNT(*) c FROM org_volunteers WHERE org_id = %s AND status = 'active'",
        (org_id,),
    ).fetchone()["c"]
    pending_acts = db.execute(
        "SELECT COUNT(*) c FROM activities WHERE org_id = %s AND status = 'pending'",
        (org_id,),
    ).fetchone()["c"]
    total_hours = db.execute(
        "SELECT COALESCE(SUM(hours), 0) h FROM activities WHERE org_id = %s AND status = 'approved'",
        (org_id,),
    ).fetchone()["h"]

    has_hours = total_hours > 0 or pending_acts > 0

    steps = [
        _step(
            "Applications",
            "done" if active_members > 0 else ("active" if pending_members > 0 else "pending"),
            "📋",
            f"{pending_members} pending · {active_members} approved",
            "goto_volunteers",
        ),
        _step(
            "Members Active",
            "done" if active_members > 0 else ("active" if pending_members > 0 else "pending"),
            "👥",
            f"{active_members} active members",
            "goto_volunteers",
        ),
        _step(
            "Hours Submitted",
            "active" if pending_acts > 0
            else ("done" if has_hours else ("active" if active_members > 0 else "pending")),
            "⏱",
            f"{pending_acts} submissions awaiting review" if pending_acts > 0
            else "No pending submissions",
            "goto_activities",
        ),
        _step(
            "Hours Reviewed",
            "done" if (pending_acts == 0 and total_hours > 0)
            else ("active" if pending_acts > 0 else "pending"),
            "✅",
            f"{int(total_hours)} total hours approved",
            "goto_activities",
        ),
        _step(
            "Certificates",
            "active" if (pending_acts == 0 and total_hours > 0) else "pending",
            "🏆",
            "Issue certificates after approving volunteer hours",
            "goto_activities",
        ),
    ]

    if pending_members > 0:
        stuck: Optional[str] = (
            f"{pending_members} volunteer{'s' if pending_members > 1 else ''} waiting for your approval."
        )
    elif pending_acts > 0:
        stuck = f"{pending_acts} submission{'s' if pending_acts > 1 else ''} need your review."
    elif active_members == 0:
        stuck = "No active members yet — approve volunteer requests to get started."
    else:
        stuck = None

    current = next((s["label"] for s in steps if s["status"] == "active"), steps[-1]["label"])

    return {
        "steps": steps,
        "current_step": current,
        "state": "ORG_PIPELINE",
        "pending_members": pending_members,
        "active_members": active_members,
        "pending_activities": pending_acts,
        "total_hours": total_hours,
        "stuck_msg": stuck,
    }


# ── Supervisor lifecycle ──────────────────────────────────────────────────────

def compute_supervisor_lifecycle(events_count: int, pending_activities_count: int) -> dict:
    """Event-management lifecycle for a supervisor."""
    steps = [
        _step(
            "Create Event",
            "done" if events_count > 0 else "active",
            "📅",
            f"{events_count} event{'s' if events_count != 1 else ''} created"
            if events_count > 0
            else "Create your first event to get started",
            "create_event",
        ),
        _step(
            "Volunteers Join",
            "done" if (events_count > 0 and pending_activities_count >= 0) else "pending",
            "👥",
            "Volunteers in your org can browse and join your events",
        ),
        _step(
            "Mark Attendance",
            "done" if pending_activities_count > 0 else ("active" if events_count > 0 else "pending"),
            "✅",
            f"{pending_activities_count} attendance record{'s' if pending_activities_count != 1 else ''} awaiting review"
            if pending_activities_count > 0
            else "Record attendance after each event",
            "goto_activities",
        ),
        _step(
            "Approve Hours",
            "active" if pending_activities_count > 0 else "pending",
            "⏱",
            f"{pending_activities_count} pending — approve or reject below"
            if pending_activities_count > 0
            else "No pending submissions",
        ),
        _step(
            "Issue Certificate",
            "active" if (pending_activities_count == 0 and events_count > 0) else "pending",
            "🏆",
            "Issue via '+ Certificate' alongside each activity approval",
        ),
    ]

    if pending_activities_count > 0:
        stuck: Optional[str] = (
            f"{pending_activities_count} submission"
            f"{'s' if pending_activities_count != 1 else ''} waiting for your review."
        )
    elif events_count == 0:
        stuck = "No events yet — create your first event."
    else:
        stuck = None

    current = next((s["label"] for s in steps if s["status"] == "active"), steps[-1]["label"])

    return {
        "steps": steps,
        "current_step": current,
        "state": "SUPERVISOR_PIPELINE",
        "events_count": events_count,
        "pending_activities": pending_activities_count,
        "stuck_msg": stuck,
    }


# ── HTTP endpoints ────────────────────────────────────────────────────────────

@router.get("/org")
def get_org_lifecycle(current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = get_org_for_admin(db, current_user["id"])
        return {"lifecycle": compute_org_lifecycle(db, org["id"])}


@router.get("/supervisor")
def get_supervisor_lifecycle(current_user: dict = Depends(require_roles("supervisor"))):
    with get_db() as db:
        sup = dict_row(db.execute(
            "SELECT id, org_id FROM supervisors WHERE user_id = %s", (current_user["id"],)
        ).fetchone())
        if not sup:
            raise HTTPException(404, "Supervisor not found")
        events_count = db.execute(
            "SELECT COUNT(*) c FROM events WHERE org_id = %s AND created_by_supervisor_id = %s",
            (sup["org_id"], sup["id"]),
        ).fetchone()["c"]
        pending_acts = db.execute(
            "SELECT COUNT(*) c FROM activities a "
            "JOIN events e ON e.id = a.event_id AND e.created_by_supervisor_id = %s "
            "WHERE a.org_id = %s AND a.status = 'pending'",
            (sup["id"], sup["org_id"]),
        ).fetchone()["c"]
        return {"lifecycle": compute_supervisor_lifecycle(events_count, pending_acts)}
