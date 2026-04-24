import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Globe, Shield, Cpu, Sliders, Box, Network, Lock, Key, Activity, 
  Save, RefreshCcw, Layout, Database, Palette, Bell, Info, Server,
  Sun, Moon, Check, Terminal, FolderTree, HardDrive, Link, Users, UserPlus, ShieldCheck, Fingerprint, X, ChevronRight, History, 
  Settings as SettingsIcon, Layers, Zap, AlertTriangle, Edit2, Clock, RotateCcw, ChevronDown, ChevronUp, FileCode, Search, Filter, ShieldAlert, MoreHorizontal, Eye
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import { apiFetch } from "../api/apiClient"

const SettingField = ({ label, description, children, icon: Icon, help, onHistory, isEditable, onEdit, isPending, absPath, isModified }: any) => {
  const [showHelp, setShowHelp] = useState(false);
  
  return (
    <div className={`flex flex-col space-y-3 p-5 bg-[var(--panel-item-bg)] rounded-xl border transition-all group relative overflow-hidden ${isEditable ? 'border-blue-500/50 bg-blue-500/5' : 'border-[var(--glass-border)] hover:border-blue-500/30'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {Icon && <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${isEditable ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-400'}`}><Icon size={16} /></div>}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] leading-none">{label}</label>
              {isModified ? (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-[7px] font-black text-amber-500 uppercase animate-pulse">
                   Modified
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[7px] font-black text-emerald-500 uppercase">
                  Loaded
                </span>
              )}
              {isPending && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-[7px] font-black text-blue-400 uppercase">
                  <RefreshCcw size={8} className="animate-spin" /> Pending Hot Reload
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
      
      {absPath && (
          <div className="flex items-center gap-1.5 text-[7px] font-black uppercase text-slate-500 tracking-tighter">
              <FolderTree size={8} /> {absPath}
          </div>
      )}

      <AnimatePresence>
        {showHelp && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mb-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-2">
               <div className="flex justify-between items-center border-b border-blue-500/10 pb-1.5">
                  <span className="text-[8px] font-black uppercase text-blue-400">Field Inspector</span>
                  <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-lg ${help.impact === 'High' || help.impact === 'Critical' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    Impact: {help.impact}
                  </span>
               </div>
               <p className="text-[9px] font-bold text-[var(--text-secondary)] leading-relaxed italic">{help.details}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
            {children}
        </div>
        {isModified && isEditable && (
            <motion.button 
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                onClick={() => onEdit('save')}
                className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
                <Save size={16} />
            </motion.button>
        )}
      </div>
    </div>
  )
}

const ToggleSwitch = ({ checked, onChange, disabled, activeColor = 'bg-blue-600' }: any) => (
    <label className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} disabled={disabled} />
        <div className={`relative w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${checked ? activeColor : ''}`}></div>
    </label>
)

const ViewPermissionIcon = ({ level, onClick }: any) => {
    const colors = ["text-slate-700", "text-blue-500", "text-amber-500", "text-emerald-500"];
    const labels = ["No Access", "Read Only", "Add Only", "Full Control"];
    const Icons = [ShieldAlert, Shield, ShieldCheck, ShieldCheck];
    const Icon = Icons[level];

    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white/5 transition-all gap-1 group w-12`}
            title={labels[level]}
        >
            <Icon size={14} className={`${colors[level]} group-hover:scale-110 transition-transform`} />
            <span className={`text-[6px] font-black uppercase text-center leading-none ${colors[level]}`}>{labels[level].split(' ').join('\n')}</span>
        </button>
    )
}

export default function SettingsPage() {
  const [topTab, setTopTab] = useState<'environments' | 'permissions'>('environments')
  const [showPoolLogic, setShowPoolLogic] = useState(false)
  const [isSyncEditable, setIsSyncEditable] = useState(false)
  const [historyField, setHistoryField] = useState<string | null>(null)
  const [showPoolHistory, setShowPoolHistory] = useState(false)
  const [viewVersionData, setViewVersionData] = useState<any>(null)
  const [viewVersionScript, setViewVersionScript] = useState<string | null>(null)
  const [editableFields, setEditableFields] = useState<Record<string, boolean>>({})
  const queryClient = useQueryClient()
  
  const toggleEdit = (field: string, action?: 'save') => {
    if (action === 'save') {
        envMutation.mutate({ [field]: localEnv[field] });
        return;
    }
    if (editableFields[field]) {
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

  const { data: envSettings, isLoading: isEnvLoading } = useQuery({
    queryKey: ['env-settings'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/env")
      return res.json()
    }
  })

  const [localEnv, setLocalEnv] = useState<any>({})

  const isDirty = (field?: string) => {
      if (!envSettings) return false;
      if (field) return JSON.stringify(localEnv[field]) !== JSON.stringify(envSettings[field]);
      return Object.keys(localEnv).some(k => k !== '_abs_paths' && JSON.stringify(localEnv[k]) !== JSON.stringify(envSettings[k]));
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
    if (envSettings) {
        setLocalEnv(envSettings);
    }
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
    onSuccess: (data, variables) => {
      if (variables.ui_backend_url) {
        localStorage.setItem('SYSGRID_OVERRIDE_API_URL', variables.ui_backend_url);
        toast.success("UI Gateway updated & persisted locally");
      }
      queryClient.invalidateQueries({ queryKey: ['env-settings'] })
      queryClient.invalidateQueries({ queryKey: ['env-history'] })
      setEditableFields({})
      toast.success("Configuration synchronized")
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
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      queryClient.invalidateQueries({ queryKey: ['user-pool-versions'] })
      setIsSyncEditable(false);
      toast.success("User Pool synchronized via Python logic")
    },
    onError: (e: any) => toast.error(`Sync Failed: ${e.message}`)
  })

  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/operators")
      return res.json()
    }
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/roles")
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
    api_endpoint: { details: "Core service URL.", impact: "High" },
    db_path: { details: "Primary storage location.", impact: "Critical" },
    storage_root: { details: "Base directory for file persistence.", impact: "Medium" },
    image_path: { details: "Sub-path for milestone captures.", impact: "Low" },
    log_level: { details: "Verbosity of backend tracing.", impact: "Low" },
    ui_timeout: { details: "Frontend API request timeout in milliseconds.", impact: "Low" },
    ui_debug_logging: { details: "Enable detailed logging in the browser console.", impact: "Low" },
    hot_reload_enabled: { details: "Toggle whether environment changes trigger immediate engine reload.", impact: "Medium" }
  }

  const viewGroups = [
    { name: "Infrastructure", views: ["dashboard", "assets", "racks", "network"] },
    { name: "Services", views: ["registry", "flows", "intelligence"] },
    { name: "Operations", views: ["maintenance", "monitoring"] },
    { name: "Reliability", views: ["rca", "far"] },
    { name: "Administration", views: ["knowledge", "audit", "projects", "settings"] }
  ]

  return (
    <div className="h-full flex flex-col space-y-6 max-w-7xl mx-auto px-4 overflow-hidden relative">
      <div className="flex items-center justify-between bg-[var(--bg-header)] p-1.5 rounded-xl border border-[var(--glass-border)] shadow-xl backdrop-blur-xl shrink-0">
        <div className="flex space-x-1">
           <button onClick={() => setTopTab('environments')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${topTab === 'environments' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              <Cpu size={14} /> Environments
           </button>
           <button onClick={() => setTopTab('permissions')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${topTab === 'permissions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              <Shield size={14} /> Permissions
           </button>
        </div>
        
        {topTab === 'environments' && (
          <div className="flex items-center gap-2 pr-2">
            <button 
                onClick={() => envMutation.mutate({})} // Force empty update to trigger refresh
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all border ${isDirty() ? 'bg-amber-600/10 border-amber-500/30 text-amber-500 animate-pulse' : 'bg-emerald-600/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-600/20'}`}
                title="Force Hot Reload Current Config"
            >
                <Zap size={14} className={envMutation.isPending ? 'animate-pulse' : ''} />
                <span>Force Hot Reload</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
        <AnimatePresence mode="wait">
          {topTab === 'environments' && (
            <motion.div key="environments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
               <div className="border-b border-[var(--glass-border)] pb-6">
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic text-[var(--text-primary)] leading-none">Core Infrastructure</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-2">Global Environment & .env Management</p>
               </div>

               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] flex items-center gap-2"><Globe size={12} /> Connectivity</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2">
                        <SettingField 
                            icon={Link} label="Backend API Endpoint" description="The primary URL for the SysGrid Engine services." 
                            help={envHelp.api_endpoint} onHistory={() => setHistoryField('api_endpoint')}
                            onEdit={(a: any) => toggleEdit('api_endpoint', a)} isEditable={editableFields['api_endpoint']}
                            isModified={isDirty('api_endpoint')} absPath={localEnv._abs_paths?.env_file}
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
                        help={envHelp.ui_timeout} onEdit={(a: any) => toggleEdit('ui_timeout', a)} onHistory={() => setHistoryField('ui_timeout')}
                        isEditable={editableFields['ui_timeout']} isModified={isDirty('ui_timeout')} absPath={localEnv._abs_paths?.env_file}
                     >
                        <input 
                          type="number" disabled={!editableFields['ui_timeout']} value={localEnv.ui_timeout || 30000} 
                          onChange={e => setLocalEnv({...localEnv, ui_timeout: parseInt(e.target.value)})} 
                          className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-blue-500 transition-all disabled:opacity-50" 
                        />
                     </SettingField>
                     <SettingField 
                        icon={Server} label="UI Backend Gateway URL" description="The connection point for the frontend to reach backend." 
                        help={{ details: "URL browser uses to talk to backend.", impact: "High" }} onEdit={(a: any) => toggleEdit('ui_backend_url', a)} onHistory={() => setHistoryField('ui_backend_url')}
                        isEditable={editableFields['ui_backend_url']} isModified={isDirty('ui_backend_url')} absPath={localEnv._abs_paths?.env_file}
                     >
                        <input 
                          disabled={!editableFields['ui_backend_url']} value={localEnv.ui_backend_url || ''} 
                          onChange={e => setLocalEnv({...localEnv, ui_backend_url: e.target.value})} 
                          className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-xs font-mono text-blue-400 outline-none focus:border-blue-500 transition-all disabled:opacity-50" 
                        />
                     </SettingField>
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] flex items-center gap-2"><Database size={12} /> Storage</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <SettingField 
                        icon={Database} label="Main Database Path" description="File path for the system store." 
                        help={envHelp.db_path} onHistory={() => setHistoryField('db_path')}
                        onEdit={(a: any) => toggleEdit('db_path', a)} isEditable={editableFields['db_path']} isModified={isDirty('db_path')} absPath={localEnv._abs_paths?.db_path}
                      >
                        <input 
                          disabled={!editableFields['db_path']} value={localEnv.db_path || ''} 
                          onChange={e => setLocalEnv({...localEnv, db_path: e.target.value})} 
                          className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-blue-500 transition-all disabled:opacity-50" 
                        />
                      </SettingField>
                    </div>
                    <SettingField 
                      icon={FolderTree} label="Global Storage Root" description="Base directory for all persistent data." 
                      help={envHelp.storage_root} onEdit={(a: any) => toggleEdit('storage_root', a)} onHistory={() => setHistoryField('storage_root')}
                      isEditable={editableFields['storage_root']} isModified={isDirty('storage_root')} absPath={localEnv._abs_paths?.storage_root}
                    >
                       <input 
                         disabled={!editableFields['storage_root']} value={localEnv.storage_root || ''} 
                         onChange={e => setLocalEnv({...localEnv, storage_root: e.target.value})} 
                         className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-blue-500 transition-all disabled:opacity-50" 
                       />
                    </SettingField>
                    <SettingField 
                      icon={HardDrive} label="Image Capture Path" description="Storage location for milestones." 
                      help={envHelp.image_path} onEdit={(a: any) => toggleEdit('image_path', a)} onHistory={() => setHistoryField('image_path')}
                      isEditable={editableFields['image_path']} isModified={isDirty('image_path')} absPath={localEnv._abs_paths?.image_path}
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
                  <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] flex items-center gap-2"><Zap size={12} /> Execution</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <SettingField 
                      icon={Zap} label="Hot Reload Engine" description="Toggle instant restart on .env changes." 
                      help={envHelp.hot_reload_enabled} onEdit={(a: any) => toggleEdit('hot_reload_enabled', a)} onHistory={() => setHistoryField('hot_reload_enabled')}
                      isEditable={editableFields['hot_reload_enabled']} isModified={isDirty('hot_reload_enabled')} absPath={localEnv._abs_paths?.env_file}
                    >
                        <div className="flex items-center gap-4 py-1">
                            <ToggleSwitch 
                                checked={!!localEnv.hot_reload_enabled} disabled={!editableFields['hot_reload_enabled']}
                                onChange={(e: any) => setLocalEnv({...localEnv, hot_reload_enabled: e.target.checked})}
                                activeColor="bg-emerald-600"
                            />
                            <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">{localEnv.hot_reload_enabled ? 'Active' : 'Disabled'}</span>
                        </div>
                    </SettingField>
                    <SettingField 
                      icon={Activity} label="UI Debug Logging" description="Toggle verbose console diagnostics." 
                      help={envHelp.ui_debug_logging} onEdit={(a: any) => toggleEdit('ui_debug_logging', a)} onHistory={() => setHistoryField('ui_debug_logging')}
                      isEditable={editableFields['ui_debug_logging']} isModified={isDirty('ui_debug_logging')} absPath={localEnv._abs_paths?.env_file}
                    >
                        <div className="flex items-center gap-4 py-1">
                            <ToggleSwitch 
                                checked={!!localEnv.ui_debug_logging} disabled={!editableFields['ui_debug_logging']}
                                onChange={(e: any) => setLocalEnv({...localEnv, ui_debug_logging: e.target.checked})}
                            />
                            <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">{localEnv.ui_debug_logging ? 'Enabled' : 'Disabled'}</span>
                        </div>
                    </SettingField>
                    <SettingField 
                      icon={Activity} label="System Log Level" description="Verbosity for engine-side execution tracing." 
                      help={envHelp.log_level} onEdit={(a: any) => toggleEdit('log_level', a)} onHistory={() => setHistoryField('log_level')}
                      isEditable={editableFields['log_level']} isModified={isDirty('log_level')} absPath={localEnv._abs_paths?.env_file}
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
                    <SettingField 
                      icon={Cpu} label="System VENV Path" description="Python virtual environment for engine execution." 
                      help={{ details: "The path to the python virtual environment used by the backend.", impact: "Medium" }} onEdit={(a: any) => toggleEdit('venv_path', a)} onHistory={() => setHistoryField('venv_path')}
                      isEditable={editableFields['venv_path']} isModified={isDirty('venv_path')} absPath={localEnv._abs_paths?.venv_path}
                    >
                        <input 
                          disabled={!editableFields['venv_path']} value={localEnv.venv_path || ''} 
                          onChange={e => setLocalEnv({...localEnv, venv_path: e.target.value})} 
                          className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-blue-500 transition-all disabled:opacity-50" 
                        />
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
                     <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-2">Operator Governance & RBAC Enforcement</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                        onClick={() => setShowPoolHistory(true)}
                        className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl hover:bg-amber-500/20 transition-all border border-amber-500/20"
                        title="View Sync History"
                    >
                        <History size={18} />
                    </button>
                    <button className="px-6 py-2.5 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600/20 transition-all">
                        <ShieldCheck size={14} /> Manage Privileges
                    </button>
                  </div>
               </div>

               {/* Minimal Pool Sync Card */}
               <div className={`transition-all duration-300 ${showPoolLogic ? 'p-6 bg-indigo-600/5 border-indigo-500/20' : 'p-3 bg-slate-800/20 border-white/5'} border rounded-2xl`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl transition-all ${showPoolLogic ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}><Terminal size={16} /></div>
                            <div>
                                <h3 className="text-[10px] font-black uppercase text-[var(--text-primary)] tracking-widest">User Pool Sync</h3>
                                {showPoolLogic && <p className="text-[8px] text-slate-500 uppercase font-bold italic mt-0.5">Python logic for identity resolution</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {showPoolLogic && (
                                <>
                                    <button 
                                        onClick={() => setIsSyncEditable(!isSyncEditable)}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isSyncEditable ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'}`}
                                    >
                                        {isSyncEditable ? <Lock size={12} /> : <Edit2 size={12} />}
                                    </button>
                                    <button 
                                        onClick={() => poolMutation.mutate(userPoolScript)}
                                        className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                        <RefreshCcw size={10} className={poolMutation.isPending ? 'animate-spin' : ''} /> Execute
                                    </button>
                                </>
                            )}
                            <button onClick={() => setShowPoolLogic(!showPoolLogic)} className="p-1.5 text-slate-500 hover:text-white transition-all">
                                {showPoolLogic ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                        </div>
                    </div>
                    <AnimatePresence>
                        {showPoolLogic && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4">
                                <div className="relative group">
                                    <textarea 
                                        readOnly={!isSyncEditable}
                                        value={userPoolScript} onChange={e => setUserPoolScript(e.target.value)}
                                        className={`w-full h-48 bg-black/40 border ${isSyncEditable ? 'border-indigo-500/50' : 'border-white/5'} rounded-xl p-4 font-mono text-[10px] text-emerald-400 outline-none transition-all custom-scrollbar`}
                                    />
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(userPoolScript); toast.success("Script copied"); }}
                                        className="absolute top-3 right-3 p-2 bg-slate-800/80 text-slate-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <FileCode size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
               </div>

               {/* Compact User Table */}
               <div className="bg-[var(--panel-item-bg)] border border-[var(--glass-border)] rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-[var(--glass-border)] bg-white/2 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                <input placeholder="Filter Operators..." className="bg-black/20 border border-white/5 rounded-lg pl-9 pr-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] focus:border-blue-500/50 outline-none w-64 transition-all" />
                             </div>
                             <div className="flex gap-1">
                                <button className="p-2 text-slate-500 hover:text-white transition-all bg-white/5 rounded-lg"><Filter size={14} /></button>
                             </div>
                        </div>
                        <div className="flex items-center gap-6">
                            {viewGroups.map(g => (
                                <div key={g.name} className="flex flex-col items-center">
                                    <span className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">{g.name}</span>
                                    <div className="flex gap-0.5">
                                        {g.views.map(v => <div key={v} className="w-1.5 h-1.5 rounded-full bg-slate-700" title={v} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/10">
                                    <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-[var(--glass-border)]">Identity</th>
                                    <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-[var(--glass-border)]">Org Context</th>
                                    {viewGroups.map(g => (
                                        <th key={g.name} className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-[var(--glass-border)] text-center bg-blue-500/2">{g.name} Matrix</th>
                                    ))}
                                    <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-[var(--glass-border)]">Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {operators?.map((op: any) => (
                                    <tr key={op.id} className="hover:bg-white/2 transition-colors border-b border-[var(--glass-border)] last:border-0 group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400 font-black text-[10px]">{op.username?.slice(0,2).toUpperCase()}</div>
                                                <div>
                                                    <p className="text-[10px] font-black text-[var(--text-primary)] uppercase leading-none">{op.full_name}</p>
                                                    <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-tighter italic">ID: {op.external_id} // {op.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-300 uppercase leading-none">{op.department}</span>
                                                <span className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{op.team || "N/A"}</span>
                                            </div>
                                        </td>
                                        {viewGroups.map(g => (
                                            <td key={g.name} className="p-4 bg-blue-500/1">
                                                <div className="flex items-center justify-center gap-1">
                                                    {g.views.map(v => (
                                                        <ViewPermissionIcon 
                                                            key={v} level={op.custom_permissions?.[v] ?? op.role?.permissions?.[v] ?? 0}
                                                            onClick={() => toast.info(`Toggle permission for ${v}`)}
                                                        />
                                                    ))}
                                                </div>
                                            </td>
                                        ))}
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="px-3 py-1 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                    {op.role?.name || "No Role Assigned"}
                                                </div>
                                                <button className="p-2 text-slate-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all"><MoreHorizontal size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 bottom-0 w-[450px] bg-[var(--bg-primary)] border-l border-[var(--glass-border)] shadow-2xl z-[101] flex flex-col p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><History size={20} /></div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-[var(--text-primary)] tracking-widest leading-none">Parameter History</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-tighter italic">{historyField}</p>
                  </div>
                </div>
                <button onClick={() => setHistoryField(null)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                {envHistory?.map((entry: any, i: number) => (
                  <div key={i} className="p-5 bg-[var(--panel-item-bg)] border border-[var(--glass-border)] rounded-xl relative group hover:border-blue-500/30 transition-all">
                    <div className="flex justify-between items-start mb-3">
                       <span className="text-[9px] font-black uppercase text-blue-400 tracking-[0.2em]">{entry.timestamp}</span>
                       <button onClick={() => { setLocalEnv({...localEnv, [historyField]: entry.old_value}); setHistoryField(null); toast.success("Staged for revert. Save to apply."); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black uppercase text-amber-500 hover:underline">Stage Revert</button>
                    </div>
                    <div className="space-y-3">
                       <div className="flex flex-col">
                            <span className="text-[7px] font-black uppercase text-rose-500/60 mb-1 ml-1">Previous</span>
                            <div className="p-3 bg-rose-500/5 rounded-lg border border-rose-500/10 text-[10px] font-mono text-rose-400/70 line-through truncate">{entry.old_value}</div>
                       </div>
                       <div className="flex flex-col">
                            <span className="text-[7px] font-black uppercase text-emerald-500/60 mb-1 ml-1">Changed To</span>
                            <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10 text-[10px] font-mono text-emerald-400 truncate">{entry.new_value}</div>
                       </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                       <div className="w-5 h-5 rounded-full bg-blue-600/20 flex items-center justify-center text-[9px] text-blue-400 font-black uppercase">{entry.user?.[0] || 'O'}</div>
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Action by: {entry.user || 'SYSTEM_OP'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sync Snapshot Slide-over */}
      <AnimatePresence>
        {showPoolHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPoolHistory(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 bottom-0 w-[500px] bg-[var(--bg-primary)] border-l border-[var(--glass-border)] shadow-2xl z-[101] flex flex-col p-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Clock size={20} /></div>
                        <div>
                            <h3 className="text-sm font-black uppercase text-[var(--text-primary)] tracking-widest leading-none">Sync Snapshots</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-tighter italic">Version-controlled user pool history</p>
                        </div>
                    </div>
                    <button onClick={() => setShowPoolHistory(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"><X size={20} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                    {poolVersions?.map((v: any, i: number) => (
                        <div key={i} className={`p-5 rounded-xl border transition-all relative group ${v.is_active ? 'bg-indigo-600/5 border-indigo-500/30' : 'bg-slate-800/20 border-white/5 hover:border-white/10'}`}>
                            {v.is_active && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">{v.version_label}</span>
                                    <span className="text-[8px] font-black text-slate-500 uppercase mt-1 italic">{new Date(v.created_at).toLocaleString()}</span>
                                </div>
                                {v.is_active ? (
                                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[8px] font-black uppercase tracking-widest">Active</span>
                                ) : (
                                    <button 
                                        onClick={() => toast.promise(apiFetch(`/api/v1/settings/user-pool/restore/${v.id}`, { method: 'POST' }), {
                                            loading: 'Restoring snapshot...',
                                            success: () => { queryClient.invalidateQueries({ queryKey: ['operators'] }); queryClient.invalidateQueries({ queryKey: ['user-pool-versions'] }); return "Restored successfully"; },
                                            error: "Restore failed"
                                        })}
                                        className="px-3 py-1 bg-white/5 hover:bg-white/10 text-amber-500 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                                    >
                                        <RotateCcw size={10} /> Restore
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-emerald-500">{v.diff_summary?.added || 0}</span>
                                    <span className="text-[6px] font-black uppercase text-emerald-500/60">Added</span>
                                </div>
                                <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-2 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-rose-500">{v.diff_summary?.removed || 0}</span>
                                    <span className="text-[6px] font-black uppercase text-rose-500/60">Removed</span>
                                </div>
                                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-amber-500">{v.diff_summary?.changed || 0}</span>
                                    <span className="text-[6px] font-black uppercase text-amber-500/60">Changed</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-slate-400 font-black uppercase">{v.created_by?.[0]}</div>
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{v.created_by}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setViewVersionScript(v.diff_summary?.script)}
                                        className="p-2 bg-slate-800/50 hover:bg-slate-700 text-amber-500 rounded-lg transition-all"
                                        title="View Script History"
                                    >
                                        <FileCode size={14} />
                                    </button>
                                    <button 
                                        onClick={() => setViewVersionData(v.snapshot_data)}
                                        className="text-blue-500 hover:text-blue-400 text-[8px] font-black uppercase tracking-widest flex items-center gap-1"
                                    >
                                        View Full Data <ChevronRight size={10} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Snapshot Data Modal */}
      <AnimatePresence>
        {viewVersionData && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewVersionData(null)} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200]" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[80vh] bg-[var(--panel-bg)] border border-[var(--glass-border)] rounded-3xl shadow-2xl z-[201] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-[var(--glass-border)] flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black uppercase text-[var(--text-primary)] tracking-widest italic">Snapshot Raw Data</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mt-1">Direct view of pulled user pool entities</p>
                    </div>
                    <button onClick={() => setViewVersionData(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar p-6">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/40">
                                {viewVersionData[0] && Object.keys(viewVersionData[0]).map(key => (
                                    <th key={key} className="p-4 text-[9px] font-black uppercase text-blue-400 tracking-widest border-b border-white/5">{key}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {viewVersionData.map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-white/5 border-b border-white/5">
                                    {Object.values(row).map((val: any, j: number) => (
                                        <td key={j} className="p-4 text-[10px] font-mono text-slate-300">
                                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Script History Modal */}
      <AnimatePresence>
        {viewVersionScript && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewVersionScript(null)} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200]" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] bg-[var(--panel-bg)] border border-[var(--glass-border)] rounded-3xl shadow-2xl z-[201] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-[var(--glass-border)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileCode className="text-amber-500" size={24} />
                        <div>
                            <h3 className="text-xl font-black uppercase text-[var(--text-primary)] tracking-widest italic">Historical Sync Logic</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mt-1">The script used for this specific version</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => { setUserPoolScript(viewVersionScript); setViewVersionScript(null); setShowPoolLogic(true); toast.success("Script restored to editor"); }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all"
                        >
                            Restore to Editor
                        </button>
                        <button onClick={() => setViewVersionScript(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
                    </div>
                </div>
                <div className="flex-1 p-6 bg-black/40">
                    <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap overflow-auto h-full custom-scrollbar">{viewVersionScript}</pre>
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
