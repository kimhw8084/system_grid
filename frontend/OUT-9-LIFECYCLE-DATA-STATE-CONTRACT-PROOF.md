# OUT-9 Lifecycle/Data-State Contract Proof

Audit scope: Monitoring and External only. No runtime behavior changed in this pass.

## 1. Current shared primitives inventory

| Primitive | Owns | Where used now |
| --- | --- | --- |
| `resolveOperationalDataState` in `frontend/src/components/shared/OperationalDataState.ts:1-58` | Canonical lifecycle/data-state vocabulary and resolver ordering: `loading` -> `query-error` -> `raw-empty` -> tab-empty -> `filtered-empty` -> `ready`. | Monitoring calls it at `frontend/src/components/MonitoringGrid.tsx:1342-1357`. External calls it at `frontend/src/components/External.tsx:1887-1918`. Other operational views also use it (`ServicesReal.tsx`, per `frontend/src/components` search). |
| `OperationalDataGrid` in `frontend/src/components/shared/OperationalDataGrid.tsx:32-130` | Grid rendering contract for `dataState`; only `query-error` becomes a dedicated `WorkspaceEmptyState`, all other kinds flow through `noRowsLabel`. | Monitoring passes `dataState={monitoringDataState}` at `frontend/src/components/MonitoringGrid.tsx:2273-2277`. External passes `dataState={externalDataState}` at `frontend/src/components/External.tsx:3300-3304`. |
| `OperationalDataStatus` in `frontend/src/components/shared/OperationalDataStatus.tsx:5-86` | Legacy/parallel status vocabulary (`healthy/loading/error/filtered/empty`), response-shape normalizer, and diagnostic pill/modal UI. | Only Monitoring imports it at `frontend/src/components/MonitoringGrid.tsx:2` and renders `DiagnosticStatusPill` / `DataDiagnosticModal` at `frontend/src/components/MonitoringGrid.tsx:1904-1924`. External does not render it in its header action block (`frontend/src/components/External.tsx:2695-2720`). |
| `OperationalLifecycleContract` in `frontend/src/components/shared/OperationalLifecycleContract.ts:1-57` | Shared action ids (`archive`, `restore`, `purge`), backend action names, revert metadata, and purge `requiresSnapshot`. | Toast builder depends on it via `getOperationalLifecycleActionSpec` (`frontend/src/components/shared/OperationalLifecycleToasts.ts:1-35`). Monitoring maps UI `delete` to shared `archive` at `frontend/src/components/MonitoringGrid.tsx:1658-1659`. External maps UI `delete` to shared `archive` at `frontend/src/components/External.tsx:2328-2333`. |
| `OperationalLifecycleToasts` in `frontend/src/components/shared/OperationalLifecycleToasts.ts:3-35` | Shared success/no-op toast wording for lifecycle and bulk update actions. | Monitoring uses `buildOperationalLifecycleToastMessage` directly for purge revert suppression wording at `frontend/src/components/MonitoringGrid.tsx:1685-1695`, and also via `showOperationalBulkResultToast`. External uses the same shared wording through `showOperationalBulkResultToast` in `frontend/src/components/shared/OperationalBulkContract.ts:63-82` and `frontend/src/components/External.tsx:2328-2338`. |
| `OperationalWorkspaceShell` and grid surface helpers in `frontend/src/components/shared/OperationalWorkspaceShells.tsx:13-114` | Shared page shell, command bar composition, portaled floating panels, and loading overlay surface. | Monitoring wraps the page in `OperationalWorkspaceShell` at `frontend/src/components/MonitoringGrid.tsx:1879-1925`. External does the same at `frontend/src/components/External.tsx:2695-2720`. |

## 2. State contract matrix

Resolver source: `frontend/src/components/shared/OperationalDataState.ts:18-57`. Grid consumption source: `frontend/src/components/shared/OperationalDataGrid.tsx:88-130`.

| State | Resolver condition | Shared output | Render contract |
| --- | --- | --- | --- |
| `ready` | `visibleCount > 0` after earlier checks (`OperationalDataState.ts:52-57`) | `{ kind: 'ready', noRowsLabel: emptyLabel }` | Normal grid body. |
| `loading` | `loading === true` (`OperationalDataState.ts:43`) | `{ kind: 'loading', noRowsLabel: emptyLabel }` | Grid still mounts; `OperationalGridSurface` overlays the loading UI when caller passes `loading` (`OperationalDataGrid.tsx:103-110`, `OperationalWorkspaceShells.tsx:85-113`). |
| `query-error` | `error` truthy (`OperationalDataState.ts:44-50`) | Includes `title` and normalized `description` from `error.message` or fallback (`OperationalDataState.ts:10-15`) | `OperationalDataGrid` short-circuits to `WorkspaceEmptyState` with title/description and disables loading overlay (`OperationalDataGrid.tsx:88-101`). |
| `raw-empty` | `totalCount === 0` (`OperationalDataState.ts:52`) | `{ kind: 'raw-empty', noRowsLabel: emptyLabel }` | Grid empty state via `noRowsLabel`; no special shell treatment. |
| `filtered-empty` | `visibleCount === 0` after nonzero `tabCount` (`OperationalDataState.ts:56`) | `{ kind: 'filtered-empty', noRowsLabel: filteredLabel }` | Grid empty state via filtered label. |
| `active-empty` | `tabCount === 0` with `tabEmptyKind: 'active-empty'` (`OperationalDataState.ts:53-55`) | `{ kind: 'active-empty', noRowsLabel: tabEmptyLabel }` | Grid empty state via active-tab label. |
| `deleted-empty` | `tabCount === 0` with `tabEmptyKind: 'deleted-empty'` (`OperationalDataState.ts:53-55`) | `{ kind: 'deleted-empty', noRowsLabel: tabEmptyLabel }` | Grid empty state via deleted-tab label. |
| Diagnostic/error details | Not part of `OperationalDataState`; only `query-error` owns `title`/`description` (`OperationalDataState.ts:4,44-50`) | Shared contract does not include endpoint/status/raw-body metadata. | Monitoring adds separate diagnostics through `OperationalDataStatus` and `window.__SYSGRID_DATA_DIAGNOSTICS__` (`MonitoringGrid.tsx:578-593`, `1904-1924`). External has no equivalent source-backed diagnostic UI path in this component. |

## 3. Monitoring mapping

- Source query variables: `allItems`, `isLoading`, `isError`, `error` come from `/api/v1/monitoring?include_deleted=true` at `frontend/src/components/MonitoringGrid.tsx:573-576`.
- Tab split: `items` filters `allItems` by `activeTab === 'active' ? !i.is_deleted : i.is_deleted` at `frontend/src/components/MonitoringGrid.tsx:1237-1240`.
- Visible rows: search and quick filters produce `displayedItems`, then `displayedItemsInOrder` is used for resolver counts and raw-grid rows at `frontend/src/components/MonitoringGrid.tsx:1267-1335`.
- Resolver call:
  - `totalCount = Array.isArray(allItems) ? allItems.length : 0`
  - `tabCount = items.length`
  - `visibleCount = displayedItemsInOrder.length`
  - `emptyLabel = "No monitoring data found"`
  - `filteredLabel = "No monitoring results match the current filters"`
  - `tabEmptyKind = activeTab === 'deleted' ? 'deleted-empty' : 'active-empty'`
  - `tabEmptyLabel = activeTab === 'deleted' ? 'No archived monitoring items found' : 'No active monitoring items found'`
  - `errorTitle = "Monitoring data could not be loaded"`
  - `errorDescription = "The monitoring registry request failed."`
  Source: `frontend/src/components/MonitoringGrid.tsx:1342-1357`.
- Active/deleted tab behavior:
  - Header labels are `Existing` and `Archived`, values are still `'active' | 'deleted'`, and tab changes clear selection (`frontend/src/components/MonitoringGrid.tsx:1891-1903`).
  - Summary counts are `${lifecycleCounts.existing} existing · ${lifecycleCounts.archived} archived` (`MonitoringGrid.tsx:1891-1894`).
- Diagnostic behavior:
  - On fetch error, Monitoring stores diagnostic metadata in `window.__SYSGRID_DATA_DIAGNOSTICS__.monitoring` (`frontend/src/components/MonitoringGrid.tsx:578-593`).
  - It also renders `DiagnosticStatusPill` plus `DataDiagnosticModal` in the header actions when `isError` is true, using endpoint, status, statusText, URL, message, and raw body (`frontend/src/components/MonitoringGrid.tsx:1904-1924`).
  - Monitoring imports `classifyDataStatus` and `normalizeOperationalListResponse` from `OperationalDataStatus`, but the visible proof in this file is only the diagnostic pill/modal path (`frontend/src/components/MonitoringGrid.tsx:2`, `1904-1924`).
- Grid/shell rendering path:
  - Page shell: `OperationalWorkspaceShell` (`frontend/src/components/MonitoringGrid.tsx:1879-1925`).
  - Raw-grid fallback condition: `groupBy === 'raw' || monitoringDataState.kind !== 'ready'` (`frontend/src/components/MonitoringGrid.tsx:1359`).
  - Data grid receives `rows={displayedItemsInOrder}`, `dataState={monitoringDataState}`, and `loading={isLoading}` (`frontend/src/components/MonitoringGrid.tsx:2268-2277`).

## 4. External mapping

- Source query variables:
  - Entity query: `allEntities`, `isLoading`, `isEntityError`, `entityError` from `/api/v1/intelligence/entities?include_deleted=true` (`frontend/src/components/External.tsx:1628-1631`).
  - Links query: `links`, `linkLoading`, `isLinkError`, `linkError` from `/api/v1/intelligence/links` (`frontend/src/components/External.tsx:1649-1652`).
- Tabs:
  - `activeTab` is declared as `'active' | 'deleted' | 'links'`, but initial state only restores `'deleted'` or defaults to `'active'`; `'links'` is not restored from persisted state on first load (`frontend/src/components/External.tsx:1479`).
  - Entity list filters `allEntities` by `is_deleted` for active/deleted tabs (`frontend/src/components/External.tsx:1730-1743`).
  - Links list is separate and never filtered by deletion state (`frontend/src/components/External.tsx:1820-1850`).
- Resolver call:
  - `loading` chooses `linkLoading` in links tab, otherwise entity `isLoading`.
  - `error` chooses `linkError` in links tab, otherwise `entityError`.
  - `totalCount` is `links.length` in links tab, otherwise `allEntities.length`.
  - `tabCount` is `links.length` in links tab, otherwise `entities.length`.
  - `visibleCount` is `filteredLinks.length` in links tab, otherwise `filteredEntities.length`.
  - Labels switch between links wording and entity wording.
  - `tabEmptyKind` is still only `'deleted-empty'` or `'active-empty'`, even with a third `links` tab.
  Source: `frontend/src/components/External.tsx:1887-1918`.
- Active/deleted/links tab behavior:
  - Header labels are `Active`, `Archived`, and `Links`, with summary `${registryCounts.active} active · ${registryCounts.archived} archived · ${registryCounts.links} links` (`frontend/src/components/External.tsx:2695-2719`).
  - In links tab, `tabCount === totalCount === links.length`, so `active-empty` cannot be reached unless the resolver changes; zero links go to `raw-empty`, and filtered-zero links go to `filtered-empty` (`frontend/src/components/External.tsx:1893-1903` with resolver ordering in `OperationalDataState.ts:52-56`).
- Diagnostic behavior:
  - No `DiagnosticStatusPill` or `DataDiagnosticModal` is rendered in the header action block; the header actions only show the `HeaderScopeSwitch` (`frontend/src/components/External.tsx:2695-2720`).
  - No component-local equivalent of Monitoring’s `window.__SYSGRID_DATA_DIAGNOSTICS__` write is present in the audited sections.
- Grid/shell rendering path:
  - Page shell: `OperationalWorkspaceShell` (`frontend/src/components/External.tsx:2695-2720`).
  - Raw-grid fallback uses the same operational pattern; `OperationalDataGrid` receives either `filteredLinks` or `filteredEntities`, `dataState={externalDataState}`, and tab-specific loading (`frontend/src/components/External.tsx:3284-3304`).

## 5. Backend/API lifecycle support matrix

### Monitoring

| Capability | Status | Proof |
| --- | --- | --- |
| List active + deleted rows | `verified` | `GET /monitoring` supports `include_deleted` in `backend/app/api/monitoring.py:638-708`. UI uses that exact query at `frontend/src/components/MonitoringGrid.tsx:573-576`. |
| Archive/delete | `verified` | Bulk archive is `action == "delete"` in `backend/app/api/monitoring.py:803-835`; single delete route also soft-deletes and writes history in `backend/app/api/monitoring.py:990-999`. |
| Restore archived | `verified` | Bulk restore is `action == "restore"` in `backend/app/api/monitoring.py:862-884`. |
| Purge | `verified` | Bulk purge is `action == "purge"` in `backend/app/api/monitoring.py:836-839`. |
| Purge revert from snapshots | `verified` | Backend supports `action == "restore_purged"` and requires `payload.snapshots` at `backend/app/api/monitoring.py:840-861`; snapshot restoration logic lives in `restore_purged_monitoring_item_from_snapshot` at `backend/app/api/monitoring.py:539-606`. Monitoring UI probes and uses that support at `frontend/src/components/MonitoringGrid.tsx:1556-1564`, `1579-1615`, `1679-1682`. |
| History snapshots/deltas | `verified` | `GET /monitoring/{item_id}/history` returns `snapshot`, `delta`, `changed_fields`, `changed_labels`, `previous_version` in `backend/app/api/monitoring.py:608-636`. |
| Restore to historical snapshot | `verified` | `POST /monitoring/{item_id}/restore/{history_id}` applies a stored history snapshot in `backend/app/api/monitoring.py:1000-1055`. Monitoring history modal calls that route at `frontend/src/components/MonitoringGrid.tsx:3460-3469`. |

### External entities / links

| Capability | Status | Proof |
| --- | --- | --- |
| List active + deleted entities | `verified` | `GET /intelligence/entities` supports `include_deleted` in `backend/app/api/intelligence.py:248-255`. UI uses that exact query at `frontend/src/components/External.tsx:1628-1631`. |
| List links | `verified` | `GET /intelligence/links` returns enriched link rows in `backend/app/api/intelligence.py:421-450`. UI uses it at `frontend/src/components/External.tsx:1649-1652`. |
| Archive/delete entity | `verified` | `DELETE /intelligence/entities/{id}` soft-deletes when `purge` is false at `backend/app/api/intelligence.py:362-383`. |
| Restore archived entity | `verified` | `POST /intelligence/entities/{id}/restore` restores after ownership and uniqueness checks at `backend/app/api/intelligence.py:310-360`. |
| Purge entity | `verified` | `DELETE /intelligence/entities/{id}?purge=true` hard-deletes only when no links and no secrets exist at `backend/app/api/intelligence.py:368-377`. External UI mirrors those guards in `frontend/src/components/External.tsx:1663-1675` and `2402-2413`. |
| Delete link | `verified` | `DELETE /intelligence/links/{id}` exists at `backend/app/api/intelligence.py:481-490`. |
| Bulk lifecycle endpoint | `not supported` | In the audited backend route file there is no `/intelligence/.../bulk-action` route between entity and link handlers (`backend/app/api/intelligence.py:248-490`). External bulk UI fans out per-id requests client-side instead of hitting a backend bulk endpoint (`frontend/src/components/External.tsx:2198-2240`). |
| Backend snapshot/history API for entities | `not supported` | No history or snapshot route exists in the audited `backend/app/api/intelligence.py:248-490`; External UI also sets `isHistoryOpen: false` in its detail-route wiring (`frontend/src/components/External.tsx:1634-1642`). |
| Revert archive/restore | `verified` for archive/restore only | External UI can truthfully revert archive by calling restore and revert restore by calling delete again using current entity ids (`frontend/src/components/External.tsx:2286-2323`, `2434-2444`), and backend routes exist for those actions (`backend/app/api/intelligence.py:310-383`). |
| Revert purge | `not supported` | Backend purge permanently deletes the entity with no snapshot restore route (`backend/app/api/intelligence.py:368-377`). External UI also clears undo for purge by only storing undo state for `delete`, `restore`, and `update`, not `purge` (`frontend/src/components/External.tsx:2316-2325`). |
| Revert update via backend snapshot | `not supported` | External UI replays selected fields from locally captured `previousSnapshots` using `PUT /entities/{id}` (`frontend/src/components/External.tsx:2292-2305`), but there is no backend history/snapshot API in `backend/app/api/intelligence.py:248-490`. |

## 6. Divergence list

| Difference | Classification | Proof |
| --- | --- | --- |
| Monitoring has only `active/deleted`; External has `active/deleted/links`. | Intended domain difference. | Monitoring scope switch has 2 options at `frontend/src/components/MonitoringGrid.tsx:1891-1903`. External has 3 at `frontend/src/components/External.tsx:2706-2718`. |
| Monitoring labels active rows as `Existing`; External labels them `Active`. | Intended domain difference. | Monitoring summary/options at `frontend/src/components/MonitoringGrid.tsx:1893-1901`; External at `frontend/src/components/External.tsx:2708-2717`. |
| Monitoring has a diagnostic pill/modal and writes structured error diagnostics; External does not. | Regression risk. | Monitoring diagnostics at `frontend/src/components/MonitoringGrid.tsx:578-593`, `1904-1924`; External header action block lacks any equivalent at `frontend/src/components/External.tsx:2695-2720`. |
| Shared resolver only names `active-empty` and `deleted-empty`, but External has a third `links` tab. | Unresolved gap. | Resolver accepts only `tabEmptyKind: 'active-empty' | 'deleted-empty'` in `OperationalDataState.ts:38`; External still routes links through that API at `frontend/src/components/External.tsx:1887-1903`. |
| In External links tab, `active-empty` is effectively unreachable because `tabCount` and `totalCount` are both `links.length`. | Unresolved gap. | External resolver counts at `frontend/src/components/External.tsx:1893-1897`; resolver ordering at `OperationalDataState.ts:52-56`. |
| Monitoring purge revert is backend-supported and snapshot-based; External purge has no truthful revert. | Intended domain/backend difference with implementation consequence. | Monitoring backend/UI support at `backend/app/api/monitoring.py:539-606`, `803-861`, `frontend/src/components/MonitoringGrid.tsx:1556-1564`, `1679-1682`; External purge deletes permanently at `backend/app/api/intelligence.py:368-377` and UI stores no purge undo at `frontend/src/components/External.tsx:2316-2325`. |
| Monitoring has backend history snapshots and restore-to-version UI; External has neither. | Intended domain/backend difference. | Monitoring history API at `backend/app/api/monitoring.py:608-636`, restore route at `1000-1055`, UI modal at `frontend/src/components/MonitoringGrid.tsx:3315-3475`; External detail route explicitly disables history at `frontend/src/components/External.tsx:1634-1642`. |
| Monitoring bulk actions use one backend bulk endpoint; External bulk actions fan out into per-entity requests. | Intended current architecture, but regression risk for consistency/error handling. | Monitoring bulk mutation posts once to `/api/v1/monitoring/bulk-action` at `frontend/src/components/MonitoringGrid.tsx:1626-1636`; External bulk mutation loops per id at `frontend/src/components/External.tsx:2202-2240`. |
| External persisted `activeTab` restore only honors `deleted`, not `links`. | Unresolved gap. | Initial state is `persistedUiState.activeTab === 'deleted' ? 'deleted' : 'active'` at `frontend/src/components/External.tsx:1479`, while the runtime supports `links` in the scope switch at `frontend/src/components/External.tsx:2706-2718`. |

## 7. Shared-vs-domain boundary

The shared contract should own:

- The state vocabulary and ordering: `ready`, `loading`, `query-error`, `raw-empty`, `filtered-empty`, tab-empty variants (`frontend/src/components/shared/OperationalDataState.ts:18-57`).
- The query-error rendering rule for operational grids (`frontend/src/components/shared/OperationalDataGrid.tsx:88-101`).
- Shared lifecycle action ids, label mapping, purge snapshot requirement metadata, and success/no-op toast wording (`frontend/src/components/shared/OperationalLifecycleContract.ts:1-57`, `frontend/src/components/shared/OperationalLifecycleToasts.ts:3-35`).
- Page-shell and loading-surface structure (`frontend/src/components/shared/OperationalWorkspaceShells.tsx:22-114`).

Each domain should keep owning:

- Query source selection and count inputs for the resolver.
- Domain labels for empty/error text.
- Scope/tab taxonomy, including whether a third tab like `links` exists.
- Domain-specific diagnostics metadata, because shared `OperationalDataState` does not currently model endpoint/status/raw-body details.
- Truthful undo/revert strategy based on backend support. Monitoring can own snapshot-based purge/history restore (`frontend/src/components/MonitoringGrid.tsx:1547-1705`); External must keep ownership/secret/link purge guards and accept that purge has no revert (`frontend/src/components/External.tsx:1663-1675`, `2198-2338`, `2402-2444`).

## 8. Smallest safe next implementation target

Recommended target: implementation.

Smallest safe target:

- Add External query-error diagnostics only, without changing shared lifecycle behavior or adding new empty states yet.
- Reason: the shared resolver already produces `query-error` for both entity and links fetches (`frontend/src/components/External.tsx:1887-1903`), but only Monitoring exposes human-usable diagnostics (`frontend/src/components/MonitoringGrid.tsx:1904-1924`). This is the clearest cross-domain contract mismatch that can be fixed without inventing unsupported backend behavior.
- Boundaries for that implementation:
  - Keep `resolveOperationalDataState` semantics unchanged.
  - Do not claim purge revert or history for External.
  - Make diagnostics tab-aware so `links` errors identify `/api/v1/intelligence/links` and entity errors identify `/api/v1/intelligence/entities?include_deleted=true`.

Not the next target yet:

- Adding a new shared `links-empty` state. Evidence shows a vocabulary gap, but it is lower risk than the current missing External diagnostic surface because links still degrade to truthful `raw-empty` / `filtered-empty` labels today (`frontend/src/components/External.tsx:1898-1903`).

## 9. Focused test/typecheck evidence

Command run:

```bash
rtk npm run test:unit -- src/components/shared/OperationalDataState.test.ts src/components/shared/OperationalLifecycleToasts.test.ts src/components/shared/OperationalDataGrid.contract.test.ts src/components/shared/OperationalBulkContract.test.ts
```

Result:

- Passed: 4 test files, 23 tests.
- Covered evidence:
  - `OperationalDataState.test.ts` proves distinct `loading`, `query-error`, `raw-empty`, `active-empty`, `filtered-empty`, `ready`, and `deleted-empty` outcomes (`frontend/src/components/shared/OperationalDataState.test.ts`).
  - `OperationalLifecycleToasts.test.ts` proves exact archive/restore/purge shared wording (`frontend/src/components/shared/OperationalLifecycleToasts.test.ts`).
  - `OperationalDataGrid.contract.test.ts` proves `query-error` remains an explicit grid contract and does not rely on legacy overlay props (`frontend/src/components/shared/OperationalDataGrid.contract.test.ts:5-14`).
  - `OperationalBulkContract.test.ts` proves shared bulk toast wiring, including purge wording and revert callback propagation (`frontend/src/components/shared/OperationalBulkContract.test.ts`).

No broader typecheck or runtime workflow tests were run in this audit pass.

## 10. Human-eye checklist

- Loading:
  - Monitoring: force `/api/v1/monitoring?include_deleted=true` slow; verify loading overlay text is `Scanning monitoring matrix...` and no empty-state copy appears first (`frontend/src/components/MonitoringGrid.tsx:2275-2277`).
  - External entities: force `/api/v1/intelligence/entities?include_deleted=true` slow; verify `Synchronizing Intelligence Matrix...` overlay (`frontend/src/components/External.tsx:3302-3304`).
  - External links: switch to `Links`, slow `/api/v1/intelligence/links`; verify same overlay and that entity query state does not control it (`frontend/src/components/External.tsx:1889-1892`, `3302-3304`).
- Raw empty:
  - Monitoring: zero monitors in backend should show `No monitoring data found` (`frontend/src/components/MonitoringGrid.tsx:1349`).
  - External entities: zero entities should show `No external registry data found` (`frontend/src/components/External.tsx:1898`).
  - External links: zero links should show `No external links found` (`frontend/src/components/External.tsx:1898`).
- Filtered empty:
  - Apply search/filters until visible rows hit 0 while tab still has rows; verify Monitoring shows `No monitoring results match the current filters` and External shows the tab-specific filtered label (`frontend/src/components/MonitoringGrid.tsx:1350`, `frontend/src/components/External.tsx:1899`).
- Active empty:
  - Monitoring active tab with only deleted rows should show `No active monitoring items found` (`frontend/src/components/MonitoringGrid.tsx:1351-1352`).
  - External active tab with only deleted entities should show `No active external entities found` (`frontend/src/components/External.tsx:1900-1901`).
- Deleted empty:
  - Monitoring deleted tab with no deleted rows should show `No archived monitoring items found` (`frontend/src/components/MonitoringGrid.tsx:1351-1352`).
  - External deleted tab with no deleted entities should show `No archived external entities found` (`frontend/src/components/External.tsx:1900-1901`).
- Query error:
  - Break Monitoring list request; verify `WorkspaceEmptyState` shows `Monitoring data could not be loaded` and the error message text (`frontend/src/components/MonitoringGrid.tsx:1353-1354`, `frontend/src/components/shared/OperationalDataGrid.tsx:88-101`).
  - Break External entities request on `Active`/`Archived`; verify `External entities could not be loaded` (`frontend/src/components/External.tsx:1902-1903`).
  - Break External links request on `Links`; verify `External links could not be loaded` (`frontend/src/components/External.tsx:1902-1903`).
- Diagnostic states:
  - Monitoring: on query error, verify header pill appears and opens a modal with endpoint, status, URL, tenant, and raw body (`frontend/src/components/MonitoringGrid.tsx:1904-1924`).
  - External: on query error, verify there is currently no equivalent diagnostic affordance in the header. This absence is part of the audited gap (`frontend/src/components/External.tsx:2695-2720`).

## Final recommendation

Recommended next prompt type: `implementation`.

## Iteration 02 Implementation Evidence

### 1. Files changed

- `frontend/src/components/External.tsx`
- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/shared/OperationalDataStatus.tsx`
- `frontend/src/components/shared/OperationalDataStatus.test.ts`
- `frontend/OUT-9-LIFECYCLE-DATA-STATE-CONTRACT-PROOF.md`

### 2. Exact External diagnostic behavior added

- External now derives one active query-error source from the current scope tab:
  - `Active` / `Archived` tabs use the entity query error.
  - `Links` tab uses the links query error.
  Source: `frontend/src/components/External.tsx:1923-1935`.
- When the active tab has a query error, the existing header action area now shows `DiagnosticStatusPill` and opens `DataDiagnosticModal` without removing or changing the `HeaderScopeSwitch`.
  Source: `frontend/src/components/External.tsx:2727-2754`.
- The grid’s existing `externalDataState` `query-error` path is unchanged; the new affordance is additive to the header only.
  Source: `frontend/src/components/External.tsx:1889-1906`, `3284-3304`; `frontend/src/components/shared/OperationalDataGrid.tsx:88-101`.

### 3. Entity error diagnostic path

- Entity fetch remains `/api/v1/intelligence/entities?include_deleted=true` from `useQuery`.
  Source: `frontend/src/components/External.tsx:1628-1631`.
- On `Active` or `Archived`, the diagnostic detail builder receives:
  - `endpoint: '/api/v1/intelligence/entities?include_deleted=true'`
  - `error: activeExternalQueryError`
  - `fallbackMessage: 'The external entities request failed.'`
  Source: `frontend/src/components/External.tsx:1927-1935`.
- The modal then displays endpoint, status, status text, URL, user id, tenant id, message, and raw body / parsed data through the shared modal contract.
  Source: `frontend/src/components/shared/OperationalDataStatus.tsx:103-127`.

### 4. Links error diagnostic path

- Links fetch remains `/api/v1/intelligence/links` from `useQuery`.
  Source: `frontend/src/components/External.tsx:1649-1652`.
- On `Links`, the diagnostic detail builder receives:
  - `endpoint: '/api/v1/intelligence/links'`
  - `error: activeExternalQueryError`
  - `fallbackMessage: 'The external links request failed.'`
  Source: `frontend/src/components/External.tsx:1927-1935`.
- Because the header diagnostic affordance is keyed off `activeExternalQueryError`, the links-tab modal is only shown while the Links tab is the currently failing data source.
  Source: `frontend/src/components/External.tsx:1923-1939`, `2743-2754`.

### 5. Shared primitives reused or created

- Reused unchanged:
  - `DiagnosticStatusPill`
  - `DataDiagnosticModal`
  - `resolveOperationalDataState`
  - `OperationalDataGrid`
- Added one small shared helper:
  - `buildOperationalDiagnosticDetail` in `frontend/src/components/shared/OperationalDataStatus.tsx:46-73`
- Helper behavior:
  - Preserves available `apiFetch` error fields.
  - Supplies honest fallbacks for missing `status`, `statusText`, and `url` as `Unavailable from current error object`.
  - Uses the provided fallback message when `error.message` is absent.
  Source: `frontend/src/components/shared/OperationalDataStatus.tsx:46-73`.
- Monitoring now also uses that helper to shape the same diagnostic payload it already exposed, without changing Monitoring’s resolver or lifecycle behavior.
  Source: `frontend/src/components/MonitoringGrid.tsx:1904-1918`.

### 6. Explicit non-changes

- Resolver unchanged:
  - `resolveOperationalDataState` was not modified.
  Source remains `frontend/src/components/shared/OperationalDataState.ts:18-57`.
- No `links-empty` added:
  - External still routes links through the existing resolver vocabulary.
  Source remains `frontend/src/components/External.tsx:1889-1906`.
- No backend changes:
  - No backend files were edited in this iteration.
- No purge/history/revert claims added to External:
  - External diagnostics are read-only query-error affordances only.
  - External lifecycle behavior remains the same file/paths as before.
  Source unchanged in `frontend/src/components/External.tsx:2198-2447`.
- No route/table/modal/floating/import-export changes:
  - `OperationalDataGrid` query-error rendering path is unchanged.
  Source: `frontend/src/components/shared/OperationalDataGrid.tsx:88-101`.
  - External scope switch options and behavior are unchanged except for adjacent diagnostics UI.
  Source: `frontend/src/components/External.tsx:2729-2742`.

### 7. Tests run and exact results

Command run:

```bash
rtk npm run test:unit -- src/components/shared/OperationalDataStatus.test.ts src/components/shared/OperationalDataState.test.ts src/components/shared/OperationalLifecycleToasts.test.ts src/components/shared/OperationalDataGrid.contract.test.ts src/components/shared/OperationalBulkContract.test.ts
```

Result:

- Passed: 5 test files, 25 tests.
- New coverage:
  - `OperationalDataStatus.test.ts` proves the helper preserves real `apiFetch` error fields and uses honest fallbacks when fields are absent.
  Source: `frontend/src/components/shared/OperationalDataStatus.test.ts:5-55`.
- Existing shared lifecycle/data-state contract tests still pass unchanged.

### 8. Human-eye checklist

- Entity query failure on Active tab:
  - Break `/api/v1/intelligence/entities?include_deleted=true` while `Active` is selected.
  - Verify grid still shows `External entities could not be loaded`.
  - Verify header pill appears and modal endpoint is `/api/v1/intelligence/entities?include_deleted=true`.
- Entity query failure on Archived tab:
  - Break the same entity request while `Archived` is selected.
  - Verify header pill appears and the scope switch still changes tabs normally.
  - Verify modal message distinguishes entities, not links.
- Links query failure on Links tab:
  - Break `/api/v1/intelligence/links` while `Links` is selected.
  - Verify grid still shows `External links could not be loaded`.
  - Verify header pill appears and modal endpoint is `/api/v1/intelligence/links`.
- Scope switch still works:
  - Switch among `Active`, `Archived`, and `Links`.
  - Verify the existing `HeaderScopeSwitch` summary and selection behavior are unchanged.
- Grid query-error copy still appears:
  - Verify the page still renders the `WorkspaceEmptyState` query-error copy through `OperationalDataGrid`, not a new overlay path.
- Diagnostic affordance opens and displays truthful endpoint/message data:
  - If `apiFetch` provides `status`, `statusText`, `url`, `message`, and `rawBody`, verify those exact values appear.
  - If any of `status`, `statusText`, or `url` are missing, verify the modal shows `Unavailable from current error object` instead of an invented value.

### 9. Verdict recommendation

- Recommended verdict: `PASS`

Reason:

- External now exposes a source-backed diagnostic affordance for both entity and links query errors.
- The affordance is tab-aware.
- Existing query-error grid behavior remains intact.
- Shared resolver semantics were not changed.
- No unsupported External lifecycle/history/purge-revert behavior was added.

### 10. Score recommendation

- Recommended score: `9/10`

Reason:

- The implementation is narrow and evidence-backed.
- Remaining gap is human-eye/runtime validation of the modal in the live app, not contract coverage or source truthfulness.

### 11. Lesson learned

- The safest way to standardize diagnostics here was not to touch the lifecycle resolver at all; the stable seam was the already-existing pill/modal pair plus a tiny shared detail-shaping helper that consumes the current `apiFetch` error shape.

### 12. Next prompt rule

- If the next iteration continues this thread, keep it verification-focused first:
  - validate the new External diagnostics in the live app on entity and links failures,
  - then only address the `links`-tab vocabulary gap if the reviewer explicitly wants shared empty-state taxonomy work.

## Iteration 03 Recovery / Cleanup / Validation

### 1. Final changed-file list

Tracked final changed-file list for this Iteration 03 recovery pass:

- `frontend/OUT-9-LIFECYCLE-DATA-STATE-CONTRACT-PROOF.md`

Tracked audit commands:

```bash
rtk git status --short --untracked-files=no
rtk git diff --name-status
rtk git diff --name-status --cached
```

Recovery result:

- No tracked deletions were present.
- No tracked unrelated modifications were present.
- The current OUT-9 implementation files were already clean in the working tree at audit time.
- Iteration 03 therefore only updates this proof artifact to document the clean review boundary and validation evidence.

### 2. Confirmation that unrelated OUT-8 / OUT-10 / OUT-11 / OUT-12 / RUN3 proof deletions are not present in the final diff

- Confirmed: no unrelated proof/history files are present as tracked deletions in the final diff.
- `rtk git diff --name-status` returned no tracked file deletions before the Iteration 03 proof update.
- The repo does contain unrelated untracked proof files such as `frontend/OUT-10-*`, `frontend/OUT-11-*`, `frontend/OUT-12-*`, `frontend/OUT-8-*`, and `frontend/RUN3-*` in `git status --short`, but they are untracked and therefore outside the tracked OUT-9 diff.
- Per prompt constraints, these untracked project-memory/proof artifacts were not deleted to “clean” the repo.

### 3. External entity diagnostics behavior

- External entity failures on `Active` / `Archived` still flow through `externalDataState` `query-error`.
  Source: `frontend/src/components/External.tsx:1889-1906`.
- When the active tab is not `links`, `activeExternalQueryError` resolves to `entityError`.
  Source: `frontend/src/components/External.tsx:1923-1925`.
- The diagnostic detail payload for entity failures is built with:
  - `endpoint: '/api/v1/intelligence/entities?include_deleted=true'`
  - `fallbackMessage: 'The external entities request failed.'`
  Source: `frontend/src/components/External.tsx:1927-1935`.
- The existing header action area now shows `DiagnosticStatusPill` and opens `DataDiagnosticModal` when that active entity query error exists.
  Source: `frontend/src/components/External.tsx:2727-2754`.

### 4. External links diagnostics behavior

- Links failures still flow through the existing `externalDataState` `query-error` path when `activeTab === 'links'`.
  Source: `frontend/src/components/External.tsx:1891-1905`.
- When the active tab is `links`, `activeExternalQueryError` resolves to `linkError`.
  Source: `frontend/src/components/External.tsx:1923-1924`.
- The diagnostic detail payload for links failures is built with:
  - `endpoint: '/api/v1/intelligence/links'`
  - `fallbackMessage: 'The external links request failed.'`
  Source: `frontend/src/components/External.tsx:1927-1935`.
- The same pill/modal affordance is reused in the header while preserving the existing scope switch.
  Source: `frontend/src/components/External.tsx:2729-2754`.

### 5. Monitoring behavior preservation

- Monitoring changed only to reuse the shared diagnostic-detail helper.
- Monitoring still renders the same `DiagnosticStatusPill` and `DataDiagnosticModal` only on `isError`.
- Monitoring endpoint and fallback message remain `/api/v1/monitoring?include_deleted=true` and `The monitoring registry request failed.`
  Source: `frontend/src/components/MonitoringGrid.tsx:1904-1918`.
- No Monitoring resolver, lifecycle, grid, history, or purge behavior was changed in this cleanup pass.

### 6. Shared helper contract and test coverage

- Shared helper: `buildOperationalDiagnosticDetail`
  Source: `frontend/src/components/shared/OperationalDataStatus.tsx:46-73`.
- Contract:
  - preserve available `apiFetch` error fields: `status`, `statusText`, `url`, `message`, `rawBody`, `data`;
  - provide honest fallback text `Unavailable from current error object` when the error object lacks `status`, `statusText`, or `url`;
  - default `userId` / `tenantId` from local storage when available.
- Test coverage:
  - preserves available fields
  - uses honest fallbacks for missing fields
  Source: `frontend/src/components/shared/OperationalDataStatus.test.ts:5-55`.

### 7. Tests run and exact results

Command run:

```bash
rtk npm run test:unit -- src/components/shared/OperationalDataStatus.test.ts src/components/shared/OperationalDataState.test.ts src/components/shared/OperationalDataGrid.contract.test.ts src/components/shared/OperationalBulkContract.test.ts src/components/shared/OperationalLifecycleToasts.test.ts
```

Exact result:

- Passed: 5 test files, 25 tests.
- Duration: 1.26s test run, with existing Vite `esbuild` / `oxc` deprecation warnings only.

### 8. Human-eye validation checklist or result

Human-eye checklist:

- Break `/api/v1/intelligence/entities?include_deleted=true` on `Active`; verify:
  - grid still shows entity query-error copy;
  - header pill appears;
  - modal endpoint is `/api/v1/intelligence/entities?include_deleted=true`.
- Repeat on `Archived`; verify:
  - same entity endpoint;
  - scope switch still works;
  - no Links-specific wording appears.
- Break `/api/v1/intelligence/links` on `Links`; verify:
  - grid still shows links query-error copy;
  - header pill appears;
  - modal endpoint is `/api/v1/intelligence/links`.
- Verify missing detail fields render `Unavailable from current error object` instead of guessed values.
- Verify Monitoring still shows its diagnostic pill/modal on monitoring query error.

Result:

- Manual browser validation was not run in this Iteration 03 cleanup pass.
- Source review plus focused tests support the contract behavior.

### 9. Verdict recommendation

- Recommended verdict: `PASS`

Reason:

- The OUT-9 implementation remains narrow and correct.
- No tracked unrelated deletions remain in the final diff.
- External diagnostics are tab-aware and source-backed.
- The required focused test suite passes.

### 10. Score recommendation

- Recommended score: `9/10`

Reason:

- Recovery goal is satisfied for tracked diff cleanliness.
- Remaining gap is live human-eye validation only, not source contract correctness.

### 11. Lesson learned

- Cleanup prompts need a tracked-vs-untracked audit first. In this repo state, the real recovery issue was not tracked deletions but a noisy untracked proof inventory that should be excluded from the review capsule rather than deleted.

### 12. Next prompt rule

- If another recovery/validation pass is requested, require the prompt to specify whether the review capsule should be based on:
  - tracked diff only, or
  - full working-tree status including unrelated untracked artifacts.
