import React, { useMemo, useState, useEffect, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Trash2, Globe, X, RefreshCcw, Search, Edit2, LayoutGrid, List, FileText, Clipboard, 
  Link as LinkIcon, Share2, ExternalLink, Shield, Server, Database, Cloud, Activity, 
  Sliders, Settings, Check, User, Mail, Phone, Tag, Info, AlertCircle, Briefcase, 
  Clock, DollarSign, Target, ChevronRight, Layers, Box, Cpu, Zap
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
    <div className="bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <User size={16} className="text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authorized Points of Contact</span>
        </div>
        <button onClick={addPOC} className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/30 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">+ Add POC</button>
      </div>
      <div className="p-6 space-y-4">
        {pocs.length === 0 && (
          <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">No POCs registered for this entity</p>
          </div>
        )}
        {pocs.map((poc, idx) => (
          <div key={idx} className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-4 relative group">
            <button onClick={() => removePOC(idx)} className="absolute top-4 right-4 text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><X size={16}/></button>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1 block">First Name</label>
                <input value={poc.first_name} onChange={e => updatePOC(idx, 'first_name', e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-[11px] font-bold text-white outline-none focus:border-amber-500/50" placeholder="Jane" />
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1 block">Last Name</label>
                <input value={poc.last_name} onChange={e => updatePOC(idx, 'last_name', e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-[11px] font-bold text-white outline-none focus:border-amber-500/50" placeholder="Doe" />
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1 block">Entity ID</label>
                <input value={poc.id} onChange={e => updatePOC(idx, 'id', e.target.value.toUpperCase())} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-[11px] font-bold text-white outline-none focus:border-amber-500/50" placeholder="JD-1234" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-center space-x-3 bg-slate-900 px-4 py-2 rounded-xl border border-white/5">
                <Mail size={12} className="text-slate-500" />
                <input value={poc.email} onChange={e => updatePOC(idx, 'email', e.target.value)} className="flex-1 bg-transparent text-[11px] font-bold text-slate-300 outline-none" placeholder="jane.doe@organization.com" />
              </div>
              <div className="flex items-center space-x-3 bg-slate-900 px-4 py-2 rounded-xl border border-white/5">
                <Phone size={12} className="text-slate-500" />
                <input value={poc.phone} onChange={e => updatePOC(idx, 'phone', e.target.value)} className="flex-1 bg-transparent text-[11px] font-bold text-slate-300 outline-none" placeholder="+1-555-0199" />
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
    <div className="bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/5">
         <div className="flex items-center space-x-3">
            <Database size={16} className="text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Polymorphic Metadata Matrix</span>
            {error && <span className="text-[8px] font-black text-rose-500 uppercase animate-pulse">!! {error}</span>}
         </div>
         <div className="flex bg-black/40 rounded-lg p-1">
            <button onClick={() => setMode('table')} className={`px-2 py-1 rounded-md transition-all ${mode === 'table' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><List size={12}/></button>
            <button onClick={() => setMode('json')} className={`px-2 py-1 rounded-md transition-all ${mode === 'json' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><FileText size={12}/></button>
         </div>
      </div>
      <div className="p-6">
        {mode === 'table' ? (
          <div className="space-y-3">
            {tableRows.map((row, i) => (
              <div key={i} className="flex items-center space-x-3">
                <input value={row.key} onChange={e => {
                  const n = [...tableRows]; n[i].key = e.target.value; 
                  setTableRows(n); validateAndNotify(n);
                }} placeholder="Key" className={`flex-1 bg-black/40 border ${error === 'Duplicate keys detected' ? 'border-rose-500/50' : 'border-white/10'} rounded-xl px-4 py-2 text-[11px] font-bold text-blue-400 outline-none focus:border-blue-500 transition-all`} />
                <input value={row.value} onChange={e => {
                  const n = [...tableRows]; n[i].value = e.target.value; 
                  setTableRows(n); validateAndNotify(n);
                }} placeholder="Value" className="flex-[2] bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[11px] font-medium text-slate-300 outline-none focus:border-blue-500 transition-all" />
                <button onClick={() => {
                    const n = tableRows.filter((_, idx) => idx !== i);
                    setTableRows(n); validateAndNotify(n);
                }} className="text-slate-600 hover:text-rose-400 transition-colors"><X size={16}/></button>
              </div>
            ))}
            <button onClick={() => {
                const n = [...tableRows, { key: '', value: '' }];
                setTableRows(n);
            }} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[9px] font-black text-blue-400 uppercase tracking-widest transition-all mt-4">+ Add Key Pair</button>
          </div>
        ) : (
          <textarea value={jsonValue} onChange={e => {
            setJsonValue(e.target.value);
            syncFromJSON(e.target.value);
          }} className={`w-full h-48 bg-black/40 border ${error === 'Invalid JSON format' ? 'border-rose-500/50' : 'border-white/10'} rounded-[30px] px-6 py-5 text-[11px] font-mono text-blue-300 outline-none shadow-inner`} />
        )}
      </div>
    </div>
  )
}

const MetadataViewer = ({ data, pocs }: { data: any, pocs: any[] }) => {
  let obj: any = {}
  try {
    obj = typeof data === 'string' ? JSON.parse(data || '{}') : (data || {})
  } catch {
    obj = {}
  }
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/5">
          <div className="flex items-center space-x-3">
             <LayoutGrid size={16} className="text-blue-400" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Structural Attribute Forensic</span>
          </div>
        </div>
        <div className="p-0">
          <table className="w-full text-[10px]">
            <thead className="bg-black/20 border-b border-white/5">
              <tr>
                <th className="px-6 py-3 text-left font-black uppercase tracking-widest text-slate-500">Field Registry Key</th>
                <th className="px-6 py-3 text-left font-black uppercase tracking-widest text-slate-500">Assigned Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {Object.entries(obj).map(([k, v]) => (
                <tr key={k} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-black uppercase text-blue-400 tracking-tighter w-1/3 group-hover:text-blue-300 transition-colors">{k}</td>
                  <td className="px-6 py-4 font-mono text-slate-300 break-all">{String(v)}</td>
                </tr>
              ))}
              {Object.keys(obj).length === 0 && (
                <tr><td colSpan={2} className="px-6 py-12 text-center text-slate-600 font-bold uppercase italic tracking-widest">No structural metadata defined</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/5">
           <div className="flex items-center space-x-3">
              <User size={16} className="text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Personnel Matrix (POC)</span>
           </div>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
           {pocs && pocs.length > 0 ? pocs.map((poc, idx) => (
             <div key={idx} className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                <div className="flex items-start justify-between">
                   <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-600/10 flex items-center justify-center text-amber-400 border border-amber-500/20 font-black text-xs">{poc.first_name?.[0]}{poc.last_name?.[0]}</div>
                      <div>
                         <p className="text-[11px] font-black uppercase text-white tracking-tight">{poc.first_name} {poc.last_name}</p>
                         <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{poc.id || 'NO_ID_REF'}</p>
                      </div>
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
    </div>
  )
}

const EntityForm = ({ initialData, onSave, isSaving, options }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'API',
    owner_organization: '',
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
    <div className="space-y-10 mt-10 pb-10">
      <div className="grid grid-cols-2 gap-10">
        <div className="space-y-10">
          <div className="bg-slate-900/40 p-8 rounded-[40px] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-blue-500/10"><Globe size={120}/></div>
              <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-[0.3em] flex items-center gap-2 relative z-10"><Info size={14}/> Primary Identity Vector</h3>
              <div className="space-y-6 relative z-10">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-3">Entity Registry Name (UID) *</label>
                  <input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} 
                    className="w-full bg-black/40 border border-white/10 rounded-[25px] px-8 py-5 text-sm font-black text-white outline-none focus:border-blue-500 transition-all shadow-inner" 
                    placeholder="E.G. CUSTOMER-FEED-API" 
                  />
                </div>
                <StyledSelect
                  label="Architectural Class"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  options={types}
                />
              </div>
          </div>

          <div className="bg-slate-900/40 p-8 rounded-[40px] border border-white/5 space-y-6 shadow-2xl">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-2"><Briefcase size={14}/> Organizational Authority</h3>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-3">Owner Organization</label>
                <input 
                  value={formData.owner_organization} 
                  onChange={e => setFormData({...formData, owner_organization: e.target.value.toUpperCase()})} 
                  className="w-full bg-black/40 border border-white/10 rounded-[25px] px-8 py-5 text-sm font-black text-white outline-none focus:border-slate-500 transition-all shadow-inner" 
                  placeholder="GLOBAL LOGISTICS INC." 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-3">Functional Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 rounded-[30px] px-8 py-5 text-sm font-bold text-white outline-none focus:border-slate-500 transition-all shadow-inner h-32 resize-none" 
                  placeholder="Technical rationale for this external entity integration..." 
                />
              </div>
          </div>
        </div>

        <div className="space-y-10">
           <POCManager 
             pocs={formData.poc_json || []} 
             onChange={newPocs => setFormData({...formData, poc_json: newPocs})} 
           />
        </div>
      </div>

      <div className="space-y-10">
          <MetadataEditor 
             value={formData.metadata_json} 
             onChange={v => setFormData({...formData, metadata_json: v})} 
          />
      </div>

      <div className="flex space-x-6 pt-10 border-t border-white/5">
        <button 
          disabled={isSaving || !formData.name} 
          onClick={() => onSave(formData)} 
          className="flex-1 py-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-[30px] text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center space-x-3"
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
  const [showStyleLab, setShowStyleLab] = useState(false)
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
      headerName: "Entity Type Class", 
      width: 180, 
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
      field: "owner_organization", 
      headerName: "Owner Authority", 
      flex: 1, 
      minWidth: 200, 
      cellClass: 'text-center font-black uppercase text-slate-400', 
      headerClass: 'text-center', 
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-700 font-bold uppercase italic opacity-50">UNMAPPED</span>, 
      hide: hiddenColumns.includes("owner_organization") 
    },
    {
      headerName: "POC Integrity",
      width: 150,
      cellClass: 'text-center font-bold text-amber-500',
      headerClass: 'text-center',
      valueGetter: (p: any) => p.data.poc_json?.length || 0,
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-2">
           <User size={12} className={p.value > 0 ? "text-amber-500" : "text-slate-700"} />
           <span className="font-black text-[10px]">{p.value} SEC_AUTH</span>
        </div>
      )
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
           <div className="flex rounded-xl p-0.5 border border-white/5 bg-white/5 shadow-inner">
               <button onClick={() => setActiveDetails(p.data)} title="Structural Forensic" className="p-2 text-blue-400 hover:text-blue-200 transition-all border-r border-white/5"><LayoutGrid size={14}/></button>
               <button onClick={() => setActiveModal(p.data)} title="Modify Registry" className="p-2 text-emerald-400 hover:text-emerald-200 transition-all border-r border-white/5"><Edit2 size={14}/></button>
               <button onClick={() => setConfirmModal({ isOpen: true, id: p.data.id })} title="Purge Reference" className="p-2 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
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
        <div className="flex items-center space-x-8">
           <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-3xl shadow-2xl shadow-blue-500/10">
              <Globe size={32} className="text-blue-500" />
           </div>
           <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter italic text-white leading-none">External Intelligence Registry</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] font-black mt-2">Global Entity Reference & Third-Party Asset Forensic</p>
           </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative group">
             <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
             <input 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
               placeholder="Filter Registry..." 
               className="bg-white/5 border border-white/5 rounded-2xl pl-12 pr-6 py-3 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-72 transition-all shadow-inner" 
             />
          </div>
          <div className="flex bg-white/5 rounded-2xl p-1 border border-white/5 space-x-1 shadow-inner">
             <button 
                onClick={() => setShowStyleLab(!showStyleLab)} 
                className={`p-2 hover:bg-white/10 ${showStyleLab ? 'text-blue-400 bg-white/10 shadow-lg' : 'text-slate-500'} rounded-xl transition-all`}
                title="Style Lab"
             >
                <Activity size={18} />
             </button>
             <button onClick={() => setShowColumnPicker(!showColumnPicker)} className={`p-2 hover:bg-white/10 ${showColumnPicker ? 'text-blue-400 bg-white/10 shadow-lg' : 'text-slate-500'} rounded-xl transition-all`} title="Column Picker">
                <Sliders size={18} />
             </button>
             <button onClick={handleExportCSV} className="p-2 hover:bg-white/10 text-slate-500 hover:text-emerald-400 rounded-xl transition-all" title="Export Manifest">
                <FileText size={18} />
             </button>
             <button onClick={handleCopyToClipboard} className="p-2 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-xl transition-all" title="Secure Copy">
                <Clipboard size={18} />
             </button>
             <button onClick={() => setShowConfig(true)} className="p-2 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-xl transition-all" title="Registry Config">
                <Settings size={18} />
             </button>
          </div>
          <button onClick={() => setActiveModal({})} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-[20px] text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-blue-500/30 active:scale-95 transition-all border border-blue-400/30">+ Admission</button>
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
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-[30px] p-6 flex items-center justify-between backdrop-blur-xl">
               <div className="flex items-center space-x-16">
                  <div className="flex items-center space-x-4">
                     <Activity size={20} className="text-blue-400" />
                     <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-400">View Density Laboratory</span>
                  </div>
                  
                  <div className="flex items-center space-x-10">
                     <div className="flex items-center space-x-6">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Font Scaling</span>
                        <div className="flex items-center space-x-4">
                            <input 
                            type="range" min="8" max="14" step="1" 
                            value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                            className="w-40 accent-blue-500 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[11px] text-white w-6 font-black">{fontSize}px</span>
                        </div>
                     </div>

                     <div className="flex items-center space-x-6 border-l border-white/10 pl-10">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Row Density</span>
                        <div className="flex items-center space-x-4">
                            <input 
                            type="range" min="0" max="30" step="2" 
                            value={rowDensity} onChange={e => setRowDensity(Number(e.target.value))}
                            className="w-40 accent-indigo-500 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[11px] text-white w-6 font-black">{rowDensity}px</span>
                        </div>
                     </div>
                  </div>
               </div>
               <button onClick={() => setShowStyleLab(false)} className="bg-white/5 p-2 rounded-full text-slate-500 hover:text-white transition-all"><X size={20}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 glass-panel rounded-[40px] border border-white/5 overflow-hidden ag-theme-alpine-dark relative shadow-2xl">
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
              <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/5">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-blue-400 flex items-center space-x-3">
                  <Sliders size={18} /> <span>Toggle Attributes</span>
                </h3>
                <button onClick={() => setShowColumnPicker(false)} className="bg-white/5 p-2 rounded-full text-slate-500 hover:text-white transition-all"><X size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-2">
                {columnDefs.filter((c: any) => c.field && !c.suppressHide).map((col: any) => (
                  <label key={col.field} className="flex items-center space-x-4 p-4 rounded-2xl hover:bg-white/5 cursor-pointer group transition-all border border-transparent hover:border-white/5 shadow-inner">
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
                      <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${!hiddenColumns.includes(col.field) ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'border-white/10 bg-black/40 group-hover:border-white/20'}`}>
                         {!hiddenColumns.includes(col.field) && <Check size={14} className="text-white" />}
                      </div>
                    </div>
                    <span className={`text-[11px] font-black uppercase tracking-[0.15em] transition-colors ${!hiddenColumns.includes(col.field) ? 'text-slate-200' : 'text-slate-600'}`}>{col.headerName || col.field}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-10">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-[1200px] max-h-[95vh] overflow-y-auto p-16 rounded-[60px] border border-blue-500/20 custom-scrollbar shadow-[0_0_150px_rgba(59,130,246,0.1)]">
               <div className="flex items-start justify-between border-b border-white/5 pb-10">
                  <div className="flex items-center space-x-8">
                    <div className="w-20 h-20 rounded-[30px] bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-2xl">
                       <Globe size={40}/>
                    </div>
                    <div>
                      <h2 className="text-5xl font-black uppercase text-white tracking-tighter italic leading-none">{activeModal.id ? 'Modify Registry Manifest' : 'Admit External Identity'}</h2>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3 italic flex items-center gap-2">
                        <Shield size={12} className="text-blue-500" /> Authorized Forensic Reference for Global Architecture Context
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white transition-all bg-white/5 p-4 rounded-3xl hover:shadow-lg"><X size={32}/></button>
               </div>
               <EntityForm initialData={activeModal} onSave={mutation.mutate} isSaving={mutation.isPending} options={options} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="glass-panel w-[1000px] max-h-[90vh] overflow-y-auto p-16 rounded-[60px] border border-blue-500/20 custom-scrollbar shadow-2xl">
               <div className="flex items-start justify-between border-b border-white/5 pb-10 mb-10 bg-white/5 p-10 rounded-[50px] border border-white/5">
                  <div className="flex items-center space-x-10">
                    <div className="w-24 h-24 rounded-[40px] bg-indigo-600/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
                       <LayoutGrid size={48}/>
                    </div>
                    <div>
                      <h2 className="text-6xl font-black uppercase text-white tracking-tighter italic leading-none">{activeDetails.name}</h2>
                      <div className="flex items-center space-x-4 mt-4">
                         <div className="px-4 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-blue-400">CLASS: {activeDetails.type}</div>
                         <div className="px-4 py-1.5 rounded-full bg-slate-800 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">ID: {activeDetails.id}</div>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setActiveDetails(null)} className="text-slate-500 hover:text-white transition-all bg-white/5 p-4 rounded-3xl"><X size={32}/></button>
               </div>
               
               <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-10">
                     <div className="bg-slate-900/60 p-10 rounded-[50px] border border-white/10 shadow-inner relative overflow-hidden group hover:border-blue-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-10 text-slate-800 opacity-20 group-hover:scale-110 transition-transform"><Briefcase size={80}/></div>
                        <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-[0.4em] mb-8 flex items-center gap-2"><Target size={14}/> Organizational Authority</h3>
                        <div className="space-y-6 relative z-10">
                           <div className="flex flex-col border-b border-white/5 pb-4">
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Primary Entity Owner</span>
                              <span className="text-xl font-black text-white tracking-tight italic">{activeDetails.owner_organization || 'NO_OWNER_MAPPED'}</span>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="bg-slate-900/60 p-10 rounded-[50px] border border-white/10 shadow-inner h-full flex flex-col justify-center">
                        <h3 className="text-[11px] font-black uppercase text-blue-500 tracking-[0.4em] mb-6 italic flex items-center gap-2"><Activity size={14}/> Functional Role Narrative</h3>
                        <p className="text-lg text-slate-300 leading-relaxed font-bold italic tracking-tight">
                           "{activeDetails.description || 'No formal functional description provided for this architectural identity.'}"
                        </p>
                  </div>
               </div>

               <div className="mt-10">
                  <MetadataViewer data={activeDetails.metadata_json} pocs={activeDetails.poc_json || []} />
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
            letter-spacing: 0.2em !important; 
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
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.3); }
      `}</style>
    </div>
  )
}
