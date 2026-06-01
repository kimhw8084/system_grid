import React, { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  LayoutDashboard, Server, Network, Activity, 
  ArrowUpRight, Globe, Zap, Shield,
  Cpu, Box, Terminal, ListTree, HardDrive,
  AlertCircle, CheckCircle2, Clock, Info, ExternalLink,
  Workflow, History, TrendingUp, Search, AlertTriangle, BookOpen,
  Briefcase, ChevronRight, Share2, Layers, MapPin, ZapOff, Grid3X3, Target
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { useNavigate, Link } from 'react-router-dom'
import { FEATURE_AUDIT_ITEMS } from './shared/featureAudit'

const StatCard = ({ title, total, metrics, icon: Icon, color, onClick, delay = 0 }: any) => {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="group relative h-full cursor-pointer overflow-hidden rounded-lg border border-white/5 bg-black/20 p-6 backdrop-blur-xl transition-all hover:border-white/10 hover:bg-white/[0.03]"
      onClick={onClick}
    >
      <div className={`absolute -right-4 -top-4 h-24 w-24 bg-gradient-to-br ${color} opacity-[0.03] blur-2xl group-hover:opacity-[0.1] transition-opacity`} />
      
      <div className="flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${color} bg-opacity-10 border border-white/5 shadow-inner transition-transform group-hover:scale-110`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
          <h2 className="text-4xl font-black text-white tracking-tighter tabular-nums mt-1">{total}</h2>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {metrics && Object.entries(metrics).slice(0, 3).map(([key, value]: any) => {
          const totalForType = Object.values(value).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);
          return (
            <div key={key} className="flex flex-col space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
                <span className="text-slate-400 truncate pr-2">{key}</span>
                <span className="text-white">{(totalForType as number)}</span>
              </div>
              <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-white/5">
                 {Object.entries(value).map(([status, count]: any) => (
                    <div 
                      key={status} 
                      title={`${status}: ${count}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const moduleMap: any = { 'Asset Registry': 'asset', 'Service Mesh': 'services', 'Network Fabric': 'network' };
                        const path = moduleMap[title];
                        if (path) navigate(`/${path}?status=${status}`);
                      }}
                      className={`h-full transition-all duration-300 cursor-pointer hover:brightness-125 ${
                        status === 'Active' || status === 'Operational' || status === 'Existing' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                        status === 'Critical' || status === 'Down' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' :
                        status === 'Maintenance' || status === 'Warning' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${((count as number) / (totalForType as number)) * 100}%` }}
                    />
                 ))}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

const SiteClock = ({ site, delay }: any) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="px-4 py-2 bg-white/[0.03] border border-white/5 rounded-lg flex items-center justify-between group hover:border-blue-500/20 transition-all"
    >
      <div className="flex flex-col">
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{site.name}</span>
        <span className="text-[10px] font-bold text-slate-300 uppercase truncate max-w-[80px]">Local Time</span>
      </div>
      <div className="text-right">
        <span className="text-sm font-black text-white tabular-nums group-hover:text-blue-400 transition-colors">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </span>
      </div>
    </motion.div>
  )
}

const RecentListCard = ({ title, items = [], icon: Icon, color, path, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="flex flex-col h-full rounded-lg border border-white/5 bg-black/20 p-6 backdrop-blur-xl hover:border-white/10 transition-all group"
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
          className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all group/item"
        >
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-black text-slate-200 uppercase tracking-tight truncate group-hover/item:text-blue-400 transition-colors">{item.title}</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{new Date(item.created_at || item.updated_at).toLocaleDateString()}</span>
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
        <Link key={p.id} to={`/projects?id=${p.id}`} className="block p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all group/item">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-200 uppercase truncate group-hover/item:text-blue-400">{p.title}</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase shrink-0">{new Date(p.updated_at).toLocaleDateString()}</span>
          </div>
        </Link>
      )) : (
        <div className="p-3 rounded-lg bg-white/[0.01] border border-dashed border-white/5 text-center">
           <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">No Projects</span>
        </div>
      )}
    </div>
  </div>
)

const FeatureAuditSummary = () => {
  const [validatedCount, setValidatedCount] = useState(0)

  useEffect(() => {
    const readCount = () => {
      try {
        const raw = localStorage.getItem('sysgrid_feature_audit_v2')
        if (!raw) return setValidatedCount(0)
        const parsed = JSON.parse(raw)
        const validated = Object.values(parsed).filter((entry: any) => entry?.status === 'validated').length
        setValidatedCount(validated)
      } catch {
        setValidatedCount(0)
      }
    }

    readCount()
    window.addEventListener('storage', readCount)
    return () => window.removeEventListener('storage', readCount)
  }, [])

  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Feature Audit</span>
      <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-blue-400">
        {validatedCount}/{FEATURE_AUDIT_ITEMS.length} validated
      </span>
    </div>
  )
}


export default function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = useState('');
  
  const { data: metrics, isLoading } = useQuery({ 
    queryKey: ['dashboard-metrics'], 
    queryFn: async () => (await apiFetch('/api/v1/dashboard/metrics')).json(),
    refetchInterval: 10000
  })

  const { data: userProfile } = useQuery({
    queryKey: ['dashboard-user-profile'],
    queryFn: async () => (await apiFetch('/api/v1/settings/user/profile')).json()
  })

  if (isLoading) return (
    <div className="h-full w-full flex items-center justify-center bg-[var(--bg-primary)]">
       <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-[100px] animate-pulse rounded-full" />
          <div className="flex flex-col items-center gap-6 relative z-10">
             <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(37,99,235,0.3)]" />
             <div className="flex flex-col items-center">
                <h1 className="text-2xl font-black uppercase tracking-tighter text-white animate-pulse">Initializing Matrix</h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-2">Sector-01 Data Orchestrator</p>
             </div>
          </div>
       </div>
    </div>
  )

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch) return;
    const term = globalSearch.toUpperCase();
    if (term.startsWith('FAR')) navigate(`/far?id=${term.replace('FAR-', '')}`);
    else if (term.startsWith('PROJ')) navigate(`/projects?search=${term}`);
    else navigate(`/asset?search=${term}`);
  };

  return (
    <div className="h-full w-full flex flex-col space-y-6 overflow-hidden pr-2">
      {/* Global Alert Banner */}
      <AnimatePresence>
        {metrics?.critical_alerts?.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="bg-rose-600 text-white px-6 py-3 rounded-lg flex items-center justify-between shadow-xl shadow-rose-600/20 border border-rose-500/50 mb-2">
              <div className="flex items-center gap-4">
                 <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center animate-pulse">
                    <AlertTriangle size={18} />
                 </div>
                 <div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Critical Infrastructure Alert</span>
                    <p className="text-[11px] font-bold tracking-tight opacity-90">{metrics.critical_alerts[0].title} — {metrics.critical_alerts[0].impact}</p>
                 </div>
              </div>
              <button onClick={() => navigate(`/monitoring?id=${metrics.critical_alerts[0].id}`)} className="px-4 py-1.5 bg-black/20 hover:bg-black/40 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Intercept Incident</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
           <div className="relative group">
              <div className="absolute inset-0 bg-blue-600/30 blur-2xl rounded-full group-hover:bg-blue-600/50 transition-colors" />
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center border border-white/20 shadow-2xl relative z-10">
                 <Grid3X3 size={28} className="text-white" />
              </div>
           </div>
           <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">Command <span className="text-blue-500">Center</span></h1>
              <div className="flex items-center gap-3 mt-1">
                 <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] font-black">Holistic Infrastructure Orchestration</p>
                 <div className="h-1 w-1 rounded-full bg-slate-700" />
                 <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Stability Index:</span>
                    <span className="text-[9px] font-black text-white tabular-nums tracking-widest">{metrics?.stability_score}%</span>
                 </div>
              </div>
           </div>
        </div>
        
        <form onSubmit={handleGlobalSearch} className="flex-1 max-w-md mx-8">
           <div className="relative group">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
              <input 
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                placeholder="GLOBAL ID SEARCH (ASSET, PROJ, FAR)..."
                className="w-full bg-black/40 border border-white/5 rounded-lg pl-12 pr-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-blue-500/50 focus:bg-white/[0.03] transition-all"
              />
           </div>
        </form>

        <div className="flex items-center gap-8 bg-black/30 px-8 py-4 rounded-lg border border-white/5 backdrop-blur-xl">
           <Link to="/asset" className="flex flex-col items-center hover:opacity-70 transition-opacity">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Nodes</span>
              <span className="text-xl font-black text-white tabular-nums">{metrics?.asset_overview.total || 0}</span>
           </Link>
           <div className="w-px h-8 bg-white/10" />
           <Link to="/services" className="flex flex-col items-center hover:opacity-70 transition-opacity">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Services</span>
              <span className="text-xl font-black text-blue-400 tabular-nums">{metrics?.service_overview.total || 0}</span>
           </Link>
           <div className="w-px h-8 bg-white/10" />
           <Link to="/network" className="flex flex-col items-center hover:opacity-70 transition-opacity">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network Links</span>
              <span className="text-xl font-black text-emerald-400 tabular-nums">{metrics?.network_overview.total || 0}</span>
           </Link>
        </div>
      </div>

      {/* Main Grid Scrollable Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10 space-y-8">
        
        {/* Top Level: Stat Breakdown Grids */}
        <div className="grid grid-cols-5 gap-6">
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
              <div className="glass-panel p-6 rounded-lg border-white/5 bg-gradient-to-br from-emerald-600/10 to-transparent flex items-center justify-between group hover:border-emerald-500/20 transition-all cursor-pointer" onClick={() => onNavigate('racks')}>
                 <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global Racks</p>
                    <h3 className="text-3xl font-black text-white tracking-tighter tabular-nums">{metrics?.rack_overview.total_racks}</h3>
                 </div>
                 <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                    <Box size={20} />
                 </div>
              </div>
              <div className="glass-panel p-6 rounded-lg border-white/5 bg-gradient-to-br from-rose-600/10 to-transparent flex items-center justify-between group hover:border-rose-500/20 transition-all cursor-pointer" onClick={() => onNavigate('monitoring')}>
                 <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Monitors</p>
                    <h3 className="text-3xl font-black text-white tracking-tighter tabular-nums">{metrics?.monitoring_overview.total}</h3>
                 </div>
                 <div className="w-10 h-10 rounded-lg bg-rose-600/20 flex items-center justify-center text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
                    <Activity size={20} />
                 </div>
              </div>
           </div>
        </div>

        {/* Second Level: Mid-Sized Detail Cards */}
        <div className="grid grid-cols-4 gap-6">
           <div className="glass-panel p-6 rounded-lg border-white/5 bg-gradient-to-br from-blue-600/10 to-transparent flex flex-col group h-[280px]">
              <div className="flex items-center justify-between mb-5">
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400">
                      {userProfile?.is_admin ? 'Leadership Cockpit' : 'Operator Cockpit'}
                    </p>
                    <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-white">
                      {userProfile?.full_name || userProfile?.username || 'Operator'}
                    </h3>
                    <FeatureAuditSummary />
                 </div>
                 <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
                    <Target size={18} />
                 </div>
              </div>

              <div className="space-y-3">
                 <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Critical Monitors</p>
                    <p className="mt-1 text-2xl font-black text-rose-400 tabular-nums">{metrics?.critical_alerts?.length || 0}</p>
                 </div>
                 <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Recent Audit Events</p>
                    <p className="mt-1 text-2xl font-black text-white tabular-nums">{metrics?.recent.activity?.length || 0}</p>
                 </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                 <button onClick={() => navigate('/monitoring')} className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-blue-400 transition-all hover:bg-blue-500/20">
                    Validate Monitoring
                 </button>
                 <button onClick={() => navigate('/logs')} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-white/[0.08]">
                    Review Changes
                 </button>
                 <button onClick={() => navigate('/settings')} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-white/[0.08]">
                    Confirm Theme
                 </button>
                 <button onClick={() => navigate('/asset')} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-white/[0.08]">
                    Inspect Assets
                 </button>
              </div>
           </div>

           {/* Activity Feed */}
           <div className="glass-panel p-6 rounded-lg border-white/5 bg-black/20 flex flex-col group h-[280px]">
              <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/20">
                       <History size={16} />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Activity Stream</h3>
                 </div>
                 <Link to="/logs" className="p-1.5 rounded-md hover:bg-white/5 text-slate-500 hover:text-white transition-all"><ExternalLink size={12}/></Link>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1">
                 {metrics?.recent.activity?.map((log: any) => (
                    <div key={log.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all">
                       <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] font-black text-blue-400 uppercase">{log.user}</span>
                          <span className="text-[7px] font-bold text-slate-600 uppercase">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                       <p className="text-[9px] font-bold text-slate-300 leading-tight truncate uppercase">{log.description || `${log.action} ${log.target}`}</p>
                    </div>
                 ))}
                 {(!metrics?.recent.activity || metrics?.recent.activity.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-full opacity-20">
                       <ZapOff size={24} />
                       <span className="text-[8px] font-black uppercase tracking-widest mt-2">Zero Signals</span>
                    </div>
                 )}
              </div>
           </div>

           {/* Quick Actions */}
           <div className="glass-panel p-6 rounded-lg border-white/5 bg-black/20 flex flex-col group h-[280px]">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/20">
                    <Zap size={16} />
                 </div>
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Quick Vectors</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 {[
                   { label: 'Asset', icon: Server, path: '/asset' },
                   { label: 'Project', icon: Briefcase, path: '/projects' },
                   { label: 'Monitor', icon: Activity, path: '/monitoring' },
                   { label: 'Knowledge', icon: BookOpen, path: '/knowledge' },
                   { label: 'Failure', icon: AlertTriangle, path: '/far' },
                   { label: 'Research', icon: Search, path: '/research' }
                 ].map((act, i) => (
                    <button 
                      key={i} 
                      onClick={() => navigate(act.path)}
                      className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group/btn"
                    >
                       <act.icon size={16} className="text-slate-500 group-hover/btn:text-blue-400 transition-colors" />
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest group-hover/btn:text-white transition-colors">{act.label}</span>
                    </button>
                 ))}
              </div>
           </div>

           {/* Site Clocks */}
           <div className="glass-panel p-6 rounded-lg border-white/5 bg-black/20 flex flex-col group h-[280px]">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/20">
                    <Globe size={16} />
                 </div>
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Regional Clocks</h3>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1">
                 {metrics?.rack_overview.sites?.map((site: any, i: number) => (
                    <SiteClock key={site.id} site={site} delay={i * 0.1} />
                 ))}
                 {(!metrics?.rack_overview.sites || metrics?.rack_overview.sites.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-full opacity-20">
                       <MapPin size={24} />
                       <span className="text-[8px] font-black uppercase tracking-widest mt-2">No Regional Data</span>
                    </div>
                 )}
              </div>
           </div>

           {/* Performance/Stability Card */}
           <div className="glass-panel p-6 rounded-lg border-white/5 bg-gradient-to-br from-blue-600/5 to-transparent flex flex-col group h-[280px]">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Stability Metric</h3>
                 <Shield size={16} className="text-blue-500 animate-pulse" />
              </div>
              <div className="flex-1 flex flex-col justify-center items-center relative">
                 <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <div className="w-40 h-40 border-8 border-blue-500 rounded-full animate-ping" />
                 </div>
                 <h2 className="text-5xl font-black text-white tracking-tighter tabular-nums z-10">{metrics?.stability_score}%</h2>
                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-2 z-10">Nominal State</p>
                 
                 <div className="w-full h-12 bg-white/5 mt-8 rounded-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-500/20" style={{ clipPath: 'polygon(0% 80%, 10% 70%, 20% 85%, 30% 60%, 40% 65%, 50% 40%, 60% 55%, 70% 30%, 80% 45%, 90% 20%, 100% 15%, 100% 100%, 0% 100%)' }} />
                    <div className="absolute inset-0 border-b-2 border-blue-500/50" style={{ clipPath: 'polygon(0% 80%, 10% 70%, 20% 85%, 30% 60%, 40% 65%, 50% 40%, 60% 55%, 70% 30%, 80% 45%, 90% 20%, 100% 15%)' }} />
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
              className="flex flex-col h-full rounded-lg border border-white/5 bg-black/20 p-6 backdrop-blur-xl hover:border-white/10 transition-all group overflow-hidden relative"
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
