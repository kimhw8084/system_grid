import React, { useMemo, useState, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Globe, X, RefreshCcw, Search, Edit2, LayoutGrid, List, FileText, Clipboard, Link as LinkIcon, Share2, ExternalLink, Shield, Server, Database, Cloud, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { apiFetch } from "../api/apiClient"
import { StyledSelect } from "./shared/StyledSelect"
import { ConfirmationModal } from "./shared/ConfirmationModal"

const EntityForm = ({ initialData, onSave, isSaving }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Server',
    hostname: '',
    ip_address: '',
    owner_organization: '',
    description: '',
    contact_info: '',
    ...initialData
  })

  const types = [
    { value: 'Server', label: 'External Server' },
    { value: 'DB', label: 'External Database' },
    { value: 'Cloud Service', label: 'Cloud Service (SaaS/PaaS)' },
    { value: 'Network', label: 'External Network Node' },
    { value: 'PC', label: 'External Terminal/PC' },
    { value: 'Other', label: 'Other Equipment' }
  ]

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-2 text-blue-400">Entity Identity *</label>
            <input 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} 
              className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner" 
              placeholder="E.G. CUSTOMER-PROD-DB" 
            />
          </div>
          <StyledSelect
            label="Entity Type"
            value={formData.type}
            onChange={e => setFormData({...formData, type: e.target.value})}
            options={types}
          />
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-2">Hostname / FQDN</label>
            <input 
              value={formData.hostname} 
              onChange={e => setFormData({...formData, hostname: e.target.value.toUpperCase()})} 
              className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner" 
              placeholder="DB.CUSTOMER.COM" 
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-2">IP Address</label>
            <input 
              value={formData.ip_address} 
              onChange={e => setFormData({...formData, ip_address: e.target.value})} 
              className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner" 
              placeholder="203.0.113.42" 
            />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-2">Owner Organization</label>
            <input 
              value={formData.owner_organization} 
              onChange={e => setFormData({...formData, owner_organization: e.target.value.toUpperCase()})} 
              className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner" 
              placeholder="GLOBAL LOGISTICS INC." 
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-2">Contact Info / POC</label>
            <input 
              value={formData.contact_info} 
              onChange={e => setFormData({...formData, contact_info: e.target.value})} 
              className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner" 
              placeholder="support@customer.com / +1-555-0199" 
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-2">Technical Description</label>
            <textarea 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner h-32 resize-none" 
              placeholder="Describe the role of this external entity..." 
            />
          </div>
        </div>
      </div>

      <div className="flex space-x-4 pt-6 border-t border-white/5">
        <button 
          disabled={isSaving || !formData.name} 
          onClick={() => onSave(formData)} 
          className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
        >
          {isSaving ? 'Processing Matrix...' : (initialData.id ? 'Authorize Updates' : 'Commit to Registry')}
        </button>
      </div>
    </div>
  )
}

export default function External() {
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)
  
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(10)
  const [showStyleLab, setShowStyleLab] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeModal, setActiveModal] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, id: null })

  const { data: entities, isLoading } = useQuery({
    queryKey: ['external-entities'],
    queryFn: async () => (await (await apiFetch('/api/v1/intelligence/entities')).json())
  })

  useEffect(() => {
    if (gridRef.current?.api) {
      setTimeout(() => gridRef.current.api.autoSizeAllColumns(), 100)
    }
  }, [fontSize, rowDensity, entities])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/intelligence/entities/${data.id}` : `/api/v1/intelligence/entities`
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      toast.success('External Registry Updated')
      setActiveModal(null)
    },
    onError: (e: any) => toast.error(e.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/intelligence/entities/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      setConfirmModal({ isOpen: false, id: null })
      toast.success('Entity Purged from Registry')
    },
    onError: (e: any) => toast.error(e.message)
  })

  const columnDefs = useMemo(() => [
    { 
      headerName: "", 
      width: 50,
      minWidth: 50,
      maxWidth: 50,
      checkboxSelection: true, 
      headerCheckboxSelection: true, 
      pinned: 'left', 
      cellClass: 'flex items-center justify-center border-r border-white/5 pl-2', 
      headerClass: 'flex items-center justify-center border-r border-white/5 pl-2', 
      suppressSizeToFit: true,
      resizable: false,
      sortable: false,
      filter: false,
      suppressHide: true
    },
    { 
      field: "id", 
      headerName: "ID", 
      width: 70,
      minWidth: 70,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
    },
    { 
      field: "name", 
      headerName: "Entity Name", 
      pinned: 'left',
      flex: 1.5,
      cellClass: 'text-left font-bold uppercase tracking-tight',
      headerClass: 'text-left'
    },
    { 
      field: "type", 
      headerName: "Type", 
      width: 140, 
      cellClass: 'text-center font-bold uppercase text-slate-500 tracking-widest', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = {
          'Server': 'text-blue-400',
          'DB': 'text-amber-400',
          'Cloud Service': 'text-emerald-400',
          'Network': 'text-rose-400',
          'PC': 'text-indigo-400'
        }
        return <span className={`font-bold uppercase ${colors[p.value] || 'text-slate-500'}`}>{p.value || 'N/A'}</span>
      }
    },
    { field: "hostname", headerName: "Hostname", width: 200, cellClass: 'text-center font-bold', headerClass: 'text-center', cellRenderer: (p: any) => p.value ? p.value : <span className="text-slate-500 font-bold uppercase">N/A</span> },
    { field: "ip_address", headerName: "IP Address", width: 150, cellClass: 'text-center font-mono font-bold', headerClass: 'text-center', cellRenderer: (p: any) => p.value ? p.value : <span className="text-slate-500 font-bold uppercase">N/A</span> },
    { field: "owner_organization", headerName: "Organization", flex: 1, minWidth: 200, cellClass: 'text-center font-bold uppercase', headerClass: 'text-center', cellRenderer: (p: any) => p.value ? p.value : <span className="text-slate-500 font-bold uppercase">N/A</span> },
    { 
      headerName: "Action",
      width: 100,
      minWidth: 100,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      resizable: false,
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex rounded-lg p-0.5 border border-white/5 bg-transparent">
               <button onClick={() => setActiveModal(p.data)} title="Edit Configuration" className="p-1.5 text-emerald-400 hover:text-emerald-200 transition-all border-r border-white/5"><Edit2 size={14}/></button>
               <button onClick={() => setConfirmModal({ isOpen: true, id: p.data.id })} title="Purge Registry" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      ),
      suppressHide: true
    }
  ], [])

  const autoSizeStrategy = useMemo(() => ({
    type: 'fitCellContents' as const
  }), []);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic text-white">External Registry</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">Third-party equipment, cloud nodes & vendor endpoints</p>
           </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
               placeholder="Filter Registry..." 
               className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" 
             />
          </div>
          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5 space-x-1">
             <button 
                onClick={() => setShowStyleLab(!showStyleLab)} 
                className={`p-1.5 hover:bg-white/10 ${showStyleLab ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`}
                title="Toggle Style Lab"
             >
                <Activity size={16} />
             </button>
          </div>
          <button onClick={() => setActiveModal({})} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ Register Entity</button>
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
                            type="range" min="0" max="20" step="2" 
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

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4 text-blue-400">
             <RefreshCcw size={32} className="animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Synching External Matrix...</p>
          </div>
        )}
        <AgGridReact 
          ref={gridRef}
          rowData={entities || []} 
          columnDefs={columnDefs as any} 
          headerHeight={fontSize + rowDensity + 10}
          rowHeight={fontSize + rowDensity + 10}
          quickFilterText={searchTerm}
          animateRows={true}
          enableCellTextSelection={true}
          autoSizeStrategy={autoSizeStrategy}
        />
      </div>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-[900px] max-h-[90vh] overflow-y-auto p-12 rounded-[50px] border border-blue-500/30 custom-scrollbar shadow-2xl">
               <div className="flex items-center justify-between border-b border-white/5 pb-8">
                  <div className="flex items-center space-x-5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg">
                       <Globe size={32}/>
                    </div>
                    <div>
                      <h2 className="text-3xl font-black uppercase text-white tracking-tighter">{activeModal.id ? 'Modify Registry Entry' : 'Register External Asset'}</h2>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1 italic">Authorized Reference for External Architecture Dependency</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-3 rounded-full"><X size={28}/></button>
               </div>
               <EntityForm initialData={activeModal} onSave={mutation.mutate} isSaving={mutation.isPending} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={() => deleteMutation.mutate(confirmModal.id)}
        title="Sever External Identity"
        message="This will remove the authorized reference for this external entity from the registry. Active connectivity forensics may be impacted. Proceed?"
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
      `}</style>
    </div>
  )
}
