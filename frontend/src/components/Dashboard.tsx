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

  const stats = [
    { label: 'Data Center Sites', value: metrics?.sites || 0, icon: MapPin, color: 'text-blue-400', bg: 'bg-blue-500/10', target: 'racks' },
    { label: 'Total Racks', value: metrics?.racks || 0, icon: ServerCrash, color: 'text-indigo-400', bg: 'bg-indigo-500/10', target: 'racks' },
    { label: 'Infrastructure Assets', value: (metrics?.physical_servers || 0) + (metrics?.virtual_servers || 0) + (metrics?.storage_arrays || 0) + (metrics?.switches || 0), icon: Server, color: 'text-emerald-400', bg: 'bg-emerald-500/10', target: 'assets' },
    { label: 'Logical Systems', value: metrics?.total_systems || 0, icon: LayoutDashboard, color: 'text-purple-400', bg: 'bg-purple-500/10', target: 'assets' }
  ]

  return (
    <div className="h-full flex flex-col justify-center items-center space-y-12 pr-4">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-black tracking-tighter uppercase italic text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">SYSGRID COMMAND</h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Real-time Infrastructure Intelligence</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 w-full max-w-4xl">
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onNavigate(stat.target)}
            className="glass-panel p-10 rounded-[40px] flex flex-col items-center justify-center border-white/5 hover:border-[#034EA2]/30 transition-all cursor-pointer group active:scale-95 shadow-lg hover:shadow-[#034EA2]/10"
          >
            <div className={`p-5 rounded-3xl mb-6 transition-transform group-hover:scale-110 ${stat.bg}`}>
              <stat.icon size={40} className={stat.color} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{stat.label}</p>
              <h2 className="text-6xl font-black text-white">{stat.value}</h2>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
