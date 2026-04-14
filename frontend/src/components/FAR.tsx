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
  ChevronLeft, Book, Download, Copy, Terminal, Check, HelpCircle, EyeOff, MoreVertical
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

const METRIC_DEFINITIONS: any = {
  SRI: {
    title: "System Reliability Index (SRI)",
    formula: "100 * (1 - (Avg RPN / 500))",
    description: "Represents the aggregate health of the infrastructure's risk profile. A score of 100 signifies zero documented risk exposure, while lower scores indicate high-criticality failure modes with frequent occurrence or visibility gaps."
  },
  RiskDensity: {
    title: "Risk Density Profile",
    formula: "Total Accumulated RPN / Total Affected Infrastructure Assets",
    description: "Measures risk concentration across assets. High density indicates that a small number of physical or logical assets are bearing a disproportionate amount of system-wide failure risk."
  },
  MitigationRatio: {
    title: "Global Mitigation Coverage",
    formula: "(Count of Modes with Active Mitigations / Total Documented Modes) * 100",
    description: "Evaluates the breadth of the defense-in-depth strategy. Measures the percentage of failure modes that have at least one verified Monitoring or temporary Workaround protocol established."
  },
  AvgSeverity: {
    title: "Mean Failure Criticality",
    formula: "Arithmetic Mean of RPN [Σ RPN / N]",
    description: "The average Risk Priority Number across the entire registry. Used to monitor long-term trends in the inherent severity of documented risks, independent of the number of entries."
  }
}

function MetricHelpModal({ metric, onClose }: { metric: string | null, onClose: () => void }) {
  if (!metric || !METRIC_DEFINITIONS[metric]) return null;
  const def = METRIC_DEFINITIONS[metric];
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-md p-10 rounded-[40px] border border-blue-500/30 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-xl font-black uppercase tracking-tighter text-blue-400 italic flex items-center space-x-3">
             <Info size={24}/> <span>{def.title}</span>
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Mathematical Derivation</p>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-[11px] text-blue-300">
               {def.formula}
            </div>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Functional Definition</p>
            <p className="text-[12px] text-slate-300 leading-relaxed font-bold uppercase tracking-tight italic">
              {def.description}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-blue-500/20">Acknowledge</button>
      </motion.div>
    </div>
  )
}

export default function FAR() {
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [selectedModeId, setSelectedModeId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSystems, setSelectedSystems] = useState<string[]>([])
  const [showMaturityHelp, setShowMaturityHelp] = useState(false)
  const [activeMetricHelp, setActiveMetricHelp] = useState<string | null>(null)

  // Column Picker & Style Lab State (Mirrored from AssetGrid)
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(10)
  const [showStyleLab, setShowStyleLab] = useState(true)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([])
  const [showConfig, setShowConfig] = useState(false)
  
  const [confirmModal, setConfirmModal] = useState<{show: boolean, title: string, message: string, onConfirm: () => void}>({
    show: false, title: '', message: '', onConfirm: () => {}
  })

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm })
  }

  // Queries
  const { data: modes, isLoading: modesLoading } = useQuery({ 
    queryKey: ['far', 'modes'], 
    queryFn: async () => (await apiFetch('/api/v1/far/modes')).json() 
  })

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await apiFetch('/api/v1/settings/options')).json() })
  const availableSystems = useMemo(() => {
    return options?.filter((o: any) => o.category === 'LogicalSystem').map((s: any) => s.value) || []
  }, [options])

  const filteredModes = useMemo(() => {
    let result = modes || []
    if (selectedSystems.length > 0) result = result.filter((m: any) => selectedSystems.includes(m.system_name))
    if (searchTerm) {
      result = result.filter((m: any) => 
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.system_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    return result
  }, [modes, searchTerm, selectedSystems])

  const selectedMode = useMemo(() => modes?.find((m: any) => m.id === selectedModeId), [modes, selectedModeId])

  // Bulk Deletion
  const bulkMutation = useMutation({
    mutationFn: async ({ action, ids }: { action: string, ids: number[] }) => {
      if (action === 'delete') {
        const res = await apiFetch('/api/v1/far/modes/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) })
        return res.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['far'] })
      toast.success('Failure Matrix Updated')
      setConfirmModal({ ...confirmModal, show: false })
    },
    onError: (e: any) => toast.error(e.message)
  })

  // AgGrid Defs (High Density)
  const columnDefs = useMemo(() => [
    { field: "id", headerName: "", width: 60, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left', cellClass: 'text-center pl-4', headerClass: 'text-center pl-4' },
    { 
      field: "id", 
      headerName: "ID", 
      width: 80,
      cellClass: 'text-center font-black text-slate-500',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
    },
    { 
      field: "system_name", 
      headerName: "System", 
      width: 130,
      cellClass: 'text-center font-black text-rose-400 uppercase italic',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      hide: hiddenColumns.includes("system_name")
    },
    { 
      field: "title", 
      headerName: "Failure Mode", 
      flex: 1.5,
      cellClass: 'text-left font-black uppercase italic text-white',
      headerClass: 'text-left',
      filter: 'agTextColumnFilter',
      hide: hiddenColumns.includes("title")
    },
    { 
      field: "severity", 
      headerName: "S", 
      width: 60,
      cellClass: 'text-center font-black italic text-rose-500 bg-rose-500/5',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      hide: hiddenColumns.includes("severity")
    },
    { 
      field: "occurrence", 
      headerName: "O", 
      width: 60,
      cellClass: 'text-center font-black italic text-amber-500 bg-amber-500/5',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      hide: hiddenColumns.includes("occurrence")
    },
    { 
      field: "detection", 
      headerName: "D", 
      width: 60,
      cellClass: 'text-center font-black italic text-sky-400 bg-sky-400/5',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      hide: hiddenColumns.includes("detection")
    },
    { 
      field: "rpn", 
      headerName: "RPN", 
      width: 80,
      cellClass: 'text-center font-black italic',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      cellRenderer: (p: any) => (
        <span className={p.value > 100 ? 'text-rose-500 underline decoration-rose-500/30' : 'text-emerald-400'}>
          {p.value}
        </span>
      ),
      hide: hiddenColumns.includes("rpn")
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 140,
      cellClass: 'text-center',
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
      headerName: "Ops",
      width: 140,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex rounded-lg p-0.5 border border-white/5 bg-transparent">
               <button onClick={() => setSelectedModeId(p.data.id)} title="View Detail Matrix" className="p-1.5 text-blue-400 hover:text-blue-200 transition-all border-r border-white/5"><Eye size={14}/></button>
               <button onClick={() => { setSelectedModeId(p.data.id); setShowWizard(true); }} title="Modify Risk Logic" className="p-1.5 text-emerald-400 hover:text-emerald-200 transition-all border-r border-white/5"><Edit2 size={14}/></button>
               <button onClick={() => openConfirm('Purge Risk', 'Permanently purge this failure mode?', () => bulkMutation.mutate({ action: 'delete', ids: [p.data.id] }))} title="Purge Mode" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      )
    }
  ], [fontSize, hiddenColumns]) as any

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

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic flex items-center gap-2">
                <Target size={24} className="text-rose-500" /> Failure Matrix
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">Reliability Knowledge Engine // FMEA Studio</p>
           </div>
        </div>
        
        <div className="flex items-center space-x-3">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Scan risk vectors..."
                className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-rose-500/50 w-64 transition-all"
              />
           </div>

           <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5 space-x-1">
             <button onClick={() => setShowStyleLab(!showStyleLab)} className={`p-1.5 rounded-lg transition-all ${showStyleLab ? 'bg-rose-500/20 text-rose-400' : 'hover:bg-white/10 text-slate-500'}`} title="Style Laboratory">
                <Activity size={16} />
             </button>
             <button onClick={() => setShowColumnPicker(!showColumnPicker)} className={`p-1.5 rounded-lg transition-all ${showColumnPicker ? 'bg-rose-500/20 text-rose-400' : 'hover:bg-white/10 text-slate-500'}`} title="Column Configuration">
                <Sliders size={16} />
             </button>
             <button onClick={() => setShowConfig(true)} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-rose-400 rounded-lg transition-all" title="Matrix Registry Enums">
                <Settings size={16} />
             </button>
          </div>

           <button 
             onClick={() => { setSelectedModeId(null); setShowWizard(true); }}
             className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/10 active:scale-95 transition-all flex items-center gap-2"
           >
             <ShieldAlert size={14} /> Add Failure Mode
           </button>
        </div>
      </div>

      <AnimatePresence>
        {showStyleLab && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-rose-600/10 border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md">
               <div className="flex items-center space-x-12">
                  <div className="flex items-center space-x-3">
                     <Activity size={16} className="text-rose-400" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">View Density Laboratory</span>
                  </div>
                  <div className="flex items-center space-x-6">
                     <div className="flex items-center space-x-4"><span className="text-[9px] font-black text-slate-500 uppercase">Font Size</span><div className="flex items-center space-x-2"><input type="range" min="8" max="14" step="1" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-32 accent-rose-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"/><span className="text-[10px] text-white w-4 font-black">{fontSize}px</span></div></div>
                     <div className="flex items-center space-x-4 border-l border-white/10 pl-6"><span className="text-[9px] font-black text-slate-500 uppercase">Row Density</span><div className="flex items-center space-x-2"><input type="range" min="4" max="24" step="2" value={rowDensity} onChange={e => setRowDensity(Number(e.target.value))} className="w-32 accent-rose-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"/><span className="text-[10px] text-white w-4 font-black">{rowDensity}px</span></div></div>
                  </div>
               </div>
               <button onClick={() => setShowStyleLab(false)} className="text-slate-500 hover:text-white transition-colors"><X size={16}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
         <button onClick={() => setSelectedSystems([])} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedSystems.length === 0 ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}>GLOBAL_REALM</button>
         {availableSystems.map(sys => (
           <button key={sys} onClick={() => setSelectedSystems(prev => prev.includes(sys) ? prev.filter(s => s !== sys) : [...prev, sys])} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${selectedSystems.includes(sys) ? 'bg-white/10 border-white/20 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}>{sys}</button>
         ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
         <StatCard id="SRI" label="Reliability Index" value={metrics.sri} suffix="/100" color={metrics.sri > 70 ? "emerald" : "rose"} onHelp={() => setActiveMetricHelp("SRI")} />
         <StatCard id="RiskDensity" label="Risk Density" value={metrics.riskDensity} suffix="RPN/ASSET" color="amber" onHelp={() => setActiveMetricHelp("RiskDensity")} />
         <StatCard id="MitigationRatio" label="Mitigation Ratio" value={metrics.mitRatio} suffix="%" color="sky" onHelp={() => setActiveMetricHelp("MitigationRatio")} />
         <StatCard id="AvgSeverity" label="Avg Severity" value={metrics.avgRPN} suffix="AVG RPN" color="rose" onHelp={() => setActiveMetricHelp("AvgSeverity")} />
      </div>

      <div className="flex-1 min-h-0 flex flex-col glass-panel rounded-3xl border-white/5 bg-[#0a0c14]/40 overflow-hidden">
           <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <ShieldAlert size={14} className="text-rose-500" />
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-white italic">Failure Inventory Maturity Profile</h3>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-end gap-1 h-8">
                    {maturityLevels.slice().reverse().map((ml: any) => {
                      const count = (metrics as any).maturityDist[ml.lv] || 0
                      const pct = filteredModes?.length ? (count / filteredModes.length) * 100 : 0
                      return (
                        <div key={ml.lv} className="w-4 h-full relative group cursor-help">
                            <div className={`w-full h-full rounded-t-sm transition-all ${ml.color} ${count === 0 ? 'opacity-5' : 'opacity-40 group-hover:opacity-100'}`} style={{ height: `${Math.max(10, pct)}%` }} />
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] whitespace-nowrap bg-black border border-white/10 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">
                               {ml.label}: {count}
                            </div>
                        </div>
                      )
                    })}
                 </div>
                 <div className="w-px h-4 bg-white/10 mx-2" />
                 <button onClick={() => setShowMaturityHelp(true)} className="p-1 text-slate-500 hover:text-white transition-colors" title="Maturity Level Definitions"><HelpCircle size={14} /></button>
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
                onRowClicked={(p: any) => setSelectedModeId(p.data.id)}
              />
              <AnimatePresence>
                {showColumnPicker && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute top-0 right-0 bottom-0 w-64 bg-slate-950/90 backdrop-blur-xl border-l border-white/10 z-[60] flex flex-col shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-widest text-rose-400 flex items-center space-x-2"><Sliders size={14} /> <span>Columns</span></h3><button onClick={() => setShowColumnPicker(false)} className="text-slate-500 hover:text-white"><X size={18}/></button></div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                      {columnDefs.filter((c: any) => c.field && !c.suppressHide).map((col: any) => (
                        <label key={col.field} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-all">
                          <input type="checkbox" checked={!hiddenColumns.includes(col.field)} onChange={() => setHiddenColumns(prev => prev.includes(col.field) ? prev.filter(f => f !== col.field) : [...prev, col.field])} className="sr-only" />
                          <div className={`w-4 h-4 rounded border transition-all ${!hiddenColumns.includes(col.field) ? 'bg-rose-600 border-rose-500 shadow-lg shadow-rose-500/20' : 'border-white/10 bg-black/40 group-hover:border-white/20'}`}>{!hiddenColumns.includes(col.field) && <Check size={12} className="text-white mx-auto" />}</div>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${!hiddenColumns.includes(col.field) ? 'text-slate-200' : 'text-slate-500'}`}>{col.headerName || col.field}</span>
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
            <FailureDetailView mode={selectedMode} onClose={() => setSelectedModeId(null)} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['far'] })} />
          )}
      </AnimatePresence>

      <AnimatePresence>
        {showMaturityHelp && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-10">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-2xl rounded-[40px] border border-white/10 bg-slate-900 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                   <h2 className="text-xl font-black uppercase tracking-widest text-white italic">Maturity Matrix Glossary</h2>
                   <button onClick={() => setShowMaturityHelp(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
                </div>
                <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                   <table className="w-full text-[10px]">
                      <thead className="bg-white/5 border-b border-white/5">
                         <tr>
                            <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Lv</th>
                            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Status Title</th>
                            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Architecture Definition</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {maturityLevels.map(ml => (
                           <tr key={ml.lv} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded font-black italic text-white shadow-lg ${ml.color}`}>{ml.lv}</span></td>
                              <td className="px-4 py-3 font-black text-white uppercase italic">{ml.label}</td>
                              <td className="px-4 py-3 text-slate-400 font-bold uppercase tracking-tight">{ml.tooltip}</td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MetricHelpModal metric={activeMetricHelp} onClose={() => setActiveMetricHelp(null)} />

      <ConfigRegistryModal isOpen={showConfig} onClose={() => setShowConfig(false)} title="Reliability Matrix Registry" sections={[{ title: "Systems", category: "LogicalSystem", icon: LayoutGrid }, { title: "Risk Cats", category: "RiskCategory", icon: Target }, { title: "Teams", category: "BusinessUnit", icon: User }]} />

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
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-size: ${fontSize}px !important; justify-content: center !important; font-style: italic !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; font-weight: 700 !important; }
        .ag-row-hover { background-color: rgba(244, 63, 94, 0.05) !important; }
        .ag-row-selected { background-color: rgba(244, 63, 94, 0.2) !important; }
      `}</style>

      <AnimatePresence>
        {showWizard && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-6xl h-[85vh] flex flex-col rounded-[40px] border border-rose-500/20 overflow-hidden shadow-2xl">
               <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
                  <div>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">DOCUMENT_FAILURE_VECTOR</h1>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em]">Reliability Engineering Risk Documentation Studio</p>
                  </div>
                  <button onClick={() => setShowWizard(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-all"><X size={20}/></button>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                 <FARWizard initialData={selectedMode} onComplete={() => { setShowWizard(false); queryClient.invalidateQueries({ queryKey: ['far'] }); }} />
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal isOpen={confirmModal.show} onClose={() => setConfirmModal({ ...confirmModal, show: false })} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} />
    </div>
  )
}

function StatCard({ id, label, value, suffix, color, onHelp }: any) {
  const bgColors: any = { emerald: 'bg-emerald-500/5', rose: 'bg-rose-500/5', amber: 'bg-amber-500/5', sky: 'bg-sky-500/5' }
  const textColors: any = { emerald: 'text-emerald-400', rose: 'text-rose-400', amber: 'text-amber-400', sky: 'text-sky-400' }
  return (
    <div className={`glass-panel p-4 rounded-2xl border-white/5 ${bgColors[color]} flex flex-col justify-between group overflow-hidden relative min-h-[90px]`}>
      <div className="flex items-center justify-between relative z-10">
         <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
         <button onClick={onHelp} className="p-1 text-slate-600 hover:text-white transition-colors"><HelpCircle size={12}/></button>
      </div>
      <div className="flex items-baseline gap-1 relative z-10 leading-none mt-2">
         <h4 className={`text-2xl font-black tracking-tighter italic ${textColors[color]}`}>{value}</h4>
         <span className="text-[9px] font-black text-slate-600 uppercase italic tracking-tighter">{suffix}</span>
      </div>
    </div>
  )
}

function FailureDetailView({ mode, onClose, onUpdate }: { mode: any, onClose: () => void, onUpdate: () => void }) {
  const [activeTab, setActiveTab] = useState('analysis')
  const queryClient = useQueryClient()
  const [activeWizard, setActiveWizard] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-10 font-bold uppercase tracking-tight">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-7xl max-h-[90vh] flex flex-col rounded-[40px] border border-rose-500/20 bg-black overflow-hidden shadow-2xl">
         <div className="px-10 py-8 border-b border-white/5 bg-white/5 flex flex-col shrink-0">
            <div className="flex items-start justify-between">
              <div>
                  <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-0.5 rounded-lg bg-rose-600/20 border border-rose-500/30 text-[8px] font-black text-rose-500">ID: {mode.id}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black text-slate-400">{mode.system_name}</span>
                  </div>
                  <h2 className="text-4xl font-black text-white italic tracking-tighter leading-none">{mode.title}</h2>
              </div>
              <div className="flex items-start gap-8">
                  <div className="text-right">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Risk Profile Index</p>
                      <p className={`text-5xl font-black italic leading-none tracking-tighter ${mode.rpn > 100 ? 'text-rose-500' : 'text-white'}`}>{mode.rpn}</p>
                  </div>
                  <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-all ml-4"><X size={20}/></button>
              </div>
            </div>
            <div className="mt-4 flex space-x-1 bg-black/40 p-0.5 rounded-xl border border-white/5 w-fit">
              {[{ id: 'analysis', label: 'Analysis', icon: Target }, { id: 'impact', label: 'Impact', icon: Server }, { id: 'causal', label: 'Causal', icon: Zap }, { id: 'roadmap', label: 'Roadmap', icon: ShieldCheck }].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === t.id ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><t.icon size={10} /> {t.label}</button>
              ))}
            </div>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {activeTab === 'analysis' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-3 gap-4">
                   <ScoreCell label="Severity" value={mode.severity} levels={SEVERITY_LEVELS} color="rose" />
                   <ScoreCell label="Occurrence" value={mode.occurrence} levels={OCCURRENCE_LEVELS} color="amber" />
                   <ScoreCell label="Detection" value={mode.detection} levels={DETECTION_LEVELS} color="sky" />
                </div>
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-6">
                   <h3 className="text-[9px] font-black uppercase text-rose-400 mb-2 tracking-widest">Systemic Effect Forensics</h3>
                   <p className="text-base font-black text-white italic leading-relaxed uppercase tracking-tight">{mode.effect || 'NO EFFECT STATEMENT DOCUMENTED'}</p>
                </div>
              </div>
            )}

            {activeTab === 'impact' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex items-center justify-between px-2"><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Affected Infrastructure Entities</h3></div>
                 <div className="bg-black/20 border border-white/5 rounded-3xl overflow-hidden">
                    <table className="w-full text-[10px]">
                       <thead className="bg-white/5 border-b border-white/5">
                          <tr>
                             <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Instance Name</th>
                             <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Entity Model</th>
                             <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Type</th>
                             <th className="px-4 py-2 text-right font-black uppercase tracking-widest text-slate-500">Identity Tag</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {mode.affected_assets?.map((a: any) => (
                            <tr key={a.id} className="hover:bg-white/5 transition-colors">
                               <td className="px-4 py-3 font-black text-white uppercase italic">{a.name}</td>
                               <td className="px-4 py-3 text-slate-400 font-bold uppercase tracking-tight">{a.model}</td>
                               <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 rounded border border-white/10 text-slate-500 text-[9px] font-black uppercase">{a.type}</span></td>
                               <td className="px-4 py-3 text-right font-mono text-blue-400">{a.asset_tag || 'UNTAGGED'}</td>
                            </tr>
                          ))}
                          {(!mode.affected_assets?.length) && <tr><td colSpan={4} className="py-20 text-center opacity-20 font-black italic uppercase tracking-widest">No infrastructure mappings</td></tr>}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}

            {activeTab === 'causal' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                 <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500 italic">Root Cause Attribution Matrix</h3>
                       <button onClick={() => setActiveWizard('cause')} className="text-[9px] font-black text-amber-500 hover:text-white uppercase tracking-widest">+ Link Trace Origin</button>
                    </div>
                    <div className="bg-black/20 border border-white/5 rounded-3xl overflow-hidden">
                       <table className="w-full text-[10px]">
                          <thead className="bg-white/5 border-b border-white/5">
                             <tr>
                                <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Trace Description</th>
                                <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Occur Lv</th>
                                <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Responsible Unit</th>
                                <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">BKM Alignment</th>
                                <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Ops</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                             {mode.causes?.map((c: any) => (
                               <tr key={c.id} className="hover:bg-white/5 transition-colors">
                                  <td className="px-4 py-4 font-black text-white uppercase italic max-w-sm truncate" title={c.cause_text}>{c.cause_text}</td>
                                  <td className="px-4 py-4 text-center font-black text-amber-500 italic">{c.occurrence_level}/10</td>
                                  <td className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{c.responsible_team}</td>
                                  <td className="px-4 py-4 text-center">
                                     <div className="flex justify-center gap-1">
                                        {c.resolutions?.length > 0 ? (
                                          <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase">{c.resolutions.length} BKMs</div>
                                        ) : (
                                          <button onClick={() => setActiveWizard('resolution')} className="text-[8px] font-black text-rose-500 hover:text-white uppercase">UNALIGNED</button>
                                        )}
                                     </div>
                                  </td>
                                  <td className="px-4 py-4 text-center"><button className="p-1.5 text-slate-600 hover:text-rose-500"><Trash2 size={14}/></button></td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'roadmap' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                 <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-sky-400 italic">Defense Mitigations (Monitors & Workarounds)</h3>
                       <button onClick={() => setActiveWizard('mitigation')} className="text-[9px] font-black text-sky-400 hover:text-white uppercase tracking-widest">+ Add Shield</button>
                    </div>
                    <div className="bg-black/20 border border-white/5 rounded-3xl overflow-hidden">
                       <table className="w-full text-[10px]">
                          <thead className="bg-white/5 border-b border-white/5">
                             <tr>
                                <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Type</th>
                                <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Mitigation Protocol Description</th>
                                <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Team</th>
                                <th className="px-4 py-2 text-center font-black uppercase tracking-widest text-slate-500">Ops</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                             {mode.mitigations?.map((m: any) => (
                               <tr key={m.id} className="hover:bg-white/5 transition-colors">
                                  <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded font-black text-[9px] ${m.mitigation_type === 'Monitoring' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20' : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'}`}>{m.mitigation_type}</span></td>
                                  <td className="px-4 py-3 font-black text-white uppercase italic">{m.mitigation_steps}</td>
                                  <td className="px-4 py-3 text-center text-slate-500 font-black">{m.responsible_team}</td>
                                  <td className="px-4 py-3 text-center"><button className="p-1.5 text-slate-600 hover:text-rose-500"><Trash2 size={14}/></button></td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
                 <div className="flex justify-end pt-4 border-t border-white/5">
                    <button onClick={() => setActiveWizard('prevention')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 italic"><ShieldCheck size={14} /> Promote to Prevented Architecture</button>
                 </div>
              </div>
            )}
         </div>
      </motion.div>

      <AnimatePresence>
        {activeWizard === 'cause' && <ModalContainer title="Log Root Cause Trace" onClose={() => setActiveWizard(null)}><CauseWizard modeId={mode.id} onComplete={() => { setActiveWizard(null); onUpdate(); }} /></ModalContainer>}
        {activeWizard === 'mitigation' && <ModalContainer title="Establish Mitigation Shield" onClose={() => setActiveWizard(null)}><MitigationWizard modeId={mode.id} onComplete={() => { setActiveWizard(null); onUpdate(); }} /></ModalContainer>}
        {activeWizard === 'resolution' && <ModalContainer title="Align BKM Alignment" onClose={() => setActiveWizard(null)}><ResolutionWizard mode={mode} onComplete={() => { setActiveWizard(null); onUpdate(); }} /></ModalContainer>}
        {activeWizard === 'prevention' && <ModalContainer title="Architectural Hardening" onClose={() => setActiveWizard(null)}><PreventionWizard modeId={mode.id} onComplete={() => { setActiveWizard(null); onUpdate(); }} /></ModalContainer>}
      </AnimatePresence>
    </div>
  )
}

function ModalContainer({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10 font-bold uppercase tracking-tight">
       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-2xl rounded-[40px] border border-white/10 bg-black overflow-hidden shadow-2xl">
          <div className="px-10 py-6 border-b border-white/5 flex items-center justify-between"><h2 className="text-xl font-black text-white italic tracking-tighter">{title}</h2><button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-all"><X size={20}/></button></div>
          <div className="p-10">{children}</div>
       </motion.div>
    </div>
  )
}

function ScoreCell({ label, value, levels, color }: any) {
  const current = levels.find((l: any) => l.value === value)
  const textColors: any = { rose: 'text-rose-500', amber: 'text-amber-500', sky: 'text-sky-400' }
  return (
    <div className="p-3 rounded-2xl border border-white/5 bg-white/5 flex flex-col items-center text-center">
       <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
       <p className={`text-xl font-black italic leading-none ${textColors[color]}`}>{value}</p>
       <p className="text-[8px] font-black text-white uppercase tracking-tight italic mt-1 leading-tight">{current?.label}</p>
    </div>
  )
}

function FARWizard({ initialData, onComplete }: any) {
  const [formData, setFormData] = useState<any>({ system_name: '', title: '', effect: '', severity: 1, occurrence: 1, detection: 1, affected_assets: [], ...initialData })
  const [assetSearch, setAssetSearch] = useState('')
  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await apiFetch('/api/v1/settings/options')).json() })
  const systems = options?.filter((o: any) => o.category === 'LogicalSystem') || []
  const { data: devices } = useQuery({ queryKey: ['devices', formData.system_name], enabled: !!formData.system_name, queryFn: async () => (await apiFetch(`/api/v1/devices/?system=${encodeURIComponent(formData.system_name)}`)).json() })
  const mutation = useMutation({ mutationFn: async (data: any) => (await apiFetch(data.id ? `/api/v1/far/modes/${data.id}` : '/api/v1/far/modes', { method: data.id ? 'PUT' : 'POST', body: JSON.stringify(data) })).json(), onSuccess: () => { toast.success('Registry Synchronized'); onComplete(); } })
  const rpn = formData.severity * formData.occurrence * formData.detection

  return (
    <div className="grid grid-cols-12 gap-8 font-bold uppercase tracking-tight">
       <div className="col-span-7 space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 italic">System Realm *</label><StyledSelect options={systems.map((s: any) => ({ label: s.label, value: s.value }))} value={formData.system_name} onChange={e => setFormData({ ...formData, system_name: e.target.value })} /></div>
             <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 italic">Mode Identity *</label><input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value.toUpperCase() })} placeholder="FAILURE_VECTOR_NAME" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs font-black uppercase text-white outline-none focus:border-rose-500 italic" /></div>
          </div>
          <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 italic">Impact Statement</label><textarea value={formData.effect} onChange={e => setFormData({ ...formData, effect: e.target.value.toUpperCase() })} placeholder="DESCRIBE THE SYSTEMIC CONSEQUENCES..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-black uppercase text-white min-h-[100px] outline-none focus:border-rose-500 custom-scrollbar italic" /></div>
          <div className="bg-black/20 p-4 rounded-3xl border border-white/5 space-y-3">
             <div className="flex items-center justify-between"><label className="text-[8px] font-black text-slate-500 italic">Infrastructure Attribution</label><input value={assetSearch} onChange={e => setAssetSearch(e.target.value)} placeholder="Filter..." className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[8px] font-black outline-none focus:border-rose-500 w-24" /></div>
             <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                {devices?.filter((d: any) => !assetSearch || d.name.toLowerCase().includes(assetSearch.toLowerCase())).map((d: any) => (
                  <label key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.affected_assets.includes(d.id) ? 'bg-rose-500/10 border-rose-500 text-white shadow-lg shadow-rose-500/5' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}><input type="checkbox" className="sr-only" checked={formData.affected_assets.includes(d.id)} onChange={() => setFormData({ ...formData, affected_assets: formData.affected_assets.includes(d.id) ? formData.affected_assets.filter((id: any) => id !== d.id) : [...formData.affected_assets, d.id] })} /><Server size={14} className={formData.affected_assets.includes(d.id) ? 'text-rose-500' : 'text-slate-700'} /><div className="min-w-0"><p className="text-[10px] font-black truncate italic leading-none">{d.name}</p><p className="text-[8px] text-slate-600 font-black truncate mt-1">{d.model}</p></div></label>
                ))}
             </div>
          </div>
       </div>
       <div className="col-span-5 space-y-6">
          <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 space-y-8">
             <ScoreSelectorSmall label="Severity" value={formData.severity} onChange={(v: any) => setFormData({ ...formData, severity: v })} levels={SEVERITY_LEVELS} color="text-rose-500" />
             <ScoreSelectorSmall label="Occurrence" value={formData.occurrence} onChange={(v: any) => setFormData({ ...formData, occurrence: v })} levels={OCCURRENCE_LEVELS} color="text-amber-500" />
             <ScoreSelectorSmall label="Detection" value={formData.detection} onChange={(v: any) => setFormData({ ...formData, detection: v })} levels={DETECTION_LEVELS} color="text-sky-400" />
          </div>
          <div className="bg-slate-900 rounded-3xl p-6 border border-white/10 flex flex-col items-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 blur-[40px] pointer-events-none" />
             <p className="text-[9px] font-black text-slate-500 italic mb-2">Vector Risk Score (RPN)</p>
             <div className="flex items-baseline gap-2 mb-4"><h4 className={`text-5xl font-black italic tracking-tighter ${rpn > 100 ? 'text-rose-500 underline decoration-rose-500/20' : 'text-white'}`}>{rpn}</h4><span className={`text-[10px] font-black ${rpn > 100 ? 'text-rose-500' : 'text-emerald-500'}`}>{rpn > 100 ? 'CRITICAL' : 'NOMINAL'}</span></div>
             <button disabled={!formData.system_name || !formData.title || mutation.isPending} onClick={() => mutation.mutate(formData)} className="w-full bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 transition-all flex items-center justify-center gap-2 italic">{mutation.isPending ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} COMMIT_VECTOR</button>
          </div>
       </div>
    </div>
  )
}

function ScoreSelectorSmall({ label, value, onChange, levels, color }: any) {
  const [show, setShow] = useState(false)
  const current = levels.find((l: any) => l.value === value)
  return (
    <div className="space-y-2 relative">
       <div className="flex items-center justify-between px-1"><label className="text-[9px] font-black text-slate-500 italic">{label}</label><span className={`text-xl font-black ${color} italic`}>{value}</span></div>
       <button onClick={() => setShow(!show)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2 text-left flex items-center justify-between"><div className="min-w-0"><p className="text-[10px] font-black text-white italic truncate">{current?.label}</p></div><ChevronRight size={14} className={`text-slate-600 transition-transform ${show ? 'rotate-90' : ''}`} /></button>
       <AnimatePresence>{show && (
         <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="absolute z-[100] left-0 right-0 top-full mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-h-40 overflow-y-auto p-1 custom-scrollbar">
            {levels.map((l: any) => (
              <button key={l.value} onClick={() => { onChange(l.value); setShow(false); }} className={`w-full text-left p-3 rounded-xl hover:bg-white/5 transition-all ${value === l.value ? 'bg-white/5' : ''}`}><div className="flex items-center justify-between"><span className={`text-[10px] font-black italic ${value === l.value ? color : 'text-white'}`}>{l.label}</span><span className={`text-[10px] font-black ${value === l.value ? color : 'text-slate-600'}`}>{l.value}</span></div></button>
            ))}
         </motion.div>
       )}</AnimatePresence>
    </div>
  )
}

function CauseWizard({ modeId, onComplete }: any) {
  const [formData, setFormData] = useState<any>({ cause_text: '', occurrence_level: 1, responsible_team: '', mode_ids: [modeId] })
  const mutation = useMutation({ mutationFn: async (data: any) => (await apiFetch('/api/v1/far/causes', { method: 'POST', body: JSON.stringify(data) })).json(), onSuccess: () => { toast.success('Trace Source Logged'); onComplete(); } })
  return (
    <div className="space-y-6">
       <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 italic">Trace Forensic Description *</label><textarea value={formData.cause_text} onChange={e => setFormData({ ...formData, cause_text: e.target.value.toUpperCase() })} placeholder="TECHNICAL ORIGIN..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-black text-white min-h-[100px] outline-none focus:border-amber-500 italic uppercase" /></div>
       <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 italic">Owner Unit *</label><input value={formData.responsible_team} onChange={e => setFormData({ ...formData, responsible_team: e.target.value.toUpperCase() })} placeholder="TEAM_NAME" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-black text-white outline-none focus:border-amber-500 italic uppercase" /></div>
          <ScoreSelectorSmall label="Occurrence" value={formData.occurrence_level} onChange={(v: any) => setFormData({ ...formData, occurrence_level: v })} levels={OCCURRENCE_LEVELS} color="text-amber-500" />
       </div>
       <button disabled={!formData.cause_text || !formData.responsible_team} onClick={() => mutation.mutate(formData)} className="w-full bg-amber-600 hover:bg-amber-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all italic">Commit Trace Origin</button>
    </div>
  )
}

function MitigationWizard({ modeId, onComplete }: any) {
  const [formData, setFormData] = useState({ mitigation_type: 'Monitoring', mitigation_steps: '', responsible_team: '' })
  const mutation = useMutation({ mutationFn: async (data: any) => (await apiFetch('/api/v1/far/mitigations', { method: 'POST', body: JSON.stringify({ ...data, mode_ids: [modeId] }) })).json(), onSuccess: () => { toast.success('Shield Established'); onComplete() } })
  return (
    <div className="space-y-6">
       <div className="grid grid-cols-2 gap-3">
          {['Monitoring', 'Workaround'].map(t => (
            <button key={t} onClick={() => setFormData({...formData, mitigation_type: t})} className={`py-3 rounded-xl border transition-all text-center ${formData.mitigation_type === t ? 'bg-sky-500/20 border-sky-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}><p className="text-[10px] font-black uppercase italic">{t}</p></button>
          ))}
       </div>
       <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 italic">Protocol Script / Steps</label><textarea value={formData.mitigation_steps} onChange={e => setFormData({...formData, mitigation_steps: e.target.value.toUpperCase()})} placeholder="PROCEDURAL STEPS..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-black text-white min-h-[100px] outline-none focus:border-sky-500 italic uppercase" /></div>
       <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 italic">Responder Team</label><input value={formData.responsible_team} onChange={e => setFormData({...formData, responsible_team: e.target.value.toUpperCase()})} placeholder="OPS_UNIT" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-black text-white outline-none focus:border-sky-500 italic uppercase" /></div>
       <button onClick={() => mutation.mutate(formData)} className="w-full bg-sky-600 hover:bg-sky-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-sky-500/20 active:scale-95 transition-all italic">Deploy Mitigation Shield</button>
    </div>
  )
}

function ResolutionWizard({ mode, onComplete }: any) {
  const [selectedCauseId, setSelectedCauseId] = useState(mode.causes?.[0]?.id || null)
  const [formData, setFormData] = useState({ knowledge_id: null, preventive_follow_up: '', responsible_team: '' })
  const { data: bkms } = useQuery({ queryKey: ['knowledge', 'bkms'], queryFn: async () => (await apiFetch('/api/v1/knowledge/?category=BKM')).json() })
  const mutation = useMutation({ mutationFn: async (data: any) => (await apiFetch('/api/v1/far/resolutions', { method: 'POST', body: JSON.stringify({ ...data, cause_ids: [selectedCauseId] }) })).json(), onSuccess: () => { toast.success('BKM Alignment Commited'); onComplete() } })
  return (
    <div className="space-y-6">
       <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 italic">Alignment Target Source</label><select value={selectedCauseId} onChange={e => setSelectedCauseId(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-black text-white outline-none focus:border-emerald-500 italic uppercase">{mode.causes?.map((c:any) => <option key={c.id} value={c.id}>{c.cause_text.slice(0, 50)}...</option>)}</select></div>
       <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 italic">Select BKM Artifact</label><div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
          {bkms?.map((b:any) => (
            <button key={b.id} onClick={() => setFormData({...formData, knowledge_id: b.id})} className={`p-3 rounded-xl border text-left transition-all ${formData.knowledge_id === b.id ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}><p className="text-[10px] font-black uppercase italic truncate">{b.title}</p></button>
          ))}
       </div></div>
       <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 italic">Hardening Protocol</label><textarea value={formData.preventive_follow_up} onChange={e => setFormData({...formData, preventive_follow_up: e.target.value.toUpperCase()})} placeholder="PREVENTIVE ACTIONS..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-black text-white min-h-[80px] outline-none focus:border-emerald-500 italic uppercase" /></div>
       <button onClick={() => mutation.mutate(formData)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all italic">Lock BKM Matrix Alignment</button>
    </div>
  )
}

function PreventionWizard({ modeId, onComplete }: any) {
  const [formData, setFormData] = useState({ prevention_action: '', responsible_team: '', target_date: new Date().toISOString().split('T')[0] })
  const mutation = useMutation({ mutationFn: async (data: any) => { await apiFetch('/api/v1/far/prevention', { method: 'POST', body: JSON.stringify({ ...data, failure_mode_id: modeId }) }); await apiFetch(`/api/v1/far/modes/${modeId}`, { method: 'PUT', body: JSON.stringify({ status: 'Prevented' }) }); return { ok: true }; }, onSuccess: () => { toast.success('Architecture Hardened'); onComplete() } })
  return (
    <div className="space-y-6">
       <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 text-[9px] text-emerald-400 font-black uppercase italic tracking-tight">Warning: Promoting to "Prevented" indicates architectural elimination of this risk vector.</div>
       <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 italic">Proofing Implementation Details</label><textarea value={formData.prevention_action} onChange={e => setFormData({...formData, prevention_action: e.target.value.toUpperCase()})} placeholder="DESCRIBE DESIGN CHANGE..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-black text-white min-h-[100px] outline-none focus:border-emerald-500 italic uppercase" /></div>
       <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 italic">Hardening Unit</label><input value={formData.responsible_team} onChange={e => setFormData({...formData, responsible_team: e.target.value.toUpperCase()})} placeholder="ENGINEERING_TEAM" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-black text-white outline-none focus:border-emerald-500 italic uppercase" /></div>
          <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 italic">Completion Date</label><input type="date" value={formData.target_date} onChange={e => setFormData({...formData, target_date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-white outline-none focus:border-emerald-500 italic" /></div>
       </div>
       <button onClick={() => mutation.mutate(formData)} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all italic">Finalize Architectural Proof</button>
    </div>
  )
}
