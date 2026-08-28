import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarClock,
  CircleDot,
  Clock3,
  Columns3,
  FolderKanban,
  Gauge,
  Plus,
  RefreshCcw,
  ShieldAlert,
  Target,
  UserCheck,
  Users,
  Workflow,
  Zap,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import LegacyProjects, { ProjectForm } from './Projects'
import { apiFetch } from '../api/apiClient'
import { AppDropdown } from './shared/AppDropdown'
import { ToolbarButton, ToolbarGroup, ToolbarSearch, ToolbarSegmented } from './shared/LayoutPrimitives'
import { WorkspaceModal } from './shared/WorkspaceModal'
import {
  WorkspaceEmptyState,
  WorkspaceSectionBadge,
} from './shared/OperationalWorkspacePrimitives'
import { OperationalWorkspaceShell } from './shared/OperationalWorkspaceShells'
import { WorkspaceShareHeader } from './shared/WorkspaceShareHeader'
import { StatusPill } from './shared/StatusPill'
import {
  PROJECT_TASK_STATUSES,
  buildPortfolioMetrics,
  buildProjectAttentionItems,
  filterProjectsForGoldenView,
  getDaysToDue,
  getProjectExecutionProgress,
  getTaskOwnerLabel,
  moveProjectTaskStatus,
  normalizeProjectFilterValue,
  resolveProjectGoldenView,
  type ProjectAttentionTone,
  type ProjectGoldenView,
  type ProjectTaskStatus,
} from './ProjectsGolden.model'

const PROJECT_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All status' },
  { value: 'Not Started', label: 'Not Started' },
  { value: 'Planning', label: 'Planning' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Paused', label: 'Paused' },
  { value: 'Blocked', label: 'Blocked' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Completed', label: 'Completed' },
]

const PROJECT_PRIORITY_OPTIONS = [
  { value: 'ALL', label: 'All priority' },
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Highest', label: 'Highest' },
]

const VIEW_OPTIONS = [
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'board', label: 'Execution Board' },
  { value: 'workspace', label: 'Deep Workspace' },
]

const toneClass: Record<ProjectAttentionTone, string> = {
  rose: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
  amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  blue: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
  slate: 'border-white/10 bg-white/5 text-slate-400',
}

const priorityClass = (priority?: string) => (
  priority === 'Highest'
    ? 'border-rose-500/25 bg-rose-500/10 text-rose-300'
    : priority === 'High'
      ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
      : priority === 'Medium'
        ? 'border-blue-500/20 bg-blue-500/10 text-blue-300'
        : 'border-white/10 bg-white/5 text-slate-400'
)

const dueLabel = (value?: string | null) => {
  const days = getDaysToDue(value)
  if (days == null) return 'No due date'
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  return `Due in ${days}d`
}

function MetricCard({
  icon,
  label,
  value,
  note,
  tone = 'default',
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  note: string
  tone?: 'default' | 'danger' | 'warning' | 'success'
}) {
  const emphasis = tone === 'danger'
    ? 'text-rose-300 border-rose-500/15 bg-rose-500/[0.04]'
    : tone === 'warning'
      ? 'text-amber-300 border-amber-500/15 bg-amber-500/[0.04]'
      : tone === 'success'
        ? 'text-emerald-300 border-emerald-500/15 bg-emerald-500/[0.04]'
        : 'text-blue-300 border-white/5 bg-white/[0.025]'

  return (
    <div className={`rounded-lg border p-5 ${emphasis}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-lg border border-white/5 bg-black/25 p-2.5">{icon}</div>
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">Live</span>
      </div>
      <div className="mt-5">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black tracking-tighter text-white tabular-nums">{value}</p>
        <p className="mt-1 text-[9px] font-semibold text-slate-600">{note}</p>
      </div>
    </div>
  )
}

function ProjectPulse({ project }: { project: any }) {
  if (!project) return null
  const tasks = project?.tasks || []
  const openTasks = tasks.filter((task: any) => task?.status !== 'Completed')
  const blocked = openTasks.filter((task: any) => task?.status === 'Blocked').length
  const overdue = openTasks.filter((task: any) => (getDaysToDue(task?.end_date) ?? 0) < 0).length
  const owners = new Set(openTasks.map((task: any) => getTaskOwnerLabel(task)).filter((owner: string) => owner !== 'Unassigned'))
  const progress = getProjectExecutionProgress(project)

  return (
    <section className="shrink-0 rounded-lg border border-white/5 bg-black/20 px-5 py-4" data-project-pulse="true">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill value={project.status} />
            <span className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${priorityClass(project.priority)}`}>
              {project.priority || 'Medium'} priority
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <h2 className="truncate text-base font-black tracking-tight text-white">{project.name}</h2>
            <WorkspaceShareHeader id={String(project.id)} title={project.name} />
          </div>
          <p className="mt-1 max-w-2xl truncate text-[10px] font-semibold text-slate-500">
            {project.objective || project.problem_statement || 'No project objective recorded.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-right">
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Execution</p>
            <p className="mt-1 text-lg font-black text-blue-300 tabular-nums">{progress}%</p>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Open / blocked</p>
            <p className={`mt-1 text-lg font-black tabular-nums ${blocked ? 'text-rose-300' : 'text-slate-200'}`}>{openTasks.length} / {blocked}</p>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Overdue</p>
            <p className={`mt-1 text-lg font-black tabular-nums ${overdue ? 'text-amber-300' : 'text-slate-200'}`}>{overdue}</p>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Owners</p>
            <p className="mt-1 text-lg font-black text-slate-200 tabular-nums">{owners.size}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-blue-500 transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>
    </section>
  )
}

function PortfolioCommandCenter({
  projects,
  filteredProjects,
  onOpenProject,
  onOpenBoard,
}: {
  projects: any[]
  filteredProjects: any[]
  onOpenProject: (id: number) => void
  onOpenBoard: (id: number) => void
}) {
  const metrics = useMemo(() => buildPortfolioMetrics(projects), [projects])
  const attention = useMemo(() => buildProjectAttentionItems(projects).slice(0, 12), [projects])
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>()
    projects.forEach((project) => counts.set(project.status || 'Unknown', (counts.get(project.status || 'Unknown') || 0) + 1))
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [projects])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar" data-project-command-center="true">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <MetricCard icon={<FolderKanban size={17} />} label="Active projects" value={metrics.activeProjects} note={`${metrics.projects} total portfolio`} />
        <MetricCard icon={<Gauge size={17} />} label="Portfolio execution" value={`${metrics.overallProgress}%`} note={`${metrics.openTasks} open tasks`} tone="success" />
        <MetricCard icon={<ShieldAlert size={17} />} label="Blocked work" value={metrics.blocked} note="Requires intervention" tone={metrics.blocked ? 'danger' : 'success'} />
        <MetricCard icon={<CalendarClock size={17} />} label="Due ≤72h" value={metrics.dueSoon} note={`${metrics.overdue} already overdue`} tone={(metrics.dueSoon || metrics.overdue) ? 'warning' : 'success'} />
        <MetricCard icon={<UserCheck size={17} />} label="Ownership coverage" value={`${metrics.ownershipCoverage}%`} note="Open work with owner" />
        <MetricCard icon={<Zap size={17} />} label="Time defended" value={`${Math.round(metrics.manHoursSaved)}h`} note={`${Math.round(metrics.stoplossMinutesSaved)} stoploss min/yr`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.7fr)]">
        <section className="rounded-lg border border-white/5 bg-black/20 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white">Portfolio execution</h3>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Progress, ownership and schedule pressure by project</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusCounts.slice(0, 5).map(([status, count]) => (
                <WorkspaceSectionBadge key={status}>{status} · {count}</WorkspaceSectionBadge>
              ))}
            </div>
          </div>

          {filteredProjects.length ? (
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {filteredProjects.map((project) => {
                const tasks = project?.tasks || []
                const progress = getProjectExecutionProgress(project)
                const blocked = tasks.filter((task: any) => task?.status === 'Blocked').length
                const overdue = tasks.filter((task: any) => task?.status !== 'Completed' && (getDaysToDue(task?.end_date) ?? 0) < 0).length
                const nextDue = [...tasks]
                  .filter((task: any) => task?.status !== 'Completed' && task?.end_date)
                  .sort((a: any, b: any) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())[0]
                return (
                  <article
                    key={project.id}
                    className="group rounded-lg border border-white/5 bg-white/[0.025] p-4 transition-all hover:border-blue-500/25 hover:bg-blue-500/[0.035]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-[12px] font-black text-slate-100 group-hover:text-blue-200">{project.name}</h4>
                        <p className="mt-1 truncate text-[9px] font-semibold text-slate-600">{project.objective || project.type || 'Project execution'}</p>
                      </div>
                      <StatusPill value={project.status} />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                      <span className="text-slate-600">Execution</span>
                      <span className="text-blue-300 tabular-nums">{progress}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className={`h-full rounded-full ${blocked || overdue ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-2">
                        <p className="text-[7px] font-black uppercase tracking-widest text-slate-700">Tasks</p>
                        <p className="mt-1 text-[11px] font-black text-slate-300 tabular-nums">{tasks.length}</p>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-2">
                        <p className="text-[7px] font-black uppercase tracking-widest text-slate-700">Blocked</p>
                        <p className={`mt-1 text-[11px] font-black tabular-nums ${blocked ? 'text-rose-300' : 'text-slate-300'}`}>{blocked}</p>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-2">
                        <p className="text-[7px] font-black uppercase tracking-widest text-slate-700">Overdue</p>
                        <p className={`mt-1 text-[11px] font-black tabular-nums ${overdue ? 'text-amber-300' : 'text-slate-300'}`}>{overdue}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-3">
                      <div className="min-w-0">
                        <p className="truncate text-[8px] font-black uppercase tracking-widest text-slate-700">Next checkpoint</p>
                        <p className={`mt-1 truncate text-[9px] font-bold ${nextDue && (getDaysToDue(nextDue.end_date) ?? 4) <= 3 ? 'text-amber-300' : 'text-slate-500'}`}>
                          {nextDue ? `${nextDue.name} · ${dueLabel(nextDue.end_date)}` : 'No open due date'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <ToolbarButton onClick={() => onOpenBoard(project.id)} variant="quiet">Board</ToolbarButton>
                        <ToolbarButton onClick={() => onOpenProject(project.id)} variant="secondary">Open</ToolbarButton>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <WorkspaceEmptyState
              compact
              icon={<FolderKanban size={24} />}
              title="No projects match this view"
              description="Clear search or filters to restore the portfolio set."
            />
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-white/5 bg-black/20 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white">Attention queue</h3>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Deterministic execution signals</p>
              </div>
              <WorkspaceSectionBadge tone={attention.some((item) => item.tone === 'rose') ? 'rose' : 'default'}>{attention.length}</WorkspaceSectionBadge>
            </div>
            <div className="mt-4 space-y-2">
              {attention.length ? attention.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenBoard(item.projectId)}
                  className="flex w-full items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-left transition-all hover:border-white/10 hover:bg-white/[0.04]"
                >
                  <span className={`mt-0.5 rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${toneClass[item.tone]}`}>{item.label}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-black text-slate-200">{item.taskName}</span>
                    <span className="mt-1 block truncate text-[8px] font-semibold uppercase tracking-widest text-slate-600">{item.projectName} · {item.owner}</span>
                  </span>
                </button>
              )) : (
                <WorkspaceEmptyState compact title="No immediate execution signals" description="Blocked, overdue and unowned open work will surface here automatically." />
              )}
            </div>
          </section>

          <section className="rounded-lg border border-white/5 bg-black/20 p-5">
            <h3 className="text-sm font-black text-white">Value defended</h3>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Portfolio ROI signals already recorded</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/5 bg-white/[0.025] p-3">
                <p className="text-[7px] font-black uppercase tracking-widest text-slate-700">Hours / yr</p>
                <p className="mt-1 text-base font-black text-blue-300 tabular-nums">{Math.round(metrics.manHoursSaved)}</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.025] p-3">
                <p className="text-[7px] font-black uppercase tracking-widest text-slate-700">Stoploss min</p>
                <p className="mt-1 text-base font-black text-emerald-300 tabular-nums">{Math.round(metrics.stoplossMinutesSaved)}</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.025] p-3">
                <p className="text-[7px] font-black uppercase tracking-widest text-slate-700">WPD gain</p>
                <p className="mt-1 text-base font-black text-amber-300 tabular-nums">{Math.round(metrics.wafersGained)}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function ExecutionBoard({
  project,
  isSaving,
  onMoveTask,
  onOpenWorkspace,
}: {
  project: any
  isSaving: boolean
  onMoveTask: (taskId: number | string, status: ProjectTaskStatus) => void
  onOpenWorkspace: () => void
}) {
  const [draggingTaskId, setDraggingTaskId] = useState<number | string | null>(null)

  if (!project) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-white/5 bg-black/20">
        <WorkspaceEmptyState icon={<Columns3 size={28} />} title="Select a project for the execution board" description="Choose a project from the Project selector above." />
      </div>
    )
  }

  const tasks = project?.tasks || []

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" data-project-execution-board="true">
      <ProjectPulse project={project} />
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2 custom-scrollbar">
        {PROJECT_TASK_STATUSES.map((status, statusIndex) => {
          const statusTasks = tasks.filter((task: any) => task?.status === status)
          return (
            <section
              key={status}
              className={`flex min-w-[290px] flex-1 flex-col overflow-hidden rounded-lg border bg-black/20 ${draggingTaskId ? 'border-blue-500/20' : 'border-white/5'}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggingTaskId != null) onMoveTask(draggingTaskId, status)
                setDraggingTaskId(null)
              }}
            >
              <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.025] px-4 py-3">
                <div className="flex items-center gap-2">
                  <CircleDot size={13} className={status === 'Blocked' ? 'text-rose-400' : status === 'Completed' ? 'text-emerald-400' : 'text-blue-400'} />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-300">{status}</h3>
                </div>
                <span className="rounded-lg border border-white/5 bg-black/30 px-2 py-1 text-[9px] font-black text-slate-500 tabular-nums">{statusTasks.length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3 custom-scrollbar">
                {statusTasks.map((task: any) => {
                  const owner = getTaskOwnerLabel(task)
                  const days = getDaysToDue(task?.end_date)
                  const atRisk = task?.status === 'Blocked' || (days != null && days < 0)
                  return (
                    <article
                      key={task.id}
                      draggable={!isSaving}
                      onDragStart={() => setDraggingTaskId(task.id)}
                      onDragEnd={() => setDraggingTaskId(null)}
                      className={`rounded-lg border bg-white/[0.025] p-3 shadow-sm transition-all ${atRisk ? 'border-rose-500/20' : 'border-white/5 hover:border-blue-500/20'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[11px] font-black leading-snug text-slate-200">{task.name}</h4>
                          {task.description ? <p className="mt-1 line-clamp-2 text-[9px] font-semibold leading-relaxed text-slate-600">{task.description}</p> : null}
                        </div>
                        {atRisk ? <AlertTriangle size={14} className="shrink-0 text-rose-400" /> : null}
                      </div>
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5">
                        <div className={`h-full rounded-full ${atRisk ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${Math.max(0, Math.min(100, Number(task.progress) || (status === 'Completed' ? 100 : 0)))}%` }} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-[8px] font-black uppercase tracking-wider">
                        <span className={owner === 'Unassigned' ? 'text-amber-400' : 'text-slate-600'}><Users size={10} className="mr-1 inline" />{owner}</span>
                        <span className={days != null && days <= 3 ? 'text-amber-400' : 'text-slate-600'}><Clock3 size={10} className="mr-1 inline" />{dueLabel(task.end_date)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                        <ToolbarButton
                          variant="quiet"
                          disabled={statusIndex === 0 || isSaving}
                          onClick={() => onMoveTask(task.id, PROJECT_TASK_STATUSES[statusIndex - 1])}
                          title="Move task left"
                        >
                          <ArrowLeft size={12} />
                        </ToolbarButton>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-700">Drag or move</span>
                        <ToolbarButton
                          variant="quiet"
                          disabled={statusIndex === PROJECT_TASK_STATUSES.length - 1 || isSaving}
                          onClick={() => onMoveTask(task.id, PROJECT_TASK_STATUSES[statusIndex + 1])}
                          title="Move task right"
                        >
                          <ArrowRight size={12} />
                        </ToolbarButton>
                      </div>
                    </article>
                  )
                })}
                {!statusTasks.length ? (
                  <div className="rounded-lg border border-dashed border-white/5 px-4 py-8 text-center text-[8px] font-black uppercase tracking-widest text-slate-800">No tasks</div>
                ) : null}
              </div>
            </section>
          )
        })}
      </div>
      <div className="flex shrink-0 items-center justify-between rounded-lg border border-white/5 bg-black/20 px-4 py-2.5">
        <p className="text-[9px] font-semibold text-slate-600">Board moves update the same task status used by Precision Gantt and the Project workspace.</p>
        <ToolbarButton onClick={onOpenWorkspace}><Workflow size={13} /> Deep Workspace</ToolbarButton>
      </div>
    </div>
  )
}

export default function ProjectsGolden() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = resolveProjectGoldenView(searchParams.get('view'))
  const idParam = searchParams.get('id')
  const selectedProjectId = idParam && Number.isFinite(Number(idParam)) ? Number(idParam) : null
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const {
    data: projects = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiFetch('/api/v1/projects')
      if (!response.ok) throw new Error(await response.text())
      return response.json()
    },
    placeholderData: (previous) => previous,
  })

  const { data: devices = [] } = useQuery({ queryKey: ['devices'], queryFn: () => apiFetch('/api/v1/devices').then((response) => response.json()) })
  const { data: services = [] } = useQuery({ queryKey: ['logical-services'], queryFn: () => apiFetch('/api/v1/logical-services').then((response) => response.json()) })
  const { data: options = [] } = useQuery({ queryKey: ['settings-options'], queryFn: () => apiFetch('/api/v1/settings/options').then((response) => response.json()) })

  const filteredProjects = useMemo(
    () => filterProjectsForGoldenView(projects, search, statusFilter, priorityFilter),
    [projects, search, statusFilter, priorityFilter],
  )
  const selectedProject = useMemo(
    () => projects.find((project: any) => project?.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  )

  const setView = (nextView: ProjectGoldenView) => {
    const next = new URLSearchParams(searchParams)
    next.set('view', nextView)
    setSearchParams(next, { replace: true })
  }

  const selectProject = (projectId: number, nextView?: ProjectGoldenView) => {
    const next = new URLSearchParams(searchParams)
    next.set('id', String(projectId))
    if (nextView) next.set('view', nextView)
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    if ((view === 'board' || view === 'workspace') && projects.length && !selectedProject) {
      selectProject(filteredProjects[0]?.id || projects[0].id)
    }
    // URL selection is intentionally the single restoration source; avoid rerunning for function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, projects, selectedProject, filteredProjects])

  const updateProjectMutation = useMutation({
    mutationFn: async (project: any) => {
      const response = await apiFetch(`/api/v1/projects/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify(project),
      })
      if (!response.ok) throw new Error(await response.text())
      return response.json()
    },
    onMutate: async (project) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] })
      const previous = queryClient.getQueryData<any[]>(['projects']) || []
      queryClient.setQueryData(['projects'], previous.map((item) => item.id === project.id ? project : item))
      return { previous }
    },
    onError: (mutationError, _project, context) => {
      if (context?.previous) queryClient.setQueryData(['projects'], context.previous)
      toast.error(mutationError instanceof Error ? mutationError.message : 'Project update failed')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })

  const createProjectMutation = useMutation({
    mutationFn: async (project: any) => {
      const response = await apiFetch('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify(project),
      })
      if (!response.ok) throw new Error(await response.text())
      return response.json()
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setIsCreateOpen(false)
      toast.success('Project created')
      selectProject(project.id, 'workspace')
    },
    onError: (mutationError: any) => toast.error(mutationError?.message || 'Project creation failed'),
  })

  const moveTask = (taskId: number | string, status: ProjectTaskStatus) => {
    if (!selectedProject) return
    updateProjectMutation.mutate(moveProjectTaskStatus(selectedProject, taskId, status))
  }

  const filteredProjectOptions = filteredProjects.map((project: any) => ({ value: project.id, label: project.name }))
  const allProjectOptions = projects.map((project: any) => ({ value: project.id, label: project.name }))
  const selectorOptions = filteredProjectOptions.length ? filteredProjectOptions : allProjectOptions
  const summary = buildPortfolioMetrics(projects)

  return (
    <OperationalWorkspaceShell
      archetype="hybrid"
      workspace="projects"
      className="bg-[#0a0c14] p-4 sm:p-6"
      header={{
        eyebrow: 'Execution Management',
        title: 'Project Command Center',
        subtitle: view === 'portfolio'
          ? 'Portfolio health, execution risk, ownership and defended value in one operating view.'
          : view === 'board'
            ? 'Move live work through the same task lifecycle used by Precision Gantt.'
            : 'Deep project authoring, planning, evidence, Gantt, activity and adoption.',
        meta: (
          <>
            <WorkspaceSectionBadge tone="blue">{summary.activeProjects} active</WorkspaceSectionBadge>
            <WorkspaceSectionBadge tone={summary.blocked ? 'rose' : 'emerald'}>{summary.blocked} blocked</WorkspaceSectionBadge>
            <WorkspaceSectionBadge tone={summary.overdue ? 'amber' : 'default'}>{summary.overdue} overdue</WorkspaceSectionBadge>
            <WorkspaceSectionBadge>{summary.overallProgress}% portfolio execution</WorkspaceSectionBadge>
          </>
        ),
      }}
      commandBar={{
        left: (
          <>
            <ToolbarSearch value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects, objectives, owners..." />
            <ToolbarGroup className="min-w-max">
              <AppDropdown
                value={normalizeProjectFilterValue(statusFilter)}
                onChange={(value) => setStatusFilter(normalizeProjectFilterValue(String(value)))}
                options={PROJECT_STATUS_OPTIONS}
                className="w-[150px]"
              />
              <AppDropdown
                value={normalizeProjectFilterValue(priorityFilter)}
                onChange={(value) => setPriorityFilter(normalizeProjectFilterValue(String(value)))}
                options={PROJECT_PRIORITY_OPTIONS}
                className="w-[150px]"
              />
              {(view === 'board' || view === 'workspace') && selectorOptions.length ? (
                <AppDropdown
                  value={selectedProject?.id || selectorOptions[0]?.value || ''}
                  onChange={(value) => selectProject(Number(value))}
                  options={selectorOptions}
                  className="w-[240px]"
                />
              ) : null}
            </ToolbarGroup>
          </>
        ),
        right: (
          <ToolbarGroup>
            <ToolbarSegmented options={VIEW_OPTIONS} value={view} onChange={(value) => setView(resolveProjectGoldenView(value))} />
            <ToolbarButton onClick={() => refetch()} disabled={isFetching} title="Refresh projects">
              <RefreshCcw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
            </ToolbarButton>
            <ToolbarButton onClick={() => setIsCreateOpen(true)} variant="primary"><Plus size={13} /> New Project</ToolbarButton>
          </ToolbarGroup>
        ),
      }}
    >
      {isLoading && !projects.length ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-white/5 bg-black/20">
          <WorkspaceEmptyState icon={<RefreshCcw size={26} className="animate-spin" />} title="Synchronizing projects" description="Hydrating the project execution workspace." />
        </div>
      ) : isError ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/[0.025]">
          <WorkspaceEmptyState
            icon={<ShieldAlert size={28} className="text-rose-400" />}
            title="Project data is unavailable"
            description={error instanceof Error ? error.message : 'The project API did not return a usable response.'}
            action={<ToolbarButton onClick={() => refetch()}><RefreshCcw size={13} /> Retry</ToolbarButton>}
          />
        </div>
      ) : !projects.length ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-white/5 bg-black/20">
          <WorkspaceEmptyState
            icon={<Briefcase size={28} />}
            title="No projects yet"
            description="Create the first project to establish a portfolio, task board and deep execution workspace."
            action={<ToolbarButton onClick={() => setIsCreateOpen(true)} variant="primary"><Plus size={13} /> New Project</ToolbarButton>}
          />
        </div>
      ) : view === 'portfolio' ? (
        <PortfolioCommandCenter
          projects={projects}
          filteredProjects={filteredProjects}
          onOpenProject={(id) => selectProject(id, 'workspace')}
          onOpenBoard={(id) => selectProject(id, 'board')}
        />
      ) : view === 'board' ? (
        <ExecutionBoard
          project={selectedProject}
          isSaving={updateProjectMutation.isPending}
          onMoveTask={moveTask}
          onOpenWorkspace={() => selectedProject && selectProject(selectedProject.id, 'workspace')}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3" data-project-deep-workspace="true">
          <ProjectPulse project={selectedProject} />
          <div className="project-golden-legacy min-h-0 flex-1 overflow-hidden rounded-lg border border-white/5 bg-[#0b0c14]" data-project-legacy-core="true">
            <LegacyProjects />
          </div>
        </div>
      )}

      <WorkspaceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        size="workspace"
        title="Create Project"
        subtitle="Establish a strategic execution vector using the existing Project contract."
        icon={<Target size={18} />}
        hideFooterClose
      >
        <ProjectForm
          initialData={{ name: '', type: 'Strategic', status: 'Planning', priority: 'Medium' }}
          onSave={(project: any) => createProjectMutation.mutate(project)}
          isSaving={createProjectMutation.isPending}
          onCancel={() => setIsCreateOpen(false)}
          devices={devices}
          services={services}
          options={options}
        />
      </WorkspaceModal>

      <style>{`
        /* The golden shell owns project navigation. The mature deep-workspace engines remain intact. */
        .project-golden-legacy > div > :nth-child(3) > :first-child {
          display: none !important;
        }
        .project-golden-legacy > div {
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        @media (max-width: 1180px) {
          .project-golden-legacy > div > :nth-child(3) > :last-child {
            display: none !important;
          }
        }
      `}</style>
    </OperationalWorkspaceShell>
  )
}
