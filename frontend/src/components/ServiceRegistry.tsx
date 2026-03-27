import React, { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Layers, X, Search, Edit2, Trash2, RefreshCcw, AlertCircle, Plus, LayoutGrid, Monitor, Database, Globe, Box, Settings, MoreVertical, FileJson, List, Sliders, Tag, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AgGridReact } from "ag-grid-react"
import toast from "react-hot-toast"
import { apiFetch } from "../api/apiClient"
import { ConfigRegistryModal } from "./ConfigRegistry"
import { ConfirmationModal } from "./shared/ConfirmationModal"
import { StyledSelect } from "./shared/StyledSelect"

const MetadataEditor = ({ value, onChange, onError }: { value: any, onChange: (v: any) => void, onError?: (err: string | null) => void }) => {
  const [mode, setMode] = useState<'table' | 'json'>('table')
  const [tableRows, setTableRows] = useState(() => {
    const obj = typeof value === 'string' ? JSON.parse(value || '{}') : (value || {})
    return Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }))
  })
  const [jsonValue, setJsonValue] = useState(() => JSON.stringify(value || {}, null, 2))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const obj = typeof value === 'string' ? JSON.parse(value || '{}') : (value || {})
    setTableRows(Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) })))
    setJsonValue(JSON.stringify(obj, null, 2))
  }, [value])

  const validateAndNotify = (rows: {key: string, value: string}[]) => {
    const obj: any = {}
    const keys = new Set()
    let hasDuplicate = false

    rows.forEach(r => {
      if (r.key) {
        if (keys.has(r.key)) hasDuplicate = true
        keys.add(r.key)
        obj[r.key] = r.value
      }
    })

    if (hasDuplicate) {
        setError("Duplicate keys detected")
        onError?.("Duplicate keys detected")
        return false
    } else {
        setError(null)
        onError?.(null)
        setJsonValue(JSON.stringify(obj, null, 2))
        onChange(obj)
        return true
    }
  }

  const syncFromJSON = (json: string) => {
    try {
        const obj = JSON.parse(json)
        const rows = Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }))
        setTableRows(rows)
        setError(null)
        onError?.(null)
        onChange(obj)
        return true
    } catch (e) {
        setError("Invalid JSON format")
        onError?.("Invalid JSON format")
        return false
    }
  }
  return (
    <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
         <div className="flex items-center space-x-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Service Configuration Metadata</span>
            {error && <span className="text-[8px] font-black text-rose-500 uppercase animate-pulse">!! {error}</span>}
         </div>
         <div className="flex bg-black/40 rounded-lg p-1">
            <button onClick={() => setMode('table')} className={`px-2 py-1 rounded-md transition-all ${mode === 'table' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><List size={12}/></button>
            <button onClick={() => setMode('json')} className={`px-2 py-1 rounded-md transition-all ${mode === 'json' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><FileJson size={12}/></button>
         </div>
      </div>
      <div className="p-4 min-h-[120px]">
        {mode === 'table' ? (
          <div className="space-y-2">
            {tableRows.map((row, i) => (
              <div key={i} className="flex items-center space-x-2">
                <input value={row.key} onChange={e => {
                  const n = [...tableRows]; n[i].key = e.target.value; 
                  setTableRows(n); validateAndNotify(n);
                }} placeholder="Key" className={`flex-1 bg-black/40 border ${error === 'Duplicate keys detected' ? 'border-rose-500/50' : 'border-white/5'} rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-blue-500`} />
                <input value={row.value} onChange={e => {
                  const n = [...tableRows]; n[i].value = e.target.value; 
                  setTableRows(n); validateAndNotify(n);
                }} placeholder="Values" className="flex-[2] bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-[11px] outline-none" />
                <button onClick={() => {
                    const n = tableRows.filter((_, idx) => idx !== i);
                    setTableRows(n); validateAndNotify(n);
                }} className="text-slate-600 hover:text-rose-400"><X size={14}/></button>
              </div>
            ))}
            <button onClick={() => {
                const n = [...tableRows, { key: '', value: '' }];
                setTableRows(n);
            }} className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-2 hover:text-blue-300 transition-colors">+ Add Attribute</button>
          </div>
        ) : (
          <textarea value={jsonValue} onChange={e => {
            setJsonValue(e.target.value);
            syncFromJSON(e.target.value);
          }} className={`w-full h-32 bg-black/40 border ${error === 'Invalid JSON format' ? 'border-rose-500/50' : 'border-white/5'} rounded-xl px-4 py-3 text-[11px] font-mono text-blue-300 outline-none`} />
        )}
      </div>
    </div>
  )
}

const MetadataViewer = ({ data }: { data: any }) => {
  let obj: any = {}
  try {
    obj = typeof data === 'string' ? JSON.parse(data || '{}') : (data || {})
  } catch {
    obj = {}
  }
  return (
    <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Metadata Inspection</span>
      </div>
      <table className="w-full text-[10px]">
        <thead className="bg-white/5 border-b border-white/5">
          <tr>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Key</th>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {Object.entries(obj).map(([k, v]) => (
            <tr key={k} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 font-black uppercase text-blue-400 tracking-tighter w-1/3">{k}</td>
              <td className="px-4 py-3 font-mono text-slate-300">{String(v)}</td>
            </tr>
          ))}
          {Object.keys(obj).length === 0 && (
            <tr><td colSpan={2} className="px-4 py-12 text-center text-slate-600 font-bold uppercase italic tracking-widest">No metadata keys defined</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const StatusBulkUpdateModal = ({ isOpen, onClose, onApply, options, count }: { isOpen: boolean, onClose: () => void, onApply: (status: string) => void, options: any[], count?: number }) => {
  const [selectedStatus, setSelectedStatus] = useState('')
  const getOptions = (cat: string) => Array.isArray(options) ? options.filter((o: any) => o.category === cat) : []

  useEffect(() => {
    if (isOpen) setSelectedStatus('')
  }, [isOpen])

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
       <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-10 rounded-[40px] border border-blue-500/30 space-y-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-blue-400 flex items-center space-x-3">
               <Tag size={24}/> <span>Update Status</span>
            </h2>
            {count && <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">Updating {count} service{count !== 1 ? 's' : ''}</p>}
          </div>
          <StyledSelect
            label="Target Operational State"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            options={getOptions('Status').length > 0 ? getOptions('Status') : [{value: 'Running', label: 'Running'}, {value: 'Stopped', label: 'Stopped'}, {value: 'Maintenance', label: 'Maintenance'}]}
            placeholder="Select Status..."
          />
          <div className="flex space-x-3 pt-2">
             <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
             <button 
               disabled={!selectedStatus}
               onClick={() => onApply(selectedStatus)} 
               className="flex-1 py-3 bg-blue-600 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
             >
                Apply to Selection
             </button>
          </div>
       </motion.div>
    </div>
  )
}

const EnvBulkUpdateModal = ({ isOpen, onClose, onApply, options, count }: { isOpen: boolean, onClose: () => void, onApply: (env: string) => void, options: any[], count?: number }) => {
  const [selectedEnv, setSelectedEnv] = useState('')
  const getOptions = (cat: string) => Array.isArray(options) ? options.filter((o: any) => o.category === cat) : []

  useEffect(() => {
    if (isOpen) setSelectedEnv('')
  }, [isOpen])

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
       <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-10 rounded-[40px] border border-blue-500/30 space-y-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-blue-400 flex items-center space-x-3">
               <Globe size={24}/> <span>Update Environment</span>
            </h2>
            {count && <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">Updating {count} service{count !== 1 ? 's' : ''}</p>}
          </div>
          <StyledSelect
            label="Target Environment"
            value={selectedEnv}
            onChange={e => setSelectedEnv(e.target.value)}
            options={getOptions('Environment').length > 0 ? getOptions('Environment') : [{value: 'Production', label: 'Production'}, {value: 'QA', label: 'QA'}, {value: 'Dev', label: 'Dev'}]}
            placeholder="Select Environment..."
          />
          <div className="flex space-x-3 pt-2">
             <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
             <button 
               disabled={!selectedEnv}
               onClick={() => onApply(selectedEnv)} 
               className="flex-1 py-3 bg-blue-600 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
             >
                Apply to Selection
             </button>
          </div>
       </motion.div>
    </div>
  )
}

const HostBulkUpdateModal = ({ isOpen, onClose, onApply, devices, count }: { isOpen: boolean, onClose: () => void, onApply: (deviceId: number | null) => void, devices: any[], count?: number }) => {
  const [selectedHost, setSelectedHost] = useState<string>('')

  useEffect(() => {
    if (isOpen) setSelectedHost('')
  }, [isOpen])

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
       <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-10 rounded-[40px] border border-blue-500/30 space-y-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-blue-400 flex items-center space-x-3">
               <Monitor size={24}/> <span>Update Host Node</span>
            </h2>
            {count && <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">Updating {count} service{count !== 1 ? 's' : ''}</p>}
          </div>
          <StyledSelect
            label="Target Host Node"
            value={selectedHost}
            onChange={e => setSelectedHost(e.target.value)}
            options={devices?.map((d:any)=>({ value: String(d.id), label: `${d.name} [${d.type}]` })) || []}
            placeholder="Unassigned (Floating)"
          />
          <div className="flex space-x-3 pt-2">
             <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
             <button 
               onClick={() => onApply(selectedHost ? parseInt(selectedHost) : null)} 
               className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
             >
                Apply to Selection
             </button>
          </div>
       </motion.div>
    </div>
  )
}

export default function ServiceRegistry() {
  const queryClient = useQueryClient()
  const [activeModal, setActiveModal] = useState<any>(null)
  const [activeDetails, setActiveDetails] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'purged'>('active')
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false)
  const [isBulkEnvOpen, setIsBulkEnvOpen] = useState(false)
  const [isBulkHostOpen, setIsBulkHostOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' })

  const openConfirm = (title: string, message: string, onConfirm: () => void, variant: any = 'danger') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, variant })
  }

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) })
  const { data: services, isLoading } = useQuery({ 
    queryKey: ["logical-services", activeTab], 
    queryFn: async () => (await (await apiFetch(`/api/v1/logical-services/?include_deleted=${activeTab === 'purged'}`)).json())
  })
  const { data: devices } = useQuery({ queryKey: ["devices"], queryFn: async () => (await (await apiFetch("/api/v1/devices/")).json()) })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/logical-services/${data.id}` : "/api/v1/logical-services/"
      const method = data.id ? "PUT" : "POST"
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to synchronize service')
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["logical-services"] })
      toast.success("Service Registry Updated")
      setActiveModal(null)
    },
    onError: (e: any) => toast.error(e.message)
  })

  const bulkMutation = useMutation({
    mutationFn: async ({ action, payload = {}, ids = selectedIds }: any) => {
      const res = await apiFetch('/api/v1/logical-services/bulk-action', { 
        method: 'POST', body: JSON.stringify({ ids: ids.length ? ids : [], action, payload }) 
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logical-services"] })
      setSelectedIds([]); setShowBulkMenu(false)
      setIsBulkStatusOpen(false); setIsBulkEnvOpen(false); setIsBulkHostOpen(false)
      toast.success('Operation Complete')
    }
  })

  const columnDefs = useMemo(() => [
    { field: "id", headerName: "", width: 60, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left', cellClass: 'text-center pl-4', headerClass: 'text-center pl-4' },
    { 
      field: "name", 
      headerName: "Instance Name", 
      flex: 1, 
      pinned: 'left',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-2 h-full">
           {p.data.service_type === 'Database' && <Database size={12} className="text-amber-400" />}
           {p.data.service_type === 'Web Server' && <Globe size={12} className="text-blue-400" />}
           {p.data.service_type === 'Container' && <Box size={12} className="text-emerald-400" />}
           <span className="font-bold text-blue-100">{p.value}</span>
        </div>
      )
    },
    { field: "service_type", headerName: "Type", width: 120, cellClass: 'text-center', headerClass: 'text-center' },
    { 
      field: "status", 
      headerName: "Status", 
      width: 110, 
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = { Running: 'text-emerald-400 border-emerald-500/30', Degraded: 'text-amber-400 border-amber-500/30', Critical: 'text-rose-400 border-rose-500/30', Stopped: 'text-slate-400 border-slate-500/30' }
        return <div className="flex items-center justify-center h-full"><span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${colors[p.value] || 'text-slate-400 border-slate-500/30'}`}>{p.value}</span></div>
      }
    },
    { field: "device_name", headerName: "Host Node", width: 150, cellClass: "text-blue-400 font-bold text-center", headerClass: 'text-center' },
    { field: "environment", headerName: "Env", width: 100, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "version", headerName: "Version", width: 100, cellClass: "font-mono text-slate-500 text-center", headerClass: 'text-center' },
    {
      headerName: "Ops",
      width: 140,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/5">
               <button onClick={() => setActiveDetails(params.data)} title="Service Details" className="p-1.5 hover:bg-blue-600 hover:text-white text-slate-500 rounded-md transition-all"><List size={14}/></button>
               {activeTab === 'active' ? (
                 <>
                   <button onClick={() => setActiveModal(params.data)} title="Edit Configuration" className="p-1.5 hover:bg-blue-600 hover:text-white text-slate-500 rounded-md transition-all"><Edit2 size={14}/></button>
                   <button onClick={() => openConfirm('Terminate Service', 'Purge this service instance?', () => bulkMutation.mutate({ action: 'delete', ids: [params.data.id] }))} title="Terminate" className="p-1.5 hover:bg-rose-600 hover:text-white text-slate-500 rounded-md transition-all"><Trash2 size={14}/></button>
                 </>
               ) : (
                 <button onClick={() => bulkMutation.mutate({ action: 'restore', ids: [params.data.id] })} title="Restore Service" className="p-1.5 hover:bg-emerald-600 hover:text-white text-slate-500 rounded-md transition-all"><RefreshCcw size={14}/></button>
               )}
           </div>
        </div>
      )
    }
  ], [selectedIds, activeTab]) as any

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic">Service Registry</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Application Layer & Service Dependency Mapping</p>
           </div>
           <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-center">
              <button onClick={() => { setActiveTab('active'); setSelectedIds([]) }} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-[#034EA2] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Active Services</button>
              <button onClick={() => { setActiveTab('purged'); setSelectedIds([]) }} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'purged' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Purged Records</button>
           </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SEARCH REGISTRY..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>

          <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
             <button onClick={() => setShowConfig(true)} className="p-2 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Registry Config">
                <Settings size={16} />
             </button>
          </div>

          <div className="relative">
            <button onClick={() => setShowBulkMenu(!showBulkMenu)} disabled={selectedIds.length === 0} className={`p-2 rounded-xl border transition-all ${selectedIds.length > 0 ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-slate-700 cursor-not-allowed'}`}><MoreVertical size={18}/></button>
            <AnimatePresence>
              {showBulkMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-2 space-y-1">
                   <p className="px-3 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">{selectedIds.length} Services Selected</p>
                   {activeTab === 'active' ? (
                     <>
                       <button onClick={() => { setIsBulkStatusOpen(true); setShowBulkMenu(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-blue-400 transition-all">Set Status...</button>
                       <button onClick={() => { setIsBulkEnvOpen(true); setShowBulkMenu(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-emerald-400 transition-all">Set Environment...</button>
                       <button onClick={() => { setIsBulkHostOpen(true); setShowBulkMenu(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-amber-400 transition-all">Set Host Node...</button>
                       <div className="h-px bg-white/5 mx-2 my-1" />
                       <button onClick={() => openConfirm('Bulk Termination', `Terminate ${selectedIds.length} instances?`, () => bulkMutation.mutate({ action: 'delete' }))} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-rose-500/20 rounded-lg text-rose-500 transition-all">Bulk Terminate</button>
                     </>
                   ) : (
                     <button onClick={() => bulkMutation.mutate({ action: 'restore' })} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-emerald-400 transition-all">Restore Selected</button>
                   )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={() => setActiveModal({})} className="bg-[#034EA2] hover:bg-blue-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ Add Service</button>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <RefreshCcw size={32} className="text-blue-400 animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Scanning Application Layer...</p>
          </div>
        )}
        <AgGridReact 
          rowData={services || []} 
          columnDefs={columnDefs} 
          rowSelection="multiple"
          headerHeight={28}
          rowHeight={28}
          onSelectionChanged={e => setSelectedIds(e.api.getSelectedNodes().map(n => n.data.id))}
          quickFilterText={searchTerm}
        />
      </div>

      <StatusBulkUpdateModal
        isOpen={isBulkStatusOpen}
        onClose={() => setIsBulkStatusOpen(false)}
        onApply={(s) => bulkMutation.mutate({ action: 'update', payload: { status: s } })}
        options={options || []}
        count={selectedIds.length}
      />

      <EnvBulkUpdateModal
        isOpen={isBulkEnvOpen}
        onClose={() => setIsBulkEnvOpen(false)}
        onApply={(e) => bulkMutation.mutate({ action: 'update', payload: { environment: e } })}
        options={options || []}
        count={selectedIds.length}
      />

      <HostBulkUpdateModal
        isOpen={isBulkHostOpen}
        onClose={() => setIsBulkHostOpen(false)}
        onApply={(id) => bulkMutation.mutate({ action: 'update', payload: { device_id: id } })}
        devices={devices || []}
        count={selectedIds.length}
      />

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[800px] max-h-[90vh] overflow-y-auto p-10 rounded-[40px] border-blue-500/30 custom-scrollbar">
               <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <h2 className="text-2xl font-black uppercase flex items-center space-x-4 text-blue-400">
                     <Layers size={28}/> <span>{activeModal.id ? 'Modify Service Configuration' : 'Register New Service Instance'}</span>
                  </h2>
                  <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
               </div>
               
               <ServiceForm initialData={activeModal} onSave={mutation.mutate} options={options} devices={devices} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[900px] max-h-[85vh] overflow-hidden p-10 rounded-[40px] border-blue-500/30 flex flex-col">
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

      <ConfigRegistryModal 
        isOpen={showConfig} 
        onClose={() => setShowConfig(false)} 
        title="Service Registry Enumerations"
        sections={[
            { title: "Service Types", category: "ServiceType", icon: Database },
            { title: "Status Options", category: "Status", icon: RefreshCcw },
            { title: "Environments", category: "Environment", icon: Globe }
        ]}
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

const ServiceDetailsView = ({ service, options, devices }: { service: any, options: any, devices: any }) => {
    const queryClient = useQueryClient()
    const [tab, setTab] = useState('payload')
    const [metadataError, setMetadataError] = useState<string | null>(null)
    const [formData, setFormData] = useState({ ...service })
    const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' })

    const updateMutation = useMutation({
        mutationFn: async (data: any) => fetch(`/api/v1/logical-services/${service.id}`, { 
            method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) 
        }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['logical-services'] }); toast.success('Service Configuration Updated') }
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex space-x-1 bg-black/40 p-1 rounded-2xl w-fit">
                    {['metadata', 'editor'].map(t => (
                        <button key={t} onClick={() => setTab(t)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                            {t === 'metadata' ? 'Metadata View' : 'Metadata Editor'}
                        </button>
                    ))}
                </div>
                {tab === 'editor' && (
                  <button 
                    onClick={() => {
                      if (metadataError) {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Metadata Integrity Warning',
                          message: `Metadata has errors (${metadataError}). Do you want to save anyway?`,
                          onConfirm: () => updateMutation.mutate(formData),
                          variant: 'warning'
                        })
                        return;
                      }
                      updateMutation.mutate(formData);
                    }} 
                    className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    Save Changes
                  </button>
                )}
            </div>
            
            <div className="glass-panel rounded-[30px] border-white/5 overflow-hidden p-8 bg-black/20">
                {tab === 'metadata' ? (
                  <MetadataViewer data={formData.config_json} />
                ) : (
                  <MetadataEditor 
                    value={formData.config_json} 
                    onChange={v => setFormData({...formData, config_json: v})} 
                    onError={setMetadataError}
                  />
                )}
            </div>

            <ConfirmationModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
            />
        </div>
    )
}

const ServiceForm = ({ initialData, onSave, options, devices }: any) => {
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' })
  const [formData, setFormData] = useState({ 
    name: "", service_type: "Database", status: "Running", environment: "Production", version: "",
    device_id: null, config_json: {}, ...initialData 
  })

  const getOptions = (cat: string) => Array.isArray(options) ? options.filter((o: any) => o.category === cat) : []

  useEffect(() => {
    if (!initialData.id) { // Only for new services
      const selectedType = getOptions('ServiceType').find(o => o.value === formData.service_type);
      if (selectedType?.metadata_keys) {
        // Reset to ONLY the keys for the selected type to prevent appending
        const newConfig: any = {};
        selectedType.metadata_keys.forEach((key: string) => {
          newConfig[key] = "";
        });
        setFormData(prev => ({ ...prev, config_json: newConfig }));
      } else {
        // If no predefined keys, just reset to empty object for new service
        setFormData(prev => ({ ...prev, config_json: {} }));
      }
    }
  }, [formData.service_type, options, initialData.id]);

  return (
    <div className="space-y-8 py-6">
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
           <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-blue-600 pl-3">Identity & Deployment</h3>
           <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 px-1">Service Instance Name *</label>
              <input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className={`w-full bg-slate-900 border ${!formData.name ? 'border-rose-500/50' : 'border-white/10'} rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 transition-all`} 
                placeholder="e.g. ERP-API-PROD" 
              />
           </div>
           <StyledSelect
                label="Target Host Node"
                value={formData.device_id || ""}
                onChange={e => setFormData({...formData, device_id: e.target.value || null})}
                options={devices?.map((d:any)=>({ value: String(d.id), label: `${d.name} [${d.type}]` })) || []}
                placeholder="Unassigned (Floating)"
           />
           <StyledSelect
                label="Service Metadata Type"
                value={formData.service_type}
                onChange={e => {
                  const val = e.target.value;
                  setFormData(prev => ({...prev, service_type: val}));
                }}
                options={getOptions('ServiceType').length > 0 ? getOptions('ServiceType') : ["Database", "Web Server", "Middleware", "Container", "Microservice"].map(t => ({ value: t, label: t }))}
           />
        </div>

        <div className="space-y-4">
           <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-emerald-600 pl-3">Operational Status</h3>
           <StyledSelect
                label="Runtime Status"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                options={getOptions('Status').length > 0 ? getOptions('Status') : [{value: 'Running', label: 'Running'}, {value: 'Stopped', label: 'Stopped'}, {value: 'Maintenance', label: 'Maintenance'}]}
           />
           <StyledSelect
                label="Environment"
                value={formData.environment}
                onChange={e => setFormData({...formData, environment: e.target.value})}
                options={getOptions('Environment').length > 0 ? getOptions('Environment') : [{value: 'Production', label: 'Production'}, {value: 'QA', label: 'QA'}, {value: 'Dev', label: 'Dev'}]}
           />
           <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 px-1">Software Version</label>
              <input value={formData.version} onChange={e => setFormData({...formData, version: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500/50" placeholder="v2.1.0" />
           </div>
        </div>

        <div className="col-span-2">
           <MetadataEditor 
             value={formData.config_json} 
             onChange={v => setFormData({...formData, config_json: v})} 
             onError={setMetadataError}
           />
        </div>
      </div>

      <div className="flex space-x-4 pt-4 border-t border-white/5">
        <button 
          onClick={() => { 
            if (metadataError) {
              setConfirmModal({
                isOpen: true,
                title: 'Metadata Integrity Warning',
                message: `Metadata has errors (${metadataError}). Do you want to save anyway?`,
                onConfirm: () => { if(!formData.name) return toast.error("Instance name required"); onSave(formData) },
                variant: 'warning'
              })
              return;
            }
            if(!formData.name) return toast.error("Instance name required"); 
            onSave(formData) 
          }} 
          className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
        >
           Save Service
        </button>
      </div>
      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  )
}
