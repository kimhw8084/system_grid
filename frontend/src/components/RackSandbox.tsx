import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Trash2, Search, MapPin, X, ArrowRightLeft, Server, 
  Monitor, AlertTriangle, Check, MoreVertical, RefreshCcw,
  Zap, Network, Layout, Calendar, User, Eye, Cable
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
  defaultDropAnimationSideEffects
} from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'
import { StyledSelect } from './shared/StyledSelect'

// --- Types ---

interface ReservationData {
  temp_name: string
  type: string
  system: string
  est_arrival: string
  requester: string
}

// --- Components ---

const DraggableAsset = ({ device, loc, isReserved }: any) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `device-${device.id}`,
    data: { device, loc, isReserved }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`relative flex items-center px-3 h-full cursor-grab active:cursor-grabbing group transition-all rounded-md mx-[1px]
        ${isReserved ? 'bg-amber-500/10 border border-dashed border-amber-500/30' : 'bg-blue-600/20 border border-blue-500/20'}
        ${isDragging ? 'opacity-50 ring-2 ring-blue-500 z-50' : 'hover:bg-blue-600/30'}
      `}
    >
      <div className="flex items-center gap-2 overflow-hidden w-full">
        {isReserved ? <Clock size={10} className="text-amber-500 shrink-0" /> : <Server size={10} className="text-blue-400 shrink-0" />}
        <span className="text-[10px] font-black text-white truncate uppercase tracking-tighter">
          {device.name}
        </span>
        {isReserved && (
          <span className="text-[7px] text-amber-500/70 font-black ml-auto whitespace-nowrap">PLANNED {device.reservation_info?.est_arrival}</span>
        )}
      </div>
    </div>
  )
}

const RackUnit = ({ u, rackId, asset, onSelect }: any) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `rack-${rackId}-u-${u}`,
    data: { rackId, u }
  })

  return (
    <div 
      ref={setNodeRef}
      onClick={() => !asset && onSelect(u)}
      className={`relative h-6 border-b border-white/[0.04] flex items-center transition-all px-2
        ${isOver ? 'bg-emerald-500/20 ring-1 ring-inset ring-emerald-500/50' : 'hover:bg-white/[0.02]'}
      `}
    >
      <span className="text-[8px] font-mono text-slate-600 w-4 select-none">{u}</span>
      <div className="flex-1 h-full py-[1px]">
        {asset && (
          <DraggableAsset device={asset.device} loc={asset} isReserved={asset.device.is_reservation} />
        )}
      </div>
    </div>
  )
}

const CableOverlay = ({ racks, connections }: any) => {
  // Simple implementation: Draw lines between racks for connections
  // In a real "world class" version, we'd use specific RU offsets
  return (
    <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible">
      {connections?.map((conn: any, i: number) => {
        // Logic to find rack positions and draw Manhattan paths
        return null // Placeholder for complex routing logic
      })}
    </svg>
  )
}

export default function RackSandbox() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSiteId, setActiveSiteId] = useState<number | null>(null)
  const [draggedItem, setDraggedAsset] = useState<any>(null)
  const [isReserving, setIsReserving] = useState<any>(null)
  const [reservationData, setReservationData] = useState<ReservationData>({
    temp_name: '', type: 'Physical', system: '', est_arrival: '', requester: 'Admin'
  })

  const { data: allRacks, isLoading: isLoadingRacks } = useQuery({ 
    queryKey: ['racks-sandbox'], 
    queryFn: async () => (await apiFetch('/api/v1/racks/')).json() 
  })
  
  const { data: sites } = useQuery({ 
    queryKey: ['sites'], 
    queryFn: async () => (await apiFetch('/api/v1/sites/')).json() 
  })

  const moveMutation = useMutation({
    mutationFn: async ({ device_id, target_rack_id, target_start_u }: any) => {
      return (await apiFetch('/api/v1/racks/move', { 
        method: 'POST', body: JSON.stringify({ device_id, target_rack_id, target_start_u }) 
      })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racks-sandbox'] })
      toast.success('Asset relocated')
    },
    onError: (e: any) => toast.error(e.message)
  })

  const reserveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Create a "reserved" device first
      const devRes = await apiFetch('/api/v1/devices/', { 
        method: 'POST', 
        body: JSON.stringify({ 
          name: data.temp_name, 
          type: data.type, 
          system: data.system, 
          status: 'Planned',
          is_reservation: true,
          reservation_info: { est_arrival: data.est_arrival, requester: data.requester }
        }) 
      })
      const device = await devRes.json()
      // Then mount it
      return (await apiFetch(`/api/v1/racks/${data.rackId}/mount`, {
        method: 'POST',
        body: JSON.stringify({ device_id: device.id, start_u: data.u, size_u: 1 })
      })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racks-sandbox'] })
      setIsReserving(null)
      toast.success('Reservation registered')
    }
  })

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedAsset(event.active.data.current)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedAsset(null)
    const { active, over } = event
    if (!over) return

    const device = active.data.current?.device
    const target = over.data.current as any
    
    if (device && target) {
      moveMutation.mutate({ 
        device_id: device.id, 
        target_rack_id: target.rackId, 
        target_start_u: target.u 
      })
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const filteredRacks = useMemo(() => {
    if (!allRacks) return []
    let list = allRacks
    if (activeSiteId) list = list.filter((r: any) => r.site_id === activeSiteId)
    return list
  }, [allRacks, activeSiteId])

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black uppercase italic text-white flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg"><Layout size={24}/></div>
              <span>Rack Sandbox</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase font-black mt-2 tracking-widest">Experimental Physical Orchestration Lab</p>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
                <button onClick={() => setActiveSiteId(null)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!activeSiteId ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>All Sites</button>
                {sites?.map((s: any) => (
                  <button key={s.id} onClick={() => setActiveSiteId(s.id)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeSiteId === s.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{s.name}</button>
                ))}
             </div>
             <div className="relative group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filter Grid..." className="bg-white/5 border border-white/5 rounded-2xl pl-12 pr-6 py-3 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64" />
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-10">
           <div className="flex gap-10 h-full items-start px-2 min-w-max">
              {filteredRacks.map((rack: any) => (
                <div key={rack.id} className="w-64 flex flex-col glass-panel rounded-[40px] overflow-hidden border-white/5 shadow-2xl h-full max-h-[1100px]">
                   <div className="p-6 bg-white/[0.02] border-b border-white/5">
                      <h3 className="font-black text-[13px] uppercase tracking-widest text-white italic truncate">{rack.name}</h3>
                      <p className="text-[9px] text-slate-500 font-black uppercase mt-1">{rack.site_name}</p>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/40">
                      <div className="m-3 border border-white/5 rounded-3xl overflow-hidden bg-black/20">
                         {Array.from({ length: rack.total_u_height || 42 }, (_, i) => rack.total_u_height - i).map(u => {
                           const asset = rack.device_locations?.find((l: any) => u >= l.start_unit && u < l.start_unit + l.size_u)
                           return (
                             <RackUnit 
                               key={u} u={u} rackId={rack.id} asset={asset} 
                               onSelect={(u: number) => setIsReserving({ rackId: rack.id, u })} 
                             />
                           )
                         })}
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: '0.5' } }
          })
        }}>
          {draggedItem ? (
            <div className={`flex items-center px-4 h-6 rounded-md shadow-2xl border ${draggedItem.isReserved ? 'bg-amber-500/40 border-amber-500' : 'bg-blue-600/40 border-blue-500'}`}>
               <span className="text-[10px] font-black text-white uppercase">{draggedItem.device.name}</span>
            </div>
          ) : null}
        </DragOverlay>

        <AnimatePresence>
          {isReserving && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10">
               <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-[450px] p-10 rounded-[40px] border-blue-500/30 space-y-8 shadow-2xl">
                  <div className="flex items-center space-x-4">
                     <div className="p-4 bg-amber-500/10 rounded-3xl text-amber-500 shadow-inner"><Clock size={28}/></div>
                     <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Ghost Planning</h2>
                        <p className="text-[10px] text-amber-500 font-black uppercase mt-1">Reserve Slot: U{isReserving.u} in Matrix Node</p>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Temp Identifier</label>
                        <input value={reservationData.temp_name} onChange={e => setReservationData({...reservationData, temp_name: e.target.value})} placeholder="RESERVE-SRV-01" className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-3 text-sm font-bold text-white outline-none focus:border-blue-500" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <StyledSelect label="Asset Class" value={reservationData.type} onChange={e => setReservationData({...reservationData, type: e.target.value})} options={ASSET_TYPES} />
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Arrival Window</label>
                           <input value={reservationData.est_arrival} onChange={e => setReservationData({...reservationData, est_arrival: e.target.value})} placeholder="2026-06" className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-xs font-mono text-white outline-none focus:border-blue-500" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Logical System</label>
                        <input value={reservationData.system} onChange={e => setReservationData({...reservationData, system: e.target.value})} placeholder="e.g. SAP-ERP" className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-3 text-sm font-bold text-white outline-none focus:border-blue-500" />
                     </div>
                  </div>
                  <div className="flex space-x-4 pt-4">
                     <button onClick={() => setIsReserving(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Abort</button>
                     <button onClick={() => reserveMutation.mutate({...reservationData, ...isReserving})} className="flex-2 px-10 py-3 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-amber-500/20 active:scale-95 transition-all">Lock Matrix Slot</button>
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DndContext>
  )
}
