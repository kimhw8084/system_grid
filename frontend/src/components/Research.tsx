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

const getPriorityInfo = (p: any) => {
  const val = typeof p === 'string' ? p.toUpperCase() : (p >= 8 ? 'HIGHEST' : p >= 6 ? 'HIGH' : p >= 4 ? 'MEDIUM' : 'LOW')
  const colors: any = {
    'HIGHEST': 'text-rose-400 border-rose-500/40 bg-rose-500/20',
    'HIGH': 'text-amber-400 border-amber-500/40 bg-amber-500/20',
    'MEDIUM': 'text-blue-400 border-blue-500/40 bg-blue-500/20',
    'LOW': 'text-emerald-400 border-emerald-500/40 bg-emerald-500/20'
  }
  return { label: val, color: colors[val] || 'text-slate-400 border-white/10 bg-white/5' }
}

const safeUpper = (val: any) => (val?.toString() || '').toUpperCase()

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

const ImageThumbnail = ({ src }: { src: string }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  return (
    <div className="relative inline-block mr-2 mb-2">
      <img 
        src={src} 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`${isExpanded ? 'fixed inset-0 z-[200] m-auto max-w-[90vw] max-h-[90vh] shadow-2xl rounded-lg cursor-zoom-out border-2 border-purple-500/50' : 'h-24 w-auto rounded border border-white/10 hover:border-purple-500/50 cursor-zoom-in transition-all object-cover hover:scale-105'}`} 
      />
      {isExpanded && <div className="fixed inset-0 bg-black/90 z-[190] backdrop-blur-md" onClick={() => setIsExpanded(false)} />}
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
      headerName: "Last Updated", 
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
          { title: 'Failure Domains', category: 'FailureCategory', icon: ShieldAlert },
          { title: 'Incident Types', category: 'IncidentType', icon: AlertTriangle },
          { title: 'Detection Types', category: 'DetectionType', icon: Search },
          { title: 'Impact Types', category: 'ImpactType', icon: ShieldAlert },
          { title: 'Event Types', category: 'EventType', icon: Activity }
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

function SearchableMultiSelect({ label, selected = [], onChange, options = [], placeholder, allowCustom = true }: any) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = useMemo(() => {
    const term = search.toLowerCase().trim()
    let filtered = options.filter((opt: any) => 
      (typeof opt === 'string' ? opt : opt.label).toLowerCase().includes(term)
    )
    
    if (allowCustom && term && !filtered.some((opt:any) => (typeof opt === 'string' ? opt : opt.label).toLowerCase() === term)) {
        filtered = [{ value: term, label: `Add "${term}"...`, isNew: true }, ...filtered]
    }
    return filtered
  }, [options, search, allowCustom])

  const toggleOption = (opt: any) => {
    const val = typeof opt === 'string' ? opt : opt.value
    const next = selected.includes(val)
      ? selected.filter((s: string) => s !== val)
      : [...selected, val]
    onChange(next)
    if (typeof opt !== 'string' && opt.isNew) setSearch('')
  }

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      {label && <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block px-1">{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-300 cursor-pointer flex items-center justify-between hover:border-white/20 transition-all min-h-[40px] relative z-10"
      >
        <div className="flex flex-wrap gap-1">
          {selected.length > 0 ? (
            selected.map((s: string) => (
              <span key={s} className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border border-blue-500/30">
                {s}
              </span>
            ))
          ) : (
            <span className="text-slate-500 italic uppercase">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[1000] w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-3xl"
            style={{ top: '100%' }}
          >
            <div className="p-2 border-b border-white/5 bg-white/5">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter or add new..."
                  className="w-full bg-black/40 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-[10px] font-bold text-white outline-none focus:border-blue-500/50 uppercase"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt: any) => {
                  const val = typeof opt === 'string' ? opt : opt.value
                  const lbl = typeof opt === 'string' ? opt : opt.label
                  const isSelected = selected.includes(val)
                  const isNew = typeof opt !== 'string' && opt.isNew
                  return (
                    <div 
                      key={val}
                      onClick={() => toggleOption(opt)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all group ${isSelected ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-white/5 text-slate-400'}`}
                    >
                      <span className={`text-[10px] font-black uppercase tracking-tight ${isNew ? 'text-blue-400 italic' : ''}`}>{lbl}</span>
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-500' : 'border-white/10 bg-black/40'}`}>
                        {isSelected && <Check size={10} className="text-white" />}
                        {isNew && !isSelected && <Plus size={10} className="text-blue-400" />}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-8 text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest">No results found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
    
    const finalData = {
      ...formData,
      type: safeUpper(formData.type),
      priority: safeUpper(formData.priority),
      status: safeUpper(formData.status)
    }
    onSave(finalData)
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
                active={formData.type === 'RESEARCH'}
                color="border-blue-500/50 text-blue-400"
                onClick={() => { setFormData({...formData, type: 'RESEARCH'}); setStep(1); }}
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
                  onChange={e => setFormData({...formData, title: e.target.value.toUpperCase()})} 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-[12px] outline-none focus:border-blue-500 text-white font-black uppercase" 
                  placeholder={formData.type === 'RCA' ? "E.G. FAB-2 LINE BLOCKAGE..." : "E.G. CLUSTER LATENCY OPTIMIZATION..."} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4 overflow-visible">
                 <SearchableMultiSelect 
                    label="Target System Context"
                    selected={formData.type === 'RCA' ? (formData.target_systems || []) : (formData.systems || [])}
                    onChange={(next: string[]) => setFormData({...formData, [formData.type === 'RCA' ? 'target_systems' : 'systems']: next})}
                    options={systems}
                    placeholder="Identify core systems..."
                    allowCustom={false}
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
                  {['LOW', 'MEDIUM', 'HIGH', 'HIGHEST'].map(p => (
                    <button 
                      key={p}
                      type="button"
                      onClick={() => setFormData({...formData, priority: p})}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border ${safeUpper(formData.priority) === p ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 border-white/10 text-slate-500 hover:border-white/20'}`}
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
  const [activeTab, setActiveTab] = useState('Timeline')
  const [isFailureModesOpen, setIsFailureModesOpen] = useState(true)
  const [isSystemContextOpen, setIsSystemContextOpen] = useState(false)
  const [focusedField, setFocusedField] = useState<'evidence' | 'timeline' | null>(null)
  const [editingTimelineId, setEditingTimelineId] = useState<number | null>(null)
  const [editTimelineData, setEditTimelineData] = useState<any>(null)
  const [newTimeline, setNewTimeline] = useState({ event_type: 'OBSERVATION', description: '', event_time: new Date().toISOString(), owner: '', owner_team: '', images: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  const [newMitigation, setNewMitigation] = useState({ type: 'WORKAROUND', action_description: '', status: 'PLANNED' })

  // Navigation Safety
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing) {
        e.preventDefault()
        e.returnValue = 'Unsaved changes will be lost. Exit?'
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isEditing])

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (event: any) => {
            const base64 = event.target.result
            if (focusedField === 'evidence') {
              const nextEvidence = [...(formData.evidence_json || []), { type: 'image', content: base64, timestamp: new Date().toISOString() }]
              setFormData((prev: any) => ({ ...prev, evidence_json: nextEvidence }))
              if (!isEditing) onSave({ ...formData, evidence_json: nextEvidence })
              toast.success('Evidence Captured')
            } else if (focusedField === 'timeline') {
              setNewTimeline((prev: any) => ({ ...prev, images: [...(prev.images || []), base64] }))
              toast.success('Figure Captured')
            } else {
              toast.error('Select a field to paste images (Evidence or Figures)')
            }
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }

  const handleAddTimeline = () => {
    if (!newTimeline.description.trim()) {
      toast.error("Description required")
      return
    }
    const now = new Date().toISOString()
    const timeline = [...(formData.timeline || []), { ...newTimeline, id: Date.now(), created_at: now, updated_at: now }]
    const updated = { ...formData, timeline }
    setFormData(updated)
    onSave(updated)
    setNewTimeline({ event_type: 'OBSERVATION', description: '', event_time: now, owner: '', owner_team: '', images: [], created_at: now, updated_at: now })
    toast.success('Event Synchronized')
  }

  const handleDeleteTimeline = (id: number) => {
    const updated = { ...formData, timeline: (formData.timeline || []).filter((t: any) => t.id !== id) }
    setFormData(updated)
    onSave(updated)
    toast.success('Event Purged')
  }

  const startEditingTimeline = (event: any) => {
    setEditingTimelineId(event.id)
    setEditTimelineData({ ...event })
  }

  const saveTimelineUpdate = () => {
    const timeline = (formData.timeline || []).map((t: any) => 
      t.id === editingTimelineId ? { ...editTimelineData, updated_at: new Date().toISOString() } : t
    )
    const updated = { ...formData, timeline }
    setFormData(updated)
    onSave(updated)
    setEditingTimelineId(null)
    setEditTimelineData(null)
    toast.success('Event Updated')
  }

  const systemsList = useMemo(() => Array.from(new Set(devices?.map((d: any) => d.system) || [])), [devices])
  const filteredAssets = useMemo(() => {
    const activeSystems = formData.target_systems || []
    return devices?.filter((d: any) => activeSystems.includes(d.system)) || []
  }, [devices, formData.target_systems])
  
  const filteredServices = useMemo(() => {
    const assetIds = formData.impacted_asset_ids || []
    return devices?.filter((d: any) => assetIds.includes(d.id)).flatMap((d: any) => d.logical_services || []) || []
  }, [devices, formData.impacted_asset_ids])

  const filteredFailureModes = useMemo(() => {
    if (!failureModes) return []
    const activeSystems = formData.target_systems || []
    const activeAssetIds = formData.impacted_asset_ids || []
    
    return failureModes.filter((fm: any) => {
      const fmSystem = fm.system_name || fm.system
      const fmAssetIds = fm.affected_assets?.map((a: any) => a.id) || []
      
      if (activeAssetIds.length > 0) {
        return activeAssetIds.some(id => fmAssetIds.includes(id))
      }
      if (activeSystems.length > 0) {
        return activeSystems.includes(fmSystem)
      }
      return true
    })
  }, [failureModes, formData.target_systems, formData.impacted_asset_ids])

  // Analytics Calculation
  const timelineStats = useMemo(() => {
    const events = [...(formData.timeline || [])].sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime())
    if (events.length === 0) return null
    const start = new Date(events[0].event_time)
    const end = new Date(events[events.length - 1].event_time)
    const diff = end.getTime() - start.getTime()
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    return {
      start: start.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      end: end.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      duration: `${days}D ${hours}H ${minutes}M`
    }
  }, [formData.timeline])

  // Auto-save logic
  const lastSavedData = useRef(JSON.stringify(item))
  useEffect(() => {
    const currentData = JSON.stringify(formData)
    if (!isEditing && currentData !== lastSavedData.current) {
        onSave(formData)
        lastSavedData.current = currentData
    }
  }, [isEditing, formData, onSave])

  const pInfo = getPriorityInfo(formData.priority)
  const enumOptions = (cat: string) => (options || []).filter((o: any) => o.category === cat).map((o: any) => ({ value: o.value.toUpperCase(), label: o.label.toUpperCase() }))

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4" onPaste={handlePaste}>
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-[1750px] h-full rounded-lg border border-purple-500/20 overflow-hidden flex flex-col shadow-[0_0_100px_rgba(168,85,247,0.1)]">
        
        {/* Header Block */}
        <div className="px-8 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-purple-600/20 rounded-lg flex items-center justify-center text-purple-400 border border-purple-500/30 shadow-inner text-xs font-black">RCA</div>
            <div>
              <div className="flex items-center space-x-4 mb-1.5">
                <div className="flex items-center gap-2">
                   <div className={`px-3 py-1 rounded border text-[10px] font-black uppercase ${pInfo.color}`}>{safeUpper(formData.status)}</div>
                   <div className={`px-3 py-1 rounded border text-[10px] font-black uppercase ${pInfo.color}`}>PRIORITY: {pInfo.label}</div>
                </div>
              </div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">{formData.title}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => {
                if (isEditing) {
                  onSave(formData)
                  lastSavedData.current = JSON.stringify(formData)
                  toast.success('Registry Updated')
                }
                setIsEditing(!isEditing)
              }} 
              className={`h-12 px-8 rounded-lg text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${isEditing ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30 border-amber-400' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white hover:border-white/20'}`}
            >
              {isEditing ? <Check size={14}/> : <Edit2 size={14}/>} {isEditing ? 'Confirm Changes' : 'Enter Edit Mode'}
            </button>
            <button 
              onClick={() => {
                if (isEditing && !confirm('Unsaved changes will be lost. Exit?')) return
                onClose()
              }} 
              className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all"
            >
              <X size={24}/>
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Analytical Pane (Left) */}
          <div className="w-[500px] border-r border-white/5 bg-black/20 overflow-y-auto custom-scrollbar p-6 space-y-4 relative z-20">
             
             {/* 1. Overview Section */}
             <SectionCard icon={Info} title="Overview" color="text-blue-400">
                <div className="space-y-4">
                   <div className={!isEditing ? 'pointer-events-none opacity-80' : ''}>
                      <SearchableMultiSelect 
                         label="Owners" 
                         selected={formData.owners || []} 
                         onChange={(next: string[]) => setFormData({...formData, owners: next.map(s => s.toUpperCase())})} 
                         options={['Infrastructure Team', 'SRE', 'DevOps', 'App Support'].map(s => s.toUpperCase())} 
                         placeholder="Add Owners..." 
                         allowCustom={true}
                      />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <StyledSelect 
                         label="Incident Type" 
                         value={safeUpper(formData.incident_type)} 
                         onChange={(e: any) => setFormData({...formData, incident_type: e.target.value.toUpperCase()})} 
                         options={enumOptions('IncidentType')} 
                         disabled={!isEditing}
                      />
                      <div>
                         <label className="text-[9px] font-black text-slate-500 uppercase block tracking-widest px-1 mb-1">Incident Datetime</label>
                         <input 
                           type="datetime-local" 
                           readOnly={!isEditing}
                           value={formData.occurrence_at?.slice(0, 16) || ''} 
                           onChange={e => setFormData({...formData, occurrence_at: e.target.value})}
                           className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-[11px] outline-none focus:border-blue-500 text-slate-300 font-bold [color-scheme:dark]" 
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <StyledSelect 
                         label="Detection Type" 
                         value={safeUpper(formData.detection_type)} 
                         onChange={(e: any) => setFormData({...formData, detection_type: e.target.value.toUpperCase()})} 
                         options={enumOptions('DetectionType')} 
                         disabled={!isEditing}
                      />
                      <div>
                         <label className="text-[9px] font-black text-slate-500 uppercase block tracking-widest px-1 mb-1">Detection Datetime</label>
                         <input 
                           type="datetime-local" 
                           readOnly={!isEditing}
                           value={formData.detection_at?.slice(0, 16) || ''} 
                           onChange={e => setFormData({...formData, detection_at: e.target.value})}
                           className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-[11px] outline-none focus:border-blue-500 text-slate-300 font-bold [color-scheme:dark]" 
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <StyledSelect 
                        label="Priority"
                        value={getPriorityInfo(formData.priority).label} 
                        onChange={(e: any) => setFormData({...formData, priority: e.target.value.toUpperCase()})} 
                        options={['LOW', 'MEDIUM', 'HIGH', 'HIGHEST'].map(s => ({value: s, label: s}))} 
                        disabled={!isEditing}
                      />
                      <StyledSelect 
                        label="Status"
                        value={safeUpper(formData.status)} 
                        onChange={(e: any) => setFormData({...formData, status: e.target.value.toUpperCase()})} 
                        options={['ANALYZING', 'OPEN', 'INVESTIGATION', 'RESOLVED', 'CLOSED', 'ESCALATED'].map(s => ({value: s, label: s}))} 
                        disabled={!isEditing}
                      />
                   </div>
                </div>
             </SectionCard>

             {/* 2. Problem Statement */}
             <SectionCard icon={FileText} title="Problem Statement" color="text-slate-400">
                <div className="space-y-4">
                   <textarea 
                     readOnly={!isEditing}
                     value={formData.problem_statement} 
                     onChange={e => setFormData({...formData, problem_statement: e.target.value})} 
                     className={`w-full bg-slate-950 border border-white/5 rounded-lg p-4 text-[11px] font-bold text-slate-300 outline-none min-h-[100px] resize-none ${!isEditing && 'cursor-default opacity-80'}`} 
                     placeholder="Describe the problem..."
                   />
                   
                   <div className="bg-white/5 border border-white/5 rounded-lg overflow-visible transition-all">
                      <button 
                         onClick={() => setIsFailureModesOpen(!isFailureModesOpen)}
                         className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-all border-b border-white/5"
                      >
                         <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Linked Failure Modes (FAR)</span>
                         <ChevronDown size={14} className={`text-slate-500 transition-transform ${isFailureModesOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                         {isFailureModesOpen && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-visible bg-black/20 p-4">
                               <div className={!isEditing ? 'pointer-events-none opacity-80' : ''}>
                                  <SearchableMultiSelect 
                                     selected={formData.linked_failure_mode_ids || []} 
                                     onChange={(next: number[]) => setFormData({...formData, linked_failure_mode_ids: next})} 
                                     options={filteredFailureModes.map((fm: any) => ({ value: fm.id, label: `${fm.title} [${fm.system_name || fm.system}]` }))} 
                                     placeholder="Add Failure Modes..." 
                                     allowCustom={false}
                                  />
                               </div>
                               <div className="mt-4 overflow-x-auto">
                                  <table className="w-full text-left border-collapse">
                                     <thead>
                                        <tr className="border-b border-white/10">
                                           <th className="text-[8px] font-black uppercase text-slate-500 py-2 px-2">Failure Mode</th>
                                           <th className="text-[8px] font-black uppercase text-slate-500 py-2 px-2">System</th>
                                           <th className="text-[8px] font-black uppercase text-slate-500 py-2 px-2">Server</th>
                                           <th className="text-[8px] font-black uppercase text-slate-500 py-2 px-2 text-right">Delete</th>
                                        </tr>
                                     </thead>
                                     <tbody>
                                        {(failureModes || []).filter((fm: any) => (formData.linked_failure_mode_ids || []).includes(fm.id)).map((fm: any) => (
                                           <tr key={fm.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                              <td className="py-2 px-2">
                                                 <div className="text-[9px] font-black uppercase text-purple-400 truncate max-w-[150px]">{fm.title}</div>
                                              </td>
                                              <td className="py-2 px-2">
                                                 <div className="text-[9px] font-black uppercase text-slate-400">{fm.system_name || fm.system}</div>
                                              </td>
                                              <td className="py-2 px-2">
                                                 <div className="group relative cursor-help inline-block">
                                                    <div className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">{(fm.affected_assets || []).length}</div>
                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50">
                                                       <div className="bg-slate-900 border border-white/10 rounded-lg p-2 shadow-2xl min-w-[150px]">
                                                          {(fm.affected_assets || []).map((a: any) => (
                                                             <div key={a.id} className="text-[8px] font-black text-slate-300 uppercase py-0.5 border-b border-white/5 last:border-0">{a.name}</div>
                                                          ))}
                                                          {(fm.affected_assets || []).length === 0 && <div className="text-[8px] font-black text-slate-600">No assets linked</div>}
                                                       </div>
                                                    </div>
                                                 </div>
                                              </td>
                                              <td className="py-2 px-2 text-right">
                                                 {isEditing && (
                                                    <button onClick={() => setFormData({...formData, linked_failure_mode_ids: formData.linked_failure_mode_ids.filter((id:number)=>id!==fm.id)})} className="text-rose-500 hover:text-rose-300 transition-all p-1 hover:bg-rose-500/10 rounded">
                                                       <Trash2 size={12}/>
                                                    </button>
                                                 )}
                                              </td>
                                           </tr>
                                        ))}
                                        {(formData.linked_failure_mode_ids || []).length === 0 && (
                                           <tr>
                                              <td colSpan={4} className="py-8 text-center text-[9px] font-black uppercase text-slate-600 italic">No linked failure modes</td>
                                           </tr>
                                        )}
                                     </tbody>
                                  </table>
                               </div>
                            </motion.div>
                         )}
                      </AnimatePresence>
                   </div>
                </div>
             </SectionCard>

             {/* 3. System Context */}
             <div className="bg-white/5 border border-white/5 rounded-lg overflow-visible transition-all">
                <button 
                   onClick={() => setIsSystemContextOpen(!isSystemContextOpen)}
                   className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-all border-b border-white/5"
                >
                   <div className="flex items-center gap-2">
                      <Database size={14} className="text-amber-400" />
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-white/70">System Context</h3>
                   </div>
                   <div className="flex items-center gap-4">
                      {!isSystemContextOpen && (formData.target_systems || []).length > 0 && (
                         <div className="flex gap-1 overflow-hidden max-w-[150px]">
                            {(formData.target_systems || []).map((s: string) => (
                               <span key={s} className="text-[8px] font-black text-amber-500/60 uppercase whitespace-nowrap">{s}</span>
                            ))}
                         </div>
                      )}
                      <ChevronDown size={14} className={`text-slate-500 transition-transform ${isSystemContextOpen ? 'rotate-180' : ''}`} />
                   </div>
                </button>
                <AnimatePresence>
                   {isSystemContextOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-visible bg-black/20 p-4 space-y-4">
                         <div className={!isEditing ? 'pointer-events-none opacity-80' : ''}>
                           <SearchableMultiSelect 
                              label="Target System(s)" 
                              selected={formData.target_systems || []} 
                              onChange={(next: string[]) => setFormData({...formData, target_systems: next, impacted_asset_ids: [], impacted_service_ids: [], linked_failure_mode_ids: []})} 
                              options={systemsList} 
                              placeholder="Select Systems..." 
                              allowCustom={false}
                           />
                         </div>
                         <div className="space-y-4">
                            <div>
                               <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Impacted Assets</label>
                               <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                  {filteredAssets.map((a: any) => (
                                    <label key={a.id} className={`flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-all text-[10px] font-black uppercase ${formData.impacted_asset_ids?.includes(a.id) ? 'text-amber-400' : 'text-slate-500'}`}>
                                       <input type="checkbox" disabled={!isEditing} checked={formData.impacted_asset_ids?.includes(a.id)} onChange={e => {
                                         const ids = formData.impacted_asset_ids || []
                                         setFormData({...formData, impacted_asset_ids: e.target.checked ? [...ids, a.id] : ids.filter((i:any)=>i!==a.id), linked_failure_mode_ids: []})
                                       }} className="sr-only" />
                                       <div className={`w-2 h-2 rounded-full border ${formData.impacted_asset_ids?.includes(a.id) ? 'bg-amber-500 border-amber-500' : 'border-white/20'}`} />
                                       <span className="truncate">{a.name}</span>
                                    </label>
                                  ))}
                               </div>
                            </div>
                            <div>
                               <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Impacted Services</label>
                               <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
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
                         </div>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>

             {/* 4. Operational Impact */}
             <SectionCard icon={ShieldAlert} title="Operational Impact" color="text-rose-400">
                <div className="space-y-4">
                   <StyledSelect 
                      label="Impact Type" 
                      value={safeUpper(formData.impact_type)} 
                      onChange={(e: any) => setFormData({...formData, impact_type: e.target.value.toUpperCase()})} 
                      options={enumOptions('ImpactType')} 
                      disabled={!isEditing}
                   />
                   <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block tracking-widest px-1 mb-1">Impact Narrative</label>
                      <textarea 
                        readOnly={!isEditing}
                        value={formData.impact_description} 
                        onChange={e => setFormData({...formData, impact_description: e.target.value})} 
                        className="w-full bg-slate-950 border border-white/5 rounded-lg p-4 text-[11px] font-bold text-slate-300 outline-none min-h-[100px] resize-none" 
                        placeholder="Describe the operational impact..." 
                      />
                   </div>
                </div>
             </SectionCard>

             {/* 5. Evidence Section */}
             <SectionCard icon={Camera} title="Evidence" color="text-blue-400">
                <div 
                   onClick={() => setFocusedField('evidence')}
                   className={`grid grid-cols-3 gap-2 max-h-64 overflow-y-auto custom-scrollbar pr-1 p-2 rounded-lg transition-all border-2 ${focusedField === 'evidence' ? 'border-blue-500/50 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'border-transparent'}`}
                >
                   {(formData.evidence_json || []).map((ev: any, i: number) => (
                      <div key={i} className="relative aspect-square bg-slate-950 border border-white/10 rounded-lg overflow-hidden group shadow-xl">
                         <img src={ev.content} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <button onClick={(e) => { 
                               e.stopPropagation(); 
                               const nextEvidence = formData.evidence_json.filter((_:any,idx:number)=>idx!==i);
                               setFormData({...formData, evidence_json: nextEvidence});
                               if (!isEditing) onSave({...formData, evidence_json: nextEvidence});
                            }} className="p-1.5 bg-rose-600 text-white rounded hover:bg-rose-500 transition-colors shadow-lg"><Trash2 size={12}/></button>
                         </div>
                      </div>
                   ))}
                   <div className="aspect-square bg-white/5 border border-dashed border-white/10 rounded-lg flex items-center justify-center text-slate-600 cursor-pointer hover:bg-white/10 transition-all">
                      <Plus size={20} />
                   </div>
                </div>
                {focusedField === 'evidence' && <p className="text-[8px] font-black uppercase text-blue-400 text-center animate-pulse mt-2">Ready to paste evidence...</p>}
             </SectionCard>
          </div>

          {/* Right Pane with Tabs */}
          <div className="flex-1 flex flex-col bg-[#020617]/30 overflow-hidden">
             {/* Navigation Tabs */}
             <div className="flex bg-white/5 border-b border-white/5 p-1 gap-1 shrink-0">
                {['Timeline', 'Mitigation', 'Investigation'].map(tab => (
                   <button 
                     key={tab}
                     onClick={() => setActiveTab(tab)}
                     className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-md ${activeTab === tab ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                   >
                      {tab === 'Timeline' && <History size={14} className="inline mr-2" />}
                      {tab === 'Mitigation' && <ShieldCheck size={14} className="inline mr-2" />}
                      {tab === 'Investigation' && <Search size={14} className="inline mr-2" />}
                      {tab}
                   </button>
                ))}
             </div>

             <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'Timeline' && (
                  <>
                    <div className="p-6 border-b border-white/5 bg-white/5">
                        <div className="grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-12 lg:col-span-4">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Event Description</label>
                              <input value={newTimeline.description} onChange={e => setNewTimeline({...newTimeline, description: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-[12px] font-bold text-white outline-none focus:border-purple-500/50" placeholder="Raw description..." />
                          </div>
                          <div className="col-span-12 lg:col-span-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Owner</label>
                             <input value={newTimeline.owner} onChange={e => setNewTimeline({...newTimeline, owner: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-[12px] font-bold text-white outline-none focus:border-purple-500/50" placeholder="NAME..." />
                          </div>
                          <div className="col-span-12 lg:col-span-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Team</label>
                             <input value={newTimeline.owner_team} onChange={e => setNewTimeline({...newTimeline, owner_team: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-[12px] font-bold text-white outline-none focus:border-purple-500/50" placeholder="TEAM..." />
                          </div>
                          <div className="col-span-12 lg:col-span-2">
                            <StyledSelect label="Type" value={newTimeline.event_type} onChange={(e:any) => setNewTimeline({...newTimeline, event_type: e.target.value.toUpperCase()})} options={enumOptions('EventType')} />
                          </div>
                          <div className="col-span-12 lg:col-span-2">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Event Time</label>
                              <input type="datetime-local" value={newTimeline.event_time.slice(0, 16)} onChange={e => setNewTimeline({...newTimeline, event_time: new Date(e.target.value).toISOString()})} className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-[11px] font-black text-slate-400 outline-none [color-scheme:dark]" />
                          </div>
                          <div 
                             onClick={() => setFocusedField('timeline')}
                             className={`col-span-12 flex items-center justify-between mt-4 p-3 rounded-lg border-2 transition-all ${focusedField === 'timeline' ? 'bg-purple-500/5 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'bg-black/40 border-white/5'}`}
                          >
                             <div className="flex-1 flex items-center gap-4">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block shrink-0">Figure(s):</label>
                                <div className="flex gap-2 overflow-x-auto">
                                   {(newTimeline.images || []).map((img: string, i: number) => (
                                      <div key={i} className="relative w-10 h-10 shrink-0 border border-purple-500/30 rounded overflow-hidden">
                                         <img src={img} className="w-full h-full object-cover" />
                                         <button onClick={(e) => { e.stopPropagation(); setNewTimeline({...newTimeline, images: newTimeline.images.filter((_:any, idx:number)=>idx!==i)}) }} className="absolute top-0 right-0 bg-rose-600 text-white p-0.5"><X size={8}/></button>
                                      </div>
                                   ))}
                                   {newTimeline.images?.length === 0 && <span className="text-[8px] text-slate-600 uppercase font-black">Paste images here to cache for this event...</span>}
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                {focusedField === 'timeline' && <span className="text-[8px] font-black uppercase text-purple-400 animate-pulse mr-2">Ready to paste figures...</span>}
                                <button onClick={handleAddTimeline} className="h-12 px-8 bg-purple-600 text-white rounded-lg shadow-xl active:scale-95 transition-all font-black uppercase text-[10px] flex items-center gap-2 border border-purple-400/50">
                                   <Plus size={16} /> Add Event
                                </button>
                             </div>
                          </div>
                        </div>
                    </div>

                    {/* Timeline Analytics Bar */}
                    {timelineStats && (
                       <div className="px-6 py-2 bg-purple-600/10 border-b border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-8">
                             <div className="flex flex-col">
                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Timeline Start</span>
                                <span className="text-[10px] font-black text-purple-400">{timelineStats.start}</span>
                             </div>
                             <div className="w-px h-6 bg-white/10" />
                             <div className="flex flex-col">
                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Timeline End</span>
                                <span className="text-[10px] font-black text-blue-400">{timelineStats.end}</span>
                             </div>
                          </div>
                          <div className="flex items-center gap-3 px-4 py-1 bg-white/5 rounded-full border border-white/10">
                             <Clock size={12} className="text-emerald-400" />
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Duration:</span>
                             <span className="text-[11px] font-black text-emerald-400 tabular-nums">{timelineStats.duration}</span>
                          </div>
                       </div>
                    )}
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="relative pl-12 space-y-4 max-w-full">
                          <div className="absolute left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-600/50 via-blue-600/50 to-emerald-600/50 rounded-full" />
                          
                          {(formData.timeline || []).sort((a:any, b:any) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime()).map((e: any) => {
                            const typeColors: any = {
                                'DETECTION': 'bg-rose-500 shadow-rose-500/50',
                                'OBSERVATION': 'bg-blue-500 shadow-blue-500/50',
                                'MITIGATION': 'bg-amber-500 shadow-amber-500/50',
                                'RESOLUTION': 'bg-emerald-500 shadow-emerald-500/50'
                            }
                            const isEditingEvent = editingTimelineId === e.id
                            return (
                              <div key={e.id} className="relative bg-white/5 border border-white/10 rounded-lg p-6 shadow-2xl group hover:bg-white/[0.08] transition-all w-full">
                                  <div className={`absolute -left-[30px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-slate-900 shadow-lg z-10 transition-transform group-hover:scale-125 ${typeColors[e.event_type] || 'bg-slate-500'}`} />
                                  
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 flex items-start gap-8">
                                        <div className="w-40 shrink-0 pt-1">
                                          <p className="text-[12px] font-black text-white mb-1.5">{new Date(e.event_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                          <span className={`text-[10px] font-black uppercase px-3 py-1 rounded border tracking-widest ${e.event_type === 'DETECTION' ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' : e.event_type === 'RESOLUTION' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-blue-400 border-blue-500/30 bg-blue-500/10'}`}>{e.event_type}</span>
                                        </div>
                                        <div className="flex-1">
                                          {isEditingEvent ? (
                                             <div className="grid grid-cols-12 gap-4 bg-black/60 p-5 rounded-xl border border-purple-500/40 shadow-2xl">
                                                <div className="col-span-12">
                                                   <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Description</label>
                                                   <textarea 
                                                      value={editTimelineData.description} 
                                                      onChange={ev => setEditTimelineData({...editTimelineData, description: ev.target.value})}
                                                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-[11px] text-white font-bold outline-none focus:border-purple-500/50 min-h-[80px]"
                                                   />
                                                </div>
                                                <div className="col-span-4">
                                                   <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Owner</label>
                                                   <input value={editTimelineData.owner} onChange={ev => setEditTimelineData({...editTimelineData, owner: ev.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-white/10 rounded px-3 py-1.5 text-[10px] font-black text-white outline-none focus:border-purple-500/50" />
                                                </div>
                                                <div className="col-span-4">
                                                   <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Team</label>
                                                   <input value={editTimelineData.owner_team} onChange={ev => setEditTimelineData({...editTimelineData, owner_team: ev.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-white/10 rounded px-3 py-1.5 text-[10px] font-black text-white outline-none focus:border-purple-500/50" />
                                                </div>
                                                <div className="col-span-4">
                                                   <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Event Time</label>
                                                   <input type="datetime-local" value={editTimelineData.event_time.slice(0, 16)} onChange={ev => setEditTimelineData({...editTimelineData, event_time: new Date(ev.target.value).toISOString()})} className="w-full bg-slate-950 border border-white/10 rounded px-3 py-1.5 text-[10px] font-black text-slate-400 outline-none [color-scheme:dark]" />
                                                </div>
                                                <div className="col-span-12 flex justify-end gap-2 pt-2">
                                                   <button onClick={() => { setEditingTimelineId(null); setEditTimelineData(null); }} className="h-10 px-6 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
                                                   <button onClick={saveTimelineUpdate} className="h-10 px-8 bg-purple-600 text-white rounded text-[10px] font-black uppercase shadow-lg shadow-purple-500/20 active:scale-95 transition-all">Save Event</button>
                                                </div>
                                             </div>
                                          ) : (
                                             <>
                                                <p className="text-[11px] font-bold text-slate-200 tracking-tight leading-relaxed normal-case mb-3">{e.description}</p>
                                                <div className="flex items-center gap-3">
                                                   <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg shadow-inner">
                                                      <User size={12} className="text-purple-400" />
                                                      <span className="text-[9px] font-black text-purple-300 uppercase tracking-widest">{e.owner || 'N/A'}</span>
                                                   </div>
                                                   {e.owner_team && (
                                                      <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                         {e.owner_team}
                                                      </div>
                                                   )}
                                                </div>
                                                
                                                {e.images && e.images.length > 0 && (
                                                   <div className="mt-4 flex gap-2 flex-wrap">
                                                      {e.images.map((img: string, idx: number) => (
                                                         <ImageThumbnail key={idx} src={img} />
                                                      ))}
                                                   </div>
                                                )}
                                             </>
                                          )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-4">
                                       <div className="text-right shrink-0">
                                          <div className="flex flex-col">
                                             <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Created: {new Date(e.created_at || e.event_time).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                             <span className="text-[8px] font-black text-blue-500/60 uppercase tracking-tighter">Modified: {new Date(e.updated_at || e.created_at || e.event_time).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                          <button onClick={() => startEditingTimeline(e)} className="w-11 h-11 flex items-center justify-center bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20"><Edit2 size={16}/></button>
                                          <button onClick={() => handleDeleteTimeline(e.id)} className="w-11 h-11 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"><Trash2 size={16}/></button>
                                       </div>
                                    </div>
                                  </div>
                              </div>
                            )
                          })}
                        </div>
                    </div>
                  </>
                )}

                {activeTab === 'Mitigation' && (
                  <div className="p-6 flex-1 flex flex-col space-y-6 overflow-hidden">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4 shadow-xl">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400 flex items-center gap-2"><Plus size={14}/> Add Mitigation Strategy</h3>
                          <div className="grid grid-cols-2 gap-4">
                             <StyledSelect label="Type" value={newMitigation.type} onChange={(e:any) => setNewMitigation({...newMitigation, type: e.target.value.toUpperCase()})} options={['WORKAROUND', 'PREVENTIVE', 'MITIGATION', 'PERMANENT FIX'].map(v=>({value:v, label:v}))} />
                             <StyledSelect label="Status" value={newMitigation.status} onChange={(e:any) => setNewMitigation({...newMitigation, status: e.target.value.toUpperCase()})} options={['PLANNED', 'IN PROGRESS', 'VERIFIED', 'COMPLETED'].map(v=>({value:v, label:v}))} />
                          </div>
                          <textarea value={newMitigation.action_description} onChange={e => setNewMitigation({...newMitigation, action_description: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-lg p-4 text-[11px] font-bold text-white outline-none focus:border-purple-500/50 min-h-[80px]" placeholder="Action details..." />
                          <button onClick={() => {
                             if (!newMitigation.action_description.trim()) { toast.error("Description required"); return; }
                             const nextMitigations = [...(formData.mitigations || []), { ...newMitigation, id: Date.now() }]
                             setFormData({...formData, mitigations: nextMitigations})
                             onSave({...formData, mitigations: nextMitigations})
                             setNewMitigation({ type: 'WORKAROUND', action_description: '', status: 'PLANNED' })
                          }} className="h-12 w-full bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">Add Mitigation</button>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                         {(formData.mitigations || []).map((m: any) => (
                           <div key={m.id} className="bg-white/5 border border-white/10 rounded-lg p-5 flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                              <div className="flex items-center gap-6">
                                 <div className="w-24 text-center">
                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-blue-500/30 text-blue-400 bg-blue-500/10">{m.type}</span>
                                    <p className={`text-[8px] font-black uppercase mt-1.5 ${m.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'}`}>{m.status}</p>
                                 </div>
                                 <p className="text-[11px] font-bold text-slate-200">{m.action_description}</p>
                              </div>
                              <button onClick={() => {
                                 const nextMitigations = formData.mitigations.filter((x:any)=>x.id!==m.id)
                                 setFormData({...formData, mitigations: nextMitigations})
                                 onSave({...formData, mitigations: nextMitigations})
                              }} className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all"><Trash2 size={14}/></button>
                           </div>
                         ))}
                      </div>
                  </div>
                )}

                {activeTab === 'Investigation' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                     <div className="p-6">
                        <SectionCard icon={Search} title="Investigation Narrative" color="text-indigo-400">
                           <textarea 
                              readOnly={!isEditing}
                              value={formData.narrative_summary} 
                              onChange={e => setFormData({...formData, narrative_summary: e.target.value})} 
                              className={`w-full bg-slate-950 border border-white/5 rounded-lg p-4 text-[12px] font-bold text-slate-300 outline-none min-h-[300px] resize-none ${!isEditing && 'cursor-default opacity-80'}`} 
                              placeholder="Record technical deep-dive findings, cause/effect chains, and logic here..."
                           />
                        </SectionCard>
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

function ResearchDetails({ item, onClose, onSave, setConfirmModal, fontSize, rowDensity }: any) {
  const [formData, setFormData] = useState({ ...item })
  const [isEditing, setIsEditing] = useState(false)
  const [newLog, setNewLog] = useState({ entry_text: '', entry_type: 'DIAGNOSIS', poc: '', timestamp: new Date().toISOString() })

  // Navigation Safety
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing) {
        e.preventDefault()
        e.returnValue = 'Unsaved changes will be lost. Exit?'
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isEditing])

  const logMutation = useMutation({
    mutationFn: async (log: any) => {
      const formattedLog = { ...log, entry_type: safeUpper(log.entry_type), poc: safeUpper(log.poc) }
      const res = await apiFetch(`/api/v1/investigations/${item.id}/logs`, {
        method: 'POST',
        body: JSON.stringify(formattedLog)
      })
      return res.json()
    },
    onSuccess: (data) => {
      setFormData(prev => ({ ...prev, progress_logs: [...(prev.progress_logs || []), data] }))
      setNewLog({ entry_text: '', entry_type: 'DIAGNOSIS', poc: '', timestamp: new Date().toISOString() })
      toast.success('Pulse Captured')
    }
  })

  const handleSave = () => {
    const finalData = { 
      ...formData, 
      status: safeUpper(formData.status), 
      priority: safeUpper(formData.priority) 
    }
    onSave(finalData)
    setIsEditing(false)
    toast.success('Intelligence Synchronized')
  }

  const sortedLogs = useMemo(() => {
     return [...(formData.progress_logs || [])].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [formData.progress_logs])

  const pInfo = getPriorityInfo(formData.priority)

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-[1600px] h-full rounded-lg border border-blue-500/20 overflow-hidden flex flex-col shadow-[0_0_100px_rgba(37,99,235,0.1)]">
        
        {/* Header Block */}
        <div className="px-8 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400 border border-blue-500/30 shadow-inner text-xs font-black">INV</div>
            <div>
              <div className="flex items-center space-x-4 mb-1.5">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-40">
                      <StyledSelect 
                        value={safeUpper(formData.status)} 
                        onChange={(e: any) => setFormData({...formData, status: e.target.value.toUpperCase()})} 
                        options={['ANALYZING', 'OPEN', 'INVESTIGATION', 'RESOLVED', 'CLOSED', 'ESCALATED'].map(s => ({value: s, label: s}))} 
                      />
                    </div>
                    <div className="w-40">
                      <StyledSelect 
                        value={pInfo.label} 
                        onChange={(e: any) => setFormData({...formData, priority: e.target.value.toUpperCase()})} 
                        options={['LOW', 'MEDIUM', 'HIGH', 'HIGHEST'].map(s => ({value: s, label: s}))} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded border text-[10px] font-black uppercase ${pInfo.color}`}>{safeUpper(formData.status)}</div>
                    <div className={`px-3 py-1 rounded border text-[10px] font-black uppercase ${pInfo.color}`}>PRIORITY: {pInfo.label}</div>
                  </div>
                )}
              </div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">{formData.title}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className={`h-11 px-6 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isEditing ? 'bg-amber-600 text-white shadow-amber-500/20' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'}`}
            >
              {isEditing ? <Check size={14}/> : <Edit2 size={14}/>} {isEditing ? 'Lock' : 'Edit'}
            </button>
            <button onClick={handleSave} className="h-11 px-6 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"><Save size={14}/> Sync Intelligence</button>
            <button 
               onClick={() => {
                  if (isEditing && !confirm('Unsaved changes will be lost. Exit?')) return
                  onClose()
               }} 
               className="w-11 h-11 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all"
            >
               <X size={24}/>
            </button>
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
         <input value={newLog.entry_text} onChange={e => setNewLog({...newLog, entry_text: e.target.value.toUpperCase()})} className={`w-full bg-slate-950 border border-white/10 rounded-lg ${compact ? 'px-4 py-2 text-[11px]' : 'px-5 py-3 text-[12px]'} font-black text-white outline-none focus:border-blue-500 uppercase`} placeholder="Record observation pulse..." />
      </div>
      <div className={compact ? 'w-32' : 'w-48'}>
         <StyledSelect label="Type" value={safeUpper(newLog.entry_type)} onChange={e => setNewLog({...newLog, entry_type: e.target.value.toUpperCase()})} options={[{value:'DIAGNOSIS', label:'DIAGNOSIS'}, {value:'ACTION', label:'ACTION'}, {value:'OBSERVATION', label:'OBSERVATION'}, {value:'MILESTONE', label:'MILESTONE'}]} />
      </div>
      <div className={compact ? 'w-24' : 'w-40'}>
         <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">POC</label>
         <input value={newLog.poc} onChange={e => setNewLog({...newLog, poc: e.target.value.toUpperCase()})} className={`w-full bg-slate-950 border border-white/10 rounded-lg ${compact ? 'px-2 py-2 text-[10px]' : 'px-4 py-2.5 text-[11px]'} font-black text-white outline-none focus:border-blue-500 uppercase`} placeholder="NAME..." />
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
                       <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-inner">{safeUpper(l.entry_type)}</span>
                    </div>
                    <div className="flex-1">
                       <p className={`${compact ? 'text-[11px]' : 'text-base'} font-black text-slate-200 leading-relaxed tracking-tight uppercase`}>{l.entry_text}</p>
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
