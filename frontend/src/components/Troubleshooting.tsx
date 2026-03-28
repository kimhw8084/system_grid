import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  AlertOctagon, Clock, CheckCircle2, ChevronRight, 
  Plus, Search, Trash2, Edit2, Info, 
  ListTodo, History, ShieldAlert, Globe, 
  Zap, Save, X, PlusCircle, User, MessageSquare,
  MoreVertical, RefreshCcw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { StatusPill } from './shared/StatusPill'
import { AgGridReact } from 'ag-grid-react'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

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
           <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${p.data.severity === 'Critical' ? 'bg-rose-500' : 'bg-amber-500'}`} />
           <span>{p.value}</span>
        </div>
      )
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 130, 
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => <StatusPill value={p.value} />
    },
    { 
      field: "severity", 
      headerName: "Sev", 
      width: 130, 
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => <StatusPill value={p.value} />
    },
    { field: "device_name", headerName: "Node", width: 150, cellClass: 'text-center font-black uppercase text-[var(--text-muted)]', headerClass: 'text-center' },
    { 
      field: "start_time", 
      headerName: "Time", 
      width: 160, 
      cellClass: 'text-center font-mono text-[var(--text-muted)]', 
      headerClass: 'text-center',
      cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleString() : 'N/A'
    },
    {
      headerName: "Ops",
      width: 100,
      pinned: 'right' as const,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <div className="flex bg-black/5 dark:bg-black/20 rounded-lg p-0.5 border border-[var(--glass-border)]">
               <button onClick={() => setActiveDetails(p.data)} title="View Forensics" className="p-1.5 hover:bg-blue-600 hover:text-white text-[var(--text-muted)] rounded-md transition-all"><Info size={14}/></button>
               <button onClick={() => setActiveModal(p.data)} title="Edit Record" className="p-1.5 hover:bg-blue-600 hover:text-white text-[var(--text-muted)] rounded-md transition-all"><Edit2 size={14}/></button>
               <button onClick={() => setConfirmModal({ isOpen: true, title: 'Purge Record', message: 'Erase this incident from ledger?', onConfirm: () => deleteMutation.mutate(p.data.id) })} title="Purge" className="p-1.5 hover:bg-rose-600 hover:text-white text-[var(--text-muted)] rounded-md transition-all"><Trash2 size={14}/></button>
           </div>
        </div>
      )
    }
  ], [])

  return (
    <div className="h-full flex flex-col space-y-4 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
           <div>
              <h1 className="text-2xl font-black uppercase tracking-tight italic text-[var(--text-primary)]">Troubleshooting Ledger</h1>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Post-Mortem & Incident Forensic Analysis</p>
           </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
             <input 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="SEARCH FORENSICS..." 
                className="bg-[var(--panel-item-bg)] border border-[var(--glass-border)] rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all text-[var(--text-primary)]" 
             />
          </div>

          <div className="relative">
            <button onClick={() => setShowBulkMenu(!showBulkMenu)} disabled={selectedIds.length === 0} className={`p-1.5 rounded-xl border transition-all ${selectedIds.length > 0 ? 'bg-blue-600/10 border-blue-500/30 text-blue-500' : 'bg-[var(--panel-item-bg)] border-[var(--glass-border)] text-[var(--text-muted)] cursor-not-allowed'}`}><MoreVertical size={18}/></button>
            <AnimatePresence>
              {showBulkMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-56 bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-2xl shadow-2xl z-50 p-2 space-y-1">
                   <p className="px-3 py-2 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--glass-border)] mb-1">{selectedIds.length} Records Selected</p>
                   <button onClick={() => { 
                       setConfirmModal({ isOpen: true, title: 'Bulk Purge', message: `Erase ${selectedIds.length} records from history permanently?`, onConfirm: () => {
                          bulkMutation.mutate({ action: 'delete', ids: selectedIds })
                          setSelectedIds([])
                          setShowBulkMenu(false)
                       }})
                    }} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-rose-500/20 rounded-lg text-rose-500 transition-all">Bulk Delete</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setActiveModal({ title: '', severity: 'Major', status: 'Investigating', timeline: [], todos: [] })}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus size={14} /> Add Incident
          </button>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--bg-primary)]/80 backdrop-blur-sm space-y-4 text-blue-500">
             <RefreshCcw size={32} className="animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Loading Incident Data...</p>
          </div>
        )}
        <AgGridReact 
          rowData={incidents || []} 
          columnDefs={columnDefs as any}
          defaultColDef={{ resizable: true, filter: true, sortable: true }}
          rowSelection="multiple"
          headerHeight={28}
          rowHeight={28}
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
          --ag-font-size: 10px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-size: 9px !important; justify-content: center !important; }
        .ag-cell { display: flex; align-items: center; justify-content: center !important; padding-left: 8px !important; }
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
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="glass-panel w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col p-10 rounded-[40px] border-blue-500/30"
      >
        <div className="flex items-center justify-between mb-8 border-b border-[var(--glass-border)] pb-6">
           <div className="flex items-center space-x-4">
              <div className="p-3 bg-rose-600/10 rounded-2xl text-rose-500">
                 <AlertOctagon size={24} />
              </div>
              <div>
                 <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[var(--text-primary)]">Incident Forensics</h2>
                 <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest">Entry ID: {formData.id || 'NEW_ENTITY'}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><X size={24}/></button>
        </div>

        <div className="flex space-x-2 mb-8">
           {['Overview', 'Analysis', 'Timeline', 'Prevention'].map(t => (
             <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                {t}
             </button>
           ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-8">
           {activeTab === 'Overview' && (
             <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Incident Title</label>
                      <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all text-[var(--text-primary)]" placeholder="Brief description of the failure..." />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Severity</label>
                         <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-3 text-xs font-bold outline-none focus:border-blue-500 appearance-none text-[var(--text-primary)]">
                            <option>Critical</option><option>Major</option><option>Minor</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Status</label>
                         <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-3 text-xs font-bold outline-none focus:border-blue-500 appearance-none text-[var(--text-primary)]">
                            <option>Investigating</option><option>Identified</option><option>Monitoring</option><option>Resolved</option><option>Prevented</option>
                         </select>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Affected Asset</label>
                      <select value={formData.device_id || ''} onChange={e => setFormData({...formData, device_id: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-3 text-xs font-bold outline-none focus:border-blue-500 appearance-none text-[var(--text-primary)]">
                         <option value="">Global / Network Wide</option>
                         {devices?.map((d:any) => <option key={d.id} value={d.id}>{d.name} [{d.type}]</option>)}
                      </select>
                   </div>
                </div>
                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Incident Start (ISO)</label>
                         <input type="datetime-local" value={formData.start_time?.slice(0,16)} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-3 text-xs font-bold outline-none focus:border-blue-500 [color-scheme:dark] text-[var(--text-primary)]" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Resolution Time</label>
                         <input type="datetime-local" value={formData.end_time?.slice(0,16)} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-3 text-xs font-bold outline-none focus:border-blue-500 [color-scheme:dark] text-[var(--text-primary)]" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Impact Analysis</label>
                      <textarea value={formData.impact_analysis} onChange={e => setFormData({...formData, impact_analysis: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-3 text-xs font-bold outline-none focus:border-blue-500 transition-all min-h-[120px] text-[var(--text-primary)]" placeholder="Explain the business or system impact..." />
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'Analysis' && (
             <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Root Cause Discovery</label>
                   <textarea value={formData.root_cause} onChange={e => setFormData({...formData, root_cause: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-blue-500 min-h-[300px] text-[var(--text-primary)]" placeholder="Deep dive into why the failure occurred..." />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Resolution Protocol</label>
                   <textarea value={formData.resolution_steps} onChange={e => setFormData({...formData, resolution_steps: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-blue-500 min-h-[300px] text-[var(--text-primary)]" placeholder="Step-by-step restoration of service..." />
                </div>
             </div>
           )}

           {activeTab === 'Timeline' && (
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">Incident Chronology</h3>
                   <button onClick={handleTimelineAdd} className="flex items-center space-x-2 text-[10px] font-black uppercase text-blue-500 hover:text-blue-400 transition-colors">
                      <PlusCircle size={14}/> <span>Add Milestone</span>
                   </button>
                </div>
                <div className="space-y-4">
                   {formData.timeline?.map((entry: any, i: number) => (
                     <div key={i} className="grid grid-cols-12 gap-4 items-center bg-[var(--panel-item-bg)] p-4 rounded-2xl border border-[var(--glass-border)]">
                        <input type="datetime-local" value={entry.time?.slice(0,16)} onChange={e => {
                           const tl = [...formData.timeline]; tl[i].time = e.target.value; setFormData({...formData, timeline: tl})
                        }} className="col-span-3 bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-[10px] text-[var(--text-primary)] outline-none [color-scheme:dark]" />
                        <select value={entry.type} onChange={e => {
                           const tl = [...formData.timeline]; tl[i].type = e.target.value; setFormData({...formData, timeline: tl})
                        }} className="col-span-2 bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-[10px] outline-none appearance-none text-[var(--text-primary)]">
                           <option>Info</option><option>Warning</option><option>Error</option><option>Success</option>
                        </select>
                        <input value={entry.event} onChange={e => {
                           const tl = [...formData.timeline]; tl[i].event = e.target.value; setFormData({...formData, timeline: tl})
                        }} className="col-span-6 bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-[10px] outline-none focus:border-blue-500 text-[var(--text-primary)]" placeholder="Milestone description..." />
                        <button onClick={() => {
                           const tl = formData.timeline.filter((_:any, idx:number) => idx !== i); setFormData({...formData, timeline: tl})
                        }} className="col-span-1 text-[var(--text-muted)] hover:text-rose-500 transition-colors flex justify-center"><Trash2 size={14}/></button>
                     </div>
                   ))}
                   {!formData.timeline?.length && <div className="text-center py-12 border-2 border-dashed border-[var(--glass-border)] rounded-[30px] text-[var(--text-muted)] font-bold uppercase text-[10px] tracking-widest italic">No milestones defined</div>}
                </div>
             </div>
           )}

           {activeTab === 'Prevention' && (
             <div className="grid grid-cols-2 gap-12">
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Lessons Learned</label>
                      <textarea value={formData.lessons_learned} onChange={e => setFormData({...formData, lessons_learned: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-blue-500 min-h-[150px] text-[var(--text-primary)]" placeholder="What did the team learn from this outage?" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Systemic Prevention Strategy</label>
                      <textarea value={formData.prevention_strategy} onChange={e => setFormData({...formData, prevention_strategy: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-blue-500 min-h-[150px] text-[var(--text-primary)]" placeholder="Architecture changes to prevent recurrence..." />
                   </div>
                </div>
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">Follow-up Action Registry</h3>
                      <button onClick={handleTodoAdd} className="flex items-center space-x-2 text-[10px] font-black uppercase text-emerald-500 hover:text-emerald-400 transition-colors">
                         <PlusCircle size={14}/> <span>Add Task</span>
                      </button>
                   </div>
                   <div className="space-y-3">
                      {formData.todos?.map((todo: any, i: number) => (
                        <div key={i} className="bg-[var(--panel-item-bg)] p-4 rounded-2xl border border-[var(--glass-border)] space-y-3">
                           <input value={todo.task} onChange={e => {
                              const td = [...formData.todos]; td[i].task = e.target.value; setFormData({...formData, todos: td})
                           }} className="w-full bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-xl px-4 py-2 text-[10px] outline-none text-[var(--text-primary)]" placeholder="Task description..." />
                           <div className="flex items-center justify-between">
                              <div className="flex space-x-2">
                                 <select value={todo.status} onChange={e => {
                                    const td = [...formData.todos]; td[i].status = e.target.value; setFormData({...formData, todos: td})
                                 }} className="bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-lg px-3 py-1 text-[9px] font-black uppercase outline-none text-[var(--text-primary)]">
                                    <option>Pending</option><option>Progress</option><option>Verified</option>
                                 </select>
                                 <input value={todo.owner} onChange={e => {
                                    const td = [...formData.todos]; td[i].owner = e.target.value; setFormData({...formData, todos: td})
                                 }} className="bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-lg px-3 py-1 text-[9px] font-bold uppercase outline-none w-24 text-[var(--text-primary)]" placeholder="Owner..." />
                              </div>
                              <button onClick={() => {
                                 const td = formData.todos.filter((_:any, idx:number) => idx !== i); setFormData({...formData, todos: td})
                              }} className="text-[var(--text-muted)] hover:text-rose-500 transition-colors"><Trash2 size={12}/></button>
                           </div>
                        </div>
                      ))}
                      {!formData.todos?.length && <div className="text-center py-12 border-2 border-dashed border-[var(--glass-border)] rounded-[30px] text-[var(--text-muted)] font-bold uppercase text-[10px] tracking-widest italic">No tasks registered</div>}
                   </div>
                </div>
             </div>
           )}
        </div>

        <div className="flex justify-end space-x-4 pt-10 border-t border-[var(--glass-border)] mt-8">
           <button onClick={onClose} className="px-8 py-3 text-[10px] font-black uppercase text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Abort Changes</button>
           <button 
             onClick={() => onSave(formData)} 
             disabled={isSaving}
             className="px-10 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center space-x-2"
           >
              {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Commit Forensics</span>
           </button>
        </div>
      </motion.div>
    </div>
  )
}

function IncidentDetails({ item, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-10 text-left">
       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-6xl h-[90vh] glass-panel rounded-[50px] border-white/5 overflow-hidden flex flex-col p-12">
          <div className="flex items-start justify-between mb-12">
             <div className="space-y-4">
                <div className="flex items-center space-x-4">
                   <StatusPill value={item.severity} />
                   <StatusPill value={item.status} />
                   <div className="h-4 w-px bg-white/10" />
                   <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">{new Date(item.start_time).toLocaleString()}</span>
                </div>
                <h1 className="text-5xl font-black italic tracking-tighter text-[var(--text-primary)] uppercase leading-none">{item.title}</h1>
                <div className="flex items-center space-x-3 text-[var(--text-muted)] uppercase font-black text-[10px] tracking-widest">
                   <Globe size={14} className="text-blue-500" />
                   <span>Root Asset: {item.device_name}</span>
                </div>
             </div>
             <button onClick={onClose} className="p-4 bg-[var(--panel-item-bg)] border border-[var(--glass-border)] rounded-3xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={32}/></button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-8">
             <div className="grid grid-cols-12 gap-12">
                <div className="col-span-8 space-y-12">
                   <section className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-500 dark:text-blue-400 flex items-center space-x-3">
                         <ShieldAlert size={16} /> <span>Impact Forensics</span>
                      </h3>
                      <p className="text-lg text-[var(--text-secondary)] leading-relaxed font-medium">{item.impact_analysis}</p>
                   </section>

                   <section className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-rose-500 dark:text-rose-400 flex items-center space-x-3">
                         <Zap size={16} /> <span>Root Cause discovery</span>
                      </h3>
                      <div className="bg-[var(--panel-item-bg)] border border-[var(--glass-border)] rounded-[30px] p-8 text-[var(--text-muted)] leading-relaxed italic border-l-4 border-l-rose-500">
                         {item.root_cause}
                      </div>
                   </section>

                   <section className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500 dark:text-emerald-400 flex items-center space-x-3">
                         <History size={16} /> <span>Restoration Timeline</span>
                      </h3>
                      <div className="space-y-0 relative ml-4">
                         <div className="absolute top-0 bottom-0 left-0 w-px bg-[var(--glass-border)]" />
                         {item.timeline?.map((evt: any, i: number) => (
                           <div key={i} className="relative pl-10 pb-10">
                              <div className="absolute left-[-4px] top-1 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                              <div className="flex items-center space-x-4 mb-1">
                                 <span className="text-[10px] font-mono text-[var(--text-muted)]">{new Date(evt.time).toLocaleString()}</span>
                                 <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[var(--panel-item-bg)] border border-[var(--glass-border)] text-[var(--text-muted)]">{evt.type}</span>
                              </div>
                              <p className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-tight">{evt.event}</p>
                           </div>
                         ))}
                      </div>
                   </section>
                </div>

                <div className="col-span-4 space-y-8">
                   <div className="bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-[40px] p-8 shadow-inner">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-6 flex items-center space-x-2">
                         <ListTodo size={14} /> <span>Prevention Registry</span>
                      </h3>
                      <div className="space-y-4">
                         {item.todos?.map((todo: any, i: number) => (
                           <div key={i} className="flex items-start space-x-4 group">
                              <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${todo.status === 'Verified' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-400 dark:bg-slate-700'}`} />
                              <div className="flex-1">
                                 <p className={`text-[11px] font-bold uppercase tracking-tight ${todo.status === 'Verified' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-secondary)]'}`}>{todo.task}</p>
                                 <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-[8px] font-black text-[var(--text-muted)] uppercase">{todo.owner || 'UNASSIGNED'}</span>
                                    <div className="w-1 h-1 rounded-full bg-[var(--glass-border)]" />
                                    <span className="text-[8px] font-black text-blue-500/70 uppercase">{todo.status}</span>
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>

                   <div className="glass-panel rounded-[40px] p-8 bg-blue-600/5 border-blue-500/10">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-4">Lessons Learned</h3>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed italic">"{item.lessons_learned}"</p>
                   </div>
                </div>
             </div>
          </div>
       </motion.div>
    </div>
  )
}
