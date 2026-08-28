export const PROJECT_GOLDEN_VIEWS = ['portfolio', 'board', 'roadmap', 'owners', 'review', 'workspace'] as const
export type ProjectGoldenView = (typeof PROJECT_GOLDEN_VIEWS)[number]

export const PROJECT_TASK_STATUSES = ['To Do', 'In Progress', 'Blocked', 'Review', 'Completed'] as const
export type ProjectTaskStatus = (typeof PROJECT_TASK_STATUSES)[number]

export const PROJECT_SORT_MODES = ['order', 'health', 'priority', 'deadline', 'progress', 'blocked', 'value', 'name'] as const
export type ProjectSortMode = (typeof PROJECT_SORT_MODES)[number]
export const PROJECT_SWIMLANES = ['none', 'owner', 'priority', 'criticality'] as const
export type ProjectSwimlane = (typeof PROJECT_SWIMLANES)[number]
export type ProjectHealth = 'green' | 'amber' | 'red'
export type ProjectAttentionKind = 'blocked' | 'overdue' | 'due-soon' | 'unassigned' | 'high-priority' | 'review-congestion' | 'unknown-status'
export type ProjectAttentionTone = 'rose' | 'amber' | 'blue' | 'slate'

const DAY_MS = 86_400_000
const PROJECT_PRIORITY_RANK: Record<string, number> = { Highest: 4, High: 3, Medium: 2, Low: 1 }
const HEALTH_RANK: Record<ProjectHealth, number> = { red: 3, amber: 2, green: 1 }

export const resolveProjectGoldenView = (value?: string | null): ProjectGoldenView => (
  PROJECT_GOLDEN_VIEWS.includes(value as ProjectGoldenView) ? value as ProjectGoldenView : 'portfolio'
)

export const normalizeProjectFilterValue = (value?: string | null) => {
  const normalized = String(value ?? '').trim()
  return !normalized || normalized.toLowerCase() === 'all' ? 'ALL' : normalized
}

export const normalizeTaskStatus = (value?: string | null): ProjectTaskStatus | 'Unknown' => (
  PROJECT_TASK_STATUSES.includes(value as ProjectTaskStatus) ? value as ProjectTaskStatus : 'Unknown'
)

const dateParts = (value?: string | Date | null): [number, number, number] | null => {
  if (!value) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return [value.getFullYear(), value.getMonth() + 1, value.getDate()]
  }
  const text = String(value).trim()
  const isoCalendar = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (isoCalendar) {
    const y = Number(isoCalendar[1]); const m = Number(isoCalendar[2]); const d = Number(isoCalendar[3])
    const stamp = Date.UTC(y, m - 1, d)
    const check = new Date(stamp)
    if (check.getUTCFullYear() === y && check.getUTCMonth() + 1 === m && check.getUTCDate() === d) return [y, m, d]
    return null
  }
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return null
  return [parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()]
}

const calendarOrdinal = (value?: string | Date | null) => {
  const parts = dateParts(value)
  return parts ? Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / DAY_MS) : null
}

export const getDaysToDue = (value?: string | null, now: Date = new Date()): number | null => {
  const due = calendarOrdinal(value)
  const today = calendarOrdinal(now)
  return due == null || today == null ? null : due - today
}

export const getTaskProgress = (task: any): number => {
  if (task?.status === 'Completed') return 100
  const subtasks = Array.isArray(task?.metadata_json?.subtasks) ? task.metadata_json.subtasks : []
  if (subtasks.length) {
    const completed = subtasks.filter((subtask: any) => Boolean(subtask?.completed)).length
    return Math.round((completed / subtasks.length) * 100)
  }
  const progress = Number(task?.progress)
  if (!Number.isFinite(progress)) {
    if (task?.status === 'Review') return 90
    if (task?.status === 'In Progress') return 50
    return 0
  }
  return Math.max(0, Math.min(99, Math.round(progress)))
}

export const getProjectExecutionProgress = (project: any): number => {
  const tasks = Array.isArray(project?.tasks) ? project.tasks : []
  if (!tasks.length) return project?.status === 'Completed' ? 100 : 0
  return Math.round(tasks.reduce((sum: number, task: any) => sum + getTaskProgress(task), 0) / tasks.length)
}

export const getTaskOwnerLabel = (task: any): string => {
  const explicit = typeof task?.owner === 'string' ? task.owner.trim() : ''
  if (explicit) return explicit
  const owners = Array.isArray(task?.owners) ? task.owners.map((item: any) => String(item).trim()).filter(Boolean) : []
  return owners.length ? owners.join(', ') : 'Unassigned'
}

export const isOpenProject = (project: any) => !['Completed', 'Cancelled'].includes(project?.status)

const openTasksFor = (project: any) => (Array.isArray(project?.tasks) ? project.tasks : []).filter((task: any) => task?.status !== 'Completed')

export const getCriticalTaskIds = (project: any): Set<number | string> => {
  const tasks = Array.isArray(project?.tasks) ? project.tasks : []
  const taskById = new Map(tasks.map((task: any) => [String(task.id), task]))
  const scheduled = tasks
    .filter((task: any) => task?.end_date && calendarOrdinal(task.end_date) != null)
    .sort((a: any, b: any) => (calendarOrdinal(a.end_date) ?? 0) - (calendarOrdinal(b.end_date) ?? 0))
  if (!scheduled.length) return new Set()
  const critical = new Set<number | string>()
  const visit = (task: any, seen = new Set<string>()) => {
    const id = String(task?.id)
    if (!id || seen.has(id)) return
    seen.add(id); critical.add(task.id)
    const dependencies = Array.isArray(task?.dependencies_json) ? task.dependencies_json : []
    const predecessors = dependencies
      .map((dep: any) => taskById.get(String(dep?.id ?? dep?.task_id ?? dep)))
      .filter(Boolean)
      .sort((a: any, b: any) => (calendarOrdinal(b.end_date) ?? -Infinity) - (calendarOrdinal(a.end_date) ?? -Infinity))
    if (predecessors[0]) visit(predecessors[0], seen)
  }
  visit(scheduled[scheduled.length - 1])
  return critical
}

export interface ProjectMilestoneSummary {
  id: number | string
  name: string
  status: string
  owner: string
  dueAt: string | null
  daysToDue: number | null
  progress: number
  blocked: boolean
  overdue: boolean
}

export const getProjectMilestones = (project: any, now: Date = new Date()): ProjectMilestoneSummary[] => {
  const tasks = Array.isArray(project?.tasks) ? project.tasks : []
  const explicit = tasks.filter((task: any) => (
    task?.type === 'Milestone' || task?.metadata_json?.milestone === true || task?.metadata_json?.is_milestone === true
  ))
  const source = explicit.length ? explicit : tasks.filter((task: any) => task?.end_date)
  return source
    .filter((task: any) => calendarOrdinal(task?.end_date) != null)
    .sort((a: any, b: any) => (calendarOrdinal(a.end_date) ?? 0) - (calendarOrdinal(b.end_date) ?? 0))
    .map((task: any) => {
      const daysToDue = getDaysToDue(task.end_date, now)
      return {
        id: task.id,
        name: task.name || 'Unnamed checkpoint',
        status: task.status || 'To Do',
        owner: getTaskOwnerLabel(task),
        dueAt: task.end_date || null,
        daysToDue,
        progress: getTaskProgress(task),
        blocked: task.status === 'Blocked',
        overdue: task.status !== 'Completed' && daysToDue != null && daysToDue < 0,
      }
    })
}

export const getScheduleVarianceDays = (project: any): number | null => {
  const current = project?.end_date || project?.target_date || project?.metadata_json?.forecast_end_date
  const baseline = project?.metadata_json?.baseline_end_date || project?.baseline_end_date
  const currentOrdinal = calendarOrdinal(current)
  const baselineOrdinal = calendarOrdinal(baseline)
  if (currentOrdinal == null || baselineOrdinal == null) return null
  return currentOrdinal - baselineOrdinal
}

export interface ProjectHealthSummary {
  level: ProjectHealth
  score: number
  reasons: string[]
  blocked: number
  overdue: number
  dueSoon: number
  unassigned: number
  review: number
  critical: number
  blockedCritical: number
  milestoneRisk: number
  scheduleVarianceDays: number | null
}

export const getProjectHealth = (project: any, now: Date = new Date()): ProjectHealthSummary => {
  const openTasks = openTasksFor(project)
  const criticalIds = getCriticalTaskIds(project)
  const blocked = openTasks.filter((task: any) => task?.status === 'Blocked').length
  const overdue = openTasks.filter((task: any) => (getDaysToDue(task?.end_date, now) ?? 0) < 0).length
  const dueSoon = openTasks.filter((task: any) => { const d = getDaysToDue(task?.end_date, now); return d != null && d >= 0 && d <= 3 }).length
  const unassigned = openTasks.filter((task: any) => getTaskOwnerLabel(task) === 'Unassigned').length
  const review = openTasks.filter((task: any) => task?.status === 'Review').length
  const critical = openTasks.filter((task: any) => criticalIds.has(task.id)).length
  const blockedCritical = openTasks.filter((task: any) => criticalIds.has(task.id) && task?.status === 'Blocked').length
  const milestones = getProjectMilestones(project, now)
  const milestoneRisk = milestones.filter((item) => item.blocked || item.overdue).length
  const scheduleVarianceDays = getScheduleVarianceDays(project)
  const reasons: string[] = []
  let score = 0
  if (blockedCritical) { score += 5; reasons.push(`${blockedCritical} blocked critical task${blockedCritical === 1 ? '' : 's'}`) }
  if (blocked) { score += Math.min(4, blocked * 2); reasons.push(`${blocked} blocked open task${blocked === 1 ? '' : 's'}`) }
  if (overdue) { score += Math.min(4, overdue * 2); reasons.push(`${overdue} overdue task${overdue === 1 ? '' : 's'}`) }
  if (milestoneRisk) { score += 3; reasons.push(`${milestoneRisk} milestone/checkpoint${milestoneRisk === 1 ? '' : 's'} at risk`) }
  if (scheduleVarianceDays != null && scheduleVarianceDays > 0) { score += scheduleVarianceDays >= 7 ? 4 : 2; reasons.push(`${scheduleVarianceDays}d schedule variance`) }
  if (unassigned) { score += Math.min(2, unassigned); reasons.push(`${unassigned} unassigned open task${unassigned === 1 ? '' : 's'}`) }
  if (review >= 4) { score += 2; reasons.push(`${review} tasks waiting in review`) }
  if (!reasons.length) reasons.push('No deterministic execution risk detected')
  return {
    level: score >= 7 ? 'red' : score >= 3 ? 'amber' : 'green',
    score,
    reasons,
    blocked,
    overdue,
    dueSoon,
    unassigned,
    review,
    critical,
    blockedCritical,
    milestoneRisk,
    scheduleVarianceDays,
  }
}

export interface ProjectAttentionItem {
  id: string
  projectId: number
  projectName: string
  taskId: number | string
  taskName: string
  owner: string
  dueAt: string | null
  daysToDue: number | null
  kind: ProjectAttentionKind
  tone: ProjectAttentionTone
  label: string
  reasons: ProjectAttentionKind[]
  reasonLabels: string[]
  priority: string
  severity: number
}

export const buildProjectAttentionItems = (projects: any[], now: Date = new Date()): ProjectAttentionItem[] => {
  const items: ProjectAttentionItem[] = []
  ;(projects || []).forEach((project: any) => {
    const projectId = Number(project?.id)
    if (!Number.isFinite(projectId)) return
    const projectName = project?.name || `Project ${projectId}`
    const critical = getCriticalTaskIds(project)
    ;(project?.tasks || []).forEach((task: any) => {
      if (task?.status === 'Completed') return
      const owner = getTaskOwnerLabel(task)
      const daysToDue = getDaysToDue(task?.end_date, now)
      const taskId = task?.id ?? task?.name ?? `${projectId}-${items.length}`
      const taskName = task?.name || 'Unnamed task'
      const reasons: ProjectAttentionKind[] = []
      const labels: string[] = []
      if (task?.status === 'Blocked') { reasons.push('blocked'); labels.push('Blocked execution') }
      if (daysToDue != null && daysToDue < 0) { reasons.push('overdue'); labels.push(`${Math.abs(daysToDue)}d overdue`) }
      else if (daysToDue != null && daysToDue <= 3) { reasons.push('due-soon'); labels.push(daysToDue === 0 ? 'Due today' : `Due in ${daysToDue}d`) }
      if (owner === 'Unassigned') { reasons.push('unassigned'); labels.push('No task owner') }
      if (normalizeTaskStatus(task?.status) === 'Unknown') { reasons.push('unknown-status'); labels.push('Unknown lifecycle status') }
      const highPriority = ['High', 'Highest'].includes(task?.priority) || ['High', 'Highest'].includes(project?.priority)
      if (!reasons.length && highPriority) { reasons.push('high-priority'); labels.push(`${task?.priority || project?.priority} priority`) }
      else if (highPriority) labels.push(`${task?.priority || project?.priority} priority`)
      if (!reasons.length) return
      const severity = (reasons.includes('blocked') ? 50 : 0)
        + (reasons.includes('overdue') ? 40 : 0)
        + (critical.has(task.id) ? 25 : 0)
        + (reasons.includes('unknown-status') ? 20 : 0)
        + (reasons.includes('unassigned') ? 12 : 0)
        + (reasons.includes('due-soon') ? 10 : 0)
        + (highPriority ? 8 : 0)
      const kind = reasons[0]
      const tone: ProjectAttentionTone = ['blocked', 'overdue', 'unknown-status'].includes(kind) ? 'rose' : kind === 'due-soon' ? 'amber' : kind === 'high-priority' ? 'blue' : 'slate'
      items.push({
        id: `${projectId}-${taskId}`,
        projectId,
        projectName,
        taskId,
        taskName,
        owner,
        dueAt: task?.end_date || null,
        daysToDue,
        kind,
        tone,
        label: labels[0],
        reasons,
        reasonLabels: labels,
        priority: task?.priority || project?.priority || 'Medium',
        severity,
      })
    })
  })
  return items.sort((a, b) => b.severity - a.severity || (a.daysToDue ?? 99999) - (b.daysToDue ?? 99999) || a.projectName.localeCompare(b.projectName))
}

export const diversifyAttentionItems = (items: ProjectAttentionItem[], limit = 12): ProjectAttentionItem[] => {
  if (items.length <= limit) return items
  const selected: ProjectAttentionItem[] = []
  const seenProjects = new Set<number>()
  items.forEach((item) => {
    if (selected.length < limit && !seenProjects.has(item.projectId)) {
      selected.push(item); seenProjects.add(item.projectId)
    }
  })
  items.forEach((item) => {
    if (selected.length < limit && !selected.includes(item)) selected.push(item)
  })
  return selected
}

export const buildPortfolioMetrics = (projects: any[], now: Date = new Date()) => {
  const list = Array.isArray(projects) ? projects : []
  const openProjects = list.filter(isOpenProject)
  const allTasks = list.flatMap((project: any) => (project?.tasks || []).map((task: any) => ({ task, project })))
  const openTasks = allTasks.filter(({ task }) => task?.status !== 'Completed')
  const blocked = openTasks.filter(({ task }) => task?.status === 'Blocked').length
  const overdue = openTasks.filter(({ task }) => { const d = getDaysToDue(task?.end_date, now); return d != null && d < 0 }).length
  const dueSoon = openTasks.filter(({ task }) => { const d = getDaysToDue(task?.end_date, now); return d != null && d >= 0 && d <= 3 }).length
  const owned = openTasks.filter(({ task }) => getTaskOwnerLabel(task) !== 'Unassigned').length
  const taskWeightedProgress = allTasks.length ? Math.round(allTasks.reduce((sum, row) => sum + getTaskProgress(row.task), 0) / allTasks.length) : 0
  const projectAverageProgress = list.length ? Math.round(list.reduce((sum, project) => sum + getProjectExecutionProgress(project), 0) / list.length) : 0
  const health = list.map((project) => getProjectHealth(project, now))
  return {
    projects: list.length,
    activeProjects: openProjects.length,
    tasks: allTasks.length,
    openTasks: openTasks.length,
    blocked,
    overdue,
    dueSoon,
    ownershipCoverage: openTasks.length ? Math.round((owned / openTasks.length) * 100) : 100,
    overallProgress: taskWeightedProgress,
    projectAverageProgress,
    healthRed: health.filter((item) => item.level === 'red').length,
    healthAmber: health.filter((item) => item.level === 'amber').length,
    manHoursSaved: list.reduce((sum, project) => sum + (Number(project?.man_hours_saved) || 0), 0),
    stoplossMinutesSaved: list.reduce((sum, project) => sum + (Number(project?.stoploss_minutes_saved) || 0), 0),
    wafersGained: list.reduce((sum, project) => sum + (Number(project?.wafers_gained) || 0), 0),
  }
}

export const projectFingerprint = (project: any): string => {
  const payload = {
    id: project?.id,
    updated_at: project?.updated_at || project?.updatedAt || null,
    status: project?.status,
    priority: project?.priority,
    tasks: (project?.tasks || []).map((task: any) => ({ id: task?.id, status: task?.status, progress: task?.progress, owner: task?.owner, end_date: task?.end_date, name: task?.name })),
  }
  return JSON.stringify(payload)
}

export const moveProjectTaskStatus = (project: any, taskId: number | string, status: ProjectTaskStatus) => {
  const current = (project?.tasks || []).find((task: any) => String(task?.id) === String(taskId))
  if (!current || current.status === status) return project
  return {
    ...project,
    tasks: (project?.tasks || []).map((task: any) => {
      if (String(task?.id) !== String(taskId)) return task
      const nextProgress = status === 'Completed' ? 100 : task.status === 'Completed' && Number(task.progress) >= 100 ? (status === 'Review' ? 90 : status === 'In Progress' ? 50 : 0) : task.progress
      return { ...task, status, progress: nextProgress }
    }),
  }
}

export const updateProjectTask = (project: any, taskId: number | string, patch: any) => ({
  ...project,
  tasks: (project?.tasks || []).map((task: any) => String(task?.id) === String(taskId) ? { ...task, ...patch } : task),
})

export const createProjectTask = (project: any, task: any) => ({
  ...project,
  tasks: [...(project?.tasks || []), task],
})

export const filterProjectsForGoldenView = (
  projects: any[],
  search: string,
  statusFilter: string,
  priorityFilter: string,
  sortMode: ProjectSortMode = 'order',
  watchedIds: Array<number | string> = [],
  watchedOnly = false,
  now: Date = new Date(),
) => {
  const query = search.trim().toLowerCase()
  const status = normalizeProjectFilterValue(statusFilter)
  const priority = normalizeProjectFilterValue(priorityFilter)
  const watched = new Set(watchedIds.map(String))
  const rows = [...(projects || [])].filter((project: any) => {
    const searchable = [project?.name, project?.objective, project?.problem_statement, project?.owner, ...(project?.owners || [])]
      .filter(Boolean).join(' ').toLowerCase()
    return (!query || searchable.includes(query))
      && (status === 'ALL' || project?.status === status)
      && (priority === 'ALL' || project?.priority === priority)
      && (!watchedOnly || watched.has(String(project?.id)))
  })
  const deadline = (project: any) => {
    const dates = openTasksFor(project).map((task: any) => calendarOrdinal(task?.end_date)).filter((value: any) => value != null)
    return dates.length ? Math.min(...dates) : Number.MAX_SAFE_INTEGER
  }
  return rows.sort((a, b) => {
    if (sortMode === 'name') return String(a?.name || '').localeCompare(String(b?.name || ''))
    if (sortMode === 'health') return HEALTH_RANK[getProjectHealth(b, now).level] - HEALTH_RANK[getProjectHealth(a, now).level]
    if (sortMode === 'priority') return (PROJECT_PRIORITY_RANK[b?.priority] || 0) - (PROJECT_PRIORITY_RANK[a?.priority] || 0)
    if (sortMode === 'deadline') return deadline(a) - deadline(b)
    if (sortMode === 'progress') return getProjectExecutionProgress(a) - getProjectExecutionProgress(b)
    if (sortMode === 'blocked') return getProjectHealth(b, now).blocked - getProjectHealth(a, now).blocked
    if (sortMode === 'value') return (Number(b?.man_hours_saved) || 0) - (Number(a?.man_hours_saved) || 0)
    return (a?.order_index || 0) - (b?.order_index || 0)
  })
}

export const buildOwnerWorkload = (projects: any[], now: Date = new Date()) => {
  const map = new Map<string, any>()
  ;(projects || []).forEach((project: any) => {
    const critical = getCriticalTaskIds(project)
    ;(project?.tasks || []).forEach((task: any) => {
      if (task?.status === 'Completed') return
      const owner = getTaskOwnerLabel(task)
      const row = map.get(owner) || { owner, tasks: 0, projects: new Set<number>(), overdue: 0, blocked: 0, review: 0, dueSoon: 0, critical: 0 }
      row.tasks += 1; row.projects.add(project.id)
      const days = getDaysToDue(task?.end_date, now)
      if (days != null && days < 0) row.overdue += 1
      if (days != null && days >= 0 && days <= 3) row.dueSoon += 1
      if (task?.status === 'Blocked') row.blocked += 1
      if (task?.status === 'Review') row.review += 1
      if (critical.has(task.id)) row.critical += 1
      map.set(owner, row)
    })
  })
  return Array.from(map.values()).map((row) => ({ ...row, projects: row.projects.size })).sort((a, b) => (b.blocked + b.overdue + b.critical) - (a.blocked + a.overdue + a.critical) || b.tasks - a.tasks)
}

export const buildRoadmapRows = (projects: any[], now: Date = new Date()) => (projects || []).map((project: any) => {
  const taskDates = (project?.tasks || []).flatMap((task: any) => [task?.start_date, task?.end_date]).filter((value: any) => calendarOrdinal(value) != null)
  const ordinals = taskDates.map((value: any) => calendarOrdinal(value) as number)
  const milestones = getProjectMilestones(project, now)
  return {
    projectId: project.id,
    projectName: project.name,
    health: getProjectHealth(project, now),
    progress: getProjectExecutionProgress(project),
    startOrdinal: calendarOrdinal(project?.start_date) ?? (ordinals.length ? Math.min(...ordinals) : null),
    endOrdinal: calendarOrdinal(project?.end_date) ?? (ordinals.length ? Math.max(...ordinals) : null),
    milestones,
  }
})

export const buildCrossProjectDependencies = (projects: any[]) => {
  const taskIndex = new Map<string, { projectId: number; projectName: string; task: any }>()
  ;(projects || []).forEach((project: any) => (project?.tasks || []).forEach((task: any) => taskIndex.set(String(task?.id), { projectId: Number(project.id), projectName: project.name, task })))
  const rows: any[] = []
  ;(projects || []).forEach((project: any) => (project?.tasks || []).forEach((task: any) => {
    ;(Array.isArray(task?.dependencies_json) ? task.dependencies_json : []).forEach((dependency: any) => {
      const source = taskIndex.get(String(dependency?.id ?? dependency?.task_id ?? dependency))
      if (source && source.projectId !== Number(project.id)) rows.push({
        fromProjectId: source.projectId,
        fromProjectName: source.projectName,
        fromTaskId: source.task.id,
        fromTaskName: source.task.name,
        toProjectId: Number(project.id),
        toProjectName: project.name,
        toTaskId: task.id,
        toTaskName: task.name,
      })
    })
  }))
  return rows
}

export const getMyWork = (projects: any[], owner: string, now: Date = new Date()) => {
  const normalized = owner.trim().toLowerCase()
  if (!normalized) return []
  return (projects || []).flatMap((project: any) => (project?.tasks || []).filter((task: any) => task?.status !== 'Completed' && getTaskOwnerLabel(task).toLowerCase().includes(normalized)).map((task: any) => ({
    projectId: project.id,
    projectName: project.name,
    task,
    daysToDue: getDaysToDue(task?.end_date, now),
    progress: getTaskProgress(task),
  }))).sort((a: any, b: any) => (a.daysToDue ?? 99999) - (b.daysToDue ?? 99999))
}
