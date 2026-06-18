import pytest
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.settings import ensure_tenant_admin_async
from app.database import ConfigSessionLocal, get_tenant_engine
from app.models import models
from app.models.config import Tenant


async def _ensure_admin(seeded_admin_tenant, setup_db):
    tenant_id = seeded_admin_tenant["tenant_id"]
    async with setup_db[1]() as config_db:
        tenant = (await config_db.execute(select(Tenant).filter(Tenant.id == tenant_id))).scalar_one()
    await ensure_tenant_admin_async(
        tenant_db_url=tenant.db_url,
        admin_user="admin_root",
        full_name="Admin Root",
        email="admin_root@test.com",
        department="IT",
    )


async def _tenant_session_factory(seeded_admin_tenant, setup_db):
    tenant_id = seeded_admin_tenant["tenant_id"]
    async with setup_db[1]() as config_db:
        tenant = (await config_db.execute(select(Tenant).filter(Tenant.id == tenant_id))).scalar_one()
    tenant_engine = get_tenant_engine(tenant.db_url)
    return async_sessionmaker(bind=tenant_engine, autoflush=False, expire_on_commit=False, class_=AsyncSession)


@pytest.mark.anyio
async def test_monitoring_restore_history_handles_missing_owner_and_noop_restore(seeded_admin_tenant, setup_db):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    await _ensure_admin(seeded_admin_tenant, setup_db)

    team_res = await client.post("/api/v1/settings/teams", json={"name": "Restore Ops"}, headers=headers)
    assert team_res.status_code == 200, team_res.text
    operator_res = await client.post(
        "/api/v1/settings/operators",
        json={
            "external_id": "restore-op-001",
            "username": "restore.op",
            "full_name": "Restore Operator",
            "email": "restore@example.com",
            "department": "Ops",
            "team": "Restore Ops",
        },
        headers=headers,
    )
    assert operator_res.status_code == 200, operator_res.text
    operator = operator_res.json()

    device_res = await client.post(
        "/api/v1/devices",
        json={
            "name": "RESTORE-MON-HOST",
            "system": "RESTORE-SYS",
            "status": "Active",
            "type": "Physical",
            "serial_number": "RESTORE-SN",
            "asset_tag": "RESTORE-AT",
        },
        headers=headers,
    )
    assert device_res.status_code == 200, device_res.text
    device = device_res.json()

    knowledge_res = await client.post(
        "/api/v1/knowledge",
        json={"title": "Restore KB", "category": "Runbook", "content": "Recover", "status": "Draft"},
        headers=headers,
    )
    assert knowledge_res.status_code == 200, knowledge_res.text
    knowledge = knowledge_res.json()

    create_res = await client.post(
        "/api/v1/monitoring",
        json={
            "device_id": device["id"],
            "category": "Hardware",
            "status": "Existing",
            "title": "RESTORE-MONITOR",
            "platform": "Zabbix",
            "severity": "Critical",
            "owner_team": "Restore Ops",
            "recovery_docs": [knowledge["id"]],
            "owners": [{"operator_id": operator["id"], "role": "Primary Support"}],
        },
        headers=headers,
    )
    assert create_res.status_code == 200, create_res.text
    monitor = create_res.json()

    update_res = await client.put(
        f"/api/v1/monitoring/{monitor['id']}",
        json={"severity": "Info", "owners": []},
        headers=headers,
    )
    assert update_res.status_code == 200, update_res.text

    history_res = await client.get(f"/api/v1/monitoring/{monitor['id']}/history", headers=headers)
    assert history_res.status_code == 200, history_res.text
    history = history_res.json()
    assert history[0]["version"] == 2
    restore_target = next(entry for entry in history if entry["version"] == 1)

    tenant_session_factory = await _tenant_session_factory(seeded_admin_tenant, setup_db)
    async with tenant_session_factory() as tenant_db:
        await tenant_db.execute(delete(models.Operator).where(models.Operator.id == operator["id"]))
        await tenant_db.commit()

    restore_res = await client.post(
        f"/api/v1/monitoring/{monitor['id']}/restore/{restore_target['id']}",
        headers=headers,
    )
    assert restore_res.status_code == 200, restore_res.text
    restored = restore_res.json()
    assert restored["severity"] == "Critical"

    async with tenant_session_factory() as tenant_db:
        restored_owner_rows = (
            await tenant_db.execute(
                select(models.MonitoringOwner).where(models.MonitoringOwner.monitoring_item_id == monitor["id"])
            )
        ).scalars().all()
    assert len(restored_owner_rows) == 1
    assert restored_owner_rows[0].operator_id is None
    assert restored_owner_rows[0].external_id == operator["external_id"]

    noop_restore = await client.post(
        f"/api/v1/monitoring/{monitor['id']}/restore/{restore_target['id']}",
        headers=headers,
    )
    assert noop_restore.status_code == 200, noop_restore.text
    assert noop_restore.json()["id"] == monitor["id"]

    missing_history = await client.post(f"/api/v1/monitoring/{monitor['id']}/restore/999999", headers=headers)
    assert missing_history.status_code == 404
