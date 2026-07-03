# OUT-26 Iteration 17 Stage 15 Remaining-Partials Recovery Summary

## Metadata
- issue: `OUT-26 / Run 19 — Assets Golden Template Implementation`
- iteration: `17`
- stage: `15`
- prompt type: `targeted recovery`
- date: `2026-07-03`
- worker result: `PARTIAL`

## Context
- Stage 12 baseline remained the preservation lock.
- Stage 14 recovered `ND-003` and `ND-004` to `PASS`.
- Stage 15 was limited to `ND-001`, `ND-002`, and `ND-005`.

## Files inspected
- prior proof and evidence:
  - `frontend/OUT-26_ITERATION_16_STAGE14_MAJOR_DEVIATION_RECOVERY_SUMMARY.md`
  - `frontend/OUT-26_ITERATION_16_STAGE14_MAJOR_DEVIATION_RENDERED_EVIDENCE.md`
  - `frontend/OUT-26_ITERATION_16_STAGE14_MAJOR_DEVIATION_RESOLUTION_LEDGER.md`
- canonical Assets / route lock:
  - `frontend/src/components/Assets.tsx`
  - `frontend/src/App.tsx`
  - `frontend/src/components/assets/AssetDetailsView.tsx`
  - `frontend/src/components/AssetReal.tsx`
- shared contract and golden reference:
  - `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
  - `frontend/src/components/shared/OperationalWorkspace.ts`
  - `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
  - `frontend/src/components/shared/LayoutPrimitives.tsx`
  - `frontend/src/components/shared/WorkspaceCommandBar.tsx`
  - `frontend/src/components/MonitoringGrid.tsx`

## Files changed
- implementation:
  - `frontend/src/components/Assets.tsx`
- proof:
  - `frontend/OUT-26_ITERATION_17_STAGE15_REMAINING_PARTIALS_RECOVERY_SUMMARY.md`
  - `frontend/OUT-26_ITERATION_17_STAGE15_REMAINING_PARTIALS_RENDERED_EVIDENCE.md`
  - `frontend/OUT-26_ITERATION_17_STAGE15_REMAINING_PARTIALS_RESOLUTION_LEDGER.md`
  - `frontend/OUT-26_ITERATION_17_STAGE15_REMAINING_PARTIALS_RENDERED_EVIDENCE.html`

## Pre-change diagnostics
- `ND-001`:
  - Stage 14 left report/map/compare branching directly in the `OperationalWorkspaceShell` children block.
  - Shell/header/command ownership was already shared, but the classification boundary between shared page shell and asset-domain body slots was still implicit.
- `ND-002`:
  - `Assets.tsx` already consumed `useOperationalWorkspaceViewState(...)`.
  - The shared hook persists saved views and working state through `window.localStorage` plus a `sessionStorage` first-load gate in `frontend/src/components/shared/OperationalWorkspaceHooks.ts:36-84`.
  - The golden Monitoring reference still uses the same frontend persistence family in `frontend/src/components/MonitoringGrid.tsx:557-565`.
  - `MONITORING_WORKSPACE_STANDARD` documents backend preferences as the desired operational contract, but not as the currently universal implementation in `frontend/src/components/shared/OperationalWorkspace.ts:67-79`.
- `ND-005`:
  - Stage 14 rendered evidence showed `960x720` grid height at `104px`.
  - The pressure source was the multi-band command zone: wrapped primary controls plus a separate secondary toolbar band.

## Per-finding recovery matrix
| Finding | Stage 14 status | Stage 15 recovery | Evidence | Final status |
| --- | --- | --- | --- | --- |
| `ND-001` | `PARTIAL` | Made the shell/body boundary explicit by moving the view switch into `assetWorkspaceSurface` and leaving `OperationalWorkspaceShell` responsible only for shared header and command-bar composition. | `frontend/src/components/Assets.tsx:2613-2823` now defines shared-toolbar groups plus `assetWorkspaceSurface`; report/map/compare remain asset-domain surfaces, while shell/header/command ownership remains shared. | `PASS` |
| `ND-002` | `PARTIAL` | Formally classified the shared frontend persistence hook as the accepted current contract for this run. No backend/API contract was introduced because no approved backend preference implementation is consistently consumed by the golden Monitoring reference. | Shared hook remains the standardized path in `frontend/src/components/shared/OperationalWorkspaceHooks.ts:36-84`; Monitoring still uses the same local/session persistence family in `frontend/src/components/MonitoringGrid.tsx:557-565`; backend preference wording remains aspirational contract text in `frontend/src/components/shared/OperationalWorkspace.ts:67-79`. | `PASS` |
| `ND-005` | `PARTIAL` | Compacted the command zone by converting the main toolbar to horizontal overflow instead of wrap, moving import/export and utility controls into a scrollable secondary band, and keeping bulk/add as a stable right-side action group. | `frontend/src/components/Assets.tsx:2691-2743` replaces wrap-heavy toolbar payloads with `min-w-0`, `min-w-max`, and horizontal overflow containers. | `PARTIAL` |

## Regression matrix
| Lock | Status | Evidence |
| --- | --- | --- |
| Stage 12 baseline | `PARTIAL` | Source changes do not alter route ownership, grid mounting, or empty-state logic, but fresh localhost rendered evidence could not be recaptured in Stage 15 due browser policy block. |
| `ND-003` row-action fix | `PASS` | No Stage 15 edits touched row-action isolation logic; `rtk npm run check:row-action-contracts` passed. |
| `ND-004` bulk-action fix | `PASS` | Shared anchored bulk grammar remains mounted in `frontend/src/components/Assets.tsx:2722-2743` and `2858-2954`; no Stage 15 edits rewired bulk action semantics. |
| route lock | `PASS` | `frontend/src/App.tsx:267-270` keeps `LegacyAssetRedirect`; `frontend/src/App.tsx:725-726` keeps `/asset` canonical and `/asset-real` redirect-only. |
| rich slots | `PASS` | `frontend/src/components/Assets.tsx:2744-2823` preserves quick look, report, compare, and map; `frontend/src/components/Assets.tsx:3047-3101` preserves rich forms and `AssetDetailsView`. |

## Rendered evidence summary
- Stage 15 localhost rerender was attempted and blocked by browser security policy:
  - in-app browser rejection: `The user has requested that http://127.0.0.1:5173 should not be used.`
  - the browser runtime explicitly forbade alternate-browser workarounds after that block.
- Because of that block, Stage 15 rendered evidence is limited to:
  - Stage 14 accepted rendered baseline metrics from `frontend/OUT-26_ITERATION_16_STAGE14_MAJOR_DEVIATION_RENDERED_EVIDENCE.md`
  - Stage 15 source-delta evidence showing the toolbar compaction and ownership reclassification
  - fresh validation results from the final Stage 15 source state
- Consequence:
  - `ND-001` and `ND-002` can be resolved from source/contract evidence.
  - `ND-005` cannot be promoted to `PASS` without a fresh controller-inspectable localhost render.

## Validation commands/results
- `rtk npm run typecheck`: `PASS`
- `rtk npm run build`: `PASS` with existing Vite chunk-size warning only
- `rtk npm run test:lint`: `PASS`
- `rtk npm run check:operational-registry-drift`: `PASS`
- `rtk npm run check:form-contracts`: `PASS`
- `rtk npm run check:row-action-contracts`: `PASS`

## Remaining deviations
- `ND-005` remains `PARTIAL` because the Stage 15 toolbar compaction was not re-measured against a fresh `960x720` live render after browser security policy blocked localhost interaction.
- Fresh Stage 15 rendered regression proof for Stage 12 baseline, `ND-003`, and `ND-004` is also blocked for the same reason, although source scope and validation indicate no regression.

## Forbidden-action statement
- No `git`, `push`, `package`, `zip`, `release`, or dependency-install commands were run.

## Unrelated-scope exclusion statement
- No Vendors, FAR, Research, Network, Services, External, SettingsStandards migration, backend/API redesign, or unrelated workspace work was performed.

## Exact next prompt rule
- Do not change code first. Re-run Stage 15 rendered verification in a controller-approved localhost browser surface, measure the new `960x720` grid height after the toolbar compaction already implemented in `frontend/src/components/Assets.tsx:2691-2743`, and only reopen code changes if the fresh measurement still misses the threshold.

## Final worker result
- `PARTIAL`
