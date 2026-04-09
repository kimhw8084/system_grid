import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Activity, Plus, Search, Filter, ExternalLink, 
  Trash2, Edit2, Shield, Cpu, Database, Network, 
  Globe, Bell, Info, ChevronRight, X, Check, Save,
  AlertCircle, Clock, Zap, Settings, MoreVertical, List,
  BookOpen, Eye, FileText, User, Mail, MessageSquare, Monitor
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from "ag-grid-react"
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'
import { StyledSelect } from './shared/StyledSelect'

const CATEGORIES = [
  { value: 'Hardware', icon: Cpu, color: 'text-blue-400' },
  { value: 'Log', icon: Database, color: 'text-emerald-400' },
  { value: 'Network', icon: Network, color: 'text-amber-400' },
  { value: 'Application', icon: Activity, color: 'text-rose-400' },
  { value: 'Synthetic', icon: Globe, color: 'text-purple-400' }
]

const STATUSES = [
  { value: 'Existing', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'Planned', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'Cancelled', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' }
]

export default function MonitoringGrid() {
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)
  
  // --- STYLE LABORATORY STATE ---
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(8) // Extra padding per row
  const [showStyleLab, setShowStyleLab] = useState(false)

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [detailItem, setDetailItem] = useState<any>(null)
  const [servicePopup, setServicePopup] = useState<{ names: string[], title: string } | null>(null)
  const [recipientPopup, setRecipientPopup] = useState<{ recipients: string[], method: string } | null>(null)
  const [bkmPopup, setBkmPopup] = useState<{ ids: number[], titles: string[] } | null>(null)
  const [activeBkm, setActiveBkm] = useState<any>(null)

  useEffect(() => {
    if (gridRef.current?.api) {
      setTimeout(() => gridRef.current.api.autoSizeAllColumns(), 50)
    }
  }, [fontSize, rowDensity])

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data: items, isLoading } = useQuery({
    queryKey: ['monitoring-items'],
    queryFn: async () => (await apiFetch('/api/v1/monitoring/')).json()
  })

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json()
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/api/v1/monitoring/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
      toast.success('Monitoring item decommissioned')
    }
  })

  const columnDefs = useMemo(() => [
    { 
      field: "device_name", 
      headerName: "Target Asset", 
      width: 150, 
      cellClass: "text-slate-200 font-bold text-center", 
      headerClass: 'text-center' 
    },
    { 
      field: "category", 
      headerName: "Category", 
      width: 120,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const cat = CATEGORIES.find(c => c.value === p.value)
        const Icon = cat?.icon || Activity
        return (
          <div className="flex items-center justify-center space-x-2 h-full">
            <Icon size={12} className={cat?.color || 'text-slate-400'} />
            <span className="text-[10px] font-black uppercase tracking-tight text-white">{p.value}</span>
          </div>
        )
      }
    },
    { 
      field: "title", 
      headerName: "Title", 
      minWidth: 200,
      flex: 1.5, 
      cellClass: "text-blue-400 font-bold text-left", 
      headerClass: 'text-left' 
    },
    { 
      field: "monitored_service_names", 
      headerName: "Services", 
      width: 100, 
      cellClass: "text-center", 
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const names = p.value || []
        const count = names.length
        if (count === 0) return <span className="text-slate-600 italic text-[9px]">None</span>
        return (
          <div className="flex items-center justify-center h-full">
            <button 
              onClick={() => setServicePopup({ names, title: p.data.title })}
              className="px-2 py-0.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-[10px] font-black text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
            >
              {count} {count === 1 ? 'SVC' : 'SVCS'}
            </button>
          </div>
        )
      }
    },
    { 
      field: "platform", 
      headerName: "Platform", 
      width: 120, 
      cellClass: 'text-center', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-2 h-full">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase text-slate-300">{p.value}</span>
        </div>
      )
    },
    { 
      field: "severity", 
      headerName: "Severity", 
      width: 100,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = {
          'Critical': 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]',
          'Warning': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          'Info': 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        }
        return (
          <div className="flex items-center justify-center h-full">
            <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${colors[p.value] || 'bg-slate-500/20 text-slate-400'}`}>
              {p.value}
            </span>
          </div>
        )
      }
    },
    { 
      field: "check_interval", 
      headerName: "Check Freq", 
      width: 100, 
      cellClass: 'text-center text-slate-400 font-mono text-[10px]', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span>{p.value}s</span>
    },
    { 
      field: "notification_method", 
      headerName: "Notification", 
      width: 130, 
      cellClass: 'text-center', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center h-full">
           <button 
             onClick={() => setRecipientPopup({ recipients: p.data.notification_recipients || [], method: p.value })}
             className="flex items-center space-x-2 hover:text-blue-400 transition-colors"
           >
              <Bell size={10} className="text-slate-500" />
              <span className="text-[10px] font-black uppercase text-slate-300 border-b border-dashed border-slate-700">{p.value}</span>
           </button>
        </div>
      )
    },
    { 
      field: "purpose", 
      headerName: "Purpose", 
      flex: 1, 
      cellClass: "text-slate-500 italic text-left truncate px-4", 
      headerClass: 'text-left' 
    },
    {
      headerName: "Actions",
      width: 160,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/5">
               <button onClick={() => setDetailItem(p.data)} title="Quick View" className="p-1.5 hover:bg-slate-700 hover:text-white text-slate-400 rounded-md transition-all"><Eye size={14}/></button>
               <button onClick={() => setBkmPopup({ ids: p.data.recovery_docs || [], titles: p.data.recovery_doc_titles || [] })} title="Recovery BKMs" className="p-1.5 hover:bg-amber-600/30 hover:text-amber-400 text-amber-500/70 rounded-md transition-all"><BookOpen size={14}/></button>
               {p.data.monitoring_url && (
                 <button onClick={() => window.open(p.data.monitoring_url, '_blank')} title="External Console" className="p-1.5 hover:bg-blue-600 hover:text-white text-blue-400 rounded-md transition-all"><ExternalLink size={14}/></button>
               )}
               <button onClick={() => { setEditingItem(p.data); setIsFormOpen(true); }} title="Edit Logic" className="p-1.5 hover:bg-emerald-600 hover:text-white text-emerald-400 rounded-md transition-all"><Edit2 size={14}/></button>
               <button onClick={() => deleteMutation.mutate(p.data.id)} title="Decommission" className="p-1.5 hover:bg-rose-600 hover:text-white text-rose-400 rounded-md transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      )
    }
  ], []) as any

  const autoSizeStrategy = useMemo(() => ({
    type: 'fitCellContents' as const
  }), []);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* STYLE LABORATORY BAR */}
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

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic flex items-center">
                <span>Monitoring Matrix</span>
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">High-Reliability Infrastructure Observability</p>
           </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="SCAN MATRIX..."
              className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all"
            />
          </div>

          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5 space-x-1">
             <button onClick={() => setShowStyleLab(!showStyleLab)} className={`p-1.5 hover:bg-white/10 ${showStyleLab ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Toggle Style Lab">
                <Activity size={16} />
             </button>
             <button className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Matrix Config">
                <Settings size={16} />
             </button>
          </div>

          <button 
            onClick={() => { setEditingItem(null); setIsFormOpen(true); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            + Deploy Monitor
          </button>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <Zap size={32} className="text-blue-400 animate-pulse" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Scanning Monitoring Matrix...</p>
          </div>
        )}
        <AgGridReact 
          ref={gridRef}
          rowData={items || []} 
          columnDefs={columnDefs} 
          rowSelection="multiple"
          headerHeight={fontSize + rowDensity + 10}
          rowHeight={fontSize + rowDensity + 8}
          onSelectionChanged={e => setSelectedIds(e.api.getSelectedNodes().map(n => n.data.id))}
          quickFilterText={searchTerm}
          autoSizeStrategy={autoSizeStrategy}
        />
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <MonitoringForm 
            item={editingItem} 
            devices={devices}
            onClose={() => setIsFormOpen(false)} 
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
              setIsFormOpen(false)
            }}
          />
        )}
        {detailItem && <MonitoringDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}
        {servicePopup && <ServicesModal names={servicePopup.names} title={servicePopup.title} onClose={() => setServicePopup(null)} />}
        {recipientPopup && <RecipientsModal recipients={recipientPopup.recipients} method={recipientPopup.method} onClose={() => setRecipientPopup(null)} />}
        {bkmPopup && <BkmListModal ids={bkmPopup.ids} titles={bkmPopup.titles} onOpenBkm={setActiveBkm} onClose={() => setBkmPopup(null)} />}
        {activeBkm && <BkmDetailModal bkmId={activeBkm} onClose={() => setActiveBkm(null)} />}
      </AnimatePresence>

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
            font-weight: 700 !important;
        }
        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.2) !important; }
      `}</style>
    </div>
  )
}

// --- POPUP MODALS ---

function ServicesModal({ names, title, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-md p-6 rounded-3xl border-blue-500/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase text-blue-400">Monitored Services</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18}/></button>
        </div>
        <p className="text-[10px] text-slate-500 font-bold uppercase mb-4 italic">Linked to: {title}</p>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {names.map((name: string, i: number) => (
            <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center space-x-3">
              <Shield size={14} className="text-blue-500" />
              <span className="text-[11px] font-bold text-slate-200">{name}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function RecipientsModal({ recipients, method, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-md p-6 rounded-3xl border-emerald-500/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase text-emerald-400">Recipient Matrix</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18}/></button>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Bell size={12} className="text-slate-500" />
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Method: {method}</span>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {recipients.map((r: string, i: number) => (
            <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center space-x-3 group hover:border-emerald-500/30 transition-all">
              <Mail size={14} className="text-emerald-500" />
              <span className="text-[11px] font-bold text-slate-200">{r}</span>
            </div>
          ))}
          {recipients.length === 0 && <p className="text-center py-4 text-slate-600 italic text-[10px]">No recipients defined</p>}
        </div>
      </motion.div>
    </div>
  )
}

function BkmListModal({ ids, titles, onOpenBkm, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-lg p-6 rounded-3xl border-amber-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
             <BookOpen size={20} className="text-amber-500" />
             <h3 className="text-sm font-black uppercase text-amber-500 tracking-tight">Recovery Intelligence</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18}/></button>
        </div>
        <p className="text-[10px] text-slate-500 font-black uppercase mb-4 tracking-widest">Linked Best Known Methods (BKM)</p>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          {ids.map((id: number, i: number) => (
            <button 
              key={id} 
              onClick={() => onOpenBkm(id)}
              className="w-full text-left bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-amber-500/50 hover:bg-amber-500/5 transition-all shadow-lg"
            >
              <div className="flex items-center space-x-4">
                 <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                    <FileText size={16} />
                 </div>
                 <div>
                    <span className="text-[11px] font-black uppercase text-slate-200 block leading-tight">{titles[i]}</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">DOC ID: KB-{id}</span>
                 </div>
              </div>
              <ChevronRight size={14} className="text-slate-700 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
          {ids.length === 0 && (
             <div className="py-12 flex flex-col items-center justify-center space-y-3 border-2 border-dashed border-white/5 rounded-2xl">
                <BookOpen size={24} className="text-slate-800" />
                <p className="text-[10px] text-slate-700 font-black uppercase italic tracking-widest text-center px-8">No recovery procedures linked to this monitor</p>
             </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function BkmDetailModal({ bkmId, onClose }: any) {
  const { data: bkm, isLoading } = useQuery({
    queryKey: ['knowledge-entry', bkmId],
    queryFn: async () => (await apiFetch(`/api/v1/knowledge/${bkmId}`)).json(),
    enabled: !!bkmId
  })

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-xl p-8">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-4xl h-[80vh] flex flex-col p-8 rounded-[40px] border-amber-500/30">
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
           <div className="flex items-center space-x-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/20">
                <BookOpen size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">{bkm?.title || 'Loading Document...'}</h2>
                <div className="flex items-center space-x-2 mt-0.5">
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Operational Triage Instruction</span>
                   <span className="w-1 h-1 rounded-full bg-slate-700" />
                   <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">BKM ID: KB-{bkmId}</span>
                </div>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors">
              <X size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-8">
           {isLoading ? (
             <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Clock size={32} className="text-amber-500 animate-spin" />
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest animate-pulse">Retrieving Knowledge...</span>
             </div>
           ) : (
             <>
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-6">
                   <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center space-x-2">
                      <Zap size={12}/> <span>Executive Summary</span>
                   </h4>
                   <p className="text-slate-300 font-bold leading-relaxed text-[13px]">{bkm.content || 'No content provided.'}</p>
                </div>

                {bkm.content_json?.steps?.length > 0 && (
                  <div className="space-y-4">
                     <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em] border-l-2 border-amber-500 pl-4">Resolution Workflow</h4>
                     <div className="space-y-4 pl-4">
                        {bkm.content_json.steps.map((step: any, i: number) => (
                           <div key={i} className="flex space-x-6 relative">
                              {i < bkm.content_json.steps.length - 1 && <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-white/5" />}
                              <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0 z-10 text-[12px] font-black text-amber-500 shadow-lg">
                                 {i + 1}
                              </div>
                              <div className="bg-black/20 border border-white/5 rounded-2xl p-5 flex-1 hover:border-amber-500/20 transition-all">
                                 <h5 className="text-[11px] font-black uppercase text-slate-200 mb-1">{step.title}</h5>
                                 <p className="text-[12px] text-slate-400 font-bold leading-relaxed">{step.description}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                )}
             </>
           )}
        </div>
      </motion.div>
    </div>
  )
}

function MonitoringDetailModal({ item, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-8">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-5xl h-[85vh] flex flex-col p-8 rounded-[50px] border-blue-500/30 overflow-hidden shadow-[0_0_150px_rgba(37,99,235,0.15)]">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center space-x-6">
              <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                 <Monitor size={32} strokeWidth={1.5} />
              </div>
              <div>
                 <div className="flex items-center space-x-3 mb-1">
                    <span className="px-3 py-0.5 bg-blue-600/20 border border-blue-500/30 rounded-full text-[10px] font-black uppercase text-blue-400 tracking-tighter">
                       ID: MON-{item.id}
                    </span>
                    <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${item.is_active ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                       {item.is_active ? 'Status: Active' : 'Status: Paused'}
                    </span>
                 </div>
                 <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">{item.title}</h2>
                 <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mt-2 flex items-center">
                    <Zap size={12} className="mr-2 text-blue-500" /> Integrated Intelligence Node
                 </p>
              </div>
           </div>
           <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all">
              <X size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
           <div className="grid grid-cols-12 gap-10">
              <div className="col-span-8 space-y-10">
                 <section className="space-y-4">
                    <h3 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.3em] flex items-center">
                       <Info size={16} className="mr-3" /> Operational Context
                    </h3>
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-8 text-blue-500 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Activity size={120} />
                       </div>
                       <p className="text-[14px] font-bold text-slate-200 leading-relaxed italic border-l-4 border-blue-600 pl-6 py-2">
                          "{item.purpose || 'No strategic purpose defined for this monitoring node.'}"
                       </p>
                       <div className="grid grid-cols-3 gap-6 mt-8">
                          <div className="space-y-1">
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Target Asset</span>
                             <p className="text-[13px] font-black text-white uppercase">{item.device_name || 'N/A'}</p>
                          </div>
                          <div className="space-y-1">
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Platform Interface</span>
                             <p className="text-[13px] font-black text-blue-400 uppercase italic">{item.platform}</p>
                          </div>
                          <div className="space-y-1">
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Intelligence Class</span>
                             <p className="text-[13px] font-black text-emerald-400 uppercase">{item.category}</p>
                          </div>
                       </div>
                    </div>
                 </section>

                 <section className="space-y-4">
                    <h3 className="text-[12px] font-black text-emerald-400 uppercase tracking-[0.3em] flex items-center">
                       <Settings size={16} className="mr-3" /> Logic Specification
                    </h3>
                    <div className="bg-[#0f172a] border border-white/5 rounded-3xl p-8 font-mono text-[13px] relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/30" />
                       <div className="flex items-center justify-between mb-6 opacity-60">
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center">
                             <Zap size={12} className="mr-2"/> Logic Execution Engine v2.4
                          </span>
                          <span className="text-[10px] text-slate-600 uppercase font-black tracking-tighter italic">SHA-256: 8D3F...E21</span>
                       </div>
                       {item.logic_json?.map((log: any, idx: number) => (
                         <div key={idx} className="mb-8 last:mb-0 group">
                            <div className="flex items-center space-x-4 mb-3">
                               <span className="text-[11px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/20">TYPE: {log.type}</span>
                               <span className="text-slate-500 italic text-[11px]">{log.description}</span>
                            </div>
                            <pre className="text-blue-300 leading-relaxed bg-black/40 p-5 rounded-2xl border border-white/5 group-hover:border-emerald-500/20 transition-all">
                               {log.logic_info}
                            </pre>
                         </div>
                       )) || <p className="text-slate-600 italic">No complex logic defined.</p>}
                    </div>
                 </section>
              </div>

              <div className="col-span-4 space-y-10">
                 <section className="space-y-4">
                    <h3 className="text-[12px] font-black text-rose-400 uppercase tracking-[0.3em] flex items-center">
                       <Bell size={16} className="mr-3" /> Reliability Matrix
                    </h3>
                    <div className="space-y-3">
                       {[
                          { label: 'Severity Level', value: item.severity, color: 'text-rose-400' },
                          { label: 'Check Frequency', value: `${item.check_interval}s`, color: 'text-slate-300' },
                          { label: 'Persistence Delay', value: `${item.alert_duration}s`, color: 'text-amber-400' },
                          { label: 'Notify Throttle', value: `${item.notification_throttle}s`, color: 'text-blue-400' }
                       ].map((stat, i) => (
                         <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-all">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{stat.label}</span>
                            <span className={`text-[12px] font-black ${stat.color} uppercase tracking-tighter`}>{stat.value}</span>
                         </div>
                       ))}
                    </div>
                 </section>

                 <section className="space-y-4">
                    <h3 className="text-[12px] font-black text-amber-400 uppercase tracking-[0.3em] flex items-center">
                       <BookOpen size={16} className="mr-3" /> Recovery Linkage
                    </h3>
                    <div className="space-y-3">
                       {item.recovery_doc_titles?.map((title: string, i: number) => (
                         <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex items-center space-x-4 hover:border-amber-500/30 transition-all cursor-pointer">
                            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><FileText size={16}/></div>
                            <span className="text-[11px] font-black uppercase text-slate-300 tracking-tight leading-tight">{title}</span>
                         </div>
                       ))}
                       {item.recovery_doc_titles?.length === 0 && (
                          <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 text-center">
                             <AlertCircle size={20} className="mx-auto text-rose-500 mb-3" />
                             <p className="text-[10px] font-black text-rose-500 uppercase italic tracking-widest">No BKM Linked</p>
                             <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">MTTR impact risk detected</p>
                          </div>
                       )}
                    </div>
                 </section>

                 {item.monitoring_url && (
                    <button 
                       onClick={() => window.open(item.monitoring_url, '_blank')}
                       className="w-full bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-[30px] font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center space-x-3"
                    >
                       <ExternalLink size={16} />
                       <span>Open Platform Console</span>
                    </button>
                 )}
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  )
}

// --- REST OF THE FORM COMPONENT (Existing) ---

const LOGIC_TYPES = ['Threshold', 'Regex', 'Query', 'Health Check', 'Log Pattern', 'Synthetic', 'Custom']

const LOGIC_SUGGESTIONS: any = {
  'Threshold': 'Example: cpu_usage > 90% for 5m\nWait for 3 consecutive violations before alerting.',
  'Regex': 'Example: /.*(Critical|Error|Fatal).*/i\nCapture group $1 for metadata enrichment.',
  'Query': 'Example: SELECT average(load) FROM system_metrics WHERE host = "$TARGET" AND time > now() - 10m',
  'Health Check': 'Example: HTTP GET /api/health\nExpected Status: 200\nTimeout: 5000ms',
  'Log Pattern': 'Example: [TIMESTAMP] [LEVEL] [COMPONENT] [MESSAGE]\nDetect spike in "Connection Refused" patterns.',
  'Synthetic': 'Example: Browser Script\n1. Navigate to /login\n2. Fill credentials\n3. Verify dashboard element exists',
  'Custom': 'Enter full custom logic script or detailed specifications here...'
}

function MonitoringForm({ item, devices, onClose, onSuccess }: any) {
  const [activeTab, setActiveTab] = useState<'context' | 'logic' | 'alerting'>('context')
  const [recoverySearch, setRecoverySearch] = useState('')
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [activeLogicId, setActiveLogicId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    category: 'Hardware',
    status: 'Planned',
    title: '',
    spec: '',
    platform: 'Zabbix',
    monitoring_url: '',
    purpose: '',
    notification_method: 'Email',
    notification_recipients: [],
    logic: '',
    logic_json: [],
    device_id: null,
    monitored_services: [],
    check_interval: 60,
    alert_duration: 0,
    notification_throttle: 3600,
    severity: 'Warning',
    is_active: true,
    recovery_docs: [],
    ...item
  })

  // Initialize activeLogicId if entries exist
  useEffect(() => {
    if (formData.logic_json?.length > 0 && activeLogicId === null) {
      setActiveLogicId(formData.logic_json[0].id)
    }
  }, [formData.logic_json])

  const [recipientInput, setRecipientInput] = useState('')

  // Fetch services for selected device
  const { data: deviceServices } = useQuery({
    queryKey: ['device-services', formData.device_id],
    queryFn: async () => {
      if (!formData.device_id) return []
      return (await apiFetch(`/api/v1/logical-services/?device_id=${formData.device_id}`)).json()
    },
    enabled: !!formData.device_id
  })

  // Fetch knowledge entries for recovery docs
  const { data: knowledgeEntries } = useQuery({
    queryKey: ['knowledge-entries'],
    queryFn: async () => (await apiFetch('/api/v1/knowledge/')).json()
  })

  const filteredKnowledge = useMemo(() => {
    if (!knowledgeEntries) return []
    return knowledgeEntries.filter((e: any) => 
      e.title.toLowerCase().includes(recoverySearch.toLowerCase()) ||
      e.category.toLowerCase().includes(recoverySearch.toLowerCase())
    )
  }, [knowledgeEntries, recoverySearch])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = item ? `/api/v1/monitoring/${item.id}` : '/api/v1/monitoring/'
      const method = item ? 'PUT' : 'POST'
      return (await apiFetch(url, { method, body: JSON.stringify(data) })).json()
    },
    onSuccess: () => {
      toast.success(item ? 'Logic synchronized' : 'Logic deployed to matrix')
      onSuccess()
    }
  })

  const toggleService = (id: number) => {
    const current = [...(formData.monitored_services || [])]
    const idx = current.indexOf(id)
    if (idx > -1) {
      current.splice(idx, 1)
    } else {
      current.push(id)
    }
    setFormData({ ...formData, monitored_services: current })
  }

  const toggleRecoveryDoc = (id: number) => {
    const current = [...(formData.recovery_docs || [])]
    const idx = current.indexOf(id)
    if (idx > -1) {
      current.splice(idx, 1)
    } else {
      current.push(id)
    }
    setFormData({ ...formData, recovery_docs: current })
  }

  const addLogicEntry = () => {
    const id = Date.now()
    const newEntries = [...(formData.logic_json || []), { type: 'Threshold', description: '', logic_info: '', id }]
    setFormData({ ...formData, logic_json: newEntries })
    setActiveLogicId(id)
  }

  const removeLogicEntry = (id: number) => {
    const filtered = formData.logic_json.filter((e: any) => e.id !== id)
    setFormData({ ...formData, logic_json: filtered })
    if (activeLogicId === id) {
      setActiveLogicId(filtered.length > 0 ? filtered[0].id : null)
    }
  }

  const updateLogicEntry = (id: number, field: string, value: string) => {
    const newEntries = formData.logic_json.map((e: any) => e.id === id ? { ...e, [field]: value } : e)
    setFormData({ ...formData, logic_json: newEntries })
  }

  const activeLogicEntry = formData.logic_json?.find((e: any) => e.id === activeLogicId)

  const addRecipient = () => {
    if (recipientInput && !formData.notification_recipients.includes(recipientInput)) {
      setFormData({ ...formData, notification_recipients: [...formData.notification_recipients, recipientInput] })
      setRecipientInput('')
    }
  }

  const removeRecipient = (r: string) => {
    setFormData({ ...formData, notification_recipients: formData.notification_recipients.filter((item: string) => item !== r) })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-panel w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col p-8 rounded-[40px] border-blue-500/30 shadow-[0_0_100px_rgba(37,99,235,0.1)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
           <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-400 border border-blue-500/20">
                <Zap size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
                  {item ? 'Update Logic' : 'Deploy Monitoring'}
                </h2>
                <div className="flex items-center space-x-2 mt-0.5">
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Infrastructure Command Interface</span>
                   <span className="w-1 h-1 rounded-full bg-slate-700" />
                   <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${formData.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-white/10'}`}>
                      {formData.is_active ? 'LIVE MATRIX' : 'PAUSED'}
                   </span>
                </div>
              </div>
           </div>
           
           <div className="flex bg-black/40 rounded-2xl p-1 border border-white/5">
              {[
                { id: 'context', label: '1. Detection & Context' },
                { id: 'logic', label: '2. Logic Specification' },
                { id: 'alerting', label: '3. Alerting & Recovery' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {tab.label}
                </button>
              ))}
           </div>

           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors">
              <X size={20} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
           {activeTab === 'context' ? (
             <div className="grid grid-cols-12 gap-8 p-2">
                <div className="col-span-4 space-y-6">
                   <div className="space-y-4">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-400 border-l-2 border-blue-600 pl-3">Target Identification</h3>
                      <StyledSelect 
                        label="Registry Asset"
                        value={formData.device_id}
                        onChange={(e: any) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value);
                            setFormData({...formData, device_id: val, monitored_services: []});
                        }}
                        options={devices?.map((d: any) => ({ value: d.id, label: `${d.name} [${d.system}]` })) || []}
                        placeholder="Select Device..."
                      />

                      {formData.device_id && (
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                           <div className="flex items-center justify-between px-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Service Scope</label>
                              <span className="text-[8px] font-bold text-blue-500 uppercase bg-blue-500/10 px-2 py-0.5 rounded-full">
                                {formData.monitored_services?.length || 0} Bound
                              </span>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {deviceServices?.map((svc: any) => (
                                <button
                                  key={svc.id}
                                  onClick={() => toggleService(svc.id)}
                                  className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center space-x-1.5 border ${
                                    formData.monitored_services?.includes(svc.id)
                                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                      : 'bg-black/40 border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'
                                  }`}
                                >
                                  {formData.monitored_services?.includes(svc.id) ? <Check size={8} strokeWidth={4} /> : <div className="w-1 h-1 rounded-full bg-slate-700" />}
                                  <span>{svc.name}</span>
                                </button>
                              ))}
                           </div>
                        </div>
                      )}
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <StyledSelect 
                        label="Category"
                        value={formData.category}
                        onChange={(e: any) => setFormData({...formData, category: e.target.value})}
                        options={CATEGORIES.map(c => ({ value: c.value, label: c.value }))}
                      />
                      <StyledSelect 
                        label="Status"
                        value={formData.status}
                        onChange={(e: any) => setFormData({...formData, status: e.target.value})}
                        options={STATUSES.map(s => ({ value: s.value, label: s.value }))}
                      />
                   </div>
                </div>

                <div className="col-span-8 space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Title</label>
                        <input 
                          value={formData.title}
                          onChange={e => setFormData({...formData, title: e.target.value})}
                          placeholder="e.g. CORE-DB: High CPU Load Alert"
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Platform</label>
                        <input 
                          value={formData.platform}
                          onChange={e => setFormData({...formData, platform: e.target.value})}
                          placeholder="e.g. Zabbix, Prometheus"
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Monitoring URL</label>
                      <div className="relative group">
                        <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input 
                          value={formData.monitoring_url}
                          onChange={e => setFormData({...formData, monitoring_url: e.target.value})}
                          placeholder="https://console.internal/..."
                          className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-[12px] font-bold text-blue-400 outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-2">
                         <Info size={14}/> <span>Business Purpose & Operational Impact</span>
                      </label>
                      <textarea 
                        value={formData.purpose}
                        onChange={e => setFormData({...formData, purpose: e.target.value})}
                        placeholder="Why is this being monitored? What is the impact of failure?"
                        rows={6}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                      />
                   </div>
                </div>
             </div>
           ) : activeTab === 'logic' ? (
             <div className="grid grid-cols-12 gap-8 p-2 h-full min-h-[500px]">
                {/* Left: Logic Entry Selection */}
                <div className="col-span-4 space-y-4">
                   <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center space-x-2">
                         <Settings size={14}/> <span>Logic Entries</span>
                      </h3>
                      <button 
                         onClick={addLogicEntry}
                         className="px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-600/40 transition-all flex items-center space-x-1"
                      >
                         <Plus size={12}/> <span>Add Entry</span>
                      </button>
                   </div>

                   <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                      {formData.logic_json?.map((entry: any) => (
                        <div 
                          key={entry.id}
                          onClick={() => setActiveLogicId(entry.id)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all relative group ${
                            activeLogicId === entry.id 
                              ? 'bg-blue-600/10 border-blue-500/50 shadow-lg' 
                              : 'bg-black/40 border-white/5 hover:border-white/20'
                          }`}
                        >
                           <button 
                             onClick={(e) => { e.stopPropagation(); removeLogicEntry(entry.id); }}
                             className="absolute -right-2 -top-2 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                           >
                             <X size={12}/>
                           </button>
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black uppercase text-blue-400">{entry.type}</span>
                              <span className="text-[8px] font-bold text-slate-600 uppercase italic">Entry #{entry.id.toString().slice(-4)}</span>
                           </div>
                           <p className="text-[11px] font-bold text-slate-300 truncate">{entry.description || 'No description provided'}</p>
                        </div>
                      ))}
                      {formData.logic_json?.length === 0 && (
                        <div className="py-12 text-center text-slate-600 italic text-[10px] uppercase font-black border-2 border-dashed border-white/5 rounded-3xl">
                           No logic entries defined
                        </div>
                      )}
                   </div>

                   <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="grid grid-cols-1 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1 italic">Check Frequency (Seconds)</label>
                            <div className="relative">
                               <Clock size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                               <input 
                                 type="number"
                                 value={formData.check_interval}
                                 onChange={e => setFormData({...formData, check_interval: parseInt(e.target.value)})}
                                 className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[12px] font-bold text-white outline-none focus:border-blue-500"
                               />
                            </div>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1 italic">Alert Duration (Seconds Delay)</label>
                            <div className="relative">
                               <AlertCircle size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                               <input 
                                 type="number"
                                 value={formData.alert_duration}
                                 onChange={e => setFormData({...formData, alert_duration: parseInt(e.target.value)})}
                                 className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[12px] font-bold text-white outline-none focus:border-blue-500"
                               />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Right: Detailed Logic Editor */}
                <div className="col-span-8 flex flex-col space-y-4 h-full">
                   {activeLogicEntry ? (
                     <>
                        <div className="grid grid-cols-2 gap-4">
                           <StyledSelect 
                             label="Logic Type"
                             value={activeLogicEntry.type}
                             onChange={e => updateLogicEntry(activeLogicEntry.id, 'type', e.target.value)}
                             options={LOGIC_TYPES.map(t => ({ value: t, label: t }))}
                           />
                           <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</label>
                             <input 
                               value={activeLogicEntry.description}
                               onChange={e => updateLogicEntry(activeLogicEntry.id, 'description', e.target.value)}
                               placeholder="What does this logic check?"
                               className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2 text-[12px] font-bold text-white outline-none focus:border-blue-500"
                             />
                           </div>
                        </div>

                        <div className="flex-1 flex flex-col space-y-2 min-h-0">
                           <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Logic Information</label>
                              <button 
                                onClick={() => setShowLineNumbers(!showLineNumbers)}
                                className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all ${showLineNumbers ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}
                              >
                                {showLineNumbers ? 'Hide Line Numbers' : 'Show Line Numbers'}
                              </button>
                           </div>
                           
                           <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl overflow-hidden flex font-mono text-[12px] shadow-inner relative group">
                              {showLineNumbers && (
                                <div className="bg-white/5 border-r border-white/10 px-3 py-4 text-slate-600 text-right select-none whitespace-pre leading-relaxed min-w-[40px]">
                                   {activeLogicEntry.logic_info.split('\n').map((_, i) => i + 1).join('\n')}
                                </div>
                              )}
                              <textarea 
                                value={activeLogicEntry.logic_info}
                                onChange={e => updateLogicEntry(activeLogicEntry.id, 'logic_info', e.target.value)}
                                placeholder={LOGIC_SUGGESTIONS[activeLogicEntry.type] || 'Enter logic parameters...'}
                                className="flex-1 bg-transparent p-4 outline-none text-blue-300 resize-none leading-relaxed custom-scrollbar placeholder:text-slate-700"
                                spellCheck={false}
                              />
                              
                              <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <span className="text-[8px] font-black text-slate-500 uppercase bg-black/60 px-2 py-1 rounded-lg border border-white/5">
                                    {activeLogicEntry.logic_info.length} Chars | {activeLogicEntry.logic_info.split('\n').length} Lines
                                 </span>
                              </div>
                           </div>
                        </div>
                     </>
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[40px] space-y-4">
                        <Activity size={40} className="text-slate-700" />
                        <div className="text-center">
                           <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Select an entry to modify logic</p>
                           <p className="text-[9px] text-slate-600 uppercase font-bold mt-1">Logic Specification Environment</p>
                        </div>
                     </div>
                   )}
                </div>
             </div>
           ) : (
             <div className="grid grid-cols-12 gap-8 p-2">
                {/* Left: Severity & Throttling */}
                <div className="col-span-4 space-y-6">
                   <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-400 border-l-2 border-amber-600 pl-3">Alert Routing Rules</h3>
                   
                   <StyledSelect 
                     label="Severity Level"
                     value={formData.severity}
                     onChange={(e: any) => setFormData({...formData, severity: e.target.value})}
                     options={['Critical', 'Warning', 'Info'].map(s => ({ value: s, label: s }))}
                   />

                   <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notification Throttle (Seconds)</label>
                         <p className="text-[8px] text-slate-600 uppercase font-bold mb-2 tracking-tight italic">Minimum time between re-alerts for the same issue</p>
                         <input 
                           type="number"
                           value={formData.notification_throttle}
                           onChange={e => setFormData({...formData, notification_throttle: parseInt(e.target.value)})}
                           className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500"
                         />
                      </div>
                   </div>

                   <div className="space-y-4">
                      <StyledSelect 
                        label="Primary Notification Method"
                        value={formData.notification_method}
                        onChange={(e: any) => setFormData({...formData, notification_method: e.target.value})}
                        options={['Email', 'Slack', 'Teams', 'PagerDuty', 'Webhook', 'SMS', 'Voice'].map(m => ({ value: m, label: m }))}
                      />
                      
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recipients Matrix</label>
                         <div className="flex space-x-2">
                            <input 
                              value={recipientInput}
                              onChange={e => setRecipientInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addRecipient()}
                              placeholder="Channel ID or Email..."
                              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[11px] outline-none focus:border-blue-500"
                            />
                            <button onClick={addRecipient} className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-xl transition-all"><Plus size={14}/></button>
                         </div>
                         <div className="flex flex-wrap gap-2 mt-2">
                            {formData.notification_recipients.map((r: string) => (
                              <div key={r} className="flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg">
                                 <span className="text-[10px] font-bold text-blue-300">{r}</span>
                                 <button onClick={() => removeRecipient(r)} className="text-slate-500 hover:text-rose-400"><X size={10}/></button>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>

                {/* Right: Recovery Methods (Linked Knowledge) */}
                <div className="col-span-8 space-y-6">
                   <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-400 flex items-center space-x-2 border-b border-white/5 pb-2">
                      <Activity size={14}/> <span>Recovery Intelligence (Linked BKM/Knowledge)</span>
                   </h3>
                   
                   <div className="space-y-4">
                      <div className="p-6 border-2 border-dashed border-white/5 rounded-3xl space-y-6">
                         <div className="flex items-center justify-between">
                            <div className="space-y-1">
                               <p className="text-[12px] font-black text-white uppercase tracking-tighter italic">Link Recovery Documents</p>
                               <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Documentation linked here will be presented to the on-call engineer during an alert.</p>
                            </div>
                            <div className="flex items-center space-x-2 bg-blue-600/10 px-3 py-1 rounded-lg border border-blue-600/20">
                               <List size={12} className="text-blue-400" />
                               <span className="text-[10px] font-black text-blue-400">{formData.recovery_docs?.length || 0} Linked</span>
                            </div>
                         </div>

                         <div className="relative group">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input 
                              value={recoverySearch}
                              onChange={e => setRecoverySearch(e.target.value)}
                              placeholder="Search Knowledge Base for Recovery Procedures..."
                              className="w-full bg-black/60 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-[11px] font-black uppercase outline-none focus:border-blue-500 transition-all shadow-2xl"
                            />
                         </div>

                         <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {filteredKnowledge?.map((entry: any) => (
                               <button
                                 key={entry.id}
                                 type="button"
                                 onClick={() => toggleRecoveryDoc(entry.id)}
                                 className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group/item ${
                                   formData.recovery_docs?.includes(entry.id)
                                     ? 'bg-blue-600/20 border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                                     : 'bg-black/40 border-white/5 hover:border-white/20'
                                 }`}
                               >
                                  {formData.recovery_docs?.includes(entry.id) && (
                                    <div className="absolute top-0 right-0 w-8 h-8 bg-blue-600 flex items-center justify-center rounded-bl-xl shadow-lg">
                                       <Check size={14} className="text-white" strokeWidth={4} />
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-2 mb-2">
                                     <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-800 text-slate-400 rounded border border-white/5">{entry.category}</span>
                                     <span className="text-[8px] font-bold text-slate-600 uppercase">#{entry.id}</span>
                                  </div>
                                  <p className={`text-[11px] font-black uppercase tracking-tight leading-tight transition-colors ${formData.recovery_docs?.includes(entry.id) ? 'text-blue-300' : 'text-slate-300'}`}>
                                    {entry.title}
                                  </p>
                               </button>
                            ))}
                            {filteredKnowledge?.length === 0 && (
                               <div className="col-span-2 py-8 text-center text-slate-600 italic text-[10px] uppercase font-black">No matching knowledge entries found</div>
                            )}
                         </div>
                      </div>
                   </div>
                   
                   <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start space-x-3">
                      <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 mt-1">
                         <AlertCircle size={16} />
                      </div>
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest italic">Operational Directive</p>
                         <p className="text-[9px] text-slate-400 font-bold leading-relaxed">Linking high-quality recovery documentation is critical for reducing Mean Time to Repair (MTTR). Ensure the linked Knowledge Entries contain up-to-date troubleshooting steps.</p>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
           <div className="flex items-center space-x-2">
              <button 
                onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all ${
                  formData.is_active 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                    : 'bg-slate-500/10 border-white/10 text-slate-500 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${formData.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{formData.is_active ? 'Monitor Active' : 'Monitor Paused'}</span>
              </button>
           </div>

           <div className="flex space-x-4">
              <button onClick={onClose} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all">Abort</button>
              <button 
                onClick={() => mutation.mutate(formData)}
                disabled={mutation.isPending}
                className="px-12 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:bg-slate-700 flex items-center space-x-2"
              >
                {mutation.isPending ? <Clock className="animate-spin" size={14} /> : <Check size={14} />}
                <span>{item ? 'Commit Synchronized Logic' : 'Deploy Logic to Matrix'}</span>
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  )
}
