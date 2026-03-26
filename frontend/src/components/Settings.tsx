import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Settings, Plus, Trash2, CheckCircle2, AlertCircle, Save, RefreshCcw, Layout, Shield, Database, Cpu, Sliders, Box, Network, Globe, Lock, Key, Activity } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import { UISettingsModal } from "./ConfigRegistry"
import { ConfigSection } from "./ConfigRegistry"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('global')
  const [showUI, setShowUI] = useState(false)
  const { data: options } = useQuery({ queryKey: ["settings-options"], queryFn: async () => (await fetch("/api/v1/settings/options")).json() })
  
  const tabs = [
    { id: 'global', label: 'Global Inventory', icon: Globe },
    { id: 'security', label: 'Security & Access', icon: Shield },
    { id: 'advanced', label: 'Advanced Logic', icon: Cpu },
  ]

  const getOptions = (category: string) => Array.isArray(options) ? options.filter((o: any) => o.category === category) : []

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

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        <AnimatePresence mode="wait">
          {activeTab === 'global' && (
            <motion.div key="global" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-3 gap-8">
               <ConfigSection title="Asset Categories" category="Category" icon={Box} options={getOptions('Category')} />
               <ConfigSection title="Network Roles" category="Role" icon={Network} options={getOptions('Role')} />
               <ConfigSection title="System Statuses" category="Status" icon={Activity} options={getOptions('Status')} />
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-3 gap-8">
               <ConfigSection title="Access Protocols" category="Protocol" icon={Lock} options={getOptions('Protocol')} />
               <ConfigSection title="Security Zones" category="Zone" icon={Shield} options={getOptions('Zone')} />
               <ConfigSection title="Identity Providers" category="IdP" icon={Key} options={getOptions('IdP')} />
            </motion.div>
          )}

          {activeTab === 'advanced' && (
            <motion.div key="advanced" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-3 gap-8">
               <ConfigSection title="Service Types" category="ServiceType" icon={Database} options={getOptions('ServiceType')} />
               <ConfigSection title="Environment Tiers" category="Tier" icon={Sliders} options={getOptions('Tier')} />
               <ConfigSection title="Logic Providers" category="Logic" icon={Cpu} options={getOptions('Logic')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <UISettingsModal isOpen={showUI} onClose={() => setShowUI(false)} />
    </div>
  )
}
