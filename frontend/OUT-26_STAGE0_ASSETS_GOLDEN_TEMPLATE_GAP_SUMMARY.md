# OUT-26 Iteration 01 Stage 0 Assets Golden Template Gap Summary

## Metadata

- Issue: `OUT-26 / Run 19 — Assets Golden Template Implementation`
- Iteration: `Iteration 01`
- Stage: `Stage 0 — discovery / golden-template gap mapping only`
- Prompt type: `Read-only source discovery plus one required proof-summary Markdown file`
- Date: `2026-07-02`
- Worker result: `PASS`

## Files inspected

### Canonical Assets files

- `frontend/src/components/Assets.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/assets/AssetDetailsView.tsx`
- `frontend/src/components/AssetGrid_Legacy.tsx`
- `frontend/src/components/AssetReal.tsx`

### Golden/source-of-truth files

- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/shared/OperationalWorkspace.ts`
- `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
- `frontend/src/components/shared/OperationalDataGrid.tsx`
- `frontend/src/components/shared/OperationalGridStandard.tsx`
- `frontend/src/components/shared/OperationalBulkContract.ts`
- `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
- `frontend/src/components/shared/OperationalDataState.ts`
- `frontend/src/components/shared/OperationalImportExport.ts`
- `frontend/src/components/shared/WorkspaceCommandBar.tsx`

### Shared contract/reference files

- `frontend/src/components/SettingsStandards.tsx`
- `frontend/src/components/shared/LayoutPrimitives.tsx`
- `frontend/src/components/shared/OperationalWorkspacePrimitives.tsx`
- `frontend/src/components/shared/WorkspaceModal.tsx`
- `frontend/src/components/shared/OperationalLifecycleContract.ts`
- `frontend/src/components/shared/OperationalLifecycleToasts.ts`
- `frontend/src/components/shared/OperationalImportModal.tsx`

## Files changed

- `frontend/OUT-26_STAGE0_ASSETS_GOLDEN_TEMPLATE_GAP_SUMMARY.md`

Violation check: `No violation detected. No implementation source files were edited.`

## Route-lock confirmation

- `/asset` with `Assets` remains canonical.
- `/asset-real` remains legacy redirect-only evidence: `frontend/src/App.tsx` routes `/asset-real` to `Navigate` -> `/asset`.
- `AssetReal.tsx` remains non-canonical historical/reference-only evidence: it is not imported by `App.tsx` as the `/asset` route target.
- Route decision was not re-opened in this stage.

## Golden-template gap matrix

| area | source-of-truth evidence | current Assets evidence | status | implementation risk | preservation risk | suggested implementation slice | validation method |
| --- | --- | --- | --- | --- | --- | --- | --- |
| workspace shell/layout | `MonitoringGrid.tsx` uses `OperationalWorkspaceShell` with shared header + command-bar shell; `OperationalWorkspaceShells.tsx` defines the frame contract | `Assets.tsx` renders bespoke top header, bespoke toolbar, direct `AgGridReact`, custom report/map branches | FAIL | High: requires re-shelling the workspace without breaking grid/report/map modes | High: quick look, map, compare, detail modal can regress if shell work couples view modes incorrectly | Wrap only the table workspace in shared shell first; keep report/map/compare domain surfaces behind adapters | Visual compare of `/monitoring` shell vs `/asset` table mode |
| title/header/summary area | `PageHeader` + `HeaderScopeSwitch` contract in `LayoutPrimitives.tsx`; Monitoring header exposes standard eyebrow/title/subtitle/actions | `Assets.tsx` has custom “Infrastructure Registry” header, custom view-mode segmented block, no shared `PageHeader` | FAIL | Medium | Medium | Replace custom title block with shared `PageHeader` while preserving asset-specific wording and view-mode actions | Verify shared header geometry and route lock remain unchanged |
| command bar and header controls | `WorkspaceCommandBar.tsx` and `MonitoringGrid.tsx` show standardized left/right/secondary toolbar composition | `Assets.tsx` inlines search, lens chips, icon buttons, bulk trigger, add button in one custom row | FAIL | High | Medium | Move grid-mode controls into `WorkspaceCommandBar`; preserve current commands 1:1 | Compare visible controls before/after slice |
| scope switches and filters | Monitoring uses `HeaderScopeSwitch`, optional filter bar, `filterChips`, quick filters, overlay controller | Assets uses `HeaderScopeSwitch` only for inventory/deleted; lens chips are bespoke; map/report filters are disconnected from shared filter grammar | PARTIAL | Medium | Medium | Keep asset-specific lenses but express them as command-bar secondary controls/filter chips | Verify inventory/deleted counts, lens selection, URL `status` filter behavior |
| search behavior | Monitoring uses shared `ToolbarSearch` and filter-chip clearing; state participates in saved view/workspace state | Assets uses bespoke input and local `searchTerm`; query param `search` can seed state; not persisted as workspace state | PARTIAL | Medium | Medium | Swap to `ToolbarSearch`, preserve `search` query-param bootstrap, then wire into workspace state | Check `/asset?search=...` hydration and clear-all behavior |
| saved/display view behavior | Monitoring has `OperationalSavedViewsPanel`, `OperationalDisplayPanel`, saved view CRUD, sanitized restore, backend-preference migration contract | Assets only has local `hiddenColumns`, fixed `fontSize`/`rowDensity`, no saved views, no shared display panel, no sanitization | FAIL | High | Medium | Introduce shared display panel first, then saved views/state sanitization later | Verify column toggles, density, hidden columns, restore from saved view |
| grid/table grammar | `OperationalDataGrid.tsx` + `OperationalGridStandard.tsx` + `OperationalGridContract` provide canonical utility columns, empty/error handling, sizing contract | Assets defines raw `AgGridReact` column defs manually in `Assets.tsx`, with bespoke widths/renderers and no shared runtime | FAIL | High | Medium | Port only raw grid mode to `OperationalDataGrid` + shared column builder while keeping asset-specific columns | Regression pass on select/id/status/action columns and row heights |
| column/display control grammar | Monitoring uses `OperationalDisplayPanel`, shared grouping options, hidden-column toggles, sizing helpers | Assets has custom right-side column picker drawer and ad hoc hidden-column array | FAIL | Medium | Low | Replace custom column picker with `OperationalDisplayPanel`; defer grouping if not needed | Verify show/hide columns and utility-column lock behavior |
| row selection grammar | Monitoring uses `useOperationalSelection`, scope keys, grouped-selection behavior, explicit selected count | Assets uses AG Grid selection directly and opens quick look when exactly one row is selected | PARTIAL | Medium | High: quick look depends on single-row selection semantics | Preserve single-row quick look trigger while moving selection ownership to shared selection hook | Check single select, multi-select, deselect, compare-visible flow |
| row action grammar | Monitoring uses `OperationalRowActionMenu` and structured action sections; actions are consistent with lifecycle contract | Assets uses inline row action buttons inside raw column defs; no shared row-action panel grammar | FAIL | Medium | High: asset-specific row actions are domain-rich | Keep current action set, but host it behind shared row-action menu after grid migration | Verify every current asset row action still exists and deep-links correctly |
| bulk action grammar | Monitoring uses anchored `Bulk Actions` flyout via shared flyout primitives and bulk contract utilities | Assets uses a bespoke kebab menu with custom status/env modals and compare-visible logic | FAIL | High | High: compare, delete/purge, restore, status/env updates can regress | Rebuild bulk actions on shared flyout primitives without changing asset-specific actions | Verify selection count, enablement rules, compare-visible, delete/purge/restore |
| floating panel behavior | Monitoring uses `WorkspaceFloatingPanel`, anchored-layer hooks, overlay controller, shared z-index grammar | Assets uses custom absolute bulk menu, custom column drawer, custom quick-look side panel | FAIL | Medium | High: quick look is non-negotiable | Leave quick look asset-specific; migrate bulk/display/views overlays first to shared floating panels | Verify open/close, outside-click, z-index, Escape behavior |
| modal/form/dirty-state lifecycle | `WorkspaceModal.tsx` supports dirty-close guard; Monitoring form/config/import flows report dirtiness | Assets uses `WorkspaceModal` for major modals, but bulk status/env dialogs are bespoke overlays and `AssetForm` dirty wiring was not evidenced here | PARTIAL | Medium | High: `AssetDetailsView`, forms, service/network editors are rich | Standardize bulk dialogs and ensure `AssetForm`/detail editors opt into dirty guard before deeper refactor | Verify Escape, backdrop close, dirty confirmation, maximize toggle |
| detail/quick-look panel grammar | Monitoring separates quick actions, detail modal, history, compare, linked record browsing with shared shells | Assets has custom `QuickLookPanel`, rich `AssetDetailsView`, report mode, and map node detail interactions | PARTIAL | High | Very High: quick look + `AssetDetailsView` are explicit preservation requirements | Preserve `QuickLookPanel` as asset-owned; only standardize outer workspace and modal shells around it | Test single-row quick look, detail modal, map-node detail open |
| loading state | Monitoring routes loading through `OperationalDataGrid` loading overlay and `resolveOperationalDataState` | Assets has custom loading overlay for grid and ad hoc loading text in nested tables/panels | PARTIAL | Low | Low | Adopt shared table loading state first; defer inner detail tab loading surfaces | Verify initial grid load and nested tab loading states |
| empty state | Shared `WorkspaceEmptyState` is canonical; Monitoring uses it for grid/state/flyout surfaces | Assets uses `WorkspaceEmptyState` in several places, but not consistently across grid/report/map/compare surfaces | PARTIAL | Low | Low | Normalize top-level empty states first, keep detail-tab empty states as-is initially | Verify empty grid, empty report list, empty map filters, empty tab panels |
| error state | Monitoring uses `resolveOperationalDataState`, diagnostics pill/modal, and canonical query-error messaging | Assets has toast failures and some inline errors, but no canonical grid error state or diagnostic surface | FAIL | Medium | Medium | Add shared grid error state and route-level diagnostic action before other UX polish | Simulate failed device query and confirm canonical error card appears |
| inactive/removed/purged state | Monitoring has active/deleted scope, lifecycle contract, restore/purge labels, row/bulk parity | Assets has inventory/deleted scope and restore/purge/delete behavior, but labels are mixed (`Purged` tab for deleted rows), no shared lifecycle contract | PARTIAL | Medium | Medium | Align lifecycle copy and actions to shared contract while preserving asset semantics | Verify deleted scope counts, restore conflicts, purge confirmation |
| route-level workspace persistence | Monitoring persists workspace/search/views/state with local + backend preference contract and deep-linked detail route helper | Assets supports `id`, `search`, `status` query bootstrapping only; no saved workspace state, no backend preference sync | FAIL | High | Medium | Preserve existing query bootstraps, then add workspace-state persistence behind shared hooks | Verify refresh retains workspace state and `/asset?id=...` still opens correct detail |
| import/export/file-exchange behavior where applicable | Monitoring import/export uses `OperationalImportModal` plus metadata-aware `OperationalImportExport.ts` contract | Assets uses `BulkImportModal` and ad hoc CSV/copy actions; export/import standard contract not evidenced | PARTIAL | Medium | Medium | Keep current asset import modal initially; evaluate migration to operational import/export contract after shell/grid parity | Verify CSV export, clipboard copy, bulk import modal still work |
| validation/error messaging | Monitoring has frontend validation contract, tab-level counts, lifecycle toast helpers | Assets shows toasts and some metadata validation, but no shared validation banner/count grammar was evidenced | PARTIAL | Medium | High: asset forms are rich and domain-specific | Leave domain validation logic intact; standardize banners/dirty handling around it later | Verify duplicate-hostname, metadata validation, relationship errors, restore conflict messaging |
| keyboard/accessibility behavior where visible | Shared modal/floating primitives include Escape handling and structured controls | Assets has some Escape/outside-click behavior via `WorkspaceModal`; custom bulk menu/quick look/column drawer lack clear shared keyboard contract | UNKNOWN | Medium | Medium | As shared overlays replace bespoke ones, inherit keyboard behavior from shared primitives | Manual keyboard pass: Escape, focus trap expectations, overlay dismissal |
| clone-drift avoidance | Monitoring/template behavior is shared across `Operational*` primitives and hooks | Canonical Assets still duplicates large swaths of legacy asset behavior, embeds raw grid logic, and `AssetDetailsView` imports helpers from `AssetGrid_Legacy.tsx` | FAIL | High | High | First reduce shell/grid drift with shared primitives; defer deeper extraction of asset-domain helpers until parity proven | Diff for reduced bespoke workspace logic and fewer legacy helper dependencies |
| asset-domain ownership boundary | Golden template should own shell/grammar; asset workspace should own asset-specific detail, map, relationships, security, secrets, monitoring linkages | Assets currently mixes both: workspace shell, grid grammar, compare/report/map, detail flows, service/network modals, and legacy helper reuse all live together | PARTIAL | High | Very High | Draw boundary: shared owns shell/grid/lifecycle; asset owns quick look, map, compare/report, detail/form panels | Validate no asset-specific behaviors were flattened into generic monitoring semantics |

## Asset behavior preservation checklist

| behavior | status | evidence | preservation risk |
| --- | --- | --- | --- |
| quick look | PASS | `Assets.tsx` has dedicated `QuickLookPanel` side panel tied to single-row selection | High if selection or floating-panel work changes single-row semantics |
| asset map | PASS | `Assets.tsx` includes dedicated `AssetMap` view using `ForceGraph2D` | High if shell migration assumes table-only workspace |
| relationships/dependencies | PASS | `AssetDetailsView.tsx` has relationships tab; report/map also show dependency/network maps | High if detail/map logic is flattened into generic linked-record panel |
| details/forms | PASS | `AssetDetailsView.tsx` remains rich; `Assets.tsx` uses `WorkspaceModal` + `AssetForm` | High if modal lifecycle changes ignore asset form complexity |
| history/compare/report | PARTIAL | Compare and report modes exist in `Assets.tsx`; history is indirect via logs/FAR, not Monitoring-style version history | Medium: compare/report can regress during shell alignment |
| row/bulk actions | PASS | Asset row buttons, compare-visible, restore/delete/purge/status/env bulk flows exist in `Assets.tsx` | High if bulk grammar migration changes action availability |
| security/secrets/hardware/monitoring panels | PASS | `AssetDetailsView.tsx` contains secrets, hardware, security, monitoring, service/network surfaces | High if detail decomposition removes tab richness |
| `AssetDetailsView.tsx` | PASS | Explicit rich detail surface used by canonical `Assets` detail modal | Very High: must remain the primary asset detail surface |

## Clone-drift/regression checklist

| check | result | evidence |
| --- | --- | --- |
| `MONITORING_*` in canonical Assets | PASS | No `MONITORING_*` identifiers found in `frontend/src/components/Assets.tsx` |
| `MONITORING_WORKSPACE_STANDARD` in canonical Assets | PASS | Not imported or referenced by canonical `Assets.tsx` |
| `MonitoringHistoryModal` in canonical Assets | PASS | Not referenced by canonical `Assets.tsx` |
| `CompareMonitorsModal` in canonical Assets | PASS | Not referenced by canonical `Assets.tsx` |
| `NetworkConnectionForm` in canonical Assets | PASS | Not referenced by canonical `Assets.tsx`; network editing is asset-specific via `SharedNetworkModals` |
| monitoring history/restore endpoints in canonical Assets | PASS | No monitoring history endpoints found in canonical `Assets.tsx`; asset restore uses device bulk endpoint |
| route/sidebar regression | PASS | `App.tsx` sidebar points `Assets` to `/asset`; route `/asset` renders `Assets` |
| `/asset-real` active-route regression | PASS | `App.tsx` keeps `/asset-real` as redirect-only legacy route |

## Recommended implementation slices

1. Shell/layout alignment.
   Keep report/map/compare as asset-owned branches; convert only table mode onto `OperationalWorkspaceShell`.
2. Command bar/header controls.
   Port search, scope switch, lens controls, import/export/config, and add action into `WorkspaceCommandBar`.
3. Grid/table grammar.
   Migrate raw grid mode to `OperationalDataGrid` and shared column grammar without changing asset columns or quick-look behavior.
4. Row/bulk action grammar.
   Rebuild current asset row actions and bulk actions on shared row-action/flyout primitives.
5. Lifecycle/data states.
   Add `resolveOperationalDataState`-style loading/empty/error handling for the table workspace.
6. Floating panels.
   Standardize bulk/display/views overlays first; do not replace `QuickLookPanel` yet.
7. Modal/form dirty-state lifecycle.
   Ensure asset form and rich editor flows wire to `WorkspaceModal` dirty guards before deeper decomposition.
8. Saved/display views.
   Add display controls first, then saved views + persistence + sanitization.
9. Import/export if relevant.
   Evaluate migration from ad hoc export/import to shared import/export contract only after table parity.
10. Cleanup/decomposition only after behavior parity is proven.
   Especially defer legacy helper extraction from `AssetGrid_Legacy.tsx` until the canonical workspace is stable.

## Do-not-touch-yet list

- `QuickLookPanel` single-row side panel behavior.
- `AssetMap` and both network/dependency graph surfaces.
- `AssetDetailsView.tsx` tab structure and rich panels.
- Compare/report mode behavior in `Assets.tsx`.
- Asset-specific row actions and bulk actions until they are mirrored exactly in shared primitives.
- Service/network/security/secrets/hardware/monitoring sub-surfaces and their modals.
- Legacy helper extraction from `AssetGrid_Legacy.tsx` that could destabilize canonical detail/report surfaces.

## Validation commands/results

- Command: `rtk ls frontend/OUT-26_STAGE0_ASSETS_GOLDEN_TEMPLATE_GAP_SUMMARY.md`
  - Result: skipped before creation because the required proof file did not exist yet.
- Command: `No build/typecheck/lint run`
  - Result: intentionally skipped because Stage 0 is discovery-only and implementation source files were not modified.

## Forbidden-command statement

- No `git`, `push`, `package`, `zip`, `release`, or dependency install commands were run.

## Unrelated-scope exclusion statement

- No Vendors, FAR, Research, Network, Services, External, or SettingsStandards migration work was performed.
- No backend/API redesign was performed.
- No unrelated workspace migration work was performed.

## Final worker result

`PASS`
