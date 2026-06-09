import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Globe, Shield, Cpu, Sliders, Box, Network, Lock, Key, Activity, 
  Save, RefreshCcw, RefreshCw, Layout, Database, Palette, Bell, Server, Star,
  Sun, Moon, Check, Terminal, FolderTree, HardDrive, Link, Users, UserPlus, ShieldCheck, Fingerprint, X, ChevronRight, History as HistoryIcon, 
  Settings as SettingsIcon, Zap, AlertTriangle, Edit2, Edit2 as EditIcon, Clock, RotateCcw, ChevronDown, ChevronUp, FileCode, Search, Filter, ShieldAlert, MoreHorizontal, Eye, Plus, Trash2, Tag, Book, Microscope
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from 'react-hot-toast'
import { showWorkspaceToast } from './shared/WorkspaceToast'
import { apiFetch, setApiOverride, getApiBaseUrl } from "../api/apiClient"
import { formatAppDate, parseAppDate } from "../utils/dateUtils"
import { 
  PageHeader, 
  PageToolbar, 
  ToolbarGroup, 
  ToolbarSegmented,
  ToolbarButton,
  ToolbarIconButton
} from "./shared/LayoutPrimitives"
import { WorkspaceEmptyState } from "./shared/OperationalWorkspacePrimitives"
import { WorkspaceModal } from "./shared/WorkspaceModal"
import { WorkspaceHistoryShell } from "./shared/WorkspaceModalShells"

const normalizeTheme = (theme?: string | null) => {
  if (theme === 'dark') return 'nordic-frost-v1'
  if (theme === 'light') return 'pure-clarity'
  if (theme === 'pure-clarity' || theme === 'nordic-frost-v1') return theme
  return 'nordic-frost-v1'
}

const SettingField = ({ label, description, children, icon: Icon, onHistory, isEditable, onEdit, isPending, absPath, isModified, paramName }: any) => {
  return (
    <div className={`flex flex-col space-y-3 p-5 bg-[var(--panel-item-bg)] rounded-lg border transition-all group relative overflow-hidden ${isEditable ? 'border-blue-500/50 bg-blue-500/5' : 'border-[var(--glass-border)] hover:border-blue-500/30'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {Icon && <div className={`p-2.5 rounded-lg transition-transform group-hover:scale-110 ${isEditable ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-400'}`}><Icon size={16} /></div>}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] leading-none">{label}</label>
              {isModified ? (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[7px] font-black text-amber-500 uppercase animate-pulse">
                   Modified
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[7px] font-black text-emerald-500 uppercase">
                  Loaded
                </span>
              )}
            </div>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1 leading-relaxed">{description}</p>
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
              <HistoryIcon size={14} />
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

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
            {children}
        </div>
        {isModified && isEditable && (
            <motion.button 
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                onClick={() => onEdit('save')}
                className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95"
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

const ViewPermissionIcon = ({ level, onClick, isGlobalAdmin }: any) => {
    const colors = [
        "bg-slate-800 text-slate-500 border-slate-700/50",
        "bg-blue-500/10 text-blue-400 border-blue-500/20",
        "bg-amber-500/10 text-amber-400 border-amber-500/20",
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    ];
    
    let numericLevel = 0;
    if (typeof level === 'number') numericLevel = level;
    else if (level === 'read') numericLevel = 1;
    else if (level === 'add') numericLevel = 2;
    else if (level === 'edit' || level === 'manage') numericLevel = 3;
    
    numericLevel = Math.min(3, Math.max(0, Math.floor(numericLevel || 0)));
    const colorClass = colors[numericLevel];
    
    const labels = ["NONE", "READ", "WRITE", isGlobalAdmin ? "ADMIN" : "FULL"];
    const label = labels[numericLevel];

    return (
        <button 
            onClick={onClick}
            className={`px-2 py-1 rounded-lg border text-[9px] font-black tracking-widest transition-all hover:brightness-125 w-14 text-center ${colorClass}`}
            title={label}
        >
            {label}
        </button>
    )
}

const SameButtonConfirm = ({ onConfirm, icon: Icon, label, danger = false }: any) => {
    const [isConfirming, setIsConfirming] = useState(false)
    const [timer, setTimer] = useState<any>(null)

    const handleClick = (e: any) => {
        e.stopPropagation()
        if (isConfirming) {
            onConfirm()
            setIsConfirming(false)
            if (timer) clearTimeout(timer)
        } else {
            setIsConfirming(true)
            const t = setTimeout(() => setIsConfirming(false), 3000)
            setTimer(t)
        }
    }

    return (
        <button
            onClick={handleClick}
            className={`p-2 w-9 h-9 shrink-0 rounded-lg transition-all border flex items-center justify-center ${
                isConfirming
                    ? 'bg-rose-600 border-rose-500 text-white'
                    : danger
                        ? 'text-rose-500/50 hover:text-rose-400 hover:bg-rose-500/10 border-transparent hover:border-rose-500/20'
                        : 'text-slate-500 hover:text-white hover:bg-white/5 border-transparent'
            }`}
            title={isConfirming ? "Click again to confirm" : label}
        >
            <Icon size={16} className={isConfirming ? "animate-pulse" : ""} />
        </button>
    )
}

import { SettingsStandards } from "./SettingsStandards"

function PermissionHistoryModal({ versions, onClose }: { versions: any[], onClose: () => void }) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([0])
  const queryClient = useQueryClient()

  const toggleSelection = (idx: number) => {
    if (selectedIndices.includes(idx)) {
       if (selectedIndices.length > 1) {
          setSelectedIndices(selectedIndices.filter(i => i !== idx))
       }
    } else {
       if (selectedIndices.length === 2) {
          setSelectedIndices([selectedIndices[1], idx])
       } else {
          setSelectedIndices([...selectedIndices, idx].sort((a, b) => a - b))
       }
    }
  }

  const indexedVersions = (versions || []).map((v, i) => ({
    ...v,
    v_num: versions.length - i,
    label: formatAppDate(v.created_at)
  }))

  const newer = indexedVersions?.[Math.min(...selectedIndices)]
  const older = selectedIndices.length > 1 
    ? indexedVersions?.[Math.max(...selectedIndices)] 
    : (selectedIndices[0] + 1 < indexedVersions.length ? indexedVersions[selectedIndices[0] + 1] : null)

  const getDiff = (curr: any, prev: any) => {
    const diffs: Array<{field: string, old: any, new: any}> = []
    if (!curr) return diffs
    
    const summary = curr.diff_summary || {}
    if (summary.added) diffs.push({ field: 'Added Operators', old: '0 operators', new: `${summary.added} new operators` })
    if (summary.removed) diffs.push({ field: 'Removed Operators', old: `${summary.removed} active operators`, new: '0 operators (removed)' })
    if (summary.changed) diffs.push({ field: 'Changed Operators', old: 'Previous metadata', new: `${summary.changed} operators modified` })
    
    if (summary.team_updates?.length) {
      summary.team_updates.forEach((update: any) => {
        diffs.push({ 
          field: `Membership: ${update.username || update.external_id}`, 
          old: Array.isArray(update.old) ? update.old.join(', ') : (update.old || 'None'), 
          new: Array.isArray(update.new) ? update.new.join(', ') : (update.new || 'None')
        })
      })
    }

    if (summary.script) {
        diffs.push({ field: 'Logic Script', old: 'Previous version', new: 'Updated Python logic' })
    }
    
    return diffs
  }

  const diffs = getDiff(newer, older)

  return (
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="workspace"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized(!isMaximized)}
      title="Permission Registry History"
      subtitle="Complete temporal lineage of operator access and identity synchronization"
      icon={<HistoryIcon size={20} />}
      footerRight={
        <ToolbarButton onClick={onClose}>Dismiss</ToolbarButton>
      }
    >
      <WorkspaceHistoryShell
          header={null}
          sidebar={
           <div className="flex h-full flex-col min-h-0">
              <div className="mb-4 flex items-center justify-between px-1">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revision Timeline</h3>
                 <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">{indexedVersions.length} states</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {indexedVersions.map((h: any, idx: number) => {
                  const isSelected = selectedIndices.includes(idx);
                  const isNewest = idx === Math.min(...selectedIndices);
                  return (
                    <button 
                      key={h.id}
                      onClick={() => toggleSelection(idx)}
                      className={`w-full p-4 rounded-lg border text-left transition-all relative group overflow-hidden ${
                        isSelected 
                          ? isNewest ? 'bg-blue-600/20 border-blue-500/40 shadow-lg shadow-blue-500/5' : 'bg-slate-800 border-slate-600' 
                          : 'bg-white/5 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {isSelected && (
                        <div className={`absolute top-0 right-0 px-2 py-0.5 text-[8px] font-black uppercase rounded-lg ${isNewest ? 'bg-blue-400 text-blue-950' : 'bg-slate-500 text-slate-200'}`}>
                           {isNewest ? 'Primary' : 'Ref'}
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                         <span className={`text-[11px] font-black tracking-tighter ${isSelected ? 'text-white' : 'text-blue-400'}`}>v{h.v_num}</span>
                         <span className={`text-[9px] font-bold ${isSelected ? 'text-white/60' : 'text-slate-500'}`}>
                            {h.is_active ? 'Active' : 'Archived'}
                         </span>
                      </div>
                      <p className={`text-[10px] font-bold leading-tight line-clamp-2 ${isSelected ? 'text-white/90' : 'text-slate-300'}`}>
                         By: {h.created_by || 'System'}
                      </p>
                      <div className="mt-2 flex items-center space-x-2 justify-between">
                         <div className="flex items-center space-x-2">
                           <Clock size={10} className={isSelected ? 'text-white/40' : 'text-slate-600'} />
                           <span className={`text-[8px] font-semibold ${isSelected ? 'text-white/40' : 'text-slate-600'}`}>
                              {h.label}
                           </span>
                         </div>
                         {!h.is_active && (
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               toast.promise(apiFetch(`/api/v1/settings/user-pool/restore/${h.id}`, { method: 'POST' }), {
                                   loading: 'Restoring state...',
                                   success: () => { queryClient.invalidateQueries({ queryKey: ['operators'] }); queryClient.invalidateQueries({ queryKey: ['teams'] }); queryClient.invalidateQueries({ queryKey: ['user-pool-versions'] }); return "Restored successfully"; },
                                   error: "Restore failed"
                               })
                             }}
                             className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isSelected ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/40' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                           >
                             Restore
                           </button>
                         )}
                      </div>
                    </button>
                  )
                })}
              </div>
           </div>
          }
          content={
           <>
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-md sticky top-0 z-10">
                 <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                       <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[12px] font-black">v{newer?.v_num}</div>
                       <div className="w-4 h-px bg-slate-700" />
                       <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 text-[12px] font-black">{older ? `v${older.v_num}` : 'Ø'}</div>
                    </div>
                    <div>
                       <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Semantic Delta</h3>
                       <p className="text-[9px] font-bold text-slate-600">{diffs.length} modification vectors detected</p>
                    </div>
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                 {diffs.length > 0 ? (
                    <div className="space-y-6">
                       <div className="overflow-hidden rounded-lg border border-white/5 bg-black/20">
                          <table className="w-full text-left border-collapse">
                             <thead>
                                <tr className="bg-white/5 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                                   <th className="p-4 w-1/4">Property</th>
                                   <th className="p-4 w-3/8 text-rose-500/70">Previous (v{older?.v_num || 'Ø'})</th>
                                   <th className="p-4 w-3/8 text-emerald-500/70">Current (v{newer?.v_num})</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-white/5">
                                {diffs.map((d: any, i: number) => (
                                   <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                      <td className="p-4 align-top">
                                         <span className="text-[11px] font-bold text-slate-400">{d.field}</span>
                                      </td>
                                      <td className="p-4 align-top">
                                         <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3 overflow-hidden">
                                            <pre className="text-[10px] text-slate-500 line-through whitespace-pre-wrap font-mono leading-relaxed break-all">
                                               {typeof d.old === 'object' ? JSON.stringify(d.old, null, 2) : String(d.old || '(empty)')}
                                            </pre>
                                         </div>
                                      </td>
                                      <td className="p-4 align-top">
                                         <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 overflow-hidden">
                                            <pre className="text-[10px] text-emerald-400 whitespace-pre-wrap font-mono font-bold leading-relaxed break-all">
                                               {typeof d.new === 'object' ? JSON.stringify(d.new, null, 2) : String(d.new || '(empty)')}
                                            </pre>
                                         </div>
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 ) : (
                    <WorkspaceEmptyState icon={<HistoryIcon size={32} />} title="No Diff Data" description="Select two versions to compare or pick a version to see changes from its predecessor." />
                 )}
              </div>
           </>
          }
      />
    </WorkspaceModal>
  )
}

export default function SettingsPage() {
  const [topTab, setTopTab] = useState<'environments' | 'permissions' | 'groups' | 'system' | 'tenants' | 'standards'>('environments')
  
  // Use URL search params to set the initial tab if provided
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['environments', 'permissions', 'groups', 'system', 'tenants', 'standards'].includes(tab)) {
      setTopTab(tab as any);
    }
  }, []);

  const [showPoolLogic, setShowPoolLogic] = useState(false)
  const [isSyncEditable, setIsSyncEditable] = useState(false)
  const [historyField, setHistoryField] = useState<string | null>(null)
  const [showPermissionHistory, setShowPermissionHistory] = useState(false)
  const [viewVersionData, setViewVersionData] = useState<any>(null)
  const [viewVersionScript, setViewVersionScript] = useState<string | null>(null)
  const [editableFields, setEditableFields] = useState<Record<string, boolean>>({})
  const [emergencyUrl, setEmergencyUrl] = useState(getApiBaseUrl())
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false)
  const [newTenantName, setNewTenantName] = useState("")
  const [attachName, setAttachName] = useState("")
  const [attachPath, setAttachPath] = useState("")
  const [attachMode, setAttachMode] = useState<'path' | 'url'>('path')
  const [preflightResult, setPreflightResult] = useState<any>(null)
  const [storageRootEdit, setStorageRootEdit] = useState<string | null>(null)
  const [storageExplorerPath, setStorageExplorerPath] = useState<string | null>(null)
  const [operatorFilter, setOperatorFilter] = useState("")
  const [teamFilterOpen, setTeamFilterOpen] = useState(false)
  const [selectedTeamFilters, setSelectedTeamFilters] = useState<string[]>([])
  const [operatorSort, setOperatorSort] = useState<'name' | 'team' | 'admin'>('team')
  const [selectedOperatorIds, setSelectedOperatorIds] = useState<number[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [teamSearch, setTeamSearch] = useState("")
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamDescription, setNewTeamDescription] = useState("")
  const [teamEditName, setTeamEditName] = useState("")
  const [teamEditDescription, setTeamEditDescription] = useState("")
  const [teamMemberPick, setTeamMemberPick] = useState("")
  const [savedTeamFilters, setSavedTeamFilters] = useState<Array<{ id: string, label: string, teams: string[] }>>([])
  const [envSearch, setEnvSearch] = useState("")
  const [envImpactFilter, setEnvImpactFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL')
  
  const queryClient = useQueryClient()

  const preflightMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await apiFetch("/api/v1/tenants/admin/preflight", {
        method: "POST",
        body: JSON.stringify(attachMode === 'url' ? { db_url: target } : { db_path: target })
      })
      return res.json()
    },
    onSuccess: (data) => {
      setPreflightResult(data);
      if (data.is_valid) showWorkspaceToast("Preflight check passed");
      else showWorkspaceToast(`Preflight check failed: ${data.message}`, { type: 'error' });
    }
  })

  const attachMutation = useMutation({
    mutationFn: async (data: { name: string, db_path?: string, db_url?: string }) => {
      const res = await apiFetch("/api/v1/tenants/admin/attach", {
        method: "POST",
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['my-tenants'] })
      setAttachName("");
      setAttachPath("");
      setPreflightResult(null);
      showWorkspaceToast("Existing database attached to registry")
    }
  })
  
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

  const currentTheme = normalizeTheme(userSettings?.theme || localStorage.getItem('sysgrid-theme'));

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
    const normalizedTheme = normalizeTheme(themeId)
    localStorage.setItem('sysgrid-theme', normalizedTheme)
    document.documentElement.setAttribute('data-theme', normalizedTheme)
    const isLight = normalizedTheme === 'pure-clarity'
    if (isLight) document.documentElement.classList.remove('dark')
    else document.documentElement.classList.add('dark')
    
    userSettingsMutation.mutate({ theme: normalizedTheme })
    showWorkspaceToast(`Theme switched to ${normalizedTheme === 'nordic-frost-v1' ? 'Dark Mode' : 'Light Mode'}`)
  }

  const { data: envSettings, isLoading: isEnvLoading, isError: isEnvError } = useQuery({
    queryKey: ['env-settings'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/global")
      const data = await res.json()
      // Persist to local storage for bootstrap fallback
      Object.entries(data).forEach(([k, v]) => {
        localStorage.setItem(`SYSGRID_CONFIG_${k}`, String(v));
      });
      return data
    },
    retry: 1
  })

  const [localEnv, setLocalEnv] = useState<any>({})

  const isDisconnected = isEnvError && !isEnvLoading;

  const handleApplyOverride = () => {
    setApiOverride(emergencyUrl);
    queryClient.invalidateQueries();
    showWorkspaceToast("API Override applied. Attempting reconnection...");
  }

  const handleClearOverride = () => {
    setApiOverride(null);
    setEmergencyUrl(getApiBaseUrl());
    queryClient.invalidateQueries();
    showWorkspaceToast("API Override cleared. Resetting to defaults.");
  }

  const isDirty = (field?: string) => {
      if (!envSettings) return false;
      if (field) return String(localEnv[field]) !== String(envSettings[field]);
      return Object.keys(localEnv).some(k => String(localEnv[k]) !== String(envSettings[k]));
  }

  const getImpactTone = (impact?: string) => {
    switch (impact) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'MEDIUM':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }
  }

  const getPersistableEnvSettings = () =>
    Object.fromEntries(
      Object.entries(localEnv || {}).filter(([key]) => !key.startsWith('_'))
    )

  const [userPoolScript, setUserPoolScript] = useState(`import pandas as pd
import numpy as np

def get_user_pool():
    # Simulation of external HR/IAM user fetch
    data = {
        'id': range(1001, 1006),
        'username': ['admin_alpha', 'dev_beta', 'sec_gamma', 'op_delta', 'guest_epsilon'],
        'email': ['alpha@infra.local', 'beta@infra.local', 'gamma@infra.local', 'delta@infra.local', 'epsilon@infra.local'],
        'department': ['Infrastructure', 'Development', 'Security', 'Operations', 'External'],
        'team': ['Platform Ops', 'Application Engineering', 'Security Response', 'Platform Ops', None],
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
      const res = await apiFetch("/api/v1/settings/global", {
        method: "POST",
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data, variables) => {
      if (variables.VITE_API_BASE_URL) {
        setApiOverride(variables.VITE_API_BASE_URL);
        showWorkspaceToast("UI Gateway updated & persisted locally");
      }
      queryClient.invalidateQueries({ queryKey: ['env-settings'] })
      queryClient.invalidateQueries({ queryKey: ['env-history'] })
      setEditableFields({})
      showWorkspaceToast("Global Configuration synchronized to Database")
    }
  })

  const [syncPreviewData, setSyncPreviewData] = useState<any>(null)
  const [isSyncPreviewOpen, setIsSyncPreviewOpen] = useState(false)

  const poolMutation = useMutation({
    mutationFn: async ({ script, preview = false }: { script: string, preview?: boolean }) => {
      const res = await apiFetch("/api/v1/settings/user-pool/refresh", {
        method: "POST",
        body: JSON.stringify({ script, preview })
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data, variables) => {
      if (variables.preview) {
        setSyncPreviewData(data);
        setIsSyncPreviewOpen(true);
      } else {
        queryClient.invalidateQueries({ queryKey: ['operators'] })
        queryClient.invalidateQueries({ queryKey: ['user-pool-versions'] })
        setIsSyncEditable(false);
        setIsSyncPreviewOpen(false);
        setSyncPreviewData(null);
        showWorkspaceToast("User Pool synchronized via Python logic")
      }
    }
  })

  const { data: operators } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/operators")
      return res.json()
    }
  })

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/teams")
      return res.json()
    }
  })

  const { data: selectedTeamAudit } = useQuery({
    queryKey: ['team-audit', selectedTeamId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/settings/teams/${selectedTeamId}/audit`)
      return res.json()
    },
    enabled: !!selectedTeamId
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

  const { data: masterSettings } = useQuery({
    queryKey: ['master-settings'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/tenants/admin/settings")
      return res.json()
    },
    enabled: topTab === 'tenants'
  })

  const activeStorageRoot = storageRootEdit ?? masterSettings?.find((setting: any) => setting.key === 'tenant_storage_root')?.value ?? null

  useEffect(() => {
    if (topTab !== 'tenants') return
    if (!activeStorageRoot || storageExplorerPath) return
    setStorageExplorerPath(activeStorageRoot)
  }, [topTab, activeStorageRoot, storageExplorerPath])

  const { data: storageExplorer, isLoading: isStorageExplorerLoading } = useQuery({
    queryKey: ['tenant-storage-explorer', storageExplorerPath],
    queryFn: async () => {
      const query = storageExplorerPath ? `?path=${encodeURIComponent(storageExplorerPath)}` : ""
      const res = await apiFetch(`/api/v1/tenants/admin/storage-explorer${query}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    enabled: topTab === 'tenants' && !!storageExplorerPath
  })

  const backupTenantMutation = useMutation({
    mutationFn: async (tenantId: number) => {
      const res = await apiFetch(`/api/v1/tenants/admin/backup/${tenantId}`, { method: "POST" })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
      showWorkspaceToast("Database backup initiated and saved to storage")
    }
  })

  const { data: allTenants } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/tenants/admin/all")
      return res.json()
    },
    enabled: topTab === 'tenants'
  })

  const createTenantMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiFetch("/api/v1/tenants/admin/create", {
        method: "POST",
        body: JSON.stringify({ name })
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['my-tenants'] })
      setNewTenantName(""); // Clear input on success
      showWorkspaceToast("New tenant database created and initialized")
    }
  })

  const updateMasterSettingMutation = useMutation({
    mutationFn: async (setting: any) => {
      const res = await apiFetch("/api/v1/tenants/admin/settings", {
        method: "POST",
        body: JSON.stringify(setting)
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-settings'] })
      showWorkspaceToast("System setting updated")
    }
  })

  const envHelp: any = {
    API_ENDPOINT: { details: "Core service URL for backend connectivity.", impact: "HIGH" },
    DATABASE_URL: { details: "Primary storage location for the system database.", impact: "CRITICAL" },
    STORAGE_ROOT: { details: "Base directory for all persistent system data.", impact: "MEDIUM" },
    IMAGE_PATH: { details: "Sub-path for milestone captures and forensics.", impact: "LOW" },
    LOG_LEVEL: { details: "Verbosity of backend engine tracing.", impact: "LOW" },
    VITE_UI_TIMEOUT: { details: "Frontend API request timeout in milliseconds.", impact: "LOW" },
    VITE_UI_DEBUG_LOGGING: { details: "Enable detailed logging in the browser console.", impact: "LOW" },
    HOT_RELOAD_ENABLED: { details: "Toggle whether environment changes trigger immediate engine restart.", impact: "MEDIUM" },
    MAX_UPLOAD_SIZE: { details: "Maximum allowed file size for imports (MB).", impact: "MEDIUM" },
    WORKER_COUNT: { details: "Number of concurrent processing threads for the engine.", impact: "HIGH" },
    CACHE_TTL: { details: "Duration to keep volatile data in memory (seconds).", impact: "MEDIUM" },
    SMTP_HOST: { details: "Mail server for system-wide alerts.", impact: "LOW" },
    SMTP_PORT: { details: "Port used for SMTP communications.", impact: "LOW" },
    ALERT_EMAIL: { details: "Primary destination for critical alerts.", impact: "LOW" },
    ENABLE_AUDIT_LOGS: { details: "Toggle persistent recording of all operator actions.", impact: "MEDIUM" },
    DB_BACKUP_SCHEDULE: { details: "Crontab-style expression for automated backups.", impact: "HIGH" },
    TOKEN_ALGORITHM: { details: "Security algorithm for JWT signing.", impact: "CRITICAL" },
    REQUEST_TIMEOUT: { details: "Internal backend-to-backend request deadline.", impact: "MEDIUM" },
    VITE_API_BASE_URL: { details: "URL browser uses to talk to backend. If empty, defaults to origin proxy.", impact: "HIGH" },
    PORT: { details: "The primary port for the backend engine services.", impact: "HIGH" },
    VITE_APP_TITLE: { details: "Display name in browser tab and splash screen.", impact: "LOW" },
    VITE_POLLING_INTERVAL: { details: "Frequency of background dashboard synchronization (ms).", impact: "MEDIUM" },
    VITE_ENABLE_ANALYTICS: { details: "Toggle anonymized UI usage telemetry.", impact: "LOW" },
    VITE_MAX_GRID_ROWS: { details: "Pagination limit for high-density data grids.", impact: "MEDIUM" },
    VITE_THEME_DEFAULT: { details: "Default visual profile for new operator sessions.", impact: "LOW" },
    VITE_MAINTENANCE_MODE: { details: "Activate read-only mode for all operators.", impact: "HIGH" },
    VITE_SUPPORT_URL: { details: "Link to the operational support portal.", impact: "LOW" },
    VITE_AUTO_LOGOUT_IDLE: { details: "Seconds of inactivity before session termination.", impact: "MEDIUM" },
    VITE_TOAST_DURATION: { details: "Visibility duration for UI notifications (ms).", impact: "LOW" },
    VITE_ENABLE_WEBSOCKETS: { details: "Toggle real-time engine-to-ui updates.", impact: "HIGH" },
    VITE_BACKEND_PORT: { details: "The port used by the UI proxy to reach the engine.", impact: "HIGH" }
  }

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/user/profile");
      return res.json();
    }
  });

  const operatorMutation = useMutation({
    mutationFn: async (op: any) => {
      const isUpdate = !!op.id;
      const url = isUpdate ? `/api/v1/settings/operators/${op.id}` : "/api/v1/settings/operators";
      const res = await apiFetch(url, {
        method: isUpdate ? "PATCH" : "POST",
        body: JSON.stringify(op)
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      // If updating current user, refresh their profile to reflect permission changes immediately
      if (variables.username === userProfile?.username) {
        queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      }
      showWorkspaceToast("Security profile synchronized")
    }
  })

  const deleteOperatorMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/settings/operators/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] })
    }
  })

  const teamMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isUpdate = !!payload.id
      const url = isUpdate ? `/api/v1/settings/teams/${payload.id}` : "/api/v1/settings/teams"
      const res = await apiFetch(url, {
        method: isUpdate ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      if (team?.id) {
        queryClient.invalidateQueries({ queryKey: ['team-audit', team.id] })
        setSelectedTeamId(team.id)
      }
      setNewTeamName("")
      setNewTeamDescription("")
      showWorkspaceToast("Team registry synchronized")
    }
  })

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/settings/teams/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      setSelectedTeamId(null)
      showWorkspaceToast("Team removed")
    }
  })

  const bulkTeamMutation = useMutation({
    mutationFn: async ({ ids, teamId, teamName, teams, teamSource }: { ids: number[], teamId?: number | null, teamName?: string | null, teams?: string[], teamSource?: string }) => {
      const updates = ids.map(async (id) => {
        const res = await apiFetch(`/api/v1/settings/operators/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ 
            team_id: teamId ?? null, 
            team: teamName ?? null, 
            teams: teams || [],
            team_source: teamSource || (teamId ? 'manual_override' : 'manual') 
          })
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      return Promise.all(updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      if (selectedTeamId) queryClient.invalidateQueries({ queryKey: ['team-audit', selectedTeamId] })
      setSelectedOperatorIds([])
      setTeamMemberPick("")
    }
  })

  const [newOpId, setNewOpId] = useState("")

  const filteredTeams = (teams || []).filter((team: any) => {
    const query = teamSearch.trim().toLowerCase()
    if (!query) return true
    return [team.name, team.description, team.source]
      .filter(Boolean)
      .some((value: string) => value.toLowerCase().includes(query))
  })

  const filteredOperators = [...(operators || [])]
    .filter((op: any) => {
      const query = operatorFilter.trim().toLowerCase()
      const matchesQuery = !query || [
        op.full_name,
        op.username,
        op.external_id,
        op.department,
        op.team,
        op.email
      ]
        .filter(Boolean)
        .some((value: string) => value.toLowerCase().includes(query))
      const matchesTeam = selectedTeamFilters.length === 0 || selectedTeamFilters.includes(op.team || 'Unassigned')
      return matchesQuery && matchesTeam
    })
    .sort((a: any, b: any) => {
      if (operatorSort === 'admin') return Number(b.is_admin) - Number(a.is_admin) || (a.full_name || '').localeCompare(b.full_name || '')
      if (operatorSort === 'name') return (a.full_name || '').localeCompare(b.full_name || '')
      return (a.team || 'Unassigned').localeCompare(b.team || 'Unassigned') || (a.full_name || '').localeCompare(b.full_name || '')
    })

  const selectedTeam = (teams || []).find((team: any) => team.id === selectedTeamId) || null
  const selectedTeamMembers = (operators || []).filter((op: any) => op.team_id === selectedTeamId)
  const availableTeamCandidates = (operators || []).filter((op: any) => op.team_id !== selectedTeamId)
  const allTeamNames = Array.from(new Set((teams || []).map((team: any) => team.name))).sort() as string[]

  const handleAddOperator = () => {
    if (!newOpId) return;
    operatorMutation.mutate({ 
      external_id: newOpId, 
      username: newOpId.toLowerCase(), 
      full_name: newOpId,
      department: "Sector-01",
      registration_status: "Verified",
      is_admin: false,
      custom_permissions: {}
    });
    setNewOpId("");
  }

  const toggleOperatorSelection = (id: number) => {
    setSelectedOperatorIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }

  const toggleTeamFilter = (teamName: string) => {
    setSelectedTeamFilters((current) => current.includes(teamName) ? current.filter((value) => value !== teamName) : [...current, teamName])
  }

  const saveCurrentTeamFilter = () => {
    if (selectedTeamFilters.length === 0) {
      toast.error("Select at least one team filter before saving")
      return
    }
    const label = selectedTeamFilters.join(" + ")
    setSavedTeamFilters((current) => [...current, { id: `${Date.now()}`, label, teams: selectedTeamFilters }])
    showWorkspaceToast("Saved team filter preset")
  }

  const allViews = [
    "projects", "racks", "assets", "services", "external", "network", 
    "architecture", "research", "far", "monitoring", "vendors", 
    "knowledge", "logs", "settings"
  ];

  const envEntries = Object.entries(localEnv || {}).filter(([key]) => !key.startsWith('_'))
  const totalEnvParams = envEntries.length
  const dirtyEnvCount = envEntries.filter(([key]) => isDirty(key)).length
  const criticalEnvCount = envEntries.filter(([key]) => envHelp[key]?.impact === 'CRITICAL').length
  const filteredEnvEntries = envEntries.filter(([key, value]) => {
    const metadata = localEnv._metadata?.[key]
    const details = envHelp[key]
    const query = envSearch.trim().toLowerCase()
    const matchesQuery = !query || [
      key,
      value == null ? '' : String(value),
      metadata?.category,
      metadata?.file,
      metadata?.param,
      details?.details,
      details?.impact
    ]
      .filter(Boolean)
      .some((part) => String(part).toLowerCase().includes(query))

    const matchesImpact = envImpactFilter === 'ALL' || details?.impact === envImpactFilter
    return matchesQuery && matchesImpact
  })
  const visibleCategories = Array.from(
    new Set(filteredEnvEntries.map(([key]) => localEnv._metadata?.[key]?.category).filter(Boolean))
  )
  const onlineTenants = (allTenants || []).filter((tenant: any) => tenant.is_online).length
  const offlineTenants = Math.max((allTenants?.length || 0) - onlineTenants, 0)
  const hasTenantStorageRoot = !!masterSettings?.some((setting: any) => setting.key === 'tenant_storage_root')
  const themeOptions = [
    {
      id: 'pure-clarity',
      label: 'Light',
      helper: 'Readable operator mode',
      swatch: 'from-amber-100 via-white to-sky-100'
    },
    {
      id: 'nordic-frost-v1',
      label: 'Dark',
      helper: 'High-density analyst mode',
      swatch: 'from-slate-900 via-slate-800 to-cyan-900'
    }
  ]

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sysgrid-permission-team-filters-v1')
      if (raw) setSavedTeamFilters(JSON.parse(raw))
    } catch {
      setSavedTeamFilters([])
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('sysgrid-permission-team-filters-v1', JSON.stringify(savedTeamFilters))
  }, [savedTeamFilters])

  useEffect(() => {
    if (!selectedTeamId && teams?.length) {
      setSelectedTeamId(teams[0].id)
    }
  }, [teams, selectedTeamId])

  useEffect(() => {
    const team = (teams || []).find((entry: any) => entry.id === selectedTeamId)
    if (team) {
      setTeamEditName(team.name || "")
      setTeamEditDescription(team.description || "")
    }
  }, [teams, selectedTeamId])

  const getPermLevel = (op: any, view: string) => {
    const perms = { ...(op.role?.permissions || {}), ...(op.custom_permissions || {}) };
    const val = perms?.[view] ?? perms?.['all'] ?? 0;
    if (typeof val === 'number') return val;
    if (val === 'read') return 1;
    if (val === 'add') return 2;
    if (val === 'edit' || val === 'manage') return 3;
    return 0;
  }

  const togglePermission = (op: any, view: string) => {
    // Admin Lock-out Protection
    if (op.username === userProfile?.username && view === 'settings') {
        const current = getPermLevel(op, view);
        if (current === 3 && !confirm("WARNING: Reducing your own 'Settings' permission may lock you out of this console. Proceed?")) {
            return;
        }
    }

    const current = getPermLevel(op, view);
    const next = (current + 1) % 4;
    
    // Always persist as numeric for simplicity in this update
    const newPerms = { ...(op.custom_permissions || {}), [view]: next };
    operatorMutation.mutate({ ...op, custom_permissions: newPerms });
  }

  return (
    <div className="h-full flex flex-col space-y-4 w-full mx-auto px-4 overflow-hidden relative">
      <AnimatePresence>
        {isDisconnected && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="shrink-0 bg-rose-600/10 border border-rose-500/30 rounded-lg p-4 flex flex-col gap-3 backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-600 text-white rounded-lg animate-pulse"><ShieldAlert size={18} /></div>
                <div>
                  <h3 className="text-[11px] font-black uppercase text-rose-500 tracking-widest leading-none">Connectivity Failure</h3>
                  <p className="text-[9px] font-bold text-rose-400/70 uppercase mt-1 tracking-tighter">Backend engine unreachable via {getApiBaseUrl() || 'Relative Proxy'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEmergencyPanel(!showEmergencyPanel)}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 transition-all shadow-lg shadow-rose-500/20"
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
                    placeholder="e.g. http://10.0.0.1:8000"
                    className="w-full bg-black/40 border border-rose-500/30 rounded-lg pl-10 pr-4 py-2.5 text-[10px] font-mono text-rose-400 outline-none focus:border-rose-500"
                  />                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleApplyOverride}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all"
                  >
                    Apply Override
                  </button>
                  <button 
                    onClick={handleClearOverride}
                    className="px-6 py-2.5 bg-slate-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-600 transition-all"
                  >
                    Reset Defaults
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader 
        title="Settings" 
        subtitle="System Configuration & Golden Template"
        actions={
          <div className="flex items-center gap-2 pr-2">
            {topTab !== 'standards' && (
              <ToolbarButton
                  onClick={() => setTopTab('standards')}
                  variant="secondary"
                  className="bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20"
              >
                  <Layout size={14} className="mr-2 inline-block" />
                  <span>Golden Template</span>
              </ToolbarButton>
            )}
            {topTab === 'environments' && (
              <ToolbarButton
                  onClick={() => envMutation.mutate(getPersistableEnvSettings())}
                  variant="secondary"
                  className={isDirty() ? 'bg-amber-600/10 border-amber-500/30 text-amber-500 animate-pulse' : 'bg-emerald-600/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-600/20'}
              >
                  <Zap size={14} className={`mr-2 inline-block ${envMutation.isPending ? 'animate-pulse' : ''}`} />
                  <span>Force Hot Reload</span>
              </ToolbarButton>
            )}
          </div>
        }
      />

      <ToolbarSegmented 
        options={[
          { label: 'Parameters', value: 'environments' },
          { label: 'Permissions', value: 'permissions' },
          { label: 'Groups', value: 'groups' },
          { label: 'Analysis', value: 'system' },
          { label: 'Tenants', value: 'tenants' },
          { label: 'Standards', value: 'standards' }
        ]}
        value={topTab}
        onChange={(val: any) => setTopTab(val)}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
        <AnimatePresence mode="wait">
          {topTab === 'environments' && (
            <motion.div key="environments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 pt-2">
               <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-black uppercase tracking-tighter text-white italic">Parameter Configuration</h2>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/5 uppercase tracking-widest">
                       {filteredEnvEntries.length} Active Vectors
                    </span>
                  </div>
               </div>

               {/* Unified Parameter Toolbar */}
               <div className="flex items-center justify-between bg-black/40 p-4 rounded-lg border border-white/5 backdrop-blur-md">
                  <div className="flex gap-4 items-center flex-1 max-w-2xl">
                     <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input
                          value={envSearch}
                          onChange={(e) => setEnvSearch(e.target.value)}
                          placeholder="Search parameter, path, category, impact..."
                          className="w-full h-9 rounded-lg border border-white/10 bg-black/20 pl-10 pr-4 py-2 text-[11px] font-bold text-white outline-none transition-all focus:border-blue-500/50 shadow-inner placeholder:text-slate-600"
                        />
                     </div>
                     <div className="flex items-center gap-2 h-9 rounded-lg border border-white/10 bg-black/20 px-3">
                        <Filter size={14} className="text-slate-500" />
                        <select
                          value={envImpactFilter}
                          onChange={(e) => setEnvImpactFilter(e.target.value as any)}
                          className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-400 outline-none cursor-pointer focus:text-blue-400"
                        >
                          <option value="ALL">All Impact</option>
                          <option value="CRITICAL">Critical Only</option>
                          <option value="HIGH">High Impact</option>
                          <option value="MEDIUM">Medium Impact</option>
                          <option value="LOW">Low Impact</option>
                        </select>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <ToolbarButton 
                       onClick={() => setHistoryField('GLOBAL_CONFIG')}
                       icon={<HistoryIcon size={14} />}
                       className="h-9"
                     >
                       Global History
                     </ToolbarButton>
                     <div className="w-px h-4 bg-white/10 mx-2" />
                     <ToolbarButton
                        onClick={() => envMutation.mutate(getPersistableEnvSettings())}
                        variant={isDirty() ? "primary" : "secondary"}
                        disabled={!isDirty() && !envMutation.isPending}
                        icon={<Zap size={14} className={envMutation.isPending ? 'animate-pulse' : ''} />}
                        className="h-9"
                     >
                        {isDirty() ? 'Apply Changes' : 'Force Hot Reload'}
                     </ToolbarButton>
                  </div>
               </div>

               <div className="space-y-8">
                  {visibleCategories.map((cat: any) => (
                      <div key={cat} className="space-y-4">
                          <div className="flex items-center justify-between gap-4 px-1">
                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
                               {cat === 'Infrastructure' ? <Cpu size={12} /> : cat === 'UI' ? <Layout size={12} /> : <Box size={12} />} 
                               {cat} Domain
                            </h3>
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-600 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                              {filteredEnvEntries.filter(([key]) => localEnv._metadata?.[key]?.category === cat).length} parameters
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                              {filteredEnvEntries.filter(([key]) => localEnv._metadata?.[key]?.category === cat).map(([key, value]: any) => (
                                  <SettingField 
                                      key={key}
                                      icon={envHelp[key]?.details?.includes('URL') ? Link : envHelp[key]?.details?.includes('Path') ? FolderTree : Activity} 
                                      label={key.replace(/_/g, ' ')} 
                                      description={envHelp[key]?.details || "System level variable"} 
                                      onHistory={() => setHistoryField(key)}
                                      onEdit={(a: any) => toggleEdit(key, a)} isEditable={editableFields[key]}
                                      isModified={isDirty(key)} 
                                      absPath={localEnv._metadata?.[key]?.file}
                                      paramName={localEnv._metadata?.[key]?.param}
                                  >
                                      <div className="space-y-3">
                                        <div className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[7px] font-black uppercase tracking-widest ${getImpactTone(envHelp[key]?.impact)}`}>
                                          {envHelp[key]?.impact || 'LOW'} Impact
                                        </div>
                                        {typeof value === 'boolean' ? (
                                            <div className="flex items-center gap-4 py-1">
                                                <ToggleSwitch 
                                                    checked={!!value} disabled={!editableFields[key]}
                                                    onChange={(e: any) => setLocalEnv({...localEnv, [key]: e.target.checked})}
                                                    activeColor="bg-emerald-600"
                                                />
                                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{value ? 'Enabled' : 'Disabled'}</span>
                                            </div>
                                        ) : (
                                            <input 
                                                disabled={!editableFields[key]} value={value || ''} 
                                                onChange={e => setLocalEnv({...localEnv, [key]: e.target.value})} 
                                                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[11px] font-bold font-mono text-emerald-400 outline-none focus:border-blue-500/50 transition-all disabled:opacity-50 h-9" 
                                            />
                                        )}
                                      </div>
                                  </SettingField>
                              ))}
                          </div>
                      </div>
                  ))}
                  {visibleCategories.length === 0 && (
                    <div className="py-10">
                      <WorkspaceEmptyState 
                        icon={<Search size={32} />}
                        title="No Parameters Match"
                        message="Adjust the search or impact filter to expose additional configuration fields."
                      />
                    </div>
                  )}
               </div>
            </motion.div>
          )}

          {topTab === 'permissions' && (
            <motion.div key="permissions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 pt-2">
               <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-black uppercase tracking-tighter text-white italic">Permission Registry</h2>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-white/5 uppercase tracking-widest">
                       {filteredOperators?.length || 0} Registered Identities
                    </span>
                  </div>
               </div>

               {/* Identity Sync Pipeline - Collapsed by default */}
               <div className="rounded-lg border border-white/5 bg-black/20 overflow-hidden">
                  <button 
                    onClick={() => setShowPoolLogic(!showPoolLogic)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                       <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${showPoolLogic ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-slate-800 text-slate-500 border border-white/5'}`}>
                          <SettingsIcon size={18} className={showPoolLogic ? 'animate-pulse' : ''} />
                       </div>
                       <div className="text-left">
                          <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                             Identity Sync Pipeline
                             <div className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 text-[7px] font-black tracking-normal">PYTHON-DRIVEN</div>
                          </h3>
                          <p className="text-[9px] font-bold text-slate-500 mt-0.5">Automated synchronization of operators, departments, and teams from LDAP/AD providers</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="h-4 w-px bg-white/5" />
                       {showPoolLogic ? <ChevronUp size={16} className="text-slate-600" /> : <ChevronDown size={16} className="text-slate-600" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {showPoolLogic && (
                       <motion.div 
                         initial={{ height: 0, opacity: 0 }} 
                         animate={{ height: "auto", opacity: 1 }} 
                         exit={{ height: 0, opacity: 0 }}
                         className="overflow-hidden border-t border-white/5"
                       >
                          <div className="p-6 bg-slate-900/40 space-y-6">
                             <div className="flex items-start justify-between gap-6">
                                <div className="flex-1 space-y-4">
                                   <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                            <Terminal size={14} />
                                         </div>
                                         <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Synchronization Logic</h4>
                                      </div>
                                      <div className="flex items-center gap-2">
                                         <ToolbarButton 
                                            onClick={() => setIsSyncEditable(!isSyncEditable)}
                                            variant={isSyncEditable ? "danger" : "secondary"}
                                            icon={isSyncEditable ? <Lock size={12} /> : <EditIcon size={12} />}
                                            className="h-8"
                                         >
                                            {isSyncEditable ? "Lock Logic" : "Modify Logic"}
                                         </ToolbarButton>
                                         <ToolbarButton 
                                            onClick={() => poolMutation.mutate({ script: userPoolScript, preview: true })}
                                            variant="primary"
                                            icon={<RefreshCcw size={12} className={poolMutation.isPending ? 'animate-spin' : ''} />}
                                            className="h-8"
                                         >
                                            Dry Run Preview
                                         </ToolbarButton>
                                      </div>
                                   </div>
                                   <div className="relative group">
                                      <textarea 
                                        readOnly={!isSyncEditable}
                                        value={userPoolScript} 
                                        onChange={e => setUserPoolScript(e.target.value)}
                                        className={`w-full h-48 bg-black/60 border ${isSyncEditable ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.05)]' : 'border-white/5'} rounded-lg p-6 font-mono text-[11px] text-emerald-400 outline-none transition-all custom-scrollbar leading-relaxed`}
                                      />
                                      {!isSyncEditable && (
                                         <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <div className="bg-slate-900/90 border border-white/10 rounded-lg px-4 py-2 flex items-center gap-2 shadow-2xl">
                                               <Lock size={12} className="text-slate-500" />
                                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logic Encrypted/Locked</span>
                                            </div>
                                         </div>
                                      )}
                                   </div>
                                </div>

                                <div className="w-80 space-y-4">
                                   <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                                      <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                                         <Activity size={12} className="text-blue-400" />
                                         <p className="text-[10px] font-black uppercase text-white tracking-widest">Schema Requirements</p>
                                      </div>
                                      <p className="text-[9px] text-slate-400 font-bold leading-relaxed mb-4">
                                         Pipeline output must be a sequence of dictionaries containing exactly these mapped keys:
                                      </p>
                                      <div className="grid grid-cols-1 gap-2">
                                         {[
                                            { key: 'id', desc: 'Unique LDAP/External Key' },
                                            { key: 'username', desc: 'System Identity ID' },
                                            { key: 'full_name', desc: 'Natural Case Display Name' },
                                            { key: 'email', desc: 'Verified Contact Address' },
                                            { key: 'department', desc: 'LDAP Department Mapping' },
                                            { key: 'team', desc: 'LDAP Team Mapping' }
                                         ].map(f => (
                                            <div key={f.key} className="flex items-center justify-between p-2 bg-black/20 rounded-lg border border-white/5">
                                               <code className="text-[9px] font-black text-blue-400">.{f.key}</code>
                                               <span className="text-[8px] font-bold text-slate-500 uppercase">{f.desc}</span>
                                            </div>
                                         ))}
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </div>
                       </motion.div>
                    )}
                  </AnimatePresence>
               </div>

               {/* Registry Toolbar */}
               <div className="flex items-center justify-between bg-black/40 p-4 rounded-lg border border-white/5 backdrop-blur-md">
                  <div className="flex gap-4 items-center flex-1 max-w-xl">
                     <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input
                          value={operatorFilter}
                          onChange={e => setOperatorFilter(e.target.value)}
                          placeholder="Search identity, department, or team..."
                          className="w-full h-9 rounded-lg border border-white/10 bg-black/20 pl-10 pr-4 py-2 text-[11px] font-bold text-white outline-none transition-all focus:border-blue-500/50 shadow-inner placeholder:text-slate-600"
                        />
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <ToolbarButton 
                       onClick={() => setShowPermissionHistory(true)}
                       icon={<HistoryIcon size={14} />}
                       className="h-9"
                     >
                       Revision History
                     </ToolbarButton>
                     <div className="w-px h-4 bg-white/10 mx-2" />
                     <ToolbarButton 
                       onClick={() => bulkTeamMutation.mutate()}
                       disabled={selectedOperatorIds.length === 0}
                       variant="primary"
                       icon={<Users size={14} />}
                       className="h-9"
                     >
                       Assign Groups ({selectedOperatorIds.length})
                     </ToolbarButton>
                  </div>
               </div>

               <AnimatePresence>
                 {isSyncPreviewOpen && syncPreviewData && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
                        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 shadow-2xl overflow-hidden">
                            <div className="p-4 border-b border-indigo-500/20 bg-indigo-500/10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg"><RefreshCcw size={16} /></div>
                                    <div>
                                        <h3 className="text-[12px] font-black text-white tracking-widest">Sync Preview: {syncPreviewData.version_label}</h3>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-[8px] font-black uppercase text-emerald-500">+{syncPreviewData.summary.added} New</span>
                                            <span className="text-[8px] font-black uppercase text-amber-500">~{syncPreviewData.summary.changed} Changed</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <ToolbarButton 
                                        onClick={() => setIsSyncPreviewOpen(false)}
                                        className="h-8"
                                    >
                                        Abort
                                    </ToolbarButton>
                                    <ToolbarButton 
                                        onClick={() => poolMutation.mutate({ script: userPoolScript, preview: false })}
                                        variant="primary"
                                        className="h-8 shadow-lg shadow-indigo-500/20"
                                    >
                                        Confirm & Execute Sync
                                    </ToolbarButton>
                                </div>
                            </div>
                            <div className="max-h-[400px] overflow-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse text-[10px]">
                                    <thead>
                                        <tr className="bg-black/40">
                                            <th className="p-3 font-bold uppercase text-slate-500 tracking-widest border-b border-white/5">Identity</th>
                                            <th className="p-3 font-bold uppercase text-slate-500 tracking-widest border-b border-white/5">Username</th>
                                            <th className="p-3 font-bold uppercase text-slate-500 tracking-widest border-b border-white/5 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {syncPreviewData.preview.map((item: any, i: number) => (
                                            <tr key={i} className={`hover:bg-white/5 border-b border-white/5 transition-colors ${item.status === 'new' ? 'bg-emerald-500/5' : item.status === 'changed' ? 'bg-amber-500/5' : ''}`}>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[9px] ${item.status === 'new' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                                            {item.username?.slice(0,2).toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-white">{item.full_name}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3 font-mono text-blue-400">{item.username}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest ${
                                                        item.status === 'new' ? 'bg-emerald-500 text-white' : 
                                                        item.status === 'changed' ? 'bg-amber-500 text-black' : 
                                                        'bg-slate-700 text-slate-400'
                                                    }`}>
                                                        {item.status}
                                                    </span>
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

               <div className="rounded-lg border border-[var(--glass-border)] bg-black/20 shadow-2xl overflow-hidden backdrop-blur-sm">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5">
                          <th className="p-4 text-[10px] font-bold text-slate-500 border-b border-white/5 sticky left-0 bg-[#0c121e] z-10 min-w-[280px] uppercase tracking-widest">Identity</th>
                          <th className="p-4 text-[10px] font-bold text-slate-500 border-b border-white/5 min-w-[140px] uppercase tracking-widest">Department</th>
                          <th className="p-4 text-[10px] font-bold text-slate-500 border-b border-white/5 min-w-[140px] uppercase tracking-widest">Team</th>
                          <th className="p-4 text-[10px] font-bold text-slate-500 border-b border-white/5 min-w-[200px] uppercase tracking-widest">Group(s)</th>
                          <th className="p-4 text-[10px] font-bold text-slate-500 border-b border-white/5 text-center uppercase tracking-widest">Admin Status</th>
                          {allViews.map(view => (
                            <th key={view} className="p-2 text-[8px] font-bold text-slate-600 border-b border-white/5 text-center min-w-[60px] hover:text-blue-400 transition-colors uppercase tracking-tighter">
                              {view}
                            </th>
                          ))}
                          <th className="p-4 text-[10px] font-bold text-slate-500 border-b border-white/5 text-center uppercase tracking-widest">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOperators?.map((op: any) => {
                          const assignedGroups = teams?.filter((t: any) => (op.teams || []).includes(t.name)) || []
                          const firstName = assignedGroups[0]?.name || 'No Groups'
                          const remainingCount = assignedGroups.length > 1 ? assignedGroups.length - 1 : 0

                          return (
                          <tr key={op.id} className={`hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group ${op.username === userProfile?.username ? 'bg-blue-600/[0.03]' : ''}`}>
                            <td className="p-4 sticky left-0 bg-[#0c121e]/95 backdrop-blur-sm z-10 border-r border-white/5">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[11px] shadow-lg transition-all ${op.is_admin ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-slate-800 text-slate-400 border border-white/5'}`}>
                                  {op.username?.slice(0,2).toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <p className="text-[11px] font-bold text-white leading-none truncate flex items-center gap-1.5">
                                    {op.full_name}
                                    {op.username === userProfile?.username && <span className="text-[7px] bg-blue-500 text-white px-1.5 py-0.5 rounded-lg font-black uppercase tracking-normal">You</span>}
                                  </p>
                                  <p className="text-[8px] font-bold text-slate-500 mt-1 tracking-tighter truncate opacity-60">{op.username}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-[10px] font-bold text-slate-300">{op.department || '—'}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-[10px] font-bold text-slate-300">{op.team || '—'}</span>
                            </td>
                            <td className="p-4">
                               <div className="group/tooltip relative inline-block">
                                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/5 rounded-lg hover:border-white/10 transition-colors">
                                    <span className="text-[10px] font-bold text-slate-300">{firstName}</span>
                                    {remainingCount > 0 && (
                                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[8px] font-black text-blue-400">
                                        <Plus size={8} /> {remainingCount}
                                      </div>
                                    )}
                                  </div>
                                  {assignedGroups.length > 0 && (
                                    <div className="absolute top-full mt-2 left-0 p-3 bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-all z-[100] pointer-events-none min-w-[140px] scale-95 group-hover/tooltip:scale-100 origin-top-left backdrop-blur-xl">
                                      <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-1.5">
                                         <Users size={10} className="text-blue-400" />
                                         <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Active Membership</p>
                                      </div>
                                      <div className="space-y-1.5">
                                        {assignedGroups.map((g: any) => (
                                          <div key={g.id} className="flex items-center gap-2">
                                             <div className="w-1 h-1 rounded-full bg-blue-500" />
                                             <p className="text-[9px] font-bold text-slate-300 truncate">{g.name}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
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
                                  level={op.is_admin ? 3 : getPermLevel(op, view)}
                                  onClick={() => !op.is_admin && togglePermission(op, view)}
                                  isGlobalAdmin={op.is_admin}
                                />
                              </td>
                            ))}
                            <td className="p-4 text-center">
                              {op.username !== userProfile?.username ? (
                                <SameButtonConfirm 
                                  danger
                                  onConfirm={() => {
                                    const { id, ...backup } = op;
                                    deleteOperatorMutation.mutate(op.id);
                                    showWorkspaceToast(`Access revoked for ${op.full_name}`, { 
                                      onRevert: () => operatorMutation.mutate(backup) 
                                    });
                                  }}
                                  icon={Trash2}
                                  label="Revoke Access"
                                />
                              ) : (
                                <div className="p-2 text-slate-700 flex justify-center cursor-not-allowed" title="Protected Identity">
                                  <Lock size={16} />
                                </div>
                              )}
                            </td>
                          </tr>
                        )})}
                        {filteredOperators.length === 0 && (
                          <tr>
                            <td colSpan={allViews.length + 5} className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              No operators match the current filter
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>
            </motion.div>
          )}

          {topTab === 'tenants' && (
            <motion.div key="tenants" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 pt-2">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--panel-item-bg)] p-5 shadow-sm">
                    <div className="text-[8px] font-black uppercase tracking-[0.35em] text-emerald-400">Registered</div>
                    <div className="mt-3 text-3xl font-black text-[var(--text-primary)]">{allTenants?.length || 0}</div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Database Tenants</div>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-sm">
                    <div className="text-[8px] font-black uppercase tracking-[0.35em] text-emerald-400">Online</div>
                    <div className="mt-3 text-3xl font-black text-emerald-300">{onlineTenants}</div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200/70">Healthy Clusters</div>
                  </div>
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-5 shadow-sm">
                    <div className="text-[8px] font-black uppercase tracking-[0.35em] text-rose-400">Offline</div>
                    <div className="mt-3 text-3xl font-black text-rose-300">{offlineTenants}</div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-rose-200/70">Critical Errors</div>
                  </div>
                  <div className={`rounded-lg border p-5 shadow-sm ${hasTenantStorageRoot ? 'border-blue-500/20 bg-blue-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                    <div className={`text-[8px] font-black uppercase tracking-[0.35em] ${hasTenantStorageRoot ? 'text-blue-400' : 'text-amber-400'}`}>Storage Root</div>
                    <div className={`mt-3 text-3xl font-black ${hasTenantStorageRoot ? 'text-blue-300' : 'text-amber-300'}`}>{hasTenantStorageRoot ? 'Defined' : 'Missing'}</div>
                    <div className={`mt-1 text-[9px] font-bold uppercase tracking-[0.18em] ${hasTenantStorageRoot ? 'text-blue-200/70' : 'text-amber-200/70'}`}>Registry Path</div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <div className="lg:col-span-2 xl:col-span-3 space-y-4">
                     <div className="bg-[var(--panel-item-bg)] border border-[var(--glass-border)] rounded-lg overflow-hidden shadow-xl">
                        <div className="p-4 border-b border-[var(--glass-border)] bg-white/2 flex items-center justify-between">
                           <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                              <Database size={14} className="text-emerald-500" /> Infrastructure Registry
                           </h3>
                           <div className="flex items-center gap-2">
                              <button onClick={() => queryClient.invalidateQueries({ queryKey: ['tenants'] })} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 transition-all"><RefreshCw size={12} /></button>
                              <span className="text-[8px] font-black uppercase text-slate-600">Total Units: {allTenants?.length || 0}</span>
                           </div>
                        </div>
                        <div className="overflow-x-auto">
                           <table className="w-full text-left border-collapse">
                              <thead>
                                 <tr className="bg-black/20 text-[8px] font-black uppercase text-slate-500 tracking-widest">
                                    <th className="p-4 border-b border-white/5">Identity</th>
                                    <th className="p-4 border-b border-white/5">Resolved Target</th>
                                    <th className="p-4 border-b border-white/5">Recovery State</th>
                                    <th className="p-4 border-b border-white/5">Operational</th>
                                    <th className="p-4 border-b border-white/5 text-right">Maintenance</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {allTenants?.map((t: any) => (
                                    <tr key={t.id} className="hover:bg-white/[0.03] border-b border-white/5 last:border-0 transition-colors">
                                       <td className="p-4">
                                          <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                                <Database size={14} />
                                             </div>
                                             <span className="text-[11px] font-bold text-white tracking-tight">{t.name}</span>
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <div className="overflow-x-auto custom-scrollbar-mini max-w-[260px]">
                                             <code className="text-[9px] font-mono text-slate-500 bg-black/30 px-2 py-1 rounded-lg border border-white/5 whitespace-nowrap inline-block select-all">
                                                {t.db_url}
                                             </code>
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <div className="flex items-center gap-2">
                                             <Clock size={12} className="text-slate-600" />
                                             <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                                                {t.last_backup ? formatAppDate(t.last_backup) : 'NO BACKUP'}
                                             </span>
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.1em] ${t.is_online ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                             {t.is_online ? 'SYNCED' : 'OFFLINE'}
                                          </span>
                                       </td>
                                       <td className="p-4 text-right">
                                          <button 
                                             onClick={() => backupTenantMutation.mutate(t.id)}
                                             disabled={backupTenantMutation.isPending && backupTenantMutation.variables === t.id}
                                             className="px-3 py-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                                          >
                                             {backupTenantMutation.isPending && backupTenantMutation.variables === t.id ? 'Snapshotting...' : 'Snapshot'}
                                          </button>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="p-5 bg-blue-600/5 border border-blue-500/20 rounded-lg shadow-xl">
                        <div className="flex items-center gap-3 mb-5">
                           <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/20"><Plus size={16} /></div>
                           <div>
                              <h3 className="text-[12px] font-black uppercase text-white tracking-widest leading-none">Spawn Identity</h3>
                              <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Fresh Schema Generation</p>
                           </div>
                        </div>
                        <div className="space-y-3">
                           <input 
                              value={newTenantName} onChange={e => setNewTenantName(e.target.value)}
                              placeholder="CLUSTER_ID" 
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[11px] font-black uppercase text-blue-400 outline-none focus:border-blue-500"
                           />
                           <button 
                              onClick={() => { if (!newTenantName) return; createTenantMutation.mutate(newTenantName); }}
                              disabled={createTenantMutation.isPending || !newTenantName}
                              className="w-full py-3 bg-blue-600 text-white rounded-lg font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-500 transition-all disabled:opacity-50"
                           >
                              {createTenantMutation.isPending ? 'Provisioning...' : 'Provision Cluster'}
                           </button>
                        </div>
                     </div>

                     <div className="p-5 bg-emerald-600/5 border border-emerald-500/20 rounded-lg shadow-xl">
                        <div className="flex items-center gap-3 mb-5">
                           <div className="p-2 bg-emerald-600 rounded-lg text-white shadow-lg shadow-emerald-500/20"><Link size={16} /></div>
                           <div>
                              <h3 className="text-[12px] font-black uppercase text-white tracking-widest leading-none">Map External</h3>
                              <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Resolve Remote Database</p>
                           </div>
                        </div>
                        <div className="space-y-3">
                           <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-black/20 p-1">
                              <button onClick={() => { setAttachMode('path'); setAttachPath(""); setPreflightResult(null) }} className={`flex-1 rounded-lg px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${attachMode === 'path' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-white'}`}>FS PATH</button>
                              <button onClick={() => { setAttachMode('url'); setAttachPath(""); setPreflightResult(null) }} className={`flex-1 rounded-lg px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${attachMode === 'url' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-white'}`}>URI</button>
                           </div>
                           <input 
                              value={attachName} onChange={e => setAttachName(e.target.value)}
                              placeholder="ENTITY_LABEL" 
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[11px] font-black uppercase text-emerald-400 outline-none focus:border-emerald-500"
                           />
                           <div className="relative">
                              <input 
                                 value={attachPath} onChange={e => { setAttachPath(e.target.value); setPreflightResult(null); }}
                                 placeholder={attachMode === 'url' ? 'postgresql+asyncpg://...' : '/registry/db.sqlite'} 
                                 className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[9px] font-mono text-slate-400 outline-none focus:border-emerald-500"
                              />
                              <button onClick={() => preflightMutation.mutate(attachPath)} disabled={preflightMutation.isPending || !attachPath} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-emerald-500 transition-all disabled:opacity-30"><Microscope size={12} /></button>
                           </div>

                           <AnimatePresence>
                              {preflightResult && (
                                 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                                    <div className={`p-4 rounded-lg border ${preflightResult.is_valid ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} space-y-2`}>
                                       <div className="flex items-center justify-between">
                                          <span className={`text-[8px] font-black ${preflightResult.is_valid ? 'text-emerald-400' : 'text-rose-400'}`}>STATUS: {preflightResult.status}</span>
                                          <span className="text-[8px] font-black uppercase text-slate-600">SCHEMAS: {preflightResult.table_count}</span>
                                       </div>
                                       {preflightResult.is_valid && (
                                          <button onClick={() => attachMutation.mutate(attachMode === 'url' ? { name: attachName, db_url: attachPath } : { name: attachName, db_path: attachPath })} className="w-full py-2 bg-emerald-600 text-white rounded-lg font-black uppercase text-[8px] tracking-widest hover:bg-emerald-500 transition-all mt-1">MAP REGISTRY</button>
                                       )}
                                    </div>
                                 </motion.div>
                              )}
                           </AnimatePresence>
                        </div>
                     </div>

                     <div className="p-6 bg-[var(--panel-item-bg)] border border-[var(--glass-border)] rounded-lg">
                        <div className="flex items-center gap-3 mb-6">
                           <div className="p-2 bg-emerald-600/10 text-emerald-500 rounded-lg border border-emerald-500/20"><HardDrive size={18} /></div>
                           <div>
                              <h3 className="text-sm font-black uppercase text-white tracking-widest leading-none">Storage Config</h3>
                              <p className="text-[9px] font-black text-slate-500 uppercase mt-1">Persistent S3 Mount Root</p>
                           </div>
                        </div>
                        <div className="space-y-4">
                           {masterSettings?.filter((s: any) => s.key === 'tenant_storage_root').map((setting: any) => (
                              <div key={setting.key} className="space-y-2">
                                 <div className="flex justify-between">
                                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">{setting.key.replace(/_/g, ' ')}</label>
                                    <button 
                                       onClick={() => {
                                          if (storageRootEdit !== null) {
                                             updateMasterSettingMutation.mutate({ key: setting.key, value: storageRootEdit });
                                             setStorageRootEdit(null);
                                          } else {
                                             setStorageRootEdit(setting.value);
                                          }
                                       }}
                                       className="text-[8px] font-black uppercase text-blue-500 hover:underline"
                                    >
                                       {storageRootEdit !== null ? 'Save Path' : 'Change'}
                                    </button>
                                 </div>
                                 {storageRootEdit !== null ? (
                                    <input 
                                       value={storageRootEdit} onChange={e => setStorageRootEdit(e.target.value)}
                                       className="w-full bg-black/40 border border-blue-500/30 rounded-lg px-4 py-3 text-[10px] font-mono text-emerald-400 outline-none"
                                    />
                                 ) : (
                                    <div className="overflow-x-auto custom-scrollbar-mini">
                                       <div className="p-3 bg-black/30 border border-white/5 rounded-lg text-[10px] font-mono text-slate-400 whitespace-nowrap select-all">
                                          {setting.value}
                                       </div>
                                    </div>
                                 )}
                                 <p className="text-[8px] font-bold text-slate-600 uppercase leading-relaxed px-1">{setting.description}</p>
                              </div>
                           ))}
                           <div className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                 <div>
                                    <h4 className="text-[11px] font-black text-white tracking-tight">Accessible storage explorer</h4>
                                    <p className="mt-1 text-[10px] font-semibold text-slate-400 leading-relaxed">
                                       Browse folders the app runtime can currently reach, inspect read/write status, and pick a tenant storage root without guessing absolute paths.
                                    </p>
                                 </div>
                                 <button
                                    onClick={() => {
                                       if (activeStorageRoot) setStorageExplorerPath(activeStorageRoot)
                                    }}
                                    className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/10 transition-all"
                                 >
                                    Reset View
                                 </button>
                              </div>

                              <div className="space-y-2">
                                 <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Accessible locations</div>
                                 <div className="flex flex-wrap gap-2">
                                    {storageExplorer?.roots?.map((root: any) => (
                                       <button
                                          key={root.path}
                                          onClick={() => setStorageExplorerPath(root.path)}
                                          className={`px-3 py-2 rounded-lg border text-[9px] font-black transition-all ${
                                             storageExplorerPath === root.path
                                               ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                               : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                                          }`}
                                       >
                                          <div>{root.label}</div>
                                          <div className="mt-1 text-[8px] font-bold text-slate-500">{root.readable ? 'Read' : 'No read'} · {root.writable ? 'Write' : 'No write'}</div>
                                       </button>
                                    ))}
                                 </div>
                              </div>

                              <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4 space-y-4">
                                 <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                       <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Current location</div>
                                       <div className="mt-1 text-[10px] font-mono text-slate-200 break-all">{storageExplorer?.current_path || storageExplorerPath}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       {storageExplorer?.parent_path && (
                                          <button
                                             onClick={() => setStorageExplorerPath(storageExplorer.parent_path)}
                                             className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/10 transition-all"
                                          >
                                             Up
                                          </button>
                                       )}
                                       <button
                                          onClick={() => {
                                             const selectedPath = storageExplorer?.current_path || storageExplorerPath
                                             if (!selectedPath) return
                                             setStorageRootEdit(selectedPath)
                                          }}
                                          className="px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-[9px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-500/20 transition-all"
                                       >
                                          Use this folder
                                       </button>
                                    </div>
                                 </div>

                                 <div className="flex flex-wrap gap-2">
                                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${storageExplorer?.current_access?.readable ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'}`}>
                                       {storageExplorer?.current_access?.readable ? 'Readable' : 'Not readable'}
                                    </span>
                                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${storageExplorer?.current_access?.writable ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}`}>
                                       {storageExplorer?.current_access?.writable ? 'Writable' : 'Not writable'}
                                    </span>
                                 </div>

                                 <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                                    <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Runtime visibility</div>
                                    <div className="mt-2 space-y-1 text-[9px] font-mono text-slate-400">
                                       <div>Workspace: {storageExplorer?.runtime_context?.workspace_root || 'Unknown'}</div>
                                       <div>Configured root: {storageExplorer?.runtime_context?.tenant_storage_root || 'Unknown'}</div>
                                    </div>
                                 </div>

                                 <div className="space-y-2">
                                    <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Folders</div>
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                                       {isStorageExplorerLoading ? (
                                          <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-4 text-[9px] font-black text-slate-500">Loading folders...</div>
                                       ) : storageExplorer?.entries?.length ? (
                                          storageExplorer.entries.map((entry: any) => (
                                             <button
                                                key={entry.path}
                                                onClick={() => setStorageExplorerPath(entry.path)}
                                                className="w-full rounded-lg border border-white/5 bg-black/20 px-3 py-3 text-left hover:border-white/10 hover:bg-white/[0.03] transition-all"
                                             >
                                                <div className="flex items-center justify-between gap-3">
                                                   <div className="flex items-center gap-3 min-w-0">
                                                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                         <FolderTree size={14} />
                                                      </div>
                                                      <div className="min-w-0">
                                                         <div className="text-[10px] font-black text-slate-100 truncate">{entry.name}</div>
                                                         <div className="mt-1 text-[8px] font-mono text-slate-500 truncate">{entry.path}</div>
                                                      </div>
                                                   </div>
                                                   <div className="shrink-0 text-right">
                                                      <div className="text-[8px] font-black text-slate-400">{entry.readable ? 'Read' : 'No read'}</div>
                                                      <div className="mt-1 text-[8px] font-black text-slate-500">{entry.writable ? 'Write' : 'No write'}</div>
                                                   </div>
                                                </div>
                                             </button>
                                          ))
                                       ) : (
                                          <div className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-[9px] font-black text-slate-500">
                                             No subfolders visible from this location.
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {topTab === 'groups' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
              <div className="flex justify-between items-center mb-2">
                <div>
                   <h2 className="text-xl font-black uppercase tracking-tighter text-white italic">Group <span className="text-blue-500">Registry</span></h2>
                   <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mt-1">Entity relationship mapping & access containment</p>
                </div>
                <div className="flex gap-2">
                   <div className="flex items-center bg-black/20 border border-white/10 rounded-lg overflow-hidden h-10">
                       <input 
                         value={newTeamName}
                         onChange={e => setNewTeamName(e.target.value)}
                         placeholder="New Group Name..."
                         className="bg-transparent px-4 py-2 text-[11px] font-bold outline-none w-56 placeholder:text-slate-600 text-white h-full"
                         onKeyDown={e => e.key === 'Enter' && teamMutation.mutate({ name: newTeamName, source: 'manual' })}
                       />
                       <button 
                         onClick={() => teamMutation.mutate({ name: newTeamName, source: 'manual' })}
                         className="h-full px-5 bg-blue-600/10 border-l border-white/10 text-blue-400 hover:bg-blue-600/20 transition-all font-black text-[10px] tracking-widest uppercase"
                       >
                         Initialize
                       </button>
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                 {/* Group Navigation Sidebar */}
                 <div className="space-y-4">
                    <div className="px-1 flex items-center justify-between">
                       <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Available Vectors</p>
                       <span className="text-[8px] font-bold text-slate-600">{teams?.length || 0} Total</span>
                    </div>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                       {teams?.map((team: any) => (
                         <button
                           key={team.id}
                           onClick={() => setSelectedTeamId(team.id)}
                           className={`w-full p-4 rounded-lg border transition-all text-left flex justify-between items-center group relative overflow-hidden ${
                             selectedTeamId === team.id 
                               ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                               : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-white/5'
                           }`}
                         >
                           <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${selectedTeamId === team.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-500 border border-white/5'}`}>
                                 <Users size={16} />
                              </div>
                              <div>
                                 <p className={`text-[11px] font-bold tracking-tight ${selectedTeamId === team.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{team.name}</p>
                                 <p className="text-[8px] font-bold text-slate-600 mt-1 tracking-widest uppercase">{team.source || 'Manual'}</p>
                              </div>
                           </div>
                           <ChevronRight size={14} className={`transition-transform ${selectedTeamId === team.id ? 'text-blue-400 translate-x-1' : 'text-slate-800'}`} />
                         </button>
                       ))}
                    </div>
                 </div>

                 {/* Group Detail & User Management */}
                 <div className="lg:col-span-3">
                    <AnimatePresence mode="wait">
                       {selectedTeamId ? (
                         <motion.div key={selectedTeamId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="p-8 rounded-lg border border-white/5 bg-black/40 backdrop-blur-xl relative overflow-hidden shadow-2xl">
                               {/* Destructive Action */}
                               <div className="absolute top-4 right-4">
                                  <SameButtonConfirm 
                                    danger
                                    onConfirm={() => deleteTeamMutation.mutate(selectedTeamId)}
                                    icon={Trash2}
                                    label="Destroy Group"
                                  />
                               </div>

                               {/* Header Section */}
                               <div className="flex items-center gap-6 mb-8">
                                  <div className="p-5 bg-blue-600/10 rounded-xl text-blue-400 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]"><Users size={32} /></div>
                                  <div>
                                     <h3 className="text-2xl font-black tracking-tighter text-white italic leading-none">{teams?.find((t: any) => t.id === selectedTeamId)?.name}</h3>
                                     <div className="flex items-center gap-3 mt-3">
                                        <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[9px] font-black text-blue-400 uppercase tracking-widest">
                                           {operators?.filter((op: any) => (op.teams || []).includes(teams?.find((t: any) => t.id === selectedTeamId)?.name)).length} Active Members
                                        </div>
                                     </div>
                                  </div>
                               </div>

                               {/* Main Content Grid */}
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                                  {/* Membership Column */}
                                  <div className="space-y-4">
                                     <div className="flex justify-between items-center px-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                           <UserPlus size={14} className="text-blue-400" /> 
                                           Membership Registry
                                        </p>
                                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Toggle Access</span>
                                     </div>
                                     <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar p-1">
                                        {operators?.map((op: any) => {
                                          const teamName = teams?.find((t: any) => t.id === selectedTeamId)?.name
                                          const isMember = (op.teams || []).includes(teamName)
                                          return (
                                            <button
                                              key={op.id}
                                              onClick={() => {
                                                const currentTeams = op.teams || []
                                                let updatedTeams = [...currentTeams]
                                                if (isMember) {
                                                  updatedTeams = updatedTeams.filter((t: string) => t !== teamName)
                                                } else {
                                                  if (teamName && !updatedTeams.includes(teamName)) {
                                                    updatedTeams.push(teamName)
                                                  }
                                                }

                                                bulkTeamMutation.mutate({ 
                                                  ids: [op.id], 
                                                  teams: updatedTeams,
                                                  teamSource: 'manual_override'
                                                })
                                              }}
                                              className={`w-full p-3 rounded-lg border transition-all flex items-center justify-between group h-12 ${
                                                isMember 
                                                  ? 'bg-blue-600/10 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.05)]' 
                                                  : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-white/5'
                                              }`}
                                            >
                                              <div className="flex items-center gap-3">
                                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-all ${isMember ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-600 border border-white/5'}`}>
                                                    {op.username?.slice(0,2).toUpperCase()}
                                                 </div>
                                                 <div className="text-left">
                                                    <p className={`text-[10px] font-bold tracking-widest ${isMember ? 'text-emerald-400' : 'text-slate-400'}`}>{op.full_name}</p>
                                                    <p className="text-[7px] font-bold text-slate-600 mt-0.5">{op.username}</p>
                                                 </div>
                                              </div>
                                              {isMember ? <ShieldCheck size={14} className="text-emerald-500" /> : <Plus size={14} className="text-slate-700 group-hover:text-slate-500" />}
                                            </button>
                                          )
                                        })}
                                     </div>
                                  </div>

                                  <div className="space-y-4">
                                     <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><SettingsIcon size={14} className="text-blue-500" /> Group Configuration</p>
                                     </div>
                                     <div className="space-y-6">
                                        <div className="space-y-2">
                                           <label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Display Name</label>
                                           <input 
                                             value={teamEditName}
                                             onChange={e => setTeamEditName(e.target.value)}
                                             className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-[11px] font-bold uppercase text-white outline-none focus:border-blue-500/50"
                                           />
                                        </div>
                                        <div className="space-y-2">
                                           <label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Description / Metadata</label>
                                           <textarea 
                                             value={teamEditDescription}
                                             onChange={e => setTeamEditDescription(e.target.value)}
                                             className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-[11px] font-bold uppercase text-slate-400 outline-none focus:border-blue-500/50 h-24 custom-scrollbar"
                                           />
                                        </div>
                                        <button 
                                          onClick={() => teamMutation.mutate({ id: selectedTeamId, name: teamEditName, description: teamEditDescription })}
                                          className="w-full h-[38px] bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all active:scale-[0.98]"
                                        >
                                          Commit Changes
                                        </button>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         </motion.div>
                       ) : (
                         <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-lg bg-black/10">
                            <Users size={48} className="text-slate-800 mb-4" />
                            <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-slate-600">Select group to manage</p>
                         </div>
                       )}
                    </AnimatePresence>
                 </div>
              </div>
            </motion.div>
          )}

          {topTab === 'system' && (
             <motion.div key="system" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10 pt-4">
                <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--panel-item-bg)] p-6 shadow-2xl">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20"><Server size={18} /></div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-primary)]">Deployment Runtime</h3>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Resolved backend paths, defaults, and admin bootstrap policy</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(localEnv._deployment || {}).map(([key, value]: any) => (
                      <div key={key} className="rounded-lg border border-white/5 bg-black/20 p-4">
                        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">{key.replace(/_/g, ' ')}</div>
                        <div className="mt-2 text-[10px] font-mono text-blue-300 break-all">
                          {Array.isArray(value) ? value.join(", ") : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-[0.4em] flex items-center gap-2"><Server size={12} /> Backend .env Raw</h3>
                      <div className="bg-black/40 border border-white/5 rounded-lg overflow-hidden shadow-2xl">
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
                                              <div className="p-2 bg-black/20 rounded-lg border border-white/5 text-[9px] font-mono text-slate-300 break-all max-h-20 overflow-y-auto custom-scrollbar">
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
                      <div className="bg-black/40 border border-white/5 rounded-lg overflow-hidden shadow-2xl">
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
                                              <div className="p-2 bg-black/20 rounded-lg border border-white/5 text-[9px] font-mono text-slate-300 break-all max-h-20 overflow-y-auto custom-scrollbar">
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

          {topTab === 'standards' && (
            <SettingsStandards />
          )}
        </AnimatePresence>
      </div>

      {/* History Modal for Parameters */}
      {historyField && (
        <ConfigHistoryModal 
          field={historyField} 
          versions={envHistory || []} 
          onClose={() => setHistoryField(null)} 
          onRevert={(val: string) => {
            setLocalEnv({...localEnv, [historyField]: val});
            setHistoryField(null);
            showWorkspaceToast("Parameter staged for revert. Apply changes to persist.");
          }}
        />
      )}

      {/* Permission Registry History */}
      {showPermissionHistory && (
         <PermissionHistoryModal versions={poolVersions || []} onClose={() => setShowPermissionHistory(false)} />
      )}

      {/* Snapshot Data Modal */}
      <AnimatePresence>
        {viewVersionData && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewVersionData(null)} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200]" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[80vh] bg-[#0c121e] border border-white/10 rounded-lg shadow-2xl z-[201] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black uppercase text-white tracking-widest italic">Snapshot Trace</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Inspection of synchronized identity records</p>
                    </div>
                    <button onClick={() => setViewVersionData(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-black/20">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5">
                                {viewVersionData[0] && Object.keys(viewVersionData[0]).map(key => (
                                    <th key={key} className="p-4 text-[9px] font-black uppercase text-blue-400 tracking-widest border-b border-white/5">{key}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {viewVersionData.map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-white/5 border-b border-white/5 transition-colors">
                                    {Object.values(row).map((val: any, j: number) => (
                                        <td key={j} className="p-4 text-[10px] font-bold text-slate-300">
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] bg-[#0c121e] border border-white/10 rounded-lg shadow-2xl z-[201] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileCode className="text-amber-500" size={24} />
                        <div>
                            <h3 className="text-xl font-black uppercase text-white tracking-widest italic">Historical Logic</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Verification of previous pipeline instructions</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <ToolbarButton 
                            onClick={() => { setUserPoolScript(viewVersionScript); setViewVersionScript(null); setShowPoolLogic(true); showWorkspaceToast("Script restored to editor"); }}
                            variant="primary"
                            className="h-9"
                        >
                            Restore to Editor
                        </ToolbarButton>
                        <button onClick={() => setViewVersionScript(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all"><X size={20} /></button>
                    </div>
                </div>
                <div className="flex-1 p-6 bg-black/40 font-mono text-[11px] text-emerald-400 overflow-auto custom-scrollbar leading-relaxed">
                    {viewVersionScript}
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}

function ConfigHistoryModal({ field, versions, onClose, onRevert }: { field: string, versions: any[], onClose: () => void, onRevert: (val: string) => void }) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([0])

  const toggleSelection = (idx: number) => {
    if (selectedIndices.includes(idx)) {
       if (selectedIndices.length > 1) {
          setSelectedIndices(selectedIndices.filter(i => i !== idx))
       }
    } else {
       if (selectedIndices.length === 2) {
          setSelectedIndices([selectedIndices[1], idx])
       } else {
          setSelectedIndices([...selectedIndices, idx].sort((a, b) => a - b))
       }
    }
  }

  const indexedVersions = (versions || []).map((v, i) => ({
    ...v,
    v_num: versions.length - i,
    label: v.timestamp
  }))

  const newer = indexedVersions?.[Math.min(...selectedIndices)]
  const older = selectedIndices.length > 1 
    ? indexedVersions?.[Math.max(...selectedIndices)] 
    : (selectedIndices[0] + 1 < indexedVersions.length ? indexedVersions[selectedIndices[0] + 1] : null)

  return (
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="workspace"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized(!isMaximized)}
      title="Parameter Revision History"
      subtitle={`Auditing state vectors for ${field}`}
      icon={<HistoryIcon size={20} />}
      footerRight={
        <ToolbarButton onClick={onClose}>Dismiss</ToolbarButton>
      }
    >
      <WorkspaceHistoryShell
          header={null}
          sidebar={
           <div className="flex h-full flex-col min-h-0">
              <div className="mb-4 flex items-center justify-between px-1">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revision Timeline</h3>
                 <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">{indexedVersions.length} states</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {indexedVersions.map((h: any, idx: number) => {
                  const isSelected = selectedIndices.includes(idx);
                  return (
                    <button 
                      key={idx}
                      onClick={() => toggleSelection(idx)}
                      className={`w-full p-4 rounded-lg border text-left transition-all relative group overflow-hidden ${
                        isSelected 
                          ? 'bg-blue-600/20 border-blue-500/40 shadow-lg shadow-blue-500/5' 
                          : 'bg-white/5 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                         <span className={`text-[11px] font-black tracking-tighter ${isSelected ? 'text-white' : 'text-blue-400'}`}>v{h.v_num}</span>
                         <span className={`text-[8px] font-black uppercase ${isSelected ? 'text-blue-400' : 'text-slate-500'}`}>
                            {h.timestamp?.split(' ')[1]}
                         </span>
                      </div>
                      <p className={`text-[10px] font-bold leading-tight line-clamp-2 ${isSelected ? 'text-white/90' : 'text-slate-300'}`}>
                         By: {h.user || 'System'}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                         <div className="flex items-center gap-1.5">
                            <Clock size={10} className="text-slate-600" />
                            <span className="text-[8px] font-bold text-slate-600">{h.timestamp?.split(' ')[0]}</span>
                         </div>
                         <button 
                            onClick={(e) => { e.stopPropagation(); onRevert(h.new_value); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase text-amber-500 hover:text-amber-400"
                         >
                            Restore Vector
                         </button>
                      </div>
                    </button>
                  )
                })}
              </div>
           </div>
          }
          content={
           <>
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-md sticky top-0 z-10">
                 <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                       <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[12px] font-black">v{newer?.v_num}</div>
                       <div className="w-4 h-px bg-slate-700" />
                       <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 text-[12px] font-black">{older ? `v${older.v_num}` : 'Ø'}</div>
                    </div>
                    <div>
                       <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Semantic Delta</h3>
                       <p className="text-[9px] font-bold text-slate-600">Comparison of property states for {field}</p>
                    </div>
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="overflow-hidden rounded-lg border border-white/5 bg-black/20">
                  <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                            <th className="p-4 w-1/2 text-rose-500/70">Previous (v{older?.v_num || 'Ø'})</th>
                            <th className="p-4 w-1/2 text-emerald-500/70">Current (v{newer?.v_num})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr>
                            <td className="p-4 align-top">
                                <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-4">
                                  <pre className="text-[11px] text-slate-500 line-through whitespace-pre-wrap font-mono leading-relaxed break-all">
                                      {older ? String(older.new_value || '(empty)') : '(genesis)'}
                                  </pre>
                                </div>
                            </td>
                            <td className="p-4 align-top">
                                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4">
                                  <pre className="text-[11px] text-emerald-400 whitespace-pre-wrap font-mono font-bold leading-relaxed break-all">
                                      {newer ? String(newer.new_value || '(empty)') : '(empty)'}
                                  </pre>
                                </div>
                            </td>
                        </tr>
                      </tbody>
                  </table>
                </div>
              </div>
           </>
          }
      />
    </WorkspaceModal>
  )
}
