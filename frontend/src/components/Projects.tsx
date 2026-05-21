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
  Maximize2, Minimize2, PanelLeft, PanelRight, MousePointer2, GitBranch, Binary, Cpu, Network, Activity as ActivityIcon, ScrollText, GripVertical
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
  const [zoomLevel, setZoomLevel] = useState(60) // Increased default zoom for better resolution
  const timelineRef = useRef<HTMLDivElement>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set())
  const [dependencySourceId, setDependencySourceId] = useState<number | null>(null)
  const [showBaseline, setShowBaseline] = useState(false)
  const [showExecutiveChart, setShowExecutiveChart] = useState(false)

  const ROW_HEIGHT = 32 // Smaller row height
  const HEADER_HEIGHT = 44

  useEffect(() => {
    if (JSON.stringify(project.tasks) !== JSON.stringify(tasks)) {
      setTasks(project.tasks || [])
    }
  }, [project.tasks])

  const handleSelectTask = (id: number, isShift: boolean) => {
    if (isShift) {
      const next = new Set(selectedTaskIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setSelectedTaskIds(next)
    } else {
      setSelectedTaskIds(new Set([id]))
      setSelectedTaskId(id)
    }
  }

  const handleTaskMove = (id: number, delta: number, isFinal = false) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const currentPos = getPosFromDate(task.start_date)
    const newPos = currentPos + delta
    const snappedPos = Math.round(newPos / zoomLevel) * zoomLevel
    
    const daysMoved = Math.round((snappedPos - currentPos) / zoomLevel)
    if (daysMoved === 0 && !isFinal) return

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
    if (isFinal) onUpdate({ ...project, tasks: updatedTasks })
  }

  const startDate = useMemo(() => {
    if (tasks.length === 0) return startOfMonth(new Date())
    const times = tasks.map(t => new Date(t.start_date).getTime()).filter(t => !isNaN(t))
    const min = times.length > 0 ? Math.min(...times) : new Date().getTime()
    return startOfMonth(addDays(new Date(min), -14))
  }, [tasks])

  const endDate = useMemo(() => {
    if (tasks.length === 0) return endOfMonth(addDays(new Date(), 90))
    const times = tasks.map(t => new Date(t.end_date).getTime()).filter(t => !isNaN(t))
    const max = times.length > 0 ? Math.max(...times) : addDays(new Date(), 90).getTime()
    return endOfMonth(addDays(new Date(max), 45))
  }, [tasks])

  const days = useMemo(() => {
    try { return eachDayOfInterval({ start: startDate, end: endDate }).slice(0, 2000) }
    catch (e) { return [new Date()] }
  }, [startDate, endDate])

  const getPosFromDate = (date: string | Date) => {
    const d = new Date(date)
    if (isNaN(d.getTime())) return 0
    return Math.floor(differenceInDays(d, startDate) * zoomLevel)
  }

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
    
    const daysMoved = Math.round((snappedPos - currentPos) / zoomLevel)
    if (daysMoved === 0 && !isFinal) return

    let updatedTask = { ...task }
    if (type === 'start') {
      const newStart = addDays(new Date(task.start_date), daysMoved)
      if (newStart < new Date(task.end_date)) updatedTask.start_date = newStart.toISOString()
    } else {
      const newEnd = addDays(new Date(task.end_date), daysMoved)
      if (newEnd > new Date(task.start_date)) updatedTask.end_date = newEnd.toISOString()
    }

    const updatedTasks = tasks.map(t => t.id === id ? updatedTask : t)
    setTasks(updatedTasks)
    if (isFinal) onUpdate({ ...project, tasks: updatedTasks })
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

  return (
    <div className="h-full flex flex-col bg-[#0b0c14] overflow-hidden">
       {/* Toolbar */}
       <div className="h-11 border-b border-white/10 flex items-center px-6 justify-between bg-[#0a0c14] z-40">
          <div className="flex items-center gap-6">
             <button 
               onClick={() => setShowExecutiveChart(!showExecutiveChart)}
               className={`p-1.5 rounded-lg transition-all border ${showExecutiveChart ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}
             >
                <BarChart3 size={16}/>
             </button>
             <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <button onClick={() => setZoomLevel(Math.max(20, zoomLevel - 10))} className="text-slate-500 hover:text-white transition-all p-0.5"><Minimize2 size={14}/></button>
                <div className="w-px h-3 bg-white/10 mx-1" />
                <button onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))} className="text-slate-500 hover:text-white transition-all p-0.5"><Maximize2 size={14}/></button>
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] ml-2">{zoomLevel}PX/D</span>
             </div>
             {dependencySourceId && (
               <div className="flex items-center gap-3 px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg animate-pulse">
                  <Link2 size={14} className="text-blue-400" />
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Binding Dependency Vector...</span>
                  <button onClick={() => setDependencySourceId(null)} className="ml-2 text-slate-500 hover:text-white transition-colors"><X size={12}/></button>
               </div>
             )}
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setShowBaseline(!showBaseline)} className={`px-4 py-1.5 border rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${showBaseline ? 'bg-amber-600/20 border-amber-500/40 text-amber-400' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}>{showBaseline ? 'Hide Baseline' : 'Show Baseline'}</button>
             <button 
               onClick={() => {
                 const name = prompt('NEW MILESTONE IDENTIFIER')
                 if (!name) return
                 const newTask = { id: Date.now(), name: name.toUpperCase(), start_date: new Date().toISOString(), end_date: addDays(new Date(), 7).toISOString(), progress: 0, status: 'To Do', dependencies_json: [], metadata_json: {} }
                 const updated = [...tasks, newTask]
                 setTasks(updated)
                 onUpdate({ ...project, tasks: updated })
               }}
               className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
             ><Plus size={14}/> Add Milestone</button>
          </div>
       </div>

       <div className="flex-1 flex overflow-hidden relative">
          {/* Engineering Vector Stack */}
          <div className="w-[240px] flex-none flex flex-col border-r border-white/10 bg-[#0d0f17] z-30 shadow-2xl">
             <div className="h-11 border-b border-white/10 flex items-center px-5 shrink-0 bg-[#0a0c14]/80">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Vector Stack</span>
             </div>
             <Reorder.Group axis="y" values={tasks} onReorder={(newOrder) => { setTasks(newOrder); onUpdate({ ...project, tasks: newOrder }); }} className="flex-1 overflow-y-auto no-scrollbar">
                {tasks.map((task) => (
                  <Reorder.Item 
                    key={task.id} 
                    value={task}
                    onClick={(e) => handleSelectTask(task.id, e.shiftKey)}
                    className={`h-[32px] flex items-center px-4 border-b border-white/5 cursor-grab active:cursor-grabbing transition-all group ${selectedTaskIds.has(task.id) ? 'bg-blue-600/15' : 'hover:bg-white/5'}`}
                  >
                     <div className={`w-1.5 h-1.5 rounded-full mr-3 shrink-0 ${
                       task.status === 'Completed' ? 'bg-emerald-500' : 
                       task.status === 'Blocked' ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'
                     }`} />
                     <p className={`text-[10px] font-black uppercase truncate tracking-tight transition-all flex-1 ${selectedTaskIds.has(task.id) ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{task.name}</p>
                     <GripVertical size={12} className="text-slate-800 group-hover:text-slate-600 ml-2" />
                  </Reorder.Item>
                ))}
             </Reorder.Group>
          </div>

          {/* Timeline View */}
          <div ref={timelineRef} className="flex-1 overflow-auto custom-scrollbar relative bg-[#0b0c14]">
             <div className="sticky top-0 z-30 flex bg-[#0a0c14]/95 backdrop-blur-md border-b border-white/10" style={{ width: days.length * zoomLevel }}>
                {days.map((day, i) => {
                  const isFirstOfMonth = format(day, 'd') === '1'
                  const isToday = isSameDay(day, new Date())
                  return (
                    <div key={i} className={`shrink-0 border-r border-white/5 flex flex-col items-center justify-center h-11 transition-colors ${isToday ? 'bg-blue-600/10' : ''}`} style={{ width: zoomLevel }}>
                       <span className={`text-[8px] font-black uppercase tracking-tighter ${isFirstOfMonth ? 'text-blue-400' : 'text-slate-600'}`}>{format(day, 'MMM')}</span>
                       <span className={`text-[11px] font-black ${isToday ? 'text-blue-400' : isFirstOfMonth ? 'text-blue-200' : 'text-slate-400'}`}>{format(day, 'd')}</span>
                    </div>
                  )
                })}
             </div>

             <div className="relative pt-0 pb-24" style={{ width: days.length * zoomLevel, minHeight: '100%' }}>
                <div className="absolute inset-0 pointer-events-none opacity-20">
                   {days.map((_, i) => (
                     <div key={i} className="absolute top-0 bottom-0 border-r border-white/5" style={{ left: i * zoomLevel, width: zoomLevel }} />
                   ))}
                </div>

                {tasks.map((task, idx) => {
                  const left = getPosFromDate(task.start_date)
                  const width = Math.max(zoomLevel, getPosFromDate(task.end_date) - left)
                  const baseline = task.metadata_json?.baseline

                  return (
                    <div key={task.id} className="h-[32px] relative group/row">
                       <div className="absolute inset-0 border-b border-white/5 group-hover/row:bg-white/[0.02] transition-all pointer-events-none" />
                       
                       {showBaseline && baseline && (
                         <div 
                           className="absolute h-1 bg-amber-500/20 border border-amber-500/30 rounded-full z-10 top-[26px] opacity-60 pointer-events-none" 
                           style={{ left: getPosFromDate(baseline.start), width: Math.max(10, getPosFromDate(baseline.end) - getPosFromDate(baseline.start)) }} 
                         />
                       )}

                       <motion.div
                         layout
                         drag="x"
                         dragMomentum={false}
                         onDrag={(e, info) => handleTaskMove(task.id, info.delta.x)}
                         onDragEnd={() => handleTaskMove(task.id, 0, true)}
                         onClick={(e) => dependencySourceId ? toggleDependency(task.id) : handleSelectTask(task.id, e.shiftKey)}
                         className={`absolute h-5 top-1.5 rounded-full flex items-center px-3 gap-2 border shadow-lg z-20 group/bar transition-all ${
                           selectedTaskIds.has(task.id) ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0b0c14] z-40' : ''
                         } ${
                           task.status === 'Completed' ? 'border-emerald-500/40 bg-[#0d1f17]' :
                           task.status === 'Blocked' ? 'border-rose-600 bg-rose-950/40' : 'border-blue-500/40 bg-[#0d1425]'
                         }`}
                         style={{ left, width }}
                         title={`${task.name} (${task.progress}%) - ${task.status}\n${format(new Date(task.start_date), 'MMM d')} - ${format(new Date(task.end_date), 'MMM d')}`}
                       >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)] ${
                            task.status === 'Completed' ? 'bg-emerald-500' : 
                            task.status === 'Blocked' ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'
                          }`} />
                          
                          <span className={`text-[9px] font-black uppercase truncate tracking-tight flex-1 ${
                            task.status === 'Completed' ? 'text-emerald-400' : 
                            task.status === 'Blocked' ? 'text-rose-400' : 'text-blue-300'
                          }`}>{task.name}</span>
                          
                          <span className="text-[8px] font-black text-white/40 shrink-0">{task.progress}%</span>

                          <motion.div drag="x" dragMomentum={false} onDrag={(e, info) => { e.stopPropagation(); handleTaskResize(task.id, info.delta.x, 'start'); }} onDragEnd={() => handleTaskResize(task.id, 0, 'start', true)} className="absolute -left-1 top-0 bottom-0 w-2 cursor-ew-resize z-50 rounded-l-full hover:bg-white/10" />
                          <motion.div drag="x" dragMomentum={false} onDrag={(e, info) => { e.stopPropagation(); handleTaskResize(task.id, info.delta.x, 'end'); }} onDragEnd={() => handleTaskResize(task.id, 0, 'end', true)} className="absolute -right-1 top-0 bottom-0 w-2 cursor-ew-resize z-50 rounded-r-full hover:bg-white/10" />
                       </motion.div>
                    </div>
                  )
                })}
             </div>
          </div>
       </div>

       {/* Comprehensive Task Detail Modal */}
       <AnimatePresence>
          {selectedTaskId && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-8">
               <motion.div 
                 initial={{ scale: 0.95, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 exit={{ scale: 0.95, opacity: 0 }}
                 className="bg-[#0d0f17] w-[900px] h-[85vh] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
               >
                  {(() => {
                    const task = tasks.find(t => t.id === selectedTaskId)
                    if (!task) return null
                    return (
                      <>
                        <div className="p-8 border-b border-white/10 bg-[#0a0c14]/50 flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className={`w-4 h-4 rounded-full ${task.status === 'Completed' ? 'bg-emerald-500' : task.status === 'Blocked' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                              <div>
                                 <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{task.name}</h2>
                                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Strategic Vector Milestone</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <button onClick={() => setSelectedTaskId(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={20}/></button>
                           </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                           <div className="grid grid-cols-3 gap-10">
                              <div className="col-span-2 space-y-10">
                                 <section className="space-y-4">
                                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2"><Clipboard size={14}/> Technical Mission</h4>
                                    <textarea 
                                      value={task.description || ''} 
                                      onChange={e => handleTaskUpdate(task.id, { description: e.target.value })} 
                                      className="w-full h-48 bg-black/40 border border-white/10 rounded-xl p-5 text-sm font-medium text-slate-300 outline-none focus:border-blue-500/50 resize-none transition-all leading-relaxed" 
                                      placeholder="DEFINE THE CORE OBJECTIVES AND CONSTRAINTS..." 
                                    />
                                 </section>

                                 <div className="grid grid-cols-2 gap-8">
                                    <section className="space-y-4">
                                       <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2"><Clock size={14}/> Timeline Parameters</h4>
                                       <div className="space-y-4">
                                          <div>
                                             <label className="text-[8px] font-black text-slate-600 uppercase mb-1 block">Vector Initialization</label>
                                             <input type="date" value={format(new Date(task.start_date), 'yyyy-MM-dd')} onChange={e => handleTaskUpdate(task.id, { start_date: new Date(e.target.value).toISOString() })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" />
                                          </div>
                                          <div>
                                             <label className="text-[8px] font-black text-slate-600 uppercase mb-1 block">Vector Termination</label>
                                             <input type="date" value={format(new Date(task.end_date), 'yyyy-MM-dd')} onChange={e => handleTaskUpdate(task.id, { end_date: new Date(e.target.value).toISOString() })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" />
                                          </div>
                                       </div>
                                    </section>
                                    <section className="space-y-4">
                                       <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2"><Shield size={14}/> Strategic State</h4>
                                       <div className="space-y-4">
                                          <div>
                                             <label className="text-[8px] font-black text-slate-600 uppercase mb-1 block">Status</label>
                                             <select value={task.status} onChange={e => handleTaskUpdate(task.id, { status: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-black text-white uppercase outline-none focus:border-blue-500">
                                                {['To Do', 'In Progress', 'Blocked', 'Review', 'Completed'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                             </select>
                                          </div>
                                          <div>
                                             <label className="text-[8px] font-black text-slate-600 uppercase mb-1 block">Maturity ({task.progress}%)</label>
                                             <input type="range" value={task.progress} onChange={e => handleTaskUpdate(task.id, { progress: parseInt(e.target.value) })} className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500" />
                                          </div>
                                       </div>
                                    </section>
                                 </div>
                              </div>

                              <div className="space-y-10">
                                 <section className="space-y-4">
                                    <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] flex items-center gap-2"><Link2 size={14}/> Dependencies</h4>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                       {(task.dependencies_json || []).map((depId: number) => (
                                          <div key={depId} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg group">
                                             <span className="text-[10px] font-black text-slate-400 uppercase truncate">{tasks.find(t => t.id === depId)?.name || 'UNKNOWN VECTOR'}</span>
                                             <button onClick={() => toggleDependency(depId)} className="text-slate-600 hover:text-rose-500 transition-colors"><X size={14}/></button>
                                          </div>
                                       ))}
                                       <button onClick={() => { setDependencySourceId(task.id); setSelectedTaskId(null); }} className="w-full py-2 border border-dashed border-white/10 rounded-lg text-[8px] font-black text-slate-600 uppercase hover:text-blue-500 transition-all">Bind Dependency</button>
                                    </div>
                                 </section>

                                 <section className="space-y-4">
                                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2"><History size={14}/> Evolution Log</h4>
                                    <div className="space-y-3">
                                       {(task.metadata_json?.history || []).slice(-3).map((entry: any, i: number) => (
                                          <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5">
                                             <p className="text-[10px] font-bold text-slate-400 leading-tight">"{entry.message}"</p>
                                             <p className="text-[7px] font-black text-slate-600 uppercase mt-2">{format(new Date(entry.timestamp), 'MMM d, HH:mm')}</p>
                                          </div>
                                       ))}
                                       <input 
                                         className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-[10px] font-bold text-white outline-none focus:border-blue-500/50"
                                         placeholder="APPEND LOG ENTRY..."
                                         onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                               const msg = e.currentTarget.value.trim();
                                               if (!msg) return;
                                               const history = task.metadata_json?.history || [];
                                               handleTaskUpdate(task.id, { 
                                                  metadata_json: { ...task.metadata_json, history: [...history, { author: 'ENGINEER', message: msg, timestamp: new Date().toISOString() }] } 
                                               });
                                               e.currentTarget.value = '';
                                            }
                                         }}
                                       />
                                    </div>
                                 </section>
                              </div>
                           </div>
                        </div>

                        <div className="p-8 border-t border-white/10 bg-[#0a0c14] flex gap-4">
                           <button onClick={() => handleTaskUpdate(task.id, { metadata_json: { ...task.metadata_json, baseline: { start: task.start_date, end: task.end_date } } })} className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20">
                              <Camera size={16}/> Snapshot Baseline
                           </button>
                           <button onClick={() => { if(confirm('DECOMMISSION THIS VECTOR?')) { onUpdate({ ...project, tasks: tasks.filter(t => t.id !== task.id) }); setSelectedTaskId(null); } }} className="px-6 py-3 bg-rose-600/10 border border-rose-500/20 text-rose-500 hover:bg-rose-600 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                              Decommission
                           </button>
                        </div>
                      </>
                    )
                  })()}
               </motion.div>
            </div>
          )}
       </AnimatePresence>
    </div>
  )
}



import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

const ExecutiveChart = ({ tasks }: { tasks: any[] }) => {
  const data = useMemo(() => {
    if (tasks.length === 0) return []
    const start = startOfMonth(new Date(Math.min(...tasks.map(t => new Date(t.start_date).getTime()))))
    const end = endOfMonth(new Date(Math.max(...tasks.map(t => new Date(t.end_date).getTime()))))
    const interval = eachDayOfInterval({ start, end })
    
    return interval.filter((_, i) => i % 7 === 0).map(date => {
      const scheduledTasks = tasks.filter(t => new Date(t.end_date) <= date).length
      const scheduledPercent = Math.round((scheduledTasks / tasks.length) * 100)
      
      const actualProgress = Math.round(tasks.reduce((acc, t) => {
        if (new Date(t.start_date) > date) return acc
        const taskDuration = differenceInDays(new Date(t.end_date), new Date(t.start_date)) || 1
        const elapsed = Math.max(0, Math.min(taskDuration, differenceInDays(date, new Date(t.start_date))))
        const taskProgressAtDate = (elapsed / taskDuration) * (t.progress / 100) * 100
        return acc + taskProgressAtDate
      }, 0) / tasks.length)

      return {
        date: format(date, 'MMM d'),
        scheduled: scheduledPercent,
        actual: actualProgress
      }
    })
  }, [tasks])

  return (
    <div className="h-full w-full bg-[#0a0c14] p-8 flex flex-col gap-6">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-xl font-black text-white uppercase tracking-tighter">Strategic Velocity Vector</h3>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Scheduled vs Actual Execution Performance</p>
          </div>
          <div className="flex gap-6">
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500" /><span className="text-[10px] font-black text-slate-400 uppercase">Scheduled</span></div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500" /><span className="text-[10px] font-black text-slate-400 uppercase">Actual</span></div>
          </div>
       </div>
       <div className="flex-1 min-h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={data}>
                <defs>
                   <linearGradient id="colorSched" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                   <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#475569" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="scheduled" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSched)" />
                <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
             </AreaChart>
          </ResponsiveContainer>
       </div>
    </div>
  )
}


import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Connection,
  Edge,
  Node
} from 'reactflow'
import 'reactflow/dist/style.css'

const DiagramBuilder = ({ data, onChange }: { data: any, onChange: (data: any) => void }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(data?.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(data?.edges || [])

  const onConnect = (params: Connection) => {
    const newEdges = addEdge(params, edges)
    setEdges(newEdges)
    onChange({ nodes, edges: newEdges })
  }

  useEffect(() => {
    onChange({ nodes, edges })
  }, [nodes, edges])

  return (
    <div className="h-[500px] bg-[#0a0c14] border border-white/5 rounded-xl overflow-hidden relative group">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        theme="dark"
      >
        <Background color="#1e293b" gap={20} />
        <Controls />
        <MiniMap nodeStrokeColor="#3b82f6" nodeColor="#1e293b" maskColor="rgba(0,0,0,0.5)" />
      </ReactFlow>
      <div className="absolute top-4 right-4 flex gap-2">
         <button 
           onClick={() => setNodes([...nodes, { 
             id: Date.now().toString(), 
             type: 'default', 
             data: { label: 'NEW NODE' }, 
             position: { x: Math.random() * 400, y: Math.random() * 400 },
             style: { background: '#1e293b', color: '#fff', border: '1px solid #3b82f6', fontSize: '10px', fontWeight: 'bold' }
           }])}
           className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-black uppercase tracking-widest shadow-lg"
         >
           Add Node
         </button>
      </div>
    </div>
  )
}

const WorkbenchView = ({ project, portfolioMetrics, resourceHeatmap, onEdit, onUpdate }: any) => {
  const [roiCollapsed, setRoiCollapsed] = React.useState(false)
  const tasks = project?.tasks || []
  const stats = useMemo(() => {
    const total = tasks.length
    if (total === 0) return { progress: 0, blocked: 0, health: 'Stable', criticalProgress: 0 }
    const avgProgress = Math.round(tasks.reduce((acc: number, t: any) => acc + (t.progress || 0), 0) / total)
    const blockedCount = tasks.filter((t: any) => t.status === 'Blocked').length
    return { progress: avgProgress, blocked: blockedCount, criticalProgress: avgProgress, health: blockedCount > 0 ? 'At Risk' : 'Healthy' }
  }, [tasks])

  if (!project) return null

  return (
    <div className="max-w-full mx-auto space-y-8 pb-20">
       {/* Precision Status Header (Moved from Gantt) */}
       <div className="grid grid-cols-4 gap-6">
          <div className="bg-[#1a1b26] p-4 rounded-xl border border-white/5 shadow-inner">
             <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Portfolio Velocity</p>
                <Zap size={14} className="text-blue-400" />
             </div>
             <div className="flex items-end gap-2"><span className="text-2xl font-black text-white">{stats.progress}%</span><span className="text-[10px] font-bold text-emerald-400 mb-1">COMPLETED</span></div>
             <div className="h-2 w-full bg-white/5 rounded-full mt-3 overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]" style={{ width: `${stats.progress}%` }} /></div>
          </div>
          <div className="bg-[#1a1b26] p-4 rounded-xl border border-white/5 shadow-inner">
             <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Strategic Maturity</p>
                <Target size={14} className="text-rose-400" />
             </div>
             <div className="flex items-end gap-2"><span className="text-2xl font-black text-rose-400">{stats.criticalProgress}%</span><span className="text-[10px] font-bold text-slate-600 mb-1">STABILITY</span></div>
             <div className="h-2 w-full bg-white/5 rounded-full mt-3 overflow-hidden border border-white/5"><div className="h-full bg-rose-500 rounded-full" style={{ width: `${stats.criticalProgress}%` }} /></div>
          </div>
          <div className="bg-[#1a1b26] p-4 rounded-xl border border-white/5 shadow-inner">
             <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Active Risky Nodes</p>
                <AlertTriangle size={14} className="text-amber-400" />
             </div>
             <div className="flex items-end gap-2"><span className={`text-2xl font-black ${stats.blocked > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{stats.blocked}</span><span className="text-[10px] font-bold text-slate-600 mb-1">BLOCKED</span></div>
             <div className="flex gap-1.5 mt-3">{(Array(8).fill(0)).map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i < stats.blocked ? 'bg-rose-500' : 'bg-white/5'}`} />)}</div>
          </div>
          <div className="bg-[#1a1b26] p-4 rounded-xl border border-white/5 shadow-inner">
             <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">System Integrity</p>
                <ShieldCheck size={14} className="text-emerald-400" />
             </div>
             <div className="flex items-end gap-2"><span className={`text-2xl font-black ${stats.health === 'Healthy' ? 'text-emerald-400' : 'text-amber-400'}`}>{stats.health}</span></div>
             <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.1em] mt-3">OPERATIONAL NOMINAL RANGE.</p>
          </div>
       </div>

       {/* Strategic ROI Section (Collapsible) */}
       <div className="border border-white/5 rounded-xl bg-[#12141f] overflow-hidden">
          <button 
            onClick={() => setRoiCollapsed(!roiCollapsed)}
            className="w-full px-6 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-all"
          >
             <div className="flex items-center gap-3">
                <BarChart3 size={16} className="text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Strategic ROI Matrix</span>
             </div>
             {roiCollapsed ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500 rotate-90" />}
          </button>
          
          <AnimatePresence>
             {!roiCollapsed && (
               <motion.div 
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: 'auto', opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
                 className="overflow-hidden"
               >
                  <div className="p-6 grid grid-cols-4 gap-6">
                     <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Defense Line</p>
                        <p className="text-xl font-black text-white">LEVEL {project.roi_defense_line || 0}</p>
                     </div>
                     <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Man-Hours Optimized</p>
                        <p className="text-xl font-black text-emerald-400">+{project.man_hours_saved || 0}H</p>
                     </div>
                     <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Stoploss Revenue</p>
                        <p className="text-xl font-black text-rose-400">+{project.stoploss_minutes_saved || 0}m</p>
                     </div>
                     <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Wafer Yield Gained</p>
                        <p className="text-xl font-black text-blue-400">+{project.wafers_gained || 0}</p>
                     </div>
                  </div>
               </motion.div>
             )}
          </AnimatePresence>
       </div>

       {/* Objectives and Problems */}
       <div className="grid grid-cols-2 gap-8">
          <section className="space-y-3">
             <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2"><Clipboard size={14} /> Problem Statement</h4>
                <button onClick={onEdit} className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-blue-400 transition-all"><Edit2 size={12}/></button>
             </div>
             <div className="bg-white/5 p-6 rounded-xl border border-white/5 min-h-[120px] shadow-inner relative group">
                <p className="text-[11px] font-bold text-slate-400 leading-relaxed">"{project.problem_statement || 'No problem statement defined.'}"</p>
             </div>
          </section>
          <section className="space-y-3">
             <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2"><Target size={14} /> Mission Objective</h4>
                <button onClick={onEdit} className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-emerald-400 transition-all"><Edit2 size={12}/></button>
             </div>
             <div className="bg-white/5 p-6 rounded-xl border border-white/5 min-h-[120px] shadow-inner relative group">
                <p className="text-[11px] font-bold text-slate-400 leading-relaxed">{project.objective || 'No objective defined.'}</p>
             </div>
          </section>
       </div>

       {/* Infrastructure & Design Assets */}
       <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-4">
             <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2"><Workflow size={14} /> System & Logic Architecture</h4>
             <DiagramBuilder 
               data={project.metadata_json?.diagram} 
               onChange={(d) => {
                 // Only update if data actually changed to avoid infinite loops
                 if (JSON.stringify(d) !== JSON.stringify(project.metadata_json?.diagram)) {
                    onUpdate({ ...project, metadata_json: { ...project.metadata_json, diagram: d } })
                 }
               }} 
             />
          </div>
          <div className="space-y-8">
             <section className="space-y-4">
                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2"><ImageIcon size={14} /> Design Artifacts</h4>
                <div className="grid grid-cols-2 gap-3">
                   {(project.metadata_json?.images || []).map((img: string, i: number) => (
                     <div key={i} className="aspect-square bg-white/5 rounded-lg border border-white/5 overflow-hidden group relative">
                        <img src={img} alt="Artifact" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                           <button className="p-2 bg-rose-600 rounded-full text-white"><Trash2 size={14}/></button>
                        </div>
                     </div>
                   ))}
                   <button className="aspect-square border-2 border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center text-slate-700 hover:text-blue-500 hover:border-blue-500/30 transition-all group">
                      <Camera size={24} className="mb-2 opacity-30 group-hover:opacity-100" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Attach Artifact</span>
                   </button>
                </div>
             </section>

             <section className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2"><Link2 size={14} /> Intelligence Links</h4>
                <div className="space-y-2">
                   {(project.metadata_json?.links || []).map((link: any, i: number) => (
                     <a key={i} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-all group">
                        <span className="text-[10px] font-black text-slate-400 uppercase truncate">{link.label}</span>
                        <ExternalLink size={12} className="text-slate-600 group-hover:text-blue-400" />
                     </a>
                   ))}
                   <button className="w-full py-2 border border-dashed border-white/5 rounded-lg text-[8px] font-black text-slate-700 uppercase hover:text-blue-500 hover:border-blue-500/30 transition-all">
                      Add Reference Link
                   </button>
                </div>
             </section>
          </div>
       </div>
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
      const taskHistory = (project.tasks || []).flatMap((t: any) => 
        (t.metadata_json?.history || []).map((h: any) => ({ ...h, taskName: t.name }))
      )
      return [...(project.comments || []), ...(project.qa_items || []), ...(project.metadata_json?.history || []), ...taskHistory]
        .sort((a: any, b: any) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime())
    } else {
      // Global Stream
      const all = [] as any[]
      allProjects.forEach(p => {
        const taskHistory = (p.tasks || []).flatMap((t: any) => 
          (t.metadata_json?.history || []).map((h: any) => ({ ...h, taskName: t.name, projectName: p.name }))
        )
        const stream = [...(p.comments || []), ...(p.qa_items || []), ...(p.metadata_json?.history || []), ...taskHistory]
          .map(item => ({ ...item, projectName: item.projectName || p.name }))
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
                        {item.taskName && <span className="ml-2 text-[7px] font-black text-amber-500 uppercase tracking-widest"># {item.taskName}</span>}
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
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-12 max-w-4xl mx-auto p-6 bg-[#0a0c14]/50 rounded-2xl border border-white/5 shadow-2xl mt-4">
       <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20">
             <Briefcase size={20} className="text-blue-400" />
          </div>
          <div>
             <h3 className="text-lg font-black uppercase text-white tracking-tighter">Strategic Matrix Configuration</h3>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Define vector parameters and ROI targets</p>
          </div>
       </div>

       <div className="grid grid-cols-2 gap-6">
          <div className="space-y-5">
             <div>
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 block px-1">Project Identifier</label>
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all" placeholder="ENTER PROJECT NAME..."/>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <StyledSelect label="Type" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} options={PROJECT_TYPES} />
                <StyledSelect label="Priority" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} options={PROJECT_PRIORITIES} />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <StyledSelect label="Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={PROJECT_STATUSES} />
                <div>
                   <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 block px-1">Lead Owner</label>
                   <input value={formData.owner} onChange={e => setFormData({ ...formData, owner: e.target.value.toUpperCase() })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"/>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 block px-1">Start Date</label>
                   <input type="date" value={formData.start_date ? format(new Date(formData.start_date), 'yyyy-MM-dd') : ''} onChange={e => setFormData({ ...formData, start_date: new Date(e.target.value).toISOString() })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"/>
                </div>
                <div>
                   <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 block px-1">End Date (Target)</label>
                   <input type="date" value={formData.end_date ? format(new Date(formData.end_date), 'yyyy-MM-dd') : ''} onChange={e => setFormData({ ...formData, end_date: new Date(e.target.value).toISOString() })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"/>
                </div>
             </div>
          </div>
          <div className="space-y-5 bg-white/[0.02] p-5 rounded-xl border border-white/5 shadow-inner">
             <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 mb-1"><BarChart3 size={12} /> Strategic Impact Metrics</h4>
             <div className="grid grid-cols-2 gap-4">
                <StyledSelect label="Defense Line" value={formData.roi_defense_line} onChange={e => setFormData({...formData, roi_defense_line: parseInt(e.target.value)})} options={DEFENSE_LINES} />
                <div><label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 block px-1">Man-Hours Saved</label><input type="number" value={formData.man_hours_saved} onChange={e => setFormData({...formData, man_hours_saved: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-1.5 text-xs font-bold text-white outline-none focus:border-blue-500" /></div>
                <div><label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 block px-1">Stoploss Min.</label><input type="number" value={formData.stoploss_minutes_saved} onChange={e => setFormData({...formData, stoploss_minutes_saved: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-1.5 text-xs font-bold text-white outline-none focus:border-blue-500" /></div>
                <div><label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 block px-1">Wafers Gained</label><input type="number" value={formData.wafers_gained} onChange={e => setFormData({...formData, wafers_gained: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-1.5 text-xs font-bold text-white outline-none focus:border-blue-500" /></div>
             </div>
             <div>
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 block px-1">Jira References (Comma separated)</label>
                <input value={jiraInput} onChange={e => handleJiraChange(e.target.value.toUpperCase())} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" placeholder="e.g. PROJ-123, PROJ-456"/>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-2 gap-6">
          <div className="space-y-5">
             <div><label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 block px-1">Problem Statement</label><textarea value={formData.problem_statement} onChange={e => setFormData({ ...formData, problem_statement: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-xs font-medium text-slate-300 h-24 resize-none outline-none focus:border-blue-500 transition-all leading-relaxed" placeholder="DESCRIBE CRITICAL PAIN POINTS..."/></div>
             <div><label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 block px-1">Mission Objective</label><textarea value={formData.objective} onChange={e => setFormData({ ...formData, objective: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-xs font-medium text-slate-300 h-24 resize-none outline-none focus:border-blue-500 transition-all leading-relaxed" placeholder="DESCRIBE DESIRED STRATEGIC OUTCOME..."/></div>
          </div>
          <div className="space-y-4">
             <h4 className="text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 mb-1"><Layers size={12} /> Scope Binding</h4>
             <div className="space-y-4">
                <div>
                   <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Target Systems</label>
                      <input 
                        value={systemSearch}
                        onChange={e => setSystemSearch(e.target.value)}
                        placeholder="SEARCH..."
                        className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[7px] font-bold text-white outline-none focus:border-blue-500 w-20"
                      />
                   </div>
                   <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-3 bg-black/30 rounded-lg border border-white/5 shadow-inner">
                      {filteredSystems.map((s: any) => (
                        <button key={s.id} onClick={() => toggleTarget('target_systems', s.name)} className={`px-2 py-1 text-[8px] font-black uppercase rounded transition-all border ${formData.target_systems?.includes(s.name) ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 border-white/5 text-slate-600 hover:text-slate-400'}`}>
                           {s.name}
                        </button>
                      ))}
                      {filteredSystems.length === 0 && <span className="text-[8px] font-bold text-slate-800 ">No matches</span>}
                   </div>
                </div>
                <div>
                   <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Target Assets</label>
                      <input 
                        value={assetSearch}
                        onChange={e => setAssetSearch(e.target.value)}
                        placeholder="SEARCH..."
                        className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[7px] font-bold text-white outline-none focus:border-emerald-500 w-20"
                      />
                   </div>
                   <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-3 bg-black/30 rounded-lg border border-white/5 shadow-inner">
                      {filteredAssets.map((a: any) => (
                        <button key={a.id} onClick={() => toggleTarget('target_assets', a.name)} className={`px-2 py-1 text-[8px] font-black uppercase rounded transition-all border ${formData.target_assets?.includes(a.name) ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' : 'bg-white/5 border-white/5 text-slate-600 hover:text-slate-400'}`}>
                           {a.name}
                        </button>
                      ))}
                      {filteredAssets.length === 0 && <span className="text-[8px] font-bold text-slate-800 ">No matches</span>}
                   </div>
                </div>
             </div>
          </div>
       </div>

       <div className="flex gap-4 pt-4">
          <button onClick={onCancel} className="flex-1 py-3 bg-white/5 hover:bg-rose-600/10 hover:text-rose-400 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-transparent hover:border-rose-500/20">Abort</button>
          <button disabled={isSaving || !formData.name} onClick={() => onSave(formData)} className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]">
             {isSaving ? 'Establishing Link...' : 'Commit Strategic Vector'}
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

export default function Projects() {
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'WORKSPACE' | 'GANTT' | 'RISKS' | 'ACTIVITY'>('WORKSPACE')
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
      case 'view_risks': setActiveTab('RISKS'); break;
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
                  { id: 'RISKS', icon: ShieldAlert, label: 'Risk Registry' },
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
                          <WorkbenchView
                            project={selectedProject}
                            portfolioMetrics={portfolioMetrics}
                            resourceHeatmap={resourceHeatmap}
                            onEdit={() => setIsEditing(true)}
                            onUpdate={mutation.mutate}
                          />                        )}
                     </motion.div>
                   )}
                   {activeTab === 'GANTT' && <motion.div key="gantt" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="h-full"><PrecisionGantt project={selectedProject} onUpdate={mutation.mutate} /></motion.div>}
                   {activeTab === 'RISKS' && <motion.div key="risks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full"><ProjectRisks project={selectedProject} onUpdate={mutation.mutate} /></motion.div>}
                   {activeTab === 'ACTIVITY' && <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full"><ProjectActivityStream project={selectedProject} allProjects={projects || []} /></motion.div>}
                </AnimatePresence>
             </div>
          </div>
          <ProjectLedger project={selectedProject} />
       </div>
       <AnimatePresence>
         {isCommandPaletteOpen && <ProjectCommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} onAction={handleCommand} />}
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
       <style>{`
         .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } 
         .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } 
         .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; } 
         .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
         @keyframes scanline {
           0% { transform: translateX(-100%); }
           100% { transform: translateX(500%); }
         }
         .animate-scanline {
           animation: scanline 3s linear infinite;
         }
       `}</style>
    </div>
  )
}

