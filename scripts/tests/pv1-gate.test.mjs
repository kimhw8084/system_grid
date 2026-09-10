import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { collectCandidateIdentity } from '../pv1/candidate-identity.mjs'
import { coverageFor, HUMAN_PILOT_OWNERSHIP, REVIEW_CELL_PROVENANCE } from '../pv1/coverage.mjs'
import { loadDesignPackage } from '../pv1/design-package.mjs'
import { createGapMatrix, evaluateGate } from '../pv1/gap-matrix.mjs'
import { discoverRetainedChecks } from '../pv1/retained-checks.mjs'
import { validateEvidenceRecord } from '../pv1/evidence-validator.mjs'
import { machineGate, makeTask1001EvidenceRecord, normalizeTask1001Evidence, phaseDecision, releaseCandidateRejection, runProductionGate } from '../pv1/gate.mjs'
import { checkAccounting, deduplicateCheckDefinitions } from '../pv1/runner.mjs'
import { semanticProofRegistry } from '../pv1/semantic-review.mjs'
import { validateVariantEvidence } from '../pv1/performance-variants.mjs'
import { percentile, validateMeasurement, validateProfileMeasurements } from '../pv1/performance-evidence.mjs'
import { REQUIRED_VARIANTS, runPerformanceProfiles } from '../pv1/performance-profiles.mjs'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')

function candidateFixture() {
  return {
    source_commit: 'a'.repeat(40),
    source_tree: 'b'.repeat(40),
    dirty_patch_sha256: 'c'.repeat(64),
    frontend_digest: 'd'.repeat(64),
    backend_digest: 'e'.repeat(64),
    database_migration_revision: 'test-head',
  }
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex')
}

function task1001Source(overrides = {}) {
  return {
    schema: 'sysgrid.pv1.task-1001-regression.v1',
    check_id: 'retained:task-1001-virtualization',
    candidate_git_sha: 'a'.repeat(40),
    candidate_tree_sha: 'b'.repeat(40),
    requirement_ids: ['PV-PERF-002', 'PV-GATE-006'],
    fixture_profile: 'OUT-40 120-task WBS fixture',
    logical_task_count: 120,
    target_task_id: '1001',
    target_addressable: true,
    target_visible: true,
    target_selectable: true,
    realized_row_count: 18,
    scrollport_height: 638,
    dom_bound: 30,
    verdict: true,
    ...overrides,
  }
}

async function task1001Fixture({ sourceOverrides = {}, checkOverrides = {} } = {}) {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'sysgrid-task-1001-'))
  const candidate = candidateFixture()
  const source = task1001Source({ candidate_git_sha: candidate.source_commit, candidate_tree_sha: candidate.source_tree, ...sourceOverrides })
  const artifactPath = path.join(outputDir, 'task-1001-evidence.json')
  const bytes = `${JSON.stringify(source)}\n`
  await writeFile(artifactPath, bytes)
  const relativePath = 'task-1001-evidence.json'
  const check = {
    check_id: 'retained:task-1001-virtualization',
    status: 'PASS',
    command: { cwd: repoRoot, file: process.execPath, args: ['scripts/run-pv1-task-1001-evidence.mjs'] },
    candidate_git_sha: candidate.source_commit,
    candidate_tree_sha: candidate.source_tree,
    declared_artifact_files: [relativePath],
    artifact_bindings: [{ path: relativePath, sha256: digest(bytes), run_id: 'task-1001-test-run', candidate_git_sha: candidate.source_commit, candidate_tree_sha: candidate.source_tree }],
    artifact_files: [artifactPath],
    ...checkOverrides,
  }
  return { outputDir, candidate, source, check, artifactPath, relativePath }
}

function evidenceFixture(design, candidate, overrides = {}) {
  return {
    requirement_id: 'PV-GATE-001',
    evidence_type: 'unit',
    check_id: 'test:pv1-evidence',
    result: 'PASS',
    procedure: 'Deterministic unit proof',
    timestamp: '2026-09-06T23:00:00.000Z',
    candidate: { ...candidate, design_sha256: design.specificationSha256 },
    fixture_id: 'fixture:test',
    environment_id: 'environment:test',
    artifact_hashes: [{ path: 'test-output.txt', sha256: digest('valid evidence') }],
    ...overrides,
  }
}

async function evidenceContext(design, candidate, overrides = {}) {
  const artifactRoot = await mkdtemp(path.join(os.tmpdir(), 'sysgrid-evidence-artifact-'))
  await writeFile(path.join(artifactRoot, 'test-output.txt'), 'valid evidence')
  return {
    artifactRoot,
    record: evidenceFixture(design, candidate, overrides),
    options: { schema: design.evidenceSchema, candidate, designSha256: design.specificationSha256, artifactRoot },
  }
}

test('requirements loader loads exactly 136 unique IDs and verifies the design hash', async () => {
  const design = await loadDesignPackage()
  assert.equal(design.requirementIds.length, 136)
  assert.equal(new Set(design.requirementIds).size, 136)
  assert.equal(design.specificationSha256, 'c58a764e3ffbadd21640a205697f446683245b0b8a4ee244fc74ad5d9a68915c')
})

test('deleting a requirement cannot produce a green matrix', async () => {
  const design = await loadDesignPackage()
  assert.throws(() => createGapMatrix({
    requirements: design.requirements.requirements.slice(0, -1),
    expectedIds: design.requirementIds,
  }), /incomplete|unknown ID/)
})

test('stale candidate evidence is invalid and cannot verify a requirement', async () => {
  const design = await loadDesignPackage()
  const current = candidateFixture()
  const stale = { ...current, source_commit: '9'.repeat(40) }
  const context = await evidenceContext(design, stale)
  const validation = validateEvidenceRecord(context.record, { ...context.options, candidate: current })
  assert.equal(validation.valid, false)
  assert.equal(validation.countable, false)
  const matrix = createGapMatrix({ requirements: [design.requirementsById.get('PV-GATE-001')], expectedIds: ['PV-GATE-001'], evidenceResults: [{ record: evidenceFixture(design, stale), validation }] })
  assert.equal(matrix.entries[0].status, 'NOT_EVALUATED')
  assert.equal(evaluateGate({ matrix }).green, false)
  await rm(context.artifactRoot, { recursive: true, force: true })
})

test('skipped evidence never counts as verified', async () => {
  const design = await loadDesignPackage()
  const candidate = candidateFixture()
  const context = await evidenceContext(design, candidate, { result: 'SKIPPED' })
  const record = context.record
  const validation = validateEvidenceRecord(record, context.options)
  assert.equal(validation.valid, true)
  assert.equal(validation.countable, false)
  const matrix = createGapMatrix({ requirements: [design.requirementsById.get('PV-GATE-001')], expectedIds: ['PV-GATE-001'], evidenceResults: [{ record, validation }] })
  assert.equal(matrix.entries[0].status, 'NOT_EVALUATED')
  assert.equal(evaluateGate({ matrix }).green, false)
  await rm(context.artifactRoot, { recursive: true, force: true })
})

test('evidence validation reads artifact bytes and rejects tampering, deletion, fake hashes, swaps, and traversal', async () => {
  const design = await loadDesignPackage()
  const candidate = candidateFixture()
  const context = await evidenceContext(design, candidate)
  try {
    assert.equal(validateEvidenceRecord(context.record, context.options).countable, true)
    await writeFile(path.join(context.artifactRoot, 'test-output.txt'), 'changed evidence')
    assert.equal(validateEvidenceRecord(context.record, context.options).countable, false)
    await writeFile(path.join(context.artifactRoot, 'test-output.txt'), 'valid evidence')
    await rm(path.join(context.artifactRoot, 'test-output.txt'))
    assert.equal(validateEvidenceRecord(context.record, context.options).countable, false)
    await writeFile(path.join(context.artifactRoot, 'test-output.txt'), 'valid evidence')
    const fakeHash = validateEvidenceRecord({ ...context.record, artifact_hashes: [{ path: 'test-output.txt', sha256: 'f'.repeat(64) }] }, context.options)
    assert.equal(fakeHash.countable, false)
    await writeFile(path.join(context.artifactRoot, 'other.txt'), 'other bytes')
    const swapped = validateEvidenceRecord({ ...context.record, artifact_hashes: [{ path: 'other.txt', sha256: digest('valid evidence') }] }, context.options)
    assert.equal(swapped.countable, false)
    const traversal = validateEvidenceRecord({ ...context.record, artifact_hashes: [{ path: '../outside.txt', sha256: digest('valid evidence') }] }, context.options)
    assert.equal(traversal.countable, false)
  } finally {
    await rm(context.artifactRoot, { recursive: true, force: true })
  }
})

test('candidate identity ignores runtime and user-like files but invalidates tracked edits', async () => {
  const tempRepo = await mkdtemp(path.join(os.tmpdir(), 'sysgrid-candidate-'))
  try {
    await mkdir(path.join(tempRepo, 'frontend'), { recursive: true })
    await mkdir(path.join(tempRepo, 'backend', 'alembic', 'versions'), { recursive: true })
    await writeFile(path.join(tempRepo, '.gitignore'), 'backend/runtime.db\nfrontend/coverage/\n')
    await writeFile(path.join(tempRepo, 'frontend', 'candidate.ts'), 'export const candidate = 1\n')
    await writeFile(path.join(tempRepo, 'backend', 'candidate.py'), 'candidate = 1\n')
    await writeFile(path.join(tempRepo, 'backend', 'alembic', 'versions', '001.py'), "revision = 'head001'\ndown_revision = None\n")
    const git = (args) => execFileSync('git', ['-C', tempRepo, ...args], { encoding: 'utf8' }).trim()
    git(['init', '-q']); git(['config', 'user.email', 'test@example.invalid']); git(['config', 'user.name', 'test']); git(['add', '.']); git(['commit', '-qm', 'candidate'])
    const clean = await collectCandidateIdentity({ repoRoot: tempRepo })
    assert.equal(clean.tracked_worktree_dirty, false)
    assert.equal(clean.dirty_patch_sha256, null)
    await mkdir(path.join(tempRepo, 'frontend', 'coverage'), { recursive: true })
    await writeFile(path.join(tempRepo, 'backend', 'runtime.db'), 'user database bytes')
    await writeFile(path.join(tempRepo, 'frontend', 'coverage', 'runtime.json'), 'ignored runtime')
    const runtimeOnly = await collectCandidateIdentity({ repoRoot: tempRepo })
    assert.deepEqual(runtimeOnly, clean)
    await writeFile(path.join(tempRepo, 'frontend', 'candidate.ts'), 'export const candidate = 2\n')
    const dirty = await collectCandidateIdentity({ repoRoot: tempRepo })
    assert.equal(dirty.tracked_worktree_dirty, true)
    assert.deepEqual(dirty.tracked_dirty_paths, ['frontend/candidate.ts'])
    assert.notEqual(dirty.dirty_patch_sha256, clean.dirty_patch_sha256)
    assert.deepEqual(dirty.identity_scope.database_hashes_are, 'evidence_subjects_not_candidate_identity')
  } finally {
    await rm(tempRepo, { recursive: true, force: true })
  }
})

test('release gate refuses a tracked dirty candidate', async () => {
  const cleanCandidate = await collectCandidateIdentity({ repoRoot })
  const rejection = releaseCandidateRejection({ ...cleanCandidate, tracked_worktree_dirty: true, dirty_patch_sha256: 'c'.repeat(64), tracked_dirty_paths: ['fixture/tracked-change.ts'] })
  assert.equal(rejection.code, 'DIRTY_TRACKED_WORKTREE')
  assert.equal(rejection.tracked_worktree_dirty, true)
})

test('task-1001 dedicated evidence validates the actual producer schema and artifact bytes', async () => {
  const fixture = await task1001Fixture()
  try {
    const record = await makeTask1001EvidenceRecord({
      candidate: fixture.candidate,
      checkResults: new Map([[fixture.check.check_id, fixture.check]]),
      outputDir: fixture.outputDir,
      fixtureId: 'fixture:test',
      environmentId: 'environment:test',
    })
    assert.equal(record.result, 'PASS')
    assert.equal(record.verdict, true)
    assert.deepEqual(record.artifact, { path: fixture.relativePath, sha256: digest(`${JSON.stringify(fixture.source)}\n`), size: Buffer.byteLength(`${JSON.stringify(fixture.source)}\n`) })
    assert.equal(record.logical_task_count, 120)
    assert.equal(record.realized_row_count, 18)
    assert.equal(record.dom_bound, 30)
    assert.equal(record.target_addressable, true)
    assert.equal(record.target_visible, true)
    assert.equal(record.target_selectable, true)
    assert.deepEqual(record.failure_reasons, [])
  } finally {
    await rm(fixture.outputDir, { recursive: true, force: true })
  }
})

test('task-1001 dedicated evidence fails closed for missing, malformed, stale, and unbound artifacts', async () => {
  const missing = await task1001Fixture()
  try {
    await rm(missing.artifactPath)
    const record = await makeTask1001EvidenceRecord({ candidate: missing.candidate, checkResults: new Map([[missing.check.check_id, { ...missing.check, artifact_files: [] }]]), outputDir: missing.outputDir, fixtureId: 'fixture:test', environmentId: 'environment:test' })
    assert.equal(record.result, 'FAIL')
    assert.ok(record.failure_reasons.some((item) => item.code === 'ARTIFACT_MISSING'))
  } finally {
    await rm(missing.outputDir, { recursive: true, force: true })
  }

  const malformed = await task1001Fixture()
  try {
    await writeFile(malformed.artifactPath, '{not-json}\n')
    const bytes = await readFile(malformed.artifactPath)
    const check = { ...malformed.check, artifact_bindings: [{ ...malformed.check.artifact_bindings[0], sha256: digest(bytes) }] }
    const record = await makeTask1001EvidenceRecord({ candidate: malformed.candidate, checkResults: new Map([[check.check_id, check]]), outputDir: malformed.outputDir, fixtureId: 'fixture:test', environmentId: 'environment:test' })
    assert.equal(record.result, 'FAIL')
    assert.ok(record.failure_reasons.some((item) => item.code === 'ARTIFACT_JSON_INVALID'))
  } finally {
    await rm(malformed.outputDir, { recursive: true, force: true })
  }

  for (const mismatch of ['candidate_git_sha', 'candidate_tree_sha']) {
    const stale = await task1001Fixture({ sourceOverrides: { [mismatch]: 'c'.repeat(40) } })
    try {
      const record = await makeTask1001EvidenceRecord({ candidate: stale.candidate, checkResults: new Map([[stale.check.check_id, stale.check]]), outputDir: stale.outputDir, fixtureId: 'fixture:test', environmentId: 'environment:test' })
      assert.equal(record.result, 'FAIL')
      assert.ok(record.failure_reasons.some((item) => item.code === 'ARTIFACT_CANDIDATE_MISMATCH'))
    } finally {
      await rm(stale.outputDir, { recursive: true, force: true })
    }
  }

  const unbound = await task1001Fixture({ checkOverrides: { artifact_bindings: [] } })
  try {
    const record = await makeTask1001EvidenceRecord({ candidate: unbound.candidate, checkResults: new Map([[unbound.check.check_id, unbound.check]]), outputDir: unbound.outputDir, fixtureId: 'fixture:test', environmentId: 'environment:test' })
    assert.equal(record.result, 'FAIL')
    assert.ok(record.failure_reasons.some((item) => item.code === 'ARTIFACT_BINDING_MISSING'))
  } finally {
    await rm(unbound.outputDir, { recursive: true, force: true })
  }

  const tamperedBinding = await task1001Fixture({ checkOverrides: { artifact_bindings: [{ path: 'task-1001-evidence.json', sha256: 'f'.repeat(64), run_id: 'task-1001-test-run', candidate_git_sha: candidateFixture().source_commit, candidate_tree_sha: candidateFixture().source_tree }] } })
  try {
    const record = await makeTask1001EvidenceRecord({ candidate: tamperedBinding.candidate, checkResults: new Map([[tamperedBinding.check.check_id, tamperedBinding.check]]), outputDir: tamperedBinding.outputDir, fixtureId: 'fixture:test', environmentId: 'environment:test' })
    assert.equal(record.result, 'FAIL')
    assert.ok(record.failure_reasons.some((item) => item.code === 'ARTIFACT_BINDING_MISMATCH'))
  } finally {
    await rm(tamperedBinding.outputDir, { recursive: true, force: true })
  }

  const escaped = await task1001Fixture({ checkOverrides: { artifact_files: [path.join('..', 'task-1001-evidence.json')] } })
  try {
    const record = await makeTask1001EvidenceRecord({ candidate: escaped.candidate, checkResults: new Map([[escaped.check.check_id, escaped.check]]), outputDir: escaped.outputDir, fixtureId: 'fixture:test', environmentId: 'environment:test' })
    assert.equal(record.result, 'FAIL')
    assert.ok(record.failure_reasons.some((item) => item.code === 'ARTIFACT_PATH_UNSAFE'))
  } finally {
    await rm(escaped.outputDir, { recursive: true, force: true })
  }
})

test('task-1001 semantic fields are explicit and producer verdict is fail-closed', () => {
  const candidate = candidateFixture()
  const check = { check_id: 'retained:task-1001-virtualization', status: 'PASS', candidate_git_sha: candidate.source_commit, candidate_tree_sha: candidate.source_tree, declared_artifact_files: ['task-1001-evidence.json'] }
  const artifact = { path: 'task-1001-evidence.json', sha256: 'd'.repeat(64), size: 10 }
  for (const field of ['target_addressable', 'target_visible', 'target_selectable', 'verdict']) {
    const source = task1001Source({ candidate_git_sha: candidate.source_commit, candidate_tree_sha: candidate.source_tree, [field]: false })
    const record = normalizeTask1001Evidence({ candidate, check, source, artifact, artifactBinding: { path: artifact.path, sha256: artifact.sha256, candidate_git_sha: candidate.source_commit, candidate_tree_sha: candidate.source_tree }, outputDir: '/tmp/task-1001-test', fixtureId: 'fixture:test', environmentId: 'environment:test' })
    assert.equal(record.result, 'FAIL', field)
    assert.equal(record.verdict, false, field)
  }
  const missing = task1001Source({ candidate_git_sha: candidate.source_commit, candidate_tree_sha: candidate.source_tree })
  delete missing.target_visible
  const missingRecord = normalizeTask1001Evidence({ candidate, check, source: missing, artifact, artifactBinding: { path: artifact.path, sha256: artifact.sha256, candidate_git_sha: candidate.source_commit, candidate_tree_sha: candidate.source_tree }, outputDir: '/tmp/task-1001-test', fixtureId: 'fixture:test', environmentId: 'environment:test' })
  assert.equal(missingRecord.result, 'FAIL')
  assert.ok(missingRecord.failure_reasons.some((item) => item.code === 'TARGET_VISIBLE_NOT_TRUE'))

  for (const status of ['FAIL', 'BLOCKED']) {
    const producerFailure = normalizeTask1001Evidence({ candidate, check: { ...check, status }, source: task1001Source({ candidate_git_sha: candidate.source_commit, candidate_tree_sha: candidate.source_tree }), artifact, artifactBinding: { path: artifact.path, sha256: artifact.sha256, candidate_git_sha: candidate.source_commit, candidate_tree_sha: candidate.source_tree }, outputDir: '/tmp/task-1001-test', fixtureId: 'fixture:test', environmentId: 'environment:test' })
    assert.equal(producerFailure.result, 'FAIL', status)
    assert.ok(producerFailure.failure_reasons.some((item) => item.code === 'PRODUCER_CHECK_NOT_PASS'), status)
  }
  const contradictory = normalizeTask1001Evidence({ candidate, check, source: task1001Source({ candidate_git_sha: candidate.source_commit, candidate_tree_sha: candidate.source_tree, realized_row_count: 31 }), artifact, artifactBinding: { path: artifact.path, sha256: artifact.sha256, candidate_git_sha: candidate.source_commit, candidate_tree_sha: candidate.source_tree }, outputDir: '/tmp/task-1001-test', fixtureId: 'fixture:test', environmentId: 'environment:test' })
  assert.equal(contradictory.result, 'FAIL')
  assert.ok(contradictory.failure_reasons.some((item) => item.code === 'REALIZED_ROWS_EXCEED_BOUND'))
})

test('task-1001 dedicated evidence is verdict-decisive and serialized consistently', () => {
  const inputs = {
    matrix: { total: 1, entries: [{ requirement_id: 'PV-TEST-001', required_evidence_types: [], status: 'VERIFIED' }] },
    proofLayers: [{ layer_id: 'machine', status: 'PASS' }],
    retainedChecks: [{ check_id: 'retained:test', status: 'PASS' }],
    deferredRequirementIds: new Set(),
  }
  const pass = { check_id: 'retained:task-1001-virtualization', result: 'PASS', verdict: true }
  const fail = { check_id: 'retained:task-1001-virtualization', result: 'FAIL', verdict: false, failure_reasons: [{ code: 'ARTIFACT_MISSING', message: 'missing' }] }
  const passingGate = evaluateGate({ ...inputs, dedicatedEvidence: [pass] })
  const passingMachine = machineGate({ ...inputs, dedicatedEvidence: [pass] })
  assert.equal(passingGate.verdict, 'PASS')
  assert.equal(passingMachine.verdict, 'PASS')
  assert.deepEqual(phaseDecision(passingMachine), { phase_verdict: 'PASS', exit_code: 0 })

  const failingGate = evaluateGate({ ...inputs, dedicatedEvidence: [fail] })
  const failingMachine = machineGate({ ...inputs, dedicatedEvidence: [fail] })
  assert.equal(failingGate.verdict, 'FAIL')
  assert.equal(failingMachine.verdict, 'FAIL')
  assert.deepEqual(phaseDecision(failingMachine), { phase_verdict: 'FAIL', exit_code: 2 })
  assert.deepEqual(failingGate.dedicated_evidence_not_passed, ['retained:task-1001-virtualization'])
  assert.deepEqual(failingMachine.unresolved_dedicated_evidence, ['retained:task-1001-virtualization'])
})

test('manual implemented=true is ignored without evidence', async () => {
  const design = await loadDesignPackage()
  const requirement = { ...design.requirementsById.get('PV-GATE-001'), implemented: true }
  const matrix = createGapMatrix({ requirements: [requirement], expectedIds: ['PV-GATE-001'] })
  assert.equal(matrix.entries[0].ignored_manual_implemented, true)
  assert.equal(matrix.entries[0].status, 'NOT_EVALUATED')
  assert.equal(evaluateGate({ matrix }).green, false)
})

test('retained checks are registered exactly as declared by the production contract', async () => {
  const design = await loadDesignPackage()
  const checks = discoverRetainedChecks(design.gateContract)
  assert.deepEqual(checks.map(({ cwd, command }) => ({ cwd, command })), design.gateContract.required_retained_checks)
  assert.ok(checks.every((check) => check.registered && check.status === 'NOT_EVALUATED'))
})

test('PV-PERF-003 remains mandatory but is explicitly P14 pilot-owned', async () => {
  const design = await loadDesignPackage()
  const requirement = design.requirementsById.get('PV-PERF-003')
  const coverage = coverageFor(requirement)
  assert.equal(requirement.required, true)
  assert.deepEqual(requirement.required_evidence_types, ['performance', 'browser', 'operations'])
  assert.deepEqual(coverage.phase_ownership, {
    evidence_type: 'pilot_field',
    owner_phase: 'P14_PILOT_RELEASE_HANDOFF',
    status: 'NOT_EVALUATED',
    reason: 'Real initial-release pilot field samples are required; zero traffic is No data, not PASS.',
    reviewer_population: 'Authorized initial-release pilot population',
    minimum_duration: 'prescribed pilot observation window',
    artifact: 'privacy-safe field metric export with actual sample counts',
    graduation_rule: 'p75 LCP <= 2.5s, p75 INP <= 200ms and p75 CLS <= 0.1 on genuine pilot samples',
  })
})

test('all pending human and pilot requirements have explicit ownership metadata', async () => {
  const design = await loadDesignPackage()
  for (const [id, metadata] of Object.entries(HUMAN_PILOT_OWNERSHIP)) {
    const coverage = coverageFor(design.requirementsById.get(id))
    assert.equal(coverage.phase_ownership.owner_phase, 'P14_PILOT_RELEASE_HANDOFF')
    for (const field of ['evidence_type', 'reviewer_population', 'minimum_duration', 'artifact', 'graduation_rule']) assert.ok(metadata[field])
  }
  assert.equal(Object.keys(HUMAN_PILOT_OWNERSHIP).length, 12)
})

test('all 19 former inventory review cells use explicit requirement-specific proof', async () => {
  const design = await loadDesignPackage()
  const reviewIds = design.requirements.requirements.filter((item) => (item.required_evidence_types || []).includes('review')).map((item) => item.id)
  assert.equal(reviewIds.length, 19)
  assert.deepEqual(reviewIds.sort(), Object.keys(REVIEW_CELL_PROVENANCE).sort())
  for (const id of reviewIds) {
    const check = coverageFor(design.requirementsById.get(id)).evidence_types.review
    assert.equal(check, REVIEW_CELL_PROVENANCE[id])
    assert.notEqual(check, 'internal:source-inventory')
  }
})

test('P12 performance requirements bind to real proof producers', async () => {
  const design = await loadDesignPackage()
  const apiCoverage = coverageFor(design.requirementsById.get('PV-API-006'))
  assert.ok(apiCoverage.implementation_refs.includes('frontend/src/api/apiClient.ts'))
  assert.ok(!apiCoverage.implementation_refs.includes('frontend/src/lib/api.ts'))
  assert.deepEqual(coverageFor(design.requirementsById.get('PV-API-006')).evidence_types, {
    integration: 'performance:api-projection',
    browser: 'browser:performance',
    performance: 'performance:api-projection',
  })
  assert.deepEqual(coverageFor(design.requirementsById.get('PV-PERF-002')).evidence_types, {
    performance: 'browser:performance',
    browser: 'browser:architecture-performance',
  })
  assert.deepEqual(coverageFor(design.requirementsById.get('PV-PERF-004')).evidence_types, {
    performance: 'performance:load',
    security: 'performance:load',
    integration: 'performance:load',
  })
})

test('registered check accounting separates duplicate commands from real variants', () => {
  const duplicate = { id: 'duplicate', cwd: '/repo', file: 'pytest', args: ['-q', 'tests/a.py'], env: {} }
  const variant = { id: 'variant', cwd: '/repo', file: 'pytest', args: ['-q', 'tests/a.py'], env: { PROFILE: 'Large' } }
  const accounting = checkAccounting([duplicate, { ...duplicate, id: 'alias' }, variant])
  assert.equal(accounting.unique_registered_checks, 2)
  assert.equal(accounting.execution_instances, 3)
  assert.equal(accounting.variant_instances, 2)
  assert.equal(accounting.duplicates_detected.length, 1)
  assert.equal(deduplicateCheckDefinitions([duplicate, { ...duplicate, id: 'alias' }]).checks.length, 1)
})

test('semantic review registry contains executable producers rather than source needles', () => {
  assert.equal(Object.keys(semanticProofRegistry).length, 19)
  for (const producer of Object.values(semanticProofRegistry)) {
    const spec = producer(repoRoot)
    assert.ok(spec.file)
    assert.ok(Array.isArray(spec.args))
    assert.equal('needle' in spec, false)
  }
})

test('performance variant validator rejects declared-only and accepts executed artifact-backed variants', () => {
  assert.equal(validateVariantEvidence([{ variant: 'long_names', instantiated: true, executed: true, artifact_produced: true }], ['long_names', 'dense_dependencies']).verdict, false)
  const result = validateVariantEvidence([
    { variant: 'long_names', instantiated: true, executed: true, artifact_produced: true },
    { variant: 'dense_dependencies', instantiated: true, executed: true, artifact_produced: true },
  ], ['long_names', 'dense_dependencies'])
  assert.equal(result.verdict, true)
  assert.deepEqual(result.missing, [])
})

test('performance evidence recomputes p50/p95/max from measured samples and excludes warmup', () => {
  const measured = Array.from({ length: 100 }, (_, index) => index + 1)
  const measurement = {
    warmup_sample_count: 3,
    warmup_samples: [10000, 10001, 10002],
    measured_sample_count: 100,
    measured_samples: measured,
    sample_count: 100,
    p50_ms: percentile(measured, 0.5),
    p95_ms: percentile(measured, 0.95),
    max_ms: 100,
  }
  assert.deepEqual(validateMeasurement(measurement), [])
  assert.equal(validateMeasurement({ ...measurement, p95_ms: 10002 }).length, 1)
  assert.equal(validateMeasurement({ ...measurement, sample_count: 103 }).length, 1)
  assert.deepEqual(validateProfileMeasurements({ profile: 'Typical', variant: 'long_names', measurements: { local_selection: measurement } }), [])
  assert.equal(validateProfileMeasurements({ profile: 'Typical', variant: 'long_names', measurements: { local_selection: { ...measurement, measured_sample_count: 99 } } }).length, 1)
})

test('performance profile contract materializes the complete PV1 fixture matrix', async () => {
  const result = await runPerformanceProfiles({ profile: 'all' })
  const profiles = Object.fromEntries(result.profiles.map((item) => [item.profile, item.fixture]))
  assert.deepEqual(profiles.Small, { projects: 1, selected_tasks: 25, selected_edges: 30, architecture_objects: null, architecture_relations: null, contextual_projection_objects: null, required_variants: REQUIRED_VARIANTS, variant_matrix: REQUIRED_VARIANTS.map((variant) => ({ variant, declared: true, instantiated: false, executed: false, artifact_produced: false })) })
  assert.equal(profiles.Typical.selected_tasks, 500)
  assert.equal(profiles.Typical.selected_edges, 750)
  assert.equal(profiles.Large.selected_tasks, 10000)
  assert.equal(profiles.Large.selected_edges, 20000)
  assert.deepEqual({ objects: profiles.Architecture.architecture_objects, relations: profiles.Architecture.architecture_relations, contextual: profiles.Architecture.contextual_projection_objects }, { objects: 5000, relations: 10000, contextual: 200 })
})

test('production-gate test profile is honest and does not graduate the candidate', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'sysgrid-pv1-gate-'))
  try {
    const result = await runProductionGate({ repoRoot, profile: 'test', outputDir })
    assert.equal(result.verdict, 'NOT_EVALUATED')
    assert.equal(result.exit_code, 2)
    assert.equal(result.arithmetic.total_required, 136)
    assert.ok(result.arithmetic.verified < 136)
    assert.ok(result.arithmetic.not_evaluated > 0)
    assert.equal(result.machine_verdict, 'NOT_EVALUATED')
    assert.equal(result.design.requirement_ids_loaded_once, true)
    assert.equal(result.retained_checks.length, 3)
    assert.equal(result.dedicated_evidence[0].check_id, 'retained:task-1001-virtualization')
    assert.deepEqual(result.dedicated_evidence[0].requirement_ids, ['PV-PERF-002', 'PV-GATE-006'])
    const written = JSON.parse(await readFile(path.join(outputDir, 'production-gate-result.json'), 'utf8'))
    assert.equal(written.verdict, 'NOT_EVALUATED')
    assert.equal(written.green, undefined)
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
})
