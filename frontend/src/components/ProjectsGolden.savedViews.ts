import {
  normalizeProjectSavedViewState,
  projectSavedViewFromWorkspaceDefinition,
  projectSavedViewToWorkspaceDefinition,
  type ProjectSavedViewState,
} from './ProjectsGolden.model'

const MAX_PROJECT_SAVED_VIEW_OPTIONS = 200

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
)

export const normalizeProjectSavedViewName = (value: unknown) => (
  typeof value === 'string' ? value.split(/\s+/).filter(Boolean).join(' ').slice(0, 120) : ''
)

export interface ProjectSavedViewOption {
  id: string
  name: string
  source: 'local' | 'remote'
  state: ProjectSavedViewState
  remoteId?: number
  revision?: number
}

export interface ProjectRemoteSavedViewRecord {
  id: number
  workspace_key: 'projects'
  name: string
  scope?: 'personal'
  owner_user_id?: string
  team_id?: null
  definition: Record<string, unknown>
  schema_version: 1
  revision: number
  is_favorite?: boolean
  is_default?: boolean
  created_at?: string | null
  updated_at?: string | null
}

export interface ProjectSavedViewConflict {
  message: string
  current: ProjectRemoteSavedViewRecord
  option: ProjectSavedViewOption
}

const localProjectSavedViewOptions = (value: unknown): ProjectSavedViewOption[] => {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_PROJECT_SAVED_VIEW_OPTIONS).flatMap((entry, index) => {
    const record = asRecord(entry)
    if (!record) return []
    const name = normalizeProjectSavedViewName(record.name)
    if (!name) return []
    const rawId = typeof record.id === 'string' || typeof record.id === 'number' ? String(record.id).trim() : ''
    return [{
      id: `local:${rawId || `legacy-${index + 1}`}:${index}`,
      name,
      source: 'local' as const,
      state: normalizeProjectSavedViewState(record),
    }]
  })
}

export const projectSavedViewOptionFromRemoteRecord = (entry: unknown): ProjectSavedViewOption | null => {
  const record = asRecord(entry)
  const definition = record ? asRecord(record.definition) : null
  if (!record || !definition) return null
  if (record.workspace_key !== undefined && record.workspace_key !== 'projects') return null
  if (record.scope !== undefined && record.scope !== 'personal') return null
  if (record.team_id !== undefined && record.team_id !== null) return null
  if (record.schema_version !== 1) return null
  const id = Number(record.id)
  const name = normalizeProjectSavedViewName(record.name)
  const revision = Number(record.revision)
  if (!Number.isSafeInteger(id) || id < 1 || !name) return null
  if (!Number.isSafeInteger(revision) || revision < 1) return null
  if (!['searchTerm', 'filters', 'activeTab', 'mode'].some((key) => key in definition)) return null
  return {
    id: `remote:${id}`,
    name,
    source: 'remote',
    remoteId: id,
    revision,
    state: projectSavedViewFromWorkspaceDefinition(definition),
  }
}

const remoteProjectSavedViewOptions = (value: unknown): ProjectSavedViewOption[] => {
  const payload = asRecord(value)
  const views = payload && Array.isArray(payload.views) ? payload.views : []
  const seen = new Set<number>()
  const result: ProjectSavedViewOption[] = []

  views.slice(0, MAX_PROJECT_SAVED_VIEW_OPTIONS).forEach((entry) => {
    const option = projectSavedViewOptionFromRemoteRecord(entry)
    if (!option?.remoteId || seen.has(option.remoteId)) return
    seen.add(option.remoteId)
    result.push(option)
  })
  return result
}

export const reconcileProjectSavedViewOptions = (localValue: unknown, remoteValue: unknown): ProjectSavedViewOption[] => [
  ...remoteProjectSavedViewOptions(remoteValue),
  ...localProjectSavedViewOptions(localValue),
]

export const projectSavedViewStateForSelection = (
  options: ProjectSavedViewOption[],
  id: string,
): ProjectSavedViewState | null => {
  const selected = options.find((option) => option.id === id)
  return selected ? { ...selected.state } : null
}

export const projectSavedViewStatesEqual = (left: unknown, right: unknown) => {
  const normalizedLeft = normalizeProjectSavedViewState(left)
  const normalizedRight = normalizeProjectSavedViewState(right)
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight)
}

export const buildProjectSavedViewMutationPayload = (
  nameValue: unknown,
  stateValue: unknown,
  revision?: number,
) => {
  const name = normalizeProjectSavedViewName(nameValue)
  const payload: Record<string, unknown> = {
    name,
    scope: 'personal',
    team_id: null,
    definition: projectSavedViewToWorkspaceDefinition(stateValue),
    schema_version: 1,
  }
  if (Number.isSafeInteger(revision) && Number(revision) > 0) payload.revision = Number(revision)
  return payload
}

export const projectSavedViewConflictFromError = (error: unknown): ProjectSavedViewConflict | null => {
  const source = asRecord(error)
  if (Number(source?.status) !== 409) return null
  const data = asRecord(source?.data)
  const detail = data ? asRecord(data.detail) : null
  const currentRecord = detail ? asRecord(detail.current) : null
  const option = projectSavedViewOptionFromRemoteRecord(currentRecord)
  if (!option?.remoteId || !option.revision || !currentRecord) return null
  return {
    message: typeof detail?.message === 'string' && detail.message.trim()
      ? detail.message.trim()
      : 'Saved view changed on the server.',
    current: {
      ...currentRecord,
      id: option.remoteId,
      workspace_key: 'projects',
      name: option.name,
      scope: 'personal',
      team_id: null,
      definition: asRecord(currentRecord.definition) || {},
      schema_version: 1,
      revision: option.revision,
    } as ProjectRemoteSavedViewRecord,
    option,
  }
}

export const projectSavedViewErrorMessage = (error: unknown): string => {
  const source = asRecord(error)
  const data = source ? asRecord(source.data) : null
  const detail = data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail.trim()
  const detailRecord = asRecord(detail)
  if (typeof detailRecord?.message === 'string' && detailRecord.message.trim()) return detailRecord.message.trim()
  if (typeof source?.message === 'string' && source.message.trim() && source.message !== '[object Object]') return source.message.trim()
  return 'Saved view request failed.'
}

export const isProjectSavedViewOfflineError = (error: unknown) => {
  const source = asRecord(error)
  const status = Number(source?.status)
  return !Number.isFinite(status) || status === 0 || status >= 500
}

export const upsertProjectRemoteSavedViewPayload = (payloadValue: unknown, recordValue: unknown) => {
  const payload = asRecord(payloadValue)
  const views = payload && Array.isArray(payload.views) ? payload.views : []
  const option = projectSavedViewOptionFromRemoteRecord(recordValue)
  if (!option?.remoteId) return payloadValue
  return {
    ...(payload || {}),
    views: [recordValue, ...views.filter((row) => Number(asRecord(row)?.id) !== option.remoteId)].slice(0, MAX_PROJECT_SAVED_VIEW_OPTIONS),
  }
}

export const removeProjectRemoteSavedViewPayload = (payloadValue: unknown, remoteId: number) => {
  const payload = asRecord(payloadValue)
  const views = payload && Array.isArray(payload.views) ? payload.views : []
  return {
    ...(payload || {}),
    views: views.filter((row) => Number(asRecord(row)?.id) !== remoteId),
  }
}
