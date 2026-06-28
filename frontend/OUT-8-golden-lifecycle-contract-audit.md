# OUT-8 Golden Lifecycle Contract Audit

## Verdict
PARTIAL_IMPLEMENTATION_REQUIRED

## Golden Lifecycle Law
1. all golden-template views support Archive, Restore, Purge
2. all successful Archive, Restore, Purge show truthful toast Revert
3. linked entities block Purge with detailed hover/focus reason
4. archived linked entities remain routable/openable
5. lifecycle behavior is centralized

## Proof Command Summary
- Golden/shared operational views search found `MonitoringGrid`, `External`, `AssetReal`, `NetworkReal`, and `ServicesReal` using shared operational lifecycle helpers. `VendorsReal` uses the shared grid shell but not shared lifecycle helpers. `Racks` and `ServiceRegistry` do not show shared operational lifecycle helper usage in the same shape.
- Forbidden copy search found no active `selected record` source usage in the current shared helper, but repo-wide matches still exist in historical/report files. `Purge Selection` no longer appears in active audited source files, but historical/report artifacts still contain it.
- Backend lifecycle search confirmed only Monitoring exposes a true purge-revert backend path via `restore_purged`.
- Services lifecycle search confirmed `ServicesReal` is a golden-style operational view, but backend `logical_services` bulk action still rejects `purge`.
- External dependency guard search confirmed only External has a purge blocker, and its user-facing reason is still the generic string `Cannot purge selected external records because one or more are still linked or credentialed.`
- Link-routing search confirmed archived detail routing exists for `MonitoringGrid`, `External`, `AssetReal`, `NetworkReal`, and `ServicesReal` through `include_deleted=true` lists and detail-route state sync.
- Audit file existence proof passed: `frontend/OUT-8-golden-lifecycle-contract-audit.md` exists.

## Golden Template View Inventory
| View | File | Uses Golden Template? | Shared Bulk? | Shared Row Action? | Backend Entity | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Monitoring | `frontend/src/components/MonitoringGrid.tsx` | Yes | Yes | Yes | `monitoring` | Imports `showOperationalBulkResultToast` and `OperationalRowActionMenu`; deleted-state lifecycle query uses `include_deleted=true` | Strongest shared implementation; only audited entity with purge restore backend |
| External | `frontend/src/components/External.tsx` | Yes | Yes | Yes | `intelligence/entities` | Imports `showOperationalBulkResultToast` and `OperationalRowActionMenu`; deleted-state entity query uses `include_deleted=true` | Has local purge guard and shared bulk toast helper |
| AssetReal | `frontend/src/components/AssetReal.tsx` | Yes | Partial: local mutation, shared wording not fully centralized | No shared row action menu | `devices` | Shared operational workspace shell plus deleted-state `devices?include_deleted=true` query; no `OperationalRowActionMenu` import | Shared operational shell, but lifecycle logic is local |
| NetworkReal | `frontend/src/components/NetworkReal.tsx` | Yes | Partial: local mutation, shared wording not fully centralized | No shared row action menu | `networks/connections` | Shared operational workspace shell plus deleted-state `connections?include_deleted=true` query; no `OperationalRowActionMenu` import | Shared operational shell, but lifecycle logic is local |
| ServicesReal | `frontend/src/components/ServicesReal.tsx` | Yes | Yes | Yes | `logical-services` | Imports shared bulk helper and `OperationalRowActionMenu`; deleted-state `logical-services?include_deleted=true` query | Golden-style shared operational view; backend lacks purge |
| VendorsReal | `frontend/src/components/VendorsReal.tsx` | Uncertain / partial only | No shared lifecycle contract | No | `vendors` | Uses shared grid shell, but no deleted lifecycle view and no shared bulk helper import | Shared grid shell only; no deleted tab lifecycle parity |
| Racks | `frontend/src/components/Racks.tsx` | No source proof | No | No | `racks` | Uses `racks?include_deleted=true` and local bulk action flow; no shared lifecycle helper imports found | Operational workflow exists, but not on the shared golden lifecycle contract |
| ServiceRegistry | `frontend/src/components/ServiceRegistry.tsx` | No source proof | No | No | `logical-services` | Uses `logical-services?include_deleted=true` and local purge/restore copy; no shared lifecycle helper imports found | Legacy/service-specific lifecycle model, not golden contract |

## View Coverage Matrix
| View | Archive | Restore | Purge | Archive Revert | Restore Revert | Purge Revert | Dependency Guard | Disabled Reason Hover/Focus | Archived Link Routing | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Monitoring | Yes | Yes | Yes | Yes | Yes | Yes | No | No source proof | Yes | Partial: strongest, but not centralized and no purge guard |
| External | Yes | Yes | Yes | Yes | Yes | No truthful purge revert | Yes, but entity-local only | Partial: generic message, inconsistent disabled-native behavior | Yes | Partial: unsafe purge revert and non-detailed blocker copy |
| AssetReal | Yes | Yes | Yes | Yes | Yes | No | No | No | Yes | Partial: destructive purge |
| NetworkReal | Yes | Yes | Yes | Yes | Yes | No | No | No | Yes | Partial: destructive purge |
| ServicesReal | Yes | Yes | No backend support | Yes | Yes | No | No | No | Yes | Non-compliant: golden view lacks purge |
| VendorsReal | Yes | No deleted-scope UI source proof | No | Yes | No | No | No | No | No source proof | Non-compliant / uncertain |
| Racks | Yes | Yes | Yes | No source proof | No source proof | No | No | No | No source proof | Not on shared contract and destructive purge |
| ServiceRegistry | Delete model only | Yes | No truthful purge path | No source proof | No source proof | No | No | No | No source proof | Not golden-contract compliant |

## Backend Capability Matrix
| Entity | Archive Backend | Restore Backend | Purge Backend | Revert Backend | Dependency Lookup | Archived Detail Lookup | Gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Monitoring | Yes: `/api/v1/monitoring/bulk-action` `delete` | Yes: `restore` | Yes: `purge` | Yes: `restore_purged` with snapshots | No | Yes: `include_deleted=true` | Missing purge guard and centralized contract |
| External | Yes: `DELETE /api/v1/intelligence/entities/{id}` | Yes: `POST /restore` | Yes: `DELETE ?purge=true` | No purge restore backend | Partial: links and secrets only | Yes: `include_deleted=true` | No truthful purge revert; blocker detail is coarse |
| Devices | Yes: `/api/v1/devices/bulk-action` `delete` | Yes: `restore` | Yes: `purge` | No purge restore backend | No | Yes: `include_deleted=true` | Destructive purge, no dependency lookup |
| Network Connections | Yes: `/bulk-delete` | Yes: `/bulk-restore` | Yes: `/bulk-purge` | No purge restore backend | No | Yes: `include_deleted=true` | Destructive purge, no dependency lookup |
| Logical Services | Yes: `/api/v1/logical-services/bulk-action` `delete` | Yes: `restore` | No: backend returns unsupported bulk action | No | No | Yes: `include_deleted=true` | Golden view exists but backend purge missing |
| Vendors | Yes: `/api/v1/vendors/bulk-action` `delete` | Yes: `restore` | Yes: `purge` | No purge restore backend | No | Yes: archived list lookup only | Destructive purge and incomplete UI coverage |
| Racks | Yes: `/api/v1/racks/bulk-action` `delete` | Yes: `restore` | Yes: `purge` | No purge restore backend | No | Yes: `include_deleted=true` | Destructive purge and no dependency lookup |

## Dependency Guard Matrix
| Entity | Dependency Sources Checked | Detailed Reason Text Available? | Blocks Purge? | Tooltip/Focus Works? | Gap |
| --- | --- | --- | --- | --- | --- |
| Monitoring | None found | No | No | No | Missing entire guard contract |
| External | External links, external secrets | No: generic blocker string only | Yes | Partial: title/disabledReason paths exist, but detailed reason is missing and some disabled surfaces are native buttons | Needs shared dependency shape plus enumerated blocker text |
| AssetReal | None found | No | No | No | Missing entire guard contract |
| NetworkReal | None found | No | No | No | Missing entire guard contract |
| ServicesReal | None found | No | No | No | Missing entire guard contract |
| VendorsReal | None found | No | No | No | Missing entire guard contract |
| Racks | None found | No | No | No | Missing entire guard contract |

## Archived Link Routing Matrix
| Source Entity | Linked Target Entity | Target Archived? | Shortcut Opens Detail? | Broken? | Gap |
| --- | --- | --- | --- | --- | --- |
| Monitoring | Asset | Yes | Yes: `/asset?id=...` and AssetReal resolves from `include_deleted=true` | No source proof of break | Good |
| NetworkReal | Asset | Yes | Yes: network detail opens asset by id and AssetReal resolves archived rows | No source proof of break | Good |
| External links tab | External entity | Yes | Yes: link row resolves entity from archived-inclusive entity list | No source proof of break | Good |
| ServicesReal | Asset | Yes | Yes: service detail opens asset by id and AssetReal resolves archived rows | No source proof of break | Good |
| External details | Linked services / assets | Uncertain | Partial source proof only | Unknown | Needs explicit browser validation |
| VendorsReal | Linked target entities | Uncertain | No source proof | Unknown | Missing audit coverage |
| Racks | Mounted assets | Uncertain | No source proof | Unknown | Missing audit coverage |

## Copy/Wording Matrix
| Location | Current Label/String | Expected | Gap |
| --- | --- | --- | --- |
| `frontend/src/components/shared/OperationalBulkContract.ts` | `selected records` | `selected records` | None |
| `frontend/src/components/shared/OperationalActionLabels.ts` | `purgeSelection: 'Purge'` | `Purge` | None |
| `frontend/src/components/External.tsx` bulk blocked purge button | `Purge` | `Purge` | None |
| `frontend/src/components/AssetReal.tsx` deleted bulk purge button | `Purge` | `Purge` | None |
| `frontend/src/components/NetworkReal.tsx` deleted bulk purge button | `Purge` | `Purge` | None |
| `frontend/src/components/External.tsx` blocked reason | `Cannot purge selected external records because one or more are still linked or credentialed.` | Detailed entity-specific reason | Gap |
| Repo-wide historical/report artifacts | `Purge Selection` appears in old text artifacts and reports | No active-source usage for current contract | Audit-only residue; not active UI source |
| Repo-wide historical/report artifacts | `selected record` appears in old docs only | `selected records` | Audit-only residue; not active UI source |

## Centralization Matrix
| Behavior | Current Shared Source | Local Per-View Overrides | Gap |
| --- | --- | --- | --- |
| lifecycle action descriptors | `OperationalActionLabels.ts` partial only | `AssetReal`, `NetworkReal`, `External`, `ServicesReal`, `VendorsReal`, `Racks` all retain local action branches | No single lifecycle contract |
| archive/restore/purge labels | `OperationalActionLabels.ts` partial | Multiple per-view confirm and button label branches | Still decentralized |
| disabled reason tooltip wrapper | `OperationalRowActionMenu.tsx` supports `disabledReason` wrapper | Bulk buttons and detail buttons still use local native disabled/title patterns | Shared wrapper not applied across all surfaces |
| dependency guard response shape | None | External computes local `canSafelyPurgeExternalEntity` only | Missing shared guard model |
| toast Revert handling | `OperationalBulkContract.ts` shared wording and revert affordance | Monitoring and Services use it; AssetReal, NetworkReal, VendorsReal still have local undo/toast code | Shared handling incomplete |
| backend revert/snapshot/undo token shape | None shared across entities | Monitoring uses snapshots; External/Services use local snapshot PUT restore for updates only; other purge flows have nothing | Backend revert model not centralized |
| archived detail routing | `useOperationalDetailRoute` shared for Monitoring, External, ServicesReal | AssetReal/NetworkReal/VendorsReal use local deep-link effects; Racks local only | Routing behavior not centralized |

## Missing Pieces
- `ServicesReal` is a golden-style operational view, but backend `logical_services` bulk action still has no purge support.
- Monitoring is the only audited entity with truthful backend purge revert support.
- External purge remains destructive at the backend and cannot truthfully show a purge Revert.
- AssetReal purge remains destructive and cannot truthfully show a purge Revert.
- NetworkReal purge remains destructive and cannot truthfully show a purge Revert.
- Vendors backend supports purge, but the audited UI does not expose full archive/restore/purge golden lifecycle behavior.
- No shared dependency-guard contract exists; only External has a local guard.
- External blocker text is not detailed enough for the golden law.
- Disabled purge reason behavior is not shared across bulk, row, and detail surfaces.
- Archived linked-entity routing has source proof for some routes, but not full browser proof for all linked targets.
- Lifecycle behavior is still implemented per view rather than via one centralized contract.

## Implementation Plan
1. shared lifecycle contract
2. shared dependency guard shape
3. shared disabled tooltip wrapper
4. shared toast Revert behavior
5. backend lifecycle/revert support
6. archived entity detail routing
7. per-view adapter wiring only after shared contract exists

## Stop/Proceed Decision
STOP_AUDIT_ONLY

## Phase 1 Shared Contract Implementation Note
- Verdict: `PARTIAL_SHARED_CONTRACT_FOUNDATION_IMPLEMENTED`
- Shared contract files created:
  `frontend/src/components/shared/OperationalLifecycleContract.ts`
  `frontend/src/components/shared/OperationalDependencyGuard.ts`
  `frontend/src/components/shared/OperationalDisabledActionTooltip.tsx`
  `frontend/src/components/shared/OperationalLifecycleToasts.ts`
- Shared contract files updated:
  `frontend/src/components/shared/OperationalBulkContract.ts`
  `frontend/src/components/shared/OperationalBulkContract.test.ts`
  `frontend/src/components/shared/OperationalRowActionMenu.tsx`
  `frontend/src/components/shared/OperationalActionLabels.ts`
- Views wired in this phase:
  `frontend/src/components/External.tsx`
  `frontend/src/components/ServicesReal.tsx`
- Monitoring status:
  `frontend/src/components/MonitoringGrid.tsx` purge `restore_purged` behavior preserved without new backend drift in this phase
- External status:
  deleted-state Purge now resolves through the shared dependency guard shape and shared disabled tooltip host; blocked reasons now enumerate known link and credential blockers when source data is available
- Services status:
  deleted-state Purge is now represented as backend-blocked rather than omitted; no unsupported purge request path was added
- Still not complete in Phase 1:
  backend purge/revert truth remains uneven across entities, and only source-safe shared foundation wiring was implemented here

## Phase 1 Cleanup Note
- Verdict:
  `PARTIAL_SHARED_CONTRACT_CLEANUP_COMPLETE`
- No-op toast fixed for archive/restore/purge:
  yes
- External multi-select blocker detail:
  enumerated
- Purge confirm copy drift:
  fixed
- Tests added/updated:
  `frontend/src/components/shared/OperationalLifecycleToasts.test.ts`
  `frontend/src/components/shared/OperationalDependencyGuard.test.ts`
  `frontend/src/components/shared/OperationalBulkContract.test.ts`
- Remaining Phase 2 backend parity gaps:
  truthful purge Revert still exists only for Monitoring
  External purge remains destructive at backend/source level
  Services still lacks truthful backend purge/revert support
  non-Monitoring golden views still remain outside this Phase 1 shared cleanup
