import { describe, expect, it } from 'vitest'
import { GANTT_MAX_REALIZED_ROWS, GANTT_MAX_TICKS, ganttDependencyEdges, ganttDependencyTypeForEdges, ganttOrthogonalPath, ganttVisibleOrdinals, ganttWindow } from './ProjectsModernGantt.model'

describe('Projects modern Gantt geometry', () => {
  it('maps all dependency endpoint semantics losslessly', () => {
    for (const type of ['FS','SS','FF','SF'] as const) {
      const edges = ganttDependencyEdges(type)
      expect(ganttDependencyTypeForEdges(edges.source, edges.target)).toBe(type)
    }
  })
  it('bounds realized rows for P10-scale schedules', () => {
    expect(ganttWindow(120, 2200, 1080).count).toBeLessThanOrEqual(GANTT_MAX_REALIZED_ROWS)
    expect(ganttWindow(120, 0, 720).count).toBeLessThanOrEqual(GANTT_MAX_REALIZED_ROWS)
  })
  it('bounds time ticks independent of project span', () => {
    expect(ganttVisibleOrdinals(20000, 24000, 0, 1920, 2.2, 90).length).toBeLessThanOrEqual(GANTT_MAX_TICKS)
    expect(ganttVisibleOrdinals(20000, 24000, 18000, 1920, 28, 1).length).toBeLessThanOrEqual(GANTT_MAX_TICKS)
  })
  it('produces orthogonal elbow paths', () => {
    const path = ganttOrthogonalPath(10, 20, 120, 90)
    expect(path).toMatch(/^M 10 20 H /)
    expect(path).toContain(' V 90 H 120')
  })
})
