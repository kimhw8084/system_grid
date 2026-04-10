import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Database, Plus, Search, Filter, ExternalLink, 
  Trash2, Edit2, Shield, Cpu, Network, X, Check,
  ArrowRightLeft, Link as LinkIcon, Key, Info, Globe,
  Activity, Download, Copy, Settings, RefreshCcw, Save, Layers
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from 'ag-grid-react'
import toast from 'react-hot-toast'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { apiFetch } from "../api/apiClient"
import { StyledSelect } from "./shared/StyledSelect"
import { ConfirmationModal } from "./shared/ConfirmationModal"

export default function ExternalIntelligence() {
  const queryClient = useQueryClient()
  const gridRef = useRef<any>(null)
  const [activeTab, setActiveTab] = useState<'Registry' | 'Connectivity'>('Registry')
  const [searchTerm, setSearchTerm] = useState('')
  const [showEntityModal, setShowEntityModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [editingEntity, setEditingEntity] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  // Style Lab State
  const [fontSize, setFontSize] = useState(10)
  const [rowDensity, setRowDensity] = useState(10)
  const [showStyleLab, setShowStyleLab] = useState(false)

  // Data fetching
  const { data: entities, isLoading: entLoading } = useQuery({ 
    queryKey: ['external-entities'], 
    queryFn: async () => (await (await apiFetch('/api/v1/intelligence/entities')).json()) 
  })
  const { data: links, isLoading: linkLoading } = useQuery({ 
    queryKey: ['external-links'], 
    queryFn: async () => (await (await apiFetch('/api/v1/intelligence/links')).json()) 
  })
  const { data: devices } = useQuery({ 
    queryKey: ['devices'], 
    queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) 
  })

  // Mutations
  const entityMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingEntity ? `/api/v1/intelligence/entities/${editingEntity.id}` : '/api/v1/intelligence/entities'
      const method = editingEntity ? 'PUT' : 'POST'
      return (await apiFetch(url, { method, body: JSON.stringify(data) })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      toast.success(editingEntity ? 'Entity Synchronized' : 'External System Registered')
      setShowEntityModal(false); setEditingEntity(null)
    }
  })

  const linkMutation = useMutation({
    mutationFn: async (data: any) => {
      return (await apiFetch('/api/v1/intelligence/links', { method: 'POST', body: JSON.stringify(data) })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-links'] })
      toast.success('Interconnect Established')
      setShowLinkModal(false)
    }
  })

  const deleteEntityMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/intelligence/entities/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      toast.success('System Purged from Registry')
      setConfirmModal({ ...confirmModal, isOpen: false })
    },
    onError: (e: any) => toast.error(e.message)
  })

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: number) => {
      return (await apiFetch(`/api/v1/intelligence/links/${id}`, { method: 'DELETE' })).json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-links'] })
      toast.success('Link Severed')
      setConfirmModal({ ...confirmModal, isOpen: false })
    }
  })

  // Grid Definitions
  const entityColumns = useMemo(() => [
    { field: "name", headerName: "System Name", flex: 1.5, cellClass: "text-blue-400 font-black uppercase tracking-tight", headerClass: 'text-center' },
    { field: "type", headerName: "Type", flex: 1, cellClass: "text-center font-bold text-slate-400", headerClass: 'text-center' },
    { field: "ip_address", headerName: "Primary IP", flex: 1, cellClass: "font-mono text-center text-emerald-400 font-bold", headerClass: 'text-center' },
    { field: "owner_organization", headerName: "Partner / Owner", flex: 1.2, cellClass: "text-center font-bold text-slate-300", headerClass: 'text-center' },
    { 
      headerName: "Ops", 
      width: 100, 
      pinned: 'right', 
      cellClass: "text-center",
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
          <button onClick={() => { setEditingEntity(p.data); setShowEntityModal(true) }} className="p-1.5 hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 rounded transition-colors"><Edit2 size={12}/></button>
          <button onClick={() => setConfirmModal({ isOpen: true, title: 'Purge System', message: 'Purge this external entity? All links must be severed first.', onConfirm: () => deleteEntityMutation.mutate(p.data.id) })} className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded transition-colors"><Trash2 size={12}/></button>
        </div>
      )
    }
  ], [deleteEntityMutation])

  const linkColumns = useMemo(() => [
    { field: "external_entity_name", headerName: "External Peer", flex: 1, cellClass: "text-blue-400 font-black uppercase tracking-tight", headerClass: 'text-center' },
    { 
      field: "direction", 
      headerName: "Flow", 
      width: 100, 
      cellClass: "text-center",
      cellRenderer: (p: any) => (
        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase inline-block ${p.value === 'Upstream' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
          {p.value}
        </div>
      )
    },
    { field: "device_name", headerName: "Internal Asset", flex: 1, cellClass: "text-emerald-400 font-black text-center uppercase tracking-tight", headerClass: 'text-center' },
    { field: "service_name", headerName: "Logical Service", flex: 1, cellClass: "text-center italic text-slate-400 font-bold", headerClass: 'text-center', cellRenderer: (p: any) => p.value || '-' },
    { field: "purpose", headerName: "Interconnect Purpose", flex: 1.5, headerClass: 'text-left', cellClass: 'font-bold text-slate-500' },
    { field: "protocol", headerName: "Prot", width: 80, cellClass: "text-center font-mono text-[9px] font-black uppercase", headerClass: 'text-center' },
    { field: "port", headerName: "Port", width: 80, cellClass: "text-center font-mono text-indigo-300 font-black", headerClass: 'text-center' },
    { 
      headerName: "Ops", 
      width: 80, 
      pinned: 'right', 
      cellClass: "text-center",
      cellRenderer: (p: any) => (
        <button onClick={() => setConfirmModal({ isOpen: true, title: 'Sever Link', message: 'Sever this interconnect?', onConfirm: () => deleteLinkMutation.mutate(p.data.id) })} className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded transition-colors"><Trash2 size={12}/></button>
      )
    }
  ], [deleteLinkMutation])

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic">Partner IQ</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">External Interconnect & Intelligence Matrix</p>
           </div>

           <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 ml-2">
                <button 
                  onClick={() => setActiveTab('Registry')} 
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${activeTab === 'Registry' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Globe size={14}/> <span>Registry</span>
                </button>
                <button 
                  onClick={() => setActiveTab('Connectivity')} 
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${activeTab === 'Connectivity' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <LinkIcon size={14}/> <span>Connectivity</span>
                </button>
           </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={`SCAN ${activeTab.toUpperCase()}...`}
                className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-indigo-500/50 w-64 transition-all" 
             />
          </div>

          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5 space-x-1">
             <button onClick={() => setShowStyleLab(!showStyleLab)} className={`p-1.5 hover:bg-white/10 ${showStyleLab ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Toggle Style Lab">
                <Activity size={16} />
             </button>
             <button className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Matrix Registry Config">
                <Settings size={16} />
             </button>
          </div>

          <button 
             onClick={() => { setEditingEntity(null); activeTab === 'Registry' ? setShowEntityModal(true) : setShowLinkModal(true) }}
             className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
          >
             + {activeTab === 'Registry' ? 'Register' : 'Map Link'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showStyleLab && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md">
               <div className="flex items-center space-x-12">
                  <div className="flex items-center space-x-3">
                     <Activity size={16} className="text-blue-400" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">View Density Laboratory</span>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                     <div className="flex items-center space-x-4">
                        <span className="text-[9px] font-black text-slate-500 uppercase">Font Size</span>
                        <div className="flex items-center space-x-2">
                            <input 
                            type="range" min="8" max="14" step="1" 
                            value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                            className="w-32 accent-blue-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] text-white w-4 font-black">{fontSize}px</span>
                        </div>
                     </div>

                     <div className="flex items-center space-x-4 border-l border-white/10 pl-6">
                        <span className="text-[9px] font-black text-slate-500 uppercase">Row Density</span>
                        <div className="flex items-center space-x-2">
                            <input 
                            type="range" min="4" max="24" step="2" 
                            value={rowDensity} onChange={e => setRowDensity(Number(e.target.value))}
                            className="w-32 accent-indigo-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] text-white w-4 font-black">{rowDensity}px</span>
                        </div>
                     </div>
                  </div>
               </div>
               <button onClick={() => setShowStyleLab(false)} className="text-slate-500 hover:text-white transition-colors"><X size={16}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative border-white/5">
        {(entLoading || linkLoading) && (
           <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm space-y-4">
              <RefreshCcw size={32} className="text-indigo-400 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Synchronizing Global Matrix...</p>
           </div>
        )}
        <AgGridReact 
          ref={gridRef}
          rowData={activeTab === 'Registry' ? entities : links} 
          columnDefs={(activeTab === 'Registry' ? entityColumns : linkColumns) as any}
          headerHeight={32}
          rowHeight={32 + rowDensity}
          quickFilterText={searchTerm}
          suppressCellFocus={true}
        />
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showEntityModal && (
          <EntityForm 
            entity={editingEntity} 
            onClose={() => { setShowEntityModal(false); setEditingEntity(null) }}
            onSave={(data: any) => entityMutation.mutate(data)}
            isPending={entityMutation.isPending}
          />
        )}
        {showLinkModal && (
          <LinkForm 
            entities={entities}
            devices={devices}
            onClose={() => setShowLinkModal(false)}
            onSave={(data: any) => linkMutation.mutate(data)}
            isPending={linkMutation.isPending}
          />
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
      />

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: #1a1b26;
          --ag-header-background-color: #24283b;
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #3b82f6;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: ${fontSize}px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { 
            font-weight: 900 !important; 
            text-transform: uppercase !important; 
            letter-spacing: 0.1em !important; 
            font-size: ${fontSize}px !important; 
            justify-content: center !important; 
        }
        .ag-cell { 
            display: flex; 
            align-items: center; 
            justify-content: center !important; 
        }
        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
        .ag-row-selected { background-color: rgba(99, 102, 241, 0.2) !important; }
      `}</style>
    </div>
  )
}

function EntityForm({ entity, onClose, onSave, isPending }: any) {
  const [formData, setFormData] = useState(entity || {
    name: '', type: 'Server', hostname: '', ip_address: '', owner_organization: '', description: '', contact_info: ''
  })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-4xl h-[85vh] rounded-[40px] border border-indigo-500/20 overflow-hidden flex flex-col shadow-2xl">
        <div className="p-10 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
           <div className="space-y-4">
              <div className="flex items-center space-x-3">
                 <div className="px-3 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-[9px] font-black text-indigo-400 uppercase tracking-widest">SYSTEM_IQ: {entity?.id || 'NEW_REGISTRY'}</div>
                 <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">EXTERNAL_INTERCONNECT</div>
              </div>
              <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">
                {formData.name || 'REGISTER_SYSTEM'}
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Precision External Intelligence Matrix Entry</p>
           </div>
           <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
           <div className="grid grid-cols-2 gap-10">
              <div className="space-y-8">
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em] border-l-2 border-indigo-500 pl-4">Identification</h3>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">System Name *</label>
                       <input 
                         value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                         className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-indigo-500 transition-all"
                         placeholder="e.g., Azure Auth Gateway"
                       />
                    </div>
                    <StyledSelect 
                       label="System Type"
                       value={formData.type}
                       onChange={e => setFormData({...formData, type: e.target.value})}
                       options={["Server", "Database", "PC/Workstation", "Network Gear", "Cloud Service", "Partner API"].map(t => ({ value: t, label: t }))}
                    />
                 </div>

                 <div className="space-y-4 pt-4">
                    <h3 className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.3em] border-l-2 border-emerald-500 pl-4">Connectivity</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Primary IP Address</label>
                          <input 
                            value={formData.ip_address} onChange={e => setFormData({...formData, ip_address: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-mono font-black text-emerald-400 outline-none focus:border-indigo-500 transition-all"
                            placeholder="0.0.0.0"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">FQDN / Hostname</label>
                          <input 
                            value={formData.hostname} onChange={e => setFormData({...formData, hostname: e.target.value.toUpperCase()})}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-indigo-500 transition-all"
                            placeholder="api.partner.com"
                          />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-8">
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-[0.3em] border-l-2 border-amber-500 pl-4">Governance</h3>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Owner / Organization</label>
                       <input 
                         value={formData.owner_organization} onChange={e => setFormData({...formData, owner_organization: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-indigo-500 transition-all"
                         placeholder="e.g., Microsoft / Partner-X"
                       />
                    </div>
                 </div>

                 <div className="space-y-4 pt-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] border-l-2 border-slate-500 pl-4">Narrative</h3>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Description / Notes</label>
                       <textarea 
                         value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 rounded-3xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all h-48 resize-none"
                         placeholder="Technical description of external system purpose..."
                       />
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="p-10 border-t border-white/5 bg-white/5 shrink-0 flex items-center space-x-4">
           <button onClick={onClose} className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all">Abort</button>
           <button 
             onClick={() => onSave(formData)}
             disabled={!formData.name || isPending}
             className="flex-1 py-5 bg-indigo-600 text-white rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3"
           >
              {isPending && <RefreshCcw size={16} className="animate-spin" />}
              <span>Commit Registry Data</span>
           </button>
        </div>
      </motion.div>
    </div>
  )
}

function LinkForm({ entities, devices, onClose, onSave, isPending }: any) {
  const [formData, setFormData] = useState({
    external_entity_id: '', device_id: '', service_id: '', direction: 'Upstream', purpose: '', protocol: 'TCP', port: '',
    credentials: { username: '', password: '', note: '' }
  })

  const { data: services } = useQuery({
    queryKey: ['device-services', formData.device_id],
    queryFn: async () => {
      if (!formData.device_id) return []
      return (await apiFetch(`/api/v1/logical-services/?device_id=${formData.device_id}`)).json()
    },
    enabled: !!formData.device_id
  })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-5xl h-[85vh] rounded-[40px] border border-indigo-500/20 overflow-hidden flex flex-col shadow-2xl">
        <div className="p-10 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
           <div className="space-y-4">
              <div className="flex items-center space-x-3">
                 <div className="px-3 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-[9px] font-black text-indigo-400 uppercase tracking-widest">MAP_INTERCONNECT</div>
                 <div className="px-3 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-[9px] font-black text-emerald-400 uppercase tracking-widest">DATA_FLOW_ESTABLISHMENT</div>
              </div>
              <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">ESTABLISH_LINK</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Mapping Topology Between Global & Local Matrix</p>
           </div>
           <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
           <div className="grid grid-cols-2 gap-10">
              <div className="p-8 bg-indigo-600/5 border border-indigo-500/10 rounded-[40px] space-y-6">
                 <h3 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em] flex items-center gap-2"><Globe size={14}/> External Peer</h3>
                 <StyledSelect 
                    label="Target External Entity"
                    value={formData.external_entity_id}
                    onChange={e => setFormData({...formData, external_entity_id: e.target.value})}
                    options={entities?.map((e: any) => ({ value: e.id, label: `${e.name} [${e.ip_address || 'No IP'}]` })) || []}
                    placeholder="Select Remote System..."
                 />
                 <StyledSelect 
                    label="Flow Direction"
                    value={formData.direction}
                    onChange={e => setFormData({...formData, direction: e.target.value})}
                    options={[{value: 'Upstream', label: 'Upstream (Input)'}, {value: 'Downstream', label: 'Downstream (Output)'}]}
                 />
              </div>

              <div className="p-8 bg-emerald-600/5 border border-emerald-500/10 rounded-[40px] space-y-6">
                 <h3 className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.3em] flex items-center gap-2"><Cpu size={14}/> Internal Asset</h3>
                 <StyledSelect 
                    label="Internal Registry Asset"
                    value={formData.device_id}
                    onChange={e => setFormData({...formData, device_id: e.target.value, service_id: ''})}
                    options={devices?.map((d: any) => ({ value: d.id, label: d.name })) || []}
                    placeholder="Select Internal Asset..."
                 />
                 <StyledSelect 
                    label="Logical Service (Optional)"
                    value={formData.service_id}
                    onChange={e => setFormData({...formData, service_id: e.target.value})}
                    options={services?.map((s: any) => ({ value: s.id, label: s.name })) || []}
                    placeholder={formData.device_id ? "Select Service..." : "Select Asset First..."}
                 />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-10 border-t border-white/5 pt-10">
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Link Configuration</h3>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Interconnect Purpose</label>
                    <input 
                      value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-indigo-500 transition-all"
                      placeholder="e.g., Daily DB Synchronization Feed"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Protocol</label>
                       <input 
                         value={formData.protocol} onChange={e => setFormData({...formData, protocol: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-mono font-black text-white outline-none focus:border-indigo-500 transition-all"
                         placeholder="TCP / HTTPS / SFTP"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Port</label>
                       <input 
                         value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-mono font-black text-indigo-300 outline-none focus:border-indigo-500 transition-all"
                         placeholder="443"
                       />
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-indigo-600/5 border border-indigo-500/10 rounded-[40px] space-y-6">
                 <div className="flex items-center space-x-3 text-indigo-400 border-b border-indigo-500/10 pb-4">
                   <Key size={16} />
                   <h3 className="text-[10px] font-black uppercase tracking-widest">Connection Intelligence</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <input 
                      value={formData.credentials.username} onChange={e => setFormData({...formData, credentials: {...formData.credentials, username: e.target.value}})}
                      className="w-full bg-black/60 border border-white/5 rounded-2xl px-5 py-4 text-[11px] font-black text-white outline-none focus:border-indigo-500 transition-all"
                      placeholder="Username"
                    />
                    <input 
                      type="password"
                      value={formData.credentials.password} onChange={e => setFormData({...formData, credentials: {...formData.credentials, password: e.target.value}})}
                      className="w-full bg-black/60 border border-white/5 rounded-2xl px-5 py-4 text-[11px] font-black text-white outline-none focus:border-indigo-500 transition-all"
                      placeholder="Password"
                    />
                    <textarea 
                      className="col-span-2 w-full bg-black/60 border border-white/5 rounded-2xl px-5 py-4 text-[10px] font-bold text-slate-400 outline-none focus:border-indigo-500 transition-all h-24 resize-none"
                      placeholder="Security Notes / Store Reference..."
                      value={formData.credentials.note}
                      onChange={e => setFormData({...formData, credentials: {...formData.credentials, note: e.target.value}})}
                    />
                 </div>
              </div>
           </div>
        </div>

        <div className="p-10 border-t border-white/5 bg-white/5 shrink-0 flex items-center space-x-4">
           <button onClick={onClose} className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all">Abort</button>
           <button 
             onClick={() => onSave({
               ...formData,
               external_entity_id: parseInt(formData.external_entity_id),
               device_id: parseInt(formData.device_id),
               service_id: formData.service_id ? parseInt(formData.service_id) : null
             })}
             disabled={!formData.external_entity_id || !formData.device_id || isPending}
             className="flex-1 py-5 bg-indigo-600 text-white rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3"
           >
              {isPending && <RefreshCcw size={16} className="animate-spin" />}
              <span>Establish Interconnect Link</span>
           </button>
        </div>
      </motion.div>
    </div>
  )
}
