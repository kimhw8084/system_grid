import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Trash2, Search, MapPin, X, ArrowRightLeft, Server, 
  Monitor, AlertTriangle, Check, MoreVertical, RefreshCcw,
  Zap, Network, Layout, Calendar, User, Eye, Cable, Clock,
  ArrowUpRight, Info
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

// --- Constants ---

const ASSET_TYPES = [
    { value: 'Physical', label: 'Physical' },
    { value: 'Virtual', label: 'Virtual' },
    { value: 'Storage', label: 'Storage' },
    { value: 'Switch', label: 'Switch' },
    { value: 'Firewall', label: 'Firewall' },
    { value: 'Load Balancer', label: 'Load Balancer' }
]

// --- Helper: Manhattan Routing for Cables ---

const getManhattanPath = (x1: number, y1: number, x2: number, y2: number) => {
  const midX = (x1 + x2) / 2
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
}

// --- Components ---

const DraggableAsset = ({ device, loc, isReserved, isOverlay = false }: any) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `device-${device.id}`,
    data: { device, loc, isReserved }
  })

  // Calculate height based on size_u
  const height = (loc?.size_u || device.size_u || 1) * 24 - 2 // 24px per U minus some margin

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

const RackUnit = ({ u, rackId, asset, onSelect, isDropTarget }: any) => {
  const { setNodeRef } = useDroppable({
    id: `rack-${rackId}-u-${u}`,
    data: { rackId, u }
  })

  // Check if this unit is the start of an asset
  const isStartUnit = asset && asset.start_unit === u

  return (
    <div 
      ref={setNodeRef}
      onClick={() => !asset && onSelect(u)}
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

const CableOverlay = ({ racks, connections, containerRef }: any) => {
  const [paths, setPaths] = useState<any[]>([])

  // Recalculate paths when racks or connections change
  useEffect(() => {
    if (!racks || !connections || !containerRef.current) return

    const newPaths: any[] = []
    // Logic to map connections to SVG paths based on DOM positions
    // This is a complex calculation in a real app, here we simulate the 'trace'
    setPaths(newPaths)
  }, [racks, connections, containerRef])

  return (
    <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible opacity-30">
      {paths.map((p, i) => (
        <path key={i} d={p.d} stroke="#3b82f6" strokeWidth="1" fill="none" />
      ))}
    </svg>
  )
}

export default function RackSandbox() {
  const queryClient = useQueryClient()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSiteId, setActiveSiteId] = useState<number | null>(null)
  const [draggedItem, setDraggedAsset] = useState<any>(null)
  const [overUnit, setOverUnit] = useState<any>(null)
  const [isReserving, setIsReserving] = useState<any>(null)
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
  const { data: connections } = useQuery({ 
    queryKey: ['connections'], 
    queryFn: async () => (await apiFetch('/api/v1/networks/connections')).json() 
  })

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
      toast.success('Asset Orchestration Synchronized')
    },
    onError: (e: any) => toast.error(`Collision detected: ${e.message}`)
  })

  const reserveMutation = useMutation({
    mutationFn: async (data: any) => {
      const devRes = await apiFetch('/api/v1/devices/', { 
        method: 'POST', 
        body: JSON.stringify({ 
          name: data.temp_name, type: data.type, system: data.system, status: 'Planned',
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
      toast.success('Ghost Reservation Secured')
    }
  })

  // --- Drag Logic ---

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedAsset(event.active.data.current)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (over) {
      setOverUnit(over.data.current)
    } else {
      setOverUnit(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedAsset(null)
    setOverUnit(null)
    const { active, over } = event
    if (!over) return

    const device = active.data.current?.device
    const target = over.data.current as any
    
    if (device && target) {
      // Strict conflict check: Does the asset fit?
      const size = device.size_u || 1
      const rack = allRacks.find((r: any) => r.id === target.rackId)
      const occupiedUnits = rack.device_locations
        .filter((l: any) => l.device_id !== device.id)
        .flatMap((l: any) => Array.from({ length: l.size_u }, (_, i) => l.start_unit + i))

      const targetUnits = Array.from({ length: size }, (_, i) => target.u + i)
      const collision = targetUnits.some(u => occupiedUnits.includes(u) || u > (rack.total_u_height || 42))

      if (collision) {
        toast.error(`Matrix Collision: Insufficient vertical space for ${size}U node`)
        return
      }

      moveMutation.mutate({ 
        device_id: device.id, target_rack_id: target.rackId, target_start_u: target.u 
      })
    }
  }

  // --- Auto-Scroll Logic ---
  useEffect(() => {
    if (!draggedItem || !scrollContainerRef.current) return

    const interval = setInterval(() => {
      // Implementation of container auto-scrolling based on mouse position
      // ...
    }, 50)
    return () => clearInterval(interval)
  }, [draggedItem])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

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
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black uppercase italic text-white flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg"><Cable size={24}/></div>
              <span>Physical Sandbox</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase font-black mt-2 tracking-widest">Interactive Orchestration & Cable Vector Matrix</p>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
                <button onClick={() => setActiveSiteId(null)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!activeSiteId ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Global Matrix</button>
                {sites?.map((s: any) => (
                  <button key={s.id} onClick={() => setActiveSiteId(s.id)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeSiteId === s.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{s.name}</button>
                ))}
             </div>
             <div className="relative group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Query Matrix Grid..." className="bg-white/5 border border-white/5 rounded-2xl pl-12 pr-6 py-3 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 text-white" />
             </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-6 px-4 py-2 bg-black/20 rounded-2xl border border-white/5 w-fit text-[9px] font-black uppercase tracking-widest">
           <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded bg-blue-500/40 border border-blue-500" /> <span className="text-slate-400">Deployed Asset</span></div>
           <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded bg-amber-500/20 border border-dashed border-amber-500" /> <span className="text-slate-400">Planned Reservation</span></div>
           <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded bg-emerald-500/20 border border-emerald-500" /> <span className="text-slate-400">Valid Drop Vector</span></div>
        </div>

        {/* Rack Scrolling Container */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-10 relative"
        >
           <CableOverlay racks={filteredRacks} connections={connections} containerRef={scrollContainerRef} />
           
           <div className="flex gap-10 h-full items-start px-2 min-w-max relative z-10">
              {filteredRacks.map((rack: any) => (
                <div key={rack.id} className="w-64 flex flex-col glass-panel rounded-[40px] overflow-hidden border-white/5 shadow-2xl h-full max-h-[900px] hover:border-blue-500/20 transition-all duration-500">
                   <div className="p-6 bg-white/[0.02] border-b border-white/5 flex justify-between items-start">
                      <div className="min-w-0">
                        <h3 className="font-black text-[13px] uppercase tracking-widest text-white italic truncate">{rack.name}</h3>
                        <p className="text-[9px] text-slate-500 font-black uppercase mt-1">{rack.site_name}</p>
                      </div>
                      <div className="p-2 bg-white/5 rounded-xl text-slate-600"><MoreVertical size={14}/></div>
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
                             />
                           )
                         })}
                      </div>
                   </div>
                </div>
              ))}
              
              {/* Empty Rack Suggestion */}
              <button className="w-64 h-full glass-panel border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center space-y-4 opacity-30 hover:opacity-100 hover:border-blue-500/30 transition-all">
                 <div className="p-4 bg-white/5 rounded-3xl"><Plus size={32} className="text-slate-500" /></div>
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Add New Matrix Node</span>
              </button>
           </div>
        </div>

        {/* Drag Overlay (Visual Mirror) */}
        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: '0.5' } }
          })
        }}>
          {draggedItem ? (
            <DraggableAsset device={draggedItem.device} loc={draggedItem.loc} isReserved={draggedItem.isReserved} isOverlay />
          ) : null}
        </DragOverlay>

        {/* Reservation Modal (Enhanced Idea 4) */}
        <AnimatePresence>
          {isReserving && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10">
               <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="glass-panel w-full max-w-xl p-12 rounded-[50px] border-blue-500/30 space-y-10 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-8">
                     <div className="flex items-center space-x-6">
                        <div className="p-5 bg-amber-500/10 rounded-[2.5rem] text-amber-500 shadow-inner"><Clock size={32}/></div>
                        <div>
                           <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">Ghost Planning</h2>
                           <p className="text-[11px] text-amber-500 font-black uppercase mt-3 tracking-[0.3em]">Reserving Vector: U{isReserving.u} in Grid</p>
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
                        onClick={() => { if(!reservationData.temp_name) return toast.error("Identifier required"); reserveMutation.mutate({...reservationData, ...isReserving}) }} 
                        className="flex-[2] py-4 bg-amber-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3"
                     >
                        <Lock size={16} /> <span>Secure Matrix Slot</span>
                     </button>
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DndContext>
  )
}

function Lock({ size }: { size: number }) {
  return <Shield size={size} />
}
