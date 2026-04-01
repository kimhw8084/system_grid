import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ShieldAlert, Zap, Save, X, PlusCircle, User,
  RefreshCcw, AlertTriangle, Lightbulb, ShieldCheck, 
  Activity, Server, FileText, Clipboard, ArrowRight, Shield, 
  CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye,
  Target, AlertCircle, Settings, Layers, Box, Link2, ExternalLink,
  ChevronLeft
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
  
  // Queries
  const { data: modes, isLoading: modesLoading } = useQuery({ 
    queryKey: ['far-modes'], 
    queryFn: async () => (await apiFetch('/api/v1/far/modes')).json() 
  })

  const { data: causes, isLoading: causesLoading } = useQuery({
    queryKey: ['far-causes'],
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
    if (selectedModeId) {
      result = result.filter((c: any) => 
        c.failure_modes?.some((m: any) => m.id === selectedModeId)
      )
    }
    return result
  }, [causes, searchTerm, selectedModeId])

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
    { lv: 8, label: 'Prevented', desc: 'Eliminated / Design Proofed', color: 'bg-emerald-500' },
    { lv: 7, label: 'Triple Shield', desc: 'Monitoring + Resolution + Workaround', color: 'bg-emerald-400' },
    { lv: 6, label: 'Automated Fix', desc: 'Monitoring + Resolution', color: 'bg-sky-500' },
    { lv: 5, label: 'Hybrid Patch', desc: 'Resolution + Workaround', color: 'bg-sky-400' },
    { lv: 4, label: 'Resolved Only', desc: 'Manual Permanent Fix', color: 'bg-blue-500' },
    { lv: 3, label: 'Detect & Patch', desc: 'Monitoring + Workaround', color: 'bg-amber-500' },
    { lv: 2, label: 'Workaround Only', desc: 'Temporary Patch Only', color: 'bg-amber-400' },
    { lv: 1, label: 'Visibility Only', desc: 'Monitoring Without Action', color: 'bg-rose-400' },
    { lv: 0, label: 'Exposed', desc: 'No Monitoring / No Action', color: 'bg-rose-600' }
  ]

  const toggleSystem = (sys: string) => {
    setSelectedSystems(prev => 
      prev.includes(sys) ? prev.filter(s => s !== sys) : [...prev, sys]
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-2 text-white">
            <Target size={24} className="text-rose-500" /> Failure Analysis & Resolution (FAR)
          </h1>
          <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-bold">Reliability Knowledge Engine & Risk Mitigation</p>
        </div>
        
        <div className="flex items-center space-x-3">
           <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Search modes/causes..." 
                className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-rose-500/50 w-64 transition-all" 
              />
           </div>
           
           <button 
             onClick={() => setShowCauseWizard(true)}
             className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2"
           >
             <Plus size={16} /> Add Root Cause
           </button>

           <button 
             onClick={() => setShowWizard(true)}
             className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-2"
           >
             <Plus size={16} /> Add Failure Mode
           </button>
        </div>
      </div>

      {/* System Command Toggles */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar no-scrollbar">
         <button 
           onClick={() => setSelectedSystems([])}
           className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${selectedSystems.length === 0 ? 'bg-rose-500 border-rose-400 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'}`}
         >
           Global View
         </button>
         <div className="h-4 w-px bg-white/10 mx-1" />
         {availableSystems.map(sys => (
           <button 
             key={sys}
             onClick={() => toggleSystem(sys)}
             className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${selectedSystems.includes(sys) ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'}`}
           >
             {sys}
           </button>
         ))}
      </div>

      {/* Tactical Overview Ribbon - Re-Architected */}
      <div className="grid grid-cols-4 gap-4">
         {/* SRI Index */}
         <div className="glass-panel p-4 rounded-3xl border-white/5 bg-[#0a0c14]/40 flex flex-col justify-between group overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-32 h-32 blur-[40px] opacity-10 transition-colors ${metrics.sri > 70 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <div className="flex items-center justify-between mb-2 relative z-10">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reliability Index (SRI)</p>
               <Activity size={14} className={metrics.sri > 70 ? 'text-emerald-500' : 'text-rose-500'} />
            </div>
            <div className="flex items-baseline gap-2 relative z-10">
               <h4 className={`text-3xl font-black tracking-tighter ${metrics.sri > 70 ? 'text-emerald-400' : 'text-rose-400'}`}>{metrics.sri}</h4>
               <span className="text-[10px] font-black text-slate-600 uppercase">/100</span>
            </div>
            <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden relative z-10">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${metrics.sri}%` }}
                 className={`h-full ${metrics.sri > 70 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`} 
               />
            </div>
         </div>

         {/* Risk Density */}
         <div className="glass-panel p-4 rounded-3xl border-white/5 bg-[#0a0c14]/40 flex flex-col justify-between group overflow-hidden relative">
            <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Risk Density</p>
               <Layers size={14} className="text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
               <h4 className="text-3xl font-black tracking-tighter text-white">{metrics.riskDensity}</h4>
               <span className="text-[10px] font-black text-slate-600 uppercase">RPN/ASSET</span>
            </div>
            <div className="mt-2 flex gap-0.5">
               {Array.from({ length: 10 }).map((_, i) => (
                 <div key={i} className={`h-1.5 flex-1 rounded-sm ${i < (parseFloat(metrics.riskDensity) / 10) ? 'bg-amber-500' : 'bg-white/5'}`} />
               ))}
            </div>
         </div>

         {/* Mitigation Coverage */}
         <div className="glass-panel p-4 rounded-3xl border-white/5 bg-[#0a0c14]/40 flex flex-col justify-between group overflow-hidden relative">
            <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mitigation Ratio</p>
               <ShieldCheck size={14} className="text-sky-400" />
            </div>
            <div className="flex items-baseline gap-2">
               <h4 className="text-3xl font-black tracking-tighter text-white">{metrics.mitRatio}%</h4>
               <span className="text-[10px] font-black text-slate-600 uppercase">RESOLVED</span>
            </div>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2">
               {metrics.mitRatio > 80 ? 'Fortified' : metrics.mitRatio > 50 ? 'Stable' : 'Exposed'}
            </p>
         </div>

         {/* Critical Modes Heatmap */}
         <div className="glass-panel p-4 rounded-3xl border-white/5 bg-[#0a0c14]/40 flex flex-col justify-between group overflow-hidden relative">
            <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Avg Failure Severity</p>
               <AlertTriangle size={14} className="text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2">
               <h4 className="text-3xl font-black tracking-tighter text-white">{metrics.avgRPN}</h4>
               <span className="text-[10px] font-black text-slate-600 uppercase">AVG RPN</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
               <div className="flex-1 h-1 bg-white/5 rounded-full relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 opacity-20" />
                  <motion.div 
                    animate={{ left: `${Math.min(100, (metrics.avgRPN / 500) * 100)}%` }}
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_5px_white]" 
                  />
               </div>
            </div>
         </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
        {/* Pane 1: Failure Modes (with Maturity Staircase) */}
        <div className="flex-1 flex flex-col glass-panel rounded-3xl overflow-hidden border-white/5 bg-[#0a0c14]/40 relative">
           {isLoading && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/60 backdrop-blur-sm space-y-4 text-rose-500">
                <div className="relative">
                   <Target size={40} className="animate-ping absolute inset-0 opacity-20" />
                   <Target size={40} className="relative animate-pulse" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Synching Reliability Matrix...</p>
             </div>
           )}

           {/* Maturity Staircase Header */}
           <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-4">
                 <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reliability Maturity Distribution</h3>
                    <p className="text-[8px] text-slate-600 uppercase font-bold tracking-widest mt-0.5">Fleet-wide Mitigation Effectiveness</p>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[8px] font-black text-slate-500 uppercase">Target: Level 8</span>
                 </div>
              </div>
              
              <div className="flex items-end gap-1 h-20">
                 {maturityLevels.slice().reverse().map((ml: any) => {
                   const count = (metrics as any).maturityDist[ml.lv] || 0
                   const pct = filteredModes?.length ? (count / filteredModes.length) * 100 : 0
                   return (
                     <div key={ml.lv} className="flex-1 group relative flex flex-col items-center justify-end h-full">
                        <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                           <div className="bg-slate-900 border border-white/10 px-2 py-1 rounded text-[8px] font-black text-white uppercase">
                              LV.{ml.lv} {ml.label}: {count} MODES
                           </div>
                        </div>
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(4, pct)}%` }}
                          className={`w-full rounded-t-lg transition-all cursor-help ${ml.color} ${count === 0 ? 'opacity-10 grayscale' : 'opacity-80 group-hover:opacity-100 shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`}
                        />
                        <div className={`mt-1 text-[7px] font-black uppercase ${count > 0 ? 'text-slate-300' : 'text-slate-700'}`}>L{ml.lv}</div>
                     </div>
                   )
                 })}
              </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {filteredModes?.length === 0 && !isLoading ? (
                 <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <AlertTriangle size={48} className="mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Failure Modes Found</p>
                 </div>
              ) : (
                <div className="space-y-2">
                   {filteredModes?.map((mode: any) => {
                     const rpnColor = mode.rpn > 200 ? 'text-rose-500' : mode.rpn > 100 ? 'text-amber-500' : 'text-emerald-500'
                     
                     // Calculate local maturity for this item
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
                       <div 
                         key={mode.id} 
                         onClick={() => setSelectedModeId(selectedModeId === mode.id ? null : mode.id)}
                         className={`group glass-panel p-3 rounded-2xl border-white/5 hover:border-white/20 cursor-pointer transition-all ${selectedModeId === mode.id ? 'bg-white/10 ring-1 ring-rose-500/50' : 'bg-[#0a0c14]/40'}`}
                       >
                          <div className="flex items-start justify-between">
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                   <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 uppercase tracking-widest">
                                      {mode.system_name}
                                   </span>
                                   <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${ml.color} bg-opacity-20 text-[8px] font-black uppercase tracking-widest`}>
                                      <Shield size={8} /> LV.{lv} {ml.label}
                                   </div>
                                </div>
                                <h4 className="text-sm font-black text-white group-hover:text-rose-400 transition-colors truncate">{mode.title}</h4>
                                <p className="text-[10px] text-slate-500 line-clamp-1 mt-1 font-medium">{mode.effect}</p>
                             </div>
                             
                             <div className="flex flex-col items-end gap-2 ml-4">
                                <div className="text-right">
                                   <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">RPN SCORE</p>
                                   <p className={`text-lg font-black leading-none ${rpnColor}`}>{mode.rpn}</p>
                                </div>
                             </div>
                          </div>
                       </div>
                     )
                   })}
                </div>
              )}
           </div>
        </div>

        {/* Pane 2: Root Causes */}
        <div className="flex-1 flex flex-col glass-panel rounded-3xl overflow-hidden border-white/5 bg-[#0a0c14]/40 relative">
           <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500 font-black uppercase tracking-[0.2em] text-[11px]">
                <Zap size={16} />
                <span>Root Causes <span className="text-slate-500 ml-1 opacity-50">[{filteredCauses.length}]</span></span>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[8px] font-black text-slate-500 uppercase">Live Analysis</span>
                 </div>
              </div>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {filteredCauses.map((cause: Cause) => (
                <button
                  key={cause.id}
                  onClick={() => setSelectedCauseId(selectedCauseId === cause.id ? null : cause.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all relative group overflow-hidden ${selectedCauseId === cause.id ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black uppercase tracking-tight leading-tight mb-2 pr-2">{cause.cause_text}</p>
                      <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1">
                            <User size={10} className="text-slate-500" />
                            <span className="text-[9px] font-black uppercase opacity-60">{cause.responsible_team || 'General Ops'}</span>
                         </div>
                         <div className="flex items-center gap-1">
                            <Layers size={10} className="text-slate-500" />
                            <span className="text-[9px] font-black uppercase opacity-60">{cause.failure_modes?.length || 0} Modes Linked</span>
                         </div>
                      </div>
                    </div>
                    <div className="text-right ml-4 bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                       <p className="text-[8px] font-black uppercase opacity-60 mb-0.5">OCCUR</p>
                       <p className={`text-xl font-black ${selectedCauseId === cause.id ? 'text-white' : 'text-amber-500'}`}>{cause.occurrence_level}/10</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                     <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${cause.occurrence_level > 7 ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Frequency: {cause.occurrence_level > 7 ? 'Critical' : 'Moderate'}</span>
                     </div>
                     <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md">
                        <Lightbulb size={10} className="text-amber-500" />
                        <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400">BKM Ready</span>
                     </div>
                  </div>

                  {selectedCauseId === cause.id && <motion.div layoutId="cause-active" className="absolute left-0 top-0 bottom-0 w-1 bg-white" />}
                </button>
              ))}
              {filteredCauses.length === 0 && !isLoading && (
                <div className="h-full flex flex-col items-center justify-center py-20 text-slate-600 opacity-20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.05)_0%,transparent_70%)]" />
                  <Activity size={64} strokeWidth={1} className="mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2">No Root Causes Identified</p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-700">Database consistent. All telemetry within bounds.</p>
                </div>
                )}
                </div>
                </div>
                </div>

                {/* Addition Wizard Modal */}
      <AnimatePresence>
        {showWizard && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[32px] border border-rose-500/30 overflow-hidden"
            >
               <div className="p-6 border-b border-white/5 flex items-center justify-between bg-rose-500/5">
                 <div className="flex items-center gap-3">
                   <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500">
                     <ShieldAlert size={20} />
                   </div>
                   <div>
                     <h2 className="text-lg font-black uppercase tracking-tight text-white italic">Failure Mode Registry</h2>
                     <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Formal Risk Documentation & Analysis</p>
                   </div>
                 </div>
                 <button onClick={() => setShowWizard(false)} className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-xl"><X size={20}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                 <FARWizard onComplete={() => { setShowWizard(false); queryClient.invalidateQueries({ queryKey: ['far-modes'] }); queryClient.invalidateQueries({ queryKey: ['far-causes'] }); }} />
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
    queryKey: ['far-causes-all'],
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
    <div className="grid grid-cols-12 gap-8">
      {/* Left: Metadata */}
      <div className="col-span-7 space-y-6">
        <section className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Logical System</label>
            <StyledSelect 
              options={systems.map((s: any) => ({ label: s.label, value: s.value }))}
              value={formData.system_name}
              onChange={(e) => setFormData({ ...formData, system_name: e.target.value })}
              placeholder="Select Logical System..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Failure Title</label>
            <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Memory Leak / Network Congestion" className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-tight outline-none focus:border-rose-500/50 transition-all text-white" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Impact / Effect Statement</label>
            <textarea value={formData.effect} onChange={e => setFormData({ ...formData, effect: e.target.value })} placeholder="What happens when this fails?" className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold tracking-tight outline-none focus:border-rose-500/50 transition-all min-h-[100px] text-white custom-scrollbar" />
          </div>
        </section>

        <section className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Asset Attribution</label>
            {formData.system_name && (
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input 
                  value={assetSearch}
                  onChange={e => setAssetSearch(e.target.value)}
                  placeholder="Filter..."
                  className="bg-black/60 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-[9px] font-black uppercase outline-none focus:border-rose-500/50 w-32 transition-all"
                />
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
            {formData.system_name ? (
              filteredDevices.map((d: any) => (
                <label key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.affected_assets.includes(d.id) ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/10' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'}`}>
                  <input type="checkbox" className="hidden" checked={formData.affected_assets.includes(d.id)} onChange={() => {
                    const next = formData.affected_assets.includes(d.id) ? formData.affected_assets.filter((id: any) => id !== d.id) : [...formData.affected_assets, d.id]
                    setFormData({ ...formData, affected_assets: next })
                  }} />
                  <Server size={14} className={formData.affected_assets.includes(d.id) ? 'text-rose-500' : 'text-slate-600'} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-tight leading-none truncate">{d.name}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase truncate">{d.model}</p>
                  </div>
                </label>
              ))
            ) : (
              <div className="col-span-2 py-8 text-center text-[10px] font-black uppercase text-slate-600 tracking-widest italic">
                Select system to link assets
              </div>
            )}
          </div>
        </section>

        <section className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Linked Root Causes</label>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input 
                value={causeSearch}
                onChange={e => setCauseSearch(e.target.value)}
                placeholder="Search causes..."
                className="bg-black/60 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-[9px] font-black uppercase outline-none focus:border-rose-500/50 w-32 transition-all"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredCauses.map((c: any) => (
              <label key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.cause_ids.includes(c.id) ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/10' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'}`}>
                <input type="checkbox" className="hidden" checked={formData.cause_ids.includes(c.id)} onChange={() => {
                  const next = formData.cause_ids.includes(c.id) ? formData.cause_ids.filter((id: any) => id !== c.id) : [...formData.cause_ids, c.id]
                  setFormData({ ...formData, cause_ids: next })
                }} />
                <Zap size={14} className={formData.cause_ids.includes(c.id) ? 'text-amber-500' : 'text-slate-600'} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-tight leading-none truncate">{c.cause_text}</p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase truncate">{c.responsible_team || 'General Ops'}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-amber-500 italic">{c.occurrence_level}/10</p>
                </div>
              </label>
            ))}
            {filteredCauses.length === 0 && (
              <div className="py-8 text-center text-[10px] font-black uppercase text-slate-600 tracking-widest italic">
                No causes found. Add one first.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Right: Guided Scoring */}
      <div className="col-span-5 space-y-6">
        <div className="bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10 space-y-6">
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

        <div className="bg-slate-900 rounded-2xl p-6 border border-white/10 flex items-center justify-between shadow-2xl overflow-hidden relative group">
           <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent pointer-events-none" />
           <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Calculated RPN</p>
              <div className="flex items-baseline gap-2">
                <h4 className={`text-5xl font-black tracking-tighter italic transition-colors ${rpn > 100 ? 'text-rose-500' : 'text-white'}`}>{rpn}</h4>
                <span className={`text-[10px] font-black uppercase tracking-tighter ${rpn > 100 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                   {rpn > 100 ? 'Critical' : 'Nominal'}
                </span>
              </div>
           </div>
           <button 
             disabled={!formData.system_name || !formData.title || mutation.isPending}
             onClick={() => mutation.mutate(formData)} 
             className="relative z-10 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:grayscale text-white px-6 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-2"
           >
             {mutation.isPending ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} 
             Submit
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
    queryKey: ['far-modes-all'],
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
    <div className="grid grid-cols-12 gap-8">
      {/* Left: Metadata */}
      <div className="col-span-7 space-y-6">
        <section className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Cause Description</label>
            <textarea 
              value={formData.cause_text} 
              onChange={e => setFormData({ ...formData, cause_text: e.target.value })} 
              placeholder="Describe the technical origin of the failure..." 
              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold tracking-tight outline-none focus:border-amber-500/50 transition-all min-h-[120px] text-white custom-scrollbar" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Responsible Team / POC</label>
            <input 
              value={formData.responsible_team} 
              onChange={e => setFormData({ ...formData, responsible_team: e.target.value })} 
              placeholder="e.g. SRE / Network Ops / Database Team" 
              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-tight outline-none focus:border-amber-500/50 transition-all text-white" 
            />
          </div>
        </section>

        <section className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Link Failure Modes</label>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input 
                value={modeSearch}
                onChange={e => setModeSearch(e.target.value)}
                placeholder="Search modes..."
                className="bg-black/60 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-[9px] font-black uppercase outline-none focus:border-amber-500/50 w-32 transition-all"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredModes.map((m: any) => (
              <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.mode_ids.includes(m.id) ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/10' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'}`}>
                <input type="checkbox" className="hidden" checked={formData.mode_ids.includes(m.id)} onChange={() => {
                  const next = formData.mode_ids.includes(m.id) ? formData.mode_ids.filter((id: any) => id !== m.id) : [...formData.mode_ids, m.id]
                  setFormData({ ...formData, mode_ids: next })
                }} />
                <ShieldAlert size={14} className={formData.mode_ids.includes(m.id) ? 'text-rose-500' : 'text-slate-600'} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[7px] font-black px-1 rounded bg-white/10">{m.system_name}</span>
                    <p className="text-[10px] font-black uppercase tracking-tight leading-none truncate">{m.title}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-rose-500 italic">RPN {m.rpn}</p>
                </div>
              </label>
            ))}
          </div>
        </section>
      </div>

      {/* Right: Occurrence & Submit */}
      <div className="col-span-5 space-y-6">
        <div className="bg-amber-500/5 p-6 rounded-2xl border border-amber-500/10">
          <ScoreSelector 
            label="Occurrence Level (O)" 
            value={formData.occurrence_level} 
            onChange={(v) => setFormData({ ...formData, occurrence_level: v })} 
            levels={OCCURRENCE_LEVELS}
            color="text-amber-500"
          />
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-white/10 space-y-4 shadow-2xl overflow-hidden relative group">
           <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none" />
           <div className="relative z-10 space-y-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Impact Summary</p>
                 <p className="text-[11px] font-bold text-white uppercase leading-tight">Linking to {formData.mode_ids.length} Failure Mode{formData.mode_ids.length !== 1 ? 's' : ''}</p>
              </div>
              
              <button 
                disabled={!formData.cause_text || !formData.responsible_team || mutation.isPending}
                onClick={() => mutation.mutate(formData)} 
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:grayscale text-white px-6 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {mutation.isPending ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />} 
                Commit Root Cause
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
    <div className="space-y-2 relative">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label>
        <span className={`text-xl font-black ${color} italic`}>{value}</span>
      </div>
      
      <button 
        onClick={() => setShowOptions(!showOptions)}
        className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-left hover:border-white/20 transition-all flex items-center justify-between"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-black text-white uppercase truncate">{currentLevel?.label}</p>
          <p className="text-[9px] text-slate-500 font-medium line-clamp-1">{currentLevel?.desc}</p>
        </div>
        <ChevronRight size={14} className={`text-slate-600 transition-transform ${showOptions ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {showOptions && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[160] left-0 right-0 top-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar"
          >
            {levels.map((level) => (
              <button
                key={level.value}
                onClick={() => { onChange(level.value); setShowOptions(false); }}
                className={`w-full text-left p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-all ${value === level.value ? 'bg-rose-500/10' : ''}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[10px] font-black uppercase tracking-tight ${value === level.value ? color : 'text-white'}`}>{level.label}</span>
                  <span className={`text-[10px] font-black italic ${value === level.value ? color : 'text-slate-600'}`}>{level.value}</span>
                </div>
                <p className="text-[9px] text-slate-500 leading-tight">{level.desc}</p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
