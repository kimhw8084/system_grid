import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Globe, Shield, Cpu, Sliders, Box, Network, Lock, Key, Activity, 
  Save, RefreshCcw, Layout, Database, Palette, Bell, Info, Server,
  Sun, Moon, Check, Terminal, FolderTree, HardDrive, Link, Users, UserPlus, ShieldCheck, Fingerprint, X, ChevronRight, History, 
  Settings as SettingsIcon, Layers, Zap, AlertTriangle, Edit2, Clock, RotateCcw
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import { apiFetch } from "../api/apiClient"

const SettingField = ({ label, description, children, icon: Icon, help, onHistory, isEditable, onEdit, isPending }: any) => {
  const [showHelp, setShowHelp] = useState(false);
  
  return (
    <div className={`flex flex-col space-y-3 p-5 bg-[var(--panel-item-bg)] rounded-xl border transition-all group relative overflow-hidden ${isEditable ? 'border-blue-500/50 bg-blue-500/5' : 'border-[var(--glass-border)] hover:border-blue-500/30'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {Icon && <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${isEditable ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-400'}`}><Icon size={16} /></div>}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] leading-none">{label}</label>
              {isPending && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-[7px] font-black text-amber-500 uppercase animate-pulse">
                  <RefreshCcw size={8} /> Pending Hot Reload
                </span>
              )}
              {!isPending && isEditable !== undefined && (
                <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[7px] font-black text-emerald-500 uppercase">
                  Active
                </span>
              )}
            </div>
            <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-tighter mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button 
              onClick={onEdit}
              className={`p-1.5 transition-colors rounded-lg ${isEditable ? 'bg-rose-600 text-white' : 'text-[var(--text-muted)] hover:text-blue-400 hover:bg-blue-500/10'}`}
              title={isEditable ? "Lock & Discard Changes" : "Edit Field"}
            >
              {isEditable ? <Lock size={14} /> : <Edit2 size={14} />}
            </button>
          )}
          {onHistory && (
            <button 
              onClick={onHistory}
              className="p-1.5 text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
              title="View Change History"
            >
              <History size={14} />
            </button>
          )}
          {help && (
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="p-1.5 text-[var(--text-muted)] hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
            >
              <Info size={14} />
            </button>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: "auto", opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-2">
               <div className="flex justify-between items-center border-b border-blue-500/10 pb-1.5">
                  <span className="text-[8px] font-black uppercase text-blue-400">Field Inspector</span>
                  <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-lg ${help.impact === 'High' || help.impact === 'Critical' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    Impact: {help.impact}
                  </span>
               </div>
               <p className="text-[9px] font-bold text-[var(--text-secondary)] leading-relaxed italic">{help.details}</p>
               <div className="flex items-center gap-2 text-[8px] font-black uppercase text-[var(--text-muted)]">
                  <span className="text-blue-500">Target:</span> {help.file}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        {children}
      </div>
    </div>
  )
}

const ThemeCard = ({ id, name, type, colors, isActive, onClick }: any) => (
  <motion.div 
    whileHover={{ y: -2, scale: 1.01 }}
    whileTap={{ scale: 0.99 }}
    onClick={onClick}
    className={`relative cursor-pointer p-6 rounded-2xl border transition-all duration-300 overflow-hidden ${isActive ? 'bg-blue-600/10 border-blue-500 shadow-xl' : 'bg-[var(--panel-item-bg)] border-[var(--glass-border)] hover:border-white/20'}`}
  >
    {isActive && (
      <div className="absolute top-0 right-0 p-3">
        <div className="bg-blue-600 text-white p-1 rounded-full shadow-lg">
           <Check size={12} />
        </div>
      </div>
    )}
    
    <div className="flex items-center gap-4 mb-6">
      <div className={`p-3 rounded-xl ${isActive ? 'bg-blue-600/20 text-blue-400' : 'bg-[var(--bg-primary)] text-slate-500'}`}>
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
  const [showPoolLogic, setShowPoolLogic] = useState(false)
  const [historyField, setHistoryField] = useState<string | null>(null)
  const [editableFields, setEditableFields] = useState<Record<string, boolean>>({})
  const queryClient = useQueryClient()
  
  const toggleEdit = (field: string) => {
    if (editableFields[field]) {
        // If we are locking, discard local changes by resetting from envSettings
        setLocalEnv((prev: any) => ({ ...prev, [field]: envSettings?.[field] }));
    }
    setEditableFields(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const { data: userSettings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/user/settings");
      return res.json();
    }
  });

  const currentTheme = userSettings?.theme || localStorage.getItem('sysgrid-theme') || 'dark';

  const userSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      await apiFetch("/api/v1/settings/user/settings", {
        method: "POST",
        body: JSON.stringify(settings)
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] })
    }
  })

  const changeTheme = (themeId: string) => {
    localStorage.setItem('sysgrid-theme', themeId)
    document.documentElement.setAttribute('data-theme', themeId)
    const isLight = themeId === 'light'
    if (isLight) document.documentElement.classList.remove('dark')
    else document.documentElement.classList.add('dark')
    
    userSettingsMutation.mutate({ theme: themeId })
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

  const isDirty = () => {
      if (!envSettings) return false;
      return Object.keys(localEnv).some(k => JSON.stringify(localEnv[k]) !== JSON.stringify(envSettings[k]));
  }

  const isPending = (field: string) => {
    return JSON.stringify(localEnv[field]) !== JSON.stringify(envSettings?.[field]);
  }

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
    return df

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
      queryClient.invalidateQueries({ queryKey: ['env-history'] })
      setEditableFields({})
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
      queryClient.invalidateQueries({ queryKey: ['user-pool-versions'] })
      toast.success("User Pool synchronized via Python logic")
    },
    onError: (e: any) => toast.error(`Sync Failed: ${e.message}`)
  })

  const restoreMutation = useMutation({
    mutationFn: async (versionId: number) => {
      const res = await apiFetch(`/api/v1/settings/user-pool/restore/${versionId}`, {
        method: "POST"
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pool'] })
      queryClient.invalidateQueries({ queryKey: ['user-pool-versions'] })
      toast.success("User pool restored to selected version")
    }
  })

  const { data: userPool } = useQuery({
    queryKey: ['user-pool'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/user-pool")
      return res.json()
    }
  })

  const { data: poolVersions } = useQuery({
    queryKey: ['user-pool-versions'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/user-pool/versions")
      return res.json()
    }
  })

  const { data: envHistory } = useQuery({
    queryKey: ['env-history', historyField],
    queryFn: async () => {
      if (!historyField) return null;
      const res = await apiFetch(`/api/v1/settings/env/history?field=${historyField}`)
      return res.json()
    },
    enabled: !!historyField
  })

  const envHelp: any = {
    api_endpoint: { details: "Core service URL. Changing this will redirect all UI traffic to a different engine instance.", file: ".env (API_ENDPOINT)", impact: "High" },
    db_path: { details: "Primary storage location. Changing this redirects the system to a different SQLite or DB connection string.", file: ".env (DATABASE_URL)", impact: "Critical" },
    storage_root: { details: "Base directory for file persistence. Ensure the path exists and is writable by the engine.", file: ".env (STORAGE_ROOT)", impact: "Medium" },
    image_path: { details: "Sub-path for milestone captures. Must be within or relative to the storage root.", file: ".env (IMAGE_PATH)", impact: "Low" },
    backup_path: { details: "Destination for automated system state snapshots.", file: ".env (BACKUP_PATH)", impact: "Low" },
    scripts_path: { details: "Root for automation scripts. System will look here for custom maintenance logic.", file: ".env (SCRIPTS_PATH)", impact: "Medium" },
    user_pool_path: { details: "Output location for the Python sync script. This JSON file is used for RBAC.", file: ".env (USER_POOL_PATH)", impact: "Medium" },
    log_level: { details: "Verbosity of backend tracing. Higher levels provide more detail but increase disk I/O.", file: ".env (LOG_LEVEL)", impact: "Low" },
    venv_path: { details: "Virtual environment directory. Used for external script execution. Defaults to current runtime.", file: ".env (VENV_PATH)", impact: "Medium" },
    ui_timeout: { details: "Frontend API request timeout in milliseconds. Default is 30,000 (30s).", file: ".env (UI_TIMEOUT)", impact: "Low" },
    ui_debug_logging: { details: "Enable detailed logging in the browser console for UI debugging.", file: ".env (UI_DEBUG_LOGGING)", impact: "Low" },
    hot_reload_enabled: { details: "Toggle whether environment changes trigger immediate engine reload.", file: ".env (HOT_RELOAD_ENABLED)", impact: "Medium" }
  }

  return (
    <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto px-4 overflow-hidden relative">
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
          <div className="flex items-center gap-2 pr-2">
            <AnimatePresence>
                {isDirty() && (
                    <motion.button 
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => envMutation.mutate(localEnv)}
                        disabled={envMutation.isPending}
                        className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                    >
                        <Save size={14} />
                        <span>Apply & Sync Changes</span>
                    </motion.button>
                )}
            </AnimatePresence>
            <button 
                onClick={() => envMutation.mutate(localEnv)}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all border ${!isDirty() ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-600/20' : 'bg-slate-500/10 border-slate-500/20 text-slate-500 opacity-50 cursor-not-allowed'}`}
                title={isDirty() ? "Save changes before reloading" : "Hot Reload Current Config"}
            >
                <Zap size={14} className={envMutation.isPending ? 'animate-pulse' : ''} />
                <span>Force Hot Reload</span>
            </button>
          </div>
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
                      key={theme.id} {...theme} isActive={currentTheme === theme.id} onClick={() => changeTheme(theme.id)}
                    />
                  ))}
               </div>
            </motion.div>
          )}

          {topTab === 'environments' && (
            <motion.div key="environments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
               <div className="border-b border-[var(--glass-border)] pb-6 flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic text-[var(--text-primary)] leading-none">Core Infrastructure</h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-2">Global Environment & .env Management</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] flex items-center gap-2">
                    <Globe size={12} /> Connectivity & Performance
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2">
                        <SettingField 
                            icon={Link} label="Backend API Endpoint" description="The primary URL for the SysGrid Engine services." 
                            help={envHelp.api_endpoint} onHistory={() => setHistoryField('api_endpoint')}
                            onEdit={() => toggleEdit('api_endpoint')} isEditable={editableFields['api_endpoint']}
                            isPending={isPending('api_endpoint')}
                        >
                            <input 
                            disabled={!editableFields['api_endpoint']} value={localEnv.api_endpoint || ''} 
                            onChange={e => setLocalEnv({...localEnv, api_endpoint: e.target.value})} 
                            className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-xs font-mono text-blue-400 outline-none focus:border-blue-500 transition-all disabled:opacity-50" 
                            />
                        </SettingField>
                     </div>
                     <SettingField 
                        icon={Clock} label="Frontend Timeout (ms)" description="Global API request timeout threshold." 
                        help={envHelp.ui_timeout} onEdit={() => toggleEdit('ui_timeout')} 
                        isEditable={editableFields['ui_timeout']} isPending={isPending('ui_timeout')}
                     >
                        <input 
                          type="number" disabled={!editableFields['ui_timeout']} value={localEnv.ui_timeout || 30000} 
                          onChange={e => setLocalEnv({...localEnv, ui_timeout: parseInt(e.target.value)})} 
                          className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-blue-500 transition-all disabled:opacity-50" 
                        />
                     </SettingField>
                     <SettingField 
                        icon={Server} label="UI Backend Gateway URL" description="The connection point for the frontend to reach the backend services." 
                        help={{ details: "The URL the browser uses to talk to the backend. Can be different from the internal api_endpoint if using a proxy.", file: ".env (UI_BACKEND_URL)", impact: "High" }} onEdit={() => toggleEdit('ui_backend_url')} 
                        isEditable={editableFields['ui_backend_url']} isPending={isPending('ui_backend_url')}
                     >
                        <input 
                          disabled={!editableFields['ui_backend_url']} value={localEnv.ui_backend_url || ''} 
                          onChange={e => setLocalEnv({...localEnv, ui_backend_url: e.target.value})} 
                          className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-xs font-mono text-blue-400 outline-none focus:border-blue-500 transition-all disabled:opacity-50" 
                        />
                     </SettingField>
                     <SettingField 
                        icon={Activity} label="UI Debug Logging" description="Toggle verbose console diagnostics in frontend." 
                        help={envHelp.ui_debug_logging} onEdit={() => toggleEdit('ui_debug_logging')} 
                        isEditable={editableFields['ui_debug_logging']} isPending={isPending('ui_debug_logging')}
                     >
                        <div className="flex items-center gap-4 py-1">
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" disabled={!editableFields['ui_debug_logging']} checked={!!localEnv.ui_debug_logging}
                                    onChange={e => setLocalEnv({...localEnv, ui_debug_logging: e.target.checked})}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                <span className="ml-3 text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">{localEnv.ui_debug_logging ? 'Enabled' : 'Disabled'}</span>
                            </label>
                        </div>
                     </SettingField>
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] flex items-center gap-2">
                    <Database size={12} /> Persistence & Storage
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <SettingField 
                        icon={Database} label="Main Database Path" description="File path for the SQLite/PostgreSQL system store." 
                        help={envHelp.db_path} onHistory={() => setHistoryField('db_path')}
                        onEdit={() => toggleEdit('db_path')} isEditable={editableFields['db_path']} isPending={isPending('db_path')}
                      >
                        <input 
                          disabled={!editableFields['db_path']} value={localEnv.db_path || ''} 
                          onChange={e => setLocalEnv({...localEnv, db_path: e.target.value})} 
                          className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-blue-500 transition-all disabled:opacity-50" 
                        />
                      </SettingField>
                    </div>
                    <SettingField 
                      icon={FolderTree} label="Global Storage Root" description="Base directory for all persistent data volumes." 
                      help={envHelp.storage_root} onEdit={() => toggleEdit('storage_root')} 
                      isEditable={editableFields['storage_root']} isPending={isPending('storage_root')}
                    >
                       <input 
                         disabled={!editableFields['storage_root']} value={localEnv.storage_root || ''} 
                         onChange={e => setLocalEnv({...localEnv, storage_root: e.target.value})} 
                         className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-blue-500 transition-all disabled:opacity-50" 
                       />
                    </SettingField>
                    <SettingField 
                      icon={HardDrive} label="Image Capture Path" description="Storage location for forensic and discovery milestones." 
                      help={envHelp.image_path} onEdit={() => toggleEdit('image_path')} 
                      isEditable={editableFields['image_path']} isPending={isPending('image_path')}
                    >
                       <input 
                         disabled={!editableFields['image_path']} value={localEnv.image_path || ''} 
                         onChange={e => setLocalEnv({...localEnv, image_path: e.target.value})} 
                         className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-blue-500 transition-all disabled:opacity-50" 
                       />
                    </SettingField>
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] flex items-center gap-2">
                    <Lock size={12} /> Execution & Hot Reload
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <SettingField 
                      icon={Zap} label="Hot Reload Engine" description="Toggle whether .env changes trigger instant restart." 
                      help={envHelp.hot_reload_enabled} onEdit={() => toggleEdit('hot_reload_enabled')} 
                      isEditable={editableFields['hot_reload_enabled']} isPending={isPending('hot_reload_enabled')}
                    >
                        <div className="flex items-center gap-4 py-1">
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" disabled={!editableFields['hot_reload_enabled']} checked={!!localEnv.hot_reload_enabled}
                                    onChange={e => setLocalEnv({...localEnv, hot_reload_enabled: e.target.checked})}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                <span className="ml-3 text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">{localEnv.hot_reload_enabled ? 'Active' : 'Disabled'}</span>
                            </label>
                        </div>
                    </SettingField>
                    <SettingField 
                      icon={Activity} label="System Log Level" description="Verbosity for engine-side execution tracing." 
                      help={envHelp.log_level} onEdit={() => toggleEdit('log_level')} 
                      isEditable={editableFields['log_level']} isPending={isPending('log_level')}
                    >
                        <select 
                          disabled={!editableFields['log_level']} value={localEnv.log_level || 'INFO'} 
                          onChange={e => setLocalEnv({...localEnv, log_level: e.target.value})} 
                          className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[10px] font-black text-[var(--text-primary)] outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer uppercase disabled:opacity-50"
                        >
                            <option value="DEBUG">DEBUG (Max Verbosity)</option>
                            <option value="VERBOSE">VERBOSE (Detailed)</option>
                            <option value="INFO">INFO (Standard)</option>
                            <option value="WARNING">WARNING (Critical Only)</option>
                        </select>
                    </SettingField>
                  </div>
               </div>
            </motion.div>
          )}

          {topTab === 'permissions' && (
            <motion.div key="permissions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
               <div className="border-b border-[var(--glass-border)] pb-6 flex justify-between items-end">
                  <div>
                     <h2 className="text-3xl font-black uppercase tracking-tighter italic text-[var(--text-primary)] leading-none">Security Matrix</h2>
                     <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-2">Smart User Pool & Evolution Control</p>
                  </div>
                  <button className="px-6 py-2.5 bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-blue-500/20">
                     <UserPlus size={14} /> Create Operator
                  </button>
               </div>

               <div className="grid grid-cols-1 gap-6">
                  {/* Python Sync Section */}
                  <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-2xl space-y-4">
                     <button onClick={() => setShowPoolLogic(!showPoolLogic)} className="flex items-center justify-between w-full group">
                        <div className="flex items-center space-x-3">
                           <div className="p-2.5 bg-blue-600 text-white rounded-xl"><Terminal size={18} /></div>
                           <div className="text-left">
                              <h3 className="text-xs font-black uppercase text-[var(--text-primary)] tracking-widest">Smart User Pool Sync</h3>
                              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter italic">Version-controlled Python identity resolution</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           {showPoolLogic && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); poolMutation.mutate(userPoolScript); }}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                              >
                                 <RefreshCcw size={12} className={poolMutation.isPending ? 'animate-spin' : ''} />
                                 Execute Sync
                              </button>
                           )}
                           <div className={`text-slate-500 transition-transform ${showPoolLogic ? 'rotate-180' : ''}`}><ChevronRight size={20} /></div>
                        </div>
                     </button>
                     <AnimatePresence>
                        {showPoolLogic && (
                           <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4">
                              <textarea 
                                 value={userPoolScript} onChange={e => setUserPoolScript(e.target.value)}
                                 className="w-full h-64 bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-[11px] text-emerald-400 outline-none focus:border-indigo-500/50 transition-all custom-scrollbar"
                                 placeholder="# Enter Python logic to fetch user pool..."
                              />
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </div>

                  <div className="grid grid-cols-12 gap-6">
                    {/* Main User List */}
                    <div className="col-span-8 space-y-4">
                       <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Synchronized Operator Pool</h3>
                       <div className="space-y-3">
                          {userPool && userPool.length > 0 ? userPool.map((user: any, i: number) => (
                            <div key={i} className="bg-[var(--panel-item-bg)] p-4 rounded-xl border border-[var(--glass-border)] flex items-center justify-between group hover:border-blue-500/20 transition-all">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-[var(--bg-primary)] rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600/10 group-hover:text-blue-400 transition-all"><Fingerprint size={20} /></div>
                                  <div>
                                     <p className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-tight">{user.username}</p>
                                     <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">{user.email} // {user.department}</p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-6">
                                  <span className={`text-[8px] font-black uppercase tracking-widest ${user.registration_status === 'Verified' ? 'text-emerald-500' : 'text-amber-500'}`}>{user.registration_status}</span>
                                  <button className="p-1.5 text-slate-600 hover:text-white transition-colors"><Sliders size={14} /></button>
                               </div>
                            </div>
                          )) : (
                            <div className="p-10 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-500 space-y-2">
                               <Users size={32} className="opacity-20" />
                               <p className="text-[10px] font-black uppercase tracking-widest">No operators synchronized</p>
                            </div>
                          )}
                       </div>
                    </div>

                    {/* Version History Sidebar */}
                    <div className="col-span-4 space-y-6">
                       <div className="space-y-4">
                          <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] flex items-center gap-2">
                             <Clock size={12} /> Sync Snapshots
                          </h3>
                          <div className="bg-[var(--panel-item-bg)] rounded-2xl border border-[var(--glass-border)] overflow-hidden">
                             <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                                {poolVersions?.map((v: any, i: number) => (
                                  <div key={i} className={`p-4 border-b border-[var(--glass-border)] last:border-0 hover:bg-white/5 transition-all relative ${v.is_active ? 'bg-blue-600/5' : ''}`}>
                                     {v.is_active && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />}
                                     <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                           <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">{v.version_label}</span>
                                           <span className="text-[7px] font-black text-slate-500 uppercase mt-0.5">{new Date(v.created_at).toLocaleString()}</span>
                                        </div>
                                        {v.is_active ? (
                                           <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[7px] font-black uppercase">Active</span>
                                        ) : (
                                           <button 
                                            onClick={() => restoreMutation.mutate(v.id)}
                                            className="p-1 hover:text-amber-400 transition-colors" title="Restore this version"
                                           >
                                              <RotateCcw size={14} />
                                           </button>
                                        )}
                                     </div>
                                     <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1">
                                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                           <span className="text-[8px] font-black text-emerald-500">{v.diff_summary?.added || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                           <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                           <span className="text-[8px] font-black text-rose-500">{v.diff_summary?.removed || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                           <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                           <span className="text-[8px] font-black text-amber-500">{v.diff_summary?.changed || 0}</span>
                                        </div>
                                        <span className="text-[8px] font-black text-slate-500 ml-auto italic">BY {v.created_by}</span>
                                     </div>
                                  </div>
                                ))}
                             </div>
                          </div>
                       </div>
                       
                       <div className="p-4 bg-blue-600/5 rounded-2xl border border-blue-500/20 flex items-start gap-3">
                          <ShieldCheck className="text-blue-400 shrink-0 mt-0.5" size={16} />
                          <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed tracking-tighter">
                             Operator pool is immutable by default. Modifications must be synchronized via Python logic or reverted through snapshots.
                          </p>
                       </div>
                    </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History Slide-over */}
      <AnimatePresence>
        {historyField && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHistoryField(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 bottom-0 w-[400px] bg-[var(--bg-primary)] border-l border-[var(--glass-border)] shadow-2xl z-[101] flex flex-col p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><History size={20} /></div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-[var(--text-primary)] tracking-widest leading-none">Change Logs</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-tighter">{historyField}</p>
                  </div>
                </div>
                <button onClick={() => setHistoryField(null)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                {envHistory?.map((entry: any, i: number) => (
                  <div key={i} className="p-4 bg-[var(--panel-item-bg)] border border-[var(--glass-border)] rounded-xl relative group">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[8px] font-black uppercase text-blue-400 tracking-widest">{entry.timestamp}</span>
                       <button onClick={() => { setLocalEnv({...localEnv, [historyField]: entry.old_value}); setHistoryField(null); toast.success("Reverted to selected state"); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase text-amber-500 hover:underline">Revert</button>
                    </div>
                    <div className="space-y-2">
                       <div className="p-2 bg-rose-500/5 rounded border border-rose-500/10 text-[9px] font-mono text-rose-400 line-through truncate">{entry.old_value}</div>
                       <div className="p-2 bg-emerald-500/5 rounded border border-emerald-500/10 text-[9px] font-mono text-emerald-400 truncate">{entry.new_value}</div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                       <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] text-blue-400 font-bold uppercase">{entry.user?.[0] || 'O'}</div>
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{entry.user || 'SYSTEM_OP'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
