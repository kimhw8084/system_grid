export type FarAuthoringTab = 'definition' | 'risk' | 'impact'

export type FarAuthoringErrors = Record<string, string>

const FAR_REQUIRED_FIELDS = new Set(['system_name', 'failure_type', 'title'])

export const isFarAuthoringFieldRequired = (field: string) => FAR_REQUIRED_FIELDS.has(field)

export function buildFarAuthoringDraft(value: any) {
  const base = {
    system_name: '',
    failure_type: 'Design',
    title: '',
    effect: '',
    severity: 1,
    occurrence: 1,
    detection: 1,
    affected_assets: [],
    ...value,
  }
  const affectedAssets = Array.isArray(base.affected_assets) ? base.affected_assets : []
  return {
    ...base,
    affected_assets: affectedAssets
      .map((asset: any) => Number(typeof asset === 'object' ? asset?.id : asset))
      .filter((id: number) => Number.isFinite(id)),
  }
}

export function sanitizeFarAuthoringPayload(value: any) {
  const payload = { ...value }
  payload.affected_assets = (Array.isArray(payload.affected_assets) ? payload.affected_assets : [])
    .map((asset: any) => Number(typeof asset === 'object' ? asset?.id : asset))
    .filter((id: number) => Number.isFinite(id))

  delete payload.causes
  delete payload.mitigations
  delete payload.prevention_actions
  delete payload.linked_rcas
  delete payload.created_at
  delete payload.updated_at
  delete payload.created_by_user_id
  delete payload.version
  delete payload.is_deleted

  return payload
}

const validateScore = (value: any, label: string) => {
  const score = Number(value)
  if (!Number.isInteger(score) || score < 1 || score > 10) return `${label} must be an integer from 1 to 10.`
  return null
}

export function buildFarAuthoringErrors(formData: any): FarAuthoringErrors {
  const errors: FarAuthoringErrors = {}
  if (isFarAuthoringFieldRequired('system_name') && !String(formData?.system_name || '').trim()) {
    errors.system_name = 'Operational domain is required.'
  }
  if (isFarAuthoringFieldRequired('failure_type') && !String(formData?.failure_type || '').trim()) {
    errors.failure_type = 'Root classification is required.'
  }
  if (isFarAuthoringFieldRequired('title') && !String(formData?.title || '').trim()) {
    errors.title = 'Incidence signature is required.'
  }

  const severityError = validateScore(formData?.severity, 'Severity')
  const occurrenceError = validateScore(formData?.occurrence, 'Occurrence')
  const detectionError = validateScore(formData?.detection, 'Detection')
  if (severityError) errors.severity = severityError
  if (occurrenceError) errors.occurrence = occurrenceError
  if (detectionError) errors.detection = detectionError

  return errors
}

export function getFarAuthoringTabErrorCounts(errors: FarAuthoringErrors) {
  return {
    definition: Object.keys(errors).filter((key) => ['system_name', 'failure_type', 'title', 'effect'].includes(key)).length,
    risk: Object.keys(errors).filter((key) => ['severity', 'occurrence', 'detection'].includes(key)).length,
    impact: Object.keys(errors).filter((key) => ['affected_assets'].includes(key)).length,
  }
}

export function getFarAuthoringFirstErrorTab(errors: FarAuthoringErrors): FarAuthoringTab {
  const counts = getFarAuthoringTabErrorCounts(errors)
  if (counts.definition) return 'definition'
  if (counts.risk) return 'risk'
  return 'impact'
}

export function changeFarAuthoringSystem(formData: any, nextSystem: string) {
  if (String(formData?.system_name || '') === String(nextSystem || '')) return formData
  return {
    ...formData,
    system_name: nextSystem,
    affected_assets: [],
  }
}
