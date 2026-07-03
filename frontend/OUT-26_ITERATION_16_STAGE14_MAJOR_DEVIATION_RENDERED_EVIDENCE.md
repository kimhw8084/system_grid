# OUT-26 Iteration 16 Stage 14 Major-Deviation Rendered Evidence

## Evidence metadata
- capture date: `2026-07-03`
- frontend target: `http://127.0.0.1:5173/asset`
- route-lock target: `http://127.0.0.1:5173/asset-real`
- evidence mode: `local elevated Playwright against already-running localhost frontend`

## Desktop default `/asset`
- viewport: `1280x720`
- URL: `/asset`
- title rect: `{ x: 272, y: 124, width: 603, height: 28 }`
- Existing rect: `{ x: 1061, y: 120, width: 81, height: 36 }`
- Purged rect: `{ x: 1146, y: 120, width: 75, height: 36 }`
- Bulk Actions rect: `{ x: 942, y: 249, width: 138, height: 36 }`
- Add Asset rect: `{ x: 1088, y: 249, width: 128, height: 36 }`
- search rect: `{ x: 289, y: 198, width: 512, height: 36 }`
- grid rect: `{ x: 273, y: 448, width: 959, height: 207 }`
- visible row count: `21`
- row count in DOM: `33`
- visible row samples:
  - `1FINANCE-S-001`
  - `2MANUFACTURING-S-002`
  - `3BI-ANALYTICS-P-003`
  - `4MANUFACTURING-P-004`
  - `5MANUFACTURING-P-005`

## Row-action trigger proof
- trigger click result:
  - menu open: `true`
  - menu rect: `{ x: 686, y: 298, width: 578, height: 225 }`
  - menu text: `Row actions FINANCE FINANCE-S-001 Quick access Quick Console Access View Details Edit Configuration Soft Delete`
  - quick look open: `false`
  - selected rows after row-action trigger: `0`
- conclusion:
  - row-action trigger no longer opens quick look
  - row-action trigger no longer selects the row as a side effect

## Quick-look intended row-body path
- row-body click result:
  - quick look open: `true`
  - selected rows after row-body click: `3`
- conclusion:
  - intended quick-look opening path still exists after the row-action isolation fix

## Bulk selection and bulk grammar
- selected two row checkboxes, then opened Bulk Actions
- panel open: `true`
- panel rect: `{ x: 928, y: 293, width: 340, height: 287 }`
- visible panel text:
  - `Bulk actions`
  - `2 assets selected`
  - `Clear Selection`
  - `Compare Selected`
  - `Set Status...`
  - `Set Environment...`
  - `Bulk Delete`

## Saved/display state and refresh proof
- after entering `FINANCE-S-001` in search:
  - URL: `/asset?search=FINANCE-S-001`
  - visible row count: `3`
  - row samples:
    - `1FINANCE-S-001`
    - `FINANCESwitchMaintenanceStaginghaewon.kimArista`
- display panel:
  - open: `true`
  - rect: `{ x: 335, y: 343, width: 320, height: 415 }`
  - visible text includes:
    - `Display options`
    - `Font 10px`
    - `Rows 16px`
    - `Columns`
- saved views panel:
  - open: `true`
  - rect: `{ x: 289, y: 343, width: 420, height: 286 }`
  - visible text includes:
    - `Saved views`
    - `Unsaved working view`
    - `System default`
- refresh result:
  - URL remained `/asset?search=FINANCE-S-001`
  - visible row count remained `3`
  - row samples remained filtered to the Finance asset

## Route-lock proof
- requested route: `/asset-real`
- final route after load: `/asset`
- conclusion:
  - legacy route remains redirect-only
  - canonical route remains `/asset`

## `960x720` responsive proof

### Default view
- viewport: `960x720`
- URL: `/asset`
- Existing rect: `{ x: 741, y: 120, width: 81, height: 36 }`
- Purged rect: `{ x: 826, y: 120, width: 75, height: 36 }`
- Bulk Actions rect: `{ x: 622, y: 308, width: 138, height: 36 }`
- search rect: `{ x: 289, y: 213, width: 321, height: 36 }`
- grid rect: `{ x: 273, y: 551, width: 639, height: 104 }`
- visible row count: `12`
- row samples:
  - `1FINANCE-S-001`
  - `2MANUFACTURING-S-002`
  - `3BI-ANALYTICS-P-003`
  - `4MANUFACTURING-P-004`
  - `FINANCESwitchMaintenance`

### Filtered view
- viewport: `960x720`
- URL: `/asset?search=FINANCE-S-001`
- Existing rect: `{ x: 741, y: 120, width: 81, height: 36 }`
- Purged rect: `{ x: 826, y: 120, width: 75, height: 36 }`
- Bulk Actions rect: `{ x: 622, y: 308, width: 138, height: 36 }`
- search rect: `{ x: 289, y: 213, width: 321, height: 36 }`
- grid rect: `{ x: 273, y: 551, width: 639, height: 104 }`
- visible row count: `3`

## Console errors / warnings inventory
- informational logs:
  - Vite connect/disconnect bootstrap noise
  - SysGrid bootstrap/config logs
- warnings/errors observed:
  - repeated duplicate-key React warnings under the Assets shell path
  - React Router v7 future-flag warning
- conclusion:
  - no new Stage 14-specific runtime crash surfaced
  - duplicate-key warning remains a known residual warning outside the scoped Stage 14 recovery root cause

## Evidence verdict by scoped finding
- `ND-001`: ownership reduced, but not fully eliminated
- `ND-002`: refresh-safe state improved through shared frontend persistence; backend preference contract still absent
- `ND-003`: fixed in rendered evidence
- `ND-004`: fixed in rendered evidence
- `ND-005`: improved and usable at `960x720`, but still tighter than ideal
