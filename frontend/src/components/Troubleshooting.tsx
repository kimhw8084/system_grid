import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  AlertOctagon, Clock, CheckCircle2, ChevronRight, 
  Plus, Search, Trash2, Edit2, Info, 
  ListTodo, History, ShieldAlert, Globe, 
  Zap, Save, X, PlusCircle, User, MessageSquare,
  MoreVertical, RefreshCcw, TrendingUp, AlertTriangle,
  Lightbulb, ShieldCheck, Calendar, Activity
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { StatusPill } from './shared/StatusPill'
import { AgGridReact } from 'ag-grid-react'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

// --- Utility Components ---

const SummaryCard = ({ label, value, icon: Icon, color, trend }: any) => (
  <div className="glass-panel p-6 rounded-[32px] border-white/5 flex flex-col space-y-2 relative overflow-hidden group hover:border-blue-500/20 transition-all">
    <div className={`absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity ${color}`}>
       <Icon size={80} />
    </div>
    <div className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
       <Icon size={14} className={color} />
       <span>{label}</span>
    </div>
    <div className="flex items-baseline space-x-2">
       <span className="text-3xl font-black text-white tracking-tighter">{value}</span>
       {trend && <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">{trend}</span>}
    </div>
  </div>
)

export default function Troubleshooting() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeModal, setActiveModal] = useState<any>(null)
  const [activeDetails, setActiveDetails] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => (await apiFetch('/api/v1/incidents/')).json()
  })

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json()
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/incidents/${data.id}` : '/api/v1/incidents/'
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['audit'] })
      toast.success('Incident Forensic Registry Updated')
      setActiveModal(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/incidents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['audit'] })
      toast.success('Incident record purged')
    }
  })

  const bulkMutation = useMutation({
    mutationFn: async ({ action, ids }: any) => {
      const res = await apiFetch('/api/v1/incidents/bulk-action', { 
        method: 'POST', body: JSON.stringify({ ids, action }) 
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['audit'] })
      toast.success('Bulk operation complete')
      setShowBulkMenu(false)
    }
  })

  const analytics = useMemo(() => {
    if (!incidents) return { active: 0, critical: 0, mttr: '0h', risk: 'Low' }
    const active = incidents.filter((i: any) => i.status !== 'Resolved' && i.status !== 'Prevented').length
    const critical = incidents.filter((i: any) => i.severity === 'Critical').length
    return { active, critical, mttr: '4.2h', risk: active > 3 ? 'Elevated' : 'Stable' }
  }, [incidents])

  const columnDefs = useMemo(() => [
    { field: "id", headerName: "", width: 50, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left' as const, cellClass: 'text-center pl-4', headerClass: 'text-center pl-4' },
    { 
      field: "title", 
      headerName: "Incident", 
      flex: 1.5,
      pinned: 'left' as const,
      cellClass: 'font-bold text-blue-500 dark:text-blue-100',
      cellRenderer: (p: any) => (
        <div className="flex items-center space-x-3 h-full">
           <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${p.data.severity === 'Critical' ? 'bg-rose-500 shadow-[0_0_10px_#ef4444]' : 'bg-amber-500'}`} />
           <span className="truncate">{p.value}</span>
        </div>
      )
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 110, 
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => <StatusPill value={p.value} />
    },
    { 
      field: "severity", 
      headerName: "Sev", 
      width: 100, 
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => <StatusPill value={p.value} />
    },
    { field: "device_name", headerName: "Node", width: 130, cellClass: 'text-center font-black uppercase text-[var(--text-muted)]', headerClass: 'text-center' },
    { 
      field: "start_time", 
      headerName: "Time", 
      width: 150, 
      cellClass: 'text-center font-mono text-[var(--text-muted)]', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'
    },
    {
      headerName: "Ops",
      width: 80,
      pinned: 'right' as const,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex bg-black/5 dark:bg-black/20 rounded-lg p-0.5 border border-[var(--glass-border)]">
               <button onClick={() => setActiveDetails(p.data)} title="Open Forensics" className="p-1.5 hover:bg-blue-600 hover:text-white text-[var(--text-muted)] rounded-md transition-all"><ChevronRight size={14}/></button>
               <button onClick={() => setActiveModal(p.data)} title="Edit Record" className="p-1.5 hover:bg-blue-600 hover:text-white text-[var(--text-muted)] rounded-md transition-all"><Edit2 size={14}/></button>
               <button onClick={() => setConfirmModal({ isOpen: true, title: 'Purge Record', message: 'Erase this incident from ledger?', onConfirm: () => deleteMutation.mutate(p.data.id) })} title="Purge" className="p-1.5 hover:bg-rose-600 hover:text-white text-[var(--text-muted)] rounded-md transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      )
    }
  ], [])

  return (
    <div className="h-full flex flex-col space-y-8 text-left">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
           <h1 className="text-4xl font-black uppercase tracking-tighter italic text-[var(--text-primary)] leading-none">Incident Forensic Ledger</h1>
           <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.4em] font-black mt-2">Post-Mortem Analysis & Systemic Prevention Matrix</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative group">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-hover:text-blue-400 transition-colors" />
             <input 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Query Forensics..." 
                className="bg-[var(--panel-item-bg)] border border-[var(--glass-border)] rounded-2xl pl-12 pr-6 py-3 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-72 transition-all text-[var(--text-primary)]" 
             />
          </div>

          <button
            onClick={() => setActiveModal({ title: '', severity: 'Major', status: 'Investigating', timeline: [], todos: [] })}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus size={16} strokeWidth={3} /> Log Incident
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
         <SummaryCard label="Active Incidents" value={analytics.active} icon={AlertTriangle} color="text-amber-400" trend="+12% vs last mo" />
         <SummaryCard label="Critical Outages" value={analytics.critical} icon={Zap} color="text-rose-500" />
         <SummaryCard label="Mean Time to Resolve" value={analytics.mttr} icon={Clock} color="text-blue-400" trend="-0.5h improvement" />
         <SummaryCard label="Matrix Risk Level" value={analytics.risk} icon={ShieldAlert} color={analytics.risk === 'Stable' ? 'text-emerald-400' : 'text-rose-400'} />
      </div>

      <div className="flex-1 glass-panel rounded-[40px] overflow-hidden ag-theme-alpine-dark relative border-white/5">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--bg-primary)]/80 backdrop-blur-sm space-y-4 text-blue-500">
             <RefreshCcw size={32} className="animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Synchronizing Forensic Data...</p>
          </div>
        )}
        <AgGridReact 
          rowData={incidents || []} 
          columnDefs={columnDefs as any}
          defaultColDef={{ resizable: true, filter: true, sortable: true }}
          rowSelection="multiple"
          headerHeight={40}
          rowHeight={40}
          onSelectionChanged={e => setSelectedIds(e.api.getSelectedNodes().map(n => n.data.id))}
          quickFilterText={searchTerm}
          enableCellTextSelection={true}
          animateRows={true}
        />
      </div>

      <AnimatePresence>
        {activeModal && (
          <IncidentForm 
            item={activeModal} 
            devices={devices}
            onClose={() => setActiveModal(null)} 
            onSave={(data: any) => mutation.mutate(data)}
            isSaving={mutation.isPending}
          />
        )}
        {activeDetails && (
          <IncidentDetails 
            item={activeDetails} 
            onClose={() => setActiveDetails(null)} 
          />
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: var(--grid-header-bg);
          --ag-border-color: var(--grid-border);
          --ag-foreground-color: var(--text-primary);
          --ag-header-foreground-color: var(--text-secondary);
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 11px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.15em !important; font-size: 10px !important; justify-content: center !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; border-bottom: 1px solid var(--grid-border) !important; }
        .ag-row { border-bottom: none !important; }
      `}</style>
    </div>
  )
}

function IncidentForm({ item, devices, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ ...item })
  const [activeTab, setActiveTab] = useState('Overview')

  const handleTimelineAdd = () => {
    const newEntry = { time: new Date().toISOString(), event: '', type: 'Info' }
    setFormData({ ...formData, timeline: [...(formData.timeline || []), newEntry] })
  }

  const handleTodoAdd = () => {
    const newTodo = { task: '', status: 'Pending', owner: '' }
    setFormData({ ...formData, todos: [...(formData.todos || []), newTodo] })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10 text-left">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="glass-panel w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col p-12 rounded-[50px] border-blue-500/30"
      >
        <div className="flex items-center justify-between mb-10 border-b border-[var(--glass-border)] pb-8">
           <div className="flex items-center space-x-6">
              <div className="p-5 bg-rose-600/10 rounded-[2.5rem] text-rose-500 shadow-inner">
                 <AlertOctagon size={32} />
              </div>
              <div>
                 <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[var(--text-primary)] leading-none">Incident Recording Interface</h2>
                 <p className="text-[11px] text-[var(--text-muted)] uppercase font-black tracking-[0.4em] mt-2 italic">Matrix Core Forensic Log // Entry: {formData.id || 'INITIAL_CAPTURE'}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={32}/></button>
        </div>

        <div className="flex space-x-2 mb-10 p-1 bg-black/20 rounded-[2rem] w-fit">
           {['Overview', 'Analysis', 'Timeline', 'Prevention'].map(t => (
             <button key={t} onClick={() => setActiveTab(t)} className={`px-10 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                {t}
             </button>
           ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-6 custom-scrollbar">
           {activeTab === 'Overview' && (
             <div className="grid grid-cols-2 gap-12">
                <div className="space-y-10">
                   <div className="space-y-3">
                      <label className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] ml-2">Incident Identification</label>
                      <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-3xl px-8 py-5 text-lg font-bold outline-none focus:border-blue-500 transition-all text-[var(--text-primary)] shadow-inner" placeholder="CRITICAL_KERNEL_FAILURE..." />
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                         <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Severity Matrix</label>
                         <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-blue-500 appearance-none text-[var(--text-primary)] uppercase tracking-widest">
                            <option>Critical</option><option>Major</option><option>Minor</option>
                         </select>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Operational State</label>
                         <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-blue-500 appearance-none text-[var(--text-primary)] uppercase tracking-widest">
                            <option>Investigating</option><option>Identified</option><option>Monitoring</option><option>Resolved</option><option>Prevented</option>
                         </select>
                      </div>
                   </div>
                   <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Affected Matrix Entity</label>
                      <select value={formData.device_id || ''} onChange={e => setFormData({...formData, device_id: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-blue-500 appearance-none text-[var(--text-primary)] uppercase tracking-widest">
                         <option value="">Global Infrastructure</option>
                         {devices?.map((d:any) => <option key={d.id} value={d.id}>{d.name} [{d.type}]</option>)}
                      </select>
                   </div>
                </div>
                <div className="space-y-10">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                         <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Failure Timestamp</label>
                         <input type="datetime-local" value={formData.start_time?.slice(0,16)} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-blue-500 [color-scheme:dark] text-[var(--text-primary)]" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Restoration Timestamp</label>
                         <input type="datetime-local" value={formData.end_time?.slice(0,16)} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-blue-500 [color-scheme:dark] text-[var(--text-primary)]" />
                      </div>
                   </div>
                   <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Impact Analysis Payload</label>
                      <textarea value={formData.impact_analysis} onChange={e => setFormData({...formData, impact_analysis: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-[2.5rem] px-8 py-6 text-sm font-medium leading-relaxed outline-none focus:border-blue-500 transition-all min-h-[200px] text-[var(--text-primary)] shadow-inner" placeholder="Detailed business and system impact report..." />
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'Analysis' && (
             <div className="grid grid-cols-2 gap-12">
                <div className="space-y-4">
                   <h3 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.4em] mb-4 border-l-4 border-rose-500 pl-4">Root Cause Discovery</h3>
                   <textarea value={formData.root_cause} onChange={e => setFormData({...formData, root_cause: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-[2.5rem] px-8 py-8 text-sm font-medium outline-none focus:border-rose-500 min-h-[400px] text-[var(--text-primary)] leading-relaxed shadow-inner" placeholder="Vector analysis of the failure mechanism..." />
                </div>
                <div className="space-y-4">
                   <h3 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-4 border-l-4 border-emerald-500 pl-4">Resolution Protocol</h3>
                   <textarea value={formData.resolution_steps} onChange={e => setFormData({...formData, resolution_steps: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-[2.5rem] px-8 py-8 text-sm font-medium outline-none focus:border-emerald-500 min-h-[400px] text-[var(--text-primary)] leading-relaxed shadow-inner" placeholder="Executed steps to restore primary services..." />
                </div>
             </div>
           )}

           {activeTab === 'Timeline' && (
             <div className="max-w-4xl mx-auto space-y-10 py-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-4">
                      <History size={24} className="text-blue-400" />
                      <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter italic">Chronological Event Logs</h3>
                   </div>
                   <button onClick={handleTimelineAdd} className="flex items-center space-x-3 px-6 py-3 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-lg">
                      <PlusCircle size={16}/> <span>Add Event</span>
                   </button>
                </div>
                <div className="space-y-6 relative pl-4">
                   <div className="absolute top-0 bottom-0 left-4 w-px bg-[var(--glass-border)]" />
                   {formData.timeline?.map((entry: any, i: number) => (
                     <div key={i} className="relative pl-12 group">
                        <div className="absolute left-[-4px] top-6 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                        <div className="grid grid-cols-12 gap-6 bg-[var(--panel-item-bg)] p-6 rounded-[2rem] border border-[var(--glass-border)] group-hover:border-blue-500/30 transition-all shadow-inner">
                           <input type="datetime-local" value={entry.time?.slice(0,16)} onChange={e => {
                              const tl = [...formData.timeline]; tl[i].time = e.target.value; setFormData({...formData, timeline: tl})
                           }} className="col-span-3 bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-[10px] text-[var(--text-primary)] outline-none [color-scheme:dark]" />
                           <select value={entry.type} onChange={e => {
                              const tl = [...formData.timeline]; tl[i].type = e.target.value; setFormData({...formData, timeline: tl})
                           }} className="col-span-2 bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-[10px] outline-none appearance-none text-[var(--text-primary)] uppercase font-black">
                              <option>Info</option><option>Warning</option><option>Error</option><option>Success</option>
                           </select>
                           <input value={entry.event} onChange={e => {
                              const tl = [...formData.timeline]; tl[i].event = e.target.value; setFormData({...formData, timeline: tl})
                           }} className="col-span-6 bg-transparent border-b border-white/10 px-2 py-2 text-sm font-bold outline-none focus:border-blue-500 text-[var(--text-primary)] uppercase tracking-tight" placeholder="Event description..." />
                           <button onClick={() => {
                              const tl = formData.timeline.filter((_:any, idx:number) => idx !== i); setFormData({...formData, timeline: tl})
                           }} className="col-span-1 text-[var(--text-muted)] hover:text-rose-500 transition-colors flex justify-center"><Trash2 size={18}/></button>
                        </div>
                     </div>
                   ))}
                   {!formData.timeline?.length && <div className="text-center py-20 border-2 border-dashed border-[var(--glass-border)] rounded-[3rem] text-[var(--text-muted)] font-black uppercase text-xs tracking-[0.5em] italic">Timeline Registry Null</div>}
                </div>
             </div>
           )}

           {activeTab === 'Prevention' && (
             <div className="grid grid-cols-2 gap-12">
                <div className="space-y-10">
                   <div className="space-y-4">
                      <div className="flex items-center space-x-3 text-blue-400">
                         <Lightbulb size={20} />
                         <label className="text-[11px] font-black uppercase tracking-[0.3em]">Knowledge Alignment</label>
                      </div>
                      <textarea value={formData.lessons_learned} onChange={e => setFormData({...formData, lessons_learned: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-[2.5rem] px-8 py-8 text-sm font-medium outline-none focus:border-blue-500 min-h-[200px] text-[var(--text-primary)] italic leading-relaxed shadow-inner" placeholder="Post-mortem insights for the global engineering team..." />
                   </div>
                   <div className="space-y-4">
                      <div className="flex items-center space-x-3 text-emerald-400">
                         <ShieldCheck size={20} />
                         <label className="text-[11px] font-black uppercase tracking-[0.3em]">Systemic Fortification</label>
                      </div>
                      <textarea value={formData.prevention_strategy} onChange={e => setFormData({...formData, prevention_strategy: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-[2.5rem] px-8 py-8 text-sm font-medium outline-none focus:border-emerald-500 min-h-[200px] text-[var(--text-primary)] leading-relaxed shadow-inner" placeholder="Architectural changes to eliminate this failure vector..." />
                   </div>
                </div>
                <div className="space-y-8">
                   <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest italic flex items-center space-x-3">
                         <ListTodo size={18} /> <span>Strategic Action Items</span>
                      </h3>
                      <button onClick={handleTodoAdd} className="flex items-center space-x-2 px-4 py-2 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all shadow-lg">
                         <Plus size={14} strokeWidth={3}/> <span>Register Task</span>
                      </button>
                   </div>
                   <div className="space-y-4">
                      {formData.todos?.map((todo: any, i: number) => (
                        <div key={i} className="bg-black/20 p-6 rounded-[2.5rem] border border-[var(--glass-border)] hover:border-emerald-500/30 transition-all space-y-4 shadow-inner">
                           <input value={todo.task} onChange={e => {
                              const td = [...formData.todos]; td[i].task = e.target.value; setFormData({...formData, todos: td})
                           }} className="w-full bg-transparent border-b border-white/5 px-2 py-2 text-xs font-bold outline-none focus:border-emerald-500 text-[var(--text-primary)] uppercase tracking-tight" placeholder="Strategic task definition..." />
                           <div className="flex items-center justify-between">
                              <div className="flex space-x-3">
                                 <select value={todo.status} onChange={e => {
                                    const td = [...formData.todos]; td[i].status = e.target.value; setFormData({...formData, todos: td})
                                 }} className="bg-black/40 border border-white/10 rounded-xl px-4 py-1.5 text-[9px] font-black uppercase outline-none text-[var(--text-primary)] appearance-none tracking-widest">
                                    <option>Pending</option><option>Progress</option><option>Verified</option>
                                 </select>
                                 <div className="relative">
                                    <User size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input value={todo.owner} onChange={e => {
                                       const td = [...formData.todos]; td[i].owner = e.target.value; setFormData({...formData, todos: td})
                                    }} className="bg-black/40 border border-white/10 rounded-xl px-8 py-1.5 text-[9px] font-bold uppercase outline-none w-32 text-[var(--text-primary)] tracking-widest" placeholder="OWNER..." />
                                 </div>
                              </div>
                              <button onClick={() => {
                                 const td = formData.todos.filter((_:any, idx:number) => idx !== i); setFormData({...formData, todos: td})
                              }} className="p-2 text-[var(--text-muted)] hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                           </div>
                        </div>
                      ))}
                      {!formData.todos?.length && <div className="text-center py-24 border-2 border-dashed border-[var(--glass-border)] rounded-[3rem] text-[var(--text-muted)] font-black uppercase text-[10px] tracking-[0.4em] italic opacity-40">Prevention Backlog Null</div>}
                   </div>
                </div>
             </div>
           )}
        </div>

        <div className="flex justify-end space-x-6 pt-10 border-t border-[var(--glass-border)] mt-10">
           <button onClick={onClose} className="px-10 py-4 text-[11px] font-black uppercase text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all tracking-widest">Abort Logging</button>
           <button 
             onClick={() => onSave(formData)} 
             disabled={isSaving}
             className="px-16 py-4 bg-blue-600 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center space-x-3"
           >
              {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Commit Forensic Registry</span>
           </button>
        </div>
      </motion.div>
    </div>
  )
}

function IncidentDetails({ item, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-10 text-left">
       <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-7xl h-[92vh] glass-panel rounded-[60px] border-white/5 overflow-hidden flex flex-col p-16 shadow-2xl relative">
          <div className="absolute top-0 right-0 p-16 opacity-5 pointer-events-none">
             <ShieldAlert size={400} className="text-blue-500" />
          </div>

          <div className="flex items-start justify-between mb-16 relative z-10">
             <div className="space-y-6">
                <div className="flex items-center space-x-6">
                   <div className="px-4 py-1.5 bg-blue-600/10 border border-blue-500/30 rounded-full">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">CASE_{item.id}</span>
                   </div>
                   <StatusPill value={item.severity} />
                   <StatusPill value={item.status} />
                   <div className="h-4 w-px bg-white/10" />
                   <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      <Calendar size={14} className="text-blue-500" />
                      <span>{new Date(item.start_time).toLocaleString()}</span>
                   </div>
                </div>
                <h1 className="text-7xl font-black italic tracking-tighter text-white uppercase leading-none max-w-4xl">{item.title}</h1>
                <div className="flex items-center space-x-4 text-[var(--text-muted)] uppercase font-black text-xs tracking-[0.3em]">
                   <Globe size={18} className="text-blue-500" />
                   <span>Root Vector Entity:</span>
                   <span className="text-white px-3 py-1 bg-white/5 rounded-lg border border-white/5">{item.device_name}</span>
                </div>
             </div>
             <button onClick={onClose} className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem] text-[var(--text-muted)] hover:text-white transition-all shadow-xl hover:scale-105 active:scale-95"><X size={48}/></button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-12 relative z-10">
             <div className="grid grid-cols-12 gap-16">
                <div className="col-span-8 space-y-20">
                   <section className="space-y-6">
                      <div className="flex items-center space-x-4">
                         <ShieldAlert size={24} className="text-blue-400" />
                         <h3 className="text-sm font-black uppercase tracking-[0.4em] text-blue-400">Impact Forensics</h3>
                      </div>
                      <p className="text-2xl text-slate-200 leading-relaxed font-bold tracking-tight bg-white/[0.02] p-10 rounded-[3rem] border border-white/5 shadow-inner">{item.impact_analysis}</p>
                   </section>

                   <section className="space-y-6">
                      <div className="flex items-center space-x-4">
                         <Zap size={24} className="text-rose-500" />
                         <h3 className="text-sm font-black uppercase tracking-[0.4em] text-rose-500">Root Cause Discovery</h3>
                      </div>
                      <div className="bg-rose-500/5 border border-rose-500/20 rounded-[3rem] p-12 text-lg text-slate-300 leading-relaxed italic border-l-[12px] border-l-rose-500 shadow-xl">
                         {item.root_cause}
                      </div>
                   </section>

                   <section className="space-y-8">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-4">
                            <History size={24} className="text-emerald-400" />
                            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-emerald-400">Restoration Timeline</h3>
                         </div>
                         <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{item.timeline?.length || 0} Milestones Detected</span>
                         </div>
                      </div>
                      <div className="space-y-0 relative ml-6">
                         <div className="absolute top-0 bottom-0 left-0 w-px bg-white/10" />
                         {item.timeline?.map((evt: any, i: number) => (
                           <div key={i} className="relative pl-12 pb-12 last:pb-0">
                              <div className="absolute left-[-6px] top-1.5 w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_15px_#3b82f6] border-2 border-black" />
                              <div className="flex items-center space-x-6 mb-3">
                                 <div className="flex items-center space-x-2 text-[11px] font-mono font-black text-slate-500">
                                    <Clock size={12} />
                                    <span>{new Date(evt.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                 </div>
                                 <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border shadow-sm ${
                                    evt.type === 'Error' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                    evt.type === 'Warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                    evt.type === 'Success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    'bg-white/5 text-slate-400 border-white/10'
                                 }`}>{evt.type}</span>
                              </div>
                              <p className="text-xl font-black text-white uppercase tracking-tighter leading-tight">{evt.event}</p>
                           </div>
                         ))}
                      </div>
                   </section>
                </div>

                <div className="col-span-4 space-y-12">
                   <div className="bg-black/40 border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-5">
                         <ListTodo size={120} />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 mb-10 flex items-center space-x-3">
                         <ListTodo size={18} /> <span>Prevention Registry</span>
                      </h3>
                      <div className="space-y-6">
                         {item.todos?.map((todo: any, i: number) => (
                           <div key={i} className="flex items-start space-x-6 group p-4 rounded-3xl hover:bg-white/5 transition-all">
                              <div className={`mt-2 w-3 h-3 rounded-full shrink-0 ${todo.status === 'Verified' ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-slate-700'}`} />
                              <div className="flex-1">
                                 <p className={`text-[13px] font-bold uppercase tracking-tight leading-snug ${todo.status === 'Verified' ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{todo.task}</p>
                                 <div className="flex items-center space-x-3 mt-3">
                                    <div className="flex items-center space-x-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                       <User size={10} />
                                       <span>{todo.owner || 'UNASSIGNED'}</span>
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-white/10" />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${todo.status === 'Verified' ? 'text-emerald-500' : 'text-blue-500/70'}`}>{todo.status}</span>
                                 </div>
                              </div>
                           </div>
                         ))}
                         {!item.todos?.length && <div className="text-center py-16 text-slate-700 font-black uppercase italic text-[10px] tracking-widest">Prevention Registry Empty</div>}
                      </div>
                   </div>

                   <div className="bg-blue-600/5 border border-blue-500/20 rounded-[3rem] p-10 relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 opacity-10">
                         <Lightbulb size={100} className="text-blue-400" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-[0.4em] text-blue-400 mb-6 flex items-center space-x-3">
                         <Lightbulb size={18} /> <span>Lessons Learned</span>
                      </h3>
                      <p className="text-lg text-slate-300 leading-relaxed italic font-medium relative z-10">"{item.lessons_learned}"</p>
                   </div>

                   <div className="bg-emerald-600/5 border border-emerald-500/20 rounded-[3rem] p-10 relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 opacity-10">
                         <ShieldCheck size={100} className="text-emerald-400" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-[0.4em] text-emerald-400 mb-6 flex items-center space-x-3">
                         <ShieldCheck size={18} /> <span>Systemic Strategy</span>
                      </h3>
                      <p className="text-lg text-slate-300 leading-relaxed font-bold tracking-tight relative z-10">{item.prevention_strategy}</p>
                   </div>
                </div>
             </div>
          </div>
       </motion.div>
    </div>
  )
}
