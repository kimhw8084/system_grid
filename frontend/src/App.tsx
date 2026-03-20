import React, { useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Server, Network, Database, Shield, Activity, Settings, Search, Upload, CheckCircle2 } from 'lucide-react'

// Functional Components
import Nexus2D from './components/Nexus2D'
import AssetGrid from './components/AssetGrid'
import NetworkFabric from './components/NetworkFabric'
import SecurityVault from './components/SecurityVault'

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

const IntelModule = () => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/v1/import/csv', { method: 'POST', body: formData })
      if (res.ok) {
        setUploadSuccess(true)
        setTimeout(() => setUploadSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Intelligence Engine</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-8 rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center space-y-4 hover:border-[#034EA2]/30 transition-colors relative overflow-hidden">
          <div className="w-16 h-16 bg-[#034EA2]/10 rounded-2xl flex items-center justify-center mb-2">
            {uploadSuccess ? <CheckCircle2 size={32} className="text-emerald-400" /> : <Upload size={32} className="text-[#034EA2]" />}
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest">Bulk Ingestion</h3>
          <p className="text-[10px] text-slate-500 max-w-xs uppercase leading-relaxed">Drag and drop CSV/Excel for automated entity discovery.</p>
          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} accept=".csv" />
          {isUploading && <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center"><Activity className="animate-spin text-blue-400" /></div>}
        </div>
        
        <div className="glass-panel p-8 rounded-3xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Processing Pipeline</h3>
          <div className="space-y-2">
            {['Schema Validation', 'Duplicate Detection', 'Relational Mapping'].map(item => (
              <div key={item} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">{item}</span>
                <span className="text-[9px] font-black text-blue-400 uppercase">Active</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MainContent() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 glass-panel border-r-0 rounded-none p-4 flex flex-col z-20">
        <div className="mb-10 px-4 pt-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-[#034EA2] rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="font-black text-sm">S</span>
            </div>
            <span className="font-black text-lg tracking-tighter">SYSGRID</span>
          </div>
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em] pl-1">Infrastructure OS</p>
        </div>

        <nav className="flex-1 space-y-1.5">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={Server} label="Assets" active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} />
          <SidebarItem icon={Network} label="Network" active={activeTab === 'network'} onClick={() => setActiveTab('network')} />
          <SidebarItem icon={Database} label="Intelligence" active={activeTab === 'intel'} onClick={() => setActiveTab('intel')} />
          <SidebarItem icon={Shield} label="Security" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
        </nav>

        <div className="pt-4 mt-4 border-t border-white/5 opacity-50">
          <SidebarItem icon={Settings} label="Config" onClick={() => {}} />
        </div>
      </aside>

      {/* Viewport */}
      <main className="flex-1 overflow-hidden p-8 relative">
        <div className="absolute top-0 right-0 p-8 z-10">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={14} />
            <input type="text" placeholder="CMD + K" className="bg-slate-900/50 border border-white/5 rounded-full py-2 pl-9 pr-4 text-[10px] w-48 font-bold focus:w-64 transition-all focus:outline-none" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {activeTab === 'dashboard' ? <Nexus2D /> : 
             activeTab === 'assets' ? <AssetGrid /> : 
             activeTab === 'network' ? <NetworkFabric /> : 
             activeTab === 'intel' ? <IntelModule /> : 
             <SecurityVault />}
          </motion.div>
        </AnimatePresence>
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
