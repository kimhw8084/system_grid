export const OPERATIONAL_GRID_AUTO_SIZE_STRATEGY = {
  type: 'fitCellContents' as const,
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
