# OUT-26 Iteration 31 Stage 29 Assets Golden Product-Lock Summary

## Issue / iteration / stage / prompt type
- Issue: OUT-26 / Run 19 — Assets Golden Template Implementation
- Iteration: 31
- Stage: 29
- Prompt type: Approved Stage 29 Assets Golden Product-Lock Worker Prompt

## Files inspected
- `frontend/src/components/Assets.tsx`
- `frontend/src/components/assets/AssetGoldenShellRoute.tsx`
- `frontend/src/components/assets/AssetsGoldenWorkspace.tsx`
- `frontend/src/components/assets/AssetGoldenShellScaffold.tsx`
- `frontend/src/components/assets/assetGoldenColumns.tsx`
- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/SettingsStandards.tsx`
- `frontend/src/components/shared/OperationalDataGrid.tsx`
- `frontend/src/components/shared/OperationalGridStandard.tsx`
- `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
- `frontend/src/index.css`
- `frontend/tests/assets-golden-evidence.spec.ts`
- `frontend/scripts/generate-stage28-proof.mjs`
- `frontend/stage28-evidence/stage28-evidence.json`

## Files changed
- `frontend/src/components/assets/AssetsGoldenWorkspace.tsx`
- `frontend/stage28-evidence/asset-desktop-fullpage.png`
- `frontend/stage28-evidence/asset-desktop-viewport.png`
- `frontend/stage28-evidence/asset-960x720.png`
- `frontend/stage28-evidence/monitoring-desktop-fullpage.png`
- `frontend/stage28-evidence/monitoring-desktop-viewport.png`
- `frontend/stage28-evidence/monitoring-960x720.png`
- `frontend/stage28-evidence/asset-real-desktop-viewport.png`
- `frontend/stage28-evidence/stage28-evidence.json`
- `frontend/stage28-evidence/validation-ledger.json`
- `frontend/stage28-evidence/proof-manifest.json`
- `frontend/OUT-26_ITERATION_30_STAGE28_ROUTE_RENDER_PROOF.md`
- `frontend/OUT-26_ITERATION_30_STAGE28_GEOMETRY_CAPTURE_PROOF.md`
- `frontend/OUT-26_ITERATION_30_STAGE28_COMMAND_BOUNDS_PROOF.md`
- `frontend/OUT-26_ITERATION_30_STAGE28_WARNING_CLASSIFICATION_PROOF.md`
- `frontend/OUT-26_ITERATION_30_STAGE28_960X720_PROOF.md`
- `frontend/OUT-26_ITERATION_30_STAGE28_PRODUCT_CODE_LOCK_AUDIT.md`
- `frontend/OUT-26_ITERATION_30_STAGE28_VALIDATION_LEDGER.md`
- `frontend/OUT-26_ITERATION_30_STAGE28_PROOF_COMPLETION_SUMMARY.md`
- `frontend/OUT-26_ITERATION_30_STAGE28_EVIDENCE.html`

## Before/after statement for `/asset` table grammar
- Before this attempt, `/asset` booted into an asset-specific grid state with larger row density, hidden filter bar, a much wider default column set, and local AG Grid overrides that pulled the table grammar away from Monitoring.
- After this attempt, `/asset` boots with Monitoring-aligned density and filter visibility, uses a narrower default visible column set while preserving the full asset column catalog in Display, and no longer applies the extra asset-local header/cell alignment overrides.

## Golden-template acceptance matrix against `/monitoring`
| Area | Verdict | Notes |
| --- | --- | --- |
| Shared shell/header framing | PASS | Same workspace root bounds (`1121x1035`) and shared shell composition. |
| Command bar relationship | PASS | Non-null command region on both routes; `/asset` `686x84`, `/monitoring` `639x84`. |
| Filter row / table offset | PASS | Both desktop captures place the table at `y=482` after the visible filter row. |
| Table frame | PASS | Both use the shared operational grid frame; `/asset` table `518x653`, `/monitoring` `456x653`. |
| Row height / density | PASS | First row height aligned at `23px` in both desktop captures. |
| Cell/header grammar | PASS | Asset-specific local AG Grid alignment overrides removed; shared grammar now governs. |
| Row action placement | PASS | Right-edge row action region remains non-null and aligned (`28x28`). |
| Asset-specific domain preservation | PASS | Asset columns, surfaces, bulk actions, and domain labels remain asset-owned. |
| Detail/quick-look validation | PARTIAL | Harness safe-open attempts remained null on both `/asset` and `/monitoring`; bounded validation gap only. |

## Asset behavior preservation checklist
- Quick look/details: preserved in source path; not proven open by harness in this run.
- Asset map: preserved; `Surfaces` control still switches to map/report views.
- Relationships/dependencies: preserved in asset detail and map code paths.
- Asset details/forms: preserved; add/edit/detail routes untouched.
- History/compare/report: preserved; compare/report flows still mounted.
- Row and bulk actions: preserved; row-action menu and bulk panel still rendered/measured.
- Security/secrets/hardware/monitoring panels: preserved in detail/quick-look source.
- Import/export behavior: preserved; Import and Export actions unchanged.
- Display/saved views: preserved; defaults changed, controls unchanged.
- Lifecycle/data states: preserved; inventory/purged tab contract unchanged.
- Modal/form dirty-state behavior: preserved; no modal contract changes made.
- Asset schema/endpoints/validation/relationship logic/map data: preserved; no backend/API edits made.

## Clone-drift/regression checklist
- Monitoring source unchanged: yes.
- Settings source unchanged: yes.
- `/asset-real` redirect-only behavior unchanged: yes.
- Backend/API behavior changed: no.
- Shared component edits required: no.
- Asset rich behavior deleted: no.
- Warnings hidden/suppressed: no.

## Route verdicts
- `/asset`: PASS; rendered at `http://127.0.0.1:5173/asset?search=PW-ASSET-A-1783263450257-oz4j5n`.
- `/monitoring`: PASS; rendered at `http://127.0.0.1:5173/monitoring`.
- `/asset-real`: PASS; final URL redirected to `http://127.0.0.1:5173/asset?search=PW-ASSET-A-1783263450257-oz4j5n`.

## Geometry/visual evidence summary
- Desktop full-page and viewport captures exist for `/asset` and `/monitoring`.
- Exact `960x720` captures exist for `/asset` and `/monitoring`.
- Workspace root, header, action/status zone, command region, table, first row, and row action region are all non-null in required captures.
- The refreshed `/asset` screenshots are materially closer to `/monitoring`: visible filters, matching table start position, matching row height, matching row-action placement, and a narrower default column grammar that no longer reads as a different table product.

## Exact `960x720` verdict
- PASS. `/asset` and `/monitoring` exact `960x720` screenshots were captured successfully.

## Command bounds verdict
- PASS. Required command bounds were non-null for `/asset` and `/monitoring` in desktop and exact `960x720` captures.

## Warning/request classification summary
- PASS with accepted non-blocking noise only.
- Console warnings were limited to accepted AG Grid colDef validation warnings, the React Router future-flag warning, and one router-blocker warning during harness route hopping.
- Request failures were limited to classified unrelated `net::ERR_ABORTED` GET aborts during route transitions after render.

## Duplicate-key warning verdict
- PASS. Duplicate-key count was zero across `/asset` desktop full-page, viewport, and exact `960x720` captures.

## Page-error verdict
- PASS. Page-error count was zero across `/asset` captures.

## Validation commands/results
- `curl -I http://127.0.0.1:5173` -> PASS (`HTTP/1.1 200 OK`)
- `curl -i http://127.0.0.1:8000/api/v1/health` -> PASS (`HTTP/1.1 200 OK`; `status=online`)
- `cd frontend && npm run typecheck` -> PASS
- `cd frontend && npm run test:lint` -> PASS
- `cd frontend && npm run build` -> PASS (chunk-size warning only)
- `cd frontend && npx playwright test tests/assets-golden-evidence.spec.ts --reporter=line` -> PASS (`1 passed`, refreshed accepted harness evidence)
- `git diff --name-only -- frontend` -> PASS (diff limited to canonical asset source plus evidence/proof artifacts)

## Forbidden-command statement
- No forbidden commands were run: no `git commit`, `git push`, packaging, archive, release, or zip actions.

## Unrelated-scope exclusion statement
- No Monitoring, Settings, backend, route-lock, or unrelated workspace source files were modified to make Assets parity easier.

## Remaining gaps
- Harness safe-open attempts still did not produce a measurable detail/quick-look dialog on either `/asset` or `/monitoring`; this is documented as a bounded validation gap rather than a product regression.

## Lesson learned
- The parity miss was primarily default-state drift, not route ownership drift: aligning the canonical asset workspace boot state and removing local grid overrides produced a materially closer render without cloning Monitoring or deleting asset-specific behavior.

## Final worker result
- PARTIAL. The actual rendered `/asset` table/workspace is materially closer to `/monitoring`, route behavior is unchanged, required evidence was captured, and validation passed; the remaining bounded gap is harness-level proof of detail/quick-look opening rather than visible table grammar.
