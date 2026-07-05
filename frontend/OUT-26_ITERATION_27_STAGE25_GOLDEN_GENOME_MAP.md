# OUT-26 Iteration 27 Stage25 Golden Genome Map

## Golden Source

- Primary product reference: [MonitoringGrid.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/MonitoringGrid.tsx)
- Shared shell primitives: [OperationalWorkspaceShells.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/OperationalWorkspaceShells.tsx)
- Shared toolbar/header primitives: [LayoutPrimitives.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/LayoutPrimitives.tsx), [WorkspaceCommandBar.tsx](/Users/haewonkim/home/development/sysgrid/frontend/src/components/shared/WorkspaceCommandBar.tsx)

## Golden Skeleton

- Shell owner: `OperationalWorkspaceShell`
- Header owner: `PageHeader` through `OperationalWorkspaceFrame`
- Command/search/filter owner: `WorkspaceCommandBar`
- Floating panel owner: `OperationalDisplayPanel`, `OperationalSavedViewsPanel`, `OperationalAnchoredPanel`
- Table owner: `OperationalDataGrid`
- Row action owner: `OperationalRowActionMenu`

## Golden Rhythm

- Header:
  - Eyebrow
  - Icon + single noun title
  - Uppercase subtitle
  - Scope/status switch on the right
- Command bar:
  - Search on the left
  - `Views` and `Display` in the first control grammar
  - Import/filter and one domain toggle group in the second control grammar
  - Compare/bulk/add in the action zone on the right
- Table:
  - Single operational grid surface
  - Compact utility columns
  - Row action cell at the far right
- Panels:
  - Saved views panel
  - Display panel
  - Anchored bulk action panel
  - Row action menu

## Golden Behaviors

- Scope switch changes lifecycle tab without changing shell ownership.
- Search and filter affect content, not page skeleton.
- Domain-specific secondary surfaces are optional attachments, not shell-defining top-level skeleton branches.
- Export/import behaviors are triggered from the command grammar, not by replacing the workspace shell.
