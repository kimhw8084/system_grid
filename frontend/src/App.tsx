import React, { useState, useEffect } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { LayoutDashboard, Server, Network, Database, Shield, Settings, Search, ServerCrash, Terminal, Layers, Menu, X, ChevronRight, Zap, Info, Star } from "lucide-react"
import { Toaster } from "react-hot-toast"

import Dashboard from "./components/Dashboard"
import RackElevations from "./components/RackElevations"
import AssetGrid from "./components/AssetGrid"
import NetworkFabric from "./components/NetworkFabric"
import Intelligence from "./components/Intelligence"
import AuditLogs from "./components/AuditLogs"
import ServiceRegistry from "./components/ServiceRegistry"
import SettingsPage from "./components/Settings"
import IPAM from "./components/IPAM"
import Maintenance from "./components/Maintenance"

const APP_VERSION = "v1.2.0-PRESIDENTIAL"
const queryClient = new QueryClient()

const SidebarItem = ({ icon: Icon, label, path, active }: any) => (
  <Link to={path} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 ${active ? "bg-[#034EA2] text-white shadow-lg" : "hover:bg-white/5 text-slate-400"}`}>
    <Icon size={18} />
    <span className="font-bold text-[11px] uppercase tracking-wider">{label}</span>
    {active && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
  </Link>
)

const PatchNotesModal = ({ onClose }: any) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md">
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[600px] max-h-[80vh] overflow-y-auto p-10 rounded-[40px] border-blue-500/30">
       <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center space-x-4">
             <Star size={24} className="text-blue-400 animate-pulse" />
             <h2 className="text-2xl font-black uppercase text-white">Patch Notes {APP_VERSION}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={24}/></button>
       </div>
       <div className="space-y-6 pt-6">
          <p className="text-xs text-blue-400 font-bold uppercase">Critical Fixes & Innovations</p>
          <ul className="space-y-3 text-[11px] text-slate-300 font-bold">
             <li>• [RESTORED] Network Port visibility and Physical Link binding</li>
             <li>• [NEW] Global Settings Control Panel for all dropdowns</li>
             <li>• [NEW] Dynamic Key-Value Metadata Grid (No JSON required)</li>
             <li>• [FIXED] Hardware/Software keyword crashes in DB</li>
             <li>• [FIXED] Audit Log State Diffs comparison tool</li>
             <li>• [FIXED] Removed hard UNIQUE database constraints to allow decommissioned asset reprovisioning</li>
             <li>• [REMOVED] Non-functional search bar to declutter UI</li>
             <li>• [REMOVED] Software extension on assets (deferring to Logical Service matrix)</li>
             <li>• [FIXED] Rack duplicate name collision validation added</li>
          </ul>
       </div>
       <button onClick={onClose} className="w-full mt-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase">Verified</button>
    </motion.div>
  </div>
)

function MainLayout() {
  const location = useLocation(); const navigate = useNavigate(); const [isSidebarOpen, setIsSidebarOpen] = useState(true); const [showPatchNotes, setShowPatchNotes] = useState(false)
  useEffect(() => { fetch("/api/v1/settings/initialize").catch(() => {}) }, [])
  return (
    <div className="flex h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans">
      <Toaster position="top-right" />
      <motion.aside animate={{ width: isSidebarOpen ? 240 : 80 }} className="glass-panel border-r border-white/5 flex flex-col z-20">
        <div className="p-6 flex items-center justify-between">
          <span className={`font-black text-lg text-white ${!isSidebarOpen && "hidden"}`}>SYSGRID</span>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}><Menu size={18}/></button>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" path="/" active={location.pathname === "/"} />
          <SidebarItem icon={ServerCrash} label="Racks" path="/racks" active={location.pathname === "/racks"} />
          <SidebarItem icon={Server} label="Assets" path="/assets" active={location.pathname === "/assets"} />
          <SidebarItem icon={Layers} label="Services" path="/services" active={location.pathname === "/services"} />
          <SidebarItem icon={Network} label="Network" path="/network" active={location.pathname === "/network"} />
          <SidebarItem icon={Database} label="IPAM" path="/ipam" active={location.pathname === "/ipam"} />
          <SidebarItem icon={Settings} label="Settings" path="/settings" active={location.pathname === "/settings"} />
        </nav>
        <div className="p-4 border-t border-white/5 text-center opacity-30">
           <p className="text-[8px] font-black">{APP_VERSION}</p>
        </div>
      </motion.aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#020617]/80 backdrop-blur-xl">
          <button onClick={() => setShowPatchNotes(true)} className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest">Patch Notes</button>
          <div className="text-[10px] font-black text-slate-500 uppercase">SYSGRID ENGINE <span className="text-blue-400">ONLINE</span></div>
        </header>
        <div className="flex-1 p-8 overflow-hidden">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Dashboard onNavigate={navigate} />} />
              <Route path="/racks" element={<RackElevations />} />
              <Route path="/assets" element={<AssetGrid />} />
              <Route path="/services" element={<ServiceRegistry />} />
              <Route path="/network" element={<NetworkFabric />} />
              <Route path="/ipam" element={<IPAM />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </AnimatePresence>
        </div>
        <footer className="h-8 border-t border-white/5 px-8 flex items-center justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest">
           <span>SYSGRID INFRASTRUCTURE</span>
           <span className="text-blue-500">VERSION {APP_VERSION} [FINAL-POLISH]</span>
        </footer>
      </main>
      <AnimatePresence>{showPatchNotes && <PatchNotesModal onClose={() => setShowPatchNotes(false)} />}</AnimatePresence>
    </div>
  )
}

export default function App() {
  return (<QueryClientProvider client={queryClient}><BrowserRouter><MainLayout /></BrowserRouter></QueryClientProvider>)
}
