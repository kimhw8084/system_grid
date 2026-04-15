import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Activity, Plus, Search, Filter, ExternalLink, 
  Trash2, Edit2, Shield, Cpu, Database, Network, 
  Globe, Bell, Info, ChevronRight, X, Check, Save,
  AlertCircle, Clock, Zap, Settings, MoreVertical, List,
  BookOpen, Eye, FileText, User, Mail, MessageSquare, Monitor,
  Download, Copy, ChevronDown, ChevronUp, Layers, RefreshCcw, Tag, Sliders, Clipboard
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgGridReact } from "ag-grid-react"
import toast from 'react-hot-toast'
import { apiFetch } from '../api/apiClient'
import { StyledSelect } from './shared/StyledSelect'
import { ConfigRegistryModal } from "./ConfigRegistry"
import { ConfirmationModal } from "./shared/ConfirmationModal"

const STATUSES = [
  { value: 'Existing', label: 'Existing', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'Planned', label: 'Planned', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { value: 'Decommissioned', label: 'Decommissioned', color: 'bg-slate-500/20 text-slate-400 border-white/20' },
  { value: 'Deleted', label: 'Deleted', color: 'bg-slate-800 text-slate-500 border-white/5' }
]

export default function MonitoringGrid() {
  const queryClient = useQueryClient()
  const gridRef = React.useRef<any>(null)
  
  // --- STYLE LABORATORY STATE ---
  const [fontSize, setFontSize] = useState(11)
  const [rowDensity, setRowDensity] = useState(10) // Extra padding per row
  const [showStyleLab, setShowStyleLab] = useState(true)
  const [showRegistry, setShowRegistry] = useState(false)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active')

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [detailItem, setDetailItem] = useState<any>(null)
  const [historyItem, setHistoryItem] = useState<any>(null)
  const [servicePopup, setServicePopup] = useState<{ names: string[], title: string } | null>(null)
  const [recipientPopup, setRecipientPopup] = useState<{ recipients: string[], method: string } | null>(null)
  const [bkmPopup, setBkmPopup] = useState<{ ids: number[], titles: string[] } | null>(null)
  const [activeBkm, setActiveBkm] = useState<any>(null)
  
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false)
  const [isBulkSeverityOpen, setIsBulkSeverityOpen] = useState(false)
  const [isBulkNotifyOpen, setIsBulkNotifyOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' })

  const { data: settingsOptions } = useQuery({ 
    queryKey: ['settings-options'], 
    queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) 
  })

  const categories = useMemo(() => Array.isArray(settingsOptions) ? settingsOptions.filter((o:any) => o.category === "MonitoringCategory") : [], [settingsOptions])
  const severities = useMemo(() => Array.isArray(settingsOptions) ? settingsOptions.filter((o:any) => o.category === "MonitoringSeverity") : [], [settingsOptions])
  const notificationMethods = useMemo(() => Array.isArray(settingsOptions) ? settingsOptions.filter((o:any) => o.category === "NotificationMethod") : [], [settingsOptions])
  const ownerRoles = useMemo(() => Array.isArray(settingsOptions) ? settingsOptions.filter((o:any) => o.category === "MonitoringOwnerRole") : [], [settingsOptions])

  const openConfirm = (title: string, message: string, onConfirm: () => void, variant: any = 'danger') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, variant })
  }

  const handleExportCSV = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `SysGrid_Monitoring_${new Date().toISOString().split('T')[0]}.csv`,
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
          .then(() => toast.success("Table data copied to clipboard"))
          .catch(() => toast.error("Failed to copy data"))
      }
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (showBulkMenu && !target.closest('.bulk-menu-container')) {
        setShowBulkMenu(false)
      }
    }
    if (showBulkMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showBulkMenu])

  const [searchTerm, setSearchTerm] = useState('')

  const { data: allItems, isLoading } = useQuery({
    queryKey: ['monitoring-items'],
    queryFn: async () => (await apiFetch('/api/v1/monitoring/?include_deleted=true')).json()
  })

  const items = useMemo(() => {
    if (!allItems) return []
    return allItems.filter((i: any) => activeTab === 'active' ? !i.is_deleted : i.is_deleted)
  }, [allItems, activeTab])

  useEffect(() => {
    if (gridRef.current?.api) {
      setTimeout(() => gridRef.current.api.autoSizeAllColumns(), 100)
    }
  }, [fontSize, rowDensity, items])

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json()
  })

  const bulkMutation = useMutation({
    mutationFn: async ({ action, payload = {}, ids: overrideIds }: any) => {
      const idsToUse = overrideIds ?? selectedIds
      const res = await apiFetch('/api/v1/monitoring/bulk-action', {
        method: 'POST',
        body: JSON.stringify({ ids: idsToUse, action, payload })
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
      setSelectedIds([])
      setShowBulkMenu(false)
      setIsBulkStatusOpen(false)
      setIsBulkSeverityOpen(false)
      setIsBulkNotifyOpen(false)
      toast.success('Bulk Operation Complete')
    },
    onError: (e: any) => toast.error(`Operation failed: ${e.message}`)
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
      cellClass: 'text-center font-bold text-slate-500',
      headerClass: 'text-center',
      filter: 'agNumberColumnFilter',
    },
    { 
      field: "device_name", 
      headerName: "Target Asset", 
      width: 140, 
      filter: true,
      cellClass: "font-bold text-center", 
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("device_name")
    },
    { 
      field: "category", 
      headerName: "Category", 
      width: 110,
      filter: true,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = {
          'Hardware': 'text-amber-500',
          'Network': 'text-blue-500',
          'OS': 'text-purple-500',
          'Application': 'text-emerald-500',
          'Database': 'text-rose-500'
        }
        return <span style={{ fontSize: `${fontSize}px` }} className={`font-bold uppercase ${colors[p.value] || 'text-slate-400'}`}>{p.value || 'N/A'}</span>
      },
      hide: hiddenColumns.includes("category")
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 110,
      filter: true,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = {
          'Healthy': 'text-emerald-400 border-emerald-500/40 bg-emerald-500/20',
          'Degraded': 'text-amber-400 border-amber-500/40 bg-amber-500/20',
          'Failing': 'text-rose-400 border-rose-500/40 bg-rose-500/20',
          'Maintenance': 'text-blue-400 border-blue-500/40 bg-blue-500/20',
          'Unknown': 'text-slate-400 border-white/20 bg-white/10'
        }
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className={`flex items-center justify-center w-24 h-5 rounded-md border shadow-sm ${colors[p.value] || 'text-slate-400 border-white/10 bg-white/5'}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold uppercase tracking-tighter leading-none">
                {p.value || 'Unknown'}
              </span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("status")
    },
    { 
      field: "is_active", 
      headerName: "Live", 
      width: 60,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const isActive = p.value
        const isDeleted = p.data.is_deleted || p.data.status === 'Deleted'
        return (
          <div className="flex items-center justify-center h-full">
            <div className="relative">
              <div className={`w-2 h-2 rounded-full ${isDeleted ? 'bg-slate-700' : isActive ? 'bg-emerald-500' : 'bg-rose-500/50'}`} />
              {(isActive && !isDeleted) && (
                <div className="absolute -inset-1 rounded-full bg-emerald-500 animate-pulse opacity-30" />
              )}
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("is_active")
    },
    { 
      field: "version", 
      headerName: "Ver", 
      width: 80, 
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center h-full w-full">
          <button 
            onClick={() => setHistoryItem(p.data)}
            className="flex items-center justify-center w-14 h-5 rounded-md border shadow-sm border-blue-500/40 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 transition-all"
          >
            <span style={{ fontSize: `${fontSize}px` }} className="font-bold uppercase tracking-tighter leading-none">v{p.value || 1}</span>
          </button>
        </div>
      ),
      hide: hiddenColumns.includes("version")
    },
    { 
      field: "owners", 
      headerName: "Owners", 
      filter: true,
      cellClass: "text-center font-bold uppercase", 
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const owners = p.value || []
        const count = owners.length
        if (count === 0) return <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500">N/A</span>
        return <span style={{ fontSize: `${fontSize}px` }}>{count > 1 ? `${owners[0].name} +${count-1}` : owners[0].name}</span>
      },
      hide: hiddenColumns.includes("owners")
    },

    { 
      field: "title", 
      headerName: "Title", 
      minWidth: 180,
      flex: 1.5, 
      filter: true,
      cellClass: "font-bold text-left uppercase tracking-tight", 
      headerClass: 'text-left',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("title")
    },
    { 
      field: "monitored_service_names", 
      headerName: "Services", 
      width: 90, 
      cellClass: "text-center", 
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const names = p.value || []
        const count = names.length
        if (count === 0) return <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>
        return (
          <div className="flex items-center justify-center h-full">
            <button 
              onClick={() => setServicePopup({ names, title: p.data.title })}
              className="px-2 py-0.5 bg-blue-600/20 border border-blue-500/30 rounded-lg font-bold text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              style={{ fontSize: `${fontSize}px` }}
            >
              {count}
            </button>
          </div>
        )
      },
      hide: hiddenColumns.includes("monitored_service_names")
    },
    { 
      field: "platform", 
      headerName: "Platform", 
      width: 100, 
      filter: true,
      cellClass: 'text-center font-bold uppercase text-slate-300', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span> : <span style={{ fontSize: `${fontSize}px` }} className="text-slate-500 font-bold uppercase">N/A</span>,
      hide: hiddenColumns.includes("platform")
    },
    { 
      field: "severity", 
      headerName: "Severity", 
      width: 110,
      filter: true,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => {
        const colors: any = {
          'Critical': 'bg-rose-500/20 text-rose-400 border-rose-500/40',
          'Warning': 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          'Info': 'bg-blue-500/20 text-blue-400 border-blue-500/40'
        }
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className={`flex items-center justify-center w-24 h-5 rounded-md border shadow-sm ${colors[p.value] || 'bg-slate-500/20 text-slate-400 border-white/10'}`}>
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold uppercase tracking-tighter leading-none">{p.value || 'N/A'}</span>
            </div>
          </div>
        )
      },
      hide: hiddenColumns.includes("severity")
    },
    { 
      field: "check_interval", 
      headerName: "Freq", 
      width: 70, 
      cellClass: 'text-center font-bold uppercase', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value ? `${p.value}s` : 'N/A'}</span>,
      hide: hiddenColumns.includes("check_interval")
    },
    { 
      field: "notification_method", 
      headerName: "Notify", 
      width: 100, 
      filter: true,
      cellClass: 'text-center', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center h-full">
           <button 
             onClick={() => setRecipientPopup({ recipients: p.data.notification_recipients || [], method: p.value })}
             className="flex items-center space-x-1 hover:text-blue-400 transition-colors"
           >
              <span style={{ fontSize: `${fontSize}px` }} className="font-bold uppercase text-slate-300 border-b border-dashed border-slate-700">{p.value || 'N/A'}</span>
           </button>
        </div>
      ),
      hide: hiddenColumns.includes("notification_method")
    },
    { 
      field: "purpose", 
      headerName: "Purpose", 
      flex: 1, 
      filter: true,
      cellClass: "font-bold text-slate-500 uppercase text-left truncate px-4", 
      headerClass: 'text-left',
      cellRenderer: (p: any) => <span style={{ fontSize: `${fontSize}px` }}>{p.value}</span>,
      hide: hiddenColumns.includes("purpose")
    },
    {
      headerName: "Action",
      width: 150,
      minWidth: 150,
      pinned: 'right',
      cellClass: 'text-center',
      headerClass: 'text-center',
      resizable: false,
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex rounded-lg p-0.5 border border-white/5 bg-transparent">
               <button onClick={() => setDetailItem(p.data)} title="Quick View" className="p-1.5 text-blue-400 hover:text-blue-200 transition-all border-r border-white/5"><Eye size={14}/></button>
               <button onClick={() => setBkmPopup({ ids: p.data.recovery_docs || [], titles: p.data.recovery_doc_titles || [] })} title="Recovery Procedures" className="p-1.5 text-amber-500 hover:text-amber-400 transition-all border-r border-white/5"><BookOpen size={14}/></button>
               <button onClick={() => { setEditingItem(p.data); setIsFormOpen(true); }} title="Edit Logic" className="p-1.5 text-emerald-400 hover:text-emerald-200 transition-all border-r border-white/5"><Edit2 size={14}/></button>
               {activeTab === 'active' ? (
                 <button onClick={() => openConfirm('De-activate', 'Move to deleted matrix?', () => bulkMutation.mutate({ action: 'delete', ids: [p.data.id] }))} title="De-activate" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
               ) : (
                 <button onClick={() => openConfirm('Purge Registry', 'PURGE PERMANENTLY?', () => bulkMutation.mutate({ action: 'purge', ids: [p.data.id] }))} title="Purge" className="p-1.5 text-rose-400 hover:text-rose-200 transition-all"><Trash2 size={14}/></button>
               )}
           </div>
        </div>
      ),
      suppressHide: true
    }
  ], [activeTab, bulkMutation, fontSize, hiddenColumns]) as any

  const autoSizeStrategy = useMemo(() => ({
    type: 'fitCellContents' as const
  }), []);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic flex items-center">
                <span>Monitoring Matrix</span>
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">High-Reliability Infrastructure Observability</p>
           </div>
           
           <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 ml-2">
                <button onClick={() => { setActiveTab('active'); setSelectedIds([]) }} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                    Active
                </button>
                <button onClick={() => { setActiveTab('deleted'); setSelectedIds([]) }} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'deleted' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                    Deleted
                </button>
           </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="SCAN MATRIX..."
              className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black outline-none focus:border-blue-500/50 w-64 transition-all"
            />
          </div>

          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5 space-x-1">
             <button onClick={() => setShowStyleLab(!showStyleLab)} className={`p-1.5 hover:bg-white/10 ${showStyleLab ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Toggle Style Lab">
                <Activity size={16} />
             </button>
             <button onClick={() => setShowColumnPicker(!showColumnPicker)} className={`p-1.5 hover:bg-white/10 ${showColumnPicker ? 'text-blue-400 bg-white/10' : 'text-slate-500'} rounded-lg transition-all`} title="Column Picker">
                <Sliders size={16} />
             </button>
             <button onClick={handleExportCSV} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Export CSV">
                <FileText size={16} />
             </button>
             <button onClick={handleCopyToClipboard} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-emerald-400 rounded-lg transition-all" title="Copy to Clipboard">
                <Clipboard size={16} />
             </button>
             <button onClick={() => setShowRegistry(true)} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Matrix Registry Config">
                <Settings size={16} />
             </button>
          </div>

          <div className="relative bulk-menu-container">
            <button onClick={() => setShowBulkMenu(!showBulkMenu)} disabled={selectedIds.length === 0} className={`p-1.5 rounded-xl border transition-all ${selectedIds.length > 0 ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-slate-700 cursor-not-allowed'}`}><MoreVertical size={18}/></button>
            <AnimatePresence>
              {showBulkMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-2 space-y-1">
                   <p className="px-3 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">{selectedIds.length} Monitors Selected</p>
                   {activeTab === 'deleted' ? (
                     <button onClick={() => bulkMutation.mutate({ action: 'restore' })} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-emerald-400 transition-all">Restore Selected</button>
                   ) : (
                     <>
                        <button onClick={() => { setIsBulkStatusOpen(true); setShowBulkMenu(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-blue-400 transition-all">Set Status...</button>
                        <button onClick={() => { setIsBulkSeverityOpen(true); setShowBulkMenu(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-rose-400 transition-all">Set Severity...</button>
                        <button onClick={() => { setIsBulkNotifyOpen(true); setShowBulkMenu(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-white/5 rounded-lg text-amber-400 transition-all">Set Notification...</button>
                     </>
                   )}
                   <div className="h-px bg-white/5 mx-2 my-1" />
                   <button onClick={() => { 
                       const title = activeTab === 'deleted' ? 'Purge Monitors' : 'De-activate Matrix'
                       const msg = activeTab === 'deleted' ? 'PURGE PERMANENTLY?' : 'De-activate selected monitors?'
                       openConfirm(title, msg, () => bulkMutation.mutate({ action: activeTab === 'deleted' ? 'purge' : 'delete' }))
                    }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-rose-500/20 rounded-lg text-rose-500 transition-all">{activeTab === 'deleted' ? 'Bulk Purge' : 'Bulk De-activate'}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => { setEditingItem(null); setIsFormOpen(true); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            + Add Monitoring
          </button>
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
                            type="range" min="0" max="20" step="2" 
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

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4">
             <RefreshCcw size={32} className="text-blue-400 animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Scanning Monitoring Matrix...</p>
          </div>
        )}
        <AgGridReact 
          ref={gridRef}
          rowData={items || []} 
          columnDefs={columnDefs} 
          rowSelection="multiple"
          headerHeight={fontSize + rowDensity + 10}
          rowHeight={fontSize + rowDensity + 10}
          onSelectionChanged={e => setSelectedIds(e.api.getSelectedNodes().map(n => n.data.id))}
          quickFilterText={searchTerm}
          suppressRowClickSelection={true}
          enableCellTextSelection={true}
          autoSizeStrategy={autoSizeStrategy}
        />

        <AnimatePresence>
          {showColumnPicker && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-0 right-0 bottom-0 w-64 bg-slate-950/90 backdrop-blur-xl border-l border-white/10 z-[60] flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center space-x-2">
                  <Sliders size={14} /> <span>Toggle Columns</span>
                </h3>
                <button onClick={() => setShowColumnPicker(false)} className="text-slate-500 hover:text-white"><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                {columnDefs.filter((c: any) => c.field && !c.suppressHide).map((col: any) => (
                  <label key={col.field} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-all">
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
                      <div className={`w-4 h-4 rounded border transition-all ${!hiddenColumns.includes(col.field) ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'border-white/10 bg-black/40 group-hover:border-white/20'}`}>
                         {!hiddenColumns.includes(col.field) && <Check size={12} className="text-white mx-auto" />}
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${!hiddenColumns.includes(col.field) ? 'text-slate-200' : 'text-slate-500'}`}>{col.headerName || col.field}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BulkActionModals
        isStatusOpen={isBulkStatusOpen}
        isSeverityOpen={isBulkSeverityOpen}
        isNotifyOpen={isBulkNotifyOpen}
        onClose={() => { setIsBulkStatusOpen(false); setIsBulkSeverityOpen(false); setIsBulkNotifyOpen(false); }}
        onApply={(action, val) => bulkMutation.mutate({ action: 'update', payload: { [action]: val } })}
        count={selectedIds.length}
        severities={severities}
        notificationMethods={notificationMethods}
      />

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      <AnimatePresence>
        {isFormOpen && (
          <MonitoringForm 
            item={editingItem} 
            devices={devices}
            categories={categories}
            severities={severities}
            notificationMethods={notificationMethods}
            ownerRoles={ownerRoles}
            onClose={() => setIsFormOpen(false)} 
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['monitoring-items'] })
              setIsFormOpen(false)
            }}
          />
        )}
        {detailItem && <MonitoringDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}
        {historyItem && <MonitoringHistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />}
        {servicePopup && <ServicesModal names={servicePopup.names} title={servicePopup.title} onClose={() => setServicePopup(null)} />}
        {recipientPopup && <RecipientsModal recipients={recipientPopup.recipients} method={recipientPopup.method} onClose={() => setRecipientPopup(null)} />}
        {bkmPopup && <BkmListModal ids={bkmPopup.ids} titles={bkmPopup.titles} onOpenBkm={setActiveBkm} onClose={() => setBkmPopup(null)} />}
        {activeBkm && <BkmDetailModal bkmId={activeBkm} onClose={() => setActiveBkm(null)} />}
        <ConfigRegistryModal
            isOpen={showRegistry}
            onClose={() => setShowRegistry(false)}
            title="Monitoring Matrix Enumerations"
            sections={[
                { title: "Categories", category: "MonitoringCategory", icon: Layers },
                { title: "Severity Levels", category: "MonitoringSeverity", icon: AlertCircle },
                { title: "Notification Methods", category: "NotificationMethod", icon: Bell },
                { title: "Owner Roles", category: "MonitoringOwnerRole", icon: User },
            ]}
        />
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
            font-weight: 700 !important; 
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
            font-size: ${fontSize}px !important;
        }

        }
        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.2) !important; }
        .ag-side-bar { background-color: #24283b !important; border-left: 1px solid rgba(255,255,255,0.05) !important; }
      `}</style>
    </div>
  )
}

function BulkActionModals({ isStatusOpen, isSeverityOpen, isNotifyOpen, onClose, onApply, count, severities, notificationMethods }: any) {
    const [val, setVal] = useState('')
    
    useEffect(() => { setVal(''); }, [isStatusOpen, isSeverityOpen, isNotifyOpen]);

    if (isStatusOpen) return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-md">
           <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-10 rounded-[40px] border border-blue-500/30 space-y-6">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-blue-400 flex items-center space-x-3">
                   <Tag size={24}/> <span>Update Status</span>
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">Updating {count} monitors</p>
              </div>
              <StyledSelect
                label="Target Status"
                value={val}
                onChange={e => setVal(e.target.value)}
                options={STATUSES}
                placeholder="Select Status..."
              />
              <div className="flex space-x-3 pt-2">
                 <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
                 <button disabled={!val} onClick={() => onApply('status', val)} className="flex-1 py-3 bg-blue-600 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Apply</button>
              </div>
           </motion.div>
        </div>
    )

    if (isSeverityOpen) return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-md">
           <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-10 rounded-[40px] border border-rose-500/30 space-y-6">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-rose-400 flex items-center space-x-3">
                   <Shield size={24}/> <span>Update Severity</span>
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">Updating {count} monitors</p>
              </div>
              <StyledSelect
                label="Target Severity"
                value={val}
                onChange={e => setVal(e.target.value)}
                options={severities.map((s:any) => ({ value: s.value, label: s.label }))}
                placeholder="Select Severity..."
              />
              <div className="flex space-x-3 pt-2">
                 <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
                 <button disabled={!val} onClick={() => onApply('severity', val)} className="flex-1 py-3 bg-rose-600 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-rose-500/20 active:scale-95 transition-all">Apply</button>
              </div>
           </motion.div>
        </div>
    )

    if (isNotifyOpen) return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-md">
           <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[400px] p-10 rounded-[40px] border border-amber-500/30 space-y-6">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-amber-400 flex items-center space-x-3">
                   <Bell size={24}/> <span>Update Notification</span>
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">Updating {count} monitors</p>
              </div>
              <StyledSelect
                label="Target Method"
                value={val}
                onChange={e => setVal(e.target.value)}
                options={notificationMethods.map((m:any) => ({ value: m.value, label: m.label }))}
                placeholder="Select Method..."
              />
              <div className="flex space-x-3 pt-2">
                 <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
                 <button disabled={!val} onClick={() => onApply('notification_method', val)} className="flex-1 py-3 bg-amber-600 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-amber-500/20 active:scale-95 transition-all">Apply</button>
              </div>
           </motion.div>
        </div>
    )

    return null;
}

// --- POPUP MODALS ---

function ServicesModal({ names, title, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-md p-6 rounded-3xl border-blue-500/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase text-blue-400">Monitored Services</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18}/></button>
        </div>
        <p className="text-[10px] text-slate-500 font-bold uppercase mb-4 italic">Linked to: {title}</p>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {names.map((name: string, i: number) => (
            <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center space-x-3">
              <Shield size={14} className="text-blue-500" />
              <span className="text-[11px] font-bold text-slate-200">{name}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function RecipientsModal({ recipients, method, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-md p-6 rounded-3xl border-emerald-500/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase text-emerald-400">Recipient Matrix</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18}/></button>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Bell size={12} className="text-slate-500" />
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Method: {method}</span>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {recipients.map((r: string, i: number) => (
            <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center space-x-3 group hover:border-emerald-500/30 transition-all">
              <Mail size={14} className="text-emerald-500" />
              <span className="text-[11px] font-bold text-slate-200">{r}</span>
            </div>
          ))}
          {recipients.length === 0 && <p className="text-center py-4 text-slate-600 italic text-[10px]">No recipients defined</p>}
        </div>
      </motion.div>
    </div>
  )
}

function BkmListModal({ ids, titles, onOpenBkm, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-lg p-6 rounded-3xl border-amber-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
             <BookOpen size={20} className="text-amber-500" />
             <h3 className="text-sm font-black uppercase text-amber-500 tracking-tight">Recovery Procedures</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18}/></button>
        </div>
        <p className="text-[10px] text-slate-500 font-black uppercase mb-4 tracking-widest">Linked Procedures (BKM)</p>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          {ids.map((id: number, i: number) => (
            <button 
              key={id} 
              onClick={() => onOpenBkm(id)}
              className="w-full text-left bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-amber-500/50 hover:bg-amber-500/5 transition-all shadow-lg"
            >
              <div className="flex items-center space-x-4">
                 <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                    <FileText size={16} />
                 </div>
                 <div>
                    <span className="text-[11px] font-black uppercase text-slate-200 block leading-tight">{titles[i]}</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">DOC ID: KB-{id}</span>
                 </div>
              </div>
              <ChevronRight size={14} className="text-slate-700 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
          {ids.length === 0 && (
             <div className="py-12 flex flex-col items-center justify-center space-y-3 border-2 border-dashed border-white/5 rounded-2xl">
                <BookOpen size={24} className="text-slate-800" />
                <p className="text-[10px] text-slate-700 font-black uppercase italic tracking-widest text-center px-8">No recovery procedures linked to this monitor</p>
             </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function BkmDetailModal({ bkmId, onClose }: any) {
  const { data: bkm, isLoading } = useQuery({
    queryKey: ['knowledge-entry', bkmId],
    queryFn: async () => (await apiFetch(`/api/v1/knowledge/${bkmId}`)).json(),
    enabled: !!bkmId
  })

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-xl p-8">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel w-full max-w-4xl h-[80vh] flex flex-col p-8 rounded-[40px] border-amber-500/30">
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
           <div className="flex items-center space-x-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/20">
                <BookOpen size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">{bkm?.title || 'Loading Document...'}</h2>
                <div className="flex items-center space-x-2 mt-0.5">
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Operational Triage Instruction</span>
                   <span className="w-1 h-1 rounded-full bg-slate-700" />
                   <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">BKM ID: KB-{bkmId}</span>
                </div>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors">
              <X size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-8">
           {isLoading ? (
             <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Clock size={32} className="text-amber-500 animate-spin" />
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest animate-pulse">Retrieving Knowledge...</span>
             </div>
           ) : (
             <>
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-6">
                   <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center space-x-2">
                      <Zap size={12}/> <span>Executive Summary</span>
                   </h4>
                   <p className="text-slate-300 font-bold leading-relaxed text-[13px]">{bkm.content || 'No content provided.'}</p>
                </div>

                {bkm.content_json?.steps?.length > 0 && (
                  <div className="space-y-4">
                     <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em] border-l-2 border-amber-500 pl-4">Resolution Workflow</h4>
                     <div className="space-y-4 pl-4">
                        {bkm.content_json.steps.map((step: any, i: number) => (
                           <div key={i} className="flex space-x-6 relative">
                              {i < bkm.content_json.steps.length - 1 && <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-white/5" />}
                              <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0 z-10 text-[12px] font-black text-amber-500 shadow-lg">
                                 {i + 1}
                              </div>
                              <div className="bg-black/20 border border-white/5 rounded-2xl p-5 flex-1 hover:border-amber-500/20 transition-all">
                                 <h5 className="text-[11px] font-black uppercase text-slate-200 mb-1">{step.title}</h5>
                                 <p className="text-[12px] text-slate-400 font-bold leading-relaxed">{step.description}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                )}
             </>
           )}
        </div>
      </motion.div>
    </div>
  )
}

function MonitoringDetailModal({ item, onClose }: any) {
  const [expandedLogic, setExpandedLogic] = useState<number | null>(item.logic_json?.[0]?.id || null)
  const [showLineNumbers, setShowLineNumbers] = useState(true)

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 sm:p-8">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-6xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col p-6 sm:p-10 rounded-[40px] border-blue-500/30 overflow-hidden shadow-[0_0_150px_rgba(37,99,235,0.15)] relative">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="flex items-center justify-between mb-8 relative z-10">
           <div className="flex items-center space-x-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                 <Monitor size={28} strokeWidth={1.5} />
              </div>
              <div>
                 <div className="flex items-center space-x-3 mb-1">
                    <span className="px-3 py-0.5 bg-blue-600/20 border border-blue-500/30 rounded-full text-[9px] font-black uppercase text-blue-400 tracking-tighter">
                       NODE: MON-{item.id}
                    </span>
                    <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${item.is_active ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-700/50 border-white/10 text-slate-500'}`}>
                       {item.status}
                    </span>
                 </div>
                 <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">{item.title}</h2>
              </div>
           </div>
           <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all">
              <X size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10">
           <div className="grid grid-cols-1 sm:grid-cols-12 gap-8">
              <div className="sm:col-span-7 space-y-8">
                 {/* Purpose & Impact */}
                 <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-blue-600/5 border border-white/5 rounded-3xl p-5 group hover:border-blue-500/20 transition-all">
                       <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center space-x-2">
                          <Info size={12}/> <span>Purpose</span>
                       </h4>
                       <p className="text-[11px] font-bold text-slate-300 leading-relaxed italic">
                          {item.purpose || 'No purpose defined.'}
                       </p>
                    </div>
                    <div className="bg-rose-600/5 border border-white/5 rounded-3xl p-5 group hover:border-rose-500/20 transition-all">
                       <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center space-x-2">
                          <Zap size={12}/> <span>Impact</span>
                       </h4>
                       <p className="text-[11px] font-bold text-slate-300 leading-relaxed italic">
                          {item.impact || 'No impact analysis defined.'}
                       </p>
                    </div>
                 </section>

                 {/* Logic Specification */}
                 <section className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em] flex items-center">
                         <Settings size={14} className="mr-3" /> Logic Specification
                      </h3>
                      <button 
                         onClick={() => setShowLineNumbers(!showLineNumbers)}
                         className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all ${showLineNumbers ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}
                      >
                         {showLineNumbers ? 'Hide Line Numbers' : 'Show Line Numbers'}
                      </button>
                    </div>
                    <div className="space-y-3">
                       {item.logic_json?.map((log: any) => (
                         <div key={log.id} className="bg-[#0f172a] border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-emerald-500/20">
                            <button 
                               onClick={() => setExpandedLogic(expandedLogic === log.id ? null : log.id)}
                               className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
                            >
                               <div className="flex items-center space-x-4">
                                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-tighter">TYPE: {log.type}</span>
                                  <span className="text-slate-300 font-bold text-[11px] uppercase tracking-tight">{log.description}</span>
                               </div>
                               {expandedLogic === log.id ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                            </button>
                            <AnimatePresence>
                               {expandedLogic === log.id && (
                                 <motion.div 
                                    initial={{ height: 0 }} 
                                    animate={{ height: 'auto' }} 
                                    exit={{ height: 0 }} 
                                    className="overflow-hidden bg-black/40 border-t border-white/5"
                                 >
                                    <div className="flex font-mono text-[12px] leading-relaxed overflow-x-auto custom-scrollbar">
                                       {showLineNumbers && (
                                          <div className="bg-white/5 border-r border-white/10 px-3 py-5 text-slate-600 text-right select-none whitespace-pre min-w-[40px]">
                                             {log.logic_info.split('\n').map((_: any, i: number) => i + 1).join('\n')}
                                          </div>
                                       )}
                                       <pre className="p-5 text-blue-300 flex-1">
                                          {log.logic_info}
                                       </pre>
                                    </div>
                                 </motion.div>
                               )}
                            </AnimatePresence>
                         </div>
                       ))}
                    </div>
                 </section>
              </div>

              <div className="sm:col-span-5 space-y-8">
                 {/* Reliability Matrix */}
                 <section className="space-y-3">
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center px-1">
                       <Bell size={14} className="mr-3" /> Reliability Matrix
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                       {[
                          { label: 'Severity', value: item.severity, color: 'text-rose-400', icon: Shield },
                          { label: 'Platform', value: item.platform, color: 'text-blue-400', icon: Globe },
                          { label: 'Frequency', value: `${item.check_interval}s`, color: 'text-slate-300', icon: Clock },
                          { label: 'Throttle', value: `${item.notification_throttle}s`, color: 'text-amber-400', icon: Zap }
                       ].map((stat, i) => (
                         <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-all">
                            <div className="flex items-center justify-between mb-2">
                               <stat.icon size={12} className="text-slate-600" />
                               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                            </div>
                            <span className={`text-[12px] font-black ${stat.color} uppercase tracking-tighter`}>{stat.value}</span>
                         </div>
                       ))}
                    </div>
                 </section>

                 {/* Recovery Linkage */}
                 <section className="space-y-3">
                    <h3 className="text-[11px] font-black text-amber-400 uppercase tracking-[0.3em] flex items-center px-1">
                       <BookOpen size={14} className="mr-3" /> Recovery Procedures
                    </h3>
                    <div className="space-y-2">
                       {item.recovery_doc_titles?.map((title: string, i: number) => (
                         <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3 flex items-center space-x-3 hover:border-amber-500/30 transition-all cursor-pointer group">
                            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all"><FileText size={14}/></div>
                            <span className="text-[10px] font-black uppercase text-slate-300 tracking-tight leading-tight">{title}</span>
                         </div>
                       ))}
                       {item.recovery_doc_titles?.length === 0 && (
                          <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 text-center">
                             <AlertCircle size={18} className="mx-auto text-rose-500 mb-2" />
                             <p className="text-[10px] font-black text-rose-500 uppercase italic">No BKM Linked</p>
                          </div>
                       )}
                    </div>
                 </section>

                 {item.monitoring_url && (
                    <button 
                       onClick={() => window.open(item.monitoring_url, '_blank')}
                       className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center space-x-3"
                    >
                       <ExternalLink size={14} />
                       <span>Open Platform Console</span>
                    </button>
                 )}
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  )
}

// --- REST OF THE FORM COMPONENT ---

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

export function MonitoringForm({ item, devices, categories, severities, notificationMethods, ownerRoles, onClose, onSuccess }: any) {
  const [activeTab, setActiveTab] = useState<'context' | 'logic' | 'alerting'>('context')
  const [recoverySearch, setRecoverySearch] = useState('')
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [activeLogicId, setActiveLogicId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    category: 'Infrastructure',
    status: 'Planned',
    title: '',
    spec: '',
    platform: 'Zabbix',
    monitoring_url: '',
    purpose: '',
    impact: '',
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
    owners: [],
    ...item
  })

  const [newOwner, setNewOwner] = useState({ name: '', external_id: '', role: ownerRoles?.[0]?.value || 'Primary Support' })

  const addOwner = () => {
    if (newOwner.name && newOwner.external_id) {
       setFormData({ ...formData, owners: [...formData.owners, newOwner] })
       setNewOwner({ name: '', external_id: '', role: ownerRoles?.[0]?.value || 'Primary Support' })
    }
  }

  const removeOwner = (idx: number) => {
    const next = [...formData.owners]
    next.splice(idx, 1)
    setFormData({ ...formData, owners: next })
  }

  // Sync is_active with status
  useEffect(() => {
    if (!item) { // Only for new items or when status explicitly changes
       if (formData.status === 'Existing') {
         setFormData(prev => ({ ...prev, is_active: true }))
       } else {
         setFormData(prev => ({ ...prev, is_active: false }))
       }
    }
  }, [formData.status, item])

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-panel w-full max-w-7xl h-full sm:h-[90vh] overflow-hidden flex flex-col p-6 sm:p-8 rounded-[40px] border-blue-500/30 shadow-[0_0_100px_rgba(37,99,235,0.1)]"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-6 mb-6 gap-4">
           <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-400 border border-blue-500/20">
                <Zap size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
                  {item ? 'Update Monitoring' : 'Add Monitoring'}
                </h2>
                <div className="flex items-center space-x-2 mt-0.5">
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Infrastructure Command Interface</span>
                   <span className="w-1 h-1 rounded-full bg-slate-700" />
                   <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${formData.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-white/10'}`}>
                      {formData.status}
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
                  className={`px-4 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
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
                <div className="col-span-12 sm:col-span-4 space-y-6">
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
                        options={categories.map((c:any) => ({ value: c.value, label: c.label }))}
                      />
                      <StyledSelect 
                        label="Status"
                        value={formData.status}
                        onChange={(e: any) => setFormData({...formData, status: e.target.value})}
                        options={STATUSES.map(s => ({ value: s.value, label: s.value }))}
                      />
                   </div>
                   
                   <div className="space-y-4 p-4 bg-white/5 rounded-3xl border border-white/5">
                      <div className="flex items-center justify-between px-1">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Ownership Matrix</h3>
                         <span className="text-[8px] font-bold text-blue-500 uppercase bg-blue-500/10 px-2 py-0.5 rounded-full">{formData.owners?.length || 0} Assigned</span>
                      </div>
                      
                      <div className="grid grid-cols-12 gap-2">
                         <div className="col-span-4">
                            <input 
                              value={newOwner.name}
                              onChange={e => setNewOwner({...newOwner, name: e.target.value})}
                              placeholder="Name..."
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-bold outline-none focus:border-blue-500"
                            />
                         </div>
                         <div className="col-span-3">
                            <input 
                              value={newOwner.external_id}
                              onChange={e => setNewOwner({...newOwner, external_id: e.target.value})}
                              placeholder="ID..."
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-bold outline-none focus:border-blue-500"
                            />
                         </div>
                         <div className="col-span-4">
                            <select 
                              value={newOwner.role}
                              onChange={e => setNewOwner({...newOwner, role: e.target.value})}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-bold outline-none focus:border-blue-500 appearance-none"
                            >
                               {ownerRoles.map((r:any) => <option key={r.id} value={r.value}>{r.label}</option>)}
                            </select>
                         </div>
                         <div className="col-span-1">
                            <button onClick={addOwner} className="w-full h-full flex items-center justify-center bg-blue-600 rounded-xl text-white hover:bg-blue-500 transition-all"><Plus size={14}/></button>
                         </div>
                      </div>

                      <div className="space-y-1 mt-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                         {formData.owners?.map((o: any, idx: number) => (
                           <div key={idx} className="flex items-center justify-between bg-black/20 p-2 rounded-xl border border-white/5 group">
                              <div className="flex items-center space-x-3">
                                 <User size={12} className="text-blue-500" />
                                 <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-200 uppercase">{o.name}</span>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{o.role} | ID: {o.external_id}</span>
                                 </div>
                              </div>
                              <button onClick={() => removeOwner(idx)} className="p-1 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="col-span-12 sm:col-span-8 space-y-6">
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

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-blue-400 flex items-center space-x-2">
                          <Info size={14}/> <span>Purpose</span>
                        </label>
                        <textarea 
                          value={formData.purpose}
                          onChange={e => setFormData({...formData, purpose: e.target.value})}
                          placeholder="Why are we monitoring this? How does it help the team?"
                          rows={4}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[11px] font-bold text-white outline-none focus:border-blue-500 transition-all resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-rose-400 flex items-center space-x-2">
                          <Zap size={14}/> <span>Impact</span>
                        </label>
                        <textarea 
                          value={formData.impact}
                          onChange={e => setFormData({...formData, impact: e.target.value})}
                          placeholder="What does it mean if this alert notifies? What is the consequence?"
                          rows={4}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[11px] font-bold text-white outline-none focus:border-blue-500 transition-all resize-none"
                        />
                      </div>
                   </div>
                </div>
             </div>
           ) : activeTab === 'logic' ? (
             <div className="grid grid-cols-12 gap-8 p-2 h-full min-h-[500px]">
                {/* Left: Logic Entry Selection */}
                <div className="col-span-12 sm:col-span-4 space-y-4">
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
                <div className="col-span-12 sm:col-span-8 flex flex-col space-y-4 h-full">
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
                           
                           <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl overflow-hidden flex font-mono text-[12px] shadow-inner relative group min-h-[200px]">
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
                <div className="col-span-12 sm:col-span-4 space-y-6">
                   <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-400 border-l-2 border-amber-600 pl-3">Alert Routing Rules</h3>
                   
                   <StyledSelect 
                     label="Severity Level"
                     value={formData.severity}
                     onChange={(e: any) => setFormData({...formData, severity: e.target.value})}
                     options={severities.map((s:any) => ({ value: s.value, label: s.label }))}
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
                        options={notificationMethods.map((m:any) => ({ value: m.value, label: m.label }))}
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
                <div className="col-span-12 sm:col-span-8 space-y-6">
                   <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-400 flex items-center space-x-2 border-b border-white/5 pb-2">
                      <Activity size={14}/> <span>Recovery Procedures (Linked BKM/Knowledge)</span>
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
                              className="w-full bg-black/60 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-[11px] font-black outline-none focus:border-blue-500 transition-all shadow-2xl"
                            />
                         </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
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

        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
           <div className="flex items-center space-x-2">
              <button 
                onClick={() => {
                  if (formData.status === 'Existing') {
                    setFormData({...formData, is_active: !formData.is_active})
                  }
                }}
                disabled={formData.status !== 'Existing'}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all ${
                  formData.is_active 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                    : 'bg-slate-500/10 border-white/10 text-slate-500 hover:bg-white/5 hover:text-white'
                } ${formData.status !== 'Existing' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full ${formData.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{formData.is_active ? 'Monitor Active' : 'Monitor Paused'}</span>
              </button>
           </div>

           <div className="flex space-x-4">
              <button onClick={onClose} className="px-6 sm:px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all">Abort</button>
              <button 
                onClick={() => mutation.mutate(formData)}
                disabled={mutation.isPending}
                className="px-8 sm:px-12 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:bg-slate-700 flex items-center space-x-2"
              >
                {mutation.isPending ? <Clock className="animate-spin" size={14} /> : <Check size={14} />}
                <span>{item ? 'Save Monitoring' : 'Add Monitoring'}</span>
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  )
}

function MonitoringHistoryModal({ item, onClose }: any) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['monitoring-history', item.id],
    queryFn: async () => (await apiFetch(`/api/v1/monitoring/${item.id}/history`)).json()
  })

  const [selectedIndex, setSelectedIndex] = useState(0)

  const current = history?.[selectedIndex]
  const previous = history?.[selectedIndex + 1]

  const getDiff = (v1: any, v2: any) => {
    if (!v1) return []
    const s1 = v1.snapshot || {}
    const s2 = v2?.snapshot || {}
    const keys = Array.from(new Set([...Object.keys(s1), ...Object.keys(s2)]))
    
    return keys.filter(k => {
      if (['updated_at', 'created_at', 'id', 'version', 'is_deleted'].includes(k)) return false
      return JSON.stringify(s1[k]) !== JSON.stringify(s2[k])
    }).map(k => ({
      field: k,
      old: s2[k],
      new: s1[k]
    }))
  }

  const diffs = getDiff(current, previous)

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-xl p-8">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-5xl h-[80vh] flex flex-col p-8 rounded-[40px] border-blue-500/30">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-400">
                <Clock size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Version History</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.title}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors">
              <X size={24} />
           </button>
        </div>

        <div className="flex-1 flex space-x-8 min-h-0">
           {/* Version List */}
           <div className="w-64 flex flex-col space-y-2 overflow-y-auto custom-scrollbar pr-2">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                   <RefreshCcw size={24} className="animate-spin text-blue-500" />
                </div>
              ) : (
                history?.map((h: any, idx: number) => (
                  <button 
                    key={h.id}
                    onClick={() => setSelectedIndex(idx)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all ${selectedIndex === idx ? 'bg-blue-600 border-blue-400 shadow-lg' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                       <span className={`text-[10px] font-black uppercase ${selectedIndex === idx ? 'text-white' : 'text-blue-400'}`}>v{h.version}</span>
                       <span className={`text-[8px] font-bold uppercase ${selectedIndex === idx ? 'text-blue-200' : 'text-slate-500'}`}>
                          {new Date(h.created_at).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                       </span>
                    </div>
                    <p className={`text-[9px] font-bold truncate ${selectedIndex === idx ? 'text-blue-100' : 'text-slate-400'}`}>
                       {h.change_summary || 'Manual Edit'}
                    </p>
                  </button>
                ))
              )}
           </div>

           {/* Diff View */}
           <div className="flex-1 bg-black/40 rounded-3xl border border-white/5 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {previous ? `Comparing v${previous.version} → v${current?.version}` : `Initial Version v${current?.version}`}
                 </h3>
                 {diffs.length > 0 && <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{diffs.length} Changes Detected</span>}
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                 {diffs.map((d: any, i: number) => (
                    <div key={i} className="space-y-2">
                       <div className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">{d.field.replace(/_/g, ' ')}</span>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 relative overflow-hidden">
                             <div className="absolute top-0 right-0 px-2 py-0.5 bg-rose-500/20 text-rose-500 text-[8px] font-black uppercase rounded-bl-lg">OLD</div>
                             <pre className="text-[11px] text-slate-500 line-through whitespace-pre-wrap font-mono">
                                {typeof d.old === 'object' ? JSON.stringify(d.old, null, 2) : String(d.old || '(empty)')}
                             </pre>
                          </div>
                          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 relative overflow-hidden">
                             <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase rounded-bl-lg">NEW</div>
                             <pre className="text-[11px] text-emerald-300 whitespace-pre-wrap font-mono font-bold">
                                {typeof d.new === 'object' ? JSON.stringify(d.new, null, 2) : String(d.new || '(empty)')}
                             </pre>
                          </div>
                       </div>
                    </div>
                 ))}
                 
                 {diffs.length === 0 && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                       <div className="p-4 bg-white/5 rounded-full">
                          <Check size={32} className="text-slate-700" />
                       </div>
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic text-center">
                          {previous ? 'No semantic differences detected between these versions' : 'This is the genesis version of this monitoring node'}
                       </p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  )
}

