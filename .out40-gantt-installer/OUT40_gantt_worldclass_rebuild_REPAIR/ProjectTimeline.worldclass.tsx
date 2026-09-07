function ProjectTimeline({ project, selectedTaskId, onTask, onProjectChange, onProjectMetaChange, zoom, onZoomChange, onUndo, onRedo, canUndo, canRedo }: any) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const scrollFrameRef = useRef<number | null>(null)
  const rows = useMemo(() => buildProjectTimelineRows(project), [project])
  const range = useMemo(() => getProjectTimelineRange(project), [project])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [ownerFilter, setOwnerFilter] = useState('ALL')
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [drag, setDrag] = useState<any>(null)
  const [dependencySource, setDependencySource] = useState<string | null>(null)
  const [viewport, setViewport] = useState({ scrollTop: 0, height: 720 })

  const leftWidth = 460
  const rowHeight = 50
  const overscanRows = 14
  const pxPerDay = TIMELINE_PX_PER_DAY[zoom as ProjectTimelineZoom] || 12
  const timelineWidth = Math.max(960, Math.ceil(range.spanDays * pxPerDay))
  const totalWidth = leftWidth + timelineWidth
  const rowById = useMemo(() => new Map(rows.map((row: any) => [String(row.id), row])), [rows])
  const ownerOptions = useMemo(() => ['ALL', ...Array.from(new Set(rows.map((row: any) => getTaskOwnerLabel(row.task))).values())], [rows])

  const visibleRows = useMemo(() => rows.filter((row: any) => {
    let parent = row.parentId
    const seen = new Set<string>()
    while (parent != null && !seen.has(String(parent))) {
      const key = String(parent)
      seen.add(key)
      if (collapsedIds.has(key)) return false
      parent = rowById.get(key)?.parentId ?? null
    }
    const haystack = `${row.task?.name || ''} ${getTaskOwnerLabel(row.task)}`.toLowerCase()
    if (search && !haystack.includes(search.toLowerCase())) return false
    if (statusFilter !== 'ALL' && row.task?.status !== statusFilter) return false
    if (ownerFilter !== 'ALL' && getTaskOwnerLabel(row.task) !== ownerFilter) return false
    if (criticalOnly && !row.critical) return false
    return true
  }), [rows, collapsedIds, rowById, search, statusFilter, ownerFilter, criticalOnly])

  const visibleIndex = useMemo(() => new Map(visibleRows.map((row: any, index: number) => [String(row.id), index])), [visibleRows])
  const totalRowsHeight = visibleRows.length * rowHeight
  const renderStart = Math.max(0, Math.floor(viewport.scrollTop / rowHeight) - overscanRows)
  const renderEnd = Math.min(visibleRows.length, Math.ceil((viewport.scrollTop + viewport.height) / rowHeight) + overscanRows)
  const renderedRows = visibleRows.slice(renderStart, renderEnd)
  const topSpacer = renderStart * rowHeight
  const bottomSpacer = Math.max(0, totalRowsHeight - renderEnd * rowHeight)

  useEffect(() => setSelectedIds((current) => new Set([...current].filter((id) => rows.some((row: any) => String(row.id) === id)))), [rows.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (scrollFrameRef.current != null) cancelAnimationFrame(scrollFrameRef.current) }, [])

  const xFor = (ordinal: number | null) => ordinal == null ? 0 : (ordinal - range.startOrdinal) * pxPerDay
  const widthFor = (start: number | null, end: number | null) => start == null || end == null ? 0 : Math.max(8, (end - start + 1) * pxPerDay)
  const deltaDays = Number(drag?.deltaDays || 0)
  const previewOrdinals = (row: any) => {
    if (!drag || String(drag.taskId) !== String(row.id)) return { start: row.startOrdinal, end: row.endOrdinal }
    if (drag.mode === 'move') return { start: row.startOrdinal == null ? null : row.startOrdinal + deltaDays, end: row.endOrdinal == null ? null : row.endOrdinal + deltaDays }
    if (drag.mode === 'start') return { start: row.startOrdinal == null || row.endOrdinal == null ? row.startOrdinal : Math.min(row.endOrdinal, row.startOrdinal + deltaDays), end: row.endOrdinal }
    return { start: row.startOrdinal, end: row.startOrdinal == null || row.endOrdinal == null ? row.endOrdinal : Math.max(row.startOrdinal, row.endOrdinal + deltaDays) }
  }

  const commit = (next: any, action: string, detail: string) => onProjectChange(next, action, detail)
  const beginDrag = (event: React.PointerEvent<HTMLElement>, row: any, mode: 'move' | 'start' | 'end') => {
    if (row.startOrdinal == null || row.endOrdinal == null) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ taskId: row.id, mode, startX: event.clientX, deltaDays: 0 })
  }
  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!drag) return
    const nextDelta = Math.round((event.clientX - drag.startX) / pxPerDay)
    if (nextDelta !== drag.deltaDays) setDrag({ ...drag, deltaDays: nextDelta })
  }
  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!drag) return
    event.stopPropagation()
    const row = rowById.get(String(drag.taskId))
    const delta = Number(drag.deltaDays || 0)
    setDrag(null)
    if (!row || !delta) return
    if (drag.mode === 'move') {
      const ids = selectedIds.has(String(row.id)) && selectedIds.size > 1 ? [...selectedIds] : [row.id]
      commit(shiftProjectTaskSchedules(project, ids, delta), 'Timeline schedule moved', `${ids.length} task${ids.length === 1 ? '' : 's'} shifted ${delta > 0 ? '+' : ''}${delta}d`)
    } else {
      commit(resizeProjectTaskSchedule(project, row.id, drag.mode, delta), 'Timeline task resized', `${row.task.name}: ${drag.mode} ${delta > 0 ? '+' : ''}${delta}d`)
    }
  }

  const captureBaseline = () => commit(captureProjectScheduleBaseline(project), 'Schedule baseline captured', 'Captured current task dates as the deterministic schedule baseline')
  const jumpToday = () => {
    const x = xFor(range.todayOrdinal)
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, leftWidth + x - scrollRef.current.clientWidth * 0.5)
  }
  const fitProject = () => {
    const span = range.spanDays
    onZoomChange(span <= 35 ? 'day' : span <= 100 ? 'week' : span <= 320 ? 'month' : 'quarter')
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollLeft = 0 })
  }
  const onScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget
    if (scrollFrameRef.current != null) cancelAnimationFrame(scrollFrameRef.current)
    scrollFrameRef.current = requestAnimationFrame(() => {
      setViewport((current) => {
        const next = { scrollTop: node.scrollTop, height: node.clientHeight || current.height }
        return current.scrollTop === next.scrollTop && current.height === next.height ? current : next
      })
    })
  }

  const tickStep = zoom === 'day' ? 1 : zoom === 'week' ? 7 : zoom === 'month' ? 30 : 90
  const ticks = useMemo(() => {
    const result: number[] = []
    for (let ordinal = range.startOrdinal; ordinal <= range.endOrdinal; ordinal += tickStep) result.push(ordinal)
    return result
  }, [range.startOrdinal, range.endOrdinal, tickStep])

  const monthBands = useMemo(() => {
    const bands: Array<{ key: string; label: string; start: number; end: number }> = []
    let active: { key: string; label: string; start: number; end: number } | null = null
    for (let ordinal = range.startOrdinal; ordinal <= range.endOrdinal; ordinal += 1) {
      const value = projectOrdinalToDate(ordinal) || ''
      const key = value.slice(0, 7)
      const date = new Date(`${value}T00:00:00Z`)
      const label = Number.isNaN(date.getTime()) ? key : date.toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' })
      if (!active || active.key !== key) {
        if (active) bands.push(active)
        active = { key, label, start: ordinal, end: ordinal }
      } else active.end = ordinal
    }
    if (active) bands.push(active)
    return bands
  }, [range.startOrdinal, range.endOrdinal])

  const workingDays = useMemo(() => {
    const raw = project?.metadata_json?.project_schedule_v2?.working_days
    return Array.isArray(raw) && raw.length ? new Set(raw.map(Number)) : null
  }, [project?.metadata_json?.project_schedule_v2?.working_days])
  const nonWorkingBands = useMemo(() => {
    if (!workingDays) return [] as Array<{ start: number; end: number }>
    const bands: Array<{ start: number; end: number }> = []
    let active: { start: number; end: number } | null = null
    for (let ordinal = range.startOrdinal; ordinal <= range.endOrdinal; ordinal += 1) {
      const day = new Date(ordinal * 86_400_000).getUTCDay()
      const off = !workingDays.has(day)
      if (off && !active) active = { start: ordinal, end: ordinal }
      else if (off && active) active.end = ordinal
      else if (!off && active) { bands.push(active); active = null }
    }
    if (active) bands.push(active)
    return bands
  }, [workingDays, range.startOrdinal, range.endOrdinal])

  const dependencies = useMemo(() => visibleRows.flatMap((row: any) => {
    const raw = Array.isArray(row.task?.dependencies_json) ? row.task.dependencies_json : []
    return raw.map((dependency: any) => {
      const sourceId = String(dependency?.id ?? dependency?.task_id ?? dependency ?? '')
      const source = rowById.get(sourceId)
      const typeValue = String(dependency?.type ?? dependency?.dependency_type ?? dependency?.relation ?? 'FS').toUpperCase()
      const type = ['FS', 'SS', 'FF', 'SF'].includes(typeValue) ? typeValue : 'FS'
      const lag = Math.round(Number(dependency?.lag_days ?? dependency?.lagDays ?? dependency?.lag ?? 0) || 0)
      return source ? { source, target: row, sourceId, targetId: String(row.id), type, lag } : null
    }).filter(Boolean)
  }), [visibleRows, rowById])

  const renderedDependencies = useMemo(() => dependencies.filter((link: any) => {
    const sourceIndex = visibleIndex.get(link.sourceId)
    const targetIndex = visibleIndex.get(link.targetId)
    if (sourceIndex == null || targetIndex == null) return false
    return (sourceIndex >= renderStart - 2 && sourceIndex <= renderEnd + 2) || (targetIndex >= renderStart - 2 && targetIndex <= renderEnd + 2)
  }), [dependencies, visibleIndex, renderStart, renderEnd])

  const dependencyPath = (link: any) => {
    const sourceIndex = visibleIndex.get(link.sourceId) as number
    const targetIndex = visibleIndex.get(link.targetId) as number
    const sourceStart = xFor(link.source.startOrdinal)
    const sourceEnd = xFor(link.source.endOrdinal) + widthFor(link.source.startOrdinal, link.source.endOrdinal)
    const targetStart = xFor(link.target.startOrdinal)
    const targetEnd = xFor(link.target.endOrdinal) + widthFor(link.target.startOrdinal, link.target.endOrdinal)
    const sourceX = link.type === 'SS' || link.type === 'SF' ? sourceStart : sourceEnd
    const targetX = link.type === 'FF' || link.type === 'SF' ? targetEnd : targetStart
    const sourceY = sourceIndex * rowHeight + rowHeight / 2
    const targetY = targetIndex * rowHeight + rowHeight / 2
    const direction = targetX >= sourceX ? 1 : -1
    const elbow = direction > 0 ? Math.max(sourceX + 18, Math.min(targetX - 12, sourceX + Math.max(28, (targetX - sourceX) * 0.45))) : Math.max(sourceX, targetX) + 28
    return { sourceX, targetX, sourceY, targetY, d: `M ${sourceX} ${sourceY} H ${elbow} V ${targetY} H ${targetX}` }
  }

  const addDependency = (targetId: any, sourceId: any) => {
    const next = setProjectTaskDependency(project, targetId, sourceId, true)
    setDependencySource(null)
    if (next !== project) commit(next, 'Timeline dependency added', `${rowById.get(String(sourceId))?.task?.name || sourceId} → ${rowById.get(String(targetId))?.task?.name || targetId}`)
  }

  const criticalCount = visibleRows.filter((row: any) => row.critical).length
  const blockedCount = visibleRows.filter((row: any) => row.blocked).length

  return <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#080b12] shadow-2xl" data-project-timeline="true" data-project-flagship-gantt="true">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0c111b] px-4 py-3">
      <div className="flex min-w-0 items-center gap-4">
        <div className="min-w-0"><div className="flex items-center gap-2"><CalendarClock size={15} className="text-blue-300" /><h2 className="text-sm font-black text-white">Plan</h2><span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-slate-500">Flagship Gantt</span></div><p className="mt-1 text-[9px] font-semibold text-slate-600">One task tree · one schedule geometry · connected dependencies</p></div>
        <div className="hidden items-center gap-3 border-l border-white/10 pl-4 xl:flex"><span className="text-[9px] font-black tabular-nums text-slate-400">{visibleRows.length} tasks</span><span className="text-[9px] font-black tabular-nums text-rose-300">{criticalCount} critical</span><span className="text-[9px] font-black tabular-nums text-amber-300">{blockedCount} blocked</span><span className="text-[9px] font-black tabular-nums text-blue-300">{dependencies.length} links</span></div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5"><ToolbarButton variant="quiet" onClick={onUndo} disabled={!canUndo}><Undo2 size={12} /> Undo</ToolbarButton><ToolbarButton variant="quiet" onClick={onRedo} disabled={!canRedo}><Redo2 size={12} /> Redo</ToolbarButton><span className="mx-1 h-5 w-px bg-white/10" /><ToolbarButton variant="quiet" onClick={jumpToday}>Today</ToolbarButton><ToolbarButton variant="quiet" onClick={fitProject}>Fit</ToolbarButton><ToolbarButton variant="quiet" onClick={captureBaseline}>Baseline</ToolbarButton><ToolbarSegmented options={TIMELINE_ZOOM_OPTIONS} value={zoom} onChange={(value) => onZoomChange(value as ProjectTimelineZoom)} /></div>
    </div>

    <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] bg-[#0a0e17] px-3 py-2"><ToolbarSearch value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search task or owner…" className="max-w-xs" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Timeline status filter" className="h-9 rounded-lg border border-white/10 bg-[#0b1222] px-3 text-[10px] text-slate-300"><option value="ALL">All status</option>{PROJECT_TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} aria-label="Timeline owner filter" className="h-9 max-w-[180px] rounded-lg border border-white/10 bg-[#0b1222] px-3 text-[10px] text-slate-300">{ownerOptions.map((owner) => <option key={owner} value={owner}>{owner === 'ALL' ? 'All owners' : owner}</option>)}</select><label className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 text-[9px] font-black uppercase text-slate-500"><input type="checkbox" checked={criticalOnly} onChange={(e) => setCriticalOnly(e.target.checked)} /> Critical path</label><span className="ml-auto hidden text-[9px] font-semibold text-slate-700 lg:inline">Drag to move · resize edges · connect endpoint → endpoint</span></div>

    <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-auto custom-scrollbar" data-project-timeline-scroll="true">
      <div className="relative" style={{ width: `${totalWidth}px`, minWidth: '100%' }}>
        <div className="sticky top-0 z-50 flex h-14 border-b border-white/10 bg-[#0b1019]/95 shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <div className="sticky left-0 z-[60] grid shrink-0 grid-cols-[30px_minmax(0,1fr)_92px_70px] items-end gap-2 border-r border-white/10 bg-[#0b1019] px-3 pb-2" style={{ width: `${leftWidth}px` }}><span /><span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">Task / WBS</span><span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">Owner</span><span className="text-right text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">Finish</span></div>
          <div className="relative h-14 overflow-hidden" style={{ width: `${timelineWidth}px` }}>
            <div className="absolute inset-x-0 top-0 h-7 border-b border-white/[0.055]">{monthBands.map((band) => <span key={band.key} className="absolute inset-y-0 border-l border-white/[0.07] px-2 pt-1.5 text-[9px] font-black text-slate-400" style={{ left: `${xFor(band.start)}px`, width: `${Math.max(pxPerDay, widthFor(band.start, band.end))}px` }}>{band.label}</span>)}</div>
            <div className="absolute inset-x-0 bottom-0 h-7">{ticks.map((ordinal) => { const date = projectOrdinalToDate(ordinal) || ''; const day = date.slice(8, 10); const label = zoom === 'day' ? day : zoom === 'week' ? date.slice(5) : zoom === 'month' ? date.slice(5, 7) : `Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`; return <span key={ordinal} className="absolute inset-y-0 border-l border-white/[0.06] pl-1.5 pt-1.5 text-[8px] font-bold text-slate-600" style={{ left: `${xFor(ordinal)}px` }}>{label}</span> })}</div>
            <span className="absolute inset-y-0 z-10 w-px bg-blue-300/80 shadow-[0_0_12px_rgba(96,165,250,0.55)]" style={{ left: `${xFor(range.todayOrdinal)}px` }} title="Today" />
          </div>
        </div>

        <div className="relative" style={{ height: `${totalRowsHeight}px` }}>
          <div className="pointer-events-none absolute z-0" style={{ left: `${leftWidth}px`, top: 0, width: `${timelineWidth}px`, height: `${totalRowsHeight}px` }} aria-hidden="true">
            {nonWorkingBands.map((band, index) => <span key={`${band.start}-${index}`} className="absolute inset-y-0 bg-white/[0.022]" style={{ left: `${xFor(band.start)}px`, width: `${widthFor(band.start, band.end)}px` }} />)}
            {ticks.map((ordinal) => <span key={ordinal} className="absolute inset-y-0 border-l border-white/[0.035]" style={{ left: `${xFor(ordinal)}px` }} />)}
            <span className="absolute inset-y-0 z-10 w-px bg-blue-400/25" style={{ left: `${xFor(range.todayOrdinal)}px` }} />
          </div>

          <svg className="pointer-events-none absolute z-30 overflow-visible" style={{ left: `${leftWidth}px`, top: 0 }} width={timelineWidth} height={totalRowsHeight} aria-label="Task dependencies">
            <defs><marker id="project-gantt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
            {renderedDependencies.map((link: any) => { const geometry = dependencyPath(link); const critical = Boolean(link.target.critical); const label = `${link.source.task.name} → ${link.target.task.name} · ${link.type}${link.lag ? ` ${link.lag > 0 ? '+' : ''}${link.lag}d` : ''}`; return <path key={`${link.targetId}-${link.sourceId}-${link.type}`} d={geometry.d} fill="none" stroke="currentColor" strokeWidth={critical ? 1.8 : 1.35} vectorEffect="non-scaling-stroke" markerEnd="url(#project-gantt-arrow)" className={`pointer-events-auto cursor-pointer transition-[stroke,opacity] ${critical ? 'text-rose-400/80 hover:text-rose-300' : 'text-sky-400/50 hover:text-sky-300'}`} data-project-timeline-dependency-connector="true" data-project-timeline-dependency-source={link.sourceId} data-project-timeline-dependency-target={link.targetId} data-project-timeline-dependency-type={link.type} data-project-timeline-dependency-lag={String(link.lag)} role="button" tabIndex={0} aria-label={`Remove dependency ${label}`} onClick={() => { const next = setProjectTaskDependency(project, link.target.id, link.sourceId, false); if (next !== project) commit(next, 'Timeline dependency removed', `${link.source.task.name} → ${link.target.task.name}`) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); const next = setProjectTaskDependency(project, link.target.id, link.sourceId, false); if (next !== project) commit(next, 'Timeline dependency removed', `${link.source.task.name} → ${link.target.task.name}`) } }}><title>{label}</title></path> })}
          </svg>

          <div style={{ height: `${topSpacer}px` }} />
          {renderedRows.map((row: any) => {
            const selected = selectedIds.has(String(row.id))
            const preview = previewOrdinals(row)
            const start = preview.start
            const end = preview.end
            const hasSchedule = start != null && end != null
            const left = xFor(start)
            const width = widthFor(start, end)
            const forecastLeft = xFor(row.forecastStartOrdinal)
            const forecastWidth = widthFor(row.forecastStartOrdinal, row.forecastEndOrdinal)
            const baselineLeft = xFor(row.baselineStartOrdinal)
            const baselineWidth = widthFor(row.baselineStartOrdinal, row.baselineEndOrdinal)
            const isActive = String(selectedTaskId) === String(row.id)
            const taskStatus = String(row.task?.status || 'To Do')
            const rowTone = isActive ? 'bg-blue-500/[0.065]' : selected ? 'bg-blue-500/[0.035]' : 'hover:bg-white/[0.018]'
            return <div key={String(row.id)} className={`group relative flex border-b border-white/[0.045] transition-colors ${rowTone}`} style={{ height: `${rowHeight}px` }} data-project-timeline-row="true" data-task-id={String(row.id)} data-milestone={row.milestone ? 'true' : 'false'} data-critical={row.critical ? 'true' : 'false'}>
              <div className={`sticky left-0 z-40 grid shrink-0 grid-cols-[30px_minmax(0,1fr)_92px_70px] items-center gap-2 border-r border-white/10 px-3 transition-colors ${isActive ? 'bg-[#101a2b]' : selected ? 'bg-[#0e1624]' : 'bg-[#0b1019] group-hover:bg-[#0e131d]'}`} style={{ width: `${leftWidth}px` }}>
                <input type="checkbox" checked={selected} onChange={(e) => setSelectedIds((current) => { const next = new Set(current); if (e.target.checked) next.add(String(row.id)); else next.delete(String(row.id)); return next })} aria-label={`Timeline select ${row.task.name}`} />
                <div className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: `${Math.min(row.depth, 8) * 14}px` }}>{row.hasChildren ? <button type="button" onClick={(e) => { e.stopPropagation(); setCollapsedIds((current) => { const next = new Set(current); if (next.has(String(row.id))) next.delete(String(row.id)); else next.add(String(row.id)); return next }) }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-white/5 hover:text-white" aria-label={`${collapsedIds.has(String(row.id)) ? 'Expand' : 'Collapse'} ${row.task.name}`}>{collapsedIds.has(String(row.id)) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}</button> : <span className="w-7 shrink-0" />}{row.milestone ? <Milestone size={12} className="shrink-0 text-violet-300" /> : row.critical ? <GitBranch size={11} className="shrink-0 text-rose-300" /> : <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.blocked ? 'bg-rose-400' : taskStatus === 'Completed' ? 'bg-emerald-400' : 'bg-slate-600'}`} />}<button type="button" onClick={() => onTask(row.id)} className={`min-w-0 truncate text-left text-[11px] font-bold ${row.critical ? 'text-rose-200' : 'text-slate-300'} hover:text-white`}>{row.task.name}</button></div>
                <span className="truncate text-[9px] font-semibold text-slate-600">{getTaskOwnerLabel(row.task)}</span>
                <span className={`truncate text-right text-[9px] font-bold tabular-nums ${row.blocked ? 'text-rose-300' : 'text-slate-600'}`}>{row.task.end_date ? String(row.task.end_date).slice(5, 10) : '—'}</span>
              </div>

              <div className="relative z-20" style={{ width: `${timelineWidth}px` }} onDragOver={(e) => { if (dependencySource) e.preventDefault() }} onDrop={(e) => { e.preventDefault(); const source = e.dataTransfer.getData('text/project-task-dependency') || dependencySource; if (source) addDependency(row.id, source) }}>
                {row.baselineStartOrdinal != null && row.baselineEndOrdinal != null ? <span className="absolute top-[38px] h-[3px] rounded-full bg-violet-300/45" style={{ left: `${baselineLeft}px`, width: `${baselineWidth}px` }} title={`Baseline ${projectOrdinalToDate(row.baselineStartOrdinal)} → ${projectOrdinalToDate(row.baselineEndOrdinal)}`} /> : null}
                {row.forecastStartOrdinal != null && row.forecastEndOrdinal != null ? <span className="absolute top-[9px] h-8 rounded-lg border border-amber-300/15 bg-amber-300/[0.045]" style={{ left: `${forecastLeft}px`, width: `${forecastWidth}px` }} title={`Forecast ${projectOrdinalToDate(row.forecastStartOrdinal)} → ${projectOrdinalToDate(row.forecastEndOrdinal)}`} /> : null}

                {!hasSchedule ? <button onClick={() => commit(scheduleProjectTask(project, row.id, projectOrdinalToDate(range.todayOrdinal) || '', 1), 'Timeline task scheduled', `${row.task.name}: scheduled today`)} className="absolute top-3.5 rounded-md border border-dashed border-white/15 bg-[#0b1019]/80 px-2 py-1 text-[8px] font-black text-slate-600 hover:border-blue-400/30 hover:text-blue-300" style={{ left: `${xFor(range.todayOrdinal)}px` }}>Schedule</button>
                  : row.milestone ? <button onClick={() => onTask(row.id)} onPointerDown={(e) => beginDrag(e, row, 'move')} onPointerMove={moveDrag} onPointerUp={endDrag} className={`absolute top-[16px] z-20 h-[18px] w-[18px] rotate-45 rounded-[3px] border shadow-lg ${row.critical ? 'border-rose-200/80 bg-rose-500/80 shadow-rose-500/20' : 'border-violet-200/70 bg-violet-500/75 shadow-violet-500/20'}`} style={{ left: `${left}px` }} title={`${row.task.name} · ${projectOrdinalToDate(start)}`} data-project-timeline-bar="true" />
                    : row.hasChildren ? <button onClick={() => onTask(row.id)} onPointerDown={(e) => beginDrag(e, row, 'move')} onPointerMove={moveDrag} onPointerUp={endDrag} className={`absolute top-[20px] z-20 h-[10px] rounded-sm border-y ${row.critical ? 'border-rose-300/70 bg-rose-500/55' : 'border-slate-300/30 bg-slate-400/35'}`} style={{ left: `${left}px`, width: `${width}px` }} data-project-timeline-bar="true"><span className="absolute -left-px -top-1 h-4 w-[2px] bg-current" /><span className="absolute -right-px -top-1 h-4 w-[2px] bg-current" /></button>
                      : <div onClick={() => onTask(row.id)} onPointerDown={(e) => beginDrag(e, row, 'move')} onPointerMove={moveDrag} onPointerUp={endDrag} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onTask(row.id) } }} role="button" tabIndex={0} aria-label={`Open ${row.task.name} timeline task`} className={`absolute top-[14px] z-20 h-[22px] cursor-grab overflow-hidden rounded-md border shadow-md outline-none transition-[filter,box-shadow] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-blue-300/70 ${row.blocked ? 'border-rose-300/60 bg-rose-500/65 shadow-rose-950/30' : row.critical ? 'border-rose-200/50 bg-sky-500/75 shadow-sky-950/30' : taskStatus === 'Completed' ? 'border-emerald-200/35 bg-emerald-500/55 shadow-emerald-950/20' : 'border-sky-200/25 bg-sky-500/58 shadow-sky-950/25'}`} style={{ left: `${left}px`, width: `${width}px` }} data-project-timeline-bar="true"><span className="absolute inset-y-0 left-0 bg-white/18" style={{ width: `${row.progress}%` }} /><button onPointerDown={(e) => beginDrag(e, row, 'start')} onPointerMove={moveDrag} onPointerUp={endDrag} onClick={(e) => e.stopPropagation()} className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize opacity-0 hover:bg-white/20 group-hover:opacity-100" aria-label={`Resize start ${row.task.name}`} /><span className="pointer-events-none absolute inset-0 truncate px-2 pt-[3px] text-[8px] font-black text-white/95 drop-shadow">{width >= 72 ? row.task.name : ''}</span><button onPointerDown={(e) => beginDrag(e, row, 'end')} onPointerMove={moveDrag} onPointerUp={endDrag} onClick={(e) => e.stopPropagation()} className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize opacity-0 hover:bg-white/20 group-hover:opacity-100" aria-label={`Resize end ${row.task.name}`} /></div>}

                {hasSchedule ? <span draggable onDragStart={(e) => { e.dataTransfer.setData('text/project-task-dependency', String(row.id)); setDependencySource(String(row.id)) }} onDragEnd={() => setDependencySource(null)} className="absolute top-[20px] z-40 h-2.5 w-2.5 cursor-crosshair rounded-full border border-sky-200/70 bg-[#07101b] opacity-0 shadow-[0_0_0_3px_rgba(14,165,233,0.08)] transition-opacity group-hover:opacity-100" style={{ left: `${left + Math.max(width, 12) + 4}px` }} title={`Start dependency from ${row.task.name}`} data-project-dependency-handle="true" /> : null}
                {hasSchedule ? <span className={`absolute top-[20px] z-40 h-2.5 w-2.5 rounded-full border transition-all ${dependencySource && dependencySource !== String(row.id) ? 'scale-125 border-emerald-200 bg-emerald-400/70 opacity-100' : 'border-white/15 bg-[#07101b] opacity-0 group-hover:opacity-100'}`} style={{ left: `${Math.max(0, left - 8)}px` }} title="Dependency target" data-project-dependency-target="true" /> : null}
              </div>
            </div>
          })}
          <div style={{ height: `${bottomSpacer}px` }} />
        </div>
      </div>
    </div>
  </section>
}
