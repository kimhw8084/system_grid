# OUT-14 External Domain Preservation Inventory

## Preservation Rule

Default classification is `preserve` unless current source proves an item is dead, duplicate, or intentionally replaced by a shared contract shell.

## Source Base

Primary current sources:

- `frontend/src/components/External.tsx`
- `backend/app/api/intelligence.py`
- `backend/app/api/import_engine.py`
- `frontend/tests/external-workflows.spec.ts`
- `backend/test_external_workflows.py`

## Inventory

| Item | Current source evidence | Classification | Stage 0 rule |
| --- | --- | --- | --- |
| Entity fields: `name`, `external_key`, `type`, `subtype`, `owner_organization`, `owner_team`, `ownership_mode`, `internal_team_id`, `internal_operator_id`, `status`, `environment`, `description`, `notes`, `contacts_json`, `business_purpose`, `criticality`, `dependency_tier`, `data_classification`, `integration_mode`, `primary_endpoint_url`, `secondary_endpoint_url`, `auth_method`, `protocol_family`, `port_override`, `supports_inbound`, `supports_outbound`, `source_system`, `source_record_id`, `risk_rating`, `contains_customer_data`, `contains_credentials`, `stores_pii`, `internet_exposed`, `third_party_assessment_status`, `metadata_json`, `secrets` | `_enrich_entity_response` in `backend/app/api/intelligence.py`; form/detail rendering in `External.tsx` | `preserve exactly` | These define the External domain body. Run 8 cannot genericize or rename them. |
| External entity columns and labels | `External.tsx` column definitions switch between entity and link surfaces and use External-owned labels | `preserve but rehost inside shared shell` | Shared grid shell is allowed; domain columns stay External-owned. |
| Active/Archived/Links three-scope model | `activeTab` runtime state in `External.tsx`; header scope switch shows counts for active, archived, links | `preserve exactly` | `links` is first-class and must remain saveable/restorable. |
| Entity quick filters: status, type, environment, owner | `External.tsx` secondary toolbar | `preserve but rehost inside shared shell` | Shared toolbar placement, External filter semantics. |
| Link quick filters: direction, protocol | `External.tsx` links-tab filter swap | `preserve exactly` | This is domain behavior, not generic table chrome. |
| Entity create/edit form | `ExternalForm` usage in `External.tsx`; backend field error clearing; dirty-state hook wiring | `preserve but rehost inside shared shell` | Shared modal shell is required, form body stays External-specific. |
| Link form and link identity fields | `LinkForm` in `External.tsx`; duplicate-shape validation in `backend/app/api/intelligence.py` | `preserve exactly` | Do not flatten into a generic relationship form. |
| Detail modal body | `ExternalDetailsView` in `External.tsx` | `preserve exactly` | Keep mission/dependency/contact/credential body intact. |
| Compare modal content | `CompareExternalModal` in `External.tsx` using shared compare shell | `preserve but rehost inside shared shell` | Compare shell can be shared; field list and copy remain External-owned. |
| Row actions for entity rows | `External.tsx` row-action sections for view/edit/map link/watch/favorite/archive/purge | `preserve exactly` | Shared action menu shell only. |
| Row actions for link rows | `External.tsx` link-row actions, including sever link and edit link | `preserve exactly` | Link rows cannot be forced into entity-row semantics. |
| Right-click targeting rules | `External.tsx` context menu logic | `preserve exactly` | Entity rows and link rows must open the correct menu content. |
| Bulk operations | `External.tsx` bulk status/environment/criticality/risk updates, restore, archive/purge | `preserve but rehost inside shared shell` | Shared bulk flyout shell with External-owned bulk semantics. |
| Favorites and watch follow options | `toggleFavorite`, `toggleWatch`, row action sections in `External.tsx` | `preserve exactly` | Small but user-visible External behavior. |
| Dependency intelligence and warnings | `getEntityInsights`, `buildExternalMultiSelectPurgeReason`, `getExternalEntityPurgeGuard` in `External.tsx` | `preserve exactly` | These are core External workflow intelligence. |
| Purge blocker truthfulness | `getExternalEntityPurgeGuard` in `External.tsx`; archived/link/secret restrictions in backend | `preserve exactly` | No visual parity change may weaken truth. |
| Link uniqueness and enrichment | `_validate_unique_external_link` and enriched link responses in `backend/app/api/intelligence.py`; backend tests | `preserve exactly` | Required for External domain correctness. |
| Secret registration and credential references | entity secret endpoints and detail flow in backend/UI/tests | `preserve exactly` | Must remain available through detail workflow. |
| Restore conflict and duplicate identity rules | `_validate_unique_external_identity`, `_validate_restoreable_external_entity` in backend tests | `preserve exactly` | These are business rules, not presentation details. |
| Import profile `external_entities` | `OperationalImportModal` in `External.tsx`; import profile in `import_engine.py` | `preserve exactly` | Profile identity is part of the contract. |
| Snapshot export manifest, schema version, filename pattern, scope | `handleExportSnapshot` in `External.tsx`; `build_snapshot_manifest` in `import_engine.py`; diagnostics file | `preserve exactly` | Export contract is now part of golden spread. |
| Diagnostics report language for External export | `externalExportDiagnostics.ts` | `preserve exactly` | Needed for environment-safe proof. |
| Deep-link detail route behavior | `useOperationalDetailRoute` in `External.tsx`; `/external` route in `App.tsx` | `preserve but rehost inside shared shell` | Shared route helper is correct; record semantics stay External-owned. |
| Views/display/bulk/floating panel contents | `OperationalSavedViewsPanel`, `OperationalDisplayPanel`, bulk panel wiring in `External.tsx` | `preserve but rehost inside shared shell` | Shared panel shell, External choices. |
| Saved-view `links` scope persistence | `sanitizeExternalViewConfig` in `External.tsx` currently strips `links` | `adapt via domain slot` | Fix is required; `links` must become a preserved first-class workspace mode. |
| Local link-form dirty implementation | `isLinkFormDirty` wiring in `External.tsx` | `defer with explicit reason` | Current modal-level dirty protection exists. Defer unless Stage 1 finds a real regression. |

## Remove Only If Proven Dead/Duplicate

No current source item is approved for removal in Stage 0.

If Stage 1 discovers a dead path, removal is allowed only with proof that:

- it is unused in UI and route entry points;
- it has no backend test or runtime dependency;
- it does not carry External domain semantics that would need a shared adapter replacement.

## High-Risk Loss Scenarios

The easiest ways to accidentally damage External during Run 8 are:

- preserving only shell visuals while losing the `links` workspace mode;
- replacing External compare content with a generic compare payload;
- flattening dependency or purge logic into generic action gating;
- keeping shared modal shells but dropping link-form semantics;
- treating snapshot export as a generic download instead of a strict External contract;
- changing route transitions around detail/edit/link flows without preserving entity semantics.
