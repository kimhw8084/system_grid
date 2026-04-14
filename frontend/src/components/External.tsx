import React, { useMemo, useState, useEffect, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Trash2, Globe, X, RefreshCcw, Search, Edit2, LayoutGrid, List, FileText, Clipboard, 
  Link as LinkIcon, Share2, ExternalLink, Shield, Server, Database, Cloud, Activity, 
  Sliders, Settings, Check, User, Mail, Phone, Tag, Info, AlertCircle, Briefcase, 
  Clock, DollarSign, Target, ChevronRight, Layers, Box, Cpu, Zap, FileJson
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { apiFetch } from "../api/apiClient"
import { StyledSelect } from "./shared/StyledSelect"
import { ConfirmationModal } from "./shared/ConfirmationModal"
import { ConfigRegistryModal } from "./ConfigRegistry"

// --- Sub-components ---

const POCManager = ({ pocs, onChange }: { pocs: any[], onChange: (newPocs: any[]) => void }) => {
  const addPOC = () => {
    onChange([...pocs, { first_name: '', last_name: '', id: '', email: '', phone: '' }])
  }

  const updatePOC = (index: number, field: string, value: string) => {
    const newPocs = [...pocs]
    newPocs[index] = { ...newPocs[index], [field]: value }
    onChange(newPocs)
  }

  const removePOC = (index: number) => {
    onChange(pocs.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <User size={14} className="text-amber-400" />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Authorized Points of Contact</span>
        </div>
        <button onClick={addPOC} className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/30 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all">+ Add POC</button>
      </div>
      <div className="p-4 space-y-3">
        {pocs.length === 0 && (
          <div className="py-8 text-center border border-dashed border-white/5 rounded-xl">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest italic">No POCs registered</p>
          </div>
        )}
        {pocs.map((poc, idx) => (
          <div key={idx} className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3 relative group">
            <button onClick={() => removePOC(idx)} className="absolute top-2 right-2 text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><X size={14}/></button>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1 block">First Name</label>
                <input value={poc.first_name} onChange={e => updatePOC(idx, 'first_name', e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-white outline-none focus:border-amber-500/50" placeholder="Jane" />
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1 block">Last Name</label>
                <input value={poc.last_name} onChange={e => updatePOC(idx, 'last_name', e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-white outline-none focus:border-amber-500/50" placeholder="Doe" />
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1 block">Entity ID</label>
                <input value={poc.id} onChange={e => updatePOC(idx, 'id', e.target.value.toUpperCase())} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-white outline-none focus:border-amber-500/50" placeholder="JD-1234" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5">
                <Mail size={10} className="text-slate-500" />
                <input value={poc.email} onChange={e => updatePOC(idx, 'email', e.target.value)} className="flex-1 bg-transparent text-[10px] font-bold text-slate-300 outline-none" placeholder="jane.doe@org.com" />
              </div>
              <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5">
                <Phone size={10} className="text-slate-500" />
                <input value={poc.phone} onChange={e => updatePOC(idx, 'phone', e.target.value)} className="flex-1 bg-transparent text-[10px] font-bold text-slate-300 outline-none" placeholder="+1-555-0199" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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
    <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
         <div className="flex items-center space-x-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Structural Metadata Configuration</span>
            {error && <span className="text-[8px] font-black text-rose-500 uppercase animate-pulse">!! {error}</span>}
         </div>
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
                  const n = [...tableRows]; n[i].key = e.target.value; 
                  setTableRows(n); validateAndNotify(n);
                }} placeholder="Key" className={`flex-1 bg-black/40 border ${error === 'Duplicate keys detected' ? 'border-rose-500/50' : 'border-white/5'} rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-blue-500`} />
                <input value={row.value} onChange={e => {
                  const n = [...tableRows]; n[i].value = e.target.value; 
                  setTableRows(n); validateAndNotify(n);
                }} placeholder="Values" className="flex-[2] bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-[11px] outline-none" />
                <button onClick={() => {
                    const n = tableRows.filter((_, idx) => idx !== i);
                    setTableRows(n); validateAndNotify(n);
                }} className="text-slate-600 hover:text-rose-400 transition-colors"><X size={14}/></button>
              </div>
            ))}
            <button onClick={() => {
                const n = [...tableRows, { key: '', value: '' }];
                setTableRows(n);
            }} className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-2 hover:text-blue-300 transition-colors">+ Add Attribute</button>
          </div>
        ) : (
          <textarea value={jsonValue} onChange={e => {
            setJsonValue(e.target.value);
            syncFromJSON(e.target.value);
          }} className={`w-full h-32 bg-black/40 border ${error === 'Invalid JSON format' ? 'border-rose-500/50' : 'border-white/5'} rounded-xl px-4 py-3 text-[11px] font-mono text-blue-300 outline-none`} />
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
    <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Metadata Inspection</span>
      </div>
      <table className="w-full text-[10px]">
        <thead className="bg-white/5 border-b border-white/5">
          <tr>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Key</th>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-slate-500">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {Object.entries(obj).map(([k, v]) => (
            <tr key={k} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 font-black uppercase text-blue-400 tracking-tighter w-1/3">{k}</td>
              <td className="px-4 py-3 font-mono text-slate-300">{String(v)}</td>
            </tr>
          ))}
          {Object.keys(obj).length === 0 && (
            <tr><td colSpan={2} className="px-4 py-12 text-center text-slate-600 font-bold uppercase italic tracking-widest">No metadata keys defined</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const POCViewer = ({ pocs }: { pocs: any[] }) => {
  return (
    <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden mt-6">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Personnel Matrix (POC)</span>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
           {pocs && pocs.length > 0 ? pocs.map((poc, idx) => (
             <div key={idx} className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center space-x-3">
                   <div className="w-8 h-8 rounded-lg bg-amber-600/10 flex items-center justify-center text-amber-400 border border-amber-500/20 font-black text-xs">{poc.first_name?.[0]}{poc.last_name?.[0]}</div>
                   <div>
                      <p className="text-[11px] font-black uppercase text-white leading-none">{poc.first_name} {poc.last_name}</p>
                      <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mt-1">{poc.id || 'NO_ID_REF'}</p>
                   </div>
                </div>
                <div className="space-y-1 pt-2 border-t border-white/5">
                   <div className="flex items-center space-x-2 text-[9px] font-bold text-slate-400">
                      <Mail size={10} /> <span>{poc.email || 'NO_EMAIL'}</span>
                   </div>
                   <div className="flex items-center space-x-2 text-[9px] font-bold text-slate-400">
                      <Phone size={10} /> <span>{poc.phone || 'NO_PHONE'}</span>
                   </div>
                </div>
             </div>
           )) : (
             <div className="col-span-2 py-8 text-center text-slate-600 font-bold uppercase italic tracking-widest">No authorized POCs defined</div>
           )}
      </div>
    </div>
  )
}

const EntityForm = ({ initialData, onSave, isSaving, options }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'API',
    owner_organization: '',
    owner_team: '',
    status: 'Planned',
    environment: 'Production',
    description: '',
    poc_json: [],
    metadata_json: {},
    ...initialData
  })

  const getOptions = (cat: string) => Array.isArray(options) ? options.filter((o: any) => o.category === cat) : []
  const types = getOptions('ExternalType').length > 0 ? getOptions('ExternalType') : [
    { value: 'Equipment', label: 'External Equipment', metadata_keys: ["manufacturer", "model", "serial_number"] },
    { value: 'Physical Server', label: 'Physical Server', metadata_keys: ["rack_id", "unit_position", "os"] },
    { value: 'Virtual Server', label: 'Virtual Server', metadata_keys: ["hypervisor", "vcpu", "vram", "os"] },
    { value: 'Switch', label: 'Network Switch', metadata_keys: ["management_url", "ports", "firmware"] },
    { value: 'DB', label: 'External Database', metadata_keys: ["engine", "port", "instance_name"] },
    { value: 'API', label: 'External API', metadata_keys: ["base_url", "auth_type", "version"] },
    { value: 'Script', label: 'External Script', metadata_keys: ["runtime", "path", "schedule"] }
  ]

  const statusOptions = [
    { value: 'Planned', label: 'Planned' },
    { value: 'Active', label: 'Active' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Standby', label: 'Standby' },
    { value: 'Failed', label: 'Failed' },
    { value: 'Decommissioned', label: 'Decommissioned' },
    { value: 'Provisioning', label: 'Provisioning' },
    { value: 'Reserved', label: 'Reserved' }
  ]

  const envOptions = [
    { value: 'Production', label: 'Production' },
    { value: 'Staging', label: 'Staging' },
    { value: 'QA', label: 'QA' },
    { value: 'Dev', label: 'Dev' },
    { value: 'DR', label: 'DR' },
    { value: 'Sandbox', label: 'Sandbox' },
    { value: 'Legacy', label: 'Legacy' }
  ]

  useEffect(() => {
    if (!initialData.id) { // Only for new entities
      const selectedType = types.find((t: any) => t.value === formData.type);
      if (selectedType?.metadata_keys) {
        const newMeta: any = {};
        selectedType.metadata_keys.forEach((key: string) => {
          newMeta[key] = "";
        });
        setFormData(prev => ({ ...prev, metadata_json: newMeta }));
      }
    }
  }, [formData.type, types, initialData.id]);

  return (
    <div className="space-y-8 py-6">
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
           <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-blue-600 pl-3">Identity & Classification</h3>
           <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 px-1">Entity Registry Name (UID) *</label>
              <input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} 
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-black text-white outline-none focus:border-blue-500 transition-all" 
                placeholder="E.G. CUSTOMER-FEED-API" 
              />
           </div>
           <StyledSelect
                label="Architectural Class"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                options={types}
           />
           <div className="grid grid-cols-2 gap-4">
             <StyledSelect
                  label="Operational Status"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  options={statusOptions}
             />
             <StyledSelect
                  label="Environment"
                  value={formData.environment}
                  onChange={e => setFormData({...formData, environment: e.target.value})}
                  options={envOptions}
             />
           </div>
        </div>

        <div className="space-y-4">
           <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-emerald-600 pl-3">Organizational Authority</h3>
           <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 px-1">Owner Organization</label>
              <input 
                value={formData.owner_organization} 
                onChange={e => setFormData({...formData, owner_organization: e.target.value.toUpperCase()})} 
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all" 
                placeholder="GLOBAL LOGISTICS INC." 
              />
           </div>
           <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 px-1">Owner Team</label>
              <input 
                value={formData.owner_team} 
                onChange={e => setFormData({...formData, owner_team: e.target.value.toUpperCase()})} 
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all" 
                placeholder="CORE-INFRA-TEAM" 
              />
           </div>
           <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 px-1">Functional Description</label>
              <textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500 h-24 resize-none" 
                placeholder="Technical rationale for this external entity integration..." 
              />
           </div>
        </div>

        <div className="col-span-2">
           <POCManager 
             pocs={formData.poc_json || []} 
             onChange={newPocs => setFormData({...formData, poc_json: newPocs})} 
           />
        </div>

        <div className="col-span-2">
           <MetadataEditor 
             value={formData.metadata_json} 
             onChange={v => setFormData({...formData, metadata_json: v})} 
           />
        </div>
      </div>

      <div className="flex space-x-4 pt-4 border-t border-white/5">
        <button 
          disabled={isSaving || !formData.name} 
          onClick={() => onSave(formData)} 
          className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3"
        >
          {isSaving && <RefreshCcw size={18} className="animate-spin" />}
          <span>{initialData.id ? 'Synchronize Entity Manifest' : 'Authorize External Registry Admission'}</span>
        </button>
      </div>
    </div>
  )
}

export default function External() {
  const queryClient = useQueryClient()
  const gridRef = useRef<any>(null)
  
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(10)
  const [showStyleLab, setShowStyleLab] = useState(true)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([])
  const [showConfig, setShowConfig] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeModal, setActiveModal] = useState<any>(null)
  const [activeDetails, setActiveDetails] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, id: null })

  const { data: options } = useQuery({ 
    queryKey: ['settings-options'], 
    queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) 
  })

  const { data: entities, isLoading } = useQuery({
    queryKey: ['external-entities'],
    queryFn: async () => (await (await apiFetch('/api/v1/intelligence/entities')).json())
  })

  useEffect(() => {
    if (gridRef.current?.api) {
      setTimeout(() => gridRef.current.api.autoSizeAllColumns(), 100)
    }
  }, [fontSize, rowDensity, entities])

  const handleExportCSV = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `SysGrid_External_Registry_${new Date().toISOString().split('T')[0]}.csv`,
        allColumns: false,
        onlySelected: false
      })
    }
  }

  const handleCopyToClipboard = () => {
    if (gridRef.current?.api) {
      const csvData = gridRef.current.api.getDataAsCsv({
        allColumns: false,
        onlySelected: true,
        suppressQuotes: true
      })
      if (csvData) {
        navigator.clipboard.writeText(csvData)
          .then(() => toast.success("Entity subset copied to secure clipboard"))
          .catch(() => toast.error("Clipboard authorization failed"))
      }
    }
  }

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/intelligence/entities/${data.id}` : `/api/v1/intelligence/entities`
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      toast.success('External Manifest Synchronized')
      setActiveModal(null)
    },
    onError: (e: any) => toast.error(e.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/intelligence/entities/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      setConfirmModal({ isOpen: false, id: null })
      toast.success('Entity Purged from Global Registry')
    },
    onError: (e: any) => toast.error(e.message)
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
    { 
      field: "id", 
      headerName: "ID", 
      width: 70,
      minWidth: 70,
      pinned: 'left',
      cellClass: 'text-center font-black text-slate-500 opacity-50',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
    },
    { 
      field: "name", 
      headerName: "Entity Identity", 
      pinned: 'left',
      flex: 1.5,
      cellClass: 'text-left font-black uppercase tracking-tight text-blue-400',
      headerClass: 'text-left',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("name")
    },
    { 
      field: "type", 
      headerName: "Type", 
      width: 140, 
      cellClass: 'text-center font-black uppercase text-slate-500 tracking-widest', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = {
          'Equipment': 'text-indigo-400',
          'Physical Server': 'text-blue-400',
          'Virtual Server': 'text-sky-400',
          'Switch': 'text-rose-400',
          'Storage': 'text-amber-400',
          'DB': 'text-emerald-400',
          'API': 'text-fuchsia-400',
          'Script': 'text-orange-400'
        }
        return <span style={{ fontSize: `${fontSize}px` }} className={`font-black uppercase ${colors[p.value] || 'text-slate-500'}`}>{p.value || 'N/A'}</span>
      },
      hide: hiddenColumns.includes("type")
    },
    { 
      field: "owner_team", 
      headerName: "Owner Team", 
      width: 150, 
      cellClass: 'text-center font-black uppercase text-slate-400', 
      headerClass: 'text-center', 
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-700 font-bold uppercase italic opacity-50">UNMAPPED</span>, 
      hide: hiddenColumns.includes("owner_team") 
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 130, 
      filter: true,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = {
          Active: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/20',
          Maintenance: 'text-amber-400 border-amber-500/40 bg-amber-500/20',
          Decommissioned: 'text-rose-400 border-rose-500/40 bg-rose-500/20',
          Planned: 'text-blue-400 border-blue-500/40 bg-blue-500/20',
          Standby: 'text-sky-400 border-sky-500/40 bg-sky-500/20',
          Failed: 'text-rose-500 border-rose-600/40 bg-rose-600/20',
          Provisioning: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/20',
          Reserved: 'text-purple-400 border-purple-500/40 bg-purple-500/20'
        }
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className={`flex items-center justify-center w-28 h-5 rounded-md border shadow-sm ${colors[p.value] || 'text-slate-400 border-white/10 bg-white/5'}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-black uppercase tracking-tighter leading-none">
                {p.value || 'Planned'}
              </span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("status")
    },
    { 
      field: "environment", 
      headerName: "Environment", 
      width: 120, 
      filter: true,
      cellClass: 'text-center font-black text-slate-400 uppercase', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value || 'N/A'}</span>,
      hide: hiddenColumns.includes("environment")
    },
    {
        field: "description",
        headerName: "Description",
        flex: 2,
        cellClass: 'text-left font-medium text-slate-500 italic truncate',
        headerClass: 'text-left',
        cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value || 'No description provided'}</span>,
        hide: hiddenColumns.includes("description")
    },
    { 
      headerName: "Actions",
      width: 140,
      minWidth: 140,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      resizable: false,
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex rounded-lg p-0.5 border border-white/5 bg-transparent">
               <button onClick={() => setActiveDetails(p.data)} title="View Details" className="p-1.5 text-blue-400 hover:text-blue-200 transition-all border-r border-white/5"><List size={14}/></button>
               <button onClick={() => setActiveModal(p.data)} title="Edit" className="p-1.5 text-emerald-400 hover:text-emerald-200 transition-all border-r border-white/5"><Edit2 size={14}/></button>
               <button onClick={() => setConfirmModal({ isOpen: true, id: p.data.id })} title="Delete" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      ),
      suppressHide: true
    }
  ], [fontSize, hiddenColumns]) as any

  const autoSizeStrategy = useMemo(() => ({
    type: 'fitCellContents' as const
  }), []);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-xl">
              <Globe size={24} className="text-blue-500" />
           </div>
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic text-white leading-none">External Intelligence</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Global Entity Reference & Third-Party Asset Forensic</p>
           </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative group">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
             <input 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
               placeholder="SCAN REGISTRY..." 
               className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" 
             />
          </div>
          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5 space-x-1">
             <button 
                onClick={() => setShowStyleLab(!showStyleLab)} 
                className={`p-1.5 hover:bg-white/10 ${showStyleLab ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`}
                title="Toggle Style Lab"
             >
                <Activity size={16} />
             </button>
             <button onClick={() => setShowColumnPicker(!showColumnPicker)} className={`p-1.5 hover:bg-white/10 ${showColumnPicker ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Column Picker">
                <Sliders size={16} />
             </button>
             <button onClick={handleExportCSV} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-emerald-400 rounded-lg transition-all" title="Export Manifest">
                <FileText size={16} />
             </button>
             <button onClick={handleCopyToClipboard} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Secure Copy">
                <Clipboard size={16} />
             </button>
             <button onClick={() => setShowConfig(true)} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Registry Config">
                <Settings size={16} />
             </button>
          </div>
          <button onClick={() => setActiveModal({})} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all border border-blue-400/30">+ Admission</button>
        </div>
      </div>

      <AnimatePresence>
        {showStyleLab && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md">
               <div className="flex items-center space-x-12">
                  <div className="flex items-center space-x-3">
                     <Activity size={16} className="text-blue-400" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">View Density Laboratory</span>
                  </div>
                  
                  <div className="flex items-center space-x-10">
                     <div className="flex items-center space-x-4">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Font Size</span>
                        <div className="flex items-center space-x-2">
                            <input 
                            type="range" min="8" max="14" step="1" 
                            value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                            className="w-32 accent-blue-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] text-white w-4 font-black">{fontSize}px</span>
                        </div>
                     </div>

                     <div className="flex items-center space-x-4 border-l border-white/10 pl-10">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Row Density</span>
                        <div className="flex items-center space-x-4">
                            <input 
                            type="range" min="0" max="30" step="2" 
                            value={rowDensity} onChange={e => setRowDensity(Number(e.target.value))}
                            className="w-32 accent-indigo-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] text-white w-4 font-black">{rowDensity}px</span>
                        </div>
                     </div>
                  </div>
               </div>
               <button onClick={() => setShowStyleLab(false)} className="bg-white/5 p-1.5 rounded-lg text-slate-500 hover:text-white transition-all"><X size={16}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 glass-panel rounded-3xl border border-white/5 overflow-hidden ag-theme-alpine-dark relative shadow-2xl">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/90 backdrop-blur-md space-y-6 text-blue-400">
             <RefreshCcw size={48} className="animate-spin" />
             <p className="text-[12px] font-black uppercase tracking-[0.5em] animate-pulse">Synchronizing Intelligence Matrix...</p>
          </div>
        )}
        <AgGridReact 
          ref={gridRef}
          rowData={entities || []} 
          columnDefs={columnDefs as any} 
          headerHeight={fontSize + rowDensity + 15}
          rowHeight={fontSize + rowDensity + 15}
          quickFilterText={searchTerm}
          animateRows={true}
          enableCellTextSelection={true}
          autoSizeStrategy={autoSizeStrategy}
        />

        <AnimatePresence>
          {showColumnPicker && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="absolute top-0 right-0 bottom-0 w-80 bg-slate-950/95 backdrop-blur-2xl border-l border-white/10 z-[60] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-blue-400 flex items-center space-x-3">
                  <Sliders size={18} /> <span>Toggle Attributes</span>
                </h3>
                <button onClick={() => setShowColumnPicker(false)} className="bg-white/5 p-2 rounded-full text-slate-500 hover:text-white transition-all"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-1">
                {columnDefs.filter((c: any) => c.field && !c.suppressHide).map((col: any) => (
                  <label key={col.field} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-all border border-transparent hover:border-white/5 shadow-inner">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.includes(col.field)}
                        onChange={() => {
                          if (hiddenColumns.includes(col.field)) {
                            setHiddenColumns(hiddenColumns.filter(f => f !== col.field))
                          } else {
                            setHiddenColumns([...hiddenColumns, col.field])
                          }
                        }}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-md border-2 transition-all flex items-center justify-center ${!hiddenColumns.includes(col.field) ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'border-white/10 bg-black/40 group-hover:border-white/20'}`}>
                         {!hiddenColumns.includes(col.field) && <Check size={12} className="text-white" />}
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${!hiddenColumns.includes(col.field) ? 'text-slate-200' : 'text-slate-600'}`}>{col.headerName || col.field}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-[800px] max-h-[90vh] overflow-y-auto p-10 rounded-[40px] border border-blue-500/30 custom-scrollbar">
               <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <h2 className="text-2xl font-black uppercase flex items-center space-x-4 text-blue-400">
                     <Globe size={28}/> <span>{activeModal.id ? 'Modify Entity Registry' : 'Admit External Identity'}</span>
                  </h2>
                  <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
               </div>
               <EntityForm initialData={activeModal} onSave={mutation.mutate} isSaving={mutation.isPending} options={options} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-[900px] max-h-[85vh] overflow-hidden p-10 rounded-[40px] border border-blue-500/30 flex flex-col">
               <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <div>
                    <h2 className="text-2xl font-black uppercase text-blue-400">{activeDetails.name}</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{activeDetails.type} // {activeDetails.status} // {activeDetails.environment}</p>
                  </div>
                  <button onClick={() => setActiveDetails(null)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar pt-6 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                     <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 text-slate-800 opacity-20"><Briefcase size={60}/></div>
                        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 flex items-center gap-2"><Target size={14}/> Organizational Context</h3>
                        <div className="space-y-4 relative z-10">
                           <div className="flex flex-col border-b border-white/5 pb-2">
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Owner Organization</span>
                              <span className="text-lg font-black text-white tracking-tight italic">{activeDetails.owner_organization || 'NO_OWNER_MAPPED'}</span>
                           </div>
                           <div className="flex flex-col border-b border-white/5 pb-2">
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Responsible Team</span>
                              <span className="text-lg font-black text-emerald-400 tracking-tight italic">{activeDetails.owner_team || 'NO_TEAM_MAPPED'}</span>
                           </div>
                        </div>
                     </div>
                     <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/10 flex flex-col">
                        <h3 className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-4 italic flex items-center gap-2"><Activity size={14}/> Functional Narrative</h3>
                        <p className="text-base text-slate-300 leading-relaxed font-bold italic tracking-tight flex-1">
                           "{activeDetails.description || 'No formal functional description provided for this architectural identity.'}"
                        </p>
                     </div>
                  </div>

                  <MetadataViewer data={activeDetails.metadata_json} />
                  <POCViewer pocs={activeDetails.poc_json || []} />
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={() => deleteMutation.mutate(confirmModal.id)}
        title="Sever External Manifest"
        message="This will irrevocably purge the authorized identity from the global registry. All downstream forensics and connectivity mappings will lose context. Proceed with termination?"
        variant="danger"
      />

      <ConfigRegistryModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        title="External Intelligence Enumerations"
        sections={[
            { title: "Entity Types", category: "ExternalType", icon: Globe }
        ]}
      />

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: #0a0b14;
          --ag-header-background-color: #121421;
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #3b82f6;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: ${fontSize}px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header { border-bottom: 1px solid rgba(255,255,255,0.05) !important; }
        .ag-header-cell-label { 
            font-weight: 900 !important; 
            text-transform: uppercase !important; 
            letter-spacing: 0.15em !important; 
            font-size: ${fontSize}px !important; 
            justify-content: center !important; 
        }
        .ag-cell { 
            display: flex; 
            align-items: center; 
            justify-content: center !important; 
            font-weight: 800 !important;
            border-right: 1px solid rgba(255,255,255,0.02) !important;
        }
        .ag-row { border-bottom: 1px solid rgba(255,255,255,0.03) !important; }
        .ag-row-hover { background-color: rgba(59, 130, 246, 0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.1) !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.2); }
      `}</style>
    </div>
  )
}
