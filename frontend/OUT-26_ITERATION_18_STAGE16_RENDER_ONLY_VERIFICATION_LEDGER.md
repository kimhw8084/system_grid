# OUT-26 Iteration 18 Stage 16 Render-Only Verification Ledger

| Target | Method | Evidence | Result | Remaining gap | Next prompt rule |
| --- | --- | --- | --- | --- | --- |
| desktop baseline | fresh local Playwright render at `1280x720` | grid visible; DOM rows `14`; visible rows `14`; Existing/Purged top-right; badge absent | `PASS` | none | none |
| `960x720` threshold | fresh local Playwright render at `960x720` | grid height `282`; header `76`; available-after-header `644`; equivalent threshold `193.2`; visible rows `13` | `PASS` | none | none |
| Stage 12 baseline | direct viewport measurement + DOM checks | grid visible; rows visible; Existing/Purged top-right; random badge absent | `PASS` | none | none |
| `ND-003` | row-action interaction check | menu opened; quick look stayed closed; selected rows after trigger `0`; row-body click opened quick look | `PASS` | none | none |
| `ND-004` | row selection + bulk flyout check | `.bulk-menu-container` rendered; clear selection visible; compare/status/environment/delete visible; clear selection worked | `PASS` | none | none |
| route lock | live `/asset-real` navigation + route file read-only confirmation | `/asset-real` redirected to `/asset`; no Stage 16 route edits | `PASS` | none | none |
| rich slots | focused live checks for core surfaces | quick look/map/details/report-compare entry/import-export/display-saved views verified; relationship and service-network deep panels remained `UNKNOWN` | `PASS` | non-critical deep slot verification remains partial | only revisit if controller requires deeper modal-level proof |
| console inventory | aggregated console collection during live verification flow | duplicate-key warnings repeated; no page errors; no blocking crash | `PASS` | non-blocking warning stream remains | revisit only if controller treats duplicate-key warnings as closure-blocking |
| evidence completeness | proof artifact review | summary, Markdown evidence, HTML evidence, and ledger all created inside `frontend/` | `PASS` | none | none |
