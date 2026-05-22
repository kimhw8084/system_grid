import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ListTodo, History, ShieldAlert, Globe, 
  Zap, Save, X, PlusCircle, User, MessageSquare,
  MoreVertical, RefreshCcw, TrendingUp, AlertTriangle,
  Lightbulb, ShieldCheck, Calendar, Activity, Database, Server,
  FileText, Clipboard, Terminal, ArrowRight, Shield, Download, Share2,
  Clock, CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye, Camera, Link as LinkIcon, Link2, Layers, Settings, Check, Target, ChevronDown,
  Workflow, ExternalLink, Briefcase, BarChart3, Users, DollarSign, Image as ImageIcon, HelpCircle, BookOpen, Filter,
  Maximize2, Minimize2, PanelLeft, PanelRight, MousePointer2, GitBranch, Binary, Cpu, Network, Activity as ActivityIcon, ScrollText, GripVertical
} from 'lucide-react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { AgGridReact } from 'ag-grid-react'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'
import { StatusPill } from './shared/StatusPill'
import { ConfigRegistryModal } from './ConfigRegistry'
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType
} from 'reactflow'
import 'reactflow/dist/style.css'

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

const ROI_TYPES = [
  { value: 'defense_line', label: 'Defense Line' },
  { value: 'man_hours', label: 'Man-Hours' },
  { value: 'stoploss', label: 'Stoploss' },
  { value: 'wpd', label: 'WPD' }
]

// --- Workspace Components ---

export const ProjectHUD = ({ 
  project, 
  isEditing, 
  isDirty, 
  onEdit, 
  onSave, 
  onCancel,
  onDelete,
  isSaving
}: { 
  project: any, 
  isEditing: boolean, 
  isDirty: boolean, 
  onEdit: () => void, 
  onSave: () => void, 
  onCancel: () => void,
  onDelete: () => void,
  isSaving?: boolean
}) => {
  if (!project) return (
    <div className="h-16 bg-[#0a0c14] border-b border-white/5 flex items-center px-6 gap-6">
       <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center border border-blue-500/20">
             <Briefcase size={20} className="text-blue-400" />
          </div>
          <div>
             <h1 className="text-lg font-bold tracking-tighter text-slate-500">Workshop Baseline</h1>
             <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Select a strategic stream to begin</p>
          </div>
       </div>
    </div>
  )

  return (
    <div className="h-16 bg-[#0a0c14] border-b border-white/10 flex items-center px-6 justify-between shrink-0 z-50 shadow-2xl">
       <div className="flex items-center gap-6 overflow-hidden">
          <div className="flex items-center gap-3 shrink-0">
             <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                <Workflow size={20} className="text-white" />
             </div>
             <div>
                <h1 className="text-lg font-bold tracking-tighter text-white leading-none truncate max-w-[300px]">{project.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">{project.type}</span>
                   <span className="text-slate-700 font-bold">•</span>
                   <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{project.status}</span>
                   {isDirty && (
                     <>
                       <span className="text-slate-700 font-bold">•</span>
                       <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest animate-pulse">Unsaved Changes</span>
                     </>
                   )}
                </div>
             </div>
          </div>

          <div className="h-8 w-px bg-white/5 mx-2 shrink-0" />
       </div>

       <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
             {isEditing ? (
               <>
                 <button 
                   onClick={onCancel}
                   className="px-4 py-2 text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-all"
                 >
                   Discard
                 </button>
                 <button 
                   onClick={onSave}
                   disabled={isSaving || !isDirty}
                   className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${
                     isDirty 
                       ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                       : 'bg-white/5 text-slate-600 cursor-not-allowed'
                   }`}
                 >
                   <Save size={14} /> {isSaving ? 'Syncing...' : 'Commit Changes'}
                 </button>
               </>
             ) : (
               <button 
                 onClick={onEdit}
                 className="px-6 py-2 bg-white/5 hover:bg-white/10 text-blue-400 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-blue-500/20 flex items-center gap-2"
               >
                 <Edit2 size={14} /> Unlock Editor
               </button>
             )}
          </div>
          
          <div className="w-px h-8 bg-white/5 mx-2" />

          <div className="flex items-center gap-2">
             <button 
               onClick={onDelete}
               className="p-2 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-lg transition-all border border-rose-500/20"
               title="Decommission Project"
             >
                <Trash2 size={18} />
             </button>
             <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-all border border-white/5">
                <Settings size={18} />
             </button>
          </div>
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
}: any) => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState('ALL')

  const years = useMemo(() => {
    const y = new Set<string>()
    projects.forEach((p:any) => {
      if (p.created_at) y.add(new Date(p.created_at).getFullYear().toString())
    })
    return Array.from(y).sort((a, b) => b.localeCompare(a))
  }, [projects])

  const filtered = projects.filter((p:any) => {
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
            {filtered.map((p:any) => (
               <button 
                 key={p.id} 
                 onClick={() => onSelect(p.id)}
                 className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${selectedId === p.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
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
               className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
             >
                <Plus size={14} /> New Vector
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
                  placeholder="Filter vectors..."
                />
             </div>
             <div className="grid grid-cols-2 gap-2">
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-[8px] font-bold text-slate-400 outline-none focus:border-blue-500/50 uppercase tracking-widest"
                >
                   <option value="ALL">ALL STATUS</option>
                   {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select 
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-[8px] font-bold text-slate-400 outline-none focus:border-blue-500/50 uppercase tracking-widest"
                >
                   <option value="ALL">ALL PRIORITY</option>
                   {PROJECT_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
             </div>
             <select 
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-[8px] font-bold text-slate-400 outline-none focus:border-blue-500/50 uppercase tracking-widest"
              >
                 <option value="ALL">ALL YEARS</option>
                 {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {filtered.map((p:any) => (
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
                    <h3 className={`text-[11px] font-bold truncate transition-colors ${selectedId === p.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{p.name}</h3>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      p.status === 'Completed' ? 'bg-emerald-500' :
                      p.status === 'Blocked' ? 'bg-rose-500' :
                      p.status === 'In Progress' ? 'bg-blue-500' : 'bg-slate-700'
                    }`} />
                 </div>
                 <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                       <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{p.type || 'N/A'}</span>
                       <span className="text-slate-800 text-[8px]">•</span>
                       <span className="text-[8px] font-bold text-slate-500">{p.priority}</span>
                    </div>
                    <span className="text-[7px] font-bold text-slate-700">{p.created_at ? format(new Date(p.created_at), 'yyyy') : 'N/A'}</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="px-1.5 py-0.5 bg-blue-600/10 border border-blue-500/20 rounded text-[7px] font-bold text-blue-400 uppercase truncate max-w-[60px]">{p.owner || 'UNASSIGNED'}</div>
                    </div>
                    <span className="text-[7px] font-bold text-slate-800 uppercase tracking-tighter">{p.created_at ? format(new Date(p.created_at), 'MMM dd') : ''}</span>
                 </div>
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
           const onMouseMove = (ev: MouseEvent) => {
             const newWidth = Math.max(160, Math.min(400, startWidth + (ev.clientX - startX)))
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

const ProjectLedger = ({ 
  project, 
  width, 
  onResize, 
  isCollapsed, 
  onToggleCollapse,
  isEditing,
  onUpdate
}: any) => {
  if (!project) return null

  if (isCollapsed) {
    return (
      <div className="w-12 border-l border-white/5 flex flex-col items-center py-4 bg-[#0a0c14] shrink-0">
         <button onClick={onToggleCollapse} className="p-2 text-slate-500 hover:text-white transition-all mb-4">
            <PanelRight size={18} />
         </button>
         <div className="flex-1 flex flex-col gap-6 items-center">
            <BarChart3 size={18} className="text-blue-500 opacity-50" />
         </div>
      </div>
    )
  }

  const handleChange = (field: string, value: any) => {
    onUpdate({ ...project, [field]: value })
  }

  const activeROI = project.roi_types || []

  return (
    <div className="relative border-l border-white/5 bg-[#0a0c14] shrink-0 flex flex-col overflow-hidden" style={{ width }}>
       {/* Resize Handle */}
       <div 
         className="absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/30 transition-colors z-50"
         onMouseDown={(e) => {
           const startX = e.clientX
           const startWidth = width
           const onMouseMove = (ev: MouseEvent) => {
             const newWidth = Math.max(160, Math.min(500, startWidth - (ev.clientX - startX)))
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

       <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0d0f17]">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
             <BarChart3 size={14} /> ROI Metrics
          </h4>
          <button onClick={onToggleCollapse} className="p-1.5 text-slate-500 hover:text-white transition-all rounded-lg hover:bg-white/5">
             <PanelLeft size={18} />
          </button>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          <section className="space-y-6">
             {isEditing && (
               <div className="space-y-3">
                  <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Select ROI Streams</h4>
                  <div className="grid grid-cols-1 gap-1">
                     {ROI_TYPES.map(t => (
                       <label key={t.value} className={`flex items-center gap-2 px-3 py-2 rounded transition-all cursor-pointer ${activeROI.includes(t.value) ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 text-slate-600'}`}>
                          <input 
                            type="checkbox" 
                            checked={activeROI.includes(t.value)}
                            onChange={e => {
                              const updated = e.target.checked ? [...activeROI, t.value] : activeROI.filter((v:any) => v !== t.value)
                              handleChange('roi_types', updated)
                            }}
                            className="rounded border-white/10 bg-black/40 text-blue-600"
                          />
                          <span className="text-[10px] font-bold uppercase tracking-tight">{t.label}</span>
                       </label>
                     ))}
                  </div>
               </div>
             )}

             <div className="space-y-4">
                {activeROI.includes('defense_line') && (
                  <div className={`p-4 bg-white/5 rounded-lg border transition-all ${isEditing ? 'border-blue-500/30' : 'border-white/5'}`}>
                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Defense Line</p>
                     {isEditing ? (
                       <select 
                         value={project.roi_defense_line || 'DL0'}
                         onChange={e => handleChange('roi_defense_line', e.target.value)}
                         className="w-full bg-slate-900 text-xl font-bold text-white outline-none border border-white/10 rounded p-1"
                       >
                         <option value="DL0">DL0: BASE</option>
                         <option value="DL1">DL1: FORTIFIED</option>
                         <option value="DL2">DL2: RESILIENT</option>
                       </select>
                     ) : (
                       <p className="text-xl font-bold text-white uppercase tracking-tighter">{project.roi_defense_line || 'DL0'}</p>
                     )}
                  </div>
                )}

                {activeROI.includes('man_hours') && (
                  <div className={`p-4 bg-white/5 rounded-lg border transition-all ${isEditing ? 'border-blue-500/30' : 'border-white/5'}`}>
                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Man-Hours Optimization</p>
                     {isEditing ? (
                       <div className="flex items-center gap-2">
                         <span className="text-xl font-bold text-blue-400">+</span>
                         <input 
                           type="number"
                           value={project.man_hours_saved || 0}
                           onChange={e => handleChange('man_hours_saved', parseFloat(e.target.value))}
                           className="w-full bg-transparent text-xl font-bold text-blue-400 outline-none"
                         />
                         <span className="text-[10px] font-bold text-blue-400 uppercase">hr/yr</span>
                       </div>
                     ) : (
                       <p className="text-xl font-bold text-blue-400 tracking-tighter">+{project.man_hours_saved || 0} <span className="text-xs">hr/yr</span></p>
                     )}
                  </div>
                )}

                {activeROI.includes('stoploss') && (
                  <div className={`p-4 bg-white/5 rounded-lg border transition-all ${isEditing ? 'border-blue-500/30' : 'border-white/5'}`}>
                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Stoploss Revenue</p>
                     {isEditing ? (
                       <div className="flex items-center gap-2">
                         <span className="text-xl font-bold text-blue-400">+</span>
                         <input 
                           type="number"
                           value={project.stoploss_minutes_saved || 0}
                           onChange={e => handleChange('stoploss_minutes_saved', parseFloat(e.target.value))}
                           className="w-full bg-transparent text-xl font-bold text-blue-400 outline-none"
                         />
                         <span className="text-[10px] font-bold text-blue-400 uppercase">min/yr</span>
                       </div>
                     ) : (
                       <p className="text-xl font-bold text-blue-400 tracking-tighter">+{project.stoploss_minutes_saved || 0} <span className="text-xs">min/yr</span></p>
                     )}
                  </div>
                )}

                {activeROI.includes('wpd') && (
                  <div className={`p-4 bg-white/5 rounded-lg border transition-all ${isEditing ? 'border-blue-500/30' : 'border-white/5'}`}>
                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Wafer Yield Gained</p>
                     {isEditing ? (
                       <div className="flex items-center gap-2">
                         <span className="text-xl font-bold text-blue-400">+</span>
                         <input 
                           type="number"
                           value={project.wafers_gained || 0}
                           onChange={e => handleChange('wafers_gained', parseFloat(e.target.value))}
                           className="w-full bg-transparent text-xl font-bold text-blue-400 outline-none"
                         />
                         <span className="text-[10px] font-bold text-blue-400 uppercase">WPD</span>
                       </div>
                     ) : (
                       <p className="text-xl font-bold text-blue-400 tracking-tighter">+{project.wafers_gained || 0} <span className="text-xs font-bold">WPD</span></p>
                     )}
                  </div>
                )}

                {activeROI.length === 0 && (
                  <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
                     <BarChart3 size={32} />
                     <p className="text-[10px] font-bold uppercase tracking-widest">No ROI streams selected</p>
                  </div>
                )}
             </div>
          </section>
       </div>
    </div>
  )
}

const TaskRow = ({ 
  task, 
  rowIndex, 
  isPackingMode, 
  showBaseline, 
  startDate, 
  zoomLevel, 
  selectedTaskIds, 
  dragInfo, 
  setDragInfo, 
  handleTaskMove, 
  handleTaskResize, 
  setSelectedTaskId, 
  handleSelectTask,
  ROW_HEIGHT 
}: any) => {
  const dragControls = useDragControls()
  const left = Math.floor(differenceInDays(new Date(task?.start_date), startDate) * zoomLevel)
  const width = Math.max(zoomLevel, Math.floor(differenceInDays(new Date(task?.end_date), startDate) * zoomLevel) - left)
  const baseline = task?.metadata_json?.baseline

  return (
    <div className="absolute w-full h-[32px] group/row" style={{ top: rowIndex * ROW_HEIGHT }}>
       <div className="absolute inset-0 border-b border-white/5 group-hover/row:bg-white/[0.02] transition-all pointer-events-none" />
       {showBaseline && baseline && (
         <div className="absolute h-1 bg-amber-500/20 border border-amber-500/30 rounded-full z-10 top-[26px] opacity-60 pointer-events-none" style={{ left: Math.floor(differenceInDays(new Date(baseline.start), startDate) * zoomLevel), width: Math.max(10, Math.floor(differenceInDays(new Date(baseline.end), startDate) * zoomLevel) - Math.floor(differenceInDays(new Date(baseline.start), startDate) * zoomLevel)) }} />
       )}
       <motion.div
         layout
         drag="x"
         dragControls={dragControls}
         dragListener={false}
         dragMomentum={false}
         onDragStart={() => setDragInfo({ id: task.id, date: format(new Date(task.start_date), 'MMM d, yyyy') })}
         onDrag={(e, info) => handleTaskMove(task.id, info.delta.x)}
         onDragEnd={(e, info) => handleTaskMove(task.id, info.offset.x, true)}
         onDoubleClick={() => setSelectedTaskId(task.id)}
         onClick={(e) => handleSelectTask(task.id, e.shiftKey)}
         className={`absolute h-5 top-1.5 rounded-lg flex items-center gap-2 border shadow-lg z-20 group/bar transition-all ${selectedTaskIds.has(task.id) ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0b0c14] z-40' : ''} ${
           task.status === 'Completed' ? 'border-emerald-500/40 bg-[#0d1f17]' : 
           task.status === 'Blocked' ? 'border-rose-600 bg-rose-950/40' : 
           task.status === 'In Progress' ? 'border-blue-500/50 bg-[#0d1425]' :
           task.status === 'Review' ? 'border-amber-500/50 bg-amber-950/20' :
           'border-slate-700 bg-slate-900/60'
         }`}
         style={{ left, width }}
       >
          <div 
            onPointerDown={(e) => dragControls.start(e)}
            className="flex-1 h-full flex items-center px-3 gap-2 cursor-grab active:cursor-grabbing overflow-hidden"
          >
             <div className={`w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)] ${task.status === 'Completed' ? 'bg-emerald-500' : task.status === 'Blocked' ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'}`} />
             <span className={`text-[9px] font-bold truncate tracking-tight flex-1 ${task.status === 'Completed' ? 'text-emerald-400' : task.status === 'Blocked' ? 'text-rose-400' : 'text-blue-300'}`}>{task.name}</span>
             {width > 100 && <span className="text-[8px] font-bold text-white/40 shrink-0">{task.progress}%</span>}
          </div>

          <motion.div 
            drag="x" 
            dragMomentum={false} 
            onDrag={(e, info) => { e.stopPropagation(); handleTaskResize(task.id, info.delta.x, 'start'); }} 
            onDragEnd={(e, info) => { e.stopPropagation(); handleTaskResize(task.id, info.offset.x, 'start', true); }} 
            className="absolute -left-1 top-0 bottom-0 w-2 cursor-ew-resize z-50 rounded-l-lg hover:bg-white/20" 
          />
          <motion.div 
            drag="x" 
            dragMomentum={false} 
            onDrag={(e, info) => { e.stopPropagation(); handleTaskResize(task.id, info.delta.x, 'end'); }} 
            onDragEnd={(e, info) => { e.stopPropagation(); handleTaskResize(task.id, info.offset.x, 'end', true); }} 
            className="absolute -right-1 top-0 bottom-0 w-2 cursor-ew-resize z-50 rounded-r-lg hover:bg-white/20" 
          />
          
          {dragInfo?.id === task.id && (
            <div className="fixed top-[10%] left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-2xl whitespace-nowrap pointer-events-none z-[1000] border border-blue-400/30 backdrop-blur-md">
              <Calendar size={12} className="inline mr-2" />
              {dragInfo.date}
            </div>
          )}
       </motion.div>
    </div>
  )
}

const PrecisionGantt = ({ project, onUpdate }: any) => {
  const [tasks, setTasks] = useState<any[]>(project?.tasks || [])
  const [dragStartTasks, setDragStartTasks] = useState<any[] | null>(null)
  const [zoomLevel, setZoomLevel] = useState(30)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set())
  const [dependencySourceId, setDependencySourceId] = useState<number | null>(null)
  const [showBaseline, setShowBaseline] = useState(false)
  const [showExecutiveChart, setShowExecutiveChart] = useState(false)
  const [isPackingMode, setIsPackingMode] = useState(false)
  const [dragInfo, setDragInfo] = useState<{ id: number, date: string } | null>(null)
  const [dayTasksPopup, setDayTasksPopup] = useState<{ date: Date, tasks: any[] } | null>(null)

  const ROW_HEIGHT = 32
  const HEADER_HEIGHT = 44

  // Sync tasks from project when it updates, but not while editing
  useEffect(() => {
    if (!selectedTaskId && !dragStartTasks) {
      setTasks(project?.tasks || [])
    }
  }, [project?.tasks, selectedTaskId, dragStartTasks])

  const handleSelectTask = (id: number, isShift: boolean) => {
    if (isShift) {
      const next = new Set(selectedTaskIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setSelectedTaskIds(next)
    } else {
      setSelectedTaskIds(new Set([id]))
    }
  }

  const handleTaskMove = (id: number, offset: number, isFinal = false) => {
    if (!isFinal) {
      const baseTasks = dragStartTasks || tasks
      if (!dragStartTasks) setDragStartTasks([...tasks])

      const daysMoved = Math.round(offset / zoomLevel)
      const idsToMove = selectedTaskIds.has(id) ? Array.from(selectedTaskIds) : [id]
      
      const updatedTasks = tasks.map(t => {
        const startTask = baseTasks.find(bt => bt.id === t.id)
        if (startTask && idsToMove.includes(t.id)) {
          const newStart = addDays(new Date(startTask.start_date), daysMoved).toISOString()
          const duration = differenceInDays(new Date(startTask.end_date), new Date(startTask.start_date))
          const newEnd = addDays(new Date(newStart), duration).toISOString()
          return { ...t, start_date: newStart, end_date: newEnd }
        }
        return t
      })
      
      const movedTask = updatedTasks.find(t => t.id === id)
      if (movedTask) {
        setDragInfo({ id, date: format(new Date(movedTask.start_date), 'MMM d, yyyy') })
        setTasks(updatedTasks)
      }
    } else {
      setDragInfo(null)
      setDragStartTasks(null)
      onUpdate({ ...project, tasks: tasks })
    }
  }

  const handleTaskResize = (id: number, offset: number, type: 'start' | 'end', isFinal = false) => {
    if (!isFinal) {
      const baseTasks = dragStartTasks || tasks
      if (!dragStartTasks) setDragStartTasks([...tasks])

      const daysMoved = Math.round(offset / zoomLevel)
      const updatedTasks = tasks.map(t => {
        const startTask = baseTasks.find(bt => bt.id === t.id)
        if (startTask && t.id === id) {
          let updatedTask = { ...t }
          if (type === 'start') {
            const newStart = addDays(new Date(startTask.start_date), daysMoved)
            if (newStart < new Date(startTask.end_date)) updatedTask.start_date = newStart.toISOString()
          } else {
            const newEnd = addDays(new Date(startTask.end_date), daysMoved)
            if (newEnd > new Date(startTask.start_date)) updatedTask.end_date = newEnd.toISOString()
          }
          return updatedTask
        }
        return t
      })

      const target = updatedTasks.find(t => t.id === id)
      if (target) {
        setDragInfo({ id, date: format(new Date(type === 'start' ? target.start_date : target.end_date), 'MMM d, yyyy') })
        setTasks(updatedTasks)
      }
    } else {
      setDragInfo(null)
      setDragStartTasks(null)
      onUpdate({ ...project, tasks: tasks })
    }
  }

  const startDate = useMemo(() => {
    if (!tasks || tasks.length === 0) return startOfMonth(new Date())
    const times = tasks.map(t => new Date(t.start_date).getTime()).filter(t => !isNaN(t))
    const min = times.length > 0 ? Math.min(...times) : new Date().getTime()
    return addDays(new Date(min), -14) 
  }, [tasks])

  const endDate = useMemo(() => {
    if (!tasks || tasks.length === 0) return endOfMonth(addDays(new Date(), 90))
    const times = tasks.map(t => new Date(t.end_date).getTime()).filter(t => !isNaN(t))
    const max = times.length > 0 ? Math.max(...times) : addDays(new Date(), 90).getTime()
    return endOfMonth(addDays(new Date(max), 60))
  }, [tasks])

  const days = useMemo(() => {
    try { 
      const interval = eachDayOfInterval({ start: startDate, end: endDate })
      return interval.length > 3000 ? interval.slice(0, 3000) : interval
    }
    catch (e) { return [new Date()] }
  }, [startDate, endDate])

  const packedTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return []
    if (!isPackingMode) return tasks.map((t, i) => ({ ...t, rowIndex: i }))
    
    const sorted = [...tasks].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    const rows: any[][] = []
    
    sorted.forEach(task => {
      let assigned = false
      for (let i = 0; i < rows.length; i++) {
        const lastInRow = rows[i][rows[i].length - 1]
        if (new Date(task.start_date) >= new Date(lastInRow.end_date)) {
          rows[i].push(task)
          assigned = true
          break
        }
      }
      if (!assigned) rows.push([task])
    })
    
    return rows.flatMap((row, rowIndex) => row.map(task => ({ ...task, rowIndex })))
  }, [tasks, isPackingMode])

  const handleTaskUpdate = (id: number, updates: any) => {
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    setTasks(updatedTasks)
    // Don't sync to project yet if it's just local detail edits - the 'Save' button in modal will do it
  }

  const maxRow = packedTasks.reduce((max, t) => Math.max(max, t.rowIndex), 0)

  const renderDependencies = () => {
    return (
      <svg className="absolute inset-0 pointer-events-none" style={{ width: days.length * zoomLevel, height: (maxRow + 1) * ROW_HEIGHT + 100 }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" opacity="0.5" />
          </marker>
        </defs>
        {packedTasks.map((task) => {
          return (task.dependencies_json || []).map((depId: number) => {
            const fromTask = packedTasks.find(t => t.id === depId)
            if (!fromTask) return null
            const startX = Math.floor(differenceInDays(new Date(fromTask.end_date), startDate) * zoomLevel)
            const startY = fromTask.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2
            const endX = Math.floor(differenceInDays(new Date(task.start_date), startDate) * zoomLevel)
            const endY = task.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2
            const cp1X = startX + (endX - startX) / 2
            const cp2X = startX + (endX - startX) / 2
            return (
              <path
                key={`${fromTask.id}-${task.id}`}
                d={`M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`}
                stroke="#3b82f6"
                strokeWidth="1.5"
                fill="none"
                opacity="0.3"
                markerEnd="url(#arrow)"
              />
            )
          })
        })}
      </svg>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#0b0c14] overflow-hidden">
       <div className="h-11 border-b border-white/10 flex items-center px-6 justify-between bg-[#0a0c14] z-40">
          <div className="flex items-center gap-6">
             <button onClick={() => setShowExecutiveChart(!showExecutiveChart)} className={`p-1.5 rounded-lg transition-all border ${showExecutiveChart ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`} title="Performance Graph"><BarChart3 size={16}/></button>
             <button onClick={() => setIsPackingMode(!isPackingMode)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${isPackingMode ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`} title="Optimize Row Packing">Visualize Gantt</button>
             <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <button onClick={() => setZoomLevel(Math.max(10, zoomLevel - 5))} className="text-slate-500 hover:text-white transition-all p-0.5"><Minimize2 size={14}/></button>
                <div className="w-px h-3 bg-white/10 mx-1" />
                <button onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))} className="text-slate-500 hover:text-white transition-all p-0.5"><Maximize2 size={14}/></button>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em] ml-2">{zoomLevel}PX/D</span>
             </div>
             {dependencySourceId && (
               <div className="flex items-center gap-3 px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg animate-pulse">
                  <Link2 size={14} className="text-blue-400" />
                  <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Binding Dependency Vector...</span>
                  <button onClick={() => setDependencySourceId(null)} className="ml-2 text-slate-500 hover:text-white transition-colors"><X size={12}/></button>
               </div>
             )}
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setShowBaseline(!showBaseline)} className={`px-4 py-1.5 border rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${showBaseline ? 'bg-amber-600/20 border-amber-500/40 text-amber-400' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}>{showBaseline ? 'Hide Baseline' : 'Show Baseline'}</button>
             <button 
               onClick={() => {
                 const name = prompt('New milestone identifier')
                 if (!name) return
                 const newTask = { id: Date.now(), name: name, start_date: new Date().toISOString(), end_date: addDays(new Date(), 7).toISOString(), progress: 0, status: 'To Do', dependencies_json: [], metadata_json: {} }
                 const updated = [...tasks, newTask]
                 setTasks(updated)
                 onUpdate({ ...project, tasks: updated })
               }}
               className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
             ><Plus size={14}/> Add Milestone</button>
          </div>
       </div>

       {showExecutiveChart && (
         <div className="h-[300px] border-b border-white/10 shrink-0">
            <ExecutiveChart tasks={tasks} />
         </div>
       )}

       <div className="flex-1 flex overflow-hidden relative">
          {!isPackingMode && (
            <div className="w-[240px] flex-none flex flex-col border-r border-white/10 bg-[#0d0f17] z-30 shadow-2xl">
               <div className="h-11 border-b border-white/10 flex items-center px-5 shrink-0 bg-[#0a0c14]/80">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">Vector Stack</span>
               </div>
               <Reorder.Group axis="y" values={tasks} onReorder={(newOrder) => { setTasks(newOrder); onUpdate({ ...project, tasks: newOrder }); }} className="flex-1 overflow-y-auto no-scrollbar">
                  {tasks.map((task) => (
                    <Reorder.Item 
                      key={task.id} 
                      value={task}
                      onClick={(e) => handleSelectTask(task.id, e.shiftKey)}
                      onDoubleClick={() => setSelectedTaskId(task.id)}
                      className={`h-[32px] flex items-center px-4 border-b border-white/5 cursor-grab active:cursor-grabbing transition-all group ${selectedTaskIds.has(task.id) ? 'bg-blue-600/15' : 'hover:bg-white/5'}`}
                    >
                       <div className={`w-1.5 h-1.5 rounded-full mr-3 shrink-0 ${
                         task.status === 'Completed' ? 'bg-emerald-500' : 
                         task.status === 'Blocked' ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'
                       }`} />
                       <p className={`text-[10px] font-bold truncate tracking-tight transition-all flex-1 ${selectedTaskIds.has(task.id) ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{task.name}</p>
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id); }} className="p-1 text-slate-500 hover:text-white"><Info size={12}/></button>
                         <GripVertical size={12} className="text-slate-800" />
                       </div>
                    </Reorder.Item>
                  ))}
               </Reorder.Group>
            </div>
          )}

          <div ref={timelineRef} className="flex-1 overflow-auto custom-scrollbar relative bg-[#0b0c14]">
             <div className="sticky top-0 z-30 flex bg-[#0a0c14]/95 backdrop-blur-md border-b border-white/10" style={{ width: days.length * zoomLevel }}>
                {days.map((day, i) => {
                  const isFirstOfMonth = format(day, 'd') === '1'
                  const isToday = isSameDay(day, new Date())
                  return (
                    <div 
                      key={i} 
                      onClick={() => {
                        const tasksEnding = tasks.filter(t => isSameDay(new Date(t.end_date), day))
                        setDayTasksPopup({ date: day, tasks: tasksEnding })
                      }}
                      className={`shrink-0 border-r border-white/5 flex flex-col items-center justify-center h-11 transition-colors cursor-pointer hover:bg-white/5 ${isToday ? 'bg-blue-600/10' : ''}`} 
                      style={{ width: zoomLevel }}
                    >
                       <span className={`text-[8px] font-bold uppercase tracking-tighter ${isFirstOfMonth ? 'text-blue-400' : 'text-slate-600'}`}>{format(day, 'MMM')}</span>
                       <span className={`text-[11px] font-bold ${isToday ? 'text-blue-400' : isFirstOfMonth ? 'text-blue-200' : 'text-slate-400'}`}>{format(day, 'd')}</span>
                    </div>
                  )
                })}
             </div>
             <div className="relative pt-0 pb-24" style={{ width: days.length * zoomLevel, height: (maxRow + 1) * ROW_HEIGHT + 100 }}>
                <div className="absolute inset-0 pointer-events-none opacity-20">
                   {days.map((_, i) => (
                     <div key={i} className="absolute top-0 bottom-0 border-r border-white/5" style={{ left: i * zoomLevel, width: zoomLevel }} />
                   ))}
                </div>
                {renderDependencies()}
                {packedTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    rowIndex={task.rowIndex}
                    isPackingMode={isPackingMode}
                    showBaseline={showBaseline}
                    startDate={startDate}
                    zoomLevel={zoomLevel}
                    selectedTaskIds={selectedTaskIds}
                    dragInfo={dragInfo}
                    setDragInfo={setDragInfo}
                    handleTaskMove={handleTaskMove}
                    handleTaskResize={handleTaskResize}
                    setSelectedTaskId={setSelectedTaskId}
                    handleSelectTask={handleSelectTask}
                    ROW_HEIGHT={ROW_HEIGHT}
                  />
                ))}
             </div>
          </div>

          <AnimatePresence>
            {dayTasksPopup && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed top-24 left-1/2 -translate-x-1/2 w-80 bg-[#0d0f17] border border-blue-500/30 rounded-lg shadow-2xl z-[200] overflow-hidden"
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-blue-600/10">
                  <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{format(dayTasksPopup.date, 'MMMM d, yyyy')}</h4>
                  <button onClick={() => setDayTasksPopup(null)} className="text-slate-500 hover:text-white transition-all"><X size={14}/></button>
                </div>
                <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {dayTasksPopup.tasks.length > 0 ? dayTasksPopup.tasks.map((t: any) => (
                    <div 
                      key={t.id} 
                      className="p-3 bg-white/5 border border-white/5 rounded-lg group cursor-pointer hover:bg-white/10 transition-all"
                      onClick={() => { setSelectedTaskId(t.id); setDayTasksPopup(null); }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-white truncate">{t.name}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold text-slate-500 uppercase">{t.status}</span>
                        <span className="text-[8px] font-bold text-blue-400">{t.progress}%</span>
                      </div>
                    </div>
                  )) : (
                    <div className="py-8 text-center">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No milestones ending on this date</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
       </div>

       <AnimatePresence>
          {selectedTaskId && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-8">
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0d0f17] w-[1000px] h-[85vh] border border-white/10 rounded-lg shadow-2xl flex flex-col overflow-hidden">
                  {(() => {
                    const task = tasks.find(t => t.id === selectedTaskId)
                    if (!task) return null

                    const subtasks = task.metadata_json?.subtasks || []
                    const calculateProgress = () => {
                      if (subtasks.length === 0) {
                        if (task.status === 'Completed') return 100
                        if (task.status === 'In Progress') return 50
                        return 0
                      }
                      const completed = subtasks.filter((s: any) => s.completed).length
                      return Math.round((completed / subtasks.length) * 100)
                    }

                    const autoProgress = calculateProgress()
                    const autoStatus = autoProgress === 100 ? 'Completed' : (autoProgress > 0 ? 'In Progress' : task.status)

                    const updateSubtask = (idx: number, updates: any) => {
                      const newSubtasks = [...subtasks]
                      newSubtasks[idx] = { ...newSubtasks[idx], ...updates }
                      handleTaskUpdate(task.id, { metadata_json: { ...task.metadata_json, subtasks: newSubtasks } })
                    }

                    const addSubtask = () => {
                      const label = prompt('Subtask Description')
                      if (!label) return
                      const newSubtasks = [...subtasks, { label, completed: false }]
                      handleTaskUpdate(task.id, { metadata_json: { ...task.metadata_json, subtasks: newSubtasks } })
                    }

                    const removeSubtask = (idx: number) => {
                      const newSubtasks = subtasks.filter((_: any, i: number) => i !== idx)
                      handleTaskUpdate(task.id, { metadata_json: { ...task.metadata_json, subtasks: newSubtasks } })
                    }

                    return (
                      <>
                        <div className="p-8 border-b border-white/10 bg-[#0a0c14]/50 flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className={`w-4 h-4 rounded-full ${task.status === 'Completed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : task.status === 'Blocked' ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'}`} />
                              <div>
                                 <h2 className="text-2xl font-bold text-white tracking-tighter leading-none">{task.name}</h2>
                                 <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Strategic Vector Milestone</p>
                                    <span className="text-slate-800">•</span>
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{autoProgress}% Maturity</span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <button 
                                onClick={() => { if(confirm('Decommission this vector?')) { const updated = tasks.filter(t => t.id !== task.id); setTasks(updated); onUpdate({ ...project, tasks: updated }); setSelectedTaskId(null); } }} 
                                className="p-2.5 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg transition-all border border-rose-500/20"
                                title="Decommission Task"
                              >
                                 <Trash2 size={18}/>
                              </button>
                              <div className="w-px h-8 bg-white/10 mx-2" />
                              <button 
                                onClick={() => { 
                                  const finalTask = { ...task, progress: autoProgress, status: autoStatus }
                                  const updatedTasks = tasks.map(t => t.id === task.id ? finalTask : t)
                                  onUpdate({ ...project, tasks: updatedTasks })
                                  setSelectedTaskId(null)
                                }} 
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                              >
                                 <Save size={16}/> 
                                 <span className="text-[10px] font-bold uppercase tracking-widest">Commit Milestone</span>
                              </button>
                              <button onClick={() => setSelectedTaskId(null)} className="p-2.5 bg-white/5 text-slate-500 hover:text-white rounded-lg transition-all"><X size={20}/></button>
                           </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 grid grid-cols-12 gap-10">
                           <div className="col-span-7 space-y-10">
                              <section className="space-y-4">
                                 <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2"><Clipboard size={14}/> Technical Mission</h4>
                                 <textarea value={task.description || ''} onChange={e => handleTaskUpdate(task.id, { description: e.target.value })} className="w-full h-40 bg-black/40 border border-white/10 rounded-lg p-5 text-sm font-bold text-slate-300 outline-none focus:border-blue-500/50 resize-none transition-all leading-relaxed" placeholder="Define core objectives..." />
                              </section>

                              <section className="space-y-6">
                                 <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2"><ListTodo size={14}/> Tactical Subtasks</h4>
                                    <button onClick={addSubtask} className="flex items-center gap-2 px-3 py-1 bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded text-[9px] font-bold uppercase tracking-widest transition-all"><Plus size={12}/> New Subtask</button>
                                 </div>
                                 <div className="space-y-2">
                                    {subtasks.map((s: any, idx: number) => (
                                      <div key={idx} className="group flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-lg hover:border-emerald-500/30 transition-all">
                                         <input 
                                           type="checkbox" 
                                           checked={s.completed} 
                                           onChange={e => updateSubtask(idx, { completed: e.target.checked })}
                                           className="w-4 h-4 rounded border-white/10 bg-black/40 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                         />
                                         <input 
                                           value={s.label} 
                                           onChange={e => updateSubtask(idx, { label: e.target.value })}
                                           className={`flex-1 bg-transparent border-none outline-none text-xs font-bold transition-all ${s.completed ? 'text-slate-600 line-through' : 'text-slate-300'}`}
                                         />
                                         <button onClick={() => removeSubtask(idx)} className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:text-rose-400 transition-all"><Trash2 size={14}/></button>
                                      </div>
                                    ))}
                                    {subtasks.length === 0 && (
                                      <div className="py-12 border-2 border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center opacity-20">
                                         <ListTodo size={32} className="mb-2" />
                                         <p className="text-[10px] font-bold uppercase tracking-widest">No tactical subtasks defined</p>
                                      </div>
                                    )}
                                 </div>
                              </section>
                           </div>

                           <div className="col-span-5 space-y-10">
                              <section className="space-y-4">
                                 <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2"><Shield size={14}/> Deployment Parameters</h4>
                                 <div className="bg-white/5 p-6 rounded-lg border border-white/5 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-1.5">
                                          <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest px-1">Current State</label>
                                          <select value={task.status} onChange={e => handleTaskUpdate(task.id, { status: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white uppercase outline-none focus:border-blue-500 transition-all">{['To Do', 'In Progress', 'Blocked', 'Review', 'Completed'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}</select>
                                       </div>
                                       <div className="space-y-1.5">
                                          <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest px-1">Priority</label>
                                          <select value={task.priority || 'Medium'} onChange={e => handleTaskUpdate(task.id, { priority: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white uppercase outline-none focus:border-blue-500 transition-all">{['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}</select>
                                       </div>
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest px-1">Resource / Owner</label>
                                       <input value={task.owner || ''} onChange={e => handleTaskUpdate(task.id, { owner: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all" placeholder="Assignee identifier..." />
                                    </div>
                                 </div>
                              </section>

                              <section className="space-y-4">
                                 <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2"><Clock size={14}/> Execution Window</h4>
                                    <button 
                                      onClick={() => handleTaskUpdate(task.id, { metadata_json: { ...(task.metadata_json || {}), baseline: { start: task.start_date, end: task.end_date } } })} 
                                      className="flex items-center gap-2 px-3 py-1 bg-amber-600/10 border border-amber-500/20 text-amber-500 hover:bg-amber-600 hover:text-white rounded text-[8px] font-bold uppercase tracking-widest transition-all"
                                    >
                                       <Camera size={12}/> Snapshot Baseline
                                    </button>
                                 </div>
                                 <div className="bg-white/5 p-6 rounded-lg border border-white/5 grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                       <label className="text-[8px] font-bold text-slate-600 uppercase px-1">Start Date</label>
                                       <input type="date" value={format(new Date(task.start_date), 'yyyy-MM-dd')} onChange={e => handleTaskUpdate(task.id, { start_date: new Date(e.target.value).toISOString() })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[8px] font-bold text-slate-600 uppercase px-1">End Date</label>
                                       <input type="date" value={format(new Date(task.end_date), 'yyyy-MM-dd')} onChange={e => handleTaskUpdate(task.id, { end_date: new Date(e.target.value).toISOString() })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" />
                                    </div>
                                 </div>
                              </section>

                              <section className="space-y-4 pt-4 border-t border-white/5">
                                 <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2"><History size={14}/> Audit History</h4>
                                    <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">v1.2.0</span>
                                 </div>
                                 <div className="space-y-3">
                                    {(task.metadata_json?.history || []).slice(-3).reverse().map((h: any, i: number) => (
                                      <div key={i} className="text-[10px] font-bold text-slate-500 italic px-2">
                                         • {h.content} <span className="text-[8px] text-slate-700 not-italic ml-2 uppercase">({format(new Date(h.timestamp), 'MMM d')})</span>
                                      </div>
                                    ))}
                                    {(!task.metadata_json?.history || task.metadata_json.history.length === 0) && <p className="text-[9px] font-bold text-slate-800 uppercase text-center py-4">No audit logs</p>}
                                 </div>
                              </section>
                           </div>
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

const ExecutiveChart = ({ tasks }: { tasks: any[] }) => {
  const [selectedPoint, setSelectedPoint] = useState<any>(null)

  const data = useMemo(() => {
    if (!tasks || tasks.length === 0) return []
    const times = tasks.flatMap(t => [new Date(t.start_date).getTime(), new Date(t.end_date).getTime()]).filter(t => !isNaN(t))
    if (times.length === 0) return []
    
    const start = startOfMonth(new Date(Math.min(...times)))
    const end = endOfMonth(addDays(new Date(Math.max(...times)), 30))
    const interval = eachDayOfInterval({ start, end })
    
    // Calculate velocity based on weekly completion rate
    return interval.filter((_, i) => i % 7 === 0).map(date => {
      const totalTasks = tasks.length
      const scheduledTasks = tasks.filter(t => new Date(t.end_date) <= date).length
      const completedTasks = tasks.filter(t => t.status === 'Completed' && new Date(t.end_date) <= date).length
      
      const scheduledPercent = Math.round((scheduledTasks / totalTasks) * 100)
      const actualPercent = Math.round((completedTasks / totalTasks) * 100)
      
      // Calculate momentum (slope of completion)
      const tasksToComplete = tasks.filter(t => isSameDay(new Date(t.end_date), date))

      return { 
        date: format(date, 'MMM d'), 
        fullDate: date,
        scheduled: scheduledPercent, 
        actual: actualPercent,
        tasks: tasksToComplete
      }
    })
  }, [tasks])

  return (
    <div className="h-full w-full bg-[#0a0c14] p-8 flex flex-col gap-6 overflow-hidden">
       <div className="flex items-center justify-between shrink-0">
          <div>
             <h3 className="text-xl font-bold text-white uppercase tracking-tighter flex items-center gap-3">
                <TrendingUp className="text-emerald-500" size={24} />
                Strategic Velocity Vector
             </h3>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time execution momentum vs theoretical plan</p>
          </div>
          <div className="flex gap-6">
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500/50 border border-blue-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Target Velocity</span></div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500/50 border border-emerald-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Actual Momentum</span></div>
          </div>
       </div>
       <div className="flex-1 min-h-0 relative">
          <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={data} onClick={(e: any) => e?.activePayload && setSelectedPoint(e.activePayload[0].payload)}>
                <defs>
                   <linearGradient id="colorSched" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                   <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#475569" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <RechartsTooltip 
                   contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }} 
                   itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="scheduled" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSched)" activeDot={{ r: 6, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" activeDot={{ r: 6, strokeWidth: 0 }} />
             </AreaChart>
          </ResponsiveContainer>

          <AnimatePresence>
            {selectedPoint && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute top-0 right-0 w-64 bg-[#0f172a] border border-white/10 rounded-lg p-4 shadow-2xl z-50 overflow-hidden flex flex-col max-h-full">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{selectedPoint.date} Milestones</h4>
                  <button onClick={() => setSelectedPoint(null)} className="text-slate-500 hover:text-white"><X size={14}/></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                  {selectedPoint.tasks.length > 0 ? selectedPoint.tasks.map((t: any) => (
                    <div key={t.id} className="p-2 bg-white/5 rounded border border-white/5">
                      <p className="text-[10px] font-bold text-white truncate">{t.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[8px] font-bold text-slate-500 uppercase">{t.status}</span>
                        <span className="text-[8px] font-bold text-blue-400">{t.progress}%</span>
                      </div>
                    </div>
                  )) : <p className="text-[10px] text-slate-600 font-bold uppercase py-4 text-center">No completions scheduled</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
       </div>
    </div>
  )
}

const DiagramBuilder = ({ data, onChange, onSave }: any) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(data?.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(data?.edges || [])

  const onConnect = (params: Connection) => {
    const newEdges = addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }, style: { stroke: '#3b82f6', strokeWidth: 2 } }, edges)
    setEdges(newEdges)
  }

  const addNode = (type: string, label: string, color: string) => {
    setNodes([...nodes, { 
      id: Date.now().toString(), 
      type, 
      data: { label }, 
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      style: { background: '#1a1b26', color: '#fff', border: `2px solid ${color}`, fontSize: '10px', fontWeight: 'bold', borderRadius: type === 'circle' ? '50%' : '8px', width: 120, height: type === 'circle' ? 120 : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 15px ${color}40` }
    }])
  }

  useEffect(() => {
    onChange({ nodes, edges })
  }, [nodes, edges])

  return (
    <div className="h-[600px] bg-[#0a0c14] border border-white/5 rounded-xl overflow-hidden relative group">
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView theme="dark">
        <Background color="#1e293b" gap={20} /><Controls /><MiniMap nodeStrokeColor="#3b82f6" nodeColor="#1e293b" maskColor="rgba(0,0,0,0.5)" />
      </ReactFlow>
      <div className="absolute top-4 left-4 flex flex-col gap-2">
         <div className="flex gap-2 bg-black/50 p-2 rounded-lg backdrop-blur-md border border-white/10">
            <button onClick={() => addNode('default', 'PROCESS', '#3b82f6')} className="p-2 hover:bg-blue-600/20 text-blue-400 rounded transition-all" title="Process/CPU"><Cpu size={16}/></button>
            <button onClick={() => addNode('circle', 'DATA', '#10b981')} className="p-2 hover:bg-emerald-600/20 text-emerald-400 rounded transition-all" title="Data/Database"><Database size={16}/></button>
            <button onClick={() => addNode('input', 'SOURCE', '#f59e0b')} className="p-2 hover:bg-amber-600/20 text-amber-400 rounded transition-all" title="Source/Maximize"><Maximize2 size={16}/></button>
            <button onClick={() => addNode('output', 'SINK', '#ef4444')} className="p-2 hover:bg-rose-600/20 text-rose-400 rounded transition-all" title="Sink/Minimize"><Minimize2 size={16}/></button>
         </div>
      </div>
      {onSave && (
        <div className="absolute bottom-4 right-4"><button onClick={onSave} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg flex items-center gap-2"><Save size={14} /> Commit Design</button></div>
      )}
    </div>
  )
}

const WorkbenchView = ({ project, onUpdate, isEditing, devices, services, options, users }: any) => {
  const [name, setName] = useState(project?.name || '')
  const [problemStatement, setProblemStatement] = useState(project?.problem_statement || '')
  const [objective, setObjective] = useState(project?.objective || '')
  const [isPasting, setIsPasting] = useState(false)
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [isAddingLink, setIsAddingLink] = useState(false)
  const [activeDiagramIndex, setActiveDiagramIndex] = useState<number | null>(null)

  useEffect(() => {
    setName(project?.name || '')
    setProblemStatement(project?.problem_statement || '')
    setObjective(project?.objective || '')
  }, [project])

  const handleFieldChange = (field: string, value: any) => {
    if (project && project[field] !== value) onUpdate({ ...project, [field]: value })
  }

  // Cascading Logic & Option Prioritization
  const systemOptions = useMemo(() => options?.filter((o:any) => o.category === 'LogicalSystem') || [], [options])
  const typeOptions = useMemo(() => options?.filter((o:any) => o.category === 'ProjectType') || [{ value: '1', label: '1' }, { value: '2', label: '2' }], [options])
  const userOptions = useMemo(() => users?.map((u:any) => ({ value: u.id.toString(), label: u.full_name || u.username })) || [], [users])

  const sortedSystemOptions = useMemo(() => {
    const selected = project?.target_systems || []
    return [...systemOptions].sort((a, b) => {
      const aSel = selected.includes(a.value)
      const bSel = selected.includes(b.value)
      if (aSel && !bSel) return -1
      if (!aSel && bSel) return 1
      return 0
    })
  }, [systemOptions, project?.target_systems])

  const filteredAssets = useMemo(() => {
    const base = !project?.target_systems?.length ? devices : devices?.filter((d:any) => project.target_systems.includes(d.system))
    const selected = project?.target_assets || []
    return [...(base || [])].sort((a, b) => {
      const aSel = selected.includes(a.id)
      const bSel = selected.includes(b.id)
      if (aSel && !bSel) return -1
      if (!aSel && bSel) return 1
      return 0
    })
  }, [devices, project?.target_systems, project?.target_assets])

  const filteredServices = useMemo(() => {
    const base = !project?.target_assets?.length ? services : services?.filter((s:any) => project.target_assets.includes(s.device_id))
    const selected = project?.target_services || []
    return [...(base || [])].sort((a, b) => {
      const aSel = selected.includes(a.id)
      const bSel = selected.includes(b.id)
      if (aSel && !bSel) return -1
      if (!aSel && bSel) return 1
      return 0
    })
  }, [services, project?.target_assets, project?.target_services])

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (!project || !isEditing) return
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (event) => {
            const base64 = event.target?.result as string
            const metadata = project?.metadata_json || {}
            const updatedImages = [...(metadata.images || []), base64]
            onUpdate({ ...project, metadata_json: { ...metadata, images: updatedImages } })
            toast.success('Artifact Captured')
            setIsPasting(false)
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }, [project, onUpdate, isEditing])

  if (!project) return (
    <div className="h-full flex flex-col items-center justify-center opacity-20">
       <Briefcase size={64} className="mb-4" />
       <h2 className="text-xl font-bold uppercase tracking-widest">Select Strategic Vector</h2>
    </div>
  )

  return (
    <div className="max-w-full mx-auto space-y-10 pb-20" onPaste={handlePaste}>
       <section className="bg-white/5 rounded-lg border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 bg-[#0a0c14]/50">
             <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <Target size={14} /> Strategic Identity
             </h4>
             <div className="grid grid-cols-3 gap-8">
                <div className="col-span-1 space-y-2">
                   <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Vector Title</label>
                   {isEditing ? (
                     <input 
                       value={name} 
                       onChange={e => setName(e.target.value)}
                       onBlur={() => handleFieldChange('name', name)}
                       className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all"
                     />
                   ) : (
                     <p className="text-xl font-bold text-white tracking-tighter px-1">{project.name}</p>
                   )}
                </div>
                <div className="space-y-2">
                   {isEditing ? (
                     <StyledSelect 
                       label="Status"
                       value={project.status}
                       onChange={e => handleFieldChange('status', e.target.value)}
                       options={PROJECT_STATUSES}
                     />
                   ) : (
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Status</label>
                        <div className="flex items-center gap-2 px-1">
                           <StatusPill status={project.status} />
                        </div>
                     </div>
                   )}
                </div>
                <div className="space-y-2">
                   {isEditing ? (
                     <StyledSelect 
                       label="Priority"
                       value={project.priority}
                       onChange={e => handleFieldChange('priority', e.target.value)}
                       options={PROJECT_PRIORITIES}
                     />
                   ) : (
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Priority</label>
                        <p className="text-xs font-bold text-amber-500 uppercase tracking-widest px-1">{project.priority}</p>
                     </div>
                   )}
                </div>
             </div>
          </div>

          <div className="p-8 grid grid-cols-2 gap-10">
             <section className="space-y-3">
                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2"><Clipboard size={14} /> Problem Statement</h4>
                <div className={`bg-white/5 p-6 rounded-lg border transition-all min-h-[120px] ${isEditing ? 'border-blue-500/30' : 'border-white/5'}`}>
                   {isEditing ? (
                     <textarea value={problemStatement} onChange={e => setProblemStatement(e.target.value)} onBlur={() => handleFieldChange('problem_statement', problemStatement)} className="w-full h-full bg-transparent border-none outline-none text-xs font-bold text-slate-300 leading-relaxed resize-none" placeholder="Define strategic friction..." />
                   ) : (
                     <p className="text-xs font-bold text-slate-400 leading-relaxed whitespace-pre-wrap">{project.problem_statement || 'No problem statement defined.'}</p>
                   )}
                </div>
             </section>
             <section className="space-y-3">
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2"><Target size={14} /> Mission Objective</h4>
                <div className={`bg-white/5 p-6 rounded-lg border transition-all min-h-[120px] ${isEditing ? 'border-emerald-500/30' : 'border-white/5'}`}>
                   {isEditing ? (
                     <textarea value={objective} onChange={e => setObjective(e.target.value)} onBlur={() => handleFieldChange('objective', objective)} className="w-full h-full bg-transparent border-none outline-none text-xs font-bold text-slate-300 leading-relaxed resize-none" placeholder="Define target end state..." />
                   ) : (
                     <p className="text-xs font-bold text-slate-400 leading-relaxed whitespace-pre-wrap">{project.objective || 'No mission objective defined.'}</p>
                   )}
                </div>
             </section>
          </div>

          <div className="p-8 grid grid-cols-2 gap-10 bg-[#0a0c14]/30 border-t border-white/5">
             <div className="space-y-2">
                {isEditing ? (
                  <StyledSelect 
                    label="Lead Architect"
                    value={project.owner || ''}
                    onChange={e => handleFieldChange('owner', e.target.value)}
                    options={userOptions}
                    placeholder="Assign lead..."
                  />
                ) : (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Lead Architect</label>
                    <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                       <span className="text-xs font-bold text-slate-300">{userOptions.find(o => o.value === project.owner)?.label || project.owner || 'Unassigned'}</span>
                    </div>
                  </div>
                )}
             </div>
             <div className="space-y-2">
                {isEditing ? (
                  <StyledSelect 
                    label="Classification"
                    value={project.type || ''}
                    onChange={e => handleFieldChange('type', e.target.value)}
                    options={typeOptions}
                    placeholder="Select classification..."
                  />
                ) : (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Classification</label>
                    <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                       <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">{project.type || 'N/A'}</span>
                    </div>
                  </div>
                )}
             </div>
          </div>

          <div className="p-8 border-t border-white/5">
             <label className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                <Sliders size={14} /> Context & Target Boundaries
             </label>
             <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                   <label className="text-[8px] font-bold text-slate-500 uppercase px-1">Strategic Systems</label>
                   <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar bg-black/40 border border-white/10 rounded-lg p-2">
                      {isEditing ? (
                        sortedSystemOptions.map((o:any) => (
                           <label key={o.value} className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all cursor-pointer ${project.target_systems?.includes(o.value) ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 text-slate-500 hover:text-slate-300'}`}>
                              <input 
                                type="checkbox" 
                                checked={project.target_systems?.includes(o.value)} 
                                onChange={e => {
                                   const current = project.target_systems || []
                                   const updated = e.target.checked ? [...current, o.value] : current.filter((x:any) => x !== o.value)
                                   onUpdate({ ...project, target_systems: updated })
                                }}
                                className="rounded border-white/10 bg-black/40 text-blue-600 focus:ring-blue-600"
                              />
                              <span className="text-[9px] font-bold uppercase tracking-tight truncate">{o.label}</span>
                           </label>
                        ))
                      ) : (
                        project.target_systems?.length > 0 ? (
                          project.target_systems.map((id: string) => {
                            const label = systemOptions.find(o => o.value === id)?.label || id
                            return <div key={id} className="px-2 py-1.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded text-[9px] font-bold uppercase truncate">{label}</div>
                          })
                        ) : <div className="p-4 text-center text-[9px] font-bold text-slate-700 uppercase">None selected</div>
                      )}
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[8px] font-bold text-slate-500 uppercase px-1">Impacted Assets</label>
                   <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar bg-black/40 border border-white/10 rounded-lg p-2">
                      {isEditing ? (
                        filteredAssets.map((d:any) => (
                           <label key={d.id} className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all cursor-pointer ${project.target_assets?.includes(d.id) ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 text-slate-500 hover:text-slate-300'}`}>
                              <input 
                                type="checkbox" 
                                checked={project.target_assets?.includes(d.id)} 
                                onChange={e => {
                                   const current = project.target_assets || []
                                   const updated = e.target.checked ? [...current, d.id] : current.filter((x:any) => x !== d.id)
                                   onUpdate({ ...project, target_assets: updated })
                                }}
                                className="rounded border-white/10 bg-black/40 text-blue-600 focus:ring-blue-600"
                              />
                              <span className="text-[9px] font-bold uppercase tracking-tight truncate">{d.name}</span>
                           </label>
                        ))
                      ) : (
                        project.target_assets?.length > 0 ? (
                          project.target_assets.map((id: number) => {
                            const name = devices?.find((d:any) => d.id === id)?.name || `Asset #${id}`
                            return <div key={id} className="px-2 py-1.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded text-[9px] font-bold uppercase truncate">{name}</div>
                          })
                        ) : <div className="p-4 text-center text-[9px] font-bold text-slate-700 uppercase">None selected</div>
                      )}
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[8px] font-bold text-slate-500 uppercase px-1">Core Services</label>
                   <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar bg-black/40 border border-white/10 rounded-lg p-2">
                      {isEditing ? (
                        filteredServices.map((s:any) => (
                           <label key={s.id} className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all cursor-pointer ${project.target_services?.includes(s.id) ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 text-slate-500 hover:text-slate-300'}`}>
                              <input 
                                type="checkbox" 
                                checked={project.target_services?.includes(s.id)} 
                                onChange={e => {
                                   const current = project.target_services || []
                                   const updated = e.target.checked ? [...current, s.id] : current.filter((x:any) => x !== s.id)
                                   onUpdate({ ...project, target_services: updated })
                                }}
                                className="rounded border-white/10 bg-black/40 text-blue-600 focus:ring-blue-600"
                              />
                              <span className="text-[9px] font-bold uppercase tracking-tight truncate">{s.name}</span>
                           </label>
                        ))
                      ) : (
                        project.target_services?.length > 0 ? (
                          project.target_services.map((id: number) => {
                            const name = services?.find((s:any) => s.id === id)?.name || `Service #${id}`
                            return <div key={id} className="px-2 py-1.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded text-[9px] font-bold uppercase truncate">{name}</div>
                          })
                        ) : <div className="p-4 text-center text-[9px] font-bold text-slate-700 uppercase">None selected</div>
                      )}
                   </div>
                </div>
             </div>
          </div>
       </section>

       <div className="grid grid-cols-2 gap-10">
          <section className="space-y-4">
             <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2"><Link2 size={14} /> Jira Link(s)</h4>
             <div className="space-y-2">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input 
                        value={newLinkLabel} 
                        onChange={e => setNewLinkLabel(e.target.value)} 
                        className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-white outline-none" 
                        placeholder="Label (e.g. PROJ-123)"
                      />
                      <input 
                        value={newLinkUrl} 
                        onChange={e => setNewLinkUrl(e.target.value)} 
                        className="flex-[2] bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-white outline-none" 
                        placeholder="Link URL"
                      />
                      <button 
                        onClick={() => {
                          if (!newLinkLabel || !newLinkUrl) return
                          const metadata = project?.metadata_json || {}
                          const links = [...(metadata.links || []), { label: newLinkLabel, url: newLinkUrl }]
                          onUpdate({ ...project, metadata_json: { ...metadata, links } })
                          setNewLinkLabel(''); setNewLinkUrl('')
                        }}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all"
                      ><Plus size={16}/></button>
                    </div>
                    <div className="space-y-1">
                      {(project.metadata_json?.links || []).map((link: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5">
                          <span className="text-[9px] font-bold text-slate-300">{link.label}</span>
                          <button onClick={() => {
                            const metadata = project.metadata_json || {}
                            const links = metadata.links.filter((_:any, idx:number) => idx !== i)
                            onUpdate({ ...project, metadata_json: { ...metadata, links } })
                          }} className="text-rose-500 hover:text-rose-400"><Trash2 size={12}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {(project.metadata_json?.links || []).map((link: any, i: number) => (
                      <a key={i} href={link.url} target="_blank" rel="noreferrer" className="p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-all flex justify-between items-center group">
                        <span className="text-[10px] font-bold text-blue-400 uppercase">{link.label}</span>
                        <ExternalLink size={12} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                      </a>
                    ))}
                    {(!project.metadata_json?.links || project.metadata_json.links.length === 0) && <p className="text-[10px] font-bold text-slate-600 uppercase px-1">No linked records</p>}
                  </div>
                )}
             </div>
          </section>

          <section className="space-y-4">
             <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2"><Users size={14} /> Stakeholders</h4>
             {isEditing ? (
               <div className="space-y-2">
                 <label className="text-[8px] font-bold text-slate-600 uppercase px-1">Comma-separated team names</label>
                 <input 
                   value={project.stakeholders || ''}
                   onChange={e => handleFieldChange('stakeholders', e.target.value)}
                   className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-all"
                   placeholder="Security, Infra, DevOps..."
                 />
               </div>
             ) : (
               <div className="flex flex-wrap gap-2">
                 {(project.stakeholders || "None").split(',').map((s: string, i: number) => (
                   <div key={i} className="px-3 py-1.5 bg-emerald-600/10 border border-emerald-500/20 rounded-lg text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                      {s.trim()}
                   </div>
                 ))}
               </div>
             )}
          </section>
       </div>

       <div className="space-y-8">
          <div className="flex items-center justify-between">
             <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2"><Workflow size={14} /> Designs</h4>
             {isEditing && (
               <button 
                 onClick={() => {
                   const metadata = project?.metadata_json || {}
                   const newDiagrams = [...(metadata.diagrams || []), { id: Date.now(), name: `Design v${(metadata.diagrams || []).length + 1}`, nodes: [], edges: [] }]
                   onUpdate({ ...project, metadata_json: { ...metadata, diagrams: newDiagrams } })
                   setActiveDiagramIndex(newDiagrams.length - 1)
                 }}
                 className="px-3 py-1 bg-amber-600/10 border border-amber-500/20 text-amber-500 hover:bg-amber-600 hover:text-white rounded text-[8px] font-bold uppercase tracking-widest transition-all"
               >+ New Design</button>
             )}
          </div>
          <div className="space-y-4">
             {(project?.metadata_json?.diagrams || []).map((d: any, idx: number) => (
               <div key={d.id} className="border border-white/5 rounded-lg bg-[#12141f] overflow-hidden">
                  <button onClick={() => setActiveDiagramIndex(activeDiagramIndex === idx ? null : idx)} className="w-full px-6 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-all">
                     <div className="flex items-center gap-3"><GitBranch size={14} className="text-amber-400" /><span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">{d.name}</span></div>
                     <ChevronRight size={14} className={`text-slate-500 transition-transform ${activeDiagramIndex === idx ? 'rotate-90' : ''}`} />
                  </button>
                  <AnimatePresence>
                     {activeDiagramIndex === idx && (
                       <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <DiagramBuilder data={d} onChange={(updated: any) => {
                            if (!isEditing) return
                            const metadata = project?.metadata_json || {}
                            const newDiagrams = [...(metadata.diagrams || [])]
                            newDiagrams[idx] = { ...newDiagrams[idx], ...updated }
                            onUpdate({ ...project, metadata_json: { ...metadata, diagrams: newDiagrams } })
                          }} onSave={isEditing ? () => { setActiveDiagramIndex(null); toast.success('Vector Baseline Committed'); } : undefined} />
                       </motion.div>
                     )}
                  </AnimatePresence>
               </div>
             ))}
             {(!project?.metadata_json?.diagrams || project.metadata_json.diagrams.length === 0) && (
               <div className="py-12 border-2 border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center opacity-30">
                  <Workflow size={32} className="mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No designs created</p>
               </div>
             )}
          </div>
       </div>

       <div className="grid grid-cols-1 gap-8">
          <section className="space-y-4">
             <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2"><ImageIcon size={14} /> Images</h4>
             <div className="grid grid-cols-4 gap-4">
                {(project?.metadata_json?.images || []).map((img: string, i: number) => (
                  <div key={i} className="aspect-video bg-white/5 rounded-lg border border-white/5 overflow-hidden group relative">
                     <img src={img} alt="Artifact" className="w-full h-full object-cover" />
                     {isEditing && (
                       <button onClick={() => {
                         const metadata = project?.metadata_json || {}
                         const updated = metadata.images.filter((_:any, idx:number) => idx !== i)
                         onUpdate({ ...project, metadata_json: { ...metadata, images: updated } })
                       }} className="absolute top-2 right-2 p-1.5 bg-rose-600 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all shadow-xl"><Trash2 size={14}/></button>
                     )}
                  </div>
                ))}
                {isEditing && (
                  <button 
                    onClick={() => setIsPasting(true)}
                    className={`aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all ${isPasting ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-white/5 text-slate-700 hover:text-blue-500'}`}
                  >
                     <Camera size={24} className="mb-2 opacity-30" />
                     <span className="text-[8px] font-bold uppercase tracking-widest text-center">{isPasting ? 'PASTE NOW (CTRL+V)' : 'Capture Artifact'}</span>
                  </button>
                )}
             </div>
          </section>
       </div>

       <div className="grid grid-cols-1 gap-8">
          <section className="space-y-4">
             <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2"><Link2 size={14} /> References</h4>
             <div className="grid grid-cols-2 gap-4">
                {(project?.metadata_json?.references || []).map((ref: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 group">
                     <a href={ref.url} target="_blank" rel="noreferrer" className="flex-1 p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-all flex justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase truncate">{ref.label}</span>
                        <ExternalLink size={12} className="text-slate-600" />
                     </a>
                     {isEditing && (
                       <button onClick={() => {
                         const metadata = project?.metadata_json || {}
                         const updated = metadata.references.filter((_:any, idx:number) => idx !== i)
                         onUpdate({ ...project, metadata_json: { ...metadata, references: updated } })
                       }} className="p-3 bg-rose-600/10 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                     )}
                  </div>
                ))}
                {isEditing && (
                  <button 
                    onClick={() => {
                      const label = prompt('Reference Label')
                      const url = prompt('Reference URL')
                      if (label && url) {
                        const metadata = project?.metadata_json || {}
                        const references = [...(metadata.references || []), { label, url }]
                        onUpdate({ ...project, metadata_json: { ...metadata, references } })
                      }
                    }}
                    className="w-full py-3 border border-dashed border-white/5 rounded-lg text-[8px] font-bold text-slate-700 uppercase hover:text-blue-500 transition-all"
                  >Establish Reference Link</button>
                )}
             </div>
          </section>
       </div>
    </div>
  )
}

const ProjectActivityStream = ({ project, allProjects = [] }: any) => {
  const activities = useMemo(() => {
    const list = project 
      ? [...(project?.tasks || []).flatMap((t:any) => (t?.metadata_json?.history || []).map((h:any) => ({ ...h, taskName: t?.name })))]
      : allProjects.flatMap((p:any) => (p?.tasks || []).flatMap((t:any) => (t?.metadata_json?.history || []).map((h:any) => ({ ...h, taskName: t?.name, projectName: p?.name }))))
    return list.sort((a:any, b:any) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime())
  }, [project, allProjects])

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
       <div className="flex items-center gap-3"><History size={20} className="text-blue-400" /><h3 className="text-lg font-bold text-white uppercase tracking-tighter">Strategic Activity Stream</h3></div>
       <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
          {activities.map((item:any, i:number) => (
            <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-lg space-y-2">
               <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{item.author || item.asked_by || 'SYSTEM'} {item.projectName && `@ ${item.projectName}`}</span>
                  <span className="text-[8px] font-bold text-slate-600 uppercase">{format(new Date(item.timestamp || item.created_at), 'MMM d, HH:mm')}</span>
               </div>
               <p className="text-[11px] font-bold text-slate-300 leading-relaxed">"{item.content || item.question || item.message}"</p>
               {item.taskName && <p className="text-[8px] font-bold text-amber-500 uppercase tracking-widest"># {item.taskName}</p>}
            </div>
          ))}
          {activities.length === 0 && <div className="py-20 text-center text-slate-700 font-bold uppercase tracking-[0.2em] opacity-30">No activity recorded</div>}
       </div>
    </div>
  )
}

export const ProjectForm = ({ initialData, onSave, isSaving, onCancel, devices, services, options }: any) => {
  const [formData, setFormData] = useState({ 
    name: '', type: 'Strategic', status: 'Planning', priority: 'Medium', owner: '', 
    problem_statement: '', objective: '', description: '', start_date: new Date().toISOString(), end_date: addDays(new Date(), 90).toISOString(),
    man_hours_saved: 0, stoploss_minutes_saved: 0, wafers_gained: 0, roi_defense_line: 0, roi_types: [], jira_links: [], 
    target_systems: [], target_assets: [], target_services: [], ...initialData 
  })
  const [jiraInput, setJiraInput] = useState((formData.jira_links || []).join(', '))

  // Cascading Logic
  const systemOptions = options?.filter((o:any) => o.category === 'LogicalSystem') || []
  const filteredAssets = useMemo(() => {
    if (!formData.target_systems?.length) return devices || []
    return devices?.filter((d:any) => formData.target_systems.includes(d.system)) || []
  }, [devices, formData.target_systems])

  const filteredServices = useMemo(() => {
    if (!formData.target_assets?.length) return services || []
    return services?.filter((s:any) => formData.target_assets.includes(s.device_id)) || []
  }, [services, formData.target_assets])

  const years = Array.from({ length: 11 }, (_, i) => 2024 + i)
  const months = [
    { v: 0, l: 'JAN' }, { v: 1, l: 'FEB' }, { v: 2, l: 'MAR' }, { v: 3, l: 'APR' },
    { v: 4, l: 'MAY' }, { v: 5, l: 'JUN' }, { v: 6, l: 'JUL' }, { v: 7, l: 'AUG' },
    { v: 8, l: 'SEP' }, { v: 9, l: 'OCT' }, { v: 10, l: 'NOV' }, { v: 11, l: 'DEC' }
  ]

  const handleDateChange = (type: 'start' | 'end', part: 'month' | 'year', val: number) => {
    const d = new Date(formData[`${type}_date`] || new Date())
    if (part === 'month') d.setMonth(val)
    else d.setFullYear(val)
    setFormData({ ...formData, [`${type}_date`]: d.toISOString() })
  }

  const startDate = new Date(formData.start_date || new Date())
  const endDate = new Date(formData.end_date || new Date())

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-8 bg-[#0a0c14]/50 rounded-lg border border-white/5 shadow-2xl mt-4">
       <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center border border-blue-500/20"><Briefcase size={20} className="text-blue-400" /></div><div><h3 className="text-lg font-bold uppercase text-white tracking-tighter">Strategic Matrix Configuration</h3></div></div>
       <div className="grid grid-cols-2 gap-8">
          <div className="space-y-5">
             <div><label className="text-[9px] font-bold text-slate-600 uppercase mb-1.5 block">Project Identifier</label><input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500" placeholder="Enter project name..."/></div>
             <div className="grid grid-cols-2 gap-4"><StyledSelect label="Type" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} options={PROJECT_TYPES} /><StyledSelect label="Priority" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} options={PROJECT_PRIORITIES} /></div>
             <div className="grid grid-cols-2 gap-4"><StyledSelect label="Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={PROJECT_STATUSES} /><div><label className="text-[9px] font-bold text-slate-600 uppercase mb-1.5 block">Lead Owner</label><input value={formData.owner} onChange={e => setFormData({ ...formData, owner: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"/></div></div>
             
             <div className="space-y-4 pt-4 border-t border-white/5">
                <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={14} /> Timeline parameters</label>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Initialization</label>
                      <div className="flex gap-2">
                         <select value={startDate.getMonth()} onChange={e => handleDateChange('start', 'month', parseInt(e.target.value))} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold text-white outline-none">{months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}</select>
                         <select value={startDate.getFullYear()} onChange={e => handleDateChange('start', 'year', parseInt(e.target.value))} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold text-white outline-none">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Termination</label>
                      <div className="flex gap-2">
                         <select value={endDate.getMonth()} onChange={e => handleDateChange('end', 'month', parseInt(e.target.value))} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold text-white outline-none">{months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}</select>
                         <select value={endDate.getFullYear()} onChange={e => handleDateChange('end', 'year', parseInt(e.target.value))} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold text-white outline-none">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-5">
             <div className="bg-white/[0.02] p-5 rounded-lg border border-white/5 space-y-4">
                <h4 className="text-[9px] font-bold text-blue-400 uppercase mb-1 flex items-center gap-2"><BarChart3 size={12} /> Strategic Impact Metrics</h4>
                <div className="grid grid-cols-2 gap-4"><StyledSelect label="Defense Line" value={formData.roi_defense_line} onChange={e => setFormData({...formData, roi_defense_line: parseInt(e.target.value)})} options={DEFENSE_LINES} /><div><label className="text-[9px] font-bold text-slate-600 uppercase mb-1.5 block">Man-Hours Saved</label><input type="number" value={formData.man_hours_saved} onChange={e => setFormData({...formData, man_hours_saved: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-1.5 text-xs font-bold text-white outline-none" /></div></div>
                <div><label className="text-[9px] font-bold text-slate-600 uppercase mb-1.5 block">Jira References</label><input value={jiraInput} onChange={e => { setJiraInput(e.target.value); setFormData({ ...formData, jira_links: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }) }} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none" placeholder="e.g. PROJ-123, PROJ-456"/></div>
             </div>

             <div className="space-y-4 pt-4 border-t border-white/5">
                <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2"><Sliders size={14} /> Context boundaries</label>
                <div className="grid grid-cols-3 gap-4">
                   <div className="space-y-2">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Systems</label>
                      <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar bg-black/40 border border-white/10 rounded-lg p-2">
                         {systemOptions.map((o:any) => (
                            <label key={o.value} className="flex items-center gap-2 group cursor-pointer">
                               <input type="checkbox" checked={formData.target_systems?.includes(o.value)} onChange={e => {
                                  const current = formData.target_systems || []
                                  const updated = e.target.checked ? [...current, o.value] : current.filter((x:any) => x !== o.value)
                                  setFormData({ ...formData, target_systems: updated })
                               }} className="rounded border-white/10 bg-black/40 text-blue-600"/><span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-200 uppercase">{o.label}</span>
                            </label>
                         ))}
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Assets</label>
                      <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar bg-black/40 border border-white/10 rounded-lg p-2">
                         {filteredAssets.map((d:any) => (
                            <label key={d.id} className="flex items-center gap-2 group cursor-pointer">
                               <input type="checkbox" checked={formData.target_assets?.includes(d.id)} onChange={e => {
                                  const current = formData.target_assets || []
                                  const updated = e.target.checked ? [...current, d.id] : current.filter((x:any) => x !== d.id)
                                  setFormData({ ...formData, target_assets: updated })
                               }} className="rounded border-white/10 bg-black/40 text-blue-600"/><span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-200 uppercase truncate">{d.name}</span>
                            </label>
                         ))}
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Services</label>
                      <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar bg-black/40 border border-white/10 rounded-lg p-2">
                         {filteredServices.map((s:any) => (
                            <label key={s.id} className="flex items-center gap-2 group cursor-pointer">
                               <input type="checkbox" checked={formData.target_services?.includes(s.id)} onChange={e => {
                                  const current = formData.target_services || []
                                  const updated = e.target.checked ? [...current, s.id] : current.filter((x:any) => x !== s.id)
                                  setFormData({ ...formData, target_services: updated })
                               }} className="rounded border-white/10 bg-black/40 text-blue-600"/><span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-200 uppercase truncate">{s.name}</span>
                            </label>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
          </div>
       </div>
       <div className="flex gap-4 pt-4"><button onClick={onCancel} className="flex-1 py-3 bg-white/5 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all">Abort</button><button disabled={isSaving || !formData.name} onClick={() => onSave(formData)} className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all">{isSaving ? 'Establishing Link...' : 'Commit Strategic Vector'}</button></div>
    </div>
  )
}

export default function Projects() {
  const queryClient = useQueryClient()
  const { data: projects, isLoading } = useQuery({ 
    queryKey: ['projects'], 
    queryFn: () => apiFetch('/api/v1/projects').then(r => r.json()),
    placeholderData: (prev) => prev
  })

  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: () => apiFetch('/api/v1/devices').then(r => r.json()) })
  const { data: services } = useQuery({ queryKey: ['logical-services'], queryFn: () => apiFetch('/api/v1/logical-services').then(r => r.json()) })
  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: () => apiFetch('/api/v1/settings/options').then(r => r.json()) })
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => apiFetch('/api/v1/operators').then(r => r.json()) })

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'WORKSPACE' | 'GANTT' | 'ACTIVITY'>('WORKSPACE')
  const [isGlobalEditing, setIsGlobalEditing] = useState(false)
  const [draftProject, setDraftProject] = useState<any>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isLedgerCollapsed, setIsLedgerCollapsed] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [railWidth, setRailWidth] = useState(260)
  const [ledgerWidth, setLedgerWidth] = useState(300)
  const [pendingNav, setPendingNav] = useState<any>(null)
  const [showConfig, setShowConfig] = useState(false)

  const selectedProject = useMemo(() => {
    return projects?.find((p:any) => p.id === selectedProjectId)
  }, [projects, selectedProjectId])

  const isDirty = useMemo(() => {
    if (!isGlobalEditing || !draftProject || !selectedProject) return false
    return JSON.stringify(draftProject) !== JSON.stringify(selectedProject)
  }, [isGlobalEditing, draftProject, selectedProject])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const mutation = useMutation({
    mutationFn: async ({ data, silent }: { data: any, silent?: boolean }) => {
      const isNew = !data.id
      const res = await apiFetch(isNew ? '/api/v1/projects' : `/api/v1/projects/${data.id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      if (!variables.silent) {
        setIsGlobalEditing(false)
        setDraftProject(null)
        toast.success('Strategic Matrix Synchronized')
      }
      if (!selectedProjectId) setSelectedProjectId(data.id)
    },
    onError: (e: any) => toast.error(e.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setSelectedProjectId(projects?.[0]?.id || null)
      setPendingNav(null)
      toast.success('Project Decommissioned')
    }
  })

  useEffect(() => { 
    if (projects?.length > 0 && !selectedProjectId) setSelectedProjectId(projects[0].id) 
  }, [projects])

  const requestTabChange = (tab: any) => {
    if (isDirty) setPendingNav({ type: 'TAB', id: tab })
    else setActiveTab(tab)
  }

  const requestProjectChange = (id: number) => {
    if (isDirty) setPendingNav({ type: 'PROJECT', id })
    else {
      setSelectedProjectId(id)
      setIsGlobalEditing(false)
      setDraftProject(null)
    }
  }

  const confirmNav = () => {
    if (!pendingNav) return
    if (pendingNav.type === 'TAB') {
      setActiveTab(pendingNav.id)
      setIsGlobalEditing(false)
      setDraftProject(null)
    } else if (pendingNav.type === 'PROJECT') {
      setSelectedProjectId(pendingNav.id)
      setIsGlobalEditing(false)
      setDraftProject(null)
    } else if (pendingNav.type === 'DELETE') {
      deleteMutation.mutate(pendingNav.id)
    }
    setPendingNav(null)
  }

  const toggleFullScreen = () => {
    const next = !isFullScreen
    setIsFullScreen(next)
    setIsSidebarCollapsed(next)
    setIsLedgerCollapsed(next)
  }

  if (isLoading && !projects) return <div className="h-full flex items-center justify-center bg-[#0a0c14]"><div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/><p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em]">Synchronizing Matrix...</p></div></div>

  return (
    <div className="h-full flex flex-col bg-[#0a0c14] overflow-hidden rounded-lg border border-white/5 shadow-2xl transition-all duration-500">
       <ProjectHUD 
         project={isGlobalEditing ? draftProject : selectedProject} 
         isEditing={isGlobalEditing}
         isDirty={isDirty}
         onEdit={() => { setDraftProject({ ...selectedProject }); setIsGlobalEditing(true); }}
         onSave={() => mutation.mutate({ data: draftProject })}
         onCancel={() => { setIsGlobalEditing(false); setDraftProject(null); }}
         onDelete={() => setPendingNav({ type: 'DELETE', id: selectedProjectId })}
         isSaving={mutation.isPending}
       />

       <div className="h-12 border-b border-white/5 bg-[#0a0c14] flex items-center px-6 justify-between shrink-0">
          <div className="flex items-center h-full">
             {[
               { id: 'WORKSPACE', icon: Target, label: 'Workbench' }, 
               { id: 'GANTT', icon: Calendar, label: 'Precision Gantt' }, 
               { id: 'ACTIVITY', icon: History, label: 'Stream' }
             ].map(tab => (
               <button key={tab.id} onClick={() => requestTabChange(tab.id as any)} className={`h-full px-6 flex items-center gap-2 border-b-2 transition-all ${activeTab === tab.id ? 'border-blue-600 text-blue-400 bg-blue-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                  <tab.icon size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
               </button>
             ))}
          </div>

          <div className="flex items-center gap-2">
             <button 
               onClick={() => setShowConfig(true)}
               className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 transition-all border border-white/5"
               title="Project Configuration"
             >
                <Settings size={16} />
             </button>
             <button 
               onClick={toggleFullScreen}
               className={`p-1.5 rounded-lg transition-all border ${isFullScreen ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:bg-white/10'}`}
               title={isFullScreen ? "Exit Full Screen" : "Full Screen View"}
             >
                <Maximize2 size={16} />
             </button>
             <div className="w-px h-4 bg-white/10 mx-1" />
             <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Operational</span>
             </div>
          </div>
       </div>

       <div className="flex-1 flex overflow-hidden">
          <ProjectRail 
            projects={projects || []} 
            selectedId={selectedProjectId} 
            onSelect={requestProjectChange} 
            onNew={() => { setSelectedProjectId(null); setIsGlobalEditing(true); setDraftProject({ name: 'New Strategic Vector', type: '', status: 'Planning', priority: 'Medium' }); }}
            onDelete={(id:number) => setPendingNav({ type: 'DELETE', id })}
            width={railWidth} onResize={setRailWidth} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
          <div className="flex-1 flex flex-col min-w-0 bg-[#0f111a] shadow-[inset_0_0_100px_rgba(0,0,0,0.3)]">
             <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                   {activeTab === 'WORKSPACE' && (
                     <motion.div key="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-10 overflow-y-auto custom-scrollbar bg-[#0a0c14]/30 backdrop-blur-sm">
                        <WorkbenchView 
                          project={isGlobalEditing ? draftProject : selectedProject} 
                          onUpdate={setDraftProject} 
                          isEditing={isGlobalEditing}
                          devices={devices || []}
                          services={services || []}
                          options={options || []}
                          users={users || []}
                        />
                     </motion.div>
                   )}
                   {activeTab === 'GANTT' && <motion.div key="gantt" className="h-full"><PrecisionGantt project={selectedProject} onUpdate={(data: any) => mutation.mutate({ data, silent: true })} /></motion.div>}
                   {activeTab === 'ACTIVITY' && <motion.div key="activity" className="h-full"><ProjectActivityStream project={selectedProject} allProjects={projects || []} /></motion.div>}
                </AnimatePresence>
             </div>
          </div>
          <ProjectLedger 
            project={isGlobalEditing ? draftProject : selectedProject} 
            width={ledgerWidth} 
            onResize={setLedgerWidth} 
            isCollapsed={isLedgerCollapsed} 
            onToggleCollapse={() => setIsLedgerCollapsed(!isLedgerCollapsed)}
            isEditing={isGlobalEditing}
            onUpdate={setDraftProject}
          />
       </div>

       {/* Confirmation Modals */}
       <AnimatePresence>
         {pendingNav && (
           <ConfirmationModal 
             isOpen={true} 
             title={pendingNav.type === 'DELETE' ? "Decommission Strategic Stream" : "Unsaved Strategic Data"} 
             message={pendingNav.type === 'DELETE' ? "Are you certain? This action permanently removes all milestones and ROI data." : "You have uncommitted changes in the strategic matrix. Leaving now will discard these updates."}
             onConfirm={confirmNav} 
             onClose={() => setPendingNav(null)} 
             variant={pendingNav.type === 'DELETE' ? "danger" : "default"}
             confirmText={pendingNav.type === 'DELETE' ? "Decommission" : "Discard Changes"}
           />
         )}
       </AnimatePresence>

       <ConfigRegistryModal
         isOpen={showConfig}
         onClose={() => setShowConfig(false)}
         title="Project Configuration"
         sections={[
             { title: "Project Types", category: "ProjectType", icon: Layers }
         ]}
       />

       <style>{`
         .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } 
         .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } 
         .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; } 
         .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
       `}</style>
    </div>
  )
}
