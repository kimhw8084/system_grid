export const GAP_STATUSES = ['NOT_EVALUATED', 'FAIL', 'BLOCKED', 'VERIFIED']

function validateRequirementSet(requirements, expectedIds) {
  if (!Array.isArray(requirements)) throw new Error('Requirements must be an array')
  const ids = requirements.map((requirement) => requirement?.id)
  if (ids.some((id) => typeof id !== 'string' || !id)) throw new Error('Every requirement must have an ID')
  if (new Set(ids).size !== ids.length) throw new Error('Requirements contain duplicate IDs')
  if (expectedIds) {
    const actual = [...ids].sort()
    const expected = [...expectedIds].sort()
    if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index])) throw new Error('Requirement set is incomplete or contains an unknown ID')
  }
}

export function createGapMatrix({ requirements, expectedIds, evidenceResults = [] }) {
  validateRequirementSet(requirements, expectedIds)
  const byRequirement = new Map()
  for (const item of evidenceResults) {
    const id = item.record?.requirement_id
    if (!byRequirement.has(id)) byRequirement.set(id, [])
    byRequirement.get(id).push(item)
  }
  const entries = requirements.map((requirement) => {
    const evidence = byRequirement.get(requirement.id) || []
    const countable = evidence.filter((item) => item.validation.countable)
    const failures = evidence.filter((item) => item.record?.result === 'FAIL' && item.validation.valid)
    const blocked = evidence.filter((item) => item.record?.result === 'BLOCKED' && item.validation.valid)
    const implementationRefs = Array.isArray(requirement.implementation_refs) ? requirement.implementation_refs : []
    const testRefs = Array.isArray(requirement.test_refs) ? requirement.test_refs : []
    const traceabilityComplete = implementationRefs.length > 0 && testRefs.length > 0
    let status = 'NOT_EVALUATED'
    if (failures.length) status = 'FAIL'
    else if (blocked.length) status = 'BLOCKED'
    else if (countable.length && traceabilityComplete) status = 'VERIFIED'
    return {
      requirement_id: requirement.id,
      title: requirement.title,
      section: requirement.section,
      required: requirement.required === true,
      status,
      implementation_refs: implementationRefs,
      test_refs: testRefs,
      traceability_complete: traceabilityComplete,
      evidence_count: evidence.length,
      countable_evidence_count: countable.length,
      ignored_manual_implemented: requirement.implemented === true,
      evidence_diagnostics: [
        ...(traceabilityComplete ? [] : ['MISSING_TRACEABILITY_MAPPING']),
        ...evidence.flatMap((item) => item.validation.errors || []),
      ].slice(0, 20),
    }
  })
  return { statuses: GAP_STATUSES, total: entries.length, entries }
}

export function evaluateGate({ matrix, proofLayers = [], retainedChecks = [] }) {
  const counts = Object.fromEntries(GAP_STATUSES.map((status) => [status, matrix.entries.filter((entry) => entry.status === status).length]))
  const proofNotEvaluated = proofLayers.filter((layer) => layer.status !== 'PASS')
  const retainedNotEvaluated = retainedChecks.filter((check) => check.status !== 'PASS')
  let verdict = 'PASS'
  if (counts.FAIL > 0) verdict = 'FAIL'
  else if (counts.BLOCKED > 0) verdict = 'BLOCKED'
  else if (counts.NOT_EVALUATED > 0 || proofNotEvaluated.length || retainedNotEvaluated.length) verdict = 'NOT_EVALUATED'
  return {
    verdict,
    green: verdict === 'PASS',
    counts,
    arithmetic: {
      total_required: matrix.total,
      verified: counts.VERIFIED,
      failed: counts.FAIL,
      blocked: counts.BLOCKED,
      not_evaluated: counts.NOT_EVALUATED,
      progress: matrix.total ? counts.VERIFIED / matrix.total : 0,
      proof_layers_not_passed: proofNotEvaluated.length,
      retained_checks_not_passed: retainedNotEvaluated.length,
    },
    proof_layers_not_passed: proofNotEvaluated.map((layer) => layer.layer_id),
    retained_checks_not_passed: retainedNotEvaluated.map((check) => check.check_id),
  }
}
