# OUT-10 Iteration 03 Proof

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

### Proof / report updates
- `frontend/OUT-10-ITERATION-03-PROOF.md`

## Exact shared reset contract

`useOperationalGroupedSelection` now accepts the same `selectionScopeKey` class used by `useOperationalRowInteractions`.

Reset input:
- `selectionScopeKey`

Reset behavior:
- when `selectionScopeKey` changes, the shared hook clears its internal `groupSelectionsRef` map;
- the shared hook also emits `setSelectedIds([])` so visible selection state is cleared at the same time.

Scope construction:
- Monitoring: `${activeTab}:${groupBy}:${displayedItemsInOrder ids}`
- External: `${activeTab}:${groupBy}:${visible filtered ids}`
- Services: `${activeTab}:${groupBy}:${displayedItemsInOrder ids}`

Why the behavior is now uniform:
- all three consumers pass `selectionScopeKey` into the shared grouped-selection hook;
- none of the three consumers keeps a separate local grouped-reset effect;
- grouped-selection reset now follows one shared lifecycle contract instead of per-screen reminders.

## Before / after

Iteration 02 behavior:
- grouped selection aggregation was shared;
- reset of the internal grouped-selection map still depended on consumer-local effects;
- Monitoring and Services reset only on local `groupBy` effects;
- External reset on a different local `activeTab` / `groupBy` effect;
- stale grouped IDs could survive in the shared map across scope changes and reappear on the next grouped selection event if keys overlapped.

Iteration 03 behavior:
- grouped-selection reset is driven by shared `selectionScopeKey`;
- changing tab, group mode, or visible row universe resets the internal grouped map in shared code;
- a later selection event starts from a fresh grouped-selection state and cannot re-emit stale IDs from the previous scope.

## Consumer proof

Monitoring:
- uses `selectionScopeKey` built from `activeTab`, `groupBy`, and `displayedItemsInOrder`;
- passes that key into `useOperationalGroupedSelection`;
- no longer has a local grouped reset effect.

External:
- uses `selectionScopeKey` built from `activeTab`, `groupBy`, and the visible filtered row IDs for entities or links;
- passes that key into `useOperationalGroupedSelection`;
- no longer has a local grouped reset effect.

Services:
- uses `selectionScopeKey` built from `activeTab`, `groupBy`, and `displayedItemsInOrder`;
- passes that key into `useOperationalGroupedSelection`;
- no longer has a local grouped reset effect.

## Test proof

Command:
```bash
rtk npx vitest run src/components/shared/OperationalGridInteractions.test.tsx src/components/shared/OperationalDataGrid.contract.test.ts
```

Result:
```text
RUN  v4.1.9 /Users/haewonkim/home/development/sysgrid/frontend
Test Files  2 passed (2)
Tests  9 passed (9)
Duration  884ms
```

Shared lifecycle coverage now includes:
- grouped selections aggregate across groups before scope change;
- grouped-selection scope change clears the internal grouped-selection map;
- new grouped selection after scope change does not re-emit stale IDs;
- range-anchor reset still works with `selectionScopeKey`;
- existing click/toggle/range/interactive-target tests still pass.

## Typecheck / build proof

Command:
```bash
rtk npm run typecheck
```

Result:
```text
src/components/NetworkReal.tsx(956,22): error TS2345: Argument of type '{ item: any; }' is not assignable to parameter of type 'SetStateAction<{ item: any; point: { x: number; y: number; }; }>'.
src/components/NetworkReal.tsx(2572,35): error TS2339: Property 'style' does not exist on type '{ item: any; point: { x: number; y: number; }; }'.
src/components/VendorsReal.tsx(539,22): error TS2345: Argument of type '{ item: any; }' is not assignable to parameter of type 'SetStateAction<{ item: any; point: { x: number; y: number; }; }>'.
src/components/VendorsReal.tsx(1158,167): error TS2339: Property 'style' does not exist on type '{ item: any; point: { x: number; y: number; }; }'.
```

These are unchanged unrelated blockers in Network and Vendors. No changes were made to those files.

## Manual validation checklist

Not run in browser for this iteration.

Recommended checks:
- Monitoring grouped selection across multiple groups aggregates correctly.
- External grouped selection across multiple groups aggregates correctly.
- Services grouped selection across multiple groups aggregates correctly.
- Tab or group/scope change clears grouped selections.
- Selection does not reappear after scope change.
- Shift range still behaves after scope changes.
- Action-cell clicks still do not select rows.
- Double-click still opens the domain-owned target.

## Explicit not-verified list

- Live browser/runtime validation for Monitoring, External, and Services.
- E2E / Playwright validation of the table interaction contract.
- macOS `metaKey` runtime behavior in browser.
- Full frontend typecheck cleanliness beyond the unrelated Network/Vendors blockers.
