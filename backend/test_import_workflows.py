import csv
import io

import pytest


@pytest.mark.anyio
async def test_monitoring_import_schema_and_template(client):
    team_res = await client.post("/api/v1/settings/teams", json={"name": "Import Template Ops"})
    assert team_res.status_code == 200, team_res.text
    device_res = await client.post("/api/v1/devices", json={
        "name": "MON-TEMPLATE-01",
        "system": "MON-TEMPLATE",
        "status": "Active",
        "type": "Physical",
        "serial_number": "MON-TEMPLATE-SN",
        "asset_tag": "MON-TEMPLATE-AT",
    })
    assert device_res.status_code == 200, device_res.text
    monitor_res = await client.post("/api/v1/monitoring", json={
        "device_id": device_res.json()["id"],
        "category": "Infrastructure",
        "status": "Existing",
        "title": "Template Example Monitor",
        "platform": "Zabbix",
        "severity": "Warning",
        "owner_team": "Import Template Ops",
    })
    assert monitor_res.status_code == 200, monitor_res.text
    monitor = monitor_res.json()

    schema_res = await client.get("/api/v1/import/schema/monitoring_items")
    assert schema_res.status_code == 200, schema_res.text
    schema = schema_res.json()

    assert schema["table_name"] == "monitoring_items"
    assert "title" in schema["required_fields"]
    assert "category" in schema["required_fields"]
    assert "status" in schema["required_fields"]
    assert "severity" in schema["required_fields"]
    assert "platform" not in schema["required_fields"]
    assert any(field["name"] == "device_name" for field in schema["fields"])
    assert any(field["name"] == "status" and field["options"] for field in schema["fields"])
    assert any(field["name"] == "owner_user_ids" for field in schema["fields"])
    assert any(field["name"] == "logic" and field["supported_in_builder"] is False for field in schema["fields"])
    assert any(record["id"] == monitor["id"] for record in schema["example_records"])

    template_res = await client.get(f"/api/v1/import/template/monitoring_items?columns=title,monitoring_url&mode=example&example_id={monitor['id']}")
    assert template_res.status_code == 200, template_res.text
    assert template_res.headers["x-sysgrid-schema-version"] == "2026-06-monitoring-v1"
    assert template_res.headers["x-sysgrid-import-profile"] == "monitoring_items"
    decoded = template_res.content.decode("utf-8")
    rows = list(csv.reader(io.StringIO(decoded)))

    assert rows[0][:5] == ["category", "status", "title", "severity", "monitoring_url"]
    assert "severity" in rows[0]
    assert "platform" not in rows[0]
    assert "monitoring_url" in rows[0]
    assert rows[1][rows[0].index("monitoring_url")] == "[https://...]"
    assert rows[2][rows[0].index("title")] == "Template Example Monitor"


@pytest.mark.anyio
async def test_monitoring_import_preview_rows_and_execute(client):
    await client.post("/api/v1/settings/teams", json={"name": "Import Ops"})

    device_res = await client.post("/api/v1/devices", json={
        "name": "MON-IMPORT-01",
        "system": "MON-IMPORT",
        "status": "Active",
        "type": "Physical",
        "serial_number": "MON-IMPORT-SN",
        "asset_tag": "MON-IMPORT-AT",
    })
    assert device_res.status_code == 200, device_res.text

    knowledge_res = await client.post("/api/v1/knowledge", json={
        "title": "Import Recovery",
        "category": "Runbook",
        "content": "Recover the monitor",
        "status": "Draft",
    })
    assert knowledge_res.status_code == 200, knowledge_res.text

    preview_res = await client.post(
        "/api/v1/import/preview-rows?table_name=monitoring_items",
        json={
            "rows": [
                {
                    "device_name": "MON-IMPORT-01",
                    "category": "Infrastructure",
                    "status": "Existing",
                    "title": "Disk Free Space",
                    "platform": "Zabbix",
                    "owner_team": "Import Ops",
                    "severity": "Critical",
                    "recovery_doc_titles": "Import Recovery",
                    "notification_recipients": "ops@example.com, pager@example.com",
                },
                {
                    "device_name": "UNKNOWN-ASSET",
                    "category": "Infrastructure",
                    "status": "Existing",
                    "title": "Bad Row",
                    "platform": "Zabbix",
                    "owner_team": "Import Ops",
                },
            ]
        },
    )
    assert preview_res.status_code == 200, preview_res.text
    preview = preview_res.json()

    assert preview["valid_rows"] == 1
    assert preview["invalid_rows"] == 1
    assert preview["results"][0]["normalized"]["notification_recipients"] == ["ops@example.com", "pager@example.com"]
    assert preview["results"][1]["status"] == "INVALID"
    assert "Unknown device_name" in preview["results"][1]["errors"][0]

    execute_res = await client.post(
        "/api/v1/import/execute?table_name=monitoring_items",
        headers={"X-User-Id": "import.tester"},
        json={
            "rows": [
                {
                    "device_name": "MON-IMPORT-01",
                    "category": "Infrastructure",
                    "status": "Existing",
                    "title": "Disk Free Space",
                    "platform": "Zabbix",
                    "owner_team": "Import Ops",
                    "severity": "Critical",
                    "recovery_doc_titles": "Import Recovery",
                    "notification_recipients": "ops@example.com, pager@example.com",
                }
            ]
        },
    )
    assert execute_res.status_code == 200, execute_res.text
    assert execute_res.json() == {"status": "success", "count": 1}

    list_res = await client.get("/api/v1/monitoring")
    assert list_res.status_code == 200, list_res.text
    monitors = list_res.json()
    assert len(monitors) == 1
    assert monitors[0]["title"] == "Disk Free Space"
    assert monitors[0]["owner_team"] == "Import Ops"
    assert monitors[0]["notification_recipients"] == ["ops@example.com", "pager@example.com"]
    assert monitors[0]["recovery_doc_titles"] == ["Import Recovery"]


@pytest.mark.anyio
async def test_monitoring_snapshot_export_uses_round_trip_import_contract(client):
    await client.post("/api/v1/settings/teams", json={"name": "Snapshot Ops"})
    device_res = await client.post("/api/v1/devices", json={
        "name": "MON-SNAPSHOT-01",
        "system": "MON-SNAPSHOT",
        "status": "Active",
        "type": "Physical",
        "serial_number": "MON-SNAPSHOT-SN",
        "asset_tag": "MON-SNAPSHOT-AT",
    })
    device = device_res.json()
    knowledge_res = await client.post("/api/v1/knowledge", json={
        "title": "Snapshot Recovery",
        "category": "Runbook",
        "content": "Recover snapshot monitor",
        "status": "Draft",
    })
    knowledge = knowledge_res.json()

    create_res = await client.post("/api/v1/monitoring", json={
        "device_id": device["id"],
        "category": "Infrastructure",
        "status": "Existing",
        "title": "Snapshot Monitor",
        "platform": "Zabbix",
        "owner_team": "Snapshot Ops",
        "notification_method": "Slack",
        "notification_recipients": ["snap@example.com"],
        "severity": "Critical",
        "recovery_docs": [knowledge["id"]],
        "spec": "Watch disk saturation",
        "logic": "disk_used > 90",
    })
    assert create_res.status_code == 200, create_res.text

    snapshot_res = await client.get("/api/v1/import/snapshot/monitoring_items")
    assert snapshot_res.status_code == 200, snapshot_res.text
    assert snapshot_res.headers["x-sysgrid-schema-version"] == "2026-06-monitoring-v1"
    assert snapshot_res.headers["x-sysgrid-import-profile"] == "monitoring_items"

    rows = list(csv.DictReader(io.StringIO(snapshot_res.content.decode("utf-8"))))
    assert rows
    row = rows[0]
    assert row["device_name"] == "MON-SNAPSHOT-01"
    assert row["title"] == "Snapshot Monitor"
    assert row["owner_team"] == "Snapshot Ops"
    assert row["notification_recipients"] == "snap@example.com"
    assert row["recovery_doc_titles"] == "Snapshot Recovery"
    assert row["spec"] == "Watch disk saturation"
    assert row["logic"] == "disk_used > 90"


@pytest.mark.anyio
async def test_monitoring_import_preview_file_accepts_csv_upload(client):
    await client.post("/api/v1/settings/teams", json={"name": "File Import Ops"})
    await client.post("/api/v1/devices", json={
        "name": "MON-FILE-01",
        "system": "MON-FILE",
        "status": "Active",
        "type": "Physical",
        "serial_number": "MON-FILE-SN",
        "asset_tag": "MON-FILE-AT",
    })

    csv_body = "\n".join([
        "device_name,category,status,title,platform,owner_team",
        "MON-FILE-01,Infrastructure,Existing,CPU Saturation,Zabbix,File Import Ops",
    ])
    preview_res = await client.post(
        "/api/v1/import/preview-file",
        files={"file": ("monitoring.csv", csv_body.encode("utf-8"), "text/csv")},
        data={"table_name": "monitoring_items"},
    )

    assert preview_res.status_code == 200, preview_res.text
    preview = preview_res.json()
    assert preview["total_rows"] == 1
    assert preview["valid_rows"] == 1
    assert preview["results"][0]["normalized"]["title"] == "CPU Saturation"


@pytest.mark.anyio
async def test_monitoring_import_rejects_duplicate_rows_in_same_batch(client):
    await client.post("/api/v1/settings/teams", json={"name": "Dup Import Ops"})
    await client.post("/api/v1/devices", json={
        "name": "MON-DUP-IMPORT-01",
        "system": "MON-DUP-IMPORT",
        "status": "Active",
        "type": "Physical",
        "serial_number": "MON-DUP-IMPORT-SN",
        "asset_tag": "MON-DUP-IMPORT-AT",
    })

    preview_res = await client.post(
        "/api/v1/import/preview-rows?table_name=monitoring_items",
        json={
            "rows": [
                {
                    "device_name": "MON-DUP-IMPORT-01",
                    "category": "Infrastructure",
                    "status": "Existing",
                    "title": "Duplicate Import Monitor",
                    "platform": "Zabbix",
                    "owner_team": "Dup Import Ops",
                },
                {
                    "device_name": "MON-DUP-IMPORT-01",
                    "category": "Infrastructure",
                    "status": "Existing",
                    "title": "Duplicate Import Monitor",
                    "platform": "Zabbix",
                    "owner_team": "Dup Import Ops",
                },
            ]
        },
    )
    assert preview_res.status_code == 200, preview_res.text
    preview = preview_res.json()
    assert preview["valid_rows"] == 1
    assert preview["invalid_rows"] == 1
    assert "Duplicate monitoring row in the same import batch." in preview["results"][1]["errors"][0]
