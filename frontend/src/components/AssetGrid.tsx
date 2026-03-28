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

// --- Constants ---

const ASSET_TYPES = [
    { value: 'Physical', label: 'Physical' },
    { value: 'Virtual', label: 'Virtual' },
    { value: 'Storage', label: 'Storage' },
    { value: 'Switch', label: 'Switch' },
    { value: 'Firewall', label: 'Firewall' },
    { value: 'Load Balancer', label: 'Load Balancer' },
    { value: 'PDU', label: 'PDU' },
    { value: 'UPS', label: 'UPS' },
    { value: 'Patch Panel', label: 'Patch Panel' }
]

const STATUS_ITEMS = [
    { value: 'Planned', label: 'Planned' },
    { value: 'Active', label: 'Active' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Standby', label: 'Standby' },
    { value: 'Offline', label: 'Offline' },
    { value: 'Decommissioned', label: 'Decommissioned' }
]

const ENVIRONMENT_ITEMS = [
    { value: 'Production', label: 'Production' },
    { value: 'Staging', label: 'Staging' },
    { value: 'QA', label: 'QA' },
    { value: 'Dev', label: 'Dev' },
    { value: 'DR', label: 'DR' },
    { value: 'Lab', label: 'Lab' },
    { value: 'Sandbox', label: 'Sandbox' }
]

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
                    s.status === 'Running' || s.status === 'Active' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' :
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
  const [activeTab, setActiveTab] = useState<'inventory' | 'deleted'>('inventory')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
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

  const { inventoryAssets, deletedAssets } = useMemo(() => {
    if (!allAssets) return { inventoryAssets: [], deletedAssets: [] }
    return {
      inventoryAssets: allAssets.filter((a: any) => !a.is_deleted),
      deletedAssets: allAssets.filter((a: any) => a.is_deleted)
    }
  }, [allAssets])

  const assetsToDisplay = useMemo(() => {
    return activeTab === 'inventory' ? inventoryAssets : deletedAssets
  }, [activeTab, inventoryAssets, deletedAssets])

  // Set initial hovered asset for split view
  useEffect(() => {
    if (assetsToDisplay.length > 0 && !hoveredAsset) {
      setHoveredAsset(assetsToDisplay[0])
    }
  }, [assetsToDisplay, hoveredAsset])

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
      headerName: "name", 
      flex: 1.2, 
      pinned: 'left',
      cellClass: 'text-center',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      cellRenderer: (p: any) => (
        <span className="font-bold text-blue-400">{p.value}</span>
      )
    },
    { field: "system", headerName: "System", width: 110, cellClass: 'text-center', headerClass: 'text-center', filter: 'agTextColumnFilter' },
    { 
      field: "type", 
      headerName: "Type", 
      width: 80,
      cellClass: 'text-center',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
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
      width: 110,
      cellClass: 'text-center',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      cellRenderer: (p: any) => {
        const colors: any = {
          Active: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/20',
          Maintenance: 'text-amber-400 border-amber-500/40 bg-amber-500/20',
          Decommissioned: 'text-rose-400 border-rose-500/40 bg-rose-500/20',
          Planned: 'text-blue-400 border-blue-500/40 bg-blue-500/20',
          Standby: 'text-sky-400 border-sky-500/40 bg-sky-500/20',
          Offline: 'text-slate-400 border-white/20 bg-white/10'
        }
        return (
          <div className="flex items-center justify-center h-full">
            <div className={`flex items-center justify-center w-20 h-5 rounded-md border shadow-sm ${colors[p.value] || 'text-slate-400 border-white/10 bg-white/5'}`}>
              <span className="text-[7px] font-black uppercase tracking-tighter leading-none">
                {p.value}
              </span>
            </div>
          </div>
        )
      }
    },
    { field: "environment", headerName: "Env", width: 80, cellClass: 'text-center', headerClass: 'text-center', filter: 'agTextColumnFilter' },
    { field: "owner", headerName: "Owner", width: 100, cellClass: 'text-center', headerClass: 'text-center', filter: 'agTextColumnFilter' },
    { field: "manufacturer", headerName: "Make", width: 80, cellClass: 'text-center', headerClass: 'text-center', filter: 'agTextColumnFilter' },
    { field: "model", headerName: "Model", width: 90, cellClass: 'text-center', headerClass: 'text-center', filter: 'agTextColumnFilter' },
    { field: "os_name", headerName: "OS", width: 80, cellClass: 'text-center', headerClass: 'text-center', filter: 'agTextColumnFilter' },
    { field: "os_version", headerName: "Ver", width: 60, cellClass: 'text-center', headerClass: 'text-center', filter: 'agTextColumnFilter' },
    { 
      field: "license_type", 
      headerName: "Auth", 
      width: 100, 
      cellClass: 'text-center', 
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
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
      filter: 'agDateColumnFilter',
      cellRenderer: (p: any) => {
        if (!p.value) return <span className="text-slate-700 italic text-[8px]">N/A</span>
        const d = new Date(p.value)
        return <span className="text-[9px] font-mono text-slate-400">{d.toLocaleDateString()}</span>
      }
    },
    { field: "site_name", headerName: "Site", width: 100, cellClass: 'text-center', headerClass: 'text-center', filter: 'agTextColumnFilter' },
    { field: "rack_name", headerName: "Rack", width: 80, cellClass: 'text-center', headerClass: 'text-center', filter: 'agTextColumnFilter' },
    { field: "u_start", headerName: "U Pos", width: 50, cellClass: "font-mono text-center", headerClass: 'text-center', filter: 'agNumberColumnFilter' },
    { field: "size_u", headerName: "Size", width: 50, cellClass: "font-mono text-center", headerClass: 'text-center', filter: 'agNumberColumnFilter' },
    { field: "power_typical_w", headerName: "Avg W", width: 70, cellClass: "font-mono text-center", headerClass: 'text-center', cellRenderer: (p: any) => p.value ? `${p.value.toFixed(0)}W` : '–' },
    { field: "power_max_w", headerName: "Max W", width: 70, cellClass: "font-mono text-center", headerClass: 'text-center', cellRenderer: (p: any) => p.value ? `${p.value.toFixed(0)}W` : '–' },
    {
      headerName: "Action",
      width: 100,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex rounded-lg p-0.5 border border-white/5 bg-transparent">
               <button onClick={() => setActiveDetails(p.data)} title="View Details" className="p-1.5 text-blue-400 hover:text-blue-200 transition-all hover:scale-125"><Eye size={14}/></button>
               <button onClick={() => setActiveModal(p.data)} title="Edit Configuration" className="p-1.5 text-emerald-400 hover:text-emerald-200 transition-all hover:scale-125"><Edit2 size={14}/></button>
               {activeTab !== 'deleted' ? (
                 <button onClick={() => openConfirm('Soft Delete', 'Move this asset to deleted?', () => bulkMutation.mutate({ action: 'delete', ids: [p.data.id] }))} title="Soft Delete" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all hover:scale-125"><Trash2 size={14}/></button>
               ) : (
                 <button onClick={() => openConfirm('Purge Registry', 'PURGE PERMANENTLY?', () => bulkMutation.mutate({ action: 'purge', ids: [p.data.id] }))} title="Purge" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all hover:scale-125"><Trash2 size={14}/></button>
               )}
           </div>
        </div>
      )
    }
  ], [activeTab]) as any

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
                <button onClick={() => { setActiveTab('deleted'); setSelectedIds([]) }} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'deleted' ? 'bg-blue-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
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
            className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative border-white/5"
          >
            {isLoading && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4 text-blue-400"><RefreshCcw size={32} className="animate-spin" /><p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing asset registry...</p></div>}
            <AgGridReact 
              rowData={assetsToDisplay} columnDefs={columnDefs as any}
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
             <SplitIntelligenceView 
               assets={assetsToDisplay} 
               hoveredAsset={hoveredAsset} 
               setHoveredAsset={setHoveredAsset}
               setActiveDetails={setActiveDetails}
               setActiveModal={setActiveModal}
               onViewServiceDetails={(s:any)=>setActiveServiceDetails(s)}
               onEditService={(s:any)=>setActiveServiceEdit(s)}
             />
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
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-full max-w-6xl max-h-[90vh] flex flex-col p-10 rounded-[40px] border-blue-500/30 shadow-2xl">
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
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-10 rounded-[40px] border-blue-500/30 shadow-2xl">
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
                     onSave={(data: any) => mutation.mutate({ data })} 
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
          --ag-background-color: #1a1b26;
          --ag-header-background-color: #24283b;
          --ag-border-color: #292e42;
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 10px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-size: 9px !important; justify-content: center !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; padding-left: 8px !important; }
        
        /* Make filter popups non-transparent and on top */
        .ag-popup { z-index: 1000 !important; }
        .ag-filter-wrapper { background-color: #24283b !important; border: 1px solid #414868 !important; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4) !important; border-radius: 12px !important; opacity: 1 !important; }
        .ag-filter-body { background-color: #24283b !important; padding: 12px !important; }
        
        /* Action buttons hover effect */
        .ag-cell button { transition: transform 0.2s ease; }
        .ag-cell button:hover { transform: scale(1.2); }
      `}</style>
    </div>
  )
}

// --- Split Intelligence View ---

function SplitIntelligenceView({ assets, hoveredAsset, setHoveredAsset, setActiveDetails, setActiveModal, onViewServiceDetails, onEditService }: any) {
  const [filter, setFilter] = useState({ field: 'system', value: 'All' })
  
  const filterFields = [
    { value: 'system', label: 'Logical System' },
    { value: 'type', label: 'Asset Type' },
    { value: 'status', label: 'Status' },
    { value: 'environment', label: 'Environment' }
  ]

  const uniqueValues = useMemo(() => {
    const vals = new Set(assets.map((a: any) => a[filter.field]))
    return ['All', ...Array.from(vals).sort()]
  }, [assets, filter.field])

  const filteredList = useMemo(() => {
    if (filter.value === 'All') return assets
    return assets.filter((a: any) => a[filter.field] === filter.value)
  }, [assets, filter])

  return (
    <div className="flex-1 flex space-x-4 min-h-0">
       {/* Left Master List */}
       <div className="w-80 glass-panel rounded-2xl flex flex-col overflow-hidden bg-slate-900/50">
          <div className="p-4 border-b border-white/5 bg-black/20 space-y-3">
             <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Vector Queue</h3>
                <span className="text-[9px] font-black text-slate-600">{filteredList.length} Nodes</span>
             </div>
             <div className="grid grid-cols-2 gap-2">
                <select value={filter.field} onChange={e => setFilter({ ...filter, field: e.target.value, value: 'All' })} className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-black uppercase outline-none text-slate-400">
                   {filterFields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select value={filter.value} onChange={e => setFilter({ ...filter, value: e.target.value })} className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-black uppercase outline-none text-white">
                   {uniqueValues.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
             {filteredList.map((a: any) => (
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
       
       {/* Right Ultimate HUD */}
       <div className="flex-1 flex flex-col min-h-0 space-y-4">
          <AnimatePresence mode="wait">
             {hoveredAsset && (
               <motion.div 
                 key={hoveredAsset.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                 className="flex-1 glass-panel rounded-3xl border-white/5 p-8 relative overflow-hidden flex flex-col shadow-2xl bg-black/20"
               >
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none rotate-12"><Server size={300} className="text-blue-400" /></div>
                  
                  <div className="relative z-10 flex flex-col h-full">
                     <div className="flex items-start justify-between mb-8">
                        <div>
                           <div className="flex items-center space-x-3 mb-3">
                              <StatusBadge value={hoveredAsset.status} />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">{hoveredAsset.environment}</span>
                           </div>
                           <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white leading-none">{hoveredAsset.name}</h2>
                           <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] mt-3">{hoveredAsset.system} // {hoveredAsset.type} ARCHITECTURE</p>
                        </div>
                        <div className="flex space-x-2">
                           <button onClick={() => setActiveModal(hoveredAsset)} className="p-4 bg-white/5 border border-white/10 rounded-[2rem] text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all shadow-xl"><Edit2 size={24}/></button>
                           <button onClick={() => setActiveDetails(hoveredAsset)} className="p-4 bg-white/5 border border-white/10 rounded-[2rem] text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-xl"><Maximize2 size={24}/></button>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5 space-y-4">
                           <div className="flex items-center space-x-2 text-blue-400"><Network size={16}/><span className="text-[9px] font-black uppercase tracking-widest">Interface Matrix</span></div>
                           <div className="space-y-3">
                              <div><span className="text-[7px] font-black text-slate-600 uppercase block">Mgmt IP Address</span><p className="text-xl font-mono font-black text-white italic tracking-tighter">{hoveredAsset.management_ip || 'VOID'}</p></div>
                              <div className="flex items-center space-x-4"><div><span className="text-[7px] font-black text-slate-600 uppercase block">Rack Identity</span><p className="text-[10px] font-bold text-slate-300">{hoveredAsset.rack_name || 'N/A'}</p></div><div><span className="text-[7px] font-black text-slate-600 uppercase block">Unit Position</span><p className="text-[10px] font-bold text-slate-300">U{hoveredAsset.u_start || '–'}</p></div></div>
                           </div>
                        </div>
                        <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5 space-y-4">
                           <div className="flex items-center space-x-2 text-emerald-400"><Cpu size={16}/><span className="text-[9px] font-black uppercase tracking-widest">Kernel Specs</span></div>
                           <div className="space-y-3">
                              <div><span className="text-[7px] font-black text-slate-600 uppercase block">OS Distribution</span><p className="text-sm font-black text-white uppercase">{hoveredAsset.os_name} {hoveredAsset.os_version}</p></div>
                              <div><span className="text-[7px] font-black text-slate-600 uppercase block">Hardware Build</span><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{hoveredAsset.manufacturer} {hoveredAsset.model}</p></div>
                           </div>
                        </div>
                        <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5 space-y-4">
                           <div className="flex items-center space-x-2 text-amber-400"><Zap size={16}/><span className="text-[9px] font-black uppercase tracking-widest">Energy Vector</span></div>
                           <div className="space-y-3">
                              <div className="flex items-end justify-between"><div><span className="text-[7px] font-black text-slate-600 uppercase block">Avg Watts</span><p className="text-2xl font-black text-white tabular-nums tracking-tighter">{hoveredAsset.power_typical_w}W</p></div><div className="text-right"><span className="text-[7px] font-black text-slate-600 uppercase block">Peak Max</span><p className="text-sm font-black text-rose-500 tabular-nums">{hoveredAsset.power_max_w}W</p></div></div>
                              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${(hoveredAsset.power_typical_w / (hoveredAsset.power_max_w || 1000)) * 100}%` }} /></div>
                           </div>
                        </div>
                     </div>
                     
                     <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                        <div className="glass-panel bg-black/40 rounded-3xl border border-white/5 flex flex-col overflow-hidden">
                           <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between"><div className="flex items-center space-x-2 text-blue-400"><Layers size={14}/><span className="text-[9px] font-black uppercase tracking-widest">Logic Layers</span></div></div>
                           <div className="flex-1 overflow-y-auto custom-scrollbar"><AssetServicesTable deviceId={hoveredAsset.id} onViewDetails={onViewServiceDetails} onEdit={onEditService} /></div>
                        </div>
                        <div className="glass-panel bg-black/40 rounded-3xl border border-white/5 flex flex-col overflow-hidden">
                           <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between"><div className="flex items-center space-x-2 text-slate-500"><Terminal size={14}/><span className="text-[9px] font-black uppercase tracking-widest">Administrative Audit</span></div></div>
                           <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-20"><History size={40}/><p className="text-[9px] font-black uppercase tracking-[0.4em]">Ledger Scanning...</p></div>
                        </div>
                     </div>
                  </div>
               </motion.div>
             )}
          </AnimatePresence>
       </div>
    </div>
  )
}

const MetadataTab = ({ device, onSave }: { device: any, onSave: (v: any) => void }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [metadata, setMetadata] = useState(device.metadata_json || {})
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditing ? 'bg-slate-700 text-white' : 'bg-blue-600 text-white shadow-lg'}`}
        >
          {isEditing ? 'Switch to Viewer' : 'Modify Payload'}
        </button>
      </div>
      
      {isEditing ? (
        <div className="space-y-6">
          <MetadataEditor value={metadata} onChange={setMetadata} onError={setError} />
          <div className="flex justify-end">
            <button
              disabled={!!error}
              onClick={() => onSave({ metadata_json: metadata })}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center space-x-2"
            >
              <Save size={14} />
              <span>Commit Payload</span>
            </button>
          </div>
        </div>
      ) : (
        <MetadataViewer data={device.metadata_json} />
      )}
    </div>
  )
}

const HWTab = ({ deviceId }: { deviceId: number }) => {
  const queryClient = useQueryClient()
  const [newComp, setNewComp] = useState({ category: 'CPU', name: '', manufacturer: '', specs: '', count: 1 })

  const mutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiFetch(`/api/v1/devices/${deviceId}/hardware`, { method: 'POST', body: JSON.stringify(d) })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-hw', deviceId] }); setNewComp({ category: 'CPU', name: '', manufacturer: '', specs: '', count: 1 }); toast.success('Component added') }
  })

  const inputStyles = "w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500 h-[38px] text-[var(--text-primary)]"

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-2 bg-white/5 p-3 rounded-xl border border-white/5 items-end">
         <div>
            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 px-1">Category</label>
            <select value={newComp.category} onChange={e => setNewComp({...newComp, category: e.target.value})} className={inputStyles}>
                <option>CPU</option><option>Memory</option><option>Card</option><option>Disk</option><option>NIC</option><option>PSU</option>
            </select>
         </div>
         <div>
            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 px-1">Name</label>
            <input value={newComp.name} onChange={e => setNewComp({...newComp, name: e.target.value})} placeholder="e.g. Gold 6248" className={inputStyles} />
         </div>
         <div>
            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 px-1">Make</label>
            <input value={newComp.manufacturer} onChange={e => setNewComp({...newComp, manufacturer: e.target.value})} placeholder="Intel" className={inputStyles} />
         </div>
         <div>
            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 px-1">Specs</label>
            <input value={newComp.specs} onChange={e => setNewComp({...newComp, specs: e.target.value})} placeholder="2.5GHz 20C" className={inputStyles} />
         </div>
         <div>
            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 px-1">Qty</label>
            <input type="number" value={newComp.count} onChange={e => setNewComp({...newComp, count: parseInt(e.target.value)})} className={inputStyles} />
         </div>
         <button onClick={() => { if(!newComp.name) return toast.error("Name required"); mutation.mutate(newComp) }} className="h-[38px] bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">Add</button>
      </div>
      <HWTable deviceId={deviceId} />
    </div>
  )
}

const HWTable = ({ deviceId }: { deviceId: number }) => {
  const queryClient = useQueryClient()
  const { data: hardware } = useQuery({ queryKey: ['device-hw', deviceId], queryFn: async () => (await (await apiFetch(`/api/v1/devices/${deviceId}/hardware`)).json()) })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })
  
  const delMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/devices/hardware/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-hw', deviceId] }); toast.success('Component removed') }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => apiFetch(`/api/v1/devices/hardware/${data.id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-hw', deviceId] }); setEditingId(null); toast.success('Updated') }
  })

  return (
    <table className="w-full text-[10px]"><thead className="bg-white/5 border-b border-white/5"><tr><th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Category</th><th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Component</th><th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Specs</th><th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Qty</th><th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Actions</th></tr></thead><tbody className="divide-y divide-white/5">{hardware?.map((h: any) => (<tr key={h.id} className="hover:bg-white/5 transition-colors"><td className="px-4 py-2 text-center"><span className="text-[8px] font-black uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">{h.category}</span></td><td className="px-4 py-2 font-bold text-slate-200 text-center">{h.name}</td><td className="px-4 py-2 text-slate-500 text-center">{h.specs}</td><td className="px-4 py-2 font-mono text-center text-slate-400">x{h.count}</td><td className="px-4 py-2 text-center"><button onClick={() => delMutation.mutate(h.id)} className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-all"><Trash2 size={14}/></button></td></tr>))}{!hardware?.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-600 font-bold uppercase italic">No hardware mappings</td></tr>}</tbody></table>
  )
}

const SecretsTab = ({ deviceId }: { deviceId: number }) => {
  const queryClient = useQueryClient()
  const [newSec, setNewSec] = useState({ secret_type: 'Root Password', username: '', encrypted_payload: '' })

  const mutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiFetch(`/api/v1/devices/${deviceId}/secrets`, { method: 'POST', body: JSON.stringify(d) })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-secrets', deviceId] }); setNewSec({ secret_type: 'Root Password', username: '', encrypted_payload: '' }); toast.success('Credential added') }
  })

  const secOptions = [
    { value: 'Root Password', label: 'Root Password' },
    { value: 'Admin API Key', label: 'Admin API Key' },
    { value: 'Service Account', label: 'Service Account' },
    { value: 'SSH Key', label: 'SSH Key' },
    { value: 'ILO/IDRAC', label: 'ILO/IDRAC' }
  ]

  const inputStyles = "w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500 h-[38px] text-[var(--text-primary)]"

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 bg-white/5 p-3 rounded-xl border border-white/5 items-end">
         <StyledSelect
            value={newSec.secret_type}
            onChange={e => setNewSec({...newSec, secret_type: e.target.value})}
            options={secOptions}
            label="Secret Type"
            className="h-[38px]"
         />
         <div>
            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 px-1">Identity</label>
            <input value={newSec.username} onChange={e => setNewSec({...newSec, username: e.target.value})} placeholder="Identity / Username" className={inputStyles} />
         </div>
         <div>
            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 px-1">Sensitive Value</label>
            <input type="password" value={newSec.encrypted_payload} onChange={e => setNewSec({...newSec, encrypted_payload: e.target.value})} placeholder="Value" className={inputStyles} />
         </div>
         <button onClick={() => { if(!newSec.username || !newSec.encrypted_payload) return toast.error("Identity/Value required"); mutation.mutate(newSec) }} className="h-[38px] bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Add</button>
      </div>
      <SecretsTable deviceId={deviceId} />
    </div>
  )
}

const SecretsTable = ({ deviceId }: { deviceId: number }) => {
  const queryClient = useQueryClient()
  const { data: secrets } = useQuery({ queryKey: ['device-secrets', deviceId], queryFn: async () => (await (await apiFetch(`/api/v1/devices/${deviceId}/secrets`)).json()) })
  const [visibleIds, setVisibleIds] = useState<number[]>([])

  const delMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/devices/secrets/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-secrets', deviceId] }); toast.success('Removed') }
  })

  return (
    <table className="w-full text-[10px]"><thead className="bg-white/5 border-b border-white/5"><tr><th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Type</th><th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Identity</th><th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Payload</th><th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Actions</th></tr></thead><tbody className="divide-y divide-white/5">{secrets?.map((s: any) => (<tr key={s.id} className="hover:bg-white/5 transition-colors"><td className="px-4 py-2 font-black uppercase text-amber-500/80">{s.secret_type}</td><td className="px-4 py-2 font-bold text-slate-200">{s.username}</td><td className="px-4 py-2 font-mono text-slate-400"><div className="flex items-center space-x-3 group"><span className={visibleIds.includes(s.id) ? 'text-blue-300' : 'text-slate-700'}>{visibleIds.includes(s.id) ? s.encrypted_payload : '••••••••••••'}</span><button onClick={() => setVisibleIds(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-blue-400">{visibleIds.includes(s.id) ? <EyeOff size={14}/> : <Eye size={14}/>}</button></div></td><td className="px-4 py-2 text-center"><button onClick={() => delMutation.mutate(s.id)} className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-all"><Trash2 size={14}/></button></td></tr>))}{!secrets?.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-600 font-bold uppercase italic">No credentials</td></tr>}</tbody></table>
  )
}

const RelationshipsTab = ({ deviceId }: { deviceId: number }) => {
  const queryClient = useQueryClient()
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) })
  const types = useMemo(() => [{ label: 'Depends On', s: 'Consumer', t: 'Provider' }, { label: 'Hosts', s: 'Hypervisor', t: 'Guest' }, { label: 'Backs Up', s: 'Source', t: 'Target' }, { label: 'Replicates to', s: 'Primary', t: 'Replica' }, { label: 'Cluster Member', s: 'Node', t: 'Peer' }], [])
  const currentDevice = useMemo(() => devices?.find((d: any) => d.id === deviceId), [devices, deviceId]);
  const [newRel, setNewRel] = useState({ target_device_id: '', relationship_type: 'Depends On', source_role: 'Consumer', target_role: 'Provider' })

  const mutation = useMutation({
    mutationFn: async (d: any) => (await apiFetch(`/api/v1/devices/${deviceId}/relationships`, { method: 'POST', body: JSON.stringify(d) })).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-rel', deviceId] }); toast.success('Vector established') }
  })

  const inputStyles = "w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 h-[38px] text-[var(--text-primary)]"

  return (
    <div className="space-y-6">
      <div className="bg-white/5 p-6 rounded-[30px] border border-white/5 space-y-6">
         <div className="grid grid-cols-11 gap-2 items-end">
            <div className="col-span-3">
               <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 px-1">Local Asset (A)</label>
               <div className="w-full bg-blue-600/10 border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs text-blue-400 font-black uppercase truncate h-[38px] flex items-center">{currentDevice?.name || 'Local'}</div>
            </div>
            <div className="col-span-2"><StyledSelect label="Role (A)" value={newRel.source_role} onChange={e => setNewRel({...newRel, source_role: e.target.value})} options={[{value:'Consumer',label:'Consumer'},{value:'Hypervisor',label:'Hypervisor'},{value:'Source',label:'Source'},{value:'Primary',label:'Primary'},{value:'Node',label:'Node'}]} className="h-[38px]" /></div>
            <div className="col-span-1 flex justify-center pb-0.5"><button onClick={() => setNewRel({...newRel, source_role: newRel.target_role, target_role: newRel.source_role})} className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 h-[38px] w-full flex items-center justify-center"><ArrowRightLeft size={16}/></button></div>
            <div className="col-span-2"><StyledSelect label="Role (B)" value={newRel.target_role} onChange={e => setNewRel({...newRel, target_role: e.target.value})} options={[{value:'Provider',label:'Provider'},{value:'Guest',label:'Guest'},{value:'Target',label:'Target'},{value:'Replica',label:'Replica'},{value:'Peer',label:'Peer'}]} className="h-[38px]" /></div>
            <div className="col-span-3"><StyledSelect label="Peer Asset (B)" value={newRel.target_device_id} onChange={e => setNewRel({...newRel, target_device_id: e.target.value})} options={devices?.filter((d:any)=> d.id !== deviceId).map((d:any)=>({ value: String(d.id), label: d.name })) || []} placeholder="Select Peer..." className="h-[38px]" /></div>
         </div>
         <div className="flex justify-end pt-2 border-t border-white/5"><button onClick={() => { if(!newRel.target_device_id) return toast.error("Peer required"); mutation.mutate(newRel) }} className="px-8 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg h-[38px]">Establish Vector</button></div>
      </div>
      <RelationsTable deviceId={deviceId} />
    </div>
  )
}

const RelationsTable = ({ deviceId }: { deviceId: number }) => {
  const { data: relationships } = useQuery({ queryKey: ['device-rel', deviceId], queryFn: async () => (await (await apiFetch(`/api/v1/devices/${deviceId}/relationships`)).json()) })
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) })
  const delMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/devices/relationships/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-rel', deviceId] }); toast.success('Removed') }
  })
  const queryClient = useQueryClient()
  return (<table className="w-full text-[10px]"><thead className="bg-white/5 border-b border-white/5"><tr><th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Local ID</th><th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Type</th><th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Peer Entity</th><th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Ops</th></tr></thead><tbody className="divide-y divide-white/5">{relationships?.map((r: any) => (<tr key={r.id} className="hover:bg-white/5 transition-colors"><td className="px-4 py-3 font-black text-white uppercase">{r.source_role}</td><td className="px-4 py-3 text-center font-black text-slate-500 text-[8px] uppercase">{r.relationship_type}</td><td className="px-4 py-3 font-black text-blue-400 uppercase">{devices?.find((d:any)=>d.id===(r.source_device_id===deviceId?r.target_device_id:r.source_device_id))?.name || 'Unknown'}</td><td className="px-4 py-3 text-center"><button onClick={() => delMutation.mutate(r.id)} className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg"><Trash2 size={14}/></button></td></tr>))}{!relationships?.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-600 font-bold uppercase italic">No relationships</td></tr>}</tbody></table>)
}

const MetadataEditor = ({ value, onChange, onError }: any) => {
  const [json, setJson] = useState(() => JSON.stringify(value || {}, null, 2))
  useEffect(() => { try { onChange(JSON.parse(json)); onError(null) } catch { onError("Invalid JSON") } }, [json])
  return (<div className="space-y-3"><div className="flex items-center space-x-2 text-blue-400"><FileJson size={16} /><span className="text-[10px] font-black uppercase tracking-widest">JSON Interface</span></div><textarea value={json} onChange={e=>setJson(e.target.value)} className="w-full h-64 bg-black/40 border border-white/5 rounded-2xl p-6 text-[11px] font-mono text-blue-300 outline-none focus:border-blue-500 shadow-inner" /></div>)
}

const AssetForm = ({ initialData, onSave, options, isSaving }: any) => {
  const [formData, setFormData] = useState({ name: '', system: '', type: 'Physical', status: 'Active', environment: 'Production', owner: '', business_unit: '', manufacturer: '', model: '', serial_number: '', asset_tag: '', os_name: '', os_version: '', power_typical_w: 0, power_max_w: 0, metadata_json: {}, ...initialData })
  const getOptions = (cat: string) => Array.isArray(options) ? options.filter((o: any) => o.category === cat) : []
  return (<div className="grid grid-cols-3 gap-6"><div className="space-y-4"><h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-blue-600 pl-3">Identity</h3><div className="space-y-3"><div><label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Hostname *</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500" /></div><StyledSelect label="System *" value={formData.system} onChange={e => setFormData({...formData, system: e.target.value})} options={getOptions('LogicalSystem')} /></div></div><div className="space-y-4"><h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-emerald-600 pl-3">Classification</h3><div className="space-y-3"><StyledSelect label="Type" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} options={ASSET_TYPES} /><StyledSelect label="Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={STATUS_ITEMS} /><StyledSelect label="Env" value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})} options={ENVIRONMENT_ITEMS} /></div></div><div className="space-y-4"><h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-amber-600 pl-3">Specs</h3><div className="space-y-3"><input value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} placeholder="Make" className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" /><input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="Model" className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" /><button onClick={() => onSave(formData)} disabled={isSaving} className="w-full py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl">{isSaving ? 'Syncing...' : 'Commit Asset'}</button></div></div></div>)
}
