import { apiFetch } from '../api/apiClient'
import type { CreationDraft, PortfolioResponse, ProjectStoryItem } from './ProjectsStory.model'

type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is JsonRecord => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const hasKey = (value: JsonRecord, key: string) => Object.prototype.hasOwnProperty.call(value, key)

export class PortfolioProjectionError extends Error {
  readonly code = 'INVALID_PROJECT_PROJECTION'
  readonly endpoint: string
  readonly itemIndex?: number
  readonly projectId?: string
  readonly displayKey?: string
  readonly missing: string[]

  constructor(options: { endpoint: string; missing: string[]; itemIndex?: number; projectId?: string; displayKey?: string }) {
    const identity = options.projectId || options.displayKey
      ? ` for ${options.displayKey || options.projectId}`
      : ''
    super(`Invalid canonical Project projection from ${options.endpoint}${identity}; missing or invalid: ${options.missing.join(', ')}`)
    this.name = 'PortfolioProjectionError'
    this.endpoint = options.endpoint
    this.itemIndex = options.itemIndex
    this.projectId = options.projectId
    this.displayKey = options.displayKey
    this.missing = options.missing
  }
}

const storyTaskPaths = (value: unknown, path: string, missing: string[]) => {
  if (!isRecord(value)) {
    missing.push(path)
    return
  }
  for (const key of ['id', 'title', 'status']) if (typeof value[key] !== 'string') missing.push(`${path}.${key}`)
}

const validateStory = (value: unknown, path: string, missing: string[]) => {
  if (!isRecord(value)) {
    missing.push(path)
    return
  }
  const health = value.health
  if (!isRecord(health)) missing.push(`${path}.health`)
  else {
    if (!['Off track', 'At risk', 'Unknown', 'On track'].includes(String(health.level))) missing.push(`${path}.health.level`)
    if (typeof health.reason !== 'string') missing.push(`${path}.health.reason`)
  }
  const delivery = value.delivery
  if (!isRecord(delivery)) missing.push(`${path}.delivery`)
  else {
    if (!(delivery.percent === null || (typeof delivery.percent === 'number' && Number.isFinite(delivery.percent)))) missing.push(`${path}.delivery.percent`)
    if (typeof delivery.label !== 'string') missing.push(`${path}.delivery.label`)
    if (typeof delivery.method !== 'string') missing.push(`${path}.delivery.method`)
  }
  if (value.next_milestone !== null) storyTaskPaths(value.next_milestone, `${path}.next_milestone`, missing)
  for (const key of ['milestones', 'attention', 'acceptance_criteria', 'governance', 'resources']) {
    if (!Array.isArray(value[key])) missing.push(`${path}.${key}`)
  }
  if (Array.isArray(value.milestones)) value.milestones.forEach((task, index) => storyTaskPaths(task, `${path}.milestones[${index}]`, missing))
  if (Array.isArray(value.attention)) value.attention.forEach((entry, index) => {
    if (!isRecord(entry)) return missing.push(`${path}.attention[${index}]`)
    for (const key of ['id', 'kind', 'reason', 'accountable', 'action']) if (typeof entry[key] !== 'string') missing.push(`${path}.attention[${index}].${key}`)
  })
  if (Array.isArray(value.acceptance_criteria)) value.acceptance_criteria.forEach((entry, index) => {
    if (!isRecord(entry)) return missing.push(`${path}.acceptance_criteria[${index}]`)
    for (const key of ['id', 'description', 'state']) if (typeof entry[key] !== 'string') missing.push(`${path}.acceptance_criteria[${index}].${key}`)
    if (typeof entry.mandatory !== 'boolean') missing.push(`${path}.acceptance_criteria[${index}].mandatory`)
  })
  if (Array.isArray(value.governance)) value.governance.forEach((entry, index) => {
    if (!isRecord(entry)) return missing.push(`${path}.governance[${index}]`)
    for (const key of ['id', 'type', 'title', 'state']) if (typeof entry[key] !== 'string') missing.push(`${path}.governance[${index}].${key}`)
  })
  if (!Array.isArray(value.resources)) missing.push(`${path}.resources`)
  if (typeof value.attention_count !== 'number' || !Number.isInteger(value.attention_count) || value.attention_count < 0) missing.push(`${path}.attention_count`)
  else if (Array.isArray(value.attention) && value.attention_count !== value.attention.length) missing.push(`${path}.attention_count`)
  for (const key of ['primary_metric', 'latest_update']) if (!hasKey(value, key)) missing.push(`${path}.${key}`)
  if (value.primary_metric !== null && !isRecord(value.primary_metric)) missing.push(`${path}.primary_metric`)
  if (value.latest_update !== null && !isRecord(value.latest_update)) missing.push(`${path}.latest_update`)
  if (!isRecord(value.architecture) || typeof value.architecture.assessment !== 'string') missing.push(`${path}.architecture`)
  if (!isRecord(value.freshness) || typeof value.freshness.source !== 'string') missing.push(`${path}.freshness`)
  if (!isRecord(value.coverage)) missing.push(`${path}.coverage`)
}

export const validateProjectStoryItem = (value: unknown, options: { endpoint?: string; itemIndex?: number } = {}): ProjectStoryItem => {
  const endpoint = options.endpoint || '/api/v2/projects'
  if (!isRecord(value)) throw new PortfolioProjectionError({ endpoint, itemIndex: options.itemIndex, missing: ['item'] })
  const missing: string[] = []
  for (const key of ['id', 'display_key', 'name', 'owner_id', 'phase', 'run_state', 'priority', 'architecture_assessment', 'outcome_phase', 'outcome_result']) {
    if (typeof value[key] !== 'string') missing.push(key)
  }
  for (const key of ['revision', 'graph_revision']) if (typeof value[key] !== 'number' || !Number.isInteger(value[key])) missing.push(key)
  if (!isRecord(value.capabilities)) missing.push('capabilities')
  validateStory(value.story, 'story', missing)
  if (missing.length) throw new PortfolioProjectionError({
    endpoint,
    itemIndex: options.itemIndex,
    projectId: typeof value.id === 'string' ? value.id : undefined,
    displayKey: typeof value.display_key === 'string' ? value.display_key : undefined,
    missing,
  })
  return value as ProjectStoryItem
}

export const validatePortfolioResponse = (value: unknown, endpoint = '/api/v2/projects?limit=200'): PortfolioResponse => {
  if (!isRecord(value)) throw new PortfolioProjectionError({ endpoint, missing: ['response'] })
  if (!Array.isArray(value.items)) throw new PortfolioProjectionError({ endpoint, missing: ['items'] })
  value.items.forEach((item, index) => validateProjectStoryItem(item, { endpoint, itemIndex: index }))
  const requiredTopLevel: Array<[string, boolean]> = [
    ['as_of', typeof value.as_of === 'string'],
    ['source_revision', typeof value.source_revision === 'string'],
    ['summary', isRecord(value.summary)],
    ['coverage', isRecord(value.coverage)],
  ]
  const missing = requiredTopLevel.filter(([, valid]) => !valid).map(([key]) => key)
  if (missing.length) throw new PortfolioProjectionError({ endpoint, missing })
  return value as PortfolioResponse
}

export type ReadinessResponse = {
  project_id: string
  from_phase: string
  to_phase: string
  ready: boolean
  gaps: Array<{ code: string; field: string; message: string; action: string; blocking: boolean }>
  project_revision: number
  as_of: string
}

export type ProjectSummaryResponse = {
  project: ProjectStoryItem
  story: ProjectStoryItem['story']
  capabilities: Record<string, boolean>
  as_of: string
  coverage: Record<string, string>
}

export const readPV1Portfolio = async (teamId?: number): Promise<PortfolioResponse> => {
  const query = new URLSearchParams({ limit: '200' })
  if (teamId) query.set('team_id', String(teamId))
  const endpoint = `/api/v2/projects?${query.toString()}`
  const response = await apiFetch(endpoint)
  return validatePortfolioResponse(await response.json(), endpoint)
}

export const readPV1Project = async (projectId: string): Promise<ProjectStoryItem> => {
  const endpoint = `/api/v2/projects/${encodeURIComponent(projectId)}`
  const response = await apiFetch(endpoint)
  return validateProjectStoryItem(await response.json(), { endpoint })
}

export const readPV1ProjectSummary = async (projectId: string): Promise<ProjectSummaryResponse> => {
  const endpoint = `/api/v2/projects/${encodeURIComponent(projectId)}/summary`
  const response = await apiFetch(endpoint)
  const result = await response.json() as ProjectSummaryResponse & { project?: unknown }
  validateProjectStoryItem(result.project, { endpoint })
  return result as ProjectSummaryResponse
}

export const readPV1Readiness = async (projectId: string, toPhase: string): Promise<ReadinessResponse> => {
  const response = await apiFetch(`/api/v2/projects/${encodeURIComponent(projectId)}/readiness?to_phase=${encodeURIComponent(toPhase)}`)
  return response.json()
}

export const readCreationTeams = async (): Promise<any[]> => {
  const response = await apiFetch('/api/v1/settings/teams')
  return response.json()
}

export const readCreationOperators = async (): Promise<any[]> => {
  const response = await apiFetch('/api/v1/settings/operators')
  return response.json()
}

const command = async (projectId: string, type: string, revision: number, payload: Record<string, unknown>) => {
  const commandId = crypto.randomUUID()
  const response = await apiFetch(`/api/v2/projects/${encodeURIComponent(projectId)}/commands`, {
    method: 'POST',
    headers: { 'Idempotency-Key': commandId },
    body: JSON.stringify({ command_id: commandId, type, expected: { project_revision: revision }, payload }),
  })
  return response.json()
}

export type CreateDraftInput = {
  name: string
  team_id: number
  owner_id: string
  objective: string | null
  problem: string | null
  priority: string
  template_key: string | null
  template_version: string | null
}

export const createPV1Draft = async (input: CreateDraftInput, commandId: string): Promise<ProjectStoryItem> => {
  const response = await apiFetch('/api/v2/projects', {
    method: 'POST',
    headers: { 'Idempotency-Key': commandId },
    body: JSON.stringify({ ...input, phase: 'Draft', visibility: 'Team' }),
  })
  const result = await response.json()
  return result.project
}

export const savePV1CreationDraft = async (project: ProjectStoryItem, details: Record<string, unknown>, creationDraft: CreationDraft): Promise<ProjectStoryItem> => {
  await command(project.id, 'project.save_creation_draft', project.revision, { details, creation_draft: creationDraft })
  return readPV1Project(project.id)
}

export const promotePV1Draft = async (project: ProjectStoryItem): Promise<ProjectStoryItem> => {
  await command(project.id, 'project.transition', project.revision, { to_phase: 'Proposed' })
  return readPV1Project(project.id)
}

export const discardPV1Draft = async (project: ProjectStoryItem): Promise<void> => {
  await command(project.id, 'project.discard_draft', project.revision, {})
}

export const runPV1LifecycleCommand = async (project: ProjectStoryItem, type: string, payload: Record<string, unknown> = {}): Promise<ProjectStoryItem> => {
  await command(project.id, type, project.revision, payload)
  return readPV1Project(project.id)
}
