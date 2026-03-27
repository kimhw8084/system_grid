import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, ServerCrash, Database, Share2, Layers, LayoutDashboard, Server, Network } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await fetch('/api/v1/dashboard/metrics')
      if (!res.ok) return {}
      return res.json()
    }
  })

  return (
    <div className="h-full flex flex-col justify-center items-center space-y-12 pr-4">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-black tracking-tighter uppercase italic">Dashboard</h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Real-time Infrastructure Intelligence</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl px-4">
        {/* Physical Infrastructure */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onClick={() => onNavigate('racks')}
          className="glass-panel p-8 rounded-[40px] border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group active:scale-[0.98] flex flex-col items-center min-h-[380px]"
        >
          <div className="p-4 bg-blue-500/10 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
            <MapPin size={32} className="text-blue-400" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Infrastructure Nodes</h3>
          
          <div className="grid grid-cols-2 gap-8 w-full mt-auto mb-auto">
            <div className="text-center space-y-1 border-r border-white/5">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Sites</p>
              <h2 className="text-4xl font-black text-white">{metrics?.sites || 0}</h2>
            </div>
            <div className="text-center space-y-1">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Racks</p>
              <h2 className="text-4xl font-black text-white">{metrics?.racks || 0}</h2>
            </div>
          </div>
          <div className="w-full h-px bg-white/5 mt-8" />
        </motion.div>

        {/* Asset Inventory Breakdown */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          onClick={() => onNavigate('assets')}
          className="glass-panel p-8 rounded-[40px] border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group active:scale-[0.98] flex flex-col items-center min-h-[380px]"
        >
          <div className="p-4 bg-emerald-500/10 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
            <Server size={32} className="text-emerald-400" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Asset Composition</h3>
          
          <div className="w-full grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-1 max-h-[200px]">
            {metrics?.asset_types && Object.entries(metrics.asset_types).length > 0 ? (
              Object.entries(metrics.asset_types).map(([type, count]: [string, any]) => (
                <div key={type} className="flex flex-col items-center justify-center bg-white/5 p-3 rounded-2xl border border-white/5 hover:bg-emerald-500/5 transition-colors group/item">
                  <span className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1 group-hover/item:text-emerald-400 transition-colors">{type}</span>
                  <span className="text-xl font-black text-white tabular-nums tracking-tighter">{count}</span>
                </div>
              ))
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center py-8 space-y-2 opacity-50">
                <ServerCrash size={20} className="text-slate-600" />
                <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">No assets discovered</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Application Layer */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          onClick={() => onNavigate('services')}
          className="glass-panel p-8 rounded-[40px] border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group active:scale-[0.98] flex flex-col items-center min-h-[380px]"
        >
          <div className="p-4 bg-purple-500/10 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
            <Layers size={32} className="text-purple-400" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Application Layer</h3>
          
          <div className="w-full grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-1 max-h-[200px]">
            {metrics?.service_types && Object.entries(metrics.service_types).length > 0 ? (
              Object.entries(metrics.service_types).map(([type, count]: [string, any]) => (
                <div key={type} className="flex flex-col items-center justify-center bg-white/5 p-3 rounded-2xl border border-white/5 hover:bg-purple-500/5 transition-colors group/item">
                  <span className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1 group-hover/item:text-purple-400 transition-colors">{type}</span>
                  <span className="text-xl font-black text-white tabular-nums tracking-tighter">{count}</span>
                </div>
              ))
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center py-8 space-y-2 opacity-50">
                <Database size={20} className="text-slate-600" />
                <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">No services found</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Network Fabric Breakdown */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          onClick={() => onNavigate('networks')}
          className="glass-panel p-8 rounded-[40px] border-white/5 hover:border-amber-500/30 transition-all cursor-pointer group active:scale-[0.98] flex flex-col items-center min-h-[380px]"
        >
          <div className="p-4 bg-amber-500/10 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
            <Network size={32} className="text-amber-400" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Network Interconnects</h3>
          
          <div className="w-full grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-1 max-h-[200px]">
            {metrics?.network_fabric && Object.entries(metrics.network_fabric).length > 0 ? (
              Object.entries(metrics.network_fabric).map(([purpose, count]: [string, any]) => (
                <div key={purpose} className="flex flex-col items-center justify-center bg-white/5 p-3 rounded-2xl border border-white/5 hover:bg-amber-500/5 transition-colors group/item">
                  <span className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1 group-hover/item:text-amber-400 transition-colors">{purpose}</span>
                  <span className="text-xl font-black text-white tabular-nums tracking-tighter">{count}</span>
                </div>
              ))
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center py-8 space-y-2 opacity-50">
                <Share2 size={20} className="text-slate-600" />
                <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">No links mapped</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
