import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
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

// --- Idea 1: Global Command Palette Component ---

const CommandPalette = ({ isOpen, onClose, assets, onSelect }: any) => {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!query) return []
    return assets.filter((a: any) => 
      a.name.toLowerCase().includes(query.toLowerCase()) || 
      a.system.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8)
  }, [query, assets])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[250] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
       <motion.div 
         initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
         className="w-full max-w-2xl bg-[#1a1b26] border border-blue-500/30 rounded-3xl shadow-2xl overflow-hidden"
         onClick={e => e.stopPropagation()}
       >
          <div className="flex items-center px-6 py-4 border-b border-white/5 bg-black/20">
             <Search size={20} className="text-blue-400 mr-4" />
             <input 
               ref={inputRef}
               value={query} onChange={e => setQuery(e.target.value)}
               placeholder="Jump to node, system, or matrix view..."
               className="flex-1 bg-transparent border-none outline-none text-white text-lg font-medium"
               onKeyDown={e => {
                 if (e.key === 'Enter' && filtered.length > 0) {
                   onSelect(filtered[0])
                   onClose()
                 }
               }}
             />
             <div className="px-2 py-1 bg-white/5 rounded border border-white/10 text-[10px] text-slate-500 font-black tracking-widest uppercase">ESC</div>
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
                        <span className="text-sm font-black text-white uppercase italic tracking-tighter leading-none">{a.name}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">{a.system} // {a.type}</span>
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
                     {[
                       { n: 'Dashboard', p: '/' },
                       { n: 'Racks', p: '/racks' },
                       { n: 'Assets', p: '/assets' },
                       { n: 'Services', p: '/services' },
                       { n: 'Network', p: '/network' },
                       { n: 'Monitoring', p: '/monitoring' }
                     ].map(v => (
                       <div key={v.n} className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] font-black text-slate-400 uppercase italic cursor-pointer hover:border-blue-500/30 transition-all">
                          <Zap size={14} className="text-blue-500" /> <span>{v.n}</span>
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

const GraphNode = ({ data, selected }: any) => (
  <div className={`glass-panel p-4 rounded-2xl min-w-[150px] border-2 transition-all bg-[#1a1b26]/90 ${selected ? 'border-blue-500 shadow-lg' : 'border-white/10'}`}>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-blue-500 border-none" />
    <div className="flex flex-col items-center text-center space-y-1">
       <span className="text-[11px] font-black text-white uppercase italic tracking-tighter leading-none">{data.label}</span>
       <span className="text-[8px] text-slate-500 font-bold uppercase">{data.system}</span>
    </div>
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-500 border-none" />
  </div>
)

const nodeTypes = { assetNode: GraphNode }

function DependencyMap({ assets }: any) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [filters, setFilters] = useState({ systems: [] as string[] })

  const { data: relations } = useQuery({ 
    queryKey: ['all-relationships-global-sandbox'], 
    queryFn: async () => {
      const res = await apiFetch('/api/v1/networks/connections')
      return res.json()
    }
  })

  useEffect(() => {
    const filteredAssets = assets.filter((a: any) => 
      filters.systems.length === 0 || filters.systems.includes(a.system)
    )

    const newNodes = filteredAssets.map((a: any, i: number) => ({
      id: `asset-${a.id}`,
      type: 'assetNode',
      data: { label: a.name, system: a.system },
      position: { x: 100 + (i % 4) * 220, y: 100 + Math.floor(i / 4) * 120 }
    }))

    const newEdges: any[] = []
    if (relations) {
      relations.forEach((rel: any) => {
        const sourceExists = filteredAssets.find((a:any) => a.id === rel.source_device_id)
        const targetExists = filteredAssets.find((a:any) => a.id === rel.target_device_id)
        
        if (sourceExists && targetExists) {
          newEdges.push({
            id: `edge-${rel.id}`,
            source: `asset-${rel.source_device_id}`,
            target: `asset-${rel.target_device_id}`,
            animated: true,
            label: rel.purpose || 'CONNECT',
            labelStyle: { fill: '#3b82f6', fontWeight: 900, fontSize: 7, textTransform: 'uppercase' },
            labelBgStyle: { fill: '#08090a', fillOpacity: 0.8 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
            style: { stroke: '#3b82f6', strokeWidth: 1.5 }
          })
        }
      })
    }

    setNodes(newNodes)
    setEdges(newEdges)
  }, [assets, filters, relations, setNodes, setEdges])

  return (
    <div className="flex-1 glass-panel rounded-[40px] border-white/5 flex flex-col overflow-hidden relative">
       <div className="p-6 border-b border-white/5 bg-black/40 flex items-center justify-between z-10">
          <div className="flex items-center space-x-4">
             <Workflow size={20} className="text-blue-400" />
             <h3 className="text-xs font-black uppercase text-white tracking-widest italic">Logic Relationship Matrix</h3>
          </div>
          <div className="flex items-center space-x-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">System Focus:</span>
             <select 
               onChange={e => setFilters({ systems: e.target.value === 'All' ? [] : [e.target.value] })}
               className="bg-transparent text-[10px] font-bold text-blue-400 outline-none uppercase cursor-pointer"
             >
                <option value="All">All Systems</option>
                {Array.from(new Set(assets.map((a:any)=>a.system))).map((s:any)=><option key={s} value={s}>{s}</option>)}
             </select>
          </div>
       </div>
       <div className="flex-1 bg-[#08090a]">
          <ReactFlow 
            nodes={nodes} edges={edges} 
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} 
            nodeTypes={nodeTypes} fitView
          >
             <Background color="#1e293b" gap={20} />
             <Controls />
             <MiniMap nodeColor="#3b82f6" maskColor="rgba(0,0,0,0.7)" />
          </ReactFlow>
       </div>
    </div>
  )
}

// --- Idea 4: Audit Peek Component ---

const AuditPeekTab = ({ deviceId }: { deviceId: number }) => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-peek-sandbox-final', deviceId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/audit/?target_table=devices&target_id=${deviceId}`)
      return res.json()
    }
  })

  return (
    <div className="space-y-4">
       <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center space-x-2">
          <History size={14} /> <span>Transaction Forensics (Last 5)</span>
       </h3>
       {isLoading ? <div className="py-12 animate-pulse text-center text-[9px] font-black uppercase text-slate-600 italic">Reading Ledger Matrix...</div> : (
         <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden shadow-inner">
            <table className="w-full text-[10px]">
               <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                     <th className="px-4 py-2 text-left text-slate-500 uppercase tracking-widest">Ops</th>
                     <th className="px-4 py-2 text-left text-slate-500 uppercase tracking-widest">Admin</th>
                     <th className="px-4 py-2 text-left text-slate-500 uppercase tracking-widest">Time</th>
                     <th className="px-4 py-2 text-left text-slate-500 uppercase tracking-widest">Payload</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {logs?.slice(0, 5).map((l: any) => (
                    <tr key={l.id} className="hover:bg-white/5 group transition-colors">
                       <td className="px-4 py-3 font-black text-blue-400 uppercase tracking-tighter">{l.action}</td>
                       <td className="px-4 py-3 font-bold text-slate-300 uppercase">{l.user_id}</td>
                       <td className="px-4 py-3 text-slate-500 font-mono text-[9px]">{new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                       <td className="px-4 py-3 text-slate-400 italic truncate max-w-[250px] group-hover:text-white transition-colors">{l.description}</td>
                    </tr>
                  ))}
                  {!logs?.length && <tr><td colSpan={4} className="py-12 text-center text-[9px] font-black uppercase text-slate-700 italic opacity-40">Forensic history null</td></tr>}
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
  const gridRef = useRef<AgGridReact>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('grid')
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [bulkPattern, setBulkPattern] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [activeDetails, setActiveDetails] = useState<any>(null)

  const { data: assets, isLoading } = useQuery({ 
    queryKey: ['assets-sandbox-final'], 
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json() 
  })

  // Auto-open detail window if ID is in URL
  useEffect(() => {
    const id = searchParams.get('id')
    if (id && assets) {
      const asset = assets.find((a: any) => String(a.id) === id)
      if (asset) {
        setActiveDetails(asset)
        // Clear param to prevent re-opening if user closes modal
        setSearchParams({}, { replace: true })
      }
    }
  }, [searchParams, assets, setSearchParams])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsCommandOpen(prev => !prev)
      }
      if (e.key === 'Escape') setIsCommandOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Idea 5: Bulk Pattern Matcher Logic
  const handleBulkMatch = useCallback(() => {
    if (!bulkPattern || !assets || !gridRef.current) return
    try {
      const regex = new RegExp(bulkPattern, 'i')
      
      gridRef.current.api.forEachNode((node) => {
        const matches = regex.test(node.data.name) || regex.test(node.data.system)
        node.setSelected(matches)
      })
      
      const count = gridRef.current.api.getSelectedNodes().length
      toast.success(`Matrix selection synchronized: ${count} nodes`)
    } catch {
      toast.error('Invalid Pattern Architecture')
    }
  }, [bulkPattern, assets])

  const onSelectionChanged = useCallback(() => {
    if (gridRef.current) {
      setSelectedIds(gridRef.current.api.getSelectedNodes().map(n => n.data.id))
    }
  }, [])

  return (
    <div className="h-full flex flex-col space-y-6">
      <CommandPalette 
        isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} 
        assets={assets || []} onSelect={setActiveDetails} 
      />

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
           <h1 className="text-3xl font-black uppercase tracking-tighter italic text-white leading-none">Asset Sandbox</h1>
           <p className="text-[10px] text-slate-500 uppercase font-black mt-2 tracking-[0.3em]">Advanced Matrix Forensics & Pattern Processing</p>
        </div>

        <div className="flex items-center space-x-4">
           {/* Idea 5: Compact Bulk Pattern Matcher */}
           <div className="flex items-center space-x-2 bg-black/40 border border-white/5 p-1 rounded-2xl shadow-inner group focus-within:border-blue-500/50 transition-all">
              <div className="pl-3 text-slate-600"><Maximize2 size={14}/></div>
              <input 
                value={bulkPattern} onChange={e => setBulkPattern(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBulkMatch()}
                placeholder="REGEXP PATTERN..."
                className="bg-transparent border-none outline-none text-[9px] font-black uppercase text-white w-40 placeholder:text-slate-700"
              />
              <button onClick={handleBulkMatch} className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">Execute Match</button>
           </div>

           <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}><TableIcon size={18}/></button>
              <button onClick={() => setViewMode('graph')} className={`p-2 rounded-xl transition-all ${viewMode === 'graph' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}><Workflow size={18}/></button>
           </div>
           
           <div className="px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase text-blue-400 shadow-inner flex items-center space-x-2 animate-pulse">
              <Command size={14} /> <span>CTRL + K</span>
           </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 glass-panel rounded-[40px] overflow-hidden ag-theme-alpine-dark relative border-white/5">
             <AgGridReact 
               ref={gridRef}
               rowData={assets || []}
               columnDefs={[
                 { field: 'id', headerName: 'ID', width: 70, checkboxSelection: true, headerCheckboxSelection: true, cellClass: 'font-mono text-slate-600 text-[10px]' },
                 { field: 'name', headerName: 'Node Identity', flex: 1, pinned: 'left', cellClass: 'font-black text-blue-400 uppercase tracking-tighter cursor-pointer hover:underline', onCellClicked: (p:any)=>setActiveDetails(p.data) },
                 { field: 'system', headerName: 'Logic Domain', width: 130, cellClass: 'font-bold text-slate-300' },
                 { field: 'status', headerName: 'State', width: 110, cellRenderer: (p:any)=><span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-white/10 bg-white/5">{p.value}</span> },
                 { field: 'environment', headerName: 'Matrix', width: 100 },
                 { headerName: 'Action', width: 80, pinned: 'right', cellRenderer: (p:any)=><button onClick={()=>setActiveDetails(p.data)} className="p-1.5 hover:bg-blue-600/20 text-blue-400 rounded-lg transition-all"><Maximize2 size={14}/></button>}
               ]}
               rowSelection="multiple" rowHeight={45} animateRows={true}
               onSelectionChanged={onSelectionChanged}
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
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-5xl max-h-[85vh] flex flex-col p-12 rounded-[60px] border-blue-500/30 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-8">
                   <div className="flex items-center space-x-6">
                      <div className="p-5 bg-blue-600/10 rounded-[2.5rem] text-blue-400 shadow-inner"><Server size={32}/></div>
                      <div>
                         <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none">{activeDetails.name}</h2>
                         <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3">{activeDetails.system} // {activeDetails.type} Forensic Node</p>
                      </div>
                   </div>
                   <button onClick={() => setActiveDetails(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-3xl text-slate-500 transition-all"><X size={32}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <AssetDetailsSandbox device={activeDetails} />
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
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.1) !important; }
      `}</style>
    </div>
  )
}

function AssetDetailsSandbox({ device }: any) {
  const [tab, setTab] = useState('Overview')
  return (
    <div className="space-y-8">
       <div className="flex space-x-2 bg-black/40 p-1.5 rounded-[2rem] w-fit border border-white/5">
          {['Overview', 'Audit Trail', 'Logic Matrix'].map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`px-10 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${tab===t?'bg-blue-600 text-white shadow-lg shadow-blue-500/20':'text-slate-500 hover:text-white'}`}>{t}</button>
          ))}
       </div>
       <div className="glass-panel rounded-[40px] border-white/5 p-10 bg-white/[0.01] shadow-inner min-h-[400px]">
          {tab === 'Overview' && (
            <div className="grid grid-cols-2 gap-12 text-left">
               <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase text-blue-400 tracking-[0.4em] border-l-4 border-blue-600 pl-4 italic">Core Specs</h3>
                  <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-4 shadow-inner">
                     <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Management IP</span>
                        <span className="text-xs font-mono font-bold text-white uppercase italic tracking-tighter">{device.management_ip || 'VOID'}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kernel OS</span>
                        <span className="text-xs font-bold text-white uppercase italic tracking-tighter">{device.os_name} {device.os_version}</span>
                     </div>
                  </div>
               </div>
               <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase text-emerald-400 tracking-[0.4em] border-l-4 border-emerald-600 pl-4 italic">Location Context</h3>
                  <div className="bg-white/[0.02] p-8 rounded-3xl border border-white/5 space-y-4 shadow-inner">
                     <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Site Matrix</span>
                        <span className="text-xs font-bold text-white uppercase italic tracking-tighter">{device.site_name || 'VOID'}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rack & Slot</span>
                        <span className="text-xs font-bold text-white uppercase italic tracking-tighter">{device.rack_name || 'N/A'} U{device.u_start || '–'}</span>
                     </div>
                  </div>
               </div>
            </div>
          )}
          {tab === 'Audit Trail' && <AuditPeekTab deviceId={device.id} />}
          {tab === 'Logic Matrix' && (
            <div className="py-24 text-center opacity-30 flex flex-col items-center">
               <Workflow size={48} className="mb-4 text-blue-400 animate-pulse" />
               <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">Dependency Graph Logic Initialized</p>
               <p className="text-[8px] font-bold uppercase mt-2 text-slate-500">Scanning for relationship vectors...</p>
            </div>
          )}
       </div>
    </div>
  )
}
