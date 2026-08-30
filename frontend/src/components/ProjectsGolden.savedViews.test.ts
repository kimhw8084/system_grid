import { describe, expect, it } from 'vitest'
import {
  buildProjectSavedViewMutationPayload,
  projectSavedViewConflictFromError,
  projectSavedViewStateForSelection,
  projectSavedViewStatesEqual,
  reconcileProjectSavedViewOptions,
  removeProjectRemoteSavedViewPayload,
  upsertProjectRemoteSavedViewPayload,
} from './ProjectsGolden.savedViews'

describe('Projects shared saved-view hydration', () => {
  it('keeps remote hydration inert while preserving same-named legacy local views', () => {
    const local = [{
      id: 'legacy-1',
      name: 'Daily Focus',
      search: 'local needle',
      statusFilter: 'Planning',
      priorityFilter: 'Medium',
      sortMode: 'health',
      watchedOnly: false,
      view: 'tasks',
    }]
    const remote = {
      views: [{
        id: 41,
        workspace_key: 'projects',
        scope: 'personal',
        team_id: null,
        name: 'Daily Focus',
        schema_version: 1,
        revision: 3,
        definition: {
          searchTerm: 'remote needle',
          filters: { status: ['In Progress'], priority: ['High'], watch: ['watched'] },
          activeTab: 'portfolio',
          mode: 'deadline',
        },
      }],
    }

    const options = reconcileProjectSavedViewOptions(local, remote)
    expect(options.map((option) => [option.source, option.name])).toEqual([
      ['remote', 'Daily Focus'],
      ['local', 'Daily Focus'],
    ])
    expect(local[0].search).toBe('local needle')
    expect(options[0].state.search).toBe('remote needle')
    expect(options[1].state.search).toBe('local needle')
  })

  it('bounds remote values through the accepted Projects workspace adapter', () => {
    const options = reconcileProjectSavedViewOptions([], {
      views: [{
        id: 5,
        workspace_key: 'projects',
        scope: 'personal',
        team_id: null,
        name: '  Remote   Lens  ',
        schema_version: 1,
        revision: 2,
        definition: {
          searchTerm: '  needle  ',
          filters: { status: ['Blocked', 'Planning'], priority: ['Highest'], watch: ['watched', 'other'] },
          activeTab: 'not-a-tab',
          mode: 'not-a-mode',
          unsupported: 'ignored',
        },
      }],
    })

    expect(options).toHaveLength(1)
    expect(options[0]).toMatchObject({ id: 'remote:5', name: 'Remote Lens', source: 'remote', remoteId: 5, revision: 2 })
    expect(options[0].state).toEqual({
      search: 'needle',
      statusFilter: 'Blocked',
      priorityFilter: 'Highest',
      sortMode: 'order',
      watchedOnly: true,
      view: 'overview',
    })
  })

  it('drops unusable remote rows and leaves local fallback selectable', () => {
    const options = reconcileProjectSavedViewOptions([
      { id: 'local-7', name: 'Local Fallback', search: 'fallback', view: 'tasks' },
    ], {
      views: [
        { id: 0, workspace_key: 'projects', name: 'Bad id', schema_version: 1, revision: 1, definition: { activeTab: 'board' } },
        { id: 8, workspace_key: 'projects', name: 'Bad schema', schema_version: 2, revision: 1, definition: { activeTab: 'board' } },
        { id: 9, workspace_key: 'projects', name: 'Bad definition', schema_version: 1, revision: 1, definition: [] },
        { id: 10, workspace_key: 'other', name: 'Wrong workspace', schema_version: 1, revision: 1, definition: { activeTab: 'board' } },
        { id: 11, workspace_key: 'projects', name: 'Missing revision', schema_version: 1, definition: { activeTab: 'board' } },
      ],
    })

    expect(options).toHaveLength(1)
    expect(options[0].source).toBe('local')
    expect(projectSavedViewStateForSelection(options, options[0].id)?.search).toBe('fallback')
    expect(projectSavedViewStateForSelection(options, 'remote:missing')).toBeNull()
  })

  it('builds an explicit personal write payload from the normalized current Project lens', () => {
    expect(buildProjectSavedViewMutationPayload('  Release   Lens  ', {
      search: '  needle  ',
      statusFilter: 'all',
      priorityFilter: 'Highest',
      sortMode: 'DEADLINE',
      watchedOnly: true,
      view: 'reports',
    }, 7)).toEqual({
      name: 'Release Lens',
      scope: 'personal',
      team_id: null,
      definition: {
        searchTerm: 'needle',
        filters: { status: [], priority: ['Highest'], watch: ['watched'] },
        activeTab: 'reports',
        mode: 'deadline',
      },
      schema_version: 1,
      revision: 7,
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

  it('parses a stale-revision conflict without applying the server copy automatically', () => {
    const conflict = projectSavedViewConflictFromError({
      status: 409,
      data: {
        detail: {
          message: 'Saved view changed on the server.',
          current: {
            id: 22,
            workspace_key: 'projects',
            scope: 'personal',
            team_id: null,
            name: 'Server Focus',
            schema_version: 1,
            revision: 4,
            definition: {
              searchTerm: ' server newer ',
              filters: { status: ['Blocked'], priority: [], watch: [] },
              activeTab: 'tasks',
              mode: 'health',
            },
          },
        },
      },
    })

    expect(conflict?.message).toBe('Saved view changed on the server.')
    expect(conflict?.option).toMatchObject({ id: 'remote:22', name: 'Server Focus', revision: 4 })
    expect(conflict?.option.state).toEqual({
      search: 'server newer',
      statusFilter: 'Blocked',
      priorityFilter: 'ALL',
      sortMode: 'health',
      watchedOnly: false,
      view: 'tasks',
    })
  })

  it('updates the remote cache deterministically without touching local saved-view storage', () => {
    const payload = {
      views: [{ id: 1, workspace_key: 'projects', scope: 'personal', team_id: null, name: 'Old', schema_version: 1, revision: 1, definition: { activeTab: 'overview' } }],
    }
    const replacement = { id: 1, workspace_key: 'projects', scope: 'personal', team_id: null, name: 'Updated', schema_version: 1, revision: 2, definition: { activeTab: 'tasks' } }
    const inserted = { id: 2, workspace_key: 'projects', scope: 'personal', team_id: null, name: 'New', schema_version: 1, revision: 1, definition: { activeTab: 'board' } }

    expect((upsertProjectRemoteSavedViewPayload(payload, replacement) as any).views.map((row: any) => [row.id, row.name])).toEqual([[1, 'Updated']])
    const withNew = upsertProjectRemoteSavedViewPayload(payload, inserted) as any
    expect(withNew.views.map((row: any) => row.id)).toEqual([2, 1])
    expect((removeProjectRemoteSavedViewPayload(withNew, 2) as any).views.map((row: any) => row.id)).toEqual([1])
  })
})
