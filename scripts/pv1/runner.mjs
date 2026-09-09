import { createHash } from 'node:crypto'
import { access, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { buildCoverageMap, REVIEW_CELL_PROVENANCE } from './coverage.mjs'
import { executeRetainedChecks } from './retained-checks.mjs'

const PROJECT_TESTS = [
  'ProjectsCommunication.test.tsx', 'ProjectsDetailPanelHost.test.tsx', 'ProjectsGolden.accessibility.test.ts',
  'ProjectsGolden.contract.test.ts', 'ProjectsGolden.hierarchy.test.ts', 'ProjectsGolden.model.test.ts',
  'ProjectsGolden.navigation.contract.test.ts', 'ProjectsGolden.outcomes.contract.test.ts', 'ProjectsGolden.readability.contract.test.ts',
  'ProjectsGolden.savedViews.test.ts', 'ProjectsModernGantt.model.test.ts', 'ProjectsNavigation.test.ts',
  'ProjectsOutcomes.test.tsx', 'ProjectsPV1.contract.test.ts', 'ProjectsScheduleCore.test.ts',
  'ProjectsSchedulingCompletion.contract.test.ts', 'ProjectsSchedulingCompletion.model.test.ts',
  'ProjectsSchedulingCompletion.out40c.contract.test.ts', 'ProjectsSchedulingCompletion.out40d.contract.test.ts',
  'ProjectsSchedulingCompletion.out40e.contract.test.ts', 'ProjectsSchedulingCompletion.out40f.contract.test.ts',
  'ProjectsState.test.tsx', 'ProjectsStory.api.test.ts', 'ProjectsStory.contract.test.ts',
  'ProjectsStory.model.test.ts', 'ProjectsStory.portfolio.test.tsx', 'ProjectsTimeline.test.ts',
  'ProjectsVisualRepair.geometry.test.ts', 'ProjectsVisualShowcase.contract.test.ts',
  'ProjectsVisualShowcase.model.test.ts', 'ProjectsWorkPlan.contract.test.tsx', 'ProjectsWorkPlan.model.test.ts',
]

const BACKEND_PROJECT_TESTS = [
  'test_pv1_domain_foundation.py', 'test_p04_creation_portfolio_home.py', 'test_p05_my_day_work_plan.py',
  'test_p06_schedule_core.py', 'test_p06_schedule_performance.py', 'test_p06_timeline_scheduling.py',
  'test_p07_architecture_engine.py', 'test_p08_updates_resources_reports.py', 'test_p09_outcomes_delivery_value.py',
  'test_p10_cross_cutting_hardening.py', 'test_p11_legacy_migration.py', 'test_p11_project_portfolio_contract.py',
]

const BACKEND_MIGRATION_TESTS = [
  'test_p11_legacy_migration.py', 'test_startup_migrations.py', 'tests/test_database_isolation.py',
]

// Browser and large-profile performance checks are CPU-, port-, and
// database-intensive.  They may still run alongside light schema/unit checks,
// but must not contend with one another: timing evidence is otherwise a
// measurement of qualification scheduling rather than candidate behavior.
const QUALIFICATION_HEAVY_GROUP = 'qualification:heavy'

const PROOF_LAYER_IDS = [
  'schema_type_lint_build', 'domain_unit', 'real_database_api', 'concurrency_security', 'component_state',
  'retained_regression', 'pv1_browser_journeys', 'accessibility', 'performance_load',
  'migration_restore_rollback', 'independent_visual_review', 'human_usability', 'controlled_pilot',
]

const HUMAN_LAYERS = new Set(['independent_visual_review', 'human_usability', 'controlled_pilot'])

function executable(name) {
  return process.platform === 'win32' ? `${name}.cmd` : name
}

export function command(id, layer, cwd, file, args, options = {}) {
  return {
    id,
    layer,
    cwd,
    file,
    args,
    timeoutMs: options.timeoutMs || 900_000,
    env: options.env || {},
    artifact_files: options.artifact_files || [],
    depends_on: [...new Set(options.depends_on || options.prerequisites || [])],
    concurrency_group: options.concurrency_group || null,
  }
}

export function checkIdentity(spec) {
  return JSON.stringify({ cwd: spec.cwd, file: spec.file, args: spec.args || [], env: spec.env || {} })
}

export function deduplicateCheckDefinitions(checks) {
  const seen = new Map()
  const duplicates = []
  const unique = []
  for (const check of checks) {
    const identity = checkIdentity(check)
    if (seen.has(identity)) {
      duplicates.push({ duplicate_id: check.id, canonical_id: seen.get(identity), identity })
      continue
    }
    seen.set(identity, check.id)
    unique.push(check)
  }
  return { checks: unique, duplicates }
}

export function checkAccounting(checks) {
  const { checks: unique, duplicates } = deduplicateCheckDefinitions(checks)
  const variantKeys = new Set(unique.map((check) => `${check.id}:${JSON.stringify(check.env || {})}`))
  return {
    unique_registered_checks: unique.length,
    execution_instances: checks.length,
    variant_instances: variantKeys.size,
    duplicates_detected: duplicates,
    dependency_edges: unique.reduce((total, check) => total + (check.depends_on || []).length, 0),
  }
}

export function validateCheckDependencies(checks) {
  const byId = new Map()
  for (const check of checks) {
    if (byId.has(check.id)) throw new Error(`DUPLICATE_CHECK_ID:${check.id}`)
    byId.set(check.id, check)
  }
  const dependencyGraph = {}
  for (const check of checks) {
    const dependencies = [...new Set(check.depends_on || [])]
    dependencyGraph[check.id] = dependencies
    for (const dependency of dependencies) {
      if (!byId.has(dependency)) throw new Error(`UNKNOWN_CHECK_DEPENDENCY:${check.id}->${dependency}`)
      if (dependency === check.id) throw new Error(`DEPENDENCY_CYCLE:${check.id}->${dependency}`)
    }
  }
  const visiting = new Set()
  const visited = new Set()
  const visit = (id, pathStack = []) => {
    if (visiting.has(id)) {
      const cycleStart = pathStack.indexOf(id)
      throw new Error(`DEPENDENCY_CYCLE:${[...pathStack.slice(cycleStart), id].join('->')}`)
    }
    if (visited.has(id)) return
    visiting.add(id)
    for (const dependency of dependencyGraph[id]) visit(dependency, [...pathStack, id])
    visiting.delete(id)
    visited.add(id)
  }
  for (const check of checks) visit(check.id)
  return { checks, dependency_graph: dependencyGraph }
}

export async function buildChecks({ repoRoot, outputDir }) {
  const frontend = path.join(repoRoot, 'frontend')
  const backend = path.join(repoRoot, 'backend')
  const python = path.join(backend, 'venv', 'bin', 'python')
  const node = process.execPath
  const vitest = path.join(frontend, 'node_modules', '.bin', executable('vitest'))
  const projectTestPaths = PROJECT_TESTS.map((file) => path.join('src', 'components', file))
  const backendProjectPaths = BACKEND_PROJECT_TESTS.map((file) => path.join(backend, file))
  const migrationPaths = BACKEND_MIGRATION_TESTS.map((file) => path.join(backend, file))
  const checks = [
    command('schema:node-gate-tests', 'schema_type_lint_build', repoRoot, node, ['--test', 'scripts/tests/pv1-gate.test.mjs', 'scripts/tests/pv1-runner-orchestration.test.mjs']),
    command('frontend:typecheck', 'schema_type_lint_build', frontend, executable('npm'), ['run', 'typecheck']),
    command('frontend:build', 'schema_type_lint_build', frontend, executable('npm'), ['run', 'build'], { timeoutMs: 1_200_000 }),
    command('operations:contracts', 'schema_type_lint_build', frontend, executable('npm'), ['run', 'check:operational-contracts']),
    command('browser:p04', 'pv1_browser_journeys', repoRoot, 'bash', ['scripts/proof-p04-project-story.sh'], { timeoutMs: 1_200_000, concurrency_group: QUALIFICATION_HEAVY_GROUP }),
    command('backend:full', 'real_database_api', backend, python, ['-m', 'pytest', '-q'], { timeoutMs: 1_200_000 }),
    command('backend:release-universe', 'schema_type_lint_build', repoRoot, node, ['scripts/pv1/backend-test-universe.mjs', '--output-dir', path.join(outputDir, 'backend-test-universe')], { timeoutMs: 900_000, artifact_files: [path.join(outputDir, 'backend-test-universe', 'backend-test-universe.json'), path.join(outputDir, 'backend-test-universe', 'backend-full-nodeids.txt'), path.join(outputDir, 'backend-test-universe', 'backend-release-nodeids.txt')] }),
    command('domain:backend-pv1', 'domain_unit', backend, python, ['-m', 'pytest', '-q', ...backendProjectPaths], { timeoutMs: 1_200_000, concurrency_group: QUALIFICATION_HEAVY_GROUP }),
    command('security:backend', 'concurrency_security', backend, python, ['-m', 'pytest', '-q', path.join(backend, 'test_p10_cross_cutting_hardening.py'), path.join(backend, 'test_pv1_domain_foundation.py'), path.join(backend, 'test_p07_architecture_engine.py')], { timeoutMs: 900_000 }),
    command('migration:p11', 'migration_restore_rollback', backend, python, ['-m', 'pytest', '-q', ...migrationPaths], { timeoutMs: 900_000 }),
    command('domain:timeline-unit', 'domain_unit', backend, python, ['-m', 'pytest', '-q', path.join(backend, 'test_p06_schedule_core.py'), path.join(backend, 'test_p06_schedule_performance.py')], { timeoutMs: 900_000, concurrency_group: QUALIFICATION_HEAVY_GROUP }),
    command('domain:architecture', 'domain_unit', backend, python, ['-m', 'pytest', '-q', path.join(backend, 'test_p07_architecture_engine.py')], { timeoutMs: 900_000 }),
    command('domain:communication', 'domain_unit', backend, python, ['-m', 'pytest', '-q', path.join(backend, 'test_p08_updates_resources_reports.py')], { timeoutMs: 900_000 }),
    command('domain:outcomes', 'domain_unit', backend, python, ['-m', 'pytest', '-q', path.join(backend, 'test_p09_outcomes_delivery_value.py')], { timeoutMs: 900_000 }),
    command('domain:timeline', 'real_database_api', backend, python, ['-m', 'pytest', '-q', path.join(backend, 'test_p06_timeline_scheduling.py')], { timeoutMs: 900_000 }),
    command('frontend:projects-unit', 'component_state', frontend, vitest, ['run', ...projectTestPaths], { timeoutMs: 900_000 }),
    command('browser:p05', 'pv1_browser_journeys', repoRoot, 'bash', ['scripts/proof-p05-my-day-work-plan.sh'], { timeoutMs: 1_200_000, concurrency_group: QUALIFICATION_HEAVY_GROUP }),
    command('browser:p06', 'pv1_browser_journeys', repoRoot, 'bash', ['scripts/proof-p06-timeline-scheduling.sh'], { timeoutMs: 1_200_000, concurrency_group: QUALIFICATION_HEAVY_GROUP }),
    command('browser:p07', 'pv1_browser_journeys', repoRoot, 'bash', ['scripts/proof-p07-architecture.sh'], { timeoutMs: 1_200_000, concurrency_group: QUALIFICATION_HEAVY_GROUP }),
    command('browser:architecture-performance', 'pv1_browser_journeys', repoRoot, 'bash', ['scripts/proof-p07-architecture.sh', '--performance-only'], { timeoutMs: 1_200_000, concurrency_group: QUALIFICATION_HEAVY_GROUP, env: { SYSGRID_P07_BACKEND_PORT: '18073', SYSGRID_P07_FRONTEND_PORT: '15180', SYSGRID_P07_PERFORMANCE_ONLY: '1' } }),
    command('browser:p08', 'pv1_browser_journeys', repoRoot, 'bash', ['scripts/proof-p08-communication.sh'], { timeoutMs: 1_200_000, concurrency_group: QUALIFICATION_HEAVY_GROUP }),
    command('browser:p09', 'pv1_browser_journeys', repoRoot, 'bash', ['scripts/proof-p09-outcomes.sh'], { timeoutMs: 1_200_000, concurrency_group: QUALIFICATION_HEAVY_GROUP }),
    command('browser:p11', 'pv1_browser_journeys', repoRoot, 'bash', ['scripts/proof-p11-portfolio-regression.sh'], { timeoutMs: 1_200_000, concurrency_group: QUALIFICATION_HEAVY_GROUP }),
    command('browser:matrix', 'pv1_browser_journeys', frontend, node, ['scripts/run-pv1-browser-matrix.mjs'], { timeoutMs: 1_200_000, concurrency_group: QUALIFICATION_HEAVY_GROUP }),
    command('retained:root-diff', 'retained_regression', repoRoot, 'git', ['diff', '--check']),
    command('retained:visual', 'retained_regression', frontend, node, ['scripts/run-projects-visual-repair.mjs'], { timeoutMs: 1_200_000, concurrency_group: QUALIFICATION_HEAVY_GROUP }),
    command('retained:out40', 'retained_regression', frontend, node, ['scripts/run-projects-out40-slice-h-browser.mjs', '--mode', 'regression'], { timeoutMs: 1_200_000, concurrency_group: QUALIFICATION_HEAVY_GROUP }),
    command('retained:task-1001-virtualization', 'retained_regression', frontend, node, ['scripts/run-pv1-task-1001-evidence.mjs'], { timeoutMs: 600_000, concurrency_group: QUALIFICATION_HEAVY_GROUP, env: { P12_TASK_1001_OUTPUT: path.join(outputDir, 'task-1001-evidence.json') }, artifact_files: [path.join(outputDir, 'task-1001-evidence.json')] }),
    command('accessibility:architecture', 'accessibility', frontend, vitest, ['run', 'src/architecture/core.test.ts']),
    command('performance:architecture', 'performance_load', frontend, vitest, ['run', 'src/architecture/core.performance.test.ts'], { concurrency_group: QUALIFICATION_HEAVY_GROUP }),
    command('performance:schedule', 'performance_load', backend, python, ['-m', 'pytest', '-q', path.join(backend, 'test_p06_schedule_performance.py')], { timeoutMs: 900_000, concurrency_group: QUALIFICATION_HEAVY_GROUP }),
    command('performance:manifest', 'performance_load', repoRoot, node, ['scripts/pv1/performance-profiles.mjs', '--profile', 'all', '--output-dir', path.join(outputDir, 'performance')]),
    command('performance:api-projection', 'performance_load', repoRoot, 'bash', ['scripts/pv1/run-api-projection-proof.sh', '--output-dir', path.join(outputDir, 'performance-api')], { timeoutMs: 900_000, concurrency_group: QUALIFICATION_HEAVY_GROUP, artifact_files: [path.join(outputDir, 'performance-api', 'api-projection.json'), path.join(outputDir, 'performance-api', 'database-immutability.json')] }),
    // The Large browser proof includes 100 real 10,000-task previews; its
    // timeout must cover that required measurement without truncating it.
    command('browser:performance', 'pv1_browser_journeys', repoRoot, 'bash', ['scripts/pv1/run-p12-performance-browser.sh', '--output-dir', path.join(outputDir, 'performance-browser')], { timeoutMs: 6_000_000, depends_on: ['frontend:build'], concurrency_group: QUALIFICATION_HEAVY_GROUP, artifact_files: [path.join(outputDir, 'performance-browser', 'browser-performance.json'), path.join(outputDir, 'performance-browser', 'typical-browser-performance.json'), path.join(outputDir, 'performance-browser', 'large-browser-performance.json')] }),
    command('performance:variant-validation', 'performance_load', repoRoot, node, ['scripts/pv1/performance-variants.mjs', '--input', path.join(outputDir, 'performance-browser', 'large-browser-performance.json'), '--output', path.join(outputDir, 'performance-browser', 'variant-validation.json')], { timeoutMs: 30_000, depends_on: ['browser:performance'], artifact_files: [path.join(outputDir, 'performance-browser', 'variant-validation.json')] }),
    command('performance:measurement-integrity', 'performance_load', repoRoot, node, ['scripts/pv1/performance-evidence.mjs', '--input', path.join(outputDir, 'performance-browser', 'browser-performance.json'), '--output', path.join(outputDir, 'performance-browser', 'measurement-integrity.json')], { timeoutMs: 30_000, depends_on: ['browser:performance'], artifact_files: [path.join(outputDir, 'performance-browser', 'measurement-integrity.json')] }),
    // This check owns the normative 900-second workload; startup/fixture and
    // teardown time are outside the timed phase but inside the orchestrator.
    command('performance:load', 'performance_load', repoRoot, 'bash', ['scripts/pv1/run-p12-load.sh', '--output-dir', path.join(outputDir, 'performance-load')], { timeoutMs: 1_200_000, concurrency_group: QUALIFICATION_HEAVY_GROUP, artifact_files: [path.join(outputDir, 'performance-load', 'load-performance.json'), path.join(outputDir, 'performance-load', 'load-raw.jsonl')] }),
  ]
  const reviewDir = path.join(outputDir, 'review-cells')
  await mkdir(reviewDir, { recursive: true })
  for (const [requirementId, checkId] of Object.entries(REVIEW_CELL_PROVENANCE)) {
    const artifact = path.join(reviewDir, `${requirementId.toLowerCase()}.json`)
    checks.push(command(checkId, 'schema_type_lint_build', repoRoot, node, ['scripts/pv1/semantic-review.mjs', '--requirement', requirementId], {
      env: { SYSGRID_REPO_ROOT: repoRoot, PV1_REVIEW_OUTPUT: artifact },
      artifact_files: [artifact],
    }))
  }
  const accounting = checkAccounting(checks)
  const registered = deduplicateCheckDefinitions(checks).checks
  validateCheckDependencies(registered)
  registered.registration_accounting = accounting
  return registered
}

function safeName(id) {
  return id.replaceAll(/[^a-zA-Z0-9._-]/g, '_')
}

function sha256File(filename) {
  return readFile(filename).then((data) => createHash('sha256').update(data).digest('hex'))
}

async function writeJson(filename, value) {
  await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`)
}

function spawnCommand(spec, stdout, stderr) {
  return new Promise((resolve) => {
    const started = Date.now()
    let timedOut = false
    let child
    try {
      child = spawn(spec.file, spec.args, {
        cwd: spec.cwd,
        env: { ...process.env, CI: '1', ...spec.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (error) {
      resolve({ status: 'BLOCKED', exit_code: null, signal: null, duration_ms: Date.now() - started, error: error.message })
      return
    }
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
    }, spec.timeoutMs || 900_000)
    child.stdout.on('data', (chunk) => stdout.write(chunk))
    child.stderr.on('data', (chunk) => stderr.write(chunk))
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ status: 'BLOCKED', exit_code: null, signal: null, duration_ms: Date.now() - started, error: error.message })
    })
    child.on('exit', (code, signal) => {
      clearTimeout(timer)
      resolve({
        status: timedOut ? 'BLOCKED' : code === 0 ? 'PASS' : 'FAIL',
        exit_code: code,
        signal,
        duration_ms: Date.now() - started,
        timed_out: timedOut,
      })
    })
  })
}

export async function runCheck(spec, outputDir, context = {}) {
  return runCheckWithContext(spec, outputDir, context)
}

function runContext(outputDir, context = {}) {
  return {
    run_id: context.run_id || path.basename(path.resolve(outputDir)),
    candidate_git_sha: context.candidate_git_sha || null,
    candidate_tree_sha: context.candidate_tree_sha || null,
  }
}

function resolveRunArtifact(outputDir, filename) {
  const root = path.resolve(outputDir)
  const resolved = path.isAbsolute(filename) ? path.resolve(filename) : path.resolve(root, filename)
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error(`ARTIFACT_OUTSIDE_RUN_OUTPUT:${filename}`)
  return resolved
}

async function runCheckWithContext(spec, outputDir, context = {}) {
  const name = safeName(spec.id)
  const logsDir = path.join(outputDir, 'logs')
  const checksDir = path.join(outputDir, 'checks')
  await mkdir(logsDir, { recursive: true })
  await mkdir(checksDir, { recursive: true })
  const stdoutPath = path.join(logsDir, `${name}.stdout.log`)
  const stderrPath = path.join(logsDir, `${name}.stderr.log`)
  const executionContext = runContext(outputDir, context)
  const artifactPaths = (spec.artifact_files || []).map((filename) => resolveRunArtifact(outputDir, filename))
  for (const filename of artifactPaths) {
    try { await unlink(filename) } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  const { createWriteStream } = await import('node:fs')
  const stdout = createWriteStream(stdoutPath)
  const stderr = createWriteStream(stderrPath)
  const execution = await spawnCommand(spec, stdout, stderr)
  await new Promise((resolve) => stdout.end(resolve))
  await new Promise((resolve) => stderr.end(resolve))
  const declaredArtifacts = []
  const missingArtifacts = []
  for (const filename of artifactPaths) {
    try { await access(filename); declaredArtifacts.push(filename) } catch { missingArtifacts.push(filename) }
  }
  if (execution.status === 'PASS' && missingArtifacts.length) {
    execution.status = 'FAIL'
    execution.artifact_error = {
      code: 'MISSING_DECLARED_ARTIFACT',
      paths: missingArtifacts.map((filename) => path.relative(outputDir, filename)),
    }
  }
  const artifactBindings = await Promise.all(declaredArtifacts.map(async (filename) => ({
    path: path.relative(outputDir, filename),
    sha256: await sha256File(filename),
    run_id: executionContext.run_id,
    candidate_git_sha: executionContext.candidate_git_sha,
    candidate_tree_sha: executionContext.candidate_tree_sha,
  })))
  const summary = {
    schema: 'sysgrid.pv1.check-result.v1',
    check_id: spec.id,
    layer_id: spec.layer,
    command: { cwd: spec.cwd, file: spec.file, args: spec.args },
    run_id: executionContext.run_id,
    candidate_git_sha: executionContext.candidate_git_sha,
    candidate_tree_sha: executionContext.candidate_tree_sha,
    depends_on: [...(spec.depends_on || [])],
    declared_artifact_files: artifactPaths.map((filename) => path.relative(outputDir, filename)),
    artifact_bindings: artifactBindings,
    ...execution,
    stdout: path.relative(outputDir, stdoutPath),
    stderr: path.relative(outputDir, stderrPath),
  }
  const summaryPath = path.join(checksDir, `${name}.json`)
  await writeJson(summaryPath, summary)
  return {
    ...summary,
    artifact_files: [stdoutPath, stderrPath, summaryPath, ...declaredArtifacts],
  }
}

async function dependencyBlockedResult(spec, outputDir, context, dependencyFailure) {
  const executionContext = runContext(outputDir, context)
  const checksDir = path.join(outputDir, 'checks')
  await mkdir(checksDir, { recursive: true })
  const summaryPath = path.join(checksDir, `${safeName(spec.id)}.json`)
  const summary = {
    schema: 'sysgrid.pv1.check-result.v1',
    check_id: spec.id,
    layer_id: spec.layer,
    status: 'BLOCKED',
    run_id: executionContext.run_id,
    candidate_git_sha: executionContext.candidate_git_sha,
    candidate_tree_sha: executionContext.candidate_tree_sha,
    depends_on: [...(spec.depends_on || [])],
    dependency_failure: dependencyFailure,
  }
  await writeJson(summaryPath, summary)
  return { ...summary, artifact_files: [summaryPath] }
}

export async function validateDependencyResult(result, { outputDir, run_id, candidate_git_sha, candidate_tree_sha }) {
  if (!result || result.status !== 'PASS') return { valid: false, code: 'PREREQUISITE_NOT_PASS', check_id: result?.check_id || null }
  if (result.run_id !== run_id) return { valid: false, code: 'PREREQUISITE_RUN_MISMATCH', check_id: result.check_id }
  if (result.candidate_git_sha !== candidate_git_sha || result.candidate_tree_sha !== candidate_tree_sha) return { valid: false, code: 'PREREQUISITE_CANDIDATE_MISMATCH', check_id: result.check_id }
  const declared = result.declared_artifact_files || []
  const bindings = new Map((result.artifact_bindings || []).map((binding) => [binding.path, binding]))
  for (const relativePath of declared) {
    const filename = resolveRunArtifact(outputDir, path.join(outputDir, relativePath))
    const binding = bindings.get(relativePath)
    if (!binding) return { valid: false, code: 'PREREQUISITE_ARTIFACT_UNBOUND', check_id: result.check_id, path: relativePath }
    let currentHash
    try { currentHash = await sha256File(filename) } catch { return { valid: false, code: 'PREREQUISITE_ARTIFACT_MISSING', check_id: result.check_id, path: relativePath } }
    if (currentHash !== binding.sha256 || binding.run_id !== run_id || binding.candidate_git_sha !== candidate_git_sha || binding.candidate_tree_sha !== candidate_tree_sha) {
      return { valid: false, code: 'PREREQUISITE_ARTIFACT_BINDING_MISMATCH', check_id: result.check_id, path: relativePath }
    }
  }
  return { valid: true }
}

export async function runChecksWithDependencies(checks, outputDir, context = {}, options = {}) {
  const { dependency_graph } = validateCheckDependencies(checks)
  const maxConcurrency = Math.max(1, options.maxConcurrency || 4)
  const state = new Map(checks.map((check) => [check.id, 'PENDING']))
  const results = new Map()
  const running = new Map()
  const activeGroups = new Set()
  const executionOrder = []
  const completionOrder = []
  const blockedOrder = []
  const runOne = async (spec) => runCheckWithContext(spec, outputDir, context)

  const startRunnable = async () => {
    let started = false
    for (const spec of checks) {
      if (state.get(spec.id) !== 'PENDING') continue
      const dependencies = spec.depends_on || []
      if (!dependencies.every((dependency) => results.has(dependency))) continue
      const failedDependency = dependencies.map((dependency) => results.get(dependency)).find((result) => result.status !== 'PASS')
      if (failedDependency) {
        const result = await dependencyBlockedResult(spec, outputDir, context, {
          code: 'DEPENDENCY_FAILED',
          prerequisite: failedDependency.check_id,
          prerequisite_status: failedDependency.status,
        })
        results.set(spec.id, result)
        state.set(spec.id, 'DONE')
        blockedOrder.push(spec.id)
        started = true
        continue
      }
      let invalidDependency = null
      for (const dependency of dependencies) {
        const validation = await validateDependencyResult(results.get(dependency), {
          outputDir,
          ...runContext(outputDir, context),
        })
        if (!validation.valid) { invalidDependency = validation; break }
      }
      if (invalidDependency) {
        const result = await dependencyBlockedResult(spec, outputDir, context, {
          code: 'DEPENDENCY_ARTIFACT_INVALID',
          ...invalidDependency,
        })
        results.set(spec.id, result)
        state.set(spec.id, 'DONE')
        blockedOrder.push(spec.id)
        started = true
        continue
      }
      if (running.size >= maxConcurrency) break
      const group = spec.concurrency_group
      if (group && activeGroups.has(group)) continue
      state.set(spec.id, 'RUNNING')
      if (group) activeGroups.add(group)
      executionOrder.push(spec.id)
      const task = runOne(spec).then((result) => ({ id: spec.id, result, group }))
      running.set(spec.id, task)
      started = true
    }
    return started
  }

  while (results.size < checks.length) {
    const started = await startRunnable()
    if (running.size) {
      const completed = await Promise.race([...running.values()])
      running.delete(completed.id)
      if (completed.group) activeGroups.delete(completed.group)
      state.set(completed.id, 'DONE')
      results.set(completed.id, completed.result)
      completionOrder.push(completed.id)
      continue
    }
    if (results.size === checks.length) break
    if (!started) throw new Error('DEPENDENCY_SCHEDULER_STALLED')
  }
  return {
    results: checks.map((check) => results.get(check.id)),
    dependency_graph,
    scheduler: {
      max_concurrency: maxConcurrency,
      execution_order: executionOrder,
      completion_order: completionOrder,
      blocked_order: blockedOrder,
    },
  }
}

export async function runInternalCheck({ id, layer, outputDir, result = 'PASS', payload = {} }) {
  const checksDir = path.join(outputDir, 'checks')
  await mkdir(checksDir, { recursive: true })
  const filename = path.join(checksDir, `${safeName(id)}.json`)
  const summary = { schema: 'sysgrid.pv1.check-result.v1', check_id: id, layer_id: layer, status: result, ...payload }
  await writeJson(filename, summary)
  return { ...summary, artifact_files: [filename] }
}

export async function artifactHashes(outputDir, files) {
  return Promise.all(files.map(async (filename) => ({ path: path.relative(outputDir, filename), sha256: await sha256File(filename) })))
}

export { HUMAN_LAYERS, PROOF_LAYER_IDS }
