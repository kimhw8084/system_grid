import { describe, expect, it } from 'vitest'
import { buildProjectVisualShowcase, getProjectVisualPins, setProjectVisualPins } from './ProjectsVisualShowcase.model'

const project = {
  id: 3901, name: 'P02 Risky Delivery', status: 'Completed', objective: 'Improve delivery truth', start_date: '2026-08-01', end_date: '2026-08-31',
  metadata_json: { project_schedule_v2: { capacity_by_owner: { Ada: 1 } }, project_outcome_realization_v1: { adoption: { current_percent: 42, target_percent: 80, measurement_source: 'Product analytics', measured_at: '2026-09-01T00:00:00Z', confidence: 'High' }, value: { current: 12, target: 30, unit: 'hours', measurement_source: 'Ops ledger', measured_at: '2026-09-01T00:00:00Z', confidence: 'High' } } },
  tasks: [
    { id: 1, name: 'Foundation', status: 'Completed', owner: 'Ada', start_date: '2026-08-01', end_date: '2026-08-05', dependencies_json: [] },
    { id: 2, name: 'Launch', status: 'Blocked', owner: 'Ada', start_date: '2026-08-06', end_date: '2026-08-10', dependencies_json: [{ id: '1', type: 'FS', lag_days: 0 }] },
  ],
}
const liveReport = { name: project.name, objective: project.objective, status: 'Completed', progress: 100, health: { level: 'red' }, plannedFinish: '2026-08-10', forecastFinish: '2026-08-16', varianceDays: 6, evidence: { evidencePercent: 75 }, blockers: [project.tasks[1]], nextActions: [project.tasks[1]], latestUpdates: [{ id: 'u1', author: 'Ada', content: 'Launch is blocked on approval.', created_at: '2026-09-01' }] }

describe('ProjectsVisualShowcase model', () => {
  it('keeps execution health separate from outcome realization and does not hide blockers', () => {
    const result = buildProjectVisualShowcase({ project, report: liveReport, preset: 'executive' })
    expect(result.executionHealth).toBe('red')
    expect(result.blockers).toHaveLength(1)
    expect(result.visuals.find((item) => item.id === 'risk-pressure')?.headline).toContain('1 blocker')
    expect(result.outcomeState).not.toBe('red')
  })

  it('never borrows newer live schedule/adoption values into a frozen report snapshot', () => {
    const frozenSummary = { ...liveReport, progress: 80, varianceDays: 2, outcomeRealization: { state: 'Adopting', adoptionLabel: '25%', valueLabel: 'Not measured', source: 'Snapshot source', confidence: 'Medium', measuredAt: '2026-08-20T00:00:00Z' } }
    const result = buildProjectVisualShowcase({ project: { ...project, metadata_json: { ...project.metadata_json, project_outcome_realization_v1: { adoption: { current_percent: 99 } } } }, report: frozenSummary, snapshot: { id: 'snap-1', captured_at: '2026-08-20T00:00:00Z', summary: frozenSummary }, preset: 'team' })
    expect(result.frozen).toBe(true)
    expect(result.visuals.find((item) => item.id === 'schedule-health')?.state).toBe('UNKNOWN')
    expect(result.visuals.find((item) => item.id === 'schedule-health')?.note).toContain('not borrowed')
    expect(result.visuals.find((item) => item.id === 'adoption-realization')?.headline).toBe('25%')
  })

  it('renders missing measurements as Unknown/Not measured instead of zero', () => {
    const empty = { id: 2, name: 'Unknown outcome', status: 'Completed', metadata_json: {}, tasks: [] }
    const report = { name: empty.name, status: 'Completed', progress: 100, health: { level: 'green' }, evidence: {}, blockers: [], nextActions: [], latestUpdates: [] }
    const result = buildProjectVisualShowcase({ project: empty, report, preset: 'executive' })
    expect(result.visuals.find((item) => item.id === 'adoption-realization')?.headline).not.toBe('0%')
    expect(result.visuals.find((item) => item.id === 'value-realization')?.headline).not.toBe('0')
  })

  it('stores pins only in existing Project reporting metadata and preserves neighbors', () => {
    const withNeighbor = { ...project, metadata_json: { keep: { x: 1 }, project_reporting_v1: { other: 'yes' } } }
    const next = setProjectVisualPins(withNeighbor, ['schedule-health', 'risk-pressure', 'schedule-health'])
    expect(getProjectVisualPins(next)).toEqual(['schedule-health', 'risk-pressure'])
    expect(next.metadata_json.keep).toEqual({ x: 1 })
    expect(next.metadata_json.project_reporting_v1.other).toBe('yes')
  })
})
