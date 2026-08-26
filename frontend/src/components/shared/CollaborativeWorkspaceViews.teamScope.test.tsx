import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { apiClient } from '../../api/apiClient'
import {
  useCollaborativeWorkspaceViews,
  type CollaborativeSavedView,
  type WorkspaceViewApiRecord,
} from './CollaborativeWorkspaceViews'

type Config = { groupBy: string }
type View = CollaborativeSavedView<Config>

const SYSTEM_VIEW_IDS = new Set<string>()
const normalizeViews = (views: View[]) => views
const sanitizeDefinition = (raw: unknown): Config => {
  const value = raw && typeof raw === 'object' ? raw as Partial<Config> : {}
  return { groupBy: typeof value.groupBy === 'string' ? value.groupBy : 'raw' }
}

function teamRecord(overrides: Partial<WorkspaceViewApiRecord<Config>> = {}): WorkspaceViewApiRecord<Config> {
  return {
    id: 9,
    workspace_key: 'monitoring',
    name: 'Shared operations',
    scope: 'team',
    owner_user_id: 'admin_root',
    team_id: 42,
    definition: { groupBy: 'status' },
    schema_version: 1,
    revision: 2,
    is_favorite: true,
    is_default: true,
    ...overrides,
  }
}

function useTeamHarness(initialViews: View[] = []) {
  const [views, setViews] = useState(initialViews)
  const collaborative = useCollaborativeWorkspaceViews({
    workspaceKey: 'monitoring',
    migrationKey: 'team-view-migration-must-not-run',
    scope: 'team',
    teamId: 42,
    systemViewIds: SYSTEM_VIEW_IDS,
    currentViews: views,
    setCurrentViews: setViews,
    normalizeViews,
    sanitizeDefinition,
    activeViewId: null,
    currentDefinition: { groupBy: 'raw' },
  })
  return { views, collaborative }
}

describe('team collaborative workspace views', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('hydrates and mutates with explicit team scope without migrating local personal state', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ views: [teamRecord()] })
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(teamRecord({ id: 10, name: 'New shared', revision: 1 }))
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue(teamRecord({ name: 'Renamed shared', revision: 3 }))
    const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({ status: 'deleted', id: 9, revision: 3 })

    const { result } = renderHook(() => useTeamHarness([
      { id: 'legacy-local', name: 'Legacy local', config: { groupBy: 'raw' }, source: 'local' },
    ]))

    await waitFor(() => expect(result.current.collaborative.status).toBe('synced'))
    expect(get).toHaveBeenCalledWith('/api/v1/workspaces/monitoring/views?scope=team&team_id=42')
    expect(post).not.toHaveBeenCalled()
    expect(localStorage.getItem('team-view-migration-must-not-run')).toBeNull()
    expect(result.current.views.find((view) => view.id === '9')).toMatchObject({
      scope: 'team',
      teamId: 42,
      isFavorite: true,
      isDefault: true,
    })

    await act(async () => {
      const created = await result.current.collaborative.createView('New shared', { groupBy: 'severity' })
      expect(created.persisted).toBe(true)
    })
    expect(post).toHaveBeenCalledWith('/api/v1/workspaces/monitoring/views', expect.objectContaining({
      scope: 'team',
      team_id: 42,
    }))

    await act(async () => {
      const updated = await result.current.collaborative.updateView('9', 'Renamed shared', { groupBy: 'platform' })
      expect(updated.persisted).toBe(true)
    })
    expect(put).toHaveBeenCalledWith('/api/v1/workspaces/views/9', expect.objectContaining({
      scope: 'team',
      team_id: 42,
      revision: 2,
    }))

    await act(async () => {
      const deleted = await result.current.collaborative.deleteView('9')
      expect(deleted.persisted).toBe(true)
    })
    expect(del).toHaveBeenCalledWith('/api/v1/workspaces/views/9?revision=3')
  })

  it('never fabricates a local team view when the shared backend is offline', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue({ status: 0, data: { detail: 'offline' } })
    const post = vi.spyOn(apiClient, 'post').mockRejectedValue({ status: 0, data: { detail: 'offline' } })

    const { result } = renderHook(() => useTeamHarness())
    await waitFor(() => expect(result.current.collaborative.status).toBe('offline'))

    await act(async () => {
      const mutation = await result.current.collaborative.createView('Cannot fake share', { groupBy: 'status' })
      expect(mutation.persisted).toBe(false)
      expect(mutation.view).toBeUndefined()
    })
    expect(post).toHaveBeenCalledTimes(1)
    expect(result.current.views).toEqual([])
    expect(result.current.collaborative.status).toBe('offline')
  })
})
