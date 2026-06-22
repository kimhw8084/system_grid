export const OPERATIONAL_GRID_AUTO_SIZE_STRATEGY = {
  type: 'fitCellContents' as const,
}

export const normalizeOperationalColumnLayout = (layout: any[], preserveWidths: boolean) =>
  (layout || []).map((column: any) => ({
    colId: column.colId,
    hide: column.hide,
    pinned: column.pinned,
    sort: column.sort,
    sortIndex: column.sortIndex,
    ...(preserveWidths ? { width: column.width, flex: column.flex } : {})
  }))

export const getOperationalColumnLayoutSnapshot = (
  api: { getColumnState?: () => any[] } | null | undefined,
  preserveWidths: boolean
) => {
  if (!api?.getColumnState) return []
  return normalizeOperationalColumnLayout(api.getColumnState(), preserveWidths)
}

export const applyOperationalColumnState = (
  api: { applyColumnState?: (config: any) => void } | null | undefined,
  layout: any[],
  preserveWidths: boolean
) => {
  if (!api || !layout?.length || !api.applyColumnState) return
  api.applyColumnState({
    state: normalizeOperationalColumnLayout(layout, preserveWidths),
    applyOrder: true,
    defaultState: { sort: null }
  })
}

export const autoSizeOperationalColumns = ({
  api,
  skipColumnIds = [],
  onSized,
}: {
  api: {
    getAllDisplayedColumns?: () => Array<{ getColId: () => string; getColDef?: () => Record<string, any> }>
    autoSizeColumns?: (keys: string[], skipHeader?: boolean) => void
  } | null | undefined
  skipColumnIds?: string[]
  onSized?: () => void
}) => {
  if (!api?.getAllDisplayedColumns || !api.autoSizeColumns) return
  const columnIds = api
    .getAllDisplayedColumns()
    .filter((column) => !column.getColDef?.()?.operationalSkipAutoSize)
    .map((column) => column.getColId())
    .filter((colId) => !skipColumnIds.includes(colId))

  if (!columnIds.length) return

  const run = () => {
    api.autoSizeColumns?.(columnIds, false)
    onSized?.()
  }

  requestAnimationFrame(() => {
    run()
    window.setTimeout(run, 32)
  })
}

export const applyOperationalColumnSizing = (
  column: Record<string, any>,
  layout: Record<string, any> | undefined,
  preserveExplicitWidths: boolean
) => {
  const nextColumn: Record<string, any> = { ...column }

  if (nextColumn.width !== undefined) {
    nextColumn.initialWidth = nextColumn.width
    if (!preserveExplicitWidths) delete nextColumn.width
  }

  if (nextColumn.flex !== undefined) {
    nextColumn.initialFlex = nextColumn.flex
    if (!preserveExplicitWidths) delete nextColumn.flex
  }

  if (!layout) return nextColumn

  nextColumn.pinned = layout.pinned ?? nextColumn.pinned
  if (nextColumn.hide === undefined) {
    nextColumn.hide = layout.hide
  }

  if (preserveExplicitWidths) {
    const layoutWidth = layout.width ?? nextColumn.width
    if (typeof layoutWidth === 'number') {
      const minWidth = typeof nextColumn.minWidth === 'number' ? nextColumn.minWidth : layoutWidth
      const maxWidth = typeof nextColumn.maxWidth === 'number' ? nextColumn.maxWidth : layoutWidth
      nextColumn.width = Math.min(Math.max(layoutWidth, minWidth), maxWidth)
    } else {
      nextColumn.width = layoutWidth
    }
    nextColumn.flex = layout.flex ?? nextColumn.flex
  }

  return nextColumn
}

export const sanitizeOperationalColumnLayout = (
  layout: any[],
  allowedColumnIds: Iterable<string>,
  preserveWidths: boolean
) => {
  const allowed = new Set(Array.from(allowedColumnIds))
  return normalizeOperationalColumnLayout(
    (layout || []).filter((column: any) => typeof column?.colId === 'string' && allowed.has(column.colId)),
    preserveWidths
  )
}

export const sanitizeOperationalFilterModel = (
  filterModel: Record<string, any> | null | undefined,
  allowedColumnIds: Iterable<string>
) => {
  const allowed = new Set(Array.from(allowedColumnIds))
  const entries = Object.entries(filterModel || {}).filter(([key]) => allowed.has(key))
  return Object.fromEntries(entries)
}

export const sanitizeOperationalSortModel = (
  sortModel: Array<{ colId?: string; sort?: string }> | null | undefined,
  allowedColumnIds: Iterable<string>
) => {
  const allowed = new Set(Array.from(allowedColumnIds))
  return (Array.isArray(sortModel) ? sortModel : []).filter((entry: any) => (
    typeof entry?.colId === 'string' &&
    allowed.has(entry.colId) &&
    (entry.sort === 'asc' || entry.sort === 'desc')
  )).map((entry: any) => ({
    colId: entry.colId,
    sort: entry.sort,
  }))
}
