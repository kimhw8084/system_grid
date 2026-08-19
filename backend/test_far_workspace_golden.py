import pytest

from app.api import workspaces


FAR_GROUP_BY_VALUES = ["raw", "system_name", "failure_type", "status", "risk_band"]


def headers(user_id: str, tenant_id: int) -> dict[str, str]:
    return {"X-User-Id": user_id, "X-Tenant-Id": str(tenant_id)}


@pytest.mark.anyio
async def test_far_workspace_definition_exposes_golden_operational_state(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    response = await client.get("/api/v1/workspaces/definitions")
    assert response.status_code == 200, response.text
    far = next(entry for entry in response.json()["definitions"] if entry["key"] == "far")

    assert far["archetype"] == "investigation"
    assert {
        "saved_views",
        "search",
        "filters",
        "column_state",
        "selection",
        "bulk_actions",
        "import",
        "export",
        "details",
        "deep_links",
        "history",
        "compare",
        "relationships",
        "investigation",
        "custom_body",
    }.issubset(set(far["capabilities"]))
    assert far["state_schema"]["quick_filter_keys"] == [
        "system_name",
        "failure_type",
        "status",
        "risk_band",
    ]
    assert far["state_schema"]["group_by"] == FAR_GROUP_BY_VALUES
    assert set(far["state_schema"]["column_ids"]) == {
        "id",
        "system_name",
        "failure_type",
        "title",
        "severity",
        "occurrence",
        "detection",
        "rpn",
        "status",
        "linked_rcas",
        "created_by_user_id",
    }


@pytest.mark.anyio
async def test_far_saved_view_preserves_golden_display_and_grid_state(seeded_admin_tenant):
    client = seeded_admin_tenant["client"]
    tenant_id = seeded_admin_tenant["tenant_id"]
    request_headers = headers("admin_root", tenant_id)

    response = await client.post(
        "/api/v1/workspaces/far/views",
        json={
            "name": "High risk FAR",
            "scope": "personal",
            "definition": {
                "fontSize": 99,
                "rowDensity": -2,
                "hiddenColumns": ["created_by_user_id", "unknown", "created_by_user_id"],
                "groupBy": "risk_band",
                "quickFilter": "  thermal risk  ",
                "quickFilters": {
                    "system_name": ["Core", "Core"],
                    "failure_type": ["Timeout"],
                    "status": ["Analyzing"],
                    "risk_band": ["Critical"],
                    "unknown": ["drop"],
                },
                "filterModel": {
                    "status": {"filterType": "text", "filter": "Analyzing"},
                    "unknown": {"filterType": "text", "filter": "drop"},
                },
                "sortModel": [
                    {"colId": "rpn", "sort": "desc"},
                    {"colId": "missing", "sort": "asc"},
                ],
                "columnLayoutState": [
                    {"colId": "title", "width": 330, "pinned": "left"},
                    {"colId": "missing", "width": 900},
                ],
                "unknownTopLevel": "drop",
            },
            "schema_version": 1,
        },
        headers=request_headers,
    )
    assert response.status_code == 201, response.text
    saved = response.json()

    assert saved["definition"] == {
        "fontSize": 18,
        "rowDensity": 0,
        "groupBy": "risk_band",
        "showFilterBar": True,
        "hiddenColumns": ["created_by_user_id"],
        "quickFilter": "thermal risk",
        "quickFilters": {
            "system_name": ["Core"],
            "failure_type": ["Timeout"],
            "status": ["Analyzing"],
            "risk_band": ["Critical"],
        },
        "filterModel": {"status": {"filterType": "text", "filter": "Analyzing"}},
        "sortModel": [{"colId": "rpn", "sort": "desc"}],
        "columnLayoutState": [{"colId": "title", "pinned": "left", "width": 330}],
    }


@pytest.mark.parametrize("group_by", FAR_GROUP_BY_VALUES)
def test_far_supported_groupings_survive_sanitization(group_by):
    assert workspaces.sanitize_definition("far", {"groupBy": group_by})["groupBy"] == group_by


def test_far_unknown_grouping_falls_back_to_raw():
    assert workspaces.sanitize_definition("far", {"groupBy": "unknown"})["groupBy"] == "raw"
