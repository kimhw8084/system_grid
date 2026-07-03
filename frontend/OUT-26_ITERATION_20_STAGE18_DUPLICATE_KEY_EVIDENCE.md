# OUT-26 Iteration 20 Stage 18 Duplicate-Key Evidence

## Before/after console warning table
| Field | Before | After |
| --- | --- | --- |
| duplicate-key count | `76` from Stage 16 accepted render baseline | `0` on fresh post-fix `/asset` load |
| page errors | `0` | `0` |
| router future warnings | `2` in Stage 16 aggregate session | `1` on fresh post-fix `/asset` load |
| blocker warnings | duplicate-key warnings repeated on canonical `/asset` | none observed |

## Duplicate-key count before
- source: `frontend/OUT-26_ITERATION_18_STAGE16_RENDER_ONLY_EVIDENCE.md`
- value: `76`

## Duplicate-key count after
- fresh verification value: `0`
- fresh verification summary:
  - total console entries: `13`
  - page errors: `0`
  - router future warnings: `1`

## Component stack before
- `AnimatePresence`
- `OperationalWorkspaceFrame`
- `OperationalWorkspaceShell`
- `Assets`

## Source location
- rendered warning path:
  - canonical `/asset`
- source path:
  - `frontend/src/components/Assets.tsx:2861-3020`
- exact duplicate namespace:
  - outer `AnimatePresence` direct children were unkeyed and resolved to duplicate empty-string identity

## Fix evidence
- source change:
  - `frontend/src/components/Assets.tsx:2863-3013`
- added keys:
  - `asset-display-menu-panel`
  - `asset-saved-views-panel`
  - `asset-bulk-menu-panel`
  - `asset-quick-look-panel-${quickLookAsset.id}`

## Desktop evidence
| Field | Value |
| --- | --- |
| viewport | `1280x720` |
| grid visible | `yes` |
| visible rows | `14` |
| grid rectangle | `{ x: 272, y: 359, width: 961, height: 297 }` |
| Existing visible | `yes` |
| Purged visible | `yes` |
| Existing rectangle | `{ x: 1060.859375, y: 120, width: 81.203125, height: 36 }` |
| Purged rectangle | `{ x: 1146.0625, y: 120, width: 74.9375, height: 36 }` |
| badge under title/subtitle present | `no` |
| row samples | `FINANCE | Switch | Maintenance | Staging`; `MANUFACTURING | Switch | Active | Staging`; `BI-ANALYTICS | Physical | Provisioning | Production` |

## `960x720` evidence
| Field | Value |
| --- | --- |
| viewport | `960x720` |
| grid visible | `yes` |
| visible rows | `13` |
| grid rectangle | `{ x: 272, y: 374, width: 641, height: 282 }` |
| grid height >= `180px` | `yes` |
| visible rows >= `8` | `yes` |
| Existing visible | `yes` |
| Purged visible | `yes` |
| badge under title/subtitle present | `no` |

## Row-action evidence
| Check | Evidence | Result |
| --- | --- | --- |
| row-action trigger opens menu | `View Details` visible after clicking first `.row-action-trigger` | `PASS` |
| quick look stays closed from row-action trigger | `Engage Full Configuration` not visible after trigger click | `PASS` |
| row selection not changed by trigger | selected DOM row fragments after trigger `0` | `PASS` |
| intended quick-look path still works | row-body click opened quick look with `Engage Full Configuration` | `PASS` |

## Bulk-action evidence
| Check | Evidence | Result |
| --- | --- | --- |
| selection works | logical two-row selection represented by AG Grid mirrored selected DOM fragments `6` after second click | `PASS` |
| shared/anchored bulk grammar | `Bulk actions`, `Compare Selected`, `Set Status...`, `Set Environment...`, `Bulk Delete` visible | `PASS` |
| clear selection works | selected DOM fragments returned to `0` after `Clear Selection` | `PASS` |

## Route evidence
| Check | Evidence | Result |
| --- | --- | --- |
| `/asset` canonical render | loaded at `http://127.0.0.1:5173/asset` | `PASS` |
| `/asset-real` redirect-only | final URL `http://127.0.0.1:5173/asset` | `PASS` |
| route files changed | none | `PASS` |
| `AssetReal.tsx` promoted | no | `PASS` |

## Rich behavior spot-check evidence
| Slot | Evidence | Result |
| --- | --- | --- |
| quick look | `Engage Full Configuration` visible from row-body path | `PASS` |
| map entry | `http://127.0.0.1:5173/asset?view=map`; `svg/canvas` count `39` | `PASS` |
| details/forms | `+ Add Asset` opened form; `Asset Tag` placeholder visible | `PASS` |
| history/compare/report entry | `http://127.0.0.1:5173/asset?view=report`; bulk panel exposed `Compare Selected` | `PASS` |
| security/secrets/hardware/monitoring panel path | quick look showed `Hardware Registry` | `PASS` |
| import/export | `Template`, `Snapshot`, `Export CSV`, `Import Data` visible | `PASS` |
| display/saved views | `.display-menu-container` and `.views-menu-container` both opened | `PASS` |
| relationships/dependencies deep content | not fully walked in this narrow pass | `UNKNOWN` |
| service/network nested panels | not fully walked in this narrow pass | `UNKNOWN` |
