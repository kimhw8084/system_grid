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
    nextColumn.width = layout.width ?? nextColumn.width
    nextColumn.flex = layout.flex ?? nextColumn.flex
  }

  return nextColumn
}
