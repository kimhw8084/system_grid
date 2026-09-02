export const PROJECT_SCHEDULE_COMPLETION_KEY = 'project_schedule_v2'
export const PROJECT_TASK_CONSTRAINT_KEY = 'project_schedule_constraint_v1'

export const PROJECT_DEPENDENCY_TYPES = ['FS', 'SS', 'FF', 'SF'] as const
export type ProjectDependencyType = (typeof PROJECT_DEPENDENCY_TYPES)[number]
export type ProjectConstraintType = 'ASAP' | 'SNET' | 'FNLT' | 'MUST_START' | 'MUST_FINISH'

export interface ProjectTaskDependencyV2 {
  id: string
  type: ProjectDependencyType
  lag_days: number
}

export interface ProjectTaskConstraintV1 {
  type: ProjectConstraintType
  date: string | null
}

export interface ProjectScheduleBaselineV2 {
  id: string
  name: string
  captured_at: string
  tasks: Array<{ id: string; start_date: string | null; end_date: string | null }>
}

export interface ProjectScheduleScenarioV2 {
  id: string
  name: string
  task_id: string
  slip_days: number
  created_at: string
  applied_at?: string | null
  status: 'PROPOSED' | 'APPLIED'
}

export interface ProjectScheduleStateV2 {
  working_days?: number[] | null
  baselines?: ProjectScheduleBaselineV2[]
  scenarios?: ProjectScheduleScenarioV2[]
  capacity_by_owner?: Record<string, number | null>
  history?: Array<{ id: string; at: string; action: string; detail: string }>
}

export interface ProjectScheduleAnalysisRow {
  id: string
  name: string
  durationDays: number
  earliestStart: number
  earliestFinish: number
  latestStart: number
  latestFinish: number
  slackDays: number
  critical: boolean
  cycle: boolean
  constraintViolation: string | null
}

const DAY_MS = 86_400_000
const clampLag = (value: unknown) => Math.max(-3650, Math.min(3650, Math.round(Number(value) || 0)))
const taskKey = (value: any) => String(value?.id ?? value?.task_id ?? value ?? '')
const taskMetadata = (task: any) => task?.metadata_json && typeof task.metadata_json === 'object' && !Array.isArray(task.metadata_json) ? task.metadata_json : {}
const projectTasks = (project: any): any[] => Array.isArray(project?.tasks) ? project.tasks : []
const taskIndex = (project: any): Map<string, any> => new Map<string, any>(projectTasks(project).map((task: any): [string, any] => [String(task?.id), task]))

export const projectDateOrdinal = (value?: string | null): number | null => {
  const text = String(value || '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (!match) return null
  const y = Number(match[1]); const m = Number(match[2]); const d = Number(match[3])
  const stamp = Date.UTC(y, m - 1, d); const check = new Date(stamp)
  if (check.getUTCFullYear() !== y || check.getUTCMonth() + 1 !== m || check.getUTCDate() !== d) return null
  return Math.floor(stamp / DAY_MS)
}

export const projectOrdinalDate = (ordinal: number): string => {
  const date = new Date(Math.round(ordinal) * DAY_MS)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

const rawDurationDays = (task: any): number => {
  const start = projectDateOrdinal(task?.start_date); const end = projectDateOrdinal(task?.end_date)
  if (start != null && end != null) return Math.max(1, end - start + 1)
  const metadataDuration = Number(taskMetadata(task)?.duration_days ?? taskMetadata(task)?.durationDays)
  return Number.isFinite(metadataDuration) ? Math.max(1, Math.round(metadataDuration)) : 1
}

export const normalizeProjectDependency = (value: any): ProjectTaskDependencyV2 | null => {
  const id = taskKey(value)
  if (!id) return null
  const rawType = String(value?.type ?? value?.dependency_type ?? value?.relation ?? 'FS').toUpperCase()
  const type = PROJECT_DEPENDENCY_TYPES.includes(rawType as ProjectDependencyType) ? rawType as ProjectDependencyType : 'FS'
  return { id, type, lag_days: clampLag(value?.lag_days ?? value?.lagDays ?? value?.lag ?? 0) }
}

export const normalizeProjectTaskDependencies = (task: any): ProjectTaskDependencyV2[] => {
  const seen = new Set<string>(); const result: ProjectTaskDependencyV2[] = []
  for (const raw of Array.isArray(task?.dependencies_json) ? task.dependencies_json : []) {
    const dep = normalizeProjectDependency(raw); if (!dep || seen.has(dep.id)) continue
    seen.add(dep.id); result.push(dep)
  }
  return result
}

const dependencyOffset = (predecessorDuration: number, successorDuration: number, dep: ProjectTaskDependencyV2) => {
  if (dep.type === 'SS') return dep.lag_days
  if (dep.type === 'FF') return predecessorDuration - successorDuration + dep.lag_days
  if (dep.type === 'SF') return -successorDuration + 1 + dep.lag_days
  return predecessorDuration + dep.lag_days
}

export const wouldCreateTypedDependencyCycle = (project: any, taskId: number | string, predecessorId: number | string): boolean => {
  const target = String(taskId); const predecessor = String(predecessorId)
  if (!target || !predecessor || target === predecessor) return true
  const byId = taskIndex(project); if (!byId.has(target) || !byId.has(predecessor)) return true
  const stack: string[] = [predecessor]; const seen = new Set<string>()
  while (stack.length) {
    const current = stack.pop() as string
    if (current === target) return true
    if (seen.has(current)) continue
    seen.add(current)
    const row = byId.get(current)
    for (const dep of normalizeProjectTaskDependencies(row)) if (!seen.has(dep.id)) stack.push(dep.id)
  }
  return false
}

const replaceTask = (project: any, taskId: string, nextTask: any) => ({
  ...project,
  tasks: projectTasks(project).map((task: any) => String(task?.id) === taskId ? nextTask : task),
})

export const getProjectScheduleState = (project: any): ProjectScheduleStateV2 => {
  const raw = project?.metadata_json?.[PROJECT_SCHEDULE_COMPLETION_KEY]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as ProjectScheduleStateV2
}

const appendScheduleHistory = (project: any, action: string, detail: string, now = new Date()) => {
  const metadata = project?.metadata_json && typeof project.metadata_json === 'object' ? project.metadata_json : {}
  const state = getProjectScheduleState(project)
  const entry = { id: `schedule-${now.getTime()}-${(state.history || []).length + 1}`, at: now.toISOString(), action, detail }
  return { ...project, metadata_json: { ...metadata, [PROJECT_SCHEDULE_COMPLETION_KEY]: { ...state, history: [entry, ...(state.history || [])].slice(0, 80) } } }
}

export const setTypedProjectDependency = (
  project: any,
  taskId: number | string,
  predecessorId: number | string,
  type: ProjectDependencyType = 'FS',
  lagDays = 0,
  enabled = true,
  now = new Date(),
) => {
  const target = String(taskId); const predecessor = String(predecessorId); const byId = taskIndex(project)
  const task = byId.get(target); if (!task || !byId.has(predecessor) || target === predecessor) return project
  const current = normalizeProjectTaskDependencies(task)
  if (enabled && !current.some((dep) => dep.id === predecessor) && wouldCreateTypedDependencyCycle(project, target, predecessor)) return project
  const nextDeps = enabled
    ? [...current.filter((dep) => dep.id !== predecessor), { id: predecessor, type, lag_days: clampLag(lagDays) }]
    : current.filter((dep) => dep.id !== predecessor)
  if (JSON.stringify(nextDeps) === JSON.stringify(current)) return project
  const next = replaceTask(project, target, { ...task, dependencies_json: nextDeps })
  return appendScheduleHistory(next, enabled ? 'Dependency updated' : 'Dependency removed', `${predecessor} → ${target}${enabled ? ` ${type} ${clampLag(lagDays) >= 0 ? '+' : ''}${clampLag(lagDays)}d` : ''}`, now)
}

export const getProjectTaskConstraint = (task: any): ProjectTaskConstraintV1 => {
  const raw = taskMetadata(task)?.[PROJECT_TASK_CONSTRAINT_KEY]
  const type = ['ASAP','SNET','FNLT','MUST_START','MUST_FINISH'].includes(String(raw?.type)) ? raw.type as ProjectConstraintType : 'ASAP'
  return { type, date: projectDateOrdinal(raw?.date) == null ? null : String(raw.date).slice(0, 10) }
}

export const setProjectTaskConstraint = (project: any, taskId: number | string, constraint: ProjectTaskConstraintV1, now = new Date()) => {
  const id = String(taskId); const task = taskIndex(project).get(id); if (!task) return project
  const date = constraint.type === 'ASAP' ? null : projectDateOrdinal(constraint.date) == null ? null : String(constraint.date).slice(0, 10)
  if (constraint.type !== 'ASAP' && !date) return project
  const metadata_json = { ...taskMetadata(task), [PROJECT_TASK_CONSTRAINT_KEY]: { type: constraint.type, date } }
  return appendScheduleHistory(replaceTask(project, id, { ...task, metadata_json }), 'Task constraint updated', `${id}: ${constraint.type}${date ? ` ${date}` : ''}`, now)
}

export const setProjectWorkingDays = (project: any, workingDays: number[] | null, now = new Date()) => {
  const normalized = workingDays == null ? null : [...new Set(workingDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort()
  if (normalized && normalized.length === 0) return project
  const metadata = project?.metadata_json && typeof project.metadata_json === 'object' ? project.metadata_json : {}
  const state = getProjectScheduleState(project)
  const next = { ...project, metadata_json: { ...metadata, [PROJECT_SCHEDULE_COMPLETION_KEY]: { ...state, working_days: normalized } } }
  return appendScheduleHistory(next, 'Working calendar updated', normalized == null ? 'No explicit project working calendar' : `Working days: ${normalized.join(',')}`, now)
}

const projectWorkingDays = (project: any): number[] | null => {
  const raw = getProjectScheduleState(project).working_days
  return Array.isArray(raw) && raw.length ? raw : null
}

const isProjectWorkingOrdinal = (project: any, ordinal: number) => {
  const days = projectWorkingDays(project)
  if (!days) return true
  return days.includes(new Date(ordinal * DAY_MS).getUTCDay())
}

const normalizeProjectWorkingOrdinal = (project: any, ordinal: number, direction: 1 | -1 = 1) => {
  if (!projectWorkingDays(project) || isProjectWorkingOrdinal(project, ordinal)) return ordinal
  let cursor = ordinal
  for (let guard = 0; guard < 14; guard += 1) {
    cursor += direction
    if (isProjectWorkingOrdinal(project, cursor)) return cursor
  }
  return ordinal
}

export const shiftProjectScheduleOrdinal = (project: any, ordinal: number, deltaDays: number) => {
  const delta = Math.round(Number(deltaDays) || 0)
  if (!projectWorkingDays(project)) return ordinal + delta
  if (!delta) return normalizeProjectWorkingOrdinal(project, ordinal, 1)
  const direction: 1 | -1 = delta > 0 ? 1 : -1
  let remaining = Math.abs(delta); let cursor = normalizeProjectWorkingOrdinal(project, ordinal, direction)
  while (remaining > 0) {
    cursor += direction
    if (isProjectWorkingOrdinal(project, cursor)) remaining -= 1
  }
  return cursor
}

const scheduleDistanceDays = (project: any, fromOrdinal: number, toOrdinal: number) => {
  if (fromOrdinal === toOrdinal) return 0
  if (!projectWorkingDays(project)) return toOrdinal - fromOrdinal
  const direction = toOrdinal > fromOrdinal ? 1 : -1
  let cursor = fromOrdinal; let steps = 0; let guard = 0
  while (cursor !== toOrdinal && guard < 20_000) {
    guard += 1; cursor += direction
    if (isProjectWorkingOrdinal(project, cursor)) steps += direction
    if ((direction > 0 && cursor > toOrdinal) || (direction < 0 && cursor < toOrdinal)) break
  }
  return steps
}

const scheduleDurationDays = (project: any, task: any) => {
  const start = projectDateOrdinal(task?.start_date); const end = projectDateOrdinal(task?.end_date)
  if (projectWorkingDays(project) && start != null && end != null && end >= start) {
    let count = 0
    for (let cursor = start; cursor <= end; cursor += 1) if (isProjectWorkingOrdinal(project, cursor)) count += 1
    if (count > 0) return count
  }
  return rawDurationDays(task)
}

const scheduleFinishFromStart = (project: any, start: number, duration: number) => shiftProjectScheduleOrdinal(project, start, Math.max(1, duration) - 1)
const scheduleStartFromFinish = (project: any, finish: number, duration: number) => shiftProjectScheduleOrdinal(project, finish, -(Math.max(1, duration) - 1))

const applyConstraintFloor = (project: any, task: any, earliest: number, duration: number) => {
  const constraint = getProjectTaskConstraint(task); const date = projectDateOrdinal(constraint.date)
  if (date == null || constraint.type === 'ASAP' || constraint.type === 'FNLT') return earliest
  const floor = constraint.type === 'MUST_FINISH' ? scheduleStartFromFinish(project, date, duration) : normalizeProjectWorkingOrdinal(project, date, 1)
  return Math.max(earliest, floor)
}

const applyConstraintCeiling = (project: any, task: any, latest: number, duration: number) => {
  const constraint = getProjectTaskConstraint(task); const date = projectDateOrdinal(constraint.date)
  if (date == null || constraint.type === 'ASAP' || constraint.type === 'SNET') return latest
  const ceiling = constraint.type === 'MUST_START' ? normalizeProjectWorkingOrdinal(project, date, 1) : scheduleStartFromFinish(project, normalizeProjectWorkingOrdinal(project, date, -1), duration)
  return Math.min(latest, ceiling)
}

const taskConstraintViolation = (project: any, task: any, start: number | null, finish: number | null): string | null => {
  const constraint = getProjectTaskConstraint(task); const date = projectDateOrdinal(constraint.date)
  if (date == null || constraint.type === 'ASAP' || start == null || finish == null) return null
  if (constraint.type === 'SNET' && start < date) return `SNET ${constraint.date}`
  if (constraint.type === 'FNLT' && finish > date) return `FNLT ${constraint.date}`
  if (constraint.type === 'MUST_START' && start !== date) return `MUST_START ${constraint.date}`
  if (constraint.type === 'MUST_FINISH' && finish !== date) return `MUST_FINISH ${constraint.date}`
  return null
}

const edgeSuccessorStartFromPredecessorStart = (project: any, predecessorStart: number, predecessorDuration: number, successorDuration: number, dep: ProjectTaskDependencyV2) => (
  shiftProjectScheduleOrdinal(project, predecessorStart, dependencyOffset(predecessorDuration, successorDuration, dep))
)

export const analyzeProjectSchedule = (project: any): { rows: ProjectScheduleAnalysisRow[]; cycle: boolean; makespanDays: number; criticalTaskIds: Set<string> } => {
  const tasks = projectTasks(project); const byId = taskIndex(project); const ids: string[] = tasks.map((task: any) => String(task?.id)).filter(Boolean)
  if (!ids.length) return { rows: [], cycle: false, makespanDays: 0, criticalTaskIds: new Set<string>() }
  const indegree = new Map<string, number>(ids.map((id): [string, number] => [id, 0])); const successors = new Map<string, Array<{ id: string; dep: ProjectTaskDependencyV2 }>>()
  for (const task of tasks) {
    const successorId = String(task?.id); const deps = normalizeProjectTaskDependencies(task)
    for (const dep of deps) {
      if (!byId.has(dep.id)) continue
      indegree.set(successorId, (indegree.get(successorId) || 0) + 1)
      const bucket = successors.get(dep.id) || []; bucket.push({ id: successorId, dep }); successors.set(dep.id, bucket)
    }
  }
  const queue: string[] = ids.filter((id) => (indegree.get(id) || 0) === 0); const order: string[] = []
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index]; order.push(id)
    for (const edge of successors.get(id) || []) { const next = (indegree.get(edge.id) || 0) - 1; indegree.set(edge.id, next); if (next === 0) queue.push(edge.id) }
  }
  const cycle = order.length !== ids.length
  const datedPoints: number[] = [projectDateOrdinal(project?.start_date), ...tasks.flatMap((task: any) => [projectDateOrdinal(task?.start_date), projectDateOrdinal(getProjectTaskConstraint(task).date)])].filter((value): value is number => value != null)
  const base = datedPoints.length ? Math.min(...datedPoints) : 0
  const duration = new Map<string, number>(ids.map((id): [string, number] => [id, scheduleDurationDays(project, byId.get(id))]))
  const earliest = new Map<string, number>(ids.map((id): [string, number] => {
    const planned = projectDateOrdinal(byId.get(id)?.start_date)
    return [id, normalizeProjectWorkingOrdinal(project, planned == null ? base : Math.max(base, planned), 1)]
  }))
  for (const id of order) {
    const task = byId.get(id); const d = duration.get(id) || 1; earliest.set(id, applyConstraintFloor(project, task, earliest.get(id) ?? base, d))
    for (const edge of successors.get(id) || []) {
      const succDuration = duration.get(edge.id) || 1; const candidate = edgeSuccessorStartFromPredecessorStart(project, earliest.get(id) ?? base, d, succDuration, edge.dep)
      if (candidate > (earliest.get(edge.id) ?? base)) earliest.set(edge.id, candidate)
    }
  }
  const makespanFinish = Math.max(...ids.map((id) => scheduleFinishFromStart(project, earliest.get(id) ?? base, duration.get(id) || 1)))
  const latest = new Map<string, number>(ids.map((id): [string, number] => [id, scheduleStartFromFinish(project, makespanFinish, duration.get(id) || 1)]))
  for (const id of [...order].reverse()) {
    const task = byId.get(id); const d = duration.get(id) || 1; latest.set(id, applyConstraintCeiling(project, task, latest.get(id) ?? base, d))
    for (const edge of successors.get(id) || []) {
      const candidate = shiftProjectScheduleOrdinal(project, latest.get(edge.id) ?? makespanFinish, -dependencyOffset(d, duration.get(edge.id) || 1, edge.dep))
      if (candidate < (latest.get(id) ?? makespanFinish)) latest.set(id, candidate)
    }
    latest.set(id, applyConstraintCeiling(project, task, latest.get(id) ?? base, d))
  }
  const cycleIds = cycle ? new Set(ids.filter((id) => !order.includes(id))) : new Set<string>()
  const rows: ProjectScheduleAnalysisRow[] = ids.map((id) => {
    const task = byId.get(id); const d = duration.get(id) || 1; const es = earliest.get(id) ?? base; const ef = scheduleFinishFromStart(project, es, d); const ls = latest.get(id) ?? es; const lf = scheduleFinishFromStart(project, ls, d); const slack = scheduleDistanceDays(project, es, ls); const violation = taskConstraintViolation(project, task, es, ef)
    return { id, name: String(task?.name || id), durationDays: d, earliestStart: es, earliestFinish: ef, latestStart: ls, latestFinish: lf, slackDays: slack, critical: !cycleIds.has(id) && !violation && slack === 0, cycle: cycleIds.has(id), constraintViolation: violation }
  })
  return { rows, cycle, makespanDays: Math.max(1, scheduleDistanceDays(project, base, makespanFinish) + 1), criticalTaskIds: new Set(rows.filter((row) => row.critical).map((row) => row.id)) }
}

const shiftTaskDates = (project: any, task: any, delta: number) => {
  if (!delta) return task
  const start = projectDateOrdinal(task?.start_date); const end = projectDateOrdinal(task?.end_date)
  if (start == null && end == null) return task
  return { ...task, start_date: start == null ? task?.start_date : projectOrdinalDate(shiftProjectScheduleOrdinal(project, start, delta)), end_date: end == null ? task?.end_date : projectOrdinalDate(shiftProjectScheduleOrdinal(project, end, delta)) }
}

const edgeRequiredSuccessorStart = (project: any, pred: any, succ: any, dep: ProjectTaskDependencyV2): number | null => {
  const predStart = projectDateOrdinal(pred?.start_date); const succDuration = scheduleDurationDays(project, succ); const predDuration = scheduleDurationDays(project, pred)
  if (predStart == null) return null
  return edgeSuccessorStartFromPredecessorStart(project, predStart, predDuration, succDuration, dep)
}

export const simulateNamedProjectScenario = (project: any, taskId: number | string, slipDays: number) => {
  const target = String(taskId); const delta = Math.round(Number(slipDays) || 0); const byId = taskIndex(project)
  if (!byId.has(target) || !delta) return { project, affected: [] as string[], finishDeltaDays: 0, constraintViolations: [] as Array<{ id: string; violation: string }>, cycle: false }
  let next = { ...project, tasks: projectTasks(project).map((task: any) => String(task?.id) === target ? shiftTaskDates(project, task, delta) : task) }
  const affected = new Set<string>([target]); const maxPasses = Math.max(1, projectTasks(project).length + 2)
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let changed = false; const index = taskIndex(next)
    for (const succ of projectTasks(next)) {
      const succId = String(succ?.id); const succStart = projectDateOrdinal(succ?.start_date); if (succStart == null) continue
      let required = succStart
      for (const dep of normalizeProjectTaskDependencies(succ)) {
        const pred = index.get(dep.id); if (!pred) continue
        const candidate = edgeRequiredSuccessorStart(next, pred, succ, dep); if (candidate != null) required = Math.max(required, candidate)
      }
      required = applyConstraintFloor(next, succ, required, scheduleDurationDays(next, succ))
      if (required > succStart) {
        const shift = scheduleDistanceDays(next, succStart, required); next = { ...next, tasks: projectTasks(next).map((task: any) => String(task?.id) === succId ? shiftTaskDates(next, task, shift) : task) }; affected.add(succId); changed = true
      }
    }
    if (!changed) break
  }
  const analysis = analyzeProjectSchedule(next); const index = taskIndex(next)
  const constraintViolations = projectTasks(next).flatMap((task: any) => {
    const start = projectDateOrdinal(task?.start_date); const finish = projectDateOrdinal(task?.end_date); const violation = taskConstraintViolation(next, task, start, finish)
    return violation ? [{ id: String(task?.id), violation }] : []
  })
  const oldFinish = Math.max(...projectTasks(project).map((task: any) => projectDateOrdinal(task?.end_date) ?? -Infinity)); const newFinish = Math.max(...projectTasks(next).map((task: any) => projectDateOrdinal(task?.end_date) ?? -Infinity))
  return { project: next, affected: [...affected].filter((id) => index.has(id)), finishDeltaDays: Number.isFinite(oldFinish) && Number.isFinite(newFinish) ? newFinish - oldFinish : 0, constraintViolations, cycle: analysis.cycle }
}

export const captureProjectScheduleBaselineV2 = (project: any, name = '', now = new Date()) => {
  const state = getProjectScheduleState(project); const metadata = project?.metadata_json && typeof project.metadata_json === 'object' ? project.metadata_json : {}
  const baseline: ProjectScheduleBaselineV2 = {
    id: `baseline-${now.getTime()}`,
    name: name.trim() || `Baseline ${new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(now)}`,
    captured_at: now.toISOString(),
    tasks: projectTasks(project).map((task: any) => ({ id: String(task?.id), start_date: task?.start_date || null, end_date: task?.end_date || null })),
  }
  const next = { ...project, metadata_json: { ...metadata, [PROJECT_SCHEDULE_COMPLETION_KEY]: { ...state, baselines: [baseline, ...(state.baselines || [])].slice(0, 24) } } }
  return appendScheduleHistory(next, 'Schedule baseline captured', baseline.name, now)
}

export const compareProjectScheduleBaseline = (project: any, baselineId: string) => {
  const baseline = (getProjectScheduleState(project).baselines || []).find((item) => item.id === baselineId)
  if (!baseline) return []
  const current = taskIndex(project)
  return baseline.tasks.map((saved) => {
    const task = current.get(saved.id); const oldStart = projectDateOrdinal(saved.start_date); const oldEnd = projectDateOrdinal(saved.end_date); const nextStart = projectDateOrdinal(task?.start_date); const nextEnd = projectDateOrdinal(task?.end_date)
    return { id: saved.id, name: String(task?.name || saved.id), startDeltaDays: oldStart == null || nextStart == null ? null : nextStart - oldStart, endDeltaDays: oldEnd == null || nextEnd == null ? null : nextEnd - oldEnd }
  })
}

export const saveProjectScheduleScenario = (project: any, input: { name: string; taskId: number | string; slipDays: number }, now = new Date()) => {
  const state = getProjectScheduleState(project); const metadata = project?.metadata_json && typeof project.metadata_json === 'object' ? project.metadata_json : {}; const id = `scenario-${now.getTime()}`
  const scenario: ProjectScheduleScenarioV2 = { id, name: input.name.trim() || `Scenario ${now.toISOString().slice(0, 10)}`, task_id: String(input.taskId), slip_days: Math.round(Number(input.slipDays) || 0), created_at: now.toISOString(), status: 'PROPOSED' }
  const next = { ...project, metadata_json: { ...metadata, [PROJECT_SCHEDULE_COMPLETION_KEY]: { ...state, scenarios: [scenario, ...(state.scenarios || [])].slice(0, 24) } } }
  return { project: appendScheduleHistory(next, 'Scenario saved', `${scenario.name}: ${scenario.task_id} ${scenario.slip_days >= 0 ? '+' : ''}${scenario.slip_days}d`, now), scenario }
}

export const applyProjectScheduleScenario = (project: any, scenarioId: string, now = new Date()) => {
  const state = getProjectScheduleState(project); const scenario = (state.scenarios || []).find((item) => item.id === scenarioId)
  if (!scenario || scenario.status === 'APPLIED') return { project, affected: [] as string[], finishDeltaDays: 0 }
  const simulated = simulateNamedProjectScenario(project, scenario.task_id, scenario.slip_days)
  if (simulated.cycle || simulated.constraintViolations.length) return { project, affected: [] as string[], finishDeltaDays: 0, blockedReason: simulated.cycle ? 'Scenario would operate on a cyclic schedule.' : `Scenario violates ${simulated.constraintViolations.length} task constraint(s).` }
  const metadata = simulated.project?.metadata_json && typeof simulated.project.metadata_json === 'object' ? simulated.project.metadata_json : {}
  const simulatedState = getProjectScheduleState(simulated.project)
  const scenarios = (simulatedState.scenarios || []).map((item) => item.id === scenarioId ? { ...item, status: 'APPLIED' as const, applied_at: now.toISOString() } : item)
  const next = { ...simulated.project, metadata_json: { ...metadata, [PROJECT_SCHEDULE_COMPLETION_KEY]: { ...simulatedState, scenarios } } }
  return { ...simulated, project: appendScheduleHistory(next, 'Scenario applied', `${scenario.name}: ${simulated.affected.length} task(s), finish ${simulated.finishDeltaDays >= 0 ? '+' : ''}${simulated.finishDeltaDays}d`, now) }
}

export const buildProjectCapacityView = (project: any) => {
  const state = getProjectScheduleState(project); const capacity = state.capacity_by_owner || {}; const rows = new Map<string, { owner: string; workload: number; capacity: number | null; status: 'UNKNOWN' | 'WITHIN' | 'OVER' }>()
  for (const task of projectTasks(project)) {
    if (task?.status === 'Completed') continue
    const owner = String(task?.owner || (Array.isArray(task?.owners) ? task.owners[0] : '') || 'Unassigned').trim() || 'Unassigned'
    const row = rows.get(owner) || { owner, workload: 0, capacity: null, status: 'UNKNOWN' as const }; row.workload += 1; rows.set(owner, row)
  }
  return [...rows.values()].map((row) => {
    const raw = capacity[row.owner]; const limit = Number(raw); const authoritative = raw != null && Number.isFinite(limit) && limit > 0
    return { ...row, capacity: authoritative ? limit : null, status: !authoritative ? 'UNKNOWN' as const : row.workload > limit ? 'OVER' as const : 'WITHIN' as const }
  }).sort((a, b) => b.workload - a.workload || a.owner.localeCompare(b.owner))
}
