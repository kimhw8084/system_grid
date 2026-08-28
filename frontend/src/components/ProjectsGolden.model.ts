export const PROJECT_GOLDEN_VIEWS = ['overview', 'tasks', 'timeline', 'board', 'files', 'updates', 'reports', 'insights', 'portfolio'] as const
export type ProjectGoldenView = (typeof PROJECT_GOLDEN_VIEWS)[number]
export const PROJECT_PRIMARY_VIEWS = ['overview', 'tasks', 'timeline', 'board', 'files', 'updates', 'reports', 'insights'] as const
export type ProjectPrimaryView = (typeof PROJECT_PRIMARY_VIEWS)[number]
export const PROJECT_PORTFOLIO_SECTIONS = ['control', 'roadmap', 'owners'] as const
export type ProjectPortfolioSection = (typeof PROJECT_PORTFOLIO_SECTIONS)[number]
export const PROJECT_INSIGHT_SECTIONS = ['review', 'governance'] as const
export type ProjectInsightSection = (typeof PROJECT_INSIGHT_SECTIONS)[number]
export const PROJECT_RAIL_SCOPES = ['recent', 'watched', 'active', 'all'] as const
export type ProjectRailScope = (typeof PROJECT_RAIL_SCOPES)[number]

export const PROJECT_TASK_STATUSES = ['To Do', 'In Progress', 'Blocked', 'Review', 'Completed'] as const
export type ProjectTaskStatus = (typeof PROJECT_TASK_STATUSES)[number]

export const PROJECT_SORT_MODES = ['order', 'health', 'priority', 'deadline', 'progress', 'blocked', 'value', 'name'] as const
export type ProjectSortMode = (typeof PROJECT_SORT_MODES)[number]
export const PROJECT_SWIMLANES = ['none', 'owner', 'priority', 'criticality'] as const
export type ProjectSwimlane = (typeof PROJECT_SWIMLANES)[number]
export type ProjectHealth = 'green' | 'amber' | 'red'
export type ProjectAttentionKind = 'blocked' | 'overdue' | 'due-soon' | 'unassigned' | 'high-priority' | 'review-congestion' | 'unknown-status'
export type ProjectAttentionTone = 'rose' | 'amber' | 'blue' | 'slate'

export const PROJECT_GOVERNANCE_KEY = 'project_governance_v1'
export type ProjectRaidType = 'Risk' | 'Assumption' | 'Issue' | 'Dependency'
export type ProjectRaidStatus = 'Open' | 'Mitigating' | 'Closed'
export type ProjectImpactLevel = 'Low' | 'Medium' | 'High' | 'Critical'
export type ProjectDecisionKind = 'Decision' | 'Change'
export type ProjectDecisionStatus = 'Proposed' | 'Approved' | 'Rejected' | 'Superseded'
export type ProjectGateStatus = 'Not Ready' | 'Ready' | 'Approved' | 'Blocked'

export interface ProjectGovernanceState {
  raid: any[]
  decisions: any[]
  stageGates: any[]
  reviewSnapshots: any[]
  benefitTargets: { manHoursSaved: number | null; stoplossMinutesSaved: number | null; wafersGained: number | null }
  audit: any[]
}

const DAY_MS = 86_400_000
const PROJECT_PRIORITY_RANK: Record<string, number> = { Highest: 4, High: 3, Medium: 2, Low: 1 }
const HEALTH_RANK: Record<ProjectHealth, number> = { red: 3, amber: 2, green: 1 }

const LEGACY_PROJECT_VIEW_ALIASES: Record<string, ProjectGoldenView> = {
  workspace: 'timeline',
  roadmap: 'portfolio',
  owners: 'portfolio',
  review: 'insights',
  governance: 'insights',
}

export const resolveProjectGoldenView = (value?: string | null): ProjectGoldenView => {
  const normalized = String(value || '').trim().toLowerCase()
  if (PROJECT_GOLDEN_VIEWS.includes(normalized as ProjectGoldenView)) return normalized as ProjectGoldenView
  return LEGACY_PROJECT_VIEW_ALIASES[normalized] || 'overview'
}

export const resolveProjectPortfolioSection = (value?: string | null, legacyView?: string | null): ProjectPortfolioSection => {
  const normalized = String(value || '').trim().toLowerCase()
  if (PROJECT_PORTFOLIO_SECTIONS.includes(normalized as ProjectPortfolioSection)) return normalized as ProjectPortfolioSection
  if (legacyView === 'roadmap') return 'roadmap'
  if (legacyView === 'owners') return 'owners'
  return 'control'
}

export const resolveProjectInsightSection = (value?: string | null, legacyView?: string | null): ProjectInsightSection => {
  const normalized = String(value || '').trim().toLowerCase()
  if (PROJECT_INSIGHT_SECTIONS.includes(normalized as ProjectInsightSection)) return normalized as ProjectInsightSection
  return legacyView === 'governance' ? 'governance' : 'review'
}

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
    owner: project?.owner,
    start_date: project?.start_date,
    end_date: project?.end_date,
    target_date: project?.target_date,
    man_hours_saved: project?.man_hours_saved,
    stoploss_minutes_saved: project?.stoploss_minutes_saved,
    wafers_gained: project?.wafers_gained,
    governance: project?.metadata_json?.[PROJECT_GOVERNANCE_KEY] || null,
    tasks: (project?.tasks || []).map((task: any) => ({ id: task?.id, status: task?.status, progress: task?.progress, owner: task?.owner, start_date: task?.start_date, end_date: task?.end_date, name: task?.name, priority: task?.priority, dependencies_json: task?.dependencies_json })),
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
  const forecast = getProjectForecast(project, now)
  return {
    projectId: project.id,
    projectName: project.name,
    health: getProjectHealth(project, now),
    progress: getProjectExecutionProgress(project),
    startOrdinal: calendarOrdinal(project?.start_date) ?? (ordinals.length ? Math.min(...ordinals) : null),
    endOrdinal: calendarOrdinal(project?.end_date) ?? (ordinals.length ? Math.max(...ordinals) : null),
    forecastEndOrdinal: forecast.forecastFinishOrdinal,
    forecastVarianceDays: forecast.varianceVsPlanDays,
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


const ordinalToDate = (ordinal: number | null): string | null => ordinal == null ? null : new Date(ordinal * DAY_MS).toISOString().slice(0, 10)
const numericOrNull = (value: any): number | null => {
  if (value === '' || value == null) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export const getProjectGovernance = (project: any): ProjectGovernanceState => {
  const raw = project?.metadata_json?.[PROJECT_GOVERNANCE_KEY] || {}
  const targets = raw?.benefitTargets || {}
  return {
    raid: Array.isArray(raw?.raid) ? raw.raid : [],
    decisions: Array.isArray(raw?.decisions) ? raw.decisions : [],
    stageGates: Array.isArray(raw?.stageGates) ? raw.stageGates : [],
    reviewSnapshots: Array.isArray(raw?.reviewSnapshots) ? raw.reviewSnapshots : [],
    benefitTargets: {
      manHoursSaved: numericOrNull(targets?.manHoursSaved),
      stoplossMinutesSaved: numericOrNull(targets?.stoplossMinutesSaved),
      wafersGained: numericOrNull(targets?.wafersGained),
    },
    audit: Array.isArray(raw?.audit) ? raw.audit : [],
  }
}

const withGovernanceState = (project: any, governance: ProjectGovernanceState) => ({
  ...project,
  metadata_json: { ...(project?.metadata_json || {}), [PROJECT_GOVERNANCE_KEY]: governance },
})

const auditGovernance = (governance: ProjectGovernanceState, action: string, detail: string, at: string) => ({
  ...governance,
  audit: [{ id: `${at}-${action}`, at, action, detail }, ...governance.audit].slice(0, 80),
})

export const appendProjectAudit = (project: any, action: string, detail: string, now: Date = new Date()) => {
  const at = now.toISOString()
  return withGovernanceState(project, auditGovernance(getProjectGovernance(project), action, detail, at))
}

export const upsertRaidItem = (project: any, item: any, now: Date = new Date()) => {
  const governance = getProjectGovernance(project); const at = now.toISOString(); const id = String(item?.id || `raid-${now.getTime()}`)
  const next = { ...item, id, type: item?.type || 'Risk', status: item?.status || 'Open', impact: item?.impact || 'Medium', updated_at: at, created_at: item?.created_at || at }
  const raid = governance.raid.some((row) => String(row.id) === id) ? governance.raid.map((row) => String(row.id) === id ? next : row) : [next, ...governance.raid]
  return withGovernanceState(project, auditGovernance({ ...governance, raid }, 'RAID updated', `${next.type}: ${next.title || 'Untitled'}`, at))
}

export const upsertDecisionRecord = (project: any, item: any, now: Date = new Date()) => {
  const governance = getProjectGovernance(project); const at = now.toISOString(); const id = String(item?.id || `decision-${now.getTime()}`)
  const next = { ...item, id, kind: item?.kind || 'Decision', status: item?.status || 'Proposed', updated_at: at, created_at: item?.created_at || at }
  const decisions = governance.decisions.some((row) => String(row.id) === id) ? governance.decisions.map((row) => String(row.id) === id ? next : row) : [next, ...governance.decisions]
  return withGovernanceState(project, auditGovernance({ ...governance, decisions }, `${next.kind} updated`, next.title || 'Untitled', at))
}

export const upsertStageGate = (project: any, item: any, now: Date = new Date()) => {
  const governance = getProjectGovernance(project); const at = now.toISOString(); const id = String(item?.id || `gate-${now.getTime()}`)
  const evidence = Array.isArray(item?.evidence) ? item.evidence.map((row: any, index: number) => ({ id: String(row?.id || `${id}-e${index + 1}`), label: row?.label || String(row || ''), complete: Boolean(row?.complete) })).filter((row: any) => row.label) : []
  const next = { ...item, id, status: item?.status || 'Not Ready', evidence, updated_at: at, created_at: item?.created_at || at }
  const stageGates = governance.stageGates.some((row) => String(row.id) === id) ? governance.stageGates.map((row) => String(row.id) === id ? next : row) : [next, ...governance.stageGates]
  return withGovernanceState(project, auditGovernance({ ...governance, stageGates }, 'Stage gate updated', next.name || 'Untitled gate', at))
}

export const toggleStageGateEvidence = (project: any, gateId: string, evidenceId: string, complete: boolean, now: Date = new Date()) => {
  const governance = getProjectGovernance(project); const at = now.toISOString()
  const stageGates = governance.stageGates.map((gate) => String(gate.id) !== String(gateId) ? gate : { ...gate, evidence: (gate.evidence || []).map((row: any) => String(row.id) === String(evidenceId) ? { ...row, complete } : row), updated_at: at })
  return withGovernanceState(project, auditGovernance({ ...governance, stageGates }, 'Gate evidence changed', `${gateId}:${evidenceId}=${complete ? 'complete' : 'open'}`, at))
}

export const setProjectBenefitTargets = (project: any, targets: any, now: Date = new Date()) => {
  const governance = getProjectGovernance(project); const at = now.toISOString()
  const benefitTargets = {
    manHoursSaved: numericOrNull(targets?.manHoursSaved),
    stoplossMinutesSaved: numericOrNull(targets?.stoplossMinutesSaved),
    wafersGained: numericOrNull(targets?.wafersGained),
  }
  return withGovernanceState(project, auditGovernance({ ...governance, benefitTargets }, 'Benefit targets updated', 'Target vs realized benefits refreshed', at))
}

export const getEvidenceReadiness = (project: any) => {
  const governance = getProjectGovernance(project); const gates = governance.stageGates
  const evidence = gates.flatMap((gate: any) => Array.isArray(gate?.evidence) ? gate.evidence : [])
  const completedEvidence = evidence.filter((row: any) => Boolean(row?.complete)).length
  const approvedGates = gates.filter((gate: any) => gate?.status === 'Approved').length
  const blockedGates = gates.filter((gate: any) => gate?.status === 'Blocked').length
  return {
    gates: gates.length,
    approvedGates,
    blockedGates,
    evidence: evidence.length,
    completedEvidence,
    evidencePercent: evidence.length ? Math.round((completedEvidence / evidence.length) * 100) : (gates.length ? 0 : 100),
  }
}

export const getBenefitRealization = (project: any) => {
  const targets = getProjectGovernance(project).benefitTargets
  const rows = [
    { key: 'manHoursSaved', label: 'Hours saved', target: targets.manHoursSaved, realized: Number(project?.man_hours_saved) || 0 },
    { key: 'stoplossMinutesSaved', label: 'Stoploss min', target: targets.stoplossMinutesSaved, realized: Number(project?.stoploss_minutes_saved) || 0 },
    { key: 'wafersGained', label: 'Wafers gained', target: targets.wafersGained, realized: Number(project?.wafers_gained) || 0 },
  ]
  return rows.map((row) => ({ ...row, percent: row.target != null && row.target > 0 ? Math.round((row.realized / row.target) * 100) : null, variance: row.target == null ? null : row.realized - row.target }))
}

export interface ProjectForecastTask {
  id: number | string
  name: string
  plannedEndOrdinal: number | null
  forecastStartOrdinal: number
  forecastEndOrdinal: number
  delayDays: number
  critical: boolean
}

export const getProjectForecast = (project: any, now: Date = new Date(), slipByTask: Record<string, number> = {}) => {
  const tasks = Array.isArray(project?.tasks) ? project.tasks : []
  const today = calendarOrdinal(now) ?? 0
  const taskById = new Map(tasks.map((task: any) => [String(task?.id), task]))
  const critical = getCriticalTaskIds(project)
  const memo = new Map<string, ProjectForecastTask>()
  const visiting = new Set<string>()
  const calculate = (task: any): ProjectForecastTask => {
    const key = String(task?.id)
    const cached = memo.get(key); if (cached) return cached
    const plannedStart = calendarOrdinal(task?.start_date)
    const plannedEnd = calendarOrdinal(task?.end_date)
    const duration = plannedStart != null && plannedEnd != null ? Math.max(1, plannedEnd - plannedStart + 1) : 1
    const remainingRatio = task?.status === 'Completed' ? 0 : Math.max(0.05, (100 - getTaskProgress(task)) / 100)
    const remainingDays = task?.status === 'Completed' ? 0 : Math.max(1, Math.ceil(duration * remainingRatio))
    if (visiting.has(key)) {
      const fallbackEnd = plannedEnd ?? today
      const fallback = { id: task.id, name: task?.name || 'Unnamed task', plannedEndOrdinal: plannedEnd, forecastStartOrdinal: plannedStart ?? today, forecastEndOrdinal: fallbackEnd, delayDays: plannedEnd == null ? 0 : Math.max(0, fallbackEnd - plannedEnd), critical: critical.has(task.id) }
      memo.set(key, fallback); return fallback
    }
    visiting.add(key)
    const deps = (Array.isArray(task?.dependencies_json) ? task.dependencies_json : []).map((dep: any) => taskById.get(String(dep?.id ?? dep?.task_id ?? dep))).filter(Boolean) as any[]
    const dependencyEnd = deps.length ? Math.max(...deps.map((dep) => calculate(dep).forecastEndOrdinal)) : null
    let forecastStart = Math.max(today, plannedStart ?? today, dependencyEnd == null ? -Infinity : dependencyEnd + 1)
    if (task?.status === 'Completed') forecastStart = plannedStart ?? plannedEnd ?? today
    let forecastEnd = task?.status === 'Completed' ? (plannedEnd ?? forecastStart) : forecastStart + remainingDays - 1
    if (plannedEnd != null) forecastEnd = Math.max(plannedEnd, forecastEnd)
    forecastEnd += Math.max(0, Math.round(Number(slipByTask[key]) || 0))
    const row = { id: task.id, name: task?.name || 'Unnamed task', plannedEndOrdinal: plannedEnd, forecastStartOrdinal: forecastStart, forecastEndOrdinal: forecastEnd, delayDays: plannedEnd == null ? 0 : Math.max(0, forecastEnd - plannedEnd), critical: critical.has(task.id) }
    visiting.delete(key); memo.set(key, row); return row
  }
  const taskForecasts = tasks.map(calculate)
  const plannedFinishOrdinal = calendarOrdinal(project?.end_date || project?.target_date) ?? (taskForecasts.length ? Math.max(...taskForecasts.map((row) => row.plannedEndOrdinal ?? row.forecastEndOrdinal)) : null)
  const baselineFinishOrdinal = calendarOrdinal(project?.metadata_json?.baseline_end_date || project?.baseline_end_date)
  const forecastFinishOrdinal = taskForecasts.length ? Math.max(...taskForecasts.map((row) => row.forecastEndOrdinal)) : plannedFinishOrdinal
  const drivers = [...taskForecasts].filter((row) => row.delayDays > 0).sort((a, b) => (Number(b.critical) - Number(a.critical)) || b.delayDays - a.delayDays).slice(0, 5)
  return {
    plannedFinishOrdinal,
    baselineFinishOrdinal,
    forecastFinishOrdinal,
    plannedFinish: ordinalToDate(plannedFinishOrdinal),
    baselineFinish: ordinalToDate(baselineFinishOrdinal),
    forecastFinish: ordinalToDate(forecastFinishOrdinal),
    varianceVsPlanDays: plannedFinishOrdinal == null || forecastFinishOrdinal == null ? null : forecastFinishOrdinal - plannedFinishOrdinal,
    varianceVsBaselineDays: baselineFinishOrdinal == null || forecastFinishOrdinal == null ? null : forecastFinishOrdinal - baselineFinishOrdinal,
    tasks: taskForecasts,
    drivers,
  }
}

export const simulateProjectScenario = (project: any, taskId: number | string, slipDays: number, now: Date = new Date()) => {
  const base = getProjectForecast(project, now)
  const scenario = getProjectForecast(project, now, { [String(taskId)]: Math.max(0, Math.round(Number(slipDays) || 0)) })
  const baseById = new Map<string, ProjectForecastTask>(base.tasks.map((row: ProjectForecastTask) => [String(row.id), row]))
  const affected = scenario.tasks.filter((row) => row.forecastEndOrdinal > (baseById.get(String(row.id))?.forecastEndOrdinal ?? row.forecastEndOrdinal)).map((row) => ({ ...row, additionalDelayDays: row.forecastEndOrdinal - (baseById.get(String(row.id))?.forecastEndOrdinal ?? row.forecastEndOrdinal) }))
  return {
    baseForecastFinish: base.forecastFinish,
    scenarioForecastFinish: scenario.forecastFinish,
    finishDeltaDays: base.forecastFinishOrdinal == null || scenario.forecastFinishOrdinal == null ? 0 : scenario.forecastFinishOrdinal - base.forecastFinishOrdinal,
    affected,
  }
}

const compactSnapshotTask = (task: any) => ({ id: task?.id, name: task?.name || 'Unnamed task', status: task?.status || '', owner: getTaskOwnerLabel(task), end_date: task?.end_date || null, priority: task?.priority || 'Medium', progress: getTaskProgress(task) })

export const captureProjectReviewSnapshot = (project: any, note = '', now: Date = new Date()) => {
  const governance = getProjectGovernance(project); const at = now.toISOString(); const forecast = getProjectForecast(project, now); const health = getProjectHealth(project, now)
  const snapshot = {
    id: `review-${now.getTime()}`,
    captured_at: at,
    note,
    status: project?.status || '',
    priority: project?.priority || '',
    progress: getProjectExecutionProgress(project),
    health: health.level,
    forecast_finish: forecast.forecastFinish,
    evidence_readiness: getEvidenceReadiness(project).evidencePercent,
    benefits: { man_hours_saved: Number(project?.man_hours_saved) || 0, stoploss_minutes_saved: Number(project?.stoploss_minutes_saved) || 0, wafers_gained: Number(project?.wafers_gained) || 0 },
    tasks: (project?.tasks || []).map(compactSnapshotTask),
  }
  const reviewSnapshots = [snapshot, ...governance.reviewSnapshots].slice(0, 24)
  return withGovernanceState(project, auditGovernance({ ...governance, reviewSnapshots }, 'Review snapshot captured', note || 'Weekly project review baseline', at))
}

export const buildProjectChangeIntelligence = (project: any, now: Date = new Date()) => {
  const governance = getProjectGovernance(project); const snapshot = governance.reviewSnapshots[0]
  if (!snapshot) return { hasSnapshot: false, snapshot: null, changes: [] as any[], progressDelta: null as number | null, forecastDeltaDays: null as number | null }
  const changes: any[] = []
  const previousTasks = new Map((snapshot.tasks || []).map((task: any) => [String(task.id), task]))
  const currentTasks = new Map((project?.tasks || []).map((task: any) => [String(task.id), compactSnapshotTask(task)]))
  currentTasks.forEach((task: any, id) => {
    const before: any = previousTasks.get(id)
    if (!before) { changes.push({ kind: 'added', tone: 'blue', label: `Added task · ${task.name}` }); return }
    if (before.status !== task.status) changes.push({ kind: task.status === 'Blocked' ? 'newly-blocked' : before.status === 'Completed' && task.status !== 'Completed' ? 'reopened' : 'status', tone: task.status === 'Blocked' || before.status === 'Completed' ? 'rose' : task.status === 'Completed' ? 'emerald' : 'blue', label: `${task.name} · ${before.status || 'blank'} → ${task.status || 'blank'}` })
    if (before.owner !== task.owner) changes.push({ kind: 'owner', tone: 'slate', label: `${task.name} · owner ${before.owner} → ${task.owner}` })
    if (before.end_date !== task.end_date) changes.push({ kind: 'date', tone: 'amber', label: `${task.name} · due ${before.end_date || 'none'} → ${task.end_date || 'none'}` })
    if (before.priority !== task.priority) changes.push({ kind: 'priority', tone: 'amber', label: `${task.name} · priority ${before.priority} → ${task.priority}` })
  })
  previousTasks.forEach((task: any, id) => { if (!currentTasks.has(id)) changes.push({ kind: 'removed', tone: 'slate', label: `Removed task · ${task.name}` }) })
  if (snapshot.status !== project?.status) changes.push({ kind: 'project-status', tone: 'blue', label: `Project status · ${snapshot.status} → ${project?.status}` })
  if (snapshot.priority !== project?.priority) changes.push({ kind: 'project-priority', tone: 'amber', label: `Project priority · ${snapshot.priority} → ${project?.priority}` })
  const progress = getProjectExecutionProgress(project)
  const progressDelta = progress - Number(snapshot.progress || 0)
  const forecast = getProjectForecast(project, now)
  const snapshotForecast = calendarOrdinal(snapshot.forecast_finish)
  const forecastDeltaDays = snapshotForecast == null || forecast.forecastFinishOrdinal == null ? null : forecast.forecastFinishOrdinal - snapshotForecast
  return { hasSnapshot: true, snapshot, changes, progressDelta, forecastDeltaDays }
}


export const buildProjectRailRows = (
  projects: any[],
  scope: ProjectRailScope,
  search: string,
  watchedIds: Array<number | string> = [],
  recentIds: Array<number | string> = [],
) => {
  const query = String(search || '').trim().toLowerCase()
  const watched = new Set(watchedIds.map(String))
  const recentOrder = new Map(recentIds.map((id, index) => [String(id), index]))
  const rows = (projects || []).filter((project: any) => {
    const searchable = [project?.name, project?.objective, project?.problem_statement, project?.owner, ...(project?.owners || [])]
      .filter(Boolean).join(' ').toLowerCase()
    if (query && !searchable.includes(query)) return false
    if (scope === 'watched' && !watched.has(String(project?.id))) return false
    if (scope === 'recent' && !recentOrder.has(String(project?.id))) return false
    if (scope === 'active' && !isOpenProject(project)) return false
    return true
  })
  if (scope === 'recent') return rows.sort((a: any, b: any) => (recentOrder.get(String(a.id)) ?? 9999) - (recentOrder.get(String(b.id)) ?? 9999))
  return rows.sort((a: any, b: any) => {
    const aOpen = isOpenProject(a) ? 0 : 1; const bOpen = isOpenProject(b) ? 0 : 1
    if (aOpen !== bOpen) return aOpen - bOpen
    return (a?.order_index || 0) - (b?.order_index || 0) || String(a?.name || '').localeCompare(String(b?.name || ''))
  })
}

export const buildProjectOverview = (project: any, now: Date = new Date()) => {
  const tasks = Array.isArray(project?.tasks) ? project.tasks : []
  const openTasks = tasks.filter((task: any) => task?.status !== 'Completed')
  const criticalIds = getCriticalTaskIds(project)
  const health = getProjectHealth(project, now)
  const milestones = getProjectMilestones(project, now)
  const nextMilestone = milestones.find((milestone) => milestone.status !== 'Completed') || null
  const forecast = getProjectForecast(project, now)
  const evidence = getEvidenceReadiness(project)
  const blockers = openTasks
    .filter((task: any) => task?.status === 'Blocked' || (getDaysToDue(task?.end_date, now) ?? 0) < 0)
    .sort((a: any, b: any) => {
      if (a.status === 'Blocked' && b.status !== 'Blocked') return -1
      if (b.status === 'Blocked' && a.status !== 'Blocked') return 1
      return (getDaysToDue(a?.end_date, now) ?? 9999) - (getDaysToDue(b?.end_date, now) ?? 9999)
    })
  const nextActions = openTasks
    .slice()
    .sort((a: any, b: any) => {
      const aCritical = criticalIds.has(a.id) ? 0 : 1; const bCritical = criticalIds.has(b.id) ? 0 : 1
      if (aCritical !== bCritical) return aCritical - bCritical
      const aDue = getDaysToDue(a?.end_date, now); const bDue = getDaysToDue(b?.end_date, now)
      return (aDue == null ? 9999 : aDue) - (bDue == null ? 9999 : bDue)
    })
  const governance = getProjectGovernance(project)
  const recentChanges = governance.audit.slice(0, 8)
  return {
    progress: getProjectExecutionProgress(project),
    health,
    forecast,
    evidence,
    milestones,
    nextMilestone,
    blockers,
    nextActions,
    recentChanges,
    openTasks: openTasks.length,
    completedTasks: tasks.length - openTasks.length,
    criticalTasks: criticalIds.size,
  }
}

export const buildProjectReportSummary = (project: any, now: Date = new Date()) => {
  const overview = buildProjectOverview(project, now)
  const change = buildProjectChangeIntelligence(project, now)
  const benefits = getBenefitRealization(project)
  return {
    projectId: project?.id,
    name: project?.name || 'Untitled project',
    objective: project?.objective || project?.problem_statement || '',
    status: project?.status || 'Not Started',
    priority: project?.priority || 'Medium',
    progress: overview.progress,
    health: overview.health,
    plannedFinish: overview.forecast.plannedFinish,
    forecastFinish: overview.forecast.forecastFinish,
    varianceDays: overview.forecast.varianceVsPlanDays,
    nextMilestone: overview.nextMilestone,
    blockers: overview.blockers.slice(0, 8),
    nextActions: overview.nextActions.slice(0, 8),
    recentChanges: change.hasSnapshot ? change.changes.slice(0, 8) : overview.recentChanges,
    evidence: overview.evidence,
    benefits,
  }
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
