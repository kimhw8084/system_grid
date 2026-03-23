import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Database, Globe, Layers, X, Edit2, RefreshCcw, Save, Settings, Play, Square, AlertCircle, Cpu, ShieldCheck, Info, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

const ServiceModal = ({ service, onClose }: { service?: any, onClose: () => void }) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState(service || {
    name: '', service_type: 'Database', status: 'Running', version: '', environment: 'Production',
    config_json: {}, custom_attributes: {}
  })
  const [attrKey, setAttrKey] = useState('')
  const [attrVal, setAttrKeyVal] = useState('')

  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: async () => (await fetch('/api/v1/devices/')).json() })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = service?.id ? `/api/v1/logical-services/${service.id}` : '/api/v1/logical-services/'
      const res = await fetch(url, { method: service?.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['logical-services'] }); onClose() }
  })

  const updateConfig = (key: string, val: any) => {
    setFormData({ ...formData, config_json: { ...formData.config_json, [key]: val } })
  }

  const addAttribute = () => {
    if (!attrKey) return
    setFormData({ ...formData, custom_attributes: { ...formData.custom_attributes, [attrKey]: attrVal } })
    setAttrKey(''); setAttrKeyVal('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[800px] max-h-[90vh] overflow-y-auto p-8 rounded-[30px] space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
           <h2 className="text-xl font-black uppercase tracking-tighter flex items-center space-x-3 text-blue-400">
              <Layers size={24} /><span>{service?.id ? 'Modify Service Layer' : 'Register Service Payload'}</span>
           </h2>
           <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        <div className="grid grid-cols-2 gap-8">
           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest bg-white/5 px-2 py-1 rounded">Primary Registry</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Service Instance Name</label>
                    <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase">Service Type</label>
                    <select value={formData.service_type} onChange={e => setFormData({...formData, service_type: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none">
                       <option>Database</option><option>Web</option><option>Middleware</option><option>Container</option><option>ToolStack</option><option>Other</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase">Environment</label>
                    <select value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none">
                       <option>Production</option><option>QA</option><option>Dev</option>
                    </select>
                 </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase">Target Host Node</label>
                <select value={formData.device_id || ''} onChange={e => setFormData({...formData, device_id: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none">
                   <option value="">Floating / Unassigned</option>
                   {devices?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest bg-white/5 px-2 py-1 rounded">Deep Configuration</h3>
              {formData.service_type === 'Database' ? (
                <div className="grid grid-cols-2 gap-3">
                   <input placeholder="Engine (Oracle/MSSQL)" value={formData.config_json.engine || ''} onChange={e => updateConfig('engine', e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none" />
                   <input placeholder="Port" value={formData.config_json.port || ''} onChange={e => updateConfig('port', e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none" />
                   <input placeholder="SID / Instance Name" value={formData.config_json.sid || ''} onChange={e => updateConfig('sid', e.target.value)} className="col-span-2 bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none" />
                   <input placeholder="Collation / Charset" value={formData.config_json.collation || ''} onChange={e => updateConfig('collation', e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none" />
                   <div className="flex items-center space-x-2 px-2"><input type="checkbox" checked={formData.config_json.ha} onChange={e => updateConfig('ha', e.target.checked)} /><span className="text-[9px] uppercase font-black text-slate-500">HA Pair</span></div>
                </div>
              ) : formData.service_type === 'Web' ? (
                <div className="space-y-2">
                   <input placeholder="Base URL" value={formData.config_json.url || ''} onChange={e => updateConfig('url', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none font-mono" />
                   <input placeholder="Binding (IP:Port)" value={formData.config_json.binding || ''} onChange={e => updateConfig('binding', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none" />
                   <input placeholder="SSL Expiry" type="date" value={formData.config_json.ssl || ''} onChange={e => updateConfig('ssl', e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] outline-none" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/5 rounded-2xl opacity-30 text-center">
                   <AlertCircle size={24} className="mb-2" />
                   <p className="text-[9px] font-black uppercase">Standard fields only. Use metadata below for specific stack detail.</p>
                </div>
              )}
           </div>

           <div className="col-span-2 space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Metadata Registry (Custom Attributes)</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                 {Object.entries(formData.custom_attributes || {}).map(([k, v]: [string, any]) => (
                   <div key={k} className="bg-slate-950 border border-white/10 rounded-full pl-3 pr-1 py-1 flex items-center space-x-2">
                      <span className="text-[9px] font-black uppercase text-blue-400">{k}:</span>
                      <span className="text-[10px] text-slate-300">{String(v)}</span>
                      <button onClick={() => {
                        const newAttrs = {...formData.custom_attributes}; delete newAttrs[k]; setFormData({...formData, custom_attributes: newAttrs})
                      }} className="p-1 hover:text-rose-400"><X size={10}/></button>
                   </div>
                 ))}
              </div>
              <div className="flex space-x-2">
                 <input placeholder="Attribute Key" value={attrKey} onChange={e => setAttrKey(e.target.value)} className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-amber-500/50" />
                 <input placeholder="Value" value={attrVal} onChange={e => setAttrKeyVal(e.target.value)} className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none" />
                 <button onClick={addAttribute} className="px-4 py-1.5 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-black uppercase">Add Key</button>
              </div>
           </div>
        </div>

        <button onClick={() => mutation.mutate(formData)} className="w-full py-3 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Commit Configuration</button>
      </motion.div>
    </div>
  )
}

const DetailsModal = ({ service, onClose }: { service: any, onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[500px] p-8 rounded-[30px] space-y-6">
       <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-xl font-black uppercase text-blue-400">Payload Detail</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
       </div>
       <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/5 p-3 rounded-xl"><p className="text-[9px] font-black text-slate-500 uppercase">Runtime Config</p>
                <div className="mt-2 space-y-1">{Object.entries(service.config_json || {}).map(([k,v]:any) => <p key={k} className="text-[10px]"><span className="text-slate-400 uppercase font-bold">{k}:</span> <span className="text-blue-100 font-mono">{String(v)}</span></p>)}</div>
             </div>
             <div className="bg-white/5 p-3 rounded-xl"><p className="text-[9px] font-black text-slate-500 uppercase">Metadata</p>
                <div className="mt-2 space-y-1">{Object.entries(service.custom_attributes || {}).map(([k,v]:any) => <p key={k} className="text-[10px]"><span className="text-slate-400 uppercase font-bold">{k}:</span> <span className="text-amber-100">{String(v)}</span></p>)}</div>
             </div>
          </div>
       </div>
       <button onClick={onClose} className="w-full py-2 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase">Close Inspection</button>
    </motion.div>
  </div>
)

export default function ServiceRegistry() {
  const queryClient = useQueryClient()
  const [activeModal, setActiveModal] = useState<any>(null)
  const [detailModal, setDetailModal] = useState<any>(null)

  const { data: services, isLoading } = useQuery({ queryKey: ['logical-services'], queryFn: async () => (await fetch('/api/v1/logical-services/')).json() })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/v1/logical-services/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['logical-services'] })
  })

  const typeCounts = useMemo(() => {
    if (!services) return {}
    return services.reduce((acc: any, s: any) => { acc[s.service_type] = (acc[s.service_type] || 0) + 1; return acc }, {})
  }, [services])

  const columnDefs = [
    { field: 'id', headerName: '', width: 50, pinned: 'left' },
    { field: 'name', headerName: 'Instance Name', flex: 1, filter: true, cellClass: 'font-bold text-blue-100' },
    { field: 'service_type', headerName: 'Service Type', width: 130, filter: true },
    { field: 'status', headerName: 'Runtime', width: 110, cellRenderer: (p: any) => <div className="flex items-center h-full"><div className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase ${p.value === 'Running' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-rose-400 border-rose-500/30 bg-rose-500/10'}`}>{p.value}</div></div> },
    { field: 'device_name', headerName: 'Host Node', width: 140, cellClass: 'text-blue-400 font-bold uppercase' },
    { field: 'environment', headerName: 'Env', width: 100 },
    {
      headerName: 'Registry Ops', width: 140, pinned: 'right',
      cellRenderer: (p: any) => (
        <div className="flex items-center space-x-2 h-full">
           <button onClick={() => setDetailModal(p.data)} title="Inspect" className="p-1 text-blue-400 hover:bg-blue-500/10 rounded"><Search size={14}/></button>
           <button onClick={() => setActiveModal(p.data)} title="Edit" className="p-1 text-slate-400 hover:bg-white/10 rounded"><Edit2 size={14}/></button>
           <button onClick={() => { if(confirm('Delete entry?')) deleteMutation.mutate(p.data.id) }} title="Purge" className="p-1 text-rose-400 hover:bg-rose-500/10 rounded"><Trash2 size={14}/></button>
        </div>
      )
    }
  ]

  return (
    <div className="h-full flex flex-col space-y-4 relative">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-black tracking-tight uppercase italic text-blue-400">Logical Service Matrix</h1><p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono">Consolidated Payload Registry</p></div>
        <button onClick={() => setActiveModal({})} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ Provision Payload</button>
      </div>

      <div className="flex space-x-4 overflow-x-auto pb-2 custom-scrollbar">
         {Object.entries(typeCounts).map(([type, count]: any) => (
           <div key={type} className="glass-panel px-6 py-3 rounded-2xl border-white/5 flex flex-col items-center justify-center min-w-[120px]">
              <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">{type}</p>
              <p className="text-xl font-black">{count}</p>
           </div>
         ))}
      </div>

      <div className="flex-1 glass-panel rounded-xl overflow-hidden ag-theme-alpine-dark">
        <AgGridReact rowData={services || []} columnDefs={columnDefs} defaultColDef={{ resizable: true, sortable: true, filter: true }} headerHeight={32} rowHeight={32} />
      </div>

      <AnimatePresence>
        {activeModal && <ServiceModal service={Object.keys(activeModal).length > 0 ? activeModal : null} onClose={() => setActiveModal(null)} />}
        {detailModal && <DetailsModal service={detailModal} onClose={() => setDetailModal(null)} />}
      </AnimatePresence>

      <style>{`
        .ag-theme-alpine-dark { --ag-background-color: transparent; --ag-header-background-color: rgba(15, 23, 42, 0.9); --ag-border-color: rgba(255, 255, 255, 0.05); --ag-foreground-color: #f8fafc; --ag-header-foreground-color: #94a3b8; --ag-font-family: 'Inter', sans-serif; --ag-font-size: 10px; }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-size: 9px !important; }
        .ag-cell { display: flex; align-items: center; padding-left: 8px !important; }
      `}</style>
    </div>
  )
}
