# OUT-26 Iteration 24 Stage 22 Rendered UAT Evidence

## Decision
- Implementation path: `Option A — Salvage current Assets.tsx`
- Verdict: `PARTIAL`

## Layout measurements
- Fresh numeric measurement capture was not produced in this pass.
- Source-level parity moves completed:
  - lens controls moved into the primary command-bar row
  - table/list/map and template/snapshot moved into the right action zone
  - grid row density normalized to the shared baseline

## DOM evidence from focused Playwright rerun
- Header rendered:
  - `Asset Registry`
  - scope switch remained in the header right zone
- First-row command grammar rendered:
  - search
  - views
  - display
  - export csv
  - copy
  - registry configuration
  - import
  - filters
  - lens pills: `All`, `My Systems`, `Team`, `Unowned`, `Degraded`, `At Risk`, `Needs Docs`
- Right action zone rendered:
  - `Table`
  - `List`
  - `Map`
  - `Template`
  - `Snapshot`
  - `Compare`
  - `Bulk Actions`
  - `+ Add Asset`

## Side-by-side comparison matrix
| Area | Monitoring contract | Canonical `/asset` after pass | Verdict |
| --- | --- | --- | --- |
| Header grammar | shared page header | shared page header | closer |
| Command ownership | shared command bar | shared command bar with fewer bespoke lower-row controls | closer |
| Table density | monitoring baseline | normalized to shared baseline | closer |
| Bulk grammar | shared flyout | shared flyout with compare-visible restored | match on tested flow |

## Console counts
- Standalone console inventory not separately captured.
- Focused Playwright run did not fail on console/page errors.

## Interaction results
- Row action trigger path: PASS
- Detail open path: PASS
- Open Knowledge path: PASS
- FAR Risks path: PASS
- Audit path: PASS
- Bulk compare-visible path: PASS
- Sync preview path: PASS

## Route results
- `/asset` remained canonical: PASS
- `/asset-real` redirect lock preserved by source audit: PASS
- `AssetReal.tsx` route promotion: not performed

## Validation table
| Command | Result |
| --- | --- |
| `rtk npm run typecheck` | PASS |
| `rtk npm run build` | PASS |
| `rtk npm run test:lint` | PASS |
| focused asset Playwright spec | PASS |

## Final verdict
- Meaningful visible improvement and preserved asset workflow behavior are proven.
- Full rendered desktop measurement proof and exact `960x720` recapture are still missing.
- Final verdict: `PARTIAL`
