import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Trash2, Cpu, Package, X, RefreshCcw, Search, Edit2, LayoutGrid, List, FileJson, 
  Check, MoreVertical, Settings, Sliders, Globe, Eye, EyeOff, ArrowRightLeft, Tag, 
  AlertCircle, Layers, Maximize2, Columns, Layout, Table as TableIcon, Zap, 
  Activity, Shield, MousePointer2, ChevronRight, BarChart3, Terminal, Server,
  Command, History, Workflow, Filter, Trash
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import ReactFlow, { 
  Background, Controls, MiniMap, useNodesState, useEdgesState, 
  Handle, Position, MarkerType, ReactFlowProvider 
} from 'reactflow'
import 'reactflow/dist/style.css'
import { apiFetch } from "../api/apiClient"
import { StyledSelect } from "./shared/StyledSelect"
import { ServiceDetailsView, ServiceForm } from "./ServiceRegistry"

// --- Constants (copied from AssetGrid) ---

const ASSET_TYPES = [
    { value: 'Physical', label: 'Physical' },
    { value: 'Virtual', label: 'Virtual' },
    { value: 'Storage', label: 'Storage' },
    { value: 'Switch', label: 'Switch' },
    { value: 'Firewall', label: 'Firewall' },
    { value: 'Load Balancer', label: 'Load Balancer' }
]

const STATUS_ITEMS = [
    { value: 'Planned', label: 'Planned' },
    { value: 'Active', label: 'Active' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Standby', label: 'Standby' },
    { value: 'Offline', label: 'Offline' }
]

const ENVIRONMENT_ITEMS = [
    { value: 'Production', label: 'Production' },
    { value: 'Staging', label: 'Staging' },
    { value: 'QA', label: 'QA' },
    { value: 'Dev', label: 'Dev' }
]

// --- Idea 1: Global Command Palette Component ---

const CommandPalette = ({ isOpen, onClose, assets, onSelect }: any) => {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    if (!query) return []
    return assets.filter((a: any) => 
      a.name.toLowerCase().includes(query.toLowerCase()) || 
      a.system.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8)
  }, [query, assets])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        // Parent handles state, but we ensure it works
      }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm">
       <motion.div 
         initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
         className="w-full max-w-2xl bg-[#1a1b26] border border-blue-500/30 rounded-3xl shadow-2xl overflow-hidden"
       >
          <div className="flex items-center px-6 py-4 border-b border-white/5 bg-black/20">
             <Search size={20} className="text-blue-400 mr-4" />
             <input 
               autoFocus value={query} onChange={e => setQuery(e.target.value)}
               placeholder="Jump to node, system, or matrix view..."
               className="flex-1 bg-transparent border-none outline-none text-white text-lg font-medium"
             />
             <div className="px-2 py-1 bg-white/5 rounded border border-white/10 text-[10px] text-slate-500 font-black">ESC</div>
          </div>
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
             {filtered.map((a: any) => (
               <button 
                 key={a.id} onClick={() => { onSelect(a); onClose(); }}
                 className="w-full flex items-center justify-between p-4 hover:bg-blue-600/10 rounded-2xl group transition-all"
               >
                  <div className="flex items-center space-x-4">
                     <div className="p-2 bg-white/5 rounded-xl group-hover:bg-blue-600/20 text-slate-500 group-hover:text-blue-400">
                        <Server size={18} />
                     </div>
                     <div className="flex flex-col text-left">
                        <span className="text-sm font-black text-white uppercase italic tracking-tighter">{a.name}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{a.system} // {a.type}</span>
                     </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-700 group-hover:text-blue-400 transition-transform group-hover:translate-x-1" />
               </button>
             ))}
             {query && filtered.length === 0 && (
               <div className="py-12 text-center text-slate-600 font-black uppercase tracking-widest italic opacity-40">No matrix match found</div>
             )}
             {!query && (
               <div className="py-8 px-6 space-y-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quick Navigation</p>
                  <div className="grid grid-cols-2 gap-3">
                     {['Dashboard', 'Racks', 'Assets', 'Services', 'Network', 'Monitoring'].map(v => (
                       <div key={v} className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] font-black text-slate-400 uppercase italic cursor-pointer hover:border-blue-500/30 transition-all">
                          <Zap size={14} className="text-blue-500" /> <span>{v}</span>
                       </div>
                     ))}
                  </div>
               </div>
             )}
          </div>
       </motion.div>
    </div>
  )
}

// --- Idea 2: Dependency Map Diagram Components ---

const GraphNode = ({ data }: any) => (
  <div className="glass-panel p-4 rounded-2xl min-w-[150px] border border-blue-500/20 bg-[#1a1b26]/90">
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-blue-500" />
    <div className="flex flex-col items-center text-center space-y-1">
       <span className="text-[11px] font-black text-white uppercase italic tracking-tighter leading-none">{data.label}</span>
       <span className="text-[8px] text-slate-500 font-bold uppercase">{data.system}</span>
    </div>
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-500" />
  </div>
)

const nodeTypes = { assetNode: GraphNode }

function DependencyMap({ assets }: any) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [filters, setFilters] = useState({ systems: [] as string[], nodes: [] as string[] })

  const { data: allRelationships } = useQuery({ 
    queryKey: ['all-relationships'], 
    queryFn: async () => (await apiFetch('/api/v1/networks/connections')).json() // Using network connections as proxy for simple flow
  })

  useEffect(() => {
    // Basic logic to build graph based on filters
    const filteredAssets = assets.filter((a: any) => 
      (filters.systems.length === 0 || filters.systems.includes(a.system)) &&
      (filters.nodes.length === 0 || filters.nodes.includes(a.name))
    )

    const newNodes = filteredAssets.map((a: any, i: number) => ({
      id: `asset-${a.id}`,
      type: 'assetNode',
      data: { label: a.name, system: a.system },
      position: { x: 100 + (i % 3) * 250, y: 100 + Math.floor(i / 3) * 150 }
    }))

    // Dummy edges for visualization based on some common systems
    const newEdges: any[] = []
    filteredAssets.forEach((a: any, i: number) => {
       if (i > 0 && i < 10) {
          newEdges.push({
             id: `e-${i}`, source: `asset-${filteredAssets[i-1].id}`, target: `asset-${a.id}`,
             animated: true, label: 'DATA_VECTOR', labelStyle: { fill: '#3b82f6', fontWeight: 900, fontSize: 8 },
             markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
          })
       }
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }, [assets, filters, setNodes, setEdges])

  return (
    <div className="flex-1 glass-panel rounded-[40px] border-white/5 flex flex-col overflow-hidden relative">
       <div className="p-6 border-b border-white/5 bg-black/40 flex items-center justify-between z-10">
          <div className="flex items-center space-x-4">
             <Workflow size={20} className="text-blue-400" />
             <h3 className="text-xs font-black uppercase text-white tracking-widest italic">Logic Relationship Matrix</h3>
          </div>
          <div className="flex items-center space-x-4">
             <div className="flex items-center space-x-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                <span className="text-[9px] font-black text-slate-500 uppercase">System:</span>
                <select 
                  onChange={e => setFilters(f => ({ ...f, systems: e.target.value === 'All' ? [] : [e.target.value] }))}
                  className="bg-transparent text-[10px] font-bold text-blue-400 outline-none uppercase"
                >
                   <option>All</option>
                   {Array.from(new Set(assets.map((a:any)=>a.system))).map((s:any)=><option key={s}>{s}</option>)}
                </select>
             </div>
          </div>
       </div>
       <div className="flex-1 bg-[#08090a]">
          <ReactFlow 
            nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} 
            nodeTypes={nodeTypes} fitView
          >
             <Background color="#1e293b" gap={20} />
             <Controls />
          </ReactFlow>
       </div>
    </div>
  )
}

// --- Idea 4: Audit Peek Component ---

const AuditPeekTab = ({ deviceId }: { deviceId: number }) => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-peek', deviceId],
    queryFn: async () => (await apiFetch(`/api/v1/audit/?target_id=${deviceId}`)).json()
  })

  return (
    <div className="space-y-4 p-4">
       <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center space-x-2">
          <History size={14} /> <span>Transaction Forensics (Last 5)</span>
       </h3>
       {isLoading ? <div className="py-12 animate-pulse text-center text-[9px] font-black uppercase text-slate-600 italic">Reading Ledger...</div> : (
         <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-[10px]">
               <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                     <th className="px-4 py-2 text-left text-slate-500 uppercase">Ops</th>
                     <th className="px-4 py-2 text-left text-slate-500 uppercase">Admin</th>
                     <th className="px-4 py-2 text-left text-slate-500 uppercase">Time</th>
                     <th className="px-4 py-2 text-left text-slate-500 uppercase">Payload</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {logs?.slice(0, 5).map((l: any) => (
                    <tr key={l.id} className="hover:bg-white/5">
                       <td className="px-4 py-3 font-black text-blue-400">{l.action}</td>
                       <td className="px-4 py-3 font-bold text-slate-300">{l.user_id}</td>
                       <td className="px-4 py-3 text-slate-500 font-mono">{new Date(l.timestamp).toLocaleTimeString()}</td>
                       <td className="px-4 py-3 text-slate-400 italic truncate max-w-[200px]">{l.description}</td>
                    </tr>
                  ))}
                  {!logs?.length && <tr><td colSpan={4} className="py-12 text-center text-[9px] font-black uppercase text-slate-700 italic">Registry Empty</td></tr>}
               </tbody>
            </table>
         </div>
       )}
    </div>
  )
}

// --- Main Sandbox View ---

export default function AssetSandbox() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('grid')
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [bulkPattern, setBulkPattern] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [activeDetails, setActiveDetails] = useState<any>(null)

  const { data: assets, isLoading } = useQuery({ 
    queryKey: ['assets'], 
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json() 
  })

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) })

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsCommandOpen(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Idea 5: Bulk Pattern Matcher Logic
  const handleBulkMatch = useCallback(() => {
    if (!bulkPattern || !assets) return
    try {
      const regex = new RegExp(bulkPattern, 'i')
      const matched = assets.filter((a: any) => regex.test(a.name)).map((a: any) => a.id)
      setSelectedIds(matched)
      toast.success(`Pattern matched ${matched.length} nodes`)
    } catch {
      toast.error('Invalid Regex Pattern')
    }
  }, [bulkPattern, assets])

  return (
    <div className="h-full flex flex-col space-y-6">
      <CommandPalette 
        isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} 
        assets={assets || []} onSelect={setActiveDetails} 
      />

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
           <h1 className="text-3xl font-black uppercase tracking-tighter italic text-white leading-none">Asset Sandbox</h1>
           <p className="text-[10px] text-slate-500 uppercase font-black mt-2 tracking-[0.3em]">Experimental Intelligence & Orchestration Lab</p>
        </div>

        <div className="flex items-center space-x-4">
           {/* Idea 5: Compact Bulk Pattern Matcher */}
           <div className="flex items-center space-x-2 bg-black/40 border border-white/5 p-1 rounded-2xl">
              <div className="pl-3 text-slate-600"><Maximize2 size={14}/></div>
              <input 
                value={bulkPattern} onChange={e => setBulkPattern(e.target.value)}
                placeholder="REGEXP BULK SELECT..."
                className="bg-transparent border-none outline-none text-[9px] font-black uppercase text-white w-40 placeholder:text-slate-700"
              />
              <button onClick={handleBulkMatch} className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">Match</button>
           </div>

           <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><TableIcon size={18}/></button>
              <button onClick={() => setViewMode('graph')} className={`p-2 rounded-xl transition-all ${viewMode === 'graph' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><Workflow size={18}/></button>
           </div>
           
           <div className="px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase text-blue-400 shadow-inner flex items-center space-x-2">
              <Command size={14} /> <span>CTRL + K</span>
           </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 glass-panel rounded-[40px] overflow-hidden ag-theme-alpine-dark relative border-white/5">
             <AgGridReact 
               rowData={assets || []}
               columnDefs={[
                 { field: 'name', headerName: 'Node', flex: 1, pinned: 'left', cellClass: 'font-black text-blue-400 uppercase tracking-tighter' },
                 { field: 'system', headerName: 'System', width: 120 },
                 { field: 'status', headerName: 'Status', width: 110, cellRenderer: (p:any)=><span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-white/10">{p.value}</span> },
                 { field: 'environment', headerName: 'Env', width: 100 },
                 { headerName: 'Action', width: 80, pinned: 'right', cellRenderer: (p:any)=><button onClick={()=>setActiveDetails(p.data)} className="p-1.5 hover:bg-blue-600/20 text-blue-400 rounded-lg"><Maximize2 size={14}/></button>}
               ]}
               rowSelection="multiple" rowHeight={45} animateRows={true}
             />
          </motion.div>
        ) : (
          <motion.div key="graph" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="flex-1 flex flex-col min-h-0">
             <ReactFlowProvider>
                <DependencyMap assets={assets || []} />
             </ReactFlowProvider>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeDetails && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10 text-left">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-5xl max-h-[85vh] flex flex-col p-12 rounded-[60px] border-blue-500/30">
                <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-8">
                   <div className="flex items-center space-x-6">
                      <div className="p-5 bg-blue-600/10 rounded-[2.5rem] text-blue-400 shadow-inner"><Server size={32}/></div>
                      <div>
                         <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none">{activeDetails.name}</h2>
                         <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3">{activeDetails.system} // {activeDetails.type} Node</p>
                      </div>
                   </div>
                   <button onClick={() => setActiveDetails(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-3xl text-slate-500 transition-all"><X size={32}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <AssetDetailsSandbox device={activeDetails} options={options} />
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: #0f1115;
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #e2e8f0;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 11px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.15em !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; }
      `}</style>
    </div>
  )
}

function AssetDetailsSandbox({ device, options }: any) {
  const [tab, setTab] = useState('Overview')
  return (
    <div className="space-y-8">
       <div className="flex space-x-2 bg-black/40 p-1.5 rounded-[2rem] w-fit border border-white/5">
          {['Overview', 'Audit Trail', 'Logic Matrix'].map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`px-10 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${tab===t?'bg-blue-600 text-white shadow-lg shadow-blue-500/20':'text-slate-500 hover:text-white'}`}>{t}</button>
          ))}
       </div>
       <div className="glass-panel rounded-[40px] border-white/5 p-10 bg-white/[0.01] shadow-inner">
          {tab === 'Overview' && (
            <div className="grid grid-cols-2 gap-12">
               <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase text-blue-400 tracking-[0.4em] border-l-4 border-blue-600 pl-4 italic">Core Specs</h3>
                  <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-4">
                     <div className="flex justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Management IP</span>
                        <span className="text-xs font-mono font-bold text-white uppercase italic">{device.management_ip}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Kernel OS</span>
                        <span className="text-xs font-bold text-white uppercase italic">{device.os_name} {device.os_version}</span>
                     </div>
                  </div>
               </div>
               <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase text-emerald-400 tracking-[0.4em] border-l-4 border-emerald-600 pl-4 italic">Location Context</h3>
                  <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-4">
                     <div className="flex justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Site Matrix</span>
                        <span className="text-xs font-bold text-white uppercase italic">{device.site_name}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Rack & Slot</span>
                        <span className="text-xs font-bold text-white uppercase italic">{device.rack_name} U{device.u_start}</span>
                     </div>
                  </div>
               </div>
            </div>
          )}
          {/* Idea 4: Audit Trail Peek (Last 5) */}
          {tab === 'Audit Trail' && <AuditPeekTab deviceId={device.id} />}
          {tab === 'Logic Matrix' && (
            <div className="py-20 text-center opacity-30 flex flex-col items-center">
               <Workflow size={48} className="mb-4 text-blue-400" />
               <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">Dependency Graph Logic Initialized</p>
            </div>
          )}
       </div>
    </div>
  )
}
