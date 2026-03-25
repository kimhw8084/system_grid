import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Layers, X, Search, Edit2, Trash2, RefreshCcw, AlertCircle, Plus, LayoutGrid, Monitor, Database, Globe, Box, Settings } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AgGridReact } from "ag-grid-react"
import toast from "react-hot-toast"

const ServiceModal = ({ service, onClose }: any) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState(service || { 
    name: "", service_type: "Database", status: "Running", environment: "Production", version: "",
    device_id: null, config_json: {}, custom_attributes: {} 
  })
  const { data: devices } = useQuery({ queryKey: ["devices"], queryFn: async () => (await fetch("/api/v1/devices/")).json() })
  
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = service?.id ? `/api/v1/logical-services/${service.id}` : "/api/v1/logical-services/"
      const method = service?.id ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error("Service operation failed")
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["logical-services"] })
      toast.success(service?.id ? "Service updated" : "Service registered")
      onClose() 
    }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[700px] p-8 rounded-[30px] space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
           <h2 className="text-xl font-black uppercase tracking-tighter flex items-center space-x-3 text-blue-400">
              <Layers size={24} /><span>{service?.id ? 'Modify Service Layer' : 'Register Logical Payload'}</span>
           </h2>
           <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        <div className="grid grid-cols-2 gap-6">
           <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Service Instance Name *</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" placeholder="e.g. Oracle-DB-01" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Payload Type</label>
                <select value={formData.service_type} onChange={e => setFormData({...formData, service_type: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none">
                   <option>Database</option><option>Web Server</option><option>Middleware</option><option>Container</option><option>Microservice</option><option>Legacy App</option><option>Utility</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Target Host Node (Physical/Virtual)</label>
                <select value={formData.device_id || ""} onChange={e => setFormData({...formData, device_id: e.target.value || null})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none">
                   <option value="">Unassigned (Floating)</option>
                   {devices?.map((d:any)=><option key={d.id} value={d.id}>{d.name} [{d.type}]</option>)}
                </select>
              </div>
           </div>
           <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Operational Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none">
                   <option>Running</option><option>Stopped</option><option>Degraded</option><option>Critical</option><option>Maintenance</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Environment</label>
                <select value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none">
                   <option>Production</option><option>QA</option><option>Dev</option><option>DR</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Version / Release</label>
                <input value={formData.version} onChange={e => setFormData({...formData, version: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none" placeholder="v1.4.2" />
              </div>
           </div>
           
           <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Extended Configuration (JSON)</label>
              <textarea 
                value={typeof formData.config_json === 'string' ? formData.config_json : JSON.stringify(formData.config_json || {})} 
                onChange={e => setFormData({...formData, config_json: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none font-mono min-h-[80px]" 
                placeholder="{ 'port': 8080, 'ssl': true }"
              />
           </div>
        </div>

        <div className="flex space-x-3 pt-4 border-t border-white/5">
           <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white">Cancel</button>
           <button onClick={() => {
             if(!formData.name) return toast.error("Instance Name is required")
             let config = formData.config_json
             try { if(typeof config === 'string') config = JSON.parse(config) } catch { return toast.error("Invalid JSON config") }
             mutation.mutate({...formData, config_json: config})
           }} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
              Commit Payload configuration
           </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function ServiceRegistry() {
  const queryClient = useQueryClient()
  const [activeModal, setActiveModal] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data: services, isLoading } = useQuery({ 
    queryKey: ["logical-services"], 
    queryFn: async () => (await fetch("/api/v1/logical-services/")).json() 
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/logical-services/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["logical-services"] })
  })

  const columnDefs = useMemo(() => [
    { field: "id", headerName: "", width: 50, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left' },
    { 
      field: "name", 
      headerName: "Instance Name", 
      flex: 1, 
      filter: true, 
      pinned: 'left',
      cellRenderer: (p: any) => (
        <div className="flex items-center space-x-2 h-full">
           {p.data.service_type === 'Database' && <Database size={12} className="text-amber-400" />}
           {p.data.service_type === 'Web Server' && <Globe size={12} className="text-blue-400" />}
           {p.data.service_type === 'Container' && <Box size={12} className="text-emerald-400" />}
           <span className="font-bold text-blue-100">{p.value}</span>
        </div>
      )
    },
    { field: "service_type", headerName: "Type", width: 120, filter: true },
    { 
      field: "status", 
      headerName: "Status", 
      width: 110, 
      cellRenderer: (p: any) => {
        const colors: any = { Running: 'text-emerald-400 border-emerald-500/30', Degraded: 'text-amber-400 border-amber-500/30', Critical: 'text-rose-400 border-rose-500/30', Stopped: 'text-slate-400 border-slate-500/30' }
        return <div className="flex items-center h-full"><span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${colors[p.value] || 'text-slate-400 border-slate-500/30'}`}>{p.value}</span></div>
      }
    },
    { field: "device_name", headerName: "Host Node", width: 150, cellClass: "text-blue-400 font-bold", filter: true },
    { field: "environment", headerName: "Env", width: 100, filter: true },
    { field: "version", headerName: "Version", width: 100, cellClass: "font-mono text-slate-500" },
    {
      headerName: "Ops",
      width: 100,
      pinned: 'right',
      cellRenderer: (params: any) => (
        <div className="flex items-center space-x-2 h-full">
           <button onClick={() => setActiveModal(params.data)} className="p-1 hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 rounded transition-colors"><Edit2 size={14}/></button>
           <button onClick={() => { if(confirm('Terminate this service instance?')) deleteMutation.mutate(params.data.id) }} className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded transition-colors"><Trash2 size={14}/></button>
        </div>
      )
    }
  ], [deleteMutation])

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight italic">Logical Service Matrix</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Application Layer & Service Dependency Mapping</p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedIds.length > 0 && (
             <button onClick={() => { if(confirm(`Terminate ${selectedIds.length} instances?`)) toast.error("Bulk action not yet wired to backend") }} className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-black uppercase">Bulk Terminate</button>
          )}
          <button onClick={() => setActiveModal({})} className="px-6 py-2 bg-[#034EA2] text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
            + Provision Payload
          </button>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <RefreshCcw size={32} className="text-blue-400 animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Scanning Application Layer...</p>
          </div>
        )}
        <AgGridReact 
          rowData={services || []} 
          columnDefs={columnDefs} 
          rowSelection="multiple"
          headerHeight={28}
          rowHeight={28}
          onSelectionChanged={e => setSelectedIds(e.api.getSelectedNodes().map(n => n.data.id))} 
        />
      </div>

      <AnimatePresence>{activeModal && <ServiceModal service={activeModal?.id ? activeModal : null} onClose={() => setActiveModal(null)} />}</AnimatePresence>

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(15, 23, 42, 0.9);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 10px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-size: 9px !important; }
        .ag-cell { display: flex; align-items: center; padding-left: 8px !important; }
      `}</style>
    </div>
  )
}
