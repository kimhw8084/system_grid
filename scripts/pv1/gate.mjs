import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildCoverageMap } from './coverage.mjs'
import { candidateIsReleaseReady, collectCandidateIdentity } from './candidate-identity.mjs'
import { loadDesignPackage, REPOSITORY_ROOT } from './design-package.mjs'
import { createGapMatrix, evaluateGate } from './gap-matrix.mjs'
import { discoverRetainedChecks, executeRetainedChecks } from './retained-checks.mjs'
import { validateEvidenceRecords } from './evidence-validator.mjs'
import { artifactHashes, buildChecks, runCheck, runChecksWithDependencies, runInternalCheck, HUMAN_LAYERS, PROOF_LAYER_IDS } from './runner.mjs'

const TASK1001_SCHEMA = 'sysgrid.pv1.task-1001-regression.v1'
const TASK1001_EVIDENCE_SCHEMA = 'sysgrid.pv1.task-1001-virtualization-evidence.v1'
const TASK1001_CHECK_ID = 'retained:task-1001-virtualization'
const TASK1001_REQUIREMENT_IDS = ['PV-PERF-002', 'PV-GATE-006']
const TASK1001_TARGET_ID = '1001'
const TASK1001_LOGICAL_TASK_COUNT = 120

function timestampId() {
  return new Date().toISOString().replaceAll(/[-:.]/g, '').replace('Z', 'Z')
}

function git(repoRoot, args) {
  return execFileSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8' }).trim()
}

async function writeJson(filename, value) {
  await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`)
}

async function collectPhaseInventory() {
  const root = path.join(process.env.AI_ROOT || '/Users/haewonkim/Library/Mobile Documents/com~apple~CloudDocs/gpt/sysgrid', 'codex', 'runs')
  const phases = []
  try {
    for (const phase of await readdir(root, { withFileTypes: true })) {
      if (!phase.isDirectory()) continue
      const phaseRoot = path.join(root, phase.name)
      for (const run of await readdir(phaseRoot, { withFileTypes: true })) {
        if (!run.isDirectory()) continue
        const result = path.join(phaseRoot, run.name, 'PHASE_RESULT.md')
        try {
          await readFile(result)
          phases.push({ phase: phase.name, run: run.name, result })
        } catch {
          phases.push({ phase: phase.name, run: run.name, result, missing: true })
        }
      }
    }
  } catch {
    return []
  }
  return phases.sort((a, b) => `${a.phase}/${a.run}`.localeCompare(`${b.phase}/${b.run}`))
}

function statusOf(result) {
  return result?.status || result?.result || 'NOT_EVALUATED'
}

function evidenceResult(status) {
  if (status === 'PASS') return 'PASS'
  if (status === 'FAIL') return 'FAIL'
  if (status === 'BLOCKED') return 'BLOCKED'
  return 'SKIPPED'
}

function evidenceCandidate(candidate, designSha256) {
  return {
    source_commit: candidate.source_commit,
    source_tree: candidate.source_tree,
    dirty_patch_sha256: candidate.dirty_patch_sha256,
    frontend_digest: candidate.frontend_digest,
    backend_digest: candidate.backend_digest,
    database_migration_revision: candidate.database_migration_revision,
    design_sha256: designSha256,
  }
}

export function releaseCandidateRejection(candidate) {
  if (candidateIsReleaseReady(candidate)) return null
  return {
    code: 'DIRTY_TRACKED_WORKTREE',
    message: 'The release gate refuses to certify a tracked dirty working tree. Commit the exact candidate and rerun qualification.',
    candidate_git_sha: candidate?.source_commit || null,
    candidate_tree_sha: candidate?.source_tree || null,
    tracked_worktree_dirty: candidate?.tracked_worktree_dirty ?? null,
    tracked_dirty_paths: candidate?.tracked_dirty_paths || [],
  }
}

async function makeEvidenceRecords({ design, candidate, coverageMap, checkResults, outputDir, fixtureId, environmentId }) {
  const records = []
  const fallback = path.join(outputDir, 'coverage-map.json')
  for (const requirement of design.requirements.requirements) {
    const coverage = coverageMap[requirement.id]
    for (const [evidenceType, checkId] of Object.entries(coverage.evidence_types)) {
      const check = checkResults.get(checkId)
      const status = statusOf(check)
      const files = check?.artifact_files?.length ? check.artifact_files : [fallback]
      records.push({
        requirement_id: requirement.id,
        evidence_type: evidenceType,
        check_id: checkId,
        result: evidenceResult(status),
        procedure: `P12 release gate executed ${checkId} for ${requirement.id}; no manual status is accepted.`,
        timestamp: new Date().toISOString(),
        candidate: evidenceCandidate(candidate, design.specificationSha256),
        fixture_id: fixtureId,
        environment_id: environmentId,
        artifact_hashes: await artifactHashes(outputDir, files),
      })
    }
  }
  return records
}

function task1001Diagnostic(code, message) {
  return { code, message }
}

function task1001RecordBase({ candidate, check, fixtureId, environmentId, required }) {
  return {
    schema: TASK1001_EVIDENCE_SCHEMA,
    check_id: TASK1001_CHECK_ID,
    requirement_ids: [...TASK1001_REQUIREMENT_IDS],
    result: required ? 'FAIL' : 'SKIPPED',
    fixture_id: fixtureId,
    environment_id: environmentId,
    candidate_git_sha: candidate?.source_commit || null,
    candidate_tree_sha: candidate?.source_tree || null,
    target_task_id: TASK1001_TARGET_ID,
    test_command: check?.command || null,
    artifact: null,
    logical_task_count: null,
    realized_row_count: null,
    dom_bound: null,
    scrollport_height: null,
    target_addressable: null,
    target_visible: null,
    target_selectable: null,
    failure_reasons: [],
    verdict: false,
  }
}

function finishTask1001Record(record, failureReasons, { required = true } = {}) {
  record.failure_reasons = failureReasons
  if (!required) {
    record.result = 'SKIPPED'
    record.verdict = false
    return record
  }
  record.result = failureReasons.length ? 'FAIL' : 'PASS'
  record.verdict = failureReasons.length === 0
  return record
}

function safeArtifactRelativePath(outputDir, artifactPath) {
  if (typeof artifactPath !== 'string' || !artifactPath) return null
  const root = path.resolve(outputDir)
  const resolved = path.resolve(root, artifactPath)
  const relative = path.relative(root, resolved)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null
  return relative.split(path.sep).join('/')
}

function sameStringArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index])
}

function requireTask1001Boolean(source, field, failureReasons) {
  if (source[field] !== true) {
    failureReasons.push(task1001Diagnostic(`${field.toUpperCase()}_NOT_TRUE`, `${field} must be explicitly true`))
  }
}

function task1001CheckFailures(candidate, check) {
  const failureReasons = []
  if (statusOf(check) !== 'PASS') {
    failureReasons.push(task1001Diagnostic('PRODUCER_CHECK_NOT_PASS', `Producer check status is ${statusOf(check)}, expected PASS`))
  }
  if (check?.candidate_git_sha !== candidate?.source_commit || check?.candidate_tree_sha !== candidate?.source_tree) {
    failureReasons.push(task1001Diagnostic('PRODUCER_CANDIDATE_MISMATCH', 'Producer check candidate identity does not match the gate candidate'))
  }
  return failureReasons
}

/**
 * Normalize and validate the producer's task-1001 artifact without doing I/O.
 * The caller must provide metadata calculated from the exact artifact bytes.
 */
export function normalizeTask1001Evidence({ candidate, check, source, artifact, artifactBinding, outputDir, fixtureId, environmentId, required = true }) {
  const record = task1001RecordBase({ candidate, check, fixtureId, environmentId, required })
  const failureReasons = []

  if (!required) {
    failureReasons.push(task1001Diagnostic('PROFILE_NOT_REQUIRED', 'Task-1001 dedicated evidence is not required outside the release profile'))
    return finishTask1001Record(record, failureReasons, { required })
  }

  failureReasons.push(...task1001CheckFailures(candidate, check))

  if (!artifact || typeof artifact !== 'object') {
    failureReasons.push(task1001Diagnostic('ARTIFACT_METADATA_MISSING', 'Producer artifact metadata is missing'))
  } else {
    const relativePath = safeArtifactRelativePath(outputDir, artifact.path)
    if (!relativePath || relativePath !== artifact.path) {
      failureReasons.push(task1001Diagnostic('ARTIFACT_PATH_UNSAFE', 'Artifact path must be relative and contained by the gate output root'))
    }
    if (typeof artifact.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(artifact.sha256)) {
      failureReasons.push(task1001Diagnostic('ARTIFACT_HASH_INVALID', 'Artifact SHA-256 is missing or malformed'))
    }
    if (!Number.isInteger(artifact.size) || artifact.size < 0) {
      failureReasons.push(task1001Diagnostic('ARTIFACT_SIZE_INVALID', 'Artifact byte size is missing or invalid'))
    }
    record.artifact = { path: artifact.path || null, sha256: artifact.sha256 || null, size: Number.isInteger(artifact.size) ? artifact.size : null }
    if (!artifactBinding) {
      failureReasons.push(task1001Diagnostic('ARTIFACT_BINDING_MISSING', 'Runner did not bind the producer artifact to this run'))
    } else {
      if (artifactBinding.path !== artifact.path || artifactBinding.sha256 !== artifact.sha256) {
        failureReasons.push(task1001Diagnostic('ARTIFACT_BINDING_MISMATCH', 'Runner artifact binding does not match the bytes being normalized'))
      }
      if (artifactBinding.candidate_git_sha !== candidate?.source_commit || artifactBinding.candidate_tree_sha !== candidate?.source_tree) {
        failureReasons.push(task1001Diagnostic('ARTIFACT_CANDIDATE_MISMATCH', 'Artifact binding candidate identity does not match the gate candidate'))
      }
    }
  }

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    failureReasons.push(task1001Diagnostic('ARTIFACT_JSON_INVALID', 'Producer artifact is not a JSON object'))
    return finishTask1001Record(record, failureReasons, { required })
  }

  record.logical_task_count = source.logical_task_count ?? null
  record.realized_row_count = source.realized_row_count ?? null
  record.dom_bound = source.dom_bound ?? null
  record.scrollport_height = source.scrollport_height ?? null
  record.target_addressable = source.target_addressable ?? null
  record.target_visible = source.target_visible ?? null
  record.target_selectable = source.target_selectable ?? null

  if (source.schema !== TASK1001_SCHEMA) failureReasons.push(task1001Diagnostic('SCHEMA_MISMATCH', `Producer schema must be ${TASK1001_SCHEMA}`))
  if (source.check_id !== TASK1001_CHECK_ID) failureReasons.push(task1001Diagnostic('CHECK_ID_MISMATCH', `Producer check_id must be ${TASK1001_CHECK_ID}`))
  if (!sameStringArray(source.requirement_ids, TASK1001_REQUIREMENT_IDS)) failureReasons.push(task1001Diagnostic('REQUIREMENT_IDS_MISMATCH', 'Producer requirement_ids do not match the dedicated check contract'))
  if (source.candidate_git_sha !== candidate?.source_commit || source.candidate_tree_sha !== candidate?.source_tree) {
    failureReasons.push(task1001Diagnostic('ARTIFACT_CANDIDATE_MISMATCH', 'Producer artifact candidate identity does not match the gate candidate'))
  }
  if (source.target_task_id !== TASK1001_TARGET_ID) failureReasons.push(task1001Diagnostic('TARGET_TASK_MISMATCH', `Producer target_task_id must be ${TASK1001_TARGET_ID}`))
  if (source.logical_task_count !== TASK1001_LOGICAL_TASK_COUNT) failureReasons.push(task1001Diagnostic('LOGICAL_TASK_COUNT_INVALID', `logical_task_count must be ${TASK1001_LOGICAL_TASK_COUNT}`))
  if (!Number.isInteger(source.realized_row_count) || source.realized_row_count < 0) failureReasons.push(task1001Diagnostic('REALIZED_ROW_COUNT_INVALID', 'realized_row_count must be a non-negative integer'))
  if (!Number.isInteger(source.dom_bound) || source.dom_bound <= 0) failureReasons.push(task1001Diagnostic('DOM_BOUND_INVALID', 'dom_bound must be a positive integer'))
  if (Number.isInteger(source.realized_row_count) && Number.isInteger(source.dom_bound) && source.realized_row_count > source.dom_bound) {
    failureReasons.push(task1001Diagnostic('REALIZED_ROWS_EXCEED_BOUND', 'realized_row_count must not exceed dom_bound'))
  }
  if (!Number.isInteger(source.scrollport_height) || source.scrollport_height <= 0) failureReasons.push(task1001Diagnostic('SCROLLPORT_HEIGHT_INVALID', 'scrollport_height must be a positive integer'))
  requireTask1001Boolean(source, 'target_addressable', failureReasons)
  requireTask1001Boolean(source, 'target_visible', failureReasons)
  requireTask1001Boolean(source, 'target_selectable', failureReasons)
  if (source.verdict !== true) failureReasons.push(task1001Diagnostic('PRODUCER_VERDICT_NOT_TRUE', 'Producer verdict must be explicitly true'))

  return finishTask1001Record(record, failureReasons, { required })
}

export async function makeTask1001EvidenceRecord({ candidate, checkResults, outputDir, fixtureId, environmentId, required = true }) {
  const check = checkResults.get(TASK1001_CHECK_ID)
  const recordPath = path.join(outputDir, 'task-1001-evidence-record.json')
  const base = task1001RecordBase({ candidate, check, fixtureId, environmentId, required })

  if (!required && !check) {
    const record = finishTask1001Record(base, [task1001Diagnostic('PROFILE_NOT_REQUIRED', 'Task-1001 dedicated evidence is not required outside the release profile')], { required })
    await writeJson(recordPath, record)
    return { ...record, record_path: path.relative(outputDir, recordPath) }
  }

  const artifactFilename = check?.artifact_files?.find((filename) => path.basename(filename) === 'task-1001-evidence.json')
  if (!artifactFilename) {
    const record = finishTask1001Record(base, [...task1001CheckFailures(candidate, check), task1001Diagnostic('ARTIFACT_MISSING', 'Producer did not provide task-1001-evidence.json')], { required })
    await writeJson(recordPath, record)
    return { ...record, record_path: path.relative(outputDir, recordPath) }
  }

  const relativePath = safeArtifactRelativePath(outputDir, artifactFilename)
  if (!relativePath) {
    const record = finishTask1001Record(base, [...task1001CheckFailures(candidate, check), task1001Diagnostic('ARTIFACT_PATH_UNSAFE', 'Producer artifact path escapes the gate output root')], { required })
    await writeJson(recordPath, record)
    return { ...record, record_path: path.relative(outputDir, recordPath) }
  }

  let artifactStat
  let bytes
  try {
    artifactStat = await stat(path.resolve(outputDir, artifactFilename))
    if (!artifactStat.isFile()) throw new Error('artifact is not a regular file')
    const rootRealPath = await realpath(outputDir)
    const artifactRealPath = await realpath(path.resolve(outputDir, artifactFilename))
    if (artifactRealPath !== rootRealPath && !artifactRealPath.startsWith(`${rootRealPath}${path.sep}`)) throw new Error('artifact realpath escapes output root')
    bytes = await readFile(path.resolve(outputDir, artifactFilename))
  } catch (error) {
    const code = error?.code === 'ENOENT' ? 'ARTIFACT_UNREADABLE' : 'ARTIFACT_PATH_UNSAFE'
    const record = finishTask1001Record(base, [...task1001CheckFailures(candidate, check), task1001Diagnostic(code, `Producer artifact could not be safely read: ${error.message}`)], { required })
    await writeJson(recordPath, record)
    return { ...record, record_path: path.relative(outputDir, recordPath) }
  }

  let source
  try {
    source = JSON.parse(bytes.toString('utf8'))
  } catch (error) {
    const artifact = { path: relativePath, sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.byteLength }
    const record = finishTask1001Record({ ...base, artifact }, [...task1001CheckFailures(candidate, check), task1001Diagnostic('ARTIFACT_JSON_INVALID', `Producer artifact is malformed JSON: ${error.message}`)], { required })
    await writeJson(recordPath, record)
    return { ...record, record_path: path.relative(outputDir, recordPath) }
  }

  const artifact = { path: relativePath, sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.byteLength }
  const artifactBinding = check?.artifact_bindings?.find((binding) => binding.path === relativePath)
  const record = normalizeTask1001Evidence({
    candidate,
    check,
    source,
    artifact,
    artifactBinding,
    outputDir,
    fixtureId,
    environmentId,
    required,
  })
  await writeJson(recordPath, record)
  return { ...record, record_path: path.relative(outputDir, recordPath) }
}

function makeProofLayers(checkResults) {
  return PROOF_LAYER_IDS.map((layerId) => {
    if (HUMAN_LAYERS.has(layerId)) return { layer_id: layerId, status: 'NOT_EVALUATED', implementation: 'INDEPENDENT_HUMAN_EVIDENCE_REQUIRED' }
    const checks = [...checkResults.values()].filter((check) => check.layer_id === layerId)
    if (!checks.length) return { layer_id: layerId, status: 'NOT_EVALUATED', implementation: 'NO_PRODUCER_REGISTERED' }
    const statuses = checks.map(statusOf)
    const status = statuses.includes('FAIL') ? 'FAIL' : statuses.includes('BLOCKED') ? 'BLOCKED' : statuses.includes('NOT_EVALUATED') ? 'NOT_EVALUATED' : 'PASS'
    return { layer_id: layerId, status, check_ids: checks.map((check) => check.check_id) }
  })
}

export function machineGate({ matrix, proofLayers, retainedChecks, deferredRequirementIds = new Set(), dedicatedEvidence = [] }) {
  const machineEntries = matrix.entries.filter((entry) => !entry.required_evidence_types.includes('human') && !deferredRequirementIds.has(entry.requirement_id))
  const counts = { VERIFIED: 0, FAIL: 0, BLOCKED: 0, NOT_EVALUATED: 0 }
  for (const entry of machineEntries) counts[entry.status] += 1
  const machineLayers = proofLayers.filter((layer) => !HUMAN_LAYERS.has(layer.layer_id))
  const unresolvedLayers = machineLayers.filter((layer) => layer.status !== 'PASS')
  const unresolvedRetained = retainedChecks.filter((check) => check.status !== 'PASS')
  const unresolvedDedicated = dedicatedEvidence.filter((evidence) => evidence?.result !== 'PASS' || evidence?.verdict !== true)
  const dedicatedFailures = unresolvedDedicated.filter((evidence) => evidence?.result !== 'BLOCKED')
  const verdict = counts.FAIL || dedicatedFailures.length ? 'FAIL' : counts.BLOCKED || unresolvedLayers.some((layer) => layer.status === 'BLOCKED') || unresolvedRetained.some((check) => check.status === 'BLOCKED') || unresolvedDedicated.some((evidence) => evidence?.result === 'BLOCKED') ? 'BLOCKED' : counts.NOT_EVALUATED || unresolvedLayers.length || unresolvedRetained.length || unresolvedDedicated.length ? 'NOT_EVALUATED' : 'PASS'
  return {
    verdict,
    deferred_requirement_ids: [...deferredRequirementIds].sort(),
    arithmetic: {
      total_machine_required: machineEntries.length,
      verified: counts.VERIFIED,
      failed: counts.FAIL,
      blocked: counts.BLOCKED,
      not_evaluated: counts.NOT_EVALUATED,
      progress: machineEntries.length ? counts.VERIFIED / machineEntries.length : 0,
    },
    unresolved_layers: unresolvedLayers.map((layer) => layer.layer_id),
    unresolved_retained_checks: unresolvedRetained.map((check) => check.check_id),
    unresolved_dedicated_evidence: unresolvedDedicated.map((evidence) => evidence.check_id || 'unknown'),
  }
}

export function phaseDecision(machine) {
  const phaseVerdict = machine.verdict === 'PASS' ? 'PASS' : machine.verdict
  return { phase_verdict: phaseVerdict, exit_code: phaseVerdict === 'PASS' ? 0 : 2 }
}

function databaseUnchanged(before, after) {
  return JSON.stringify(before?.databases || {}) === JSON.stringify(after?.databases || {})
}

export async function runProductionGate({ repoRoot = REPOSITORY_ROOT, profile = 'release', outputDir } = {}) {
  const design = await loadDesignPackage()
  const candidate = await collectCandidateIdentity({ repoRoot })
  const destination = outputDir || path.join(repoRoot, 'artifacts', 'pv1-gate', profile, timestampId())
  await mkdir(destination, { recursive: true })
  const coverage = buildCoverageMap(design.requirements.requirements)
  await writeJson(path.join(destination, 'coverage-map.json'), { schema: 'sysgrid.pv1.coverage-map.v1', design_sha256: design.specificationSha256, requirement_count: design.requirementIds.length, entries: coverage.map, missing_declared_types: coverage.missing })

  const sourceState = {
    schema: 'sysgrid.pv1.source-state.v1',
    captured_at: new Date().toISOString(),
    branch: git(repoRoot, ['branch', '--show-current']),
    source_commit: candidate.source_commit,
    source_tree: candidate.source_tree,
    candidate_git_sha: candidate.source_commit,
    candidate_tree_sha: candidate.source_tree,
    tracked_worktree_dirty: candidate.tracked_worktree_dirty,
    tracked_dirty_paths: candidate.tracked_dirty_paths,
    identity_scope: candidate.identity_scope,
    status_porcelain: git(repoRoot, ['status', '--porcelain=v1', '-uall']).split('\n').filter(Boolean),
    dirty_patch_sha256: candidate.dirty_patch_sha256,
    phase_inventory: await collectPhaseInventory(),
  }
  await writeJson(path.join(destination, 'SOURCE_STATE.json'), sourceState)
  await writeJson(path.join(destination, 'REQUIREMENT_SCOPE.json'), {
    phase: 'P12_AUTOMATED_PRODUCTION_GATE',
    design_sha256: design.specificationSha256,
    requirement_ids: design.requirementIds,
    machine_requirement_ids: design.requirements.requirements.filter((item) => !(item.required_evidence_types || []).includes('human') && coverage.map[item.id]?.phase_ownership?.owner_phase === 'P12_AUTOMATED_PRODUCTION_GATE').map((item) => item.id),
    human_pending_requirement_ids: design.requirements.requirements.filter((item) => (item.required_evidence_types || []).includes('human')).map((item) => item.id),
    deferred_requirement_ownership: Object.fromEntries(Object.entries(coverage.map).filter(([, item]) => item.phase_ownership?.owner_phase !== 'P12_AUTOMATED_PRODUCTION_GATE').map(([id, item]) => [id, item.phase_ownership])),
  })

  const rejection = profile === 'release' ? releaseCandidateRejection(candidate) : null
  if (rejection) {
    const result = {
      schema: 'sysgrid.pv1.production-gate-result.v1',
      phase: 'P12_AUTOMATED_PRODUCTION_GATE', profile, generated_at: new Date().toISOString(),
      verdict: 'FAIL', machine_verdict: 'FAIL', phase_verdict: 'FAIL', exit_code: 1,
      candidate, rejection,
      design: { specification_sha256: design.specificationSha256, requirement_count: design.requirementIds.length, requirement_ids_loaded_once: new Set(design.requirementIds).size === design.requirementIds.length },
      arithmetic: { total_required: design.requirementIds.length, verified: 0, failed: design.requirementIds.length, blocked: 0, not_evaluated: 0, progress: 0 },
      requirements: [], proof_layers: [], retained_checks: [], evidence: [], checks: [],
      honest_incomplete_reasons: [rejection.message],
    }
    await writeJson(path.join(destination, 'production-gate-result.json'), result)
    await writeJson(path.join(destination, 'gap-matrix.json'), { schema: 'sysgrid.pv1.gap-matrix.v1', candidate, rejection, statuses: [], total: 0, entries: [], arithmetic: result.arithmetic })
    await writeJson(path.join(destination, 'source-manifest.json'), { candidate, design: result.design, profile, source_state: sourceState, rejection })
    await writeFile(path.join(destination, 'CHANGED_FILES.txt'), `${sourceState.status_porcelain.join('\n')}${sourceState.status_porcelain.length ? '\n' : ''}`)
    await writeJson(path.join(destination, 'PHASE_RESULT.json'), { phase: result.phase, result: result.phase_verdict, overall_verdict: result.verdict, machine_verdict: result.machine_verdict, remote_mutation: 'NONE', output_dir: destination, rejection })
    await writeFile(path.join(destination, 'PHASE_RESULT.md'), `# P12_AUTOMATED_PRODUCTION_GATE\n\nPhase result: **FAIL**\n\nRelease certification refused: tracked worktree is dirty.\n\nRemote mutation: **NONE**\n\nRun directory: ${destination}\n`)
    return { ...result, output_dir: destination }
  }

  const checkResults = new Map()
  const internalDesign = await runInternalCheck({ id: 'internal:design-integrity', layer: 'schema_type_lint_build', outputDir: destination, payload: { requirement_count: design.requirementIds.length, design_sha256: design.specificationSha256 } })
  const internalInventory = await runInternalCheck({ id: 'internal:source-inventory', layer: 'schema_type_lint_build', outputDir: destination, payload: { phase_count: sourceState.phase_inventory.length, source_commit: candidate.source_commit } })
  const internalCoverage = await runInternalCheck({ id: 'internal:coverage-map', layer: 'schema_type_lint_build', outputDir: destination, payload: { mapped_requirement_count: Object.keys(coverage.map).length, missing_declared_types: coverage.missing.length } })
  for (const result of [internalDesign, internalInventory, internalCoverage]) checkResults.set(result.check_id, result)

  const checks = await buildChecks({ repoRoot, outputDir: destination })
  const checkAccounting = checks.registration_accounting || { unique_registered_checks: checks.length, execution_instances: checks.length, variant_instances: checks.length, duplicates_detected: [] }
  let retainedResults = []
  if (profile === 'release') {
    const executionContext = {
      run_id: `${path.resolve(destination)}:${Date.now()}`,
      candidate_git_sha: candidate.source_commit,
      candidate_tree_sha: candidate.source_tree,
    }
    const python = path.join(repoRoot, 'backend', 'venv', 'bin', 'python')
    const beforeSpec = { id: 'database:before', layer: 'concurrency_security', cwd: repoRoot, file: python, args: [path.join(repoRoot, 'scripts/pv1/database-safety.py'), '--label', 'before', '--output', path.join(destination, 'database-before.json')] }
    const beforeResult = await runCheck(beforeSpec, destination, executionContext)
    checkResults.set(beforeResult.check_id, beforeResult)
    const scheduledChecks = checks.filter((spec) => !(spec.id.startsWith('retained:') && spec.id !== 'retained:task-1001-virtualization'))
    const scheduled = await runChecksWithDependencies(scheduledChecks, destination, executionContext)
    for (const result of scheduled.results) checkResults.set(result.check_id, result)
    await writeJson(path.join(destination, 'dependency-graph.json'), {
      schema: 'sysgrid.pv1.dependency-graph.v1',
      run_id: executionContext.run_id,
      candidate_git_sha: executionContext.candidate_git_sha,
      candidate_tree_sha: executionContext.candidate_tree_sha,
      dependency_graph: scheduled.dependency_graph,
      scheduler: scheduled.scheduler,
    })
    retainedResults = await executeRetainedChecks(design.gateContract, async (check) => {
      const id = check.command === 'git diff --check' ? 'retained:root-diff' : check.command.includes('visual-repair') ? 'retained:visual' : 'retained:out40'
      const spec = checks.find((item) => item.id === id)
      const result = await runCheck(spec, destination, executionContext)
      checkResults.set(result.check_id, result)
      return { status: result.status, execution: result, artifact_files: result.artifact_files }
    })
    const afterSpec = { id: 'database:after', layer: 'concurrency_security', cwd: repoRoot, file: python, args: [path.join(repoRoot, 'scripts/pv1/database-safety.py'), '--label', 'after', '--output', path.join(destination, 'database-after.json')] }
    const afterResult = await runCheck(afterSpec, destination, executionContext)
    checkResults.set(afterResult.check_id, afterResult)
    let before = null
    let after = null
    try {
      before = JSON.parse(await readFile(path.join(destination, 'database-before.json'), 'utf8'))
      after = JSON.parse(await readFile(path.join(destination, 'database-after.json'), 'utf8'))
    } catch {
      // The safety proof remains failed below if either snapshot is unavailable.
    }
    const unchanged = Boolean(before && after && databaseUnchanged(before, after))
    await writeJson(path.join(destination, 'DATABASE_IMMUTABILITY.json'), { schema: 'sysgrid.pv1.database-immutability.v1', verdict: unchanged ? 'PASS' : 'FAIL', before, after })
    const safetyResult = await runInternalCheck({ id: 'database:immutability', layer: 'concurrency_security', outputDir: destination, result: unchanged ? 'PASS' : 'FAIL', payload: { verdict: unchanged ? 'PASS' : 'FAIL' } })
    safetyResult.artifact_files = [path.join(destination, 'DATABASE_IMMUTABILITY.json'), ...safetyResult.artifact_files]
    checkResults.set(safetyResult.check_id, safetyResult)
    for (const result of retainedResults) {
      const normalized = { ...result, layer_id: 'retained_regression', status: result.status || statusOf(result) }
      checkResults.set(result.check_id, normalized)
    }
  } else {
    for (const spec of checks) checkResults.set(spec.id, { check_id: spec.id, layer_id: spec.layer, status: 'NOT_EVALUATED', artifact_files: [] })
    retainedResults = discoverRetainedChecks(design.gateContract)
  }

  const fixtureId = `pv1-release-${profile}`
  const environmentId = `${process.platform}-${process.arch}-node${process.versions.node}`
  const rawEvidence = await makeEvidenceRecords({ design, candidate, coverageMap: coverage.map, checkResults, outputDir: destination, fixtureId, environmentId })
  const evidenceResults = validateEvidenceRecords(rawEvidence, { schema: design.evidenceSchema, candidate, designSha256: design.specificationSha256, artifactRoot: destination })
  await writeJson(path.join(destination, 'evidence-records.json'), rawEvidence)
  const proofLayers = makeProofLayers(checkResults)
  const retainedChecks = profile === 'release'
    ? discoverRetainedChecks(design.gateContract).map((check) => {
      const id = check.command === 'git diff --check' ? 'retained:root-diff' : check.command.includes('visual-repair') ? 'retained:visual' : 'retained:out40'
      const result = checkResults.get(id)
      return { ...check, status: statusOf(result), execution: result }
    })
    : retainedResults
  const matrix = createGapMatrix({ requirements: design.requirements.requirements, expectedIds: design.requirementIds, evidenceResults, coverageMap: coverage.map })
  const arithmeticResult = await runInternalCheck({ id: 'internal:gate-arithmetic', layer: 'schema_type_lint_build', outputDir: destination, result: matrix.total === design.requirementIds.length && new Set(matrix.entries.map((entry) => entry.requirement_id)).size === design.requirementIds.length ? 'PASS' : 'FAIL', payload: { total: matrix.total, unique_ids: new Set(matrix.entries.map((entry) => entry.requirement_id)).size } })
  checkResults.set(arithmeticResult.check_id, arithmeticResult)
  const finalEvidence = await makeEvidenceRecords({ design, candidate, coverageMap: coverage.map, checkResults, outputDir: destination, fixtureId, environmentId })
  const finalEvidenceResults = validateEvidenceRecords(finalEvidence, { schema: design.evidenceSchema, candidate, designSha256: design.specificationSha256, artifactRoot: destination })
  const finalMatrix = createGapMatrix({ requirements: design.requirements.requirements, expectedIds: design.requirementIds, evidenceResults: finalEvidenceResults, coverageMap: coverage.map })
  const finalProofLayers = makeProofLayers(checkResults)
  const deferredRequirementIds = new Set(Object.entries(coverage.map).filter(([, item]) => item.phase_ownership?.owner_phase !== 'P12_AUTOMATED_PRODUCTION_GATE').map(([id]) => id))
  const task1001Evidence = await makeTask1001EvidenceRecord({ candidate, checkResults, outputDir: destination, fixtureId, environmentId, required: profile === 'release' })
  const dedicatedEvidence = profile === 'release' ? [task1001Evidence] : []
  const gate = evaluateGate({ matrix: finalMatrix, proofLayers: finalProofLayers, retainedChecks, dedicatedEvidence })
  const machine = machineGate({ matrix: finalMatrix, proofLayers: finalProofLayers, retainedChecks, deferredRequirementIds, dedicatedEvidence })
  const { phase_verdict: phaseVerdict, exit_code: exitCode } = phaseDecision(machine)
  const result = {
    schema: 'sysgrid.pv1.production-gate-result.v1',
    phase: 'P12_AUTOMATED_PRODUCTION_GATE', profile, generated_at: new Date().toISOString(), verdict: gate.verdict, machine_verdict: machine.verdict, phase_verdict: phaseVerdict,
    exit_code: exitCode, candidate,
    design: { specification_sha256: design.specificationSha256, requirement_count: design.requirementIds.length, requirement_ids_loaded_once: new Set(design.requirementIds).size === design.requirementIds.length },
    arithmetic: { ...gate.arithmetic, machine: machine.arithmetic }, requirements: finalMatrix.entries, proof_layers: finalProofLayers, retained_checks: retainedChecks,
    evidence: finalEvidenceResults.map(({ record, validation }) => ({ source: 'generated', requirement_id: record.requirement_id, evidence_type: record.evidence_type, check_id: record.check_id, result: record.result, validation })),
    dedicated_evidence: [task1001Evidence],
    checks: [...checkResults.values()],
    check_accounting: checkAccounting,
    honest_incomplete_reasons: [
      'Independent visual review, measured usability and controlled pilot require evidence from independent people and are not self-certified by this runner.',
      'A requirement is VERIFIED only when every declared evidence type has a current candidate-bound PASS record.',
      'Skipped, stale, malformed, failed, blocked or missing checks are non-counting.',
      ...(task1001Evidence.result === 'PASS' ? [] : [`${TASK1001_CHECK_ID} dedicated evidence is ${task1001Evidence.result}: ${(task1001Evidence.failure_reasons || []).map((item) => item.message).join('; ') || 'no diagnostic reason recorded.'}`]),
      ...(machine.verdict === 'PASS' ? [] : [`P12-owned machine proof remains ${machine.verdict}; no phase PASS is claimed.`]),
    ],
  }
  await writeJson(path.join(destination, 'production-gate-result.json'), result)
  await writeJson(path.join(destination, 'gap-matrix.json'), { schema: 'sysgrid.pv1.gap-matrix.v1', candidate, ...finalMatrix, arithmetic: result.arithmetic })
  await writeJson(path.join(destination, 'source-manifest.json'), { candidate, design: result.design, profile, fixture_id: fixtureId, environment_id: environmentId, retained_checks: retainedChecks, check_accounting: checkAccounting, source_state: sourceState })
  await writeFile(path.join(destination, 'CHANGED_FILES.txt'), `${sourceState.status_porcelain.join('\n')}${sourceState.status_porcelain.length ? '\n' : ''}`)
  await writeJson(path.join(destination, 'PHASE_RESULT.json'), { phase: result.phase, result: result.phase_verdict, overall_verdict: result.verdict, machine_verdict: result.machine_verdict, remote_mutation: 'NONE', output_dir: destination, arithmetic: result.arithmetic })
  await writeFile(path.join(destination, 'PHASE_RESULT.md'), `# P12_AUTOMATED_PRODUCTION_GATE\n\nPhase result: **${result.phase_verdict}**\n\nOverall production graduation status: **${result.verdict}**\n\nMachine-verifiable P12-owned result: **${result.machine_verdict}**\n\nPV-PERF-003 remains mandatory and NOT_EVALUATED because real initial-release pilot field samples are owned by P14. Candidate-bound checks ran with non-counting status for missing, failed, blocked, or skipped evidence. Independent visual review, measured usability, and controlled pilot evidence are not self-certified.\n\nRemote mutation: **NONE**\n\nRun directory: ${destination}\n`)
  return { ...result, output_dir: destination }
}
