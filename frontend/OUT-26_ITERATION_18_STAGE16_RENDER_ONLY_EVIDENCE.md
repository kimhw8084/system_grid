# OUT-26 Iteration 18 Stage 16 Render-Only Evidence

## Desktop measurement table

| Field | Value |
| --- | --- |
| viewport | `1280x720` |
| URL | `/asset` |
| table/grid visible | `yes` |
| DOM row count | `14` |
| visible row count | `14` |
| row samples | `1 / FINANCE-S-001`; `2 / MANUFACTURING-S-002`; `3 / BI-ANALYTICS-P-003`; `4 / MANUFACTURING-P-004`; `5 / MANUFACTURING-P-005` |
| header rectangle | `{ x: 272, y: 108, width: 961, height: 61 }` |
| header height | `61` |
| command/action zone rectangle | `{ x: 289, y: 203, width: 1239, height: 123 }` |
| command/action zone height | `123` |
| grid rectangle | `{ x: 272, y: 359, width: 961, height: 297 }` |
| grid height | `297` |
| Existing selector rectangle | `{ x: 1061, y: 120, width: 81, height: 36 }` |
| Purged selector rectangle | `{ x: 1146, y: 120, width: 75, height: 36 }` |
| random badge under title/subtitle present | `no` |

## `960x720` measurement table

| Field | Value |
| --- | --- |
| viewport | `960x720` |
| URL | `/asset` |
| table/grid visible | `yes` |
| DOM row count | `13` |
| visible row count | `13` |
| row samples | `1 / FINANCE-S-001`; `2 / MANUFACTURING-S-002`; `3 / BI-ANALYTICS-P-003`; `4 / MANUFACTURING-P-004`; `5 / MANUFACTURING-P-005` |
| header rectangle | `{ x: 272, y: 108, width: 641, height: 76 }` |
| header height | `76` |
| command/action zone rectangle | `{ x: 289, y: 218, width: 1239, height: 123 }` |
| command/action zone height | `123` |
| grid rectangle | `{ x: 272, y: 374, width: 641, height: 282 }` |
| grid height | `282` |
| Existing selector rectangle | `{ x: 741, y: 120, width: 81, height: 36 }` |
| Purged selector rectangle | `{ x: 826, y: 120, width: 75, height: 36 }` |
| grid height >= `180px` | `yes` |
| at least 8 visible rows | `yes` |
| controls remain usable | `yes` |

## Interaction evidence table

| Target | Evidence | Result |
| --- | --- | --- |
| Stage 12 baseline | grid visible on both viewports; rows visible; Existing/Purged top-right; random badge absent | `PASS` |
| `ND-003` row-action trigger | row-action menu opened; quick look did not open from trigger; selected rows after trigger `0` | `PASS` |
| `ND-003` intended quick-look path | row-body click opened quick look | `PASS` |
| `ND-004` bulk selection | selected rows before clear `2` | `PASS` |
| `ND-004` shared/anchored grammar | panel container present as `.bulk-menu-container`; panel text included `Bulk actions`, `Clear Selection`, `Compare Selected`, `Set Status...`, `Set Environment...`, `Bulk Delete` | `PASS` |
| `ND-004` clear selection | clear selection worked | `PASS` |

## Route-lock evidence

| Check | Evidence | Result |
| --- | --- | --- |
| `/asset` canonical render | fresh render opened canonical Assets page at `/asset` | `PASS` |
| `/asset-real` redirect-only | requested `/asset-real`; final route `/asset` | `PASS` |
| route file unchanged in this package | no route files were edited in Stage 16; `frontend/src/App.tsx` remained read-only | `PASS` |
| `AssetReal.tsx` not promoted/imported as canonical | canonical route remained `Assets` via `App.tsx`; no Stage 16 source edits | `PASS` |

## Rich-slot evidence

| Slot | Evidence | Result |
| --- | --- | --- |
| quick look | row-body click exposed quick look with `Engage Full Configuration` | `PASS` |
| map | clicking `Map` changed URL to `/asset?view=map`; map surface rendered with `svgCount: 39` and grid view left | `PASS` |
| details/forms | clicking `+ Add Asset` opened asset form surface | `PASS` |
| relationships/dependencies/rich panels | deep relationships content not conclusively surfaced in this environment without broader modal walking | `UNKNOWN` |
| service/network panels and modals | nested service/network content not conclusively surfaced in this environment without broader modal walking | `UNKNOWN` |
| history/compare/report | clicking `List` changed URL to `/asset?view=report`; bulk grammar still exposed `Compare Selected` entrypoint | `PASS` |
| security/secrets/hardware/monitoring panels | quick look contained `Hardware Registry` | `PASS` |
| import/export | `Template`, `Snapshot`, `Export CSV`, `Import Data` all visible in fresh render | `PASS` |
| display/saved views | `Display options` and `Saved views` panels both opened in fresh render | `PASS` |

## Console evidence

| Category | Value |
| --- | --- |
| total console entries | `102` |
| duplicate-key React warnings surfaced as errors | `76` |
| React Router future-flag warnings | `2` |
| router blocker warnings | `0` |
| AG Grid destroyed-api warnings | `0` |
| page errors | `0` |

### Console interpretation
- No blocking runtime crash appeared during fresh render verification.
- Repeated duplicate-key warnings remain visible under the Assets shell path.
- These warnings did not prevent grid render, row actions, bulk actions, route redirect, or `960x720` threshold verification.

## Screenshot / artifact references
- supplemental screenshots were not required for this pass
- controller-inspectable evidence is contained directly in this Markdown file and the paired HTML report
