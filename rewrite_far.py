import sys

file_path = 'frontend/src/components/FAR.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Replace CausalTab
causal_old_start = 'function CausalTab({ mode, onUpdate }: any) {'
causal_old_end = '      </AnimatePresence>\n    </motion.div>\n  )\n}'

causal_new = """function CausalTab({ mode, onUpdate }: any) {
  const [activeModal, setActiveModal] = useState<any>(null)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex-1 flex flex-col space-y-6">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-amber-500 ">Root Cause Attribution Matrix</h3>
             {mode.linked_rcas?.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
                   <Activity size={12} className="text-purple-400" />
                   <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">{mode.linked_rcas.length} Research Cases Linked</span>
                </div>
             )}
          </div>
          <button onClick={() => setActiveModal({ isOpen: true, modeId: mode.id })} className="px-6 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-500 rounded-lg text-[10px] font-bold uppercase  hover:bg-amber-600 hover:text-white transition-all">+ Add Root Cause</button>
       </div>
       
       <div className="flex-1 bg-black/40 border border-white/5 rounded-lg overflow-hidden flex flex-col shadow-2xl">
          <table className="w-full text-left border-collapse">
             <thead className="bg-white/[0.03] border-b border-white/10">
                <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ">
                   <th className="px-8 py-4">Root Cause Description (Logical Origin)</th>
                   <th className="px-8 py-4 text-center">Occur Lv</th>
                   <th className="px-8 py-4">Responsible Unit</th>
                   <th className="px-8 py-4">Linked Incidents</th>
                   <th className="px-8 py-4 text-center">BKMs</th>
                   <th className="px-8 py-4 text-right">Ops</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5 font-bold uppercase  text-[11px]">
                {mode.causes?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                     <td className="px-8 py-5 text-white normal-case leading-relaxed">{c.cause_text}</td>
                     <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                           <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div className="h-full bg-amber-500" style={{ width: `${c.occurrence_level * 10}%` }} />
                           </div>
                           <span className="text-amber-500 w-4 font-black">{c.occurrence_level}</span>
                        </div>
                     </td>
                     <td className="px-8 py-5 text-slate-400 font-black">{c.responsible_team || 'UNASSIGNED'}</td>
                     <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                           {(mode.linked_rcas || []).map((r: any) => (
                              <div key={r.id} className="flex items-center gap-1.5 text-[8px] text-purple-400">
                                 <Activity size={8} />
                                 <span className="truncate max-w-[120px]">{r.title}</span>
                              </div>
                           ))}
                           {(!mode.linked_rcas || mode.linked_rcas.length === 0) && <span className="text-slate-700 text-[8px]">NONE</span>}
                        </div>
                     </td>
                     <td className="px-8 py-5 text-center">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black ${c.resolutions?.length > 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 opacity-50'}`}>
                           {c.resolutions?.length || 0} BKMS
                        </span>
                     </td>
                     <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => setActiveModal({ isOpen: true, modeId: mode.id, initialData: c })}
                             className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                           >
                              <Edit2 size={14}/>
                           </button>
                           <button className="p-1.5 text-slate-600 hover:text-rose-500 transition-all rounded-lg"><Trash2 size={14}/></button>
                        </div>
                     </td>
                  </tr>
                ))}
                {(!mode.causes?.length) && (
                  <tr><td colSpan={6} className="py-32 text-center opacity-20 font-bold uppercase tracking-[0.3em]">No attribution traces linked to this vector</td></tr>
                )}
             </tbody>
          </table>
       </div>

       <RootCauseFormModal 
          isOpen={activeModal?.isOpen}
          onClose={() => setActiveModal(null)}
          modeId={activeModal?.modeId}
          initialData={activeModal?.initialData}
          onSave={onUpdate}
       />
    </motion.div>
  )
}"""

# Find the block
start_idx = content.find(causal_old_start)
end_idx = content.find(causal_old_end, start_idx) + len(causal_old_end)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + causal_new + content[end_idx:]
    
    # Now replace RoadmapTab
    roadmap_old_start = 'function RoadmapTab({ mode, onUpdate }: any) {'
    roadmap_old_end = '      </AnimatePresence>\n    </motion.div>\n  )\n}' # This might be tricky if multiple functions end this way
    
    # We need to find the specific end of RoadmapTab
    start_idx_r = new_content.find(roadmap_old_start)
    # Search for the end after the new start
    end_idx_r = new_content.find(roadmap_old_end, start_idx_r) + len(roadmap_old_end)
    
    roadmap_new = """function RoadmapTab({ mode, onUpdate }: any) {
  const [activeMitigationModal, setActiveMitigationModal] = useState<any>(null)
  const [activePreventionModal, setActivePreventionModal] = useState<any>(null)
  const [selectedCauseId, setSelectedCauseId] = useState<number | null>(null)
  
  const queryClient = useQueryClient()
  const { data: bkms } = useQuery({ queryKey: ['knowledge', 'bkms'], queryFn: async () => (await apiFetch('/api/v1/knowledge/?category=BKM')).json() })
  const { data: monitoring } = useQuery({ queryKey: ['monitoring-items'], queryFn: async () => (await apiFetch('/api/v1/monitoring/')).json() })

  useEffect(() => {
    if (!selectedCauseId && mode.causes?.length > 0) {
      setSelectedCauseId(mode.causes[0].id)
    }
  }, [mode.causes, selectedCauseId])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex-1 flex flex-col space-y-6">
       <div className="flex items-center gap-4 shrink-0 overflow-x-auto pb-2 scrollbar-hide">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest shrink-0">Select Root Cause:</span>
          {(mode.causes || []).map((cause: any) => (
             <button 
                key={cause.id}
                onClick={() => setSelectedCauseId(cause.id)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight border transition-all whitespace-nowrap ${selectedCauseId === cause.id ? 'bg-rose-600/10 border-rose-500 text-rose-500' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'}`}
             >
                {cause.cause_text}
             </button>
          ))}
          {mode.causes?.length === 0 && <span className="text-[10px] font-black text-slate-700 uppercase italic">No causes attributed to this vector</span>}
       </div>

       <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-sky-400 ">Strategic Mitigation Roadmap</h3>
          <div className="flex gap-2">
             <button onClick={() => setActiveMitigationModal({ isOpen: true, type: 'WORKAROUND' })} disabled={!selectedCauseId} className="px-6 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-500 rounded-lg text-[10px] font-bold uppercase  hover:bg-amber-600 hover:text-white transition-all disabled:opacity-20">+ Add Workaround</button>
             <button onClick={() => setActiveMitigationModal({ isOpen: true, type: 'MONITORING' })} disabled={!selectedCauseId} className="px-6 py-2 bg-sky-600/20 border border-sky-500/30 text-sky-400 rounded-lg text-[10px] font-bold uppercase  hover:bg-sky-600 hover:text-white transition-all disabled:opacity-20">+ Add Monitoring</button>
             <button onClick={() => setActivePreventionModal({ isOpen: true })} disabled={!selectedCauseId} className="px-6 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-bold uppercase  hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-20">+ Add Prevention</button>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
          <div className="bg-black/40 border border-white/5 rounded-lg overflow-hidden shadow-2xl">
             <table className="w-full text-left border-collapse">
                <thead className="bg-white/[0.03] border-b border-white/10">
                   <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ">
                      <th className="px-8 py-4">Shield Type</th>
                      <th className="px-8 py-4">Deployment Protocol / Plan</th>
                      <th className="px-8 py-4 text-center">Cause Context</th>
                      <th className="px-8 py-4 text-center">Status</th>
                      <th className="px-8 py-4 text-right">Ops</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-bold uppercase  text-[11px]">
                   {mode.mitigations?.filter((m: any) => m.cause_id === selectedCauseId).map((m: any) => (
                     <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-5">
                           <span className={`px-3 py-1 rounded-lg text-[9px] font-black ${m.mitigation_type === 'Monitoring' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>{m.mitigation_type}</span>
                        </td>
                        <td className="px-8 py-5 text-white  max-w-xl">
                           <div className="space-y-1">
                              {m.mitigation_steps?.split('\\n').map((line: string, i: number) => (
                                <div key={i} className="flex gap-3">
                                   <span className="text-slate-600 text-[9px] font-black italic">{i + 1}.</span>
                                   <span className="normal-case font-medium text-slate-300 uppercase">{line}</span>
                                </div>
                              ))}
                              {m.monitoring_item && (
                                 <div className="flex items-center gap-3 p-3 bg-sky-500/5 border border-sky-500/20 rounded-lg mt-2 group/item hover:bg-sky-500/10 transition-all">
                                    <Monitor size={14} className="text-sky-400" />
                                    <span className="text-sky-400 tracking-tight normal-case font-black uppercase">Linked Monitor: {m.monitoring_item.title}</span>
                                 </div>
                              )}
                           </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                           <div className="flex flex-col items-center gap-1">
                              <span className="text-[9px] font-black text-rose-400/70 truncate max-w-[150px]">{mode.causes?.find((c:any)=>c.id === m.cause_id)?.cause_text || 'GLOBAL_VECTOR'}</span>
                           </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                           <span className={`px-3 py-1 rounded-lg text-[9px] font-black border ${m.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-white/10'}`}>
                              {m.status?.toUpperCase() || 'PLANNED'}
                           </span>
                        </td>
                        <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                           <button className="p-2 text-slate-600 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                        </td>
                     </tr>
                   ))}
                   {mode.mitigations?.filter((m: any) => m.cause_id === selectedCauseId).length === 0 && (
                      <tr><td colSpan={5} className="py-20 text-center opacity-20 font-bold uppercase tracking-[0.3em]">No mitigation shields active for this cause</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       <MitigationFormModal 
          isOpen={activeMitigationModal?.isOpen}
          onClose={() => setActiveMitigationModal(null)}
          modeId={mode.id}
          causeId={selectedCauseId}
          type={activeMitigationModal?.type}
          bkms={bkms}
          monitoring={monitoring}
          onSave={onUpdate}
       />

       <PreventionFormModal 
          isOpen={activePreventionModal?.isOpen}
          onClose={() => setActivePreventionModal(null)}
          modeId={mode.id}
          causeId={selectedCauseId}
          onSave={onUpdate}
       />
    </motion.div>
  )
}"""

    if start_idx_r != -1 and end_idx_r != -1:
        final_content = new_content[:start_idx_r] + roadmap_new + new_content[end_idx_r:]
        with open(file_path, 'w') as f:
            f.write(final_content)
        print("Success")
    else:
        print(f"Failed to find RoadmapTab end: {start_idx_r}, {end_idx_r}")
        sys.exit(1)
else:
    print(f"Failed to find CausalTab block: {start_idx}, {end_idx}")
    sys.exit(1)
