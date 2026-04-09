import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Activity, Plus, Search, Filter, ExternalLink, 
  Trash2, Edit2, Shield, Cpu, Database, Network, 
  Globe, Bell, Info, ChevronRight, X, Check, Save,
  AlertCircle, Clock, Zap, Settings, MoreVertical, List
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from "ag-grid-react"
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'
import { StyledSelect } from './shared/StyledSelect'

const CATEGORIES = [
  { value: 'Hardware', icon: Cpu, color: 'text-blue-400' },
  { value: 'Log', icon: Database, color: 'text-emerald-400' },
  { value: 'Network', icon: Network, color: 'text-amber-400' },
  { value: 'Application', icon: Activity, color: 'text-rose-400' },
  { value: 'Synthetic', icon: Globe, color: 'text-purple-400' }
]

const STATUSES = [
  { value: 'Existing', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'Planned', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'Cancelled', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' }
]

export default function MonitoringGrid() {
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)
  
  // --- STYLE LABORATORY STATE ---
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(8) // Extra padding per row
  const [showStyleLab, setShowStyleLab] = useState(true)

  useEffect(() => {
    if (gridRef.current?.api) {
      setTimeout(() => gridRef.current.api.autoSizeAllColumns(), 50)
    }
  }, [fontSize, rowDensity])

  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data: items, isLoading } = useQuery({
    queryKey: ['monitoring-items'],
    queryFn: async () => (await apiFetch('/api/v1/monitoring/')).json()
  })

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json()
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/api/v1/monitoring/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
      toast.success('Monitoring item decommissioned')
    }
  })

  const columnDefs = useMemo(() => [
    { 
      field: "id", 
      headerName: "", 
      width: 50, 
      checkboxSelection: true, 
      headerCheckboxSelection: true, 
      pinned: 'left', 
      cellClass: 'text-center pl-2', 
      headerClass: 'text-center pl-2' 
    },
    { 
      field: "category", 
      headerName: "Cat", 
      width: 100,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const cat = CATEGORIES.find(c => c.value === p.value)
        const Icon = cat?.icon || Activity
        return (
          <div className="flex items-center justify-center space-x-2 h-full">
            <Icon size={12} className={cat?.color || 'text-slate-400'} />
            <span className="text-[10px] font-black uppercase tracking-tight text-white">{p.value}</span>
          </div>
        )
      }
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 100,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const style = STATUSES.find(s => s.value === p.value)?.color || 'bg-slate-500/20 text-slate-400'
        return (
          <div className="flex items-center justify-center h-full">
            <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${style}`}>
              {p.value}
            </span>
          </div>
        )
      }
    },
    { 
      field: "severity", 
      headerName: "Svr", 
      width: 90,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = {
          'Critical': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
          'Warning': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          'Info': 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        }
        return (
          <div className="flex items-center justify-center h-full">
            <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${colors[p.value] || 'bg-slate-500/20 text-slate-400'}`}>
              {p.value}
            </span>
          </div>
        )
      }
    },
    { 
      field: "is_active", 
      headerName: "Live", 
      width: 80,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center h-full">
           <div className={`w-2 h-2 rounded-full ${p.value ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-600'}`} />
        </div>
      )
    },
    { 
      field: "title", 
      headerName: "Title", 
      flex: 1.5, 
      cellClass: "text-blue-400 font-bold text-left", 
      headerClass: 'text-left' 
    },
    { field: "device_name", headerName: "Target Asset", flex: 1, cellClass: "text-slate-200 font-bold text-center", headerClass: 'text-center' },
    { 
      field: "monitored_service_names", 
      headerName: "Services", 
      flex: 1, 
      cellClass: "text-center", 
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const names = p.value || []
        if (names.length === 0) return <span className="text-slate-600 italic text-[9px]">None</span>
        return (
          <div className="flex items-center justify-center -space-x-1 overflow-hidden h-full" title={names.join(', ')}>
            {names.slice(0, 2).map((n: string, i: number) => (
              <div key={i} className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-[8px] font-bold text-blue-300 truncate max-w-[60px]">
                {n}
              </div>
            ))}
            {names.length > 2 && (
              <div className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[8px] font-bold text-slate-400">
                +{names.length - 2}
              </div>
            )}
          </div>
        )
      }
    },
    { 
      field: "platform", 
      headerName: "Platform", 
      width: 120, 
      cellClass: 'text-center', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-2 h-full">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase text-slate-300">{p.value}</span>
        </div>
      )
    },
    {
      headerName: "Ops",
      width: 100,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/5">
               {p.data.monitoring_url && (
                 <button onClick={() => window.open(p.data.monitoring_url, '_blank')} title="Monitoring Console" className="p-1.5 hover:bg-blue-600 hover:text-white text-blue-400 rounded-md transition-all"><ExternalLink size={14}/></button>
               )}
               <button onClick={() => { setEditingItem(p.data); setIsFormOpen(true); }} title="Modify Logic" className="p-1.5 hover:bg-blue-600 hover:text-white text-emerald-400 rounded-md transition-all"><Edit2 size={14}/></button>
               <button onClick={() => deleteMutation.mutate(p.data.id)} title="Decommission" className="p-1.5 hover:bg-rose-600 hover:text-white text-rose-400 rounded-md transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      )
    }
  ], []) as any

  const autoSizeStrategy = useMemo(() => ({
    type: 'fitCellContents' as const
  }), []);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* STYLE LABORATORY BAR */}
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
                  
                  <div className="flex items-center space-x-6">
                     <div className="flex items-center space-x-4">
                        <span className="text-[9px] font-black text-slate-500 uppercase">Font Size</span>
                        <div className="flex items-center space-x-2">
                            <input 
                            type="range" min="8" max="14" step="1" 
                            value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                            className="w-32 accent-blue-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] text-white w-4 font-black">{fontSize}px</span>
                        </div>
                     </div>

                     <div className="flex items-center space-x-4 border-l border-white/10 pl-6">
                        <span className="text-[9px] font-black text-slate-500 uppercase">Row Density</span>
                        <div className="flex items-center space-x-2">
                            <input 
                            type="range" min="4" max="24" step="2" 
                            value={rowDensity} onChange={e => setRowDensity(Number(e.target.value))}
                            className="w-32 accent-indigo-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] text-white w-4 font-black">{rowDensity}px</span>
                        </div>
                     </div>
                  </div>
               </div>
               <button onClick={() => setShowStyleLab(false)} className="text-slate-500 hover:text-white transition-colors"><X size={16}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic flex items-center">
                <span>Monitoring</span>
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">Observability Infrastructure & Logic Registry</p>
           </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="SEARCH LOGIC, PLATFORM..."
              className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all"
            />
          </div>

          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5 space-x-1">
             <button onClick={() => setShowStyleLab(!showStyleLab)} className={`p-1.5 hover:bg-white/10 ${showStyleLab ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Toggle Style Lab">
                <Activity size={16} />
             </button>
             <button className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Matrix Config">
                <Settings size={16} />
             </button>
          </div>

          <button 
            onClick={() => { setEditingItem(null); setIsFormOpen(true); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            + Add Monitoring
          </button>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <Zap size={32} className="text-blue-400 animate-pulse" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Scanning Monitoring Matrix...</p>
          </div>
        )}
        <AgGridReact 
          ref={gridRef}
          rowData={items || []} 
          columnDefs={columnDefs} 
          rowSelection="multiple"
          headerHeight={fontSize + rowDensity + 8}
          rowHeight={fontSize + rowDensity}
          onSelectionChanged={e => setSelectedIds(e.api.getSelectedNodes().map(n => n.data.id))}
          quickFilterText={searchTerm}
          autoSizeStrategy={autoSizeStrategy}
        />
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <MonitoringForm 
            item={editingItem} 
            devices={devices}
            onClose={() => setIsFormOpen(false)} 
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
              setIsFormOpen(false)
            }}
          />
        )}
      </AnimatePresence>

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: #1a1b26;
          --ag-header-background-color: #24283b;
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #3b82f6;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: ${fontSize}px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { 
            font-weight: 900 !important; 
            text-transform: uppercase !important; 
            letter-spacing: 0.1em !important; 
            font-size: ${fontSize}px !important; 
            justify-content: center !important; 
        }
        .ag-cell { 
            display: flex; 
            align-items: center; 
            justify-content: center !important; 
            font-weight: 700 !important;
        }
        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.2) !important; }
      `}</style>
    </div>
  )
}

const LOGIC_TYPES = ['Threshold', 'Regex', 'Query', 'Health Check', 'Log Pattern', 'Synthetic', 'Custom']

const LOGIC_SUGGESTIONS: any = {
  'Threshold': 'Example: cpu_usage > 90% for 5m\nWait for 3 consecutive violations before alerting.',
  'Regex': 'Example: /.*(Critical|Error|Fatal).*/i\nCapture group $1 for metadata enrichment.',
  'Query': 'Example: SELECT average(load) FROM system_metrics WHERE host = "$TARGET" AND time > now() - 10m',
  'Health Check': 'Example: HTTP GET /api/health\nExpected Status: 200\nTimeout: 5000ms',
  'Log Pattern': 'Example: [TIMESTAMP] [LEVEL] [COMPONENT] [MESSAGE]\nDetect spike in "Connection Refused" patterns.',
  'Synthetic': 'Example: Browser Script\n1. Navigate to /login\n2. Fill credentials\n3. Verify dashboard element exists',
  'Custom': 'Enter full custom logic script or detailed specifications here...'
}

function MonitoringForm({ item, devices, onClose, onSuccess }: any) {
  const [activeTab, setActiveTab] = useState<'context' | 'logic' | 'alerting'>('context')
  const [recoverySearch, setRecoverySearch] = useState('')
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [activeLogicId, setActiveLogicId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    category: 'Hardware',
    status: 'Planned',
    title: '',
    spec: '',
    platform: 'Zabbix',
    monitoring_url: '',
    purpose: '',
    notification_method: 'Email',
    notification_recipients: [],
    logic: '',
    logic_json: [],
    device_id: null,
    monitored_services: [],
    check_interval: 60,
    alert_duration: 0,
    notification_throttle: 3600,
    severity: 'Warning',
    is_active: true,
    recovery_docs: [],
    ...item
  })

  // Initialize activeLogicId if entries exist
  useEffect(() => {
    if (formData.logic_json?.length > 0 && activeLogicId === null) {
      setActiveLogicId(formData.logic_json[0].id)
    }
  }, [formData.logic_json])

  const [recipientInput, setRecipientInput] = useState('')

  // Fetch services for selected device
  const { data: deviceServices } = useQuery({
    queryKey: ['device-services', formData.device_id],
    queryFn: async () => {
      if (!formData.device_id) return []
      return (await apiFetch(`/api/v1/logical-services/?device_id=${formData.device_id}`)).json()
    },
    enabled: !!formData.device_id
  })

  // Fetch knowledge entries for recovery docs
  const { data: knowledgeEntries } = useQuery({
    queryKey: ['knowledge-entries'],
    queryFn: async () => (await apiFetch('/api/v1/knowledge/')).json()
  })

  const filteredKnowledge = useMemo(() => {
    if (!knowledgeEntries) return []
    return knowledgeEntries.filter((e: any) => 
      e.title.toLowerCase().includes(recoverySearch.toLowerCase()) ||
      e.category.toLowerCase().includes(recoverySearch.toLowerCase())
    )
  }, [knowledgeEntries, recoverySearch])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = item ? `/api/v1/monitoring/${item.id}` : '/api/v1/monitoring/'
      const method = item ? 'PUT' : 'POST'
      return (await apiFetch(url, { method, body: JSON.stringify(data) })).json()
    },
    onSuccess: () => {
      toast.success(item ? 'Logic synchronized' : 'Logic deployed to matrix')
      onSuccess()
    }
  })

  const toggleService = (id: number) => {
    const current = [...(formData.monitored_services || [])]
    const idx = current.indexOf(id)
    if (idx > -1) {
      current.splice(idx, 1)
    } else {
      current.push(id)
    }
    setFormData({ ...formData, monitored_services: current })
  }

  const toggleRecoveryDoc = (id: number) => {
    const current = [...(formData.recovery_docs || [])]
    const idx = current.indexOf(id)
    if (idx > -1) {
      current.splice(idx, 1)
    } else {
      current.push(id)
    }
    setFormData({ ...formData, recovery_docs: current })
  }

  const addLogicEntry = () => {
    const id = Date.now()
    const newEntries = [...(formData.logic_json || []), { type: 'Threshold', description: '', logic_info: '', id }]
    setFormData({ ...formData, logic_json: newEntries })
    setActiveLogicId(id)
  }

  const removeLogicEntry = (id: number) => {
    const filtered = formData.logic_json.filter((e: any) => e.id !== id)
    setFormData({ ...formData, logic_json: filtered })
    if (activeLogicId === id) {
      setActiveLogicId(filtered.length > 0 ? filtered[0].id : null)
    }
  }

  const updateLogicEntry = (id: number, field: string, value: string) => {
    const newEntries = formData.logic_json.map((e: any) => e.id === id ? { ...e, [field]: value } : e)
    setFormData({ ...formData, logic_json: newEntries })
  }

  const activeLogicEntry = formData.logic_json?.find((e: any) => e.id === activeLogicId)

  const addRecipient = () => {
    if (recipientInput && !formData.notification_recipients.includes(recipientInput)) {
      setFormData({ ...formData, notification_recipients: [...formData.notification_recipients, recipientInput] })
      setRecipientInput('')
    }
  }

  const removeRecipient = (r: string) => {
    setFormData({ ...formData, notification_recipients: formData.notification_recipients.filter((item: string) => item !== r) })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-panel w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col p-8 rounded-[40px] border-blue-500/30 shadow-[0_0_100px_rgba(37,99,235,0.1)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
           <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-400 border border-blue-500/20">
                <Zap size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
                  {item ? 'Update Logic' : 'Deploy Monitoring'}
                </h2>
                <div className="flex items-center space-x-2 mt-0.5">
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Infrastructure Command Interface</span>
                   <span className="w-1 h-1 rounded-full bg-slate-700" />
                   <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${formData.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-white/10'}`}>
                      {formData.is_active ? 'LIVE MATRIX' : 'PAUSED'}
                   </span>
                </div>
              </div>
           </div>
           
           <div className="flex bg-black/40 rounded-2xl p-1 border border-white/5">
              {[
                { id: 'context', label: '1. Detection & Context' },
                { id: 'logic', label: '2. Logic Specification' },
                { id: 'alerting', label: '3. Alerting & Recovery' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {tab.label}
                </button>
              ))}
           </div>

           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors">
              <X size={20} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
           {activeTab === 'context' ? (
             <div className="grid grid-cols-12 gap-8 p-2">
                <div className="col-span-4 space-y-6">
                   <div className="space-y-4">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-400 border-l-2 border-blue-600 pl-3">Target Identification</h3>
                      <StyledSelect 
                        label="Registry Asset"
                        value={formData.device_id}
                        onChange={(e: any) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value);
                            setFormData({...formData, device_id: val, monitored_services: []});
                        }}
                        options={devices?.map((d: any) => ({ value: d.id, label: `${d.name} [${d.system}]` })) || []}
                        placeholder="Select Device..."
                      />

                      {formData.device_id && (
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                           <div className="flex items-center justify-between px-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Service Scope</label>
                              <span className="text-[8px] font-bold text-blue-500 uppercase bg-blue-500/10 px-2 py-0.5 rounded-full">
                                {formData.monitored_services?.length || 0} Bound
                              </span>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {deviceServices?.map((svc: any) => (
                                <button
                                  key={svc.id}
                                  onClick={() => toggleService(svc.id)}
                                  className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center space-x-1.5 border ${
                                    formData.monitored_services?.includes(svc.id)
                                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                      : 'bg-black/40 border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'
                                  }`}
                                >
                                  {formData.monitored_services?.includes(svc.id) ? <Check size={8} strokeWidth={4} /> : <div className="w-1 h-1 rounded-full bg-slate-700" />}
                                  <span>{svc.name}</span>
                                </button>
                              ))}
                           </div>
                        </div>
                      )}
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <StyledSelect 
                        label="Category"
                        value={formData.category}
                        onChange={(e: any) => setFormData({...formData, category: e.target.value})}
                        options={CATEGORIES.map(c => ({ value: c.value, label: c.value }))}
                      />
                      <StyledSelect 
                        label="Status"
                        value={formData.status}
                        onChange={(e: any) => setFormData({...formData, status: e.target.value})}
                        options={STATUSES.map(s => ({ value: s.value, label: s.value }))}
                      />
                   </div>
                </div>

                <div className="col-span-8 space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Title</label>
                        <input 
                          value={formData.title}
                          onChange={e => setFormData({...formData, title: e.target.value})}
                          placeholder="e.g. CORE-DB: High CPU Load Alert"
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Platform</label>
                        <input 
                          value={formData.platform}
                          onChange={e => setFormData({...formData, platform: e.target.value})}
                          placeholder="e.g. Zabbix, Prometheus"
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Monitoring URL</label>
                      <div className="relative group">
                        <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input 
                          value={formData.monitoring_url}
                          onChange={e => setFormData({...formData, monitoring_url: e.target.value})}
                          placeholder="https://console.internal/..."
                          className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-[12px] font-bold text-blue-400 outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-2">
                         <Info size={14}/> <span>Business Purpose & Operational Impact</span>
                      </label>
                      <textarea 
                        value={formData.purpose}
                        onChange={e => setFormData({...formData, purpose: e.target.value})}
                        placeholder="Why is this being monitored? What is the impact of failure?"
                        rows={6}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                      />
                   </div>
                </div>
             </div>
           ) : activeTab === 'logic' ? (
             <div className="grid grid-cols-12 gap-8 p-2 h-full min-h-[500px]">
                {/* Left: Logic Entry Selection */}
                <div className="col-span-4 space-y-4">
                   <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center space-x-2">
                         <Settings size={14}/> <span>Logic Entries</span>
                      </h3>
                      <button 
                         onClick={addLogicEntry}
                         className="px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-600/40 transition-all flex items-center space-x-1"
                      >
                         <Plus size={12}/> <span>Add Entry</span>
                      </button>
                   </div>

                   <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                      {formData.logic_json?.map((entry: any) => (
                        <div 
                          key={entry.id}
                          onClick={() => setActiveLogicId(entry.id)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all relative group ${
                            activeLogicId === entry.id 
                              ? 'bg-blue-600/10 border-blue-500/50 shadow-lg' 
                              : 'bg-black/40 border-white/5 hover:border-white/20'
                          }`}
                        >
                           <button 
                             onClick={(e) => { e.stopPropagation(); removeLogicEntry(entry.id); }}
                             className="absolute -right-2 -top-2 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                           >
                             <X size={12}/>
                           </button>
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black uppercase text-blue-400">{entry.type}</span>
                              <span className="text-[8px] font-bold text-slate-600 uppercase italic">Entry #{entry.id.toString().slice(-4)}</span>
                           </div>
                           <p className="text-[11px] font-bold text-slate-300 truncate">{entry.description || 'No description provided'}</p>
                        </div>
                      ))}
                      {formData.logic_json?.length === 0 && (
                        <div className="py-12 text-center text-slate-600 italic text-[10px] uppercase font-black border-2 border-dashed border-white/5 rounded-3xl">
                           No logic entries defined
                        </div>
                      )}
                   </div>

                   <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="grid grid-cols-1 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1 italic">Check Frequency (Seconds)</label>
                            <div className="relative">
                               <Clock size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                               <input 
                                 type="number"
                                 value={formData.check_interval}
                                 onChange={e => setFormData({...formData, check_interval: parseInt(e.target.value)})}
                                 className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[12px] font-bold text-white outline-none focus:border-blue-500"
                               />
                            </div>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1 italic">Alert Duration (Seconds Delay)</label>
                            <div className="relative">
                               <AlertCircle size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                               <input 
                                 type="number"
                                 value={formData.alert_duration}
                                 onChange={e => setFormData({...formData, alert_duration: parseInt(e.target.value)})}
                                 className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[12px] font-bold text-white outline-none focus:border-blue-500"
                               />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Right: Detailed Logic Editor */}
                <div className="col-span-8 flex flex-col space-y-4 h-full">
                   {activeLogicEntry ? (
                     <>
                        <div className="grid grid-cols-2 gap-4">
                           <StyledSelect 
                             label="Logic Type"
                             value={activeLogicEntry.type}
                             onChange={e => updateLogicEntry(activeLogicEntry.id, 'type', e.target.value)}
                             options={LOGIC_TYPES.map(t => ({ value: t, label: t }))}
                           />
                           <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</label>
                             <input 
                               value={activeLogicEntry.description}
                               onChange={e => updateLogicEntry(activeLogicEntry.id, 'description', e.target.value)}
                               placeholder="What does this logic check?"
                               className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2 text-[12px] font-bold text-white outline-none focus:border-blue-500"
                             />
                           </div>
                        </div>

                        <div className="flex-1 flex flex-col space-y-2 min-h-0">
                           <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Logic Information</label>
                              <button 
                                onClick={() => setShowLineNumbers(!showLineNumbers)}
                                className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all ${showLineNumbers ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}
                              >
                                {showLineNumbers ? 'Hide Line Numbers' : 'Show Line Numbers'}
                              </button>
                           </div>
                           
                           <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl overflow-hidden flex font-mono text-[12px] shadow-inner relative group">
                              {showLineNumbers && (
                                <div className="bg-white/5 border-r border-white/10 px-3 py-4 text-slate-600 text-right select-none whitespace-pre leading-relaxed min-w-[40px]">
                                   {activeLogicEntry.logic_info.split('\n').map((_, i) => i + 1).join('\n')}
                                </div>
                              )}
                              <textarea 
                                value={activeLogicEntry.logic_info}
                                onChange={e => updateLogicEntry(activeLogicEntry.id, 'logic_info', e.target.value)}
                                placeholder={LOGIC_SUGGESTIONS[activeLogicEntry.type] || 'Enter logic parameters...'}
                                className="flex-1 bg-transparent p-4 outline-none text-blue-300 resize-none leading-relaxed custom-scrollbar placeholder:text-slate-700"
                                spellCheck={false}
                              />
                              
                              <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <span className="text-[8px] font-black text-slate-500 uppercase bg-black/60 px-2 py-1 rounded-lg border border-white/5">
                                    {activeLogicEntry.logic_info.length} Chars | {activeLogicEntry.logic_info.split('\n').length} Lines
                                 </span>
                              </div>
                           </div>
                        </div>
                     </>
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[40px] space-y-4">
                        <Activity size={40} className="text-slate-700" />
                        <div className="text-center">
                           <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Select an entry to modify logic</p>
                           <p className="text-[9px] text-slate-600 uppercase font-bold mt-1">Logic Specification Environment</p>
                        </div>
                     </div>
                   )}
                </div>
             </div>
           ) : (
             <div className="grid grid-cols-12 gap-8 p-2">
                {/* Left: Severity & Throttling */}
                <div className="col-span-4 space-y-6">
                   <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-400 border-l-2 border-amber-600 pl-3">Alert Routing Rules</h3>
                   
                   <StyledSelect 
                     label="Severity Level"
                     value={formData.severity}
                     onChange={(e: any) => setFormData({...formData, severity: e.target.value})}
                     options={['Critical', 'Warning', 'Info'].map(s => ({ value: s, label: s }))}
                   />

                   <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notification Throttle (Seconds)</label>
                         <p className="text-[8px] text-slate-600 uppercase font-bold mb-2 tracking-tight italic">Minimum time between re-alerts for the same issue</p>
                         <input 
                           type="number"
                           value={formData.notification_throttle}
                           onChange={e => setFormData({...formData, notification_throttle: parseInt(e.target.value)})}
                           className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[12px] font-bold text-white outline-none focus:border-blue-500"
                         />
                      </div>
                   </div>

                   <div className="space-y-4">
                      <StyledSelect 
                        label="Primary Notification Method"
                        value={formData.notification_method}
                        onChange={(e: any) => setFormData({...formData, notification_method: e.target.value})}
                        options={['Email', 'Slack', 'Teams', 'PagerDuty', 'Webhook', 'SMS', 'Voice'].map(m => ({ value: m, label: m }))}
                      />
                      
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recipients Matrix</label>
                         <div className="flex space-x-2">
                            <input 
                              value={recipientInput}
                              onChange={e => setRecipientInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addRecipient()}
                              placeholder="Channel ID or Email..."
                              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[11px] outline-none focus:border-blue-500"
                            />
                            <button onClick={addRecipient} className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-xl transition-all"><Plus size={14}/></button>
                         </div>
                         <div className="flex flex-wrap gap-2 mt-2">
                            {formData.notification_recipients.map((r: string) => (
                              <div key={r} className="flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg">
                                 <span className="text-[10px] font-bold text-blue-300">{r}</span>
                                 <button onClick={() => removeRecipient(r)} className="text-slate-500 hover:text-rose-400"><X size={10}/></button>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>

                {/* Right: Recovery Methods (Linked Knowledge) */}
                <div className="col-span-8 space-y-6">
                   <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-400 flex items-center space-x-2 border-b border-white/5 pb-2">
                      <Activity size={14}/> <span>Recovery Intelligence (Linked BKM/Knowledge)</span>
                   </h3>
                   
                   <div className="space-y-4">
                      <div className="p-6 border-2 border-dashed border-white/5 rounded-3xl space-y-6">
                         <div className="flex items-center justify-between">
                            <div className="space-y-1">
                               <p className="text-[12px] font-black text-white uppercase tracking-tighter italic">Link Recovery Documents</p>
                               <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Documentation linked here will be presented to the on-call engineer during an alert.</p>
                            </div>
                            <div className="flex items-center space-x-2 bg-blue-600/10 px-3 py-1 rounded-lg border border-blue-600/20">
                               <List size={12} className="text-blue-400" />
                               <span className="text-[10px] font-black text-blue-400">{formData.recovery_docs?.length || 0} Linked</span>
                            </div>
                         </div>

                         <div className="relative group">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input 
                              value={recoverySearch}
                              onChange={e => setRecoverySearch(e.target.value)}
                              placeholder="Search Knowledge Base for Recovery Procedures..."
                              className="w-full bg-black/60 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-[11px] font-black uppercase outline-none focus:border-blue-500 transition-all shadow-2xl"
                            />
                         </div>

                         <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {filteredKnowledge?.map((entry: any) => (
                               <button
                                 key={entry.id}
                                 type="button"
                                 onClick={() => toggleRecoveryDoc(entry.id)}
                                 className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group/item ${
                                   formData.recovery_docs?.includes(entry.id)
                                     ? 'bg-blue-600/20 border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                                     : 'bg-black/40 border-white/5 hover:border-white/20'
                                 }`}
                               >
                                  {formData.recovery_docs?.includes(entry.id) && (
                                    <div className="absolute top-0 right-0 w-8 h-8 bg-blue-600 flex items-center justify-center rounded-bl-xl shadow-lg">
                                       <Check size={14} className="text-white" strokeWidth={4} />
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-2 mb-2">
                                     <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-800 text-slate-400 rounded border border-white/5">{entry.category}</span>
                                     <span className="text-[8px] font-bold text-slate-600 uppercase">#{entry.id}</span>
                                  </div>
                                  <p className={`text-[11px] font-black uppercase tracking-tight leading-tight transition-colors ${formData.recovery_docs?.includes(entry.id) ? 'text-blue-300' : 'text-slate-300'}`}>
                                    {entry.title}
                                  </p>
                               </button>
                            ))}
                            {filteredKnowledge?.length === 0 && (
                               <div className="col-span-2 py-8 text-center text-slate-600 italic text-[10px] uppercase font-black">No matching knowledge entries found</div>
                            )}
                         </div>
                      </div>
                   </div>
                   
                   <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start space-x-3">
                      <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 mt-1">
                         <AlertCircle size={16} />
                      </div>
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest italic">Operational Directive</p>
                         <p className="text-[9px] text-slate-400 font-bold leading-relaxed">Linking high-quality recovery documentation is critical for reducing Mean Time to Repair (MTTR). Ensure the linked Knowledge Entries contain up-to-date troubleshooting steps.</p>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
           <div className="flex items-center space-x-2">
              <button 
                onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all ${
                  formData.is_active 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                    : 'bg-slate-500/10 border-white/10 text-slate-500 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${formData.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{formData.is_active ? 'Monitor Active' : 'Monitor Paused'}</span>
              </button>
           </div>

           <div className="flex space-x-4">
              <button onClick={onClose} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all">Abort</button>
              <button 
                onClick={() => mutation.mutate(formData)}
                disabled={mutation.isPending}
                className="px-12 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:bg-slate-700 flex items-center space-x-2"
              >
                {mutation.isPending ? <Clock className="animate-spin" size={14} /> : <Check size={14} />}
                <span>{item ? 'Commit Synchronized Logic' : 'Deploy Logic to Matrix'}</span>
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  )
}
