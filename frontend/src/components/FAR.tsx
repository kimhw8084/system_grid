import React, { useState, useMemo, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ShieldAlert, Zap, Save, X, PlusCircle, User,
  RefreshCcw, AlertTriangle, Lightbulb, ShieldCheck, 
  Activity, Server, FileText, Clipboard, ArrowRight, Shield, 
  CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye,
  Target, AlertCircle, Settings, Layers, Box, Link2, ExternalLink,
  ChevronLeft, Book, Download, Copy, Terminal, Check, HelpCircle, EyeOff
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'
import { StatusPill } from './shared/StatusPill'
import { ConfigRegistryModal } from './ConfigRegistry'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

// --- Types ---
interface FailureMode {
  id: number
  system_name: string
  title: string
  effect: string
  severity: number
  occurrence: number
  detection: number
  rpn: number
  status: string
  affected_assets: any[]
  causes: any[]
  mitigations: any[]
  prevention_actions: any[]
}

interface Cause {
  id: number
  cause_text: string
  occurrence_level: number
  responsible_team: string
  failure_modes: any[]
}

// --- Constants for Guided Scoring ---
const SEVERITY_LEVELS = [
  { value: 10, label: 'Hazardous (No Warning)', desc: 'Safety issue or total compliance failure.' },
  { value: 9, label: 'Hazardous (With Warning)', desc: 'Potential safety issue or major compliance risk.' },
  { value: 8, label: 'Very High', desc: 'System total failure, major data loss, no workaround.' },
  { value: 7, label: 'High', desc: 'System operational but major performance impact.' },
  { value: 6, label: 'Moderate', desc: 'Significant impact, but workaround exists.' },
  { value: 5, label: 'Low', desc: 'Minor impact on performance or usability.' },
  { value: 4, label: 'Very Low', desc: 'Noticeable impact but system remains functional.' },
  { value: 3, label: 'Minor', desc: 'Slight annoyance to users.' },
  { value: 2, label: 'Very Minor', desc: 'Hardly noticeable impact.' },
  { value: 1, label: 'None', desc: 'No discernible effect.' },
]

const OCCURRENCE_LEVELS = [
  { value: 10, label: 'Certain', desc: 'Inevitable. Occurs multiple times per day.' },
  { value: 9, label: 'Very High', desc: 'Likely to occur daily.' },
  { value: 8, label: 'High', desc: 'Likely to occur weekly.' },
  { value: 7, label: 'Moderately High', desc: 'Occurs once or twice per month.' },
  { value: 6, label: 'Moderate', desc: 'Occurs once every few months.' },
  { value: 5, label: 'Low', desc: 'Occurs once or twice per year.' },
  { value: 4, label: 'Very Low', desc: 'Occurs once every few years.' },
  { value: 3, label: 'Remote', desc: 'Unlikely but possible.' },
  { value: 2, label: 'Very Remote', desc: 'Extremely unlikely.' },
  { value: 1, label: 'Nearly Impossible', desc: 'Never expected to occur.' },
]

const DETECTION_LEVELS = [
  { value: 10, label: 'Impossible', desc: 'No monitoring. Only discovered by user report.' },
  { value: 9, label: 'Very Remote', desc: 'Visible only after catastrophic failure.' },
  { value: 8, label: 'Remote', desc: 'Requires manual log inspection or audit.' },
  { value: 7, label: 'Very Low', desc: 'Alerts exist but are buried in noise.' },
  { value: 6, label: 'Low', desc: 'Standard monitoring, but delayed or inconsistent.' },
  { value: 5, label: 'Moderate', desc: 'Reliable alerts but require human triage.' },
  { value: 4, label: 'Moderately High', desc: 'Proactive alerts with clear root cause.' },
  { value: 3, label: 'High', desc: 'Real-time dashboarding and active monitoring.' },
  { value: 2, label: 'Very High', desc: 'Automated self-healing or failsafe systems.' },
  { value: 1, label: 'Almost Certain', desc: 'Predictive analytics prevents failure.' },
]

const maturityLevels = [
  { lv: 8, label: 'Prevented', desc: 'Eliminated / Design Proofed', color: 'bg-emerald-500', tooltip: 'DESIGN PROOF: Failure mode eliminated by architectural change or permanent hardware/software design proofing.' },
  { lv: 7, label: 'Triple Shield', desc: 'Monitoring + Resolution + Workaround', color: 'bg-emerald-400', tooltip: 'TRIPLE SHIELD: Full defense-in-depth. Automated detection, immediate workaround, and verified BKM are all active.' },
  { lv: 6, label: 'Automated Fix', desc: 'Monitoring + Resolution', color: 'bg-sky-500', tooltip: 'STABLE DEFENSE: Monitoring identifies failure and a permanent BKM fix is available. Lacks an immediate temporary workaround.' },
  { lv: 5, label: 'Hybrid Patch', desc: 'Resolution + Workaround', color: 'bg-sky-400', tooltip: 'HYBRID PATCH: Permanent fix and temporary workaround identified. Lacks automated monitoring to detect onset.' },
  { lv: 4, label: 'Resolved Only', desc: 'Manual Permanent Fix', color: 'bg-blue-500', tooltip: 'RESOLUTION ONLY: A verified permanent fix exists, but failure is silent (no monitoring) and has no immediate workaround.' },
  { lv: 3, label: 'Detect & Patch', desc: 'Monitoring + Workaround', color: 'bg-amber-500', tooltip: 'DETECT & PATCH: Monitoring provides visibility and a workaround reduces impact, but no permanent BKM has been identified.' },
  { lv: 2, label: 'Workaround Only', desc: 'Temporary Patch Only', color: 'bg-amber-400', tooltip: 'WORKAROUND ONLY: A temporary patch exists for recovery, but we are blind to failure onset (no monitoring).' },
  { lv: 1, label: 'Visibility Only', desc: 'Monitoring Without Action', color: 'bg-rose-400', tooltip: 'MONITORING ONLY: We can see the failure occurring via telemetry, but have no workaround or permanent resolution playbook.' },
  { lv: 0, label: 'Exposed', desc: 'No Monitoring / No Action', color: 'bg-rose-600', tooltip: 'SYSTEM EXPOSED: Critical blind spot. No telemetry, no workaround, and no permanent resolution identified. High risk.' }
]

export default function FAR() {
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [showCauseWizard, setShowCauseWizard] = useState(false)
  const [selectedModeId, setSelectedModeId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSystems, setSelectedSystems] = useState<string[]>([])
  const [showMitigationWizard, setShowMitigationWizard] = useState(false)
  const [showResolutionWizard, setShowResolutionWizard] = useState(false)
  const [showPreventionWizard, setShowPreventionWizard] = useState(false)
  const [showMaturityHelp, setShowMaturityHelp] = useState(false)

  // Column Picker & Style Lab State
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(10)
  const [showStyleLab, setShowStyleLab] = useState(true)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([])
  const [showConfig, setShowConfig] = useState(false)
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{show: boolean, title: string, message: string, onConfirm: () => void}>({
    show: false, title: '', message: '', onConfirm: () => {}
  })

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm })
  }

  const handleExportCSV = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `SysGrid_FAR_${new Date().toISOString().split('T')[0]}.csv`,
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

  // Queries
  const { data: modes, isLoading: modesLoading } = useQuery({ 
    queryKey: ['far', 'modes'], 
    queryFn: async () => (await apiFetch('/api/v1/far/modes')).json() 
  })

  const { data: causes, isLoading: causesLoading } = useQuery({
    queryKey: ['far', 'causes'],
    queryFn: async () => (await apiFetch('/api/v1/far/causes')).json()
  })

  // Mutations
  const bulkMutation = useMutation({
    mutationFn: async ({ action, ids }: { action: string, ids: number[] }) => {
      if (action === 'delete') {
        const res = await apiFetch('/api/v1/far/modes/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) })
        return res.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['far'] })
      toast.success('Failure Modes Updated')
      setConfirmModal({ ...confirmModal, show: false })
    },
    onError: (e: any) => toast.error(e.message)
  })

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await apiFetch('/api/v1/settings/options')).json() })
  const availableSystems = useMemo(() => {
    const sys = options?.filter((o: any) => o.category === 'LogicalSystem').map((s: any) => s.value) || []
    return sys
  }, [options])

  const isLoading = modesLoading || causesLoading

  // Filtering Logic
  const filteredModes = useMemo(() => {
    let result = modes || []
    if (selectedSystems.length > 0) {
      result = result.filter((m: any) => selectedSystems.includes(m.system_name))
    }
    if (searchTerm) {
      result = result.filter((m: any) => 
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.system_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    return result
  }, [modes, searchTerm, selectedSystems])

  const selectedMode = useMemo(() => modes?.find((m: any) => m.id === selectedModeId), [modes, selectedModeId])

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
      field: "system_name", 
      headerName: "System", 
      minWidth: 120,
      cellClass: 'text-center font-black text-rose-400 uppercase italic',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("system_name")
    },
    { 
      field: "title", 
      headerName: "Failure Mode", 
      minWidth: 250,
      flex: 1,
      cellClass: 'text-left font-black uppercase italic',
      headerClass: 'text-left',
      filter: 'agTextColumnFilter',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("title")
    },
    { 
      field: "severity", 
      headerName: "S", 
      width: 60,
      minWidth: 60,
      cellClass: 'text-center font-black italic text-rose-500',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("severity")
    },
    { 
      field: "occurrence", 
      headerName: "O", 
      width: 60,
      minWidth: 60,
      cellClass: 'text-center font-black italic text-amber-500',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("occurrence")
    },
    { 
      field: "detection", 
      headerName: "D", 
      width: 60,
      minWidth: 60,
      cellClass: 'text-center font-black italic text-sky-400',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("detection")
    },
    { 
      field: "rpn", 
      headerName: "RPN", 
      width: 80,
      minWidth: 80,
      cellClass: 'text-center font-black italic text-white',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      cellRenderer: (p: any) => (
        <span style={{ fontSize: `${fontSize}px` }} className={p.value > 100 ? 'text-rose-500' : 'text-emerald-400'}>
          {p.value}
        </span>
      ),
      hide: hiddenColumns.includes("rpn")
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 130,
      minWidth: 130,
      cellClass: 'text-center font-black italic uppercase',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center h-full">
          <StatusPill value={p.value} fontSize={fontSize} />
        </div>
      ),
      hide: hiddenColumns.includes("status")
    },
    {
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
               <button onClick={() => setSelectedModeId(p.data.id)} title="View Details" className="p-1.5 text-blue-400 hover:text-blue-200 transition-all border-r border-white/5"><Eye size={14}/></button>
               <button onClick={() => { setSelectedModeId(p.data.id); setShowWizard(true); }} title="Edit Configuration" className="p-1.5 text-emerald-400 hover:text-emerald-200 transition-all border-r border-white/5"><Edit2 size={14}/></button>
               <button onClick={() => openConfirm('Soft Delete', 'Move this failure mode to deleted?', () => bulkMutation.mutate({ action: 'delete', ids: [p.data.id] }))} title="Soft Delete" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      ),
      suppressHide: true
    }
  ], [fontSize, hiddenColumns]) as any

  const autoSizeStrategy = useMemo(() => ({
    type: 'fitCellContents' as const
  }), []);

  // Advanced Metrics Calculation
  const metrics = useMemo(() => {
    const activeModes = filteredModes || []
    const totalRPN = activeModes.reduce((acc: number, m: any) => acc + (m.rpn || 0), 0)
    const avgRPN = activeModes.length ? totalRPN / activeModes.length : 0
    
    const sri = Math.max(0, Math.round(100 * (1 - avgRPN / 500))) 
    
    const getMaturity = (mode: any) => {
      if (['Eliminated', 'Prevented'].includes(mode.status)) return 8;
      const hasM = mode.mitigations?.some((m: any) => m.mitigation_type === 'Monitoring');
      const hasW = mode.mitigations?.some((m: any) => m.mitigation_type === 'Workaround');
      const hasR = mode.causes?.some((c: any) => (c.resolutions?.length || 0) > 0);

      if (hasM && hasR && hasW) return 7;
      if (hasM && hasR) return 6;
      if (hasR && hasW) return 5;
      if (hasR) return 4;
      if (hasM && hasW) return 3;
      if (hasW) return 2;
      if (hasM) return 1;
      return 0;
    }

    const maturityDist = activeModes.reduce((acc: any, mode: any) => {
      const lv = getMaturity(mode);
      acc[lv] = (acc[lv] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const mitigated = activeModes.filter((m: any) => (m.mitigations?.length || 0) > 0).length
    const mitRatio = activeModes.length ? Math.round((mitigated / activeModes.length) * 100) : 0

    const totalAssets = activeModes.reduce((acc: number, m: any) => acc + (m.affected_assets?.length || 0), 0)
    const riskDensity = totalAssets ? (totalRPN / totalAssets).toFixed(1) : '0.0'

    return { sri, mitRatio, riskDensity, avgRPN: Math.round(avgRPN), maturityDist }
  }, [filteredModes])

  const toggleSystem = (sys: string) => {
    setSelectedSystems(prev => 
      prev.includes(sys) ? prev.filter(s => s !== sys) : [...prev, sys]
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic flex items-center gap-2">
                <Target size={24} className="text-rose-500" /> Failure Matrix
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">Reliability Knowledge Engine & Risk Mitigation</p>
           </div>
        </div>
        
        <div className="flex items-center space-x-3">
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="SCAN FAILURES..."
                className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black outline-none focus:border-rose-500/50 w-64 transition-all"
              />
           </div>

           <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5 space-x-1">
             <button onClick={() => setShowStyleLab(!showStyleLab)} className={`p-1.5 hover:bg-white/10 ${showStyleLab ? 'text-rose-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Toggle Style Lab">
                <Activity size={16} />
             </button>
             <button onClick={() => setShowColumnPicker(!showColumnPicker)} className={`p-1.5 hover:bg-white/10 ${showColumnPicker ? 'text-rose-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Column Picker">
                <Sliders size={16} />
             </button>
             <button onClick={handleExportCSV} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-emerald-400 rounded-lg transition-all" title="Export CSV">
                <FileText size={16} />
             </button>
             <button onClick={handleCopyToClipboard} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-rose-400 rounded-lg transition-all" title="Copy to Clipboard">
                <Clipboard size={16} />
             </button>
             <button onClick={() => setShowConfig(true)} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-rose-400 rounded-lg transition-all" title="Reliability Config">
                <Settings size={16} />
             </button>
          </div>

           <button 
             onClick={() => { setShowCauseWizard(false); setShowWizard(true); }}
             className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/10 active:scale-95 transition-all flex items-center gap-2"
           >
             <ShieldAlert size={14} /> Add Mode
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
            <div className="bg-rose-600/10 border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md">
               <div className="flex items-center space-x-12">
                  <div className="flex items-center space-x-3">
                     <Activity size={16} className="text-rose-400" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">View Density Laboratory</span>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                     <div className="flex items-center space-x-4">
                        <span className="text-[9px] font-black text-slate-500 uppercase">Font Size</span>
                        <div className="flex items-center space-x-2">
                            <input 
                            type="range" min="8" max="14" step="1" 
                            value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                            className="w-32 accent-rose-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
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
                            className="w-32 accent-rose-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
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

      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
         <button 
           onClick={() => setSelectedSystems([])}
           className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${selectedSystems.length === 0 ? 'bg-rose-500 border-rose-400 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'}`}
         >
           Global
         </button>
         {availableSystems.map(sys => (
           <button 
             key={sys}
             onClick={() => toggleSystem(sys)}
             className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${selectedSystems.includes(sys) ? 'bg-white/10 border-white/20 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'}`}
           >
             {sys}
           </button>
         ))}
      </div>

      {/* Tactical Overview Ribbon */}
      <div className="grid grid-cols-4 gap-3">
         <div className="glass-panel p-3 rounded-2xl border-white/5 bg-[#0a0c14]/60 flex flex-col justify-between group overflow-hidden relative min-h-[80px]" title="Reliability Index (SRI): A health score (0-100) where 100 is zero risk. Calculated as: 100 * (1 - Avg RPN / 500).">
            <div className={`absolute top-0 right-0 w-24 h-24 blur-[30px] opacity-10 transition-colors ${metrics.sri > 70 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <div className="flex items-center justify-between mb-1 relative z-10">
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Reliability Index</p>
               <Activity size={12} className={metrics.sri > 70 ? 'text-emerald-500' : 'text-rose-500'} />
            </div>
            <div className="flex items-baseline gap-1 relative z-10 leading-none">
               <h4 className={`text-2xl font-black tracking-tighter italic ${metrics.sri > 70 ? 'text-emerald-400' : 'text-rose-400'}`}>{metrics.sri}</h4>
               <span className="text-[9px] font-black text-slate-600 uppercase italic">/100</span>
            </div>
            <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden relative z-10">
               <motion.div animate={{ width: `${metrics.sri}%` }} className={`h-full ${metrics.sri > 70 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
         </div>

         <div className="glass-panel p-3 rounded-2xl border-white/5 bg-[#0a0c14]/60 flex flex-col justify-between min-h-[80px]" title="Risk Density: Risk concentration per asset. Calculated as: Total RPN / Total Affected Assets.">
            <div className="flex items-center justify-between mb-1">
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Risk Density</p>
               <Layers size={12} className="text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1 leading-none">
               <h4 className="text-2xl font-black tracking-tighter text-white italic">{metrics.riskDensity}</h4>
               <span className="text-[9px] font-black text-slate-600 uppercase italic">RPN/ASSET</span>
            </div>
            <div className="mt-2 flex gap-0.5">
               {Array.from({ length: 10 }).map((_, i) => (
                 <div key={i} className={`h-1 flex-1 rounded-sm ${i < (parseFloat(metrics.riskDensity) / 10) ? 'bg-amber-500' : 'bg-white/5'}`} />
               ))}
            </div>
         </div>

         <div className="glass-panel p-3 rounded-2xl border-white/5 bg-[#0a0c14]/60 flex flex-col justify-between min-h-[80px]" title="Mitigation Ratio: Percentage of failures covered by Monitoring or Workarounds. Calculated as: (Mitigated Modes / Total Modes) * 100.">
            <div className="flex items-center justify-between mb-1">
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Mitigation Ratio</p>
               <ShieldCheck size={12} className="text-sky-400" />
            </div>
            <div className="flex items-baseline gap-1 leading-none">
               <h4 className="text-2xl font-black tracking-tighter text-white italic">{metrics.mitRatio}%</h4>
            </div>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2 leading-none">
               {metrics.mitRatio > 80 ? 'Fortified' : metrics.mitRatio > 50 ? 'Stable' : 'Exposed'}
            </p>
         </div>

         <div className="glass-panel p-3 rounded-2xl border-white/5 bg-[#0a0c14]/60 flex flex-col justify-between min-h-[80px]" title="Avg RPN: The mean Risk Priority Number across all active failure modes.">
            <div className="flex items-center justify-between mb-1">
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Avg Severity</p>
               <AlertTriangle size={12} className="text-rose-500" />
            </div>
            <div className="flex items-baseline gap-1 leading-none">
               <h4 className="text-2xl font-black tracking-tighter text-white italic">{metrics.avgRPN}</h4>
               <span className="text-[9px] font-black text-slate-600 uppercase italic">AVG RPN</span>
            </div>
            <div className="mt-2 h-1 bg-white/5 rounded-full relative overflow-hidden">
               <motion.div animate={{ left: `${Math.min(100, (metrics.avgRPN / 500) * 100)}%` }} className="absolute h-full w-4 bg-white/20 blur-sm" />
            </div>
         </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col glass-panel rounded-3xl border-white/5 bg-[#0a0c14]/40 overflow-hidden relative">
           <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <ShieldAlert size={14} className="text-rose-500" />
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-white italic">Failure Inventory Maturity</h3>
                 <button onClick={() => setShowMaturityHelp(true)} className="text-slate-500 hover:text-white transition-colors"><HelpCircle size={12} /></button>
              </div>
              <div className="flex items-end gap-1.5 h-10 px-4">
                {maturityLevels.slice().reverse().map((ml: any) => {
                  const count = (metrics as any).maturityDist[ml.lv] || 0
                  const pct = filteredModes?.length ? (count / filteredModes.length) * 100 : 0
                  return (
                    <div key={ml.lv} className="w-5 h-full relative group cursor-help" title={`${ml.label}: ${count} modes (${Math.round(pct)}%)`}>
                        <div className={`w-full h-full rounded-t-md transition-all ${ml.color} ${count === 0 ? 'opacity-5' : 'opacity-60 group-hover:opacity-100 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`} style={{ height: `${Math.max(5, pct)}%` }} />
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100]">
                           <div className="bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg whitespace-nowrap shadow-2xl">
                              <p className="text-[9px] font-black text-white uppercase tracking-widest">{ml.label}</p>
                              <p className="text-[8px] font-black text-slate-500 uppercase">{count} ENTRIES</p>
                           </div>
                        </div>
                    </div>
                  )
                })}
              </div>
           </div>

           <div className="flex-1 glass-panel overflow-hidden ag-theme-alpine-dark relative">
              <AgGridReact
                ref={gridRef}
                rowData={filteredModes || []}
                columnDefs={columnDefs}
                headerHeight={fontSize + rowDensity + 10}
                rowHeight={fontSize + rowDensity + 10}
                quickFilterText={searchTerm}
                animateRows={true}
                enableCellTextSelection={true}
                autoSizeStrategy={autoSizeStrategy}
                onRowClicked={(p: any) => setSelectedModeId(p.data.id)}
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
                      <h3 className="text-xs font-black uppercase tracking-widest text-rose-400 flex items-center space-x-2">
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
                            <div className={`w-4 h-4 rounded border transition-all ${!hiddenColumns.includes(col.field) ? 'bg-rose-600 border-rose-500 shadow-lg shadow-rose-500/20' : 'border-white/10 bg-black/40 group-hover:border-white/20'}`}>
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
      </div>

      <AnimatePresence>
          {selectedModeId && selectedMode && (
            <FailureDetailView 
              mode={selectedMode} 
              onClose={() => setSelectedModeId(null)}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['far'] })}
            />
          )}
      </AnimatePresence>

      <AnimatePresence>
        {showMaturityHelp && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-10">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-full max-w-3xl rounded-[40px] border border-white/10 bg-slate-900 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <HelpCircle size={24} className="text-rose-500" />
                      <h2 className="text-xl font-black uppercase tracking-widest text-white italic">Maturity Level Definitions</h2>
                   </div>
                   <button onClick={() => setShowMaturityHelp(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
                </div>
                <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                   {maturityLevels.map((ml) => (
                     <div key={ml.lv} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-6 group hover:border-white/20 transition-all">
                        <div className={`w-12 h-12 rounded-xl ${ml.color} flex items-center justify-center text-white font-black text-xl italic shrink-0 shadow-lg`}>
                           {ml.lv}
                        </div>
                        <div>
                           <p className="text-sm font-black text-white uppercase tracking-widest mb-1">{ml.label}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">{ml.desc}</p>
                           <p className="text-[11px] text-slate-500 leading-relaxed font-bold">{ml.tooltip}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfigRegistryModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        title="Reliability Matrix Enumerations"
        sections={[
            { title: "Logical Systems", category: "LogicalSystem", icon: LayoutGrid },
            { title: "Risk Categories", category: "RiskCategory", icon: Target },
            { title: "Operational Teams", category: "BusinessUnit", icon: User }
        ]}
      />

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: #0a0c14;
          --ag-header-background-color: #141721;
          --ag-border-color: rgba(255,255,255,0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #f43f5e;
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
            font-style: italic !important;
        }
        .ag-cell { 
            display: flex; 
            align-items: center; 
            justify-content: center !important; 
            font-weight: 700 !important;
        }
        .ag-row-hover { background-color: rgba(244, 63, 94, 0.05) !important; }
        .ag-row-selected { background-color: rgba(244, 63, 94, 0.2) !important; }
      `}</style>

      <AnimatePresence>
        {showWizard && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 20, opacity: 0 }} 
              className="glass-panel w-full max-w-6xl h-[85vh] flex flex-col rounded-[40px] border border-rose-500/20 overflow-hidden shadow-2xl"
            >
               <div className="p-10 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="px-3 py-1 rounded-lg bg-rose-600/20 border border-rose-500/30 text-[9px] font-black text-rose-500 uppercase tracking-widest">RISK_ENTRY</div>
                       <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">FAILURE_MODE_REGISTRY</div>
                    </div>
                    <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">DOCUMENT_FAILURE</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Formal Risk Documentation & Reliability Engineering Analysis</p>
                 </div>
                 <button onClick={() => setShowWizard(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all"><X size={24}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                 <FARWizard onComplete={() => { setShowWizard(false); queryClient.invalidateQueries({ queryKey: ['far'] }); }} />
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.show} 
        onClose={() => setConfirmModal({ ...confirmModal, show: false })} 
        onConfirm={confirmModal.onConfirm} 
        title={confirmModal.title} 
        message={confirmModal.message} 
      />
    </div>
  )
}

// --- High Fidelity Detail View ---

function FailureDetailView({ mode, onClose, onUpdate }: { mode: any, onClose: () => void, onUpdate: () => void }) {
  const [activeTab, setActiveTab] = useState('analysis')
  const queryClient = useQueryClient()
  
  const [showMitigationWizard, setShowMitigationWizard] = useState(false)
  const [showResolutionWizard, setShowResolutionWizard] = useState(false)
  const [showPreventionWizard, setShowPreventionWizard] = useState(false)
  const [showCauseWizard, setShowCauseWizard] = useState(false)

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-panel w-full max-w-7xl max-h-[90vh] flex flex-col rounded-[40px] border border-rose-500/20 bg-black overflow-hidden shadow-2xl"
      >
         <div className="p-10 border-b border-white/5 bg-white/5 flex flex-col shrink-0">
            <div className="flex items-start justify-between w-full">
              <div className="space-y-4">
                  <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-lg bg-rose-600/20 border border-rose-500/30 text-[9px] font-black text-rose-500 uppercase tracking-widest">FAILURE_ID: {mode.id}</span>
                      <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">{mode.system_name}</span>
                      <span className={`px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest ${mode.rpn > 100 ? 'text-rose-500' : 'text-emerald-400'}`}>{mode.status}</span>
                  </div>
                  <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">{mode.title}</h2>
              </div>
              <div className="flex items-start gap-8">
                  <div className="text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Risk Priority Number</p>
                      <p className={`text-6xl font-black italic leading-none tracking-tighter ${mode.rpn > 100 ? 'text-rose-500' : 'text-white'}`}>{mode.rpn}</p>
                  </div>
                  <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all"><X size={24}/></button>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
               <div className="flex space-x-1 bg-black/40 p-1 rounded-2xl border border-white/5">
                  {[
                    { id: 'analysis', label: 'Core Analysis', icon: Target },
                    { id: 'impact', label: 'Infrastructure Impact', icon: Server },
                    { id: 'causal', label: 'Causal Matrix', icon: Zap },
                    { id: 'roadmap', label: 'Reliability Roadmap', icon: ShieldCheck }
                  ].map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => setActiveTab(t.id)} 
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === t.id ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <t.icon size={14} /> {t.label}
                    </button>
                  ))}
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
            {activeTab === 'analysis' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <section className="grid grid-cols-3 gap-8">
                   <ScoreCard label="Severity" value={mode.severity} levels={SEVERITY_LEVELS} color="rose" />
                   <ScoreCard label="Occurrence" value={mode.occurrence} levels={OCCURRENCE_LEVELS} color="amber" />
                   <ScoreCard label="Detection" value={mode.detection} levels={DETECTION_LEVELS} color="sky" />
                </section>

                <section className="space-y-4">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 px-1">
                      <FileText size={14} className="text-rose-500" /> Forensic Effect Description
                   </h3>
                   <div className="bg-rose-500/5 border border-rose-500/20 rounded-[32px] p-8">
                      <p className="text-lg font-bold text-white leading-relaxed uppercase tracking-tight italic">{mode.effect || 'NO EFFECT STATEMENT DOCUMENTED'}</p>
                   </div>
                </section>
              </div>
            )}

            {activeTab === 'impact' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Affected Assets ({mode.affected_assets?.length || 0})</h3>
                    <button className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">+ Map Asset</button>
                 </div>
                 <div className="grid grid-cols-4 gap-4">
                    {mode.affected_assets?.map((asset: any) => (
                      <div key={asset.id} className="bg-white/5 border border-white/5 p-6 rounded-[24px] group hover:border-rose-500/30 transition-all">
                         <Server size={32} className="text-slate-600 group-hover:text-rose-500 mb-4 transition-colors" />
                         <p className="text-sm font-black text-white uppercase tracking-tighter">{asset.name}</p>
                         <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{asset.model}</p>
                      </div>
                    ))}
                    {(!mode.affected_assets?.length) && (
                      <div className="col-span-4 py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] opacity-20">
                         <p className="text-[10px] font-black uppercase tracking-widest italic">No infrastructure assets linked</p>
                      </div>
                    )}
                 </div>
              </div>
            )}

            {activeTab === 'causal' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <section className="space-y-6">
                    <div className="flex items-center justify-between">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2 border-l-2 border-amber-500 pl-4 italic">Attributed Root Causes</h3>
                       <button onClick={() => setShowCauseWizard(true)} className="bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">+ Log Trace Source</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       {mode.causes?.map((cause: any) => (
                         <div key={cause.id} className="bg-white/5 border border-white/5 p-8 rounded-[32px] space-y-6 group hover:border-amber-500/30 transition-all">
                            <div className="flex items-start justify-between">
                               <p className="text-sm font-black text-white uppercase leading-relaxed tracking-tight">{cause.cause_text}</p>
                               <div className="text-right">
                                  <p className="text-xs font-black text-amber-500 italic">{cause.occurrence_level}/10</p>
                                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">OCCURRENCE</p>
                               </div>
                            </div>
                            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-lg">TEAM: {cause.responsible_team}</span>
                               <div className="flex gap-2">
                                  <button onClick={() => setShowResolutionWizard(true)} className="p-2 hover:bg-white/5 rounded-xl text-emerald-500 transition-colors"><Lightbulb size={18}/></button>
                                  <button className="p-2 hover:bg-white/5 rounded-xl text-rose-500 transition-colors"><Trash2 size={16}/></button>
                               </div>
                            </div>
                         </div>
                       ))}
                       {(!mode.causes?.length) && (
                         <div className="col-span-2 py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] opacity-20">
                            <p className="text-[10px] font-black uppercase tracking-widest italic">No root causes identified. Failure is currently unattributed.</p>
                         </div>
                       )}
                    </div>
                 </section>

                 <section className="space-y-6">
                    <div className="flex items-center justify-between">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2 border-l-2 border-emerald-500 pl-4 italic">Verified Resolutions & BKMs</h3>
                       <button onClick={() => setShowResolutionWizard(true)} className="bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">+ Map Knowledge Alignment</button>
                    </div>
                    <div className="space-y-3">
                       {mode.causes?.map((cause: any) => cause.resolutions?.map((res: any, idx: number) => (
                         <div key={idx} className="bg-white/5 border border-white/5 p-6 rounded-3xl flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                            <div className="flex items-center gap-6">
                               <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                                  <FileText size={24} />
                               </div>
                               <div>
                                  <p className="text-sm font-black text-white uppercase tracking-tight italic">{res.knowledge_bkm?.title || 'Relational BKM Link'}</p>
                                  <div className="flex items-center gap-4 mt-1">
                                     <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">TEAM: {res.responsible_team}</p>
                                     <span className="w-1 h-1 rounded-full bg-white/10" />
                                     <p className="text-[9px] text-slate-500 font-bold uppercase truncate max-w-sm">SOURCE: {cause.cause_text}</p>
                                  </div>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-all"><ExternalLink size={18} /></button>
                               <button className="p-3 bg-white/5 hover:bg-rose-500/10 rounded-xl text-slate-600 hover:text-rose-500 transition-all"><Trash2 size={16}/></button>
                            </div>
                         </div>
                       )))}
                       {(!mode.causes?.some((c:any) => c.resolutions?.length > 0)) && (
                         <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-[40px] opacity-20">
                            <p className="text-[10px] font-black uppercase tracking-widest italic">No permanent resolutions linked</p>
                         </div>
                       )}
                    </div>
                 </section>
              </div>
            )}

            {activeTab === 'roadmap' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <section className="grid grid-cols-2 gap-6">
                    {[
                      { label: 'Automated Monitoring', status: mode.mitigations?.some((m:any) => m.mitigation_type === 'Monitoring'), icon: Activity, color: 'text-sky-400', action: () => setShowMitigationWizard(true) },
                      { label: 'Immediate Workaround', status: mode.mitigations?.some((m:any) => m.mitigation_type === 'Workaround'), icon: Zap, color: 'text-amber-400', action: () => setShowMitigationWizard(true) },
                      { label: 'Permanent BKM', status: mode.causes?.some((c:any) => c.resolutions?.length > 0), icon: Lightbulb, color: 'text-emerald-400', action: () => setShowResolutionWizard(true) },
                      { label: 'Engineering Fix', status: ['Eliminated', 'Prevented'].includes(mode.status), icon: ShieldCheck, color: 'text-emerald-500', action: () => setShowPreventionWizard(true) }
                    ].map((item, i) => (
                      <div key={i} className={`p-8 rounded-[40px] border transition-all flex items-center justify-between ${item.status ? 'bg-white/5 border-emerald-500/30 shadow-[inset_0_0_30px_rgba(16,185,129,0.05)]' : 'bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100 hover:border-rose-500/20'}`}>
                         <div className="flex items-center gap-6">
                            <div className={`p-4 rounded-2xl bg-white/5 ${item.status ? item.color : 'text-slate-600'}`}>
                               <item.icon size={32} />
                            </div>
                            <div>
                               <p className={`text-sm font-black uppercase tracking-widest italic ${item.status ? 'text-white' : 'text-slate-500'}`}>{item.label}</p>
                               <p className="text-[9px] font-bold uppercase text-slate-600 mt-1 tracking-[0.2em]">{item.status ? 'Verified & Active' : 'Action Required'}</p>
                            </div>
                         </div>
                         {!item.status && (
                           <button onClick={item.action} className="p-3 hover:bg-white/10 rounded-2xl text-rose-500 transition-colors">
                              <Plus size={24} />
                           </button>
                         )}
                         {item.status && <Check size={28} className="text-emerald-500" />}
                      </div>
                    ))}
                 </section>

                 <section className="space-y-6">
                    <div className="flex items-center justify-between">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-sky-400 flex items-center gap-2 border-l-2 border-sky-400 pl-4 italic">Active Mitigations (Monitors & Workarounds)</h3>
                       <button onClick={() => setShowMitigationWizard(true)} className="bg-sky-600/10 hover:bg-sky-600/20 border border-sky-500/20 text-sky-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">+ Map Mitigation</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       {mode.mitigations?.map((mit: any) => (
                         <div key={mit.id} className="bg-white/5 border border-white/5 p-8 rounded-[32px] space-y-4 group hover:border-sky-500/30 transition-all">
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  {mit.mitigation_type === 'Monitoring' ? <Activity size={20} className="text-sky-400" /> : <Zap size={20} className="text-amber-400" />}
                                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{mit.mitigation_type}</span>
                               </div>
                               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">TEAM: {mit.responsible_team}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-tight">{mit.mitigation_steps}</p>
                            <div className="pt-4 flex justify-end">
                               <button className="p-2 hover:bg-rose-500/10 rounded-xl text-slate-600 hover:text-rose-500 transition-all"><Trash2 size={16}/></button>
                            </div>
                         </div>
                       ))}
                       {(!mode.mitigations?.length) && (
                         <div className="col-span-2 py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] opacity-20">
                            <p className="text-[10px] font-black uppercase tracking-widest italic">No active mitigations registered</p>
                         </div>
                       )}
                    </div>
                 </section>
              </div>
            )}
         </div>
      </motion.div>

      {/* Internal Modals */}
      <AnimatePresence>
        {showCauseWizard && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="glass-panel w-full max-w-4xl flex flex-col rounded-[40px] border border-amber-500/20 overflow-hidden shadow-2xl">
               <div className="p-10 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
                 <div className="space-y-4">
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">Trace Failure Source</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Failure Origin Identification & Technical Attribution</p>
                 </div>
                 <button onClick={() => setShowCauseWizard(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all"><X size={24}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-10">
                  <CauseWizard modeId={mode.id} onComplete={() => { setShowCauseWizard(false); onUpdate(); }} />
               </div>
            </motion.div>
          </div>
        )}

        {showMitigationWizard && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="glass-panel w-full max-w-2xl flex flex-col rounded-[40px] border border-sky-500/30 overflow-hidden shadow-2xl">
               <div className="p-10 border-b border-white/5 bg-sky-500/5 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-4">
                   <Activity size={32} className="text-sky-500" />
                   <div>
                     <h2 className="text-2xl font-black uppercase text-white italic tracking-tighter">MITIGATION_REGISTRY</h2>
                     <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Monitoring & Workaround Documentation</p>
                   </div>
                 </div>
                 <button onClick={() => setShowMitigationWizard(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all"><X size={24}/></button>
               </div>
               <div className="p-10">
                 <MitigationWizard modeId={mode.id} onComplete={() => { setShowMitigationWizard(false); onUpdate(); }} />
               </div>
            </motion.div>
          </div>
        )}

        {showResolutionWizard && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="glass-panel w-full max-w-2xl flex flex-col rounded-[40px] border border-emerald-500/30 overflow-hidden shadow-2xl">
               <div className="p-10 border-b border-white/5 bg-emerald-500/5 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-4">
                   <Lightbulb size={32} className="text-emerald-500" />
                   <div>
                     <h2 className="text-2xl font-black uppercase text-white italic tracking-tighter">KNOWLEDGE_ALIGNMENT</h2>
                     <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Map Verified BKM to Failure Mode</p>
                   </div>
                 </div>
                 <button onClick={() => setShowResolutionWizard(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all"><X size={24}/></button>
               </div>
               <div className="p-10">
                 <ResolutionWizard mode={mode} onComplete={() => { setShowResolutionWizard(false); onUpdate(); }} />
               </div>
            </motion.div>
          </div>
        )}

        {showPreventionWizard && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="glass-panel w-full max-w-2xl flex flex-col rounded-[40px] border border-emerald-600/30 overflow-hidden shadow-2xl">
               <div className="p-10 border-b border-white/5 bg-emerald-600/5 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-4">
                   <ShieldCheck size={32} className="text-emerald-500" />
                   <div>
                     <h2 className="text-2xl font-black uppercase text-white italic tracking-tighter">PREVENTION_ACTION</h2>
                     <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Engineering Hardening & Design Proofing</p>
                   </div>
                 </div>
                 <button onClick={() => setShowPreventionWizard(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all"><X size={24}/></button>
               </div>
               <div className="p-10">
                 <PreventionWizard modeId={mode.id} onComplete={() => { setShowPreventionWizard(false); onUpdate(); }} />
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ScoreCard({ label, value, levels, color }: { label: string, value: number, levels: any[], color: string }) {
  const current = levels.find(l => l.value === value)
  const bgColors: any = { rose: 'bg-rose-500/10', amber: 'bg-amber-500/10', sky: 'bg-sky-500/10' }
  const textColors: any = { rose: 'text-rose-500', amber: 'text-amber-500', sky: 'text-sky-400' }
  const borderColors: any = { rose: 'border-rose-500/20', amber: 'border-amber-500/20', sky: 'border-sky-500/20' }

  return (
    <div className={`p-8 rounded-[40px] border ${borderColors[color]} ${bgColors[color]} flex flex-col justify-between relative overflow-hidden group min-h-[160px]`}>
       <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity" />
       <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
          <span className={`text-4xl font-black italic tracking-tighter ${textColors[color]}`}>{value}</span>
       </div>
       <div className="space-y-1">
          <p className="text-sm font-black text-white uppercase tracking-tight italic">{current?.label}</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">{current?.desc}</p>
       </div>
    </div>
  )
}

// --- Sub-Wizards ---

function MitigationWizard({ modeId, onComplete }: { modeId: number, onComplete: () => void }) {
  const [formData, setFormData] = useState({ mitigation_type: 'Monitoring', mitigation_steps: '', responsible_team: '' })
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/v1/far/mitigations', { method: 'POST', body: JSON.stringify({ ...data, mode_ids: [modeId] }) })
      return res.json()
    },
    onSuccess: () => { toast.success('Mitigation Active'); onComplete() }
  })
  return (
    <div className="space-y-8">
       <div className="grid grid-cols-2 gap-6">
          {['Monitoring', 'Workaround'].map(t => (
            <button key={t} onClick={() => setFormData({...formData, mitigation_type: t})} className={`p-6 rounded-[30px] border transition-all text-center ${formData.mitigation_type === t ? 'bg-sky-500/20 border-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}>
               <p className="text-[11px] font-black uppercase tracking-[0.2em] italic">{t}</p>
            </button>
          ))}
       </div>
       <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Mitigation Protocol</label>
          <textarea value={formData.mitigation_steps} onChange={e => setFormData({...formData, mitigation_steps: e.target.value.toUpperCase()})} placeholder="TECHNICAL STEPS / MONITORING CONFIGURATION DETAILS..." className="w-full bg-black/40 border border-white/10 rounded-[30px] p-6 text-xs font-black text-white min-h-[160px] outline-none focus:border-sky-500 transition-all uppercase" />
       </div>
       <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Ownership</label>
          <input value={formData.responsible_team} onChange={e => setFormData({...formData, responsible_team: e.target.value.toUpperCase()})} placeholder="RESPONSIBLE TEAM (E.G., SRE / NETWORK)..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-sky-500 transition-all uppercase" />
       </div>
       <button onClick={() => mutation.mutate(formData)} className="w-full bg-sky-600 hover:bg-sky-500 text-white py-5 rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-sky-500/20 transition-all italic">Commit Mitigation Entry</button>
    </div>
  )
}

function ResolutionWizard({ mode, onComplete }: { mode: any, onComplete: () => void }) {
  const [selectedCauseId, setSelectedCauseId] = useState(mode.causes?.[0]?.id || null)
  const [formData, setFormData] = useState({ knowledge_id: null, preventive_follow_up: '', responsible_team: '' })
  
  const { data: bkms } = useQuery({ queryKey: ['knowledge', 'bkms'], queryFn: async () => (await apiFetch('/api/v1/knowledge/?category=BKM')).json() })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/v1/far/resolutions', { method: 'POST', body: JSON.stringify({ ...data, cause_ids: [selectedCauseId] }) })
      return res.json()
    },
    onSuccess: () => { toast.success('Resolution Linked'); onComplete() }
  })

  return (
    <div className="space-y-8">
       <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500 ml-1 italic">Target Root Cause Alignment</label>
          <select value={selectedCauseId} onChange={e => setSelectedCauseId(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-[20px] px-6 py-4 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all appearance-none uppercase italic">
             {mode.causes?.map((c:any) => <option key={c.id} value={c.id}>{c.cause_text.slice(0, 100)}...</option>)}
          </select>
       </div>
       <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500 ml-1 italic">Verified BKM Matrix Linkage</label>
          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
             {bkms?.map((b:any) => (
               <button key={b.id} onClick={() => setFormData({...formData, knowledge_id: b.id})} className={`p-4 rounded-2xl border text-left transition-all ${formData.knowledge_id === b.id ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'}`}>
                  <p className="text-[11px] font-black uppercase tracking-tight italic">{b.title}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">BKM_ID: {b.id}</p>
               </button>
             ))}
          </div>
       </div>
       <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Preventive Follow-up Protocol</label>
          <textarea value={formData.preventive_follow_up} onChange={e => setFormData({...formData, preventive_follow_up: e.target.value.toUpperCase()})} placeholder="DETAILED PREVENTIVE ACTIONS TO PREVENT RECURRENCE..." className="w-full bg-black/40 border border-white/10 rounded-[30px] p-6 text-xs font-black text-white min-h-[120px] outline-none focus:border-emerald-500 transition-all uppercase" />
       </div>
       <button onClick={() => mutation.mutate(formData)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all italic">Map BKM Matrix Alignment</button>
    </div>
  )
}

function PreventionWizard({ modeId, onComplete }: { modeId: number, onComplete: () => void }) {
  const [formData, setFormData] = useState({ prevention_action: '', responsible_team: '', target_date: new Date().toISOString().split('T')[0] })
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/v1/far/prevention', { method: 'POST', body: JSON.stringify({ ...data, failure_mode_id: modeId }) })
      await apiFetch(`/api/v1/far/modes/${modeId}`, { method: 'PUT', body: JSON.stringify({ status: 'Prevented' }) })
      return res.json()
    },
    onSuccess: () => { toast.success('System Permanently Hardened'); onComplete() }
  })
  return (
    <div className="space-y-8">
       <div className="bg-emerald-500/10 p-6 rounded-[30px] border border-emerald-500/20">
          <p className="text-xs text-emerald-400 font-black leading-relaxed uppercase tracking-tight italic">Warning: Promoting to "Prevented" status indicates the risk is architecturally eliminated through engineering hardening.</p>
       </div>
       <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Hardening Description</label>
          <textarea value={formData.prevention_action} onChange={e => setFormData({...formData, prevention_action: e.target.value.toUpperCase()})} placeholder="DESCRIBE ARCHITECTURAL/DESIGN PROOFING CHANGE..." className="w-full bg-black/40 border border-white/10 rounded-[30px] p-6 text-xs font-black text-white min-h-[160px] outline-none focus:border-emerald-500 transition-all uppercase" />
       </div>
       <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Hardening Team</label>
             <input value={formData.responsible_team} onChange={e => setFormData({...formData, responsible_team: e.target.value.toUpperCase()})} placeholder="ENGINEERING TEAM..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all uppercase" />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Completion Target</label>
             <input type="date" value={formData.target_date} onChange={e => setFormData({...formData, target_date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all uppercase" />
          </div>
       </div>
       <button onClick={() => mutation.mutate(formData)} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-5 rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all italic">Finalize Architectural Design Proof</button>
    </div>
  )
}

function CauseWizard({ modeId, onComplete }: { modeId: number, onComplete: () => void }) {
  const [formData, setFormData] = useState<any>({
    cause_text: '',
    occurrence_level: 1,
    responsible_team: '',
    mode_ids: [modeId],
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/v1/far/causes', { method: 'POST', body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to document root cause')
      return res.json()
    },
    onSuccess: () => { toast.success('Root Cause Documented'); onComplete(); },
    onError: (e: any) => toast.error(e.message)
  })

  return (
    <div className="grid grid-cols-1 gap-8">
        <section className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Technical Cause Description *</label>
            <textarea 
              value={formData.cause_text} 
              onChange={e => setFormData({ ...formData, cause_text: e.target.value.toUpperCase() })} 
              placeholder="TECHNICAL DESCRIPTION OF THE FAILURE ORIGIN..." 
              className="w-full bg-black/40 border border-white/10 rounded-[30px] p-6 text-sm font-black tracking-tight outline-none focus:border-amber-500 transition-all min-h-[160px] text-white custom-scrollbar uppercase italic" 
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Responsible Team *</label>
              <input 
                value={formData.responsible_team} 
                onChange={e => setFormData({ ...formData, responsible_team: e.target.value.toUpperCase() })} 
                placeholder="E.G. CLOUD_SRE / NETWORK_OPS" 
                className="w-full bg-black/40 border border-white/10 rounded-[20px] px-6 py-4 text-sm font-black uppercase tracking-tight outline-none focus:border-amber-500 transition-all text-white italic" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Occurrence Score (1-10)</label>
              <ScoreSelector 
                label="" 
                value={formData.occurrence_level} 
                onChange={(v) => setFormData({ ...formData, occurrence_level: v })} 
                levels={OCCURRENCE_LEVELS}
                color="text-amber-500"
              />
            </div>
          </div>
        </section>

        <button 
          disabled={!formData.cause_text || !formData.responsible_team || mutation.isPending}
          onClick={() => mutation.mutate(formData)} 
          className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:grayscale text-white py-6 rounded-[24px] text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-4 italic"
        >
          {mutation.isPending ? <RefreshCcw size={20} className="animate-spin" /> : <Save size={20} />} 
          COMMIT_ROOT_CAUSE
        </button>
    </div>
  )
}

// --- FAR Wizard Component ---
function FARWizard({ onComplete }: { onComplete: () => void }) {
  const [formData, setFormData] = useState<any>({
    system_name: '',
    title: '',
    effect: '',
    severity: 1,
    occurrence: 1,
    detection: 1,
    affected_assets: [],
    cause_ids: [],
  })
  const [assetSearch, setAssetSearch] = useState('')

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await apiFetch('/api/v1/settings/options')).json() })
  const systems = options?.filter((o: any) => o.category === 'LogicalSystem') || []
  
  const { data: devices } = useQuery({ 
    queryKey: ['devices', formData.system_name], 
    enabled: !!formData.system_name,
    queryFn: async () => (await apiFetch(`/api/v1/devices/?system=${encodeURIComponent(formData.system_name)}`)).json() 
  })

  const filteredDevices = useMemo(() => {
    if (!devices) return []
    if (!assetSearch) return devices
    return devices.filter((d: any) => 
      d.name.toLowerCase().includes(assetSearch.toLowerCase()) || 
      d.model.toLowerCase().includes(assetSearch.toLowerCase())
    )
  }, [devices, assetSearch])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/v1/far/modes', { method: 'POST', body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to document failure mode')
      return res.json()
    },
    onSuccess: () => { toast.success('Failure Mode Documented'); onComplete(); },
    onError: (e: any) => toast.error(e.message)
  })

  const rpn = formData.severity * formData.occurrence * formData.detection

  return (
    <div className="grid grid-cols-12 gap-12">
      <div className="col-span-7 space-y-10">
        <section className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Logical System Alignment *</label>
            <StyledSelect 
              options={systems.map((s: any) => ({ label: s.label, value: s.value }))}
              value={formData.system_name}
              onChange={(e) => setFormData({ ...formData, system_name: e.target.value })}
              placeholder="Select Target System..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Failure Mode Title *</label>
            <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value.toUpperCase() })} placeholder="E.G. CORE_NETWORK_CONGESTION" className="w-full bg-black/40 border border-white/10 rounded-[20px] px-6 py-4 text-sm font-black uppercase tracking-tight outline-none focus:border-rose-500 transition-all text-white italic" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Impact / Effect Statement</label>
            <textarea value={formData.effect} onChange={e => setFormData({ ...formData, effect: e.target.value.toUpperCase() })} placeholder="WHAT ARE THE CONSEQUENCES WHEN THIS FAILURE MODE ACTIVATES?" className="w-full bg-black/40 border border-white/10 rounded-[30px] p-6 text-sm font-black tracking-tight outline-none focus:border-rose-500 transition-all min-h-[140px] text-white custom-scrollbar uppercase italic" />
          </div>
        </section>

        <section className="bg-black/20 p-8 rounded-[40px] border border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">ASSET_ATTRIBUTION</label>
            {formData.system_name && (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input 
                  value={assetSearch}
                  onChange={e => setAssetSearch(e.target.value)}
                  placeholder="FILTER..."
                  className="bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-rose-500 w-48 transition-all"
                />
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-3 custom-scrollbar">
            {formData.system_name ? (
              filteredDevices.map((d: any) => (
                <label key={d.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${formData.affected_assets.includes(d.id) ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/10' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'}`}>
                  <input type="checkbox" className="sr-only" checked={formData.affected_assets.includes(d.id)} onChange={() => {
                    const next = formData.affected_assets.includes(d.id) ? formData.affected_assets.filter((id: any) => id !== d.id) : [...formData.affected_assets, d.id]
                    setFormData({ ...formData, affected_assets: next })
                  }} />
                  <Server size={18} className={formData.affected_assets.includes(d.id) ? 'text-rose-500' : 'text-slate-600'} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-tight leading-none truncate italic">{d.name}</p>
                    <p className="text-[9px] text-slate-500 font-black uppercase truncate mt-1 tracking-widest">{d.model}</p>
                  </div>
                </label>
              ))
            ) : (
              <div className="col-span-2 py-12 text-center text-[10px] font-black uppercase text-slate-600 tracking-[0.3em] italic">
                Select system to link infrastructure assets
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="col-span-5 space-y-10">
        <div className="bg-rose-500/5 p-8 rounded-[40px] border border-rose-500/10 space-y-10 shadow-inner">
          <ScoreSelector 
            label="Severity (S)" 
            value={formData.severity} 
            onChange={(v) => setFormData({ ...formData, severity: v })} 
            levels={SEVERITY_LEVELS}
            color="text-rose-500"
          />
          <ScoreSelector 
            label="Occurrence (O)" 
            value={formData.occurrence} 
            onChange={(v) => setFormData({ ...formData, occurrence: v })} 
            levels={OCCURRENCE_LEVELS}
            color="text-amber-500"
          />
          <ScoreSelector 
            label="Detection (D)" 
            value={formData.detection} 
            onChange={(v) => setFormData({ ...formData, detection: v })} 
            levels={DETECTION_LEVELS}
            color="text-sky-400"
          />
        </div>

        <div className="bg-slate-900 rounded-[40px] p-10 border border-white/10 flex flex-col space-y-8 shadow-2xl overflow-hidden relative group">
           <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent pointer-events-none" />
           <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">CALCULATED_RPN_INDEX</p>
              <div className="flex items-baseline gap-4 mt-2">
                <h4 className={`text-7xl font-black tracking-tighter italic transition-colors ${rpn > 100 ? 'text-rose-500' : 'text-white'}`}>{rpn}</h4>
                <div className="flex flex-col">
                   <span className={`text-sm font-black uppercase tracking-widest italic ${rpn > 100 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                      {rpn > 100 ? 'CRITICAL_RISK' : 'NOMINAL_RISK'}
                   </span>
                   <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Impact Factor</span>
                </div>
              </div>
           </div>
           <button 
             disabled={!formData.system_name || !formData.title || mutation.isPending}
             onClick={() => mutation.mutate(formData)} 
             className="relative z-10 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:grayscale text-white py-6 rounded-[24px] text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-4 italic"
           >
             {mutation.isPending ? <RefreshCcw size={20} className="animate-spin" /> : <Save size={20} />} 
             COMMIT_FAILURE_MODE
           </button>
        </div>
      </div>
    </div>
  )
}

function ScoreSelector({ label, value, onChange, levels, color }: { label: string, value: number, onChange: (v: number) => void, levels: any[], color: string }) {
  const [showOptions, setShowOptions] = useState(false)
  const currentLevel = levels.find(l => l.value === value)

  return (
    <div className="space-y-4 relative">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">{label}</label>
        <span className={`text-2xl font-black ${color} italic tracking-tighter`}>{value}</span>
      </div>
      
      <button 
        onClick={() => setShowOptions(!showOptions)}
        className="w-full bg-black/40 border border-white/10 rounded-3xl p-5 text-left hover:border-white/20 transition-all flex items-center justify-between shadow-lg"
      >
        <div className="min-w-0">
          <p className="text-xs font-black text-white uppercase tracking-tight truncate italic">{currentLevel?.label}</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 line-clamp-1 tracking-widest">{currentLevel?.desc}</p>
        </div>
        <ChevronRight size={18} className={`text-slate-600 transition-transform ${showOptions ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {showOptions && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[160] left-0 right-0 top-full mt-3 bg-slate-900 border border-white/10 rounded-[30px] shadow-2xl max-h-60 overflow-y-auto custom-scrollbar overflow-hidden p-2"
          >
            {levels.map((level) => (
              <button
                key={level.value}
                onClick={() => { onChange(level.value); setShowOptions(false); }}
                className={`w-full text-left p-4 border-b border-white/5 last:border-0 hover:bg-white/5 rounded-2xl transition-all ${value === level.value ? 'bg-white/5' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-black uppercase tracking-tight italic ${value === level.value ? color : 'text-white'}`}>{level.label}</span>
                  <span className={`text-xs font-black italic ${value === level.value ? color : 'text-slate-600'}`}>{level.value}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight font-bold uppercase tracking-widest">{level.desc}</p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
