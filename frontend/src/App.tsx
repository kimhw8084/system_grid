import React, { useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Server, Network, Database, Shield, Activity, Settings, Search, Upload, CheckCircle2 } from 'lucide-react'

// Presidential Components
import Nexus2D from './components/Nexus2D'
import AssetGrid from './components/AssetGrid'

const queryClient = new QueryClient()

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
      active ? 'bg-[#034EA2] text-white shadow-lg shadow-[#034EA2]/20' : 'hover:bg-white/5 text-slate-400'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium text-sm">{label}</span>
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
      <h1 className="text-3xl font-bold tracking-tight">Intelligence Engine</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-8 rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center space-y-4 hover:border-[#034EA2]/30 transition-colors relative overflow-hidden">
          <div className="w-16 h-16 bg-[#034EA2]/10 rounded-2xl flex items-center justify-center mb-2">
            {uploadSuccess ? <CheckCircle2 size={32} className="text-emerald-400" /> : <Upload size={32} className="text-[#034EA2]" />}
          </div>
          <h3 className="text-lg font-bold">Bulk Asset Import</h3>
          <p className="text-sm text-slate-400 max-w-xs">Drag and drop CSV or Excel files here for 0ms Manual Entry ingestion.</p>
          <input 
            type="file" 
            className="absolute inset-0 opacity-0 cursor-pointer" 
            onChange={handleFileUpload}
            accept=".csv"
          />
          {isUploading && <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
            <Activity className="animate-spin text-blue-400" />
          </div>}
        </div>
        
        <div className="glass-panel p-8 rounded-3xl space-y-4">
          <h3 className="text-lg font-bold">Fuzzy Logic Status</h3>
          <div className="space-y-3">
            {[
              { label: 'Name Normalization', status: 'Ready' },
              { label: 'SN De-duplication', status: 'Active' },
              { label: 'Manufacturer Correction', status: 'Active' }
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-white/5 rounded-xl text-sm">
                <span className="text-slate-400">{item.label}</span>
                <span className="text-blue-400 font-mono text-xs uppercase">{item.status}</span>
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
      <aside className="w-64 glass-panel border-r-0 rounded-none p-4 flex flex-col z-20">
        <div className="mb-10 px-4 pt-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-[#034EA2] rounded-lg flex items-center justify-center shadow-lg">
              <span className="font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-lg tracking-tight">THE GRID</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Command Center v1.0</span>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={Server} label="Assets" active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} />
          <SidebarItem icon={Network} label="Network Fabric" active={activeTab === 'network'} onClick={() => setActiveTab('network')} />
          <SidebarItem icon={Database} label="Intelligence" active={activeTab === 'intel'} onClick={() => setActiveTab('intel')} />
          <SidebarItem icon={Shield} label="Security Vault" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
        </nav>

        <div className="pt-4 mt-4 border-t border-white/5">
          <SidebarItem icon={Settings} label="Global Config" onClick={() => {}} />
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden p-8 relative">
        <div className="absolute top-0 right-0 p-8 z-10">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Cmd + K to search..."
              className="bg-slate-900/50 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'dashboard' ? (
              <div className="h-full flex flex-col space-y-6">
                <h1 className="text-3xl font-bold tracking-tight">System Nexus</h1>
                <div className="flex-1 min-h-0">
                  <Nexus2D />
                </div>
              </div>
            ) : activeTab === 'assets' ? (
              <AssetGrid />
            ) : activeTab === 'intel' ? (
              <IntelModule />
            ) : (
              <div className="flex items-center justify-center h-[70vh] glass-panel rounded-3xl border-dashed">
                <p className="text-slate-500 italic">Module {activeTab} under development</p>
              </div>
            )}
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
