# OUT-26 Iteration 22 Stage 20 Golden Asset View Acceptance Matrix

| Item | Target | Method | Evidence | Result | Regression risk | Next prompt rule if not PASS |
|---|---|---|---|---|---|---|
| Stage 12 baseline | Grid visible, rows visible, top-right scope preserved, badge absent | Render + source inspection | Desktop and responsive captures | PASS | Low | n/a |
| ND-001 | Shared shell/header grammar retained | Source diff + render | `Assets.tsx` shell controls moved to native slots | PASS | Low | n/a |
| ND-002 | Grid/table remains operational | Render + responsive measurement | `261px` desktop grid, `218px` at `960x720` | PASS | Low | n/a |
| ND-003 | Row/bulk/floating grammar preserved | Contract checks + render inspection | `check:row-action-contracts` PASS; anchored bulk panel preserved | PASS | Medium | n/a |
| ND-004 | Canonical route/heading retained | Browser redirect check + source | `/asset-real` resolved to `/asset`; heading still `Asset Registry` | PASS | Low | n/a |
| ND-005 | Import/export controls preserved | Source + render | `Import`, `Template`, `Snapshot`, CSV export controls retained | PASS | Medium | n/a |
| Duplicate-key warnings | Zero | Browser console capture | `consoleIssues: []` | PASS | Low | n/a |
| Focused Assets workflow | Passing | Playwright | `tests/assets-workflows.spec.ts` passed | PASS | Medium | n/a |
| Route lock | `/asset` canonical, `/asset-real` redirect-only | Browser + source | Redirect landed on `/asset` | PASS | Low | n/a |
| Quick look | Preserve row-body quick look path | Source inspection | `handleRowClicked` still opens `setQuickLookId` and excludes action trigger | PASS | Medium | n/a |
| Map | Preserve map surface | Source inspection | `viewMode === 'map'` path preserved | PASS | Medium | n/a |
| Details/forms | Preserve asset detail and modal shells | Source inspection | `WorkspaceModal` detail/edit flows untouched | PASS | Medium | n/a |
| Relationships/dependencies | Preserve rich domain surfaces | Source inspection | `AssetDetailsView` and related modals preserved | PASS | Medium | n/a |
| History/compare/report | Preserve compare/report paths | Source inspection | `report` and `compare` branches preserved | PASS | Medium | n/a |
| Security/secrets/hardware/monitoring | Preserve deep asset detail content | Source inspection | No removal from asset detail/form surfaces | PASS | Medium | n/a |
| Import/export | Preserve import/export | Source + render | Controls still present in toolbar rows | PASS | Medium | n/a |
| Display/saved views | Shared controls visible | Render + source | `Views` and `Display` buttons now in native primary grammar | PASS | Low | n/a |
| Lifecycle/data states | Shared operational states preserved | Source + validation | `resolveOperationalDataState` unchanged | PASS | Low | n/a |
| Modal dirty-state | Preserve dirty close protection | Source inspection | `WorkspaceModal` dirty props unchanged | PASS | Low | n/a |
| Desktop golden visual match | Materially indistinguishable plug-in view | Render comparison | Improved alignment, but still not fully identical to Monitoring | PARTIAL | Medium | Continue only on remaining command-bar density/layout drift |
| `960x720` | Grid height >= `180px`, visible rows >= `8` | Browser measurement | `218px`, `11` rows | PASS | Low | n/a |
| Validation suite | All required checks pass | CLI commands | typecheck/build/lint/drift/form/row-action/assets workflow all PASS | PASS | Low | n/a |
| Proof completeness | All required proof files inside `frontend/` | Filesystem check | All 5 files created | PASS | Low | n/a |
