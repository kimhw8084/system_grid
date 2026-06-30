# OUT-8 Parallel B Runtime Evidence Capture Packet

This packet is validation prep only. It does not fix code and it cannot close OUT-8.

## 1. Test environment assumptions

- Frontend URL: use the running SysGrid frontend URL provided by the active validator session. If not otherwise specified, capture the exact URL shown in the browser address bar before starting.
- Backend URL: if visible from DevTools Network requests, record the origin serving `/api/v1/monitoring/*`. Do not guess if the frontend proxies requests.
- Browser tooling: DevTools Network tab should be available. Preserve log before starting so purge, Revert, and post-Revert refetch requests remain visible.
- User/account assumptions: use the current test account already authenticated into SysGrid. Do not invent credentials or switch tenants unless the validator already has an approved test account and tenant.
- Safe Monitoring row/entity criteria:
  - Use a Monitoring row that is clearly disposable test data, not production-like data.
  - Prefer a row with a distinct test title or known seeded monitor.
  - Prefer a row that can be uniquely found again after refresh by `ID`, `Title`, and `Target Asset`.
  - Record whether the row starts in `Existing` scope and moves to `Archived` scope before purge.
- UI labels expected from the current source:
  - Registry scope switch: `Existing` and `Archived`
  - Toolbar controls: `Views`, `Display`, `Bulk Actions`
  - Undo affordance in the toast: first `Revert`, then `Confirm Undo?`

## 2. Monitoring purge Revert validation

### Exact runtime expectation from source

- Purge request path is expected to be `POST /api/v1/monitoring/bulk-action`.
- Purge request body is expected to include `action: "purge"` and the selected `ids`.
- Revert request path is expected to be `POST /api/v1/monitoring/bulk-action`.
- Revert request body is expected to include `action: "restore_purged"`, the purged `ids`, and `payload.snapshots`.
- A successful purge toast is expected to use the shared operational copy pattern: `Permanently purged X of Y selected records.`
- If Revert is supported truthfully in the running app, the toast should expose `Revert`, then require the second click state `Confirm Undo?`.

### Validator steps

1. Open the Monitoring view.
2. Confirm the page header is `Monitoring`.
3. Identify or create one safe test Monitoring row/entity.
4. Record all visible identifier fields before purge:
   - `ID`
   - `Title`
   - `Target Asset`
   - any other visible unique fields used to re-find the row
5. Capture a pre-purge screenshot showing the row in `Existing` scope if possible.
6. Move the row into `Archived` scope if it is not already there:
   - use row action or bulk action as needed
   - capture the archive request if this prep step is needed
7. Switch the registry scope to `Archived`.
8. Re-find the same row and verify the identifier fields still match the pre-purge record.
9. Select the row/entity.
10. Open `Bulk Actions` or use the row purge action from the deleted-state surface.
11. Execute purge.
12. Capture the purge request in DevTools Network if possible:
   - endpoint
   - method
   - request body
   - action
   - ids
   - status
   - response body
13. Confirm the success toast appears.
14. Confirm whether `Revert` is offered on that toast.
15. Click `Revert`.
16. If the toast changes to `Confirm Undo?`, click again to execute the undo.
17. Capture the Revert request:
   - endpoint
   - method
   - request body
   - action
   - ids
   - status
   - response body
18. Confirm the row reappears in the running app.
19. Confirm the row can still be found by the same identifiers captured before purge.
20. Force refresh or trigger a clear refetch, then confirm the row remains restored:
   - browser refresh is acceptable
   - switching away and back to Monitoring is acceptable
21. Capture the refetch request after Revert if visible.
22. If restoration fails, capture:
   - toast text
   - Network request/response details
   - screenshot of the missing row after refresh
   - any visible error such as `Unsupported bulk action`

## 3. PASS/PARTIAL/FAIL/WORSE runtime rules

- PASS:
  - Revert is offered only when the running app truthfully supports it.
  - Revert issues the expected runtime request.
  - The purged row restores in the running app.
  - The row is still present after a forced refresh or explicit refetch.
- PARTIAL:
  - source-aligned request shape or network evidence looks correct,
  - but row restoration is not fully proven in the running app after refetch.
- FAIL:
  - Revert errors,
  - or the row does not restore,
  - or backend-truth network evidence is missing,
  - or the row appears briefly but is not durable after refresh/refetch.
- WORSE:
  - a new regression appears outside Revert,
  - or the UI shows misleading success without truthful restoration,
  - or data-loss behavior is worse than before,
  - or unrelated Monitoring lifecycle behavior regresses during validation.

## 4. Network capture checklist

- Capture the purge request endpoint, method, and full request body.
- Capture the purge response status and response body.
- Capture the Revert request endpoint, method, and full request body.
- Capture the Revert response status and response body.
- Confirm whether the Revert request action is `restore_purged`.
- Capture any post-Revert refetch request that reloads Monitoring data.
- Capture row presence before purge, after purge, after Revert, and after refresh/refetch.
- Preserve timestamps or request ordering if DevTools provides them.

## 5. Preservation spot checks

- Monitoring non-Revert behavior still works:
  - open Monitoring and confirm the grid loads without obvious lifecycle breakage
  - confirm one normal non-purge interaction still works, such as search or row selection
- Selected-records wording remains stable:
  - success copy should continue using `selected records`
  - the no-op copy should remain `No changes made. Selected records already match the chosen value.`
- No-op toast behavior remains stable:
  - if a no-op bulk update is easy to reproduce safely, confirm no Revert appears
- `Display` still opens and switches:
  - open `Display`
  - change one presentation control
  - close and reopen to confirm the control still behaves consistently
- `Views` and saved-view behavior are not obviously broken:
  - open `Views`
  - apply an existing saved view if one exists, or confirm the panel opens and lists current view state
- External unsafe Purge reason is visible on hover/focus if still part of browser validation:
  - expected blocked text: `Cannot purge selected external records because one or more are still linked or credentialed.`
- Services purge remains unexposed/backend-blocked:
  - no truthful Services purge path should be validated as supported
  - if inspected manually, the blocked reason should remain `Purge is unavailable because logical-services backend does not support truthful purge/revert yet.`

## 6. Evidence capture format

| Step | Expected | Actual | Evidence file/link | PASS/PARTIAL/FAIL |
|---|---|---|---|---|
| Open Monitoring | Monitoring view loads and target row can be identified |  |  |  |
| Record pre-purge identifiers | `ID`, `Title`, `Target Asset`, scope recorded |  |  |  |
| Purge request | `POST /api/v1/monitoring/bulk-action` with `action: "purge"` |  |  |  |
| Purge toast | Success toast appears and Revert availability is recorded |  |  |  |
| Revert request | `POST /api/v1/monitoring/bulk-action` with `action: "restore_purged"` |  |  |  |
| Row restore | Same row reappears in running app |  |  |  |
| Refresh/refetch durability | Row remains after refresh/refetch |  |  |  |
| Preservation checks | Display, Views, no-op wording, Services/External guardrails unchanged |  |  |  |

## 7. Final note

This packet is validation prep only. It cannot close OUT-8 without Iteration 38 zip review and recorded lesson.
