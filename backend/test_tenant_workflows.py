import os
from pathlib import Path
import sqlite3

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

    create_res = await client.post("/api/v1/tenants/admin/create", json={"name": f"Factory Test Tenant {tmp_path.name}"})
    assert create_res.status_code == 200, create_res.text
    payload = create_res.json()

    assert payload["name"] == f"Factory Test Tenant {tmp_path.name}"
    assert payload["is_active"] is True
    assert payload["is_online"] is True
    assert payload["db_url"].startswith("sqlite+aiosqlite:///")
    assert payload["created_at"]

    tenants_res = await client.get("/api/v1/tenants/me")
    assert tenants_res.status_code == 200, tenants_res.text
    tenants = tenants_res.json()
    assert len(tenants) == 1
    assert tenants[0]["name"] == f"Factory Test Tenant {tmp_path.name}"
    assert tenants[0]["role"] == "ADMIN"
    assert tenants[0]["is_selected"] is True


@pytest.mark.anyio
async def test_create_tenant_accepts_custom_parent_folder_and_db_name(client, monkeypatch, tmp_path):
    storage_root = tmp_path / "tenant-root"
    storage_root.mkdir(parents=True, exist_ok=True)
    custom_parent = storage_root / "custom-parent"

    monkeypatch.setenv("DEFAULT_USER_ID", "haewon.kim")
    monkeypatch.setenv("USER_ID_ENV_VAR", "AccessKey")
    monkeypatch.setenv("AccessKey", "haewon.kim")

    settings_res = await client.post("/api/v1/tenants/admin/settings", json={
        "key": "tenant_storage_root",
        "value": str(storage_root),
        "description": "custom storage root",
    })
    assert settings_res.status_code == 200, settings_res.text

    create_res = await client.post("/api/v1/tenants/admin/create", json={
        "name": f"Custom Folder Tenant {tmp_path.name}",
        "db_name": "fab_cluster_primary",
        "parent_folder": str(custom_parent),
    })
    assert create_res.status_code == 200, create_res.text
    payload = create_res.json()
    assert payload["db_url"].endswith("/custom-parent/fab_cluster_primary.db")
    assert custom_parent.exists() is True


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
        "name": f"Attached Tenant {tmp_path.name}",
        "db_path": str(db_path),
    })
    assert attach_res.status_code == 200, attach_res.text
    payload = attach_res.json()
    assert payload["name"] == f"Attached Tenant {tmp_path.name}"
    assert payload["is_online"] is True

    tenants_res = await client.get("/api/v1/tenants/me")
    assert tenants_res.status_code == 200, tenants_res.text
    tenants = tenants_res.json()
    assert len(tenants) == 1
    assert tenants[0]["name"] == f"Attached Tenant {tmp_path.name}"
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

    create_one = await client.post("/api/v1/tenants/admin/create", json={"name": f"Tenant One {tmp_path.name}"})
    assert create_one.status_code == 200, create_one.text
    first = create_one.json()

    create_two = await client.post("/api/v1/tenants/admin/create", json={"name": f"Tenant Two {tmp_path.name}"})
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
    assert {tenant["name"] for tenant in tenants} == {f"Tenant One {tmp_path.name}", f"Tenant Two {tmp_path.name}"}


@pytest.mark.anyio
async def test_create_tenant_provisions_far_and_rca_runtime_schema(client, monkeypatch, tmp_path):
    storage_root = tmp_path / "runtime-schema-storage"
    storage_root.mkdir(parents=True, exist_ok=True)

    monkeypatch.setenv("DEFAULT_USER_ID", "haewon.kim")
    monkeypatch.setenv("USER_ID_ENV_VAR", "AccessKey")
    monkeypatch.setenv("AccessKey", "haewon.kim")

    settings_res = await client.post("/api/v1/tenants/admin/settings", json={
        "key": "tenant_storage_root",
        "value": str(storage_root),
        "description": "runtime schema root",
    })
    assert settings_res.status_code == 200, settings_res.text

    create_res = await client.post("/api/v1/tenants/admin/create", json={"name": f"Runtime Ready Tenant {tmp_path.name}"})
    assert create_res.status_code == 200, create_res.text
    payload = create_res.json()
    db_path = payload["db_url"].replace("sqlite+aiosqlite:///", "/")

    conn = sqlite3.connect(db_path)
    try:
        far_columns = {row[1] for row in conn.execute("PRAGMA table_info(far_failure_modes)").fetchall()}
        far_resolution_columns = {row[1] for row in conn.execute("PRAGMA table_info(far_resolutions)").fetchall()}
        rca_columns = {row[1] for row in conn.execute("PRAGMA table_info(rca_records)").fetchall()}
        table_names = {
            row[0]
            for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        }
    finally:
        conn.close()

    assert "version" in far_columns
    assert "guidance_notes" in far_resolution_columns
    assert "version" in rca_columns
    assert "far_history" in table_names
    assert "rca_history" in table_names
