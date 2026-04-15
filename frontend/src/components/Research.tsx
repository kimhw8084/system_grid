import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ListTodo, History, ShieldAlert, Globe, 
  Zap, Save, X, PlusCircle, User, MessageSquare,
  MoreVertical, RefreshCcw, TrendingUp, AlertTriangle,
  Lightbulb, ShieldCheck, Calendar, Activity, Database, Server,
  FileText, Clipboard, Terminal, ArrowRight, Shield, Download, Share2,
  Clock, CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye, Camera, Link as LinkIcon, Layers, Settings, Check
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { AgGridReact } from 'ag-grid-react'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'
import { StatusPill } from './shared/StatusPill'
import { ConfigRegistryModal } from './ConfigRegistry'

// --- Components ---

const CompactSummary = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-inner">
    <div>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xl font-bold text-white tracking-tighter">{value}</p>
    </div>
    <div className={`p-2 rounded-lg bg-white/5 ${color}`}><Icon size={18} /></div>
  </div>
)

// --- Priority Gauge Component ---
const PriorityGauge = ({ value, onChange, label, hint }: any) => {
  const levels = [
    { v: 1, color: 'bg-emerald-500', label: 'Low', desc: 'Minimal impact, informational' },
    { v: 3, color: 'bg-blue-500', label: 'Medium', desc: 'Non-critical service degradation' },
    { v: 5, color: 'bg-amber-500', label: 'High', desc: 'Partial system outage / Risk' },
    { v: 8, color: 'bg-rose-500', label: 'Critical', desc: 'Global outage / Data Loss' },
    { v: 10, color: 'bg-purple-600', label: 'Emergency', desc: 'Total FAB Halt / Safety' }
  ]

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
        <span className="text-[14px] font-bold text-white leading-none">{value}/10</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full flex overflow-hidden border border-white/5">
        {[...Array(10)].map((_, i) => (
          <div 
            key={i} 
            onClick={() => onChange(i + 1)}
            className={`flex-1 cursor-pointer transition-all border-r border-black/20 last:border-0 ${
              i < value ? (i < 2 ? 'bg-emerald-500' : i < 4 ? 'bg-blue-500' : i < 7 ? 'bg-amber-500' : i < 9 ? 'bg-rose-500' : 'bg-purple-600') : 'bg-transparent'
            }`}
          />
        ))}
      </div>
      <p className="text-[9px] text-slate-500 italic leading-tight">{hint || levels.find(l => value <= l.v)?.desc}</p>
    </div>
  )
}

export default function Research() {
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(10)
  const [showStyleLab, setShowStyleLab] = useState(true)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([])
  const [showConfig, setShowConfig] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [activeModal, setActiveModal] = useState<any>(null)
  const [activeDetails, setActiveDetails] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data: investigations, isLoading } = useQuery({ 
    queryKey: ['investigations'], 
    queryFn: async () => (await apiFetch('/api/v1/investigations/')).json() 
  })

  const { data: rcaRecords, isLoading: rcaLoading } = useQuery({ 
    queryKey: ['rca-records'], 
    queryFn: async () => (await apiFetch('/api/v1/rca/')).json() 
  })
  
  const { data: devices } = useQuery({ 
    queryKey: ['devices'], 
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json() 
  })
  
  const { data: options } = useQuery({ 
    queryKey: ['settings-options'], 
    queryFn: async () => (await apiFetch('/api/v1/settings/options')).json() 
  })

  const { data: failureModes } = useQuery({
    queryKey: ['far-failure-modes'],
    queryFn: async () => (await apiFetch('/api/v1/far/modes')).json()
  })

  const handleExportCSV = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `SysGrid_Research_${new Date().toISOString().split('T')[0]}.csv`,
        allColumns: false,
        onlySelected: false
      })
    }
  }

  const handleCopyToClipboard = () => {
    if (gridRef.current?.api) {
      const csvData = gridRef.current.api.getDataAsCsv({
        allColumns: false,
        onlySelected: true,
        suppressQuotes: true
      })
      if (csvData) {
        navigator.clipboard.writeText(csvData)
          .then(() => toast.success("Table data copied to clipboard"))
          .catch(() => toast.error("Failed to copy data"))
      }
    }
  }

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const isRca = data.type === 'RCA'
      const url = data.id ? `/api/v1/${isRca ? 'rca' : 'investigations'}/${data.id}` : `/api/v1/${isRca ? 'rca' : 'investigations'}/`
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: (_, variables) => { 
      queryClient.invalidateQueries({ queryKey: [variables.type === 'RCA' ? 'rca-records' : 'investigations'] })
      toast.success('System Intelligence Synchronized')
      setActiveModal(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (item: any) => {
      const url = item.type === 'RCA' ? `/api/v1/rca/${item.id}` : `/api/v1/investigations/${item.id}`
      return apiFetch(url, { method: 'DELETE' })
    },
    onSuccess: (_, variables) => { 
      queryClient.invalidateQueries({ queryKey: [variables.type === 'RCA' ? 'rca-records' : 'investigations'] })
      toast.success('Record Purged')
    }
  })

  const combinedData = useMemo(() => {
    const invs = (investigations || []).map((i: any) => ({ ...i, type: 'Research' }))
    const rcas = (rcaRecords || []).map((r: any) => ({ ...r, type: 'RCA', category: 'RCA' }))
    return [...invs, ...rcas].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
  }, [investigations, rcaRecords])

  const stats = useMemo(() => {
    return {
      total: combinedData.length,
      analyzing: combinedData.filter((i: any) => i.status === 'Analyzing' || i.status === 'Open' || i.status === 'Investigation').length,
      rca: combinedData.filter((i: any) => i.type === 'RCA').length,
      urgent: combinedData.filter((i: any) => i.priority >= 8 || i.severity === 'P1').length
    }
  }, [combinedData])

  useEffect(() => {
    if (gridRef.current?.api) {
      setTimeout(() => gridRef.current.api.sizeColumnsToFit(), 100)
    }
  }, [fontSize, rowDensity, combinedData])

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
      width: 80,
      minWidth: 80,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      valueGetter: (p: any) => p.data.type === 'RCA' ? `RCA-${p.data.id}` : `RES-${p.data.id}`
    },
    { 
      field: "type", 
      headerName: "Type", 
      width: 100, 
      filter: true, 
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <span style={{ fontSize: `${fontSize}px` }} className={`font-bold uppercase tracking-widest ${p.value === 'RCA' ? 'text-purple-400' : 'text-blue-400'}`}>
          {p.value}
        </span>
      ),
      hide: hiddenColumns.includes("type")
    },
    { 
      field: "title", 
      headerName: "Research Title", 
      flex: 1.5, 
      pinned: 'left', 
      filter: true, 
      cellClass: 'text-left font-bold uppercase tracking-tight',
      headerClass: 'text-left',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("title")
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 110, 
      filter: true, 
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => <StatusPill value={p.value} />,
      hide: hiddenColumns.includes("status")
    },
    { 
      field: "priority", 
      headerName: "Risk Level", 
      width: 110, 
      filter: true, 
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const val = p.data.type === 'RCA' ? (p.data.priority || 5) : (p.data.priority === 'Urgent' ? 9 : p.data.priority === 'High' ? 7 : p.data.priority === 'Medium' ? 5 : 3)
        const color = val >= 8 ? 'text-rose-500' : val >= 6 ? 'text-amber-500' : 'text-blue-400'
        return (
          <div className="flex items-center justify-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${color.replace('text', 'bg')} animate-pulse`} />
            <span style={{ fontSize: `${fontSize}px` }} className={`font-bold uppercase ${color}`}>LVL {val}</span>
          </div>
        )
      },
      hide: hiddenColumns.includes("priority")
    },
    { 
      field: "updated_at", 
      headerName: "Last Pulse", 
      width: 160, 
      filter: true, 
      cellClass: 'text-center font-bold text-slate-400 uppercase', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{new Date(p.value).toLocaleString()}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("updated_at")
    },
    {
      field: "actions",
      headerName: "Action",
      width: 120,
      minWidth: 120,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      resizable: false,
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex rounded-lg p-0.5 border border-white/5 bg-transparent">
               <button onClick={() => setActiveDetails(p.data)} title="Inspect Record" className="p-1.5 text-blue-400 hover:text-blue-200 transition-all border-r border-white/5"><Eye size={14}/></button>
               <button onClick={() => setActiveModal(p.data)} title="Edit Record" className="p-1.5 text-emerald-400 hover:text-emerald-200 transition-all border-r border-white/5"><Edit2 size={14}/></button>
               <button onClick={() => setConfirmModal({ 
                 isOpen: true, 
                 title: `Purge ${p.data.type}`, 
                 message: 'Permanently remove this record?', 
                 onConfirm: () => deleteMutation.mutate(p.data) 
               })} title="Purge Record" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      ),
      suppressHide: true
    }
  ], [setActiveDetails, setActiveModal, setConfirmModal, deleteMutation, fontSize, hiddenColumns]) as any

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2 text-white">
                <Shield size={24} className="text-blue-500" /> Research Matrix
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">Unified System Intelligence & RCA Engine</p>
           </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SCAN RESEARCH..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>

          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5 space-x-1">
             <button onClick={() => setShowStyleLab(!showStyleLab)} className={`p-1.5 hover:bg-white/10 ${showStyleLab ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Toggle Style Lab"><Activity size={16} /></button>
             <button onClick={() => setShowColumnPicker(!showColumnPicker)} className={`p-1.5 hover:bg-white/10 ${showColumnPicker ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Column Picker"><Sliders size={16} /></button>
             <button onClick={handleExportCSV} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-emerald-400 rounded-lg transition-all" title="Export CSV"><FileText size={16} /></button>
             <button onClick={handleCopyToClipboard} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Copy to Clipboard"><Clipboard size={16} /></button>
             <button onClick={() => setShowConfig(true)} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Research Config"><Settings size={16} /></button>
          </div>

          <button 
            onClick={() => setActiveModal({ title: '', status: 'Open', priority: 1, type: null, problem_statement: '' })} 
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <PlusCircle size={14}/> Add Research
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showStyleLab && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md">
               <div className="flex items-center space-x-12">
                  <div className="flex items-center space-x-3 text-blue-400">
                     <Activity size={16} />
                     <span className="text-[10px] font-bold uppercase tracking-widest">Density Laboratory</span>
                  </div>
                  <div className="flex items-center space-x-6">
                     <div className="flex items-center space-x-4">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Font</span>
                        <input type="range" min="8" max="14" step="1" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-32 accent-blue-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer" />
                        <span className="text-[10px] text-white w-4 font-bold">{fontSize}px</span>
                     </div>
                     <div className="flex items-center space-x-4 border-l border-white/10 pl-6">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Row</span>
                        <input type="range" min="4" max="24" step="2" value={rowDensity} onChange={e => setRowDensity(Number(e.target.value))} className="w-32 accent-indigo-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer" />
                        <span className="text-[10px] text-white w-4 font-bold">{rowDensity}px</span>
                     </div>
                  </div>
               </div>
               <button onClick={() => setShowStyleLab(false)} className="text-slate-500 hover:text-white transition-colors"><X size={16}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-4 gap-3">
        <CompactSummary label="Total Intelligence" value={stats.total} icon={Activity} color="text-blue-400" />
        <CompactSummary label="Under Analysis" value={stats.analyzing} icon={Terminal} color="text-indigo-400" />
        <CompactSummary label="Root Cause Records" value={stats.rca} icon={ShieldAlert} color="text-purple-400" />
        <CompactSummary label="Critical/Emergency" value={stats.urgent} icon={AlertTriangle} color="text-rose-500" />
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative border-white/5">
        {(isLoading || rcaLoading) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4 text-blue-400">
             <RefreshCcw size={32} className="animate-spin" />
             <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Syncing Intelligence Matrix...</p>
          </div>
        )}
        <AgGridReact
          ref={gridRef}
          rowData={combinedData}
          columnDefs={columnDefs as any}
          headerHeight={fontSize + rowDensity + 10}
          rowHeight={fontSize + rowDensity + 10}
          quickFilterText={searchTerm}
          animateRows={true}
          enableCellTextSelection={true}
          rowSelection="multiple"
          onSelectionChanged={e => setSelectedIds(e.api.getSelectedNodes().map((n: any) => n.data.id))}
        />
        <AnimatePresence>
          {showColumnPicker && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute top-0 right-0 bottom-0 w-64 bg-slate-950/90 backdrop-blur-xl border-l border-white/10 z-[60] flex flex-col shadow-2xl">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center space-x-2"><Sliders size={14} /> <span>Toggle Columns</span></h3>
                <button onClick={() => setShowColumnPicker(false)} className="text-slate-500 hover:text-white"><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                {columnDefs.filter((c: any) => c.field && !c.suppressHide).map((col: any) => (
                  <label key={col.field} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-all">
                    <input type="checkbox" checked={!hiddenColumns.includes(col.field)} onChange={() => setHiddenColumns(hiddenColumns.includes(col.field) ? hiddenColumns.filter(f => f !== col.field) : [...hiddenColumns, col.field])} className="sr-only" />
                    <div className={`w-4 h-4 rounded border transition-all ${!hiddenColumns.includes(col.field) ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'border-white/10 bg-black/40 group-hover:border-white/20'}`}>
                       {!hiddenColumns.includes(col.field) && <Check size={12} className="text-white mx-auto" />}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${!hiddenColumns.includes(col.field) ? 'text-slate-200' : 'text-slate-500'}`}>{col.headerName || col.field}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeModal && (
          <UnifiedResearchForm 
            item={activeModal} 
            options={options} 
            devices={devices} 
            onClose={() => setActiveModal(null)} 
            onSave={(d: any) => mutation.mutate(d)}
            isSaving={mutation.isPending}
          />
        )}
        {activeDetails && (
          activeDetails.type === 'RCA' ? (
            <EnhancedRcaDetails 
              item={activeDetails} 
              devices={devices}
              options={options}
              failureModes={failureModes}
              onClose={() => setActiveDetails(null)} 
              onSave={(d: any) => mutation.mutate(d)}
              fontSize={fontSize}
              rowDensity={rowDensity}
            />
          ) : (
            <ResearchDetails 
              item={activeDetails} 
              onClose={() => setActiveDetails(null)} 
              onSave={(d: any) => mutation.mutate(d)}
              setConfirmModal={setConfirmModal}
              fontSize={fontSize}
              rowDensity={rowDensity}
            />
          )
        )}
      </AnimatePresence>

      <ConfirmationModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} />

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: #020617;
          --ag-header-background-color: #0f172a;
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #3b82f6;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: ${fontSize}px;
        }
        .ag-root-wrapper { border: none !important; border-radius: 1rem !important; }
        .ag-header-cell-label { font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-size: ${fontSize}px !important; justify-content: center !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; font-weight: 700 !important; font-size: ${fontSize}px !important; border-right: 1px solid rgba(255,255,255,0.02) !important; }
        .ag-row { border-bottom: 1px solid rgba(255,255,255,0.05) !important; }
        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.15) !important; }
      `}</style>
    </div>
  )
}

function UnifiedResearchForm({ item, options, devices, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ ...item })
  const [step, setStep] = useState(item.type ? 1 : 0)

  const handleFinish = () => {
    if (!formData.title || !formData.type) {
      toast.error("Title and Type are required")
      return
    }
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-xl p-8 rounded-[32px] border border-blue-500/30 space-y-6">
        {step === 0 ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold uppercase text-white tracking-tighter">Initialize Research Flow</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Select the nature of this investigation</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TypeCard 
                icon={ShieldAlert} 
                title="RCA (Root Cause Analysis)" 
                desc="Formal investigation for system failures, outages, or incidents requiring permanent resolution." 
                active={formData.type === 'RCA'}
                color="border-purple-500/50 text-purple-400"
                onClick={() => { setFormData({...formData, type: 'RCA'}); setStep(1); }}
              />
              <TypeCard 
                icon={Search} 
                title="General Research" 
                desc="Investigations regarding system behavior, optimization, or external intel. Not strictly failure-based." 
                active={formData.type === 'Research'}
                color="border-blue-500/50 text-blue-400"
                onClick={() => { setFormData({...formData, type: 'Research'}); setStep(1); }}
              />
            </div>
            <button onClick={onClose} className="w-full py-3 text-[10px] font-bold uppercase text-slate-500 hover:text-white transition-all">Abort Initialization</button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className={`text-xl font-bold uppercase flex items-center gap-3 tracking-tighter ${formData.type === 'RCA' ? 'text-purple-400' : 'text-blue-400'}`}>
                {formData.type === 'RCA' ? <ShieldAlert size={20}/> : <Search size={20}/>} 
                Initialize {formData.type}
              </h2>
              <button onClick={() => setStep(0)} className="text-[9px] font-bold uppercase text-slate-500 hover:text-white underline tracking-widest">Change Type</button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Intel Title</label>
                <input 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-[12px] outline-none focus:border-blue-500 text-white font-bold" 
                  placeholder={formData.type === 'RCA' ? "E.G. FAB-2 LINE BLOCKAGE: SENSOR FAILURE" : "E.G. CLUSTER LATENCY OPTIMIZATION STUDY"} 
                />
              </div>

              <PriorityGauge 
                value={formData.priority || 1} 
                onChange={(v: number) => setFormData({...formData, priority: v})} 
                label="Initial Priority Assessment"
              />

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Problem Statement / Narrative Goal</label>
                <textarea 
                  value={formData.problem_statement} 
                  onChange={e => setFormData({...formData, problem_statement: e.target.value})} 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-[11px] outline-none focus:border-blue-500 text-slate-300 min-h-[100px] leading-relaxed" 
                  placeholder="Describe the context or the problem in detail for easy recall..." 
                />
              </div>
            </div>

            <div className="flex space-x-4 pt-2">
              <button onClick={onClose} className="flex-1 py-3.5 text-[10px] font-bold uppercase text-slate-500 hover:text-white transition-all">Cancel</button>
              <button onClick={handleFinish} className={`flex-[2] py-3.5 ${formData.type === 'RCA' ? 'bg-purple-600 shadow-purple-500/20' : 'bg-blue-600 shadow-blue-500/20'} text-white rounded-xl text-[10px] font-bold uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 tracking-[0.2em]`}>
                {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Zap size={16} />} 
                Launch {formData.type} Flow
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function TypeCard({ icon: Icon, title, desc, active, color, onClick }: any) {
  return (
    <button onClick={onClick} className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col gap-4 group ${active ? color + ' bg-white/5 shadow-xl' : 'border-white/5 bg-transparent hover:border-white/10 hover:bg-white/5'}`}>
      <div className={`p-3 rounded-xl bg-white/5 w-fit ${active ? color : 'text-slate-500'}`}><Icon size={24} /></div>
      <div>
        <h3 className={`text-sm font-bold uppercase tracking-tighter mb-1 ${active ? color : 'text-slate-300'}`}>{title}</h3>
        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{desc}</p>
      </div>
    </button>
  )
}

function EnhancedRcaDetails({ item, devices, options, failureModes, onClose, onSave, fontSize, rowDensity }: any) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({ ...item })
  const [activeTab, setActiveTab] = useState('overview')
  const [activeSubTab, setActiveSubTab] = useState('identification')
  const [newTimeline, setNewTimeline] = useState({ event_type: 'Observation', description: '', event_time: new Date().toISOString(), owner: '', owner_team: '' })

  const systems = useMemo(() => Array.from(new Set(devices?.map((d: any) => d.system) || [])), [devices])
  const filteredAssets = useMemo(() => devices?.filter((d: any) => d.system === formData.target_system) || [], [devices, formData.target_system])
  const filteredServices = useMemo(() => {
    const assetIds = formData.impacted_asset_ids || []
    return devices?.filter((d: any) => assetIds.includes(d.id)).flatMap((d: any) => d.logical_services || []) || []
  }, [devices, formData.impacted_asset_ids])

  const handleSave = () => {
    onSave(formData)
  }

  const handlePaste = (e: React.ClipboardEvent, target: 'evidence' | 'identification' | 'rca', stepIdx?: number) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (event: any) => {
            const base64 = event.target.result
            if (target === 'evidence') {
              setFormData({ ...formData, evidence_json: [...(formData.evidence_json || []), { type: 'image', content: base64, timestamp: new Date().toISOString() }] })
            } else if (target === 'identification') {
              const steps = [...(formData.identification_steps_json || [])]
              if (stepIdx !== undefined) {
                steps[stepIdx].images = [...(steps[stepIdx].images || []), base64]
                setFormData({ ...formData, identification_steps_json: steps })
              }
            } else if (target === 'rca') {
              const steps = [...(formData.rca_steps_json || [])]
              if (stepIdx !== undefined) {
                steps[stepIdx].images = [...(steps[stepIdx].images || []), base64]
                setFormData({ ...formData, rca_steps_json: steps })
              }
            }
            toast.success('Evidence Captured')
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-6" onPaste={(e) => activeTab === 'evidence' ? handlePaste(e, 'evidence') : null}>
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-7xl h-[95vh] rounded-[40px] border border-purple-500/20 overflow-hidden flex flex-col shadow-2xl">
        
        {/* RCA Header - Dense */}
        <div className="px-8 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-purple-600/20 rounded-2xl text-purple-400 border border-purple-500/30 shadow-lg"><ShieldAlert size={24} /></div>
            <div>
              <div className="flex items-center space-x-3 mb-0.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">RCA-{formData.id || 'NEW'} // {formData.target_system || 'UNASSIGNED'}</span>
                <StatusPill value={formData.status} />
                <div className="flex items-center gap-1">
                   <div className={`w-2 h-2 rounded-full ${(formData.priority || 0) >= 8 ? 'bg-rose-500' : (formData.priority || 0) >= 5 ? 'bg-amber-500' : 'bg-blue-400'}`} />
                   <span className="text-[9px] font-bold text-white uppercase">LVL {formData.priority}</span>
                </div>
              </div>
              <h1 className="text-xl font-bold uppercase tracking-tighter text-white leading-none">{formData.title}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={handleSave} className="px-6 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-bold uppercase shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center gap-2 tracking-widest font-bold"><Save size={14}/> Sync Intelligence</button>
            <button onClick={onClose} className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all"><X size={18}/></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Vertical Nav - Slimmer */}
          <div className="w-48 border-r border-white/5 bg-black/20 p-4 space-y-1 shrink-0">
            <RcaTabBtn active={activeTab === 'overview'} icon={LayoutGrid} label="Overview" onClick={() => setActiveTab('overview')} />
            <RcaTabBtn active={activeTab === 'timeline'} icon={History} label="Timeline" onClick={() => setActiveTab('timeline')} />
            <RcaTabBtn active={activeTab === 'investigation'} icon={Terminal} label="Investigation" onClick={() => setActiveTab('investigation')} />
            <RcaTabBtn active={activeTab === 'causes'} icon={Search} label="Causes / BKM" onClick={() => setActiveTab('causes')} />
            <RcaTabBtn active={activeTab === 'mitigation'} icon={Shield} label="Mitigation" onClick={() => setActiveTab('mitigation')} />
            <RcaTabBtn active={activeTab === 'evidence'} icon={Camera} label="Evidence" onClick={() => setActiveTab('evidence')} />
          </div>

          {/* RCA Workspace - Dense Layout */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#020617]/50 p-6">
            <div className="max-w-6xl mx-auto space-y-4">
               
               {activeTab === 'overview' && (
                 <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-8 space-y-4">
                       <SectionCard icon={FileText} title="Incident Narrative & Goal" color="text-slate-400">
                          <textarea 
                            value={formData.problem_statement} 
                            onChange={e => setFormData({...formData, problem_statement: e.target.value})}
                            className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-[11px] font-bold text-slate-300 outline-none focus:border-purple-500/30 min-h-[120px] leading-relaxed"
                            placeholder="Detailed problem statement..."
                          />
                       </SectionCard>

                       <div className="grid grid-cols-2 gap-4">
                          <SectionCard icon={Clock} title="Incident Timing" color="text-blue-400">
                             <div className="grid grid-cols-1 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Occurrence Time</label>
                                  <input type="datetime-local" value={formData.occurrence_at?.slice(0, 16)} onChange={e => setFormData({...formData, occurrence_at: e.target.value})} className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-white outline-none focus:border-blue-500/30 [color-scheme:dark]" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Acknowledged Time</label>
                                  <input type="datetime-local" value={formData.acknowledged_at?.slice(0, 16)} onChange={e => setFormData({...formData, acknowledged_at: e.target.value})} className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-white outline-none focus:border-emerald-500/30 [color-scheme:dark]" />
                                </div>
                             </div>
                          </SectionCard>
                          <SectionCard icon={User} title="Ownership & Intel" color="text-indigo-400">
                             <div className="grid grid-cols-1 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Lead Investigator</label>
                                  <input value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-white outline-none focus:border-indigo-500/30" placeholder="Owner Name..." />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Jira Correlation</label>
                                  <input value={formData.jira_link} onChange={e => setFormData({...formData, jira_link: e.target.value})} className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-blue-400 outline-none focus:border-blue-500/30" placeholder="https://jira.com/..." />
                                </div>
                             </div>
                          </SectionCard>
                       </div>

                       <SectionCard icon={ShieldAlert} title="FAB Impact Assessment" color="text-rose-400">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-3">
                                <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Impact Categories</label>
                                <div className="grid grid-cols-2 gap-2">
                                   {['Flow Halt', 'Scrap Risk', 'Quality Delta', 'Safety Trip', 'Data Loss', 'Tool Down'].map(c => (
                                     <button 
                                        key={c}
                                        onClick={() => {
                                          const cats = formData.fab_impact_json?.categories || []
                                          setFormData({...formData, fab_impact_json: { ...formData.fab_impact_json, categories: cats.includes(c) ? cats.filter((i:string)=>i!==c) : [...cats, c] }})
                                        }}
                                        className={`px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase transition-all ${formData.fab_impact_json?.categories?.includes(c) ? 'bg-rose-500/20 border-rose-500 text-rose-500' : 'bg-white/5 border-white/5 text-slate-500'}`}
                                     >
                                        {c}
                                     </button>
                                   ))}
                                </div>
                             </div>
                             <div className="space-y-3">
                                <PriorityGauge 
                                  value={formData.fab_impact_json?.severity || 1} 
                                  onChange={(v:number) => setFormData({...formData, fab_impact_json: { ...formData.fab_impact_json, severity: v }})} 
                                  label="Operational Severity Gauge"
                                />
                                <textarea 
                                  value={formData.fab_impact_json?.explanation}
                                  onChange={e => setFormData({...formData, fab_impact_json: { ...formData.fab_impact_json, explanation: e.target.value }})}
                                  className="w-full bg-slate-950 border border-white/5 rounded-lg p-3 text-[10px] font-bold text-slate-300 outline-none focus:border-rose-500/30 min-h-[60px]"
                                  placeholder="Detailed impact explanation..."
                                />
                             </div>
                          </div>
                       </SectionCard>
                    </div>

                    <div className="col-span-4 space-y-4">
                       <SectionCard icon={Database} title="Relational Blast Radius" color="text-amber-400">
                          <div className="space-y-4">
                             <div className="space-y-1.5">
                                <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Target System</label>
                                <StyledSelect 
                                  value={formData.target_system} 
                                  onChange={e => setFormData({...formData, target_system: e.target.value, impacted_asset_ids: [], impacted_service_ids: []})}
                                  options={systems.map(s => ({value:s, label:s}))}
                                  placeholder="Select System..."
                                />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Impacted Assets ({formData.impacted_asset_ids?.length || 0})</label>
                                <div className="h-32 bg-slate-950 border border-white/5 rounded-xl p-2 overflow-y-auto custom-scrollbar space-y-1">
                                   {filteredAssets.map((a: any) => (
                                     <label key={a.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                                        <input 
                                          type="checkbox" 
                                          checked={formData.impacted_asset_ids?.includes(a.id)}
                                          onChange={e => {
                                            const ids = formData.impacted_asset_ids || []
                                            setFormData({...formData, impacted_asset_ids: e.target.checked ? [...ids, a.id] : ids.filter((i:number)=>i!==a.id), impacted_service_ids: []})
                                          }}
                                          className="sr-only"
                                        />
                                        <div className={`w-3 h-3 rounded border ${formData.impacted_asset_ids?.includes(a.id) ? 'bg-amber-500 border-amber-500' : 'border-white/10'}`} />
                                        <span className="text-[9px] font-bold uppercase text-slate-300">{a.name}</span>
                                     </label>
                                   ))}
                                   {filteredAssets.length === 0 && <p className="text-[8px] text-slate-600 text-center py-8 font-bold uppercase">Select System First</p>}
                                </div>
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Service Drill-down ({formData.impacted_service_ids?.length || 0})</label>
                                <div className="h-32 bg-slate-950 border border-white/5 rounded-xl p-2 overflow-y-auto custom-scrollbar space-y-1">
                                   {filteredServices.map((s: any) => (
                                     <label key={s.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                                        <input 
                                          type="checkbox" 
                                          checked={formData.impacted_service_ids?.includes(s.id)}
                                          onChange={e => {
                                            const ids = formData.impacted_service_ids || []
                                            setFormData({...formData, impacted_service_ids: e.target.checked ? [...ids, s.id] : ids.filter((i:number)=>i!==s.id)})
                                          }}
                                          className="sr-only"
                                        />
                                        <div className={`w-3 h-3 rounded border ${formData.impacted_service_ids?.includes(s.id) ? 'bg-indigo-500 border-indigo-500' : 'border-white/10'}`} />
                                        <span className="text-[9px] font-bold uppercase text-slate-300">{s.name}</span>
                                     </label>
                                   ))}
                                   {filteredServices.length === 0 && <p className="text-[8px] text-slate-600 text-center py-8 font-bold uppercase">Select Assets First</p>}
                                </div>
                             </div>
                          </div>
                       </SectionCard>

                       <SectionCard icon={LinkIcon} title="Linked Failure Modes (FAR)" color="text-purple-400">
                          <div className="space-y-3">
                             <div className="h-40 bg-slate-950 border border-white/5 rounded-xl p-2 overflow-y-auto custom-scrollbar space-y-1">
                                {failureModes?.filter((fm:any) => fm.system_name === formData.target_system).map((fm: any) => (
                                  <label key={fm.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/5">
                                     <input 
                                       type="checkbox" 
                                       checked={formData.linked_failure_modes?.some((l:any)=>l.id === fm.id)}
                                       onChange={e => {
                                         const modes = formData.linked_failure_modes || []
                                         setFormData({...formData, linked_failure_modes: e.target.checked ? [...modes, fm] : modes.filter((m:any)=>m.id!==fm.id)})
                                       }}
                                       className="sr-only"
                                     />
                                     <div className={`w-3 h-3 rounded border ${formData.linked_failure_modes?.some((l:any)=>l.id === fm.id) ? 'bg-purple-500 border-purple-500' : 'border-white/10'}`} />
                                     <div>
                                        <p className="text-[9px] font-bold uppercase text-slate-200">{fm.title}</p>
                                        <p className="text-[7px] font-bold uppercase text-slate-500">RPN: {fm.rpn} // SEV: {fm.severity}</p>
                                     </div>
                                  </label>
                                ))}
                                {(!failureModes || failureModes.length === 0) && <p className="text-[8px] text-slate-600 text-center py-10 font-bold uppercase">No FM Linked</p>}
                             </div>
                             <p className="text-[7px] text-slate-600 uppercase font-bold text-center italic">Establishing relational hooks to Failure Analysis matrix</p>
                          </div>
                       </SectionCard>
                    </div>
                 </div>
               )}

               {activeTab === 'timeline' && (
                 <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 grid grid-cols-12 gap-4 items-end shadow-xl">
                       <div className="col-span-4">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Event Narrative</label>
                          <input 
                            value={newTimeline.description} 
                            onChange={e => setNewTimeline({...newTimeline, description: e.target.value})}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-[11px] font-bold text-white outline-none focus:border-purple-500"
                            placeholder="E.G. ALERT FIRED: DB LATENCY EXCEEDED 500MS"
                          />
                       </div>
                       <div className="col-span-2">
                         <StyledSelect 
                          label="Type"
                          value={newTimeline.event_type}
                          onChange={e => setNewTimeline({...newTimeline, event_type: e.target.value})}
                          options={[{value:'Detection', label:'Detection'}, {value:'Observation', label:'Observation'}, {value:'Mitigation', label:'Mitigation'}, {value:'Resolution', label:'Resolution'}, {value:'Escalation', label:'Escalation'}]}
                         />
                       </div>
                       <div className="col-span-2">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 px-1">POC / Owner</label>
                          <input value={newTimeline.owner} onChange={e => setNewTimeline({...newTimeline, owner: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-[11px] font-bold text-white outline-none focus:border-purple-500" placeholder="Name" />
                       </div>
                       <div className="col-span-3">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Event Time</label>
                          <input 
                            type="datetime-local"
                            value={newTimeline.event_time.slice(0, 16)}
                            onChange={e => setNewTimeline({...newTimeline, event_time: new Date(e.target.value).toISOString()})}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-400 outline-none focus:border-purple-500 [color-scheme:dark]"
                          />
                       </div>
                       <button 
                        onClick={() => {
                          const timeline = [...(formData.timeline || []), { ...newTimeline, id: Date.now() }]
                          setFormData({ ...formData, timeline })
                          setNewTimeline({ event_type: 'Observation', description: '', event_time: new Date().toISOString(), owner: '', owner_team: '' })
                        }}
                        className="p-2.5 bg-purple-600 text-white rounded-xl shadow-lg active:scale-95 transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>

                    <div className="relative pl-6 space-y-4">
                       <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-blue-500 to-transparent opacity-30" />
                       {(formData.timeline || []).sort((a:any, b:any) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime()).map((e: any) => (
                         <div key={e.id} className="relative bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all">
                            <div className="absolute -left-[23px] top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-950 border-2 border-purple-500 rounded-full z-10 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                            <div className="flex items-center gap-6">
                               <div className="w-32 shrink-0">
                                  <p className="text-[10px] font-bold text-slate-200">{new Date(e.event_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                  <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded border ${
                                    e.event_type === 'Detection' ? 'bg-rose-500/20 border-rose-500 text-rose-500' :
                                    e.event_type === 'Resolution' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                                    'bg-blue-500/20 border-blue-500 text-blue-400'
                                  }`}>{e.event_type}</span>
                               </div>
                               <div>
                                  <p className="text-[11px] font-bold text-white uppercase tracking-tight">{e.description}</p>
                                  <div className="flex items-center gap-2 mt-0.5 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                     <User size={10} /> <span>{e.owner || 'Unknown'}</span>
                                     <span className="opacity-30">|</span>
                                     <Layers size={10} /> <span>{e.owner_team || 'N/A'}</span>
                                  </div>
                               </div>
                            </div>
                            <button onClick={() => setFormData({...formData, timeline: formData.timeline.filter((t:any)=>t.id!==e.id)})} className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-rose-500 transition-all"><Trash2 size={14}/></button>
                         </div>
                       ))}
                    </div>
                 </div>
               )}

               {activeTab === 'investigation' && (
                 <div className="space-y-6">
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-fit">
                       <button onClick={() => setActiveSubTab('identification')} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === 'identification' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-white'}`}>Identification Flow</button>
                       <button onClick={() => setActiveSubTab('rca')} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === 'rca' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-white'}`}>RCA Logic Ladder</button>
                    </div>

                    <div className="space-y-4">
                       {(activeSubTab === 'identification' ? formData.identification_steps_json : formData.rca_steps_json || []).map((step: any, idx: number) => (
                         <div key={idx} className="bg-white/5 border border-white/5 rounded-3xl p-5 space-y-4 group relative">
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs">{idx + 1}</div>
                                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{activeSubTab === 'identification' ? 'Validation Step' : 'Logic Node'}</h4>
                               </div>
                               <button onClick={() => {
                                 const steps = activeSubTab === 'identification' ? [...(formData.identification_steps_json || [])] : [...(formData.rca_steps_json || [])]
                                 steps.splice(idx, 1)
                                 setFormData({ ...formData, [activeSubTab === 'identification' ? 'identification_steps_json' : 'rca_steps_json']: steps })
                               }} className="p-2 text-slate-600 hover:text-rose-500"><Trash2 size={16}/></button>
                            </div>
                            <div className="grid grid-cols-12 gap-6">
                               <div className="col-span-7">
                                  <textarea 
                                    onPaste={(e) => handlePaste(e, activeSubTab as any, idx)}
                                    value={step.text} 
                                    onChange={e => {
                                      const steps = activeSubTab === 'identification' ? [...(formData.identification_steps_json || [])] : [...(formData.rca_steps_json || [])]
                                      steps[idx].text = e.target.value
                                      setFormData({ ...formData, [activeSubTab === 'identification' ? 'identification_steps_json' : 'rca_steps_json']: steps })
                                    }}
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-[11px] font-bold text-slate-300 outline-none focus:border-purple-500/30 min-h-[120px] leading-relaxed shadow-inner"
                                    placeholder="Describe discovery, evidence captured, or logic applied. PASTE IMAGES HERE."
                                  />
                               </div>
                               <div className="col-span-5 grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto custom-scrollbar">
                                  {step.images?.map((img: string, i: number) => (
                                    <div key={i} className="relative aspect-square bg-slate-950 rounded-xl overflow-hidden border border-white/10 group/img">
                                       <img src={img} className="w-full h-full object-cover" />
                                       <button onClick={() => {
                                         const steps = activeSubTab === 'identification' ? [...(formData.identification_steps_json || [])] : [...(formData.rca_steps_json || [])]
                                         steps[idx].images.splice(i, 1)
                                         setFormData({ ...formData, [activeSubTab === 'identification' ? 'identification_steps_json' : 'rca_steps_json']: steps })
                                       }} className="absolute top-1 right-1 p-1 bg-black/80 rounded text-rose-500 opacity-0 group-hover/img:opacity-100 transition-all"><X size={10}/></button>
                                    </div>
                                  ))}
                                  <div className="flex items-center justify-center border-2 border-dashed border-white/5 rounded-xl text-slate-700">
                                     <Camera size={24} />
                                  </div>
                               </div>
                            </div>
                         </div>
                       ))}
                       <button 
                        onClick={() => {
                          const steps = activeSubTab === 'identification' ? [...(formData.identification_steps_json || [])] : [...(formData.rca_steps_json || [])]
                          setFormData({ ...formData, [activeSubTab === 'identification' ? 'identification_steps_json' : 'rca_steps_json']: [...steps, { text: '', images: [] }] })
                        }}
                        className="w-full py-4 border-2 border-dashed border-white/5 rounded-3xl text-[10px] font-bold uppercase text-slate-500 hover:text-purple-400 hover:border-purple-500/30 transition-all flex items-center justify-center gap-2"
                       >
                          <PlusCircle size={16} /> Add Investigation Node
                       </button>
                    </div>
                 </div>
               )}

               {activeTab === 'causes' && (
                 <div className="space-y-6">
                    <SectionCard icon={Search} title="Root Causes & BKMs" color="text-purple-400">
                       <div className="space-y-4">
                          {(formData.potential_causes_json || []).map((c: any, idx: number) => (
                            <div key={idx} className="bg-slate-950 border border-white/5 rounded-3xl p-6 grid grid-cols-12 gap-6 items-start relative">
                               <div className="col-span-5 space-y-4">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Potential Cause</label>
                                    <textarea value={c.cause} onChange={e => {
                                      const causes = [...formData.potential_causes_json]; causes[idx].cause = e.target.value; setFormData({...formData, potential_causes_json: causes})
                                    }} className="w-full bg-slate-900 border border-white/5 rounded-xl p-3 text-[11px] font-bold text-white outline-none focus:border-purple-500/30 min-h-[80px]" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Indicator / Signature</label>
                                    <textarea value={c.indicator} onChange={e => {
                                      const causes = [...formData.potential_causes_json]; causes[idx].indicator = e.target.value; setFormData({...formData, potential_causes_json: causes})
                                    }} className="w-full bg-slate-900 border border-white/5 rounded-xl p-3 text-[11px] font-mono font-bold text-amber-500 outline-none focus:border-amber-500/30 min-h-[60px]" placeholder="Specific log entry or metric spike..." />
                                  </div>
                               </div>
                               <div className="col-span-5 space-y-4 border-l border-white/5 pl-6">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Resolution BKM (Doc Hook)</label>
                                    <StyledSelect value={c.bkm_id} onChange={e => {
                                      const causes = [...formData.potential_causes_json]; causes[idx].bkm_id = e.target.value; setFormData({...formData, potential_causes_json: causes})
                                    }} options={[]} placeholder="Link Existing BKM..." />
                                    <button className="text-[8px] font-bold uppercase text-blue-400 mt-1 hover:underline tracking-widest">+ Create New BKM from Intel</button>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Status</label>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                       {['Likely', 'Confirmed', 'Disproven', 'Under Review'].map(s => (
                                         <button 
                                            key={s}
                                            onClick={() => {
                                              const causes = [...formData.potential_causes_json]; causes[idx].status = s; setFormData({...formData, potential_causes_json: causes})
                                            }}
                                            className={`px-3 py-1 rounded-lg border text-[8px] font-bold uppercase transition-all ${c.status === s ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-slate-600'}`}
                                         >
                                            {s}
                                         </button>
                                       ))}
                                    </div>
                                  </div>
                               </div>
                               <div className="col-span-2 flex justify-end gap-2">
                                  <button onClick={() => {
                                    const causes = [...formData.potential_causes_json]; causes.splice(idx, 1); setFormData({...formData, potential_causes_json: causes})
                                  }} className="p-2 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20"><Trash2 size={16}/></button>
                               </div>
                            </div>
                          ))}
                          <button 
                            onClick={() => setFormData({...formData, potential_causes_json: [...(formData.potential_causes_json || []), { cause: '', indicator: '', bkm_id: null, status: 'Under Review' }]})}
                            className="w-full py-4 bg-purple-600/10 border-2 border-dashed border-purple-500/20 rounded-3xl text-[10px] font-bold uppercase text-purple-400 hover:bg-purple-600/20 transition-all flex items-center justify-center gap-2"
                          >
                             <PlusCircle size={16} /> Add Cause Matrix Item
                          </button>
                       </div>
                    </SectionCard>
                 </div>
               )}

               {activeTab === 'mitigation' && (
                 <div className="space-y-6">
                    <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-4">
                       <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30 shadow-2xl text-emerald-400"><ShieldCheck size={36} /></div>
                       <h3 className="text-xl font-bold text-white uppercase tracking-tighter ">Reliability Mitigation Strategy</h3>
                       <p className="text-[10px] text-slate-500 uppercase tracking-widest max-w-lg mx-auto leading-relaxed">Select confirmed causes to generate failure analysis hooks for the FAR Matrix and long-term prevention planning.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                       {formData.potential_causes_json?.filter((c:any)=>c.status === 'Confirmed').map((c: any, idx: number) => (
                         <div key={idx} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-6">
                               <div className="p-4 bg-emerald-600/20 rounded-2xl text-emerald-400 border border-emerald-500/30 shadow-lg"><Zap size={24} /></div>
                               <div>
                                  <div className="flex items-center gap-3 mb-1">
                                     <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Confirmed Root Cause</span>
                                     <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Synced to FAR</span>
                                  </div>
                                  <p className="text-sm font-bold text-white uppercase tracking-tight max-w-2xl">{c.cause}</p>
                                  <div className="flex items-center gap-4 mt-2">
                                     <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest"><Search size={12}/> {c.indicator || 'N/A Signature'}</div>
                                     <div className="flex items-center gap-2 text-[9px] font-bold text-blue-400 uppercase tracking-widest hover:underline cursor-pointer"><LinkIcon size={12}/> View BKM</div>
                                  </div>
                               </div>
                            </div>
                            <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase text-slate-400 hover:text-white transition-all flex items-center gap-2">
                               <Activity size={14} /> Update FAR View
                            </button>
                         </div>
                       ))}
                       {(!formData.potential_causes_json || formData.potential_causes_json.filter((c:any)=>c.status === 'Confirmed').length === 0) && (
                         <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-30">
                            <AlertTriangle size={48} className="mx-auto text-slate-500 mb-4" />
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">No Confirmed Causes for Mitigation Planning</p>
                         </div>
                       )}
                    </div>
                 </div>
               )}

               {activeTab === 'evidence' && (
                 <div className="space-y-6">
                    <div className="bg-purple-600/10 border border-purple-500/30 rounded-3xl p-10 text-center space-y-4">
                       <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mx-auto border border-purple-500/30 shadow-2xl text-purple-400"><Clipboard size={32} /></div>
                       <h3 className="text-xl font-bold text-white uppercase tracking-tighter ">Deep Forensic Evidence Vault</h3>
                       <p className="text-[10px] text-slate-500 uppercase tracking-widest max-w-sm mx-auto">Click here and press <kbd className="bg-slate-950 px-2 py-1 rounded border border-white/10 text-slate-300">Ctrl+V</kbd> to capture screenshots, logs, or evidence directly into the RCA Intelligence Hub.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                       {(formData.evidence_json || []).map((ev: any, i: number) => (
                         <div key={i} className="group relative bg-slate-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl aspect-square transition-all hover:scale-[1.02]">
                            {ev.type === 'image' && <img src={ev.content} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-5">
                               <p className="text-[9px] font-bold text-white uppercase tracking-widest mb-3">{new Date(ev.timestamp).toLocaleString()}</p>
                               <div className="flex gap-2">
                                  <button onClick={() => {
                                    const newEv = formData.evidence_json.filter((_:any, idx:number) => idx !== i)
                                    setFormData({...formData, evidence_json: newEv})
                                  }} className="p-2.5 bg-rose-600/20 text-rose-500 rounded-xl border border-rose-500/30 backdrop-blur-md hover:bg-rose-600/40"><Trash2 size={16}/></button>
                                  <button className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 backdrop-blur-md flex-1 flex items-center justify-center gap-2 font-bold text-[9px] uppercase tracking-widest"><Eye size={16} /> Inspect</button>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const RcaTabBtn = ({ active, icon: Icon, label, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all ${active ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/20' : 'text-slate-500 hover:bg-white/5'}`}>
    <Icon size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </button>
)

function ResearchDetails({ item, onClose, onSave, setConfirmModal, fontSize, rowDensity }: any) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({ ...item })
  const [newLog, setNewLog] = useState({ entry_text: '', entry_type: 'Diagnosis', poc: '' })
  const [activeTab, setActiveTab] = useState('timeline')

  const logMutation = useMutation({
    mutationFn: async (log: any) => {
      const res = await apiFetch(`/api/v1/investigations/${item.id}/logs`, {
        method: 'POST',
        body: JSON.stringify(log)
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigations'] })
      setNewLog({ entry_text: '', entry_type: 'Diagnosis', poc: '' })
      toast.success('Activity Recorded')
    }
  })

  const timelineColumnDefs = [
    { field: "timestamp", headerName: "Time", width: 140, cellRenderer: (p: any) => new Date(p.value).toLocaleString() },
    { field: "entry_type", headerName: "Type", width: 100, cellRenderer: (p: any) => (
      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
        p.value === 'Action' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
        p.value === 'Diagnosis' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' :
        'bg-slate-500/20 border-slate-500/30 text-slate-400'
      }`}>{p.value}</span>
    )},
    { field: "entry_text", headerName: "Description", flex: 1 },
    { field: "poc", headerName: "POC", width: 100, cellClass: 'font-bold text-blue-400 uppercase tracking-tighter' }
  ]

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-8">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-7xl h-[90vh] rounded-[32px] border border-blue-500/20 overflow-hidden flex flex-col shadow-2xl shadow-black">
        
        {/* Header - More Compact */}
        <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/30"><Shield size={20} /></div>
            <div>
              <div className="flex items-center space-x-2 mb-0.5">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">{formData.category} // ID: RES_{formData.id}</span>
                <StatusPill value={formData.status} />
              </div>
              <h1 className="text-xl font-bold uppercase  tracking-tighter text-white leading-none">{formData.title}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => onSave(formData)} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-bold uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2"><Save size={12}/> Sync State</button>
            <button onClick={onClose} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={16}/></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Nav */}
          <div className="w-40 border-r border-white/5 bg-black/20 p-4 space-y-1">
            <NavBtn active={activeTab === 'timeline'} icon={Clock} label="Timeline" onClick={() => setActiveTab('timeline')} />
            <NavBtn active={activeTab === 'findings'} icon={Search} label="Findings" onClick={() => setActiveTab('findings')} />
            <NavBtn active={activeTab === 'actions'} icon={ShieldCheck} label="Actions" onClick={() => setActiveTab('actions')} />
            <NavBtn active={activeTab === 'context'} icon={Database} label="Context" onClick={() => setActiveTab('context')} />
            <NavBtn active={activeTab === 'settings'} icon={Sliders} label="Control" onClick={() => setActiveTab('settings')} />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              
              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  {/* Compact Quick Add Pulse */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 grid grid-cols-4 gap-3 items-end">
                    <div className="col-span-2">
                      <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Record Activity / Observation</label>
                      <input 
                        value={newLog.entry_text} 
                        onChange={e => setNewLog({...newLog, entry_text: e.target.value})}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-blue-500 text-white"
                        placeholder="Detailed log entry..."
                      />
                    </div>
                    <StyledSelect 
                      label="Type" 
                      value={newLog.entry_type} 
                      onChange={e => setNewLog({...newLog, entry_type: e.target.value})} 
                      options={[{value:'Diagnosis', label:'Diagnosis'}, {value:'Action', label:'Action'}, {value:'Observation', label:'Observation'}, {value:'Communication', label:'Communication'}, {value:'Milestone', label:'Milestone'}]} 
                    />
                    <div className="flex items-center gap-2">
                       <div className="flex-1">
                          <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">POC</label>
                          <input 
                            value={newLog.poc} 
                            onChange={e => setNewLog({...newLog, poc: e.target.value})}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-blue-500 text-white font-bold"
                            placeholder="Owner"
                          />
                       </div>
                       <button 
                        disabled={!newLog.entry_text || logMutation.isPending}
                        onClick={() => logMutation.mutate(newLog)}
                        className="p-2 bg-emerald-600 text-white rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-50"
                      >
                        <PlusCircle size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden h-[400px] ag-theme-alpine-dark">
                    <AgGridReact 
                      rowData={formData.progress_logs || []} 
                      columnDefs={timelineColumnDefs as any}
                      headerHeight={fontSize + rowDensity + 10}
                      rowHeight={fontSize + rowDensity + 10}
                      enableCellTextSelection={true}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'findings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SectionCard icon={AlertTriangle} title="Impact Description" color="text-rose-400">
                    <textarea value={formData.impact || ''} onChange={e => setFormData({...formData, impact: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] outline-none focus:border-rose-500/30 text-slate-300 min-h-[120px]" placeholder="Detailed impact analysis..." />
                  </SectionCard>
                  <SectionCard icon={Zap} title="Trigger Event" color="text-amber-400">
                    <textarea value={formData.trigger_event || ''} onChange={e => setFormData({...formData, trigger_event: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] outline-none focus:border-amber-500/30 text-slate-300 min-h-[120px]" placeholder="What started this?" />
                  </SectionCard>
                  <SectionCard icon={Search} title="Root Cause Analysis" color="text-blue-400" className="md:col-span-2">
                    <textarea value={formData.root_cause || ''} onChange={e => setFormData({...formData, root_cause: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] outline-none focus:border-blue-500/30 text-slate-300 min-h-[150px]" placeholder="Deep dive analysis of the core issue..." />
                  </SectionCard>
                  <SectionCard icon={CheckCircle2} title="Resolution Steps" color="text-emerald-400" className="md:col-span-2">
                    <textarea value={formData.resolution_steps || ''} onChange={e => setFormData({...formData, resolution_steps: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] outline-none focus:border-emerald-500/30 text-slate-300 min-h-[150px]" placeholder="How was it fixed?" />
                  </SectionCard>
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <SectionCard icon={Shield} title="Mitigation Items" color="text-cyan-400">
                      <ListInput 
                        items={formData.mitigation_items || []} 
                        onChange={items => setFormData({...formData, mitigation_items: items})} 
                        placeholder="Action taken to stabilize..."
                      />
                    </SectionCard>
                    <SectionCard icon={Activity} title="Monitoring Items" color="text-indigo-400">
                      <ListInput 
                        items={formData.monitoring_items || []} 
                        onChange={items => setFormData({...formData, monitoring_items: items})} 
                        placeholder="What to watch for..."
                      />
                    </SectionCard>
                  </div>
                  <SectionCard icon={ShieldCheck} title="Prevention Method / Long-term Strategy" color="text-purple-400">
                    <textarea value={formData.prevention_method || ''} onChange={e => setFormData({...formData, prevention_method: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] outline-none focus:border-purple-500/30 text-slate-300 min-h-[120px]" placeholder="How to prevent recurrence..." />
                  </SectionCard>
                  <SectionCard icon={Lightbulb} title="Lessons Learned" color="text-amber-200">
                    <textarea value={formData.lessons_learned || ''} onChange={e => setFormData({...formData, lessons_learned: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] outline-none focus:border-amber-500/20 text-slate-300 min-h-[100px]" placeholder="Knowledge gained..." />
                  </SectionCard>
                </div>
              )}

              {activeTab === 'context' && (
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest border-l-2 border-blue-500 pl-3">Initial Problem Statement</h3>
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs text-slate-300 ">
                         {formData.problem_statement}
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="max-w-xl space-y-4">
                  <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest border-l-2 border-white/20 pl-3">Research Parameters</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <StyledSelect label="Current Phase" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={[{value:'Analyzing', label:'Analyzing'}, {value:'Escalated', label:'Escalated'}, {value:'Monitoring', label:'Monitoring'}, {value:'Resolved', label:'Resolved'}, {value:'Closed', label:'Closed'}]} />
                    <StyledSelect label="Priority Rating" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} options={[{value:'Urgent', label:'Urgent'}, {value:'High', label:'High'}, {value:'Medium', label:'Medium'}, {value:'Low', label:'Low'}]} />
                  </div>
                  <div className="pt-6 border-t border-white/5">
                    <button onClick={() => setConfirmModal({ isOpen: true, title: 'Archive Research', message: 'Move this investigation to history?', onConfirm: () => { /* archive logic */ } })} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase text-slate-500 hover:text-white transition-all">Archive Record</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function RcaForm({ item, options, devices, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ 
    ...item 
  })

  // Cascading Logic
  const systems = useMemo(() => {
