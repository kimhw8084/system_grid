# OUT-40 World-class Gantt repair package

This package repairs both the original baseline and a partial/marker-only prior installation.

Key invariant: `ProjectTimeline` is considered installed **only when the complete function exactly matches** `ProjectTimeline.worldclass.tsx`. A marker alone is never treated as success.

`RUN_THIS.sh`:
1. computes complete target state before writing;
2. replaces the whole `ProjectTimeline` function if it differs from the packaged renderer;
3. upgrades the reviewed legacy dependency-path DOM-index mapping when present, or preserves an already-explicit identity mapping;
4. creates a timestamped backup before any repo change;
5. stages all changed files before replacement and rolls back on replacement failure;
6. verifies exact renderer equality and dependency identity;
7. runs the repo TypeScript check and OUT-40 contract tests when local dependencies exist.

No network calls. No GitHub writes. No Linear writes.
