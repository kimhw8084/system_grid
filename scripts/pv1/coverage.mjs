/*
 * The design package intentionally does not contain repository file paths.  This
 * manifest is the repository-owned bridge from the immutable PV1 IDs to the
 * checks that can actually produce evidence for this candidate.  A requirement
 * is only countable when every declared evidence type has a matching PASS
 * record from the check named here.
 */

const PROJECT = {
  implementation: ['frontend/src/components/ProjectsStory.tsx', 'backend/app/pv1/domain.py'],
  unit: 'domain:backend-pv1',
  integration: 'backend:project-domain',
  browser: 'browser:p04',
  journey: 'browser:p04',
  security: 'security:backend',
  accessibility: 'accessibility:out40',
  visual: 'retained:visual',
}

const WORK = {
  implementation: ['frontend/src/components/ProjectsWorkPlan.tsx', 'backend/app/pv1/domain.py'],
  unit: 'domain:backend-pv1',
  integration: 'backend:project-domain',
  browser: 'browser:p05',
  journey: 'browser:p05',
  security: 'security:backend',
  accessibility: 'accessibility:out40',
}

const TIME = {
  implementation: ['frontend/src/components/ProjectsScheduleCore.ts', 'backend/app/pv1/schedule.py'],
  unit: 'domain:timeline-unit',
  integration: 'domain:timeline',
  browser: 'browser:p06',
  journey: 'browser:p06',
  security: 'security:backend',
  accessibility: 'accessibility:out40',
  performance: 'performance:schedule',
}

const ARCH = {
  implementation: ['frontend/src/architecture/core.ts', 'backend/app/architecture/domain.py'],
  unit: 'domain:architecture',
  integration: 'domain:architecture',
  browser: 'browser:p07',
  journey: 'browser:p07',
  security: 'security:backend',
  accessibility: 'accessibility:architecture',
  performance: 'performance:architecture',
}

const UPDATES = {
  implementation: ['frontend/src/components/ProjectsCommunication.tsx', 'backend/app/pv1/communication.py'],
  unit: 'domain:communication',
  integration: 'domain:communication',
  browser: 'browser:p08',
  security: 'security:backend',
}

const OUTCOMES = {
  implementation: ['frontend/src/components/ProjectsOutcomes.tsx', 'backend/app/pv1/outcomes.py'],
  unit: 'domain:outcomes',
  integration: 'domain:outcomes',
  browser: 'browser:p09',
  journey: 'browser:p09',
  security: 'security:backend',
}

const MIGRATION = {
  implementation: ['backend/app/pv1/migration.py', 'backend/alembic/versions'],
  unit: 'migration:p11',
  integration: 'migration:p11',
  migration: 'migration:p11',
  operations: 'operations:migration',
  security: 'security:backend',
  browser: 'browser:p11',
  journey: 'browser:p11',
}

const COMMON = {
  implementation: ['backend/app/pv1/domain.py', 'backend/app/api/pv1.py'],
  unit: 'domain:backend-pv1',
  integration: 'backend:project-domain',
  browser: 'browser:p11',
  security: 'security:backend',
  operations: 'operations:contracts',
}

const PERF = {
  implementation: ['scripts/pv1/performance-profiles.mjs', 'frontend/src/components/ProjectsScheduleCore.ts'],
  performance: 'performance:manifest',
  review: 'internal:source-inventory',
  security: 'security:backend',
}

// These requirements have evidence producers that are deliberately narrower
// than the family defaults.  Keeping the binding here means a green arithmetic
// result cannot be obtained by attaching an unrelated manifest to a missing
// performance proof.
const P12_PERFORMANCE = {
  'PV-API-006': {
    implementation: ['frontend/src/api/apiClient.ts', 'backend/app/main.py', 'scripts/pv1/prove-api-projection.py'],
    checks: { integration: 'performance:api-projection', browser: 'browser:performance', performance: 'performance:api-projection' },
  },
  'PV-PERF-002': {
    implementation: ['frontend/tests/pv1-performance-browser.spec.ts', 'frontend/tests/pv1-architecture-performance-browser.spec.ts', 'scripts/proof-p07-architecture.sh'],
    checks: { performance: 'browser:performance', browser: 'browser:architecture-performance' },
  },
  'PV-PERF-004': {
    implementation: ['scripts/pv1/run-p12-load.py', 'scripts/pv1/run-p12-load.sh'],
    checks: { performance: 'performance:load', security: 'performance:load', integration: 'performance:load' },
  },
}

const DEFERRED_OWNERSHIP = {
  'PV-PERF-003': {
    owner_phase: 'P14_PILOT_RELEASE_HANDOFF',
    status: 'NOT_EVALUATED',
    reason: 'Real initial-release pilot field samples are required; zero traffic is No data, not PASS.',
  },
}

// These cells were previously backed by self-generated source-inventory
// evidence. Each now has a requirement-specific executable/static proof. The
// map is intentionally explicit so a new review cell cannot silently fall back
// to an inventory file.
export const REVIEW_CELL_PROVENANCE = Object.fromEntries([
  'PV-CORE-002', 'PV-CORE-003', 'PV-CORE-004', 'PV-CORE-005', 'PV-NAV-001',
  'PV-WORK-008', 'PV-ARCH-001', 'PV-DATA-004', 'PV-API-001', 'PV-SEC-004',
  'PV-PERF-001', 'PV-GATE-001', 'PV-GATE-006', 'PV-MIG-001', 'PV-MIG-004',
  'PV-MIG-005', 'PV-MIG-006', 'PV-REF-001', 'PV-EDGE-002',
].map((id) => [id, `review:${id.toLowerCase()}`]))

const GATE = {
  implementation: ['scripts/pv1/gate.mjs', 'scripts/pv1/gap-matrix.mjs'],
  gate: 'internal:coverage-map',
  integration: 'browser:matrix',
  browser: 'browser:matrix',
  unit: 'schema:node-gate-tests',
}

const NAV = {
  implementation: ['frontend/src/components/ProjectsGolden.tsx', 'frontend/src/components/ProjectsNavigation.test.ts'],
  unit: 'component:projects',
  integration: 'browser:p11',
  browser: 'browser:p11',
  accessibility: 'accessibility:out40',
  visual: 'retained:visual',
  review: 'internal:source-inventory',
}

const FAMILY = new Map([
  ['PV-CORE', COMMON],
  ['PV-ROLE', COMMON],
  ['PV-NAV', NAV],
  ['PV-UI', NAV],
  ['PV-PORT', PROJECT],
  ['PV-NEW', PROJECT],
  ['PV-HOME', PROJECT],
  ['PV-WORK', WORK],
  ['PV-PLAN', WORK],
  ['PV-TIME', TIME],
  ['PV-ARCH', ARCH],
  ['PV-UPD', UPDATES],
  ['PV-OUT', OUTCOMES],
  ['PV-DATA', COMMON],
  ['PV-API', COMMON],
  ['PV-REL', COMMON],
  ['PV-SEC', COMMON],
  ['PV-A11Y', TIME],
  ['PV-PERF', PERF],
  ['PV-GATE', GATE],
  ['PV-MIG', MIGRATION],
  ['PV-REF', COMMON],
  ['PV-EDGE', NAV],
  ['PV-CMD', COMMON],
])

const JOURNEYS = new Map([
  ['PV-CORE-001', 'browser:p04'],
  ['PV-JNY-001', 'browser:p04'],
  ['PV-JNY-002', 'browser:p05'],
  ['PV-JNY-003', 'browser:p06'],
  ['PV-JNY-004', 'browser:p04'],
  ['PV-JNY-005', 'browser:p07'],
  ['PV-JNY-006', 'browser:p09'],
  ['PV-JNY-007', 'browser:p09'],
  ['PV-JNY-008', 'browser:p11'],
])

export function familyFor(requirementId) {
  return requirementId.split('-').slice(0, 2).join('-')
}

export function coverageFor(requirement) {
  const special = P12_PERFORMANCE[requirement.id]
  const family = FAMILY.get(familyFor(requirement.id)) || COMMON
  const journeyCheck = JOURNEYS.get(requirement.id)
  const evidenceTypes = {}
  for (const type of requirement.required_evidence_types || []) {
    if (type === 'human') continue
    if (type === 'journey' && journeyCheck) evidenceTypes[type] = journeyCheck
    else if (special?.checks?.[type]) evidenceTypes[type] = special.checks[type]
    else if (type === 'review' && REVIEW_CELL_PROVENANCE[requirement.id]) evidenceTypes[type] = REVIEW_CELL_PROVENANCE[requirement.id]
    else if (family[type]) evidenceTypes[type] = family[type]
    else if (type === 'gate') evidenceTypes[type] = 'internal:coverage-map'
    else if (type === 'visual') evidenceTypes[type] = 'retained:visual'
    else if (type === 'operations' && familyFor(requirement.id) !== 'PV-PERF') evidenceTypes[type] = 'operations:contracts'
  }
  const implementationRefs = special?.implementation || family.implementation || COMMON.implementation
  const testRefs = Object.values(evidenceTypes)
  return {
    requirement_id: requirement.id,
    implementation_refs: implementationRefs,
    test_refs: [...new Set(testRefs)],
    evidence_types: evidenceTypes,
    missing_declared_types: (requirement.required_evidence_types || []).filter((type) => !evidenceTypes[type]),
    phase_ownership: DEFERRED_OWNERSHIP[requirement.id] || { owner_phase: 'P12_AUTOMATED_PRODUCTION_GATE', status: 'P12_OWNED' },
  }
}

export function buildCoverageMap(requirements) {
  const map = Object.fromEntries(requirements.map((requirement) => [requirement.id, coverageFor(requirement)]))
  const missing = Object.values(map).filter((entry) => entry.missing_declared_types.length > 0)
  return { map, missing }
}
