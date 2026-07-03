# OUT-26 Iteration 20 Stage 18 Duplicate-Key Cleanup Summary

- issue: `OUT-26 / Run 19 — Assets Golden Template Implementation`
- iteration: `20`
- stage: `18`
- prompt type: `blocker cleanup with zero-deviation guard`
- date: `2026-07-03`
- worker result: `PARTIAL`

## Files inspected
- prior proof and warning files:
  - `frontend/OUT-26_ITERATION_19_STAGE17_WARNING_DECISION_LEDGER.md`
  - `frontend/OUT-26_ITERATION_18_STAGE16_RENDER_ONLY_EVIDENCE.md`
- implementation files:
  - `frontend/src/components/Assets.tsx`
  - `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
  - `frontend/src/components/MonitoringGrid.tsx`
- validation references:
  - `frontend/package.json`
  - `frontend/tests/assets-workflows.spec.ts`

## Files changed
- implementation:
  - `frontend/src/components/Assets.tsx`
- proof:
  - `frontend/OUT-26_ITERATION_20_STAGE18_DUPLICATE_KEY_CLEANUP_SUMMARY.md`
  - `frontend/OUT-26_ITERATION_20_STAGE18_DUPLICATE_KEY_EVIDENCE.md`
  - `frontend/OUT-26_ITERATION_20_STAGE18_DUPLICATE_KEY_REGRESSION_MATRIX.md`
  - `frontend/OUT-26_ITERATION_20_STAGE18_DUPLICATE_KEY_EVIDENCE.html`
  - `frontend/OUT-26_ITERATION_20_STAGE18_GOLDEN_DIVERGENCE_GUARD.md`

## Exact duplicate-key diagnosis
- exact warning text:
  - `Warning: Encountered two children with the same key, '%s'. Keys should be unique so that components maintain their identity across updates.`
- exact duplicated key value observed from console arguments:
  - empty string: `""`
- exact component stack:
  - `AnimatePresence`
  - `OperationalWorkspaceFrame`
  - `OperationalWorkspaceShell`
  - `Assets`
- exact rendered condition:
  - canonical `/asset` initial render with the `floatingPanels` subtree mounted under the shared workspace shell
- exact source list producing duplicate children:
  - outer `AnimatePresence` in `Assets.tsx`
  - direct children before fix:
    - `OperationalDisplayPanel`
    - `OperationalSavedViewsPanel`
    - `OperationalAnchoredPanel`
    - conditional `QuickLookPanel`
- duplicate source classification:
  - repeated `AnimatePresence` direct children without explicit sibling keys
  - duplicated empty-key namespace, not duplicated domain ids
- exact planned fix before editing:
  - add deterministic semantic keys to each direct child of the outer `AnimatePresence` so Framer Motion sibling identity is explicit and stable

## Exact fix applied
- added direct sibling keys in `frontend/src/components/Assets.tsx:2863-3013`:
  - `asset-display-menu-panel`
  - `asset-saved-views-panel`
  - `asset-bulk-menu-panel`
  - `asset-quick-look-panel-${quickLookAsset.id}`
- no shared shell change was required because the duplicate originated in the Assets-owned outer sibling identity layer, not the shared portal mount

## Why the fix is stable and deterministic
- keys are semantic and namespace-scoped to the asset workspace overlay type
- the quick-look key includes the stable asset id, preserving entity-specific identity without randomness
- no index-only keys were introduced
- no panels were removed, suppressed, or hidden

## Console before/after
| Check | Before | After |
| --- | --- | --- |
| duplicate-key warnings | `76` in Stage 16 accepted render baseline | `0` on fresh `/asset` load after fix |
| page errors | `0` | `0` |
| router future-flag warnings | `2` in Stage 16 aggregate session | `1` in fresh post-fix load |
| duplicate-key component stack | `AnimatePresence -> OperationalWorkspaceFrame -> OperationalWorkspaceShell -> Assets` | absent |

## Validation commands/results
- `rtk npm run typecheck`: `PASS`
- `rtk npm run build`: `PASS`
  - existing non-blocking Vite chunk-size warning remained
- `rtk npm run test:lint`: `PASS`
- `rtk npm run check:operational-registry-drift`: `PASS`
- `rtk npm run check:form-contracts`: `PASS`
- `rtk npm run check:row-action-contracts`: `PASS`
- `rtk /bin/zsh -lc 'cd frontend && PW_API_BASE=http://127.0.0.1:8000/api/v1 npx playwright test tests/assets-workflows.spec.ts --reporter=line'`: `FAIL`
  - failure reason:
    - stale test expectation `getByRole('heading', { name: 'Infrastructure Registry' })`
    - current canonical `/asset` render exposes `Asset Registry`
    - this did not indicate a duplicate-key regression and was outside the approved edit scope for this prompt

## Regression summary
- preserved:
  - Stage 12 baseline
  - `ND-001`
  - `ND-002` accepted limit
  - `ND-003`
  - `ND-004`
  - `ND-005`
  - route lock
  - quick look
  - map entry
  - details/forms
  - import/export
  - display/saved views
- direct rendered verification passed for:
  - desktop `1280x720`
  - responsive `960x720`
  - row-action isolation
  - bulk-action panel grammar
  - `/asset-real` redirect

## Golden-divergence guard summary
- result: `PASS`
- current `/asset` grid view is visually and structurally aligned with the locked operational workspace pattern at the page level:
  - shared shell
  - shared header grammar
  - shared command bar composition
  - shared scope/action zone
  - shared grid placement
  - shared floating-panel behavior
- domain-specific labels and controls remain asset-owned, but the rendered page is now materially close to the golden operational view rather than bespoke or visually divergent

## Remaining warnings/gaps
- focused Assets Playwright spec is stale against the current approved `/asset` heading text and blocks a full validation PASS
- React Router future-flag warning remains unrelated and non-blocking

## Forbidden-action statement
- no Done/lock action
- no route edits
- no backend/API edits
- no `AssetReal.tsx` edits or promotion
- no repository state-changing, remote delivery, archive/release, or dependency-install commands

## Unrelated-scope exclusion statement
- no unrelated workspace edits were performed
- no broad layout rewrite was performed
- no rich asset behavior was removed or rewritten

## Exact next prompt rule
- Validation-contract recovery only. Update stale focused Assets Playwright expectation(s) to the current approved canonical `/asset` heading and shell contract without changing product code, then rerun focused Assets validation plus final lock-readiness review.
