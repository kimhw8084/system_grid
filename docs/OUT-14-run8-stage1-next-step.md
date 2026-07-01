# OUT-14 Run 8 Stage 1 Next Step

## Exact Recommended Next Action

Fix External saved-view and persisted-workspace-state handling so the `links` workspace mode survives save, overwrite, apply, refresh, and saved-view labeling.

## Why This Is The Best First Implementation Step

- It is the clearest current `IMPLEMENTATION_GAP` in source.
- It is narrower and safer than a broad shell/grid rewrite.
- It removes the main reason External is still only a partial consumer of the golden workspace system.

## Why It Accelerates Deployment

- It fixes a user-visible persistence defect in the first workspace intended to prove plug-and-play adoption.
- It raises team-use confidence quickly without reopening already-adopted shared contracts.
- It shortens the path to honest lock evidence by resolving the highest-confidence gap first.

## Why It Preserves Plug-And-Play Spread

- The fix is adapter/state-oriented, not a page-local imitation exercise.
- It protects the rule that domain slots can extend the shared shell without being flattened into Monitoring-only assumptions.
- It avoids unnecessary shared rewrites where current source already complies.

## Likely Files Involved

- `frontend/src/components/External.tsx`

## Acceptance Proof Required After Implementation

- saved view created from `links` remains `links` after refresh
- applying a saved `links` view returns the workspace to `links`
- `links` saved-view description is truthful
- active and deleted views still persist correctly
- no regression to entity-tab filters, grouping, or selection reset behavior

## Risks To Avoid

- fixing only the label while leaving save/apply corruption intact
- broadening into shared shell/grid rewrites without source need
- changing External route, compare, link, or purge semantics during this step
- weakening dirty-state or overlay behavior while touching view-state code
