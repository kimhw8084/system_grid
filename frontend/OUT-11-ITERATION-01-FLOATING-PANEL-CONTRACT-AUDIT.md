# OUT-11 Iteration 01 Floating Panel Contract Audit

## 1. Executive decision

- Iteration 01 audit verdict: `PASS`
- Recommended next prompt type: `implementation`
- One-sentence reason: current source already exposes a usable shared anchored-panel stack plus a separate shared row-action stack, and the remaining OUT-11 work is contract consolidation and duplicate-owner removal rather than discovery.
- `OUT-11 is not locked by this report.`

### Works

- Monitoring, External, and Services all use the same shared anchored panel primitives for display, saved views, and bulk panel anchoring: `useWorkspaceAnchoredLayer` in `frontend/src/components/shared/OperationalWorkspacePrimitives.tsx:83`, `OperationalAnchoredPanel` in `frontend/src/components/shared/OperationalWorkspaceShells.tsx:116`, and `WorkspaceFloatingPanel` in `frontend/src/components/shared/OperationalWorkspacePrimitives.tsx:172`.
- Monitoring, External, and Services all use the same shared row-action menu component and shared context-menu opener: `OperationalRowActionMenu` in `frontend/src/components/shared/OperationalRowActionMenu.tsx:45`, `useOperationalContextMenu` in `frontend/src/components/shared/OperationalGridInteractions.ts:297`, and `useOperationalDismissController` in `frontend/src/components/shared/OperationalGridInteractions.ts:332`.

### Fails

- Row-action layering does not use `WORKSPACE_LAYER_Z`; it hardcodes `zIndex: 1115` in `frontend/src/components/shared/OperationalRowActionMenu.tsx:87-90`, while anchored panels use `WORKSPACE_LAYER_Z.floatingPanel` in `frontend/src/components/shared/OperationalWorkspacePrimitives.tsx:120`.
- Services duplicates native context-menu suppression locally in `frontend/src/components/ServicesReal.tsx:1112-1121` even though the same workspace already uses shared `useOperationalContextMenu` at `frontend/src/components/ServicesReal.tsx:771`.

### Unknown

- No runtime validation was run for nested overlay interaction, clamp behavior under live viewport resize, or scroll behavior under long page/grid states.

## 2. Capsule/source-state baseline

- `frontend/OUT-10-ITERATION-05-PROOF.md` exists.
- The current source still contains the OUT-10 shared table contract signals relevant to OUT-11:
  - `selectionScopeKey` is passed into Monitoring raw and grouped grids at `frontend/src/components/MonitoringGrid.tsx:2263` and `:2331`, External at `frontend/src/components/External.tsx:3292` and `:3360`, Services at `frontend/src/components/ServicesReal.tsx:2199` and `:2269`, `OperationalDataGrid` at `frontend/src/components/shared/OperationalDataGrid.tsx:44-70`, and `OperationalGridMatrix` clears native selection on scope change at `frontend/src/components/shared/OperationalGridMatrix.tsx:39-41`.
  - shared `useOperationalContextMenu` exists at `frontend/src/components/shared/OperationalGridInteractions.ts:297-329` and is used by Monitoring `:809`, External `:1706`, Services `:771`.
  - shared `useOperationalDismissController` exists at `frontend/src/components/shared/OperationalGridInteractions.ts:332-365` and is used by Monitoring `:1195`, External `:1690`, Services `:1095`.
  - shared row-action geometry and menu components exist in `frontend/src/components/shared/OperationalRowActionGeometry.ts:20-146` and `frontend/src/components/shared/OperationalRowActionMenu.tsx:45-176`.

### Works

- OUT-10’s proof explicitly states the shared owner of logical selection normalization, grouped publication, and scope reset is shared code, not per-workspace wiring: `frontend/OUT-10-ITERATION-05-PROOF.md:24-39`.
- `OperationalGridMatrix` resets AG Grid native selection on `selectionScopeKey` changes, which is the key guard OUT-11 must not disturb: `frontend/src/components/shared/OperationalGridMatrix.tsx:39-41`.

### Fails

- None proven in the locked OUT-10 contract within this audit scope.

### Unknown

- Whether any future overlay refactor could accidentally change row-click, shift-range, or grouped selection behavior at runtime remains unknown until Iteration 02 re-runs focused tests and manual smoke checks.

How OUT-11 must avoid regressing OUT-10:

- do not change `selectionScopeKey` derivation or propagation;
- do not change `useOperationalRowInteractions`, `useOperationalGroupedSelection`, `OperationalDataGrid`, or `OperationalGridMatrix` selection semantics;
- keep overlay consolidation strictly outside selection state and AG Grid selection reset behavior.

## 3. Full panel/overlay type inventory matrix

| Panel type category | Component / file / line-area | Workspace(s) using it | Trigger / opening event | State owner | Anchor / position source | Positioning primitive used | Layering / z-index owner | Portal target | Outside click behavior | Escape behavior | Focus boundary / input behavior | Event boundary / propagation handling | Nested dropdown stability mechanism | Viewport clamp behavior | Scroll behavior | Shared primitive used | Local one-off logic still present | Domain-owned content/action boundary | Risk level | Recommended action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cursor/point row action menu | `OperationalRowActionMenu`, `frontend/src/components/shared/OperationalRowActionMenu.tsx:45-176`; geometry in `OperationalRowActionGeometry.ts:20-146` | Monitoring `:2237`, External `:3262`, Services `:2128` | left-click row action button via `openRowActionMenuAtPoint(... clientX, clientY)` in Monitoring `:895-897`, External `:2521-2523`, Services `:836-838`; right-click via `onCellContextMenu` shared hook | each workspace `rowActionMenu` state | cursor point | `computeRowActionGeometry` | hardcoded `zIndex: 1115` in row menu component | `createPortal(..., document.body)` | shared dismiss controller closes when click target is outside `.row-action-menu-container`: `OperationalGridInteractions.ts:360-361` | shared dismiss controller via `useWorkspaceDismissHandlers` | menu body scrolls internally; no focus trap; close button present | native context menu suppressed for `.ag-root-wrapper` and `.row-action-menu-container`; row action button uses `stopPropagation` in workspace row renderers | none inside row menu itself | source-proven top/bottom/right clamp by `computeRowActionGeometry`; narrow-width width clamp is source-proven, runtime behavior unknown | internal `overflow-y-auto` on menu body | `OperationalRowActionMenu`, `computeRowActionGeometry`, `useOperationalContextMenu`, `useOperationalDismissController` | content sections and button triggers remain per workspace; z-index token is local to shared row menu, not shared layer token | menu labels, actions, restore/archive/purge semantics stay domain-owned | Medium | consolidate row menu z-index and contract wording into shared owner; keep item content domain-owned |
| anchored display controls panel | `OperationalDisplayPanel`, `frontend/src/components/shared/OperationalWorkspaceShells.tsx:215-335` | Monitoring `:2081`, External `:2932`, Services `:1946` | toolbar button click through local `togglePanel('display')` | each workspace `showDisplayMenu` | trigger rect | `useWorkspaceAnchoredLayer` + `OperationalAnchoredPanel` | `WORKSPACE_LAYER_Z.floatingPanel` via `useWorkspaceAnchoredLayer` | rendered through `OperationalWorkspaceShell` portal to `document.body` | shared dismiss controller | shared dismiss controller | slider inputs, column toggles, `AppDropdown` inside panel | close button local; dismiss controller ignores `[data-workspace-panel]` descendants | nested `AppDropdown` uses `[data-workspace-panel]` plus `onMouseDown stopPropagation` | anchored left clamp and upward-open fallback source-proven; bottom clamp is indirect and narrow-width width clamp is source-proven | column list has internal `overflow-y-auto` | `OperationalDisplayPanel`, `AppDropdown`, `useWorkspaceAnchoredLayer` | mutual exclusion is local `togglePanel` logic | column labels, group options, hidden column state remain domain-owned | Low | keep shared shell; later consolidate mutual exclusion state if OUT-11 scope allows |
| anchored saved views panel | `OperationalSavedViewsPanel`, `frontend/src/components/shared/OperationalWorkspaceShells.tsx:339-510` | Monitoring `:2104`, External `:2954`, Services `:1969` | toolbar button click through local `togglePanel('views')` | each workspace `showViewsMenu`, `activeViewId`, `newViewName`, saved view state | trigger rect | `useWorkspaceAnchoredLayer` + `OperationalAnchoredPanel` | `WORKSPACE_LAYER_Z.floatingPanel` via anchored layer | `OperationalWorkspaceShell` portal to `document.body` | shared dismiss controller except External intercepts close when `newViewName.trim() !== ''` in `External.tsx:1669-1688` | shared dismiss controller except same External intercept path | text input for new view name; buttons for apply/overwrite/delete | panel close button calls workspace `onClose`; delete confirm is local inside shared panel | nested dropdowns not present in this panel | anchored left/upward fallback source-proven; runtime top/bottom edge behavior still unknown | panel body uses panel-local content; no explicit max-height except shell dimensions | `OperationalSavedViewsPanel`, `useWorkspaceAnchoredLayer`, `useOperationalDismissController` | External dirty close protection; Services close button uses `onClose={() => setShowViewsMenu(false)}` instead of workspace-wide dismiss callback `ServicesReal.tsx:1973` | saved-view persistence, overwrite/delete behavior, default-view rules stay domain-owned | Medium | keep shared panel; preserve External close-confirmation as domain exception; standardize close callback shape later |
| anchored bulk action panel | `OperationalAnchoredPanel` + local `WorkspaceFloatingPanel` content in Monitoring `:2127-2189`, External `:2980-3150`, Services `:1991-2125` | Monitoring, External, Services | toolbar bulk button click through local `togglePanel('bulk')` | each workspace `showBulkMenu` and bulk draft state | trigger rect | `useWorkspaceAnchoredLayer` + `OperationalAnchoredPanel` | `WORKSPACE_LAYER_Z.floatingPanel` via anchored layer | `OperationalWorkspaceShell` portal to `document.body` | shared dismiss controller | shared dismiss controller | button-only panels plus nested editors | `dismissWorkspaceMenus` shape differs by workspace | nested dropdown editor protected by `[data-workspace-panel]` through nested `AppDropdown` | anchored clamp source-proven; runtime narrow-width usability unknown | panel wrapper has `max-h-[560px] overflow-y-auto`; internal sections rely on page-free internal scroll | `OperationalAnchoredPanel`, `WorkspaceFloatingPanel`, `WorkspaceFlyoutDropdownEditor` | bulk card list, delete confirm, restore/purge semantics remain local | bulk action definitions and mutation semantics stay domain-owned | Medium | keep anchored shell shared; do not migrate bulk actions themselves in OUT-11 |
| nested dropdown editor inside bulk/display/saved panels | `WorkspaceFlyoutDropdownEditor`, `frontend/src/components/shared/WorkspaceFlyout.tsx:29-57`; uses `AppDropdown` `AppDropdown.tsx:38-186` | Monitoring bulk `:2146/:2162/:2178`, External bulk `:3012/:3038/:3063/:3085`, Services bulk `:2048/:2065/:2082`, display panels shared | click flyout card then click dropdown trigger | workspace draft state, `AppDropdown` owns its open state | internal dropdown trigger | `useWorkspaceAnchoredLayer` inside `AppDropdown` | anchored layer uses `WORKSPACE_LAYER_Z.floatingPanel` | `AppDropdown` portals to `document.body` | `AppDropdown` ignores clicks on trigger, panel, and any `[data-workspace-panel]`: `AppDropdown.tsx:57-68` | no dedicated Escape handler in `AppDropdown` | search input autofocus inside dropdown; multi-select supported | panel root uses `onMouseDown={(e) => e.stopPropagation()}` and `data-workspace-panel="true"` | explicit `[data-workspace-panel]` contract plus stopPropagation | anchored clamp source-proven; runtime overlap with parent near viewport edge unknown | dropdown list has internal `max-h-[300px] overflow-y-auto` | `WorkspaceFlyoutDropdownEditor`, `AppDropdown`, `useWorkspaceAnchoredLayer` | parent bulk panel expansion state is local | dropdown options and apply actions stay domain-owned | Medium | keep shared nested editor and require any OUT-11 dismiss changes to preserve `[data-workspace-panel]` contract |
| generic app dropdown | `AppDropdown`, `frontend/src/components/shared/AppDropdown.tsx:38-186` | Monitoring filters and display panel, External bulk/display/filter use sites, Services bulk/display/filter use sites, shared flyouts | button click | component-local `isOpen` | trigger rect | `useWorkspaceAnchoredLayer` | `WORKSPACE_LAYER_Z.floatingPanel` | `createPortal(..., document.body)` | document `mousedown` close excluding trigger/panel/`[data-workspace-panel]` | none source-proven | search input autofocus; multi-select; no focus trap | dropdown panel stops `mousedown` propagation | `[data-workspace-panel]` honored and covered by tests in `AppDropdown.test.tsx:58-123` | anchored clamp source-proven | internal `max-h-[300px] overflow-y-auto` | `AppDropdown`, `useWorkspaceAnchoredLayer` | component owns its own dismissal instead of shared dismiss controller | option labels and values stay domain-owned | Medium | later decide whether dropdown dismissal remains separate or is wrapped by shared overlay law |
| workspace select field | `WorkspaceSelectField`, `frontend/src/components/shared/OperationalWorkspacePrimitives.tsx:394-531` | discovered shared primitive; no target workspace usage required by this audit | button click | component-local `isOpen` | trigger rect | `useWorkspaceAnchoredLayer` | anchored layer `WORKSPACE_LAYER_Z.floatingPanel` | `createPortal(..., document.body)` | window `mousedown` close excluding trigger/panel/`[data-workspace-panel]` | none source-proven | optional search, multi-select, no focus trap | panel uses `onMouseDown stopPropagation` | `[data-workspace-panel]` honored | anchored clamp source-proven | internal `max-h-52 overflow-y-auto` | `WorkspaceSelectField`, `useWorkspaceAnchoredLayer` | separate dismissal owner from grid overlay stack | option labels/descriptions stay domain-owned | Low | keep separate for now; document same `[data-workspace-panel]` law |
| info/detail tooltip/flyout | `WorkspaceInfoTooltip`, `frontend/src/components/shared/OperationalWorkspacePrimitives.tsx:339-389` | discovered shared primitive; not proven in Monitoring/External/Services during this audit | button click | component-local `isOpen` | trigger rect | `useWorkspaceAnchoredLayer` | anchored layer `WORKSPACE_LAYER_Z.floatingPanel` | `createPortal(..., document.body)` | window `mousedown` close excluding trigger/panel | none source-proven | content scroll area only | no special stopPropagation beyond panel containment | no special nested dropdown handling | anchored clamp source-proven | internal `max-h-64 overflow-y-auto` | `WorkspaceInfoTooltip`, `useWorkspaceAnchoredLayer` | separate dismissal owner | informational content remains domain-owned | Low | keep separate; only fold into contract as a non-grid adjunct |
| other discovered overlay: tenant selector | `TenantSelector`, `frontend/src/components/shared/TenantSelector.tsx:15-98` | outside current OUT-11 target workspaces | button click | component-local `isOpen` | trigger rect | `useWorkspaceAnchoredLayer` | anchored layer | `createPortal(..., document.body)` | document `mousedown` close excluding trigger/panel/`[data-workspace-panel]` | none source-proven | no focus trap | panel uses `onMouseDown stopPropagation` | `[data-workspace-panel]` honored | anchored clamp source-proven | list internal scrolling not audited | shared anchored primitives | separate owner outside operational grid | tenant-switch semantics are domain-owned | Low | out of OUT-11 scope; keep documented only |

## 4. Monitoring golden behavior map

Monitoring is the production golden source for OUT-11 comparison, but only the behaviors below are classified golden where source proof exists.

### Works

- Toolbar panel mutual exclusion is source-proven by local `togglePanel('display' | 'views' | 'bulk')`, which toggles one panel and closes the other two plus row actions: `frontend/src/components/MonitoringGrid.tsx:900-914`.
- Row action menu opens through button click by `openRowActionMenu(event, item)` calling `openRowActionMenuAtPoint(item, event.clientX, event.clientY)`: `frontend/src/components/MonitoringGrid.tsx:894-897`, button at `:1001-1005`.
- Row action menu opens through right-click by shared `useOperationalContextMenu`; Monitoring passes `handleCellContextMenu` into `OperationalDataGrid`, which forwards it to AG Grid `onCellContextMenu`: `MonitoringGrid.tsx:809-813`, `:934-936`, `OperationalDataGrid.tsx:109-124`.
- Row action menu geometry and edge clamp are source-proven in shared `computeRowActionGeometry`: top/bottom choice, width clamp, right-edge clamp, max-height clamp at `frontend/src/components/shared/OperationalRowActionGeometry.ts:96-146`; focused tests exist in `frontend/src/components/shared/__tests__/row-action.test.ts:4-62`.
- Display panel anchoring is source-proven by `useWorkspaceAnchoredLayer(showDisplayMenu, { minWidth: 320 })` at `MonitoringGrid.tsx:597` and `OperationalDisplayPanel` render at `:2081-2101`.
- Saved views panel anchoring is source-proven by `useWorkspaceAnchoredLayer(showViewsMenu, { minWidth: 420 })` at `MonitoringGrid.tsx:598` and panel render at `:2104-2125`.
- Saved-view create/overwrite/delete boundary is source-proven as domain-owned in Monitoring functions `createViewFromCurrent`, `saveCurrentToView`, `deleteView`, `applySystemDefault`: `MonitoringGrid.tsx:1110-1183`; shared panel only renders controls.
- Bulk panel anchoring is source-proven by `useWorkspaceAnchoredLayer(showBulkMenu, { minWidth: 340 })` at `MonitoringGrid.tsx:599` and `OperationalAnchoredPanel` render at `:2127-2189`.
- Bulk nested dropdown editors are source-proven by `WorkspaceFlyoutDropdownEditor` at `MonitoringGrid.tsx:2146`, `:2162`, `:2178`; nested dropdown protection comes from shared `AppDropdown`.
- Outside-click dismissal is source-proven by Monitoring’s `useOperationalDismissController` setup at `MonitoringGrid.tsx:1195-1208` plus shared dismissal rules at `OperationalGridInteractions.ts:352-361`.
- Escape dismissal is source-proven by `useWorkspaceDismissHandlers` listening on `keydown` and calling `onDismiss`: `frontend/src/components/shared/OperationalWorkspaceHooks.ts:67-79`.
- Nested dropdown click protection is source-proven by shared dismissal exemption `target.closest("[data-workspace-panel]")` at `OperationalGridInteractions.ts:356` and `AppDropdown` panel markup at `AppDropdown.tsx:153-155`.
- Context-menu native suppression rules are source-proven by shared `useOperationalContextMenu` suppressing only `.ag-root-wrapper` and `.row-action-menu-container`: `OperationalGridInteractions.ts:315-323`.
- Scroll prevention and internal scroll areas are partly source-proven: anchored bulk panel uses `max-h-[560px] overflow-y-auto` at `MonitoringGrid.tsx:2134`; display column list uses `max-h-[240px] overflow-y-auto` in shared panel at `OperationalWorkspaceShells.tsx:289-297`; row-action body uses `overflow-y-auto` at `OperationalRowActionMenu.tsx:114`.

### Fails

- No shared owner currently enforces Monitoring’s one-active-overlay rule; the rule exists as local `togglePanel` logic in Monitoring rather than shared overlay state, so other workspaces can match only by duplication.
- Row-action menu layer ownership diverges from Monitoring’s anchored panel stack because the shared row-action component does not use `WORKSPACE_LAYER_Z`.

### Unknown

- Whether Monitoring’s anchored panels reposition correctly during complex nested grid scroll plus body scroll at runtime was not verified manually.
- Whether narrow viewport widths produce acceptable nested dropdown overlap inside the bulk panel was not runtime-verified.

## 5. Target readiness matrix

Legend: only the required classifications are used.

| Behavior row | Monitoring | External | Services |
| --- | --- | --- | --- |
| display panel | matches golden by shared primitive | matches golden by shared primitive | matches golden by shared primitive |
| saved views panel | matches golden by shared primitive | intentionally domain-specific | matches golden by shared primitive |
| bulk panel | matches golden by local duplicated wiring | matches golden by local duplicated wiring | matches golden by local duplicated wiring |
| bulk nested dropdown editor | matches golden by shared primitive | matches golden by shared primitive | matches golden by shared primitive |
| row action button menu | matches golden by local duplicated wiring | matches golden by local duplicated wiring | matches golden by local duplicated wiring |
| row right-click context menu | matches golden by shared primitive | matches golden by shared primitive | matches golden by shared primitive |
| outside click | matches golden by shared primitive | intentionally domain-specific | matches golden by shared primitive |
| Escape | matches golden by shared primitive | intentionally domain-specific | matches golden by shared primitive |
| dirty/draft close protection | matches golden by local duplicated wiring | intentionally domain-specific | accidental divergence |
| viewport top/bottom/right clamp | matches golden by shared primitive | matches golden by shared primitive | matches golden by shared primitive |
| no unnecessary grid/page scroll | unknown / not verified | unknown / not verified | unknown / not verified |
| native context menu suppression scope | matches golden by shared primitive | matches golden by shared primitive | accidental divergence |

Cell notes:

- External is intentionally domain-specific for saved-view panel dismissal because it protects unsaved typed view names by opening a confirmation modal instead of blindly closing: `frontend/src/components/External.tsx:1669-1688`.
- Services is accidental divergence for dirty/draft close protection because it has no saved-view draft close guard and uses a narrower `onClose={() => setShowViewsMenu(false)}` path on the panel close button at `frontend/src/components/ServicesReal.tsx:1973`.
- Services is accidental divergence for native context-menu suppression scope because it duplicates local suppression in `ServicesReal.tsx:1112-1121` in addition to shared hook ownership.

### Works

- All three target workspaces already share the same display panel shell, saved views shell, row right-click context-menu opener, and nested dropdown editor primitives.

### Fails

- One-active-overlay behavior is implemented three times through local `togglePanel` functions rather than one shared owner: Monitoring `:900-914`, External `:2151-2165`, Services `:841-855`.
- Services duplicates suppression owner for native context menu.

### Unknown

- Readiness for “no unnecessary grid/page scroll” is not source-complete because runtime interaction with AG Grid scroll containers was not exercised.

## 6. Shared primitive and ownership map

| Concern | Exact current owner | Classification |
| --- | --- | --- |
| overlay visual shell | `WorkspaceFloatingPanel` in `frontend/src/components/shared/OperationalWorkspacePrimitives.tsx:172-183` | keep as shared owner |
| anchored positioning | `useWorkspaceAnchoredLayer` in `frontend/src/components/shared/OperationalWorkspacePrimitives.tsx:83-137` | keep as shared owner |
| cursor/point positioning | `computeFloatingPanelRect`, `getPointFloatingStyle`, `getAnchoredFloatingStyle` in `frontend/src/components/shared/OperationalGridInteractions.ts:7-189`; row-action-specific geometry in `OperationalRowActionGeometry.ts:20-146` | consolidate into shared owner |
| row action geometry | `computeRowActionGeometry` in `frontend/src/components/shared/OperationalRowActionGeometry.ts:20-146` | keep as shared owner |
| row action content rendering | `OperationalRowActionMenu` in `frontend/src/components/shared/OperationalRowActionMenu.tsx:45-176` | keep as shared owner |
| row action context menu opening | `useOperationalContextMenu` in `frontend/src/components/shared/OperationalGridInteractions.ts:297-329` | keep as shared owner |
| native context-menu suppression | shared `useOperationalContextMenu` at `OperationalGridInteractions.ts:315-323`; duplicate local owner in `ServicesReal.tsx:1112-1121` | remove local duplicate later |
| outside click and Escape dismissal | `useOperationalDismissController` in `OperationalGridInteractions.ts:332-365` delegating to `useWorkspaceDismissHandlers` in `OperationalWorkspaceHooks.ts:54-80` | keep as shared owner |
| panel mutual exclusion | local `togglePanel` in Monitoring `:900-914`, External `:2151-2165`, Services `:841-855` | consolidate into shared owner |
| nested dropdown protection | shared `[data-workspace-panel]` checks in `useOperationalDismissController` `OperationalGridInteractions.ts:356`, `AppDropdown.tsx:57-68`, `WorkspaceSelectField` `OperationalWorkspacePrimitives.tsx:457-470` | keep as shared owner |
| AppDropdown / WorkspaceSelectField positioning and outside-click handling | `AppDropdown.tsx:54-68,153-155`; `OperationalWorkspacePrimitives.tsx:419-470,495-496` | keep as shared owner |
| viewport clamp | anchored: `useWorkspaceAnchoredLayer`; point menu: `computeFloatingPanelRect` and `computeRowActionGeometry` | consolidate into shared owner |
| z-index/layer tokens | `WORKSPACE_LAYER_Z` in `OperationalWorkspacePrimitives.tsx:7-12`; row-action `zIndex: 1115` in `OperationalRowActionMenu.tsx:87-90` | consolidate into shared owner |
| internal overflow/scroll handling | per-component shell content: `OperationalRowActionMenu.tsx:114`, `OperationalWorkspaceShells.tsx:289-297`, workspace bulk panels at Monitoring `:2134`, External `:2988`, Services `:1999` | leave domain-owned |

### Works

- Core anchored overlay visual shell, positioning, and dismiss behavior already live in shared files.

### Fails

- Positioning and layer ownership are split across too many shared functions and one hardcoded row-action z-index path.
- Mutual exclusion still belongs to each workspace instead of one shared contract owner.

### Unknown

- Whether `getPointFloatingStyle` and `getAnchoredFloatingStyle` are still active production owners for any target panel path was not fully runtime-proven; source proves they exist, not that all are still called in target pages.

## 7. Zero-divergence floating-panel contract draft

### Works

- One-active-overlay policy draft: exactly one top-level workspace overlay may be open at a time among display, saved views, bulk, and row action menu. Allowed exception: nested child overlays inside an already-open top-level panel may remain open if they mark themselves with `data-workspace-panel="true"`.
- Opening source draft: anchored overlays must open from a trigger rect; row-action/context menus must open from cursor point.
- Body portal and layer rules draft: all top-level floating panels should render to `document.body`; all should use shared layer tokens rather than local z-index literals.
- Anchor updates on resize/scroll draft: anchored overlays must recalc on `resize` and capturing `scroll`, matching `useWorkspaceAnchoredLayer`.
- Viewport clamp and max-height draft: anchored and point menus must clamp left/right within viewport padding and choose above/below placement based on available space; internal content must scroll inside the panel rather than force page scroll when panel content exceeds available height.
- Outside click draft: top-level overlay closes on outside click unless the click is inside a registered trigger, inside the panel itself, or inside any descendant marked `[data-workspace-panel]`.
- Escape draft: Escape closes the active top-level overlay unless a domain-owned dirty/draft protection path intercepts closure.
- Nested dropdown stability draft: nested dropdowns must set `data-workspace-panel="true"` and stop `mousedown` propagation at their portal root.
- Event propagation draft: row-action trigger buttons must stop propagation so opening the menu does not affect row selection.
- Native context-menu suppression scope draft: suppress native context menus only within AG Grid root wrappers and row-action menu containers; do not broaden to unrelated document areas.
- Domain-owned item labels/actions/persistence draft: overlay shell and dismissal are shared; menu labels, saved-view persistence, bulk action semantics, restore/archive/purge law, and dirty-modal content remain workspace-owned.
- Dirty/draft close protection draft: a domain may intercept outside/Escape close only when it has a source-proven user-data protection rule, as External does for unsaved typed saved-view names.

### Fails

- Current source does not yet provide one shared owner for the one-active-overlay policy, layer tokens, or all viewport clamp variants.

### Unknown

- Whether a single generalized geometry helper can replace both row-action geometry and anchored panel clamp code without degrading UX is not proven by source alone.

## 8. Risk register

| Risk | Source classification | Evidence | Audit classification |
| --- | --- | --- | --- |
| Multiple geometry primitives may already exist and drift | source-proven | `useWorkspaceAnchoredLayer` `OperationalWorkspacePrimitives.tsx:83`; `computeFloatingPanelRect`, `getAnchoredFloatingStyle`, `getPointFloatingStyle` `OperationalGridInteractions.ts:7-189`; `computeRowActionGeometry` `OperationalRowActionGeometry.ts:20-146` | Fail |
| `OperationalRowActionMenu` uses its own geometry and z-index path | source-proven | `OperationalRowActionMenu.tsx:87-90` hardcodes `zIndex: 1115`; geometry comes from `computeRowActionGeometry` | Fail |
| `AppDropdown` and `WorkspaceSelectField` have their own outside-click handling; nested panels may close parent unless `data-workspace-panel` is honored | source-proven protective behavior, no failure proven in target workspaces | `AppDropdown.tsx:57-68,153-155`; `OperationalWorkspacePrimitives.tsx:457-470,495-496`; `AppDropdown.test.tsx:58-123` | Works |
| `useOperationalContextMenu` suppression may be too broad or too narrow | source-proven hook, runtime edge not verified | `OperationalGridInteractions.ts:315-323`; no runtime proof for non-grid pages | Unknown |
| External dirty/draft saved-view close confirmation could be erased by shared dismissal | source-proven domain exception | `External.tsx:1669-1688` | Works |
| Full typecheck may be blocked by unrelated Network/Vendors errors | source-proven from OUT-10 proof | `frontend/OUT-10-ITERATION-05-PROOF.md:58-71` | Works |

## 9. Iteration 02 implementation recommendation

- Recommended next prompt type: `implementation`

Precise objective:

- consolidate top-level floating-panel contract ownership for Monitoring, External, and Services without changing selection behavior, domain actions, saved-view persistence semantics, or External’s unsaved-name close protection.

Allowed files:

- `frontend/src/components/shared/OperationalGridInteractions.ts`
- `frontend/src/components/shared/OperationalRowActionMenu.tsx`
- `frontend/src/components/shared/OperationalRowActionGeometry.ts`
- `frontend/src/components/shared/OperationalWorkspacePrimitives.tsx`
- `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/External.tsx`
- `frontend/src/components/ServicesReal.tsx`
- focused tests under `frontend/src/components/shared/`

Forbidden files:

- `frontend/src/components/shared/OperationalDataGrid.tsx`
- `frontend/src/components/shared/OperationalGridMatrix.tsx`
- `frontend/src/components/shared/OperationalGridInteractions.test.tsx` except additive non-selection overlay assertions if needed
- any backend, route, package, config, lockfile, or non-target workspace files

Migration order:

1. unify shared layer token ownership for row-action and anchored panels;
2. centralize one-active-overlay and dismissal contract in shared code while preserving workspace content ownership;
3. remove Services’ duplicate native context-menu suppression;
4. keep External dirty saved-view close interception as an explicit workspace exception;
5. update focused overlay tests;
6. run targeted verification.

Consolidation scope:

- consolidate dismissal and layer ownership first;
- do not attempt broad geometry replacement unless the implementation can reuse existing row-action geometry without touching the OUT-10 grid interaction contract.

Proposed test targets:

- `frontend/src/components/shared/AppDropdown.test.tsx`
- `frontend/src/components/shared/__tests__/row-action.test.ts`
- focused new tests for shared dismiss-controller behavior if added

Proposed manual validation checklist:

1. Monitoring: open display, saved views, bulk, and row action menu and verify only one top-level overlay stays open.
2. Monitoring: right-click a row near viewport bottom and right edge and verify row-action clamp.
3. Monitoring: open bulk panel, then nested dropdown, then click inside nested dropdown and verify parent stays open.
4. External: type a saved-view name, click outside and press Escape, and verify confirmation modal appears instead of silent close.
5. Services: confirm native context menu is suppressed only inside grid/menu surfaces after duplicate suppression removal.
6. All three: confirm no row-selection regression during row action button click and right-click open.

Stop conditions:

- stop if any change requires `selectionScopeKey` logic edits;
- stop if any proposed fix depends on a z-index-only patch without addressing owner drift;
- stop if preserving External dirty-close protection would require changing its modal semantics.

This is the one conditional next step recommendation for this audit:

- If OUT-11 Iteration 02 stays limited to the shared owners above and keeps External’s dirty-close rule explicit, use an implementation prompt for shared overlay contract consolidation.

## 10. Proof and verification record

Exact source-search commands used:

```bash
rtk rg -n --hidden --glob '!node_modules' --glob '!dist' --glob '!build' "useWorkspaceAnchoredLayer|WorkspaceFloatingPanel|OperationalAnchoredPanel|OperationalDisplayPanel|OperationalSavedViewsPanel|OperationalRowActionMenu|computeRowActionGeometry|computeFloatingPanelRect|getPointFloatingStyle|getAnchoredFloatingStyle|useOperationalContextMenu|useOperationalDismissController|useWorkspaceDismissHandlers|AppDropdown|WorkspaceSelectField|WorkspaceInfoTooltip|WorkspaceFlyoutDropdownEditor|data-workspace-panel|row-action-menu-container|onContextMenu|contextmenu|Escape|mousedown|click|getBoundingClientRect|zIndex|preventDefault|stopPropagation|selectionScopeKey" frontend
rtk rg -n "showDisplayMenu|showViewsMenu|showBulkMenu|rowActionMenu|useWorkspaceAnchoredLayer|useOperationalDismissController|useOperationalContextMenu|OperationalDisplayPanel|OperationalSavedViewsPanel|WorkspaceFloatingPanel|WorkspaceFlyoutDropdownEditor|OperationalRowActionMenu|selectionScopeKey|onContextMenu|preventDefault|data-workspace-panel" frontend/src/components/MonitoringGrid.tsx frontend/src/components/External.tsx frontend/src/components/ServicesReal.tsx
rtk rg -n "const togglePanel|useOperationalRowInteractions|handleCellContextMenu|selectionScopeKey|renderPrimaryRowActions|row-action-trigger|MoreVertical" frontend/src/components/MonitoringGrid.tsx frontend/src/components/External.tsx frontend/src/components/ServicesReal.tsx
```

Exact files inspected:

- `frontend/OUT-10-ITERATION-05-PROOF.md`
- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/External.tsx`
- `frontend/src/components/ServicesReal.tsx`
- `frontend/src/components/shared/OperationalWorkspacePrimitives.tsx`
- `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
- `frontend/src/components/shared/OperationalGridInteractions.ts`
- `frontend/src/components/shared/OperationalRowActionMenu.tsx`
- `frontend/src/components/shared/OperationalRowActionGeometry.ts`
- `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
- `frontend/src/components/shared/AppDropdown.tsx`
- `frontend/src/components/shared/WorkspaceFlyout.tsx`
- `frontend/src/components/shared/OperationalDataGrid.tsx`
- `frontend/src/components/shared/OperationalGridMatrix.tsx`
- `frontend/src/components/shared/__tests__/row-action.test.ts`
- `frontend/src/components/shared/AppDropdown.test.tsx`

Manual UI validation: Not run

Reason:

- this iteration was audit-only and the source was sufficient to prove shared owners, duplicated owners, and the External protection exception; no cheap runtime pass was required to produce the contract report safely.

Focused tests inspected but not run:

- `frontend/src/components/shared/__tests__/row-action.test.ts`
- `frontend/src/components/shared/AppDropdown.test.tsx`
- `frontend/src/components/shared/OperationalGridInteractions.test.tsx` for OUT-10 contract awareness

Command proving report file exists and is non-empty:

```bash
test -s frontend/OUT-11-ITERATION-01-FLOATING-PANEL-CONTRACT-AUDIT.md
```

Explicit unknowns:

- runtime stacking order between hardcoded row-action `zIndex: 1115` and anchored panels using `WORKSPACE_LAYER_Z.floatingPanel` under every app shell state;
- runtime clamp quality for nested dropdowns near narrow viewport edges;
- runtime page-scroll versus panel-scroll behavior during long grouped grids;
- whether `getPointFloatingStyle` or `getAnchoredFloatingStyle` still have live target-workspace call sites beyond the audited source references.
