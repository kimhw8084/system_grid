import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  Panel,
  useNodesState, 
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  Connection,
  ReactFlowProvider,
  useReactFlow,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  MiniMap,
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  reconnectEdge,
  ConnectionMode
} from 'reactflow'
import 'reactflow/dist/style.css'
import { 
  Save, Plus, Server, Search, Database, Globe, Layout, Edit3, Network, ChevronLeft, 
  Settings2, Table as TableIcon, Activity, AlertTriangle, CheckCircle2, Clock, 
  ExternalLink, Filter, ArrowRight, Zap, Info, Maximize2, Minimize2, X, Share2, 
  Cpu, Trash2, MousePointer2, Workflow, Target, Layers, ArrowDownUp, FileText,
  AlertOctagon, Compass, Box, Terminal, ListTodo, ChevronRight, ChevronDown,
  Diamond, StickyNote, GitMerge, MoreHorizontal, Settings, RefreshCw, HelpCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'
import { StatusPill } from './shared/StatusPill'
import { StyledSelect } from './shared/StyledSelect'
import { ConfirmationModal } from './shared/ConfirmationModal'

// --- Constants & Styles ---

const PROTOCOLS = ['HTTPS', 'HTTP', 'SSH', 'FTP', 'SFTP', 'Samba', 'NFS', 'gRPC', 'AMQP', 'MQTT', 'SQL', 'NoSQL', 'Custom']

const FLOW_TYPES = [
  { id: 'DATA', label: 'Data Flow', color: '#3b82f6', dash: false },
  { id: 'AUTH', label: 'Auth / Security', color: '#8b5cf6', dash: false },
  { id: 'SYNC', label: 'Replication', color: '#10b981', dash: [5, 5] },
  { id: 'MGMT', label: 'Control Plane', color: '#f59e0b', dash: [2, 2] },
  { id: 'CRITICAL', label: 'Heartbeat', color: '#ef4444', dash: false, weight: 4 },
]

const ARCH_STATUSES = ['Up to date', 'Deprecated', 'Planned', 'In Review']
const ARCH_CATEGORIES = ['System', 'Service', 'Application', 'Network', 'Security']

// --- Custom Nodes ---

const DeviceNode = ({ data, selected }: any) => {
  const isImpacted = data.isImpacted && data.dependencyRiskEnabled;
  const services = data.logical_services || [];
  
  return (
    <div className={`glass-panel min-w-[300px] rounded-lg border-2 transition-all duration-300 overflow-hidden relative shadow-2xl ${selected ? 'border-blue-500 bg-blue-500/10 ring-4 ring-blue-500/10' : isImpacted ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_30px_rgba(244,63,94,0.3)]' : 'border-white/10 bg-slate-900/60'}`}>
      <div className={`px-4 py-3 border-b border-white/5 flex items-center justify-between ${isImpacted ? 'bg-rose-500/20' : 'bg-white/5'}`}>
         <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isImpacted ? 'bg-rose-500 text-white' : 'bg-blue-600/20 text-blue-400'} border border-current/20 shadow-inner`}>
               {data.type === 'Switch' ? <Network size={16}/> : <Server size={16}/>}
            </div>
            <div className="min-w-0">
               <p className="text-[12px] font-bold uppercase text-white tracking-tight leading-none truncate max-w-[180px]">{data.name}</p>
               <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{data.ip_address && data.ip_address !== '0.0.0.0' ? data.ip_address : ''}</p>
            </div>
         </div>
         {isImpacted && <AlertTriangle size={14} className="text-rose-500 animate-pulse" />}
      </div>
      
      <div className="p-4 space-y-4">
         <div className="space-y-2">
            <div className="flex items-center justify-between text-[8px] font-bold uppercase text-slate-500 tracking-widest px-1">
               <span>Entity Interfaces</span>
               <span>{services.length + 1} Points</span>
            </div>
            
            <div className="space-y-1">
               {/* Unidentified Connection Card */}
               <div className="relative flex items-center justify-between px-3 py-2 rounded-md bg-white/5 border border-dashed border-white/20 group hover:border-blue-500/40 transition-all">
                  <Handle 
                    type="target" position={Position.Left} id="unidentified-target" 
                    className="!left-[-15px] w-2 h-2 !bg-blue-400 border-none !opacity-0 group-hover:!opacity-100 transition-opacity" 
                  />
                  <div className="flex items-center space-x-2 truncate">
                     <HelpCircle size={10} className="text-slate-400" />
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">Unidentified Entry/Exit</span>
                  </div>
                  <Handle 
                    type="source" position={Position.Right} id="unidentified-source" 
                    className="!right-[-15px] w-2 h-2 !bg-blue-400 border-none !opacity-0 group-hover:!opacity-100 transition-opacity" 
                  />
               </div>

               {services.map((s: any) => (
                  <div key={s.id} className="relative flex items-center justify-between px-3 py-2 rounded-md bg-emerald-500/5 border border-emerald-500/10 group hover:border-emerald-500/40 transition-all">
                     <Handle 
                       type="target" position={Position.Left} id={`svc-target-${s.id}`} 
                       className="!left-[-15px] w-2 h-2 !bg-emerald-500 border-none !opacity-0 group-hover:!opacity-100 transition-opacity" 
                     />
                     <div className="flex items-center space-x-2 truncate">
                        <Database size={10} className="text-emerald-400" />
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter truncate">{s.name}</span>
                     </div>
                     <Handle 
                       type="source" position={Position.Right} id={`svc-source-${s.id}`} 
                       className="!right-[-15px] w-2 h-2 !bg-emerald-500 border-none !opacity-0 group-hover:!opacity-100 transition-opacity" 
                     />
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  )
}

const ServiceNode = ({ data, selected }: any) => (
  <div className={`glass-panel px-4 py-3 rounded-lg border-2 transition-all duration-300 flex items-center space-x-3 w-full shadow-xl ${selected ? 'border-emerald-500 bg-emerald-500/10 scale-105' : 'border-white/10 bg-slate-900/60'}`}>
     <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/20">
        <Database size={16}/>
     </div>
     <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase text-emerald-400 truncate tracking-tight leading-none">{data.name}</p>
        <p className="text-[8px] font-bold text-slate-500 uppercase truncate mt-1 tracking-widest">{data.service_type || 'Microservice'}</p>
     </div>
     <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 !left-[-5px]" />
     <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 !right-[-5px]" />
  </div>
)

const ExternalNode = ({ data, selected }: any) => (
  <div className={`glass-panel min-w-[260px] rounded-lg border-2 transition-all duration-300 p-6 border-dashed shadow-2xl ${selected ? 'border-indigo-500 bg-indigo-500/10 ring-4 ring-indigo-500/10' : 'border-white/20 bg-slate-900/40'}`}>
     <div className="flex items-center space-x-4">
        <div className="p-3 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/20">
           <Globe size={20}/>
        </div>
        <div className="min-w-0">
           <p className="text-[12px] font-bold uppercase text-indigo-400 tracking-tight truncate leading-none">{data.name}</p>
           <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-widest truncate">{data.owner_organization || 'External Boundary'}</p>
        </div>
     </div>
     <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500 border-2 border-slate-900 !left-[-6px]" />
     <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-slate-900 !right-[-6px]" />
  </div>
)

const ConditionNode = ({ data, selected }: any) => (
  <div className={`relative flex items-center justify-center transition-all duration-300 ${selected ? 'scale-110' : ''}`}>
    <div className={`w-24 h-24 rotate-45 border-2 flex items-center justify-center transition-all ${selected ? 'border-amber-500 bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'border-amber-500/40 bg-slate-900/60'}`}>
      <div className="-rotate-45 flex flex-col items-center">
        <Diamond size={20} className="text-amber-500 mb-1" />
        <span className="text-[9px] font-black uppercase text-white tracking-widest text-center px-2">{data.label || 'DECISION'}</span>
      </div>
    </div>
    <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-amber-500 border-2 border-slate-900 !left-[-1px]" />
    <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-amber-500 border-2 border-slate-900 !right-[-1px]" />
    <Handle type="source" position={Position.Bottom} id="b" className="w-2.5 h-2.5 bg-amber-500 border-2 border-slate-900 !bottom-[-1px]" />
    <Handle type="source" position={Position.Top} id="t" className="w-2.5 h-2.5 bg-amber-500 border-2 border-slate-900 !top-[-1px]" />
  </div>
)

const NoteNode = ({ data, selected }: any) => (
  <div className={`glass-panel p-4 min-w-[200px] rounded-lg border-2 transition-all duration-300 shadow-xl relative ${selected ? 'border-blue-400 bg-blue-400/10' : 'border-white/10 bg-slate-900/60'}`}>
    <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/20 rounded-bl-xl border-l border-b border-white/10" />
    <div className="flex flex-col space-y-2">
      <div className="flex items-center gap-2 text-blue-400">
        <StickyNote size={14} />
        <span className="text-[8px] font-black uppercase tracking-[0.2em]">Documentation</span>
      </div>
      <p className="text-[10px] text-slate-300 font-bold leading-relaxed">{data.label || 'Write a note...'}</p>
    </div>
  </div>
)

const LabeledEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data, selected, source, target }: any) => {
  const { getEdges } = useReactFlow();
  
  // Prevent overlap for multiple edges between same nodes
  const allEdges = getEdges();
  const sameSourceTargetEdges = allEdges.filter(e => e.source === source && e.target === target);
  const edgeIndex = sameSourceTargetEdges.findIndex(e => e.id === id);
  const offset = sameSourceTargetEdges.length > 1 ? (edgeIndex - (sameSourceTargetEdges.length - 1) / 2) * 25 : 0;

  // Adjust source/target points for offset
  const adjSourceX = sourcePosition === Position.Left || sourcePosition === Position.Right ? sourceX : sourceX + offset;
  const adjSourceY = sourcePosition === Position.Top || sourcePosition === Position.Bottom ? sourceY : sourceY + offset;
  const adjTargetX = targetPosition === Position.Left || targetPosition === Position.Right ? targetX : targetX + offset;
  const adjTargetY = targetPosition === Position.Top || targetPosition === Position.Bottom ? targetY : targetY + offset;

  const [edgePath, labelX, labelY] = getSmoothStepPath({ 
    sourceX: adjSourceX, 
    sourceY: adjSourceY, 
    sourcePosition, 
    targetX: adjTargetX, 
    targetY: adjTargetY, 
    targetPosition, 
    borderRadius: 20 
  });
  
  const currentType = FLOW_TYPES.find(t => t.id === (data?.type || 'DATA')) || FLOW_TYPES[0];

  return (
    <>
      <BaseEdge 
        path={edgePath} markerEnd={markerEnd} 
        style={{ ...style, stroke: data?.isImpacted ? '#f43f5e' : (data?.color || currentType.color), strokeWidth: selected ? 4 : (data?.isImpacted ? 3 : 2), strokeDasharray: Array.isArray(currentType.dash) ? currentType.dash.join(' ') : 'none', opacity: selected || data?.isImpacted ? 1 : 0.6 }} 
      />
      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }} className="nodrag nopan flex flex-col items-center group">
          <motion.div whileHover={{ scale: 1.05 }} className={`px-3 py-1.5 rounded-md border-2 transition-all duration-200 flex items-center space-x-3 cursor-pointer ${selected ? 'bg-slate-900 border-white shadow-xl z-50 scale-110' : 'bg-slate-950/90 border-white/10 shadow-lg'}`} style={{ borderColor: selected ? '#ffffff' : (data?.isImpacted ? '#f43f5e' : `${data?.color || currentType.color}80`) }}>
             {data?.step && <span className="text-[8px] font-bold text-white bg-blue-600 w-4 h-4 flex items-center justify-center rounded-full border border-white/20 mr-0.5">{data.step}</span>}
             <div className={`w-1.5 h-1.5 rounded-full ${data?.isImpacted ? 'bg-rose-500 animate-ping' : ''}`} style={{ backgroundColor: data?.isImpacted ? '#f43f5e' : (data?.color || currentType.color) }} />
             <div className="flex flex-col">
                <span className={`text-[9px] font-bold uppercase tracking-widest whitespace-nowrap ${data?.isImpacted ? 'text-rose-400' : 'text-white'}`}>
                    {data?.label || currentType.label}
                </span>
                {data?.protocol && (
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter leading-none mt-0.5">{data.protocol}</span>
                )}
             </div>
             {(data?.source_port || data?.target_port) && (
                <span className="text-[7px] font-bold text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 ml-1">
                    {data.source_port || '*'}:{data.target_port || '*'}
                </span>
             )}
          </motion.div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const nodeTypes = { device: DeviceNode, external: ExternalNode, service: ServiceNode, condition: ConditionNode, note: NoteNode };
const edgeTypes = { labeled: LabeledEdge };

// --- Configuration Modal ---

const ConfigModal = ({ flow, isOpen, onClose, onSave }: any) => {
  const [formData, setFormData] = useState({ 
    name: flow?.name || '', 
    description: flow?.description || '', 
    category: flow?.category || 'System', 
    status: flow?.status || 'Up to date' 
  });

  useEffect(() => {
    if (flow) {
      setFormData({ 
        name: flow.name || '', 
        description: flow.description || '', 
        category: flow.category || 'System', 
        status: flow.status || 'Up to date' 
      });
    }
  }, [flow]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-xl p-10 rounded-2xl border border-white/10 shadow-3xl bg-[#0a0c14]/90">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30"><Settings size={24} /></div>
            <div>
              <h2 className="text-2xl font-black uppercase text-white tracking-tighter">Manifest Settings</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Configure Architecture Governance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        <div className="mt-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Workflow Identity</label>
            <input 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter manifest name..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-sm font-bold text-white uppercase outline-none focus:border-blue-500/50 shadow-inner"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Strategic Purpose</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the architectural intent..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-sm font-bold text-slate-300 uppercase outline-none focus:border-blue-500/50 shadow-inner h-32 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Domain Category</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm font-bold text-white uppercase outline-none focus:border-blue-500/50 appearance-none"
              >
                {ARCH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Validation Status</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm font-bold text-white uppercase outline-none focus:border-blue-500/50 appearance-none"
              >
                {ARCH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-10 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">Cancel</button>
          <button onClick={() => { onSave(formData); onClose(); }} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Apply Configuration</button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Dashboard Component ---

const ArchDashboard = ({ flows, onEdit, onAdd }: any) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const filteredFlows = useMemo(() => {
    if (!flows) return []
    return flows.filter((f: any) => {
      const nameMatch = f.name.toLowerCase().includes(searchTerm.toLowerCase())
      const assetMatch = f.nodes?.some((n: any) => 
        n.data?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.data?.logical_services?.some((s: any) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      const matchesStatus = statusFilter === 'All' || f.status === statusFilter
      return (nameMatch || assetMatch) && matchesStatus
    })
  }, [flows, searchTerm, statusFilter])

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-black/20">
       <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-end justify-between">
             <div className="space-y-1">
                <div className="flex items-center space-x-3">
                   <div className="p-2 bg-blue-600 rounded-lg shadow-xl text-white"><Workflow size={24} /></div>
                   <h1 className="text-3xl font-bold text-white uppercase tracking-tighter">Architecture Matrix</h1>
                </div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] pl-1">Intelligent Blast Radius & Change Point Governance</p>
             </div>
             <button onClick={onAdd} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center space-x-3 transition-all shadow-xl border-t border-white/10 active:scale-95">
                <Plus size={20} />
                <span className="text-sm font-bold uppercase tracking-widest">New Manifest</span>
             </button>
          </div>

          <div className="glass-panel rounded-lg border border-white/5 overflow-hidden shadow-2xl bg-[#0a0c14]/40 backdrop-blur-3xl">
             <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative flex-1 max-w-xl">
                   <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" />
                   <input 
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     placeholder="Search Name, Hostname or Service..."
                     className="w-full bg-black/40 border border-white/10 rounded-lg pl-14 pr-6 py-4 text-xs font-bold text-white uppercase outline-none focus:border-blue-500/50 shadow-inner"
                   />
                </div>
                <div className="flex bg-black/60 p-1 rounded-lg border border-white/5">
                    {['All', ...ARCH_STATUSES].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)} className={`px-6 py-2.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{s}</button>
                    ))}
                </div>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                         <th className="px-8 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Operational Identity</th>
                         <th className="px-8 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">Entities</th>
                         <th className="px-8 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                         <th className="px-8 py-4 text-right"></th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {filteredFlows.map((f: any) => (
                         <tr key={f.id} className="group hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => onEdit(f)}>
                            <td className="px-8 py-6">
                               <div className="flex items-center space-x-5">
                                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform"><Layout size={18} /></div>
                                  <div className="flex flex-col">
                                     <span className="text-base font-bold text-white tracking-tight uppercase mb-0.5">{f.name}</span>
                                     <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[400px]">{f.description || 'No context'}</span>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-center justify-center -space-x-2">
                                  {(f.nodes || []).slice(0, 5).map((n: any, idx: number) => (
                                     <div key={idx} className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-950 flex items-center justify-center text-blue-400 shadow-xl" title={n.data?.name}>{n.type === 'device' ? <Server size={12}/> : n.type === 'condition' ? <Diamond size={12}/> : <Globe size={12}/>}</div>
                                  ))}
                                  {(f.nodes || []).length > 5 && (
                                      <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-[8px] font-bold text-slate-400">+{(f.nodes || []).length - 5}</div>
                                  )}
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex justify-center">
                                  <StatusPill value={f.status} />
                               </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                               <button className="p-3 bg-blue-600/10 text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all"><ArrowRight size={18} /></button>
                            </td>
                         </tr>
                      ))}
                      {filteredFlows.length === 0 && (
                          <tr>
                              <td colSpan={4} className="px-8 py-20 text-center opacity-30 text-[10px] font-bold uppercase tracking-[0.5em]">No architectures matching criteria</td>
                          </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
       </div>
    </div>
  )
}

// --- Mission Control Pane ---

const MissionControl = ({ selectedNode, selectedEdge, impactedNodes, onBack, onUpdateNode, onUpdateEdge, onAddServiceToNode, availableServices, onDeleteNode, onDeleteEdge }: any) => {
   const [edgeForm, setEdgeForm] = useState<any>(selectedEdge?.data || {});
   const [nodeForm, setNodeForm] = useState<any>(selectedNode?.data || {});

   useEffect(() => {
      if (selectedEdge) setEdgeForm(selectedEdge.data || {});
   }, [selectedEdge]);

   useEffect(() => {
      if (selectedNode) setNodeForm(selectedNode.data || {});
   }, [selectedNode]);

   const handleEdgeChange = (field: string, value: any) => {
      const updated = { ...edgeForm, [field]: value };
      setEdgeForm(updated);
      onUpdateEdge(selectedEdge.id, updated);
   };

   const handleNodeChange = (field: string, value: any) => {
      const updated = { ...nodeForm, [field]: value };
      setNodeForm(updated);
      onUpdateNode(selectedNode.id, updated);
   };

   return (
      <div className="w-[420px] glass-panel h-full border-l border-white/5 flex flex-col p-8 space-y-10 bg-[#0a0c14]/90 backdrop-blur-3xl z-50 overflow-y-auto custom-scrollbar shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
         <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-xl font-bold uppercase text-white tracking-tight flex items-center gap-3"><Zap size={22} className="text-blue-500"/> Configuration</h2>
            <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
         </div>

         {selectedNode ? (
            <div className="space-y-8">
               <div className="p-6 bg-blue-600/5 rounded-lg border border-blue-500/20 space-y-4 relative overflow-hidden group">
                  <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    {selectedNode.type === 'device' ? <Server size={100}/> : selectedNode.type === 'condition' ? <Diamond size={100}/> : <Globe size={100}/>}
                  </div>
                  <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Primary Node Details</p>
                  
                  {['condition', 'note'].includes(selectedNode.type) ? (
                    <div className="space-y-2 relative z-10">
                      <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Label / Text</label>
                      <input 
                        value={nodeForm.label || ''}
                        onChange={e => handleNodeChange('label', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500"
                        placeholder="Enter label..."
                      />
                    </div>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold text-white uppercase tracking-tighter leading-none relative z-10">{selectedNode.data.name}</h3>
                      <div className="flex items-center space-x-3 relative z-10">
                         <StatusPill value={selectedNode.data.status} />
                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedNode.data.ip_address}</span>
                      </div>
                    </>
                  )}
               </div>

               {selectedNode.type === 'device' && (
                  <div className="space-y-4">
                     <div className="flex items-center justify-between px-1">
                        <h4 className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest flex items-center gap-2"><Database size={14}/> Node Service Registry</h4>
                        <span className="text-[8px] font-bold text-slate-600 uppercase">Available: {selectedNode.data.all_available_services?.length || 0}</span>
                     </div>
                     
                     <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {selectedNode.data.all_available_services?.filter((s: any) => !selectedNode.data.logical_services?.find((ls: any) => ls.id === s.id)).map((s: any) => (
                           <button 
                             key={s.id} 
                             onClick={() => onAddServiceToNode(selectedNode.id, s)}
                             className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
                           >
                              <div className="flex flex-col text-left">
                                 <span className="text-[10px] font-bold text-slate-300 uppercase truncate">{s.name}</span>
                                 <span className="text-[7px] font-bold text-slate-600 uppercase">{s.service_type}</span>
                              </div>
                              <Plus size={14} className="text-slate-600 group-hover:text-emerald-500" />
                           </button>
                        ))}
                        {(selectedNode.data.all_available_services?.length === 0 || !selectedNode.data.all_available_services) && (
                           <p className="text-center py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest border border-dashed border-white/5 rounded-lg">No Services Defined in Core</p>
                        )}
                     </div>
                  </div>
               )}

               <div className="space-y-4 pt-4 border-t border-white/5">
                  <h4 className="text-[10px] font-bold uppercase text-rose-400 tracking-widest flex items-center gap-2"><AlertOctagon size={14}/> Impact Dependencies ({impactedNodes.length})</h4>
                  <div className="space-y-2">
                     {impactedNodes.map((n: any) => (
                        <div key={n.id} className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-lg group hover:bg-rose-500/10 transition-all cursor-pointer">
                           <div className="flex items-center space-x-3">
                              <div className="p-2 bg-rose-500/20 rounded-md text-rose-400 group-hover:scale-110 transition-transform"><Server size={14}/></div>
                              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tighter truncate max-w-[200px]">{n.data.name}</span>
                           </div>
                           <ArrowRight size={16} className="text-rose-500/40 group-hover:translate-x-1 transition-transform" />
                        </div>
                     ))}
                     {impactedNodes.length === 0 && (
                        <p className="text-center py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest border border-dashed border-white/5 rounded-lg">No Downstream Impact</p>
                     )}
                  </div>
               </div>

               <div className="pt-6">
                 <button onClick={() => onDeleteNode(selectedNode.id)} className="w-full py-3 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3">
                   <Trash2 size={16}/> Remove Entity
                 </button>
               </div>
            </div>
         ) : selectedEdge ? (
            <div className="space-y-8">
               <div className="p-6 bg-blue-600/5 rounded-lg border border-blue-600/20 space-y-4">
                  <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Flow Specification</p>
                  <div className="space-y-2">
                     <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Flow Label</label>
                     <input 
                       value={edgeForm.label || ''} 
                       onChange={e => handleEdgeChange('label', e.target.value)}
                       className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500"
                       placeholder="e.g., SYNC_REPLICATION"
                     />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Protocol</label>
                     <select 
                       value={edgeForm.protocol || ''} 
                       onChange={e => handleEdgeChange('protocol', e.target.value)}
                       className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500 appearance-none"
                     >
                        <option value="">Select...</option>
                        {PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Flow Step</label>
                     <select 
                       value={edgeForm.step || 1} 
                       onChange={e => handleEdgeChange('step', parseInt(e.target.value))}
                       className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500 appearance-none"
                     >
                        {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(s => <option key={s} value={s}>Step {s}</option>)}
                     </select>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Src Port</label>
                     <input 
                       value={edgeForm.source_port || ''} 
                       onChange={e => handleEdgeChange('source_port', e.target.value)}
                       className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500 text-center"
                       placeholder="*"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Dst Port</label>
                     <input 
                       value={edgeForm.target_port || ''} 
                       onChange={e => handleEdgeChange('target_port', e.target.value)}
                       className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500 text-center"
                       placeholder="*"
                     />
                  </div>
               </div>

               <div className="space-y-2 pt-4 border-t border-white/5">
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Directional Metadata</label>
                  <textarea 
                    value={edgeForm.io_info || ''} 
                    onChange={e => handleEdgeChange('io_info', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-[10px] font-bold text-slate-300 uppercase outline-none focus:border-indigo-500 resize-none h-32"
                    placeholder="Describe Input/Output payloads or constraints..."
                  />
               </div>

               <div className="pt-6">
                 <button onClick={() => onDeleteEdge(selectedEdge.id)} className="w-full py-3 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3">
                   <Trash2 size={16}/> Remove Connection
                 </button>
               </div>
            </div>
         ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-6 pb-20">
               <div className="p-6 rounded-full bg-slate-800/50 border border-slate-700 shadow-inner"><Target size={60} /></div>
               <p className="text-sm font-bold uppercase tracking-[0.3em] leading-relaxed">Select Architecture Element<br/>to Configure Parameters</p>
            </div>
         )}
      </div>
   )
}


// --- Main Designer ---

function ArchDesignerInner() {
  const { fitView, zoomTo, zoomIn, zoomOut } = useReactFlow();
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeFlow, setActiveFlow] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isConfigSidebarOpen, setIsConfigSidebarOpen] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false);
  const [dependencyRiskEnabled, setDependencyRiskEnabled] = useState(false);

  // Inventory filtering state
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryType, setInventoryType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [selectedSystem, setSelectedSystem] = useState<string | 'All'>('All');

  const queryClient = useQueryClient();

  // Data Ingestion
  const { data: savedFlows } = useQuery({ queryKey: ['data-flows'], queryFn: async () => (await (await apiFetch('/api/v1/data-flows/')).json()) });
  const { data: assets } = useQuery({ queryKey: ['devices'], queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) });
  const { data: logicalServices } = useQuery({ queryKey: ['logical-services'], queryFn: async () => (await (await apiFetch('/api/v1/logical-services/')).json()) });
  const { data: externalEntities } = useQuery({ queryKey: ['external-entities'], queryFn: async () => (await (await apiFetch('/api/v1/intelligence/entities')).json()) });
  const systems = useMemo(() => {
    if (!assets) return [];
    const s = new Set<string>();
    assets.forEach((a: any) => { if (a.system) s.add(a.system); });
    return Array.from(s).sort();
  }, [assets]);

  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    return assets.filter((a: any) => {
      const matchSearch = (a.hostname || a.name || '').toLowerCase().includes(inventorySearch.toLowerCase()) || (a.ip_address || '').includes(inventorySearch);
      const matchSystem = selectedSystem === 'All' || a.system === selectedSystem;
      return matchSearch && matchSystem && !a.is_deleted;
    });
  }, [assets, inventorySearch, selectedSystem]);

  const filteredExternal = useMemo(() => {
    if (!externalEntities) return [];
    return externalEntities.filter((e: any) => {
      const matchSearch = e.name.toLowerCase().includes(inventorySearch.toLowerCase()) || (e.owner_organization || '').toLowerCase().includes(inventorySearch.toLowerCase());
      return matchSearch && !e.is_deleted;
    });
  }, [externalEntities, inventorySearch]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const isUpdate = !!data.id;
      const url = isUpdate ? `/api/v1/data-flows/${data.id}` : '/api/v1/data-flows';
      const method = isUpdate ? 'PUT' : 'POST';
      const response = await apiFetch(url, {
        method,
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: (savedFlow) => {
      setActiveFlow(savedFlow);
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['data-flows'] });
      toast.success("Manifest Persistent in Core Registry");
    },
    onError: () => toast.error("Failure Syncing Manifest to Core")
  });

  const handleSave = () => {
    if (!activeFlow) return;
    const data = {
      ...activeFlow,
      nodes,
      edges,
      viewport: {} 
    };
    saveMutation.mutate(data);
  };

  // Unsaved Changes Guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Impact Engine
  const impactAnalysis = useMemo(() => {
    if (!selectedNodeId) return { nodeIds: new Set<string>(), edgeIds: new Set<string>() };
    const impactedNodeIds = new Set<string>([selectedNodeId]);
    const impactedEdgeIds = new Set<string>();
    const queue = [selectedNodeId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      edges.forEach(edge => {
        if (edge.source === currentId && !impactedNodeIds.has(edge.target)) {
          impactedNodeIds.add(edge.target);
          impactedEdgeIds.add(edge.id);
          queue.push(edge.target);
        } else if (edge.source === currentId) {
          impactedEdgeIds.add(edge.id);
        }
      });
    }
    return { nodeIds: impactedNodeIds, edgeIds: impactedEdgeIds };
  }, [selectedNodeId, edges]);

  const impactedNodes = useMemo(() => {
    return nodes.filter(n => impactAnalysis.nodeIds.has(n.id) && n.id !== selectedNodeId);
  }, [nodes, impactAnalysis]);

  const displayNodes = useMemo(() => {
    return nodes.map(n => ({
      ...n,
      data: { ...n.data, isImpacted: impactAnalysis.nodeIds.has(n.id), dependencyRiskEnabled }
    }));
  }, [nodes, impactAnalysis, dependencyRiskEnabled]);

  const displayEdges = useMemo(() => {
    return edges.map(e => ({
      ...e,
      data: { ...e.data, isImpacted: impactAnalysis.edgeIds.has(e.id) }
    }));
  }, [edges, impactAnalysis]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => {
      const step = eds.length + 1;
      return addEdge({ 
        ...params, 
        id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: 'labeled', 
        data: { type: 'DATA', label: 'NEW_FLOW', protocol: 'HTTPS', step }, 
        animated: true, 
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } 
      }, eds);
    });
    setHasUnsavedChanges(true);
    toast.success("Connection Established");
  }, [setEdges]);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    setHasUnsavedChanges(true);
  }, [setEdges]);

  const addNodeFromInventory = (type: 'device' | 'service' | 'external', item: any) => {
     const newNode: Node = {
        id: `${type}-${item.id}-${Date.now()}`,
        type,
        position: { x: 400 + Math.random() * 200, y: 100 + Math.random() * 200 },
        data: { 
          ...item, 
          name: item.name || item.hostname, 
          logical_services: [],
          all_available_services: item.logical_services || []
        }
     };
     setNodes(nds => [...nds, newNode]);
     setHasUnsavedChanges(true);
     toast.success(`Node Added: ${item.name || item.hostname}`);
  };

  const addToolbarNode = (type: 'condition' | 'note') => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 500, y: 300 },
      data: { label: type === 'condition' ? 'DECISION' : 'Architecture Note' }
    };
    setNodes(nds => [...nds, newNode]);
    setHasUnsavedChanges(true);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Added`);
  };

  const updateEdgeData = (edgeId: string, data: any) => {
     setEdges(eds => eds.map(e => e.id === edgeId ? { ...e, data } : e));
     setHasUnsavedChanges(true);
  };

  const updateNodeData = (nodeId: string, data: any) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data } : n));
    setHasUnsavedChanges(true);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
    setHasUnsavedChanges(true);
    toast.success("Entity De-provisioned");
  };

  const deleteEdge = (edgeId: string) => {
    setEdges(eds => eds.filter(e => e.id !== edgeId));
    setSelectedEdgeId(null);
    setHasUnsavedChanges(true);
    toast.success("Connection Severed");
  };

  const addServiceToNode = (nodeId: string, service: any) => {
      setNodes(nds => nds.map(n => {
          if (n.id === nodeId) {
              const current = n.data.logical_services || [];
              if (current.find((s: any) => s.id === service.id)) return n;
              return { ...n, data: { ...n.data, logical_services: [...current, service] } };
          }
          return n;
      }));
      setHasUnsavedChanges(true);
      toast.success(`Service Bound: ${service.name}`);
  };

  const handleAutoLayout = () => {
    // Simple Horizontal Layout
    const nodeWidth = 350;
    const nodeHeight = 250;
    const gapX = 150;
    const gapY = 100;

    const levels: Record<string, number> = {};
    const queue: string[] = [];
    
    nodes.forEach(n => {
      const incoming = edges.filter(e => e.target === n.id);
      if (incoming.length === 0) {
        levels[n.id] = 0;
        queue.push(n.id);
      }
    });

    if (queue.length === 0 && nodes.length > 0) {
      nodes.forEach(n => { levels[n.id] = 0; queue.push(n.id); });
    }

    let head = 0;
    while (head < queue.length) {
      const currentId = queue[head++];
      edges.filter(e => e.source === currentId).forEach(e => {
        if (levels[e.target] === undefined || levels[e.target] < levels[currentId] + 1) {
          levels[e.target] = levels[currentId] + 1;
          if (!queue.includes(e.target)) queue.push(e.target);
        }
      });
    }

    const levelCounts: Record<number, number> = {};
    const newNodes = nodes.map(n => {
      const level = levels[n.id] || 0;
      const indexInLevel = levelCounts[level] || 0;
      levelCounts[level] = indexInLevel + 1;
      return {
        ...n,
        position: {
          x: 100 + level * (nodeWidth + gapX),
          y: 100 + indexInLevel * (nodeHeight + gapY)
        }
      };
    });

    setNodes(newNodes);
    setHasUnsavedChanges(true);
    setTimeout(() => fitView({ duration: 800 }), 100);
    toast.success("Horizontal Matrix Optimized");
  };

  const handleEdit = (flow: any) => {
    setActiveFlow(flow);
    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);
    setView('editor');
    setHasUnsavedChanges(false);
    setTimeout(() => fitView({ duration: 0 }), 200);
  };

  const handleNewManifest = () => {
    setActiveFlow({ name: 'NEW_MANIFEST', category: 'System', status: 'Planned' });
    setNodes([]);
    setEdges([]);
    setView('editor');
    setHasUnsavedChanges(false);
    setIsConfigModalOpen(true);
  };

  const confirmExit = () => {
    if (hasUnsavedChanges) {
      setIsConfirmExitOpen(true);
    } else {
      setView('dashboard');
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  };

  if (view === 'dashboard') return <ArchDashboard flows={savedFlows} onEdit={handleEdit} onAdd={handleNewManifest} />

  return (
    <div className="flex-1 relative flex h-full overflow-hidden bg-[#020617]">
       {/* Inventory Sidebar */}
       <AnimatePresence>
          {isSidebarOpen && (
             <motion.div 
               initial={{ x: -400 }} animate={{ x: 0 }} exit={{ x: -400 }}
               className="w-[360px] border-r border-white/5 bg-[#0a0c14]/95 backdrop-blur-3xl flex flex-col z-50 shadow-3xl"
             >
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                   <h2 className="text-lg font-bold uppercase text-white tracking-tighter flex items-center gap-3"><Box size={20} className="text-blue-500"/> Inventory</h2>
                   <div className="flex items-center gap-1">
                      <button onClick={() => { setInventorySearch(''); setSelectedSystem('All'); }} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors" title="Clear Filters"><RefreshCw size={16}/></button>
                      <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"><X size={18}/></button>
                   </div>
                </div>

                <div className="p-5 border-b border-white/5 space-y-4">
                   <div className="flex bg-black/60 p-1 rounded-lg border border-white/5">
                      <button onClick={() => setInventoryType('INTERNAL')} className={`flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${inventoryType === 'INTERNAL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Internal</button>
                      <button onClick={() => setInventoryType('EXTERNAL')} className={`flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${inventoryType === 'EXTERNAL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>External</button>
                   </div>
                   
                   <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input 
                        value={inventorySearch}
                        onChange={e => setInventorySearch(e.target.value)}
                        placeholder="Search Inventory..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-[10px] font-bold text-white uppercase outline-none focus:border-blue-500/50 shadow-inner"
                      />
                   </div>

                   {inventoryType === 'INTERNAL' && (
                     <select 
                       value={selectedSystem}
                       onChange={e => setSelectedSystem(e.target.value)}
                       className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-[10px] font-bold text-white uppercase outline-none focus:border-blue-500 appearance-none"
                     >
                        <option value="All">All Systems</option>
                        {systems.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                   )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                   {inventoryType === 'INTERNAL' ? (
                     <section className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                           <h3 className="text-[9px] font-bold uppercase text-blue-400 tracking-widest">Infratructure Assets</h3>
                           <span className="text-[8px] font-black text-slate-600 uppercase bg-white/5 px-2 py-0.5 rounded-full">{filteredAssets.length}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                           {filteredAssets.slice(0, 50).map((a: any) => (
                              <button key={a.id} onClick={() => addNodeFromInventory('device', a)} className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-blue-600/10 border border-white/5 hover:border-blue-500/40 rounded-lg transition-all group">
                                 <div className="flex flex-col text-left truncate">
                                    <span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase truncate">{a.hostname || a.name}</span>
                                    <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">{a.ip_address} | {a.system}</span>
                                 </div>
                                 <Plus size={14} className="text-slate-600 group-hover:text-blue-500 shrink-0 ml-2" />
                              </button>
                           ))}
                           {filteredAssets.length === 0 && <p className="text-center py-10 text-[9px] font-bold text-slate-600 uppercase italic">No matches found</p>}
                        </div>
                     </section>
                   ) : (
                     <section className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                           <h3 className="text-[9px] font-bold uppercase text-indigo-400 tracking-widest">External Boundaries</h3>
                           <span className="text-[8px] font-black text-slate-600 uppercase bg-white/5 px-2 py-0.5 rounded-full">{filteredExternal.length}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                           {filteredExternal.map((e: any) => (
                              <button key={e.id} onClick={() => addNodeFromInventory('external', e)} className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-indigo-600/10 border border-white/5 hover:border-indigo-500/40 rounded-lg transition-all group">
                                 <div className="flex flex-col text-left truncate">
                                    <span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase truncate">{e.name}</span>
                                    <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">{e.owner_organization}</span>
                                 </div>
                                 <Plus size={14} className="text-slate-600 group-hover:text-indigo-500 shrink-0 ml-2" />
                              </button>
                           ))}
                           {filteredExternal.length === 0 && <p className="text-center py-10 text-[9px] font-bold text-slate-600 uppercase italic">No matches found</p>}
                        </div>
                     </section>
                   )}
                </div>

                <div className="p-6 border-t border-white/5 bg-black/20">
                   <button 
                     onClick={handleSave} 
                     disabled={saveMutation.isPending || !hasUnsavedChanges}
                     className={`w-full py-4 rounded-lg flex items-center justify-center space-x-3 shadow-xl transition-all font-black uppercase text-xs tracking-widest ${hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}
                   >
                      {saveMutation.isPending ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                      <span>{saveMutation.isPending ? 'Syncing...' : 'Commit Changes'}</span>
                   </button>
                </div>
             </motion.div>
          )}
       </AnimatePresence>

       {/* Inventory Toggle Button */}
       {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="absolute left-0 top-1/2 -translate-y-1/2 z-[60] py-8 px-1.5 bg-blue-600 text-white rounded-r-md shadow-2xl hover:bg-blue-500 transition-all border border-l-0 border-white/20 group"
          >
             <Box size={14} className="group-hover:scale-110 transition-transform" />
          </button>
       )}

       <div className="flex-1 relative h-full">
          <ReactFlow
            nodes={displayNodes} edges={displayEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeUpdate={onEdgeUpdate}
            onNodeClick={(_, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(null); setIsConfigSidebarOpen(true); }}
            onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(null); setIsConfigSidebarOpen(true); }}
            onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView snapToGrid snapGrid={[20, 20]}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{ type: 'labeled', markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } }}
          >
            <Background color="#1e293b" gap={20} size={1} className="opacity-40" />
            
            <Panel position="top-left" className="flex flex-col space-y-4">
               <div className="glass-panel p-2 rounded-lg border border-white/10 flex items-center space-x-4 bg-slate-900/60 backdrop-blur-2xl shadow-2xl">
                  <div className="flex flex-col min-w-[200px] px-3">
                     <span className="text-xs font-black uppercase text-white tracking-widest truncate max-w-[240px]">{activeFlow?.name}</span>
                     <span className="text-[7px] font-bold text-blue-500 uppercase tracking-[0.3em] mt-0.5">Architecture Matrix Mode</span>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  
                  <div className="flex items-center space-x-1 p-1">
                    <button onClick={() => setIsConfigModalOpen(true)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-all hover:text-white" title="Configure Manifest"><Settings size={18}/></button>
                    <button onClick={handleAutoLayout} className="p-2.5 bg-white/5 hover:bg-emerald-500/10 rounded-lg text-slate-400 hover:text-emerald-400 transition-all" title="Auto Layout"><GitMerge size={18} className="rotate-90"/></button>
                    <button 
                      onClick={() => setDependencyRiskEnabled(!dependencyRiskEnabled)} 
                      className={`p-2.5 rounded-lg transition-all flex items-center gap-2 ${dependencyRiskEnabled ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                      title="Toggle Dependency Risk Visualization"
                    >
                      <AlertTriangle size={18}/>
                      <span className="text-[8px] font-black uppercase tracking-widest pr-1">{dependencyRiskEnabled ? 'Risk ON' : 'Risk OFF'}</span>
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-2" />
                    <button onClick={confirmExit} className="px-4 py-2.5 bg-white/5 hover:bg-rose-600/10 rounded-lg text-slate-400 hover:text-rose-500 transition-all flex items-center gap-2" title="Exit to Dashboard">
                      <span className="text-[8px] font-black uppercase tracking-widest">Exit</span>
                      <ChevronLeft size={16}/>
                    </button>
                  </div>

                  {hasUnsavedChanges && (
                    <div className="flex items-center space-x-2 px-3 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="text-[8px] font-bold text-amber-500 uppercase tracking-widest">Unsaved</span>
                    </div>
                  )}
               </div>
            </Panel>

            <Panel position="bottom-center" className="mb-6 flex flex-col items-center gap-4">
                <div className="glass-panel p-2 rounded-xl border border-white/10 flex items-center space-x-2 bg-slate-900/80 backdrop-blur-3xl shadow-3xl">
                    <button onClick={() => addToolbarNode('condition')} className="p-3 text-amber-400 hover:bg-amber-400/10 rounded-lg transition-all flex flex-col items-center gap-1 group" title="Add Decision Diamond">
                      <Diamond size={20} />
                      <span className="text-[7px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">Diamond</span>
                    </button>
                    <button onClick={() => addToolbarNode('note')} className="p-3 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all flex flex-col items-center gap-1 group" title="Add Annotation">
                      <StickyNote size={20} />
                      <span className="text-[7px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">Note</span>
                    </button>
                    
                    <div className="w-px h-8 bg-white/10 mx-2" />
                    
                    <button onClick={() => zoomIn({ duration: 400 })} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Zoom In">
                        <Plus size={18} />
                    </button>
                    <button onClick={() => zoomOut({ duration: 400 })} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Zoom Out">
                        <Minimize2 size={18} />
                    </button>
                    <button onClick={() => zoomTo(1, { duration: 800 })} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="100% Zoom">
                        <Maximize2 size={18} />
                    </button>
                </div>
            </Panel>
          </ReactFlow>
       </div>

       {/* Configuration Sidebar Trigger */}
       {!isConfigSidebarOpen && (
          <button 
            onClick={() => setIsConfigSidebarOpen(true)} 
            className="absolute right-0 top-1/2 -translate-y-1/2 z-[60] py-8 px-1.5 bg-indigo-600 text-white rounded-l-md shadow-2xl hover:bg-indigo-500 transition-all border border-r-0 border-white/20 group"
          >
             <Zap size={14} className="group-hover:scale-110 transition-transform" />
          </button>
       )}

       <AnimatePresence>
          {isConfigSidebarOpen && (
            <motion.div 
               initial={{ x: 500 }} animate={{ x: 0 }} exit={{ x: 500 }}
               className="h-full z-50 shadow-3xl"
            >
               <MissionControl 
                  selectedNode={nodes.find(n => n.id === selectedNodeId)} 
                  selectedEdge={edges.find(e => e.id === selectedEdgeId)}
                  impactedNodes={impactedNodes}
                  onBack={() => setIsConfigSidebarOpen(false)}
                  onUpdateNode={updateNodeData}
                  onUpdateEdge={updateEdgeData}
                  onAddServiceToNode={addServiceToNode}
                  onDeleteNode={deleteNode}
                  onDeleteEdge={deleteEdge}
                  availableServices={logicalServices}
               />
            </motion.div>
          )}
       </AnimatePresence>

       <ConfigModal 
         isOpen={isConfigModalOpen} 
         onClose={() => setIsConfigModalOpen(false)} 
         flow={activeFlow} 
         onSave={(data: any) => { setActiveFlow({ ...activeFlow, ...data }); setHasUnsavedChanges(true); }}
       />

       <ConfirmationModal 
         isOpen={isConfirmExitOpen}
         title="Unsaved Architectural Changes"
         message="You have unsaved buffers in the matrix. Exiting now will lose all uncommitted modifications. Proceed?"
         onConfirm={() => { setView('dashboard'); setHasUnsavedChanges(false); setIsConfirmExitOpen(false); }}
         onClose={() => setIsConfirmExitOpen(false)}
       />
    </div>
  )
}


export default function DataFlowDesigner() {
  return (
    <ReactFlowProvider>
       <ArchDesignerInner />
    </ReactFlowProvider>
  )
}
