# RUN3-E UI Standard Acceptance Checklist

## Verdict
`PASS_DETERMINISTIC`

This checklist is deterministic when run against the inspected artifacts and current source anchors. Mark the run `BLOCKED` when required sample data is unavailable or when a source-verified precondition cannot be established in the running environment.

## Golden Objective
The operational UI must behave like a plug-and-play, life-saver-grade workspace:

- visible actions never invite a known backend rejection
- destructive actions are either safely blocked with a precise explanation or succeed with precise irreversible wording
- no-op actions never claim change and never offer revert
- reversible real changes always offer a working revert
- Monitoring, External, and Services behave as the locked trio unless a source-verified exception is documented
- long row-action titles never wrap, and any title-driven width expansion must also widen every button, card, dropdown, and nested control inside the same panel

## Evidence Method
Artifacts inspected:

- `frontend/RUN3-A-workspace-drift-matrix.md`
- `frontend/RUN3-B-bulk-contract-testpack.md`
- `frontend/RUN3-C-row-action-contract-testpack.md`
- `frontend/RUN3-D-api-action-contract-audit.md`
- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/External.tsx`
- `frontend/src/components/ServicesReal.tsx`
- `frontend/src/components/shared/OperationalBulkContract.ts`
- `frontend/src/components/shared/OperationalRowActionMenu.tsx`
- `frontend/src/components/shared/OperationalRowActionGeometry.ts`
- `frontend/src/components/shared/OperationalGridInteractions.ts`
- `frontend/src/components/shared/OperationalWorkspaceHooks.ts`

Proof commands:

```bash
rtk rg -n "OperationalBulkContract|OperationalRowAction|SavedView|Display|bulk|purge|archive|restore|onRevert|Escape|keydown|outside|contains\(" frontend/src
rtk rg -n "No changes made|already matched|Permanently purged|Archived|Restored|Updated.*selected|Bulk operation reverted|Bulk revert failed|Cannot purge selected external records" frontend/src
rtk rg -n "rowAction|headerContentWidth|minWidth|maxWidth|truncate|whitespace-nowrap|DropdownEditor|ActionCard" frontend/src
```

Evidence to capture for every failed or blocked step:

- view name and route
- selected row ids and visible titles
- action clicked
- toast text
- network request and response if visible
- screenshot
- expected vs actual
- source or artifact reference if known

## Global Close Gate
Do not mark the run Done if any item below fails:

- a visible action can trigger a known backend rejection
- a row-action title wraps
- long-title width does not apply to all controls inside the row-action panel
- a no-op shows revert
- a reversible actual update lacks a working revert
- purge shows revert
- Monitoring, External, and Services diverge from the locked trio without a source-verified exception
- a backend/API action mismatch exists
- an unsafe destructive action lacks an explanation

## Test Data Requirements
Prepare or identify these records before validation:

| Record Type | Required Characteristics | Used In |
| --- | --- | --- |
| short-title record | visible title under 30 characters | row-action baseline |
| very long-title record | visible title long enough to force width growth and, on narrow viewport, ellipsis | row-action width law |
| active row | appears in active or existing scope and supports at least one reversible action | archive and update |
| deleted/archived row | appears in deleted or archived scope | restore and purge checks |
| no-op update row | already matches a target bulk-edit value | no-op toast and no-revert |
| actual-update row | differs from a target bulk-edit value on a reversible field | changed toast and revert |
| partial multi-select set | contains at least one matching and at least one non-matching row for the same target value | partial update |
| unsafe purge row | deleted External record with at least one link or one credential | External purge block |
| safe purge row | deleted record that supports purge and meets source-verified purge preconditions | purge success |
| restore-conflict row | deleted External row that will fail restore because accountable owner or identity precondition is broken, if available | External restore block |

Mark the run `BLOCKED` if the required sample row for a section cannot be produced without code changes or undocumented data seeding.

## Bulk Behavior Checklist
Use these exact expected success messages:

- No-op: `No changes made. Selected records already match the chosen value.`
- Actual update: `Updated X of Y selected records: {Field Label} changed.`
- Partial: `Updated X of Y selected records: {Field Label} changed. N already matched.`
- Archive: `Archived X of Y selected records.`
- Restore: `Restored X of Y selected records.`
- Purge: `Permanently purged X of Y selected records.`

Revert contract:

- no revert for no-op
- revert required for reversible actual update
- revert required for reversible archive
- revert required for reversible restore
- no revert for purge

## Monitoring Checklist
| Area | Starting State | Step | Expected Result | Failure If | Evidence To Capture |
| --- | --- | --- | --- | --- | --- |
| load | Monitoring route open, active scope visible, data loaded | Refresh the page and wait for the grid to finish loading | Grid renders without broken controls; bulk, display, views, and row action affordances appear usable | missing grid, broken toolbar, or interactive controls disabled without visible reason | full-page screenshot |
| row selection | At least 2 visible active rows | Click one row checkbox | exactly one row becomes selected and selected count updates by 1 | wrong row selected, count wrong, or selection invisible | selected row screenshot |
| shift selection | At least 3 contiguous visible rows | Click first row checkbox, then Shift-click third row checkbox | rows 1 through 3 become selected | non-contiguous selection or wrong count | selected range screenshot |
| row action | short-title active row visible | Open row action for the short-title row | row-action panel opens anchored near trigger with one-line header, one-line meta, one-line title | panel does not open or text wraps | row-action screenshot |
| long-title row action | very long-title row visible on desktop-width viewport | Open row action for the long-title row | title remains one line; panel grows wider if space exists; no control remains narrower than the resolved panel content width | title wraps, panel grows but controls stay narrow, or horizontal overflow appears | row-action screenshot showing title and buttons |
| title one-line / ellipsis | very long-title row visible on narrow viewport | Narrow viewport until panel width caps, then reopen row action | title stays one line and truncates with ellipsis instead of wrapping | second title line appears or text overflows horizontally | narrow-viewport screenshot |
| all controls grow with width | long-title row action panel open | Compare quick-action buttons, cards, and any dropdown editor trigger widths inside the same panel | each control surface expands to the same resolved content width as the widened panel body | any button, card, dropdown trigger, or nested apply control is visibly narrower | close screenshot of all controls |
| outside click | Monitoring bulk, display, views, or row-action panel open | Click clearly outside the open panel and outside its trigger | the open panel closes | panel stays open | before/after screenshot |
| Escape | Any Monitoring panel open | Press Escape once | the open panel closes | panel remains open | screenshot or screen capture |
| bulk no-op update | select only no-op update row(s); bulk menu open; choose a field value already present | Apply the bulk update | toast is exactly `No changes made. Selected records already match the chosen value.` and no revert appears | copy differs or revert appears | toast screenshot |
| bulk actual update | select only actual-update row(s); bulk menu open | Apply one reversible field change | toast is exactly `Updated X of Y selected records: {Field Label} changed.` and revert is visible | copy differs, counts wrong, or revert missing | toast screenshot and selected ids |
| bulk partial update | partial multi-select set selected; bulk menu open | Apply one reversible field change | toast is exactly `Updated X of Y selected records: {Field Label} changed. N already matched.` and revert is visible | copy differs, `already matched` missing, or revert missing | toast screenshot |
| archive | active row selected or row action open on active row | Run archive from the supported Monitoring surface | toast is exactly `Archived X of Y selected records.` and revert is visible | copy differs or revert missing | toast screenshot |
| restore | deleted row selected or row action open on deleted row | Run restore | toast is exactly `Restored X of Y selected records.` and revert is visible | copy differs or revert missing | toast screenshot |
| purge | deleted row selected or row action open on deleted row | Run purge from the supported deleted-state surface | toast is exactly `Permanently purged X of Y selected records.` and no revert appears | copy differs or revert appears | toast screenshot |
| revert | Immediately after a reversible Monitoring success toast | Click Revert | success toast is exactly `Bulk operation reverted.` and the changed field or lifecycle state returns to its previous value | revert fails, value does not return, or success copy differs | before/after row screenshot plus revert toast |
| no revert for no-op/purge | complete one no-op and one purge action | Inspect both resulting toasts | neither toast shows Revert | revert visible on either | toast screenshot |
| saved views | at least one non-default column/order/filter combination possible | Save a named view, switch away, then re-apply it | saved view restores the saved layout deterministically | saved view absent, wrong layout restored, or name not available | screenshot of saved view list and restored layout |
| display views | Display panel closed; grid visible | Open Display, change at least one density or column presentation control, close, reopen | control changes persist for the current view/state as implemented | display change silently ignored or panel state drifts | before/after screenshot |
| toast wording | complete no-op, changed update, archive, restore, purge, and revert flows | Compare toast text against the locked strings above | every toast matches exact expected wording for the action outcome | any copy deviates | toast gallery screenshots |

## External Checklist
| Area | Starting State | Step | Expected Result | Failure If | Evidence To Capture |
| --- | --- | --- | --- | --- | --- |
| load | External route open with data loaded | Refresh the page and wait for the grid | grid and standard controls render without broken states | grid or controls fail to render | full-page screenshot |
| row selection | At least 2 visible rows | Select one row, then extend with Shift-select | selection count and range behave deterministically | wrong count or wrong rows selected | selection screenshot |
| row action | short-title row visible | Open row action | shared row-action panel opens with one-line title/meta | no panel or wrapping text | screenshot |
| long-title row action | very long-title row visible | Open row action on desktop viewport | title stays one line and controls widen with panel width | title wraps or controls remain narrow | screenshot |
| title one-line / ellipsis | very long-title row visible on narrow viewport | Reopen the row action after shrinking viewport | title truncates with ellipsis on one line | wrap or overflow | screenshot |
| all controls grow with width | long-title row action open | Compare all controls within panel | all controls share the widened content width | any control narrower than the panel content width | close screenshot |
| outside click | any External panel open | Click outside | open panel closes | panel stays open | before/after screenshot |
| Escape | any External panel open | Press Escape | open panel closes | panel stays open | screenshot |
| bulk no-op update | select only rows that already match chosen target value | Apply bulk update | exact toast `No changes made. Selected records already match the chosen value.` and no revert | copy differs or revert appears | toast screenshot |
| bulk actual update | select only actual-update row(s) | Apply one reversible field change | exact toast `Updated X of Y selected records: {Field Label} changed.` and revert visible | copy differs or revert missing | toast screenshot |
| bulk partial update | select mixed matching and non-matching rows | Apply one reversible field change | exact toast `Updated X of Y selected records: {Field Label} changed. N already matched.` and revert visible | copy differs, counts wrong, or revert missing | toast screenshot |
| archive | active row selected | Run archive | exact toast `Archived X of Y selected records.` and revert visible | copy differs or revert missing | toast screenshot |
| restore | deleted row selected and restore preconditions satisfied | Run restore | exact toast `Restored X of Y selected records.` and revert visible | copy differs or revert missing | toast screenshot |
| restore ownership blocked if source-proven | deleted row selected that is source-proven to violate owner or identity restore preconditions | Run restore | restore is blocked by an explicit error; no false success toast appears | success toast appears or silent failure occurs | toast/error screenshot plus network response |
| unsafe purge blocked before backend call | deleted unsafe purge row selected | Attempt purge from bulk UI and, if present, from row action | purge is disabled or blocked before request, with no success toast and no outbound purge request | purge request is sent or destructive button is enabled | disabled button screenshot and network tab |
| unsafe purge explanation | deleted unsafe purge row selected | Inspect blocked purge explanation text | exact text is `Cannot purge selected external records because one or more are still linked or credentialed.` | wording differs or explanation absent | screenshot of message |
| safe purge succeeds | deleted safe purge row selected | Run purge | exact toast `Permanently purged X of Y selected records.` and no revert | copy differs or revert appears | toast screenshot |
| revert | immediately after reversible success | Click Revert | exact toast `Bulk operation reverted.` and row data returns to previous state | revert missing, fails, or state does not return | before/after screenshot plus toast |
| no revert for no-op/purge | complete one no-op and one purge | Inspect both toasts | neither shows Revert | revert visible | toast screenshot |
| saved views | change layout/filter/grouping to a named view candidate | Save and re-apply a view | the saved view restores the expected configuration | save/apply is inconsistent | screenshots |
| display views | grid visible | Open Display, change one presentation control, close and reopen | display state behaves consistently | control change lost or inconsistent | screenshots |
| toast wording | complete no-op, changed update, archive, restore, purge, revert, and blocked purge flows | Compare text to locked strings | all success strings match exactly; blocked purge message matches exactly | any wording deviates | toast gallery screenshots |
| client fanout partial failure observation if relevant | environment available to force one External row to fail while others succeed | Run a multi-row update where one row is expected to fail | failure is surfaced as failure, not a misleading success toast; record exact observed behavior | mixed failure is reported as unqualified success | toast/error screenshot and network traces |

## Services Checklist
| Area | Starting State | Step | Expected Result | Failure If | Evidence To Capture |
| --- | --- | --- | --- | --- | --- |
| load | Services route open with data loaded | Refresh and wait for grid load | grid and standard controls render | missing grid or broken controls | full-page screenshot |
| row selection | At least 2 visible rows | Select one row, then Shift-select a range | selection count and range are correct | wrong selection behavior | screenshot |
| row action | short-title row visible | Open row action | row-action panel opens with one-line title/meta | no panel or wrapping title | screenshot |
| long-title row action | very long-title row visible | Open row action | panel widens; title stays one line; controls widen with panel | wrap, overflow, or narrow controls | screenshot |
| title one-line / ellipsis | very long-title row visible in narrow viewport | Reopen row action after shrinking viewport | title truncates with ellipsis on one line | wrap or overflow | screenshot |
| all controls grow with width | long-title row action open | Compare buttons/cards/dropdowns in panel | all surfaces share the same resolved width | visible width drift | screenshot |
| outside click | any Services panel open | Click outside | open panel closes | panel remains open | before/after screenshot |
| Escape | any Services panel open | Press Escape | open panel closes | panel remains open | screenshot |
| bulk no-op update | select only rows already matching one update value for `status`, `service_type`, or `environment` | Apply bulk update | exact toast `No changes made. Selected records already match the chosen value.` and no revert | copy differs or revert appears | toast screenshot |
| bulk actual update | select actual-update rows | Apply one supported reversible field change | exact toast `Updated X of Y selected records: {Field Label} changed.` and revert visible | copy differs or revert missing | toast screenshot |
| bulk partial update | partial multi-select set selected | Apply one supported reversible field change | exact toast `Updated X of Y selected records: {Field Label} changed. N already matched.` and revert visible | copy differs, counts wrong, or revert missing | toast screenshot |
| archive | active rows selected | Run archive | exact toast `Archived X of Y selected records.` and revert visible | copy differs or revert missing | toast screenshot |
| restore | deleted rows selected | Run restore | exact toast `Restored X of Y selected records.` and revert visible | copy differs or revert missing | toast screenshot |
| purge not exposed | Services deleted scope open | Inspect bulk UI and row actions for destructive deleted-state controls | purge is not exposed anywhere in modern Services UI | any purge action is visible or executable | screenshot of deleted-scope controls |
| Services update revert does not send restore_snapshots | browser devtools network capture open; perform a reversible Services update | Click Revert on the success toast | revert sends `PUT` requests with changed keys only and does not send a `restore_snapshots` backend action | network shows an unsupported revert transport or opaque snapshot action path | network capture |
| Services update revert restores previous changed field values | complete one reversible Services update | Click Revert | previously changed field values return to their exact prior values | revert completes but values remain changed | before/after screenshot plus network trace |
| no-op update has no revert | complete a Services no-op update | Inspect toast | no Revert appears | revert visible | toast screenshot |
| saved views | alter layout/filter/grouping | Save and re-apply a named view | saved view re-applies deterministically | save/apply drift | screenshots |
| display views | grid visible | Change one Display setting and reopen the panel | display choice behaves consistently | change not retained as implemented | screenshots |
| toast wording | complete no-op, changed update, archive, restore, and revert flows | Compare toast strings | exact strings match locked contract; no purge toast exists | wording deviates or purge toast exists | toast screenshots |

## Assets / Network / Vendors / Racks Checklist
Only execute items below that are source-verified in the artifacts. Mark any unavailable item `NOT_APPLICABLE_SOURCE_NOT_VERIFIED`.

| Area | Starting State | Step | Expected Result | Failure If | Evidence To Capture |
| --- | --- | --- | --- | --- | --- |
| Network restore active-selection guard | Network deleted-state restore control available and at least one active record is intentionally included, if environment permits | Attempt restore with any active record included | action is blocked or backend rejects because only deleted connections can be restored | active record restore succeeds silently | screenshot and network response |
| Network purge active-selection guard | Network purge control available and at least one active record is intentionally included, if environment permits | Attempt purge with any active record included | action is blocked or backend rejects because only deleted connections can be purged | active record purge succeeds silently | screenshot and network response |
| Vendor contract hard delete warning | vendor contract delete surface visible | Inspect destructive wording before execution | wording must make permanence explicit if product claims permanent delete clarity; otherwise mark `PARTIAL` with source note | delete is irreversible but wording is not explicit | screenshot of destructive UI copy |
| Rack reorder route behavior | Racks reorder affordance available | Move one rack and capture the request route | request targets the corrected rack reorder contract, not the stale site-scoped route | request targets the wrong route or reorder fails due to route mismatch | network request screenshot |
| legacy route/view drift | open canonical and legacy routes only where artifacts identify a duplicate route risk | Compare key operational actions and row-action geometry between the paired routes | any approved legacy/canonical pair should not claim parity if behavior drifts; record exact drift | duplicated routes present materially different operational behavior without an approved exception | paired screenshots and route names |

## Cross-View Zero-Divergence Checklist
Use this table only for Monitoring, External, and Services.

| Behavior | Monitoring Expected | External Expected | Services Expected | Failure If |
| --- | --- | --- | --- | --- |
| bulk no-op | exact locked no-op toast; no revert | exact locked no-op toast; no revert | exact locked no-op toast; no revert | any copy or revert behavior differs |
| actual update | exact changed toast; revert visible | exact changed toast; revert visible | exact changed toast; revert visible | copy, counts, or revert diverge |
| partial update | exact partial toast with `already matched`; revert visible | exact partial toast with `already matched`; revert visible | exact partial toast with `already matched`; revert visible | any view omits the partial clause |
| archive | exact archive toast; revert visible | exact archive toast; revert visible | exact archive toast; revert visible | any view uses different success copy |
| restore | exact restore toast; revert visible | exact restore toast; revert visible | exact restore toast; revert visible | any view uses different success copy |
| purge / no purge | purge works only where supported and safe | purge works only when safe; blocked with exact explanation when unsafe | purge is not exposed | unsupported or unsafe purge is visible or executable |
| revert / no revert | revert for reversible changes only | revert for reversible changes only | revert for reversible changes only | no-op or purge shows revert, or reversible change lacks revert |
| row action geometry | long title one-line; controls widen with panel | same | same | any row-action geometry diverges |
| toast wording | exact locked strings | exact locked strings plus exact blocked purge explanation | exact locked strings, no purge toast | wording diverges |
| disabled action explanation | only disabled actions with a known reason show a visible explanation | unsafe purge uses exact blocked reason | unsupported purge absent rather than ambiguous | disabled or absent actions are unexplained in a misleading way |

## Row Action Layout Checklist
Run these checks against Monitoring, External, and Services. Use legacy or near-standard routes only when explicitly auditing drift risk.

| Scenario | Starting State | Step | Expected Result | Failure If | Evidence To Capture |
| --- | --- | --- | --- | --- | --- |
| short title | short-title row visible | Open row action | panel uses baseline width; title stays one line | wrapping or layout break | screenshot |
| long title | very long-title row visible | Open row action on desktop viewport | panel widens and title stays one line | title wraps or controls stay narrow | screenshot |
| title exceeds viewport-safe max | very long-title row visible; viewport narrowed | Open row action | title remains one line with ellipsis; no horizontal overflow | wrap or overflow | screenshot |
| few buttons | row with minimal action set visible | Open row action | controls still fill resolved content width | tiny or misaligned controls | screenshot |
| many buttons | row with the largest action set visible | Open row action | every row container resolves to the same content width | one row remains narrower | screenshot |
| disabled buttons | row with a disabled action available | Open row action | disabled action matches peer width and differs only by disabled affordance | disabled width shrinks or expands | screenshot |
| destructive buttons | row with archive or purge action visible | Trigger confirm state if applicable | destructive confirm changes wording or emphasis but not width | confirm state changes geometry | screenshot |
| dropdown editors | open a row action or bulk flyout that includes dropdown editing controls | Open the dropdown editor | trigger, card, apply control, and visible option list align to the same content width | nested controls narrower than surrounding card width | screenshot |
| nested controls | panel with a card containing nested controls visible | Inspect nested layout after opening | nested control stack uses the same resolved content width as sibling controls | nested stack visibly narrower | screenshot |
| panel near viewport edge | row near left or right edge visible | Open row action near viewport edge | panel clamps inside viewport and keeps content width law intact | off-screen content or width collapse | screenshot |

Explicit law:

- When a long title expands the row-action window width, all buttons, cards, dropdowns, and nested controls inside that window must grow consistently to the same resolved content width.

## Evidence Capture Rules
For each failure, capture all of the following before closing the bug:

- view
- selected rows
- action clicked
- toast text
- network request if visible
- screenshot
- expected vs actual
- source or artifact reference if known

## Release / Close Gate
Use these exact close states:

- `PASS`
  - every required section was executed or explicitly marked `NOT_APPLICABLE_SOURCE_NOT_VERIFIED`
  - the checklist remained deterministic
  - Monitoring, External, and Services matched the locked contract
  - row-action width law passed
  - only this artifact changed
- `PARTIAL`
  - one or more source-verified sections were blocked by unavailable data or environment constraints
  - no observed failure contradicts the locked contract, but coverage is incomplete
- `FAIL`
  - any required step produced a contract violation
  - any step required guessing expected behavior
  - any toast wording differed from the locked contract
  - any unsafe destructive action lacked a precise explanation
  - any unsupported action was visible or executable
- `BLOCKED`
  - the run could not proceed because required records, route access, auth, or network inspection were unavailable
  - the blocker must identify the exact missing prerequisite

## Fail Conditions For This Artifact
This document itself fails acceptance if any of the following are true:

- it contains vague steps such as "check consistency"
- it omits exact expected behavior
- it omits failure conditions
- it omits evidence capture requirements
- it requires source guesses for Assets, Network, Vendors, or Racks beyond source-verified risks
- source code or package/config files were changed as part of this task
