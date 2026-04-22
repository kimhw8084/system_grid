
export const ModernStatusPicker = ({ value, onChange, options }: any) => {
  const current = options.find((o: any) => o.value === value) || options[0]
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="relative flex justify-center">
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all border ${current.color.replace('text-', 'border-').replace('text-', 'bg-')}/10 ${current.color} hover:scale-105 active:scale-95`}
      >
        {current.label}
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full mt-1 z-[110] bg-slate-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden min-w-[120px]"
            >
              {options.map((opt: any) => (
                <button
                  key={opt.value}
                  onClick={(e) => { e.stopPropagation(); onChange(opt.value); setIsOpen(false); }}
                  className={`w-full px-4 py-2 text-[9px] font-black uppercase text-left hover:bg-white/5 transition-all ${opt.value === value ? opt.color : 'text-slate-400'}`}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export function InvestigationTab({ formData, setFormData, failureModes, setFocusedField, focusedField }: any) {
  const [newStep, setNewStep] = useState({ text: '', images: [] as string[] })
  const [selectedFailureId, setSelectedFailureId] = useState<number | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<'CAUSES' | 'ACTIONS'>('CAUSES')
  const [activeActionType, setActiveActionType] = useState<'CAUSE' | 'WORKAROUND' | 'MONITORING' | 'PREVENTION'>('CAUSE')
  const [isAddingCause, setIsAddingCause] = useState(false)
  const [newCause, setNewCause] = useState({ cause_text: '', occurrence_level: 5, responsible_team: '' })
  const [expandedCauseIds, setExpandedCauseIds] = useState<number[]>([])

  const linkedFailures = useMemo(() => {
    const ids = formData.linked_failure_mode_ids || []
    return (failureModes || []).filter((fm: any) => ids.includes(fm.id))
  }, [formData.linked_failure_mode_ids, failureModes])

  const selectedFailure = useMemo(() => linkedFailures.find(f => f.id === selectedFailureId), [linkedFailures, selectedFailureId])

  // Auto-select first failure if none selected
  useEffect(() => {
    if (!selectedFailureId && linkedFailures.length > 0) {
      setSelectedFailureId(linkedFailures[0].id)
    }
  }, [linkedFailures, selectedFailureId])

  useEffect(() => {
    const handlePasteEvent = (e: any) => {
      setNewStep(prev => ({ ...prev, images: [...prev.images, e.detail] }))
    }
    window.addEventListener('investigation-paste', handlePasteEvent)
    return () => window.removeEventListener('investigation-paste', handlePasteEvent)
  }, [])

  const addStep = (causeId: number) => {
    if (!newStep.text.trim()) return
    const step = { 
      ...newStep, 
      id: Date.now(), 
      failure_id: selectedFailureId,
      cause_id: causeId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setFormData({ ...formData, identification_steps_json: [...(formData.identification_steps_json || []), step] })
    setNewStep({ text: '', images: [] })
  }

  const queryClient = useQueryClient()
  const syncMutation = useMutation({
    mutationFn: async ({ id, metadata }: any) => {
      const res = await apiFetch(`/api/v1/far/modes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ metadata_json: metadata })
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['far-failure-modes'] })
      queryClient.invalidateQueries({ queryKey: ['investigations'] })
      queryClient.invalidateQueries({ queryKey: ['rca-records'] })
      toast.success('FAR Vector Synchronized')
    }
  })

  const causeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/v1/far/causes', { 
        method: 'POST', 
        body: JSON.stringify({ ...data, mode_ids: [selectedFailureId] }) 
      })
      return res.json()
    },
    onSuccess: () => {
      toast.success('Root Cause Logged');
      setIsAddingCause(false);
      queryClient.invalidateQueries({ queryKey: ['far-failure-modes'] })
    }
  })

  const updateFailureStatus = (fmId: number, field: string, status: string) => {
    const fm = failureModes.find((f: any) => f.id === fmId)
    const newMetadata = { ...(fm?.metadata_json || {}), [`status_${field}`]: status }
    syncMutation.mutate({ id: fmId, metadata: newMetadata })
  }

  const updateSyncText = (fmId: number, type: string, text: string) => {
    const fm = failureModes.find((f: any) => f.id === fmId)
    const newMetadata = { ...(fm?.metadata_json || {}), [`sync_${type.toLowerCase()}`]: text }
    syncMutation.mutate({ id: fmId, metadata: newMetadata })
  }

  const statusOptions = [
    { value: 'NOT_STARTED', label: 'NOT STARTED', color: 'text-slate-500' },
    { value: 'IN_PROGRESS', label: 'IN PROGRESS', color: 'text-blue-400' },
    { value: 'BLOCKED', label: 'BLOCKED', color: 'text-rose-500' },
    { value: 'COMPLETED', label: 'COMPLETED', color: 'text-emerald-400' }
  ]

  const toggleCauseExpand = (id: number) => {
    setExpandedCauseIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 gap-8">
       {/* 1. Failure Resolution Matrix (Header) */}
       <div className="shrink-0 bg-white/5 border border-white/10 rounded-lg overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <Activity size={18} className="text-purple-400" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Failure Resolution Matrix</h3>
             </div>
             <div className="flex items-center gap-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{linkedFailures.length} Vectors Tracked</span>
             </div>
          </div>
          
          <div className="overflow-x-auto max-h-48 overflow-y-auto custom-scrollbar">
             <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                   <tr className="border-b border-white/10 bg-black/40 backdrop-blur-md">
                      <th className="py-3 px-6 text-[9px] font-black uppercase tracking-widest text-slate-500">Linked Failure Mode</th>
                      <th className="py-3 px-6 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Root Cause</th>
                      <th className="py-3 px-6 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Workaround</th>
                      <th className="py-3 px-6 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Monitoring</th>
                      <th className="py-3 px-6 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Prevention</th>
                   </tr>
                </thead>
                <tbody>
                   {linkedFailures.map((fm: any) => (
                      <tr 
                        key={fm.id} 
                        onClick={() => setSelectedFailureId(fm.id)}
                        className={`border-b border-white/5 hover:bg-white/[0.05] transition-all cursor-pointer group ${selectedFailureId === fm.id ? 'bg-purple-500/10' : ''}`}
                      >
                         <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                               {selectedFailureId === fm.id && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />}
                               <div className="flex flex-col">
                                  <span className={`text-[11px] font-black uppercase tracking-tight ${selectedFailureId === fm.id ? 'text-purple-400' : 'text-slate-300'}`}>{fm.title}</span>
                                  <span className="text-[8px] font-bold text-slate-600 uppercase">{fm.system_name || fm.system}</span>
                               </div>
                            </div>
                         </td>
                         {['cause', 'workaround', 'monitoring', 'prevention'].map(type => (
                            <td key={type} className="py-3 px-6 text-center">
                               <ModernStatusPicker 
                                  value={fm.metadata_json?.[`status_${type}`] || 'NOT_STARTED'}
                                  onChange={(val: string) => updateFailureStatus(fm.id, type, val)}
                                  options={statusOptions}
                               />
                            </td>
                         ))}
                      </tr>
                   ))}
                   {linkedFailures.length === 0 && (
                      <tr>
                         <td colSpan={5} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-4 opacity-30">
                               <AlertTriangle size={48} className="text-amber-500" />
                               <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">No linked failure modes. Add failure vector first.</p>
                            </div>
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       {/* 2. Focused Investigation Area */}
       <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {selectedFailure ? (
             <>
                <div className="flex items-center gap-6 border-b border-white/5 pb-2">
                   <button 
                      onClick={() => setActiveSubTab('CAUSES')}
                      className={`text-[11px] font-black uppercase tracking-[0.2em] pb-2 transition-all border-b-2 ${activeSubTab === 'CAUSES' ? 'text-blue-400 border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                   >
                      Causes
                   </button>
                   <button 
                      onClick={() => setActiveSubTab('ACTIONS')}
                      className={`text-[11px] font-black uppercase tracking-[0.2em] pb-2 transition-all border-b-2 ${activeSubTab === 'ACTIONS' ? 'text-emerald-400 border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                   >
                      Actions
                   </button>
                   <div className="ml-auto flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Active Vector:</span>
                      <span className="text-[10px] font-black text-purple-400 uppercase italic">{selectedFailure.title}</span>
                   </div>
                </div>

                <div className="flex-1 overflow-hidden">
                   {activeSubTab === 'CAUSES' && (
                      <div className="h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
                         <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Root Cause Attribution Matrix</h4>
                            <button 
                              onClick={() => setIsAddingCause(true)}
                              className="px-4 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-500/10"
                            >
                               + Add New Cause
                            </button>
                         </div>

                         {isAddingCause && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-600/5 border border-blue-500/20 rounded-lg p-6 space-y-4">
                               <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                  <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Define Root Cause Origin</h5>
                                  <button onClick={() => setIsAddingCause(false)} className="text-slate-600 hover:text-white"><X size={16}/></button>
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                     <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Logical Origin Description</label>
                                     <input 
                                       value={newCause.cause_text}
                                       onChange={e => setNewCause({...newCause, cause_text: e.target.value.toUpperCase()})}
                                       className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-[11px] font-black text-white outline-none focus:border-blue-500 uppercase"
                                       placeholder="E.G., MEMORY_LEAK_IN_SCHEDULER"
                                     />
                                  </div>
                                  <div className="space-y-1">
                                     <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Responsible Team</label>
                                     <input 
                                       value={newCause.responsible_team}
                                       onChange={e => setNewCause({...newCause, responsible_team: e.target.value.toUpperCase()})}
                                       className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-[11px] font-black text-white outline-none focus:border-blue-500 uppercase"
                                       placeholder="E.G., PLATFORM_SRE"
                                     />
                                  </div>
                               </div>
                               <button 
                                 onClick={() => causeMutation.mutate(newCause)}
                                 disabled={!newCause.cause_text || causeMutation.isPending}
                                 className="w-full py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                               >
                                  {causeMutation.isPending ? <RefreshCcw size={14} className="animate-spin mx-auto" /> : 'Confirm Root Cause Attribution'}
                               </button>
                            </motion.div>
                         )}

                         <div className="space-y-3">
                            {(selectedFailure.causes || []).map((cause: any) => (
                               <div key={cause.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden group hover:border-white/20 transition-all">
                                  <div 
                                    onClick={() => toggleCauseExpand(cause.id)}
                                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]"
                                  >
                                     <div className="flex items-center gap-4">
                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20 shadow-inner">
                                           <Zap size={16} />
                                        </div>
                                        <div>
                                           <h5 className="text-[11px] font-black text-white uppercase tracking-tight">{cause.cause_text}</h5>
                                           <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">{cause.responsible_team || 'SYSTEM_CORE'}</p>
                                        </div>
                                     </div>
                                     <div className="flex items-center gap-6">
                                        <div className="text-right">
                                           <p className="text-[7px] font-black text-slate-600 uppercase tracking-[0.2em] mb-0.5">Occurrence</p>
                                           <p className="text-[10px] font-black text-blue-400 tracking-tighter">LVL {cause.occurrence_level || 5}</p>
                                        </div>
                                        <div className={`transition-transform duration-300 ${expandedCauseIds.includes(cause.id) ? 'rotate-180' : ''}`}>
                                           <ChevronDown size={18} className="text-slate-500" />
                                        </div>
                                     </div>
                                  </div>

                                  <AnimatePresence>
                                     {expandedCauseIds.includes(cause.id) && (
                                        <motion.div 
                                          initial={{ height: 0, opacity: 0 }} 
                                          animate={{ height: 'auto', opacity: 1 }} 
                                          exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden bg-black/40 border-t border-white/5"
                                        >
                                           <div className="p-6 space-y-6">
                                              <div className="flex items-center justify-between">
                                                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">Cause Identification Procedure</p>
                                                 <div className="h-px flex-1 mx-6 bg-blue-500/10" />
                                              </div>

                                              {/* Identification Steps Input */}
                                              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                                                 <div 
                                                   onClick={() => setFocusedField(`investigation_${cause.id}`)}
                                                   className={`relative group focus-trigger ${focusedField === `investigation_${cause.id}` ? 'ring-2 ring-blue-500/50' : ''}`}
                                                 >
                                                    <textarea 
                                                       value={newStep.text}
                                                       onChange={e => setNewStep({...newStep, text: e.target.value})}
                                                       className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-xs font-bold text-white outline-none min-h-[100px] uppercase placeholder:text-slate-700 leading-relaxed"
                                                       placeholder="RECORD DISCOVERY STEP... CLICK HERE THEN CTRL+V TO PASTE FIGURES."
                                                    />
                                                    {focusedField === `investigation_${cause.id}` && (
                                                       <div className="absolute top-3 right-4 flex items-center gap-2">
                                                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                                          <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Paste Active</span>
                                                       </div>
                                                    )}
                                                 </div>
                                                 {newStep.images.length > 0 && (
                                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                                       {newStep.images.map((img, i) => (
                                                          <div key={i} className="relative w-20 h-20 shrink-0 rounded-lg border border-white/10 overflow-hidden group">
                                                             <img src={img} className="w-full h-full object-cover" />
                                                             <button onClick={() => setNewStep({...newStep, images: newStep.images.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-md opacity-0 group-hover:opacity-100"><X size={10}/></button>
                                                          </div>
                                                       ))}
                                                    </div>
                                                 )}
                                                 <button 
                                                   onClick={() => addStep(cause.id)} 
                                                   className="w-full py-3 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                                 >
                                                    <Plus size={14} /> Commit Identification Milestone
                                                 </button>
                                              </div>

                                              {/* Steps Stream */}
                                              <div className="space-y-4">
                                                 {(formData.identification_steps_json || []).filter((s: any) => s.failure_id === selectedFailureId && s.cause_id === cause.id).map((step: any, idx: number) => (
                                                    <div key={step.id || idx} className="flex gap-6 group">
                                                       <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400 font-black text-[10px] shrink-0 border border-blue-500/20 shadow-inner italic">{idx + 1}</div>
                                                       <div className="flex-1 space-y-3 pt-1">
                                                          <p className="text-[11px] font-black text-slate-200 leading-relaxed uppercase tracking-tight">{step.text}</p>
                                                          {step.images?.length > 0 && (
                                                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                                                {step.images.map((img: string, i: number) => (
                                                                  <ImageThumbnail key={i} src={img} />
                                                                ))}
                                                            </div>
                                                          )}
                                                          <div className="flex items-center justify-between pt-2">
                                                            <div className="flex items-center gap-1.5 text-[7px] font-bold text-slate-600 uppercase tracking-widest">
                                                               <Clock size={8} />
                                                               <span>{new Date(step.created_at).toLocaleString()}</span>
                                                            </div>
                                                            <button onClick={() => setFormData({...formData, identification_steps_json: formData.identification_steps_json.filter((s: any) => s.id !== step.id)})} className="text-rose-500 hover:text-rose-400 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                                                          </div>
                                                       </div>
                                                    </div>
                                                 ))}
                                              </div>
                                           </div>
                                        </motion.div>
                                     )}
                                  </AnimatePresence>
                               </div>
                            ))}
                            {(selectedFailure.causes || []).length === 0 && (
                               <div className="py-20 text-center border border-dashed border-white/5 rounded-lg flex flex-col items-center gap-4 opacity-20">
                                  <Zap size={40} className="text-slate-600" />
                                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">No root cause origins establishing for this vector</p>
                               </div>
                            )}
                         </div>
                      </div>
                   )}

                   {activeSubTab === 'ACTIONS' && (
                      <div className="h-full flex flex-col gap-6 overflow-hidden">
                         <div className="flex justify-center gap-4 shrink-0">
                            {[
                               { id: 'CAUSE', label: 'Cause Analysis', icon: Search, color: 'text-blue-400', bg: 'bg-blue-400' },
                               { id: 'WORKAROUND', label: 'Workaround', icon: RefreshCcw, color: 'text-amber-400', bg: 'bg-amber-400' },
                               { id: 'MONITORING', label: 'Monitoring', icon: Activity, color: 'text-sky-400', bg: 'bg-sky-400' },
                               { id: 'PREVENTION', label: 'Prevention', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-400' }
                            ].map(type => (
                               <button
                                  key={type.id}
                                  onClick={() => setActiveActionType(type.id as any)}
                                  className={`px-8 py-3 rounded-xl border flex items-center gap-3 transition-all relative group overflow-hidden ${activeActionType === type.id ? 'bg-white/5 border-white/20 shadow-2xl' : 'bg-white/2 border-white/5 text-slate-500 hover:bg-white/5'}`}
                               >
                                  {activeActionType === type.id && (
                                     <motion.div layoutId="action-active" className={`absolute inset-0 ${type.bg}/5 pointer-events-none`} />
                                  )}
                                  <type.icon size={16} className={activeActionType === type.id ? type.color : 'text-slate-600 group-hover:text-slate-400'} />
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${activeActionType === type.id ? 'text-white' : ''}`}>{type.label}</span>
                                  {activeActionType === type.id && <div className={`w-1 h-1 rounded-full ${type.bg} absolute right-4`} />}
                               </button>
                            ))}
                         </div>

                         <div className="flex-1 bg-[#05070a] border border-white/10 rounded-2xl p-10 space-y-8 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                            <div className="flex items-center justify-between border-b border-white/5 pb-6">
                               <div className="flex items-center gap-4">
                                  <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 ${
                                     activeActionType === 'CAUSE' ? 'text-blue-400' : 
                                     activeActionType === 'WORKAROUND' ? 'text-amber-400' :
                                     activeActionType === 'MONITORING' ? 'text-sky-400' : 'text-emerald-400'
                                  }`}>
                                     {activeActionType === 'CAUSE' && <Search size={24} />}
                                     {activeActionType === 'WORKAROUND' && <RefreshCcw size={24} />}
                                     {activeActionType === 'MONITORING' && <Activity size={24} />}
                                     {activeActionType === 'PREVENTION' && <ShieldCheck size={24} />}
                                  </div>
                                  <div>
                                     <h3 className="text-xl font-black uppercase tracking-tighter text-white">{activeActionType} Deployment Strategy</h3>
                                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Direct Synchronization with FAR Registry</p>
                                  </div>
                               </div>
                               <div className="flex flex-col items-end gap-1">
                                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">Vector Compliance</span>
                                  <div className="flex items-center gap-1">
                                     <CheckCircle2 size={12} className="text-emerald-500" />
                                     <span className="text-[10px] font-black text-emerald-500 uppercase">Active Sync</span>
                                  </div>
                               </div>
                            </div>

                            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Detailed Strategic Documentation</label>
                               <textarea 
                                  value={selectedFailure.metadata_json?.[`sync_${activeActionType.toLowerCase()}`] || ''}
                                  onChange={(e) => updateSyncText(selectedFailure.id, activeActionType, e.target.value)}
                                  className="flex-1 bg-slate-950/80 border border-white/10 rounded-2xl p-8 text-xs font-bold text-slate-300 outline-none uppercase leading-relaxed shadow-inner placeholder:text-slate-800 focus:border-white/20 transition-all custom-scrollbar"
                                  placeholder={`ENTER ${activeActionType} ARCHITECTURE & IMPLEMENTATION DETAILS FOR THIS VECTOR...`}
                               />
                            </div>
                         </div>
                      </div>
                   )}
                </div>
             </>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-20">
                <Target size={80} className="text-slate-600" />
                <p className="text-sm font-black text-slate-600 uppercase tracking-[0.5em]">Select Failure Vector to Investigate</p>
             </div>
          )}
       </div>
    </div>
  )
}

function MitigationTab({ formData, setFormData, isEditing }: any) {
  const [newLog, setNewLog] = useState({ type: 'WORKAROUND', description: '', status: 'PLANNED' })

  const addLog = () => {
    if (!newLog.description.trim()) return
    const log = { ...newLog, id: Date.now(), timestamp: new Date().toISOString() }
    setFormData({ ...formData, mitigation_logs_json: [...(formData.mitigation_logs_json || []), log] })
    setNewLog({ type: 'WORKAROUND', description: '', status: 'PLANNED' })
  }

  const types = ['WORKAROUND', 'MONITORING', 'MITIGATION', 'PREVENTION']
  const statuses = ['PLANNED', 'IN PROGRESS', 'VERIFIED', 'COMPLETED']

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-6">
       {isEditing && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4 shadow-xl">
             <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2"><Plus size={14}/> Add Mitigation Log</h3>
             <div className="grid grid-cols-2 gap-4">
                <StyledSelect label="Log Type" value={newLog.type} onChange={(e:any) => setNewLog({...newLog, type: e.target.value})} options={types.map(t => ({value: t, label: t}))} />
                <StyledSelect label="Status" value={newLog.status} onChange={(e:any) => setNewLog({...newLog, status: e.target.value})} options={statuses.map(s => ({value: s, label: s}))} />
             </div>
             <textarea value={newLog.description} onChange={e => setNewLog({...newLog, description: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-white/10 rounded-lg p-4 text-[11px] font-bold text-white outline-none focus:border-emerald-500/50 min-h-[80px] uppercase" placeholder="Strategy details..." />
             <button onClick={addLog} className="h-12 w-full bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">Capture Log</button>
          </div>
       )}

       <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
          {(formData.mitigation_logs_json || []).map((log: any, idx: number) => (
             <div key={log.id || idx} className="bg-white/5 border border-white/10 rounded-lg p-5 flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                <div className="flex items-center gap-6">
                   <div className="w-32 text-center">
                      <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded border ${log.type === 'PREVENTION' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-blue-400 border-blue-500/30 bg-blue-500/10'}`}>{log.type}</span>
                      <p className={`text-[8px] font-bold uppercase mt-1.5 ${log.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'}`}>{log.status}</p>
                   </div>
                   <div className="space-y-1">
                     <p className="text-xs font-black text-slate-200 uppercase">{log.description}</p>                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleString()}</p>
                   </div>
                </div>
                {isEditing && (
                   <button onClick={() => setFormData({...formData, mitigation_logs_json: formData.mitigation_logs_json.filter((_:any, i:number) => i !== idx)})} className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all"><Trash2 size={14}/></button>
                )}
             </div>
          ))}
       </div>
    </div>
  )
}

export function ImageThumbnail({ src }: { src: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <div onClick={() => setIsOpen(true)} className="relative w-16 h-16 shrink-0 border border-white/10 rounded overflow-hidden shadow-lg cursor-zoom-in hover:border-blue-500/50 transition-all group">
         <img src={src} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
      </div>
      <AnimatePresence>
         {isOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-10" onClick={() => setIsOpen(false)}>
               <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} src={src} className="max-w-full max-h-full rounded-lg shadow-2xl border border-white/10" />
               <button className="absolute top-10 right-10 text-white/50 hover:text-white"><X size={40}/></button>
            </div>
         )}
      </AnimatePresence>
    </>
  )
}
