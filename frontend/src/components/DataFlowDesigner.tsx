import React, { useState, useCallback, useMemo, useEffect } from 'react'
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap, 
  Panel,
  useNodesState, 
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  Connection,
  Edge
} from 'reactflow'
import 'reactflow/dist/style.css'
import { 
  Save, 
  FolderOpen, 
  Plus, 
  Trash2, 
  Server, 
  Layers, 
  Cpu, 
  Database, 
  Globe, 
  X, 
  Workflow,
  Search,
  LayoutGrid,
  Maximize2,
  ChevronRight,
  Settings,
  Info,
  RefreshCcw,
  Box
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'

// --- Custom Node Types ---

const NodeWrapper = ({ children, selected, title, icon: Icon, color }: any) => (
  <div className={`glass-panel p-4 rounded-2xl min-w-[180px] border-2 transition-all ${selected ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-white/5'}`}>
    <div className="flex items-center space-x-3 mb-2">
       <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
          <Icon size={16} />
       </div>
       <span className="text-[10px] font-black uppercase tracking-widest text-white truncate max-w-[120px]">{title}</span>
    </div>
    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">
       {children}
    </div>
  </div>
)

const AssetNode = ({ data, selected }: any) => (
  <NodeWrapper selected={selected} title={data.label} icon={Server} color="text-blue-400">
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-blue-500 border-none" />
    <div className="space-y-1 mt-2">
       <div className="flex justify-between"><span>Type:</span> <span className="text-slate-300">{data.type}</span></div>
       <div className="flex justify-between"><span>System:</span> <span className="text-slate-300">{data.system}</span></div>
    </div>
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-500 border-none" />
  </NodeWrapper>
)

const ServiceNode = ({ data, selected }: any) => (
  <NodeWrapper selected={selected} title={data.label} icon={Layers} color="text-emerald-400">
    <Handle type="target" position={Position.Left} className="w-2 h-2 bg-emerald-500 border-none" />
    <div className="space-y-1 mt-2">
       <div className="flex justify-between"><span>Class:</span> <span className="text-slate-300">{data.service_type}</span></div>
       <div className="flex justify-between"><span>Status:</span> <span className="text-emerald-500">{data.status}</span></div>
    </div>
    <Handle type="source" position={Position.Right} className="w-2 h-2 bg-emerald-500 border-none" />
  </NodeWrapper>
)

const InternalProcessNode = ({ data, selected }: any) => (
  <div className={`bg-black/40 backdrop-blur-md p-3 rounded-xl border border-dashed transition-all ${selected ? 'border-amber-500 shadow-lg' : 'border-white/10'}`}>
    <Handle type="target" position={Position.Left} className="w-1.5 h-1.5 bg-amber-500 border-none" />
    <div className="flex items-center space-x-2">
       <Cpu size={12} className="text-amber-500" />
       <span className="text-[9px] font-black text-white uppercase">{data.label}</span>
    </div>
    <Handle type="source" position={Position.Right} className="w-1.5 h-1.5 bg-amber-500 border-none" />
  </div>
)

const nodeTypes = {
  assetNode: AssetNode,
  serviceNode: ServiceNode,
  processNode: InternalProcessNode
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
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [activeFlow, setActiveFlow] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isBrowserOpen, setIsBrowserOpen] = useState(false)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [flowName, setFlowName] = useState('')
  const [flowDesc, setFlowDesc] = useState('')

  const { data: assets } = useQuery({ queryKey: ['devices'], queryFn: async () => (await apiFetch('/api/v1/devices/')).json() })
  const { data: services } = useQuery({ queryKey: ['logical-services'], queryFn: async () => (await apiFetch('/api/v1/logical-services/')).json() })
  const { data: savedFlows } = useQuery({ queryKey: ['data-flows'], queryFn: async () => (await apiFetch('/api/v1/data-flows/')).json() })

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ 
    ...params, 
    animated: true, 
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
  }, eds)), [setEdges])

  const addAssetToDiagram = (asset: any) => {
    const newNode = {
      id: `asset-${asset.id}-${Date.now()}`,
      type: 'assetNode',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: asset.name, type: asset.type, system: asset.system, originalId: asset.id }
    }
    setNodes((nds) => nds.concat(newNode))
    toast.success(`Node ${asset.name} registered to diagram`)
  }

  const addServiceToDiagram = (service: any) => {
    const newNode = {
      id: `service-${service.id}-${Date.now()}`,
      type: 'serviceNode',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: service.name, service_type: service.service_type, status: service.status, originalId: service.id }
    }
    setNodes((nds) => nds.concat(newNode))
    toast.success(`Service ${service.name} added`)
  }

  const addProcessNode = () => {
    const newNode = {
      id: `proc-${Date.now()}`,
      type: 'processNode',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: 'INTERNAL_PROCESS' }
    }
    setNodes((nds) => nds.concat(newNode))
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = activeFlow?.id ? `/api/v1/data-flows/${activeFlow.id}` : '/api/v1/data-flows/'
      const method = activeFlow?.id ? 'PUT' : 'POST'
      return (await apiFetch(url, { method, body: JSON.stringify(payload) })).json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['data-flows'] })
      setActiveFlow(data)
      setIsSaveModalOpen(false)
      toast.success('Diagram synchronized to matrix')
    }
  })

  const loadFlow = (flow: any) => {
    setNodes(flow.nodes || [])
    setEdges(flow.edges || [])
    setActiveFlow(flow)
    setFlowName(flow.name)
    setFlowDesc(flow.description)
    setIsBrowserOpen(false)
    toast.success(`Loaded: ${flow.name}`)
  }

  const deleteFlow = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/data-flows/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-flows'] })
      toast.success('Matrix record purged')
    }
  })

  const filteredAssets = assets?.filter((a: any) => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
  const filteredServices = services?.filter((s: any) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
           <h1 className="text-2xl font-black uppercase tracking-tighter italic text-white flex items-center space-x-3">
              <Workflow className="text-blue-500" size={24} />
              <span>Data Flow Designer</span>
           </h1>
           <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-9">Interactive System Orchestration & Processing Logic</p>
        </div>

        <div className="flex items-center space-x-3">
           <button onClick={() => setIsBrowserOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase transition-all">
              <FolderOpen size={14} /> <span>Open Matrix</span>
           </button>
           <button onClick={() => { setActiveFlow(null); setNodes([]); setEdges([]); setFlowName(''); setFlowDesc('') }} className="flex items-center space-x-2 px-4 py-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase transition-all">
              <Plus size={14} /> <span>New Design</span>
           </button>
           <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-blue-500/20">
              <Save size={14} /> <span>Commit Flow</span>
           </button>
        </div>
      </div>

      <div className="flex-1 flex space-x-4 min-h-0">
        {/* Left Sidebar: Asset Palette */}
        <div className="w-72 glass-panel rounded-[32px] flex flex-col p-6 space-y-6 overflow-hidden">
           <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Find Entity..." 
                className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50" 
              />
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
              <section className="space-y-3">
                 <h3 className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center space-x-2">
                    <Server size={12} /> <span>System Assets</span>
                 </h3>
                 <div className="space-y-2">
                    {filteredAssets?.slice(0, 15).map((a: any) => (
                      <button key={a.id} onClick={() => addAssetToDiagram(a)} className="w-full text-left p-3 bg-white/5 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all group flex items-center justify-between">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white group-hover:text-blue-400">{a.name}</span>
                            <span className="text-[8px] text-slate-500 font-bold uppercase">{a.type}</span>
                         </div>
                         <Plus size={12} className="text-slate-600 group-hover:text-blue-400" />
                      </button>
                    ))}
                 </div>
              </section>

              <section className="space-y-3">
                 <h3 className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center space-x-2">
                    <Layers size={12} /> <span>Logical Services</span>
                 </h3>
                 <div className="space-y-2">
                    {filteredServices?.slice(0, 15).map((s: any) => (
                      <button key={s.id} onClick={() => addServiceToDiagram(s)} className="w-full text-left p-3 bg-white/5 border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all group flex items-center justify-between">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white group-hover:text-emerald-400">{s.name}</span>
                            <span className="text-[8px] text-slate-500 font-bold uppercase">{s.service_type}</span>
                         </div>
                         <Plus size={12} className="text-slate-600 group-hover:text-emerald-400" />
                      </button>
                    ))}
                 </div>
              </section>

              <section className="space-y-3">
                 <h3 className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center space-x-2">
                    <Cpu size={12} /> <span>Generic Process</span>
                 </h3>
                 <button onClick={addProcessNode} className="w-full p-3 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-2xl text-[9px] font-black text-amber-500 uppercase hover:bg-amber-500/10 transition-all">
                    + Add Process Buffer
                 </button>
              </section>
           </div>
        </div>

        {/* Main Flow Canvas */}
        <div className="flex-1 glass-panel rounded-[40px] overflow-hidden relative border-white/5">
           <ReactFlow
             nodes={nodes}
             edges={edges}
             onNodesChange={onNodesChange}
             onEdgesChange={onEdgesChange}
             onConnect={onConnect}
             nodeTypes={nodeTypes}
             fitView
             snapToGrid
             snapGrid={[15, 15]}
           >
             <Background color="#1e293b" gap={20} size={1} />
             <Controls className="bg-black/40 border-white/10 rounded-xl overflow-hidden" />
             <MiniMap 
               nodeColor={(n: any) => {
                 if (n.type === 'assetNode') return '#3b82f6'
                 if (n.type === 'serviceNode') return '#10b981'
                 return '#f59e0b'
               }}
               maskColor="rgba(0, 0, 0, 0.7)"
               className="bg-black/40 rounded-xl border border-white/10"
             />
             <Panel position="top-left" className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-[10px] font-black uppercase text-blue-400">
                {activeFlow ? `MODE: Editing [${activeFlow.name}]` : 'MODE: Free Design'}
             </Panel>
           </ReactFlow>
        </div>
      </div>

      {/* Save Modal */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[450px] p-10 rounded-[40px] border-blue-500/30 space-y-8 shadow-2xl">
                <div className="flex items-center space-x-4">
                   <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-500"><Save size={24}/></div>
                   <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Save Matrix Flow</h2>
                </div>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Flow Identifier</label>
                      <input value={flowName} onChange={e => setFlowName(e.target.value)} placeholder="e.g., SAP_TO_HR_SYNC" className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-3 text-sm font-bold text-white outline-none focus:border-blue-500" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Architectural Context</label>
                      <textarea value={flowDesc} onChange={e => setFlowDesc(e.target.value)} placeholder="Describe the logical purpose of this data vector..." rows={3} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-3 text-xs font-bold text-white outline-none focus:border-blue-500 resize-none" />
                   </div>
                </div>
                <div className="flex space-x-4">
                   <button onClick={() => setIsSaveModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Abort</button>
                   <button onClick={() => saveMutation.mutate({ name: flowName, description: flowDesc, nodes, edges })} className="flex-2 px-10 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Synchronize Matrix</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Browser Modal */}
      <AnimatePresence>
        {isBrowserOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[600px] max-h-[70vh] flex flex-col p-10 rounded-[40px] border-white/10 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-6">
                   <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Saved Matrix Flows</h2>
                   <button onClick={() => setIsBrowserOpen(false)}><X size={24} className="text-slate-500 hover:text-white" /></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                   {savedFlows?.map((f: any) => (
                     <div key={f.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-blue-500/30 transition-all">
                        <div className="flex items-center space-x-4">
                           <div className="p-2 bg-blue-600/10 rounded-xl text-blue-400"><Workflow size={16}/></div>
                           <div>
                              <p className="text-[11px] font-black text-white uppercase group-hover:text-blue-400">{f.name}</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase">{new Date(f.created_at).toLocaleDateString()} // {f.nodes?.length} Nodes</p>
                           </div>
                        </div>
                        <div className="flex space-x-2">
                           <button onClick={() => loadFlow(f)} className="px-4 py-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">Inject</button>
                           <button onClick={() => deleteFlow.mutate(f.id)} className="p-1.5 hover:bg-rose-600/20 text-slate-600 hover:text-rose-500 rounded-lg transition-all"><Trash2 size={14}/></button>
                        </div>
                     </div>
                   ))}
                   {!savedFlows?.length && <div className="text-center py-12 text-slate-600 font-black uppercase tracking-widest italic">Registry Empty</div>}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
