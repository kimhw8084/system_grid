import os

# Reconstruct the entire Projects.tsx correctly
content = """import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
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
  Maximize2, Minimize2, PanelLeft, PanelRight, MousePointer2, GitBranch, Binary, Cpu, Network, Activity as ActivityIcon, ScrollText, GripVertical, Layout,
  Projector, Tag
} from 'lucide-react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { apiClient } from '../api/apiClient'
import { toast } from 'react-hot-toast'
import StatusPill from './shared/StatusPill'
import StyledSelect from './shared/StyledSelect'
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, Connection, MarkerType, Handle, Position } from 'reactflow'
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

// --- Node Types ---

const ProcessNode = ({ data }: any) => (
  <div className="px-6 py-3 shadow-2xl rounded-xl bg-[#0a0c14] border-2 border-blue-500/50 text-white min-w-[140px] flex items-center justify-center relative overflow-hidden group">
     <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
     <span className="text-[10px] font-black uppercase tracking-widest relative z-10">{data.label}</span>
     <Handle type="target" position={Position.Top} className="w-2 h-2 bg-blue-500 border-none" />
     <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-500 border-none" />
  </div>
)

const DiamondNode = ({ data }: any) => (
  <div className="w-24 h-24 rotate-45 bg-[#0a0c14] border-2 border-amber-500/50 flex items-center justify-center relative group overflow-hidden shadow-2xl">
     <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
     <span className="-rotate-45 text-[9px] font-black uppercase tracking-tighter text-amber-400 text-center px-2">{data.label}</span>
     <Handle type="target" position={Position.Top} className="w-2 h-2 bg-amber-500 border-none !top-[-4px] !left-1/2 !-translate-x-1/2" />
     <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-amber-500 border-none !bottom-[-4px] !left-1/2 !-translate-x-1/2" />
     <Handle type="source" position={Position.Left} className="w-2 h-2 bg-amber-500 border-none !left-[-4px] !top-1/2 !-translate-y-1/2" />
     <Handle type="source" position={Position.Right} className="w-2 h-2 bg-amber-500 border-none !right-[-4px] !top-1/2 !-translate-y-1/2" />
  </div>
)

const InfrastructureNode = ({ data, type }: any) => {
  const Icon = type === 'db' ? Database : type === 'cloud' ? Globe : type === 'storage' ? Layers : Server
  const color = type === 'db' ? 'emerald' : type === 'cloud' ? 'sky' : type === 'storage' ? 'purple' : 'slate'
  
  return (
    <div className={`px-4 py-3 rounded-2xl bg-[#0a0c14] border-2 border-${color}-500/40 text-white min-w-[120px] flex flex-col items-center gap-2 shadow-2xl group transition-all hover:border-${color}-500`}>
       <div className={`w-10 h-10 bg-${color}-600/10 rounded-xl flex items-center justify-center border border-${color}-500/20 group-hover:scale-110 transition-transform`}>
          <Icon size={20} className={`text-${color}-400`} />
       </div>
       <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">{data.label}</span>
       <Handle type="target" position={Position.Top} className={`w-2 h-2 bg-${color}-500 border-none`} />
       <Handle type="source" position={Position.Bottom} className={`w-2 h-2 bg-${color}-500 border-none`} />
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

// --- HUD Component ---

export const ProjectHUD = ({ project, isEditing, isDirty, onEdit, onSave, onCancel, onDelete, isSaving }: any) => {
  if (!project) return null
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
                </div>
             </div>
          </div>
       </div>
       <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
             {isEditing ? (
               <>
                 <button onClick={onCancel} className="px-4 py-2 text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-all">Discard</button>
                 <button onClick={onSave} disabled={isSaving || !isDirty} className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${isDirty ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-600'}`}>
                    <Save size={14} /> {isSaving ? 'Syncing...' : 'Commit Changes'}
                 </button>
               </>
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
    return [...projects].filter(p => p.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
  }, [projects, search])

  if (isCollapsed) return <div className="w-12 bg-[#0a0c14] border-r border-white/5 flex flex-col items-center py-4"><button onClick={onToggleCollapse} className="p-2 text-slate-500"><PanelLeft size={18}/></button></div>

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
                      <div className="mt-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest">{p.owners?.join(', ') || p.owner}</div>
                      <div className="mt-2 text-[8px] text-slate-600 uppercase">Created: {format(new Date(p.created_at), 'MMM dd, yyyy')}</div>
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
  const addNode = (type: string, label: string) => setNodes(nds => [...eds, { id: Date.now().toString(), type, data: { label }, position: { x: 100, y: 100 } }])
  useEffect(() => { onChange({ nodes, edges }) }, [nodes, edges])
  return (
    <div className="h-[650px] bg-[#0a0c14] border border-white/5 rounded-2xl overflow-hidden relative">
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} fitView><Background color="#1e293b" gap={20} /><Controls /></ReactFlow>
      <div className="absolute top-6 left-6 flex gap-4 bg-black/60 p-2 rounded-2xl border border-white/10 backdrop-blur-xl">
         <button onClick={() => addNode('process', 'STEP')} className="p-2 text-blue-400"><Layout size={18}/></button>
         <button onClick={() => addNode('diamond', 'DECISION')} className="p-2 text-amber-400"><MousePointer2 size={18}/></button>
         <button onClick={() => addNode('server', 'SERVER')} className="p-2 text-slate-400"><Server size={18}/></button>
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

  const handleFieldChange = (field: string, value: any) => { if (project && project[field] !== value) onUpdate({ ...project, [field]: value }) }
  const userOptions = useMemo(() => users?.map((u:any) => ({ value: u.username, label: u.full_name || u.username })) || [], [users])
  const typeOptions = useMemo(() => options?.filter((o:any) => o.category === 'ProjectType') || PROJECT_TYPES, [options])

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-32">
       <section className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 bg-[#0a0c14]/50 flex gap-8 items-end">
             <div className="flex-1 space-y-2"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Project Identifier</label>{isEditing ? <input value={name} onChange={e => setName(e.target.value)} onBlur={() => handleFieldChange('name', name)} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all" /> : <h2 className="text-2xl font-black text-white tracking-tighter px-1">{project.name}</h2>}</div>
             <div className="w-48">{isEditing ? <StyledSelect label="Status" value={project.status} onChange={(e:any) => handleFieldChange('status', e.target.value)} options={PROJECT_STATUSES} /> : <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Status</label><div className="h-10 flex items-center px-1"><StatusPill value={project.status} /></div></div>}</div>
             <div className="w-48">{isEditing ? <StyledSelect label="Priority" value={project.priority} onChange={(e:any) => handleFieldChange('priority', e.target.value)} options={PROJECT_PRIORITIES} /> : <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Priority</label><div className="h-10 flex items-center px-1"><span className={`text-[10px] font-black uppercase tracking-widest ${project.priority === 'High' ? 'text-rose-500' : 'text-slate-500'}`}>{project.priority}</span></div></div>}</div>
          </div>
          <div className="p-8 grid grid-cols-2 gap-10">
             <div className="space-y-3"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Problem Statement</h4><div className="bg-black/20 p-6 rounded-2xl border border-white/5 min-h-[160px]">{isEditing ? <textarea value={problemStatement} onChange={e => setProblemStatement(e.target.value)} onBlur={() => handleFieldChange('problem_statement', problemStatement)} className="w-full h-full bg-transparent border-none outline-none text-xs font-bold text-slate-300 leading-relaxed resize-none" /> : <p className="text-xs font-bold text-slate-400 leading-relaxed">{project.problem_statement || 'Awaiting definition...'}</p>}</div></div>
             <div className="space-y-3"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Strategic Objective</h4><div className="bg-black/20 p-6 rounded-2xl border border-white/5 min-h-[160px]">{isEditing ? <textarea value={objective} onChange={e => setObjective(e.target.value)} onBlur={() => handleFieldChange('objective', objective)} className="w-full h-full bg-transparent border-none outline-none text-xs font-bold text-slate-300 leading-relaxed resize-none" /> : <p className="text-xs font-bold text-slate-400 leading-relaxed">{project.objective || 'Awaiting definition...'}</p>}</div></div>
          </div>
          <div className="p-8 grid grid-cols-2 gap-10 bg-[#0a0c14]/30 border-t border-white/5 items-start">
             <div className="space-y-3"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Ownership Matrix</label><div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar bg-black/40 border border-white/10 rounded-2xl p-4">{userOptions.filter((o:any) => isEditing || (project.owners || []).includes(o.value)).map((o:any) => <label key={o.value} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${(project.owners || []).includes(o.value) ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-slate-600'}`}>{isEditing && <input type="checkbox" checked={(project.owners || []).includes(o.value)} onChange={e => { const current = project.owners || []; const updated = e.target.checked ? [...current, o.value] : current.filter((x:any) => x !== o.value); handleFieldChange('owners', updated) }} className="w-4 h-4 rounded border-white/10 bg-black/40 text-blue-600" />}<span className="text-[10px] font-black uppercase tracking-tight truncate">{o.label}</span></label>)}</div></div>
             <div className="space-y-6">{isEditing ? <StyledSelect label="Vector Type" value={project.type || ''} onChange={(e:any) => handleFieldChange('type', e.target.value)} options={typeOptions} /> : <div className="space-y-2"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Vector Type</label><div className="flex items-center gap-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5 h-[120px]"><div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20"><Projector size={20} className="text-blue-400" /></div><div><p className="text-sm font-black text-blue-400 uppercase tracking-widest">{project.type || 'N/A'}</p><p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Strategic Classification</p></div></div></div>}</div>
          </div>
       </section>

       <section className="space-y-6">
          <div className="flex items-center justify-between px-1"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2"><Workflow size={14} className="text-blue-500" /> Strategic Design & Architecture</h4>{isEditing && <button onClick={() => { const metadata = project?.metadata_json || {}; const newDiagrams = [...(metadata.diagrams || []), { id: Date.now(), name: `Design v${(metadata.diagrams || []).length + 1}`, nodes: [], edges: [] }]; handleFieldChange('metadata_json', { ...metadata, diagrams: newDiagrams }); setActiveDiagramIndex(newDiagrams.length - 1) }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2"><Plus size={14} /> New Vector</button>}</div>
          <div className="space-y-4">{(project?.metadata_json?.diagrams || []).map((d: any, idx: number) => <div key={d.id} className={`border rounded-2xl overflow-hidden transition-all ${activeDiagramIndex === idx ? 'border-blue-500/30 shadow-[0_0_40px_rgba(37,99,235,0.1)]' : 'border-white/5 bg-white/[0.02]'}`}><div className="flex items-center justify-between pr-6"><button onClick={() => setActiveDiagramIndex(activeDiagramIndex === idx ? null : idx)} className="flex-1 px-8 py-4 flex items-center gap-4 hover:bg-white/5 transition-all text-left"><div className={`w-2 h-2 rounded-full ${activeDiagramIndex === idx ? 'bg-blue-500' : 'bg-slate-700'}`} /><span className={`text-[11px] font-black uppercase tracking-[0.2em] ${activeDiagramIndex === idx ? 'text-white' : 'text-slate-500'}`}>{d.name}</span></button></div><AnimatePresence>{activeDiagramIndex === idx && <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/5 bg-[#0a0c14]"><DiagramBuilder data={d} onChange={(updated: any) => { const metadata = project?.metadata_json || {}; const newDiagrams = [...(metadata.diagrams || [])]; newDiagrams[idx] = { ...newDiagrams[idx], ...updated }; handleFieldChange('metadata_json', { ...metadata, diagrams: newDiagrams }) }} onSave={() => { setActiveDiagramIndex(null); toast.success('Vector Baseline Committed'); }} /></motion.div>}</AnimatePresence></div>)}</div>
       </section>

       <section className="space-y-6">
          <div className="flex items-center justify-between px-1"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2"><BookOpen size={14} className="text-sky-500" /> Strategic References</h4>{isEditing && !isAddingRef && <button onClick={() => setIsAddingRef(true)} className="p-1.5 hover:bg-white/5 rounded-lg text-sky-400 transition-all"><Plus size={18}/></button>}</div>
          <div className="grid grid-cols-3 gap-6">{isAddingRef && <div className="p-4 bg-white/5 rounded-2xl border border-sky-500/30 space-y-4"><div className="space-y-3"><input autoFocus value={newRefLabel} onChange={e => setNewRefLabel(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-white outline-none" placeholder="Reference Label" /><input value={newRefUrl} onChange={e => setNewRefUrl(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-white outline-none" placeholder="https://..." /></div><div className="flex gap-2"><button onClick={() => setIsAddingRef(false)} className="flex-1 py-1.5 bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500 rounded-lg">Cancel</button><button onClick={() => { if (!newRefLabel || !newRefUrl) return; const metadata = project?.metadata_json || {}; const references = [...(metadata.references || []), { label: newRefLabel, url: newRefUrl }]; handleFieldChange('metadata_json', { ...metadata, references }); setNewRefLabel(''); setNewRefUrl(''); setIsAddingRef(false) }} className="flex-[2] py-1.5 bg-sky-600 text-[9px] font-black uppercase tracking-widest text-white rounded-lg">Attach Ref</button></div></div>}{(project?.metadata_json?.references || []).map((ref: any, i: number) => <div key={i} className="flex items-center gap-3 group"><a href={ref.url} target="_blank" rel="noreferrer" className="flex-1 p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-sky-500/20 transition-all flex justify-between items-center group/link"><div className="flex items-center gap-3 overflow-hidden"><div className="w-8 h-8 bg-sky-600/10 rounded-lg flex items-center justify-center border border-sky-500/20"><LinkIcon size={14} className="text-sky-400" /></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate group-hover/link:text-sky-400 transition-colors">{ref.label}</span></div><ExternalLink size={12} className="text-slate-700" /></a></div>)}</div>
       </section>

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
    const newRecord = { description: newDescription, benefit: newBenefit, timestamp: new Date().toISOString() }
    let updatedAdoption
    if (existingTeam) { updatedAdoption = adoption.map((a: any) => a.team === teamName ? { ...a, current: newRecord, history: [a.current, ...(a.history || [])] } : a) }
    else { updatedAdoption = [...adoption, { team: teamName, current: newRecord, history: [] }] }
    onUpdate({ ...project, metadata_json: { ...metadata, adoption: updatedAdoption } })
    setNewDescription(''); setNewBenefit(''); setIsAddingTeam(false); setNewTeam('')
  }

  return (
    <div className="h-full flex flex-col p-8 space-y-10 max-w-6xl mx-auto">
       <div className="flex items-center justify-between bg-emerald-600/5 p-8 rounded-3xl border border-emerald-500/10">
          <div className="flex items-center gap-6"><div className="w-16 h-16 bg-emerald-600/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]"><TrendingUp size={32} className="text-emerald-400" /></div><div><h2 className="text-2xl font-black text-white tracking-tighter uppercase">Stakeholder Adoption Ledger</h2><p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Unified record of strategic utility and business resonance</p></div></div>
          <button onClick={() => setIsAddingTeam(true)} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center gap-3"><Plus size={18}/> Register Team</button>
       </div>
       <div className="space-y-8">
          {isAddingTeam && <div className="bg-[#0d0f17] border border-blue-500/30 rounded-3xl p-8 space-y-6 shadow-2xl animate-in fade-in slide-in-from-top-4"><div className="flex items-center justify-between"><h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">New Adoption Vector</h4><button onClick={() => setIsAddingTeam(false)} className="text-slate-500 hover:text-white"><X size={20}/></button></div><div className="grid grid-cols-12 gap-6"><div className="col-span-4 space-y-2"><label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-1">Stakeholder Team</label><input value={newTeam} onChange={e => setNewTeam(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50" placeholder="e.g. Platform Ops" /></div><div className="col-span-8 space-y-2"><label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-1">Utility Description</label><input value={newDescription} onChange={e => setNewDescription(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50" placeholder="How are they utilizing the outcome?" /></div><div className="col-span-12 space-y-2"><label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-1">Strategic Benefit</label><textarea value={newBenefit} onChange={e => setNewBenefit(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50 h-24 resize-none" placeholder="Measurable value or friction reduction..." /></div></div><div className="flex justify-end gap-4"><button onClick={() => setIsAddingTeam(false)} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancel</button><button onClick={() => handleAddEntry(newTeam)} className="px-8 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20">Commit Entry</button></div></div>}
          <div className="grid grid-cols-1 gap-6">{adoption.map((entry: any, idx: number) => <div key={idx} className="bg-[#0d0f17]/50 border border-white/5 rounded-3xl overflow-hidden shadow-xl"><div className="p-6 bg-white/[0.02] border-b border-white/5 flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20"><Users size={18} className="text-blue-400" /></div><div><h3 className="text-lg font-black text-white uppercase tracking-tighter leading-none">{entry.team}</h3><p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Active Stakeholder Cluster</p></div></div><button onClick={() => { setNewTeam(entry.team); setIsAddingTeam(true); }} className="px-4 py-1.5 bg-white/5 hover:bg-blue-600/20 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-400 rounded-xl border border-white/5 transition-all">Update Utility Record</button></div><div className="p-8 grid grid-cols-12 gap-10"><div className="col-span-7 space-y-6"><div className="space-y-2"><label className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Current Utility State</label><div className="bg-black/40 p-6 rounded-2xl border border-emerald-500/10 space-y-4"><p className="text-sm font-bold text-slate-200 leading-relaxed italic">"{entry.current.description}"</p><div className="pt-4 border-t border-white/5"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Realized Benefit</p><p className="text-xs font-bold text-emerald-400/80 leading-relaxed">{entry.current.benefit}</p></div><div className="flex justify-end pt-2"><span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">Recorded: {format(new Date(entry.current.timestamp), 'MMM dd, yyyy HH:mm')}</span></div></div></div></div><div className="col-span-5 space-y-4"><label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] px-2">Evolution History</label><div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">{(entry.history || []).map((h: any, i: number) => <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 opacity-60 hover:opacity-100 transition-opacity"><p className="text-[10px] font-bold text-slate-400 line-clamp-2 leading-relaxed">"{h.description}"</p><div className="flex justify-between items-center"><span className="text-[8px] font-bold text-slate-700 uppercase">{format(new Date(h.timestamp), 'MMM dd, yyyy')}</span><span className="text-[8px] font-black text-blue-500/40 uppercase tracking-tighter">ARCHIVED</span></div></div>)}{(entry.history || []).length === 0 && <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl opacity-20"><History size={24} className="mx-auto mb-2" /><p className="text-[8px] font-black uppercase tracking-widest">Baseline State</p></div>}</div></div></div></div>)}</div>
       </div>
    </div>
  )
}

const ProjectActivityStream = ({ project, allProjects = [] }: any) => {
  const [isFull, setIsFull] = useState(false)
  const activities = useMemo(() => {
    const list = project 
      ? [...(project?.tasks || []).flatMap((t:any) => (t?.metadata_json?.history || []).map((h:any) => ({ ...h, type: 'TASK', taskName: t?.name, icon: <Target size={14}/> }))), ...(project?.tasks || []).flatMap((t:any) => (t?.metadata_json?.comments || []).map((c:any) => ({ ...c, type: 'COMMENT', taskName: t?.name, icon: <MessageSquare size={14}/> }))), ...(project?.metadata_json?.audit_log || []).map((a:any) => ({ ...a, type: 'PROJECT', icon: <Projector size={14}/> }))]
      : allProjects.flatMap((p:any) => [...(p?.tasks || []).flatMap((t:any) => (t?.metadata_json?.history || []).map((h:any) => ({ ...h, type: 'TASK', taskName: t?.name, projectName: p?.name, icon: <Target size={14}/> }))), ...(p?.tasks || []).flatMap((t:any) => (t?.metadata_json?.comments || []).map((c:any) => ({ ...c, type: 'COMMENT', taskName: t?.name, projectName: p?.name, icon: <MessageSquare size={14}/> }))), ...(p?.metadata_json?.audit_log || []).map((a:any) => ({ ...a, type: 'PROJECT', projectName: p?.name, icon: <Projector size={14}/> }))])
    return list.sort((a:any, b:any) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime())
  }, [project, allProjects])

  return (
    <div className={`flex flex-col bg-[#0d0f17] transition-all ${isFull ? 'fixed inset-0 z-[200] p-12' : 'h-full p-6'}`}>
       <div className="flex items-center justify-between mb-8"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20"><Activity size={20} className="text-blue-400" /></div><div><h3 className="text-xl font-bold text-white uppercase tracking-tighter">Strategic Evolution Stream</h3><p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">Unified ledger of tactical shifts and strategic commits</p></div></div><button onClick={() => setIsFull(!isFull)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all">{isFull ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</button></div>
       <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-4">
          {activities.map((item:any, i:number) => <div key={i} className="group relative flex gap-6 p-5 bg-[#0a0c14] border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all"><div className="flex flex-col items-center gap-2"><div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${item.type === 'COMMENT' ? 'bg-amber-600/10 border-amber-500/20 text-amber-400' : item.type === 'TASK' ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400'}`}>{item.icon}</div><div className="w-px flex-1 bg-white/5" /></div><div className="flex-1 space-y-3"><div className="flex justify-between items-center"><div className="flex items-center gap-3"><span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{item.author || 'SYSTEM'}</span><span className="text-slate-800">•</span><span className="text-[9px] font-bold text-blue-500/60 uppercase tracking-widest">{item.type}</span>{item.projectName && <><span className="text-slate-800">/</span><span className="text-[9px] font-bold text-slate-500 uppercase">{item.projectName}</span></>}</div><span className="text-[9px] font-bold text-slate-700 uppercase">{format(new Date(item.timestamp || item.created_at), 'MMM dd, yyyy HH:mm:ss')}</span></div><div className="bg-black/20 p-4 rounded-xl border border-white/5"><p className="text-xs font-bold text-slate-300 leading-relaxed italic">"{item.content || item.message}"</p></div>{item.taskName && <div className="flex items-center gap-2"><Tag size={10} className="text-blue-500" /><span className="text-[9px] font-bold text-blue-400/60 uppercase tracking-widest">{item.taskName}</span></div>}</div></div>)}
          {activities.length === 0 && <div className="h-full flex flex-col items-center justify-center py-40 opacity-20"><History size={64} className="text-slate-500 mb-6" /><p className="text-xs font-bold uppercase tracking-[0.4em] text-slate-500 text-center">No project evolutions captured in current context</p></div>}
       </div>
    </div>
  )
}

// --- Executive Chart ---

const ExecutiveChart = ({ tasks }: { tasks: any[] }) => {
  const [tooltip, setTooltip] = useState<any>(null)
  const data = useMemo(() => {
    if (!tasks || tasks.length === 0) return []
    const times = tasks.flatMap(t => [new Date(t.start_date).getTime(), new Date(t.end_date).getTime(), t.actual_start_date ? new Date(t.actual_start_date).getTime() : null, t.actual_end_date ? new Date(t.actual_end_date).getTime() : null]).filter(t => t !== null && !isNaN(t))
    if (times.length === 0) return []
    const start = startOfMonth(new Date(Math.min(...times)))
    const end = endOfMonth(addDays(new Date(Math.max(...times)), 30))
    const interval = eachDayOfInterval({ start, end })
    const step = interval.length > 60 ? 7 : (interval.length > 30 ? 2 : 1)
    return interval.filter((_, i) => i % step === 0).map(date => {
      const scheduledCount = tasks.filter(t => new Date(t.end_date) <= date).length
      const actualCount = tasks.filter(t => t.actual_end_date && new Date(t.actual_end_date) <= date).length
      return { date: format(date, 'MMM d'), fullDate: date, scheduled: Math.round((scheduledCount / (tasks.length || 1)) * 100), actual: Math.round((actualCount / (tasks.length || 1)) * 100), plannedTasks: tasks.filter(t => isSameDay(new Date(t.end_date), date)), actualTasks: tasks.filter(t => t.actual_end_date && isSameDay(new Date(t.actual_end_date), date)) }
    })
  }, [tasks])

  return (
    <div className="h-full w-full bg-[#0a0c14] p-8 flex flex-col gap-6 relative">
       <div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20"><BarChart3 size={20} className="text-blue-400" /></div><div><h3 className="text-lg font-black text-white uppercase tracking-tighter leading-none">Performance Trajectory</h3><p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Cumulative Milestone Delivery (Planned vs Actual)</p></div></div><div className="flex gap-6"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] font-bold text-slate-400 uppercase">Planned</span></div><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] font-bold text-slate-400 uppercase">Actual</span></div></div></div>
       <div className="flex-1 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} onMouseMove={(e:any) => { if(e.activePayload) setTooltip(e.activePayload[0].payload) }} onMouseLeave={() => setTooltip(null)}><defs><linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient><linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}} /><YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}} tickFormatter={(v) => `${v}%`} /><Area type="monotone" dataKey="scheduled" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScheduled)" /><Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" /></AreaChart></ResponsiveContainer></div>
       <AnimatePresence>{tooltip && (tooltip.plannedTasks.length > 0 || tooltip.actualTasks.length > 0) && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-12 left-12 p-6 bg-[#0d0f17] border border-blue-500/30 rounded-2xl shadow-2xl z-50 w-72 pointer-events-none"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">{format(tooltip.fullDate, 'MMMM dd, yyyy')}</p><div className="space-y-4">{tooltip.plannedTasks.length > 0 && <div className="space-y-2"><p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Planned Completions</p>{tooltip.plannedTasks.map((t:any) => <div key={t.id} className="text-[11px] font-bold text-slate-300 pl-3.5 leading-tight">{t.name}</div>)}</div>}{tooltip.actualTasks.length > 0 && <div className="space-y-2"><p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Actual Completions</p>{tooltip.actualTasks.map((t:any) => <div key={t.id} className="text-[11px] font-bold text-slate-300 pl-3.5 leading-tight">{t.name}</div>)}</div>}</div></motion.div>}</AnimatePresence>
    </div>
  )
}

// --- Gantt Chart ---

const PrecisionGantt = ({ project, onUpdate }: any) => {
  const [tasks, setTasks] = useState<any[]>(project?.tasks || [])
  const [dragStartTasks, setDragStartTasks] = useState<any[] | null>(null)
  const [zoomLevel, setZoomLevel] = useState(30)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set())
  const [dependencySourceId, setDependencySourceId] = useState<number | null>(null)
  const [showExecutiveChart, setShowExecutiveChart] = useState(false)
  const [isPackingMode, setIsPackingMode] = useState(false)
  const [cursorDate, setCursorDate] = useState<{ date: string, x: number, y: number } | null>(null)
  const [dragStatus, setDragStatus] = useState<any>(null)
  const ROW_HEIGHT = 44
  const listRef = useRef<HTMLDivElement>(null)

  const handleScroll = (e: any) => { if (e.target === listRef.current && timelineRef.current) timelineRef.current.scrollTop = e.target.scrollTop; else if (e.target === timelineRef.current && listRef.current) listRef.current.scrollTop = e.target.scrollTop }
  
  const startDate = useMemo(() => {
    const base = dragStartTasks || tasks
    if (!base.length) return startOfMonth(new Date())
    const times = base.map(t => new Date(t.start_date).getTime()).filter(t => !isNaN(t))
    return addDays(new Date(Math.min(...times)), -14)
  }, [tasks, !!dragStartTasks])

  const getDayOffset = useCallback((date: string) => differenceInDays(new Date(date), startDate), [startDate])
  const getDayWidth = useCallback((start: string, end: string) => Math.max(1, differenceInDays(new Date(end), new Date(start))), [])

  const handleTaskMove = useCallback((id: number, offset: number, isFinal = false) => {
    if (!isFinal) {
      if (!dragStartTasks) setDragStartTasks([...tasks])
      const daysMoved = Math.round(offset / zoomLevel)
      const updated = tasks.map(t => {
        if (t.id === id || selectedTaskIds.has(t.id)) {
          const startTask = (dragStartTasks || tasks).find(bt => bt.id === t.id)
          if (!startTask) return t
          const newStart = addDays(new Date(startTask.start_date), daysMoved)
          const duration = differenceInDays(new Date(startTask.end_date), new Date(startTask.start_date))
          return { ...t, start_date: newStart.toISOString(), end_date: addDays(newStart, duration).toISOString() }
        }
        return t
      })
      setTasks(updated)
      setDragStatus({ type: 'move', date: format(new Date(updated.find(t => t.id === id).start_date), 'MMM dd, yyyy') })
    } else {
      setDragStartTasks(null); setDragStatus(null); onUpdate({ ...project, tasks })
    }
  }, [tasks, dragStartTasks, zoomLevel, selectedTaskIds, onUpdate])

  const handleTaskResize = useCallback((id: number, offset: number, type: 'start' | 'end', isFinal = false) => {
    if (!isFinal) {
      if (!dragStartTasks) setDragStartTasks([...tasks])
      const daysMoved = Math.round(offset / zoomLevel)
      const updated = tasks.map(t => {
        if (t.id === id) {
          const startTask = (dragStartTasks || tasks).find(bt => bt.id === t.id)
          if (!startTask) return t
          const newDate = addDays(new Date(type === 'start' ? startTask.start_date : startTask.end_date), daysMoved)
          return { ...t, [type === 'start' ? 'start_date' : 'end_date']: newDate.toISOString() }
        }
        return t
      })
      setTasks(updated)
      setDragStatus({ type: 'resize', date: format(new Date(updated.find(t => t.id === id)[type === 'start' ? 'start_date' : 'end_date']), 'MMM dd, yyyy') })
    } else {
      setDragStartTasks(null); setDragStatus(null); onUpdate({ ...project, tasks })
    }
  }, [tasks, dragStartTasks, zoomLevel, onUpdate])

  const packedTasks = useMemo(() => {
    if (!isPackingMode) return tasks.map((t, i) => ({ ...t, rowIndex: i }))
    const rows: any[][] = []
    tasks.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()).forEach(task => {
      let assigned = false
      for (let i = 0; i < rows.length; i++) {
        if (new Date(task.start_date) >= new Date(rows[i][rows[i].length - 1].end_date)) { rows[i].push(task); assigned = true; break; }
      }
      if (!assigned) rows.push([task])
    })
    return rows.flatMap((row, rowIndex) => row.map(task => ({ ...task, rowIndex })))
  }, [tasks, isPackingMode])

  return (
    <div className="h-full flex flex-col bg-[#0b0c14] overflow-hidden">
       <div className="h-11 border-b border-white/10 flex items-center px-6 justify-between bg-[#0a0c14] z-40">
          <div className="flex items-center gap-6"><button onClick={() => setShowExecutiveChart(!showExecutiveChart)} className={`p-1.5 rounded-lg border ${showExecutiveChart ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><BarChart3 size={16}/></button><button onClick={() => setIsPackingMode(!isPackingMode)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase border ${isPackingMode ? 'text-blue-400 border-blue-500/30' : 'text-slate-500'}`}>{isPackingMode ? 'Compact Mode' : 'Standard Mode'}</button></div>
          <button onClick={() => { const name = prompt('Milestone Identifier'); if(name) { const updated = [...tasks, { id: Date.now(), name, start_date: new Date().toISOString(), end_date: addDays(new Date(), 7).toISOString(), progress: 0, status: 'To Do', metadata_json: {} }]; setTasks(updated); onUpdate({ ...project, tasks: updated }) } }} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase"><Plus size={14}/> New Milestone</button>
       </div>
       {showExecutiveChart && <div className="h-[300px] border-b border-white/10 shrink-0"><ExecutiveChart tasks={tasks} /></div>}
       <div className="flex-1 flex overflow-hidden relative">
          {!isPackingMode && <div className="w-[240px] border-r border-white/10 bg-[#0d0f17] z-30 flex flex-col"><div className="h-11 border-b border-white/10 flex items-center px-5 shrink-0 uppercase text-[10px] font-bold text-slate-600">Vectors</div><div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar">{tasks.map(t => <div key={t.id} onClick={() => setSelectedTaskIds(new Set([t.id]))} onDoubleClick={() => setSelectedTaskId(t.id)} className={`h-[44px] flex items-center px-4 border-b border-white/5 cursor-pointer transition-all ${selectedTaskIds.has(t.id) ? 'bg-blue-600/10' : 'hover:bg-white/5'}`}><div className={`w-1.5 h-1.5 rounded-full mr-3 ${t.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-500'}`} /><p className="text-[10px] font-bold text-slate-300 truncate">{t.name}</p></div>)}</div></div>}
          <div ref={timelineRef} onScroll={handleScroll} className="flex-1 overflow-auto custom-scrollbar relative bg-[#0b0c14]">
             <div className="sticky top-0 z-30 flex bg-[#0a0c14]/95 backdrop-blur-md border-b border-white/10" style={{ width: 365 * zoomLevel }}>
                {eachDayOfInterval({ start: startDate, end: addDays(startDate, 365) }).map((d, i) => <div key={i} className="shrink-0 border-r border-white/5 flex flex-col items-center justify-center h-11" style={{ width: zoomLevel }}><span className="text-[8px] font-bold text-slate-600 uppercase">{format(d, 'MMM')}</span><span className="text-[11px] font-bold text-slate-400">{format(d, 'd')}</span></div>)}
             </div>
             <div className="relative" style={{ width: 365 * zoomLevel, height: (packedTasks.length + 1) * ROW_HEIGHT }}>
                {packedTasks.map(t => <TaskRow key={t.id} task={t} rowIndex={t.rowIndex} startDate={startDate} zoomLevel={zoomLevel} selectedTaskIds={selectedTaskIds} handleTaskMove={handleTaskMove} handleTaskResize={handleTaskResize} setSelectedTaskId={setSelectedTaskId} handleSelectTask={(id:any)=>setSelectedTaskIds(new Set([id]))} onDependencyStart={()=>{}} ROW_HEIGHT={ROW_HEIGHT} getDayOffset={getDayOffset} getDayWidth={getDayWidth} />)}
             </div>
          </div>
       </div>
       <AnimatePresence>{selectedTaskId && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-8"><motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0d0f17] w-[1000px] h-[85vh] border border-white/10 rounded-lg shadow-2xl flex flex-col overflow-hidden">{(() => { const task = tasks.find(t => t.id === selectedTaskId); if(!task) return null; const subtasks = task.metadata_json?.subtasks || []; const [inlineSubtask, setInlineSubtask] = useState(''); const updateSub = (idx:any, up:any) => { const news = [...subtasks]; news[idx] = {...news[idx], ...up}; setTasks(ts => ts.map(tk => tk.id === task.id ? {...tk, metadata_json: {...tk.metadata_json, subtasks: news}} : tk)) }; return (<><div className="p-8 border-b border-white/10 flex items-center justify-between"><h2 className="text-xl font-bold text-white">{task.name}</h2><button onClick={() => setSelectedTaskId(null)}><X/></button></div><div className="flex-1 overflow-y-auto p-10 grid grid-cols-12 gap-10"><div className="col-span-7 space-y-12"><section className="space-y-4"><h4 className="text-[10px] uppercase font-black text-slate-500">Requirements</h4><div className="space-y-3">{subtasks.map((s:any, i:any) => <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl"><div className="text-[10px] font-black text-slate-700 w-6">{String(i+1).padStart(2,'0')}</div><input type="checkbox" checked={s.completed} onChange={e => updateSub(i, {completed: e.target.checked})} className="w-5 h-5" /><input value={s.label} onChange={e => updateSub(i, {label: e.target.value})} className="flex-1 bg-transparent border-none text-xs font-bold text-slate-200" /></div>)}<div className="flex gap-2 p-2 bg-black/40 rounded-xl border border-dashed border-white/10"><input value={inlineSubtask} onChange={e => setInlineSubtask(e.target.value)} placeholder="New requirement..." className="flex-1 bg-transparent px-4 text-xs font-bold" /><button onClick={() => { const ns = [...subtasks, {label: inlineSubtask, completed: false}]; setTasks(ts => ts.map(tk => tk.id === task.id ? {...tk, metadata_json: {...tk.metadata_json, subtasks: ns}} : tk)); setInlineSubtask('') }} className="p-2 bg-blue-600 rounded-lg"><Plus/></button></div></div></section></div><div className="col-span-5"><section className="space-y-4"><h4 className="text-[10px] font-black uppercase text-slate-500">Status Vector</h4><select value={task.status} onChange={e => setTasks(ts => ts.map(tk => tk.id === task.id ? {...tk, status: e.target.value} : tk))} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs font-bold text-white uppercase">{['To Do', 'In Progress', 'Blocked', 'Review', 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}</select></section></div></div><div className="p-8 border-t border-white/10 flex justify-end gap-4"><button onClick={() => { onUpdate({...project, tasks}); setSelectedTaskId(null); toast.success('Vector Synced') }} className="px-8 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">Commit Changes</button></div></>) })()}</motion.div></div>}</AnimatePresence>
    </div>
  )
}

// --- Main Page Component ---

export default function Projects() {
  const queryClient = useQueryClient()
  const { data: projects = [], isLoading: loadingProjects } = useQuery({ queryKey: ['projects'], queryFn: () => apiClient.get('/projects') })
  const { data: devices = [] } = useQuery({ queryKey: ['devices'], queryFn: () => apiClient.get('/devices') })
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: () => apiClient.get('/services') })
  const { data: options = [] } = useQuery({ queryKey: ['options'], queryFn: () => apiClient.get('/settings/options') })
  const { data: operators = [] } = useQuery({ queryKey: ['operators'], queryFn: () => apiClient.get('/settings/operators') })

  const [selectedProjectId, setSelectedProjectId] = useState<number | 'HUDDLE' | null>(null)
  const [isGlobalEditing, setIsGlobalEditing] = useState(false)
  const [draftProject, setDraftProject] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'WORKBENCH' | 'GANTT' | 'ADOPTION' | 'STREAM'>('WORKBENCH')
  const [railWidth, setRailWidth] = useState(300)
  const [ledgerWidth, setLedgerWidth] = useState(320)
  const [isRailCollapsed, setIsRailCollapsed] = useState(false)
  const [isLedgerCollapsed, setIsLedgerCollapsed] = useState(false)

  const selectedProject = useMemo(() => draftProject || projects.find((p: any) => p.id === selectedProjectId), [selectedProjectId, projects, draftProject])

  const mutation = useMutation({
    mutationFn: (data: any) => apiClient.put(`/projects/${data.id}`, data),
    onSuccess: (data) => {
      queryClient.setQueryData(['projects'], (old: any) => old?.map((p: any) => p.id === data.id ? data : p))
      setDraftProject(null); setIsGlobalEditing(false); toast.success('Strategic vector synced')
    }
  })

  const handleUpdate = (updated: any) => { if (isGlobalEditing) setDraftProject(updated); else mutation.mutate(updated) }

  return (
    <div className="h-screen flex bg-[#0a0c14] overflow-hidden">
       <ProjectRail projects={projects} selectedId={selectedProjectId} onSelect={setSelectedProjectId} onNew={() => {}} onReorder={() => {}} width={railWidth} onResize={setRailWidth} isCollapsed={isRailCollapsed} onToggleCollapse={() => setIsRailCollapsed(!isRailCollapsed)} />
       <div className="flex-1 flex flex-col overflow-hidden">
          <ProjectHUD project={selectedProject} isEditing={isGlobalEditing} isDirty={!!draftProject} onEdit={() => { setDraftProject(JSON.parse(JSON.stringify(selectedProject))); setIsGlobalEditing(true) }} onSave={() => mutation.mutate(draftProject)} onCancel={() => { setDraftProject(null); setIsGlobalEditing(false) }} onDelete={() => {}} isSaving={mutation.isPending} />
          {selectedProject && (
            <div className="h-10 bg-[#0d0f17] border-b border-white/5 flex items-center px-6 gap-8">
               {(['WORKBENCH', 'GANTT', 'ADOPTION', 'STREAM'] as const).map(t => <button key={t} onClick={() => setActiveTab(t)} className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all relative h-full ${activeTab === t ? 'text-blue-400' : 'text-slate-600 hover:text-slate-400'}`}>{t}{activeTab === t && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />}</button>)}
            </div>
          )}
          <div className="flex-1 overflow-hidden relative">
             <AnimatePresence mode="wait">
                <motion.div key={activeTab + (selectedProjectId || '')} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full w-full">
                   {activeTab === 'WORKBENCH' && <div className="h-full overflow-y-auto p-12 custom-scrollbar"><WorkbenchView project={selectedProject} onUpdate={handleUpdate} isEditing={isGlobalEditing} devices={devices} services={services} options={options} users={operators} /></div>}
                   {activeTab === 'GANTT' && <PrecisionGantt project={selectedProject} onUpdate={handleUpdate} />}
                   {activeTab === 'ADOPTION' && <ProjectAdoptionView project={selectedProject} onUpdate={handleUpdate} />}
                   {activeTab === 'STREAM' && <ProjectActivityStream project={selectedProject} allProjects={projects} />}
                </motion.div>
             </AnimatePresence>
          </div>
       </div>
       <ProjectLedger project={selectedProject} width={ledgerWidth} onResize={setLedgerWidth} isCollapsed={isLedgerCollapsed} onToggleCollapse={() => setIsLedgerCollapsed(!isLedgerCollapsed)} isEditing={isGlobalEditing} onUpdate={handleUpdate} />
       <style>{` .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); } `}</style>
    </div>
  )
}
\"\"\"

with open('frontend/src/components/Projects.tsx', 'w') as f:
    f.write(content)
print(\"Projects.tsx fully reconstructed\")
"""

with open('reconstruct_projects.py', 'w') as f:
    f.write(content)
"""

# Now I'll run the reconstruct script.
os.system("python3 reconstruct_projects.py")
