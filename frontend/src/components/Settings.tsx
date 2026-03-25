import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Settings, Plus, Trash2, CheckCircle2, AlertCircle, Save, RefreshCcw, Layout, Shield, Database, Cpu, Sliders } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import { UISettingsModal } from "./ConfigRegistry"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('global')
  const [showUI, setShowUI] = useState(false)
  
  const tabs = [
    { id: 'global', label: 'System Overview', icon: Layout },
    { id: 'security', label: 'Security & Access', icon: Shield },
    { id: 'compute', label: 'Compute Clusters', icon: Cpu },
  ]

  return (
    <div className="h-full flex flex-col space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic text-blue-400">Control Plane</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">System-wide Configuration & Orchestration</p>
        </div>
        <button onClick={() => setShowUI(true)} className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
            <Sliders size={14} />
            <span>Global Visuals</span>
        </button>
      </div>

      <div className="flex space-x-2 border-b border-white/5 pb-1">
         {tabs.map(tab => (
           <button 
             key={tab.id} 
             onClick={() => setActiveTab(tab.id)}
             className={`flex items-center space-x-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
           >
             <tab.icon size={14} />
             <span>{tab.label}</span>
             {activeTab === tab.id && <motion.div layoutId="setting-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_#3b82f6]" />}
           </button>
         ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center opacity-20 space-y-4">
          <Database size={64} />
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">
            {activeTab === 'global' ? 'Control Plane Modules Transitioned' : `${tabs.find(t => t.id === activeTab)?.label} Module Offline`}
          </p>
          <p className="text-[8px] font-bold text-slate-500 uppercase">
            Registry configuration and system-specific enumerations are now available directly within each view via the gear icon.
          </p>
      </div>

      <UISettingsModal isOpen={showUI} onClose={() => setShowUI(false)} />
    </div>
  )
}
