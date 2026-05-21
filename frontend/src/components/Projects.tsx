import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ListTodo, History, ShieldAlert, Globe, 
  Zap, Save, X, PlusCircle, User, MessageSquare,
  MoreVertical, RefreshCcw, TrendingUp, AlertTriangle,
  Lightbulb, ShieldCheck, Calendar, Activity, Database, Server,
  FileText, Clipboard, Terminal, ArrowRight, Shield, Download, Share2,
  Clock, CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye, Camera, Link as LinkIcon, Link2, Layers, Settings, Check, Target, ChevronDown, PlusCircle as PlusIcon,
  Workflow, ExternalLink, Briefcase, BarChart3, Users, DollarSign, Image as ImageIcon, HelpCircle, BookOpen, Filter,
  Maximize2, Minimize2, PanelLeft, PanelRight, MousePointer2, GitBranch, Binary, Cpu, Network, Activity as ActivityIcon, ScrollText
} from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { AgGridReact } from 'ag-grid-react'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'

// --- Types & Constants ---

const PROJECT_TYPES = [
  { value: 'Strategic', label: 'STRATEGIC' },
  { value: 'Tactical', label: 'TACTICAL' },
  { value: 'Operational', label: 'OPERATIONAL' },
  { value: 'Research', label: 'RESEARCH' }
]

const PROJECT_STATUSES = [
  { value: 'Not Started', label: 'NOT STARTED' },
  { value: 'Planning', label: 'PLANNING' },
  { value: 'In Progress', label: 'IN PROGRESS' },
  { value: 'Paused', label: 'PAUSED' },
  { value: 'Blocked', label: 'BLOCKED' },
  { value: 'Cancelled', label: 'CANCELLED' },
  { value: 'Completed', label: 'COMPLETED' }
]

const PROJECT_PRIORITIES = [
  { value: 'Low', label: 'LOW' },
  { value: 'Medium', label: 'MEDIUM' },
  { value: 'High', label: 'HIGH' },
  { value: 'Highest', label: 'HIGHEST' }
]

const DEFENSE_LINES = [
  { value: '0', label: 'LINE 0: BASE' },
  { value: '1', label: 'LINE 1: FORTIFIED' },
  { value: '2', label: 'LINE 2: RESILIENT' }
]

// --- Workspace Components ---

const ProjectHUD = ({ project }: { project: any }) => {
  if (!project) return (
    <div className="h-16 bg-[#0a0c14] border-b border-white/5 flex items-center px-6 gap-6">
       <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center border border-blue-500/20">
             <Briefcase size={20} className="text-blue-400" />
          </div>
          <div>
             <h1 className="text-lg font-black uppercase tracking-tighter text-slate-500">Workshop Baseline</h1>
             <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Select a strategic stream to begin</p>
          </div>
       </div>
    </div>
  )

  const tasks = project.tasks || []
  const progress = tasks.length > 0 
    ? Math.round(tasks.reduce((acc: number, t: any) => acc + (t.progress || 0), 0) / tasks.length) 
    : 0

  return (
    <div className="h-16 bg-[#0a0c14] border-b border-white/10 flex items-center px-6 justify-between shrink-0 z-50 shadow-2xl">
       <div className="flex items-center gap-6 overflow-hidden">
          <div className="flex items-center gap-3 shrink-0">
             <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                <Workflow size={20} className="text-white" />
             </div>
             <div>
                <h1 className="text-lg font-black uppercase tracking-tighter text-white leading-none truncate max-w-[300px]">{project.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{project.type}</span>
                   <span className="text-slate-700 font-bold">•</span>
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{project.status}</span>
                   <span className="text-slate-700 font-bold">•</span>
                   <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Added: {project.created_at ? format(new Date(project.created_at), 'MMM yyyy') : 'N/A'}</span>
                </div>
             </div>
          </div>

          <div className="h-8 w-px bg-white/5 mx-2 shrink-0" />

          <div className="flex items-center gap-8 overflow-hidden">
             <div className="shrink-0">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Maturity</p>
                <div className="flex items-center gap-3">
                   <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                      />
                   </div>
                   <span className="text-xs font-black text-white">{progress}%</span>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-x-6 gap-y-1 shrink-0">
                <div className="flex items-center gap-2">
                   <Clock size={10} className="text-rose-500" />
                   <span className="text-[10px] font-black text-white">{project.stoploss_minutes_saved || 0}m <span className="text-slate-500 text-[8px] ml-0.5">SAVED</span></span>
                </div>
                <div className="flex items-center gap-2">
                   <TrendingUp size={10} className="text-emerald-400" />
                   <span className="text-[10px] font-black text-white">{project.wafers_gained || 0} <span className="text-slate-500 text-[8px] ml-0.5">GAINED</span></span>
                </div>
             </div>
          </div>
       </div>

       <div className="flex items-center gap-4 shrink-0">
          <div className="flex -space-x-2">
             {(project.owner || "ENGINEER").split(',').map((o: string, i: number) => (
               <div key={i} className="w-8 h-8 rounded-full bg-[#1a1b26] border-2 border-[#0a0c14] flex items-center justify-center text-[10px] font-black text-blue-400 uppercase group relative cursor-help">
                  {o.trim()[0]}
                  <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-50 bg-[#1a1b26] border border-white/10 p-2 rounded text-[9px] font-black whitespace-nowrap">{o.trim()}</div>
               </div>
             ))}
          </div>
          <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-all border border-white/5">
             <Settings size={18} />
          </button>
       </div>
    </div>
  )
}

const ProjectRail = ({ 
  projects, 
  selectedId, 
  onSelect, 
  onNew, 
  onDelete,
  width,
  onResize,
  isCollapsed,
  onToggleCollapse
}: { 
  projects: any[], 
  selectedId: number | null, 
  onSelect: (id: number) => void, 
  onNew: () => void, 
  onDelete: (id: number) => void,
  width: number,
  onResize: (width: number) => void,
  isCollapsed: boolean,
  onToggleCollapse: () => void
}) => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState('ALL')

  const years = useMemo(() => {
    const y = new Set<string>()
    projects.forEach(p => {
      if (p.created_at) y.add(new Date(p.created_at).getFullYear().toString())
      if (p.start_date) y.add(new Date(p.start_date).getFullYear().toString())
    })
    return Array.from(y).sort((a, b) => b.localeCompare(a))
  }, [projects])

  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter
    const matchesPriority = priorityFilter === 'ALL' || p.priority === priorityFilter
    const pYear = p.created_at ? new Date(p.created_at).getFullYear().toString() : 'N/A'
    const matchesYear = yearFilter === 'ALL' || pYear === yearFilter
    return matchesSearch && matchesStatus && matchesPriority && matchesYear
  })

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-white/5 flex flex-col items-center py-4 bg-[#0a0c14] shrink-0">
         <button onClick={onToggleCollapse} className="p-2 text-slate-500 hover:text-white transition-all mb-4">
            <PanelLeft size={18} />
         </button>
         <button onClick={onNew} className="p-2 bg-blue-600 text-white rounded-lg mb-4">
            <Plus size={18} />
         </button>
         <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar no-scrollbar">
            {filtered.map(p => (
               <button 
                 key={p.id} 
                 onClick={() => onSelect(p.id)}
                 className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase transition-all ${selectedId === p.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                 title={p.name}
               >
                  {p.name[0]}
               </button>
            ))}
         </div>
      </div>
    )
  }

  return (
    <div className="relative border-r border-white/5 bg-[#0a0c14] shrink-0 flex flex-col group/rail" style={{ width }}>
       <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
             <button 
               onClick={onNew}
               className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
             >
                <Plus size={14} /> New Stream
             </button>
             <button onClick={onToggleCollapse} className="p-2 ml-2 text-slate-500 hover:text-white transition-all rounded-lg hover:bg-white/5">
                <PanelRight size={18} />
             </button>
          </div>

          <div className="space-y-2">
             <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-[10px] font-bold text-white outline-none focus:border-blue-500/50 uppercase tracking-widest transition-all"
                  placeholder="Search Matrix..."
                />
             </div>
             <div className="grid grid-cols-2 gap-2">
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-[8px] font-black text-slate-400 outline-none focus:border-blue-500/50 uppercase tracking-widest"
                >
                   <option value="ALL">ALL STATUS</option>
                   {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select 
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-[8px] font-black text-slate-400 outline-none focus:border-blue-500/50 uppercase tracking-widest"
                >
                   <option value="ALL">ALL PRIORITY</option>
                   {PROJECT_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
             </div>
             <select 
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-[8px] font-black text-slate-400 outline-none focus:border-blue-500/50 uppercase tracking-widest"
              >
                 <option value="ALL">ALL YEARS</option>
                 {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {filtered.map(p => (
            <div key={p.id} className="relative group">
              <button
                onClick={() => onSelect(p.id)}
                className={`w-full text-left p-3 rounded-lg transition-all border ${
                  selectedId === p.id 
                    ? 'bg-blue-600/10 border-blue-500/40' 
                    : 'border-transparent hover:bg-white/5'
                }`}
              >
                 <div className="flex justify-between items-start mb-1">
                    <h3 className={`text-[11px] font-black uppercase truncate transition-colors ${selectedId === p.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{p.name}</h3>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      p.status === 'Completed' ? 'bg-emerald-500' :
                      p.status === 'Blocked' ? 'bg-rose-500' :
                      p.status === 'In Progress' ? 'bg-blue-500' : 'bg-slate-700'
                    }`} />
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{p.type}</span>
                       <span className="text-slate-800 text-[8px]">•</span>
                       <span className="text-[8px] font-bold text-slate-500">{p.priority}</span>
                    </div>
                    <span className="text-[7px] font-black text-slate-700">{p.created_at ? format(new Date(p.created_at), 'yyyy') : 'N/A'}</span>
                 </div>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                className="absolute top-2 right-2 p-1.5 bg-rose-600/20 text-rose-500 rounded-md opacity-0 group-hover:opacity-100 hover:bg-rose-600 hover:text-white transition-all scale-75"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
       </div>

       {/* Resize Handle */}
       <div 
         className="absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/30 transition-colors z-50"
         onMouseDown={(e) => {
           const startX = e.clientX
           const startWidth = width
           const onMouseMove = (e: MouseEvent) => {
             const newWidth = Math.max(160, Math.min(400, startWidth + (e.clientX - startX)))
             onResize(newWidth)
           }
           const onMouseUp = () => {
             window.removeEventListener('mousemove', onMouseMove)
             window.removeEventListener('mouseup', onMouseUp)
           }
           window.addEventListener('mousemove', onMouseMove)
           window.addEventListener('mouseup', onMouseUp)
         }}
       />
    </div>
  )
}
const ProjectLedger = ({ project }: { project: any }) => {
  if (!project) return null

  return (
    <div className="w-80 border-l border-white/5 flex flex-col bg-[#0a0c14] shrink-0 overflow-y-auto custom-scrollbar">
       <div className="p-6 space-y-8">
          {/* ROI Section */}
          <section className="space-y-4">
             <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <BarChart3 size={14} /> Strategic ROI
             </h4>
             <div className="grid grid-cols-1 gap-3">
                <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Defense Line</p>
                   <p className="text-xl font-black text-white">LEVEL {project.roi_defense_line || 0}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Man-Hours Optimization</p>
                   <p className="text-xl font-black text-emerald-400">+{project.man_hours_saved || 0}H</p>
                </div>
             </div>
          </section>

          {/* Jira Records */}
          <section className="space-y-4">
             <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <LinkIcon size={14} /> Jira Reference
             </h4>
             <div className="space-y-2">
                {(project.jira_links || []).map((link: string, i: number) => (
                  <a 
                    key={i} 
                    href={link.startsWith('http') ? link : `#`}
                    target={link.startsWith('http') ? "_blank" : "_self"}
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-all group"
                  >
                     <span className="text-[11px] font-black text-blue-400 uppercase truncate mr-2">{link}</span>
                     <ExternalLink size={12} className="text-slate-600 group-hover:text-blue-400 shrink-0" />
                  </a>
                ))}
                {(!project.jira_links || project.jira_links.length === 0) && (
                   <p className="text-[10px] font-bold text-slate-600 uppercase px-1">No linked records</p>
                )}
             </div>
          </section>

          {/* Team Context */}
          <section className="space-y-4">
             <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Users size={14} /> Stakeholders
             </h4>
             <div className="space-y-3">
                {(project.owner || "UNASSIGNED").split(',').map((o: string, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400 uppercase">
                        {o.trim()[0]}
                     </div>
                     <div>
                        <p className="text-[11px] font-black text-white uppercase">{o.trim()}</p>
                        <p className="text-[9px] font-bold text-slate-600 uppercase">Primary Lead</p>
                     </div>
                  </div>
                ))}
             </div>
          </section>
       </div>
    </div>
  )
}

const PrecisionGantt = ({ project, onUpdate }: { project: any, onUpdate: (data: any) => void }) => {
  const [tasks, setTasks] = useState<any[]>(project.tasks || [])
  const [zoomLevel, setZoomLevel] = useState(30)
  const containerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set())
  const [dependencySourceId, setDependencySourceId] = useState<number | null>(null)
  const [showBaseline, setShowBaseline] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(200)

  const ROW_HEIGHT = 36
  const HEADER_HEIGHT = 40

  // Sync internal state with props when project changes
  useEffect(() => {
    setTasks(project.tasks || [])
  }, [project.tasks])

  const handleSelectTask = (id: number, isShift: boolean) => {
    if (isShift) {
      const next = new Set(selectedTaskIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setSelectedTaskIds(next)
      setSelectedTaskId(null)
    } else {
      if (selectedTaskIds.has(id) && selectedTaskIds.size > 1) {
         // Keep existing selection or clear? Usually clicking single clears others
         setSelectedTaskIds(new Set([id]))
         setSelectedTaskId(id)
      } else {
         setSelectedTaskIds(new Set([id]))
         setSelectedTaskId(id)
      }
    }
  }

  const handleTaskMove = (id: number, delta: number, isFinal = false) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const currentPos = getPosFromDate(task.start_date)
    const newPos = currentPos + delta
    const snappedPos = Math.round(newPos / zoomLevel) * zoomLevel
    if (!isFinal && snappedPos === currentPos) return

    const daysMoved = Math.round((snappedPos - currentPos) / zoomLevel)
    if (daysMoved === 0 && !isFinal) return

    // Multi-move logic
    const idsToMove = selectedTaskIds.has(id) ? Array.from(selectedTaskIds) : [id]
    
    const updatedTasks = tasks.map(t => {
      if (idsToMove.includes(t.id)) {
        const newStart = addDays(new Date(t.start_date), daysMoved).toISOString()
        const duration = differenceInDays(new Date(t.end_date), new Date(t.start_date))
        const newEnd = addDays(new Date(newStart), duration).toISOString()
        return { ...t, start_date: newStart, end_date: newEnd }
      }
      return t
    })

    setTasks(updatedTasks)
    
    if (isFinal) {
      onUpdate({ ...project, tasks: updatedTasks })
    }
  }

  const criticalPathIds = useMemo(() => {
    if (tasks.length === 0) return new Set()
    const memo = new Map<number, number>()
    const visiting = new Set<number>()
    const getTaskDuration = (t: any) => differenceInDays(new Date(t.end_date), new Date(t.start_date))
    
    const findLongestPath = (taskId: number): number => {
      if (memo.has(taskId)) return memo.get(taskId)!
      if (visiting.has(taskId)) return 0
      visiting.add(taskId)
      const task = tasks.find(t => t.id === taskId)
      if (!task) { visiting.delete(taskId); return 0; }
      const dependents = tasks.filter(t => (t.dependencies_json || []).includes(taskId))
      let maxSubPath = 0
      for (const dep of dependents) maxSubPath = Math.max(maxSubPath, findLongestPath(dep.id))
      const result = getTaskDuration(task) + maxSubPath
      memo.set(taskId, result)
      visiting.delete(taskId)
      return result
    }

    const pathValues = tasks.map(t => ({ id: t.id, length: findLongestPath(t.id) }))
    const maxLength = Math.max(...pathValues.map(p => p.length), 0)
    const criticalSet = new Set<number>()
    if (maxLength === 0) return criticalSet

    const isCriticalMemo = new Map<string, boolean>()
    const isCritical = (taskId: number, currentLength: number): boolean => {
      const key = `${taskId}-${currentLength}`
      if (isCriticalMemo.has(key)) return isCriticalMemo.get(key)!
      const task = tasks.find(t => t.id === taskId)
      if (!task) return false
      const duration = getTaskDuration(task)
      if (Math.abs(currentLength - findLongestPath(taskId)) < 0.1) {
        criticalSet.add(taskId)
        const dependents = tasks.filter(t => (t.dependencies_json || []).includes(taskId))
        for (const dep of dependents) isCritical(dep.id, currentLength - duration)
        isCriticalMemo.set(key, true)
        return true
      }
      isCriticalMemo.set(key, false)
      return false
    }
    tasks.forEach(t => { if (Math.abs(findLongestPath(t.id) - maxLength) < 0.1) isCritical(t.id, maxLength) })
    return criticalSet
  }, [tasks])

  const startDate = useMemo(() => {
    if (tasks.length === 0) return startOfMonth(new Date())
    const times = tasks.map(t => new Date(t.start_date).getTime()).filter(t => !isNaN(t))
    const min = times.length > 0 ? Math.min(...times) : new Date().getTime()
    return startOfMonth(addDays(new Date(min), -7))
  }, [tasks])

  const endDate = useMemo(() => {
    if (tasks.length === 0) return endOfMonth(addDays(new Date(), 90))
    const times = tasks.map(t => new Date(t.end_date).getTime()).filter(t => !isNaN(t))
    const max = times.length > 0 ? Math.max(...times) : addDays(new Date(), 90).getTime()
    return endOfMonth(addDays(new Date(max), 30))
  }, [tasks])

  const days = useMemo(() => {
    try { return eachDayOfInterval({ start: startDate, end: endDate }) }
    catch (e) { return [new Date()] }
  }, [startDate, endDate])

  const getPosFromDate = (date: string | Date) => {
    const d = new Date(date)
    if (isNaN(d.getTime())) return 0
    return differenceInDays(d, startDate) * zoomLevel
  }

  // Scroll to earliest task on load
  useEffect(() => {
    if (timelineRef.current && tasks.length > 0) {
      const earliestPos = Math.min(...tasks.map(t => getPosFromDate(t.start_date)))
      timelineRef.current.scrollLeft = Math.max(0, earliestPos - 100)
    }
  }, [startDate]) // Only on first render / date range shift

  const handleTaskUpdate = (id: number, updates: any) => {
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    setTasks(updatedTasks)
    onUpdate({ ...project, tasks: updatedTasks })
  }

  const handleTaskResize = (id: number, delta: number, type: 'start' | 'end', isFinal = false) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const currentPos = getPosFromDate(type === 'start' ? task.start_date : task.end_date)
    const newPos = currentPos + delta
    const snappedPos = Math.round(newPos / zoomLevel) * zoomLevel
    if (!isFinal && snappedPos === currentPos) return

    const daysMoved = Math.round((snappedPos - currentPos) / zoomLevel)
    if (daysMoved === 0 && !isFinal) return

    let updatedTask = { ...task }
    if (type === 'start') {
      const newStart = addDays(new Date(task.start_date), daysMoved)
      if (newStart < new Date(task.end_date)) {
        updatedTask.start_date = newStart.toISOString()
      }
    } else {
      const newEnd = addDays(new Date(task.end_date), daysMoved)
      if (newEnd > new Date(task.start_date)) {
        updatedTask.end_date = newEnd.toISOString()
      }
    }

    const updatedTasks = tasks.map(t => t.id === id ? updatedTask : t)
    setTasks(updatedTasks)

    if (isFinal) {
      onUpdate({ ...project, tasks: updatedTasks })
    }
  }

  const toggleDependency = (targetId: number) => {
    if (!dependencySourceId || dependencySourceId === targetId) return
    const task = tasks.find(t => t.id === dependencySourceId)
    if (!task) return
    const deps = [...(task.dependencies_json || [])]
    const idx = deps.indexOf(targetId)
    if (idx > -1) deps.splice(idx, 1)
    else deps.push(targetId)
    handleTaskUpdate(dependencySourceId, { dependencies_json: deps })
  }

  const dependencyLines = useMemo(() => {
    const taskMap = new Map(tasks.map(t => [t.id, t]))
    const taskIndices = new Map(tasks.map((t, i) => [t.id, i]))

    return tasks.flatMap(task => (task.dependencies_json || []).map(depId => {
      const fromTask = taskMap.get(depId)
      if (!fromTask) return null
      const fromIdx = taskIndices.get(depId) ?? -1
      const toIdx = taskIndices.get(task.id) ?? -1
      if (fromIdx === -1 || toIdx === -1) return null
      
      const x1 = getPosFromDate(fromTask.end_date)
      const y1 = fromIdx * ROW_HEIGHT + (ROW_HEIGHT / 2)
      const x2 = getPosFromDate(task.start_date)
      const y2 = toIdx * ROW_HEIGHT + (ROW_HEIGHT / 2)
      const isCritical = criticalPathIds.has(task.id) && criticalPathIds.has(fromTask.id)
      return (
        <g key={`${task.id}-${depId}`}>
           <path d={`M ${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2} ${y2}`} stroke={isCritical ? '#f43f5e' : '#3b82f6'} strokeWidth={isCritical ? "2" : "1"} fill="none" opacity={isCritical ? 1 : 0.2} strokeDasharray={isCritical ? "0" : "4,2"} />
           <circle cx={x2} cy={y2} r="2" fill={isCritical ? '#f43f5e' : '#3b82f6'} />
        </g>
      )
    })).filter(Boolean)
  }, [tasks, zoomLevel, criticalPathIds])

  const stats = useMemo(() => {
    const total = tasks.length
    if (total === 0) return { progress: 0, blocked: 0, health: 'Stable' }
    const avgProgress = Math.round(tasks.reduce((acc, t) => acc + (t.progress || 0), 0) / total)
    const blockedCount = tasks.filter(t => t.status === 'Blocked').length
    const criticalTasks = tasks.filter(t => criticalPathIds.has(t.id))
    const criticalProgress = criticalTasks.length > 0 ? Math.round(criticalTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / criticalTasks.length) : 0
    return { progress: avgProgress, blocked: blockedCount, criticalProgress, health: blockedCount > 0 ? 'At Risk' : 'Healthy' }
  }, [tasks, criticalPathIds])

  return (
    <div className="h-full flex flex-col bg-[#0b0c14] overflow-hidden">
       {/* Executive HUD Overlay */}
       <AnimatePresence>
          {showStats && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#12141f] border-b border-white/10 overflow-hidden">
               <div className="p-4 grid grid-cols-4 gap-4">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Portfolio Velocity</p>
                     <div className="flex items-end gap-2"><span className="text-xl font-black text-white">{stats.progress}%</span><span className="text-[9px] font-bold text-emerald-400 mb-1">↑ 4%</span></div>
                     <div className="h-1 w-full bg-white/5 rounded-full mt-2"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.progress}%` }} /></div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Critical Path Progress</p>
                     <div className="flex items-end gap-2"><span className="text-xl font-black text-rose-400">{stats.criticalProgress}%</span><span className="text-[9px] font-bold text-slate-600 mb-1">Target 85%</span></div>
                     <div className="h-1 w-full bg-white/5 rounded-full mt-2"><div className="h-full bg-rose-500 rounded-full" style={{ width: `${stats.criticalProgress}%` }} /></div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Blocked Entities</p>
                     <div className="flex items-end gap-2"><span className={`text-xl font-black ${stats.blocked > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{stats.blocked}</span><span className="text-[9px] font-bold text-slate-600 mb-1">Active Risks</span></div>
                     <div className="flex gap-1 mt-2">{(Array(5).fill(0)).map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i < stats.blocked ? 'bg-rose-500' : 'bg-white/5'}`} />)}</div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Vector Health</p>
                     <div className="flex items-end gap-2"><span className={`text-xl font-black ${stats.health === 'Healthy' ? 'text-emerald-400' : 'text-amber-400'}`}>{stats.health}</span><Activity size={14} className={stats.health === 'Healthy' ? 'text-emerald-400 mb-1' : 'text-amber-400 mb-1'} /></div>
                     <p className="text-[7px] font-bold text-slate-600 uppercase tracking-widest mt-2">Operational Integrity Nominal</p>
                  </div>
               </div>
            </motion.div>
          )}
       </AnimatePresence>

       {/* Toolbar */}
       <div className="h-10 border-b border-white/5 flex items-center px-4 justify-between bg-[#0a0c14]/90 backdrop-blur-md z-40">
          <div className="flex items-center gap-4">
             <button onClick={() => setShowStats(!showStats)} className={`p-1.5 rounded transition-all ${showStats ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}><BarChart3 size={14}/></button>
             <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded border border-white/5">
                <button onClick={() => setZoomLevel(Math.max(10, zoomLevel - 5))} className="text-slate-500 hover:text-white transition-all p-0.5"><Minimize2 size={12}/></button>
                <div className="w-px h-2.5 bg-white/10 mx-0.5" />
                <button onClick={() => setZoomLevel(Math.min(100, zoomLevel + 5))} className="text-slate-500 hover:text-white transition-all p-0.5"><Maximize2 size={12}/></button>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1.5">{zoomLevel}PX/D</span>
             </div>
             {dependencySourceId && (
               <div className="flex items-center gap-2 px-2 py-1 bg-blue-600/10 border border-blue-500/20 rounded animate-pulse">
                  <Link2 size={10} className="text-blue-400" />
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Dependency Mode</span>
                  <button onClick={() => setDependencySourceId(null)} className="ml-1 text-slate-500 hover:text-white"><X size={10}/></button>
               </div>
             )}
             {selectedTaskIds.size > 1 && (
               <div className="flex items-center gap-2 px-2 py-1 bg-amber-600/10 border border-amber-500/20 rounded">
                  <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">{selectedTaskIds.size} TASKS SELECTED</span>
                  <button onClick={() => setSelectedTaskIds(new Set())} className="ml-1 text-slate-500 hover:text-white"><X size={10}/></button>
               </div>
             )}
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setShowBaseline(!showBaseline)} className={`px-2 py-1 border rounded text-[8px] font-black uppercase tracking-widest transition-all ${showBaseline ? 'bg-amber-600/20 border-amber-500/40 text-amber-400' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}>{showBaseline ? 'Hide Baseline' : 'Show Baseline'}</button>
             <div className="h-4 w-px bg-white/10 mx-1" />
             <button 
               onClick={() => {
                 const name = prompt('MILESTONE IDENTIFIER')
                 if (!name) return
                 const newTask = { id: Date.now(), name, start_date: new Date().toISOString(), end_date: addDays(new Date(), 7).toISOString(), progress: 0, status: 'To Do', dependencies_json: [], metadata_json: {} }
                 const updated = [...tasks, newTask]
                 setTasks(updated)
                 onUpdate({ ...project, tasks: updated })
               }}
               className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded text-[8px] font-black uppercase tracking-widest hover:bg-blue-600/30 transition-all flex items-center gap-1.5"
             ><Plus size={10}/> New Task</button>
          </div>
       </div>

       <div className="flex-1 flex overflow-hidden relative">
          {/* Frozen Sidebar */}
          <div style={{ width: sidebarWidth }} className="flex-none flex flex-col border-r border-white/10 bg-[#0d0f17] z-30 shadow-2xl">
             <div className="h-10 border-b border-white/10 flex items-center px-4 shrink-0 bg-[#0a0c14]/80">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Engineering Stack</span>
             </div>
             <div ref={sidebarRef} className="flex-1 overflow-y-hidden custom-scrollbar">
                {tasks.map((task, idx) => (
                  <div 
                    key={task.id} 
                    onClick={(e) => handleSelectTask(task.id, e.shiftKey)}
                    className={`h-9 flex items-center px-4 border-b border-white/5 cursor-pointer transition-all group ${selectedTaskIds.has(task.id) ? 'bg-blue-600/10' : 'hover:bg-white/5'}`}
                  >
                     <div className={`w-1.5 h-1.5 rounded-full mr-3 shrink-0 ${task.status === 'Completed' ? 'bg-emerald-500' : task.status === 'Blocked' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                     <span className={`text-[10px] font-bold uppercase truncate tracking-tight transition-all ${selectedTaskIds.has(task.id) ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>{task.name}</span>
                  </div>
                ))}
             </div>
          </div>

          {/* Timeline View */}
          <div ref={timelineRef} className="flex-1 overflow-auto custom-scrollbar relative" onScroll={(e: any) => { if (sidebarRef.current) sidebarRef.current.scrollTop = e.target.scrollTop; }}>
             <div className="sticky top-0 z-20 flex bg-[#0a0c14] border-b border-white/10" style={{ width: days.length * zoomLevel }}>
                {days.map((day, i) => (
                  <div key={i} className={`shrink-0 border-r border-white/5 flex flex-col items-center justify-center h-10 ${isSameDay(day, new Date()) ? 'bg-blue-600/10' : ''}`} style={{ width: zoomLevel }}>
                     <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">{format(day, 'MMM')}</span>
                     <span className={`text-[10px] font-black ${isSameDay(day, new Date()) ? 'text-blue-400' : 'text-slate-300'}`}>{format(day, 'd')}</span>
                  </div>
                ))}
             </div>

             <div className="relative pt-0 pb-20" style={{ width: days.length * zoomLevel, minHeight: '100%' }}>
                {/* Dependency Lines */}
                <svg className="absolute inset-0 pointer-events-none z-0" style={{ width: '100%', height: '100%' }}>{dependencyLines}</svg>

                {/* Today Marker */}
                <div className="absolute top-0 bottom-0 w-px bg-blue-500/40 z-10 pointer-events-none" style={{ left: getPosFromDate(new Date()) }}>
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                </div>

                {tasks.map((task, idx) => {
                  const left = getPosFromDate(task.start_date)
                  const width = getPosFromDate(task.end_date) - left
                  const isCritical = criticalPathIds.has(task.id)
                  const baseline = task.metadata_json?.baseline

                  return (
                    <div key={task.id} className="h-9 relative group/row">
                       <div className="absolute inset-0 border-b border-white/5 group-hover/row:bg-white/5 transition-all pointer-events-none" />
                       
                       {/* Baseline Visualization */}
                       {showBaseline && baseline && (
                         <div className="absolute h-2 bg-amber-500/10 border border-amber-500/20 rounded-sm z-10 top-1.5 opacity-40 pointer-events-none" style={{ left: getPosFromDate(baseline.start), width: getPosFromDate(baseline.end) - getPosFromDate(baseline.start) }} />
                       )}

                       {/* Task Bar */}
                       <motion.div
                         layout
                         drag="x"
                         dragMomentum={false}
                         onDrag={(e, info) => handleTaskMove(task.id, info.delta.x)}
                         onDragEnd={() => handleTaskMove(task.id, 0, true)}
                         onClick={(e) => dependencySourceId ? toggleDependency(task.id) : handleSelectTask(task.id, e.shiftKey)}
                         className={`absolute h-6 top-1.5 rounded-lg flex items-center px-2 gap-2 border shadow-xl z-20 group/bar transition-shadow ${
                           selectedTaskIds.has(task.id) ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0d0f17] z-30' : ''
                         } ${
                           isCritical ? 'border-rose-500/60 shadow-rose-500/10' : 'border-blue-500/30'
                         } ${
                           dependencySourceId && dependencySourceId !== task.id ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-grab active:cursor-grabbing'
                         } ${
                           task.status === 'Completed' ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' :
                           task.status === 'Blocked' ? 'bg-rose-600/30 text-rose-400 border-rose-500/40 animate-pulse' :
                           'bg-blue-600/20 text-blue-400'
                         }`}
                         style={{ left, width }}
                       >
                          {/* Drag Handles */}
                          <motion.div drag="x" dragMomentum={false} onDrag={(e, info) => { e.stopPropagation(); handleTaskResize(task.id, info.delta.x, 'start'); }} onDragEnd={() => handleTaskResize(task.id, 0, 'start', true)} className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l-lg" />
                          <motion.div drag="x" dragMomentum={false} onDrag={(e, info) => { e.stopPropagation(); handleTaskResize(task.id, info.delta.x, 'end'); }} onDragEnd={() => handleTaskResize(task.id, 0, 'end', true)} className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r-lg" />

                          {/* Progress Visualizer */}
                          <div className="absolute inset-0 bg-current opacity-5 pointer-events-none rounded-lg overflow-hidden"><div className="h-full bg-current opacity-20" style={{ width: `${task.progress}%` }} /></div>
                          
                          <span className="text-[9px] font-black uppercase truncate tracking-tight z-10">{task.name}</span>
                          <span className="text-[7px] font-bold opacity-60 z-10 ml-auto">{task.progress}%</span>

                          {/* Direct-Link Handle */}
                          <div 
                            onClick={(e) => { e.stopPropagation(); setDependencySourceId(task.id); }}
                            className={`absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white/20 z-40 transition-all cursor-crosshair ${
                              dependencySourceId === task.id ? 'bg-blue-500 scale-125 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-slate-700 opacity-0 group-hover/bar:opacity-100 hover:bg-blue-400 hover:scale-110'
                            }`}
                            title="Set as Dependency Source"
                          />
                       </motion.div>
                    </div>
                  )
                })}
             </div>
          </div>

          {/* Jira-style Task Detail Side Panel */}
          <AnimatePresence>
             {selectedTaskId && (
               <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} className="absolute right-0 top-0 bottom-0 w-[380px] bg-[#161822] border-l border-white/10 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-50 flex flex-col">
                  {(() => {
                    const task = tasks.find(t => t.id === selectedTaskId)
                    if (!task) return null
                    return (
                      <>
                        <div className="p-6 border-b border-white/5 space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 bg-blue-600/10 text-blue-400 text-[8px] font-black uppercase rounded tracking-widest border border-blue-500/20">Task Detail</span>
                              <div className="flex items-center gap-2">
                                 <button onClick={() => setDependencySourceId(task.id)} className={`p-1.5 rounded transition-all ${dependencySourceId === task.id ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-slate-500'}`} title="Manage Dependencies"><Link2 size={14}/></button>
                                 <button onClick={() => { if(confirm('Permanently remove task?')) { 
                                   const updated = tasks.filter(t => t.id !== task.id).map(t => ({
                                     ...t,
                                     dependencies_json: (t.dependencies_json || []).filter((d: number) => d !== task.id)
                                   })); 
                                   setTasks(updated); 
                                   onUpdate({ ...project, tasks: updated }); 
                                   setSelectedTaskId(null); 
                                 } }} className="p-1.5 rounded hover:bg-rose-600/20 text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={14}/></button>
                                 <button onClick={() => setSelectedTaskId(null)} className="p-1.5 rounded hover:bg-white/10 text-slate-500 transition-all"><X size={14}/></button>
                              </div>
                           </div>
                           <input 
                             value={task.name} 
                             onChange={e => handleTaskUpdate(task.id, { name: e.target.value })}
                             className="w-full bg-transparent text-xl font-black text-white uppercase tracking-tighter outline-none focus:text-blue-400 transition-all"
                           />
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                           <div className="grid grid-cols-2 gap-4">
                              <StyledSelect label="Status" value={task.status} options={['To Do', 'In Progress', 'Blocked', 'Completed', 'Review']} onChange={e => handleTaskUpdate(task.id, { status: e.target.value })} />
                              <div>
                                 <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 block px-1">Progress</label>
                                 <input type="range" value={task.progress} onChange={e => handleTaskUpdate(task.id, { progress: parseInt(e.target.value) })} className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500" />
                                 <div className="flex justify-between mt-1"><span className="text-[8px] font-bold text-slate-700">0%</span><span className="text-[9px] font-black text-blue-500">{task.progress}%</span><span className="text-[8px] font-bold text-slate-700">100%</span></div>
                              </div>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div><label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 block">Start Date</label><input type="date" value={format(new Date(task.start_date), 'yyyy-MM-dd')} onChange={e => handleTaskUpdate(task.id, { start_date: new Date(e.target.value).toISOString() })} className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-blue-500" /></div>
                              <div><label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 block">End Date</label><input type="date" value={format(new Date(task.end_date), 'yyyy-MM-dd')} onChange={e => handleTaskUpdate(task.id, { end_date: new Date(e.target.value).toISOString() })} className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-blue-500" /></div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block">Strategic Description</label>
                              <textarea value={task.description || ''} onChange={e => handleTaskUpdate(task.id, { description: e.target.value })} className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-3 text-[11px] font-medium text-slate-300 outline-none focus:border-blue-500/50 resize-none transition-all" placeholder="DESCRIBE TASK OBJECTIVES AND TECHNICAL CONSTRAINTS..." />
                           </div>
                           <div className="space-y-4 pt-4 border-t border-white/5">
                              <div className="flex items-center justify-between"><h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dependencies</h4><span className="text-[8px] font-bold text-slate-700">{(task.dependencies_json || []).length} Linked</span></div>
                              <div className="space-y-2">
                                 {(task.dependencies_json || []).map((depId: number) => {
                                   const dep = tasks.find(t => t.id === depId)
                                   return (
                                     <div key={depId} className="flex items-center justify-between p-2 bg-white/5 border border-white/5 rounded">
                                        <span className="text-[9px] font-black text-blue-400 uppercase truncate">{dep?.name || 'Unknown Task'}</span>
                                        <button onClick={() => toggleDependency(depId)} className="text-slate-600 hover:text-rose-400"><X size={12}/></button>
                                     </div>
                                   )
                                 })}
                                 {(task.dependencies_json || []).length === 0 && <p className="text-[9px] font-bold text-slate-700 uppercase">No incoming vectors</p>}
                                 <button onClick={() => setDependencySourceId(task.id)} className="w-full py-2 border border-dashed border-white/10 rounded text-[9px] font-black text-slate-600 uppercase hover:text-blue-400 hover:border-blue-500/30 transition-all flex items-center justify-center gap-2 mt-2"><Link2 size={12}/> Bind Dependency Vector</button>
                              </div>
                           </div>
                        </div>
                        <div className="p-6 bg-black/20 border-t border-white/5 mt-auto">
                           <button onClick={() => handleTaskUpdate(task.id, { metadata_json: { ...task.metadata_json, baseline: { start: task.start_date, end: task.end_date } } })} className="w-full py-3 bg-amber-600/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-600/20 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/10"><Camera size={14}/> Snapshot Baseline</button>
                        </div>
                      </>
                    )
                  })()}
               </motion.div>
             )}
          </AnimatePresence>
       </div>
    </div>
  )
}

const LiveScope = ({ project }: { project: any }) => {
  return (
    <div className="h-full flex flex-col p-4 space-y-6 overflow-y-auto custom-scrollbar">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-blue-500/10 rounded flex items-center justify-center border border-blue-500/20">
                <Network size={16} className="text-blue-400" />
             </div>
             <div>
                <h3 className="text-sm font-black uppercase text-white tracking-tighter ">Live Scope Matrix</h3>
                <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Health of in-scope assets</p>
             </div>
          </div>
          <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded border border-white/5">
             <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Healthy</span></div>
             <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">At Risk</span></div>
          </div>
       </div>
       <div className="grid grid-cols-4 gap-3">
          {(project?.target_assets || []).map((assetId: string, i: number) => (
            <div key={i} className="bg-[#1a1b26]/40 border border-white/5 rounded-lg p-3 hover:border-blue-500/30 transition-all group">
               <div className="flex justify-between items-start mb-3">
                  <div><h4 className="text-[11px] font-black text-white uppercase tracking-tight truncate max-w-[100px]">{assetId}</h4><p className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Physical Asset</p></div>
                  <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-emerald-400"><Cpu size={12} /></div>
               </div>
               <div className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-[8px] font-black text-slate-500 uppercase">State</span><span className="text-[9px] font-black text-emerald-400 uppercase">Active</span></div>
                  <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-[95%]" /></div>
                  <div className="flex gap-1.5">
                     <button className="flex-1 py-1 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded text-[8px] font-black uppercase hover:bg-blue-600/20 transition-all">Link</button>
                     <button className="flex-1 py-1 bg-white/5 border border-white/10 text-slate-500 rounded text-[8px] font-black uppercase hover:bg-white/10 transition-all">Det</button>
                  </div>
               </div>
            </div>
          ))}
          {(project?.target_assets || []).length === 0 && (
            <div className="col-span-4 py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl text-slate-700">
               <Binary size={32} className="mb-2 opacity-20" /><p className="text-[9px] font-black uppercase tracking-[0.4em]">No Assets Bound</p>
            </div>
          )}
       </div>
    </div>
  )
}

const DevLog = ({ project, onUpdate }: { project: any, onUpdate: (data: any) => void }) => {
  const [content, setContent] = useState(project.metadata_json?.dev_log || '')
  const [isSaving, setIsSaving] = useState(false)
  const handleSave = () => {
    setIsSaving(true)
    onUpdate({ ...project, metadata_json: { ...project.metadata_json, dev_log: content } })
    setTimeout(() => setIsSaving(false), 500)
    toast.success('Log Synchronized')
  }
  return (
    <div className="h-full flex flex-col p-4 space-y-4">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-amber-500/10 rounded flex items-center justify-center border border-amber-500/20"><ScrollText size={16} className="text-amber-400" /></div>
             <div><h3 className="text-sm font-black uppercase text-white tracking-tighter ">Engineering Log</h3><p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Markdown Production Notebook</p></div>
          </div>
          <button onClick={handleSave} disabled={isSaving} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20">
             {isSaving ? <RefreshCcw size={12} className="animate-spin" /> : <Save size={12} />}Sync Log
          </button>
       </div>
       <div className="flex-1 bg-black/40 rounded-lg border border-white/5 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 bg-white/5"><div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1"><button className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-all"><FileText size={12}/></button><button className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-all"><ImageIcon size={12}/></button><button className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-all"><Terminal size={12}/></button></div><p className="text-[7px] font-bold text-slate-700 uppercase tracking-widest animate-pulse">CTRL+V TO ATTACH</p></div>
          <textarea value={content} onChange={e => setContent(e.target.value)} className="flex-1 bg-transparent p-4 text-[12px] font-medium text-slate-300 outline-none resize-none font-mono placeholder:text-slate-800 leading-relaxed" placeholder="# Today's Progress..."/>
       </div>
    </div>
  )
}

const ExecutiveReportModal = ({ project, onClose }: { project: any, onClose: () => void }) => {
  const tasks = project.tasks || []
  const progress = tasks.length > 0 
    ? Math.round(tasks.reduce((acc: number, t: any) => acc + (t.progress || 0), 0) / tasks.length) 
    : 0
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white text-slate-900 w-[800px] min-h-[1131px] p-12 shadow-2xl relative flex flex-col font-sans">
        <button onClick={onClose} className="absolute -right-16 top-0 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all print:hidden"><X size={24} /></button>
        <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
          <div><div className="flex items-center gap-2 mb-2"><span className="bg-slate-900 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">{project.type} STRATEGY</span><span className="border-2 border-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest">{project.status}</span></div><h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-1">{project.name}</h1><p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">Strategic Infrastructure Evolution Report // {new Date().toLocaleDateString()}</p></div>
          <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Maturity</p><div className="text-4xl font-black leading-none">{progress}%</div></div>
        </div>
        <div className="grid grid-cols-2 gap-12 mb-10"><div className="space-y-4"><h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-slate-200 pb-2 flex items-center gap-2"><AlertTriangle size={14} /> Critical Problem Statement</h3><p className="text-sm text-slate-600 leading-relaxed font-medium ">"{project.problem_statement || 'No problem statement defined.'}"</p></div><div className="space-y-4"><h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-slate-200 pb-2 flex items-center gap-2"><Target size={14} /> Mission Objective</h3><p className="text-sm text-slate-600 leading-relaxed font-medium">{project.objective || 'Objective being refined.'}</p></div></div>
        <div className="mb-10"><h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-slate-200 pb-2 mb-6 flex items-center gap-2"><BarChart3 size={14} /> Quantitative Success Metrics (ROI)</h3><div className="grid grid-cols-4 gap-4"><div className="bg-slate-50 p-6 border border-slate-100 rounded-xl text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-2">Defense Line</p><p className="text-2xl font-black">L{project.roi_defense_line || 0}</p></div><div className="bg-slate-50 p-6 border border-slate-100 rounded-xl text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-2">Man-Hours Saved</p><p className="text-2xl font-black text-blue-600">{project.man_hours_saved || 0}h</p></div><div className="bg-slate-50 p-6 border border-slate-100 rounded-xl text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-2">Stoploss Min.</p><p className="text-2xl font-black text-rose-600">{project.stoploss_minutes_saved || 0}m</p></div><div className="bg-slate-50 p-6 border border-slate-100 rounded-xl text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-2">Wafers Gained</p><p className="text-2xl font-black text-emerald-600">{project.wafers_gained || 0}</p></div></div></div>
        <div className="mb-10 flex-1"><h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-slate-200 pb-2 mb-6 flex items-center gap-2"><Clock size={14} /> Execution Roadmap & Milestones</h3><div className="space-y-4">{tasks.length > 0 ? tasks.slice(0, 10).map((t: any) => (<div key={t.id} className="flex items-center gap-6"><div className="w-24 text-[9px] font-black text-slate-400 uppercase tracking-tighter">{format(new Date(t.start_date), 'MMM yyyy')}</div><div className="relative flex-1 h-8 bg-slate-50 rounded-full border border-slate-100 overflow-hidden"><div className={`absolute inset-y-0 left-0 transition-all ${t.status === 'Completed' ? 'bg-emerald-500' : 'bg-slate-900'}`} style={{ width: `${t.progress}%` }} /><div className="absolute inset-0 flex items-center px-4 justify-between"><span className={`text-[10px] font-black uppercase ${t.progress > 50 ? 'text-white' : 'text-slate-900'}`}>{t.name}</span><span className={`text-[9px] font-bold ${t.progress > 90 ? 'text-white' : 'text-slate-500'}`}>{t.status}</span></div></div></div>)) : (<div className="py-20 text-center text-slate-300 font-black uppercase tracking-[0.5em]">No Roadmap Data Available</div>)}</div></div>
        <div className="border-t border-slate-200 pt-6 mt-auto flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest"><div>Owner: {project.owner} // System Scope: {project.target_systems?.join(', ') || 'N/A'}</div><div>Ref: SYSGRID-PROJ-{project.id} // SECURE DOCUMENT</div></div>
        <button onClick={() => window.print()} className="absolute bottom-8 right-8 p-4 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-110 transition-all print:hidden"><Download size={20} /></button>
      </motion.div>
    </div>
  )
}

const ProjectCommandPalette = ({ isOpen, onClose, onAction }: { isOpen: boolean, onClose: () => void, onAction: (action: string) => void }) => {
  const [search, setSearch] = useState('')
  const actions = [
    { id: 'add_task', label: 'Add Milestone', icon: Plus, shortcut: 'T' },
    { id: 'edit_details', label: 'Edit Core Details', icon: Edit2, shortcut: 'E' },
    { id: 'view_gantt', label: 'View Precision Gantt', icon: Calendar, shortcut: 'G' },
    { id: 'view_scope', label: 'View Live Scope', icon: Network, shortcut: 'S' },
    { id: 'view_risks', label: 'View Risk Registry', icon: ShieldAlert, shortcut: 'K' },
    { id: 'view_matrix', label: 'View Project Matrix', icon: List, shortcut: 'M' },
    { id: 'view_log', label: 'View Engineering Log', icon: ScrollText, shortcut: 'L' },
    { id: 'gen_report', label: 'Generate Executive Report', icon: FileText, shortcut: 'R' },
    { id: 'sync_jira', label: 'Sync Jira Tickets', icon: RefreshCcw, shortcut: 'J' },
    { id: 'copy_update', label: 'Copy Weekly Update', icon: RefreshCcw, shortcut: 'U' }
  ]
  const filtered = actions.filter(a => a.label.toLowerCase().includes(search.toLowerCase()))
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm">
       <motion.div initial={{ scale: 0.95, opacity: 0, y: -20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-[#1a1b26] w-[600px] rounded-xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-3"><Search size={18} className="text-blue-400" /><input autoFocus value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Escape' && onClose()} className="flex-1 bg-transparent text-lg font-bold text-white outline-none placeholder:text-slate-700 uppercase tracking-tighter" placeholder="Execute project command..."/></div>
          <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
             {filtered.map(action => (
               <button key={action.id} onClick={() => { onAction(action.id); onClose(); }} className="w-full text-left p-3 rounded-lg hover:bg-white/5 flex items-center justify-between group transition-all">
                  <div className="flex items-center gap-3"><action.icon size={16} className="text-slate-500 group-hover:text-blue-400" /><span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{action.label}</span></div>
                  <div className="px-2 py-0.5 bg-white/5 rounded border border-white/5 text-[9px] font-black text-slate-600 uppercase">{action.shortcut}</div>
               </button>
             ))}
          </div>
       </motion.div>
    </div>
  )
}

const ProjectActivityStream = ({ project, allProjects = [] }: { project: any, allProjects?: any[] }) => {
  const activities = useMemo(() => {
    if (project) {
      return [...(project.comments || []), ...(project.qa_items || []), ...(project.metadata_json?.history || [])]
        .sort((a: any, b: any) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime())
    } else {
      // Global Stream
      const all = [] as any[]
      allProjects.forEach(p => {
        const stream = [...(p.comments || []), ...(p.qa_items || []), ...(p.metadata_json?.history || [])]
          .map(item => ({ ...item, projectName: p.name }))
        all.push(...stream)
      })
      return all.sort((a: any, b: any) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime())
    }
  }, [project, allProjects])

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
       <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500/10 rounded flex items-center justify-center border border-blue-500/20">
             <History size={16} className="text-blue-400" />
          </div>
          <div>
             <h3 className="text-sm font-black uppercase text-white tracking-tighter ">{project ? 'Strategic Activity Stream' : 'Portfolio Global Activity'}</h3>
             <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Collaborative feed</p>
          </div>
       </div>
       <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
          {activities.map((item: any, i: number) => (
            <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-lg space-y-2 group hover:border-blue-500/30 transition-all">
               <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                     <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-[8px] font-black text-white">{(item.author || item.asked_by || 'U')[0].toUpperCase()}</div>
                     <div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{item.author || item.asked_by || 'System'}</span>
                        {item.projectName && <span className="ml-2 text-[7px] font-black text-blue-500 uppercase tracking-widest">@ {item.projectName}</span>}
                     </div>
                  </div>
                  <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">{format(new Date(item.timestamp || item.created_at), 'MMM d, HH:mm')}</span>
               </div>
               <p className="text-[10px] font-bold text-slate-400 leading-tight">"{item.content || item.question || item.message}"</p>
            </div>
          ))}
          {activities.length === 0 && <div className="py-20 text-center text-slate-700 font-black uppercase tracking-[0.2em] opacity-30">No activity recorded</div>}
       </div>
    </div>
  )
}

export const ProjectForm = ({ initialData, onSave, isSaving, onCancel, systems = [], assets = [] }: any) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    type: 'Strategic', 
    status: 'Planning', 
    priority: 'Medium', 
    owner: '', 
    problem_statement: '', 
    objective: '', 
    description: '',
    start_date: new Date().toISOString(),
    end_date: addDays(new Date(), 90).toISOString(),
    man_hours_saved: 0, 
    stoploss_minutes_saved: 0, 
    wafers_gained: 0, 
    roi_defense_line: 0, 
    target_systems: [],
    target_assets: [],
    jira_links: [],
    ...initialData 
  })

  const [jiraInput, setJiraInput] = useState(formData.jira_links.join(', '))

  const handleJiraChange = (val: string) => {
    setJiraInput(val)
    setFormData({ ...formData, jira_links: val.split(',').map(s => s.trim()).filter(Boolean) })
  }

  const toggleTarget = (field: 'target_systems' | 'target_assets', value: string) => {
    const current = [...(formData[field] || [])]
    const index = current.indexOf(value)
    if (index > -1) {
      current.splice(index, 1)
    } else {
      current.push(value)
    }
    setFormData({ ...formData, [field]: current })
  }

  const [systemSearch, setSystemSearch] = useState('')
  const [assetSearch, setAssetSearch] = useState('')

  const filteredSystems = systems.filter((s: any) => s.name.toLowerCase().includes(systemSearch.toLowerCase()))
  const filteredAssets = assets.filter((a: any) => a.name.toLowerCase().includes(assetSearch.toLowerCase()))

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-12 max-w-5xl mx-auto">
       <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
             <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Project Identifier</label>
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all" placeholder="ENTER PROJECT NAME..."/>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <StyledSelect label="Type" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} options={PROJECT_TYPES} />
                <StyledSelect label="Priority" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} options={PROJECT_PRIORITIES} />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <StyledSelect label="Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={PROJECT_STATUSES} />
                <div>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Lead Owner</label>
                   <input value={formData.owner} onChange={e => setFormData({ ...formData, owner: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500"/>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Start Date</label>
                   <input type="date" value={formData.start_date ? format(new Date(formData.start_date), 'yyyy-MM-dd') : ''} onChange={e => setFormData({ ...formData, start_date: new Date(e.target.value).toISOString() })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500"/>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">End Date (Target)</label>
                   <input type="date" value={formData.end_date ? format(new Date(formData.end_date), 'yyyy-MM-dd') : ''} onChange={e => setFormData({ ...formData, end_date: new Date(e.target.value).toISOString() })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500"/>
                </div>
             </div>
          </div>
          <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/10">
             <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 mb-2"><BarChart3 size={14} /> Strategic Impact Metrics</h4>
             <div className="grid grid-cols-2 gap-4">
                <StyledSelect label="Defense Line" value={formData.roi_defense_line} onChange={e => setFormData({...formData, roi_defense_line: parseInt(e.target.value)})} options={DEFENSE_LINES} />
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Man-Hours Saved</label><input type="number" value={formData.man_hours_saved} onChange={e => setFormData({...formData, man_hours_saved: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" /></div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Stoploss Min.</label><input type="number" value={formData.stoploss_minutes_saved} onChange={e => setFormData({...formData, stoploss_minutes_saved: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" /></div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Wafers Gained</label><input type="number" value={formData.wafers_gained} onChange={e => setFormData({...formData, wafers_gained: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" /></div>
             </div>
             <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Jira References (Comma separated)</label>
                <input value={jiraInput} onChange={e => handleJiraChange(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" placeholder="e.g. PROJ-123, PROJ-456"/>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
             <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Problem Statement</label><textarea value={formData.problem_statement} onChange={e => setFormData({ ...formData, problem_statement: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white h-24 resize-none outline-none focus:border-blue-500 transition-all" placeholder="DESCRIBE CRITICAL PAIN POINTS..."/></div>
             <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Mission Objective</label><textarea value={formData.objective} onChange={e => setFormData({ ...formData, objective: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white h-24 resize-none outline-none focus:border-blue-500 transition-all" placeholder="DESCRIBE DESIRED STRATEGIC OUTCOME..."/></div>
          </div>
          <div className="space-y-4">
             <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Layers size={14} /> Scope Binding</h4>
             <div className="space-y-4">
                <div>
                   <div className="flex justify-between items-center mb-2">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Target Systems</label>
                      <input 
                        value={systemSearch}
                        onChange={e => setSystemSearch(e.target.value)}
                        placeholder="SEARCH..."
                        className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[8px] font-bold text-white outline-none focus:border-blue-500 w-24"
                      />
                   </div>
                   <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-black/20 rounded-lg border border-white/5">
                      {filteredSystems.map((s: any) => (
                        <button key={s.id} onClick={() => toggleTarget('target_systems', s.name)} className={`px-2 py-1 text-[9px] font-black uppercase rounded transition-all border ${formData.target_systems?.includes(s.name) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'}`}>
                           {s.name}
                        </button>
                      ))}
                      {filteredSystems.length === 0 && <span className="text-[9px] font-bold text-slate-700 ">No matches</span>}
                   </div>
                </div>
                <div>
                   <div className="flex justify-between items-center mb-2">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Target Assets</label>
                      <input 
                        value={assetSearch}
                        onChange={e => setAssetSearch(e.target.value)}
                        placeholder="SEARCH..."
                        className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[8px] font-bold text-white outline-none focus:border-emerald-500 w-24"
                      />
                   </div>
                   <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-black/20 rounded-lg border border-white/5">
                      {filteredAssets.map((a: any) => (
                        <button key={a.id} onClick={() => toggleTarget('target_assets', a.name)} className={`px-2 py-1 text-[9px] font-black uppercase rounded transition-all border ${formData.target_assets?.includes(a.name) ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'}`}>
                           {a.name}
                        </button>
                      ))}
                      {filteredAssets.length === 0 && <span className="text-[9px] font-bold text-slate-700 ">No matches</span>}
                   </div>
                </div>
             </div>
          </div>
       </div>

       <div className="flex gap-4">
          <button onClick={onCancel} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-500 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all">Abort Changes</button>
          <button disabled={isSaving || !formData.name} onClick={() => onSave(formData)} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/30 transition-all active:scale-95">
             {isSaving ? 'Synchronizing Strategic Matrix...' : 'Commit Strategic Vector'}
          </button>
       </div>
    </div>
  )
}

const ProjectRisks = ({ project, onUpdate }: { project: any, onUpdate: (data: any) => void }) => {
  const risks = project.metadata_json?.risks || []
  const [isAdding, setIsAdding] = useState(false)
  const [newRisk, setNewRisk] = useState({ description: '', impact: 'Medium', likelihood: 'Medium', mitigation: '' })

  const addRisk = () => {
    const updatedRisks = [...risks, { ...newRisk, id: Date.now() }]
    onUpdate({ ...project, metadata_json: { ...project.metadata_json, risks: updatedRisks } })
    setIsAdding(false)
    setNewRisk({ description: '', impact: 'Medium', likelihood: 'Medium', mitigation: '' })
  }

  const removeRisk = (id: number) => {
    const updatedRisks = risks.filter((r: any) => r.id !== id)
    onUpdate({ ...project, metadata_json: { ...project.metadata_json, risks: updatedRisks } })
  }

  return (
    <div className="h-full flex flex-col p-8 space-y-6 overflow-y-auto custom-scrollbar">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20">
                <ShieldAlert size={20} className="text-rose-400" />
             </div>
             <div>
                <h3 className="text-xl font-black uppercase text-white tracking-tighter ">Risk & Mitigation Registry</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Strategic bottleneck identification</p>
             </div>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-rose-600/20"
          >
             <Plus size={14} /> Flag New Risk
          </button>
       </div>

       {isAdding && (
         <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 p-6 rounded-xl space-y-6">
            <div className="grid grid-cols-2 gap-6">
               <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Risk Description</label>
                  <input 
                    value={newRisk.description}
                    onChange={e => setNewRisk({ ...newRisk, description: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-rose-500"
                    placeholder="e.g. Lead times on SFP+ modules..."
                  />
               </div>
               <StyledSelect 
                 label="Impact" 
                 value={newRisk.impact} 
                 onChange={e => setNewRisk({ ...newRisk, impact: e.target.value })} 
                 options={[{ value: 'Low', label: 'LOW' }, { value: 'Medium', label: 'MEDIUM' }, { value: 'High', label: 'HIGH' }, { value: 'Critical', label: 'CRITICAL' }]} 
               />
               <StyledSelect 
                 label="Likelihood" 
                 value={newRisk.likelihood} 
                 onChange={e => setNewRisk({ ...newRisk, likelihood: e.target.value })} 
                 options={[{ value: 'Low', label: 'LOW' }, { value: 'Medium', label: 'MEDIUM' }, { value: 'High', label: 'HIGH' }, { value: 'Certain', label: 'CERTAIN' }]} 
               />
               <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Mitigation Strategy</label>
                  <textarea 
                    value={newRisk.mitigation}
                    onChange={e => setNewRisk({ ...newRisk, mitigation: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-rose-500 h-20 resize-none"
                    placeholder="Describe fallback vector..."
                  />
               </div>
            </div>
            <div className="flex gap-4">
               <button onClick={() => setIsAdding(false)} className="flex-1 py-2 bg-white/5 text-slate-500 text-[9px] font-black uppercase rounded-lg">Abort</button>
               <button onClick={addRisk} className="flex-1 py-2 bg-rose-600 text-white text-[9px] font-black uppercase rounded-lg">Commit Risk</button>
            </div>
         </motion.div>
       )}

       <div className="grid grid-cols-1 gap-4">
          {risks.map((risk: any) => (
            <div key={risk.id} className="bg-white/5 border border-white/5 p-6 rounded-xl group hover:border-rose-500/30 transition-all">
               <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                     <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                       risk.impact === 'Critical' ? 'bg-rose-600 text-white' : 
                       risk.impact === 'High' ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 
                       'bg-white/5 text-slate-400 border border-white/10'
                     }`}>Impact: {risk.impact}</div>
                     <div className="text-[11px] font-black text-white uppercase tracking-tight">{risk.description}</div>
                  </div>
                  <button onClick={() => removeRisk(risk.id)} className="p-1.5 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
               </div>
               <div className="pl-6 border-l border-rose-500/20 space-y-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mitigation Vector</p>
                  <p className="text-[10px] font-bold text-slate-400 ">"{risk.mitigation || 'No strategy defined.'}"</p>
               </div>
            </div>
          ))}
          {risks.length === 0 && !isAdding && (
            <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-slate-700">
               <ShieldCheck size={48} className="mb-4 opacity-20" />
               <p className="text-[11px] font-black uppercase tracking-[0.5em]">No Strategic Risks Flagged</p>
            </div>
          )}
       </div>
    </div>
  )
}

const ProjectMatrix = ({ projects, onSelect, onEdit, onBulkUpdate }: { projects: any[], onSelect: (id: number) => void, onEdit: (p: any) => void, onBulkUpdate: (ids: number[], data: any) => void }) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const columnDefs = useMemo(() => [
    { 
      field: 'name', 
      headerName: 'IDENTIFIER', 
      flex: 2, 
      checkboxSelection: true,
      headerCheckboxSelection: true,
      cellClass: 'font-bold text-white uppercase tracking-tight',
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full">
           <div className={`w-2 h-2 rounded-full ${
             params.data?.status === 'Completed' ? 'bg-emerald-500' :
             params.data?.status === 'Blocked' ? 'bg-rose-500' :
             params.data?.status === 'In Progress' ? 'bg-blue-500' : 'bg-slate-700'
           }`} />
           {params.value}
        </div>
      )
    },
    { 
      field: 'type', 
      headerName: 'VECTOR', 
      width: 120, 
      cellClass: 'font-bold text-slate-500 text-[9px] uppercase tracking-widest' 
    },
    { 
      field: 'status', 
      headerName: 'STATE', 
      width: 140,
      cellRenderer: (params: any) => (
        <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase text-center mt-2 ${
          params.value === 'Completed' ? 'bg-emerald-600/20 text-emerald-400' :
          params.value === 'Blocked' ? 'bg-rose-600/20 text-rose-400 animate-pulse' :
          params.value === 'In Progress' ? 'bg-blue-600/20 text-blue-400' : 'bg-white/5 text-slate-500'
        }`}>
           {params.value}
        </div>
      )
    },
    { 
      field: 'priority', 
      headerName: 'PRIORITY', 
      width: 100,
      cellRenderer: (params: any) => (
        <span className={`text-[9px] font-bold ${
          params.value === 'Highest' ? 'text-rose-500' :
          params.value === 'High' ? 'text-amber-500' :
          params.value === 'Medium' ? 'text-blue-500' : 'text-slate-600'
        }`}>{(params.value || '').toUpperCase()}</span>
      )
    },
    { 
      field: 'owner', 
      headerName: 'LEAD', 
      width: 150,
      cellClass: 'font-bold text-slate-400 uppercase tracking-tighter'
    },
    { 
      field: 'roi_defense_line', 
      headerName: 'LINE', 
      width: 70, 
      cellClass: 'text-center font-bold text-blue-400',
      valueFormatter: (p: any) => `L${p.value ?? 0}`
    },
    { 
      field: 'created_at', 
      headerName: 'ADDED', 
      width: 100, 
      cellClass: 'font-bold text-slate-500 text-[9px] uppercase',
      valueFormatter: (p: any) => p.value ? format(new Date(p.value), 'MMM d, yyyy') : 'N/A'
    },
    { 
      field: 'completed_at', 
      headerName: 'COMPLETED', 
      width: 110, 
      cellClass: 'font-bold text-emerald-500 text-[9px] uppercase',
      valueFormatter: (p: any) => p.value ? format(new Date(p.value), 'MMM d, yyyy') : 'N/A'
    },
    {
      headerName: 'ACTIONS',
      width: 100,
      pinned: 'right',
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full">
           <button onClick={() => params.data?.id && onSelect(params.data.id)} className="p-1.5 hover:bg-blue-600/20 text-blue-400 rounded-md transition-all"><LayoutGrid size={14}/></button>
           <button onClick={() => params.data && onEdit(params.data)} className="p-1.5 hover:bg-emerald-600/20 text-emerald-400 rounded-md transition-all"><Edit2 size={14}/></button>
        </div>
      )
    }
  ], [onSelect, onEdit])

  return (
    <div className="h-full w-full flex flex-col bg-[#0a0c14] border-t border-white/5">
       <div className="h-12 border-b border-white/5 flex items-center px-6 justify-between bg-black/40">
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedIds.length} STREAMS SELECTED</span>
             {selectedIds.length > 0 && (
               <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                  <select 
                    onChange={e => onBulkUpdate(selectedIds, { status: e.target.value })}
                    className="bg-blue-600/10 border border-blue-500/20 rounded-lg px-3 py-1 text-[9px] font-black text-blue-400 outline-none uppercase tracking-widest"
                  >
                     <option value="">MASS UPDATE STATUS</option>
                     {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <select 
                    onChange={e => onBulkUpdate(selectedIds, { priority: e.target.value })}
                    className="bg-amber-600/10 border border-amber-500/20 rounded-lg px-3 py-1 text-[9px] font-black text-amber-400 outline-none uppercase tracking-widest"
                  >
                     <option value="">MASS UPDATE PRIORITY</option>
                     {PROJECT_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
               </div>
             )}
          </div>
          <div className="flex items-center gap-2 text-[9px] font-bold text-slate-600 uppercase">Double-click row to teleport to workbench</div>
       </div>
       <div className="flex-1 ag-theme-alpine-dark">
          <AgGridReact
            rowData={projects}
            columnDefs={columnDefs as any}
            rowSelection="multiple"
            suppressRowClickSelection={true}
            onSelectionChanged={(params: any) => {
              const selectedNodes = params.api.getSelectedNodes()
              setSelectedIds(selectedNodes.map((node: any) => node.data?.id).filter(Boolean))
            }}            defaultColDef={{
              sortable: true,
              filter: true,
              resizable: true,
            }}
            headerHeight={40}
            rowHeight={48}
            className="w-full h-full"
            onRowDoubleClicked={(p) => p.data?.id && onSelect(p.data.id)}
          />
       </div>
    </div>
  )
}

export default function Projects() {
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'WORKSPACE' | 'GANTT' | 'SCOPE' | 'RISKS' | 'MATRIX' | 'LOG' | 'ACTIVITY'>('WORKSPACE')
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Layout State
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: async () => (await (await apiFetch('/api/v1/projects')).json()) })
  const { data: systems } = useQuery({ queryKey: ['systems'], queryFn: async () => (await (await apiFetch('/api/v1/sites')).json()) })
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await (await apiFetch('/api/v1/devices')).json()) })

  const selectedProject = useMemo(() => projects?.find((p: any) => p.id === selectedProjectId), [projects, selectedProjectId])
  
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/projects/${data.id}` : '/api/v1/projects'
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setActiveModal(null)
      setIsEditing(false)
      toast.success('Matrix Synchronized') 
    },
    onError: (e: any) => toast.error(e.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setSelectedProjectId(projects?.[0]?.id || null)
      setActiveModal(null)
      toast.success('Project Decommissioned')
    },
    onError: (e: any) => toast.error(e.message)
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, data }: { ids: number[], data: any }) => {
      const promises = ids.map(id => apiFetch(`/api/v1/projects/${id}`, { method: 'PUT', body: JSON.stringify({ ...projects.find((p:any) => p.id === id), ...data }) }))
      return Promise.all(promises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Bulk Synchronization Successful')
    },
    onError: (e: any) => toast.error(e.message)
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsCommandPaletteOpen(true); } }
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const portfolioMetrics = useMemo(() => {
    if (!projects) return null
    return {
      totalHours: projects.reduce((acc: number, p: any) => acc + (p.man_hours_saved || 0), 0),
      totalWafers: projects.reduce((acc: number, p: any) => acc + (p.wafers_gained || 0), 0),
      activeStreams: projects.filter((p: any) => p.status === 'In Progress').length,
      blockedStreams: projects.filter((p: any) => p.status === 'Blocked').length,
      totalStoploss: projects.reduce((acc: number, p: any) => acc + (p.stoploss_minutes_saved || 0), 0)
    }
  }, [projects])

  const resourceHeatmap = useMemo(() => {
    if (!projects) return []
    const loads: Record<string, number> = {}
    projects.forEach((p: any) => {
      const owners = (p.owner || 'UNASSIGNED').split(',').map((o: string) => o.trim())
      owners.forEach(o => {
        loads[o] = (loads[o] || 0) + 1
      })
    })
    return Object.entries(loads).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [projects])

  const handleCommand = (cmd: string) => {
    switch(cmd) {
      case 'add_task': setActiveTab('GANTT'); break; 
      case 'edit_details': setIsEditing(true); break; 
      case 'view_gantt': setActiveTab('GANTT'); break; 
      case 'view_scope': setActiveTab('SCOPE'); break; 
      case 'view_risks': setActiveTab('RISKS'); break;
      case 'view_matrix': setActiveTab('MATRIX'); break;
      case 'view_log': setActiveTab('LOG'); break; 
      case 'gen_report': setActiveModal({ type: 'REPORT', project: selectedProject }); break;
      case 'sync_jira':
        if (!selectedProject) break
        toast.promise(
          new Promise((resolve) => setTimeout(resolve, 1500)),
          {
            loading: 'Establishing Jira Secure Link...',
            success: 'Strategic Synchronization Complete. 3 Tasks Updated.',
            error: 'Jira Link Failure'
          }
        )
        // Mock update 3 tasks to 'Completed' if they exist
        const updatedTasks = (selectedProject.tasks || []).map((t: any, i: number) => 
          i < 3 ? { ...t, status: 'Completed', progress: 100 } : t
        )
        mutation.mutate({ ...selectedProject, tasks: updatedTasks })
        break
      case 'copy_update': 
        if (!selectedProject) break
        const tasks = selectedProject.tasks || []
        const completed = tasks.filter((t:any) => t.status === 'Completed').map((t:any) => t.name)
        const inProgress = tasks.filter((t:any) => t.status !== 'Completed' && t.status !== 'Blocked').map((t:any) => t.name)
        const blocked = tasks.filter((t:any) => t.status === 'Blocked').map((t:any) => t.name)
        const risks = selectedProject.metadata_json?.risks || []
        
        const updateText = [
          `**STRATEGIC UPDATE: ${selectedProject.name.toUpperCase()}**`,
          `Status: ${selectedProject.status} // Progress: ${selectedProject.tasks?.length ? Math.round((completed.length / selectedProject.tasks.length) * 100) : 0}%`,
          `\n✅ COMPLETED:\n${completed.map(t => `• ${t}`).join('\n') || 'None'}`,
          `\n🚀 IN FLIGHT:\n${inProgress.map(t => `• ${t}`).join('\n') || 'None'}`,
          blocked.length ? `\n🛑 BLOCKED:\n${blocked.map(t => `• ${t}`).join('\n')}` : '',
          risks.length ? `\n⚠️ ACTIVE RISKS:\n${risks.map((r:any) => `• ${r.description} (${r.impact} Impact)`).join('\n')}` : '',
          `\n📈 IMPACT: +${selectedProject.man_hours_saved || 0}H saved // ${selectedProject.wafers_gained || 0} wafers gained`
        ].filter(Boolean).join('\n')

        navigator.clipboard.writeText(updateText)
        toast.success('COMPREHENSIVE UPDATE COPIED')
        break
    }
  }

  useEffect(() => { if (projects?.length > 0 && !selectedProjectId) setSelectedProjectId(projects[0].id) }, [projects, selectedProjectId])

  return (
    <div className="h-full flex flex-col bg-[#0a0c14] overflow-hidden">
       <ProjectHUD project={selectedProject} />
       <div className="flex-1 flex overflow-hidden">
          <ProjectRail 
            projects={projects || []} 
            selectedId={selectedProjectId} 
            onSelect={setSelectedProjectId} 
            onNew={() => { setSelectedProjectId(null); setIsEditing(true); }}
            onDelete={(id) => setActiveModal({ type: 'DELETE_CONFIRM', id })}
            width={sidebarWidth}
            onResize={setSidebarWidth}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
          <div className="flex-1 flex flex-col min-w-0 bg-[#0d0f17]">
             <div className="h-12 border-b border-white/5 flex items-center px-6 gap-6 shrink-0 bg-[#0a0c14]">
                {[
                  { id: 'WORKSPACE', icon: LayoutGrid, label: 'Workbench' }, 
                  { id: 'GANTT', icon: Calendar, label: 'Precision Gantt' }, 
                  { id: 'SCOPE', icon: Network, label: 'Live Scope' }, 
                  { id: 'RISKS', icon: ShieldAlert, label: 'Risk Registry' },
                  { id: 'MATRIX', icon: List, label: 'Matrix' },
                  { id: 'LOG', icon: ScrollText, label: 'Dev Log' }, 
                  { id: 'ACTIVITY', icon: History, label: 'Stream' }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`h-full px-2 flex items-center gap-2 border-b-2 transition-all group ${activeTab === tab.id ? 'border-blue-600 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                     <tab.icon size={14} className={activeTab === tab.id ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'} /><span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                  </button>
                ))}
             </div>
             <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                   {activeTab === 'WORKSPACE' && (
                     <motion.div key="workspace" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full p-4 overflow-y-auto custom-scrollbar">
                        {isEditing ? (
                          <ProjectForm 
                            initialData={selectedProject} 
                            onSave={mutation.mutate} 
                            onCancel={() => setIsEditing(false)} 
                            isSaving={mutation.isPending}
                            systems={systems || []}
                            assets={devices || []}
                          />
                        ) : (
                          <div className="max-w-full mx-auto space-y-6">
                             {/* Portfolio Header */}
                             <div className="grid grid-cols-5 gap-3">
                                <div className="bg-blue-600/10 border border-blue-500/20 p-3 rounded-lg">
                                   <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Portfolio Hours</p>
                                   <p className="text-xl font-black text-white">+{portfolioMetrics?.totalHours}H</p>
                                </div>
                                <div className="bg-emerald-600/10 border border-emerald-500/20 p-3 rounded-lg">
                                   <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">Total Wafers</p>
                                   <p className="text-xl font-black text-white">{portfolioMetrics?.totalWafers}</p>
                                </div>
                                <div className="bg-rose-600/10 border border-rose-500/20 p-3 rounded-lg">
                                   <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Stoploss Min.</p>
                                   <p className="text-xl font-black text-white">{portfolioMetrics?.totalStoploss}M</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-3 rounded-lg">
                                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">In Flight</p>
                                   <p className="text-xl font-black text-white">{portfolioMetrics?.activeStreams}</p>
                                </div>
                                <div className={`p-3 rounded-lg border ${portfolioMetrics?.blockedStreams ? 'bg-rose-600 border-rose-500 animate-pulse' : 'bg-white/5 border-white/10'}`}>
                                   <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${portfolioMetrics?.blockedStreams ? 'text-white' : 'text-slate-500'}`}>Blocked</p>
                                   <p className="text-xl font-black text-white">{portfolioMetrics?.blockedStreams}</p>
                                </div>
                             </div>

                             {/* Resource Heatmap */}
                             <section className="space-y-2">
                                <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Users size={12} /> Resource Allocation</h4>
                                <div className="grid grid-cols-5 gap-2">
                                   {resourceHeatmap.map(([name, count]) => (
                                     <div key={name} className="bg-white/5 border border-white/10 p-2 rounded flex items-center justify-between group hover:border-blue-500/30 transition-all">
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                           <div className="w-5 h-5 rounded bg-blue-600/20 flex items-center justify-center text-[8px] font-black text-blue-400 shrink-0">{name[0]}</div>
                                           <span className="text-[9px] font-bold text-slate-300 uppercase truncate">{name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                           <div className="h-1 w-8 bg-white/5 rounded-full overflow-hidden">
                                              <div className={`h-full ${count > 3 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(count * 25, 100)}%` }} />
                                           </div>
                                           <span className="text-[9px] font-black text-white">{count}</span>
                                        </div>
                                     </div>
                                   ))}
                                </div>
                             </section>

                             <div className="grid grid-cols-2 gap-6">
                                <section className="space-y-2">
                                   <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Clipboard size={12} /> Problem Statement</h4>
                                   <div className="bg-white/5 p-4 rounded-lg border border-white/10 min-h-[80px] relative group">
                                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setIsEditing(true)} className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-blue-400 transition-all"><Edit2 size={12}/></button></div>
                                      <p className="text-[10px] font-bold text-slate-400 leading-snug ">"{selectedProject?.problem_statement || 'No problem statement defined.'}"</p>
                                   </div>
                                </section>
                                <section className="space-y-2">
                                   <h4 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2"><Target size={12} /> Mission Objective</h4>
                                   <div className="bg-white/5 p-4 rounded-lg border border-white/10 min-h-[80px] relative group">
                                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setIsEditing(true)} className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-emerald-400 transition-all"><Edit2 size={12}/></button></div>
                                      <p className="text-[10px] font-bold text-slate-400 leading-snug">{selectedProject?.objective || 'No objective defined.'}</p>
                                   </div>
                                </section>
                                {(selectedProject?.metadata_json?.risks || []).length > 0 && (
                                   <section className="space-y-2">
                                      <h4 className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2"><ShieldAlert size={12} /> Risks</h4>
                                      <div className="grid grid-cols-2 gap-2">
                                         {selectedProject.metadata_json.risks.slice(0, 4).map((r:any) => (
                                           <div key={r.id} className="flex items-center justify-between p-2 bg-rose-600/10 border border-rose-500/20 rounded">
                                              <span className="text-[9px] font-black text-rose-400 uppercase truncate mr-2">{r.description}</span>
                                              <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${r.impact === 'Critical' ? 'bg-rose-600 text-white' : 'bg-rose-600/20 text-rose-400'}`}>{r.impact}</span>
                                           </div>
                                         ))}
                                      </div>
                                   </section>
                                )}
                                <section className="space-y-2">
                                   <h4 className="text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2"><Layers size={12} /> Infrastructure</h4>
                                   <div className="grid grid-cols-2 gap-2">
                                      <div className="p-2 bg-white/5 rounded border border-white/10 space-y-1">
                                         <p className="text-[7px] font-black text-slate-600 uppercase">Systems</p>
                                         <div className="flex flex-wrap gap-1">
                                            {(selectedProject?.target_systems || []).map((s: string, i: number) => (<span key={i} className="px-1.5 py-0.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase rounded">{s}</span>))}
                                         </div>
                                      </div>
                                      <div className="p-2 bg-white/5 rounded border border-white/10 space-y-1">
                                         <p className="text-[7px] font-black text-slate-600 uppercase">Assets</p>
                                         <div className="flex flex-wrap gap-1">
                                            {(selectedProject?.target_assets || []).map((s: string, i: number) => (<span key={i} className="px-1.5 py-0.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase rounded">{s}</span>))}
                                         </div>
                                      </div>
                                   </div>
                                </section>
                             </div>
                          </div>
                        )}
                     </motion.div>
                   )}
                   {activeTab === 'LOG' && <motion.div key="log" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full"><DevLog project={selectedProject} onUpdate={mutation.mutate} /></motion.div>}
                   {activeTab === 'GANTT' && <motion.div key="gantt" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="h-full"><PrecisionGantt project={selectedProject} onUpdate={mutation.mutate} /></motion.div>}
                   {activeTab === 'SCOPE' && <motion.div key="scope" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full"><LiveScope project={selectedProject} /></motion.div>}
                   {activeTab === 'RISKS' && <motion.div key="risks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full"><ProjectRisks project={selectedProject} onUpdate={mutation.mutate} /></motion.div>}
                   {activeTab === 'MATRIX' && <motion.div key="matrix" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="h-full"><ProjectMatrix projects={projects || []} onSelect={(id) => { setSelectedProjectId(id); setActiveTab('WORKSPACE'); }} onEdit={(p) => { setSelectedProjectId(p.id); setIsEditing(true); setActiveTab('WORKSPACE'); }} onBulkUpdate={(ids, data) => bulkUpdateMutation.mutate({ ids, data })} /></motion.div>}
                   {activeTab === 'ACTIVITY' && <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full"><ProjectActivityStream project={selectedProject} allProjects={projects || []} /></motion.div>}
                </AnimatePresence>
             </div>
          </div>
          <ProjectLedger project={selectedProject} />
       </div>
       <AnimatePresence>
         {isCommandPaletteOpen && <ProjectCommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} onAction={handleCommand} />}
         {activeModal?.type === 'REPORT' && <ExecutiveReportModal project={activeModal.project} onClose={() => setActiveModal(null)} />}
         {activeModal?.type === 'DELETE_CONFIRM' && (
           <ConfirmationModal 
             isOpen={true} 
             title="Decommission Strategic Stream" 
             message="Are you certain you want to remove this project? This action will permanently delete all associated milestones, risks, and ROI data." 
             onConfirm={() => deleteMutation.mutate(activeModal.id)} 
             onClose={() => setActiveModal(null)} 
             variant="danger"
           />
         )}
       </AnimatePresence>
       <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }`}</style>
    </div>
  )
}
