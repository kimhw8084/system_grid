import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import ProjectsModernGantt from './ProjectsModernGantt'
import { canonicalTaskStatus, readableProjectDate } from './ProjectsVisualRepair.geometry'
import './ProjectsVisualRepair.css'

type TimelineAuthority = { onPersist: (project: any, label: string, baseProject?: any) => any; isSaving: boolean; scheduleControl?: React.ReactNode }
export const ProjectsTimelineAuthority = createContext<TimelineAuthority | null>(null)
/** The Timeline is now rendered once, in the existing workspace's content slot. */
export function ProjectsTimelineHost({ project }: { project: any }) {
  const authority = useContext(ProjectsTimelineAuthority)
  if (!authority) return <div role="alert">Timeline persistence provider is unavailable.</div>
  return <div className="sg-timeline-host">{authority.scheduleControl && <div className="sg-schedule-command">{authority.scheduleControl}</div>}<ProjectsModernGantt project={project} onPersist={authority.onPersist} isSaving={authority.isSaving}/></div>
}
/** Projects-only shell. Keep supplied action callbacks; make infrequent actions expandable. */
export function ProjectsWorkspaceFrame({ header, commandBar, children, className = '' }: any) {
  return <div className={`sg-projects-frame ${className}`} data-workspace="projects" data-golden-workspace-shell="true" data-golden-workspace="projects" data-golden-archetype="hybrid" data-golden-geometry-version="1">
    <div className="sg-workspace-command"><div className="sg-workspace-picker"><strong>{header?.title || 'Projects'}</strong>{commandBar?.left}</div><details className="sg-workspace-actions"><summary>Workspace actions</summary><div>{commandBar?.right}</div></details></div>
    {children}
  </div>
}
export function ProjectsCompactHeader({ project, onEditProject, onMeasureOutcome, onJump, onQuickAction, details }: any) {
  const [expanded, setExpanded] = useState(false)
  if (!project) return null
  const tasks = Array.isArray(project.tasks) ? project.tasks : []
  const done = tasks.filter((task: any) => canonicalTaskStatus(task.status) === 'Completed').length
  const owner = project.owner || (Array.isArray(project.owners) ? project.owners.join(', ') : '') || 'Unassigned'
  return <section className="sg-project-context" data-project-workbench-header="true">
    <div className="sg-context-line"><div className="sg-context-title"><h2 title={project.name}>{project.name}</h2><span>{project.status || 'No status'} · {done}/{tasks.length} tasks complete</span></div>
      <div className="sg-context-actions"><button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? 'Less' : 'Project info'}</button><details><summary>Add / edit</summary><div className="sg-context-menu">
        <button onClick={() => onQuickAction?.('task')}>Add task</button><button onClick={() => onQuickAction?.('update')}>Write update</button><button onClick={() => onQuickAction?.('material')}>Add material</button><button onClick={() => onQuickAction?.('report')}>Capture report</button><button onClick={() => onQuickAction?.('governance')}>Governance</button><button onClick={onEditProject}>Edit project</button><button onClick={onMeasureOutcome}>Measure outcomes</button>
      </div></details></div>
    </div>
    {expanded && <div className="sg-context-expanded">{details || <><p>{project.objective || project.problem_statement || 'No objective recorded.'}</p><span>Owner: {owner}</span><span>Finish: {readableProjectDate(project.end_date || project.target_date)}</span><button onClick={() => onJump?.('overview')}>Open overview</button></>}</div>}
  </section>
}
/** Scoped to the Projects route: normal navigation keeps its pre-existing preference. */
export function useProjectsNavigation(pathname: string, expanded: boolean, setExpanded: (next: boolean) => void) {
  const active = pathname === '/projects' || pathname.startsWith('/projects/')
  const [width, setWidth] = useState(() => typeof window === 'undefined' ? 1440 : window.innerWidth)
  const [open, setOpen] = useState(false)
  const previous = useRef(expanded)
  const toggleRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { let raf = 0; const update = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setWidth(window.innerWidth)) }; window.addEventListener('resize', update); return () => { window.removeEventListener('resize', update); cancelAnimationFrame(raf) } }, [])
  useEffect(() => { if (!active) return; previous.current = expanded; return () => setExpanded(previous.current) }, [active]) // preference preserved on route exit
  const mobile = active && width < 768
  useEffect(() => { if (active) setExpanded(mobile ? open : width >= 1440 && previous.current) }, [active, mobile, open, width >= 1440])
  useEffect(() => { setOpen(false) }, [pathname])
  const close = () => { setOpen(false); requestAnimationFrame(() => toggleRef.current?.focus()) }
  useEffect(() => {
    if (!mobile || !open) return
    const aside = document.querySelector<HTMLElement>('[data-sg-app-sidebar]')
    const main = document.querySelector<HTMLElement>('[data-sg-app-main]')
    const wasInert = main?.inert
    if (main) main.inert = true
    const controls = () => Array.from(aside?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)') || []).filter(x => x.getClientRects().length)
    controls()[0]?.focus()
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close() }
      if (event.key !== 'Tab') return
      const all = controls(), index = all.indexOf(document.activeElement as HTMLElement)
      if (!all.length) return
      if (event.shiftKey && index <= 0) { event.preventDefault(); all[all.length - 1].focus() }
      else if (!event.shiftKey && index === all.length - 1) { event.preventDefault(); all[0].focus() }
    }
    document.addEventListener('keydown', keys)
    return () => { document.removeEventListener('keydown', keys); if (main) main.inert = wasInert || false }
  }, [mobile, open])
  // Resolve the Projects sidebar width synchronously from the route and viewport.
  // App.tsx consumes this value for motion.aside so a just-mounted Projects page does
  // not animate from the previous 240px preference down to 80px underneath a pointer.
  const sidebarExpanded = active ? (mobile ? open : width >= 1440 && previous.current) : expanded
  return { active, mobile, open, sidebarExpanded, toggleRef, close, toggle: () => setOpen(value => !value) }
}
export function ProjectsNavigationButton({ nav }: { nav: ReturnType<typeof useProjectsNavigation> }) {
  return nav.mobile ? <button ref={nav.toggleRef} className="sg-app-menu" onClick={nav.toggle} aria-expanded={nav.open} aria-label="Open application navigation">☰</button> : null
}
export function ProjectsNavigationBackdrop({ nav }: { nav: ReturnType<typeof useProjectsNavigation> }) {
  return nav.mobile && nav.open ? <button className="sg-nav-backdrop" aria-label="Close application navigation" onClick={nav.close}/> : null
}
