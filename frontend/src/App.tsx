import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { LayoutDashboard, Server, Network, Shield, Settings, Search, ServerCrash, Terminal, Layers, Menu, X, ChevronRight, Zap, Info, Star, AlertOctagon, RefreshCcw } from "lucide-react"
import { Toaster } from "react-hot-toast"

import Dashboard from "./components/Dashboard"
import RackElevations from "./components/RackElevations"
import AssetGrid from "./components/AssetGrid"
import NetworkFabric from "./components/NetworkFabric"
import Intelligence from "./components/Intelligence"
import AuditLogs from "./components/AuditLogs"
import ServiceRegistry from "./components/ServiceRegistry"
import SettingsPage from "./components/Settings"
import Maintenance from "./components/Maintenance"

const APP_VERSION = "1.2.2"
const PATCH_HISTORY = [
  {
    version: "1.2.2",
    date: "2026-03-25",
    changes: [
      { type: "IMPROVED", text: "Global UI optimization and performance pass" },
      { type: "FIXED", text: "Removed restrictive unique constraints on assets" },
      { type: "FIXED", text: "DateTime handling for asset edits (SQLite compatibility)" },
      { type: "NEW", text: "Dual-mode metadata editor (Table & JSON modes)" },
      { type: "NEW", text: "Comprehensive Bulk Actions for Assets and Services" },
      { type: "FIXED", text: "Decommissioned view filtering logic" },
      { type: "IMPROVED", text: "Tabbed Settings interface with dynamic configuration" },
      { type: "FIXED", text: "Network Fabric port display and persistence" },
      { type: "IMPROVED", text: "Visual identity: Added System Grid Icon" }
    ]
  },
  {
    version: "1.2.1",
    date: "2026-03-25",
    changes: [
      { type: "FIXED", text: "Rack View 'devices is not defined' reference error" },
      { type: "FIXED", text: "Asset addition 400 Bad Request" },
      { type: "FIXED", text: "Navigation bar icon visibility when collapsed" }
    ]
  }
]
const queryClient = new QueryClient()

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: any, showDetails: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null, showDetails: false }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, info: ErrorInfo) { console.error("CRASH:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#020617] flex flex-col items-center justify-center p-10 text-center">
          <AlertOctagon size={64} className="text-rose-500 mb-6 animate-pulse" />
          <h1 className="text-3xl font-black uppercase text-white tracking-tighter">System Kernel Panic</h1>
          <p className="text-slate-500 text-xs mt-2 uppercase font-bold max-w-md">An unhandled exception has occurred in the UI layer. Stack trace available for inspection.</p>
          
          <button onClick={() => this.setState({ showDetails: !this.state.showDetails })} className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-400 transition-colors">
             {this.state.showDetails ? "- Hide Traceback" : "+ Inspect Kernel Dump"}
          </button>

          {this.state.showDetails && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-4 p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl max-w-2xl overflow-auto max-h-[40vh] text-left">
               <code className="text-[10px] text-rose-400 font-mono block whitespace-pre-wrap">{String(this.state.error.stack || this.state.error)}</code>
            </motion.div>
          )}

          <button onClick={() => window.location.href = "/"} className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase flex items-center space-x-2 shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">
             <RefreshCcw size={16}/> <span>Reset System Matrix</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[600px] max-h-[80vh] overflow-hidden flex flex-col p-10 rounded-[40px] border-blue-500/30">
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

const PageTransition = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
    className="h-full w-full"
  >
    {children}
  </motion.div>
)

function MainLayout() {
  const location = useLocation(); 
  const navigate = useNavigate(); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [showPatchNotes, setShowPatchNotes] = useState(false);

  useEffect(() => { 
    fetch("/api/v1/settings/initialize").catch(() => {}) 
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans">
      <Toaster position="top-right" />
      <motion.aside animate={{ width: isSidebarOpen ? 240 : 80 }} className="glass-panel border-r border-white/5 flex flex-col z-20 shadow-2xl relative">
        <div className={`p-6 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
             <div className="w-8 h-8 flex-shrink-0 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Zap size={20} className="text-white fill-white" />
             </div>
             {isSidebarOpen && <span className="font-black text-lg text-white tracking-tighter uppercase">SYSGRID</span>}
          </Link>
          {isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500">
              <Menu size={18}/>
            </button>
          )}
        </div>
        {!isSidebarOpen && (
          <div className="flex justify-center pb-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500">
              <Menu size={18}/>
            </button>
          </div>
        )}
        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" path="/" active={location.pathname === "/"} isOpen={isSidebarOpen} />
          <SidebarItem icon={ServerCrash} label="Racks" path="/racks" active={location.pathname === "/racks"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Server} label="Assets" path="/assets" active={location.pathname === "/assets"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Layers} label="Services" path="/services" active={location.pathname === "/services"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Network} label="Network" path="/network" active={location.pathname === "/network"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Settings} label="Settings" path="/settings" active={location.pathname === "/settings"} isOpen={isSidebarOpen} />
          <SidebarItem icon={Terminal} label="Logs" path="/logs" active={location.pathname === "/logs"} isOpen={isSidebarOpen} />
        </nav>
        <div className="p-4 border-t border-white/5 text-center opacity-30">
           {isSidebarOpen ? <p className="text-[8px] font-black uppercase tracking-[0.3em]">{APP_VERSION}</p> : <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto"/>}
        </div>
      </motion.aside>
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#020617]/80 backdrop-blur-xl z-10">
          <button onClick={() => setShowPatchNotes(true)} className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all">Patch Notes</button>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">SYSGRID ENGINE <span className="text-blue-400 animate-pulse">ONLINE</span></div>
        </header>
        <div className="flex-1 p-8 overflow-hidden relative">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<PageTransition><Dashboard onNavigate={(p:any) => navigate("/" + p)} /></PageTransition>} />
                <Route path="/racks" element={<PageTransition><RackElevations /></PageTransition>} />
                <Route path="/assets" element={<PageTransition><AssetGrid /></PageTransition>} />
                <Route path="/services" element={<PageTransition><ServiceRegistry /></PageTransition>} />
                <Route path="/network" element={<PageTransition><NetworkFabric /></PageTransition>} />
                <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
                <Route path="/logs" element={<PageTransition><AuditLogs /></PageTransition>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </ErrorBoundary>
        </div>
        <footer className="h-8 border-t border-white/5 px-8 flex items-center justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest bg-slate-900/20">
           <span>SYSGRID INFRASTRUCTURE COMMAND</span>
           <span className="text-blue-500">VERSION {APP_VERSION}</span>
        </footer>
      </main>
      <AnimatePresence>{showPatchNotes && <PatchNotesModal onClose={() => setShowPatchNotes(false)} />}</AnimatePresence>
    </div>
  )
}

export default function App() {
  return (<QueryClientProvider client={queryClient}><BrowserRouter><MainLayout /></BrowserRouter></QueryClientProvider>)
}
