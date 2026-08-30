import {
  normalizeProjectSavedViewState,
  projectSavedViewFromWorkspaceDefinition,
  type ProjectSavedViewState,
} from './ProjectsGolden.model'

const MAX_PROJECT_SAVED_VIEW_OPTIONS = 200

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
)

const normalizeName = (value: unknown) => (
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

const localProjectSavedViewOptions = (value: unknown): ProjectSavedViewOption[] => {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_PROJECT_SAVED_VIEW_OPTIONS).flatMap((entry, index) => {
    const record = asRecord(entry)
    if (!record) return []
    const name = normalizeName(record.name)
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

const remoteProjectSavedViewOptions = (value: unknown): ProjectSavedViewOption[] => {
  const payload = asRecord(value)
  const views = payload && Array.isArray(payload.views) ? payload.views : []
  const seen = new Set<number>()
  const result: ProjectSavedViewOption[] = []

  views.slice(0, MAX_PROJECT_SAVED_VIEW_OPTIONS).forEach((entry) => {
    const record = asRecord(entry)
    const definition = record ? asRecord(record.definition) : null
    if (!record || !definition) return
    if (record.workspace_key !== undefined && record.workspace_key !== 'projects') return
    if (record.schema_version !== 1) return
    const id = Number(record.id)
    const name = normalizeName(record.name)
    if (!Number.isSafeInteger(id) || id < 1 || !name || seen.has(id)) return
    if (!['searchTerm', 'filters', 'activeTab', 'mode'].some((key) => key in definition)) return
    seen.add(id)
    const revision = Number(record.revision)
    result.push({
      id: `remote:${id}`,
      name,
      source: 'remote',
      remoteId: id,
      revision: Number.isSafeInteger(revision) && revision > 0 ? revision : undefined,
      state: projectSavedViewFromWorkspaceDefinition(definition),
    })
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
