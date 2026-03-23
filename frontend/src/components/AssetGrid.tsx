import React, { useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Cpu, Package, Key, X, Check, Save, Layers, Monitor, RefreshCcw, Edit2, ShieldAlert, Share2, Clipboard, HardDrive, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

const ExpansionModal = ({ title, icon: Icon, color, deviceId, resourceType, onClose }: any) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<any>({})
  
  const { data, isLoading } = useQuery({
    queryKey: ['expansion', resourceType, deviceId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/devices/${deviceId}/${resourceType}`)
      if (!res.ok) return []
      return res.json()
    }
  })

  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/v1/devices/${deviceId}/${resourceType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expansion', resourceType, deviceId] })
      setFormData({})
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const endpoint = resourceType === 'hardware' ? 'hardware' : resourceType === 'software' ? 'software' : 'secrets'
      return fetch(`/api/v1/devices/${endpoint}/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expansion', resourceType, deviceId] })
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[600px] p-8 rounded-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${color}-500/10`}>
              <Icon size={20} className={`text-${color}-400`} />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tighter">{title} Registry</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {data?.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
              <div className="flex flex-col">
                 <span className="text-xs text-slate-300 font-bold uppercase tracking-widest">{item.name || item.model || item.secret_type}</span>
                 <span className="text-[10px] text-slate-500 font-mono italic">
                    {resourceType === 'hardware' && `${item.type} • ${item.specs}`}
                    {resourceType === 'software' && `${item.category} • v${item.version}`}
                    {resourceType === 'secrets' && `${item.username} • ••••••••`}
                 </span>
              </div>
              <button onClick={() => deleteMutation.mutate(item.id)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition-all"><Trash2 size={14}/></button>
            </div>
          ))}
          {(!isLoading && (!data || data.length === 0)) && <p className="text-center py-12 text-[10px] text-slate-600 uppercase tracking-widest font-black">Empty Component Store</p>}
        </div>

        {/* Dynamic Form based on type */}
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 space-y-4">
           <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Register New Component</h3>
           <div className="grid grid-cols-2 gap-3">
              {resourceType === 'hardware' && (
                <>
                  <input placeholder="Type (CPU/RAM...)" onChange={e => setFormData({...formData, type: e.target.value})} className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-[10px] outline-none" />
                  <input placeholder="Model Name" onChange={e => setFormData({...formData, model: e.target.value})} className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-[10px] outline-none" />
                  <input placeholder="Specifications" onChange={e => setFormData({...formData, specs: e.target.value})} className="col-span-2 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-[10px] outline-none" />
                </>
              )}
              {resourceType === 'software' && (
                <>
                  <input placeholder="Category" onChange={e => setFormData({...formData, category: e.target.value})} className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-[10px] outline-none" />
                  <input placeholder="Software Name" onChange={e => setFormData({...formData, name: e.target.value})} className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-[10px] outline-none" />
                  <input placeholder="Version" onChange={e => setFormData({...formData, version: e.target.value})} className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-[10px] outline-none" />
                  <input placeholder="Purpose" onChange={e => setFormData({...formData, purpose: e.target.value})} className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-[10px] outline-none" />
                </>
              )}
              {resourceType === 'secrets' && (
                <>
                  <input placeholder="Type (SSH/IPMI)" onChange={e => setFormData({...formData, secret_type: e.target.value})} className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-[10px] outline-none" />
                  <input placeholder="Username" onChange={e => setFormData({...formData, username: e.target.value})} className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-[10px] outline-none" />
                  <input placeholder="Password/Key" type="password" onChange={e => setFormData({...formData, encrypted_payload: e.target.value})} className="col-span-2 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-[10px] outline-none" />
                </>
              )}
           </div>
           <button onClick={() => addMutation.mutate(formData)} className={`w-full py-2 bg-${color}-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg`}>Commit to Registry</button>
        </div>
      </motion.div>
    </div>
  )
}

const ProvisionModal = ({ asset, onClose }: { asset?: any, onClose: () => void }) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState(asset || { 
    name: '', system: '', model: '', manufacturer: '', os: '', type: 'physical', status: 'active',
    serial_number: '', asset_tag: '', power_max_w: 0, power_idle_w: 0, 
    owner: '', vendor: '', purchase_order: '', sustainability_notes: ''
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = asset ? `/api/v1/devices/${asset.id}` : '/api/v1/devices/'
      const method = asset ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Operation failed') }
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['devices'] }); onClose() },
    onError: (err: any) => alert(err.message)
  })

  const handleCommit = () => {
    if (!formData.name || !formData.serial_number || !formData.asset_tag) return alert('Hostname, SN, and Asset Tag are required')
    mutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[700px] max-h-[90vh] overflow-y-auto p-10 rounded-[40px] space-y-8 custom-scrollbar relative">
        <div className="flex items-center justify-between">
           <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center space-x-3 text-blue-400">
              <Monitor size={28} />
              <span>{asset ? 'Modify Asset Registry' : 'Provision New Entity'}</span>
           </h2>
           <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={24}/></button>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
           <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-white/5 pb-2">Identification</h3>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hostname *</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-blue-500/50 text-xs" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logical System</label>
                <input value={formData.system} onChange={e => setFormData({...formData, system: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Serial Number *</label>
                    <input value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Asset Tag *</label>
                    <input value={formData.asset_tag} onChange={e => setFormData({...formData, asset_tag: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs" />
                 </div>
              </div>
           </section>

           <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-white/5 pb-2">Classification</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs">
                       <option value="active">Active</option>
                       <option value="maintenance">Maintenance</option>
                       <option value="eol">EOL</option>
                       <option value="provisioning">Provisioning</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs">
                       <option value="physical">Physical</option>
                       <option value="virtual">Virtual</option>
                       <option value="storage">Storage</option>
                       <option value="switch">Switch</option>
                    </select>
                 </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Operating System</label>
                <input value={formData.os} onChange={e => setFormData({...formData, os: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Model</label>
                    <input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Manufacturer</label>
                    <input value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs" />
                 </div>
              </div>
           </section>

           <section className="col-span-2 space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-white/5 pb-2">Sustaining & Ownership</h3>
              <div className="grid grid-cols-3 gap-4">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Owner</label>
                    <input value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendor</label>
                    <input value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">P.O. Number</label>
                    <input value={formData.purchase_order} onChange={e => setFormData({...formData, purchase_order: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs" />
                 </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sustaining Notes</label>
                <textarea value={formData.sustainability_notes} onChange={e => setFormData({...formData, sustainability_notes: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs min-h-[80px]" />
              </div>
           </section>
        </div>

        <div className="flex space-x-4 pt-6 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Abort</button>
          <button onClick={handleCommit} className="flex-1 py-4 bg-blue-600 text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Commit to Registry</button>
        </div>
      </motion.div>
    </div>
  )
}

export default function AssetGrid() {
  const queryClient = useQueryClient()
  const [activeExpansion, setActiveExpansion] = useState<any>(null)
  const [activeProvision, setActiveProvision] = useState<any>(null)

  const { data: devices, isLoading } = useQuery({ 
    queryKey: ['devices'], 
    queryFn: async () => (await fetch('/api/v1/devices/')).json()
  })

  const deleteDevice = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/devices/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devices'] })
  })

  const columnDefs = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true, filter: 'agNumberColumnFilter', pinned: 'left' },
    { field: 'system', headerName: 'Logical System', width: 140, filter: true },
    { field: 'name', headerName: 'Hostname', width: 180, filter: true, checkboxSelection: true, headerCheckboxSelection: true },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120, 
      cellRenderer: (params: any) => {
        const colors: any = { active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20', maintenance: 'bg-amber-500/20 text-amber-400 border-amber-500/20', eol: 'bg-rose-500/20 text-rose-400 border-rose-500/20' }
        return (
          <div className="flex items-center h-full">
            <div className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-[0.1em] ${colors[params.value] || 'bg-slate-500/20 text-slate-400 border-slate-500/20'}`}>
              {params.value}
            </div>
          </div>
        )
      }
    },
    { field: 'model', headerName: 'Model', width: 120, filter: true },
    { field: 'os', headerName: 'OS', width: 130, filter: true },
    { field: 'type', headerName: 'Type', width: 100, filter: true },
    { field: 'owner', headerName: 'Owner', width: 120, filter: true },
    { field: 'vendor', headerName: 'Vendor', width: 120, filter: true },
    { 
      headerName: 'Related Servers', 
      width: 200, 
      cellRenderer: (params: any) => (
        <div className="flex -space-x-2 overflow-hidden items-center h-full">
           {params.data.relationships?.map((r: any, i: number) => (
             <div key={i} title={`${r.type}: ${r.target_name}`} className="w-6 h-6 rounded-full bg-slate-800 border-2 border-[#020617] flex items-center justify-center text-[8px] font-black uppercase text-blue-400">{r.target_name.slice(0,2)}</div>
           ))}
           {(!params.data.relationships || params.data.relationships.length === 0) && <span className="text-[10px] text-slate-600 italic">No relations</span>}
        </div>
      )
    },
    {
      headerName: 'Extensions & Operations',
      width: 240,
      suppressMovable: true,
      pinned: 'right',
      cellRenderer: (params: any) => (
        <div className="flex items-center space-x-2 h-full">
          <button onClick={() => setActiveExpansion({ type: 'hardware', deviceId: params.data.id })} title="Hardware Expansion" className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors group"><Cpu size={14}/></button>
          <button onClick={() => setActiveExpansion({ type: 'software', deviceId: params.data.id })} title="Software Stack" className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors group"><Package size={14}/></button>
          <button onClick={() => setActiveExpansion({ type: 'secrets', deviceId: params.data.id })} title="Credential Vault" className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors group"><Key size={14}/></button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={() => setActiveProvision(params.data)} title="Edit Asset" className="p-1.5 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 rounded-lg transition-colors group"><Edit2 size={14}/></button>
          <button onClick={() => { if(confirm('Purge asset from registry?')) deleteDevice.mutate(params.data.id) }} title="Delete Asset" className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors group"><Trash2 size={14}/></button>
        </div>
      )
    }
  ], [deleteDevice])

  return (
    <div className="h-full flex flex-col space-y-4 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase">Registry Intelligence</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Consolidated infrastructure asset repository</p>
        </div>
        <button onClick={() => setActiveProvision({})} className="px-6 py-3 bg-[#034EA2] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#034EA2]/30 hover:scale-[1.02] active:scale-95 transition-all">
          + Provision Entity
        </button>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <RefreshCcw size={32} className="text-blue-400 animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Syncing Registry...</p>
          </div>
        )}
        <AgGridReact
          rowData={devices || []}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, sortable: true, filter: true }}
          rowSelection="multiple"
          animateRows={true}
          headerHeight={48}
          rowHeight={52}
        />
      </div>

      <AnimatePresence>
        {activeExpansion && (
          <ExpansionModal 
            title={activeExpansion.type === 'hardware' ? 'Hardware Inventory' : activeExpansion.type === 'software' ? 'Software Application Stack' : 'Credential Vault'}
            icon={activeExpansion.type === 'hardware' ? Cpu : activeExpansion.type === 'software' ? Package : Key}
            color={activeExpansion.type === 'hardware' ? 'blue' : activeExpansion.type === 'software' ? 'emerald' : 'amber'}
            deviceId={activeExpansion.deviceId}
            resourceType={activeExpansion.type}
            onClose={() => setActiveExpansion(null)}
          />
        )}
        {activeProvision && <ProvisionModal asset={Object.keys(activeProvision).length > 0 ? activeProvision : null} onClose={() => setActiveProvision(null)} />}
      </AnimatePresence>
      
      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(15, 23, 42, 0.6);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 11px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-size: 10px !important; }
        .ag-cell { display: flex; align-items: center; }
      `}</style>
    </div>
  )
}
