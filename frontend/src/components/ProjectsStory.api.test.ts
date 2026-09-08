import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../api/apiClient'
import { PortfolioProjectionError, readPV1Portfolio, validatePortfolioResponse } from './ProjectsStory.api'

vi.mock('../api/apiClient', () => ({ apiFetch: vi.fn() }))

const story = (overrides: Record<string, unknown> = {}) => ({
  health: { level: 'Unknown', reason: 'Delivery work is not planned yet.' },
  delivery: { percent: null, label: 'Not planned', method: 'No executable work is recorded.' },
  next_milestone: null,
  milestones: [],
  attention: [],
  attention_count: 0,
  acceptance_criteria: [],
  primary_metric: null,
  latest_update: null,
  governance: [],
  architecture: { assessment: 'Not assessed', rationale: null },
  resources: [],
  freshness: { updated_at: null, source: 'Canonical Project projection' },
  coverage: { resources: 'available', architecture: 'assessment-only', updates: 'available' },
  ...overrides,
})

const item = (id: string, legacy = false) => ({
  id,
  display_key: `PRJ-${id}`,
  legacy_project_id: legacy ? Number(id) : null,
  name: legacy ? 'Migrated project' : 'Native project',
  owner_id: 'admin_root',
  phase: 'Planning',
  run_state: 'Active',
  priority: 'Medium',
  architecture_assessment: 'Not assessed',
  outcome_phase: 'Planned',
  outcome_result: 'Unassessed',
  revision: 1,
  graph_revision: 1,
  capabilities: { view: true, edit: true },
  story: story(legacy ? { freshness: { updated_at: null, source: 'Canonical Project projection' } } : {}),
})

const response = (items: unknown[]) => ({
  items,
  summary: { Planned: items.length, Active: 0, Delivered: 0, Paused: 0, Cancelled: 0, 'Needs attention': 0, Measuring: 0, Realized: 0, 'Closed below target': 0 },
  as_of: '2026-09-07T00:00:00Z',
  source_revision: 'pv1-project-list:2',
  coverage: { projects: 'complete' },
})

describe('Projects Story canonical API boundary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('accepts native and migrated items only when both carry the complete story contract', () => {
    const result = validatePortfolioResponse(response([item('1'), item('2', true)]))
    expect(result.items.map((project) => project.legacy_project_id)).toEqual([null, 2])
    expect(result.items.every((project) => project.story.governance.length === 0)).toBe(true)
    expect(result.items.every((project) => project.story.attention_count === 0)).toBe(true)
  })

  it('rejects a partial project without dropping it or manufacturing story values', () => {
    const malformed = { ...item('42'), story: undefined }
    expect(() => validatePortfolioResponse(response([malformed]))).toThrow(PortfolioProjectionError)
    try {
      validatePortfolioResponse(response([malformed]))
    } catch (error) {
      expect(error).toMatchObject({ code: 'INVALID_PROJECT_PROJECTION', projectId: '42', displayKey: 'PRJ-42', itemIndex: 0 })
      expect((error as PortfolioProjectionError).missing).toContain('story')
      expect((error as Error).message).toContain('/api/v2/projects?limit=200')
    }
  })

  it('validates the actual read path before Portfolio receives data', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify(response([item('7')])), { status: 200 }))
    await expect(readPV1Portfolio()).resolves.toMatchObject({ items: [{ id: '7' }] })
    vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify(response([{ ...item('8'), story: undefined }])), { status: 200 }))
    await expect(readPV1Portfolio()).rejects.toMatchObject({ code: 'INVALID_PROJECT_PROJECTION', projectId: '8' })
  })
})
