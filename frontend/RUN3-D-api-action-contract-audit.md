# RUN3-D API Action Contract Audit

## Verdict
`PARTIAL_SOURCE_VERIFIED`

The D2 draft overclaimed several risks. The severe claims below are now split by workspace and downgraded unless both frontend and backend evidence are present.

## What Changed From D2
- Removed the blanket "purge is missing" framing. Multiple workspaces do support purge, but not uniformly.
- Split stale-overwrite risk by workspace instead of treating every undo loop as full-snapshot restore.
- Softened the SQLite conclusion: WAL and `busy_timeout` mitigate basic lock contention, but stress tests are still required before claiming production-ready concurrency reliability.
- Downgraded asset cascade and hard-delete dependency claims to `NEEDS_VERIFICATION`.
- Downgraded vendor contract UX severity: backend hard-delete is proven, permanent-destructive UI wording is not.
- Rejected any database ID recycling language. No exact source proof was found.

## Evidence Method
- Files inspected:
  - `frontend/src/components/MonitoringGrid.tsx`
  - `frontend/src/components/ServicesReal.tsx`
  - `frontend/src/components/ServiceRegistry.tsx`
  - `frontend/src/components/External.tsx`
  - `frontend/src/components/AssetReal.tsx`
  - `frontend/src/components/NetworkReal.tsx`
  - `frontend/src/components/VendorsReal.tsx`
  - `frontend/src/components/Racks.tsx`
  - `backend/app/api/monitoring.py`
  - `backend/app/api/logical_services.py`
  - `backend/app/api/intelligence.py`
  - `backend/app/api/devices.py`
  - `backend/app/api/networks.py`
  - `backend/app/api/vendors.py`
  - `backend/app/api/racks.py`
  - `backend/app/database.py`
  - `backend/app/models/models.py`
- Proof commands used:
  - `rtk rg -n "apiFetch|bulk-action|restore|purge|delete|update|onRevert|undo|changed|skipped|failed" frontend/src backend`
  - `rtk rg -n "racks/reorder|/reorder|sites/.*/racks|rack.*reorder|reorder.*rack" frontend/src backend`
  - `rtk rg -n "cascade|ondelete|SET NULL|delete-orphan|ForeignKey|relationship\\(" backend`
  - `rtk rg -n "sqlite|journal_mode|busy_timeout|database is locked|create_engine|DATABASE_URL" backend`

## Claim Ledger
| Claim ID | Workspace | Action | Claim | Evidence Grade | Frontend Anchor | Backend Anchor | Missing Evidence | Risk if True | Required Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CLM-01 | Racks | Reorder | Rack reorder route mismatch is real: frontend posts to site-scoped reorder routes, backend exposes `/api/v1/racks/reorder`. | PROVEN | `frontend/src/components/Racks.tsx:2801-2804` | `backend/app/api/racks.py:175-196` | None | Reorder requests can hit the wrong endpoint and fail or drift. | Fix frontend route contract and add route-contract coverage. |
| CLM-02 | External | Purge | External purge is guarded in both UI and backend when deleted entities still have links or secrets. | PROVEN | `frontend/src/components/External.tsx:1565-1572`, `2293-2300`, `2998-3013`, `3106-3125` | `backend/app/api/intelligence.py:368-377` | None | Unsafe hard-delete could remove linked or credentialed entities. | Keep the guard and add explicit contract coverage for blocked purge. |
| CLM-03 | External | Restore | External restore validates accountable owner state and active identity uniqueness before restore. | PROVEN | `frontend/src/components/External.tsx:2321-2333` | `backend/app/api/intelligence.py:196-208`, `310-359` | None | Restore can fail after optimistic UI if ownership or identity preconditions drift. | Add restore-path tests for owner-missing and duplicate-identity failures. |
| CLM-04 | Networks | Restore/Purge | Network restore and purge only work for deleted-state records. | PROVEN | `frontend/src/components/NetworkReal.tsx:1790-1799`, `2541-2548` | `backend/app/api/networks.py:278-296`, `319-337` | None | Mixed-state bulk operations can hard-fail. | Add API/UI tests for active-record restore and purge rejection. |
| CLM-05 | Services | Purge | Services bulk purge is unsupported in backend, but legacy `ServiceRegistry` still uses purge wording for delete-only behavior. | PROVEN | `frontend/src/components/ServiceRegistry.tsx:787-790`, `825-826` | `backend/app/api/logical_services.py:314-341` | None | Users can be told "purge" when only soft-delete exists. | Remove purge wording from legacy UI or block the surface. |
| CLM-08 | Monitoring | Undo | Monitoring bulk update undo replays sanitized full-record snapshots through `PUT`. | PROVEN | `frontend/src/components/MonitoringGrid.tsx:369-390`, `1561-1568`, `1616-1620` | `backend/app/api/monitoring.py:792-850` | None | Revert can overwrite unrelated concurrent edits on the same item. | Replace snapshot replay with versioned patch restore or add conflict detection. |
| CLM-08 | Services | Undo | Services undo appears to restore only the keys present in the original bulk payload, not a full snapshot. Exact changed-field-only overwrite risk is not directly proven. | NEEDS_VERIFICATION | `frontend/src/components/ServicesReal.tsx:1483-1493`, `1515-1525`, `1563-1566` | `backend/app/api/logical_services.py:329-334` | Missing proof of an actual stale overwrite path beyond changed-key replay mechanics. | Concurrent edits on the same keys may still be overwritten, but severity is not source-proven. | Keep this downgraded until a concrete changed-key overwrite failure is proven. |
| CLM-08 | External | Undo | External undo rebuilds a safe `PUT` payload from stable identity fields plus changed keys; blanket stale-overwrite severity is not source-proven. | NEEDS_VERIFICATION | `frontend/src/components/External.tsx:2064-2086`, `2183-2195`, `2213-2215` | `backend/app/api/intelligence.py:310-355` | Missing proof of an actual changed-field-only overwrite failure. | Concurrent edits on replayed keys may still race, but severity is not source-proven. | Keep this downgraded until a concrete overwrite failure is proven. |
| CLM-08 | Assets | Undo | No bulk snapshot-restore undo proof was found for asset updates; do not extend blanket stale-overwrite language here. | NEEDS_VERIFICATION | `frontend/src/components/AssetReal.tsx:1716-1727`, `1787-1789` | `backend/app/api/devices.py:375-402` | Missing proof of a snapshot-based asset undo path and missing proof of exact overwrite behavior. | Blanket undo-risk wording would overstate the source. | Leave asset stale-overwrite claim downgraded. |
| CLM-08 | Networks | Undo | Network undo is state-toggle based for archive/restore, not snapshot replay. | PROVEN | `frontend/src/components/NetworkReal.tsx:1825-1834` | `backend/app/api/networks.py:278-296`, `298-337` | None | Risk is narrower than snapshot replay and tied to state toggles. | Keep the claim scoped to deleted-state action toggles only. |
| CLM-08 | Vendors | Undo | Vendor archive/restore undo is a simple `is_deleted` toggle; contract delete has no undo. | PROVEN | `frontend/src/components/VendorsReal.tsx:932-943`, `1436-1438` | `backend/app/api/vendors.py:192-200` | Missing exact frontend permanent-delete wording for contract UX severity. | Vendor toggles are reversible, but contract delete remains irreversible. | Keep vendor undo scoped to archive/restore and downgrade contract UX severity. |
| CLM-09 | Assets | Purge | Asset hard-delete cascade and user-facing dependency-loss severity are not fully proven from copied source. | NEEDS_VERIFICATION | `frontend/src/components/AssetReal.tsx:2603-2618`, `2698-2712`, `3400-3403` | `backend/app/api/devices.py:375-402`, `backend/app/models/models.py:114-122` | Missing copied model proof for every claimed cascade target and missing copied UI proof for specific dependency-loss wording. | Hard-delete may remove dependent rows, but scope is not fully source-anchored. | Verify actual purge behavior against child tables and add explicit warnings/tests if needed. |
| CLM-10 | Vendors | Contract Delete | Vendor contract delete is backend hard-delete, but destructive UX severity is only partially proven. | NEEDS_VERIFICATION | `frontend/src/components/VendorsReal.tsx:1436-1438` | `backend/app/api/vendors.py:192-200` | Missing exact frontend button/modal wording proving irreversible-destructive UX. | Users may not understand the delete is irreversible. | Add explicit permanent-delete wording or keep UX severity downgraded. |

## Action Support Matrix
| Workspace | UI Action | Frontend File/Function | Frontend Payload/Action | Backend Route/Function | Backend Supports? | Preconditions Proven? | Reversible? | Current Guard Proven? | Evidence Grade | Failure Mode Proven? | Required Fix/Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Monitoring | Bulk archive / restore / purge / update | `MonitoringGrid.tsx` `bulkMutation`, `runUndo` | `POST /api/v1/monitoring/bulk-action` with `delete|restore|purge|update` | `backend/app/api/monitoring.py` `bulk_action` | YES_PROVEN | Yes for deleted/already-deleted handling | Archive/restore/update: yes; purge: no | Yes | PROVEN | Yes: changed/skipped + unsupported action path | Add conflict-safe undo test for snapshot replay. |
| External | Delete / restore / purge / bulk update | `External.tsx` `deleteMutation`, `restoreMutation`, `bulkMutation` | `DELETE /entities/{id}?purge=true`, `POST /entities/{id}/restore`, per-row `PUT` for update undo | `backend/app/api/intelligence.py` | YES_PROVEN | Yes for purge and restore | Archive/restore/update: yes; purge: no | Yes | PROVEN | Yes: purge blocked, restore blocked | Add blocked-purge and blocked-restore contract tests. |
| Services | Bulk archive / restore / update | `ServicesReal.tsx` `bulkMutation`, `runUndo` | `POST /api/v1/logical-services/bulk-action` with `delete|restore|update` | `backend/app/api/logical_services.py` `bulk_action` | PARTIAL_PROVEN | Yes for supported actions; purge unsupported | Archive/restore/update: yes | Yes on modern UI | PROVEN | Yes: unsupported action 400 | Remove legacy purge labeling and test unsupported purge absence. |
| Assets | Bulk archive / restore / purge / update | `AssetReal.tsx` `bulkMutation`, `runUndo` | `POST /api/v1/devices/bulk-action`; update fans out to `PUT /devices/{id}` | `backend/app/api/devices.py` `bulk_action` | PARTIAL_PROVEN | Restore conflict handling proven; purge dependency scope not proven | Archive/restore: yes; purge: no | Partial | NEEDS_VERIFICATION | Partial: restore returns `conflicts`, but purge dependency loss not source-proven | Verify child-row purge effects and add explicit destructive warnings. |
| Networks | Bulk status / archive / restore / purge | `NetworkReal.tsx` `bulkMutation`, `runUndo` | `POST /connections/bulk-status|bulk-delete|bulk-restore|bulk-purge` | `backend/app/api/networks.py` | YES_PROVEN | Yes for restore/purge deleted-state requirement | Archive/restore: yes; purge: no | Partial UI scoping, strong backend precondition | PROVEN | Yes | Add mixed-state bulk rejection tests. |
| Vendors | Vendor archive / restore; contract delete | `VendorsReal.tsx` `bulkMutation`, `deleteContractMutation` | `POST /vendors/bulk-action` with `target=vendor|contract` | `backend/app/api/vendors.py` `bulk_action` | YES_PROVEN | No contract-specific frontend warning proven | Vendor archive/restore: yes; contract delete: no | Partial | NEEDS_VERIFICATION | Partial | Add permanent-delete UX copy test for contract delete. |

## Revert/Undo Contract
- Monitoring
  - Undo storage: `lastUndoRef`.
  - Undo mode: `bulk` for archive/restore, `restore_snapshots` for update.
  - API action: bulk undo uses `POST /api/v1/monitoring/bulk-action`; update undo uses `PUT /api/v1/monitoring/{id}`.
  - Revert scope: full sanitized snapshot replay.
  - Stale overwrite risk: `PROVEN_HIGH`.
  - Missing evidence: none.
- External
  - Undo storage: `externalUndoRef`.
  - Undo mode: `bulk` for archive/restore, `restore_snapshots` for update.
  - API action: archive/restore use delete/restore endpoints; update undo uses `PUT /api/v1/intelligence/entities/{id}`.
  - Revert scope: safe changed-fields replay plus required stable identity fields.
  - Stale overwrite risk: `NEEDS_VERIFICATION`.
  - Missing evidence: no copied source proves an exact changed-field-only overwrite failure; only the replay shape is proven.
- Services
  - Undo storage: `lastUndoRef`.
  - Undo mode: `bulk` for archive/restore, `restore_snapshots` for update.
  - API action: `POST /api/v1/logical-services/bulk-action` and `PUT /api/v1/logical-services/{id}`.
  - Revert scope: changed-fields only.
  - Stale overwrite risk: `NEEDS_VERIFICATION`.
  - Missing evidence: no copied source proves an exact changed-field-only overwrite failure; only the replay shape is proven.
- Assets
  - Undo storage: `lastUndoRef`.
  - Undo mode: bulk-only for archive/restore.
  - API action: `POST /api/v1/devices/bulk-action`.
  - Revert scope: no bulk update snapshot undo in this surface.
  - Stale overwrite risk: `NEEDS_VERIFICATION`.
  - Missing evidence: no copied source proves a snapshot-based asset undo overwrite path.
- Networks
  - Undo storage: `lastUndoRef`.
  - Undo mode: bulk archive/restore only.
  - API action: `POST /connections/bulk-delete|bulk-restore`.
  - Revert scope: state toggle only.
  - Stale overwrite risk: `PROVEN_LOW`.
  - Missing evidence: no concurrency/version guard.
- Vendors
  - Undo storage: `lastUndoRef` for vendor archive/restore.
  - Undo mode: bulk state toggle.
  - API action: `POST /api/v1/vendors/bulk-action`.
  - Revert scope: vendor `is_deleted` toggle only; contracts have no undo.
  - Stale overwrite risk: `PROVEN_LOW` for vendors, `PROVEN_IRREVERSIBLE` for contracts.
  - Missing evidence: destructive contract UX wording.

## Purge Contract
- Monitoring: visible in deleted scope; hard purge via `POST /api/v1/monitoring/bulk-action` with `action: "purge"`; backend has no deleted-state precondition; frontend guard is tab scoping only; evidence `PROVEN`; required fix/test: add explicit deleted-only backend precondition test if intended.
- External: visible in deleted scope; hard purge via `DELETE /api/v1/intelligence/entities/{id}?purge=true`; backend preconditions are no links and no secrets; frontend guard disables blocked rows/selections; evidence `PROVEN`; required fix/test: blocked-purge contract coverage.
- Services: modern `ServicesReal` does not expose purge; backend bulk action rejects unsupported actions; legacy `ServiceRegistry` still says purge while sending delete; evidence `PROVEN`; required fix/test: remove legacy label drift.
- Assets: visible in deleted scope; hard purge via `POST /api/v1/devices/bulk-action` with `action: "purge"`; backend route exists; frontend warns "Confirm Permanent Purge?"; dependency-loss severity remains `NEEDS_VERIFICATION`.
- Networks: visible in deleted scope; hard purge via `POST /api/v1/networks/connections/bulk-purge`; backend precondition requires `status == "Deleted"`; evidence `PROVEN`; required fix/test: mixed-state rejection test.
- Vendors: vendor purge exists in backend, contract delete is hard-delete on `action: "delete"` with `target: "contract"`; current contract UX severity remains `NEEDS_VERIFICATION`.

## Changed Count / No-op Contract
| Workspace | Backend returns changed/skipped/count? | Frontend fallback rule | No-op detection | Undo safety risk | Evidence Grade |
| --- | --- | --- | --- | --- | --- |
| Monitoring | Yes: `changed`, `skipped`, `summary` | Uses backend counts first, semantic fallback second | `{"status":"no_op"}` and per-item skip handling | Higher because update undo replays snapshots | PROVEN |
| External | No shared bulk count contract for updates; frontend self-accumulates `updated/skipped/failed` | Uses local per-row aggregation | Local cache checks + per-row skip/fail | Medium | PROVEN |
| Services | No `changed` in backend bulk response | Frontend computes fallback from previous snapshots | `{"status":"no_op"}` only | Low to medium | PROVEN |
| Assets | No `changed` for bulk delete/purge in backend | Frontend defaults `changed` to selected count | `{"status":"no_op"}` only | Medium for destructive assumptions | PROVEN |
| Networks | Yes: `count`, `changed`, `summary` | Uses backend response directly | Zero-count summaries | Low | PROVEN |
| Vendors | No `changed` or `summary` | Toast assumes selected count | `{"status":"no_op"}` only | Low for vendors; irreversible for contracts | PROVEN |
| Racks | Restore/relocate return `restored/conflicts` or `relocated/conflicts`; delete/purge do not | UI must infer success from status | `{"status":"no_op"}` only | Medium where conflicts are possible | PROVEN |

## Client-Fanout vs Backend-Bulk
| Workspace | Backend bulk exists? | Frontend uses backend bulk or client fanout? | Atomicity risk grade | Concurrency risk grade |
| --- | --- | --- | --- | --- |
| Monitoring | Yes | Backend bulk for all actions; snapshot undo fans out `PUT`s | Medium | High for update undo |
| External | No true backend bulk update | Client fanout for updates and update undo | High | Medium |
| Services | Yes | Backend bulk for delete/restore/update; update undo fans out changed-field `PUT`s | Medium | Medium |
| Assets | Partial | Bulk for delete/restore/purge, client fanout for updates | High | Medium |
| Networks | Partial | Bulk for status/delete/restore/purge, fanout for richer updates | Medium | Low to medium |
| Vendors | Yes for vendor and contract action dispatch | Backend bulk dispatch | Low | Low |

## Required Guards
- CLM-01: align rack reorder frontend route with `POST /api/v1/racks/reorder`.
- CLM-02: preserve external purge disabled state when links or secrets exist.
- CLM-03: surface restore precondition failures for missing owner or duplicate active identity.
- CLM-05: remove legacy services purge wording where backend only supports archive.
- CLM-08: add conflict/version guard before monitoring snapshot undo and keep non-monitoring stale-overwrite language downgraded unless concrete overwrite proof is copied.

## Required Tests
| Test Name | Claim ID | Layer | Setup | Action | Expected Result | Evidence Protected |
| --- | --- | --- | --- | --- | --- | --- |
| `racks_reorder_route_contract` | CLM-01 | Frontend/API | Rack page with reorder action available | Trigger rack reorder | Frontend calls `/api/v1/racks/reorder` or equivalent corrected route | Prevent route drift regression |
| `external_purge_blocked_when_links_or_secrets_exist` | CLM-02 | UI + API | Deleted external entity with a link or secret | Attempt purge from deleted scope | UI disables or errors; backend returns 400 if forced | Protect purge safety contract |
| `external_restore_requires_owner_and_unique_identity` | CLM-03 | API | Deleted entity with missing owner or duplicate active identity | Restore entity | Backend returns 409 with specific reason | Protect restore preconditions |
| `network_restore_rejects_active_records` | CLM-04 | API | Include at least one active connection in restore batch | Bulk restore | Backend returns 400 | Protect deleted-state precondition |
| `service_registry_does_not_advertise_purge` | CLM-05 | UI | Legacy `ServiceRegistry` active tab | Open destructive action affordance | Copy says archive/terminate, not purge | Protect label contract |
| `monitoring_update_undo_detects_concurrent_change` | CLM-08 | API/UI | Update monitor, mutate same record elsewhere, then undo | Run undo | Undo is blocked or conflict-reported | Protect against stale snapshot overwrite |

## Backend Evidence Snippets
### CLM-01
```py
@router.post("/reorder")
async def reorder_racks(data: dict, request: Request, db: AsyncSession = Depends(get_db)):
```

### CLM-02
```py
if purge:
    link_check = await db.execute(select(models.ExternalLink).filter(models.ExternalLink.external_entity_id == entity_id))
    if link_check.scalars().first():
        raise HTTPException(400, "Cannot purge entity with active connectivity links")
    secret_check = await db.execute(select(models.ExternalEntitySecret).filter(models.ExternalEntitySecret.external_entity_id == entity_id))
    if secret_check.scalars().first():
        raise HTTPException(400, "Cannot purge entity with registered credentials")
```

### CLM-03
```py
async def _validate_restoreable_external_entity(db: AsyncSession, entity: models.ExternalEntity) -> None:
    if entity.ownership_mode == "team":
        if entity.internal_team_id is None:
            raise HTTPException(409, detail="Archived team-owned external entity cannot be restored without an accountable internal team")
```

### CLM-04
```py
if any(conn.status != "Deleted" for conn in connections):
    raise HTTPException(status_code=400, detail="Only deleted connections can be restored")
```

### CLM-05
```py
elif action == "update":
    ...
else:
    raise HTTPException(status_code=400, detail=f"Unsupported bulk action: {action}")
```

### CLM-08
```py
merged_payload = {
    "device_id": item.device_id,
    "category": item.category,
    "status": item.status,
    ...
}
merged_payload.update(payload)
validated_update, owners_data = await build_monitoring_payload(db, merged_payload, partial=False)
```

## Frontend Evidence Snippets
### CLM-01
```ts
const rackReorderMutation = useMutation({
  mutationFn: async ({ siteId, ids }) =>
    apiFetch(`/api/v1/sites/${siteId}/racks/reorder`, { method: 'POST', body: JSON.stringify({ ids }) }),
})
```

### CLM-02
```ts
if (type === 'entity' && purge && !isExternalEntityPurgeable(findExternalEntityById(id))) {
  throw new Error(EXTERNAL_PURGE_BLOCKED_MESSAGE)
}
```

### CLM-03
```ts
const restoreMutation = useMutation({
  mutationFn: async (id: number) => {
    const res = await apiFetch(`/api/v1/intelligence/entities/${id}/restore`, { method: 'POST' })
```

### CLM-04
```ts
} else if (action === 'restore') {
  res = await apiFetch('/api/v1/networks/connections/bulk-restore', {
```

### CLM-05
```ts
<button onClick={() => openConfirm('Bulk Terminate', `Terminate ${selectedIds.length} instances?`, () => bulkMutation.mutate({ action: 'delete' }))}>
  Bulk Purge
</button>
```

### CLM-08
```ts
} else if (undo.mode === 'restore_snapshots') {
  for (const snapshot of undo.snapshots) {
    const res = await apiFetch(`/api/v1/monitoring/${snapshot.id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeMonitoringPayload(snapshot))
```

## Rejected or Downgraded Claims
- Database ID recycling: `REJECTED`. No exact source proof found.
- SQLite guaranteed reliability: `REJECTED`. `backend/app/database.py:29-31` and `35-42` show WAL and `busy_timeout`, which mitigate basic lock contention; stress tests are still required.
- Blanket stale overwrite across all revert loops: `REJECTED`. Monitoring is full-snapshot; services and external are narrower.
- Assets cascade severity: `DOWNGRADED_TO_NEEDS_VERIFICATION`. Model cascades exist, but user-facing dependency-loss scope is not fully proven.
- Vendor contract UX severity: `DOWNGRADED_TO_NEEDS_VERIFICATION`. Hard-delete is proven; irreversible wording is not.

## Final Source-Verified Priority List
1. Must fix now
   - CLM-01 rack reorder route mismatch.
   - CLM-05 legacy services purge label drift against unsupported backend action.
   - CLM-08 monitoring snapshot undo overwrite risk.
2. Needs verification before implementation
   - CLM-08 services and external changed-key replay severity.
   - CLM-09 asset purge dependency-loss severity and warning scope.
   - CLM-10 vendor contract irreversible UX wording.
3. Later improvement
   - Add conflict/version-aware undo across services, external, and networks.
   - Add consistent changed/skipped response contracts for assets, vendors, services, and racks.
