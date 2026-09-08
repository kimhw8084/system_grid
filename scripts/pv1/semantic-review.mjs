import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { collectCandidateIdentity } from './candidate-identity.mjs'
import { loadDesignPackage } from './design-package.mjs'
import { REVIEW_CELL_PROVENANCE } from './coverage.mjs'

const node = process.execPath

function backend(repoRoot, files) {
  const cwd = path.join(repoRoot, 'backend')
  return { cwd, file: path.join(cwd, 'venv', 'bin', 'python'), args: ['-m', 'pytest', '-q', ...files.map((file) => path.join(cwd, file))] }
}

function frontend(repoRoot, files) {
  const cwd = path.join(repoRoot, 'frontend')
  return { cwd, file: path.join(cwd, 'node_modules', '.bin', process.platform === 'win32' ? 'vitest.cmd' : 'vitest'), args: ['run', ...files] }
}

const PROOFS = {
  'PV-CORE-002': (root) => ({ cwd: root, file: node, args: ['--test', 'scripts/tests/pv1-gate.test.mjs'] }),
  'PV-CORE-003': (root) => backend(root, ['test_p11_project_portfolio_contract.py']),
  'PV-CORE-004': (root) => ({ cwd: root, file: node, args: ['--test', 'scripts/tests/pv1-gate.test.mjs'] }),
  'PV-CORE-005': (root) => ({ cwd: root, file: node, args: ['--test', 'scripts/tests/pv1-gate.test.mjs'] }),
  'PV-NAV-001': (root) => frontend(root, ['src/components/ProjectsNavigation.test.ts', 'src/components/ProjectsGolden.navigation.contract.test.ts']),
  'PV-WORK-008': (root) => backend(root, ['test_p05_my_day_work_plan.py']),
  'PV-ARCH-001': (root) => backend(root, ['test_p07_architecture_engine.py']),
  'PV-DATA-004': (root) => backend(root, ['test_p08_updates_resources_reports.py', 'test_p09_outcomes_delivery_value.py']),
  'PV-API-001': (root) => backend(root, ['test_pv1_domain_foundation.py']),
  'PV-SEC-004': (root) => backend(root, ['test_p09_outcomes_delivery_value.py', 'test_p10_cross_cutting_hardening.py']),
  'PV-PERF-001': (root) => ({ cwd: root, file: node, args: ['scripts/pv1/performance-profiles.mjs', '--profile', 'all'] }),
  'PV-GATE-001': (root) => ({ cwd: root, file: node, args: ['--test', 'scripts/tests/pv1-gate.test.mjs'] }),
  'PV-GATE-006': (root) => ({ cwd: root, file: node, args: ['--test', 'scripts/tests/pv1-gate.test.mjs'] }),
  'PV-MIG-001': (root) => backend(root, ['test_p11_legacy_migration.py']),
  'PV-MIG-004': (root) => backend(root, ['test_p11_legacy_migration.py']),
  'PV-MIG-005': (root) => backend(root, ['test_p11_legacy_migration.py', 'test_p11_project_portfolio_contract.py']),
  'PV-MIG-006': (root) => ({ cwd: root, file: node, args: ['--test', 'scripts/tests/pv1-gate.test.mjs'] }),
  'PV-REF-001': (root) => frontend(root, ['src/components/ProjectsGolden.contract.test.ts', 'src/components/ProjectsVisualShowcase.contract.test.ts']),
  'PV-EDGE-002': (root) => frontend(root, ['src/components/ProjectsState.test.tsx']),
}

function execute(producer) {
  const started = Date.now()
  try {
    const stdout = execFileSync(producer.file, producer.args, { cwd: producer.cwd, env: { ...process.env, CI: '1', TESTING: '1', ENVIRONMENT: 'test' }, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    return { status: 'PASS', exit_code: 0, duration_ms: Date.now() - started, stdout: stdout.slice(-12000), stderr: '' }
  } catch (error) {
    return { status: 'FAIL', exit_code: error.status ?? 1, duration_ms: Date.now() - started, stdout: String(error.stdout || '').slice(-12000), stderr: String(error.stderr || error.message || '').slice(-12000) }
  }
}

export const semanticProofRegistry = PROOFS

async function main() {
  const requirement = process.argv[process.argv.indexOf('--requirement') + 1]
  const repoRoot = process.env.SYSGRID_REPO_ROOT || process.cwd()
  const producer = PROOFS[requirement]
  if (!requirement || !producer || !REVIEW_CELL_PROVENANCE[requirement]) throw new Error(`No executable semantic proof registered for ${requirement || '<missing requirement>'}`)
  const design = await loadDesignPackage()
  const candidate = await collectCandidateIdentity({ repoRoot })
  const spec = producer(repoRoot)
  const execution = execute(spec)
  const payload = {
    schema: 'sysgrid.pv1.semantic-evidence.v2',
    requirement_id: requirement,
    check_id: REVIEW_CELL_PROVENANCE[requirement],
    producer_type: 'executable_behavioral_proof',
    provenance: 'requirement-specific executable test or runtime contract; no source-string assertions',
    candidate: { source_commit: candidate.source_commit, source_tree: candidate.source_tree, design_sha256: design.specificationSha256 },
    command: { cwd: spec.cwd, file: spec.file, args: spec.args },
    asserted_behavior: `The registered executable proof for ${requirement} must pass against this candidate; a failing domain/UI/gate assertion makes this evidence FAIL.`,
    execution,
    verdict: execution.status === 'PASS',
  }
  const output = process.env.PV1_REVIEW_OUTPUT
  if (output) await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify(payload)}\n`)
  if (!payload.verdict) process.exitCode = 1
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
