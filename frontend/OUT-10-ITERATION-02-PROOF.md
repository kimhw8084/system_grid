# OUT-10 Iteration 02 Proof

## Changed files summary

### Shared contract changes
- `frontend/src/components/shared/OperationalGridInteractions.ts`

### Monitoring wiring
- `frontend/src/components/MonitoringGrid.tsx`

### External wiring
- `frontend/src/components/External.tsx`

### Services wiring
- `frontend/src/components/ServicesReal.tsx`

### Tests
- `frontend/src/components/shared/OperationalGridInteractions.test.tsx`

### Report / addendum
- This proof file documents Iteration 02 decisions. The Iteration 01 audit remains the source artifact.

## Shared grouped-selection contract

`useOperationalGroupedSelection` now owns grouped selection aggregation in `frontend/src/components/shared/OperationalGridInteractions.ts`.

Contract:
- Each grid instance reports its selected row IDs through `handleSelectionChanged(event, groupKey)`.
- The shared hook stores selections by `groupKey`.
- The shared hook publishes one deduplicated `selectedIds` array across all groups.
- `resetGroupedSelection()` clears the shared group map and the exposed selected IDs.

Consumer usage:
- Monitoring passes `raw` for the raw grid and `section.key` for grouped grids.
- Services passes `raw` for the raw grid and `section.key` for grouped grids.
- External passes `raw` for the raw grid and `section.key` for grouped grids.

Proof:
- External no longer derives selection from only the active subgroup’s selected nodes. Both raw and grouped `External` grids now call the shared aggregator.
- Monitoring and Services no longer keep local `groupSelectionsRef` ownership. Their duplicated per-screen aggregation was removed and replaced with the shared hook.

## Shared range-anchor lifecycle

`useOperationalRowInteractions` now accepts `selectionScopeKey` and resets its internal shift-range anchor whenever that key changes.

Scope keys used:
- Monitoring: `${activeTab}:${groupBy}:${displayedItemsInOrder ids}`
- Services: `${activeTab}:${groupBy}:${displayedItemsInOrder ids}`
- External: `${activeTab}:${groupBy}:${visible filtered ids}`

This moves anchor reset into shared ownership while keeping each screen responsible for defining its visible row universe.

Effect:
- Tab changes reset the anchor.
- Group mode changes reset the anchor.
- Visible-row changes from filtering, search, sort, or data changes reset the anchor because the visible ID list changes.

## Test coverage added

`frontend/src/components/shared/OperationalGridInteractions.test.tsx` covers:
- single row click selects only the clicked row;
- ctrl-click toggles membership;
- shift-click selects a contiguous visible range;
- interactive targets do not trigger row selection;
- grouped selection aggregation preserves selections across multiple group keys;
- anchor reset clears stale shift-range state when the selection scope changes.

## Verification

### Unit tests

Command:
```bash
rtk npx vitest run src/components/shared/OperationalGridInteractions.test.tsx src/components/shared/OperationalDataGrid.contract.test.ts
```

Output:
```text
RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend
Test Files  2 passed (2)
Tests  7 passed (7)
Duration  1.03s
```

### Typecheck

Command:
```bash
rtk npm run typecheck
```

Blocker:
```text
src/components/NetworkReal.tsx(956,22): error TS2345: Argument of type '{ item: any; }' is not assignable to parameter of type 'SetStateAction<{ item: any; point: { x: number; y: number; }; }>'.
src/components/NetworkReal.tsx(2572,35): error TS2339: Property 'style' does not exist on type '{ item: any; point: { x: number; y: number; }; }'.
src/components/VendorsReal.tsx(539,22): error TS2345: Argument of type '{ item: any; }' is not assignable to parameter of type 'SetStateAction<{ item: any; point: { x: number; y: number; }; }>'.
src/components/VendorsReal.tsx(1158,167): error TS2339: Property 'style' does not exist on type '{ item: any; point: { x: number; y: number; }; }'.
```

These errors are outside the `OUT-10` files changed in this iteration.

## Manual validation checklist

Not run in browser for this iteration.

Recommended manual checks:
- Monitoring raw grid: plain click, ctrl/meta click, shift click.
- Monitoring grouped grid: select rows in two different groups and confirm the bulk count aggregates across both groups.
- External grouped grid: select rows in one group, then another, and confirm the first group’s selection remains counted.
- Services grouped grid: select rows across two groups and confirm the aggregate selection count and bulk actions use all selected rows.
- On each screen, change tab/group/filter/search/sort and confirm a subsequent shift-click starts a fresh range instead of using a stale anchor.

## What was not verified

- Live browser behavior for Monitoring, External, and Services.
- macOS `metaKey` behavior in a real browser.
- End-to-end grid interaction coverage in Playwright.
- Full frontend typecheck cleanliness because of unrelated pre-existing errors in `NetworkReal.tsx` and `VendorsReal.tsx`.
