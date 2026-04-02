import React, { useState, useCallback, useMemo, useEffect } from 'react'
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  Panel,
  useNodesState, 
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  Connection,
  ReactFlowProvider,
  useReactFlow,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  MiniMap,
  Node,
  Edge
} from 'reactflow'
import 'reactflow/dist/style.css'
import { 
  Save, 
  Plus, 
  Server, 
  Search,
  Database,
  Globe,
  Layout,
  Edit3,
  Network,
  ChevronLeft,
  Settings2,
  Table as TableIcon,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'
import { StatusPill } from './shared/StatusPill'

// --- Constants & Styles ---

const FLOW_TYPES = [
  { id: 'DATA', label: 'Data Flow', color: '#3b82f6', dash: false },
  { id: 'AUTH', label: 'Auth / Security', color: '#8b5cf6', dash: false },
  { id: 'SYNC', label: 'Replication', color: '#10b981', dash: [5, 5] },
  { id: 'MGMT', label: 'Control Plane', color: '#f59e0b', dash: [2, 2] },
  { id: 'CRITICAL', label: 'Heartbeat', color: '#ef4444', dash: false, weight: 4 },
]

const ARCH_STATUSES = ['Up to date', 'Deprecated', 'Planned', 'In Review']
const ARCH_CATEGORIES = ['System', 'Service', 'Application', 'Network', 'Security']

// --- Custom Nodes ---

const DeviceNode = ({ data, selected }: any) => {
  return (
    <div className={`glass-panel min-w-[280px] min-h-[120px] rounded-[30px] border-2 transition-all duration-500 overflow-hidden ${selected ? 'border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.3)]' : 'border-white/10'}`}>
      <div className="bg-white/5 px-6 py-3 border-b border-white/5 flex items-center justify-between">
         <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
               {data.type === 'Switch' ? <Network size={16}/> : <Server size={16}/>}
            </div>
            <div>
               <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest leading-none">{data.name}</p>
               <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-tighter">{data.type} // {data.environment}</p>
            </div>
         </div>
         {data.status === 'Active' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
      </div>
      
      <div className="p-6">
         <div className="min-h-[40px] border border-dashed border-white/5 rounded-2xl bg-black/20 flex flex-col items-center justify-center relative">
            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest absolute top-2">Resident Services Matrix</span>
            <div className="pt-6 w-full flex flex-col space-y-2 px-2 pb-2">
               {data.logical_services?.slice(0, 2).map((s: any) => (
                  <div key={s.id} className="flex items-center space-x-2 px-2 py-1 rounded bg-emerald-500/5 border border-emerald-500/10">
                     <Database size={8} className="text-emerald-400" />
                     <span className="text-[7px] font-bold text-emerald-400 uppercase">{s.name}</span>
                  </div>
               ))}
               {data.logical_services?.length > 2 && (
                  <span className="text-[6px] text-slate-500 text-center font-bold">+{data.logical_services.length - 2} MORE SERVICES</span>
               )}
            </div>
         </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500 border-2 border-slate-900 !left-[-6px]" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-slate-900 !right-[-6px]" />
    </div>
  )
}

const ServiceNode = ({ data, selected }: any) => {
  return (
    <div className={`glass-panel px-4 py-2.5 rounded-xl border-2 transition-all duration-300 flex items-center space-x-3 w-full ${selected ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
       <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
          <Database size={12}/>
       </div>
       <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase text-emerald-400 truncate tracking-tight">{data.name}</p>
          <p className="text-[7px] font-bold text-slate-500 uppercase truncate">{data.service_type}</p>
       </div>

       <Handle type="target" position={Position.Left} className="w-2 h-2 bg-emerald-500 border-2 border-slate-900 !left-[-4px]" />
       <Handle type="source" position={Position.Right} className="w-2 h-2 bg-emerald-500 border-2 border-slate-900 !right-[-4px]" />
    </div>
  )
}

const ExternalNode = ({ data, selected }: any) => {
  return (
    <div className={`glass-panel min-w-[220px] rounded-[30px] border-2 transition-all duration-500 p-4 border-dashed ${selected ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.2)] bg-indigo-500/5' : 'border-white/20'}`}>
       <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
             <Globe size={18}/>
          </div>
          <div>
             <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{data.name}</p>
             <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">{data.owner_organization}</p>
          </div>
       </div>
       <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500 border-2 border-slate-900 !left-[-6px]" />
       <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-slate-900 !right-[-6px]" />
    </div>
  )
}

const LabeledEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: any) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition
  });

  const currentType = FLOW_TYPES.find(t => t.id === (data?.type || 'DATA')) || FLOW_TYPES[0];

  const onLabelChange = (val: string) => {
    setEdges((eds) => eds.map((edge) => (edge.id === id ? { ...edge, data: { ...edge.data, label: val } } : edge)));
  };

  const onTypeChange = (typeId: string) => {
    setEdges((eds) => eds.map((edge) => (edge.id === id ? { ...edge, data: { ...edge.data, type: typeId } } : edge)));
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          stroke: currentType.color, 
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: Array.isArray(currentType.dash) ? currentType.dash.join(' ') : 'none',
          transition: 'all 0.3s ease',
          opacity: selected ? 1 : 0.6,
          filter: selected ? `drop-shadow(0 0 8px ${currentType.color})` : 'none'
        }} 
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex flex-col items-center group"
        >
          <div 
            className={`px-3 py-1 rounded-full border transition-all duration-300 flex items-center space-x-2 ${selected ? 'bg-slate-900 border-white scale-110 shadow-xl' : 'bg-slate-950/90 border-white/10'}`}
            style={{ borderColor: selected ? '#ffffff' : `${currentType.color}80` }}
          >
             <span className="text-[9px] font-black uppercase text-white tracking-widest">
                {data?.label || currentType.label}
             </span>
             {selected && <Edit3 size={10} className="text-blue-400" />}
          </div>

          <AnimatePresence>
            {selected && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="mt-2 bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl flex flex-col space-y-3 min-w-[200px] z-[100]"
              >
                 <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Flow Label</label>
                    <input
                      autoFocus
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-white uppercase outline-none focus:border-blue-500"
                      value={data?.label || ''}
                      onChange={(e) => onLabelChange(e.target.value)}
                      placeholder="e.g. SQL Traffic"
                    />
                 </div>
                 <div className="grid grid-cols-1 gap-1">
                    {FLOW_TYPES.map(t => (
                       <button 
                         key={t.id}
                         onClick={() => onTypeChange(t.id)}
                         className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${data?.type === t.id ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5'}`}
                       >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="text-[9px] font-black uppercase text-slate-300 tracking-tight">{t.label}</span>
                       </button>
                    ))}
                 </div>
                 <button 
                    onClick={() => setEdges(eds => eds.filter(e => e.id !== id))}
                    className="w-full py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg text-[9px] font-black uppercase transition-all"
                 >
                    Delete Vector
                 </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const nodeTypes = {
  device: DeviceNode,
  service: ServiceNode,
  external: ExternalNode
};

const edgeTypes = {
  labeled: LabeledEdge
};

// --- Dashboard Component ---

const ArchDashboard = ({ flows, onEdit, onAdd }: any) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const stats = useMemo(() => {
    if (!flows) return { total: 0, upToDate: 0, deprecated: 0, planned: 0 }
    return {
      total: flows.length,
      upToDate: flows.filter((f: any) => f.status === 'Up to date').length,
      deprecated: flows.filter((f: any) => f.status === 'Deprecated').length,
      planned: flows.filter((f: any) => f.status === 'Planned').length,
    }
  }, [flows])

  const filteredFlows = useMemo(() => {
    if (!flows) return []
    return flows.filter((f: any) => {
      const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'All' || f.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [flows, searchTerm, statusFilter])

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
       <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
             <div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Architecture Hub</h1>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">System Topology & Data Flow Manifests</p>
             </div>
             <button 
               onClick={onAdd}
               className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center space-x-3 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/20"
             >
                <Plus size={18} />
                <span className="text-sm font-black uppercase tracking-widest">New Architecture</span>
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Network size={64} className="text-blue-500" />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Maps</p>
                <p className="text-4xl font-black text-white mt-2">{stats.total}</p>
             </div>
             <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <CheckCircle2 size={64} className="text-emerald-500" />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Up to Date</p>
                <p className="text-4xl font-black text-emerald-500 mt-2">{stats.upToDate}</p>
             </div>
             <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <AlertTriangle size={64} className="text-rose-500" />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Deprecated</p>
                <p className="text-4xl font-black text-rose-500 mt-2">{stats.deprecated}</p>
             </div>
             <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Clock size={64} className="text-indigo-500" />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Planned</p>
                <p className="text-4xl font-black text-indigo-500 mt-2">{stats.planned}</p>
             </div>
          </div>

          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
             <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                   <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                   <input 
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     placeholder="Search Architectures..."
                     className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-blue-500/50"
                   />
                </div>
                <div className="flex items-center space-x-3">
                   <Filter size={16} className="text-slate-500" />
                   <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                      {['All', ...ARCH_STATUSES].map(s => (
                         <button
                           key={s}
                           onClick={() => setStatusFilter(s)}
                           className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${statusFilter === s ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
                         >
                            {s}
                         </button>
                      ))}
                   </div>
                </div>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-white/5">
                         <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Architecture Name</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Assets</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Updated</th>
                         <th className="px-6 py-4 text-right"></th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {filteredFlows.map((f: any) => (
                         <tr key={f.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4">
                               <div className="flex flex-col">
                                  <span className="text-sm font-black text-white tracking-tight uppercase">{f.name}</span>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[300px]">{f.description || 'No description provided'}</span>
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                                  {f.category}
                               </span>
                            </td>
                            <td className="px-6 py-4">
                               <StatusPill value={f.status} />
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex items-center space-x-2">
                                  <div className="flex -space-x-2">
                                     {f.nodes?.slice(0, 3).map((n: any, idx: number) => (
                                        <div key={idx} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-blue-400">
                                           {n.type === 'device' ? <Server size={12}/> : <Globe size={12}/>}
                                        </div>
                                     ))}
                                  </div>
                                  <span className="text-[10px] font-black text-slate-500 uppercase">{f.nodes?.length || 0} Assets</span>
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date(f.updated_at).toLocaleDateString()}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <button 
                                 onClick={() => onEdit(f)}
                                 className="p-2 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110"
                               >
                                  <ArrowRight size={16} />
                               </button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
       </div>
    </div>
  )
}

// --- Sidebar Palette ---

const SidebarPalette = ({ onAddNode, onBack }: { onAddNode: (type: string, data: any) => void, onBack: () => void }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('ALL') // ALL, DEVICE, EXTERNAL
  const [systemFilter, setSystemFilter] = useState('All Systems')
  
  const { data: devices } = useQuery({ queryKey: ['devices-arch'], queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) })
  const { data: externals } = useQuery({ queryKey: ['externals-arch'], queryFn: async () => (await (await apiFetch('/api/v1/intelligence/entities')).json()) })

  const systems = useMemo(() => {
    if (!devices) return ['All Systems']
    const uniqueSystems = Array.from(new Set(devices.map((d: any) => d.system).filter(Boolean)))
    return ['All Systems', ...uniqueSystems]
  }, [devices])

  const filteredResources = useMemo(() => {
    if (!devices || !externals) return []
    if (!searchTerm && systemFilter === 'All Systems' && activeTab === 'ALL') return []

    const devList = devices.filter((d: any) => {
       const matchesSearch = !searchTerm || d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.system?.toLowerCase().includes(searchTerm.toLowerCase())
       const matchesSystem = systemFilter === 'All Systems' || d.system === systemFilter
       return !d.is_deleted && matchesSearch && matchesSystem
    }).map((d: any) => ({ ...d, rType: 'device' }))
    
    const extList = externals.filter((e: any) => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map((e: any) => ({ ...e, rType: 'external' }))
    
    let combined = [...devList, ...extList]
    if (activeTab === 'DEVICE') combined = devList
    if (activeTab === 'EXTERNAL') combined = extList
    
    return combined
  }, [devices, externals, searchTerm, activeTab, systemFilter])

  return (
    <div className="w-80 glass-panel h-full border-r border-white/5 flex flex-col p-6 space-y-6">
       <div className="flex items-center justify-between">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all">
             <ChevronLeft size={20} />
          </button>
          <h2 className="text-[11px] font-black uppercase text-blue-400 tracking-[0.3em]">Resource Lab</h2>
          <div className="w-8" />
       </div>

       <div className="space-y-4">
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search Assets / IQ..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-[10px] font-black uppercase outline-none focus:border-blue-500/50"
             />
          </div>
          
          <div className="space-y-2">
             <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">System Context</label>
             <select 
               value={systemFilter}
               onChange={e => setSystemFilter(e.target.value)}
               className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold text-white uppercase outline-none focus:border-blue-500/50 appearance-none"
             >
                {systems.map(s => <option key={s} value={s}>{s}</option>)}
             </select>
          </div>

          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
             {['ALL', 'DEVICE', 'EXTERNAL'].map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === t ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
                >
                   {t}
                </button>
             ))}
          </div>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
          {filteredResources.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full opacity-30 text-center space-y-3">
                <Search size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Search or Filter<br/>to list assets</p>
             </div>
          )}
          {filteredResources.map((r: any) => (
             <div key={`${r.rType}-${r.id}`} className="group relative">
                <div className={`p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex flex-col space-y-2`}>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                         <div className={`p-2 rounded-lg ${r.rType === 'device' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                            {r.rType === 'device' ? <Server size={14}/> : <Globe size={14}/>}
                         </div>
                         <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-tight truncate max-w-[120px]">{r.name}</p>
                            <p className="text-[8px] font-bold text-slate-500 uppercase truncate">{r.type || r.owner_organization}</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => onAddNode(r.rType, r)}
                        className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      >
                         <Plus size={14}/>
                      </button>
                   </div>
                   {r.rType === 'device' && r.logical_services?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                         {r.logical_services.map((s: any) => (
                            <span key={s.id} className="text-[7px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                               {s.name}
                            </span>
                         ))}
                      </div>
                   )}
                </div>
             </div>
          ))}
       </div>
    </div>
  )
}

// --- Detail Pane ---

const DetailPane = ({ flow, onChange }: any) => {
   return (
      <div className="w-80 glass-panel h-full border-l border-white/5 flex flex-col p-6 space-y-8 overflow-y-auto custom-scrollbar">
         <div>
            <h2 className="text-[11px] font-black uppercase text-indigo-400 tracking-[0.3em] mb-6">Manifest Config</h2>
            
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Architecture Name</label>
                  <input 
                    value={flow.name}
                    onChange={e => onChange({ ...flow, name: e.target.value.toUpperCase() })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-indigo-500/50"
                    placeholder="Enter Name..."
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Category / Type</label>
                  <select 
                    value={flow.category}
                    onChange={e => onChange({ ...flow, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-indigo-500/50 appearance-none"
                  >
                     {ARCH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>

               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">System Status</label>
                  <div className="grid grid-cols-2 gap-2">
                     {ARCH_STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={() => onChange({ ...flow, status: s })}
                          className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${flow.status === s ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-500/10' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
                        >
                           {s}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    value={flow.description}
                    onChange={e => onChange({ ...flow, description: e.target.value })}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-indigo-500/50 resize-none"
                    placeholder="Architecture purpose and scope..."
                  />
               </div>
            </div>
         </div>

         <div className="pt-8 border-t border-white/5">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Integrity Metrics</h3>
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Nodes</span>
                  <span className="text-[10px] font-black text-white">{flow.nodes?.length || 0}</span>
               </div>
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Data Vectors</span>
                  <span className="text-[10px] font-black text-white">{flow.edges?.length || 0}</span>
               </div>
               <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden mt-2">
                  <div className="bg-indigo-500 h-full w-[75%]" />
               </div>
               <p className="text-[8px] font-bold text-slate-600 uppercase text-center">Topology Density: 0.82</p>
            </div>
         </div>
      </div>
   )
}

// --- Inner Component ---

function ArchDesignerInner({ initialView = 'dashboard', onExit }: { initialView?: 'dashboard' | 'editor', onExit?: () => void }) {
  const { fitView, project } = useReactFlow();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'dashboard' | 'editor' | 'service-editor'>(initialView);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeFlow, setActiveFlow] = useState<any>({
    id: null,
    name: 'NEW_ARCHITECTURE_MANIFEST',
    category: 'System',
    status: 'Up to date',
    description: ''
  });
  const [serviceContext, setServiceContext] = useState<any>(null);

  const { data: savedFlows } = useQuery({ 
    queryKey: ['data-flows'], 
    queryFn: async () => (await (await apiFetch('/api/v1/data-flows/')).json()) 
  });

  const { data: connections } = useQuery({
    queryKey: ['port-connections'],
    queryFn: async () => (await (await apiFetch('/api/v1/networks/connections')).json()),
    enabled: view === 'service-editor'
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = activeFlow.id ? `/api/v1/data-flows/${activeFlow.id}` : '/api/v1/data-flows/';
      const method = activeFlow.id ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['data-flows'] });
      setActiveFlow((prev: any) => ({ ...prev, id: data.id }));
      toast.success('Architecture Matrix Committed');
    }
  });

  const handleSave = () => {
    saveMutation.mutate({
      name: activeFlow.name,
      category: activeFlow.category,
      status: activeFlow.status,
      description: activeFlow.description,
      nodes: nodes,
      edges: edges,
      viewport_json: {}
    });
  };

  const handleEdit = (flow: any) => {
    setActiveFlow(flow);
    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);
    setView('editor');
    setTimeout(() => fitView(), 100);
  };

  const handleAdd = () => {
    setActiveFlow({
      id: null,
      name: 'NEW_ARCHITECTURE_MANIFEST',
      category: 'System',
      status: 'Up to date',
      description: ''
    });
    setNodes([]);
    setEdges([]);
    setView('editor');
  };

  const onAddResource = (rType: string, data: any) => {
    const parentId = `node-${rType}-${data.id}`;
    
    // Check if node already exists
    if (nodes.find(n => n.id === parentId)) {
       toast.error('Asset already in manifest');
       return;
    }

    const parentNode = {
      id: parentId,
      type: rType,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { ...data },
      dragHandle: '.glass-panel'
    };

    let newNodes = [parentNode];

    if (rType === 'device' && data.logical_services) {
      data.logical_services.forEach((s: any, idx: number) => {
        newNodes.push({
          id: `node-service-${s.id}`,
          type: 'service',
          parentNode: parentId,
          position: { x: 20, y: 60 + (idx * 45) },
          data: { ...s },
          extent: 'parent' as any
        } as any);
      });
    }

    setNodes((nds) => [...nds, ...newNodes]);
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ 
      ...params, 
      type: 'labeled', 
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
    }, eds)),
    [setEdges]
  );

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
     if (node.type === 'device' || node.type === 'external') {
        setServiceContext(node);
        setView('service-editor');
     }
  }, []);

  // Effect to populate service level editor
  useEffect(() => {
     if (view === 'service-editor' && serviceContext && connections) {
        const centerNodeId = serviceContext.id;
        const centerNodeData = serviceContext.data;
        
        // Find relevant connections from backend
        const relevantConns = connections.filter((c: any) => 
           c.source_device_id === centerNodeData.id || c.target_device_id === centerNodeData.id
        );

        const newNodes: Node[] = [
           { 
              id: centerNodeId, 
              type: serviceContext.type, 
              position: { x: 400, y: 300 }, 
              data: centerNodeData,
              style: { zIndex: 10 }
           }
        ];

        const newEdges: Edge[] = [];

        relevantConns.forEach((c: any, idx: number) => {
           const isSource = c.source_device_id === centerNodeData.id;
           const otherId = isSource ? c.target_device_id : c.source_device_id;
           const otherNodeId = `service-level-node-${otherId}`;
           
           // Simple positioning
           const angle = (idx / relevantConns.length) * 2 * Math.PI;
           const x = 400 + Math.cos(angle) * 300;
           const y = 300 + Math.sin(angle) * 300;

           if (!newNodes.find(n => n.id === otherNodeId)) {
              newNodes.push({
                 id: otherNodeId,
                 type: 'device', // Simplifying to device for now
                 position: { x, y },
                 data: { name: isSource ? c.server_b : c.server_a, id: otherId }
              });
           }

           newEdges.push({
              id: `edge-${c.id}`,
              source: isSource ? centerNodeId : otherNodeId,
              target: isSource ? otherNodeId : centerNodeId,
              type: 'labeled',
              data: { label: c.link_type },
              animated: true
           });
        });

        setNodes(newNodes);
        setEdges(newEdges);
        setTimeout(() => fitView(), 200);
     }
  }, [view, serviceContext, connections, fitView, setNodes, setEdges]);

  if (view === 'dashboard') {
     return <ArchDashboard flows={savedFlows} onEdit={handleEdit} onAdd={handleAdd} />
  }

  return (
    <div className="flex-1 relative flex h-full overflow-hidden">
       {view === 'editor' && <SidebarPalette onAddNode={onAddResource} onBack={() => setView('dashboard')} />}
       
       <div className="flex-1 bg-black/40 relative h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="arch-flow-canvas"
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls className="!bg-slate-900 !border-white/10 !rounded-xl overflow-hidden" />
            <MiniMap 
               className="!bg-slate-950 !border-white/10 !rounded-2xl" 
               nodeColor={(n: any) => n.type === 'service' ? '#10b981' : '#3b82f6'}
               maskColor="rgba(0,0,0,0.6)"
            />
            
            <Panel position="top-left" className="flex flex-col space-y-4">
               <div className="glass-panel p-2 rounded-2xl border border-white/10 flex items-center space-x-3">
                  <div className="bg-blue-600/20 text-blue-400 p-2 rounded-xl">
                     <Network size={16} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase text-white tracking-widest">{activeFlow.name}</span>
                     <span className="text-[8px] font-bold text-slate-500 uppercase">{activeFlow.category} // {activeFlow.status}</span>
                  </div>
                  <div className="h-6 w-px bg-white/10 ml-2" />
                  <button onClick={handleSave} className="p-2 bg-blue-600 text-white rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-blue-500/20">
                     <Save size={16}/>
                  </button>
                  {view === 'service-editor' && (
                     <button onClick={() => setView('editor')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                        Exit Drill-down
                     </button>
                  )}
               </div>

               {view === 'service-editor' && (
                  <div className="glass-panel p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 animate-in fade-in slide-in-from-left-4">
                     <div className="flex items-center space-x-2 text-blue-400 mb-2">
                        <Activity size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Service Level Drill-down</span>
                     </div>
                     <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed max-w-[200px]">
                        Isolating {serviceContext?.data.name}. Connections shown are derived from active port mapping and data flow telemetry.
                     </p>
                  </div>
               )}
            </Panel>

            <Panel position="top-right">
               <div className="glass-panel p-4 rounded-[30px] border border-white/5 flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                     <div className="w-2 h-2 rounded-full bg-blue-500" />
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Internal Asset</span>
                  </div>
                  <div className="flex items-center space-x-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500" />
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Logical Service</span>
                  </div>
                  <div className="flex items-center space-x-2">
                     <div className="w-2 h-2 rounded-full bg-indigo-500" />
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Partner IQ System</span>
                  </div>
               </div>
            </Panel>
          </ReactFlow>
       </div>

       {view === 'editor' && <DetailPane flow={activeFlow} onChange={setActiveFlow} />}
    </div>
  )
}

export default function DataFlowDesigner() {
  return (
    <ReactFlowProvider>
       <ArchDesignerInner />
    </ReactFlowProvider>
  )
}
