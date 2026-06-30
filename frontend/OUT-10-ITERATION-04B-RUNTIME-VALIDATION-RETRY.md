# OUT-10 Iteration 04B Runtime Validation Retry

This packet is validation-only. No production code, tests, routes, backend files, or config were changed.

| Workspace | Single click | Ctrl/meta | Shift range | Action isolation | Double click | Right click | Grouped cross-group | Scope reset | Stale reappear | Console errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Monitoring | FAIL | FAIL | FAIL | FAIL | PASS | FAIL | PASS | PASS | FAIL | PASS |
| External | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | PASS | PASS | FAIL | PASS |
| Services | FAIL | FAIL | FAIL | FAIL | PASS | FAIL | PASS | PASS | FAIL | PASS |

## Runtime Setup

- Branch tested: `main`
- Commit tested: `8cacd6e7880b26b5ba6b846c62efdb5f6e58b32f`
- App startup command: reused existing local app stack on `127.0.0.1:5173`; recovered backend by launching `venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`
- Frontend URL: `http://127.0.0.1:5173`
- Backend/API status: `http://127.0.0.1:8000/api/v1/health` responded after backend restart
- Browser used: Playwright Chromium
- OS used: macOS
- Validation method: deterministic Playwright runner against the live local app stack
- Screenshots/videos captured: screenshots only, stored under `/private/tmp/out10-runtime-retry/`
- Console checked: yes
- App errors before validation: pre-existing AG Grid invalid `colDef` warnings for `operationalLockWidth` and `operationalSkipAutoSize`; pre-existing React Router future-flag warning

## Commands Run

- `rtk git status --short`
- `rtk sed -n '1,260p' frontend/OUT-10-ITERATION-04-RUNTIME-VALIDATION.md`
- `rtk proxy env NODE_PATH=/Users/haewonkim/home/development/sysgrid/frontend/node_modules node /private/tmp/out10_runtime_retry_runner.js Monitoring`
- `rtk proxy env NODE_PATH=/Users/haewonkim/home/development/sysgrid/frontend/node_modules node /private/tmp/out10_runtime_retry_runner.js External`
- `rtk proxy env NODE_PATH=/Users/haewonkim/home/development/sysgrid/frontend/node_modules node /private/tmp/out10_runtime_retry_runner.js Services`
- `venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`

## Evidence Package

- API snapshot: `/private/tmp/out10-runtime-retry/api-snapshot.json`
- Runner output: `/private/tmp/out10-runtime-retry/results.json`
- Monitoring screenshots:
  - `/private/tmp/out10-runtime-retry/monitoring-A-single-click.png`
  - `/private/tmp/out10-runtime-retry/monitoring-B-meta-click.png`
  - `/private/tmp/out10-runtime-retry/monitoring-C-shift-range.png`
  - `/private/tmp/out10-runtime-retry/monitoring-E-double-click.png`
  - `/private/tmp/out10-runtime-retry/monitoring-G-grouped-cross-group.png`
  - `/private/tmp/out10-runtime-retry/monitoring-H-scope-reset.png`
  - `/private/tmp/out10-runtime-retry/monitoring-I-stale-selection.png`
- External screenshots:
  - `/private/tmp/out10-runtime-retry/external-A-single-click.png`
  - `/private/tmp/out10-runtime-retry/external-B-meta-click.png`
  - `/private/tmp/out10-runtime-retry/external-C-shift-range.png`
  - `/private/tmp/out10-runtime-retry/external-E-double-click.png`
  - `/private/tmp/out10-runtime-retry/external-E-links-double-click.png`
  - `/private/tmp/out10-runtime-retry/external-G-grouped-cross-group.png`
  - `/private/tmp/out10-runtime-retry/external-H-scope-reset.png`
  - `/private/tmp/out10-runtime-retry/external-I-stale-selection.png`
- Services screenshots:
  - `/private/tmp/out10-runtime-retry/services-A-single-click.png`
  - `/private/tmp/out10-runtime-retry/services-B-meta-click.png`
  - `/private/tmp/out10-runtime-retry/services-C-shift-range.png`
  - `/private/tmp/out10-runtime-retry/services-E-double-click.png`
  - `/private/tmp/out10-runtime-retry/services-G-grouped-cross-group.png`
  - `/private/tmp/out10-runtime-retry/services-H-scope-reset.png`
  - `/private/tmp/out10-runtime-retry/services-I-stale-selection.png`

## Runtime Data Used

- Monitoring rows:
  - `OUT10 MON Alpha 692042` id `1`
  - `OUT10 MON Beta 692042` id `2`
  - `OUT10 MON Gamma 692042` id `3`
  - `OUT10 MON Delta 692042` id `4`
  - `OUT10 MON Alpha 692078` id `5`
  - `OUT10 MON Beta 692078` id `6`
  - `OUT10 MON Gamma 692078` id `7`
- External rows:
  - `OUT10 EXT Alpha 692119` id `1`
  - `OUT10 EXT Beta 692119` id `2`
  - `OUT10 EXT Gamma 692119` id `3`
  - Links tab row for `OUT10 EXT Alpha 692119`
- Services rows:
  - `OUT10 SVC Alpha 692094` id `1`
  - `OUT10 SVC Beta 692094` id `2`
  - `OUT10 SVC Gamma 692094` id `3`

## Monitoring

### A

- Result: **FAIL**
- Screen/workspace: `Monitoring raw grid`
- Exact row names or IDs used: `OUT10 MON Alpha 692042`, `OUT10 MON Beta 692042`
- Exact action performed: single-clicked Alpha, then single-clicked Beta
- Expected result: one selected row only; second click replaces first; no detail/edit opens
- Actual result: `afterFirst=3, afterSecond=3, secondSelected=true, dialogOpen=false`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/monitoring-A-single-click.png`; suspected ownership `shared row interaction hook`; classification `common/shared-contract failure`

### B

- Result: **FAIL**
- Screen/workspace: `Monitoring raw grid`
- Exact row names or IDs used: `OUT10 MON Alpha 692042`, `OUT10 MON Beta 692042`
- Exact action performed: clicked Alpha; meta-clicked Beta; meta-clicked Alpha again
- Expected result: meta toggles selection membership and can remove an already selected row
- Actual result: `afterAdd=6, afterRemove=3, selected=OUT10 MON Beta 692042`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/monitoring-B-meta-click.png`; macOS Meta modifier used; suspected ownership `shared row interaction hook`; classification `common/shared-contract failure`

### C

- Result: **FAIL**
- Screen/workspace: `Monitoring raw grid`
- Exact row names or IDs used: `OUT10 MON Alpha 692042`, `OUT10 MON Beta 692042`, `OUT10 MON Gamma 692042`
- Exact action performed: clicked Alpha; shift-clicked Gamma
- Expected result: visible contiguous range is selected in current order
- Actual result: `visibleOrder=OUT10 MON Alpha 692042 -> OUT10 MON Beta 692042 -> OUT10 MON Gamma 692042, selectedCount=9`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/monitoring-C-shift-range.png`; suspected ownership `shared row interaction hook`; classification `common/shared-contract failure`

### D

- Result: **FAIL**
- Screen/workspace: `Monitoring raw grid`
- Exact row names or IDs used: `OUT10 MON Alpha 692042`
- Exact action performed: attempted action-cell isolation validation against `.row-action-trigger`
- Expected result: action target opens without row selection or unintended detail open
- Actual result: `locator.click` timed out waiting for `.row-action-trigger` within the Alpha row
- Evidence type: written observation
- Notes: no screenshot captured because the trigger could not be resolved; exact blocker `browser automation / locator mismatch on action trigger`; suspected ownership `shared grid shell or consumer wiring or test harness`; classification `test/environment ambiguity`

### E

- Result: **PASS**
- Screen/workspace: `Monitoring raw grid`
- Exact row names or IDs used: `OUT10 MON Alpha 692042`
- Exact action performed: double-clicked Alpha
- Expected result: Monitoring-owned detail/edit target opens
- Actual result: `Dialog opened=true; markersPresent=true`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/monitoring-E-double-click.png`; suspected ownership `domain-owned behavior preserved`

### F

- Result: **FAIL**
- Screen/workspace: `Monitoring raw grid`
- Exact row names or IDs used: `OUT10 MON Alpha 692042`
- Exact action performed: right-click validation, including ignored/action-cell stage
- Expected result: app row menu opens near pointer and native context menu is suppressed where app owns the interaction
- Actual result: blocked by the same `.row-action-trigger` timeout used to validate ignored/action-cell behavior
- Evidence type: written observation
- Notes: exact blocker `browser automation / locator mismatch on action trigger`; suspected ownership `shared grid shell or consumer wiring or test harness`; classification `test/environment ambiguity`

### G

- Result: **PASS**
- Screen/workspace: `Monitoring grouped by Status`
- Exact row names or IDs used: `OUT10 MON Alpha 692042`, `OUT10 MON Beta 692042`
- Exact action performed: grouped by Status; selected Alpha and Beta across different groups; opened Bulk Actions
- Expected result: cross-group selection aggregates rows from both groups
- Actual result: `Bulk Actions count=2`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/monitoring-G-grouped-cross-group.png`; suspected ownership `shared grouped-selection hook`; classification `shared contract working`

### H

- Result: **PASS**
- Screen/workspace: `Monitoring grouped by Status with search scope change`
- Exact row names or IDs used: `OUT10 MON Alpha 692042`, `OUT10 MON Beta 692042`, then `OUT10 MON Gamma 692078`
- Exact action performed: created grouped selection, then changed search scope to Gamma 692078
- Expected result: previous grouped selections clear when scope changes
- Actual result: `selectedAfterReset=0`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/monitoring-H-scope-reset.png`; suspected ownership `shared grouped-selection hook`; classification `shared contract working`

### I

- Result: **FAIL**
- Screen/workspace: `Monitoring grouped by Status after scope restore`
- Exact row names or IDs used: `OUT10 MON Gamma 692078` versus old `OUT10 MON Alpha 692042`, `OUT10 MON Beta 692042`
- Exact action performed: selected Gamma in narrowed scope, then cleared search back to broader grouped scope
- Expected result: old grouped IDs do not reappear after scope restore
- Actual result: `narrowedCount=1, selectedAfterReturn=3, selected=OUT10 MON Gamma 692078`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/monitoring-I-stale-selection.png`; suspected ownership `shared grouped-selection hook`; classification `common/shared-contract failure`

### J

- Result: **PASS**
- Screen/workspace: `Monitoring`
- Exact row names or IDs used: all rows used in A-I
- Exact action performed: observed console during interaction checks
- Expected result: no new console errors during validation
- Actual result: `No new console.error entries after workspace baseline. New warnings=27.`
- Evidence type: written observation / console log
- Notes: new warnings included repeated baseline AG Grid property warnings, React Router future-flag warning, `A router only supports one blocker at a time`, and AG Grid deprecation warning for `columnApi.getColumnState`; classification `no new console errors`

## External

### A

- Result: **FAIL**
- Screen/workspace: `External raw grid`
- Exact row names or IDs used: `OUT10 EXT Alpha 692119`, `OUT10 EXT Beta 692119`
- Exact action performed: single-clicked Alpha, then single-clicked Beta
- Expected result: one selected row only; second click replaces first; no detail/edit opens
- Actual result: `afterFirst=3, afterSecond=3, secondSelected=true, dialogOpen=false`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/external-A-single-click.png`; suspected ownership `shared row interaction hook`; classification `common/shared-contract failure`

### B

- Result: **FAIL**
- Screen/workspace: `External raw grid`
- Exact row names or IDs used: `OUT10 EXT Alpha 692119`, `OUT10 EXT Beta 692119`
- Exact action performed: clicked Alpha; meta-clicked Beta; meta-clicked Alpha again
- Expected result: meta toggles selection membership and can remove an already selected row
- Actual result: `afterAdd=6, afterRemove=3, selected=OUT10 EXT Beta 692119`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/external-B-meta-click.png`; macOS Meta modifier used; suspected ownership `shared row interaction hook`; classification `common/shared-contract failure`

### C

- Result: **FAIL**
- Screen/workspace: `External raw grid`
- Exact row names or IDs used: `OUT10 EXT Alpha 692119`, `OUT10 EXT Beta 692119`, `OUT10 EXT Gamma 692119`
- Exact action performed: clicked Alpha; shift-clicked Gamma
- Expected result: visible contiguous range is selected in current order
- Actual result: `visibleOrder=OUT10 EXT Alpha 692119 -> OUT10 EXT Beta 692119 -> OUT10 EXT Gamma 692119, selectedCount=9`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/external-C-shift-range.png`; suspected ownership `shared row interaction hook`; classification `common/shared-contract failure`

### D

- Result: **FAIL**
- Screen/workspace: `External raw grid`
- Exact row names or IDs used: `OUT10 EXT Alpha 692119`
- Exact action performed: attempted action-cell isolation validation against `.row-action-trigger`
- Expected result: action target opens without row selection or unintended detail open
- Actual result: `locator.click` timed out waiting for `.row-action-trigger` within the Alpha row
- Evidence type: written observation
- Notes: exact blocker `browser automation / locator mismatch on action trigger`; suspected ownership `shared grid shell or consumer wiring or test harness`; classification `test/environment ambiguity`

### E

- Result: **FAIL**
- Screen/workspace: `External raw grid` and `External Links tab`
- Exact row names or IDs used: `OUT10 EXT Alpha 692119`
- Exact action performed: double-clicked Alpha in the main grid; separately validated Links-tab double-click
- Expected result: correct External-owned entity/link target opens based on the active tab
- Actual result: `Dialog opened=true; markersPresent=false; Links-tab double-click opened Alpha dialog=true`
- Evidence type: screenshot / written observation
- Notes: screenshots `/private/tmp/out10-runtime-retry/external-E-double-click.png` and `/private/tmp/out10-runtime-retry/external-E-links-double-click.png`; suspected ownership `consumer wiring or domain-owned target markers`; classification `single-consumer wiring failure`

### F

- Result: **FAIL**
- Screen/workspace: `External raw grid`
- Exact row names or IDs used: `OUT10 EXT Alpha 692119`
- Exact action performed: right-click validation, including ignored/action-cell stage
- Expected result: app row menu opens near pointer and native context menu is suppressed where app owns the interaction
- Actual result: blocked by the same `.row-action-trigger` timeout used to validate ignored/action-cell behavior
- Evidence type: written observation
- Notes: exact blocker `browser automation / locator mismatch on action trigger`; suspected ownership `shared grid shell or consumer wiring or test harness`; classification `test/environment ambiguity`

### G

- Result: **PASS**
- Screen/workspace: `External grouped by Status`
- Exact row names or IDs used: `OUT10 EXT Alpha 692119`, `OUT10 EXT Beta 692119`
- Exact action performed: grouped by Status; selected Alpha and Beta across different groups; opened Bulk Actions
- Expected result: cross-group selection aggregates rows from both groups
- Actual result: `Bulk Actions count=2`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/external-G-grouped-cross-group.png`; suspected ownership `shared grouped-selection hook`; classification `shared contract working`

### H

- Result: **PASS**
- Screen/workspace: `External grouped by Status with search scope change`
- Exact row names or IDs used: `OUT10 EXT Alpha 692119`, `OUT10 EXT Beta 692119`, then `OUT10 EXT Gamma 692119`
- Exact action performed: created grouped selection, then changed search scope to Gamma 692119
- Expected result: previous grouped selections clear when scope changes
- Actual result: `selectedAfterReset=0`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/external-H-scope-reset.png`; suspected ownership `shared grouped-selection hook`; classification `shared contract working`

### I

- Result: **FAIL**
- Screen/workspace: `External grouped by Status after scope restore`
- Exact row names or IDs used: `OUT10 EXT Gamma 692119` versus old `OUT10 EXT Alpha 692119`, `OUT10 EXT Beta 692119`
- Exact action performed: selected Gamma in narrowed scope, then cleared search back to broader grouped scope
- Expected result: old grouped IDs do not reappear after scope restore
- Actual result: `narrowedCount=1, selectedAfterReturn=3, selected=OUT10 EXT Gamma 692119`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/external-I-stale-selection.png`; suspected ownership `shared grouped-selection hook`; classification `common/shared-contract failure`

### J

- Result: **PASS**
- Screen/workspace: `External`
- Exact row names or IDs used: all rows used in A-I
- Exact action performed: observed console during interaction checks
- Expected result: no new console errors during validation
- Actual result: `No new console.error entries after workspace baseline. New warnings=32.`
- Evidence type: written observation / console log
- Notes: warnings were repeated baseline AG Grid property warnings, repeated React Router future-flag warning, and repeated `A router only supports one blocker at a time`; classification `no new console errors`

## Services

### A

- Result: **FAIL**
- Screen/workspace: `Services raw grid`
- Exact row names or IDs used: `OUT10 SVC Alpha 692094`, `OUT10 SVC Beta 692094`
- Exact action performed: single-clicked Alpha, then single-clicked Beta
- Expected result: one selected row only; second click replaces first; no detail/edit opens
- Actual result: `afterFirst=3, afterSecond=3, secondSelected=true, dialogOpen=false`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/services-A-single-click.png`; suspected ownership `shared row interaction hook`; classification `common/shared-contract failure`

### B

- Result: **FAIL**
- Screen/workspace: `Services raw grid`
- Exact row names or IDs used: `OUT10 SVC Alpha 692094`, `OUT10 SVC Beta 692094`
- Exact action performed: clicked Alpha; meta-clicked Beta; meta-clicked Alpha again
- Expected result: meta toggles selection membership and can remove an already selected row
- Actual result: `afterAdd=6, afterRemove=3, selected=OUT10 SVC Beta 692094`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/services-B-meta-click.png`; macOS Meta modifier used; suspected ownership `shared row interaction hook`; classification `common/shared-contract failure`

### C

- Result: **FAIL**
- Screen/workspace: `Services raw grid`
- Exact row names or IDs used: `OUT10 SVC Alpha 692094`, `OUT10 SVC Beta 692094`, `OUT10 SVC Gamma 692094`
- Exact action performed: clicked Alpha; shift-clicked Gamma
- Expected result: visible contiguous range is selected in current order
- Actual result: `visibleOrder=OUT10 SVC Alpha 692094 -> OUT10 SVC Beta 692094 -> OUT10 SVC Gamma 692094, selectedCount=9`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/services-C-shift-range.png`; suspected ownership `shared row interaction hook`; classification `common/shared-contract failure`

### D

- Result: **FAIL**
- Screen/workspace: `Services raw grid`
- Exact row names or IDs used: `OUT10 SVC Alpha 692094`
- Exact action performed: attempted action-cell isolation validation against `.row-action-trigger`
- Expected result: action target opens without row selection or unintended detail open
- Actual result: `locator.click` timed out waiting for `.row-action-trigger` within the Alpha row
- Evidence type: written observation
- Notes: exact blocker `browser automation / locator mismatch on action trigger`; suspected ownership `shared grid shell or consumer wiring or test harness`; classification `test/environment ambiguity`

### E

- Result: **PASS**
- Screen/workspace: `Services raw grid`
- Exact row names or IDs used: `OUT10 SVC Alpha 692094`
- Exact action performed: double-clicked Alpha
- Expected result: Services-owned detail/edit target opens
- Actual result: `Dialog opened=true; markersPresent=true`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/services-E-double-click.png`; suspected ownership `domain-owned behavior preserved`

### F

- Result: **FAIL**
- Screen/workspace: `Services raw grid`
- Exact row names or IDs used: `OUT10 SVC Alpha 692094`
- Exact action performed: right-click validation, including ignored/action-cell stage
- Expected result: app row menu opens near pointer and native context menu is suppressed where app owns the interaction
- Actual result: blocked by the same `.row-action-trigger` timeout used to validate ignored/action-cell behavior
- Evidence type: written observation
- Notes: exact blocker `browser automation / locator mismatch on action trigger`; suspected ownership `shared grid shell or consumer wiring or test harness`; classification `test/environment ambiguity`

### G

- Result: **PASS**
- Screen/workspace: `Services grouped by Status`
- Exact row names or IDs used: `OUT10 SVC Alpha 692094`, `OUT10 SVC Beta 692094`
- Exact action performed: grouped by Status; selected Alpha and Beta across different groups; opened Bulk Actions
- Expected result: cross-group selection aggregates rows from both groups
- Actual result: `Bulk Actions count=2`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/services-G-grouped-cross-group.png`; suspected ownership `shared grouped-selection hook`; classification `shared contract working`

### H

- Result: **PASS**
- Screen/workspace: `Services grouped by Status with search scope change`
- Exact row names or IDs used: `OUT10 SVC Alpha 692094`, `OUT10 SVC Beta 692094`, then `OUT10 SVC Gamma 692094`
- Exact action performed: created grouped selection, then changed search scope to Gamma 692094
- Expected result: previous grouped selections clear when scope changes
- Actual result: `selectedAfterReset=0`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/services-H-scope-reset.png`; suspected ownership `shared grouped-selection hook`; classification `shared contract working`

### I

- Result: **FAIL**
- Screen/workspace: `Services grouped by Status after scope restore`
- Exact row names or IDs used: `OUT10 SVC Gamma 692094` versus old `OUT10 SVC Alpha 692094`, `OUT10 SVC Beta 692094`
- Exact action performed: selected Gamma in narrowed scope, then cleared search back to broader grouped scope
- Expected result: old grouped IDs do not reappear after scope restore
- Actual result: `narrowedCount=1, selectedAfterReturn=3, selected=OUT10 SVC Gamma 692094`
- Evidence type: screenshot / written observation
- Notes: screenshot `/private/tmp/out10-runtime-retry/services-I-stale-selection.png`; suspected ownership `shared grouped-selection hook`; classification `common/shared-contract failure`

### J

- Result: **PASS**
- Screen/workspace: `Services`
- Exact row names or IDs used: all rows used in A-I
- Exact action performed: observed console during interaction checks
- Expected result: no new console errors during validation
- Actual result: `No new console.error entries after workspace baseline. New warnings=27.`
- Evidence type: written observation / console log
- Notes: warnings were repeated baseline AG Grid property warnings, repeated React Router future-flag warning, repeated `A router only supports one blocker at a time`, and AG Grid deprecation warning for `columnApi.getColumnState`; classification `no new console errors`

## Cross-Workspace Readout

- A, B, and C failed identically in Monitoring, External, and Services. The repeated `3 -> 3`, `6 -> 3`, and `selectedCount=9` patterns make this look like a shared selection contract defect, not three separate domain regressions.
- G and H passed identically in Monitoring, External, and Services. Cross-group selection aggregation and scope-reset clearing are behaving consistently in the shared grouped-selection path.
- I failed identically in Monitoring, External, and Services. Old grouped selections reappeared after scope restoration, which points to stale shared grouped-selection state.
- D and F remain blocked by the same action-trigger resolution timeout in all three workspaces. That is insufficient to prove product correctness or failure for action-cell isolation and ignored-cell right-click behavior. The runtime packet records them as failures because the required proof did not complete, but the failure class is `test/environment ambiguity`.
- E shows domain preservation for Monitoring and Services, but External did not satisfy the expected target-marker proof on the main grid even though a dialog opened and the Links-tab double-click also opened a dialog. That makes External E the only domain-specific double-click failure shape in this run.

## What Was Not Fully Verified

- Native browser context menu suppression was not directly proven on ignored/action cells because the action-trigger locator never resolved in D/F.
- Left-click action-cell isolation was not directly proven in any workspace for the same reason.
- Human/manual validation was not performed in this retry packet. Evidence came from deterministic Playwright runtime checks plus screenshots and console capture.
- No network-log-only proof was collected because the reproduced failures were visible in selection counts and dialog states without needing transport inspection.

## Recommended Follow-On Based On This Retry

- Treat A, B, C, and I as the highest-confidence shared-contract failures to drive the next implementation prompt.
- Treat D and F as requiring either a manual browser confirmation pass or a hardened action-trigger probe before using them as product-failure evidence.
- Treat External E as a focused consumer-wiring or domain-target verification item, separate from the clearly shared A/B/C/I failure cluster.
