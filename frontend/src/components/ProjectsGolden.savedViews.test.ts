import { describe, expect, it } from 'vitest'
import {
  projectSavedViewStateForSelection,
  reconcileProjectSavedViewOptions,
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
        { id: 0, workspace_key: 'projects', name: 'Bad id', schema_version: 1, definition: { activeTab: 'board' } },
        { id: 8, workspace_key: 'projects', name: 'Bad schema', schema_version: 2, definition: { activeTab: 'board' } },
        { id: 9, workspace_key: 'projects', name: 'Bad definition', schema_version: 1, definition: [] },
        { id: 10, workspace_key: 'other', name: 'Wrong workspace', schema_version: 1, definition: { activeTab: 'board' } },
      ],
    })

    expect(options).toHaveLength(1)
    expect(options[0].source).toBe('local')
    expect(projectSavedViewStateForSelection(options, options[0].id)?.search).toBe('fallback')
    expect(projectSavedViewStateForSelection(options, 'remote:missing')).toBeNull()
  })
})
