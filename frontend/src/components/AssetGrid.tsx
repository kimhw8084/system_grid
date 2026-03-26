import React, { useMemo, useState, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Cpu, Package, Key, X, Save, RefreshCcw, Search, Edit2, LayoutGrid, List, FileJson, Check, MoreVertical, Settings, Sliders, Globe, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { ConfigRegistryModal, UISettingsModal } from "./ConfigRegistry"
import { ConfirmationModal } from "./shared/ConfirmationModal"
import { StyledSelect } from "./shared/StyledSelect"

const AssetServicesTable = ({ deviceId }: { deviceId: number }) => {
  const { data: services, isLoading } = useQuery({ 
    queryKey: ['device-services', deviceId], 
    queryFn: async () => (await fetch(`/api/v1/logical-services/?device_id=${deviceId}`)).json() 
  })

  return (
    <div className="p-0 overflow-hidden">
      <table className="w-full text-[10px]">
        <thead className="bg-white/5 border-b border-white/5">
          <tr>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Service Name</th>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Type</th>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Status</th>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Environment</th>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Version</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {services?.map((s: any) => (
            <tr key={s.id} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 font-bold text-blue-400">{s.name}</td>
              <td className="px-4 py-3 text-slate-400 uppercase font-black text-[9px]">{s.service_type}</td>
              <td className="px-4 py-3 text-center">
                 <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                    s.status === 'Running' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-rose-400 border-rose-500/20 bg-rose-500/5'
                 }`}>{s.status}</span>
              </td>
              <td className="px-4 py-3 text-center text-slate-500 uppercase font-bold">{s.environment}</td>
              <td className="px-4 py-3 text-center font-mono text-slate-600">{s.version || 'N/A'}</td>
            </tr>
          ))}
          {!services?.length && !isLoading && (
            <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-600 font-bold uppercase italic tracking-widest">No logical services bound to this asset</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const StatusBulkUpdateModal = ({ isOpen, onClose, onApply, options }: { isOpen: boolean, onClose: () => void, onApply: (status: string) => void, options: any[] }) => {
  const [selectedStatus, setSelectedStatus] = useState('')
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
       <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-10 rounded-[40px] border-blue-500/30 space-y-6">
          <h2 className="text-xl font-black uppercase tracking-tighter text-blue-400 flex items-center space-x-3">
             <RefreshCcw size={24}/> <span>Bulk Status Transition</span>
          </h2>
          <StyledSelect
            label="Target Operational State"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            options={options?.filter((o:any) => o.category === 'Status') || []}
            placeholder="Select Status..."
          />
          <div className="flex space-x-3 pt-2">
             <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
             <button 
               disabled={!selectedStatus}
               onClick={() => onApply(selectedStatus)} 
               className="flex-2 py-3 bg-blue-600 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
             >
                Apply to Selection
             </button>
          </div>
       </motion.div>
    </div>
  )
}

const MetadataEditor = ({ value, onChange, onError }: { value: any, onChange: (v: any) => void, onError?: (err: string | null) => void }) => {
  const [mode, setMode] = useState<'table' | 'json'>('table')
  const [tableRows, setTableRows] = useState<{key: string, value: string}[]>(() => {
    const obj = typeof value === 'string' ? JSON.parse(value || '{}') : (value || {})
    return Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }))
  })
  const [jsonValue, setJsonValue] = useState(() => JSON.stringify(value || {}, null, 2))
  const [error, setError] = useState<string | null>(null)

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
        const keys = Object.keys(obj)
        if (new Set(keys).size !== keys.length) {
            setError("Duplicate keys in JSON")
            onError?.("Duplicate keys in JSON")
            return false
        }
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
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Metadata Payload</span>
            {error && <span className="text-[8px] font-black text-rose-500 uppercase animate-pulse tracking-tighter">!! {error}</span>}
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
                }} placeholder="Key" className={`flex-1 bg-black/40 border ${error?.includes('Duplicate') ? 'border-rose-500/50' : 'border-white/5'} rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-blue-500`} />
                <input value={row.value} onChange={e => {
                  const n = [...tableRows]; n[i].value = e.target.value; 
                  setTableRows(n); validateAndNotify(n);
                }} placeholder="Value" className="flex-[2] bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-[11px] outline-none" />
                <button onClick={() => {
                    const n = tableRows.filter((_, idx) => idx !== i);
                    setTableRows(n); validateAndNotify(n);
                }} className="text-slate-600 hover:text-rose-400"><X size={14}/></button>
              </div>
            ))}
            <button onClick={() => {
                const n = [...tableRows, { key: '', value: '' }];
                setTableRows(n);
            }} className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-2 hover:text-blue-300 transition-colors">+ Add Attribute Pair</button>
          </div>
        ) : (
          <textarea 
            value={jsonValue} 
            onChange={e => {
                setJsonValue(e.target.value);
                syncFromJSON(e.target.value);
            }} 
            className={`w-full h-32 bg-black/40 border ${error === 'Invalid JSON format' || error === 'Duplicate keys in JSON' ? 'border-rose-500/50' : 'border-white/5'} rounded-xl px-4 py-3 text-[11px] font-mono text-blue-300 outline-none`}
          />
        )}
      </div>
    </div>
  )
}

const MetadataViewer = ({ data }: { data: any }) => {
  const obj = typeof data === 'string' ? JSON.parse(data || '{}') : (data || {})
  return (
    <div className="p-6 space-y-4">
      <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em]">Metadata Inspection</h3>
      <div className="bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden">
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
                <td className="px-4 py-2 font-black uppercase text-slate-400">{k}</td>
                <td className="px-4 py-2 text-slate-200">{String(v)}</td>
              </tr>
            ))}
            {Object.keys(obj).length === 0 && (
              <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-600 font-bold uppercase italic">No additional payload data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AssetGrid() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'inventory' | 'decommissioned' | 'deleted'>('inventory')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeModal, setActiveModal] = useState<any>(null)
  const [activeDetails, setActiveDetails] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showUI, setShowUI] = useState(false)
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' })

  const openConfirm = (title: string, message: string, onConfirm: () => void, variant: any = 'danger') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, variant })
  }

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await fetch('/api/v1/settings/options')).json() })
  const { data: uiSettings } = useQuery({ queryKey: ['ui-settings'], queryFn: async () => (await fetch('/api/v1/settings/ui')).json() })

  const { data: assets, isLoading } = useQuery({ 
    queryKey: ['assets', activeTab], 
    queryFn: async () => {
        const flag = activeTab === 'deleted' ? 'include_deleted=true' : `include_decommissioned=${activeTab === 'decommissioned'}`
        return (await fetch(`/api/v1/devices/?${flag}`)).json() 
    }
  })

  const mutation = useMutation({
    mutationFn: async ({ data, force = false }: any) => {
      const url = data.id ? `/api/v1/devices/${data.id}` : `/api/v1/devices/?force=${force}`
      const method = data.id ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.status === 409) {
        const err = await res.json()
        if (err.detail === 'DUPLICATE_HOSTNAME_ACTIVE') throw new Error('DUPLICATE_ACTIVE')
        if (err.detail === 'WARN_EXISTING_DECOMMISSIONED') throw new Error('WARN_DECOM')
      }
      if (!res.ok) throw new Error('Failed to commit asset')
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      toast.success('System Registry Updated')
      setActiveModal(null)
    },
    onError: (e: any) => {
      if (e.message === 'DUPLICATE_ACTIVE') toast.error('ERROR: Hostname is currently ACTIVE in registry')
      else if (e.message === 'WARN_DECOM') {
        openConfirm(
          'Reactivation Request',
          'A decommissioned entry with this hostname exists. Reuse identity?',
          () => mutation.mutate({ data: activeModal, force: true }),
          'warning'
        )
      } else toast.error(e.message)
    }
  })

  const bulkMutation = useMutation({
    mutationFn: async ({ action, payload = {} }: any) => {
      const res = await fetch('/api/v1/devices/bulk-action', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ids: selectedIds, action, payload }) 
      })
      return res.json()
    },
    onSuccess: (data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      setSelectedIds([])
      setShowBulkMenu(false)
      setIsBulkStatusOpen(false)
      if (variables.action === 'restore') {
        if (data.conflicts?.length > 0) {
            toast.error(`Restored ${data.restored.length} assets. ${data.conflicts.length} failed due to hostname conflict.`)
        } else {
            toast.success(`Restored ${data.restored.length} assets successfully.`)
        }
      } else {
        toast.success('Bulk Operation Complete')
      }
    }
  })

  const columnDefs = useMemo(() => [
    { field: "id", headerName: "", width: 40, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left', cellClass: 'text-center', headerClass: 'text-center' },
    { 
      field: "name", 
      headerName: "Hostname", 
      flex: 1.2, 
      pinned: 'left',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <span className="font-bold text-blue-400">{p.value}</span>
      )
    },
    { field: "system", headerName: "System", width: 120, cellClass: 'text-center', headerClass: 'text-center' },
    { 
      field: "type", 
      headerName: "Type", 
      width: 90,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = { Physical: 'text-emerald-400', Virtual: 'text-blue-400', Storage: 'text-amber-400', Switch: 'text-rose-400' }
        return <span className={`font-black uppercase text-[9px] ${colors[p.value] || 'text-slate-500'}`}>{p.value}</span>
      }
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 100,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const isBadged = uiSettings?.status_badged ?? true
        if (!isBadged) return <span className="text-slate-400">{p.value}</span>
        const color = uiSettings?.status_colors?.[p.value] || '#64748b'
        return <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase border" style={{ color: color, borderColor: `${color}40`, backgroundColor: `${color}10` }}>{p.value}</span>
      }
    },
    { field: "environment", headerName: "Env", width: 90, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "owner", headerName: "Owner", width: 110, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "manufacturer", headerName: "MFG", width: 90, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "model", headerName: "Model", width: 100, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "os_name", headerName: "OS", width: 100, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "os_version", headerName: "Ver", width: 70, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "site_name", headerName: "Site", width: 110, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "rack_name", headerName: "Rack", width: 90, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "u_start", headerName: "U", width: 50, cellClass: "font-mono text-center", headerClass: 'text-center' },
    { field: "size_u", headerName: "Size", width: 50, cellClass: "font-mono text-center", headerClass: 'text-center' },
    {
      headerName: "Ops",
      width: 120,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/5">
               <button onClick={() => setActiveDetails(p.data)} title="System Details" className="p-1.5 hover:bg-blue-600 hover:text-white text-slate-500 rounded-md transition-all"><Search size={14}/></button>
               <button onClick={() => setActiveModal(p.data)} title="Edit Configuration" className="p-1.5 hover:bg-blue-600 hover:text-white text-slate-500 rounded-md transition-all"><Edit2 size={14}/></button>
               {activeTab !== 'deleted' ? (
                 <button onClick={() => openConfirm('Soft Delete', 'Decommission this asset?', () => bulkMutation.mutate({ action: 'delete', ids: [p.data.id] }))} title="Decommission" className="p-1.5 hover:bg-rose-600 hover:text-white text-slate-500 rounded-md transition-all"><Trash2 size={14}/></button>
               ) : (
                 <button onClick={() => openConfirm('Purge Registry', 'PURGE PERMANENTLY?', () => bulkMutation.mutate({ action: 'purge', ids: [p.data.id] }))} title="Purge" className="p-1.5 hover:bg-rose-600 hover:text-white text-slate-500 rounded-md transition-all"><Trash2 size={14}/></button>
               )}
           </div>
        </div>
      )
    }
  ], [selectedIds, uiSettings, activeTab]) as any

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic">System Registry</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Physical & Virtual Infrastructure Matrix</p>
           </div>
           <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              {['inventory', 'decommissioned', 'deleted'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                    {tab}
                </button>
              ))}
           </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SEARCH MATRIX..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>
          
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
             <button onClick={() => setShowConfig(true)} className="p-2 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Registry Config">
                <Settings size={16} />
             </button>
             <button onClick={() => setShowUI(true)} className="p-2 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="View Customization">
                <Sliders size={16} />
             </button>
          </div>

          <div className="relative">
            <button onClick={() => setShowBulkMenu(!showBulkMenu)} disabled={selectedIds.length === 0} className={`p-2 rounded-xl border transition-all ${selectedIds.length > 0 ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-slate-700 cursor-not-allowed'}`}><MoreVertical size={18}/></button>
            <AnimatePresence>
              {showBulkMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-2 space-y-1">
                   <p className="px-3 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">{selectedIds.length} Assets Selected</p>
                   {activeTab === 'deleted' ? (
                     <button onClick={() => bulkMutation.mutate({ action: 'restore' })} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-emerald-400 transition-all">Restore Selected</button>
                   ) : (
                     <>
                        <button onClick={() => { setIsBulkStatusOpen(true); setShowBulkMenu(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-blue-400 transition-all">Set Status...</button>
                        <button onClick={() => bulkMutation.mutate({ action: 'update', payload: { environment: 'Production' } })} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-slate-400 transition-all">Set Env: Production</button>
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

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4 text-blue-400">
             <RefreshCcw size={32} className="animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Synching Neural Matrix...</p>
          </div>
        )}
        <AgGridReact 
          rowData={assets || []} 
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[950px] max-h-[90vh] overflow-y-auto p-10 rounded-[40px] border-blue-500/30 custom-scrollbar">
               <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <h2 className="text-2xl font-black uppercase flex items-center space-x-4 text-blue-400">
                     <Package size={28}/> <span>{activeModal.id ? 'Modify System configuration' : 'New Asset Registration'}</span>
                  </h2>
                  <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
               </div>
               
               <AssetForm initialData={activeModal} onSave={mutation.mutate} options={options} />
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
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{activeDetails.system} // {activeDetails.type}</p>
                  </div>
                  <button onClick={() => setActiveDetails(null)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar pt-6">
                  <AssetDetailsView device={activeDetails} options={options} />
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
            { title: "Logical Systems", category: "LogicalSystem", icon: LayoutGrid },
            { title: "Asset Types", category: "DeviceType", icon: Cpu },
            { title: "Operational Status", category: "Status", icon: RefreshCcw },
            { title: "Environments", category: "Environment", icon: Globe },
        ]}
      />

      <UISettingsModal isOpen={showUI} onClose={() => setShowUI(false)} />

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
        .ag-cell { display: flex; align-items: center; justify-content: center !important; padding-left: 8px !important; padding-right: 8px !important; line-height: 28px !important; }
      `}</style>
    </div>
  )
}

const AssetDetailsView = ({ device, options }: { device: any, options: any }) => {
    const [tab, setTab] = useState('hardware')
    const queryClient = useQueryClient()
    const [metadata, setMetadata] = useState(device.metadata_json || {})
    const [metadataError, setMetadataError] = useState<string | null>(null)

    const metaMutation = useMutation({
        mutationFn: async (data: any) => fetch(`/api/v1/devices/${device.id}`, { 
            method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ metadata_json: data }) 
        }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets'] }); toast.success('Metadata Synchronized') }
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
                      disabled={!!metadataError}
                      onClick={() => {
                        metaMutation.mutate(metadata);
                      }} 
                      className={`px-4 py-2 ${metadataError ? 'bg-slate-700 cursor-not-allowed' : 'bg-emerald-600'} text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all`}
                    >
                      Save Metadata
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
                {tab === 'services' && <AssetServicesTable deviceId={device.id} />}
            </div>
        </div>
    )
}

const HWTab = ({ deviceId }: { deviceId: number }) => {
  const queryClient = useQueryClient()
  const [newComp, setNewComp] = useState({ category: 'CPU', name: '', manufacturer: '', specs: '', count: 1 })

  const mutation = useMutation({
    mutationFn: async (d: any) => fetch(`/api/v1/devices/${deviceId}/hardware`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(d) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-hw', deviceId] }); setNewComp({ category: 'CPU', name: '', manufacturer: '', specs: '', count: 1 }) }
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
         <select value={newComp.category} onChange={e => setNewComp({...newComp, category: e.target.value})} className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] outline-none">
            <option>CPU</option><option>Memory</option><option>Card</option><option>Disk</option><option>NIC</option><option>PSU</option>
         </select>
         <input value={newComp.name} onChange={e => setNewComp({...newComp, name: e.target.value})} placeholder="Component Name" className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] outline-none" />
         <input value={newComp.specs} onChange={e => setNewComp({...newComp, specs: e.target.value})} placeholder="Specifications" className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] outline-none" />
         <input type="number" value={newComp.count} onChange={e => setNewComp({...newComp, count: parseInt(e.target.value)})} className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] outline-none" />
         <button onClick={() => { if(!newComp.name) return toast.error("Name required"); mutation.mutate(newComp) }} className="bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase">Add</button>
      </div>
      <HWTable deviceId={deviceId} />
    </div>
  )
}

const HWTable = ({ deviceId }: { deviceId: number }) => {
  const queryClient = useQueryClient()
  const { data: hardware } = useQuery({ queryKey: ['device-hw', deviceId], queryFn: async () => (await fetch(`/api/v1/devices/${deviceId}/hardware`)).json() })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })
  
  const delMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/devices/hardware/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-hw', deviceId] }); toast.success('Component Purged') }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => fetch(`/api/v1/devices/hardware/${data.id}`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    }),
    onSuccess: () => { 
        queryClient.invalidateQueries({ queryKey: ['device-hw', deviceId] })
        setEditingId(null)
        toast.success('Component Updated')
    }
  })

  const catOptions = [
    { value: 'CPU', label: 'CPU' },
    { value: 'Memory', label: 'Memory' },
    { value: 'Card', label: 'Card' },
    { value: 'Disk', label: 'Disk' },
    { value: 'NIC', label: 'NIC' },
    { value: 'PSU', label: 'PSU' }
  ]

  return (
    <div className="p-0">
      <table className="w-full text-[10px]">
        <thead className="bg-white/5 border-b border-white/5">
          <tr>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Category</th>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Component</th>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Specs</th>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Qty</th>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Ops</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {hardware?.map((h: any) => (
            <tr key={h.id} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-2 text-center">
                {editingId === h.id ? (
                    <StyledSelect
                        value={editData.category}
                        onChange={e => setEditData({...editData, category: e.target.value})}
                        options={catOptions}
                        className="w-24 mx-auto"
                    />
                ) : (
                    <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">{h.category}</span>
                )}
              </td>
              <td className="px-4 py-2 font-bold text-slate-200 text-center">
                {editingId === h.id ? (
                    <input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-[10px] w-full outline-none focus:border-blue-500" />
                ) : h.name}
              </td>
              <td className="px-4 py-2 text-slate-500 text-center">
                {editingId === h.id ? (
                    <input value={editData.specs} onChange={e => setEditData({...editData, specs: e.target.value})} className="bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-[10px] w-full outline-none focus:border-blue-500" />
                ) : h.specs}
              </td>
              <td className="px-4 py-2 font-mono text-center text-slate-400">
                {editingId === h.id ? (
                    <input type="number" value={editData.count} onChange={e => setEditData({...editData, count: parseInt(e.target.value)})} className="bg-slate-900 border border-white/10 rounded-xl px-1 py-1.5 text-[10px] w-12 outline-none focus:border-blue-500" />
                ) : `x${h.count}`}
              </td>
              <td className="px-4 py-2 text-center">
                {editingId === h.id ? (
                    <div className="flex items-center justify-center space-x-1">
                        <button onClick={() => updateMutation.mutate(editData)} className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg"><Check size={14}/></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg"><X size={14}/></button>
                    </div>
                ) : (
                    <div className="flex items-center justify-center space-x-1">
                        <button onClick={() => { setEditingId(h.id); setEditData({...h}); }} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all"><Edit2 size={14}/></button>
                        <button onClick={() => setConfirmModal({ isOpen: true, title: 'Purge Component', message: 'Purge this hardware component?', onConfirm: () => delMutation.mutate(h.id) })} className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-all"><Trash2 size={14}/></button>
                    </div>
                )}
              </td>
            </tr>
          ))}
          {!hardware?.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-600 font-bold uppercase italic">No hardware mappings found</td></tr>}
        </tbody>
      </table>
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({...confirmModal, isOpen: false})}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
      />
    </div>
  )
}

const SecretsTab = ({ deviceId }: { deviceId: number }) => {
  const queryClient = useQueryClient()
  const [newSec, setNewSec] = useState({ secret_type: 'Root Password', username: '', encrypted_payload: '' })

  const mutation = useMutation({
    mutationFn: async (d: any) => fetch(`/api/v1/devices/${deviceId}/secrets`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(d) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-secrets', deviceId] }); setNewSec({ secret_type: 'Root Password', username: '', encrypted_payload: '' }); toast.success('Credential Secured') }
  })

  const secOptions = [
    { value: 'Root Password', label: 'Root Password' },
    { value: 'Admin API Key', label: 'Admin API Key' },
    { value: 'Service Account', label: 'Service Account' },
    { value: 'SSH Key', label: 'SSH Key' },
    { value: 'ILO/IDRAC', label: 'ILO/IDRAC' }
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 bg-white/5 p-3 rounded-xl border border-white/5 items-end">
         <StyledSelect
            value={newSec.secret_type}
            onChange={e => setNewSec({...newSec, secret_type: e.target.value})}
            options={secOptions}
            label="Secret Type"
         />
         <div>
            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 px-1">Identity</label>
            <input value={newSec.username} onChange={e => setNewSec({...newSec, username: e.target.value})} placeholder="Identity / Username" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" />
         </div>
         <div>
            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 px-1">Sensitive Value</label>
            <input type="password" value={newSec.encrypted_payload} onChange={e => setNewSec({...newSec, encrypted_payload: e.target.value})} placeholder="Value" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" />
         </div>
         <button onClick={() => { if(!newSec.username || !newSec.encrypted_payload) return toast.error("Identity/Value required"); mutation.mutate(newSec) }} className="h-[38px] bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Vault Entry</button>
      </div>
      <SecretsTable deviceId={deviceId} />
    </div>
  )
}

const SecretsTable = ({ deviceId }: { deviceId: number }) => {
  const queryClient = useQueryClient()
  const { data: secrets } = useQuery({ queryKey: ['device-secrets', deviceId], queryFn: async () => (await fetch(`/api/v1/devices/${deviceId}/secrets`)).json() })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<any>(null)
  const [visibleIds, setVisibleIds] = useState<number[]>([])
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  const toggleVisibility = (id: number) => {
    setVisibleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const delMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/devices/secrets/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-secrets', deviceId] }); toast.success('Credential Purged') }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => fetch(`/api/v1/devices/secrets/${data.id}`, { 
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-secrets', deviceId] }); setEditingId(null); toast.success('Credential Updated') }
  })

  const secOptions = [
    { value: 'Root Password', label: 'Root Password' },
    { value: 'Admin API Key', label: 'Admin API Key' },
    { value: 'Service Account', label: 'Service Account' },
    { value: 'SSH Key', label: 'SSH Key' },
    { value: 'ILO/IDRAC', label: 'ILO/IDRAC' }
  ]

  return (
    <div className="p-0">
      <table className="w-full text-[10px]">
        <thead className="bg-white/5 border-b border-white/5">
          <tr>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Type</th>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Identity</th>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Payload</th>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Ops</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {secrets?.map((s: any) => (
            <tr key={s.id} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-2 font-black uppercase text-amber-500/80">
                {editingId === s.id ? (
                    <StyledSelect
                        value={editData.secret_type}
                        onChange={e => setEditData({...editData, secret_type: e.target.value})}
                        options={secOptions}
                        className="w-32"
                    />
                ) : s.secret_type}
              </td>
              <td className="px-4 py-2 font-bold text-slate-200">
                {editingId === s.id ? (
                    <input value={editData.username} onChange={e => setEditData({...editData, username: e.target.value})} className="bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-[10px] w-full outline-none focus:border-blue-500" />
                ) : s.username}
              </td>
              <td className="px-4 py-2 font-mono text-slate-400">
                {editingId === s.id ? (
                    <input value={editData.encrypted_payload} onChange={e => setEditData({...editData, encrypted_payload: e.target.value})} className="bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-[10px] w-full outline-none focus:border-blue-500" placeholder="Update secret..." />
                ) : (
                    <div className="flex items-center space-x-3 group">
                       <span className={visibleIds.includes(s.id) ? 'text-blue-300' : 'text-slate-700'}>{visibleIds.includes(s.id) ? s.encrypted_payload : '••••••••••••'}</span>
                       <button onClick={() => toggleVisibility(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-blue-400">
                          {visibleIds.includes(s.id) ? <EyeOff size={14}/> : <Eye size={14}/>}
                       </button>
                    </div>
                )}
              </td>
              <td className="px-4 py-2 text-center">
                {editingId === s.id ? (
                    <div className="flex items-center justify-center space-x-1">
                        <button onClick={() => updateMutation.mutate(editData)} className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg"><Check size={14}/></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg"><X size={14}/></button>
                    </div>
                ) : (
                    <div className="flex items-center justify-center space-x-1">
                        <button onClick={() => { setEditingId(s.id); setEditData({...s}); }} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all"><Edit2 size={14}/></button>
                        <button onClick={() => setConfirmModal({ isOpen: true, title: 'Purge Credential', message: 'Permanently purge this vault entry?', onConfirm: () => delMutation.mutate(s.id) })} className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-all"><Trash2 size={14}/></button>
                    </div>
                )}
              </td>
            </tr>
          ))}
          {!secrets?.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-600 font-bold uppercase italic">No vault entries found</td></tr>}
        </tbody>
      </table>
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({...confirmModal, isOpen: false})}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
      />
    </div>
  )
}

const RelationshipsTab = ({ deviceId }: { deviceId: number }) => {
  const queryClient = useQueryClient()
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await fetch('/api/v1/devices/')).json() })
  const { data: relationships } = useQuery({ queryKey: ['device-rel', deviceId], queryFn: async () => (await fetch(`/api/v1/devices/${deviceId}/relationships`)).json() })
  const [newRel, setNewRel] = useState({ target_device_id: '', relationship_type: 'Depends On', source_role: 'Consumer', target_role: 'Provider' })

  const mutation = useMutation({
    mutationFn: async (d: any) => fetch(`/api/v1/devices/${deviceId}/relationships`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(d) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-rel', deviceId] }); toast.success('Relational Vector Mapped') }
  })

  const types = [
    { label: 'Depends On', s: 'Consumer', t: 'Provider' },
    { label: 'Hosts', s: 'Hypervisor', t: 'Guest' },
    { label: 'Backs Up', s: 'Source', t: 'Target' },
    { label: 'Replicates to', s: 'Primary', t: 'Replica' },
    { label: 'Cluster Member', s: 'Node', t: 'Peer' }
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 bg-white/5 p-3 rounded-xl border border-white/5 items-end">
         <StyledSelect
            value={newRel.target_device_id}
            onChange={e => setNewRel({...newRel, target_device_id: e.target.value})}
            options={devices?.filter((d:any)=> d.id !== deviceId).map((d:any)=>({ value: String(d.id), label: `${d.name} [${d.type}]` })) || []}
            label="Peer Entity"
            placeholder="Select Peer..."
         />
         <StyledSelect
            value={newRel.relationship_type}
            onChange={e => {
                const found = types.find(t => t.label === e.target.value)
                setNewRel({...newRel, relationship_type: e.target.value, source_role: found?.s || '', target_role: found?.t || ''})
            }}
            options={types.map(t => ({ value: t.label, label: t.label }))}
            label="Vector Type"
         />
         <button onClick={() => { if(!newRel.target_device_id) return toast.error("Select peer"); mutation.mutate(newRel) }} className="h-[38px] bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">Establish Vector</button>
      </div>
      <RelationsTable deviceId={deviceId} />
    </div>
  )
}

const RelationsTable = ({ deviceId }: { deviceId: number }) => {
  const queryClient = useQueryClient()
  const { data: relationships } = useQuery({ queryKey: ['device-rel', deviceId], queryFn: async () => (await fetch(`/api/v1/devices/${deviceId}/relationships`)).json() })
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await fetch('/api/v1/devices/')).json() })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  const currentDevice = useMemo(() => devices?.find((d: any) => d.id === deviceId), [devices, deviceId]);

  const delMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/devices/relationships/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-rel', deviceId] }); toast.success('Vector Purged') }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => fetch(`/api/v1/devices/relationships/${data.id}`, { 
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-rel', deviceId] }); setEditingId(null); toast.success('Vector Updated') }
  })

  const types = [
    { label: 'Depends On', s: 'Consumer', t: 'Provider' },
    { label: 'Hosts', s: 'Hypervisor', t: 'Guest' },
    { label: 'Backs Up', s: 'Source', t: 'Target' },
    { label: 'Replicates to', s: 'Primary', t: 'Replica' },
    { label: 'Cluster Member', s: 'Node', t: 'Peer' }
  ]

  return (
    <div className="p-0">
      <table className="w-full text-[10px]">
        <thead className="bg-white/5 border-b border-white/5">
          <tr>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Source Asset</th>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Vector Type</th>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Target Asset</th>
            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Ops</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {relationships?.map((r: any) => {
            const peer = devices?.find((d:any) => d.id === r.target_device_id)
            return (
              <tr key={r.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                   <div className="flex flex-col">
                      <span className="font-black text-white uppercase tracking-tight">{currentDevice?.name || 'Local'}</span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase">{r.source_role}</span>
                   </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {editingId === r.id ? (
                      <StyledSelect
                        value={editData.relationship_type}
                        onChange={e => {
                            const found = types.find(t => t.label === e.target.value)
                            setEditData({...editData, relationship_type: e.target.value, source_role: found?.s || '', target_role: found?.t || ''})
                        }}
                        options={types.map(t => ({ value: t.label, label: t.label }))}
                        className="w-32 mx-auto"
                      />
                  ) : (
                    <div className="flex flex-col items-center">
                       <span className="font-black text-indigo-400 uppercase tracking-widest">{r.relationship_type}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === r.id ? (
                      <StyledSelect
                        value={String(editData.target_device_id)}
                        onChange={e => setEditData({...editData, target_device_id: parseInt(e.target.value)})}
                        options={devices?.filter((d:any)=> d.id !== deviceId).map((d:any)=>({ value: String(d.id), label: d.name })) || []}
                        className="w-32"
                      />
                  ) : (
                    <div className="flex flex-col">
                       <span className="font-black text-blue-400 uppercase tracking-tight">{peer?.name || 'Unknown Entity'}</span>
                       <span className="text-[8px] font-bold text-slate-500 uppercase">{r.target_role}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {editingId === r.id ? (
                      <div className="flex items-center justify-center space-x-1">
                          <button onClick={() => updateMutation.mutate(editData)} className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg"><Check size={14}/></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg"><X size={14}/></button>
                      </div>
                  ) : (
                      <div className="flex items-center justify-center space-x-1">
                          <button onClick={() => { setEditingId(r.id); setEditData({...r}); }} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all"><Edit2 size={14}/></button>
                          <button onClick={() => setConfirmModal({ isOpen: true, title: 'Purge Vector', message: 'Purge this relational vector?', onConfirm: () => delMutation.mutate(r.id) })} className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-all"><Trash2 size={14}/></button>
                      </div>
                  )}
                </td>
              </tr>
            )
          })}
          {!relationships?.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-600 font-bold uppercase italic">No relational vectors mapped</td></tr>}
        </tbody>
      </table>
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({...confirmModal, isOpen: false})}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
      />
    </div>
  )
}

const AssetForm = ({ initialData, onSave, options }: any) => {
  const [activeSubTab, setActiveSubTab] = useState('config')
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [formData, setFormData] = useState({ 
    name: '', system: '', type: 'Physical', status: 'Active', environment: 'Production',
    owner: '', business_unit: '', manufacturer: '', model: '', serial_number: '', asset_tag: '',
    os_name: '', os_version: '',
    metadata_json: {}, ...initialData 
  })

  const getOptions = (cat: string) => Array.isArray(options) ? options.filter((o: any) => o.category === cat) : []

  return (
    <div className="space-y-6 py-6">
      <div className="flex space-x-1 bg-black/40 p-1 rounded-2xl w-fit mb-4">
         {['config', 'hardware', 'secrets', 'relations', 'metadata'].map(t => (
           <button key={t} onClick={() => setActiveSubTab(t)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
             {t === 'config' ? 'Base Config' : t === 'relations' ? 'Relationships' : t}
           </button>
         ))}
      </div>

      {activeSubTab === 'config' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 space-y-4">
             <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-blue-600 pl-3">Identity</h3>
             <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Hostname *</label>
                <input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className={`w-full bg-slate-900 border ${!formData.name ? 'border-rose-500/50' : 'border-white/10'} rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 transition-all`} 
                  placeholder="SRV-NAME-01" 
                />
             </div>
             <StyledSelect
                label="Logical System *"
                value={formData.system}
                onChange={e => setFormData({...formData, system: e.target.value})}
                options={getOptions('LogicalSystem')}
                placeholder="Select System..."
                error={!formData.system}
             />
             <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Owner (Optional)</label>
                    <input value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} placeholder="Owner" className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50" />
                </div>
                <StyledSelect
                    label="Business Unit (Optional)"
                    value={formData.business_unit}
                    onChange={e => setFormData({...formData, business_unit: e.target.value})}
                    options={getOptions('BusinessUnit')}
                    placeholder="Select BU..."
                />
             </div>
          </div>

          <div className="col-span-1 space-y-4">
             <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-emerald-600 pl-3">Classification</h3>
             <div className="grid grid-cols-2 gap-2">
                <StyledSelect
                    label="Asset Type"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    options={getOptions('DeviceType').length > 0 ? getOptions('DeviceType') : [
                        { value: 'Physical', label: 'Physical' },
                        { value: 'Virtual', label: 'Virtual' },
                        { value: 'Storage', label: 'Storage' },
                        { value: 'Switch', label: 'Switch' }
                    ]}
                />
                <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Height (U)</label>
                    <input type="number" value={formData.size_u || 1} onChange={e => setFormData({...formData, size_u: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" />
                </div>
             </div>
             <StyledSelect
                label="Operational Status"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                options={getOptions('Status').length > 0 ? getOptions('Status') : [
                    { value: 'Planned', label: 'Planned' },
                    { value: 'Active', label: 'Active' },
                    { value: 'Maintenance', label: 'Maintenance' },
                    { value: 'Decommissioned', label: 'Decommissioned' }
                ]}
             />
             <StyledSelect
                label="Environment"
                value={formData.environment}
                onChange={e => setFormData({...formData, environment: e.target.value})}
                options={getOptions('Environment').length > 0 ? getOptions('Environment') : [
                    { value: 'Production', label: 'Production' },
                    { value: 'QA', label: 'QA' },
                    { value: 'Dev', label: 'Dev' },
                    { value: 'DR', label: 'DR' }
                ]}
             />
          </div>

          <div className="col-span-1 space-y-4">
             <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-amber-600 pl-3">Software & HW</h3>
             <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Manufacturer & Model</label>
                <div className="flex space-x-2">
                   <input value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} placeholder="Dell" className="w-1/2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                   <input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="R740" className="w-1/2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                </div>
             </div>
             <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Operating System & Version</label>
                <div className="flex space-x-2">
                   <input value={formData.os_name} onChange={e => setFormData({...formData, os_name: e.target.value})} placeholder="Ubuntu" className="w-1/2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                   <input value={formData.os_version} onChange={e => setFormData({...formData, os_version: e.target.value})} placeholder="24.04 LTS" className="w-1/2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                </div>
             </div>
             <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Serial / Asset Tag</label>
                <div className="flex space-x-2">
                    <input value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} placeholder="Serial" className="w-1/2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                    <input value={formData.asset_tag} onChange={e => setFormData({...formData, asset_tag: e.target.value})} placeholder="Asset Tag" className="w-1/2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                </div>
             </div>
          </div>
        </div>
      )}

      {activeSubTab === 'metadata' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <MetadataEditor 
             value={formData.metadata_json} 
             onChange={v => setFormData({...formData, metadata_json: v})} 
             onError={setMetadataError}
           />
        </div>
      )}

      {activeSubTab === 'hardware' && (formData.id ? <HWTab deviceId={formData.id} /> : <div className="py-20 text-center text-slate-500 font-bold uppercase text-[10px]">Registry entity required before hardware mapping</div>)}
      {activeSubTab === 'secrets' && (formData.id ? <SecretsTab deviceId={formData.id} /> : <div className="py-20 text-center text-slate-500 font-bold uppercase text-[10px]">Registry entity required before vault assignment</div>)}
      {activeSubTab === 'relations' && (formData.id ? <RelationshipsTab deviceId={formData.id} /> : <div className="py-20 text-center text-slate-500 font-bold uppercase text-[10px]">Registry entity required before relational mapping</div>)}

      <div className="flex space-x-4 pt-4 border-t border-white/5">
        <button 
          disabled={!!metadataError}
          onClick={() => { 
            if(!formData.name || !formData.system) return toast.error("Hostname and Logical System are mandatory"); 
            onSave({ data: formData }) 
          }} 
          className={`flex-1 py-4 ${metadataError ? 'bg-slate-700 cursor-not-allowed' : 'bg-blue-600'} text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all`}
        >
           Commit Matrix Configuration
        </button>
      </div>
    </div>
  )
}
