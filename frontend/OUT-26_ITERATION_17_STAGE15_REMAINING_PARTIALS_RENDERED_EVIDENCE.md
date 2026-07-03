# OUT-26 Iteration 17 Stage 15 Remaining-Partials Rendered Evidence

## Evidence metadata
- capture date: `2026-07-03`
- canonical target: `http://127.0.0.1:5173/asset`
- legacy route target: `http://127.0.0.1:5173/asset-real`
- evidence mode: `Stage 14 accepted localhost render baseline + Stage 15 source delta + Stage 15 final validation`
- Stage 15 localhost rerender status: `BLOCKED`

## Stage 15 localhost rerender blocker
- attempted browser surface:
  - in-app browser via Node REPL browser runtime
- exact blocker:
  - `Browser Use rejected this action due to browser security policy. Reason: The user has requested that http://127.0.0.1:5173 should not be used.`
- consequence:
  - fresh Stage 15 controller-inspectable localhost render could not be captured
  - alternate browser workarounds were not used after the explicit policy block

## Last accepted live render baseline carried forward from Stage 14

### Desktop default `/asset`
- viewport: `1280x720`
- URL: `/asset`
- Existing rect: `{ x: 1061, y: 120, width: 81, height: 36 }`
- Purged rect: `{ x: 1146, y: 120, width: 75, height: 36 }`
- Bulk Actions rect: `{ x: 942, y: 249, width: 138, height: 36 }`
- Add Asset rect: `{ x: 1088, y: 249, width: 128, height: 36 }`
- search rect: `{ x: 289, y: 198, width: 512, height: 36 }`
- grid rect: `{ x: 273, y: 448, width: 959, height: 207 }`
- visible row count: `21`
- row samples:
  - `1FINANCE-S-001`
  - `2MANUFACTURING-S-002`
  - `3BI-ANALYTICS-P-003`
  - `4MANUFACTURING-P-004`
  - `5MANUFACTURING-P-005`

### Row-action regression baseline
- menu open: `true`
- menu rect: `{ x: 686, y: 298, width: 578, height: 225 }`
- quick look open after row-action trigger: `false`
- selected rows after row-action trigger: `0`
- intended quick-look row-body path remained openable: `true`

### Bulk-action regression baseline
- bulk panel open: `true`
- bulk panel rect: `{ x: 928, y: 293, width: 340, height: 287 }`
- visible panel text:
  - `Bulk actions`
  - `2 assets selected`
  - `Clear Selection`
  - `Compare Selected`
  - `Set Status...`
  - `Set Environment...`
  - `Bulk Delete`

### Persistence / refresh baseline
- filtered URL persisted as `/asset?search=FINANCE-S-001`
- refresh preserved the same URL and filtered result count
- display and saved views panels both opened under the shared shell

### Route-lock baseline
- requested route: `/asset-real`
- resolved route: `/asset`

### `960x720` Stage 14 baseline
- viewport: `960x720`
- Existing rect: `{ x: 741, y: 120, width: 81, height: 36 }`
- Purged rect: `{ x: 826, y: 120, width: 75, height: 36 }`
- Bulk Actions rect: `{ x: 622, y: 308, width: 138, height: 36 }`
- search rect: `{ x: 289, y: 213, width: 321, height: 36 }`
- grid rect: `{ x: 273, y: 551, width: 639, height: 104 }`
- visible row count: `12`

## Stage 15 source delta that changes the expected rendered outcome

### `ND-001` ownership boundary
- `frontend/src/components/Assets.tsx:2744-2823`
- shared shell still owns:
  - page header
  - command bar
  - toolbar action slots
- asset-domain body now mounts through a single `assetWorkspaceSurface` switch:
  - grid
  - report
  - compare
  - map

### `ND-002` persistence contract evidence
- shared hook remains the standardized persistence path:
  - `frontend/src/components/shared/OperationalWorkspaceHooks.ts:36-84`
- golden Monitoring reference still uses frontend persistence primitives:
  - `frontend/src/components/MonitoringGrid.tsx:557-565`
- backend preference remains documented contract text, not the uniformly consumed current implementation:
  - `frontend/src/components/shared/OperationalWorkspace.ts:67-79`

### `ND-005` responsive compaction source evidence
- new horizontal-overflow primary toolbar:
  - `frontend/src/components/Assets.tsx:2691-2705`
- new horizontal-overflow secondary toolbar with lens + import/export + utility controls:
  - `frontend/src/components/Assets.tsx:2706-2721`
- stable right-side bulk/add action group:
  - `frontend/src/components/Assets.tsx:2722-2743`
- expected effect versus Stage 14 baseline:
  - less vertical wrap pressure in the primary command zone
  - fewer stacked command bands at medium width
  - more height available for the grid than the prior `104px` baseline

## Stage 15 validation evidence
- `rtk npm run typecheck`: `PASS`
- `rtk npm run build`: `PASS`
  - existing non-blocking Vite chunk-size warning remains
- `rtk npm run test:lint`: `PASS`
- `rtk npm run check:operational-registry-drift`: `PASS`
- `rtk npm run check:form-contracts`: `PASS`
- `rtk npm run check:row-action-contracts`: `PASS`

## Evidence verdict by scoped finding
- `ND-001`: `PASS`
  - source evidence is sufficient to classify the remaining body switch as asset-domain slot ownership only
- `ND-002`: `PASS`
  - source and golden-reference evidence support the shared frontend hook as the accepted current contract
- `ND-005`: `PARTIAL`
  - source change is in place, but no fresh localhost render could verify the new `960x720` grid height

## Stage 15 rendered-evidence conclusion
- The code change and validation set are complete.
- Fresh localhost rendered verification is the only unresolved blocker.
- No browser workaround was used after the explicit policy block.
