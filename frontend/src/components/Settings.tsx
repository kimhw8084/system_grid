import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Settings, Plus, Trash2, CheckCircle2, AlertCircle, Save, RefreshCcw, Layout, Shield, Database, Cpu } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"

const ConfigSection = ({ title, category, options, icon: Icon }: any) => {
  const queryClient = useQueryClient()
  const [newValue, setNewValue] = useState("")

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/settings/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, label: newValue, value: newValue })
      })
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings-options"] }); setNewValue(""); toast.success(`Added ${newValue}`) }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/settings/options/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings-options"] }); toast.success("Option Removed") }
  })

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 rounded-[32px] border-white/5 flex flex-col space-y-6">
      <div className="flex items-center space-x-4 border-b border-white/5 pb-4">
         <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-400">
            <Icon size={20} />
         </div>
         <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">{title}</h3>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Global Registry Enumeration</p>
         </div>
      </div>

      <div className="flex-1 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        {options?.map((opt: any) => (
          <div key={opt.id} className="group flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
            <span className="text-[11px] font-bold text-slate-300">{opt.label}</span>
            <button onClick={() => deleteMutation.mutate(opt.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-all">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {options?.length === 0 && <p className="text-[10px] font-bold text-slate-600 uppercase text-center py-8 italic">No entries configured</p>}
      </div>

      <div className="pt-4 border-t border-white/5">
        <div className="relative">
          <input 
            value={newValue} 
            onChange={e => setNewValue(e.target.value)} 
            placeholder={`Add ${title}...`} 
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500 transition-all uppercase font-bold pr-12"
            onKeyDown={e => e.key === 'Enter' && newValue && addMutation.mutate()}
          />
          <button 
            onClick={() => newValue && addMutation.mutate()} 
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-400 hover:text-white transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('global')
  const { data: options } = useQuery({ queryKey: ["settings-options"], queryFn: async () => (await fetch("/api/v1/settings/options")).json() })
  const { data: uiSettings } = useQuery({ queryKey: ["ui-settings"], queryFn: async () => (await fetch("/api/v1/settings/ui")).json() })

  const uiMutation = useMutation({
    mutationFn: async (data: any) => fetch('/api/v1/settings/ui', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ui-settings"] }); toast.success("UI Preferences Synchronized") }
  })

  const tabs = [
    { id: 'global', label: 'Global Registry', icon: Layout },
    { id: 'ui', label: 'UI Customization', icon: Database },
    { id: 'security', label: 'Security & Access', icon: Shield },
    { id: 'compute', label: 'Compute Clusters', icon: Cpu },
  ]

  const sections = [
    { title: "Logical Systems", category: "LogicalSystem", icon: Layout },
    { title: "Asset Types", category: "DeviceType", icon: Cpu },
    { title: "Operational Status", category: "Status", icon: RefreshCcw },
    { title: "Environments", category: "Environment", icon: Settings },
  ]

  const statusColors = uiSettings?.status_colors || {}
  const statusOptions = Array.isArray(options) ? options.filter((o:any) => o.category === 'Status') : []

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }}
      className="h-full flex flex-col space-y-8 max-w-7xl mx-auto"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic text-blue-400">Control Plane</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">System-wide Configuration & Enumerations</p>
        </div>
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
             {activeTab === tab.id && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_#3b82f6]" />}
           </button>
         ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'global' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 pb-10">
            {sections.map(s => <ConfigSection key={s.category} title={s.title} category={s.category} icon={s.icon} options={Array.isArray(options) ? options.filter((o:any) => o.category === s.category) : []} />)}
          </div>
        )}
        
        {activeTab === 'ui' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 rounded-[32px] border-white/5 space-y-8">
               <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-400"><Layout size={20} /></div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">Grid Visuals</h3>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Status Column Rendering</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => uiMutation.mutate({ ...uiSettings, status_badged: !uiSettings?.status_badged })}
                    className={`w-12 h-6 rounded-full transition-all relative ${uiSettings?.status_badged ? 'bg-blue-600' : 'bg-slate-800'}`}
                  >
                    <motion.div animate={{ x: uiSettings?.status_badged ? 26 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg" />
                  </button>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status Color Mapping</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {statusOptions.map((opt:any) => (
                      <div key={opt.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-[11px] font-bold text-slate-300">{opt.label}</span>
                        <input 
                            type="color" 
                            value={statusColors[opt.label] || '#64748b'} 
                            onChange={e => {
                                const newColors = { ...statusColors, [opt.label]: e.target.value }
                                uiMutation.mutate({ ...uiSettings, status_colors: newColors })
                            }}
                            className="w-8 h-8 bg-transparent border-none cursor-pointer"
                        />
                      </div>
                    ))}
                    {statusOptions.length === 0 && <p className="text-[10px] font-bold text-slate-600 uppercase italic">Configure Status options in Global Registry first</p>}
                  </div>
               </div>
            </motion.div>

            <div className="flex flex-col items-center justify-center opacity-20 space-y-4">
                <Database size={64} />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Advanced Layouts Coming Soon</p>
            </div>
          </div>
        )}

        {(activeTab !== 'global' && activeTab !== 'ui') && (
          <div className="flex flex-col items-center justify-center py-20 opacity-20 space-y-4">
             <Shield size={64} />
             <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sub-Registry Module Offline</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
