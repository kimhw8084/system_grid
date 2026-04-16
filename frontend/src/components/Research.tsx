import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ListTodo, History, ShieldAlert, Globe, 
  Zap, Save, X, PlusCircle, User, MessageSquare,
  MoreVertical, RefreshCcw, TrendingUp, AlertTriangle,
  Lightbulb, ShieldCheck, Calendar, Activity, Database, Server,
  FileText, Clipboard, Terminal, ArrowRight, Shield, Download, Share2,
  Clock, CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye, Camera, Link as LinkIcon, Layers, Settings, Check, Target, ChevronDown
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
  <div className={`bg-white/5 border border-white/5 rounded-lg p-3 space-y-2 ${className}`}>
    <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-1">
      <Icon size={14} className={color} />
      <h3 className="text-[11px] font-black uppercase tracking-widest text-white/70">{title}</h3>
    </div>
    {children}
  </div>
)

// --- Priority Slider Component ---
const PrioritySlider = ({ value, onChange, label, type }: any) => {
  const isRca = type === 'RCA'
  
  // Mapping 1-10 to 4 levels
  const getLevel = (v: number) => {
    if (v >= 8) return { label: 'Highest', color: 'text-rose-500', bg: 'bg-rose-500' }
    if (v >= 6) return { label: 'High', color: 'text-amber-500', bg: 'bg-amber-500' }
    if (v >= 4) return { label: 'Medium', color: 'text-blue-400', bg: 'bg-blue-400' }
    return { label: 'Low', color: 'text-emerald-500', bg: 'bg-emerald-500' }
  }

  const definitions: any = {
    RCA: {
      'Low': 'Minor glitch, no FAB impact, solved via standard SOP.',
      'Medium': 'Partial service degradation, minor delay, workaround exists.',
      'High': 'Critical service failure, potential scrap risk, requires P2 triage.',
      'Highest': 'Global system outage, FAB halt, immediate P1 RCA mandated.'
    },
    Research: {
      'Low': 'General intelligence gathering, no immediate action needed.',
      'Medium': 'Optimization study, potential efficiency gains identified.',
      'High': 'Strategic investigation, core architecture shift consideration.',
      'Highest': 'Urgent security or reliability probe, critical for roadmap.'
    }
  }

  const level = getLevel(value)
  const def = definitions[isRca ? 'RCA' : 'Research'][level.label]

  return (
    <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
        <div className="flex items-center gap-2">
           <span className={`text-[11px] font-black uppercase ${level.color}`}>{level.label}</span>
           <span className="text-[10px] font-bold text-slate-600">LVL {value}</span>
        </div>
      </div>
      <div className="relative flex items-center h-6">
        <input 
          type="range" min="1" max="10" step="1" 
          value={value} 
          onChange={e => onChange(Number(e.target.value))}
          className="w-full accent-blue-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
        />
        <div className="absolute -bottom-1 left-0 right-0 flex justify-between px-1">
           {[...Array(10)].map((_, i) => (
             <div key={i} className={`w-0.5 h-1 rounded-full ${i < value ? level.bg : 'bg-slate-700'}`} />
           ))}
        </div>
      </div>
      <div className="flex gap-3 items-start bg-black/40 p-2.5 rounded-xl border border-white/5">
         <Info size={14} className={level.color + " mt-0.5 shrink-0"} />
         <p className="text-[10px] text-slate-400 font-bold leading-relaxed tracking-tight italic">{def}</p>
      </div>
    </div>
  )
}

const SearchableMultiSelect = ({ label, selected, options, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = options.filter((o: string) => o.toLowerCase().includes(search.toLowerCase()))
  const toggle = (val: string) => {
    const next = selected.includes(val) ? selected.filter((s: string) => s !== val) : [...selected, val]
    onChange(next)
  }

  return (
    <div className="space-y-1 relative" ref={wrapperRef}>
      <label className="text-[9px] font-black text-slate-500 uppercase block tracking-widest px-1">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[42px] w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 flex flex-wrap gap-1.5 cursor-pointer hover:border-white/20 transition-all shadow-inner"
      >
        {selected.length === 0 && <span className="text-slate-600 text-[11px] italic mt-0.5">{placeholder}</span>}
        {selected.map((s: string) => (
          <div key={s} className="bg-blue-600/20 border border-blue-500/30 rounded-lg px-2 py-0.5 flex items-center gap-1.5 group">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">{s}</span>
            <X size={10} className="text-slate-500 hover:text-white" onClick={(e) => { e.stopPropagation(); toggle(s); }} />
          </div>
        ))}
        <div className="ml-auto text-slate-600 group-hover:text-slate-400"><ChevronDown size={14} /></div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
            className="absolute z-[200] top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-2 max-h-60 flex flex-col"
          >
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={12} />
              <input 
                autoFocus value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-[11px] outline-none focus:border-blue-500/50"
                placeholder="Search systems..."
              />
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5">
               {filtered.map((o: string) => (
                 <div 
                   key={o} onClick={() => toggle(o)}
                   className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase cursor-pointer flex items-center justify-between ${selected.includes(o) ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                 >
                   <span>{o}</span>
                   {selected.includes(o) && <Check size={12} />}
                 </div>
               ))}
               {filtered.length === 0 && <p className="text-center py-4 text-[10px] text-slate-600 italic">No matches found</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
      headerName: "Risk Level", 
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
        // Handle legacy numeric priorities
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
            onClick={() => setActiveModal({ title: '', status: 'Open', priority: 1, type: null, problem_statement: '', systems: [], target_systems: [] })} 
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
        <CompactSummary label="Critical/Emergency" value={stats.urgent} icon={AlertTriangle} color="text-rose-500" />
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
    
    // Strategic Mapping: Convert numeric priority to string for Investigation module if needed
    const finalData = { ...formData }
    if (finalData.type === 'Research') {
       finalData.priority = finalData.priority >= 8 ? 'Highest' : finalData.priority >= 6 ? 'High' : finalData.priority >= 4 ? 'Medium' : 'Low'
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Risk Level</label>
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
  const [activeTab, setActiveTab] = useState('overview')
  const [activeSubTab, setActiveSubTab] = useState('identification')
  const [isEditing, setIsEditing] = useState(false)
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

  const handlePaste = (e: React.ClipboardEvent, target: 'evidence' | 'identification' | 'rca', stepIdx?: number) => {
    if (!isEditing && target !== 'evidence') return
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (event: any) => {
            const base64 = event.target.result
            if (target === 'evidence') {
              setFormData((prev: any) => ({ ...prev, evidence_json: [...(prev.evidence_json || []), { type: 'image', content: base64, timestamp: new Date().toISOString() }] }))
            } else {
              setFormData((prev: any) => {
                const key = target === 'identification' ? 'identification_steps_json' : 'rca_steps_json'
                const steps = [...(prev[key] || [])]
                if (stepIdx !== undefined && steps[stepIdx]) {
                  steps[stepIdx] = { ...steps[stepIdx], images: [...(steps[stepIdx].images || []), base64] }
                }
                return { ...prev, [key]: steps }
              })
            }
            toast.success('Capture Synchronized')
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4" onPaste={(e) => activeTab === 'overview' ? handlePaste(e, 'evidence') : null}>
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-[1600px] h-full rounded-lg border border-purple-500/20 overflow-hidden flex flex-col shadow-[0_0_100px_rgba(168,85,247,0.1)]">
        
        <div className="px-8 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="p-3 bg-purple-600/20 rounded-lg text-purple-400 border border-purple-500/30 shadow-inner"><ShieldAlert size={28} /></div>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">RCA // INTEL NODE</span>
                <StatusPill value={formData.status} />
                <span className="text-[9px] font-black text-rose-400 uppercase bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">RISK LVL {formData.priority}</span>
              </div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">{formData.title}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isEditing ? 'bg-amber-600 text-white shadow-amber-500/20' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'}`}
            >
              {isEditing ? <Check size={14}/> : <Edit2 size={14}/>} {isEditing ? 'Lock Changes' : 'Edit Intelligence'}
            </button>
            <button onClick={handleSave} className="px-6 py-2.5 bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center gap-2"><Save size={14}/> Sync Intelligence</button>
            <button onClick={onClose} className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={24}/></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-20 border-r border-white/5 bg-black/20 flex flex-col items-center py-8 space-y-6 shrink-0">
            <RcaIconBtn active={activeTab === 'overview'} icon={LayoutGrid} onClick={() => setActiveTab('overview')} label="Overview" />
            <RcaIconBtn active={activeTab === 'timeline'} icon={History} onClick={() => setActiveTab('timeline')} label="Timeline" />
            <RcaIconBtn active={activeTab === 'investigation'} icon={Terminal} onClick={() => setActiveTab('investigation')} label="Forensics" />
            <RcaIconBtn active={activeTab === 'causes'} icon={Search} onClick={() => setActiveTab('causes')} label="Causes" />
            <RcaIconBtn active={activeTab === 'mitigation'} icon={ShieldCheck} onClick={() => setActiveTab('mitigation')} label="Mitigation" />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#020617]/30 p-6">
            <div className="max-w-full space-y-4">
               
               {activeTab === 'overview' && (
                 <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 lg:col-span-4 space-y-4">
                       <SectionCard icon={FileText} title="Problem Statement" color="text-slate-400" className="h-56 flex flex-col">
                          <textarea 
                            readOnly={!isEditing}
                            value={formData.problem_statement} 
                            onChange={e => setFormData({...formData, problem_statement: e.target.value})} 
                            className={`flex-1 w-full bg-slate-950 border border-white/5 rounded-lg p-4 text-base font-bold text-slate-300 outline-none focus:border-purple-500/30 resize-none ${!isEditing && 'cursor-default opacity-80'}`} 
                          />
                       </SectionCard>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/5 rounded-lg p-4 border border-white/5 space-y-2">
                             <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Incident Start</label>
                             <input 
                               type="datetime-local" 
                               readOnly={!isEditing}
                               value={formData.occurrence_at?.slice(0, 16)} 
                               onChange={e => setFormData({...formData, occurrence_at: e.target.value})} 
                               className="w-full bg-transparent text-[12px] font-black text-white outline-none [color-scheme:dark]" 
                             />
                          </div>
                          <div className="bg-white/5 rounded-lg p-4 border border-white/5 space-y-2">
                             <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Triage Start</label>
                             <input 
                               type="datetime-local" 
                               readOnly={!isEditing}
                               value={formData.acknowledged_at?.slice(0, 16)} 
                               onChange={e => setFormData({...formData, acknowledged_at: e.target.value})} 
                               className="w-full bg-transparent text-[12px] font-black text-white outline-none [color-scheme:dark]" 
                             />
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/5 rounded-lg p-4 border border-white/5 space-y-2">
                             <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Lead Owner</label>
                             <input 
                               readOnly={!isEditing}
                               value={formData.owner} 
                               onChange={e => setFormData({...formData, owner: e.target.value})} 
                               className="w-full bg-transparent text-[12px] font-black text-white outline-none placeholder:text-slate-700" 
                               placeholder="ASSIGN POC..." 
                             />
                          </div>
                          <div className="bg-white/5 rounded-lg p-4 border border-white/5 space-y-2">
                             <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">External Ref</label>
                             <input 
                               readOnly={!isEditing}
                               value={formData.jira_link} 
                               onChange={e => setFormData({...formData, jira_link: e.target.value})} 
                               className="w-full bg-transparent text-[12px] font-black text-blue-400 outline-none placeholder:text-slate-700" 
                               placeholder="JIRA-123..." 
                             />
                          </div>
                       </div>
                       <SectionCard icon={ShieldAlert} title="Operational Impact (FAB)" color="text-rose-400">
                          <div className="space-y-4">
                             <div className="flex flex-wrap gap-2">
                                {['Flow Halt', 'Scrap Risk', 'Quality Delta', 'Safety Trip'].map(c => (
                                  <button 
                                    key={c} 
                                    disabled={!isEditing}
                                    onClick={() => {
                                      const cats = formData.fab_impact_json?.categories || []
                                      setFormData({...formData, fab_impact_json: { ...formData.fab_impact_json, categories: cats.includes(c) ? cats.filter((i:string)=>i!==c) : [...cats, c] }})
                                    }} 
                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${formData.fab_impact_json?.categories?.includes(c) ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/20'}`}
                                  >
                                    {c}
                                  </button>
                                ))}
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 px-1">FAB Impact Severity</label>
                                <div className="grid grid-cols-4 gap-2">
                                  {['Low', 'Medium', 'High', 'Highest'].map(p => (
                                    <button 
                                      key={p}
                                      type="button"
                                      disabled={!isEditing}
                                      onClick={() => setFormData({...formData, fab_impact_json: { ...formData.fab_impact_json, severity: p }})}
                                      className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all border ${formData.fab_impact_json?.severity === p ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-900 border-white/10 text-slate-500 hover:border-white/20'}`}
                                    >
                                      {p}
                                    </button>
                                  ))}
                                </div>
                             </div>
                             <textarea 
                               readOnly={!isEditing}
                               value={formData.fab_impact_json?.explanation} 
                               onChange={e => setFormData({...formData, fab_impact_json: { ...formData.fab_impact_json, explanation: e.target.value }})} 
                               className="w-full bg-slate-950 border border-white/5 rounded-lg p-4 text-[11px] font-bold text-slate-300 outline-none min-h-[80px] resize-none" 
                               placeholder="Elaborate on the impact..." 
                             />
                          </div>
                       </SectionCard>
                    </div>

                    <div className="col-span-12 lg:col-span-4 space-y-4">
                       <SectionCard icon={Database} title="System Topology Context" color="text-amber-400">
                          <div className="space-y-4">
                             <div className={!isEditing ? 'pointer-events-none opacity-80' : ''}>
                               <SearchableMultiSelect 
                                  label="Target System(s)" 
                                  selected={formData.target_systems || []} 
                                  onChange={(next: string[]) => setFormData({...formData, target_systems: next, impacted_asset_ids: [], impacted_service_ids: []})} 
                                  options={systemsList} 
                                  placeholder="Bind systems..." 
                               />
                             </div>
                             <div className="grid grid-cols-2 gap-4 h-[440px]">
                                <div className="bg-slate-950 rounded-lg p-4 border border-white/5 flex flex-col space-y-2 overflow-hidden">
                                   <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Assets</p>
                                      <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">{formData.impacted_asset_ids?.length || 0}</span>
                                   </div>
                                   <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                      {filteredAssets.map((a: any) => (
                                        <label key={a.id} className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${isEditing ? 'cursor-pointer' : 'cursor-default'} ${formData.impacted_asset_ids?.includes(a.id) ? 'bg-amber-600/10 border-amber-500/40 text-amber-400' : 'border-transparent hover:bg-white/5 text-slate-500'}`}>
                                           <input 
                                             type="checkbox" 
                                             disabled={!isEditing}
                                             checked={formData.impacted_asset_ids?.includes(a.id)} 
                                             onChange={e => {
                                               const ids = formData.impacted_asset_ids || []
                                               setFormData({...formData, impacted_asset_ids: e.target.checked ? [...ids, a.id] : ids.filter((i:number)=>i!==a.id), impacted_service_ids: []})
                                             }} 
                                             className="sr-only" 
                                           />
                                           <div className={`w-2 h-2 rounded-full border ${formData.impacted_asset_ids?.includes(a.id) ? 'bg-amber-500 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'border-white/20'}`} />
                                           <span className="text-[10px] font-black uppercase truncate">{a.name}</span>
                                        </label>
                                      ))}
                                   </div>
                                </div>
                                <div className="bg-slate-950 rounded-lg p-4 border border-white/5 flex flex-col space-y-2 overflow-hidden">
                                   <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Services</p>
                                      <span className="text-[8px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{formData.impacted_service_ids?.length || 0}</span>
                                   </div>
                                   <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                      {filteredServices.map((s: any) => (
                                        <label key={s.id} className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${isEditing ? 'cursor-pointer' : 'cursor-default'} ${formData.impacted_service_ids?.includes(s.id) ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-400' : 'border-transparent hover:bg-white/5 text-slate-500'}`}>
                                           <input 
                                             type="checkbox" 
                                             disabled={!isEditing}
                                             checked={formData.impacted_service_ids?.includes(s.id)} 
                                             onChange={e => {
                                               const ids = formData.impacted_service_ids || []
                                               setFormData({...formData, impacted_service_ids: e.target.checked ? [...ids, s.id] : ids.filter((i:number)=>i!==s.id)})
                                             }} 
                                             className="sr-only" 
                                           />
                                           <div className={`w-2 h-2 rounded-full border ${formData.impacted_service_ids?.includes(s.id) ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'border-white/20'}`} />
                                           <span className="text-[10px] font-black uppercase truncate">{s.name}</span>
                                        </label>
                                      ))}
                                   </div>
                                </div>
                             </div>
                          </div>
                       </SectionCard>
                       <SectionCard icon={LinkIcon} title="FAR Failure Mode Registry Mapping" color="text-purple-400">
                          <div className="h-44 bg-slate-950 rounded-lg p-4 border border-white/5 overflow-y-auto custom-scrollbar space-y-2">
                             {failureModes?.filter((fm:any) => (formData.target_systems || []).includes(fm.system_name)).map((fm: any) => (
                               <label key={fm.id} className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${isEditing ? 'cursor-pointer' : 'cursor-default'} ${formData.linked_failure_modes?.some((l:any)=>l.id === fm.id) ? 'bg-purple-600/10 border-purple-500/40' : 'border-white/5 hover:bg-white/5'}`}>
                                  <input 
                                    type="checkbox" 
                                    disabled={!isEditing}
                                    checked={formData.linked_failure_modes?.some((l:any)=>l.id === fm.id)} 
                                    onChange={e => {
                                      const modes = formData.linked_failure_modes || []
                                      setFormData({...formData, linked_failure_modes: e.target.checked ? [...modes, fm] : modes.filter((m:any)=>m.id!==fm.id)})
                                    }} 
                                    className="sr-only" 
                                  />
                                  <div className={`w-3 h-3 rounded border ${formData.linked_failure_modes?.some((l:any)=>l.id === fm.id) ? 'bg-purple-500 border-purple-500 shadow-lg shadow-purple-500/20' : 'border-white/10'}`} />
                                  <div className="flex-1 min-w-0">
                                     <p className="text-[10px] font-black uppercase text-slate-200 truncate">{fm.title}</p>
                                     <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em]">RPN {fm.rpn}</span>
                                        <span className="w-0.5 h-0.5 rounded-full bg-slate-700" />
                                        <span className="text-[7px] font-black uppercase text-rose-500">SEV {fm.severity}</span>
                                     </div>
                                  </div>
                               </label>
                             ))}
                             {(!formData.target_systems || formData.target_systems.length === 0) && (
                                <p className="text-[10px] font-bold text-slate-700 italic text-center py-10 uppercase tracking-widest">Select Target Systems First</p>
                             )}
                          </div>
                       </SectionCard>
                    </div>

                    <div className="col-span-12 lg:col-span-4 space-y-4">
                       <SectionCard icon={Camera} title="Evidence / Forensic Capture Hub" color="text-blue-400">
                          <div className="space-y-4">
                             <div className={`bg-black/40 border border-dashed border-white/10 rounded-lg p-6 text-center group hover:border-blue-500/30 transition-all ${!isEditing && 'opacity-50 grayscale pointer-events-none'}`}>
                                <Clipboard size={24} className="mx-auto text-slate-700 group-hover:text-blue-500 mb-3" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PASTE EVIDENCE IMAGES OR LOGS</p>
                             </div>
                             <div className="grid grid-cols-2 gap-4 h-[580px] overflow-y-auto custom-scrollbar pr-2">
                                {(formData.evidence_json || []).map((ev: any, i: number) => (
                                  <div key={i} className="group relative bg-slate-950 border border-white/10 rounded-lg overflow-hidden aspect-video shadow-2xl">
                                     {ev.type === 'image' ? (
                                       <img src={ev.content} className="w-full h-full object-cover" />
                                     ) : (
                                       <div className="p-4 text-[9px] font-mono text-slate-300 overflow-hidden leading-relaxed">{ev.content}</div>
                                     )}
                                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center space-x-2">
                                        <button onClick={() => window.open(ev.content, '_blank')} className="p-2 bg-blue-600 text-white rounded-md"><Eye size={14}/></button>
                                        <button 
                                          disabled={!isEditing}
                                          onClick={() => {
                                            const newEv = formData.evidence_json.filter((_:any, idx:number) => idx !== i)
                                            setFormData({...formData, evidence_json: newEv})
                                          }} 
                                          className="p-2 bg-rose-600 text-white rounded-md disabled:opacity-50"
                                        >
                                          <Trash2 size={14}/>
                                        </button>
                                     </div>
                                  </div>
                                ))}
                             </div>
                          </div>
                       </SectionCard>
                    </div>
                 </div>
               )}

               {activeTab === 'timeline' && (
                 <div className="flex flex-col gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-6 grid grid-cols-12 gap-4 items-end shadow-2xl">
                       <div className="col-span-12 lg:col-span-4">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Event Narrative</label>
                          <input value={newTimeline.description} onChange={e => setNewTimeline({...newTimeline, description: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-[12px] font-black text-white outline-none focus:border-purple-500/50 uppercase" placeholder="E.G. ALERT FIRED..." />
                       </div>
                       <div className="col-span-12 lg:col-span-2">
                         <StyledSelect label="Type" value={newTimeline.event_type} onChange={e => setNewTimeline({...newTimeline, event_type: e.target.value})} options={[{value:'Detection', label:'Detection'}, {value:'Observation', label:'Observation'}, {value:'Mitigation', label:'Mitigation'}, {value:'Resolution', label:'Resolution'}]} />
                       </div>
                       <div className="col-span-12 lg:col-span-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">POC / Team</label>
                          <div className="flex gap-2">
                             <input value={newTimeline.owner} onChange={e => setNewTimeline({...newTimeline, owner: e.target.value})} className="w-1/2 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-black text-white outline-none uppercase" placeholder="Name" />
                             <input value={newTimeline.owner_team} onChange={e => setNewTimeline({...newTimeline, owner_team: e.target.value})} className="w-1/2 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-black text-white outline-none uppercase" placeholder="Team" />
                          </div>
                       </div>
                       <div className="col-span-12 lg:col-span-3">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Event Time</label>
                          <input type="datetime-local" value={newTimeline.event_time.slice(0, 16)} onChange={e => setNewTimeline({...newTimeline, event_time: new Date(e.target.value).toISOString()})} className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-[11px] font-black text-slate-400 outline-none [color-scheme:dark]" />
                       </div>
                       <button onClick={() => {
                          const timeline = [...(formData.timeline || []), { ...newTimeline, id: Date.now() }]
                          setFormData({ ...formData, timeline })
                          setNewTimeline({ event_type: 'Observation', description: '', event_time: new Date().toISOString(), owner: '', owner_team: '' })
                        }} className="col-span-1 p-4 bg-purple-600 text-white rounded-lg shadow-xl shadow-purple-500/20 active:scale-95 transition-all"><Plus size={24} /></button>
                    </div>
                    
                    <div className="relative pl-12 space-y-4 max-w-5xl mx-auto py-4">
                       {/* Vertical Timeline Bar */}
                       <div className="absolute left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-600/50 via-blue-600/50 to-emerald-600/50 rounded-full" />
                       
                       {(formData.timeline || []).sort((a:any, b:any) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime()).map((e: any) => {
                         const typeColors: any = {
                            'Detection': 'bg-rose-500 shadow-rose-500/50',
                            'Observation': 'bg-blue-500 shadow-blue-500/50',
                            'Mitigation': 'bg-amber-500 shadow-amber-500/50',
                            'Resolution': 'bg-emerald-500 shadow-emerald-500/50'
                         }
                         return (
                           <div key={e.id} className="relative bg-white/5 border border-white/10 rounded-lg p-6 shadow-2xl group hover:bg-white/[0.08] transition-all">
                              {/* Connector Dot */}
                              <div className={`absolute -left-[30px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-slate-900 shadow-lg z-10 transition-transform group-hover:scale-125 ${typeColors[e.event_type] || 'bg-slate-500'}`} />
                              
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                 <div className="flex items-start gap-6">
                                    <div className="w-32 shrink-0">
                                       <p className="text-[11px] font-black text-white">{new Date(e.event_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                       <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${e.event_type === 'Detection' ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' : e.event_type === 'Resolution' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-blue-400 border-blue-500/30 bg-blue-500/10'}`}>{e.event_type}</span>
                                    </div>
                                    <div>
                                       <p className="text-base font-black text-white uppercase tracking-tight leading-none">{e.description}</p>
                                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 italic">{e.owner} // {e.owner_team}</p>
                                    </div>
                                 </div>
                                 <button onClick={() => setFormData({...formData, timeline: formData.timeline.filter((t:any)=>t.id!==e.id)})} className="opacity-0 group-hover:opacity-100 p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                              </div>
                           </div>
                         )
                       })}
                    </div>
                 </div>
               )}

               {activeTab === 'investigation' && (
                 <div className="space-y-4">
                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/5 w-fit shadow-lg">
                       <button onClick={() => setActiveSubTab('identification')} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'identification' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}>1. Discovery & Identification Flow</button>
                       <button onClick={() => setActiveSubTab('rca')} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'rca' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}>2. RCA Analytical Logic Ladder</button>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-lg overflow-hidden shadow-2xl">
                       <table className="w-full text-left border-collapse">
                          <thead>
                             <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-16 text-center">Step</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Forensic Observation & Discovery (Paste Images Here)</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-48">Owner / Team</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-20 text-center">Action</th>
                             </tr>
                          </thead>
                          <tbody>
                             {(activeSubTab === 'identification' ? formData.identification_steps_json : formData.rca_steps_json || []).map((step: any, idx: number) => (
                               <tr key={idx} className="border-b border-white/5 group hover:bg-white/[0.02] transition-all">
                                  <td className="px-6 py-4">
                                     <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black text-[11px] shadow-inner">{idx + 1}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="space-y-4">
                                        <textarea 
                                          readOnly={!isEditing}
                                          onPaste={(e) => handlePaste(e, activeSubTab as any, idx)} 
                                          value={step.text} 
                                          onChange={e => {
                                            const key = activeSubTab === 'identification' ? 'identification_steps_json' : 'rca_steps_json'
                                            const steps = [...(formData[key] || [])]
                                            steps[idx].text = e.target.value
                                            setFormData({ ...formData, [key]: steps })
                                          }} 
                                          className={`w-full bg-transparent border-none p-0 text-base font-bold text-slate-300 outline-none min-h-[60px] resize-none placeholder:text-slate-700 ${!isEditing && 'cursor-default'}`} 
                                          placeholder="Enter discovery details or paste evidence images..." 
                                        />
                                        <div className="flex flex-wrap gap-3">
                                           {step.images?.map((img: string, i: number) => (
                                             <div key={i} className="relative w-20 h-20 shrink-0 bg-slate-950 rounded-lg overflow-hidden border border-white/10 group/img shadow-xl">
                                                <img src={img} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center">
                                                   <button 
                                                     disabled={!isEditing}
                                                     onClick={() => {
                                                       const key = activeSubTab === 'identification' ? 'identification_steps_json' : 'rca_steps_json'
                                                       const steps = [...(formData[key] || [])]
                                                       steps[idx].images.splice(i, 1)
                                                       setFormData({ ...formData, [key]: steps })
                                                     }} 
                                                     className="p-1.5 bg-rose-600 text-white rounded-md shadow-lg disabled:opacity-50"
                                                   >
                                                     <Trash2 size={12}/>
                                                   </button>
                                                </div>
                                             </div>
                                           ))}
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 align-top">
                                     <div className="space-y-2">
                                        <input 
                                          readOnly={!isEditing}
                                          value={step.owner} 
                                          onChange={e => {
                                            const key = activeSubTab === 'identification' ? 'identification_steps_json' : 'rca_steps_json'
                                            const steps = [...(formData[key] || [])]; steps[idx].owner = e.target.value; setFormData({...formData, [key]: steps})
                                          }}
                                          placeholder="POC NAME..." 
                                          className="w-full bg-slate-950/50 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-white outline-none focus:border-purple-500/30" 
                                        />
                                        <input 
                                          readOnly={!isEditing}
                                          value={step.owner_team} 
                                          onChange={e => {
                                            const key = activeSubTab === 'identification' ? 'identification_steps_json' : 'rca_steps_json'
                                            const steps = [...(formData[key] || [])]; steps[idx].owner_team = e.target.value; setFormData({...formData, [key]: steps})
                                          }}
                                          placeholder="TEAM..." 
                                          className="w-full bg-slate-950/50 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-black uppercase text-white outline-none focus:border-purple-500/30" 
                                        />
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 text-center align-top">
                                     <button 
                                       disabled={!isEditing}
                                       onClick={() => {
                                         const key = activeSubTab === 'identification' ? 'identification_steps_json' : 'rca_steps_json'
                                         const steps = [...(formData[key] || [])]; steps.splice(idx, 1); setFormData({ ...formData, [key]: steps })
                                       }} 
                                       className="p-2.5 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg disabled:opacity-0"
                                     >
                                       <Trash2 size={16}/>
                                     </button>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                       <button 
                        disabled={!isEditing}
                        onClick={() => {
                          const key = activeSubTab === 'identification' ? 'identification_steps_json' : 'rca_steps_json'
                          const steps = [...(formData[key] || [])]
                          setFormData({ ...formData, [key]: [...steps, { text: '', images: [], owner: '', owner_team: '' }] })
                        }} 
                        className={`w-full p-6 border-t border-white/5 text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 hover:text-purple-400 hover:bg-purple-600/5 transition-all flex items-center justify-center gap-4 ${!isEditing && 'opacity-0 h-0 p-0 overflow-hidden'}`}>
                          <PlusCircle size={20} /> <span>Initialize Next Step in Flow</span>
                       </button>
                    </div>
                 </div>
               )}

               {activeTab === 'causes' && (
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {(formData.potential_causes_json || []).map((c: any, idx: number) => (
                      <div key={idx} className="bg-slate-950 border border-white/5 rounded-lg p-8 space-y-6 relative group shadow-2xl hover:border-purple-500/20 transition-all">
                         <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                               {['Likely', 'Confirmed', 'Disproven'].map(s => (
                                 <button key={s} disabled={!isEditing} onClick={() => {
                                   const causes = [...formData.potential_causes_json]; causes[idx].status = s; setFormData({...formData, potential_causes_json: causes})
                                 }} className={`px-6 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${c.status === s ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{s}</button>
                               ))}
                            </div>
                            <button disabled={!isEditing} onClick={() => {
                              const causes = [...formData.potential_causes_json]; causes.splice(idx, 1); setFormData({...formData, potential_causes_json: causes})
                            }} className="opacity-0 group-hover:opacity-100 p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all disabled:opacity-0"><Trash2 size={16}/></button>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Root Cause Narrative</label>
                            <textarea readOnly={!isEditing} value={c.cause} onChange={e => {
                               const causes = [...formData.potential_causes_json]; causes[idx].cause = e.target.value; setFormData({...formData, potential_causes_json: causes})
                            }} className={`w-full bg-slate-900 border border-white/5 rounded-lg p-4 text-base font-black text-white outline-none focus:border-indigo-500/50 min-h-[80px] resize-none ${!isEditing && 'cursor-default'}`} placeholder="Elaborate on the cause findings..." />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Forensic Signature / Indicator</label>
                            <textarea readOnly={!isEditing} value={c.indicator} onChange={e => {
                               const causes = [...formData.potential_causes_json]; causes[idx].indicator = e.target.value; setFormData({...formData, potential_causes_json: causes})
                            }} className={`w-full bg-slate-900 border border-white/5 rounded-lg p-4 text-[11px] font-mono font-bold text-amber-500 outline-none focus:border-amber-500/50 resize-none ${!isEditing && 'cursor-default'}`} placeholder="Paste the specific log line or metric trigger..." />
                         </div>
                         <div className={`flex items-center gap-4 bg-white/5 p-4 rounded-lg border border-white/5 ${!isEditing && 'opacity-80 pointer-events-none'}`}>
                            <div className="flex-1">
                               <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Link Recovery BKM</label>
                               <StyledSelect value={c.bkm_id} onChange={e => {
                                 const causes = [...formData.potential_causes_json]; causes[idx].bkm_id = e.target.value; setFormData({...formData, potential_causes_json: causes})
                               }} options={[]} placeholder="Select Knowledge Entry..." />
                            </div>
                            <button className="mt-4 p-3 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all"><Plus size={20}/></button>
                         </div>
                      </div>
                    ))}
                    <button disabled={!isEditing} onClick={() => setFormData({...formData, potential_causes_json: [...(formData.potential_causes_json || []), { cause: '', indicator: '', bkm_id: null, status: 'Under Review' }]})} className={`border-2 border-dashed border-white/5 rounded-lg p-12 text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 hover:text-purple-400 hover:bg-purple-600/5 transition-all flex flex-col items-center justify-center gap-6 shadow-2xl group ${!isEditing && 'opacity-0 h-0 p-0 overflow-hidden'}`}>
                       <PlusCircle size={48} className="text-slate-700 group-hover:text-purple-500 transition-all" /> 
                       <span>Register Potential Root Cause</span>
                    </button>
                 </div>
               )}

               {activeTab === 'mitigation' && (
                 <div className="space-y-4">
                    <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-lg p-8 flex items-center justify-between shadow-2xl">
                       <div className="flex items-center gap-8">
                          <div className="p-5 bg-emerald-600/20 rounded-lg text-emerald-400 border border-emerald-500/30 shadow-2xl shadow-emerald-500/20"><ShieldCheck size={40} /></div>
                          <div>
                             <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">Reliability Vector Synchronization</h3>
                             <p className="text-[11px] text-slate-500 uppercase tracking-widest font-black max-w-xl">Confirmed findings are mapped to the Failure Analysis Registry (FAR) to trigger permanent infrastructure hardening and prevention tasks.</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-4xl font-black text-white leading-none">{(formData.potential_causes_json?.filter((c:any)=>c.status === 'Confirmed').length || 0)}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Confirmed Findings</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                       {formData.potential_causes_json?.filter((c:any)=>c.status === 'Confirmed').map((c: any, cIdx: number) => (
                         <div key={cIdx} className="bg-white/5 border border-white/5 rounded-lg p-8 space-y-6 group hover:bg-white/[0.07] transition-all shadow-2xl">
                            <div className="flex items-start justify-between">
                               <div className="flex items-start gap-6">
                                  <div className="p-3 bg-emerald-600/20 rounded-lg text-emerald-400 border border-emerald-500/30 shadow-inner mt-1"><Zap size={24} /></div>
                                  <div className="max-w-3xl">
                                     <p className="text-lg font-black text-white uppercase tracking-tight leading-relaxed">{c.cause}</p>
                                     <div className="flex items-center gap-3 mt-4 bg-black/40 px-4 py-2 rounded-lg border border-white/5 w-fit">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Confirmed Signature:</span>
                                        <span className="text-[11px] font-mono font-black text-amber-500 uppercase truncate max-w-xl">{c.indicator || 'NO SIGNATURE DEFINED'}</span>
                                     </div>
                                  </div>
                               </div>
                               <button className="px-8 py-3 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-3">
                                  <RefreshCcw size={16} /> Sync Reliability Vector
                               </button>
                            </div>

                            <div className="pt-6 border-t border-white/5 space-y-4">
                               <div className="flex items-center justify-between px-2">
                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">N:N FAR Failure Mode Mapping</p>
                                  <span className="text-[9px] font-black text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 uppercase">Analytical Hook Active</span>
                               </div>
                               <div className="flex flex-wrap gap-3">
                                  {(formData.linked_failure_modes || []).map((fm: any) => (
                                    <button 
                                       key={fm.id}
                                       disabled={!isEditing}
                                       onClick={() => {
                                         const newCauses = (formData.potential_causes_json || []).map((cause: any) => {
                                            if (cause.cause === c.cause) {
                                               const linkedIds = cause.linked_fm_ids || []
                                               return { ...cause, linked_fm_ids: linkedIds.includes(fm.id) ? linkedIds.filter((id:number)=>id!==fm.id) : [...linkedIds, fm.id] }
                                            }
                                            return cause
                                         })
                                         setFormData({...formData, potential_causes_json: newCauses})
                                       }}
                                       className={`px-5 py-2.5 rounded-lg border text-[10px] font-black uppercase transition-all flex items-center gap-3 shadow-lg ${c.linked_fm_ids?.includes(fm.id) ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-950 border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/30'}`}
                                    >
                                       <Target size={14} className={c.linked_fm_ids?.includes(fm.id) ? 'text-white' : 'text-slate-700'} /> {fm.title}
                                    </button>
                                  ))}
                                  {(formData.linked_failure_modes || []).length === 0 && (
                                    <div className="flex-1 py-12 border-2 border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center gap-3">
                                       <Layers size={32} className="text-slate-800" />
                                       <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">No Failure Modes Bound. Register in Overview first.</p>
                                    </div>
                                  )}
                               </div>
                            </div>
                         </div>
                       ))}
                       {(!formData.potential_causes_json || formData.potential_causes_json.filter((c:any)=>c.status === 'Confirmed').length === 0) && (
                         <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-lg flex flex-col items-center gap-6 shadow-2xl">
                            <Zap size={64} className="text-slate-800" />
                            <div className="space-y-2">
                               <p className="text-lg font-black text-slate-700 uppercase tracking-[0.4em]">Strategic Analytical Deadlock</p>
                               <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest italic">Awaiting Confirmed Findings for Strategic FAR Mapping</p>
                            </div>
                         </div>
                       )}
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

const RcaIconBtn = ({ active, icon: Icon, onClick, label }: any) => (
  <button onClick={onClick} className={`p-3.5 rounded-2xl transition-all relative group shadow-lg ${active ? 'bg-purple-600 text-white shadow-purple-500/20 scale-110' : 'text-slate-500 hover:bg-white/10 hover:text-white'}`}>
    <Icon size={24} />
    <span className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all z-[300] pointer-events-none whitespace-nowrap shadow-2xl">
      {label}
    </span>
  </button>
)

function ResearchDetails({ item, onClose, onSave, setConfirmModal, fontSize, rowDensity }: any) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({ ...item })
  const [isEditing, setIsEditing] = useState(false)
  const [newLog, setNewLog] = useState({ entry_text: '', entry_type: 'Diagnosis', poc: '', timestamp: new Date().toISOString() })
  const [layoutMode, setLayoutMode] = useState(1)

  const logMutation = useMutation({
    mutationFn: async (log: any) => {
      const res = await apiFetch(`/api/v1/investigations/${item.id}/logs`, {
        method: 'POST',
        body: JSON.stringify(log)
      })
      return res.json()
    },
    onSuccess: (data) => {
      setFormData(prev => ({ ...prev, progress_logs: [data, ...(prev.progress_logs || [])] }))
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

  const renderLayout = () => {
    switch (layoutMode) {
      case 1: // Classic Suite (Original refinement)
        return (
          <div className="flex-1 flex overflow-hidden p-6 gap-6 animate-in fade-in duration-500">
            <div className="w-1/3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-4">
              <SectionCard icon={FileText} title="Investigation Problem Context" color="text-blue-400" className="flex flex-col">
                <textarea 
                  readOnly={!isEditing}
                  value={formData.problem_statement} 
                  onChange={e => setFormData({...formData, problem_statement: e.target.value})} 
                  className={`flex-1 w-full bg-slate-950 border border-white/5 rounded-lg p-4 text-base font-bold text-slate-300 outline-none min-h-[120px] resize-none ${!isEditing && 'cursor-default'}`} 
                />
              </SectionCard>
              <div className="grid grid-cols-2 gap-4">
                <SectionCard icon={Zap} title="Triggers" color="text-amber-400">
                   <textarea 
                     readOnly={!isEditing}
                     value={formData.trigger_event} 
                     onChange={e => setFormData({...formData, trigger_event: e.target.value})} 
                     className={`w-full bg-slate-950 border border-white/5 rounded-lg p-4 text-[11px] font-bold text-slate-300 outline-none min-h-[100px] resize-none ${!isEditing && 'cursor-default'}`} 
                     placeholder="What triggered this research?" 
                   />
                </SectionCard>
                <SectionCard icon={AlertTriangle} title="Identified Impact" color="text-rose-400">
                   <textarea 
                     readOnly={!isEditing}
                     value={formData.impact} 
                     onChange={e => setFormData({...formData, impact: e.target.value})} 
                     className={`w-full bg-slate-950 border border-white/5 rounded-lg p-4 text-[11px] font-bold text-slate-300 outline-none min-h-[100px] resize-none ${!isEditing && 'cursor-default'}`} 
                     placeholder="Business or System impact..." 
                   />
                </SectionCard>
              </div>
              <SectionCard icon={Search} title="Investigation Findings & Raw Intel" color="text-indigo-400">
                <textarea 
                  readOnly={!isEditing}
                  value={formData.root_cause} 
                  onChange={e => setFormData({...formData, root_cause: e.target.value})} 
                  className={`w-full bg-slate-950 border border-white/5 rounded-lg p-5 text-base font-bold text-slate-300 outline-none min-h-[180px] resize-none ${!isEditing && 'cursor-default'}`} 
                  placeholder="Document all analytical findings here..." 
                />
              </SectionCard>
              <SectionCard icon={ShieldCheck} title="Proposed Strategy / Resolution" color="text-emerald-400">
                <textarea 
                  readOnly={!isEditing}
                  value={formData.resolution_steps} 
                  onChange={e => setFormData({...formData, resolution_steps: e.target.value})} 
                  className={`w-full bg-slate-950 border border-white/5 rounded-lg p-5 text-base font-bold text-slate-200 outline-none min-h-[180px] resize-none ${!isEditing && 'cursor-default'}`} 
                  placeholder="Permanent strategy or fix steps..." 
                />
              </SectionCard>
            </div>
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              <IntelligenceInput newLog={newLog} setNewLog={setNewLog} logMutation={logMutation} />
              <IntelligenceStream logs={sortedLogs} />
            </div>
          </div>
        )
      case 2: // Dashboard Hub (Modular grid)
        return (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-3 gap-4">
               <div className="col-span-2 grid grid-cols-2 gap-4">
                  <SectionCard icon={FileText} title="Problem Context" color="text-blue-400" className="h-44">
                    <textarea 
                      readOnly={!isEditing}
                      value={formData.problem_statement} 
                      onChange={e => setFormData({...formData, problem_statement: e.target.value})} 
                      className={`w-full h-full bg-slate-950/50 border-none p-2 text-base font-bold text-slate-300 resize-none outline-none ${!isEditing && 'cursor-default'}`} 
                    />
                  </SectionCard>
                  <div className="grid grid-rows-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col justify-between">
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Triggers</span>
                       <input 
                         readOnly={!isEditing}
                         value={formData.trigger_event} 
                         onChange={e => setFormData({...formData, trigger_event: e.target.value})} 
                         className={`bg-transparent text-[12px] font-black text-amber-400 outline-none w-full ${!isEditing && 'cursor-default'}`} 
                       />
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col justify-between">
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Impact</span>
                       <input 
                         readOnly={!isEditing}
                         value={formData.impact} 
                         onChange={e => setFormData({...formData, impact: e.target.value})} 
                         className={`bg-transparent text-[12px] font-black text-rose-400 outline-none w-full ${!isEditing && 'cursor-default'}`} 
                       />
                    </div>
                  </div>
                  <SectionCard icon={Search} title="Analytical Findings" color="text-indigo-400" className="h-64">
                    <textarea 
                      readOnly={!isEditing}
                      value={formData.root_cause} 
                      onChange={e => setFormData({...formData, root_cause: e.target.value})} 
                      className={`w-full h-full bg-slate-950/50 border-none p-2 text-base font-bold text-slate-300 resize-none outline-none ${!isEditing && 'cursor-default'}`} 
                    />
                  </SectionCard>
                  <SectionCard icon={ShieldCheck} title="Proposed Resolution" color="text-emerald-400" className="h-64">
                    <textarea 
                      readOnly={!isEditing}
                      value={formData.resolution_steps} 
                      onChange={e => setFormData({...formData, resolution_steps: e.target.value})} 
                      className={`w-full h-full bg-slate-950/50 border-none p-2 text-base font-bold text-slate-200 resize-none outline-none ${!isEditing && 'cursor-default'}`} 
                    />
                  </SectionCard>
               </div>
               <div className="flex flex-col gap-4">
                  <IntelligenceInput newLog={newLog} setNewLog={setNewLog} logMutation={logMutation} compact />
                  <div className="flex-1 min-h-[400px]">
                    <IntelligenceStream logs={sortedLogs} compact />
                  </div>
               </div>
            </div>
          </div>
        )
      case 3: // Intel Stream Focused
        return (
          <div className="flex-1 flex overflow-hidden p-6 gap-6 animate-in slide-in-from-left-4 duration-500">
             <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <IntelligenceStream logs={sortedLogs} wide />
                <IntelligenceInput newLog={newLog} setNewLog={setNewLog} logMutation={logMutation} />
             </div>
             <div className="w-80 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
                <SectionCard icon={FileText} title="Context" color="text-blue-400">
                   <textarea 
                     readOnly={!isEditing}
                     value={formData.problem_statement} 
                     onChange={e => setFormData({...formData, problem_statement: e.target.value})} 
                     className={`w-full bg-transparent border-none text-[12px] text-slate-400 font-bold leading-relaxed resize-none h-48 outline-none ${!isEditing && 'cursor-default'}`} 
                   />
                </SectionCard>
                <SectionCard icon={Zap} title="Triggers" color="text-amber-400">
                   <input 
                     readOnly={!isEditing}
                     value={formData.trigger_event} 
                     onChange={e => setFormData({...formData, trigger_event: e.target.value})} 
                     className={`w-full bg-transparent border-none text-[11px] text-slate-400 font-bold outline-none ${!isEditing && 'cursor-default'}`} 
                   />
                </SectionCard>
                <SectionCard icon={Search} title="Core Findings" color="text-indigo-400">
                   <textarea 
                     readOnly={!isEditing}
                     value={formData.root_cause} 
                     onChange={e => setFormData({...formData, root_cause: e.target.value})} 
                     className={`w-full bg-transparent border-none text-[12px] text-slate-400 font-bold leading-relaxed resize-none h-48 outline-none ${!isEditing && 'cursor-default'}`} 
                   />
                </SectionCard>
                <SectionCard icon={ShieldCheck} title="Resolution" color="text-emerald-400">
                   <textarea 
                     readOnly={!isEditing}
                     value={formData.resolution_steps} 
                     onChange={e => setFormData({...formData, resolution_steps: e.target.value})} 
                     className={`w-full bg-transparent border-none text-[13px] text-slate-300 font-black uppercase tracking-tight resize-none h-48 outline-none ${!isEditing && 'cursor-default'}`} 
                   />
                </SectionCard>
             </div>
          </div>
        )
      case 4: // Forensic Workbench (Side-by-side wide)
        return (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 animate-in zoom-in-95 duration-500">
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] px-2 flex items-center gap-3"><FileText size={14}/> Problem Narrative</h3>
                      <textarea 
                        readOnly={!isEditing}
                        value={formData.problem_statement} 
                        onChange={e => setFormData({...formData, problem_statement: e.target.value})} 
                        className={`w-full bg-white/5 border border-white/5 rounded-lg p-6 text-base font-bold text-slate-300 outline-none min-h-[200px] resize-none shadow-2xl focus:border-blue-500/30 transition-all ${!isEditing && 'cursor-default'}`} 
                      />
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] px-2 flex items-center gap-3"><Search size={14}/> Forensic Analysis</h3>
                      <textarea 
                        readOnly={!isEditing}
                        value={formData.root_cause} 
                        onChange={e => setFormData({...formData, root_cause: e.target.value})} 
                        className={`w-full bg-white/5 border border-white/5 rounded-lg p-6 text-base font-bold text-slate-300 outline-none min-h-[200px] resize-none shadow-2xl focus:border-indigo-500/30 transition-all ${!isEditing && 'cursor-default'}`} 
                      />
                   </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                   <SectionCard icon={ShieldCheck} title="Strategy" color="text-emerald-400">
                      <textarea 
                        readOnly={!isEditing}
                        value={formData.resolution_steps} 
                        onChange={e => setFormData({...formData, resolution_steps: e.target.value})} 
                        className={`w-full bg-slate-950 border-none p-2 text-[12px] font-bold text-white resize-none outline-none min-h-[150px] ${!isEditing && 'cursor-default'}`} 
                      />
                   </SectionCard>
                   <div className="col-span-2 flex flex-col gap-4">
                      <IntelligenceInput newLog={newLog} setNewLog={setNewLog} logMutation={logMutation} compact />
                      <div className="h-64 IntelligenceStream-container">
                        <IntelligenceStream logs={sortedLogs} compact />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )
      case 5: // Minimalist Zen (Apple-like)
        return (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-12 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
             <div className="space-y-6">
                <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase border-b-2 border-white/5 pb-4">Executive Context</h2>
                <textarea 
                  readOnly={!isEditing}
                  value={formData.problem_statement} 
                  onChange={e => setFormData({...formData, problem_statement: e.target.value})} 
                  className={`w-full bg-transparent border-none text-2xl font-medium text-slate-400 leading-relaxed tracking-tight resize-none h-48 outline-none ${!isEditing && 'cursor-default'}`} 
                />
             </div>
             
             <div className="grid grid-cols-2 gap-16">
                <div className="space-y-8">
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Findings</h4>
                      <textarea 
                        readOnly={!isEditing}
                        value={formData.root_cause} 
                        onChange={e => setFormData({...formData, root_cause: e.target.value})} 
                        className={`w-full bg-transparent border-none text-slate-200 font-bold leading-relaxed resize-none h-48 outline-none ${!isEditing && 'cursor-default'}`} 
                        placeholder="Intelligence gathering in progress..." 
                      />
                   </div>
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resolution Path</h4>
                      <textarea 
                        readOnly={!isEditing}
                        value={formData.resolution_steps} 
                        onChange={e => setFormData({...formData, resolution_steps: e.target.value})} 
                        className={`w-full bg-transparent border-none text-emerald-400 font-black uppercase tracking-tight text-xl leading-tight resize-none h-48 outline-none ${!isEditing && 'cursor-default'}`} 
                        placeholder="Awaiting structural resolution strategy." 
                      />
                   </div>
                </div>
                <div className="space-y-8">
                   <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Pulse History (Chronological)</h4>
                   <div className="space-y-8 relative pl-6">
                      <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10" />
                      {sortedLogs.slice(0,5).map((l:any, i:number) => (
                        <div key={i} className="relative">
                           <div className="absolute -left-[27px] top-1.5 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,241,0.5)]" />
                           <p className="text-[12px] font-black text-white uppercase tracking-tight leading-tight">{l.entry_text}</p>
                           <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold">{new Date(l.timestamp).toLocaleString()}</p>
                        </div>
                      ))}
                   </div>
                   <IntelligenceInput newLog={newLog} setNewLog={setNewLog} logMutation={logMutation} compact />
                </div>
             </div>
          </div>
        )
      default: return null
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-[1500px] h-full rounded-lg border border-blue-500/20 overflow-hidden flex flex-col shadow-[0_0_100px_rgba(37,99,235,0.1)]">
        
        <div className="px-8 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="p-3 bg-blue-600/20 rounded-lg text-blue-400 border border-blue-500/30 shadow-inner"><Search size={28} /></div>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">RESEARCH // INTEL NODE: {formData.id}</span>
                <StatusPill value={formData.status} />
                <span className="text-[9px] font-black text-blue-400 uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">RISK: {formData.priority}</span>
              </div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">{formData.title}</h1>
            </div>
            
            <div className="flex ml-8 bg-black/40 p-1 rounded-lg border border-white/5">
               {[1,2,3,4,5].map(num => (
                 <button 
                   key={num} 
                   onClick={() => setLayoutMode(num)}
                   className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${layoutMode === num ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}
                 >
                   V{num}
                 </button>
               ))}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isEditing ? 'bg-amber-600 text-white shadow-amber-500/20' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'}`}
            >
              {isEditing ? <Check size={14}/> : <Edit2 size={14}/>} {isEditing ? 'Lock Changes' : 'Edit Intelligence'}
            </button>
            <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"><Save size={14}/> Sync Intelligence</button>
            <button onClick={onClose} className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={24}/></button>
          </div>
        </div>

        {renderLayout()}
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
            <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-blue-500/20 rounded-full" />
            
            {logs.map((l: any, i: number) => (
              <div key={i} className={`relative bg-white/5 border border-white/5 ${compact ? 'rounded-lg p-3' : 'rounded-lg p-5'} group hover:bg-white/[0.08] transition-all shadow-lg`}>
                 <div className="absolute -left-[32px] top-6 w-3 h-3 rounded-full bg-slate-900 border-2 border-blue-500 shadow-[0_0_8px_rgba(59,130,241,0.5)]" />
                 
                 <div className={`flex ${compact ? 'gap-4' : 'gap-8'}`}>
                    <div className={`${compact ? 'w-24' : 'w-32'} shrink-0 pt-0.5`}>
                       <p className="text-[11px] font-black text-white leading-none mb-1.5">{new Date(l.timestamp).toLocaleString([], {hour: '2-digit', minute:'2-digit'})}</p>
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">{new Date(l.timestamp).toLocaleDateString()}</p>
                       <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner">{l.entry_type}</span>
                    </div>
                    <div className="flex-1">
                       <p className={`${compact ? 'text-[11px]' : 'text-[12px]'} font-black text-slate-200 leading-relaxed uppercase tracking-tight`}>{l.entry_text}</p>
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
