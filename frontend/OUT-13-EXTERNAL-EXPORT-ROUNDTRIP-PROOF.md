# OUT-13 External Export Round-Trip Proof

## Verdict

`PATCHED`

Scope:
- backend export response contract only
- frontend filename masking removed only for strict round-trip exports
- no OUT-14 or unrelated workspace changes

## Changed files

- `backend/app/api/import_engine.py`
- `backend/app/main.py`
- `backend/test_import_workflows.py`
- `frontend/src/components/shared/OperationalImportExport.ts`
- `frontend/src/components/shared/OperationalImportExport.test.ts`
- `frontend/OUT-13-EXTERNAL-EXPORT-ROUNDTRIP-PROOF.md`

## Exact backend code that creates the filename

In `backend/app/api/import_engine.py`:

```python
def build_snapshot_filename(profile: ImportProfile) -> str:
    if profile.key == "external_entities":
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        return f"SysGrid_External_{timestamp}.csv"
    return f"SYSGRID_{profile.key}_Snapshot.csv"
```

The snapshot route uses that helper directly:

```python
headers = build_round_trip_download_headers(profile, build_snapshot_filename(profile))
return StreamingResponse(
    stream,
    media_type="text/csv",
    headers=headers
)
```

Expected contract:

```text
Content-Disposition: attachment; filename=SysGrid_External_YYYY-MM-DD_HH-mm-ss.csv
```

## Exact backend code that exposes headers

Header names remain defined once in `backend/app/api/import_engine.py`:

```python
ROUND_TRIP_EXPOSE_HEADER_NAMES = (
    "Content-Disposition",
    "X-SysGrid-Import-Profile",
    "X-SysGrid-Schema-Version",
)
ROUND_TRIP_EXPOSE_HEADERS = ", ".join(ROUND_TRIP_EXPOSE_HEADER_NAMES)
```

The final successful response is normalized in `backend/app/main.py`:

```python
@app.middleware("http")
async def normalize_round_trip_export_headers(request: Request, call_next):
    response = await call_next(request)
    if response.status_code == 200:
        response_header_names = {key.lower() for key in response.headers.keys()}
        if {
            "content-disposition",
            "x-sysgrid-import-profile",
            "x-sysgrid-schema-version",
        }.issubset(response_header_names):
            response.headers["Access-Control-Expose-Headers"] = ROUND_TRIP_EXPOSE_HEADERS
    return response
```

FastAPI CORS middleware also advertises the same explicit list:

```python
EXPOSED_DOWNLOAD_HEADERS = list(ROUND_TRIP_EXPOSE_HEADER_NAMES)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=EXPOSED_DOWNLOAD_HEADERS,
)
```

Result:

```text
Access-Control-Expose-Headers: Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version
```

Forbidden results:

```text
Access-Control-Expose-Headers: *
Access-Control-Expose-Headers: **
Access-Control-Expose-Headers:
```

## Frontend filename ownership

`frontend/src/components/shared/OperationalImportExport.ts` no longer silently masks a missing backend filename during strict round-trip exports.

Strict round-trip validation now fails if `Content-Disposition` is unreadable:

```ts
if ((expectedProfile || requireSchemaHeaders) && !fileName) {
  throw new Error('Export did not include Content-Disposition metadata')
}
```

That keeps backend `Content-Disposition` as the filename owner for External snapshot export instead of falling back to a frontend-only name.

## Automated proof

Backend tests:

- `backend/test_import_workflows.py::test_external_snapshot_export_exposes_round_trip_headers_for_browser_js`
- `backend/test_import_workflows.py::test_monitoring_snapshot_export_uses_round_trip_import_contract`

Backend assertions now prove:

- the response returns exactly one `Content-Disposition` header
- the response returns exactly one `Access-Control-Expose-Headers` header
- `Access-Control-Expose-Headers` equals `Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version`
- `Access-Control-Expose-Headers` is not `*`
- `Access-Control-Expose-Headers` is not `**`
- `Content-Disposition` is not `attachment; filename=SYSGRID_external_entities_Snapshot.csv`
- `Content-Disposition` matches `attachment; filename=SysGrid_External_YYYY-MM-DD_HH-mm-ss.csv`

Focused backend run:

```text
rtk pytest -q backend/test_import_workflows.py -k "external_snapshot_export_exposes_round_trip_headers_for_browser_js or monitoring_snapshot_export_uses_round_trip_import_contract or external_import_schema_template_preview_execute_and_snapshot"
```

Result:

```text
4 passed
```

Frontend test:

- `frontend/src/components/shared/OperationalImportExport.test.ts`

Frontend assertions prove:

- strict export uses backend `Content-Disposition` for the filename
- strict export still fails if schema metadata is missing
- strict export now fails if backend `Content-Disposition` is missing instead of masking it with a frontend fallback

Focused frontend run:

```text
rtk npm run test:unit -- src/components/shared/OperationalImportExport.test.ts
```

Result:

```text
1 file passed, 3 tests passed
```

## Live HTTP proof after restart

Restarted backend locally and verified the real `8000` response with an `Origin` header:

```text
rtk curl -si \
  -H 'Origin: http://localhost:5173' \
  -H 'X-User-Id: haewon.kim' \
  -H 'X-Tenant-Id: 1' \
  http://127.0.0.1:8000/api/v1/import/snapshot/external_entities
```

Observed 200 response headers:

```text
content-disposition: attachment; filename=SysGrid_External_2026-06-30_10-46-06.csv
x-sysgrid-schema-version: 2026-06-external-v1
x-sysgrid-import-profile: external_entities
access-control-expose-headers: Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version
access-control-allow-origin: http://localhost:5173
```

This confirms the live backend no longer emits wildcard expose headers on the successful External snapshot export path.

## Browser retest status

Not completed in this session.

Reason:

- the in-app browser runtime is unavailable here
- browser discovery returned `[]`
- no browser-console fetch or toast inspection could be automated honestly

Manual browser retest still required after restart:

1. Trigger External export from the frontend running at `http://localhost:5173`.
2. Confirm there is no missing-profile toast.
3. In browser console, run `fetch` against `http://127.0.0.1:8000/api/v1/import/snapshot/external_entities` and confirm:
   - `response.headers.get('X-SysGrid-Import-Profile') === 'external_entities'`
   - `response.headers.get('X-SysGrid-Schema-Version') === '2026-06-external-v1'`
   - `response.headers.get('Content-Disposition')` returns the backend filename
4. Confirm the downloaded filename includes hour, minute, and second:
   - `SysGrid_External_YYYY-MM-DD_HH-mm-ss.csv`
