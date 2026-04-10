import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ShieldAlert, Zap, Save, X, PlusCircle, User,
  RefreshCcw, AlertTriangle, Lightbulb, ShieldCheck, 
  Activity, Server, FileText, Clipboard, ArrowRight, Shield, 
  CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye,
  Target, AlertCircle, Settings, Layers, Box, Link2, ExternalLink,
  ChevronLeft, Book, Download, Copy
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'
import { StatusPill } from './shared/StatusPill'

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

export default function FAR() {
  const queryClient = useQueryClient()
  const [showWizard, setShowWizard] = useState(false)
  const [showCauseWizard, setShowCauseWizard] = useState(false)
  const [selectedModeId, setSelectedModeId] = useState<number | null>(null)
  const [selectedCauseId, setSelectedCauseId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSystems, setSelectedSystems] = useState<string[]>([])
  const [showMitigationWizard, setShowMitigationWizard] = useState(false)
  const [showResolutionWizard, setShowResolutionWizard] = useState(false)
  const [showPreventionWizard, setShowPreventionWizard] = useState(false)

  // Style Lab State
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(10)
  const [showStyleLab, setShowStyleLab] = useState(true)
  
  // Queries
  const { data: modes, isLoading: modesLoading } = useQuery({ 
    queryKey: ['far', 'modes'], 
    queryFn: async () => (await apiFetch('/api/v1/far/modes')).json() 
  })

  const { data: causes, isLoading: causesLoading } = useQuery({
    queryKey: ['far', 'causes'],
    queryFn: async () => (await apiFetch('/api/v1/far/causes')).json()
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
    if (selectedCauseId) {
      result = result.filter((m: any) => 
        m.causes?.some((c: any) => c.id === selectedCauseId)
      )
    }
    return result
  }, [modes, searchTerm, selectedCauseId, selectedSystems])

  const filteredCauses = useMemo(() => {
    let result = causes || []
    if (searchTerm) {
      result = result.filter((c: any) => 
        c.cause_text.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    // Contextual Filter: If mode is selected, show only its causes
    if (selectedModeId) {
      const mode = modes?.find((m: any) => m.id === selectedModeId)
      if (mode) {
        result = result.filter((c: any) => mode.causes?.some((mc: any) => mc.id === c.id))
      }
    }
    return result
  }, [causes, searchTerm, selectedModeId, modes])

  const selectedMode = useMemo(() => modes?.find((m: any) => m.id === selectedModeId), [modes, selectedModeId])

  // Advanced Metrics Calculation
  const metrics = useMemo(() => {
    const activeModes = filteredModes || []
    const totalRPN = activeModes.reduce((acc: number, m: any) => acc + (m.rpn || 0), 0)
    const avgRPN = activeModes.length ? totalRPN / activeModes.length : 0
    
    // System Reliability Index: 100 is perfect, 0 is critical
    const sri = Math.max(0, Math.round(100 * (1 - avgRPN / 500))) 
    
    // Maturity Calculation
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

    // Mitigation Ratio
    const mitigated = activeModes.filter((m: any) => (m.mitigations?.length || 0) > 0).length
    const mitRatio = activeModes.length ? Math.round((mitigated / activeModes.length) * 100) : 0

    // Risk Density (RPN per Asset)
    const totalAssets = activeModes.reduce((acc: number, m: any) => acc + (m.affected_assets?.length || 0), 0)
    const riskDensity = totalAssets ? (totalRPN / totalAssets).toFixed(1) : '0.0'

    return { sri, mitRatio, riskDensity, avgRPN: Math.round(avgRPN), maturityDist }
  }, [filteredModes])

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
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">Reliability Knowledge Engine & Risk Mitigation</p>
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
             <button className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-rose-400 rounded-lg transition-all" title="Reliability Config">
                <Settings size={16} />
             </button>
          </div>
           
           <button 
             onClick={() => { setShowWizard(false); setShowCauseWizard(true); }}
             className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/10 active:scale-95 transition-all flex items-center gap-2"
           >
             <Zap size={14} /> Add Cause
           </button>

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

      {/* System Command Toggles */}
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
         {/* SRI Index */}
         <div className="glass-panel p-3 rounded-2xl border-white/5 bg-[#0a0c14]/60 flex flex-col justify-between group overflow-hidden relative min-h-[80px]">
            <div className={`absolute top-0 right-0 w-24 h-24 blur-[30px] opacity-10 transition-colors ${metrics.sri > 70 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <div className="flex items-center justify-between mb-1 relative z-10">
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Reliability Index</p>
               <Activity size={12} className={metrics.sri > 70 ? 'text-emerald-500' : 'text-rose-500'} />
            </div>
            <div className="flex items-baseline gap-1 relative z-10 leading-none">
               <h4 className={`text-2xl font-black tracking-tighter ${metrics.sri > 70 ? 'text-emerald-400' : 'text-rose-400'}`}>{metrics.sri}</h4>
               <span className="text-[9px] font-black text-slate-600 uppercase">/100</span>
            </div>
            <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden relative z-10">
               <motion.div animate={{ width: `${metrics.sri}%` }} className={`h-full ${metrics.sri > 70 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
         </div>

         {/* Risk Density */}
         <div className="glass-panel p-3 rounded-2xl border-white/5 bg-[#0a0c14]/60 flex flex-col justify-between min-h-[80px]">
            <div className="flex items-center justify-between mb-1">
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Risk Density</p>
               <Layers size={12} className="text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1 leading-none">
               <h4 className="text-2xl font-black tracking-tighter text-white">{metrics.riskDensity}</h4>
               <span className="text-[9px] font-black text-slate-600 uppercase">RPN/ASSET</span>
            </div>
            <div className="mt-2 flex gap-0.5">
               {Array.from({ length: 10 }).map((_, i) => (
                 <div key={i} className={`h-1 flex-1 rounded-sm ${i < (parseFloat(metrics.riskDensity) / 10) ? 'bg-amber-500' : 'bg-white/5'}`} />
               ))}
            </div>
         </div>

         {/* Mitigation Coverage */}
         <div className="glass-panel p-3 rounded-2xl border-white/5 bg-[#0a0c14]/60 flex flex-col justify-between min-h-[80px]">
            <div className="flex items-center justify-between mb-1">
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Mitigation Ratio</p>
               <ShieldCheck size={12} className="text-sky-400" />
            </div>
            <div className="flex items-baseline gap-1 leading-none">
               <h4 className="text-2xl font-black tracking-tighter text-white">{metrics.mitRatio}%</h4>
            </div>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2 leading-none">
               {metrics.mitRatio > 80 ? 'Fortified' : metrics.mitRatio > 50 ? 'Stable' : 'Exposed'}
            </p>
         </div>

         {/* Avg Severity */}
         <div className="glass-panel p-3 rounded-2xl border-white/5 bg-[#0a0c14]/60 flex flex-col justify-between min-h-[80px]">
            <div className="flex items-center justify-between mb-1">
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Avg Severity</p>
               <AlertTriangle size={12} className="text-rose-500" />
            </div>
            <div className="flex items-baseline gap-1 leading-none">
               <h4 className="text-2xl font-black tracking-tighter text-white">{metrics.avgRPN}</h4>
               <span className="text-[9px] font-black text-slate-600 uppercase">AVG RPN</span>
            </div>
            <div className="mt-2 h-1 bg-white/5 rounded-full relative overflow-hidden">
               <motion.div animate={{ left: `${Math.min(100, (metrics.avgRPN / 500) * 100)}%` }} className="absolute h-full w-4 bg-white/20 blur-sm" />
            </div>
         </div>
      </div>

      <div className="flex-1 min-h-0 flex space-x-3 overflow-hidden">
        {/* PANE 1: Failure Modes (Left) */}
        <div className={`flex flex-col glass-panel rounded-3xl border-white/5 bg-[#0a0c14]/40 transition-all duration-500 ${selectedModeId ? 'w-[30%]' : 'w-full'}`}>
           <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <ShieldAlert size={14} className="text-rose-500" />
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Failure Inventory</h3>
              </div>
              {!selectedModeId && (
                <div className="flex items-end gap-1 h-6">
                  {maturityLevels.slice().reverse().map((ml: any) => {
                    const count = (metrics as any).maturityDist[ml.lv] || 0
                    const pct = filteredModes?.length ? (count / filteredModes.length) * 100 : 0
                    return (
                      <div key={ml.lv} className="w-3 h-full relative group">
                          <div className={`w-full h-full rounded-t-sm transition-all ${ml.color} ${count === 0 ? 'opacity-10' : 'opacity-80 group-hover:opacity-100'}`} style={{ height: `${Math.max(10, pct)}%` }} />
                      </div>
                    )
                  })}
                </div>
              )}
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar font-sans">
              <table className="w-full text-left border-collapse" style={{ fontSize: `${fontSize}px` }}>
                 <thead className="sticky top-0 bg-[#0a0c14] z-10">
                    <tr className="border-b border-white/5">
                       <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest text-center" style={{ height: `${fontSize + rowDensity + 10}px` }}>System / Lv</th>
                       <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest text-center" style={{ height: `${fontSize + rowDensity + 10}px` }}>Failure Mode</th>
                       {!selectedModeId && <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest text-right" style={{ height: `${fontSize + rowDensity + 10}px` }}>RPN</th>}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/[0.02]">
                    {filteredModes.map((mode: any) => {
                      const hasM = mode.mitigations?.some((m: any) => m.mitigation_type === 'Monitoring');
                      const hasW = mode.mitigations?.some((m: any) => m.mitigation_type === 'Workaround');
                      const hasR = mode.causes?.some((c: any) => (c.resolutions?.length || 0) > 0);
                      let lv = 0;
                      if (['Eliminated', 'Prevented'].includes(mode.status)) lv = 8;
                      else if (hasM && hasR && hasW) lv = 7;
                      else if (hasM && hasR) lv = 6;
                      else if (hasR && hasW) lv = 5;
                      else if (hasR) lv = 4;
                      else if (hasM && hasW) lv = 3;
                      else if (hasW) lv = 2;
                      else if (hasM) lv = 1;
                      const ml = maturityLevels.find(l => l.lv === lv)!

                      return (
                        <tr 
                          key={mode.id} 
                          onClick={() => setSelectedModeId(selectedModeId === mode.id ? null : mode.id)}
                          className={`hover:bg-white/[0.03] transition-colors cursor-pointer group ${selectedModeId === mode.id ? 'bg-rose-500/10' : ''}`}
                          style={{ height: `${fontSize + rowDensity + 10}px` }}
                        >
                           <td className="px-4 py-2 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[8px] font-black uppercase text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded w-fit tracking-tighter">{mode.system_name}</span>
                                <div className={`flex items-center gap-1 text-[8px] font-black uppercase ${ml.color.replace('bg-', 'text-')}`}>
                                   <Shield size={8} /> L{lv}
                                </div>
                              </div>
                           </td>
                           <td className="px-4 py-2">
                              <span className="text-[10px] font-black text-white uppercase group-hover:text-rose-400 transition-colors leading-tight line-clamp-2" style={{ fontSize: `${fontSize}px` }}>{mode.title}</span>
                           </td>
                           {!selectedModeId && (
                             <td className="px-4 py-2 text-right">
                                <span className={`font-black tracking-tighter ${mode.rpn > 100 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} style={{ fontSize: `${fontSize}px` }}>{mode.rpn}</span>
                             </td>
                           )}
                        </tr>
                      )
                    })}
                 </tbody>
              </table>
           </div>
        </div>

        {/* PANE 2 & 3: War Room (Maturity Lab) */}
        <AnimatePresence mode="wait">
          {selectedModeId && selectedMode ? (
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="flex-1 flex space-x-3 overflow-hidden"
            >
               {/* Detail Lab (Active Actions) */}
               <div className="w-[65%] glass-panel rounded-[40px] border border-rose-500/20 bg-black/90 flex flex-col overflow-hidden shadow-2xl">
                  <div className="p-10 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
                     <div className="space-y-4">
                        <div className="flex items-center gap-3">
                           <span className="px-3 py-1 rounded-lg bg-rose-600/20 border border-rose-500/30 text-[9px] font-black text-rose-500 uppercase tracking-widest">FAILURE_ID: {selectedMode.id}</span>
                           <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedMode.system_name}</span>
                        </div>
                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">{selectedMode.title}</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Precision Reliability Maturity Lab Entry</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Impact Score (RPN)</p>
                        <p className={`text-6xl font-black italic leading-none tracking-tighter ${selectedMode.rpn > 100 ? 'text-rose-500' : 'text-white'}`}>{selectedMode.rpn}</p>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-12">
                     {/* 1. Maturity Roadmap Checklist */}
                     <section className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 flex items-center gap-2 border-l-2 border-rose-500 pl-4">
                           RELIABILITY_ROADMAP
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                           {[
                             { label: 'Automated Monitoring', status: selectedMode.mitigations?.some((m:any) => m.mitigation_type === 'Monitoring'), icon: Activity, color: 'text-sky-400', action: () => setShowMitigationWizard(true) },
                             { label: 'Immediate Workaround', status: selectedMode.mitigations?.some((m:any) => m.mitigation_type === 'Workaround'), icon: Zap, color: 'text-amber-400', action: () => setShowMitigationWizard(true) },
                             { label: 'Permanent BKM', status: selectedMode.causes?.some((c:any) => c.resolutions?.length > 0), icon: Lightbulb, color: 'text-emerald-400', action: () => setShowResolutionWizard(true) },
                             { label: 'Engineering Fix', status: ['Eliminated', 'Prevented'].includes(selectedMode.status), icon: ShieldCheck, color: 'text-emerald-500', action: () => setShowPreventionWizard(true) }
                           ].map((item, i) => (
                             <div key={i} className={`p-6 rounded-3xl border transition-all flex items-center justify-between ${item.status ? 'bg-white/5 border-emerald-500/30 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]' : 'bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100 hover:border-rose-500/20'}`}>
                                <div className="flex items-center gap-4">
                                   <div className={`p-3 rounded-2xl bg-white/5 ${item.status ? item.color : 'text-slate-600'}`}>
                                      <item.icon size={24} />
                                   </div>
                                   <div>
                                      <p className={`text-xs font-black uppercase tracking-widest ${item.status ? 'text-white' : 'text-slate-500'}`}>{item.label}</p>
                                      <p className="text-[9px] font-bold uppercase text-slate-600">{item.status ? 'Verified & Active' : 'Action Required'}</p>
                                   </div>
                                </div>
                                {!item.status && (
                                  <button onClick={item.action} className="p-2 hover:bg-white/5 rounded-xl text-rose-500 transition-colors">
                                     <Plus size={20} />
                                  </button>
                                )}
                                {item.status && <CheckCircle2 size={20} className="text-emerald-500" />}
                             </div>
                           ))}
                        </div>
                     </section>

                     {/* 2. Resolutions / BKMs */}
                     <section className="space-y-6">
                        <div className="flex items-center justify-between">
                           <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-2 border-l-2 border-emerald-500 pl-4">
                              KNOWLEDGE_ALIGNMENT_BKM
                           </h3>
                           <button onClick={() => setShowResolutionWizard(true)} className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] hover:underline">+ MAP_RESOLUTION</button>
                        </div>
                        <div className="space-y-3">
                           {selectedMode.causes?.map((cause: any) => cause.resolutions?.map((res: any, idx: number) => (
                             <div key={idx} className="bg-white/5 border border-white/5 p-6 rounded-3xl flex items-center justify-between group hover:border-white/10 transition-all">
                                <div className="flex items-center gap-6">
                                   <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                                      <FileText size={24} />
                                   </div>
                                   <div className="min-w-0">
                                      <p className="text-sm font-black text-white uppercase tracking-tight truncate">{res.knowledge_bkm?.title || 'Relational BKM Link'}</p>
                                      <div className="flex items-center gap-4 mt-1">
                                         <p className="text-[10px] text-slate-500 font-black uppercase">TEAM: {res.responsible_team}</p>
                                         <span className="w-1 h-1 rounded-full bg-white/10" />
                                         <p className="text-[10px] text-slate-600 font-bold uppercase truncate max-w-xs">SOURCE: {cause.cause_text}</p>
                                      </div>
                                   </div>
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 p-3 bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"><ExternalLink size={18} /></button>
                             </div>
                           )))}
                           {(!selectedMode.causes?.some((c:any) => c.resolutions?.length > 0)) && (
                             <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-[40px] opacity-20">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">No Reliability BKMs Linked</p>
                             </div>
                           )}
                        </div>
                     </section>

                     {/* 3. Affected Assets */}
                     <section className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2 border-l-2 border-slate-500 pl-4">
                           AFFECTED_INFRASTRUCTURE
                        </h3>
                        <div className="flex flex-wrap gap-3">
                           {selectedMode.affected_assets?.map((asset: any) => (
                             <div key={asset.id} className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl flex items-center gap-3 group hover:border-rose-500/30 transition-all">
                                <Server size={16} className="text-slate-500 group-hover:text-rose-500" />
                                <span className="text-[11px] font-black text-white uppercase tracking-tighter">{asset.name}</span>
                             </div>
                           ))}
                        </div>
                     </section>
                  </div>
               </div>

               {/* Right Context (Root Causes & Status) */}
               <div className="w-[35%] flex flex-col space-y-3 overflow-hidden">
                  {/* Root Causes Stack */}
                  <div className="flex-1 flex flex-col glass-panel rounded-[30px] border border-white/5 bg-black/40 overflow-hidden">
                     <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <Zap size={16} className="text-amber-500" />
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Attributed Causes</h3>
                        </div>
                        <button onClick={() => setShowCauseWizard(true)} className="p-2 hover:bg-white/5 rounded-xl text-amber-500 transition-all"><Plus size={18}/></button>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                        {selectedMode.causes?.map((cause: any) => (
                          <div key={cause.id} className="p-6 rounded-[24px] bg-black/60 border border-white/5 space-y-4 group hover:border-amber-500/30 transition-all">
                             <p className="text-xs font-black text-white uppercase leading-tight group-hover:text-amber-400 transition-colors">{cause.cause_text}</p>
                             <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{cause.responsible_team}</span>
                                <div className="flex items-center gap-2">
                                   <div className={`w-2 h-2 rounded-full ${cause.occurrence_level > 7 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-amber-500'}`} />
                                   <span className="text-xs font-black text-amber-500 italic">{cause.occurrence_level}/10</span>
                                </div>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>

                  {/* Operational Status Panel */}
                  <div className="h-[30%] glass-panel rounded-[30px] border border-white/5 bg-gradient-to-br from-black/60 to-slate-900/60 p-8 flex flex-col justify-between relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500 blur-[80px] opacity-10" />
                     <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">OPERATIONAL_STATE</p>
                        <div className="flex items-center gap-4">
                           <div className="w-4 h-4 rounded-full bg-rose-500 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]" />
                           <h4 className="text-4xl font-black text-white uppercase italic tracking-tighter">{selectedMode.status}</h4>
                        </div>
                     </div>
                     <div className="flex gap-3 relative z-10">
                        <button className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all">Update Status</button>
                        <button onClick={() => setSelectedModeId(null)} className="px-4 bg-white/5 hover:bg-rose-500/20 border border-white/5 rounded-2xl text-rose-500 transition-all"><X size={20} /></button>
                     </div>
                  </div>
               </div>
            </motion.div>
          ) : (
            <div className="hidden" />
          )}
        </AnimatePresence>
      </div>

      {/* Addition Wizard Modals */}
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

        {showCauseWizard && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 20, opacity: 0 }} 
              className="glass-panel w-full max-w-6xl h-[85vh] flex flex-col rounded-[40px] border border-amber-500/20 overflow-hidden shadow-2xl"
            >
               <div className="p-10 border-b border-white/5 bg-white/5 flex items-start justify-between shrink-0">
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="px-3 py-1 rounded-lg bg-amber-600/20 border border-amber-500/30 text-[9px] font-black text-amber-500 uppercase tracking-widest">SOURCE_ENTRY</div>
                       <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">ROOT_CAUSE_INVESTIGATION</div>
                    </div>
                    <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">TRACE_SOURCE</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Failure Origin Identification & Technical Attribution</p>
                 </div>
                 <button onClick={() => setShowCauseWizard(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all"><X size={24}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                 <CauseWizard onComplete={() => { setShowCauseWizard(false); queryClient.invalidateQueries({ queryKey: ['far'] }); }} />
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMitigationWizard && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
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
                 <MitigationWizard modeId={selectedModeId!} onComplete={() => { setShowMitigationWizard(false); queryClient.invalidateQueries({ queryKey: ['far'] }); }} />
               </div>
            </motion.div>
          </div>
        )}

        {showResolutionWizard && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
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
                 <ResolutionWizard mode={selectedMode!} onComplete={() => { setShowResolutionWizard(false); queryClient.invalidateQueries({ queryKey: ['far'] }); }} />
               </div>
            </motion.div>
          </div>
        )}

        {showPreventionWizard && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
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
                 <PreventionWizard modeId={selectedModeId!} onComplete={() => { setShowPreventionWizard(false); queryClient.invalidateQueries({ queryKey: ['far'] }); }} />
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
            <button key={t} onClick={() => setFormData({...formData, mitigation_type: t})} className={`p-6 rounded-[30px] border transition-all text-center ${formData.mitigation_type === t ? 'bg-sky-500/20 border-sky-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}>
               <p className="text-[11px] font-black uppercase tracking-[0.2em]">{t}</p>
            </button>
          ))}
       </div>
       <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Mitigation Protocol</label>
          <textarea value={formData.mitigation_steps} onChange={e => setFormData({...formData, mitigation_steps: e.target.value})} placeholder="Technical steps / Monitoring configuration details..." className="w-full bg-black/40 border border-white/10 rounded-[30px] p-6 text-xs font-bold text-white min-h-[160px] outline-none focus:border-sky-500 transition-all" />
       </div>
       <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Ownership</label>
          <input value={formData.responsible_team} onChange={e => setFormData({...formData, responsible_team: e.target.value})} placeholder="Responsible Team (e.g., SRE / Network)..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-sky-500 transition-all" />
       </div>
       <button onClick={() => mutation.mutate(formData)} className="w-full bg-sky-600 hover:bg-sky-500 text-white py-5 rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-sky-500/20 transition-all">Commit Mitigation Entry</button>
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
          <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Target Root Cause</label>
          <select value={selectedCauseId} onChange={e => setSelectedCauseId(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-[20px] px-6 py-4 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all appearance-none">
             {mode.causes?.map((c:any) => <option key={c.id} value={c.id}>{c.cause_text.slice(0, 100)}...</option>)}
          </select>
       </div>
       <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Select Verified BKM Alignment</label>
          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
             {bkms?.map((b:any) => (
               <button key={b.id} onClick={() => setFormData({...formData, knowledge_id: b.id})} className={`p-4 rounded-2xl border text-left transition-all ${formData.knowledge_id === b.id ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'}`}>
                  <p className="text-[11px] font-black uppercase tracking-tight">{b.title}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">BKM_ID: {b.id}</p>
               </button>
             ))}
          </div>
       </div>
       <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Preventive Follow-up Protocol</label>
          <textarea value={formData.preventive_follow_up} onChange={e => setFormData({...formData, preventive_follow_up: e.target.value})} placeholder="Detailed preventive actions to prevent recurrence..." className="w-full bg-black/40 border border-white/10 rounded-[30px] p-6 text-xs font-bold text-white min-h-[120px] outline-none focus:border-emerald-500 transition-all" />
       </div>
       <button onClick={() => mutation.mutate(formData)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all">Map BKM Matrix Alignment</button>
    </div>
  )
}

function PreventionWizard({ modeId, onComplete }: { modeId: number, onComplete: () => void }) {
  const [formData, setFormData] = useState({ prevention_action: '', responsible_team: '', target_date: new Date().toISOString().split('T')[0] })
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/v1/far/prevention', { method: 'POST', body: JSON.stringify({ ...data, failure_mode_id: modeId }) })
      // Also update mode status to Prevented
      await apiFetch(`/api/v1/far/modes/${modeId}`, { method: 'PUT', body: JSON.stringify({ status: 'Prevented' }) })
      return res.json()
    },
    onSuccess: () => { toast.success('System Permanently Hardened'); onComplete() }
  })
  return (
    <div className="space-y-8">
       <div className="bg-emerald-500/10 p-6 rounded-[30px] border border-emerald-500/20">
          <p className="text-xs text-emerald-400 font-black leading-relaxed uppercase tracking-tight">Warning: Logging a prevention action will promote this Failure Mode to "Prevented" status, indicating the risk is architecturaly eliminated through engineering hardening.</p>
       </div>
       <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Hardening Description</label>
          <textarea value={formData.prevention_action} onChange={e => setFormData({...formData, prevention_action: e.target.value})} placeholder="Describe architectural/design proofing change..." className="w-full bg-black/40 border border-white/10 rounded-[30px] p-6 text-xs font-bold text-white min-h-[160px] outline-none focus:border-emerald-500 transition-all" />
       </div>
       <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Hardening Team</label>
             <input value={formData.responsible_team} onChange={e => setFormData({...formData, responsible_team: e.target.value})} placeholder="Engineering Team..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all" />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Completion Target</label>
             <input type="date" value={formData.target_date} onChange={e => setFormData({...formData, target_date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all" />
          </div>
       </div>
       <button onClick={() => mutation.mutate(formData)} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-5 rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all">Finalize Architectural Design Proof</button>
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
  const [causeSearch, setCauseSearch] = useState('')

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await apiFetch('/api/v1/settings/options')).json() })
  const systems = options?.filter((o: any) => o.category === 'LogicalSystem') || []
  
  const { data: devices } = useQuery({ 
    queryKey: ['devices', formData.system_name], 
    enabled: !!formData.system_name,
    queryFn: async () => (await apiFetch(`/api/v1/devices/?system=${encodeURIComponent(formData.system_name)}`)).json() 
  })

  const { data: allCauses } = useQuery({
    queryKey: ['far', 'causes'],
    queryFn: async () => (await apiFetch('/api/v1/far/causes')).json()
  })

  const filteredDevices = useMemo(() => {
    if (!devices) return []
    if (!assetSearch) return devices
    return devices.filter((d: any) => 
      d.name.toLowerCase().includes(assetSearch.toLowerCase()) || 
      d.model.toLowerCase().includes(assetSearch.toLowerCase())
    )
  }, [devices, assetSearch])

  const filteredCauses = useMemo(() => {
    if (!allCauses) return []
    if (!causeSearch) return allCauses
    return allCauses.filter((c: any) => 
      c.cause_text.toLowerCase().includes(causeSearch.toLowerCase()) ||
      c.responsible_team?.toLowerCase().includes(causeSearch.toLowerCase())
    )
  }, [allCauses, causeSearch])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/v1/far/modes', { method: 'POST', body: JSON.stringify(data) })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to document failure mode')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Failure Mode Documented')
      onComplete()
    },
    onError: (e: any) => toast.error(e.message)
  })

  const rpn = formData.severity * formData.occurrence * formData.detection

  return (
    <div className="grid grid-cols-12 gap-12">
      {/* Left: Metadata */}
      <div className="col-span-7 space-y-10">
        <section className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Logical System Alignment *</label>
            <StyledSelect 
              options={systems.map((s: any) => ({ label: s.label, value: s.value }))}
              value={formData.system_name}
              onChange={(e) => setFormData({ ...formData, system_name: e.target.value })}
              placeholder="Select Target System..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Failure Mode Title *</label>
            <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value.toUpperCase() })} placeholder="e.g. CORE_NETWORK_CONGESTION" className="w-full bg-black/40 border border-white/10 rounded-[20px] px-6 py-4 text-sm font-black uppercase tracking-tight outline-none focus:border-rose-500 transition-all text-white" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Impact / Effect Statement</label>
            <textarea value={formData.effect} onChange={e => setFormData({ ...formData, effect: e.target.value })} placeholder="What are the downstream consequences when this failure mode activates?" className="w-full bg-black/40 border border-white/10 rounded-[30px] p-6 text-sm font-bold tracking-tight outline-none focus:border-rose-500 transition-all min-h-[140px] text-white custom-scrollbar" />
          </div>
        </section>

        <section className="bg-black/20 p-8 rounded-[40px] border border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">ASSET_ATTRIBUTION</label>
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
                <label key={d.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${formData.affected_assets.includes(d.id) ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'}`}>
                  <input type="checkbox" className="hidden" checked={formData.affected_assets.includes(d.id)} onChange={() => {
                    const next = formData.affected_assets.includes(d.id) ? formData.affected_assets.filter((id: any) => id !== d.id) : [...formData.affected_assets, d.id]
                    setFormData({ ...formData, affected_assets: next })
                  }} />
                  <Server size={18} className={formData.affected_assets.includes(d.id) ? 'text-rose-500' : 'text-slate-600'} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-tight leading-none truncate">{d.name}</p>
                    <p className="text-[9px] text-slate-500 font-black uppercase truncate mt-1">{d.model}</p>
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

        <section className="bg-black/20 p-8 rounded-[40px] border border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">ROOT_CAUSE_LINKAGE</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input 
                value={causeSearch}
                onChange={e => setCauseSearch(e.target.value)}
                placeholder="SEARCH_CAUSES..."
                className="bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-rose-500 w-48 transition-all"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3 max-h-[220px] overflow-y-auto pr-3 custom-scrollbar">
            {filteredCauses.map((c: any) => (
              <label key={c.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${formData.cause_ids.includes(c.id) ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'}`}>
                <input type="checkbox" className="hidden" checked={formData.cause_ids.includes(c.id)} onChange={() => {
                  const next = formData.cause_ids.includes(c.id) ? formData.cause_ids.filter((id: any) => id !== c.id) : [...formData.cause_ids, c.id]
                  setFormData({ ...formData, cause_ids: next })
                }} />
                <Zap size={18} className={formData.cause_ids.includes(c.id) ? 'text-amber-500' : 'text-slate-600'} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-tight leading-none truncate">{c.cause_text}</p>
                  <p className="text-[9px] text-slate-500 font-black uppercase truncate mt-1">{c.responsible_team || 'GENERAL_OPS'}</p>
                </div>
                <div className="text-right">
                   <p className="text-xs font-black text-amber-500 italic">{c.occurrence_level}/10</p>
                </div>
              </label>
            ))}
            {filteredCauses.length === 0 && (
              <div className="py-12 text-center text-[10px] font-black uppercase text-slate-600 tracking-[0.3em] italic">
                No root causes identified. Add source documentation first.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Right: Guided Scoring */}
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
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">CALCULATED_RPN_INDEX</p>
              <div className="flex items-baseline gap-4 mt-2">
                <h4 className={`text-7xl font-black tracking-tighter italic transition-colors ${rpn > 100 ? 'text-rose-500' : 'text-white'}`}>{rpn}</h4>
                <div className="flex flex-col">
                   <span className={`text-sm font-black uppercase tracking-widest ${rpn > 100 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                      {rpn > 100 ? 'CRITICAL_RISK' : 'NOMINAL_RISK'}
                   </span>
                   <span className="text-[9px] text-slate-600 font-bold uppercase">Impact Factor</span>
                </div>
              </div>
           </div>
           <button 
             disabled={!formData.system_name || !formData.title || mutation.isPending}
             onClick={() => mutation.mutate(formData)} 
             className="relative z-10 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:grayscale text-white py-6 rounded-[24px] text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-4"
           >
             {mutation.isPending ? <RefreshCcw size={20} className="animate-spin" /> : <Save size={20} />} 
             COMMIT_FAILURE_MODE
           </button>
        </div>
      </div>
    </div>
  )
}

// --- Root Cause Wizard Component ---
function CauseWizard({ onComplete }: { onComplete: () => void }) {
  const [formData, setFormData] = useState<any>({
    cause_text: '',
    occurrence_level: 1,
    responsible_team: '',
    mode_ids: [],
  })
  const [modeSearch, setModeSearch] = useState('')

  const { data: allModes } = useQuery({
    queryKey: ['far', 'modes'],
    queryFn: async () => (await apiFetch('/api/v1/far/modes')).json()
  })

  const filteredModes = useMemo(() => {
    if (!allModes) return []
    if (!modeSearch) return allModes
    return allModes.filter((m: any) => 
      m.title.toLowerCase().includes(modeSearch.toLowerCase()) ||
      m.system_name.toLowerCase().includes(modeSearch.toLowerCase())
    )
  }, [allModes, modeSearch])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/v1/far/causes', { method: 'POST', body: JSON.stringify(data) })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to document root cause')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Root Cause Documented')
      onComplete()
    },
    onError: (e: any) => toast.error(e.message)
  })

  return (
    <div className="grid grid-cols-12 gap-12">
      {/* Left: Metadata */}
      <div className="col-span-7 space-y-10">
        <section className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Cause Description *</label>
            <textarea 
              value={formData.cause_text} 
              onChange={e => setFormData({ ...formData, cause_text: e.target.value.toUpperCase() })} 
              placeholder="TECHNICAL DESCRIPTION OF THE FAILURE ORIGIN..." 
              className="w-full bg-black/40 border border-white/10 rounded-[30px] p-6 text-sm font-black tracking-tight outline-none focus:border-amber-500 transition-all min-h-[160px] text-white custom-scrollbar uppercase" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Responsible POC / Team *</label>
            <input 
              value={formData.responsible_team} 
              onChange={e => setFormData({ ...formData, responsible_team: e.target.value.toUpperCase() })} 
              placeholder="e.g. CLOUD_SRE / NETWORK_OPS / DB_TEAM" 
              className="w-full bg-black/40 border border-white/10 rounded-[20px] px-6 py-4 text-sm font-black uppercase tracking-tight outline-none focus:border-amber-500 transition-all text-white" 
            />
          </div>
        </section>

        <section className="bg-black/20 p-8 rounded-[40px] border border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">FAILURE_MODE_LINKAGE</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input 
                value={modeSearch}
                onChange={e => setModeSearch(e.target.value)}
                placeholder="SEARCH_MODES..."
                className="bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-amber-500 w-48 transition-all"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3 max-h-[260px] overflow-y-auto pr-3 custom-scrollbar">
            {filteredModes.map((m: any) => (
              <label key={m.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${formData.mode_ids.includes(m.id) ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'}`}>
                <input type="checkbox" className="hidden" checked={formData.mode_ids.includes(m.id)} onChange={() => {
                  const next = formData.mode_ids.includes(m.id) ? formData.mode_ids.filter((id: any) => id !== m.id) : [...formData.mode_ids, m.id]
                  setFormData({ ...formData, mode_ids: next })
                }} />
                <ShieldAlert size={18} className={formData.mode_ids.includes(m.id) ? 'text-amber-500' : 'text-slate-600'} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] font-black px-2 py-0.5 rounded-lg bg-white/10 tracking-widest uppercase">{m.system_name}</span>
                    <p className="text-[11px] font-black uppercase tracking-tight leading-none truncate">{m.title}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-xs font-black text-rose-500 italic">RPN {m.rpn}</p>
                </div>
              </label>
            ))}
          </div>
        </section>
      </div>

      {/* Right: Occurrence & Submit */}
      <div className="col-span-5 space-y-10">
        <div className="bg-amber-500/5 p-8 rounded-[40px] border border-amber-500/10 shadow-inner">
          <ScoreSelector 
            label="Occurrence Level (O)" 
            value={formData.occurrence_level} 
            onChange={(v) => setFormData({ ...formData, occurrence_level: v })} 
            levels={OCCURRENCE_LEVELS}
            color="text-amber-500"
          />
        </div>

        <div className="bg-slate-900 rounded-[40px] p-10 border border-white/10 space-y-8 shadow-2xl overflow-hidden relative group">
           <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
           <div className="relative z-10 space-y-6">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">LINKAGE_SUMMARY</p>
                 <p className="text-sm font-black text-white uppercase tracking-tight">Associating with {formData.mode_ids.length} Failure Mode{formData.mode_ids.length !== 1 ? 's' : ''}</p>
              </div>
              
              <button 
                disabled={!formData.cause_text || !formData.responsible_team || mutation.isPending}
                onClick={() => mutation.mutate(formData)} 
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:grayscale text-white py-6 rounded-[24px] text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-4"
              >
                {mutation.isPending ? <RefreshCcw size={20} className="animate-spin" /> : <Save size={20} />} 
                COMMIT_ROOT_CAUSE
              </button>
           </div>
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
        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{label}</label>
        <span className={`text-2xl font-black ${color} italic tracking-tighter`}>{value}</span>
      </div>
      
      <button 
        onClick={() => setShowOptions(!showOptions)}
        className="w-full bg-black/40 border border-white/10 rounded-3xl p-5 text-left hover:border-white/20 transition-all flex items-center justify-between shadow-lg"
      >
        <div className="min-w-0">
          <p className="text-xs font-black text-white uppercase tracking-tight truncate">{currentLevel?.label}</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 line-clamp-1">{currentLevel?.desc}</p>
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
                className={`w-full text-left p-4 border-b border-white/5 last:border-0 hover:bg-white/5 rounded-2xl transition-all ${value === level.value ? 'bg-rose-500/10' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-black uppercase tracking-tight ${value === level.value ? color : 'text-white'}`}>{level.label}</span>
                  <span className={`text-xs font-black italic ${value === level.value ? color : 'text-slate-600'}`}>{level.value}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight font-bold uppercase">{level.desc}</p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
