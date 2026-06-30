# OUT-8 Parallel Support Lane A: Full-Stack Artifact Packaging Audit

This report is read-only packaging support for OUT-8 Iteration 38. It documents what the current review artifact mechanism includes, what it omits, and what must be present so backend/frontend truth can be reviewed together.

## 1. Repository structure snapshot

Relevant root-level directories observed:

- `frontend/` - exists
- `backend/` - exists
- `docs/` - exists
- `scripts/` - exists
- `test-results/` - exists

Relevant Monitoring frontend areas observed:

- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/monitoring/MonitoringForm.tsx`
- `frontend/src/components/shared/OperationalBulkContract.ts`
- `frontend/src/components/shared/OperationalBulkContract.test.ts`
- `frontend/src/components/shared/OperationalRowActionMenu.tsx`
- `frontend/tests/monitoring-workflows.spec.ts`
- `frontend/tests/monitoring-comprehensive.spec.ts`
- `frontend/tests/resilience/monitoring-chaos.spec.ts`

Relevant Monitoring backend areas observed:

- `backend/app/api/monitoring.py`
- `backend/app/main.py` (router registration via `app.include_router(monitoring.router, prefix=settings.API_V1_STR)`)

Monitoring backend bulk-action / restore test coverage observed:

- `backend/test_monitoring_workflows.py`
- `backend/test_monitoring_query_and_bulk_edges.py`
- `backend/test_monitoring_restore_edges.py`
- `backend/tests/test_monitoring_helpers.py`

Evidence / report docs observed:

- `frontend/OUT-8-evidence-gap-closure.md`
- `frontend/OUT-8-human-validation-packet.md`
- `frontend/OUT-8-golden-lifecycle-contract-audit.md`
- `frontend/OUT-8-support-package-index.md`
- `frontend/RUN3-A-workspace-drift-matrix.md`
- `frontend/RUN3-B-bulk-contract-testpack.md`
- `frontend/RUN3-C-row-action-contract-testpack.md`
- `frontend/RUN3-D-api-action-contract-audit.md`
- `frontend/RUN3-E-ui-standard-acceptance-checklist.md`
- `frontend/RUN3-F-typecheck-build-blockers.md`
- `frontend/RUN3-G-implementation-roadmap.md`

Existence check summary:

- `frontend/` - yes
- `backend/` - yes
- Monitoring frontend component area - yes
- Monitoring backend API/route area - yes
- tests related to Monitoring backend bulk actions - yes
- evidence/report docs - yes

## 2. Current artifact behavior

Current artifact generation mechanism found:

- Script: `commit-push-zip.sh`
- Artifact output: `../frontend-debug-lean.zip`
- Working directory assumption: repository root. The script references `frontend/...` and `backend/...` relative to the current directory and writes the zip one level above root.

Current inclusion behavior is explicit file enumeration, not directory packaging.

Included paths in the current script:

- `frontend/OUT-8-evidence-gap-closure.md`
- `frontend/OUT-8-human-validation-packet.md`
- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/External.tsx`
- `frontend/src/components/ServicesReal.tsx`
- `frontend/src/components/shared/OperationalBulkContract.ts`
- `frontend/src/components/shared/OperationalBulkContract.test.ts`
- `frontend/src/components/shared/OperationalRowActionMenu.tsx`
- `backend/app/api/monitoring.py`
- `backend/test_monitoring_workflows.py`
- `backend/test_monitoring_query_and_bulk_edges.py`
- `backend/test_monitoring_restore_edges.py`

Observed current zip contents match that list exactly. The existing `frontend-debug-lean.zip` contains 12 files total.

Behavior summary:

- included directories: no whole directories; only individually listed files under `frontend/` and `backend/`
- excluded directories: everything not named explicitly is excluded in practice
- backend files included: yes
- frontend files included: yes
- evidence docs included: yes, but only two named docs
- test files included: yes, but only a narrow subset

Important omission pattern in the current mechanism:

- no recursive inclusion of all touched Monitoring files
- no automatic inclusion of router registration files
- no automatic inclusion of frontend e2e Monitoring specs
- no automatic inclusion of additional evidence docs unless they are added manually to the script

## 3. Prior failure prevention check

Known failure mode to prevent:

- artifact claims backend implementation changed
- uploaded zip contains frontend only
- backend source and backend tests are absent
- reviewer cannot validate backend truth

Current status against that failure mode:

- The current script is better than a frontend-only bundle because it does include backend source and backend tests.
- The current mechanism is still fragile because it is a hand-maintained allowlist. A backend change can be real but still absent from the zip if the file list is not updated.

Specific Iteration 38 risk:

- If Iteration 38 touches Monitoring backend behavior beyond `backend/app/api/monitoring.py`, the current artifact can still under-package the backend truth.
- If Iteration 38 relies on `backend/app/main.py`, `frontend/tests/monitoring-workflows.spec.ts`, or a new evidence report, those files will be missing unless explicitly added.

How the final Iteration 38 artifact must avoid the failure:

- Every touched or review-relevant backend file must be intentionally present in the artifact, not assumed.
- Every touched or review-relevant frontend file must also be present.
- At least one evidence report for Iteration 38 must be present.
- If runtime behavior depends on route wiring, the route registration file must be present.
- If review claims test proof, the touched or relied-on test files must be present.

## 4. Required file inclusion list for Iteration 38

Use this as the packaging checklist. Include each path if it was touched or if the Iteration 38 claim relies on it.

Monitoring frontend Revert call path:

- `frontend/src/components/MonitoringGrid.tsx`

Shared toast / lifecycle / bulk contract files if touched:

- `frontend/src/components/shared/OperationalBulkContract.ts`
- `frontend/src/components/shared/OperationalRowActionMenu.tsx`
- any shared toast or lifecycle helper actually modified for Iteration 38

Monitoring backend bulk-action route / handler:

- `backend/app/api/monitoring.py`

Backend route registration if relevant:

- `backend/app/main.py`

Backend test files if added or modified:

- `backend/test_monitoring_workflows.py`
- `backend/test_monitoring_query_and_bulk_edges.py`
- `backend/test_monitoring_restore_edges.py`
- `backend/tests/test_monitoring_helpers.py`

Frontend test files if added or modified:

- `frontend/tests/monitoring-workflows.spec.ts`
- `frontend/tests/monitoring-comprehensive.spec.ts`
- `frontend/tests/resilience/monitoring-chaos.spec.ts`
- `frontend/src/components/shared/OperationalBulkContract.test.ts`

Iteration 38 evidence report:

- the final Iteration 38 evidence/runtime report file
- if existing OUT-8 evidence docs are relied on, include them explicitly:
- `frontend/OUT-8-evidence-gap-closure.md`
- `frontend/OUT-8-human-validation-packet.md`

Files currently in the zip but not inherently required for Monitoring Revert proof:

- `frontend/src/components/External.tsx`
- `frontend/src/components/ServicesReal.tsx`

Those may be relevant only if shared runtime extraction genuinely touched or relied on them. They should not displace missing Monitoring/backend truth files.

## 5. Verification commands

Safe commands to verify artifact contents after packaging:

List zip tree:

```bash
rtk unzip -l frontend-debug-lean.zip
```

Check that backend Monitoring source is present:

```bash
rtk unzip -l frontend-debug-lean.zip | rtk proxy grep 'backend/app/api/monitoring.py'
```

Check that backend route registration is present if relevant:

```bash
rtk unzip -l frontend-debug-lean.zip | rtk proxy grep 'backend/app/main.py'
```

Check that frontend Monitoring source is present:

```bash
rtk unzip -l frontend-debug-lean.zip | rtk proxy grep 'frontend/src/components/MonitoringGrid.tsx'
```

Check that evidence report(s) are present:

```bash
rtk unzip -l frontend-debug-lean.zip | rtk proxy grep 'frontend/OUT-8'
```

Check that backend test files are present:

```bash
rtk unzip -l frontend-debug-lean.zip | rtk proxy grep 'backend/test_monitoring\|backend/tests/test_monitoring'
```

Count backend and frontend files:

```bash
rtk python - <<'PY'
import zipfile
z = zipfile.ZipFile("frontend-debug-lean.zip")
names = z.namelist()
print("backend_count", sum(1 for n in names if n.startswith("backend/")))
print("frontend_count", sum(1 for n in names if n.startswith("frontend/")))
PY
```

Fail fast on frontend-only packaging:

```bash
rtk python - <<'PY'
import sys, zipfile
names = zipfile.ZipFile("frontend-debug-lean.zip").namelist()
backend = [n for n in names if n.startswith("backend/")]
frontend = [n for n in names if n.startswith("frontend/")]
print("backend_files", len(backend))
print("frontend_files", len(frontend))
sys.exit(0 if backend and frontend else 1)
PY
```

## 6. PASS / PARTIAL / FAIL rubric for packaging only

- `PACKAGING PASS`: final artifact includes every touched or review-relevant frontend and backend file needed to evaluate Iteration 38 truth.
- `PACKAGING PARTIAL`: artifact includes source files but misses evidence docs, route wiring, or relied-on tests.
- `PACKAGING FAIL`: backend is claimed but backend source and/or backend test files needed for review are absent.
- `PACKAGING WORSE`: packaging excludes relevant modified files, hides route/test/evidence dependencies, or presents a misleading subset that blocks truthful review.

## 7. Final note

This report is packaging support only. It does not prove Monitoring Revert works and cannot close OUT-8 without Iteration 38 runtime proof and zip review.
