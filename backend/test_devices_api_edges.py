import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.settings import ensure_tenant_admin_async
from app.database import ConfigSessionLocal, get_tenant_engine
from app.models import models
from app.models.config import Tenant


async def _ensure_admin(seeded_admin_tenant):
    tenant_id = seeded_admin_tenant["tenant_id"]
    async with ConfigSessionLocal() as config_db:
        tenant_res = await config_db.execute(select(Tenant).filter(Tenant.id == tenant_id))
        tenant = tenant_res.scalar_one()
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


async def _create_site(client, headers: dict, name: str):
    res = await client.post("/api/v1/sites", json={"name": name, "address": "QA"}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


async def _create_rack(client, headers: dict, site_id: int, name: str):
    res = await client.post(
        "/api/v1/racks",
        json={"site_id": site_id, "name": name, "aisle": "A", "row": "1", "total_u": 12, "max_power_kw": 8},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    return res.json()


async def _create_device(client, headers: dict, **overrides):
    payload = {
        "name": "DEVICE-EDGE",
        "system": "EDGE-SYS",
        "status": "Active",
        "type": "Physical",
        "serial_number": "EDGE-SN",
        "asset_tag": "EDGE-AT",
    }
    payload.update(overrides)
    res = await client.post("/api/v1/devices", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


@pytest.mark.anyio
async def test_devices_enrichment_summary_and_interfaces(seeded_admin_tenant, setup_db):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    await _ensure_admin(seeded_admin_tenant)

    site = await _create_site(client, headers, "DEVICE-SITE")
    rack = await _create_rack(client, headers, site["id"], "DEVICE-RACK")
    device = await _create_device(
        client,
        headers,
        name="EDGE-HOST",
        os_name="Ubuntu",
        os_version="24.04",
        environment="Production",
        owner="Platform",
        vendor="Dell",
        size_u=2,
    )
    peer = await _create_device(
        client,
        headers,
        name="EDGE-PEER",
        system="PEER-SYS",
        serial_number="PEER-SN",
        asset_tag="PEER-AT",
    )

    mount_res = await client.post(
        f"/api/v1/racks/{rack['id']}/mount",
        json={"device_id": device["id"], "start_u": 3, "size_u": 2, "orientation": "Back", "depth": "Half"},
        headers=headers,
    )
    assert mount_res.status_code == 200, mount_res.text

    tenant_session_factory = await _tenant_session_factory(seeded_admin_tenant, setup_db)
    async with tenant_session_factory() as tenant_db:
        tenant_db.add_all(
            [
                models.NetworkInterface(
                    device_id=device["id"],
                    name="eth0",
                    mac_address="AA:AA:AA:AA:AA:01",
                    ip_address="10.0.0.10",
                    vlan_id=101,
                    link_speed_gbps=25,
                ),
                models.NetworkInterface(
                    device_id=peer["id"],
                    name="eth9",
                    mac_address="AA:AA:AA:AA:AA:09",
                    ip_address="10.0.0.11",
                    vlan_id=101,
                    link_speed_gbps=25,
                ),
                models.HardwareComponent(device_id=device["id"], category="CPU", name="CPU", count=2),
                models.HardwareComponent(device_id=device["id"], category="Memory", name="MEM", count=8),
                models.HardwareComponent(device_id=device["id"], category="Disk", name="DSK", count=4),
                models.IncidentLog(
                    title="Open Incident",
                    status="Investigating",
                    impacted_device_ids=[device["id"]],
                ),
                models.PortConnection(
                    source_device_id=device["id"],
                    source_port="eth0",
                    source_ip="10.0.0.10",
                    source_mac="AA:AA:AA:AA:AA:01",
                    source_vlan=101,
                    target_device_id=peer["id"],
                    target_port="eth9",
                    target_ip="10.0.0.11",
                    target_mac="AA:AA:AA:AA:AA:09",
                    target_vlan=101,
                    link_type="Fiber",
                    purpose="Uplink",
                    speed_gbps=25,
                    unit="Gbps",
                    direction="Bidirectional",
                    status="Active",
                ),
            ]
        )
        await tenant_db.commit()

    devices_res = await client.get("/api/v1/devices", headers=headers)
    assert devices_res.status_code == 200, devices_res.text
    loaded = next(item for item in devices_res.json() if item["id"] == device["id"])
    assert loaded["hardware_summary"] == "2x CPU / 8x MEM / 4x DSK"
    assert loaded["open_incident_count"] == 1
    assert loaded["rack_name"] == "DEVICE-RACK"
    assert loaded["site_name"] == "DEVICE-SITE"
    assert loaded["u_start"] == 3
    assert loaded["mount_orientation"] == "Back"
    assert loaded["mount_depth"] == "Half"
    assert loaded["all_ips"] == ["10.0.0.10"]
    assert any(service["service_type"] == "OS" and service["name"] == "Ubuntu" for service in loaded["logical_services"])

    summary_res = await client.get("/api/v1/devices/summary?system=EDGE-SYS&limit=5&offset=0", headers=headers)
    assert summary_res.status_code == 200, summary_res.text
    assert [item["id"] for item in summary_res.json()] == [device["id"]]

    interfaces_res = await client.get(f"/api/v1/devices/{device['id']}/interfaces", headers=headers)
    assert interfaces_res.status_code == 200, interfaces_res.text
    iface = interfaces_res.json()[0]
    assert iface["name"] == "eth0"
    assert iface["connection"]["peer_device_name"] == "EDGE-PEER"
    assert iface["connection"]["peer_port"] == "eth9"
    assert iface["connection"]["local_vlan"] == 101
    assert iface["connection"]["status"] == "Connected"


@pytest.mark.anyio
async def test_devices_create_update_and_bulk_actions(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    await _ensure_admin(seeded_admin_tenant)

    missing_name = await client.post("/api/v1/devices", json={"system": "ONLY-SYS"}, headers=headers)
    assert missing_name.status_code == 400

    device = await _create_device(
        client,
        headers,
        name="BULK-HOST",
        os_name="Rocky",
        os_version="9.3",
        serial_number="BULK-SN-1",
        asset_tag="BULK-AT-1",
        purchase_date="2025-01-01T00:00:00Z",
        install_date="2025-02-01T00:00:00",
    )
    duplicate = await client.post(
        "/api/v1/devices",
        json={"name": "bulk-host", "system": "OTHER", "serial_number": "BULK-SN-2", "asset_tag": "BULK-AT-2"},
        headers=headers,
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "DUPLICATE_HOSTNAME"

    other = await _create_device(
        client,
        headers,
        name="OTHER-HOST",
        system="OTHER-SYS",
        serial_number="OTHER-SN",
        asset_tag="OTHER-AT",
    )

    dup_update = await client.put(f"/api/v1/devices/{other['id']}", json={"name": "bulk-host"}, headers=headers)
    assert dup_update.status_code == 409

    update_res = await client.put(
        f"/api/v1/devices/{device['id']}",
        json={"metadata_json": "{\"owner\":\"json\"}", "os_version": "9.4", "owner": "Operations"},
        headers=headers,
    )
    assert update_res.status_code == 200, update_res.text
    assert update_res.json()["metadata_json"] == {"owner": "json"}

    list_after = await client.get("/api/v1/devices", headers=headers)
    assert list_after.status_code == 200
    updated = next(item for item in list_after.json() if item["id"] == device["id"])
    assert updated["owner"] == "Operations"
    assert any(service["service_type"] == "OS" and service["name"] == "Rocky" for service in updated["logical_services"])

    no_op = await client.post("/api/v1/devices/bulk-action", json={"ids": [], "action": "delete"}, headers=headers)
    assert no_op.status_code == 200
    assert no_op.json()["status"] == "no_op"

    bulk_update = await client.post(
        "/api/v1/devices/bulk-action",
        json={"ids": [device["id"]], "action": "update", "payload": {"owner": "SRE"}},
        headers=headers,
    )
    assert bulk_update.status_code == 200

    bulk_delete = await client.post("/api/v1/devices/bulk-action", json={"ids": [device["id"]], "action": "delete"}, headers=headers)
    assert bulk_delete.status_code == 200

    replacement = await _create_device(
        client,
        headers,
        name="BULK-HOST",
        system="EDGE-SYS-2",
        serial_number="BULK-SN-3",
        asset_tag="BULK-AT-3",
    )

    restore_conflict = await client.post("/api/v1/devices/bulk-action", json={"ids": [device["id"]], "action": "restore"}, headers=headers)
    assert restore_conflict.status_code == 200
    assert restore_conflict.json()["conflicts"] == [device["id"]]

    purge = await client.post("/api/v1/devices/bulk-action", json={"ids": [device["id"]], "action": "purge"}, headers=headers)
    assert purge.status_code == 200

    delete_single = await client.delete(f"/api/v1/devices/{replacement['id']}", headers=headers)
    assert delete_single.status_code == 200

    include_deleted = await client.get("/api/v1/devices?include_deleted=true", headers=headers)
    assert include_deleted.status_code == 200
    ids = {item["id"] for item in include_deleted.json()}
    assert device["id"] not in ids
    assert replacement["id"] in ids


@pytest.mark.anyio
async def test_device_subresources_and_resource_routes(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    await _ensure_admin(seeded_admin_tenant)

    device = await _create_device(client, headers, name="RESOURCE-HOST", serial_number="RES-SN", asset_tag="RES-AT")
    peer = await _create_device(client, headers, name="RESOURCE-PEER", system="RES-SYS-2", serial_number="RES2-SN", asset_tag="RES2-AT")

    empty_hw = await client.post(f"/api/v1/devices/{device['id']}/hardware", json={}, headers=headers)
    assert empty_hw.status_code == 400
    valid_hw = await client.post(
        f"/api/v1/devices/{device['id']}/hardware",
        json={"category": "CPU", "name": "Xeon", "count": 2},
        headers=headers,
    )
    assert valid_hw.status_code == 200, valid_hw.text
    hw = valid_hw.json()

    hw_list = await client.get(f"/api/v1/devices/{device['id']}/hardware", headers=headers)
    assert hw_list.status_code == 200
    assert any(item["id"] == hw["id"] for item in hw_list.json())

    hw_update = await client.put(f"/api/v1/devices/hardware/{hw['id']}", json={"count": 4}, headers=headers)
    assert hw_update.status_code == 200
    assert hw_update.json()["count"] == 4

    missing_secret = await client.post(f"/api/v1/devices/{device['id']}/secrets", json={}, headers=headers)
    assert missing_secret.status_code == 400
    valid_secret = await client.post(
        f"/api/v1/devices/{device['id']}/secrets",
        json={"secret_type": "Password", "username": "root", "encrypted_payload": "cipher"},
        headers=headers,
    )
    assert valid_secret.status_code == 200, valid_secret.text
    secret = valid_secret.json()

    secrets_list = await client.get(f"/api/v1/devices/{device['id']}/secrets", headers=headers)
    assert secrets_list.status_code == 200
    assert any(item["id"] == secret["id"] for item in secrets_list.json())

    secret_update = await client.put(f"/api/v1/devices/secrets/{secret['id']}", json={"notes": "rotated"}, headers=headers)
    assert secret_update.status_code == 200
    assert secret_update.json()["notes"] == "rotated"

    missing_target = await client.post(f"/api/v1/devices/{device['id']}/relationships", json={}, headers=headers)
    assert missing_target.status_code == 400
    self_link = await client.post(f"/api/v1/devices/{device['id']}/relationships", json={"target_device_id": device["id"]}, headers=headers)
    assert self_link.status_code == 400

    rel_create = await client.post(
        f"/api/v1/devices/{device['id']}/relationships",
        json={"target_device_id": peer["id"], "relationship_type": "DependsOn", "notes": "critical"},
        headers=headers,
    )
    assert rel_create.status_code == 200, rel_create.text
    rel = rel_create.json()

    rel_list = await client.get(f"/api/v1/devices/{device['id']}/relationships", headers=headers)
    assert rel_list.status_code == 200
    assert any(item["id"] == rel["id"] for item in rel_list.json())

    rel_all = await client.get("/api/v1/devices/relationships/all", headers=headers)
    assert rel_all.status_code == 200
    assert any(item["id"] == rel["id"] for item in rel_all.json())

    rel_update = await client.put(f"/api/v1/devices/relationships/{rel['id']}", json={"notes": "updated"}, headers=headers)
    assert rel_update.status_code == 200
    assert rel_update.json()["notes"] == "updated"

    bad_resource_delete = await client.delete("/api/v1/devices/unknown/1", headers=headers)
    assert bad_resource_delete.status_code == 400
    bad_resource_update = await client.put("/api/v1/devices/unknown/1", json={"x": 1}, headers=headers)
    assert bad_resource_update.status_code == 400

    delete_rel = await client.delete(f"/api/v1/devices/relationships/{rel['id']}", headers=headers)
    assert delete_rel.status_code == 200
    delete_secret = await client.delete(f"/api/v1/devices/secrets/{secret['id']}", headers=headers)
    assert delete_secret.status_code == 200
    delete_hw = await client.delete(f"/api/v1/devices/hardware/{hw['id']}", headers=headers)
    assert delete_hw.status_code == 200


@pytest.mark.anyio
async def test_devices_bulk_purge_with_far_mode_assets(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    headers = {"X-User-Id": "admin_root", "X-Tenant-Id": str(tenant_id)}
    await _ensure_admin(seeded_admin_tenant)

    # 1. Create asset (device)
    device = await _create_device(
        client,
        headers,
        name="FAR-PURGE-ASSET-01",
        system="FAR-PURGE-SYS",
        serial_number="FAR-PURGE-SN",
        asset_tag="FAR-PURGE-AT",
    )

    # 2. Create FAR failure mode associated with this asset
    mode_res = await client.post(
        "/api/v1/far/modes",
        json={
            "system_name": "FAR-PURGE-SYS",
            "title": "FAR-PURGE-MODE-01",
            "effect": "Purge testing with far_mode_assets",
            "severity": 5,
            "occurrence": 3,
            "detection": 2,
            "affected_assets": [device["id"]],
        },
        headers=headers,
    )
    assert mode_res.status_code == 200, mode_res.text
    mode = mode_res.json()
    assert device["id"] in [asset["id"] for asset in mode["affected_assets"]]

    # 3. Call bulk-action purge
    purge_res = await client.post(
        "/api/v1/devices/bulk-action",
        json={"ids": [device["id"]], "action": "purge"},
        headers=headers,
    )
    assert purge_res.status_code == 200, purge_res.text
    assert purge_res.json()["status"] == "success"
    assert purge_res.json()["count"] == 1

    # 4. Verify the asset is completely gone from devices
    include_deleted = await client.get("/api/v1/devices?include_deleted=true", headers=headers)
    assert include_deleted.status_code == 200
    ids = {item["id"] for item in include_deleted.json()}
    assert device["id"] not in ids

    # 5. Verify the FAR failure mode still exists but no longer has the purged asset
    modes_res = await client.get("/api/v1/far/modes", headers=headers)
    assert modes_res.status_code == 200
    refreshed_mode = next(item for item in modes_res.json() if item["id"] == mode["id"])
    assert device["id"] not in [asset["id"] for asset in refreshed_mode["affected_assets"]]

