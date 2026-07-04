# OUT-26 Iteration 24 Stage 22 Global Template Reconsumption Map

| Visible area | Golden owner | Asset slot / data plugged in | Old asset bespoke status | Why retained code is domain content |
| --- | --- | --- | --- | --- |
| Page header | `OperationalWorkspaceShell` | Asset title, subtitle, scope counts | Retained shared owner | Asset only supplies labels and counts |
| Scope switch | `HeaderScopeSwitch` | Existing / Purged tab state | Retained shared owner | Asset only supplies tab values |
| Search | `ToolbarSearch` | Asset search term | Retained shared owner | Asset only supplies placeholder and value |
| Views menu | `OperationalSavedViewsPanel` | Asset saved-view state | Retained shared owner | Asset only supplies asset view config |
| Display menu | `OperationalDisplayPanel` | Asset font / density / hidden columns | Retained shared owner | Asset only supplies column metadata |
| Command-bar left controls | `WorkspaceCommandBar` | Views, display, export, copy, registry, import, filters, lens pills | Recomposed in this pass | Layout ownership is now more clearly shared-shell driven |
| Command-bar right actions | `WorkspaceCommandBar` | table/list/map, template/snapshot, compare, bulk, add asset | Recomposed in this pass | Shared shell owns placement; asset owns actions |
| Filter row | `WorkspaceCommandBar` secondary slot | Status/system/type/owner filters | Simplified in this pass | Asset only supplies filter datasets |
| Filter chips | `WorkspaceCommandBar` filter-chip slot | Search/lens/filter chips | Retained shared owner | Asset only supplies chip semantics |
| Grid shell | `OperationalDataGrid` | Asset rows / columns | Retained shared owner | Asset only supplies record schema |
| Row actions | `OperationalRowActionMenu` | Asset detail, knowledge, FAR, audit, lifecycle actions | Retained shared owner | Asset only supplies section items |
| Bulk flyout shell | `OperationalAnchoredPanel` + `WorkspaceFloatingPanel` | Asset compare visible, restore, set status/environment/owner, delete/purge | Retained shared owner, behavior repaired | Asset only supplies bulk actions |
| Quick look panel | `WorkspaceFloatingPanel` | Asset quick-look content | Retained | Asset-specific quick look is approved domain content |
| Detail modal shell | `WorkspaceModal` | `AssetDetailsView` | Retained | Rich asset dossier remains domain content |
| Asset form shell | `WorkspaceModal` | `AssetForm` | Retained | Form fields are asset-domain-specific |
| Map/report/compare surfaces | Shared page body slot under `OperationalWorkspaceShell` | `AssetMap`, `AssetReportView`, `AssetComparisonView` | Retained | These are asset-domain work surfaces, not page-shell grammar |
| Import modal | `BulkImportModal` / shared modal shell | Asset import | Retained | Domain import target only |
| Data state | `resolveOperationalDataState` | Asset loading / empty / error labels | Retained shared owner | Asset only supplies asset-specific copy |

## Removed / bypassed / reduced bespoke ownership
- Lens selection is no longer buried in the filter dropdown row; it is promoted into the primary command grammar.
- View-mode and template/snapshot controls no longer occupy a bespoke lower strip; they now live in the shared right action zone.
- Grid row density no longer uses an asset-only inflated baseline.

## Retained old code that remains valid domain content
- `QuickLookPanel`
- `AssetDetailsView`
- `AssetForm`
- `AssetReportView`
- `AssetComparisonView`
- `AssetMap`
- rich asset service/network/security/secrets/hardware/monitoring/relationships flows
