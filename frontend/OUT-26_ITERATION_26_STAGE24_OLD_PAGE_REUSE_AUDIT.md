# Stage 24 Old Page Reuse Audit

## Allowed reuse

- Domain logic: existing asset queries, search, quick filters, saved-view persistence, bulk mutation logic, row-selection logic.
- Domain feature content: quick look panel, details modal, report view, compare view, map view, service/network/security/hardware/secrets subflows.
- Handler / data mapping: existing import/export handlers, route param sync, active modal state, compare snapshot state.

## Forbidden reuse removed or bypassed

- Shell / layout grammar: the asset-specific inline table grammar inside `AssetsGoldenWorkspace.tsx` was bypassed in favor of `buildAssetGoldenColumns()`.
- Table layout grammar: custom `columnDefs` cell/header composition was removed from the page file.
- Command / action-zone placement: the lens button wall was removed from the main command row and replaced with secondary-toolbar filtering.
- Feature placement: view-mode buttons moved into the command controls, keeping bulk/compare/add in the shared action zone.

## Visible layout code removed

- Inline `columnDefs` block in `frontend/src/components/assets/AssetsGoldenWorkspace.tsx` was replaced by `frontend/src/components/assets/assetGoldenColumns.tsx`.

## Table layout code removed

- Custom checkbox/id/action column declarations.
- Custom per-cell renderer ownership for name/system/type/status/hardware/health fields.

## Command / action-zone code removed

- Inline lens-button strip from the primary toolbar controls.
- Import-export button group attached to the action zone.

## Source similarity assessment

- Grid ownership now follows shared operational primitives instead of old asset-specific JSX.
- The live app was bootstrap-blocked before full before/after visual comparison, so exact visible similarity could not be scored honestly.

Explicit statement:
The new visible workspace is not controlled by the old Asset page body.

Rendered-verification caveat:
FAIL: rendered parity could not be proven because `/asset` never left the startup bootstrap failure surface in this environment.
