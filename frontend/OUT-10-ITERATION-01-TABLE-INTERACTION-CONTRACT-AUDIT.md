# OUT-10 Iteration 01 Table Interaction Contract Audit

## Scope

Audit target: operational table interaction behavior across Monitoring, External, and Services.

Constraint honored: no production code changes were made in this iteration. This report is the only repo change.

Goal of this audit: determine whether one shared table interaction contract already exists in practice, where drift still exists, and what should be promoted into shared ownership before any more local fixes are attempted.

## Audit Method

This audit is primarily source-inspection based.

Shared interaction and grid primitives inspected:

- `frontend/src/components/shared/OperationalDataGrid.tsx`
- `frontend/src/components/shared/OperationalGridMatrix.tsx`
- `frontend/src/components/shared/OperationalGridInteractions.ts`
- `frontend/src/components/shared/OperationalGridStandard.tsx`
- `frontend/src/components/shared/OperationalGridContract.ts`
- `frontend/src/components/shared/OperationalGridSizing.ts`
- `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
- `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
- `frontend/src/index.css`

Domain implementations inspected:

- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/External.tsx`
- `frontend/src/components/ServicesReal.tsx`

Existing evidence/tests inspected:

- `frontend/src/components/shared/OperationalDataGrid.contract.test.ts`
- `frontend/tests/pom/MonitoringView.ts`
- `frontend/tests/helpers/sysgrid.ts`
- `frontend/tests/helpers/sysgrid-test.ts`

## Commands Run

- `rtk sed -n '1,220p' /Users/haewonkim/.codex/RTK.md`
- `rtk sed -n '1,220p' /Users/haewonkim/.codex/law.md`
- `rtk rg --files frontend | rg '(Monitoring|External|Services|table|grid|DataGrid|AGENTS\.md|OUT-10)'`
- `rtk rg -n "useOperationalRowInteractions|useOperationalContextMenu|OperationalDataGrid|buildOperationalGridColumnDefinitions|renderOperationalActionButtons|onRowClicked|onRowDoubleClicked|onCellContextMenu|rowSelection|headerHeight|rowHeight|row_actions" frontend/src/components/shared frontend/src/components/MonitoringGrid.tsx frontend/src/components/External.tsx frontend/src/components/ServicesReal.tsx`
- `rtk sed -n '1,260p' frontend/src/components/shared/OperationalGridInteractions.ts`
- `rtk sed -n '1,260p' frontend/src/components/shared/OperationalGridMatrix.tsx`
- `rtk sed -n '520,760p' frontend/src/components/shared/OperationalGridStandard.tsx`
- `rtk sed -n '260,720p' frontend/src/index.css`
- targeted `rtk sed -n` and `rtk rg -n` reads against Monitoring, External, and Services call sites

## Manual / Browser Checks

None performed in this iteration.

Result: pointer-modifier behavior, native context-menu suppression, menu anchoring, and visual density were inferred from source, not confirmed in a running browser.

## What Was Not Verified

- Actual browser runtime behavior for `metaKey` on macOS vs `ctrlKey` on Windows/Linux.
- Whether AG Grid emits identical row-click and double-click event ordering under all three screens.
- Exact right-click behavior on empty grid whitespace versus populated cells.
- Visual scrollbar rhythm and hover/selected paint in a live browser.
- Any hidden divergence introduced by data shape or backend timing.
- Any end-to-end test currently asserting this shared contract. Existing tests do not cover it.

## Executive Findings

1. A substantial shared table contract already exists.
   Evidence: `OperationalDataGrid`, `OperationalGridMatrix`, `OperationalGridInteractions`, `OperationalGridStandard`, `OperationalGridContract`, and shared CSS in `frontend/src/index.css`.

2. Monitoring is the closest thing to the current golden behavior, but it is not purely “local Monitoring code.”
   The actual golden path is a shared primitive stack plus Monitoring-specific targets and menu content.

3. External and Services already consume the same shared grid shell and the same shared row interaction hook.
   This is good: the highest-ROI path is to strengthen the existing primitive, not replace it.

4. The biggest remaining drift is not raw-row click behavior.
   The biggest remaining drift is grouped-mode selection ownership and range-selection lifecycle.

5. External currently diverges materially in grouped selection handling.
   Monitoring and Services aggregate selection across grouped tables; External overwrites selection with only the currently active subgroup.

6. Shift-range selection lifecycle is not fully shared.
   Monitoring resets the range anchor on data/tab changes; External and Services do not.

7. The current shared context-menu suppression is broad.
   Native context menus are prevented for any target inside `.ag-root-wrapper` or `.row-action-menu-container`, even when no app menu is opened.

8. Current automated coverage is insufficient for this contract.
   The only `OperationalDataGrid` source contract test covers query-error rendering, not interaction behavior.

## File / Path Inventory

### Shared grid ownership

- `frontend/src/components/shared/OperationalDataGrid.tsx`
- `frontend/src/components/shared/OperationalGridMatrix.tsx`
- `frontend/src/components/shared/OperationalGridInteractions.ts`
- `frontend/src/components/shared/OperationalGridStandard.tsx`
- `frontend/src/components/shared/OperationalGridContract.ts`
- `frontend/src/components/shared/OperationalGridSizing.ts`
- `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
- `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
- `frontend/src/index.css`

### Monitoring ownership

- `frontend/src/components/MonitoringGrid.tsx`

### External ownership

- `frontend/src/components/External.tsx`

### Services ownership

- `frontend/src/components/ServicesReal.tsx`

### Existing test evidence

- `frontend/src/components/shared/OperationalDataGrid.contract.test.ts`
- `frontend/tests/pom/MonitoringView.ts`
- `frontend/tests/helpers/sysgrid.ts`
- `frontend/tests/helpers/sysgrid-test.ts`

## Golden Monitoring Behavior

Monitoring is the reference because it uses the shared primitives most completely and adds the fewest ad hoc interaction exceptions.

### Normal row click

Observed behavior:

- Shared hook `useOperationalRowInteractions` handles row click in `frontend/src/components/shared/OperationalGridInteractions.ts:159-191`.
- Non-modified row click deselects all rows, then selects only the clicked row.
- Clicks originating inside buttons, links, form controls, AG Grid selection checkbox wrappers, or `.row-action-menu-container` are ignored by row selection via `shouldIgnoreRowSelection()` in `frontend/src/components/shared/OperationalGridInteractions.ts:64-75`.
- Monitoring wires this shared handler in `frontend/src/components/MonitoringGrid.tsx:951-965`.

Contract implication:

- Single-click row selection is shared-owned.
- Action cells and utility controls are isolated from row selection.

### Double-click detail behavior

Observed behavior:

- Shared hook calls `onRowDoubleClick` when the target is not ignored and the row is not pending: `frontend/src/components/shared/OperationalGridInteractions.ts:193-202`.
- Monitoring binds double-click to `detailRoute.openDetail(item)` in `frontend/src/components/MonitoringGrid.tsx:951-955`.

Contract implication:

- Double-click dispatch is shared-owned.
- The detail target is domain-owned.

### Ctrl / Meta multi-select

Observed behavior:

- Shared hook toggles the clicked row when `metaKey` or `ctrlKey` is pressed: `frontend/src/components/shared/OperationalGridInteractions.ts:165,181-184`.
- Because `OperationalGridMatrix` sets `rowSelection="multiple"` and `suppressRowClickSelection={true}`, the shared hook is the effective owner of row-click selection semantics: `frontend/src/components/shared/OperationalGridMatrix.tsx:51-78`.

Contract implication:

- Modifier-based multi-select is shared-owned and already standardized.

### Shift range selection

Observed behavior:

- Shared hook supports shift-range selection using `selectionAnchorRef` and `forEachNodeAfterFilterAndSort`: `frontend/src/components/shared/OperationalGridInteractions.ts:166-180`.
- Monitoring explicitly resets the anchor when `activeTab` or `items` change: `frontend/src/components/MonitoringGrid.tsx:1445-1447`.

Contract implication:

- Range-select algorithm is shared-owned.
- Range-anchor lifecycle is not yet fully shared-owned.

### Right-click app menu behavior

Observed behavior:

- Shared `handleCellContextMenu` prevents native context menu and opens a row action menu at cursor position for populated cells: `frontend/src/components/shared/OperationalGridInteractions.ts:214-220`.
- Monitoring binds this to its row action menu state in `frontend/src/components/MonitoringGrid.tsx:826-829`.
- Monitoring row action menu content is domain-owned in `frontend/src/components/MonitoringGrid.tsx:2208-2240`.

Contract implication:

- Right-click dispatch and point anchoring are shared-owned.
- Menu content is domain-owned.

### Native context menu suppression rules

Observed behavior:

- Shared hook adds a document-level listener that calls `preventDefault()` for any target inside `.ag-root-wrapper` or `.row-action-menu-container`: `frontend/src/components/shared/OperationalGridInteractions.ts:222-233`.
- This suppresses the browser context menu even where no app menu is subsequently opened.

Contract implication:

- Suppression rule is shared-owned.
- Current scope is broader than “row with menu.”

### Row action cell event isolation

Observed behavior:

- Shared `shouldIgnoreRowSelection()` ignores `.row-action-menu-container` and interactive descendants: `frontend/src/components/shared/OperationalGridInteractions.ts:64-75`.
- Monitoring row action buttons all call `event.stopPropagation()`: `frontend/src/components/MonitoringGrid.tsx:982-1034`.
- Shared action/identity renderers also stop propagation on button interactions: `frontend/src/components/shared/OperationalGridStandard.tsx:147-167, 503-523, 645-718`.

Contract implication:

- Event isolation is mostly shared-owned and correctly reinforced at domain call sites.

### Utility / action column sizing

Observed behavior:

- Shared width constants in `frontend/src/components/shared/OperationalGridContract.ts:34-49`.
- Shared utility columns in `frontend/src/components/shared/OperationalGridStandard.tsx:552-718`.
- Shared action column pinning/fixed width in `frontend/src/components/shared/OperationalGridContract.ts:190-201`.
- Monitoring uses standard action width `208` via `OPERATIONAL_GRID_WIDTHS.standardAction`: `frontend/src/components/MonitoringGrid.tsx:1850-1855`.

Current shared grammar:

- select: `64`
- recent change: `80`
- favorite: `80`
- watch: `85`
- id: `90`
- identity default: `220`
- compact action: `124`
- standard action: `208`
- action column pinned right, fixed width
- identity column pinned left

Contract implication:

- Utility/action grammar and fixed-width behavior are already shared-owned.

### Density / row height / header height / padding / hover / selected state / scrollbar rhythm

Observed behavior:

- `OperationalGridMatrix` computes `headerHeight = fontSize + rowDensity + 10` and `rowHeight = fontSize + rowDensity + 4`: `frontend/src/components/shared/OperationalGridMatrix.tsx:57-58`.
- `OperationalDataGrid` defaults are `fontSize = 11`, `rowDensity = 24`: `frontend/src/components/shared/OperationalDataGrid.tsx:67-68`.
- Monitoring’s actual screen state defaults are `fontSize = 11`, `rowDensity = 8`: `frontend/src/components/MonitoringGrid.tsx:293-324, 496-497`.
- Shared CSS owns alternating row color, hover color, selected color, action button minimum size, utility padding, overflow policy, and AG Grid shell styling in `frontend/src/index.css:261-741`.
- Grouped panels use `custom-scrollbar`, but live scrollbar behavior was not manually verified.

Contract implication:

- Visual rhythm is mostly shared-owned.
- The primitive default `rowDensity = 24` does not match actual domain defaults `8`; this is latent drift risk if a consumer omits explicit props.

## External Current Behavior

### Shared with Monitoring

- Uses `OperationalDataGrid`: `frontend/src/components/External.tsx:3273-3358`
- Uses `useOperationalRowInteractions`: `frontend/src/components/External.tsx:2435-2449`
- Uses `useOperationalContextMenu`: `frontend/src/components/External.tsx:1706, 2451-2453`
- Uses `buildOperationalGridColumnDefinitions`: `frontend/src/components/External.tsx:2648-2660`
- Uses shared visual shell and density controls

### Divergences

1. Grouped selection does not aggregate across groups.
   Evidence: `handleExternalSelectionChanged` only reads the active grid API selection and replaces `selectedIds`: `frontend/src/components/External.tsx:2456-2459`.

2. Shift anchor reset is not owned locally.
   Evidence: External does not retain `selectionAnchorRef` from the shared hook and does not reset it on dataset/tab changes.

3. External’s double-click target is tab-sensitive.
   Evidence: in links mode, double-click opens the linked entity detail instead of the link itself: `frontend/src/components/External.tsx:2435-2443`.

4. Utility columns are conditional by tab.
   Evidence: favorites/watch/recent-change are disabled for links mode: `frontend/src/components/External.tsx:2648-2658`.

Assessment:

- Raw-grid behavior is largely aligned.
- Grouped-mode selection behavior is not aligned with Monitoring.

## Services Current Behavior

### Shared with Monitoring

- Uses `OperationalDataGrid`: `frontend/src/components/ServicesReal.tsx:2195-2280`
- Uses `useOperationalRowInteractions`: `frontend/src/components/ServicesReal.tsx:895-898, 1759-1765`
- Uses `useOperationalContextMenu`: `frontend/src/components/ServicesReal.tsx:788-792, 1763-1765`
- Uses `buildOperationalGridColumnDefinitions`: `frontend/src/components/ServicesReal.tsx:1710-1720`
- Uses grouped selection aggregation like Monitoring: `frontend/src/components/ServicesReal.tsx:769-781`

### Divergences

1. Shift anchor reset is not owned locally.
   Evidence: Services uses the shared hook but does not expose/reset `selectionAnchorRef`.

2. Services repeats grouped selection aggregation logic locally rather than consuming a shared selection coordinator.
   Evidence: `groupSelectionsRef` and aggregation in `frontend/src/components/ServicesReal.tsx:639, 769-781`.

3. Services uses `detailRoute.openDetail(item, { replace: false })` rather than Monitoring’s default detail call.
   Evidence: `frontend/src/components/ServicesReal.tsx:895-898, 911`.

Assessment:

- Services is materially closer to Monitoring than External is.
- Its remaining drift is mostly lifecycle ownership, not user-facing behavior.

## Shared vs Domain Ownership

### Shared should own

- Row click selection semantics.
- Ctrl/meta toggle semantics.
- Shift range selection semantics.
- Range-anchor reset lifecycle on dataset/group/tab changes.
- Right-click dispatch and native context-menu suppression rules.
- Event isolation for utility cells, action cells, and identity/action buttons.
- Utility column grammar.
- Fixed widths and pinning for utility/action columns.
- Header height / row height primitives.
- Shared AG Grid shell, row styling, hover/selected paint, action button minimum hit area.
- Grouped-grid selection aggregation semantics.

### Domain should own

- Column list and field choice.
- Value renderers for domain meaning.
- Row action menu sections and labels.
- Which route/modal opens for detail/edit/history.
- Which actions are hidden or disabled.
- Which utility columns are shown in a given domain/tab.
- Domain-specific pending-row disablement.

## Divergence Matrix

| Behavior | Monitoring golden behavior | External current behavior | Services current behavior | Shared contract rule | Domain exception allowed | Risk | Recommended action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Single row click | Select only clicked row, ignore interactive descendants | Same shared hook | Same shared hook | Shared owns | No | Low | Keep in shared hook |
| Double click | Open monitor detail | Open entity detail, or linked entity detail in links tab | Open service detail with `replace: false` | Shared dispatch, domain target | Yes | Low | Keep target domain-owned |
| Ctrl/meta toggle | Toggle clicked row | Same shared hook | Same shared hook | Shared owns | No | Low | Keep in shared hook |
| Shift range | Shared range algorithm plus Monitoring anchor reset on data/tab change | Shared range algorithm but no explicit anchor reset | Shared range algorithm but no explicit anchor reset | Shared must own both algorithm and lifecycle | No | Medium | Move anchor reset into shared controller |
| Grouped selection aggregation | Aggregates selection across group tables | Replaces selection from active subgroup only | Aggregates selection across group tables | Shared must own grouped selection semantics | No | High | Create shared grouped selection coordinator and migrate External |
| Right-click populated cell | Prevent native menu and open row app menu at pointer | Same shared hook | Same shared hook | Shared owns | No | Low | Keep in shared hook |
| Native context menu suppression | Suppress in grid root and action-menu containers | Same shared hook | Same shared hook | Shared owns suppression policy | Possibly, but only intentionally | Medium | Narrow/clarify suppression scope in contract before implementation |
| Right-click action cell | Native menu suppressed, row selection ignored, no row app menu from ignored target | Same | Same | Shared owns | No | Medium | Explicitly document this as intended or revise in next iteration |
| Row action event isolation | Action buttons stop propagation and are excluded from selection | Same pattern | Same pattern | Shared owns baseline, domain reinforces | No | Low | Add interaction tests |
| Utility/action widths | Shared widths and pinning, standard action width `208` | Shared widths, compact action width `124` | Shared widths, standard action width `208` | Shared owns width grammar | Yes, width choice between allowed shared sizes | Low | Keep width constants centralized |
| Density defaults | Actual Monitoring default `fontSize 11`, `rowDensity 8` | Same effective defaults | Same effective defaults | Shared should own actual default rhythm | No | Medium | Align primitive defaults with workspace defaults in implementation phase |
| Hover / selected visuals | Shared CSS | Shared CSS | Shared CSS | Shared owns | No | Low | Keep centralized |
| Pending row disablement | Pending rows dimmed and non-interactive | Not applicable locally | Pending rows dimmed and non-interactive | Shared may expose hook input; domain owns pending IDs | Yes | Low | Keep domain-owned pending source |

## Code Ownership Map

### Monitoring table files

- `frontend/src/components/MonitoringGrid.tsx`

### External table files

- `frontend/src/components/External.tsx`

### Services table files

- `frontend/src/components/ServicesReal.tsx`

### Existing shared primitives

- `frontend/src/components/shared/OperationalDataGrid.tsx`
- `frontend/src/components/shared/OperationalGridMatrix.tsx`
- `frontend/src/components/shared/OperationalGridInteractions.ts`
- `frontend/src/components/shared/OperationalGridStandard.tsx`
- `frontend/src/components/shared/OperationalGridContract.ts`
- `frontend/src/components/shared/OperationalGridSizing.ts`
- `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
- `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
- `frontend/src/index.css`

### Local one-off interaction handlers that should not survive long term

- Monitoring grouped selection aggregation:
  `frontend/src/components/MonitoringGrid.tsx:694, 810-821`
- Services grouped selection aggregation:
  `frontend/src/components/ServicesReal.tsx:639, 769-781`
- External subgroup-only selection overwrite:
  `frontend/src/components/External.tsx:2456-2459`
- Monitoring-only shift-anchor reset:
  `frontend/src/components/MonitoringGrid.tsx:1445-1447`

These should become shared behavior, not remain per-screen event logic.

### Local handlers that should survive because they are domain-owned

- Monitoring row action menu content and detail/edit/history/knowledge targets
- External entity vs link modal/detail behavior
- Services detail/edit/action menu content
- Domain-specific disabled/hidden action rules

## Existing Coverage Gaps

Current test evidence is not sufficient for this contract.

- `frontend/src/components/shared/OperationalDataGrid.contract.test.ts` only asserts query-error rendering behavior.
- `frontend/tests/pom/MonitoringView.ts` exposes a page object but does not assert row click, double click, ctrl/meta selection, shift selection, or right-click behavior.
- No inspected Playwright test asserts shared table interaction behavior across Monitoring, External, and Services.

Conclusion:

- The codebase has a shared primitive.
- The codebase does not yet have a shared interaction contract test suite.

## Highest-ROI Implementation Path

Recommendation: strengthen the existing shared primitive stack rather than introducing a new table abstraction.

Why:

- The shared shell already exists.
- The shared event hook already exists.
- The shared width grammar already exists.
- The shared CSS already exists.
- The largest remaining drift is behavior ownership leakage, not missing infrastructure.

### Recommended implementation direction for the next iteration

1. Promote grouped selection aggregation into shared ownership.
   Likely shape: a shared selection coordinator hook used by `OperationalDataGrid` consumers for raw and grouped modes.

2. Promote range-anchor lifecycle reset into shared ownership.
   Monitoring’s local reset should become a shared rule keyed to dataset, tab, or selection scope changes.

3. Keep `useOperationalRowInteractions` as the core event engine, but expand its contract.
   It already owns single click, modifier toggle, shift range, and double click dispatch.

4. Keep `OperationalDataGrid` and `OperationalGridMatrix` as the shared shell.
   Replacing them would be lower ROI and would recreate drift risk.

5. Keep domain action menu content and detail/edit targets out of shared code.
   Those are correctly domain-specific.

6. Add explicit interaction contract tests before any more local grid fixes.
   Minimum matrix: Monitoring, External, Services x single-click, double-click, ctrl/meta toggle, shift range, right-click menu, action-cell isolation.

## Proposed Shared Contract

If Iteration 02 implements from this report, the contract should be written as:

1. Any operational workspace table uses `OperationalDataGrid`.
2. Row selection by click is shared-owned and never delegated to AG Grid default row-click selection.
3. Interactive descendants do not affect row selection.
4. Ctrl/meta toggles selection membership.
5. Shift selects a contiguous visible range after filter/sort.
6. Range anchor resets whenever the row universe or selection scope changes.
7. Right-click on a populated non-interactive cell opens the row app menu at pointer position.
8. Native context menu suppression is intentional, documented, and scoped.
9. Utility columns and action columns use shared width/pinning grammar only.
10. Domain code may choose which shared utility columns are present and what actions/details they trigger, but may not rewrite core row interaction semantics locally.
11. Grouped mode selection semantics match raw mode semantics and aggregate across visible grouped tables.
12. Visual rhythm defaults are shared-owned and not left to ad hoc domain defaults.

## Safe Prompt Readiness

This audit is sufficient to generate a safe implementation prompt for shared contract enforcement with two caveats:

- browser/runtime verification is still needed for modifier-key and context-menu behavior;
- the implementation prompt should explicitly include grouped-mode selection aggregation and shift-anchor lifecycle, not just raw-row click behavior.

## Iteration 01 Bottom Line

The foundation is already present in shared code, but it is not fully locked.

The correct next move is not a Monitoring micro-fix and not a new table rewrite. The correct next move is to formalize the existing shared primitive as the contract source of truth, absorb grouped selection and range-anchor lifecycle into shared ownership, and then add cross-domain interaction tests so Monitoring, External, and Services cannot drift again.
