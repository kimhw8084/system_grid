import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Network, Plus, Link as LinkIcon, ArrowRightLeft, RefreshCcw, Trash2, Edit2, X, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export default function NetworkFabric() {
  const queryClient = useQueryClient()
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [editingLink, setEditingLink] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [connData, setConnData] = useState({ 
    device_a_id: '', source_port: '', device_b_id: '', target_port: '', 
    purpose: 'Data Plane', speed_gbps: 10, cable_type: 'DAC', direction: 'Bidirectional'
  })

  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await fetch('/api/v1/devices/')).json() })
  const { data: connections, isLoading } = useQuery({ queryKey: ['connections'], queryFn: async () => (await fetch('/api/v1/networks/connections')).json() })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingLink ? `/api/v1/networks/connections/${editingLink.id}` : '/api/v1/networks/connections'
      const method = editingLink ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      setShowConnectModal(false)
      setEditingLink(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/networks/connections/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] })
  })

  const columnDefs = useMemo(() => [
    { field: 'id', headerName: '', width: 40, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left' },
    { field: 'server_a', headerName: 'Source Entity', flex: 1, filter: true, cellClass: 'font-bold text-blue-100' },
    { field: 'port_a', headerName: 'Port', width: 100, filter: true, cellClass: 'font-mono text-blue-400 uppercase font-black' },
    { 
      field: 'direction', 
      headerName: 'Flow', 
      width: 100, 
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center h-full text-slate-500">
           {params.data.direction === 'Bidirectional' ? <ArrowRightLeft size={14} /> : <div className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500/50" />}
        </div>
      )
    },
    { field: 'server_b', headerName: 'Peer Entity', flex: 1, filter: true, cellClass: 'font-bold text-blue-100' },
    { field: 'port_b', headerName: 'Port', width: 100, filter: true, cellClass: 'font-mono text-blue-400 uppercase font-black' },
    { 
      field: 'purpose', 
      headerName: 'Purpose', 
      width: 150, 
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full">
           <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[8px] font-black uppercase tracking-widest">{params.value}</span>
        </div>
      )
    },
    { field: 'speed', headerName: 'Speed', width: 90, filter: true, cellClass: 'text-emerald-400 font-bold' },
    {
      headerName: 'Ops',
      width: 100,
      pinned: 'right',
      cellRenderer: (params: any) => (
        <div className="flex items-center space-x-2 h-full">
           <button onClick={() => { setEditingLink(params.data); setConnData(params.data); setShowConnectModal(true) }} className="p-1 hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 rounded transition-colors"><Edit2 size={14}/></button>
           <button onClick={() => { if(confirm('Sever this connection?')) deleteMutation.mutate(params.data.id) }} className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded transition-colors"><Trash2 size={14}/></button>
        </div>
      )
    }
  ], [deleteMutation])

  const purposes = [
    'Data Plane', 'Management', 'Storage (ISCSI/NFS)', 'vMotion', 'Heartbeat', 'Backup', 'OOB', 'SAN Fabric', 'Cluster Interconnect'
  ]

  return (
    <div className="h-full flex flex-col space-y-4 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase italic">Network Fabric Registry</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Physical Interconnect & Logical Topology Management</p>
        </div>
        <button onClick={() => { setEditingLink(null); setShowConnectModal(true) }} className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all">
           <LinkIcon size={14} />
           <span>Establish New Link</span>
        </button>
      </div>

      <div className="flex-1 glass-panel rounded-xl overflow-hidden ag-theme-alpine-dark relative">
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
          headerHeight={32}
          rowHeight={32}
          onSelectionChanged={(e) => setSelectedIds(e.api.getSelectedNodes().map(n => n.data.id))}
        />
      </div>

      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[550px] p-8 rounded-[30px] space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center space-x-3 text-blue-400">
                 <LinkIcon size={24} />
                 <span>{editingLink ? 'Modify Connectivity' : 'Link Establishment'}</span>
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Source Entity</label>
                  <select value={connData.device_a_id} onChange={e => setConnData({...connData, device_a_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 mt-1 text-xs outline-none focus:border-blue-500">
                    <option value="">Select Registry Asset...</option>
                    {devices?.map((d: any) => <option key={d.id} value={d.id}>{d.name} [{d.type}]</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Source Port</label>
                  <input value={connData.source_port} onChange={e => setConnData({...connData, source_port: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 mt-1 text-xs" placeholder="eth0" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Direction</label>
                  <select value={connData.direction} onChange={e => setConnData({...connData, direction: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 mt-1 text-xs">
                    <option>Bidirectional</option><option>Unidirectional</option>
                  </select>
                </div>
                <div className="col-span-2 border-t border-white/5 pt-4">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Peer Entity</label>
                  <select value={connData.device_b_id} onChange={e => setConnData({...connData, device_b_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 mt-1 text-xs outline-none focus:border-blue-500">
                    <option value="">Select Registry Asset...</option>
                    {devices?.map((d: any) => <option key={d.id} value={d.id}>{d.name} [{d.type}]</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Peer Port</label>
                  <input value={connData.target_port} onChange={e => setConnData({...connData, target_port: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 mt-1 text-xs" placeholder="Te1/1/1" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Link Purpose</label>
                  <select value={connData.purpose} onChange={e => setConnData({...connData, purpose: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 mt-1 text-xs">
                    {purposes.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => setShowConnectModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400">Abort</button>
                <button onClick={() => mutation.mutate(connData)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Commit Link</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-size: 9px !important; }
        .ag-cell { display: flex; align-items: center; padding-left: 8px !important; }
      `}</style>
    </div>
  )
}
