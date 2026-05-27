import os
import re

file_path = 'frontend/src/components/Projects.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# I need to fix the Task Detail Modal part
# It seems I have some leftover code from previous failed replacements.

# I'll replace everything from line 1354 to 1660 with a correct version.

new_gantt_end = """       <AnimatePresence>
          {selectedTaskId && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-8">
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0d0f17] w-[1000px] h-[85vh] border border-white/10 rounded-lg shadow-2xl flex flex-col overflow-hidden">
                  {(() => {
                    const task = tasks.find(t => t.id === selectedTaskId)
                    if (!task) return null

                    const subtasks = task.metadata_json?.subtasks || []
                    const [inlineSubtask, setInlineSubtask] = useState('')
                    
                    const calculateProgress = () => {
                      if (subtasks.length > 0) {
                        const completed = subtasks.filter((s: any) => s.completed).length
                        return Math.round((completed / subtasks.length) * 100)
                      }
                      switch(task.status) {
                        case 'Completed': return 100
                        case 'Review': return 90
                        case 'In Progress': return 50
                        default: return task.progress || 0
                      }
                    }

                    const autoProgress = calculateProgress()
                    const autoStatus = task.status === 'Blocked' ? 'Blocked' : (autoProgress === 100 ? 'Completed' : (autoProgress > 0 ? 'In Progress' : task.status))

                    const updateSubtask = (idx: number, updates: any) => {
                      const newSubtasks = [...subtasks]
                      newSubtasks[idx] = { ...newSubtasks[idx], ...updates }
                      handleTaskUpdate(task.id, { metadata_json: { ...task.metadata_json, subtasks: newSubtasks } })
                    }

                    const addSubtask = () => {
                      if (!inlineSubtask.trim()) return
                      const newSubtasks = [...subtasks, { label: inlineSubtask, completed: false, timestamp: new Date().toISOString() }]
                      handleTaskUpdate(task.id, { metadata_json: { ...task.metadata_json, subtasks: newSubtasks } })
                      setInlineSubtask('')
                    }

                    const removeSubtask = (idx: number) => {
                      const newSubtasks = subtasks.filter((_: any, i: number) => i !== idx)
                      handleTaskUpdate(task.id, { metadata_json: { ...task.metadata_json, subtasks: newSubtasks } })
                    }

                    const dependentFrom = tasks.filter(t => task.dependencies_json?.includes(t.id))
                    const dependentTo = tasks.filter(t => t.dependencies_json?.includes(task.id))

                    return (
                      <>
                        <div className="p-8 border-b border-white/10 bg-[#0a0c14]/50 flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className={`w-3 h-3 rounded-full ${task.status === 'Completed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : task.status === 'Blocked' ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'}`} />
                              <div>
                                 <h2 className="text-xl font-bold text-white tracking-tighter leading-none">{task.name}</h2>
                                 <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Milestone Vector</p>
                                    <span className="text-slate-800">•</span>
                                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">{autoProgress}% Execution Maturity</span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <button 
                                onClick={() => { if(confirm('Decommission this strategic milestone?')) { const updated = tasks.filter(t => t.id !== task.id); setTasks(updated); onUpdate({ ...project, tasks: updated }); setSelectedTaskId(null); } }}
                                className="p-2 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg transition-all border border-rose-500/20"
                                title="Decommission Task"
                              >
                                 <Trash2 size={16}/>
                              </button>
                              <div className="w-px h-8 bg-white/10 mx-2" />
                              <button 
                                onClick={() => { 
                                  const finalTask = { ...task, progress: autoProgress, status: autoStatus }
                                  const updatedTasks = tasks.map(t => t.id === task.id ? finalTask : t)
                                  onUpdate({ ...project, tasks: updatedTasks })
                                  setSelectedTaskId(null)
                                }} 
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                              >
                                 <Save size={14}/> 
                                 <span className="text-[10px] font-bold uppercase tracking-widest">Commit Changes</span>
                              </button>
                              <button onClick={() => setSelectedTaskId(null)} className="p-2 text-slate-500 hover:text-white rounded-lg transition-all"><X size={20}/></button>
                           </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 grid grid-cols-12 gap-10">
                           <div className="col-span-7 space-y-12">
                              <section className="space-y-4">
                                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-1">Milestone Brief</label>
                                 <div className="bg-black/20 p-6 rounded-2xl border border-white/5 shadow-inner">
                                    <textarea 
                                      value={task.description || ''} 
                                      onChange={e => handleTaskUpdate(task.id, { description: e.target.value })} 
                                      className="w-full h-32 bg-transparent border-none outline-none text-sm font-bold text-slate-300 resize-none transition-all leading-relaxed" 
                                      placeholder="Define tactical objectives for this milestone..." 
                                    />
                                 </div>
                              </section>

                              <section className="space-y-6">
                                 <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Execution Checklist</h4>
                                    <div className="flex items-center gap-2">
                                       <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                          {subtasks.filter((s:any)=>s.completed).length} / {subtasks.length} COMPLETE
                                       </span>
                                    </div>
                                 </div>
                                 <div className="space-y-3">
                                    {subtasks.map((s: any, idx: number) => (
                                      <div key={idx} className="group flex items-center gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all shadow-lg">
                                         <div className="text-[10px] font-black text-slate-700 w-6 shrink-0">{String(idx + 1).padStart(2, '0')}</div>
                                         <input 
                                           type="checkbox" 
                                           checked={s.completed} 
                                           onChange={e => updateSubtask(idx, { completed: e.target.checked })}
                                           className="w-5 h-5 rounded-lg border-white/10 bg-black/40 text-blue-500 focus:ring-blue-500 cursor-pointer transition-all"
                                         />
                                         <input 
                                           value={s.label} 
                                           onChange={e => updateSubtask(idx, { label: e.target.value })}
                                           className={`flex-1 bg-transparent border-none outline-none text-xs font-bold transition-all ${s.completed ? 'text-slate-600 line-through' : 'text-slate-200'}`}
                                         />
                                         <button onClick={() => removeSubtask(idx)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-700 hover:text-rose-500 transition-all"><Trash2 size={16}/></button>
                                      </div>
                                    ))}
                                    
                                    <div className="flex gap-3 p-2 bg-black/40 rounded-2xl border border-white/5 border-dashed">
                                       <input 
                                          value={inlineSubtask}
                                          onChange={e => setInlineSubtask(e.target.value)}
                                          onKeyDown={e => { if(e.key === 'Enter') addSubtask(); }}
                                          placeholder="New tactical requirement..."
                                          className="flex-1 bg-transparent border-none outline-none px-4 text-xs font-bold text-slate-400"
                                       />
                                       <button onClick={addSubtask} className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20"><Plus size={18}/></button>
                                    </div>
                                 </div>
                              </section>

                              <section className="space-y-6 pt-12 border-t border-white/5">
                                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
                                    <MessageSquare size={14} className="text-blue-500" /> Strategic Commentary
                                 </h4>
                                 <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                    {(task.metadata_json?.comments || []).map((c: any, i: number) => (
                                      <div key={i} className="group p-5 bg-[#0a0c14] border border-white/5 rounded-2xl space-y-3 hover:border-blue-500/20 transition-all">
                                         <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                               <div className="w-6 h-6 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase">
                                                  {c.author?.[0] || 'U'}
                                               </div>
                                               <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{c.author}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                               <span className="text-[9px] font-bold text-slate-700 uppercase">{format(new Date(c.timestamp), 'MMM dd, HH:mm')}</span>
                                               <button className="opacity-0 group-hover:opacity-100 p-1 text-slate-700 hover:text-rose-500 transition-all"><Trash2 size={12}/></button>
                                            </div>
                                         </div>
                                         <p className="text-xs font-bold text-slate-400 leading-relaxed">"{c.content}"</p>
                                         {c.image && <div className="mt-2 rounded-xl overflow-hidden border border-white/5 aspect-video bg-black/40"><img src={c.image} className="w-full h-full object-cover" /></div>}
                                      </div>
                                    ))}
                                    <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 space-y-4 shadow-xl">
                                       <textarea 
                                          id="new-task-comment"
                                          placeholder="Enter technical observation or peer commentary..."
                                          className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-300 resize-none h-20"
                                       />
                                       <div className="flex justify-between items-center pt-2">
                                          <button className="p-2 hover:bg-white/5 rounded-xl text-slate-500 transition-all"><ImageIcon size={16}/></button>
                                          <button 
                                            onClick={() => {
                                              const input = document.getElementById('new-task-comment') as HTMLTextAreaElement;
                                              if (!input.value) return;
                                              const newComments = [...(task.metadata_json?.comments || []), { author: 'System', content: input.value, timestamp: new Date().toISOString() }];
                                              handleTaskUpdate(task.id, { metadata_json: { ...task.metadata_json, comments: newComments } });
                                              input.value = '';
                                            }}
                                            className="px-6 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20"
                                          >Post Update</button>
                                       </div>
                                    </div>
                                 </div>
                              </section>
                           </div>

                           <div className="col-span-5 space-y-10">
                              <section className="space-y-6">
                                 <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                       <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest px-1">Current Status</label>
                                       <select 
                                         value={task.status} 
                                         onChange={e => handleTaskUpdate(task.id, { status: e.target.value })} 
                                         className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white uppercase outline-none focus:border-blue-500 transition-all"
                                       >
                                          {['To Do', 'In Progress', 'Blocked', 'Review', 'Completed'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                       </select>
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[8px] font-bold text-slate-600 uppercase tracking-widest px-1">Priority</label>
                                       <select 
                                         value={task.priority || 'Medium'} 
                                         onChange={e => handleTaskUpdate(task.id, { priority: e.target.value })} 
                                         className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white uppercase outline-none focus:border-blue-500 transition-all"
                                       >
                                          {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                                       </select>
                                    </div>
                                 </div>
                              </section>

                              <section className="space-y-6">
                                 <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Planned Timeline</h4>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                       <label className="text-[8px] font-bold text-slate-600 uppercase px-1">Planned Start Date</label>
                                       <input type="date" value={format(new Date(task.start_date), 'yyyy-MM-dd')} onChange={e => handleTaskUpdate(task.id, { start_date: new Date(e.target.value).toISOString() })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[8px] font-bold text-slate-600 uppercase px-1">Planned End Date</label>
                                       <input type="date" value={format(new Date(task.end_date), 'yyyy-MM-dd')} onChange={e => handleTaskUpdate(task.id, { end_date: new Date(e.target.value).toISOString() })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" />
                                    </div>
                                 </div>
                              </section>

                              <section className="space-y-6">
                                 <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Strategic Dependencies</h4>
                                 <div className="space-y-4">
                                    <div className="space-y-2">
                                       <p className="text-[8px] font-bold text-slate-600 uppercase px-1">Dependent From (Blocks these tasks)</p>
                                       <div className="flex flex-wrap gap-2">
                                          {dependentTo.map(t => (
                                            <span key={t.id} className="px-2 py-1 bg-blue-600/10 border border-blue-500/20 rounded text-[9px] font-bold text-blue-400 uppercase tracking-widest">{t.name}</span>
                                          ))}
                                          {dependentTo.length === 0 && <span className="text-[8px] font-bold text-slate-800 uppercase px-1">No downstream blocks</span>}
                                       </div>
                                    </div>
                                    <div className="space-y-2">
                                       <p className="text-[8px] font-bold text-slate-600 uppercase px-1">Dependent To (Blocked by these tasks)</p>
                                       <div className="flex flex-wrap gap-2">
                                          {dependentFrom.map(t => (
                                            <span key={t.id} className="px-2 py-1 bg-amber-600/10 border border-amber-500/20 rounded text-[9px] font-bold text-amber-400 uppercase tracking-widest">{t.name}</span>
                                          ))}
                                          {dependentFrom.length === 0 && <span className="text-[8px] font-bold text-slate-800 uppercase px-1">No upstream blocks</span>}
                                       </div>
                                    </div>
                                 </div>
                              </section>

                              <section className="space-y-4 pt-10 border-t border-white/5">
                                 <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit Timestamps</h4>
                                 <div className="space-y-2">
                                    {(task.metadata_json?.history || []).slice(-5).reverse().map((h: any, i: number) => (
                                      <div key={i} className="text-[9px] font-bold text-slate-600 flex items-center justify-between">
                                         <span className="truncate flex-1">"{h.content}"</span>
                                         <span className="text-slate-800 shrink-0 ml-4 uppercase">{format(new Date(h.timestamp), 'MMM dd, HH:mm')}</span>
                                      </div>
                                    ))}
                                 </div>
                              </section>
                           </div>
                        </div>
                      </>
                    )
                  })()}
               </motion.div>
            </div>
          )}
       </AnimatePresence>"""

# Find the start of AnimatePresence and end of it
pattern = re.compile(r"<AnimatePresence>.*?{selectedTaskId && \(.*?\n\s+<AnimatePresence>", re.DOTALL)
# Actually, I'll just use a simpler marker
content = content.split('<AnimatePresence>')[0] + new_gantt_end + '\n    </div>\n  )\n}\n' + content.split('const ExecutiveChart')[0].split('})')[1] # This is messy.

# I'll just use a simpler replacement for the broken part.
# The broken part is between line 1354 and the end of PrecisionGantt.

start_marker = "<AnimatePresence>\n          {selectedTaskId && ("
end_marker = "const ExecutiveChart ="

# I'll replace everything between these markers.
parts = content.split(start_marker)
if len(parts) > 1:
    second_parts = parts[1].split(end_marker)
    if len(second_parts) > 1:
        content = parts[0] + new_gantt_end + "\n\n" + end_marker + second_parts[1]

with open(file_path, 'w') as f:
    f.write(content)
print("JSX Fixed")
