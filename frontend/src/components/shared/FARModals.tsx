import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Plus, Activity, Zap, ShieldCheck, Search, Monitor, Clipboard, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../api/apiClient'
import { toast } from 'react-hot-toast'
import { StyledSelect } from './StyledSelect'
import { MonitoringForm } from '../MonitoringGrid'
import { ProjectForm } from '../Projects'

export function RootCauseFormModal({ isOpen, onClose, onSave, modeId, initialData = null }: any) {
  const [formData, setFormData] = useState({ cause_text: '', occurrence_level: 5, responsible_team: '' })
  const queryClient = useQueryClient()

  useEffect(() => {
    if (initialData) setFormData({ cause_text: initialData.cause_text, occurrence_level: initialData.occurrence_level, responsible_team: initialData.responsible_team })
    else setFormData({ cause_text: '', occurrence_level: 5, responsible_team: '' })
  }, [initialData, isOpen])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = initialData?.id ? `/api/v1/far/causes/${initialData.id}` : '/api/v1/far/causes'
      const method = initialData?.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({ ...data, mode_ids: [modeId] })
      })
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(initialData?.id ? 'Root Cause Updated' : 'Root Cause Logged');
      onSave(data);
      onClose();
      queryClient.invalidateQueries({ queryKey: ['far', 'modes'] })
      queryClient.invalidateQueries({ queryKey: ['far-failure-modes'] })
    }
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-lg p-10 rounded-lg border border-amber-500/30 space-y-8">
           <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-lg bg-amber-600/20 flex items-center justify-center text-amber-500 border border-amber-500/30 shadow-inner">
                    <Zap size={24}/>
                 </div>
                 <div>
                    <h3 className="text-xl font-bold uppercase text-white tracking-tighter">{initialData ? 'Update Attribution' : 'Log Root Cause'}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Causal Mapping Interface</p>
                 </div>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
           </div>

           <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Cause Description (Forensic Narrative)</label>
                 <textarea 
                   value={formData.cause_text} 
                   onChange={e => setFormData({...formData, cause_text: e.target.value})} 
                   className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-sm font-bold text-white outline-none focus:border-amber-500 min-h-[100px] uppercase" 
                   placeholder="DESCRIBE THE LOGICAL ORIGIN OF FAILURE..."
                 />
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Occurrence Level</label>
                    <StyledSelect 
                      options={Array.from({length: 10}, (_, i) => ({ value: (i + 1).toString(), label: `Level ${i + 1}` }))} 
                      value={formData.occurrence_level.toString()} 
                      onChange={(e: any) => setFormData({...formData, occurrence_level: parseInt(e.target.value)})} 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Responsible Team</label>
                    <input 
                      value={formData.responsible_team} 
                      onChange={e => setFormData({...formData, responsible_team: e.target.value.toUpperCase()})} 
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-amber-500 uppercase" 
                      placeholder="E.G. SRE"
                    />
                 </div>
              </div>

              <button 
                onClick={() => mutation.mutate(formData)} 
                disabled={!formData.cause_text || mutation.isPending}
                className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                 {mutation.isPending ? <Activity size={16} className="animate-spin" /> : <Save size={16} />} COMMIT ATTRIBUTION
              </button>
           </div>
        </motion.div>
    </div>
  )
}

export function MitigationFormModal({ isOpen, onClose, onSave, modeId, causeId, type, bkms, monitoring }: any) {
  const [formData, setFormData] = useState({ mitigation_type: type || 'Workaround', mitigation_steps: '', status: 'Planned', bkm_mode: 'link', bkm_id: '', bkm_content: '', monitoring_item_id: '' })
  const queryClient = useQueryClient()

  useEffect(() => {
    setFormData(prev => ({ ...prev, mitigation_type: type === 'MONITORING' ? 'Monitoring' : 'Workaround' }))
  }, [type, isOpen])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
       const payload: any = {
          mitigation_type: data.mitigation_type,
          mitigation_steps: data.mitigation_steps,
          status: data.status,
          mode_ids: [modeId],
          cause_id: causeId
       }
       if (data.mitigation_type === 'Monitoring' && data.monitoring_item_id) {
          payload.monitoring_item_id = parseInt(data.monitoring_item_id)
       }
       if (data.mitigation_type === 'Workaround') {
          if (data.bkm_mode === 'link' && data.bkm_id) {
             payload.knowledge_bkm_id = parseInt(data.bkm_id)
          } else if (data.bkm_mode === 'input' && data.bkm_content) {
             payload.metadata_json = { external_bkm_link: data.bkm_content }
          }
       }
       const res = await apiFetch('/api/v1/far/mitigations', { method: 'POST', body: JSON.stringify(payload) })
       return res.json()
    },
    onSuccess: (data) => {
       toast.success(`${type} Synchronized`);
       onSave(data);
       onClose();
       queryClient.invalidateQueries({ queryKey: ['far', 'modes'] })
       queryClient.invalidateQueries({ queryKey: ['far-failure-modes'] })
    }
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-2xl p-10 rounded-lg border border-blue-500/30 space-y-8">
           <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/30 shadow-inner">
                    {type === 'MONITORING' ? <Monitor size={24}/> : <ShieldCheck size={24}/>}
                 </div>
                 <div>
                    <h3 className="text-xl font-bold uppercase text-white tracking-tighter">New {type === 'MONITORING' ? 'Monitoring Shield' : 'Response Protocol'}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Defensive Strategy Deployment</p>
                 </div>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
           </div>

           <div className="space-y-6">
              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Deployment Narrative / Steps</label>
                 <textarea value={formData.mitigation_steps} onChange={e => setFormData({...formData, mitigation_steps: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-sm font-bold text-white outline-none focus:border-blue-500 min-h-[120px] uppercase" placeholder="DESCRIBE THE DEPLOYMENT PROTOCOL..." />
              </div>

              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">owner team</label>
                       <input value={(formData as any).team} onChange={e => setFormData({...formData, team: e.target.value.toUpperCase()} as any)} placeholder="E.G. SRE" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-white/20 uppercase" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">status</label>
                       <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-[11px] text-[12px] font-bold text-white outline-none focus:border-white/20 uppercase appearance-none cursor-pointer">
                          <option value="Not Started">NOT STARTED</option>
                          <option value="In Progress">IN PROGRESS</option>
                          <option value="Completed">COMPLETED</option>
                       </select>
                    </div>
                 </div>

                 {type === 'WORKAROUND' && (
                    <div className="bg-black/20 p-6 rounded-lg border border-white/5 space-y-5 shadow-inner">
                       <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">bkm alignment</label>
                          <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                             <button onClick={() => setFormData({...formData, bkm_mode: 'input'})} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${formData.bkm_mode === 'input' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}>Paste Link</button>
                             <button onClick={() => setFormData({...formData, bkm_mode: 'link'})} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${formData.bkm_mode === 'link' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}>Direct Link</button>
                          </div>
                       </div>
                       {formData.bkm_mode === 'input' ? (
                          <input value={formData.bkm_content} onChange={e => setFormData({...formData, bkm_content: e.target.value})} placeholder="PASTE EXTERNAL BKM LINK..." className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[11px] font-bold text-blue-400 outline-none uppercase" />
                       ) : (
                          <select value={formData.bkm_id} onChange={e => setFormData({...formData, bkm_id: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[11px] font-bold text-white outline-none uppercase appearance-none cursor-pointer">
                             <option value="">SELECT BKM ARTIFACT...</option>
                             {bkms?.map((b: any) => <option key={b.id} value={b.id}>{b.title}</option>)}
                          </select>
                       )}
                    </div>
                 )}

                 {type === 'MONITORING' && (
                    <div className="bg-black/20 p-6 rounded-lg border border-white/5 space-y-4">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">active monitor linkage</label>
                       <select value={formData.monitoring_item_id} onChange={e => setFormData({...formData, monitoring_item_id: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[11px] font-bold text-white outline-none uppercase appearance-none cursor-pointer">
                          <option value="">SELECT MONITOR...</option>
                          {monitoring?.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}
                       </select>
                    </div>
                 )}

                 <button onClick={() => mutation.mutate(formData)} className={`w-full py-5 rounded-lg text-[11px] font-bold uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${type === 'MONITORING' ? 'bg-sky-600 shadow-sky-600/20 hover:bg-sky-500' : 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-500'}`}>Commit Strategic Action</button>
              </div>
           </div>
        </motion.div>
    </div>
  )
}

export function PreventionFormModal({ isOpen, onClose, onSave, modeId, causeId }: any) {
  const queryClient = useQueryClient()

  const projectMutation = useMutation({
    mutationFn: async (data: any) => {
       const res = await apiFetch('/api/v1/projects/', {
         method: 'POST',
         body: JSON.stringify({
           ...data,
           metadata_json: {
             linked_failure_mode_id: modeId,
             linked_cause_id: causeId
           }
         })
       })
       return res.json()
    },
    onSuccess: (data) => {
       toast.success('Prevention Project Initiated');
       onSave(data);
       onClose();
       queryClient.invalidateQueries({ queryKey: ['far', 'modes'] })
       queryClient.invalidateQueries({ queryKey: ['far-failure-modes'] })
    }
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md p-10">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-5xl max-h-[90vh] overflow-y-auto p-12 rounded-lg border border-emerald-500/30 custom-scrollbar shadow-2xl">
           <div className="flex items-center justify-between border-b border-white/5 pb-8">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-600/20">
                   <ShieldCheck size={32}/>
                </div>
                <div>
                  <h2 className="text-4xl font-bold uppercase text-white tracking-tighter">Initiate Prevention Project</h2>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1 italic">Architectural Hardening & Risk Elimination</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-4 rounded-full"><X size={32}/></button>
           </div>
           <div className="mt-8">
              <ProjectForm 
                 initialData={{ name: `PREVENTION PROJECT`, description: '', status: 'Planning', priority: 'High' }}
                 onSave={projectMutation.mutate}
                 isSaving={projectMutation.isPending}
              />
           </div>
        </motion.div>
    </div>
  )
}
