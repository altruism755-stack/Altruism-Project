import logging
from typing import Optional

from fastapi import APIRouter, Depends
from database import get_db, dict_rows
from auth import require_roles

router = APIRouter(prefix="/api/audit-logs", tags=["audit"])
logger = logging.getLogger(__name__)


def log_action(
    db,
    actor_id: Optional[int],
    actor_role: Optional[str],
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    metadata: Optional[dict] = None,
) -> None:
    """Write one immutable audit record inside the caller's transaction. Never raises."""
    try:
        db.execute(
            "INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, metadata) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (
                actor_id,
                actor_role,
                action,
                entity_type,
                entity_id,
                metadata,  # psycopg3 serialises dict → JSONB natively
            ),
        )
    except Exception as exc:
        logger.error(
            "audit log failed action=%s entity=%s/%s: %s",
            action, entity_type, entity_id, exc,
        )


@router.get("")
def list_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    actor_id: Optional[int] = None,
    action: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: dict = Depends(require_roles("org_admin")),
):
    with get_db() as db:
        # Resolve the caller's org — supports both admin_user_id and org_admins table.
        org = dict_row(db.execute(
            """
            SELECT id FROM organizations WHERE admin_user_id = %s
            UNION
            SELECT o.id FROM organizations o
            JOIN org_admins oa ON oa.org_id = o.id
            WHERE oa.user_id = %s AND o.status = 'approved'
            LIMIT 1
            """,
            (current_user["id"], current_user["id"]),
        ).fetchone())
        if not org:
            raise HTTPException(403, "Organization not found")
        org_id = org["id"]

        # Scope: only logs where the actor belongs to this org, or the entity is
        # an event/activity/application/certificate owned by this org.
        clauses = [
            """(
                actor_id IN (
                    SELECT user_id FROM supervisors WHERE org_id = %s
                    UNION SELECT admin_user_id FROM organizations WHERE id = %s
                    UNION SELECT user_id FROM org_admins WHERE org_id = %s
                )
                OR (entity_type = 'event'        AND entity_id IN (SELECT id FROM events WHERE org_id = %s))
                OR (entity_type = 'activity'     AND entity_id IN (SELECT id FROM activities WHERE org_id = %s))
                OR (entity_type = 'certificate'  AND entity_id IN (SELECT id FROM certificates WHERE org_id = %s))
                OR (entity_type = 'event_application' AND entity_id IN (SELECT ea.id FROM event_applications ea JOIN events ev ON ev.id = ea.event_id WHERE ev.org_id = %s))
            )"""
        ]
        params: list = [org_id, org_id, org_id, org_id, org_id, org_id, org_id]

        if entity_type:
            clauses.append("entity_type = %s")
            params.append(entity_type)
        if entity_id is not None:
            clauses.append("entity_id = %s")
            params.append(entity_id)
        if actor_id is not None:
            clauses.append("actor_id = %s")
            params.append(actor_id)
        if action:
            clauses.append("action = %s")
            params.append(action)

        params += [min(limit, 500), max(offset, 0)]
        rows = dict_rows(db.execute(
            f"SELECT * FROM audit_logs WHERE {' AND '.join(clauses)} ORDER BY created_at DESC LIMIT %s OFFSET %s",
            params,
        ).fetchall())
        return {"audit_logs": rows, "total": len(rows), "limit": min(limit, 500), "offset": offset}
