import React, { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Layers, X, Search, Edit2, Trash2, RefreshCcw, AlertCircle, Plus, LayoutGrid, Monitor, Database, Globe, Box, Settings, MoreVertical, FileJson, List } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AgGridReact } from "ag-grid-react"
import toast from "react-hot-toast"

const MetadataEditor = ({ value, onChange }: { value: any, onChange: (v: any) => void }) => {
  const [mode, setMode] = useState<'table' | 'json'>('table')
  const [tableRows, setTableRows] = useState(() => {
    const obj = typeof value === 'string' ? JSON.parse(value || '{}') : (value || {})
    return Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }))
  })
  const [jsonValue, setJsonValue] = useState(() => JSON.stringify(value || {}, null, 2))

  useEffect(() => {
    if (mode === 'table') {
      const obj: any = {}
      tableRows.forEach(r => { if (r.key) obj[r.key] = r.value })
      onChange(obj)
    } else {
      try { onChange(JSON.parse(jsonValue)) } catch (e) {}
    }
  }, [tableRows, jsonValue, mode])

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
         <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Service Configuration Payload</span>
         <div className="flex bg-black/40 rounded-lg p-1">
            <button onClick={() => setMode('table')} className={`px-2 py-1 rounded-md transition-all ${mode === 'table' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><List size={12}/></button>
            <button onClick={() => setMode('json')} className={`px-2 py-1 rounded-md transition-all ${mode === 'json' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><FileJson size={12}/></button>
         </div>
      </div>
      <div className="p-4 min-h-[120px]">
        {mode === 'table' ? (
          <div className="space-y-2">
            {tableRows.map((row, i) => (
              <div key={i} className="flex items-center space-x-2">
                <input value={row.key} onChange={e => {
                  const n = [...tableRows]; n[i].key = e.target.value; setTableRows(n)
                }} placeholder="Key" className="flex-1 bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-blue-500" />
                <input value={row.value} onChange={e => {
                  const n = [...tableRows]; n[i].value = e.target.value; setTableRows(n)
                }} placeholder="Values" className="flex-[2] bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-[11px] outline-none" />
                <button onClick={() => setTableRows(tableRows.filter((_, idx) => idx !== i))} className="text-slate-600 hover:text-rose-400"><X size={14}/></button>
              </div>
            ))}
            <button onClick={() => setTableRows([...tableRows, { key: '', value: '' }])} className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-2 hover:text-blue-300 transition-colors">+ Add Attribute</button>
          </div>
        ) : (
          <textarea value={jsonValue} onChange={e => setJsonValue(e.target.value)} className="w-full h-32 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-mono text-blue-300 outline-none" />
        )}
      </div>
    </div>
  )
}

export default function ServiceRegistry() {
  const queryClient = useQueryClient()
  const [activeModal, setActiveModal] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await fetch('/api/v1/settings/options')).json() })
  const { data: services, isLoading } = useQuery({ queryKey: ["logical-services"], queryFn: async () => (await fetch("/api/v1/logical-services/")).json() })
  const { data: devices } = useQuery({ queryKey: ["devices"], queryFn: async () => (await fetch("/api/v1/devices/")).json() })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/logical-services/${data.id}` : "/api/v1/logical-services/"
      const method = data.id ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["logical-services"] })
      toast.success("Service Registry Updated")
      setActiveModal(null)
    }
  })

  const bulkMutation = useMutation({
    mutationFn: async ({ action, payload = {} }: any) => {
      const res = await fetch('/api/v1/logical-services/bulk-action', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds, action, payload }) 
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logical-services"] })
      setSelectedIds([]); setShowBulkMenu(false)
      toast.success('Bulk Operation Complete')
    }
  })

  const columnDefs = useMemo(() => [
    { field: "id", headerName: "", width: 50, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left', cellClass: 'text-center', headerClass: 'text-center' },
    { 
      field: "name", 
      headerName: "Instance Name", 
      flex: 1, 
      pinned: 'left',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-2 h-full">
           {p.data.service_type === 'Database' && <Database size={12} className="text-amber-400" />}
           {p.data.service_type === 'Web Server' && <Globe size={12} className="text-blue-400" />}
           {p.data.service_type === 'Container' && <Box size={12} className="text-emerald-400" />}
           <span className="font-bold text-blue-100">{p.value}</span>
        </div>
      )
    },
    { field: "service_type", headerName: "Type", width: 120, cellClass: 'text-center', headerClass: 'text-center' },
    { 
      field: "status", 
      headerName: "Status", 
      width: 110, 
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = { Running: 'text-emerald-400 border-emerald-500/30', Degraded: 'text-amber-400 border-amber-500/30', Critical: 'text-rose-400 border-rose-500/30', Stopped: 'text-slate-400 border-slate-500/30' }
        return <div className="flex items-center justify-center h-full"><span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${colors[p.value] || 'text-slate-400 border-slate-500/30'}`}>{p.value}</span></div>
      }
    },
    { field: "device_name", headerName: "Host Node", width: 150, cellClass: "text-blue-400 font-bold text-center", headerClass: 'text-center' },
    { field: "environment", headerName: "Env", width: 100, cellClass: 'text-center', headerClass: 'text-center' },
    { field: "version", headerName: "Version", width: 100, cellClass: "font-mono text-slate-500 text-center", headerClass: 'text-center' },
    {
      headerName: "Ops",
      width: 100,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center space-x-2 h-full">
           <button onClick={() => setActiveModal(params.data)} className="p-1 hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 rounded transition-colors"><Edit2 size={14}/></button>
           <button onClick={() => { if(confirm('Purge this service instance?')) bulkMutation.mutate({ action: 'delete', ids: [params.data.id] }) }} className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded transition-colors"><Trash2 size={14}/></button>
        </div>
      )
    }
  ], [selectedIds]) as any

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }}
      className="h-full flex flex-col space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic">Logical Service Matrix</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Application Layer & Service Dependency Mapping</p>
           </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SEARCH PAYLOADS..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>

          <div className="relative">
            <button onClick={() => setShowBulkMenu(!showBulkMenu)} disabled={selectedIds.length === 0} className={`p-2 rounded-xl border transition-all ${selectedIds.length > 0 ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-slate-700 cursor-not-allowed'}`}><MoreVertical size={18}/></button>
            <AnimatePresence>
              {showBulkMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-2 space-y-1">
                   <p className="px-3 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">{selectedIds.length} Services Selected</p>
                   <button onClick={() => bulkMutation.mutate({ action: 'update', payload: { status: 'Running' } })} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-emerald-400 transition-all">Set Running</button>
                   <button onClick={() => bulkMutation.mutate({ action: 'update', payload: { status: 'Stopped' } })} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-slate-400 transition-all">Set Stopped</button>
                   <button onClick={() => bulkMutation.mutate({ action: 'update', payload: { environment: 'Production' } })} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-blue-400 transition-all">Set Prod Env</button>
                   <div className="h-px bg-white/5 mx-2 my-1" />
                   <button onClick={() => { if(confirm(`Terminate ${selectedIds.length} instances?`)) bulkMutation.mutate({ action: 'delete' }) }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-rose-500/20 rounded-lg text-rose-500 transition-all">Bulk Terminate</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={() => setActiveModal({})} className="bg-[#034EA2] hover:bg-blue-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ Provision Payload</button>
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
          quickFilterText={searchTerm}
        />
      </div>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[800px] max-h-[90vh] overflow-y-auto p-10 rounded-[40px] border-blue-500/30 custom-scrollbar">
               <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <h2 className="text-2xl font-black uppercase flex items-center space-x-4 text-blue-400">
                     <Layers size={28}/> <span>{activeModal.id ? 'Modify Service Configuration' : 'Register New Service Instance'}</span>
                  </h2>
                  <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
               </div>
               
               <ServiceForm initialData={activeModal} onSave={mutation.mutate} options={options} devices={devices} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-size: 9px !important; justify-content: center !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; padding-left: 8px !important; }
      `}</style>
    </motion.div>
  )
}

const ServiceForm = ({ initialData, onSave, options, devices }: any) => {
  const [formData, setFormData] = useState({ 
    name: "", service_type: "Database", status: "Running", environment: "Production", version: "",
    device_id: null, config_json: {}, ...initialData 
  })

  const getOptions = (cat: string) => Array.isArray(options) ? options.filter((o: any) => o.category === cat) : []

  return (
    <div className="space-y-8 py-6">
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
           <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-blue-600 pl-3">Identity & Deployment</h3>
           <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Service Instance Name *</label>
              <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500" placeholder="e.g. ERP-API-PROD" />
           </div>
           <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Target Host Node</label>
              <select value={formData.device_id || ""} onChange={e => setFormData({...formData, device_id: e.target.value || null})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none">
                 <option value="">Unassigned (Floating)</option>
                 {devices?.map((d:any)=><option key={d.id} value={d.id}>{d.name} [{d.type}]</option>)}
              </select>
           </div>
           <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Service Payload Type</label>
              <select value={formData.service_type} onChange={e => setFormData({...formData, service_type: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none">
                 <option>Database</option><option>Web Server</option><option>Middleware</option><option>Container</option><option>Microservice</option>
              </select>
           </div>
        </div>

        <div className="space-y-4">
           <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-emerald-600 pl-3">Operational Status</h3>
           <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Runtime Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none">
                 {getOptions('Status').map(o => <option key={o.id} value={o.value}>{o.label}</option>)}
                 {getOptions('Status').length === 0 && <><option>Running</option><option>Stopped</option><option>Maintenance</option></>}
              </select>
           </div>
           <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Environment</label>
              <select value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none">
                 {getOptions('Environment').map(o => <option key={o.id} value={o.value}>{o.label}</option>)}
                 {getOptions('Environment').length === 0 && <><option>Production</option><option>QA</option><option>Dev</option></>}
              </select>
           </div>
           <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Software Version</label>
              <input value={formData.version} onChange={e => setFormData({...formData, version: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none" placeholder="v2.1.0" />
           </div>
        </div>

        <div className="col-span-2">
           <MetadataEditor value={formData.config_json} onChange={v => setFormData({...formData, config_json: v})} />
        </div>
      </div>

      <div className="flex space-x-4 pt-4 border-t border-white/5">
        <button onClick={() => { if(!formData.name) return toast.error("Instance name required"); onSave(formData) }} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
           Commit Service Configuration
        </button>
      </div>
    </div>
  )
}
