# OUT-12 Iteration 03 Runtime Validation

## 1. Verdict

- `PARTIAL`
- `62/100`

## 2. Environment

- frontend URL: `http://127.0.0.1:4173`
- backend status if checked:
  - direct API checks initially returned `200` for operational endpoints
  - later validation retry hit `ECONNREFUSED 127.0.0.1:8000`
- browser/tool used: `Playwright Chromium`
- date/time: `2026-06-29T19:02:26Z` central runtime window
- validation mode: `Playwright`

Additional runtime note:

- frontend bootstrap only succeeded when `SYSGRID_OVERRIDE_API_URL` was set to same-origin `http://127.0.0.1:4173`
- direct override to `http://127.0.0.1:8000` produced frontend bootstrap `Connection Failure` due CORS on `/api/v1/settings/bootstrap`

## 3. Scope confirmation

- no code/source/test/config changes were made during validation
- this iteration was validation-only

## 4. Target validation matrix

| Target | Dirty close | Dirty Escape | Backdrop | Cancel discard | Confirm discard | Clean close | Save reset | Stale isolation | Result |
|---|---|---|---|---|---|---|---|---|---|
| BkmListModal | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | PASS | Not run - unsafe/not available | NOT RUN | PARTIAL |
| VendorsReal VendorDetailPanel | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | Not run - unsafe/not available | NOT RUN | NOT REACHED |
| NetworkConnectionForm | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | Not run - unsafe/not available | NOT RUN | NOT REACHED |

## 5. Evidence notes

### BkmListModal

- exact action: opened Monitoring, used row-action detail path, opened `Recovery Procedures`, then closed with no edits
- expected: clean close should dismiss with no dirty guard
- actual: modal closed cleanly with no `Unsaved Changes` guard
- blocker: subsequent reopening of the Recovery path through the parent Monitoring detail shell was not reliable in this headless pass; the selector path repeatedly stalled on the `Recovery` button after the first close cycle

### VendorsReal VendorDetailPanel

- exact action: attempted to reserve this for the second phase after BKM validation
- expected: full dirty-close matrix
- actual: not completed because the backend became unavailable before the follow-up vendor/network validation pass

### NetworkConnectionForm

- exact action: attempted to reserve this for the second phase after BKM validation
- expected: full dirty-close matrix
- actual: not completed because the backend became unavailable before the follow-up vendor/network validation pass

## 6. Minimal regression smoke

- OUT-10 table selection smoke: `N/A`
- OUT-11 floating-panel smoke: `N/A`

## 7. Blockers, if any

- frontend bootstrap is environment-sensitive:
  - same-origin override `http://127.0.0.1:4173` worked
  - direct backend override `http://127.0.0.1:8000` failed bootstrap with CORS and rendered the shared `Connection Failure` shell
- BKM modal reachability was only partially stable:
  - clean close path succeeded
  - reopening the Recovery flow through the parent Monitoring detail shell was brittle in this automation pass
- backend availability degraded during retry:
  - later Playwright API access failed with `ECONNREFUSED 127.0.0.1:8000`

What was still verified:

- the running frontend can boot in this environment with the same-origin override
- `BkmListModal` clean close worked without an unwanted dirty guard

## 8. Remaining risks

- the required dirty-close vectors for BKM were not fully exercised in runtime
- VendorsReal and NetworkConnectionForm runtime behavior remains unverified in this iteration
- OUT-10 and OUT-11 smoke checks remain unverified in runtime
- no product failure was proven, but evidence is incomplete

## 9. Next prompt rule

`Run narrow validation retry only.`

## 10. Done/lock statement

`OUT-12 is not Done and not locked by Iteration 03.`
