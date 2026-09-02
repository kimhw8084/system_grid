import { getProjectExecutionProgress } from './ProjectsGolden.model'

export const PROJECT_OUTCOME_REALIZATION_KEY = 'project_outcome_realization_v1'
const PROJECT_REPORTING_KEY = 'project_reporting_v1'
const HISTORY_LIMIT = 24

export type ProjectOutcomeState = 'Delivering' | 'Unknown' | 'At Risk' | 'Adopting' | 'Realizing Value' | 'Realized'

type AdoptionMeasurement = {
  eligible_population: number | null
  target_percent: number | null
  current_percent: number | null
  active_population: number | null
  desired_frequency: string | null
  owner: string | null
  measurement_source: string | null
  measured_at: string | null
  confidence: string | null
}

type ValueMeasurement = {
  baseline: number | null
  target: number | null
  current: number | null
  unit: string | null
  annualization_rule: string | null
  measurement_source: string | null
  measured_at: string | null
  confidence: string | null
  explanation: string | null
}

export type ProjectOutcomeMeasurement = {
  adoption: AdoptionMeasurement
  value: ValueMeasurement
  history: any[]
}

const finiteOrNull = (value: any): number | null => {
  if (value === '' || value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const textOrNull = (value: any): string | null => {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

const normalizePercent = (value: any): number | null => {
  const parsed = finiteOrNull(value)
  return parsed == null ? null : Math.max(0, Math.min(100, parsed))
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const normalizeAdoption = (raw: any = {}): AdoptionMeasurement => ({
  eligible_population: finiteOrNull(raw?.eligible_population),
  target_percent: normalizePercent(raw?.target_percent),
  current_percent: normalizePercent(raw?.current_percent),
  active_population: finiteOrNull(raw?.active_population),
  desired_frequency: textOrNull(raw?.desired_frequency),
  owner: textOrNull(raw?.owner),
  measurement_source: textOrNull(raw?.measurement_source),
  measured_at: textOrNull(raw?.measured_at),
  confidence: textOrNull(raw?.confidence),
})

const normalizeValue = (raw: any = {}): ValueMeasurement => ({
  baseline: finiteOrNull(raw?.baseline),
  target: finiteOrNull(raw?.target),
  current: finiteOrNull(raw?.current),
  unit: textOrNull(raw?.unit),
  annualization_rule: textOrNull(raw?.annualization_rule),
  measurement_source: textOrNull(raw?.measurement_source),
  measured_at: textOrNull(raw?.measured_at),
  confidence: textOrNull(raw?.confidence),
  explanation: textOrNull(raw?.explanation),
})

export const getProjectOutcomeMeasurement = (project: any): ProjectOutcomeMeasurement => {
  const metadata = project?.metadata_json && typeof project.metadata_json === 'object' ? project.metadata_json : {}
  const raw = metadata[PROJECT_OUTCOME_REALIZATION_KEY] && typeof metadata[PROJECT_OUTCOME_REALIZATION_KEY] === 'object' ? metadata[PROJECT_OUTCOME_REALIZATION_KEY] : {}
  return {
    adoption: normalizeAdoption(raw?.adoption),
    value: normalizeValue(raw?.value),
    history: Array.isArray(raw?.history) ? raw.history.map((row: any) => clone(row)).slice(0, HISTORY_LIMIT) : [],
  }
}

export const deriveProjectOutcomeState = (project: any) => {
  const executionProgress = getProjectExecutionProgress(project)
  const measurement = getProjectOutcomeMeasurement(project)
  const adoption = measurement.adoption
  const value = measurement.value
  const adoptionPercent = adoption.current_percent
  const adoptionTarget = adoption.target_percent
  const valueCurrent = value.current
  const valueTarget = value.target

  let state: ProjectOutcomeState
  if (executionProgress < 90) state = 'Delivering'
  else if (adoptionPercent == null || adoptionTarget == null) state = 'Unknown'
  else if (adoptionPercent < adoptionTarget * 0.8) state = 'At Risk'
  else if (adoptionPercent < adoptionTarget) state = 'Adopting'
  else if (valueCurrent == null || valueTarget == null) state = 'Adopting'
  else if (valueCurrent < valueTarget) state = 'Realizing Value'
  else state = 'Realized'

  const adoptionLabel = adoptionPercent == null ? 'Not measured' : `${Math.round(adoptionPercent)}% adoption`
  const valueLabel = valueCurrent == null ? 'Not measured' : `${valueCurrent}${value.unit ? ` ${value.unit}` : ''}`
  const source = adoption.measurement_source || value.measurement_source || null
  const confidence = adoption.confidence || value.confidence || null
  const measuredAt = adoption.measured_at || value.measured_at || null
  return { state, executionProgress, adoptionPercent, adoptionTarget, valueCurrent, valueTarget, adoptionLabel, valueLabel, source, confidence, measuredAt, measurement }
}

export const setProjectOutcomeMeasurement = (project: any, input: any, now: Date = new Date()) => {
  const metadata = project?.metadata_json && typeof project.metadata_json === 'object' ? project.metadata_json : {}
  const previous = getProjectOutcomeMeasurement(project)
  const adoption = normalizeAdoption({ ...previous.adoption, ...(input?.adoption || {}) })
  const value = normalizeValue({ ...previous.value, ...(input?.value || {}) })
  const captured_at = now.toISOString()
  const history = [{ captured_at, adoption: clone(adoption), value: clone(value) }, ...previous.history].slice(0, HISTORY_LIMIT)
  return { ...project, metadata_json: { ...metadata, [PROJECT_OUTCOME_REALIZATION_KEY]: { adoption, value, history } } }
}

export const buildProjectOutcomePortfolioSummary = (projects: any[]) => {
  const topLevel = (Array.isArray(projects) ? projects : []).filter((project: any) => project?.parent_project_id == null)
  const stateCounts: Record<ProjectOutcomeState, number> = { Delivering: 0, Unknown: 0, 'At Risk': 0, Adopting: 0, 'Realizing Value': 0, Realized: 0 }
  let measuredEligiblePopulation = 0
  let measuredAdoptionProjects = 0
  const valueByUnit: Record<string, number> = {}
  for (const project of topLevel) {
    const outcome = deriveProjectOutcomeState(project)
    stateCounts[outcome.state] += 1
    const measurement = outcome.measurement
    if (measurement.adoption.eligible_population != null && measurement.adoption.current_percent != null) {
      measuredEligiblePopulation += measurement.adoption.eligible_population
      measuredAdoptionProjects += 1
    }
    if (measurement.value.current != null && measurement.value.unit) {
      valueByUnit[measurement.value.unit] = (valueByUnit[measurement.value.unit] || 0) + measurement.value.current
    }
  }
  return { topLevelProjects: topLevel.length, measuredEligiblePopulation, measuredAdoptionProjects, stateCounts, valueByUnit }
}

export const attachProjectOutcomeToLatestReportSnapshot = (projectAfterCapture: any, sourceProject: any = projectAfterCapture) => {
  const metadata = projectAfterCapture?.metadata_json && typeof projectAfterCapture.metadata_json === 'object' ? projectAfterCapture.metadata_json : {}
  const reporting = metadata[PROJECT_REPORTING_KEY] && typeof metadata[PROJECT_REPORTING_KEY] === 'object' ? metadata[PROJECT_REPORTING_KEY] : {}
  const snapshots = Array.isArray(reporting.snapshots) ? [...reporting.snapshots] : []
  if (!snapshots.length) return projectAfterCapture
  const outcome = deriveProjectOutcomeState(sourceProject)
  const outcomeRealization = clone({
    state: outcome.state,
    executionProgress: outcome.executionProgress,
    adoptionLabel: outcome.adoptionLabel,
    valueLabel: outcome.valueLabel,
    source: outcome.source,
    confidence: outcome.confidence,
    measuredAt: outcome.measuredAt,
    measurement: outcome.measurement,
  })
  snapshots[0] = { ...snapshots[0], summary: { ...(snapshots[0]?.summary || {}), outcomeRealization } }
  return { ...projectAfterCapture, metadata_json: { ...metadata, [PROJECT_REPORTING_KEY]: { ...reporting, snapshots } } }
}
