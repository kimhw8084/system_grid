# Stage 26 Golden Geometry Baseline

Status: baseline contract identified in code, runtime measurement not captured.

Golden source files:
- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
- `frontend/src/components/shared/LayoutPrimitives.tsx`
- `frontend/src/components/shared/WorkspaceCommandBar.tsx`

Expected golden regions:
- workspace root: `OperationalWorkspaceShell` frame
- header: `PageHeader`
- command region: `WorkspaceCommandBar`
- table: `OperationalDataGrid`
- action zone: toolbar actions inside `WorkspaceCommandBar`
- panel: anchored/floating panels via `OperationalAnchoredPanel` and `WorkspaceFloatingPanel`

Required desktop full-page metrics:
- Not captured in this session.

Required desktop full-viewport metrics:
- Not captured in this session.

Required exact `960x720` metrics:
- Not captured in this session.

Blocker:
- Local app and API health endpoints were unavailable, so no browser render evidence could be generated.
