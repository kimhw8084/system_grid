import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ListTodo, History, ShieldAlert, Globe, 
  Zap, Save, X, PlusCircle, User, MessageSquare,
  MoreVertical, RefreshCcw, TrendingUp, AlertTriangle,
  Lightbulb, ShieldCheck, Calendar, Activity, Database, Server,
  FileText, Clipboard, Terminal, ArrowRight, Shield, Download, Share2,
  Clock, CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye, Camera, Link as LinkIcon, Layers, Settings, Check, Target, ChevronDown, PlusCircle as PlusIcon
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
  <div className="bg-white/5 border border-white/5 p-4 rounded-lg flex items-center justify-between shadow-inner">
    <div>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-2xl font-black text-white tracking-tighter">{value}</p>
    </div>
    <div className={`p-2 rounded-md bg-white/5 ${color}`}><Icon size={18} /></div>
  </div>
)

const SectionCard = ({ icon: Icon, title, color, children, className = "" }: any) => (
  <div className={`bg-white/5 border border-white/5 rounded-lg p-4 space-y-3 ${className}`}>
    <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-1">
      <Icon size={14} className={color} />
      <h3 className="text-[11px] font-black uppercase tracking-widest text-white/70">{title}</h3>
    </div>
    {children}
  </div>
)

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
      urgent: combinedData.filter((i: any) => i.priority === 'Highest' || i.priority === 'High' || i.priority === 10 || i.priority >= 8).length
    }
  }, [combinedData])

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
      width: 90,
      minWidth: 90,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      valueGetter: (p: any) => p.data.type === 'RCA' ? `RCA-${p.data.id}` : `RES-${p.data.id}`
    },
    { 
      field: "involved_systems", 
      headerName: "Involved System", 
      width: 140, 
      filter: true,
      cellClass: "font-bold text-center", 
      headerClass: 'text-center',
      valueGetter: (p: any) => {
        const sys = p.data.type === 'RCA' ? (p.data.target_systems || []) : (p.data.systems || [])
        return sys
      },
      cellRenderer: (p: any) => {
        const sys = p.value || []
        if (sys.length === 0) return <span className="text-slate-600">N/A</span>
        const display = sys.length > 1 ? `${sys[0]} +${sys.length - 1}` : sys[0]
        return (
          <div className="group relative cursor-help w-full h-full flex items-center justify-center">
            <span style={{ fontSize: `${fontSize}px` }}>{display}</span>
            {sys.length > 1 && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-[100]">
                <div className="bg-slate-900 border border-white/10 rounded-lg p-2 shadow-2xl whitespace-nowrap">
                  {sys.map((s: string, i: number) => (
                    <div key={i} className="text-[10px] font-black uppercase text-blue-400">{s}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      },
      hide: hiddenColumns.includes("involved_systems")
    },
    { 
      field: "title", 
      headerName: "Title", 
      minWidth: 200,
      flex: 1.5, 
      filter: true, 
      cellClass: 'text-left font-bold uppercase tracking-tight truncate',
      headerClass: 'text-left',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("title")
    },
    { 
      field: "type", 
      headerName: "Type", 
      width: 90, 
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
      field: "priority", 
      headerName: "Priority", 
      width: 110, 
      filter: true, 
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const val = p.value
        const colors: any = {
           'Highest': 'text-rose-400 border-rose-500/40 bg-rose-500/20',
           'High': 'text-amber-400 border-amber-500/40 bg-amber-500/20',
           'Medium': 'text-blue-400 border-blue-500/40 bg-blue-500/20',
           'Low': 'text-emerald-400 border-emerald-500/40 bg-emerald-500/20'
        }
        let displayVal = val
        if (typeof val === 'number') {
           displayVal = val >= 8 ? 'Highest' : val >= 6 ? 'High' : val >= 4 ? 'Medium' : 'Low'
        }
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className={`flex items-center justify-center w-24 h-5 rounded-md border shadow-sm ${colors[displayVal] || 'text-slate-400 border-white/10 bg-white/5'}`}>
              <span style={{ fontSize: `${fontSize + 1}px` }} className="font-bold uppercase tracking-tighter leading-none">{displayVal || 'N/A'}</span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("priority")
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 110, 
      filter: true, 
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = {
          'Analyzing': 'text-blue-400 border-blue-500/40 bg-blue-500/20',
          'Open': 'text-amber-400 border-amber-500/40 bg-amber-500/20',
          'Investigation': 'text-purple-400 border-purple-500/40 bg-purple-500/20',
          'Resolved': 'text-emerald-400 border-emerald-500/40 bg-emerald-500/20',
          'Closed': 'text-slate-400 border-white/20 bg-white/10',
          'Escalated': 'text-rose-400 border-rose-500/40 bg-rose-500/20',
          'Monitoring': 'text-indigo-400 border-indigo-500/40 bg-indigo-500/20'
        }
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className={`flex items-center justify-center w-24 h-5 rounded-md border shadow-sm ${colors[p.value] || 'text-slate-400 border-white/10 bg-white/5'}`}>
              <span style={{ fontSize: `${fontSize + 1}px` }} className="font-bold uppercase tracking-tighter leading-none">
                {p.value || 'Unknown'}
              </span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("status")
    },
    { 
      field: "initiation", 
      headerName: "Initiation", 
      width: 140, 
      filter: true, 
      cellClass: 'text-center font-bold text-slate-400 uppercase', 
      headerClass: 'text-center',
      valueGetter: (p: any) => p.data.type === 'RCA' ? p.data.occurrence_at : p.data.initiation_at,
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{new Date(p.value).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("initiation")
    },
    { 
      field: "created_at", 
      headerName: "Created", 
      width: 140, 
      filter: true, 
      cellClass: 'text-center font-bold text-slate-500 uppercase', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{new Date(p.value).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span> : <span style={{ fontSize: `${fontSize}px` }}>N/A</span>,
      hide: hiddenColumns.includes("created_at")
    },
    { 
      field: "updated_at", 
      headerName: "Last Pulse", 
      width: 140, 
      filter: true, 
      cellClass: 'text-center font-bold text-slate-300 uppercase', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{new Date(p.value).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span> : <span style={{ fontSize: `${fontSize}px` }}>N/A</span>,
      hide: hiddenColumns.includes("updated_at")
    },
    { 
      field: "owner_display", 
      headerName: "Owner", 
      width: 120, 
      filter: true, 
      cellClass: 'text-center font-black uppercase text-blue-400', 
      headerClass: 'text-center',
      valueGetter: (p: any) => p.data.type === 'RCA' ? p.data.owner : p.data.assigned_team,
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value || 'N/A'}</span>,
      hide: hiddenColumns.includes("owner_display")
    },
    { 
      field: "timeline_count", 
      headerName: "Entity Count", 
      width: 100, 
      cellClass: 'text-center font-bold', 
      headerClass: 'text-center',
      valueGetter: (p: any) => p.data.type === 'RCA' ? (p.data.timeline?.length || 0) : (p.data.progress_logs?.length || 0),
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center h-full">
           <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-slate-400" style={{ fontSize: `${fontSize}px` }}>{p.value}</span>
        </div>
      ),
      hide: hiddenColumns.includes("timeline_count")
    },
    { 
      field: "problem_statement", 
      headerName: "Problem Statement", 
      width: 200, 
      filter: true, 
      cellClass: 'text-left font-bold text-slate-500 italic truncate px-4',
      headerClass: 'text-left',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("problem_statement")
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
              <h1 className="text-2xl font-black uppercase tracking-tight italic flex items-center gap-2 text-white">
                <Shield size={24} className="text-blue-500" /> Research Matrix
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">Unified System Intelligence & RCA Engine</p>
           </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SCAN RESEARCH..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>

          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5 space-x-1">
             <button onClick={() => setShowStyleLab(!showStyleLab)} className={`p-1.5 hover:bg-white/10 ${showStyleLab ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Toggle Style Lab"><Activity size={16} /></button>
             <button onClick={() => setShowColumnPicker(!showColumnPicker)} className={`p-1.5 hover:bg-white/10 ${showColumnPicker ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Column Picker"><Sliders size={16} /></button>
             <button onClick={handleExportCSV} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-emerald-400 rounded-lg transition-all" title="Export CSV"><FileText size={16} /></button>
             <button onClick={handleCopyToClipboard} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Copy to Clipboard"><Clipboard size={16} /></button>
             <button onClick={() => setShowConfig(true)} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Research Config"><Settings size={16} /></button>
          </div>

          <button 
            onClick={() => setActiveModal({ title: '', status: 'Open', priority: 'Low', type: null, problem_statement: '', systems: [], target_systems: [] })} 
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
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
                     <span className="text-[10px] font-black uppercase tracking-widest">Density Laboratory</span>
                  </div>
                  <div className="flex items-center space-x-6">
                     <div className="flex items-center space-x-4">
                        <span className="text-[9px] font-black text-slate-500 uppercase">Font Size</span>
                        <input type="range" min="8" max="14" step="1" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-32 accent-blue-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer" />
                        <span className="text-[10px] text-white w-4 font-black">{fontSize}px</span>
                     </div>
                     <div className="flex items-center space-x-4 border-l border-white/10 pl-6">
                        <span className="text-[9px] font-black text-slate-500 uppercase">Row Density</span>
                        <input type="range" min="4" max="24" step="2" value={rowDensity} onChange={e => setRowDensity(Number(e.target.value))} className="w-32 accent-indigo-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer" />
                        <span className="text-[10px] text-white w-4 font-black">{rowDensity}px</span>
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
        <CompactSummary label="Critical/Highest" value={stats.urgent} icon={AlertTriangle} color="text-rose-500" />
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative border-white/5">
        {(isLoading || rcaLoading) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4 text-blue-400">
             <RefreshCcw size={32} className="animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing Intelligence Matrix...</p>
          </div>
        )}
        <AgGridReact
          ref={gridRef}
          rowData={combinedData}
          columnDefs={columnDefs as any}
          headerHeight={fontSize + rowDensity + 10}
          rowHeight={fontSize + rowDensity + 10}
          quickFilterText={searchTerm}
          animateRows={false}
          enableCellTextSelection={true}
          rowSelection="multiple"
          onSelectionChanged={e => setSelectedIds(e.api.getSelectedNodes().map((n: any) => n.data.id))}
          suppressColumnVirtualisation={true}
        />
        <AnimatePresence>
          {showColumnPicker && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute top-0 right-0 bottom-0 w-64 bg-slate-950/90 backdrop-blur-xl border-l border-white/10 z-[60] flex flex-col shadow-2xl">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center space-x-2"><Sliders size={14} /> <span>Toggle Columns</span></h3>
                <button onClick={() => setShowColumnPicker(false)} className="text-slate-500 hover:text-white"><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                {columnDefs.filter((c: any) => c.field && !c.suppressHide).map((col: any) => (
                  <label key={col.field} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-all">
                    <input type="checkbox" checked={!hiddenColumns.includes(col.field)} onChange={() => setHiddenColumns(hiddenColumns.includes(col.field) ? hiddenColumns.filter(f => f !== col.field) : [...hiddenColumns, col.field])} className="sr-only" />
                    <div className={`w-4 h-4 rounded border transition-all ${!hiddenColumns.includes(col.field) ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'border-white/10 bg-black/40 group-hover:border-white/20'}`}>
                       {!hiddenColumns.includes(col.field) && <Check size={12} className="text-white mx-auto" />}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${!hiddenColumns.includes(col.field) ? 'text-slate-200' : 'text-slate-500'}`}>{col.headerName || col.field}</span>
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
      
      <ConfigRegistryModal 
        isOpen={showConfig} 
        onClose={() => setShowConfig(false)} 
        title="Research Configuration Matrix"
        sections={[
          { title: 'System Hierarchy', category: 'LogicalSystem', icon: Database },
          { title: 'Research Domains', category: 'ResearchCategory', icon: LayoutGrid },
          { title: 'Failure Domains', category: 'FailureCategory', icon: ShieldAlert }
        ]}
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
        .ag-header-cell-label { font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-size: ${fontSize}px !important; justify-content: center !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; font-weight: 700 !important; font-size: ${fontSize}px !important; }
        .ag-row { border-bottom: 1px solid rgba(255,255,255,0.05) !important; }
        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.2) !important; }
      `}</style>
    </div>
  )
}

function UnifiedResearchForm({ item, options, devices, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ ...item })
  const [step, setStep] = useState(item.type ? 1 : 0)
  
  const systems = useMemo(() => Array.from(new Set(devices?.map((d: any) => d.system) || [])).filter(Boolean), [devices])

  const handleFinish = () => {
    if (!formData.title || !formData.type) {
      toast.error("Title and Type are required")
      return
    }
    
    if (formData.type === 'RCA' && (!formData.target_systems || formData.target_systems.length === 0)) {
      toast.error("Target System Context is required for RCA")
      return
    }
    
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-xl p-8 rounded-[40px] border border-blue-500/30 space-y-6">
        {step === 0 ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Initialize Research Flow</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Select the nature of this investigation</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TypeCard 
                icon={ShieldAlert} 
                title="RCA (Root Cause)" 
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
            <button onClick={onClose} className="w-full py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Abort Initialization</button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className={`text-xl font-black uppercase italic flex items-center gap-3 tracking-tighter ${formData.type === 'RCA' ? 'text-purple-400' : 'text-blue-400'}`}>
                {formData.type === 'RCA' ? <ShieldAlert size={20}/> : <Search size={20}/>} 
                Initialize {formData.type}
              </h2>
              <button onClick={() => setStep(0)} className="text-[9px] font-black uppercase text-slate-500 hover:text-white underline tracking-widest">Change Type</button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Intel Title</label>
                <input 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-[12px] outline-none focus:border-blue-500 text-white font-black uppercase" 
                  placeholder={formData.type === 'RCA' ? "E.G. FAB-2 LINE BLOCKAGE..." : "E.G. CLUSTER LATENCY OPTIMIZATION..."} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <SearchableMultiSelect 
                    label="Target System Context"
                    selected={formData.type === 'RCA' ? (formData.target_systems || []) : (formData.systems || [])}
                    onChange={(next: string[]) => setFormData({...formData, [formData.type === 'RCA' ? 'target_systems' : 'systems']: next})}
                    options={systems}
                    placeholder="Identify core systems..."
                 />
                 <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase block tracking-widest px-1 mb-1">{formData.type === 'RCA' ? 'Incident Date/Time' : 'Initiation Date/Time'}</label>
                    <input 
                      type="datetime-local" 
                      value={formData.type === 'RCA' ? (formData.occurrence_at?.slice(0, 16) || '') : (formData.initiation_at?.slice(0, 16) || '')} 
                      onChange={e => setFormData({...formData, [formData.type === 'RCA' ? 'occurrence_at' : 'initiation_at']: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-[11px] outline-none focus:border-blue-500 text-slate-300 font-bold [color-scheme:dark]" 
                    />
                 </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Low', 'Medium', 'High', 'Highest'].map(p => (
                    <button 
                      key={p}
                      type="button"
                      onClick={() => setFormData({...formData, priority: p})}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border ${formData.priority === p ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 border-white/10 text-slate-500 hover:border-white/20'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Problem Statement / Narrative Goal</label>
                <textarea 
                  value={formData.problem_statement} 
                  onChange={e => setFormData({...formData, problem_statement: e.target.value})} 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-[11px] outline-none focus:border-blue-500 text-slate-300 min-h-[100px] leading-relaxed font-bold" 
                  placeholder="Describe the context or the problem in detail for easy recall..." 
                />
              </div>
            </div>

            <div className="flex space-x-4 pt-2">
              <button onClick={onClose} className="flex-1 py-3.5 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Cancel</button>
              <button onClick={handleFinish} className={`flex-[2] py-3.5 ${formData.type === 'RCA' ? 'bg-purple-600 shadow-purple-500/20' : 'bg-blue-600 shadow-blue-500/20'} text-white rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 tracking-[0.2em]`}>
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
    <button onClick={onClick} className={`p-6 rounded-3xl border-2 transition-all text-left flex flex-col gap-4 group ${active ? color + ' bg-white/5 shadow-xl' : 'border-white/5 bg-transparent hover:border-white/10 hover:bg-white/5'}`}>
      <div className={`p-3 rounded-2xl bg-white/5 w-fit ${active ? color : 'text-slate-500'}`}><Icon size={24} /></div>
      <div>
        <h3 className={`text-sm font-black uppercase italic tracking-tighter mb-1 ${active ? color : 'text-slate-300'}`}>{title}</h3>
        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{desc}</p>
      </div>
    </button>
  )
}

function EnhancedRcaDetails({ item, devices, options, failureModes, onClose, onSave, fontSize, rowDensity }: any) {
  const [formData, setFormData] = useState({ ...item })
  const [isEditing, setIsEditing] = useState(false)
  const [isTopologyOpen, setIsTopologyOpen] = useState(false)
  const [newTimeline, setNewTimeline] = useState({ event_type: 'Observation', description: '', event_time: new Date().toISOString(), owner: '', owner_team: '' })

  const systemsList = useMemo(() => Array.from(new Set(devices?.map((d: any) => d.system) || [])), [devices])
  const filteredAssets = useMemo(() => {
    const activeSystems = formData.target_systems || []
    return devices?.filter((d: any) => activeSystems.includes(d.system)) || []
  }, [devices, formData.target_systems])
  
  const filteredServices = useMemo(() => {
    const assetIds = formData.impacted_asset_ids || []
    return devices?.filter((d: any) => assetIds.includes(d.id)).flatMap((d: any) => d.logical_services || []) || []
  }, [devices, formData.impacted_asset_ids])

  const handleSave = () => {
    onSave(formData)
    setIsEditing(false)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (event: any) => {
            const base64 = event.target.result
            setFormData((prev: any) => ({ ...prev, evidence_json: [...(prev.evidence_json || []), { type: 'image', content: base64, timestamp: new Date().toISOString() }] }))
            toast.success('Evidence Synchronized')
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }

  const getPriorityInfo = (p: any) => {
    const val = typeof p === 'string' ? p : (p >= 8 ? 'Highest' : p >= 6 ? 'High' : p >= 4 ? 'Medium' : 'Low')
    const colors: any = {
      'Highest': 'text-rose-400 border-rose-500/40 bg-rose-500/20',
      'High': 'text-amber-400 border-amber-500/40 bg-amber-500/20',
      'Medium': 'text-blue-400 border-blue-500/40 bg-blue-500/20',
      'Low': 'text-emerald-400 border-emerald-500/40 bg-emerald-500/20'
    }
    const hints: any = {
      'Highest': 'Global outage / FAB Halt',
      'High': 'Critical degradation',
      'Medium': 'Partial impact',
      'Low': 'Minor glitch'
    }
    return { label: val, color: colors[val] || 'text-slate-400 border-white/10 bg-white/5', hint: hints[val] }
  }

  const pInfo = getPriorityInfo(formData.priority)

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4" onPaste={handlePaste}>
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-[1700px] h-full rounded-lg border border-purple-500/20 overflow-hidden flex flex-col shadow-[0_0_100px_rgba(168,85,247,0.1)]">
        
        {/* Header Block */}
        <div className="px-8 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="p-3 bg-purple-600/20 rounded-lg text-purple-400 border border-purple-500/30 shadow-inner"><ShieldAlert size={28} /></div>
            <div>
              <div className="flex items-center space-x-4 mb-1.5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">RCA // INTEL NODE</span>
                
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-32">
                      <StyledSelect 
                        value={formData.status} 
                        onChange={(e: any) => setFormData({...formData, status: e.target.value})} 
                        options={['Analyzing', 'Open', 'Investigation', 'Resolved', 'Closed', 'Escalated'].map(s => ({value: s, label: s}))} 
                      />
                    </div>
                    <div className="w-32">
                      <StyledSelect 
                        value={formData.priority} 
                        onChange={(e: any) => setFormData({...formData, priority: e.target.value})} 
                        options={['Low', 'Medium', 'High', 'Highest'].map(s => ({value: s, label: s}))} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded border text-[10px] font-black uppercase ${pInfo.color}`}>{formData.status}</div>
                    <div className={`px-3 py-1 rounded border text-[10px] font-black uppercase ${pInfo.color}`}>PRIORITY: {pInfo.label}</div>
                    <span className="text-[9px] font-bold text-slate-600 italic tracking-tight">{pInfo.hint}</span>
                  </div>
                )}
              </div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">{formData.title}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isEditing ? 'bg-amber-600 text-white shadow-amber-500/20' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'}`}
            >
              {isEditing ? <Check size={14}/> : <Edit2 size={14}/>} {isEditing ? 'Lock' : 'Edit'}
            </button>
            <button onClick={handleSave} className="px-6 py-2.5 bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center gap-2"><Save size={14}/> Sync Intelligence</button>
            <button onClick={onClose} className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={24}/></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Swapped V3: Analytical Pane (Left) */}
          <div className="w-[480px] border-r border-white/5 bg-black/20 overflow-y-auto custom-scrollbar p-6 space-y-4">
             <SectionCard icon={FileText} title="Problem Statement" color="text-slate-400">
                <textarea 
                  readOnly={!isEditing}
                  value={formData.problem_statement} 
                  onChange={e => setFormData({...formData, problem_statement: e.target.value})} 
                  className={`w-full bg-slate-950 border border-white/5 rounded-lg p-4 text-base font-bold text-slate-300 outline-none min-h-[120px] resize-none ${!isEditing && 'cursor-default opacity-80'}`} 
                />
             </SectionCard>

             <SectionCard icon={ShieldAlert} title="Operational Impact" color="text-rose-400">
                <div className="space-y-4">
                   <div className="bg-slate-950 border border-white/5 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Severity / Priority</p>
                        <span className={`text-xs font-black uppercase ${pInfo.color}`}>{pInfo.label}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 italic">{pInfo.hint}</span>
                   </div>
                   <textarea 
                     readOnly={!isEditing}
                     value={formData.fab_impact_json?.explanation} 
                     onChange={e => setFormData({...formData, fab_impact_json: { ...formData.fab_impact_json, explanation: e.target.value }})} 
                     className="w-full bg-slate-950 border border-white/5 rounded-lg p-4 text-[11px] font-bold text-slate-300 outline-none min-h-[100px] resize-none" 
                     placeholder="Elaborate on the operational impact..." 
                   />
                </div>
             </SectionCard>

             <div className="bg-white/5 border border-white/5 rounded-lg overflow-hidden transition-all">
                <button 
                   onClick={() => setIsTopologyOpen(!isTopologyOpen)}
                   className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-all border-b border-white/5"
                >
                   <div className="flex items-center gap-2">
                      <Database size={14} className="text-amber-400" />
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-white/70">System Topology Context</h3>
                   </div>
                   <ChevronDown size={14} className={`text-slate-500 transition-transform ${isTopologyOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                   {isTopologyOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-black/20 p-4 space-y-4">
                         <div className={!isEditing ? 'pointer-events-none opacity-80' : ''}>
                           <SearchableMultiSelect 
                              label="Target System(s)" 
                              selected={formData.target_systems || []} 
                              onChange={(next: string[]) => setFormData({...formData, target_systems: next, impacted_asset_ids: [], impacted_service_ids: []})} 
                              options={systemsList} 
                              placeholder="Bind systems..." 
                           />
                         </div>
                         <div className="grid grid-cols-2 gap-3 h-48 overflow-y-auto custom-scrollbar">
                            <div className="space-y-1">
                               {filteredAssets.map((a: any) => (
                                 <label key={a.id} className={`flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-all text-[10px] font-black uppercase ${formData.impacted_asset_ids?.includes(a.id) ? 'text-amber-400' : 'text-slate-500'}`}>
                                    <input type="checkbox" disabled={!isEditing} checked={formData.impacted_asset_ids?.includes(a.id)} onChange={e => {
                                      const ids = formData.impacted_asset_ids || []
                                      setFormData({...formData, impacted_asset_ids: e.target.checked ? [...ids, a.id] : ids.filter((i:any)=>i!==a.id)})
                                    }} className="sr-only" />
                                    <div className={`w-2 h-2 rounded-full border ${formData.impacted_asset_ids?.includes(a.id) ? 'bg-amber-500 border-amber-500' : 'border-white/20'}`} />
                                    <span className="truncate">{a.name}</span>
                                 </label>
                               ))}
                            </div>
                            <div className="space-y-1 border-l border-white/5 pl-2">
                               {filteredServices.map((s: any) => (
                                 <label key={s.id} className={`flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-all text-[10px] font-black uppercase ${formData.impacted_service_ids?.includes(s.id) ? 'text-indigo-400' : 'text-slate-500'}`}>
                                    <input type="checkbox" disabled={!isEditing} checked={formData.impacted_service_ids?.includes(s.id)} onChange={e => {
                                      const ids = formData.impacted_service_ids || []
                                      setFormData({...formData, impacted_service_ids: e.target.checked ? [...ids, s.id] : ids.filter((i:any)=>i!==s.id)})
                                    }} className="sr-only" />
                                    <div className={`w-2 h-2 rounded-full border ${formData.impacted_service_ids?.includes(s.id) ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`} />
                                    <span className="truncate">{s.name}</span>
                                 </label>
                               ))}
                            </div>
                         </div>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>

             <SectionCard icon={LinkIcon} title="FAR Mapping" color="text-purple-400">
                <div className="flex flex-col gap-2">
                   <button 
                      disabled={!isEditing}
                      onClick={() => toast.success('FAR Registry Connector Active')}
                      className="w-full py-2.5 bg-purple-600/20 border border-purple-500/30 rounded-lg text-[10px] font-black uppercase text-purple-400 hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-2"
                   >
                      <PlusCircle size={14}/> Link Failure Modes from FAR
                   </button>
                   <div className="space-y-1 mt-2 max-h-32 overflow-y-auto custom-scrollbar">
                      {(formData.linked_failure_modes || []).map((fm: any) => (
                         <div key={fm.id} className="bg-slate-950 p-2 rounded border border-white/5 flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-slate-300 truncate">{fm.title}</span>
                            <button disabled={!isEditing} onClick={() => setFormData({...formData, linked_failure_modes: formData.linked_failure_modes.filter((m:any)=>m.id!==fm.id)})} className="text-rose-500 hover:text-rose-300"><Trash2 size={12}/></button>
                         </div>
                      ))}
                   </div>
                </div>
             </SectionCard>

             <SectionCard icon={Camera} title="Evidence" color="text-blue-400">
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                   {(formData.evidence_json || []).map((ev: any, i: number) => (
                      <div key={i} className="relative aspect-square bg-slate-950 border border-white/10 rounded-lg overflow-hidden group shadow-xl">
                         <img src={ev.content} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <button disabled={!isEditing} onClick={() => setFormData({...formData, evidence_json: formData.evidence_json.filter((_:any,idx:number)=>idx!==i)})} className="p-1.5 bg-rose-600 text-white rounded"><Trash2 size={12}/></button>
                         </div>
                      </div>
                   ))}
                   <div className="aspect-square bg-white/5 border border-dashed border-white/10 rounded-lg flex items-center justify-center text-slate-600">
                      <Plus size={20} />
                   </div>
                </div>
             </SectionCard>
          </div>

          {/* Swapped V3: Timeline Pane (Right) */}
          <div className="flex-1 flex flex-col bg-[#020617]/30 overflow-hidden">
             <div className="p-6 border-b border-white/5 bg-white/5">
                <div className="grid grid-cols-12 gap-3 items-end">
                   <div className="col-span-12 lg:col-span-5">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Event Narrative</label>
                      <input value={newTimeline.description} onChange={e => setNewTimeline({...newTimeline, description: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-[12px] font-black text-white outline-none focus:border-purple-500/50 uppercase" placeholder="E.G. ALERT FIRED..." />
                   </div>
                   <div className="col-span-12 lg:col-span-3">
                     <StyledSelect label="Type" value={newTimeline.event_type} onChange={e => setNewTimeline({...newTimeline, event_type: e.target.value})} options={[{value:'Detection', label:'Detection'}, {value:'Observation', label:'Observation'}, {value:'Mitigation', label:'Mitigation'}, {value:'Resolution', label:'Resolution'}]} />
                   </div>
                   <div className="col-span-12 lg:col-span-3">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Event Time</label>
                      <input type="datetime-local" value={newTimeline.event_time.slice(0, 16)} onChange={e => setNewTimeline({...newTimeline, event_time: new Date(e.target.value).toISOString()})} className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-[11px] font-black text-slate-400 outline-none [color-scheme:dark]" />
                   </div>
                   <button onClick={() => {
                      const timeline = [...(formData.timeline || []), { ...newTimeline, id: Date.now() }]
                      setFormData({ ...formData, timeline })
                      setNewTimeline({ event_type: 'Observation', description: '', event_time: new Date().toISOString(), owner: '', owner_team: '' })
                    }} className="col-span-1 p-2.5 bg-purple-600 text-white rounded-lg shadow-xl active:scale-95 transition-all"><Plus size={24} /></button>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="relative pl-12 space-y-4 max-w-full">
                   <div className="absolute left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-600/50 via-blue-600/50 to-emerald-600/50 rounded-full" />
                   
                   {(formData.timeline || []).sort((a:any, b:any) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime()).map((e: any) => {
                     const typeColors: any = {
                        'Detection': 'bg-rose-500 shadow-rose-500/50',
                        'Observation': 'bg-blue-500 shadow-blue-500/50',
                        'Mitigation': 'bg-amber-500 shadow-amber-500/50',
                        'Resolution': 'bg-emerald-500 shadow-emerald-500/50'
                     }
                     return (
                       <div key={e.id} className="relative bg-white/5 border border-white/10 rounded-lg p-6 shadow-2xl group hover:bg-white/[0.08] transition-all w-full">
                          <div className={`absolute -left-[30px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-slate-900 shadow-lg z-10 transition-transform group-hover:scale-125 ${typeColors[e.event_type] || 'bg-slate-500'}`} />
                          
                          <div className="flex items-center justify-between gap-4">
                             <div className="flex items-center gap-6">
                                <div className="w-32 shrink-0">
                                   <p className="text-[11px] font-black text-white">{new Date(e.event_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                   <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${e.event_type === 'Detection' ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' : e.event_type === 'Resolution' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-blue-400 border-blue-500/30 bg-blue-500/10'}`}>{e.event_type}</span>
                                </div>
                                <div>
                                   <p className="text-base font-black text-white uppercase tracking-tight leading-none">{e.description}</p>
                                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 italic">{e.owner} {e.owner_team ? `// ${e.owner_team}` : ''}</p>
                                </div>
                             </div>
                             <button onClick={() => setFormData({...formData, timeline: formData.timeline.filter((t:any)=>t.id!==e.id)})} className="opacity-0 group-hover:opacity-100 p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                          </div>
                       </div>
                     )
                   })}
                </div>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function ResearchDetails({ item, onClose, onSave, setConfirmModal, fontSize, rowDensity }: any) {
  const [formData, setFormData] = useState({ ...item })
  const [isEditing, setIsEditing] = useState(false)
  const [newLog, setNewLog] = useState({ entry_text: '', entry_type: 'Diagnosis', poc: '', timestamp: new Date().toISOString() })

  const logMutation = useMutation({
    mutationFn: async (log: any) => {
      const res = await apiFetch(`/api/v1/investigations/${item.id}/logs`, {
        method: 'POST',
        body: JSON.stringify(log)
      })
      return res.json()
    },
    onSuccess: (data) => {
      setFormData(prev => ({ ...prev, progress_logs: [...(prev.progress_logs || []), data] }))
      setNewLog({ entry_text: '', entry_type: 'Diagnosis', poc: '', timestamp: new Date().toISOString() })
      toast.success('Pulse Captured')
    }
  })

  const handleSave = () => {
    onSave(formData)
    setIsEditing(false)
  }

  const sortedLogs = useMemo(() => {
     return [...(formData.progress_logs || [])].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [formData.progress_logs])

  const getPriorityInfo = (p: any) => {
    const val = typeof p === 'string' ? p : (p >= 8 ? 'Highest' : p >= 6 ? 'High' : p >= 4 ? 'Medium' : 'Low')
    const colors: any = {
      'Highest': 'text-rose-400 border-rose-500/40 bg-rose-500/20',
      'High': 'text-amber-400 border-amber-500/40 bg-amber-500/20',
      'Medium': 'text-blue-400 border-blue-500/40 bg-blue-500/20',
      'Low': 'text-emerald-400 border-emerald-500/40 bg-emerald-500/20'
    }
    const hints: any = {
      'Highest': 'Critical Roadmap Probe',
      'High': 'Strategic Investigation',
      'Medium': 'Optimization Study',
      'Low': 'Intel Gathering'
    }
    return { label: val, color: colors[val] || 'text-slate-400 border-white/10 bg-white/5', hint: hints[val] }
  }

  const pInfo = getPriorityInfo(formData.priority)

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-[1600px] h-full rounded-lg border border-blue-500/20 overflow-hidden flex flex-col shadow-[0_0_100px_rgba(37,99,235,0.1)]">
        
        {/* Header Block */}
        <div className="px-8 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="p-3 bg-blue-600/20 rounded-lg text-blue-400 border border-blue-500/30 shadow-inner"><Search size={28} /></div>
            <div>
              <div className="flex items-center space-x-4 mb-1.5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">RESEARCH // INTEL NODE: {formData.id}</span>
                
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-32">
                      <StyledSelect 
                        value={formData.status} 
                        onChange={(e: any) => setFormData({...formData, status: e.target.value})} 
                        options={['Analyzing', 'Open', 'Investigation', 'Resolved', 'Closed', 'Escalated'].map(s => ({value: s, label: s}))} 
                      />
                    </div>
                    <div className="w-32">
                      <StyledSelect 
                        value={formData.priority} 
                        onChange={(e: any) => setFormData({...formData, priority: e.target.value})} 
                        options={['Low', 'Medium', 'High', 'Highest'].map(s => ({value: s, label: s}))} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded border text-[10px] font-black uppercase ${pInfo.color}`}>{formData.status}</div>
                    <div className={`px-3 py-1 rounded border text-[10px] font-black uppercase ${pInfo.color}`}>PRIORITY: {pInfo.label}</div>
                    <span className="text-[9px] font-bold text-slate-600 italic tracking-tight">{pInfo.hint}</span>
                  </div>
                )}
              </div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">{formData.title}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isEditing ? 'bg-amber-600 text-white shadow-amber-500/20' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'}`}
            >
              {isEditing ? <Check size={14}/> : <Edit2 size={14}/>} {isEditing ? 'Lock' : 'Edit'}
            </button>
            <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"><Save size={14}/> Sync Intelligence</button>
            <button onClick={onClose} className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={24}/></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden p-6 gap-6">
           {/* Analytical Fields (Left) */}
           <div className="w-[480px] flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
              <SectionCard icon={FileText} title="Context" color="text-blue-400">
                 <textarea 
                   readOnly={!isEditing}
                   value={formData.problem_statement} 
                   onChange={e => setFormData({...formData, problem_statement: e.target.value})} 
                   className={`w-full bg-slate-950 border border-white/5 rounded-lg p-4 text-base font-bold text-slate-300 outline-none min-h-[140px] resize-none ${!isEditing && 'cursor-default opacity-80'}`} 
                 />
              </SectionCard>
              <SectionCard icon={Zap} title="Triggers" color="text-amber-400">
                 <textarea 
                   readOnly={!isEditing}
                   value={formData.trigger_event} 
                   onChange={e => setFormData({...formData, trigger_event: e.target.value})} 
                   className={`w-full bg-slate-950 border border-white/5 rounded-lg p-4 text-[11px] font-bold text-slate-300 outline-none min-h-[80px] resize-none ${!isEditing && 'cursor-default opacity-80'}`} 
                 />
              </SectionCard>
              <SectionCard icon={Search} title="Core Findings" color="text-indigo-400">
                 <textarea 
                   readOnly={!isEditing}
                   value={formData.root_cause} 
                   onChange={e => setFormData({...formData, root_cause: e.target.value})} 
                   className={`w-full bg-slate-950 border border-white/5 rounded-lg p-4 text-base font-bold text-slate-300 outline-none min-h-[180px] resize-none ${!isEditing && 'cursor-default opacity-80'}`} 
                 />
              </SectionCard>
              <SectionCard icon={ShieldCheck} title="Proposed Strategy" color="text-emerald-400">
                 <textarea 
                   readOnly={!isEditing}
                   value={formData.resolution_steps} 
                   onChange={e => setFormData({...formData, resolution_steps: e.target.value})} 
                   className={`w-full bg-slate-950 border border-white/5 rounded-lg p-4 text-base font-black text-emerald-400/80 outline-none min-h-[180px] resize-none ${!isEditing && 'cursor-default opacity-80'}`} 
                 />
              </SectionCard>
           </div>

           {/* Forensic Timeline (Right) */}
           <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              <IntelligenceInput newLog={newLog} setNewLog={setNewLog} logMutation={logMutation} />
              <IntelligenceStream logs={sortedLogs} />
           </div>
        </div>
      </motion.div>
    </div>
  )
}

function IntelligenceInput({ newLog, setNewLog, logMutation, compact = false }: any) {
  return (
    <div className={`bg-white/5 border border-white/10 ${compact ? 'rounded-lg p-4' : 'rounded-lg p-6'} flex items-end gap-4 shrink-0 shadow-2xl`}>
      <div className="flex-1 space-y-2">
         <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block px-1">Live Intelligence Pulse</label>
         <input value={newLog.entry_text} onChange={e => setNewLog({...newLog, entry_text: e.target.value})} className={`w-full bg-slate-950 border border-white/10 rounded-lg ${compact ? 'px-4 py-2 text-[11px]' : 'px-5 py-3 text-[12px]'} font-black text-white outline-none focus:border-blue-500 uppercase`} placeholder="Record observation pulse..." />
      </div>
      <div className={compact ? 'w-32' : 'w-48'}>
         <StyledSelect label="Type" value={newLog.entry_type} onChange={e => setNewLog({...newLog, entry_type: e.target.value})} options={[{value:'Diagnosis', label:'Diagnosis'}, {value:'Action', label:'Action'}, {value:'Observation', label:'Observation'}, {value:'Milestone', label:'Milestone'}]} />
      </div>
      <div className={compact ? 'w-24' : 'w-40'}>
         <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">POC</label>
         <input value={newLog.poc} onChange={e => setNewLog({...newLog, poc: e.target.value})} className={`w-full bg-slate-950 border border-white/10 rounded-lg ${compact ? 'px-2 py-2 text-[10px]' : 'px-4 py-2.5 text-[11px]'} font-black text-white outline-none focus:border-blue-500 uppercase`} placeholder="NAME..." />
      </div>
      <div className={compact ? 'w-40' : 'w-56'}>
         <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Pulse Time</label>
         <input type="datetime-local" value={newLog.timestamp?.slice(0, 16)} onChange={e => setNewLog({...newLog, timestamp: new Date(e.target.value).toISOString()})} className={`w-full bg-slate-950 border border-white/10 rounded-lg ${compact ? 'px-2 py-2 text-[10px]' : 'px-4 py-2.5 text-[11px]'} font-black text-slate-400 outline-none [color-scheme:dark]`} />
      </div>
      <button disabled={!newLog.entry_text || logMutation.isPending} onClick={() => logMutation.mutate(newLog)} className={`${compact ? 'p-3' : 'p-4'} bg-blue-600 text-white rounded-lg shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center`}><Plus size={compact ? 18 : 24} /></button>
    </div>
  )
}

function IntelligenceStream({ logs, compact = false }: any) {
  return (
    <div className={`flex-1 bg-slate-950/50 border border-white/5 rounded-lg overflow-hidden flex flex-col shadow-2xl`}>
      <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progressive Intelligence Stream</p>
         <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 uppercase">{logs.length} Pulse Captured</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
         <div className="relative pl-12 space-y-6">
            <div className="absolute left-6 top-2 bottom-2 w-1 bg-blue-500/20 rounded-full" />
            
            {logs.map((l: any, i: number) => (
              <div key={i} className={`relative bg-white/5 border border-white/10 ${compact ? 'rounded-lg p-3' : 'rounded-lg p-5'} group hover:bg-white/[0.08] transition-all shadow-lg w-full`}>
                 <div className="absolute -left-[30px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-900 border-2 border-blue-500 shadow-[0_0_8px_rgba(59,130,241,0.5)] z-10 transition-transform group-hover:scale-125" />
                 
                 <div className={`flex ${compact ? 'gap-4' : 'gap-8'}`}>
                    <div className={`${compact ? 'w-24' : 'w-32'} shrink-0 pt-0.5`}>
                       <p className="text-[11px] font-black text-white leading-none mb-1.5">{new Date(l.timestamp).toLocaleString([], {hour: '2-digit', minute:'2-digit'})}</p>
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">{new Date(l.timestamp).toLocaleDateString()}</p>
                       <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-inner">{l.entry_type}</span>
                    </div>
                    <div className="flex-1">
                       <p className={`${compact ? 'text-[11px]' : 'text-base'} font-black text-slate-200 leading-relaxed uppercase tracking-tight`}>{l.entry_text}</p>
                       <div className="flex items-center gap-2 mt-2">
                          <User size={10} className="text-slate-600" />
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{l.poc || 'SYSTEM'}</span>
                       </div>
                    </div>
                 </div>
              </div>
            ))}
            {logs.length === 0 && (
               <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-lg flex flex-col items-center gap-4 opacity-30">
                  <Activity size={40} className="text-slate-500" />
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Intelligence Stream Awaiting Initial Pulse</p>
               </div>
            )}
         </div>
      </div>
    </div>
  )
}
