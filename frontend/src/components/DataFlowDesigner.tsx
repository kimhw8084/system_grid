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
  getBezierPath,
  MiniMap,
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow'
import 'reactflow/dist/style.css'
import { 
  Save, Plus, Server, Search, Database, Globe, Layout, Edit3, Network, ChevronLeft, 
  Settings2, Table as TableIcon, Activity, AlertTriangle, CheckCircle2, Clock, 
  ExternalLink, Filter, ArrowRight, Zap, Info, Maximize2, Minimize2, X, Share2, 
  Cpu, Trash2, MousePointer2, Workflow, Target, Layers, ArrowDownUp, FileText,
  AlertOctagon, Compass, Box, Terminal, ListTodo, ChevronRight, ChevronDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'
import { StatusPill } from './shared/StatusPill'
import { StyledSelect } from './shared/StyledSelect'

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
  const isImpacted = data.isImpacted;
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
               <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{data.ip_address || '0.0.0.0'}</p>
            </div>
         </div>
         {isImpacted && <AlertTriangle size={14} className="text-rose-500 animate-pulse" />}
      </div>
      
      <div className="p-4 space-y-4">
         <div className="space-y-2">
            <div className="flex items-center justify-between text-[8px] font-bold uppercase text-slate-500 tracking-widest px-1">
               <span>Hosted Services</span>
               <span>{services.length} Entities</span>
            </div>
            <div className="space-y-1">
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
               {services.length === 0 && (
                  <div className="py-2 text-center border border-dashed border-white/5 rounded-md">
                     <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">No Services Linked</span>
                  </div>
               )}
            </div>
         </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500 border-2 border-slate-900 !left-[-6px]" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500 border-2 border-slate-900 !right-[-6px]" />
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

const LabeledEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data, selected }: any) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const currentType = FLOW_TYPES.find(t => t.id === (data?.type || 'DATA')) || FLOW_TYPES[0];

  return (
    <>
      <BaseEdge 
        path={edgePath} markerEnd={markerEnd} 
        style={{ ...style, stroke: data?.isImpacted ? '#f43f5e' : currentType.color, strokeWidth: selected ? 4 : (data?.isImpacted ? 3 : 2), strokeDasharray: Array.isArray(currentType.dash) ? currentType.dash.join(' ') : 'none', opacity: selected || data?.isImpacted ? 1 : 0.5 }} 
      />
      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }} className="nodrag nopan flex flex-col items-center group">
          <motion.div whileHover={{ scale: 1.05 }} className={`px-3 py-1.5 rounded-md border-2 transition-all duration-200 flex items-center space-x-3 cursor-pointer ${selected ? 'bg-slate-900 border-white shadow-xl z-50 scale-110' : 'bg-slate-950/90 border-white/10 shadow-lg'}`} style={{ borderColor: selected ? '#ffffff' : (data?.isImpacted ? '#f43f5e' : `${currentType.color}80`) }}>
             {data?.step && <span className="text-[8px] font-bold text-white bg-blue-600 w-4 h-4 flex items-center justify-center rounded-full border border-white/20 mr-0.5">{data.step}</span>}
             <div className={`w-1.5 h-1.5 rounded-full ${data?.isImpacted ? 'bg-rose-500 animate-ping' : ''}`} style={{ backgroundColor: data?.isImpacted ? '#f43f5e' : currentType.color }} />
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

const nodeTypes = { device: DeviceNode, external: ExternalNode, service: ServiceNode };
const edgeTypes = { labeled: LabeledEdge };

// --- Dashboard Component ---

const ArchDashboard = ({ flows, onEdit, onAdd }: any) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const filteredFlows = useMemo(() => {
    if (!flows) return []
    return flows.filter((f: any) => {
      const nameMatch = f.name.toLowerCase().includes(searchTerm.toLowerCase())
      const assetMatch = f.nodes_json?.some((n: any) => 
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
                                  {(f.nodes_json || []).slice(0, 5).map((n: any, idx: number) => (
                                     <div key={idx} className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-950 flex items-center justify-center text-blue-400 shadow-xl" title={n.data?.name}>{n.type === 'device' ? <Server size={12}/> : <Globe size={12}/>}</div>
                                  ))}
                                  {(f.nodes_json || []).length > 5 && (
                                      <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-[8px] font-bold text-slate-400">+{(f.nodes_json || []).length - 5}</div>
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

const MissionControl = ({ selectedNode, selectedEdge, impactedNodes, onBack, onUpdateEdge, onAddServiceToNode, availableServices }: any) => {
   const [edgeForm, setEdgeForm] = useState<any>(selectedEdge?.data || {});

   useEffect(() => {
      if (selectedEdge) setEdgeForm(selectedEdge.data || {});
   }, [selectedEdge]);

   const handleEdgeChange = (field: string, value: any) => {
      const updated = { ...edgeForm, [field]: value };
      setEdgeForm(updated);
      onUpdateEdge(selectedEdge.id, updated);
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
                  <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Server size={100}/></div>
                  <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Primary Node Details</p>
                  <h3 className="text-2xl font-bold text-white uppercase tracking-tighter leading-none relative z-10">{selectedNode.data.name}</h3>
                  <div className="flex items-center space-x-3 relative z-10">
                     <StatusPill value={selectedNode.data.status} />
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedNode.data.ip_address}</span>
                  </div>
               </div>

               {selectedNode.type === 'device' && (
                  <div className="space-y-4">
                     <div className="flex items-center justify-between px-1">
                        <h4 className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest flex items-center gap-2"><Database size={14}/> Node Service Registry</h4>
                        <span className="text-[8px] font-bold text-slate-600 uppercase">Available: {availableServices?.length || 0}</span>
                     </div>
                     
                     <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {availableServices?.filter((s: any) => !selectedNode.data.logical_services?.find((ls: any) => ls.id === s.id)).map((s: any) => (
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
                        {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>Step {s}</option>)}
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
  const { fitView } = useReactFlow();
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeFlow, setActiveFlow] = useState<any>({ name: 'NEW_MANIFEST', category: 'System', status: 'Up to date' });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Data Ingestion
  const { data: savedFlows } = useQuery({ queryKey: ['data-flows'], queryFn: async () => (await (await apiFetch('/api/v1/data-flows/')).json()) });
  const { data: assets } = useQuery({ queryKey: ['devices'], queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) });
  const { data: logicalServices } = useQuery({ queryKey: ['logical-services'], queryFn: async () => (await (await apiFetch('/api/v1/logical-services/')).json()) });
  const { data: externalEntities } = useQuery({ queryKey: ['external-intelligence'], queryFn: async () => (await (await apiFetch('/api/v1/intelligence/external')).json()) });

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
      data: { ...n.data, isImpacted: impactAnalysis.nodeIds.has(n.id) }
    }));
  }, [nodes, impactAnalysis]);

  const displayEdges = useMemo(() => {
    return edges.map(e => ({
      ...e,
      data: { ...e.data, isImpacted: impactAnalysis.edgeIds.has(e.id) }
    }));
  }, [edges, impactAnalysis]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ 
      ...params, 
      id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'labeled', 
      data: { type: 'DATA', label: 'NEW_FLOW', protocol: 'HTTPS', step: 1 }, 
      animated: true, 
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } 
    }, eds));
    toast.success("Connection Established");
  }, [setEdges]);

  const addNodeFromInventory = (type: 'device' | 'service' | 'external', item: any) => {
     const newNode: Node = {
        id: `${type}-${item.id}-${Date.now()}`,
        type,
        position: { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 },
        data: { ...item, name: item.name || item.hostname, logical_services: item.logical_services || [] }
     };
     setNodes(nds => [...nds, newNode]);
     toast.success(`Node Added: ${item.name || item.hostname}`);
  };

  const updateEdgeData = (edgeId: string, data: any) => {
     setEdges(eds => eds.map(e => e.id === edgeId ? { ...e, data } : e));
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
      toast.success(`Service Bound: ${service.name}`);
  };

  const handleEdit = (flow: any) => {
    setActiveFlow(flow);
    setNodes(flow.nodes_json || []);
    setEdges(flow.edges_json || []);
    setView('editor');
    setTimeout(() => fitView(), 200);
  };

  if (view === 'dashboard') return <ArchDashboard flows={savedFlows} onEdit={handleEdit} onAdd={() => setView('editor')} />

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
                   <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500"><X size={18}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
                   {/* Assets */}
                   <section className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                         <h3 className="text-[9px] font-bold uppercase text-blue-400 tracking-widest">Infratructure Assets</h3>
                         <Server size={12} className="text-blue-500/50" />
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                         {assets?.slice(0, 15).map((a: any) => (
                            <button key={a.id} onClick={() => addNodeFromInventory('device', a)} className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-blue-600/10 border border-white/5 hover:border-blue-500/40 rounded-lg transition-all group">
                               <div className="flex flex-col text-left">
                                  <span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase truncate">{a.hostname || a.name}</span>
                                  <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">{a.ip_address}</span>
                               </div>
                               <Plus size={14} className="text-slate-600 group-hover:text-blue-500" />
                            </button>
                         ))}
                      </div>
                   </section>

                   {/* External */}
                   <section className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                         <h3 className="text-[9px] font-bold uppercase text-indigo-400 tracking-widest">External Boundaries</h3>
                         <Globe size={12} className="text-indigo-500/50" />
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                         {externalEntities?.slice(0, 5).map((e: any) => (
                            <button key={e.id} onClick={() => addNodeFromInventory('external', e)} className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-indigo-600/10 border border-white/5 hover:border-indigo-500/40 rounded-lg transition-all group">
                               <span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase truncate text-left">{e.name}</span>
                               <Plus size={14} className="text-slate-600 group-hover:text-indigo-500" />
                            </button>
                         ))}
                      </div>
                   </section>
                </div>

                <div className="p-6 border-t border-white/5 bg-black/20">
                   <button onClick={() => toast.success('Manifest saved successfully')} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center space-x-3 shadow-xl transition-all font-bold uppercase text-xs tracking-widest">
                      <Save size={18} />
                      <span>Commit Changes</span>
                   </button>
                </div>
             </motion.div>
          )}
       </AnimatePresence>

       <div className="flex-1 relative h-full">
          {!isSidebarOpen && (
             <button onClick={() => setIsSidebarOpen(true)} className="absolute left-6 top-6 z-50 p-3 bg-blue-600 text-white rounded-lg shadow-xl hover:bg-blue-500 transition-all active:scale-95">
                <Box size={20} />
             </button>
          )}

          <ReactFlow
            nodes={displayNodes} edges={displayEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(null); }}
            onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(null); }}
            onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView snapToGrid snapGrid={[10, 10]}
          >
            <Background color="#1e293b" gap={20} size={1} className="opacity-40" />
            
            <Panel position="top-left" className="flex flex-col space-y-4">
               <div className="glass-panel p-3 rounded-lg border border-white/10 flex items-center space-x-4 bg-slate-900/60 backdrop-blur-2xl shadow-2xl">
                  <button onClick={() => { setView('dashboard'); setSelectedNodeId(null); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-all"><ChevronLeft size={20}/></button>
                  <div className="flex flex-col min-w-[200px]">
                     <span className="text-sm font-bold uppercase text-white tracking-widest truncate max-w-[240px]">{activeFlow.name}</span>
                     <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Architecture Matrix Mode</span>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="flex items-center space-x-3 px-3">
                      <div className={`w-2 h-2 rounded-full bg-emerald-500 shadow-glow-emerald`} />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Live Evolution</span>
                  </div>
               </div>
            </Panel>

            <Panel position="bottom-center" className="mb-6">
                <div className="glass-panel p-2 rounded-xl border border-white/5 flex items-center space-x-2 bg-slate-900/80 backdrop-blur-3xl shadow-3xl">
                    <Controls showInteractive={false} className="!relative !flex !m-0 !bg-transparent !border-none !shadow-none" />
                    <div className="w-px h-6 bg-white/10 mx-2" />
                    <button onClick={() => fitView({ duration: 800 })} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Reset View">
                        <Maximize2 size={18} />
                    </button>
                    <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Toggle Layout">
                        <Layout size={18} />
                    </button>
                </div>
            </Panel>

            <Panel position="top-right">
               <div className="glass-panel p-4 rounded-lg border border-white/5 flex items-center space-x-8 bg-slate-900/60 backdrop-blur-3xl shadow-xl">
                  <div className="flex items-center space-x-3">
                     <div className={`w-2 h-2 rounded-full bg-rose-500 ${selectedNodeId ? 'animate-ping' : ''}`} />
                     <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Impact Engine</span>
                  </div>
                  <div className="flex items-center space-x-3">
                     <Terminal size={14} className="text-blue-500" />
                     <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Hot Reload</span>
                  </div>
               </div>
            </Panel>
          </ReactFlow>
       </div>

       <MissionControl 
          selectedNode={nodes.find(n => n.id === selectedNodeId)} 
          selectedEdge={edges.find(e => e.id === selectedEdgeId)}
          impactedNodes={impactedNodes}
          onBack={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
          onUpdateEdge={updateEdgeData}
          onAddServiceToNode={addServiceToNode}
          availableServices={logicalServices}
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
