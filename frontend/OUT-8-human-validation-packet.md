# OUT-8 Human Validation Packet

## Verdict
`PASS_PACKET_READY`

Use:
- `PASS_PACKET_READY`
- `PARTIAL_MISSING_DATA_REQUIREMENTS`
- `FAIL_TOO_VAGUE`

This packet is ready if run exactly as written. Mark any un-runnable item `BLOCKED_MISSING_DATA` with the missing row type from the table below.

## Required Test Data
| Data Type | Required In View | Purpose | How To Mark If Missing |
| --- | --- | --- | --- |
| short-title row | Monitoring, External, Services | Baseline row-action open/close and width check | `BLOCKED_MISSING_DATA: short-title row unavailable in [view]` |
| very long-title row | Monitoring, External, Services | Prove one-line title plus width expansion / truncation law | `BLOCKED_MISSING_DATA: very long-title row unavailable in [view]` |
| no-op update row | Monitoring, External, Services | Prove exact no-op toast and no revert | `BLOCKED_MISSING_DATA: no-op update row unavailable in [view]` |
| actual-update row | Monitoring, External, Services | Prove exact changed toast and working revert | `BLOCKED_MISSING_DATA: actual-update row unavailable in [view]` |
| partial multi-select set | Monitoring, External, Services | Prove exact partial-update toast with `already matched` | `BLOCKED_MISSING_DATA: partial multi-select set unavailable in [view]` |
| active row | Monitoring, External, Services | Archive flow and active-state row actions | `BLOCKED_MISSING_DATA: active row unavailable in [view]` |
| deleted row | Monitoring, External, Services | Restore flow and deleted-state row actions | `BLOCKED_MISSING_DATA: deleted row unavailable in [view]` |
| unsafe External deleted row with link or credential | External | Prove purge block before backend call | `BLOCKED_MISSING_DATA: unsafe External deleted row unavailable` |
| safe External deleted row if purge test is allowed | External | Prove allowed purge success path | `BLOCKED_MISSING_DATA: safe External deleted row unavailable` |
| Services deleted row to confirm purge absence | Services | Prove purge is not exposed anywhere in deleted Services UI | `BLOCKED_MISSING_DATA: Services deleted row unavailable` |

## Validation Steps
| Step ID | View | Starting State | Action | Expected Result | Failure If | Evidence To Capture |
| --- | --- | --- | --- | --- | --- | --- |
| M-RA-1 | Monitoring | Active short-title row visible | Open row action | Row-action panel opens; header/meta/title stay one line | Panel fails to open or title/meta wrap | Screenshot of open panel |
| M-RA-2 | Monitoring | Active very long-title row visible on wide viewport | Open row action | Title stays one line; panel widens as needed; every visible control inside the panel widens with the panel | Title wraps; any button/card/dropdown/control stays visibly narrower than peer width | Screenshot showing title and all controls |
| M-RA-3 | Monitoring | Same long-title row, narrow viewport | Reopen row action | Title remains one line and truncates with ellipsis instead of wrapping | Second line appears or horizontal overflow appears | Narrow viewport screenshot |
| E-RA-1 | External | Active short-title row visible | Open row action | Row-action panel opens; header/meta/title stay one line | Panel fails to open or title/meta wrap | Screenshot |
| E-RA-2 | External | Active or deleted very long-title row visible on wide viewport | Open row action | Title stays one line; panel widens as needed; every visible control inside the panel widens with the panel | Title wraps; any control width drifts | Screenshot |
| E-RA-3 | External | Same long-title row, narrow viewport | Reopen row action | Title remains one line and truncates with ellipsis | Wrap or overflow appears | Narrow viewport screenshot |
| S-RA-1 | Services | Active short-title row visible | Open row action | Row-action panel opens; header/meta/title stay one line | Panel fails to open or title/meta wrap | Screenshot |
| S-RA-2 | Services | Active or deleted very long-title row visible on wide viewport | Open row action | Title stays one line; panel widens as needed; every visible control inside the panel widens with the panel | Title wraps; any control width drifts | Screenshot |
| S-RA-3 | Services | Same long-title row, narrow viewport | Reopen row action | Title remains one line and truncates with ellipsis | Wrap or overflow appears | Narrow viewport screenshot |
| M-BULK-1 | Monitoring | Select only no-op row(s) | Bulk update one field to the already-matching value | No-op toast appears exactly; no Revert action appears | Toast text differs or Revert appears | Toast screenshot plus selected ids |
| M-BULK-2 | Monitoring | Select only actual-update row(s) | Bulk update one reversible field | Actual-update toast appears exactly; Revert appears | Toast text differs or Revert missing | Toast screenshot plus selected ids |
| M-BULK-3 | Monitoring | Select partial multi-select set | Bulk update one reversible field | Partial-update toast appears exactly; Revert appears | Toast text differs, counts wrong, or Revert missing | Toast screenshot plus selected ids |
| M-BULK-4 | Monitoring | Select active row(s) | Bulk archive | Archive toast appears exactly; Revert appears | Toast text differs or Revert missing | Toast screenshot |
| M-BULK-5 | Monitoring | Select deleted row(s) | Bulk restore | Restore toast appears exactly; Revert appears | Toast text differs or Revert missing | Toast screenshot |
| M-BULK-6 | Monitoring | Deleted row(s) available and purge UI visible in this route | Bulk purge | Purge toast appears exactly; if the backend cannot truthfully restore a purged row, mark `PARTIAL_BACKEND_BLOCKER_MONITORING_PURGE_REVERT` instead of claiming Revert works | Toast text differs, fake Revert appears, or blocker is hidden | Toast screenshot and backend-behavior note |
| M-BULK-7 | Monitoring | Immediately after M-BULK-2, 3, 4, or 5 | Click Revert | `Bulk operation reverted.` appears and affected row values/state return to prior values | Revert fails, wrong toast, or state does not return | Before/after screenshots and revert toast |
| E-BULK-1 | External | Select only no-op row(s) | Bulk update one field to the already-matching value | No-op toast appears exactly; no Revert action appears | Toast text differs or Revert appears | Toast screenshot plus selected ids |
| E-BULK-2 | External | Select only actual-update row(s) | Bulk update one reversible field | Actual-update toast appears exactly; Revert appears | Toast text differs or Revert missing | Toast screenshot |
| E-BULK-3 | External | Select partial multi-select set | Bulk update one reversible field | Partial-update toast appears exactly; Revert appears | Toast text differs, counts wrong, or Revert missing | Toast screenshot |
| E-BULK-4 | External | Select active row(s) | Bulk archive | Archive toast appears exactly; Revert appears | Toast text differs or Revert missing | Toast screenshot |
| E-BULK-5 | External | Select deleted row(s) that are restorable | Bulk restore | Restore toast appears exactly; Revert appears | Toast text differs or Revert missing | Toast screenshot |
| E-BULK-6 | External | Select unsafe deleted row(s) with link or credential; DevTools Network open | Attempt bulk purge | UI blocks purge before backend call; the disabled button remains labeled `Purge`; `Purge Selection` is invalid here; the exact blocked message appears as hover/focus tooltip/explanation; no purge request is sent | Purge request is sent, button label changes, destructive action remains enabled, or wording differs | Screenshot of disabled/block state and network capture |
| E-BULK-7 | External | Select safe deleted row(s), if available | Bulk purge | Purge toast appears exactly; Revert appears only when the source truthfully supports reversal | Toast text differs or unsupported revert behavior is exposed | Toast screenshot |
| E-BULK-8 | External | Immediately after E-BULK-2, 3, 4, or 5 | Click Revert | `Bulk operation reverted.` appears and affected row values/state return to prior values | Revert fails, wrong toast, or state does not return | Before/after screenshots and revert toast |
| S-BULK-1 | Services | Select only no-op row(s) | Bulk update one supported field to the already-matching value | No-op toast appears exactly; no Revert action appears | Toast text differs or Revert appears | Toast screenshot plus selected ids |
| S-BULK-2 | Services | Select only actual-update row(s) | Bulk update one supported reversible field | Actual-update toast appears exactly; Revert appears | Toast text differs or Revert missing | Toast screenshot |
| S-BULK-3 | Services | Select partial multi-select set | Bulk update one supported reversible field | Partial-update toast appears exactly; Revert appears | Toast text differs, counts wrong, or Revert missing | Toast screenshot |
| S-BULK-4 | Services | Select active row(s) | Bulk archive | Archive toast appears exactly; Revert appears | Toast text differs or Revert missing | Toast screenshot |
| S-BULK-5 | Services | Select deleted row(s) | Bulk restore | Restore toast appears exactly; Revert appears | Toast text differs or Revert missing | Toast screenshot |
| S-BULK-6 | Services | Deleted Services scope open | Inspect bulk menu and row action | Purge is absent everywhere; restore is the only deleted-state bulk action | Any purge action or purge wording appears | Screenshot of deleted bulk UI and deleted row action |
| S-BULK-7 | Services | Immediately after S-BULK-2, 3, 4, or 5; DevTools Network open | Click Revert | `Bulk operation reverted.` appears; previous values/state return; network uses per-row `PUT` restore of changed keys and does not send `restore_snapshots` to `/api/v1/logical-services/bulk-action` | Revert fails, wrong toast, state does not return, or network shows unsupported `restore_snapshots` bulk action | Before/after screenshots, revert toast, network capture |
| PANEL-1 | Monitoring, External, Services | Row action open | Click outside panel and trigger | Panel closes | Panel stays open | Before/after screenshots |
| PANEL-2 | Monitoring, External, Services | Row action open | Press Escape once | Panel closes | Panel stays open | Screenshot or short capture |
| PANEL-3 | Monitoring, External, Services | Display panel open | Click outside, then repeat with Escape | Display panel closes both ways | Panel stays open | Before/after screenshots |
| PANEL-4 | Monitoring, External, Services | Views panel open | Click outside, then repeat with Escape | Views panel closes both ways | Panel stays open | Before/after screenshots |
| PANEL-5 | Monitoring, External, Services | Bulk panel open | Click outside, then repeat with Escape | Bulk panel closes both ways | Panel stays open | Before/after screenshots |
| PANEL-6 | Monitoring, External, Services | One of Display/Views/Bulk/Row Action already open | Open one of the other toolbar panels | The newly opened panel closes the others; row action also closes when Views, Display, or Bulk opens | Multiple panels remain open together | Screenshot of transition |
| VIEW-1 | Monitoring | Views panel open with at least one custom saved view | Click delete on a custom view once, then confirm by clicking delete again | View is removed directly from the list | Delete does not require confirm, does not remove, or removes wrong view | Screenshot before and after delete |
| VIEW-2 | Monitoring | Custom saved view is active | Delete that active view | Active saved view is cleared; current view falls back to no active saved view; Views panel current-view label no longer shows deleted view name | Deleted active view remains active or stale name persists | Screenshot of current-view section after delete |
| VIEW-3 | Monitoring | Non-default layout available | Save a new view, apply a different view or system default, then re-apply saved view | Saved view re-applies the saved layout deterministically | Saved view does not restore its own layout | Before/after screenshots |
| VIEW-4 | Monitoring | Display panel closed | Toggle Display, change one display setting, then open Views | Views opens and Display closes; changed display setting stays applied for current workspace state | Panel overlap occurs or display change is lost immediately | Screenshot |
| VIEW-5 | External | Views panel open with at least one custom saved view | Delete a custom view with confirm | View is removed directly from the list | Delete does not require confirm, does not remove, or removes wrong view | Screenshot before and after delete |
| VIEW-6 | External | Custom saved view is active | Delete that active view | Active saved view is cleared; current view falls back to no active saved view; Views panel current-view label no longer shows deleted view name | Deleted active view remains active or stale name persists | Screenshot |
| VIEW-7 | External | Non-default layout available | Save/apply/re-apply a saved view | Saved view re-applies the saved layout deterministically | Saved view does not restore its own layout | Before/after screenshots |
| VIEW-8 | External | Display panel closed | Toggle Display, change one display setting, then open Views | Views opens and Display closes; changed display setting stays applied for current workspace state | Panel overlap occurs or display change is lost immediately | Screenshot |
| VIEW-9 | Services | Views panel open with at least one custom saved view | Click delete on a custom view once, then confirm by clicking delete again | View is removed directly from the list | Delete does not require confirm, does not remove, or removes wrong view | Screenshot before and after delete |
| VIEW-10 | Services | Custom saved view is active | Delete that active view | Active saved view is cleared; current view falls back to no active saved view; Views panel current-view label no longer shows deleted view name | Deleted active view remains active or stale name persists | Screenshot |
| VIEW-11 | Services | Non-default layout available | Save a new view, apply a different view or system default, then re-apply saved view | Saved view re-applies the saved layout deterministically | Saved view does not restore its own layout | Before/after screenshots |
| VIEW-12 | Services | Display panel closed | Toggle Display, change one display setting, then open Views | Views opens and Display closes; changed display setting stays applied for current workspace state | Panel overlap occurs or display change is lost immediately | Screenshot |
| TOAST-1 | Monitoring, External, Services | Complete no-op, actual update, partial update, archive, restore, purge, and revert flows | Compare each toast to the locked strings below | Exact locked wording matches; no-op has no Revert; reversible real changes do; purge shows Revert only when truthfully restorable; Services exposes no purge path | Any wording drift or revert-law drift appears | Toast gallery screenshots |
| TOAST-2 | External | Unsafe purge-block case executed | Compare blocked text to the locked string below | Exact blocked wording matches | Any wording drift | Screenshot of block message |
| NET-1 | Services | DevTools Network open; perform a reversible Services update, then Revert | Inspect `/api/v1/logical-services/bulk-action` and follow-up requests | No request to logical-services bulk-action contains `action: restore_snapshots`; revert uses per-row `PUT` calls only | Any `restore_snapshots` bulk request is sent | Network capture |
| NET-2 | External | DevTools Network open; unsafe deleted External row selected | Attempt purge | No purge request is sent because block happens before backend call | Any purge request is sent | Network capture |

## Exact Expected Wording
Include locked strings:
- `No changes made. Selected records already match the chosen value.`
- `Updated X of Y selected records: {Field Label} changed.`
- `Updated X of Y selected records: {Field Label} changed. N already matched.`
- `Archived X of Y selected records.`
- `Restored X of Y selected records.`
- `Permanently purged X of Y selected records.`
- `Bulk operation reverted.`
- `Bulk revert failed.`
- `Cannot purge selected external records because one or more are still linked or credentialed.`

Singular/plural rule:
Accept singular/plural only if produced by the shared `OperationalBulkContract` and identical across the locked trio. Reject per-view wording drift.

## Close Gate
OUT-8 can close only if:
- all required steps PASS or are explicitly `BLOCKED_MISSING_DATA`
- no observed failure contradicts locked trio behavior
- row-action title/control-width law passes
- no unsupported Services purge action appears
- External unsafe purge is blocked before backend call
- no-op has no revert
- reversible real changes have working revert
- supported purge has working revert only when truthfully restorable end-to-end
- if Monitoring purge cannot be truthfully restored, report `PARTIAL_BACKEND_BLOCKER_MONITORING_PURGE_REVERT`
- Services does not expose Purge now
- External unsafe Purge label remains `Purge` and never `Purge Selection`; the blocked reason stays in the tooltip/explanation
- evidence screenshots/network captures are collected

## Failure Routing
If failure is in:
- shared runtime/controller -> stay in `OUT-8`
- row-action floating geometry -> `OUT-8` or `OUT-11` depending scope
- bulk/table contract -> `OUT-10`
- External-only behavior -> `OUT-14`
- Services-only behavior -> `OUT-15`
- route canonicalization -> `OUT-23`
- test/build guardrail -> `OUT-22`

Proof commands:

```bash
rtk rg -n "No changes made|already matched|Permanently purged|Bulk operation reverted|Cannot purge selected external records|restore_snapshots|Unsupported bulk action" frontend/src/components frontend/src/components/shared
rtk rg -n "headerContentWidth|minWidth|maxWidth|truncate|whitespace-nowrap|DropdownEditor|ActionCard" frontend/src/components/shared frontend/src/components
rtk rg -n "setShowViewsMenu\\(!showViewsMenu\\)|setShowDisplayMenu\\(!showDisplayMenu\\)|togglePanel\\('views'\\)|togglePanel\\('display'\\)" frontend/src/components/MonitoringGrid.tsx
```
