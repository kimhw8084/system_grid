import { describe, expect, it } from 'vitest'
import {
  buildProjectSavedViewMutationPayload,
  buildProjectSavedViewShareSearch,
  projectSavedViewConflictFromError,
  projectSavedViewLinkedRemoteId,
  projectSavedViewOptionLabel,
  projectSavedViewStateForSelection,
  projectSavedViewStatesEqual,
  reconcileProjectSavedViewOptions,
  removeProjectRemoteSavedViewPayload,
  resolveProjectCurrentTeamId,
  upsertProjectRemoteSavedViewPayload,
} from './ProjectsGolden.savedViews'

describe('Projects shared saved-view integration', () => {
  it('keeps personal hydration inert while preserving same-named legacy local views', () => {
    const local = [{ id: 'legacy-1', name: 'Daily Focus', search: 'local needle', view: 'tasks' }]
    const personal = { views: [{
      id: 41, workspace_key: 'projects', scope: 'personal', team_id: null, name: 'Daily Focus', schema_version: 1, revision: 3,
      definition: { searchTerm: 'remote needle', filters: { status: ['In Progress'], priority: ['High'], watch: ['watched'] }, activeTab: 'portfolio', mode: 'deadline' },
    }] }

    const options = reconcileProjectSavedViewOptions(local, personal)
    expect(options.map(projectSavedViewOptionLabel)).toEqual(['Daily Focus · Personal', 'Daily Focus · Local'])
    expect(local[0].search).toBe('local needle')
    expect(options[0].state.search).toBe('remote needle')
    expect(options[1].state.search).toBe('local needle')
  })

  it('reconciles only the authoritative current team and orders default/favorite metadata deterministically', () => {
    const personal = { views: [
      { id: 1, workspace_key: 'projects', scope: 'personal', team_id: null, name: 'Plain', schema_version: 1, revision: 1, definition: { activeTab: 'overview' } },
      { id: 2, workspace_key: 'projects', scope: 'personal', team_id: null, name: 'Favorite', is_favorite: true, schema_version: 1, revision: 1, definition: { activeTab: 'overview' } },
      { id: 3, workspace_key: 'projects', scope: 'personal', team_id: null, name: 'Default', is_default: true, schema_version: 1, revision: 1, definition: { activeTab: 'overview' } },
    ] }
    const team = { views: [
      { id: 10, workspace_key: 'projects', scope: 'team', team_id: 42, name: 'Team Lens', schema_version: 1, revision: 2, definition: { activeTab: 'reports' } },
      { id: 11, workspace_key: 'projects', scope: 'team', team_id: 99, name: 'Other Team', schema_version: 1, revision: 2, definition: { activeTab: 'tasks' } },
    ] }
    const options = reconcileProjectSavedViewOptions([{ id: 'l', name: 'Legacy', view: 'tasks' }], personal, team, 42)
    expect(options.map(projectSavedViewOptionLabel)).toEqual([
      'Default · Personal · Default',
      'Favorite · Personal · Favorite',
      'Plain · Personal',
      'Team Lens · Team',
      'Legacy · Local',
    ])
    expect(options.some((option) => option.name === 'Other Team')).toBe(false)
  })

  it('bounds malformed remote rows through the accepted Projects workspace adapter', () => {
    const options = reconcileProjectSavedViewOptions([], { views: [
      { id: 5, workspace_key: 'projects', scope: 'personal', team_id: null, name: '  Remote   Lens  ', schema_version: 1, revision: 2,
        definition: { searchTerm: '  needle  ', filters: { status: ['Blocked', 'Planning'], priority: ['Highest'], watch: ['watched', 'other'] }, activeTab: 'not-a-tab', mode: 'not-a-mode', unsupported: 'ignored' } },
      { id: 6, workspace_key: 'projects', scope: 'team', team_id: null, name: 'Bad team', schema_version: 1, revision: 1, definition: { activeTab: 'tasks' } },
    ] })
    expect(options).toHaveLength(1)
    expect(options[0]).toMatchObject({ id: 'remote:5', name: 'Remote Lens', scope: 'personal', remoteId: 5, revision: 2 })
    expect(options[0].state).toEqual({ search: 'needle', statusFilter: 'Blocked', priorityFilter: 'Highest', sortMode: 'order', watchedOnly: true, view: 'overview' })
  })

  it('drops unusable remote rows and leaves local fallback selectable', () => {
    const options = reconcileProjectSavedViewOptions([{ id: 'local-7', name: 'Local Fallback', search: 'fallback', view: 'tasks' }], { views: [
      { id: 0, workspace_key: 'projects', name: 'Bad id', schema_version: 1, revision: 1, definition: { activeTab: 'board' } },
      { id: 8, workspace_key: 'projects', name: 'Bad schema', schema_version: 2, revision: 1, definition: { activeTab: 'board' } },
      { id: 9, workspace_key: 'projects', name: 'Bad definition', schema_version: 1, revision: 1, definition: [] },
      { id: 10, workspace_key: 'other', name: 'Wrong workspace', schema_version: 1, revision: 1, definition: { activeTab: 'board' } },
      { id: 11, workspace_key: 'projects', name: 'Missing revision', schema_version: 1, definition: { activeTab: 'board' } },
    ] })
    expect(options).toHaveLength(1)
    expect(options[0].source).toBe('local')
    expect(projectSavedViewStateForSelection(options, options[0].id)?.search).toBe('fallback')
  })

  it('builds normalized personal and team mutation payloads without changing scope on update', () => {
    const state = { search: '  needle  ', statusFilter: 'all', priorityFilter: 'Highest', sortMode: 'DEADLINE', watchedOnly: true, view: 'reports' }
    expect(buildProjectSavedViewMutationPayload('  Release   Lens  ', state, 7)).toMatchObject({ name: 'Release Lens', scope: 'personal', team_id: null, revision: 7 })
    expect(buildProjectSavedViewMutationPayload(' Team Lens ', state, 4, 'team', 42)).toMatchObject({ name: 'Team Lens', scope: 'team', team_id: 42, revision: 4 })
    expect((buildProjectSavedViewMutationPayload('Team Lens', state, undefined, 'team', 42) as any).definition).toEqual({
      searchTerm: 'needle', filters: { status: [], priority: ['Highest'], watch: ['watched'] }, activeTab: 'reports', mode: 'deadline',
    })
  })

  it('tracks dirty state only across normalized Project saved-view fields', () => {
    expect(projectSavedViewStatesEqual(
      { search: ' needle ', statusFilter: 'all', priorityFilter: 'ALL', sortMode: 'ORDER', watchedOnly: false, view: 'overview' },
      { search: 'needle', statusFilter: 'ALL', priorityFilter: 'ALL', sortMode: 'order', watchedOnly: false, view: 'overview' },
    )).toBe(true)
    expect(projectSavedViewStatesEqual(
      { search: 'needle', statusFilter: 'ALL', priorityFilter: 'ALL', sortMode: 'order', watchedOnly: false, view: 'overview' },
      { search: 'changed', statusFilter: 'ALL', priorityFilter: 'ALL', sortMode: 'order', watchedOnly: false, view: 'overview' },
    )).toBe(false)
  })

  it('parses personal and team stale-revision conflicts without applying server state automatically', () => {
    const conflict = projectSavedViewConflictFromError({ status: 409, data: { detail: { message: 'Saved view changed on the server.', current: {
      id: 22, workspace_key: 'projects', scope: 'team', team_id: 42, name: 'Server Focus', schema_version: 1, revision: 4,
      definition: { searchTerm: ' server newer ', filters: { status: ['Blocked'], priority: [], watch: [] }, activeTab: 'tasks', mode: 'health' },
    } } } })
    expect(conflict?.message).toBe('Saved view changed on the server.')
    expect(conflict?.option).toMatchObject({ id: 'remote:22', name: 'Server Focus', scope: 'team', teamId: 42, revision: 4 })
    expect(conflict?.option.state.search).toBe('server newer')
  })

  it('resolves only the current operator primary team id', () => {
    expect(resolveProjectCurrentTeamId([{ username: 'admin_root', team_id: 42 }, { username: 'other', team_id: 99 }], 'admin_root')).toBe(42)
    expect(resolveProjectCurrentTeamId([{ username: 'admin_root', team_id: null }], 'admin_root')).toBeNull()
    expect(resolveProjectCurrentTeamId([{ username: 'other', team_id: 99 }], 'admin_root')).toBeNull()
  })

  it('builds collision-safe saved_view links while preserving Project route/deep-link params', () => {
    expect(projectSavedViewLinkedRemoteId('41')).toBe(41)
    expect(projectSavedViewLinkedRemoteId('nope')).toBeNull()
    const params = new URLSearchParams(buildProjectSavedViewShareSearch('view=reports&id=7&report=22&section=review', 41))
    expect(Object.fromEntries(params.entries())).toEqual({ view: 'reports', id: '7', report: '22', section: 'review', saved_view: '41' })
  })

  it('updates remote caches deterministically without touching local saved-view storage', () => {
    const payload = { views: [{ id: 1, workspace_key: 'projects', scope: 'personal', team_id: null, name: 'Old', schema_version: 1, revision: 1, definition: { activeTab: 'overview' } }] }
    const replacement = { id: 1, workspace_key: 'projects', scope: 'personal', team_id: null, name: 'Updated', schema_version: 1, revision: 2, definition: { activeTab: 'tasks' } }
    const inserted = { id: 2, workspace_key: 'projects', scope: 'personal', team_id: null, name: 'New', schema_version: 1, revision: 1, definition: { activeTab: 'board' } }
    expect((upsertProjectRemoteSavedViewPayload(payload, replacement) as any).views.map((row: any) => [row.id, row.name])).toEqual([[1, 'Updated']])
    const withNew = upsertProjectRemoteSavedViewPayload(payload, inserted) as any
    expect(withNew.views.map((row: any) => row.id)).toEqual([2, 1])
    expect((removeProjectRemoteSavedViewPayload(withNew, 2) as any).views.map((row: any) => row.id)).toEqual([1])
  })
})
