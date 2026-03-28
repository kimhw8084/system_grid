import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Trash2, Cpu, Package, X, RefreshCcw, Search, Edit2, LayoutGrid, List, FileJson, 
  Check, MoreVertical, Settings, Sliders, Globe, Eye, EyeOff, ArrowRightLeft, Tag, 
  AlertCircle, Layers, Maximize2, Columns, Layout, Table as TableIcon, Zap, 
  Activity, Shield, MousePointer2, ChevronRight, BarChart3, Terminal, Server
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
      const method = "PUT"
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-[800px] max-h-[90vh] overflow-y-auto p-10 rounded-[40px] border border-blue-500/30 custom-scrollbar">
               <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <h2 className="text-2xl font-black uppercase flex items-center space-x-4 text-blue-400">
                     <Layers size={28}/> <span>Modify Service Configuration</span>
                  </h2>
                  <button onClick={() => setActiveEdit(null)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
               </div>
               <ServiceForm initialData={activeEdit} onSave={mutation.mutate} options={options} devices={devices} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeDetails && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-[900px] max-h-[85vh] overflow-hidden p-10 rounded-[40px] border border-blue-500/30 flex flex-col">
               <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <div>
                    <h2 className="text-2xl font-black uppercase text-blue-400">{activeDetails.name}</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{activeDetails.service_type} // {activeDetails.environment}</p>
                  </div>
                  <button onClick={() => setActiveDetails(null)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar pt-6">
                  <ServiceDetailsView service={activeDetails} options={options} devices={devices} />
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

const AssetServicesTable = ({ deviceId, onViewDetails, onEdit }: { deviceId: number, onViewDetails: (s: any) => void, onEdit: (s: any) => void }) => {
  const { data: services, isLoading } = useQuery({
    queryKey: ['device-services', deviceId],
    queryFn: async () => (await (await apiFetch(`/api/v1/logical-services/?device_id=${deviceId}`)).json())
  })

  return (
    <div className="p-0 overflow-hidden">
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <RefreshCcw size={20} className="animate-spin mb-2" />
          <p className="text-[10px] font-black uppercase">Loading services...</p>
        </div>
      )}
      {!isLoading && (<table className="w-full text-[10px]">
        <thead className="bg-white/5 border-b border-white/5">
          <tr>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Service Name</th>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Type</th>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Status</th>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Environment</th>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Version</th>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {services?.map((s: any) => (
            <tr key={s.id} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 font-bold text-blue-400">{s.name}</td>
              <td className="px-4 py-3 text-slate-400 uppercase font-black text-[9px]">{s.service_type}</td>
              <td className="px-4 py-3 text-center">
                 <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                    s.status === 'Running' || s.status === 'Active' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                    s.status === 'Stopped' ? 'text-slate-400 border-slate-500/20 bg-slate-500/5' :
                    s.status === 'Maintenance' ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' :
                    'text-rose-400 border-rose-500/20 bg-rose-500/5'
                 }`}>{s.status}</span>
              </td>
              <td className="px-4 py-3 text-center text-slate-500 uppercase font-bold">{s.environment}</td>
              <td className="px-4 py-3 text-center font-mono text-slate-600">{s.version || 'N/A'}</td>
              <td className="px-4 py-3 text-center">
                 <div className="flex items-center justify-center space-x-1">
                   <button
                     onClick={() => onViewDetails(s)}
                     className="p-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-600/20 transition-all flex items-center justify-center space-x-1"
                     title="View Service Forensics"
                   >
                     <List size={14}/>
                   </button>
                   <button
                     onClick={() => onEdit(s)}
                     className="p-1.5 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-600/20 transition-all flex items-center justify-center"
                     title="Edit Service Instance"
                   >
                     <Edit2 size={14}/>
                   </button>
                 </div>
              </td>
            </tr>
          ))}
          {!services?.length && !isLoading && (
            <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-600 font-bold uppercase italic tracking-widest">No logical services bound to this asset</td></tr>
          )}
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

  // Shared Service Modal States
  const [activeServiceDetails, setActiveServiceDetails] = useState<any>(null)
  const [activeServiceEdit, setActiveServiceEdit] = useState<any>(null)

  const { data: assets, isLoading } = useQuery({ 
    queryKey: ['assets'], 
    queryFn: async () => (await apiFetch('/api/v1/devices/?include_deleted=true')).json() 
  })
  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) })
  const { data: devicesAll } = useQuery({ 
    queryKey: ["devices-list-all"], 
    queryFn: async () => (await (await apiFetch("/api/v1/devices/")).json()) 
  })

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
    { field: "id", headerName: "", width: 60, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left', cellClass: 'text-center pl-4', headerClass: 'text-center pl-4' },
    { 
      field: "name", 
      headerName: "Node", 
      flex: 1.2, 
      pinned: 'left',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <span className="font-bold text-blue-400">{p.value}</span>
      )
    },
    { field: "system", headerName: "System", width: 110, cellClass: 'text-center', headerClass: 'text-center' },
    { 
      field: "type", 
      headerName: "Type", 
      width: 80,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = {
          Physical: 'text-emerald-400',
          Virtual: 'text-blue-400',
          Storage: 'text-amber-400',
          Switch: 'text-rose-400',
          Firewall: 'text-orange-400',
          'Load Balancer': 'text-purple-400'
        }
        return <span className={`font-black uppercase text-[9px] ${colors[p.value] || 'text-slate-500'}`}>{p.value}</span>
      }
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 90,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = {
          Active: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
          Maintenance: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
          Decommissioned: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
          Planned: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
          Standby: 'text-sky-400 border-sky-500/20 bg-sky-500/5',
          Offline: 'text-slate-400 border-slate-500/20 bg-slate-500/5'
        }
        return <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${colors[p.value] || 'text-slate-400 border-slate-500/20 bg-slate-500/5'}`}>{p.value}</span>
      }
    },
    { field: "environment", headerName: "Env", width: 80, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "owner", headerName: "Owner", width: 100, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "manufacturer", headerName: "Make", width: 80, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "model", headerName: "Model", width: 90, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "os_name", headerName: "OS", width: 80, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "os_version", headerName: "Ver", width: 60, cellClass: 'text-center', headerClass: 'text-center' },
    { 
      field: "license_type", 
      headerName: "Auth", 
      width: 100, 
      cellClass: 'text-center', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? (
        <span className="text-[9px] font-black text-amber-400 uppercase tracking-tighter bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{p.value}</span>
      ) : <span className="text-slate-700 italic text-[8px]">N/A</span>
    },
    { 
      field: "expiry_date", 
      headerName: "Expiry", 
      width: 100, 
      cellClass: 'text-center', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        if (!p.value) return <span className="text-slate-700 italic text-[8px]">N/A</span>
        const d = new Date(p.value)
        return <span className="text-[9px] font-mono text-slate-400">{d.toLocaleDateString()}</span>
      }
    },
    { field: "site_name", headerName: "Site", width: 100, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "rack_name", headerName: "Rack", width: 80, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "u_start", headerName: "U Pos", width: 50, cellClass: "font-mono text-center", headerClass: 'text-center' },
    { field: "size_u", headerName: "Size", width: 50, cellClass: "font-mono text-center", headerClass: 'text-center' },
    { field: "power_typical_w", headerName: "Avg W", width: 70, cellClass: "font-mono text-center", headerClass: 'text-center', cellRenderer: (p: any) => p.value ? `${p.value.toFixed(0)}W` : '–' },
    { field: "power_max_w", headerName: "Max W", width: 70, cellClass: "font-mono text-center", headerClass: 'text-center', cellRenderer: (p: any) => p.value ? `${p.value.toFixed(0)}W` : '–' },
    {
      headerName: "Ops",
      width: 100,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <button onClick={() => setActiveDetails(p.data)} className="p-1.5 hover:bg-blue-600/20 text-blue-400 rounded-lg"><Maximize2 size={14}/></button>
           <button onClick={() => setActiveModal(p.data)} className="p-1.5 hover:bg-emerald-600/20 text-emerald-400 rounded-lg"><Edit2 size={14}/></button>
        </div>
      )
    }
  ], [])

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* View Switcher Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic">Asset Inventory</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Infrastructure Asset Registry</p>
           </div>
           <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                <button onClick={() => { setActiveTab('inventory'); setSelectedIds([]) }} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                    Operational ({inventoryAssets.length})
                </button>
                <button onClick={() => { setActiveTab('deleted'); setSelectedIds([]) }} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'deleted' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                    Purged ({deletedAssets.length})
                </button>
           </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Toggle View Mode */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
             <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`} title="Grid Mode"><TableIcon size={16}/></button>
             <button onClick={() => setViewMode('split')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'split' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`} title="Split Mode"><Columns size={16}/></button>
          </div>

          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search assets..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>
          
          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5">
             <button onClick={() => setShowConfig(true)} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Registry Config">
                <Settings size={16} />
             </button>
          </div>

          <div className="relative bulk-menu-container">
            <button onClick={() => setShowBulkMenu(!showBulkMenu)} disabled={selectedIds.length === 0} className={`p-1.5 rounded-xl border transition-all ${selectedIds.length > 0 ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-slate-700 cursor-not-allowed'}`}><MoreVertical size={18}/></button>
            <AnimatePresence>
              {showBulkMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-2 space-y-1">
                   <p className="px-3 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">{selectedIds.length} Assets Selected</p>
                   {activeTab === 'deleted' ? (
                     <button onClick={() => bulkMutation.mutate({ action: 'restore' })} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-emerald-400 transition-all">Restore Selected</button>
                   ) : (
                     <>
                        <button onClick={() => { /* setIsBulkStatusOpen(true); */ setShowBulkMenu(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-blue-400 transition-all">Set Status...</button>
                        <button onClick={() => { /* setIsBulkEnvOpen(true); */ setShowBulkMenu(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-slate-400 transition-all">Set Environment...</button>
                     </>
                   )}
                   <div className="h-px bg-white/5 mx-2 my-1" />
                   <button onClick={() => { 
                       const title = activeTab === 'deleted' ? 'Purge Assets' : 'Soft Delete'
                       const msg = activeTab === 'deleted' ? 'PURGE PERMANENTLY?' : 'Soft-delete assets?'
                       openConfirm(title, msg, () => bulkMutation.mutate({ action: activeTab === 'deleted' ? 'purge' : 'delete' }))
                    }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-rose-500/20 rounded-lg text-rose-500 transition-all">{activeTab === 'deleted' ? 'Bulk Purge' : 'Bulk Delete'}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={() => setActiveModal({})} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ Register Asset</button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div 
            key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative"
          >
            {isLoading && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4 text-blue-400"><RefreshCcw size={32} className="animate-spin" /><p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing asset registry...</p></div>}
            <AgGridReact 
              rowData={currentAssets} columnDefs={columnDefs as any}
              defaultColDef={{ resizable: true, filter: true, sortable: true, flex: 1, minWidth: 100 }}
              rowSelection="multiple" headerHeight={28} rowHeight={28}
              onSelectionChanged={e => setSelectedIds(e.api.getSelectedNodes().map(n => n.data.id))}
              quickFilterText={searchTerm} animateRows={true}
            />
          </motion.div>
        ) : (
          <motion.div 
            key="split" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex space-x-4 min-h-0"
          >
             {/* Master List (Left) */}
             <div className="w-80 glass-panel rounded-2xl flex flex-col overflow-hidden bg-slate-900/50">
                <div className="p-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
                   <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Vector Queue</h3>
                   <span className="text-[9px] font-black text-slate-600">{currentAssets.length} Nodes</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                   {currentAssets.map((a: any) => (
                     <div 
                       key={a.id} onMouseEnter={() => setHoveredAsset(a)}
                       onClick={() => setActiveDetails(a)}
                       className={`p-3 rounded-xl border cursor-pointer transition-all ${hoveredAsset?.id === a.id ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                     >
                        <div className="flex items-center justify-between">
                           <span className="text-[11px] font-black uppercase italic tracking-tighter">{a.name}</span>
                           <span className="text-[8px] font-bold opacity-60">{a.system}</span>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             
             {/* HUD Detail (Right) */}
             <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <AnimatePresence mode="wait">
                   {hoveredAsset && (
                     <motion.div 
                       key={hoveredAsset.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                       className="flex-1 glass-panel rounded-3xl border-white/5 p-8 relative overflow-hidden flex flex-col shadow-2xl bg-black/20"
                     >
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                           <BarChart3 size={200} className="text-blue-400" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                           <div className="flex items-start justify-between mb-8">
                              <div>
                                 <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none">{hoveredAsset.name}</h2>
                                 <div className="flex items-center space-x-3 mt-3">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${hoveredAsset.status === 'Active' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-slate-400 border-white/10'}`}>{hoveredAsset.status}</span>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{hoveredAsset.type} // {hoveredAsset.environment}</span>
                                 </div>
                              </div>
                              <div className="flex space-x-2">
                                 <button onClick={() => setActiveModal(hoveredAsset)} className="p-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit2 size={18}/></button>
                                 <button onClick={() => setActiveDetails(hoveredAsset)} className="p-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Maximize2 size={18}/></button>
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-8 mb-8">
                              <div className="space-y-4">
                                 <div className="space-y-1">
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Administrative Owner</span>
                                    <p className="text-sm font-bold text-slate-200 uppercase">{hoveredAsset.owner || 'N/A'} // {hoveredAsset.business_unit || 'N/A'}</p>
                                 </div>
                                 <div className="space-y-1">
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Primary Network Interface</span>
                                    <p className="text-xl font-mono font-black text-blue-400 italic leading-none">{hoveredAsset.management_ip || 'VOID'}</p>
                                 </div>
                              </div>
                              <div className="space-y-4">
                                 <div className="space-y-1">
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Hardware Specifications</span>
                                    <p className="text-sm font-bold text-slate-200 uppercase">{hoveredAsset.manufacturer} {hoveredAsset.model}</p>
                                 </div>
                                 <div className="space-y-1">
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Matrix Registry Info</span>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">SN: {hoveredAsset.serial_number} // AT: {hoveredAsset.asset_tag}</p>
                                 </div>
                              </div>
                           </div>
                           
                           <div className="flex-1 bg-black/40 rounded-3xl border border-white/5 p-6 flex items-center justify-center text-center shadow-inner group overflow-hidden">
                              <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="relative z-10 flex flex-col items-center">
                                 <Terminal size={32} className="text-blue-500/40 mb-3 group-hover:text-blue-400 transition-colors" />
                                 <p className="text-[9px] font-black uppercase text-slate-600 tracking-[0.4em]">Live Intelligence Matrix Ready</p>
                                 <p className="text-[8px] font-bold text-slate-700 uppercase mt-1 italic opacity-60">Scanning for active telemetry vectors...</p>
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

      <SharedServiceModals 
        activeDetails={activeServiceDetails} setActiveDetails={setActiveServiceDetails}
        activeEdit={activeServiceEdit} setActiveEdit={setActiveServiceEdit}
        options={options} devices={devicesAll}
        onServiceUpdate={() => queryClient.invalidateQueries({ queryKey: ['device-services'] })}
      />

      <AnimatePresence>
        {activeDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-full max-w-6xl max-h-[90vh] flex flex-col p-10 rounded-[40px] border-blue-500/30">
                <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-8">
                   <div className="flex items-center space-x-4">
                      <div className="p-4 bg-blue-600/10 rounded-[2rem] text-blue-400 shadow-inner"><Server size={28}/></div>
                      <div>
                         <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">{activeDetails.name}</h2>
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">{activeDetails.system} // {activeDetails.type} Node</p>
                      </div>
                   </div>
                   <button onClick={() => setActiveDetails(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 transition-all"><X size={28}/></button>
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
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-10 rounded-[40px] border-blue-500/30">
                <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-8">
                   <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white flex items-center space-x-4">
                      <div className="p-4 bg-blue-600/10 rounded-[2rem] text-blue-400 shadow-inner"><Server size={24}/></div>
                      <span>{activeModal.id ? 'Modify Registry Entry' : 'Register New Matrix Node'}</span>
                   </h2>
                   <button onClick={() => setActiveModal(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 transition-all"><X size={28}/></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
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

      <ConfigRegistryModal 
        isOpen={showConfig} 
        onClose={() => setShowConfig(false)} 
        title="Asset Registry Enumerations"
        sections={[
            { title: "Node Types", category: "DeviceType", icon: Cpu },
            { title: "Status Options", category: "Status", icon: RefreshCcw },
            { title: "Environments", category: "Environment", icon: Globe },
            { title: "Logical Systems", category: "LogicalSystem", icon: LayoutGrid },
            { title: "Business Units", category: "BusinessUnit", icon: Layers }
        ]}
      />

      <ConfirmationModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(15, 23, 42, 0.9);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 10px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-size: 9px !important; justify-content: center !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; padding-left: 8px !important; }
      `}</style>
    </div>
  )
}

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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex space-x-1 bg-black/40 p-1 rounded-2xl w-fit">
                    {['hardware', 'secrets', 'relations', 'services', 'metadata'].map(t => (
                        <button key={t} onClick={() => setTab(t)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                            {t}
                        </button>
                    ))}
                </div>
                {tab === 'metadata' && (
                    <button
                      disabled={!!metadataError || metaMutation.isPending}
                      onClick={() => metaMutation.mutate(metadata)}
                      className={`px-4 py-2 ${metadataError || metaMutation.isPending ? 'bg-slate-700' : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg active:scale-95'} text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center space-x-2`}
                    >
                      {metaMutation.isPending && <RefreshCcw size={12} className="animate-spin" />}
                      <span>Save Metadata</span>
                    </button>
                )}
            </div>
            <div className="glass-panel rounded-[30px] border-white/5 overflow-hidden p-6">
                {tab === 'metadata' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <MetadataEditor value={metadata} onChange={setMetadata} onError={setMetadataError} />
                  </div>
                )}
                {tab === 'hardware' && <HWTab deviceId={device.id} />}
                {tab === 'secrets' && <SecretsTab deviceId={device.id} />}
                {tab === 'relations' && <RelationshipsTab deviceId={device.id} />}
                {tab === 'services' && (
                  <AssetServicesTable 
                    deviceId={device.id} 
                    onViewDetails={onViewServiceDetails}
                    onEdit={onEditService}
                  />
                )}
            </div>
        </div>
    )
}

const HWTab = ({ deviceId }: any) => (
  <div className="py-12 text-center opacity-30 flex flex-col items-center">
     <Cpu size={32} className="mb-2" />
     <p className="text-[9px] font-black uppercase tracking-widest italic">Hardware Vector Null</p>
  </div>
)
const SecretsTab = ({ deviceId }: any) => (
  <div className="py-12 text-center opacity-30 flex flex-col items-center">
     <Shield size={32} className="mb-2" />
     <p className="text-[9px] font-black uppercase tracking-widest italic">Encrypted Matrix Restricted</p>
  </div>
)
const RelationshipsTab = ({ deviceId }: any) => (
  <div className="py-12 text-center opacity-30 flex flex-col items-center">
     <ArrowRightLeft size={32} className="mb-2" />
     <p className="text-[9px] font-black uppercase tracking-widest italic">Relationship Graph Not Initialized</p>
  </div>
)

const MetadataEditor = ({ value, onChange, onError }: any) => {
  const [json, setJson] = useState(() => JSON.stringify(value || {}, null, 2))
  useEffect(() => {
    try {
      const obj = JSON.parse(json)
      onChange(obj); onError(null)
    } catch (e) {
      onError("Invalid JSON")
    }
  }, [json])

  return (
    <div className="space-y-3">
       <div className="flex items-center space-x-2 text-blue-400">
          <FileJson size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Metadata JSON Payload</span>
       </div>
       <textarea 
         value={json} onChange={e=>setJson(e.target.value)} 
         className="w-full h-64 bg-black/40 border border-white/5 rounded-2xl p-6 text-[11px] font-mono text-blue-300 outline-none focus:border-blue-500 shadow-inner"
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
    <div className="space-y-6 py-4 text-left">
      <div className="flex space-x-1 bg-black/40 p-1 rounded-2xl w-fit mb-4">
         {['config', 'hardware', 'secrets', 'relations', 'metadata'].map(t => {
           const isDisabled = !formData.id && ['hardware', 'secrets', 'relations'].includes(t)
           return (
           <button
             key={t}
             onClick={() => !isDisabled && setActiveSubTab(t)}
             disabled={isDisabled}
             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDisabled ? 'opacity-20 cursor-not-allowed' : ''} ${activeSubTab === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
             {t === 'config' ? 'Base Config' : t}
           </button>
         )
         })}
      </div>

      {activeSubTab === 'config' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-4">
             <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-blue-600 pl-3">Identity</h3>
             <div className="space-y-3">
                <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Hostname *</label>
                    <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`w-full bg-slate-900 border ${!formData.name ? 'border-rose-500/50' : 'border-white/10'} rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500`} />
                </div>
                <StyledSelect label="Logical System *" value={formData.system} onChange={e => setFormData({...formData, system: e.target.value})} options={getOptions('LogicalSystem')} />
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Owner</label>
                        <input value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                    </div>
                    <StyledSelect label="Business Unit" value={formData.business_unit} onChange={e => setFormData({...formData, business_unit: e.target.value})} options={getOptions('BusinessUnit')} />
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-emerald-600 pl-3">Classification</h3>
             <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <StyledSelect label="Type" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} options={ASSET_TYPES} />
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Height (U)</label>
                        <input type="number" value={formData.size_u || 1} onChange={e => setFormData({...formData, size_u: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none" />
                    </div>
                </div>
                <StyledSelect label="Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={STATUS_ITEMS} />
                <StyledSelect label="Environment" value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})} options={ENVIRONMENT_ITEMS} />
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-amber-600 pl-3">Specs & Power</h3>
             <div className="space-y-3">
                <div className="flex space-x-2">
                   <div className="flex-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Make</label>
                      <input value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                   </div>
                   <div className="flex-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Model</label>
                      <input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                   </div>
                </div>
                <div className="flex space-x-2">
                   <div className="flex-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">OS</label>
                      <input value={formData.os_name} onChange={e => setFormData({...formData, os_name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                   </div>
                   <div className="flex-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Ver</label>
                      <input value={formData.os_version} onChange={e => setFormData({...formData, os_version: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    <div>
                      <label className="text-[8px] text-slate-500 uppercase block mb-1">Avg Watts</label>
                      <input type="number" step={0.1} value={formData.power_typical_w || 0} onChange={e => setFormData({...formData, power_typical_w: parseFloat(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-emerald-400 outline-none" />
                    </div>
                    <div>
                      <label className="text-[8px] text-slate-500 uppercase block mb-1">Max Watts</label>
                      <input type="number" step={0.1} value={formData.power_max_w || 0} onChange={e => setFormData({...formData, power_max_w: parseFloat(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-rose-400 outline-none" />
                    </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeSubTab === 'metadata' && <MetadataEditor value={formData.metadata_json} onChange={v => setFormData({...formData, metadata_json: v})} onError={setMetadataError} />}

      <div className="flex space-x-4 pt-6 border-t border-white/5">
        <button
          disabled={!!metadataError || isSaving}
          onClick={() => {
            if(!formData.name || !formData.system) return toast.error("Required fields missing");
            onSave({ data: formData })
          }}
          className={`flex-1 py-4 ${metadataError || isSaving ? 'bg-slate-800' : 'bg-blue-600 hover:bg-blue-500 shadow-xl'} text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2`}
        >
          {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
          <span>Commit Asset Record</span>
        </button>
      </div>
    </div>
  )
}
