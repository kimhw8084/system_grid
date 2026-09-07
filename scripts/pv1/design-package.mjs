import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const EXPECTED_DESIGN_SHA256 = 'c58a764e3ffbadd21640a205697f446683245b0b8a4ee244fc74ad5d9a68915c'
export const EXPECTED_REQUIREMENT_COUNT = 136
export const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export class DesignPackageError extends Error {
  constructor(message, details = []) {
    super(message)
    this.name = 'DesignPackageError'
    this.details = details
  }
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch (error) {
    throw new DesignPackageError(`Unable to parse design companion JSON: ${filePath}`, [error.message])
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function assertUniqueIds(ids, label) {
  const counts = new Map()
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
  const duplicates = [...counts.entries()].filter(([, count]) => count !== 1).map(([id, count]) => `${id}(${count})`)
  if (duplicates.length) throw new DesignPackageError(`${label} contains duplicate IDs`, duplicates)
}

function assertSameIdSet(left, right, label) {
  const leftSet = new Set(left)
  const rightSet = new Set(right)
  const missing = left.filter((id) => !rightSet.has(id))
  const extra = right.filter((id) => !leftSet.has(id))
  if (missing.length || extra.length) {
    throw new DesignPackageError(`${label} ID set does not match requirements.json`, [
      `missing: ${missing.join(', ') || '<none>'}`,
      `extra: ${extra.join(', ') || '<none>'}`,
    ])
  }
}

export function resolveAiRoot() {
  return process.env.SYSGRID_AI_ROOT || path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'gpt', 'sysgrid')
}

export async function loadDesignPackage({ aiRoot = resolveAiRoot() } = {}) {
  const designDir = path.join(aiRoot, 'design', 'PV1_Project_View_Production_Design')
  const specificationPath = path.join(designDir, 'PV1-Project-View-Production-Design.md')
  const requirementsPath = path.join(designDir, 'requirements.json')
  const evidenceSchemaPath = path.join(designDir, 'evidence-record.schema.json')
  const gateContractPath = path.join(designDir, 'production-gate-contract.json')

  let specification
  try {
    specification = await readFile(specificationPath)
  } catch (error) {
    throw new DesignPackageError(`Unable to read canonical PV1 Markdown: ${specificationPath}`, [error.message])
  }
  const specificationSha256 = sha256(specification)
  if (specificationSha256 !== EXPECTED_DESIGN_SHA256) {
    throw new DesignPackageError('Canonical PV1 Markdown SHA-256 mismatch', [
      `expected: ${EXPECTED_DESIGN_SHA256}`,
      `actual: ${specificationSha256}`,
    ])
  }

  const [requirements, evidenceSchema, gateContract] = await Promise.all([
    readJson(requirementsPath),
    readJson(evidenceSchemaPath),
    readJson(gateContractPath),
  ])

  if (requirements.specification_sha256 !== EXPECTED_DESIGN_SHA256) {
    throw new DesignPackageError('requirements.json design hash mismatch', [requirements.specification_sha256])
  }
  if (requirements.requirement_count !== EXPECTED_REQUIREMENT_COUNT || !Array.isArray(requirements.requirements) || requirements.requirements.length !== EXPECTED_REQUIREMENT_COUNT) {
    throw new DesignPackageError('requirements.json does not contain exactly 136 requirements', [
      `declared: ${requirements.requirement_count}`,
      `actual: ${Array.isArray(requirements.requirements) ? requirements.requirements.length : '<not-array>'}`,
    ])
  }

  const requirementIds = requirements.requirements.map((requirement) => requirement.id)
  assertUniqueIds(requirementIds, 'requirements.json')
  const contractIds = gateContract.requirement_ids
  const schemaIds = evidenceSchema?.properties?.requirement_id?.enum
  if (!Array.isArray(contractIds) || !Array.isArray(schemaIds)) {
    throw new DesignPackageError('Design companions do not expose requirement ID indexes')
  }
  assertUniqueIds(contractIds, 'production-gate-contract.json')
  assertUniqueIds(schemaIds, 'evidence-record.schema.json')
  assertSameIdSet(requirementIds, contractIds, 'production-gate-contract.json')
  assertSameIdSet(requirementIds, schemaIds, 'evidence-record.schema.json')

  const byId = new Map(requirements.requirements.map((requirement) => [requirement.id, requirement]))
  return {
    aiRoot,
    designDir,
    specificationPath,
    specificationSha256,
    requirementsPath,
    evidenceSchemaPath,
    gateContractPath,
    requirements,
    requirementsById: byId,
    evidenceSchema,
    gateContract,
    requirementIds,
  }
}
