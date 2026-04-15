import React, { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Layers, X, Search, Edit2, Trash2, RefreshCcw, AlertCircle, Plus, LayoutGrid, Monitor, Database, Globe, Box, Settings, MoreVertical, FileJson, List, Sliders, Tag, Check, ExternalLink, Shield, Package, Workflow, Cpu, Activity, Zap, Clipboard, FileText, Eye } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AgGridReact } from "ag-grid-react"
import toast from "react-hot-toast"
import { apiFetch } from "../api/apiClient"
import { ConfigRegistryModal } from "./ConfigRegistry"
import { ConfirmationModal } from "./shared/ConfirmationModal"
import { StyledSelect } from "./shared/StyledSelect"

const MetadataEditor = ({ value, onChange, onError }: { value: any, onChange: (v: any) => void, onError?: (err: string | null) => void }) => {
  const [mode, setMode] = useState<'table' | 'json'>('table')
  const [tableRows, setTableRows] = useState(() => {
    const obj = typeof value === 'string' ? JSON.parse(value || '{}') : (value || {})
    return Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }))
  })
  const [jsonValue, setJsonValue] = useState(() => JSON.stringify(value || {}, null, 2))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const obj = typeof value === 'string' ? JSON.parse(value || '{}') : (value || {})
    setTableRows(Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) })))
    setJsonValue(JSON.stringify(obj, null, 2))
  }, [value])

  const validateAndNotify = (rows: {key: string, value: string}[]) => {
    const obj: any = {}
    const keys = new Set()
    let hasDuplicate = false
    rows.forEach(r => {
      if (r.key) {
        if (keys.has(r.key)) hasDuplicate = true
        keys.add(r.key)
        obj[r.key] = r.value
      }
    })
    if (hasDuplicate) {
        setError("Duplicate keys detected")
        onError?.("Duplicate keys detected")
        return false
    } else {
        setError(null)
        onError?.(null)
        setJsonValue(JSON.stringify(obj, null, 2))
        onChange(obj)
        return true
    }
  }

  const syncFromJSON = (json: string) => {
    try {
        const obj = JSON.parse(json)
        const rows = Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }))
        setTableRows(rows)
        setError(null)
        onError?.(null)
        onChange(obj)
        return true
    } catch (e) {
        setError("Invalid JSON format")
        onError?.("Invalid JSON format")
        return false
    }
  }

  return (
    <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/5">
         <div className="flex items-center space-x-3">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 ">Configuration Metadata</span>
            {error && <span className="text-[8px] font-bold text-rose-500 uppercase animate-pulse ">!! {error}</span>}
         </div>
         <div className="flex bg-black/40 rounded-lg p-0.5">
            <button onClick={() => setMode('table')} className={`p-1.5 rounded-md transition-all ${mode === 'table' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><List size={10}/></button>
            <button onClick={() => setMode('json')} className={`p-1.5 rounded-md transition-all ${mode === 'json' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><FileJson size={10}/></button>
         </div>
      </div>
      <div className="p-3 min-h-[100px]">
        {mode === 'table' ? (
          <div className="space-y-1">
            {tableRows.map((row, i) => (
              <div key={i} className="flex items-center space-x-2">
                <input value={row.key} onChange={e => {
                  const n = [...tableRows]; n[i].key = e.target.value; 
                  setTableRows(n); validateAndNotify(n);
                }} placeholder="Key" className={`flex-1 bg-black/40 border ${error === 'Duplicate keys detected' ? 'border-rose-500/50' : 'border-white/5'} rounded-lg px-2 py-1 text-[10px] outline-none focus:border-blue-500 font-bold uppercase `} />
                <input value={row.value} onChange={e => {
                  const n = [...tableRows]; n[i].value = e.target.value; 
                  setTableRows(n); validateAndNotify(n);
                }} placeholder="Value" className="flex-[2] bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-[10px] outline-none font-bold text-slate-300" />
                <button onClick={() => {
                    const n = tableRows.filter((_, idx) => idx !== i);
                    setTableRows(n); validateAndNotify(n);
                }} className="text-slate-600 hover:text-rose-400"><X size={12}/></button>
              </div>
            ))}
            <button onClick={() => {
                const n = [...tableRows, { key: '', value: '' }];
                setTableRows(n);
            }} className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mt-1 hover:text-blue-300 transition-colors ">+ Append Attribute</button>
          </div>
        ) : (
          <textarea value={jsonValue} onChange={e => {
            setJsonValue(e.target.value);
            syncFromJSON(e.target.value);
          }} className={`w-full h-24 bg-black/40 border ${error === 'Invalid JSON format' ? 'border-rose-500/50' : 'border-white/5'} rounded-xl px-3 py-2 text-[10px] font-mono text-blue-300 outline-none`} />
        )}
      </div>
    </div>
  )
}

const MetadataViewer = ({ data }: { data: any }) => {
  let obj: any = {}
  try {
    obj = typeof data === 'string' ? JSON.parse(data || '{}') : (data || {})
  } catch {
    obj = {}
  }
  return (
    <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
      <div className="px-3 py-1.5 bg-white/5 border-b border-white/5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 ">Configuration Metadata</span>
      </div>
      <table className="w-full text-[10px]">
        <thead className="bg-white/5 border-b border-white/5">
          <tr>
            <th className="px-4 py-1.5 text-left font-bold uppercase tracking-widest text-slate-500 ">Key</th>
            <th className="px-4 py-1.5 text-left font-bold uppercase tracking-widest text-slate-500 ">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {Object.entries(obj).map(([k, v]) => (
            <tr key={k} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-2 font-bold uppercase text-blue-400  w-1/3">{k}</td>
              <td className="px-4 py-2 font-bold text-slate-300 truncate max-w-[200px]">{String(v)}</td>
            </tr>
          ))}
          {Object.keys(obj).length === 0 && (
            <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-600 font-bold uppercase  tracking-widest">No metadata keys documented</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const ServiceSecretsTab = ({ serviceId }: { serviceId: number }) => {
  const queryClient = useQueryClient()
  const { data: services } = useQuery({ queryKey: ['logical-services'] })
  const service = (services as any[])?.find((s: any) => s.id === serviceId)
  const [newSecret, setNewSecret] = useState({ username: '', password: '', note: '' })

  const addMutation = useMutation({
    mutationFn: async (data: any) => apiFetch(`/api/v1/logical-services/${serviceId}/secrets`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['logical-services'] }); setNewSecret({ username: '', password: '', note: '' }); toast.success('Credential Added') }
  })

  const deleteMutation = useMutation({
    mutationFn: async (secretId: number) => apiFetch(`/api/v1/logical-services/${serviceId}/secrets/${secretId}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['logical-services'] }); toast.success('Credential Revoked') }
  })

  return (
    <div className="space-y-4">
      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3">
        <h3 className="text-[9px] font-bold uppercase text-blue-400 tracking-widest ">Identity Registry</h3>
        <div className="grid grid-cols-3 gap-2">
          <input value={newSecret.username} onChange={e => setNewSecret({...newSecret, username: e.target.value})} placeholder="Username / ID" className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold uppercase outline-none focus:border-blue-500 " />
          <input type="password" value={newSecret.password} onChange={e => setNewSecret({...newSecret, password: e.target.value})} placeholder="Access Password" className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500" />
          <input value={newSecret.note} onChange={e => setNewSecret({...newSecret, note: e.target.value})} placeholder="Purpose / Note" className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold uppercase outline-none focus:border-blue-500 " />
        </div>
        <button 
          disabled={!newSecret.username || !newSecret.password}
          onClick={() => addMutation.mutate(newSecret)}
          className="w-full py-2 bg-blue-600/10 text-blue-400 border border-blue-500/30 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30"
        >
          Inject Secret into Vault
        </button>
      </div>

      <div className="space-y-1">
        {service?.secrets?.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl group transition-all hover:border-white/20">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600/10 p-1.5 rounded-lg text-blue-400"><Tag size={14}/></div>
              <div className="min-w-[100px]">
                <p className="text-[10px] font-bold text-white uppercase ">{s.username}</p>
                <p className="text-[9px] font-mono text-slate-600">••••••••</p>
              </div>
              <div className="border-l border-white/10 pl-4 max-w-[300px] truncate">
                <p className="text-[8px] font-bold text-slate-600 uppercase mb-0.5 ">Note</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase truncate  tracking-tighter">{s.note || '---'}</p>
              </div>
            </div>
            <button onClick={() => deleteMutation.mutate(s.id)} className="p-1.5 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
          </div>
        ))}
        {!service?.secrets?.length && <div className="py-10 text-center text-slate-700  text-[9px] font-bold uppercase tracking-widest">No vault entries documented</div>}
      </div>
    </div>
  )
}

export const ServiceDetailsView = ({ service, options, devices }: { service: any, options: any, devices: any }) => {
    const queryClient = useQueryClient()
    const [tab, setTab] = useState('metadata')
    const [metadataError, setMetadataError] = useState<string | null>(null)
    const [formData, setFormData] = useState({ ...service })

    const updateMutation = useMutation({
        mutationFn: async (data: any) => apiFetch(`/api/v1/logical-services/${service.id}`, { 
            method: 'PUT', body: JSON.stringify(data) 
        }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['logical-services'] }); toast.success('Service Registry Synced') }
    })

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex space-x-0.5 bg-black/40 p-0.5 rounded-xl w-fit border border-white/5">
                    {[
                      {id: 'metadata', label: 'Matrix', icon: List}, 
                      {id: 'editor', label: 'Editor', icon: Edit2}, 
                      {id: 'secrets', label: 'Vault', icon: Tag}
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center space-x-2 ${tab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                            <t.icon size={12}/> <span>{t.label}</span>
                        </button>
                    ))}
                </div>
                {tab === 'editor' && (
                  <button 
                    onClick={() => updateMutation.mutate(formData)} 
                    disabled={!!metadataError}
                    className="px-5 py-1.5 bg-emerald-600 disabled:opacity-30 text-white rounded-xl text-[9px] font-bold uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all "
                  >
                    Commit Metadata
                  </button>
                )}
            </div>
            
            <div className="glass-panel rounded-[30px] border-white/5 overflow-hidden p-6 bg-black/20">
                {tab === 'metadata' && <MetadataViewer data={formData.config_json} />}
                {tab === 'editor' && (
                  <MetadataEditor 
                    value={formData.config_json} 
                    onChange={v => setFormData({...formData, config_json: v})} 
                    onError={setMetadataError}
                  />
                )}
                {tab === 'secrets' && <ServiceSecretsTab serviceId={service.id} />}
            </div>
        </div>
    )
}

export const ServiceForm = ({ initialData, onSave, options, devices }: any) => {
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [formData, setFormData] = useState({ 
    name: "", service_type: "Database", status: "Active", environment: "Production", version: "",
    device_id: null, config_json: {}, 
    license_key: "", purchase_type: "One-time", 
    purchase_date: "", expiry_date: "", installation_date: "", 
    purpose: "", documentation_link: "", cost: 0, currency: "USD", 
    manufacturer: "", supplier: "",
    ...initialData 
  })

  const getOptions = (cat: string) => Array.isArray(options) ? options.filter((o: any) => o.category === cat) : []

  useEffect(() => {
    if (!initialData.id) {
      const selectedType = getOptions('ServiceType').find(o => o.value === formData.service_type);
      if (selectedType?.metadata_keys) {
        const newConfig: any = {};
        selectedType.metadata_keys.forEach((key: string) => { newConfig[key] = ""; });
        setFormData(prev => ({ ...prev, config_json: newConfig }));
      } else {
        setFormData(prev => ({ ...prev, config_json: {} }));
      }
    }
  }, [formData.service_type, options, initialData.id]);

  return (
    <div className="space-y-6 py-4 font-bold uppercase tracking-tight">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
           <h3 className="text-[9px] font-bold uppercase text-slate-500 tracking-widest border-l-2 border-blue-600 pl-3 ">Identity & Logical Deployment</h3>
           <div className="grid grid-cols-2 gap-3">
             <div className="col-span-2">
                <label className="text-[8px] font-bold text-slate-400 uppercase block mb-1 px-1 ">Service Identifier *</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`w-full bg-slate-900 border ${!formData.name ? 'border-rose-500/50' : 'border-white/10'} rounded-xl px-3 py-2 text-xs font-bold uppercase  text-white outline-none focus:border-blue-500`} placeholder="E.G. ERP_DB_PROD_01" />
             </div>
             <StyledSelect label="Host Node" value={formData.device_id || ""} onChange={e => setFormData({...formData, device_id: e.target.value ? parseInt(e.target.value) : null})} options={devices?.map((d:any)=>({ value: String(d.id), label: `${d.name} [${d.type}]` })) || []} placeholder="Unassigned (Floating)" />
             <StyledSelect label="Matrix Type" value={formData.service_type} onChange={e => setFormData(prev => ({...prev, service_type: e.target.value}))} options={getOptions('ServiceType').length > 0 ? getOptions('ServiceType') : ["Database", "Web Server", "Middleware", "Container", "OS", "Vendor Software", "Internal App", "External App", "ToolStack"].map(t => ({ value: t, label: t }))} />
           </div>
           <div className="grid grid-cols-2 gap-3">
             <div><label className="text-[8px] font-bold text-slate-400 uppercase block mb-1 px-1 ">Deployment Date</label><input type="date" value={formData.installation_date ? formData.installation_date.split('T')[0] : ""} onChange={e => setFormData({...formData, installation_date: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500" /></div>
             <div><label className="text-[8px] font-bold text-slate-400 uppercase block mb-1 px-1 ">Software Version</label><input value={formData.version || ""} onChange={e => setFormData({...formData, version: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500" placeholder="v1.0.0" /></div>
           </div>
           <div><label className="text-[8px] font-bold text-slate-400 uppercase block mb-1 px-1 ">Mission Objective</label><textarea value={formData.purpose || ""} onChange={e => setFormData({...formData, purpose: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold uppercase  outline-none focus:border-blue-500 h-16 resize-none" placeholder="Primary transactional store..." /></div>
        </div>

        <div className="space-y-4">
           <h3 className="text-[9px] font-bold uppercase text-slate-500 tracking-widest border-l-2 border-emerald-600 pl-3 ">Runtime Configuration</h3>
           <div className="grid grid-cols-2 gap-3">
             <StyledSelect label="Runtime State" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={getOptions('Status').length > 0 ? getOptions('Status') : [{value: 'Active', label: 'Active'}, {value: 'Stopped', label: 'Stopped'}]} />
             <StyledSelect label="Environment" value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})} options={getOptions('Environment').length > 0 ? getOptions('Environment') : [{value: 'Production', label: 'Production'}]} />
           </div>
           <div className="col-span-2 mt-4"><MetadataEditor value={formData.config_json} onChange={v => setFormData({...formData, config_json: v})} onError={setMetadataError} /></div>
        </div>

        <div className="col-span-2 space-y-4 bg-white/5 p-4 rounded-3xl border border-white/5">
           <h3 className="text-[9px] font-bold uppercase text-slate-500 tracking-widest ">Licensing & Procurement Artifacts</h3>
           <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1"><label className="text-[7px] font-bold text-slate-500 uppercase px-1 ">Purchase Model</label><select value={formData.purchase_type || "One-time"} onChange={e => setFormData({...formData, purchase_type: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[9px] font-bold uppercase  outline-none focus:border-blue-500"><option value="One-time">Purchase</option><option value="Subscription">SaaS</option><option value="OEM">OEM</option><option value="Free">OpenSource</option></select></div>
              <div className="space-y-1"><label className="text-[7px] font-bold text-slate-500 uppercase px-1 ">Developer</label><input value={formData.manufacturer || ""} onChange={e => setFormData({...formData, manufacturer: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[9px] font-bold uppercase  outline-none focus:border-blue-500" placeholder="Developer" /></div>
              <div className="space-y-1"><label className="text-[7px] font-bold text-slate-500 uppercase px-1 ">License Key</label><input value={formData.license_key || ""} onChange={e => setFormData({...formData, license_key: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[9px] font-mono outline-none focus:border-blue-500" placeholder="XXXX-XXXX" /></div>
              <div className="space-y-1"><label className="text-[7px] font-bold text-slate-500 uppercase px-1 ">Expiry Date</label><input type="date" value={formData.expiry_date ? formData.expiry_date.split('T')[0] : ""} onChange={e => setFormData({...formData, expiry_date: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[9px] font-bold outline-none focus:border-blue-500" /></div>
           </div>
        </div>
      </div>

      <button onClick={() => { if(!formData.name) return toast.error("Instance name required"); onSave(formData) }} disabled={!!metadataError} className="w-full py-4 bg-blue-600 disabled:opacity-30 text-white rounded-2xl text-[11px] font-bold uppercase tracking-[0.3em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all ">Commit Service Registration</button>
    </div>
  )
}

export default function ServiceRegistry() {
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(10)
  const [showStyleLab, setShowStyleLab] = useState(true)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([])

  const [activeModal, setActiveModal] = useState<any>(null)
  const [activeDetails, setActiveDetails] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'purged'>('active')
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false)
  const [isBulkEnvOpen, setIsBulkEnvOpen] = useState(false)
  const [isBulkHostOpen, setIsBulkHostOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' })

  const openConfirm = (title: string, message: string, onConfirm: () => void, variant: any = 'danger') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, variant })
  }

  const { data: options } = useQuery({ queryKey: ['settings-options'], queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) })
  const { data: allServices, isLoading } = useQuery({ queryKey: ["logical-services"], queryFn: async () => (await (await apiFetch("/api/v1/logical-services/?include_deleted=true")).json()) })
  const services = useMemo(() => {
    if (!allServices) return []
    return activeTab === 'active' ? allServices.filter((s: any) => !s.is_deleted) : allServices.filter((s: any) => s.is_deleted)
  }, [allServices, activeTab])

  useEffect(() => { if (gridRef.current?.api) setTimeout(() => gridRef.current.api.autoSizeAllColumns(), 100); }, [fontSize, rowDensity, services]);
  const { data: devices } = useQuery({ queryKey: ["devices"], queryFn: async () => (await (await apiFetch("/api/v1/devices/")).json()) })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/logical-services/${data.id}` : "/api/v1/logical-services/"
      const res = await apiFetch(url, { method: data.id ? "PUT" : "POST", body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["logical-services"] }); toast.success("Registry Updated"); setActiveModal(null); }
  })

  const bulkMutation = useMutation({
    mutationFn: async ({ action, payload = {}, ids = selectedIds }: any) => {
      const res = await apiFetch('/api/v1/logical-services/bulk-action', { method: 'POST', body: JSON.stringify({ ids, action, payload }) })
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["logical-services"] }); setSelectedIds([]); setShowBulkMenu(false); setIsBulkStatusOpen(false); setIsBulkEnvOpen(false); setIsBulkHostOpen(false); toast.success('Operation Complete') }
  })

  const columnDefs = useMemo(() => [
    { 
      headerName: "", 
      width: 50,
      minWidth: 50,
      maxWidth: 50,
      checkboxSelection: true, 
      headerCheckboxSelection: true, 
      pinned: 'left', 
      cellClass: 'flex items-center justify-center border-r border-white/5 pl-2', 
      headerClass: 'flex items-center justify-center border-r border-white/5 pl-2', 
      suppressSizeToFit: true,
      resizable: false,
      sortable: false,
      filter: false,
      suppressHide: true
    },
    { field: "id", headerName: "ID", width: 80, cellClass: 'text-center font-bold text-slate-500', headerClass: 'text-center', filter: 'agNumberColumnFilter' },
    { field: "name", headerName: "Instance Identifier", pinned: 'left', flex: 1.2, filter: true, cellClass: 'text-left font-bold uppercase text-blue-400', headerClass: 'text-left', hide: hiddenColumns.includes("name") },
    { 
      field: "service_type", 
      headerName: "Matrix Type", 
      width: 120, filter: true, cellClass: 'text-center', headerClass: 'text-center',
      cellRenderer: (p: any) => <span className={`font-bold uppercase ${p.value === 'Database' ? 'text-amber-400' : p.value === 'OS' ? 'text-rose-400' : 'text-blue-400'}`}>{p.value || 'N/A'}</span>,
      hide: hiddenColumns.includes("service_type")
    },
    { 
      field: "status", 
      headerName: "Runtime State", 
      width: 130, filter: true, cellClass: 'text-center', headerClass: 'text-center',
      cellRenderer: (p: any) => <div className="flex items-center justify-center h-full"><div className={`flex items-center justify-center w-24 h-6 rounded-md border shadow-sm font-bold uppercase tracking-tighter ${p.value === 'Active' ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/20' : 'text-slate-400 border-white/20 bg-white/10'}`}>{p.value || 'Unknown'}</div></div>,
      hide: hiddenColumns.includes("status")
    },
    { field: "device_name", headerName: "Host Node", width: 140, filter: true, cellClass: "font-bold text-center uppercase text-indigo-400", headerClass: 'text-center', hide: hiddenColumns.includes("device_name") },
    { field: "environment", headerName: "Env", width: 90, filter: true, cellClass: 'text-center font-bold uppercase text-slate-500', headerClass: 'text-center', hide: hiddenColumns.includes("environment") },
    { field: "version", headerName: "Version", width: 80, filter: true, cellClass: "font-bold text-center text-slate-400", headerClass: 'text-center', hide: hiddenColumns.includes("version") },
    { field: "cost", headerName: "Procurement", width: 110, filter: true, cellClass: 'text-center font-bold text-white', headerClass: 'text-center', cellRenderer: (p: any) => p.value ? `${p.data.currency === 'KRW' ? '₩' : '$'}${p.value.toLocaleString()}` : <span className="text-slate-700">---</span>, hide: hiddenColumns.includes("cost") },
    {
      headerName: "Ops", width: 140, pinned: 'right', cellClass: 'text-center', headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex rounded-lg p-0.5 border border-white/5 bg-transparent">
               <button onClick={() => setActiveDetails(p.data)} title="View Detail Matrix" className="p-1.5 text-blue-400 hover:text-blue-200 transition-all border-r border-white/5"><Eye size={14}/></button>
               <button onClick={() => setActiveModal(p.data)} title="Modify Config" className="p-1.5 text-emerald-400 hover:text-emerald-200 transition-all border-r border-white/5"><Edit2 size={14}/></button>
               <button onClick={() => openConfirm('Purge Registry', 'Terminate this service instance?', () => bulkMutation.mutate({ action: activeTab === 'active' ? 'delete' : 'purge', ids: [p.data.id] }))} title="Terminate" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      )
    }
  ], [selectedIds, activeTab, fontSize, hiddenColumns]) as any

  const autoSizeStrategy = useMemo(() => ({
    type: 'fitCellContents' as const
  }), []);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div><h1 className="text-2xl font-bold uppercase tracking-tight ">Services</h1><p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1 ">Logical Service Registry & Logic Matrix</p></div>
           <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 ml-2">
              <button onClick={() => { setActiveTab('active'); setSelectedIds([]) }} className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>Existing</button>
              <button onClick={() => { setActiveTab('purged'); setSelectedIds([]) }} className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'purged' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-slate-300'}`}>Purged</button>
           </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SCAN LOGIC..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-blue-500/50 w-64 transition-all" /></div>
          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5 space-x-1">
             <button onClick={() => setShowStyleLab(!showStyleLab)} className={`p-1.5 rounded-lg transition-all ${showStyleLab ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/10 text-slate-500'}`} title="Style Lab"><Activity size={16} /></button>
             <button onClick={() => setShowColumnPicker(!showColumnPicker)} className={`p-1.5 rounded-lg transition-all ${showColumnPicker ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/10 text-slate-500'}`} title="Column Configuration"><Sliders size={16} /></button>
             <button onClick={() => setShowConfig(true)} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Registry Enums"><Settings size={16} /></button>
          </div>
          <div className="relative bulk-menu-container">
            <button onClick={() => setShowBulkMenu(!showBulkMenu)} disabled={selectedIds.length === 0} className={`p-1.5 rounded-xl border transition-all ${selectedIds.length > 0 ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-slate-700 cursor-not-allowed'}`}><MoreVertical size={18}/></button>
            <AnimatePresence>{showBulkMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute right-0 mt-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-2 space-y-1"><p className="px-3 py-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1 ">{selectedIds.length} Services Selected</p>
                   {activeTab === 'active' ? (<><button onClick={() => { setIsBulkStatusOpen(true); setShowBulkMenu(false); }} className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase hover:bg-white/5 rounded-lg text-blue-400 ">Set Status...</button><button onClick={() => { setIsBulkEnvOpen(true); setShowBulkMenu(false); }} className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase hover:bg-white/5 rounded-lg text-emerald-400 ">Set Env...</button><button onClick={() => { setIsBulkHostOpen(true); setShowBulkMenu(false); }} className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase hover:bg-white/5 rounded-lg text-amber-400 ">Set Host...</button><div className="h-px bg-white/5 mx-2 my-1" /><button onClick={() => openConfirm('Bulk Terminate', `Terminate ${selectedIds.length} instances?`, () => bulkMutation.mutate({ action: 'delete' }))} className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase hover:bg-rose-500/20 rounded-lg text-rose-500 ">Bulk Purge</button></>) : (<button onClick={() => bulkMutation.mutate({ action: 'restore' })} className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase hover:bg-white/5 rounded-lg text-emerald-400 ">Restore Selected</button>)}
                </motion.div>
            )}</AnimatePresence>
          </div>
          <button onClick={() => setActiveModal({})} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all ">+ Register Service</button>
        </div>
      </div>

      <AnimatePresence>{showStyleLab && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md">
               <div className="flex items-center space-x-12">
                  <div className="flex items-center space-x-3"><Activity size={16} className="text-blue-400" /><span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 ">View Density Laboratory</span></div>
                  <div className="flex items-center space-x-6">
                     <div className="flex items-center space-x-4"><span className="text-[9px] font-bold text-slate-500 uppercase ">Font Size</span><div className="flex items-center space-x-2"><input type="range" min="8" max="14" step="1" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-32 accent-blue-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"/><span className="text-[10px] text-white w-4 font-bold">{fontSize}px</span></div></div>
                     <div className="flex items-center space-x-4 border-l border-white/10 pl-6"><span className="text-[9px] font-bold text-slate-500 uppercase ">Row Density</span><div className="flex items-center space-x-2"><input type="range" min="4" max="24" step="2" value={rowDensity} onChange={e => setRowDensity(Number(e.target.value))} className="w-32 accent-indigo-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"/><span className="text-[10px] text-white w-4 font-bold">{rowDensity}px</span></div></div>
                  </div>
               </div>
               <button onClick={() => setShowStyleLab(false)} className="text-slate-500 hover:text-white transition-colors"><X size={16}/></button>
            </div>
          </motion.div>
      )}</AnimatePresence>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4 text-blue-400"><RefreshCcw size={32} className="animate-spin" /><p className="text-[10px] font-bold uppercase tracking-[0.3em] ">Scanning Logic Matrix...</p></div>}
        <AgGridReact ref={gridRef} rowData={services || []} columnDefs={columnDefs} rowSelection="multiple" headerHeight={fontSize + rowDensity + 10} rowHeight={fontSize + rowDensity + 10} onSelectionChanged={e => setSelectedIds(e.api.getSelectedNodes().map(n => n.data.id))} quickFilterText={searchTerm} animateRows={true} enableCellTextSelection={true} autoSizeStrategy={autoSizeStrategy} />
      </div>

      <AnimatePresence>{activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[850px] max-h-[90vh] overflow-y-auto p-10 rounded-[40px] border border-blue-500/30 custom-scrollbar shadow-2xl">
               <div className="flex items-center justify-between border-b border-white/5 pb-6"><h2 className="text-2xl font-bold uppercase  tracking-tighter text-blue-400 flex items-center space-x-4"><Layers size={28}/> <span>{activeModal.id ? 'Modify Logic Matrix' : 'Register Service Instance'}</span></h2><button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white transition-all"><X size={24}/></button></div>
               <ServiceForm initialData={activeModal} onSave={mutation.mutate} options={options} devices={devices} />
            </motion.div>
          </div>
      )}</AnimatePresence>

      <AnimatePresence>{activeDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[950px] max-h-[85vh] overflow-hidden p-10 rounded-[40px] border border-blue-500/30 flex flex-col shadow-2xl">
               <div className="flex items-center justify-between border-b border-white/5 pb-6"><div><h2 className="text-3xl font-bold uppercase text-blue-400  tracking-tighter">{activeDetails.name}</h2><div className="flex items-center space-x-3 mt-1"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ">{activeDetails.service_type} · {activeDetails.environment} · {activeDetails.device_name || 'FLOATING'}</p></div></div><button onClick={() => setActiveDetails(null)} className="text-slate-500 hover:text-white transition-all"><X size={24}/></button></div>
               <div className="flex-1 overflow-y-auto custom-scrollbar pt-6"><ServiceDetailsView service={activeDetails} options={options} devices={devices} /></div>
            </motion.div>
          </div>
      )}</AnimatePresence>

      <ConfigRegistryModal isOpen={showConfig} onClose={() => setShowConfig(false)} title="Service Matrix Registry" sections={[{ title: "Service Types", category: "ServiceType", icon: Database }, { title: "Status Options", category: "Status", icon: RefreshCcw }, { title: "Environments", category: "Environment", icon: Globe }]} />
      <style>{`
        .ag-theme-alpine-dark { --ag-background-color: #1a1b26; --ag-header-background-color: #24283b; --ag-border-color: rgba(255, 255, 255, 0.05); --ag-foreground-color: #f1f5f9; --ag-header-foreground-color: #3b82f6; --ag-font-family: 'Inter', sans-serif; --ag-font-size: ${fontSize}px; }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-size: ${fontSize}px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; justify-content: center !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; font-weight: 700 !important; font-size: ${fontSize}px !important; }
        .ag-row-hover { background-color: rgba(255, 255, 255, 0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.2) !important; }

      `}</style>
    </div>
  )
}
