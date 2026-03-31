import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Network, Plus, Link as LinkIcon, ArrowRightLeft, RefreshCcw, Trash2, Edit2, X, Check, MoreVertical, Settings, Search, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from 'ag-grid-react'
import toast from 'react-hot-toast'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { apiFetch } from "../api/apiClient"
import { ConfigRegistryModal } from "./ConfigRegistry"
import { ConfirmationModal } from "./shared/ConfirmationModal"
import { StyledSelect } from "./shared/StyledSelect"

export default function NetworkFabric() {
  const queryClient = useQueryClient()
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [editingLink, setEditingLink] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })
  const [connData, setConnData] = useState<any>({
    device_a_id: '', source_port: '', device_b_id: '', target_port: '',
    link_type: 'Data', purpose: '', speed_gbps: 10, unit: 'Gbps', direction: 'Bidirectional'
  })

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) })
  const { data: connections, isLoading } = useQuery({ queryKey: ['connections'], queryFn: async () => (await (await apiFetch('/api/v1/networks/connections')).json()) })
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingLink ? `/api/v1/networks/connections/${editingLink.id}` : '/api/v1/networks/connections'
      const method = editingLink ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      toast.success(editingLink ? 'Link Matrix Updated' : 'New Link Established')
      setShowConnectModal(false); setEditingLink(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/networks/connections/${id}`, { method: 'DELETE' })
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      toast.success('Link Severed')
      setConfirmModal({ ...confirmModal, isOpen: false })
    },
    onError: (e: any) => toast.error(e.message)
  })

  const columnDefs = useMemo(() => [
    { 
      headerName: "Src", 
      field: "server_a", 
      flex: 1,
      cellClass: 'text-center font-bold text-blue-400',
      headerClass: 'text-center'
    },
    { 
      headerName: "Src Port", 
      field: "source_port", 
      width: 100,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 rounded font-mono">{p.value}</span>
    },
    { 
      headerName: "Peer", 
      field: "server_b", 
      flex: 1,
      cellClass: 'text-center font-bold text-emerald-400',
      headerClass: 'text-center'
    },
    { 
      headerName: "Peer Port", 
      field: "target_port", 
      width: 100,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 rounded font-mono">{p.value}</span>
    },
    { field: "link_type", headerName: "Type", width: 110, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "purpose", headerName: "Purpose", flex: 1.5, cellClass: 'text-center text-slate-400', headerClass: 'text-center' },
    { field: "speed", headerName: "Gbps", width: 80, cellClass: "font-mono text-blue-300 text-center", headerClass: 'text-center' },
    { field: "direction", headerName: "Mode", width: 100, cellClass: 'text-center', headerClass: 'text-center' },
    {
      headerName: "Ops",
      width: 80,
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
           <button onClick={() => setConfirmModal({ isOpen: true, title: 'Sever Link', message: 'Sever this physical connection?', onConfirm: () => deleteMutation.mutate(p.data.id) })} className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded transition-colors"><Trash2 size={14}/></button>
        </div>
      )
    }
  ], []) as any

  const purposes = ["Data", "Management", "Storage/iSCSI", "Backup", "vMotion", "Replication", "Heartbeat"]

  const resetForm = () => {
    setConnData({
      device_a_id: '', source_port: '', device_b_id: '', target_port: '',
      link_type: 'Data', purpose: '', speed_gbps: 10, unit: 'Gbps', direction: 'Bidirectional'
    })
    setEditingLink(null)
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic">Network</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Physical Interconnect & Logical Topology</p>
           </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SEARCH FABRIC..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>

          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5">
             <button onClick={() => setShowConfig(true)} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Fabric Config">
                <Settings size={16} />
             </button>
          </div>

          <button onClick={() => { resetForm(); setShowConnectModal(true) }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
            + Add Network
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
          quickFilterText={searchTerm}
        />
      </div>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
      />

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
                  <StyledSelect
                    label="Source Entity *"
                    value={connData.device_a_id}
                    onChange={e => setConnData({...connData, device_a_id: e.target.value})}
                    options={devices?.map((d: any) => ({ value: String(d.id), label: `${d.name} [${d.type}]` })) || []}
                    placeholder="Select Registry Asset..."
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-1">Source Port *</label>
                  <input value={connData.source_port || connData.port_a || ''} onChange={e => setConnData({...connData, source_port: e.target.value, port_a: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" placeholder="eth0" />
                </div>
                <StyledSelect
                    label="Direction"
                    value={connData.direction}
                    onChange={e => setConnData({...connData, direction: e.target.value})}
                    options={[{value: 'Bidirectional', label: 'Bidirectional'}, {value: 'Unidirectional', label: 'Unidirectional'}]}
                />
                <div className="col-span-2 border-t border-white/5 pt-4">
                  <StyledSelect
                    label="Peer Entity *"
                    value={connData.device_b_id}
                    onChange={e => setConnData({...connData, device_b_id: e.target.value})}
                    options={devices?.filter((d:any) => d.id != connData.device_a_id).map((d: any) => ({ value: String(d.id), label: `${d.name} [${d.type}]` })) || []}
                    placeholder="Select Registry Asset..."
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-1">Peer Port *</label>
                  <input value={connData.target_port || connData.port_b || ''} onChange={e => setConnData({...connData, target_port: e.target.value, port_b: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" placeholder="Te1/1/1" />
                </div>
                <StyledSelect
                    label="Link Type *"
                    value={connData.link_type}
                    onChange={e => setConnData({...connData, link_type: e.target.value})}
                    options={Array.isArray(options) && options.filter((o:any) => o.category === 'LinkPurpose').length > 0 
                        ? options.filter((o:any) => o.category === 'LinkPurpose').map((p:any) => ({ value: p.value, label: p.label }))
                        : ["Data", "Management", "Storage/iSCSI", "Backup", "vMotion", "Replication", "Heartbeat"].map(p => ({ value: p, label: p }))
                    }
                />
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-1">Purpose / Description</label>
                  <input value={connData.purpose || ''} onChange={e => setConnData({...connData, purpose: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" placeholder="e.g. Primary Data Uplink for Prod..." />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-1">Speed *</label>
                  <input type="number" value={connData.speed_gbps} onChange={e => setConnData({...connData, speed_gbps: parseFloat(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" />
                </div>
                <StyledSelect
                    label="Unit"
                    value={connData.unit}
                    onChange={e => setConnData({...connData, unit: e.target.value})}
                    options={[{value: 'Gbps', label: 'Gbps'}, {value: 'Mbps', label: 'Mbps'}, {value: 'Tbps', label: 'Tbps'}]}
                />
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
