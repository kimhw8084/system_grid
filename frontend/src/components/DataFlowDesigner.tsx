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
  AlertOctagon, Compass, Box, Terminal, ListTodo
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'
import { StatusPill } from './shared/StatusPill'
import { ConnectionForensicsModal } from './shared/ConnectionForensicsModal'

// --- Constants & Styles ---

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
  
  return (
    <div className={`glass-panel min-w-[380px] rounded-lg border-2 transition-all duration-500 overflow-hidden relative shadow-2xl ${selected ? 'border-blue-500 bg-blue-500/10 ring-8 ring-blue-500/10' : isImpacted ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_40px_rgba(244,63,94,0.4)]' : 'border-white/10 bg-slate-900/40'}`}>
      <div className={`px-8 py-5 border-b border-white/5 flex items-center justify-between ${isImpacted ? 'bg-rose-500/20' : 'bg-white/5'}`}>
         <div className="flex items-center space-x-5">
            <div className={`p-3 rounded-lg ${isImpacted ? 'bg-rose-500 text-white' : 'bg-blue-500/20 text-blue-400'} border border-current/20 shadow-inner`}>
               {data.type === 'Switch' ? <Network size={22}/> : <Server size={22}/>}
            </div>
            <div className="min-w-0">
               <p className="text-[14px] font-black italic uppercase text-white tracking-tighter leading-none truncate max-w-[200px] font-['Inter']">{data.name}</p>
               <p className="text-[9px] font-black italic text-slate-500 uppercase mt-1.5 tracking-[0.3em] font-['Inter']">{data.system || 'Unassigned System'}</p>
            </div>
         </div>
         {isImpacted && <AlertTriangle size={18} className="text-rose-500 animate-pulse" />}
      </div>
      
      <div className="p-8 space-y-6">
         <div className="flex justify-between items-center">
            <span className="text-[10px] font-black italic uppercase text-slate-500 tracking-widest font-['Inter']">Interface Topology</span>
            <span className="text-[11px] font-black italic text-white tracking-tighter bg-white/5 px-3 py-1 rounded-md border border-white/10 font-['Inter']">{data.ip_address || '0.0.0.0'}</span>
         </div>
         
         <div className="space-y-3">
            <div className="flex items-center justify-between text-[9px] font-black italic uppercase text-slate-400 tracking-widest opacity-60 font-['Inter']">
               <span>Hosted Services</span>
               <span>{data.logical_services?.length || 0} Entities</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
               {(data.logical_services || []).map((s: any) => (
                  <div key={s.id} className="flex items-center space-x-2 px-3 py-2 rounded-md bg-emerald-500/5 border border-emerald-500/10 group-hover:border-emerald-500/30 transition-all">
                     <Database size={12} className="text-emerald-400" />
                     <span className="text-[9px] font-black italic text-emerald-400 uppercase tracking-tighter truncate font-['Inter']">{s.name}</span>
                  </div>
               ))}
            </div>
         </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-4 h-4 bg-blue-500 border-4 border-slate-900 !left-[-10px]" />
      <Handle type="source" position={Position.Right} className="w-4 h-4 bg-indigo-500 border-4 border-slate-900 !right-[-10px]" />
    </div>
  )
}

const ServiceNode = ({ data, selected }: any) => (
  <div className={`glass-panel px-6 py-4 rounded-lg border-2 transition-all duration-300 flex items-center space-x-5 w-full shadow-xl ${selected ? 'border-emerald-500 bg-emerald-500/10 scale-105 shadow-emerald-500/20' : 'border-white/10 bg-slate-900/60'}`}>
     <div className="p-3 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/20 shadow-inner">
        <Database size={20}/>
     </div>
     <div className="flex-1 min-w-0">
        <p className="text-[12px] font-black italic uppercase text-emerald-400 truncate tracking-tighter leading-none font-['Inter']">{data.name}</p>
        <p className="text-[9px] font-black italic text-slate-500 uppercase truncate mt-1.5 tracking-widest font-['Inter']">{data.service_type || 'Microservice'}</p>
     </div>
     <Handle type="target" position={Position.Left} className="w-3 h-3 bg-emerald-500 border-2 border-slate-900 !left-[-6px]" />
     <Handle type="source" position={Position.Right} className="w-3 h-3 bg-emerald-500 border-2 border-slate-900 !right-[-6px]" />
  </div>
)

const ExternalNode = ({ data, selected }: any) => (
  <div className={`glass-panel min-w-[340px] rounded-lg border-2 transition-all duration-500 p-8 border-dashed shadow-2xl ${selected ? 'border-indigo-500 bg-indigo-500/10 ring-8 ring-indigo-500/10' : 'border-white/20 bg-slate-900/40'}`}>
     <div className="flex items-center space-x-6">
        <div className="p-4 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/20 shadow-inner">
           <Globe size={28}/>
        </div>
        <div className="min-w-0">
           <p className="text-[14px] font-black italic uppercase text-indigo-400 tracking-[0.2em] truncate leading-none font-['Inter']">{data.name}</p>
           <p className="text-[10px] font-black italic text-slate-500 uppercase mt-2 tracking-tighter truncate font-['Inter']">{data.owner_organization || 'External Boundary'}</p>
        </div>
     </div>
     <Handle type="target" position={Position.Left} className="w-4 h-4 bg-indigo-500 border-4 border-slate-900 !left-[-10px]" />
     <Handle type="source" position={Position.Right} className="w-4 h-4 bg-indigo-500 border-4 border-slate-900 !right-[-10px]" />
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
        style={{ ...style, stroke: data?.isImpacted ? '#f43f5e' : currentType.color, strokeWidth: selected ? 6 : (data?.isImpacted ? 4 : 2), strokeDasharray: Array.isArray(currentType.dash) ? currentType.dash.join(' ') : 'none', opacity: selected || data?.isImpacted ? 1 : 0.6, filter: selected ? `drop-shadow(0 0 15px ${currentType.color})` : 'none' }} 
      />
      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }} className="nodrag nopan flex flex-col items-center group">
          <motion.div whileHover={{ scale: 1.1 }} className={`px-5 py-2 rounded-full border-2 transition-all duration-300 flex items-center space-x-4 cursor-pointer ${selected ? 'bg-slate-900 border-white scale-125 shadow-2xl z-50' : 'bg-slate-950/95 border-white/10 shadow-lg'}`} style={{ borderColor: selected ? '#ffffff' : (data?.isImpacted ? '#f43f5e' : `${currentType.color}A0`) }}>
             {data?.step && <span className="text-[10px] font-black italic text-white bg-blue-600 w-5 h-5 flex items-center justify-center rounded-full border border-white/20 mr-1 shadow-glow-blue">{data.step}</span>}
             <div className={`w-2.5 h-2.5 rounded-full ${data?.isImpacted ? 'bg-rose-500 animate-ping' : ''}`} style={{ backgroundColor: data?.isImpacted ? '#f43f5e' : currentType.color }} />
             <span className={`text-[11px] font-black italic uppercase tracking-[0.25em] whitespace-nowrap font-['Inter'] ${data?.isImpacted ? 'text-rose-400' : 'text-white'}`}>
                {data?.label || currentType.label}
             </span>
             {data?.source_port && <span className="text-[9px] font-black italic text-slate-400 bg-white/5 px-2.5 py-1 rounded border border-white/10 tracking-tighter">{data.source_port}➔{data.target_port}</span>}
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

  // Scenario 1 & 2: Deep Asset Search Implementation
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
    <div className="flex-1 p-12 overflow-y-auto custom-scrollbar bg-black/20">
       <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex items-end justify-between">
             <div className="space-y-2">
                <div className="flex items-center space-x-3">
                   <div className="p-3 bg-blue-600 rounded-lg shadow-xl text-white"><Workflow size={32} /></div>
                   <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic">Architecture Matrix</h1>
                </div>
                <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.5em] mt-2 italic pl-1">Intelligent Blast Radius & Change Point Governance</p>
             </div>
             <button onClick={onAdd} className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center space-x-4 transition-all shadow-2xl border-t border-white/20">
                <Plus size={24} />
                <span className="text-base font-black uppercase tracking-widest">New Manifest</span>
             </button>
          </div>

          <div className="glass-panel rounded-lg border border-white/5 overflow-hidden shadow-2xl bg-[#0a0c14]/40 backdrop-blur-3xl">
             <div className="p-10 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="relative flex-1 max-w-2xl">
                   <Search size={24} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" />
                   <input 
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     placeholder="Search Architectures by Name, Hostname or Service..."
                     className="w-full bg-black/40 border border-white/10 rounded-lg pl-16 pr-8 py-5 text-sm font-black text-white uppercase outline-none focus:border-blue-500/50 shadow-inner font-['Inter']"
                   />
                   <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center space-x-2 text-[9px] font-black text-slate-600 uppercase tracking-widest font-['Inter']">
                      <Compass size={12} />
                      <span>Deep Asset Lookup Active</span>
                   </div>
                </div>
                <div className="flex items-center space-x-6">
                   <div className="flex bg-black/60 p-1.5 rounded-lg border border-white/5">
                      {['All', ...ARCH_STATUSES].map(s => (
                         <button key={s} onClick={() => setStatusFilter(s)} className={`px-8 py-3 rounded-md text-[11px] font-black uppercase tracking-widest transition-all font-['Inter'] ${statusFilter === s ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>{s}</button>
                      ))}
                   </div>
                </div>
             </div>

             <div className="overflow-x-auto p-2">
                <table className="w-full text-left border-separate border-spacing-y-3 px-8">
                   <thead>
                      <tr>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] font-['Inter']">Operational Identity</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] font-['Inter']">Linked Entities</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] font-['Inter']">Blast Sensitivity</th>
                         <th className="px-6 py-4 text-right"></th>
                      </tr>
                   </thead>
                   <tbody>
                      {filteredFlows.map((f: any) => (
                         <tr key={f.id} className="group cursor-pointer" onClick={() => onEdit(f)}>
                            <td className="px-6 py-6 bg-white/[0.02] group-hover:bg-white/[0.05] rounded-l-lg border-y border-l border-white/5 transition-all">
                               <div className="flex items-center space-x-6">
                                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform"><Layout size={24} /></div>
                                  <div className="flex flex-col">
                                     <span className="text-lg font-black text-white tracking-tighter uppercase leading-none mb-1 font-['Inter']">{f.name}</span>
                                     <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[400px] italic font-['Inter']">{f.description || 'No context'}</span>
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-6 bg-white/[0.02] group-hover:bg-white/[0.05] border-y border-white/5">
                               <div className="flex -space-x-3">
                                  {(f.nodes_json || []).slice(0, 5).map((n: any, idx: number) => (
                                     <div key={idx} className="w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-950 flex items-center justify-center text-blue-400 shadow-xl" title={n.data?.name}>{n.type === 'device' ? <Server size={14}/> : <Globe size={14}/>}</div>
                                  ))}
                               </div>
                            </td>
                            <td className="px-6 py-6 bg-white/[0.02] group-hover:bg-white/[0.05] border-y border-white/5">
                               <div className="flex flex-col space-y-1">
                                  <div className="flex justify-between text-[9px] font-black uppercase text-slate-500 font-['Inter']"><span>Integrity</span><span>{f.status === 'Up to date' ? '100%' : '60%'}</span></div>
                                  <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden"><div className={`h-full ${f.status === 'Up to date' ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: f.status === 'Up to date' ? '100%' : '60%' }} /></div>
                               </div>
                            </td>
                            <td className="px-6 py-6 bg-white/[0.02] group-hover:bg-white/[0.05] border-y border-r border-white/5 rounded-r-lg text-right transition-all">
                               <button className="p-4 bg-blue-600 text-white rounded-lg shadow-xl transform group-hover:scale-110 active:scale-95 transition-all"><ArrowRight size={20} /></button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
       </div>
    </div>
  )
}

// --- Mission Control Pane (Scenario 2 & 3) ---

const MissionControl = ({ selectedNode, selectedEdge, impactedNodes, onBack, onStepUpdate }: any) => {
   return (
      <div className="w-[450px] glass-panel h-full border-l border-white/5 flex flex-col p-10 space-y-12 bg-[#0a0c14]/80 backdrop-blur-3xl z-50 overflow-y-auto custom-scrollbar shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
         <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black italic uppercase text-rose-400 tracking-tighter flex items-center gap-4 font-['Inter']"><AlertOctagon size={28}/> Intelligence</h2>
            <button onClick={onBack} className="p-3 hover:bg-white/5 rounded-lg text-slate-500 transition-colors"><X size={24}/></button>
         </div>

         {selectedNode ? (
            <div className="space-y-10">
               <div className="p-8 bg-white/5 rounded-lg border border-white/10 space-y-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity"><Server size={80}/></div>
                  <p className="text-[10px] font-black italic text-slate-500 uppercase tracking-[0.4em] font-['Inter']">Node Identity Matrix</p>
                  <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none relative z-10 font-['Inter']">{selectedNode.data.name}</h3>
                  <div className="flex items-center space-x-4 relative z-10">
                     <StatusPill value={selectedNode.data.status} />
                     <span className="text-[11px] font-black italic text-blue-400 uppercase tracking-widest font-['Inter']">{selectedNode.data.system}</span>
                  </div>
               </div>

               <div className="space-y-6">
                  <h4 className="text-[11px] font-black italic uppercase text-white tracking-[0.3em] flex items-center gap-3 font-['Inter']"><Layers size={16}/> Blast Radius Dependencies ({impactedNodes.length})</h4>
                  <div className="space-y-3">
                     {impactedNodes.map((n: any) => (
                        <div key={n.id} className="flex items-center justify-between p-5 bg-rose-500/5 border border-rose-500/10 rounded-lg group hover:bg-rose-500/10 transition-all cursor-pointer">
                           <div className="flex items-center space-x-4">
                              <div className="p-2.5 bg-rose-500/20 rounded-md text-rose-400 group-hover:scale-110 transition-transform"><Server size={16}/></div>
                              <span className="text-[12px] font-black italic text-slate-300 uppercase tracking-tighter truncate max-w-[220px] font-['Inter']">{n.data.name}</span>
                           </div>
                           <ArrowRight size={18} className="text-rose-500/40 group-hover:translate-x-2 transition-transform" />
                        </div>
                     ))}
                  </div>
               </div>

               <div className="pt-10 border-t border-white/5 space-y-8">
                  <h4 className="text-[11px] font-black italic uppercase text-indigo-400 tracking-[0.3em] flex items-center gap-3 font-['Inter']"><FileText size={16}/> Flow Governance Analysis</h4>
                  <textarea 
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-6 text-[12px] font-black italic text-slate-300 uppercase outline-none focus:border-indigo-500 resize-none h-48 shadow-inner tracking-tight font-['Inter']"
                    placeholder="Document impacts for internal governance..."
                    defaultValue={`IMPACT ASSESSMENT:\nModifying ${selectedNode.data.name} affects ${impactedNodes.length} downstream components.\nCritical Path: ${impactedNodes.map((n:any)=>n.data.name).join(' -> ')}`}
                  />
                  <button className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[12px] font-black italic uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 font-['Inter']">Generate Documentation</button>
               </div>
            </div>
         ) : selectedEdge ? (
            <div className="space-y-10">
               <div className="p-8 bg-blue-600/10 rounded-lg border border-blue-600/20 space-y-6">
                  <p className="text-[10px] font-black italic text-blue-400 uppercase tracking-[0.4em] font-['Inter']">Connection Topology</p>
                  <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter leading-none font-['Inter']">{selectedEdge.data?.label || 'Data Flow'}</h3>
                  <div className="flex items-center space-x-3">
                     <span className="px-3 py-1 rounded bg-blue-600/20 text-blue-400 text-[10px] font-black italic uppercase font-['Inter']">{selectedEdge.source}</span>
                     <ArrowRight size={14} className="text-slate-600" />
                     <span className="px-3 py-1 rounded bg-indigo-600/20 text-indigo-400 text-[10px] font-black italic uppercase font-['Inter']">{selectedEdge.target}</span>
                  </div>
               </div>

               <div className="space-y-6">
                  <h4 className="text-[11px] font-black italic uppercase text-white tracking-[0.3em] flex items-center gap-3 font-['Inter']"><Clock size={16}/> Temporal Step Assignment</h4>
                  <div className="grid grid-cols-5 gap-3">
                     {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(step => (
                        <button 
                          key={step}
                          onClick={() => onStepUpdate(step)}
                          className={`py-3 rounded-md border font-black italic transition-all font-['Inter'] ${selectedEdge.data?.step === step ? 'bg-blue-600 border-blue-400 text-white shadow-glow-blue scale-110' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
                        >
                           {step}
                        </button>
                     ))}
                  </div>
                  <p className="text-[9px] font-black italic text-slate-500 uppercase tracking-widest text-center mt-4 font-['Inter']">Assigning a step will re-order the swimlane sequence</p>
               </div>
            </div>
         ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-8 pb-20">
               <div className="p-8 rounded-full bg-slate-800/50 border border-slate-700"><Target size={80} /></div>
               <p className="text-lg font-black italic uppercase tracking-[0.4em] leading-relaxed font-['Inter']">Select component to<br/>Analyze architecture</p>
            </div>
         )}
      </div>
   )
}


// --- Main Designer ---

function ArchDesignerInner() {
  const { fitView, project } = useReactFlow();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'dashboard' | 'editor' | 'service-editor'>('dashboard');
  const [layoutMode, setLayoutMode] = useState<'FREE' | 'SWIMLANE'>('FREE');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeFlow, setActiveFlow] = useState<any>({ name: 'NEW_MANIFEST', category: 'System', status: 'Up to date' });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [serviceContext, setServiceContext] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Data Ingestion
  const { data: savedFlows } = useQuery({ queryKey: ['data-flows'], queryFn: async () => (await (await apiFetch('/api/v1/data-flows/')).json()) });
  const { data: allConnections } = useQuery({ queryKey: ['port-connections'], queryFn: async () => (await (await apiFetch('/api/v1/networks/connections')).json()) });
  const { data: assets } = useQuery({ queryKey: ['devices'], queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) });
  const { data: logicalServices } = useQuery({ queryKey: ['logical-services'], queryFn: async () => (await (await apiFetch('/api/v1/logical-services/')).json()) });
  const { data: externalEntities } = useQuery({ queryKey: ['external-intelligence'], queryFn: async () => (await (await apiFetch('/api/v1/intelligence/external')).json()) });

  // Scenario 1 & 2: Impact Engine (Recursive BFS)
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

  // Compute display nodes/edges to avoid infinite loop from setNodes in useEffect
  const displayNodes = useMemo(() => {
    let baseNodes = nodes;
    if (view === 'service-editor' && serviceContext) {
       const connectedNodeIds = new Set<string>([serviceContext.id]);
       edges.forEach(e => {
          if (e.source === serviceContext.id) connectedNodeIds.add(e.target);
          if (e.target === serviceContext.id) connectedNodeIds.add(e.source);
       });
       baseNodes = nodes.filter(n => connectedNodeIds.has(n.id));
    }

    return baseNodes.map(n => ({
      ...n,
      data: { 
        ...n.data, 
        isImpacted: impactAnalysis.nodeIds.has(n.id)
      }
    }));
  }, [nodes, impactAnalysis, view, serviceContext, edges]);

  const displayEdges = useMemo(() => {
    let baseEdges = edges;
    if (view === 'service-editor' && serviceContext) {
       baseEdges = edges.filter(e => e.source === serviceContext.id || e.target === serviceContext.id);
    }

    return baseEdges.map(e => ({
      ...e,
      data: { 
        ...e.data, 
        isImpacted: impactAnalysis.edgeIds.has(e.id)
      }
    }));
  }, [edges, impactAnalysis, view, serviceContext]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ 
      ...params, 
      id: `edge-${Date.now()}`,
      type: 'labeled', 
      data: { type: 'DATA', label: 'NEW_FLOW', step: 1 }, 
      animated: true, 
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } 
    }, eds));
    toast.success("Flow Path Established");
  }, [setEdges]);

  const [freePositions, setFreePositions] = useState<Record<string, { x: number, y: number }>>({});

  // TEMPORAL SWIMLANE ENGINE
  const toggleLayout = () => {
    const nextMode = layoutMode === 'FREE' ? 'SWIMLANE' : 'FREE';
    setLayoutMode(nextMode);

    if (nextMode === 'SWIMLANE') {
      // Save current positions as FREE positions before switching
      const currentPositions: Record<string, { x: number, y: number }> = {};
      nodes.forEach(n => {
        currentPositions[n.id] = n.position;
      });
      setFreePositions(currentPositions);

      const assetNodes = nodes.filter(n => n.type === 'device' || n.type === 'external');
      const laneWidth = 600;
      const stepHeight = 400;
      
      const newNodes = nodes.map(n => {
        // Find column index
        let assetIndex = assetNodes.findIndex(an => an.id === n.id);
        
        // If it's a service, try to find its parent device from connections
        if (assetIndex === -1 && n.type === 'service') {
           const parentEdge = edges.find(e => e.target === n.id && (e.source.startsWith('device') || e.source.startsWith('external')));
           if (parentEdge) {
              assetIndex = assetNodes.findIndex(an => an.id === parentEdge.source);
           }
        }
        
        if (assetIndex === -1) assetIndex = 0; // Default to first lane
        
        const participatingEdges = edges.filter(e => e.source === n.id || e.target === n.id);
        const minStep = participatingEdges.length > 0 
          ? Math.min(...participatingEdges.map(e => (e.data?.step || 1)))
          : 1;

        return {
          ...n,
          position: {
            x: assetIndex * laneWidth,
            y: (minStep - 1) * stepHeight + 250
          }
        };
      });
      setNodes(newNodes);
      setTimeout(() => fitView({ padding: 40, duration: 800 }), 100);
    } else {
      // Restore FREE positions if they exist
      if (Object.keys(freePositions).length > 0) {
        const newNodes = nodes.map(n => ({
          ...n,
          position: freePositions[n.id] || n.position
        }));
        setNodes(newNodes);
        setTimeout(() => fitView({ padding: 40, duration: 800 }), 100);
      }
    }
  };

  const addNodeFromInventory = (type: 'device' | 'service' | 'external', item: any) => {
     const newNode: Node = {
        id: `${type}-${item.id}-${Date.now()}`,
        type,
        position: { x: 100 + Math.random() * 800, y: 100 + Math.random() * 600 },
        data: { ...item, name: item.name || item.hostname }
     };
     setNodes(nds => [...nds, newNode]);
     toast.success(`Ingested ${type}: ${item.name || item.hostname}`);
  };

  const updateEdgeStep = (edgeId: string, step: number) => {
     setEdges(eds => eds.map(e => e.id === edgeId ? { ...e, data: { ...e.data, step } } : e));
  };

  const handleEdit = (flow: any) => {
    setActiveFlow(flow);
    setNodes(flow.nodes_json || []);
    setEdges(flow.edges_json || []);
    setView('editor');
    setTimeout(() => fitView(), 200);
  };

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
     setServiceContext(node);
     setView('service-editor');
  }, []);

  if (view === 'dashboard') return <ArchDashboard flows={savedFlows} onEdit={handleEdit} onAdd={() => setView('editor')} />

  return (
    <div className="flex-1 relative flex h-full overflow-hidden bg-[#020617]">
       {/* Inventory Sidebar */}
       <AnimatePresence>
          {isSidebarOpen && (
             <motion.div 
               initial={{ x: -400 }} animate={{ x: 0 }} exit={{ x: -400 }}
               className="w-[380px] border-r border-white/5 bg-[#0a0c14]/90 backdrop-blur-3xl flex flex-col z-50 shadow-3xl"
             >
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                   <h2 className="text-xl font-black italic uppercase text-white tracking-tighter">Inventory Ingestion</h2>
                   <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500"><X size={20}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
                   {/* Assets */}
                   <section className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                         <h3 className="text-[10px] font-black italic uppercase text-blue-400 tracking-[0.3em]">Infrastructure Assets</h3>
                         <Server size={14} className="text-blue-500/50" />
                      </div>
                      <div className="space-y-2">
                         {assets?.slice(0, 10).map((a: any) => (
                            <button key={a.id} onClick={() => addNodeFromInventory('device', a)} className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 rounded-xl transition-all group">
                               <span className="text-[11px] font-black italic uppercase text-slate-300 group-hover:text-blue-400 truncate">{a.hostname || a.name}</span>
                               <Plus size={14} className="text-slate-600 group-hover:text-blue-500" />
                            </button>
                         ))}
                      </div>
                   </section>

                   {/* Services */}
                   <section className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                         <h3 className="text-[10px] font-black italic uppercase text-emerald-400 tracking-[0.3em]">Logical Services</h3>
                         <Database size={14} className="text-emerald-500/50" />
                      </div>
                      <div className="space-y-2">
                         {logicalServices?.slice(0, 10).map((s: any) => (
                            <button key={s.id} onClick={() => addNodeFromInventory('service', s)} className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 rounded-xl transition-all group">
                               <span className="text-[11px] font-black italic uppercase text-slate-300 group-hover:text-emerald-400 truncate">{s.name}</span>
                               <Plus size={14} className="text-slate-600 group-hover:text-emerald-500" />
                            </button>
                         ))}
                      </div>
                   </section>

                   {/* External */}
                   <section className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                         <h3 className="text-[10px] font-black italic uppercase text-indigo-400 tracking-[0.3em]">External Entities</h3>
                         <Globe size={14} className="text-indigo-500/50" />
                      </div>
                      <div className="space-y-2">
                         {externalEntities?.slice(0, 10).map((e: any) => (
                            <button key={e.id} onClick={() => addNodeFromInventory('external', e)} className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 rounded-xl transition-all group">
                               <span className="text-[11px] font-black italic uppercase text-slate-300 group-hover:text-indigo-400 truncate">{e.name}</span>
                               <Plus size={14} className="text-slate-600 group-hover:text-indigo-500" />
                            </button>
                         ))}
                      </div>
                   </section>
                </div>

                <div className="p-8 border-t border-white/5 bg-black/20">
                   <button onClick={() => toast.success('Manifest saved successfully')} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center space-x-3 shadow-2xl transition-all">
                      <Save size={20} />
                      <span className="text-[12px] font-black italic uppercase tracking-widest">Deploy Manifest</span>
                   </button>
                </div>
             </motion.div>
          )}
       </AnimatePresence>

       <div className="flex-1 relative h-full">
          {!isSidebarOpen && (
             <button onClick={() => setIsSidebarOpen(true)} className="absolute left-8 top-8 z-50 p-4 bg-blue-600 text-white rounded-xl shadow-2xl hover:bg-blue-500 transition-all">
                <Box size={24} />
             </button>
          )}

          <ReactFlow
            nodes={displayNodes} edges={displayEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(null); }}
            onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(null); }}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView snapToGrid snapGrid={[20, 20]}
          >
            <Background color="#1e293b" gap={20} size={1} className="opacity-40" />
            
            <Panel position="top-left" className="flex flex-col space-y-4">
               <div className="glass-panel p-4 rounded-lg border border-white/10 flex items-center space-x-5 bg-slate-900/40 backdrop-blur-2xl shadow-3xl">
                  <button onClick={() => { setView('dashboard'); setSelectedNodeId(null); }} className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-all"><ChevronLeft size={24}/></button>
                  <div className="flex flex-col min-w-[240px]">
                     <span className="text-[15px] font-black italic uppercase text-white tracking-widest truncate max-w-[280px] font-['Inter']">{activeFlow.name}</span>
                     <span className="text-[9px] font-black italic text-blue-400 uppercase tracking-tighter mt-1 font-['Inter']">
                        {view === 'service-editor' ? 'Temporal Isolation Mode' : 'Architecture Mission Mode'}
                     </span>
                  </div>
                  <div className="h-12 w-px bg-white/10" />
                  <button onClick={toggleLayout} className={`flex items-center space-x-4 px-8 py-4 rounded-lg text-[11px] font-black italic uppercase tracking-[0.2em] transition-all font-['Inter'] ${layoutMode === 'SWIMLANE' ? 'bg-indigo-600 text-white shadow-[0_0_30px_rgba(79,70,229,0.5)]' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                     <Layout size={18} />
                     <span>{layoutMode === 'SWIMLANE' ? 'Sequence Mode' : 'Topology Mode'}</span>
                  </button>
               </div>
            </Panel>

            <Panel position="top-right">
               <div className="glass-panel p-5 rounded-lg border border-white/5 flex items-center space-x-10 bg-slate-900/60 backdrop-blur-3xl shadow-2xl">
                  <div className="flex items-center space-x-4 group cursor-help">
                     <div className={`w-3 h-3 rounded-full bg-rose-500 ${selectedNodeId ? 'animate-ping' : ''}`} />
                     <span className="text-[10px] font-black italic text-slate-400 uppercase tracking-widest font-['Inter']">Blast Radius Active</span>
                  </div>
                  <div className="flex items-center space-x-4">
                     <Terminal size={18} className="text-blue-500" />
                     <span className="text-[10px] font-black italic text-slate-400 uppercase tracking-widest font-['Inter']">Real-time Ingestion</span>
                  </div>
               </div>
            </Panel>

            {layoutMode === 'SWIMLANE' && (
               <Panel position="bottom-left" className="ml-10 mb-24 pointer-events-none">
                  <div className="glass-panel p-8 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 backdrop-blur-xl max-w-sm">
                     <h4 className="text-[11px] font-black italic uppercase text-indigo-400 tracking-[0.3em] mb-6 flex items-center gap-3"><Layers size={16}/> Temporal Lane Partitions</h4>
                     <div className="space-y-4">
                        {Array.from(new Set(nodes.filter(n => n.type === 'device' || n.type === 'external').map(n => n.data.name))).map((name, i) => (
                           <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-glow-indigo" />
                                 <span className="text-[12px] font-black italic text-white uppercase tracking-tighter">{name}</span>
                              </div>
                              <span className="text-[10px] font-black italic text-slate-600 uppercase">Column {i + 1}</span>
                           </div>
                        ))}
                     </div>
                  </div>
               </Panel>
            )}
          </ReactFlow>
       </div>

       <MissionControl 
          selectedNode={nodes.find(n => n.id === selectedNodeId)} 
          selectedEdge={edges.find(e => e.id === selectedEdgeId)}
          impactedNodes={impactedNodes}
          onBack={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
          onStepUpdate={(step: number) => {
             if (selectedEdgeId) updateEdgeStep(selectedEdgeId, step);
          }}
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
