import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Database, ChevronDown, Check, Plus, Server, Globe } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { apiFetch } from "../../api/apiClient"
import toast from "react-hot-toast"

export function TenantSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['my-tenants'],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/tenants/me")
      if (!res.ok) return []
      return res.json()
    }
  })

  const selectMutation = useMutation({
    mutationFn: async (tenantId: number) => {
      const res = await apiFetch("/api/v1/tenants/select", {
        method: "POST",
        body: JSON.stringify({ tenant_id: tenantId })
      })
      if (!res.ok) throw new Error("Failed to switch database")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Database switched successfully")
      queryClient.invalidateQueries()
      // Reload the page to ensure all components refresh with new data context
      window.location.reload()
    },
    onError: (err: any) => {
      toast.error(err.message)
    }
  })

  const activeTenant = tenants?.find((t: any) => t.is_selected)

  return (
    <div className="relative z-[60]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all group"
      >
        <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/20">
           <Database size={14} />
        </div>
        <div className="flex flex-col items-start min-w-[120px]">
           <span className="text-[8px] font-black uppercase text-blue-400 tracking-widest leading-none">Active Database</span>
           <span className="text-[10px] font-black uppercase text-white truncate max-w-[150px]">
             {isLoading ? 'Loading...' : (activeTenant?.name || 'Default Engine')}
           </span>
        </div>
        <ChevronDown size={14} className={`text-blue-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full mt-2 right-0 w-64 bg-[#0f172a] border border-blue-500/20 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
            >
              <div className="p-4 border-b border-white/5 bg-white/2">
                 <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Switch Environment</h4>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                {tenants?.map((tenant: any) => (
                  <button
                    key={tenant.id}
                    onClick={() => {
                      if (!tenant.is_selected) selectMutation.mutate(tenant.id)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${tenant.is_selected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                  >
                    <div className="flex items-center gap-3">
                       <Server size={14} className={tenant.is_selected ? 'text-white' : 'text-slate-500'} />
                       <div className="flex flex-col items-start">
                          <span className="text-[11px] font-black uppercase tracking-wider">{tenant.name}</span>
                          <span className="text-[8px] font-bold uppercase opacity-60">{tenant.role}</span>
                       </div>
                    </div>
                    {tenant.is_selected && <Check size={14} />}
                  </button>
                ))}

                {(!tenants || tenants.length === 0) && !isLoading && (
                   <div className="p-4 text-center">
                      <p className="text-[10px] font-black uppercase text-slate-600 italic">No alternative databases found</p>
                   </div>
                )}
              </div>

              <div className="p-3 bg-black/20 border-t border-white/5">
                 <button 
                    onClick={() => {
                        setIsOpen(false);
                        // Navigate to settings tab for multi-tenancy if admin
                        window.location.href = '/settings?tab=tenants';
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-white/5 text-[9px] font-black uppercase text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                 >
                    <Plus size={12} /> Manage Databases
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
