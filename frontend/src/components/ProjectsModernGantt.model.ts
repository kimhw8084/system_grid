export type GanttDependencyType = 'FS' | 'SS' | 'FF' | 'SF'
export type GanttEdge = 'start' | 'finish'

export const GANTT_ROW_HEIGHT = 48
export const GANTT_RAIL_WIDTH = 360
export const GANTT_MAX_REALIZED_ROWS = 40
export const GANTT_MAX_CONNECTORS = 80
export const GANTT_MAX_TICKS = 64

export const ganttDependencyEdges = (type: GanttDependencyType): { source: GanttEdge; target: GanttEdge } => {
  if (type === 'SS') return { source: 'start', target: 'start' }
  if (type === 'FF') return { source: 'finish', target: 'finish' }
  if (type === 'SF') return { source: 'start', target: 'finish' }
  return { source: 'finish', target: 'start' }
}

export const ganttDependencyTypeForEdges = (source: GanttEdge, target: GanttEdge): GanttDependencyType => {
  if (source === 'start' && target === 'start') return 'SS'
  if (source === 'finish' && target === 'finish') return 'FF'
  if (source === 'start' && target === 'finish') return 'SF'
  return 'FS'
}

export const ganttWindow = (totalRows: number, scrollTop: number, viewportHeight: number, rowHeight = GANTT_ROW_HEIGHT, overscan = 6) => {
  const safeTotal = Math.max(0, Math.floor(totalRows || 0))
  if (!safeTotal) return { start: 0, end: 0, count: 0 }
  const visibleStart = Math.max(0, Math.floor(Math.max(0, scrollTop) / rowHeight))
  const visibleCount = Math.max(1, Math.ceil(Math.max(rowHeight, viewportHeight) / rowHeight))
  let start = Math.max(0, visibleStart - overscan)
  let end = Math.min(safeTotal, visibleStart + visibleCount + overscan)
  if (end - start > GANTT_MAX_REALIZED_ROWS) {
    const center = visibleStart + Math.floor(visibleCount / 2)
    start = Math.max(0, Math.min(safeTotal - GANTT_MAX_REALIZED_ROWS, center - Math.floor(GANTT_MAX_REALIZED_ROWS / 2)))
    end = Math.min(safeTotal, start + GANTT_MAX_REALIZED_ROWS)
  }
  return { start, end, count: end - start }
}

export const ganttVisibleOrdinals = (rangeStart: number, rangeEnd: number, scrollLeft: number, viewportWidth: number, pxPerDay: number, baseStep: number) => {
  const start = Math.max(rangeStart, rangeStart + Math.floor(Math.max(0, scrollLeft) / pxPerDay) - baseStep * 2)
  const end = Math.min(rangeEnd, rangeStart + Math.ceil((Math.max(0, scrollLeft) + Math.max(1, viewportWidth)) / pxPerDay) + baseStep * 2)
  const span = Math.max(1, end - start + 1)
  const nodeBudget = Math.max(1, Math.floor(GANTT_MAX_TICKS / 2))
  const minStep = Math.max(1, Math.ceil(span / nodeBudget))
  const step = Math.max(baseStep, minStep)
  const first = start - ((start - rangeStart) % step)
  const values: number[] = []
  for (let ordinal = Math.max(rangeStart, first); ordinal <= end && values.length < nodeBudget; ordinal += step) values.push(ordinal)
  return values
}

export const ganttOrthogonalPath = (x1: number, y1: number, x2: number, y2: number) => {
  const direction = x2 >= x1 ? 1 : -1
  const elbow = x1 + direction * Math.max(18, Math.min(72, Math.abs(x2 - x1) * 0.45))
  return `M ${x1} ${y1} H ${elbow} V ${y2} H ${x2}`
}

export const ganttRelationKey = (sourceId: string | number, targetId: string | number, type: GanttDependencyType, lagDays: number) => `${sourceId}:${targetId}:${type}:${Math.round(Number(lagDays) || 0)}`
