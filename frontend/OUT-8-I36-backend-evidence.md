# OUT-8 Iteration 36 Backend Evidence

This artifact records the exact source snippets relied on for bulk-action support, Services undo behavior, and Services purge non-exposure.

## Monitoring Bulk Action Support

Source: `backend/app/api/monitoring.py`

```py
@router.post("/bulk-action")
async def bulk_action(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get("ids", [])
    action = data.get("action")
    payload = data.get("payload", {})
    if not ids: return {"status": "no_op"}
    changed_count = 0
    skipped_count = 0
    changed_fields: set[str] = set()

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

    await db.commit()
    return {
        "status": "success",
        "action": action,
        "changed": changed_count,
        "skipped": skipped_count,
        "summary": summarize_bulk_monitoring_action(
            action=action,
            changed_count=changed_count,
            skipped_count=skipped_count,
            changed_fields=changed_fields,
```

Evidence:

- Monitoring backend supports `delete`, `purge`, `restore`, and `update`.
- Monitoring backend returns `changed`, `skipped`, and `summary`.

## Services Backend Support

Source: `backend/app/api/logical_services.py`

```py
@router.put("/{service_id}")
async def update_service(service_id: int, data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.LogicalService).filter(models.LogicalService.id == service_id))
    svc = result.scalar_one_or_none()
    if not svc: raise HTTPException(404)
    previous_device_id = svc.device_id
    
    clean_data = normalize_service_payload(data)
    for k, v in clean_data.items():
        setattr(svc, k, v)
    
    # Sync back to device if OS
    await sync_service_to_device(svc, db)
    if previous_device_id != svc.device_id:
        await sync_device_os_state(previous_device_id, db)
```

```py
@router.post("/bulk-action")
async def bulk_action(data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    ids = data.get("ids", [])
    action = data.get("action")
    payload = data.get("payload", {})
    if not ids: return {"status": "no_op"}

    services_res = await db.execute(select(models.LogicalService).filter(models.LogicalService.id.in_(ids)))
    affected_services = services_res.scalars().all()
    affected_device_ids = {service.device_id for service in affected_services if service.device_id}
    
    if action == "delete":
        await db.execute(update(models.LogicalService).where(models.LogicalService.id.in_(ids)).values(is_deleted=True))
    elif action == "restore":
        await db.execute(update(models.LogicalService).where(models.LogicalService.id.in_(ids)).values(is_deleted=False))
    elif action == "update":
        # Filter valid columns for LogicalService
        valid_keys = {c.name for c in models.LogicalService.__table__.columns}
        clean_update = {k: v for k, v in payload.items() if k in valid_keys}
        if clean_update:
            await db.execute(update(models.LogicalService).where(models.LogicalService.id.in_(ids)).values(**clean_update))
            if "device_id" in clean_update:
                previous_device_ids = {service.device_id for service in affected_services if service.device_id}
                if clean_update["device_id"]:
                    affected_device_ids.add(clean_update["device_id"])
                affected_device_ids.update(previous_device_ids)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported bulk action: {action}")
```

Evidence:

- Services backend-supported bulk action names are `delete`, `restore`, and `update`.
- Services backend still rejects unsupported actions with `Unsupported bulk action: {action}`.
- Services bulk purge is not supported in backend source.
- Services per-item `PUT /logical-services/{service_id}` exists and accepts partial update payloads.

## External Backend Support

Source: `backend/app/api/intelligence.py`

```py
@router.post("/entities/{entity_id}/restore")
async def restore_entity(entity_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    ...
    obj.is_deleted = False
    await db.commit()
    await log_audit(db, request, "RESTORE", "external_entities", entity_id, f"Restored external entity: {obj.name}")
    return {"status": "success"}

@router.delete("/entities/{entity_id}")
async def delete_entity(entity_id: int, request: Request, purge: bool = False, db: AsyncSession = Depends(get_db)):
    ...
    if purge:
        # Check for links
        link_check = await db.execute(select(models.ExternalLink).filter(models.ExternalLink.external_entity_id == entity_id))
        if link_check.scalars().first():
            raise HTTPException(400, "Cannot purge entity with active connectivity links")
        secret_check = await db.execute(select(models.ExternalEntitySecret).filter(models.ExternalEntitySecret.external_entity_id == entity_id))
        if secret_check.scalars().first():
            raise HTTPException(400, "Cannot purge entity with registered credentials")
        await db.delete(obj)
        await log_audit(db, request, "PURGE", "external_entities", entity_id, f"Permanently purged external entity: {obj.name}")
    else:
        obj.is_deleted = True
        await log_audit(db, request, "DELETE", "external_entities", entity_id, f"Soft-deleted external entity: {obj.name}")
    
    await db.commit()
    return {"status": "success"}
```

Evidence:

- External archive is supported via `DELETE /entities/{id}`.
- External restore is supported via `POST /entities/{id}/restore`.
- External purge is supported via `DELETE /entities/{id}?purge=true`, with backend validation that can reject linked or credentialed entities.
- No bulk backend route exists in `backend/app/api/intelligence.py`; External bulk still fans out to per-entity routes.

## Services Update Revert Payload / Action

Source: `frontend/src/components/ServicesReal.tsx`

```tsx
  const runUndo = async () => {
    const undo = lastUndoRef.current
    if (!undo) return
    if (undo.mode === 'bulk') {
      const res = await apiFetch('/api/v1/logical-services/bulk-action', {
        method: 'POST',
        body: JSON.stringify({
          ids: undo.ids,
          action: undo.action === 'restore' ? 'restore' : 'delete',
        })
      })
      if (!res.ok) throw new Error(await res.text())
    } else if (undo.mode === 'restore_snapshots') {
      for (const snapshot of undo.snapshots || []) {
        if (!snapshot?.id) continue
        const restorePayload: Record<string, any> = {}
        Object.keys(undo.payload || {}).forEach((key) => {
          restorePayload[key] = snapshot[key]
        })
        const res = await apiFetch(`/api/v1/logical-services/${snapshot.id}`, {
          method: 'PUT',
          body: JSON.stringify(restorePayload)
        })
        if (!res.ok) throw new Error(await res.text())
      }
    }
```

Evidence:

- Services update revert no longer posts `restore_snapshots` to `/logical-services/bulk-action`.
- Services update revert now uses backend-supported per-item `PUT /logical-services/{id}`.
- The revert payload is limited to the changed bulk fields by rebuilding `restorePayload` from `undo.payload` keys.

## Services Purge Non-Exposure

Source: `frontend/src/components/ServicesReal.tsx`

```tsx
              {activeTab === 'deleted' ? (
                <button
                  onClick={() => bulkMutation.mutate({ action: 'restore' })}
                  disabled={bulkMutation.isPending}
                  className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-left transition-all hover:bg-emerald-500/15 disabled:opacity-50"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                    {bulkMutation.isPending ? <Activity size={10} className="inline animate-spin" /> : 'Restore Selection'}
                  </p>
                </button>
              ) : (
```

```tsx
              {activeTab === 'active' && (
                <>
                  <div className="mx-1 my-3 h-px bg-slate-800" />
                  <button
                    onClick={() => {
                      if (!bulkDeleteConfirm) {
                        setBulkDeleteConfirm(true)
                        return
                      }
                      bulkMutation.mutate({ action: 'delete' })
                    }}
```

```tsx
                {
                    id: 'archive',
                    columns: 1 as 1,
                    items: [
                        ...(activeTab === 'deleted' ? [{ id: 'restore', label: 'Restore', icon: Undo2, tone: 'success' as OperationalRowActionTone, variant: 'inline' as OperationalRowActionVariant, onClick: () => { bulkMutation.mutate({ action: 'restore', ids: [rowActionMenu.item.id] }); setRowActionMenu(null); } }] : []),
                        ...(activeTab === 'active' ? [{
                            id: 'archive',
                            label: rowDeleteConfirmId === rowActionMenu.item.id ? OPERATIONAL_ACTION_LABELS.archiveConfirm : OPERATIONAL_ACTION_LABELS.archive,
                            icon: Trash2,
                            tone: 'danger' as OperationalRowActionTone,
                            variant: 'inline' as OperationalRowActionVariant,
                            confirming: rowDeleteConfirmId === rowActionMenu.item.id,
                            onClick: () => {
                                if (rowDeleteConfirmId !== rowActionMenu.item.id) { setRowDeleteConfirmId(rowActionMenu.item.id); return }
                                bulkMutation.mutate({ action: 'delete', ids: [rowActionMenu.item.id] });
                                setRowActionMenu(null); setRowDeleteConfirmId(null);
                            }
                        }] : [])
                    ]
                }
```

Evidence:

- Services deleted bulk panel exposes restore only.
- Services archive action is exposed only on the active tab.
- Services row action no longer exposes purge on deleted items.
