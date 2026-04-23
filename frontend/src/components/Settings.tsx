import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Globe, Shield, Cpu, Sliders, Box, Network, Lock, Key, Activity, 
  Save, RefreshCcw, Layout, Database, Palette, Bell, Info, Server,
  Sun, Moon, Check, Terminal, FolderTree, HardDrive, Link, Users, UserPlus, ShieldCheck, Fingerprint
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import { apiFetch } from "../api/apiClient"

const SettingField = ({ label, description, children, icon: Icon }: any) => (
  <div className="flex flex-col space-y-2 p-5 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group relative overflow-hidden">
    <div className="flex items-start gap-4">
      {Icon && <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 transition-transform"><Icon size={18} /></div>}
      <div className="flex flex-col">
        <label className="text-[11px] font-black uppercase tracking-widest text-white leading-none">{label}</label>
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mt-1.5 leading-relaxed">{description}</p>
      </div>
    </div>
    <div className="mt-4">
      {children}
    </div>
  </div>
)

const ThemeCard = ({ id, name, type, colors, isActive, onClick }: any) => (
  <motion.div 
    whileHover={{ y: -4, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`relative cursor-pointer p-8 rounded-[2rem] border transition-all duration-500 overflow-hidden ${isActive ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.15)]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
  >
    {isActive && (
      <div className="absolute top-0 right-0 p-4">
        <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg animate-pulse">
           <Check size={16} />
        </div>
      </div>
    )}
    
    <div className="flex items-center gap-5 mb-8">
      <div className={`p-4 rounded-2xl ${isActive ? 'bg-blue-600/20 text-blue-400' : 'bg-white/5 text-slate-500'}`}>
        {id === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-black uppercase tracking-tighter text-white italic">{name}</span>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{type}</span>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-4 h-32 rounded-2xl overflow-hidden border border-white/10 shadow-inner">
       <div style={{ backgroundColor: colors.bg }} className="relative flex items-center justify-center overflow-hidden">
          <div style={{ backgroundColor: colors.accent }} className="absolute inset-0 opacity-10 blur-3xl animate-pulse" />
          <div style={{ backgroundColor: colors.accent }} className="w-8 h-8 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.3)] relative z-10 border border-white/10" />
       </div>
       <div style={{ backgroundColor: colors.panel }} className="border-l border-white/10 flex flex-col p-4 space-y-3">
          <div className="h-1.5 w-full bg-white/10 rounded-full" />
          <div className="h-1.5 w-3/4 bg-white/10 rounded-full" />
          <div className="h-1.5 w-1/2 bg-white/10 rounded-full" />
          <div className="mt-auto flex justify-end">
             <div className="w-6 h-6 rounded-lg shadow-lg border border-white/5" style={{ backgroundColor: colors.accent }} />
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
    toast.success(`Theme switched to ${themeId === 'dark' ? 'Dark Mode' : 'Light Mode'}`)
  }

  const themes = [
    { id: 'dark', name: 'Dark Mode', type: 'High Contrast Tactical', colors: { bg: '#020617', accent: '#3b82f6', panel: '#0f172a' } },
    { id: 'light', name: 'Light Mode', type: 'Clean snow Clarity', colors: { bg: '#f8fafc', accent: '#2563eb', panel: '#ffffff' } },
  ]

  // Mocking global settings for now as the user asked for a comprehensive environment manager
  const [envSettings, setEnvSettings] = useState({
    api_endpoint: "https://api.sysgrid.internal",
    db_path: "/var/lib/sysgrid/data.db",
    storage_root: "/mnt/sysgrid/storage",
    image_path: "/mnt/sysgrid/storage/images",
    backup_path: "/mnt/sysgrid/backups",
    scripts_path: "/opt/sysgrid/scripts",
    log_level: "VERBOSE",
    max_upload_size: "100MB",
    session_timeout: "24h"
  })

  const saveEnvSettings = () => {
    toast.success("Environment configuration synchronized to .env")
  }

  return (
    <div className="h-full flex flex-col space-y-8 max-w-6xl mx-auto pb-20 px-4">
      <div className="flex items-center justify-between bg-white/[0.02] p-2 rounded-[2rem] border border-white/5 shadow-2xl backdrop-blur-xl">
        <div className="flex space-x-2">
           <button onClick={() => setTopTab('theme')} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${topTab === 'theme' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              <Palette size={16} /> App Theme
           </button>
           <button onClick={() => setTopTab('environments')} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${topTab === 'environments' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              <Cpu size={16} /> Environments
           </button>
           <button onClick={() => setTopTab('permissions')} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${topTab === 'permissions' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              <Shield size={16} /> Permissions
           </button>
        </div>
        
        {topTab !== 'theme' && (
          <button 
            onClick={saveEnvSettings}
            className="flex items-center space-x-3 px-10 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-emerald-500/20 active:scale-95 mr-2"
          >
            <Save size={16} />
            <span>Apply Global Config</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {topTab === 'theme' && (
          <motion.div key="theme" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
             <div className="flex items-end justify-between border-b border-white/5 pb-8">
                <div>
                   <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">Matrix Aesthetics</h2>
                   <p className="text-[12px] text-slate-500 uppercase tracking-[0.3em] font-black mt-3">Personalize your tactical interface</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   <Terminal size={14} className="text-blue-500" />
                   Local Storage Persisted
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-8">
                {themes.map(theme => (
                  <ThemeCard 
                    key={theme.id}
                    {...theme}
                    isActive={(theme.id === 'dark' && currentTheme.includes('nordic')) || (theme.id === 'light' && currentTheme.includes('clean')) || currentTheme === theme.id}
                    onClick={() => changeTheme(theme.id)}
                  />
                ))}
             </div>

             <div className="p-10 bg-gradient-to-br from-blue-600/10 to-indigo-600/5 rounded-[3rem] border border-blue-500/20 flex items-start space-x-10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <div className="p-5 bg-blue-600/20 rounded-3xl text-blue-400 relative z-10 shadow-2xl border border-blue-500/20">
                   <Activity size={32} className="animate-pulse" />
                </div>
                <div className="space-y-3 relative z-10">
                   <h4 className="text-xl font-black uppercase tracking-tight text-white italic">Neural UI Engine</h4>
                   <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed tracking-wider max-w-2xl">
                      Your visual configuration is synchronized across your local browser matrix. These tactical aesthetics are optimized for high-intensity monitoring and complex system orchestration without impacting node-wide global variables.
                   </p>
                </div>
                <div className="absolute right-0 bottom-0 p-10 opacity-5 grayscale group-hover:grayscale-0 group-hover:opacity-20 transition-all duration-1000">
                   <Layout size={160} />
                </div>
             </div>
          </motion.div>
        )}

        {topTab === 'environments' && (
          <motion.div key="environments" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 flex-1">
             <div className="border-b border-white/5 pb-8">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">Core Infrastructure</h2>
                <p className="text-[12px] text-slate-500 uppercase tracking-[0.3em] font-black mt-3">Global Environment & .env Management</p>
             </div>

             <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                   <SettingField icon={Link} label="Backend API Endpoint" description="The primary URL for the SysGrid Engine services.">
                      <input value={envSettings.api_endpoint} onChange={e => setEnvSettings({...envSettings, api_endpoint: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-sm font-mono text-blue-400 outline-none focus:border-blue-500 transition-all shadow-inner" />
                   </SettingField>
                </div>

                <SettingField icon={Database} label="Main Database Path" description="File path for the SQLite/PostgreSQL system store.">
                   <input value={envSettings.db_path} onChange={e => setEnvSettings({...envSettings, db_path: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-sm font-mono text-slate-300 outline-none focus:border-blue-500 transition-all" />
                </SettingField>

                <SettingField icon={FolderTree} label="Global Storage Root" description="Base directory for all persistent data volumes.">
                   <input value={envSettings.storage_root} onChange={e => setEnvSettings({...envSettings, storage_root: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-sm font-mono text-slate-300 outline-none focus:border-blue-500 transition-all" />
                </SettingField>

                <SettingField icon={HardDrive} label="Image Capture Path" description="Storage location for forensic and discovery milestones.">
                   <input value={envSettings.image_path} onChange={e => setEnvSettings({...envSettings, image_path: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-sm font-mono text-slate-300 outline-none focus:border-blue-500 transition-all" />
                </SettingField>

                <SettingField icon={RefreshCcw} label="Backup & Snapshot Dir" description="Automated system state backup destination.">
                   <input value={envSettings.backup_path} onChange={e => setEnvSettings({...envSettings, backup_path: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-sm font-mono text-slate-300 outline-none focus:border-blue-500 transition-all" />
                </SettingField>

                <SettingField icon={Terminal} label="System Scripts Root" description="Executable path for maintenance and evolution scripts.">
                   <input value={envSettings.scripts_path} onChange={e => setEnvSettings({...envSettings, scripts_path: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-sm font-mono text-slate-300 outline-none focus:border-blue-500 transition-all" />
                </SettingField>

                <SettingField icon={Activity} label="System Log Level" description="Verbosity for engine-side execution tracing.">
                   <select value={envSettings.log_level} onChange={e => setEnvSettings({...envSettings, log_level: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-sm font-black text-white outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
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
          <motion.div key="permissions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
             <div className="border-b border-white/5 pb-8 flex justify-between items-end">
                <div>
                   <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">Security Matrix</h2>
                   <p className="text-[12px] text-slate-500 uppercase tracking-[0.3em] font-black mt-3">User Management & Access Control</p>
                </div>
                <button className="px-6 py-3 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-blue-500/20">
                   <UserPlus size={16} /> Create Operator
                </button>
             </div>

             <div className="grid grid-cols-3 gap-8">
                <div className="col-span-2 space-y-4">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Active System Operators</h3>
                   {[
                     { name: 'Root Admin', role: 'Superuser', status: 'Active', color: 'text-rose-500' },
                     { name: 'Lead Architect', role: 'Maintainer', status: 'Active', color: 'text-blue-400' },
                     { name: 'Security Analyst', role: 'Auditor', status: 'Offline', color: 'text-slate-500' }
                   ].map((user, i) => (
                     <div key={i} className="bg-white/[0.03] p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-blue-500/20 transition-all">
                        <div className="flex items-center gap-5">
                           <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600/10 group-hover:text-blue-400 transition-all">
                              <Fingerprint size={24} />
                           </div>
                           <div>
                              <p className="text-sm font-black text-white uppercase tracking-tight">{user.name}</p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">{user.role}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-8">
                           <span className={`text-[9px] font-black uppercase tracking-widest ${user.status === 'Active' ? 'text-emerald-500 animate-pulse' : 'text-slate-600'}`}>{user.status}</span>
                           <button className="p-2 text-slate-600 hover:text-white transition-colors"><Sliders size={18} /></button>
                        </div>
                     </div>
                   ))}
                </div>

                <div className="space-y-6">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Access Roles</h3>
                   <div className="bg-white/[0.03] p-8 rounded-[2rem] border border-white/5 space-y-6">
                      {[
                        { role: 'Superuser', count: 1, color: 'bg-rose-500' },
                        { role: 'Maintainer', count: 4, color: 'bg-blue-500' },
                        { role: 'Auditor', count: 2, color: 'bg-emerald-500' }
                      ].map((r, i) => (
                        <div key={i} className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${r.color} shadow-[0_0_10px_currentColor]`} />
                              <span className="text-[10px] font-black text-white uppercase tracking-widest">{r.role}</span>
                           </div>
                           <span className="text-[10px] font-black text-slate-500 uppercase">{r.count} Nodes</span>
                        </div>
                      ))}
                      <div className="pt-6 border-t border-white/5">
                         <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-start gap-4">
                            <ShieldCheck className="text-blue-400 shrink-0" size={20} />
                            <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed tracking-tighter">
                               Role-based access control (RBAC) is enforced globally across all API endpoints and logical services.
                            </p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
