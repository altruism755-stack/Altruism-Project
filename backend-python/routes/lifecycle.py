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
from auth import require_roles

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
    """Full lifecycle for one (volunteer, org) pair. Called from volunteers.py."""
    has_pending = any(a["status"] == "Pending" for a in activities)
    has_approved = any(a["status"] == "Approved" for a in activities)
    has_any = len(activities) > 0
    has_cert = len(certificates) > 0
    is_member = member_status == "Active"
    pending_count = sum(1 for a in activities if a["status"] == "Pending")

    # Canonical state
    if not is_member:
        state = "APPLICATION_PENDING"
    elif not has_any:
        state = "APPLICATION_APPROVED"
    elif has_pending:
        state = "ACTIVITY_UNDER_REVIEW"
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
            "Log Hours",
            "done" if has_any else ("active" if is_member else "pending"),
            "⏱",
            "Hours submitted." if has_any
            else "Click to log volunteer hours." if is_member
            else "Available after membership approval.",
            "log_hours" if is_member and not has_any else None,
        ),
        _step(
            "Hours Approved",
            "done" if has_approved else ("active" if has_any else "pending"),
            "✅",
            "Your hours have been approved." if has_approved
            else f"{pending_count} submission(s) under review — click to view." if has_any
            else "Submit hours first.",
            "view_pending" if has_any and not has_approved else None,
        ),
        _step(
            "Certificate",
            "done" if has_cert else ("active" if has_approved else "pending"),
            "🏆",
            "Certificate earned — click to view." if has_cert
            else "The org can now issue your certificate." if has_approved
            else "Earned after hours are approved.",
            "view_certificates" if has_cert else None,
        ),
    ]

    stuck: dict[str, str] = {
        "APPLICATION_PENDING":   "Waiting for org admin to approve your membership.",
        "APPLICATION_APPROVED":  "Log your volunteer hours to advance.",
        "ACTIVITY_UNDER_REVIEW": f"{pending_count} submission(s) under review by your supervisor.",
        "ACTIVITY_APPROVED":     "Hours approved — org can now issue your certificate.",
    }

    next_actions: dict[str, str] = {
        "APPLICATION_PENDING":   "Wait for the organization to approve your membership.",
        "APPLICATION_APPROVED":  "Log your volunteer hours to continue.",
        "ACTIVITY_UNDER_REVIEW": f"{pending_count} submission(s) under review by your supervisor.",
        "ACTIVITY_APPROVED":     "Your hours are approved. The org can now issue your certificate.",
        "CERTIFICATE_ISSUED":    "You have earned a certificate!",
        "ACTIVITY_LOGGED":       "Log new hours or wait for your submissions to be reviewed.",
    }

    blocking: dict[str, str] = {
        "APPLICATION_PENDING":   "Membership pending admin review.",
        "ACTIVITY_UNDER_REVIEW": "Waiting for supervisor approval.",
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
        "SELECT COUNT(*) c FROM org_volunteers WHERE org_id = ? AND status = 'Pending'",
        (org_id,),
    ).fetchone()["c"]
    active_members = db.execute(
        "SELECT COUNT(*) c FROM org_volunteers WHERE org_id = ? AND status = 'Active'",
        (org_id,),
    ).fetchone()["c"]
    pending_acts = db.execute(
        "SELECT COUNT(*) c FROM activities WHERE org_id = ? AND status = 'Pending'",
        (org_id,),
    ).fetchone()["c"]
    total_hours = db.execute(
        "SELECT COALESCE(SUM(hours), 0) h FROM activities WHERE org_id = ? AND status = 'Approved'",
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

def compute_supervisor_lifecycle(volunteers_count: int, pending_activities_count: int) -> dict:
    """Review-pipeline lifecycle for a supervisor."""
    steps = [
        _step(
            "Volunteers Joined",
            "done" if volunteers_count > 0 else "pending",
            "👥",
            f"{volunteers_count} active volunteer{'s' if volunteers_count != 1 else ''} in your team",
            "goto_volunteers",
        ),
        _step(
            "Hours Logged",
            "done" if pending_activities_count > 0
            else ("active" if volunteers_count > 0 else "pending"),
            "⏱",
            f"{pending_activities_count} submission{'s' if pending_activities_count != 1 else ''} ready for review"
            if pending_activities_count > 0
            else "Waiting for volunteers to submit hours",
        ),
        _step(
            "Under Review",
            "active" if pending_activities_count > 0 else "pending",
            "🔍",
            f"{pending_activities_count} pending — approve or reject below"
            if pending_activities_count > 0
            else "No pending submissions",
        ),
        _step(
            "Approved",
            "done" if (pending_activities_count == 0 and volunteers_count > 0) else "pending",
            "✅",
            "Hours approved and recorded",
        ),
        _step(
            "Certificate",
            "active" if (pending_activities_count == 0 and volunteers_count > 0) else "pending",
            "🏆",
            "Issue via '+ Certificate' alongside each activity approval",
        ),
    ]

    if pending_activities_count > 0:
        stuck: Optional[str] = (
            f"{pending_activities_count} submission"
            f"{'s' if pending_activities_count != 1 else ''} waiting for your review."
        )
    elif volunteers_count == 0:
        stuck = "No volunteers assigned yet — accept pending requests first."
    else:
        stuck = None

    current = next((s["label"] for s in steps if s["status"] == "active"), steps[-1]["label"])

    return {
        "steps": steps,
        "current_step": current,
        "state": "SUPERVISOR_PIPELINE",
        "volunteers_count": volunteers_count,
        "pending_activities": pending_activities_count,
        "stuck_msg": stuck,
    }


# ── HTTP endpoints ────────────────────────────────────────────────────────────

@router.get("/org")
def get_org_lifecycle(current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")
        return {"lifecycle": compute_org_lifecycle(db, org["id"])}


@router.get("/supervisor")
def get_supervisor_lifecycle(current_user: dict = Depends(require_roles("supervisor"))):
    with get_db() as db:
        sup = dict_row(db.execute(
            "SELECT id, org_id FROM supervisors WHERE user_id = ?", (current_user["id"],)
        ).fetchone())
        if not sup:
            raise HTTPException(404, "Supervisor not found")
        volunteers_count = db.execute(
            "SELECT COUNT(*) c FROM org_volunteers WHERE org_id = ? AND status = 'Active'",
            (sup["org_id"],),
        ).fetchone()["c"]
        pending_acts = db.execute(
            "SELECT COUNT(*) c FROM activities WHERE org_id = ? AND status = 'Pending'",
            (sup["org_id"],),
        ).fetchone()["c"]
        return {"lifecycle": compute_supervisor_lifecycle(volunteers_count, pending_acts)}
