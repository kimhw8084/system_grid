import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Info, Plus, Zap, Trash2, Edit2, Search, MapPin, X, ArrowRightLeft, Server, Monitor, AlertTriangle, Check, MoreVertical } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const RackUnit = ({ uNumber, device, isBase, highlight, onSelect, onManage, isEvenServer }: { uNumber: number, device?: any, isBase?: boolean, highlight?: boolean, onSelect: () => void, onManage: (device: any) => void, isEvenServer?: boolean }) => {
  const getBadgeColor = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'physical': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'virtual': return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      case 'storage': return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      case 'switch': return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
    }
  }

  const baseBg = isEvenServer ? 'bg-blue-600/40' : 'bg-[#034EA2]/60'
  const activeBg = highlight ? 'bg-amber-500/70 border-l-4 border-l-amber-400' : `${baseBg} border-l-2 border-l-blue-400`

  return (
    <div 
      onClick={() => device ? onManage(device) : onSelect()}
      className={`relative border-b border-white/10 flex items-center px-2 transition-all cursor-pointer group ${
        device ? `z-10 ${activeBg}` : 'hover:bg-white/10 bg-white/[0.02]'
      }`}
      style={{ height: '24px' }}
    >
      <span className="text-[9px] font-mono text-slate-500 w-4 select-none group-hover:text-slate-300 transition-colors">{uNumber}</span>
      {isBase && device && (
        <div className="flex-1 flex items-center justify-between overflow-hidden pr-1">
          <span className={`text-[10px] font-black truncate ml-1 uppercase tracking-tight ${highlight ? 'text-white' : 'text-blue-50'}`}>{device.name}</span>
          <span className={`text-[7px] font-black uppercase px-1 py-0.5 rounded border shadow-sm ${getBadgeColor(device.type)}`}>{device.type?.slice(0,3) || 'UNK'}</span>
        </div>
      )}
      {!device && <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none"><Plus size={10} className="text-blue-500" /></div>}
    </div>
  )
}

const RackElevation = ({ rack, onDelete, onEdit, onMove, searchTerm, onMount, onManageDevice, isSelected, onToggleSelect, onRestore, isDeleted }: { rack: any, onDelete: any, onEdit: any, onMove?: (direction: 'left' | 'right') => void, searchTerm: string, onMount: (rackId: number, u: number) => void, onManageDevice: (device: any) => void, isSelected: boolean, onToggleSelect: (id: number) => void, onRestore?: (id: number) => void, isDeleted?: boolean }) => {
  const units = Array.from({ length: rack.total_u || 42 }, (_, i) => (rack.total_u || 42) - i)
  const isHighlighted = (device: any) => searchTerm && device.name.toLowerCase().includes(searchTerm.toLowerCase())

  const serverParityMap = useMemo(() => {
    const map: any = {}
    let count = 0
    const sortedLocations = [...(rack.device_locations || [])].sort((a, b) => b.start_unit - a.start_unit)
    sortedLocations.forEach(loc => {
      map[loc.device_id] = count % 2 === 0
      count++
    })
    return map
  }, [rack.device_locations])

  return (
    <div className={`glass-panel w-64 flex-shrink-0 rounded-xl overflow-hidden flex flex-col border-white/10 transition-all group relative ${isSelected ? 'border-blue-500 shadow-blue-500/20 shadow-xl z-10 bg-blue-900/10' : 'hover:border-[#034EA2]/40'} ${isDeleted ? 'opacity-70 grayscale-[0.5]' : ''}`}>
      <div className="absolute top-2.5 left-2 z-20">
         <div onClick={() => onToggleSelect(rack.id)} className={`w-4 h-4 rounded flex items-center justify-center cursor-pointer border transition-colors ${isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-white/20 bg-slate-900 hover:border-blue-400'}`}>
            {isSelected && <Check size={12} strokeWidth={4} />}
         </div>
      </div>
      
      <div className="p-4 bg-white/5 border-b border-white/5 flex flex-col">
        <div className="flex items-center justify-between ml-6">
          <h3 className="font-black text-[11px] uppercase tracking-widest text-white truncate pr-2">{rack.name}</h3>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isDeleted ? (
              <button onClick={() => onRestore?.(rack.id)} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[8px] font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-all flex items-center space-x-1">
                 <RefreshCcw size={10} /> <span>Restore</span>
              </button>
            ) : (
              <>
                {onMove && (
                  <>
                    <button onClick={() => onMove('left')} className="p-1 hover:bg-white/10 rounded text-slate-400"><ArrowRightLeft size={10} className="scale-x-[-1]" /></button>
                    <button onClick={() => onMove('right')} className="p-1 hover:bg-white/10 rounded text-slate-400"><ArrowRightLeft size={10} /></button>
                  </>
                )}
                <button onClick={() => onEdit(rack)} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-blue-400"><Edit2 size={12}/></button>
                <button onClick={() => onDelete(rack.id)} className="p-1 hover:bg-rose-500/10 rounded text-slate-400 hover:text-rose-400"><Trash2 size={12}/></button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3 mt-2 ml-6">
           <div className="flex items-center space-x-1 text-[8px] font-bold text-slate-500 uppercase"><MapPin size={10}/><span>{rack.site_name || 'Unassigned'}</span></div>
           <div className="flex items-center space-x-1 text-[8px] font-bold text-blue-400 uppercase"><Zap size={10}/><span>{rack.total_u}U</span></div>
           {isDeleted && <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">Purged</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 p-2">
        <div className="border-x border-white/5 bg-slate-900/40">
          {units.map(u => {
            const loc = rack.device_locations?.find((l: any) => u >= l.start_unit && u < l.start_unit + l.size_u)
            return (
              <RackUnit 
                key={u} 
                uNumber={u} 
                device={loc?.device} 
                isBase={u === loc?.start_unit}
                isEvenServer={loc ? serverParityMap[loc.device_id] : false}
                highlight={loc?.device ? isHighlighted(loc.device) : false}
                onSelect={() => !isDeleted && onMount(rack.id, u)}
                onManage={onManageDevice}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function RackElevations() {
  const queryClient = useQueryClient()
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await fetch('/api/v1/devices')).json() })
  const { data: sites } = useQuery({ queryKey: ['sites'], queryFn: async () => (await fetch('/api/v1/sites/')).json() })
  
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSite, setActiveSite] = useState<number | null>(null)
  const [isAddingSite, setIsAddingSite] = useState(false)
  const [newSite, setNewSite] = useState({ name: '', address: '' })
  const [isEditingSite, setIsEditingSite] = useState<any>(null)
  const [isAddingRack, setIsAddingRack] = useState(false)
  const [newRack, setNewRack] = useState({ name: '', total_u: 42, max_power_kw: 8.0, site_id: '' })
  const [isEditingRack, setIsEditingRack] = useState<any>(null)
  const [isProvisioning, setIsProvisioning] = useState<any>(null)
  const [managingDevice, setManagingDevice] = useState<any>(null)
  const [showCompareOnly, setShowCompareOnly] = useState(false)
  const [activeTab, setActiveTab] = useState('active') // 'active' or 'deleted'
  const [selectedRacks, setSelectedRacks] = useState<number[]>([])

  const { data: allRacks } = useQuery({ queryKey: ['racks-all', activeTab], queryFn: async () => (await fetch(`/api/v1/racks/?include_deleted=${activeTab === 'deleted'}`)).json() })
  
  const siteMutation = useMutation({
    mutationFn: async (data: any) => {
        const url = data.id ? `/api/v1/sites/${data.id}` : '/api/v1/sites/'
        const method = data.id ? 'PUT' : 'POST'
        const res = await fetch(url, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) })
        if (!res.ok) {
            const err = await res.json()
            if (err.detail === 'SITE_NAME_DUPLICATE') throw new Error('DUPLICATE_SITE')
            throw new Error('FAILED_TO_SAVE_SITE')
        }
        return res.json()
    },
    onSuccess: () => { 
        queryClient.invalidateQueries({ queryKey: ['sites'] })
        setIsAddingSite(false)
        setIsEditingSite(null)
        toast.success('Site Registry Updated')
    },
    onError: (e: any) => {
        if (e.message === 'DUPLICATE_SITE') toast.error('ERROR: Site name already exists in registry')
        else toast.error('System failure during site registration')
    }
  })

  const siteDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
        const res = await fetch(`/api/v1/sites/${id}`, { method: 'DELETE' })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.detail || 'FAILED_TO_DELETE')
        }
        return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sites'] }); toast.success('Site Decommissioned'); setActiveSite(null) },
    onError: (e: any) => {
        if (e.message.includes('FOREIGN KEY')) {
            toast.error('Cannot delete site: Racks or Devices are still mounted. Please clear the site first.')
        } else {
            toast.error(`Decommission failure: ${e.message}`)
        }
    }
  })

  const rackMutation = useMutation({
    mutationFn: async (data: any) => {
        const url = data.id ? `/api/v1/racks/${data.id}` : '/api/v1/racks/'
        const method = data.id ? 'PUT' : 'POST'
        const res = await fetch(url, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) })
        if (!res.ok) {
            const err = await res.json()
            if (err.detail === 'RACK_NAME_DUPLICATE') throw new Error('DUPLICATE_RACK')
            if (err.detail === 'RACK_NAME_DUPLICATE_IN_SITE') throw new Error('DUPLICATE_RACK_SITE')
            if (err.detail === 'RACK_SHRINK_CONFLICT: Units to be removed are occupied') throw new Error('SHRINK_CONFLICT')
            throw new Error('Failed to synchronize rack')
        }
        return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['racks-all'] }); setIsAddingRack(false); setIsEditingRack(null); toast.success('Rack Infrastructure Synchronized') },
    onError: (e: any) => {
        if (e.message === 'DUPLICATE_RACK' || e.message === 'DUPLICATE_RACK_SITE') toast.error('ERROR: Rack name already exists in this site')
        else if (e.message === 'SHRINK_CONFLICT') toast.error('ERROR: Cannot shrink rack. Occupied slots detected in target removal zone.')
        else toast.error(e.message)
    }
  })

  const mountMutation = useMutation({
    mutationFn: async (data: any) => {
        const { rackId, ...rest } = data;
        if (!rest.device_id) throw new Error('DEVICE_REQUIRED')
        const payload = { ...rest, size_u: rest.size_u || 1 }
        const res = await fetch(`/api/v1/racks/${rackId}/mount`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) })
        if (!res.ok) {
            const err = await res.json()
            if (res.status === 409) {
                if (confirm(`${err.detail}\n\nDo you want to relocate this asset to the new position?`)) {
                    return (await fetch(`/api/v1/racks/${rackId}/mount`, { 
                        method: 'POST', 
                        headers: {'Content-Type': 'application/json'}, 
                        body: JSON.stringify({ ...payload, relocate: true }) 
                    })).json();
                }
                throw new Error('RELOCATION_CANCELLED')
            }
            throw new Error(err.detail || 'Mount failed')
        }
        return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['racks-all'] }); toast.success('Asset Racked Successfully'); setIsProvisioning(null) },
    onError: (e: any) => {
        if (e.message === 'DEVICE_REQUIRED') toast.error('ERROR: No asset selected for mounting')
        else if (e.message === 'RELOCATION_CANCELLED') return
        else toast.error(e.message)
    }
  })

  const unmountMutation = useMutation({
    mutationFn: async (deviceId: number) => {
        const res = await fetch(`/api/v1/racks/mount/${deviceId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to unmount asset')
        return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['racks-all'] }); toast.success('Asset Removed from Rack'); setManagingDevice(null) },
    onError: (e: any) => toast.error(e.message)
  })

  const updateMountMutation = useMutation({
    mutationFn: async ({ rackId, device_id, start_u, size_u }: any) => {
        const res = await fetch(`/api/v1/racks/${rackId}/mount`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ device_id, start_u, size_u, relocate: true }) 
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.detail || 'Update failed')
        }
        return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['racks-all'] }); toast.success('Asset Configuration Updated'); setManagingDevice(null) },
    onError: (e: any) => toast.error(e.message)
  })

  const siteReorderMutation = useMutation({
    mutationFn: async (ids: number[]) => fetch('/api/v1/sites/reorder', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ids}) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sites'] }); toast.success('Site Order Updated') }
  })

  const rackReorderMutation = useMutation({
    mutationFn: async (ids: number[]) => fetch('/api/v1/racks/reorder', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ids}) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['racks-all'] }); toast.success('Rack Sequence Synchronized') }
  })

  const moveSite = (id: number, direction: 'left' | 'right') => {
    if (!sites) return
    const index = sites.findIndex((s: any) => s.id === id)
    if (index === -1) return
    const newSites = [...sites]
    const newIndex = direction === 'left' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= sites.length) return
    [newSites[index], newSites[newIndex]] = [newSites[newIndex], newSites[index]]
    siteReorderMutation.mutate(newSites.map(s => s.id))
  }

  const moveRack = (id: number, direction: 'left' | 'right') => {
    if (!displayedRacks) return
    const index = displayedRacks.findIndex((r: any) => r.id === id)
    if (index === -1) return
    const newRacks = [...displayedRacks]
    const newIndex = direction === 'left' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= displayedRacks.length) return
    [newRacks[index], newRacks[newIndex]] = [newRacks[newIndex], newRacks[index]]
    rackReorderMutation.mutate(newRacks.map(r => r.id))
  }

  const displayedRacks = useMemo(() => {
    if (!allRacks) return []
    let filtered = allRacks
    if (showCompareOnly) {
        filtered = allRacks.filter((r: any) => selectedRacks.includes(r.id))
    } else if (activeSite && sites) {
        const sName = sites.find((s:any) => s.id === activeSite)?.name
        filtered = allRacks.filter((r: any) => r.site_name === sName)
    }
    return filtered
  }, [allRacks, activeSite, showCompareOnly, selectedRacks, sites])

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic">Elevation Control</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Physical Capacity & Spatial Intelligence</p>
           </div>
           <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-center">
              <button onClick={() => { setActiveTab('active'); setSelectedRacks([]) }} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-[#034EA2] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Active Inventory</button>
              <button onClick={() => { setActiveTab('deleted'); setSelectedRacks([]) }} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'deleted' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Purged Records</button>
           </div>
        </div>
        <div className="flex items-center space-x-4">
          {activeTab === 'active' ? (
            <button onClick={() => { 
                const sId = activeSite ? String(activeSite) : '';
                setNewRack({ name: '', total_u: 42, site_id: sId, max_power_kw: 8.0 }); 
                setIsAddingRack(true); 
              }} className="px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600/20 transition-all flex items-center space-x-2">
                <Plus size={14}/> <span>Add Rack</span>
              </button>
          ) : (
            <button disabled={selectedRacks.length === 0} onClick={() => bulkActionMutation.mutate({ action: 'restore', ids: selectedRacks })} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${selectedRacks.length > 0 ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/20' : 'bg-white/5 text-slate-700 border-white/5 cursor-not-allowed'}`}>
                <RefreshCcw size={14}/> <span>Restore Selected</span>
            </button>
          )}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
             <button onClick={() => setShowCompareOnly(false)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!showCompareOnly ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Site View</button>
             <button onClick={() => setShowCompareOnly(true)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${showCompareOnly ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Compare ({selectedRacks.length})</button>
          </div>
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SEARCH DEVICES..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>
        </div>
      </div>

      {!showCompareOnly && (
        <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar items-center">
          <button onClick={() => setActiveSite(null)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${!activeSite ? 'bg-blue-600 border-blue-500 text-white' : 'border-white/5 text-slate-500 hover:border-white/20'}`}>Global Matrix</button>
          {sites?.map((s: any) => {
            const [showMenu, setShowMenu] = useState(false);
            return (
              <div key={s.id} className="relative group">
                <button 
                  onClick={() => setActiveSite(s.id)} 
                  className={`px-4 py-2 pr-10 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${activeSite === s.id ? 'bg-[#034EA2] border-blue-500 text-white' : 'border-white/5 text-slate-500 hover:border-white/20'}`}
                >
                  {s.name}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${activeSite === s.id ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-400'}`}
                >
                  <MoreVertical size={14} />
                </button>
                
                <AnimatePresence>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setShowMenu(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-32 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[70] overflow-hidden p-1"
                      >
                        <button onClick={(e) => { e.stopPropagation(); moveSite(s.id, 'left'); setShowMenu(false) }} className="w-full text-left px-3 py-2 text-[9px] font-black uppercase text-slate-400 hover:bg-white/5 hover:text-white rounded-lg flex items-center space-x-2">
                          <ArrowRightLeft size={10} className="rotate-90 scale-x-[-1]" /> <span>Move Left</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); moveSite(s.id, 'right'); setShowMenu(false) }} className="w-full text-left px-3 py-2 text-[9px] font-black uppercase text-slate-400 hover:bg-white/5 hover:text-white rounded-lg flex items-center space-x-2">
                          <ArrowRightLeft size={10} className="rotate-90" /> <span>Move Right</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setIsEditingSite(s); setShowMenu(false) }} className="w-full text-left px-3 py-2 text-[9px] font-black uppercase text-slate-400 hover:bg-blue-500/20 hover:text-blue-400 rounded-lg flex items-center space-x-2">
                          <Edit2 size={10} /> <span>Edit Site</span>
                        </button>
                        <div className="h-px bg-white/5 my-1" />
                        <button onClick={(e) => { e.stopPropagation(); if(confirm(`Destroy site ${s.name}?`)) siteDeleteMutation.mutate(s.id); setShowMenu(false) }} className="w-full text-left px-3 py-2 text-[9px] font-black uppercase text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center space-x-2">
                          <Trash2 size={10} /> <span>Decommission</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
          <button onClick={() => { setNewSite({ name: '', address: '' }); setIsAddingSite(true) }} className="p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all ml-2">
            <Plus size={16}/>
          </button>
        </div>
      )}

      <div className="flex-1 flex space-x-6 overflow-x-auto pb-6 custom-scrollbar px-2">
        {displayedRacks.map((r: any) => (
          <RackElevation 
            key={r.id} 
            rack={r} 
            searchTerm={searchTerm}
            isSelected={selectedRacks.includes(r.id)}
            onToggleSelect={(id) => setSelectedRacks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
            onDelete={(id) => confirm('Destroy this rack structure?') && deleteMutation.mutate(id)}
            onEdit={(rack: any) => setIsEditingRack({...rack, total_u: rack.total_u})}
            onMove={(dir) => moveRack(r.id, dir)}
            onMount={(rackId, u) => setIsProvisioning({ rackId, start_u: u })}
            onManageDevice={setManagingDevice}
            isDeleted={activeTab === 'deleted'}
            onRestore={(id) => bulkActionMutation.mutate({ action: 'restore', ids: [id] })}
          />
        ))}
        {displayedRacks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20 space-y-4">
             <Server size={64} />
             <p className="text-[10px] font-black uppercase tracking-[0.4em]">{activeTab === 'deleted' ? 'No Purged Records' : 'No Racks in Selected Scope'}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isProvisioning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[450px] p-10 rounded-[40px] space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center space-x-3 text-blue-400"><Server size={24} /><span>Rack Mounting Matrix</span></h2>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Target Asset</label>
                <select value={isProvisioning.device_id || ''} onChange={e => {
                    const selectedDevice = devices?.find((d: any) => String(d.id) === e.target.value);
                    const size_u = selectedDevice?.size_u || 1; // Default to 1U if not specified
                    setIsProvisioning({...isProvisioning, device_id: e.target.value, size_u: size_u});
                }} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none">
                  <option value="">Select Asset from Registry...</option>
                  {devices?.filter((d:any) => d.status !== 'Decommissioned' && (d.u_start === null || d.u_start === undefined)).map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name} [{d.type}] ({d.size_u || 1}U)</option>
                  ))}
                  {devices?.filter((d:any) => d.status !== 'Decommissioned' && (d.u_start === null || d.u_start === undefined)).length === 0 && (
                    <option disabled>No unmounted assets available</option>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Start Unit (U)</label>
                  <input type="number" value={isProvisioning.start_u} onChange={e => setIsProvisioning({...isProvisioning, start_u: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Vertical Size (U)</label>
                  <input type="number" value={isProvisioning.size_u || 1} onChange={e => setIsProvisioning({...isProvisioning, size_u: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs" />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => setIsProvisioning(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500">Cancel</button>
                <button onClick={() => mountMutation.mutate(isProvisioning)} className="flex-2 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Establish Mount</button>
              </div>
            </motion.div>
          </div>
        )}


        {(isAddingSite || isEditingSite) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-10 rounded-[40px] space-y-6 border-emerald-500/30">
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center space-x-3 text-emerald-400"><MapPin size={24} /><span>{isEditingSite ? 'Modify Site Identity' : 'Establish New Site'}</span></h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Site Name</label>
                  <input value={isEditingSite ? isEditingSite.name : newSite.name} onChange={e => isEditingSite ? setIsEditingSite({...isEditingSite, name: e.target.value}) : setNewSite({...newSite, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-500" placeholder="e.g. DATA-CENTER-01" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Physical Address</label>
                  <input value={isEditingSite ? isEditingSite.address : newSite.address} onChange={e => isEditingSite ? setIsEditingSite({...isEditingSite, address: e.target.value}) : setNewSite({...newSite, address: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-500" placeholder="123 Silicon Valley Way..." />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => { setIsAddingSite(false); setIsEditingSite(null) }} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500">Cancel</button>
                <button onClick={() => siteMutation.mutate(isEditingSite || newSite)} className="flex-2 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">{isEditingSite ? 'Sync Changes' : 'Create Site'}</button>
              </div>
            </motion.div>
          </div>
        )}

        {(isAddingRack || isEditingRack) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-10 rounded-[40px] space-y-6 border-blue-500/30">
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center space-x-3 text-blue-400"><Server size={24} /><span>{isEditingRack ? 'Modify Rack Matrix' : 'Provision Rack Structure'}</span></h2>
              <div className="space-y-4">
                {!isEditingRack && (
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Target Site</label>
                    <select value={newRack.site_id} onChange={e => setNewRack({...newRack, site_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none">
                      <option value="">Select Deployment Site...</option>
                      {sites?.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Rack Identifier</label>
                  <input value={isEditingRack ? isEditingRack.name : newRack.name} onChange={e => isEditingRack ? setIsEditingRack({...isEditingRack, name: e.target.value}) : setNewRack({...newRack, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" placeholder="e.g. RACK-A01" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Total Height (U)</label>
                  <input type="number" value={isEditingRack ? isEditingRack.total_u : newRack.total_u} onChange={e => isEditingRack ? setIsEditingRack({...isEditingRack, total_u: parseInt(e.target.value)}) : setNewRack({...newRack, total_u: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => { setIsAddingRack(false); setIsEditingRack(null) }} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500">Cancel</button>
                <button onClick={() => { 
                    if(!isEditingRack && !newRack.site_id) return toast.error("Site selection is required"); 
                    rackMutation.mutate(isEditingRack || newRack) 
                }} className="flex-2 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">{isEditingRack ? 'Sync Rack' : 'Deploy Rack'}</button>
              </div>
            </motion.div>
          </div>
        )}

        {managingDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[500px] p-10 rounded-[40px] space-y-6 border-blue-500/30">
              <div className="flex items-center justify-between">
                 <h2 className="text-xl font-black uppercase tracking-tighter flex items-center space-x-3 text-blue-400"><Monitor size={24} /><span>Asset Control Matrix</span></h2>
                 <button onClick={() => setManagingDevice(null)} className="p-2 hover:bg-white/10 rounded-full text-slate-500 transition-colors"><X size={20}/></button>
              </div>

              <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5 space-y-4">
                 <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hostname</p>
                       <h3 className="text-lg font-black text-white">{managingDevice.name}</h3>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Classification</p>
                       <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{managingDevice.type}</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Position (U)</label>
                       <div className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 font-mono">
                          Unit {allRacks?.find((r:any) => r.device_locations?.some((l:any) => l.device_id === managingDevice.id))?.device_locations?.find((l:any) => l.device_id === managingDevice.id)?.start_unit}
                       </div>
                    </div>
                    <div>
                       <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Vertical Size (U)</label>
                       <input 
                          type="number" 
                          value={managingDevice.size_u || 1} 
                          onChange={e => setManagingDevice({...managingDevice, size_u: parseInt(e.target.value)})}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" 
                       />
                    </div>
                 </div>
              </div>

              <div className="flex space-x-3">
                <button 
                  onClick={() => {
                    const rack = allRacks?.find((r:any) => r.device_locations?.some((l:any) => l.device_id === managingDevice.id));
                    const loc = rack?.device_locations?.find((l:any) => l.device_id === managingDevice.id);
                    if (rack && loc) {
                      updateMountMutation.mutate({ 
                        rackId: rack.id, 
                        device_id: managingDevice.id, 
                        start_u: loc.start_unit, 
                        size_u: managingDevice.size_u 
                      });
                    }
                  }}
                  className="flex-1 py-3 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600/20 transition-all flex items-center justify-center space-x-2"
                >
                   <Check size={14}/> <span>Apply Resize</span>
                </button>
                <button 
                  onClick={() => confirm(`Permanently remove ${managingDevice.name} from its rack?`) && unmountMutation.mutate(managingDevice.id)}
                  className="flex-1 py-3 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase hover:bg-rose-600/20 transition-all flex items-center justify-center space-x-2"
                >
                   <Trash2 size={14}/> <span>Unmount Asset</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
