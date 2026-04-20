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
  ChevronLeft, Book, Download, Copy, Terminal, Check, HelpCircle, EyeOff, MoreVertical, Monitor
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'
import { StatusPill } from './shared/StatusPill'
import { ConfigRegistryModal } from './ConfigRegistry'
import { MonitoringForm } from './MonitoringGrid'
import { ProjectForm } from './Projects'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

// --- Types ---
interface FailureMode {
  id: number
  system_name: string
  failure_type: string
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

const FAILURE_TYPES = [
  { value: 'Design', label: 'Design' },
  { value: 'Process', label: 'Process' },
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Software', label: 'Software' },
  { value: 'Network', label: 'Network' },
  { value: 'Human', label: 'Human' },
  { value: 'Environment', label: 'Environment' },
]

// --- Constants for Guided Scoring ---
const SEVERITY_LEVELS = [
  { value: 10, label: 'HAZARDOUS (NO WARNING)', desc: 'Safety issue or total compliance failure. Extreme risk to the enterprise.' },
  { value: 9, label: 'HAZARDOUS (WITH WARNING)', desc: 'Potential safety issue or major compliance risk. High probability of legal impact.' },
  { value: 8, label: 'VERY HIGH', desc: 'System total failure, major data loss, no workaround exists. Business critical.' },
  { value: 7, label: 'HIGH', desc: 'System operational but major performance impact. High user dissatisfaction.' },
  { value: 6, label: 'MODERATE', desc: 'Significant impact on primary function, but workaround exists. Noticeable degradation.' },
  { value: 5, label: 'LOW', desc: 'Minor impact on performance or usability. Minimal business disruption.' },
  { value: 4, label: 'VERY LOW', desc: 'Noticeable impact but system remains functional. Easily manageable.' },
  { value: 3, label: 'MINOR', desc: 'Slight annoyance to users. No functional impairment.' },
  { value: 2, label: 'VERY MINOR', desc: 'Hardly noticeable impact. Cosmetic or trace-level issue.' },
  { value: 1, label: 'NONE', desc: 'No discernible effect on system or user experience.' },
]

const OCCURRENCE_LEVELS = [
  { value: 10, label: 'CERTAIN', desc: 'Inevitable. Occurs multiple times per day. Constant risk exposure.' },
  { value: 9, label: 'VERY HIGH', desc: 'Likely to occur daily. High-frequency failure profile.' },
  { value: 8, label: 'HIGH', desc: 'Likely to occur weekly. Recurring operational disruption.' },
  { value: 7, label: 'MODERATELY HIGH', desc: 'Occurs once or twice per month. Periodic impact.' },
  { value: 6, label: 'MODERATE', desc: 'Occurs once every few months. Occasional risk.' },
  { value: 5, label: 'LOW', desc: 'Occurs once or twice per year. Infrequent failure mode.' },
  { value: 4, label: 'VERY LOW', desc: 'Occurs once every few years. Rare occurrence.' },
  { value: 3, label: 'REMOTE', desc: 'Unlikely but possible. Minimal historical evidence.' },
  { value: 2, label: 'VERY REMOTE', desc: 'Extremely unlikely. Speculative failure mode.' },
  { value: 1, label: 'NEARLY IMPOSSIBLE', desc: 'Never expected to occur. Theoretical risk only.' },
]

const DETECTION_LEVELS = [
  { value: 10, label: 'IMPOSSIBLE', desc: 'Zero monitoring. Discovered only via total system blackout or user report.' },
  { value: 9, label: 'VERY REMOTE', desc: 'Visible only after catastrophic failure has completed. Post-mortem discovery.' },
  { value: 8, label: 'REMOTE', desc: 'Requires manual log inspection or audit. High latency in visibility.' },
  { value: 7, label: 'VERY LOW', desc: 'Alerts exist but are buried in noise. Easily missed by NOC/SOC.' },
  { value: 6, label: 'LOW', desc: 'Standard monitoring, but delayed or inconsistent. Unreliable visibility.' },
  { value: 5, label: 'MODERATE', desc: 'Reliable alerts exist but require human triage for verification.' },
  { value: 4, label: 'MODERATELY HIGH', desc: 'Proactive alerts with clear root cause identification.' },
  { value: 3, label: 'HIGH', desc: 'Real-time dashboarding and active, automated health checks.' },
  { value: 2, label: 'VERY HIGH', desc: 'Automated self-healing or failsafe systems. Immediate notification.' },
  { value: 1, label: 'ALMOST CERTAIN', desc: 'Predictive analytics prevents failure before it manifests.' },
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
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-md p-10 rounded-lg border border-blue-500/30 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-xl font-bold uppercase tracking-tighter text-blue-400  flex items-center space-x-3">
             <Info size={24}/> <span>{def.title}</span>
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Mathematical Derivation</p>
            <div className="bg-black/40 border border-white/5 rounded-lg p-4 font-mono text-[11px] text-blue-300">
               {def.formula}
            </div>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Functional Definition</p>
            <p className="text-[12px] text-slate-300 leading-relaxed font-bold uppercase tracking-tight ">
              {def.description}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="w-full py-3 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-blue-500/20">Acknowledge</button>
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
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  
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
    { 
      headerName: "", 
      width: 50,
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
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
    },
    { 
      field: "system_name", 
      headerName: "System", 
      width: 120,
      cellClass: 'text-center font-bold text-rose-400 uppercase',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      hide: hiddenColumns.includes("system_name")
    },
    { 
      field: "failure_type", 
      headerName: "Type", 
      width: 100,
      cellClass: 'text-center font-bold text-slate-400 uppercase',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      hide: hiddenColumns.includes("failure_type")
    },
    { 
      field: "title", 
      headerName: "Failure Mode", 
      flex: 2,
      cellClass: 'text-left font-bold uppercase text-white pl-4',
      headerClass: 'text-left pl-4',
      filter: 'agTextColumnFilter',
      hide: hiddenColumns.includes("title")
    },
    { 
      field: "severity", 
      headerName: "S", 
      width: 50,
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      cellRenderer: (p: any) => {
        const val = p.value || 0;
        const color = val >= 8 ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : 
                      val >= 5 ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className={`flex items-center justify-center w-14 h-5 rounded-md border shadow-sm ${color}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold leading-none">{val}</span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("severity")
    },
    { 
      field: "occurrence", 
      headerName: "O", 
      width: 50,
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      cellRenderer: (p: any) => {
        const val = p.value || 0;
        const color = val >= 7 ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : 
                      val >= 4 ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className={`flex items-center justify-center w-14 h-5 rounded-md border shadow-sm ${color}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold leading-none">{val}</span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("occurrence")
    },
    { 
      field: "detection", 
      headerName: "D", 
      width: 50,
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      cellRenderer: (p: any) => {
        const val = p.value || 0;
        const color = val >= 7 ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : 
                      val >= 4 ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className={`flex items-center justify-center w-14 h-5 rounded-md border shadow-sm ${color}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold leading-none">{val}</span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("detection")
    },
    { 
      field: "rpn", 
      headerName: "RPN", 
      width: 70,
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
      cellRenderer: (p: any) => {
        const val = p.value || 0;
        const color = val >= 150 ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : 
                      val >= 80 ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className={`flex items-center justify-center w-14 h-5 rounded-md border shadow-sm ${color}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold leading-none">{val}</span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("rpn")
    },
    { 
      field: "status", 
      headerName: "Maturity", 
      width: 140,
      cellClass: 'text-center',
      headerClass: 'text-center',
      filter: 'agTextColumnFilter',
      cellRenderer: (p: any) => {
        const mode = p.data;
        // Auto-decide status
        let lv = 0;
        if (mode.status === 'Prevented') lv = 8;
        else {
          const hasM = mode.mitigations?.some((m: any) => m.mitigation_type === 'Monitoring');
          const hasW = mode.mitigations?.some((m: any) => m.mitigation_type === 'Workaround');
          const hasR = mode.causes?.some((c: any) => (c.resolutions?.length || 0) > 0);
          if (hasM && hasR && hasW) lv = 7;
          else if (hasM && hasR) lv = 6;
          else if (hasR && hasW) lv = 5;
          else if (hasR) lv = 4;
          else if (hasM && hasW) lv = 3;
          else if (hasW) lv = 2;
          else if (hasM) lv = 1;
        }
        const ml = maturityLevels.find(m => m.lv === lv) || maturityLevels[maturityLevels.length-1];
        const colorClass = ml.lv >= 6 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                          ml.lv >= 4 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          ml.lv >= 1 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          'bg-rose-500/20 text-rose-400 border-rose-500/30';

        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className={`flex items-center justify-center w-28 h-5 rounded-md border shadow-sm ${colorClass}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold uppercase tracking-tighter leading-none">
                Lv{ml.lv} {ml.label}
              </span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("status")
    },
    {
      field: "linked_rcas",
      headerName: "Incidents",
      width: 100,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const rcas = p.data.linked_rcas || [];
        if (rcas.length === 0) return <span className="text-slate-600 font-bold uppercase tracking-widest text-[9px]">None</span>;
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className="group relative cursor-help">
              <div className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                {rcas.length} Linked
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-[9999] pointer-events-none">
                <div className="bg-slate-900 border border-white/20 rounded-lg p-3 shadow-2xl min-w-[200px]">
                   <p className="text-[9px] font-black uppercase text-purple-400 mb-2 border-b border-white/5 pb-1">Linked RCA Records</p>
                   <div className="space-y-1">
                      {rcas.map((r: any) => (
                        <div key={r.id} className="text-[8px] font-black text-slate-300 uppercase py-0.5">• {r.title}</div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      headerName: "Action",
      width: 120,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex rounded-lg p-0.5 border border-white/5 bg-transparent">
               <button onClick={() => setSelectedModeId(p.data.id)} title="Matrix Detail" className="p-1.5 text-blue-400 hover:text-blue-200 transition-all border-r border-white/5"><Eye size={14}/></button>
               <button onClick={() => { setSelectedModeId(p.data.id); setShowWizard(true); }} title="Edit Matrix" className="p-1.5 text-emerald-400 hover:text-emerald-200 transition-all border-r border-white/5"><Edit2 size={14}/></button>
               <button onClick={() => openConfirm('Purge Vector', 'PERMANENTLY PURGE THIS RISK?', () => bulkMutation.mutate({ action: 'delete', ids: [p.data.id] }))} title="Purge" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      )
    }
  ], [fontSize, hiddenColumns, bulkMutation]) as any

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
      if (mode.status === 'Prevented') return 8;
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
              <h1 className="text-2xl font-bold uppercase tracking-tight  flex items-center gap-2">
                <Target size={24} className="text-rose-500" /> Failure Matrix
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">Reliability Knowledge Engine // FMEA Studio</p>
           </div>
        </div>
        
        <div className="flex items-center space-x-3">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Scan risk vectors..."
                className="bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-rose-500/50 w-64 transition-all"
              />
           </div>

           <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5 space-x-1">
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
             className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-rose-500/10 active:scale-95 transition-all flex items-center gap-2"
           >
             <ShieldAlert size={14} /> Add Failure Mode
           </button>
        </div>
      </div>

      <AnimatePresence>
        {showStyleLab && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-rose-600/10 border border-rose-500/20 rounded-lg p-4 flex items-center justify-between backdrop-blur-md">
               <div className="flex items-center space-x-12">
                  <div className="flex items-center space-x-3">
                     <Activity size={16} className="text-rose-400" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">View Density Laboratory</span>
                  </div>
                  <div className="flex items-center space-x-6">
                     <div className="flex items-center space-x-4"><span className="text-[9px] font-bold text-slate-500 uppercase">Font Size</span><div className="flex items-center space-x-2"><input type="range" min="8" max="14" step="1" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-32 accent-rose-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"/><span className="text-[10px] text-white w-4 font-bold">{fontSize}px</span></div></div>
                     <div className="flex items-center space-x-4 border-l border-white/10 pl-6"><span className="text-[9px] font-bold text-slate-500 uppercase">Row Density</span><div className="flex items-center space-x-2"><input type="range" min="4" max="24" step="2" value={rowDensity} onChange={e => setRowDensity(Number(e.target.value))} className="w-32 accent-rose-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"/><span className="text-[10px] text-white w-4 font-bold">{rowDensity}px</span></div></div>
                  </div>
               </div>
               <button onClick={() => setShowStyleLab(false)} className="text-slate-500 hover:text-white transition-colors"><X size={16}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
         <button onClick={() => setSelectedSystems([])} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${selectedSystems.length === 0 ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}>GLOBAL_REALM</button>
         {availableSystems.map(sys => (
           <button key={sys} onClick={() => setSelectedSystems(prev => prev.includes(sys) ? prev.filter(s => s !== sys) : [...prev, sys])} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap ${selectedSystems.includes(sys) ? 'bg-white/10 border-white/20 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}>{sys}</button>
         ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
         <StatCard id="SRI" label="Reliability Index" value={metrics.sri} suffix="/100" color={metrics.sri > 70 ? "emerald" : "rose"} onHelp={() => setActiveMetricHelp("SRI")} />
         <StatCard id="RiskDensity" label="Risk Density" value={metrics.riskDensity} suffix="RPN/ASSET" color="amber" onHelp={() => setActiveMetricHelp("RiskDensity")} />
         <StatCard id="MitigationRatio" label="Mitigation Ratio" value={metrics.mitRatio} suffix="%" color="sky" onHelp={() => setActiveMetricHelp("MitigationRatio")} />
         <StatCard id="AvgSeverity" label="Avg Severity" value={metrics.avgRPN} suffix="AVG RPN" color="rose" onHelp={() => setActiveMetricHelp("AvgSeverity")} />
      </div>

      <div className="flex-1 min-h-0 flex flex-col glass-panel rounded-lg border-white/5 bg-[#0a0c14]/40 overflow-hidden">
           <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <ShieldAlert size={14} className="text-rose-500" />
                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-white ">Failure Inventory Maturity Profile</h3>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-end gap-1 h-8">
                    {maturityLevels.slice().reverse().map((ml: any) => {
                      const count = (metrics as any).maturityDist[ml.lv] || 0
                      const pct = filteredModes?.length ? (count / filteredModes.length) * 100 : 0
                      return (
                        <div key={ml.lv} className="w-4 h-full relative group cursor-help">
                            <div className={`w-full h-full rounded-t-sm transition-all ${ml.color} ${count === 0 ? 'opacity-5' : 'opacity-40 group-hover:opacity-100'}`} style={{ height: `${Math.max(10, pct)}%` }} />
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] whitespace-nowrap bg-black border border-white/10 px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest">
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
                autoSizeStrategy={autoSizeStrategy}
                rowSelection="multiple"
                onSelectionChanged={(e: any) => setSelectedIds(e.api.getSelectedNodes().map((n: any) => n.data.id))}
                onGridReady={(params: any) => {
                  setTimeout(() => params.api.sizeColumnsToFit(), 100);
                }}
              />
              <AnimatePresence>
                {showColumnPicker && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute top-0 right-0 bottom-0 w-64 bg-slate-950/90 backdrop-blur-xl border-l border-white/10 z-[60] flex flex-col shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-widest text-rose-400 flex items-center space-x-2"><Sliders size={14} /> <span>Columns</span></h3><button onClick={() => setShowColumnPicker(false)} className="text-slate-500 hover:text-white"><X size={18}/></button></div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                      {columnDefs.filter((c: any) => c.field && !c.suppressHide).map((col: any) => (
                        <label key={col.field} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-all">
                          <input type="checkbox" checked={!hiddenColumns.includes(col.field)} onChange={() => setHiddenColumns(prev => prev.includes(col.field) ? prev.filter(f => f !== col.field) : [...prev, col.field])} className="sr-only" />
                          <div className={`w-4 h-4 rounded border transition-all ${!hiddenColumns.includes(col.field) ? 'bg-rose-600 border-rose-500 shadow-lg shadow-rose-500/20' : 'border-white/10 bg-black/40 group-hover:border-white/20'}`}>{!hiddenColumns.includes(col.field) && <Check size={12} className="text-white mx-auto" />}</div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${!hiddenColumns.includes(col.field) ? 'text-slate-200' : 'text-slate-500'}`}>{col.headerName || col.field}</span>
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
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-2xl rounded-lg border border-white/10 bg-slate-900 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                   <h2 className="text-xl font-bold uppercase tracking-widest text-white ">Maturity Matrix Glossary</h2>
                   <button onClick={() => setShowMaturityHelp(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
                </div>
                <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                   <table className="w-full text-[10px]">
                      <thead className="bg-white/5 border-b border-white/5">
                         <tr>
                            <th className="px-4 py-2 text-center font-bold uppercase tracking-widest text-slate-500">Lv</th>
                            <th className="px-4 py-2 text-left font-bold uppercase tracking-widest text-slate-500">Status Title</th>
                            <th className="px-4 py-2 text-left font-bold uppercase tracking-widest text-slate-500">Architecture Definition</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {maturityLevels.map(ml => (
                           <tr key={ml.lv} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded font-bold text-white shadow-lg ${ml.color}`}>{ml.lv}</span></td>
                              <td className="px-4 py-3 font-bold text-white uppercase ">{ml.label}</td>
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
          --ag-background-color: #1a1b26;
          --ag-header-background-color: #24283b;
          --ag-border-color: rgba(255,255,255,0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #f43f5e;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 11px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-size: 11px !important; justify-content: center !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; font-weight: 700 !important; font-size: 11px !important; }
        .ag-row-hover { background-color: rgba(244, 63, 94, 0.05) !important; }
        .ag-row-selected { background-color: rgba(244, 63, 94, 0.2) !important; }
      `}</style>

      <AnimatePresence>
        {showWizard && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-6xl h-[85vh] flex flex-col rounded-lg border border-rose-500/20 overflow-hidden shadow-2xl">
               <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
                  <div>
                    <h1 className="text-3xl font-bold uppercase tracking-tighter text-white">New Failure Mode</h1>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em]">Reliability Engineering Risk Documentation Studio</p>
                  </div>
                  <button onClick={() => setShowWizard(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><X size={20}/></button>
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
    <div className={`glass-panel p-4 rounded-lg border-white/5 ${bgColors[color]} flex flex-col justify-between group overflow-hidden relative min-h-[90px]`}>
      <div className="flex items-center justify-between relative z-10">
         <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
         <button onClick={onHelp} className="p-1 text-slate-600 hover:text-white transition-colors"><HelpCircle size={12}/></button>
      </div>
      <div className="flex items-baseline gap-1 relative z-10 leading-none mt-2">
         <h4 className={`text-2xl font-bold tracking-tighter  ${textColors[color]}`}>{value}</h4>
         <span className="text-[9px] font-bold text-slate-600 uppercase  tracking-tighter">{suffix}</span>
      </div>
    </div>
  )
}

function FailureDetailView({ mode, onClose, onUpdate }: { mode: any, onClose: () => void, onUpdate: () => void }) {
  const [activeTab, setActiveTab] = useState('causal')
  const [showAllAssets, setShowAllAssets] = useState(false)
  const queryClient = useQueryClient()
  
  const { data: allModes } = useQuery({ 
    queryKey: ['far', 'modes'], 
    queryFn: async () => (await apiFetch('/api/v1/far/modes')).json() 
  })

  const systemRank = useMemo(() => {
    if (!allModes) return 0;
    const sameSystem = allModes.filter((m: any) => m.system_name === mode.system_name)
      .sort((a: any, b: any) => b.rpn - a.rpn);
    return sameSystem.findIndex((m: any) => m.id === mode.id) + 1;
  }, [allModes, mode.id, mode.system_name]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6 font-bold uppercase tracking-tight">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-[1200px] h-[90vh] flex flex-col rounded-lg border border-rose-500/30 bg-[#02040a] overflow-hidden shadow-2xl relative">
         
         {/* HEADER SECTION */}
         <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex flex-col shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/5 blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                      <div className="px-2 py-0.5 rounded-lg bg-rose-600/10 border border-rose-500/20 text-[9px] font-bold text-rose-500  uppercase">VECTOR_{mode.id}</div>
                      <div className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400  uppercase tracking-widest">{mode.system_name}</div>
                      <div className="px-2 py-0.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-[9px] font-bold text-blue-400  uppercase tracking-widest">RANK #{systemRank}</div>
                  </div>
                  <h2 className="text-3xl font-bold text-white  tracking-tighter leading-none uppercase">{mode.title}</h2>
              </div>

              <div className="flex items-center gap-4">
                  <div className="flex gap-1.5 bg-black/40 p-1.5 rounded-lg border border-white/5 shadow-xl">
                      <HeaderScore label="S" value={mode.severity} color="rose" />
                      <HeaderScore label="O" value={mode.occurrence} color="amber" />
                      <HeaderScore label="D" value={mode.detection} color="sky" />
                  </div>
                  
                  <div className="text-right flex flex-col items-end">
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 ">Risk Priority</p>
                      <div className="flex items-baseline gap-1 leading-none">
                         <p className={`text-4xl font-bold tracking-tighter ${mode.rpn > 150 ? 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'text-white'}`}>{mode.rpn}</p>
                         <p className="text-[8px] font-bold text-slate-500  uppercase">RPN</p>
                      </div>
                  </div>
                  <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all ml-2 border border-white/10"><X size={20}/></button>
              </div>
            </div>

            {/* EFFECT & IMPACTS ON OWN ROW */}
            <div className="mt-4 flex flex-col space-y-3 relative z-10">
               <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg px-4 py-2 flex items-center gap-3">
                  <p className="text-[9px] text-rose-500 font-bold uppercase tracking-widest shrink-0">Effect Forensics:</p>
                  <p className="text-[11px] text-slate-200 font-bold uppercase  tracking-tight leading-none truncate">{mode.effect || 'NULL_EFFECT_STATEMENT'}</p>
               </div>

               <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] text-slate-500 font-bold mr-2 uppercase tracking-widest">Affected Infrastructure:</span>
                  {mode.affected_assets?.slice(0, showAllAssets ? undefined : 3).map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-slate-400 ">
                       <Server size={10} className="text-rose-500" /> {a.name}
                    </div>
                  ))}
                  {mode.affected_assets?.length > 3 && (
                    <button onClick={() => setShowAllAssets(!showAllAssets)} className="px-2 py-0.5 bg-rose-600/10 border border-rose-500/20 rounded-lg text-[9px] font-bold text-rose-500  hover:bg-rose-600/20 transition-all">
                       {showAllAssets ? 'SHOW LESS' : `+ ${mode.affected_assets.length - 3} MORE ENTITIES`}
                    </button>
                  )}
                  {(!mode.affected_assets || mode.affected_assets.length === 0) && <span className="text-[9px] text-slate-700  font-bold uppercase tracking-widest">No infrastructure mappings established</span>}
               </div>
            </div>

            {/* TABS ON OWN ROW */}
            <div className="mt-6 flex items-center relative z-10">
               <div className="flex space-x-1 bg-black/60 p-0.5 rounded-lg border border-white/5">
                 {[{ id: 'causal', label: 'Causal Forensics', icon: Zap }, { id: 'roadmap', label: 'Strategic Roadmap', icon: ShieldCheck }, { id: 'history', label: 'Research History', icon: Activity }].map(t => (
                   <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-6 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === t.id ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><t.icon size={12} /> {t.label}</button>
                 ))}
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-hidden flex flex-col p-6">
            <AnimatePresence mode="wait">
               {activeTab === 'causal' && <CausalTab mode={mode} onUpdate={onUpdate} />}
               {activeTab === 'roadmap' && <RoadmapTab mode={mode} onUpdate={onUpdate} />}
               {activeTab === 'history' && <HistoryTab mode={mode} onUpdate={onUpdate} />}
            </AnimatePresence>
         </div>

         <div className="px-8 py-2 bg-black/80 border-t border-white/5 flex items-center justify-between shrink-0">
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">System Integrity Vector Analysis // {mode.title}</p>
            <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
               <span>S: {mode.severity}</span>
               <span className="w-1 h-1 rounded-full bg-slate-800" />
               <span>O: {mode.occurrence}</span>
               <span className="w-1 h-1 rounded-full bg-slate-800" />
               <span>D: {mode.detection}</span>
            </div>
         </div>
      </motion.div>
    </div>
  )
}

function HeaderScore({ label, value, color }: any) {
  const textColors: any = { rose: 'text-rose-500', amber: 'text-amber-500', sky: 'text-sky-400' }
  const bgColors: any = { rose: 'bg-rose-500/10', amber: 'bg-amber-500/10', sky: 'bg-sky-500/10' }
  const borderColors: any = { rose: 'border-rose-500/20', amber: 'border-amber-500/20', sky: 'border-sky-500/20' }
  return (
    <div className={`w-11 h-11 rounded-lg ${bgColors[color]} border ${borderColors[color]} flex flex-col items-center justify-center`}>
       <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">{label}</p>
       <p className={`text-xl font-bold leading-none ${textColors[color]}`}>{value}</p>
    </div>
  )
}

function GaugeSelector({ label, value, onChange, levels, color, accent }: any) {
  const current = levels.find((l: any) => l.value === value)
  return (
    <div className="space-y-3">
       <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-400  tracking-widest uppercase">{label}</label>
          <div className="flex items-center gap-2">
             <span className={`text-2xl font-bold ${color}`}>{value}</span>
             <span className="text-slate-700 text-[10px] font-bold">/ 10</span>
          </div>
       </div>
       <div className="relative h-2 bg-black/40 rounded-full border border-white/5">
          <div className={`absolute left-0 top-0 h-full rounded-full ${accent} transition-all duration-300`} style={{ width: `${(value / 10) * 100}%` }} />
          <input 
            type="range" min="1" max="10" step="1" 
            value={value} 
            onChange={e => onChange(Number(e.target.value))}
            onClick={e => e.stopPropagation()}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
       </div>
       <div className="bg-black/20 border border-white/5 rounded-lg p-3 min-h-[50px]">
          <p className={`text-[11px] font-bold uppercase  ${color} leading-none mb-1.5`}>{current?.label}</p>
          <p className="text-[10px] text-slate-500 font-bold leading-tight lowercase">{current?.desc}</p>
       </div>
    </div>
  )
}

function FARWizard({ initialData, onComplete }: any) {
  const [formData, setFormData] = useState<any>({ 
    system_name: '', 
    failure_type: 'Design',
    title: '', 
    effect: '', 
    severity: 1, 
    occurrence: 1, 
    detection: 1, 
    affected_assets: [], 
    ...initialData 
  })
  const [assetSearch, setAssetSearch] = useState('')
  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await apiFetch('/api/v1/settings/options')).json() })
  const systems = options?.filter((o: any) => o.category === 'LogicalSystem') || []
  const { data: devices } = useQuery({ queryKey: ['devices', formData.system_name], enabled: !!formData.system_name, queryFn: async () => (await apiFetch(`/api/v1/devices/?system=${encodeURIComponent(formData.system_name)}`)).json() })
  const mutation = useMutation({ mutationFn: async (data: any) => (await apiFetch(data.id ? `/api/v1/far/modes/${data.id}` : '/api/v1/far/modes', { method: data.id ? 'PUT' : 'POST', body: JSON.stringify(data) })).json(), onSuccess: () => { toast.success('Registry Synchronized'); onComplete(); } })
  const rpn = formData.severity * formData.occurrence * formData.detection

  return (
    <div className="grid grid-cols-12 gap-6 font-bold uppercase tracking-tight">
       <div className="col-span-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 ">System Realm *</label>
                <StyledSelect options={systems.map((s: any) => ({ label: s.label, value: s.value }))} value={formData.system_name} onChange={e => setFormData({ ...formData, system_name: e.target.value })} />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 ">Failure Type *</label>
                <StyledSelect options={FAILURE_TYPES} value={formData.failure_type} onChange={e => setFormData({ ...formData, failure_type: e.target.value })} />
             </div>
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-bold text-slate-500 ">Failure Mode Identity *</label>
             <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="E.G., DATABASE_CONNECTION_TIMEOUT" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-rose-500  placeholder:text-slate-700" />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-bold text-slate-500 ">Impact Statement (Effect)</label>
             <textarea value={formData.effect} onChange={e => setFormData({ ...formData, effect: e.target.value })} placeholder="Describe the systemic consequences..." className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-xs font-bold text-white min-h-[60px] outline-none focus:border-rose-500 custom-scrollbar  placeholder:text-slate-700" />
          </div>
          <div className="bg-black/20 p-4 rounded-lg border border-white/5 space-y-3">
             <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-slate-500 ">Affected Infrastructure</label>
                <div className="relative">
                   <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600" />
                   <input value={assetSearch} onChange={e => setAssetSearch(e.target.value)} placeholder="SCAN..." className="bg-black/40 border border-white/10 rounded-lg pl-7 pr-2 py-1 text-[9px] font-bold outline-none focus:border-rose-500 w-32" />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                {devices?.filter((d: any) => !assetSearch || d.name.toLowerCase().includes(assetSearch.toLowerCase())).map((d: any) => (
                  <label key={d.id} 
                    className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${formData.affected_assets.includes(d.id) ? 'bg-rose-500/10 border-rose-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={formData.affected_assets.includes(d.id)} 
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFormData({ 
                          ...formData, 
                          affected_assets: formData.affected_assets.includes(d.id) 
                            ? formData.affected_assets.filter((id: any) => id !== d.id) 
                            : [...formData.affected_assets, d.id] 
                        });
                      }} 
                    />
                    <Server size={12} className={formData.affected_assets.includes(d.id) ? 'text-rose-500' : 'text-slate-700'} />
                    <div className="min-w-0">
                       <p className="text-[11px] font-bold truncate  leading-none">{d.name}</p>
                       <p className="text-[9px] text-slate-600 font-bold truncate mt-1">{d.model}</p>
                    </div>
                  </label>
                ))}
                {(!devices || devices.length === 0) && <div className="col-span-2 py-8 text-center text-slate-600 text-[9px] font-bold">Select a system to view assets</div>}
             </div>
          </div>
       </div>

       <div className="col-span-6 space-y-4">
          <div className="bg-white/[0.02] p-5 rounded-lg border border-white/5 space-y-5">
             <GaugeSelector label="Severity" value={formData.severity} onChange={(v: any) => setFormData({ ...formData, severity: v })} levels={SEVERITY_LEVELS} color="text-rose-500" accent="bg-rose-500" />
             <GaugeSelector label="Occurrence" value={formData.occurrence} onChange={(v: any) => setFormData({ ...formData, occurrence: v })} levels={OCCURRENCE_LEVELS} color="text-amber-500" accent="bg-amber-500" />
             <GaugeSelector label="Detection" value={formData.detection} onChange={(v: any) => setFormData({ ...formData, detection: v })} levels={DETECTION_LEVELS} color="text-sky-400" accent="bg-sky-400" />
          </div>

          <div className="bg-[#0f111a] rounded-lg p-5 border border-white/10 flex items-center justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-[50px] pointer-events-none" />
             <div>
                <p className="text-[9px] font-bold text-slate-500  mb-1 uppercase tracking-widest leading-none">Risk Priority Number (RPN)</p>
                <div className="flex items-baseline gap-1.5">
                   <h4 className={`text-4xl font-bold tracking-tighter ${rpn > 200 ? 'text-rose-600' : rpn > 100 ? 'text-rose-400' : 'text-emerald-400'}`}>{rpn}</h4>
                   <span className={`text-[10px] font-bold ${rpn > 150 ? 'text-rose-500' : 'text-emerald-500'}`}>{rpn > 150 ? 'CRITICAL' : 'NOMINAL'}</span>
                </div>
             </div>
             <button 
               disabled={!formData.system_name || !formData.title || mutation.isPending} 
               onClick={() => mutation.mutate(formData)} 
               className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-4 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-2xl shadow-rose-600/20 active:scale-95 transition-all flex items-center gap-2 "
             >
               {mutation.isPending ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} COMMIT
             </button>
          </div>
       </div>
    </div>
  )
}

function CausalTab({ mode, onUpdate }: any) {
  const [isAdding, setIsAdding] = useState(false)
  const [newCause, setNewCause] = useState({ cause_text: '', occurrence_level: 5, responsible_team: '' })
  const mutation = useMutation({ 
    mutationFn: async (data: any) => (await apiFetch('/api/v1/far/causes', { method: 'POST', body: JSON.stringify({ ...data, mode_ids: [mode.id] }) })).json(), 
    onSuccess: () => { toast.success('Root Cause Logged'); setIsAdding(false); onUpdate(); } 
  })

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex-1 flex flex-col space-y-6">
       <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-amber-500 ">Root Cause Attribution Matrix</h3>
          <button onClick={() => setIsAdding(true)} className="px-6 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-500 rounded-lg text-[10px] font-bold uppercase  hover:bg-amber-600 hover:text-white transition-all">+ Add Root Cause</button>
       </div>
       
       <div className="flex-1 bg-black/40 border border-white/5 rounded-lg overflow-hidden flex flex-col shadow-2xl">
          <table className="w-full text-left border-collapse">
             <thead className="bg-white/[0.03] border-b border-white/10">
                <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ">
                   <th className="px-8 py-4">Root Cause Description (Logical Origin)</th>
                   <th className="px-8 py-4 text-center">Occur Lv</th>
                   <th className="px-8 py-4">Responsible Unit</th>
                   <th className="px-8 py-4 text-center">BKMs</th>
                   <th className="px-8 py-4 text-right">Ops</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5 font-bold uppercase  text-[11px]">
                {mode.causes?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                     <td className="px-8 py-5 text-white ">{c.cause_text}</td>
                     <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                           <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div className="h-full bg-amber-500" style={{ width: `${c.occurrence_level * 10}%` }} />
                           </div>
                           <span className="text-amber-500 w-4">{c.occurrence_level}</span>
                        </div>
                     </td>
                     <td className="px-8 py-5 text-slate-400">{c.responsible_team || 'UNASSIGNED'}</td>
                     <td className="px-8 py-5 text-center">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-bold ${c.resolutions?.length > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 opacity-50'}`}>
                           {c.resolutions?.length || 0} BKMS
                        </span>
                     </td>
                     <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-slate-600 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                     </td>
                  </tr>
                ))}
                {(!mode.causes?.length) && (
                  <tr><td colSpan={5} className="py-32 text-center opacity-20 font-bold uppercase tracking-[0.3em]">No attribution traces linked to this vector</td></tr>
                )}
             </tbody>
          </table>
       </div>

       <AnimatePresence>
         {isAdding && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-full max-w-lg p-10 rounded-lg border border-amber-500/30 space-y-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20"><Zap size={24}/></div>
                      <div>
                         <h3 className="text-xl font-bold uppercase tracking-tighter text-white">Add Root Cause</h3>
                         <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Attribute the technical origin of failure</p>
                      </div>
                   </div>
                   <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Description</label>
                      <textarea 
                        autoFocus
                        value={newCause.cause_text} 
                        onChange={e => setNewCause({...newCause, cause_text: e.target.value})} 
                        placeholder="ENTER LOGICAL TRACE ORIGIN..." 
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-xs font-bold text-white outline-none focus:border-amber-500 min-h-[100px] resize-none" 
                      />
                   </div>

                   <GaugeSelector 
                      label="Occurrence Probability" 
                      value={newCause.occurrence_level} 
                      onChange={(v: number) => setNewCause({...newCause, occurrence_level: v})} 
                      levels={OCCURRENCE_LEVELS} 
                      color="text-amber-500" 
                      accent="bg-amber-500" 
                   />

                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Responsible Team / Unit</label>
                      <input 
                        value={newCause.responsible_team} 
                        onChange={e => setNewCause({...newCause, responsible_team: e.target.value})} 
                        placeholder="E.G. PLATFORM INFRASTRUCTURE" 
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white outline-none focus:border-amber-500 uppercase" 
                      />
                   </div>
                </div>

                <div className="flex gap-4 pt-4">
                   <button onClick={() => setIsAdding(false)} className="flex-1 py-4 text-[10px] font-bold uppercase text-slate-500 hover:text-white transition-colors">Abort</button>
                   <button 
                     disabled={!newCause.cause_text || mutation.isPending} 
                     onClick={() => mutation.mutate(newCause)} 
                     className="flex-1 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
                   >
                     {mutation.isPending ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />} LOG ROOT CAUSE
                   </button>
                </div>
             </motion.div>
           </div>
         )}
       </AnimatePresence>
    </motion.div>
  )
}

function RoadmapTab({ mode, onUpdate }: any) {
  const [isAdding, setIsAdding] = useState(false)
  const [actionType, setActionType] = useState('Workaround')
  const [newAction, setNewAction] = useState<any>({ steps: '', team: '', status: 'Not Started', bkm_mode: 'link', bkm_content: '', bkm_id: null, monitoring_id: null })
  const [monitoringSearch, setMonitoringSearch] = useState('')
  const [showMonitoringCreate, setShowMonitoringCreate] = useState(false)
  const [showProjectCreate, setShowProjectCreate] = useState(false)
  
  const queryClient = useQueryClient()
  const { data: bkms } = useQuery({ queryKey: ['knowledge', 'bkms'], queryFn: async () => (await apiFetch('/api/v1/knowledge/?category=BKM')).json() })
  const { data: monitoring } = useQuery({ queryKey: ['monitoring-items'], queryFn: async () => (await apiFetch('/api/v1/monitoring/')).json() })
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await apiFetch('/api/v1/devices/')).json() })
  const { data: settingsOptions } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await apiFetch('/api/v1/settings/options')).json() })

  const filteredMonitoring = useMemo(() => {
    if (!monitoring) return []
    const affectedIds = mode.affected_assets?.map((a: any) => a.id) || []
    return monitoring.filter((m: any) => {
      const matchesSearch = !monitoringSearch || m.title.toLowerCase().includes(monitoringSearch.toLowerCase()) || m.device_name?.toLowerCase().includes(monitoringSearch.toLowerCase())
      const isAffected = affectedIds.includes(m.device_id)
      return matchesSearch && isAffected
    })
  }, [monitoring, monitoringSearch, mode.affected_assets])
  
  const mutation = useMutation({ 
    mutationFn: async (data: any) => {
      let payload: any = { 
        mitigation_type: actionType, 
        responsible_team: data.team, 
        mode_ids: [mode.id],
        status: data.status
      }
      
      if (actionType === 'Monitoring') {
        payload.monitoring_item_id = data.monitoring_id
      } else if (actionType === 'Workaround') {
        payload.mitigation_steps = data.steps
        // Handle BKM linking/embedding
        if (data.bkm_mode === 'link' && data.bkm_id) {
          payload.metadata_json = { linked_bkm_id: data.bkm_id }
        } else if (data.bkm_mode === 'input' && data.bkm_content) {
          payload.metadata_json = { external_bkm_link: data.bkm_content }
        }
      }

      const res = await apiFetch('/api/v1/far/mitigations', { 
        method: 'POST', 
        body: JSON.stringify(payload) 
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    }, 
    onSuccess: () => { 
      toast.success(`${actionType} Deployed Successfully`); 
      setIsAdding(false); 
      onUpdate(); 
      queryClient.invalidateQueries({ queryKey: ['far'] });
    },
    onError: (err: any) => {
      toast.error(`Deployment Failed: ${err.message}`);
    }
  })

  const projectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/v1/projects/', { method: 'POST', body: JSON.stringify({ ...data, linked_device_ids: mode.affected_assets?.map((a:any)=>a.id) || [] }) })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      toast.success('Prevention Project Initiated')
      setShowProjectCreate(false)
      setIsAdding(false)
      onUpdate()
    }
  })

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex-1 flex flex-col space-y-6">
       <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-sky-400 ">Defense Infrastructure Roadmap</h3>
          {!isAdding && (
            <div className="flex gap-2">
               <button onClick={() => { setIsAdding(true); setActionType('Workaround'); setNewAction({ ...newAction, steps: '', team: '', status: 'Not Started' }) }} className="px-6 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-500 rounded-lg text-[10px] font-bold uppercase  hover:bg-amber-600 hover:text-white transition-all">+ Add Workaround</button>
               <button onClick={() => { setIsAdding(true); setActionType('Monitoring'); }} className="px-6 py-2 bg-sky-600/20 border border-sky-500/30 text-sky-400 rounded-lg text-[10px] font-bold uppercase  hover:bg-sky-600 hover:text-white transition-all">+ Add Monitoring</button>
               <button onClick={() => { setIsAdding(true); setActionType('Prevention'); setShowProjectCreate(true); }} className="px-6 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-bold uppercase  hover:bg-emerald-600 hover:text-white transition-all">+ Add Prevention</button>
            </div>
          )}
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
          {isAdding && actionType !== 'Prevention' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white/[0.03] border border-white/10 rounded-lg p-8 space-y-6 relative">
               <div className="flex items-center justify-between">
                  <h4 className={`text-xl font-bold uppercase  tracking-tighter ${actionType === 'Monitoring' ? 'text-sky-400' : 'text-amber-500'}`}>Deploy {actionType} Action</h4>
                  <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                     {actionType === 'Workaround' && (
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-slate-500  uppercase">Procedural steps (Raw input - Manual Numbering)</label>
                           <textarea value={newAction.steps} onChange={e => setNewAction({...newAction, steps: e.target.value})} placeholder="1. Identify faulty node...\n2. Initiate failover protocol..." className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-xs font-bold text-white min-h-[150px] outline-none focus:border-amber-500 leading-relaxed" />
                        </div>
                     )}
                     {actionType === 'Monitoring' && (
                        <div className="space-y-4">
                           <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Link Active Monitor</label>
                              <span className="text-[9px] font-bold text-sky-400 uppercase italic">Filtered by affected assets</span>
                           </div>
                           <div className="relative">
                              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                              <input 
                                value={monitoringSearch} 
                                onChange={e => setMonitoringSearch(e.target.value)} 
                                placeholder="Search monitors..." 
                                className="w-full bg-black/40 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-xs font-bold text-white outline-none focus:border-sky-500"
                              />
                           </div>
                           <div className="max-h-[200px] overflow-y-auto custom-scrollbar pr-2 space-y-2">
                              {filteredMonitoring?.map((m: any) => (
                                <button 
                                  key={m.id} 
                                  onClick={() => setNewAction({...newAction, monitoring_id: m.id})}
                                  className={`w-full text-left p-4 rounded-lg border transition-all flex items-center justify-between group ${newAction.monitoring_id === m.id ? 'bg-sky-600/20 border-sky-500 shadow-lg shadow-sky-500/10' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                                >
                                   <div>
                                      <p className="text-[11px] font-bold text-white uppercase tracking-tight">{m.title}</p>
                                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{m.device_name} // {m.platform}</p>
                                   </div>
                                   {newAction.monitoring_id === m.id && <Check size={16} className="text-sky-400" />}
                                </button>
                              ))}
                              {filteredMonitoring?.length === 0 && (
                                <div className="py-10 text-center text-slate-700 text-[10px] font-bold border-2 border-dashed border-white/5 rounded-lg">
                                   No existing monitors found for affected assets
                                </div>
                              )}
                           </div>
                           <div className="text-[10px] text-slate-500 text-center uppercase tracking-widest">OR</div>
                           <button onClick={() => setShowMonitoringCreate(true)} className="w-full py-4 bg-sky-600/10 border-2 border-dashed border-sky-500/30 rounded-lg text-[10px] font-bold text-sky-400 hover:bg-sky-600/20 hover:border-sky-500/50 transition-all uppercase flex items-center justify-center gap-2">
                              <Plus size={14} /> Create New Monitoring Node
                           </button>
                        </div>
                     )}
                  </div>

                  <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold text-slate-500  uppercase tracking-widest">Owner Team</label>
                           <input value={newAction.team} onChange={e => setNewAction({...newAction, team: e.target.value})} placeholder="e.g. Platform SRE" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white outline-none focus:border-white/20" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold text-slate-500  uppercase tracking-widest">Initial Status</label>
                           <select value={newAction.status} onChange={e => setNewAction({...newAction, status: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-[11px] text-xs font-bold text-white outline-none focus:border-white/20 uppercase appearance-none">
                              <option value="Not Started">Not Started</option>
                              <option value="In Progress">In Progress</option>
                              <option value="On Hold">On Hold</option>
                              <option value="Blocked">Blocked</option>
                              <option value="Completed">Completed</option>
                           </select>
                        </div>
                     </div>

                     {actionType === 'Workaround' && (
                        <div className="bg-black/20 p-6 rounded-lg border border-white/5 space-y-5">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">BKM Alignment</label>
                              <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                                 <button onClick={() => setNewAction({...newAction, bkm_mode: 'input'})} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${newAction.bkm_mode === 'input' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-slate-600 hover:text-slate-400'}`}>Paste Link</button>
                                 <button onClick={() => setNewAction({...newAction, bkm_mode: 'link'})} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${newAction.bkm_mode === 'link' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-slate-600 hover:text-slate-400'}`}>Direct Link</button>
                              </div>
                           </div>
                           {newAction.bkm_mode === 'input' ? (
                              <input value={newAction.bkm_content} onChange={e => setNewAction({...newAction, bkm_content: e.target.value})} placeholder="PASTE EXTERNAL KNOWLEDGE LINK..." className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-blue-400 outline-none focus:border-amber-500" />
                           ) : (
                              <select value={newAction.bkm_id} onChange={e => setNewAction({...newAction, bkm_id: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white outline-none uppercase appearance-none">
                                 <option value="">SELECT BKM ARTIFACT...</option>
                                 {bkms?.map((b: any) => <option key={b.id} value={b.id}>{b.title}</option>)}
                              </select>
                           )}
                           <p className="text-[9px] text-slate-600 font-bold uppercase text-center italic tracking-widest">Ensures cross-referencing between FAR and BKM modules</p>
                        </div>
                     )}

                     <button onClick={() => mutation.mutate(newAction)} className={`w-full py-5 rounded-lg text-[11px] font-bold uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${actionType === 'Monitoring' ? 'bg-sky-600 shadow-sky-600/20 hover:bg-sky-500' : 'bg-amber-600 shadow-amber-600/20 hover:bg-amber-500'}`}>Commit Strategic Action</button>
                  </div>
               </div>
            </motion.div>
          )}

          <div className="bg-black/40 border border-white/5 rounded-lg overflow-hidden shadow-2xl">
             <table className="w-full text-left border-collapse">
                <thead className="bg-white/[0.03] border-b border-white/10">
                   <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ">
                      <th className="px-8 py-4">Shield Type</th>
                      <th className="px-8 py-4">Deployment Protocol / Plan</th>
                      <th className="px-8 py-4 text-center">Status</th>
                      <th className="px-8 py-4">Owner Unit</th>
                      <th className="px-8 py-4 text-right">Ops</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-bold uppercase  text-[11px]">
                   {mode.mitigations?.map((m: any) => (
                     <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-5">
                           <span className={`px-3 py-1 rounded-lg text-[9px] font-bold ${m.mitigation_type === 'Monitoring' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>{m.mitigation_type}</span>
                        </td>
                        <td className="px-8 py-5 text-white  max-w-xl">
                           <div className="space-y-1">
                              {m.mitigation_steps?.split('\n').map((line: string, i: number) => (
                                <div key={i} className="flex gap-3">
                                   <span className="text-slate-600 text-[9px] font-bold">{i + 1}</span>
                                   <span className="normal-case">{line}</span>
                                </div>
                              ))}
                              {m.monitoring_item && (
                                 <div className="flex items-center gap-3 p-3 bg-sky-500/5 border border-sky-500/20 rounded-lg mt-2 group/item hover:bg-sky-500/10 transition-all">
                                    <Monitor size={14} className="text-sky-400" />
                                    <span className="text-sky-400 tracking-tight normal-case">Linked Monitor: {m.monitoring_item.title}</span>
                                 </div>
                              )}
                           </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                           <span className="px-3 py-1 bg-slate-800 border border-white/10 rounded-lg text-[9px] font-bold text-slate-400">NOMINAL</span>
                        </td>
                        <td className="px-8 py-5 text-slate-500">{m.responsible_team}</td>
                        <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                           <button className="p-2 text-slate-600 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                        </td>
                     </tr>
                   ))}
                   {mode.mitigations?.length === 0 && (
                      <tr><td colSpan={5} className="py-20 text-center opacity-20 font-bold uppercase tracking-[0.3em]">No mitigation shields active</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       <AnimatePresence>
          {showMonitoringCreate && (
             <MonitoringForm 
                item={null}
                devices={devices}
                categories={settingsOptions?.filter((o:any)=>o.category==="MonitoringCategory") || []}
                severities={settingsOptions?.filter((o:any)=>o.category==="MonitoringSeverity") || []}
                notificationMethods={settingsOptions?.filter((o:any)=>o.category==="NotificationMethod") || []}
                ownerRoles={settingsOptions?.filter((o:any)=>o.category==="MonitoringOwnerRole") || []}
                onClose={() => setShowMonitoringCreate(false)}
                onSuccess={(newItem: any) => {
                   setShowMonitoringCreate(false);
                   queryClient.invalidateQueries({ queryKey: ['monitoring-items'] });
                   if (newItem?.id) {
                      setNewAction({ ...newAction, monitoring_id: newItem.id });
                   }
                }}
             />
          )}
          {showProjectCreate && (
             <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-md p-10">
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-5xl max-h-[90vh] overflow-y-auto p-12 rounded-[60px] border border-emerald-500/30 custom-scrollbar shadow-2xl">
                   <div className="flex items-center justify-between border-b border-white/5 pb-8">
                      <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 rounded-[28px] bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-600/20">
                           <ShieldCheck size={32}/>
                        </div>
                        <div>
                          <h2 className="text-4xl font-bold uppercase text-white tracking-tighter">Initiate Prevention Project</h2>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1 italic">Architectural Hardening & Risk Elimination</p>
                        </div>
                      </div>
                      <button onClick={() => { setShowProjectCreate(false); setIsAdding(false); }} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-4 rounded-full"><X size={32}/></button>
                   </div>
                   <ProjectForm 
                      initialData={{ name: `PREVENTION: ${mode.title}`, description: mode.effect, status: 'Planning', priority: 'High' }} 
                      onSave={projectMutation.mutate} 
                      isSaving={projectMutation.isPending} 
                   />
                </motion.div>
             </div>
          )}
       </AnimatePresence>
    </motion.div>
  )
}
  function HistoryTab({ mode, onUpdate }: any) {
    const [isLinking, setIsLinking] = useState(false)
    const [search, setSearch] = useState('')
    const queryClient = useQueryClient()

    const { data: research } = useQuery({ 
      queryKey: ['research-items'], 
      queryFn: async () => (await apiFetch('/api/v1/research/')).json() 
    })

    const filteredResearch = useMemo(() => {
      if (!research) return []
      return research.filter((r: any) => 
        !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.summary?.toLowerCase().includes(search.toLowerCase())
      )
    }, [research, search])

    const linkMutation = useMutation({
      mutationFn: async (researchId: number) => {
        const currentLinks = mode.metadata_json?.linked_research_ids || []
        if (currentLinks.includes(researchId)) {
          toast.error('Research artifact already linked')
          return
        }
        const updatedMetadata = { ...mode.metadata_json, linked_research_ids: [...currentLinks, researchId] }
        const res = await apiFetch(`/api/v1/far/modes/${mode.id}`, {
          method: 'PUT',
          body: JSON.stringify({ metadata_json: updatedMetadata })
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      },
      onSuccess: () => {
        toast.success('Research Artifact Linked to Vector')
        setIsLinking(false)
        onUpdate()
        queryClient.invalidateQueries({ queryKey: ['far'] })
      },
      onError: (err: any) => {
        toast.error(`Linking Failed: ${err.message}`)
      }
    })

    const linkedResearch = useMemo(() => {
      if (!research || !mode.metadata_json?.linked_research_ids) return []
      return research.filter((r: any) => mode.metadata_json.linked_research_ids.includes(r.id))
    }, [research, mode.metadata_json])
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex-1 flex flex-col space-y-6">
         <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 ">Analytical Research History</h3>
            <button onClick={() => setIsLinking(true)} className="px-6 py-2 bg-slate-800/50 border border-white/10 text-slate-400 rounded-lg text-[10px] font-bold uppercase  hover:bg-slate-700 hover:text-white transition-all">+ Link Research Artifact</button>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {linkedResearch.map((r: any) => (
               <div key={r.id} className="bg-white/5 border border-white/5 rounded-lg p-6 flex items-center justify-between group hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-6">
                     <div className="p-4 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20"><Activity size={24}/></div>
                     <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-tight">{r.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                           <span className="text-[9px] font-bold text-slate-500 uppercase">Status: {r.status}</span>
                           <span className="text-[9px] font-bold text-slate-500 uppercase">ID: {r.id}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex gap-3">
                     <button onClick={() => window.location.hash = '#/research'} className="p-2.5 bg-white/5 rounded-lg text-slate-500 hover:text-blue-400 transition-all opacity-0 group-hover:opacity-100"><Eye size={18}/></button>
                     <button className="p-2.5 bg-white/5 rounded-lg text-slate-500 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                  </div>
               </div>
            ))}
            {linkedResearch.length === 0 && (
               <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4 opacity-20 ">
                  <Activity size={48} className="text-slate-500" />
                  <p className="text-[12px] font-bold uppercase tracking-[0.3em] text-center max-w-md">No historical research artifacts currently mapped to this failure vector</p>
                  <button onClick={() => window.location.hash = '#/research'} className="text-[10px] font-bold uppercase underline tracking-widest text-rose-500">Initiate New Research Case</button>
               </div>
            )}
         </div>
         <AnimatePresence>
            {isLinking && (
               <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-lg p-10 rounded-lg border border-white/10 space-y-6">
                     <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h3 className="text-xl font-bold uppercase text-white tracking-tighter">Link Research</h3>
                        <button onClick={() => setIsLinking(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
                     </div>
                     <div className="relative">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                        <input 
                          value={search} 
                          onChange={e => setSearch(e.target.value)} 
                          placeholder="Search research artifacts..." 
                          className="w-full bg-black/40 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-xs font-bold text-white outline-none focus:border-rose-500" 
                        />
                     </div>
                     <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {filteredResearch?.map((r: any) => (
                          <button 
                            key={r.id} 
                            onClick={() => linkMutation.mutate(r.id)}
                            className="w-full text-left p-4 rounded-lg bg-white/5 border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all group"
                          >
                             <p className="text-[11px] font-bold text-white uppercase">{r.title}</p>
                             <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Status: {r.status}</p>
                          </button>
                        ))}
                     </div>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </motion.div>
    )
  }