import json
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
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                actor_id,
                actor_role,
                action,
                entity_type,
                entity_id,
                json.dumps(metadata, default=str) if metadata else None,
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
    current_user: dict = Depends(require_roles("org_admin")),
):
    with get_db() as db:
        clauses = ["1=1"]
        params: list = []
        if entity_type:
            clauses.append("entity_type = ?")
            params.append(entity_type)
        if entity_id is not None:
            clauses.append("entity_id = ?")
            params.append(entity_id)
        if actor_id is not None:
            clauses.append("actor_id = ?")
            params.append(actor_id)
        if action:
            clauses.append("action = ?")
            params.append(action)
        params.append(min(limit, 500))
        rows = dict_rows(db.execute(
            f"SELECT * FROM audit_logs WHERE {' AND '.join(clauses)} ORDER BY created_at DESC LIMIT ?",
            params,
        ).fetchall())
        return {"audit_logs": rows, "total": len(rows)}
