import { describe, expect, it } from 'vitest'
import { GANTT_COMPACT_RAIL_WIDTH, GANTT_MAX_REALIZED_ROWS, GANTT_MAX_TICKS, GANTT_PX_PER_DAY, GANTT_RAIL_KEY_STEP, GANTT_RAIL_MAX, GANTT_RAIL_MIN, GANTT_RAIL_WIDTH, ganttDependencyEdges, ganttDependencyTypeForEdges, ganttOrthogonalPath, ganttVisibleOrdinals, ganttWindow } from './ProjectsModernGantt.model'

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
  it('keeps the first row realized when a content-sized host reports the whole canvas height', () => {
    const window = ganttWindow(120, 0, 120 * 48)
    expect(window).toEqual({ start: 0, end: GANTT_MAX_REALIZED_ROWS, count: GANTT_MAX_REALIZED_ROWS })
  })
  it('retains an offscreen focused row without exceeding the DOM budget', () => {
    const window = ganttWindow(1000, 0, 720, 48, 6, 777)
    expect(window.start).toBeLessThanOrEqual(777)
    expect(window.end).toBeGreaterThan(777)
    expect(window.count).toBeLessThanOrEqual(GANTT_MAX_REALIZED_ROWS)
  })
  it('locks the PV1 scale and WBS rail geometry contract', () => {
    expect(GANTT_PX_PER_DAY).toEqual({ day: 32, week: 16, month: 6, quarter: 3 })
    expect([GANTT_RAIL_WIDTH, GANTT_RAIL_MIN, GANTT_RAIL_MAX, GANTT_RAIL_KEY_STEP, GANTT_COMPACT_RAIL_WIDTH]).toEqual([320, 240, 480, 16, 200])
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
