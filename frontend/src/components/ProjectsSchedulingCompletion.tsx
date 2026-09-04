import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, BarChart3, CalendarDays, CheckCircle2, ChevronRight, GitBranch, Layers3, Save, SlidersHorizontal, X } from 'lucide-react'
import toast from 'react-hot-toast'
import ProjectsGolden from './ProjectsGolden'
import { apiFetch } from '../api/apiClient'
import { projectFingerprint } from './ProjectsGolden.model'
import {
  PROJECT_DEPENDENCY_TYPES,
  analyzeProjectSchedule,
  applyProjectScheduleScenario,
  buildProjectCapacityView,
  captureProjectScheduleBaselineV2,
  compareProjectScheduleBaseline,
  getProjectScheduleState,
  getProjectTaskConstraint,
  normalizeProjectTaskDependencies,
  saveProjectScheduleScenario,
  setProjectTaskConstraint,
  setProjectWorkingDays,
  setTypedProjectDependency,
  simulateNamedProjectScenario,
  type ProjectConstraintType,
  type ProjectDependencyType,
} from './ProjectsSchedulingCompletion.model'

const controlStyle = { minHeight: 40, minWidth: 40 } as const
const inputClass = 'w-full rounded-md border border-white/10 bg-[#0b1222] px-2 py-2 text-xs text-white outline-none focus:border-blue-500/40'
const buttonClass = 'inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs font-black uppercase tracking-wider text-slate-300 hover:border-blue-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40'
const primaryButtonClass = `${buttonClass} border-blue-500/30 bg-blue-500/10 text-blue-300`
const sectionClass = 'rounded-lg border border-white/5 bg-black/25 p-3'
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const constraintTypes: ProjectConstraintType[] = ['ASAP', 'SNET', 'FNLT', 'MUST_START', 'MUST_FINISH']

const readProjects = async () => {
  const response = await apiFetch('/api/v1/projects')
  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

const capacityTone = (status: string) => status === 'OVER' ? 'text-rose-300 border-rose-500/20 bg-rose-500/[0.04]' : status === 'WITHIN' ? 'text-emerald-300 border-emerald-500/20 bg-emerald-500/[0.04]' : 'text-amber-300 border-amber-500/20 bg-amber-500/[0.04]'
const signed = (value: number | null) => value == null ? 'Unknown' : `${value > 0 ? '+' : ''}${value}d`

export default function ProjectsSchedulingCompletion() {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const view = String(searchParams.get('view') || 'overview').toLowerCase()
  const selectedId = String(searchParams.get('id') || '')
  const [open, setOpen] = useState(false)
  const [taskId, setTaskId] = useState('')
  const [predecessorId, setPredecessorId] = useState('')
  const [dependencyType, setDependencyType] = useState<ProjectDependencyType>('FS')
  const [lagDays, setLagDays] = useState(0)
  const [constraintType, setConstraintType] = useState<ProjectConstraintType>('ASAP')
  const [constraintDate, setConstraintDate] = useState('')
  const [workingDays, setWorkingDays] = useState<number[] | null>(null)
  const [baselineName, setBaselineName] = useState('')
  const [baselineId, setBaselineId] = useState('')
  const [scenarioName, setScenarioName] = useState('')
  const [scenarioTaskId, setScenarioTaskId] = useState('')
  const [scenarioSlipDays, setScenarioSlipDays] = useState(5)
  const [previewNonce, setPreviewNonce] = useState(0)
  const [liveMessage, setLiveMessage] = useState('')
  const scheduleToggleRef = useRef<HTMLButtonElement | null>(null)
  const scheduleCloseRef = useRef<HTMLButtonElement | null>(null)

  const { data: projects = [] } = useQuery<any[]>({ queryKey: ['projects'], queryFn: readProjects, staleTime: 30_000 })
  const selectedProject = useMemo(() => {
    const list = Array.isArray(projects) ? projects : []
    if (selectedId) return list.find((project: any) => String(project?.id) === selectedId) || null
    return list.find((project: any) => !['Completed', 'Cancelled'].includes(project?.status)) || list[0] || null
  }, [projects, selectedId])
  const tasks = Array.isArray(selectedProject?.tasks) ? selectedProject.tasks : []
  const selectedTask = tasks.find((task: any) => String(task?.id) === taskId) || null
  const scheduleState = getProjectScheduleState(selectedProject)
  const analysis = useMemo(() => analyzeProjectSchedule(selectedProject), [selectedProject])
  const capacity = useMemo(() => buildProjectCapacityView(selectedProject), [selectedProject])
  const baselineComparison = useMemo(() => baselineId ? compareProjectScheduleBaseline(selectedProject, baselineId) : [], [selectedProject, baselineId])
  const preview = useMemo(() => scenarioTaskId && scenarioSlipDays ? simulateNamedProjectScenario(selectedProject, scenarioTaskId, scenarioSlipDays) : null, [selectedProject, scenarioTaskId, scenarioSlipDays, previewNonce])

  useEffect(() => {
    const first = String(tasks[0]?.id || '')
    if (!taskId || !tasks.some((task: any) => String(task?.id) === taskId)) setTaskId(first)
    if (!scenarioTaskId || !tasks.some((task: any) => String(task?.id) === scenarioTaskId)) setScenarioTaskId(first)
  }, [selectedProject?.id, tasks.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedTask) return
    const constraint = getProjectTaskConstraint(selectedTask)
    setConstraintType(constraint.type)
    setConstraintDate(constraint.date || '')
    const firstPred = normalizeProjectTaskDependencies(selectedTask)[0]
    if (firstPred) { setPredecessorId(firstPred.id); setDependencyType(firstPred.type); setLagDays(firstPred.lag_days) }
    else { setPredecessorId(tasks.find((task: any) => String(task?.id) !== String(selectedTask?.id)) ? String(tasks.find((task: any) => String(task?.id) !== String(selectedTask?.id))?.id) : ''); setDependencyType('FS'); setLagDays(0) }
  }, [selectedTask?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setWorkingDays(Array.isArray(scheduleState.working_days) ? [...scheduleState.working_days] : null)
    const firstBaseline = scheduleState.baselines?.[0]?.id || ''; setBaselineId((current) => scheduleState.baselines?.some((item) => item.id === current) ? current : firstBaseline)
  }, [selectedProject?.id, JSON.stringify(scheduleState.working_days), scheduleState.baselines?.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => scheduleCloseRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  const updateMutation = useMutation({
    mutationFn: async ({ baseProject, nextProject, label }: { baseProject: any; nextProject: any; label: string }) => {
      const latestResponse = await apiFetch('/api/v1/projects')
      if (!latestResponse.ok) throw new Error(await latestResponse.text())
      const latest = await latestResponse.json(); const remote = latest.find((item: any) => String(item?.id) === String(nextProject?.id))
      if (!remote || projectFingerprint(remote) !== projectFingerprint(baseProject)) throw new Error('Project changed since this schedule control loaded. Refresh before applying this edit.')
      const response = await apiFetch(`/api/v1/projects/${nextProject.id}`, { method: 'PUT', body: JSON.stringify(nextProject) })
      if (!response.ok) throw new Error(await response.text())
      return { saved: await response.json(), label }
    },
    onMutate: ({ label }: any) => setLiveMessage(`Saving ${String(label || 'schedule update').toLowerCase()}…`),
    onSuccess: ({ saved, label }: any) => {
      queryClient.setQueryData<any[]>(['projects'], (current = []) => current.map((project: any) => String(project?.id) === String(saved?.id) ? saved : project))
      setLiveMessage(label)
      toast.success(label)
    },
    onError: (error: any) => {
      const message = error?.message || 'Schedule update failed'
      setLiveMessage(message)
      toast.error(message)
    },
  })

  const persist = (nextProject: any, label: string) => {
    if (!selectedProject || nextProject === selectedProject || projectFingerprint(nextProject) === projectFingerprint(selectedProject)) return
    updateMutation.mutate({ baseProject: selectedProject, nextProject, label })
  }

  const saveDependency = () => {
    if (!selectedProject || !taskId || !predecessorId) return
    const next = setTypedProjectDependency(selectedProject, taskId, predecessorId, dependencyType, lagDays, true)
    if (next === selectedProject) { const message = 'Dependency was not changed. Check for a duplicate or cycle.'; setLiveMessage(message); toast.error(message); return }
    persist(next, 'Typed dependency saved')
  }
  const removeDependency = (predecessor: string) => selectedProject && persist(setTypedProjectDependency(selectedProject, taskId, predecessor, 'FS', 0, false), 'Dependency removed')
  const saveConstraint = () => selectedProject && persist(setProjectTaskConstraint(selectedProject, taskId, { type: constraintType, date: constraintType === 'ASAP' ? null : constraintDate }), 'Task constraint saved')
  const saveCalendar = () => selectedProject && persist(setProjectWorkingDays(selectedProject, workingDays), 'Working calendar saved')
  const captureBaseline = () => selectedProject && persist(captureProjectScheduleBaselineV2(selectedProject, baselineName), 'Schedule baseline captured')
  const saveScenario = () => {
    if (!selectedProject || !scenarioTaskId || !scenarioSlipDays) return
    const result = saveProjectScheduleScenario(selectedProject, { name: scenarioName, taskId: scenarioTaskId, slipDays: scenarioSlipDays })
    persist(result.project, 'Scenario saved without changing live dates'); setScenarioName('')
  }
  const applyScenario = (scenarioId: string) => {
    if (!selectedProject) return
    const result = applyProjectScheduleScenario(selectedProject, scenarioId)
    if (result.project === selectedProject) { if ('blockedReason' in result && result.blockedReason) { setLiveMessage(result.blockedReason); toast.error(result.blockedReason) }; return }
    persist(result.project, `Scenario applied to ${result.affected.length} task${result.affected.length === 1 ? '' : 's'}`)
  }
  const toggleDay = (day: number) => setWorkingDays((current) => {
    const base = current == null ? [1, 2, 3, 4, 5] : current
    return base.includes(day) ? base.filter((value) => value !== day) : [...base, day].sort()
  })

  const closeScheduleControl = () => {
    setOpen(false)
    requestAnimationFrame(() => scheduleToggleRef.current?.focus())
  }
  const handleScheduleDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    closeScheduleControl()
  }

  const timelineActive = view === 'timeline'
  const criticalRows = analysis.rows.filter((row) => row.critical)
  const dependencies = normalizeProjectTaskDependencies(selectedTask)

  return <div className="relative h-full min-h-0" data-projects-scheduling-completion="true">
    <ProjectsGolden />
    {timelineActive && selectedProject ? <>
      <button ref={scheduleToggleRef} type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="project-schedule-control-drawer" aria-haspopup="dialog" data-project-schedule-control-toggle="true" className="absolute right-4 top-3 z-40 inline-flex min-h-[40px] min-w-[40px] items-center gap-2 rounded-lg border border-blue-500/30 bg-[#0b1222]/95 px-3 py-2 text-xs font-black uppercase tracking-widest text-blue-300 shadow-xl backdrop-blur hover:bg-blue-500/10">
        <SlidersHorizontal size={13} /> Schedule control <ChevronRight size={12} className={open ? 'rotate-180' : ''} />
      </button>
      {open ? <aside id="project-schedule-control-drawer" role="dialog" aria-modal="true" aria-labelledby="project-schedule-control-title" aria-describedby="project-schedule-control-description" aria-busy={updateMutation.isPending} onKeyDown={handleScheduleDialogKeyDown} className="absolute inset-x-2 bottom-2 top-14 z-50 flex flex-col overflow-hidden rounded-xl border border-blue-500/20 bg-[#08101f]/[0.98] shadow-2xl backdrop-blur sm:left-auto sm:right-3 sm:w-[470px]" data-project-schedule-control-drawer="true">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/5 px-4 py-3"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">OUT-40 · Timeline accessibility hardening</p><h2 id="project-schedule-control-title" className="mt-1 text-sm font-black text-white">Scheduling, capacity & scenarios</h2><p id="project-schedule-control-description" className="mt-1 text-xs text-slate-500">Controls extend the current Gantt. No parallel scheduler or datastore.</p></div><button ref={scheduleCloseRef} type="button" onClick={closeScheduleControl} className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Close schedule control"><X size={16} /></button></header>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-project-schedule-live-status="true">{liveMessage}</p>
        <div className="flex-1 space-y-3 overflow-y-auto p-3 custom-scrollbar">
          <section className={sectionClass} data-project-schedule-network="true"><div className="flex items-center justify-between"><span><p className="text-xs font-black uppercase tracking-widest text-slate-600">Dependency network</p><h3 className="mt-1 text-xs font-black text-white">Typed relationship + lag</h3></span><GitBranch size={15} className="text-blue-400" /></div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="text-xs font-black uppercase text-slate-600">Task<select style={controlStyle} className={`${inputClass} mt-1`} value={taskId} onChange={(event) => setTaskId(event.target.value)}>{tasks.map((task: any) => <option key={String(task.id)} value={String(task.id)}>{task.name || task.id}</option>)}</select></label><label className="text-xs font-black uppercase text-slate-600">Predecessor<select style={controlStyle} className={`${inputClass} mt-1`} value={predecessorId} onChange={(event) => setPredecessorId(event.target.value)}><option value="">Select</option>{tasks.filter((task: any) => String(task.id) !== taskId).map((task: any) => <option key={String(task.id)} value={String(task.id)}>{task.name || task.id}</option>)}</select></label><label className="text-xs font-black uppercase text-slate-600">Type<select style={controlStyle} className={`${inputClass} mt-1`} value={dependencyType} onChange={(event) => setDependencyType(event.target.value as ProjectDependencyType)}>{PROJECT_DEPENDENCY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label className="text-xs font-black uppercase text-slate-600">Lag / lead days<input style={controlStyle} className={`${inputClass} mt-1`} type="number" value={lagDays} onChange={(event) => setLagDays(Number(event.target.value))} /></label></div>
            <button className={`${primaryButtonClass} mt-2 w-full`} disabled={updateMutation.isPending || !predecessorId} onClick={saveDependency}><Save size={11} /> Save dependency</button>
            <div className="mt-2 space-y-1">{dependencies.length ? dependencies.map((dep) => <div key={dep.id} className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5 text-xs"><span className="text-slate-400">{dep.id} → {taskId} <b className="text-blue-300">{dep.type}</b> {dep.lag_days >= 0 ? '+' : ''}{dep.lag_days}d</span><button className="min-h-[40px] min-w-[40px] rounded-md px-2 text-xs text-rose-300 hover:bg-rose-500/10" onClick={() => removeDependency(dep.id)}>Remove</button></div>) : <p className="mt-2 text-xs text-slate-700">Legacy IDs display as FS +0d until edited; no migration loss.</p>}</div>
          </section>

          <section className={sectionClass} data-project-schedule-analysis="true"><div className="flex items-center justify-between"><span><p className="text-xs font-black uppercase tracking-widest text-slate-600">Critical path & slack</p><h3 className="mt-1 text-xs font-black text-white">Typed-edge CPM</h3></span><BarChart3 size={15} className="text-violet-300" /></div>
            {analysis.cycle ? <p className="mt-2 rounded-md border border-rose-500/20 bg-rose-500/[0.04] p-2 text-xs text-rose-300"><AlertTriangle size={11} className="mr-1 inline" />Cycle detected; new cyclic edges are rejected.</p> : <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3"><div className="rounded-md border border-white/5 p-2"><small className="text-xs uppercase text-slate-700">Critical</small><b className="mt-1 block text-sm text-white">{criticalRows.length}</b></div><div className="rounded-md border border-white/5 p-2"><small className="text-xs uppercase text-slate-700">Network span</small><b className="mt-1 block text-sm text-white">{analysis.makespanDays}d</b></div><div className="rounded-md border border-white/5 p-2"><small className="text-xs uppercase text-slate-700">Tasks</small><b className="mt-1 block text-sm text-white">{analysis.rows.length}</b></div></div>}
            <div className="mt-2 max-h-36 overflow-auto"><table className="w-full text-left text-xs"><thead className="text-slate-700"><tr><th className="py-1">Task</th><th>Slack</th><th>Path</th></tr></thead><tbody>{analysis.rows.slice().sort((a, b) => a.slackDays - b.slackDays).slice(0, 30).map((row) => <tr key={row.id} className="border-t border-white/[0.03]"><td className="max-w-[250px] truncate py-1 text-slate-400">{row.name}</td><td className="tabular-nums text-slate-500">{row.slackDays}d</td><td className={row.constraintViolation ? 'font-black text-amber-300' : row.critical ? 'font-black text-rose-300' : 'text-slate-700'}>{row.constraintViolation || (row.critical ? 'Critical' : 'Flexible')}</td></tr>)}</tbody></table></div>
          </section>

          <section className={sectionClass} data-project-schedule-constraints="true"><div className="flex items-center justify-between"><span><p className="text-xs font-black uppercase tracking-widest text-slate-600">Calendar & constraints</p><h3 className="mt-1 text-xs font-black text-white">Explicit schedule authority</h3></span><CalendarDays size={15} className="text-emerald-300" /></div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="text-xs font-black uppercase text-slate-600">Constraint<select style={controlStyle} className={`${inputClass} mt-1`} value={constraintType} onChange={(event) => setConstraintType(event.target.value as ProjectConstraintType)}>{constraintTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="text-xs font-black uppercase text-slate-600">Constraint date<input style={controlStyle} className={`${inputClass} mt-1`} type="date" disabled={constraintType === 'ASAP'} value={constraintDate} onChange={(event) => setConstraintDate(event.target.value)} /></label></div><button className={`${buttonClass} mt-2 w-full`} disabled={updateMutation.isPending || (constraintType !== 'ASAP' && !constraintDate)} onClick={saveConstraint}>Save task constraint</button>
            <div className="mt-3"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase text-slate-600">Project working days</p><button className="min-h-[40px] min-w-[40px] rounded-md px-2 text-xs font-black text-amber-300 hover:bg-amber-500/10" onClick={() => setWorkingDays(null)}>No explicit calendar</button></div><div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-7">{dayLabels.map((label, day) => <button key={label} type="button" aria-pressed={workingDays?.includes(day) ?? false} onClick={() => toggleDay(day)} className={`min-h-[40px] min-w-[40px] rounded-md border px-1 py-1.5 text-xs font-black ${workingDays?.includes(day) ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-white/5 text-slate-700'}`}>{label}</button>)}</div><p className="mt-2 text-xs text-slate-700">{workingDays == null ? 'No working calendar is inferred. Existing project dates remain authoritative.' : `Explicit project calendar: ${workingDays.map((day) => dayLabels[day]).join(', ')}`}</p><button className={`${buttonClass} mt-2 w-full`} disabled={updateMutation.isPending || (workingDays != null && !workingDays.length)} onClick={saveCalendar}>Save calendar</button></div>
          </section>

          <section className={sectionClass} data-project-schedule-scenarios="true"><div className="flex items-center justify-between"><span><p className="text-xs font-black uppercase tracking-widest text-slate-600">What-if scenarios</p><h3 className="mt-1 text-xs font-black text-white">Preview first · explicit Apply</h3></span><Layers3 size={15} className="text-cyan-300" /></div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_90px]"><select style={controlStyle} className={inputClass} value={scenarioTaskId} onChange={(event) => setScenarioTaskId(event.target.value)}>{tasks.map((task: any) => <option key={String(task.id)} value={String(task.id)}>{task.name || task.id}</option>)}</select><input style={controlStyle} className={inputClass} type="number" value={scenarioSlipDays} onChange={(event) => setScenarioSlipDays(Number(event.target.value))} aria-label="Scenario slip days" /></div><input style={controlStyle} className={`${inputClass} mt-2`} placeholder="Scenario name" value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} /><div className="mt-2 rounded-md border border-cyan-500/10 bg-cyan-500/[0.025] p-2 text-xs text-slate-500" data-project-scenario-preview="true">Preview is mutation-free: <b className="text-slate-300">{preview?.affected.length || 0}</b> affected · finish <b className="text-cyan-300">{signed(preview?.finishDeltaDays ?? 0)}</b>{preview?.constraintViolations?.length ? <span className="ml-1 text-rose-300">· {preview.constraintViolations.length} constraint violation(s); Apply is blocked</span> : null}.</div><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"><button className={buttonClass} onClick={() => setPreviewNonce((value) => value + 1)}>Refresh preview</button><button className={primaryButtonClass} disabled={updateMutation.isPending || !scenarioTaskId || !scenarioSlipDays} onClick={saveScenario}>Save scenario</button></div>
            <div className="mt-2 space-y-1">{(scheduleState.scenarios || []).slice(0, 8).map((scenario) => <div key={scenario.id} className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] p-2"><span className="min-w-0"><b className="block truncate text-xs text-slate-300">{scenario.name}</b><small className="text-xs text-slate-700">{scenario.task_id} · {scenario.slip_days >= 0 ? '+' : ''}{scenario.slip_days}d · {scenario.status}</small></span>{scenario.status === 'PROPOSED' ? <button className={primaryButtonClass} disabled={updateMutation.isPending} onClick={() => applyScenario(scenario.id)}><CheckCircle2 size={10} /> Apply</button> : <span className="text-xs font-black text-emerald-300">Applied</span>}</div>)}</div>
          </section>

          <section className={sectionClass} data-project-schedule-baselines="true"><div className="flex items-center justify-between"><span><p className="text-xs font-black uppercase tracking-widest text-slate-600">Baseline history</p><h3 className="mt-1 text-xs font-black text-white">Immutable comparisons</h3></span><Save size={15} className="text-amber-300" /></div><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input style={controlStyle} className={inputClass} value={baselineName} onChange={(event) => setBaselineName(event.target.value)} placeholder="Baseline name" /><button className={primaryButtonClass} disabled={updateMutation.isPending} onClick={captureBaseline}>Capture</button></div>{(scheduleState.baselines || []).length ? <><select style={controlStyle} className={`${inputClass} mt-2`} value={baselineId} onChange={(event) => setBaselineId(event.target.value)}>{(scheduleState.baselines || []).map((baseline) => <option key={baseline.id} value={baseline.id}>{baseline.name} · {baseline.captured_at.slice(0, 10)}</option>)}</select><div className="mt-2 max-h-28 overflow-y-auto text-xs">{baselineComparison.slice(0, 30).map((row) => <div key={row.id} className="grid grid-cols-[1fr_55px_55px] border-t border-white/[0.03] py-1"><span className="truncate text-slate-500">{row.name}</span><span className="text-right text-slate-600">S {signed(row.startDeltaDays)}</span><span className="text-right text-slate-600">F {signed(row.endDeltaDays)}</span></div>)}</div></> : <p className="mt-2 text-xs text-slate-700">No schedule baseline captured yet.</p>}</section>

          <section className={sectionClass} data-project-schedule-capacity="true"><div className="flex items-center justify-between"><span><p className="text-xs font-black uppercase tracking-widest text-slate-600">Resource pressure</p><h3 className="mt-1 text-xs font-black text-white">Workload ≠ invented capacity</h3></span><BarChart3 size={15} className="text-amber-300" /></div><p className="mt-2 text-xs text-slate-700">Capacity is only evaluated when canonical project metadata provides an explicit owner limit. Otherwise it remains Unknown.</p><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">{capacity.slice(0, 12).map((row) => <div key={row.owner} className={`rounded-md border p-2 ${capacityTone(row.status)}`}><b className="block truncate text-xs">{row.owner}</b><span className="mt-1 block text-xs">Workload {row.workload} · Capacity {row.capacity == null ? 'Unknown' : row.capacity} · {row.status}</span></div>)}</div></section>
        </div>
      </aside> : null}
    </> : null}
  </div>
}
