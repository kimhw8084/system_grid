# OUT-8 Evidence Gap Closure Audit

## Verdict
`BACKEND_REVERSIBLE_PURGE_IMPLEMENTED`

## Source Evidence Matrix
| Contract | Source Anchor | Evidence Status | Gap? | Required Action |
| --- | --- | --- | --- | --- |
| 1. Shared runtime/controller preservation | `frontend/src/components/shared/OperationalWorkspaceHooks.ts:311-404`; `frontend/src/components/shared/OperationalGridInteractions.ts:241-274`; `frontend/src/components/MonitoringGrid.tsx:63,661,1221`; `frontend/src/components/External.tsx:40,1490,1595`; `frontend/src/components/ServicesReal.tsx:53,587,1115` | `PROVEN` | No | None |
| 2. Monitoring, External, Services locked trio behavior | `frontend/src/components/MonitoringGrid.tsx:2164-2171`; `frontend/src/components/External.tsx:3135-3144`; `frontend/src/components/ServicesReal.tsx:2115-2159` | `PROVEN` | No | None |
| 3. Shared bulk contract exists and is used where expected | `frontend/src/components/shared/OperationalBulkContract.ts:16-18,69-120`; `frontend/src/components/MonitoringGrid.tsx:1622-1637`; `frontend/src/components/External.tsx:2219-2233`; `frontend/src/components/ServicesReal.tsx:1569-1583` | `PROVEN_WITH_COPY_GAP` | Yes | Fix exact singular/plural wording in shared helper before close-lock claim |
| 4. Services does not send unsupported `restore_snapshots` to backend bulk-action | `frontend/src/components/ServicesReal.tsx:1471-1495,1522-1535,1566` | `PROVEN` | No | None |
| 5. Services purge is not exposed in modern Services UI | `frontend/src/components/ServicesReal.tsx:2009-2018,2082-2108,2142-2155` | `PROVEN` | No | None |
| 6. External unsafe purge is blocked before backend call with exact explanation | `frontend/src/components/External.tsx:115`; `frontend/src/components/External.tsx:2293-2300`; `frontend/src/components/External.tsx:2998-3013`; `frontend/src/components/External.tsx:3106-3115` | `PROVEN` | No | None |
| 7. Row-action title/header never wraps | `frontend/src/components/shared/OperationalRowActionMenu.tsx:107-112` | `PROVEN` | No | None |
| 8. Long-title row-action width expands the panel and all controls share the resolved content width | `frontend/src/components/shared/OperationalRowActionMenu.tsx:65-80,130-145`; `frontend/src/components/shared/OperationalRowActionGeometry.ts:85-105,140-153` | `PARTIAL_PROVEN` | Yes | Current source proves shared button-row width coupling; do not overclaim generic nested-control/card/dropdown coverage from OUT-8 row-action source alone |
| 9. No future-run implementation is hidden inside OUT-8 close work | `frontend/OUT-8-support-package-index.md:55-58`; `frontend/RUN3-G-implementation-roadmap.md:59-66,132-136` | `PROVEN` | No | Keep downgraded items routed, not silently absorbed into OUT-8 close |
| 10. Typecheck/build blockers are understood and not misclassified as dependency absence | `frontend/RUN3-F-typecheck-build-blockers.md:44,66-69` | `PROVEN` | No | None |

## Support Package Evidence Matrix
| Support Artifact | Relevant OUT-8 Evidence | Status | Gap? |
| --- | --- | --- | --- |
| `frontend/OUT-8-support-package-index.md` | Confirms A-G package is support-only, routes future work into official OUT issues, blocks fake run creation and dependency churn misclassification | `STRONG` | No |
| `frontend/RUN3-A-workspace-drift-matrix.md` | Locks Monitoring/External/Services as the trio baseline and ties them to shared runtime and row-action stack | `STRONG` | No |
| `frontend/RUN3-B-bulk-contract-testpack.md` | Defines exact bulk wording, revert law, Services purge absence, External purge block standard | `STRONG` | Yes: exact wording contract is stricter than current shared helper singularization |
| `frontend/RUN3-C-row-action-contract-testpack.md` | Defines row-action width law and warns not to generalize beyond shared-path proof | `STRONG` | Yes: broader nested-control law is stronger than what current OUT-8 trio row-action source directly shows |
| `frontend/RUN3-D-api-action-contract-audit.md` | Separates `PROVEN` from `NEEDS_VERIFICATION`; confirms Services unsupported purge and External purge guard | `USABLE_WITH_LIMITS` | No |
| `frontend/RUN3-E-ui-standard-acceptance-checklist.md` | Provides deterministic final human validation gate for the trio | `STRONG` | No |
| `frontend/RUN3-F-typecheck-build-blockers.md` | Proves live blocker class is source-level type errors, not missing deps | `STRONG` | No |
| `frontend/RUN3-G-implementation-roadmap.md` | Confirms no implementation should be driven by downgraded claims and no route deletion should hide inside OUT-8 close | `STRONG` | No |

## OUT-8 Direct Close Risks
- Row-action width law is source-proven for shared button rows, but not generically for cards/dropdowns/nested controls inside the trio row-action panels. The trio source does not currently show those control types inside `OperationalRowActionMenu`, so a full generic pass claim would overreach the source.

## Future-Run Risks Not Blocking OUT-8
- `Monitoring` bulk update undo replays full snapshots through `PUT` and remains the only source-proven higher-severity revert concurrency risk. It is routed by `frontend/RUN3-D-api-action-contract-audit.md` to later corrective work and should not be silently collapsed into this OUT-8 close audit.
- `Services` and `External` changed-key revert overwrite severity stays `NEEDS_VERIFICATION` in `frontend/RUN3-D-api-action-contract-audit.md`; it should not block OUT-8 close by assumption.
- Duplicate route decisions for `/asset` vs `/asset-real` and `/vendors` vs `/vendors-real` remain later-run route-audit work and must not be mixed into OUT-8 close.
- Rack reorder route mismatch is source-proven but belongs to routed downstream work, not the locked trio/runtime close gate.

## Row-Action Width Law Verification
- `title one-line`: `PROVEN`. Meta and title both render with `truncate whitespace-nowrap` in `frontend/src/components/shared/OperationalRowActionMenu.tsx:110-111`.
- `title truncates/ellipsizes at viewport max`: `PROVEN`. Width is capped by `contentSafeWidth` and `viewportSafeWidth` in `frontend/src/components/shared/OperationalRowActionGeometry.ts:44-46,103-105`; the rendered title stays `truncate whitespace-nowrap`.
- `header/title/meta share panel width`: `PROVEN`. `headerContentWidth` is resolved from meta/title text in `frontend/src/components/shared/OperationalRowActionMenu.tsx:65-70` and drives `panelWidth` in `frontend/src/components/shared/OperationalRowActionGeometry.ts:103-105`.
- `buttons/cards/dropdowns/nested controls share the same resolved content width`: `PARTIAL`. Source directly proves shared width distribution for button rows only via `frontend/src/components/shared/OperationalRowActionGeometry.ts:88-100` and `frontend/src/components/shared/OperationalRowActionMenu.tsx:130-145`. Current audited trio row-action surfaces do not show cards/dropdowns/nested controls inside the row-action panel, so broader coverage is support-package evidence, not direct trio source evidence.
- `no title-only widening`: `PROVEN_FOR_BUTTON_ROWS_ONLY`. When header width expands the panel, row containers still render at `geometry.actionSetWidth` and child buttons are redistributed to that width. Broader non-button control types are not directly proven by the audited row-action source.

## Bulk Contract Verification
- `shared wording helper exists`: `YES`. `frontend/src/components/shared/OperationalBulkContract.ts:69-120`.
- `no-op has no revert`: `YES`. Revert is only attached when `changedCount > 0 && onRevert` in `frontend/src/components/shared/OperationalBulkContract.ts:115-120`.
- `actual update has revert when reversible`: `YES`. Monitoring, External, and Services all pass `onRevert` only when undo state exists at `frontend/src/components/MonitoringGrid.tsx:1616-1637`, `frontend/src/components/External.tsx:2207-2233`, and `frontend/src/components/ServicesReal.tsx:1563-1583`.
- `supported purge can have revert when truthful`: `YES`. Shared helper allows revert for any successful action when the caller supplies truthful `onRevert` data in `frontend/src/components/shared/OperationalBulkContract.ts:115-120`.
- `blocked unsafe purge has exact explanation`: `YES`. `frontend/src/components/External.tsx:115,2295-2296,2998-3003,3108-3115`.
- `Services unsupported purge absent`: `YES`. Deleted-scope bulk and row actions expose restore only in `frontend/src/components/ServicesReal.tsx:2009-2018,2142-2145`.
- `Monitoring purge revert truth`: `BACKEND_REVERSIBLE_PURGE_IMPLEMENTED`. `frontend/src/components/MonitoringGrid.tsx` now sends purge Revert through a backend `restore_purged` action, and `backend/app/api/monitoring.py` recreates the purged Monitoring row from the exact pre-purge snapshot before the grid refetches it.

## Backend Reversible Purge Capability Audit
- Verdict: `BACKEND_REVERSIBLE_PURGE_IMPLEMENTED`
- Purge endpoint/action:
  `backend/app/api/monitoring.py` bulk action `action == "purge"`
- Restore endpoint/action for existing deleted rows:
  `backend/app/api/monitoring.py` bulk action `action == "restore"`
  and history restore `POST /api/v1/monitoring/{item_id}/restore/{history_id}`
- Prior hard-delete finding:
  prior source used `delete(models.MonitoringItem)` for purge, which removed the row and cascaded Monitoring history, so ordinary restore could not revive it
- Deleted-row state retained before purge:
  `frontend/src/components/MonitoringGrid.tsx` already captured `previousSnapshots` before bulk actions, including deleted Monitoring rows selected for purge
- Backend recreate/upsert capability now used:
  `backend/app/api/monitoring.py` adds `restore_purged`, which recreates the purged Monitoring row from the exact pre-purge snapshot and writes a new restore history entry
- Why Revert is truthful:
  Revert no longer depends on frontend-only state. The frontend sends the stored snapshot back to the backend, the backend recreates the row in persistent storage, and the grid invalidates and refetches `monitoring-items` from source

## Evidence Gaps
| Gap | Severity | Blocks OUT-8? | Source Needed | Recommended Prompt If Blocking |
| --- | --- | --- | --- | --- |
| Full generic row-action width law is broader than current trio row-action source proof; current source proves button-row coupling, not generic nested-control/card/dropdown coupling inside trio row-action panels | Medium | No | Either narrower claim language in close decision, or additional source/tests showing non-button controls inside `OperationalRowActionMenu` | `Audit or add proof for non-button row-action controls using OperationalRowActionMenu, or narrow the OUT-8 close claim to button-row width coupling only.` |

## Close Recommendation
`backend reversible purge source recovery implemented; rerun H/I human validation`

The remaining step is H/I human validation. Monitoring purge Revert now restores the purged row through backend/source recreation, while External unsafe purge labeling/tooltips and Services purge absence remain source-verified. Keep the broader row-action nested-control claim scoped to what the trio source actually proves.

## Post-Fix Note — OperationalBulkContract Wording
- Verdict: `BULK_WORDING_FIXED_SOURCE_LEVEL`
- Source changed:
  `frontend/src/components/shared/OperationalBulkContract.ts`
- Confirmed:
  count 1 and count > 1 both use `selected records`
- Remaining OUT-8 close blocker:
  none from bulk wording
- Human validation still required:
  yes
- Exact source line changed:
  `frontend/src/components/shared/OperationalBulkContract.ts:20`
- Exact wording now guaranteed:
  `No changes made. Selected records already match the chosen value.`
  `Updated X of Y selected records: {Field Label} changed.`
  `Updated X of Y selected records: {Field Label} changed. N already matched.`
  `Archived X of Y selected records.`
  `Restored X of Y selected records.`
  `Permanently purged X of Y selected records.`
- Proof command output summary:
  `rg` now shows `getSelectedRecordLabel = () => 'selected records'` and the success-message templates all resolve through that constant.
  `npm run test:unit --prefix frontend -- OperationalBulkContract.test.ts` passed with `1` file and `6` tests passing.
  `npm run typecheck --prefix frontend` still fails on the pre-existing unrelated `NetworkReal.tsx` and `VendorsReal.tsx` errors already documented in `frontend/RUN3-F-typecheck-build-blockers.md`; no new typecheck failure was introduced by this patch.

## Post-Human-Validation H/I Recovery Note
- Monitoring purge Revert now uses backend-backed restore from the captured pre-purge snapshot
- External disabled Purge label fixed
- Services purge remains unexposed
- Human validation required again only for H/I

## Post-Human-Validation H/I Follow-Up Note
- External disabled Purge label fixed to `Purge`
- External disabled Purge tooltip/focus reason added
- Monitoring purge Revert truth source proof:
  `BACKEND_REVERSIBLE_PURGE_IMPLEMENTED`
- Services purge remains unexposed
- Human validation required again only for H/I

## Backend Reversible Purge Recovery Note
- Verdict:
  `BACKEND_REVERSIBLE_PURGE_IMPLEMENTED`
- Backend/source files changed:
  `backend/app/api/monitoring.py`
  `backend/test_monitoring_workflows.py`
- Frontend files changed:
  `frontend/src/components/MonitoringGrid.tsx`
  `frontend/OUT-8-human-validation-packet.md`
  `frontend/OUT-8-evidence-gap-closure.md`
- Exact restore mechanism:
  Monitoring purge Revert calls backend bulk action `restore_purged` with the exact pre-purge snapshots captured from `monitoring-items`. The backend recreates each purged Monitoring row by original id and re-inserts owner rows before committing and writing a restore history entry
- Why Revert is truthful:
  After purge, the row is absent from source. Revert performs a backend recreate, then the frontend invalidates and refetches `monitoring-items`, so the returned row is source-backed rather than local-only
- Proof command summary:
  source grep now shows `restore_purged` in `backend/app/api/monitoring.py` and `restore_purged` undo wiring in `frontend/src/components/MonitoringGrid.tsx`
  targeted backend test proves purge removes the row and `restore_purged` makes it fetchable again
  `npm run typecheck --prefix frontend` still reports only the pre-existing `NetworkReal.tsx` and `VendorsReal.tsx` errors
- Remaining human validation required:
  H/I only
