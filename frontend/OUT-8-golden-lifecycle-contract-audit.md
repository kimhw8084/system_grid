# OUT-8 Golden Lifecycle Contract Audit

## Verdict
FAIL_DECENTRALIZED_OR_UNSAFE

## Golden Lifecycle Law
- all golden-template views support archive/restore/purge
- all successful lifecycle actions show truthful toast Revert
- linked entities block Purge with detailed hover/focus reason
- archived linked entities remain routable/openable
- lifecycle behavior is centralized

## View Coverage Matrix
| View | Golden Template? | Archive | Restore | Purge | Archive Revert | Restore Revert | Purge Revert | Dependency Guard | Disabled Reason Tooltip | Archived Link Routing | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Monitoring | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No source proof | No source proof | Yes: archived asset deep-link routes via `include_deleted=true` asset lookup | Partial: strongest implementation, but no centralized purge guard |
| External | Yes | Yes | Yes | Yes | Yes | Yes | No truthful source proof for purge revert | Yes, but entity-local only | Partial: generic message only; native disabled controls are inconsistent | Yes: link tab resolves archived entity detail from `allEntities` | Unsafe and decentralized |
| AssetReal | Yes | Yes | Yes | Yes | Yes | Yes | No | No | No | Yes: archived asset details route from `include_deleted=true` query | Unsafe purge path |
| NetworkReal | Yes | Yes | Yes | Yes | Yes | Yes | No | No | No | Yes: archived asset targets deep-link into AssetReal | Unsafe purge path |
| VendorsReal | Shared grid only, not full golden lifecycle | Archive only | No | No | Yes | No | No | No | No | No source proof | Missing lifecycle coverage |
| Racks | No shared golden template source proof | Yes | Yes | Yes | No source proof | No source proof | No | No | No | No source proof | Out of contract shape and unsafe purge |
| ServiceRegistry | No shared golden template source proof | Uses delete/purged model, not golden archive contract | Yes | No truthful purge support | No source proof | No source proof | No | No | No | No source proof | Not golden-contract compliant |

## Backend Capability Matrix
| Entity | Archive Backend | Restore Backend | Purge Backend | Revert Backend | Dependency Lookup | Archived Detail Lookup | Gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Monitoring | Yes: `/api/v1/monitoring/bulk-action` `delete` | Yes: `restore` | Yes: `purge` | Yes: `restore_purged` with snapshots | No | Yes: list endpoint supports `include_deleted=true` | Only entity with truthful purge revert; no dependency-block contract |
| External | Yes: `DELETE /api/v1/intelligence/entities/{id}` soft-delete | Yes: `POST /api/v1/intelligence/entities/{id}/restore` | Yes: `DELETE ...?purge=true` hard-delete | No purge restore backend | Partial: checks links and secrets only, returns coarse errors | Yes: entities list supports `include_deleted=true` | No purge revert; blocker detail is not rich enough |
| Asset / Devices | Yes: `/api/v1/devices/bulk-action` `delete` | Yes: `restore` | Yes: `purge` hard-delete | No purge restore backend | No | Yes: devices list supports `include_deleted=true` | Unsafe purge, no blocker lookup |
| Network | Yes: `/api/v1/networks/connections/bulk-delete` | Yes: `/bulk-restore` | Yes: `/bulk-purge` hard-delete | No purge restore backend | No | Yes: connections list supports `include_deleted=true` | Unsafe purge, no blocker lookup |
| Vendors | Yes: `/api/v1/vendors/bulk-action` `delete` | Yes: `restore` | Yes: `purge` hard-delete | No purge restore backend | No | Yes for archived vendor list, but no linked-detail source proof | View does not expose full lifecycle and backend has no truthful purge undo |
| Racks | Yes: `/api/v1/racks/bulk-action` `delete` | Yes: `restore` | Yes: `purge` hard-delete | No purge restore backend | No | Yes: racks list supports `include_deleted=true` | Unsafe purge, restore is conflict-managed but purge is destructive |
| Services | Yes: `/api/v1/logical-services/bulk-action` `delete` | Yes: `restore` | No bulk purge action | No | No | Yes: services list supports `include_deleted=true` | Missing purge entirely |

## Dependency Guard Matrix
| Entity | Dependency Sources Checked | Example Reason Text | Blocks Purge? | Tooltip/Focus Works? | Gap |
| --- | --- | --- | --- | --- | --- |
| Monitoring | None found | N/A | No | No | Missing guard entirely |
| External | External links, external secrets | `Cannot purge selected external records because one or more are still linked or credentialed.` | Yes | Partial at best; reason is generic and disabled-native surfaces are inconsistent | Needs shared guard shape plus detailed blocker enumeration |
| Asset / Devices | None found | N/A | No | No | Missing guard entirely |
| Network | None found | N/A | No | No | Missing guard entirely |
| Vendors | None found | N/A | No | No | Missing guard entirely |
| Racks | None found | N/A | No | No | Missing guard entirely |
| Services | None found | N/A | No | No | Missing guard entirely |

## Archived Link Routing Matrix
| Source Entity | Linked Target Entity | Target Archived? | Shortcut Opens Detail? | Broken? | Gap |
| --- | --- | --- | --- | --- | --- |
| Monitoring | Asset | Yes | Yes: `navigate(/asset?id=...)` and AssetReal resolves from `include_deleted=true` | No source proof of break | Good |
| Network | Asset | Yes | Yes: network detail opens asset by id and AssetReal resolves archived rows | No source proof of break | Good |
| External Links tab | External entity | Yes | Yes: links tab resolves entity from `allEntities` and opens detail | No source proof of break | Good |
| External details | Linked asset/service shortcuts | Unknown | No complete archived-target proof for all linked targets | Unknown | Needs explicit audit/test coverage |
| Vendors | Any linked target | No source proof | No source proof | Unknown | Missing audit coverage |
| Racks | Mounted asset references | No source proof | No source proof | Unknown | Missing audit coverage |

## Missing Pieces
- No single centralized lifecycle contract currently governs archive, restore, purge, dependency guard, disabled tooltip behavior, and truthful revert across all golden-template views.
- Monitoring is the only audited entity with true backend purge revert support.
- External exposes purge with a frontend revert affordance pattern for archive and restore, but purge has no backend restore path.
- AssetReal exposes purge without backend restore support.
- NetworkReal exposes purge without backend restore support.
- VendorsReal does not expose restore or purge in the shared operational surface and does not use shared bulk-toast lifecycle wording.
- Services lacks purge support in the backend bulk action entirely.
- External purge blockers are generic and do not enumerate concrete linked entities or credentials.
- No audited entity besides External performs any pre-purge dependency guard.
- Disabled purge reason behavior is not centralized and is unreliable on native disabled controls.
- `Purge Selection` wording still existed in shared and per-view UI before this run; golden wording requires `Purge`.
- Racks and Services do not appear to use the shared golden operational lifecycle layer, so they are out of contract shape even where they support some lifecycle endpoints.

## Implementation Plan
1. shared lifecycle contract
2. shared dependency guard shape
3. shared disabled tooltip wrapper
4. shared toast Revert behavior
5. backend lifecycle/revert support
6. archived entity detail routing
7. per-view adapter wiring only after shared contract exists
