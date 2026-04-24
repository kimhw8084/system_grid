import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from "react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { LayoutDashboard, Server, Network, Shield, Settings, Search, ServerCrash, Terminal, Layers, Menu, X, ChevronRight, Zap, Info, Star, AlertOctagon, RefreshCcw, Activity, Grid3X3, Clock, AlertTriangle, Upload, Workflow, Package, Globe, Target, BookOpen, FileText, Briefcase, Share2, Bug } from "lucide-react"
import { Toaster, toast } from "react-hot-toast"
import { apiFetch, subscribeToLatency } from "./api/apiClient"
import { errorManager, useErrors } from "./stores/errorStore"
import { ErrorConsole } from "./components/shared/ErrorConsole"

import Dashboard from "./components/Dashboard"
import AssetGrid from "./components/AssetGrid"
import AssetTemp from "./components/AssetTemp"
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
import ExternalIntelligence from "./components/ExternalIntelligence"
import Projects from "./components/Projects"
import External from "./components/External"
import Temp1 from "./components/Temp1"
import RackTemp from "./components/RackTemp"
import metadata from "./metadata.json"
import { ErrorDetailModal } from "./components/shared/ErrorDetailModal"

const APP_VERSION = metadata.version
const PATCH_HISTORY = metadata.patchHistory
const queryClient = new QueryClient()

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: any, showDetails: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null, showDetails: false }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, info: ErrorInfo) { console.error("CRASH:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full bg-[var(--bg-primary)] flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mb-8 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
            <AlertOctagon size={40} className="text-rose-500 animate-pulse" />
          </div>
          
          <h1 className="text-4xl font-black uppercase text-[var(--text-primary)] tracking-tighter italic leading-none">Kernel Panic <span className="text-rose-500">Detected</span></h1>
          <p className="text-slate-500 text-[10px] mt-4 uppercase font-black tracking-[0.2em] max-w-md leading-relaxed">
            The UI layer has encountered a fatal exception. Systems are running in degraded mode.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-10 w-full max-w-lg">
             <button 
                onClick={() => this.setState({ showDetails: !this.state.showDetails })} 
                className={`px-6 py-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${this.state.showDetails ? 'bg-rose-500 text-white border-rose-400' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
             >
                <Terminal size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">{this.state.showDetails ? "Hide Kernel Dump" : "Inspect Dump"}</span>
             </button>

             <button 
                onClick={() => window.location.reload()} 
                className="px-6 py-4 bg-blue-600 text-white rounded-2xl border border-blue-500 shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex flex-col items-center gap-2"
             >
                <RefreshCcw size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">Re-Initialize Matrix</span>
             </button>
          </div>

          <AnimatePresence>
            {this.state.showDetails && (
              <motion.div 
                initial={{ height: 0, opacity: 0, y: 20 }} 
                animate={{ height: "auto", opacity: 1, y: 0 }} 
                exit={{ height: 0, opacity: 0, y: 20 }}
                className="mt-8 w-full max-w-4xl overflow-hidden"
              >
                <div className="p-8 bg-black/40 border border-rose-500/20 rounded-3xl text-left shadow-2xl backdrop-blur-md">
                   <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                      <div className="flex items-center gap-2 text-rose-500">
                         <Bug size={14} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Stack Trace Breakdown</span>
                      </div>
                      <span className="text-[8px] font-mono text-slate-600 uppercase">Segfault at UI_RENDER_LOOP</span>
                   </div>
                   <code className="text-[11px] text-rose-400/80 font-mono block whitespace-pre-wrap leading-relaxed max-h-[30vh] overflow-y-auto custom-scrollbar pr-4">
                      {String(this.state.error.stack || this.state.error)}
                   </code>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

const SidebarItem = ({ icon: Icon, label, path, active, isOpen }: any) => (
  <Link to={path} className={`w-full flex items-center px-4 py-3 rounded-2xl transition-all duration-300 relative ${active ? "bg-[#034EA2] text-white shadow-lg" : "hover:bg-white/5 text-slate-400"} ${!isOpen ? "justify-center" : "space-x-3"}`}>
    <Icon size={18} className={!isOpen && active ? "text-white" : ""} />
    {isOpen && <span className="font-bold text-[11px] uppercase tracking-wider">{label}</span>}
    {active && isOpen && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
    {active && !isOpen && <motion.div layoutId="active-pill-dot" className="absolute right-2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#3b82f6]" />}
  </Link>
)

const PatchNotesModal = ({ onClose }: any) => {
  const [expandedIndex, setExpandedIndex] = useState(0)
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[600px] max-h-[80vh] overflow-hidden flex flex-col p-10 rounded-2xl border-blue-500/30">
         <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <div className="flex items-center space-x-4">
               <Star size={24} className="text-blue-400 animate-pulse" />
               <h2 className="text-2xl font-black uppercase text-white">Registry Updates</h2>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
         </div>
         <div className="flex-1 overflow-y-auto custom-scrollbar mt-6 space-y-4">
            {PATCH_HISTORY.map((patch, idx) => (
              <div key={patch.version} className={`border border-white/5 rounded-2xl overflow-hidden ${expandedIndex === idx ? "bg-white/5 border-blue-500/20" : "hover:bg-white/5"}`}>
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
                                 <span className={`text-[8px] px-1.5 py-0.5 rounded h-fit ${change.type === 'NEW' ? 'bg-emerald-500/20 text-emerald-400' : change.type === 'FIXED' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>{change.type}</span>
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
         <button onClick={onClose} className="w-full mt-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-lg shadow-blue-500/20">Close Inspection</button>
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
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[700px] max-h-[80vh] flex flex-col p-10 rounded-3xl border border-blue-500/30 overflow-hidden shadow-2xl">
         <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <div className="flex items-center space-x-4">
               <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20"><Terminal size={24} /></div>
               <div>
                  <h2 className="text-2xl font-black uppercase text-white italic tracking-tighter leading-none">Local Environment <span className="text-blue-500">Forensics</span></h2>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mt-2">Active Operating System Parameters</p>
               </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl"><X size={24}/></button>
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
                     <div key={key} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:border-blue-500/20 transition-all group">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider group-hover:text-blue-400 transition-colors">{key}</span>
                        <span className="text-[10px] font-mono text-slate-300 font-bold truncate max-w-[400px] bg-black/40 px-3 py-1 rounded-lg border border-white/5" title={String(value)}>{String(value)}</span>
                     </div>
                  ))}
               </div>
            ) : null}
         </div>
         
         <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-4">
            <Info size={18} className="text-amber-500 shrink-0" />
            <p className="text-[9px] font-bold text-amber-500/80 uppercase leading-relaxed tracking-tight">
               These variables are extracted directly from the underlying Linux OS execution context. They impact how the SysGrid Engine interacts with system binaries and file-system hooks.
            </p>
         </div>

         <button onClick={onClose} className="w-full mt-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Close Diagnostic View</button>
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
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('sysgrid-theme') || 'nordic-frost-v1');
  const [latency, setLatency] = useState(0);

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/settings/user/profile");
      return res.json();
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
      setCurrentTheme(userSettings.theme);
      document.documentElement.setAttribute('data-theme', userSettings.theme);
      const isLight = ['solarized-light', 'pure-clarity', 'clean-snow-v1', 'light'].includes(userSettings.theme);
      if (isLight) document.documentElement.classList.remove('dark');
      else document.documentElement.classList.add('dark');
    }
  }, [userSettings]);

  useEffect(() => {
    return subscribeToLatency(setLatency);
  }, []);

  const THEMES = [
    { id: 'nordic-frost-v1', label: 'Nordic Frost (Default)', color: 'bg-[#1a1b26]' },
    { id: 'industrial-slate', label: 'Industrial Slate', color: 'bg-[#1e293b]' },
    { id: 'ocean-deep', label: 'Ocean Deep', color: 'bg-[#0f172a]' },
    { id: 'solarized-light', label: 'Solarized Light', color: 'bg-[#fdf6e3]' },
    { id: 'cyber-emerald', label: 'Cyber Emerald', color: 'bg-[#050505]' },
    { id: 'pure-clarity', label: 'Pure Clarity', color: 'bg-[#ffffff]' }
  ]

  const changeTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    const isLight = ['solarized-light', 'pure-clarity', 'clean-snow-v1'].includes(themeId);
    if (isLight) document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
    localStorage.setItem('sysgrid-theme', themeId);
    toast.success(`Matrix UI: ${THEMES.find(t => t.id === themeId)?.label}`);
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
      if (error && (error.traceback || error.status || error.data)) {
        errorManager.addError({
          message: error.message || 'Unhandled Promise Rejection',
          stack: error.traceback || error.stack,
          status: error.status,
          data: error.data,
          type: 'BACKEND',
          severity: 'ERROR'
        });
        event.preventDefault();
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      errorManager.addError({
        message: event.message || 'Frontend Exception',
        stack: event.error?.stack,
        url: event.filename,
        type: 'FRONTEND',
        severity: 'CRITICAL'
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
    const isLight = ['solarized-light', 'pure-clarity', 'clean-snow-v1'].includes(currentTheme);
    if (isLight) document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
    apiFetch("/api/v1/settings/initialize").catch(() => {}) 
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans transition-colors duration-500">
      <Toaster position="top-right" toastOptions={{ duration: 1000 }} />
      <motion.aside animate={{ width: isSidebarOpen ? 240 : 80 }} className="glass-panel border-r border-[var(--glass-border)] flex flex-col z-20 shadow-2xl relative bg-[var(--sidebar-bg)]">
        <div className={`p-6 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity group">
             <div className="w-9 h-9 flex-shrink-0 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/5 transition-transform group-hover:scale-105 duration-300">
                <Grid3X3 size={20} className="text-white" />
             </div>
             {isSidebarOpen && <span className="font-black text-xl text-[var(--text-primary)] tracking-tighter uppercase italic">SYSGRID</span>}
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
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarItem icon={LayoutDashboard} label="Home" path="/" active={location.pathname === "/"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Briefcase} label="Projects" path="/projects" active={location.pathname === "/projects"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Package} label="Racks" path="/racks" active={location.pathname === "/racks"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Server} label="Assets" path="/asset" active={location.pathname === "/asset"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Layers} label="Services" path="/services" active={location.pathname === "/services"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Share2} label="External" path="/external" active={location.pathname === "/external"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Network} label="Network" path="/network" active={location.pathname === "/network"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Workflow} label="Architecture" path="/architecture" active={location.pathname === "/architecture"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Search} label="Research" path="/research" active={location.pathname === "/research"} isOpen={isSidebarOpen} />
          <SidebarItem icon={AlertTriangle} label="FAR" path="/far" active={location.pathname === "/far"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Activity} label="Monitoring" path="/monitoring" active={location.pathname === "/monitoring"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Globe} label="Vendors" path="/vendors" active={location.pathname === "/vendors"} isOpen={isSidebarOpen} />
          <SidebarItem icon={BookOpen} label="Knowledge" path="/knowledge" active={location.pathname === "/knowledge"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Terminal} label="Logs" path="/logs" active={location.pathname === "/logs"} isOpen={isSidebarOpen} />
        </nav>
        
        {/* User Profile Section */}
        <div className={`p-4 border-t border-[var(--glass-border)] space-y-2 transition-all ${!isSidebarOpen ? 'flex flex-col items-center' : ''}`}>
           <button 
              onClick={() => setShowLinuxEnv(true)}
              className={`flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-blue-500/30 transition-all group ${!isSidebarOpen ? 'w-10 h-10 p-0 justify-center' : 'w-full text-left'}`}
           >
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                 <Globe size={16} />
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col min-w-0">
                   <span className="text-[10px] font-black uppercase text-[var(--text-primary)] truncate italic">{userProfile?.username || 'Operator'}</span>
                   <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-tighter truncate">{userProfile?.department || 'Sector-01'}</span>
                </div>
              )}
           </button>

           <div className="relative group/theme-container">
             <button 
                className={`flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-blue-500/30 transition-all group ${!isSidebarOpen ? 'w-10 h-10 p-0 justify-center' : 'w-full text-left'}`}
             >
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                   <Zap size={16} />
                </div>
                {isSidebarOpen && (
                  <div className="flex flex-col min-w-0">
                     <span className="text-[10px] font-black uppercase text-[var(--text-primary)] truncate italic">Interface Mode</span>
                     <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-tighter truncate">Switch Matrix UI</span>
                  </div>
                )}
             </button>

             {/* Theme Hover Menu */}
             <div className={`absolute bottom-0 left-full ml-2 opacity-0 group-hover/theme-container:opacity-100 pointer-events-none group-hover/theme-container:pointer-events-auto transition-all duration-300 z-50`}>
                <div className="bg-[var(--bg-header)] border border-[var(--glass-border)] rounded-2xl p-2 shadow-2xl backdrop-blur-2xl w-48 space-y-1">
                   {THEMES.map(theme => (
                      <button 
                        key={theme.id}
                        onClick={() => changeTheme(theme.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${currentTheme === theme.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'}`}
                      >
                         <div className={`w-3 h-3 rounded-full ${theme.color} border border-white/10`} />
                         <span className="text-[9px] font-black uppercase tracking-widest">{theme.label}</span>
                         {currentTheme === theme.id && <Check size={12} className="ml-auto" />}
                      </button>
                   ))}
                </div>
             </div>
           </div>
        </div>

        <div className="p-4 border-t border-[var(--glass-border)] text-center opacity-30">
           {isSidebarOpen ? <p className="text-[8px] font-black uppercase tracking-[0.3em]">{APP_VERSION}</p> : <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto"/>}
        </div>
      </motion.aside>
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-[var(--glass-border)] flex items-center justify-between px-8 bg-[var(--bg-header)] backdrop-blur-xl z-10">
          <div className="flex items-center space-x-4">
            <button onClick={() => setShowPatchNotes(true)} className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all">Patch Notes</button>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex flex-col items-end mr-4">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">System Status</span>
              <div className="flex items-center space-x-2">
                <span className={`text-[11px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {isOnline ? 'Operational' : 'Degraded'}
                </span>
                {isOnline && <span className="text-[9px] font-bold text-slate-600 tabular-nums">{latency}ms</span>}
              </div>
            </div>

            <button 
              onClick={() => setErrorConsoleOpen(true)}
              className={`p-2 rounded-lg transition-all relative border ${errors.filter(e => !e.acknowledged).length > 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
            >
               <Bug size={18} />
               {errors.filter(e => !e.acknowledged).length > 0 && (
                 <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-full border-2 border-[var(--bg-header)] min-w-[18px] text-center">
                   {errors.filter(e => !e.acknowledged).length}
                 </span>
               )}
            </button>
            <Link to="/settings" className={`p-2 rounded-lg transition-all border ${location.pathname === '/settings' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
               <Settings size={18} />
            </Link>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-hidden relative">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard onNavigate={(p:any) => navigate("/" + p)} />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/racks" element={<RackTemp />} />
              <Route path="/asset" element={<AssetTemp />} />
              <Route path="/services" element={<ServiceRegistry />} />
              <Route path="/external" element={<External />} />
              <Route path="/network" element={<NetworkFabric />} />
              <Route path="/architecture" element={<DataFlowDesigner />} />
              <Route path="/research" element={<Research />} />
              <Route path="/far" element={<FAR />} />
              <Route path="/monitoring" element={<MonitoringGrid />} />
              <Route path="/vendors" element={<Vendor />} />
              <Route path="/knowledge" element={<Knowledge />} />
              <Route path="/logs" element={<AuditLogs />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>
        <footer className="h-8 border-t border-[var(--glass-border)] px-8 flex items-center justify-between text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-primary)]/20">
           <span />
           <span className="text-blue-500">VERSION {APP_VERSION}</span>
        </footer>
      </main>
      <AnimatePresence>
        {showPatchNotes && <PatchNotesModal onClose={() => setShowPatchNotes(false)} />}
        {showLinuxEnv && <LinuxEnvModal onClose={() => setShowLinuxEnv(false)} />}
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
