import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ListTodo, History, ShieldAlert, Globe, 
  Zap, Save, X, PlusCircle, User, MessageSquare,
  MoreVertical, RefreshCcw, TrendingUp, AlertTriangle,
  Lightbulb, ShieldCheck, Calendar, Activity, Database, Server,
  FileText, Clipboard, Terminal, ArrowRight, Shield, Download, Share2,
  Clock, CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { AgGridReact } from 'ag-grid-react'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'
import { StatusPill } from './shared/StatusPill'

// --- Components ---

const CompactSummary = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-inner">
    <div>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xl font-black text-white tracking-tighter">{value}</p>
    </div>
    <div className={`p-2 rounded-lg bg-white/5 ${color}`}><Icon size={18} /></div>
  </div>
)

export default function Investigation() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeModal, setActiveModal] = useState<any>(null)
  const [activeDetails, setActiveDetails] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  const { data: investigations, isLoading } = useQuery({ 
    queryKey: ['investigations'], 
    queryFn: async () => (await apiFetch('/api/v1/investigations/')).json() 
  })
  
  const { data: devices } = useQuery({ 
    queryKey: ['devices'], 
    queryFn: async () => (await apiFetch('/api/v1/devices/')).json() 
  })
  
  const { data: options } = useQuery({ 
    queryKey: ['settings-options'], 
    queryFn: async () => (await apiFetch('/api/v1/settings/options')).json() 
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/investigations/${data.id}` : '/api/v1/investigations/'
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      return res.json()
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['investigations'] })
      toast.success('Investigation Synchronized')
      setActiveModal(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/v1/investigations/${id}`, { method: 'DELETE' }),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['investigations'] })
      toast.success('Investigation Purged')
    }
  })

  const stats = useMemo(() => {
    if (!investigations) return { total: 0, analyzing: 0, resolved: 0, urgent: 0 }
    return {
      total: investigations.length,
      analyzing: investigations.filter((i: any) => i.status === 'Analyzing').length,
      resolved: investigations.filter((i: any) => i.status === 'Resolved').length,
      urgent: investigations.filter((i: any) => i.priority === 'Urgent').length
    }
  }, [investigations])

  const columnDefs = useMemo(() => [
    { field: "id", headerName: "ID", width: 60, pinned: 'left', cellClass: 'text-center font-mono text-slate-500' },
    { field: "title", headerName: "Investigation Title", flex: 1.5, pinned: 'left', cellClass: 'font-bold text-white uppercase tracking-tight' },
    { field: "status", headerName: "Status", width: 120, cellRenderer: (p: any) => <StatusPill value={p.value} /> },
    { field: "priority", headerName: "Priority", width: 100, cellRenderer: (p: any) => (
        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
          p.value === 'Urgent' ? 'bg-rose-500/20 border-rose-500/30 text-rose-500 animate-pulse' :
          p.value === 'High' ? 'bg-amber-500/20 border-amber-500/30 text-amber-500' :
          'bg-blue-500/20 border-blue-500/30 text-blue-400'
        }`}>{p.value}</span>
      )
    },
    { field: "assigned_team", headerName: "Owner Team", width: 130, cellClass: 'text-center' },
    { field: "updated_at", headerName: "Last Pulse", width: 140, cellClass: 'font-mono text-[10px] text-slate-400', cellRenderer: (p: any) => p.value ? new Date(p.value).toLocaleString() : '---' },
    {
      headerName: "Action",
      width: 100,
      pinned: 'right',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center space-x-1 h-full">
           <button onClick={() => setActiveDetails(p.data)} className="p-1.5 bg-blue-600/10 text-blue-400 rounded-lg hover:bg-blue-600/20 transition-all"><Eye size={14}/></button>
           <button onClick={() => setConfirmModal({ isOpen: true, title: 'Purge Investigation', message: 'Permanently remove this record?', onConfirm: () => deleteMutation.mutate(p.data.id) })} className="p-1.5 bg-rose-600/10 text-rose-400 rounded-lg hover:bg-rose-600/20 transition-all"><Trash2 size={14}/></button>
        </div>
      )
    }
  ], [])

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-3">
            <Shield size={32} className="text-blue-500" /> Operational Investigations
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">Deep Forensics & Urgent Task Tracking Engine</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search investigations..." className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-blue-500/50 w-64 transition-all" />
          </div>
          <button onClick={() => setActiveModal({ title: '', status: 'Analyzing', priority: 'Medium', systems: [], impacted_device_ids: [] })} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ Launch Investigation</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <CompactSummary label="Total Active" value={stats.total} icon={Activity} color="text-blue-400" />
        <CompactSummary label="Under Analysis" value={stats.analyzing} icon={Terminal} color="text-amber-400" />
        <CompactSummary label="Urgent Escalations" value={stats.urgent} icon={AlertTriangle} color="text-rose-500" />
        <CompactSummary label="Closed/Resolved" value={stats.resolved} icon={ShieldCheck} color="text-emerald-400" />
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-hidden ag-theme-alpine-dark relative border-white/5">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020617]/80 backdrop-blur-sm space-y-4 text-blue-400">
             <RefreshCcw size={32} className="animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing investigation registry...</p>
          </div>
        )}
        <AgGridReact 
          rowData={investigations || []} 
          columnDefs={columnDefs as any}
          headerHeight={32}
          rowHeight={32}
          quickFilterText={searchTerm}
        />
      </div>

      <AnimatePresence>
        {activeModal && (
          <InvestigationForm 
            item={activeModal} 
            options={options} 
            devices={devices} 
            onClose={() => setActiveModal(null)} 
            onSave={(d: any) => mutation.mutate(d)}
            isSaving={mutation.isPending}
          />
        )}
        {activeDetails && (
          <InvestigationDetails 
            item={activeDetails} 
            onClose={() => setActiveDetails(null)} 
            onSave={(d: any) => mutation.mutate(d)}
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
          --ag-header-background-color: rgba(15, 23, 42, 0.9);
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #94a3b8;
          --ag-font-family: 'Inter', sans-serif;
          --ag-font-size: 10px;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-size: 9px !important; }
        .ag-cell { display: flex; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05) !important; padding-left: 12px !important; }
      `}</style>
    </div>
  )
}

function InvestigationForm({ item, options, devices, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({ ...item })
  const systems = useMemo(() => options?.filter((o:any) => o.category === 'LogicalSystem').map((o:any) => ({ value: o.value, label: o.label })) || [], [options])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-10">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-[600px] p-10 rounded-[40px] border border-blue-500/30 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <h2 className="text-2xl font-black uppercase text-blue-400 flex items-center gap-3">
            <PlusCircle size={24} /> New Investigation
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Investigation Title</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 text-white font-bold" placeholder="e.g. Unexplained latency in SAP Cluster" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StyledSelect label="Priority" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} options={[{value:'Urgent', label:'Urgent'}, {value:'High', label:'High'}, {value:'Medium', label:'Medium'}, {value:'Low', label:'Low'}]} />
            <StyledSelect label="Assigned Team" value={formData.assigned_team} onChange={e => setFormData({...formData, assigned_team: e.target.value})} options={[{value:'SRE', label:'SRE'}, {value:'Network', label:'Network'}, {value:'DBA', label:'Database'}, {value:'AppDev', label:'App Dev'}]} />
          </div>

          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Problem Statement</label>
            <textarea value={formData.problem_statement} onChange={e => setFormData({...formData, problem_statement: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500 text-slate-300 min-h-[100px]" placeholder="Detailed description of the issue being investigated..." />
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
          <button onClick={() => onSave(formData)} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
            {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />} 
            Initialize Tracker
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function InvestigationDetails({ item, onClose, onSave }: any) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({ ...item })
  const [pulseText, setPulseText] = useState('')
  const [activeTab, setActiveTab] = useState('journal')

  const pulseMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiFetch(`/api/v1/investigations/${item.id}/logs`, {
        method: 'POST',
        body: JSON.stringify({ entry_text: text, entry_type: 'Update' })
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigations'] })
      setPulseText('')
      toast.success('Pulse Recorded')
    }
  })

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-10">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-6xl h-[85vh] rounded-[40px] border border-blue-500/20 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-white/5 flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${formData.priority === 'Urgent' ? 'bg-rose-500/20 border-rose-500/30 text-rose-500' : 'bg-blue-500/20 border-blue-500/30 text-blue-400'}`}>{formData.priority} PRIORITY</span>
              <StatusPill value={formData.status} />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">ID: INV_{formData.id}</span>
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">{formData.title}</h1>
            <p className="text-xs text-slate-400 max-w-2xl">{formData.problem_statement}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => onSave(formData)} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">Save Changes</button>
            <button onClick={onClose} className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all"><X size={20}/></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Nav */}
          <div className="w-48 border-r border-white/5 bg-black/20 p-6 space-y-1">
            <button onClick={() => setActiveTab('journal')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'journal' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>
              <History size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Pulse Log</span>
            </button>
            <button onClick={() => setActiveTab('forensics')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'forensics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>
              <Terminal size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Forensics</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>
              <Sliders size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Control</span>
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
            {activeTab === 'journal' && (
              <div className="max-w-3xl space-y-8">
                {/* Pulse Input */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-2"><Activity size={14}/> Record Progress Pulse</h3>
                  <textarea 
                    value={pulseText} 
                    onChange={e => setPulseText(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-xs outline-none focus:border-blue-500 text-white min-h-[80px]"
                    placeholder="What did you find? Any actions taken?..."
                  />
                  <div className="flex justify-end">
                    <button 
                      disabled={!pulseText || pulseMutation.isPending}
                      onClick={() => pulseMutation.mutate(pulseText)}
                      className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      Post Pulse
                    </button>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-6 relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-white/5">
                  {(formData.progress_logs || []).slice().reverse().map((log: any) => (
                    <div key={log.id} className="relative pl-12">
                      <div className="absolute left-[13px] top-2 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{log.added_by} // {new Date(log.timestamp).toLocaleString()}</span>
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-600/10 text-blue-400 border border-blue-500/20">{log.entry_type}</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">{log.entry_text}</p>
                      </div>
                    </div>
                  ))}
                  {(!formData.progress_logs || formData.progress_logs.length === 0) && (
                    <div className="py-20 text-center text-slate-600 italic text-[10px] font-black uppercase tracking-widest">No investigation activity recorded yet</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'forensics' && (
              <div className="max-w-4xl space-y-8">
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-rose-400"><Zap size={16} /><h3 className="text-[10px] font-black uppercase tracking-widest">Trigger Event / Initial Fault</h3></div>
                  <textarea value={formData.trigger_event || ''} onChange={e => setFormData({...formData, trigger_event: e.target.value})} className="w-full bg-slate-900 border border-white/5 rounded-2xl p-6 text-xs outline-none focus:border-rose-500/50 text-slate-300 h-32" placeholder="What caused this?..." />
                </section>
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-400"><Search size={16} /><h3 className="text-[10px] font-black uppercase tracking-widest">Root Cause Analysis</h3></div>
                  <textarea value={formData.root_cause || ''} onChange={e => setFormData({...formData, root_cause: e.target.value})} className="w-full bg-slate-900 border border-white/5 rounded-2xl p-6 text-xs outline-none focus:border-blue-500/50 text-slate-300 h-32" placeholder="Deep dive findings..." />
                </section>
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400"><ShieldCheck size={16} /><h3 className="text-[10px] font-black uppercase tracking-widest">Resolution Steps</h3></div>
                  <textarea value={formData.resolution_steps || ''} onChange={e => setFormData({...formData, resolution_steps: e.target.value})} className="w-full bg-slate-900 border border-white/5 rounded-2xl p-6 text-xs outline-none focus:border-emerald-500/50 text-slate-300 h-32" placeholder="How was it fixed?..." />
                </section>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-xl space-y-6">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-white/20 pl-3">Investigation Parameters</h3>
                <StyledSelect label="Current Phase" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={[{value:'Analyzing', label:'Analyzing'}, {value:'Escalated', label:'Escalated'}, {value:'Monitoring', label:'Monitoring'}, {value:'Resolved', label:'Resolved'}, {value:'Closed', label:'Closed'}]} />
                <StyledSelect label="Priority Rating" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} options={[{value:'Urgent', label:'Urgent'}, {value:'High', label:'High'}, {value:'Medium', label:'Medium'}, {value:'Low', label:'Low'}]} />
                
                <div className="pt-6 border-t border-white/5">
                  <button onClick={() => setConfirmModal({ isOpen: true, title: 'Archive Investigation', message: 'Move this investigation to history?', onConfirm: () => { /* archive logic */ } })} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Archive Record</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
