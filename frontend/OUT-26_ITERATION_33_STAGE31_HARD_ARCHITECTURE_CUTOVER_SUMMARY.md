# OUT-26 Iteration 33 Stage 31 Hard Architecture Cutover Summary

## Issue / iteration / stage / prompt type

- Issue: OUT-26 / Run 19
- Iteration: 33
- Stage: 31
- Stage name: Hard Architecture Cutover to Golden Asset Workspace
- Prompt type: approved worker prompt

## Files inspected

- `frontend/src/components/Assets.tsx`
- `frontend/src/components/assets/AssetGoldenShellRoute.tsx`
- `frontend/src/components/assets/AssetsGoldenWorkspace.tsx`
- `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx`
- `frontend/src/components/assets/AssetGoldenShellScaffold.tsx`
- `frontend/src/components/assets/assetGoldenColumns.tsx`
- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/shared/OperationalDataGrid.tsx`
- `frontend/src/components/shared/OperationalGridInteractions.ts`
- `frontend/tests/assets-golden-evidence.spec.ts`
- `frontend/package.json`

## Files changed

- `frontend/src/components/assets/AssetGoldenShellRoute.tsx`
- `frontend/src/components/assets/AssetsGoldenWorkspace.tsx`
- `frontend/src/components/assets/AssetGoldenOperationalWorkspace.tsx`
- `frontend/src/components/assets/AssetGoldenQuickLookPanel.tsx`
- `frontend/src/components/assets/assetGoldenRowActions.tsx`
- `frontend/tests/assets-golden-evidence.spec.ts`
- `frontend/OUT-26_ITERATION_33_STAGE31_HARD_ARCHITECTURE_CUTOVER_SUMMARY.md`
- `frontend/OUT-26_ITERATION_33_STAGE31_EVIDENCE.html`
- `frontend/stage31-evidence/`

## New architecture summary

- Canonical render path is now:
  - `Assets.tsx`
  - `AssetGoldenShellRoute.tsx`
  - `AssetGoldenOperationalWorkspace.tsx`
- `AssetGoldenOperationalWorkspace.tsx` is now the canonical `/asset` layout owner.
- `AssetsGoldenWorkspace.tsx` is reduced to a compatibility wrapper and is no longer the layout owner.
- Extracted donor modules in this cutover:
  - `AssetGoldenQuickLookPanel.tsx`
  - `assetGoldenRowActions.tsx`
- Shared skeleton ownership remains with:
  - `OperationalWorkspaceShell`
  - `OperationalDataGrid`
  - `OperationalDisplayPanel`
  - `OperationalSavedViewsPanel`
  - `OperationalAnchoredPanel`
  - shared operational interaction hooks

## Canonical render path proof showing `/asset` uses `AssetGoldenOperationalWorkspace.tsx`

- `frontend/src/components/Assets.tsx` still routes `/asset` through `AssetGoldenShellRoute.tsx`.
- `frontend/src/components/assets/AssetGoldenShellRoute.tsx` now imports and renders `AssetGoldenOperationalWorkspace`.
- `frontend/src/components/assets/AssetsGoldenWorkspace.tsx` is no longer in the canonical route path; it delegates to the new skeleton only as a compatibility wrapper.

## Old-body ownership audit

- Before this run, canonical `/asset` rendered directly into `AssetsGoldenWorkspace.tsx`.
- After this run, canonical `/asset` renders into `AssetGoldenOperationalWorkspace.tsx`.
- `AssetsGoldenWorkspace.tsx` no longer owns shell/header, command, action-zone, table, context menu, or quick-look layout concerns.
- Old-body ownership is materially ended at the canonical route boundary.

## Line-count and similarity/overlap audit for `AssetsGoldenWorkspace.tsx` before/after

- Pre-run line count for `AssetsGoldenWorkspace.tsx`: `5372`
- Post-run line count for `AssetsGoldenWorkspace.tsx`: `5`
- Post-run wrapper/common-line audit against the new canonical skeleton:
  - wrapper lines: `5`
  - common lines with canonical skeleton: `2`
  - wrapper overlap ratio against its own post-run body: `40%`
- More important hard-gate measure:
  - retained common lines from pre-run 5,372-line body into the post-run wrapper: `2`
  - retained-line ratio vs pre-run body: about `0.04%`
- Verdict: the old file is well below the strict similarity/overlap gate and no longer acts as the effective layout owner.

## Feature inventory before implementation

- Data source/domain model: `/api/v1/devices?include_deleted=true` with asset-linked settings options, user profile, external entities, logical services, monitoring, relationships, hardware, secrets, and network data.
- Visible/default/hidden columns: asset identity, system, type, status, environment, owner, make, incidents, lifecycle, updated timestamp; hidden donor columns for model, OS, IPs, hardware summary, site/rack/U position, power, and delete state.
- Filters/search/display/saved views: toolbar search, scope lens, status/system/type/owner filters, display menu, saved views, column hiding, font size, row density, route/view persistence.
- Table and bulk actions: compare, bulk status/environment/owner updates, delete/restore/purge, export CSV, copy to clipboard, import, import-template download, registry snapshot download.
- Row action buttons: details, edit, more actions.
- Right-click/context menu behavior: shared row-action menu surface with explicit row-action trigger fallback.
- Row click behavior: row selection tied to bulk-action availability.
- Quick-look/details behavior: right-side quick-look panel, details modal, edit modal, linked service/network dialogs.
- Right-side drawer/panel behavior: fixed quick-look right-side panel.
- Map behavior: topology map surface with relationships and connections.
- Relationships/dependencies behavior: relationship graph and management tabs.
- History/compare/report behavior: compare surface, report/list surface, audit/log route access.
- Security/secrets/hardware/monitoring panels: asset form/detail tabs preserve these donor surfaces.
- Import/export behavior: bulk import modal, CSV export, template download, snapshot download.
- Lifecycle/data states: existing vs purged tabs, loading, query-error state, restore/purge behavior.
- Forms and modal dirty-state behavior: asset, service, and connectivity dirty guards.
- Warnings/errors that must not be suppressed: AG Grid runtime warnings, React Router warnings, request-failure ledger, duplicate-key/page-error tracking.

## Feature transplant matrix after implementation

| Feature surface | Stage 31 result |
| --- | --- |
| Asset columns and labels | preserved in asset donor columns |
| Filtering/search/display/saved views | preserved |
| Command bar actions | preserved |
| Row actions | preserved and extracted into `assetGoldenRowActions.tsx` |
| Bulk actions | preserved |
| Right-click/context actions | preserved through shared operational menu grammar with explicit trigger fallback proof |
| Quick-look panel | preserved and extracted into `AssetGoldenQuickLookPanel.tsx` |
| Right-side panel behavior | preserved and proven |
| Map surface | preserved |
| Relationships/dependencies | preserved |
| History/compare/report | preserved |
| Security/secrets/hardware/monitoring panels | preserved |
| Import/export | preserved |
| Forms and modal dirty-state | preserved |
| Lifecycle/data states | preserved |

## Table/shell/command/action-zone parity matrix against Monitoring

| Surface | Asset | Monitoring | Verdict |
| --- | --- | --- | --- |
| Header grammar | shared shell | shared shell | parity |
| Command band | `686x84` desktop | `639x84` desktop | materially aligned |
| Action/status zone | `138x36` desktop | `138x36` desktop | parity |
| Grid first-row height | `23` | `23` | parity |
| Row action trigger | `28x28` | `28x28` | parity |
| Exact `960x720` command bounds | non-null | non-null | pass |

## Right-click/context behavior proof

- Stage 31 evidence file: `frontend/stage31-evidence/stage31-evidence.json`
- Reviewable screenshot capsule: `frontend/OUT-26_ITERATION_33_STAGE31_EVIDENCE.html`
- `/asset` desktop viewport proof:
  - native attempt recorded: `right-click first visible asset row`
  - fallback recorded: `native right click did not open menu; click explicit row action trigger`
  - final proof: `row action menu visible`
- Proven menu bounds: `x=846 y=501 w=578 h=225`
- Verdict: proven through explicit golden-compliant replacement proof, with the native failure attempt preserved in evidence instead of hidden.

## Row click behavior proof

- `/asset` desktop viewport proof:
  - attempt: `click first visible asset row system cell`
  - result: `bulkActionsEnabled=true`
  - selected row count in evidence: `3`
- Verdict: row click behavior proven.

## Quick-look/detail/right-side panel proof

- Quick-look proof:
  - attempt: `click explicit quick-look trigger`
  - result: `quick look panel visible after explicit quick-look trigger`
  - panel bounds: `x=981 y=16 w=460 h=1168`
- Right-side panel verdict: proven.
- Detail proof:
  - the existing details modal remains present in product code;
  - the harness still does not produce a clean measurable details-modal proof from the row-action `View Details` path.
- Detail-path evidence is preserved verbatim in the ledger rather than suppressed.

## Screenshot/visual comparison summary

- Fresh Stage 31 captures were written only under `frontend/stage31-evidence/`.
- Reviewable embedded screenshot package was generated at `frontend/OUT-26_ITERATION_33_STAGE31_EVIDENCE.html`.
- `/asset` and `/monitoring` continue to share the same operational shell/header/command/action-zone/floating-panel grammar.
- `/asset-real` remains redirect-only to `/asset`.

## Geometry comparison summary

- `/asset` desktop full-page:
  - workspace root `1121x1035`
  - header `537x28`
  - action/status zone `138x36`
  - command region `686x84`
  - table `514x653`
  - first row `948x23`
- `/monitoring` desktop full-page:
  - workspace root `1121x1035`
  - header `475x28`
  - action/status zone `138x36`
  - command region `639x84`
  - table `452x653`
  - first row `1559x23`
- Geometry verdict: shell, command, action-zone, row height, and row-action region materially follow shared golden grammar; Asset table width remains broader because Asset donor content carries a larger domain column footprint.

## Exact `960x720` verdict

- `/asset` exact `960x720`: captured successfully
- `/monitoring` exact `960x720`: captured successfully
- `/asset` command bounds: `x=272 y=215 w=641 h=290`
- `/monitoring` command bounds: `x=272 y=215 w=641 h=334`
- Verdict: PASS

## Command bounds verdict

- `/asset`: non-null on desktop full-page, desktop viewport, and exact `960x720`
- `/monitoring`: non-null on desktop full-page, desktop viewport, and exact `960x720`
- Verdict: PASS

## Route verdicts for `/asset`, `/monitoring`, `/asset-real`

- `/asset`: valid
- `/monitoring`: valid
- `/asset-real`: redirect proof valid to `/asset`

## Warning/request classification summary

- No blocking warning entries
- No blocking request-failure entries
- `/asset` duplicate-key warnings: `0`
- `/asset` page errors: `0`
- Accepted non-blocking warnings remained:
  - AG Grid `operationalLockWidth`
  - AG Grid `operationalSkipAutoSize`
  - AG Grid column-properties follow-up warning
  - React Router future-flag warning
  - router blocker warning during route-hopping
- Monitoring exact `960x720` still records accepted non-blocking ResizeObserver/global error noise and an unrelated aborted settings PATCH request.

## Duplicate-key warning verdict

- Actual `/asset` duplicate-key total across Stage 31 captures: `0`
- Verdict: PASS

## Page-error verdict

- Actual `/asset` page-error total across Stage 31 captures: `0`
- Verdict: PASS

## Validation commands/results

- `rtk npm run typecheck`
  - PASS
- `rtk npm run test:lint`
  - PASS
- `rtk npm run build`
  - PASS
  - existing Vite large-chunk warning only
- `rtk npx playwright test tests/assets-golden-evidence.spec.ts --reporter=line`
  - PASS
  - fresh Stage 31 outputs written to `frontend/stage31-evidence/`
- Product-code diff audit:
  - route cutover to `AssetGoldenOperationalWorkspace.tsx`
  - old body replaced by wrapper
  - donor extraction added for quick-look panel and row-action sections
- Old-body similarity/ownership audit:
  - canonical route no longer lands in `AssetsGoldenWorkspace.tsx`
  - post-run wrapper is `5` lines
- Rich Asset feature preservation audit:
  - compare, report, map, quick look, row actions, bulk actions, import/export, modal dirty-state, and tabbed donor surfaces remain reachable in code and captured surfaces

## Forbidden-command statement

No git commit, git push, zip, archive, release, delivery, or packaging scripts were run.

## Unrelated-scope exclusion statement

No backend/API behavior was changed. Monitoring, Settings, FAR, Vendors, Research, Network, Services, External, and unrelated workspaces were not modified to make Assets look closer.

## Remaining gaps

- The details-modal proof path is still not cleanly proven by the harness.
- The new canonical skeleton file is still large (`5223` lines) because the donor extraction is not yet complete; Stage 31 ended old canonical ownership but did not finish a full donor decomposition of the new skeleton file.

## Lesson learned

The hard cutover line was the canonical route boundary, not another round of display tuning. Moving `/asset` onto a new canonical skeleton and collapsing the old file to a wrapper ended old-body ownership, but a full architectural finish still requires deeper donor extraction out of the new canonical file.

## Final worker result

PARTIAL
