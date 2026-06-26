# OUT-8 Iteration 19 — Monitoring Bulk Menu Discovery

## Verdict
- INTENTIONALLY_MISSING

## Evidence
- `frontend/src/components/MonitoringGrid.tsx`
- `src/components/shared/OperationalWorkspaceShells.tsx`

## Findings
- `MonitoringGrid` maintains `showBulkMenu` state and a `bulkMenuButtonRef` that triggers `toggleBulkWindow`.
- However, there is no rendered `OperationalAnchoredPanel` or equivalent container for the bulk menu in the `floatingPanels` section.
- The `bulkMenuTrigger` button exists and toggles the `showBulkMenu` state.
- `BulkActionModals` and `BulkEditTableModal` are rendered as modals, not as anchored floating panels.
- It appears that the `showBulkMenu` lifecycle logic in `MonitoringGrid` is a legacy holdover or placeholder that was never fully realized for an anchored bulk menu.

## Safe next action
- Leave as known missing legacy surface; do not attempt to wire a panel ref that has no UI counterpart to attach to.
