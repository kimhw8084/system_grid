import sys

file_path = 'frontend/src/components/FAR.tsx'

with open(file_path, 'r') as f:
    lines = f.readlines()

def find_function_end(lines, start_line_idx):
    brace_count = 0
    started = False
    for i in range(start_line_idx, len(lines)):
        brace_count += lines[i].count('{')
        brace_count -= lines[i].count('}')
        if '{' in lines[i]:
            started = True
        if started and brace_count == 0:
            return i
    return -1

# 1. Update CausalTab
causal_start = -1
for i, line in enumerate(lines):
    if 'function CausalTab' in line:
        causal_start = i
        break

if causal_start != -1:
    causal_end = find_function_end(lines, causal_start)
    if causal_end != -1:
        new_causal = [
            "function CausalTab({ mode, onUpdate }: any) {\n",
            "  const [activeModal, setActiveModal] = useState<any>(null)\n",
            "\n",
            "  return (\n",
            "    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className=\"flex-1 flex flex-col space-y-6\">\n",
            "       <div className=\"flex items-center justify-between\">\n",
            "          <div className=\"flex items-center gap-4\">\n",
            "             <h3 className=\"text-sm font-bold uppercase tracking-[0.2em] text-amber-500 \">Root Cause Attribution Matrix</h3>\n",
            "             {mode.linked_rcas?.length > 0 && (\n",
            "                <div className=\"flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full\">\n",
            "                   <Activity size={12} className=\"text-purple-400\" />\n",
            "                   <span className=\"text-[9px] font-black text-purple-400 uppercase tracking-widest\">{mode.linked_rcas.length} Research Cases Linked</span>\n",
            "                </div>\n",
            "             )}\n",
            "          </div>\n",
            "          <button onClick={() => setActiveModal({ isOpen: true, modeId: mode.id })} className=\"px-6 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-500 rounded-lg text-[10px] font-bold uppercase  hover:bg-amber-600 hover:text-white transition-all\">+ Add Root Cause</button>\n",
            "       </div>\n",
            "       \n",
            "       <div className=\"flex-1 bg-black/40 border border-white/5 rounded-lg overflow-hidden flex flex-col shadow-2xl\">\n",
            "          <table className=\"w-full text-left border-collapse\">\n",
            "             <thead className=\"bg-white/[0.03] border-b border-white/10\">\n",
            "                <tr className=\"text-[10px] font-bold uppercase tracking-widest text-slate-500 \">\n",
            "                   <th className=\"px-8 py-4\">Root Cause Description (Logical Origin)</th>\n",
            "                   <th className=\"px-8 py-4 text-center\">Occur Lv</th>\n",
            "                   <th className=\"px-8 py-4\">Responsible Unit</th>\n",
            "                   <th className=\"px-8 py-4\">Linked Incidents</th>\n",
            "                   <th className=\"px-8 py-4 text-center\">BKMs</th>\n",
            "                   <th className=\"px-8 py-4 text-right\">Ops</th>\n",
            "                </tr>\n",
            "             </thead>\n",
            "             <tbody className=\"divide-y divide-white/5 font-bold uppercase  text-[11px]\">\n",
            "                {mode.causes?.map((c: any) => (\n",
            "                  <tr key={c.id} className=\"hover:bg-white/[0.02] transition-colors group\">\n",
            "                     <td className=\"px-8 py-5 text-white normal-case leading-relaxed\">{c.cause_text}</td>\n",
            "                     <td className=\"px-8 py-5 text-center\">\n",
            "                        <div className=\"flex items-center justify-center gap-2\">\n",
            "                           <div className=\"w-12 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5\">\n",
            "                              <div className=\"h-full bg-amber-500\" style={{ width: `${c.occurrence_level * 10}%` }} />\n",
            "                           </div>\n",
            "                           <span className=\"text-amber-500 w-4 font-black\">{c.occurrence_level}</span>\n",
            "                        </div>\n",
            "                     </td>\n",
            "                     <td className=\"px-8 py-5 text-slate-400 font-black\">{c.responsible_team || 'UNASSIGNED'}</td>\n",
            "                     <td className=\"px-8 py-5\">\n",
            "                        <div className=\"flex flex-col gap-1\">\n",
            "                           {(mode.linked_rcas || []).map((r: any) => (\n",
            "                              <div key={r.id} className=\"flex items-center gap-1.5 text-[8px] text-purple-400\">\n",
            "                                 <Activity size={8} />\n",
            "                                 <span className=\"truncate max-w-[120px]\">{r.title}</span>\n",
            "                              </div>\n",
            "                           ))}\n",
            "                           {(!mode.linked_rcas || mode.linked_rcas.length === 0) && <span className=\"text-slate-700 text-[8px]\">NONE</span>}\n",
            "                        </div>\n",
            "                     </td>\n",
            "                     <td className=\"px-8 py-5 text-center\">\n",
            "                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black ${c.resolutions?.length > 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 opacity-50'}`}>\n",
            "                           {c.resolutions?.length || 0} BKMS\n",
            "                        </span>\n",
            "                     </td>\n",
            "                     <td className=\"px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity\">\n",
            "                        <div className=\"flex items-center justify-end gap-2\">\n",
            "                           <button \n",
            "                             onClick={() => setActiveModal({ isOpen: true, modeId: mode.id, initialData: c })}\n",
            "                             className=\"p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all\"\n",
            "                           >\n",
            "                              <Edit2 size={14}/>\n",
            "                           </button>\n",
            "                           <button className=\"p-1.5 text-slate-600 hover:text-rose-500 transition-all rounded-lg\"><Trash2 size={14}/></button>\n",
            "                        </div>\n",
            "                     </td>\n",
            "                  </tr>\n",
            "                ))}\n",
            "                {(!mode.causes?.length) && (\n",
            "                  <tr><td colSpan={6} className=\"py-32 text-center opacity-20 font-bold uppercase tracking-[0.3em]\">No attribution traces linked to this vector</td></tr>\n",
            "                )}\n",
            "             </tbody>\n",
            "          </table>\n",
            "       </div>\n",
            "\n",
            "       <RootCauseFormModal \n",
            "          isOpen={activeModal?.isOpen}\n",
            "          onClose={() => setActiveModal(null)}\n",
            "          modeId={activeModal?.modeId}\n",
            "          initialData={activeModal?.initialData}\n",
            "          onSave={onUpdate}\n",
            "       />\n",
            "    </motion.div>\n",
            "  )\n",
            "}\n"
        ]
        lines[causal_start:causal_end+1] = new_causal

# 2. Update RoadmapTab
roadmap_start = -1
for i, line in enumerate(lines):
    if 'function RoadmapTab' in line:
        roadmap_start = i
        break

if roadmap_start != -1:
    roadmap_end = find_function_end(lines, roadmap_start)
    if roadmap_end != -1:
        new_roadmap = [
            "function RoadmapTab({ mode, onUpdate }: any) {\n",
            "  const [activeMitigationModal, setActiveMitigationModal] = useState<any>(null)\n",
            "  const [activePreventionModal, setActivePreventionModal] = useState<any>(null)\n",
            "  const [selectedCauseId, setSelectedCauseId] = useState<number | null>(null)\n",
            "  \n",
            "  const queryClient = useQueryClient()\n",
            "  const { data: bkms } = useQuery({ queryKey: ['knowledge', 'bkms'], queryFn: async () => (await apiFetch('/api/v1/knowledge/?category=BKM')).json() })\n",
            "  const { data: monitoring } = useQuery({ queryKey: ['monitoring-items'], queryFn: async () => (await apiFetch('/api/v1/monitoring/')).json() })\n",
            "\n",
            "  useEffect(() => {\n",
            "    if (!selectedCauseId && mode.causes?.length > 0) {\n",
            "      setSelectedCauseId(mode.causes[0].id)\n",
            "    }\n",
            "  }, [mode.causes, selectedCauseId])\n",
            "\n",
            "  return (\n",
            "    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className=\"flex-1 flex flex-col space-y-6\">\n",
            "       <div className=\"flex items-center gap-4 shrink-0 overflow-x-auto pb-2 scrollbar-hide\">\n",
            "          <span className=\"text-[9px] font-black text-slate-500 uppercase tracking-widest shrink-0\">Select Root Cause:</span>\n",
            "          {(mode.causes || []).map((cause: any) => (\n",
            "             <button \n",
            "                key={cause.id}\n",
            "                onClick={() => setSelectedCauseId(cause.id)}\n",
            "                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight border transition-all whitespace-nowrap ${selectedCauseId === cause.id ? 'bg-rose-600/10 border-rose-500 text-rose-500' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'}`}\n",
            "             >\n",
            "                {cause.cause_text}\n",
            "             </button>\n",
            "          ))}\n",
            "          {mode.causes?.length === 0 && <span className=\"text-[10px] font-black text-slate-700 uppercase italic\">No causes attributed to this vector</span>}\n",
            "       </div>\n",
            "\n",
            "       <div className=\"flex items-center justify-between\">\n",
            "          <h3 className=\"text-sm font-bold uppercase tracking-[0.2em] text-sky-400 \">Strategic Mitigation Roadmap</h3>\n",
            "          <div className=\"flex gap-2\">\n",
            "             <button onClick={() => setActiveMitigationModal({ isOpen: true, type: 'WORKAROUND' })} disabled={!selectedCauseId} className=\"px-6 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-500 rounded-lg text-[10px] font-bold uppercase  hover:bg-amber-600 hover:text-white transition-all disabled:opacity-20\">+ Add Workaround</button>\n",
            "             <button onClick={() => setActiveMitigationModal({ isOpen: true, type: 'MONITORING' })} disabled={!selectedCauseId} className=\"px-6 py-2 bg-sky-600/20 border border-sky-500/30 text-sky-400 rounded-lg text-[10px] font-bold uppercase  hover:bg-sky-600 hover:text-white transition-all disabled:opacity-20\">+ Add Monitoring</button>\n",
            "             <button onClick={() => setActivePreventionModal({ isOpen: true })} disabled={!selectedCauseId} className=\"px-6 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-bold uppercase  hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-20\">+ Add Prevention</button>\n",
            "          </div>\n",
            "       </div>\n",
            "\n",
            "       <div className=\"flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4\">\n",
            "          <div className=\"bg-black/40 border border-white/5 rounded-lg overflow-hidden shadow-2xl\">\n",
            "             <table className=\"w-full text-left border-collapse\">\n",
            "                <thead className=\"bg-white/[0.03] border-b border-white/10\">\n",
            "                   <tr className=\"text-[10px] font-bold uppercase tracking-widest text-slate-500 \">\n",
            "                      <th className=\"px-8 py-4\">Shield Type</th>\n",
            "                      <th className=\"px-8 py-4\">Deployment Protocol / Plan</th>\n",
            "                      <th className=\"px-8 py-4 text-center\">Cause Context</th>\n",
            "                      <th className=\"px-8 py-4 text-center\">Status</th>\n",
            "                      <th className=\"px-8 py-4 text-right\">Ops</th>\n",
            "                   </tr>\n",
            "                </thead>\n",
            "                <tbody className=\"divide-y divide-white/5 font-bold uppercase  text-[11px]\">\n",
            "                   {mode.mitigations?.filter((m: any) => m.cause_id === selectedCauseId).map((m: any) => (\n",
            "                     <tr key={m.id} className=\"hover:bg-white/[0.02] transition-colors group\">\n",
            "                        <td className=\"px-8 py-5\">\n",
            "                           <span className={`px-3 py-1 rounded-lg text-[9px] font-black ${m.mitigation_type === 'Monitoring' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>{m.mitigation_type}</span>\n",
            "                        </td>\n",
            "                        <td className=\"px-8 py-5 text-white  max-w-xl\">\n",
            "                           <div className=\"space-y-1\">\n",
            "                              {m.mitigation_steps?.split('\\n').map((line: string, i: number) => (\n",
            "                                <div key={i} className=\"flex gap-3\">\n",
            "                                   <span className=\"text-slate-600 text-[9px] font-black italic\">{i + 1}.</span>\n",
            "                                   <span className=\"normal-case font-medium text-slate-300 uppercase\">{line}</span>\n",
            "                                </div>\n",
            "                              ))}\n",
            "                              {m.monitoring_item && (\n",
            "                                 <div className=\"flex items-center gap-3 p-3 bg-sky-500/5 border border-sky-500/20 rounded-lg mt-2 group/item hover:bg-sky-500/10 transition-all\">\n",
            "                                    <Monitor size={14} className=\"text-sky-400\" />\n",
            "                                    <span className=\"text-sky-400 tracking-tight normal-case font-black uppercase\">Linked Monitor: {m.monitoring_item.title}</span>\n",
            "                                 </div>\n",
            "                              )}\n",
            "                           </div>\n",
            "                        </td>\n",
            "                        <td className=\"px-8 py-5 text-center\">\n",
            "                           <div className=\"flex flex-col items-center gap-1\">\n",
            "                              <span className=\"text-[9px] font-black text-rose-400/70 truncate max-w-[150px]\">{mode.causes?.find((c:any)=>c.id === m.cause_id)?.cause_text || 'GLOBAL_VECTOR'}</span>\n",
            "                           </div>\n",
            "                        </td>\n",
            "                        <td className=\"px-8 py-5 text-center\">\n",
            "                           <span className={`px-3 py-1 rounded-lg text-[9px] font-black border ${m.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-white/10'}`}>\n",
            "                              {m.status?.toUpperCase() || 'PLANNED'}\n",
            "                           </span>\n",
            "                        </td>\n",
            "                        <td className=\"px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity\">\n",
            "                           <button className=\"p-2 text-slate-600 hover:text-rose-500 transition-colors\"><Trash2 size={16}/></button>\n",
            "                        </td>\n",
            "                     </tr>\n",
            "                   ))}\n",
            "                   {mode.mitigations?.filter((m: any) => m.cause_id === selectedCauseId).length === 0 && (\n",
            "                      <tr><td colSpan={5} className=\"py-20 text-center opacity-20 font-bold uppercase tracking-[0.3em]\">No mitigation shields active for this cause</td></tr>\n",
            "                   )}\n",
            "                </tbody>\n",
            "             </table>\n",
            "          </div>\n",
            "       </div>\n",
            "\n",
            "       <MitigationFormModal \n",
            "          isOpen={activeMitigationModal?.isOpen}\n",
            "          onClose={() => setActiveMitigationModal(null)}\n",
            "          modeId={mode.id}\n",
            "          causeId={selectedCauseId}\n",
            "          type={activeMitigationModal?.type}\n",
            "          bkms={bkms}\n",
            "          monitoring={monitoring}\n",
            "          onSave={onUpdate}\n",
            "       />\n",
            "\n",
            "       <PreventionFormModal \n",
            "          isOpen={activePreventionModal?.isOpen}\n",
            "          onClose={() => setActivePreventionModal(null)}\n",
            "          modeId={mode.id}\n",
            "          causeId={selectedCauseId}\n",
            "          onSave={onUpdate}\n",
            "       />\n",
            "    </motion.div>\n",
            "  )\n",
            "}\n"
        ]
        lines[roadmap_start:roadmap_end+1] = new_roadmap

with open(file_path, 'w') as f:
    f.writelines(lines)
print("Success")
