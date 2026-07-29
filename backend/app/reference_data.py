"""Idempotent provisioning for code-managed SysGrid reference options.

These rows are application invariants, not demo/domain data. A pristine tenant must
have them even when devices, services, monitors, and other operational tables are
intentionally empty.
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models.models import SettingOption


CODE_MANAGED_REFERENCE_OPTIONS: tuple[dict[str, object], ...] = (
    {"category": "MonitoringSeverity", "label": "Critical", "value": "Critical", "description": "Immediate operator attention is required."},
    {"category": "MonitoringSeverity", "label": "Warning", "value": "Warning", "description": "Degraded or at-risk behavior requires review."},
    {"category": "MonitoringSeverity", "label": "Info", "value": "Info", "description": "Informational monitoring signal."},
    {"category": "MonitoringOwnerRole", "label": "Primary Support", "value": "Primary Support", "description": "Primary operational owner."},
    {"category": "MonitoringOwnerRole", "label": "Escalation", "value": "Escalation", "description": "Escalation owner for unresolved events."},
    {"category": "MonitoringOwnerRole", "label": "Observer", "value": "Observer", "description": "Read-only monitoring stakeholder."},
    {"category": "MonitoringPlatform", "label": "Zabbix", "value": "Zabbix", "description": "Zabbix monitoring platform."},
    {"category": "MonitoringPlatform", "label": "Prometheus", "value": "Prometheus", "description": "Prometheus monitoring platform."},
    {"category": "MonitoringPlatform", "label": "Datadog", "value": "Datadog", "description": "Datadog monitoring platform."},
    {"category": "MonitoringCategory", "label": "Hardware", "value": "Hardware", "description": "Physical hardware and component monitoring."},
    {"category": "MonitoringCategory", "label": "Log", "value": "Log", "description": "Log-derived monitoring."},
    {"category": "MonitoringCategory", "label": "Network", "value": "Network", "description": "Network path and interface monitoring."},
    {"category": "MonitoringCategory", "label": "App", "value": "App", "description": "Application monitoring."},
    {"category": "MonitoringCategory", "label": "Synthetic", "value": "Synthetic", "description": "Synthetic transaction monitoring."},
    {"category": "NotificationMethod", "label": "Email", "value": "Email", "description": "Email notification delivery."},
    {"category": "NotificationMethod", "label": "Slack", "value": "Slack", "description": "Slack notification delivery."},
    {"category": "NotificationMethod", "label": "PagerDuty", "value": "PagerDuty", "description": "PagerDuty notification delivery."},
)


def required_reference_pairs(options: Iterable[dict[str, object]] = CODE_MANAGED_REFERENCE_OPTIONS) -> set[tuple[str, str]]:
    return {(str(option["category"]), str(option["value"])) for option in options}


def build_reference_plan(existing_rows: Iterable[object]) -> tuple[list[dict[str, object]], list[tuple[object, dict[str, object]]]]:
    existing = {(str(row.category), str(row.value)): row for row in existing_rows}
    creates: list[dict[str, object]] = []
    updates: list[tuple[object, dict[str, object]]] = []

    for definition in CODE_MANAGED_REFERENCE_OPTIONS:
        key = (str(definition["category"]), str(definition["value"]))
        row = existing.get(key)
        if row is None:
            creates.append(dict(definition))
            continue

        changes = {
            field: definition.get(field)
            for field in ("label", "description")
            if getattr(row, field) != definition.get(field)
        }
        if changes:
            updates.append((row, changes))

    return creates, updates


async def ensure_code_managed_reference_data(db: AsyncSession) -> dict[str, int]:
    categories = sorted({str(option["category"]) for option in CODE_MANAGED_REFERENCE_OPTIONS})
    result = await db.execute(select(SettingOption).where(SettingOption.category.in_(categories)))
    creates, updates = build_reference_plan(result.scalars().all())

    for definition in creates:
        db.add(SettingOption(**definition))
    for row, changes in updates:
        for field, value in changes.items():
            setattr(row, field, value)

    await db.commit()
    return {"created": len(creates), "updated": len(updates), "total": len(CODE_MANAGED_REFERENCE_OPTIONS)}


async def provision_default_database() -> dict[str, int]:
    from .database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        return await ensure_code_managed_reference_data(db)


def main() -> None:
    print(json.dumps(asyncio.run(provision_default_database()), sort_keys=True))


if __name__ == "__main__":
    main()
