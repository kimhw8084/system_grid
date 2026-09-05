import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarClock, ChevronDown, ChevronRight, GitBranch, Milestone, Search, Target, Undo2, Redo2 } from 'lucide-react'
import {
  PROJECT_TASK_STATUSES,
  appendProjectAudit,
  buildProjectTimelineRows,
  getProjectTimelineRange,
  getTaskOwnerLabel,
  projectOrdinalToDate,
  resizeProjectTaskSchedule,
  scheduleProjectTask,
  shiftProjectTaskSchedules,
  type ProjectTimelineZoom,
} from './ProjectsGolden.model'
import {
  analyzeProjectSchedule,
  getProjectScheduleState,
  normalizeProjectTaskDependencies,
  setTypedProjectDependency,
  type ProjectDependencyType,
} from './ProjectsSchedulingCompletion.model'
import {
  GANTT_MAX_CONNECTORS,
  GANTT_RAIL_WIDTH,
  GANTT_ROW_HEIGHT,
  ganttDependencyEdges,
  ganttDependencyTypeForEdges,
  ganttOrthogonalPath,
  ganttRelationKey,
  ganttVisibleOrdinals,
  ganttWindow,
  type GanttEdge,
} from './ProjectsModernGantt.model'

type Persist = (nextProject: any, label: string) => Promise<any> | any
const PX_PER_DAY: Record<ProjectTimelineZoom, number> = { day: 28, week: 12, month: 5, quarter: 2.2 }
const TICK_STEP: Record<ProjectTimelineZoom, number> = { day: 1, week: 7, month: 30, quarter: 90 }
const zoomOptions: ProjectTimelineZoom[] = ['day', 'week', 'month', 'quarter']
const controlClass = 'inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md border border-white/10 bg-white/[0.035] px-2.5 text-[10px] font-black text-slate-400 transition hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-30'

const ordinalDay = (ordinal: number) => new Date(ordinal * 86_400_000).getUTCDay()
const labelLag = (lag: number) => `${lag >= 0 ? '+' : ''}${lag}d`
const edgeX = (row: any, edge: GanttEdge, xFor: (ordinal: number | null) => number, widthFor: (start: number | null, end: number | null) => number) => {
  const start = row.startOrdinal
  const end = row.endOrdinal
  if (start == null || end == null) return 0
  return edge === 'start' ? xFor(start) : xFor(start) + widthFor(start, end)
}

type ModernGanttProps = { project: any; onPersist: Persist; isSaving?: boolean }

// A project change must not retain another project's undo stack or active gesture.
export default function ProjectsModernGantt(props: ModernGanttProps) {
  return <ProjectsModernGanttSession key={String(props.project.id)} {...props} />
}

function ProjectsModernGanttSession({ project, onPersist, isSaving = false }: ModernGanttProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const rows = useMemo(() => buildProjectTimelineRows(project), [project])
  const range = useMemo(() => getProjectTimelineRange(project), [project])
  const analysis = useMemo(() => analyzeProjectSchedule(project), [project])
  const analysisById = useMemo(() => new Map(analysis.rows.map((row) => [String(row.id), row])), [analysis])
  const typedCritical = analysis.criticalTaskIds
  const scheduleState = getProjectScheduleState(project)
  const baseline = scheduleState.baselines?.[0] || null
  const baselineById = useMemo(() => new Map((baseline?.tasks || []).map((task) => [String(task.id), task])), [baseline?.id])
  const [zoom, setZoom] = useState<ProjectTimelineZoom>('week')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [ownerFilter, setOwnerFilter] = useState('ALL')
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('task'))
  const [scroll, setScroll] = useState({ top: 0, left: 0, width: 1200, height: 720 })
  type DragState = { taskId: string; mode: 'move' | 'start' | 'end'; startX: number; delta: number }
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const nativeGestureCleanupRef = useRef<(() => void) | null>(null)
  const moveDragAtRef = useRef<(clientX: number) => void>(() => {})
  const endDragAtRef = useRef<(clientX: number) => void>(() => {})
  const fallbackGestureDownAtRef = useRef<(clientX: number, clientY: number, button: number, rawTarget: EventTarget | null) => void>(() => {})
  const [dependencySource, setDependencySource] = useState<{ id: string; name: string; edge?: GanttEdge } | null>(null)
  const [live, setLive] = useState('')
  const [history, setHistory] = useState<any[][]>([])
  const [redo, setRedo] = useState<any[][]>([])
  const focusAfterSave = useRef<string | null>(null)

  const rowById = useMemo(() => new Map(rows.map((row) => [String(row.id), row])), [rows])
  const ownerOptions = useMemo(() => ['ALL', ...Array.from(new Set(rows.map((row) => getTaskOwnerLabel(row.task))))], [rows])
  const visibleRows = useMemo(() => rows.filter((row) => {
    let parent = row.parentId
    const seen = new Set<string>()
    while (parent != null && !seen.has(String(parent))) {
      const key = String(parent); seen.add(key)
      if (collapsed.has(key)) return false
      parent = rowById.get(key)?.parentId ?? null
    }
    const haystack = `${row.task?.name || ''} ${getTaskOwnerLabel(row.task)}`.toLowerCase()
    if (search && !haystack.includes(search.toLowerCase())) return false
    if (statusFilter !== 'ALL' && row.task?.status !== statusFilter) return false
    if (ownerFilter !== 'ALL' && getTaskOwnerLabel(row.task) !== ownerFilter) return false
    if (criticalOnly && !typedCritical.has(String(row.id))) return false
    return true
  }), [rows, collapsed, rowById, search, statusFilter, ownerFilter, criticalOnly, typedCritical])

  const pxPerDay = PX_PER_DAY[zoom]
  const timelineWidth = Math.max(900, Math.ceil(range.spanDays * pxPerDay))
  const xFor = (ordinal: number | null) => ordinal == null ? 0 : (ordinal - range.startOrdinal) * pxPerDay
  const widthFor = (start: number | null, end: number | null) => start == null || end == null ? 0 : Math.max(12, (end - start + 1) * pxPerDay)
  // Bars, ports and connector endpoints share the same provisional dates.
  const previewRow = (row: any) => {
    if (!drag || drag.taskId !== String(row.id) || row.startOrdinal == null || row.endOrdinal == null) return row
    let startOrdinal = row.startOrdinal
    let endOrdinal = row.endOrdinal
    if (drag.mode === 'move') { startOrdinal += drag.delta; endOrdinal += drag.delta }
    else if (drag.mode === 'start') startOrdinal = Math.min(endOrdinal, startOrdinal + drag.delta)
    else endOrdinal = Math.max(startOrdinal, endOrdinal + drag.delta)
    return { ...row, startOrdinal, endOrdinal }
  }
  const rowWindow = ganttWindow(visibleRows.length, scroll.top, Math.max(1, scroll.height - 64))
  const realizedRows = visibleRows.slice(rowWindow.start, rowWindow.end)
  const visibleIndex = useMemo(() => new Map(visibleRows.map((row, index) => [String(row.id), index])), [visibleRows])
  const realizedIds = useMemo(() => new Set(realizedRows.map((row) => String(row.id))), [realizedRows])
  const tickOrdinals = ganttVisibleOrdinals(range.startOrdinal, range.endOrdinal, Math.max(0, scroll.left - GANTT_RAIL_WIDTH), Math.max(1, scroll.width - GANTT_RAIL_WIDTH), pxPerDay, TICK_STEP[zoom])

  const connectors = useMemo(() => {
    const links: any[] = []
    for (const target of realizedRows) {
      for (const dependency of normalizeProjectTaskDependencies(target.task)) {
        const source = rowById.get(String(dependency.id))
        if (!source || !realizedIds.has(String(source.id))) continue
        const sourceIndex = visibleIndex.get(String(source.id)); const targetIndex = visibleIndex.get(String(target.id))
        if (sourceIndex == null || targetIndex == null || source.startOrdinal == null || source.endOrdinal == null || target.startOrdinal == null || target.endOrdinal == null) continue
        const edges = ganttDependencyEdges(dependency.type)
        links.push({ source, target, dependency, edges, sourceIndex, targetIndex })
        if (links.length >= GANTT_MAX_CONNECTORS) return links
      }
    }
    return links
  }, [realizedRows, rowById, realizedIds, visibleIndex])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const update = () => setScroll({ top: node.scrollTop, left: node.scrollLeft, width: node.clientWidth, height: node.clientHeight })
    update()
    const resize = new ResizeObserver(update)
    resize.observe(node)
    return () => resize.disconnect()
  }, [])

  useEffect(() => setSelectedId(searchParams.get('task')), [searchParams])
  useEffect(() => {
    const target = focusAfterSave.current
    if (!target) return
    focusAfterSave.current = null
    requestAnimationFrame(() => {
      const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(target) : target
      document.querySelector<HTMLButtonElement>(`[data-project-timeline-row="true"][data-task-id="${escaped}"] button[data-project-timeline-dependency-keyboard="true"]`)?.focus({ preventScroll: true })
    })
  }, [project])

  const openTask = (taskId: string) => {
    setSelectedId(taskId)
    const next = new URLSearchParams(searchParams); next.set('task', taskId); next.set('view', 'timeline'); setSearchParams(next, { replace: true })
  }

  const persist = async (nextProject: any, label: string, successMessage?: string, focusTaskId?: string) => {
    if (nextProject === project) return null
    setHistory((current) => [...current, structuredClone(project.tasks || [])].slice(-30)); setRedo([])
    if (successMessage) setLive(`${successMessage}…`)
    if (focusTaskId) focusAfterSave.current = focusTaskId
    try {
      const saved = await Promise.resolve(onPersist(nextProject, label))
      if (successMessage) setLive(successMessage)
      if (focusTaskId) requestAnimationFrame(() => {
        const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(focusTaskId) : focusTaskId
        document.querySelector<HTMLButtonElement>(`[data-project-timeline-row=\"true\"][data-task-id=\"${escaped}\"] button[data-project-timeline-dependency-keyboard=\"true\"]`)?.focus({ preventScroll: true })
        focusAfterSave.current = null
      })
      return saved
    } catch (error: any) {
      setLive(error?.message || 'Timeline update failed')
      return null
    }
  }

  const restoreTasks = async (tasks: any[], nextStack: 'undo' | 'redo') => {
    const current = structuredClone(project.tasks || [])
    const next = appendProjectAudit({ ...project, tasks: structuredClone(tasks) }, `Timeline ${nextStack}`, `${nextStack === 'undo' ? 'Reverted' : 'Reapplied'} Timeline change`)
    if (nextStack === 'undo') { setHistory((items) => items.slice(0, -1)); setRedo((items) => [...items, current].slice(-30)) }
    else { setRedo((items) => items.slice(0, -1)); setHistory((items) => [...items, current].slice(-30)) }
    await Promise.resolve(onPersist(next, `Timeline ${nextStack}`))
  }

  const commitDependency = async (sourceId: string, targetId: string, type: ProjectDependencyType, lag = 0) => {
    const source = rowById.get(sourceId); const target = rowById.get(targetId)
    if (!source || !target || sourceId === targetId) return
    const changed = setTypedProjectDependency(project, targetId, sourceId, type, lag, true)
    if (changed === project) { setLive('Dependency was not changed. Check for a duplicate or cycle.'); setDependencySource(null); return }
    const next = appendProjectAudit(changed, 'Timeline dependency added', `${source.task.name} → ${target.task.name}`)
    setDependencySource(null)
    await persist(next, 'Timeline dependency added', `Dependency added: ${source.task.name} → ${target.task.name}`, targetId)
  }

  const removeDependency = async (sourceId: string, targetId: string, type: ProjectDependencyType, lag: number) => {
    const source = rowById.get(sourceId); const target = rowById.get(targetId)
    if (!source || !target) return
    const changed = setTypedProjectDependency(project, targetId, sourceId, type, lag, false)
    if (changed === project) return
    const next = appendProjectAudit(changed, 'Timeline dependency removed', `${source.task.name} → ${target.task.name}`)
    await persist(next, 'Timeline dependency removed', `Dependency removed: ${source.task.name} → ${target.task.name}`, targetId)
  }

  const keyboardDependency = (row: any) => {
    const id = String(row.id); const name = String(row.task.name || `Task ${id}`)
    if (!dependencySource) { setDependencySource({ id, name }); setLive(`Dependency source selected: ${name}`); return }
    if (dependencySource.id === id) { setDependencySource(null); setLive(`Dependency selection cancelled: ${name}`); return }
    void commitDependency(dependencySource.id, id, 'FS', 0)
  }

  const portActivation = (row: any, edge: GanttEdge) => {
    const id = String(row.id); const name = String(row.task.name || `Task ${id}`)
    if (!dependencySource) { setDependencySource({ id, name, edge }); setLive(`Dependency source selected: ${name} ${edge}`); return }
    if (dependencySource.id === id) { setDependencySource(null); setLive(`Dependency selection cancelled: ${name}`); return }
    void commitDependency(dependencySource.id, id, ganttDependencyTypeForEdges(dependencySource.edge || 'finish', edge), 0)
  }

  const clearNativeGestureBridge = () => {
    nativeGestureCleanupRef.current?.()
    nativeGestureCleanupRef.current = null
  }

  const armNativeGestureBridge = () => {
    if (typeof window === 'undefined') return
    clearNativeGestureBridge()
    const move = (event: PointerEvent | MouseEvent) => moveDragAtRef.current(event.clientX)
    const up = (event: PointerEvent | MouseEvent) => { clearNativeGestureBridge(); void endDragAtRef.current(event.clientX) }
    // Cancellation discards the preview; it is never a commit request.
    const cancel = () => {
      clearNativeGestureBridge()
      dragRef.current = null
      setDrag(null)
      setLive('Timeline gesture cancelled')
    }
    window.addEventListener('pointermove', move, true)
    window.addEventListener('pointerup', up, true)
    window.addEventListener('pointercancel', cancel, true)
    window.addEventListener('mousemove', move, true)
    window.addEventListener('mouseup', up, true)
    nativeGestureCleanupRef.current = () => {
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerup', up, true)
      window.removeEventListener('pointercancel', cancel, true)
      window.removeEventListener('mousemove', move, true)
      window.removeEventListener('mouseup', up, true)
    }
  }

  const beginDragAt = (taskId: string, mode: DragState['mode'], startX: number) => {
    const active: DragState = { taskId, mode, startX, delta: 0 }
    dragRef.current = active
    setDrag(active)
    armNativeGestureBridge()
  }

  const beginDrag = (event: React.PointerEvent<HTMLElement>, taskId: string, mode: DragState['mode']) => {
    if (event.button !== 0 || dragRef.current) return
    beginDragAt(taskId, mode, event.clientX)
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* native window bridge remains the fallback */ }
  }

  const moveDragAt = (clientX: number, taskId?: string, mode?: DragState['mode']) => {
    const active = dragRef.current
    if (!active || (taskId && active.taskId !== taskId) || (mode && active.mode !== mode)) return
    const delta = Math.round((clientX - active.startX) / pxPerDay)
    if (delta === active.delta) return
    const next = { ...active, delta }
    dragRef.current = next
    setDrag(next)
  }

  moveDragAtRef.current = (clientX: number) => moveDragAt(clientX)

  const moveDrag = (event: React.PointerEvent<HTMLElement>, taskId?: string, mode?: DragState['mode']) => moveDragAt(event.clientX, taskId, mode)

  const endDragAt = async (clientX: number) => {
    const active = dragRef.current
    if (!active) return
    const releaseDelta = Math.round((clientX - active.startX) / pxPerDay)
    const delta = releaseDelta || active.delta
    clearNativeGestureBridge()
    dragRef.current = null
    setDrag(null)
    if (!delta) return
    const row = rowById.get(active.taskId); if (!row) return
    const base = active.mode === 'move'
      ? shiftProjectTaskSchedules(project, [row.id], delta)
      : resizeProjectTaskSchedule(project, row.id, active.mode, delta)
    const action = active.mode === 'move' ? 'Timeline schedule moved' : 'Timeline task resized'
    const detail = active.mode === 'move' ? `${row.task.name} shifted ${delta > 0 ? '+' : ''}${delta}d` : `${row.task.name}: ${active.mode} ${delta > 0 ? '+' : ''}${delta}d`
    await persist(appendProjectAudit(base, action, detail), action, `${row.task.name} ${active.mode === 'move' ? 'moved' : 'resized'}`)
  }

  endDragAtRef.current = endDragAt

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return
    event.stopPropagation()
    void endDragAt(event.clientX)
  }

  const resolveMoveBarAtPoint = (clientX: number, clientY: number) => {
    const node = scrollRef.current
    if (!node) return null
    for (const bar of Array.from(node.querySelectorAll<HTMLElement>('[data-project-timeline-bar="true"]'))) {
      const rect = bar.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return bar
    }
    return null
  }

  const fallbackGestureDownAt = (clientX: number, clientY: number, button: number, rawTarget: EventTarget | null) => {
    if (button !== 0 || dragRef.current) return
    const target = rawTarget instanceof Element ? rawTarget : null
    if (target?.closest('[data-project-resize-edge], [data-project-dependency-port="true"]')) return
    const bar = resolveMoveBarAtPoint(clientX, clientY)
    const taskId = bar?.getAttribute('data-task-id')
    if (taskId) beginDragAt(taskId, 'move', clientX)
  }

  const fallbackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    fallbackGestureDownAt(event.clientX, event.clientY, event.button, event.target)
  }

  fallbackGestureDownAtRef.current = fallbackGestureDownAt

  const fallbackMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    fallbackGestureDownAt(event.clientX, event.clientY, event.button, event.target)
  }

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const down = (event: PointerEvent | MouseEvent) => fallbackGestureDownAtRef.current(event.clientX, event.clientY, event.button, event.target)
    node.addEventListener('pointerdown', down, true)
    node.addEventListener('mousedown', down, true)
    return () => {
      node.removeEventListener('pointerdown', down, true)
      node.removeEventListener('mousedown', down, true)
      clearNativeGestureBridge()
    }
  }, [])

  const jumpToday = () => {
    const node = scrollRef.current; if (!node) return
    node.scrollLeft = Math.max(0, GANTT_RAIL_WIDTH + xFor(range.todayOrdinal) - Math.max(1, node.clientWidth - GANTT_RAIL_WIDTH) * 0.45)
  }
  const fitProject = () => {
    const span = range.spanDays
    setZoom(span <= 35 ? 'day' : span <= 100 ? 'week' : span <= 320 ? 'month' : 'quarter')
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollLeft = 0 })
  }

  const totalHeight = visibleRows.length * GANTT_ROW_HEIGHT
  const todayX = xFor(range.todayOrdinal)

  return <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#080d18] shadow-2xl" data-project-timeline="true" data-project-flagship-gantt="true" data-project-modern-gantt="true" data-project-semantic-id="gantt-root">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0b1220] px-3 py-2.5">
      <div className="min-w-0"><div className="flex items-center gap-2"><CalendarClock size={15} className="text-blue-300" /><h2 className="text-[13px] font-black text-white">Precision Gantt</h2><span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-300">Connected</span></div><p className="mt-1 text-[9px] font-semibold text-slate-500">Virtualized WBS · typed dependency geometry · baseline · forecast · critical path</p></div>
      <div className="flex flex-wrap items-center gap-1.5"><button className={controlClass} onClick={() => history.length && void restoreTasks(history[history.length - 1], 'undo')} disabled={!history.length || isSaving} aria-label="Undo Timeline change"><Undo2 size={12}/></button><button className={controlClass} onClick={() => redo.length && void restoreTasks(redo[redo.length - 1], 'redo')} disabled={!redo.length || isSaving} aria-label="Redo Timeline change"><Redo2 size={12}/></button><button className={controlClass} onClick={jumpToday}>Today</button><button className={controlClass} onClick={fitProject}>Fit</button>{zoomOptions.map((value) => <button key={value} className={`${controlClass} ${zoom === value ? 'border-blue-400/40 bg-blue-500/15 text-blue-200' : ''}`} aria-pressed={zoom === value} onClick={() => setZoom(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
    </div>
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-white/[0.015] px-3 py-2">
      <label className="relative min-w-[190px] flex-1 sm:max-w-[300px]"><Search size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"/><input aria-label="Find timeline tasks or owners" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find task or owner…" className="h-10 w-full rounded-md border border-white/10 bg-black/25 pl-8 pr-3 text-[11px] text-white outline-none focus:border-blue-400/40"/></label>
      <select aria-label="Timeline status filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-white/10 bg-[#0b1220] px-2 text-[10px] text-slate-300"><option value="ALL">All status</option>{PROJECT_TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
      <select aria-label="Timeline owner filter" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="h-10 max-w-[170px] rounded-md border border-white/10 bg-[#0b1220] px-2 text-[10px] text-slate-300">{ownerOptions.map((owner) => <option key={owner} value={owner}>{owner === 'ALL' ? 'All owners' : owner}</option>)}</select>
      <label className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-3 text-[9px] font-black uppercase text-slate-500"><input type="checkbox" checked={criticalOnly} onChange={(e) => setCriticalOnly(e.target.checked)}/>Critical only</label>
      <span className="ml-auto hidden text-[9px] font-semibold text-slate-600 xl:inline">Drag bars · resize edges · connect start/finish ports · Enter on dependency controls</span>
    </div>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-project-timeline-live-status="true" data-project-semantic-id="timeline-live-status">{live}</p>
    <div ref={scrollRef} onPointerDownCapture={fallbackPointerDown} onPointerMoveCapture={(e) => moveDrag(e)} onPointerUpCapture={endDrag} onMouseDownCapture={fallbackMouseDown} onMouseMoveCapture={(e) => moveDragAt(e.clientX)} onMouseUpCapture={(e) => { if (dragRef.current) void endDragAt(e.clientX) }} onScroll={(e) => { const node = e.currentTarget; setScroll({ top: node.scrollTop, left: node.scrollLeft, width: node.clientWidth, height: node.clientHeight }) }} className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain custom-scrollbar" data-project-timeline-scroll="true" data-project-timeline-scrollport="true" data-project-semantic-id="timeline-scrollport">
      <div className="relative" style={{ width: `${GANTT_RAIL_WIDTH + timelineWidth}px`, minWidth: '100%' }}>
        <div className="sticky top-0 z-50 flex h-14 border-b border-white/10 bg-[#0a101c]/95 backdrop-blur">
          <div className="sticky left-0 z-[60] grid shrink-0 grid-cols-[42px_minmax(0,1fr)_70px] items-center gap-2 border-r border-white/10 bg-[#0a101c] px-3 text-[8px] font-black uppercase tracking-[0.15em] text-slate-600" style={{ width: GANTT_RAIL_WIDTH }}><span></span><span>Task / WBS</span><span className="text-right">Finish</span></div>
          <div className="relative h-14 shrink-0" style={{ width: timelineWidth }}>
            {tickOrdinals.map((ordinal) => { const date = projectOrdinalToDate(ordinal) || ''; const left = xFor(ordinal); return <div key={ordinal} className="absolute inset-y-0 border-l border-white/[0.06]" style={{ left }} data-project-timeline-tick="true"><span className="absolute left-1 top-1 text-[8px] font-black text-slate-600">{date.slice(0,7)}</span><span className="absolute bottom-1 left-1 text-[9px] font-bold text-slate-400">{date.slice(5)}</span></div> })}
            <div className="absolute inset-y-0 w-px bg-blue-300/70" style={{ left: todayX }}><span className="absolute left-1 top-1 rounded bg-blue-500/20 px-1 text-[7px] font-black text-blue-200">Today</span></div>
          </div>
        </div>
        <div className="relative" style={{ height: totalHeight }}>
          <div className="pointer-events-none absolute bottom-0 top-0" style={{ left: GANTT_RAIL_WIDTH, width: timelineWidth }}>
            {tickOrdinals.map((ordinal) => <span key={ordinal} data-project-timeline-grid="true" className={`absolute inset-y-0 border-l ${zoom === 'day' && [0,6].includes(ordinalDay(ordinal)) ? 'w-[28px] border-white/[0.05] bg-white/[0.018]' : 'border-white/[0.035]'}`} style={{ left: xFor(ordinal) }}/>) }
            <span className="absolute inset-y-0 w-px bg-blue-400/25" style={{ left: todayX }}/>
          </div>
          <svg className="pointer-events-none absolute z-[5] overflow-visible" style={{ left: GANTT_RAIL_WIDTH, top: 0 }} width={timelineWidth} height={totalHeight} aria-label="Timeline dependency network">
            <defs><marker id="gantt-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>
            {connectors.map((link) => {
              const x1 = edgeX(previewRow(link.source), link.edges.source, xFor, widthFor); const x2 = edgeX(previewRow(link.target), link.edges.target, xFor, widthFor)
              const y1 = link.sourceIndex * GANTT_ROW_HEIGHT + GANTT_ROW_HEIGHT / 2; const y2 = link.targetIndex * GANTT_ROW_HEIGHT + GANTT_ROW_HEIGHT / 2
              const key = ganttRelationKey(link.source.id, link.target.id, link.dependency.type, link.dependency.lag_days)
              const selected = selectedId === String(link.source.id) || selectedId === String(link.target.id)
              const critical = typedCritical.has(String(link.source.id)) && typedCritical.has(String(link.target.id))
              const conflict = Boolean(analysisById.get(String(link.target.id))?.constraintViolation)
              const aria = `Remove dependency ${link.source.task.name} → ${link.target.task.name}`
              const path = ganttOrthogonalPath(x1, y1, x2, y2)
              return <g key={key} className={selected ? 'text-blue-200' : critical ? 'text-rose-300' : 'text-slate-500'}>
                <path d={path} fill="none" stroke="currentColor" strokeWidth={selected ? 3 : critical ? 2.5 : 1.5} strokeDasharray={conflict ? '5 4' : undefined} markerEnd="url(#gantt-arrow)" opacity={selected ? 1 : .72}/>
                <circle cx={x1} cy={y1} r="1" fill="transparent" data-project-connector-endpoint="source" data-project-relation-key={key}/>
                <circle cx={x2} cy={y2} r="1" fill="transparent" data-project-connector-endpoint="target" data-project-relation-key={key}/>
                <path d={path} fill="none" stroke="transparent" strokeWidth="14" className="pointer-events-auto cursor-pointer" role="button" tabIndex={0} aria-label={aria} data-project-timeline-dependency-connector="true" data-project-timeline-dependency-source={String(link.source.id)} data-project-timeline-dependency-target={String(link.target.id)} data-project-dependency-type={link.dependency.type} data-project-dependency-lag={String(link.dependency.lag_days)} data-project-semantic-id={`dependency-${link.source.id}-${link.target.id}-${String(link.dependency.type).toLowerCase()}`} onClick={() => void removeDependency(String(link.source.id), String(link.target.id), link.dependency.type, link.dependency.lag_days)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void removeDependency(String(link.source.id), String(link.target.id), link.dependency.type, link.dependency.lag_days) } }}/>
                <text x={(x1+x2)/2} y={(y1+y2)/2 - 5} textAnchor="middle" className="pointer-events-none fill-current text-[8px] font-black">{link.dependency.type} {labelLag(link.dependency.lag_days)}</text>
              </g>
            })}
          </svg>
          {realizedRows.map((row, offset) => {
            const index = rowWindow.start + offset; const top = index * GANTT_ROW_HEIGHT
            const preview = previewRow(row)
            const start = preview.startOrdinal; const end = preview.endOrdinal
            const scheduled = start != null && end != null; const left = xFor(start); const width = widthFor(start, end)
            const baselineTask: any = baselineById.get(String(row.id)); const baselineStart = baselineTask?.start_date ? Math.floor(new Date(`${baselineTask.start_date}T00:00:00Z`).getTime()/86_400_000) : row.baselineStartOrdinal; const baselineEnd = baselineTask?.end_date ? Math.floor(new Date(`${baselineTask.end_date}T00:00:00Z`).getTime()/86_400_000) : row.baselineEndOrdinal
            const isSelected = selectedId === String(row.id); const isCritical = typedCritical.has(String(row.id)); const violation = analysisById.get(String(row.id))?.constraintViolation
            return <div key={String(row.id)} className={`absolute left-0 flex border-b border-white/[0.045] ${isSelected ? 'bg-blue-500/[0.055]' : 'hover:bg-white/[0.015]'}`} style={{ top, height: GANTT_ROW_HEIGHT, width: GANTT_RAIL_WIDTH + timelineWidth }} data-project-timeline-row="true" data-task-id={String(row.id)} data-critical={isCritical ? 'true' : 'false'} data-milestone={row.milestone ? 'true' : 'false'}>
              <div className="sticky left-0 z-30 grid shrink-0 grid-cols-[42px_minmax(0,1fr)_70px] items-center gap-2 border-r border-white/10 bg-[#0a101c]/[0.98] px-3" style={{ width: GANTT_RAIL_WIDTH }}>
                <button type="button" data-project-timeline-dependency-keyboard="true" onClick={() => keyboardDependency(row)} aria-pressed={dependencySource?.id === String(row.id)} aria-label={!dependencySource ? `Start dependency from ${row.task.name}` : dependencySource.id === String(row.id) ? `Cancel dependency from ${row.task.name}` : `Add dependency from ${dependencySource.name} to ${row.task.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/5 text-blue-300 hover:border-blue-400/30 hover:bg-blue-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"><GitBranch size={13}/></button>
                <div className="flex min-w-0 items-center gap-1" style={{ paddingLeft: Math.min(row.depth, 6) * 14 }}>{row.hasChildren ? <button type="button" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-white/5 hover:text-white" aria-label={`${collapsed.has(String(row.id)) ? 'Expand' : 'Collapse'} ${row.task.name}`} onClick={() => setCollapsed((current) => { const next = new Set(current); if (next.has(String(row.id))) next.delete(String(row.id)); else next.add(String(row.id)); return next })}>{collapsed.has(String(row.id)) ? <ChevronRight size={12}/> : <ChevronDown size={12}/>}</button> : <span className="w-2 shrink-0"/>}{row.milestone ? <Milestone size={12} className="shrink-0 text-violet-300"/> : null}<button type="button" className={`min-w-0 flex-1 truncate text-left text-[11px] font-black ${isCritical ? 'text-rose-200' : 'text-slate-300'} hover:text-white`} onClick={() => openTask(String(row.id))}>{row.task.name}</button>{violation ? <span title={violation} className="shrink-0 text-[9px] font-black text-amber-300">!</span> : null}</div>
                <span className="truncate text-right text-[9px] font-bold text-slate-600">{row.task.end_date ? String(row.task.end_date).slice(5,10) : '—'}</span>
              </div>
              <div className="relative shrink-0" style={{ width: timelineWidth }}>
                {baselineStart != null && baselineEnd != null ? <span className="absolute top-[36px] h-[3px] rounded-full bg-violet-300/55" style={{ left: xFor(baselineStart), width: widthFor(baselineStart, baselineEnd) }} title={`Baseline ${baselineTask?.start_date || projectOrdinalToDate(baselineStart)} → ${baselineTask?.end_date || projectOrdinalToDate(baselineEnd)}`}/> : null}
                {row.forecastStartOrdinal != null && row.forecastEndOrdinal != null ? <span className="absolute top-[9px] h-[28px] rounded-md border border-amber-300/20 bg-amber-400/[0.055]" style={{ left: xFor(row.forecastStartOrdinal), width: widthFor(row.forecastStartOrdinal, row.forecastEndOrdinal) }} title={`Forecast ${projectOrdinalToDate(row.forecastStartOrdinal)} → ${projectOrdinalToDate(row.forecastEndOrdinal)}`}/> : null}
                {!scheduled ? <button type="button" disabled={isSaving} onClick={() => void persist(appendProjectAudit(scheduleProjectTask(project, row.id, projectOrdinalToDate(range.todayOrdinal) || '', 1), 'Timeline task scheduled', `${row.task.name}: scheduled today`), 'Timeline task scheduled', `${row.task.name} scheduled`)} className="absolute top-1 h-10 rounded-md border border-dashed border-white/15 px-3 text-[9px] font-black text-slate-500 hover:border-blue-400/30 hover:text-white" style={{ left: todayX }}>Schedule today</button> : row.milestone ? <button type="button" data-project-timeline-bar="true" data-task-id={String(row.id)} data-project-semantic-id={`task-bar-${row.id}`} aria-label={`Open ${row.task.name} timeline task`} onClick={() => openTask(String(row.id))} onPointerDown={(e) => beginDrag(e, String(row.id), 'move')} onPointerMove={(e) => moveDrag(e, String(row.id), 'move')} onPointerUp={endDrag} className={`absolute top-[14px] z-30 h-5 w-5 rotate-45 border focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300 ${isCritical ? 'border-rose-200 bg-rose-500' : 'border-violet-200 bg-violet-500'}`} style={{ left }} /> : <div data-project-timeline-bar="true" data-task-id={String(row.id)} data-project-semantic-id={`task-bar-${row.id}`} role="button" tabIndex={0} aria-label={`Open ${row.task.name} timeline task`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTask(String(row.id)) } }} onClick={() => openTask(String(row.id))} onPointerDown={(e) => beginDrag(e, String(row.id), 'move')} onPointerMove={(e) => moveDrag(e, String(row.id), 'move')} onPointerUp={endDrag} className={`absolute top-[14px] z-30 h-[22px] cursor-grab overflow-visible rounded-md border shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300 active:cursor-grabbing ${row.blocked ? 'border-rose-300/60 bg-rose-500/65' : isCritical ? 'border-rose-200/50 bg-blue-500/80' : 'border-blue-200/25 bg-blue-500/60'} ${isSelected ? 'ring-2 ring-blue-200/50' : ''}`} style={{ left, width }}>
                  <span className="pointer-events-none absolute inset-y-0 left-0 rounded-l-md bg-white/20" style={{ width: `${row.progress}%` }}/><span className="pointer-events-none absolute inset-0 truncate px-2 pt-[3px] text-[8px] font-black text-white/95">{row.task.name}</span>
                  <button type="button" aria-label={`Resize start ${row.task.name}`} onClick={(e)=>e.stopPropagation()} onPointerDown={(e)=>{e.stopPropagation();beginDrag(e,String(row.id),'start')}} onPointerMove={(e)=>moveDrag(e,String(row.id),'start')} onPointerUp={endDrag} data-project-resize-edge="start" className="absolute left-[-6px] top-[-9px] z-40 h-10 w-3 cursor-ew-resize rounded-md"/>
                  <button type="button" aria-label={`Resize end ${row.task.name}`} onClick={(e)=>e.stopPropagation()} onPointerDown={(e)=>{e.stopPropagation();beginDrag(e,String(row.id),'end')}} onPointerMove={(e)=>moveDrag(e,String(row.id),'end')} onPointerUp={endDrag} data-project-resize-edge="end" className="absolute right-[-6px] top-[-9px] z-40 h-10 w-3 cursor-ew-resize rounded-md"/>
                </div>}
                {scheduled ? <>{(['start','finish'] as GanttEdge[]).map((edge) => { const portX = edge === 'start' ? left : left + width; const active = dependencySource?.id === String(row.id) && dependencySource.edge === edge; return <button key={edge} type="button" draggable data-project-dependency-port="true" data-project-dependency-handle={edge === 'finish' ? 'true' : undefined} data-project-dependency-target="true" data-edge={edge} data-project-semantic-id={`dependency-port-${row.id}-${edge}`} aria-label={`${!dependencySource ? 'Start dependency' : 'Connect dependency'} ${edge} port ${row.task.name}`} onClick={(e)=>{e.stopPropagation();portActivation(row,edge)}} onDragStart={(e)=>{setDependencySource({id:String(row.id),name:row.task.name,edge});e.dataTransfer.setData('text/project-gantt-source',JSON.stringify({id:String(row.id),edge}))}} onDragOver={(e)=>{if(dependencySource)e.preventDefault()}} onDrop={(e)=>{e.preventDefault();e.stopPropagation();let source=dependencySource;try{const parsed=JSON.parse(e.dataTransfer.getData('text/project-gantt-source')||'{}');if(parsed.id){const sourceRow=rowById.get(String(parsed.id));source={id:String(parsed.id),name:sourceRow?.task?.name||String(parsed.id),edge:parsed.edge}}}catch{} if(source&&source.id!==String(row.id))void commitDependency(source.id,String(row.id),ganttDependencyTypeForEdges(source.edge||'finish',edge),0)}} className={`absolute top-1 z-10 h-10 w-10 -translate-x-1/2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300 ${active ? 'bg-blue-500/15' : 'bg-transparent hover:bg-blue-500/10'}`} style={{ left: portX }}><span className={`absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${active ? 'border-blue-100 bg-blue-500' : 'border-blue-300/70 bg-[#0a101c]'}`}/></button> })}</> : null}
              </div>
            </div>
          })}
        </div>
      </div>
    </div>
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0a101c] px-3 py-2 text-[9px] font-semibold text-slate-600"><span>{visibleRows.length} visible / {rows.length} tasks · {connectors.length} realized links · {tickOrdinals.length} grid ticks</span><span className="inline-flex items-center gap-2"><Target size={11}/> {analysis.cycle ? 'Cycle detected' : `${analysis.rows.filter((row)=>row.critical).length} critical · ${baseline ? `Baseline ${baseline.name}` : 'No baseline'}`}</span></div>
  </section>
}
