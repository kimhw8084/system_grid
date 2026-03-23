import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Server, Network, Database, Shield, Settings, Search, ServerCrash, Terminal } from 'lucide-react'

// Functional Components
import Dashboard from './components/Dashboard'
import RackElevations from './components/RackElevations'
import AssetGrid from './components/AssetGrid'
import NetworkFabric from './components/NetworkFabric'
import Intelligence from './components/Intelligence'
import AuditLogs from './components/AuditLogs'

const queryClient = new QueryClient()

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
      active ? 'bg-[#034EA2] text-white shadow-lg shadow-[#034EA2]/20' : 'hover:bg-white/5 text-slate-400'
    }`}
  >
    <Icon size={18} />
    <span className="font-bold text-[11px] uppercase tracking-wider">{label}</span>
  </button>
)

function MainContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [searchFocused, setSearchFocused] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans antialiased">
      {/* Sidebar */}
      <aside className="w-60 glass-panel border-r border-white/5 rounded-none p-4 flex flex-col z-20">
        <div className="mb-10 px-4 pt-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-[#034EA2] rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="font-black text-sm text-white">S</span>
            </div>
            <span className="font-black text-lg tracking-tighter text-white uppercase">SYSGRID</span>
          </div>
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em] pl-1 font-black">Infrastructure OS</p>
        </div>

        <nav className="flex-1 space-y-1.5">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={ServerCrash} label="Rack Elevations" active={activeTab === 'racks'} onClick={() => setActiveTab('racks')} />
          <SidebarItem icon={Server} label="Asset Registry" active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} />
          <SidebarItem icon={Network} label="Network Fabric" active={activeTab === 'network'} onClick={() => setActiveTab('network')} />
          <SidebarItem icon={Database} label="Intelligence" active={activeTab === 'intel'} onClick={() => setActiveTab('intel')} />
          <SidebarItem icon={Shield} label="Forensic Audit" active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} />
        </nav>

        <div className="pt-4 mt-4 border-t border-white/5 opacity-50">
          <SidebarItem icon={Terminal} label="System Log" onClick={() => setActiveTab('audit')} />
        </div>
      </aside>

      {/* Viewport */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header Fixed Layout */}
        <header className="h-16 min-h-[64px] border-b border-white/5 flex items-center justify-end px-8 z-10 bg-[#020617]/80 backdrop-blur-xl">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${searchFocused ? 'text-blue-400' : 'text-slate-500'}`} size={14} />
            <input 
              type="text" 
              placeholder="Search Infrastructure Registry..." 
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="bg-slate-900 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-[11px] w-64 focus:w-96 transition-all focus:outline-none focus:border-blue-500/50 uppercase tracking-widest font-black" 
            />
          </div>
        </header>

        <div className="flex-1 overflow-hidden p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'dashboard' ? <Dashboard /> : 
               activeTab === 'racks' ? <RackElevations /> : 
               activeTab === 'assets' ? <AssetGrid /> : 
               activeTab === 'network' ? <NetworkFabric /> : 
               activeTab === 'intel' ? <Intelligence /> : 
               <AuditLogs />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainContent />
    </QueryClientProvider>
  )
}
