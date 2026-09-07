import { apiFetch } from '../api/apiClient'
import type { CreationDraft, PortfolioResponse, ProjectStoryItem } from './ProjectsStory.model'

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
  const response = await apiFetch(`/api/v2/projects?${query.toString()}`)
  return response.json()
}

export const readPV1Project = async (projectId: string): Promise<ProjectStoryItem> => {
  const response = await apiFetch(`/api/v2/projects/${encodeURIComponent(projectId)}`)
  return response.json()
}

export const readPV1ProjectSummary = async (projectId: string): Promise<ProjectSummaryResponse> => {
  const response = await apiFetch(`/api/v2/projects/${encodeURIComponent(projectId)}/summary`)
  return response.json()
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
