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
import { apiFetch, setApiOverride, getApiBaseUrl } from "../api/apiClient"

const SettingField = ({ label, description, children, icon: Icon, help, onHistory, isEditable, onEdit, isPending, absPath, isModified, paramName }: any) => {
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
      
      <div className="flex flex-col gap-1.5 px-0.5">
          {paramName && (
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-500/80 tracking-tighter">
                  <Terminal size={10} /> PARAM: {paramName}
              </div>
          )}
          {absPath && (
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                  <FolderTree size={10} /> FILE: {absPath}
              </div>
          )}
      </div>

      <AnimatePresence>
        {showHelp && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mb-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-2">
               <div className="flex justify-between items-center border-b border-blue-500/10 pb-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-400">
                    <Info size={10} /> INFO
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${help.impact === 'HIGH' || help.impact === 'CRITICAL' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    IMPACT: {help.impact}
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
  const [topTab, setTopTab] = useState<'environments' | 'management' | 'permissions' | 'system'>('environments')
  const [showPoolLogic, setShowPoolLogic] = useState(false)
  const [isSyncEditable, setIsSyncEditable] = useState(false)
  const [historyField, setHistoryField] = useState<string | null>(null)
  const [showPoolHistory, setShowPoolHistory] = useState(false)
  const [viewVersionData, setViewVersionData] = useState<any>(null)
  const [viewVersionScript, setViewVersionScript] = useState<string | null>(null)
  const [editableFields, setEditableFields] = useState<Record<string, boolean>>({})
  const [emergencyUrl, setEmergencyUrl] = useState(getApiBaseUrl())
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false)
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

  const { data: envSettings, isLoading: isEnvLoading, isError: isEnvError } = useQuery({
    queryKey: ['env-settings'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/env")
      const data = await res.json()
      // Persist successful fetch to local storage as fallback
      localStorage.setItem('SYSGRID_LAST_KNOWN_ENV', JSON.stringify(data))
      return data
    },
    retry: 1
  })

  const [localEnv, setLocalEnv] = useState<any>(() => {
    const fallback = localStorage.getItem('SYSGRID_LAST_KNOWN_ENV')
    return fallback ? JSON.parse(fallback) : {}
  })

  const isDisconnected = isEnvError && !isEnvLoading;

  const handleApplyOverride = () => {
    setApiOverride(emergencyUrl);
    queryClient.invalidateQueries();
    toast.success("API Override applied. Attempting reconnection...");
  }

  const handleClearOverride = () => {
    setApiOverride(null);
    setEmergencyUrl(getApiBaseUrl());
    queryClient.invalidateQueries();
    toast.success("API Override cleared. Resetting to defaults.");
  }

  const isDirty = (field?: string) => {
      // If disconnected, compare against the cached fallback we loaded into localEnv initially
      const base = envSettings || JSON.parse(localStorage.getItem('SYSGRID_LAST_KNOWN_ENV') || '{}');
      if (field) return JSON.stringify(localEnv[field]) !== JSON.stringify(base[field]);
      return Object.keys(localEnv).some(k => k !== '_abs_paths' && k !== '_metadata' && k !== '_raw_env' && JSON.stringify(localEnv[k]) !== JSON.stringify(base[k]));
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
        setApiOverride(variables.ui_backend_url);
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
    api_endpoint: { details: "Core service URL for backend connectivity.", impact: "HIGH" },
    db_path: { details: "Primary storage location for the system database.", impact: "CRITICAL" },
    storage_root: { details: "Base directory for all persistent system data.", impact: "MEDIUM" },
    image_path: { details: "Sub-path for milestone captures and forensics.", impact: "LOW" },
    log_level: { details: "Verbosity of backend engine tracing.", impact: "LOW" },
    ui_timeout: { details: "Frontend API request timeout in milliseconds.", impact: "LOW" },
    ui_debug_logging: { details: "Enable detailed logging in the browser console.", impact: "LOW" },
    hot_reload_enabled: { details: "Toggle whether environment changes trigger immediate engine restart.", impact: "MEDIUM" },
    // Backend Management
    max_upload_size: { details: "Maximum allowed file size for imports (MB).", impact: "MEDIUM" },
    worker_count: { details: "Number of concurrent processing threads for the engine.", impact: "HIGH" },
    cache_ttl: { details: "Duration to keep volatile data in memory (seconds).", impact: "MEDIUM" },
    smtp_host: { details: "Mail server for system-wide alerts.", impact: "LOW" },
    smtp_port: { details: "Port used for SMTP communications.", impact: "LOW" },
    alert_email: { details: "Primary destination for critical alerts.", impact: "LOW" },
    enable_audit_logs: { details: "Toggle persistent recording of all operator actions.", impact: "MEDIUM" },
    db_backup_schedule: { details: "Crontab-style expression for automated backups.", impact: "HIGH" },
    token_algorithm: { details: "Security algorithm for JWT signing.", impact: "CRITICAL" },
    request_timeout: { details: "Internal backend-to-backend request deadline.", impact: "MEDIUM" },
    ui_backend_url: { details: "URL browser uses to talk to backend. If empty, defaults to origin proxy.", impact: "HIGH" },
    backend_port: { details: "The primary port for the backend engine services.", impact: "HIGH" },
    // Frontend Management
    app_title: { details: "Display name in browser tab and splash screen.", impact: "LOW" },
    polling_interval: { details: "Frequency of background dashboard synchronization (ms).", impact: "MEDIUM" },
    enable_analytics: { details: "Toggle anonymized UI usage telemetry.", impact: "LOW" },
    max_grid_rows: { details: "Pagination limit for high-density data grids.", impact: "MEDIUM" },
    theme_default: { details: "Default visual profile for new operator sessions.", impact: "LOW" },
    maintenance_mode: { details: "Activate read-only mode for all operators.", impact: "HIGH" },
    support_url: { details: "Link to the operational support portal.", impact: "LOW" },
    auto_logout_idle: { details: "Seconds of inactivity before session termination.", impact: "MEDIUM" },
    toast_duration: { details: "Visibility duration for UI notifications (ms).", impact: "LOW" },
    enable_websockets: { details: "Toggle real-time engine-to-ui updates.", impact: "HIGH" },
    frontend_backend_port: { details: "The port used by the UI proxy to reach the engine.", impact: "HIGH" }
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
      <AnimatePresence>
        {isDisconnected && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="shrink-0 bg-rose-600/10 border border-rose-500/30 rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-600 text-white rounded-xl animate-pulse"><ShieldAlert size={18} /></div>
                <div>
                  <h3 className="text-[11px] font-black uppercase text-rose-500 tracking-widest leading-none">Connectivity Failure</h3>
                  <p className="text-[9px] font-bold text-rose-400/70 uppercase mt-1 tracking-tighter">Backend engine unreachable via {getApiBaseUrl() || 'Relative Proxy'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEmergencyPanel(!showEmergencyPanel)}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 transition-all shadow-lg shadow-rose-500/20"
              >
                {showEmergencyPanel ? 'Hide Rescue Tools' : 'Emergency Override'}
              </button>
            </div>

            {showEmergencyPanel && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 pt-2 border-t border-rose-500/20">
                <div className="flex-1 relative">
                  <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500/50" size={14} />
                  <input 
                    value={emergencyUrl} onChange={e => setEmergencyUrl(e.target.value)}
                    placeholder="e.g. http://localhost:8000"
                    className="w-full bg-black/40 border border-rose-500/30 rounded-xl pl-10 pr-4 py-2.5 text-[10px] font-mono text-rose-400 outline-none focus:border-rose-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleApplyOverride}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all"
                  >
                    Apply Override
                  </button>
                  <button 
                    onClick={handleClearOverride}
                    className="px-6 py-2.5 bg-slate-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-600 transition-all"
                  >
                    Reset Defaults
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between bg-[var(--bg-header)] p-1.5 rounded-xl border border-[var(--glass-border)] shadow-xl backdrop-blur-xl shrink-0">
        <div className="flex space-x-1">
           <button onClick={() => setTopTab('environments')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${topTab === 'environments' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              <Cpu size={14} /> Environments
           </button>
           <button onClick={() => setTopTab('management')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${topTab === 'management' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              <Sliders size={14} /> Management
           </button>
           <button onClick={() => setTopTab('permissions')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${topTab === 'permissions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              <Shield size={14} /> Permissions
           </button>
           <button onClick={() => setTopTab('system')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${topTab === 'system' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              <Terminal size={14} /> System
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
                            isModified={isDirty('api_endpoint')} 
                            absPath={localEnv._metadata?.api_endpoint?.file}
                            paramName={localEnv._metadata?.api_endpoint?.param}
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
                        isEditable={editableFields['ui_timeout']} isModified={isDirty('ui_timeout')} 
                        absPath={localEnv._metadata?.ui_timeout?.file}
                        paramName={localEnv._metadata?.ui_timeout?.param}
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
                        isEditable={editableFields['ui_backend_url']} isModified={isDirty('ui_backend_url')} 
                        absPath={localEnv._metadata?.ui_backend_url?.file}
                        paramName={localEnv._metadata?.ui_backend_url?.param}
                     >
                        <input 
                          disabled={!editableFields['ui_backend_url']} value={localEnv.ui_backend_url || ''} 
                          onChange={e => setLocalEnv({...localEnv, ui_backend_url: e.target.value})} 
                          className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-xs font-mono text-blue-400 outline-none focus:border-blue-500 transition-all disabled:opacity-50" 
                        />
                     </SettingField>
                     <SettingField 
                        icon={Cpu} label="Backend Port" description="The port the backend server listens on." 
                        help={{ details: "Primary TCP port for backend services.", impact: "High" }} onEdit={(a: any) => toggleEdit('backend_port', a)} onHistory={() => setHistoryField('backend_port')}
                        isEditable={editableFields['backend_port']} isModified={isDirty('backend_port')} 
                        absPath={localEnv._metadata?.backend_port?.file}
                        paramName={localEnv._metadata?.backend_port?.param}
                     >
                        <input 
                          type="number" disabled={!editableFields['backend_port']} value={localEnv.backend_port || 8000} 
                          onChange={e => setLocalEnv({...localEnv, backend_port: parseInt(e.target.value)})} 
                          className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-blue-500 transition-all disabled:opacity-50" 
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
                        onEdit={(a: any) => toggleEdit('db_path', a)} isEditable={editableFields['db_path']} isModified={isDirty('db_path')} 
                        absPath={localEnv._metadata?.db_path?.file}
                        paramName={localEnv._metadata?.db_path?.param}
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
                      isEditable={editableFields['storage_root']} isModified={isDirty('storage_root')} 
                      absPath={localEnv._metadata?.storage_root?.file}
                      paramName={localEnv._metadata?.storage_root?.param}
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
                      isEditable={editableFields['image_path']} isModified={isDirty('image_path')} 
                      absPath={localEnv._metadata?.image_path?.file}
                      paramName={localEnv._metadata?.image_path?.param}
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
                      isEditable={editableFields['hot_reload_enabled']} isModified={isDirty('hot_reload_enabled')} 
                      absPath={localEnv._metadata?.hot_reload_enabled?.file}
                      paramName={localEnv._metadata?.hot_reload_enabled?.param}
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
                      isEditable={editableFields['ui_debug_logging']} isModified={isDirty('ui_debug_logging')} 
                      absPath={localEnv._metadata?.ui_debug_logging?.file}
                      paramName={localEnv._metadata?.ui_debug_logging?.param}
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
                      isEditable={editableFields['log_level']} isModified={isDirty('log_level')} 
                      absPath={localEnv._metadata?.log_level?.file}
                      paramName={localEnv._metadata?.log_level?.param}
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
                      isEditable={editableFields['venv_path']} isModified={isDirty('venv_path')} 
                      absPath={localEnv._metadata?.venv_path?.file}
                      paramName={localEnv._metadata?.venv_path?.param}
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

          {topTab === 'management' && (
            <motion.div key="management" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                <div className="border-b border-[var(--glass-border)] pb-6">
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic text-[var(--text-primary)] leading-none">App Management</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-2">Extended Operational Parameters</p>
               </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-[0.4em] mb-4 border-l-2 border-amber-500 pl-4">Backend Operations</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <SettingField icon={Shield} label="Audit Logs" description="Toggle action tracing." help={envHelp.enable_audit_logs} onEdit={(a: any) => toggleEdit('enable_audit_logs', a)} isEditable={editableFields['enable_audit_logs']} isModified={isDirty('enable_audit_logs')} absPath={localEnv._metadata?.enable_audit_logs?.file} paramName={localEnv._metadata?.enable_audit_logs?.param}>
                            <ToggleSwitch checked={!!localEnv.enable_audit_logs} disabled={!editableFields['enable_audit_logs']} onChange={(e: any) => setLocalEnv({...localEnv, enable_audit_logs: e.target.checked})} />
                        </SettingField>
                        <SettingField icon={Cpu} label="Workers" description="Processing threads." help={envHelp.worker_count} onEdit={(a: any) => toggleEdit('worker_count', a)} isEditable={editableFields['worker_count']} isModified={isDirty('worker_count')} absPath={localEnv._metadata?.worker_count?.file} paramName={localEnv._metadata?.worker_count?.param}>
                            <input type="number" disabled={!editableFields['worker_count']} value={localEnv.worker_count || 4} onChange={e => setLocalEnv({...localEnv, worker_count: parseInt(e.target.value)})} className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-xs font-mono text-[var(--text-primary)] outline-none" />
                        </SettingField>
                    </div>
                    <SettingField icon={HardDrive} label="Max Upload Size" description="Import limit in Megabytes." help={envHelp.max_upload_size} onEdit={(a: any) => toggleEdit('max_upload_size', a)} isEditable={editableFields['max_upload_size']} isModified={isDirty('max_upload_size')} absPath={localEnv._metadata?.max_upload_size?.file} paramName={localEnv._metadata?.max_upload_size?.param}>
                        <div className="flex items-center gap-3">
                            <input type="number" disabled={!editableFields['max_upload_size']} value={localEnv.max_upload_size || 50} onChange={e => setLocalEnv({...localEnv, max_upload_size: parseInt(e.target.value)})} className="flex-1 bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-xs font-mono text-[var(--text-primary)] outline-none" />
                            <span className="text-[10px] font-black text-slate-500">MB</span>
                        </div>
                    </SettingField>
                    <SettingField icon={Lock} label="Token Algorithm" description="JWT signing method." help={envHelp.token_algorithm} onEdit={(a: any) => toggleEdit('token_algorithm', a)} isEditable={editableFields['token_algorithm']} isModified={isDirty('token_algorithm')} absPath={localEnv._metadata?.token_algorithm?.file} paramName={localEnv._metadata?.token_algorithm?.param}>
                        <input disabled={!editableFields['token_algorithm']} value={localEnv.token_algorithm || 'HS256'} onChange={e => setLocalEnv({...localEnv, token_algorithm: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-xs font-mono text-[var(--text-primary)] outline-none" />
                    </SettingField>
                    <div className="grid grid-cols-2 gap-4">
                        <SettingField icon={Server} label="SMTP Host" help={envHelp.smtp_host} onEdit={(a: any) => toggleEdit('smtp_host', a)} isEditable={editableFields['smtp_host']} isModified={isDirty('smtp_host')} absPath={localEnv._metadata?.smtp_host?.file} paramName={localEnv._metadata?.smtp_host?.param}>
                            <input disabled={!editableFields['smtp_host']} value={localEnv.smtp_host || 'localhost'} onChange={e => setLocalEnv({...localEnv, smtp_host: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-xs font-mono text-[var(--text-primary)] outline-none" />
                        </SettingField>
                        <SettingField icon={Activity} label="SMTP Port" help={envHelp.smtp_port} onEdit={(a: any) => toggleEdit('smtp_port', a)} isEditable={editableFields['smtp_port']} isModified={isDirty('smtp_port')} absPath={localEnv._metadata?.smtp_port?.file} paramName={localEnv._metadata?.smtp_port?.param}>
                            <input type="number" disabled={!editableFields['smtp_port']} value={localEnv.smtp_port || 1025} onChange={e => setLocalEnv({...localEnv, smtp_port: parseInt(e.target.value)})} className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-xs font-mono text-[var(--text-primary)] outline-none" />
                        </SettingField>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.4em] mb-4 border-l-2 border-indigo-500 pl-4">Frontend Orchestration</h3>
                    <SettingField icon={Layout} label="Application Title" description="Browser tab and splash name." help={envHelp.app_title} onEdit={(a: any) => toggleEdit('app_title', a)} isEditable={editableFields['app_title']} isModified={isDirty('app_title')} absPath={localEnv._metadata?.app_title?.file} paramName={localEnv._metadata?.app_title?.param}>
                        <input disabled={!editableFields['app_title']} value={localEnv.app_title || 'SYSGRID Tactical'} onChange={e => setLocalEnv({...localEnv, app_title: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-xs font-bold text-[var(--text-primary)] outline-none" />
                    </SettingField>
                    <SettingField icon={Link} label="Support URL" description="Operational support portal link." help={envHelp.support_url} onEdit={(a: any) => toggleEdit('support_url', a)} isEditable={editableFields['support_url']} isModified={isDirty('support_url')} absPath={localEnv._metadata?.support_url?.file} paramName={localEnv._metadata?.support_url?.param}>
                        <input disabled={!editableFields['support_url']} value={localEnv.support_url || ''} onChange={e => setLocalEnv({...localEnv, support_url: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-xs font-mono text-blue-400 outline-none" />
                    </SettingField>
                    <div className="grid grid-cols-2 gap-4">
                        <SettingField icon={RefreshCcw} label="Poll Interval" description="Sync frequency (ms)." help={envHelp.polling_interval} onEdit={(a: any) => toggleEdit('polling_interval', a)} isEditable={editableFields['polling_interval']} isModified={isDirty('polling_interval')} absPath={localEnv._metadata?.polling_interval?.file} paramName={localEnv._metadata?.polling_interval?.param}>
                            <input type="number" disabled={!editableFields['polling_interval']} value={localEnv.polling_interval || 5000} onChange={e => setLocalEnv({...localEnv, polling_interval: parseInt(e.target.value)})} className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-xs font-mono text-[var(--text-primary)] outline-none" />
                        </SettingField>
                        <SettingField icon={Cpu} label="Vite Proxy Port" description="Target engine port." help={envHelp.frontend_backend_port} onEdit={(a: any) => toggleEdit('frontend_backend_port', a)} isEditable={editableFields['frontend_backend_port']} isModified={isDirty('frontend_backend_port')} absPath={localEnv._metadata?.frontend_backend_port?.file} paramName={localEnv._metadata?.frontend_backend_port?.param}>
                            <input type="number" disabled={!editableFields['frontend_backend_port']} value={localEnv.frontend_backend_port || 8000} onChange={e => setLocalEnv({...localEnv, frontend_backend_port: parseInt(e.target.value)})} className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-xs font-mono text-[var(--text-primary)] outline-none" />
                        </SettingField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <SettingField icon={Zap} label="Websockets" description="Real-time updates." help={envHelp.enable_websockets} onEdit={(a: any) => toggleEdit('enable_websockets', a)} isEditable={editableFields['enable_websockets']} isModified={isDirty('enable_websockets')} absPath={localEnv._metadata?.enable_websockets?.file} paramName={localEnv._metadata?.enable_websockets?.param}>
                            <ToggleSwitch checked={!!localEnv.enable_websockets} disabled={!editableFields['enable_websockets']} onChange={(e: any) => setLocalEnv({...localEnv, enable_websockets: e.target.checked})} />
                        </SettingField>
                        <SettingField icon={ShieldAlert} label="Maintenance" description="Read-only mode." help={envHelp.maintenance_mode} onEdit={(a: any) => toggleEdit('maintenance_mode', a)} isEditable={editableFields['maintenance_mode']} isModified={isDirty('maintenance_mode')} absPath={localEnv._metadata?.maintenance_mode?.file} paramName={localEnv._metadata?.maintenance_mode?.param}>
                            <ToggleSwitch checked={!!localEnv.maintenance_mode} disabled={!editableFields['maintenance_mode']} onChange={(e: any) => setLocalEnv({...localEnv, maintenance_mode: e.target.checked})} activeColor="bg-rose-600" />
                        </SettingField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <SettingField icon={Clock} label="Idle Timeout" description="Seconds to logout." help={envHelp.auto_logout_idle} onEdit={(a: any) => toggleEdit('auto_logout_idle', a)} isEditable={editableFields['auto_logout_idle']} isModified={isDirty('auto_logout_idle')} absPath={localEnv._metadata?.auto_logout_idle?.file} paramName={localEnv._metadata?.auto_logout_idle?.param}>
                            <input type="number" disabled={!editableFields['auto_logout_idle']} value={localEnv.auto_logout_idle || 3600} onChange={e => setLocalEnv({...localEnv, auto_logout_idle: parseInt(e.target.value)})} className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-xs font-mono text-[var(--text-primary)] outline-none" />
                        </SettingField>
                        <SettingField icon={Bell} label="Toast Duration" description="Notice timing (ms)." help={envHelp.toast_duration} onEdit={(a: any) => toggleEdit('toast_duration', a)} isEditable={editableFields['toast_duration']} isModified={isDirty('toast_duration')} absPath={localEnv._metadata?.toast_duration?.file} paramName={localEnv._metadata?.toast_duration?.param}>
                            <input type="number" disabled={!editableFields['toast_duration']} value={localEnv.toast_duration || 3000} onChange={e => setLocalEnv({...localEnv, toast_duration: parseInt(e.target.value)})} className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-xs font-mono text-[var(--text-primary)] outline-none" />
                        </SettingField>
                    </div>
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

          {topTab === 'system' && (
             <motion.div key="system" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                <div className="border-b border-[var(--glass-border)] pb-6">
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic text-[var(--text-primary)] leading-none">System Inspect</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-2">Outer Join .env Analysis (Raw Variables)</p>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-[0.4em] flex items-center gap-2"><Server size={12} /> Backend .env Raw</h3>
                      <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                          <table className="w-full text-left border-collapse">
                              <thead>
                                  <tr className="bg-white/5">
                                      <th className="p-3 text-[8px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Parameter Name</th>
                                      <th className="p-3 text-[8px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Current Value</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {localEnv._raw_env?.backend && Object.entries(localEnv._raw_env.backend).map(([key, data]: any) => (
                                      <tr key={key} className="hover:bg-white/2 border-b border-white/5 last:border-0 group">
                                          <td className="p-3">
                                              <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-mono text-blue-400 font-bold">{key}</span>
                                                <span className="text-[6px] font-black text-slate-600 uppercase tracking-tighter truncate max-w-[150px]">{data.file}</span>
                                              </div>
                                          </td>
                                          <td className="p-3">
                                              <div className="p-2 bg-black/20 rounded border border-white/5 text-[9px] font-mono text-slate-300 break-all max-h-20 overflow-y-auto custom-scrollbar">
                                                {String(data.value)}
                                              </div>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.4em] flex items-center gap-2"><Layout size={12} /> Frontend .env Raw</h3>
                      <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                          <table className="w-full text-left border-collapse">
                              <thead>
                                  <tr className="bg-white/5">
                                      <th className="p-3 text-[8px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Parameter Name</th>
                                      <th className="p-3 text-[8px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">Current Value</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {localEnv._raw_env?.frontend && Object.entries(localEnv._raw_env.frontend).map(([key, data]: any) => (
                                      <tr key={key} className="hover:bg-white/2 border-b border-white/5 last:border-0 group">
                                          <td className="p-3">
                                              <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-mono text-indigo-400 font-bold">{key}</span>
                                                <span className="text-[6px] font-black text-slate-600 uppercase tracking-tighter truncate max-w-[150px]">{data.file}</span>
                                              </div>
                                          </td>
                                          <td className="p-3">
                                              <div className="p-2 bg-black/20 rounded border border-white/5 text-[9px] font-mono text-slate-300 break-all max-h-20 overflow-y-auto custom-scrollbar">
                                                {String(data.value)}
                                              </div>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
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
