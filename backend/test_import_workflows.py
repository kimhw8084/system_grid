import csv
import io

import pytest


@pytest.mark.anyio
async def test_monitoring_import_schema_and_template(client):
    await client.get("/api/v1/settings/initialize")

    schema_res = await client.get("/api/v1/import/schema/monitoring_items")
    assert schema_res.status_code == 200, schema_res.text
    schema = schema_res.json()

    assert schema["table_name"] == "monitoring_items"
    assert "title" in schema["required_fields"]
    assert "platform" in schema["required_fields"]
    assert any(field["name"] == "device_name" for field in schema["fields"])

    template_res = await client.get("/api/v1/import/template/monitoring_items?columns=title,monitoring_url")
    assert template_res.status_code == 200, template_res.text
    decoded = template_res.content.decode("utf-8")
    rows = list(csv.reader(io.StringIO(decoded)))

    assert rows[0][:4] == ["category", "status", "title", "platform"]
    assert "owner_team" in rows[0]
    assert "monitoring_url" in rows[0]
    assert rows[1][rows[0].index("platform")] == "[Monitoring Platform]"


@pytest.mark.anyio
async def test_monitoring_import_preview_rows_and_execute(client):
    await client.get("/api/v1/settings/initialize")
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
async def test_monitoring_import_preview_file_accepts_csv_upload(client):
    await client.get("/api/v1/settings/initialize")
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
