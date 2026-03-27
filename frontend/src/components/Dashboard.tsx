import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, ServerCrash, Database, Share2, Layers, LayoutDashboard, Server } from 'lucide-react'
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl px-4">
        {/* Physical Infrastructure */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onClick={() => onNavigate('racks')}
          className="glass-panel p-8 rounded-[40px] border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group active:scale-[0.98] flex flex-col items-center"
        >
          <div className="p-4 bg-blue-500/10 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
            <MapPin size={32} className="text-blue-400" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Infrastructure Nodes</h3>
          
          <div className="grid grid-cols-2 gap-8 w-full">
            <div className="text-center space-y-1 border-r border-white/5">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Sites</p>
              <h2 className="text-4xl font-black text-white">{metrics?.sites || 0}</h2>
            </div>
            <div className="text-center space-y-1">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Racks</p>
              <h2 className="text-4xl font-black text-white">{metrics?.racks || 0}</h2>
            </div>
          </div>
        </motion.div>

        {/* Asset Inventory Breakdown */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          onClick={() => onNavigate('assets')}
          className="glass-panel p-8 rounded-[40px] border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group active:scale-[0.98] flex flex-col items-center h-full"
        >
          <div className="p-4 bg-emerald-500/10 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
            <Server size={32} className="text-emerald-400" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Asset Composition</h3>
          
          <div className="w-full space-y-3 flex-1 flex flex-col justify-center">
            {metrics?.asset_types && Object.entries(metrics.asset_types).length > 0 ? (
              Object.entries(metrics.asset_types).map(([type, count]: [string, any]) => (
                <div key={type} className="flex justify-between items-center bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{type}</span>
                  <span className="text-lg font-black text-emerald-400 tabular-nums">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-slate-600 font-bold uppercase italic text-center py-4">No assets registered</p>
            )}
          </div>
        </motion.div>

        {/* Logical Layer */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          onClick={() => onNavigate('services')}
          className="glass-panel p-8 rounded-[40px] border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group active:scale-[0.98] flex flex-col items-center"
        >
          <div className="p-4 bg-purple-500/10 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
            <Layers size={32} className="text-purple-400" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Application Layer</h3>
          
          <div className="grid grid-cols-2 gap-8 w-full">
            <div className="text-center space-y-1 border-r border-white/5">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Services</p>
              <h2 className="text-4xl font-black text-white">{metrics?.services || 0}</h2>
            </div>
            <div className="text-center space-y-1">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Systems</p>
              <h2 className="text-4xl font-black text-white">{metrics?.total_systems || 0}</h2>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
