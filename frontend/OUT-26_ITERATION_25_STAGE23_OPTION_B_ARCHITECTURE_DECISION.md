# OUT-26 Iteration 25 Stage 23 Option-B Architecture Decision

## Option A salvage evaluation
- Rejected.
- Reason 1: the old canonical `Assets.tsx` still owned too much workspace orchestration, even though it consumed shared primitives.
- Reason 2: Stage 23 explicitly treated the salvage path as failed unless the old structure could stop controlling the visible shell.
- Reason 3: another direct patch to `Assets.tsx` would fail the Stage 23 hard rule.

## Option B rebuild / composition evaluation
- Accepted.
- The route entrypoint was reduced to a thin delegate.
- A new internal workspace file now owns canonical asset workspace composition.
- Shared operational primitives remain reused rather than forked.

## Chosen option
- `Option B — Clean internal golden Asset workspace`

## Reasons
- Removes route-entry ownership from the visible workspace.
- Creates a clean internal boundary for future asset-shell convergence work.
- Preserves current asset data and rich detail behaviors without reopening backend work.

## Files / components created or reused
- Created:
  - `frontend/src/components/assets/AssetsGoldenWorkspace.tsx`
  - `frontend/tests/assets-golden-evidence.spec.ts`
- Reused:
  - `OperationalWorkspaceShell`
  - `OperationalDataGrid`
  - `OperationalDisplayPanel`
  - `OperationalSavedViewsPanel`
  - `OperationalRowActionMenu`
  - `OperationalAnchoredPanel`
  - `WorkspaceModal`
  - `AssetDetailsView`

## Why the old rejected page is not still controlling the visual shell
- `frontend/src/components/Assets.tsx` is now only:
  - import internal workspace
  - return internal workspace
- The visual workspace implementation moved out of the route entrypoint.

## Risk register
- Risk: full-page rendered before/after remains visually close.
  - Impact: no PASS claim possible.
- Risk: browser warning count is non-zero in captured evidence.
  - Impact: no PASS claim possible.
- Risk: asset report/map/compare surfaces still remain more domain-bespoke than Monitoring.
  - Impact: visible parity remains partial.

## Behavior preservation strategy
- Keep asset-specific domain flows mounted in shared shells instead of deleting or flattening them.
- Preserve focused workflow test behavior first.
- Preserve canonical `/asset` route and `/asset-real` redirect lock.
