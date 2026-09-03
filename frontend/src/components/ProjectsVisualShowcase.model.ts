import { deriveProjectOutcomeState } from './ProjectsGolden.outcomes'
import { analyzeProjectSchedule, buildProjectCapacityView } from './ProjectsSchedulingCompletion.model'

export const PROJECT_REPORTING_SHOWCASE_KEY = 'project_reporting_v1'
export type ProjectShowcasePreset = 'executive' | 'team'
export type ProjectVisualState = 'KNOWN' | 'UNKNOWN' | 'ERROR'

export interface ProjectVisualFallbackRow { label: string; value: string }
export interface ProjectVisualCard {
  id: string
  category: 'delivery' | 'schedule' | 'flow' | 'capacity' | 'risk' | 'adoption' | 'value' | 'dependency' | 'collaboration'
  question: string
  title: string
  state: ProjectVisualState
  headline: string
  note: string
  source: string
  timeRange: string
  fallback: ProjectVisualFallbackRow[]
}

export interface ProjectShowcaseModel {
  preset: ProjectShowcasePreset
  frozen: boolean
  capturedAt: string | null
  name: string
  objective: string
  status: string
  executionHealth: string
  outcomeState: string
  blockers: Array<{ id: string; name: string; status: string }>
  nextActions: Array<{ id: string; name: string }>
  updates: Array<{ id: string; author: string; content: string; createdAt: string }>
  visualIds: string[]
  visuals: ProjectVisualCard[]
}

const array = <T = any>(value: unknown): T[] => Array.isArray(value) ? value as T[] : []
const text = (value: unknown, fallback = '') => String(value ?? '').trim() || fallback
const finite = (value: unknown): number | null => {
  if (value == null || value === '') return null
  const next = Number(value)
  return Number.isFinite(next) ? next : null
}
const pct = (value: unknown) => { const next = finite(value); return next == null ? null : Math.max(0, Math.min(100, Math.round(next))) }
const visual = (input: ProjectVisualCard): ProjectVisualCard => input
const unknownVisual = (id: string, category: ProjectVisualCard['category'], question: string, title: string, note: string, source: string, timeRange: string): ProjectVisualCard => visual({ id, category, question, title, state: 'UNKNOWN', headline: 'Unknown', note, source, timeRange, fallback: [{ label: 'Status', value: note }] })
const currentRange = (project: any) => [project?.start_date, project?.end_date || project?.target_date].filter(Boolean).join(' → ') || 'Current project'

export const getProjectVisualPins = (project: any): string[] => {
  const raw = project?.metadata_json?.[PROJECT_REPORTING_SHOWCASE_KEY]?.pinned_visual_ids
  return array(raw).map(String).filter(Boolean).slice(0, 12)
}

export const setProjectVisualPins = (project: any, ids: string[]) => {
  const metadata = project?.metadata_json && typeof project.metadata_json === 'object' ? project.metadata_json : {}
  const reporting = metadata?.[PROJECT_REPORTING_SHOWCASE_KEY] && typeof metadata[PROJECT_REPORTING_SHOWCASE_KEY] === 'object' ? metadata[PROJECT_REPORTING_SHOWCASE_KEY] : {}
  const pinned_visual_ids = [...new Set(ids.map(String).filter(Boolean))].slice(0, 12)
  return { ...project, metadata_json: { ...metadata, [PROJECT_REPORTING_SHOWCASE_KEY]: { ...reporting, pinned_visual_ids } } }
}

const frozenOutcome = (summary: any) => {
  const raw = summary?.outcomeRealization
  if (!raw || typeof raw !== 'object') return null
  return {
    state: text(raw.state, 'Unknown'),
    adoptionLabel: text(raw.adoptionLabel, 'Not measured'),
    valueLabel: text(raw.valueLabel, 'Not measured'),
    source: text(raw.source, 'Not measured'),
    confidence: text(raw.confidence),
    measuredAt: text(raw.measuredAt),
  }
}

const visualLibrary = (project: any, report: any, snapshot: any | null): ProjectVisualCard[] => {
  const frozen = Boolean(snapshot)
  const timeRange = frozen ? text(snapshot?.captured_at, 'Snapshot time unknown') : currentRange(project)
  const health = text(report?.health?.level, 'unknown')
  const progress = pct(report?.progress)
  const blockers = array(report?.blockers)
  const nextActions = array(report?.nextActions)
  const outcome = frozen ? frozenOutcome(report) : (() => {
    const live = deriveProjectOutcomeState(project)
    return { state: live.state, adoptionLabel: live.adoptionLabel, valueLabel: live.valueLabel, source: live.source, confidence: live.confidence, measuredAt: live.measuredAt }
  })()

  const delivery = progress == null
    ? unknownVisual('delivery-progress', 'delivery', 'How much delivery is complete?', 'Delivery progress', 'Execution progress was not captured.', frozen ? 'Report snapshot' : 'Canonical Project tasks', timeRange)
    : visual({ id: 'delivery-progress', category: 'delivery', question: 'How much delivery is complete?', title: 'Delivery progress', state: 'KNOWN', headline: `${progress}%`, note: `${nextActions.length} next action${nextActions.length === 1 ? '' : 's'}`, source: frozen ? 'Report snapshot · capture-time execution' : 'Canonical Project tasks · live execution', timeRange, fallback: [{ label: 'Execution', value: `${progress}%` }, { label: 'Next actions', value: String(nextActions.length) }] })

  const milestone = report?.plannedFinish || report?.forecastFinish
    ? visual({ id: 'milestone-confidence', category: 'delivery', question: 'Are delivery checkpoints still credible?', title: 'Milestone confidence', state: 'KNOWN', headline: health === 'red' ? 'Low' : health === 'amber' ? 'Watch' : 'On track', note: `Forecast ${text(report?.forecastFinish, 'Unknown')} · plan ${text(report?.plannedFinish, 'Unknown')}`, source: frozen ? 'Report snapshot · captured forecast' : 'Canonical Project report · live forecast', timeRange, fallback: [{ label: 'Plan finish', value: text(report?.plannedFinish, 'Unknown') }, { label: 'Forecast finish', value: text(report?.forecastFinish, 'Unknown') }, { label: 'Health', value: health }] })
    : unknownVisual('milestone-confidence', 'delivery', 'Are delivery checkpoints still credible?', 'Milestone confidence', 'No captured schedule finish is available.', frozen ? 'Report snapshot' : 'Canonical Project report', timeRange)

  let schedule: ProjectVisualCard
  let capacity: ProjectVisualCard
  let dependency: ProjectVisualCard
  if (frozen) {
    schedule = unknownVisual('schedule-health', 'schedule', 'Is the plan slipping and what is critical?', 'Schedule health', 'Schedule analysis was not captured in this report snapshot; live values are intentionally not borrowed.', 'Report snapshot · capture-time only', timeRange)
    capacity = unknownVisual('capacity-health', 'capacity', 'Where is owner capacity overloaded?', 'Capacity pressure', 'Capacity analysis was not captured in this report snapshot.', 'Report snapshot · capture-time only', timeRange)
    dependency = unknownVisual('dependency-map', 'dependency', 'Which dependencies shape delivery?', 'Dependency map', 'Dependency topology was not captured in this report snapshot.', 'Report snapshot · capture-time only', timeRange)
  } else {
    const analysis = analyzeProjectSchedule(project)
    const variance = finite(report?.varianceDays)
    const critical = analysis.rows.filter((row) => row.critical).length
    schedule = analysis.rows.length
      ? visual({ id: 'schedule-health', category: 'schedule', question: 'Is the plan slipping and what is critical?', title: 'Schedule health', state: 'KNOWN', headline: variance == null ? `${critical} critical` : `${variance > 0 ? '+' : ''}${variance}d`, note: `${critical} critical task${critical === 1 ? '' : 's'} · ${analysis.cycle ? 'cycle detected' : 'acyclic'}`, source: 'Canonical Project schedule · deterministic critical path', timeRange, fallback: [{ label: 'Variance', value: variance == null ? 'Unknown' : `${variance > 0 ? '+' : ''}${variance}d` }, { label: 'Critical tasks', value: String(critical) }, { label: 'Cycle', value: analysis.cycle ? 'Detected' : 'None' }] })
      : unknownVisual('schedule-health', 'schedule', 'Is the plan slipping and what is critical?', 'Schedule health', 'No scheduled tasks are available.', 'Canonical Project schedule', timeRange)
    const capacityRows = buildProjectCapacityView(project)
    const authoritative = capacityRows.filter((row) => row.capacity != null)
    const overloaded = authoritative.filter((row) => row.status === 'OVER')
    capacity = authoritative.length
      ? visual({ id: 'capacity-health', category: 'capacity', question: 'Where is owner capacity overloaded?', title: 'Capacity pressure', state: 'KNOWN', headline: overloaded.length ? `${overloaded.length} overloaded` : 'Within capacity', note: `${authoritative.length} owner capacity record${authoritative.length === 1 ? '' : 's'} measured`, source: `Canonical Project metadata · ${PROJECT_REPORTING_SHOWCASE_KEY === 'project_reporting_v1' ? 'schedule capacity' : 'capacity'}`, timeRange, fallback: capacityRows.map((row) => ({ label: row.owner, value: row.capacity == null ? `${row.workload} workload · Unknown capacity` : `${row.workload}/${row.capacity} · ${row.status}` })) })
      : unknownVisual('capacity-health', 'capacity', 'Where is owner capacity overloaded?', 'Capacity pressure', 'No authoritative owner capacity is recorded; workload is not converted into fabricated availability.', 'Canonical Project schedule capacity', timeRange)
    const dependencies = array(project?.tasks).flatMap((task: any) => array(task?.dependencies_json).map((dep: any) => ({ from: String(dep?.id ?? dep?.task_id ?? dep), to: String(task?.id), type: text(dep?.type, 'FS') })))
    dependency = dependencies.length
      ? visual({ id: 'dependency-map', category: 'dependency', question: 'Which dependencies shape delivery?', title: 'Dependency map', state: 'KNOWN', headline: `${dependencies.length} link${dependencies.length === 1 ? '' : 's'}`, note: `${analysis.rows.filter((row) => row.critical).length} critical tasks`, source: 'Canonical Project task dependencies', timeRange, fallback: dependencies.slice(0, 12).map((row) => ({ label: `${row.from} → ${row.to}`, value: row.type })) })
      : unknownVisual('dependency-map', 'dependency', 'Which dependencies shape delivery?', 'Dependency map', 'No project-task dependency links are recorded.', 'Canonical Project task dependencies', timeRange)
  }

  const tasks = frozen ? [] : array(project?.tasks)
  const open = tasks.filter((task: any) => task?.status !== 'Completed')
  const done = tasks.filter((task: any) => task?.status === 'Completed')
  const flow = frozen
    ? unknownVisual('flow-health', 'flow', 'How is work flowing through the system?', 'Flow and work aging', 'Task lifecycle history was not captured in this report snapshot.', 'Report snapshot · capture-time only', timeRange)
    : tasks.length
      ? visual({ id: 'flow-health', category: 'flow', question: 'How is work flowing through the system?', title: 'Flow and work aging', state: 'KNOWN', headline: `${open.length} open`, note: `${done.length} complete · ${open.filter((task: any) => task?.status === 'Blocked').length} blocked`, source: 'Canonical Project task lifecycle', timeRange, fallback: [{ label: 'Open', value: String(open.length) }, { label: 'Completed', value: String(done.length) }, { label: 'Blocked', value: String(open.filter((task: any) => task?.status === 'Blocked').length) }] })
      : unknownVisual('flow-health', 'flow', 'How is work flowing through the system?', 'Flow and work aging', 'No task lifecycle data is available.', 'Canonical Project task lifecycle', timeRange)

  const risk = visual({ id: 'risk-pressure', category: 'risk', question: 'What could prevent a successful outcome?', title: 'Risk and blocker pressure', state: 'KNOWN', headline: blockers.length ? `${blockers.length} blocker${blockers.length === 1 ? '' : 's'}` : 'No current blockers', note: `Execution health ${health}`, source: frozen ? 'Report snapshot · captured blockers' : 'Canonical Project report · blockers and health', timeRange, fallback: blockers.length ? blockers.slice(0, 12).map((row: any) => ({ label: text(row?.name, text(row?.id, 'Blocker')), value: text(row?.status, 'Blocked') })) : [{ label: 'Blockers', value: 'None captured' }, { label: 'Execution health', value: health }] })

  const adoption = outcome
    ? visual({ id: 'adoption-realization', category: 'adoption', question: 'Is the delivered change being adopted?', title: 'Adoption realization', state: outcome.adoptionLabel === 'Not measured' ? 'UNKNOWN' : 'KNOWN', headline: outcome.adoptionLabel || 'Not measured', note: `${outcome.state} · ${outcome.confidence ? `${outcome.confidence} confidence` : 'confidence not measured'}`, source: outcome.source || 'Not measured', timeRange: outcome.measuredAt || timeRange, fallback: [{ label: 'Outcome state', value: outcome.state }, { label: 'Adoption', value: outcome.adoptionLabel || 'Not measured' }, { label: 'Source', value: outcome.source || 'Not measured' }] })
    : unknownVisual('adoption-realization', 'adoption', 'Is the delivered change being adopted?', 'Adoption realization', 'Adoption was not captured or measured.', frozen ? 'Report snapshot' : 'Canonical Project outcome measurement', timeRange)

  const value = outcome
    ? visual({ id: 'value-realization', category: 'value', question: 'Is intended value actually being realized?', title: 'Value / ROI realization', state: outcome.valueLabel === 'Not measured' ? 'UNKNOWN' : 'KNOWN', headline: outcome.valueLabel || 'Not measured', note: `${outcome.state} · execution remains a separate signal`, source: outcome.source || 'Not measured', timeRange: outcome.measuredAt || timeRange, fallback: [{ label: 'Outcome state', value: outcome.state }, { label: 'Realized value', value: outcome.valueLabel || 'Not measured' }, { label: 'Source', value: outcome.source || 'Not measured' }] })
    : unknownVisual('value-realization', 'value', 'Is intended value actually being realized?', 'Value / ROI realization', 'Value was not captured or measured.', frozen ? 'Report snapshot' : 'Canonical Project outcome measurement', timeRange)

  const reportUpdates = array(report?.latestUpdates)
  const materials = frozen ? [] : [...array(project?.attachments), ...array(project?.files), ...array(project?.metadata_json?.files), ...array(project?.links), ...array(project?.metadata_json?.links)]
  const evidencePct = finite(report?.evidence?.evidencePercent)
  const collaboration = (reportUpdates.length || materials.length || evidencePct != null)
    ? visual({ id: 'collaboration-evidence', category: 'collaboration', question: 'What collaboration and evidence support the story?', title: 'Collaboration and evidence', state: 'KNOWN', headline: `${reportUpdates.length} update${reportUpdates.length === 1 ? '' : 's'}`, note: `${frozen ? 'Materials not captured' : `${materials.length} material${materials.length === 1 ? '' : 's'}`} · evidence ${evidencePct == null ? 'Unknown' : `${Math.round(evidencePct)}%`}`, source: frozen ? 'Report snapshot · captured updates/evidence only' : 'Canonical Project updates, material and stage-gate evidence', timeRange, fallback: [{ label: 'Human updates', value: String(reportUpdates.length) }, { label: 'Materials', value: frozen ? 'Not captured' : String(materials.length) }, { label: 'Evidence', value: evidencePct == null ? 'Unknown' : `${Math.round(evidencePct)}%` }] })
    : unknownVisual('collaboration-evidence', 'collaboration', 'What collaboration and evidence support the story?', 'Collaboration and evidence', frozen ? 'No collaboration/evidence values were captured in this snapshot.' : 'No collaboration, material or evidence signals are recorded.', frozen ? 'Report snapshot' : 'Canonical Project collaboration/evidence', timeRange)

  return [delivery, milestone, schedule, flow, capacity, risk, adoption, value, dependency, collaboration]
}

export const buildProjectVisualShowcase = (input: { project: any; report: any; snapshot?: any | null; preset?: ProjectShowcasePreset }): ProjectShowcaseModel => {
  const { project, report, snapshot = null, preset = 'executive' } = input
  const frozen = Boolean(snapshot)
  const outcome = frozen ? frozenOutcome(report) : deriveProjectOutcomeState(project)
  const blockers = array(report?.blockers).map((row: any) => ({ id: text(row?.id, row?.name), name: text(row?.name, 'Unnamed blocker'), status: text(row?.status, 'Blocked') }))
  const nextActions = array(report?.nextActions).map((row: any) => ({ id: text(row?.id, row?.name), name: text(row?.name, 'Unnamed action') }))
  const updates = array(report?.latestUpdates).map((row: any, index) => ({ id: text(row?.id, String(index)), author: text(row?.author, 'Project update'), content: text(row?.content ?? row?.text), createdAt: text(row?.created_at ?? row?.timestamp, 'Recorded') }))
  const visuals = visualLibrary(project, report, snapshot)
  const executiveIds = ['delivery-progress','schedule-health','risk-pressure','adoption-realization','value-realization','collaboration-evidence']
  const teamIds = ['delivery-progress','milestone-confidence','schedule-health','flow-health','capacity-health','risk-pressure','dependency-map','collaboration-evidence','adoption-realization','value-realization']
  const visualIds = preset === 'executive' ? executiveIds : teamIds
  return {
    preset,
    frozen,
    capturedAt: frozen ? text(snapshot?.captured_at) || null : null,
    name: text(report?.name, text(project?.name, 'Project')),
    objective: text(report?.objective, text(project?.objective ?? project?.problem_statement, 'No project objective recorded.')),
    status: text(report?.status, text(project?.status, 'Unknown')),
    executionHealth: text(report?.health?.level, 'unknown'),
    outcomeState: text((outcome as any)?.state, 'Unknown'),
    blockers,
    nextActions,
    updates,
    visualIds,
    visuals,
  }
}
