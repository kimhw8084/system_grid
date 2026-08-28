import { describe, expect, it } from 'vitest'
import {
  FAR_GOLDEN_TOOLBAR_EXTENSION_ALLOWLIST,
  FAR_PRIMARY_TOOLBAR_COMMAND_ORDER,
  GOLDEN_ACTIVITY_COLUMNS_TITLES,
  GOLDEN_PRIMARY_TOOLBAR_ACTIONS,
  GOLDEN_PRIMARY_TOOLBAR_COMMAND_ORDER,
  GOLDEN_PRIMARY_TOOLBAR_CONTROL_GROUPS,
  isGoldenActivityColumnsTitle,
} from './OperationalGoldenToolbarContract'
import { createOperationalUtilityColumns } from './OperationalGridStandard'

const noop = () => undefined

const buildUtilityColumns = (itemLabel: string) => createOperationalUtilityColumns({
  includeRecentChange: true,
  includeFavorite: true,
  includeWatch: true,
  isIntelligenceExpanded: true,
  isRecentChange: () => false,
  onToggleFavorite: noop,
  onToggleWatch: noop,
  itemLabel,
})

describe('Monitoring-golden toolbar and grid-action contract', () => {
  it('locks the shared primary toolbar inventory, ordering, and grouping', () => {
    expect(GOLDEN_PRIMARY_TOOLBAR_CONTROL_GROUPS).toEqual([
      ['views', 'display', 'export', 'copy', 'registry'],
      ['import', 'filters', 'activity'],
    ])
    expect(GOLDEN_PRIMARY_TOOLBAR_ACTIONS).toEqual(['compare', 'bulk', 'add'])
    expect(GOLDEN_PRIMARY_TOOLBAR_COMMAND_ORDER).toEqual([
      'views', 'display', 'export', 'copy', 'registry',
      'import', 'filters', 'activity',
      'compare', 'bulk', 'add',
    ])
    expect(FAR_PRIMARY_TOOLBAR_COMMAND_ORDER).toEqual(GOLDEN_PRIMARY_TOOLBAR_COMMAND_ORDER)
  })

  it('keeps FAR-only capabilities outside the primary golden command inventory', () => {
    const extensions = Object.values(FAR_GOLDEN_TOOLBAR_EXTENSION_ALLOWLIST)
    expect(extensions.map((entry) => entry.id)).toEqual([
      'far.reset-layout',
      'far.round-trip-export',
      'far.insights',
      'far.activity-summary',
      'far.rpn-help',
      'far.restore-archived',
    ])
    expect(extensions.every((entry) => !GOLDEN_PRIMARY_TOOLBAR_COMMAND_ORDER.includes(entry.id as any))).toBe(true)
    expect(extensions.slice(0, 5).every((entry) => entry.surface === 'far-tools')).toBe(true)
    expect(FAR_GOLDEN_TOOLBAR_EXTENSION_ALLOWLIST.restoreArchived.surface).toBe('lifecycle-toolbar-extension')
  })

  it('canonicalizes the shared Activity-columns command irrespective of historical label casing', () => {
    expect(isGoldenActivityColumnsTitle(GOLDEN_ACTIVITY_COLUMNS_TITLES.show)).toBe(true)
    expect(isGoldenActivityColumnsTitle(GOLDEN_ACTIVITY_COLUMNS_TITLES.hide)).toBe(true)
    expect(isGoldenActivityColumnsTitle('show activity columns')).toBe(true)
    expect(isGoldenActivityColumnsTitle('Reliability insights')).toBe(false)
  })

  it('keeps Monitoring and FAR Fav/Watch/Chg utility columns on one shared renderer contract', () => {
    const monitoring = buildUtilityColumns('monitor')
    const far = buildUtilityColumns('failure mode')
    const summarize = (columns: any[]) => columns.map((column) => ({
      colId: column.colId,
      headerName: column.headerName,
      width: column.width,
      minWidth: column.minWidth,
      maxWidth: column.maxWidth,
      pinned: column.pinned,
      lockVisible: column.lockVisible,
      resizable: column.resizable,
      sortable: column.sortable,
      filter: column.filter,
      cellClass: column.cellClass,
      headerClass: column.headerClass,
    }))

    expect(summarize(far)).toEqual(summarize(monitoring))
    expect(far.map((column: any) => column.colId)).toEqual(['select', 'id', 'recent_change', 'favorite', 'watch'])
    expect(far.map((column: any) => column.headerName)).toEqual(['', 'ID', 'Chg', 'Fav', 'Watch'])
  })
})
