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

export type ProjectSavedViewScope = 'personal' | 'team'

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
  scope?: ProjectSavedViewScope
  teamId?: number | null
  isFavorite?: boolean
  isDefault?: boolean
}

export interface ProjectRemoteSavedViewRecord {
  id: number
  workspace_key: 'projects'
  name: string
  scope: ProjectSavedViewScope
  owner_user_id?: string
  team_id: number | null
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
  const scope: ProjectSavedViewScope | null = record.scope === 'team'
    ? 'team'
    : record.scope === 'personal' || record.scope === undefined ? 'personal' : null
  if (!scope) return null
  const teamId = record.team_id == null ? null : Number(record.team_id)
  if (scope === 'personal' && teamId !== null) return null
  if (scope === 'team' && (!Number.isSafeInteger(teamId) || Number(teamId) < 1)) return null
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
    scope,
    teamId,
    isFavorite: record.is_favorite === true,
    isDefault: record.is_default === true,
    state: projectSavedViewFromWorkspaceDefinition(definition),
  }
}

const remoteProjectSavedViewOptions = (
  value: unknown,
  expectedScope: ProjectSavedViewScope,
  expectedTeamId?: number | null,
): ProjectSavedViewOption[] => {
  const payload = asRecord(value)
  const views = payload && Array.isArray(payload.views) ? payload.views : []
  const seen = new Set<number>()
  const result: ProjectSavedViewOption[] = []

  views.slice(0, MAX_PROJECT_SAVED_VIEW_OPTIONS).forEach((entry) => {
    const option = projectSavedViewOptionFromRemoteRecord(entry)
    if (!option?.remoteId || seen.has(option.remoteId) || option.scope !== expectedScope) return
    if (expectedScope === 'team' && option.teamId !== expectedTeamId) return
    seen.add(option.remoteId)
    result.push(option)
  })
  return result.sort((left, right) => (
    Number(Boolean(right.isDefault)) - Number(Boolean(left.isDefault))
    || Number(Boolean(right.isFavorite)) - Number(Boolean(left.isFavorite))
  ))
}

export const reconcileProjectSavedViewOptions = (
  localValue: unknown,
  personalRemoteValue: unknown,
  teamRemoteValue?: unknown,
  currentTeamId?: number | null,
): ProjectSavedViewOption[] => [
  ...remoteProjectSavedViewOptions(personalRemoteValue, 'personal'),
  ...(Number.isSafeInteger(currentTeamId) && Number(currentTeamId) > 0
    ? remoteProjectSavedViewOptions(teamRemoteValue, 'team', Number(currentTeamId))
    : []),
  ...localProjectSavedViewOptions(localValue),
]

export const projectSavedViewOptionLabel = (option: ProjectSavedViewOption) => {
  if (option.source === 'local') return `${option.name} · Local`
  const scopeLabel = option.scope === 'team' ? 'Team' : 'Personal'
  const metadata = option.isDefault ? ' · Default' : option.isFavorite ? ' · Favorite' : ''
  return `${option.name} · ${scopeLabel}${metadata}`
}

export const resolveProjectCurrentTeamId = (operatorsValue: unknown, currentUserId: unknown): number | null => {
  if (!Array.isArray(operatorsValue) || typeof currentUserId !== 'string' || !currentUserId.trim()) return null
  const current = operatorsValue.find((entry) => {
    const record = asRecord(entry)
    return record && record.username === currentUserId.trim()
  })
  const teamId = Number(asRecord(current)?.team_id)
  return Number.isSafeInteger(teamId) && teamId > 0 ? teamId : null
}

export const projectSavedViewLinkedRemoteId = (value: unknown): number | null => {
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export const buildProjectSavedViewShareSearch = (searchValue: unknown, remoteId: number) => {
  const params = new URLSearchParams(typeof searchValue === 'string' ? searchValue : '')
  if (Number.isSafeInteger(remoteId) && remoteId > 0) params.set('saved_view', String(remoteId))
  return params.toString()
}

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
  scope: ProjectSavedViewScope = 'personal',
  teamId?: number | null,
) => {
  const name = normalizeProjectSavedViewName(nameValue)
  const normalizedTeamId = scope === 'team' && Number.isSafeInteger(teamId) && Number(teamId) > 0 ? Number(teamId) : null
  const payload: Record<string, unknown> = {
    name,
    scope,
    team_id: normalizedTeamId,
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
  if (!option?.remoteId || !option.revision || !option.scope || !currentRecord) return null
  return {
    message: typeof detail?.message === 'string' && detail.message.trim()
      ? detail.message.trim()
      : 'Saved view changed on the server.',
    current: {
      ...currentRecord,
      id: option.remoteId,
      workspace_key: 'projects',
      name: option.name,
      scope: option.scope,
      team_id: option.scope === 'team' ? option.teamId || null : null,
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
