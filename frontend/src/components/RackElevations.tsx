import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Info, Plus, Zap, Trash2, Edit2, Search, MapPin, X, ArrowRightLeft, Server, Monitor, AlertTriangle, Filter, Check, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const RackUnit = ({ uNumber, device, isBase, highlight, onSelect, onManage }: { uNumber: number, device?: any, isBase?: boolean, highlight?: boolean, onSelect: () => void, onManage: (device: any) => void }) => {
  const getBadgeColor = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'physical': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'virtual': return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      case 'storage': return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      case 'switch': return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
    }
  }

  return (
    <div 
      onClick={() => device ? onManage(device) : onSelect()}
      className={`relative border-b border-white/5 flex items-center px-2 transition-colors cursor-pointer ${
        device ? (highlight ? 'bg-amber-500/40 border-l-4 border-l-amber-400 z-10' : 'bg-[#034EA2]/30 border-l-2 border-l-[#034EA2]') : 'hover:bg-white/5'
      }`}
      style={{ height: '24px' }}
    >
      <span className="text-[9px] font-mono text-slate-600 w-4 select-none">{uNumber}</span>
      {isBase && device && (
        <div className="flex-1 flex items-center justify-between overflow-hidden pr-1">
          <span className={`text-[10px] font-bold truncate ml-1 uppercase tracking-tight ${highlight ? 'text-amber-100' : 'text-blue-100'}`}>{device.name}</span>
          <span className={`text-[7px] font-black uppercase px-1 py-0.5 rounded border ${getBadgeColor(device.type)}`}>{device.type?.slice(0,3) || 'UNK'}</span>
        </div>
      )}
    </div>
  )
}

const RackElevation = ({ rack, onDelete, onEdit, searchTerm, onMount, onManageDevice, isSelected, onToggleSelect }: { rack: any, onDelete: any, onEdit: any, searchTerm: string, onMount: (rackId: number, u: number) => void, onManageDevice: (device: any) => void, isSelected: boolean, onToggleSelect: (id: number) => void }) => {
  const units = Array.from({ length: rack.total_u || 42 }, (_, i) => (rack.total_u || 42) - i)
  const isHighlighted = (device: any) => searchTerm && device.name.toLowerCase().includes(searchTerm.toLowerCase())

  return (
    <div className={`glass-panel w-64 flex-shrink-0 rounded-xl overflow-hidden flex flex-col border-white/5 transition-colors group relative ${isSelected ? 'border-blue-500 shadow-blue-500/20 shadow-xl z-10 bg-blue-900/10' : 'hover:border-[#034EA2]/20'}`}>
      <div className="absolute top-2.5 left-2 z-20">
         <div onClick={() => onToggleSelect(rack.id)} className={`w-4 h-4 rounded flex items-center justify-center cursor-pointer border transition-colors ${isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-white/20 bg-slate-900 hover:border-blue-400'}`}>
            {isSelected && <Check size={12} strokeWidth={4} />}
         </div>
      </div>

      <div className="bg-slate-900/80 p-3 pl-8 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 truncate pr-2">{rack.name}</h4>
          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={(e) => { e.stopPropagation(); onEdit(rack) }} className="p-1 hover:bg-blue-500/20 rounded"><Edit2 size={12} className="text-slate-400"/></button>
             <button onClick={(e) => { e.stopPropagation(); onDelete(rack.id) }} className="p-1 hover:bg-rose-500/20 rounded"><Trash2 size={12} className="text-slate-400"/></button>
          </div>
        </div>
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
          <div className="flex items-center space-x-1">
            <Zap size={10} className="text-amber-500" />
            <span>{rack.max_power_kw} kW</span>
          </div>
          <span className="bg-slate-800 px-1.5 rounded uppercase">{rack.total_u}U • {rack.site_name || 'Missing Site'}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-slate-950/30 custom-scrollbar">
        {units.map((u) => {
          const device = (rack.devices || []).find((d: any) => u >= d.start_u && u < d.start_u + d.size_u)
          const isBase = device?.start_u === u
          return <RackUnit key={u} uNumber={u} device={device} isBase={isBase} highlight={device ? isHighlighted(device) : false} onSelect={() => onMount(rack.id, u)} onManage={onManageDevice} />
        })}
      </div>
    </div>
  )
}

export default function RackElevations() {
  const queryClient = useQueryClient()
  const [activeSite, setActiveSite] = useState<number | string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingRack, setEditingRack] = useState<any>(null)
  const [editingSite, setEditingSite] = useState<any>(null)
  const [showNewSiteModal, setShowNewSiteModal] = useState(false)
  const [newSiteName, setNewSiteName] = useState('')
  const [mountingSlot, setMountingSlot] = useState<{ rackId: number, u: number } | null>(null)
  const [mountingData, setMountingData] = useState({ device_id: '', size_u: 1, relocate: false })
  const [selectedRacks, setSelectedRacks] = useState<number[]>([])
  const [showCompareOnly, setShowCompareOnly] = useState(false)
  const [managingDevice, setManagingDevice] = useState<any>(null)
  const [showBulkRelocate, setShowBulkRelocate] = useState(false)

  const { data: sites } = useQuery({ queryKey: ['sites'], queryFn: async () => (await fetch('/api/v1/sites/')).json() })
  const { data: allRacks } = useQuery({ queryKey: ['racks-all'], queryFn: async () => (await fetch('/api/v1/racks/')).json() })
  
  // If showing compare, ignore activeSite and show globally selected
  const displayedRacks = useMemo(() => {
    if (!allRacks) return []
    if (showCompareOnly) return allRacks.filter((r: any) => selectedRacks.includes(r.id))
    if (activeSite === 'missing') return allRacks.filter((r: any) => !r.room_id)
    if (activeSite) return allRacks.filter((r: any) => {
       const site = sites?.find((s:any) => s.id === activeSite)
       return site && r.site_name === site.name
    })
    return allRacks
  }, [allRacks, activeSite, selectedRacks, showCompareOnly, sites])

  const createSite = useMutation({
    mutationFn: async () => fetch('/api/v1/sites/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newSiteName }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sites'] }); setShowNewSiteModal(false); setNewSiteName('') }
  })

  const updateSite = useMutation({
    mutationFn: async (data: any) => fetch(`/api/v1/sites/${editingSite.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sites'] }); queryClient.invalidateQueries({ queryKey: ['racks-all'] }); setEditingSite(null) }
  })

  const deleteSite = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/sites/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sites'] }); queryClient.invalidateQueries({ queryKey: ['racks-all'] }); setActiveSite(null) }
  })

  const addRack = useMutation({
    mutationFn: async () => fetch('/api/v1/racks/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `RACK-${Math.floor(Math.random()*1000)}`, total_u: 42, max_power_kw: 8.0, site_id: activeSite }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['racks-all'] })
  })

  const updateRack = useMutation({
    mutationFn: async (data: any) => fetch(`/api/v1/racks/${editingRack.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['racks-all'] }); setEditingRack(null) }
  })

  const deleteRack = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/racks/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['racks-all'] })
  })

  const bulkRelocate = useMutation({
    mutationFn: async (targetSiteId: string) => {
      for (const id of selectedRacks) {
        await fetch(`/api/v1/racks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_site_id: targetSiteId }) })
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['racks-all'] }); setShowBulkRelocate(false); setSelectedRacks([]) }
  })

  const mountMutation = useMutation({
    mutationFn: async (data: any) => {
      const rack = allRacks.find((r: any) => r.id === mountingSlot?.rackId)
      if (mountingSlot!.u + data.size_u - 1 > rack.total_u) throw new Error(`Device size (${data.size_u}U) exceeds rack height limit.`)
      
      const res = await fetch(`/api/v1/racks/${mountingSlot?.rackId}/mount`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.status === 409) {
        const err = await res.json()
        if (confirm(`${err.detail}\nDo you want to relocate this device to the new location?`)) {
          return fetch(`/api/v1/racks/${mountingSlot?.rackId}/mount`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, relocate: true }) })
        }
        throw new Error('Relocation cancelled')
      }
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail) }
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['racks-all'] }); setMountingSlot(null); setMountingData({ device_id: '', size_u: 1, relocate: false }) },
    onError: (err: any) => { if (err.message !== 'Relocation cancelled') alert(err.message) }
  })

  const unmountMutation = useMutation({
    mutationFn: async (deviceId: number) => fetch(`/api/v1/racks/mount/${deviceId}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['racks-all'] }); setManagingDevice(null) }
  })

  return (
    <div className="h-full flex flex-col space-y-6 relative">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 bg-slate-900/50 p-1 rounded-xl border border-white/5">
            <button onClick={() => { setActiveSite(null); setShowCompareOnly(false) }} className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${!activeSite && !showCompareOnly ? 'bg-[#034EA2] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>ALL SITES</button>
            {sites?.map((site: any) => (
              <div key={site.id} className="relative group">
                <button onClick={() => { setActiveSite(site.id); setShowCompareOnly(false) }} className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${activeSite === site.id && !showCompareOnly ? 'bg-[#034EA2] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{site.name}</button>
                <div className="absolute -top-1 -right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 rounded px-1 py-0.5 border border-white/10 shadow-xl z-30">
                   <button onClick={() => setEditingSite(site)}><Edit2 size={10} className="text-blue-400 hover:text-blue-300"/></button>
                   <button onClick={() => { if(confirm('Erase site and move all equipment to Missing Site tab?')) deleteSite.mutate(site.id) }}><Trash2 size={10} className="text-rose-400 hover:text-rose-300"/></button>
                </div>
              </div>
            ))}
            <button onClick={() => { setActiveSite('missing'); setShowCompareOnly(false) }} className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${activeSite === 'missing' && !showCompareOnly ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/5'}`}>MISSING SITE</button>
            <button onClick={() => setShowNewSiteModal(true)} className="px-3 py-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Plus size={14}/></button>
          </div>

          <div className="flex items-center space-x-3">
            {selectedRacks.length > 0 && (
              <div className="flex items-center space-x-2 pr-4 border-r border-white/10 mr-2">
                 <button onClick={() => setShowBulkRelocate(true)} className="flex items-center space-x-2 px-4 py-2 bg-amber-600/10 text-amber-400 border border-amber-600/20 rounded-xl text-[10px] font-black uppercase hover:bg-amber-600/20">
                    <ArrowRightLeft size={14}/>
                    <span>Bulk Relocate</span>
                 </button>
                 <button onClick={() => setSelectedRacks([])} className="flex items-center space-x-1 px-3 py-2 text-slate-500 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 rounded-xl transition-all text-[10px] font-black uppercase">
                    <X size={14}/> <span>Clear Selection</span>
                 </button>
              </div>
            )}
            <button onClick={() => setShowCompareOnly(!showCompareOnly)} className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${showCompareOnly ? 'bg-blue-600 text-white border-transparent' : 'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-white/5'}`}>
               <Filter size={14} />
               <span>{showCompareOnly ? 'Exit Global Compare' : `Global Compare (${selectedRacks.length})`}</span>
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input type="text" placeholder="Highlight Hostname..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-900/50 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs w-64 focus:ring-1 focus:ring-amber-500/30 transition-all outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar pb-4">
        <div className="flex space-x-6 h-full min-w-max pr-12">
          {displayedRacks?.map((rack: any) => (
            <RackElevation 
              key={rack.id} 
              rack={rack} 
              searchTerm={searchTerm}
              onDelete={(id: number) => { if(confirm('Decommission this rack?')) deleteRack.mutate(id) }} 
              onEdit={(r: any) => setEditingRack(r)} 
              onMount={(rId, u) => setMountingSlot({ rackId: rId, u })}
              onManageDevice={(d) => setManagingDevice(d)}
              isSelected={selectedRacks.includes(rack.id)}
              onToggleSelect={(id) => setSelectedRacks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
            />
          ))}
          
          {(activeSite && activeSite !== 'missing') && !showCompareOnly && (
            <button onClick={() => addRack.mutate()} className="w-64 flex-shrink-0 border-2 border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center space-y-3 hover:border-[#034EA2]/30 transition-all group bg-slate-900/10">
              <div className="p-3 rounded-full bg-slate-900/50 border border-white/5 group-hover:scale-110 transition-transform">
                <Plus size={20} className="text-slate-500 group-hover:text-blue-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-300">Provision Rack</span>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showBulkRelocate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-8 rounded-3xl space-y-6">
              <h2 className="text-xl font-bold uppercase tracking-tight text-amber-400">Bulk Relocate Racks</h2>
              <p className="text-xs text-slate-400">Moving {selectedRacks.length} racks to a different site registry.</p>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Site</label>
                <select id="bulk-target-site" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 text-xs outline-none focus:border-blue-500/50">
                  {sites?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => setShowBulkRelocate(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Abort</button>
                <button onClick={() => bulkRelocate.mutate((document.getElementById('bulk-target-site') as HTMLSelectElement).value)} className="flex-1 py-3 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Commit Relocation</button>
              </div>
            </motion.div>
          </div>
        )}

        {managingDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-8 rounded-3xl space-y-6">
              <h2 className="text-xl font-bold uppercase tracking-tight text-blue-400 flex items-center justify-between">
                 <span>Entity Control</span>
                 <button onClick={() => setManagingDevice(null)} className="text-slate-500 hover:text-white"><X size={20}/></button>
              </h2>
              <div className="p-4 bg-white/5 rounded-2xl space-y-2 border border-white/5">
                 <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Identity</p>
                 <p className="text-lg font-bold">{managingDevice.name}</p>
                 <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">{managingDevice.status} • {managingDevice.size_u}U • {managingDevice.type}</p>
              </div>
              <div className="flex flex-col space-y-3 pt-4 border-t border-white/5">
                <button onClick={() => { if(confirm('Erase this entity from the current rack physical layer?')) unmountMutation.mutate(managingDevice.id) }} className="w-full py-3 bg-rose-600/10 text-rose-400 border border-rose-600/20 rounded-xl text-[10px] font-black uppercase hover:bg-rose-600/20 transition-all flex items-center justify-center space-x-2">
                   <Trash2 size={14}/>
                   <span>Unmount Entity</span>
                </button>
                <p className="text-[9px] text-slate-500 text-center uppercase tracking-widest mt-2">Note: To edit system properties, use the Asset Registry.</p>
              </div>
            </motion.div>
          </div>
        )}

        {mountingSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-8 rounded-3xl space-y-6">
              <h2 className="text-xl font-bold flex items-center space-x-3 text-blue-400 uppercase tracking-tighter">
                <Monitor size={20} />
                <span>Physical Mounting [U{mountingSlot.u}]</span>
              </h2>
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-start space-x-3">
                 <Info size={16} className="text-blue-400 mt-0.5" />
                 <p className="text-[10px] text-blue-300 leading-relaxed font-bold uppercase tracking-tight">System will occupy units UPWARDS from U{mountingSlot.u}. Collision checking enforced.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Registered Asset</label>
                  <select onChange={e => setMountingData({...mountingData, device_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs focus:border-blue-500/50">
                    <option value="">Choose Registry Entity...</option>
                    {devices?.map((d: any) => <option key={d.id} value={d.id}>{d.name} [{d.type}]</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Occupancy (U-Size)</label>
                  <input type="number" value={mountingData.size_u} onChange={e => setMountingData({...mountingData, size_u: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs" />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => setMountingSlot(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Abort</button>
                <button onClick={() => mountMutation.mutate({ device_id: mountingData.device_id, start_u: mountingSlot.u, size_u: mountingData.size_u })} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Mount to Rack</button>
              </div>
            </motion.div>
          </div>
        )}

        {editingRack && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-8 rounded-3xl space-y-6">
              <h2 className="text-xl font-bold flex items-center space-x-3 text-amber-400 uppercase tracking-tighter">
                <Edit2 size={20} />
                <span>Configure Rack Properties</span>
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rack Label</label>
                  <input defaultValue={editingRack.name} id="edit-name" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total U Capacity</label>
                  <input defaultValue={editingRack.total_u} id="edit-u" type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Power Limit (kW)</label>
                  <input defaultValue={editingRack.max_power_kw} id="edit-power" type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registry Transfer (Site)</label>
                  <select id="edit-site" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs focus:border-blue-500/50">
                    <option value="">Missing Site (Orphan)</option>
                    {sites?.map((s: any) => <option key={s.id} value={s.id} selected={s.id === editingRack.room_id || s.id === activeSite}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => setEditingRack(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cancel</button>
                <button onClick={() => updateRack.mutate({
                  name: (document.getElementById('edit-name') as HTMLInputElement).value,
                  total_u: parseInt((document.getElementById('edit-u') as HTMLInputElement).value),
                  max_power_kw: parseFloat((document.getElementById('edit-power') as HTMLInputElement).value),
                  new_site_id: (document.getElementById('edit-site') as HTMLSelectElement).value || null
                })} className="flex-1 py-3 bg-[#034EA2] text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Apply Configuration</button>
              </div>
            </motion.div>
          </div>
        )}

        {editingSite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-8 rounded-3xl space-y-6">
              <h2 className="text-xl font-bold flex items-center space-x-3 text-blue-400 uppercase tracking-tighter">
                <Edit2 size={20} />
                <span>Modify Site Registry</span>
              </h2>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Site Name</label>
                <input defaultValue={editingSite.name} id="site-name-edit" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-blue-500/50 text-xs" />
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => setEditingSite(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Abort</button>
                <button onClick={() => updateSite.mutate({ name: (document.getElementById('site-name-edit') as HTMLInputElement).value })} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Commit Changes</button>
              </div>
            </motion.div>
          </div>
        )}

        {showNewSiteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-8 rounded-3xl space-y-6">
              <h2 className="text-xl font-bold flex items-center space-x-3 text-emerald-400 uppercase tracking-tighter">
                <MapPin size={20} />
                <span>Establish New Site</span>
              </h2>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Site Name</label>
                <input value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:border-emerald-500/50 text-xs" placeholder="e.g. DC-OAKLAND" />
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => setShowNewSiteModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Abort</button>
                <button onClick={() => createSite.mutate()} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Commit Site</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
