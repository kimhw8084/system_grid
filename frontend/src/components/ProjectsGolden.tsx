import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Briefcase, CalendarClock, CheckCircle2,
  ChevronRight, CircleDot, Clock3, Columns3, Eye, FolderKanban, Gauge, GitBranch, HeartPulse,
  LayoutGrid, List, Milestone, Plus, RefreshCcw, Route, Save, ShieldAlert, Sparkles, Star,
  Target, UserCheck, Users, Workflow, X, Zap,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import LegacyProjects, { ProjectForm } from './Projects'
import { apiFetch } from '../api/apiClient'
import { AppDropdown } from './shared/AppDropdown'
import { ToolbarButton, ToolbarGroup, ToolbarSearch, ToolbarSegmented } from './shared/LayoutPrimitives'
import { WorkspaceModal } from './shared/WorkspaceModal'
import { WorkspaceEmptyState, WorkspaceSectionBadge } from './shared/OperationalWorkspacePrimitives'
import { OperationalWorkspaceShell } from './shared/OperationalWorkspaceShells'
import { WorkspaceShareHeader } from './shared/WorkspaceShareHeader'
import { StatusPill } from './shared/StatusPill'
import {
  PROJECT_SORT_MODES,
  PROJECT_SWIMLANES,
  PROJECT_TASK_STATUSES,
  buildCrossProjectDependencies,
  buildOwnerWorkload,
  buildPortfolioMetrics,
  buildProjectAttentionItems,
  buildRoadmapRows,
  createProjectTask,
  diversifyAttentionItems,
  filterProjectsForGoldenView,
  getCriticalTaskIds,
  getDaysToDue,
  getMyWork,
  getProjectExecutionProgress,
  getProjectHealth,
  getProjectMilestones,
  getTaskOwnerLabel,
  getTaskProgress,
  moveProjectTaskStatus,
  normalizeProjectFilterValue,
  normalizeTaskStatus,
  projectFingerprint,
  resolveProjectGoldenView,
  updateProjectTask,
  type ProjectAttentionTone,
  type ProjectGoldenView,
  type ProjectSortMode,
  type ProjectSwimlane,
  type ProjectTaskStatus,
} from './ProjectsGolden.model'

const PROJECT_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All status' }, { value: 'Not Started', label: 'Not Started' },
  { value: 'Planning', label: 'Planning' }, { value: 'In Progress', label: 'In Progress' },
  { value: 'Paused', label: 'Paused' }, { value: 'Blocked', label: 'Blocked' },
  { value: 'Cancelled', label: 'Cancelled' }, { value: 'Completed', label: 'Completed' },
]
const PROJECT_PRIORITY_OPTIONS = [
  { value: 'ALL', label: 'All priority' }, { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' }, { value: 'High', label: 'High' }, { value: 'Highest', label: 'Highest' },
]
const VIEW_OPTIONS = [
  { value: 'portfolio', label: 'Portfolio' }, { value: 'board', label: 'Board' },
  { value: 'roadmap', label: 'Roadmap' }, { value: 'owners', label: 'Owners' },
  { value: 'review', label: 'Review' }, { value: 'workspace', label: 'Workspace' },
]
const SORT_OPTIONS = PROJECT_SORT_MODES.map((value) => ({ value, label: value === 'order' ? 'Portfolio order' : value[0].toUpperCase() + value.slice(1) }))
const SWIMLANE_OPTIONS = PROJECT_SWIMLANES.map((value) => ({ value, label: value === 'none' ? 'No swimlane' : `By ${value}` }))
const WIP_LIMITS: Partial<Record<ProjectTaskStatus, number>> = { 'In Progress': 5, Blocked: 3, Review: 4 }
const STORAGE_KEY = 'sysgrid_projects_execution_intelligence_v1'

const toneClass: Record<ProjectAttentionTone, string> = {
  rose: 'border-rose-500/20 bg-rose-500/10 text-rose-300', amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  blue: 'border-blue-500/20 bg-blue-500/10 text-blue-300', slate: 'border-white/10 bg-white/5 text-slate-400',
}
const healthClass = (level: string) => level === 'red'
  ? 'border-rose-500/25 bg-rose-500/10 text-rose-300'
  : level === 'amber' ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
const dueLabel = (value?: string | null) => {
  const days = getDaysToDue(value)
  if (days == null) return 'No due date'
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  return `Due in ${days}d`
}
const readStoredState = () => {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function MetricCard({ icon, label, value, note, tone = 'default' }: { icon: React.ReactNode; label: string; value: React.ReactNode; note: string; tone?: 'default' | 'danger' | 'warning' | 'success' }) {
  const emphasis = tone === 'danger' ? 'text-rose-300 border-rose-500/15 bg-rose-500/[0.04]'
    : tone === 'warning' ? 'text-amber-300 border-amber-500/15 bg-amber-500/[0.04]'
      : tone === 'success' ? 'text-emerald-300 border-emerald-500/15 bg-emerald-500/[0.04]'
        : 'text-blue-300 border-white/5 bg-white/[0.025]'
  return <div className={`rounded-lg border p-4 ${emphasis}`}>
    <div className="flex items-start justify-between"><div className="rounded-lg border border-white/5 bg-black/25 p-2">{icon}</div><span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">Live</span></div>
    <p className="mt-4 text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-black tracking-tighter text-white tabular-nums">{value}</p>
    <p className="mt-1 text-[9px] font-semibold text-slate-600">{note}</p>
  </div>
}

function ProjectPulse({ project }: { project: any }) {
  if (!project) return null
  const health = getProjectHealth(project)
  const milestones = getProjectMilestones(project)
  const nextMilestone = milestones.find((item) => item.status !== 'Completed')
  const progress = getProjectExecutionProgress(project)
  return <section className="shrink-0 rounded-lg border border-white/5 bg-black/20 px-5 py-4" data-project-pulse="true">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill value={project.status} />
          <span className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${healthClass(health.level)}`}>{health.level} health</span>
          <WorkspaceSectionBadge>{project.priority || 'Medium'} priority</WorkspaceSectionBadge>
        </div>
        <div className="mt-2 flex items-center gap-3"><h2 className="truncate text-base font-black text-white">{project.name}</h2><WorkspaceShareHeader id={String(project.id)} title={project.name} /></div>
        <p className="mt-1 max-w-3xl truncate text-[10px] font-semibold text-slate-500">{project.objective || project.problem_statement || 'No project objective recorded.'}</p>
        <div className="mt-3 flex flex-wrap gap-2">{health.reasons.slice(0, 3).map((reason) => <WorkspaceSectionBadge key={reason} tone={health.level === 'red' ? 'rose' : health.level === 'amber' ? 'amber' : 'emerald'}>{reason}</WorkspaceSectionBadge>)}</div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
        {[['Execution', `${progress}%`], ['Critical', `${health.critical} / ${health.blockedCritical} blocked`], ['Review', String(health.review)], ['Variance', health.scheduleVarianceDays == null ? 'No baseline' : `${health.scheduleVarianceDays > 0 ? '+' : ''}${health.scheduleVarianceDays}d`], ['Next checkpoint', nextMilestone ? dueLabel(nextMilestone.dueAt) : 'None']].map(([label, value]) => <div key={label} className="text-right"><p className="text-[7px] font-black uppercase tracking-widest text-slate-600">{label}</p><p className="mt-1 text-[11px] font-black text-slate-200">{value}</p></div>)}
      </div>
    </div>
    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${health.level === 'red' ? 'bg-rose-500' : health.level === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }} /></div>
  </section>
}

function MilestoneControlTower({ project, onTask }: { project: any; onTask: (taskId: number | string) => void }) {
  const milestones = getProjectMilestones(project)
  if (!milestones.length) return <WorkspaceEmptyState compact title="No schedule checkpoints" description="Add milestone-tagged or dated tasks in Deep Workspace to activate the milestone tower." />
  return <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4" data-project-milestone-tower="true">{milestones.slice(0, 8).map((item) => <button key={String(item.id)} onClick={() => onTask(item.id)} className={`rounded-lg border p-3 text-left transition-all hover:border-blue-500/30 ${item.blocked || item.overdue ? 'border-rose-500/20 bg-rose-500/[0.04]' : 'border-white/5 bg-white/[0.025]'}`}>
    <div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-black text-slate-200">{item.name}</span><span className="text-[8px] font-black text-slate-600">{item.progress}%</span></div>
    <div className="mt-2 flex items-center justify-between text-[8px] font-bold text-slate-600"><span>{item.owner}</span><span className={item.overdue ? 'text-rose-300' : (item.daysToDue ?? 9) <= 3 ? 'text-amber-300' : ''}>{dueLabel(item.dueAt)}</span></div>
  </button>)}</div>
}

function PortfolioCommandCenter({ projects, filteredProjects, watchedIds, onToggleWatch, onOpenProject, onOpenBoard, onQuickTask, onQuickEdit }: any) {
  const metrics = useMemo(() => buildPortfolioMetrics(projects), [projects])
  const attention = useMemo(() => diversifyAttentionItems(buildProjectAttentionItems(projects), 12), [projects])
  return <div className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar" data-project-control-tower="true">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-8">
      <MetricCard icon={<FolderKanban size={16} />} label="Active projects" value={metrics.activeProjects} note={`${metrics.projects} total`} />
      <MetricCard icon={<Gauge size={16} />} label="Task-weighted execution" value={`${metrics.overallProgress}%`} note={`${metrics.projectAverageProgress}% project average`} tone="success" />
      <MetricCard icon={<HeartPulse size={16} />} label="Red / amber" value={`${metrics.healthRed} / ${metrics.healthAmber}`} note="Explainable project health" tone={metrics.healthRed ? 'danger' : metrics.healthAmber ? 'warning' : 'success'} />
      <MetricCard icon={<ShieldAlert size={16} />} label="Blocked" value={metrics.blocked} note="Open work requiring intervention" tone={metrics.blocked ? 'danger' : 'success'} />
      <MetricCard icon={<CalendarClock size={16} />} label="Due ≤72h" value={metrics.dueSoon} note={`${metrics.overdue} overdue`} tone={(metrics.dueSoon || metrics.overdue) ? 'warning' : 'success'} />
      <MetricCard icon={<UserCheck size={16} />} label="Ownership" value={`${metrics.ownershipCoverage}%`} note="Open work with owner" />
      <MetricCard icon={<Zap size={16} />} label="Time defended" value={`${Math.round(metrics.manHoursSaved)}h`} note="Recorded annual value" />
      <MetricCard icon={<Sparkles size={16} />} label="WPD gain" value={Math.round(metrics.wafersGained)} note={`${Math.round(metrics.stoplossMinutesSaved)} stoploss min`} />
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.7fr)]">
      <section className="rounded-lg border border-white/5 bg-black/20 p-5">
        <div className="mb-4"><h3 className="text-sm font-black text-white">Portfolio control tower</h3><p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Health, critical path, checkpoints and defended value</p></div>
        {filteredProjects.length ? <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{filteredProjects.map((project: any) => {
          const health = getProjectHealth(project); const progress = getProjectExecutionProgress(project); const milestones = getProjectMilestones(project); const next = milestones.find((item) => item.status !== 'Completed')
          const watched = watchedIds.includes(String(project.id))
          return <article key={project.id} className="group rounded-lg border border-white/5 bg-white/[0.025] p-4 transition-all hover:border-blue-500/25">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="truncate text-[12px] font-black text-slate-100">{project.name}</h4><p className="mt-1 truncate text-[9px] text-slate-600">{project.objective || project.type || 'Project execution'}</p></div><div className="flex items-center gap-2"><button title={watched ? 'Unwatch project' : 'Watch project'} onClick={() => onToggleWatch(project.id)} className={watched ? 'text-amber-300' : 'text-slate-700 hover:text-amber-300'}><Star size={14} fill={watched ? 'currentColor' : 'none'} /></button><StatusPill value={project.status} /></div></div>
            <div className="mt-3 flex items-center justify-between"><span className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${healthClass(health.level)}`}>{health.level}</span><span className="text-[10px] font-black text-blue-300">{progress}%</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${health.level === 'red' ? 'bg-rose-500' : health.level === 'amber' ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} /></div>
            <div className="mt-3 grid grid-cols-4 gap-2">{[['Critical', health.critical], ['Blocked', health.blocked], ['Overdue', health.overdue], ['Review', health.review]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-white/5 bg-black/20 px-2 py-2"><p className="text-[7px] font-black uppercase text-slate-700">{label}</p><p className="mt-1 text-[11px] font-black text-slate-300">{value}</p></div>)}</div>
            <p className="mt-3 truncate text-[9px] font-semibold text-slate-500"><Milestone size={10} className="mr-1 inline" />{next ? `${next.name} · ${dueLabel(next.dueAt)}` : 'No open checkpoint'}</p>
            <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-white/5 pt-3"><ToolbarButton variant="quiet" onClick={() => onQuickTask(project)}>+ Task</ToolbarButton><ToolbarButton variant="quiet" onClick={() => onOpenBoard(project.id)}>Board</ToolbarButton><ToolbarButton variant="secondary" onClick={() => onOpenProject(project.id)}>Open</ToolbarButton></div>
          </article>
        })}</div> : <WorkspaceEmptyState compact title="No projects match this view" description="Clear active filters or choose another saved view." />}
      </section>
      <aside className="space-y-4">
        <section className="rounded-lg border border-white/5 bg-black/20 p-5" data-project-attention-queue="true"><div className="flex items-start justify-between"><div><h3 className="text-sm font-black text-white">Attention Queue 2.0</h3><p className="mt-1 text-[9px] uppercase tracking-widest text-slate-600">One incident per task · portfolio diversified</p></div><WorkspaceSectionBadge tone={attention.some((item) => item.tone === 'rose') ? 'rose' : 'default'}>{attention.length}</WorkspaceSectionBadge></div>
          <div className="mt-4 space-y-2">{attention.length ? attention.map((item) => <button key={item.id} onClick={() => onQuickEdit(item.projectId, item.taskId)} className="flex w-full items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-left hover:border-white/10"><span className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase ${toneClass[item.tone]}`}>{item.label}</span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-black text-slate-200">{item.taskName}</span><span className="mt-1 block truncate text-[8px] font-semibold uppercase tracking-widest text-slate-600">{item.projectName} · {item.owner}</span><span className="mt-1 block truncate text-[8px] text-slate-700">{item.reasonLabels.slice(1).join(' · ')}</span></span></button>) : <WorkspaceEmptyState compact title="No immediate execution signals" description="Risk signals will appear here automatically." />}</div>
        </section>
      </aside>
    </div>
  </div>
}

const swimlaneLabel = (task: any, swimlane: ProjectSwimlane, critical: Set<number | string>) => swimlane === 'owner' ? getTaskOwnerLabel(task) : swimlane === 'priority' ? (task.priority || 'Medium') : swimlane === 'criticality' ? (critical.has(task.id) ? 'Critical path' : 'Non-critical') : 'All work'

function ExecutionBoard({ project, isSaving, swimlane, onSwimlaneChange, onMoveTask, onQuickTask, onEditTask, onOpenWorkspace }: any) {
  const [draggingTaskId, setDraggingTaskId] = useState<number | string | null>(null)
  if (!project) return <WorkspaceEmptyState title="Select a project for the execution board" description="Choose a project above." />
  const tasks = project?.tasks || []; const critical = getCriticalTaskIds(project); const unknown = tasks.filter((task: any) => normalizeTaskStatus(task?.status) === 'Unknown')
  return <div className="flex min-h-0 flex-1 flex-col gap-4" data-project-execution-board="true"><ProjectPulse project={project} />
    <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-4 py-2"><div className="flex items-center gap-2"><AppDropdown value={swimlane} onChange={(value) => onSwimlaneChange(String(value) as ProjectSwimlane)} options={SWIMLANE_OPTIONS} className="w-[170px]" /><ToolbarButton onClick={() => onQuickTask(project)} variant="primary"><Plus size={12} /> Quick Task</ToolbarButton></div><span className="text-[9px] font-semibold text-slate-600">WIP limits: In Progress 5 · Blocked 3 · Review 4</span></div>
    {unknown.length ? <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.04] px-4 py-3 text-[9px] text-rose-300"><AlertTriangle size={12} className="mr-2 inline" />{unknown.length} task{unknown.length === 1 ? '' : 's'} use an unknown lifecycle status. They remain visible below instead of disappearing.</div> : null}
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2 custom-scrollbar">{PROJECT_TASK_STATUSES.map((status, statusIndex) => {
      const statusTasks = tasks.filter((task: any) => task?.status === status); const limit = WIP_LIMITS[status]; const overLimit = Boolean(limit && statusTasks.length > limit)
      const lanes = new Map<string, any[]>(); statusTasks.forEach((task: any) => { const label = swimlaneLabel(task, swimlane, critical); lanes.set(label, [...(lanes.get(label) || []), task]) })
      return <section key={status} className={`flex min-w-[300px] flex-1 flex-col overflow-hidden rounded-lg border bg-black/20 ${overLimit ? 'border-amber-500/30' : draggingTaskId ? 'border-blue-500/20' : 'border-white/5'}`} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggingTaskId != null) onMoveTask(draggingTaskId, status); setDraggingTaskId(null) }}>
        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.025] px-4 py-3"><div className="flex items-center gap-2"><CircleDot size={13} className={status === 'Blocked' ? 'text-rose-400' : status === 'Completed' ? 'text-emerald-400' : 'text-blue-400'} /><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-300">{status}</h3>{overLimit ? <WorkspaceSectionBadge tone="amber">WIP {statusTasks.length}/{limit}</WorkspaceSectionBadge> : null}</div><span className="text-[9px] font-black text-slate-500">{statusTasks.length}</span></div>
        <div className="flex-1 space-y-3 overflow-y-auto p-3 custom-scrollbar">{Array.from(lanes.entries()).map(([lane, laneTasks]) => <div key={lane}><p className="mb-2 text-[7px] font-black uppercase tracking-[0.18em] text-slate-700">{lane}</p><div className="space-y-2">{laneTasks.map((task: any) => {
          const owner = getTaskOwnerLabel(task); const days = getDaysToDue(task?.end_date); const atRisk = task.status === 'Blocked' || (days != null && days < 0); const progress = getTaskProgress(task)
          return <article key={task.id} draggable={!isSaving} onDragStart={() => setDraggingTaskId(task.id)} onDragEnd={() => setDraggingTaskId(null)} className={`rounded-lg border bg-white/[0.025] p-3 ${atRisk ? 'border-rose-500/20' : 'border-white/5 hover:border-blue-500/20'}`}>
            <button className="w-full text-left" onClick={() => onEditTask(task)}><div className="flex items-start justify-between gap-2"><h4 className="text-[11px] font-black text-slate-200">{task.name}</h4>{critical.has(task.id) ? <GitBranch size={13} className="text-rose-400" /> : null}</div>{task.description ? <p className="mt-1 line-clamp-2 text-[9px] text-slate-600">{task.description}</p> : null}</button>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${atRisk ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} /></div>
            <div className="mt-3 flex justify-between text-[8px] font-black uppercase"><span className={owner === 'Unassigned' ? 'text-amber-400' : 'text-slate-600'}><Users size={10} className="mr-1 inline" />{owner}</span><span className={days != null && days <= 3 ? 'text-amber-400' : 'text-slate-600'}><Clock3 size={10} className="mr-1 inline" />{dueLabel(task.end_date)}</span></div>
            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2"><ToolbarButton variant="quiet" disabled={statusIndex === 0 || isSaving} onClick={() => onMoveTask(task.id, PROJECT_TASK_STATUSES[statusIndex - 1])}><ArrowLeft size={12} /></ToolbarButton><span className="text-[8px] font-black uppercase tracking-widest text-slate-700">Drag · click to edit</span><ToolbarButton variant="quiet" disabled={statusIndex === PROJECT_TASK_STATUSES.length - 1 || isSaving} onClick={() => onMoveTask(task.id, PROJECT_TASK_STATUSES[statusIndex + 1])}><ArrowRight size={12} /></ToolbarButton></div>
          </article>
        })}</div></div>)}</div>
      </section>
    })}</div>
    {unknown.length ? <section className="rounded-lg border border-rose-500/20 bg-black/20 p-3"><p className="text-[8px] font-black uppercase tracking-widest text-rose-300">Unknown lifecycle</p><div className="mt-2 flex flex-wrap gap-2">{unknown.map((task: any) => <button key={task.id} onClick={() => onEditTask(task)} className="rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2 text-[9px] text-slate-300">{task.name} · {task.status || 'blank'}</button>)}</div></section> : null}
    <div className="flex shrink-0 items-center justify-between rounded-lg border border-white/5 bg-black/20 px-4 py-2.5"><p className="text-[9px] text-slate-600">Board moves update the same task lifecycle consumed by Precision Gantt.</p><ToolbarButton onClick={onOpenWorkspace}><Workflow size={13} /> Deep Workspace</ToolbarButton></div>
  </div>
}

function RoadmapView({ projects, onOpen }: any) {
  const rows = buildRoadmapRows(projects); const starts = rows.map((r) => r.startOrdinal).filter((v): v is number => v != null); const ends = rows.map((r) => r.endOrdinal).filter((v): v is number => v != null); const min = starts.length ? Math.min(...starts) : 0; const max = ends.length ? Math.max(...ends) : min + 1; const span = Math.max(1, max - min)
  const dependencies = buildCrossProjectDependencies(projects)
  return <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar" data-project-roadmap="true"><div className="rounded-lg border border-white/5 bg-black/20 p-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-black text-white">Portfolio Roadmap</h3><p className="mt-1 text-[9px] uppercase tracking-widest text-slate-600">Executive cross-project schedule · Precision Gantt remains the deep planner</p></div><WorkspaceSectionBadge>{dependencies.length} cross-project links</WorkspaceSectionBadge></div>
    <div className="mt-5 space-y-3">{rows.map((row) => { const left = row.startOrdinal == null ? 0 : ((row.startOrdinal - min) / span) * 100; const width = row.endOrdinal == null || row.startOrdinal == null ? 3 : Math.max(3, ((row.endOrdinal - row.startOrdinal) / span) * 100)
      return <button key={row.projectId} onClick={() => onOpen(row.projectId)} className="grid w-full grid-cols-[220px_minmax(0,1fr)_80px] items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-left hover:border-blue-500/20"><div><p className="truncate text-[10px] font-black text-slate-200">{row.projectName}</p><span className={`mt-1 inline-flex rounded-lg border px-2 py-0.5 text-[7px] font-black uppercase ${healthClass(row.health.level)}`}>{row.health.level}</span></div><div className="relative h-8 rounded-lg bg-white/[0.025]"><div className={`absolute top-2 h-4 rounded-md ${row.health.level === 'red' ? 'bg-rose-500/60' : row.health.level === 'amber' ? 'bg-amber-500/60' : 'bg-blue-500/60'}`} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} />{row.milestones.slice(0, 6).map((m) => { const ordinal = m.dueAt ? Math.round((new Date(`${String(m.dueAt).slice(0, 10)}T00:00:00Z`).getTime()) / 86_400_000) : null; const x = ordinal == null ? null : ((ordinal - min) / span) * 100; return x != null && x >= 0 && x <= 100 ? <span key={String(m.id)} className="absolute top-1 h-6 w-px bg-white/60" style={{ left: `${x}%` }} title={`${m.name} · ${dueLabel(m.dueAt)}`} /> : null })}</div><span className="text-right text-[10px] font-black text-blue-300">{row.progress}%</span></button> })}</div>
    {dependencies.length ? <div className="mt-5 border-t border-white/5 pt-4"><h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cross-project dependencies</h4><div className="mt-2 grid gap-2 md:grid-cols-2">{dependencies.slice(0, 12).map((dep: any, index: number) => <div key={`${dep.fromTaskId}-${dep.toTaskId}-${index}`} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[9px] text-slate-500"><span className="font-black text-slate-300">{dep.fromProjectName}</span> / {dep.fromTaskName} <ChevronRight size={10} className="mx-1 inline" /> <span className="font-black text-slate-300">{dep.toProjectName}</span> / {dep.toTaskName}</div>)}</div></div> : null}
  </div></div>
}

function OwnersView({ projects, myOwner, onMyOwnerChange, onOpenBoard }: any) {
  const workload = buildOwnerWorkload(projects); const myWork = getMyWork(projects, myOwner)
  return <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto custom-scrollbar xl:grid-cols-[1.2fr_0.8fr]" data-project-owner-cockpit="true"><section className="rounded-lg border border-white/5 bg-black/20 p-5"><h3 className="text-sm font-black text-white">Owner workload & capacity</h3><p className="mt-1 text-[9px] uppercase tracking-widest text-slate-600">Execution pressure by assigned work</p><div className="mt-4 space-y-2">{workload.map((row: any) => <div key={row.owner} className="grid grid-cols-[minmax(120px,1fr)_repeat(6,72px)] gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-[9px]"><span className={row.owner === 'Unassigned' ? 'font-black text-amber-300' : 'font-black text-slate-200'}>{row.owner}</span>{[['Tasks', row.tasks], ['Projects', row.projects], ['Blocked', row.blocked], ['Overdue', row.overdue], ['Review', row.review], ['Critical', row.critical]].map(([label, value]) => <span key={String(label)} className="text-right"><b className="block text-slate-300">{value}</b><small className="text-[7px] uppercase text-slate-700">{label}</small></span>)}</div>)}</div></section>
    <aside className="rounded-lg border border-white/5 bg-black/20 p-5" data-project-my-work="true"><h3 className="text-sm font-black text-white">My Work cockpit</h3><p className="mt-1 text-[9px] uppercase tracking-widest text-slate-600">Enter your owner label to isolate assigned execution</p><input value={myOwner} onChange={(e) => onMyOwnerChange(e.target.value)} placeholder="Owner name / username" className="mt-4 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[10px] text-white outline-none focus:border-blue-500/40" /><div className="mt-4 space-y-2">{myOwner && myWork.length ? myWork.slice(0, 30).map((row: any) => <button key={`${row.projectId}-${row.task.id}`} onClick={() => onOpenBoard(row.projectId)} className="w-full rounded-lg border border-white/5 bg-white/[0.02] p-3 text-left hover:border-blue-500/20"><p className="text-[10px] font-black text-slate-200">{row.task.name}</p><p className="mt-1 text-[8px] uppercase tracking-widest text-slate-600">{row.projectName} · {row.task.status} · {dueLabel(row.task.end_date)}</p></button>) : <WorkspaceEmptyState compact title={myOwner ? 'No open work found' : 'Set your owner identity'} description="This remains local workspace state; no identity field is persisted to the backend." />}</div></aside>
  </div>
}

function ReviewMode({ project, onTask }: any) {
  if (!project) return <WorkspaceEmptyState title="Select a project for review" description="Choose a project from the selector." />
  const health = getProjectHealth(project); const milestones = getProjectMilestones(project); const attention = buildProjectAttentionItems([project]); const critical = getCriticalTaskIds(project); const tasks = project.tasks || []
  return <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar" data-project-review-mode="true"><ProjectPulse project={project} /><div className="mt-4 grid gap-4 xl:grid-cols-2"><section className="rounded-lg border border-white/5 bg-black/20 p-5"><h3 className="text-sm font-black text-white">Weekly execution review</h3><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Open', tasks.filter((t: any) => t.status !== 'Completed').length], ['Critical', critical.size], ['Blocked', health.blocked], ['Overdue', health.overdue]].map(([label, value]) => <MetricCard key={String(label)} icon={<BarChart3 size={14} />} label={String(label)} value={value} note="Current project" />)}</div><div className="mt-4"><h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Decisions / interventions required</h4><div className="mt-2 space-y-2">{attention.slice(0, 10).map((item) => <button key={item.id} onClick={() => onTask(item.taskId)} className="w-full rounded-lg border border-white/5 bg-white/[0.02] p-3 text-left"><span className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase ${toneClass[item.tone]}`}>{item.label}</span><span className="ml-2 text-[10px] font-black text-slate-200">{item.taskName}</span><p className="mt-2 text-[8px] text-slate-600">{item.reasonLabels.join(' · ')}</p></button>)}</div></div></section><section className="rounded-lg border border-white/5 bg-black/20 p-5"><h3 className="text-sm font-black text-white">Milestone Control Tower</h3><p className="mt-1 text-[9px] uppercase tracking-widest text-slate-600">Current, next, slipping and blocked checkpoints</p><div className="mt-4"><MilestoneControlTower project={project} onTask={onTask} /></div><div className="mt-5 border-t border-white/5 pt-4"><h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Benefits realization</h4><div className="mt-3 grid grid-cols-3 gap-2">{[['Hours saved', project.man_hours_saved || 0], ['Stoploss min', project.stoploss_minutes_saved || 0], ['Wafers gained', project.wafers_gained || 0]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-white/5 bg-white/[0.02] p-3"><p className="text-[7px] uppercase text-slate-700">{label}</p><p className="mt-1 text-base font-black text-blue-300">{Number(value)}</p></div>)}</div><p className="mt-2 text-[8px] text-slate-700">Targets are shown only when recorded in existing project metadata; this view does not manufacture benefit targets.</p></div></section></div></div>
}

function TaskModal({ project, task, mode, isSaving, onClose, onSave }: any) {
  const [draft, setDraft] = useState<any>(task || { name: '', status: 'To Do', priority: 'Medium', owner: '', start_date: '', end_date: '', description: '', dependencies_json: [], metadata_json: {} })
  useEffect(() => { setDraft(task || { name: '', status: 'To Do', priority: 'Medium', owner: '', start_date: '', end_date: '', description: '', dependencies_json: [], metadata_json: {} }) }, [task, mode])
  if (!project) return null
  const dependencyText = Array.isArray(draft.dependencies_json) ? draft.dependencies_json.map((d: any) => d?.id ?? d?.task_id ?? d).join(', ') : ''
  return <WorkspaceModal isOpen={Boolean(mode)} onClose={onClose} size="wide" title={mode === 'create' ? `Quick task · ${project.name}` : `Edit task · ${draft.name || ''}`} subtitle="Uses the existing Project task contract; no new backend schema." icon={<List size={17} />} hideFooterClose footerRight={<ToolbarButton variant="primary" disabled={isSaving || !String(draft.name || '').trim()} onClick={() => onSave(draft)}><Save size={12} /> {isSaving ? 'Saving…' : 'Save task'}</ToolbarButton>}>
    <div className="grid gap-4 pt-3 md:grid-cols-2"><label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Task name<input value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] normal-case text-white" /></label><label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Owner<input value={draft.owner || ''} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] normal-case text-white" /></label><label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Status<select value={normalizeTaskStatus(draft.status) === 'Unknown' ? 'To Do' : draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b1222] px-3 py-2 text-[11px] normal-case text-white">{PROJECT_TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label><label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Priority<select value={draft.priority || 'Medium'} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b1222] px-3 py-2 text-[11px] normal-case text-white">{['Low', 'Medium', 'High', 'Highest'].map((s) => <option key={s}>{s}</option>)}</select></label><label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Start date<input type="date" value={String(draft.start_date || '').slice(0, 10)} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] normal-case text-white" /></label><label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Due date<input type="date" value={String(draft.end_date || '').slice(0, 10)} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] normal-case text-white" /></label><label className="md:col-span-2 text-[9px] font-black uppercase tracking-widest text-slate-500">Dependencies · task IDs<input value={dependencyText} onChange={(e) => setDraft({ ...draft, dependencies_json: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] normal-case text-white" /></label><label className="md:col-span-2 text-[9px] font-black uppercase tracking-widest text-slate-500">Description<textarea value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={5} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] normal-case text-white" /></label></div>
  </WorkspaceModal>
}

function LegacyEmbeddedHost() {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const host = ref.current
    if (!host) return
    const mark = () => {
      const railTrigger = host.querySelector('[aria-label="New Vector"]')
      const rail = railTrigger?.closest('div[class*="border-r"]') as HTMLElement | null
      if (rail) rail.dataset.projectEmbeddedRail = 'true'
      const legacyHud = (Array.from(host.querySelectorAll('button')) as HTMLButtonElement[]).find((button) => button.textContent?.includes('Unlock Editor'))?.closest('div[class*="h-16"]') as HTMLElement | null
      if (legacyHud) legacyHud.dataset.projectEmbeddedHud = 'true'
    }
    mark(); const observer = new MutationObserver(mark); observer.observe(host, { childList: true, subtree: true }); return () => observer.disconnect()
  }, [])
  return <div ref={ref} className="project-golden-legacy min-h-0 flex-1 overflow-hidden rounded-lg border border-white/5 bg-[#0b0c14]" data-project-legacy-core="true" data-project-embedded-host="true"><LegacyProjects /><style>{`[data-project-embedded-host="true"] [data-project-embedded-rail="true"],[data-project-embedded-host="true"] [data-project-embedded-hud="true"]{display:none!important}.project-golden-legacy>div{border:0!important;border-radius:0!important;box-shadow:none!important}`}</style></div>
}

export default function ProjectsGolden() {
  const queryClient = useQueryClient(); const [searchParams, setSearchParams] = useSearchParams(); const stored = useMemo(() => readStoredState(), [])
  const view = resolveProjectGoldenView(searchParams.get('view')); const idParam = searchParams.get('id'); const selectedProjectId = idParam && Number.isFinite(Number(idParam)) ? Number(idParam) : null
  const [search, setSearch] = useState(stored.search || ''); const [statusFilter, setStatusFilter] = useState(stored.statusFilter || 'ALL'); const [priorityFilter, setPriorityFilter] = useState(stored.priorityFilter || 'ALL'); const [sortMode, setSortMode] = useState<ProjectSortMode>(stored.sortMode || 'order'); const [watchedOnly, setWatchedOnly] = useState(Boolean(stored.watchedOnly)); const [watchedIds, setWatchedIds] = useState<string[]>(stored.watchedIds || []); const [swimlane, setSwimlane] = useState<ProjectSwimlane>(stored.swimlane || 'none'); const [myOwner, setMyOwner] = useState(stored.myOwner || ''); const [savedViews, setSavedViews] = useState<any[]>(stored.savedViews || []); const [isCreateOpen, setIsCreateOpen] = useState(false); const [saveViewOpen, setSaveViewOpen] = useState(false); const [saveViewName, setSaveViewName] = useState(''); const [taskModal, setTaskModal] = useState<{ mode: 'create' | 'edit'; project: any; task?: any } | null>(null)

  useEffect(() => { if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ search, statusFilter, priorityFilter, sortMode, watchedOnly, watchedIds, swimlane, myOwner, savedViews })) }, [search, statusFilter, priorityFilter, sortMode, watchedOnly, watchedIds, swimlane, myOwner, savedViews])

  const { data: projects = [], isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ['projects'], queryFn: async () => { const response = await apiFetch('/api/v1/projects'); if (!response.ok) throw new Error(await response.text()); return response.json() }, placeholderData: (previous) => previous })
  const useSafeListQuery = (key: string, url: string) => useQuery({ queryKey: [key], queryFn: async () => { const response = await apiFetch(url); if (!response.ok) throw new Error(`${key} unavailable: ${await response.text()}`); return response.json() } })
  const { data: devices = [] } = useSafeListQuery('devices', '/api/v1/devices'); const { data: services = [] } = useSafeListQuery('logical-services', '/api/v1/logical-services'); const { data: options = [] } = useSafeListQuery('settings-options', '/api/v1/settings/options')

  const filteredProjects = useMemo(() => filterProjectsForGoldenView(projects, search, statusFilter, priorityFilter, sortMode, watchedIds, watchedOnly), [projects, search, statusFilter, priorityFilter, sortMode, watchedIds, watchedOnly])
  const selectedProject = useMemo(() => projects.find((project: any) => project?.id === selectedProjectId) || null, [projects, selectedProjectId])
  const setView = (nextView: ProjectGoldenView) => { const next = new URLSearchParams(searchParams); next.set('view', nextView); setSearchParams(next, { replace: true }) }
  const selectProject = (projectId: number, nextView?: ProjectGoldenView) => { const next = new URLSearchParams(searchParams); next.set('id', String(projectId)); if (nextView) next.set('view', nextView); setSearchParams(next, { replace: true }) }
  useEffect(() => { if (['board', 'review', 'workspace'].includes(view) && projects.length && !selectedProject) selectProject(filteredProjects[0]?.id || projects[0].id) /* URL remains restoration source */ }, [view, projects.length, selectedProjectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateProjectMutation = useMutation({
    mutationFn: async ({ nextProject, baseFingerprint }: any) => {
      const latestResponse = await apiFetch('/api/v1/projects'); if (!latestResponse.ok) throw new Error(await latestResponse.text()); const latest = await latestResponse.json(); const remote = latest.find((item: any) => item.id === nextProject.id)
      if (!remote || projectFingerprint(remote) !== baseFingerprint) throw new Error('Project changed since this view loaded. Refresh before applying this edit.')
      const response = await apiFetch(`/api/v1/projects/${nextProject.id}`, { method: 'PUT', body: JSON.stringify(nextProject) }); if (!response.ok) throw new Error(await response.text()); return response.json()
    },
    onMutate: async ({ nextProject }: any) => { await queryClient.cancelQueries({ queryKey: ['projects'] }); const previous = queryClient.getQueryData<any[]>(['projects']) || []; queryClient.setQueryData(['projects'], previous.map((item) => item.id === nextProject.id ? nextProject : item)); return { previous } },
    onError: (mutationError: any, _variables, context: any) => { if (context?.previous) queryClient.setQueryData(['projects'], context.previous); toast.error(mutationError?.message || 'Project update failed') },
    onSuccess: () => toast.success('Project execution updated'), onSettled: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
  const mutateProject = (current: any, nextProject: any) => { if (nextProject === current || projectFingerprint(nextProject) === projectFingerprint(current)) return; updateProjectMutation.mutate({ nextProject, baseFingerprint: projectFingerprint(current) }) }
  const createProjectMutation = useMutation({ mutationFn: async (project: any) => { const response = await apiFetch('/api/v1/projects', { method: 'POST', body: JSON.stringify(project) }); if (!response.ok) throw new Error(await response.text()); return response.json() }, onSuccess: (project) => { queryClient.invalidateQueries({ queryKey: ['projects'] }); setIsCreateOpen(false); toast.success('Project created'); selectProject(project.id, 'workspace') }, onError: (e: any) => toast.error(e?.message || 'Project creation failed') })

  const moveTask = (taskId: number | string, status: ProjectTaskStatus) => { if (!selectedProject) return; mutateProject(selectedProject, moveProjectTaskStatus(selectedProject, taskId, status)) }
  const saveTask = (draft: any) => { if (!taskModal?.project) return; const current = projects.find((p: any) => p.id === taskModal.project.id) || taskModal.project; const next = taskModal.mode === 'create' ? createProjectTask(current, { ...draft, id: Date.now(), progress: draft.status === 'Completed' ? 100 : Number(draft.progress) || 0, dependencies_json: draft.dependencies_json || [], metadata_json: draft.metadata_json || {} }) : updateProjectTask(current, draft.id, { ...draft, progress: draft.status === 'Completed' ? 100 : getTaskProgress(draft) }); mutateProject(current, next); setTaskModal(null) }
  const openEditById = (projectId: number, taskId: number | string) => { const project = projects.find((p: any) => p.id === projectId); const task = project?.tasks?.find((t: any) => String(t.id) === String(taskId)); if (project && task) setTaskModal({ mode: 'edit', project, task }) }
  const toggleWatch = (id: number) => setWatchedIds((current) => current.includes(String(id)) ? current.filter((item) => item !== String(id)) : [...current, String(id)])
  const clearFilters = () => { setSearch(''); setStatusFilter('ALL'); setPriorityFilter('ALL'); setWatchedOnly(false); setSortMode('order') }
  const applySavedView = (id: string) => { const saved = savedViews.find((item) => item.id === id); if (!saved) return; setSearch(saved.search || ''); setStatusFilter(saved.statusFilter || 'ALL'); setPriorityFilter(saved.priorityFilter || 'ALL'); setSortMode(saved.sortMode || 'order'); setWatchedOnly(Boolean(saved.watchedOnly)); if (saved.view) setView(resolveProjectGoldenView(saved.view)) }
  const saveCurrentView = () => { const name = saveViewName.trim(); if (!name) return; setSavedViews((current) => [...current.filter((item) => item.name !== name), { id: `${Date.now()}`, name, search, statusFilter, priorityFilter, sortMode, watchedOnly, view }]); setSaveViewName(''); setSaveViewOpen(false); toast.success('Project view saved locally') }

  const selectorOptions = (filteredProjects.length ? filteredProjects : projects).map((project: any) => ({ value: project.id, label: project.name })); const summary = buildPortfolioMetrics(projects)
  return <OperationalWorkspaceShell archetype="hybrid" workspace="projects" className="bg-[#0a0c14] p-4 sm:p-6" header={{ eyebrow: 'Execution Management', title: 'Project Execution Intelligence', subtitle: view === 'portfolio' ? 'Portfolio health, critical path, milestone pressure and defended value.' : view === 'board' ? 'Operational flow with quick editing, swimlanes and WIP diagnostics.' : view === 'roadmap' ? 'Cross-project schedule and dependency visibility.' : view === 'owners' ? 'Owner workload and personal execution cockpit.' : view === 'review' ? 'Weekly project review and milestone control.' : 'Deep planning, evidence, Gantt, activity and adoption.', meta: <><WorkspaceSectionBadge tone="blue">{summary.activeProjects} active</WorkspaceSectionBadge><WorkspaceSectionBadge tone={summary.healthRed ? 'rose' : summary.healthAmber ? 'amber' : 'emerald'}>{summary.healthRed} red · {summary.healthAmber} amber</WorkspaceSectionBadge><WorkspaceSectionBadge>{summary.overallProgress}% task-weighted</WorkspaceSectionBadge></> }} commandBar={{ left: <><ToolbarSearch value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects, objectives, owners..." /><ToolbarGroup className="min-w-max"><AppDropdown value={normalizeProjectFilterValue(statusFilter)} onChange={(value) => setStatusFilter(normalizeProjectFilterValue(String(value)))} options={PROJECT_STATUS_OPTIONS} className="w-[145px]" /><AppDropdown value={normalizeProjectFilterValue(priorityFilter)} onChange={(value) => setPriorityFilter(normalizeProjectFilterValue(String(value)))} options={PROJECT_PRIORITY_OPTIONS} className="w-[145px]" /><AppDropdown value={sortMode} onChange={(value) => setSortMode(String(value) as ProjectSortMode)} options={SORT_OPTIONS} className="w-[150px]" />{['board', 'review', 'workspace'].includes(view) && selectorOptions.length ? <AppDropdown value={selectedProject?.id || selectorOptions[0]?.value || ''} onChange={(value) => selectProject(Number(value))} options={selectorOptions} className="w-[220px]" /> : null}</ToolbarGroup></>, right: <ToolbarGroup><ToolbarButton variant={watchedOnly ? 'secondary' : 'quiet'} onClick={() => setWatchedOnly((value) => !value)} title="Show watched projects only"><Eye size={12} /> Watched</ToolbarButton>{savedViews.length ? <AppDropdown value="" onChange={(value) => applySavedView(String(value))} options={[{ value: '', label: 'Saved views' }, ...savedViews.map((item) => ({ value: item.id, label: item.name }))]} className="w-[150px]" /> : null}<ToolbarButton variant="quiet" onClick={() => setSaveViewOpen(true)}><Save size={12} /> Save view</ToolbarButton><ToolbarButton variant="quiet" onClick={clearFilters}><X size={12} /> Reset</ToolbarButton><ToolbarSegmented options={VIEW_OPTIONS} value={view} onChange={(value) => setView(resolveProjectGoldenView(value))} /><ToolbarButton onClick={() => refetch()} disabled={isFetching} title="Refresh projects"><RefreshCcw size={13} className={isFetching ? 'animate-spin' : ''} /></ToolbarButton><ToolbarButton onClick={() => setIsCreateOpen(true)} variant="primary"><Plus size={13} /> Project</ToolbarButton></ToolbarGroup> }}>
    {isLoading && !projects.length ? <WorkspaceEmptyState icon={<RefreshCcw size={26} className="animate-spin" />} title="Synchronizing projects" description="Hydrating the execution workspace." /> : isError ? <WorkspaceEmptyState icon={<ShieldAlert size={28} className="text-rose-400" />} title="Project data is unavailable" description={error instanceof Error ? error.message : 'The project API did not return a usable response.'} action={<ToolbarButton onClick={() => refetch()}>Retry</ToolbarButton>} /> : !projects.length ? <WorkspaceEmptyState icon={<Briefcase size={28} />} title="No projects yet" description="Create the first project to establish a portfolio and execution workspace." action={<ToolbarButton onClick={() => setIsCreateOpen(true)} variant="primary">New Project</ToolbarButton>} /> : view === 'portfolio' ? <PortfolioCommandCenter projects={projects} filteredProjects={filteredProjects} watchedIds={watchedIds} onToggleWatch={toggleWatch} onOpenProject={(id: number) => selectProject(id, 'workspace')} onOpenBoard={(id: number) => selectProject(id, 'board')} onQuickTask={(project: any) => setTaskModal({ mode: 'create', project })} onQuickEdit={openEditById} /> : view === 'board' ? <ExecutionBoard project={selectedProject} isSaving={updateProjectMutation.isPending} swimlane={swimlane} onSwimlaneChange={setSwimlane} onMoveTask={moveTask} onQuickTask={(project: any) => setTaskModal({ mode: 'create', project })} onEditTask={(task: any) => selectedProject && setTaskModal({ mode: 'edit', project: selectedProject, task })} onOpenWorkspace={() => selectedProject && selectProject(selectedProject.id, 'workspace')} /> : view === 'roadmap' ? <RoadmapView projects={filteredProjects} onOpen={(id: number) => selectProject(id, 'review')} /> : view === 'owners' ? <OwnersView projects={filteredProjects} myOwner={myOwner} onMyOwnerChange={setMyOwner} onOpenBoard={(id: number) => selectProject(id, 'board')} /> : view === 'review' ? <ReviewMode project={selectedProject} onTask={(taskId: any) => selectedProject && openEditById(selectedProject.id, taskId)} /> : <div className="flex min-h-0 flex-1 flex-col gap-3" data-project-deep-workspace="true"><ProjectPulse project={selectedProject} />{selectedProject ? <MilestoneControlTower project={selectedProject} onTask={(taskId) => openEditById(selectedProject.id, taskId)} /> : null}<LegacyEmbeddedHost /></div>}

    <WorkspaceModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} size="workspace" title="Create Project" subtitle="Establish a strategic execution vector using the existing Project contract." icon={<Target size={18} />} hideFooterClose><ProjectForm initialData={{ name: '', type: 'Strategic', status: 'Planning', priority: 'Medium' }} onSave={(project: any) => createProjectMutation.mutate(project)} isSaving={createProjectMutation.isPending} onCancel={() => setIsCreateOpen(false)} devices={devices} services={services} options={options} /></WorkspaceModal>
    <WorkspaceModal isOpen={saveViewOpen} onClose={() => setSaveViewOpen(false)} size="compact" title="Save Project View" subtitle="Stores the current operating lens locally without backend schema." icon={<LayoutGrid size={16} />} hideFooterClose footerRight={<ToolbarButton variant="primary" onClick={saveCurrentView} disabled={!saveViewName.trim()}><Save size={12} /> Save</ToolbarButton>}><label className="block pt-4 text-[9px] font-black uppercase tracking-widest text-slate-500">View name<input value={saveViewName} onChange={(e) => setSaveViewName(e.target.value)} autoFocus className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] normal-case text-white" /></label></WorkspaceModal>
    <TaskModal project={taskModal?.project} task={taskModal?.task} mode={taskModal?.mode} isSaving={updateProjectMutation.isPending} onClose={() => setTaskModal(null)} onSave={saveTask} />
  </OperationalWorkspaceShell>
}
