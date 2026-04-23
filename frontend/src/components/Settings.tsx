import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Globe, Shield, Cpu, Sliders, Box, Network, Lock, Key, Activity, 
  Save, RefreshCcw, Layout, Database, Palette, Bell, Info, Server,
  Sun, Moon, Check, Terminal, FolderTree, HardDrive, Link, Users, UserPlus, ShieldCheck, Fingerprint, X
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import { apiFetch } from "../api/apiClient"

const SettingField = ({ label, description, children, icon: Icon }: any) => (
  <div className="flex flex-col space-y-3 p-4 bg-white/[0.02] rounded-xl border border-[var(--glass-border)] hover:border-blue-500/30 transition-all group relative overflow-hidden">
    <div className="flex items-start gap-4">
      {Icon && <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:scale-110 transition-transform"><Icon size={16} /></div>}
      <div className="flex flex-col">
        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] leading-none">{label}</label>
        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
    <div className="relative">
      {children}
    </div>
  </div>
)

const ThemeCard = ({ id, name, type, colors, isActive, onClick }: any) => (
  <motion.div 
    whileHover={{ y: -2, scale: 1.01 }}
    whileTap={{ scale: 0.99 }}
    onClick={onClick}
    className={`relative cursor-pointer p-6 rounded-2xl border transition-all duration-300 overflow-hidden ${isActive ? 'bg-blue-600/10 border-blue-500 shadow-xl' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
  >
    {isActive && (
      <div className="absolute top-0 right-0 p-3">
        <div className="bg-blue-600 text-white p-1 rounded-full shadow-lg">
           <Check size={12} />
        </div>
      </div>
    )}
    
    <div className="flex items-center gap-4 mb-6">
      <div className={`p-3 rounded-xl ${isActive ? 'bg-blue-600/20 text-blue-400' : 'bg-white/5 text-slate-500'}`}>
        {id === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-black uppercase tracking-tighter text-[var(--text-primary)] leading-none italic">{name}</span>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{type}</span>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-3 h-24 rounded-xl overflow-hidden border border-[var(--glass-border)] shadow-inner">
       <div style={{ backgroundColor: colors.bg }} className="relative flex items-center justify-center overflow-hidden">
          <div style={{ backgroundColor: colors.accent }} className="absolute inset-0 opacity-10 blur-xl" />
          <div style={{ backgroundColor: colors.accent }} className="w-6 h-6 rounded-lg shadow-lg relative z-10 border border-white/10" />
       </div>
       <div style={{ backgroundColor: colors.panel }} className="border-l border-[var(--glass-border)] flex flex-col p-3 space-y-2">
          <div className="h-1 w-full bg-slate-400/20 rounded-full" />
          <div className="h-1 w-3/4 bg-slate-400/20 rounded-full" />
          <div className="h-1 w-1/2 bg-slate-400/20 rounded-full" />
          <div className="mt-auto flex justify-end">
             <div className="w-4 h-4 rounded-md shadow-md border border-white/5" style={{ backgroundColor: colors.accent }} />
          </div>
       </div>
    </div>
  </motion.div>
)

export default function SettingsPage() {
  const [topTab, setTopTab] = useState<'theme' | 'environments' | 'permissions'>('theme')
  const queryClient = useQueryClient()
  
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'nordic-frost-v1'

  const changeTheme = (themeId: string) => {
    localStorage.setItem('sysgrid-theme', themeId)
    document.documentElement.setAttribute('data-theme', themeId)
    const isLight = themeId === 'light'
    if (isLight) document.documentElement.classList.remove('dark')
    else document.documentElement.classList.add('dark')
    toast.success(`Theme switched to ${themeId === 'dark' ? 'Dark Mode' : 'Light Mode'}`)
  }

  const themes = [
    { id: 'dark', name: 'Dark Mode', type: 'High Contrast Tactical', colors: { bg: '#020617', accent: '#3b82f6', panel: '#0f172a' } },
    { id: 'light', name: 'Light Mode', type: 'Clean snow Clarity', colors: { bg: '#f8fafc', accent: '#2563eb', panel: '#ffffff' } },
  ]

  const { data: envSettings, isLoading: isEnvLoading } = useQuery({
    queryKey: ['env-settings'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/env")
      return res.json()
    }
  })

  const [localEnv, setLocalEnv] = useState<any>({})
  const [userPoolScript, setUserPoolScript] = useState(`import pandas as pd
import numpy as np

def get_user_pool():
    # Simulation of external HR/IAM user fetch
    data = {
        'id': range(1001, 1006),
        'username': ['admin_alpha', 'dev_beta', 'sec_gamma', 'op_delta', 'guest_epsilon'],
        'email': ['alpha@infra.local', 'beta@infra.local', 'gamma@infra.local', 'delta@infra.local', 'epsilon@infra.local'],
        'department': ['Infrastructure', 'Development', 'Security', 'Operations', 'External'],
        'registration_status': ['Verified', 'Verified', 'Verified', 'Verified', 'Pending']
    }
    df = pd.DataFrame(data)
    # Promised columns: id, username, email, department, registration_status
    return df

# The backend execution expects a variable named 'result_df'
result_df = get_user_pool()`)

  useEffect(() => {
    if (envSettings) setLocalEnv(envSettings)
  }, [envSettings])

  const envMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch("/api/v1/settings/env", {
        method: "POST",
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['env-settings'] })
      toast.success("Environment configuration synchronized and applied")
    },
    onError: (e: any) => toast.error(`Sync Failed: ${e.message}`)
  })

  const poolMutation = useMutation({
    mutationFn: async (script: string) => {
      const res = await apiFetch("/api/v1/settings/user-pool/refresh", {
        method: "POST",
        body: JSON.stringify({ script })
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pool'] })
      toast.success("User Pool synchronized via Python logic")
    },
    onError: (e: any) => toast.error(`Sync Failed: ${e.message}`)
  })

  const { data: userPool, isLoading: isPoolLoading } = useQuery({
    queryKey: ['user-pool'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/user-pool")
      return res.json()
    }
  })

  const [showEnvHelp, setShowEnvHelp] = useState(false)

  return (
    <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto px-4 overflow-hidden">
      <div className="flex items-center justify-between bg-[var(--bg-header)] p-1.5 rounded-xl border border-[var(--glass-border)] shadow-xl backdrop-blur-xl shrink-0">
        <div className="flex space-x-1">
           <button onClick={() => setTopTab('theme')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${topTab === 'theme' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              <Palette size={14} /> App Theme
           </button>
           <button onClick={() => setTopTab('environments')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${topTab === 'environments' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              <Cpu size={14} /> Environments
           </button>
           <button onClick={() => setTopTab('permissions')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${topTab === 'permissions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              <Shield size={14} /> Permissions
           </button>
        </div>
        
        {topTab === 'environments' && (
          <button 
            onClick={() => envMutation.mutate(localEnv)}
            className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Save size={14} />
            <span>Apply Global Config</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
        <AnimatePresence mode="wait">
          {topTab === 'theme' && (
            <motion.div key="theme" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
               <div className="flex items-end justify-between border-b border-[var(--glass-border)] pb-6">
                  <div>
                     <h2 className="text-3xl font-black uppercase tracking-tighter italic text-[var(--text-primary)] leading-none">Matrix Aesthetics</h2>
                     <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-2">Personalize your tactical interface</p>
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-6">
                  {themes.map(theme => (
                    <ThemeCard 
                      key={theme.id}
                      {...theme}
                      isActive={(theme.id === 'dark' && !document.documentElement.classList.contains('light')) || (theme.id === 'light' && document.documentElement.classList.contains('light'))}
                      onClick={() => changeTheme(theme.id)}
                    />
                  ))}
               </div>
            </motion.div>
          )}

          {topTab === 'environments' && (
            <motion.div key="environments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
               <div className="border-b border-[var(--glass-border)] pb-6 flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic text-[var(--text-primary)] leading-none">Core Infrastructure</h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-2">Global Environment & .env Management</p>
                  </div>
                  <button 
                    onClick={() => setShowEnvHelp(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase hover:bg-blue-600/20 transition-all"
                  >
                    <Info size={14} />
                    <span>File Map Help</span>
                  </button>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                     <SettingField icon={Link} label="Backend API Endpoint" description="The primary URL for the SysGrid Engine services.">
                        <input value={localEnv.api_endpoint || ''} onChange={e => setLocalEnv({...localEnv, api_endpoint: e.target.value})} className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 text-xs font-mono text-blue-400 outline-none focus:border-blue-500 transition-all" />
                     </SettingField>
                  </div>

                  <SettingField icon={Database} label="Main Database Path" description="File path for the SQLite/PostgreSQL system store.">
                     <input value={localEnv.db_path || ''} onChange={e => setLocalEnv({...localEnv, db_path: e.target.value})} className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 text-xs font-mono text-slate-300 outline-none focus:border-blue-500 transition-all" />
                  </SettingField>

                  <SettingField icon={FolderTree} label="Global Storage Root" description="Base directory for all persistent data volumes.">
                     <input value={localEnv.storage_root || ''} onChange={e => setLocalEnv({...localEnv, storage_root: e.target.value})} className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 text-xs font-mono text-slate-300 outline-none focus:border-blue-500 transition-all" />
                  </SettingField>

                  <SettingField icon={HardDrive} label="Image Capture Path" description="Storage location for forensic and discovery milestones.">
                     <input value={localEnv.image_path || ''} onChange={e => setLocalEnv({...localEnv, image_path: e.target.value})} className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 text-xs font-mono text-slate-300 outline-none focus:border-blue-500 transition-all" />
                  </SettingField>

                  <SettingField icon={RefreshCcw} label="Backup & Snapshot Dir" description="Automated system state backup destination.">
                     <input value={localEnv.backup_path || ''} onChange={e => setLocalEnv({...localEnv, backup_path: e.target.value})} className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 text-xs font-mono text-slate-300 outline-none focus:border-blue-500 transition-all" />
                  </SettingField>

                  <SettingField icon={Terminal} label="System Scripts Root" description="Executable path for maintenance and evolution scripts.">
                     <input value={localEnv.scripts_path || ''} onChange={e => setLocalEnv({...localEnv, scripts_path: e.target.value})} className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 text-xs font-mono text-slate-300 outline-none focus:border-blue-500 transition-all" />
                  </SettingField>

                  <SettingField icon={Users} label="User Pool JSON Path" description="Persistent store for synchronized operator identities.">
                     <input value={localEnv.user_pool_path || ''} onChange={e => setLocalEnv({...localEnv, user_pool_path: e.target.value})} className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 text-xs font-mono text-slate-300 outline-none focus:border-blue-500 transition-all" />
                  </SettingField>

                  <SettingField icon={Activity} label="System Log Level" description="Verbosity for engine-side execution tracing.">
                     <select value={localEnv.log_level || 'INFO'} onChange={e => setLocalEnv({...localEnv, log_level: e.target.value})} className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 text-[10px] font-black text-white outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer uppercase">
                        <option value="DEBUG">DEBUG (Max Verbosity)</option>
                        <option value="VERBOSE">VERBOSE (Detailed)</option>
                        <option value="INFO">INFO (Standard)</option>
                        <option value="WARNING">WARNING (Critical Only)</option>
                     </select>
                  </SettingField>
               </div>
            </motion.div>
          )}

          {topTab === 'permissions' && (
            <motion.div key="permissions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
               <div className="border-b border-[var(--glass-border)] pb-6 flex justify-between items-end">
                  <div>
                     <h2 className="text-3xl font-black uppercase tracking-tighter italic text-[var(--text-primary)] leading-none">Security Matrix</h2>
                     <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-2">User Pool & Access Control Evolution</p>
                  </div>
                  <button className="px-6 py-2.5 bg-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-blue-500/20">
                     <UserPlus size={14} /> Create Operator
                  </button>
               </div>

               <div className="grid grid-cols-1 gap-6">
                  <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-xl space-y-4">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                           <div className="p-2 bg-blue-600 text-white rounded-lg"><Terminal size={18} /></div>
                           <div>
                              <h3 className="text-xs font-black uppercase text-white tracking-widest">User Pool Logic (Python)</h3>
                              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Define how system retrieves and validates operator identities</p>
                           </div>
                        </div>
                        <button 
                          onClick={() => poolMutation.mutate(userPoolScript)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                        >
                           <RefreshCcw size={12} className={poolMutation.isPending ? 'animate-spin' : ''} />
                           Run Sync Script
                        </button>
                     </div>
                     <textarea 
                        value={userPoolScript}
                        onChange={e => setUserPoolScript(e.target.value)}
                        className="w-full h-64 bg-black/40 border border-white/10 rounded-lg p-4 font-mono text-[11px] text-emerald-400 outline-none focus:border-indigo-500/50 transition-all custom-scrollbar"
                        placeholder="# Enter Python logic to fetch user pool..."
                     />
                     <div className="flex items-center space-x-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                        <Info size={10} />
                        <span>Script must return a Pandas DataFrame with [id, username, email, department, registration_status]</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 space-y-4">
                       <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Synchronized Operator Pool</h3>
                       <div className="space-y-3">
                          {userPool && userPool.length > 0 ? userPool.map((user: any, i: number) => (
                            <div key={i} className="bg-white/[0.03] p-4 rounded-xl border border-white/5 flex items-center justify-between group hover:border-blue-500/20 transition-all">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-600/10 group-hover:text-blue-400 transition-all">
                                     <Fingerprint size={20} />
                                  </div>
                                  <div>
                                     <p className="text-[11px] font-black text-white uppercase tracking-tight">{user.username}</p>
                                     <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">{user.email} // {user.department}</p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-6">
                                  <span className={`text-[8px] font-black uppercase tracking-widest ${user.registration_status === 'Verified' ? 'text-emerald-500' : 'text-amber-500'}`}>{user.registration_status}</span>
                                  <button className="p-1.5 text-slate-600 hover:text-white transition-colors"><Sliders size={14} /></button>
                               </div>
                            </div>
                          )) : (
                            <div className="p-10 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-slate-500 space-y-2">
                               <Users size={32} className="opacity-20" />
                               <p className="text-[10px] font-black uppercase tracking-widest">No operators synchronized</p>
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Access Roles</h3>
                       <div className="bg-white/[0.03] p-6 rounded-xl border border-white/5 space-y-4">
                          {[
                            { role: 'Superuser', count: 1, color: 'bg-rose-500' },
                            { role: 'Maintainer', count: 4, color: 'bg-blue-500' },
                            { role: 'Auditor', count: 2, color: 'bg-emerald-500' }
                          ].map((r, i) => (
                            <div key={i} className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <div className={`w-1.5 h-1.5 rounded-full ${r.color} shadow-[0_0_8px_currentColor]`} />
                                  <span className="text-[9px] font-black text-white uppercase tracking-widest">{r.role}</span>
                               </div>
                               <span className="text-[9px] font-black text-slate-500 uppercase">{r.count}</span>
                            </div>
                          ))}
                          <div className="pt-4 border-t border-white/5">
                             <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 flex items-start gap-3">
                                <ShieldCheck className="text-blue-400 shrink-0" size={16} />
                                <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed tracking-tighter">
                                   Role-based access control (RBAC) is enforced globally via the Python user pool integration.
                                </p>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showEnvHelp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[600px] p-8 rounded-xl border border-blue-500/30 space-y-6">
               <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="text-xl font-black uppercase text-blue-400 flex items-center gap-3 italic">
                    <FolderTree size={24} /> Infrastructure File Map
                  </h3>
                  <button onClick={() => setShowEnvHelp(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
               </div>
               <div className="space-y-4 text-[11px] font-bold uppercase tracking-tight text-slate-400 leading-relaxed">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                    <p className="text-white mb-2">1. System .env Persistence</p>
                    <p>Settings are written to <span className="text-blue-400 font-mono">backend/.env</span> and <span className="text-blue-400 font-mono">frontend/.env</span>. Backend restart may be required for some changes.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                    <p className="text-white mb-2">2. Database Schema Management</p>
                    <p>The DB Path refers to the <span className="text-blue-400 font-mono">sysgrid.db</span> location. Migrations are managed via Alembic in <span className="text-blue-400 font-mono">backend/alembic/</span>.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                    <p className="text-white mb-2">3. Storage & Artifacts</p>
                    <p>Image captures are stored in the <span className="text-blue-400 font-mono">storage/images</span> directory, while system backups are routed to <span className="text-blue-400 font-mono">backups/</span>.</p>
                  </div>
               </div>
               <button onClick={() => setShowEnvHelp(false)} className="w-full py-3 bg-blue-600 text-white rounded-lg font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Close Inspector</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
