import { axisCells, AXIS_HEIGHT, fitScale, taskGeometry, canonicalTaskStatus, readableProjectDate } from './ProjectsVisualRepair.geometry'
import './ProjectsVisualRepair.css'
import { createPortal } from 'react-dom'
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
  GANTT_ROW_HEIGHT,
  ganttDependencyEdges,
  ganttDependencyTypeForEdges,
  ganttOrthogonalPath,
  ganttRelationKey,
  ganttWindow,
  type GanttEdge,
} from './ProjectsModernGantt.model'

type Persist = (nextProject: any, label: string, baseProject?: any) => Promise<any> | any
const PX_PER_DAY: Record<ProjectTimelineZoom, number> = { day: 28, week: 12, month: 5, quarter: 2.2 }
const zoomOptions: ProjectTimelineZoom[] = ['day', 'week', 'month', 'quarter']
const labelLag = (lag: number) => `${lag >= 0 ? '+' : ''}${lag}d`
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
  const baselineById = useMemo(() => new Map((baseline?.tasks || []).map((task) => [String(task.id), task])), [baseline?.tasks])
  const [zoom, setZoom] = useState<ProjectTimelineZoom>('week')
  const [fitted, setFitted] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [relation, setRelation] = useState<any>(null)
  const [linkType, setLinkType] = useState<ProjectDependencyType>('FS')
  const [linkLag, setLinkLag] = useState(0)
  const savingRef = useRef(false)
  const suppressClick = useRef(false)
  const scrollFrame = useRef<number | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [ownerFilter, setOwnerFilter] = useState('ALL')
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('task'))
  const [scroll, setScroll] = useState({ top: 0, left: 0, width: 1200, height: 720 })
  type DragState = { taskId: string; mode: 'move' | 'start' | 'end'; startX: number; delta: number; pointerId: number; startScrollLeft: number; scale: number }
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
    if (statusFilter !== 'ALL' && canonicalTaskStatus(row.task?.status) !== statusFilter) return false
    if (ownerFilter !== 'ALL' && getTaskOwnerLabel(row.task) !== ownerFilter) return false
    if (criticalOnly && !typedCritical.has(String(row.id))) return false
    return true
  }), [rows, collapsed, rowById, search, statusFilter, ownerFilter, criticalOnly, typedCritical])

  const railWidth = scroll.width < 600 ? Math.min(180, Math.floor(scroll.width * .43)) : scroll.width < 1000 ? 260 : 320
  const pxPerDay = fitted ? fitScale(range.spanDays, scroll.width, railWidth) : PX_PER_DAY[zoom]
  const timelineWidth = Math.max(1, Math.ceil(range.spanDays * pxPerDay), scroll.width - railWidth)
  const geometryFor = (row: any) => taskGeometry(row, range.startOrdinal, pxPerDay)
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
  const ticks = useMemo(() => axisCells(range.startOrdinal, range.endOrdinal, pxPerDay, scroll.left, Math.max(1, scroll.width - railWidth)), [range.startOrdinal, range.endOrdinal, pxPerDay, scroll.left, scroll.width, railWidth])

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
    if (nextProject === project || savingRef.current || isSaving) return null
    savingRef.current = true
    const before = structuredClone(project.tasks || [])
    if (successMessage) setLive(`${successMessage}…`)
    if (focusTaskId) focusAfterSave.current = focusTaskId
    try {
      const saved = await Promise.resolve(onPersist(nextProject, label, project))
      setHistory(current => [...current, before].slice(-30)); setRedo([])
      if (successMessage) setLive(successMessage)
      return saved
    } catch (error: any) { focusAfterSave.current = null; setLive(error?.message || 'Timeline update failed'); return null }
    finally { savingRef.current = false }
  }
  const restoreTasks = async (tasks: any[], nextStack: 'undo' | 'redo') => {
    if (savingRef.current || isSaving) return
    savingRef.current = true
    const before = structuredClone(project.tasks || [])
    try {
      const next = appendProjectAudit({ ...project, tasks: structuredClone(tasks) }, `Timeline ${nextStack}`, `${nextStack} Timeline change`)
      await Promise.resolve(onPersist(next, `Timeline ${nextStack}`, project))
      if (nextStack === 'undo') { setHistory(items => items.slice(0,-1)); setRedo(items => [...items,before].slice(-30)) }
      else { setRedo(items => items.slice(0,-1)); setHistory(items => [...items,before].slice(-30)) }
      setLive(`Timeline ${nextStack} complete`)
    } catch (error: any) { setLive(error?.message || 'Timeline history update failed') }
    finally { savingRef.current = false }
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
    void commitDependency(dependencySource.id, id, linkType, linkLag)
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
    const samePointer = (event: PointerEvent | MouseEvent) => !(event instanceof PointerEvent) || event.pointerId === dragRef.current?.pointerId
    const move = (event: PointerEvent | MouseEvent) => { if (samePointer(event)) moveDragAtRef.current(event.clientX) }
    const up = (event: PointerEvent | MouseEvent) => {
      if (!samePointer(event)) return
      clearNativeGestureBridge()
      void endDragAtRef.current(event.clientX)
    }
    // Cancellation discards the preview; it is never a commit request.
    const cancel = (event?: Event) => {
      if (event instanceof PointerEvent && event.pointerId !== dragRef.current?.pointerId) return
      clearNativeGestureBridge()
      dragRef.current = null
      suppressClick.current = true
      setDrag(null)
      setLive('Timeline gesture cancelled')
    }
    window.addEventListener('pointermove', move, true)
    window.addEventListener('pointerup', up, true)
    window.addEventListener('mousemove', move, true)
    window.addEventListener('mouseup', up, true)
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); cancel() } }
    window.addEventListener('pointercancel', cancel, true)
    window.addEventListener('keydown', escape, true)
    window.addEventListener('blur', cancel)
    nativeGestureCleanupRef.current = () => {
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerup', up, true)
      window.removeEventListener('mousemove', move, true)
      window.removeEventListener('mouseup', up, true)
      window.removeEventListener('pointercancel', cancel, true)
      window.removeEventListener('keydown', escape, true)
      window.removeEventListener('blur', cancel)
    }
  }

  const beginDragAt = (taskId: string, mode: DragState['mode'], startX: number, pointerId: number) => {
    if (isSaving || savingRef.current || dependencySource || dragRef.current) return false
    suppressClick.current = false
    const active: DragState = { taskId, mode, startX, delta: 0, pointerId, startScrollLeft: scrollRef.current?.scrollLeft || 0, scale: pxPerDay }
    dragRef.current = active
    setDrag(active)
    armNativeGestureBridge()
    return true
  }

  const beginDrag = (event: React.PointerEvent<HTMLElement>, taskId: string, mode: DragState['mode']) => {
    if (event.button !== 0 || dragRef.current) return
    if (!beginDragAt(taskId, mode, event.clientX, event.pointerId)) return
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* direct handlers and native window bridge remain fallbacks */ }
  }

  const beginMouseFallback = (event: React.MouseEvent<HTMLElement>, taskId: string, mode: DragState['mode']) => {
    if (event.button !== 0 || dragRef.current) return
    beginDragAt(taskId, mode, event.clientX, -1)
  }

  const moveDragAt = (clientX: number, taskId?: string, mode?: DragState['mode']) => {
    const active = dragRef.current
    if (!active || (taskId && active.taskId !== taskId) || (mode && active.mode !== mode)) return
    const delta = Math.round((clientX - active.startX + (scrollRef.current?.scrollLeft || 0) - active.startScrollLeft) / active.scale)
    if (delta === active.delta) return
    suppressClick.current = true
    const next = { ...active, delta }
    dragRef.current = next
    setDrag(next)
  }

  moveDragAtRef.current = (clientX: number) => moveDragAt(clientX)

  const moveDrag = (event: React.PointerEvent<HTMLElement>, taskId?: string, mode?: DragState['mode']) => moveDragAt(event.clientX, taskId, mode)

  const endDragAt = async (clientX: number) => {
    const active = dragRef.current
    if (!active) return
    const releaseDelta = Math.round((clientX - active.startX + (scrollRef.current?.scrollLeft || 0) - active.startScrollLeft) / active.scale)
    // Prefer the release coordinate, but preserve the last meaningful preview if a browser
    // reports the original coordinate while releasing pointer capture.
    const delta = releaseDelta || active.delta
    suppressClick.current = Math.abs(clientX - active.startX) > 3
    clearNativeGestureBridge()
    dragRef.current = null
    setDrag(null)
    if (!delta) return
    const row = rowById.get(active.taskId); if (!row) return
    const base = active.mode === 'move'
      ? shiftProjectTaskSchedules(project, [row.id], delta)
      : resizeProjectTaskSchedule(project, row.id, active.mode, delta)
    const changedTask = base.tasks?.find((task: any) => String(task.id) === String(row.id))
    if (!changedTask || (changedTask.start_date === row.task.start_date && changedTask.end_date === row.task.end_date)) return
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

  useEffect(() => () => { clearNativeGestureBridge(); if (scrollFrame.current != null) cancelAnimationFrame(scrollFrame.current) }, [])
  const jumpToday = () => {
    const node = scrollRef.current
    if (node) node.scrollLeft = Math.max(0, xFor(range.todayOrdinal) - (node.clientWidth - railWidth) * .45)
  }
  const fitProject = () => { setFitted(true); if (scrollRef.current) scrollRef.current.scrollLeft = 0 }
  const switchZoom = (value: ProjectTimelineZoom) => {
    const center = range.startOrdinal + (scroll.left + (scroll.width - railWidth) / 2) / pxPerDay
    setFitted(false); setZoom(value)
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, (center - range.startOrdinal) * PX_PER_DAY[value] - (scroll.width - railWidth) / 2) })
  }
  const updateScroll = () => {
    if (scrollFrame.current != null) return
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null
      const n = scrollRef.current
      if (n) setScroll(s => s.top === n.scrollTop && s.left === n.scrollLeft && s.width === n.clientWidth && s.height === n.clientHeight ? s : ({ top: n.scrollTop, left: n.scrollLeft, width: n.clientWidth, height: n.clientHeight }))
    })
  }
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0 }, [search, statusFilter, ownerFilter, criticalOnly, collapsed])
  const selectedRow = selectedId ? rowById.get(selectedId) : null
  const totalHeight = visibleRows.length * GANTT_ROW_HEIGHT
  const todayX = xFor(range.todayOrdinal)
  const shownFirst = Math.min(visibleRows.length, Math.floor(scroll.top / GANTT_ROW_HEIGHT) + 1)
  const shownLast = Math.min(visibleRows.length, Math.ceil((scroll.top + Math.max(0, scroll.height - AXIS_HEIGHT)) / GANTT_ROW_HEIGHT))
  const editDay = (edge: 'start' | 'end', delta: number) => {
    if (!selectedRow) return
    const next = resizeProjectTaskSchedule(project, selectedRow.id, edge, delta)
    const changed = next.tasks?.find((task: any) => String(task.id) === String(selectedRow.id))
    if (!changed || (changed.start_date === selectedRow.task.start_date && changed.end_date === selectedRow.task.end_date)) return
    if (next !== project) void persist(appendProjectAudit(next, 'Timeline task resized', `${selectedRow.task.name}: ${edge} ${delta}d`), 'Timeline task resized', `${selectedRow.task.name} resized`)
  }
  const inspect = (link: any) => { setRelation(link); setLive(`Dependency ${link.source.task.name} to ${link.target.task.name}`) }
  const relationDialog = useRef<HTMLDivElement | null>(null)
  const returnFocus = useRef<HTMLElement | SVGElement | null>(null)
  useEffect(() => {
    if (!relation) return
    returnFocus.current = document.activeElement as HTMLElement
    const appRoot = document.getElementById('root'); const wasInert = appRoot?.inert
    if (appRoot) appRoot.inert = true
    relationDialog.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => { if (appRoot) appRoot.inert = wasInert || false; const el = returnFocus.current; if (el?.isConnected) el.focus(); else document.querySelector<HTMLElement>(`[data-project-semantic-id="dependency-source-${CSS.escape(String(relation.target.id))}"]`)?.focus() }
  }, [relation])
  const dialogKeys = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); setRelation(null) }
    if (e.key !== 'Tab') return
    const targets = Array.from(relationDialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,[tabindex="0"]') || [])
    const current = targets.indexOf(document.activeElement as HTMLElement)
    if (targets.length && ((e.shiftKey && current <= 0) || (!e.shiftKey && current === targets.length - 1))) { e.preventDefault(); targets[e.shiftKey ? targets.length - 1 : 0].focus() }
  }
  return <section className="sg-gantt" data-project-timeline="true" data-project-flagship-gantt="true" data-project-modern-gantt="true" data-project-semantic-id="gantt-root" aria-label="Project timeline">
    <div className="sg-gantt-toolbar">
      <div className="sg-gantt-title"><CalendarClock size={18}/><strong>Timeline</strong><span>{rows.length} tasks</span></div>
      <div className="sg-gantt-actions">
        <button aria-label="Undo Timeline change" title="Undo" disabled={!history.length || isSaving} onClick={() => void restoreTasks(history[history.length - 1], 'undo')}><Undo2 size={16}/></button>
        <button aria-label="Redo Timeline change" title="Redo" disabled={!redo.length || isSaving} onClick={() => void restoreTasks(redo[redo.length - 1], 'redo')}><Redo2 size={16}/></button>
        <button onClick={jumpToday}>Today</button><button onClick={fitProject} aria-pressed={fitted}>Fit</button>
        <select aria-label="Timeline zoom" value={fitted ? 'fit' : zoom} onChange={e => e.target.value === 'fit' ? fitProject() : switchZoom(e.target.value as ProjectTimelineZoom)}><option value="fit">Fit project</option>{zoomOptions.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select>
        <button aria-expanded={filtersOpen} aria-controls="sg-gantt-filters" onClick={() => setFiltersOpen(!filtersOpen)}>Filters{search || statusFilter !== 'ALL' || ownerFilter !== 'ALL' || criticalOnly ? ' •' : ''}</button>
      </div>
    </div>
    {filtersOpen && <div className="sg-gantt-filters" id="sg-gantt-filters">
      <label>Search<input aria-label="Find timeline tasks or owners" placeholder="Task or owner" value={search} onChange={e => setSearch(e.target.value)}/></label>
      <label>Status<select aria-label="Timeline status filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="ALL">All statuses</option>{PROJECT_TASK_STATUSES.map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Owner<select aria-label="Timeline owner filter" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>{ownerOptions.map(o => <option key={o} value={o}>{o === 'ALL' ? 'All owners' : o}</option>)}</select></label>
      <label className="sg-check"><input type="checkbox" checked={criticalOnly} onChange={e => setCriticalOnly(e.target.checked)}/>Critical only</label>
      <button onClick={() => { setSearch(''); setStatusFilter('ALL'); setOwnerFilter('ALL'); setCriticalOnly(false) }}>Clear filters</button>
    </div>}
    {dependencySource && <div className="sg-link-mode" role="region" aria-label="Create dependency">
      <span><b>{dependencySource.name}</b> → choose a task’s link button</span>
      <select aria-label="Dependency type" value={linkType} onChange={e => setLinkType(e.target.value as ProjectDependencyType)}>{['FS','SS','FF','SF'].map(t => <option key={t}>{t}</option>)}</select>
      <label>Lag (days)<input aria-label="Dependency lag days" type="number" value={linkLag} onChange={e => setLinkLag(Number(e.target.value) || 0)}/></label>
      <button onClick={() => setDependencySource(null)}>Cancel linking</button>
    </div>}
    <p className="sg-sr" role="status" aria-live="polite" aria-atomic="true" data-project-timeline-live-status="true">{live}</p>
    <div ref={scrollRef} className="sg-gantt-scroll" onScroll={updateScroll} data-project-timeline-scroll="true" data-project-timeline-scrollport="true" data-project-semantic-id="timeline-scrollport" tabIndex={0} aria-label="Scrollable timeline">
      <div className="sg-gantt-canvas" style={{ width: railWidth + timelineWidth, minWidth: '100%' }}>
        <div className="sg-axis" style={{ height: AXIS_HEIGHT }}>
          <div className="sg-rail sg-axis-rail" style={{ width: railWidth }}>Task / WBS</div>
          <div className="sg-axis-time" style={{ width: timelineWidth }}>
            {ticks.map(t => <div key={t.start} className="sg-axis-cell" data-project-timeline-tick="true" style={{ left: xFor(t.start), width: (t.end - t.start) * pxPerDay }}><span>{t.major}</span><strong>{t.label}</strong></div>)}
            <span className="sg-today-axis" style={{ left: todayX }} aria-label="Today"/>
          </div>
        </div>
        <div className="sg-gantt-body" style={{ height: Math.max(totalHeight, 100) }}>
          <div className="sg-time-grid" style={{ left: railWidth, width: timelineWidth }} aria-hidden="true">
            {ticks.map(t => <span key={t.start} data-project-timeline-grid="true" style={{ left: xFor(t.start) }}/>) }
            <span className="sg-today-line" style={{ left: todayX }}/>
          </div>
          <svg className="sg-dependencies" style={{ left: railWidth }} width={timelineWidth} height={totalHeight} aria-label="Timeline dependency network">
            <defs><marker id={`sg-arrow-${project.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="currentColor"/></marker></defs>
            {connectors.map(link => {
              const a = geometryFor(previewRow(link.source)), b = geometryFor(previewRow(link.target))
              const x1 = a[link.edges.source as 'start' | 'finish'], x2 = b[link.edges.target as 'start' | 'finish']
              const y1 = link.sourceIndex * GANTT_ROW_HEIGHT + GANTT_ROW_HEIGHT / 2, y2 = link.targetIndex * GANTT_ROW_HEIGHT + GANTT_ROW_HEIGHT / 2
              const key = ganttRelationKey(link.source.id, link.target.id, link.dependency.type, link.dependency.lag_days)
              const traced = String(link.source.id) === selectedId || String(link.target.id) === selectedId
              const d = ganttOrthogonalPath(x1, y1, x2, y2)
              return <g key={key} className={traced ? 'sg-link traced' : 'sg-link'} data-project-relation-key={key}>
                <path d={d} className="sg-link-line" markerEnd={`url(#sg-arrow-${project.id})`}/>
                <path d={d} className="sg-link-hit" role="button" tabIndex={0} data-project-timeline-dependency-connector="true" data-project-semantic-id={`dependency-${key}`} data-source-task-id={String(link.source.id)} data-target-task-id={String(link.target.id)} data-dependency-type={link.dependency.type} data-dependency-lag={link.dependency.lag_days} aria-label={`Inspect dependency ${link.source.task.name} to ${link.target.task.name}, ${link.dependency.type} ${labelLag(link.dependency.lag_days)}`} onClick={() => inspect(link)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inspect(link) } }}/>
                <circle cx={x1} cy={y1} r=".5" data-project-connector-endpoint="source" data-project-relation-key={key}/><circle cx={x2} cy={y2} r=".5" data-project-connector-endpoint="target" data-project-relation-key={key}/>
              </g>
            })}
          </svg>
          {realizedRows.map((row, localIndex) => {
            const index = rowWindow.start + localIndex, preview = previewRow(row), geom = geometryFor(preview)
            const scheduled = preview.startOrdinal != null && preview.endOrdinal != null
            const critical = typedCritical.has(String(row.id)), selected = selectedId === String(row.id), violation = analysisById.get(String(row.id))?.constraintViolation
            const baselineTask: any = baselineById.get(String(row.id))
            const parseDate = (v: string | null) => v ? Math.floor(Date.parse(v.slice(0,10) + 'T00:00:00Z') / 86400000) : null
            const baselineStart = parseDate(baselineTask?.start_date) ?? row.baselineStartOrdinal, baselineEnd = parseDate(baselineTask?.end_date) ?? row.baselineEndOrdinal
            return <div key={String(row.id)} className={`sg-task-row ${selected ? 'selected' : ''}`} style={{ top: index * GANTT_ROW_HEIGHT, height: GANTT_ROW_HEIGHT, width: railWidth + timelineWidth }} data-project-timeline-row="true" data-task-id={String(row.id)} data-critical={String(critical)} data-milestone={String(row.milestone)}>
              <div className="sg-rail sg-task-rail" style={{ width: railWidth }}>
                <button className="sg-task-link" data-project-timeline-dependency-keyboard="true" data-project-semantic-id={`dependency-source-${row.id}`} aria-pressed={dependencySource?.id === String(row.id)} aria-label={!dependencySource ? `Start dependency from ${row.task.name}` : dependencySource.id === String(row.id) ? `Cancel dependency from ${row.task.name}` : `Add dependency from ${dependencySource.name} to ${row.task.name}`} onClick={() => keyboardDependency(row)}><GitBranch size={15}/></button>
                {row.hasChildren && <button className="sg-collapse" aria-label={`${collapsed.has(String(row.id)) ? 'Expand' : 'Collapse'} ${row.task.name}`} onClick={() => setCollapsed(s => { const next = new Set(s); next.has(String(row.id)) ? next.delete(String(row.id)) : next.add(String(row.id)); return next })}>{collapsed.has(String(row.id)) ? <ChevronRight size={14}/> : <ChevronDown size={14}/>}</button>}
                <button className="sg-task-name" title={`${row.task.name} · ${getTaskOwnerLabel(row.task)}`} style={{ paddingLeft: Math.min(row.depth, 4) * 8 }} onClick={() => setSelectedId(String(row.id))} onDoubleClick={() => openTask(String(row.id))}><span>{row.task.name}</span><small>{getTaskOwnerLabel(row.task)}</small></button>
                {violation && <span title={violation} aria-label={violation}>!</span>}
              </div>
              <div className="sg-row-time" style={{ width: timelineWidth }}>
                {baselineStart != null && baselineEnd != null && <span className="sg-baseline" title="Baseline" style={{ left: xFor(baselineStart), width: widthFor(baselineStart, baselineEnd) }}/>} 
                {row.forecastStartOrdinal != null && row.forecastEndOrdinal != null && <span className="sg-forecast" title="Forecast" style={{ left: xFor(row.forecastStartOrdinal), width: widthFor(row.forecastStartOrdinal, row.forecastEndOrdinal) }}/>} 
                {!scheduled ? <button className="sg-unscheduled" style={{ left: Math.max(8, scroll.left) }} disabled={isSaving} onClick={() => void persist(appendProjectAudit(scheduleProjectTask(project,row.id,projectOrdinalToDate(range.todayOrdinal) || '',1),'Timeline task scheduled',row.task.name),'Timeline task scheduled')}>Schedule today</button> : <>
                  <div data-project-timeline-bar="true" data-task-id={String(row.id)} data-project-semantic-id={`task-bar-${row.id}`} data-move-surface="true" role="button" tabIndex={0} aria-label={`Open ${row.task.name} timeline task`} title={`${row.task.name}\n${readableProjectDate(row.task.start_date)} – ${readableProjectDate(row.task.end_date)}\n${canonicalTaskStatus(row.task.status)} · ${row.progress}%`} className={`sg-task-bar ${row.milestone ? 'milestone' : ''} ${row.blocked ? 'blocked' : ''} ${critical ? 'critical' : ''}`} style={{ left: geom.left, width: geom.width }} onPointerDown={e => { e.stopPropagation(); beginDrag(e,String(row.id),'move') }} onPointerMove={e => moveDrag(e,String(row.id),'move')} onPointerUp={endDrag} onMouseDown={e => beginMouseFallback(e,String(row.id),'move')} onClick={() => { if (!suppressClick.current) setSelectedId(String(row.id)); suppressClick.current = false }} onDoubleClick={() => openTask(String(row.id))} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTask(String(row.id)) } }}>
                    {row.milestone ? <span className="sg-milestone-glyph"/> : <><span className="sg-progress" style={{ width: `${row.progress}%` }}/>{geom.width >= 96 && <span className="sg-bar-label">{row.task.name}</span>}</>}
                    {!row.milestone && geom.width >= 96 && (['start','end'] as const).map(edge => <button type="button" key={edge} data-project-resize-edge={edge} aria-label={`Resize ${edge} ${row.task.name}`} className={`sg-resize ${edge}`} onClick={e => e.stopPropagation()} onPointerDown={e => { e.stopPropagation(); beginDrag(e,String(row.id),edge) }} onPointerMove={e => moveDrag(e,String(row.id),edge)} onPointerUp={endDrag} onMouseDown={e => { e.stopPropagation(); beginMouseFallback(e,String(row.id),edge) }}/>) }
                  </div>
                  {(['start','finish'] as GanttEdge[]).map(edge => <span key={edge} className="sg-port" data-project-dependency-port="true" data-edge={edge} aria-hidden="true" style={{ left: geom[edge] }}/>) }
                </>}
              </div>
            </div>
          })}
          {!visibleRows.length && <div className="sg-empty" style={{ left: scroll.left + 12, width: Math.max(180, scroll.width - 24) }}><strong>{rows.length ? 'No matching tasks' : 'No tasks scheduled yet'}</strong><p>{rows.length ? 'Clear filters to restore the schedule.' : 'Create a task in Tasks to start planning.'}</p></div>}
        </div>
      </div>
    </div>
    {selectedRow && <div className="sg-selection" aria-label="Selected task actions"><strong title={selectedRow.task.name}>{selectedRow.task.name}</strong><button onClick={() => openTask(String(selectedRow.id))}>Details</button>{!selectedRow.milestone && <><button aria-label={`Move start earlier ${selectedRow.task.name}`} disabled={isSaving} onClick={() => editDay('start',-1)}>Start −1d</button><button aria-label={`Move start later ${selectedRow.task.name}`} disabled={isSaving} onClick={() => editDay('start',1)}>Start +1d</button><button aria-label={`Move finish earlier ${selectedRow.task.name}`} disabled={isSaving} onClick={() => editDay('end',-1)}>Finish −1d</button><button aria-label={`Move finish later ${selectedRow.task.name}`} disabled={isSaving} onClick={() => editDay('end',1)}>Finish +1d</button></>}<button onClick={() => setSelectedId(null)} aria-label="Clear task selection">×</button></div>}
    <footer className="sg-gantt-footer"><span>Rows {shownFirst}–{shownLast} of {visibleRows.length}{visibleRows.length !== rows.length ? ` / ${rows.length} total` : ''}</span><span><i className="sg-legend baseline"/>Baseline <i className="sg-legend forecast"/>Forecast {analysis.cycle ? ' · Cycle detected' : ''}</span></footer>
    {relation && createPortal(<div className="sg-dialog-shade" onClick={() => setRelation(null)}><div ref={relationDialog} className="sg-relation-dialog" role="dialog" aria-modal="true" aria-label="Dependency details" onKeyDown={dialogKeys} onClick={e => e.stopPropagation()}><header><h3>Dependency details</h3><button aria-label="Close dependency details" onClick={() => setRelation(null)}>×</button></header><p><b>{relation.source.task.name}</b> → <b>{relation.target.task.name}</b></p><dl><dt>Relationship</dt><dd>{relation.dependency.type}</dd><dt>Lead / lag</dt><dd>{labelLag(relation.dependency.lag_days)}</dd></dl><p>Selecting a connector does not change the schedule.</p><button className="sg-danger" disabled={isSaving} onClick={async () => { await removeDependency(String(relation.source.id),String(relation.target.id),relation.dependency.type,relation.dependency.lag_days); setRelation(null) }}>Remove dependency</button></div></div>, document.body)}
  </section>
}
