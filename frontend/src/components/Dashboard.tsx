import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  MapPin, ServerCrash, Database, Share2, Layers, 
  LayoutDashboard, Server, Network, Activity, 
  ChevronRight, ArrowUpRight, Globe, Zap, Shield,
  Cpu, Box, Terminal, ListTree, HardDrive, Filter,
  AlertCircle, CheckCircle2, Clock, Info, ExternalLink,
  Lock, Key, Wifi, Cpu as CpuIcon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from 'ag-grid-react'
import { apiFetch } from '../api/apiClient'

const TABS = [
  { id: 'home', label: 'Command Home', icon: LayoutDashboard },
  { id: 'compute', label: 'Compute Core', icon: Cpu },
  { id: 'network', label: 'Network Fabric', icon: Network },
  { id: 'storage', label: 'Storage Hub', icon: HardDrive },
  { id: 'security', label: 'Security DMZ', icon: Shield },
  { id: 'health', label: 'Health Matrix', icon: Activity },
]

const BentoCard = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  color, 
  total, 
  breakdown, 
  onClick, 
  delay = 0 
}: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      onClick={onClick}
      className="relative group cursor-pointer h-full"
    >
      <div className={`absolute -inset-0.5 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 rounded-[40px] blur-xl transition-all duration-500`} />
      
      <div className="relative h-full glass-panel p-8 rounded-[40px] border-white/5 group-hover:border-white/10 group-hover:bg-white/[0.03] transition-all duration-500 flex flex-col">
        <div className="flex items-start justify-between mb-8">
          <div className={`p-4 rounded-2xl bg-gradient-to-br ${color} bg-opacity-10 shadow-inner border border-white/5 group-hover:scale-110 transition-transform duration-500`}>
            <Icon size={24} className="text-white" />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{subtitle}</span>
            <div className="flex items-baseline space-x-1">
              <h2 className="text-5xl font-black text-white tracking-tighter tabular-nums">{total}</h2>
              <ArrowUpRight size={14} className="text-slate-600 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </div>
        </div>

        <h3 className="text-sm font-black text-white uppercase tracking-tight mb-6 flex items-center">
          {title}
          <div className="ml-3 h-px flex-1 bg-white/5 group-hover:bg-white/10 transition-colors" />
        </h3>

        <div className="space-y-3 mt-auto">
          {breakdown && Object.entries(breakdown).slice(0, 4).map(([key, value]: any) => (
            <div key={key} className="flex items-center justify-between group/item">
              <div className="flex items-center space-x-2">
                <div className={`w-1 h-1 rounded-full ${color.split(' ')[1].replace('to-', 'bg-')}`} />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter group-hover/item:text-slate-200 transition-colors">{key}</span>
              </div>
              <span className="text-[11px] font-black text-slate-500 group-hover/item:text-white transition-colors tabular-nums">
                {value}
              </span>
            </div>
          ))}
          {(!breakdown || Object.keys(breakdown).length === 0) && (
            <p className="text-[9px] font-bold text-slate-600 uppercase italic tracking-widest text-center py-4">Registry Empty</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const InfoRow = ({ label, value, color = "text-white" }: any) => (
  <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{label}</span>
    <span className={`text-[11px] font-black uppercase tracking-tight ${color}`}>{value}</span>
  </div>
)

const MetricTile = ({ label, value, sub, icon: Icon, color }: any) => (
  <div className="glass-panel p-6 rounded-3xl border-white/5 hover:border-white/10 transition-all group">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <h4 className="text-2xl font-black text-white tracking-tighter tabular-nums">{value}</h4>
        {sub && <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">{sub}</p>}
      </div>
      <div className={`p-2 rounded-xl bg-gradient-to-br ${color} bg-opacity-10 border border-white/5 group-hover:scale-110 transition-transform`}>
        <Icon size={16} className="text-white" />
      </div>
    </div>
  </div>
)

export default function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [activeTab, setActiveTab] = useState('home')

  const { data: metrics, isLoading: isMetricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => (await apiFetch('/api/v1/dashboard/metrics')).json()
  })

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json()
  })

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await apiFetch('/api/v1/port-connections/')).json()
  })

  const { data: incidents } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => (await apiFetch('/api/v1/incident-logs/')).json()
  })

  const { data: subnets } = useQuery({
    queryKey: ['subnets'],
    queryFn: async () => (await apiFetch('/api/v1/subnets/')).json()
  })

  const { data: firewallRules } = useQuery({
    queryKey: ['firewall-rules'],
    queryFn: async () => (await apiFetch('/api/v1/firewall-rules/')).json()
  })

  const computeData = useMemo(() => {
    if (!devices) return null
    const physical = devices.filter((d: any) => d.type === 'Physical')
    const virtual = devices.filter((d: any) => d.type === 'Virtual')
    const osBreakdown = devices.reduce((acc: any, d: any) => {
      acc[d.os_name || 'Unknown'] = (acc[d.os_name || 'Unknown'] || 0) + 1
      return acc
    }, {})
    return { physical: physical.length, virtual: virtual.length, osBreakdown }
  }, [devices])

  const networkData = useMemo(() => {
    if (!connections || !subnets) return null
    return {
      totalConns: connections.length,
      totalSubnets: subnets.length,
      linkTypes: connections.reduce((acc: any, c: any) => {
        acc[c.link_type || 'Data'] = (acc[acc.link_type || 'Data'] || 0) + 1
        return acc
      }, {})
    }
  }, [connections, subnets])

  const storageData = useMemo(() => {
    if (!devices) return null
    const storageArr = devices.filter((d: any) => d.type === 'Storage')
    const mfrs = storageArr.reduce((acc: any, d: any) => {
      acc[d.manufacturer || 'Other'] = (acc[d.manufacturer || 'Other'] || 0) + 1
      return acc
    }, {})
    return { count: storageArr.length, mfrs }
  }, [devices])

  const healthData = useMemo(() => {
    if (!incidents) return null
    const open = incidents.filter((i: any) => i.status !== 'Resolved').length
    const critical = incidents.filter((i: any) => i.severity === 'Critical').length
    return { total: incidents.length, open, critical }
  }, [incidents])

  if (isMetricsLoading) return (
    <div className="h-full flex items-center justify-center">
      <Zap size={48} className="text-blue-500 animate-pulse opacity-20" />
    </div>
  )

  return (
    <div className="h-full flex flex-col space-y-8 max-w-7xl mx-auto overflow-hidden pr-4">
      {/* Header */}
      <div className="flex flex-col space-y-1">
        <div className="flex items-center justify-between">
           <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                 <LayoutDashboard size={20} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white">Command Center</h1>
           </div>
           <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-2xl border border-white/5">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  <tab.icon size={14} />
                  <span>{tab.label}</span>
                </button>
              ))}
           </div>
        </div>
        <p className="text-[9px] text-slate-500 uppercase tracking-[0.4em] font-black ml-1">Real-time Infrastructure Intelligence & Predictive Matrix</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-12">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="grid grid-cols-3 gap-8 h-fit">
               <BentoCard title="Infrastructure Nodes" subtitle="Regional Presence" icon={MapPin} color="from-blue-600 to-indigo-700" total={metrics?.sites || 0} breakdown={{ "Regional Sites": metrics?.sites || 0, "Rack Assemblies": metrics?.racks || 0, "Total U-Space": metrics?.total_u_space || 0, "Used U-Space": metrics?.used_u_space || 0 }} onClick={() => onNavigate('racks')} delay={0.1} />
               <BentoCard title="Hardware Assets" subtitle="Compute & Storage" icon={Server} color="from-emerald-600 to-teal-700" total={Object.values(metrics?.asset_types || {}).reduce((a: any, b: any) => a + b, 0)} breakdown={metrics?.asset_types} onClick={() => onNavigate('assets')} delay={0.2} />
               <BentoCard title="Logic Stack" subtitle="Services & APIs" icon={Layers} color="from-purple-600 to-fuchsia-700" total={Object.values(metrics?.service_types || {}).reduce((a: any, b: any) => a + b, 0)} breakdown={metrics?.service_types} onClick={() => onNavigate('services')} delay={0.3} />
               <BentoCard title="Network Mesh" subtitle="Cabling & Connect" icon={Network} color="from-amber-600 to-orange-700" total={metrics?.total_connections || 0} breakdown={metrics?.network_fabric} onClick={() => onNavigate('network')} delay={0.4} />
               <BentoCard title="Observability" subtitle="Active Monitoring" icon={Activity} color="from-rose-600 to-pink-700" total={incidents?.length || 0} breakdown={{ "Critical Incidents": healthData?.critical, "Open Tickets": healthData?.open, "Total History": healthData?.total }} onClick={() => onNavigate('monitoring')} delay={0.5} />
               <div className="glass-panel p-8 rounded-[40px] border border-blue-500/20 bg-blue-500/[0.02] flex flex-col justify-between group">
                  <div className="flex items-center justify-between">
                     <Shield size={32} className="text-blue-400 group-hover:scale-110 transition-transform" />
                     <span className="text-[10px] font-black uppercase text-blue-500/60 tracking-[0.2em]">Security Shield</span>
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-2">Policy Matrix</h3>
                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">System-wide firewall & access control orchestration.</p>
                  </div>
                  <div className="space-y-2">
                     <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-4/5 bg-blue-500" />
                     </div>
                     <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase">
                        <span>Compliant</span>
                        <span>80% Precision</span>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'compute' && (
            <motion.div key="compute" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
               <div className="grid grid-cols-4 gap-6">
                  <MetricTile label="Total Assets" value={devices?.length || 0} sub="Managed Compute Nodes" icon={Server} color="from-blue-600 to-indigo-700" />
                  <MetricTile label="Physical Bare-Metal" value={computeData?.physical || 0} sub="Rack-Mounted Hardware" icon={Box} color="from-emerald-600 to-teal-700" />
                  <MetricTile label="Virtual Instances" value={computeData?.virtual || 0} sub="Cloud & Hypervisor" icon={Layers} color="from-purple-600 to-fuchsia-700" />
                  <MetricTile label="OS Distributions" value={Object.keys(computeData?.osBreakdown || {}).length} sub="Heterogeneous Environment" icon={Terminal} color="from-amber-600 to-orange-700" />
               </div>
               <div className="grid grid-cols-3 gap-8">
                  <div className="col-span-1 glass-panel p-8 rounded-[40px] border-white/5">
                     <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center">
                        <Terminal size={16} className="text-blue-400 mr-3" /> Operating Systems
                     </h3>
                     <div className="space-y-4">
                        {computeData && Object.entries(computeData.osBreakdown).map(([os, count]: any) => (
                           <div key={os} className="space-y-2">
                              <div className="flex justify-between items-center">
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{os}</span>
                                 <span className="text-[10px] font-black text-white tabular-nums">{count}</span>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                 <motion.div initial={{ width: 0 }} animate={{ width: `${(count / devices.length) * 100}%` }} className="h-full bg-blue-600" />
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="col-span-2 glass-panel p-0 rounded-[40px] border-white/5 overflow-hidden">
                     <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
                           <ListTree size={16} className="text-emerald-400 mr-3" /> Compute Registry Matrix
                        </h3>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Top 15 Assets</span>
                     </div>
                     <div className="ag-theme-alpine-dark w-full h-[400px] sysgrid-grid">
                        <AgGridReact 
                          rowData={devices?.slice(0, 15)} 
                          columnDefs={[
                             { field: 'name', headerName: 'HOSTNAME', flex: 1 },
                             { field: 'system', headerName: 'SYSTEM', flex: 1 },
                             { field: 'type', headerName: 'TYPE', width: 100 },
                             { field: 'status', headerName: 'STATUS', width: 120, cellRenderer: (p: any) => (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${p.value === 'Active' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-slate-500 border-white/5 bg-white/5'}`}>{p.value}</span>
                             )}
                          ]}
                          domLayout="autoHeight"
                        />
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'network' && (
            <motion.div key="network" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
               <div className="grid grid-cols-4 gap-6">
                  <MetricTile label="Port Connections" value={networkData?.totalConns || 0} sub="Physical & Logical Links" icon={Network} color="from-amber-600 to-orange-700" />
                  <MetricTile label="Provisioned Subnets" value={networkData?.totalSubnets || 0} sub="Network Segments" icon={Globe} color="from-blue-600 to-indigo-700" />
                  <MetricTile label="Unique VLANs" value={subnets?.filter((s:any)=>s.vlan_id).length || 0} sub="Isolated Broadcast Domains" icon={Layers} color="from-emerald-600 to-teal-700" />
                  <MetricTile label="Traffic Direction" value="Bidirectional" sub="Default Link Mode" icon={ArrowUpRight} color="from-rose-600 to-pink-700" />
               </div>
               <div className="grid grid-cols-2 gap-8">
                  <div className="glass-panel p-8 rounded-[40px] border-white/5">
                     <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center">
                        <Wifi size={16} className="text-amber-400 mr-3" /> Connection Type Distribution
                     </h3>
                     <div className="grid grid-cols-2 gap-8">
                        {networkData && Object.entries(networkData.linkTypes).map(([type, count]: any) => (
                           <div key={type} className="bg-white/5 p-6 rounded-3xl border border-white/5">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">{type}</span>
                              <div className="flex items-baseline space-x-2">
                                 <span className="text-3xl font-black text-white tabular-nums">{count}</span>
                                 <span className="text-[10px] font-bold text-slate-600">LINKS</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="glass-panel p-8 rounded-[40px] border-white/5">
                     <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center">
                        <MapPin size={16} className="text-blue-400 mr-3" /> Core IP Subnets
                     </h3>
                     <div className="space-y-3">
                        {subnets?.map((s: any) => (
                           <div key={s.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all cursor-default">
                              <div className="flex items-center space-x-4">
                                 <div className="w-2 h-2 rounded-full bg-blue-500" />
                                 <div>
                                    <p className="text-[11px] font-black text-white tracking-tight uppercase">{s.name}</p>
                                    <p className="text-[10px] font-mono text-slate-500">{s.network_cidr}</p>
                                 </div>
                              </div>
                              <span className="text-[9px] font-black px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">VLAN {s.vlan_id}</span>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'storage' && (
            <motion.div key="storage" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
               <div className="grid grid-cols-3 gap-8">
                  <div className="col-span-1 space-y-8">
                     <MetricTile label="Storage Arrays" value={storageData?.count || 0} sub="Dedicated Storage Hardware" icon={HardDrive} color="from-fuchsia-600 to-purple-700" />
                     <div className="glass-panel p-8 rounded-[40px] border-white/5">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Vendor Presence</h3>
                        <div className="space-y-6">
                           {storageData && Object.entries(storageData.mfrs).map(([mfr, count]: any) => (
                              <div key={mfr} className="flex items-center justify-between">
                                 <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                       <Box size={14} className="text-purple-400" />
                                    </div>
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">{mfr}</span>
                                 </div>
                                 <span className="text-lg font-black text-white tabular-nums">{count}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
                  <div className="col-span-2 glass-panel p-8 rounded-[40px] border-white/5 bg-gradient-to-br from-transparent to-purple-600/[0.03]">
                     <div className="flex items-center justify-between mb-8">
                        <div>
                           <h3 className="text-xl font-black text-white uppercase tracking-tighter">Capacity Analytics</h3>
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Aggregated Storage Performance & Utilization</p>
                        </div>
                        <HardDrive size={48} className="text-purple-500 opacity-20" />
                     </div>
                     <div className="grid grid-cols-2 gap-12">
                        <div className="space-y-8">
                           <div>
                              <div className="flex justify-between mb-3">
                                 <span className="text-[10px] font-black text-slate-400 uppercase">Flash-Array Load</span>
                                 <span className="text-[10px] font-black text-purple-400">62%</span>
                              </div>
                              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                 <div className="h-full w-[62%] bg-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.4)]" />
                              </div>
                           </div>
                           <div>
                              <div className="flex justify-between mb-3">
                                 <span className="text-[10px] font-black text-slate-400 uppercase">Archive Replication</span>
                                 <span className="text-[10px] font-black text-emerald-400">94%</span>
                              </div>
                              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                 <div className="h-full w-[94%] bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
                              </div>
                           </div>
                        </div>
                        <div className="flex flex-col justify-center space-y-4">
                           <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                              <div className="flex items-center space-x-3 mb-1">
                                 <Activity size={12} className="text-blue-400" />
                                 <span className="text-[9px] font-black text-slate-500 uppercase">Avg IOPS</span>
                              </div>
                              <p className="text-xl font-black text-white">42.5K <span className="text-[10px] text-slate-600">peak</span></p>
                           </div>
                           <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                              <div className="flex items-center space-x-3 mb-1">
                                 <Clock size={12} className="text-amber-400" />
                                 <span className="text-[9px] font-black text-slate-500 uppercase">Latency</span>
                              </div>
                              <p className="text-xl font-black text-white">0.8ms <span className="text-[10px] text-slate-600">target</span></p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div key="security" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
               <div className="grid grid-cols-3 gap-8">
                  <div className="col-span-1 space-y-8">
                     <MetricTile label="Active Security Rules" value={firewallRules?.length || 0} sub="Dynamic Policy Enforcement" icon={Lock} color="from-rose-600 to-pink-700" />
                     <div className="glass-panel p-8 rounded-[40px] border-white/5">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Risk Profile</h3>
                        <div className="space-y-4">
                           <InfoRow label="Critical Assets Protected" value="100%" color="text-emerald-400" />
                           <InfoRow label="External DMZ Entrypoints" value="4" color="text-amber-400" />
                           <InfoRow label="Encrypted Tunnels" value="12" color="text-blue-400" />
                           <InfoRow label="Unauthorized Attempts (24h)" value="0" color="text-emerald-400" />
                        </div>
                     </div>
                  </div>
                  <div className="col-span-2 glass-panel p-0 rounded-[40px] border-white/5 overflow-hidden flex flex-col">
                     <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <div>
                           <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
                              <Shield size={16} className="text-rose-400 mr-3" /> Firewall Policy Registry
                           </h3>
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time Rule Evaluation Matrix</p>
                        </div>
                     </div>
                     <div className="ag-theme-alpine-dark w-full h-[400px] sysgrid-grid">
                        <AgGridReact 
                          rowData={firewallRules?.slice(0, 15)} 
                          columnDefs={[
                             { field: 'name', headerName: 'RULE NAME', flex: 1.5 },
                             { field: 'protocol', headerName: 'PROTO', width: 100 },
                             { field: 'port_range', headerName: 'PORTS', width: 120 },
                             { field: 'action', headerName: 'ACTION', width: 100, cellRenderer: (p:any)=>(
                                <span className={`font-black text-[10px] uppercase ${p.value === 'Allow' ? 'text-emerald-400' : 'text-rose-400'}`}>{p.value}</span>
                             )},
                             { field: 'risk', headerName: 'RISK', width: 100 }
                          ]}
                          domLayout="autoHeight"
                        />
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'health' && (
            <motion.div key="health" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
               <div className="grid grid-cols-4 gap-6">
                  <MetricTile label="Total Incidents" value={healthData?.total || 0} sub="All-time Historical Records" icon={AlertCircle} color="from-rose-600 to-pink-700" />
                  <MetricTile label="Active Issues" value={healthData?.open || 0} sub="Pending Resolution" icon={Clock} color="from-amber-600 to-orange-700" />
                  <MetricTile label="Critical Faults" value={healthData?.critical || 0} sub="High Business Impact" icon={Zap} color="from-rose-500 to-red-600" />
                  <MetricTile label="System Uptime" value="99.98%" sub="Regional Matrix SLA" icon={CheckCircle2} color="from-emerald-600 to-teal-700" />
               </div>
               <div className="grid grid-cols-2 gap-8">
                  <div className="glass-panel p-8 rounded-[40px] border-white/5">
                     <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center">
                        <Activity size={16} className="text-emerald-400 mr-3" /> Recent Stability Events
                     </h3>
                     <div className="space-y-4">
                        {incidents?.slice(0, 5).map((i: any) => (
                           <div key={i.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start space-x-4">
                              <div className={`mt-1 p-2 rounded-xl ${i.severity === 'Critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                 <AlertCircle size={16} />
                              </div>
                              <div className="flex-1">
                                 <div className="flex justify-between items-start">
                                    <h4 className="text-[11px] font-black text-white uppercase leading-tight">{i.title}</h4>
                                    <span className="text-[9px] font-black text-slate-600 uppercase tabular-nums">{new Date(i.start_time).toLocaleDateString()}</span>
                                 </div>
                                 <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-tight">{i.severity} // {i.status}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="glass-panel p-8 rounded-[40px] border-white/5 bg-emerald-500/[0.02]">
                     <div className="h-full flex flex-col justify-between">
                        <div>
                           <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Service Level Agreement (SLA)</h3>
                           <div className="space-y-6">
                              <div>
                                 <div className="flex justify-between mb-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase">Availability Target</span>
                                    <span className="text-[10px] font-black text-emerald-400">99.9%</span>
                                 </div>
                                 <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full w-[99.9%] bg-emerald-500" />
                                 </div>
                              </div>
                              <div>
                                 <div className="flex justify-between mb-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase">Mean Time to Repair (MTTR)</span>
                                    <span className="text-[10px] font-black text-amber-400">2.4h</span>
                                 </div>
                                 <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full w-[70%] bg-amber-500" />
                                 </div>
                              </div>
                           </div>
                        </div>
                        <div className="mt-8 p-6 bg-white/5 rounded-3xl border border-white/5">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Global Pulse Consensus</p>
                           <h4 className="text-3xl font-black text-white uppercase text-center mt-2 tracking-tighter">STABLE</h4>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Global Health Indicator Footer */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-[32px] border-white/5 flex items-center justify-between bg-gradient-to-r from-transparent via-blue-500/[0.02] to-transparent shrink-0"
      >
        <div className="flex items-center space-x-6">
           <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Global System Pulse</span>
              <div className="flex items-center space-x-2 mt-1">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                 <span className="text-[11px] font-black uppercase text-emerald-500">All Modules Nominal</span>
              </div>
           </div>
           <div className="h-8 w-px bg-white/5" />
           <div className="flex space-x-8">
              <div className="flex flex-col text-center">
                 <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Active Nodes</span>
                 <span className="text-[11px] font-black text-white tabular-nums">{devices?.length || 0}</span>
              </div>
              <div className="flex flex-col text-center">
                 <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Grid Latency</span>
                 <span className="text-[11px] font-black text-white">12ms</span>
              </div>
           </div>
        </div>
        <div className="flex items-center space-x-3">
           <span className="text-[9px] font-black text-slate-500 uppercase">Orchestration Engine v1.5.0</span>
           <div className="p-2 bg-white/5 rounded-lg border border-white/5">
              <Terminal size={12} className="text-slate-500" />
           </div>
        </div>
      </motion.div>
    </div>
  )
}
