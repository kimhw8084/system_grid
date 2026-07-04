# Stage 24 Global Feature Parity Evidence

## Command bar

- Shared shell primitive: `OperationalWorkspaceShell`
- Shared controls retained: search, views, display, filter chips, bulk actions, saved views, anchored menus
- Asset-specific features plugged in: import, template download, snapshot download, compare, add asset

## Search

- Shared primitive: `ToolbarSearch`
- Asset behavior preserved: registry-wide free-text search across core asset fields

## Filters

- Shared placement: secondary toolbar slot
- Asset behavior preserved: lens, status, system, type, owner

## Display views

- Shared primitive: `OperationalDisplayPanel`
- Asset behavior preserved: font size, row density, hidden columns

## Saved views

- Shared primitive: `OperationalSavedViewsPanel`
- Asset behavior preserved: create, apply, overwrite, delete

## Import / export

- Import modal preserved
- CSV export preserved
- Clipboard export preserved
- Template and snapshot download actions preserved

## Row actions

- Shared primitive: `OperationalRowActionMenu`
- Preserved actions: details, edit, delete/purge, quick console access

## Bulk actions

- Shared primitive: `OperationalAnchoredPanel`
- Preserved actions: restore, purge, status, environment, owner, delete, compare-visible

## Floating / detail panels

- Shared primitives: `WorkspaceFloatingPanel`, `OperationalAnchoredPanel`
- Preserved domain panels: quick look, display, saved views, bulk menu

## Result

- Global feature contract ownership: PASS
- Live rendered parity: FAIL, blocked before workspace load
