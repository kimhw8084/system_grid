# OUT-8 Evidence Gap Closure Audit

## Verdict
`PARTIAL_NEEDS_SOURCE_FIX`

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
- Shared bulk wording is not fully locked to the support-package exact contract. `frontend/src/components/shared/OperationalBulkContract.ts:20` singularizes to `selected record`, while the locked contract expects `selected records` even for `1 of 1`. This is a narrow source blocker because OUT-8 close-critical bulk wording would otherwise be overstated.
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
- `no-op has no revert`: `YES`. Revert is only attached when `changedCount > 0 && action !== 'purge'` in `frontend/src/components/shared/OperationalBulkContract.ts:115-120`.
- `actual update has revert when reversible`: `YES`. Monitoring, External, and Services all pass `onRevert` only when undo state exists at `frontend/src/components/MonitoringGrid.tsx:1616-1637`, `frontend/src/components/External.tsx:2207-2233`, and `frontend/src/components/ServicesReal.tsx:1563-1583`.
- `purge has no revert`: `YES`. Shared helper suppresses revert for `purge` in `frontend/src/components/shared/OperationalBulkContract.ts:115`.
- `blocked unsafe purge has exact explanation`: `YES`. `frontend/src/components/External.tsx:115,2295-2296,2998-3003,3108-3115`.
- `Services unsupported purge absent`: `YES`. Deleted-scope bulk and row actions expose restore only in `frontend/src/components/ServicesReal.tsx:2009-2018,2142-2145`.

## Evidence Gaps
| Gap | Severity | Blocks OUT-8? | Source Needed | Recommended Prompt If Blocking |
| --- | --- | --- | --- | --- |
| Shared bulk helper uses `selected record` for count `1`, but support contract locks `selected records` universally | High | Yes | `frontend/src/components/shared/OperationalBulkContract.ts` exact wording update plus tests | `Patch frontend/src/components/shared/OperationalBulkContract.ts so all success messages use "selected records" for both singular and plural counts, then add/adjust unit coverage for no-op, changed, archive, restore, purge, and revert visibility.` |
| Full generic row-action width law is broader than current trio row-action source proof; current source proves button-row coupling, not generic nested-control/card/dropdown coupling inside trio row-action panels | Medium | No | Either narrower claim language in close decision, or additional source/tests showing non-button controls inside `OperationalRowActionMenu` | `Audit or add proof for non-button row-action controls using OperationalRowActionMenu, or narrow the OUT-8 close claim to button-row width coupling only.` |

## Close Recommendation
`run one narrow source patch first`

The source and support package are strong enough to reach final human UI validation after one narrow blocker is removed: the shared bulk helper copy mismatch. Without that patch, OUT-8 would be claiming an exact locked bulk contract the current source does not fully satisfy. After that fix, proceed to human UI validation using `frontend/RUN3-E-ui-standard-acceptance-checklist.md`, while keeping the broader row-action nested-control claim scoped to what the trio source actually proves.
