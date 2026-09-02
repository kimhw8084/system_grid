import { describe, expect, it } from 'vitest'
import {
  analyzeProjectSchedule,
  applyProjectScheduleScenario,
  buildProjectCapacityView,
  captureProjectScheduleBaselineV2,
  compareProjectScheduleBaseline,
  getProjectScheduleState,
  normalizeProjectTaskDependencies,
  projectOrdinalDate,
  saveProjectScheduleScenario,
  setProjectTaskConstraint,
  setProjectWorkingDays,
  setTypedProjectDependency,
  simulateNamedProjectScenario,
  wouldCreateTypedDependencyCycle,
} from './ProjectsSchedulingCompletion.model'

const task = (id: number, start = '2026-01-05', end = start, dependencies_json: any[] = [], extra: any = {}) => ({ id, name: `Task ${id}`, status: 'In Progress', owner: 'Owner A', start_date: start, end_date: end, dependencies_json, metadata_json: {}, ...extra })
const project = (tasks: any[], metadata_json: any = {}) => ({ id: 38, name: 'OUT-38 proof', start_date: '2026-01-05', metadata_json, tasks })
const row = (analysis: ReturnType<typeof analyzeProjectSchedule>, id: number) => analysis.rows.find((item) => item.id === String(id))!

describe('OUT-38 scheduling completion', () => {
  it('normalizes legacy predecessor IDs as FS +0 without migration loss', () => {
    const p = project([task(1, '2026-01-05', '2026-01-06'), task(2, '2026-01-05', '2026-01-06', [1])])
    expect(normalizeProjectTaskDependencies(p.tasks[1])).toEqual([{ id: '1', type: 'FS', lag_days: 0 }])
    expect(projectOrdinalDate(row(analyzeProjectSchedule(p), 2).earliestStart)).toBe('2026-01-07')
  })

  it.each([
    ['FS', 2, '2026-01-09'],
    ['SS', 2, '2026-01-07'],
    ['FF', 2, '2026-01-07'],
    ['SF', 2, '2026-01-06'],
  ] as const)('calculates %s typed edges with lag', (type, lag, expected) => {
    const p = project([task(1, '2026-01-05', '2026-01-06'), task(2, '2026-01-05', '2026-01-06', [{ id: 1, type, lag_days: lag }])])
    expect(projectOrdinalDate(row(analyzeProjectSchedule(p), 2).earliestStart)).toBe(expected)
  })

  it('rejects typed edges that would create a cycle', () => {
    const p = project([task(1, '2026-01-05', '2026-01-05', [2]), task(2, '2026-01-06')])
    expect(wouldCreateTypedDependencyCycle(p, 2, 1)).toBe(true)
    expect(setTypedProjectDependency(p, 2, 1, 'FS', 0, true)).toBe(p)
  })

  it('does not infer a calendar, but honors an explicit Monday-Friday calendar', () => {
    const base = project([task(1, '2026-01-09'), task(2, '2026-01-09', '2026-01-09', [1])])
    expect(simulateNamedProjectScenario(base, 1, 1).project.tasks[0].start_date).toBe('2026-01-10')
    const explicit = setProjectWorkingDays(base, [1, 2, 3, 4, 5], new Date('2026-01-01T00:00:00Z'))
    const preview = simulateNamedProjectScenario(explicit, 1, 1)
    expect(preview.project.tasks[0].start_date).toBe('2026-01-12')
    expect(preview.project.tasks[1].start_date).toBe('2026-01-13')
  })

  it('surfaces hard constraint violations and blocks scenario Apply', () => {
    let p = project([task(1, '2026-01-05', '2026-01-06'), task(2, '2026-01-07', '2026-01-08', [1])])
    p = setProjectTaskConstraint(p, 2, { type: 'FNLT', date: '2026-01-08' }, new Date('2026-01-01T00:00:00Z'))
    expect(simulateNamedProjectScenario(p, 1, 2).constraintViolations).toHaveLength(1)
    const saved = saveProjectScheduleScenario(p, { name: 'Slip', taskId: 1, slipDays: 2 }, new Date('2026-01-02T00:00:00Z'))
    const applied = applyProjectScheduleScenario(saved.project, saved.scenario.id, new Date('2026-01-03T00:00:00Z'))
    expect(applied.project).toBe(saved.project)
    expect(applied.blockedReason).toMatch(/constraint/i)
  })

  it('keeps preview mutation-free and requires explicit Apply', () => {
    const p = project([task(1), task(2, '2026-01-06', '2026-01-06', [1])])
    const before = structuredClone(p)
    expect(simulateNamedProjectScenario(p, 1, 2).project.tasks[0].start_date).toBe('2026-01-07')
    expect(p).toEqual(before)
    const saved = saveProjectScheduleScenario(p, { name: 'Approved what-if', taskId: 1, slipDays: 2 }, new Date('2026-01-02T00:00:00Z'))
    expect(saved.project.tasks[0].start_date).toBe('2026-01-05')
    const applied = applyProjectScheduleScenario(saved.project, saved.scenario.id, new Date('2026-01-03T00:00:00Z'))
    expect(applied.project.tasks[0].start_date).toBe('2026-01-07')
    expect(getProjectScheduleState(applied.project).scenarios?.[0].status).toBe('APPLIED')
  })

  it('retains immutable baseline history and compares current deltas', () => {
    const p = project([task(1)])
    const b1 = captureProjectScheduleBaselineV2(p, 'B1', new Date('2026-01-01T00:00:00Z'))
    const shifted = simulateNamedProjectScenario(b1, 1, 3).project
    const b2 = captureProjectScheduleBaselineV2(shifted, 'B2', new Date('2026-01-02T00:00:00Z'))
    const state = getProjectScheduleState(b2)
    expect(state.baselines).toHaveLength(2)
    expect(state.baselines?.[1].tasks[0].start_date).toBe('2026-01-05')
    expect(compareProjectScheduleBaseline(b2, state.baselines![1].id)[0].startDeltaDays).toBe(3)
  })

  it('keeps capacity Unknown unless canonical metadata provides an explicit limit', () => {
    const p = project([task(1), task(2)])
    expect(buildProjectCapacityView(p)[0].status).toBe('UNKNOWN')
    const withCapacity = project(p.tasks, { project_schedule_v2: { capacity_by_owner: { 'Owner A': 1 } } })
    expect(buildProjectCapacityView(withCapacity)[0]).toMatchObject({ capacity: 1, status: 'OVER' })
  })

  it('handles a P10 1,000-task chain deterministically', () => {
    const tasks = Array.from({ length: 1000 }, (_, index) => task(index + 1, '2026-01-05', '2026-01-05', index ? [index] : []))
    const analysis = analyzeProjectSchedule(project(tasks))
    expect(analysis.cycle).toBe(false)
    expect(analysis.rows).toHaveLength(1000)
    expect(analysis.makespanDays).toBe(1000)
  })
})
