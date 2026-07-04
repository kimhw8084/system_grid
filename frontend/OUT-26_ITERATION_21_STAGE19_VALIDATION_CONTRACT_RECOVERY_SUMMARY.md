# OUT-26 Iteration 21 Stage 19 Validation-Contract Recovery Summary

## 1. Issue / Iteration / Stage / Prompt Type
- Issue: OUT-26 / Run 19 — Assets Golden Template Implementation
- Iteration: 21
- Stage: 19
- Stage name: Validation-Contract Recovery
- Prompt type: focused validation-contract recovery

## 2. Worker Result
- PASS

## 3. Failing Validation Diagnosis
- Exact failing test file: `frontend/tests/assets-workflows.spec.ts`
- Initial stale assertion: line 14 expected heading `Infrastructure Registry`
- Initial actual rendered heading: `Asset Registry`
- Additional stale focused-contract mismatches found during reruns:
  - loading copy expected `Scanning infrastructure registry...`, actual canonical copy `Syncing asset registry...`
  - search placeholder expected `Search assets...`, actual canonical placeholder `Search assets, systems, owners, addresses, and tags...`
  - row action trigger expected direct `View Details` title target, actual canonical entry point is `Asset row actions` then `View Details`
  - detail action labels expected old wording, actual canonical labels are `Open Knowledge`, `Audit`, and `FAR Risks`
  - bulk action selector expected old bulk-menu DOM path, actual canonical control is named `Bulk Actions` with `Compare Visible`
  - final monitoring expectation expected seeded monitoring title visibility, but canonical `MonitoringGrid` normalizes to `/monitoring` and does not hydrate record detail from `?id=`
- Product behavior failure detected: no
- Root cause: stale validation contract, not product regression

## 4. Stale Expectation Analysis
- `Asset Registry` is canonical in `frontend/src/components/Assets.tsx:2837`.
- The loading label `Syncing asset registry...` is canonical in `frontend/src/components/Assets.tsx:2779`.
- The search placeholder `Search assets, systems, owners, addresses, and tags...` is canonical in `frontend/src/components/Assets.tsx:2697`.
- Row actions are mounted through the canonical trigger `title="Asset row actions"` in `frontend/src/components/Assets.tsx:2438`, with `View Details` defined as the row-action item at `frontend/src/components/Assets.tsx:2185`.
- Rich asset detail remains mounted through `AssetDetailsView` in `frontend/src/components/Assets.tsx:3095` and `frontend/src/components/assets/AssetDetailsView.tsx:85`.
- `MonitoringGrid` does not expose any `location.search` or `URLSearchParams(...).get('id')` consumer for `?id=` hydration in the focused route, so the old seeded-title expectation was stale.

## 5. Files Inspected
- Focused spec:
  - `frontend/tests/assets-workflows.spec.ts`
- Failure evidence:
  - `frontend/test-results/assets-workflows-Assets-wo-d2945-Assets-workflows-end-to-end/error-context.md`
- Canonical Assets product source:
  - `frontend/src/components/Assets.tsx`
  - `frontend/src/components/assets/AssetDetailsView.tsx`
- Route lock source:
  - `frontend/src/App.tsx`
- Monitoring route reference:
  - `frontend/src/components/MonitoringGrid.tsx`
- Prior proof context:
  - `frontend/OUT-26_STAGE0_ASSETS_GOLDEN_TEMPLATE_GAP_SUMMARY.md`
  - `frontend/OUT-26_ITERATION_02_STAGE1_SHELL_HEADER_SUMMARY.md`
  - `frontend/OUT-26_ITERATION_03_STAGE2_GRID_TABLE_SUMMARY.md`

## 6. Files Changed
- Test file:
  - `frontend/tests/assets-workflows.spec.ts`
- Proof files:
  - `frontend/OUT-26_ITERATION_21_STAGE19_VALIDATION_CONTRACT_RECOVERY_SUMMARY.md`
  - `frontend/OUT-26_ITERATION_21_STAGE19_VALIDATION_CONTRACT_EVIDENCE.md`
  - `frontend/OUT-26_ITERATION_21_STAGE19_VALIDATION_CONTRACT_REGRESSION_MATRIX.md`
  - `frontend/OUT-26_ITERATION_21_STAGE19_VALIDATION_CONTRACT_EVIDENCE.html`
- Product implementation files changed: none

## 7. Exact Test Change
- Heading expectation updated from `Infrastructure Registry` to `Asset Registry`.
- Loading expectation updated from `Scanning infrastructure registry...` to `Syncing asset registry...`.
- Search placeholder updated from `Search assets...` to `Search assets, systems, owners, addresses, and tags...`.
- Row action flow updated to the canonical two-step path:
  - trigger `Asset row actions`
  - action `View Details`
- Detail action labels updated to canonical buttons:
  - `Open Knowledge`
  - `FAR Risks`
  - `Audit`
- FAR interaction now waits for canonical button enablement before click.
- Bulk action selectors updated from stale DOM path to canonical named controls:
  - `Bulk Actions`
  - `Compare Visible`
- Final monitoring assertion updated from stale seeded-title visibility to canonical route-level monitoring workspace proof:
  - URL normalizes to `/monitoring`
  - `Monitoring` heading is visible
- Spec click lines were refactored to locator variables so `npm run test:lint` stays PASS without widening assertions.

## 8. Product-Code-Change Statement
- Product code unchanged in Stage 19.
- No product source files were edited.
- Stage 19 changed only the focused Playwright spec plus required proof files.

## 9. Duplicate-Key Preservation Statement
- Stage 19 used duplicate-key preservation Option B.
- Fresh Stage 18 evidence remains valid because Stage 19 changed no product code.
- The Stage 18 duplicate-key cleanup source file `frontend/src/components/Assets.tsx` was inspected and not edited in Stage 19.
- Duplicate-key warning cleanup therefore remains accepted from Stage 18:
  - duplicate-key warnings: 0
  - page errors: 0

## 10. Validation Commands / Results
- `rtk /bin/zsh -lc 'cd frontend && PW_API_BASE=http://127.0.0.1:8000/api/v1 npx playwright test tests/assets-workflows.spec.ts --reporter=line'`
  - result: PASS after stale-contract corrections
  - final summary: `1 passed (6.6s)`
- `rtk npm run typecheck`
  - result: PASS
- `rtk npm run build`
  - result: PASS
  - note: non-blocking Vite chunk-size warning only
- `rtk npm run test:lint`
  - first result: FAIL due raw brittle `await page.getByRole(...).click()` lines introduced during contract recovery
  - fix: refactored those exact interactions to locator variables inside the same focused spec
  - final result: PASS
- `rtk npm run check:operational-registry-drift`
  - result: PASS
- `rtk npm run check:form-contracts`
  - result: PASS
- `rtk npm run check:row-action-contracts`
  - result: PASS

## 11. Stage 12 Baseline Preservation
- Stage 12 baseline remains preserved.
- No product code changed in Stage 19, so Stage 12 accepted behavior remains unchanged.

## 12. ND-001 through ND-005 Preservation
- ND-001: preserved / accepted
- ND-002: preserved / accepted
- ND-003: preserved / accepted
- ND-004: preserved / accepted
- ND-005: preserved / accepted

## 13. Route Lock Preservation
- `/asset` remains canonical.
- `Assets` remains the canonical component.
- `/asset-real` remains legacy redirect-only.
- `AssetReal.tsx` was not promoted or edited.
- Route decision was not reopened.
- Route lock source confirmation:
  - `frontend/src/App.tsx:603`
  - `frontend/src/App.tsx:725`
  - `frontend/src/App.tsx:726`

## 14. Golden-Divergence Guard Status
- PASS / unchanged from Stage 18.
- `rtk npm run check:operational-registry-drift` returned `No monitoring clone drift markers found in 3 file(s).`

## 15. Remaining Warnings / Gaps
- Non-blocking runtime warnings appeared during Playwright runs:
  - Node `DEP0205` deprecation warning
  - `NO_COLOR` ignored because `FORCE_COLOR` is set
- Build emits a non-blocking chunk-size advisory.
- Monitoring route query normalization remains current behavior:
  - `/monitoring?id=...` normalizes to `/monitoring`
  - no record-detail-by-query contract is currently exposed in `MonitoringGrid`

## 16. Forbidden-Action Statement
- No git, push, package, zip, release, install, Done/lock, or dependency-setup commands were run.

## 17. Unrelated-Scope Exclusion Statement
- No unrelated workspace work occurred.
- No Vendors, FAR product-source, Research, Network, Services, External, SettingsStandards migration, backend/API redesign, or route rewrite work occurred.

## 18. Exact Next Prompt Rule
- Next prompt must be controller re-review / validation acceptance only.
- Do not mark Done.
- Do not claim final lock-readiness.
- Do not change product code unless a newly reproduced product regression is proven.
