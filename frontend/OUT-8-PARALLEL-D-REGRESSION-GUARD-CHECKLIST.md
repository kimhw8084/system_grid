# OUT-8 Parallel Support Lane D: Regression Guard Checklist

This report is read-only support evidence for OUT-8 Iteration 38. It defines the preservation checks a reviewer should apply to the Iteration 38 zip/runtime proof while Monitoring purge Revert is being repaired.

## 1. Protected behavior inventory

- Monitoring golden behavior outside purge Revert must remain intact.
  Current live source still uses the shared bulk/toast contract in `frontend/src/components/MonitoringGrid.tsx` with `showOperationalBulkResultToast`, `showOperationalBulkRevertedToast`, and `showOperationalBulkRevertErrorToast`.
- Monitoring Display/Views panel behavior must remain intact.
  Current live source uses `togglePanel`, `OperationalDisplayPanel`, `OperationalSavedViewsPanel`, `showDisplayMenu`, and `showViewsMenu` in `frontend/src/components/MonitoringGrid.tsx`.
- Monitoring Saved Views behavior must remain intact.
  Current live source keeps anchored views state and shared saved-views rendering in `frontend/src/components/MonitoringGrid.tsx`.
- Monitoring selection behavior must remain intact.
  Current live source still renders the selected-count header in the Monitoring bulk flyout as `{selectedIds.length} monitors selected`.
- Monitoring row-action behavior must remain intact.
  Current live source still renders `OperationalRowActionMenu` in `frontend/src/components/MonitoringGrid.tsx`.
- Monitoring bulk inline flyout behavior must remain intact.
  Current live source still uses `showBulkMenu`, anchored layer refs, and the bulk flyout panel in `frontend/src/components/MonitoringGrid.tsx`.
- `selected-records` wording must remain intact.
  Current shared wording lives in `frontend/src/components/shared/OperationalLifecycleToasts.ts` as `selected records`.
- no-op toast behavior must remain intact.
  Current shared no-op message lives in `frontend/src/components/shared/OperationalLifecycleToasts.ts` as `No changes made. Selected records already match the chosen value.`
- shared lifecycle/toast/dependency foundation must remain intact.
  Current shared contract lives across `frontend/src/components/shared/OperationalBulkContract.ts`, `OperationalLifecycleToasts.ts`, `OperationalLifecycleContract.ts`, and `OperationalRowActionMenu.tsx`.
- External unsafe Purge guard/label/disabled reason must remain intact.
  Current live source uses `getExternalEntityPurgeGuard`, `getExternalEntityPurgeReason`, and `disabledReason` in `frontend/src/components/External.tsx`.
- Services purge must remain unexposed/backend-blocked.
  Current live source preserves `SERVICES_PURGE_BLOCKED_REASON` in `frontend/src/components/ServicesReal.tsx` and still routes actions through `/api/v1/logical-services/bulk-action`.
- Services bulk semantic no-op/update/revert behavior must remain intact.
  Current live source computes semantic changed counts with `countSemanticBulkChanges`, drives shared wording through `showOperationalBulkResultToast`, and keeps non-purge revert wiring in `frontend/src/components/ServicesReal.tsx`.
- row-action width/no-wrap law must remain intact.
  Current live source preserves header sizing through `estimateRowActionHeaderTextWidth` and label no-wrap through `whitespace-nowrap` in `frontend/src/components/shared/OperationalRowActionMenu.tsx`.
- no package/config/lockfile changes.
  Iteration 38 should not touch package manifests, lockfiles, Vite/Tailwind/TS configs, or route-finalization files to fix Monitoring purge Revert.

## 2. Source grep checklist

Run these repo checks against the candidate zip/worktree. Exact identifiers below are from current live source and should remain present unless equivalent proof is supplied.

### Shared wording and toast contract

```bash
rtk rg -n "selected records|BULK_NO_CHANGES_MESSAGE|No changes made\\. Selected records already match the chosen value\\.|showOperationalBulkResultToast|showOperationalBulkRevertedToast|showOperationalBulkRevertErrorToast" frontend/src/components/shared frontend/src/components/MonitoringGrid.tsx frontend/src/components/ServicesReal.tsx
```

Expect:
- `frontend/src/components/shared/OperationalLifecycleToasts.ts` still owns `selected records`.
- `frontend/src/components/shared/OperationalLifecycleToasts.ts` still owns the exact no-op message.
- Monitoring and Services still use the shared bulk result/revert toast helpers.

### Monitoring display, views, and bulk flyout

```bash
rtk rg -n "togglePanel|showDisplayMenu|showViewsMenu|showBulkMenu|OperationalDisplayPanel|OperationalSavedViewsPanel|selectedIds.length} monitors selected|OperationalRowActionMenu|restore_purged" frontend/src/components/MonitoringGrid.tsx
```

Expect:
- `togglePanel` still controls `display`, `views`, and `bulk`.
- `OperationalDisplayPanel` and `OperationalSavedViewsPanel` still render.
- bulk flyout still exists and still shows the selected-monitor count.
- `OperationalRowActionMenu` still renders for row actions.
- purge Revert work should stay localized around `restore_purged`, not redesign unrelated Monitoring shell behavior.

### External blocked purge guard

```bash
rtk rg -n "getExternalEntityPurgeGuard|getExternalEntityPurgeReason|disabledReason|linked or credentialed|Detailed blocker names are not available|Linked to .* selected records|OperationalRowActionMenu|OperationalDisplayPanel|OperationalSavedViewsPanel" frontend/src/components/External.tsx
```

Expect:
- External still preserves a blocked purge path.
- blocked purge still exposes a reason through `disabledReason`.
- External still remains on the shared row-action/display/views shell.

### Services purge remains blocked, while non-purge bulk behavior stays shared

```bash
rtk rg -n "SERVICES_PURGE_BLOCKED_REASON|logical-services/bulk-action|countSemanticBulkChanges|showOperationalBulkResultToast|showOperationalBulkRevertedToast|showOperationalBulkRevertErrorToast|disabledReason|OperationalRowActionMenu|OperationalDisplayPanel|OperationalSavedViewsPanel" frontend/src/components/ServicesReal.tsx
```

Expect:
- `SERVICES_PURGE_BLOCKED_REASON` still exists with truthful backend-blocked copy.
- Services still uses `/api/v1/logical-services/bulk-action`.
- Services still uses semantic changed-count logic and shared result/revert toasts for supported actions.
- Services still renders the shared row-action/display/views shell.

### Row-action width / no-wrap law

```bash
rtk rg -n "estimateRowActionHeaderTextWidth|whitespace-nowrap|OperationalDisabledActionTooltip|allowWrap" frontend/src/components/shared/OperationalRowActionMenu.tsx frontend/src/components/shared/OperationalBulkContract.ts
```

Expect:
- shared row-action menu still sizes headers through `estimateRowActionHeaderTextWidth`.
- non-wrapping label behavior remains the default path.
- disabled-action tooltip host remains present.

### Active purge labels must stay normalized

```bash
rtk rg -n "purgeSelection|purgeSelectionConfirm|purgeConfirm|OPERATIONAL_ACTION_LABELS" frontend/src/components/shared/OperationalActionLabels.ts frontend/src/components/shared/OperationalBulkContract.test.ts frontend/src/components/MonitoringGrid.tsx frontend/src/components/External.tsx frontend/src/components/ServicesReal.tsx
```

Expect:
- live action labels still normalize active purge to `Purge`, not `Purge Selection`.
- confirm copy can still differ where intended.

### Negative drift check for unrelated files

```bash
rtk git diff --name-only
```

Expect:
- no `package.json`, `package-lock.json`, `vite.config.ts`, `tailwind.config.js`, `tsconfig*.json`, or unrelated feature components changed for this fix unless the evidence explicitly justifies them.

## 3. Manual/browser spot checks

- Monitoring row selection still works in active and deleted states, and the bulk flyout selected-count text still updates.
- Monitoring `Display` panel still opens, closes, and preserves expected toggles.
- Monitoring `Views` / Saved Views panel still opens, saves, and restores a view without side effects on the purge fix.
- Monitoring bulk update no-op still yields the shared no-change result rather than a fake success.
- External unsafe Purge still does not execute when blocked and still explains why via disabled tooltip/reason text.
- Services purge is still not accidentally executable from row action or bulk UI.
- Services archive/restore/update still produce shared result wording and still allow supported revert behavior.
- Monitoring purge Revert fix does not break Monitoring archive, restore, update, or row-action behavior outside the purge path.

## 4. Artifact review checklist

- Changed files are minimal and directly relevant to Monitoring purge Revert recovery.
- No unrelated components are touched just to move code around.
- No package/config/lockfile changes are present.
- Backend files are included if the zip claims backend truth for purge restore behavior.
- Evidence report is included and clearly distinguishes source proof from browser/runtime proof.
- Tests/results are included, or explicit blockers are documented with dates and failing surface names.

## 5. Regression classification

- CLEAN: protected source patterns remain intact, manual spot checks pass, and Iteration 38 evidence stays narrowly scoped to Monitoring purge Revert recovery.
- SUSPECT: risky shared shell/lifecycle areas were touched, but the zip lacks enough source or runtime evidence to prove preservation.
- REGRESSION: any protected Monitoring, External, Services, shared wording, shared tooltip, or row-action geometry behavior is broken or removed.
- WORSE: Monitoring golden behavior regresses, or unsupported/partial Revert handling becomes more misleading than the current baseline.

## 6. Final note

This checklist is support evidence only. It cannot pass or close OUT-8 by itself.
