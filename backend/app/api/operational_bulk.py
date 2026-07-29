from __future__ import annotations

from typing import Any, Iterable

from fastapi import HTTPException

MAX_OPERATIONAL_BULK_RECORDS = 250


def normalize_operational_bulk_ids(raw_ids: Any) -> list[int]:
    if not isinstance(raw_ids, list):
        raise HTTPException(status_code=400, detail="Bulk ids must be an array")

    normalized: list[int] = []
    seen: set[int] = set()
    for raw_id in raw_ids:
        if isinstance(raw_id, bool):
            raise HTTPException(status_code=400, detail="Bulk ids must contain positive integers")
        try:
            value = int(raw_id)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Bulk ids must contain positive integers")
        if value <= 0:
            raise HTTPException(status_code=400, detail="Bulk ids must contain positive integers")
        if value not in seen:
            seen.add(value)
            normalized.append(value)

    if not normalized:
        raise HTTPException(status_code=400, detail="Select at least one record")
    if len(normalized) > MAX_OPERATIONAL_BULK_RECORDS:
        raise HTTPException(
            status_code=400,
            detail=f"Bulk operations are limited to {MAX_OPERATIONAL_BULK_RECORDS} records",
        )
    return normalized


def normalize_operational_bulk_payload(raw_payload: Any) -> dict[str, Any]:
    if raw_payload is None:
        return {}
    if not isinstance(raw_payload, dict):
        raise HTTPException(status_code=400, detail="Bulk payload must be an object")
    return raw_payload


def build_operational_bulk_summary(
    *,
    action: str,
    selected_ids: list[int],
    matched_ids: Iterable[int],
    changed_ids: Iterable[int],
    unchanged_ids: Iterable[int],
    blockers: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    matched = list(dict.fromkeys(int(value) for value in matched_ids))
    changed = list(dict.fromkeys(int(value) for value in changed_ids))
    unchanged = list(dict.fromkeys(int(value) for value in unchanged_ids))
    matched_set = set(matched)
    missing = [value for value in selected_ids if value not in matched_set]
    blocked = blockers or []
    return {
        "action": action,
        "selected_count": len(selected_ids),
        "matched_count": len(matched),
        "changed_count": len(changed),
        "unchanged_count": len(unchanged),
        "blocked_count": len(blocked),
        "missing_count": len(missing),
        "changed_ids": changed,
        "unchanged_ids": unchanged,
        "missing_ids": missing,
        "blockers": blocked,
        "can_execute": bool(changed) and not missing and not blocked,
    }


def require_executable_operational_bulk(summary: dict[str, Any]) -> None:
    if summary.get("missing_ids") or summary.get("blockers"):
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Bulk selection changed or contains blocked records. Review the latest preview.",
                "preview": summary,
            },
        )
