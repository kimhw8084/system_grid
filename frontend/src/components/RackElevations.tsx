import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Info, Plus, Activity, Zap, Trash2, Edit2 } from 'lucide-react'
import { motion } from 'framer-motion'

const RackUnit = ({ uNumber, device, isBase }: { uNumber: number, device?: any, isBase?: boolean }) => {
  return (
    <div 
      className={`relative border-b border-white/5 flex items-center px-2 transition-all duration-300 ${
        device ? 'bg-[#034EA2]/20 border-l-2 border-l-[#034EA2] group' : 'hover:bg-white/5'
      }`}
      style={{ height: '24px' }}
    >
      <span className="text-[9px] font-mono text-slate-600 w-4 select-none">{uNumber}</span>
      {isBase && device && (
        <div className="flex-1 flex items-center justify-between overflow-hidden">
          <span className="text-[10px] font-bold truncate ml-1 text-blue-100 uppercase tracking-tight">{device.name}</span>
        </div>
      )}
    </div>
  )
}

const RackElevation = ({ rack, onDelete, onEdit }: { rack: any, onDelete: any, onEdit: any }) => {
  const units = Array.from({ length: rack.total_u || 42 }, (_, i) => (rack.total_u || 42) - i)
  
  return (
    <div className="glass-panel w-56 flex-shrink-0 rounded-xl overflow-hidden flex flex-col border-white/5 hover:border-[#034EA2]/20 transition-colors group">
      <div className="bg-slate-900/80 p-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 truncate">{rack.name}</h4>
          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={() => onEdit(rack)}><Edit2 size={12} className="text-slate-400 hover:text-blue-400"/></button>
             <button onClick={() => onDelete(rack.id)}><Trash2 size={12} className="text-slate-400 hover:text-rose-400"/></button>
          </div>
        </div>
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
          <div className="flex items-center space-x-1">
            <Zap size={10} className="text-amber-500" />
            <span>4.2 kW</span>
          </div>
          <span>{rack.total_u}U</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-slate-950/30 custom-scrollbar">
        {units.map((u) => {
          const device = (rack.devices || []).find((d: any) => u >= d.start_u && u < d.start_u + d.size_u)
          const isBase = device?.start_u === u
          return <RackUnit key={u} uNumber={u} device={device} isBase={isBase} />
        })}
      </div>
    </div>
  )
}

export default function RackElevations() {
  const queryClient = useQueryClient()
  const [activeSite, setActiveSite] = useState<number | null>(null)

  const { data: sites } = useQuery({ queryKey: ['sites'], queryFn: async () => (await fetch('/api/v1/sites/')).json() })
  const { data: racks } = useQuery({ queryKey: ['racks'], queryFn: async () => (await fetch('/api/v1/racks/')).json() })

  const deleteRack = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/racks/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['racks'] })
  })

  const addRack = useMutation({
    mutationFn: async () => fetch('/api/v1/racks/', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ name: `RACK-${Math.floor(Math.random()*1000)}`, total_u: 42 }) 
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['racks'] })
  })

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 bg-slate-900/50 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveSite(null)}
            className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all duration-300 ${!activeSite ? 'bg-[#034EA2] text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            ALL SITES
          </button>
          {sites?.map((site: any) => (
            <button
              key={site.id}
              onClick={() => setActiveSite(site.id)}
              className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all duration-300 ${activeSite === site.id ? 'bg-[#034EA2] text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {site.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-4">
        <div className="flex space-x-6 h-full min-w-max pr-12">
          {racks?.map((rack: any) => (
            <RackElevation key={rack.id} rack={rack} onDelete={(id: number) => deleteRack.mutate(id)} onEdit={() => {}} />
          ))}
          
          <button onClick={() => addRack.mutate()} className="w-56 flex-shrink-0 border-2 border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center space-y-3 hover:border-[#034EA2]/30 transition-all group bg-slate-900/10">
            <div className="p-3 rounded-full bg-slate-900/50 border border-white/5 group-hover:scale-110 transition-transform">
              <Plus size={20} className="text-slate-500 group-hover:text-blue-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-300">Provision Rack</span>
          </button>
        </div>
      </div>
    </div>
  )
}
