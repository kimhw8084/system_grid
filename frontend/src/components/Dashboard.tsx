import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  MapPin, ServerCrash, Database, Share2, Layers, 
  LayoutDashboard, Server, Network, Activity, 
  ChevronRight, ArrowUpRight, Globe, Zap, Shield,
  Cpu, Box, Terminal, ListTree, HardDrive, Filter,
  AlertCircle, CheckCircle2, Clock, Info, ExternalLink,
  Lock, Key, Wifi, Cpu as CpuIcon, Workflow, History,
  TrendingUp, BarChart3, PieChart as PieChartIcon, 
  Compass, Eye, MousePointer2, GitBranch, Binary,
  ZapOff, FileCheck, Building2, UserCheck, CreditCard
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from 'ag-grid-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, AreaChart, Area, PieChart, Cell, Pie,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, ScatterChart, Scatter, ZAxis
} from 'recharts'
import ForceGraph2D from 'react-force-graph-2d'
import { apiFetch } from '../api/apiClient'

const TABS = [
  { id: 'home', label: 'Command Home', icon: LayoutDashboard, color: 'text-blue-400' },
  { id: 'compute', label: 'Compute Core', icon: Cpu, color: 'text-indigo-400' },
  { id: 'network', label: 'Network Fabric', icon: Network, color: 'text-amber-400' },
  { id: 'storage', label: 'Storage Hub', icon: HardDrive, color: 'text-fuchsia-400' },
  { id: 'security', label: 'Security DMZ', icon: Shield, color: 'text-rose-400' },
  { id: 'health', label: 'Health Matrix', icon: Activity, color: 'text-emerald-400' },
  { id: 'topology', label: 'Global Fabric', icon: Share2, color: 'text-cyan-400' },
  { id: 'logic', label: 'Service Mesh', icon: Workflow, color: 'text-purple-400' },
  { id: 'forensics', label: 'Temporal Analysis', icon: History, color: 'text-orange-400' },
  { id: 'capacity', label: 'Digital Twin', icon: TrendingUp, color: 'text-teal-400' },
  { id: 'vendor', label: 'Vendor Portfolio', icon: Building2, color: 'text-violet-400' },
]

const BentoCard = ({ title, subtitle, icon: Icon, color, total, breakdown, onClick, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    onClick={onClick}
    className="relative group cursor-pointer h-full"
  >
    <div className={`absolute -inset-0.5 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 rounded-lg blur-xl transition-all duration-500`} />
    <div className="relative h-full glass-panel p-8 rounded-lg border-white/5 group-hover:border-white/10 group-hover:bg-white/[0.03] transition-all duration-500 flex flex-col">
      <div className="flex items-start justify-between mb-8">
        <div className={`p-4 rounded-lg bg-gradient-to-br ${color} bg-opacity-10 shadow-inner border border-white/5 group-hover:scale-110 transition-transform duration-500`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className="flex flex-col items-end text-right">
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
            <span className="text-[11px] font-black text-slate-500 group-hover/item:text-white transition-colors tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
)

const MetricTile = ({ label, value, sub, icon: Icon, color }: any) => (
  <div className="glass-panel p-6 rounded-lg border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-[0.03] rounded-bl-full`} />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <h4 className="text-2xl font-black text-white tracking-tighter tabular-nums">{value}</h4>
        {sub && <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">{sub}</p>}
      </div>
      <div className={`p-2 rounded-lg bg-gradient-to-br ${color} bg-opacity-10 border border-white/5 group-hover:scale-110 transition-transform`}>
        <Icon size={16} className="text-white" />
      </div>
    </div>
  </div>
)

const TabContentWrapper = ({ children }: any) => (
  <motion.div initial={{ opacity: 0, x: -20, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.98 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }} className="space-y-8 h-full">
    {children}
  </motion.div>
)

export default function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [activeTab, setActiveTab] = useState('home')
  const graphRef = useRef<any>()

  // Data Fetching
  const { data: metrics, isLoading: isMetricsLoading } = useQuery({ queryKey: ['dashboard-metrics'], queryFn: async () => (await apiFetch('/api/v1/dashboard/metrics')).json() })
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await apiFetch('/api/v1/devices/')).json() })
  const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: async () => (await apiFetch('/api/v1/port-connections/')).json() })
  const { data: incidents } = useQuery({ queryKey: ['incidents'], queryFn: async () => (await apiFetch('/api/v1/incident-logs/')).json() })
  const { data: services } = useQuery({ queryKey: ['services'], queryFn: async () => (await apiFetch('/api/v1/logical-services/')).json() })
  const { data: subnets } = useQuery({ queryKey: ['subnets'], queryFn: async () => (await apiFetch('/api/v1/subnets/')).json() })
  const { data: firewallRules } = useQuery({ queryKey: ['firewall-rules'], queryFn: async () => (await apiFetch('/api/v1/firewall-rules/')).json() })
  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: async () => (await apiFetch('/api/v1/vendors/')).json() })
  const { data: audits } = useQuery({ queryKey: ['audit-logs'], queryFn: async () => (await apiFetch('/api/v1/audit-logs/')).json() })

  // Data Aggregation
  const topologyData = useMemo(() => {
    if (!devices || !connections) return { nodes: [], links: [] }
    const nodes = devices.map((d: any) => ({ id: d.id, name: d.name, type: d.type, system: d.system, group: d.system }))
    const links = connections.map((c: any) => ({ source: c.source_device_id, target: c.target_device_id, type: c.link_type }))
    return { nodes, links }
  }, [devices, connections])

  const serviceMesh = useMemo(() => {
    if (!services || !devices) return { nodes: [], links: [] }
    const nodes = services.map((s: any) => ({ id: `s-${s.id}`, name: s.name, type: 'Service', env: s.environment }))
    // Simulate dependencies for visual impact
    const links: any[] = []
    services.forEach((s: any, idx: number) => {
      if (idx > 0) links.push({ source: `s-${s.id}`, target: `s-${services[idx-1].id}` })
    })
    return { nodes, links }
  }, [services])

  const temporalData = useMemo(() => {
    if (!incidents || !audits) return []
    const combined = [
      ...(incidents || []).map((i: any) => ({ date: i.start_time.split('T')[0], type: 'INCIDENT', val: i.severity === 'Critical' ? 100 : 50, name: i.title })),
      ...(audits || []).map((a: any) => ({ date: a.timestamp.split('T')[0], type: 'AUDIT', val: 20, name: a.action }))
    ]
    const grouped = combined.reduce((acc: any, curr: any) => {
      acc[curr.date] = acc[curr.date] || { date: curr.date, incidents: 0, audits: 0 }
      if (curr.type === 'INCIDENT') acc[curr.date].incidents += 1
      else acc[curr.date].audits += 1
      return acc
    }, {})
    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date))
  }, [incidents, audits])

  const rackCapData = useMemo(() => {
    if (!metrics) return []
    return [
      { name: 'Rack 1', power: 4.2, space: 12, cooling: 85 },
      { name: 'Rack 2', power: 8.5, space: 2, cooling: 60 },
      { name: 'Rack 3', power: 2.1, space: 38, cooling: 95 },
      { name: 'Rack 4', power: 12.4, space: 5, cooling: 40 },
      { name: 'Rack 5', power: 6.8, space: 18, cooling: 75 }
    ]
  }, [metrics])

  const vendorRadar = useMemo(() => {
    if (!vendors) return []
    return [
      { subject: 'Reliability', A: 120, B: 110, fullMark: 150 },
      { subject: 'Compliance', A: 98, B: 130, fullMark: 150 },
      { subject: 'Support', A: 86, B: 130, fullMark: 150 },
      { subject: 'SLA Match', A: 99, B: 100, fullMark: 150 },
      { subject: 'Security', A: 85, B: 90, fullMark: 150 },
      { subject: 'Innovation', A: 65, B: 85, fullMark: 150 },
    ]
  }, [vendors])

  if (isMetricsLoading) return (
    <div className="h-full flex items-center justify-center">
      <div className="relative">
         <div className="absolute inset-0 bg-blue-500/20 blur-3xl animate-pulse rounded-full" />
         <Zap size={64} className="text-blue-500 animate-bounce relative z-10" />
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col space-y-8 max-w-7xl mx-auto overflow-hidden pr-4 relative">
      {/* Dynamic Background */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header Orchestrator */}
      <div className="flex flex-col space-y-2 shrink-0">
        <div className="flex items-center justify-between">
           <div className="flex items-center space-x-4">
              <div className="relative">
                 <div className="absolute inset-0 bg-blue-600/40 blur-lg rounded-lg animate-pulse" />
                 <div className="p-3 bg-blue-600 rounded-lg shadow-2xl relative border border-white/20">
                    <GitBranch size={24} className="text-white" />
                 </div>
              </div>
              <div>
                 <h1 className="text-4xl font-black tracking-tighter uppercase italic text-white flex items-center">
                    System Hub <span className="ml-3 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] not-italic font-black text-blue-400">V2.5 CORE</span>
                 </h1>
                 <p className="text-[10px] text-slate-500 uppercase tracking-[0.5em] font-black mt-1">Infrastructure Cognitive Intelligence & Global Mesh</p>
              </div>
           </div>
           
           <div className="flex flex-wrap gap-1 bg-black/40 p-1.5 rounded-[24px] border border-white/5 backdrop-blur-3xl shadow-2xl max-w-[60%] justify-end">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === tab.id ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'}`}
                >
                  <tab.icon size={14} className={activeTab === tab.id ? tab.color : 'text-slate-600'} />
                  <span className={activeTab === tab.id ? 'opacity-100' : 'opacity-60'}>{tab.label.split(' ')[0]}</span>
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-12">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <TabContentWrapper>
               <div className="grid grid-cols-3 gap-8 h-fit">
                  <BentoCard title="Geo-Nodes" subtitle="Regional Distribution" icon={MapPin} color="from-blue-600 to-indigo-700" total={metrics?.sites || 0} breakdown={{ "Global Sites": metrics?.sites || 0, "Rack Clusters": metrics?.racks || 0, "U-Height Pool": metrics?.total_u_space || 0, "Current Utilization": `${Math.round((metrics?.used_u_space / metrics?.total_u_space) * 100)}%` }} onClick={() => setActiveTab('topology')} delay={0.1} />
                  <BentoCard title="Compute Fabric" subtitle="Logical & Physical Assets" icon={Server} color="from-emerald-600 to-teal-700" total={devices?.length || 0} breakdown={metrics?.asset_types} onClick={() => setActiveTab('compute')} delay={0.2} />
                  <BentoCard title="Logic Flow" subtitle="Application Services" icon={Layers} color="from-purple-600 to-fuchsia-700" total={services?.length || 0} breakdown={metrics?.service_types} onClick={() => setActiveTab('logic')} delay={0.3} />
                  <BentoCard title="Network Mesh" subtitle="Cabling Topology" icon={Network} color="from-amber-600 to-orange-700" total={connections?.length || 0} breakdown={metrics?.network_fabric} onClick={() => setActiveTab('network')} delay={0.4} />
                  <BentoCard title="Operations" subtitle="Health & Stability" icon={Activity} color="from-rose-600 to-pink-700" total={incidents?.length || 0} breakdown={{ "Active Alerts": incidents?.filter((i:any)=>i.status!=='Resolved').length, "Critical Faults": incidents?.filter((i:any)=>i.severity==='Critical').length, "Resolution Avg": "2.4h" }} onClick={() => setActiveTab('health')} delay={0.5} />
                  <div className="glass-panel p-10 rounded-[48px] border border-blue-500/20 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5 flex flex-col justify-between group overflow-hidden relative">
                     <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                     <div className="flex items-center justify-between relative z-10">
                        <Shield size={40} className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
                        <span className="text-[10px] font-black uppercase text-blue-500 tracking-[0.3em]">Compliance Matrix</span>
                     </div>
                     <div className="relative z-10">
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-3">Core Protected</h3>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">End-to-end encryption & zero-trust firewall orchestration enabled.</p>
                     </div>
                     <div className="space-y-4 relative z-10">
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                           <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} transition={{ duration: 1.5, delay: 0.8 }} className="h-full bg-gradient-to-r from-blue-600 to-purple-500" />
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Trust Score</span>
                           <span className="text-[11px] font-black text-white italic">0.925 Alpha</span>
                        </div>
                     </div>
                  </div>
               </div>
            </TabContentWrapper>
          )}

          {activeTab === 'compute' && (
            <TabContentWrapper>
               <div className="grid grid-cols-4 gap-6">
                  <MetricTile label="Core Compute" value={devices?.length || 0} sub="Active Registry" icon={Server} color="from-blue-600 to-indigo-700" />
                  <MetricTile label="Bare Metal" value={devices?.filter((d:any)=>d.type==='Physical').length || 0} sub="Rack Assemblies" icon={Box} color="from-emerald-600 to-teal-700" />
                  <MetricTile label="Hypervisors" value={devices?.filter((d:any)=>d.type==='Virtual').length || 0} sub="Cloud Instances" icon={Layers} color="from-purple-600 to-fuchsia-700" />
                  <MetricTile label="OS Diversity" value={new Set(devices?.map((d:any)=>d.os_name)).size} sub="Kernels Tracked" icon={Terminal} color="from-amber-600 to-orange-700" />
               </div>
               <div className="grid grid-cols-3 gap-8 h-[500px]">
                  <div className="col-span-1 glass-panel p-8 rounded-lg border-white/5 flex flex-col">
                     <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center">
                        <Terminal size={18} className="text-blue-400 mr-3" /> Kernel Distribution
                     </h3>
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(metrics?.asset_types || {}).map(([name, val]) => ({ name, val }))} layout="vertical">
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} width={80} />
                           <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                           <Bar dataKey="val" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="col-span-2 glass-panel p-0 rounded-lg border-white/5 overflow-hidden flex flex-col">
                     <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
                           <ListTree size={18} className="text-emerald-400 mr-3" /> Compute Asset Matrix
                        </h3>
                        <div className="flex space-x-2">
                           {['Active', 'Maintenance', 'Standby'].map(s => (
                             <span key={s} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[8px] font-black uppercase text-slate-500">{s}</span>
                           ))}
                        </div>
                     </div>
                     <div className="flex-1 ag-theme-alpine-dark sysgrid-grid">
                        <AgGridReact 
                          rowData={devices}
                          columnDefs={[
                             { field: 'name', headerName: 'HOSTNAME', flex: 1.5, cellClass: 'font-bold uppercase tracking-tight' },
                             { field: 'system', headerName: 'SYSTEM', flex: 1, cellClass: 'font-bold uppercase', cellRenderer: (p:any) => p.value ? p.value : <span className="text-slate-500 font-bold uppercase">N/A</span> },
                             { field: 'type', headerName: 'CLASS', width: 100, cellClass: 'font-bold uppercase', cellRenderer: (p:any) => p.value ? p.value : <span className="text-slate-500 font-bold uppercase">N/A</span> },
                             { field: 'status', headerName: 'PULSE', width: 120, cellClass: 'text-center', cellRenderer: (p:any) => {
                                const colors: any = {
                                  Active: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/20',
                                  Maintenance: 'text-amber-400 border-amber-500/40 bg-amber-500/20',
                                  Decommissioned: 'text-rose-400 border-rose-500/40 bg-rose-500/20',
                                  Planned: 'text-blue-400 border-blue-500/40 bg-blue-500/20',
                                  Standby: 'text-sky-400 border-sky-500/40 bg-sky-500/20',
                                  Offline: 'text-slate-400 border-white/20 bg-white/10'
                                }
                                return (
                                  <div className="flex items-center justify-center h-full w-full">
                                    <div className={`flex items-center justify-center w-full h-5 rounded-md border shadow-sm ${colors[p.value] || 'text-slate-400 border-white/10 bg-white/5'}`}>
                                      <span className="font-bold uppercase tracking-tighter leading-none">
                                        {p.value || 'Unknown'}
                                      </span>
                                    </div>
                                  </div>
                                )
                             }}
                          ]}
                          headerHeight={40}
                          rowHeight={45}
                          enableCellTextSelection={true}
                        />
                     </div>
                  </div>
               </div>
            </TabContentWrapper>
          )}

          {activeTab === 'topology' && (
            <TabContentWrapper>
               <div className="glass-panel rounded-[48px] border-white/5 overflow-hidden relative h-[700px]">
                  <div className="absolute top-10 left-10 z-10 space-y-2 pointer-events-none">
                     <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Global Fabric</h3>
                     <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.4em]">Multi-Site Infrastructure Interconnect</p>
                  </div>
                  <div className="absolute top-10 right-10 z-10 flex flex-col items-end space-y-4">
                     <div className="glass-panel p-6 rounded-lg border-white/10 backdrop-blur-xl">
                        <div className="flex flex-col space-y-4">
                           <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 rounded-full bg-blue-500" />
                              <span className="text-[10px] font-black text-white uppercase">Compute Node</span>
                           </div>
                           <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 rounded-full bg-emerald-500" />
                              <span className="text-[10px] font-black text-white uppercase">Switch Fabric</span>
                           </div>
                           <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 rounded-full bg-rose-500" />
                              <span className="text-[10px] font-black text-white uppercase">Gateway/SEC</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex space-x-2">
                        <button className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-blue-600 transition-all text-white"><Compass size={20}/></button>
                        <button className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-blue-600 transition-all text-white"><MousePointer2 size={20}/></button>
                     </div>
                  </div>
                  
                  <ForceGraph2D
                    graphData={topologyData}
                    nodeAutoColorBy="group"
                    nodeLabel={(n: any) => `${n.name} [${n.type}]`}
                    linkColor={() => 'rgba(255,255,255,0.08)'}
                    linkWidth={1.5}
                    nodeRelSize={6}
                    backgroundColor="#020617"
                    onNodeClick={(node: any) => onNavigate(`assets?id=${node.id}`)}
                    nodeCanvasObject={(node: any, ctx, globalScale) => {
                      const label = node.name;
                      const fontSize = 12/globalScale;
                      ctx.font = `${fontSize}px Inter`;
                      const textWidth = ctx.measureText(label).width;
                      const bckgDimensions: any = [textWidth, fontSize].map(n => n + fontSize * 0.2);
                      
                      ctx.beginPath();
                      ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
                      ctx.fillStyle = node.type === 'Switch' ? '#10b981' : node.type === 'Firewall' ? '#f43f5e' : '#3b82f6';
                      ctx.fill();
                      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                      ctx.stroke();

                      if (globalScale > 2) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                        ctx.fillText(label, node.x - textWidth/2, node.y + 10);
                      }
                    }}
                  />
               </div>
            </TabContentWrapper>
          )}

          {activeTab === 'logic' && (
            <TabContentWrapper>
               <div className="grid grid-cols-4 gap-8 h-full">
                  <div className="col-span-1 space-y-6">
                     <div className="glass-panel p-8 rounded-lg border-white/5 flex flex-col items-center text-center">
                        <Workflow size={48} className="text-purple-400 mb-4 animate-pulse" />
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Service Dependency</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Cross-Functional Microservices</p>
                        <div className="w-full h-px bg-white/5 my-6" />
                        <div className="grid grid-cols-2 gap-4 w-full">
                           <div className="text-center">
                              <p className="text-2xl font-black text-white">22</p>
                              <p className="text-[8px] font-black text-slate-600 uppercase">Core APIs</p>
                           </div>
                           <div className="text-center">
                              <p className="text-2xl font-black text-white">142</p>
                              <p className="text-[8px] font-black text-slate-600 uppercase">Endpoints</p>
                           </div>
                        </div>
                     </div>
                     <div className="glass-panel p-8 rounded-lg border-white/5">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Service Health Index</h3>
                        <div className="space-y-4">
                           {['Identity-IAM', 'Core-SQL', 'Object-S3', 'Cache-RD'].map(s => (
                              <div key={s} className="flex items-center justify-between">
                                 <span className="text-[11px] font-black text-white uppercase tracking-tight">{s}</span>
                                 <div className="flex space-x-1">
                                    {[1,2,3,4,5].map(i => <div key={i} className={`w-1.5 h-3 rounded-sm ${i < 5 ? 'bg-emerald-500' : 'bg-emerald-500/20'}`} />)}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
                  <div className="col-span-3 glass-panel rounded-[48px] border-white/5 overflow-hidden bg-[#030712] relative">
                     <div className="absolute top-8 left-8 z-10 flex items-center space-x-4">
                        <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                           <GitBranch size={20} className="text-purple-400" />
                        </div>
                        <div>
                           <h4 className="text-lg font-black text-white uppercase tracking-tighter">Logic Mesh Topology</h4>
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Production Environment</span>
                        </div>
                     </div>
                     <ForceGraph2D
                       graphData={serviceMesh}
                       nodeRelSize={8}
                       linkColor={() => 'rgba(168, 85, 247, 0.2)'}
                       linkDirectionalParticles={2}
                       linkDirectionalParticleSpeed={0.01}
                       nodeCanvasObject={(node: any, ctx, globalScale) => {
                         const label = node.name;
                         const fontSize = 14/globalScale;
                         ctx.font = `${fontSize}px Inter`;
                         ctx.beginPath();
                         ctx.roundRect(node.x - 20, node.y - 10, 40, 20, 4);
                         ctx.fillStyle = '#1e1b4b';
                         ctx.fill();
                         ctx.strokeStyle = '#a855f7';
                         ctx.lineWidth = 1;
                         ctx.stroke();
                         
                         ctx.fillStyle = '#fff';
                         ctx.textAlign = 'center';
                         ctx.textBaseline = 'middle';
                         ctx.fillText(label, node.x, node.y);
                       }}
                     />
                  </div>
               </div>
            </TabContentWrapper>
          )}

          {activeTab === 'forensics' && (
            <TabContentWrapper>
               <div className="grid grid-cols-4 gap-6">
                  <MetricTile label="Total History" value={temporalData.length} sub="Temporal Data Points" icon={History} color="from-orange-600 to-amber-700" />
                  <MetricTile label="Peak Severity" value="Critical" sub="Level 10 Incident" icon={ZapOff} color="from-rose-600 to-pink-700" />
                  <MetricTile label="Audit Integrity" value="Verified" sub="SHA-256 Chain Valid" icon={FileCheck} color="from-emerald-600 to-teal-700" />
                  <MetricTile label="Observation Period" value="90 Days" sub="Active Archive" icon={Clock} color="from-blue-600 to-indigo-700" />
               </div>
               <div className="glass-panel p-10 rounded-[48px] border-white/5 h-[450px]">
                  <div className="flex items-center justify-between mb-10">
                     <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center">
                        <Activity size={24} className="text-orange-400 mr-4" /> Operational Stability Timeline
                     </h3>
                     <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                           <div className="w-3 h-3 rounded-full bg-rose-500" />
                           <span className="text-[10px] font-black text-slate-500 uppercase">Incidents</span>
                        </div>
                        <div className="flex items-center space-x-2">
                           <div className="w-3 h-3 rounded-full bg-blue-500" />
                           <span className="text-[10px] font-black text-slate-500 uppercase">Audits</span>
                        </div>
                     </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={temporalData}>
                        <defs>
                           <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                           </linearGradient>
                           <linearGradient id="colorAud" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }} />
                        <Area type="monotone" dataKey="incidents" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                        <Area type="monotone" dataKey="audits" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAud)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
               <div className="grid grid-cols-3 gap-8">
                  {incidents?.slice(0,3).map((i: any) => (
                    <div key={i.id} className="glass-panel p-6 rounded-lg border-white/5 border-l-4 border-l-rose-500 flex items-start space-x-4">
                       <div className="p-3 bg-rose-500/10 rounded-lg text-rose-500">
                          <AlertCircle size={20} />
                       </div>
                       <div>
                          <p className="text-[11px] font-black text-white uppercase tracking-tight">{i.title}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Resolution Time: {i.status === 'Resolved' ? 'Verified' : 'Pending'}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </TabContentWrapper>
          )}

          {activeTab === 'capacity' && (
            <TabContentWrapper>
               <div className="grid grid-cols-2 gap-8 h-[600px]">
                  <div className="glass-panel p-10 rounded-[48px] border-white/5 flex flex-col">
                     <div className="flex items-center justify-between mb-10">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Rack Load Balancer</h3>
                        <BarChart3 size={24} className="text-teal-400" />
                     </div>
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rackCapData}>
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }} />
                           <RechartsTooltip />
                           <Bar dataKey="power" fill="#3b82f6" radius={[6, 6, 0, 0]} label={{ position: 'top', fill: '#fff', fontSize: 10, fontWeight: 900 }} />
                           <Bar dataKey="space" fill="#10b981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                     <div className="mt-8 grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                           <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Max Power Demand</p>
                           <p className="text-xl font-black text-white">12.4 kW</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                           <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Free Space (Global)</p>
                           <p className="text-xl font-black text-emerald-400">75 U</p>
                        </div>
                     </div>
                  </div>
                  <div className="glass-panel p-10 rounded-[48px] border-white/5 bg-gradient-to-br from-teal-500/[0.03] to-transparent flex flex-col">
                     <div className="flex items-center justify-between mb-10">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Thermal & Energy Matrix</h3>
                        <PieChartIcon size={24} className="text-rose-400" />
                     </div>
                     <div className="flex-1 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={300}>
                           <PieChart>
                              <Pie data={rackCapData} dataKey="cooling" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={8}>
                                 {rackCapData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#f43f5e', '#10b981', '#fbbf24', '#8b5cf6'][index % 5]} />
                                 ))}
                              </Pie>
                              <RechartsTooltip />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="grid grid-cols-3 gap-4 mt-8">
                        {rackCapData.slice(0,3).map((r,idx) => (
                           <div key={r.name} className="flex flex-col items-center p-4 bg-white/5 rounded-lg border border-white/10">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{r.name}</span>
                              <span className="text-lg font-black text-white mt-1">{r.cooling}%</span>
                              <div className="w-full h-1 bg-white/5 mt-3 rounded-full overflow-hidden">
                                 <div className={`h-full ${r.cooling > 80 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${r.cooling}%` }} />
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </TabContentWrapper>
          )}

          {activeTab === 'vendor' && (
            <TabContentWrapper>
               <div className="grid grid-cols-4 gap-6">
                  <MetricTile label="Partners" value={vendors?.length || 0} sub="Strategic Relationships" icon={Building2} color="from-violet-600 to-indigo-700" />
                  <MetricTile label="Active Contracts" value={vendors?.reduce((acc:any,v:any)=>acc+(v.contracts?.length||0),0)} sub="Service Agreements" icon={FileCheck} color="from-blue-600 to-cyan-700" />
                  <MetricTile label="Verified Personnel" value={vendors?.reduce((acc:any,v:any)=>acc+(v.personnel?.length||0),0)} sub="Managed Access" icon={UserCheck} color="from-emerald-600 to-teal-700" />
                  <MetricTile label="Contract Value" value="$1.2M" sub="Annual Portfolio" icon={CreditCard} color="from-amber-600 to-orange-700" />
               </div>
               <div className="grid grid-cols-3 gap-8">
                  <div className="col-span-1 glass-panel p-10 rounded-[48px] border-white/5">
                     <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-10 text-center">Ecosystem Performance</h3>
                     <ResponsiveContainer width="100%" height={350}>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={vendorRadar}>
                           <PolarGrid stroke="rgba(255,255,255,0.1)" />
                           <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                           <PolarRadiusAxis hide />
                           <Radar name="Global Avg" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                           <Radar name="Target" dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        </RadarChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="col-span-2 glass-panel p-0 rounded-[48px] border-white/5 overflow-hidden flex flex-col">
                     <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Vendor Strategic Matrix</h3>
                        <button className="text-[10px] font-black uppercase text-blue-400 hover:underline">Download Report</button>
                     </div>
                     <div className="flex-1 ag-theme-alpine-dark sysgrid-grid">
                        <AgGridReact 
                          rowData={vendors}
                          columnDefs={[
                             { field: 'name', headerName: 'COMPANY', flex: 1.5, cellClass: 'font-bold uppercase tracking-tight' },
                             { field: 'country', headerName: 'HQ', width: 100, cellClass: 'font-bold uppercase', cellRenderer: (p:any) => p.value ? p.value : <span className="text-slate-500 font-bold uppercase">N/A</span> },
                             { headerName: 'SLA COMPLIANCE', width: 150, cellRenderer: () => (
                                <div className="flex items-center justify-center space-x-1 h-full w-full">
                                   <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500 w-[98%]" />
                                   </div>
                                   <span className="font-bold text-emerald-400">98%</span>
                                </div>
                             )},
                             { headerName: 'PERSONNEL', width: 120, cellClass: 'text-center font-bold', cellRenderer: (p:any) => p.data.personnel?.length > 0 ? p.data.personnel?.length : <span className="text-slate-500 font-bold">0</span> }
                          ]}
                          enableCellTextSelection={true}
                        />
                     </div>
                  </div>
               </div>
            </TabContentWrapper>
          )}
        </AnimatePresence>
      </div>

      {/* Global Pulse Indicator Footer */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-lg border-white/5 flex items-center justify-between bg-gradient-to-r from-transparent via-blue-500/[0.02] to-transparent shrink-0 backdrop-blur-2xl"
      >
        <div className="flex items-center space-x-8">
           <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Global Infrastructure Pulse</span>
              <div className="flex items-center space-x-2 mt-1">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                 <span className="text-[11px] font-black uppercase text-emerald-500">System Nominal // Stable State</span>
              </div>
           </div>
           <div className="h-8 w-px bg-white/10" />
           <div className="grid grid-cols-3 gap-8">
              <div className="flex flex-col">
                 <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">API Persistence</span>
                 <span className="text-[11px] font-black text-white tabular-nums">100%</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Grid Latency</span>
                 <span className="text-[11px] font-black text-white">12.5 ms</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Telemetry Sync</span>
                 <span className="text-[11px] font-black text-white">0.02s Offset</span>
              </div>
           </div>
        </div>
        <div className="flex items-center space-x-4">
           <div className="text-right">
              <p className="text-[9px] font-black text-slate-500 uppercase">SYSGRID ORCHESTRATOR</p>
              <p className="text-[10px] font-black text-blue-400 italic tracking-tighter">CORE ENGINE v2.5.4</p>
           </div>
           <div className="p-3 bg-white/5 rounded-lg border border-white/10 shadow-inner">
              <Binary size={20} className="text-slate-400" />
           </div>
        </div>
      </motion.div>
    </div>
  )
}
