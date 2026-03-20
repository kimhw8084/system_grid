import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, Plus, ChevronRight, Activity, Zap } from 'lucide-react'

interface Device {
  id: number
  name: string
  status: 'active' | 'maintenance' | 'eol'
  size_u: number
  start_u: number
}

interface RackProps {
  name: string
  total_u: number
  devices: Device[]
}

const RackUnit = ({ uNumber, device, isBase }: { uNumber: number, device?: Device, isBase?: boolean }) => {
  return (
    <div 
      className={`relative border-b border-white/5 flex items-center px-2 transition-all duration-300 ${
        device ? 'bg-[#034EA2]/20 border-l-2 border-l-[#034EA2] group' : 'hover:bg-white/5'
      }`}
      style={{ height: '24px' }}
    >
      <span className="text-[9px] font-mono text-slate-600 w-3 select-none">{uNumber}</span>
      {isBase && device && (
        <div className="flex-1 flex items-center justify-between overflow-hidden">
          <span className="text-[10px] font-bold truncate ml-2 text-blue-100 uppercase tracking-tight">{device.name}</span>
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Info size={10} className="text-slate-400 cursor-help" />
          </div>
        </div>
      )}
    </div>
  )
}

export const RackElevation = ({ name, total_u, devices }: RackProps) => {
  const units = Array.from({ length: total_u }, (_, i) => total_u - i)
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel w-56 flex-shrink-0 rounded-xl overflow-hidden flex flex-col border-white/5 hover:border-[#034EA2]/20 transition-colors"
    >
      {/* Rack Header */}
      <div className="bg-slate-900/80 p-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">{name}</h4>
          <Activity size={12} className="text-emerald-500 animate-pulse" />
        </div>
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
          <div className="flex items-center space-x-1">
            <Zap size={10} className="text-amber-500" />
            <span>4.2 / 8.0 kW</span>
          </div>
          <span>{total_u}U</span>
        </div>
      </div>

      {/* Rack Interior */}
      <div className="flex-1 overflow-y-auto bg-slate-950/30 custom-scrollbar">
        {units.map((u) => {
          const device = devices.find(d => u >= d.start_u && u < d.start_u + d.size_u)
          const isBase = device?.start_u === u
          return <RackUnit key={u} uNumber={u} device={device} isBase={isBase} />
        })}
      </div>
      
      {/* Rack Footer */}
      <div className="p-2 bg-slate-900/50 border-t border-white/5 flex justify-center">
        <button className="text-[9px] uppercase font-bold tracking-widest text-slate-500 hover:text-blue-400 transition-colors flex items-center space-x-1">
          <span>Details</span>
          <ChevronRight size={10} />
        </button>
      </div>
    </motion.div>
  )
}

export default function Nexus2D() {
  const [activeSite, setActiveSite] = useState('SITE-NORTH')
  const sites = ['SITE-NORTH', 'SITE-SOUTH', 'SITE-WEST', 'EDGE-ALPHA']
  
  const mockRacks = [
    { name: 'RACK-01', total_u: 42, devices: [
      { id: 1, name: 'CORE-SW-01', status: 'active', size_u: 2, start_u: 40 },
      { id: 2, name: 'STORAGE-01', status: 'active', size_u: 4, start_u: 12 },
      { id: 3, name: 'MGMT-SVR-12', status: 'active', size_u: 1, start_u: 35 }
    ]},
    { name: 'RACK-02', total_u: 42, devices: [
      { id: 4, name: 'FIREWALL-P', status: 'active', size_u: 1, start_u: 42 },
      { id: 5, name: 'COMPUTE-NODE', status: 'maintenance', size_u: 2, start_u: 30 }
    ]},
    { name: 'RACK-03', total_u: 42, devices: [] },
    { name: 'RACK-04', total_u: 42, devices: [
      { id: 6, name: 'NET-CORE-B', status: 'active', size_u: 2, start_u: 40 }
    ]},
    { name: 'RACK-05', total_u: 42, devices: [] }
  ]

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Site Navigation Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 bg-slate-900/50 p-1 rounded-xl border border-white/5">
          {sites.map(site => (
            <button
              key={site}
              onClick={() => setActiveSite(site)}
              className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all duration-300 ${
                activeSite === site 
                  ? 'bg-[#034EA2] text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {site}
            </button>
          ))}
        </div>
        
        <button className="flex items-center space-x-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all">
          <Plus size={14} />
          <span>New Site</span>
        </button>
      </div>

      {/* Comparative Viewport */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-4">
        <div className="flex space-x-6 h-full min-w-max pr-12">
          {mockRacks.map(rack => (
            <RackElevation key={rack.name} {...rack} />
          ))}
          
          {/* Add Rack Placeholder */}
          <div className="w-56 flex-shrink-0 border-2 border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center space-y-3 hover:border-[#034EA2]/30 transition-all cursor-pointer group bg-slate-900/10">
            <div className="p-3 rounded-full bg-slate-900/50 border border-white/5 group-hover:scale-110 transition-transform">
              <Plus size={20} className="text-slate-500 group-hover:text-blue-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-300">Provision Rack</span>
          </div>
        </div>
      </div>
    </div>
  )
}
