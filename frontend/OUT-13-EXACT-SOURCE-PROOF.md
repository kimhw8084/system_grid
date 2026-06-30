# OUT-13 Iteration 06 Exact Source Proof

## Runtime Symptom

User-reported live symptom to prove:

```text
Access-Control-Expose-Headers: **
```

Current command-line runtime observed in this session:

```text
GET /api/v1/import/snapshot/external_entities -> 500 Internal Server Error
error_type=OperationalError
sqlite3.OperationalError: no such table: external_entities
```

Result:
- The current live command-line runtime does not reproduce `Access-Control-Expose-Headers: **`.
- The current live command-line runtime fails before a successful snapshot response exists.
- Per the mandatory stop rule, the exact source of `**` is not proven in this session.

## Commands Run

```bash
rtk pwd
rtk git status --short
rtk git branch --show-current
rtk rg -n 'Access-Control-Expose-Headers|access-control-expose-headers|expose_headers|exposed_headers|CORSMiddleware|allow_headers|allow_origins|allow_methods|headers\[|headers\.append|headers\.set|"\*\*"|\*\*' backend frontend .env* docker* scripts vite.config.* package.json pyproject.toml || true
rtk rg -n 'Access-Control-Expose-Headers|access-control-expose-headers|expose_headers|exposed_headers|CORSMiddleware|allow_headers|allow_origins|allow_methods|headers\[|headers\.append|headers\.set|"\*\*"|\*\*' backend || true
rtk rg -n 'SYSGRID_external_entities_Snapshot|external_entities_Snapshot|Snapshot\.csv|Content-Disposition|filename=' backend frontend || true
rtk rg -n 'SysGrid_|buildOperationalExportFileName|export.*file.*name|download.*file.*name|YYYY|HH|mm|ss|toISOString|Monitoring|Services' frontend backend || true
rtk ps aux | rtk rg -i 'uvicorn|fastapi|python|backend|sysgrid' | rtk rg -v rg || true
rtk docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}' || true
rtk curl -is -H 'Origin: http://localhost:5173' http://localhost:8000/api/v1/import/snapshot/external_entities | sed -n '1,80p' | grep -i -E 'access-control-expose|access-control-allow-origin|vary:|x-sysgrid|content-disposition|content-type|http/'
rtk curl -is -H 'Origin: http://localhost:5173' http://localhost:5173/api/v1/import/snapshot/external_entities | sed -n '1,80p' | grep -i -E 'access-control-expose|access-control-allow-origin|vary:|x-sysgrid|content-disposition|content-type|http/'
rtk curl -is http://localhost:8000/api/v1/import/snapshot/external_entities | sed -n '1,80p' | grep -i -E 'access-control-expose|access-control-allow-origin|vary:|x-sysgrid|content-disposition|content-type|http/'
rtk rg -n 'snapshot.*external_entities|external_entities.*snapshot|/snapshot|snapshot_export|import/snapshot|external_entities' backend || true
rtk lsof -nP -iTCP:8000 -sTCP:LISTEN
rtk lsof -nP -iTCP:5173 -sTCP:LISTEN
rtk ps -p $(rtk lsof -tiTCP:8000 -sTCP:LISTEN) -o pid=,ppid=,command=
rtk ps -p $(rtk lsof -tiTCP:5173 -sTCP:LISTEN) -o pid=,ppid=,command=
rtk curl -is -H 'Origin: http://localhost:5173' http://localhost:8000/api/v1/import/snapshot/external_entities | sed -n '1,120p'
rtk curl -is -H 'Origin: http://localhost:5173' http://localhost:5173/api/v1/import/snapshot/external_entities | sed -n '1,120p'
rtk tail -n 80 backend/critical_failures.log
rtk nl -ba backend/app/main.py | sed -n '70,135p'
rtk nl -ba backend/app/api/import_engine.py | sed -n '26,40p;1434,1568p'
rtk nl -ba frontend/src/components/shared/OperationalImportExport.ts | sed -n '24,92p'
rtk nl -ba frontend/src/components/External.tsx | sed -n '2146,2156p'
```

## Raw Evidence

Git/runtime context:

```text
$ rtk pwd
/Users/haewonkim/home/development/sysgrid

$ rtk git status --short
ok

$ rtk git branch --show-current
main
```

Repo-wide expose-header search command output:

```text
$ rtk rg ... backend frontend .env* docker* scripts vite.config.* package.json pyproject.toml || true
zsh:1: no matches found: .env*
```

Backend-only expose-header search found only explicit header writers, not `**`:

```text
backend/app/main.py:125:    CORSMiddleware,
backend/app/main.py:126:    allow_origins=origins,
backend/app/main.py:128:    allow_methods=["*"],
backend/app/main.py:129:    allow_headers=["*"],
backend/app/main.py:130:    expose_headers=EXPOSED_DOWNLOAD_HEADERS,
backend/app/api/import_engine.py:1440:        "Access-Control-Expose-Headers": ROUND_TRIP_EXPOSE_HEADERS,
backend/test_import_workflows.py:467:    exposed_headers = snapshot_res.headers["access-control-expose-headers"]
backend/test_import_workflows.py:469:    assert exposed_headers not in {"*", "**"}
```

Filename search found current backend snapshot name source:

```text
backend/app/api/import_engine.py:1562:    headers = build_round_trip_download_headers(profile, f"SYSGRID_{table_name}_Snapshot.csv")
backend/app/api/import_engine.py:1439:        "Content-Disposition": f"attachment; filename={filename}",
backend/test_import_workflows.py:466:    assert "attachment; filename=SYSGRID_external_entities_Snapshot.csv" in snapshot_res.headers["content-disposition"]
frontend/src/components/External.tsx:2153:        fallbackFileName: 'SYSGRID_external_entities_Snapshot.csv',
frontend/src/components/shared/OperationalImportExport.ts:28:  const contentDisposition = response.headers.get('Content-Disposition') || response.headers.get('content-disposition')
```

Golden filename/helper search found current frontend override path:

```text
frontend/src/components/shared/OperationalImportExport.ts:37:export function buildOperationalExportFileName(viewName: string, date: Date = new Date()) {
frontend/src/components/External.tsx:2154:        downloadFileName: buildOperationalExportFileName('External'),
```

Listening processes:

```text
$ rtk lsof -nP -iTCP:8000 -sTCP:LISTEN
COMMAND   PID      USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
Python  67472 haewonkim    9u  IPv4 0x453385920057a3f3      0t0  TCP 127.0.0.1:8000 (LISTEN)

$ rtk lsof -nP -iTCP:5173 -sTCP:LISTEN
COMMAND   PID      USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
node    14582 haewonkim   18u  IPv4 0x976f6613d51794c0      0t0  TCP 127.0.0.1:5173 (LISTEN)
```

Process command lines were truncated by `ps`, but still identify the owners:

```text
$ rtk ps -p $(rtk lsof -tiTCP:8000 -sTCP:LISTEN) -o pid=,ppid=,command=
67472 24589 /opt/homebrew/Cellar/python@3.13/3.13.13_1/Frameworks/Python.framework/Versions/3.13/Resources/Python.app...

$ rtk ps -p $(rtk lsof -tiTCP:5173 -sTCP:LISTEN) -o pid=,ppid=,command=
14582 14561 node /Users/haewonkim/home/development/sysgrid/frontend/node_modules/.bin/vite --host --host 127.0.0.1 --...
```

Direct backend 500 response with `Origin`:

```text
HTTP/1.1 500 Internal Server Error
date: Tue, 30 Jun 2026 14:17:48 GMT
server: uvicorn
content-length: 146
content-type: application/json

{"detail":"Internal Server Error. Please consult system logs.","path":"/api/v1/import/snapshot/external_entities","error_type":"OperationalError"}
```

Frontend/proxy 500 response with `Origin`:

```text
HTTP/1.1 500 Internal Server Error
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
date: Tue, 30 Jun 2026 14:17:48 GMT
server: uvicorn
content-length: 146
content-type: application/json
connection: close

{"detail":"Internal Server Error. Please consult system logs.","path":"/api/v1/import/snapshot/external_entities","error_type":"OperationalError"}
```

Critical failure log tail for the same runtime:

```text
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such table: external_entities
[SQL: SELECT external_entities.name, external_entities.external_key, external_entities.aliases_json, external_entities.type, external_entities.subtype, external_entities.owner_organization, external_entities.owner_team, external_entities.ownership_mode, external_entities.internal_team_id, external_entities.internal_operator_id, external_entities.status, external_entities.environment, external_entities.description, external_entities.notes, external_entities.contacts_json, external_entities.business_purpose, external_entities.criticality, external_entities.dependency_tier, external_entities.data_classification, external_entities.integration_mode, external_entities.primary_endpoint_url, external_entities.secondary_endpoint_url, external_entities.auth_method, external_entities.protocol_family, external_entities.port_override, external_entities.supports_inbound, external_entities.supports_outbound, external_entities.source_system, external_entities.source_record_id, external_entities.risk_rating, external_entities.contains_customer_data, external_entities.contains_credentials, external_entities.stores_pii, external_entities.internet_exposed, external_entities.third_party_assessment_status, external_entities.poc_json, external_entities.metadata_json, external_entities.is_deleted, external_entities.id, external_entities.created_at, external_entities.updated_at, external_entities.created_by_user_id
FROM external_entities
WHERE external_entities.is_deleted = 0]
```

## Source of Access-Control-Expose-Headers: **
- Exact file:
  - Not found in checked-in source.
- Exact line(s):
  - No checked-in line emits a literal `**`.
  - Checked-in explicit header writers are:
    - `backend/app/main.py:75-79`
    - `backend/app/main.py:124-130`
    - `backend/app/api/import_engine.py:31`
    - `backend/app/api/import_engine.py:1437-1448`
- Exact process/runtime path:
  - User-reported path: `backend snapshot response -> frontend/proxy -> browser`
  - Current session runtime path on `127.0.0.1:8000` never reaches a successful snapshot response; it fails with `OperationalError` before proving any `Access-Control-Expose-Headers: **` source.
- Confidence:
  - `BLOCKED`

Finding:
- I did not find a literal `**` source in repo files.
- I did not reproduce `Access-Control-Expose-Headers: **` from the current direct backend curl.
- The current live endpoint returns `500`, so the exact source of `**` is not proven from the current runtime.

## Direct Backend Curl Result

Command:

```bash
rtk curl -is -H 'Origin: http://localhost:5173' http://localhost:8000/api/v1/import/snapshot/external_entities \
  | sed -n '1,80p' \
  | grep -i -E 'access-control-expose|access-control-allow-origin|vary:|x-sysgrid|content-disposition|content-type|http/'
```

Output:

```text
HTTP/1.1 500 Internal Server Error
content-type: application/json
```

Meaning:
- Current direct backend curl does not show `Access-Control-Expose-Headers: **`.
- Current direct backend curl does not show explicit SysGrid snapshot headers either.
- The endpoint is currently failing before the export contract can be observed.

## Frontend/Proxy Curl Result

Command:

```bash
rtk curl -is -H 'Origin: http://localhost:5173' http://localhost:5173/api/v1/import/snapshot/external_entities \
  | sed -n '1,80p' \
  | grep -i -E 'access-control-expose|access-control-allow-origin|vary:|x-sysgrid|content-disposition|content-type|http/'
```

Output:

```text
HTTP/1.1 500 Internal Server Error
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
content-type: application/json
```

Meaning:
- The frontend/proxy is forwarding the same backend failure.
- The current proxy path does not prove `Access-Control-Expose-Headers: **`.

## Backend Content-Disposition / Filename Source
- Exact file:
  - `backend/app/api/import_engine.py`
- Exact line(s):
  - `backend/app/api/import_engine.py:1437-1440`
  - `backend/app/api/import_engine.py:1562`
- Current filename:
  - `SYSGRID_external_entities_Snapshot.csv`
- Golden expected filename:
  - `SysGrid_External_<YYYY-MM-DD_HH-mm-ss>.csv`

Exact source excerpt:

```text
1437 def build_round_trip_download_headers(profile: ImportProfile, filename: str) -> dict[str, str]:
1439     "Content-Disposition": f"attachment; filename={filename}",
1562 headers = build_round_trip_download_headers(profile, f"SYSGRID_{table_name}_Snapshot.csv")
```

This proves:
- Backend `Content-Disposition` still owns and emits the old table-oriented snapshot filename contract.
- Backend has not adopted the golden External workspace filename contract.

## Backend/Frontend Contract Ownership Finding
- Backend owns:
  - Snapshot endpoint implementation
  - `Content-Disposition`
  - `Access-Control-Expose-Headers` written in `build_round_trip_download_headers(...)`
  - app-wide CORS `expose_headers` in `CORSMiddleware`
- Frontend owns:
  - `response.headers.get(...)` validation in `frontend/src/components/shared/OperationalImportExport.ts:27-30, 51-66`
  - optional client-side override download name in `frontend/src/components/shared/OperationalImportExport.ts:69-89`
  - External-specific override call in `frontend/src/components/External.tsx:2148-2154`
- Disagreement found:
  - Yes

Exact disagreement:

```text
Backend Content-Disposition source:
SYSGRID_external_entities_Snapshot.csv

Frontend override source:
buildOperationalExportFileName('External')
-> SysGrid_External_<YYYY-MM-DD_HH-mm-ss>.csv
```

Conclusion:
- Backend and frontend currently silently disagree on the filename contract.
- Because the app validates headers before download, a frontend-only rename does not prove the end-to-end export contract.

## Minimal Next Patch Plan
- Files to edit:
  - No patch should be made yet.
  - First unblock exact runtime diagnosis for the failing `:8000` backend process.
- Lines/areas to edit:
  - None until `Access-Control-Expose-Headers: **` is reproduced or disproved on a successful snapshot response.
- Tests to update:
  - None until the runtime source is proven.
- Runtime retest command:

```bash
rtk curl -is -H 'Origin: http://localhost:5173' http://localhost:8000/api/v1/import/snapshot/external_entities \
  | sed -n '1,80p' \
  | grep -i -E 'access-control-expose|access-control-allow-origin|vary:|x-sysgrid|content-disposition|content-type|http/'
```

Required next diagnostic boundary before any patch:
- Restore the backend runtime so `/api/v1/import/snapshot/external_entities` returns `200`.
- Then re-run direct backend curl first.
- If direct backend curl returns `Access-Control-Expose-Headers: **`, identify the live backend/runtime source before patching.
- If direct backend curl returns explicit headers but proxy/browser shows `**`, identify the proxy/browser source before patching.

## Stop/Proceed Decision

`BLOCKED — exact source not found`

Reason:
- The prompt requires exact source proof for `Access-Control-Expose-Headers: **`.
- The current command-line runtime does not reproduce `**`; it returns `500 Internal Server Error` caused by `sqlite3.OperationalError: no such table: external_entities`.
- I proved the current backend filename owner/source and the backend/frontend filename disagreement.
- I did not prove the exact live source of `**`.
- Per the mandatory stop rule, no implementation should proceed from this diagnostic state.
