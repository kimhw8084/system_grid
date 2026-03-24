import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Layers, X, Search, Edit2, Trash2, RefreshCcw, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AgGridReact } from "ag-grid-react"

const ServiceModal = ({ service, onClose }: any) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState(service || { name: "", service_type: "Database", status: "Running", environment: "Production", config_json: {}, custom_attributes: {} })
  const [attrKey, setAttrKey] = useState(""); const [attrVal, setAttrVal] = useState("")
  const { data: devices } = useQuery({ queryKey: ["devices"], queryFn: async () => (await fetch("/api/v1/devices/")).json() })
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = service?.id ? `/api/v1/logical-services/${service.id}` : "/api/v1/logical-services/"
      return (await fetch(url, { method: service?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })).json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["logical-services"] }); onClose() }
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[800px] p-10 rounded-[40px] space-y-6">
        <h2 className="text-xl font-black uppercase text-blue-400">Payload Provisioning</h2>
        <div className="grid grid-cols-2 gap-6">
           <div className="space-y-4">
              <div><label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Service Instance Name</label>
              <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none" /></div>
              <div><label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Target Host Node</label>
              <select value={formData.device_id || ""} onChange={e => setFormData({...formData, device_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none">
                 <option value="">Unassigned</option>{devices?.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select></div>
           </div>
           <div className="space-y-4">
              <div className="flex items-center justify-between"><h3 className="text-[10px] font-black uppercase text-blue-400">Metadata Registry</h3><span className="text-[7px] text-slate-500 uppercase italic">Hint: Multiple items can be comma-separated</span></div>
              <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto">
                 {Object.entries(formData.custom_attributes || {}).map(([k,v]:any)=>(
                   <div key={k} onClick={()=>{setAttrKey(k); setAttrVal(String(v))}} className="bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-[9px] cursor-pointer hover:bg-blue-500/20 transition-all flex items-center space-x-2">
                      <span className="font-black text-blue-400">{k}:</span><span>{String(v)}</span>
                   </div>
                 ))}
              </div>
              <div className="flex space-x-2">
                 <div className="flex-1"><label className="text-[8px] font-black text-slate-600 uppercase block mb-1">Key</label><input value={attrKey} onChange={e=>setAttrKey(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-lg px-2 py-1 text-xs outline-none" /></div>
                 <div className="flex-1"><label className="text-[8px] font-black text-slate-600 uppercase block mb-1">Value(s)</label><input value={attrVal} onChange={e=>setAttrVal(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-lg px-2 py-1 text-xs outline-none" /></div>
                 <button onClick={()=>{if(attrKey){setFormData({...formData, custom_attributes:{...formData.custom_attributes, [attrKey]:attrVal}}); setAttrKey(""); setAttrVal("")}}} className="self-end px-3 py-1 bg-blue-600 rounded-lg text-[9px] font-black uppercase">Add</button>
              </div>
           </div>
        </div>
        <div className="flex space-x-3 pt-4 border-t border-white/5">
           <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white">Cancel</button>
           <button onClick={()=>mutation.mutate(formData)} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Commit configuration</button>
        </div>
      </motion.div>
    </div>
  )
}

export default function ServiceRegistry() {
  const queryClient = useQueryClient(); const [activeModal, setActiveModal] = useState<any>(null); const [selectedIds, setSelectedIds] = useState<number[]>([])
  const { data: services, isLoading } = useQuery({ queryKey: ["logical-services"], queryFn: async () => (await fetch("/api/v1/logical-services/")).json() })
  const columnDefs = [
    { field: "id", headerName: "", width: 50, checkboxSelection: true, headerCheckboxSelection: true },
    { field: "name", headerName: "Instance Name", flex: 1, filter: true, cellClass: "font-bold text-blue-100" },
    { field: "status", headerName: "Status", width: 110, cellRenderer: (p:any)=><span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-white/10">{p.value}</span> },
    { field: "device_name", headerName: "Host Node", width: 140, cellClass: "text-blue-400 font-bold" }
  ]
  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase text-blue-400 italic">Logical Service Matrix</h1>
        <button onClick={()=>setActiveModal({})} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">+ Provision Payload</button>
      </div>
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        <AgGridReact rowData={services || []} columnDefs={columnDefs} onSelectionChanged={e=>setSelectedIds(e.api.getSelectedNodes().map(n=>n.data.id))} />
      </div>
      <AnimatePresence>{activeModal && <ServiceModal service={activeModal?.id ? activeModal : null} onClose={()=>setActiveModal(null)} />}</AnimatePresence>
    </div>
  )
}
