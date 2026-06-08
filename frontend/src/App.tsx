import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from "react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { LayoutDashboard, Server, Network, Shield, Settings, Search, ServerCrash, Terminal, Layers, Menu, X, ChevronRight, Zap, Info, Star, AlertOctagon, RefreshCcw, Activity, Grid3X3, Clock, AlertTriangle, Upload, Workflow, Package, Globe, Target, BookOpen, FileText, Briefcase, Share2, Bug, Check, ShieldAlert } from "lucide-react"
import { Toaster, toast } from "react-hot-toast"
import { apiFetch, subscribeToLatency } from "./api/apiClient"
import { errorManager, useErrors } from "./stores/errorStore"
import { ErrorConsole } from "./components/shared/ErrorConsole"

import Dashboard from "./components/Dashboard"
import AssetGrid_Legacy from "./components/AssetGrid_Legacy"
import Assets from "./components/Assets"
import NetworkFabric from "./components/NetworkFabric"
import Intelligence from "./components/Intelligence"
import AuditLogs from "./components/AuditLogs"
import ServiceRegistry from "./components/ServiceRegistry"
import SettingsPage from "./components/Settings"
import Maintenance from "./components/Maintenance"
import MonitoringGrid from "./components/MonitoringGrid"
import Research from "./components/Research"
import Vendor from "./components/Vendor"
import Knowledge from "./components/Knowledge"
import FAR from "./components/FAR"
import DataFlowDesigner from "./components/DataFlowDesigner"
import Projects from "./components/Projects"
import External from "./components/External"
import Temp1 from "./components/Temp1"
import Racks from "./components/Racks"
import metadata from "./metadata.json"
import { ErrorDetailModal } from "./components/shared/ErrorDetailModal"

import { GlobalSearch } from "./components/shared/GlobalSearch"
import { TenantSelector } from "./components/shared/TenantSelector"
import { ShellHeader, ToolbarButton } from "./components/shared/LayoutPrimitives"

const APP_VERSION = metadata.version
const PATCH_HISTORY = metadata.patchHistory

const normalizeTheme = (theme?: string | null) => {
  if (theme === 'dark') return 'nordic-frost-v1'
  if (theme === 'light') return 'pure-clarity'
  if (theme === 'pure-clarity' || theme === 'nordic-frost-v1') return theme
  return 'nordic-frost-v1'
}

import { QueryCache, MutationCache } from "@tanstack/react-query"

import { showWorkspaceToast } from "./components/shared/WorkspaceToast"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error: any) => {
      // Avoid spamming error store if it's a connection error we're already retrying
      if (error.status === 0 || error.message === 'Failed to fetch') {
        console.warn("Connection lost, suppressing global error toast to prevent loop");
        return;
      }
      errorManager.addError({
        message: error.message || 'API Query Failure',
        stack: error.traceback || error.stack,
        status: error.status,
        data: error.data,
        type: 'BACKEND',
        severity: 'ERROR'
      });
      showWorkspaceToast(error.message || 'API Query Failure', { type: 'error' });
    }
  }),
  mutationCache: new MutationCache({
    onError: (error: any) => {
      errorManager.addError({
        message: error.message || 'API Mutation Failure',
        stack: error.traceback || error.stack,
        status: error.status,
        data: error.data,
        type: 'BACKEND',
        severity: 'ERROR'
      });
      showWorkspaceToast(error.message || 'API Mutation Failure', { type: 'error' });
    }
  })
})

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: any, showDetails: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null, showDetails: true }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, info: ErrorInfo) { console.error("CRASH:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full bg-[var(--bg-primary)] flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 bg-rose-500/10 rounded-lg flex items-center justify-center mb-6 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
            <AlertOctagon size={32} className="text-rose-500" />
          </div>
          
          <h1 className="text-4xl font-black uppercase text-[var(--text-primary)] tracking-tighter leading-none">Error</h1>
          <p className="text-slate-500 text-[10px] mt-4 uppercase font-black tracking-[0.2em] max-w-md leading-relaxed">
            The UI layer has encountered a fatal exception. Systems are running in degraded mode.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-lg">
             <button 
                onClick={() => {
                  // This is a placeholder for "Open Bug Console" - in this app, it means opening the error console
                  const event = new CustomEvent('open-error-console');
                  window.dispatchEvent(event);
                }} 
                className="px-6 py-4 rounded-lg border bg-white/5 border-white/10 text-slate-400 hover:border-white/20 transition-all flex flex-col items-center gap-2"
             >
                <Bug size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">Open Bug Console</span>
             </button>

             <button 
                onClick={() => window.location.reload()} 
                className="px-6 py-4 bg-blue-600 text-white rounded-lg border border-blue-500 shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex flex-col items-center gap-2"
             >
                <RefreshCcw size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">Refresh App</span>
             </button>
          </div>

          <div className="mt-8 w-full max-w-4xl overflow-hidden">
            <div className="p-8 bg-black/40 border border-rose-500/20 rounded-lg text-left shadow-2xl backdrop-blur-md">
               <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2 text-rose-500">
                     <Terminal size={14} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Traceback</span>
                  </div>
                  <span className="text-[8px] font-mono text-slate-600 uppercase">Segfault at UI_RENDER_LOOP</span>
               </div>
               <code className="text-[11px] text-rose-400/80 font-mono block whitespace-pre-wrap leading-relaxed max-h-[30vh] overflow-y-auto custom-scrollbar pr-4">
                  {String(this.state.error?.stack || this.state.error)}
               </code>
            </div>
          </div>

          <p className="mt-12 text-[8px] font-black text-slate-600 uppercase tracking-widest">
            If this persists, contact your Sector-01 Systems Administrator.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

const NavTab = ({ icon: Icon, label, path, active }: any) => (
  <Link to={path} className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all border-b-2 shrink-0 ${active ? "border-blue-500 text-blue-400 bg-blue-500/5" : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
    <Icon size={14} />
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </Link>
)

const getPermLevel = (perms: any, view: string) => {
  const val = perms?.[view] ?? perms?.['all'] ?? 0;
  if (typeof val === 'number') return val;
  if (val === 'read') return 1;
  if (val === 'add') return 2;
  if (val === 'edit' || val === 'manage') return 3;
  return 0;
};

const SidebarItem = ({ icon: Icon, label, path, active, isOpen, disabled, isSubItem }: any) => {
  const content = (
    <div className={`w-full flex items-center ${isSubItem ? 'px-3 py-2.5' : 'px-4 py-3.5'} rounded-lg transition-all duration-300 relative ${disabled ? "opacity-20 grayscale cursor-not-allowed" : active ? "bg-[#034EA2] text-white shadow-lg" : "hover:bg-white/5 text-slate-400"} ${!isOpen ? "justify-center" : "space-x-3"}`}>
      <Icon size={isSubItem ? 16 : 20} className={!isOpen && active ? "text-white" : ""} />
      {isOpen && <span className={`${isSubItem ? 'font-bold text-[11px]' : 'font-black text-[12px]'} uppercase tracking-wider`}>{label}</span>}
      {active && isOpen && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
      {active && !isOpen && <motion.div layoutId="active-pill-dot" className="absolute right-2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#3b82f6]" />}
    </div>
  );

  if (disabled) return content;
  return <Link to={path}>{content}</Link>;
}

const SidebarGroup = ({ label, children, isOpen, isSidebarOpen, defaultExpanded = true }: any) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  if (!isSidebarOpen) return <div className="py-2 border-b border-white/5 last:border-0">{children}</div>;

  return (
    <div className="mb-4">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-slate-500 hover:text-slate-300 transition-colors group"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
        <ChevronRight size={10} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-2 ml-4 border-l border-white/5 space-y-1 mt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ProtectedRoute = ({ children, view, userProfile }: any) => {
  const is_admin = userProfile?.is_admin;
  const permissions = userProfile?.permissions || {};
  const hasRead = is_admin || (getPermLevel(permissions, view) >= 1);

  if (userProfile && !hasRead) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-rose-500/10 rounded-lg flex items-center justify-center mb-8 border border-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.15)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <ShieldAlert size={40} className="text-rose-500 relative z-10" />
        </div>

        <h1 className="text-5xl font-black uppercase text-[var(--text-primary)] tracking-tighter leading-none mb-2">Access <span className="text-rose-500">Denied</span></h1>
        <p className="text-slate-500 text-[10px] mt-4 uppercase font-black tracking-[0.2em] max-w-md leading-relaxed border-t border-white/5 pt-6">
          Your current security clearance (ID: {userProfile.id}) does not permit viewing the <span className="text-blue-500 font-black">{view.toUpperCase()}</span> matrix.
        </p>

        <div className="flex flex-col items-center gap-6 mt-12">
           <Link 
              to="/" 
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
           >
              <LayoutDashboard size={16} /> Return to Neutral Zone
           </Link>
           <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
              Contact Sector-01 Systems Administrator for elevated privileges.
           </p>
        </div>
      </div>
    );
  }
  return children;
}
;

const PatchNotesModal = ({ onClose }: any) => {
  const [expandedIndex, setExpandedIndex] = useState(0)
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[600px] max-h-[80vh] overflow-hidden flex flex-col p-10 rounded-lg border-blue-500/30">
         <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <div className="flex items-center space-x-4">
               <Star size={24} className="text-blue-400 animate-pulse" />
               <h2 className="text-2xl font-black uppercase text-white">Registry Updates</h2>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
         </div>
         <div className="flex-1 overflow-y-auto custom-scrollbar mt-6 space-y-4">
            {PATCH_HISTORY.map((patch, idx) => (
              <div key={patch.version} className={`border border-white/5 rounded-lg overflow-hidden ${expandedIndex === idx ? "bg-white/5 border-blue-500/20" : "hover:bg-white/5"}`}>
                 <button onClick={() => setExpandedIndex(expandedIndex === idx ? -1 : idx)} className="w-full px-6 py-4 flex items-center justify-between text-left">
                    <div>
                       <span className={`text-[10px] font-black uppercase tracking-widest ${expandedIndex === idx ? "text-blue-400" : "text-slate-500"}`}>{patch.version}</span>
                       <p className="text-[8px] font-bold text-slate-600 uppercase mt-0.5">{patch.date}</p>
                    </div>
                    <ChevronRight size={16} className={`text-slate-500 transition-transform ${expandedIndex === idx ? "rotate-90" : ""}`} />
                 </button>
                 <AnimatePresence>
                    {expandedIndex === idx && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                         <div className="px-6 pb-6 pt-2 space-y-3">
                            {patch.changes.map((change, cIdx) => (
                              <div key={cIdx} className="flex space-x-3 text-[11px] font-bold uppercase tracking-tight">
                                 <span className={`text-[8px] px-1.5 py-0.5 rounded h-fit ${change.type === 'New' ? 'bg-emerald-500/20 text-emerald-400' : change.type === 'Fixed' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>{change.type}</span>
                                 <span className="text-slate-300 leading-tight">{change.text}</span>
                              </div>
                            ))}
                         </div>
                      </motion.div>
                    )}
                 </AnimatePresence>
              </div>
            ))}
         </div>
         <button onClick={onClose} className="w-full mt-8 py-4 bg-blue-600 text-white rounded-lg font-black uppercase shadow-lg shadow-blue-500/20">Close Inspection</button>
      </motion.div>
    </div>
  )
}

const LinuxEnvModal = ({ onClose }: any) => {
  const { data: envVars, isLoading } = useQuery({
    queryKey: ['linux-env-vars'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/user/env-vars");
      return res.json();
    }
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[700px] max-h-[80vh] flex flex-col p-10 rounded-lg border border-blue-500/30 overflow-hidden shadow-2xl">
         <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <div className="flex items-center space-x-4">
               <div className="p-3 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20"><Terminal size={24} /></div>
               <div>
                  <h2 className="text-2xl font-black uppercase text-white tracking-tighter leading-none">Local Environment <span className="text-blue-500">Forensics</span></h2>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mt-2">Active Operating System Parameters</p>
               </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"><X size={24}/></button>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar mt-6 space-y-4 pr-2">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center py-20 text-blue-400 space-y-4">
                  <RefreshCcw size={32} className="animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Hydrating Environment Matrix...</p>
               </div>
            ) : envVars ? (
               <div className="grid grid-cols-1 gap-2">
                  {Object.entries(envVars).map(([key, value]: [string, any]) => (
                     <div key={key} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-lg hover:border-blue-500/20 transition-all group">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider group-hover:text-blue-400 transition-colors">{key}</span>
                        <span className="text-[10px] font-mono text-slate-300 font-bold truncate max-w-[400px] bg-black/40 px-3 py-1 rounded-lg border border-white/5" title={String(value)}>{String(value)}</span>
                     </div>
                  ))}
               </div>
            ) : null}
         </div>
         
         <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-start gap-4">
            <Info size={18} className="text-amber-500 shrink-0" />
            <p className="text-[9px] font-bold text-amber-500/80 uppercase leading-relaxed tracking-tight">
               These variables are extracted directly from the underlying Linux OS execution context. They impact how the SysGrid Engine interacts with system binaries and file-system hooks.
            </p>
         </div>

         <button onClick={onClose} className="w-full mt-8 py-4 bg-blue-600 text-white rounded-lg font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Close Diagnostic View</button>
      </motion.div>
    </div>
  )
}

function MainLayout() {
  const location = useLocation(); 
  const navigate = useNavigate(); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [showPatchNotes, setShowPatchNotes] = useState(false);
  const [showLinuxEnv, setShowLinuxEnv] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(normalizeTheme(localStorage.getItem('sysgrid-theme')));
  const [latency, setLatency] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date, timeZone: string) => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/user/profile");
      const data = await res.json();
      if (data?.username) {
        localStorage.setItem('SYSGRID_USER_ID', data.username);
      }
      return data;
    }
  });

  const { data: userSettings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/user/settings");
      return res.json();
    }
  });

  useEffect(() => {
    if (userSettings?.theme) {
      const normalizedTheme = normalizeTheme(userSettings.theme);
      setCurrentTheme(normalizedTheme);
      document.documentElement.setAttribute('data-theme', normalizedTheme);
      const isLight = normalizedTheme === 'pure-clarity';
      if (isLight) document.documentElement.classList.remove('dark');
      else document.documentElement.classList.add('dark');
    }
  }, [userSettings]);

  useEffect(() => {
    return subscribeToLatency(setLatency);
  }, []);

  const THEMES = [
    { id: 'nordic-frost-v1', label: 'Dark Mode', color: 'bg-[#1a1b26]' },
    { id: 'pure-clarity', label: 'Light Mode', color: 'bg-[#ffffff]' }
  ]

  const changeTheme = (themeId: string) => {
    const normalizedTheme = normalizeTheme(themeId);
    setCurrentTheme(normalizedTheme);
    document.documentElement.setAttribute('data-theme', normalizedTheme);
    
    // Explicitly handle light/dark class for Tailwind and global styles
    const isLight = normalizedTheme === 'pure-clarity';
    if (isLight) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    
    localStorage.setItem('sysgrid-theme', normalizedTheme);
    toast.success(`Matrix UI: ${THEMES.find(t => t.id === normalizedTheme)?.label}`);
    
    // Attempt to sync with backend if possible
    apiFetch("/api/v1/settings/user/settings", {
      method: "PATCH",
      body: JSON.stringify({ theme: normalizedTheme })
    }).catch(() => {});
  }

  const { data: healthData, isError: isHealthError } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await apiFetch("/api/v1/health");
      return response.json();
    },
    refetchInterval: 10000,
    retry: 2,
    staleTime: 5000
  });

  const isOnline = !!healthData && !isHealthError;

  const { errors, setOpen: setErrorConsoleOpen } = useErrors();

  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      // If it's a backend error that already has traceback/status, it might have been caught by QueryCache already.
      // But we still want to log it if it wasn't caught elsewhere.
      if (error) {
        errorManager.addError({
          message: error.message || 'Unhandled Promise Rejection',
          stack: error.traceback || error.stack,
          status: error.status,
          data: error.data,
          type: error.status ? 'backend' : 'frontend',
          severity: 'error'
        });
        event.preventDefault();
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      errorManager.addError({
        message: event.message || 'Frontend Exception',
        stack: event.error?.stack,
        url: event.filename,
        type: 'frontend',
        severity: 'critical'
      });
    };

    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleWindowError);
    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Detect Ctrl+C or Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const activeElement = document.activeElement as HTMLElement;
        
        // Check if the focused element is an AgGrid cell
        if (activeElement && activeElement.classList.contains('ag-cell')) {
          // If there is no active text selection by the user, we copy the cell content
          const selection = window.getSelection();
          if (!selection || selection.toString() === '') {
            const textToCopy = activeElement.innerText;
            if (textToCopy) {
              navigator.clipboard.writeText(textToCopy).then(() => {
                toast.success("Cell content copied", { 
                  id: 'ag-grid-copy-toast', 
                  duration: 800,
                  style: {
                    background: '#1e293b',
                    color: '#3b82f6',
                    fontSize: '10px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }
                });
              }).catch(() => {});
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => { 
    document.documentElement.setAttribute('data-theme', currentTheme);
    const isLight = currentTheme === 'pure-clarity';
    if (isLight) document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
    apiFetch("/api/v1/settings/initialize").catch(() => {}) 
  }, [currentTheme])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <motion.aside animate={{ width: isSidebarOpen ? 240 : 80 }} className="glass-panel border-r border-[var(--glass-border)] flex flex-col z-20 shadow-2xl relative bg-[var(--sidebar-bg)]">
        <div className={`p-6 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity group">
             <div className="w-9 h-9 flex-shrink-0 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/5 transition-transform group-hover:scale-105 duration-300">
                <Grid3X3 size={20} className="text-white" />
             </div>
             {isSidebarOpen && <span className="font-black text-xl text-[var(--text-primary)] tracking-tighter uppercase">SYSGRID</span>}
          </Link>
          {isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-[var(--text-muted)]">
              <Menu size={18}/>
            </button>
          )}
        </div>
        {!isSidebarOpen && (
          <div className="flex justify-center pb-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-lg text-[var(--text-muted)]">
              <Menu size={18}/>
            </button>
          </div>
        )}
        <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar mt-4">
          <SidebarGroup label="OPERATIONS" isSidebarOpen={isSidebarOpen}>
            <SidebarItem icon={LayoutDashboard} label="Home" path="/" active={location.pathname === "/"} isOpen={isSidebarOpen} isSubItem />
            <SidebarItem icon={Briefcase} label="Projects" path="/projects" active={location.pathname === "/projects"} isOpen={isSidebarOpen} isSubItem disabled={userProfile && !userProfile.is_admin && getPermLevel(userProfile.permissions, "projects") < 1} />
            <SidebarItem icon={Activity} label="Monitoring" path="/monitoring" active={location.pathname === "/monitoring"} isOpen={isSidebarOpen} isSubItem disabled={userProfile && !userProfile.is_admin && getPermLevel(userProfile.permissions, "monitoring") < 1} />
          </SidebarGroup>

          <SidebarGroup label="INFRASTRUCTURE" isSidebarOpen={isSidebarOpen}>
            <SidebarItem icon={Server} label="Assets" path="/asset" active={location.pathname === "/asset"} isOpen={isSidebarOpen} isSubItem disabled={userProfile && !userProfile.is_admin && getPermLevel(userProfile.permissions, "assets") < 1} />
            <SidebarItem icon={Package} label="Racks" path="/racks" active={location.pathname === "/racks"} isOpen={isSidebarOpen} isSubItem disabled={userProfile && !userProfile.is_admin && getPermLevel(userProfile.permissions, "racks") < 1} />
            <SidebarItem icon={Layers} label="Services" path="/services" active={location.pathname === "/services"} isOpen={isSidebarOpen} isSubItem disabled={userProfile && !userProfile.is_admin && getPermLevel(userProfile.permissions, "services") < 1} />
            <SidebarItem icon={Share2} label="External" path="/external" active={location.pathname === "/external"} isOpen={isSidebarOpen} isSubItem disabled={userProfile && !userProfile.is_admin && getPermLevel(userProfile.permissions, "external") < 1} />
          </SidebarGroup>

          <SidebarGroup label="CONNECTIVITY" isSidebarOpen={isSidebarOpen}>
            <SidebarItem icon={Network} label="Network" path="/network" active={location.pathname === "/network"} isOpen={isSidebarOpen} isSubItem disabled={userProfile && !userProfile.is_admin && getPermLevel(userProfile.permissions, "network") < 1} />
            <SidebarItem icon={Workflow} label="Architecture" path="/architecture" active={location.pathname === "/architecture"} isOpen={isSidebarOpen} isSubItem disabled={userProfile && !userProfile.is_admin && getPermLevel(userProfile.permissions, "architecture") < 1} />
          </SidebarGroup>

          <SidebarGroup label="ANALYSIS" isSidebarOpen={isSidebarOpen}>
            <SidebarItem icon={AlertTriangle} label="FAR" path="/far" active={location.pathname === "/far"} isOpen={isSidebarOpen} isSubItem disabled={userProfile && !userProfile.is_admin && getPermLevel(userProfile.permissions, "far") < 1} />
            <SidebarItem icon={Search} label="Research" path="/research" active={location.pathname === "/research"} isOpen={isSidebarOpen} isSubItem disabled={userProfile && !userProfile.is_admin && getPermLevel(userProfile.permissions, "research") < 1} />
          </SidebarGroup>

          <SidebarGroup label="RESOURCES" isSidebarOpen={isSidebarOpen}>
            <SidebarItem icon={Globe} label="Vendors" path="/vendors" active={location.pathname === "/vendors"} isOpen={isSidebarOpen} isSubItem disabled={userProfile && !userProfile.is_admin && getPermLevel(userProfile.permissions, "vendors") < 1} />
            <SidebarItem icon={BookOpen} label="Knowledge" path="/knowledge" active={location.pathname === "/knowledge"} isOpen={isSidebarOpen} isSubItem disabled={userProfile && !userProfile.is_admin && getPermLevel(userProfile.permissions, "knowledge") < 1} />
          </SidebarGroup>
        </nav>
        
        {/* User Profile Section */}
        <div className={`p-4 border-t border-[var(--glass-border)] space-y-2 transition-all ${!isSidebarOpen ? 'flex flex-col items-center' : ''}`}>
           <button 
              onClick={() => setShowLinuxEnv(true)}
              className={`flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-blue-500/30 transition-all group ${!isSidebarOpen ? 'w-10 h-10 p-0 justify-center' : 'w-full text-left'}`}
           >
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                 <Globe size={16} />
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col min-w-0">
                   <span className="text-[10px] font-black uppercase text-[var(--text-primary)] truncate">{userProfile?.full_name || userProfile?.username || 'Operator'}</span>
                   <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-tighter truncate">ID: {userProfile?.id || userProfile?.username || '0000'}</span>
                </div>
              )}
           </button>

           {/* Direct Theme Toggles */}
           <div className={`flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/5 ${!isSidebarOpen ? 'flex-col' : 'w-full'}`}>
              {THEMES.map(theme => (
                <button 
                  key={theme.id}
                  onClick={() => changeTheme(theme.id)}
                  className={`flex-1 flex items-center gap-2 p-2 rounded-lg transition-all ${currentTheme === theme.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'} ${!isSidebarOpen ? 'w-full justify-center' : ''}`}
                  title={theme.label}
                >
                   <div className={`w-3 h-3 rounded-full ${theme.color} border border-white/10 shrink-0`} />
                   {isSidebarOpen && <span className="text-[9px] font-black uppercase tracking-widest">{theme.label.split(' ')[0]}</span>}
                </button>
              ))}
           </div>
        </div>

        <div className="p-4 border-t border-[var(--glass-border)] text-center opacity-30">
           {isSidebarOpen ? <p className="text-[8px] font-black uppercase tracking-[0.3em]">{APP_VERSION}</p> : <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto"/>}
        </div>
      </motion.aside>
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <ShellHeader
          left={
            <>
              <ToolbarButton onClick={() => setShowPatchNotes(true)}>Patch Notes</ToolbarButton>
              <button
                onClick={() => setIsSearchOpen(true)}
                className="group flex min-w-[320px] items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-4 py-2 text-slate-500 transition-all hover:border-blue-500/30 hover:text-white"
              >
                <Search size={16} className="transition-colors group-hover:text-blue-400" />
                <span className="flex-1 text-left text-[11px] font-bold tracking-tight">Search assets, projects, or incidents...</span>
                <div className="flex items-center gap-1 opacity-40 transition-opacity group-hover:opacity-100">
                  <span className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 text-[8px]">⌘</span>
                  <span className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 text-[8px]">K</span>
                </div>
              </button>
            </>
          }
          right={
            <>
              <TenantSelector />
              <div className="mr-4 flex flex-col items-end">
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">System Status</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-[11px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {isOnline ? 'Operational' : 'Degraded'}
                  </span>
                  {isOnline && <span className="text-[9px] font-bold tabular-nums text-slate-600">{latency}ms</span>}
                </div>
              </div>

              <button
                onClick={() => setErrorConsoleOpen(true)}
                className={`relative rounded-lg border p-2 transition-all ${errors.filter(e => !e.acknowledged).length > 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                <Bug size={18} />
                {errors.filter(e => !e.acknowledged).length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] rounded-full border-2 border-[var(--bg-header)] bg-rose-600 px-1.5 py-0.5 text-center text-[9px] font-black text-white">
                    {errors.filter(e => !e.acknowledged).length}
                  </span>
                )}
              </button>
              <Link to="/settings" className={`rounded-lg border p-2 transition-all ${location.pathname === '/settings' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                <Settings size={18} />
              </Link>
            </>
          }
        />

        <div className={`flex-1 overflow-hidden relative flex flex-col ${location.pathname === '/architecture' || location.pathname === '/logs' || location.pathname === '/projects' ? '' : 'p-8'}`}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard onNavigate={(p:any) => navigate("/" + p)} />} />
              <Route path="/projects" element={<ProtectedRoute view="projects" userProfile={userProfile}><Projects /></ProtectedRoute>} />
              <Route path="/racks" element={<ProtectedRoute view="racks" userProfile={userProfile}><Racks /></ProtectedRoute>} />
              <Route path="/asset" element={<ProtectedRoute view="assets" userProfile={userProfile}><Assets /></ProtectedRoute>} />
              <Route path="/services" element={<ProtectedRoute view="services" userProfile={userProfile}><ServiceRegistry /></ProtectedRoute>} />
              <Route path="/external" element={<ProtectedRoute view="external" userProfile={userProfile}><External /></ProtectedRoute>} />
              <Route path="/network" element={<ProtectedRoute view="network" userProfile={userProfile}><NetworkFabric /></ProtectedRoute>} />
              <Route path="/architecture" element={<ProtectedRoute view="architecture" userProfile={userProfile}><DataFlowDesigner /></ProtectedRoute>} />
              <Route path="/research" element={<ProtectedRoute view="research" userProfile={userProfile}><Research /></ProtectedRoute>} />
              <Route path="/far" element={<ProtectedRoute view="far" userProfile={userProfile}><FAR /></ProtectedRoute>} />
              <Route path="/monitoring" element={<ProtectedRoute view="monitoring" userProfile={userProfile}><MonitoringGrid /></ProtectedRoute>} />
              <Route path="/vendors" element={<ProtectedRoute view="vendors" userProfile={userProfile}><Vendor /></ProtectedRoute>} />
              <Route path="/knowledge" element={<ProtectedRoute view="knowledge" userProfile={userProfile}><Knowledge /></ProtectedRoute>} />
              <Route path="/logs" element={<ProtectedRoute view="logs" userProfile={userProfile}><AuditLogs /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute view="settings" userProfile={userProfile}><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>
        <footer className="h-8 border-t border-[var(--glass-border)] px-8 flex items-center justify-between text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-primary)]/20">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <Globe size={10} className="text-slate-500" />
                 <span>YOUR TIME ({Intl.DateTimeFormat().resolvedOptions().timeZone}): <span className="text-blue-400 tabular-nums">{formatTime(currentTime, Intl.DateTimeFormat().resolvedOptions().timeZone)}</span></span>
              </div>
              <div className="flex items-center gap-2 border-l border-white/5 pl-6">
                 <Clock size={10} className="text-slate-500" />
                 <span>SOUTH KOREA (KST): <span className="text-[var(--text-primary)] tabular-nums">{formatTime(currentTime, 'Asia/Seoul')}</span></span>
              </div>
           </div>
           <span className="text-blue-500">VERSION {APP_VERSION}</span>
        </footer>
      </main>
      <AnimatePresence>
        {showPatchNotes && <PatchNotesModal onClose={() => setShowPatchNotes(false)} />}
        {showLinuxEnv && <LinuxEnvModal onClose={() => setShowLinuxEnv(false)} />}
        {isSearchOpen && <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
        <ErrorConsole />
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </QueryClientProvider>

  )
}
