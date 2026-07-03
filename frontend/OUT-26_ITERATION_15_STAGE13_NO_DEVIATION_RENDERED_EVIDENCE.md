# OUT-26 Iteration 15 Stage 13 No-Deviation Rendered Evidence

## Environment

- App command used: existing local frontend dev server on `http://127.0.0.1:5173`
- Browser/tool used: Codex in-app browser via browser runtime
- URL inspected: `http://127.0.0.1:5173/asset`
- Viewports inspected:
  - default desktop: `1280x720`
  - narrower desktop/laptop: `960x720`
- Test data availability:
  - asset dataset present
  - default rendered DOM included `39` row elements and `19` visible rows

## Console inventory

| level | related to Assets/golden contract | inventory |
| --- | --- | --- |
| `error` | Yes | repeated React duplicate-key warning under `AnimatePresence`, `OperationalWorkspaceShells.tsx`, and `Assets.tsx` |
| `warn` | No additional material warning captured in this audit | none material beyond the duplicate-key issue |

Assessment:
- No fatal runtime exception blocked page load.
- Duplicate-key warnings are relevant because they affect overlay identity and correlate with row-action/quick-look interaction noise.

## DOM/layout evidence

### Default desktop baseline

| metric | value |
| --- | --- |
| header rect | `x=272 y=108 w=961 h=61` |
| scope rect | `x=944.16 y=108 w=288.84 h=60` |
| grid rect | `x=273 y=400 w=959 h=255` |
| row count in DOM | `39` |
| visible row count | `19` |
| random badge under title/subtitle | `false` |

Visible row samples:

```text
ID Name
System Type Status Env Owner Make
Action
1 FINANCE-S-001
2 MANUFACTURING-S-002
3 BI-ANALYTICS-P-003
4 MANUFACTURING-P-004
5 MANUFACTURING-P-005
6 MANUFACTURING-P-006
7 MES-P-007
```

### Search/filter evidence

| action | result |
| --- | --- |
| search `FINANCE-S-001` | filtered down to `5` visible rows including the matching identity and detail row |
| search `zzzz-no-match` | truthful filtered-empty state rendered: `No assets match the current search or scope` |
| clear search | restore worked after explicit select-all/backspace interaction; visible rows returned to `19` |

Filtered-empty body sample:

```text
No assets are available in the current scope to export.
No assets match the current search or scope
```

### Display panel evidence

| metric | value |
| --- | --- |
| panel rect | `x=948 y=247 w=320 h=415` |
| visible content | `Display options`, `Font`, `Rows`, `Columns` |

### Saved views panel evidence

| metric | value |
| --- | --- |
| panel rect | `x=848 y=247 w=420 h=285.5` |
| visible content | `Saved views`, `Unsaved working view`, `System default` |

### Row action evidence

Rendered row-action click state:

```text
Row actions
FINANCE
FINANCE-S-001
Quick access
Quick Console Access
View Details
Edit Configuration
Soft Delete
```

Measured row-action menu container:

| metric | value |
| --- | --- |
| row-action menu rect | `x=686 y=250 w=578 h=224.5` |

Important rendered side effect:
- The same interaction also surfaced quick-look content for the selected asset, which is a no-deviation concern.

### Bulk action evidence

Rendered multi-select state after selecting two visible checkbox inputs:

```text
2 ASSETS SELECTED
Compare Selected
Set Status...
Set Environment...
Bulk Delete
```

Assessment:
- bulk state is visible and reachable;
- grammar is still bespoke and text appears inline in page body rather than proven through the shared bulk-action controller.

### Quick look evidence

Quick-look content observed after row activation:

```text
FINANCE-S-001
Maintenance
FINANCE // Switch
STATUS
MAINTENANCE
ENVIRONMENT
STAGING
NETWORK VECTOR
PRIMARY IP
10.125.114.36
MGMT URL
https://console-001.sysgrid.local
HARDWARE REGISTRY
"NO COMPONENTS"
ENGAGE FULL CONFIGURATION
```

### Create modal evidence

Rendered create modal content:

```text
New Asset Registration
Asset Identity, Classification & Life-cycle
Base Config
hardware
secrets
Relationships
metadata
Identity
Hostname
Asset Role / Description
Logical System
...
Save Asset
Close
```

### Route-state evidence

| action | URL result |
| --- | --- |
| default load | `/asset` |
| click `Purged` | `/asset?tab=deleted` |
| click `Map` while in deleted scope | `/asset?tab=deleted&view=map` |
| invalid params `tab=weird&view=nope&lens=bad&search=foo` | sanitized to `/asset?search=foo` |
| browser back after prior interactions | restored earlier search state: `/asset?search=FINANCE-S-001` |

Assessment:
- parameter sanitization exists;
- history stack remains noisy and not fully lock-ready.

### Responsive evidence at `960x720`

| metric | value |
| --- | --- |
| viewport | `960x720` |
| header rect | `x=272 y=108 w=641 h=76` |
| command bar rect | `x=272 y=200 w=641 h=260` |
| treegrid rect | `x=273 y=599 w=639 h=56` |

Assessment:
- command/header wrapping consumes too much vertical space;
- usable grid height collapses to `56px`, which is not no-deviation ready.

## Screenshot/evidence artifact table

| view/state | evidence artifact | status | notes |
| --- | --- | --- | --- |
| default load | this file + HTML evidence | PASS | inspectable numeric DOM evidence included |
| header and scope | this file + HTML evidence | PASS | rects and placement included |
| grid and rows | this file + HTML evidence | PASS | row counts and samples included |
| search/filter | this file + HTML evidence | PASS | filtered and filtered-empty behavior included |
| display panel | this file + HTML evidence | PASS | panel rect and visible content included |
| saved views panel | this file + HTML evidence | PASS | panel rect and visible content included |
| row action menu | this file + HTML evidence | PARTIAL | visible, but interaction also surfaced quick look |
| bulk action state | this file + HTML evidence | PARTIAL | visible with selection, but still bespoke |
| create modal | this file + HTML evidence | PASS | modal content rendered |
| dirty-state path | this file + HTML evidence | UNKNOWN | not conclusively re-driven |
| map/report | this file + HTML evidence | PARTIAL | report rendered; map mostly showed instructional state |
| responsive layout | this file + HTML evidence | FAIL | grid height collapsed materially at narrower width |

## Required rendered states checklist

| required state | status | notes |
| --- | --- | --- |
| 1. default `/asset` load with rows | PASS | visible table and rows present |
| 2. header/command area evidence | PASS | rects and scope placement captured |
| 3. table body evidence | PASS | grid rect and row samples captured |
| 4. visible row sample evidence | PASS | included above |
| 5. Existing/Purged selector evidence | PASS | correct location; URL updates captured |
| 6. search/filter evidence | PASS | filtering, filtered-empty, and restore captured |
| 7. display settings panel | PASS | rendered |
| 8. saved views panel | PASS | rendered |
| 9. row action menu | PARTIAL | rendered, but interaction drift observed |
| 10. bulk action state | PARTIAL | rendered, but still bespoke |
| 11. quick look/floating panel | PASS | rendered content captured |
| 12. create or edit modal | PASS | create modal rendered |
| 13. dirty-state confirmation path | UNKNOWN | not conclusively reproduced |
| 14. service/network modal or panel | UNKNOWN | not exercised in live run |
| 15. relationships/dependencies panel | UNKNOWN | not exercised in live run |
| 16. asset map view | PARTIAL | instructional state rendered; full graph not conclusively proven |
| 17. details view/panel | UNKNOWN | not conclusively re-driven |
| 18. history/compare/report surface | PARTIAL | report visible; compare/history not fully exercised |
| 19. security/secrets/hardware/monitoring panels | UNKNOWN | not exercised in live run |
| 20. refresh state | PASS | repeated reloads preserved visible baseline |
| 21. back/forward or route state persistence | PARTIAL | history restored prior search state and appears noisy |
| 22. responsive layout | FAIL | command bar expansion starved the table |

## Visual verdict

- No-deviation ready: `No`
- Deviations found: `Yes`
- Evidence incomplete: `Partially`

Primary reasons:
- visible baseline is restored;
- page-level no-deviation conformance is not;
- responsive layout, row-action behavior, bulk grammar, and persistence ownership remain unresolved.
