import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Network, Plus, Link as LinkIcon, ArrowRightLeft, RefreshCcw, Trash2, Edit2, X, Check, MoreVertical, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from 'ag-grid-react'
import toast from 'react-hot-toast'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { ConfigRegistryModal } from "./ConfigRegistry"

export default function NetworkFabric() {
  const queryClient = useQueryClient()
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [editingLink, setEditingLink] = useState<any>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [connData, setConnData] = useState<any>({
    device_a_id: '', source_port: '', device_b_id: '', target_port: '',
    purpose: 'Data', speed_gbps: 10, unit: 'Gbps', direction: 'Bidirectional'
  })

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await fetch('/api/v1/settings/options')).json() })
  const { data: connections, isLoading } = useQuery({ queryKey: ['connections'], queryFn: async () => (await fetch('/api/v1/networks/connections')).json() })
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await fetch('/api/v1/devices/')).json() })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingLink ? `/api/v1/networks/connections/${editingLink.id}` : '/api/v1/networks/connections'
      const method = editingLink ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      toast.success(editingLink ? 'Link Matrix Updated' : 'New Link Established')
      setShowConnectModal(false); setEditingLink(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/networks/connections/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['connections'] }); toast.success('Link Severed') }
  })

  const columnDefs = useMemo(() => [
    { 
      headerName: "Source Entity", 
      field: "server_a", 
      flex: 1,
      cellClass: 'text-center font-bold text-blue-400',
      headerClass: 'text-center'
    },
    { 
      headerName: "Source Port", 
      field: "source_port", 
      width: 120,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 rounded font-mono">{p.value}</span>
    },
    { 
      headerName: "Link Vector", 
      width: 100, 
      cellClass: "justify-center text-center",
      headerClass: 'text-center',
      cellRenderer: (p: any) => <div className="flex items-center justify-center text-slate-600"><ArrowRightLeft size={14}/></div> 
    },
    { 
      headerName: "Peer Entity", 
      field: "server_b", 
      flex: 1,
      cellClass: 'text-center font-bold text-emerald-400',
      headerClass: 'text-center'
    },
    { 
      headerName: "Peer Port", 
      field: "target_port", 
      width: 120,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 rounded font-mono">{p.value}</span>
    },
    { field: "purpose", headerName: "Purpose", width: 120, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "speed", headerName: "Throughput", width: 100, cellClass: "font-mono text-blue-300 text-center", headerClass: 'text-center' },
    { field: "direction", headerName: "Mode", width: 120, cellClass: 'text-center', headerClass: 'text-center' },
    {
      headerName: "Ops",
      width: 100,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <button onClick={() => { 
             setEditingLink(p.data); 
             setConnData({
               ...p.data,
               device_a_id: p.data.source_device_id,
               device_b_id: p.data.target_device_id,
               port_a: p.data.source_port,
               port_b: p.data.target_port
             }); 
             setShowConnectModal(true) 
           }} className="p-1.5 hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 rounded transition-colors"><Edit2 size={14}/></button>
           <button onClick={() => { if(confirm('Sever this connection?')) deleteMutation.mutate(p.data.id) }} className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded transition-colors"><Trash2 size={14}/></button>
        </div>
      )
    }
  ], []) as any

  const purposes = ["Data", "Management", "Storage/iSCSI", "Backup", "vMotion", "Replication", "Heartbeat"]

  const resetForm = () => {
    setConnData({
      device_a_id: '', source_port: '', device_b_id: '', target_port: '',
      purpose: 'Data', speed_gbps: 10, unit: 'Gbps', direction: 'Bidirectional'
    })
    setEditingLink(null)
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight italic text-blue-400">Network Fabric</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Physical Interconnect & Logical Topology</p>
        </div>
        <div className="flex items-center space-x-3">
            <button onClick={() => setShowConfig(true)} className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-500 hover:text-blue-400 transition-all" title="Fabric Config">
                <Settings size={18} />
            </button>
            <button onClick={() => { resetForm(); setShowConnectModal(true) }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
            + Establish Link
            </button>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <RefreshCcw size={32} className="text-blue-400 animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Mapping Topology...</p>
          </div>
        )}
        <AgGridReact 
          rowData={connections || []} 
          columnDefs={columnDefs} 
          headerHeight={28}
          rowHeight={28}
        />
      </div>

      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[500px] p-10 rounded-[40px] space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center space-x-4 text-blue-400">
                 <LinkIcon size={24} />
                 <span>{editingLink ? 'Modify Connectivity' : 'Link Establishment'}</span>
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Source Entity *</label>
                  <select value={connData.device_a_id} onChange={e => setConnData({...connData, device_a_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 mt-1 text-xs outline-none focus:border-blue-500">
                    <option value="">Select Registry Asset...</option>
                    {devices?.map((d: any) => <option key={d.id} value={d.id}>{d.name} [{d.type}]</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Source Port *</label>
                  <input value={connData.source_port || connData.port_a || ''} onChange={e => setConnData({...connData, source_port: e.target.value, port_a: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 mt-1 text-xs" placeholder="eth0" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Direction</label>
                  <select value={connData.direction} onChange={e => setConnData({...connData, direction: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 mt-1 text-xs">
                    <option>Bidirectional</option><option>Unidirectional</option>
                  </select>
                </div>
                <div className="col-span-2 border-t border-white/5 pt-4">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Peer Entity *</label>
                  <select value={connData.device_b_id} onChange={e => setConnData({...connData, device_b_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 mt-1 text-xs outline-none focus:border-blue-500">
                    <option value="">Select Registry Asset...</option>
                    {devices?.filter((d:any) => d.id != connData.device_a_id).map((d: any) => <option key={d.id} value={d.id}>{d.name} [{d.type}]</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Peer Port *</label>
                  <input value={connData.target_port || connData.port_b || ''} onChange={e => setConnData({...connData, target_port: e.target.value, port_b: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 mt-1 text-xs" placeholder="Te1/1/1" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Link Purpose *</label>
                  <select value={connData.purpose} onChange={e => setConnData({...connData, purpose: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 mt-1 text-xs outline-none focus:border-blue-500">
                    {Array.isArray(options) && options.filter((o:any) => o.category === 'LinkPurpose').map((p:any) => <option key={p.id} value={p.value}>{p.label}</option>)}
                    {(!Array.isArray(options) || options.filter((o:any) => o.category === 'LinkPurpose').length === 0) && ["Data", "Management", "Storage/iSCSI", "Backup", "vMotion", "Replication", "Heartbeat"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Speed *</label>
                  <input type="number" value={connData.speed_gbps} onChange={e => setConnData({...connData, speed_gbps: parseFloat(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 mt-1 text-xs" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Unit</label>
                  <select value={connData.unit} onChange={e => setConnData({...connData, unit: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 mt-1 text-xs">
                    <option>Gbps</option><option>Mbps</option><option>Tbps</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 pt-4 border-t border-white/5">
                <button onClick={() => setShowConnectModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500">Abort</button>
                <button onClick={() => {
                  if(!connData.device_a_id || (!connData.source_port && !connData.port_a) || !connData.device_b_id || (!connData.target_port && !connData.port_b)) {
                    return toast.error("Entity and Port mapping required")
                  }
                  mutation.mutate(connData)
                }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Commit Link</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfigRegistryModal 
        isOpen={showConfig} 
        onClose={() => setShowConfig(false)} 
        title="Network Fabric Config"
        sections={[
            { title: "Link Purposes", category: "LinkPurpose", icon: Network }
        ]}
      />

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(15, 23, 42, 0.9);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 10px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-size: 9px !important; justify-content: center !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; padding-left: 8px !important; }
      `}</style>
    </div>
  )
}
