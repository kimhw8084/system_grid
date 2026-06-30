# OUT-13 External Export Round-Trip Proof

## Runtime ownership proof

Repo root:

`/Users/haewonkim/home/development/sysgrid`

Git SHA:

`3aa88d7c9f74cc3f640ae7ca554424acedd76069`

Direct module import proof:

```text
MAIN_FILE= /Users/haewonkim/home/development/sysgrid/backend/app/main.py
CWD= /Users/haewonkim/home/development/sysgrid/backend
EXPOSED_DOWNLOAD_HEADERS= ['Content-Disposition', 'X-SysGrid-Import-Profile', 'X-SysGrid-Schema-Version']
ROUND_TRIP_EXPOSE_HEADER_NAMES= ('Content-Disposition', 'X-SysGrid-Import-Profile', 'X-SysGrid-Schema-Version')
```

Exact local start command used for proof on this machine:

```text
./scripts/start-local.sh --skip-typecheck
```

Script-owned backend launch:

```text
cd "$BACKEND_DIR"
PYTHONPATH=. "$BACKEND_DIR/venv/bin/python" -m uvicorn app.main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT"
```

Resolved runtime env:

```text
API Base: http://127.0.0.1:8000
Frontend Origin Allowed: http://127.0.0.1:5173
backend/.env.local.runtime -> BACKEND_CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
frontend/.env.local -> VITE_API_BASE_URL=http://127.0.0.1:8000
```

Live backend process:

```text
PID: 50508
Command: Python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Listener: 127.0.0.1:8000
Repo path: /Users/haewonkim/home/development/sysgrid
```

Temporary route ownership proof during audit:

```text
GET /__out13_probe -> 200
{"probe":"main-py-loaded","exposed":["Content-Disposition","X-SysGrid-Import-Profile","X-SysGrid-Schema-Version"]}
```

Temporary route removed in final code:

```text
GET /__out13_probe -> 404 Not Found
```

## Exact root cause

Primary root cause:

- the edited backend code path was correct locally, so the earlier `Access-Control-Expose-Headers: **` result was not caused by the current `backend/app/main.py`
- the failure mode was runtime ownership mismatch or stale runtime outside the patched local repo path

Secondary contract bugs found during full local round-trip proof:

- External snapshot export was still using the generic raw-table dump instead of the import-contract serializer
- exported CSV rows leaked legacy enum values and ownership-field combinations that External import preview rejected
- uploaded CSV preview also leaked `NaN` values from pandas into JSON responses

## Exact files changed

- `backend/app/api/import_engine.py`
- `backend/app/main.py`
- `backend/test_import_workflows.py`
- `frontend/OUT-13-EXTERNAL-EXPORT-ROUNDTRIP-PROOF.md`

## Exact fix made

In `backend/app/api/import_engine.py`:

- kept the explicit round-trip header contract
- fixed `rows_from_dataframe(...)` so uploaded CSV preview does not emit `NaN`
- fixed External team/operator ID resolution so int-like snapshot IDs such as `1.0` round-trip correctly
- changed External snapshot export to use the import-contract serializer instead of the raw model dump
- normalized legacy External snapshot values on export:
  - `Elevated -> High`
  - `Moderate -> Medium`
  - `Pending -> In Progress`
  - `Review Needed -> Required`
- normalized exported ownership fields so only the ownership-mode-consistent ID column is populated
- allowed preview-time identity validation to treat an exact existing entity match as a round-trip preview instead of a duplicate-create failure

In `backend/test_import_workflows.py`:

- kept the explicit expose-header and filename assertions
- added an External snapshot export -> `preview-file` round-trip test

In `backend/app/main.py`:

- no final probe code remains

## Final curl proof

Command used:

```text
curl -i -H "Origin: http://127.0.0.1:5173" "http://127.0.0.1:8000/api/v1/import/snapshot/external_entities"
```

Observed final headers:

```text
HTTP/1.1 200 OK
content-disposition: attachment; filename=SysGrid_External_2026-06-30_11-56-19.csv
x-sysgrid-schema-version: 2026-06-external-v1
x-sysgrid-import-profile: external_entities
access-control-expose-headers: Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version
access-control-allow-origin: http://127.0.0.1:5173
```

Forbidden final values not present:

```text
Access-Control-Expose-Headers: *
Access-Control-Expose-Headers: **
```

## Final browser proof

Browser-runtime proof used a real Chromium page on `http://127.0.0.1:5173`.

Equivalent console snippet:

```js
const r = await fetch("http://127.0.0.1:8000/api/v1/import/snapshot/external_entities", { credentials: "include" });
console.log("status:", r.status);
console.log("profile:", r.headers.get("X-SysGrid-Import-Profile"));
console.log("schema:", r.headers.get("X-SysGrid-Schema-Version"));
console.log("content-disposition:", r.headers.get("Content-Disposition"));
```

Observed browser result:

```text
status: 200
profile: external_entities
schema: 2026-06-external-v1
content-disposition: attachment; filename=SysGrid_External_2026-06-30_11-56-32.csv
```

## Downloaded filename proof

Example final backend-owned filename:

```text
SysGrid_External_2026-06-30_11-56-19.csv
```

Backend and browser both read the same `Content-Disposition` contract.

## External Import preview proof

Command used:

```text
curl -X POST \
  -F "table_name=external_entities" \
  -F "file=@/private/tmp/out13_final_external.csv;type=text/csv" \
  http://127.0.0.1:8000/api/v1/import/preview-file
```

Observed summary:

```text
table_name: external_entities
total_rows: 28
valid_rows: 28
invalid_rows: 0
first_result_status: VALID
```

This proves the exported External snapshot CSV now previews successfully through External Import on the same local runtime.

## Tests run

Backend:

```text
rtk pytest -q backend/test_import_workflows.py -k "external_snapshot_export_exposes_round_trip_headers_for_browser_js or external_snapshot_export_previews_successfully_on_round_trip or monitoring_snapshot_export_uses_round_trip_import_contract"
```

Result:

```text
Pytest: 6 passed
```

Frontend:

```text
cd frontend && npm run test:unit -- src/components/shared/OperationalImportExport.test.ts
```

Result:

```text
Test Files  1 passed
Tests       3 passed
```

## Scope confirmation

- Monitoring remains out of scope for this issue
- no Monitoring migration was used as the golden method
- no frontend validation was weakened
- no `response.headers.get(...)` checks were removed
- temporary probe code was removed from final backend code
