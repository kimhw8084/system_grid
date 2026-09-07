import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { collectCandidateIdentity } from './candidate-identity.mjs'
import { loadDesignPackage, REPOSITORY_ROOT } from './design-package.mjs'
import { createGapMatrix, evaluateGate } from './gap-matrix.mjs'
import { discoverRetainedChecks } from './retained-checks.mjs'
import { validateEvidenceRecords } from './evidence-validator.mjs'

const PROOF_LAYER_IDS = [
  'schema_type_lint_build',
  'domain_unit',
  'real_database_api',
  'concurrency_security',
  'component_state',
  'retained_regression',
  'pv1_browser_journeys',
  'accessibility',
  'performance_load',
  'migration_restore_rollback',
  'independent_visual_review',
  'human_usability',
  'controlled_pilot',
]

async function collectEvidenceRecords(repoRoot) {
  const evidenceRoot = path.join(repoRoot, 'evidence', 'pv1')
  let filenames
  try { filenames = (await readdir(evidenceRoot, { withFileTypes: true })).filter((entry) => entry.isFile() && entry.name.endsWith('.json')).map((entry) => path.join(evidenceRoot, entry.name)) } catch { return [] }
  const records = []
  for (const filename of filenames.sort()) {
    try {
      records.push(JSON.parse(await readFile(filename, 'utf8')))
    } catch (error) {
      records.push({ __source: filename, __parse_error: error.message })
    }
  }
  return records
}

function timestampId() {
  return new Date().toISOString().replaceAll(/[-:.]/g, '').replace('Z', 'Z')
}

export async function runProductionGate({ repoRoot = REPOSITORY_ROOT, profile = 'release', outputDir } = {}) {
  const design = await loadDesignPackage()
  const candidate = await collectCandidateIdentity({ repoRoot })
  const retainedChecks = discoverRetainedChecks(design.gateContract)
  const rawEvidence = await collectEvidenceRecords(repoRoot)
  const evidenceResults = validateEvidenceRecords(rawEvidence, {
    schema: design.evidenceSchema,
    candidate,
    designSha256: design.specificationSha256,
  })
  const matrix = createGapMatrix({
    requirements: design.requirements.requirements,
    expectedIds: design.requirementIds,
    evidenceResults,
  })
  const proofLayers = PROOF_LAYER_IDS.map((layerId) => ({ layer_id: layerId, status: 'NOT_EVALUATED', implementation: 'SCAFFOLD_NOT_IMPLEMENTED' }))
  const gate = evaluateGate({ matrix, proofLayers, retainedChecks })
  const result = {
    schema: 'sysgrid.pv1.production-gate-result.v1',
    phase: 'P01_EVIDENCE_GATE_SCAFFOLD',
    profile,
    generated_at: new Date().toISOString(),
    verdict: gate.verdict,
    exit_code: gate.green ? 0 : 2,
    candidate,
    design: {
      specification_sha256: design.specificationSha256,
      requirement_count: design.requirementIds.length,
      requirement_ids_loaded_once: new Set(design.requirementIds).size === design.requirementIds.length,
    },
    arithmetic: gate.arithmetic,
    requirements: matrix.entries,
    proof_layers: proofLayers,
    retained_checks: retainedChecks,
    evidence: evidenceResults.map(({ record, validation }) => ({ source: record.__source || 'in-memory', requirement_id: record.requirement_id || null, result: record.result || null, validation })),
    honest_incomplete_reasons: [
      'No PV1 evidence record is allowed to certify a different candidate.',
      'All proof layers are scaffolded but not implemented.',
      'Retained checks are registered and not executed by this skeleton.',
      'Manual implemented=true fields are ignored by gap-matrix arithmetic.',
    ],
  }
  const destination = outputDir || path.join(repoRoot, 'artifacts', 'pv1-gate', profile, timestampId())
  await mkdir(destination, { recursive: true })
  await writeFile(path.join(destination, 'production-gate-result.json'), `${JSON.stringify(result, null, 2)}\n`)
  await writeFile(path.join(destination, 'gap-matrix.json'), `${JSON.stringify({ schema: 'sysgrid.pv1.gap-matrix.v1', candidate, ...matrix, arithmetic: gate.arithmetic }, null, 2)}\n`)
  await writeFile(path.join(destination, 'source-manifest.json'), `${JSON.stringify({ candidate, design: result.design, retained_checks: retainedChecks, profile }, null, 2)}\n`)
  return { ...result, output_dir: destination }
}

