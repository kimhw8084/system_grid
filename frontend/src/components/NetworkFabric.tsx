import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Network, Share2, Plus, Zap, ShieldCheck, X, ArrowRightLeft, Link, Activity, RefreshCcw, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export default function NetworkFabric() {
  const queryClient = useQueryClient()
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [connData, setConnData] = useState({ 
    device_a_id: '', port_a: '', device_b_id: '', port_b: '', 
    purpose: 'Data Plane', speed: 10, unit: 'Gbps', direction: 'Bidirectional'
  })

  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await fetch('/api/v1/devices/')).json() })
  const { data: connections, isLoading } = useQuery({ queryKey: ['connections'], queryFn: async () => (await fetch('/api/v1/networks/connections')).json() })

  const addConnection = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/v1/networks/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Link establishment failed') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      setShowConnectModal(false)
    },
    onError: (err: any) => alert(err.message)
  })

  const deleteConnection = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/networks/connections/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] })
  })

  const columnDefs = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true, filter: 'agNumberColumnFilter' },
    { field: 'server_a', headerName: 'Source Entity', flex: 1, filter: true },
    { field: 'port_a', headerName: 'Source Port', width: 120, filter: true, cellClass: 'font-mono text-blue-400 font-bold uppercase' },
    { 
      field: 'direction', 
      headerName: 'Flow', 
      width: 100, 
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center h-full text-slate-500">
           <ArrowRightLeft size={14} />
        </div>
      )
    },
    { field: 'server_b', headerName: 'Peer Entity', flex: 1, filter: true },
    { field: 'port_b', headerName: 'Peer Port', width: 120, filter: true, cellClass: 'font-mono text-blue-400 font-bold uppercase' },
    { 
      field: 'purpose', 
      headerName: 'Link Purpose', 
      width: 180, 
      filter: true,
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full">
           <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[9px] font-black uppercase tracking-widest">{params.value}</span>
        </div>
      )
    },
    { field: 'speed', headerName: 'Bandwidth', width: 120, filter: true, cellClass: 'text-emerald-400 font-bold uppercase' },
    {
      headerName: 'Actions',
      width: 80,
      pinned: 'right',
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center h-full">
           <button onClick={() => { if(confirm('Sever this network link?')) deleteConnection.mutate(params.data.id) }} className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"><Trash2 size={14}/></button>
        </div>
      )
    }
  ], [deleteConnection])

  const purposes = [
    'Data Plane', 'Management', 'Storage (ISCSI/NFS)', 'vMotion / Live Migration', 
    'Heartbeat / Keepalive', 'Backup / Replication', 'OOB (Out of Band)', 
    'Cluster Interconnect', 'Public Facing', 'DMZ Ingress', 'SAN Fabric'
  ]

  return (
    <div className="h-full flex flex-col space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase">Network Fabric & Interconnects</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Physical and logical link topology management</p>
        </div>
        <button onClick={() => setShowConnectModal(true)} className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all">
           <Link size={14} />
           <span>Establish New Link</span>
        </button>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <RefreshCcw size={32} className="text-blue-400 animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Tracing Physical Links...</p>
          </div>
        )}
        <AgGridReact
          rowData={connections || []}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, sortable: true, filter: true }}
          rowSelection="multiple"
          animateRows={true}
          headerHeight={48}
          rowHeight={52}
        />
      </div>

      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[500px] p-8 rounded-3xl space-y-6">
              <h2 className="text-xl font-bold uppercase tracking-tight flex items-center space-x-3 text-blue-400">
                 <Link size={20} />
                 <span>Link Establishment</span>
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Source Entity</label>
                  <select onChange={e => setConnData({...connData, device_a_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs focus:border-blue-500/50">
                    <option value="">Select Asset...</option>
                    {devices?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Source Port</label>
                  <input onChange={e => setConnData({...connData, port_a: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs" placeholder="eth0" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Direction</label>
                  <select onChange={e => setConnData({...connData, direction: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs">
                    <option value="Bidirectional">Bidirectional</option>
                    <option value="Unidirectional">Unidirectional</option>
                  </select>
                </div>
                <div className="col-span-2 border-t border-white/5 pt-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Peer Entity</label>
                  <select onChange={e => setConnData({...connData, device_b_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs focus:border-blue-500/50">
                    <option value="">Select Asset...</option>
                    {devices?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Peer Port</label>
                  <input onChange={e => setConnData({...connData, port_b: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs" placeholder="Te1/1/1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bandwidth</label>
                  <div className="flex space-x-2">
                    <input type="number" value={connData.speed} onChange={e => setConnData({...connData, speed: parseFloat(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 mt-1 text-xs" />
                    <select value={connData.unit} onChange={e => setConnData({...connData, unit: e.target.value})} className="bg-slate-900 border border-white/10 rounded-xl px-2 py-2 mt-1 text-[10px] font-bold">
                      <option>Gbps</option>
                      <option>Mbps</option>
                    </select>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol / Purpose</label>
                  <select onChange={e => setConnData({...connData, purpose: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-xs">
                    {purposes.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => setShowConnectModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-white transition-colors">Abort</button>
                <button onClick={() => { if(connData.device_a_id && connData.device_b_id) addConnection.mutate(connData) }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Establish Link</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(15, 23, 42, 0.6);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 11px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-size: 10px !important; }
        .ag-cell { display: flex; align-items: center; }
      `}</style>
    </div>
  )
}
