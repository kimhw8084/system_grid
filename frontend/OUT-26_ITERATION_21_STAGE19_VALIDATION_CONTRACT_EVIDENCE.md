# OUT-26 Iteration 21 Stage 19 Validation Contract Evidence

## Before Failing Assertion
- File: `frontend/tests/assets-workflows.spec.ts`
- Original stale heading assertion:
  - `await expect(page.getByRole('heading', { name: 'Infrastructure Registry' })).toBeVisible()`
- Initial focused Playwright failure:
  - expected text: `Infrastructure Registry`
  - actual rendered text: `Asset Registry`
  - evidence source: `frontend/test-results/assets-workflows-Assets-wo-d2945-Assets-workflows-end-to-end/error-context.md`

## After Corrected Assertion
- Corrected heading assertion in `frontend/tests/assets-workflows.spec.ts:14`:
  - `await expect(page.getByRole('heading', { name: 'Asset Registry' })).toBeVisible()`
- Additional corrected canonical-contract selectors:
  - loading copy: `Syncing asset registry...`
  - search placeholder: `Search assets, systems, owners, addresses, and tags...`
  - row action trigger: `Asset row actions`
  - row action action: `View Details`
  - detail actions: `Open Knowledge`, `FAR Risks`, `Audit`
  - bulk actions: `Bulk Actions`, `Compare Visible`
  - monitoring route proof: `/monitoring` heading visibility rather than stale record-title visibility

## Expected / Actual Heading Evidence
- Canonical source evidence:
  - `frontend/src/components/Assets.tsx:2837` renders `Asset Registry`
  - `frontend/src/components/Assets.tsx:2779` renders `Syncing asset registry...`
  - `frontend/src/components/Assets.tsx:2697` renders `Search assets, systems, owners, addresses, and tags...`
  - `frontend/src/components/Assets.tsx:2438` exposes `Asset row actions`
  - `frontend/src/components/Assets.tsx:2185` defines `View Details`
  - `frontend/src/components/Assets.tsx:3095` mounts `AssetDetailsView`
  - `frontend/src/components/assets/AssetDetailsView.tsx:218` renders `Open Knowledge`
  - `frontend/src/components/assets/AssetDetailsView.tsx:288` renders `Audit`
  - `frontend/src/components/assets/AssetDetailsView.tsx:296` renders `FAR Risks`
- Monitoring route contract evidence:
  - `frontend/src/components/MonitoringGrid.tsx` has no focused `?id=` route hydration consumer
  - actual route normalized to `/monitoring` during focused rerun

## Focused Playwright Command / Result
- Command:
  - `rtk /bin/zsh -lc 'cd frontend && PW_API_BASE=http://127.0.0.1:8000/api/v1 npx playwright test tests/assets-workflows.spec.ts --reporter=line'`
- Diagnostic rerun progression:
  - fail 1: stale heading `Infrastructure Registry`
  - fail 2: stale direct `View Details` selector
  - fail 3: stale strict-mode `Audit` selector ambiguity
  - fail 4: stale bulk-menu DOM selector
  - fail 5: stale monitoring seeded-title visibility expectation
  - final: PASS
- Final result:
  - `1 passed (6.6s)`

## All Validation Command Results
- `rtk npm run typecheck`
  - PASS
- `rtk npm run build`
  - PASS
  - note: non-blocking chunk-size warning from Vite
- `rtk npm run test:lint`
  - first run: FAIL
  - reason: focused spec used raw `await page.getByRole(...).click()` lines that violate the repo’s anti-brittle test rule
  - fix: converted those exact lines to locator variables inside the same spec
  - second run: PASS
- `rtk npm run check:operational-registry-drift`
  - PASS
  - output: `No monitoring clone drift markers found in 3 file(s).`
- `rtk npm run check:form-contracts`
  - PASS
- `rtk npm run check:row-action-contracts`
  - PASS

## Duplicate-Key Preservation Evidence
- Stage 19 did not edit `frontend/src/components/Assets.tsx`.
- Stage 18 already reduced duplicate-key warnings from `76` to `0` and page errors to `0`.
- Because Stage 19 changed only test and proof files, Stage 18 duplicate-key evidence remains valid without contradiction.

## Product Source Unchanged Evidence
- Product implementation files changed in Stage 19: none
- Only non-proof code file changed:
  - `frontend/tests/assets-workflows.spec.ts`
- Product source inspected but unchanged:
  - `frontend/src/components/Assets.tsx`
  - `frontend/src/components/assets/AssetDetailsView.tsx`
  - `frontend/src/App.tsx`
  - `frontend/src/components/MonitoringGrid.tsx`

## Regression Summary
- Product regression found: no
- Validation contract corrected: yes
- Test weakened: no
- Assertion precision preserved: yes
- Route lock regressed: no
- Rich behavior regressed: no
- Duplicate-key cleanup regressed: no
