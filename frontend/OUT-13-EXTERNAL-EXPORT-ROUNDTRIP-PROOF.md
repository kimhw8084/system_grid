# OUT-13 External Export Round-Trip Proof

## 1. Final verdict recommendation

`PARTIAL`

Reason:
- The backend source now makes the snapshot response itself expose the required browser-readable headers explicitly.
- Focused backend and frontend tests pass.
- A fresh direct backend runtime on `127.0.0.1:8010` returns the expected explicit header value.
- Browser retest against the refreshed backend process on the user’s normal port was not completed in this session.

## 2. Iteration 04 failure being fixed

Observed runtime failure:
- External export called `/api/v1/import/snapshot/external_entities`.
- The response included:
  - `X-SysGrid-Import-Profile: external_entities`
  - `X-SysGrid-Schema-Version: 2026-06-external-v1`
- But the UI still showed:
  - `export returned import profile missing instead of external_entities`

Prior runtime evidence:
- User reported `Access-Control-Expose-Headers: **`.
- In this session, the reproducible direct backend problem on the live `:8000` process was that `Access-Control-Expose-Headers` was missing from the snapshot response entirely.

## 3. Exact source investigation result

Search targets used:
- `expose_headers`
- `Access-Control-Expose-Headers`
- `**`
- CORS middleware
- response header mutation
- settings / env driven CORS config

Exact result:
- No checked-in repo source sets `Access-Control-Expose-Headers: **`.
- No checked-in repo source contains a literal `**` expose-header value.
- Relevant code paths found:
  - app-level CORS middleware: `backend/app/main.py:75-79`, `124-130`
  - import download response headers: `backend/app/api/import_engine.py:1437-1448`, `1513-1517`, `1562-1566`

Configured code versus actual runtime:
- Live `127.0.0.1:8000` response before this fix:
  - had `content-disposition`
  - had `x-sysgrid-import-profile`
  - had `x-sysgrid-schema-version`
  - did not have `Access-Control-Expose-Headers`
- Therefore the actionable backend/runtime defect in this environment was the missing expose-header on the actual snapshot response path.

## 4. Exact root cause

`SNAPSHOT_RESPONSE_DID_NOT_RELIABLY_EXPOSE_BROWSER_READABLE_DOWNLOAD_HEADERS_AT_RUNTIME`

Why this is the root cause:
- The frontend validator reads:
  - `response.headers.get("X-SysGrid-Import-Profile")`
  - `response.headers.get("X-SysGrid-Schema-Version")`
  - `response.headers.get("Content-Disposition")`
- When the snapshot response does not explicitly expose those headers in a cross-origin runtime path, browser JavaScript can treat them as unreadable, even if the Network panel shows them.

## 5. Fix made

Smallest backend-only recovery:
- The import download response path now sets:
  - `Access-Control-Expose-Headers: Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version`
- This is emitted directly by the snapshot/template response builder, not left solely to middleware behavior.

Exact code path:
- Header constant:
  - `backend/app/api/import_engine.py:31`
- Header builder:
  - `backend/app/api/import_engine.py:1437-1448`
- Template response uses it:
  - `backend/app/api/import_engine.py:1513-1517`
- Snapshot response uses it:
  - `backend/app/api/import_engine.py:1562-1566`

This preserves:
- existing profile/schema validation
- existing snapshot file format
- existing `external_entities` export domain contract

## 6. Files changed

- `backend/app/api/import_engine.py`
- `backend/test_import_workflows.py`
- `frontend/OUT-13-EXTERNAL-EXPORT-ROUNDTRIP-PROOF.md`

## 7. Focused tests and results

Command:

```bash
rtk pytest -q backend/test_import_workflows.py -k "external_import_schema_template_preview_and_execute or external_snapshot_export_exposes_round_trip_headers_for_browser_js"
```

Result:
- Passed
- `4 passed`

Command:

```bash
rtk npm run test:unit -- src/components/shared/OperationalImportExport.test.ts
```

Result:
- Passed
- `1` file passed
- `2` tests passed

Focused backend assertion added:
- `backend/test_import_workflows.py:462-472`
- Proves:
  - `x-sysgrid-import-profile` present
  - `x-sysgrid-schema-version` present
  - `content-disposition` present
  - `access-control-expose-headers` present
  - `access-control-expose-headers` includes all three required names
  - `access-control-expose-headers` is not `*`
  - `access-control-expose-headers` is not `**`

## 8. Direct backend header result

Before fix on the stale live process:

```bash
rtk proxy curl -si -H 'Origin: http://127.0.0.1:5173' -H 'X-User-Id: haewon.kim' -H 'X-Tenant-Id: 1' 'http://127.0.0.1:8000/api/v1/import/snapshot/external_entities'
```

Observed:
- `content-disposition` present
- `x-sysgrid-import-profile` present
- `x-sysgrid-schema-version` present
- `Access-Control-Expose-Headers` missing

Fresh direct backend runtime after fix:

Backend launch used:

```bash
env CONFIG_DATABASE_URL="sqlite+aiosqlite:///$PWD/config.local.db" DATABASE_URL="sqlite+aiosqlite:///$PWD/tenants/local-demo/local_demo.db" TENANT_STORAGE_ROOT="$PWD/tenants/local-demo" DEFAULT_TENANT_NAME="Local Demo" PUBLIC_READONLY_ENABLED="true" PUBLIC_READONLY_TENANT_NAME="Local Demo" DEFAULT_USER_ID="haewon.kim" AUTO_ADMIN_USER_IDS="haewon.kim" USER_ID_ENV_VAR="USER_ID" USER_ID="haewon.kim" PYTHONPATH=. ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Curl verification:

```bash
rtk proxy curl -si -H 'Origin: http://127.0.0.1:5173' -H 'X-User-Id: haewon.kim' -H 'X-Tenant-Id: 1' 'http://127.0.0.1:8010/api/v1/import/snapshot/external_entities'
```

Observed:
- `content-disposition: attachment; filename=SYSGRID_external_entities_Snapshot.csv`
- `access-control-expose-headers: Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version`
- `x-sysgrid-schema-version: 2026-06-external-v1`
- `x-sysgrid-import-profile: external_entities`

## 9. Expected direct backend curl result

Expected response headers on `/api/v1/import/snapshot/external_entities`:

```text
Content-Disposition: attachment; filename=SYSGRID_external_entities_Snapshot.csv
X-SysGrid-Import-Profile: external_entities
X-SysGrid-Schema-Version: 2026-06-external-v1
Access-Control-Expose-Headers: Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version
```

Not acceptable:

```text
Access-Control-Expose-Headers: *
Access-Control-Expose-Headers: **
```

## 10. Expected browser Network result

For `External -> Active -> Export`, the request to:

```text
/api/v1/import/snapshot/external_entities
```

should show:

```text
X-SysGrid-Import-Profile: external_entities
X-SysGrid-Schema-Version: 2026-06-external-v1
Access-Control-Expose-Headers: Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version
```

and should not show:

```text
*
**
```

for `Access-Control-Expose-Headers`.

## 11. Manual retest checklist

1. Restart backend completely.
2. Refresh the browser.
3. Open `External -> Active`.
4. Open DevTools -> Network.
5. Clear Network.
6. Click `Export`.
7. Inspect `/api/v1/import/snapshot/external_entities`.
8. Confirm response headers include:
   - `X-SysGrid-Import-Profile: external_entities`
   - `X-SysGrid-Schema-Version: 2026-06-external-v1`
   - `Access-Control-Expose-Headers: Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version`
9. Confirm `Access-Control-Expose-Headers` is not:
   - `*`
   - `**`
10. Confirm no missing-profile toast appears.
11. Confirm the file downloads.
12. Open External Import.
13. Upload or preview the exported file.
14. Confirm the file previews as External entities data.

## 12. Explicit non-scope confirmation

- No OUT-14 broad work
- No saved-view Links-tab fix
- No External UI redesign
- No compare/detail/edit/link-form work
- No lifecycle/data-state work
- No row actions/table/selection/bulk/floating/modal/route work
- No other workspace changes
- No weakening of frontend profile/schema validation
