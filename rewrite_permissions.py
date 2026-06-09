import re

with open("frontend/src/components/Settings.tsx", "r") as f:
    content = f.read()

start_marker = "          {topTab === 'permissions' && ("
end_marker = "          {topTab === 'tenants' && ("

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
    exit(1)

new_permissions_content = """          {topTab === 'permissions' && (
            <motion.div key="permissions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 pt-4">
               <div className="flex justify-between items-center pb-2">
                  <div className="flex gap-4 items-center">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input
                          value={operatorFilter}
                          onChange={e => setOperatorFilter(e.target.value)}
                          placeholder="Filter users or LDAP teams..."
                          className="w-80 rounded-lg border border-white/10 bg-black/20 pl-10 pr-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)] outline-none transition-all focus:border-blue-500/50 shadow-inner"
                        />
                     </div>
                     <select
                       value={operatorSort}
                       onChange={(e) => setOperatorSort(e.target.value as any)}
                       className="rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)] outline-none min-w-[160px]"
                     >
                       <option value="team">Sort: LDAP Team</option>
                       <option value="name">Sort: Name</option>
                       <option value="admin">Sort: Admin Status</option>
                     </select>
                  </div>
                  <div className="flex gap-2">
                    <button 
                        onClick={() => setShowPoolLogic(!showPoolLogic)}
                        className="px-4 py-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                        title="Configure Sync"
                    >
                        <RefreshCcw size={14} /> Identity Sync
                    </button>
                    <button className="px-6 py-2.5 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600/20 transition-all">
                        <Users size={14} /> Visible {filteredOperators.length}
                    </button>
                  </div>
               </div>

               <AnimatePresence>
                 {showPoolLogic && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                       <div className="p-6 bg-indigo-600/5 border border-indigo-500/20 rounded-lg space-y-4 mb-4">
                          <div className="flex justify-between items-center">
                             <div>
                                <h3 className="text-[12px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2"><Terminal size={16} /> Identity Sync Pipeline</h3>
                                <p className="text-[9px] font-bold tracking-widest text-slate-400 uppercase mt-1">Python Script to sync users from external LDAP/AD.</p>
                             </div>
                             <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => setIsSyncEditable(!isSyncEditable)}
                                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isSyncEditable ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'}`}
                                >
                                  {isSyncEditable ? "Lock Editing" : "Edit Script"}
                                </button>
                                <button 
                                  onClick={() => poolMutation.mutate(userPoolScript)}
                                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20"
                                >
                                  <RefreshCcw size={12} className={poolMutation.isPending ? 'animate-spin' : ''} /> Execute Sync Now
                                </button>
                             </div>
                          </div>
                          <div className="relative group">
                            <textarea 
                              readOnly={!isSyncEditable}
                              value={userPoolScript} onChange={e => setUserPoolScript(e.target.value)}
                              className={`w-full h-48 bg-black/60 border ${isSyncEditable ? 'border-indigo-500/50' : 'border-white/5'} rounded-lg p-6 font-mono text-[11px] text-emerald-400 outline-none transition-all custom-scrollbar leading-relaxed`}
                            />
                          </div>
                       </div>
                    </motion.div>
                 )}
               </AnimatePresence>

               <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--panel-item-bg)] shadow-2xl overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/20">
                          <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-[var(--glass-border)] sticky left-0 bg-[#0f172a] z-10 min-w-[280px]">Identity</th>
                          <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-[var(--glass-border)] min-w-[140px]">LDAP Team</th>
                          <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-[var(--glass-border)] min-w-[200px]">Assigned Groups</th>
                          <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-[var(--glass-border)] text-center">Admin Status</th>
                          {allViews.map(view => (
                            <th key={view} className="p-2 text-[8px] font-black uppercase text-slate-500 tracking-tighter border-b border-[var(--glass-border)] text-center min-w-[60px] hover:text-blue-400 transition-colors">
                              {view}
                            </th>
                          ))}
                          <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-[var(--glass-border)] text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOperators.map((op: any) => (
                          <tr key={op.id} className={`hover:bg-white/5 transition-colors border-b border-[var(--glass-border)] last:border-0 group ${op.username === userProfile?.username ? 'bg-blue-600/[0.03]' : ''}`}>
                            <td className="p-4 sticky left-0 bg-[#0f172a]/95 backdrop-blur-sm z-10 border-r border-white/5">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-[11px] shadow-lg ${op.is_admin ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-slate-800 text-slate-400'}`}>
                                  {op.username?.slice(0,2).toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <p className="text-[11px] font-black text-[var(--text-primary)] uppercase leading-none truncate flex items-center gap-1.5">
                                    {op.full_name}
                                    {op.username === userProfile?.username && <span className="text-[7px] bg-blue-500 text-white px-1.5 py-0.5 rounded-lg uppercase">You</span>}
                                  </p>
                                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-tighter truncate">ID: {op.external_id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">{op.department || 'Unknown'}</span>
                            </td>
                            <td className="p-4">
                               <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-1 rounded bg-black/40 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                     {op.team || 'No Group'}
                                  </span>
                               </div>
                            </td>
                            <td className="p-4 text-center">
                              <ToggleSwitch 
                                checked={op.is_admin} 
                                onChange={(e: any) => {
                                  if (op.username === userProfile?.username && !e.target.checked && !confirm("CRITICAL: Disabling your own Admin status will lock you out of this console. Proceed?")) return;
                                  operatorMutation.mutate({ ...op, is_admin: e.target.checked });
                                }} 
                                activeColor="bg-emerald-600"
                              />
                            </td>
                            {allViews.map(view => (
                              <td key={view} className="p-1 text-center border-x border-white/[0.02]">
                                <ViewPermissionIcon 
                                  level={op.is_admin ? 3 : getPermLevel(op.custom_permissions, view)}
                                  onClick={() => !op.is_admin && togglePermission(op, view)}
                                />
                              </td>
                            ))}
                            <td className="p-4 text-center">
                              {op.username !== userProfile?.username ? (
                                <button 
                                  onClick={() => { if(confirm(`Revoke all access for ${op.full_name}?`)) deleteOperatorMutation.mutate(op.id) }}
                                  className="p-2 text-rose-500/50 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-transparent hover:border-rose-500/20"
                                  title="Revoke Access"
                                >
                                  <Trash2 size={16} />
                                </button>
                              ) : (
                                <div className="p-2 text-slate-700 flex justify-center cursor-not-allowed" title="Protected Identity">
                                  <Lock size={16} />
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {filteredOperators.length === 0 && (
                          <tr>
                            <td colSpan={allViews.length + 5} className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                              No users match the current filters
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>
            </motion.div>
          )}
"""

with open("frontend/src/components/Settings.tsx", "w") as f:
    f.write(content[:start_idx] + new_permissions_content + "\n" + content[end_idx:])

print("Successfully rewrote Permissions tab!")
