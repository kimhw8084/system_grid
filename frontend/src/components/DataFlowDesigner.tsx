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
  Edge,
  ReactFlowProvider,
  useReactFlow,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath
} from 'reactflow'
import 'reactflow/dist/style.css'
import { 
  Save, 
  Plus, 
  Trash2, 
  Server, 
  Layers, 
  Workflow,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  RefreshCcw,
  Box,
  Database,
  Globe,
  ArrowRight,
  ArrowLeft,
  Maximize2,
  MoreVertical,
  Activity,
  Shield,
  Layout,
  Type,
  ExternalLink,
  Cpu,
  Unplug,
  Eye,
  Edit3,
  RotateCcw,
  Archive,
  History,
  Info,
  Zap,
  Terminal,
  Network,
  Lock,
  LockOpen,
  Monitor,
  Check,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'

// --- Edge Style Definitions ---

const LINK_PURPOSES = [
  { id: 'PRIMARY', label: 'Primary Traffic', color: '#3b82f6', dash: false, weight: 3 },
  { id: 'CRITICAL', label: 'Critical Path', color: '#ef4444', dash: false, weight: 5 },
  { id: 'MGMT', label: 'Management / Sync', color: '#10b981', dash: [5, 5], weight: 2 },
  { id: 'SECURITY', label: 'Security Tunnel', color: '#8b5cf6', dash: false, weight: 4 },
  { id: 'LEGACY', label: 'Legacy Bridge', color: '#94a3b8', dash: [2, 4], weight: 2 },
]

// --- Custom Edge with Selective Control ---

const LabeledEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
  readOnly
}: any) => {
  const { setEdges } = useReactFlow();
  
  // Hardcoded to Bezier for "Default Curved" requirement
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition
  });

  const currentPurpose = LINK_PURPOSES.find(p => p.id === (data?.purpose || 'PRIMARY')) || LINK_PURPOSES[0];

  const onLabelChange = (val: string) => {
    setEdges((eds) => eds.map((edge) => (edge.id === id ? { ...edge, data: { ...edge.data, label: val } } : edge)));
  };

  const onPurposeChange = (purposeId: string) => {
    setEdges((eds) => eds.map((edge) => (edge.id === id ? { ...edge, data: { ...edge.data, purpose: purposeId } } : edge)));
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          stroke: currentPurpose.color, 
          strokeWidth: currentPurpose.weight + 1,
          strokeDasharray: currentPurpose.dash ? currentPurpose.dash.join(' ') : 'none',
          transition: 'all 0.3s ease',
          filter: `drop-shadow(0 0 5px ${currentPurpose.color}40)`,
          opacity: selected ? 1 : 0.8
        }} 
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex flex-col items-center"
        >
          {/* Seamless Label Pill */}
          <div 
            className={`px-3 py-1 rounded-full border-2 transition-all duration-300 flex items-center space-x-2 ${selected ? 'bg-slate-900 border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-slate-950/95 border-white/20 shadow-lg'}`}
            style={{ borderColor: selected ? '#ffffff' : `${currentPurpose.color}80` }}
          >
             <span className="text-[10px] font-black uppercase text-white tracking-widest leading-none">
                {data?.label || currentPurpose.label}
             </span>
             {selected && !readOnly && <Edit3 size={10} className="text-blue-400" />}
          </div>

          {/* Contextual Options - Only shows when arrow is selected/clicked */}
          <AnimatePresence>
            {selected && !readOnly && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="mt-3 bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col space-y-4 min-w-[240px] z-[100]"
              >
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vector Label</label>
                    <input
                      autoFocus
                      className="w-full bg-black border border-white/20 rounded-xl px-3 py-2 text-[11px] font-bold text-white uppercase outline-none focus:border-blue-500"
                      placeholder="ENTER FLOW ID..."
                      value={data?.label || ''}
                      onChange={(e) => onLabelChange(e.target.value)}
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Standard Purpose</label>
                    <div className="grid grid-cols-1 gap-1">
                       {LINK_PURPOSES.map((p) => (
                         <button 
                           key={p.id}
                           onClick={() => onPurposeChange(p.id)}
                           className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${data?.purpose === p.id || (!data?.purpose && p.id === 'PRIMARY') ? 'bg-blue-600 text-white shadow-lg' : 'bg-black/40 text-slate-300 hover:bg-white/10'}`}
                         >
                            <div className="flex items-center space-x-2">
                               <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ backgroundColor: p.color }} />
                               <span className="text-[10px] font-black uppercase tracking-tight">{p.label}</span>
                            </div>
                            {(data?.purpose === p.id || (!data?.purpose && p.id === 'PRIMARY')) && <Check size={12} />}
                         </button>
                       ))}
                    </div>
                 </div>

                 <button 
                   onClick={() => setEdges((es) => es.filter((e) => e.id !== id))}
                   className="w-full py-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-2 border border-rose-600/30"
                 >
                    Purge Vector
                 </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const edgeTypes = {
  labeled: LabeledEdge,
};

// --- Custom Node Types ---

const getAssetColor = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('physical') || t.includes('server')) return '#34d399'; 
  if (t.includes('virtual')) return '#22d3ee'; 
  if (t.includes('storage')) return '#fbbf24'; 
  if (t.includes('switch') || t.includes('network')) return '#a78bfa'; 
  if (t.includes('load balancer')) return '#fb7185'; 
  return '#cbd5e1'; 
}

const AssetNode = ({ data, selected }: any) => {
  const subLayerCount = data.internalNodes?.filter((n: any) => n.type === 'serviceNode').length || 0;
  const hasSublayer = subLayerCount > 0;
  
  return (
    <div className={`group relative transition-all ${selected ? 'z-10' : 'z-0'} scale-110`}>
      <div 
        className={`bg-slate-900 border-2 rounded-3xl w-56 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transition-all ${selected ? 'border-white ring-[12px] ring-white/10' : 'border-slate-700 hover:border-slate-500'} ${hasSublayer ? 'ring-4 ring-emerald-500/20' : ''}`}
      >
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full shadow-[2px_0_10px_rgba(0,0,0,0.3)]" style={{ backgroundColor: getAssetColor(data.type) }} />
          <div className="flex items-center space-x-2">
            <Server size={16} style={{ color: getAssetColor(data.type) }} className="filter drop-shadow-sm" />
            {hasSublayer && <Layers size={12} className="text-emerald-400 animate-pulse" />}
          </div>
          <div className="flex items-center space-x-2">
            {hasSublayer && <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 tracking-tighter uppercase mr-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">SUB_LAYER</span>}
            <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest truncate ml-2 flex-1 text-right">{data.type}</span>
          </div>
        </div>
        
        <div className="p-5 flex flex-col items-center text-center space-y-4 pb-8">
          {data.isGeneric && !data.readOnly ? (
             <input 
               value={data.label} 
               onChange={(e) => data.onUpdateLabel(e.target.value)}
               className="w-full bg-black border border-white/20 rounded-xl px-3 py-2 text-xs text-white font-black uppercase text-center outline-none focus:border-blue-500 shadow-inner"
               placeholder="ENTITY_NAME"
             />
          ) : (
             <div className="text-[15px] font-black text-white uppercase tracking-tight truncate w-full filter drop-shadow-md">{data.label}</div>
          )}
          
          <div className="flex items-center space-x-2">
             <div className="text-[10px] font-black text-slate-300 uppercase tracking-wider px-2.5 py-1 bg-black/40 rounded-md border border-white/5">{data.system}</div>
             {data.ip && <div className="text-[10px] font-mono text-blue-300 font-bold tracking-tighter filter drop-shadow-sm">{data.ip}</div>}
          </div>

          {subLayerCount > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.1)]">
               <Layers size={10} className="text-emerald-400" />
               <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{subLayerCount} LOGIC BLOCKS</span>
            </div>
          )}
        </div>
      </div>
      
      <Handle type="target" position={Position.Left} className="!w-6 !h-6 !bg-blue-500 !border-[6px] !border-slate-900 shadow-[0_0_15px_rgba(59,130,246,0.5)] -left-3 transition-transform hover:scale-125 cursor-crosshair" />
      <Handle type="source" position={Position.Right} className="!w-6 !h-6 !bg-emerald-500 !border-[6px] !border-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.5)] -right-3 transition-transform hover:scale-125 cursor-crosshair" />
    </div>
  )
}

const ServiceNode = ({ data, selected }: any) => {
  const getIcon = () => {
    switch(data.service_type) {
      case 'Database': return <Database size={14} className="text-amber-300" />
      case 'Web Server': return <Globe size={14} className="text-blue-300" />
      case 'Container': return <Box size={14} className="text-emerald-300" />
      case 'Middleware': return <Workflow size={14} className="text-indigo-300" />
      default: return <Layers size={14} className="text-slate-300" />
    }
  }

  return (
    <div className={`bg-slate-800 border-2 rounded-2xl w-48 p-4 shadow-2xl transition-all ${selected ? 'border-emerald-400 ring-[10px] ring-emerald-500/10' : 'border-slate-700 hover:border-slate-600'}`}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
        <div className="flex items-center space-x-2">
           {getIcon()}
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{data.service_type}</span>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ${data.status === 'Active' ? 'bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)]'}`} />
      </div>
      
      {data.isGeneric && !data.readOnly ? (
        <input 
          autoFocus
          value={data.label} 
          onChange={(e) => data.onUpdateLabel(e.target.value)}
          className="w-full bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-black uppercase outline-none focus:border-emerald-400 shadow-inner"
          placeholder="LOGIC_ID"
        />
      ) : (
        <div className="flex flex-col space-y-1">
           <div className="text-sm font-black text-white uppercase truncate filter drop-shadow-sm">{data.label}</div>
           {data.version && <div className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest mt-1">VER: {data.version}</div>}
        </div>
      )}
      
      <Handle type="target" position={Position.Left} className="!w-4 !h-4 !bg-slate-400 !border-[3px] !border-slate-900 shadow-md" />
      <Handle type="source" position={Position.Right} className="!w-4 !h-4 !bg-slate-400 !border-[3px] !border-slate-900 shadow-md" />
    </div>
  )
}

const PortNode = ({ data, type }: any) => (
  <div className={`flex items-center px-6 py-4 bg-slate-900 border-2 rounded-[24px] shadow-2xl min-w-[200px] group transition-all hover:bg-slate-800 ${type === 'input' ? 'border-blue-400/60 flex-row-reverse' : 'border-emerald-400/60'}`}>
    <div className={`flex flex-col ${type === 'input' ? 'mr-5 text-right' : 'ml-5'}`}>
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1 group-hover:text-slate-300 transition-colors">{type === 'input' ? 'INGRESS_SOURCE' : 'EGRESS_TARGET'}</span>
      <span className="text-sm font-black text-white uppercase tracking-tight truncate max-w-[160px] filter drop-shadow-sm">{data.label}</span>
    </div>
    <div className={`p-3 rounded-2xl bg-black border border-white/10 transition-all group-hover:scale-110 shadow-inner ${type === 'input' ? 'text-blue-300' : 'text-emerald-300'}`}>
       {type === 'input' ? <ArrowLeft size={22} /> : <ArrowRight size={22} />}
    </div>
    <Handle 
      type={type === 'input' ? 'source' : 'target'} 
      position={type === 'input' ? Position.Right : Position.Left} 
      className={type === 'input' ? '!bg-blue-400 shadow-[0_0_15px_#3b82f6]' : '!bg-emerald-400 shadow-[0_0_15px_#10b981]'}
    />
  </div>
)

const InputPortNode = (props: any) => <PortNode {...props} type="input" />
const OutputPortNode = (props: any) => <PortNode {...props} type="output" />

const nodeTypes = {
  assetNode: AssetNode,
  serviceNode: ServiceNode,
  inputPort: InputPortNode,
  outputPort: OutputPortNode
}

// --- Main Designer Component ---

export default function DataFlowDesigner() {
  return (
    <ReactFlowProvider>
      <DataFlowDesignerInner />
    </ReactFlowProvider>
  )
}

function DataFlowDesignerInner() {
  const queryClient = useQueryClient()
  const { setViewport, getViewport, zoomIn, zoomOut, fitView } = useReactFlow()
  
  const [view, setView] = useState<'LIST' | 'EDITOR'>('LIST')
  const [editorMode, setEditorMode] = useState<'EDIT' | 'VIEW'>('EDIT')
  const [drillLevel, setDrillLevel] = useState<'TOP' | 'SUB'>('TOP')
  const [activeArch, setActiveArchitecture] = useState<any>(null)
  const [currentAsset, setCurrentAsset] = useState<any>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  
  const [topNodes, setTopNodes, onTopNodesChange] = useNodesState([])
  const [topEdges, setTopEdges, onTopEdgesChange] = useEdgesState([])
  const [subNodes, setSubNodes, onSubNodesChange] = useNodesState([])
  const [subEdges, setSubEdges, onSubEdgesChange] = useEdgesState([])

  const [searchTerm, setSearchTerm] = useState('')
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false)
  const [newArchName, setNewArchName] = useState('')

  const { data: assets } = useQuery({ queryKey: ['devices'], queryFn: async () => (await apiFetch('/api/v1/devices/')).json() })
  const { data: savedArchs, isLoading: isLoadingArchs } = useQuery({ 
    queryKey: ['data-flows', showDeleted], 
    queryFn: async () => (await apiFetch(`/api/v1/data-flows/?include_deleted=${showDeleted}`)).json() 
  })
  const { data: allServices } = useQuery({ queryKey: ['logical-services'], queryFn: async () => (await apiFetch('/api/v1/logical-services/')).json() })

  // --- Callbacks ---

  const onConnectTop = useCallback((params: Connection) => {
    if (editorMode === 'VIEW') return;
    setTopEdges((eds) => addEdge({ 
      ...params, 
      type: 'labeled',
      data: { label: '', purpose: 'PRIMARY' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
    }, eds));
  }, [setTopEdges, editorMode])

  const onConnectSub = useCallback((params: Connection) => {
    if (editorMode === 'VIEW') return;
    setSubEdges((eds) => addEdge({ 
      ...params, 
      type: 'labeled',
      data: { label: '', purpose: 'PRIMARY' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' }
    }, eds));
  }, [setSubEdges, editorMode])

  const addAssetToArch = (asset: any) => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'assetNode',
      position: { x: 300, y: 300 },
      data: { 
        label: asset.name, 
        type: asset.type, 
        system: asset.system, 
        assetId: asset.id,
        ip: asset.primary_ip || asset.management_ip,
        os: asset.os_name
      }
    }
    setTopNodes((nds) => nds.concat(newNode))
    toast.success(`Infrastructure Object Locked: ${asset.name}`)
  }

  const addGenericEntity = () => {
    const newNode = {
      id: `generic-${Date.now()}`,
      type: 'assetNode',
      position: { x: 300, y: 300 },
      data: { label: 'EXTERNAL_VPC_NODE', type: 'EXTERNAL', system: 'UNKNOWN_VPC', isGeneric: true }
    }
    setTopNodes((nds) => nds.concat(newNode))
  }

  const addServiceToArch = (service: any) => {
    const newNode = {
      id: `service-${Date.now()}`,
      type: 'serviceNode',
      position: { x: 500, y: 300 },
      data: { 
        label: service.name, 
        service_type: service.service_type, 
        status: service.status, 
        serviceId: service.id,
        version: service.version
      }
    }
    setSubNodes((nds) => nds.concat(newNode))
    toast.success(`Service Logic Provisioned: ${service.name}`)
  }

  const addGenericService = () => {
    const newNode = {
      id: `sub-generic-${Date.now()}`,
      type: 'serviceNode',
      position: { x: 500, y: 300 },
      data: { label: 'CUSTOM_LOGIC_GATE', service_type: 'OTHER', status: 'Active', isGeneric: true }
    }
    setSubNodes((nds) => nds.concat(newNode))
  }

  const updateGenericLabel = useCallback((id: string, newLabel: string, level: 'TOP' | 'SUB') => {
    const setter = level === 'TOP' ? setTopNodes : setSubNodes;
    setter((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n)));
  }, [setTopNodes, setSubNodes]);

  // --- Auto-relocation Logic for Label Clearance ---

  const autoAdjustLayout = useCallback((nodes: any[], edges: any[], setNodes: any) => {
    let changed = false;
    const newNodes = nodes.map(n => ({ ...n, position: { ...n.position } }));
    
    // Satisfy edge label length constraints with iterative relaxation
    for (let iter = 0; iter < 10; iter++) {
      let iterChanged = false;
      edges.forEach(edge => {
        const source = newNodes.find(n => n.id === edge.source);
        const target = newNodes.find(n => n.id === edge.target);
        
        if (source && target) {
          const dx = target.position.x - source.position.x;
          const dy = target.position.y - source.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const label = edge.data?.label || (LINK_PURPOSES.find(p => p.id === edge.data?.purpose)?.label || 'Primary Traffic');
          // High-precision estimate: 10px per char + substantial padding for pill UI
          const minDistance = (label.length * 10) + 160; 
          
          if (distance < minDistance) {
            const strength = 0.5;
            const diff = (minDistance - distance) / distance * strength;
            const pushX = dx * diff;
            const pushY = dy * diff;
            
            if (source.draggable !== false) {
              source.position.x -= pushX;
              source.position.y -= pushY;
            }
            if (target.draggable !== false) {
              target.position.x += pushX;
              target.position.y += pushY;
            }
            iterChanged = true;
            changed = true;
          }
        }
      });
      if (!iterChanged) break;
    }
    
    if (changed) {
      setNodes(newNodes);
    }
  }, []);

  useEffect(() => {
    if (editorMode === 'VIEW') return;
    const nodes = drillLevel === 'TOP' ? topNodes : subNodes;
    const edges = drillLevel === 'TOP' ? topEdges : subEdges;
    const setter = drillLevel === 'TOP' ? setTopNodes : setSubNodes;
    
    // Trigger layout adjustment when edges or node positions change
    autoAdjustLayout(nodes, edges, setter);
  }, [topEdges, subEdges, topNodes, subNodes, drillLevel, editorMode, autoAdjustLayout]);

  const drillDown = useCallback((node: any) => {
    setCurrentAsset({ nodeId: node.id, ...node.data })
    const internal = node.data.internalNodes || []
    const internalEdges = node.data.internalEdges || []
    
    // Interface Seeding Logic
    const incoming = topEdges.filter(e => e.target === node.id)
    const outgoing = topEdges.filter(e => e.source === node.id)
    
    const portNodes: any[] = []
    incoming.forEach((e, i) => {
      const src = topNodes.find(n => n.id === e.source)
      portNodes.push({ id: `port-in-${e.id}`, type: 'inputPort', position: { x: 100, y: 150 + (i * 120) }, draggable: false, data: { label: src?.data.label || 'INGRESS' } })
    })
    outgoing.forEach((e, i) => {
      const trg = topNodes.find(n => n.id === e.target)
      portNodes.push({ id: `port-out-${e.id}`, type: 'outputPort', position: { x: 1000, y: 150 + (i * 120) }, draggable: false, data: { label: trg?.data.label || 'EGRESS' } })
    })

    const existingOtherNodes = internal.filter((n: any) => n.type !== 'inputPort' && n.type !== 'outputPort')
    setSubNodes([...portNodes, ...existingOtherNodes])
    setSubEdges(internalEdges)
    setDrillLevel('SUB')
    toast.success(`Accessing Micro-Logic Matrix: ${node.data.label}`)
  }, [topEdges, topNodes])

  const goBackToTop = () => {
    setTopNodes(nds => nds.map(n => {
      if (n.id === currentAsset.nodeId) return { ...n, data: { ...n.data, internalNodes: subNodes, internalEdges: subEdges } }
      return n
    }))
    setDrillLevel('TOP')
    setCurrentAsset(null)
  }

  const handleSave = () => {
    if (editorMode === 'VIEW') return;
    let finalNodes = topNodes
    if (drillLevel === 'SUB') {
      finalNodes = topNodes.map(n => {
        if (n.id === currentAsset.nodeId) return { ...n, data: { ...n.data, internalNodes: subNodes, internalEdges: subEdges } }
        return n
      })
    }
    saveArchMutation.mutate({ name: activeArch?.name || newArchName, nodes: finalNodes, edges: topEdges, viewport: getViewport() })
  }

  const saveArchMutation = useMutation({
    mutationFn: async (payload: any) => (await apiFetch(`/api/v1/data-flows/${activeArch.id}`, { method: 'PUT', body: JSON.stringify(payload) })).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['data-flows'] }); toast.success('Architecture matrix synchronized') }
  })

  const createArchMutation = useMutation({
    mutationFn: async (payload: any) => (await apiFetch('/api/v1/data-flows/', { method: 'POST', body: JSON.stringify(payload) })).json(),
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ['data-flows'] }); enterEditor(data, 'EDIT'); setIsNamingModalOpen(false); setNewArchName('') }
  })

  const softDeleteArchMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/data-flows/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['data-flows'] }); toast.success('Moved to Trash Archive') }
  })

  const restoreArchMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/data-flows/${id}/restore`, { method: 'POST' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['data-flows'] }); toast.success('Blueprint restored to active matrix') }
  })

  const permanentDeleteArchMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/data-flows/${id}?permanent=true`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['data-flows'] }); toast.success('Record permanently purged from core') }
  })

  const enterEditor = (arch: any, mode: 'EDIT' | 'VIEW') => {
    setActiveArchitecture(arch); 
    setTopNodes(arch.nodes || []); 
    setTopEdges(arch.edges || []); 
    setEditorMode(mode);
    setView('EDITOR'); 
    setDrillLevel('TOP');
    if (arch.viewport) {
      setTimeout(() => setViewport(arch.viewport), 100);
    }
  }

  const topNodesInjected = useMemo(() => topNodes.map(n => ({
    ...n,
    data: { ...n.data, readOnly: editorMode === 'VIEW', onDrillDown: () => drillDown(n), onUpdateLabel: (l: string) => updateGenericLabel(n.id, l, 'TOP') }
  })), [topNodes, drillDown, updateGenericLabel, editorMode])

  const subNodesInjected = useMemo(() => subNodes.map(n => ({
    ...n,
    data: { ...n.data, readOnly: editorMode === 'VIEW', onUpdateLabel: (l: string) => updateGenericLabel(n.id, l, 'SUB') }
  })), [subNodes, updateGenericLabel, editorMode])

  const filteredAssets = searchTerm ? assets?.filter((a: any) => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.system.toLowerCase().includes(searchTerm.toLowerCase())) : []
  const filteredServices = allServices?.filter((s: any) => s.device_id === currentAsset?.assetId && s.name.toLowerCase().includes(searchTerm.toLowerCase()))

  // --- Renders ---

  if (view === 'LIST') {
    return (
      <div className="h-full flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
             <div>
                <h1 className="text-2xl font-black uppercase tracking-tight italic text-white leading-none">Architecture</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Infrastructure Blueprints & Logic Matrix</p>
             </div>

             <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                  <button onClick={() => setShowDeleted(false)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!showDeleted ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                      Existing
                  </button>
                  <button onClick={() => setShowDeleted(true)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${showDeleted ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                      Trash
                  </button>
             </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
               <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search blueprints..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
            </div>

            {!showDeleted && (
              <button onClick={() => setIsNamingModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ New Blueprint</button>
            )}
          </div>
        </div>

        <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
           <table className="w-full text-left border-collapse">
              <thead className="bg-white/5 border-b border-white/5">
                 <tr>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Identity</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Blueprint Name</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Registration</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Last Synced</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right pr-8">Operations</th>
                 </tr>
              </thead>
              <tbody className="divide-y-2 divide-white/5">
                 {savedArchs?.map((arch: any) => (
                   <motion.tr 
                     key={arch.id} 
                     initial={{ opacity: 0 }} 
                     animate={{ opacity: 1 }} 
                     className="group hover:bg-white/5 transition-colors cursor-pointer"
                     onClick={() => enterEditor(arch, 'VIEW')}
                   >
                      <td className="px-6 py-3">
                         <div className="flex items-center space-x-3">
                            <Layout size={14} className="text-blue-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded border border-white/5">
                               ARCH-{arch.id.toString().padStart(4,'0')}
                            </span>
                         </div>
                      </td>
                      <td className="px-6 py-3">
                         <span className="text-sm font-bold text-white uppercase group-hover:text-blue-400 transition-colors">{arch.name}</span>
                      </td>
                      <td className="px-6 py-3 text-center">
                         <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                            <Box size={10} className="text-slate-500" />
                            <span className="text-[9px] font-black text-white uppercase tracking-wider">{arch.nodes?.length || 0} Assets</span>
                         </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                         <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            {new Date(arch.updated_at || Date.now()).toLocaleDateString()}
                         </span>
                      </td>
                      <td className="px-6 py-3 text-right pr-8">
                         <div className="flex items-center justify-end space-x-3" onClick={e => e.stopPropagation()}>
                            {showDeleted ? (
                              <>
                                <button onClick={() => restoreArchMutation.mutate(arch.id)} className="p-1.5 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-600 hover:text-white transition-all" title="Restore Logic">
                                   <RotateCcw size={14}/>
                                </button>
                                <button onClick={() => permanentDeleteArchMutation.mutate(arch.id)} className="p-1.5 bg-rose-600/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-600 hover:text-white transition-all" title="Permanent Purge">
                                   <Trash2 size={14}/>
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => enterEditor(arch, 'VIEW')} className="p-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-600/20 transition-all flex items-center justify-center" title="View Blueprint">
                                   <Eye size={14}/>
                                </button>
                                <button onClick={() => enterEditor(arch, 'EDIT')} className="p-1.5 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-600/20 transition-all flex items-center justify-center" title="Edit Architecture">
                                   <Edit3 size={14}/>
                                </button>
                                <button onClick={() => softDeleteArchMutation.mutate(arch.id)} className="p-1.5 bg-rose-600/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-600/20 transition-all flex items-center justify-center" title="Archive Record">
                                   <Trash2 size={14}/>
                                </button>
                              </>
                            )}
                         </div>
                      </td>
                   </motion.tr>
                 ))}
              </tbody>
           </table>
           {!savedArchs?.length && !isLoadingArchs && (
             <div className="py-48 flex flex-col items-center justify-center space-y-8 opacity-30">
                <Unplug size={80} className="text-slate-500" />
                <div className="text-center space-y-3">
                   <p className="text-2xl font-black uppercase tracking-[0.6em] text-slate-500">{showDeleted ? 'Trash Archive Empty' : 'Matrix Core Disconnected'}</p>
                   <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">No architecture blueprints detected in the registry</p>
                </div>
             </div>
           )}
        </div>

        <AnimatePresence>
           {isNamingModalOpen && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-6">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-full max-w-[600px] p-16 rounded-[64px] border-2 border-blue-500/40 space-y-12 shadow-[0_0_100px_rgba(59,130,246,0.2)] relative overflow-hidden bg-slate-950">
                   <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600/0 via-blue-500 to-blue-600/0" />
                   <div className="text-center space-y-5">
                      <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white filter drop-shadow-md">New Matrix Blueprint</h2>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em] opacity-80">Initialize high-precision system orchestration record</p>
                   </div>
                   <div className="space-y-5">
                      <label className="text-[12px] font-black text-blue-400 uppercase tracking-[0.3em] ml-4">Blueprint Identifier</label>
                      <input autoFocus value={newArchName} onChange={e => setNewArchName(e.target.value)} placeholder="E.G. GLOBAL_DATACENTER_CORE_V1" className="w-full bg-black border-2 border-white/10 rounded-[32px] px-10 py-7 text-2xl font-black text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-800 shadow-inner uppercase tracking-wider" />
                   </div>
                   <div className="flex space-x-8 pt-6">
                      <button onClick={() => setIsNamingModalOpen(false)} className="flex-1 py-7 text-[13px] font-black uppercase text-slate-400 hover:text-white transition-colors tracking-[0.3em]">Abort</button>
                      <button onClick={handleSave} className="flex-2 px-16 py-7 bg-blue-600 hover:bg-blue-500 text-white rounded-[32px] font-black uppercase text-sm shadow-[0_0_40px_rgba(59,130,246,0.4)] transition-all active:scale-95 flex items-center justify-center space-x-4 border-2 border-blue-400/30">
                         <Save size={20}/> <span>Commit Matrix</span>
                      </button>
                   </div>
                </motion.div>
             </div>
           )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4 text-slate-200">
      <header className="flex items-center justify-between shrink-0 bg-slate-900 border-2 border-white/10 p-6 rounded-[40px] shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center space-x-6 text-left">
           <button onClick={() => setView('LIST')} className="p-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-3xl transition-all shadow-inner active:scale-90 group border-2 border-white/5">
              <ChevronLeft size={32} className="group-hover:-translate-x-1 transition-transform"/>
           </button>
           <div className="h-14 w-px bg-white/20" />
           <div>
              <div className="flex items-center space-x-6">
                 <h1 className="text-3xl font-black uppercase text-white tracking-tighter leading-none filter drop-shadow-md">{activeArch?.name}</h1>
                 <span className={`px-5 py-2 border-2 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center space-x-2.5 shadow-lg ${editorMode === 'VIEW' ? 'bg-slate-950 border-slate-700 text-slate-400 shadow-inner' : 'bg-blue-600/20 border-blue-500/40 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]'}`}>
                   {editorMode === 'VIEW' ? <Lock size={12}/> : <LockOpen size={12}/>}
                   <span>{editorMode === 'VIEW' ? 'READ-ONLY ACCESS' : 'COMMAND_MODE'}</span>
                 </span>
              </div>
              <div className="flex items-center space-x-5 mt-4">
                 <div className="flex items-center space-x-3">
                    <span className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em]">LAYER:</span>
                    <span className={`text-[12px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg border-2 ${drillLevel === 'TOP' ? 'text-blue-400 bg-blue-600/20 border-blue-500/30' : 'text-emerald-400 bg-emerald-600/20 border-emerald-500/30'}`}>
                       {drillLevel === 'TOP' ? 'GLOBAL_ORCHESTRATION' : 'MICRO_LOGIC_MATRIX'}
                    </span>
                 </div>
                 {drillLevel === 'SUB' && (
                   <div className="flex items-center space-x-4 animate-in fade-in slide-in-from-left-4 duration-500">
                     <ChevronRight size={18} className="text-slate-600" />
                     <div className="flex items-center space-x-4 px-5 py-1.5 bg-black/40 rounded-xl border-2 border-emerald-500/20 shadow-inner">
                        <Server size={14} className="text-emerald-400" />
                        <span className="text-[12px] text-emerald-300 font-black uppercase tracking-widest">{currentAsset?.label}</span>
                     </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
        <div className="flex items-center space-x-6">
           <div className="flex bg-black/60 p-2 rounded-2xl border-2 border-white/10 mr-4 shadow-inner">
              <button onClick={() => zoomIn()} className="p-2.5 text-slate-400 hover:text-white transition-colors" title="Zoom In"><Maximize2 size={20}/></button>
              <button onClick={() => zoomOut()} className="p-2.5 text-slate-400 hover:text-white transition-colors" title="Zoom Out"><Maximize2 size={20} className="rotate-180"/></button>
              <button onClick={() => fitView()} className="p-2.5 text-slate-400 hover:text-white transition-colors" title="Fit View"><RefreshCcw size={20}/></button>
           </div>

           {drillLevel === 'SUB' && (
             <button onClick={goBackToTop} className="flex items-center space-x-5 px-10 py-5 bg-emerald-600/20 text-emerald-300 border-2 border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 group">
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform"/> <span>Return to Global</span>
             </button>
           )}
           {editorMode === 'EDIT' && (
             <button onClick={handleSave} className="flex items-center space-x-5 px-14 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.4em] transition-all shadow-[0_0_30px_rgba(59,130,246,0.4)] active:scale-95 border-2 border-blue-400/40 group">
                <Save size={22} className="group-hover:scale-110 transition-transform"/> <span>Sync ARCH</span>
             </button>
           )}
        </div>
      </header>

      <div className="flex-1 flex space-x-6 min-h-0">
        <aside className={`w-80 glass-panel rounded-[48px] flex flex-col p-10 space-y-10 overflow-hidden transition-all duration-500 border-2 border-white/5 ${editorMode === 'VIEW' ? 'bg-slate-950/40 opacity-40 pointer-events-none grayscale' : 'bg-slate-900 shadow-2xl shadow-black/50'}`}>
           <div className="relative group">
              <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input readOnly={editorMode === 'VIEW'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={drillLevel === 'TOP' ? "SEARCH ASSETS..." : "FILTER LOGIC..."} className="w-full bg-black border-2 border-white/10 rounded-[32px] pl-16 pr-6 py-5 text-[12px] font-black uppercase outline-none focus:border-blue-500/60 transition-all placeholder:text-slate-700 relative z-10 text-white shadow-inner" />
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 pr-2 text-left">
              {drillLevel === 'TOP' ? (
                <>
                  <div className="space-y-8">
                     <div className="flex items-center justify-between px-3">
                        <h3 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.5em] flex items-center space-x-5 leading-none">
                           <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                           <span>REG_ASSETS</span>
                        </h3>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">{filteredAssets?.length || 0}</span>
                     </div>
                     <div className="space-y-4">
                        {searchTerm ? (
                          filteredAssets?.map((a: any) => (
                            <button key={a.id} onClick={() => addAssetToArch(a)} className="w-full text-left p-6 bg-black/40 border-2 border-white/5 rounded-[36px] hover:border-blue-500/60 hover:bg-black/60 transition-all group flex items-center justify-between shadow-xl">
                               <div className="flex flex-col">
                                  <span className="text-[13px] font-black text-white group-hover:text-blue-300 tracking-tight transition-colors uppercase filter drop-shadow-sm">{a.name}</span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest flex items-center">
                                     <div className="w-1.5 h-1.5 rounded-full mr-2.5 shadow-sm" style={{ backgroundColor: getAssetColor(a.type) }} />
                                     {a.type} // {a.system}
                                  </span>
                               </div>
                               <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-blue-600 group-hover:text-white transition-all text-slate-600 shadow-inner border border-white/5"><Plus size={18} /></div>
                            </button>
                          ))
                        ) : (
                          <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-[48px] bg-black/30 px-10 space-y-6">
                             <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-white/5 flex items-center justify-center mx-auto opacity-60 shadow-xl"><Terminal size={24} className="text-slate-400"/></div>
                             <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] leading-relaxed italic opacity-80">Enter criteria to access infrastructure acquisition layer</p>
                          </div>
                        )}
                     </div>
                  </div>
                  <div className="space-y-8 pt-6">
                     <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center space-x-5 px-3 leading-none">
                        <div className="w-2 h-2 rounded-full bg-slate-700" />
                        <span>CUSTOM_GATE</span>
                     </h3>
                     <button onClick={addGenericEntity} className="w-full p-6 bg-black/40 border-2 border-dashed border-slate-700 rounded-[36px] text-[12px] font-black text-slate-400 uppercase hover:bg-slate-800 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center space-x-5 group shadow-lg">
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500"/> <span>Provision Proxy Node</span>
                     </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-8">
                     <div className="flex items-center justify-between px-3">
                        <h3 className="text-[12px] font-black text-emerald-400 uppercase tracking-[0.5em] flex items-center space-x-5 leading-none">
                           <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                           <span>LOCAL_SERVICES</span>
                        </h3>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">{filteredServices?.length || 0}</span>
                     </div>
                     <div className="space-y-4">
                        {filteredServices?.map((s: any) => (
                          <button key={s.id} onClick={() => addServiceToArch(s)} className="w-full text-left p-6 bg-black/40 border-2 border-white/5 rounded-[36px] hover:border-emerald-500/60 hover:bg-black/60 transition-all group flex items-center justify-between shadow-xl">
                             <div className="flex flex-col">
                                <span className="text-[13px] font-black text-white group-hover:text-emerald-300 tracking-tight transition-colors uppercase filter drop-shadow-sm">{s.name}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest flex items-center">
                                   <div className="w-1.5 h-1.5 rounded-full mr-2.5 bg-emerald-500 shadow-sm" />
                                   {s.service_type} // {s.status}
                                </span>
                             </div>
                             <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-emerald-600 group-hover:text-white transition-all text-slate-600 shadow-inner border border-white/5"><Plus size={18} /></div>
                          </button>
                        ))}
                        {!filteredServices?.length && (
                          <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-[48px] bg-black/30 px-10 space-y-6">
                             <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-white/5 flex items-center justify-center mx-auto opacity-60 shadow-xl"><Activity size={24} className="text-slate-400"/></div>
                             <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] leading-relaxed italic opacity-80">No logical services mapped to this global acquisition point</p>
                          </div>
                        )}
                     </div>
                  </div>
                  <div className="space-y-8 pt-6">
                     <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center space-x-5 px-3 leading-none">
                        <div className="w-2 h-2 rounded-full bg-slate-700" />
                        <span>PROCESS_BUFFER</span>
                     </h3>
                     <button onClick={addGenericService} className="w-full p-6 bg-black/40 border-2 border-dashed border-slate-700 rounded-[36px] text-[12px] font-black text-slate-400 uppercase hover:bg-slate-800 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center space-x-5 group shadow-lg">
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500"/> <span>Provision Micro-Logic</span>
                     </button>
                  </div>
                </>
              )}
           </div>
        </aside>

        <div className="flex-1 glass-panel rounded-[64px] overflow-hidden relative border-2 border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)] bg-slate-950">
           <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3b82f6 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }} />
           <ReactFlow
             nodes={drillLevel === 'TOP' ? topNodesInjected : subNodesInjected}
             edges={drillLevel === 'TOP' ? topEdges : subEdges}
             onNodesChange={drillLevel === 'TOP' ? onTopNodesChange : onSubNodesChange}
             onEdgesChange={drillLevel === 'TOP' ? onTopEdgesChange : onSubEdgesChange}
             onConnect={drillLevel === 'TOP' ? onConnectTop : onConnectSub}
             nodeTypes={nodeTypes}
             edgeTypes={edgeTypes}
             fitView
             snapToGrid
             snapGrid={[20, 20]}
             nodesDraggable={editorMode === 'EDIT'}
             nodesConnectable={editorMode === 'EDIT'}
             elementsSelectable={true}
             deleteKeyCode={editorMode === 'EDIT' ? ['Backspace', 'Delete'] : []}
             onNodeDoubleClick={(_, node) => {
               if (node.type === 'assetNode') {
                 node.data.onDrillDown();
               }
             }}
             onNodeDragStop={() => {
               if (editorMode === 'VIEW') return;
               const nodes = drillLevel === 'TOP' ? topNodes : subNodes;
               const edges = drillLevel === 'TOP' ? topEdges : subEdges;
               const setter = drillLevel === 'TOP' ? setTopNodes : setSubNodes;
               autoAdjustLayout(nodes, edges, setter);
             }}
           >
             <Background color={drillLevel === 'TOP' ? "#334155" : "#065f46"} gap={40} size={1.5} opacity={0.4} />
             <Controls className="bg-slate-900 border-2 border-white/20 rounded-3xl overflow-hidden shadow-2xl p-1" />
             <Panel position="top-left" className="bg-slate-900/95 backdrop-blur-xl px-10 py-5 rounded-[28px] border-2 border-white/10 text-[12px] font-black uppercase tracking-[0.3em] shadow-[0_10px_40px_rgba(0,0,0,0.5)] text-white">
                {drillLevel === 'TOP' ? (
                   <span className="text-blue-400 flex items-center space-x-5">
                      <Layout size={22} className="animate-pulse"/> <span>{editorMode === 'VIEW' ? 'GLOBAL_ARCHITECT_VIEW' : 'GLOBAL_MATRIX_DESIGN // ORCHESTRATION_COMMAND'}</span>
                   </span>
                ) : (
                   <span className="text-emerald-400 flex items-center space-x-5">
                      <Activity size={22} className="animate-pulse"/> <span>{editorMode === 'VIEW' ? 'SUB_LAYER_VIEW' : 'SUB_LAYER_DRILL_DOWN'} // LOCAL_MICRO_LOGIC [ {currentAsset?.label} ]</span>
                   </span>
                )}
             </Panel>
             
             <Panel position="bottom-right" className="bg-slate-900/80 backdrop-blur-lg px-8 py-4 rounded-2xl border-2 border-white/10 text-[11px] font-black uppercase tracking-[0.3em] text-slate-300 shadow-2xl">
                DRAG NODES TO ORGANIZE // DOUBLE-CLICK TO DRILL
             </Panel>
           </ReactFlow>
        </div>
      </div>
    </div>
  )
}

const SummaryChip = ({ label, value, color }: any) => (
  <div className="flex flex-col items-center">
    <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2">{label}</span>
    <span className={`text-3xl font-black ${color} font-mono leading-none tracking-tighter shadow-lg`}>{String(value).padStart(2, '0')}</span>
  </div>
)

const LegendItem = ({ color, label }: any) => (
  <div className="flex items-center space-x-4 px-5 py-2.5 bg-slate-900/80 backdrop-blur-md border border-white/5 rounded-2xl shadow-xl">
    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}40` }} />
    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{label}</span>
  </div>
)
