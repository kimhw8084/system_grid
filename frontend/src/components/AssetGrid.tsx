import React, { useMemo, useState, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Cpu, Package, Key, X, Save, Monitor, RefreshCcw, Edit2, Archive, ArrowLeftRight, Server, Link } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

// ----------------------
// EXTENSION MODALS (HW/SW/CREDS/RELATIONS)
// ----------------------
const ExtensionModal = ({ title, icon: Icon, color, deviceId, resourceType, onClose }: any) => {
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

  const { data: allDevices } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => (await fetch('/api/v1/devices/')).json(),
    enabled: resourceType === 'relationships'
  })

  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/v1/devices/${deviceId}/${resourceType}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      if(!res.ok) throw new Error("Add failed")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expansion', resourceType, deviceId] })
      setFormData({})
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/devices/${resourceType}/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expansion', resourceType, deviceId] })
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[900px] p-6 rounded-2xl space-y-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${color}-500/10`}><Icon size={18} className={`text-${color}-400`} /></div>
            <h2 className="text-lg font-black uppercase tracking-tighter">{title} Registry</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        {/* Dynamic Form */}
        <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 space-y-3">
           <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Register New Component</h3>
           <div className="flex flex-wrap gap-2">
              {resourceType === 'hardware' && (
                <>
                  <select onChange={e => setFormData({...formData, category: e.target.value})} className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-blue-500/50">
                    <option value="">Type...</option><option>CPU</option><option>Memory</option><option>Card</option><option>SSD</option><option>HDD</option><option>NIC</option>
                  </select>
                  <input placeholder="Name" onChange={e => setFormData({...formData, name: e.target.value})} className="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none" />
                  <input placeholder="Manufacturer" onChange={e => setFormData({...formData, manufacturer: e.target.value})} className="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none" />
                  <input placeholder="Spec (e.g. 64GB)" onChange={e => setFormData({...formData, capacity: e.target.value})} className="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none" />
                  <input type="number" placeholder="Count" onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-16 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none" />
                </>
              )}
              {resourceType === 'software' && (
                <>
                  <select onChange={e => setFormData({...formData, category: e.target.value})} className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-emerald-500/50">
                    <option value="">Category...</option><option>OS</option><option>Database</option><option>Agent</option><option>Web Server</option><option>Utility</option><option>Driver</option><option>Metrology Tool</option>
                  </select>
                  <input placeholder="Name" onChange={e => setFormData({...formData, name: e.target.value})} className="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none" />
                  <input placeholder="Version" onChange={e => setFormData({...formData, version: e.target.value})} className="w-24 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none" />
                  <input placeholder="Purpose" onChange={e => setFormData({...formData, purpose: e.target.value})} className="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none" />
                  <input type="date" onChange={e => setFormData({...formData, install_date: e.target.value})} className="w-32 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none" />
                </>
              )}
              {resourceType === 'secrets' && (
                <>
                  <select onChange={e => setFormData({...formData, credential_type: e.target.value})} className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-amber-500/50">
                    <option value="">Type...</option><option>SSH</option><option>IPMI</option><option>Root</option><option>Database</option><option>API Key</option><option>LDAP Bind</option>
                  </select>
                  <input placeholder="Username" onChange={e => setFormData({...formData, username: e.target.value})} className="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none" />
                  <input placeholder="Password / Key" type="password" onChange={e => setFormData({...formData, encrypted_payload: e.target.value})} className="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none" />
                  <input placeholder="Notes" onChange={e => setFormData({...formData, notes: e.target.value})} className="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none" />
                </>
              )}
              {resourceType === 'relationships' && (
                <>
                  <select onChange={e => setFormData({...formData, target_id: e.target.value})} className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none">
                    <option value="">Target Device...</option>{allDevices?.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <select onChange={e => setFormData({...formData, type: e.target.value})} className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none">
                    <option value="">Relation Type...</option><option>VM Host</option><option>HA Pair</option><option>Replication</option><option>Load Balancer</option><option>Database Cluster</option>
                  </select>
                  <input placeholder="Source Role" onChange={e => setFormData({...formData, source_role: e.target.value})} className="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none" />
                  <input placeholder="Target Role" onChange={e => setFormData({...formData, target_role: e.target.value})} className="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs outline-none" />
                </>
              )}
           </div>
           <button onClick={() => addMutation.mutate(formData)} className={`w-full py-1.5 bg-${color}-600/20 text-${color}-400 border border-${color}-500/30 rounded text-[10px] font-black uppercase tracking-widest hover:bg-${color}-500/30 transition-all`}>+ Register Entry</button>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl bg-[#020617]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 sticky top-0 border-b border-white/10 text-[9px] uppercase text-slate-500">
              <tr>
                {resourceType === 'hardware' && <><th className="p-2">Type</th><th className="p-2">Name</th><th className="p-2">Spec</th><th className="p-2">Count</th></>}
                {resourceType === 'software' && <><th className="p-2">Category</th><th className="p-2">Name</th><th className="p-2">Version</th><th className="p-2">Purpose</th></>}
                {resourceType === 'secrets' && <><th className="p-2">Type</th><th className="p-2">Username</th><th className="p-2">Secret</th><th className="p-2">Notes</th></>}
                {resourceType === 'relationships' && <><th className="p-2">Type</th><th className="p-2">Target</th><th className="p-2">Source Role</th><th className="p-2">Target Role</th></>}
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data?.map((item: any) => (
                <tr key={item.id} className="hover:bg-white/5">
                  {resourceType === 'hardware' && <><td className="p-2 font-bold">{item.category}</td><td className="p-2">{item.name || item.model}</td><td className="p-2 font-mono text-slate-400">{item.capacity || item.specs}</td><td className="p-2">{item.quantity}</td></>}
                  {resourceType === 'software' && <><td className="p-2 font-bold">{item.category}</td><td className="p-2">{item.name}</td><td className="p-2 font-mono text-slate-400">v{item.version}</td><td className="p-2">{item.purpose}</td></>}
                  {resourceType === 'secrets' && (
                    <><td className="p-2 font-bold">{item.credential_type}</td><td className="p-2 font-mono">{item.username}</td>
                      <td className="p-2 group/secret">
                        <span className="font-mono text-slate-500 group-hover/secret:hidden">••••••••</span>
                        <span className="font-mono text-amber-400 hidden group-hover/secret:inline">{item.encrypted_payload}</span>
                      </td>
                      <td className="p-2 text-slate-500 italic">{item.notes}</td>
                    </>
                  )}
                  {resourceType === 'relationships' && <><td className="p-2 font-bold text-indigo-400">{item.relationship_type || item.type}</td><td className="p-2">{item.target_name}</td><td className="p-2 text-slate-400">{item.source_role}</td><td className="p-2 text-slate-400">{item.target_role}</td></>}
                  <td className="p-2 text-right">
                    <button onClick={() => deleteMutation.mutate(item.id)} className="text-slate-500 hover:text-rose-400"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!isLoading && (!data || data.length === 0)) && <p className="text-center py-8 text-[10px] text-slate-600 uppercase font-black">No Records Registered</p>}
        </div>
      </motion.div>
    </div>
  )
}

// ----------------------
// PROVISION / MODIFY MODAL
// ----------------------
const ProvisionModal = ({ asset, onClose }: { asset?: any, onClose: () => void }) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState(asset || { 
    name: '', system: '', model: '', manufacturer: '', os_name: '', os_version: '', type: 'Physical', status: 'Active', environment: 'Production',
    serial_number: '', asset_tag: '', power_max_w: 0, power_typical_w: 0, 
    owner: '', vendor: '', purchase_order: '', business_unit: '', management_ip: ''
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = asset ? `/api/v1/devices/${asset.id}` : '/api/v1/devices/'
      const res = await fetch(url, { method: asset ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Operation failed') }
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['devices'] }); onClose() },
    onError: (err: any) => alert(err.message)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[800px] max-h-[90vh] overflow-y-auto p-8 rounded-[30px] space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
           <h2 className="text-xl font-black uppercase tracking-tighter flex items-center space-x-3 text-blue-400">
              <Monitor size={24} /><span>{asset ? 'Modify Asset Registry' : 'Provision New Entity'}</span>
           </h2>
           <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
           <div className="col-span-3"><h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] bg-white/5 py-1 px-2 rounded">Core Identity</h3></div>
           <div className="col-span-1">
             <label className="text-[9px] font-black text-slate-400 uppercase">Hostname *</label>
             <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-xs outline-none focus:border-blue-500" />
           </div>
           <div className="col-span-1">
             <label className="text-[9px] font-black text-slate-400 uppercase">Serial Number *</label>
             <input value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-xs outline-none" />
           </div>
           <div className="col-span-1">
             <label className="text-[9px] font-black text-slate-400 uppercase">Asset Tag *</label>
             <input value={formData.asset_tag} onChange={e => setFormData({...formData, asset_tag: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-xs outline-none" />
           </div>

           <div className="col-span-3"><h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] bg-white/5 py-1 px-2 rounded mt-2">Classification & System</h3></div>
           <div>
             <label className="text-[9px] font-black text-slate-400 uppercase">Type</label>
             <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-xs outline-none">
               <option>Physical</option><option>Virtual</option><option>Storage</option><option>Switch</option><option>Router</option><option>Firewall</option><option>Appliance</option>
             </select>
           </div>
           <div>
             <label className="text-[9px] font-black text-slate-400 uppercase">Status</label>
             <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-xs outline-none">
               <option>Planned</option><option>Active</option><option>Maintenance</option><option>Decommissioned</option><option>Offline</option>
             </select>
           </div>
           <div>
             <label className="text-[9px] font-black text-slate-400 uppercase">Environment</label>
             <select value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-xs outline-none">
               <option>Production</option><option>QA</option><option>Dev</option><option>DR</option>
             </select>
           </div>
           <div>
             <label className="text-[9px] font-black text-slate-400 uppercase">Logical System</label>
             <input value={formData.system} onChange={e => setFormData({...formData, system: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-xs outline-none" />
           </div>
           <div>
             <label className="text-[9px] font-black text-slate-400 uppercase">Management IP (iLO)</label>
             <input value={formData.management_ip} onChange={e => setFormData({...formData, management_ip: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 mt-1 text-xs outline-none font-mono" />
           </div>
           <div>
             <label className="text-[9px] font-black text-slate-400 uppercase">OS (Name / Version)</label>
             <div className="flex space-x-1 mt-1">
               <input value={formData.os_name} onChange={e => setFormData({...formData, os_name: e.target.value})} placeholder="Ubuntu" className="w-1/2 bg-slate-900 border border-white/10 rounded px-2 py-2 text-xs outline-none" />
               <input value={formData.os_version} onChange={e => setFormData({...formData, os_version: e.target.value})} placeholder="22.04" className="w-1/2 bg-slate-900 border border-white/10 rounded px-2 py-2 text-xs outline-none" />
             </div>
           </div>

           <div className="col-span-3"><h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] bg-white/5 py-1 px-2 rounded mt-2">Hardware & Procurement</h3></div>
           <div>
             <label className="text-[9px] font-black text-slate-400 uppercase">Manufacturer / Model</label>
             <div className="flex space-x-1 mt-1">
               <input value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} placeholder="Dell" className="w-1/2 bg-slate-900 border border-white/10 rounded px-2 py-2 text-xs outline-none" />
               <input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="R740" className="w-1/2 bg-slate-900 border border-white/10 rounded px-2 py-2 text-xs outline-none" />
             </div>
           </div>
           <div>
             <label className="text-[9px] font-black text-slate-400 uppercase">Owner / Business Unit</label>
             <div className="flex space-x-1 mt-1">
               <input value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} placeholder="IT-Ops" className="w-1/2 bg-slate-900 border border-white/10 rounded px-2 py-2 text-xs outline-none" />
               <input value={formData.business_unit} onChange={e => setFormData({...formData, business_unit: e.target.value})} placeholder="Metrology" className="w-1/2 bg-slate-900 border border-white/10 rounded px-2 py-2 text-xs outline-none" />
             </div>
           </div>
           <div>
             <label className="text-[9px] font-black text-slate-400 uppercase">Vendor / PO</label>
             <div className="flex space-x-1 mt-1">
               <input value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} placeholder="CDW" className="w-1/2 bg-slate-900 border border-white/10 rounded px-2 py-2 text-xs outline-none" />
               <input value={formData.purchase_order} onChange={e => setFormData({...formData, purchase_order: e.target.value})} placeholder="PO-99" className="w-1/2 bg-slate-900 border border-white/10 rounded px-2 py-2 text-xs outline-none" />
             </div>
           </div>
        </div>

        <button onClick={() => { if(!formData.name || !formData.serial_number || !formData.asset_tag) alert('Hostname, SN, and Asset Tag required'); else mutation.mutate(formData) }} className="w-full py-3 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Commit Configuration</button>
      </motion.div>
    </div>
  )
}

// ----------------------
// MAIN ASSET GRID
// ----------------------
export default function AssetGrid() {
  const queryClient = useQueryClient()
  const [activeExpansion, setActiveExpansion] = useState<any>(null)
  const [activeProvision, setActiveProvision] = useState<any>(null)
  const [viewState, setViewState] = useState<'Active' | 'Decommissioned'>('Active')
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data: devices, isLoading } = useQuery({ 
    queryKey: ['devices', viewState], 
    queryFn: async () => (await fetch(`/api/v1/devices/?include_decommissioned=${viewState === 'Decommissioned'}`)).json()
  })

  // Filter client-side if needed, but backend handles it
  const displayData = devices?.filter((d:any) => viewState === 'Decommissioned' ? d.status === 'Decommissioned' : d.status !== 'Decommissioned')

  const deleteDevice = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/devices/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['devices'] }); setSelectedIds([]) }
  })

  const bulkDelete = useMutation({
    mutationFn: async () => fetch(`/api/v1/devices/bulk-delete`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ids: selectedIds }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['devices'] }); setSelectedIds([]) }
  })

  const bulkRestore = useMutation({
    mutationFn: async () => fetch(`/api/v1/devices/bulk-restore`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ids: selectedIds }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['devices'] }); setSelectedIds([]) }
  })

  const columnDefs = useMemo(() => [
    { field: 'id', headerName: '', width: 50, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left', suppressMenu: true },
    { field: 'name', headerName: 'Hostname', width: 140, filter: true, pinned: 'left', cellClass: 'font-bold text-blue-100' },
    { field: 'system', headerName: 'Logical System', width: 130, filter: true },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 110, 
      cellRenderer: (params: any) => {
        const colors: any = { Active: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', Maintenance: 'text-amber-400 border-amber-500/30 bg-amber-500/10', Offline: 'text-rose-400 border-rose-500/30 bg-rose-500/10', Planned: 'text-blue-400 border-blue-500/30 bg-blue-500/10', Decommissioned: 'text-slate-400 border-slate-500/30 bg-slate-500/10' }
        return <div className={`px-1.5 py-0.5 mt-1 rounded border text-[8px] font-black uppercase tracking-widest ${colors[params.value] || 'text-slate-400 border-slate-500/30 bg-slate-500/10'}`}>{params.value}</div>
      }
    },
    { field: 'type', headerName: 'Type', width: 100, filter: true },
    { field: 'model', headerName: 'Model', width: 110, filter: true },
    { field: 'os_name', headerName: 'OS', width: 110, filter: true },
    { field: 'serial_number', headerName: 'SN', width: 120, filter: true, cellClass: 'font-mono text-slate-400' },
    { field: 'asset_tag', headerName: 'Asset Tag', width: 100, filter: true, cellClass: 'font-mono text-slate-400' },
    { field: 'management_ip', headerName: 'MGMT IP', width: 110, filter: true, cellClass: 'font-mono text-indigo-300' },
    { field: 'site_name', headerName: 'Site', width: 110, filter: true },
    { field: 'rack_name', headerName: 'Rack', width: 100, filter: true },
    { field: 'u_start', headerName: 'U-Loc', width: 70, filter: true, valueFormatter: (p:any) => p.value ? `U${p.value}` : '-' },
    {
      headerName: 'Operations',
      width: 220,
      suppressMovable: true,
      pinned: 'right',
      cellRenderer: (params: any) => (
        <div className="flex items-center space-x-1.5 h-full">
          <button onClick={() => setActiveExpansion({ type: 'hardware', deviceId: params.data.id })} title="Hardware" className="p-1 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"><Cpu size={14}/></button>
          <button onClick={() => setActiveExpansion({ type: 'software', deviceId: params.data.id })} title="Software" className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors"><Package size={14}/></button>
          <button onClick={() => setActiveExpansion({ type: 'secrets', deviceId: params.data.id })} title="Credentials" className="p-1 text-amber-400 hover:bg-amber-500/20 rounded transition-colors"><Key size={14}/></button>
          <button onClick={() => setActiveExpansion({ type: 'relationships', deviceId: params.data.id })} title="Relations" className="p-1 text-indigo-400 hover:bg-indigo-500/20 rounded transition-colors"><Link size={14}/></button>
          <div className="w-px h-3 bg-white/10 mx-1" />
          <button onClick={() => setActiveProvision(params.data)} title="Edit" className="p-1 text-slate-400 hover:bg-white/10 rounded transition-colors"><Edit2 size={14}/></button>
          {viewState === 'Active' && <button onClick={() => { if(confirm('Soft-delete asset?')) deleteDevice.mutate(params.data.id) }} title="Decommission" className="p-1 text-rose-400 hover:bg-rose-500/20 rounded transition-colors"><Trash2 size={14}/></button>}
        </div>
      )
    }
  ], [deleteDevice, viewState])

  return (
    <div className="h-full flex flex-col space-y-4 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-black tracking-tight uppercase">Asset Registry</h1>
          <div className="flex bg-slate-900/50 rounded-lg p-1 border border-white/5">
            <button onClick={() => { setViewState('Active'); setSelectedIds([]) }} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest ${viewState === 'Active' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Active Grid</button>
            <button onClick={() => { setViewState('Decommissioned'); setSelectedIds([]) }} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center space-x-2 ${viewState === 'Decommissioned' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              <Archive size={12}/><span>Decommissioned History</span>
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {selectedIds.length > 0 && viewState === 'Active' && (
            <button onClick={() => { if(confirm(`Decommission ${selectedIds.length} assets?`)) bulkDelete.mutate() }} className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20">Bulk Decommission</button>
          )}
          {selectedIds.length > 0 && viewState === 'Decommissioned' && (
            <button onClick={() => { if(confirm(`Restore ${selectedIds.length} assets?`)) bulkRestore.mutate() }} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20">Restore Assets</button>
          )}
          {viewState === 'Active' && (
            <button onClick={() => setActiveProvision({})} className="px-6 py-2 bg-[#034EA2] text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
              + Provision Entity
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <RefreshCcw size={32} className="text-blue-400 animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Syncing Matrix...</p>
          </div>
        )}
        <AgGridReact
          rowData={displayData || []}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, sortable: true, filter: true }}
          rowSelection="multiple"
          animateRows={true}
          headerHeight={32}
          rowHeight={32}
          onSelectionChanged={(e) => setSelectedIds(e.api.getSelectedNodes().map(n => n.data.id))}
        />
      </div>

      <AnimatePresence>
        {activeExpansion && (
          <ExtensionModal 
            title={activeExpansion.type}
            icon={activeExpansion.type === 'hardware' ? Cpu : activeExpansion.type === 'software' ? Package : activeExpansion.type === 'relationships' ? Link : Key}
            color={activeExpansion.type === 'hardware' ? 'blue' : activeExpansion.type === 'software' ? 'emerald' : activeExpansion.type === 'relationships' ? 'indigo' : 'amber'}
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
          --ag-header-background-color: rgba(15, 23, 42, 0.9);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f8fafc;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 10px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-size: 9px !important; }
        .ag-cell { display: flex; align-items: center; padding-left: 8px !important; padding-right: 8px !important; }
      `}</style>
    </div>
  )
}
