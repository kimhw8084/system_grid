from __future__ import annotations

from typing import Any, Mapping, Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import models


def validate_parent_chain(
    records: Mapping[int, Mapping[str, Any]],
    project_id: Optional[int],
    parent_project_id: Optional[int],
) -> None:
    """Pure hierarchy contract used by unit tests and the API validator.

    parent_project_id is the sole Project hierarchy link. A null parent explicitly
    means top-level. Assigning a parent must resolve to a live project and must not
    create a self/ancestor cycle.
    """
    if parent_project_id is None:
        return
    if project_id is not None and parent_project_id == project_id:
        raise ValueError("A project cannot be its own parent")

    seen: set[int] = set()
    current: Optional[int] = parent_project_id
    while current is not None:
        if current in seen:
            raise ValueError("Project hierarchy contains a cycle")
        seen.add(current)
        if project_id is not None and current == project_id:
            raise ValueError("Parent assignment would create a project cycle")
        record = records.get(current)
        if not record or bool(record.get("is_deleted")):
            raise LookupError("Parent project is unavailable")
        raw_parent = record.get("parent_project_id")
        current = int(raw_parent) if raw_parent is not None else None


async def validate_project_parent_assignment(
    db: AsyncSession,
    *,
    project_id: Optional[int],
    parent_project_id: Optional[int],
) -> None:
    if parent_project_id is None:
        return
    if project_id is not None and parent_project_id == project_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A project cannot be its own parent",
        )

    seen: set[int] = set()
    current: Optional[int] = parent_project_id
    while current is not None:
        if current in seen or (project_id is not None and current == project_id):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Parent assignment would create a project cycle",
            )
        seen.add(current)
        candidate = await db.get(models.Project, current)
        if candidate is None or bool(candidate.is_deleted):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Parent project is unavailable",
            )
        current = candidate.parent_project_id
