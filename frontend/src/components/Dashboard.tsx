import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, ServerCrash, Server, Database, Share2, Layers, LayoutDashboard } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Dashboard() {
  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await fetch('/api/v1/dashboard/metrics')
      if (!res.ok) return {}
      return res.json()
    }
  })

  const stats = [
    { label: 'Data Center Sites', value: metrics?.sites || 0, icon: MapPin, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Total Racks', value: metrics?.racks || 0, icon: ServerCrash, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Physical Servers', value: metrics?.physical_servers || 0, icon: Server, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Virtual Servers', value: metrics?.virtual_servers || 0, icon: Layers, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { label: 'Storage Arrays', value: metrics?.storage_arrays || 0, icon: Database, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Network Switches', value: metrics?.switches || 0, icon: Share2, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { label: 'Logical Systems', value: metrics?.total_systems || 0, icon: LayoutDashboard, color: 'text-purple-400', bg: 'bg-purple-500/10' }
  ]

  return (
    <div className="h-full flex flex-col space-y-8 overflow-y-auto custom-scrollbar pr-4">
      <div>
        <h1 className="text-3xl font-black tracking-tighter">Ownership & Global Status</h1>
        <p className="text-slate-400 text-sm mt-2 uppercase tracking-[0.1em] font-bold">Consolidated operational metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel p-6 rounded-2xl flex flex-col justify-between border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon size={24} className={stat.color} />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{stat.label}</p>
              <h2 className="text-4xl font-black mt-1">{stat.value}</h2>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
