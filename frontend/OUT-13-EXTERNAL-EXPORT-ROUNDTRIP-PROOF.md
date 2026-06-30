# OUT-13 External Export Round-Trip Proof

## Verdict

`PATCHED`

Scope:
- confirmed backend root cause only
- no DB or table investigation
- no route, modal, table, lifecycle, saved-view, or OUT-14 work

## Files changed

- `backend/app/api/import_engine.py`
- `backend/app/main.py`
- `backend/test_import_workflows.py`
- `frontend/src/components/External.tsx`
- `frontend/src/components/shared/OperationalImportExport.ts`
- `frontend/src/components/shared/OperationalImportExport.test.ts`
- `frontend/OUT-13-EXTERNAL-EXPORT-ROUNDTRIP-PROOF.md`

## Exact code that prevents `Access-Control-Expose-Headers` from becoming `**`

Backend now defines the export-exposed headers once and reuses that exact contract in both the response builder and FastAPI CORS middleware.

In `backend/app/api/import_engine.py`:

```python
ROUND_TRIP_EXPOSE_HEADER_NAMES = (
    "Content-Disposition",
    "X-SysGrid-Import-Profile",
    "X-SysGrid-Schema-Version",
)
ROUND_TRIP_EXPOSE_HEADERS = ", ".join(ROUND_TRIP_EXPOSE_HEADER_NAMES)
```

```python
def build_round_trip_download_headers(profile: ImportProfile, filename: str) -> dict[str, str]:
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Access-Control-Expose-Headers": ROUND_TRIP_EXPOSE_HEADERS,
    }
```

In `backend/app/main.py`:

```python
from .api.import_engine import ROUND_TRIP_EXPOSE_HEADER_NAMES

EXPOSED_DOWNLOAD_HEADERS = list(ROUND_TRIP_EXPOSE_HEADER_NAMES)

app.add_middleware(
    CORSMiddleware,
    ...,
    expose_headers=EXPOSED_DOWNLOAD_HEADERS,
)
```

This removes duplicated string definitions and forces the successful 200 export response and CORS middleware to use the same explicit header list:

```text
Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version
```

## Backend filename contract

External snapshot exports now set:

```text
Content-Disposition: attachment; filename=SysGrid_External_YYYY-MM-DD_HH-mm-ss.csv
```

Implemented in `backend/app/api/import_engine.py`:

```python
def build_snapshot_filename(profile: ImportProfile) -> str:
    if profile.key == "external_entities":
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        return f"SysGrid_External_{timestamp}.csv"
    return f"SYSGRID_{profile.key}_Snapshot.csv"
```

The snapshot route now uses `build_snapshot_filename(profile)` for the 200 response.

## Frontend/backend filename alignment

The frontend no longer overrides the backend export filename for External export.

Removed:
- client-side `downloadFileName` override
- client-side `buildOperationalExportFileName('External')` export path

Current behavior:
- browser download name comes from backend `Content-Disposition`
- if the backend contract changes, frontend no longer silently disagrees

## Required test proof

Backend test:
- `backend/test_import_workflows.py::test_external_snapshot_export_exposes_round_trip_headers_for_browser_js`

What it proves:
- `Access-Control-Expose-Headers` is not `*`
- `Access-Control-Expose-Headers` is not `**`
- `Access-Control-Expose-Headers` equals:
  - `Content-Disposition, X-SysGrid-Import-Profile, X-SysGrid-Schema-Version`
- exposed headers include:
  - `Content-Disposition`
  - `X-SysGrid-Import-Profile`
  - `X-SysGrid-Schema-Version`
- `Content-Disposition` does not remain:
  - `attachment; filename=SYSGRID_external_entities_Snapshot.csv`
- `Content-Disposition` matches:
  - `attachment; filename=SysGrid_External_YYYY-MM-DD_HH-mm-ss.csv`

Frontend test:
- `frontend/src/components/shared/OperationalImportExport.test.ts`

What it proves:
- the browser uses backend `Content-Disposition` for the download name
- header validation still fails if schema metadata is missing

## Manual retest after restart

1. Restart the backend.
2. Open `External -> Active -> Export`.
3. Confirm the download succeeds.
4. Confirm there is no missing-profile toast.
5. In console `fetch`, confirm:
   - `response.headers.get('X-SysGrid-Import-Profile') === 'external_entities'`
   - `response.headers.get('X-SysGrid-Schema-Version') === '2026-06-external-v1'`
6. Confirm the downloaded filename matches:
   - `SysGrid_External_YYYY-MM-DD_HH-mm-ss.csv`
7. Confirm the exported file previews through External Import.
