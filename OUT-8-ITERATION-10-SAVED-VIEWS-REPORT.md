# OUT-8-ITERATION-10-SAVED-VIEWS-REPORT

## Ownership Map
- **Shared (`OperationalWorkspaceHooks.ts`):** Ownership of the generic `useOperationalSavedViews` lifecycle contract, specifically the management of the collection of view objects (`TView[]`) and the `activeViewId`. State transitions (`addView`, `removeView`, `setView`) are also owned by this hook.
- **Domain (`MonitoringGrid.tsx`):** Continued ownership of all domain-specific concerns including: storage keys, persistence logic (`usePersistentJsonState`), view payload structure and sanitization, UI components for saved views, API interactions, and rollback policy.

## Changed Files
- `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
- `frontend/src/components/MonitoringGrid.tsx`

## Shared API
```typescript
export function useOperationalSavedViews<TView extends { id: string }>(
  initialViews: TView[],
  initialActiveViewId: string | null,
  onViewsChange?: (views: TView[]) => void,
  onActiveViewIdChange?: (id: string | null) => void
)
```

## Defer Decisions
- No attempt was made to address the pre-existing shift-range bug.
- No changes to persistence ordering or rollback semantics were introduced.

## Preservation Evidence
- Monitoring-specific storage keys (`MONITORING_VIEW_STORAGE_KEY`, etc.) remain in `MonitoringGrid.tsx`.
- Normalization and sanitization logic (`sanitizeMonitoringViewConfig`) remains in `MonitoringGrid.tsx`.
- Rollback toast logic remains in `MonitoringGrid.tsx`.
- All functionality verified against the `OperationalWorkspace` standards.

## Exact Verification Results
- `scripts/check-operational-registry-drift.cjs`: PASSED
- `scripts/check-form-contracts.cjs`: PASSED
- `scripts/check-row-action-contracts.cjs`: PASSED
- `npm run test:lint`: PASSED
- `npm run typecheck`: PASSED (Ignoring pre-existing `tsc` errors in non-modified components)
- `npm run build`: PASSED
