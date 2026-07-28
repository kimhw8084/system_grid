import { describe, expect, it } from 'vitest'
import {
  buildWorkspaceViewLink,
  canonicalizeWorkspaceDefinition,
  isRemoteWorkspaceViewId,
  mapWorkspaceViewRecord,
  mergeCollaborativeViews,
  normalizeWorkspaceValue,
  parseWorkspaceViewConflict,
  isWorkspaceViewOfflineError,
  workspaceViewErrorMessage,
  readWorkspaceViewId,
  workspaceDefinitionsEqual,
  type CollaborativeSavedView,
} from './CollaborativeWorkspaceViews'

type View = CollaborativeSavedView<Record<string, unknown>>

const normalizeViews = (views: View[]) => {
  const byId = new Map<string, View>()
  views.forEach((view) => byId.set(view.id, view))
  return Array.from(byId.values())
}

describe('CollaborativeWorkspaceViews contracts', () => {
  it('normalizes object key order for semantic dirty-state comparison', () => {
    expect(normalizeWorkspaceValue({ b: 2, a: { z: 1, y: [2, 3] } })).toEqual({ a: { y: [2, 3], z: 1 }, b: 2 })
    expect(workspaceDefinitionsEqual(
      { quickFilters: { status: ['Existing'] }, groupBy: 'status' },
      { groupBy: 'status', quickFilters: { status: ['Existing'] } },
    )).toBe(true)
    expect(workspaceDefinitionsEqual({ groupBy: 'status' }, { groupBy: 'platform' })).toBe(false)
  })

  it('canonicalizes column layout exactly like the backend saved-view contract', () => {
    const raw = {
      groupBy: 'raw',
      columnLayoutState: [
        { colId: 'status', hide: false, pinned: null, width: 131.9, flex: 1, sort: null, sortIndex: 0 },
        { colId: 'title', hide: false, pinned: 'left', width: 240, sort: 'asc', sortIndex: 1 },
      ],
    }
    const canonical = canonicalizeWorkspaceDefinition(raw)
    expect(canonical).toEqual({
      groupBy: 'raw',
      columnLayoutState: [
        { colId: 'status', hide: false, pinned: null, width: 131 },
        { colId: 'title', hide: false, pinned: 'left', width: 240, sort: 'asc' },
      ],
    })
    expect(canonicalizeWorkspaceDefinition(canonical)).toEqual(canonical)
  })

  it('preserves system and local-only views while replacing remote state', () => {
    const current: View[] = [
      { id: 'core', name: 'Core', config: {}, source: 'system' },
      { id: 'local-1', name: 'Offline', config: { groupBy: 'status' }, source: 'local' },
      { id: '9', name: 'Old remote', config: {}, source: 'remote', revision: 1 },
    ]
    const remote: View[] = [
      { id: '10', name: 'Server', config: { groupBy: 'platform' }, source: 'remote', revision: 2 },
    ]
    const merged = mergeCollaborativeViews(current, remote, new Set(['core']), normalizeViews)
    expect(merged.map((view) => view.id)).toEqual(['core', '10', 'local-1'])
  })

  it('maps API records and parses optimistic-concurrency conflicts', () => {
    const record = {
      id: 4,
      workspace_key: 'monitoring',
      name: 'Critical',
      scope: 'personal' as const,
      owner_user_id: 'admin_root',
      team_id: null,
      definition: { groupBy: 'severity' },
      schema_version: 1,
      revision: 3,
    }
    expect(mapWorkspaceViewRecord(record)).toMatchObject({ id: '4', revision: 3, source: 'remote' })
    expect(parseWorkspaceViewConflict({ status: 409, data: { detail: { message: 'changed', current: record } } })).toEqual({
      message: 'changed',
      current: expect.objectContaining({ id: '4', revision: 3 }),
    })
    expect(parseWorkspaceViewConflict({ status: 500 })).toBeNull()
  })

  it('builds and reads stable view links without removing record deep links', () => {
    const link = buildWorkspaceViewLink('https://sysgrid.example/monitoring?id=77', '12')
    const url = new URL(link)
    expect(url.searchParams.get('id')).toBe('77')
    expect(url.searchParams.get('view')).toBe('12')
    expect(readWorkspaceViewId(link)).toBe('12')
    expect(buildWorkspaceViewLink(link, null)).toBe('https://sysgrid.example/monitoring?id=77')
  })

  it('classifies offline failures separately from validation errors', () => {
    expect(isWorkspaceViewOfflineError({ status: 0 })).toBe(true)
    expect(isWorkspaceViewOfflineError({ status: 503 })).toBe(true)
    expect(isWorkspaceViewOfflineError({ status: 409 })).toBe(false)
    expect(workspaceViewErrorMessage({ data: { detail: 'duplicate name' } })).toBe('duplicate name')
  })

  it('recognizes server IDs without misclassifying local and system IDs', () => {
    expect(isRemoteWorkspaceViewId('42')).toBe(true)
    expect(isRemoteWorkspaceViewId('local-42')).toBe(false)
    expect(isRemoteWorkspaceViewId('core')).toBe(false)
  })
})
