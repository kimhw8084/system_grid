# OUT-26 Iteration 27 Stage25 Validation And Warning Ledger

## Validation Commands

- `npm run typecheck` -> PASS
- `npm run build` -> PASS
- `npm run test:lint` -> PASS
- `npm run check:operational-registry-drift` -> PASS
- `npm run check:form-contracts` -> PASS
- `npm run check:row-action-contracts` -> PASS
- `npm run test:e2e:assets` -> PASS after updating stale test selectors to match the new shell wording and action-cell locator
- `npx playwright test tests/assets-golden-evidence.spec.ts` with capture envs -> PASS

## Validation Notes

- Initial sandboxed Playwright launch failed with a Chromium permission error. The rerun outside the sandbox succeeded.
- The focused asset workflow first failed because the test still expected `Asset Registry`, the old search placeholder, and the old row-action locator. Those were stale test contracts, not product regressions.

## Warning Ledger

- `/asset` capture warning count: 4
- `/monitoring` capture warning count: 8
- Page errors on captured `/asset`: 0
- Page errors on captured `/monitoring`: 0
- Duplicate-key warning zero: not explicitly classified by exact message

## Warning Verdict

- Warning status: incomplete for `PASS`
- Reason: the capture harness stored counts, not an exact classified warning message ledger
