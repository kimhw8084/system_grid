import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ShieldAlert, Zap, Save, X, PlusCircle, User,
  RefreshCcw, AlertTriangle, Lightbulb, ShieldCheck, 
  Activity, Server, FileText, Clipboard, ArrowRight, Shield, 
  CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye,
  Target, AlertCircle, Settings, Layers, Box, Link2, ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { AgGridReact } from 'ag-grid-react'
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
  has_incident_history: boolean
  affected_assets: any[]
  causes: any[]
  mitigations: any[]
  prevention_actions: any[]
}

export default function FAR() {
  const queryClient = useQueryClient()
  const [activeView, setActiveView] = useState<'FAR1' | 'FAR2'>('FAR1')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMode, setSelectedMode] = useState<FailureMode | null>(null)
  
  // Queries
  const { data: modes, isLoading } = useQuery({ 
    queryKey: ['far-modes'], 
    queryFn: async () => (await apiFetch('/api/v1/far/modes')).json() 
  })

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-2">
            <Target size={24} className="text-rose-500" /> Failure Analysis & Resolution (FAR)
          </h1>
          <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-bold">Reliability Knowledge Engine & Risk Mitigation</p>
        </div>
        <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveView('FAR1')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'FAR1' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            FAR1: Guided
          </button>
          <button 
            onClick={() => setActiveView('FAR2')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'FAR2' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            FAR2: Matrix
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {activeView === 'FAR1' ? (
            <FAR1 key="far1" modes={modes} isLoading={isLoading} />
          ) : (
            <FAR2 key="far2" modes={modes} isLoading={isLoading} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// --- FAR1: Guided Wizard ---
function FAR1({ modes, isLoading }: any) {
  const [step, setStep] = useState(1)
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

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await apiFetch('/api/v1/settings/options')).json() })
  const systems = options?.filter((o: any) => o.category === 'LogicalSystem') || []
  
  const { data: devices } = useQuery({ 
    queryKey: ['devices', formData.system_name], 
    enabled: !!formData.system_name,
    queryFn: async () => (await apiFetch(`/api/v1/devices/?system=${formData.system_name}`)).json() 
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/v1/far/modes', { method: 'POST', body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['far-modes'] })
      toast.success('Failure Mode Documented')
      setStep(1)
      setFormData({ system_name: '', title: '', effect: '', severity: 1, occurrence: 1, detection: 1, affected_assets: [], causes: [] })
      setActiveView('FAR2')
    }
  })

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="h-full flex flex-col"
    >
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1.5 rounded-full transition-all ${step >= s ? 'bg-rose-500' : 'bg-white/10'}`} />
        ))}
      </div>

      <div className="flex-1 glass-panel rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />
        
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-2xl space-y-8">
              <div className="text-center space-y-2">
                <div className="inline-flex p-4 rounded-3xl bg-rose-500/10 text-rose-500 mb-4"><Box size={48} /></div>
                <h2 className="text-4xl font-black uppercase tracking-tighter">Define System Scope</h2>
                <p className="text-slate-500 text-sm font-medium">Select the system and specific assets that share this failure mode.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Logical System</label>
                  <StyledSelect 
                    options={systems.map((s: any) => ({ label: s.label, value: s.value }))}
                    value={formData.system_name}
                    onChange={(v) => setFormData({ ...formData, system_name: v })}
                  />
                </div>

                {formData.system_name && (
                   <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Affected Assets ({devices?.length || 0} Found)</label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {devices?.map((d: any) => (
                          <label key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.affected_assets.includes(d.id) ? 'bg-rose-500/10 border-rose-500 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'}`}>
                            <input type="checkbox" className="hidden" checked={formData.affected_assets.includes(d.id)} onChange={() => {
                              const next = formData.affected_assets.includes(d.id) ? formData.affected_assets.filter((id: any) => id !== d.id) : [...formData.affected_assets, d.id]
                              setFormData({ ...formData, affected_assets: next })
                            }} />
                            <Server size={14} />
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-tight leading-none">{d.name}</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase">{d.model}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                   </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-2xl space-y-8">
               <div className="text-center space-y-2">
                <div className="inline-flex p-4 rounded-3xl bg-amber-500/10 text-amber-500 mb-4"><Zap size={48} /></div>
                <h2 className="text-4xl font-black uppercase tracking-tighter">Failure Mode & Effect</h2>
                <p className="text-slate-500 text-sm font-medium">What happens when things go wrong? Describe the symptom and impact.</p>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Failure Mode Title</label>
                    <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Memory Leak / Disk Full / Power Supply Surge" className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold uppercase tracking-tight outline-none focus:border-rose-500/50 transition-all" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Effect of Failure (Impact Statement)</label>
                    <textarea value={formData.effect} onChange={e => setFormData({ ...formData, effect: e.target.value })} placeholder="Describe the downstream impact on services and customers..." className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold tracking-tight outline-none focus:border-rose-500/50 transition-all min-h-[120px]" />
                 </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-2xl space-y-8">
               <div className="text-center space-y-2">
                <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 text-blue-500 mb-4"><Sliders size={48} /></div>
                <h2 className="text-4xl font-black uppercase tracking-tighter">FMEA Risk Scoring</h2>
                <p className="text-slate-500 text-sm font-medium">Score the severity, occurrence, and detection levels (1-10).</p>
              </div>

              <div className="grid grid-cols-3 gap-8">
                 <ScoreInput label="Severity" value={formData.severity} onChange={v => setFormData({ ...formData, severity: v })} color="text-rose-500" description="How bad is the impact?" />
                 <ScoreInput label="Occurrence" value={formData.occurrence} onChange={v => setFormData({ ...formData, occurrence: v })} color="text-amber-500" description="How often does it happen?" />
                 <ScoreInput label="Detection" value={formData.detection} onChange={v => setFormData({ ...formData, detection: v })} color="text-blue-400" description="How hard is it to find?" />
              </div>

              <div className="bg-white/5 rounded-[32px] p-8 text-center border border-white/5">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Calculated Risk Priority Number (RPN)</p>
                 <h4 className="text-6xl font-black text-white tracking-tighter">{formData.severity * formData.occurrence * formData.detection}</h4>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-12 flex items-center gap-4">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Back</button>
          )}
          <button 
            disabled={(step === 1 && !formData.system_name) || (step === 2 && !formData.title)}
            onClick={() => step === 3 ? mutation.mutate(formData) : setStep(step + 1)} 
            className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-12 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            {mutation.isPending ? <RefreshCcw size={14} className="animate-spin" /> : step === 3 ? 'Finalize Mode' : 'Next Stage'} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function ScoreInput({ label, value, onChange, color, description }: any) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label>
        <p className={`text-4xl font-black ${color}`}>{value}</p>
        <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">{description}</p>
      </div>
      <input type="range" min="1" max="10" value={value} onChange={e => onChange(parseInt(e.target.value))} className="w-full accent-rose-500" />
    </div>
  )
}

// --- FAR2: High-Density Matrix ---
function FAR2({ modes, isLoading }: any) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selectedMode = modes?.find((m: any) => m.id === selectedId)

  const columnDefs = [
    { field: 'id', headerName: 'ID', width: 60, pinned: 'left' },
    { field: 'system_name', headerName: 'System', width: 120 },
    { field: 'title', headerName: 'Failure Mode', flex: 1, cellClass: 'font-black uppercase text-white' },
    { field: 'rpn', headerName: 'RPN', width: 80, cellRenderer: (p: any) => (
      <span className={`px-2 py-0.5 rounded font-black text-[10px] ${p.value > 100 ? 'bg-rose-500/20 text-rose-500' : 'bg-blue-500/20 text-blue-400'}`}>{p.value}</span>
    )},
    { field: 'status', headerName: 'Status', width: 150, cellRenderer: (p: any) => <StatusPill value={p.value} /> }
  ]

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="h-full flex gap-4"
    >
      {/* Pane 1: Mode Registry */}
      <div className="w-1/3 flex flex-col gap-4">
        <div className="glass-panel rounded-2xl p-4 flex items-center gap-3">
          <Search size={16} className="text-slate-500" />
          <input placeholder="Filter Modes..." className="bg-transparent border-none outline-none text-xs font-bold uppercase w-full" />
        </div>
        <div className="flex-1 glass-panel rounded-3xl overflow-hidden ag-theme-alpine-dark border-white/5">
          <AgGridReact 
            rowData={modes} 
            columnDefs={columnDefs} 
            onRowClicked={(p) => setSelectedId(p.data.id)}
            rowSelection="single"
          />
        </div>
      </div>

      {/* Pane 2: Relations Matrix */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
        {selectedMode ? (
          <>
            <div className="glass-panel rounded-3xl p-8 border-rose-500/20 bg-gradient-to-br from-rose-500/[0.03] to-transparent">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">{selectedMode.system_name}</span>
                    <span className="text-slate-500 text-[9px] font-black uppercase">Failure ID: #{selectedMode.id}</span>
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-white">{selectedMode.title}</h3>
                </div>
                <div className="flex gap-2">
                   <div className="bg-white/5 p-4 rounded-2xl text-center min-w-[80px] border border-white/5">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Severity</p>
                      <p className="text-xl font-black text-rose-500 leading-none">{selectedMode.severity}</p>
                   </div>
                   <div className="bg-white/5 p-4 rounded-2xl text-center min-w-[80px] border border-white/5">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Occur</p>
                      <p className="text-xl font-black text-amber-500 leading-none">{selectedMode.occurrence}</p>
                   </div>
                   <div className="bg-white/5 p-4 rounded-2xl text-center min-w-[80px] border border-white/5">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Detect</p>
                      <p className="text-xl font-black text-blue-400 leading-none">{selectedMode.detection}</p>
                   </div>
                </div>
              </div>

              <p className="text-sm font-medium text-slate-400 leading-relaxed mb-6">{selectedMode.effect}</p>

              <div className="grid grid-cols-2 gap-6">
                <RelationCard title="Root Causes" icon={AlertCircle} items={selectedMode.causes} type="cause" />
                <RelationCard title="Mitigations" icon={ShieldCheck} items={selectedMode.mitigations} type="mitigation" />
                <RelationCard title="BKMs / Resolutions" icon={FileText} items={[]} type="resolution" />
                <RelationCard title="Prevention Actions" icon={Target} items={selectedMode.prevention_actions} type="prevention" />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-4">
            <Layers size={64} className="opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Select a Failure Mode to explore relations</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function RelationCard({ title, icon: Icon, items = [], type }: any) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.04] transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 group-hover:scale-110 transition-transform"><Icon size={14} /></div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</h4>
        </div>
        <button className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-rose-600 transition-all"><Plus size={12} /></button>
      </div>
      
      <div className="space-y-2">
        {items.length > 0 ? items.map((item: any) => (
          <div key={item.id} className="bg-white/5 p-3 rounded-xl border border-transparent hover:border-white/10 transition-all cursor-pointer flex items-center justify-between group/item">
            <p className="text-[10px] font-bold uppercase truncate max-w-[80%]">{item.cause_text || item.mitigation_steps || item.prevention_action}</p>
            <ChevronRight size={12} className="text-slate-600 group-hover/item:text-rose-500 transition-colors" />
          </div>
        )) : (
          <div className="py-4 text-center border-2 border-dashed border-white/5 rounded-xl">
             <p className="text-[9px] font-black text-slate-600 uppercase">Zero Linked Items</p>
          </div>
        )}
      </div>
    </div>
  )
}
