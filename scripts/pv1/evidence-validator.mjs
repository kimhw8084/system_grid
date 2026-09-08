import { createHash } from 'node:crypto'
import { readFileSync, realpathSync, statSync } from 'node:fs'
import path from 'node:path'

const HASH_PATTERN = /^[0-9a-f]{64}$/
const COMMIT_PATTERN = /^[0-9a-f]{40}$/
const EVIDENCE_RESULTS = new Set(['PASS', 'FAIL', 'BLOCKED', 'SKIPPED'])
const EVIDENCE_TYPES = new Set(['accessibility', 'browser', 'gate', 'human', 'integration', 'journey', 'migration', 'operations', 'performance', 'review', 'security', 'unit', 'visual'])

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requireString(value, field, errors) {
  if (typeof value !== 'string' || value.length === 0) errors.push(`${field} must be a non-empty string`)
}

function requireHash(value, field, errors) {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) errors.push(`${field} must be a lowercase SHA-256 hex string`)
}

function requireCommit(value, field, errors) {
  if (typeof value !== 'string' || !COMMIT_PATTERN.test(value)) errors.push(`${field} must be a 40-character lowercase commit/tree hash`)
}

function rejectUnknownKeys(value, allowed, field, errors) {
  if (!isObject(value)) return
  for (const key of Object.keys(value)) if (!allowed.has(key)) errors.push(`unexpected ${field} property: ${key}`)
}

function validateCandidate(candidate, expectedCandidate, expectedDesignSha256, errors) {
  if (!isObject(candidate)) {
    errors.push('candidate must be an object')
    return
  }
  rejectUnknownKeys(candidate, new Set(['source_commit', 'source_tree', 'dirty_patch_sha256', 'frontend_digest', 'backend_digest', 'database_migration_revision', 'design_sha256']), 'candidate', errors)
  const required = ['source_commit', 'source_tree', 'dirty_patch_sha256', 'frontend_digest', 'backend_digest', 'database_migration_revision', 'design_sha256']
  for (const field of required) if (!(field in candidate)) errors.push(`candidate.${field} is required`)
  requireCommit(candidate.source_commit, 'candidate.source_commit', errors)
  requireCommit(candidate.source_tree, 'candidate.source_tree', errors)
  if (candidate.dirty_patch_sha256 !== null) requireHash(candidate.dirty_patch_sha256, 'candidate.dirty_patch_sha256', errors)
  requireHash(candidate.frontend_digest, 'candidate.frontend_digest', errors)
  requireHash(candidate.backend_digest, 'candidate.backend_digest', errors)
  requireString(candidate.database_migration_revision, 'candidate.database_migration_revision', errors)
  if (candidate.design_sha256 !== expectedDesignSha256) errors.push('candidate.design_sha256 does not match the canonical design hash')
  if (expectedCandidate) {
    for (const field of required.filter((field) => field !== 'design_sha256')) {
      if (candidate[field] !== expectedCandidate[field]) errors.push(`candidate.${field} is stale for the current candidate`)
    }
  }
}

function validateArtifactBytes(artifact, artifactRoot, errors) {
  if (!artifactRoot || typeof artifactRoot !== 'string') {
    errors.push('artifactRoot is required to validate file-backed evidence')
    return
  }
  if (typeof artifact.path !== 'string' || !artifact.path || path.isAbsolute(artifact.path) || /^[A-Za-z]:[\\/]/.test(artifact.path) || artifact.path.includes('\0') || artifact.path.split(/[\\/]/).includes('..')) {
    errors.push(`artifact ${String(artifact.path)} is not a safe relative path`)
    return
  }
  const root = path.resolve(artifactRoot)
  const resolved = path.resolve(root, artifact.path)
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    errors.push(`artifact ${artifact.path} escapes artifactRoot`)
    return
  }
  let rootReal
  let fileReal
  let stat
  let bytes
  try {
    rootReal = realpathSync(root)
    fileReal = realpathSync(resolved)
    stat = statSync(fileReal)
    bytes = readFileSync(fileReal)
  } catch (error) {
    errors.push(`artifact ${artifact.path} is missing or unreadable: ${error.code || error.message}`)
    return
  }
  if (fileReal !== rootReal && !fileReal.startsWith(`${rootReal}${path.sep}`)) {
    errors.push(`artifact ${artifact.path} resolves outside artifactRoot`)
    return
  }
  if (!stat.isFile()) {
    errors.push(`artifact ${artifact.path} is not a regular file`)
    return
  }
  const actualHash = createHash('sha256').update(bytes).digest('hex')
  if (actualHash !== artifact.sha256) errors.push(`artifact ${artifact.path} sha256 does not match its bytes`)
}

export function validateEvidenceRecord(record, { schema, candidate, designSha256, artifactRoot }) {
  const errors = []
  if (!isObject(record)) return { valid: false, countable: false, errors: ['evidence record must be an object'], result: null }
  const schemaProperties = schema?.properties || {}
  for (const key of Object.keys(record)) if (!Object.hasOwn(schemaProperties, key)) errors.push(`unexpected evidence property: ${key}`)
  for (const field of schema.required || []) if (!(field in record)) errors.push(`missing required evidence property: ${field}`)
  if (typeof record.requirement_id !== 'string' || !schemaProperties.requirement_id?.enum?.includes(record.requirement_id)) errors.push('requirement_id is not a design requirement ID')
  if (!EVIDENCE_TYPES.has(record.evidence_type)) errors.push('evidence_type is not in evidence-record.schema.json')
  requireString(record.check_id, 'check_id', errors)
  if (!EVIDENCE_RESULTS.has(record.result)) errors.push('result must be PASS, FAIL, BLOCKED, or SKIPPED')
  requireString(record.procedure, 'procedure', errors)
  if (typeof record.timestamp !== 'string' || Number.isNaN(Date.parse(record.timestamp))) errors.push('timestamp must be a parseable date-time')
  validateCandidate(record.candidate, candidate, designSha256, errors)
  requireString(record.fixture_id, 'fixture_id', errors)
  requireString(record.environment_id, 'environment_id', errors)
  if (!Array.isArray(record.artifact_hashes) || record.artifact_hashes.length < 1) errors.push('artifact_hashes must contain at least one artifact')
  else for (const [index, artifact] of record.artifact_hashes.entries()) {
    if (!isObject(artifact)) errors.push(`artifact_hashes[${index}] must be an object`)
    else {
      rejectUnknownKeys(artifact, new Set(['path', 'sha256']), `artifact_hashes[${index}]`, errors)
      requireString(artifact.path, `artifact_hashes[${index}].path`, errors)
      requireHash(artifact.sha256, `artifact_hashes[${index}].sha256`, errors)
      if (typeof artifact.path === 'string' && HASH_PATTERN.test(artifact.sha256 || '') && !Object.keys(artifact).some((key) => key !== 'path' && key !== 'sha256')) {
        validateArtifactBytes(artifact, artifactRoot, errors)
      }
    }
  }
  if (record.evidence_type === 'human') {
    if (!isObject(record.reviewer)) errors.push('human evidence requires reviewer')
    else {
      rejectUnknownKeys(record.reviewer, new Set(['id', 'independent', 'scope']), 'reviewer', errors)
      requireString(record.reviewer.id, 'reviewer.id', errors)
      if (record.reviewer.independent !== true) errors.push('human reviewer must be independently identified')
      requireString(record.reviewer.scope, 'reviewer.scope', errors)
    }
  }
  const candidateMatches = !errors.some((error) => error.includes('stale for the current candidate'))
  const schemaValid = errors.length === 0
  const countable = schemaValid && candidateMatches && record.result === 'PASS'
  return {
    valid: schemaValid && candidateMatches,
    countable,
    result: record.result,
    errors,
    nonCountingReason: countable ? null : (record.result === 'SKIPPED' ? 'SKIPPED_EVIDENCE' : errors.length ? 'INVALID_OR_STALE_EVIDENCE' : 'NON_PASS_RESULT'),
  }
}

export function validateEvidenceRecords(records, options) {
  return records.map((record) => ({ record, validation: validateEvidenceRecord(record, options) }))
}
