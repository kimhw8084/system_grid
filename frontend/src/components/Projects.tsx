import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ListTodo, History, ShieldAlert, Globe, 
  Zap, Save, X, PlusCircle, MessageSquare,
  MoreVertical, RefreshCcw, TrendingUp, AlertTriangle,
  Lightbulb, ShieldCheck, Calendar, Activity, Database, Server,
  FileText, Clipboard, Terminal, ArrowRight, Shield, Download, Share2,
  Clock, CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye, Camera, Link as LinkIcon, Link2, Layers, Settings, Check, Target, ChevronDown,
  Workflow, ExternalLink, Briefcase, BarChart3, Users, DollarSign, Image as ImageIcon, BookOpen, Filter,
  Maximize2, Minimize2, PanelLeft, PanelRight, MousePointer2, GitBranch, Binary, Cpu, Network, Activity as ActivityIcon, ScrollText, GripVertical, Layout,
  Projector, Tag
} from 'lucide-react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { apiClient } from '../api/apiClient'
import { toast } from 'react-hot-toast'
import { StatusPill } from './shared/StatusPill'
import StyledSelect from './shared/StyledSelect'
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, addEdge, Connection, MarkerType, Handle, Position } from 'reactflow'
import 'reactflow/dist/style.css'

// --- Constants ---

const PROJECT_STATUSES = [
  { value: 'Planning', label: 'Planning' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Paused', label: 'Paused' },
  { value: 'Blocked', label: 'Blocked' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Completed', label: 'Completed' }
]

const PROJECT_PRIORITIES = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Highest', label: 'Highest' }
]

const PROJECT_TYPES = [
  { value: 'Strategic', label: 'Strategic' },
  { value: 'Tactical', label: 'Tactical' },
  { value: 'Operational', label: 'Operational' },
  { value: 'Research', label: 'Research' }
]

const ROI_TYPES = [
  { value: 'defense_line', label: 'Defense Line' },
  { value: 'man_hours', label: 'Man-Hours' },
  { value: 'stoploss', label: 'Stoploss' },
  { value: 'wpd', label: 'WPD' }
]

// --- Custom Node Types ---

const ProcessNode = ({ data }: any) => (
  <div className="px-8 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-xl bg-[#0a0c14] border-2 border-blue-500/50 text-white min-w-[160px] flex items-center justify-center relative overflow-hidden group">
     <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
     <div className="absolute left-0 top-0 w-1 h-full bg-blue-500" />
     <span className="text-[10px] font-black italic uppercase tracking-widest relative z-10 font-inter">{data.label}</span>
     <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-blue-500 border-2 border-[#0a0c14] !top-[-6px]" />
     <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-blue-500 border-2 border-[#0a0c14] !bottom-[-6px]" />
  </div>
)

const DiamondNode = ({ data }: any) => (
  <div className="w-28 h-28 rotate-45 bg-[#0a0c14] border-2 border-amber-500/50 flex items-center justify-center relative group overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
     <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
     <span className="-rotate-45 text-[9px] font-black italic uppercase tracking-tighter text-amber-400 text-center px-3 font-inter leading-tight">{data.label}</span>
     <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-amber-500 border-2 border-[#0a0c14] !top-[-5px] !left-1/2 !-translate-x-1/2" />
     <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-amber-500 border-2 border-[#0a0c14] !bottom-[-5px] !left-1/2 !-translate-x-1/2" />
     <Handle type="source" position={Position.Left} className="w-2.5 h-2.5 bg-amber-500 border-2 border-[#0a0c14] !left-[-5px] !top-1/2 !-translate-y-1/2" />
     <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-amber-500 border-2 border-[#0a0c14] !right-[-5px] !top-1/2 !-translate-y-1/2" />
  </div>
)

const InfrastructureNode = ({ data, type }: any) => {
  const Icon = type === 'db' ? Database : type === 'cloud' ? Globe : type === 'storage' ? Layers : Server
  const color = type === 'db' ? 'emerald' : type === 'cloud' ? 'sky' : type === 'storage' ? 'purple' : 'blue'
  const colorHex = type === 'db' ? '#10b981' : type === 'cloud' ? '#0ea5e9' : type === 'storage' ? '#a855f7' : '#3b82f6'
  
  return (
    <div className={`px-5 py-4 rounded-2xl bg-[#0a0c14] border-2 border-${color}-500/40 text-white min-w-[140px] flex flex-col items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group transition-all hover:border-${color}-500`}>
       <div className={`w-12 h-12 bg-${color}-600/10 rounded-xl flex items-center justify-center border border-${color}-500/20 group-hover:scale-110 transition-transform`}>
          <Icon size={22} className={`text-${color}-400`} />
       </div>
       <span className="text-[9px] font-black italic uppercase tracking-widest text-slate-300 font-inter">{data.label}</span>
       <Handle type="target" position={Position.Top} className={`w-2.5 h-2.5 bg-${color}-500 border-2 border-[#0a0c14] !top-[-6px]`} />
       <Handle type="source" position={Position.Bottom} className={`w-2.5 h-2.5 bg-${color}-500 border-2 border-[#0a0c14] !bottom-[-6px]`} />
    </div>
  )
}

const nodeTypes = {
  process: ProcessNode,
  diamond: DiamondNode,
  server: (props: any) => <InfrastructureNode {...props} type="server" />,
  storage: (props: any) => <InfrastructureNode {...props} type="storage" />,
  db: (props: any) => <InfrastructureNode {...props} type="db" />,
  cloud: (props: any) => <InfrastructureNode {...props} type="cloud" />
}

// --- Form Component ---

export const ProjectForm = ({ initialData, onSave, onCancel, isSaving }: any) => {
  const [formData, setFormData] = useState(initialData || { name: '', status: 'Planning', priority: 'Medium', type: 'Strategic' })
  return (
    <div className="space-y-8">
       <div className="grid grid-cols-2 gap-8">
          <div className="col-span-2 space-y-2">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Project Name</label>
             <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner" placeholder="Enter tactical identifier..." />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Initial Status</label>
             <div className="relative">
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none appearance-none cursor-pointer">
                   {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={18} />
             </div>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Priority Vector</label>
             <div className="relative">
                <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none appearance-none cursor-pointer">
                   {PROJECT_PRIORITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={18} />
             </div>
          </div>
       </div>
       <div className="flex justify-end gap-6 pt-6 items-center">
          <button onClick={onCancel} className="text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all font-inter italic">Cancel Initiation</button>
          <button onClick={() => onSave(formData)} disabled={isSaving || !formData.name} className="px-10 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-blue-900/40 hover:scale-105 active:scale-95 transition-all font-inter italic">
             {isSaving ? 'Synchronizing Vector...' : 'Commit Project Vector'}
          </button>
       </div>
    </div>
  )
}

// --- HUD Component ---

export const ProjectHUD = ({ project, isEditing, isDirty, onEdit, onSave, onCancel, onDelete, isSaving }: any) => {
  if (!project) return null
  return (
    <div className="h-16 bg-[#0a0c14] border-b border-white/10 flex items-center px-6 justify-between shrink-0 z-50 shadow-2xl">
       <div className="flex items-center gap-6 overflow-hidden">
          <div className="flex items-center gap-3 shrink-0">
             <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)]"><Workflow size={20} className="text-white" /></div>
             <div>
                <h1 className="text-lg font-bold tracking-tighter text-white leading-none truncate max-w-[300px]">{project.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">{project.type}</span>
                  <span className="text-slate-700 font-bold">•</span>
                  <StatusPill value={project.status} />
                </div>
             </div>
          </div>
       </div>
       <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
             {isEditing ? (
               <><button onClick={onCancel} className="px-4 py-2 text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-all">Discard</button><button onClick={onSave} disabled={isSaving || !isDirty} className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${isDirty ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-600'}`}><Save size={14} /> {isSaving ? 'Syncing...' : 'Commit Changes'}</button></>
             ) : (
               <button onClick={onEdit} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-blue-400 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-blue-500/20 flex items-center gap-2"><Edit2 size={14} /> Unlock Editor</button>
             )}
          </div>
          <button onClick={() => window.print()} className="p-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-all border border-blue-500/20"><Camera size={18} /></button>
          <button onClick={onDelete} className="p-2 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-lg transition-all border border-rose-500/20"><Trash2 size={18} /></button>
       </div>
    </div>
  )
}

// --- Rail Component ---

const ProjectRail = ({ projects, selectedId, onSelect, onNew, onReorder, width, onResize, isCollapsed, onToggleCollapse }: any) => {
  const [search, setSearch] = useState('')
  const sortedAndFiltered = useMemo(() => {
    return [...projects].filter(p => p && p.name && p.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
  }, [projects, search])

  if (isCollapsed) return <div className="w-12 bg-[#0a0c14] border-r border-white/5 flex flex-col items-center py-4 shrink-0"><button onClick={onToggleCollapse} className="p-2 text-slate-500"><PanelLeft size={18}/></button></div>

  return (
    <div className="relative border-r border-white/5 bg-[#0a0c14] shrink-0 flex flex-col" style={{ width }}>
       <div className="p-4 space-y-4">
          <div className="flex gap-2"><button onClick={onNew} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"><Plus size={14}/> New Vector</button><button onClick={onToggleCollapse} className="p-2 text-slate-500"><PanelRight size={18}/></button></div>
          <input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2 text-[10px] font-bold text-white outline-none" placeholder="Filter vectors..." />
       </div>
       <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
          <Reorder.Group axis="y" values={sortedAndFiltered} onReorder={onReorder} className="space-y-2">
             {sortedAndFiltered.map(p => (
                <Reorder.Item key={p.id} value={p}>
                   <button onClick={() => onSelect(p.id)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedId === p.id ? 'bg-blue-600/10 border-blue-500/40' : 'bg-white/[0.02] border-white/5'}`}>
                      <div className="flex justify-between items-start"><h3 className="text-[13px] font-bold text-white truncate">{p.name}</h3><StatusPill value={p.status}/></div>
                      <div className="mt-2 space-y-1">
                        <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest truncate">{p.owners?.length ? p.owners.join(', ') : (p.owner || 'Unassigned')}</div>
                        <div className="flex justify-between items-center text-[8px] text-slate-500 font-bold uppercase">
                          <span>Created: {format(new Date(p.created_at), 'MM/dd/yy')}</span>
                          <span>Updated: {format(new Date(p.updated_at), 'MM/dd/yy')}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end"><GripVertical size={12} className="text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                   </button>
                </Reorder.Item>
             ))}
          </Reorder.Group>
       </div>
    </div>
  )
}

// --- Main Views ---

const DiagramBuilder = ({ data, onChange, onSave }: any) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(data?.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(data?.edges || [])
  const onConnect = (params: Connection) => setEdges(eds => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } }, eds))
  const addNode = (type: string, label: string) => { const nd = { id: Date.now().toString(), type, data: { label }, position: { x: 100, y: 100 } }; setNodes(nds => [...nds, nd]) }
  useEffect(() => { onChange({ nodes, edges }) }, [nodes, edges])
  return (
    <div className="h-[650px] bg-[#0a0c14] border border-white/5 rounded-2xl overflow-hidden relative">
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} fitView><Background color="#1e293b" gap={20} /><Controls /></ReactFlow>
      <div className="absolute top-6 left-6 flex flex-col gap-4">
         <div className="bg-black/60 p-2 rounded-2xl border border-white/10 backdrop-blur-xl flex gap-2"><button onClick={() => addNode('process', 'STEP')} className="p-2 text-blue-400 hover:bg-blue-600/20 rounded-xl"><Layout size={18}/></button><button onClick={() => addNode('diamond', 'DECISION')} className="p-2 text-amber-400 hover:bg-amber-600/20 rounded-xl"><MousePointer2 size={18}/></button></div>
         <div className="bg-black/60 p-2 rounded-2xl border border-white/10 backdrop-blur-xl flex gap-2"><button onClick={() => addNode('server', 'SERVER')} className="p-2 text-slate-400 hover:bg-slate-600/20 rounded-xl"><Server size={18}/></button><button onClick={() => addNode('db', 'DATABASE')} className="p-2 text-emerald-400 hover:bg-emerald-600/20 rounded-xl"><Database size={18}/></button></div>
      </div>
      {onSave && <button onClick={onSave} className="absolute bottom-6 right-6 px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl">Baseline Design</button>}
    </div>
  )
}

const WorkbenchView = ({ project, onUpdate, isEditing, devices, services, options, users }: any) => {
  const [name, setName] = useState(project?.name || '')
  const [problemStatement, setProblemStatement] = useState(project?.problem_statement || '')
  const [objective, setObjective] = useState(project?.objective || '')
  const [activeDiagramIndex, setActiveDiagramIndex] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<any>(null)
  const [isAddingRef, setIsAddingRef] = useState(false)
  const [newRefLabel, setNewRefLabel] = useState('')
  const [newRefUrl, setNewRefUrl] = useState('')
  const [newJira, setNewJira] = useState('')
  const [isEvidenceHighlighted, setIsEvidenceHighlighted] = useState(false)
  const evidenceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
     const handleClickOutside = (e: MouseEvent) => {
        if (evidenceRef.current && !evidenceRef.current.contains(e.target as Node)) {
           setIsEvidenceHighlighted(false)
        }
     }
     document.addEventListener('mousedown', handleClickOutside)
     return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!project) return (
     <div className="h-full flex items-center justify-center">
        <p className="text-xs font-black text-slate-700 uppercase tracking-widest italic">No project context established</p>
     </div>
  )

  const handleFieldChange = (field: string, value: any) => { if (project && project[field] !== value) onUpdate({ ...project, [field]: value }) }
  const userOptions = useMemo(() => users?.map((u:any) => ({ value: u.username, label: u.full_name || u.username })) || [], [users])
  const typeOptions = useMemo(() => options?.filter((o:any) => o.category === 'ProjectType') || PROJECT_TYPES, [options])

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-32">
       {/* Primary Header Info */}
       <section className="bg-[#0a0c14] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 bg-gradient-to-r from-blue-600/5 to-transparent flex gap-8 items-start">
             <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Project Identifier</label>
                {isEditing ? (
                  <input value={name} onChange={e => setName(e.target.value)} onBlur={() => handleFieldChange('name', name)} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner" />
                ) : (
                  <h2 className="text-3xl font-black text-white tracking-tighter px-1">{project.name}</h2>
                )}
             </div>
             <div className="w-48 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Status</label>
                {isEditing ? (
                   <div className="h-[48px] flex items-center">
                    <select value={project.status} onChange={(e:any) => handleFieldChange('status', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 h-full text-[11px] font-bold text-white outline-none focus:border-blue-500">
                      {PROJECT_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                   </div>
                ) : (
                  <div className="h-[48px] flex items-center px-1"><StatusPill value={project.status} /></div>
                )}
             </div>
             <div className="w-48 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Priority</label>
                {isEditing ? (
                   <div className="h-[48px] flex items-center">
                    <select value={project.priority} onChange={(e:any) => handleFieldChange('priority', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 h-full text-[11px] font-bold text-white outline-none focus:border-blue-500">
                      {PROJECT_PRIORITIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                   </div>
                ) : (
                  <div className="h-[48px] flex items-center px-1"><span className={`text-[10px] font-black uppercase tracking-widest ${project.priority === 'High' || project.priority === 'Highest' ? 'text-rose-500' : 'text-slate-500'}`}>{project.priority}</span></div>
                )}
             </div>
          </div>

          <div className="p-8 grid grid-cols-2 gap-10">
             <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Problem Statement</h4>
                <div className={`p-6 rounded-2xl border transition-all ${isEditing ? 'bg-slate-900/40 border-blue-500/20 shadow-inner' : 'bg-black/20 border-white/5'} min-h-[160px]`}>
                   {isEditing ? (
                     <textarea value={problemStatement} onChange={e => setProblemStatement(e.target.value)} onBlur={() => handleFieldChange('problem_statement', problemStatement)} className="w-full h-full bg-transparent border-none outline-none text-xs font-bold text-slate-300 leading-relaxed resize-none" placeholder="Define the challenge..." />
                   ) : (
                     <p className="text-xs font-bold text-slate-400 leading-relaxed italic">"{project.problem_statement || 'Awaiting definition...'}"</p>
                   )}
                </div>
             </div>
             <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Strategic Objective</h4>
                <div className={`p-6 rounded-2xl border transition-all ${isEditing ? 'bg-slate-900/40 border-blue-500/20 shadow-inner' : 'bg-black/20 border-white/5'} min-h-[160px]`}>
                   {isEditing ? (
                     <textarea value={objective} onChange={e => setObjective(e.target.value)} onBlur={() => handleFieldChange('objective', objective)} className="w-full h-full bg-transparent border-none outline-none text-xs font-bold text-slate-300 leading-relaxed resize-none" placeholder="What are we achieving?" />
                   ) : (
                     <p className="text-xs font-bold text-slate-400 leading-relaxed italic">"{project.objective || 'Awaiting definition...'}"</p>
                   )}
                </div>
             </div>
          </div>
       </section>

       {/* Secondary Context & Stakeholders */}
       <div className="grid grid-cols-3 gap-10 items-stretch">
          <section className="col-span-1 bg-[#0a0c14] rounded-2xl border border-white/10 p-6 flex flex-col gap-6">
             <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Ownership Matrix</label>
                <div className="flex-1 min-h-[200px] max-h-[300px] overflow-y-auto custom-scrollbar bg-black/40 border border-white/5 rounded-2xl p-4 space-y-1">
                   {userOptions.filter((o:any) => isEditing || (project.owners || []).includes(o.value)).map((o:any) => (
                      <label key={o.value} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${(project.owners || []).includes(o.value) ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-600 hover:bg-white/5'}`}>
                         {isEditing && <input type="checkbox" checked={(project.owners || []).includes(o.value)} onChange={e => { const current = project.owners || []; const updated = e.target.checked ? [...current, o.value] : current.filter((x:any) => x !== o.value); handleFieldChange('owners', updated) }} className="w-4 h-4 rounded border-white/10 bg-black/40 text-blue-600" />}
                         <span className="text-[11px] font-black uppercase tracking-tight truncate">{o.label}</span>
                      </label>
                   ))}
                </div>
             </div>
             <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Vector Type</label>
                {isEditing ? (
                   <select value={project.type || ''} onChange={(e:any) => handleFieldChange('type', e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold text-white outline-none focus:border-blue-500">
                      <option value="">Select Type</option>
                      {typeOptions.map((o:any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                   </select>
                ) : (
                  <div className="flex items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                     <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20"><Projector size={18} className="text-blue-400" /></div>
                     <div><p className="text-xs font-black text-white uppercase tracking-widest">{project.type || 'N/A'}</p></div>
                  </div>
                )}
             </div>
          </section>

          <section className="col-span-2 bg-[#0a0c14] rounded-2xl border border-white/10 p-6 flex flex-col gap-8">
             <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center justify-between">
                      <span>Jira Vectors</span>
                      {isEditing && <button onClick={() => { if(!newJira) return; handleFieldChange('jira_links', [...(project.jira_links || []), newJira]); setNewJira('') }} className="text-blue-400 hover:text-white"><Plus size={14}/></button>}
                   </label>
                   <div className="space-y-2">
                      {isEditing && <input value={newJira} onChange={e => setNewJira(e.target.value)} className="w-full bg-slate-900/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white outline-none" placeholder="Ticket URL..." />}
                      <div className="flex flex-wrap gap-2">
                         {(project.jira_links || []).map((link: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">
                               <ExternalLink size={12} className="text-blue-400" />
                               <a href={link} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-400 uppercase tracking-widest max-w-[150px] truncate">{link.split('/').pop()}</a>
                               {isEditing && <button onClick={() => handleFieldChange('jira_links', project.jira_links.filter((_:any, idx:number) => idx !== i))} className="text-slate-600 hover:text-rose-500"><X size={12}/></button>}
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Beneficiaries</label>
                   <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-black/40 border border-white/5 rounded-2xl">
                      {isEditing ? (
                        <input className="bg-transparent border-none text-[10px] font-bold text-white outline-none w-full" placeholder="Add beneficiary..." onKeyDown={e => { if(e.key === 'Enter') { const v = e.currentTarget.value.trim(); if(v) { handleFieldChange('beneficiaries', [...(project.beneficiaries || []), v]); e.currentTarget.value = '' } } }} />
                      ) : null}
                      {(project.beneficiaries || []).map((b: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 bg-emerald-600/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                           {b} {isEditing && <button onClick={() => handleFieldChange('beneficiaries', project.beneficiaries.filter((_:any, idx:number) => idx !== i))} className="hover:text-rose-500"><X size={10}/></button>}
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             <div className="space-y-4 pt-4 border-t border-white/5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Resource Matrix (Assets & Systems)</label>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest px-1">Target Systems</p>
                      <div className="flex flex-wrap gap-2 p-3 bg-black/20 rounded-xl border border-white/5">
                         {(project.target_systems || []).map((s: string) => <span key={s} className="px-2 py-1 bg-white/5 rounded text-[9px] font-bold text-slate-400 uppercase">{s}</span>)}
                      </div>
                   </div>
                   <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest px-1">Target Assets</p>
                      <div className="flex flex-wrap gap-2 p-3 bg-black/20 rounded-xl border border-white/5">
                         {(project.target_assets || []).length} Devices Linked
                      </div>
                   </div>
                </div>
             </div>
          </section>
       </div>

       {/* Designs & Visuals */}
       <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2"><Workflow size={14} className="text-blue-500" /> Strategic Design & Architecture</h4>
             {isEditing && (
                <button onClick={() => { 
                   const metadata = project?.metadata_json || {}; 
                   const newDiagrams = [...(metadata.diagrams || []), { id: Date.now(), name: `Design v${(metadata.diagrams || []).length + 1}`, nodes: [], edges: [] }]; 
                   handleFieldChange('metadata_json', { ...metadata, diagrams: newDiagrams }); 
                   setActiveDiagramIndex(newDiagrams.length - 1) 
                }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                   <Plus size={14} /> New Design Vector
                </button>
             )}
          </div>
          <div className="grid grid-cols-1 gap-4">
             {(project?.metadata_json?.diagrams || []).map((d: any, idx: number) => (
                <div key={d.id} className={`border rounded-2xl overflow-hidden transition-all ${activeDiagramIndex === idx ? 'border-blue-500/30 shadow-[0_0_40px_rgba(37,99,235,0.1)]' : 'border-white/5 bg-[#0a0c14]'}`}>
                   <div className="flex items-center justify-between pr-6">
                      <button onClick={() => setActiveDiagramIndex(activeDiagramIndex === idx ? null : idx)} className="flex-1 px-8 py-5 flex items-center gap-4 hover:bg-white/5 transition-all text-left">
                         <div className={`w-2.5 h-2.5 rounded-full ${activeDiagramIndex === idx ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`} />
                         <span className={`text-[12px] font-black uppercase tracking-[0.2em] ${activeDiagramIndex === idx ? 'text-white' : 'text-slate-500'}`}>{d.name}</span>
                      </button>
                      {isEditing && (
                         <button onClick={() => {
                            const metadata = project?.metadata_json || {};
                            const newDiagrams = project.metadata_json.diagrams.filter((_:any, i:number) => i !== idx);
                            handleFieldChange('metadata_json', { ...metadata, diagrams: newDiagrams });
                            if(activeDiagramIndex === idx) setActiveDiagramIndex(null);
                         }} className="text-slate-700 hover:text-rose-500 p-2"><Trash2 size={16}/></button>
                      )}
                   </div>
                   <AnimatePresence>
                      {activeDiagramIndex === idx && (
                         <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/5 bg-[#0a0c14]">
                            <DiagramBuilder data={d} onChange={(updated: any) => { 
                               const metadata = project?.metadata_json || {}; 
                               const newDiagrams = [...(metadata.diagrams || [])]; 
                               newDiagrams[idx] = { ...newDiagrams[idx], ...updated }; 
                               handleFieldChange('metadata_json', { ...metadata, diagrams: newDiagrams }) 
                            }} onSave={() => { setActiveDiagramIndex(null); toast.success('Vector Baseline Committed'); }} />
                         </motion.div>
                      )}
                   </AnimatePresence>
                </div>
             ))}
          </div>
       </section>

       {/* Artifacts & Evidence */}
       <div className="grid grid-cols-2 gap-10">
          <section ref={evidenceRef} onClick={() => setIsEvidenceHighlighted(true)} className={`space-y-6 p-8 rounded-[2rem] border-2 transition-all ${isEvidenceHighlighted ? 'bg-amber-600/5 border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.1)]' : 'bg-transparent border-transparent'}`}>
             <div className="flex items-center justify-between px-1">
                <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 transition-colors ${isEvidenceHighlighted ? 'text-amber-400' : 'text-slate-500'}`}><Camera size={14} /> Artifact Evidence</h4>
                {isEditing && isEvidenceHighlighted && (
                   <div className="relative group animate-in fade-in zoom-in-95">
                      <button className="px-4 py-2 bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-900/40 flex items-center gap-2 hover:scale-105 transition-all"><Plus size={14}/> Attach Artifact</button>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {
                         const file = e.target.files?.[0];
                         if(!file) return;
                         const reader = new FileReader();
                         reader.onload = (ev) => {
                            const metadata = project?.metadata_json || {};
                            const images = [...(metadata.images || []), { url: ev.target?.result, caption: file.name, timestamp: new Date().toISOString() }];
                            handleFieldChange('metadata_json', { ...metadata, images });
                         };
                         reader.readAsDataURL(file);
                      }} />
                   </div>
                )}
                {isEditing && !isEvidenceHighlighted && (
                   <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest italic">Select field to attach evidence</span>
                )}
             </div>
             <div className="grid grid-cols-3 gap-4">
                {(project?.metadata_json?.images || []).map((img: any, i: number) => (
                   <div key={i} className="relative aspect-square group rounded-xl overflow-hidden border border-white/10 hover:border-amber-500/50 transition-all bg-black/40 cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedImage({ ...img, index: i }); }}>
                      <img src={img.url} alt={img.caption} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black to-transparent">
                         <p className="text-[8px] font-black text-white uppercase truncate">{img.caption}</p>
                      </div>
                      {isEditing && (
                         <button onClick={(e) => { e.stopPropagation(); handleFieldChange('metadata_json', { ...project.metadata_json, images: project.metadata_json.images.filter((_:any, idx:number) => idx !== i) }) }} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition-all"><X size={12}/></button>
                      )}
                   </div>
                ))}
             </div>
          </section>

          <section className="space-y-6">
             <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2"><BookOpen size={14} className="text-sky-500" /> Strategic References</h4>
                {isEditing && !isAddingRef && <button onClick={() => setIsAddingRef(true)} className="p-2 bg-sky-600/10 text-sky-500 rounded-lg hover:bg-sky-600 hover:text-white transition-all"><Plus size={16}/></button>}
             </div>
             <div className="space-y-3">
                {isAddingRef && (
                   <div className="p-4 bg-slate-900/50 rounded-2xl border border-sky-500/30 grid grid-cols-2 gap-3">
                      <input autoFocus value={newRefLabel} onChange={e => setNewRefLabel(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold text-white outline-none" placeholder="Label" />
                      <input value={newRefUrl} onChange={e => setNewRefUrl(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold text-white outline-none" placeholder="URL" />
                      <button onClick={() => setIsAddingRef(false)} className="py-2 text-[9px] font-black uppercase text-slate-500">Cancel</button>
                      <button onClick={() => { if (!newRefLabel || !newRefUrl) return; const metadata = project?.metadata_json || {}; const references = [...(metadata.references || []), { label: newRefLabel, url: newRefUrl }]; handleFieldChange('metadata_json', { ...metadata, references }); setNewRefLabel(''); setNewRefUrl(''); setIsAddingRef(false) }} className="py-2 bg-sky-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Attach Ref</button>
                   </div>
                )}
                {(project?.metadata_json?.references || []).map((ref: any, i: number) => (
                   <div key={i} className="flex items-center gap-4 group">
                      <a href={ref.url} target="_blank" rel="noreferrer" className="flex-1 p-4 bg-[#0a0c14] rounded-2xl border border-white/5 hover:border-sky-500/40 transition-all flex justify-between items-center group/link">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-sky-600/10 rounded-xl flex items-center justify-center border border-sky-500/20"><LinkIcon size={18} className="text-sky-400" /></div>
                            <div>
                               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover/link:text-sky-400 transition-colors">{ref.label}</p>
                               <p className="text-[8px] font-bold text-slate-600 truncate max-w-[200px] mt-1">{ref.url}</p>
                            </div>
                         </div>
                         <ExternalLink size={14} className="text-slate-700 group-hover/link:text-sky-400 transition-all" />
                      </a>
                      {isEditing && <button onClick={() => handleFieldChange('metadata_json', { ...project.metadata_json, references: project.metadata_json.references.filter((_:any, idx:number) => idx !== i) })} className="p-2 text-slate-700 hover:text-rose-500"><Trash2 size={16}/></button>}
                   </div>
                ))}
             </div>
          </section>
       </div>
       <AnimatePresence>{selectedImage && <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-12 overflow-y-auto" onClick={() => setSelectedImage(null)}><motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative max-w-7xl w-full flex flex-col gap-8" onClick={e => e.stopPropagation()}><div className="relative group/modal"><img src={selectedImage.url} alt="Artifact Full" className="w-full h-auto rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10" /><button onClick={() => setSelectedImage(null)} className="absolute top-6 right-6 p-3 bg-black/60 hover:bg-rose-600 text-white rounded-2xl backdrop-blur-md border border-white/10 transition-all shadow-2xl"><X size={32}/></button></div><div className="bg-[#0a0c14] border border-white/10 rounded-2xl p-10 space-y-6 shadow-2xl"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-amber-600/10 rounded-xl flex items-center justify-center border border-amber-500/20"><ImageIcon size={20} className="text-amber-400" /></div><div><h4 className="text-lg font-black text-white uppercase tracking-tighter leading-none">Artifact Attribution</h4><p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Strategic Visual Evidence Record</p></div></div></div><div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Contextual Caption</label><textarea autoFocus value={selectedImage.caption || ''} onChange={e => { const newCaption = e.target.value; setSelectedImage({ ...selectedImage, caption: newCaption }); const metadata = project?.metadata_json || {}; const updated = [...(metadata.images || [])]; updated[selectedImage.index] = { ...updated[selectedImage.index], caption: newCaption }; handleFieldChange('metadata_json', { ...metadata, images: updated }) }} className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-sm font-bold text-slate-300 outline-none focus:border-amber-500/30 transition-all h-32 resize-none leading-relaxed" placeholder="Provide forensic context for this artifact..." /></div></div></motion.div></div>}</AnimatePresence>
    </div>
  )
}

const ProjectAdoptionView = ({ project, onUpdate }: any) => {
  const [newTeam, setNewTeam] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newBenefit, setNewBenefit] = useState('')
  const [isAddingTeam, setIsAddingTeam] = useState(false)
  
  const adoption = useMemo(() => project?.metadata_json?.adoption || [], [project])
  
  const handleAddEntry = (teamName: string) => {
    if (!newDescription.trim()) return
    const metadata = project?.metadata_json || {}
    const existingTeam = adoption.find((a: any) => a.team === teamName)
    const newRecord = { 
      description: newDescription, 
      benefit: newBenefit, 
      timestamp: new Date().toISOString(),
      author: 'haewonkim'
    }
    
    let updatedAdoption
    if (existingTeam) {
       updatedAdoption = adoption.map((a: any) => 
          a.team === teamName ? { ...a, current: newRecord, history: [a.current, ...(a.history || [])] } : a
       )
    } else {
       updatedAdoption = [...adoption, { team: teamName, current: newRecord, history: [] }]
    }
    
    onUpdate({ ...project, metadata_json: { ...metadata, adoption: updatedAdoption } })
    setNewDescription(''); setNewBenefit(''); setIsAddingTeam(false); setNewTeam('')
    toast.success(`Adoption vector updated for ${teamName}`)
  }

  return (
    <div className="h-full flex flex-col p-12 space-y-12 max-w-7xl mx-auto custom-scrollbar overflow-y-auto">
       <div className="flex items-center justify-between bg-emerald-600/5 p-10 rounded-[2rem] border border-emerald-500/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="flex items-center gap-8 relative z-10">
             <div className="w-20 h-20 bg-emerald-600/10 rounded-[1.5rem] flex items-center justify-center border border-emerald-500/30 shadow-inner">
                <TrendingUp size={40} className="text-emerald-400" />
             </div>
             <div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase font-inter italic">Stakeholder Adoption Ledger</h2>
                <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2 italic">Unified record of strategic utility & utility realization</p>
             </div>
          </div>
          <button onClick={() => setIsAddingTeam(true)} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-emerald-900/20 hover:scale-105 transition-all active:scale-95">
             <Plus size={20}/> Register Team
          </button>
       </div>

       {isAddingTeam && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0d111a] border-2 border-emerald-500/30 rounded-[2.5rem] p-10 space-y-8 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <h4 className="text-[12px] font-black text-emerald-400 uppercase tracking-[0.5em] font-inter italic">New Adoption Vector</h4>
                </div>
                <button onClick={() => setIsAddingTeam(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-500"><X size={24}/></button>
             </div>
             <div className="grid grid-cols-12 gap-8">
                <div className="col-span-4 space-y-3">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Stakeholder Team</label>
                   <input value={newTeam} onChange={e => setNewTeam(e.target.value)} placeholder="e.g. CORE-PLATFORM" className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-all shadow-inner" />
                </div>
                <div className="col-span-8 space-y-3">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Usage Description</label>
                   <input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="How is this team utilizing the project outcomes?" className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-all shadow-inner" />
                </div>
                <div className="col-span-12 space-y-3">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Realized Benefits</label>
                   <textarea value={newBenefit} onChange={e => setNewBenefit(e.target.value)} placeholder="Quantifiable or qualitative gains observed..." className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white h-32 outline-none focus:border-emerald-500/50 transition-all resize-none shadow-inner leading-relaxed" />
                </div>
             </div>
             <div className="flex justify-end gap-6 items-center">
                <button onClick={() => setIsAddingTeam(false)} className="text-slate-500 uppercase font-black text-[11px] tracking-widest hover:text-white transition-all">Cancel</button>
                <button onClick={() => handleAddEntry(newTeam)} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-900/40 hover:scale-105 active:scale-95 transition-all font-inter italic">Commit Adoption Record</button>
             </div>
          </motion.div>
       )}

       <div className="space-y-8 pb-20">
          {adoption.map((entry: any, idx: number) => (
             <div key={idx} className="bg-[#0a0c14] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl group transition-all hover:border-emerald-500/30">
                <div className="p-8 bg-gradient-to-r from-white/[0.03] to-transparent border-b border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-emerald-600/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
                         <Users size={24} className="text-emerald-400" />
                      </div>
                      <div>
                         <h3 className="text-xl font-black text-white uppercase tracking-tighter italic font-inter">{entry.team}</h3>
                         <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Active Stakeholder Entity</p>
                      </div>
                   </div>
                   <button onClick={() => { setNewTeam(entry.team); setIsAddingTeam(true); }} className="px-6 py-2.5 bg-white/5 hover:bg-emerald-600/20 text-[10px] font-black text-slate-400 hover:text-emerald-400 rounded-xl border border-white/10 transition-all uppercase tracking-widest font-inter italic">Update Vector</button>
                </div>
                <div className="p-10 grid grid-cols-12 gap-12">
                   <div className="col-span-7 space-y-8">
                      <div className="space-y-4">
                         <div className="flex items-center gap-3 px-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] font-inter italic">Current Realization</label>
                         </div>
                         <div className="bg-black/40 p-8 rounded-[2rem] border-2 border-emerald-500/10 space-y-6 shadow-inner">
                            <p className="text-lg font-bold text-slate-200 leading-relaxed italic">"{entry.current.description}"</p>
                            <div className="pt-6 border-t border-white/5">
                               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Quantified Benefit</p>
                               <p className="text-sm font-bold text-emerald-400/90 leading-relaxed">{entry.current.benefit}</p>
                            </div>
                            <div className="flex justify-end pt-2">
                               <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest italic">{format(new Date(entry.current.timestamp), 'MMMM dd, yyyy @ HH:mm')}</span>
                            </div>
                         </div>
                      </div>
                   </div>
                   <div className="col-span-5 space-y-6">
                      <div className="flex items-center gap-3 px-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                         <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] font-inter italic">Historical Lineage</label>
                      </div>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                         {entry.history?.length === 0 ? (
                            <div className="p-8 text-center border border-dashed border-white/5 rounded-2xl opacity-40"><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">No previous iterations</p></div>
                         ) : (
                            entry.history?.map((h: any, i: number) => (
                               <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl opacity-60 hover:opacity-100 transition-opacity">
                                  <p className="text-xs font-bold text-slate-400 italic">"{h.description}"</p>
                                  <div className="flex justify-between mt-4 items-center">
                                     <span className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Benefit Logged</span>
                                     <span className="text-[8px] font-bold text-slate-700 uppercase">{format(new Date(h.timestamp), 'MMM dd, yyyy')}</span>
                                  </div>
                               </div>
                            ))
                         )}
                      </div>
                   </div>
                </div>
             </div>
          ))}
       </div>
    </div>
  )
}

const ProjectActivityStream = ({ project, allProjects = [] }: any) => {
  const [isFull, setIsFull] = useState(false)
  const activities = useMemo(() => {
    let list: any[] = []
    
    const extractFromProject = (p: any) => {
       const taskHistory = (p?.tasks || []).flatMap((t: any) => 
          (t?.metadata_json?.history || []).map((h: any) => ({ ...h, type: 'TASK_UPDATE', taskName: t?.name, projectName: p?.name, icon: <Target size={14}/> }))
       )
       const taskComments = (p?.tasks || []).flatMap((t: any) => 
          (t?.metadata_json?.comments || []).map((c: any) => ({ ...c, type: 'COMMENT', taskName: t?.name, projectName: p?.name, icon: <MessageSquare size={14}/> }))
       )
       const projectAudit = (p?.metadata_json?.audit_log || []).map((a: any) => ({ ...a, type: 'PROJECT_META', projectName: p?.name, icon: <Projector size={14}/> }))
       
       const projectComments = (p?.comments || []).map((c: any) => ({ ...c, type: 'COMMENT', projectName: p?.name, icon: <MessageSquare size={14}/> }))
       
       return [...taskHistory, ...taskComments, ...projectAudit, ...projectComments]
    }

    if (project) {
       list = extractFromProject(project)
    } else {
       allProjects.forEach(p => {
          list = [...list, ...extractFromProject(p)]
       })
    }
    
    return list.sort((a: any, b: any) => new Date(b.timestamp || b.created_at || 0).getTime() - new Date(a.timestamp || a.created_at || 0).getTime())
  }, [project, allProjects])

  return (
    <div className={`flex flex-col bg-[#080a0f] transition-all relative overflow-hidden ${isFull ? 'fixed inset-0 z-[200] p-16' : 'h-full p-8'}`}>
       {isFull && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#3b82f615,transparent_50%)] pointer-events-none" />}
       
       <div className="flex items-center justify-between mb-10 relative z-10">
          <div className="flex items-center gap-6">
             <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-2xl">
                <Activity size={28} className="text-blue-400" />
             </div>
             <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter font-inter italic">Evolution Stream</h3>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mt-1 italic">Tactical shifts and strategic vector commits</p>
             </div>
          </div>
          <button onClick={() => setIsFull(!isFull)} className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all shadow-xl backdrop-blur-md">
             {isFull ? <Minimize2 size={24}/> : <Maximize2 size={24}/>}
          </button>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar pr-6 space-y-6 relative z-10">
          {activities.length === 0 ? (
             <div className="h-64 flex items-center justify-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                <p className="text-xs font-black text-slate-700 uppercase tracking-widest italic">No evolution data captured in the stream</p>
             </div>
          ) : (
             activities.map((item: any, i: number) => (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={i} className="group relative flex gap-8 p-8 bg-[#0a0c14] border border-white/10 rounded-[2rem] hover:border-blue-500/40 transition-all shadow-xl hover:shadow-blue-900/10">
                   <div className="flex flex-col items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all shadow-inner ${
                         item.type === 'COMMENT' ? 'bg-amber-600/10 border-amber-500/20 text-amber-400' : 
                         item.type === 'TASK_UPDATE' ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' : 
                         'bg-emerald-600/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                         {item.icon}
                      </div>
                      <div className="w-px flex-1 bg-gradient-to-b from-white/10 to-transparent" />
                   </div>
                   <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-center">
                         <div className="flex items-center gap-4">
                            <span className="text-[11px] font-black text-white uppercase tracking-widest font-inter italic">{item.author || 'SYSTEM_CORE'}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${
                               item.type === 'COMMENT' ? 'text-amber-500 border-amber-500/30' : 
                               item.type === 'TASK_UPDATE' ? 'text-blue-500 border-blue-500/30' : 
                               'text-emerald-500 border-emerald-500/30'
                            }`}>{item.type}</span>
                            {item.projectName && <span className="text-[10px] font-bold text-slate-500 uppercase italic">/ {item.projectName}</span>}
                         </div>
                         <span className="text-[10px] font-black text-slate-700 uppercase italic font-inter">{format(new Date(item.timestamp || item.created_at), 'MMM dd, HH:mm:ss')}</span>
                      </div>
                      <div className="bg-black/30 p-6 rounded-2xl border border-white/5 shadow-inner">
                         <p className="text-sm font-bold text-slate-300 leading-relaxed italic">"{item.content || item.message}"</p>
                      </div>
                      {item.taskName && (
                         <div className="flex items-center gap-3 px-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest font-inter italic">{item.taskName}</span>
                         </div>
                      )}
                      {item.image && (
                         <div className="pt-2">
                            <img src={item.image} className="rounded-2xl border border-white/10 max-h-64 w-auto shadow-2xl hover:scale-[1.02] transition-transform cursor-zoom-in" alt="Evidence Artifact" />
                         </div>
                      )}
                   </div>
                </motion.div>
             ))
          )}
       </div>
    </div>
  )
}

const ExecutiveChart = ({ tasks }: { tasks: any[] }) => {
  const [tooltip, setTooltip] = useState<any>(null)
  const data = useMemo(() => {
    if (!tasks || tasks.length === 0) return []
    const times = tasks.flatMap(t => [new Date(t.start_date).getTime(), new Date(t.end_date).getTime(), t.actual_start_date ? new Date(t.actual_start_date).getTime() : null, t.actual_end_date ? new Date(t.actual_end_date).getTime() : null]).filter(t => t !== null && !isNaN(t))
    if (times.length === 0) return []
    const start = startOfMonth(new Date(Math.min(...times)))
    const end = endOfMonth(addDays(new Date(Math.max(...times)), 30))
    const interval = eachDayOfInterval({ start, end })
    return interval.filter((_, i) => i % 5 === 0).map(date => {
      const scheduledCount = tasks.filter(t => t && t.end_date && new Date(t.end_date) <= date).length
      const actualCount = tasks.filter(t => t && t.actual_end_date && new Date(t.actual_end_date) <= date).length
      return { 
        date: format(date, 'MMM d'), 
        fullDate: date, 
        scheduled: Math.round((scheduledCount / (tasks.length || 1)) * 100), 
        actual: Math.round((actualCount / (tasks.length || 1)) * 100), 
        plannedTasks: tasks.filter(t => t && t.end_date && isSameDay(new Date(t.end_date), date)), 
        actualTasks: tasks.filter(t => t && t.actual_end_date && isSameDay(new Date(t.actual_end_date), date)) 
      }
    })
  }, [tasks])
  return (
    <div className="h-full w-full bg-[#0a0c14] p-8 flex flex-col gap-6 relative">
       <div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20"><BarChart3 size={20} className="text-blue-400" /></div><div><h3 className="text-lg font-black text-white uppercase tracking-tighter leading-none">Trajectory</h3></div></div><div className="flex gap-6"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] font-bold text-slate-400 uppercase">Planned</span></div><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] font-bold text-slate-400 uppercase">Actual</span></div></div></div>
       <div className="flex-1 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} onMouseMove={(e:any) => { if(e.activePayload) setTooltip(e.activePayload[0].payload) }} onMouseLeave={() => setTooltip(null)}><defs><linearGradient id="colorSch" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="date" hide /><YAxis hide /><Area type="monotone" dataKey="scheduled" stroke="#3b82f6" fill="url(#colorSch)" /><Area type="monotone" dataKey="actual" stroke="#10b981" fill="transparent" /></AreaChart></ResponsiveContainer></div>
       {tooltip && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0d0f17] border border-blue-500/30 p-4 rounded-xl shadow-2xl z-50 pointer-events-none text-white text-[10px] font-bold uppercase tracking-widest">{format(tooltip.fullDate, 'MMM dd, yyyy')}<br/>Scheduled: {tooltip.scheduled}%<br/>Actual: {tooltip.actual}%</div>}
    </div>
  )
}

const TaskRow = ({ task, rowIndex, startDate, zoomLevel, selectedTaskIds, onTaskUpdate, setSelectedTaskId, handleSelectTask, ROW_HEIGHT, getDayOffset, getDayWidth }: any) => {
  const dragControls = useDragControls()
  const [isDragging, setIsDragging] = useState(false)
  const left = Math.floor(getDayOffset(task.start_date) * zoomLevel)
  const width = Math.max(zoomLevel, Math.floor(getDayWidth(task.start_date, task.end_date) * zoomLevel))
  const isSmall = width < 150
  
  return (
    <div className="absolute w-full" style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}>
       <div className="absolute inset-0 border-b border-white/5 opacity-50" />
       
       <motion.div 
          drag="x"
          dragMomentum={false}
          dragElastic={0}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={(e, info) => {
             setIsDragging(false)
             const daysMoved = Math.round(info.offset.x / zoomLevel)
             if (daysMoved !== 0) {
                const newStart = addDays(new Date(task.start_date), daysMoved)
                const newEnd = addDays(new Date(task.end_date), daysMoved)
                onTaskUpdate({ ...task, start_date: newStart.toISOString(), end_date: newEnd.toISOString() })
             }
          }}
          onClick={(e) => { e.stopPropagation(); handleSelectTask(task.id); }} 
          onDoubleClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id); }} 
          className={`absolute h-8 top-1.5 rounded-lg flex items-center border transition-all z-10 ${selectedTaskIds.has(task.id) ? 'border-blue-500 bg-blue-600/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/20 bg-white/10'} ${isDragging ? 'cursor-grabbing opacity-80 scale-[1.02]' : 'cursor-grab'}`} 
          style={{ left, width }}
       >
          <div className="flex-1 h-full flex items-center px-3 gap-3 overflow-hidden">
             <div className={`w-2 h-2 rounded-full shrink-0 shadow-[0_0_10px_currentColor] ${task.status === 'Completed' ? 'text-emerald-400 bg-emerald-400' : task.status === 'Blocked' ? 'text-rose-500 bg-rose-500' : 'text-blue-400 bg-blue-400'}`} />
             {!isSmall && <span className="text-[10px] font-black italic uppercase truncate text-white tracking-widest font-inter">{task.name}</span>}
          </div>

          {(isSmall || true) && (
            <div className="absolute left-full ml-6 flex items-center h-full pointer-events-none whitespace-nowrap z-20">
               <div className="w-10 h-px bg-blue-500/30 -ml-6" />
               <span className="text-[10px] font-black italic uppercase text-slate-400 tracking-[0.15em] font-inter ml-2 drop-shadow-lg">{task.name}</span>
            </div>
          )}
       </motion.div>
    </div>
  )
}

const PrecisionGantt = ({ project, onUpdate }: any) => {
  const [tasks, setTasks] = useState<any[]>(project?.tasks?.filter((t:any) => !!t) || [])
  const [zoomLevel, setZoomLevel] = useState(30)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set())
  const [showExecutiveChart, setShowExecutiveChart] = useState(false)
  
  const ROW_HEIGHT = 48
  const startDate = useMemo(() => {
     if (!tasks.length) return startOfMonth(new Date())
     const times = tasks.map(t => new Date(t.start_date).getTime()).filter(t => !isNaN(t))
     const minDate = times.length ? new Date(Math.min(...times)) : new Date()
     return startOfMonth(minDate)
  }, [tasks])

  const getDayOffset = useCallback((date: string) => differenceInDays(new Date(date), startDate), [startDate])
  const getDayWidth = useCallback((start: string, end: string) => Math.max(1, differenceInDays(new Date(end), new Date(start))), [])
  
  const handleTaskUpdate = (updatedTask: any) => {
     const newTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
     setTasks(newTasks)
     onUpdate({ ...project, tasks: newTasks })
  }

  const dependencyLines = useMemo(() => {
     const lines: any[] = []
     tasks.forEach((t, i) => {
        (t.dependencies_json || []).forEach((depId: number) => {
           const fromTaskIdx = tasks.findIndex(tk => tk.id === depId)
           if (fromTaskIdx === -1) return
           const fromTask = tasks[fromTaskIdx]
           
           const x1 = getDayOffset(fromTask.end_date) * zoomLevel
           const y1 = fromTaskIdx * ROW_HEIGHT + ROW_HEIGHT/2
           const x2 = getDayOffset(t.start_date) * zoomLevel
           const y2 = i * ROW_HEIGHT + ROW_HEIGHT/2
           
           lines.push({ id: `${depId}-${t.id}`, x1, y1, x2, y2 })
        })
     })
     return lines
  }, [tasks, zoomLevel, getDayOffset])

  return (
    <div className="h-full flex flex-col bg-[#080a0f] overflow-hidden" onClick={() => setSelectedTaskIds(new Set())}>
       <div className="h-14 border-b border-white/10 flex items-center px-6 justify-between bg-[#0a0c14] shrink-0 z-40 shadow-xl">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
                <button onClick={(e) => { e.stopPropagation(); setShowExecutiveChart(!showExecutiveChart); }} className={`p-2 rounded-lg transition-all ${showExecutiveChart ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}><BarChart3 size={18}/></button>
                <button onClick={(e) => { e.stopPropagation(); setZoomLevel(prev => Math.max(10, prev - 5)); }} className="p-2 text-slate-500 hover:text-white"><Minimize2 size={18}/></button>
                <button onClick={(e) => { e.stopPropagation(); setZoomLevel(prev => Math.min(100, prev + 5)); }} className="p-2 text-slate-500 hover:text-white"><Maximize2 size={18}/></button>
             </div>
             <div className="h-6 w-px bg-white/10" />
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                <span className="text-[10px] font-black italic uppercase text-slate-400 tracking-widest font-inter">Milestone Trajectory</span>
             </div>
          </div>
          <button onClick={() => { const n = prompt('Milestone Name'); if(n) setTasks([...tasks, { id: Date.now(), name: n, start_date: new Date().toISOString(), end_date: addDays(new Date(), 14).toISOString(), status: 'To Do', metadata_json: {} }]) }} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black italic uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:scale-105 transition-all active:scale-95 flex items-center gap-2"><Plus size={16}/> New Milestone</button>
       </div>

       {showExecutiveChart && <div className="h-[250px] border-b border-white/10 shrink-0 bg-[#0a0c14]"><ExecutiveChart tasks={tasks} /></div>}
       
       <div className="flex-1 flex overflow-hidden relative">
          <div className="w-[200px] border-r border-white/10 bg-[#0d0f17]/80 backdrop-blur-md flex flex-col z-30 shadow-2xl">
             <div className="h-14 border-b border-white/10 flex items-center px-5 shrink-0 italic text-[10px] font-black text-slate-500 uppercase tracking-widest font-inter">Vector Milestones</div>
             <div className="flex-1 overflow-y-auto no-scrollbar">
                {tasks.map((t, i) => (
                   <div key={t.id} onClick={(e) => { e.stopPropagation(); setSelectedTaskIds(new Set([t.id])); }} onDoubleClick={() => setSelectedTaskId(t.id)} className={`h-[48px] flex items-center px-4 border-b border-white/5 cursor-pointer transition-all ${selectedTaskIds.has(t.id) ? 'bg-blue-600/20 border-l-2 border-l-blue-500' : 'hover:bg-white/5'}`}>
                      <p className="text-[10px] font-black italic text-slate-300 uppercase truncate font-inter">{t.name}</p>
                   </div>
                ))}
             </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar relative bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:24px_24px]">
             <div className="sticky top-0 z-30 flex bg-[#0a0c14]/95 backdrop-blur-md border-b border-white/10 h-14" style={{ width: 730 * zoomLevel }}>
                {eachDayOfInterval({ start: startDate, end: addDays(startDate, 730) }).map((d, i) => {
                   const isFirstOfMonth = d.getDate() === 1
                   return (
                      <div key={i} className={`shrink-0 border-r border-white/5 flex flex-col items-center justify-center h-full transition-colors ${isFirstOfMonth ? 'bg-blue-600/5' : ''}`} style={{ width: zoomLevel }}>
                         {isFirstOfMonth && <span className="text-[8px] font-black italic text-blue-400 uppercase tracking-widest absolute top-1 font-inter">{format(d, 'MMMM yyyy')}</span>}
                         <span className={`text-[11px] font-black font-inter ${isFirstOfMonth ? 'text-blue-400' : 'text-slate-500'}`}>{format(d, 'd')}</span>
                      </div>
                   )
                })}
             </div>

             <div className="relative" style={{ width: 730 * zoomLevel, height: (tasks.length + 10) * ROW_HEIGHT }}>
                <svg className="absolute inset-0 pointer-events-none z-0" style={{ width: '100%', height: '100%' }}>
                   <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" opacity="0.5" /></marker></defs>
                   {dependencyLines.map(line => (
                      <path key={line.id} d={`M ${line.x1} ${line.y1} L ${line.x1 + 10} ${line.y1} L ${line.x1 + 10} ${line.y2} L ${line.x2} ${line.y2}`} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.3" markerEnd="url(#arrow)" />
                   ))}
                </svg>

                {tasks.map((t, i) => (
                   <TaskRow 
                      key={t.id} 
                      task={t} 
                      rowIndex={i} 
                      startDate={startDate} 
                      zoomLevel={zoomLevel} 
                      selectedTaskIds={selectedTaskIds} 
                      onTaskUpdate={handleTaskUpdate} 
                      setSelectedTaskId={setSelectedTaskId} 
                      handleSelectTask={(id:any)=>setSelectedTaskIds(new Set([id]))} 
                      ROW_HEIGHT={ROW_HEIGHT} 
                      getDayOffset={getDayOffset} 
                      getDayWidth={getDayWidth} 
                   />
                ))}
             </div>
          </div>
       </div>

       <AnimatePresence>{selectedTaskId && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-8"><motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0d0f17] w-[900px] h-[80vh] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">{(() => { const task = tasks.find(t => t.id === selectedTaskId); if(!task) return null; const subtasks = task.metadata_json?.subtasks || []; const [inline, setInline] = useState(''); return (<><div className="p-8 border-b border-white/10 flex items-center justify-between"><h2 className="text-xl font-bold text-white">{task.name}</h2><button onClick={() => setSelectedTaskId(null)} className="text-slate-500 hover:text-white"><X size={24}/></button></div><div className="flex-1 overflow-y-auto p-10 grid grid-cols-12 gap-10"><div className="col-span-8 space-y-12"><section className="space-y-4"><h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Requirements</h4><div className="space-y-3">{subtasks.map((s:any, i:any) => <div key={i} className="flex items-center gap-4 p-5 bg-white/5 rounded-2xl shadow-xl"><div className="text-[10px] font-black text-slate-700 w-6">{String(i+1).padStart(2,'0')}</div><input type="checkbox" checked={s.completed} onChange={e => { const ns = [...subtasks]; ns[i].completed = e.target.checked; setTasks(ts => ts.map(tk => tk.id === task.id ? {...tk, metadata_json: {...tk.metadata_json, subtasks: ns}} : tk)) }} className="w-5 h-5 rounded-lg border-white/10 bg-black/40 text-blue-500" /><input value={s.label} onChange={e => { const ns = [...subtasks]; ns[i].label = e.target.value; setTasks(ts => ts.map(tk => tk.id === task.id ? {...tk, metadata_json: {...tk.metadata_json, subtasks: ns}} : tk)) }} className="flex-1 bg-transparent border-none text-xs font-bold text-slate-200" /></div>)}<div className="flex gap-3 p-3 bg-black/40 rounded-2xl border border-dashed border-white/10"><input value={inline} onChange={e => setInline(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { const ns = [...subtasks, {label: inline, completed: false}]; setTasks(ts => ts.map(tk => tk.id === task.id ? {...tk, metadata_json: {...tk.metadata_json, subtasks: ns}} : tk)); setInline('') } }} placeholder="New milestone requirement..." className="flex-1 bg-transparent px-4 text-xs font-bold outline-none" /><button onClick={() => { const ns = [...subtasks, {label: inline, completed: false}]; setTasks(ts => ts.map(tk => tk.id === task.id ? {...tk, metadata_json: {...tk.metadata_json, subtasks: ns}} : tk)); setInline('') }} className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20"><Plus size={20}/></button></div></div></section></div><div className="col-span-4 space-y-10"><section className="space-y-4"><h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Status Vector</h4><select value={task.status} onChange={e => setTasks(ts => ts.map(tk => tk.id === task.id ? {...tk, status: e.target.value} : tk))} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white uppercase outline-none focus:border-blue-500 transition-all">{['To Do', 'In Progress', 'Blocked', 'Review', 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}</select></section></div></div><div className="p-8 border-t border-white/10 flex justify-end gap-4"><button onClick={() => { onUpdate({...project, tasks}); setSelectedTaskId(null); toast.success('Vector Baseline Synced') }} className="px-10 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20">Commit Changes</button></div></>) })()}</motion.div></div>}</AnimatePresence>
    </div>
  )
}

// --- Main Component ---

export default function Projects() {
  const queryClient = useQueryClient()
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => apiClient.get('/projects') })
  const { data: devices = [] } = useQuery({ queryKey: ['devices'], queryFn: () => apiClient.get('/devices') })
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: () => apiClient.get('/services') })
  const { data: options = [] } = useQuery({ queryKey: ['options'], queryFn: () => apiClient.get('/settings/options') })
  const { data: operators = [] } = useQuery({ queryKey: ['operators'], queryFn: () => apiClient.get('/settings/operators') })

  const [selectedId, setSelectedId] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'WORKBENCH' | 'GANTT' | 'ADOPTION' | 'STREAM'>('WORKBENCH')
  const [isRailCollapsed, setIsRailCollapsed] = useState(false)

  const project = useMemo(() => draft || projects.find((p: any) => p.id === selectedId), [selectedId, projects, draft])

  const mutation = useMutation({
    mutationFn: (data: any) => apiClient.put(`/projects/${data.id}`, data),
    onSuccess: (data) => {
      queryClient.setQueryData(['projects'], (old: any) => old?.map((p: any) => p.id === data.id ? data : p))
      setDraft(null); setIsEditing(false); toast.success('Strategic vector synced')
    }
  })

  return (
    <div className="h-screen flex bg-[#0a0c14] overflow-hidden text-slate-300">
       <ProjectRail projects={projects} selectedId={selectedId} onSelect={setSelectedId} onNew={() => {}} width={280} isCollapsed={isRailCollapsed} onToggleCollapse={() => setIsRailCollapsed(!isRailCollapsed)} />
       <div className="flex-1 flex flex-col overflow-hidden">
          <ProjectHUD project={project} isEditing={isEditing} isDirty={!!draft} onEdit={() => { setDraft(JSON.parse(JSON.stringify(project))); setIsEditing(true) }} onSave={() => mutation.mutate(draft)} onCancel={() => { setDraft(null); setIsEditing(false) }} onDelete={() => {}} isSaving={mutation.isPending} />
          {project && (
            <div className="h-10 bg-[#0d0f17] border-b border-white/5 flex items-center px-6 gap-8 shrink-0">
               {(['WORKBENCH', 'GANTT', 'ADOPTION', 'STREAM'] as const).map(t => <button key={t} onClick={() => setActiveTab(t)} className={`text-[10px] font-black uppercase tracking-[0.2em] relative h-full ${activeTab === t ? 'text-blue-400' : 'text-slate-600'}`}>{t}{activeTab === t && <motion.div layoutId="at" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />}</button>)}
            </div>
          )}
          <div className="flex-1 overflow-hidden relative">
             <AnimatePresence mode="wait">
                <motion.div key={activeTab + (selectedId || '')} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full w-full">
                   {activeTab === 'WORKBENCH' && project && <div className="h-full overflow-y-auto p-12 custom-scrollbar"><WorkbenchView project={project} onUpdate={(u:any) => isEditing ? setDraft(u) : mutation.mutate(u)} isEditing={isEditing} devices={devices} services={services} options={options} users={operators} /></div>}
                   {activeTab === 'GANTT' && project && <PrecisionGantt project={project} onUpdate={(u:any) => isEditing ? setDraft(u) : mutation.mutate(u)} />}
                   {activeTab === 'ADOPTION' && project && <ProjectAdoptionView project={project} onUpdate={(u:any) => isEditing ? setDraft(u) : mutation.mutate(u)} />}
                   {activeTab === 'STREAM' && <ProjectActivityStream project={project} allProjects={projects} />}
                   {(!project && activeTab !== 'STREAM') && (
                      <div className="h-full flex items-center justify-center">
                         <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                               <Search size={24} className="text-slate-700" />
                            </div>
                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] italic">Select a strategic vector from the rail</p>
                         </div>
                      </div>
                   )}
                </motion.div>
             </AnimatePresence>
          </div>

       </div>
       <style>{` .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; } .no-scrollbar::-webkit-scrollbar { display: none; } `}</style>
    </div>
  )
}
