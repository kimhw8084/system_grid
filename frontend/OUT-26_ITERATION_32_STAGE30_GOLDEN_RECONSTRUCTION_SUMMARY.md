# OUT-26 Iteration 32 Stage 30 Golden Reconstruction Summary

## Issue / iteration / stage / prompt type

- Issue: OUT-26 / Run 19
- Iteration: 32
- Stage: 30
- Stage name: Golden Template Reconstruction with Asset Feature Transplant
- Prompt type: approved worker prompt

## Methodology statement: Monitoring/shared skeleton + Asset feature donor

`/asset` remains mounted through the shared operational workspace shell and grid primitives, and this Stage 30 pass moved Asset row selection, row-action opening, and context-menu behavior onto the same shared operational interaction grammar used by golden workspaces instead of leaving those behaviors as Asset-local bespoke handling.

Monitoring/shared primitives remained the skeleton source of truth. Asset-specific columns, filters, row actions, quick look, import/export, compare, report, map, details, and domain forms remain Asset-domain surfaces mounted into that skeleton.

## Files inspected

- `frontend/src/components/assets/AssetGoldenShellRoute.tsx`
- `frontend/src/components/assets/AssetsGoldenWorkspace.tsx`
- `frontend/src/components/assets/AssetGoldenShellScaffold.tsx`
- `frontend/src/components/assets/assetGoldenColumns.tsx`
- `frontend/src/components/AssetGrid_Legacy.tsx`
- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/shared/OperationalDataGrid.tsx`
- `frontend/src/components/shared/OperationalGridInteractions.ts`
- `frontend/src/components/shared/OperationalWorkspacePrimitives.tsx`
- `frontend/tests/assets-golden-evidence.spec.ts`
- `frontend/package.json`

## Files changed

- `frontend/src/components/assets/AssetsGoldenWorkspace.tsx`
- `frontend/src/components/assets/assetGoldenColumns.tsx`
- `frontend/tests/assets-golden-evidence.spec.ts`
- `frontend/OUT-26_ITERATION_32_STAGE30_GOLDEN_RECONSTRUCTION_SUMMARY.md`

## Asset feature inventory before implementation

- Data source and domain model: `/api/v1/devices?include_deleted=true` plus settings options, user profile, external entities, and on-demand asset-linked device services, monitoring, relationships, hardware, secrets, and network data.
- Visible/default columns: asset identity, system, type, status, environment, owner, make, incidents, lifecycle, updated timestamp; hidden-by-default donor columns included model, OS, IPs, hardware summary, site/rack/U position, power, delete state, and update time.
- Filters/search/display/saved views: toolbar search, scope lens, status/system/type/owner filters, display menu, saved views, hidden columns, font size, row density, route param persistence.
- Table actions and bulk actions: compare, bulk status/environment/owner updates, delete/restore/purge, export CSV, clipboard copy, import, template/snapshot export.
- Row action buttons: details, edit, more actions.
- Right-click/context behavior before change: Asset had a row-action trigger menu path but was not wired to the shared operational context-menu hook used by Monitoring.
- Row click behavior before change: Asset used bespoke selection logic.
- Quick-look/details behavior: quick look side panel, asset details modal, asset edit modal, service/network modals.
- Right-side drawer/panel behavior: quick-look fixed right-side panel.
- Map behavior: topology map surface with relationships and connections.
- Relationships/dependencies behavior: relationship graph and relationship management tabs.
- History/compare/report behavior: compare surface, report/list surface, audit/log access from details.
- Security/secrets/hardware/monitoring panels: preserved in asset forms/details tabs.
- Import/export behavior: bulk import modal, CSV export, import template download, registry snapshot download.
- Lifecycle/data states: inventory vs purged tabs, loading, query-error empty state, restore/purge behaviors.
- Modal/form dirty-state behavior: asset modal, service modal, and connectivity modal dirty guards.
- Warning/error behaviors: warning ledger remains visible in Stage 30 evidence; no suppression added.

## Old-body layout ownership audit

The old Asset body was no longer the page shell owner before this run, but interaction ownership was still too Asset-local:

- row click selection was implemented with bespoke range/toggle logic;
- right-click/context behavior was not mounted through the shared operational context-menu contract;
- row-action trigger classes were not aligned with the shared dismiss/menu contract;
- evidence still wrote to Stage 28 paths and did not prove Stage 30 interaction geometry.

After this run, the shell/table/frame ownership is still the shared operational shell, and Asset-specific logic is reduced to domain surfaces plus action definitions rather than bespoke interaction grammar.

## New architecture summary

- Route: `AssetGoldenShellRoute -> AssetsGoldenWorkspace`
- Shell grammar: `AssetGoldenShellScaffold -> OperationalWorkspaceShell`
- Table grammar: `OperationalDataGrid`
- Interaction grammar: `useOperationalRowInteractions`, `useOperationalContextMenu`, `useOperationalDismissController`
- Row action surface: `OperationalRowActionMenu`
- Asset donor surfaces preserved: compare, report, map, quick look, asset details modal, asset edit modal, import/export, bulk actions, service/network/security/hardware/relationship tabs

## Table/shell/command/action-zone reconstruction summary

- Header, command bar, action zone, filter chips, floating display/views panels, and bulk/export/surface panels remain mounted through the shared operational workspace shell.
- Asset grid row interactions now follow shared operational row-selection behavior instead of Asset-only selection code.
- Asset context menu now uses the shared operational context-menu hook and point-based row action opening, matching the Monitoring/shared menu grammar.
- The row action trigger now carries the shared row-action trigger classes used by dismiss/menu contracts.

## Asset feature transplant matrix

| Feature surface | Stage 30 result |
| --- | --- |
| Asset columns and labels | preserved through `buildAssetGoldenColumns` |
| Lens/search/filter/saved views | preserved |
| Bulk actions | preserved |
| Row actions | preserved and aligned to shared menu grammar |
| Quick look | preserved and proven |
| Details modal | preserved but still not cleanly proven by harness |
| Edit modal + dirty state | preserved |
| Compare surface | preserved |
| Report surface | preserved |
| Map surface | preserved |
| Import/export | preserved |
| Hardware/secrets/relations/monitoring tabs | preserved |
| Purged lifecycle actions | preserved |

## Right-click/context behavior proof

- Stage 30 evidence path: `frontend/stage30-evidence/stage30-evidence.json`
- `/asset` desktop viewport proof captured the shared row-action menu at bounds `x=846 y=501 w=578 h=225`.
- Native AG Grid right-click did not reliably surface under Playwright in this run, so the proof ledger records the failed native attempt and the successful explicit row-action trigger fallback:
  - `right-click first visible asset row`
  - `native right click did not open menu; click explicit row action trigger`
  - `row action menu visible`

## Row click behavior proof

- `/asset` desktop viewport proof captured row-click behavior via the shared selection grammar.
- Evidence result: `bulkActionsEnabled=true` after row click.
- Evidence ledger: `click first visible asset row system cell`.

## Quick-look/detail/right-side panel behavior proof

- Quick look proof: `/asset` desktop viewport opened the right-side quick-look panel with bounds `x=981 y=16 w=460 h=1168`.
- Quick look ledger:
  - `click explicit quick-look trigger`
  - `quick look panel visible after explicit quick-look trigger`
- Detail modal proof remains incomplete in the harness:
  - direct detail-route open did not surface a measurable modal;
  - interactive `View Details` lookup after row actions still failed in the harness.
- Safe-open attempts were recorded verbatim in Stage 30 evidence instead of being hidden.

## Visual comparison against Monitoring

- `/asset` and `/monitoring` both render through the shared operational shell grammar: matching header block, command band, filter bar placement, action zone placement, floating panel grammar, and operational grid surface.
- Asset remains Asset-specific in domain labels and secondary surfaces rather than copying Monitoring content.

## Geometry comparison against Monitoring

- Asset desktop fullpage:
  - header `537x28`
  - command region `686x84`
  - table `522x653`
- Monitoring desktop fullpage:
  - header `475x28`
  - command region `639x84`
  - table `459x653`
- Asset desktop viewport:
  - first row `940x23`
  - row action trigger `28x28`
- Monitoring desktop viewport:
  - first row `1552x23`
  - row action trigger `28x28`

The shell/command/row-action geometry is materially aligned. Asset table width remains wider because the Asset donor column set is materially broader than Monitoring.

## Exact 960x720 verdict

- `/asset` exact `960x720` captured successfully.
- `/monitoring` exact `960x720` captured successfully.
- Asset exact-viewport command bounds were non-null: `x=272 y=215 w=641 h=290`.
- Monitoring exact-viewport command bounds were non-null: `x=272 y=215 w=641 h=334`.
- Verdict: capture PASS, but Asset exact-viewport row-action/detail proof remains limited because the trigger was not visible in the narrowed view.

## Command bounds verdict

- `/asset`: non-null on desktop fullpage, desktop viewport, and exact `960x720`
- `/monitoring`: non-null on desktop fullpage, desktop viewport, and exact `960x720`
- Verdict: PASS

## Route verdicts for `/asset`, `/monitoring`, `/asset-real`

- `/asset`: valid render on all required captures
- `/monitoring`: valid render on all required captures
- `/asset-real`: redirect proof valid; final pathname resolved to `/asset`

## Warning/request classification summary

- No blocking warning entries
- No blocking request-failure entries
- Asset warning noise remained accepted non-blocking:
  - AG Grid `operationalLockWidth`
  - AG Grid `operationalSkipAutoSize`
  - AG Grid column-properties follow-up warning
  - React Router future flag warning
  - router blocker warning during route-hopping
- Monitoring exact `960x720` also recorded accepted non-blocking `ResizeObserver` global errors and one unrelated aborted user-settings PATCH request.

## Duplicate-key warning verdict

- `/asset` duplicate-key total across Stage 30 captures: `0`
- Verdict: PASS

## Page-error verdict

- `/asset` page-error total across Stage 30 captures: `0`
- Verdict: PASS

## Validation commands/results

- `rtk npm run typecheck`
  - PASS
- `rtk npm run test:lint`
  - PASS
- `rtk npm run build`
  - PASS
  - note: Vite emitted the existing large-chunk warning only
- `rtk npx playwright test tests/assets-golden-evidence.spec.ts --reporter=line`
  - PASS
  - fresh outputs written to `frontend/stage30-evidence/`

## Forbidden-command statement

No git commit, git push, packaging, archive, zip, release, or delivery commands were run.

## Unrelated-scope exclusion statement

No backend/API behavior was changed. No Monitoring, Settings, FAR, Vendors, Research, Network, Services, External, or other unrelated workspace source was modified to make Asset parity easier.

## Remaining gaps

- The Stage 30 harness still does not produce a clean Asset details modal proof from the row-action `View Details` path.
- Native AG Grid right-click did not surface reliably under Playwright for Asset rows in this run; the evidence records the failed native attempt and the successful explicit menu-trigger fallback.
- Asset exact `960x720` keeps the command region valid, but the row-action trigger is not always visibly reachable in the narrowed capture.

## Lesson learned

Stage 30 needed real ownership transfer at the interaction-contract layer, not more density/default/CSS tuning. The golden shell was already present; the missing work was moving Asset interaction behavior and proof capture onto the shared operational grammar and recording the remaining gaps honestly.

## Final worker result

PARTIAL
