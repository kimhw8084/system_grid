# OUT-26 Iteration 28 Stage 26 Summary

1. Issue / iteration / stage / prompt type
   OUT-26 / Iteration 28 / Stage 26 / geometry-first golden shell transplant.
2. Worker result
   `PARTIAL`.
3. Controlling Stage 25 result
   Prior stage improved rendering but left the visible Asset shell largely controlled by the legacy workspace body.
4. One-more-chance user standard
   Asset must follow the Monitoring golden shell literally enough that geometry is owned by the transplanted shell, not by a broad legacy-body edit.
5. Files inspected
   `frontend/src/components/MonitoringGrid.tsx`
   `frontend/src/components/shared/OperationalWorkspaceShells.tsx`
   `frontend/src/components/shared/LayoutPrimitives.tsx`
   `frontend/src/components/shared/WorkspaceCommandBar.tsx`
   `frontend/src/components/Assets.tsx`
   `frontend/src/components/assets/AssetsGoldenWorkspace.tsx`
   `frontend/src/components/assets/assetGoldenColumns.tsx`
   `frontend/tests/assets-workflows.spec.ts`
   `frontend/tests/assets-golden-evidence.spec.ts`
   `frontend/src/App.tsx`
6. Files changed
   `frontend/src/components/Assets.tsx`
   `frontend/src/components/assets/AssetsGoldenWorkspace.tsx`
   `frontend/src/components/assets/AssetGoldenShellRoute.tsx`
   `frontend/src/components/assets/AssetGoldenShellScaffold.tsx`
7. New scaffold files created
   `frontend/src/components/assets/AssetGoldenShellRoute.tsx`
   `frontend/src/components/assets/AssetGoldenShellScaffold.tsx`
8. Architecture summary
   The canonical `/asset` route now delegates to a dedicated route component, which renders the legacy asset domain layer. The legacy layer no longer renders the shell directly. Instead it computes toolbar/panel/surface slots and passes them into `AssetGoldenShellScaffold`, which owns the visible header and command-bar geometry via `OperationalWorkspaceShell`.
9. Whether the new small scaffold controls visible `/asset`
   Yes in code structure. `AssetGoldenShellScaffold` is now the visible shell owner.
10. Whether old 5k-line body controls visible layout
   It still computes slot content and surface content, but no longer owns the outer shell markup.
11. Geometry baseline summary
   Monitoring golden baseline was identified in code from `MonitoringGrid.tsx` and shared shell primitives. Runtime measurement was not captured in this session because the local app/API were not running.
12. Geometry parity result
   Unverified at runtime.
13. Exact tolerances and measured deltas
   Not measured in this session.
14. Command bounds result
   Unverified at runtime.
15. Table / header / action-zone / first-row result
   Shell structure now matches the shared golden frame path in code; runtime measurements remain unverified.
16. Asset feature mounting result
   Existing asset grid/report/map/compare surfaces and floating panels remain mounted through scaffold slots.
17. Test coverage repair result
   Existing asset workflow and golden evidence specs were preserved; no new runtime coverage was added because local render services were unavailable.
18. Warning classification result
   Runtime warning stream not captured in this session.
19. Validation result
   `npm run typecheck` passed.
   `npm run build` passed.
   `npm run check:operational-registry-drift` passed.
   `npm run check:form-contracts` passed.
   `npm run check:row-action-contracts` passed.
   `npm run test:lint` passed.
   Browser evidence and workflow execution were blocked because local app/API endpoints were not up.
20. Route lock result
   Preserved in code: `/asset` remains canonical, `/asset-real` remains redirect-only, no new sidebar route, no `AssetReal.tsx` promotion.
21. Stage 12 / 18 / 19 preservation result
   No direct edits were made to those feature/data paths; the shell transplant preserves the existing asset surfaces and modal flows.
22. Remaining gaps
   No measured geometry parity.
   No command-bounds evidence.
   No runtime warning classification.
   No Playwright render proof.
23. Lesson learned
   The structural split is necessary before geometry tuning; the next pass should use the extracted scaffold to tune spacing with live measurements instead of editing the legacy workspace shell again.
24. Exact next prompt rule
   Use the new scaffold as the only shell owner and do geometry tuning plus evidence capture against live `/asset` and `/monitoring` renders.
25. Forbidden-action statement
   No backend/API changes, route changes, dependency setup, or done/lock actions were taken.
26. Unrelated-scope exclusion statement
   No unrelated workspace migrations or non-Asset route changes were made.
