# RUN3-A Workspace Drift Matrix

## Verdict
The current app-wide operational standard is source-defined, not doc-defined. `docs/operational-workspace-law.md` is empty, while the real contract lives in shared runtime code such as `frontend/src/components/shared/OperationalWorkspace.ts`, `frontend/src/components/shared/OperationalWorkspaceHooks.ts`, `frontend/src/components/shared/OperationalDataGrid.tsx`, `frontend/src/components/shared/OperationalWorkspaceShells.tsx`, and the shared row-action stack.

The locked OUT-8 trio is real and is the current standard:
- Monitoring: `frontend/src/components/MonitoringGrid.tsx:63`, `:661`, `:1221`, `:2031`, `:2164`
- External: `frontend/src/components/External.tsx:40`, `:1490`, `:1595`, `:2848`, `:3135`
- Services: `frontend/src/components/ServicesReal.tsx:53`, `:587`, `:1115`, `:1973`, `:2115`

The biggest drift risks are not inside the trio. They are:
- duplicate route implementations: `/asset` vs `/asset-real`, `/vendors` vs `/vendors-real`
- partial adopters still on older hooks: `NetworkReal`, `AssetReal`, `VendorsReal`
- bespoke operational pages that still expose bulk or row action behavior without the shared runtime: `Assets`, `Vendor`, `Racks`

Row-action width law status:
- The shared law is present in code. Header width is resolved from the selected entity text in `frontend/src/components/shared/OperationalRowActionMenu.tsx:67-74`, then button/card widths are normalized to one resolved content width in `frontend/src/components/shared/OperationalRowActionGeometry.ts:85-103` and rendered at that shared width in `frontend/src/components/shared/OperationalRowActionMenu.tsx:135`.
- Monitoring, External, and Services inherit this law because they use `OperationalRowActionMenu`.
- `AssetReal`, `NetworkReal`, and `VendorsReal` render custom row-action windows instead of the shared menu, so they are drift risks against the row-action width law.

## Operational Workspace Inventory

| Workspace | File(s) | Shared contracts used | Local duplicated logic | Bulk status | Row-action status | Saved/display views | Modal/floating-panel status | API/action risk | Drift risk | Plug-and-play maturity | Required next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Monitoring | `frontend/src/components/MonitoringGrid.tsx` | `useOperationalGridRuntime`, `useOperationalDismissController`, `OperationalDataGrid`, `OperationalSavedViewsPanel`, `OperationalWorkspaceShell`, `OperationalRowActionMenu`, shared bulk contract | Local workspace-state normalizers and Monitoring-specific validation/history logic remain, but runtime shell is shared | Strong. Uses `/api/v1/monitoring/bulk-action` at `:1556`, `:1586`; backend returns changed/skipped/summary | Standard. Shared row-action menu at `:2164` | Standard. Saved views + display panels + backend user settings sync at `:484`, `:762`, `:788`, `:2031` | Standard. Shared anchored panels and shared dismiss controller at `:596`, `:1221` | Low | Low | `Locked standard` | Keep as source of truth; extract remaining local state normalization only if reused elsewhere |
| External | `frontend/src/components/External.tsx` | `useOperationalGridRuntime`, `useOperationalDismissController`, `OperationalDataGrid`, `OperationalSavedViewsPanel`, `OperationalWorkspaceShell`, `OperationalRowActionMenu` | Per-entity bulk fan-out, purgeability logic, and workspace-specific field labels are local | Medium. UI has bulk panel, but bulk work fans out per entity rather than hitting one backend bulk route | Standard shell, but operation semantics still diverge from Monitoring wording | Standard UI shell. Uses shared saved/display panels; persistence is local-state heavy, not clearly remote preference-backed in the reviewed lines | Standard shared anchored panels and dismiss controller at `:1466`, `:1595` | Medium. Restore/purge safety split across frontend and backend | Medium | `Locked standard with action drift` | Keep shared UI shell, but align bulk summaries and action semantics to Monitoring contract |
| Services | `frontend/src/components/ServicesReal.tsx`, `frontend/src/components/ServiceRegistry.tsx` | `useOperationalGridRuntime`, `useOperationalDismissController`, `OperationalDataGrid`, `OperationalSavedViewsPanel`, `OperationalWorkspaceShell`, `OperationalRowActionMenu` | Service-specific column/state normalizers and delegated form/detail bodies remain local | Medium. Uses `/api/v1/logical-services/bulk-action` at `:1475`, `:1522`, `:1527`, `:1532`, but backend returns only `{"status":"success"}` | Standard shared row-action shell at `:2115` | Standard. Remote + local preference merge at `:477-500`, `:719`, `:749`; shared views panel at `:1973` | Standard. Shared anchored panels and dismiss controller at `:519`, `:1115` | Medium. Backend action support is narrower than UI expectations | Medium | `Locked standard with backend contract gap` | Add backend bulk summary/count contract or move all user-facing summary logic into a shared frontend adapter |
| Network | `frontend/src/components/NetworkReal.tsx` | `useOperationalGridLayout`, `useWorkspaceDismissHandlers`, `OperationalWorkspaceShell`, `OperationalSavedViewsPanel`, `OperationalGridSurface` | Legacy manual grid lifecycle, manual dismiss logic, custom row-action window, custom bulk panel | Present, but legacy shell path with manual visibility/layout (`:707`, `:1358`, `:2455`) | Custom, not shared `OperationalRowActionMenu` (`:2569-2580`) | Partial. Shared saved views panel plus remote settings sync at `:655`, `:845`, `:875`, `:2433` | Partial. Uses shared shells, but dismissal is manual via `useWorkspaceDismissHandlers` at `:1358` | Medium | High | `Near-standard legacy adopter` | Migrate from `useOperationalGridLayout` to `useOperationalGridRuntime` and replace custom row-action window with shared menu |
| Asset-Real | `frontend/src/components/AssetReal.tsx` | `useOperationalGridLayout`, `useWorkspaceDismissHandlers`, `OperationalWorkspaceFrame`, `OperationalSavedViewsPanel`, `OperationalGridSurface` | Monitoring-derived workspace state, manual dismiss logic, custom row-action window, local bulk menu shell | Present via `/api/v1/devices/bulk-action` at `:1720`, `:1763`, but not standardized | Custom row-action window, not shared menu (`:2627-2710`) | Partial. Shared saved views panel plus remote settings sync at `:626`, `:819`, `:849`, `:2486` | Partial. Uses shared modal/floating primitives, but dismiss behavior is still manual at `:1343` | Medium | High | `Near-standard legacy adopter` | Either promote `/asset-real` to standard and finish migration, or retire it in favor of one asset workspace |
| Vendors-Real | `frontend/src/components/VendorsReal.tsx` | `useOperationalGridLayout`, `useWorkspaceDismissHandlers`, `OperationalWorkspaceFrame`, `OperationalSavedViewsPanel`, `OperationalGridSurface` | Manual panel positioning, custom row-action markup, local undo wiring, legacy grid runtime | Present via `/api/v1/vendors/bulk-action` at `:928`, `:941`, but custom | Custom row-action window with local buttons at `:1157-1189` | Partial. Shared saved views panel plus remote settings sync at `:359`, `:495`, `:507`, `:1123` | Partial. Manual `positionUtilityWindow` still visible at `:728`; manual dismiss at `:701` | Medium | High | `Near-standard legacy adopter` | Replace custom row-action and positioning with shared row-action + dismiss stack, then decide whether `/vendors-real` replaces `/vendors` |
| Assets | `frontend/src/components/Assets.tsx` | `WorkspaceModal`, `WorkspaceEmptyState`, `BulkImportModal`, `WorkspaceShareHeader` | Entire grid, bulk menu, compare flow, and modal stack are bespoke | Present via `/api/v1/devices/bulk-action` at `:1682`, but menu is bespoke at `:1426`, `:2118` | No shared row-action contract found in reviewed anchors | No shared saved views panel; display/bulk is local toggle state only | Shared modal component exists, but floating/bulk behavior is bespoke | High | High | `Bespoke operational page` | Decide whether `/asset` or `/asset-real` is canonical, then migrate the survivor to the shared runtime |
| Vendor | `frontend/src/components/Vendor.tsx` | Only `OPERATIONAL_GRID_AUTO_SIZE_STRATEGY`; otherwise plain `AgGridReact` and local modals | Entire vendor registry workflow is bespoke; hidden duplicate with `VendorsReal` exists | Present via `/api/v1/vendors/bulk-action` at `:680`, but no shared bulk contract | No shared row-action contract found | No shared saved views/display contract | No shared operational floating-panel contract | High | High | `Bespoke operational page` | Remove dual-track vendor workspace strategy; choose `/vendors` or `/vendors-real`, not both |
| Racks | `frontend/src/components/Racks.tsx` | `WorkspaceModal`, `WorkspaceEmptyState` | Rack/site/mount workflows are bespoke | Present via `/api/v1/racks/bulk-action` at `:2695`, but not shared | No shared row-action contract found in reviewed anchors | No shared saved views/display contract found | Shared modal component only | Medium | High | `Bespoke operational page` | Migrate bulk/grid behaviors into shared runtime if Racks is intended to remain a first-class operational workspace |
| Settings | `frontend/src/components/Settings.tsx` | `WorkspaceModal`, `WorkspaceHistoryShell`, `WorkspaceFloatingPanel`, `useWorkspaceAnchoredLayer` | Many mini-workspaces and custom bulk/floating behaviors | Has permission bulk flow, but it is a domain-specific admin panel, not a shared operational grid | Not applicable as an operational row-action workspace | No standard saved/display view contract | Shared modal/history primitives; custom anchored panel handling at `:768`, `:1382-1383`, `:2159` | Medium | Medium | `Adjacent admin workspace` | Keep separate from operational-grid standard; only extract reusable admin patterns if another admin panel appears |
| Audit Logs | `frontend/src/components/AuditLogs.tsx` | None visible beyond `apiFetch` | Thin page, not part of operational runtime | No evidence of shared bulk behavior | No evidence of shared row-action behavior | No saved/display view contract found | No standard modal/floating contract visible in reviewed anchors | Low | Medium | `Thin adjunct page` | Leave outside the operational-grid standard unless it grows into a table-centric workspace |
| Architecture | `frontend/src/components/DataFlowDesigner.tsx` | None from operational runtime; graph workspace is bespoke | Large bespoke graph/editor workflow | No shared operational bulk contract | No shared row-action contract | No shared saved/display view contract | Bespoke sidebars and overlays | Medium | Medium | `Separate interaction model` | Keep out of the operational-grid standard; do not force-fit it into OUT-8 patterns |
| FAR | `frontend/src/components/FAR.tsx` | `WorkspaceEmptyState`, `OPERATIONAL_GRID_AUTO_SIZE_STRATEGY` | Bespoke form and registry logic | Has bulk delete path, but not shared runtime | No shared row-action contract found | No shared saved/display view contract found | Mostly bespoke modal/form flows | Medium | Medium | `Separate registry page` | Either leave separate or formally define a FAR workspace adapter before further feature growth |
| Research | `frontend/src/components/Research.tsx` | `WorkspaceEmptyState` | Bespoke investigation workflow | No shared operational bulk contract found | No shared row-action contract found | No shared saved/display view contract found | Bespoke outside-click handling at `:769` | Medium | Medium | `Separate workflow page` | Keep outside operational-grid standard unless a true registry/table surface is introduced |
| Projects | `frontend/src/components/Projects.tsx` | `WorkspaceEmptyState` only in reviewed anchors | No shared operational workspace contract visible in reviewed anchors | No shared operational bulk contract found | No shared row-action contract found | No shared saved/display view contract found | Not enough evidence of shared modal/floating contract in reviewed anchors | Medium | Medium | `Underspecified from operational-runtime perspective` | If Projects is intended to be operational, audit it separately and either migrate or explicitly exempt it |
| Knowledge | `frontend/src/components/Knowledge.tsx` | `WorkspaceEmptyState` only in reviewed anchors | No shared operational runtime evidence in reviewed anchors | No shared operational bulk contract found | No shared row-action contract found | No shared saved/display view contract found | No shared modal/floating contract evidenced in reviewed anchors | Low | Medium | `Content workspace, not operational-grid` | Leave outside OUT-8 unless a registry/grid surface is introduced |

Notes:
- `/network-real` is not a second network workspace. It is a redirect path (`frontend/src/App.tsx:264`, `:728`).
- `/asset-real` and `/vendors-real` are active alternate routes (`frontend/src/App.tsx:724`, `:734`) and therefore real drift sources even if they are not the main sidebar defaults.

## Shared Contract Adoption Matrix

Current shared source-of-truth:
- Runtime state/grid lifecycle: `frontend/src/components/shared/OperationalWorkspaceHooks.ts:311`, `:507`
- Dismiss/keyboard/outside-click: `frontend/src/components/shared/OperationalWorkspaceHooks.ts:54-80`, `frontend/src/components/shared/OperationalGridInteractions.ts:241-272`
- Shared shell and command-bar frame: `frontend/src/components/shared/OperationalWorkspaceShells.tsx:19-70`
- Shared grid wrapper and error surface: `frontend/src/components/shared/OperationalDataGrid.tsx:32-138`
- Shared row-action geometry law: `frontend/src/components/shared/OperationalRowActionMenu.tsx:67-74`, `frontend/src/components/shared/OperationalRowActionGeometry.ts:85-103`

Adoption tiers:
- Full OUT-8 standard: Monitoring, External, Services
- Partial/legacy shared shell: NetworkReal, AssetReal, VendorsReal
- Shared modal primitives only: Assets, Racks, Settings, FAR, Research, Knowledge, Projects
- No meaningful operational runtime adoption in reviewed anchors: Vendor, Audit Logs, Architecture

## Local Drift Findings

1. The workspace law is encoded in source, not in documentation.
   `docs/operational-workspace-law.md` has `0` lines, so the enforceable standard is whatever the shared code currently does.

2. The row-action width law is standardized only where `OperationalRowActionMenu` is used.
   Monitoring, External, and Services comply. `AssetReal`, `NetworkReal`, and `VendorsReal` still own custom row-action windows and can drift on width, wrapping, and control alignment.

3. The old operational hook stack is still alive in partial adopters.
   `NetworkReal`, `AssetReal`, and `VendorsReal` use `useOperationalGridLayout` plus `useWorkspaceDismissHandlers` instead of `useOperationalGridRuntime` plus `useOperationalDismissController`.

4. Duplicate workspace routes are a first-order sustainability risk.
   `/asset` vs `/asset-real` and `/vendors` vs `/vendors-real` mean feature parity, bug fixes, and UX laws can drift even when both pages work individually.

5. Services is visually standardized but backend-light.
   The shared UI is present, but the backend bulk endpoint in `backend/app/api/logical_services.py:314-358` still returns only `{"status":"success"}` and supports only `delete`, `restore`, and `update`.

6. External is standardized in UI shell but not in action semantics.
   Bulk update/archive/restore/purge still fan out through per-entity routes, so summary wording, partial-failure handling, and no-op semantics drift from Monitoring.

7. Monitoring still carries one visible local legacy seam.
   `showBulkMenu` state exists and a bulk panel is rendered, but prior repo audits already called it the remaining incomplete surface. In current source it is still a unique Monitoring-specific code path rather than a generic bulk flyout adapter.

## Highest-Risk Workspaces

1. Assets
   Main risk: there is a second asset workspace (`AssetReal`) that is much closer to the shared operational contract than the routed `/asset` page.

2. Vendor
   Main risk: routed `/vendors` is bespoke while `/vendors-real` is a partial shared-shell implementation. This is pure product drift pressure.

3. NetworkReal
   Main risk: it looks close to standard, but still owns manual dismiss and custom row-action behavior. That is the kind of near-standard page that silently diverges.

4. VendorsReal
   Main risk: still uses manual positioning and a custom row-action window despite already carrying remote workspace preference sync.

5. Services
   Main risk: backend action contract lags the polished shared UI contract.

## Plug-and-Play Maturity Ranking

1. Monitoring
   Best current baseline. Strongest end-to-end contract from saved views through row action and backend summary.

2. External
   UI-standard, but action semantics still lag Monitoring.

3. Services
   UI-standard, but backend summary/support contract still lags the UI.

4. NetworkReal
   Closest non-trio candidate for migration to full standard.

5. AssetReal
   Useful partial adopter, but currently undermined by duplicate route strategy.

6. VendorsReal
   Partial adopter with visible manual-shell leftovers.

7. Racks
   Operationally important, but still bespoke in the reviewed source.

8. Assets
   Operationally important, but not on the shared runtime.

9. Vendor
   Duplicate bespoke registry.

10. Settings
   Shared primitives only; not an operational-grid workspace.

11. FAR / Research / Architecture / Projects / Knowledge / Audit Logs
   Keep outside the operational-grid maturity race unless they explicitly adopt the shared contract.

## Required Next Actions

1. Freeze Monitoring, External, and Services as the enforced operational reference set.
   Treat the trio as the only approved baseline for saved views, display controls, row actions, dismissal, floating panels, and bulk UX.

2. Enforce the row-action width law only through the shared row-action component.
   Do not allow any new custom row-action windows. Migrate `NetworkReal`, `AssetReal`, and `VendorsReal` to `OperationalRowActionMenu`.

3. Resolve duplicate workspace strategy before any more feature work.
   Pick one canonical asset workspace and one canonical vendor workspace.

4. Move near-standard adopters onto `useOperationalGridRuntime`.
   Priority order: `NetworkReal`, `AssetReal`, `VendorsReal`.

5. Normalize Services and External action semantics to Monitoring.
   Either extend backend summaries or formalize a shared frontend action-summary adapter so all three behave the same.

6. Decide which bespoke pages are intentionally exempt.
   Architecture, Research, FAR, Knowledge, and Settings should either stay explicitly exempt or get a written migration target. The current in-between state creates expectation drift.

## Backend Evidence Snippets, if any

Monitoring bulk backend:

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
        result = await db.execute(
            select(models.MonitoringItem)
            .options(joinedload(models.MonitoringItem.owners).joinedload(models.MonitoringOwner.operator))
            .where(models.MonitoringItem.id.in_(ids))
        )
        items = result.unique().scalars().all()
        for item in items:
            if item.is_deleted and item.status == "Deleted":
                skipped_count += 1
                continue
            previous_snapshot = build_monitoring_snapshot(item)
            item.is_deleted = True
            item.status = "Deleted"
            item.version = (item.version or 0) + 1
            await db.flush()
            await save_monitoring_history(
                item.id,
                item.version,
                db,
                summarize_monitoring_snapshot_delta(previous_snapshot, build_monitoring_snapshot(item), action_label="delete"),
            )
            changed_count += 1
    elif action == "purge":
        delete_result = await db.execute(delete(models.MonitoringItem).where(models.MonitoringItem.id.in_(ids)))
        changed_count = delete_result.rowcount or 0
        skipped_count = max(0, len(ids) - changed_count)
    elif action == "restore":
        result = await db.execute(
            select(models.MonitoringItem)
            .options(joinedload(models.MonitoringItem.owners).joinedload(models.MonitoringOwner.operator))
            .where(models.MonitoringItem.id.in_(ids))
        )
        items = result.unique().scalars().all()
        for item in items:
            if not item.is_deleted and item.status == "Existing":
                skipped_count += 1
                continue
            previous_snapshot = build_monitoring_snapshot(item)
            item.is_deleted = False
            item.status = "Existing"
            item.version = (item.version or 0) + 1
            await db.flush()
            await save_monitoring_history(
                item.id,
                item.version,
                db,
                summarize_monitoring_snapshot_delta(previous_snapshot, build_monitoring_snapshot(item), action_label="restore"),
            )
            changed_count += 1
    elif action == "update":
        if payload:
            result = await db.execute(
                select(models.MonitoringItem)
                .options(joinedload(models.MonitoringItem.owners).joinedload(models.MonitoringOwner.operator))
                .where(models.MonitoringItem.id.in_(ids))
            )
            items = result.unique().scalars().all()
            for item in items:
                previous_snapshot = build_monitoring_snapshot(item)
                merged_payload = {
                    "device_id": item.device_id,
                    "category": item.category,
                    "status": item.status,
                    "title": item.title,
                    "spec": item.spec,
                    "platform": item.platform,
                    "monitoring_url": item.monitoring_url,
                    "purpose": item.purpose,
                    "impact": item.impact,
                    "notification_method": item.notification_method,
                    "notification_recipients": item.notification_recipients,
                    "logic": item.logic,
                    "logic_json": item.logic_json,
                    "monitored_services": item.monitored_services,
                    "owner_team": item.owner_team,
                    "check_interval": item.check_interval,
                    "alert_duration": item.alert_duration,
                    "notification_throttle": item.notification_throttle,
                    "severity": item.severity,
                    "is_active": item.is_active,
                    "recovery_docs": item.recovery_docs,
                    "owners": [
                        {"operator_id": owner.operator_id, "role": owner.role}
                        for owner in item.owners
                        if owner.operator_id
                    ],
                }
                merged_payload.update(payload)
                validated_update, owners_data = await build_monitoring_payload(db, merged_payload, partial=False)
                await ensure_monitoring_item_uniqueness(db, item_data=validated_update, exclude_item_id=item.id)
                next_snapshot = build_monitoring_snapshot_from_values(validated_update, owners_data)
                if next_snapshot == previous_snapshot:
                    skipped_count += 1
                    continue
                for key, value in validated_update.items():
                    setattr(item, key, value)
                if owners_data is not None:
                    await db.execute(delete(models.MonitoringOwner).where(models.MonitoringOwner.monitoring_item_id == item.id))
                    for owner in owners_data:
                        db.add(models.MonitoringOwner(**owner, monitoring_item_id=item.id))
                item.version = (item.version or 0) + 1
                await db.flush()
                await save_monitoring_history(
                    item.id,
                    item.version,
                    db,
                    summarize_monitoring_snapshot_delta(previous_snapshot, next_snapshot, action_label="update"),
                )
                changed_count += 1
                changed_fields.update(
                    label
                    for key, label in {
                        "device_id": "target asset",
                        "category": "category",
                        "status": "status",
                        "title": "title",
                        "platform": "platform",
                        "notification_method": "notification method",
                        "severity": "severity",
                        "owner_team": "owner teams",
                        "owners": "owners",
                        "monitored_services": "monitored services",
                        "recovery_docs": "recovery docs",
                    }.items()
                    if previous_snapshot.get(key) != next_snapshot.get(key)
                )
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
        ),
    }
```

Services bulk backend:

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

    if action in {"delete", "restore", "update"}:
        refreshed_res = await db.execute(select(models.LogicalService).filter(models.LogicalService.id.in_(ids)))
        refreshed_services = refreshed_res.scalars().all()
        affected_device_ids.update({service.device_id for service in refreshed_services if service.device_id})
        if any(service.service_type == "OS" for service in refreshed_services + affected_services):
            for device_id in affected_device_ids:
                await sync_device_os_state(device_id, db)

    db.add(build_audit_log(
        request=request,
        action=f"BULK_{action.upper()}",
        target_table="logical_services",
        target_id="bulk",
        description=f"Applied bulk logical service action: {action}",
        changes={"ids": ids, "payload": payload if action == "update" else {}},
    ))
    
    await db.commit()
    return {"status": "success"}
```

External restore/purge backend:

```py
@router.post("/entities/{entity_id}/restore")
async def restore_entity(entity_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ExternalEntity).filter(models.ExternalEntity.id == entity_id))
    obj = result.scalar_one_or_none()
    if not obj: raise HTTPException(404, "Entity not found")
    await _validate_unique_external_key(db, obj.external_key, entity_id)
    await _validate_restoreable_external_entity(db, obj)
    identity_payload = schemas.ExternalEntityCreate.model_validate({
        "name": obj.name,
        "external_key": obj.external_key,
        "aliases_json": obj.aliases_json or [],
        "type": obj.type,
        "subtype": obj.subtype,
        "owner_organization": obj.owner_organization,
        "owner_team": obj.owner_team,
        "ownership_mode": obj.ownership_mode,
        "internal_team_id": obj.internal_team_id,
        "internal_operator_id": obj.internal_operator_id,
        "status": obj.status,
        "environment": obj.environment,
        "description": obj.description,
        "notes": obj.notes,
        "contacts_json": _normalize_contacts(obj),
        "business_purpose": obj.business_purpose,
        "criticality": obj.criticality,
        "dependency_tier": obj.dependency_tier,
        "data_classification": obj.data_classification,
        "integration_mode": obj.integration_mode,
        "primary_endpoint_url": obj.primary_endpoint_url,
        "secondary_endpoint_url": obj.secondary_endpoint_url,
        "auth_method": obj.auth_method,
        "protocol_family": obj.protocol_family,
        "port_override": obj.port_override,
        "supports_inbound": bool(obj.supports_inbound),
        "supports_outbound": bool(obj.supports_outbound),
        "source_system": obj.source_system,
        "source_record_id": obj.source_record_id,
        "risk_rating": obj.risk_rating,
        "contains_customer_data": bool(obj.contains_customer_data),
        "contains_credentials": bool(obj.contains_credentials),
        "stores_pii": bool(obj.stores_pii),
        "internet_exposed": bool(obj.internet_exposed),
        "third_party_assessment_status": obj.third_party_assessment_status,
        "metadata_json": obj.metadata_json or {},
    })
    await _validate_unique_external_identity(db, identity_payload, entity_id=entity_id)
    
    obj.is_deleted = False
    await db.commit()
    await log_audit(db, request, "RESTORE", "external_entities", entity_id, f"Restored external entity: {obj.name}")
    return {"status": "success"}

@router.delete("/entities/{entity_id}")
async def delete_entity(entity_id: int, request: Request, purge: bool = False, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ExternalEntity).filter(models.ExternalEntity.id == entity_id))
    obj = result.scalar_one_or_none()
    if not obj: raise HTTPException(404, "Entity not found")
    
    if purge:
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

## Grep/Proof Commands Used

Original requested commands:

```bash
rg -n "Operational|Workspace|SavedView|Display|Bulk|bulk|RowAction|rowAction|showWorkspace|showOperational|useOperational|Floating|Modal|Escape|keydown|outside|contains\(" src
rg -n "showOperationalBulk|OperationalBulkContract|OperationalRowAction|OperationalGridInteractions|useOperational" src
```

Observed repo reality:
- `src` does not exist at repo root.
- effective frontend source root is `frontend/src`.

Executed proof commands:

```bash
rtk rg -n "Operational|Workspace|SavedView|Display|Bulk|bulk|RowAction|rowAction|showWorkspace|showOperational|useOperational|Floating|Modal|Escape|keydown|outside|contains\\(" frontend/src
rtk rg -n "showOperationalBulk|OperationalBulkContract|OperationalRowAction|OperationalGridInteractions|useOperational" frontend/src
rtk rg -n "useOperationalGridRuntime|useOperationalDetailRoute|OperationalDataGrid|OperationalSavedViewsPanel|OperationalRowActionMenu|OperationalWorkspaceShell" frontend/src/components
rtk rg -n "showBulkMenu|bulk-action|selectedIds|rowActionMenu|OperationalRowActionMenu|WorkspaceFlyout|showViewsMenu|showDisplayMenu|useEscapeDismiss|keydown|contains\\(" frontend/src/components/MonitoringGrid.tsx frontend/src/components/External.tsx frontend/src/components/ServicesReal.tsx
rtk rg -n "^import .*Operational|useOperational|Operational[A-Z]|Workspace[A-Z]|apiFetch\\(|/api/v1/" frontend/src/components/AssetReal.tsx frontend/src/components/NetworkReal.tsx frontend/src/components/VendorsReal.tsx frontend/src/components/Assets.tsx frontend/src/components/Vendor.tsx frontend/src/components/Projects.tsx frontend/src/components/Racks.tsx frontend/src/components/Knowledge.tsx frontend/src/components/Research.tsx frontend/src/components/DataFlowDesigner.tsx frontend/src/components/FAR.tsx frontend/src/components/AuditLogs.tsx frontend/src/components/Settings.tsx
rtk rg -n "router\\.|APIRouter|@router\\.(get|post|put|delete|patch)|bulk-action|restore|purge|logical-services|monitoring|intelligence/entities" backend/app/api/monitoring.py backend/app/api/logical_services.py backend/app/api/intelligence.py
rtk rg -n "headerContentWidth|extraPerButton|newButtonWidths|actionSetWidth|estimateRowActionHeaderTextWidth" frontend/src/components/shared/OperationalRowActionMenu.tsx frontend/src/components/shared/OperationalRowActionGeometry.ts frontend/src/components/shared/OperationalBulkContract.ts
```
