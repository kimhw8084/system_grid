# RUN3-B Bulk Contract Testpack

## Verdict

`Monitoring`, `External`, and `Services` are close enough to use as the locked OUT-8 bulk-behavior baseline, but they are not yet a single permanent contract without explicit tests.

Current state:

- Shared success/no-op/revert toast formatting already exists in [frontend/src/components/shared/OperationalBulkContract.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalBulkContract.ts:3).
- `Monitoring` and `Services` use shared helpers around backend bulk endpoints.
- `External` uses the same shared toast helpers, but performs per-record fan-out and failure aggregation locally.
- Exact-copy drift already exists for single-record changed/archive/restore/purge messages because the shared helper singularizes `selected record` while this contract requires `selected records` for all counts.
- Action support diverges:
- `Monitoring` backend supports `purge`, but the visible bulk flyout currently exposes update-only controls and relies on row actions for archive/purge.
- `Services` backend explicitly rejects `purge`, and the UI correctly omits purge.
- `External` supports purge only when deleted entities have no links and no secrets, and the UI blocks unsafe purge before execution.

## Shared Bulk Contract

Locked message contract:

- No-op update: `No changes made. Selected records already match the chosen value.`
- Changed update: `Updated X of Y selected records: {Field Label} changed.`
- Partial update: `Updated X of Y selected records: {Field Label} changed. N already matched.`
- Archive: `Archived X of Y selected records.`
- Restore: `Restored X of Y selected records.`
- Purge: `Permanently purged X of Y selected records.`
- Revert success: `Bulk operation reverted.`
- Revert failure default: `Bulk revert failed.`
- Failed operation toast prefix: `Bulk operation failed: ...`

Shared helper evidence:

- [frontend/src/components/shared/OperationalBulkContract.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalBulkContract.ts:16) defines the no-op string.
- [frontend/src/components/shared/OperationalBulkContract.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalBulkContract.ts:81) builds changed and partial-update messages.
- [frontend/src/components/shared/OperationalBulkContract.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalBulkContract.ts:88) builds archive/restore/purge messages.
- [frontend/src/components/shared/OperationalBulkContract.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalBulkContract.ts:115) suppresses revert for `purge` and any `changedCount <= 0`.

Locked contract gap:

- [frontend/src/components/shared/OperationalBulkContract.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalBulkContract.ts:20) uses `selected record` for count `1`. If the required contract is exact, single changed/archive/restore/purge assertions will currently fail.

## Scenario Matrix

| Scenario | Selected state | Expected UI action state | Expected toast | Revert? | Backend requirement | Failure prevented | Candidate assertion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Single no-op update | 1 selected record already has target value | Apply button enabled once a value is chosen; action runs; selection remains valid | `No changes made. Selected records already match the chosen value.` | No | Backend or local bulk layer must return `changed=0`/`skipped=1` or equivalent semantic no-op | Prevent false-positive success and prevent revert affordance | Assert toast text exact; assert no revert button; assert mutation called once with selected id |
| Single actual update | 1 selected record differs from target value | Apply enabled; action runs; revert visible if reversible | `Updated 1 of 1 selected records: {Field Label} changed.` | Yes for update | Backend or local layer must report `changed=1` or the UI must compute semantic change count | Prevent silent update success without rollback | Assert exact toast copy, including field label; assert revert button exists; assert revert triggers undo path |
| Multi all changed | N selected, none match target value | Apply enabled | `Updated N of N selected records: {Field Label} changed.` | Yes for update | `changed=N`, `skipped=0` or equivalent | Prevent partial-count under-reporting | Assert exact copy; assert no `already matched`; assert revert shown |
| Multi partial changed | N selected, some already match target value | Apply enabled | `Updated X of Y selected records: {Field Label} changed. N already matched.` | Yes for update | Backend/local layer must expose changed vs skipped split | Prevent no-op rows from being counted as changed | Assert exact copy including `already matched`; assert revert shown |
| Multi all no-op | N selected, all already match target value | Apply enabled | `No changes made. Selected records already match the chosen value.` | No | Backend/local layer must preserve zero-changed outcome | Prevent meaningless revert and misleading success count | Assert exact no-op copy; assert no revert button |
| Archive | Active records selected | Archive action visible and confirm-gated; never shown on unsupported views/states | `Archived X of Y selected records.` | Yes only where restore is supported | Backend must support archive/soft delete for that view | Prevent archive on deleted rows or unsupported tabs | Assert exact toast; assert revert exists only when restore path exists |
| Restore | Deleted records selected | Restore visible only in deleted scope | `Restored X of Y selected records.` | Yes only where archive is supported | Backend must support restore for that view | Prevent restore on active rows | Assert exact toast; assert revert exists only when archive path exists |
| Purge | Deleted records selected and purge truly supported | Purge visible only in deleted scope and confirm-gated; hidden or disabled otherwise | `Permanently purged X of Y selected records.` | No | Backend must actually support purge and enforce safety preconditions | Prevent fake purge affordance on unsupported views | Assert exact toast; assert no revert button; assert action unavailable in `Services` |
| Failed operation | Any selected set with backend/local failure | Action can be attempted only where nominally supported | `Bulk operation failed: ...` | No | Backend returns non-2xx or local aggregator surfaces failed rows | Prevent mixed failure being reported as success | Assert error toast prefix exact; assert success toast absent; assert revert absent |
| Revert success | Prior reversible bulk success has pending undo | Revert control visible only on reversible success toast | `Bulk operation reverted.` | N/A | Undo endpoint/path must succeed | Prevent stale revert control after successful undo | Assert revert click issues undo requests and success toast exact |
| Revert failure | Prior reversible bulk success, undo path errors | Revert control visible | `Bulk revert failed.` or backend message override | N/A | Undo path returns error | Prevent silent rollback failure | Assert error toast exact; assert data remains in post-forward state |
| Unsafe action disabled/blocked | Deleted external entities include linked or credentialed rows | Purge button disabled and blocked message visible; row purge disabled too | No success toast; block message: `Cannot purge selected external records because one or more are still linked or credentialed.` | No | Backend purge preconditions mirrored in UI | Prevent accidental destructive action before request | Assert bulk purge button disabled; assert blocked message visible; assert row action disabled |
| Backend unsupported action prevention | View does not support an action, notably `Services` purge | Unsupported action must not be visible or executable from bulk UI | No success toast; if forced through API, backend returns `Unsupported bulk action` | No | Backend must reject unsupported action deterministically | Prevent UI drift from invoking nonexistent capability | Assert no purge action in `Services` bulk UI; API contract test asserts `400 Unsupported bulk action` |

## View-by-View Current Source Anchors

| View | Operation | Existing source location | Shared helper used? | Divergence risk | Test needed |
| --- | --- | --- | --- | --- | --- |
| Monitoring | Shared toast + revert contract | [frontend/src/components/MonitoringGrid.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/MonitoringGrid.tsx:1574) and [frontend/src/components/shared/OperationalBulkContract.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalBulkContract.ts:99) | Yes | Message exactness depends on shared helper; single-record pluralization drift | Unit tests for helper; UI tests for toast/revert wiring |
| Monitoring | Bulk update | [frontend/src/components/MonitoringGrid.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/MonitoringGrid.tsx:2066) | Yes | Uses backend `changed` when present, fallback semantic count otherwise | UI test for no-op/changed/partial update copy |
| Monitoring | Restore/archive/purge execution | [frontend/src/components/MonitoringGrid.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/MonitoringGrid.tsx:2143) and [backend/app/api/monitoring.py](/Users/haewonkim/home/development/sysgrid/backend/app/api/monitoring.py:742) | Yes | No visible selection-level archive/purge control in bulk flyout | UI test for row actions; contract test documenting missing selection-level bulk action |
| Services | Shared toast + revert contract | [frontend/src/components/ServicesReal.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/ServicesReal.tsx:1501) and [frontend/src/components/shared/OperationalBulkContract.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalBulkContract.ts:99) | Yes | Update payload filtered to safe keys; backend supports no purge | Unit tests for helper; UI tests for update/archive/restore |
| Services | Active bulk archive | [frontend/src/components/ServicesReal.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/ServicesReal.tsx:2082) | Yes | Archive available only on active tab; no purge in deleted tab | UI contract test for archive visibility and restore-only deleted scope |
| Services | Restore | [frontend/src/components/ServicesReal.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/ServicesReal.tsx:2009) | Yes | Deleted scope supports restore only | UI test for restore toast and revert |
| Services | Unsupported purge prevention | [frontend/src/components/ServicesReal.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/ServicesReal.tsx:2009) and [backend/app/api/logical_services.py](/Users/haewonkim/home/development/sysgrid/backend/app/api/logical_services.py:340) | Partially | UI omits purge, backend rejects it; must stay aligned permanently | Backend test already exists; add UI non-presence assertion |
| External | Shared toast + revert contract | [frontend/src/components/External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:2089) and [frontend/src/components/shared/OperationalBulkContract.ts](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalBulkContract.ts:99) | Yes | Local aggregator can fully represent partial changed/no-op, but differs from backend-bulk views | UI tests for mixed changed/skipped and revert |
| External | Safe purge gating | [frontend/src/components/External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:309), [frontend/src/components/External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:1569), [frontend/src/components/External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:2998), [frontend/src/components/External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:3108) | Yes | High-value safety rule; must stay blocked both in bulk and row actions | UI tests for disabled state, block text, and no request fired |
| External | Archive/restore/purge transport | [frontend/src/components/External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:2118) and [backend/app/api/intelligence.py](/Users/haewonkim/home/development/sysgrid/backend/app/api/intelligence.py:310) | Yes | No shared backend bulk endpoint; behavior depends on per-record fan-out | Integration test for multi partial failure aggregation |

## Required Unit Tests

- `frontend/src/components/shared/OperationalBulkContract.test.ts`
- Assert `showOperationalBulkResultToast` message text for:
- no-op update
- single actual update
- multi all changed
- multi partial changed
- archive
- restore
- purge
- Assert revert is omitted when `changedCount <= 0`.
- Assert revert is omitted for `purge` even when `changedCount > 0`.
- Assert `countSemanticBulkChanges` trims strings and compares normalized values.
- Assert `resolveBulkFieldLabel` returns explicit map labels first, then title-cased fallback.
- Add a red assertion for exact plural copy if the contract must remain `selected records` even for `1 of 1`.

- `frontend/src/components/MonitoringGrid.bulk-contract.test.tsx`
- Stub shared toast module and assert `showOperationalBulkResultToast` receives `action: 'archive'` for delete.
- Assert `changedCount` falls back from backend to semantic count correctly.
- Assert revert callback calls `/api/v1/monitoring/bulk-action` for archive/restore undo and per-item `PUT` for snapshot undo.

- `frontend/src/components/ServicesReal.bulk-contract.test.tsx`
- Assert outgoing `update` payload is restricted to `status`, `service_type`, `environment`.
- Assert deleted-tab bulk menu exposes restore only.
- Assert no purge action is rendered anywhere in the bulk flyout.

- `frontend/src/components/External.bulk-contract.test.tsx`
- Assert local aggregator returns `updated`, `skipped`, `failed` buckets as expected.
- Assert failed rows call `showOperationalBulkErrorToast` and suppress revert.
- Assert `canSafelyPurgeExternalEntity` returns false when links or secrets exist.

## Required Integration/UI Tests

- `Monitoring`: select one row, apply same status, expect exact no-op toast and no revert.
- `Monitoring`: select one row, change severity, expect exact changed toast and revert button.
- `Monitoring`: select multiple rows with mixed severity, expect exact partial-update toast with `already matched`.
- `Monitoring`: archive from row action on active tab, expect exact archive toast and revert.
- `Monitoring`: restore from deleted row action, expect exact restore toast and revert.
- `Monitoring`: purge from deleted row action, expect exact purge toast and no revert.
- `Monitoring`: verify bulk flyout lacks selection-level archive/purge control today; keep as explicit regression check until implementation changes.

- `Services`: select one row, apply same environment, expect exact no-op toast and no revert.
- `Services`: select multiple rows, change status, expect exact changed or partial-update toast depending on fixtures.
- `Services`: archive selected active rows, expect exact archive toast and revert.
- `Services`: restore selected deleted rows, expect exact restore toast and revert.
- `Services`: assert deleted-tab bulk menu has restore and does not show purge.
- `Services`: force a backend error and assert `Bulk operation failed:` prefix.

- `External`: select one row, apply same status, expect exact no-op toast and no revert.
- `External`: select multiple rows with mixed environments, expect exact partial-update toast and revert.
- `External`: archive selected active rows, expect exact archive toast and revert.
- `External`: restore selected deleted rows, expect exact restore toast and revert.
- `External`: purge selected deleted safe rows, expect exact purge toast and no revert.
- `External`: select deleted rows where at least one has links or secrets, expect disabled purge button, blocked message, and no network call.
- `External`: simulate one failing row during multi-update, expect `Bulk operation failed:` toast and no success toast.
- `External`: simulate undo failure after successful reversible bulk operation, expect `Bulk revert failed.` or backend override text.

## Backend Action Preconditions

Backend evidence copied exactly where used below.

`Monitoring` supports `delete`, `purge`, `restore`, and `update`, and rejects unknown actions:

```py
@router.post("/bulk-action")
async def bulk_action(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get("ids", [])
    action = data.get("action")
    payload = data.get("payload", {})
    if not ids: return {"status": "no_op"}
    ...
    if action == "delete":
        ...
    elif action == "purge":
        ...
    elif action == "restore":
        ...
    elif action == "update":
        ...
    else:
        raise HTTPException(status_code=400, detail="Unsupported bulk action")
```

Source: [backend/app/api/monitoring.py](/Users/haewonkim/home/development/sysgrid/backend/app/api/monitoring.py:732)

`Services` supports only `delete`, `restore`, and `update`, and explicitly rejects `purge`:

```py
if action == "delete":
    await db.execute(update(models.LogicalService).where(models.LogicalService.id.in_(ids)).values(is_deleted=True))
elif action == "restore":
    await db.execute(update(models.LogicalService).where(models.LogicalService.id.in_(ids)).values(is_deleted=False))
elif action == "update":
    ...
else:
    raise HTTPException(status_code=400, detail=f"Unsupported bulk action: {action}")
```

Source: [backend/app/api/logical_services.py](/Users/haewonkim/home/development/sysgrid/backend/app/api/logical_services.py:325)

`External` restore requires ownership and identity preconditions:

```py
if entity.ownership_mode == "team":
    if entity.internal_team_id is None:
        raise HTTPException(409, detail="Archived team-owned external entity cannot be restored without an accountable internal team")
    team = await db.scalar(select(models.Team).where(models.Team.id == entity.internal_team_id, models.Team.is_archived == False))
    if team is None:
        raise HTTPException(409, detail="Archived team-owned external entity cannot be restored because the accountable team is missing or archived")
elif entity.ownership_mode == "individual":
    if entity.internal_operator_id is None:
        raise HTTPException(409, detail="Archived individually owned external entity cannot be restored without an accountable operator")
    operator = await db.scalar(select(models.Operator.id).where(models.Operator.id == entity.internal_operator_id))
    if operator is None:
        raise HTTPException(409, detail="Archived individually owned external entity cannot be restored because the accountable operator is missing")
```

Source: [backend/app/api/intelligence.py](/Users/haewonkim/home/development/sysgrid/backend/app/api/intelligence.py:196)

`External` purge requires no active links and no registered credentials:

```py
if purge:
    # Check for links
    link_check = await db.execute(select(models.ExternalLink).filter(models.ExternalLink.external_entity_id == entity_id))
    if link_check.scalars().first():
        raise HTTPException(400, "Cannot purge entity with active connectivity links")
    secret_check = await db.execute(select(models.ExternalEntitySecret).filter(models.ExternalEntitySecret.external_entity_id == entity_id))
    if secret_check.scalars().first():
        raise HTTPException(400, "Cannot purge entity with registered credentials")
    await db.delete(obj)
```

Source: [backend/app/api/intelligence.py](/Users/haewonkim/home/development/sysgrid/backend/app/api/intelligence.py:368)

Existing backend test anchors:

- Monitoring no-op/unsupported/purge: [backend/test_monitoring_query_and_bulk_edges.py](/Users/haewonkim/home/development/sysgrid/backend/test_monitoring_query_and_bulk_edges.py:111)
- Services unsupported purge: [backend/test_service_workflows.py](/Users/haewonkim/home/development/sysgrid/backend/test_service_workflows.py:79)
- External restore conflict: [backend/test_external_workflows.py](/Users/haewonkim/home/development/sysgrid/backend/test_external_workflows.py:375)

## Unsafe Action Guards

- `External` already implements frontend purge safety in [frontend/src/components/External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:309): links or secrets make purge unsafe.
- Deleted-selection purge is blocked by [frontend/src/components/External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:1569) and enforced in the bulk button state at [frontend/src/components/External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:3003).
- Deleted row purge is also disabled per row at [frontend/src/components/External.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/External.tsx:3114).
- `Services` should keep purge absent, not merely disabled, because the backend does not support it.
- `Monitoring` should not expose selection-level destructive actions until they are deliberately standardized; today the row action path is the only visible destructive surface in the reviewed source.

## Regression Failure Signatures

- Exact-copy mismatch for single-record success toast because helper emits `selected record` instead of required `selected records`.
- No-op update incorrectly offering revert.
- Purge incorrectly offering revert.
- Partial update toast missing `N already matched.`
- `Services` showing purge in deleted scope despite backend `Unsupported bulk action`.
- `External` purge button enabled when any selected deleted record still has links or secrets.
- `Monitoring` selection-level archive/purge appears without matching locked behavior tests.
- Mixed `External` failures incorrectly surfacing a success toast instead of `Bulk operation failed: ...`.
- Revert success not invalidating queries and leaving stale rows visible.
- Revert failure swallowed without `Bulk revert failed.` toast.

## Recommended Implementation Order

1. Lock the shared helper contract first.
2. Add exact message unit tests for `OperationalBulkContract`, including the single-record pluralization decision.
3. Add `Services` unsupported-purge UI assertions, because that is the cleanest unsupported-action baseline.
4. Add `External` unsafe-purge and mixed-failure UI tests, because that is the highest-risk destructive path.
5. Add `Monitoring` row-action archive/restore/purge tests and an explicit assertion that the current bulk flyout does not expose selection-level destructive actions.
6. Add revert success and revert failure tests across one backend-bulk view (`Services` or `Monitoring`) and one local-aggregated view (`External`).

## Grep/Proof Commands Used

```bash
rg -n "OperationalBulkContract|showOperationalBulk|countSemanticBulkChanges|resolveBulkFieldLabel|bulkMutation|onRevert|purge|archive|restore|No changes made|already matched|Unsupported bulk action" src
rg -n "bulk-action|restore_snapshots|delete|restore|update|purge" .
```
