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

export default function FAR() {
  const queryClient = useQueryClient()
  const [showWizard, setShowWizard] = useState(false)
  const [selectedModeId, setSelectedModeId] = useState<number | null>(null)
  const [selectedCauseId, setSelectedCauseId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Queries
  const { data: modes, isLoading: modesLoading } = useQuery({ 
    queryKey: ['far-modes'], 
    queryFn: async () => (await apiFetch('/api/v1/far/modes')).json() 
  })

  const { data: causes, isLoading: causesLoading } = useQuery({
    queryKey: ['far-causes'],
    queryFn: async () => (await apiFetch('/api/v1/far/causes')).json()
  })

  const isLoading = modesLoading || causesLoading

  // Filtering Logic
  const filteredModes = useMemo(() => {
    let result = modes || []
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
  }, [modes, searchTerm, selectedCauseId])

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
           
           {(selectedModeId || selectedCauseId) && (
             <button 
               onClick={() => { setSelectedModeId(null); setSelectedCauseId(null); }}
               className="p-2 bg-white/5 text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all flex items-center gap-2 text-[10px] font-black uppercase"
             >
               <RefreshCcw size={14} /> Reset Filter
             </button>
           )}

           <button 
             onClick={() => setShowWizard(true)}
             className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-2"
           >
             <Plus size={16} /> Add Failure Mode
           </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
        {/* Pane 1: Failure Modes */}
        <div className="flex-1 flex flex-col glass-panel rounded-3xl overflow-hidden border-white/5 bg-[#0a0c14]/40 relative">
           {isLoading && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/60 backdrop-blur-sm space-y-4 text-rose-500">
                <RefreshCcw size={32} className="animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing FAR Knowledge...</p>
             </div>
           )}
           <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-500">
                <ShieldAlert size={16} />
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em]">Failure Modes ({filteredModes.length})</h2>
              </div>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
              {filteredModes.map((mode: FailureMode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedModeId(selectedModeId === mode.id ? null : mode.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all relative group overflow-hidden ${selectedModeId === mode.id ? 'bg-rose-600 border-rose-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${selectedModeId === mode.id ? 'bg-white/20' : 'bg-rose-500/10 text-rose-500'}`}>{mode.system_name}</span>
                      <h3 className="text-sm font-black uppercase tracking-tight mt-1">{mode.title}</h3>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-black uppercase opacity-60">RPN</p>
                       <p className={`text-xl font-black ${mode.rpn > 100 ? 'text-amber-400' : ''} ${selectedModeId === mode.id ? 'text-white' : ''}`}>{mode.rpn}</p>
                    </div>
                  </div>
                  <p className={`text-[10px] font-medium leading-relaxed line-clamp-2 ${selectedModeId === mode.id ? 'text-white/80' : 'text-slate-500'}`}>
                    {mode.effect}
                  </p>
                  {selectedModeId === mode.id && <motion.div layoutId="mode-active" className="absolute left-0 top-0 bottom-0 w-1 bg-white" />}
                </button>
              ))}
              {filteredModes.length === 0 && !isLoading && (
                <div className="h-full flex flex-col items-center justify-center py-20 text-slate-600 opacity-30">
                  <Box size={48} />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-4">No Failure Modes Found</p>
                </div>
              )}
           </div>
        </div>

        {/* Pane 2: Root Causes */}
        <div className="flex-1 flex flex-col glass-panel rounded-3xl overflow-hidden border-white/5 bg-[#0a0c14]/40 relative">
           <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500">
                <Zap size={16} />
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em]">Root Causes ({filteredCauses.length})</h2>
              </div>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
              {filteredCauses.map((cause: Cause) => (
                <button
                  key={cause.id}
                  onClick={() => setSelectedCauseId(selectedCauseId === cause.id ? null : cause.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all relative group overflow-hidden ${selectedCauseId === cause.id ? 'bg-amber-600 border-amber-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-black uppercase tracking-tight leading-tight">{cause.cause_text}</p>
                    <div className="text-right ml-4">
                       <p className="text-[8px] font-black uppercase opacity-60">Occur</p>
                       <p className={`text-xl font-black ${selectedCauseId === cause.id ? 'text-white' : 'text-amber-500'}`}>{cause.occurrence_level}/10</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                     <User size={10} className="text-slate-500" />
                     <span className={`text-[9px] font-black uppercase tracking-widest ${selectedCauseId === cause.id ? 'text-white/60' : 'text-slate-500'}`}>{cause.responsible_team || 'General Ops'}</span>
                  </div>
                  {selectedCauseId === cause.id && <motion.div layoutId="cause-active" className="absolute left-0 top-0 bottom-0 w-1 bg-white" />}
                </button>
              ))}
              {filteredCauses.length === 0 && !isLoading && (
                <div className="h-full flex flex-col items-center justify-center py-20 text-slate-600 opacity-30">
                  <Activity size={48} />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-4">No Linked Causes Found</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Addition Wizard Modal */}
      <AnimatePresence>
        {showWizard && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="glass-panel w-[900px] max-h-[90vh] overflow-y-auto p-12 rounded-[40px] border border-rose-500/30 custom-scrollbar relative"
            >
               <button onClick={() => setShowWizard(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"><X size={32}/></button>
               <FARWizard onComplete={() => { setShowWizard(false); queryClient.invalidateQueries({ queryKey: ['far-modes'] }); queryClient.invalidateQueries({ queryKey: ['far-causes'] }); }} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- FAR Wizard Component ---
function FARWizard({ onComplete }: { onComplete: () => void }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<any>({
    system_name: '',
    title: '',
    effect: '',
    severity: 1,
    occurrence: 1,
    detection: 1,
    affected_assets: [],
    causes: []
  })
  const [assetSearch, setAssetSearch] = useState('')

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await apiFetch('/api/v1/settings/options')).json() })
  const systems = options?.filter((o: any) => o.category === 'LogicalSystem') || []
  
  const { data: devices } = useQuery({ 
    queryKey: ['devices', formData.system_name], 
    enabled: !!formData.system_name,
    queryFn: async () => (await apiFetch(`/api/v1/devices/?system=${formData.system_name}`)).json() 
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
    <div className="flex flex-col space-y-10">
      <div className="text-center space-y-2">
        <div className="inline-flex p-4 rounded-3xl bg-rose-500/10 text-rose-500 mb-2 shadow-xl shadow-rose-500/5"><ShieldAlert size={48} /></div>
        <h2 className="text-5xl font-black uppercase tracking-tighter text-white italic">Document Failure Mode</h2>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Comprehensive Risk Registration & Analysis</p>
      </div>

      <div className="grid grid-cols-12 gap-10">
        {/* Left Column: Scope & Identity */}
        <div className="col-span-7 space-y-8">
          <div className="space-y-6 bg-white/5 p-8 rounded-[32px] border border-white/5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">1. Logical System Context</label>
              <StyledSelect 
                options={systems.map((s: any) => ({ label: s.label, value: s.value }))}
                value={formData.system_name}
                onChange={(e) => setFormData({ ...formData, system_name: e.target.value })}
                placeholder="Select System..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">2. Failure Mode Title</label>
              <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Memory Leak / Network Congestion" className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold uppercase tracking-tight outline-none focus:border-rose-500/50 transition-all text-white shadow-inner" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">3. Effect of Failure</label>
              <textarea value={formData.effect} onChange={e => setFormData({ ...formData, effect: e.target.value })} placeholder="Impact statement..." className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold tracking-tight outline-none focus:border-rose-500/50 transition-all min-h-[120px] text-white shadow-inner" />
            </div>
          </div>

          <div className="space-y-4 bg-white/5 p-8 rounded-[32px] border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">4. Affected Assets (Optional)</label>
              {formData.system_name && (
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input 
                    value={assetSearch}
                    onChange={e => setAssetSearch(e.target.value)}
                    placeholder="Search assets..."
                    className="bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-[9px] font-black uppercase outline-none focus:border-rose-500/50 w-40 transition-all"
                  />
                </div>
              )}
            </div>
            
            {formData.system_name ? (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {filteredDevices.map((d: any) => (
                  <label key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.affected_assets.includes(d.id) ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/10' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'}`}>
                    <input type="checkbox" className="hidden" checked={formData.affected_assets.includes(d.id)} onChange={() => {
                      const next = formData.affected_assets.includes(d.id) ? formData.affected_assets.filter((id: any) => id !== d.id) : [...formData.affected_assets, d.id]
                      setFormData({ ...formData, affected_assets: next })
                    }} />
                    <Server size={14} className={formData.affected_assets.includes(d.id) ? 'text-rose-500' : 'text-slate-600'} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-tight leading-none truncate">{d.name}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase truncate">{d.model}</p>
                    </div>
                  </label>
                ))}
                {filteredDevices.length === 0 && (
                  <div className="col-span-2 py-8 text-center text-[10px] font-black uppercase text-slate-600 tracking-widest">No matching assets</div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-[10px] font-black uppercase text-slate-600 tracking-widest bg-black/20 rounded-2xl border border-dashed border-white/5">
                Select a system to view assets
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Risk Scoring */}
        <div className="col-span-5 space-y-8">
          <div className="space-y-6">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">5. Risk Priority Scoring</label>
            <div className="space-y-4">
              <ScoreInput label="Severity" value={formData.severity} onChange={(v:any) => setFormData({ ...formData, severity: v })} color="text-rose-500" description="Impact level" />
              <ScoreInput label="Occurrence" value={formData.occurrence} onChange={(v:any) => setFormData({ ...formData, occurrence: v })} color="text-amber-500" description="Frequency level" />
              <ScoreInput label="Detection" value={formData.detection} onChange={(v:any) => setFormData({ ...formData, detection: v })} color="text-blue-400" description="Difficulty to find" />
            </div>
          </div>

          <div className="bg-white/5 rounded-[40px] p-8 text-center border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-blue-500/5" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 relative z-10">Calculated RPN</p>
            <h4 className="text-7xl font-black text-white tracking-tighter relative z-10 italic">
              {rpn}
            </h4>
            <div className={`mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest relative z-10 transition-colors ${rpn > 100 ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
              {rpn > 100 ? 'Critical Risk' : 'Acceptable Risk'}
            </div>
          </div>

          <button 
            disabled={!formData.system_name || !formData.title || mutation.isPending}
            onClick={() => mutation.mutate(formData)} 
            className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-6 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-rose-500/30 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {mutation.isPending ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />} 
            {mutation.isPending ? 'Processing...' : 'Authorize Risk Record'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScoreInput({ label, value, onChange, color, description }: any) {
  return (
    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-6 flex flex-col items-center">
      <div className="text-center">
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</label>
        <p className={`text-5xl font-black ${color} tracking-tighter mt-1 italic`}>{value}</p>
        <p className="text-[8px] text-slate-600 font-bold uppercase mt-2 tracking-tighter">{description}</p>
      </div>
      <input 
        type="range" 
        min="1" 
        max="10" 
        value={value} 
        onChange={e => onChange(parseInt(e.target.value))} 
        className="w-full accent-rose-500 bg-white/10 h-1 rounded-full appearance-none cursor-pointer" 
      />
    </div>
  )
}
