import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Trash2, Cpu, Package, X, RefreshCcw, Search, Edit2, LayoutGrid, List, FileJson, 
  Check, MoreVertical, Settings, Sliders, Globe, Eye, EyeOff, ArrowRightLeft, Tag, 
  AlertCircle, Layers, Maximize2, Columns, Layout, Table as TableIcon, Zap, 
  Activity, Shield, MousePointer2, ChevronRight, BarChart3, Terminal
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { apiFetch } from "../api/apiClient"
import { ConfigRegistryModal } from "./ConfigRegistry"
import { ConfirmationModal } from "./shared/ConfirmationModal"
import { StyledSelect } from "./shared/StyledSelect"
import { ServiceDetailsView, ServiceForm } from "./ServiceRegistry"

// --- Shared Components ---

const SharedServiceModals = ({ 
  activeDetails, 
  setActiveDetails, 
  activeEdit, 
  setActiveEdit, 
  options, 
  devices,
  onServiceUpdate
}: any) => {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = `/api/v1/logical-services/${data.id}`
      const res = await apiFetch(url, { method: "PUT", body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["logical-services"] })
      queryClient.invalidateQueries({ queryKey: ["device-services"] })
      toast.success("Service Registry Updated")
      setActiveEdit(null)
      onServiceUpdate?.()
    },
    onError: (e: any) => toast.error(e.message)
  })

  return (
    <>
      <AnimatePresence>
        {activeEdit && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-[800px] max-h-[90vh] overflow-y-auto p-12 rounded-[50px] border border-blue-500/30 custom-scrollbar">
               <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-8">
                  <h2 className="text-2xl font-black uppercase flex items-center space-x-4 text-blue-400 italic">
                     <Layers size={28}/> <span>Modify Service Vector</span>
                  </h2>
                  <button onClick={() => setActiveEdit(null)} className="p-2 hover:bg-white/10 rounded-xl text-slate-500 transition-colors"><X size={24}/></button>
               </div>
               <ServiceForm initialData={activeEdit} onSave={mutation.mutate} options={options} devices={devices} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeDetails && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-[900px] max-h-[85vh] overflow-hidden p-12 rounded-[50px] border border-blue-500/30 flex flex-col">
               <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-8">
                  <div>
                    <h2 className="text-3xl font-black uppercase text-blue-400 italic leading-none">{activeDetails.name}</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">{activeDetails.service_type} Matrix // Domain: {activeDetails.environment}</p>
                  </div>
                  <button onClick={() => setActiveDetails(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 transition-colors"><X size={32}/></button>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <ServiceDetailsView service={activeDetails} options={options} devices={devices} />
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

const AssetServicesTable = ({ deviceId, onViewDetails, onEdit }: any) => {
  const { data: services, isLoading } = useQuery({
    queryKey: ['device-services', deviceId],
    queryFn: async () => (await (await apiFetch(`/api/v1/logical-services/?device_id=${deviceId}`)).json())
  })

  return (
    <div className="overflow-hidden bg-black/20 rounded-3xl border border-white/5 shadow-inner">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500"><RefreshCcw size={24} className="animate-spin mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Scanning Logic Layers...</p></div>
      ) : (
        <table className="w-full text-[11px]">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-slate-500">Service Instance</th>
              <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-slate-500">Class</th>
              <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-slate-500">State</th>
              <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-slate-500">Domain</th>
              <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-slate-500">Build</th>
              <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-slate-500">Ops</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {services?.map((s: any) => (
              <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4 font-black text-blue-400 uppercase tracking-tighter group-hover:pl-8 transition-all">{s.name}</td>
                <td className="px-6 py-4 text-slate-400 font-bold uppercase text-[9px]">{s.service_type}</td>
                <td className="px-6 py-4 text-center">
                   <span className={`px-2.5 py-1 rounded text-[8px] font-black uppercase border ${
                      s.status === 'Running' || s.status === 'Active' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-rose-400 border-rose-500/20 bg-rose-500/10'
                   }`}>{s.status}</span>
                </td>
                <td className="px-6 py-4 text-center text-slate-500 font-black uppercase">{s.environment}</td>
                <td className="px-6 py-4 text-center font-mono text-slate-600">{s.version || '–'}</td>
                <td className="px-6 py-4 text-center">
                   <div className="flex items-center justify-center space-x-2">
                     <button onClick={() => onViewDetails(s)} className="p-2 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Maximize2 size={14}/></button>
                     <button onClick={() => onEdit(s)} className="p-2 bg-emerald-600/10 text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><Edit2 size={14}/></button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function AssetGrid() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'grid' | 'split'>('grid')
  const [activeTab, setActiveTab] = useState('inventory')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [activeDetails, setActiveDetails] = useState<any>(null)
  const [activeModal, setActiveModal] = useState<any>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  // Split View Hover State
  const [hoveredAsset, setHoveredAsset] = useState<any>(null)

  // Shared Modal States
  const [activeServiceDetails, setActiveServiceDetails] = useState<any>(null)
  const [activeServiceEdit, setActiveServiceEdit] = useState<any>(null)

  const { data: assets, isLoading } = useQuery({ 
    queryKey: ['assets'], 
    queryFn: async () => (await apiFetch('/api/v1/devices/?include_deleted=true')).json() 
  })
  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) })
  const { data: devicesAll } = useQuery({ queryKey: ["devices-list-all"], queryFn: async () => (await (await apiFetch("/api/v1/devices/")).json()) })

  const inventoryAssets = useMemo(() => assets?.filter((a: any) => !a.is_deleted) || [], [assets])
  const deletedAssets = useMemo(() => assets?.filter((a: any) => a.is_deleted) || [], [assets])
  const currentAssets = activeTab === 'inventory' ? inventoryAssets : deletedAssets

  // Set initial hovered asset for split view
  useEffect(() => {
    if (currentAssets.length > 0 && !hoveredAsset) {
      setHoveredAsset(currentAssets[0])
    }
  }, [currentAssets, hoveredAsset])

  const openConfirm = (title: string, message: string, onConfirm: () => void, variant: any = 'danger') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, variant })
  }

  const mutation = useMutation({
    mutationFn: async ({ data, id }: any) => {
      const url = id ? `/api/v1/devices/${id}` : '/api/v1/devices/'
      const method = id ? 'PUT' : 'POST'
      return (await apiFetch(url, { method, body: JSON.stringify(data) })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      setActiveModal(null); setActiveDetails(null)
      toast.success('Asset Matrix Synchronized')
    }
  })

  const bulkMutation = useMutation({
    mutationFn: async ({ action, payload }: any) => {
      const res = await apiFetch('/api/v1/devices/bulk-action', { 
        method: 'POST', body: JSON.stringify({ ids: selectedIds, action, payload }) 
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      setSelectedIds([]); setShowBulkMenu(false); toast.success('Operation Complete')
    }
  })

  const columnDefs = useMemo(() => [
    { field: "id", headerName: "", width: 50, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left' },
    { 
      field: "name", 
      headerName: "Node", 
      flex: 1.2, 
      pinned: 'left',
      cellClass: 'font-black text-blue-400 uppercase tracking-tighter cursor-pointer hover:text-blue-300 transition-colors',
      onCellClicked: (p: any) => setActiveDetails(p.data)
    },
    { field: "system", headerName: "System", width: 110, cellClass: 'text-center' },
    { 
      field: "type", 
      headerName: "Type", 
      width: 80,
      cellRenderer: (p: any) => <span className="font-black uppercase text-[9px] text-slate-500">{p.value}</span>
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 90,
      cellRenderer: (p: any) => (
        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
          p.value === 'Active' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-slate-400 border-white/10'
        }`}>{p.value}</span>
      )
    },
    { field: "environment", headerName: "Env", width: 80, cellClass: 'text-center' },
    { field: "os_name", headerName: "OS", width: 80, cellClass: 'text-center' },
    { field: "management_ip", headerName: "Mgmt IP", width: 120, cellClass: 'font-mono text-[10px] text-blue-300' },
    { field: "owner", headerName: "Owner", width: 100 },
    {
      headerName: "Ops",
      width: 100,
      pinned: 'right',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <button onClick={() => setActiveDetails(p.data)} className="p-1.5 hover:bg-blue-600/20 text-blue-400 rounded-lg"><Maximize2 size={14}/></button>
           <button onClick={() => setActiveModal(p.data)} className="p-1.5 hover:bg-emerald-600/20 text-emerald-400 rounded-lg"><Edit2 size={14}/></button>
        </div>
      )
    }
  ], [])

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Dynamic View Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-10">
           <div className="flex flex-col">
              <h1 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">Matrix Inventory</h1>
              <div className="h-1 w-16 bg-blue-600 mt-2 rounded-full shadow-[0_0_10px_#3b82f6]" />
           </div>
           <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
                <button onClick={() => { setActiveTab('inventory'); setSelectedIds([]) }} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    Operational ({inventoryAssets.length})
                </button>
                <button onClick={() => { setActiveTab('deleted'); setSelectedIds([]) }} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'deleted' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    Purged ({deletedAssets.length})
                </button>
           </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
             <button 
               onClick={() => setViewMode('grid')} 
               className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
               title="Golden Standard Grid"
             >
                <TableIcon size={18} />
             </button>
             <button 
               onClick={() => setViewMode('split')} 
               className={`p-2 rounded-xl transition-all ${viewMode === 'split' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
               title="Split Intelligence HUD"
             >
                <Columns size={18} />
             </button>
          </div>

          <div className="relative group">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors" />
             <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Query Matrix..." className="bg-white/5 border border-white/5 rounded-2xl pl-12 pr-6 py-3 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-72 transition-all" />
          </div>
          
          <button onClick={() => setActiveModal({})} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ Register Node</button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div 
            key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex-1 glass-panel rounded-[40px] overflow-hidden ag-theme-alpine-dark relative border-white/5 shadow-2xl"
          >
            {isLoading && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md space-y-4 text-blue-400"><RefreshCcw size={32} className="animate-spin" /><p className="text-[10px] font-black uppercase tracking-[0.3em]">Synchronizing Matrix...</p></div>}
            <AgGridReact 
              rowData={currentAssets} columnDefs={columnDefs as any}
              defaultColDef={{ resizable: true, filter: true, sortable: true, flex: 1, minWidth: 100 }}
              rowSelection="multiple" headerHeight={45} rowHeight={45}
              onSelectionChanged={e => setSelectedIds(e.api.getSelectedNodes().map(n => n.data.id))}
              quickFilterText={searchTerm} animateRows={true}
            />
          </motion.div>
        ) : (
          <motion.div 
            key="split" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex space-x-6 min-h-0"
          >
             {/* Left List Pane */}
             <div className="w-[400px] glass-panel rounded-[40px] border-white/5 flex flex-col overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 bg-black/20 flex items-center justify-between">
                   <h3 className="text-xs font-black uppercase tracking-widest text-white italic">Vector Queue</h3>
                   <span className="text-[10px] font-black text-slate-500 uppercase">{currentAssets.length} In-Scope</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                   {currentAssets.map((a: any) => (
                     <div 
                       key={a.id} onMouseEnter={()=>setHoveredAsset(a)}
                       onClick={()=>setActiveDetails(a)}
                       className={`p-4 rounded-2xl border cursor-pointer transition-all ${hoveredAsset?.id===a.id?'bg-blue-600 border-blue-500 text-white shadow-lg':'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                     >
                        <div className="flex items-center justify-between">
                           <span className="font-black uppercase italic tracking-tighter">{a.name}</span>
                           <span className="text-[8px] font-black uppercase opacity-60 tracking-widest">{a.system}</span>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             
             {/* Right HUD Pane */}
             <div className="flex-1 flex flex-col min-h-0 space-y-6">
                <AnimatePresence mode="wait">
                   {hoveredAsset && (
                     <motion.div 
                       key={hoveredAsset.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                       className="flex-1 glass-panel rounded-[50px] border-white/5 p-12 relative overflow-hidden flex flex-col shadow-2xl"
                     >
                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                           <BarChart3 size={300} className="text-blue-400" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                           <div className="flex items-start justify-between mb-12">
                              <div>
                                 <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white leading-none">{hoveredAsset.name}</h2>
                                 <div className="flex items-center space-x-4 mt-4">
                                    <span className="px-3 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-lg shadow-lg shadow-emerald-500/20">{hoveredAsset.status}</span>
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{hoveredAsset.type} // {hoveredAsset.environment}</span>
                                 </div>
                              </div>
                              <div className="flex space-x-2">
                                 <button onClick={()=>setActiveModal(hoveredAsset)} className="p-4 bg-white/5 hover:bg-blue-600 rounded-3xl text-white transition-all shadow-xl"><Edit2 size={24}/></button>
                                 <button onClick={()=>setActiveDetails(hoveredAsset)} className="p-4 bg-white/5 hover:bg-blue-600 rounded-3xl text-white transition-all shadow-xl"><Maximize2 size={24}/></button>
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-12 mb-12">
                              <div className="space-y-6">
                                 <div className="space-y-1">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Global Administrative Reference</span>
                                    <p className="text-lg font-bold text-white">{hoveredAsset.owner || 'N/A'} // {hoveredAsset.business_unit || 'N/A'}</p>
                                 </div>
                                 <div className="space-y-1">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Network Interface Payload</span>
                                    <p className="text-2xl font-mono font-black text-blue-400 italic leading-none">{hoveredAsset.management_ip || 'VOID'}</p>
                                 </div>
                              </div>
                              <div className="space-y-6">
                                 <div className="space-y-1">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Hardware Specifications</span>
                                    <p className="text-lg font-bold text-white uppercase">{hoveredAsset.manufacturer} {hoveredAsset.model}</p>
                                 </div>
                                 <div className="space-y-1">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Matrix Registry Info</span>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">SN: {hoveredAsset.serial_number} // AT: {hoveredAsset.asset_tag}</p>
                                 </div>
                              </div>
                           </div>
                           
                           <div className="flex-1 bg-black/40 rounded-[3rem] border border-white/5 p-8 flex items-center justify-center text-center shadow-inner group overflow-hidden">
                              <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="relative z-10 flex flex-col items-center">
                                 <Terminal size={40} className="text-blue-500/40 mb-4 group-hover:text-blue-400 transition-colors" />
                                 <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.4em]">Live Intelligence Matrix Ready</p>
                                 <p className="text-[9px] font-bold text-slate-700 uppercase mt-2 italic opacity-60">Scanning for active telemetry vectors...</p>
                              </div>
                           </div>
                        </div>
                     </motion.div>
                   )}
                </AnimatePresence>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shared Modals */}
      <AnimatePresence>
        {activeDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-full max-w-6xl max-h-[90vh] flex flex-col p-12 rounded-[60px] border-blue-500/30 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-10 mb-10">
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
                   <AssetDetailsView 
                     device={activeDetails} 
                     options={options} 
                     onViewServiceDetails={(s:any)=>setActiveServiceDetails(s)}
                     onEditService={(s:any)=>setActiveServiceEdit(s)}
                   />
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-12 rounded-[60px] border-blue-500/30 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-10 mb-10">
                   <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white flex items-center space-x-6">
                      <div className="p-5 bg-blue-600/10 rounded-[2.5rem] text-blue-400 shadow-inner"><Server size={28}/></div>
                      <span>{activeModal.id ? 'Modify Registry Entry' : 'Register New Matrix Node'}</span>
                   </h2>
                   <button onClick={() => setActiveModal(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 transition-all"><X size={32}/></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-6">
                   <AssetForm 
                     initialData={activeModal} 
                     onSave={({data}: any) => mutation.mutate({ data, id: activeModal.id })} 
                     options={options} 
                     isSaving={mutation.isPending} 
                   />
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SharedServiceModals 
        activeDetails={activeServiceDetails} setActiveDetails={setActiveServiceDetails}
        activeEdit={activeServiceEdit} setActiveEdit={setActiveServiceEdit}
        options={options} devices={devicesAll}
        onServiceUpdate={() => queryClient.invalidateQueries({ queryKey: ['device-services'] })}
      />

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(255,255,255,0.03);
          --ag-border-color: rgba(255,255,255,0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 11px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.15em !important; font-size: 10px !important; justify-content: center !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; }
      `}</style>
    </div>
  )
}

// --- Full Details View (Synchronized) ---

const AssetDetailsView = ({ device, options, onViewServiceDetails, onEditService }: any) => {
    const [tab, setTab] = useState('hardware')
    const queryClient = useQueryClient()
    const [metadata, setMetadata] = useState(device.metadata_json || {})
    const [metadataError, setMetadataError] = useState<string | null>(null)

    const metaMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiFetch(`/api/v1/devices/${device.id}`, {
                method: 'PUT', body: JSON.stringify({ metadata_json: data })
            })
            if (!res.ok) throw new Error(await res.text())
            return res.json()
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets'] }); toast.success('Intelligence Matrix Synchronized') },
        onError: (e: any) => toast.error(e.message || 'Failed to save metadata')
    })

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-between">
                <div className="flex space-x-2 bg-black/40 p-1.5 rounded-[2rem] w-fit border border-white/5">
                    {['hardware', 'secrets', 'relations', 'services', 'metadata'].map(t => (
                        <button key={t} onClick={() => setTab(t)} className={`px-10 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}>
                            {t}
                        </button>
                    ))}
                </div>
                {tab === 'metadata' && (
                    <button
                      disabled={!!metadataError || metaMutation.isPending}
                      onClick={() => metaMutation.mutate(metadata)}
                      className={`px-8 py-3 ${metadataError || metaMutation.isPending ? 'bg-slate-700 opacity-50' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 shadow-xl'} text-white rounded-[1.5rem] text-[11px] font-black uppercase active:scale-95 transition-all flex items-center space-x-3`}
                    >
                      {metaMutation.isPending ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>Synchronize Matrix</span>
                    </button>
                )}
            </div>
            
            <div className="glass-panel rounded-[50px] border-white/5 overflow-hidden p-10 bg-white/[0.01] shadow-inner">
                {tab === 'metadata' && <MetadataEditor value={metadata} onChange={setMetadata} onError={setMetadataError} />}
                {tab === 'hardware' && <HWTab deviceId={device.id} />}
                {tab === 'secrets' && <SecretsTab deviceId={device.id} />}
                {tab === 'relations' && <RelationshipsTab deviceId={device.id} />}
                {tab === 'services' && <AssetServicesTable deviceId={device.id} onViewDetails={onViewServiceDetails} onEdit={onEditService} />}
            </div>
        </div>
    )
}

const HWTab = ({ deviceId }: any) => (
  <div className="py-20 text-center opacity-30 flex flex-col items-center">
     <Cpu size={48} className="mb-4" />
     <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">Hardware Intelligence Vector Null</p>
  </div>
)
const SecretsTab = ({ deviceId }: any) => (
  <div className="py-20 text-center opacity-30 flex flex-col items-center">
     <Shield size={48} className="mb-4" />
     <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">Encrypted Payload Matrix Restricted</p>
  </div>
)
const RelationshipsTab = ({ deviceId }: any) => (
  <div className="py-20 text-center opacity-30 flex flex-col items-center">
     <ArrowRightLeft size={48} className="mb-4" />
     <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">Relationship Graph Not Initialized</p>
  </div>
)

const MetadataEditor = ({ value, onChange, onError }: any) => {
  const [json, setJson] = useState(() => JSON.stringify(value || {}, null, 2))
  useEffect(() => {
    try {
      const obj = JSON.parse(json)
      onChange(obj); onError(null)
    } catch (e) {
      onError("Invalid JSON Payload")
    }
  }, [json])

  return (
    <div className="space-y-4">
       <div className="flex items-center space-x-3 text-blue-400 mb-2">
          <FileJson size={20} />
          <span className="text-[11px] font-black uppercase tracking-[0.3em]">JSON Metadata Interface</span>
       </div>
       <textarea 
         value={json} onChange={e=>setJson(e.target.value)} 
         className="w-full h-96 bg-black/40 border border-white/10 rounded-[2.5rem] p-10 text-[12px] font-mono text-blue-300 outline-none focus:border-blue-500 shadow-inner"
       />
    </div>
  )
}

const AssetForm = ({ initialData, onSave, options, isSaving }: any) => {
  const [activeSubTab, setActiveSubTab] = useState('config')
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '', system: '', type: 'Physical', status: 'Active', environment: 'Production',
    owner: '', business_unit: '', manufacturer: '', model: '', serial_number: '', asset_tag: '',
    os_name: '', os_version: '',
    power_typical_w: 0, power_max_w: 0,
    metadata_json: {}, ...initialData
  })

  useEffect(() => {
    setFormData({
      name: '', system: '', type: 'Physical', status: 'Active', environment: 'Production',
      owner: '', business_unit: '', manufacturer: '', model: '', serial_number: '', asset_tag: '',
      os_name: '', os_version: '',
      power_typical_w: 0, power_max_w: 0,
      metadata_json: {}, ...initialData
    })
  }, [JSON.stringify(initialData)])

  const getOptions = (cat: string) => Array.isArray(options) ? options.filter((o: any) => o.category === cat) : []

  return (
    <div className="space-y-6 py-6 text-left">
      <div className="flex space-x-1 bg-black/40 p-1 rounded-2xl w-fit mb-4 border border-white/5">
         {['config', 'hardware', 'secrets', 'relations', 'metadata'].map(t => {
           const isDisabled = !formData.id && ['hardware', 'secrets', 'relations'].includes(t)
           return (
           <button
             key={t}
             onClick={() => !isDisabled && setActiveSubTab(t)}
             disabled={isDisabled}
             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDisabled ? 'opacity-20 cursor-not-allowed' : ''} ${activeSubTab === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
             {t === 'config' ? 'Base Config' : t === 'relations' ? 'Relationships' : t}
           </button>
         )
         })}
      </div>

      {activeSubTab === 'config' && (
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 space-y-6">
             <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-[0.3em] border-l-4 border-blue-600 pl-4 italic">Identity Matrix</h3>
             <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-6">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase block ml-1">Node Hostname</label>
                    <input 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className={`w-full bg-slate-900 border ${!formData.name ? 'border-rose-500/30' : 'border-white/10'} rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all`} 
                      placeholder="SRV-NAME-01" 
                    />
                </div>
                <StyledSelect
                    label="Logical System Domain"
                    value={formData.system}
                    onChange={e => setFormData({...formData, system: e.target.value})}
                    options={getOptions('LogicalSystem')}
                    placeholder="Select System..."
                />
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-2 ml-1">Owner</label>
                        <input value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500/50" />
                    </div>
                    <StyledSelect
                        label="Business Unit"
                        value={formData.business_unit}
                        onChange={e => setFormData({...formData, business_unit: e.target.value})}
                        options={getOptions('BusinessUnit')}
                    />
                </div>
             </div>
          </div>

          <div className="col-span-1 space-y-6">
             <h3 className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.3em] border-l-4 border-emerald-600 pl-4 italic">Classification Vector</h3>
             <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <StyledSelect label="Asset Type" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} options={ASSET_TYPES} />
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase block ml-1">Vertical Height (U)</label>
                        <input type="number" value={formData.size_u || 1} onChange={e => setFormData({...formData, size_u: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-xs font-mono text-white outline-none focus:border-blue-500" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <StyledSelect label="Operational State" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={STATUS_ITEMS} />
                    <StyledSelect label="Environment Matrix" value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})} options={ENVIRONMENT_ITEMS} />
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase block ml-1">Authorization / License</label>
                    <input value={formData.license_type || ""} onChange={e => setFormData({...formData, license_type: e.target.value})} placeholder="e.g. CORE_BASED_LIC" className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500/50" />
                </div>
             </div>
          </div>

          <div className="col-span-1 space-y-6">
             <h3 className="text-[10px] font-black uppercase text-amber-400 tracking-[0.3em] border-l-4 border-amber-600 pl-4 italic">Hardware Spec Matrix</h3>
             <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase block ml-1">Manufacturer</label>
                      <input value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase block ml-1">Model ID</label>
                      <input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase block ml-1">OS Kernel</label>
                      <input value={formData.os_name} onChange={e => setFormData({...formData, os_name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase block ml-1">Build Version</label>
                      <input value={formData.os_version} onChange={e => setFormData({...formData, os_version: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none" />
                   </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-[9px] font-black text-blue-400 uppercase block ml-1">Power Vector (Watts)</label>
                    <div className="flex space-x-4">
                        <div className="flex-1">
                          <input type="number" step={0.1} value={formData.power_typical_w || 0} onChange={e => setFormData({...formData, power_typical_w: parseFloat(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2 text-xs font-mono text-emerald-400 outline-none" />
                          <label className="text-[7px] font-black text-slate-600 uppercase mt-1 block text-center">Typical</label>
                        </div>
                        <div className="flex-1">
                          <input type="number" step={0.1} value={formData.power_max_w || 0} onChange={e => setFormData({...formData, power_max_w: parseFloat(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2 text-xs font-mono text-rose-400 outline-none" />
                          <label className="text-[7px] font-black text-slate-600 uppercase mt-1 block text-center">Peak Max</label>
                        </div>
                    </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeSubTab === 'metadata' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <MetadataEditor value={formData.metadata_json} onChange={v => setFormData({...formData, metadata_json: v})} onError={setMetadataError} />
        </div>
      )}

      {activeSubTab === 'hardware' && <HWTab />}
      {activeSubTab === 'secrets' && <SecretsTab />}
      {activeSubTab === 'relations' && <RelationshipsTab />}

      <div className="flex space-x-4 pt-8 border-t border-white/5 mt-8">
        <button
          disabled={!!metadataError || isSaving}
          onClick={() => {
            if(!formData.name || !formData.system) return toast.error("Identity Matrix Incomplete");
            onSave({ data: formData })
          }}
          className={`flex-1 py-5 ${metadataError || isSaving ? 'bg-slate-800 opacity-50' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20 shadow-xl'} text-white rounded-[2rem] text-[12px] font-black uppercase tracking-[0.3em] active:scale-95 transition-all flex items-center justify-center space-x-3`}
        >
          {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
          <span>Commit Registry Payload</span>
        </button>
      </div>
    </div>
  )
}
