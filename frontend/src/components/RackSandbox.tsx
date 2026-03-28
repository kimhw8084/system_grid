import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Trash2, Search, MapPin, X, ArrowRightLeft, Server, 
  Monitor, AlertTriangle, Check, MoreVertical, RefreshCcw,
  Zap, Network, Layout, Calendar, User, Eye, Cable, Clock,
  ArrowUpRight, Info, Shield, ShieldCheck, Table as TableIcon, List,
  LayoutGrid
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DndContext, 
  useDraggable, 
  useDroppable, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DragOverEvent
} from '@dnd-kit/core'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'
import { StyledSelect } from './shared/StyledSelect'

// --- Constants & Rules ---

const ASSET_TYPES = [
    { value: 'Physical', label: 'Physical' },
    { value: 'Virtual', label: 'Virtual' },
    { value: 'Storage', label: 'Storage' },
    { value: 'Switch', label: 'Switch' },
    { value: 'Firewall', label: 'Firewall' },
    { value: 'Load Balancer', label: 'Load Balancer' }
]

const RULES = {
  IDENTIFIER_MIN: 3,
  IDENTIFIER_MAX: 64,
  SYSTEM_MAX: 64,
  ETA_PATTERN: /^\d{4}-(0[1-9]|1[0-2])$/, // YYYY-MM
  RACK_U_MIN: 1,
  RACK_U_MAX: 52
}

// --- Validation Logic ---

const validateReservation = (data: any) => {
  const errors: string[] = []
  
  if (!data.temp_name || data.temp_name.trim().length < RULES.IDENTIFIER_MIN) {
    errors.push(`Identifier must be at least ${RULES.IDENTIFIER_MIN} characters`)
  }
  if (data.temp_name.length > RULES.IDENTIFIER_MAX) {
    errors.push(`Identifier exceeds maximum of ${RULES.IDENTIFIER_MAX} characters`)
  }
  if (!/^[a-zA-Z0-9\-_]+$/.test(data.temp_name)) {
    errors.push("Identifier contains invalid characters (use Alphanumeric, -, _)")
  }
  if (!data.system || data.system.trim().length === 0) {
    errors.push("Logical System domain is mandatory")
  }
  if (data.est_arrival && !RULES.ETA_PATTERN.test(data.est_arrival)) {
    errors.push("Arrival window must match format YYYY-MM (e.g. 2026-06)")
  }
  
  return errors
}

const sanitizeInput = (val: string) => val.trim().toUpperCase()

// --- Components ---

const DraggableAsset = ({ device, loc, isReserved, isOverlay = false }: any) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `device-${device.id}`,
    data: { device, loc, isReserved }
  })

  const height = (loc?.size_u || device.size_u || 1) * 24 - 2

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ ...style, height: `${height}px` }}
      className={`relative flex items-center px-3 cursor-grab active:cursor-grabbing group transition-all rounded-lg mx-[1px] shadow-sm
        ${isReserved ? 'bg-amber-500/10 border border-dashed border-amber-500/40' : 'bg-blue-600/20 border border-blue-500/30'}
        ${isDragging && !isOverlay ? 'opacity-20 grayscale' : 'opacity-100'}
        ${isOverlay ? 'shadow-2xl ring-2 ring-blue-500 bg-blue-600/40 z-[200]' : 'hover:bg-blue-600/30'}
      `}
    >
      <div className="flex flex-col justify-center w-full overflow-hidden">
        <div className="flex items-center gap-2">
          {isReserved ? <Clock size={10} className="text-amber-500 shrink-0" /> : <Server size={10} className="text-blue-400 shrink-0" />}
          <span className="text-[10px] font-black text-white truncate uppercase tracking-tighter">
            {device.name}
          </span>
        </div>
        {height > 30 && (
          <div className="flex items-center gap-2 mt-1 opacity-60">
             <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{device.system}</span>
             {isReserved && <span className="text-[7px] text-amber-500 font-black ml-auto whitespace-nowrap">ARRIVE: {device.reservation_info?.est_arrival}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

const RackUnit = ({ u, rackId, asset, onSelect, isDropTarget, onViewDetails }: any) => {
  const { setNodeRef } = useDroppable({
    id: `rack-${rackId}-u-${u}`,
    data: { rackId, u }
  })

  const isStartUnit = asset && asset.start_unit === u

  return (
    <div 
      ref={setNodeRef}
      onClick={() => {
        if (asset) onViewDetails(asset.device)
        else onSelect(u)
      }}
      className={`relative h-6 border-b border-white/[0.04] flex items-center transition-all px-2
        ${isDropTarget ? 'bg-emerald-500/20 ring-1 ring-inset ring-emerald-500/50' : 'hover:bg-white/[0.02]'}
      `}
    >
      <span className="text-[8px] font-mono text-slate-600 w-4 select-none">{u}</span>
      <div className="flex-1 h-full py-[1px]">
        {isStartUnit && (
          <DraggableAsset device={asset.device} loc={asset} isReserved={asset.device.is_reservation} />
        )}
      </div>
    </div>
  )
}

export default function RackSandbox() {
  const queryClient = useQueryClient()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSiteId, setActiveSiteId] = useState<number | null>(null)
  const [draggedItem, setDraggedAsset] = useState<any>(null)
  const [overUnit, setOverUnit] = useState<any>(null)
  const [isReserving, setIsReserving] = useState<any>(null)
  const [activeAssetDetails, setActiveAssetDetails] = useState<any>(null)
  const [reservationData, setReservationData] = useState({
    temp_name: '', type: 'Physical', system: '', est_arrival: '', requester: 'System Admin'
  })

  // Queries
  const { data: allRacks, isLoading: isLoadingRacks } = useQuery({ 
    queryKey: ['racks-sandbox'], 
    queryFn: async () => (await apiFetch('/api/v1/racks/')).json() 
  })
  const { data: sites } = useQuery({ 
    queryKey: ['sites'], 
    queryFn: async () => (await apiFetch('/api/v1/sites/')).json() 
  })

  // Derived Assets List for "List View"
  const allMountedAssets = useMemo(() => {
    if (!allRacks) return []
    return allRacks.flatMap((r: any) => 
      (r.device_locations || []).map((l: any) => ({ ...l.device, rack_name: r.name, u_start: l.start_unit }))
    )
  }, [allRacks])

  // ... rest of mutations ...

  // Mutations
  const moveMutation = useMutation({
    mutationFn: async ({ device_id, target_rack_id, target_start_u }: any) => {
      const res = await apiFetch('/api/v1/racks/move', { 
        method: 'POST', body: JSON.stringify({ device_id, target_rack_id, target_start_u }) 
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racks-sandbox'] })
      toast.success('Matrix Sync Successful')
    },
    onError: (e: any) => toast.error(`Orchestration Conflict: ${e.message}`)
  })

  const reserveMutation = useMutation({
    mutationFn: async (data: any) => {
      const devRes = await apiFetch('/api/v1/devices/', { 
        method: 'POST', 
        body: JSON.stringify({ 
          name: sanitizeInput(data.temp_name), type: data.type, system: sanitizeInput(data.system), status: 'Planned',
          is_reservation: true,
          reservation_info: { est_arrival: data.est_arrival, requester: data.requester }
        }) 
      })
      const device = await devRes.json()
      return (await apiFetch(`/api/v1/racks/${data.rackId}/mount`, {
        method: 'POST', body: JSON.stringify({ device_id: device.id, start_u: data.u, size_u: 1 })
      })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racks-sandbox'] })
      setIsReserving(null)
      toast.success('Reservation Verified & Locked')
    }
  })

  // --- Drag Logic ---

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = (event: DragStartEvent) => setDraggedAsset(event.active.data.current)
  const handleDragOver = (event: DragOverEvent) => setOverUnit(event.over?.data.current || null)

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedAsset(null)
    setOverUnit(null)
    const { active, over } = event
    if (!over) return

    const device = active.data.current?.device
    const target = over.data.current as any
    
    if (device && target) {
      const size = device.size_u || 1
      const rack = allRacks.find((r: any) => r.id === target.rackId)
      const occupiedUnits = rack.device_locations
        .filter((l: any) => l.device_id !== device.id)
        .flatMap((l: any) => Array.from({ length: l.size_u }, (_, i) => l.start_unit + i))

      const targetUnits = Array.from({ length: size }, (_, i) => target.u + i)
      const collision = targetUnits.some(u => occupiedUnits.includes(u) || u > (rack.total_u_height || 42) || u < 1)

      if (collision) {
        toast.error('Boundary Breach: Target units occupied or out of bounds')
        return
      }

      moveMutation.mutate({ 
        device_id: device.id, target_rack_id: target.rackId, target_start_u: target.u 
      })
    }
  }

  const filteredRacks = useMemo(() => {
    if (!allRacks) return []
    let list = allRacks
    if (activeSiteId) list = list.filter((r: any) => r.site_id === activeSiteId)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      list = list.filter((r: any) => 
        r.name.toLowerCase().includes(term) || 
        r.device_locations?.some((l: any) => l.device?.name?.toLowerCase().includes(term))
      )
    }
    return list
  }, [allRacks, activeSiteId, searchTerm])

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart} 
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col space-y-6 text-left">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black uppercase italic text-white flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg"><Layout size={24}/></div>
              <span>Rack Sandbox</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase font-black mt-2 tracking-widest">Experimental Orchestration & Physical Constraints</p>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><TableIcon size={16}/></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><List size={16}/></button>
             </div>
             <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
                <button onClick={() => setActiveSiteId(null)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!activeSiteId ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Global</button>
                {sites?.map((s: any) => (
                  <button key={s.id} onClick={() => setActiveSiteId(s.id)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeSiteId === s.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{s.name}</button>
                ))}
             </div>
             <div className="relative group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filter Matrix..." className="bg-white/5 border border-white/5 rounded-2xl pl-12 pr-6 py-3 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 text-white" />
             </div>
          </div>
        </div>

        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-10 relative"
        >
           {viewMode === 'grid' ? (
             <div className="flex gap-10 h-full items-start px-2 min-w-max relative z-10">
                {filteredRacks.map((rack: any) => (
                  <div key={rack.id} className="w-64 flex flex-col glass-panel rounded-[40px] overflow-hidden border-white/5 shadow-2xl h-full max-h-[900px]">
                     <div className="p-6 bg-white/[0.02] border-b border-white/5">
                        <h3 className="font-black text-[13px] uppercase tracking-widest text-white italic truncate">{rack.name}</h3>
                        <p className="text-[9px] text-slate-500 font-black uppercase mt-1">{rack.site_name}</p>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/40">
                        <div className="m-3 border border-white/5 rounded-3xl overflow-hidden bg-black/20">
                           {Array.from({ length: rack.total_u_height || 42 }, (_, i) => rack.total_u_height - i).map(u => {
                             const asset = rack.device_locations?.find((l: any) => u >= l.start_unit && u < l.start_unit + l.size_u)
                             const isDropTarget = overUnit?.rackId === rack.id && u === overUnit?.u
                             return (
                               <RackUnit 
                                 key={u} u={u} rackId={rack.id} asset={asset} 
                                 isDropTarget={isDropTarget}
                                 onSelect={(u: number) => setIsReserving({ rackId: rack.id, u })}
                                 onViewDetails={(a: any) => setActiveAssetDetails(a)}
                               />
                             )
                           })}
                        </div>
                     </div>
                  </div>
                ))}
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-2">
                {allMountedAssets.map((a: any) => (
                  <motion.div 
                    key={a.id} whileHover={{ scale: 1.02 }}
                    onClick={() => setActiveAssetDetails(a)}
                    className="glass-panel p-6 rounded-[32px] border border-white/5 hover:border-blue-500/30 cursor-pointer group transition-all"
                  >
                     <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><Server size={20}/></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{a.rack_name} · U{a.u_start}</span>
                     </div>
                     <h3 className="text-lg font-black text-white uppercase italic tracking-tighter truncate">{a.name}</h3>
                     <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{a.system} // {a.type}</p>
                  </motion.div>
                ))}
             </div>
           )}
        </div>

        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
          {draggedItem ? (
            <DraggableAsset device={draggedItem.device} loc={draggedItem.loc} isReserved={draggedItem.isReserved} isOverlay />
          ) : null}
        </DragOverlay>

        <AnimatePresence>
          {isReserving && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10">
               <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="glass-panel w-full max-w-xl p-12 rounded-[50px] border-blue-500/30 space-y-10 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-8">
                     <div className="flex items-center space-x-6">
                        <div className="p-5 bg-amber-500/10 rounded-[2.5rem] text-amber-500 shadow-inner"><Clock size={32}/></div>
                        <div>
                           <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">Ghost Planning</h2>
                           <p className="text-[11px] text-amber-500 font-black uppercase mt-3 tracking-[0.3em]">Reserving Vector: U{isReserving.u} in Matrix Node</p>
                        </div>
                     </div>
                     <button onClick={() => setIsReserving(null)} className="p-3 bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all"><X size={28}/></button>
                  </div>

                  <div className="space-y-8">
                     <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Reserved Identifier</label>
                        <input value={reservationData.temp_name} onChange={e => setReservationData({...reservationData, temp_name: e.target.value})} placeholder="e.g. PROJECT-X-STORAGE-01" className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-blue-500 shadow-inner" />
                     </div>
                     <div className="grid grid-cols-2 gap-8">
                        <StyledSelect label="Planned Asset Class" value={reservationData.type} onChange={e => setReservationData({...reservationData, type: e.target.value})} options={ASSET_TYPES} />
                        <div className="space-y-3">
                           <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">ETA (YYYY-MM)</label>
                           <input value={reservationData.est_arrival} onChange={e => setReservationData({...reservationData, est_arrival: e.target.value})} placeholder="2026-09" className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-xs font-mono text-white outline-none focus:border-blue-500" />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Logical System</label>
                           <input value={reservationData.system} onChange={e => setReservationData({...reservationData, system: e.target.value})} placeholder="e.g. SAP-ERP" className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-blue-500" />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Orchestrator</label>
                           <div className="flex items-center space-x-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
                              <User size={16} className="text-slate-500" />
                              <span className="text-[11px] font-black text-white uppercase">{reservationData.requester}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex space-x-6 pt-10 border-t border-white/5">
                     <button onClick={() => setIsReserving(null)} className="flex-1 py-4 text-[11px] font-black uppercase text-slate-500 hover:text-white transition-colors bg-white/5 rounded-2xl">Abort Reservation</button>
                     <button 
                        onClick={() => { 
                          const errs = validateReservation(reservationData)
                          if (errs.length > 0) return toast.error(errs[0])
                          reserveMutation.mutate({...reservationData, ...isReserving}) 
                        }} 
                        className="flex-[2] py-4 bg-amber-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3"
                     >
                        <ShieldCheck size={16} /> <span>Secure Matrix Slot</span>
                     </button>
                  </div>
               </motion.div>
            </div>
          )}
          {activeAssetDetails && (
            <AssetQuickDetailModal 
              asset={activeAssetDetails} 
              onClose={() => setActiveAssetDetails(null)} 
              onGoToMatrix={(id: number) => {
                navigate(`/asset-sandbox?id=${id}`)
                setActiveAssetDetails(null)
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </DndContext>
  )
}

function AssetQuickDetailModal({ asset, onClose, onGoToMatrix }: any) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10">
       <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-full max-w-2xl p-12 rounded-[50px] border-blue-500/30 shadow-2xl space-y-10 text-left">
          <div className="flex items-center justify-between border-b border-white/5 pb-8">
             <div className="flex items-center space-x-6">
                <div className="p-5 bg-blue-600/10 rounded-[2.5rem] text-blue-400 shadow-inner"><Monitor size={32}/></div>
                <div>
                   <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">{asset.name}</h2>
                   <p className="text-[11px] font-black text-slate-500 uppercase mt-3 tracking-[0.3em]">{asset.system} // Physical Node Forensics</p>
                </div>
             </div>
             <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all"><X size={28}/></button>
          </div>

          <div className="grid grid-cols-2 gap-10">
             <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em] border-l-4 border-blue-600 pl-4 italic">Core Matrix Specs</h3>
                <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-4 shadow-inner">
                   <div className="flex justify-between items-center"><span className="text-[9px] font-black text-slate-500 uppercase">Mgmt IP</span><span className="text-xs font-mono font-bold text-white uppercase italic">{asset.management_ip || 'VOID'}</span></div>
                   <div className="flex justify-between items-center"><span className="text-[9px] font-black text-slate-500 uppercase">OS Distro</span><span className="text-xs font-bold text-white uppercase italic">{asset.os_name} {asset.os_version}</span></div>
                   <div className="flex justify-between items-center"><span className="text-[9px] font-black text-slate-500 uppercase">Phy Model</span><span className="text-[10px] font-bold text-slate-400 uppercase">{asset.manufacturer} {asset.model}</span></div>
                </div>
             </div>
             <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em] border-l-4 border-emerald-600 pl-4 italic">Spatial Context</h3>
                <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-4 shadow-inner">
                   <div className="flex justify-between items-center"><span className="text-[9px] font-black text-slate-500 uppercase">Host Site</span><span className="text-xs font-bold text-white uppercase italic">{asset.site_name || 'PRIMARY'}</span></div>
                   <div className="flex justify-between items-center"><span className="text-[9px] font-black text-slate-500 uppercase">Rack Matrix</span><span className="text-xs font-bold text-white uppercase italic">{asset.rack_name}</span></div>
                   <div className="flex justify-between items-center"><span className="text-[9px] font-black text-slate-500 uppercase">Unit Vector</span><span className="text-xs font-bold text-white uppercase italic">U{asset.u_start}</span></div>
                </div>
             </div>
          </div>

          <div className="flex space-x-6 pt-10 border-t border-white/5">
             <button onClick={onClose} className="flex-1 py-4 text-[11px] font-black uppercase text-slate-500 hover:text-white transition-colors bg-white/5 rounded-2xl">Close HUD</button>
             <button onClick={() => onGoToMatrix(asset.id)} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3">
                <LayoutGrid size={16} /> <span>Open in Asset Matrix</span>
             </button>
          </div>
       </motion.div>
    </div>
  )
}
