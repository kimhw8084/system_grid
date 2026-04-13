import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ListTodo, History, ShieldAlert, Globe, 
  Zap, Save, X, PlusCircle, User, MessageSquare,
  MoreVertical, RefreshCcw, TrendingUp, AlertTriangle,
  Lightbulb, ShieldCheck, Calendar, Activity, Database, Server,
  FileText, Clipboard, Terminal, ArrowRight, Shield, Download, Share2,
  Clock, CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye, Camera, Link as LinkIcon, Layers, Settings
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { AgGridReact } from 'ag-grid-react'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'
import { StatusPill } from './shared/StatusPill'

// --- Components ---

const CompactSummary = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-inner">
    <div>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xl font-black text-white tracking-tighter">{value}</p>
    </div>
    <div className={`p-2 rounded-lg bg-white/5 ${color}`}><Icon size={18} /></div>
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
  const [activeRcaModal, setActiveRcaModal] = useState<any>(null)
  const [activeRcaDetails, setActiveRcaDetails] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

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
      const url = data.id ? `/api/v1/investigations/${data.id}` : '/api/v1/investigations/'
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['investigations'] })
      toast.success('Research Synchronized')
      setActiveModal(null)
    }
  })

  const rcaMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/rca/${data.id}` : '/api/v1/rca/'
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rca-records'] })
      toast.success('RCA Matrix Synchronized')
      setActiveRcaModal(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/investigations/${id}`, { method: 'DELETE' }),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['investigations'] })
      toast.success('Research Purged')
    }
  })

  const rcaDeleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/rca/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rca-records'] })
      toast.success('RCA Record Purged')
    }
  })

  const combinedData = useMemo(() => {
    const invs = (investigations || []).map((i: any) => ({ ...i, type: 'Investigation' }))
    const rcas = (rcaRecords || []).map((r: any) => ({ ...r, type: 'RCA', category: 'RCA' }))
    return [...invs, ...rcas].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [investigations, rcaRecords])

  const stats = useMemo(() => {
    return {
      total: combinedData.length,
      analyzing: combinedData.filter((i: any) => i.status === 'Analyzing' || i.status === 'Open' || i.status === 'Investigation').length,
      troubleshooting: combinedData.filter((i: any) => i.category === 'Troubleshooting' || i.category === 'RCA').length,
      urgent: combinedData.filter((i: any) => i.priority === 'Urgent' || i.severity === 'P1').length
    }
  }, [combinedData])

  useEffect(() => {
    if (gridRef.current?.api) {
      setTimeout(() => gridRef.current.api.autoSizeAllColumns(), 100)
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
      width: 70,
      minWidth: 70,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
    },
    { 
      field: "category", 
      headerName: "Category", 
      width: 110, 
      filter: true, 
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = {
          'Troubleshooting': 'text-amber-500',
          'Security': 'text-rose-500',
          'RCA': 'text-purple-400',
          'General': 'text-blue-400'
        }
        return <span style={{ fontSize: `${fontSize}px` }} className={`font-bold uppercase tracking-widest ${colors[p.value] || 'text-slate-500'}`}>{p.value || 'N/A'}</span>
      },
      hide: hiddenColumns.includes("category")
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
      cellRenderer: (p: any) => {
        const colors: any = {
          Active: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/20',
          Analyzing: 'text-amber-400 border-amber-500/40 bg-amber-500/20',
          Open: 'text-rose-400 border-rose-500/40 bg-rose-500/20',
          Closed: 'text-slate-400 border-white/20 bg-white/10',
          Resolved: 'text-blue-400 border-blue-500/40 bg-blue-500/20'
        }
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className={`flex items-center justify-center w-24 h-5 rounded-md border shadow-sm ${colors[p.value] || 'text-slate-400 border-white/10 bg-white/5'}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold uppercase tracking-tighter leading-none">
                {p.value || 'Unknown'}
              </span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("status")
    },
    { 
      field: "severity", 
      headerName: "Risk", 
      width: 100, 
      filter: true, 
      valueGetter: (p: any) => p.data.severity || p.data.priority, 
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const isHigh = p.value === 'Urgent' || p.value === 'P1' || p.value === 'High' || p.value === 'P2'
        const isCritical = p.value === 'Urgent' || p.value === 'P1'
        const colorClass = isCritical ? 'text-rose-500 border-rose-500/40 bg-rose-500/20 animate-pulse' : isHigh ? 'text-amber-500 border-amber-500/40 bg-amber-500/20' : 'text-blue-400 border-blue-500/40 bg-blue-500/20'
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className={`flex items-center justify-center w-20 h-5 rounded-md border shadow-sm ${colorClass}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold uppercase tracking-tighter leading-none">
                {p.value || 'N/A'}
              </span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("severity")
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
               <button onClick={() => p.data.type === 'RCA' ? setActiveRcaDetails(p.data) : setActiveDetails(p.data)} title="Inspect Record" className="p-1.5 text-blue-400 hover:text-blue-200 transition-all border-r border-white/5"><Eye size={14}/></button>
               <button onClick={() => p.data.type === 'RCA' ? setActiveRcaModal(p.data) : setActiveModal(p.data)} title="Edit Record" className="p-1.5 text-emerald-400 hover:text-emerald-200 transition-all border-r border-white/5"><Edit2 size={14}/></button>
               <button onClick={() => setConfirmModal({ 
                 isOpen: true, 
                 title: p.data.type === 'RCA' ? 'Purge RCA' : 'Purge Research', 
                 message: 'Permanently remove this record?', 
                 onConfirm: () => p.data.type === 'RCA' ? rcaDeleteMutation.mutate(p.data.id) : deleteMutation.mutate(p.data.id) 
               })} title="Purge Record" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      ),
      suppressHide: true
    }
  ], [setActiveRcaDetails, setActiveDetails, setActiveRcaModal, setActiveModal, setConfirmModal, rcaDeleteMutation, deleteMutation, fontSize, hiddenColumns]) as any

  const autoSizeStrategy = useMemo(() => ({
    type: 'fitCellContents' as const
  }), []);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic flex items-center gap-2 text-white">
                <Shield size={24} className="text-blue-500" /> Research Matrix
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">Deep Forensics & Scientific Troubleshooting</p>
           </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SCAN RESEARCH..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>

          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5 space-x-1">
             <button 
                onClick={() => setShowStyleLab(!showStyleLab)} 
                className={`p-1.5 hover:bg-white/10 ${showStyleLab ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`}
                title="Toggle Style Lab"
             >
                <Activity size={16} />
             </button>
             <button onClick={() => setShowColumnPicker(!showColumnPicker)} className={`p-1.5 hover:bg-white/10 ${showColumnPicker ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Column Picker">
                <Sliders size={16} />
             </button>
             <button onClick={handleExportCSV} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-emerald-400 rounded-lg transition-all" title="Export CSV">
                <FileText size={16} />
             </button>
             <button onClick={handleCopyToClipboard} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Copy to Clipboard">
                <Clipboard size={16} />
             </button>
             <button onClick={() => setShowConfig(true)} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Research Config">
                <Settings size={16} />
             </button>
          </div>

          <div className="flex gap-2">
             <button onClick={() => setActiveRcaModal({ title: '', status: 'Open', target_system: '', impacted_asset_ids: [], severity_logic: { flow_halted: false, scrap_risk: false, quality_impact: false, global_outage: false } })} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center gap-2"><ShieldAlert size={14}/> New RCA</button>
             <button onClick={() => setActiveModal({ title: '', category: 'General', status: 'Analyzing', priority: 'Medium', systems: [], impacted_device_ids: [] })} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ Add Research</button>
          </div>
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
      <div className="grid grid-cols-4 gap-3">
        <CompactSummary label="Total Research" value={stats.total} icon={Activity} color="text-blue-400" />
        <CompactSummary label="Under Analysis" value={stats.analyzing} icon={Terminal} color="text-indigo-400" />
        <CompactSummary label="Deep Troubleshooting" value={stats.troubleshooting} icon={AlertTriangle} color="text-amber-500" />
        <CompactSummary label="Critical Alerts" value={stats.urgent} icon={ShieldAlert} color="text-rose-500" />
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative border-white/5">
        {(isLoading || rcaLoading) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4 text-blue-400">
             <RefreshCcw size={32} className="animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing Research Matrix...</p>
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
          autoSizeStrategy={autoSizeStrategy}
        />

        <AnimatePresence>
          {showColumnPicker && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-0 right-0 bottom-0 w-64 bg-slate-950/90 backdrop-blur-xl border-l border-white/10 z-[60] flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center space-x-2">
                  <Sliders size={14} /> <span>Toggle Columns</span>
                </h3>
                <button onClick={() => setShowColumnPicker(false)} className="text-slate-500 hover:text-white"><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                {columnDefs.filter((c: any) => c.field && !c.suppressHide).map((col: any) => (
                  <label key={col.field} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-all">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.includes(col.field)}
                        onChange={() => {
                          if (hiddenColumns.includes(col.field)) {
                            setHiddenColumns(hiddenColumns.filter(f => f !== col.field))
                          } else {
                            setHiddenColumns([...hiddenColumns, col.field])
                          }
                        }}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border transition-all ${!hiddenColumns.includes(col.field) ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'border-white/10 bg-black/40 group-hover:border-white/20'}`}>
                         {!hiddenColumns.includes(col.field) && <Check size={12} className="text-white mx-auto" />}
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${!hiddenColumns.includes(col.field) ? 'text-slate-200' : 'text-slate-500'}`}>{col.headerName || col.field}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfigRegistryModal 
        isOpen={showConfig} 
        onClose={() => setShowConfig(false)} 
        title="Research Matrix Config"
        sections={[
            { title: "Research Categories", category: "InvestigationCategory", icon: Layers },
            { title: "Status Lifecycle", category: "Status", icon: RefreshCcw }
        ]}
      />

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
      <div className="grid grid-cols-4 gap-3">
        <CompactSummary label="Total Research" value={stats.total} icon={Activity} color="text-blue-400" />
        <CompactSummary label="Under Analysis" value={stats.analyzing} icon={Terminal} color="text-indigo-400" />
        <CompactSummary label="Deep Troubleshooting" value={stats.troubleshooting} icon={AlertTriangle} color="text-amber-500" />
        <CompactSummary label="Critical Alerts" value={stats.urgent} icon={ShieldAlert} color="text-rose-500" />
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative border-white/5">
        {(isLoading || rcaLoading) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4 text-blue-400">
             <RefreshCcw size={32} className="animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing Research Matrix...</p>
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
          autoSizeStrategy={autoSizeStrategy}
        />
      </div>

      <AnimatePresence>
        {activeModal && (
          <ResearchForm 
            item={activeModal} 
            options={options} 
            devices={devices} 
            onClose={() => setActiveModal(null)} 
            onSave={(d: any) => mutation.mutate(d)}
            isSaving={mutation.isPending}
          />
        )}
        {activeDetails && (
          <ResearchDetails 
            item={activeDetails} 
            onClose={() => setActiveDetails(null)} 
            onSave={(d: any) => mutation.mutate(d)}
            setConfirmModal={setConfirmModal}
          />
        )}
        {activeRcaModal && (
          <RcaForm 
            item={activeRcaModal} 
            options={options} 
            devices={devices} 
            onClose={() => setActiveRcaModal(null)} 
            onSave={(d: any) => rcaMutation.mutate(d)}
            isSaving={rcaMutation.isPending}
          />
        )}
        {activeRcaDetails && (
          <RcaDetails 
            item={activeRcaDetails} 
            devices={devices}
            onClose={() => setActiveRcaDetails(null)} 
            onSave={(d: any) => rcaMutation.mutate(d)}
          />
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
        onConfirm={confirmModal.onConfirm} 
        title={confirmModal.title} 
        message={confirmModal.message} 
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
            font-weight: 700 !important;
        }
        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.2) !important; }
      `}</style>
    </div>
  )
}

function ResearchForm({ item, options, devices, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ 
    category: 'General',
    status: 'Analyzing',
    priority: 'Medium',
    systems: [],
    impacted_device_ids: [],
    ...item 
  })

  const categories = ['General', 'Troubleshooting', 'Security', 'Maintenance', 'Capacity']

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-xl p-6 rounded-3xl border border-blue-500/30 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-xl font-black uppercase text-blue-400 flex items-center gap-2 tracking-tighter">
            <PlusCircle size={20} /> Initialize Research
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Research Title</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value.toUpperCase()})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-blue-500 text-white font-bold" placeholder="E.G. CLUSTER LATENCY ANALYSIS" />
          </div>

          <StyledSelect label="Category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} options={categories.map(c => ({value: c, label: c}))} />
          <StyledSelect label="Priority" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} options={[{value:'Urgent', label:'Urgent'}, {value:'High', label:'High'}, {value:'Medium', label:'Medium'}, {value:'Low', label:'Low'}]} />
          
          <div className="col-span-2">
            <StyledSelect label="Assigned Team" value={formData.assigned_team} onChange={e => setFormData({...formData, assigned_team: e.target.value})} options={[{value:'SRE', label:'SRE'}, {value:'Network', label:'Network'}, {value:'DBA', label:'Database'}, {value:'AppDev', label:'App Dev'}]} />
          </div>

          <div className="col-span-2">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Preliminary Problem Statement</label>
            <textarea value={formData.problem_statement} onChange={e => setFormData({...formData, problem_statement: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-blue-500 text-slate-300 min-h-[60px]" placeholder="Briefly describe the issue..." />
          </div>

          {formData.category === 'Troubleshooting' && (
            <div className="col-span-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest block mb-1">Initial Impact Assessment</label>
              <textarea value={formData.impact} onChange={e => setFormData({...formData, impact: e.target.value})} className="w-full bg-slate-900/50 border border-white/5 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-blue-500 text-slate-300 min-h-[40px]" placeholder="What is currently affected?" />
            </div>
          )}
        </div>

        <div className="flex space-x-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
          <button onClick={() => onSave(formData)} className="flex-[2] py-2 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 tracking-widest">
            {isSaving ? <RefreshCcw size={12} className="animate-spin" /> : <Zap size={12} />} 
            Launch {formData.category} Tracker
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function ResearchDetails({ item, onClose, onSave, setConfirmModal }: any) {
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
      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
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
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{formData.category} // ID: RES_{formData.id}</span>
                <StatusPill value={formData.status} />
              </div>
              <h1 className="text-xl font-black uppercase italic tracking-tighter text-white leading-none">{formData.title}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => onSave(formData)} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2"><Save size={12}/> Sync State</button>
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
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Record Activity / Observation</label>
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
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">POC</label>
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
                      <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-blue-500 pl-3">Initial Problem Statement</h3>
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs text-slate-300 italic">
                         {formData.problem_statement}
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="max-w-xl space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-white/20 pl-3">Research Parameters</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <StyledSelect label="Current Phase" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={[{value:'Analyzing', label:'Analyzing'}, {value:'Escalated', label:'Escalated'}, {value:'Monitoring', label:'Monitoring'}, {value:'Resolved', label:'Resolved'}, {value:'Closed', label:'Closed'}]} />
                    <StyledSelect label="Priority Rating" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} options={[{value:'Urgent', label:'Urgent'}, {value:'High', label:'High'}, {value:'Medium', label:'Medium'}, {value:'Low', label:'Low'}]} />
                  </div>
                  <div className="pt-6 border-t border-white/5">
                    <button onClick={() => setConfirmModal({ isOpen: true, title: 'Archive Research', message: 'Move this investigation to history?', onConfirm: () => { /* archive logic */ } })} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Archive Record</button>
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
    const s = new Set<string>()
    options?.filter((o: any) => o.category === 'LogicalSystem').forEach((o: any) => s.add(o.value))
    return Array.from(s)
  }, [options])

  const availableAssets = useMemo(() => {
    if (!formData.target_system) return []
    return devices?.filter((d: any) => d.system === formData.target_system) || []
  }, [formData.target_system, devices])

  // Severity Logic
  const calculateSeverity = (logic: any) => {
    if (logic.global_outage) return 'P1'
    if (logic.flow_halted && logic.scrap_risk) return 'P1'
    if (logic.flow_halted || logic.scrap_risk) return 'P2'
    if (logic.quality_impact) return 'P3'
    return 'P4'
  }

  useEffect(() => {
    const sev = calculateSeverity(formData.severity_logic)
    if (sev !== formData.severity) {
      setFormData(prev => ({ ...prev, severity: sev }))
    }
  }, [formData.severity_logic])

  const toggleLogic = (key: string) => {
    setFormData(prev => ({
      ...prev,
      severity_logic: { ...prev.severity_logic, [key]: !prev.severity_logic[key] }
    }))
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-2xl p-8 rounded-[32px] border border-purple-500/30 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-2xl font-black uppercase text-purple-400 flex items-center gap-3 tracking-tighter">
            <ShieldAlert size={24} /> New Incident RCA
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Incident Title</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-purple-500 text-white font-bold shadow-inner" placeholder="E.G. FAB-2 LINE BLOCKAGE: SENSOR FAILURE" />
          </div>

          <StyledSelect 
            label="Target System (Cascading)" 
            value={formData.target_system} 
            onChange={e => setFormData({...formData, target_system: e.target.value, impacted_asset_ids: []})} 
            options={systems.map(s => ({value: s, label: s}))}
            placeholder="Select System first..."
          />

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase block tracking-widest px-1">Target Assets</label>
            <div className={`h-11 bg-slate-950 border border-white/10 rounded-xl flex items-center px-4 overflow-hidden ${!formData.target_system ? 'opacity-50 cursor-not-allowed' : ''}`}>
               <select 
                disabled={!formData.target_system}
                multiple
                value={formData.impacted_asset_ids}
                onChange={e => {
                  const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                  setFormData({...formData, impacted_asset_ids: values})
                }}
                className="w-full bg-transparent text-[10px] font-bold text-slate-300 outline-none h-full"
               >
                 {availableAssets.map((a: any) => (
                   <option key={a.id} value={a.id}>{a.name}</option>
                 ))}
               </select>
            </div>
            {formData.target_system && (
              <p className="text-[8px] text-slate-600 mt-1 uppercase italic px-1">Hold Ctrl/Cmd to multi-select</p>
            )}
          </div>

          <div className="col-span-2 space-y-3">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block px-1">Severity Auto-Calculator (FAB Operational Flow)</label>
             <div className="grid grid-cols-2 gap-3">
                <SeverityToggle label="Process Flow Halted?" active={formData.severity_logic.flow_halted} onClick={() => toggleLogic('flow_halted')} />
                <SeverityToggle label="Scrap Risk?" active={formData.severity_logic.scrap_risk} onClick={() => toggleLogic('scrap_risk')} />
                <SeverityToggle label="Quality Impact?" active={formData.severity_logic.quality_impact} onClick={() => toggleLogic('quality_impact')} />
                <SeverityToggle label="Global Outage?" active={formData.severity_logic.global_outage} onClick={() => toggleLogic('global_outage')} />
             </div>
             <div className="mt-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Calculated Severity Level</p>
                  <p className="text-[8px] text-slate-500 uppercase">Based on operational impact questionnaire</p>
                </div>
                <div className={`text-3xl font-black px-6 py-2 rounded-xl border-2 ${
                  formData.severity === 'P1' ? 'bg-rose-500/20 border-rose-500 text-rose-500' :
                  formData.severity === 'P2' ? 'bg-amber-500/20 border-amber-500 text-amber-500' :
                  'bg-blue-500/20 border-blue-500 text-blue-400'
                }`}>
                  {formData.severity}
                </div>
             </div>
          </div>

          <div className="col-span-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Initial Symptoms</label>
            <textarea value={formData.initial_symptoms} onChange={e => setFormData({...formData, initial_symptoms: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-purple-500 text-slate-300 min-h-[80px]" placeholder="Describe what was observed at time of failure..." />
          </div>
        </div>

        <div className="flex space-x-4 pt-4">
          <button onClick={onClose} className="flex-1 py-4 text-[11px] font-black uppercase text-slate-500 hover:text-white transition-colors">Abort</button>
          <button onClick={() => onSave(formData)} className="flex-[2] py-4 bg-purple-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 tracking-widest">
            {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <ShieldAlert size={16} />} 
            Initialize RCA Flow
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function SeverityToggle({ label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${active ? 'bg-purple-500/20 border-purple-500 text-purple-400 font-bold' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}>
      <span className="text-[9px] uppercase tracking-wider">{label}</span>
      {active ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-white/20" />}
    </button>
  )
}

function RcaDetails({ item, devices, onClose, onSave }: any) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({ ...item })
  const [activeTab, setActiveTab] = useState('investigation')
  const [newTimeline, setNewTimeline] = useState({ event_type: 'Observation', description: '', event_time: new Date().toISOString() })
  const [newMitigation, setNewMitigation] = useState({ type: 'Mitigation', action_description: '', status: 'Planned' })
  
  const timelineMutation = useMutation({
    mutationFn: async (data: any) => (await apiFetch(`/api/v1/rca/${item.id}/timeline`, { method: 'POST', body: JSON.stringify(data) })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rca-records'] })
      setNewTimeline({ event_type: 'Observation', description: '', event_time: new Date().toISOString() })
      toast.success('Timeline Event Appended')
    }
  })

  const mitigationMutation = useMutation({
    mutationFn: async (data: any) => (await apiFetch(`/api/v1/rca/${item.id}/mitigations`, { method: 'POST', body: JSON.stringify(data) })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rca-records'] })
      setNewMitigation({ type: 'Mitigation', action_description: '', status: 'Planned' })
      toast.success('Mitigation Plan Updated')
    }
  })

  // Clipboard Image Hook
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (event: any) => {
            const base64 = event.target.result
            const newEvidence = [...(formData.evidence_json || []), { type: 'image', content: base64, timestamp: new Date().toISOString() }]
            setFormData({ ...formData, evidence_json: newEvidence })
            toast.success('Image Captured from Clipboard')
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-8" onPaste={handlePaste}>
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-7xl h-[92vh] rounded-[40px] border border-purple-500/20 overflow-hidden flex flex-col shadow-2xl">
        
        {/* RCA Header */}
        <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-purple-600/20 rounded-2xl text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10"><ShieldAlert size={28} /></div>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-[9px] font-black text-purple-400 uppercase tracking-widest">RCA_{item.id}</span>
                <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${
                  formData.severity === 'P1' ? 'bg-rose-500/20 border-rose-500 text-rose-500' : 'bg-slate-500/20 border-white/10 text-slate-400'
                }`}>{formData.severity}</span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{formData.target_system}</span>
              </div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">{formData.title}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
             <div className="text-right mr-4">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Incident Lifecycle</p>
                <div className="flex items-center gap-1 mt-1">
                   {['Open', 'Investigation', 'Resolved', 'Closed'].map(s => (
                     <div key={s} className={`h-1.5 w-8 rounded-full ${formData.status === s ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-white/10'}`} />
                   ))}
                </div>
             </div>
            <button onClick={() => onSave(formData)} className="px-6 py-2.5 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center gap-2"><Save size={16}/> Sync State</button>
            <button onClick={onClose} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all"><X size={20}/></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Vertical Nav */}
          <div className="w-56 border-r border-white/5 bg-black/20 p-6 space-y-1">
            <RcaNavBtn active={activeTab === 'investigation'} icon={Terminal} label="Investigation" onClick={() => setActiveTab('investigation')} />
            <RcaNavBtn active={activeTab === 'timeline'} icon={History} label="Event Timeline" onClick={() => setActiveTab('timeline')} />
            <RcaNavBtn active={activeTab === 'evidence'} icon={Camera} label="Evidence & Logs" onClick={() => setActiveTab('evidence')} />
            <RcaNavBtn active={activeTab === 'resolution'} icon={ShieldCheck} label="Resolution" onClick={() => setActiveTab('resolution')} />
            <RcaNavBtn active={activeTab === 'mitigation'} icon={Shield} label="Mitigation Plan" onClick={() => setActiveTab('mitigation')} />
            <RcaNavBtn active={activeTab === 'hooks'} icon={LinkIcon} label="System Hooks" onClick={() => setActiveTab('hooks')} />
          </div>

          {/* RCA Workspace */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#020617]/50 p-8">
            <div className="max-w-5xl mx-auto">
               
               {activeTab === 'investigation' && (
                 <div className="space-y-8">
                   <SectionCard icon={Info} title="Initial Symptoms" color="text-slate-400">
                     <p className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 text-sm text-slate-300 italic leading-relaxed">
                        {formData.initial_symptoms || 'No symptoms recorded at initialization.'}
                     </p>
                   </SectionCard>
                   
                   <SectionCard icon={Terminal} title="Step-by-Step Narrative" color="text-purple-400">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Document the progressive discovery of the failure chain</p>
                      <textarea 
                        value={formData.narrative_summary} 
                        onChange={e => setFormData({...formData, narrative_summary: e.target.value})}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl p-6 text-sm text-slate-300 outline-none focus:border-purple-500 min-h-[300px] shadow-inner font-mono leading-relaxed"
                        placeholder="08:00 - Initial report received... 08:15 - Commenced log analysis..."
                      />
                   </SectionCard>
                 </div>
               )}

               {activeTab === 'timeline' && (
                 <div className="space-y-8">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 grid grid-cols-4 gap-4 items-end shadow-xl">
                       <div className="col-span-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Chronological Event Description</label>
                          <input 
                            value={newTimeline.description} 
                            onChange={e => setNewTimeline({...newTimeline, description: e.target.value})}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                            placeholder="Describe what happened..."
                          />
                       </div>
                       <StyledSelect 
                        label="Event Type"
                        value={newTimeline.event_type}
                        onChange={e => setNewTimeline({...newTimeline, event_type: e.target.value})}
                        options={[{value:'Detection', label:'Detection'}, {value:'Observation', label:'Observation'}, {value:'Mitigation', label:'Mitigation'}, {value:'Resolution', label:'Resolution'}, {value:'Escalation', label:'Escalation'}]}
                       />
                       <div className="flex gap-2">
                          <div className="flex-1">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Backdate Time</label>
                             <input 
                              type="datetime-local"
                              value={newTimeline.event_time.slice(0, 16)}
                              onChange={e => setNewTimeline({...newTimeline, event_time: new Date(e.target.value).toISOString()})}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] text-slate-400 outline-none focus:border-purple-500 [color-scheme:dark]"
                             />
                          </div>
                          <button 
                            disabled={!newTimeline.description || timelineMutation.isPending}
                            onClick={() => timelineMutation.mutate(newTimeline)}
                            className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                          >
                            <Plus size={20} />
                          </button>
                       </div>
                    </div>

                    <div className="relative pl-8 space-y-6">
                       <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500/50 via-blue-500/50 to-transparent" />
                       {(formData.timeline || []).sort((a:any, b:any) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime()).map((e: any, i: number) => (
                         <div key={e.id} className="relative bg-white/5 border border-white/5 rounded-2xl p-5 group hover:bg-white/10 transition-all">
                            <div className="absolute -left-[30px] top-6 w-5 h-5 bg-slate-950 border-2 border-purple-500 rounded-full z-10 flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                               <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                            </div>
                            <div className="flex items-center justify-between mb-2">
                               <div className="flex items-center gap-3">
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                    e.event_type === 'Detection' ? 'bg-rose-500/20 border-rose-500 text-rose-500' :
                                    e.event_type === 'Resolution' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                                    'bg-blue-500/20 border-blue-500 text-blue-400'
                                  }`}>{e.event_type}</span>
                                  <span className="text-[10px] font-mono text-slate-500 font-bold">{new Date(e.event_time).toLocaleString()}</span>
                               </div>
                               <button className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-500 transition-all"><Trash2 size={12}/></button>
                            </div>
                            <p className="text-sm text-slate-200 font-medium">{e.description}</p>
                         </div>
                       ))}
                       {(!formData.timeline || formData.timeline.length === 0) && (
                         <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                            <History size={40} className="mx-auto text-slate-800 mb-4" />
                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">No timeline events recorded</p>
                         </div>
                       )}
                    </div>
                 </div>
               )}

               {activeTab === 'evidence' && (
                 <div className="space-y-6">
                    <div className="bg-purple-600/10 border border-purple-500/30 rounded-3xl p-10 text-center space-y-4">
                       <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mx-auto border border-purple-500/30 shadow-2xl text-purple-400">
                          <Clipboard size={32} />
                       </div>
                       <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Clipboard Image Hook</h3>
                       <p className="text-[10px] text-slate-500 uppercase tracking-widest max-w-sm mx-auto">Click here and press <kbd className="bg-slate-950 px-2 py-1 rounded border border-white/10 text-slate-300">Ctrl+V</kbd> to capture screenshots, logs, or evidence directly into the RCA.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                       {(formData.evidence_json || []).map((ev: any, i: number) => (
                         <div key={i} className="group relative bg-slate-950 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                            {ev.type === 'image' && (
                              <img src={ev.content} alt="Evidence" className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-all" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-4">
                               <p className="text-[8px] font-black text-white uppercase tracking-widest">{new Date(ev.timestamp).toLocaleString()}</p>
                               <div className="flex gap-2 mt-2">
                                  <button onClick={() => {
                                    const newEv = formData.evidence_json.filter((_:any, idx:number) => idx !== i)
                                    setFormData({...formData, evidence_json: newEv})
                                  }} className="p-2 bg-rose-600/20 text-rose-500 rounded-lg border border-rose-500/30"><Trash2 size={14}/></button>
                                  <button className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 flex-1 flex items-center justify-center gap-2"><Eye size={14} /><span className="text-[8px] font-black uppercase">Inspect</span></button>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}

               {activeTab === 'resolution' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SectionCard icon={Search} title="Cause of Failure" color="text-purple-400" className="md:col-span-2">
                       <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">The definitive technical reason for the incident</p>
                       <textarea 
                        value={formData.cause_of_failure} 
                        onChange={e => setFormData({...formData, cause_of_failure: e.target.value})}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl p-6 text-sm text-slate-300 outline-none focus:border-purple-500 min-h-[200px]"
                        placeholder="e.g. Memory leak in v3.2.1 kernel causing OOM killer to target database..."
                       />
                    </SectionCard>
                    <SectionCard icon={Zap} title="Signature Indicator" color="text-amber-400" className="md:col-span-2">
                       <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Specific metric or log snippet that identifies this failure pattern</p>
                       <textarea 
                        value={formData.signature_indicator} 
                        onChange={e => setFormData({...formData, signature_indicator: e.target.value})}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl p-6 text-xs text-amber-500 outline-none focus:border-amber-500 font-mono"
                        placeholder="ERR_DB_OOM: Process 1422 terminated by signal 9"
                       />
                    </SectionCard>
                 </div>
               )}

               {activeTab === 'mitigation' && (
                 <div className="space-y-8">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 grid grid-cols-4 gap-4 items-end shadow-xl">
                       <div className="col-span-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Action Description</label>
                          <input 
                            value={newMitigation.action_description} 
                            onChange={e => setNewMitigation({...newMitigation, action_description: e.target.value})}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                            placeholder="What needs to be done?"
                          />
                       </div>
                       <StyledSelect 
                        label="Mitigation Type"
                        value={newMitigation.type}
                        onChange={e => setNewMitigation({...newMitigation, type: e.target.value})}
                        options={[{value:'Preventive', label:'Preventive'}, {value:'Workaround', label:'Workaround'}, {value:'Mitigation', label:'Mitigation'}]}
                       />
                       <button 
                        disabled={!newMitigation.action_description || mitigationMutation.isPending}
                        onClick={() => mitigationMutation.mutate(newMitigation)}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                      >
                        <PlusCircle size={16} /> Deploy Plan
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                       {(formData.mitigations || []).map((m: any) => (
                         <div key={m.id} className="bg-white/5 border border-white/5 rounded-2xl p-6 flex items-center justify-between group">
                            <div className="flex items-center gap-6">
                               <div className={`p-3 rounded-xl border ${
                                 m.type === 'Preventive' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                 m.type === 'Workaround' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                               }`}><Shield size={20} /></div>
                               <div>
                                  <div className="flex items-center gap-3 mb-1">
                                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{m.type} Plan</span>
                                     <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-400">{m.status}</span>
                                  </div>
                                  <p className="text-sm font-bold text-white">{m.action_description}</p>
                               </div>
                            </div>
                            <div className="flex gap-2">
                               <button className="p-2 bg-white/5 rounded-lg text-slate-500 hover:text-white"><CheckCircle2 size={16}/></button>
                               <button className="p-2 bg-white/5 rounded-lg text-slate-500 hover:text-rose-500"><Trash2 size={16}/></button>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}

               {activeTab === 'hooks' && (
                 <div className="grid grid-cols-2 gap-8">
                    <SectionCard icon={Lightbulb} title="Best Known Methods (BKM)" color="text-blue-400">
                       <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">Link to technical documentation or manuals</p>
                       <StyledSelect 
                        label="Linked BKM"
                        value={formData.knowledge_id || ''}
                        onChange={e => setFormData({...formData, knowledge_id: parseInt(e.target.value)})}
                        options={[]} // TODO: Fetch knowledge entries
                        placeholder="Choose manual..."
                       />
                       <div className="mt-6 p-4 border border-dashed border-white/10 rounded-2xl text-center">
                          <p className="text-[9px] font-black text-slate-600 uppercase">No BKM Link Established</p>
                       </div>
                    </SectionCard>
                    <SectionCard icon={Activity} title="Monitoring Sync" color="text-indigo-400">
                       <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">Link to active monitoring or telemetry</p>
                       <StyledSelect 
                        label="Linked Config"
                        value={formData.monitoring_item_id || ''}
                        onChange={e => setFormData({...formData, monitoring_item_id: parseInt(e.target.value)})}
                        options={[]} // TODO: Fetch monitoring items
                        placeholder="Choose telemetry..."
                       />
                       <div className="mt-6 p-4 border border-dashed border-white/10 rounded-2xl text-center">
                          <p className="text-[9px] font-black text-slate-600 uppercase">No Telemetry Link Established</p>
                       </div>
                    </SectionCard>
                 </div>
               )}

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const RcaNavBtn = ({ active, icon: Icon, label, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all ${active ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/20' : 'text-slate-500 hover:bg-white/5'}`}>
    <Icon size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
)

const NavBtn = ({ active, icon: Icon, label, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>
    <Icon size={14} /> <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
)

const SectionCard = ({ icon: Icon, title, children, color, className }: any) => (
  <div className={`bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4 ${className}`}>
    <div className={`flex items-center gap-3 ${color}`}><Icon size={18} /><h3 className="text-[10px] font-black uppercase tracking-widest">{title}</h3></div>
    {children}
  </div>
)

const ListInput = ({ items, onChange, placeholder }: { items: string[], onChange: (items: string[]) => void, placeholder: string }) => {
  const [val, setVal] = useState('')
  const add = () => { if(val) { onChange([...items, val]); setVal(''); } }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-blue-500" placeholder={placeholder} />
        <button onClick={add} className="p-1.5 bg-blue-600 rounded-lg text-white"><Plus size={14}/></button>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((it, i) => (
          <span key={i} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[9px] text-slate-300 flex items-center gap-1">
            {it} <button onClick={() => onChange(items.filter((_, idx) => idx !== i))}><X size={10}/></button>
          </span>
        ))}
      </div>
    </div>
  )
}
