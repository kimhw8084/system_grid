import React, { useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Database, Globe, Layers, X, Edit2, RefreshCcw, Save, Settings, Play, Square, AlertCircle, Cpu, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

const ServiceModal = ({ service, onClose }: { service?: any, onClose: () => void }) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState(service || {
    name: '', service_type: 'Database', status: 'Running', version: '', environment: 'Production',
    config_json: {}, custom_attributes: {}
  })

  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await fetch('/api/v1/devices/')).json() })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = service ? `/api/v1/logical-services/${service.id}` : '/api/v1/logical-services/'
      const res = await fetch(url, { method: service ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['logical-services'] }); onClose() }
  })

  const updateConfig = (key: string, val: any) => {
    setFormData({ ...formData, config_json: { ...formData.config_json, [key]: val } })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[700px] max-h-[90vh] overflow-y-auto p-8 rounded-[30px] space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
           <h2 className="text-xl font-black uppercase tracking-tighter flex items-center space-x-3 text-blue-400">
              <Layers size={24} /><span>{service ? 'Configure Service Instance' : 'Register Service Payload'}</span>
           </h2>
           <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        <div className="grid grid-cols-2 gap-6">
           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest bg-white/5 px-2 py-1 rounded">Primary Registry</h3>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase">Service Name</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase">Service Type</label>
                <select value={formData.service_type} onChange={e => setFormData({...formData, service_type: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none">
                   <option>Database</option><option>Web</option><option>Middleware</option><option>Container</option><option>ToolStack</option><option>Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase">Version</label>
                    <input value={formData.version} onChange={e => setFormData({...formData, version: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase">Environment</label>
                    <select value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none">
                       <option>Production</option><option>QA</option><option>Dev</option>
                    </select>
                 </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase">Target Host (Device Mount)</label>
                <select value={formData.device_id} onChange={e => setFormData({...formData, device_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none">
                   <option value="">Floating / Not Mounted</option>
                   {devices?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest bg-white/5 px-2 py-1 rounded">Deep Configuration</h3>
              <AnimatePresence mode="wait">
                 {formData.service_type === 'Database' && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                         <input placeholder="DB Engine (e.g. MSSQL)" value={formData.config_json.engine} onChange={e => updateConfig('engine', e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none" />
                         <input placeholder="Port" value={formData.config_json.port} onChange={e => updateConfig('port', e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none" />
                      </div>
                      <input placeholder="SID / Service Name" value={formData.config_json.sid} onChange={e => updateConfig('sid', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none" />
                      <input placeholder="Data Path" value={formData.config_json.data_path} onChange={e => updateConfig('data_path', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none font-mono" />
                      <div className="flex items-center space-x-2">
                         <input type="checkbox" checked={formData.config_json.always_on} onChange={e => updateConfig('always_on', e.target.checked)} className="rounded bg-slate-900 border-white/10" />
                         <span className="text-[10px] uppercase font-black text-slate-500">Clustered / HA Enabled</span>
                      </div>
                   </motion.div>
                 )}
                 {formData.service_type === 'Web' && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <input placeholder="Base URL (https://...)" value={formData.config_json.url} onChange={e => updateConfig('url', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none font-mono" />
                      <input placeholder="Bindings (IP:Port)" value={formData.config_json.bindings} onChange={e => updateConfig('bindings', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none" />
                      <input placeholder="SSL Cert Expiry" type="date" value={formData.config_json.ssl_expiry} onChange={e => updateConfig('ssl_expiry', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none" />
                   </motion.div>
                 )}
                 {formData.service_type !== 'Database' && formData.service_type !== 'Web' && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/5 rounded-2xl opacity-40">
                      <Settings size={32} className="mb-2" />
                      <p className="text-[10px] font-black uppercase text-center">Use Metadata Registry for custom payloads</p>
                   </motion.div>
                 )}
              </AnimatePresence>
           </div>
        </div>

        <button onClick={() => mutation.mutate(formData)} className="w-full py-3 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Commit Service Registry</button>
      </motion.div>
    </div>
  )
}

export default function ServiceRegistry() {
  const queryClient = useQueryClient()
  const [activeModal, setActiveModal] = useState<any>(null)

  const { data: services, isLoading } = useQuery({ queryKey: ['logical-services'], queryFn: async () => (await fetch('/api/v1/logical-services/')).json() })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/logical-services/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['logical-services'] })
  })

  const columnDefs = [
    { field: 'id', headerName: '', width: 50, pinned: 'left' },
    { field: 'name', headerName: 'Instance Name', flex: 1, filter: true, cellClass: 'font-bold text-blue-100' },
    { 
      field: 'service_type', 
      headerName: 'Type', 
      width: 120, 
      cellRenderer: (p: any) => {
        const icons: any = { Database: <Database size={12}/>, Web: <Globe size={12}/>, Middleware: <Layers size={12}/> }
        return <div className="flex items-center space-x-2 h-full"><span className="text-slate-500">{icons[p.value] || <Settings size={12}/>}</span><span className="text-[10px] font-black uppercase">{p.value}</span></div>
      }
    },
    { 
      field: 'status', 
      headerName: 'Runtime', 
      width: 110,
      cellRenderer: (p: any) => (
        <div className="flex items-center h-full">
           <div className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${p.value === 'Running' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-rose-400 border-rose-500/30 bg-rose-500/10'}`}>{p.value}</div>
        </div>
      )
    },
    { field: 'version', headerName: 'Version', width: 90, cellClass: 'font-mono text-slate-500' },
    { field: 'device_name', headerName: 'Host Node', width: 140, cellClass: 'text-blue-400 font-bold uppercase' },
    { field: 'environment', headerName: 'Env', width: 100 },
    {
      headerName: 'Instance Operations',
      width: 180,
      pinned: 'right',
      cellRenderer: (p: any) => (
        <div className="flex items-center space-x-2 h-full">
           <button title="Start" className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"><Play size={14}/></button>
           <button title="Stop" className="p-1 text-rose-500 hover:bg-rose-500/10 rounded"><Square size={14}/></button>
           <div className="w-px h-3 bg-white/10 mx-1" />
           <button onClick={() => setActiveModal(p.data)} title="Configure" className="p-1 text-slate-400 hover:bg-white/10 rounded"><Edit2 size={14}/></button>
           <button onClick={() => deleteMutation.mutate(p.data.id)} title="Purge" className="p-1 text-slate-500 hover:text-rose-400 rounded"><Trash2 size={14}/></button>
        </div>
      )
    }
  ]

  return (
    <div className="h-full flex flex-col space-y-4 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase italic">Logical Service Matrix</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Consolidated Payload Registry (DB, Web, Middleware)</p>
        </div>
        <button onClick={() => setActiveModal({})} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
          + Provision Payload
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[120px]">
         {[
           { label: 'DB Instances', val: services?.filter((s:any)=>s.service_type==='Database').length || 0, icon: Database, color: 'text-amber-400', bg: 'bg-amber-500/10' },
           { label: 'Web Endpoints', val: services?.filter((s:any)=>s.service_type==='Web').length || 0, icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10' },
           { label: 'SLA Availability', val: '99.99%', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
         ].map((stat, i) => (
           <div key={i} className="glass-panel p-4 rounded-2xl flex items-center space-x-4 border-white/5">
              <div className={`p-3 rounded-xl ${stat.bg}`}><stat.icon size={20} className={stat.color}/></div>
              <div><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-tight">{stat.label}</p><p className="text-2xl font-black">{stat.val}</p></div>
           </div>
         ))}
      </div>

      <div className="flex-1 glass-panel rounded-xl overflow-hidden ag-theme-alpine-dark">
        <AgGridReact
          rowData={services || []}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, sortable: true, filter: true }}
          animateRows={false}
          headerHeight={32}
          rowHeight={32}
        />
      </div>

      <AnimatePresence>
        {activeModal && <ServiceModal service={Object.keys(activeModal).length > 0 ? activeModal : null} onClose={() => setActiveModal(null)} />}
      </AnimatePresence>

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: rgba(15, 23, 42, 0.9);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f8fafc;
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
