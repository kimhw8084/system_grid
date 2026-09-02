import { describe, expect, it } from 'vitest'
import {
  PROJECT_OUTCOME_REALIZATION_KEY,
  attachProjectOutcomeToLatestReportSnapshot,
  buildProjectOutcomePortfolioSummary,
  deriveProjectOutcomeState,
  getProjectOutcomeMeasurement,
  setProjectOutcomeMeasurement,
} from './ProjectsGolden.outcomes'

const measurement = (currentAdoption: number | null, currentValue: number | null, overrides: any = {}) => ({
  adoption: {
    eligible_population: 100,
    target_percent: 80,
    current_percent: currentAdoption,
    active_population: currentAdoption == null ? null : currentAdoption,
    desired_frequency: 'Weekly',
    owner: 'Adoption Owner',
    measurement_source: currentAdoption == null ? null : 'Usage warehouse',
    measured_at: currentAdoption == null ? null : '2026-09-01T12:00:00.000Z',
    confidence: currentAdoption == null ? null : 'High',
  },
  value: {
    baseline: 20,
    target: 100,
    current: currentValue,
    unit: 'hours/year',
    annualization_rule: 'Measured trailing 30d × 12',
    measurement_source: currentValue == null ? null : 'Benefits ledger',
    measured_at: currentValue == null ? null : '2026-09-01T12:00:00.000Z',
    confidence: currentValue == null ? null : 'High',
    explanation: 'Measured operational benefit; no adoption multiplier applied.',
  },
  ...overrides,
})

const project = (id: number, parent_project_id: number | null, data: any = {}) => ({
  id,
  name: `P${id}`,
  parent_project_id,
  status: 'Completed',
  man_hours_saved: 920,
  stoploss_minutes_saved: 460,
  wafers_gained: 180,
  metadata_json: {},
  tasks: [{ id: id * 10, name: 'Delivered', status: 'Completed', progress: 100, metadata_json: {} }],
  ...data,
})

describe('Project outcome realization contract', () => {
  it('keeps missing measurement unknown instead of coercing to zero or green', () => {
    const row = project(3, null)
    const normalized = getProjectOutcomeMeasurement(row)
    expect(normalized.adoption.current_percent).toBeNull()
    expect(normalized.value.current).toBeNull()
    const state = deriveProjectOutcomeState(row)
    expect(state.state).toBe('Unknown')
    expect(state.adoptionLabel).toBe('Not measured')
    expect(state.valueLabel).toBe('Not measured')
  })

  it('marks delivered work with materially weak measured adoption at risk', () => {
    const row = project(3, null, { metadata_json: { [PROJECT_OUTCOME_REALIZATION_KEY]: measurement(20, 120) } })
    const state = deriveProjectOutcomeState(row)
    expect(state.executionProgress).toBe(100)
    expect(state.state).toBe('At Risk')
    expect(state.adoptionPercent).toBe(20)
  })

  it('distinguishes adopting, realizing value and realized states', () => {
    const adopting = project(4, null, { metadata_json: { [PROJECT_OUTCOME_REALIZATION_KEY]: measurement(70, null) } })
    const realizing = project(5, null, { metadata_json: { [PROJECT_OUTCOME_REALIZATION_KEY]: measurement(88, 70) } })
    const realized = project(8, null, { metadata_json: { [PROJECT_OUTCOME_REALIZATION_KEY]: measurement(88, 135) } })
    expect(deriveProjectOutcomeState(adopting).state).toBe('Adopting')
    expect(deriveProjectOutcomeState(realizing).state).toBe('Realizing Value')
    expect(deriveProjectOutcomeState(realized).state).toBe('Realized')
  })

  it('persists measurement history while leaving legacy ROI streams untouched', () => {
    const base = project(1, null)
    const next = setProjectOutcomeMeasurement(base, measurement(92, 135), new Date('2026-09-01T12:30:00.000Z'))
    expect(next.man_hours_saved).toBe(920)
    expect(next.stoploss_minutes_saved).toBe(460)
    expect(next.wafers_gained).toBe(180)
    const stored = next.metadata_json[PROJECT_OUTCOME_REALIZATION_KEY]
    expect(stored.history).toHaveLength(1)
    expect(stored.history[0].adoption.current_percent).toBe(92)
    expect(stored.history[0].value.current).toBe(135)
    expect(stored.history[0].captured_at).toBe('2026-09-01T12:30:00.000Z')
  })

  it('does not double-count child project population or value in portfolio aggregation', () => {
    const p01 = project(1, null, { metadata_json: { [PROJECT_OUTCOME_REALIZATION_KEY]: measurement(92, 135, { adoption: { ...measurement(92, 135).adoption, eligible_population: 100 } }) } })
    const p03 = project(3, null, { metadata_json: { [PROJECT_OUTCOME_REALIZATION_KEY]: measurement(20, 80, { adoption: { ...measurement(20, 80).adoption, eligible_population: 120 } }) } })
    const p08 = project(8, null, { metadata_json: { [PROJECT_OUTCOME_REALIZATION_KEY]: measurement(88, 150, { adoption: { ...measurement(88, 150).adoption, eligible_population: 200 } }) } })
    const child = project(81, 8, { metadata_json: { [PROJECT_OUTCOME_REALIZATION_KEY]: measurement(100, 999, { adoption: { ...measurement(100, 999).adoption, eligible_population: 50 } }) } })
    const summary = buildProjectOutcomePortfolioSummary([p01, p03, p08, child])
    expect(summary.topLevelProjects).toBe(3)
    expect(summary.measuredEligiblePopulation).toBe(420)
    expect(summary.stateCounts.Realized).toBe(2)
    expect(summary.stateCounts['At Risk']).toBe(1)
    expect(summary.valueByUnit['hours/year']).toBe(365)
  })

  it('freezes measured adoption/value into report snapshot summary at capture time', () => {
    const source = project(1, null, { metadata_json: { [PROJECT_OUTCOME_REALIZATION_KEY]: measurement(92, 135) } })
    const afterBaseCapture = {
      ...source,
      metadata_json: {
        ...source.metadata_json,
        project_reporting_v1: { snapshots: [{ id: 'report-1', captured_at: '2026-09-01T13:00:00.000Z', summary: { name: source.name } }] },
      },
    }
    const enriched = attachProjectOutcomeToLatestReportSnapshot(afterBaseCapture, source)
    const frozen = enriched.metadata_json.project_reporting_v1.snapshots[0].summary.outcomeRealization
    expect(frozen.measurement.adoption.current_percent).toBe(92)
    expect(frozen.measurement.value.current).toBe(135)
    expect(frozen.state).toBe('Realized')
    const changedSource = setProjectOutcomeMeasurement(source, measurement(40, 60), new Date('2026-09-02T00:00:00.000Z'))
    expect(getProjectOutcomeMeasurement(changedSource).adoption.current_percent).toBe(40)
    expect(frozen.measurement.adoption.current_percent).toBe(92)
  })
})
