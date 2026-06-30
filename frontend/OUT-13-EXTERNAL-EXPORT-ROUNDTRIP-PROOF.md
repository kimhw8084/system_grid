# OUT-13 External Export Round-Trip Proof

## 1. Iteration 05 verdict candidate

`PARTIAL`

Reason:
- The direct backend runtime on `127.0.0.1:8000` now exposes the required headers explicitly.
- The frontend proxy path on `127.0.0.1:5173` now exposes the same headers explicitly.
- External export now uses the golden user-facing filename contract `SysGrid_External_YYYY-MM-DD_HH-mm-ss.csv`.
- Focused backend and frontend tests pass.
- Manual browser retest of the missing-profile toast and re-import preview was not completed in this session.

## 2. Exact source of `Access-Control-Expose-Headers: **`

Checked repo/runtime locations:
- `backend/app/main.py`
- `backend/app/api/import_engine.py`
- `backend/app/core/config.py`
- `backend/.env`
- frontend proxy path on `127.0.0.1:5173`
- live backend process on `127.0.0.1:8000`

Search terms used:
- `Access-Control-Expose-Headers`
- `expose_headers`
- `allow_headers`
- `allow_origins`
- `CORSMiddleware`
- `**`
- `"*"`
- `middleware`
- `Content-Disposition`

Finding:
- No checked-in repo source emits a literal `Access-Control-Expose-Headers: **`.
- The exact checked-in runtime paths that control the response are:
  - `backend/app/main.py`
  - `backend/app/api/import_engine.py`, function `build_round_trip_download_headers`
- The live defect on `127.0.0.1:8000` before restart was a stale backend process that served the snapshot route without `Access-Control-Expose-Headers` at all.
- After restarting the same local backend entrypoint (`uvicorn app.main:app`), the direct backend and the frontend proxy both emitted the explicit header list correctly.

Operational conclusion:
- The browser-observed `**` was not reproducible from checked-in source in this session.
- The actionable runtime source was the stale `:8000` backend process, not Vite alone.

## 3. Exact file/function changed to remove the bad runtime behavior

Checked-in runtime contract sources:
- `backend/app/main.py`
  - `EXPOSED_DOWNLOAD_HEADERS`
  - `app.add_middleware(CORSMiddleware, ..., expose_headers=EXPOSED_DOWNLOAD_HEADERS)`
- `backend/app/api/import_engine.py`
  - `ROUND_TRIP_EXPOSE_HEADERS`
  - `build_round_trip_download_headers(...)`

Iteration 05 code changes:
- `backend/test_import_workflows.py`
  - strengthened the snapshot header contract to fail on empty, `*`, `**`, or any omission from the exact exposed header set
- `frontend/src/components/shared/OperationalImportExport.ts`
  - added the shared golden filename builder
  - added `downloadFileName` so External export can use the golden client-side name without weakening header validation
- `frontend/src/components/External.tsx`
  - switched External snapshot export to `SysGrid_External_YYYY-MM-DD_HH-mm-ss.csv`

## 4. Direct backend before/after header evidence

Before restart, direct backend on `:8000`:

```bash
rtk proxy curl -si -H 'Origin: http://127.0.0.1:5173' -H 'X-User-Id: haewon.kim' -H 'X-Tenant-Id: 1' 'http://127.0.0.1:8000/api/v1/import/snapshot/external_entities' | rg -i 'access-control-expose|x-sysgrid|content-disposition'
```

Observed before restart:

```text
content-disposition: attachment; filename=SYSGRID_external_entities_Snapshot.csv
x-sysgrid-schema-version: 2026-06-external-v1
x-sysgrid-import-profile: external_entities
```

After restart, direct backend on `:8000`:

```bash
rtk proxy curl -si -H 'Origin: http://127.0.0.1:5173' -H 'X-User-Id: haewon.kim' -H 'X-Tenant-Id: 1' 'http://127.0.0.1:8000/api/v1/import/snapshot/external_entities' | rg -i 'access-control-expose|x-sysgrid|content-disposition'
```

Observed after restart:

```text
content-disposition: attachment; filename=SYSGRID_external_entities_Snapshot.csv
access-control-expose-headers: Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version
x-sysgrid-schema-version: 2026-06-external-v1
x-sysgrid-import-profile: external_entities
```

Required backend header contract now proven on the live port:
- not empty
- not `*`
- not `**`
- includes exactly:
  - `Content-Disposition`
  - `X-SysGrid-Import-Profile`
  - `X-SysGrid-Schema-Version`

## 5. Frontend/proxy/browser expected header evidence

Frontend proxy on `:5173` after backend restart:

```bash
rtk proxy curl -si -H 'Origin: http://127.0.0.1:5173' -H 'X-User-Id: haewon.kim' -H 'X-Tenant-Id: 1' 'http://127.0.0.1:5173/api/v1/import/snapshot/external_entities' | rg -i 'access-control-expose|x-sysgrid|content-disposition'
```

Observed:

```text
content-disposition: attachment; filename=SYSGRID_external_entities_Snapshot.csv
access-control-expose-headers: Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version
x-sysgrid-schema-version: 2026-06-external-v1
x-sysgrid-import-profile: external_entities
```

Expected browser result for `External -> Active -> Export`:
- the Network row for `/api/v1/import/snapshot/external_entities` no longer shows empty expose headers
- the response exposes the three required names explicitly
- the frontend can read `response.headers.get(...)`
- the missing-profile toast should disappear

## 6. Golden filename contract chosen

Chosen contract:

```text
SysGrid_External_<YYYY-MM-DD_HH-mm-ss>.csv
```

Timestamp source:
- client-side local time

Shared helper used:
- `frontend/src/components/shared/OperationalImportExport.ts`
  - `buildOperationalExportFileName(viewName, date?)`

External export view name:
- `External`

## 7. Evidence comparing old bad name vs new required name

Old bad user-facing filename:

```text
SYSGRID_external_entities_Snapshot.csv
```

New required user-facing filename:

```text
SysGrid_External_2026-06-30_08-21-47.csv
```

Evidence:
- `frontend/src/components/External.tsx` now passes `buildOperationalExportFileName('External')`
- `frontend/src/components/shared/OperationalImportExport.ts` now prefers `downloadFileName` over backend `Content-Disposition`
- `frontend/src/components/shared/OperationalImportExport.test.ts` proves the helper returns:
  - `SysGrid_External_2026-06-30_08-21-47.csv`
- the same test proves the download result no longer falls back to:
  - `SYSGRID_external_entities_Snapshot.csv`

Note:
- The backend `Content-Disposition` still advertises `SYSGRID_external_entities_Snapshot.csv`.
- The actual app download contract now uses the approved client-side local-time golden filename instead.

## 8. Files changed

- `backend/test_import_workflows.py`
- `frontend/src/components/External.tsx`
- `frontend/src/components/shared/OperationalImportExport.ts`
- `frontend/src/components/shared/OperationalImportExport.test.ts`
- `frontend/OUT-13-EXTERNAL-EXPORT-ROUNDTRIP-PROOF.md`

## 9. Focused tests run

Backend:

```bash
rtk pytest -q backend/test_import_workflows.py -k 'external_snapshot_export_exposes_round_trip_headers_for_browser_js'
```

Result:

```text
2 passed
```

Frontend:

```bash
rtk npm run test:unit -- src/components/shared/OperationalImportExport.test.ts
```

Result:

```text
1 file passed
3 tests passed
```

What the tests now fail on:
- `Access-Control-Expose-Headers` empty
- `Access-Control-Expose-Headers` equal to `*`
- `Access-Control-Expose-Headers` equal to `**`
- omission of any required exposed header
- External export filename reverting to `SYSGRID_external_entities_Snapshot.csv`
- filename shape without hour/minute/second

## 10. Manual browser retest checklist

1. Restart backend.
2. Refresh the browser.
3. Open `External -> Active`.
4. Open DevTools -> Network.
5. Clear existing requests.
6. Click `Export`.
7. Inspect `/api/v1/import/snapshot/external_entities`.
8. Confirm the response no longer has `Access-Control-Expose-Headers: **`.
9. Confirm the response includes:
   - `Access-Control-Expose-Headers: Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version`
   - `X-SysGrid-Import-Profile: external_entities`
   - `X-SysGrid-Schema-Version: 2026-06-external-v1`
10. Confirm the missing-profile toast is gone.
11. Confirm the downloaded filename follows:
    - `SysGrid_External_YYYY-MM-DD_HH-mm-ss.csv`
12. Open External Import preview.
13. Preview the exported file.
14. Confirm the exported file is accepted through the `external_entities` profile/schema flow.
