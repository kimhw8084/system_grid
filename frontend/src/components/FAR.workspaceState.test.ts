import { describe, expect, it } from 'vitest'
import {
  FAR_PERSISTED_COLUMN_IDS,
  normalizeFarSavedViews,
  sanitizeFarWorkspaceViewConfig,
} from './FAR.workspaceState'

describe('FAR golden workspace view state', () => {
  it('preserves golden display, filter, sort, and system-filter state while rejecting unknown columns', () => {
    const result = sanitizeFarWorkspaceViewConfig({
      fontSize: 99,
      rowDensity: -5,
      hiddenColumns: ['rpn', 'unknown', 'rpn'],
      quickFilter: '  thermal risk  ',
      quickFilters: { system_name: ['Core', 'Core', '', 4] },
      filterModel: {
        status: { filterType: 'text', filter: 'Analyzing' },
        not_a_column: { filterType: 'text', filter: 'drop' },
      },
      sortModel: [
        { colId: 'rpn', sort: 'desc' },
        { colId: 'missing', sort: 'asc' },
      ],
      columnLayoutState: [
        { colId: 'title', width: 320, pinned: 'left' },
        { colId: 'missing', width: 900 },
      ],
    })

    expect(result.fontSize).toBe(14)
    expect(result.rowDensity).toBe(0)
    expect(result.hiddenColumns).toEqual(['rpn'])
    expect(result.quickFilter).toBe('thermal risk')
    expect(result.quickFilters).toEqual({ system_name: ['Core'] })
    expect(Object.keys(result.filterModel)).toEqual(['status'])
    expect(result.sortModel).toEqual([{ colId: 'rpn', sort: 'desc' }])
    expect(result.columnLayoutState).toEqual([
      expect.objectContaining({ colId: 'title', width: 320, pinned: 'left' }),
    ])
    expect(FAR_PERSISTED_COLUMN_IDS.has('linked_rcas')).toBe(true)
  })

  it('normalizes collaborative FAR views without duplicating ids', () => {
    const result = normalizeFarSavedViews([
      { id: '17', name: ' High risk ', config: { rpn: 1 } as any, source: 'remote' },
      { id: '17', name: 'Duplicate', config: {} as any, source: 'remote' },
      { id: 'local-1', name: ' Local fallback ', config: { hiddenColumns: ['status'] } as any, source: 'local' },
    ])

    expect(result.map((view) => [view.id, view.name])).toEqual([
      ['17', 'High risk'],
      ['local-1', 'Local fallback'],
    ])
    expect(result[1].config.hiddenColumns).toEqual(['status'])
  })
})
