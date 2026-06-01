import pytest


@pytest.mark.anyio
async def test_user_pool_refresh_persists_script_history(client):
    script = "print('sync users')"
    refresh_res = await client.post("/api/v1/settings/user-pool/refresh", json={"script": script})
    assert refresh_res.status_code == 200, refresh_res.text

    versions_res = await client.get("/api/v1/settings/user-pool/versions")
    assert versions_res.status_code == 200, versions_res.text
    versions = versions_res.json()
    assert len(versions) > 0
    assert versions[0]["diff_summary"]["script"] == script
