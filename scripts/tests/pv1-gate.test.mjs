import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { collectCandidateIdentity } from '../pv1/candidate-identity.mjs'
import { loadDesignPackage } from '../pv1/design-package.mjs'
import { createGapMatrix, evaluateGate } from '../pv1/gap-matrix.mjs'
import { discoverRetainedChecks } from '../pv1/retained-checks.mjs'
import { validateEvidenceRecord } from '../pv1/evidence-validator.mjs'
import { runProductionGate } from '../pv1/gate.mjs'

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
    artifact_hashes: [{ path: 'test-output.txt', sha256: 'f'.repeat(64) }],
    ...overrides,
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
  const validation = validateEvidenceRecord(evidenceFixture(design, stale), {
    schema: design.evidenceSchema,
    candidate: current,
    designSha256: design.specificationSha256,
  })
  assert.equal(validation.valid, false)
  assert.equal(validation.countable, false)
  const matrix = createGapMatrix({ requirements: [design.requirementsById.get('PV-GATE-001')], expectedIds: ['PV-GATE-001'], evidenceResults: [{ record: evidenceFixture(design, stale), validation }] })
  assert.equal(matrix.entries[0].status, 'NOT_EVALUATED')
  assert.equal(evaluateGate({ matrix }).green, false)
})

test('skipped evidence never counts as verified', async () => {
  const design = await loadDesignPackage()
  const candidate = candidateFixture()
  const record = evidenceFixture(design, candidate, { result: 'SKIPPED' })
  const validation = validateEvidenceRecord(record, { schema: design.evidenceSchema, candidate, designSha256: design.specificationSha256 })
  assert.equal(validation.valid, true)
  assert.equal(validation.countable, false)
  const matrix = createGapMatrix({ requirements: [design.requirementsById.get('PV-GATE-001')], expectedIds: ['PV-GATE-001'], evidenceResults: [{ record, validation }] })
  assert.equal(matrix.entries[0].status, 'NOT_EVALUATED')
  assert.equal(evaluateGate({ matrix }).green, false)
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

test('production-gate skeleton emits honest NOT_EVALUATED output and nonzero exit code', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'sysgrid-pv1-gate-'))
  try {
    const result = await runProductionGate({ repoRoot, profile: 'test', outputDir })
    assert.equal(result.verdict, 'NOT_EVALUATED')
    assert.equal(result.exit_code, 2)
    assert.equal(result.arithmetic.total_required, 136)
    assert.equal(result.arithmetic.verified, 0)
    assert.equal(result.design.requirement_ids_loaded_once, true)
    assert.equal(result.retained_checks.length, 3)
    const written = JSON.parse(await readFile(path.join(outputDir, 'production-gate-result.json'), 'utf8'))
    assert.equal(written.verdict, 'NOT_EVALUATED')
    assert.equal(written.green, undefined)
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
})
