## 1. Executive verdict

Iteration 03B verdict: `FAIL_RUNTIME_VALIDATION`

Can OUT-11 proceed to close-readiness review: `No`

Is recovery implementation required: `Yes`

Reason: runtime validation found reproducible one-active-overlay failures in all three workspaces, plus Monitoring and External allow `Bulk Actions` and row-action menu to remain open together.

`OUT-11 is not Done and not locked by this report.`

## 2. Runtime setup and blocker status

Environment used: local frontend dev server plus local backend reseeded to a disposable `Local Demo` tenant after the existing backend was discovered to be pointed at a stale pytest tenant DB.

Frontend URL: `http://127.0.0.1:5173`

Backend URL/status: `http://127.0.0.1:8000/api/v1/health` returned `200 {"status":"online"}`

Browser method used: `Playwright` with real Chromium pages in headless mode

Date/time of validation: `2026-06-29`, local timezone `America/Chicago`, runtime observations taken approximately `09:02-09:12`

Git commit/head: `123eb00f0798f0c5043c2108c73836b37dcd786f`

Branch: `main`

`git status --short`: clean

Screenshots/videos captured: `Yes`

Console logs checked: `Yes`

Environment limitations:
- Initial frontend-only run was unusable because the running backend had selected tenant `Switch B 1781764169614-67mnqd` pointing at a missing pytest DB under `/private/var/folders/.../pytest-45/...`.
- To make runtime validation possible, I reseeded a disposable local tenant with:
  - `./backend/venv/bin/python seed.py --tenant-name 'Local Demo' --tenant-db 'tenants/local-demo/local_demo.db' --admin-user admin_root --seed-data`
- I then restarted the backend with runtime env vars only, targeting:
  - `backend/config.local.db`
  - `backend/tenants/local-demo/local_demo.db`

## 3. Validation matrix by workspace and check ID

### Monitoring

Workspace: Monitoring  
Check ID: A  
Panel/action: one-active-overlay sequence  
Steps: open `Display`; open `Views`; select a row; open `Bulk Actions`; click row `More actions`  
Expected: only one top-level overlay remains open at a time  
Actual: `Display` remained visible when `Views` opened; later `Bulk Actions` remained visible when the row-action menu opened  
Result: FAIL  
Evidence: `/tmp/out11-monitoring-display-and-views.png`, `/tmp/out11-monitoring-bulk-and-row-action.png`  
Notes: reproduced consistently on the seeded `Local Demo` runtime

Workspace: Monitoring  
Check ID: B  
Panel/action: row action button behavior and selection stability  
Steps: select first row; click row `More actions`; dismiss by outside click; reopen and dismiss with `Escape`  
Expected: app menu opens, selection does not change, outside click and `Escape` dismiss  
Actual: row-action menu opened; selected row index stayed `[0]` before and after button interaction; outside click and `Escape` dismissed the menu  
Result: PASS  
Evidence: `/tmp/out11-monitoring-row-action-open.png`; runtime log `row action selection before/after [ '0' ] [ '0' ] outsideClosed 0 escapeClosed 0`  
Notes: no unexpected row-selection change observed

Workspace: Monitoring  
Check ID: C  
Panel/action: right-click app row menu and native context-menu suppression  
Steps: right-click second row; dismiss by outside click; reopen and dismiss with `Escape`  
Expected: app row menu opens and owns the interaction  
Actual: row-action menu opened on right-click; selected row index stayed `[0]` before and after; outside click and `Escape` dismissed the menu; no duplicate app menu appeared  
Result: PASS  
Evidence: runtime log `right click selection before/after [ '0' ] [ '0' ] open 1 outsideClosed 0 escapeClosed 0`  
Notes: headless Playwright does not surface the browser-native menu as a separately capturable artifact, but the app menu owned the interaction path

Workspace: Monitoring  
Check ID: D  
Panel/action: bottom/right viewport edge clamp  
Steps: open row-action menu from the last visible row at desktop width; repeat at narrow width  
Expected: menu remains visible and usable on-screen  
Actual: desktop rect stayed within viewport (`left 882 right 1424 vw 1440 bottom 898 vh 1000`); narrow rect stayed within viewport (`left 342 right 884 vw 900 bottom 764 vh 900`)  
Result: PASS  
Evidence: `/tmp/monitoring-row-action.png`; runtime rect logs  
Notes: no off-screen row-action placement observed

Workspace: Monitoring  
Check ID: E  
Panel/action: nested dropdown / `data-workspace-panel` parent stability  
Steps: open `Display`; open `Group By` dropdown; choose `Category`  
Expected: nested dropdown closes, parent `Display` panel stays open  
Actual: nested dropdown opened (`[data-workspace-panel="true"]` count `1` in prior run) and parent `Display` panel remained open after choosing a grouping option  
Result: PASS  
Evidence: `/tmp/out11-monitoring-display-dropdown.png`  
Notes: this proves parent-panel stability for the Monitoring display dropdown path

Workspace: Monitoring  
Check ID: F  
Panel/action: External-only dirty saved-view confirmation  
Steps: not applicable  
Expected: n/a  
Actual: n/a  
Result: NOT APPLICABLE  
Evidence: n/a  
Notes: Monitoring has no External-specific dirty-close acceptance item

Workspace: Monitoring  
Check ID: G  
Panel/action: long-grid/page-scroll behavior  
Steps: not completed after critical overlay failure was found  
Expected: overlays remain usable during longer scroll interaction  
Actual: not fully validated in this retry pass  
Result: BLOCKED  
Evidence: stop-rule applied after A failure  
Notes: last-visible-row clamp was validated, but extended post-open scrolling was not

Workspace: Monitoring  
Check ID: H  
Panel/action: narrow viewport behavior  
Steps: narrow width row-action check completed; full display/views/bulk narrow pass not completed after failure  
Expected: all major overlays remain usable at narrow width  
Actual: row-action menu remained on-screen at `900x900`; full top-level panel-set was not re-run after the mutual-exclusion failure  
Result: BLOCKED  
Evidence: narrow rect log for Monitoring  
Notes: partial evidence exists, but not enough to mark the full check PASS

Workspace: Monitoring  
Check ID: I  
Panel/action: console/runtime errors  
Steps: capture console during page load and overlay interactions  
Expected: no new OUT-11 interaction-caused console errors  
Actual: no console `error` entries were produced during the focused overlay interactions; baseline load warnings remained AG Grid invalid-colDef warnings and React Router future-flag warnings  
Result: PASS  
Evidence: runtime log `console error count 0`  
Notes: no new overlay-caused runtime error surfaced

Workspace: Monitoring  
Check ID: J  
Panel/action: OUT-10 regression spot checks  
Steps: first row click; second row click; meta-click third row; shift-click fourth row  
Expected: selection contract still behaves normally  
Actual: observed selection progression `[0] -> [1] -> [1,2] -> [2,3]`; row-action button and right-click did not mutate selection unexpectedly  
Result: PASS  
Evidence: runtime selection logs from the focused spot-check script  
Notes: scope/filter/search stale-selection reset was not re-run after the overlay failure

### External

Workspace: External  
Check ID: A  
Panel/action: one-active-overlay sequence  
Steps: open `Display`; open `Views`; select a row; open `Bulk Actions`; click row `More actions`  
Expected: only one top-level overlay remains open at a time  
Actual: `Display` remained visible when `Views` opened; `Bulk Actions` remained visible when the row-action menu opened  
Result: FAIL  
Evidence: runtime log `after views { display: true, views: true }` and `after row button { bulk: true, row: true }`  
Notes: behavior drift matches Monitoring for these paths

Workspace: External  
Check ID: B  
Panel/action: row action button behavior and selection stability  
Steps: select first row; click row `More actions`; dismiss by outside click; reopen and dismiss with `Escape`  
Expected: app menu opens, selection does not change, outside click and `Escape` dismiss  
Actual: row-action menu opened; selected row index stayed `[0]` before and after; outside click and `Escape` dismissed  
Result: PASS  
Evidence: runtime log `row action selection before/after [ '0' ] [ '0' ] outsideClosed 0 escapeClosed 0`  
Notes: no unexpected selection drift observed from the button path

Workspace: External  
Check ID: C  
Panel/action: right-click app row menu and native context-menu suppression  
Steps: right-click second row; dismiss by outside click; reopen and dismiss with `Escape`  
Expected: app row menu opens and owns the interaction  
Actual: row-action menu opened on right-click; selected row index stayed `[0]` before and after; outside click and `Escape` dismissed; no duplicate app menu appeared  
Result: PASS  
Evidence: runtime log `right click selection before/after [ '0' ] [ '0' ] open 1 outsideClosed 0 escapeClosed 0`  
Notes: native browser menu was not separately capturable in headless mode

Workspace: External  
Check ID: D  
Panel/action: bottom/right viewport edge clamp  
Steps: open row-action menu from the last visible row at desktop width; repeat at narrow width  
Expected: menu remains visible and usable on-screen  
Actual: desktop rect stayed within viewport (`left 1144 right 1424 vw 1440 bottom 913 vh 1000`); narrow rect stayed within viewport (`left 644 right 884 vw 900 bottom 792 vh 900`)  
Result: PASS  
Evidence: runtime rect logs for External  
Notes: no off-screen row-action placement observed

Workspace: External  
Check ID: E  
Panel/action: nested dropdown / `data-workspace-panel` parent stability  
Steps: checked `Display` panel runtime content and `Views` panel interaction path  
Expected: nested dropdowns, where present, should not close the parent prematurely  
Actual: the high-risk nested path in External was the dirty saved-view flow rather than a display dropdown; the display panel did not expose a runtime `Raw Rows` dropdown in this pass, and the saved-view panel itself remained open behind the confirmation modal  
Result: NOT APPLICABLE  
Evidence: runtime body text for External display panel showed `Display density`, `Group By`, and `Columns`, but not a selectable `Raw Rows` dropdown target in this pass  
Notes: the parent-panel protection most relevant to External was validated through F

Workspace: External  
Check ID: F  
Panel/action: unsaved saved-view close confirmation  
Steps: open `Views`; type `Unsaved Runtime Draft`; trigger outside click; repeat with `Escape`; press `Close` on the confirmation modal  
Expected: dirty close confirmation appears; draft is not silently discarded; cancelling keeps the panel and draft  
Actual: outside click raised confirmation with `You have typed a new view name. Discard it and close the menu?`; `Escape` raised the same confirmation; pressing `Close` kept `Saved views` open and preserved input value `Unsaved Runtime Draft`  
Result: PASS  
Evidence: `/tmp/out11-external-dirty-confirm.png`; runtime log `confirm visible after escape 1` and `saved views still visible after close modal 1 input value Unsaved Runtime Draft`  
Notes: this hard acceptance item passed

Workspace: External  
Check ID: G  
Panel/action: long-grid/page-scroll behavior  
Steps: not completed after critical overlay failure was found  
Expected: overlays remain usable during longer scroll interaction  
Actual: not fully validated in this retry pass  
Result: BLOCKED  
Evidence: stop-rule applied after A failure  
Notes: edge-clamp passed, but longer scroll interaction was not completed

Workspace: External  
Check ID: H  
Panel/action: narrow viewport behavior  
Steps: narrow width row-action check completed; full display/views/bulk narrow pass not completed after failure  
Expected: all major overlays remain usable at narrow width  
Actual: row-action menu remained on-screen at `900x900`; full top-level panel-set was not re-run after the mutual-exclusion failure  
Result: BLOCKED  
Evidence: narrow rect log for External  
Notes: partial evidence only

Workspace: External  
Check ID: I  
Panel/action: console/runtime errors  
Steps: capture console during page load and overlay interactions  
Expected: no new OUT-11 interaction-caused console errors  
Actual: no focused overlay interaction generated a console `error`; baseline warnings remained unrelated load warnings  
Result: PASS  
Evidence: no interaction-caused console errors observed during the Playwright run  
Notes: no new overlay-caused runtime error surfaced

Workspace: External  
Check ID: J  
Panel/action: OUT-10 regression spot checks  
Steps: first row click; second row click; meta-click third row; shift-click fourth row  
Expected: selection contract still behaves normally  
Actual: observed selection progression `[0] -> [1] -> [1,2] -> [2,3]`; row-action button and right-click did not mutate selection unexpectedly  
Result: PASS  
Evidence: runtime selection logs from the focused spot-check script  
Notes: scope/filter/search stale-selection reset was not re-run after the overlay failure

### Services

Workspace: Services  
Check ID: A  
Panel/action: one-active-overlay sequence  
Steps: open `Display`; open `Views`; select a row; open `Bulk Actions`; click row `More actions`  
Expected: only one top-level overlay remains open at a time  
Actual: `Display` remained visible when `Views` opened; however `Bulk Actions` did close when the row-action button menu opened  
Result: FAIL  
Evidence: runtime log `after views { display: true, views: true }` and `after row button { bulk: false, row: true }`  
Notes: Services partially matches the intended contract, but still fails the shared top-level mutual-exclusion law because `Display` and `Views` remain open together

Workspace: Services  
Check ID: B  
Panel/action: row action button behavior and selection stability  
Steps: select first row; click row `More actions`; dismiss by outside click; reopen and dismiss with `Escape`  
Expected: app menu opens, selection does not change, outside click and `Escape` dismiss  
Actual: row-action menu opened; selected row index stayed `[0]` before and after; outside click and `Escape` dismissed  
Result: PASS  
Evidence: runtime log `row action selection before/after [ '0' ] [ '0' ] outsideClosed 0 escapeClosed 0`  
Notes: no unexpected selection drift observed

Workspace: Services  
Check ID: C  
Panel/action: right-click app row menu and native context-menu suppression  
Steps: right-click second row; dismiss by outside click; reopen and dismiss with `Escape`  
Expected: app row menu opens and owns the interaction  
Actual: row-action menu opened on right-click; selected row index stayed `[0]` before and after; outside click and `Escape` dismissed; no duplicate app menu appeared  
Result: PASS  
Evidence: runtime log `right click selection before/after [ '0' ] [ '0' ] open 1 outsideClosed 0 escapeClosed 0`  
Notes: this is the runtime proof that Services still opens the app menu on right-click after the Iteration 02 local suppression removal

Workspace: Services  
Check ID: D  
Panel/action: bottom/right viewport edge clamp  
Steps: open row-action menu from the last visible row at desktop width; repeat at narrow width  
Expected: menu remains visible and usable on-screen  
Actual: desktop rect stayed within viewport (`left 1152 right 1424 vw 1440 bottom 678 vh 1000`); narrow rect stayed within viewport (`left 604 right 884 vw 900 bottom 779 vh 900`)  
Result: PASS  
Evidence: runtime rect logs for Services  
Notes: no off-screen row-action placement observed

Workspace: Services  
Check ID: E  
Panel/action: nested dropdown / `data-workspace-panel` parent stability  
Steps: open `Display`; open `Group By` dropdown from `Raw Rows`; choose `Status`  
Expected: nested dropdown closes, parent `Display` panel stays open  
Actual: nested dropdown opened (`[data-workspace-panel="true"]` count `1`) and the parent `Display` panel stayed open after choosing `Status`; nested dropdown then closed normally  
Result: PASS  
Evidence: runtime log `display still open true nested still open 0` and body tail showing `Raw Rows / Status / Environment / Type / Host`  
Notes: this validates the shared nested dropdown protection path in Services

Workspace: Services  
Check ID: F  
Panel/action: External-only dirty saved-view confirmation  
Steps: not applicable  
Expected: n/a  
Actual: n/a  
Result: NOT APPLICABLE  
Evidence: n/a  
Notes: Services has no External-specific dirty-close acceptance item

Workspace: Services  
Check ID: G  
Panel/action: long-grid/page-scroll behavior  
Steps: not completed after critical overlay failure was found  
Expected: overlays remain usable during longer scroll interaction  
Actual: not fully validated in this retry pass  
Result: BLOCKED  
Evidence: stop-rule applied after A failure  
Notes: edge-clamp passed, but longer scroll interaction was not completed

Workspace: Services  
Check ID: H  
Panel/action: narrow viewport behavior  
Steps: narrow width row-action check completed; full display/views/bulk narrow pass not completed after failure  
Expected: all major overlays remain usable at narrow width  
Actual: row-action menu remained on-screen at `900x900`; full top-level panel-set was not re-run after the mutual-exclusion failure  
Result: BLOCKED  
Evidence: narrow rect log for Services  
Notes: partial evidence only

Workspace: Services  
Check ID: I  
Panel/action: console/runtime errors  
Steps: capture console during page load and overlay interactions  
Expected: no new OUT-11 interaction-caused console errors  
Actual: no focused overlay interaction generated a console `error`; baseline warnings remained unrelated load warnings  
Result: PASS  
Evidence: no interaction-caused console errors observed during the Playwright run  
Notes: no new overlay-caused runtime error surfaced

Workspace: Services  
Check ID: J  
Panel/action: OUT-10 regression spot checks  
Steps: first row click; second row click; meta-click third row; shift-click fourth row  
Expected: selection contract still behaves normally  
Actual: observed selection progression `[0] -> [1] -> [1,2] -> [2,3]`; row-action button and right-click did not mutate selection unexpectedly  
Result: PASS  
Evidence: runtime selection logs from the focused spot-check script  
Notes: scope/filter/search stale-selection reset was not re-run after the overlay failure

## 4. Evidence index

- `/tmp/out11-monitoring-display-and-views.png`
  - Monitoring failure: `Display` remained visible after opening `Views`
- `/tmp/out11-monitoring-bulk-and-row-action.png`
  - Monitoring failure: `Bulk Actions` remained visible when row-action menu opened
- `/tmp/out11-external-dirty-confirm.png`
  - External pass: dirty saved-view confirmation appeared instead of silent close
- `/tmp/out11-monitoring-row-action-open.png`
  - Monitoring pass: row-action menu content opened correctly
- `/tmp/monitoring-row-action.png`
  - Monitoring pass: row-action menu remained clamped inside the viewport
- `/tmp/out11-monitoring-display-dropdown.png`
  - Monitoring pass: display panel dropdown options were usable at runtime

## 5. Console/runtime error record

Baseline load warnings observed:
- Vite dev connection logs
- AG Grid warnings about invalid `colDef` properties such as `operationalLockWidth` and `operationalSkipAutoSize`
- React Router future-flag warning

New interaction-caused console errors:
- None observed during the focused OUT-11 overlay interactions

## 6. OUT-10 regression spot-check record

Observed selection behavior:
- Monitoring: `[0] -> [1] -> [1,2] -> [2,3]`
- External: `[0] -> [1] -> [1,2] -> [2,3]`
- Services: `[0] -> [1] -> [1,2] -> [2,3]`

Overlay-related non-regressions observed:
- Clicking the row-action button did not unexpectedly select or deselect rows in Monitoring, External, or Services
- Right-clicking a row did not unexpectedly change the current selected row set in Monitoring, External, or Services

Not re-run in this retry:
- scope/filter/search/tab stale-selection reset paths after overlay dismissal

## 7. What worked

- Row-action button menus opened and dismissed correctly in Monitoring, External, and Services.
- Right-click row menus opened and dismissed correctly in Monitoring, External, and Services.
- Row-action viewport clamp held at desktop and narrow widths in all three workspaces.
- External dirty saved-view confirmation protection worked on both outside click and `Escape`.
- External cancel path preserved the saved-view draft and kept the panel open.
- Monitoring and Services nested dropdown interactions did not prematurely close the parent display panel.
- No new interaction-caused console errors were observed.
- OUT-10 row-selection behavior did not show an obvious runtime regression in the focused spot checks.

## 8. What failed or remained blocked

Failed:
- Monitoring: `Display` and `Views` can remain open together; `Bulk Actions` and row-action menu can remain open together.
- External: `Display` and `Views` can remain open together; `Bulk Actions` and row-action menu can remain open together.
- Services: `Display` and `Views` can remain open together.

Blocked / not fully completed after the critical failure:
- extended long-grid/page-scroll validation after overlays opened
- full narrow-viewport validation for `Display`, `Views`, and `Bulk Actions`
- a separate artifact proving native browser context-menu non-appearance in headless Chromium

## 9. Product failures with exact reproduction

### Failure 1: `Display` does not close when `Views` opens

Workspaces: Monitoring, External, Services

Reproduction:
1. Open the workspace page.
2. Click `Display`.
3. Click `Views`.

Expected:
- `Display` closes when `Views` opens.

Actual:
- `Display` content remained visible while `Views` also opened.

Runtime evidence:
- Monitoring log: `after views { display: true, views: true, bulk: false, row: false }`
- External log: `after views { display: true, views: true, bulk: false, row: false }`
- Services log: `after views { display: true, views: true, bulk: false, row: false }`

### Failure 2: `Bulk Actions` does not close when row-action menu opens

Workspaces: Monitoring, External

Reproduction:
1. Open the workspace page.
2. Select a row.
3. Click `Bulk Actions`.
4. Click a row `More actions` button.

Expected:
- `Bulk Actions` closes when the row-action menu opens.

Actual:
- `Bulk Actions` remained visible while the row-action menu also opened.

Runtime evidence:
- Monitoring log: `after row button { display: false, views: false, bulk: true, row: true }`
- External log: `after row button { display: false, views: false, bulk: true, row: true }`
- Services contrast: `after row button { display: false, views: false, bulk: false, row: true }`

## 10. Recommended next action

Recommended next action: `narrow recovery prompt`

Reason:
- the runtime failure is specific and reproducible
- the core regression is the top-level overlay mutual-exclusion contract
- External dirty-close protection, row-action clamp, and basic dismissal paths already passed, so the recovery scope should stay narrow

Suggested recovery focus:
- fix only top-level overlay mutual exclusion for `Display`, `Views`, `Bulk Actions`, and row-action menu
- preserve External dirty saved-view interception exactly as validated here
- keep nested dropdown protection intact
- re-run runtime validation for checks A, E, F, and a reduced J spot-check immediately after the recovery change
