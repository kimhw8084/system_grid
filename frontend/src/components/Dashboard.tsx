import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  LayoutDashboard, Server, Network, Activity, 
  ArrowUpRight, Globe, Zap, Shield,
  Cpu, Box, Terminal, ListTree, HardDrive,
  AlertCircle, CheckCircle2, Clock, Info, ExternalLink,
  Workflow, History, TrendingUp, Search, AlertTriangle, BookOpen,
  Briefcase, ChevronRight, Share2, Layers, MapPin, ZapOff, Grid3X3
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { Link } from 'react-router-dom'

const StatCard = ({ title, total, metrics, icon: Icon, color, onClick, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    className="group relative h-full cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-black/20 p-6 backdrop-blur-xl transition-all hover:border-white/10 hover:bg-white/[0.03]"
    onClick={onClick}
  >
    <div className={`absolute -right-4 -top-4 h-24 w-24 bg-gradient-to-br ${color} opacity-[0.03] blur-2xl group-hover:opacity-[0.1] transition-opacity`} />
    
    <div className="flex items-start justify-between">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} bg-opacity-10 border border-white/5 shadow-inner transition-transform group-hover:scale-110`}>
        <Icon size={24} className="text-white" />
      </div>
      <div className="text-right">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
        <h2 className="text-4xl font-black text-white tracking-tighter tabular-nums mt-1">{total}</h2>
      </div>
    </div>

    <div className="mt-8 space-y-4">
      {metrics && Object.entries(metrics).slice(0, 3).map(([key, value]: any) => {
        const totalForType = Object.values(value).reduce((a: any, b: any) => a + (typeof b === 'number' ? b : 0), 0);
        return (
          <div key={key} className="flex flex-col space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
              <span className="text-slate-400 truncate pr-2">{key}</span>
              <span className="text-white">{totalForType}</span>
            </div>
            <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-white/5">
               {Object.entries(value).map(([status, count]: any) => (
                  <div 
                    key={status} 
                    title={`${status}: ${count}`}
                    className={`h-full transition-all duration-500 ${
                      status === 'Active' || status === 'Operational' || status === 'Existing' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                      status === 'Critical' || status === 'Down' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' :
                      status === 'Maintenance' || status === 'Warning' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${(count / totalForType) * 100}%` }}
                  />
               ))}
            </div>
          </div>
        )
      })}
    </div>
  </motion.div>
)

const RecentListCard = ({ title, items = [], icon: Icon, color, path, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="flex flex-col h-full rounded-2xl border border-white/5 bg-black/20 p-6 backdrop-blur-xl hover:border-white/10 transition-all group"
  >
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${color} bg-opacity-10 text-white`}>
          <Icon size={16} />
        </div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">{title}</h3>
      </div>
      <Link to={path} className="p-1.5 rounded-md hover:bg-white/5 text-slate-500 hover:text-white transition-all">
        <ExternalLink size={14} />
      </Link>
    </div>

    <div className="flex-1 space-y-3">
      {items && items.length > 0 ? items.map((item: any, idx: number) => (
        <Link 
          key={item.id || idx} 
          to={`${path}?id=${item.id}`}
          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all group/item"
        >
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-black text-slate-200 uppercase tracking-tight truncate group-hover/item:text-blue-400 transition-colors">{item.title}</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5 italic">{new Date(item.created_at || item.updated_at).toLocaleDateString()}</span>
          </div>
          <ChevronRight size={12} className="text-slate-700 group-hover/item:translate-x-1 transition-transform" />
        </Link>
      )) : (
        <div className="flex flex-col items-center justify-center h-full opacity-20 py-8">
           <ZapOff size={24} />
           <span className="text-[8px] font-black uppercase tracking-widest mt-2">Zero Signals</span>
        </div>
      )}
    </div>
  </motion.div>
)

const ProjectSection = ({ title, projects = [], color, delay }: any) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
       <div className={`w-1 h-3 rounded-full bg-gradient-to-b ${color}`} />
       <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{title}</h4>
    </div>
    <div className="space-y-2">
      {projects && projects.length > 0 ? projects.map((p: any) => (
        <Link key={p.id} to={`/projects?id=${p.id}`} className="block p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all group/item">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-200 uppercase truncate group-hover/item:text-blue-400">{p.title}</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase italic shrink-0">{new Date(p.updated_at).toLocaleDateString()}</span>
          </div>
        </Link>
      )) : (
        <div className="p-3 rounded-xl bg-white/[0.01] border border-dashed border-white/5 text-center">
           <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">No Projects</span>
        </div>
      )}
    </div>
  </div>
)

export default function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { data: metrics, isLoading } = useQuery({ 
    queryKey: ['dashboard-metrics'], 
    queryFn: async () => (await apiFetch('/api/v1/dashboard/metrics')).json(),
    refetchInterval: 30000
  })

  if (isLoading) return (
    <div className="h-full w-full flex items-center justify-center bg-[var(--bg-primary)]">
       <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-[100px] animate-pulse rounded-full" />
          <div className="flex flex-col items-center gap-6 relative z-10">
             <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(37,99,235,0.3)]" />
             <div className="flex flex-col items-center">
                <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white animate-pulse">Initializing Matrix</h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-2">Sector-01 Data Orchestrator</p>
             </div>
          </div>
       </div>
    </div>
  )

  return (
    <div className="h-full w-full flex flex-col space-y-6 overflow-hidden pr-2">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
           <div className="relative group">
              <div className="absolute inset-0 bg-blue-600/30 blur-2xl rounded-full group-hover:bg-blue-600/50 transition-colors" />
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl relative z-10">
                 <Grid3X3 size={28} className="text-white" />
              </div>
           </div>
           <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none">Command <span className="text-blue-500">Center</span></h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] font-black mt-1">Holistic Infrastructure Orchestration & Intelligence</p>
           </div>
        </div>
        
        <div className="flex items-center gap-8 bg-black/30 px-8 py-4 rounded-3xl border border-white/5 backdrop-blur-xl">
           <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Nodes</span>
              <span className="text-xl font-black text-white tabular-nums">{metrics?.asset_overview.total || 0}</span>
           </div>
           <div className="w-px h-8 bg-white/10" />
           <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Services</span>
              <span className="text-xl font-black text-blue-400 tabular-nums">{metrics?.service_overview.total || 0}</span>
           </div>
           <div className="w-px h-8 bg-white/10" />
           <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network Links</span>
              <span className="text-xl font-black text-emerald-400 tabular-nums">{metrics?.network_overview.total || 0}</span>
           </div>
        </div>
      </div>

      {/* Main Grid Scrollable Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10 space-y-8">
        
        {/* Top Level: Stat Breakdown Grids */}
        <div className="grid grid-cols-4 gap-6">
           <StatCard 
              title="Asset Registry" 
              total={metrics?.asset_overview.total} 
              metrics={metrics?.asset_overview.breakdown}
              icon={Server} 
              color="from-blue-600 to-indigo-700"
              onClick={() => onNavigate('asset')}
              delay={0.1}
           />
           <StatCard 
              title="Service Mesh" 
              total={metrics?.service_overview.total} 
              metrics={metrics?.service_overview.breakdown}
              icon={Layers} 
              color="from-purple-600 to-fuchsia-700"
              onClick={() => onNavigate('services')}
              delay={0.2}
           />
           <StatCard 
              title="Network Fabric" 
              total={metrics?.network_overview.total} 
              metrics={metrics?.network_overview.breakdown}
              icon={Network} 
              color="from-amber-600 to-orange-700"
              onClick={() => onNavigate('network')}
              delay={0.3}
           />
           <div className="grid grid-rows-2 gap-4">
              <div className="glass-panel p-6 rounded-2xl border-white/5 bg-gradient-to-br from-emerald-600/10 to-transparent flex items-center justify-between group hover:border-emerald-500/20 transition-all cursor-pointer" onClick={() => onNavigate('racks')}>
                 <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global Racks</p>
                    <h3 className="text-3xl font-black text-white italic tracking-tighter tabular-nums">{metrics?.rack_overview.total_racks}</h3>
                 </div>
                 <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                    <Box size={20} />
                 </div>
              </div>
              <div className="glass-panel p-6 rounded-2xl border-white/5 bg-gradient-to-br from-rose-600/10 to-transparent flex items-center justify-between group hover:border-rose-500/20 transition-all cursor-pointer" onClick={() => onNavigate('monitoring')}>
                 <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Monitors</p>
                    <h3 className="text-3xl font-black text-white italic tracking-tighter tabular-nums">{metrics?.monitoring_overview.total}</h3>
                 </div>
                 <div className="w-10 h-10 rounded-lg bg-rose-600/20 flex items-center justify-center text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
                    <Activity size={20} />
                 </div>
              </div>
           </div>
        </div>

        {/* Second Level: Mid-Sized Detail Cards */}
        <div className="grid grid-cols-3 gap-6">
           <div className="glass-panel p-8 rounded-3xl border-white/5 bg-gradient-to-br from-indigo-600/5 to-transparent flex flex-col justify-between group">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                       <ExternalLink size={20} />
                    </div>
                    <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-white italic">External Entites</h3>
                 </div>
                 <span className="text-4xl font-black text-white tabular-nums opacity-40 group-hover:opacity-100 transition-opacity">{metrics?.external_overview.total}</span>
              </div>
              <div className="space-y-4">
                 {Object.entries(metrics?.external_overview.breakdown || {}).slice(0, 3).map(([type, stats]: any) => (
                    <div key={type} className="space-y-1">
                       <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                          <span className="text-slate-500">{type}</span>
                          <span className="text-slate-300">{Object.values(stats).reduce((a:any, b:any) => a + b, 0)}</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${(Object.values(stats).reduce((a:any, b:any) => a + b, 0) / metrics?.external_overview.total) * 100}%` }}
                             className="h-full bg-indigo-500"
                          />
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="glass-panel p-8 rounded-3xl border-white/5 bg-gradient-to-br from-emerald-600/5 to-transparent flex flex-col justify-between group">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                       <Activity size={20} />
                    </div>
                    <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-white italic">Monitoring Platforms</h3>
                 </div>
                 <span className="text-4xl font-black text-white tabular-nums opacity-40 group-hover:opacity-100 transition-opacity">{metrics?.monitoring_overview.total}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                 {Object.entries(metrics?.monitoring_overview.breakdown || {}).map(([platform, stats]: any) => (
                    <div key={platform} className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{platform}</span>
                       <span className="text-sm font-black text-white italic">{Object.values(stats).reduce((a:any, b:any) => a + b, 0)}</span>
                    </div>
                 ))}
              </div>
           </div>

           <div className="glass-panel p-8 rounded-3xl border-white/5 bg-gradient-to-br from-blue-600/5 to-transparent flex flex-col justify-between group">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-white italic">Infrastructure Pulse</h3>
                 <Shield size={18} className="text-blue-500 animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Regional Sites</p>
                    <p className="text-2xl font-black text-white">{metrics?.rack_overview.total_sites}</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Racked Assets</p>
                    <p className="text-2xl font-black text-emerald-400">{metrics?.rack_overview.total_racked_assets}</p>
                 </div>
                 <div className="col-span-2 p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-between">
                    <div>
                       <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Global Stability</p>
                       <p className="text-xl font-black text-white tracking-tighter mt-1 italic">99.98% NOMINAL</p>
                    </div>
                    <TrendingUp size={24} className="text-blue-400 opacity-30" />
                 </div>
              </div>
           </div>
        </div>

        {/* Third Level: Recent Feed Grid */}
        <div className="grid grid-cols-5 gap-6 h-[400px]">
           <RecentListCard title="Research" items={metrics?.recent.research} icon={Search} color="from-blue-500 to-indigo-600" path="/research" delay={0.4} />
           <RecentListCard title="Failure Modes" items={metrics?.recent.far} icon={AlertTriangle} color="from-rose-500 to-pink-600" path="/far" delay={0.5} />
           <RecentListCard title="Knowledge" items={metrics?.recent.knowledge} icon={BookOpen} color="from-amber-500 to-orange-600" path="/knowledge" delay={0.6} />
           <RecentListCard title="Architecture" items={metrics?.recent.architecture} icon={Workflow} color="from-purple-500 to-fuchsia-600" path="/architecture" delay={0.7} />
           
           <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col h-full rounded-2xl border border-white/5 bg-black/20 p-6 backdrop-blur-xl hover:border-white/10 transition-all group overflow-hidden relative"
           >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-bl-full blur-3xl" />
              <div className="flex items-center justify-between mb-6 relative z-10">
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/20">
                       <Briefcase size={16} />
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Project Pipeline</h3>
                 </div>
                 <Link to="/projects" className="p-1.5 rounded-md hover:bg-white/5 text-slate-500 hover:text-white transition-all"><ExternalLink size={14} /></Link>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar relative z-10">
                 <ProjectSection title="In Progress" projects={metrics?.recent.projects.in_progress} color="from-blue-500 to-blue-600" />
                 <ProjectSection title="Completed" projects={metrics?.recent.projects.completed} color="from-emerald-500 to-emerald-600" />
              </div>
           </motion.div>
        </div>

      </div>
    </div>
  )
}
