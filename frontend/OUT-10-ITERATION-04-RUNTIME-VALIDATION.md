# OUT-10 Iteration 04 Runtime Validation

## Result

Overall classification for this validation packet: **PARTIAL**

This packet is runtime/manual validation only. No production code, tests, routes, or backend files were changed.

## Runtime Setup

- Branch tested: `main`
- Commit tested: `8cacd6e7880b26b5ba6b846c62efdb5f6e58b32f`
- App startup command:
  - Frontend used for validation: `npm run dev -- --host 127.0.0.1` on `http://127.0.0.1:5173`
  - Shared/default backend responded on `http://127.0.0.1:8000`
  - Isolated backend also launched at `./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8001`
  - Isolated frontend also launched at `VITE_BACKEND_PORT=8001 npm run dev -- --host 127.0.0.1 --port 5174`
- Frontend URL validated: `http://127.0.0.1:5173`
- Backend/API status:
  - `http://127.0.0.1:8000/api/v1/health` responded during validation, but this stack was shared and intermittently unstable earlier in the session
  - `http://127.0.0.1:8001/api/v1/health` responded `200 {"status":"online"}` on the isolated stack
- Browser used: Codex in-app browser runtime
- OS used: macOS
- Devtools console checked: yes
- App errors before validation:
  - Yes, pre-existing warnings were present on the shared `5173` app earlier in the session
  - The isolated `5174` frontend showed a bootstrap failure because it still targeted `127.0.0.1:8000`, so that stack was not used for contract validation

## Data Notes

- The Local Demo tenant had been partially wiped after a failed `seed.py --seed-data` run earlier in the session.
- To make runtime validation possible without changing production code, minimal Monitoring, Services, and External sample rows were created through existing local APIs on the shared backend.
- Final visible runtime samples used for validation:
  - Monitoring: 7 rows matching `OUT10 MON`
  - Services: 3 rows matching `OUT10 SVC`
  - External: 3 active rows matching `OUT10 EXT`, plus 1 link row on the `Links` tab

## Summary Table

| Workspace | Single click | Ctrl/meta | Shift range | Action isolation | Double click | Right click | Grouped cross-group | Scope reset | Stale reappear | Console errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Monitoring | NOT RUN | NOT RUN | NOT RUN | PARTIAL | PASS | PASS | PARTIAL | NOT RUN | NOT RUN | PASS |
| External | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Services | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN |

## Monitoring

### A. Single-click selection

- Result: **NOT RUN**
- Screen/workspace: `Monitoring`
- Exact action performed: attempted row-cell click validation on `OUT10 MON Alpha 692042` and `OUT10 MON Beta 692042`
- Expected result: single click should select exactly one row and replace prior selection without opening detail/edit
- Actual result: browser-side AG Grid row click automation became unreliable once the page was in grouped/runtime-heavy states; I could not complete a stable single-click-only proof sequence that I would trust
- Evidence type: written observation
- Notes: this is an execution-gap, not evidence of a product failure

### B. Ctrl/meta multi-select

- Result: **NOT RUN**
- Screen/workspace: `Monitoring`
- Exact action performed: attempted meta-click proof on visible monitor rows
- Expected result: meta-click should add/remove rows from the selection set
- Actual result: not completed because the row-click driver on this browser surface became intermittent before a trustworthy multi-select run could be finished
- Evidence type: written observation
- Notes: no shared-contract failure was proven here; the runtime proof is incomplete

### C. Shift range selection

- Result: **NOT RUN**
- Screen/workspace: `Monitoring`
- Exact action performed: attempted visible-range selection proof on filtered rows
- Expected result: shift-click should select the contiguous visible range in current order
- Actual result: not completed due the same row-click instability
- Evidence type: written observation
- Notes: this remains open runtime work

### D. Action-cell isolation

- Result: **PARTIAL**
- Screen/workspace: `Monitoring`
- Exact action performed: row action surfaces were exercised through the app row-action menu state that appeared on right-click
- Expected result: action/menu cells should open their owned action target without unintended row selection or wrong-domain navigation
- Actual result: Monitoring row actions opened a Monitoring-owned action surface (`Row actions` / `Quick access` / `Follow options`) and did not show evidence of a wrong target; however, I did not complete a separate clean proof of direct action-cell left-click isolation
- Evidence type: written observation / DOM snapshot
- Notes: enough to show Monitoring-owned actions still exist and resolve to Monitoring context, but not enough to call the isolation proof complete

### E. Double-click target preservation

- Result: **PASS**
- Screen/workspace: `Monitoring`
- Exact action performed: double-clicked monitor row `OUT10 MON Alpha 692042`
- Expected result: Monitoring detail/edit target should open, with no cross-domain target regression
- Actual result: Monitoring detail dialog opened with heading `OUT10 MON Alpha 692042`, `Monitor ID: 1`, and Monitoring-owned actions including `Edit Monitor`, `History`, `Recovery`, and `Archive`
- Evidence type: written observation / DOM snapshot
- Notes: this is direct runtime proof that shared row interaction did not force a non-Monitoring target

### F. Right-click app menu behavior

- Result: **PASS**
- Screen/workspace: `Monitoring`
- Exact action performed: right-clicked populated non-interactive monitor row content
- Expected result: app-owned row menu should appear instead of an unintended detail open
- Actual result: app menu surfaced as `Row actions` with `Quick access` and `Follow options`; there was no evidence of an unintended Monitoring detail/edit open, and no browser-native context menu was visible in the captured state
- Evidence type: written observation / DOM snapshot
- Notes: this is the strongest successful shared interaction proof from the live run

### G. Grouped cross-group selection

- Result: **PARTIAL**
- Screen/workspace: `Monitoring`
- Exact action performed: switched Monitoring into grouped mode through `Display -> Group By -> Status`
- Expected result: grouped mode should support cross-group aggregation
- Actual result: grouped runtime state was confirmed live with separate `Cancelled`, `Existing`, and `Planned` group sections and group-level count chips; however, I could not finish a reliable cross-group two-row selection proof because row-click automation degraded after grouped mode was active
- Evidence type: written observation / DOM snapshot
- Notes: this is incomplete runtime proof, not a confirmed failure

### H. Scope/tab/filter change clears grouped selection

- Result: **NOT RUN**
- Screen/workspace: `Monitoring`
- Exact action performed: intended plan was grouped selection followed by search/filter scope change
- Expected result: grouped selection should clear when `selectionScopeKey` changes
- Actual result: not completed because cross-group selection proof did not reach a trustworthy starting state
- Evidence type: written observation
- Notes: open runtime item

### I. Stale selection does not reappear

- Result: **NOT RUN**
- Screen/workspace: `Monitoring`
- Exact action performed: intended plan was new grouped selection after scope reset, then restoration of the broader filter
- Expected result: old selected IDs should not reappear
- Actual result: not completed because H was not completed
- Evidence type: written observation
- Notes: open runtime item

### J. Console/runtime errors

- Result: **PASS**
- Screen/workspace: `Monitoring`
- Exact action performed: monitored console while exercising grouped mode, double-click detail open, and right-click row actions
- Expected result: no new app console errors attributable to the interaction contract
- Actual result: no new product-side console error was observed during the successful Monitoring interactions; the blocking timeouts occurred in the browser automation/runtime layer, not as app console failures
- Evidence type: written observation / console check
- Notes: this should not be read as a full-app clean bill of health, only as “no new Monitoring interaction errors observed during the completed checks”

## External

### Runtime state reached

- Active `External` grid loaded with:
  - `3 active · 0 archived · 1 links`
  - visible rows `OUT10 EXT Alpha 692119`, `OUT10 EXT Beta 692119`, `OUT10 EXT Gamma 692119`
- The `Links` tab was also confirmed earlier in-session and showed:
  - `1` link row for `OUT10 EXT Alpha 692119`
  - action buttons `Open details`, `Edit link`, `More actions`

### A-J validation status

- Result set: **NOT RUN** for A-I, **NOT RUN** for J
- Screen/workspace: `External`
- Exact action performed: loaded the live `Active` registry view and separately confirmed the `Links` tab contents earlier in the same session
- Expected result: same shared selection contract as Monitoring, plus correct entity/link target behavior by tab
- Actual result: the page loaded the expected sample rows, but row-click execution on this browser surface timed out before I could complete trustworthy selection, double-click, right-click, or reset proofs
- Evidence type: written observation / DOM snapshot
- Notes:
  - This is the main remaining blocker for Iteration 04 runtime proof
  - Because the grid content loaded correctly and no domain-regression symptom surfaced before the click driver failed, I classify this as **test/environment ambiguity**, not as a confirmed shared-contract failure

## Services

### Runtime state reached

- Active `Services` grid loaded with:
  - `3 active · 0 deleted`
  - visible rows `OUT10 SVC Alpha 692094`, `OUT10 SVC Beta 692094`, `OUT10 SVC Gamma 692094`

### A-J validation status

- Result set: **NOT RUN** for A-J
- Screen/workspace: `Services`
- Exact action performed: loaded the live Services registry and confirmed runtime sample rows plus visible action controls
- Expected result: full shared selection/interaction contract validation
- Actual result: AG Grid row click automation timed out before I could complete reliable single-click, multi-select, shift-range, double-click, or right-click proofs
- Evidence type: written observation / DOM snapshot
- Notes:
  - As with External, the page content itself was present and domain actions were rendered
  - The blocker was runtime/browser interaction instability, not a reproduced Services-specific behavior regression

## Failures And Ownership

### Confirmed failures

- None of the completed live checks showed a confirmed shared interaction regression in product behavior

### Validation blockers

- Smallest reproduction:
  1. Load `Monitoring`, `Services`, or `External` on the shared `5173` app
  2. Wait for AG Grid rows to render
  3. Attempt repeated row-cell click automation after grouped state changes or after several prior interactions
  4. Browser automation begins timing out on selector evaluation even while the page still renders valid rows
- Observed blocker shape:
  - timeouts while interacting with AG Grid rows from the browser runtime
  - successful DOM inspection continued even when click execution became unreliable
- Suspected ownership:
  - primary classification: **test/environment ambiguity**
  - secondary suspicion: **unknown**
- Not enough evidence to attribute this to:
  - shared interaction hook
  - shared grouped-selection hook
  - shared grid shell
  - single-consumer wiring

## Evidence Package

- Report: `frontend/OUT-10-ITERATION-04-RUNTIME-VALIDATION.md`
- Text artifacts written during validation:
  - `/private/tmp/out10-runtime-validation/monitoring-current.txt`
  - `/private/tmp/out10-runtime-validation/monitoring-raw.txt`
  - `/private/tmp/out10-runtime-validation/services-current.txt`
  - `/private/tmp/out10-runtime-validation/external-active.txt`

## Bottom Line

- Monitoring produced direct live proof for:
  - correct Monitoring-owned double-click target
  - correct app-owned right-click row menu behavior
  - live grouped-mode rendering by status
- External and Services reached live runtime data and rendered the expected rows, but the browser interaction layer timed out before the full A-J contract matrix could be completed.
- This packet should be reviewed as **PARTIAL runtime proof**, with the remaining gap specifically in live multi-workspace row-interaction execution, not in source/test coverage.
