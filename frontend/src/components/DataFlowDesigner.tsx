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
  const isImpacted = data.isImpacted; // Added for troubleshooting scenario
  
  return (
    <div className={`glass-panel min-w-[340px] rounded-[40px] border-2 transition-all duration-500 overflow-hidden relative shadow-2xl ${selected ? 'border-blue-500 bg-blue-500/5 ring-4 ring-blue-500/20' : isImpacted ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_30px_rgba(244,63,94,0.3)]' : 'border-white/10'}`}>
      <div className={`px-8 py-4 border-b border-white/5 flex items-center justify-between ${isImpacted ? 'bg-rose-500/20' : 'bg-white/5'}`}>
         <div className="flex items-center space-x-4">
            <div className={`p-2.5 rounded-2xl ${isImpacted ? 'bg-rose-500 text-white' : data.type === 'Switch' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-500/20 text-blue-400'} border border-current/20 shadow-inner transition-colors`}>
               {data.type === 'Switch' ? <Network size={20}/> : <Server size={20}/>}
            </div>
            <div className="min-w-0">
               <p className="text-[12px] font-black uppercase text-white tracking-tighter leading-none truncate max-w-[180px]">{data.name}</p>
               <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{data.system || 'Unassigned System'}</p>
            </div>
         </div>
         {isImpacted && <AlertTriangle size={16} className="text-rose-500 animate-bounce" />}
      </div>
      
      <div className="p-6 space-y-4">
         <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
            <span>Primary Interface</span>
            <span className="text-white font-mono">{data.ip_address}</span>
         </div>
         <div className="h-px bg-white/5" />
         <div className="flex flex-wrap gap-2">
            {(data.logical_services || []).map((s: any) => (
               <div key={s.id} className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Database size={10} className="text-emerald-400" />
                  <span className="text-[8px] font-black text-emerald-400 uppercase">{s.name}</span>
               </div>
            ))}
         </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-4 h-4 bg-blue-500 border-2 border-slate-900 !left-[-8px]" />
      <Handle type="source" position={Position.Right} className="w-4 h-4 bg-indigo-500 border-2 border-slate-900 !right-[-8px]" />
    </div>
  )
}

const ServiceNode = ({ data, selected }: any) => (
  <div className={`glass-panel px-5 py-3 rounded-2xl border-2 transition-all duration-300 flex items-center space-x-4 w-full shadow-lg ${selected ? 'border-emerald-500 bg-emerald-500/10 scale-105' : 'border-white/10 bg-white/5'}`}>
     <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/20 shadow-inner">
        <Database size={16}/>
     </div>
     <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black uppercase text-emerald-400 truncate tracking-tighter leading-none">{data.name}</p>
        <p className="text-[8px] font-bold text-slate-500 uppercase truncate mt-1">{data.service_type || 'Logic'}</p>
     </div>
     <Handle type="target" position={Position.Left} className="w-2 h-2 bg-emerald-500 border-2 border-slate-900 !left-[-4px]" />
     <Handle type="source" position={Position.Right} className="w-2 h-2 bg-emerald-500 border-2 border-slate-900 !right-[-4px]" />
  </div>
)

const ExternalNode = ({ data, selected }: any) => (
  <div className={`glass-panel min-w-[300px] rounded-[40px] border-2 transition-all duration-500 p-6 border-dashed shadow-2xl ${selected ? 'border-indigo-500 bg-indigo-500/10 ring-4 ring-indigo-500/20' : 'border-white/20'}`}>
     <div className="flex items-center space-x-4">
        <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 border border-indigo-500/20 shadow-inner">
           <Globe size={24}/>
        </div>
        <div className="min-w-0">
           <p className="text-[12px] font-black uppercase text-indigo-400 tracking-widest truncate">{data.name}</p>
           <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-tighter truncate">{data.owner_organization}</p>
        </div>
     </div>
     <Handle type="target" position={Position.Left} className="w-4 h-4 bg-indigo-500 border-2 border-slate-900 !left-[-8px]" />
     <Handle type="source" position={Position.Right} className="w-4 h-4 bg-indigo-500 border-2 border-slate-900 !right-[-8px]" />
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
        style={{ ...style, stroke: data?.isImpacted ? '#f43f5e' : currentType.color, strokeWidth: selected ? 5 : (data?.isImpacted ? 4 : 2), strokeDasharray: Array.isArray(currentType.dash) ? currentType.dash.join(' ') : 'none', opacity: selected || data?.isImpacted ? 1 : 0.4, filter: selected ? `drop-shadow(0 0 12px ${currentType.color})` : 'none' }} 
      />
      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }} className="nodrag nopan flex flex-col items-center group">
          <motion.div whileHover={{ scale: 1.05 }} className={`px-4 py-1.5 rounded-full border-2 transition-all duration-300 flex items-center space-x-3 cursor-pointer ${selected ? 'bg-slate-900 border-white scale-110 shadow-2xl z-50' : 'bg-slate-950/95 border-white/10'}`} style={{ borderColor: selected ? '#ffffff' : (data?.isImpacted ? '#f43f5e' : `${currentType.color}80`) }}>
             <div className={`w-2 h-2 rounded-full ${data?.isImpacted ? 'bg-rose-500 animate-ping' : ''}`} style={{ backgroundColor: data?.isImpacted ? '#f43f5e' : currentType.color }} />
             <span className={`text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap ${data?.isImpacted ? 'text-rose-400' : 'text-white'}`}>
                {data?.label || currentType.label}
             </span>
             {data?.source_port && <span className="text-[8px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">{data.source_port}➔{data.target_port}</span>}
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
                   <div className="p-3 bg-blue-600 rounded-2xl shadow-xl text-white"><Workflow size={32} /></div>
                   <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic">Architecture Matrix</h1>
                </div>
                <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.5em] mt-2 italic pl-1">Intelligent Blast Radius & Change Point Governance</p>
             </div>
             <button onClick={onAdd} className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[32px] flex items-center space-x-4 transition-all shadow-2xl border-t border-white/20">
                <Plus size={24} />
                <span className="text-base font-black uppercase tracking-widest">New Manifest</span>
             </button>
          </div>

          <div className="glass-panel rounded-[50px] border border-white/5 overflow-hidden shadow-2xl bg-[#0a0c14]/40 backdrop-blur-3xl">
             <div className="p-10 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="relative flex-1 max-w-2xl">
                   <Search size={24} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" />
                   <input 
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     placeholder="Search Architectures by Name, Hostname or Service..."
                     className="w-full bg-black/40 border border-white/10 rounded-[30px] pl-16 pr-8 py-5 text-sm font-black text-white uppercase outline-none focus:border-blue-500/50 shadow-inner"
                   />
                   <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center space-x-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                      <Compass size={12} />
                      <span>Deep Asset Lookup Active</span>
                   </div>
                </div>
                <div className="flex items-center space-x-6">
                   <div className="flex bg-black/60 p-1.5 rounded-[24px] border border-white/5">
                      {['All', ...ARCH_STATUSES].map(s => (
                         <button key={s} onClick={() => setStatusFilter(s)} className={`px-8 py-3 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>{s}</button>
                      ))}
                   </div>
                </div>
             </div>

             <div className="overflow-x-auto p-2">
                <table className="w-full text-left border-separate border-spacing-y-3 px-8">
                   <thead>
                      <tr>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Identity</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Linked Entities</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Blast Sensitivity</th>
                         <th className="px-6 py-4 text-right"></th>
                      </tr>
                   </thead>
                   <tbody>
                      {filteredFlows.map((f: any) => (
                         <tr key={f.id} className="group cursor-pointer" onClick={() => onEdit(f)}>
                            <td className="px-6 py-6 bg-white/[0.02] group-hover:bg-white/[0.05] rounded-l-[32px] border-y border-l border-white/5 transition-all">
                               <div className="flex items-center space-x-6">
                                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform"><Layout size={24} /></div>
                                  <div className="flex flex-col">
                                     <span className="text-lg font-black text-white tracking-tighter uppercase leading-none mb-1">{f.name}</span>
                                     <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[400px] italic">{f.description || 'No context'}</span>
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
                                  <div className="flex justify-between text-[9px] font-black uppercase text-slate-500"><span>Integrity</span><span>{f.status === 'Up to date' ? '100%' : '60%'}</span></div>
                                  <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden"><div className={`h-full ${f.status === 'Up to date' ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: f.status === 'Up to date' ? '100%' : '60%' }} /></div>
                               </div>
                            </td>
                            <td className="px-6 py-6 bg-white/[0.02] group-hover:bg-white/[0.05] border-y border-r border-white/5 rounded-r-[32px] text-right transition-all">
                               <button className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl transform group-hover:scale-110 active:scale-95 transition-all"><ArrowRight size={20} /></button>
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

const MissionControl = ({ selectedNode, impactedNodes, onBack }: any) => {
   return (
      <div className="w-[420px] glass-panel h-full border-l border-white/5 flex flex-col p-8 space-y-10 bg-[#0a0c14]/80 backdrop-blur-3xl z-50 overflow-y-auto custom-scrollbar">
         <div className="flex items-center justify-between">
            <h2 className="text-xl font-black uppercase text-rose-400 tracking-tighter flex items-center gap-3"><AlertOctagon size={24}/> Blast Radius</h2>
            <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-slate-500"><X size={20}/></button>
         </div>

         {selectedNode ? (
            <div className="space-y-8">
               <div className="p-6 bg-white/5 rounded-[32px] border border-white/10 space-y-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Critical Point of Interest</p>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{selectedNode.data.name}</h3>
                  <div className="flex items-center space-x-3">
                     <StatusPill value={selectedNode.data.status} />
                     <span className="text-[10px] font-bold text-slate-500 uppercase">{selectedNode.data.system}</span>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase text-white tracking-widest flex items-center gap-2"><Layers size={14}/> Impacted Dependencies ({impactedNodes.length})</h4>
                  <div className="space-y-2">
                     {impactedNodes.map((n: any) => (
                        <div key={n.id} className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl group hover:bg-rose-500/10 transition-all">
                           <div className="flex items-center space-x-3">
                              <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400"><Server size={14}/></div>
                              <span className="text-[11px] font-black text-slate-300 uppercase truncate max-w-[180px]">{n.data.name}</span>
                           </div>
                           <ArrowRight size={14} className="text-rose-500/40 group-hover:translate-x-1 transition-transform" />
                        </div>
                     ))}
                  </div>
               </div>

               <div className="pt-8 border-t border-white/5 space-y-6">
                  <h4 className="text-[11px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2"><FileText size={14}/> Change Point Analysis</h4>
                  <textarea 
                    className="w-full bg-black/40 border border-white/10 rounded-[24px] p-5 text-xs font-bold text-slate-300 uppercase outline-none focus:border-indigo-500 resize-none h-40 shadow-inner"
                    placeholder="Document impacts for internal governance..."
                    defaultValue={`IMPACT ASSESSMENT:\nModifying ${selectedNode.data.name} affects ${impactedNodes.length} downstream components.\nCritical Path: ${impactedNodes.map((n:any)=>n.data.name).join(' -> ')}`}
                  />
                  <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all">Generate Governance Doc</button>
               </div>
            </div>
         ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-6">
               <Target size={64} />
               <p className="text-sm font-black uppercase tracking-[0.3em]">Select node to analyze<br/>Blast Radius</p>
            </div>
         )}
      </div>
   )
}

// --- Main Designer ---

function ArchDesignerInner() {
  const { fitView } = useReactFlow();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'dashboard' | 'editor' | 'service-editor'>('dashboard');
  const [layoutMode, setLayoutMode] = useState<'FREE' | 'SEQUENTIAL'>('FREE');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeFlow, setActiveFlow] = useState<any>({ name: 'NEW_MANIFEST', category: 'System', status: 'Up to date' });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [serviceContext, setServiceContext] = useState<any>(null);

  const { data: savedFlows } = useQuery({ queryKey: ['data-flows'], queryFn: async () => (await (await apiFetch('/api/v1/data-flows/')).json()) });
  const { data: allConnections } = useQuery({ queryKey: ['port-connections'], queryFn: async () => (await (await apiFetch('/api/v1/networks/connections')).json()) });

  // Scenario 1 & 2: Impact Engine
  const impactedNodes = useMemo(() => {
    if (!selectedNodeId) return [];
    const connectedEdges = edges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId);
    const peerIds = new Set(connectedEdges.map(e => e.source === selectedNodeId ? e.target : e.source));
    return nodes.filter(n => peerIds.has(n.id));
  }, [selectedNodeId, nodes, edges]);

  // Sync Impact Visualization
  useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, isImpacted: selectedNodeId ? (n.id === selectedNodeId || impactedNodes.some(i => i.id === n.id)) : false }
    })));
    setEdges(eds => eds.map(e => ({
      ...e,
      data: { ...e.data, isImpacted: selectedNodeId ? (e.source === selectedNodeId || e.target === selectedNodeId) : false }
    })));
  }, [selectedNodeId, impactedNodes, setNodes, setEdges]);

  // Scenario 3: Automated Layout Engine
  const toggleLayout = () => {
    const nextMode = layoutMode === 'FREE' ? 'SEQUENTIAL' : 'FREE';
    setLayoutMode(nextMode);

    if (nextMode === 'SEQUENTIAL') {
      // Logic: Group by System, Layout Vertically
      const systemOrder = ['EDGE-NETWORK', 'ERP-FRONTEND', 'IDENTITY-CORE', 'ERP-DATA', 'GLOBAL'];
      const systems = Array.from(new Set(nodes.map(n => n.data.system || 'GLOBAL'))).sort((a,b) => {
         const ia = systemOrder.indexOf(a);
         const ib = systemOrder.indexOf(b);
         return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });

      const laneWidth = 500;
      const verticalGap = 250;
      
      const newNodes = nodes.map(n => {
        const sys = n.data.system || 'GLOBAL';
        const sysIndex = systems.indexOf(sys);
        const nodesInSys = nodes.filter(node => (node.data.system || 'GLOBAL') === sys);
        const nodeIndex = nodesInSys.indexOf(n);
        
        return {
          ...n,
          position: {
            x: sysIndex * laneWidth,
            y: nodeIndex * verticalGap + 100
          }
        };
      });
      setNodes(newNodes);
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    }
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

  // Service Isolation Effect
  useEffect(() => {
     if (view === 'service-editor' && serviceContext && allConnections) {
        const centerId = serviceContext.data.id;
        const relevant = allConnections.filter((c: any) => c.source_device_id === centerId || c.target_device_id === centerId);
        
        const drillNodes: Node[] = [{
           id: serviceContext.id,
           type: serviceContext.type,
           position: { x: 500, y: 400 },
           data: serviceContext.data,
           style: { zIndex: 100, border: '4px solid #3b82f6' }
        }];

        const drillEdges: Edge[] = [];

        relevant.forEach((c: any, idx: number) => {
           const isSrc = c.source_device_id === centerId;
           const peerId = isSrc ? c.target_device_id : c.source_device_id;
           const peerNodeId = `drill-peer-${peerId}`;
           const angle = (idx / relevant.length) * 2 * Math.PI;
           
           if (!drillNodes.find(n => n.id === peerNodeId)) {
              drillNodes.push({
                 id: peerNodeId,
                 type: 'device',
                 position: { x: 500 + Math.cos(angle) * 500, y: 400 + Math.sin(angle) * 500 },
                 data: { name: isSrc ? c.server_b : c.server_a, id: peerId, status: 'Active', system: isSrc ? 'Downstream' : 'Upstream' },
                 style: { opacity: 0.8 }
              });
           }

           drillEdges.push({
              id: `drill-edge-${c.id}`,
              source: isSrc ? serviceContext.id : peerNodeId,
              target: isSrc ? peerNodeId : serviceContext.id,
              type: 'labeled',
              animated: true,
              data: { label: c.link_type?.toUpperCase(), source_port: c.source_port, target_port: c.target_port, type: 'CRITICAL' }
           });
        });

        setNodes(drillNodes);
        setEdges(drillEdges);
        setTimeout(() => fitView(), 300);
     }
  }, [view, serviceContext, allConnections, fitView, setNodes, setEdges]);

  if (view === 'dashboard') return <ArchDashboard flows={savedFlows} onEdit={handleEdit} onAdd={() => setView('editor')} />

  return (
    <div className="flex-1 relative flex h-full overflow-hidden bg-[#020617]">
       <div className="flex-1 relative h-full">
          <ReactFlow
            nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView snapToGrid snapGrid={[20, 20]}
          >
            <Background color="#1e293b" gap={20} size={1} className="opacity-40" />
            
            <Panel position="top-left" className="flex flex-col space-y-4">
               <div className="glass-panel p-3 rounded-[30px] border border-white/10 flex items-center space-x-4 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                  <button onClick={() => { setView('dashboard'); setSelectedNodeId(null); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all"><ChevronLeft size={20}/></button>
                  <div className="flex flex-col min-w-[200px]">
                     <span className="text-[12px] font-black uppercase text-white tracking-widest truncate max-w-[220px]">{activeFlow.name}</span>
                     <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">
                        {view === 'service-editor' ? 'Temporal Isolation Mode' : 'Architecture Mission Mode'}
                     </span>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <button onClick={toggleLayout} className={`flex items-center space-x-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${layoutMode === 'SEQUENTIAL' ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                     <ArrowDownUp size={16} />
                     <span>{layoutMode === 'SEQUENTIAL' ? 'Sequential View' : 'Flow View'}</span>
                  </button>
               </div>
            </Panel>

            <Panel position="top-right">
               <div className="glass-panel p-4 rounded-[30px] border border-white/5 flex items-center space-x-8 bg-slate-900/60 backdrop-blur-2xl shadow-xl">
                  <div className="flex items-center space-x-3 group cursor-help">
                     <div className={`w-2 h-2 rounded-full bg-rose-500 ${selectedNodeId ? 'animate-ping' : ''}`} />
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Impact Engine {selectedNodeId ? 'Active' : 'Standby'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                     <ListTodo size={14} className="text-emerald-500" />
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sequence Sync</span>
                  </div>
               </div>
            </Panel>

            {layoutMode === 'SEQUENTIAL' && (
               <Panel position="bottom-left" className="ml-4 mb-20 pointer-events-none">
                  <div className="glass-panel p-6 rounded-[32px] border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-md">
                     <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-4">Traffic Lane Partitions</h4>
                     <div className="flex flex-col space-y-3">
                        {Array.from(new Set(nodes.map(n => n.data.system || 'GLOBAL'))).map((sys, i) => (
                           <div key={i} className="flex items-center space-x-3">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                              <span className="text-[11px] font-black text-white uppercase">{sys}</span>
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
          impactedNodes={impactedNodes}
          onBack={() => setSelectedNodeId(null)}
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
