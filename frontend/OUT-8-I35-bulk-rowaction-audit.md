# OUT-8 Iteration 35 Bulk + Row Action Audit
## Verdict
AUDIT_ONLY

No source code was changed for this iteration. This report is source-derived from `frontend/src/components/MonitoringGrid.tsx`, `frontend/src/components/External.tsx`, `frontend/src/components/ServicesReal.tsx`, `frontend/src/components/shared/OperationalRowActionMenu.tsx`, `frontend/src/components/shared/OperationalRowActionGeometry.ts`, `backend/app/api/monitoring.py`, `backend/app/api/logical_services.py`, `backend/app/api/intelligence.py`, and `backend/test_service_workflows.py`.

## Zero-Divergence User Contract
Target contract that all three views must satisfy:

| Operation | No-op toast | Change toast | Partial-change toast | Revert rule | Revert action contract | Purge rule |
| --- | --- | --- | --- | --- | --- | --- |
| Update | `No semantic change` and no revert | `<Entity plural>: 1 changed | fields: <field label>` | `<Entity plural>: X changed | Y unchanged | fields: <field label>` | Show revert only when actual changed count > 0 | Revert must restore only the changed field values for the selected ids; frontend and backend action names must be valid | No revert |
| Archive | `No semantic change` and no revert | `Archived <entity plural>: X changed` | `Archived <entity plural>: X changed | Y unchanged` | Revert only when changed count > 0 | Revert must restore archived records via supported restore route/action | No purge semantics mixed into archive |
| Restore | `No semantic change` and no revert | `Restored <entity plural>: X changed` | `Restored <entity plural>: X changed | Y unchanged` | Revert only when changed count > 0 | Revert must re-archive restored records via supported archive route/action | No purge semantics mixed into restore |
| Purge | `No semantic change` or explicit unchanged summary and no revert | `Purged <entity plural>: X changed` | `Purged <entity plural>: X changed | Y unchanged` when backend can report skipped rows | Never show revert unless backend supports it and the action is truly reversible | Default contract is irreversible | Must never show a broken revert and must not call unsupported actions |

Additional contract:

1. Single selection + no actual change: clear no-op toast, no revert.
2. Single selection + actual change: change toast must name the changed field/column, revert visible, revert works.
3. Multi selection + no actual change: same no-op behavior, no revert.
4. Multi selection + partial/all actual change: toast must say changed count out of total selected and name changed field(s), revert visible, revert works.
5. Archive / Restore / Purge: must use one toast wording pattern across all three views.

## Bulk Current-State Matrix
Current-state matrix is based on source behavior, not runtime guesses.

| View | Operation | Selection/result state | Current toast | Revert shown? | Revert action | Backend supports? | Divergence? | Required fix |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Monitoring | Update | Single/multi no actual change | `result.summary` or `No semantic change` | No | None | Yes, `/api/v1/monitoring/bulk-action` | Minor: no count in no-op summary, but acceptable vs target | Keep no-op path; standardize wording across all views |
| Monitoring | Update | Single actual change | `Updated monitors: 1 changed | fields: ...` from backend summary | Yes | `showWorkspaceRevertToast` -> `runUndo` -> per-item `PUT /api/v1/monitoring/{id}` with full sanitized snapshot | Yes | Toast does not name the selected entity, but it does name fields and changed count | Use as closest baseline |
| Monitoring | Update | Multi all changed | `Updated monitors: X changed | fields: ...` | Yes | Same as above | Yes | Summary says changed count, not explicit `out of total selected`; skipped omitted when zero | Standardize wording to `X of Y changed` if required |
| Monitoring | Update | Multi partial changed | `Updated monitors: X changed | Y unchanged | fields: ...` | Yes | Same as above | Yes | Best current contract | Use as canonical shape |
| Monitoring | Update | Failure/error | `Operation failed: ...` | No | None | Yes | Error wording not aligned with External bulk error wording | Standardize error toast pattern |
| Monitoring | Archive (`action: delete`) | Single/multi no actual change | `No semantic change` | No | None | Yes | Uses archive UI label but delete action name internally | Keep UI label, standardize summary from backend |
| Monitoring | Archive (`action: delete`) | Single/multi actual change | `Archived monitors: X changed` and optionally `| Y unchanged` | Yes | bulk revert via `/api/v1/monitoring/bulk-action` with `action: restore` | Yes | Closest to target | Use as canonical archive contract |
| Monitoring | Restore | Single/multi no actual change | `No semantic change` | No | None | Yes | Good | Keep |
| Monitoring | Restore | Single/multi actual change | `Restored monitors: X changed` and optionally `| Y unchanged` | Yes | bulk revert via `/api/v1/monitoring/bulk-action` with `action: delete` | Yes | Closest to target | Use as canonical restore contract |
| Monitoring | Purge | Single/multi unchanged | `Purge did not change any records` | No | None | Yes | Wording differs from Services (`services`) and External (`Bulk purge completed...`) | Standardize purge no-op toast |
| Monitoring | Purge | Single/multi actual/partial change | `Purged monitors: X changed` and optionally `| Y unchanged` | No | None | Yes | Best current irreversible contract | Use as canonical purge pattern |
| External | Update | Single/multi no actual change | `Bulk update completed: X skipped.` or only skipped count | No | None | Frontend loops per entity `PUT /api/v1/intelligence/entities/{id}` | Diverges: does not use `No semantic change`; does not name changed field | Move to shared summary contract |
| External | Update | Single actual change | `Bulk update completed: 1 updated.` | Yes | `showWorkspaceRevertToast` -> per-item `PUT /api/v1/intelligence/entities/{id}` with reconstructed restore payload | Yes, per-item route | Diverges: does not name changed field; wording differs | Add field label summary and standardized toast |
| External | Update | Multi all changed | `Bulk update completed: X updated.` | Yes | Same as above | Yes | Diverges: no `out of total`, no field labels | Add changed/skipped field summary |
| External | Update | Multi partial changed | `Bulk update completed: X updated. Y skipped.` | Yes | Same as above | Yes | Diverges: wording differs; no field labels; counts are client-derived only | Standardize summary and label mapping |
| External | Update | Failure/error | `Bulk update completed: ... Errors: ...` or `Bulk operation failed: ...` | No on failure branch | None | Partial per-row support only | Diverges: mixes partial success and hard failure wording | Standardize failure format |
| External | Archive (`action: delete`) | Single/multi no actual change | Not represented as semantic no-op; delete path always treats successful DELETE as `updated` | Yes if any request succeeded | revert via bulk mutate `action: restore` | Yes, per-item `DELETE /entities/{id}` and `POST /entities/{id}/restore` | Diverges: no semantic no-op detection for archived rows before request | Add pre/post state detection or backend count summary |
| External | Archive (`action: delete`) | Single/multi actual change | `Bulk delete completed: X updated.` | Yes | `action: restore` loop | Yes | Diverges: says `updated`, not `archived`; no unchanged count unless skipped locally | Standardize operation-specific wording |
| External | Restore | Single/multi no actual change | No semantic no-op path; success/failure depends on backend response | Yes if any request succeeded | revert via bulk mutate `action: delete` | Yes, per-item `POST /entities/{id}/restore` | Diverges: no no-op summary contract | Add no-op detection and summary |
| External | Restore | Single/multi actual change | `Bulk restore completed: X updated.` | Yes | `action: delete` loop | Yes | Diverges: says `updated`, not `restored` | Standardize restore summary wording |
| External | Purge | Single/multi actual change | `Bulk purge completed: X updated.` success toast | No | None | Yes, per-item `DELETE /entities/{id}?purge=true` | Diverges: says `updated`, not `purged`; no unchanged count | Standardize purge wording |
| External | Purge | Single/multi blocked by backend | `Bulk purge completed: X failed. Errors: ...` | No | None | Conditional; backend rejects linked/credentialed entities | Wording inconsistent but safe because no revert shown | Standardize failure wording |
| Services | Update | Single/multi no actual change | `result.summary` or `No semantic change` | No | None | Backend route exists, but returns only `{"status":"success"}` | Diverges: no field labels; no backend changed/skipped summary | Add backend summary/count support or unify on frontend-only contract |
| Services | Update | Single actual change | Fallback `Updated service records` | Yes | `showWorkspaceToast(..., { onRevert })` -> `runUndo` -> `/api/v1/logical-services/bulk-action` with `action: restore_snapshots` | No | Broken: revert action name unsupported by backend; toast does not name changed field | Replace revert path with supported update restore contract and add field label summary |
| Services | Update | Multi all changed | Fallback `Updated service records` | Yes | Same broken `restore_snapshots` call | No | Diverges: no `X changed`, no `Y unchanged`, no field label | Add count/summary contract and supported revert |
| Services | Update | Multi partial changed | Fallback `Updated service records` even when semantic diff computed locally | Yes | Same broken `restore_snapshots` call | No | Broken: count is computed but never surfaced in toast; revert unsupported | Surface count in toast and replace revert contract |
| Services | Update | Failure/error | `Operation failed: ...` or `Undo failed` | No on initial failure | None | Partial; update route exists but undo action unsupported | Diverges: undo can fail after success due to unsupported action | Remove unsupported revert call path |
| Services | Archive (`action: delete`) | Single/multi no actual change | `result.summary` or `No semantic change` | No | None | Backend supports `delete` | Diverges: backend returns no summary today, so fallback likely `No semantic change` even after real change if `changed` missing | Add backend changed/skipped summary |
| Services | Archive (`action: delete`) | Single/multi actual change | Fallback `Updated service records` | Yes | bulk revert via `/bulk-action` with `action: restore` | Yes | Diverges: says `Updated service records`, not `Archived services` | Standardize archive wording |
| Services | Restore | Single/multi no actual change | `result.summary` or `No semantic change` | No | None | Backend supports `restore` | Same missing summary problem as archive | Add backend changed/skipped summary |
| Services | Restore | Single/multi actual change | Fallback `Updated service records` | Yes | bulk revert via `/bulk-action` with `action: delete` | Yes | Diverges: says `Updated service records`, not `Restored services` | Standardize restore wording |
| Services | Purge | Any | `Operation failed: {"detail":"Unsupported bulk action: purge"}` if backend returns 400 | No | None | No, backend rejects `purge` | Hard divergence: UI exposes purge but backend does not support it | Either remove Services purge UI or implement backend support before exposing |

## Backend/Revert Action Support Matrix
### Which frontend view sends `restore_snapshots`?

| View | Sends `restore_snapshots` to backend? | Source |
| --- | --- | --- |
| Monitoring | No | `MonitoringGrid.tsx` undo updates each snapshot with `PUT /api/v1/monitoring/{id}` |
| External | No | `External.tsx` undo updates each snapshot with `PUT /api/v1/intelligence/entities/{id}` |
| Services | Yes | `ServicesReal.tsx` `runUndo()` posts `{ action: 'restore_snapshots', payload: undo.snapshots }` to `/api/v1/logical-services/bulk-action` |

### Which backend/API handler receives it, and which handler rejects it?

| View | Frontend route/action | Backend handler | Backend-supported action names | Rejects `restore_snapshots`? | Proof |
| --- | --- | --- | --- | --- | --- |
| Monitoring | `POST /api/v1/monitoring/bulk-action` for bulk archive/restore/purge/update | `backend/app/api/monitoring.py:733 bulk_action` | `delete`, `purge`, `restore`, `update` | Yes if ever sent, via generic `Unsupported bulk action` branch | `monitoring.py` bulk handler |
| Monitoring undo update | `PUT /api/v1/monitoring/{id}` | per-item update route, not bulk | N/A | Not applicable | `MonitoringGrid.tsx runUndo` |
| External | No bulk route; loops `PUT /entities/{id}`, `DELETE /entities/{id}`, `DELETE /entities/{id}?purge=true`, `POST /entities/{id}/restore` | `backend/app/api/intelligence.py` per-item routes | `PUT update`, `DELETE archive`, `DELETE purge=true`, `POST restore` | No `restore_snapshots` route exists in source | `rg -n "bulk-action" backend/app/api/intelligence.py` returned no bulk route |
| Services | `POST /api/v1/logical-services/bulk-action` | `backend/app/api/logical_services.py:315 bulk_action` | `delete`, `restore`, `update` only | Yes. Unsupported branch raises `HTTPException(... detail=f"Unsupported bulk action: {action}")` | `logical_services.py` and `backend/test_service_workflows.py` |

### Shared revert action contract that should exist

| Operation | Required shared revert behavior | Monitoring current state | External current state | Services current state |
| --- | --- | --- | --- | --- |
| Update | Revert must restore previous values for only the mutated fields or previous full snapshot via a supported endpoint | Supported by per-item PUT snapshot replay | Supported by per-item PUT restore payload replay | Broken because `restore_snapshots` bulk action is unsupported |
| Archive | Revert must restore archived records | Supported via bulk `restore` | Supported via per-item `restore` loop | Supported via bulk `restore` |
| Restore | Revert must re-archive restored records | Supported via bulk `delete` | Supported via per-item `delete` loop | Supported via bulk `delete` |
| Purge | No revert unless backend explicitly supports it | No revert shown | No revert shown | No revert shown, but action itself is unsupported |

## Toast Wording Matrix
| View | Update success wording | No-op wording | Archive success wording | Restore success wording | Purge success wording | Error wording | Field label support |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Monitoring | Backend summary, e.g. `Updated monitors: X changed | Y unchanged | fields: ...` | `No semantic change` | Backend summary `Archived monitors: ...` | Backend summary `Restored monitors: ...` | Backend summary `Purged monitors: ...` or frontend no-op `Purge did not change any records` | `Operation failed: ...`, `Undo failed`, `Reverted monitoring operation` | Yes, backend labels changed fields |
| External | `Bulk update completed: X updated. Y skipped.` | Same pattern with skipped only, not `No semantic change` | `Bulk delete completed: X updated.` | `Bulk restore completed: X updated.` | `Bulk purge completed: X updated.` | `Bulk operation failed: ...` or `... Errors: ...` | No |
| Services | Fallback `Updated service records` when backend omits summary | `No semantic change` | Fallback `Updated service records` | Fallback `Updated service records` | No success path if backend rejects purge | `Operation failed: ...`, `Undo failed`, `Reverted service operation` | No |

## Changed Count / No-op Detection Matrix
| View | How selected ids are collected | How changed count is computed | How no-op is detected | How partial change is detected | Divergence |
| --- | --- | --- | --- | --- | --- |
| Monitoring | Group-aware selection aggregation using `groupSelectionsRef` and `setSelectedIds(allSelected)` | `Number(result?.changed ?? idsToUse.length)` in frontend; backend computes `changed` and `skipped` accurately | `changedCount <= 0` -> `No semantic change` | Backend `skipped` count drives summary; frontend fallback to `idsToUse.length` would overstate change if backend omitted `changed` | Frontend fallback still risks false positives if backend ever omits `changed` |
| External | Raw selected nodes only via `getSelectedNodes()` | Client counts `updated`, `skipped`, `failed` from per-id requests | `updated === 0` and no failures yields skipped-only summary, not `No semantic change` | Client skipped count shown as `Y skipped` | No field label summary; no canonical no-op message |
| Services | Group-aware selection aggregation using `groupSelectionsRef` and `setSelectedIds(allSelected)` | `Number(result.changed)` if finite, else `countSemanticChanges(previousSnapshots, payload)` for update, else `0` | `changedCount <= 0` -> `No semantic change` | Semantic diff can detect partial change for update, but toast does not surface `changedCount` | Better no-op detection than before, but still no visible changed/skipped summary and broken update revert |

## Row Action Title Width Audit
### Shared template used by all three views

All three views render `OperationalRowActionMenu` from `frontend/src/components/shared/OperationalRowActionMenu.tsx`. None of the three owns a separate row-action header template.

### Current width sizing law

Current width is derived in `frontend/src/components/shared/OperationalRowActionGeometry.ts` from action button label widths only:

- `estimateRowActionButtonWidth()` uses button text length.
- `computeRowActionGeometry()` computes `actionSetWidth` from section row button widths.
- `panelWidth` is `actionSetWidth + panel padding`, clamped to viewport-safe width.
- Header `meta` and `title` text are not measured and do not participate in width expansion.

### Header/title row markup

`OperationalRowActionMenu` header markup:

- `Row actions` label
- `meta` line: `<p className="pt-1 text-[11px] font-semibold text-slate-100">{meta}</p>`
- `title` line: `<p className="pt-1 text-[12px] text-slate-300">{title}</p>`

Header container classes:

- outer header: `flex items-center justify-between ...`
- text wrapper: `div className="min-w-0"`

There is no `whitespace-nowrap`, `truncate`, `overflow-hidden`, or `text-ellipsis` class on either the `meta` or `title` line.

### Per-view title/meta inputs

| View | `meta` passed to row action menu | `title` passed to row action menu | Selected entity title location |
| --- | --- | --- | --- |
| Monitoring | `ID {id} · {device_name or fallback}` | `item.title` | Entity title is on `title` line |
| External | `ID {id} · {entity name}` for entities, entity name for links | entity type for entities, `Link · {protocol} Port {port}` for links | Selected entity name is on `meta` line, not the `title` line |
| Services | `ID {id} · {item.name}` | `item.type || 'Service'` | Selected entity name is on `meta` line, not the `title` line |

### Can the title wrap today?

Yes.

Reasons:

- Header text lines have no no-wrap class.
- `min-w-0` on the text wrapper allows shrinkage.
- Width is not based on `meta`/`title` length.

### Can the title ellipsis today?

No reliable ellipsis path exists.

Reasons:

- No `truncate`, `overflow-hidden`, or `text-ellipsis`.
- Header text will wrap rather than force one-line ellipsis.

### Can the window width expand based on title length today?

No.

Reasons:

- Geometry width calculation ignores header text length entirely.
- Width can only expand based on action button widths.

### Divergence across Monitoring / External / Services

Shared component means the wrapping bug is structurally shared, but the user-facing impact diverges:

| View | Divergence |
| --- | --- |
| Monitoring | Title line contains the selected entity title, so wrapping is directly visible on the line the user expects to stay single-line |
| External | Selected entity name is on `meta`, while `title` is generic type/link text; this already diverges from Monitoring and Services semantics |
| Services | Selected entity name is on `meta`, while `title` is generic type; same semantic mismatch as External |

### Exact required implementation plan for zero divergence

1. Use one shared header contract in `OperationalRowActionMenu` where the selected entity title is always the primary single-line header field across all three views.
2. Make header width computation consider the rendered width of `meta`/title text, not only button widths.
3. Apply a one-line no-wrap + ellipsis class to the selected entity title/header row.
4. Allow panel width to expand up to a viewport-safe max width when title text is longer than button-driven width.
5. Clamp at viewport-safe max width and ellipsize instead of wrapping.
6. Standardize which prop carries the selected entity title so Monitoring, External, and Services all place the entity title in the same line and same style.

## Root Causes of Divergence
1. Monitoring owns a real backend bulk contract with `changed`, `skipped`, and field labels. External and Services do not.
2. External bulk is client-orchestrated over per-item routes, so its summaries are generic client strings, not backend semantic summaries.
3. Services backend bulk route returns only `{"status":"success"}` and does not support `purge` or `restore_snapshots`.
4. Services frontend update undo assumes a backend bulk action name that does not exist: `restore_snapshots`.
5. Monitoring and Services aggregate grouped selections; External uses raw selected nodes only.
6. Monitoring uses `showWorkspaceRevertToast`; Services uses `showWorkspaceToast(... onRevert ...)`; External uses `showWorkspaceRevertToast`. The UI surface is similar, but invocation patterns diverge.
7. Row action header sizing is shared, but entity-title placement diverges because Monitoring passes the entity title as `title`, while External and Services put the entity name in `meta` and use a generic `title`.

## Required Shared Contract
Minimum shared contract needed before any implementation:

1. One operation vocabulary across all views:
   `update`, `archive`, `restore`, `purge`, `revert`.
   Frontend may still send `delete` internally for archive if backend requires it, but the summary contract must use `archive`.
2. One summary shape across all views:
   `{ changed: number, unchanged: number, failed: number, changed_fields: string[], summary: string }`
3. One revert rule:
   show revert only when `changed > 0` and the revert route/action is supported.
4. One update revert contract:
   no view may send unsupported `restore_snapshots` to a backend bulk route.
   Either all views use supported per-item restore PUTs for update undo, or all backends implement one supported bulk restore-snapshots contract.
5. One row action header contract:
   selected entity title must be the primary single-line, no-wrap, ellipsized header text in all three views.

## Minimal Implementation Plan
1. Define the shared target summary schema and wording first, using Monitoring as the base shape.
2. Fix Services backend/frontend contract mismatch before any more UI adjustments:
   either implement supported update undo in `backend/app/api/logical_services.py`, or stop sending `restore_snapshots` and use supported per-item restore logic.
3. Decide whether External remains client-orchestrated or gains a real bulk backend route. Until that is decided, it cannot be fully zero-divergent with Monitoring.
4. Standardize archive/restore/purge/update summary wording in all three views.
5. Standardize changed-field label mapping for External and Services.
6. Standardize row action header semantics and shared width law in the shared row-action component and geometry helper.

## Files That Must Change Next
These are the minimum files implicated by the current source contract:

- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/External.tsx`
- `frontend/src/components/ServicesReal.tsx`
- `frontend/src/components/shared/OperationalRowActionMenu.tsx`
- `frontend/src/components/shared/OperationalRowActionGeometry.ts`
- `backend/app/api/logical_services.py`

Conditional next-step files:

- `backend/app/api/intelligence.py` if External moves to a real bulk backend contract instead of client loops
- `backend/app/api/monitoring.py` only if Monitoring is adjusted to match the final shared wording schema exactly

## Files That Must Not Change Next
- Package files
- Lockfiles
- Config files
- Zip scripts
- CSS files unless row action width law is intentionally implemented there as part of the shared row-action fix
- Unrelated operational views outside Monitoring / External / Services

## Grep/Proof Commands Used
```bash
rtk proxy git status --short --branch
rtk rg -n "bulk|Bulk|archive|restore|purge|restore_snapshots|changed|No semantic|showWorkspaceToast|showWorkspaceRevertToast|onRevert|runUndo|lastUndoRef|mutationFn|onSuccess" frontend/src
rtk rg -n "Unsupported bulk action|restore_snapshots|archive|restore|purge|bulk" .
rtk rg -n "rowAction|row-action|RowAction|action menu|ActionMenu|title|header|nowrap|white-space|ellipsis|width|maxWidth|minWidth" frontend/src
rtk rg -n "const runUndo|lastUndoRef|bulkMutation|mutationFn|onSuccess|restore_snapshots|showWorkspaceToast|onRevert|bulk-action|activeTab === 'deleted'|rowActionMenu|OperationalRowActionMenu" frontend/src/components/MonitoringGrid.tsx
rtk rg -n "const runUndo|lastUndoRef|bulkMutation|mutationFn|onSuccess|restore_snapshots|showWorkspaceToast|onRevert|bulk-action|activeTab === 'deleted'|rowActionMenu|OperationalRowActionMenu" frontend/src/components/External.tsx
rtk rg -n "const runUndo|lastUndoRef|bulkMutation|mutationFn|onSuccess|restore_snapshots|showWorkspaceToast|onRevert|bulk-action|activeTab === 'deleted'|rowActionMenu|OperationalRowActionMenu" frontend/src/components/ServicesReal.tsx
rtk rg -n "@router.post\\(\"/bulk-action\"\\)|Unsupported bulk action|restore_snapshots|summary|changed|skipped|action ==|action in|elif action" backend/app/api/monitoring.py backend/app/api/logical_services.py backend/app/api/intelligence.py
rtk rg -n "@router.put\\(\"/entities/\\{entity_id\\}\"\\)|async def update_entity|@router.post\\(\"/entities/\\{entity_id\\}/restore\\\"\\)|@router.delete\\(\"/entities/\\{entity_id\\}\\\"\\)" backend/app/api/intelligence.py
rtk rg -n "restore_snapshots" frontend/src backend/app backend/test*
rtk rg -n "bulk-action" backend/app/api/intelligence.py frontend/src/components/External.tsx
rtk proxy git diff --name-only
```

## Source-Proven Findings That Matter Most
1. Monitoring is the only audited view with a true backend semantic bulk summary contract.
2. External has no backend bulk route in `backend/app/api/intelligence.py`; bulk behavior is synthesized client-side by looping per-entity routes.
3. Services frontend sends `restore_snapshots` to `/api/v1/logical-services/bulk-action`, but `backend/app/api/logical_services.py` supports only `delete`, `restore`, and `update`, and raises `Unsupported bulk action: {action}` otherwise.
4. Services frontend exposes purge UI, but `backend/app/api/logical_services.py` has no `purge` branch and `backend/test_service_workflows.py` asserts purge is rejected.
5. The shared row action menu does not enforce no-wrap or ellipsis on the selected entity header/title and does not size width from title length, so the no-wrap width law is currently unmet across all three views.
