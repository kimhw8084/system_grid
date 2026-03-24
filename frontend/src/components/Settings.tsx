import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Settings, Plus, Trash2, CheckCircle2, AlertCircle, Save, RefreshCcw } from "lucide-react"
import { motion } from "framer-motion"

const ConfigSection = ({ title, category, options }: any) => {
  const queryClient = useQueryClient()
  const [newValue, setNewValue] = useState("")
  const addMutation = useMutation({
    mutationFn: async (val: string) => {
      const res = await fetch("/api/v1/settings/options", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, label: val, value: val })
      })
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings-options"] }); setNewValue("") }
  })
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/settings/options/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-options"] })
  })
  return (
    <div className="glass-panel p-6 rounded-[30px] border-white/5 space-y-4">
       <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">{title}</h3>
          <span className="text-[9px] font-mono text-slate-500">{options?.length || 0} ITEMS</span>
       </div>
       <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1">
          {options?.map((opt: any) => (
            <div key={opt.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5 group">
               <span className="text-xs text-slate-300 font-bold">{opt.label}</span>
               <button onClick={() => deleteMutation.mutate(opt.id)} className="opacity-0 group-hover:opacity-100 text-rose-400"><Trash2 size={12}/></button>
            </div>
          ))}
       </div>
       <div className="flex space-x-2 pt-2">
          <input value={newValue} onChange={e => setNewValue(e.target.value)} className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none" placeholder="New option..." />
          <button onClick={() => newValue && addMutation.mutate(newValue)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">+ Add</button>
       </div>
    </div>
  )
}

export default function SettingsPage() {
  const { data: options } = useQuery({ queryKey: ["settings-options"], queryFn: async () => (await fetch("/api/v1/settings/options")).json() })
  const sections = [
    { title: "Logical Systems", category: "LogicalSystem" },
    { title: "Asset Types", category: "DeviceType" },
    { title: "Registry Status", category: "Status" },
    { title: "Environments", category: "Environment" },
    { title: "Hardware Types", category: "HWType" },
    { title: "Software Categories", category: "SWCategory" },
    { title: "Relationship Types", category: "RelationType" },
    { title: "Link Statuses", category: "LinkStatus" }
  ]
  return (
    <div className="h-full flex flex-col space-y-8 overflow-y-auto custom-scrollbar pr-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic text-blue-400">Global Configuration</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Administrative Control</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
         {sections.map(s => <ConfigSection key={s.category} title={s.title} category={s.category} options={options?.filter((o:any) => o.category === s.category)} />)}
      </div>
    </div>
  )
}
