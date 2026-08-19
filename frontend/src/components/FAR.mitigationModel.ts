export const FAR_MITIGATION_TYPES = ['Monitoring', 'Workaround', 'Process Change'] as const
export const FAR_MITIGATION_STATUSES = ['Not Started', 'In Progress', 'Completed'] as const

export type FarMitigationType = (typeof FAR_MITIGATION_TYPES)[number]
export type FarMitigationStatus = (typeof FAR_MITIGATION_STATUSES)[number]

export type FarMitigationFormState = {
  mitigation_type: FarMitigationType
  mitigation_steps: string
  responsible_team: string
  status: FarMitigationStatus
  bkm_mode: 'link' | 'input'
  bkm_id: string
  external_bkm_url: string
  monitoring_item_id: string
}

const STATUS_INDEX = new Map(FAR_MITIGATION_STATUSES.map((status, index) => [status, index]))

export function normalizeFarMitigationStatus(value: unknown): FarMitigationStatus {
  const normalized = value
  if (!FAR_MITIGATION_STATUSES.includes(normalized as FarMitigationStatus)) return 'Not Started'
  return normalized as FarMitigationStatus
}

export function getFarMitigationStatusOptions(currentStatus?: unknown): FarMitigationStatus[] {
  if (currentStatus == null) return [...FAR_MITIGATION_STATUSES]
  const current = normalizeFarMitigationStatus(currentStatus)
  const index = STATUS_INDEX.get(current) ?? 0
  return FAR_MITIGATION_STATUSES.filter((_, candidateIndex) => candidateIndex === index || candidateIndex === index + 1)
}

export function normalizeFarMitigationType(value: unknown, fallback: FarMitigationType = 'Workaround'): FarMitigationType {
  if (FAR_MITIGATION_TYPES.includes(value as FarMitigationType)) return value as FarMitigationType
  if (value === 'MONITORING') return 'Monitoring'
  if (value === 'WORKAROUND') return 'Workaround'
  return fallback
}

export function buildFarMitigationFormState(type: unknown, initialData?: Record<string, any> | null): FarMitigationFormState {
  const mitigationType = normalizeFarMitigationType(initialData?.mitigation_type ?? type)
  const knowledgeId = initialData?.knowledge_bkm_id
  const externalUrl = typeof initialData?.external_bkm_url === 'string' ? initialData.external_bkm_url : ''
  return {
    mitigation_type: mitigationType,
    mitigation_steps: typeof initialData?.mitigation_steps === 'string' ? initialData.mitigation_steps : '',
    responsible_team: typeof initialData?.responsible_team === 'string' ? initialData.responsible_team : '',
    status: normalizeFarMitigationStatus(initialData?.status),
    bkm_mode: knowledgeId ? 'link' : externalUrl ? 'input' : 'link',
    bkm_id: knowledgeId ? String(knowledgeId) : '',
    external_bkm_url: externalUrl,
    monitoring_item_id: initialData?.monitoring_item_id ? String(initialData.monitoring_item_id) : '',
  }
}

function parsePositiveInteger(value: string, field: string): number | undefined {
  if (!value) return undefined
  if (!/^\d+$/.test(value)) throw new Error(`${field} must be a positive integer`)
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${field} must be a positive integer`)
  return parsed
}

export function validateFarExternalBkmUrl(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.length > 2048) throw new Error('External BKM link is too long')
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('External BKM link must be a valid HTTP(S) URL')
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error('External BKM link must be a valid HTTP(S) URL')
  }
  if (parsed.username || parsed.password) {
    throw new Error('External BKM link must not contain embedded credentials')
  }
  return parsed.toString()
}

export function buildFarMitigationPayload(
  state: FarMitigationFormState,
  modeId: number,
  causeId: number,
): Record<string, any> {
  const payload: Record<string, any> = {
    mitigation_type: state.mitigation_type,
    mitigation_steps: state.mitigation_steps.trim(),
    responsible_team: state.responsible_team.trim() || null,
    status: normalizeFarMitigationStatus(state.status),
    mode_ids: [modeId],
    cause_id: causeId,
  }
  if (!payload.mitigation_steps) throw new Error('Deployment narrative is required')

  if (state.mitigation_type === 'Monitoring') {
    const monitoringItemId = parsePositiveInteger(state.monitoring_item_id, 'Monitoring reference')
    if (!monitoringItemId) throw new Error('Monitoring reference is required')
    payload.monitoring_item_id = monitoringItemId
    return payload
  }

  if (state.mitigation_type === 'Workaround') {
    if (state.bkm_mode === 'link') {
      const knowledgeId = parsePositiveInteger(state.bkm_id, 'BKM reference')
      if (knowledgeId) payload.knowledge_bkm_id = knowledgeId
    } else {
      const externalUrl = validateFarExternalBkmUrl(state.external_bkm_url)
      if (externalUrl) payload.external_bkm_url = externalUrl
    }
  }

  return payload
}
