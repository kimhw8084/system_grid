# OUT-26 Iteration 24 Stage 22 Table Parity Matrix

| Area | Golden reference | Asset before | Asset after | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| Table container | Shared operational grid shell | Shared shell plus extra emphasis | Shared shell with reduced extra emphasis | PASS | `Assets.tsx` grid `className` simplified |
| Header | Monitoring operational header rhythm | Shared header, acceptable | Shared header, unchanged | PASS | same `OperationalDataGrid` header owner |
| Columns | Shared operational grid contract | Asset-specific columns on shared grid | same | PASS | asset-specific schema allowed |
| Row density | Monitoring `rowDensity` baseline | `rowDensity + 6` | `rowDensity` | PASS | visible parity fix in `Assets.tsx` |
| Row state | Shared selection / hover grammar | shared runtime | shared runtime | PASS | no row-state owner change |
| Row actions | Shared row-action menu | shared row-action menu | shared row-action menu | PASS | `OperationalRowActionMenu` preserved |
| Selection | Shared grid selection | shared selection | shared selection | PASS | Playwright asset workflow pass |
| Bulk actions | Shared anchored flyout | shared flyout but compare-visible path regressed | shared flyout with compare-visible restored | PASS | focused Playwright spec pass |
| Empty/loading/error | Shared data-state resolver | shared resolver | shared resolver | PASS | noRows/loading/dataState preserved |
| Responsive behavior | Shared command-bar and grid shell | bespoke second-row density | lower bespoke pressure after command-bar recomposition | PARTIAL | no fresh `960x720` recapture yet |
