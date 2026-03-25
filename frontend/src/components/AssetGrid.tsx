import React, { useMemo, useState, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Cpu, Package, Key, X, Save, RefreshCcw, Search, Edit2, LayoutGrid, List, FileJson, Check, MoreVertical } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const MetadataEditor = ({ value, onChange }: { value: any, onChange: (v: any) => void }) => {
  const [mode, setMode] = useState<'table' | 'json'>('table')
  const [tableRows, setTableRows] = useState(() => {
    const obj = typeof value === 'string' ? JSON.parse(value || '{}') : (value || {})
    return Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }))
  })
  const [jsonValue, setJsonValue] = useState(() => JSON.stringify(value || {}, null, 2))

  useEffect(() => {
    if (mode === 'table') {
      const obj: any = {}
      tableRows.forEach(r => { if (r.key) obj[r.key] = r.value })
      onChange(obj)
    } else {
      try { onChange(JSON.parse(jsonValue)) } catch (e) {}
    }
  }, [tableRows, jsonValue, mode])

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
         <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Metadata Payload</span>
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
                  const n = [...tableRows]; n[i].key = e.target.value; setTableRows(n)
                }} placeholder="Key" className="flex-1 bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-blue-500" />
                <input value={row.value} onChange={e => {
                  const n = [...tableRows]; n[i].value = e.target.value; setTableRows(n)
                }} placeholder="Values (comma-sep)" className="flex-[2] bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-[11px] outline-none" />
                <button onClick={() => setTableRows(tableRows.filter((_, idx) => idx !== i))} className="text-slate-600 hover:text-rose-400"><X size={14}/></button>
              </div>
            ))}
            <button onClick={() => setTableRows([...tableRows, { key: '', value: '' }])} className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-2 hover:text-blue-300 transition-colors">+ Add Attribute Pair</button>
          </div>
        ) : (
          <textarea value={jsonValue} onChange={e => setJsonValue(e.target.value)} className="w-full h-32 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-mono text-blue-300 outline-none" />
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
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(obj).map(([k, v]) => (
          <div key={k} className="bg-white/5 border border-white/5 p-3 rounded-xl">
             <span className="text-[8px] font-black uppercase text-slate-500 block mb-1">{k}</span>
             <span className="text-[10px] font-bold text-slate-200">{String(v)}</span>
          </div>
        ))}
        {Object.keys(obj).length === 0 && <p className="col-span-2 text-[10px] font-bold text-slate-600 uppercase text-center py-4 italic">No additional payload data</p>}
      </div>
    </div>
  )
}

export default function AssetGrid() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'inventory' | 'decommissioned'>('inventory')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeModal, setActiveModal] = useState<any>(null)
  const [viewMetadata, setViewMetadata] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showBulkMenu, setShowBulkMenu] = useState(false)

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await fetch('/api/v1/settings/options')).json() })
  const getOptions = (cat: string) => Array.isArray(options) ? options.filter((o: any) => o.category === cat) : []

  const { data: assets, isLoading } = useQuery({ 
    queryKey: ['assets', activeTab], 
    queryFn: async () => (await fetch(`/api/v1/devices/?include_decommissioned=${activeTab === 'decommissioned'}`)).json() 
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
        if (confirm('A decommissioned entry with this hostname exists. Reuse identity?')) {
          mutation.mutate({ data: activeModal, force: true })
        }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      setSelectedIds([])
      setShowBulkMenu(false)
      toast.success('Bulk Operation Complete')
    }
  })

  const columnDefs = useMemo(() => [
    { field: "id", headerName: "", width: 50, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left' },
    { 
      field: "name", 
      headerName: "Hostname", 
      flex: 1, 
      pinned: 'left',
      cellRenderer: (p: any) => (
        <div className="flex items-center space-x-2 h-full font-bold text-blue-400">
           <LayoutGrid size={12} className="opacity-50" />
           <span>{p.value}</span>
        </div>
      )
    },
    { field: "system", headerName: "System", width: 150 },
    { 
      field: "type", 
      headerName: "Type", 
      width: 100,
      cellRenderer: (p: any) => {
        const colors: any = { Physical: 'text-emerald-400', Virtual: 'text-blue-400', Storage: 'text-amber-400', Switch: 'text-rose-400' }
        return <span className={`font-black uppercase text-[9px] ${colors[p.value] || 'text-slate-500'}`}>{p.value}</span>
      }
    },
    { field: "status", headerName: "Status", width: 110 },
    { field: "site_name", headerName: "Site", width: 120 },
    { field: "rack_name", headerName: "Rack", width: 100 },
    { field: "u_start", headerName: "U", width: 60, cellClass: "font-mono" },
    { field: "owner", headerName: "Owner", width: 130 },
    {
      headerName: "Payload",
      width: 80,
      cellRenderer: (p: any) => (
        <button onClick={() => setViewMetadata(p.data.metadata_json)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-blue-400 transition-all"><FileJson size={14}/></button>
      )
    },
    {
      headerName: "Ops",
      width: 100,
      pinned: 'right',
      cellRenderer: (p: any) => (
        <div className="flex items-center space-x-1 h-full">
           <button onClick={() => setActiveModal(p.data)} className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-blue-400 transition-all"><Edit2 size={14}/></button>
           <button onClick={() => { if(confirm('Purge this asset from registry?')) bulkMutation.mutate({ action: 'delete', ids: [p.data.id] }) }} className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-rose-400 transition-all"><Trash2 size={14}/></button>
        </div>
      )
    }
  ], [selectedIds])

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic">System Registry</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Physical & Virtual Infrastructure Matrix</p>
           </div>
           <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              <button onClick={() => setActiveTab('inventory')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>Inventory</button>
              <button onClick={() => setActiveTab('decommissioned')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'decommissioned' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>Decommissioned</button>
           </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SEARCH MATRIX..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>
          
          <div className="relative">
            <button onClick={() => setShowBulkMenu(!showBulkMenu)} disabled={selectedIds.length === 0} className={`p-2 rounded-xl border transition-all ${selectedIds.length > 0 ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-slate-700 cursor-not-allowed'}`}><MoreVertical size={18}/></button>
            <AnimatePresence>
              {showBulkMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-2 space-y-1">
                   <p className="px-3 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">{selectedIds.length} Assets Selected</p>
                   <button onClick={() => bulkMutation.mutate({ action: 'update', payload: { status: 'Active' } })} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-emerald-400 transition-all">Set Active</button>
                   <button onClick={() => bulkMutation.mutate({ action: 'update', payload: { status: 'Maintenance' } })} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-amber-400 transition-all">Set Maintenance</button>
                   <button onClick={() => bulkMutation.mutate({ action: 'update', payload: { status: 'Decommissioned' } })} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-rose-400 transition-all">Decommission</button>
                   <div className="h-px bg-white/5 mx-2 my-1" />
                   <button onClick={() => { if(confirm(`Purge ${selectedIds.length} assets permanently?`)) bulkMutation.mutate({ action: 'delete' }) }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-rose-500/20 rounded-lg text-rose-500 transition-all">Bulk Purge</button>
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

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[900px] max-h-[90vh] overflow-y-auto p-10 rounded-[40px] border-blue-500/30 custom-scrollbar">
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
        {viewMetadata && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-[400px] rounded-[30px] overflow-hidden border-blue-500/20">
               <div className="flex justify-end p-4 absolute right-0"><button onClick={() => setViewMetadata(null)} className="text-slate-500 hover:text-white"><X size={20}/></button></div>
               <MetadataViewer data={viewMetadata} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-size: 9px !important; }
        .ag-cell { display: flex; align-items: center; padding-left: 8px !important; padding-right: 8px !important; line-height: 28px !important; }
      `}</style>
    </div>
  )
}

const HWTab = ({ deviceId }: { deviceId: number }) => {
  const queryClient = useQueryClient()
  const { data: hardware } = useQuery({ queryKey: ['device-hw', deviceId], queryFn: async () => (await fetch(`/api/v1/devices/${deviceId}/hardware`)).json() })
  const [newComp, setNewComp] = useState({ category: 'CPU', name: '', manufacturer: '', specs: '', count: 1 })

  const mutation = useMutation({
    mutationFn: async (d: any) => fetch(`/api/v1/devices/${deviceId}/hardware`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(d) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-hw'] }); setNewComp({ category: 'CPU', name: '', manufacturer: '', specs: '', count: 1 }) }
  })

  const delMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/devices/hardware/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['device-hw'] })
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
      <div className="space-y-1">
        {hardware?.map((h: any) => (
          <div key={h.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 transition-all group">
             <div className="flex items-center space-x-4">
                <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md w-12 text-center">{h.category}</span>
                <span className="text-[11px] font-bold text-slate-200">{h.name}</span>
                <span className="text-[10px] text-slate-500">{h.specs}</span>
                <span className="text-[10px] font-mono text-slate-600">x{h.count}</span>
             </div>
             <button onClick={() => delMutation.mutate(h.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1"><Trash2 size={14}/></button>
          </div>
        ))}
      </div>
    </div>
  )
}

const SecretsTab = ({ deviceId }: { deviceId: number }) => {
  const queryClient = useQueryClient()
  const { data: secrets } = useQuery({ queryKey: ['device-secrets', deviceId], queryFn: async () => (await fetch(`/api/v1/devices/${deviceId}/secrets`)).json() })
  const [newSec, setNewSec] = useState({ secret_type: 'Root Password', username: '', encrypted_payload: '' })

  const mutation = useMutation({
    mutationFn: async (d: any) => fetch(`/api/v1/devices/${deviceId}/secrets`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(d) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-secrets'] }); setNewSec({ secret_type: 'Root Password', username: '', encrypted_payload: '' }); toast.success('Credential Secured') }
  })

  const delMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/devices/secrets/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['device-secrets'] })
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
         <select value={newSec.secret_type} onChange={e => setNewSec({...newSec, secret_type: e.target.value})} className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] outline-none">
            <option>Root Password</option><option>Admin API Key</option><option>Service Account</option><option>SSH Key</option><option>ILO/IDRAC</option>
         </select>
         <input value={newSec.username} onChange={e => setNewSec({...newSec, username: e.target.value})} placeholder="Identity / Username" className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] outline-none" />
         <input type="password" value={newSec.encrypted_payload} onChange={e => setNewSec({...newSec, encrypted_payload: e.target.value})} placeholder="Sensitive Value" className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] outline-none" />
         <button onClick={() => { if(!newSec.username || !newSec.encrypted_payload) return toast.error("Identity/Value required"); mutation.mutate(newSec) }} className="bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Vault Entry</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {secrets?.map((s: any) => (
          <div key={s.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-blue-500/20 transition-all">
             <div className="flex items-center space-x-4">
                <Key size={16} className="text-amber-400" />
                <div>
                   <p className="text-[8px] font-black uppercase text-slate-500">{s.secret_type}</p>
                   <p className="text-[11px] font-bold text-slate-200">{s.username}</p>
                </div>
             </div>
             <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 hover:bg-white/5 rounded text-slate-500 hover:text-blue-400"><RefreshCcw size={14}/></button>
                <button onClick={() => delMutation.mutate(s.id)} className="p-1.5 hover:bg-rose-500/10 rounded text-slate-500 hover:text-rose-400"><Trash2 size={14}/></button>
             </div>
          </div>
        ))}
      </div>
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['device-rel'] }); toast.success('Relational Vector Mapped') }
  })

  const delMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/devices/relationships/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['device-rel'] })
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
      <div className="grid grid-cols-3 gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
         <select value={newRel.target_device_id} onChange={e => setNewRel({...newRel, target_device_id: e.target.value})} className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] outline-none">
            <option value="">Select Peer Entity...</option>
            {devices?.filter((d:any)=> d.id !== deviceId).map((d:any)=><option key={d.id} value={d.id}>{d.name} [{d.type}]</option>)}
         </select>
         <select value={newRel.relationship_type} onChange={e => {
           const found = types.find(t => t.label === e.target.value)
           setNewRel({...newRel, relationship_type: e.target.value, source_role: found?.s || '', target_role: found?.t || ''})
         }} className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] outline-none">
            {types.map(t => <option key={t.label}>{t.label}</option>)}
         </select>
         <button onClick={() => { if(!newRel.target_device_id) return toast.error("Select peer"); mutation.mutate(newRel) }} className="bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Establish Vector</button>
      </div>
      <div className="space-y-1">
        {relationships?.map((r: any) => {
          const peer = devices?.find((d:any) => d.id === r.target_device_id)
          return (
            <div key={r.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-indigo-500/20">
               <div className="flex items-center space-x-6">
                  <div className="text-center w-20">
                     <p className="text-[7px] font-black uppercase text-slate-500 mb-0.5">Role</p>
                     <p className="text-[10px] font-bold text-slate-200">{r.source_role}</p>
                  </div>
                  <div className="flex flex-col items-center">
                     <span className="text-[8px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-3 py-0.5 rounded-full mb-1">{r.relationship_type}</span>
                     <ArrowRightLeft size={12} className="text-slate-600" />
                  </div>
                  <div className="text-left">
                     <p className="text-[7px] font-black uppercase text-slate-500 mb-0.5">{r.target_role}</p>
                     <p className="text-[11px] font-bold text-blue-400">{peer?.name || 'Unknown Entity'}</p>
                  </div>
               </div>
               <button onClick={() => delMutation.mutate(r.id)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-400 transition-all"><Trash2 size={14}/></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const AssetForm = ({ initialData, onSave, options }: any) => {
  const [activeSubTab, setActiveSubTab] = useState('config')
  const [formData, setFormData] = useState({ 
    name: '', system: '', type: 'Physical', status: 'Active', environment: 'Production',
    owner: '', business_unit: '', manufacturer: '', model: '', serial_number: '', asset_tag: '',
    metadata_json: {}, ...initialData 
  })

  const getOptions = (cat: string) => Array.isArray(options) ? options.filter((o: any) => o.category === cat) : []

  return (
    <div className="space-y-6 py-6">
      <div className="flex space-x-1 bg-black/40 p-1 rounded-2xl w-fit mb-4">
         {['config', 'hardware', 'secrets', 'relations'].map(t => (
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
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" placeholder="SRV-NAME-01" />
             </div>
             <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Logical System *</label>
                <select value={formData.system} onChange={e => setFormData({...formData, system: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none">
                   <option value="">Select System...</option>
                   {getOptions('LogicalSystem').map(o => <option key={o.id} value={o.value}>{o.label}</option>)}
                </select>
             </div>
             <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Owner / BU *</label>
                <div className="flex space-x-2">
                   <input value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} placeholder="Owner" className="w-1/2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                   <input value={formData.business_unit} onChange={e => setFormData({...formData, business_unit: e.target.value})} placeholder="BU" className="w-1/2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                </div>
             </div>
          </div>

          <div className="col-span-1 space-y-4">
             <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-emerald-600 pl-3">Classification</h3>
             <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Asset Type</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none">
                   {getOptions('DeviceType').map(o => <option key={o.id} value={o.value}>{o.label}</option>)}
                   {getOptions('DeviceType').length === 0 && <>
                      <option>Physical</option><option>Virtual</option><option>Storage</option><option>Switch</option>
                   </>}
                </select>
             </div>
             <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Operational Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none">
                   {getOptions('Status').map(o => <option key={o.id} value={o.value}>{o.label}</option>)}
                   {getOptions('Status').length === 0 && <>
                      <option>Planned</option><option>Active</option><option>Maintenance</option><option>Decommissioned</option>
                   </>}
                </select>
             </div>
             <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Environment</label>
                <select value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none">
                   {getOptions('Environment').map(o => <option key={o.id} value={o.value}>{o.label}</option>)}
                   {getOptions('Environment').length === 0 && <>
                      <option>Production</option><option>QA</option><option>Dev</option><option>DR</option>
                   </>}
                </select>
             </div>
          </div>

          <div className="col-span-1 space-y-4">
             <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-amber-600 pl-3">Hardware Info</h3>
             <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Manufacturer & Model</label>
                <div className="flex space-x-2">
                   <input value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} placeholder="Dell" className="w-1/2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                   <input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="R740" className="w-1/2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" />
                </div>
             </div>
             <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Serial Number</label>
                <input value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none" />
             </div>
             <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Asset Tag</label>
                <input value={formData.asset_tag} onChange={e => setFormData({...formData, asset_tag: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none" />
             </div>
          </div>

          <div className="col-span-3">
             <MetadataEditor value={formData.metadata_json} onChange={v => setFormData({...formData, metadata_json: v})} />
          </div>
        </div>
      )}

      {activeSubTab === 'hardware' && (formData.id ? <HWTab deviceId={formData.id} /> : <div className="py-20 text-center text-slate-500 font-bold uppercase text-[10px]">Registry entity required before hardware mapping</div>)}
      {activeSubTab === 'secrets' && (formData.id ? <SecretsTab deviceId={formData.id} /> : <div className="py-20 text-center text-slate-500 font-bold uppercase text-[10px]">Registry entity required before vault assignment</div>)}
      {activeSubTab === 'relations' && (formData.id ? <RelationshipsTab deviceId={formData.id} /> : <div className="py-20 text-center text-slate-500 font-bold uppercase text-[10px]">Registry entity required before relational mapping</div>)}

      <div className="flex space-x-4 pt-4 border-t border-white/5">
        <button onClick={() => { if(!formData.name || !formData.system || !formData.owner) return toast.error("Identity marked with * is mandatory"); onSave({ data: formData }) }} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all">
           Commit Matrix Configuration
        </button>
      </div>
    </div>
  )
}
