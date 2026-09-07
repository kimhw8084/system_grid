export const PV1_SCHEDULE_CALCULATION_VERSION = 'pv1-schedule-1'
export type PV1DependencyType = 'FS' | 'SS' | 'FF' | 'SF'
export type PV1Calendar = { timezone: string; working_weekdays: number[]; exceptions: Array<{ date: string; working: boolean }>; revision: number }
export type PV1ScheduleTask = { id: string; title?: string; kind?: string; start_date?: string | null; end_date?: string | null; point_date?: string | null; anchor?: 'start' | 'finish'; duration_workdays?: number | null }
export type PV1ScheduleEdge = { id: string; predecessor_id: string; successor_id: string; dependency_type: PV1DependencyType; lag_days: number; active?: boolean }

const DAY = 86_400_000
export const scheduleDateOrdinal = (value: string | null | undefined): number | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10))) return null
  const timestamp = Date.parse(`${value.slice(0, 10)}T00:00:00Z`)
  return Number.isFinite(timestamp) ? Math.floor(timestamp / DAY) : null
}
export const scheduleOrdinalDate = (ordinal: number): string => new Date(Math.round(ordinal) * DAY).toISOString().slice(0, 10)
const weekday = (ordinal: number) => (new Date(ordinal * DAY).getUTCDay() + 6) % 7
const exceptionMap = (calendar: PV1Calendar) => new Map((calendar.exceptions || []).map((item) => [item.date, item.working]))

export const isProjectWorkingOrdinal = (calendar: PV1Calendar, ordinal: number): boolean => {
  const override = exceptionMap(calendar).get(scheduleOrdinalDate(ordinal))
  return override == null ? calendar.working_weekdays.includes(weekday(ordinal)) : override
}

export const normalizeProjectWorkingOrdinal = (calendar: PV1Calendar, ordinal: number, direction?: 'previous' | 'next'): number => {
  let result = Math.round(ordinal)
  if (isProjectWorkingOrdinal(calendar, result)) return result
  if (!direction) throw new Error(`${scheduleOrdinalDate(result)} is not a working date; choose previous or next.`)
  const step = direction === 'previous' ? -1 : 1
  for (let count = 0; count < 3700; count += 1) { result += step; if (isProjectWorkingOrdinal(calendar, result)) return result }
  throw new Error('No working date is available in the supported range.')
}

export const shiftProjectWorkingOrdinal = (calendar: PV1Calendar, ordinal: number, workdays: number): number => {
  let result = normalizeProjectWorkingOrdinal(calendar, ordinal)
  const step = workdays < 0 ? -1 : 1
  for (let remaining = Math.abs(Math.round(workdays)); remaining > 0;) { result += step; if (isProjectWorkingOrdinal(calendar, result)) remaining -= 1 }
  return result
}

export const projectWorkingDistance = (calendar: PV1Calendar, fromOrdinal: number, toOrdinal: number): number => {
  const from = normalizeProjectWorkingOrdinal(calendar, fromOrdinal)
  const to = normalizeProjectWorkingOrdinal(calendar, toOrdinal)
  if (from === to) return 0
  if (to < from) return -projectWorkingDistance(calendar, to, from)
  let count = 0
  for (let cursor = from + 1; cursor <= to; cursor += 1) if (isProjectWorkingOrdinal(calendar, cursor)) count += 1
  return count
}

const duration = (task: PV1ScheduleTask, calendar: PV1Calendar) => {
  if (task.kind === 'Milestone') return 0
  if (Number.isInteger(task.duration_workdays) && Number(task.duration_workdays) >= 1) return Number(task.duration_workdays)
  const start = scheduleDateOrdinal(task.start_date), finish = scheduleDateOrdinal(task.end_date)
  if (start == null || finish == null) return null
  return projectWorkingDistance(calendar, start, finish) + 1
}
const startBoundary = (task: PV1ScheduleTask, calendar: PV1Calendar) => {
  if (task.kind !== 'Milestone') return scheduleDateOrdinal(task.start_date)
  const point = scheduleDateOrdinal(task.point_date)
  return point == null ? null : task.anchor === 'finish' ? shiftProjectWorkingOrdinal(calendar, point, 1) : point
}
const requiredStart = (predStart: number, predDuration: number, successorDuration: number, edge: PV1ScheduleEdge, calendar: PV1Calendar) => {
  const predFinish = shiftProjectWorkingOrdinal(calendar, predStart, predDuration)
  if (edge.dependency_type === 'FS') return shiftProjectWorkingOrdinal(calendar, predFinish, edge.lag_days)
  if (edge.dependency_type === 'SS') return shiftProjectWorkingOrdinal(calendar, predStart, edge.lag_days)
  if (edge.dependency_type === 'FF') return shiftProjectWorkingOrdinal(calendar, predFinish, edge.lag_days - successorDuration)
  return shiftProjectWorkingOrdinal(calendar, predStart, edge.lag_days - successorDuration)
}

const topological = (tasks: PV1ScheduleTask[], edges: PV1ScheduleEdge[]) => {
  const ids = new Set(tasks.map((task) => task.id)); const incoming = new Map([...ids].map((id) => [id, 0])); const outgoing = new Map([...ids].map((id) => [id, [] as string[]]))
  for (const edge of edges.filter((item) => item.active !== false)) if (ids.has(edge.predecessor_id) && ids.has(edge.successor_id)) { incoming.set(edge.successor_id, (incoming.get(edge.successor_id) || 0) + 1); outgoing.get(edge.predecessor_id)!.push(edge.successor_id) }
  const ready = [...ids].filter((id) => incoming.get(id) === 0).sort(); const order: string[] = []
  while (ready.length) { const id = ready.shift()!; order.push(id); for (const target of outgoing.get(id)!.sort()) { incoming.set(target, incoming.get(target)! - 1); if (incoming.get(target) === 0) { ready.push(target); ready.sort() } } }
  if (order.length !== ids.size) throw new Error('Dependency graph contains a cycle.')
  return order
}

export const analyzePV1Schedule = (tasks: PV1ScheduleTask[], edges: PV1ScheduleEdge[], calendar: PV1Calendar) => {
  const byId = new Map(tasks.map((task) => [task.id, task])); const order = topological(tasks, edges); const starts = new Map<string, number>(); const durations = new Map(tasks.map((task) => [task.id, duration(task, calendar)])); const active = edges.filter((edge) => edge.active !== false)
  for (const id of order) {
    const task = byId.get(id)!; let earliest = startBoundary(task, calendar); const taskDuration = durations.get(id)
    for (const edge of active.filter((item) => item.successor_id === id).sort((a, b) => a.id.localeCompare(b.id))) {
      const predStart = starts.get(edge.predecessor_id), predDuration = durations.get(edge.predecessor_id)
      if (predStart == null || predDuration == null || taskDuration == null) continue
      const candidate = requiredStart(predStart, predDuration, taskDuration, edge, calendar); earliest = earliest == null ? candidate : Math.max(earliest, candidate)
    }
    if (earliest != null) starts.set(id, earliest)
  }
  const finishes = order.flatMap((id) => { const start = starts.get(id), taskDuration = durations.get(id); return start == null || taskDuration == null ? [] : [shiftProjectWorkingOrdinal(calendar, start, taskDuration)] })
  const completion = finishes.length ? Math.max(...finishes) : null; const latest = new Map<string, number>()
  for (const id of [...order].reverse()) {
    const predDuration = durations.get(id); if (predDuration == null || completion == null) continue
    const candidates: number[] = []
    for (const edge of active.filter((item) => item.predecessor_id === id)) {
      const succLatest = latest.get(edge.successor_id), succDuration = durations.get(edge.successor_id); if (succLatest == null || succDuration == null) continue
      if (edge.dependency_type === 'FS') candidates.push(shiftProjectWorkingOrdinal(calendar, succLatest, -edge.lag_days - predDuration))
      else if (edge.dependency_type === 'SS') candidates.push(shiftProjectWorkingOrdinal(calendar, succLatest, -edge.lag_days))
      else if (edge.dependency_type === 'FF') candidates.push(shiftProjectWorkingOrdinal(calendar, succLatest, succDuration - edge.lag_days - predDuration))
      else candidates.push(shiftProjectWorkingOrdinal(calendar, succLatest, succDuration - edge.lag_days))
    }
    latest.set(id, candidates.length ? Math.min(...candidates) : shiftProjectWorkingOrdinal(calendar, completion, -predDuration))
  }
  const rows = order.map((id) => { const earliest = starts.get(id), latestStart = latest.get(id); const slack = earliest == null || latestStart == null ? null : projectWorkingDistance(calendar, earliest, latestStart); return { task_id: id, earliest_start: earliest == null ? null : scheduleOrdinalDate(earliest), latest_start: latestStart == null ? null : scheduleOrdinalDate(latestStart), slack_workdays: slack, critical: slack === 0, negative_slack: slack != null && slack < 0 } })
  return { calculation_version: PV1_SCHEDULE_CALCULATION_VERSION, rows, critical_task_ids: rows.filter((row) => row.critical).map((row) => row.task_id) }
}

export const previewPV1Move = (tasks: PV1ScheduleTask[], edges: PV1ScheduleEdge[], calendar: PV1Calendar, taskId: string, deltaWorkdays: number) => {
  const source = tasks.find((task) => task.id === taskId); const sourceStart = source && startBoundary(source, calendar)
  if (!source || sourceStart == null) throw new Error('Selected task is not scheduled.')
  const starts = new Map(tasks.map((task) => [task.id, startBoundary(task, calendar)])); starts.set(taskId, shiftProjectWorkingOrdinal(calendar, sourceStart, deltaWorkdays))
  const byId = new Map(tasks.map((task) => [task.id, task])); const durations = new Map(tasks.map((task) => [task.id, duration(task, calendar)])); const order = topological(tasks, edges)
  for (const id of order) for (const edge of edges.filter((item) => item.active !== false && item.successor_id === id)) {
    const predStart = starts.get(edge.predecessor_id), succStart = starts.get(id), predDuration = durations.get(edge.predecessor_id), succDuration = durations.get(id)
    if (predStart == null || succStart == null || predDuration == null || succDuration == null) continue
    starts.set(id, Math.max(succStart, requiredStart(predStart, predDuration, succDuration, edge, calendar)))
  }
  return tasks.map((task) => {
    const start = starts.get(task.id), taskDuration = durations.get(task.id); if (start == null || taskDuration == null) return task
    if (task.kind === 'Milestone') { const point = task.anchor === 'finish' ? shiftProjectWorkingOrdinal(calendar, start, -1) : start; return { ...task, point_date: scheduleOrdinalDate(point) } }
    return { ...task, start_date: scheduleOrdinalDate(start), end_date: scheduleOrdinalDate(shiftProjectWorkingOrdinal(calendar, start, taskDuration - 1)) }
  })
}
