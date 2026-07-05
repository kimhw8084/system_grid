# Stage 26 Scaffold Architecture

New scaffold component path:
- `frontend/src/components/assets/AssetGoldenShellScaffold.tsx`

Canonical route delegate:
- `frontend/src/components/assets/AssetGoldenShellRoute.tsx`
- `frontend/src/components/Assets.tsx`

Golden primitives/contracts consumed:
- `OperationalWorkspaceShell`
- `HeaderScopeSwitch`
- `ToolbarSearch`

How Asset domain model is passed in:
- `AssetsGoldenWorkspace.tsx` computes domain state, toolbar controls, filter chips, floating panels, and visible workspace surface.
- Those computed regions are passed into `AssetGoldenShellScaffold` as slots.

How the old body is bypassed:
- The legacy workspace no longer emits the shell markup directly.
- The outer header/command-bar/frame geometry is now emitted by `AssetGoldenShellScaffold`.

Which old Asset code remains domain-only:
- asset query state
- filter/view state
- grid/report/map/compare surface selection
- saved views
- display panel state
- row actions
- bulk actions
- quick look/details/modals

Why this is not another 98% source-similar rewrite:
- The visible shell ownership moved into a new dedicated component instead of leaving the shell inline in the 5k-line workspace file.
- `Assets.tsx` no longer points directly to the legacy workspace file.

Source-similarity risk statement:
- Medium. The legacy workspace still owns a large amount of slot content and surface composition, so a later pass is still needed to tighten geometry with live measurement.
