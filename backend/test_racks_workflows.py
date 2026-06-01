import pytest


async def create_site(client, name: str):
    response = await client.post("/api/v1/sites", json={"name": name, "address": "QA"})
    assert response.status_code == 200, response.text
    return response.json()


async def create_rack(client, site_id: int, name: str):
    response = await client.post("/api/v1/racks", json={
        "site_id": site_id,
        "name": name,
        "aisle": "A",
        "row": "1",
        "total_u": 12,
        "max_power_kw": 10.0,
    })
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.anyio
async def test_rack_bulk_relocate_reports_conflicts(client):
    source_site = await create_site(client, "RACK-SRC")
    target_site = await create_site(client, "RACK-TGT")

    rack_conflict = await create_rack(client, source_site["id"], "RACK-CONFLICT")
    rack_unique = await create_rack(client, source_site["id"], "RACK-UNIQUE")
    await create_rack(client, target_site["id"], "RACK-CONFLICT")

    response = await client.post("/api/v1/racks/bulk-action", json={
        "action": "relocate",
        "ids": [rack_conflict["id"], rack_unique["id"]],
        "payload": {"new_site_id": target_site["id"]},
    })
    assert response.status_code == 200, response.text

    data = response.json()
    assert sorted(data["relocated"]) == [rack_unique["id"]]
    assert data["conflicts"] == [rack_conflict["id"]]


@pytest.mark.anyio
async def test_rack_bulk_restore_reports_conflicts(client):
    source_site = await create_site(client, "RESTORE-SRC")
    target_site = await create_site(client, "RESTORE-TGT")

    rack_deleted = await create_rack(client, source_site["id"], "RESTORE-CONFLICT")
    rack_ok = await create_rack(client, source_site["id"], "RESTORE-OK")
    await create_rack(client, target_site["id"], "RESTORE-CONFLICT")

    delete_response = await client.post("/api/v1/racks/bulk-action", json={
        "action": "delete",
        "ids": [rack_deleted["id"], rack_ok["id"]],
    })
    assert delete_response.status_code == 200, delete_response.text

    restore_response = await client.post("/api/v1/racks/bulk-action", json={
        "action": "restore",
        "ids": [rack_deleted["id"], rack_ok["id"]],
        "payload": {"new_site_id": target_site["id"]},
    })
    assert restore_response.status_code == 200, restore_response.text

    data = restore_response.json()
    assert sorted(data["restored"]) == [rack_ok["id"]]
    assert data["conflicts"] == [rack_deleted["id"]]
