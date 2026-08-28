export const PROJECT_GOLDEN_VIEWS = ['portfolio', 'board', 'workspace'] as const
export type ProjectGoldenView = (typeof PROJECT_GOLDEN_VIEWS)[number]

export const PROJECT_TASK_STATUSES = ['To Do', 'In Progress', 'Blocked', 'Review', 'Completed'] as const
export type ProjectTaskStatus = (typeof PROJECT_TASK_STATUSES)[number]

export type ProjectAttentionTone = 'rose' | 'amber' | 'blue' | 'slate'
export type ProjectAttentionKind = 'blocked' | 'overdue' | 'due-soon' | 'unassigned' | 'high-priority'

export interface ProjectAttentionItem {
  id: string
  kind: ProjectAttentionKind
  tone: ProjectAttentionTone
  projectId: number
  projectName: string
  taskId: number | string
  taskName: string
  owner: string
  dueAt: string | null
  daysToDue: number | null
  label: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export const resolveProjectGoldenView = (value?: string | null): ProjectGoldenView => (
  PROJECT_GOLDEN_VIEWS.includes(value as ProjectGoldenView) ? value as ProjectGoldenView : 'portfolio'
)

export const normalizeProjectFilterValue = (value?: string | null) => {
  const normalized = String(value ?? '').trim()
  return !normalized || normalized.toLowerCase() === 'all' ? 'ALL' : normalized
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
  return Math.max(0, Math.min(100, Math.round(progress)))
}

export const getProjectExecutionProgress = (project: any): number => {
  const tasks = Array.isArray(project?.tasks) ? project.tasks : []
  if (!tasks.length) return project?.status === 'Completed' ? 100 : 0
  return Math.round(tasks.reduce((total: number, task: any) => total + getTaskProgress(task), 0) / tasks.length)
}

export const getDaysToDue = (value?: string | null, now: Date = new Date()): number | null => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dueDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime()
  return Math.ceil((dueDay - today) / DAY_MS)
}

export const getTaskOwnerLabel = (task: any) => {
  const explicitOwner = typeof task?.owner === 'string' ? task.owner.trim() : ''
  if (explicitOwner) return explicitOwner
  const owners = Array.isArray(task?.owners) ? task.owners.filter(Boolean) : []
  return owners.length ? owners.join(', ') : 'Unassigned'
}

export const isOpenProject = (project: any) => !['Completed', 'Cancelled'].includes(project?.status)

export const buildProjectAttentionItems = (projects: any[], now: Date = new Date()): ProjectAttentionItem[] => {
  const items: ProjectAttentionItem[] = []

  ;(projects || []).forEach((project: any) => {
    const projectId = Number(project?.id)
    if (!Number.isFinite(projectId)) return
    const projectName = project?.name || `Project ${projectId}`
    const projectPriority = project?.priority || 'Medium'

    ;(project?.tasks || []).forEach((task: any) => {
      if (task?.status === 'Completed') return
      const owner = getTaskOwnerLabel(task)
      const dueAt = task?.end_date || null
      const daysToDue = getDaysToDue(dueAt, now)
      const taskId = task?.id ?? task?.name ?? `${projectId}-${items.length}`
      const taskName = task?.name || 'Unnamed task'
      const base = { projectId, projectName, taskId, taskName, owner, dueAt, daysToDue }

      if (task?.status === 'Blocked') {
        items.push({ ...base, id: `${projectId}-${taskId}-blocked`, kind: 'blocked', tone: 'rose', label: 'Blocked execution' })
      }
      if (daysToDue != null && daysToDue < 0) {
        items.push({ ...base, id: `${projectId}-${taskId}-overdue`, kind: 'overdue', tone: 'rose', label: `${Math.abs(daysToDue)}d overdue` })
      } else if (daysToDue != null && daysToDue <= 3) {
        items.push({ ...base, id: `${projectId}-${taskId}-due-soon`, kind: 'due-soon', tone: 'amber', label: daysToDue === 0 ? 'Due today' : `Due in ${daysToDue}d` })
      }
      if (owner === 'Unassigned') {
        items.push({ ...base, id: `${projectId}-${taskId}-unassigned`, kind: 'unassigned', tone: 'slate', label: 'No task owner' })
      }
      if (['High', 'Highest'].includes(task?.priority) || ['High', 'Highest'].includes(projectPriority)) {
        items.push({ ...base, id: `${projectId}-${taskId}-priority`, kind: 'high-priority', tone: 'blue', label: `${task?.priority || projectPriority} priority` })
      }
    })
  })

  const rank: Record<ProjectAttentionKind, number> = {
    blocked: 0,
    overdue: 1,
    'due-soon': 2,
    unassigned: 3,
    'high-priority': 4,
  }
  return items.sort((a, b) => {
    if (rank[a.kind] !== rank[b.kind]) return rank[a.kind] - rank[b.kind]
    const dueA = a.daysToDue ?? Number.MAX_SAFE_INTEGER
    const dueB = b.daysToDue ?? Number.MAX_SAFE_INTEGER
    if (dueA !== dueB) return dueA - dueB
    return a.projectName.localeCompare(b.projectName)
  })
}

export const buildPortfolioMetrics = (projects: any[], now: Date = new Date()) => {
  const list = Array.isArray(projects) ? projects : []
  const openProjects = list.filter(isOpenProject)
  const tasks = list.flatMap((project: any) => (project?.tasks || []).map((task: any) => ({ task, project })))
  const openTasks = tasks.filter(({ task }) => task?.status !== 'Completed')
  const blocked = openTasks.filter(({ task }) => task?.status === 'Blocked').length
  const overdue = openTasks.filter(({ task }) => {
    const days = getDaysToDue(task?.end_date, now)
    return days != null && days < 0
  }).length
  const dueSoon = openTasks.filter(({ task }) => {
    const days = getDaysToDue(task?.end_date, now)
    return days != null && days >= 0 && days <= 3
  }).length
  const owned = openTasks.filter(({ task }) => getTaskOwnerLabel(task) !== 'Unassigned').length
  const overallProgress = list.length
    ? Math.round(list.reduce((sum, project) => sum + getProjectExecutionProgress(project), 0) / list.length)
    : 0

  return {
    projects: list.length,
    activeProjects: openProjects.length,
    tasks: tasks.length,
    openTasks: openTasks.length,
    blocked,
    overdue,
    dueSoon,
    ownershipCoverage: openTasks.length ? Math.round((owned / openTasks.length) * 100) : 100,
    overallProgress,
    manHoursSaved: list.reduce((sum, project) => sum + (Number(project?.man_hours_saved) || 0), 0),
    stoplossMinutesSaved: list.reduce((sum, project) => sum + (Number(project?.stoploss_minutes_saved) || 0), 0),
    wafersGained: list.reduce((sum, project) => sum + (Number(project?.wafers_gained) || 0), 0),
  }
}

export const filterProjectsForGoldenView = (
  projects: any[],
  search: string,
  statusFilter: string,
  priorityFilter: string,
) => {
  const query = search.trim().toLowerCase()
  const status = normalizeProjectFilterValue(statusFilter)
  const priority = normalizeProjectFilterValue(priorityFilter)
  return [...(projects || [])]
    .sort((a, b) => (a?.order_index || 0) - (b?.order_index || 0))
    .filter((project: any) => {
      const searchable = [project?.name, project?.objective, project?.owner, ...(project?.owners || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return (!query || searchable.includes(query))
        && (status === 'ALL' || project?.status === status)
        && (priority === 'ALL' || project?.priority === priority)
    })
}

export const moveProjectTaskStatus = (project: any, taskId: number | string, status: ProjectTaskStatus) => ({
  ...project,
  tasks: (project?.tasks || []).map((task: any) => task?.id === taskId ? { ...task, status } : task),
})
