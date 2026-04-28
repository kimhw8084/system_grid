import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, Info, 
  ListTodo, History, ShieldAlert, Globe, 
  Zap, Save, X, PlusCircle, User, MessageSquare,
  MoreVertical, RefreshCcw, TrendingUp, AlertTriangle,
  Lightbulb, ShieldCheck, Calendar, Activity, Database, Server,
  FileText, Clipboard, Terminal, ArrowRight, Shield, Download, Share2,
  Clock, CheckCircle2, ChevronRight, LayoutGrid, List, Sliders, Eye, Camera, Link as LinkIcon, Link2, Layers, Settings, Check, Target, ChevronDown, PlusCircle as PlusIcon,
  Workflow, ExternalLink, Briefcase, BarChart3, Users, DollarSign, Image as ImageIcon, HelpCircle
} from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { AgGridReact } from 'ag-grid-react'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'
import { StatusPill } from './shared/StatusPill'

// --- Types & Constants ---

const PROJECT_TYPES = [
  { value: 'Strategic', label: 'STRATEGIC' },
  { value: 'Tactical', label: 'TACTICAL' },
  { value: 'Operational', label: 'OPERATIONAL' },
  { value: 'Research', label: 'RESEARCH' }
]

const PROJECT_STATUSES = [
  { value: 'Planning', label: 'PLANNING' },
  { value: 'In Progress', label: 'IN PROGRESS' },
  { value: 'On Hold', label: 'ON HOLD' },
  { value: 'Completed', label: 'COMPLETED' },
  { value: 'Cancelled', label: 'CANCELLED' }
]

const DEFENSE_LINES = [
  { value: 0, label: 'LINE 0: BASE' },
  { value: 1, label: 'LINE 1: FORTIFIED' },
  { value: 2, label: 'LINE 2: RESILIENT' }
]

// --- Sub-components ---

const GanttChart = ({ tasks }: { tasks: any[] }) => {
  if (!tasks || tasks.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-600 border-2 border-dashed border-white/5 rounded-xl bg-black/20">
       <Calendar size={32} className="mb-2 opacity-20" />
       <p className="text-[9px] font-bold uppercase tracking-widest">No Schedule Data</p>
    </div>
  )

  const sortedTasks = [...tasks].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  const startDates = sortedTasks.map(t => new Date(t.start_date).getTime())
  const endDates = sortedTasks.map(t => new Date(t.end_date).getTime())
  const minDate = Math.min(...startDates)
  const maxDate = Math.max(...endDates)
  const duration = maxDate - minDate
  
  const chartStart = minDate - duration * 0.05
  const chartEnd = maxDate + duration * 0.05
  const chartDuration = chartEnd - chartStart

  return (
    <div className="space-y-2 p-4 bg-black/40 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar">
      <div className="min-w-[600px] space-y-1">
        {sortedTasks.map((task, idx) => {
          const startPct = ((new Date(task.start_date).getTime() - chartStart) / chartDuration) * 100
          const endPct = ((new Date(task.end_date).getTime() - chartStart) / chartDuration) * 100
          const widthPct = Math.max(endPct - startPct, 2)

          return (
            <div key={idx} className="group relative h-8 flex items-center">
              <div className="w-32 flex-shrink-0 text-[9px] font-bold uppercase text-slate-500 truncate pr-2">
                {task.name}
              </div>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full relative overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%`, left: `${startPct}%` }}
                  className={`absolute h-full rounded-full flex items-center ${
                    task.status === 'Completed' ? 'bg-emerald-500' : 
                    task.status === 'In Progress' ? 'bg-blue-500' : 
                    'bg-slate-600'
                  }`}
                >
                  <div className="h-full bg-white/20" style={{ width: `${task.progress}%` }} />
                </motion.div>
              </div>
              <div className="w-8 text-right text-[8px] font-bold text-slate-600 ml-2">
                {task.progress}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const AppendixSection = ({ project, onUpdate }: { project: any, onUpdate: (data: any) => void }) => {
  const [glossary, setGlossary] = useState(project.appendix_json?.glossary || [])
  const [images, setImages] = useState(project.appendix_json?.images || [])
  const [newTerm, setNewTerm] = useState({ term: '', definition: '' })

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile()
        if (blob) {
          const reader = new FileReader()
          reader.onload = (event) => {
            const base64 = event.target?.result as string
            const newImages = [...images, { id: Date.now(), data: base64, timestamp: new Date().toISOString() }]
            setImages(newImages)
            onUpdate({ ...project, appendix_json: { ...project.appendix_json, images: newImages } })
            toast.success('Image Captured to Matrix')
          }
          reader.readAsDataURL(blob)
        }
      }
    }
  }

  const addTerm = () => {
    if (!newTerm.term) return
    const newGlossary = [...glossary, newTerm]
    setGlossary(newGlossary)
    onUpdate({ ...project, appendix_json: { ...project.appendix_json, glossary: newGlossary } })
    setNewTerm({ term: '', definition: '' })
  }

  return (
    <div className="space-y-6" onPaste={handlePaste}>
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
            <BookOpen size={14} /> Global Glossary
          </h4>
          <div className="flex gap-2">
            <input 
              value={newTerm.term} 
              onChange={e => setNewTerm({ ...newTerm, term: e.target.value })}
              className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[11px] font-bold outline-none focus:border-blue-500" 
              placeholder="TERM" 
            />
            <input 
              value={newTerm.definition} 
              onChange={e => setNewTerm({ ...newTerm, definition: e.target.value })}
              className="flex-[2] bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[11px] font-bold outline-none focus:border-blue-500" 
              placeholder="DEFINITION" 
            />
            <button onClick={addTerm} className="p-1.5 bg-blue-600 rounded hover:bg-blue-500 transition-colors"><Plus size={16}/></button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
            {glossary.map((g: any, i: number) => (
              <div key={i} className="flex gap-4 p-2 bg-white/5 rounded border border-white/5">
                <span className="text-[10px] font-bold text-blue-400 w-24 shrink-0 uppercase">{g.term}</span>
                <span className="text-[10px] text-slate-400 font-bold">{g.definition}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
            <ImageIcon size={14} /> Evidence Vault (Ctrl+V)
          </h4>
          <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
            {images.map((img: any) => (
              <div key={img.id} className="aspect-video bg-white/5 rounded border border-white/10 overflow-hidden relative group">
                <img src={img.data} className="w-full h-full object-cover" />
                <button 
                  onClick={() => {
                    const filtered = images.filter((i:any) => i.id !== img.id)
                    setImages(filtered)
                    onUpdate({ ...project, appendix_json: { ...project.appendix_json, images: filtered } })
                  }}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12}/>
                </button>
              </div>
            ))}
            {images.length === 0 && (
              <div className="col-span-3 h-24 border-2 border-dashed border-white/5 rounded flex items-center justify-center text-[9px] font-bold text-slate-600 uppercase">
                Paste images here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const BookOpen = ({ size, className }: any) => <FileText size={size} className={className} />

// --- Main Form Modal ---

const ProjectForm = ({ initialData, onSave, isSaving }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'Strategic',
    status: 'Planning',
    priority: 'Medium',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    owner: '',
    jira_links: [],
    target_systems: [],
    target_assets: [],
    target_services: [],
    beneficiaries: [],
    problem_statement: '',
    objective: '',
    key_functions: [],
    expected_outcomes: [],
    roi_defense_line: 0,
    man_hours_saved: 0,
    stoploss_minutes_saved: 0,
    wafers_gained: 0,
    team_members: [],
    ...initialData
  })

  const [multiInputs, setMultiInputs] = useState({
    jira: '', system: '', asset: '', service: '', beneficiary: '', function: '', outcome: '', member: ''
  })

  const addMulti = (field: string, target: string) => {
    const val = (multiInputs as any)[field]
    if (!val) return
    setFormData({ ...formData, [target]: [...(formData as any)[target], val] })
    setMultiInputs({ ...multiInputs, [field]: '' })
  }

  const removeMulti = (target: string, idx: number) => {
    const arr = [...(formData as any)[target]]
    arr.splice(idx, 1)
    setFormData({ ...formData, [target]: arr })
  }

  const TagList = ({ items, target, field }: { items: string[], target: string, field: string }) => (
    <div className="flex flex-wrap gap-1 mt-2">
      {items.map((item, i) => (
        <span key={i} className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] font-bold text-blue-400 flex items-center gap-1">
          {item} <X size={10} className="cursor-pointer hover:text-white" onClick={() => removeMulti(target, i)} />
        </span>
      ))}
      <div className="flex gap-1 w-full mt-1">
        <input 
          value={(multiInputs as any)[field]} 
          onChange={e => setMultiInputs({ ...multiInputs, [field]: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && addMulti(field, target)}
          className="flex-1 bg-black/20 border border-white/5 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-blue-500/50" 
          placeholder={`Add ${field}...`}
        />
        <button onClick={() => addMulti(field, target)} className="p-1 bg-blue-600/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-600/40"><Plus size={12}/></button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-3 gap-6">
        {/* Section 1: Core Identity */}
        <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
          <h3 className="text-[11px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/5 pb-2">
            <Target size={14} /> Core Identity
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Project Title *</label>
              <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" placeholder="PROJECT NAME" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StyledSelect label="Type" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} options={PROJECT_TYPES} />
              <StyledSelect label="Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={PROJECT_STATUSES} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Start Date</label>
                <input type="date" value={formData.start_date.split('T')[0]} onChange={e => setFormData({...formData, start_date: new Date(e.target.value).toISOString()})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-[10px] font-bold text-white outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">End Date</label>
                <input type="date" value={formData.end_date.split('T')[0]} onChange={e => setFormData({...formData, end_date: new Date(e.target.value).toISOString()})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-[10px] font-bold text-white outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Project Owner</label>
              <input value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" placeholder="OWNER NAME" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Jira Reference Links</label>
              <TagList items={formData.jira_links} target="jira_links" field="jira" />
            </div>
          </div>
        </div>

        {/* Section 2: Strategy & ROI */}
        <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
          <h3 className="text-[11px] font-bold text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/5 pb-2">
            <TrendingUp size={14} /> Strategy & ROI
          </h3>
          <div className="space-y-3">
             <StyledSelect label="Defense Line (0-2)" value={formData.roi_defense_line} onChange={e => setFormData({...formData, roi_defense_line: parseInt(e.target.value)})} options={DEFENSE_LINES} />
             <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Man-Hours Saved/Yr</label>
                  <input type="number" value={formData.man_hours_saved} onChange={e => setFormData({...formData, man_hours_saved: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Stoploss Mins Saved/Yr</label>
                  <input type="number" value={formData.stoploss_minutes_saved} onChange={e => setFormData({...formData, stoploss_minutes_saved: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" />
                </div>
             </div>
             <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Wafers Gained/Day</label>
                <input type="number" value={formData.wafers_gained} onChange={e => setFormData({...formData, wafers_gained: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" />
             </div>
             <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Beneficiaries</label>
                <TagList items={formData.beneficiaries} target="beneficiaries" field="beneficiary" />
             </div>
          </div>
        </div>

        {/* Section 3: Targets & Scope */}
        <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
          <h3 className="text-[11px] font-bold text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/5 pb-2">
            <Layers size={14} /> Targets & Scope
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Target Systems</label>
              <TagList items={formData.target_systems} target="target_systems" field="system" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Target Assets</label>
              <TagList items={formData.target_assets} target="target_assets" field="asset" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Target Services</label>
              <TagList items={formData.target_services} target="target_services" field="service" />
            </div>
          </div>
        </div>
      </div>

      {/* Narrative Section */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
          <h3 className="text-[11px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/5 pb-2">
            <MessageSquare size={14} /> Mission Narrative
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Problem Statement</label>
              <textarea value={formData.problem_statement} onChange={e => setFormData({...formData, problem_statement: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs font-bold text-white h-20 resize-none outline-none focus:border-blue-500" placeholder="CURRENT PAIN POINTS..." />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Objective</label>
              <textarea value={formData.objective} onChange={e => setFormData({...formData, objective: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs font-bold text-white h-20 resize-none outline-none focus:border-blue-500" placeholder="DESIRED STATE..." />
            </div>
          </div>
        </div>
        <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
          <h3 className="text-[11px] font-bold text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/5 pb-2">
            <Zap size={14} /> Execution Roadmap
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Key Functions</label>
              <TagList items={formData.key_functions} target="key_functions" field="function" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Expected Outcomes</label>
              <TagList items={formData.expected_outcomes} target="expected_outcomes" field="outcome" />
            </div>
          </div>
        </div>
      </div>

      <button 
        disabled={isSaving || !formData.name} 
        onClick={() => onSave(formData)} 
        className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-95 transition-all mt-4"
      >
        {isSaving ? 'Synchronizing Strategic Matrix...' : (initialData.id ? 'Commit Matrix Update' : 'Initialize New Project Stream')}
      </button>
    </div>
  )
}

// --- Main View ---

export default function Projects() {
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [activeModal, setActiveModal] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, id: null })
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'TASKS' | 'QA' | 'APPENDIX'>('DETAILS')

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await (await apiFetch('/api/v1/projects/')).json())
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/projects/${data.id}` : `/api/v1/projects/`
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Matrix Baseline Synchronized')
      setActiveModal(null)
      if (!selectedProjectId) setSelectedProjectId(data.id)
    },
    onError: (e: any) => toast.error(e.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setConfirmModal({ isOpen: false, id: null })
      setSelectedProjectId(null)
      toast.success('Stream Deprecated')
    },
    onError: (e: any) => toast.error(e.message)
  })

  const selectedProject = useMemo(() => projects?.find((p: any) => p.id === selectedProjectId), [projects, selectedProjectId])

  const stats = useMemo(() => {
    if (!projects) return { active: 0, strategic: 0, wafers: 0, hours: 0 }
    return {
      active: projects.filter((p:any) => p.status === 'In Progress').length,
      strategic: projects.filter((p:any) => p.type === 'Strategic').length,
      wafers: projects.reduce((acc:any, p:any) => acc + (p.wafers_gained || 0), 0),
      hours: projects.reduce((acc:any, p:any) => acc + (p.man_hours_saved || 0), 0)
    }
  }, [projects])

  // --- Grid Config ---
  const columnDefs = [
    { field: 'name', headerName: 'PROJECT STREAM', flex: 2, cellClass: 'font-bold' },
    { field: 'type', headerName: 'TYPE', width: 100, cellRenderer: (p:any) => <StatusPill status={p.value} type="PROJECT_TYPE" /> },
    { field: 'status', headerName: 'STATUS', width: 110, cellRenderer: (p:any) => <StatusPill status={p.value} /> },
    { field: 'owner', headerName: 'OWNER', flex: 1 },
    { 
      headerName: 'ROI METRICS', 
      flex: 1.5,
      valueGetter: (p:any) => `${p.data.man_hours_saved}h / ${p.data.wafers_gained}w`,
      cellRenderer: (p:any) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-emerald-400 font-bold">
            <Clock size={12}/> {p.data.man_hours_saved}h
          </div>
          <div className="flex items-center gap-1 text-blue-400 font-bold">
            <Zap size={12}/> {p.data.wafers_gained}w
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white italic flex items-center gap-3">
             <Briefcase size={32} className="text-blue-500" /> PROJECT MATRIX
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold mt-1">Infrastructure Strategic Evolution Roadmap</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex gap-8 bg-white/5 border border-white/5 px-6 py-2 rounded-xl">
              <div>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Active Streams</p>
                <p className="text-lg font-black text-blue-400">{stats.active}</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Wafers/Day</p>
                <p className="text-lg font-black text-emerald-400">+{stats.wafers}</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Efficiency</p>
                <p className="text-lg font-black text-amber-400">{stats.hours}h/yr</p>
              </div>
           </div>
           <button onClick={() => setActiveModal({})} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all">+ NEW STREAM</button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Left: Project List */}
        <div className="col-span-12 lg:col-span-4 flex flex-col glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-2">
            <Search size={16} className="text-slate-500" />
            <input placeholder="SEARCH MATRIX..." className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-white outline-none flex-1" />
          </div>
          <div className="flex-1 ag-theme-alpine-dark">
            <AgGridReact 
              rowData={projects}
              columnDefs={columnDefs}
              rowSelection="multiple"
              onSelectionChanged={(e) => {
                const selected = e.api.getSelectedRows()
                if (selected.length > 0) setSelectedProjectId(selected[0].id)
              }}
              onRowDoubleClicked={(e) => setSelectedProjectId(e.data.id)}
              defaultColDef={{ resizable: true, sortable: true }}
            />
          </div>
        </div>

        {/* Right: Detailed View */}
        <div className="col-span-12 lg:col-span-8 flex flex-col glass-panel rounded-2xl border border-white/5 overflow-hidden bg-black/20">
          {selectedProject ? (
            <div className="flex flex-col h-full">
              {/* Top Detail Header */}
              <div className="p-6 border-b border-white/5 bg-white/5">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <StatusPill status={selectedProject.type} type="PROJECT_TYPE" />
                       <StatusPill status={selectedProject.status} />
                       <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                         selectedProject.priority === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                         selectedProject.priority === 'High' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                         'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                       }`}>{selectedProject.priority} PRIORITY</span>
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedProject.name}</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <User size={12}/> {selectedProject.owner} <Calendar size={12} className="ml-2"/> {new Date(selectedProject.start_date).toLocaleDateString()} — {new Date(selectedProject.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveModal(selectedProject)} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all"><Edit2 size={16}/></button>
                    <button onClick={() => setConfirmModal({ isOpen: true, id: selectedProject.id })} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-500 transition-all"><Trash2 size={16}/></button>
                  </div>
                </div>

                <div className="flex gap-4">
                   {['DETAILS', 'TASKS', 'QA', 'APPENDIX'].map(tab => (
                     <button 
                       key={tab}
                       onClick={() => setActiveTab(tab as any)}
                       className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                     >
                       {tab}
                     </button>
                   ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {activeTab === 'DETAILS' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                             <MessageSquare size={14} /> Mission Scope
                          </h4>
                          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4">
                             <div>
                                <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Problem Statement</p>
                                <p className="text-[11px] font-bold text-slate-300">{selectedProject.problem_statement || 'N/A'}</p>
                             </div>
                             <div>
                                <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Objective</p>
                                <p className="text-[11px] font-bold text-slate-300">{selectedProject.objective || 'N/A'}</p>
                             </div>
                          </div>
                       </div>
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                             <TrendingUp size={14} /> ROI Baseline
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Defense Line</p>
                                <p className="text-xl font-black text-white">L{selectedProject.roi_defense_line}</p>
                             </div>
                             <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Man-Hours/Yr</p>
                                <p className="text-xl font-black text-emerald-400">{selectedProject.man_hours_saved}h</p>
                             </div>
                             <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Stoploss Mins</p>
                                <p className="text-xl font-black text-amber-400">{selectedProject.stoploss_minutes_saved}m</p>
                             </div>
                             <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Wafers/Day</p>
                                <p className="text-xl font-black text-blue-400">+{selectedProject.wafers_gained}</p>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                       <div className="space-y-2">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Layers size={12}/> Target Systems</p>
                          <div className="flex flex-wrap gap-1">
                             {selectedProject.target_systems?.map((s:string, i:number) => <span key={i} className="px-2 py-0.5 bg-white/5 rounded text-[9px] font-bold text-slate-400 uppercase">{s}</span>)}
                          </div>
                       </div>
                       <div className="space-y-2">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Server size={12}/> Target Assets</p>
                          <div className="flex flex-wrap gap-1">
                             {selectedProject.target_assets?.map((s:string, i:number) => <span key={i} className="px-2 py-0.5 bg-white/5 rounded text-[9px] font-bold text-slate-400 uppercase">{s}</span>)}
                          </div>
                       </div>
                       <div className="space-y-2">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><ExternalLink size={12}/> Jira Records</p>
                          <div className="flex flex-wrap gap-1">
                             {selectedProject.jira_links?.map((s:string, i:number) => <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-bold uppercase">{s}</span>)}
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {activeTab === 'TASKS' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                       <Calendar size={14} /> Schedule Visualization
                    </h4>
                    <GanttChart tasks={selectedProject.tasks} />
                    
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Task Matrix</h4>
                          <button onClick={() => toast.error('Task Management requires Edit Mode')} className="px-3 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-white/10">+ Add Task</button>
                       </div>
                       <div className="space-y-2">
                          {selectedProject.tasks?.map((task: any) => (
                            <div key={task.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between group">
                               <div className="flex items-center gap-4">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                    task.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                                  }`}>
                                     {task.progress}%
                                  </div>
                                  <div>
                                     <p className="text-xs font-bold text-white uppercase">{task.name}</p>
                                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{task.owner} // {new Date(task.start_date).toLocaleDateString()}</p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-4">
                                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                                    task.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                                  }`}>{task.status}</span>
                                  <button className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight size={14}/></button>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                )}

                {activeTab === 'QA' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                         <HelpCircle size={14} /> Consolidated Q&A
                      </h4>
                      <button className="px-3 py-1 bg-blue-600 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-blue-500 shadow-lg shadow-blue-500/20">+ ASK QUESTION</button>
                    </div>
                    <div className="overflow-hidden border border-white/5 rounded-xl">
                       <table className="w-full text-left text-[10px] font-bold uppercase tracking-widest border-collapse">
                          <thead className="bg-white/5 text-slate-500">
                             <tr>
                                <th className="p-3 border-b border-white/5">Question</th>
                                <th className="p-3 border-b border-white/5">Asked By</th>
                                <th className="p-3 border-b border-white/5">Status</th>
                                <th className="p-3 border-b border-white/5 text-right">Action</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                             {selectedProject.qa_items?.map((qa:any) => (
                               <tr key={qa.id} className="hover:bg-white/5">
                                  <td className="p-3 text-white truncate max-w-[200px]">{qa.question}</td>
                                  <td className="p-3 text-slate-400">{qa.asked_by}</td>
                                  <td className="p-3">
                                     <span className={qa.status === 'Answered' ? 'text-emerald-400' : 'text-amber-400'}>{qa.status}</span>
                                  </td>
                                  <td className="p-3 text-right">
                                     <button className="text-blue-400 hover:underline">VIEW</button>
                                  </td>
                               </tr>
                             ))}
                             {selectedProject.qa_items?.length === 0 && (
                               <tr><td colSpan={4} className="p-8 text-center text-slate-600 italic">No consolidated Q&A items found for this stream</td></tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                  </div>
                )}

                {activeTab === 'APPENDIX' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <AppendixSection 
                      project={selectedProject} 
                      onUpdate={(data) => mutation.mutate(data)} 
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-10 space-y-4">
               <Briefcase size={80} />
               <p className="text-[14px] font-black uppercase tracking-[0.5em]">SELECT MATRIX VECTOR</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-[1000px] max-h-[90vh] overflow-y-auto p-10 rounded-3xl border border-blue-500/30 custom-scrollbar shadow-2xl">
               <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <div>
                    <h2 className="text-3xl font-black uppercase text-white tracking-tighter">{activeModal.id ? 'COMMIT BASELINE UPDATE' : 'INITIALIZE PROJECT STREAM'}</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Strategic Infrastructure Roadmap Development</p>
                  </div>
                  <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white bg-white/5 p-3 rounded-full"><X size={24}/></button>
               </div>
               <ProjectForm initialData={activeModal} onSave={mutation.mutate} isSaving={mutation.isPending} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={() => deleteMutation.mutate(confirmModal.id)}
        title="DEPRECATE PROJECT STREAM"
        message="THIS WILL PERMANENTLY ARCHIVE THIS STRATEGIC VECTOR FROM THE ACTIVE MATRIX. AUDIT LOGS WILL BE PRESERVED. PROCEED?"
        variant="danger"
      />
    </div>
  )
}
