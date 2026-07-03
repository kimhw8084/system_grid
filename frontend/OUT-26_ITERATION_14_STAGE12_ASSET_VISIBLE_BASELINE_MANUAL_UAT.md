# OUT-26 Iteration 14 Stage 12 Asset Visible Baseline Manual UAT

## Metadata

- Issue: `OUT-26 / Run 19 — Assets Golden Template Implementation`
- Iteration: `Iteration 14`
- Stage: `Stage 12 — emergency recovery after post-lock manual UAT failure`
- Date: `2026-07-03`
- Worker result: `PASS`

## Screenshot proof files

- Full page after load: `frontend/OUT-26_ITERATION_14_STAGE12_asset_full_final.png`
- Viewport after load: `frontend/OUT-26_ITERATION_14_STAGE12_asset_viewport_final.png`
- Header area with scope selector: `frontend/OUT-26_ITERATION_14_STAGE12_asset_header_scope_final.png`
- Grid/table with visible rows: `frontend/OUT-26_ITERATION_14_STAGE12_asset_grid_rows_final.png`
- Refresh baseline before final recovery comparison:
  - `frontend/OUT-26_ITERATION_14_STAGE12_asset_full_before.png`
  - `frontend/OUT-26_ITERATION_14_STAGE12_asset_viewport_before.png`
  - `frontend/OUT-26_ITERATION_14_STAGE12_asset_full_after.png`
  - `frontend/OUT-26_ITERATION_14_STAGE12_asset_viewport_after.png`

## Manual UAT observations

### 1. `/asset` full page after load

- Result: PASS
- The canonical Assets workspace loads under the shared operational shell.
- The page header shows `Infrastructure` and `Asset Registry`.

### 2. Visible table/grid and entity rows

- Result: PASS
- Final runtime evidence after refresh:
  - `rowCountInDom: 39`
  - `visibleRowCount: 19`
  - `gridRect: 975x271`
- Visible row samples:
  - `1 FINANCE-S-001`
  - `2 MANUFACTURING-S-002`
  - `3 BI-ANALYTICS-P-003`
  - `4 MANUFACTURING-P-004`
  - `5 MANUFACTURING-P-005`

### 3. Header area and Existing/Purged placement

- Result: PASS
- Existing/Purged is mounted in the shared header actions area.
- The lower content-box placement seen in the broken state is no longer present.
- Final header rect evidence: `977x77`

### 4. Random badge under title/subtitle

- Result: PASS
- Final DOM evidence: `hasMetaBadges: false`
- The stray `316 active · 0 deleted` line is removed from the header.

### 5. Refresh stability

- Result: PASS
- The page was reloaded and re-checked.
- The visible table, rows, and header scope placement remained correct after refresh.

### 6. Empty-state substitution check

- Result: PASS
- The page did not hide the regression behind an empty state.
- Live asset data was present and visible.

## DOM/runtime proof snapshot

```text
bodyStart:
... Asset Registry ...
Asset Scope
Existing
Purged
Table
List
Map
...
ID
NAME
SYSTEM
TYPE
STATUS
ENV
OWNER
MAKE
ACTION
1
FINANCE-S-001
2
MANUFACTURING-S-002
3
BI-ANALYTICS-P-003
...
```

## Console evidence

- No blocking runtime exception prevented page load.
- Remaining warning:
  - repeated React duplicate-key warning under `AnimatePresence`
- Assessment:
  - warning remains a cleanup item;
  - it did not block table/header visibility or route-level baseline recovery.

## Route-lock confirmation

- `/asset` remains canonical.
- `/asset` is still backed by `Assets`.
- `/asset-real` remains redirect-only to `/asset`.
- `AssetReal.tsx` was not promoted.

## Behavior preservation confirmation

| behavior | status | notes |
| --- | --- | --- |
| quick look | PASS | preserved |
| asset map | PASS | preserved |
| relationships/dependencies | PASS | preserved |
| details/forms | PASS | preserved |
| history/compare/report | PASS | preserved |
| row/bulk actions | PASS | preserved |
| security/secrets/hardware/monitoring panels | PASS | preserved |
| `AssetDetailsView.tsx` | PASS | preserved |

## Validation summary

- `rtk npm run typecheck`: PASS after removing one empty `ToolbarGroup`
- `rtk npm run build`: PASS
- `rtk npm run test:lint`: PASS
- `rtk npm run check:operational-registry-drift`: PASS
- `rtk npm run check:form-contracts`: PASS
- `rtk npm run check:row-action-contracts`: PASS

## Forbidden-command statement

- No `git`, `push`, `package`, `zip`, `release`, or dependency install commands were run.

## Unrelated-scope exclusion statement

- No unrelated workspace migration work was performed.
- No backend/API redesign was performed.

## Final worker result

`PASS`
