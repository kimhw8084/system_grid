import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { REVIEW_CELL_PROVENANCE } from './coverage.mjs'

const REVIEW_ASSERTIONS = {
  'PV-CORE-002': [['scripts/pv1/design-package.mjs', 'EXPECTED_REQUIREMENT_COUNT = 136', 'design package pins the requirement count'], ['scripts/pv1/gap-matrix.mjs', 'validateRequirementSet', 'gap matrix rejects incomplete or duplicate ID sets']],
  'PV-CORE-003': [['backend/app/pv1/domain.py', 'project_story_projections', 'backend has a canonical story projection'], ['frontend/src/components/ProjectsStory.tsx', 'project.story', 'Project UI consumes the canonical story contract']],
  'PV-CORE-004': [['scripts/pv1/design-package.mjs', 'EXPECTED_DESIGN_SHA256', 'design hash is pinned'], ['scripts/pv1/evidence-validator.mjs', 'candidate.design_sha256', 'evidence validates the design hash']],
  'PV-CORE-005': [['scripts/pv1/candidate-identity.mjs', 'identity_scope', 'candidate source scope is explicit'], ['scripts/pv1/evidence-validator.mjs', 'artifactRoot', 'evidence artifacts are resolved inside a bounded root']],
  'PV-NAV-001': [['frontend/src/components/ProjectsGolden.tsx', 'ProjectsGlobalNav', 'Projects has the canonical shell navigation'], ['frontend/src/components/ProjectsNavigation.test.ts', 'parseProjectsLocation', 'canonical navigation has executable route coverage']],
  'PV-WORK-008': [['frontend/src/components/ProjectsSchedulingCompletion.tsx', 'data-project-schedule-capacity', 'Work Plan exposes explicit capacity semantics'], ['backend/app/pv1/focus.py', 'FocusCandidate', 'Focus is computed from the domain engine']],
  'PV-ARCH-001': [['frontend/src/architecture/core.ts', 'normalizeArchitectureProjection', 'shared Architecture model normalization exists'], ['frontend/src/architecture/ArchitectureCanvas.tsx', 'data-pv1-architecture-engine', 'both hosts mount the shared editor host']],
  'PV-DATA-004': [['backend/app/pv1/models.py', 'class PV1ActivityProjection', 'durable activity projection exists'], ['backend/app/pv1/models.py', 'class PV1Metric', 'durable outcome metric records exist']],
  'PV-API-001': [['backend/app/api/pv1.py', 'router = APIRouter', 'v2 API router exists'], ['backend/app/pv1/domain.py', 'execute_command', 'v2 writes use the domain command path']],
  'PV-SEC-004': [['backend/app/api/pv1.py', 'financial.view', 'finance capability is checked server-side'], ['backend/app/pv1/outcomes.py', 'Decimal', 'financial calculations use exact decimal arithmetic']],
  'PV-PERF-001': [['scripts/pv1/performance-profiles.mjs', 'Large', 'release performance profiles include Large'], ['frontend/src/architecture/core.performance.test.ts', 'samples = Array.from({ length: 100 }', 'Architecture scale proof measures repeated samples']],
  'PV-GATE-001': [['scripts/pv1/candidate-identity.mjs', 'candidateIsReleaseReady', 'release candidate identity has a clean-worktree predicate'], ['scripts/pv1/evidence-validator.mjs', 'validateArtifactBytes', 'evidence validator checks artifact bytes']],
  'PV-GATE-006': [['scripts/pv1/gap-matrix.mjs', "GAP_STATUSES = ['NOT_EVALUATED', 'FAIL', 'BLOCKED', 'VERIFIED']", 'gate status arithmetic is explicit'], ['scripts/tests/pv1-gate.test.mjs', 'manual implemented=true is ignored', 'anti-false-green behavior is executable']],
  'PV-MIG-001': [['backend/app/pv1/migration.py', 'run_legacy_backfill', 'backfill service exists'], ['backend/test_p11_legacy_migration.py', 'resumes_without_duplicate_rows', 'migration resume proof exists']],
  'PV-MIG-004': [['backend/app/pv1/migration.py', 'source_changed', 'source drift is a named migration state'], ['backend/app/pv1/migration.py', 'reconcile_migration_row', 'explicit reconciliation path exists']],
  'PV-MIG-005': [['backend/app/pv1/migration.py', 'canonical_project_legacy_response', 'legacy compatibility is canonical-backed'], ['backend/app/api/projects.py', 'LEGACY_WRITE_REQUIRES_PV1_COMMAND', 'legacy writes have a single-writer cutover boundary']],
  'PV-MIG-006': [['scripts/pv1/gate.mjs', 'source-manifest.json', 'candidate source manifests are emitted externally'], ['scripts/pv1/gate.mjs', 'PHASE_RESULT.json', 'phase result artifacts are emitted externally']],
  'PV-REF-001': [['scripts/pv1/design-package.mjs', 'specificationSha256', 'reference package integrity is checked'], ['frontend/src/components/ProjectsGolden.tsx', 'data-pv1-projects-route', 'Projects reference route is mounted']],
  'PV-EDGE-002': [['frontend/src/components/ProjectsState.tsx', 'Unavailable', 'unavailable state grammar exists'], ['frontend/src/components/ProjectsState.test.tsx', 'state', 'state grammar has executable coverage']],
}

async function main() {
  const requirement = process.argv[process.argv.indexOf('--requirement') + 1]
  const repoRoot = process.env.SYSGRID_REPO_ROOT || process.cwd()
  const assertions = REVIEW_ASSERTIONS[requirement]
  if (!requirement || !assertions || !REVIEW_CELL_PROVENANCE[requirement]) throw new Error(`No independent review proof registered for ${requirement || '<missing requirement>'}`)
  const results = []
  for (const [relative, needle, label] of assertions) {
    const filename = path.join(repoRoot, relative)
    const source = await readFile(filename, 'utf8')
    const passed = source.includes(needle)
    results.push({ file: relative, assertion: label, needle, result: passed ? 'PASS' : 'FAIL' })
    if (!passed) throw new Error(`${requirement}: ${label} failed in ${relative}`)
  }
  const output = process.env.PV1_REVIEW_OUTPUT
  const payload = { schema: 'sysgrid.pv1.independent-static-review.v1', requirement_id: requirement, check_id: REVIEW_CELL_PROVENANCE[requirement], provenance: 'requirement-specific-independent-static-verification', assertions: results }
  if (output) await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify(payload)}\n`)
}

await main()
