import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import ReactFlow, { 
  addEdge, Background, Controls, Panel, useNodesState, useEdgesState, Handle, Position, MarkerType, 
  Connection, ReactFlowProvider, useReactFlow, BaseEdge, EdgeLabelRenderer, getSmoothStepPath, 
  getBezierPath, MiniMap, Node, Edge, applyNodeChanges, applyEdgeChanges, reconnectEdge, 
  ConnectionMode, NodeChange, EdgeChange
} from 'reactflow'
import 'reactflow/dist/style.css'
import { 
  Save, Plus, Server, Search, Database, Globe, Layout, Edit3, Network, ChevronLeft, 
  Settings2, Table as TableIcon, Activity, AlertTriangle, CheckCircle2, Clock, 
  ExternalLink, Filter, ArrowRight, Zap, Info, Maximize2, Minimize2, X, Share2, 
  Cpu, Trash2, MousePointer2, Workflow, Target, Layers, ArrowDownUp, FileText,
  AlertOctagon, Compass, Box, Terminal, ListTodo, ChevronRight, ChevronDown,
  Diamond, StickyNote, GitMerge, MoreHorizontal, Settings, RefreshCw, HelpCircle,
  ShieldCheck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import dagre from 'dagre'
import { apiFetch } from '../api/apiClient'
import { StatusPill } from './shared/StatusPill'
import { StyledSelect } from './shared/StyledSelect'
import { ConfirmationModal } from './shared/ConfirmationModal'

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
const LOGIC_BLOCK_TYPES = [
  { id: 'PROCESS', label: 'Entity', color: '#3b82f6', icon: Box },
  { id: 'CONDITION', label: 'Condition', color: '#f59e0b', icon: Diamond },
]

const SUB_PROCESS_TYPES = [
  { id: 'CONTROLLER', label: 'Controller', color: '#f59e0b', icon: Zap },
  { id: 'LOGIC', label: 'Business Logic', color: '#10b981', icon: Workflow },
  { id: 'SECURITY', label: 'Security/Auth', color: '#6366f1', icon: ShieldCheck },
  { id: 'PERSISTENCE', label: 'Persistence', color: '#3b82f6', icon: Database },
  { id: 'EXTERNAL', label: 'External Call', color: '#f43f5e', icon: Share2 },
]

const DeviceNode = ({ data, selected }: any) => {
  const isImpacted = data.isImpacted && data.dependencyRiskEnabled;
  const services = data.logical_services || [];
  const visits = data.transactionVisits || [];
  return (
    <div className={`glass-panel min-w-[300px] rounded-lg border-2 transition-all duration-300 overflow-hidden relative shadow-2xl ${selected ? 'border-blue-500 bg-blue-500/10' : isImpacted ? 'border-rose-500 bg-rose-500/10' : 'border-white/10 bg-slate-900/60'}`}>
      {visits.length > 0 && (
        <div className="absolute -top-3 -left-3 flex -space-x-1 z-50">
          {visits.map((v: number) => <div key={v} className="w-6 h-6 rounded-full bg-amber-500 border-2 border-slate-950 flex items-center justify-center text-[10px] font-black text-white shadow-xl animate-bounce" style={{ animationDelay: `${v * 0.1}s` }}>{v}</div>)}
        </div>
      )}
      <div className={`px-4 py-3 border-b border-white/5 flex items-center justify-between ${isImpacted ? 'bg-rose-500/20' : 'bg-white/5'}`}>
         <div className="flex items-center space-x-3"><div className={`p-2 rounded-lg ${isImpacted ? 'bg-rose-500 text-white' : 'bg-blue-600/20 text-blue-400'} border border-current/20 shadow-inner`}>{data.type === 'Switch' ? <Network size={16}/> : <Server size={16}/>}</div><div className="min-w-0"><p className="text-[12px] font-bold uppercase text-white tracking-tight leading-none truncate max-w-[180px]">{data.name}</p><p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{data.ip_address}</p></div></div>
      </div>
      <div className="p-4 space-y-4">
         <div className="space-y-1">
            <div className="relative flex items-center justify-between px-3 py-2 rounded-md bg-white/5 border border-dashed border-white/20 group hover:border-blue-500/40">
               <Handle type="target" position={Position.Left} id="unidentified-target" className="!left-[-15px] w-2 h-2 !bg-blue-400 border-none !opacity-0 group-hover:!opacity-100" />
               <div className="flex items-center space-x-2 truncate"><HelpCircle size={10} className="text-slate-400"/><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">Unidentified Interface</span></div>
               <Handle type="source" position={Position.Right} id="unidentified-source" className="!right-[-15px] w-2 h-2 !bg-blue-400 border-none !opacity-0 group-hover:!opacity-100" />
            </div>
            {services.map((s: any) => (
               <div key={s.id} className="relative flex items-center justify-between px-3 py-2 rounded-md bg-emerald-500/5 border border-emerald-500/10 group hover:border-emerald-500/40">
                  <Handle type="target" position={Position.Left} id={`svc-target-${s.id}`} className="!left-[-15px] w-2 h-2 !bg-emerald-500 border-none !opacity-0 group-hover:!opacity-100" />
                  <div className="flex items-center space-x-2 truncate"><Database size={10} className="text-emerald-400"/><span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter truncate">{s.name}</span></div>
                  <Handle type="source" position={Position.Right} id={`svc-source-${s.id}`} className="!right-[-15px] w-2 h-2 !bg-emerald-500 border-none !opacity-0 group-hover:!opacity-100" />
               </div>
            ))}
         </div>
      </div>
    </div>
  )
}

const ServiceNode = ({ data, selected }: any) => (<div className={`glass-panel px-4 py-3 rounded-lg border-2 transition-all duration-300 flex items-center space-x-3 w-full shadow-xl ${selected ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-slate-900/60'}`}><div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/20"><Database size={16}/></div><div className="flex-1 min-w-0"><p className="text-[11px] font-bold uppercase text-emerald-400 truncate tracking-tight">{data.name}</p></div><Handle type="target" position={Position.Left} className="w-2 h-2 bg-emerald-500 border-none !left-[-4px]" /><Handle type="source" position={Position.Right} className="w-2 h-2 bg-emerald-500 border-none !right-[-4px]" /></div>)
const ExternalNode = ({ data, selected }: any) => (<div className={`glass-panel min-w-[260px] rounded-lg border-2 transition-all duration-300 p-6 border-dashed shadow-2xl ${selected ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/20 bg-slate-900/40'}`}><div className="flex items-center space-x-4"><div className="p-3 bg-indigo-500/20 rounded-lg text-indigo-400"><Globe size={20}/></div><div className="min-w-0"><p className="text-[12px] font-bold uppercase text-indigo-400 truncate tracking-tight">{data.name}</p></div></div><Handle type="target" position={Position.Left} className="w-2 h-2 bg-indigo-500 border-none !left-[-4px]" /><Handle type="source" position={Position.Right} className="w-2 h-2 bg-indigo-500 border-none !right-[-4px]" /></div>)
const ConditionNode = ({ data, selected }: any) => (<div className={`w-20 h-20 rotate-45 border-2 flex items-center justify-center transition-all ${selected ? 'border-amber-500 bg-amber-500/20' : 'border-amber-500/40 bg-slate-900/60'}`}><div className="-rotate-45 flex flex-col items-center"><Diamond size={16} className="text-amber-500 mb-1"/><span className="text-[8px] font-black uppercase text-white">{data.label || 'IF'}</span></div><Handle type="target" position={Position.Left} className="w-2 h-2 bg-amber-500 border-none !left-[-1px]" /><Handle type="source" position={Position.Right} className="w-2 h-2 bg-amber-500 border-none !right-[-1px]" /></div>)
const NoteNode = ({ data, selected }: any) => (<div className={`glass-panel p-4 min-w-[200px] rounded-lg border-2 transition-all duration-300 ${selected ? 'border-blue-400 bg-blue-400/10' : 'border-white/10 bg-slate-900/60'}`}><div className="flex items-center gap-2 text-blue-400 mb-2"><StickyNote size={12}/><span className="text-[8px] font-black uppercase tracking-widest">Note</span></div><p className="text-[10px] text-slate-300 font-bold">{data.label}</p></div>)

const LabeledEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data, selected, source, target }: any) => {
  const { getEdges } = useReactFlow();
  const allEdges = getEdges();
  const sameSourceTargetEdges = allEdges.filter(e => e.source === source && e.target === target);
  const edgeIndex = sameSourceTargetEdges.findIndex(e => e.id === id);
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 20, offset: 20 + (edgeIndex * 15) });
  const currentType = FLOW_TYPES.find(t => t.id === (data?.type || 'DATA')) || FLOW_TYPES[0];
  const isTraceActive = data?.isTraceActive;
  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: isTraceActive ? '#f59e0b' : (data?.isImpacted ? '#f43f5e' : (data?.color || currentType.color)), strokeWidth: selected || isTraceActive ? 4 : (data?.isImpacted ? 3 : 2), strokeDasharray: isTraceActive ? '5 5' : (Array.isArray(currentType.dash) ? currentType.dash.join(' ') : 'none'), opacity: selected || data?.isImpacted || isTraceActive ? 1 : 0.6, transition: 'stroke 0.3s' }} />
      <EdgeLabelRenderer><div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all', zIndex: 1002 }} className="nodrag nopan"><motion.div whileHover={{ scale: 1.05 }} className={`px-2 py-1 rounded border transition-all flex items-center space-x-2 ${selected ? 'bg-slate-900 border-white' : 'bg-slate-950/90 border-white/10'} ${isTraceActive ? 'border-amber-500 ring-1 ring-amber-500/20' : ''}`}><div className={`w-1 h-1 rounded-full ${isTraceActive ? 'bg-amber-500' : ''}`} style={{ backgroundColor: data?.color || currentType.color }}/><span className={`text-[8px] font-bold uppercase tracking-widest ${isTraceActive ? 'text-amber-400' : 'text-white'}`}>{data?.label || currentType.label}</span></motion.div></div></EdgeLabelRenderer>
    </>
  );
};

const nodeTypes = { device: DeviceNode, external: ExternalNode, service: ServiceNode, condition: ConditionNode, note: NoteNode };
const edgeTypes = { labeled: LabeledEdge };

// --- Logic Core Explorer 3.0 ---

const LogicBlockNode = ({ data, selected }: any) => {
  const mainType = LOGIC_BLOCK_TYPES.find(t => t.id === data.type) || LOGIC_BLOCK_TYPES[0];
  const subType = data.subType ? SUB_PROCESS_TYPES.find(t => t.id === data.subType) : null;
  const activeColor = subType ? subType.color : mainType.color;
  const ActiveIcon = subType ? subType.icon : mainType.icon;
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showFullImage, setShowFullImage] = React.useState(false);

  return (
    <div className={`glass-panel min-w-[280px] rounded-xl border-2 transition-all duration-300 shadow-2xl overflow-hidden group ${selected ? 'ring-2 ring-white/20' : ''}`} style={{ borderColor: `${activeColor}40`, backgroundColor: `${activeColor}08` }}>
      <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded text-white" style={{ backgroundColor: activeColor }}>
            <ActiveIcon size={12}/>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              {subType ? subType.label : mainType.label}
            </span>
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-tight">Step #{data.id.split('-').pop()}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {selected && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (isDeleting) {
                  data.onDelete(data.id);
                } else {
                  setIsDeleting(true);
                  setTimeout(() => setIsDeleting(false), 3000);
                }
              }} 
              className={`rounded px-2 py-1 transition-all flex items-center gap-1 ${isDeleting ? 'bg-rose-600 text-white' : 'text-rose-500 hover:bg-rose-500/10'}`}
            >
              <Trash2 size={10}/>
              {isDeleting && <span className="text-[8px] font-black uppercase">Confirm?</span>}
            </button>
          )}
        </div>
      </div>
      <div className="p-4 space-y-4">
        {data.type === 'PROCESS' && (
          <div className="flex items-center justify-between gap-2 p-1 bg-black/40 rounded-lg border border-white/5">
            {SUB_PROCESS_TYPES.map(st => (
              <button 
                key={st.id} 
                onClick={() => data.onChange(data.id, { subType: st.id })}
                className={`flex-1 p-2 rounded transition-all flex items-center justify-center ${data.subType === st.id ? 'bg-white/10 text-white shadow-inner' : 'text-slate-600 hover:text-white hover:bg-white/5'}`}
                title={st.label}
              >
                <st.icon size={14} />
              </button>
            ))}
          </div>
        )}
        
        <div className="space-y-2">
          <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Process Description</p>
          <textarea 
            value={data.label} 
            onChange={e => data.onChange(data.id, { label: e.target.value })} 
            onPaste={e => { 
              const items = e.clipboardData.items; 
              for (let i = 0; i < items.length; i++) { 
                if (items[i].type.indexOf("image") !== -1) { 
                  const blob = items[i].getAsFile(); 
                  const reader = new FileReader(); 
                  reader.onload = (event) => data.onChange(data.id, { image: event.target?.result }); 
                  reader.readAsDataURL(blob!); 
                } 
              } 
            }} 
            className="w-full bg-black/40 border border-white/5 rounded-lg p-3 text-[11px] font-bold text-white uppercase outline-none focus:border-blue-500/50 resize-none min-h-[60px]" 
            placeholder="Document logic flow..." 
          />
        </div>

        {data.image && (
          <div className="space-y-2">
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Visual Reference</p>
            <div className="relative group/img rounded-lg border border-white/10 overflow-hidden bg-black/60 aspect-video flex items-center justify-center">
              <img src={data.image} className="max-w-full max-h-full object-contain cursor-zoom-in" onClick={() => setShowFullImage(true)}/>
              <button onClick={() => data.onChange(data.id, { image: null })} className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-lg text-rose-500 opacity-0 group-hover/img:opacity-100 hover:bg-rose-500 hover:text-white transition-all">
                <X size={12}/>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
          <div className="space-y-1">
            <p className="text-[7px] font-black text-blue-500 uppercase tracking-widest">State Input</p>
            <input value={data.input || ''} onChange={e => data.onChange(data.id, { input: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-md px-2 py-1.5 text-[9px] font-bold text-slate-300 outline-none focus:border-blue-500/30" placeholder="NULL"/>
          </div>
          <div className="space-y-1">
            <p className="text-[7px] font-black text-emerald-500 uppercase tracking-widest text-right">Result Output</p>
            <input value={data.output || ''} onChange={e => data.onChange(data.id, { output: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-md px-2 py-1.5 text-[9px] font-bold text-emerald-400 outline-none focus:border-emerald-500/30 text-right" placeholder="ACK"/>
          </div>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-900 !border-white/20"/><Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-slate-900 !border-white/20"/><Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-slate-900 !border-white/20"/><Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-slate-900 !border-white/20"/>
      
      <AnimatePresence>
        {showFullImage && (
          <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-10 cursor-zoom-out" onClick={() => setShowFullImage(false)}>
            <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} src={data.image} className="max-w-full max-h-full object-contain shadow-2xl"/>
            <button className="absolute top-10 right-10 p-4 text-white hover:text-blue-400 transition-colors"><X size={32}/></button>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
const LogicLinkEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data, selected }: any) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 16 });
  return (<><BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: selected ? '#ffffff' : '#334155', strokeWidth: 2 }} /><EdgeLabelRenderer><div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }} className="nodrag nopan"><input value={data?.label || ''} onChange={e => data.onLabelChange(id, e.target.value)} className={`bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-[7px] font-black text-white uppercase outline-none focus:border-blue-500 shadow-xl ${selected ? 'scale-110 border-white' : ''}`} placeholder="Label..." /></div></EdgeLabelRenderer></>)
}

const LogicCoreExplorer = ({ node, onClose, onSave, edges, assets, logicalServices }: any) => {
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const [logicManifest, setLogicManifest] = useState<any>(node?.data?.logic_json || {});
  const [internalNodes, setInternalNodes] = useState<Node[]>([]);
  const [internalEdges, setInternalEdges] = useState<Edge[]>([]);
  const neighbors = useMemo(() => { if (!node || !edges) return { upstream: [], downstream: [] }; const upstream = edges.filter((e: any) => e.target === node.id).map((e: any) => ({ id: e.id, label: e.data?.label || 'Flow', source: e.source, protocol: e.data?.protocol || 'TCP' })); const downstream = edges.filter((e: any) => e.source === node.id).map((e: any) => ({ id: e.id, label: e.data?.label || 'Flow', target: e.target, protocol: e.data?.protocol || 'TCP' })); return { upstream, downstream }; }, [node, edges]);
  const nodeServices = useMemo(() => (node?.data?.logical_services || []), [node]);
  
  const laneWidth = 450;
  const laneBaseX = 400;

  useEffect(() => { 
    if (activeEdgeId) { 
      const flowData = logicManifest[activeEdgeId] || { nodes: [], edges: [], lanes: [] }; 
      const hydratedNodes = (flowData.nodes || []).map((n: any) => ({
        ...n,
        data: {
          ...n.data,
          onChange: (id: string, updates: any) => setInternalNodes(nds => nds.map(node => node.id === id ? { ...node, data: { ...node.data, ...updates } } : node)),
          onDelete: (id: string) => { setInternalNodes(nds => nds.filter(node => node.id !== id)); setInternalEdges(eds => eds.filter(edge => edge.source !== id && edge.target !== id)); }
        }
      }));
      const hydratedEdges = (flowData.edges || []).map((e: any) => ({
        ...e,
        data: {
          ...e.data,
          onLabelChange: (id: string, label: string) => setInternalEdges(eds => eds.map(edge => edge.id === id ? { ...edge, data: { ...edge.data, label } } : edge))
        }
      }));
      setInternalNodes(hydratedNodes); 
      setInternalEdges(hydratedEdges); 
    } else { 
      setInternalNodes([]); 
      setInternalEdges([]); 
    } 
  }, [activeEdgeId, logicManifest]);

  const onNodeDrag = useCallback((_: any, node: Node) => {
    const xRelative = node.position.x - laneBaseX;
    const currentLaneIdx = node.data.laneIdx || 0;
    
    // Calculate potential new lane
    const potentialLaneIdx = Math.max(0, Math.floor((xRelative + (laneWidth / 2)) / laneWidth));
    
    // Magnetic effect: Requires more effort to switch lanes
    let targetLaneIdx = currentLaneIdx;
    if (potentialLaneIdx !== currentLaneIdx) {
      const threshold = laneWidth * 0.25; // 25% margin to prevent accidental jumps
      const laneCenter = (potentialLaneIdx * laneWidth) + (laneWidth / 2);
      const distFromCenter = Math.abs(xRelative + (280 / 2) - laneCenter);
      
      if (distFromCenter < threshold) {
        targetLaneIdx = potentialLaneIdx;
      }
    }

    const snappedX = laneBaseX + (targetLaneIdx * laneWidth) + (laneWidth - 280) / 2;
    setInternalNodes(nds => nds.map(n => n.id === node.id ? { ...n, position: { x: snappedX, y: node.position.y }, data: { ...n.data, laneIdx: targetLaneIdx } } : n));
  }, [laneBaseX, laneWidth]);

  const onConnect = useCallback((params: Connection) => { const newEdge = { ...params, id: `l-edge-${Date.now()}`, type: 'logicLink', data: { label: '', onLabelChange: (id: string, label: string) => { setInternalEdges(eds => eds.map(e => e.id === id ? { ...e, data: { ...e.data, label } } : e)); } } }; setInternalEdges((eds) => addEdge(newEdge, eds)); }, []);
  
  const addBlock = (type: string, laneIdx: number) => { 
    const x = laneBaseX + (laneIdx * laneWidth) + (laneWidth - 280) / 2; 
    const y = 150 + (internalNodes.filter(n => n.data.laneIdx === laneIdx).length * 200); 
    const newNode = { 
      id: `block-${Date.now()}`, 
      type: 'logicBlock', 
      position: { x, y }, 
      data: { 
        label: '', 
        type, 
        laneIdx,
        input: '', 
        output: '', 
        onChange: (id: string, updates: any) => setInternalNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)), 
        onDelete: (id: string) => { setInternalNodes(nds => nds.filter(n => n.id !== id)); setInternalEdges(eds => eds.filter(e => e.source !== id && e.target !== id)); } 
      } 
    }; 
    setInternalNodes(nds => [...nds, newNode]); 
  };
  const handleSaveWorkflow = () => { if (!activeEdgeId) return; setLogicManifest(prev => ({ ...prev, [activeEdgeId]: { nodes: internalNodes, edges: internalEdges, lanes: prev[activeEdgeId]?.lanes || [] } })); toast.success("Buffer Updated"); };
  const explorerNodeTypes = useMemo(() => ({ logicBlock: LogicBlockNode }), []);
  const explorerEdgeTypes = useMemo(() => ({ logicLink: LogicLinkEdge }), []);
  
  const activeLanes = logicManifest[activeEdgeId]?.lanes || [];

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-0 z-[200] bg-[var(--bg-primary)] flex overflow-hidden">
      <div className="w-[340px] border-r border-white/5 bg-black/60 backdrop-blur-3xl flex flex-col z-30 shadow-2xl">
        <div className="p-8 border-b border-white/5 space-y-4"><div className="flex items-center gap-3"><div className="p-2.5 bg-blue-600 rounded-lg text-white"><Cpu size={20}/></div><div><h3 className="text-sm font-black text-white uppercase tracking-tighter italic">Logic Core 3.0</h3></div></div></div>
        <div className="flex-1 overflow-y-auto p-6 space-y-12 custom-scrollbar">
           <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
               <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic">Incoming Flows</span>
               <span className="text-[8px] font-bold text-slate-700 uppercase">Input Signals</span>
             </div>
             {neighbors.upstream.map(edge => (<button key={edge.id} onClick={() => { handleSaveWorkflow(); setActiveEdgeId(edge.id); }} className={`w-full p-5 rounded-2xl border transition-all text-left space-y-2 group ${activeEdgeId === edge.id ? 'bg-blue-600 border-blue-400 shadow-xl shadow-blue-500/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}><p className={`text-[12px] font-black uppercase tracking-tight ${activeEdgeId === edge.id ? 'text-white' : 'text-slate-300'}`}>{edge.source}</p><div className="flex items-center gap-2"><div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${activeEdgeId === edge.id ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-400'}`}>{edge.protocol}</div><p className={`text-[9px] font-bold uppercase tracking-widest ${activeEdgeId === edge.id ? 'text-blue-100/60' : 'text-slate-500'}`}>{edge.label}</p></div></button>))}
           </div>
           <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
               <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest italic">Outgoing Flows</span>
               <span className="text-[8px] font-bold text-slate-700 uppercase">Egress Actions</span>
             </div>
             {neighbors.downstream.map(edge => (<button key={edge.id} onClick={() => { handleSaveWorkflow(); setActiveEdgeId(edge.id); }} className={`w-full p-5 rounded-2xl border transition-all text-left space-y-2 group ${activeEdgeId === edge.id ? 'bg-rose-600 border-rose-400 shadow-xl shadow-rose-500/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}><p className={`text-[12px] font-black uppercase tracking-tight ${activeEdgeId === edge.id ? 'text-white' : 'text-slate-300'}`}>{edge.target}</p><div className="flex items-center gap-2"><div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${activeEdgeId === edge.id ? 'bg-white/20 text-white' : 'bg-rose-500/10 text-rose-400'}`}>{edge.protocol}</div><p className={`text-[9px] font-bold uppercase tracking-widest ${activeEdgeId === edge.id ? 'text-rose-100/60' : 'text-slate-500'}`}>{edge.label}</p></div></button>))}
           </div>
        </div>
        <div className="p-8 border-t border-white/5 bg-black/40 space-y-3"><button onClick={onClose} className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">Abort Changes</button><button onClick={() => { onSave(node.id, { ...node.data, logic_json: logicManifest }); onClose(); }} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-2xl shadow-blue-500/20 active:scale-95 transition-all">Synchronize Manifest</button></div>
      </div>
      <div className="flex-1 flex flex-col bg-[#05070a] relative">
        {activeEdgeId ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-[120px] bg-black/80 backdrop-blur-3xl border-b border-white/5 flex items-center relative z-20 shadow-2xl overflow-x-auto custom-scrollbar no-scrollbar">
               <div className="min-w-[400px] h-full border-r border-white/10 bg-blue-600/5 flex flex-col items-center justify-center space-y-2 shrink-0">
                 <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] italic">External Boundary</p>
                 <span className="text-xl font-black text-white uppercase tracking-tighter">{neighbors.upstream.find(e => e.id === activeEdgeId)?.source || neighbors.downstream.find(e => e.id === activeEdgeId)?.target || 'Undefined'}</span>
               </div>
               <div className="flex h-full divide-x divide-white/5">
                 {activeLanes.map((lane: string, idx: number) => (
                   <div key={idx} className="w-[450px] flex flex-col items-center justify-center bg-white/[0.01] group relative shrink-0">
                     <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1 italic">Service Lane</p>
                     <span className="text-sm font-black text-white uppercase tracking-tight">{lane}</span>
                     <div className="absolute bottom-3 flex gap-2">
                        <button onClick={() => addBlock('PROCESS', idx + 1)} className="px-3 py-1 bg-blue-600/10 hover:bg-blue-600/30 text-blue-400 text-[8px] font-black uppercase rounded-md border border-blue-500/20 transition-all flex items-center gap-1.5"><Plus size={10}/> Entity</button>
                        <button onClick={() => addBlock('CONDITION', idx + 1)} className="px-3 py-1 bg-amber-600/10 hover:bg-amber-600/30 text-amber-400 text-[8px] font-black uppercase rounded-md border border-amber-500/20 transition-all flex items-center gap-1.5"><Plus size={10}/> Logic</button>
                     </div>
                     <button onClick={() => { const next = activeLanes.filter((l: string) => l !== lane); setLogicManifest((prev: any) => ({ ...prev, [activeEdgeId]: { ...prev[activeEdgeId], lanes: next } })); }} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-500 transition-all"><X size={16}/></button>
                   </div>
                 ))}
                 <div className="w-[200px] h-full flex flex-col items-center justify-center bg-black/40 border-l border-white/5 group shrink-0">
                   <select 
                     onChange={e => { 
                       if (!e.target.value) return; 
                       if (activeLanes.includes(e.target.value)) return; 
                       setLogicManifest((prev: any) => ({ ...prev, [activeEdgeId]: { ...prev[activeEdgeId], lanes: [...activeLanes, e.target.value] } })); 
                       e.target.value = ''; 
                     }} 
                     className="bg-transparent border-none text-[9px] font-black text-slate-500 uppercase tracking-widest outline-none cursor-pointer group-hover:text-blue-400 transition-colors"
                   >
                     <option value="">+ Add Service Lane</option>
                     {nodeServices.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                   </select>
                 </div>
               </div>
            </div>
            <div className="flex-1 relative overflow-hidden">
              <ReactFlow 
                nodes={internalNodes} 
                edges={internalEdges} 
                onNodesChange={(c) => setInternalNodes(nds => applyNodeChanges(c, nds))} 
                onEdgesChange={(c) => setInternalEdges(eds => applyEdgeChanges(c, eds))} 
                onConnect={onConnect} 
                onNodeDrag={onNodeDrag}
                nodeTypes={explorerNodeTypes} 
                edgeTypes={explorerEdgeTypes} 
                snapToGrid 
                snapGrid={[20, 20]} 
                fitView 
                className="bg-[#05070a]"
              >
                <div className="absolute inset-0 flex pointer-events-none overflow-hidden">
                  <div className="w-[400px] h-full border-r border-dashed border-white/10 bg-white/[0.01]" />
                  {activeLanes.map((_: any, i: number) => (
                    <div key={i} className="w-[450px] h-full border-r border-dashed border-white/10 flex flex-col">
                       <div className="flex-1 bg-white/[0.005]" />
                    </div>
                  ))}
                </div>
                <Background color="#1e293b" gap={20} size={1}/>
                <Panel position="top-right" className="m-4">
                  <div className="glass-panel px-4 py-2 rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl flex items-center gap-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Manifest: <span className="text-white italic">{activeEdgeId}</span></p>
                  </div>
                </Panel>
              </ReactFlow>
            </div>
          </div>
        ) : (<div className="flex-1 flex flex-col items-center justify-center space-y-10 bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:40px_40px]"><div className="p-20 rounded-full bg-slate-900/40 border border-white/5 shadow-[0_0_100px_rgba(37,99,235,0.1)] relative"><Workflow size={100} className="text-slate-800" /><div className="absolute inset-0 border-4 border-blue-500/20 rounded-full animate-ping" /></div><div className="text-center space-y-4"><h4 className="text-3xl font-black text-white italic uppercase tracking-[0.3em]">Logic Core <span className="text-blue-600">Standby</span></h4><p className="text-[12px] font-bold text-slate-500 uppercase tracking-[0.5em] leading-relaxed">Select a high-speed data flow to initialize documentation matrix</p></div></div>)}
      </div>
    </motion.div>
  );
};

const ConfigModal = ({ flow, isOpen, onClose, onSave }: any) => {
  const [formData, setFormData] = useState({ name: flow?.name || '', description: flow?.description || '', category: flow?.category || 'System', status: flow?.status || 'Up to date' });
  useEffect(() => { if (flow) setFormData({ name: flow.name || '', description: flow.description || '', category: flow.category || 'System', status: flow.status || 'Up to date' }); }, [flow]);
  if (!isOpen) return null;
  return (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"><motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-xl p-8 rounded-2xl border border-white/10 bg-[#0a0c14]/90"><div className="flex items-center justify-between border-b border-white/5 pb-6"><div className="flex items-center space-x-4"><div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30"><Settings size={22} /></div><div><h2 className="text-xl font-black uppercase text-white tracking-tighter leading-none">Manifest Settings</h2></div></div><button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white"><X size={20}/></button></div><div className="mt-8 space-y-6"><div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Workflow Identity</label><input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3.5 text-xs font-bold text-white uppercase outline-none focus:border-blue-500/50" /></div><div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Strategic Purpose</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3.5 text-xs font-bold text-slate-300 uppercase outline-none focus:border-blue-500/50 h-28 resize-none" /></div><div className="grid grid-cols-2 gap-6"><div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Category</label><select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3.5 text-xs font-bold text-white uppercase outline-none focus:border-blue-500/50">{ARCH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Status</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3.5 text-xs font-bold text-white uppercase outline-none focus:border-blue-500/50">{ARCH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div></div></div><div className="mt-8 flex gap-4"><button onClick={onClose} className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancel</button><button onClick={() => { onSave(formData); onClose(); }} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Apply Settings</button></div></motion.div></div>);
};

const ArchDashboard = ({ flows, onEdit, onAdd }: any) => {
  const [searchTerm, setSearchTerm] = useState(''); const [statusFilter, setStatusFilter] = useState('All');
  const filtered = useMemo(() => (flows || []).filter((f: any) => { const match = f.name.toLowerCase().includes(searchTerm.toLowerCase()); const matchStatus = statusFilter === 'All' || f.status === statusFilter; return match && matchStatus; }), [flows, searchTerm, statusFilter]);
  return (<div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-black/20"><div className="max-w-7xl mx-auto space-y-8"><div className="flex items-end justify-between"><div className="space-y-1"><div className="flex items-center space-x-3"><div className="p-2 bg-blue-600 rounded-lg shadow-xl text-white"><Workflow size={24}/></div><h1 className="text-3xl font-bold text-white uppercase tracking-tighter leading-none">Architecture Matrix</h1></div><p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] pl-1 mt-2">Core Registry & Governance</p></div><button onClick={onAdd} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center space-x-3 transition-all shadow-xl active:scale-95"><Plus size={20}/><span className="text-sm font-bold uppercase tracking-widest">New Manifest</span></button></div><div className="glass-panel rounded-lg border border-white/5 overflow-hidden shadow-2xl bg-[#0a0c14]/40 backdrop-blur-3xl"><div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6"><div className="relative flex-1 max-w-xl"><Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600"/><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search manifests..." className="w-full bg-black/40 border border-white/10 rounded-lg pl-14 pr-6 py-3.5 text-xs font-bold text-white uppercase outline-none focus:border-blue-500/50 shadow-inner"/></div><div className="flex bg-black/60 p-1 rounded-lg border border-white/5">{['All', ...ARCH_STATUSES].map(s => (<button key={s} onClick={() => setStatusFilter(s)} className={`px-5 py-2 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{s}</button>))}</div></div><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-white/5 bg-white/[0.02]"><th className="px-8 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Identify</th><th className="px-8 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th><th className="px-8 py-4 text-right"></th></tr></thead><tbody className="divide-y divide-white/5">{filtered.map((f: any) => (<tr key={f.id} className="group hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => onEdit(f)}><td className="px-8 py-6"><div className="flex items-center space-x-5"><div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform"><Layout size={18}/></div><div className="flex flex-col"><span className="text-base font-bold text-white tracking-tight uppercase mb-0.5">{f.name}</span><span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[400px]">{f.description || 'No description'}</span></div></div></td><td className="px-8 py-6"><div className="flex justify-center"><StatusPill value={f.status}/></div></td><td className="px-8 py-6 text-right"><button className="p-3 bg-blue-600/10 text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all"><ArrowRight size={18}/></button></td></tr>))}</tbody></table></div></div></div></div>);
};

const MissionControl = ({ selectedNode, selectedEdge, impactedNodes, onBack, onUpdateNode, onUpdateEdge, onAddServiceToNode, availableServices, onDeleteNode, onDeleteEdge, setIsLogicExplorerOpen }: any) => {
   const [edgeForm, setEdgeForm] = useState<any>(selectedEdge?.data || {}); const [nodeForm, setNodeForm] = useState<any>(selectedNode?.data || {});
   useEffect(() => { if (selectedEdge) setEdgeForm(selectedEdge.data || {}); }, [selectedEdge]); useEffect(() => { if (selectedNode) setNodeForm(selectedNode.data || {}); }, [selectedNode]);
   const handleEdgeChange = (f: string, v: any) => { const updated = { ...edgeForm, [f]: v }; setEdgeForm(updated); onUpdateEdge(selectedEdge.id, updated); };
   const handleNodeChange = (f: string, v: any) => { const updated = { ...nodeForm, [f]: v }; setNodeForm(updated); onUpdateNode(selectedNode.id, updated); };
   return (<div className="w-[420px] glass-panel h-full border-l border-white/5 flex flex-col p-8 space-y-10 bg-[#0a0c14]/90 backdrop-blur-3xl z-50 overflow-y-auto custom-scrollbar shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"><div className="flex items-center justify-between border-b border-white/5 pb-4"><h2 className="text-xl font-bold uppercase text-white tracking-tight flex items-center gap-3"><Zap size={22} className="text-blue-500"/> Configuration</h2><button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white"><X size={20}/></button></div>{selectedNode ? (<div className="space-y-8"><div className="p-6 bg-blue-600/5 rounded-lg border border-blue-600/20 space-y-4 relative overflow-hidden group"><p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Primary Node Details</p>{['condition', 'note'].includes(selectedNode.type) ? (<div className="space-y-2 relative z-10"><input value={nodeForm.label || ''} onChange={e => handleNodeChange('label', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500"/></div>) : (<><h3 className="text-2xl font-bold text-white uppercase tracking-tighter leading-none relative z-10">{selectedNode.data.name}</h3><div className="flex items-center space-x-3 relative z-10"><StatusPill value={selectedNode.data.status} /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedNode.data.ip_address}</span></div></>)}</div>{selectedNode.type === 'device' && (<div className="space-y-4"><div className="flex items-center justify-between px-1"><h4 className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest flex items-center gap-2"><Database size={14}/> Node Service Registry</h4><span className="text-[8px] font-bold text-slate-600 uppercase">Available: {selectedNode.data.all_available_services?.length || 0}</span></div><div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">{selectedNode.data.all_available_services?.filter((s: any) => !selectedNode.data.logical_services?.find((ls: any) => ls.id === s.id)).map((s: any) => (<button key={s.id} onClick={() => onAddServiceToNode(selectedNode.id, s)} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg hover:border-emerald-500/30 hover:bg-emerald-500/5 group transition-all"><div className="flex flex-col text-left truncate"><span className="text-[10px] font-bold text-slate-300 uppercase truncate">{s.name}</span></div><Plus size={14} className="text-slate-600 group-hover:text-emerald-500" /></button>))}</div></div>)}<div className="pt-6 space-y-3"><button onClick={() => setIsLogicExplorerOpen(true)} className="w-full py-4 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-500/20 rounded-lg font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg"><Cpu size={16}/> Logic Core Explorer</button><button onClick={() => onDeleteNode(selectedNode.id)} className="w-full py-3 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3"><Trash2 size={16}/> Remove Entity</button></div></div>) : selectedEdge ? (<div className="space-y-8"><div className="p-6 bg-blue-600/5 rounded-lg border border-blue-600/20 space-y-4"><p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Flow Specification</p><div className="space-y-2"><label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Flow Label</label><input value={edgeForm.label || ''} onChange={e => handleEdgeChange('label', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500" /></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Protocol</label><select value={edgeForm.protocol || ''} onChange={e => handleEdgeChange('protocol', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500 appearance-none"><option value="">Select...</option>{PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}</select></div><div className="space-y-2"><label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Flow Step</label><select value={edgeForm.step || 1} onChange={e => handleEdgeChange('step', parseInt(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500 appearance-none">{[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(s => <option key={s} value={s}>Step {s}</option>)}</select></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Src Port</label><input value={edgeForm.source_port || ''} onChange={e => handleEdgeChange('source_port', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500 text-center" /></div><div className="space-y-2"><label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">Dst Port</label><input value={edgeForm.target_port || ''} onChange={e => handleEdgeChange('target_port', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500 text-center" /></div></div><div className="pt-6"><button onClick={() => onDeleteEdge(selectedEdge.id)} className="w-full py-3 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3"><Trash2 size={16}/> Remove Connection</button></div></div>) : (<div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-6 pb-20"><div className="p-6 rounded-full bg-slate-800/50 border border-slate-700 shadow-inner"><Target size={60} /></div><p className="text-sm font-bold uppercase tracking-[0.3em] leading-relaxed">Select Architecture Element</p></div>)}</div>);
}

function ArchDesignerInner() {
  const { fitView, zoomTo, zoomIn, zoomOut } = useReactFlow();
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [nodes, setNodes, onNodesChange] = useNodesState([]); const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeFlow, setActiveFlow] = useState<any>(null); const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null); const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); const [isConfigSidebarOpen, setIsConfigSidebarOpen] = useState(true); const [isConfigModalOpen, setIsConfigModalOpen] = useState(false); const [isLogicExplorerOpen, setIsLogicExplorerOpen] = useState(false);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null); const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false); const [dependencyRiskEnabled, setDependencyRiskEnabled] = useState(false);
  const [inventorySearch, setInventorySearch] = useState(''); const [inventoryType, setInventoryType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL'); const [selectedSystem, setSelectedSystem] = useState<string | 'All'>('All');
  const queryClient = useQueryClient();
  const { data: savedFlows } = useQuery({ queryKey: ['data-flows'], queryFn: async () => (await (await apiFetch('/api/v1/data-flows/')).json()) });
  const { data: assets } = useQuery({ queryKey: ['devices'], queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) });
  const { data: logicalServices } = useQuery({ queryKey: ['logical-services'], queryFn: async () => (await (await apiFetch('/api/v1/logical-services/')).json()) });
  const transactions = useMemo(() => activeFlow?.traces || [], [activeFlow]);
  const activeTransaction = useMemo(() => transactions.find((t: any) => t.id === activeTransactionId), [transactions, activeTransactionId]);
  const systems = useMemo(() => { if (!assets) return []; const s = new Set<string>(); assets.forEach((a: any) => { if (a.system) s.add(a.system); }); return Array.from(s).sort(); }, [assets]);
  const filteredAssets = useMemo(() => (assets || []).filter((a: any) => { const matchSearch = (a.hostname || a.name || '').toLowerCase().includes(inventorySearch.toLowerCase()) || (a.ip_address || '').includes(inventorySearch); const matchSystem = selectedSystem === 'All' || a.system === selectedSystem; return matchSearch && matchSystem && !a.is_deleted; }), [assets, inventorySearch, selectedSystem]);
  const filteredExternal = useMemo(() => (assets || []).filter(e => e.name?.toLowerCase().includes(inventorySearch.toLowerCase())), [assets, inventorySearch]);
  const saveMutation = useMutation({
    mutationFn: async (data: any) => { const isUpdate = !!data.id; const url = isUpdate ? `/api/v1/data-flows/${data.id}` : '/api/v1/data-flows'; const response = await apiFetch(url, { method: isUpdate ? 'PUT' : 'POST', body: JSON.stringify(data) }); return response.json(); },
    onSuccess: (savedFlow) => { setActiveFlow(savedFlow); setHasUnsavedChanges(false); queryClient.invalidateQueries({ queryKey: ['data-flows'] }); toast.success("Manifest Persistent in Core Registry"); },
    onError: () => toast.error("Failure Syncing Manifest to Core")
  });
  const updateNodeData = (nodeId: string, updatedData: any) => { setNodes((nds) => nds.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, ...updatedData } } : node)); setHasUnsavedChanges(true); };
  const updateEdgeData = (edgeId: string, updatedData: any) => { setEdges((eds) => eds.map((edge) => edge.id === edgeId ? { ...edge, data: { ...edge.data, ...updatedData } } : edge)); setHasUnsavedChanges(true); };
  const addServiceToNode = (nodeId: string, service: any) => { setNodes((nds) => nds.map((node) => { if (node.id === nodeId) { const currentServices = node.data.logical_services || []; if (currentServices.find((s: any) => s.id === service.id)) return node; return { ...node, data: { ...node.data, logical_services: [...currentServices, service] } }; } return node; })); setHasUnsavedChanges(true); };
  const deleteNode = (nodeId: string) => { setNodes((nds) => nds.filter((node) => node.id !== nodeId)); setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)); setSelectedNodeId(null); setHasUnsavedChanges(true); };
  const deleteEdge = (edgeId: string) => { setEdges((eds) => eds.filter((edge) => edge.id !== edgeId)); setSelectedEdgeId(null); setHasUnsavedChanges(true); };
  const handleSave = () => { if (!activeFlow) return; saveMutation.mutate({ ...activeFlow, nodes, edges, viewport: {} }); };
  const impactAnalysis = useMemo(() => { if (!selectedNodeId) return { nodeIds: new Set<string>(), edgeIds: new Set<string>() }; const nodeIds = new Set<string>([selectedNodeId]); const edgeIds = new Set<string>(); const queue = [selectedNodeId]; while (queue.length > 0) { const currentId = queue.shift()!; edges.forEach(edge => { if (edge.source === currentId && !nodeIds.has(edge.target)) { nodeIds.add(edge.target); edgeIds.add(edge.id); queue.push(edge.target); } else if (edge.source === currentId) { edgeIds.add(edge.id); } }); } return { nodeIds, edgeIds }; }, [selectedNodeId, edges]);
  const impactedNodes = impactAnalysis.nodeIds;
  const displayNodes = useMemo(() => nodes.map(n => ({ ...n, data: { ...n.data, isImpacted: impactAnalysis.nodeIds.has(n.id), dependencyRiskEnabled, activeTransactionId, transactionVisits: activeTransaction?.steps?.map((s: any, idx: number) => s.node_id === n.id ? idx + 1 : null).filter((v: any) => v !== null) || [] } })), [nodes, impactAnalysis, dependencyRiskEnabled, activeTransaction]);
  const displayEdges = useMemo(() => edges.map(e => ({ ...e, data: { ...e.data, isImpacted: impactAnalysis.edgeIds.has(e.id) && dependencyRiskEnabled, isTraceActive: activeTransaction?.steps?.some((s: any) => s.edge_id === e.id), traceStep: activeTransaction?.steps?.findIndex((s: any) => s.edge_id === e.id) + 1 || null } })), [edges, impactAnalysis, dependencyRiskEnabled, activeTransaction]);
  const onConnect = useCallback((params: Connection) => { setEdges((eds) => addEdge({ ...params, id: `edge-${Date.now()}`, type: 'labeled', data: { type: 'DATA', label: 'NEW_FLOW', protocol: 'HTTPS', step: eds.length + 1 }, animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } }, eds)); setHasUnsavedChanges(true); toast.success("Connection Established"); }, [setEdges]);
  const handleAutoLayout = () => { const dagreGraph = new dagre.graphlib.Graph(); dagreGraph.setDefaultEdgeLabel(() => ({})); dagreGraph.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 150, marginx: 50, marginy: 50 }); nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 320, height: 220 })); edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target)); dagre.layout(dagreGraph); setNodes(nodes.map((node) => { const pos = dagreGraph.node(node.id); return { ...node, position: { x: pos.x - 160, y: pos.y - 110 } }; })); setHasUnsavedChanges(true); setTimeout(() => fitView({ duration: 800 }), 100); toast.success("Layout Optimized"); };
  const handleEdit = (flow: any) => { setActiveFlow(flow); setNodes(flow.nodes || []); setEdges(flow.edges || []); setView('editor'); setHasUnsavedChanges(false); setTimeout(() => fitView(), 200); };
  const handleNewManifest = () => { setActiveFlow({ name: 'NEW_MANIFEST', category: 'System', status: 'Planned' }); setNodes([]); setEdges([]); setView('editor'); setHasUnsavedChanges(false); setIsConfigModalOpen(true); };
  if (view === 'dashboard') return <ArchDashboard flows={savedFlows} onEdit={handleEdit} onAdd={handleNewManifest} />
  return (
    <div className="flex-1 relative flex h-full overflow-hidden bg-[#020617]">
       <AnimatePresence>{isSidebarOpen && (
         <motion.div initial={{ x: -400 }} animate={{ x: 0 }} exit={{ x: -400 }} className="w-[360px] border-r border-white/5 bg-[#0a0c14]/95 backdrop-blur-3xl flex flex-col z-50 shadow-3xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between"><h2 className="text-lg font-bold uppercase text-white tracking-tighter flex items-center gap-3"><Box size={20} className="text-blue-500"/> Inventory</h2><div className="flex items-center gap-1"><button onClick={() => { setInventorySearch(''); setSelectedSystem('All'); }} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white"><RefreshCw size={16}/></button><button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white"><X size={18}/></button></div></div>
            <div className="p-5 border-b border-white/5 space-y-4"><div className="flex bg-black/60 p-1 rounded-lg border border-white/5"><button onClick={() => setInventoryType('INTERNAL')} className={`flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${inventoryType === 'INTERNAL' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Internal</button><button onClick={() => setInventoryType('EXTERNAL')} className={`flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${inventoryType === 'EXTERNAL' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>External</button></div><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" /><input value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} placeholder="Search..." className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-[10px] font-bold text-white uppercase outline-none focus:border-blue-500/50" /></div>{inventoryType === 'INTERNAL' && (<select value={selectedSystem} onChange={e => setSelectedSystem(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-[10px] font-bold text-white uppercase outline-none focus:border-blue-500">{<option value="All">All Systems</option>}{systems.map(s => <option key={s} value={s}>{s}</option>)}</select>)}</div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">{inventoryType === 'INTERNAL' ? (<section className="space-y-3"><div className="flex items-center justify-between px-1"><h3 className="text-[9px] font-bold uppercase text-blue-400 tracking-widest">Assets</h3><span className="text-[8px] font-black text-slate-600 uppercase bg-white/5 px-2 py-0.5 rounded-full">{filteredAssets.length}</span></div><div className="grid grid-cols-1 gap-1.5">{filteredAssets.slice(0, 50).map((a: any) => (<button key={a.id} onClick={() => { 
              const nodeId = `device-${a.id}`;
              const exists = nodes.find(n => n.id === nodeId);
              if (exists) {
                toast.error(`${a.name || a.hostname} already in manifest`);
                setNodes(nds => nds.map(n => ({ ...n, selected: n.id === nodeId })));
                setTimeout(() => fitView({ nodes: [exists], duration: 800 }), 100);
                return;
              }
              setNodes(nds => [...nds, { id: nodeId, type: 'device', position: { x: 400, y: 100 }, data: { ...a, name: a.name || a.hostname, logical_services: [], all_available_services: a.logical_services || [] } }]); 
              setHasUnsavedChanges(true); 
            }} className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-blue-600/10 border border-white/5 rounded-lg group transition-all"><div className="flex flex-col text-left truncate"><span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase truncate">{a.hostname || a.name}</span></div><Plus size={14} className="text-slate-600 group-hover:text-blue-500 ml-2" /></button>))}</div></section>) : null}</div>
            <div className="p-6 border-t border-white/5 bg-black/20"><button onClick={handleSave} disabled={saveMutation.isPending || !hasUnsavedChanges} className={`w-full py-4 rounded-lg flex items-center justify-center space-x-3 shadow-xl transition-all font-black uppercase text-xs tracking-widest ${hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}>{saveMutation.isPending ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}<span>Commit Changes</span></button></div>
         </motion.div>
       )}</AnimatePresence>
       <div className="flex-1 relative h-full">
          <ReactFlow nodes={displayNodes} edges={displayEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(null); setIsConfigSidebarOpen(true); }} onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(null); setIsConfigSidebarOpen(true); }} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView snapToGrid snapGrid={[20, 20]} connectionMode={ConnectionMode.Loose}>
            <Background color="#1e293b" gap={20} size={1} className="opacity-40" />
            <Panel position="top-left" className="p-4"><div className="glass-panel p-2 rounded-lg border border-white/10 flex items-center space-x-4 bg-slate-900/60 backdrop-blur-2xl shadow-2xl"><div className="flex flex-col min-w-[180px] px-3"><span className="text-xs font-black uppercase text-white tracking-widest truncate">{activeFlow?.name}</span></div><div className="h-8 w-px bg-white/10" /><div className="flex items-center gap-2 px-2"><select value={activeTransactionId || ''} onChange={e => setActiveTransactionId(e.target.value || null)} className="bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-[9px] font-black uppercase text-white tracking-widest outline-none appearance-none min-w-[140px]"><option value="">Static View</option>{transactions.map((t: any) => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div><div className="h-8 w-px bg-white/10" /><div className="flex items-center space-x-1 p-1"><button onClick={() => setIsConfigModalOpen(true)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-all hover:text-white"><Settings size={18}/></button><button onClick={handleAutoLayout} className="p-2.5 bg-white/5 hover:bg-emerald-500/10 rounded-lg text-slate-400 hover:text-emerald-400 transition-all"><GitMerge size={18} className="rotate-90"/></button><button onClick={() => setDependencyRiskEnabled(!dependencyRiskEnabled)} className={`p-2.5 rounded-lg transition-all flex items-center gap-2 ${dependencyRiskEnabled ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400'}`}><AlertTriangle size={18}/></button><button onClick={() => setView('dashboard')} className="px-4 py-2.5 bg-white/5 hover:bg-rose-600/10 rounded-lg text-slate-400 hover:text-rose-500 transition-all flex items-center gap-2"><ChevronLeft size={16}/><span>Back</span></button></div></div></Panel>
          </ReactFlow>
       </div>
       <AnimatePresence>{isConfigSidebarOpen && (<motion.div initial={{ x: 500 }} animate={{ x: 0 }} exit={{ x: 500 }} className="h-full z-50 shadow-3xl"><MissionControl selectedNode={nodes.find(n => n.id === selectedNodeId)} selectedEdge={edges.find(e => e.id === selectedEdgeId)} impactedNodes={impactedNodes} onBack={() => setIsConfigSidebarOpen(false)} onUpdateNode={updateNodeData} onUpdateEdge={updateEdgeData} onAddServiceToNode={addServiceToNode} onDeleteNode={deleteNode} onDeleteEdge={deleteEdge} availableServices={logicalServices} setIsLogicExplorerOpen={setIsLogicExplorerOpen}/></motion.div>)}</AnimatePresence>
       <ConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} flow={activeFlow} onSave={(data: any) => { setActiveFlow({ ...activeFlow, ...data }); setHasUnsavedChanges(true); }} />
       <AnimatePresence>{isLogicExplorerOpen && (<LogicCoreExplorer node={nodes.find(n => n.id === selectedNodeId)} edges={edges} onClose={() => setIsLogicExplorerOpen(false)} onSave={(nodeId: string, updatedData: any) => updateNodeData(nodeId, updatedData)} assets={assets} logicalServices={logicalServices} />)}</AnimatePresence>
       <ConfirmationModal isOpen={isConfirmExitOpen} title="Unsaved Changes" message="Exit and lose modifications?" onConfirm={() => { setView('dashboard'); setHasUnsavedChanges(false); setIsConfirmExitOpen(false); }} onClose={() => setIsConfirmExitOpen(false)} />
    </div>
  )
}
export default function DataFlowDesigner() { return (<ReactFlowProvider><ArchDesignerInner /></ReactFlowProvider>); }
