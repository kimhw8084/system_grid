import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import ReactFlow, { 
  addEdge, Background, Controls, Panel, useNodesState, useEdgesState, Handle, Position, MarkerType, 
  Connection, ReactFlowProvider, useReactFlow, BaseEdge, EdgeLabelRenderer, getSmoothStepPath, 
  getBezierPath, MiniMap, Node, Edge, applyNodeChanges, applyEdgeChanges, reconnectEdge, 
  ConnectionMode, NodeChange, EdgeChange
} from 'reactflow'
import 'reactflow/dist/style.css'
import { AgGridReact } from 'ag-grid-react'
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

// Suppress ResizeObserver loop errors which are common in ReactFlow/ForceGraph during layout shifts
if (typeof window !== 'undefined') {
  const resizeObserverErr = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (typeof message === 'string' && message.includes('ResizeObserver loop completed')) {
      return true;
    }
    if (resizeObserverErr) {
      return resizeObserverErr(message, source, lineno, colno, error);
    }
    return false;
  };
}

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
         <div className="flex items-center space-x-3"><div className={`p-2 rounded-lg ${isImpacted ? 'bg-rose-500 text-white' : 'bg-blue-600/20 text-blue-400'} border border-current/20 shadow-inner`}>{data.type === 'Switch' ? <Network size={16}/> : <Server size={16}/>}</div><div className="min-w-0"><p className="text-[12px] italic font-black uppercase text-white tracking-tight leading-none truncate max-w-[180px]">{data.name}</p><p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{data.ip_address}</p></div></div>
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

const ServiceNode = ({ data, selected }: any) => (<div className={`glass-panel px-4 py-3 rounded-lg border-2 transition-all duration-300 flex items-center space-x-3 w-full shadow-xl ${selected ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-slate-900/60'}`}><div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/20"><Database size={16}/></div><div className="flex-1 min-w-0"><p className="text-[11px] italic font-black uppercase text-emerald-400 truncate tracking-tight">{data.name}</p></div><Handle type="target" position={Position.Left} className="w-2 h-2 bg-emerald-500 border-none !left-[-4px]" /><Handle type="source" position={Position.Right} className="w-2 h-2 bg-emerald-500 border-none !right-[-4px]" /></div>)
const ExternalNode = ({ data, selected }: any) => (<div className={`glass-panel min-w-[260px] rounded-lg border-2 transition-all duration-300 p-6 border-dashed shadow-2xl ${selected ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/20 bg-slate-900/40'}`}><div className="flex items-center space-x-4"><div className="p-3 bg-indigo-500/20 rounded-lg text-indigo-400"><Globe size={20}/></div><div className="min-w-0"><p className="text-[12px] italic font-black uppercase text-indigo-400 truncate tracking-tight">{data.name}</p></div></div><Handle type="target" position={Position.Left} className="w-2 h-2 bg-indigo-500 border-none !left-[-4px]" /><Handle type="source" position={Position.Right} className="w-2 h-2 bg-indigo-500 border-none !right-[-4px]" /></div>)
const ConditionNode = ({ data, selected }: any) => (<div className={`w-20 h-20 rotate-45 border-2 flex items-center justify-center transition-all ${selected ? 'border-amber-500 bg-amber-500/20' : 'border-amber-500/40 bg-slate-900/60'}`}><div className="-rotate-45 flex flex-col items-center"><Diamond size={16} className="text-amber-500 mb-1"/><span className="text-[8px] italic font-black uppercase text-white">{data.label || 'IF'}</span></div><Handle type="target" position={Position.Left} className="w-2 h-2 bg-amber-500 border-none !left-[-1px]" /><Handle type="source" position={Position.Right} className="w-2 h-2 bg-amber-500 border-none !right-[-1px]" /></div>)
const NoteNode = ({ data, selected }: any) => (<div className={`glass-panel p-4 min-w-[200px] rounded-lg border-2 transition-all duration-300 ${selected ? 'border-blue-400 bg-blue-400/10' : 'border-white/10 bg-slate-900/60'}`}><div className="flex items-center gap-2 text-blue-400 mb-2"><StickyNote size={12}/><span className="text-[8px] italic font-black uppercase tracking-widest">Note</span></div><p className="text-[10px] text-slate-300 font-bold">{data.label}</p></div>)

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
      <EdgeLabelRenderer><div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all', zIndex: 1002 }} className="nodrag nopan"><motion.div whileHover={{ scale: 1.05 }} className={`px-2 py-1 rounded border transition-all flex items-center space-x-2 ${selected ? 'bg-slate-900 border-white' : 'bg-slate-950/90 border-white/10'} ${isTraceActive ? 'border-amber-500 ring-1 ring-amber-500/20' : ''}`}><div className={`w-1 h-1 rounded-full ${isTraceActive ? 'bg-amber-500' : ''}`} style={{ backgroundColor: data?.color || currentType.color }}/><span className={`text-[8px] italic font-black uppercase tracking-widest ${isTraceActive ? 'text-amber-400' : 'text-white'}`}>{data?.label || currentType.label}</span></motion.div></div></EdgeLabelRenderer>
    </>
  );
};

const nodeTypes = { device: DeviceNode, external: ExternalNode, service: ServiceNode, condition: ConditionNode, note: NoteNode };
const edgeTypes = { labeled: LabeledEdge };

// --- Vertical Swimlane Flow Engine (Dynamic Participant Lanes) ---

const ParticipantLaneHeader = ({ lane, onRemove, isPrimary }: any) => (
  <div className="h-full border-r-4 border-dashed border-white/5 flex flex-col p-10 relative bg-white/[0.01]" style={{ width: 450 }}>
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="p-3.5 rounded-2xl text-white shadow-2xl" style={{ backgroundColor: lane.color }}>
          {lane.type === 'service' ? <Database size={20}/> : <Server size={20}/>}
        </div>
        {!isPrimary && (
          <button onClick={() => onRemove(lane.id)} className="p-2 hover:bg-rose-500/10 text-slate-600 hover:text-rose-500 transition-all">
            <X size={18}/>
          </button>
        )}
      </div>
      <div>
        <h4 className="text-2xl italic font-black uppercase tracking-[0.2em] text-white leading-tight break-words">{lane.label}</h4>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">{lane.subLabel}</p>
      </div>
    </div>
  </div>
)

const ProcessNode = ({ id, data, selected }: any) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const laneColor = data.laneColor || '#3b82f6'

  return (
    <div className={`glass-panel min-w-[340px] rounded-[16px] border-2 transition-all duration-300 shadow-2xl overflow-hidden ${selected ? 'ring-8 ring-blue-500/10' : ''}`} style={{ borderColor: `${laneColor}40`, backgroundColor: '#0f172a' }}>
      <div className="flex items-center justify-between px-6 py-4 bg-white/[0.03] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg text-white shadow-xl" style={{ backgroundColor: laneColor }}>
            <Activity size={14}/>
          </div>
          <input 
            value={data.label || ''} 
            onChange={e => data.onChange(id, { label: e.target.value })}
            className="bg-transparent border-none text-[11px] italic font-black uppercase tracking-tight text-white leading-none outline-none w-48"
            placeholder="PROCESS STEP"
          />
        </div>
        {selected && (
          <button 
            onClick={(e) => { 
              e.stopPropagation()
              if (isDeleting) { data.onDelete(id) } else { setIsDeleting(true); setTimeout(() => setIsDeleting(false), 3000) }
            }} 
            className={`p-1.5 rounded-lg transition-all ${isDeleting ? 'bg-rose-600 text-white' : 'hover:bg-rose-500/10 text-rose-500'}`}
          >
            <Trash2 size={14}/>
          </button>
        )}
      </div>
      <div className="p-6 space-y-5">
        <textarea 
          value={data.description || ''} 
          onChange={e => data.onChange(id, { description: e.target.value })} 
          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] font-bold text-slate-300 uppercase outline-none focus:border-blue-500/50 resize-none min-h-[90px] transition-all" 
          placeholder="TECHNICAL EXECUTION..." 
        />
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
          <div className="space-y-1">
            <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Payload Input</label>
            <input value={data.input || ''} onChange={e => data.onChange(id, { input: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[9px] font-black text-blue-400 outline-none focus:border-blue-500/40" placeholder="INPUT"/>
          </div>
          <div className="space-y-1">
            <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1 text-right block mr-1">Response Output</label>
            <input value={data.output || ''} onChange={e => data.onChange(id, { output: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[9px] font-black text-emerald-400 outline-none focus:border-emerald-500/40 text-right" placeholder="OUTPUT"/>
          </div>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-blue-600 !border-slate-950" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-blue-600 !border-slate-950" />
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-slate-700 !border-slate-950" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-slate-700 !border-slate-950" />
    </div>
  )
}

const DiamondNode = ({ id, data, selected }: any) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const laneColor = data.laneColor || '#f59e0b'

  return (
    <div className="relative group p-10">
      <div className={`w-32 h-32 rotate-45 border-2 flex items-center justify-center transition-all duration-300 shadow-2xl relative z-10 ${selected ? 'ring-8 ring-amber-500/10' : ''}`} style={{ borderColor: `${laneColor}80`, backgroundColor: '#0f172a' }}>
        <div className="-rotate-45 flex flex-col items-center px-4 text-center">
          <input 
            value={data.label || ''} 
            onChange={e => data.onChange(id, { label: e.target.value })} 
            className="bg-transparent border-none text-[10px] italic font-black uppercase text-white text-center outline-none w-24 placeholder:text-slate-700"
            placeholder="CONDITION"
          />
        </div>
        <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-amber-500 !border-slate-950 !-rotate-45" style={{ top: -6, left: '50%' }} />
        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-amber-500 !border-slate-950 !-rotate-45" style={{ bottom: -6, left: '50%' }} />
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-amber-500 !border-slate-950 !-rotate-45" style={{ left: -6, top: '50%' }} />
        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-amber-500 !border-slate-950 !-rotate-45" style={{ right: -6, top: '50%' }} />
      </div>
      {selected && (
        <button 
          onClick={(e) => { 
            e.stopPropagation()
            if (isDeleting) { data.onDelete(id) } else { setIsDeleting(true); setTimeout(() => setIsDeleting(false), 3000) }
          }} 
          className={`absolute top-0 right-0 p-2 rounded-xl transition-all z-20 ${isDeleting ? 'bg-rose-600 text-white' : 'bg-slate-900/80 hover:bg-rose-500/20 text-rose-500'}`}
        >
          <Trash2 size={14}/>
        </button>
      )}
    </div>
  )
}

const LogicLinkEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data, selected }: any) => {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: selected ? '#3b82f6' : '#334155', strokeWidth: selected ? 4 : 2 }} />
      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }} className="nodrag nopan">
          <input 
            value={data?.label || ''} 
            onChange={e => data.onLabelChange(id, e.target.value)} 
            className={`bg-[#0f172a] border border-white/10 rounded-lg px-3 py-1 text-[9px] italic font-black text-white uppercase outline-none focus:border-blue-500 shadow-2xl transition-all ${selected ? 'scale-110 border-blue-500 bg-blue-600/10' : ''}`} 
            placeholder="VECTOR" 
          />
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const ServiceLevelFlowInner = ({ edge, sourceNode, targetNode, onClose, onSave }: any) => {
  const { fitView } = useReactFlow()
  const logicManifest = useMemo(() => edge?.data?.logic_json || {}, [edge])
  const [internalNodes, setInternalNodes] = useNodesState([])
  const [internalEdges, setInternalEdges] = useEdgesState([])
  const [lanes, setLanes] = useState<any[]>([])

  // Initialize Lanes from logicManifest or default to Source/Target
  useEffect(() => {
    if (logicManifest.lanes && logicManifest.lanes.length > 0) {
      setLanes(logicManifest.lanes)
    } else {
      const initialLanes = [
        { id: 'source-primary', label: sourceNode.data.name, subLabel: 'SOURCE ASSET', color: '#6366f1', type: 'asset', x: 0 },
        { id: 'target-primary', label: targetNode.data.name, subLabel: 'DESTINATION ASSET', color: '#f43f5e', type: 'asset', x: 450 },
      ]
      setLanes(initialLanes)
    }
  }, [logicManifest, sourceNode, targetNode])

  // Initialize Nodes/Edges
  useEffect(() => {
    const flowData = logicManifest.flow || { nodes: [], edges: [] }
    setInternalNodes((flowData.nodes || []).map((n: any) => ({
      ...n,
      data: {
        ...n.data,
        onChange: (id: string, updates: any) => setInternalNodes(nds => nds.map(node => node.id === id ? { ...node, data: { ...node.data, ...updates } } : node)),
        onDelete: (id: string) => { 
          setInternalNodes(nds => nds.filter(node => node.id !== id))
          setInternalEdges(eds => eds.filter(edge => edge.source !== id && edge.target !== id))
        }
      }
    })))
    setInternalEdges((flowData.edges || []).map((e: any) => ({
      ...e,
      data: {
        ...e.data,
        onLabelChange: (id: string, label: string) => setInternalEdges(eds => eds.map(edge => edge.id === id ? { ...edge, data: { ...edge.data, label } } : edge))
      }
    })))
  }, [logicManifest])

  const onNodeDrag = useCallback((_: any, draggedNode: Node) => {
    const lane = lanes.find(l => l.id === draggedNode.data.laneId)
    if (!lane) return
    const centerX = (lanes.indexOf(lane) * 450) + 225 - (draggedNode.type === 'logicProcess' ? 170 : 64)
    setInternalNodes(nds => nds.map(n => n.id === draggedNode.id ? { ...n, position: { x: centerX, y: n.position.y } } : n))
  }, [lanes])

  const onConnect = useCallback((params: Connection) => { 
    const newEdge = { 
      ...params, 
      id: `v-edge-${Date.now()}`, 
      type: 'logicLink', 
      data: { 
        label: '', 
        onLabelChange: (id: string, label: string) => setInternalEdges(eds => eds.map(e => e.id === id ? { ...e, data: { ...e.data, label } } : e))
      } 
    } 
    setInternalEdges((eds) => addEdge(newEdge, eds)) 
  }, [])

  const addNode = (laneId: string, type: 'process' | 'diamond') => {
    const laneIdx = lanes.findIndex(l => l.id === laneId)
    const lane = lanes[laneIdx]
    const centerX = (laneIdx * 450) + 225 - (type === 'process' ? 170 : 64)
    const laneNodes = internalNodes.filter(n => n.data.laneId === laneId)
    const maxY = laneNodes.length > 0 ? Math.max(...laneNodes.map(n => n.position.y)) : 100
    const y = maxY + (laneNodes.length > 0 ? 250 : 0)

    const newNode = { 
      id: `v-step-${Date.now()}`, 
      type: type === 'process' ? 'logicProcess' : 'logicDiamond', 
      position: { x: centerX, y }, 
      data: { 
        label: type === 'process' ? 'NEW PROCESS' : 'CONDITION?', 
        laneId,
        laneColor: lane.color,
        description: '',
        input: '', 
        output: '', 
        onChange: (id: string, updates: any) => setInternalNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)), 
        onDelete: (id: string) => { 
          setInternalNodes(nds => nds.filter(n => n.id !== id))
          setInternalEdges(eds => eds.filter(e => e.source !== id && e.target !== id))
        } 
      } 
    } 
    setInternalNodes(nds => [...nds, newNode]) 
  }

  const addLane = (service: any) => {
    const newLane = {
      id: `lane-${service.id}`,
      label: service.name,
      subLabel: `INTERNAL SERVICE (${service.device_id === sourceNode.data.id ? 'SOURCE' : 'TARGET'})`,
      color: service.device_id === sourceNode.data.id ? '#10b981' : '#f59e0b',
      type: 'service',
      serviceId: service.id
    }
    if (lanes.some(l => l.id === newLane.id)) return
    setLanes([...lanes, newLane])
  }

  const removeLane = (laneId: string) => {
    setLanes(lanes.filter(l => l.id !== laneId))
    setInternalNodes(internalNodes.filter(n => n.data.laneId !== laneId))
    setInternalEdges(internalEdges.filter(e => {
      const sourceNode = internalNodes.find(n => n.id === e.source)
      const targetNode = internalNodes.find(n => n.id === e.target)
      return sourceNode?.data?.laneId !== laneId && targetNode?.data?.laneId !== laneId
    }))
  }

  const handleSaveFlow = () => {
    const manifest = {
      lanes,
      flow: { nodes: internalNodes, edges: internalEdges }
    }
    onSave(edge.id, { ...edge.data, logic_json: manifest })
    toast.success("Workflow Manifest Synchronized")
  }

  const explorerNodeTypes = useMemo(() => ({ logicProcess: ProcessNode, logicDiamond: DiamondNode }), [])
  const explorerEdgeTypes = useMemo(() => ({ logicLink: LogicLinkEdge }), [])

  const availableServices = useMemo(() => {
    const sourceServices = sourceNode.data.all_available_services || []
    const targetServices = targetNode.data.all_available_services || []
    return [...sourceServices, ...targetServices].filter(s => !lanes.some(l => l.serviceId === s.id))
  }, [sourceNode, targetNode, lanes])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-[#020617] flex overflow-hidden">
      <div className="w-[420px] border-r border-white/10 bg-[#0f172a] flex flex-col z-30 shadow-2xl">
        <div className="p-10 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-5">
            <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/30"><Workflow size={24}/></div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight italic">Service Logic</h3>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Participant Orchestrator</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <span className="text-[11px] italic font-black text-blue-500 uppercase tracking-widest">Available Participants</span>
              <span className="text-[8px] font-bold text-slate-600 uppercase">Registry Count: {availableServices.length}</span>
            </div>
            <div className="space-y-3">
              {availableServices.map((svc: any) => (
                <button 
                  key={svc.id} 
                  onClick={() => addLane(svc)} 
                  className="w-full p-6 rounded-3xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-base italic font-black uppercase tracking-tight text-slate-300 group-hover:text-white transition-colors">{svc.name}</p>
                    <Plus size={18} className="text-slate-600 group-hover:text-blue-500"/>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${svc.device_id === sourceNode.data.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {svc.device_id === sourceNode.data.id ? 'SOURCE' : 'TARGET'}
                    </span>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{svc.service_type || 'Generic Service'}</p>
                  </div>
                </button>
              ))}
              {availableServices.length === 0 && (
                <div className="p-10 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                  <Layers size={32} className="text-slate-700"/>
                  <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">All services mapped to lanes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-white/10 bg-black/40 space-y-4">
          <button onClick={handleSaveFlow} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-black uppercase tracking-widest rounded-xl shadow-xl transition-all active:scale-95">Commit Participant Map</button>
          <button onClick={onClose} className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-400 text-[12px] font-black uppercase tracking-widest rounded-xl transition-all">Close Orchestrator</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#020617] relative">
        <div className="flex-1 relative overflow-hidden bg-[#020617]">
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
            fitViewOptions={{ padding: 100 }}
          >
            <div className="absolute inset-0 flex pointer-events-none">
              {lanes.map((lane, idx) => (
                <div key={lane.id} className="relative h-full flex flex-col" style={{ width: 450 }}>
                   <ParticipantLaneHeader 
                    lane={lane} 
                    isPrimary={lane.id === 'source-primary' || lane.id === 'target-primary'} 
                    onRemove={removeLane}
                   />
                   <div className="mt-auto flex flex-col gap-3 pointer-events-auto p-10 pb-16">
                      <button onClick={() => addNode(lane.id, 'process')} className="px-6 py-4 bg-white/5 hover:bg-blue-600/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-400 transition-all flex items-center justify-center gap-3">
                         <Plus size={16}/> <span>Add Logic</span>
                      </button>
                      <button onClick={() => addNode(lane.id, 'diamond')} className="px-6 py-4 bg-white/5 hover:bg-amber-600/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-400 transition-all flex items-center justify-center gap-3">
                         <Diamond size={16}/> <span>Add Condition</span>
                      </button>
                   </div>
                </div>
              ))}
            </div>
            <Background color="#1e293b" gap={40} size={1} className="opacity-20"/>
            <Controls className="bg-slate-900 border-2 border-white/10 rounded-xl overflow-hidden p-1 shadow-2xl" />
          </ReactFlow>
        </div>
      </div>
    </motion.div>
  )
}

const ServiceLevelFlow = (props: any) => (
  <ReactFlowProvider>
    <ServiceLevelFlowInner {...props} />
  </ReactFlowProvider>
)


const ConfigModal = ({ flow, isOpen, onClose, onSave, isNew }: any) => {
  const [formData, setFormData] = useState({ name: flow?.name || '', description: flow?.description || '', category: flow?.category || 'System', status: flow?.status || 'Up to date' });
  useEffect(() => { if (flow) setFormData({ name: flow.name || '', description: flow.description || '', category: flow.category || 'System', status: flow.status || 'Up to date' }); }, [flow]);
  if (!isOpen) return null;
  const handleSave = () => {
    if (!formData.name || !formData.description || !formData.category || !formData.status) {
      toast.error("All fields are required");
      return;
    }
    onSave(formData);
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-xl p-8 rounded-2xl border border-white/10 bg-[#0f172a]/95">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Settings size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase text-white tracking-tighter leading-none">{isNew ? 'New Architecture' : 'Manifest Settings'}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white">
            <X size={20}/>
          </button>
        </div>
        <div className="mt-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Workflow Name (Required)</label>
            <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3.5 text-xs font-bold text-white uppercase outline-none focus:border-blue-500/50" placeholder="e.g. CORE-PAYMENT-INGRESS" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Strategic Purpose (Required)</label>
            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3.5 text-xs font-bold text-slate-300 uppercase outline-none focus:border-blue-500/50 h-28 resize-none" placeholder="Describe the business and technical purpose..." />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Category (Required)</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3.5 text-xs font-bold text-white uppercase outline-none focus:border-blue-500/50 appearance-none">
                {ARCH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Status (Required)</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3.5 text-xs font-bold text-white uppercase outline-none focus:border-blue-500/50 appearance-none">
                {ARCH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="pt-6 border-t border-white/5 flex gap-4">
             <button onClick={onClose} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 font-black uppercase text-[11px] tracking-widest rounded-xl transition-all">Cancel</button>
             <button onClick={handleSave} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[11px] tracking-widest rounded-xl transition-all shadow-2xl shadow-blue-500/20">{isNew ? 'Create Architecture' : 'Save Changes'}</button>
          </div>
        </div>
      </motion.div>
    </div>
  )
};

const ArchDashboard = ({ flows, onEdit, onAdd }: any) => {
  const [searchTerm, setSearchTerm] = useState(''); 
  const [statusFilter, setStatusFilter] = useState('All');
  const filtered = useMemo(() => (flows || []).filter((f: any) => { 
    const match = (f.name || '').toLowerCase().includes(searchTerm.toLowerCase()); 
    const matchStatus = statusFilter === 'All' || f.status === statusFilter; 
    return match && matchStatus; 
  }), [flows, searchTerm, statusFilter]);

  const columnDefs = useMemo(() => [
    { field: "id", headerName: "ID", width: 80, cellClass: 'text-center font-bold text-slate-500', headerClass: 'text-center' },
    { field: "name", headerName: "Architecture Identifier", flex: 1.5, cellClass: 'font-bold uppercase text-blue-400', filter: true },
    { field: "category", headerName: "Domain", width: 140, cellClass: 'text-center font-bold uppercase text-slate-400', headerClass: 'text-center' },
    { 
      field: "status", 
      headerName: "Governance State", 
      width: 160,
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center h-full">
          <div className={`px-3 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${
            p.value === 'Up to date' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 
            p.value === 'Deprecated' ? 'bg-rose-500/10 border-rose-500/40 text-rose-400' : 
            'bg-blue-500/10 border-blue-500/40 text-blue-400'
          }`}>{p.value}</div>
        </div>
      )
    },
    { 
      headerName: "Operations", 
      width: 140,
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center h-full">
          <button onClick={() => onEdit(p.data)} className="flex items-center space-x-2 px-4 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg border border-blue-500/20 transition-all text-[10px] font-black uppercase">
            <Edit3 size={12}/> <span>Initialize</span>
          </button>
        </div>
      )
    }
  ], [onEdit]);

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-black/20">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg shadow-xl text-white"><Workflow size={24}/></div>
              <h1 className="text-3xl font-bold text-white uppercase tracking-tighter leading-none">Architecture Matrix</h1>
            </div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] pl-1 mt-2">Core Registry & Governance</p>
          </div>
          <button onClick={onAdd} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center space-x-3 transition-all shadow-xl active:scale-95">
            <Plus size={20}/><span className="text-sm font-bold uppercase tracking-widest">New Architecture</span>
          </button>
        </div>
        <div className="glass-panel rounded-lg border border-white/5 overflow-hidden shadow-2xl bg-[#0f172a]/40 backdrop-blur-3xl flex flex-col h-[600px]">
          <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative flex-1 max-w-xl">
              <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600"/>
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search architectures..." className="w-full bg-black/40 border border-white/10 rounded-lg pl-14 pr-6 py-3.5 text-xs font-bold text-white uppercase outline-none focus:border-blue-500/50 shadow-inner"/>
            </div>
            <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
              {['All', ...ARCH_STATUSES].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-5 py-2 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 ag-theme-alpine-dark">
            <AgGridReact
              rowData={filtered}
              columnDefs={columnDefs}
              animateRows={true}
              headerHeight={48}
              rowHeight={56}
              enableCellTextSelection={true}
            />
          </div>
        </div>
      </div>
      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(255, 255, 255, 0.02);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-header-foreground-color: #3b82f6;
          --ag-foreground-color: #f1f5f9;
          --ag-font-family: 'Inter', sans-serif;
        }
        .ag-header-cell-label { font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; }
        .ag-cell { font-weight: 700 !important; }
        .ag-row-hover { background-color: rgba(255, 255, 255, 0.05) !important; }
      `}</style>
    </div>
  );
};

const MissionControl = ({ selectedNode, selectedEdge, impactedNodes, onBack, onUpdateNode, onUpdateEdge, onAddServiceToNode, availableServices, onDeleteNode, onDeleteEdge, setIsServiceFlowOpen }: any) => {
   const [edgeForm, setEdgeForm] = useState<any>(selectedEdge?.data || {}); const [nodeForm, setNodeForm] = useState<any>(selectedNode?.data || {});
   useEffect(() => { if (selectedEdge) setEdgeForm(selectedEdge.data || {}); }, [selectedEdge]); useEffect(() => { if (selectedNode) setNodeForm(selectedNode.data || {}); }, [selectedNode]);
   const handleEdgeChange = (f: string, v: any) => { const updated = { ...edgeForm, [f]: v }; setEdgeForm(updated); onUpdateEdge(selectedEdge.id, updated); };
   const handleNodeChange = (f: string, v: any) => { const updated = { ...nodeForm, [f]: v }; setNodeForm(updated); onUpdateNode(selectedNode.id, updated); };
   return (
     <div className="w-[420px] glass-panel h-full border-l border-white/5 flex flex-col p-8 space-y-10 bg-[#0f172a]/95 backdrop-blur-3xl z-50 overflow-y-auto custom-scrollbar shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
       <div className="flex items-center justify-between border-b border-white/5 pb-4">
         <h2 className="text-xl italic font-black uppercase text-white tracking-tight flex items-center gap-3"><Zap size={22} className="text-blue-500"/> Configuration</h2>
         <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white"><X size={20}/></button>
       </div>
       {selectedNode ? (
         <div className="space-y-8">
           <div className="p-6 bg-blue-600/5 rounded-lg border border-blue-600/20 space-y-4 relative overflow-hidden group">
             <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Primary Node Details</p>
             {['condition', 'note'].includes(selectedNode.type) ? (
               <div className="space-y-2 relative z-10"><input value={nodeForm.label || ''} onChange={e => handleNodeChange('label', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500"/></div>
             ) : (
               <><h3 className="text-2xl font-bold text-white uppercase tracking-tighter leading-none relative z-10">{selectedNode.data.name}</h3><div className="flex items-center space-x-3 relative z-10"><StatusPill value={selectedNode.data.status} /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedNode.data.ip_address}</span></div></>
             )}
           </div>
           {selectedNode.type === 'device' && (
             <div className="space-y-4">
               <div className="flex items-center justify-between px-1"><h4 className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest flex items-center gap-2"><Database size={14}/> Node Service Registry</h4><span className="text-[8px] font-bold text-slate-600 uppercase">Available: {selectedNode.data.all_available_services?.length || 0}</span></div>
               <div className="grid grid-cols-2 gap-2">
                 {(selectedNode.data.all_available_services || []).map((s: any) => {
                   const isAdded = selectedNode.data.logical_services?.some((ls: any) => ls.id === s.id);
                   return (
                     <button 
                       key={s.id} 
                       disabled={isAdded}
                       onClick={() => onAddServiceToNode(selectedNode.id, s)} 
                       className={`p-3 border rounded-lg text-[10px] font-bold transition-all text-left uppercase truncate ${isAdded ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 cursor-default' : 'bg-black/40 hover:bg-emerald-500/10 border-white/5 text-slate-400 hover:text-emerald-400'}`}
                     >
                       <div className="flex flex-col">
                         <span>{s.name}</span>
                         {isAdded && <span className="text-[7px] font-black uppercase italic mt-1">Already Added</span>}
                       </div>
                     </button>
                   );
                 })}
               </div>
             </div>
           )}
           <div className="space-y-4">
             <button onClick={() => onDeleteNode(selectedNode.id)} className="w-full py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-black uppercase text-[10px] tracking-widest rounded-lg transition-all border border-rose-500/20 flex items-center justify-center gap-2"><Trash2 size={14}/> Decommission Node</button>
           </div>
         </div>
       ) : selectedEdge ? (
         <div className="space-y-8">
           <div className="p-6 bg-blue-600/5 rounded-lg border border-blue-600/20 space-y-4">
             <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Flow Vector Dynamics</p>
             <div className="space-y-4">
               <div className="space-y-2"><label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Flow Identifier</label><input value={edgeForm.label || ''} onChange={e => handleEdgeChange('label', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500"/></div>
               <div className="space-y-2"><label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Protocol / Schema</label><select value={edgeForm.protocol || 'HTTPS'} onChange={e => handleEdgeChange('protocol', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500 appearance-none">{PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
               <div className="space-y-2"><label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Flow Classification</label><div className="grid grid-cols-2 gap-2">{FLOW_TYPES.map(t => <button key={t.id} onClick={() => handleEdgeChange('type', t.id)} className={`p-2 rounded-lg border text-[9px] font-black uppercase transition-all ${edgeForm.type === t.id ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'}`}>{t.label}</button>)}</div></div>
             </div>
           </div>
           <div className="space-y-4">
             <button onClick={() => setIsServiceFlowOpen(true)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[11px] tracking-widest rounded-xl transition-all shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-3"><Workflow size={16}/> Service Logic Builder</button>
             <button onClick={() => onDeleteEdge(selectedEdge.id)} className="w-full py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-black uppercase text-[10px] tracking-widest rounded-lg transition-all border border-rose-500/20 flex items-center justify-center gap-2"><Trash2 size={14}/> Sever Connection</button>
           </div>
         </div>
       ) : (<div className="flex-1 flex flex-col items-center justify-center space-y-6 opacity-30"><Layers size={60} className="text-slate-600"/><p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] text-center px-10">Select a manifest entity to initialize control interface</p></div>)}
     </div>
   )
}

function ArchDesignerInner() {
  const { fitView, zoomTo, zoomIn, zoomOut } = useReactFlow();
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [nodes, setNodes, onNodesChange] = useNodesState([]); const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeFlow, setActiveFlow] = useState<any>(null); const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null); const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); const [isConfigSidebarOpen, setIsConfigSidebarOpen] = useState(true); const [isConfigModalOpen, setIsConfigModalOpen] = useState(false); const [isServiceFlowOpen, setIsServiceFlowOpen] = useState(false);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null); const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false); const [confirmExitIntent, setConfirmExitIntent] = useState<'dashboard' | null>(null); const [dependencyRiskEnabled, setDependencyRiskEnabled] = useState(false);
  const [inventorySearch, setInventorySearch] = useState(''); const [inventoryType, setInventoryType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL'); const [selectedSystem, setSelectedSystem] = useState<string | 'All'>('All');
  const queryClient = useQueryClient();
  const { data: savedFlows } = useQuery({ queryKey: ['data-flows'], queryFn: async () => (await (await apiFetch('/api/v1/data-flows/')).json()) });
  const { data: assets } = useQuery({ queryKey: ['devices'], queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) });
  const { data: externalEntities } = useQuery({ queryKey: ['external-entities', { include_deleted: false }], queryFn: async () => (await (await apiFetch('/api/v1/intelligence/entities')).json()) });
  const { data: logicalServices } = useQuery({ queryKey: ['logical-services'], queryFn: async () => (await (await apiFetch('/api/v1/logical-services/')).json()) });
  const transactions = useMemo(() => activeFlow?.traces || [], [activeFlow]);
  const activeTransaction = useMemo(() => transactions.find((t: any) => t.id === activeTransactionId), [transactions, activeTransactionId]);
  const systems = useMemo(() => { if (!assets) return []; const s = new Set<string>(); assets.forEach((a: any) => { if (a.system) s.add(a.system); }); return Array.from(s).sort(); }, [assets]);
  const filteredAssets = useMemo(() => (assets || []).filter((a: any) => { const matchSearch = (a.hostname || a.name || '').toLowerCase().includes(inventorySearch.toLowerCase()) || (a.ip_address || '').includes(inventorySearch); const matchSystem = selectedSystem === 'All' || a.system === selectedSystem; return matchSearch && matchSystem && !a.is_deleted; }), [assets, inventorySearch, selectedSystem]);
  const filteredExternal = useMemo(() => (externalEntities || []).filter((e: any) => e.name?.toLowerCase().includes(inventorySearch.toLowerCase())), [externalEntities, inventorySearch]);
  const saveMutation = useMutation({
    mutationFn: async (data: any) => { const isUpdate = !!data.id; const url = isUpdate ? `/api/v1/data-flows/${data.id}` : '/api/v1/data-flows'; const response = await apiFetch(url, { method: isUpdate ? 'PUT' : 'POST', body: JSON.stringify(data) }); return response.json(); },
    onSuccess: (savedFlow) => { setActiveFlow(savedFlow); setHasUnsavedChanges(false); queryClient.invalidateQueries({ queryKey: ['data-flows'] }); toast.success("Manifest Persistent in Core Registry"); if (view === 'dashboard') setView('editor'); },
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
  const onConnect = useCallback((params: Connection) => { setEdges((eds) => addEdge({ ...params, id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, type: 'labeled', data: { type: 'DATA', label: 'NEW_FLOW', protocol: 'HTTPS', step: eds.length + 1, logic_json: { lanes: [], flow: { nodes: [], edges: [] } } }, animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } }, eds)); setHasUnsavedChanges(true); toast.success("Connection Established"); }, [setEdges]);
  const handleAutoLayout = () => { const dagreGraph = new dagre.graphlib.Graph(); dagreGraph.setDefaultEdgeLabel(() => ({})); dagreGraph.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 150, marginx: 50, marginy: 50 }); nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 320, height: 220 })); edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target)); dagre.layout(dagreGraph); setNodes(nodes.map((node) => { const pos = dagreGraph.node(node.id); return { ...node, position: { x: pos.x - 160, y: pos.y - 110 } }; })); setHasUnsavedChanges(true); setTimeout(() => fitView({ duration: 800, padding: 40 }), 100); toast.success("Layout Optimized"); };
  const handleEdit = (flow: any) => { setActiveFlow(flow); setNodes(flow.nodes || []); setEdges(flow.edges || []); setView('editor'); setHasUnsavedChanges(false); setTimeout(() => fitView({ padding: 40 }), 200); };
  const handleNewArchitecture = () => { setActiveFlow({ name: '', description: '', category: 'System', status: 'Planned' }); setNodes([]); setEdges([]); setView('dashboard'); setIsConfigModalOpen(true); };

  return (
    <div className="flex-1 relative flex h-full overflow-hidden bg-[#020617]">
       {view === 'dashboard' ? (
         <ArchDashboard flows={savedFlows} onEdit={handleEdit} onAdd={handleNewArchitecture} />
       ) : (
         <>
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-1.5 py-8 rounded-r-xl border border-l-0 border-blue-500/30 transition-all group flex flex-col items-center gap-4">
                <ChevronRight size={14} className="group-hover:scale-125 transition-transform"/>
                <span className="[writing-mode:vertical-lr] text-[8px] font-black uppercase tracking-[0.3em]">Inventory</span>
              </button>
            )}
            <AnimatePresence>{isSidebarOpen && (
              <motion.div initial={{ x: -400 }} animate={{ x: 0 }} exit={{ x: -400 }} className="w-[360px] border-r border-white/5 bg-[#0f172a]/95 backdrop-blur-3xl flex flex-col z-50 shadow-3xl">
                 <div className="p-6 border-b border-white/5 flex items-center justify-between"><h2 className="text-lg font-bold uppercase text-white tracking-tighter flex items-center gap-3"><Box size={20} className="text-blue-500"/> Inventory</h2><div className="flex items-center gap-1"><button onClick={() => { setInventorySearch(''); setSelectedSystem('All'); }} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white"><RefreshCw size={16}/></button><button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white"><X size={18}/></button></div></div>
                 <div className="p-5 border-b border-white/5 space-y-4"><div className="flex bg-black/40 p-1 rounded-lg border border-white/5"><button onClick={() => setInventoryType('INTERNAL')} className={`flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${inventoryType === 'INTERNAL' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Internal</button><button onClick={() => setInventoryType('EXTERNAL')} className={`flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${inventoryType === 'EXTERNAL' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>External</button></div><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" /><input value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} placeholder="Search..." className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-[10px] font-bold text-white uppercase outline-none focus:border-blue-500/50" /></div>{inventoryType === 'INTERNAL' && (<select value={selectedSystem} onChange={e => setSelectedSystem(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-[10px] font-bold text-white uppercase outline-none focus:border-blue-500">{<option value="All">All Systems</option>}{systems.map(s => <option key={s} value={s}>{s}</option>)}</select>)}</div>
                 <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                   {inventoryType === 'INTERNAL' ? (
                     <section className="space-y-3">
                       <div className="flex items-center justify-between px-1"><h3 className="text-[9px] font-bold uppercase text-blue-400 tracking-widest">Internal Assets</h3><span className="text-[8px] font-black text-slate-600 uppercase bg-white/5 px-2 py-0.5 rounded-full">{filteredAssets.length}</span></div>
                       <div className="grid grid-cols-1 gap-1.5">
                         {filteredAssets.slice(0, 50).map((a: any) => {
                           const isAdded = nodes.some(n => n.id === `device-${a.id}`);
                           const svcCount = a.logical_services?.length || 0;
                           return (
                             <button 
                               key={a.id} 
                               disabled={isAdded}
                               onClick={() => { 
                                 const nodeId = `device-${a.id}`;
                                 setNodes(nds => [...nds, { 
                                   id: nodeId, 
                                   type: 'device', 
                                   position: { x: 400 + (nodes.length * 20), y: 100 + (nodes.length * 20) }, 
                                   data: { ...a, name: a.name || a.hostname, logical_services: [], all_available_services: a.logical_services || [] } 
                                 }]); 
                                 setHasUnsavedChanges(true); 
                               }} 
                               className={`w-full flex items-center justify-between p-3 border rounded-lg group transition-all ${isAdded ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' : 'bg-white/5 hover:bg-blue-600/10 border-white/5'}`}
                             >
                               <div className="flex flex-col text-left truncate">
                                 <span className={`text-[10px] font-bold uppercase truncate ${isAdded ? 'text-emerald-400' : 'text-slate-300 group-hover:text-white'}`}>
                                   {a.hostname || a.name}
                                 </span>
                                 <div className="flex items-center gap-2 mt-1">
                                   <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[7px] font-black uppercase">
                                     {svcCount} {svcCount === 1 ? 'Service' : 'Services'}
                                   </span>
                                   {isAdded && <span className="text-[7px] font-black text-emerald-500 uppercase italic">Added</span>}
                                 </div>
                               </div>
                               {isAdded ? <CheckCircle2 size={14} className="text-emerald-500 ml-2" /> : <Plus size={14} className="text-slate-600 group-hover:text-blue-500 ml-2" />}
                             </button>
                           );
                         })}
                       </div>
                     </section>
                   ) : (
                     <section className="space-y-3">
                       <div className="flex items-center justify-between px-1"><h3 className="text-[9px] font-bold uppercase text-indigo-400 tracking-widest">External Entities</h3><span className="text-[8px] font-black text-slate-600 uppercase bg-white/5 px-2 py-0.5 rounded-full">{filteredExternal.length}</span></div>
                       <div className="grid grid-cols-1 gap-1.5">
                         {filteredExternal.map((e: any) => {
                           const isAdded = nodes.some(n => n.id === `external-${e.id}`);
                           return (
                             <button 
                               key={e.id} 
                               disabled={isAdded}
                               onClick={() => { 
                                 const nodeId = `external-${e.id}`;
                                 setNodes(nds => [...nds, { 
                                   id: nodeId, 
                                   type: 'external', 
                                   position: { x: 400 + (nodes.length * 20), y: 100 + (nodes.length * 20) }, 
                                   data: { ...e, name: e.name } 
                                 }]); 
                                 setHasUnsavedChanges(true); 
                               }} 
                               className={`w-full flex items-center justify-between p-3 border rounded-lg group transition-all ${isAdded ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' : 'bg-white/5 hover:bg-indigo-600/10 border-white/5'}`}
                             >
                               <div className="flex flex-col text-left truncate">
                                 <span className={`text-[10px] font-bold uppercase truncate ${isAdded ? 'text-emerald-400' : 'text-slate-300 group-hover:text-white'}`}>
                                   {e.name}
                                 </span>
                                 {isAdded && <span className="text-[7px] font-black text-emerald-500 uppercase italic mt-1">Added</span>}
                               </div>
                               {isAdded ? <CheckCircle2 size={14} className="text-emerald-500 ml-2" /> : <Plus size={14} className="text-slate-600 group-hover:text-indigo-500 ml-2" />}
                             </button>
                           );
                         })}
                       </div>
                     </section>
                   )}
                 </div>
                 <div className="p-6 border-t border-white/5 bg-black/20"><button onClick={handleSave} disabled={saveMutation.isPending || !hasUnsavedChanges} className={`w-full py-4 rounded-lg flex items-center justify-center space-x-3 shadow-xl transition-all font-black uppercase text-xs tracking-widest ${hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}>{saveMutation.isPending ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}<span>Commit Changes</span></button></div>
              </motion.div>
            )}</AnimatePresence>
            <div className="flex-1 relative h-full">
               <ReactFlow nodes={displayNodes} edges={displayEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(null); setIsConfigSidebarOpen(true); }} onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(null); setIsConfigSidebarOpen(true); }} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView snapToGrid snapGrid={[20, 20]} connectionMode={ConnectionMode.Loose}>
                 <Background color="#1e293b" gap={20} size={1} className="opacity-40" />
                 <Panel position="top-left" className="p-4">
                   <div className="glass-panel p-2 rounded-lg border border-white/10 flex items-center space-x-2 bg-slate-900/60 backdrop-blur-2xl shadow-2xl">
                     <div className="flex flex-col min-w-[180px] px-3">
                       <span className="text-xs font-black uppercase text-white tracking-widest truncate">{activeFlow?.name}</span>
                       <span className="text-[7px] font-bold text-blue-500 uppercase tracking-[0.3em]">{activeFlow?.category}</span>
                     </div>
                     <div className="h-8 w-px bg-white/10" />
                     <div className="flex items-center space-x-1 p-1">
                       <button onClick={() => setIsConfigModalOpen(true)} className="p-2.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg border border-blue-500/20 transition-all flex items-center gap-2">
                         <Info size={16}/>
                         <span className="text-[9px] font-black uppercase">Arch Info</span>
                       </button>
                       <button onClick={handleAutoLayout} className="p-2.5 bg-white/5 hover:bg-emerald-500/10 rounded-lg text-slate-400 hover:text-emerald-400 transition-all" title="Auto Layout"><GitMerge size={18} className="rotate-90"/></button>
                       <button onClick={() => setDependencyRiskEnabled(!dependencyRiskEnabled)} className={`p-2.5 rounded-lg transition-all flex items-center gap-2 ${dependencyRiskEnabled ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400'}`} title="Impact Mode"><AlertTriangle size={18}/></button>
                       <div className="h-6 w-px bg-white/10 mx-1" />
                       <button onClick={() => setConfirmExitIntent('dashboard')} className="p-2.5 bg-white/5 hover:bg-rose-600/10 rounded-lg text-slate-400 hover:text-rose-500 transition-all flex items-center gap-2">
                         <ChevronLeft size={16}/>
                         <span className="text-[9px] font-black uppercase">Back</span>
                       </button>
                     </div>
                   </div>
                 </Panel>
               </ReactFlow>
            </div>
            {!isConfigSidebarOpen && (
              <button onClick={() => setIsConfigSidebarOpen(true)} className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-1.5 py-8 rounded-l-xl border border-r-0 border-blue-500/30 transition-all group flex flex-col items-center gap-4">
                <ChevronLeft size={14} className="group-hover:scale-125 transition-transform"/>
                <span className="[writing-mode:vertical-lr] text-[8px] font-black uppercase tracking-[0.3em] rotate-180">Configuration</span>
              </button>
            )}
            <AnimatePresence>{isConfigSidebarOpen && (<motion.div initial={{ x: 500 }} animate={{ x: 0 }} exit={{ x: 500 }} className="h-full z-50 shadow-3xl"><MissionControl selectedNode={nodes.find(n => n.id === selectedNodeId)} selectedEdge={edges.find(e => e.id === selectedEdgeId)} impactedNodes={impactedNodes} onBack={() => setIsConfigSidebarOpen(false)} onUpdateNode={updateNodeData} onUpdateEdge={updateEdgeData} onAddServiceToNode={addServiceToNode} onDeleteNode={deleteNode} onDeleteEdge={deleteEdge} availableServices={logicalServices} setIsServiceFlowOpen={setIsServiceFlowOpen}/></motion.div>)}</AnimatePresence>
         </>
       )}
       
       <ConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} flow={activeFlow} onSave={(data: any) => { if (!activeFlow?.id) { saveMutation.mutate({ ...data, nodes: [], edges: [] }); } else { setActiveFlow({ ...activeFlow, ...data }); setHasUnsavedChanges(true); } setIsConfigModalOpen(false); }} isNew={!activeFlow?.id} />
       <AnimatePresence>
         {isServiceFlowOpen && selectedEdgeId && (
           <ServiceLevelFlow 
             edge={edges.find(e => e.id === selectedEdgeId)} 
             sourceNode={nodes.find(n => n.id === (edges.find(e => e.id === selectedEdgeId)?.source))}
             targetNode={nodes.find(n => n.id === (edges.find(e => e.id === selectedEdgeId)?.target))}
             onClose={() => setIsServiceFlowOpen(false)} 
             onSave={(edgeId: string, updatedData: any) => updateEdgeData(edgeId, updatedData)} 
           />
         )}
       </AnimatePresence>
       <ConfirmationModal isOpen={isConfirmExitOpen || !!confirmExitIntent} title="Unsaved Changes" message="Exit and lose modifications?" onConfirm={() => { setView('dashboard'); setHasUnsavedChanges(false); setIsConfirmExitOpen(false); setConfirmExitIntent(null); }} onClose={() => { setIsConfirmExitOpen(false); setConfirmExitIntent(null); }} />
    </div>
  )
}
export default function DataFlowDesigner() { return (<ReactFlowProvider><ArchDesignerInner /></ReactFlowProvider>); }
