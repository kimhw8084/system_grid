# OUT-26 Iteration 22 Stage 20 Golden Asset View Gap Map

| Area | Golden reference behavior | Pre-change `/asset` behavior | Gap severity | Source evidence | Planned fix | Actual fix result |
|---|---|---|---|---|---|---|
| Shell composition | Shared `OperationalWorkspaceShell` with native toolbar slots | Shared shell was present, but primary toolbar grammar was bespoke | MAJOR | `MonitoringGrid.tsx`, `Assets.tsx` | Move asset controls onto native shell slots | Done |
| Header grammar | Title, subtitle, and scope summary feel identical to Monitoring | Title/subtitle existed, scope summary count was missing | MINOR | `MonitoringGrid.tsx:1879-1910`, `Assets.tsx:2857-2882` | Add scope summary counts | Done |
| Existing/Purged zone | Top-right scope switch with summary | Top-right existed already | PASS | `App.tsx`, `Assets.tsx` | Preserve | Preserved |
| Command bar | Search + native toolbar controls + action buttons | Search mixed with segmented mode control and domain lenses | BLOCKER | pre-change render, `Assets.tsx` | Replace segmented grammar with native toolbar buttons | Done |
| Search/filter/display/saved views | Monitoring uses search, views, display, and filter toggle as first-class controls | Asset page had search, saved views, display, but not in the same grammar | MAJOR | pre-change render, `MonitoringGrid.tsx` | Recompose into native `Views/Display/Import/Filters` groups | Done |
| Table/grid density | Grid should remain primary content surface | Grid remained primary but toolbar height caused responsive compression | MAJOR | pre-change `960x720` render | Add minimum grid height | Done |
| Row actions | Shared floating row action grammar | Asset row action menu already shared | PASS | `Assets.tsx:2172-2265` | Preserve | Preserved |
| Bulk actions | Shared anchored bulk panel grammar | Shared anchored bulk panel existed, but primary action zone was visually more bespoke | MINOR | `Assets.tsx:2921-2988` | Keep shared panel and align header controls | Done |
| Floating panels | Native display/views/bulk overlays | Native overlays already used | MINOR | `Assets.tsx:2910-3023` | Preserve | Preserved |
| Quick look | Row body opens quick look, row action trigger should not | Existing row interaction contract already separated trigger types | MINOR | `Assets.tsx:2537-2550`, `Assets.tsx:2557-2643` | Preserve | Preserved |
| Modal/form/dirty-state | Shared modal shell lifecycle | Shared modal shell already used | MINOR | `Assets.tsx:3040-3084` | Preserve | Preserved |
| Data states | Shared operational empty/loading/error state | Shared state resolver already used | MINOR | `Assets.tsx:2031-2048` | Preserve | Preserved |
| Responsive layout | Usable controls and visible grid at `960x720` | Grid collapsed below required floor | MAJOR | measured `139px` pre-fix | Add layout floor | Done |
| Route behavior | `/asset` canonical, `/asset-real` redirect-only | Correct already | PASS | `App.tsx:725-726` | Preserve | Preserved |
| Rich panels | Keep asset-specific report/map/detail/import/export panels inside shared frame | Rich behavior existed and needed preservation | MAJOR | `Assets.tsx` report/map/detail blocks | Preserve while aligning shell | Preserved |

## Pre-change severity count
- PASS: 2
- MINOR: 5
- MAJOR: 7
- BLOCKER: 1
