import os
from pathlib import Path

import pytest


@pytest.mark.anyio
async def test_create_tenant_grants_selected_admin_access_and_returns_serializable_payload(client, monkeypatch, tmp_path):
    storage_root = tmp_path / "tenant-storage"
    storage_root.mkdir(parents=True, exist_ok=True)

    monkeypatch.setenv("DEFAULT_USER_ID", "haewon.kim")
    monkeypatch.setenv("USER_ID_ENV_VAR", "AccessKey")
    monkeypatch.setenv("AccessKey", "haewon.kim")

    settings_res = await client.post("/api/v1/tenants/admin/settings", json={
        "key": "tenant_storage_root",
        "value": str(storage_root),
        "description": "test storage root",
    })
    assert settings_res.status_code == 200, settings_res.text

    create_res = await client.post("/api/v1/tenants/admin/create", json={"name": "Factory Test Tenant"})
    assert create_res.status_code == 200, create_res.text
    payload = create_res.json()

    assert payload["name"] == "Factory Test Tenant"
    assert payload["is_active"] is True
    assert payload["is_online"] is True
    assert payload["db_url"].startswith("sqlite+aiosqlite:///")
    assert payload["created_at"]

    tenants_res = await client.get("/api/v1/tenants/me")
    assert tenants_res.status_code == 200, tenants_res.text
    tenants = tenants_res.json()
    assert len(tenants) == 1
    assert tenants[0]["name"] == "Factory Test Tenant"
    assert tenants[0]["role"] == "ADMIN"
    assert tenants[0]["is_selected"] is True


@pytest.mark.anyio
async def test_attach_tenant_registers_existing_db_and_selects_it_for_request_user(client, monkeypatch, tmp_path):
    storage_root = tmp_path / "attach-storage"
    storage_root.mkdir(parents=True, exist_ok=True)
    db_path = storage_root / "existing_attach.db"
    db_path.touch()

    monkeypatch.setenv("DEFAULT_USER_ID", "haewon.kim")
    monkeypatch.setenv("USER_ID_ENV_VAR", "AccessKey")
    monkeypatch.setenv("AccessKey", "haewon.kim")

    settings_res = await client.post("/api/v1/tenants/admin/settings", json={
        "key": "tenant_storage_root",
        "value": str(storage_root),
        "description": "attach storage root",
    })
    assert settings_res.status_code == 200, settings_res.text

    attach_res = await client.post("/api/v1/tenants/admin/attach", json={
        "name": "Attached Tenant",
        "db_path": str(db_path),
    })
    assert attach_res.status_code == 200, attach_res.text
    payload = attach_res.json()
    assert payload["name"] == "Attached Tenant"
    assert payload["is_online"] is True

    tenants_res = await client.get("/api/v1/tenants/me")
    assert tenants_res.status_code == 200, tenants_res.text
    tenants = tenants_res.json()
    assert len(tenants) == 1
    assert tenants[0]["name"] == "Attached Tenant"
    assert tenants[0]["is_selected"] is True


@pytest.mark.anyio
async def test_select_tenant_switches_selection_without_validation_errors(client, monkeypatch, tmp_path):
    storage_root = tmp_path / "select-storage"
    storage_root.mkdir(parents=True, exist_ok=True)

    monkeypatch.setenv("DEFAULT_USER_ID", "haewon.kim")
    monkeypatch.setenv("USER_ID_ENV_VAR", "AccessKey")
    monkeypatch.setenv("AccessKey", "haewon.kim")

    settings_res = await client.post("/api/v1/tenants/admin/settings", json={
        "key": "tenant_storage_root",
        "value": str(storage_root),
        "description": "select storage root",
    })
    assert settings_res.status_code == 200, settings_res.text

    create_one = await client.post("/api/v1/tenants/admin/create", json={"name": "Tenant One"})
    assert create_one.status_code == 200, create_one.text
    first = create_one.json()

    create_two = await client.post("/api/v1/tenants/admin/create", json={"name": "Tenant Two"})
    assert create_two.status_code == 200, create_two.text
    second = create_two.json()

    select_res = await client.post("/api/v1/tenants/select", json={"tenant_id": first["id"]})
    assert select_res.status_code == 200, select_res.text
    assert select_res.json()["tenant_id"] == first["id"]

    tenants_res = await client.get("/api/v1/tenants/me")
    assert tenants_res.status_code == 200, tenants_res.text
    tenants = sorted(tenants_res.json(), key=lambda item: item["id"])
    assert tenants[0]["is_selected"] is True
    assert tenants[1]["is_selected"] is False
    assert {tenant["name"] for tenant in tenants} == {"Tenant One", "Tenant Two"}

