import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, X, Check, Edit2, Layout, Database, RefreshCcw, Settings, ChevronDown, ChevronRight, PlusCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import { apiFetch } from "../api/apiClient"

export const ConfigSection = ({ title, category, options, icon: Icon }: any) => {
  const queryClient = useQueryClient()
  const [isExpanded, setIsExpanded] = useState(false)
  const [newValue, setNewValue] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editMetadata, setEditMetadata] = useState("")

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/v1/settings/options", {
        method: "POST",
        body: JSON.stringify({ category, label: newValue, value: newValue, metadata_keys: [] })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Failed to add option")
      }
      return res.json()
    },
    onSuccess: () => { 
        queryClient.invalidateQueries({ queryKey: ["settings-options"] }); 
        setNewValue(""); 
        toast.success(`Added ${newValue}`) 
    },
    onError: (e: any) => toast.error(e.message)
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, value, metadata_keys }: any) => {
        const res = await apiFetch(`/api/v1/settings/options/${id}`, {
            method: "PUT",
            body: JSON.stringify({ label: value, value: value, metadata_keys: metadata_keys })
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.detail || "Failed to update option")
        }
        return res.json()
    },
    onSuccess: () => { 
        queryClient.invalidateQueries({ queryKey: ["settings-options"] }); 
        setEditingId(null); 
        toast.success("Option Updated") 
    },
    onError: (e: any) => toast.error(e.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
        const res = await apiFetch(`/api/v1/settings/options/${id}`, { method: "DELETE" })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.detail || "Failed to delete option")
        }
        return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings-options"] }); toast.success("Option Removed") },
    onError: (e: any) => toast.error(e.message)
  })

  return (
    <div className="border border-white/5 bg-white/5 rounded-2xl overflow-hidden transition-all">
      <div className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-all cursor-pointer group" onClick={() => setIsExpanded(!isExpanded)}>
         <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-lg bg-white/5 ${isExpanded ? 'text-blue-400' : 'text-slate-500'}`}>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
            <div className="flex items-center space-x-3">
                <Icon size={18} className={isExpanded ? 'text-blue-400' : 'text-slate-500'} />
                <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isExpanded ? 'text-white' : 'text-slate-400'}`}>{title}</h3>
            </div>
         </div>
         <div className="flex items-center space-x-6">
            <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 flex items-center space-x-2">
                <span className="text-[10px] font-black text-blue-400">{options?.length || 0}</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Entries</span>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                className="p-2 hover:bg-blue-600 hover:text-white text-blue-400 rounded-full transition-all active:scale-90"
            >
                <PlusCircle size={20} />
            </button>
         </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-black/40 border-t border-white/5"
          >
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 min-h-[50px]">
                    {options?.map((opt: any, index: number) => (
                    <div key={opt.id} className="flex flex-col p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5 group relative">
                        <div className="flex items-center justify-between">
                            {editingId === opt.id ? (
                                <div className="flex items-center space-x-2 flex-1">
                                    <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} className="flex-1 bg-black/40 border border-blue-500/50 rounded px-2 py-1 text-[10px] outline-none text-white font-bold" onKeyDown={e => e.key === 'Enter' && updateMutation.mutate({ id: opt.id, value: editValue, metadata_keys: editMetadata.split(',').map(s => s.trim()).filter(Boolean) })} />
                                    <button onClick={() => updateMutation.mutate({ id: opt.id, value: editValue, metadata_keys: editMetadata.split(',').map(s => s.trim()).filter(Boolean) })} className="text-emerald-400 hover:text-emerald-300"><Check size={16}/></button>
                                    <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-white"><X size={16}/></button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center space-x-3 overflow-hidden">
                                        <span className="text-[9px] font-black text-slate-600">{index + 1}</span>
                                        <span className="text-[11px] font-black text-slate-200 uppercase truncate tracking-tight">{opt.label}</span>
                                    </div>
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => { setEditingId(opt.id); setEditValue(opt.label); setEditMetadata(opt.metadata_keys?.join(', ') || ""); }} className="p-1.5 hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 rounded-lg transition-all">
                                            <Edit2 size={12} />
                                        </button>
                                        <button onClick={() => deleteMutation.mutate(opt.id)} className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-all">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        {(category === 'ServiceType' || category === 'ExternalType') && (
                            <div className="mt-2 pl-6 border-l border-white/5">
                                {editingId === opt.id ? (
                                    <div className="space-y-1">
                                        <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Metadata Keys (CSV)</label>
                                        <input value={editMetadata} onChange={e => setEditMetadata(e.target.value)} placeholder="port, dbname..." className="w-full bg-black/40 border border-white/5 rounded px-2 py-1 text-[9px] outline-none focus:border-blue-500/30 text-white" />
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-1">
                                        {opt.metadata_keys?.map((k: string) => (
                                            <span key={k} className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-[4px] text-[7px] font-black uppercase tracking-tighter">{k}</span>
                                        ))}
                                        {(!opt.metadata_keys || opt.metadata_keys.length === 0) && <span className="text-[7px] text-slate-600 italic font-bold uppercase tracking-widest">No keys</span>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    ))}
                    {options?.length === 0 && (
                        <div className="col-span-full py-12 text-center flex flex-col items-center justify-center space-y-3 opacity-30">
                            <Settings size={32} className="text-slate-500" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">No entries configured for this domain</p>
                        </div>
                    )}
                </div>

                <div className="relative max-w-md mx-auto">
                    <input 
                    value={newValue} 
                    onChange={e => setNewValue(e.target.value)} 
                    placeholder={`Define new ${title} entry...`} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] outline-none focus:border-blue-500 transition-all font-black text-white uppercase pr-12 shadow-inner"
                    onKeyDown={e => e.key === 'Enter' && newValue && addMutation.mutate()}
                    />
                    <button onClick={() => newValue && addMutation.mutate()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-500 transition-all active:scale-90">
                    <Plus size={18} />
                    </button>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const ConfigRegistryModal = ({ isOpen, onClose, sections, title }: any) => {
    const { data: options } = useQuery({ 
        queryKey: ["settings-options"], 
        queryFn: async () => (await (await apiFetch("/api/v1/settings/options")).json()) 
    })

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-10">
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }} 
                        exit={{ scale: 0.95, opacity: 0, y: 20 }} 
                        className="glass-panel w-full max-w-5xl max-h-[90vh] overflow-hidden p-1 rounded-[40px] border border-white/10 flex flex-col bg-[#020617]/90"
                    >
                        <div className="p-8 pb-4 flex items-center justify-between border-b border-white/5 bg-white/2">
                            <div className="flex items-center space-x-6">
                                <div className="p-4 bg-blue-600/20 rounded-2xl text-blue-400 border border-blue-500/30 shadow-inner"><Layout size={28} /></div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase text-white tracking-tighter italic">{title || 'Registry Configuration'}</h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Global System Parameters & Enumerations</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 bg-white/5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 rounded-2xl transition-all border border-white/10 group">
                                <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-4">
                            {sections.map((s: any) => (
                                <ConfigSection 
                                    key={s.category} 
                                    title={s.title} 
                                    category={s.category} 
                                    icon={s.icon} 
                                    options={Array.isArray(options) ? options.filter((o:any) => o.category === s.category) : []} 
                                />
                            ))}
                        </div>

                        <div className="p-6 bg-white/2 border-t border-white/5 text-center">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">SysGrid Core Configuration Node // v3.0.0</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
