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
  Workflow, ExternalLink, Briefcase, BarChart3, Users, DollarSign, Image as ImageIcon, HelpCircle, BookOpen, Filter
} from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { AgGridReact } from 'ag-grid-react'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'

// --- Types & Constants ---

const PROJECT_TYPES = [
  { value: 'Strategic', label: 'STRATEGIC' },
  { value: 'Tactical', label: 'TACTICAL' },
  { value: 'Operational', label: 'OPERATIONAL' },
  { value: 'Research', label: 'RESEARCH' }
]

const PROJECT_STATUSES = [
  { value: 'Not Started', label: 'NOT STARTED' },
  { value: 'Planning', label: 'PLANNING' },
  { value: 'In Progress', label: 'IN PROGRESS' },
  { value: 'Paused', label: 'PAUSED' },
  { value: 'Blocked', label: 'BLOCKED' },
  { value: 'Cancelled', label: 'CANCELLED' },
  { value: 'Completed', label: 'COMPLETED' }
]

const PROJECT_PRIORITIES = [
  { value: 'Low', label: 'LOW' },
  { value: 'Medium', label: 'MEDIUM' },
  { value: 'High', label: 'HIGH' },
  { value: 'Highest', label: 'HIGHEST' }
]

export const DEFENSE_LINES = [
  { value: 0, label: 'LINE 0: BASE' },
  { value: 1, label: 'LINE 1: FORTIFIED' },
  { value: 2, label: 'LINE 2: RESILIENT' }
]

// --- Sub-components ---

const SystemScopeRenderer = (p: any) => {
  const systems = p.data.target_systems || []
  if (systems.length === 0) return <span className="text-slate-600">N/A</span>
  
  const display = systems.length === 1 ? systems[0] : `${systems[0]} + ${systems.length}`
  
  return (
    <div className="group relative w-full h-full flex items-center justify-center cursor-help">
      <span className="truncate">{display}</span>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-[1000] min-w-[200px] bg-[#1a1b26] border border-white/10 p-3 rounded-lg shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 border-b border-white/5 pb-1">System Scope Matrix</p>
        <div className="space-y-1">
          {systems.map((s: string, i: number) => (
            <div key={i} className="text-[10px] font-bold text-slate-300 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-blue-500" />
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const GanttChart = ({ project, onUpdate, projectStatusOptions }: { project: any, onUpdate: (data: any) => void, projectStatusOptions: any[] }) => {
  const [tasks, setTasks] = useState<any[]>(project.tasks || [])
  const [taskPool, setTaskPool] = useState<any[]>(project.metadata_json?.task_pool || [])
  const [draggedTask, setDraggedTask] = useState<any>(null)

  const scheduleTask = (task: any, date: string) => {
    const newTask = { 
      ...task, 
      id: task.id || Date.now(),
      start_date: date, 
      end_date: new Date(new Date(date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 0,
      status: 'Not Started'
    }
    const newTasks = [...tasks, newTask]
    const newPool = taskPool.filter(t => t.id !== task.id)
    setTasks(newTasks)
    setTaskPool(newPool)
    onUpdate({ 
      ...project, 
      tasks: newTasks, 
      metadata_json: { ...project.metadata_json, task_pool: newPool } 
    })
  }

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  }, [tasks])

  if ((!tasks || tasks.length === 0) && (!taskPool || taskPool.length === 0)) return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-600 border-2 border-dashed border-white/5 rounded-lg bg-black/20">
       <Calendar size={32} className="mb-2 opacity-20" />
       <p className="text-[9px] font-bold uppercase tracking-widest">No Schedule Data</p>
    </div>
  )

  const allDates = tasks.flatMap(t => [new Date(t.start_date).getTime(), new Date(t.end_date).getTime()])
  const minDate = allDates.length > 0 ? Math.min(...allDates) : Date.now()
  const maxDate = allDates.length > 0 ? Math.max(...allDates) : Date.now() + 30 * 24 * 60 * 60 * 1000
  const duration = Math.max(maxDate - minDate, 30 * 24 * 60 * 60 * 1000)
  
  const chartStart = minDate - duration * 0.1
  const chartEnd = maxDate + duration * 0.1
  const chartDuration = chartEnd - chartStart

  return (
    <div className="space-y-6">
      {/* Task Pool */}
      <div className="space-y-3">
        <h5 className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <ListTodo size={12} /> Task Pool (Unscheduled)
        </h5>
        <div className="flex flex-wrap gap-2 p-4 bg-white/5 rounded-lg border border-white/5 min-h-[60px]">
          {taskPool.map((task: any) => (
            <motion.div
              key={task.id}
              draggable
              onDragStart={() => setDraggedTask(task)}
              whileHover={{ scale: 1.05 }}
              className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] font-bold text-amber-400 cursor-grab active:cursor-grabbing flex items-center gap-2"
            >
              <LayoutGrid size={12} /> {task.name}
            </motion.div>
          ))}
          <button 
            onClick={() => {
              const name = prompt('TASK NAME')
              if (name) {
                const newTask = { id: Date.now(), name, type: 'pool' }
                const newPool = [...taskPool, newTask]
                setTaskPool(newPool)
                onUpdate({ ...project, metadata_json: { ...project.metadata_json, task_pool: newPool } })
              }
            }}
            className="px-3 py-1.5 border border-dashed border-white/10 rounded-lg text-[10px] font-bold text-slate-500 hover:text-white hover:border-white/20 transition-all flex items-center gap-2"
          >
            <Plus size={12} /> ADD TASK
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div 
        className="space-y-2 p-6 bg-black/40 rounded-lg border border-white/5 overflow-x-auto custom-scrollbar relative"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          if (draggedTask) {
            scheduleTask(draggedTask, new Date().toISOString())
            setDraggedTask(null)
          }
        }}
      >
        <div className="flex border-b border-white/5 pb-2 mb-4">
           {Array.from({ length: 12 }).map((_, i) => (
             <div key={i} className="flex-1 min-w-[150px] text-[8px] font-black text-slate-600 uppercase tracking-widest px-2">
                Phase Matrix {i+1}
             </div>
           ))}
        </div>
        
        {sortedTasks.map((task: any) => {
          const left = ((new Date(task.start_date).getTime() - chartStart) / chartDuration) * 100
          const width = ((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / chartDuration) * 100
          
          return (
            <div key={task.id} className="relative h-10 group">
                <div className="absolute left-0 -top-4 w-full h-4 border-l border-b border-blue-500/30 ml-4 rounded-bl-lg pointer-events-none" />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%`, left: `${left}%` }}
                  onClick={() => {
                    const statuses = projectStatusOptions.map(s => s.value)
                    const currentIdx = statuses.indexOf(task.status)
                    const nextStatus = statuses[(currentIdx + 1) % statuses.length]
                    const nextProgress = nextStatus === 'Completed' ? 100 : task.progress
                    const newTasks = tasks.map(t => t.id === task.id ? { ...t, status: nextStatus, progress: nextProgress } : t)
                    setTasks(newTasks)
                    onUpdate({ ...project, tasks: newTasks })
                    toast.success(`${task.name} -> ${nextStatus}`)
                  }}
                  className={`absolute h-8 border rounded-lg flex items-center px-3 gap-2 overflow-hidden cursor-pointer transition-all ${
                    task.status === 'Completed' ? 'bg-emerald-600/20 border-emerald-500/40' : 
                    task.status === 'Blocked' ? 'bg-rose-600/20 border-rose-500/40 animate-pulse' :
                    'bg-blue-600/20 border-blue-500/40'
                  }`}
                >
                   <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                     task.status === 'Completed' ? 'bg-emerald-400' : 
                     task.status === 'Blocked' ? 'bg-rose-400' : 'bg-blue-400'
                   }`} />
                   <span className="text-[9px] font-black text-white uppercase truncate">{task.name}</span>
                   <span className="ml-auto text-[8px] font-bold text-blue-400">{task.progress}%</span>
                </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const AdoptionPanel = ({ project }: { project: any }) => {
  return (
    <div className="space-y-6">
       <div className="grid grid-cols-3 gap-4">
          <div className="p-6 bg-black/40 rounded-lg border border-white/5 text-center">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target Entities</p>
             <p className="text-2xl font-black text-white">{project.metadata_json?.target_users || 0}</p>
          </div>
          <div className="p-6 bg-black/40 rounded-lg border border-white/5 text-center">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Adoption</p>
             <p className="text-2xl font-black text-emerald-400">{project.metadata_json?.active_users || 0}</p>
          </div>
          <div className="p-6 bg-black/40 rounded-lg border border-white/5 text-center">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Maturity Score</p>
             <p className="text-2xl font-black text-blue-400">{project.metadata_json?.feedback_score || 0}/10</p>
          </div>
       </div>
       
       <div className="space-y-4">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
             <span className="text-slate-500">Adoption Saturation</span>
             <span className="text-blue-400">
                {project.metadata_json?.target_users ? 
                   Math.round((project.metadata_json?.active_users / project.metadata_json?.target_users) * 100) : 0}%
             </span>
          </div>
          <div className="flex-1 h-3 bg-white/5 rounded-full relative overflow-hidden group/bar cursor-pointer">
              <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${project.metadata_json?.target_users ? (project.metadata_json?.active_users / project.metadata_json?.target_users) * 100 : 0}%` }}
                  className={`absolute h-full rounded-full flex items-center shadow-lg transition-colors bg-blue-600`}
              />
          </div>
       </div>
    </div>
  )
}

const AppendixSection = ({ project, onUpdate }: { project: any, onUpdate: (data: any) => void }) => {
  const [images, setImages] = useState<any[]>(project.metadata_json?.appendix_images || [])

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile()
        if (blob) {
          const reader = new FileReader()
          reader.onload = (event) => {
            const newImages = [...images, { id: Date.now(), url: event.target?.result, timestamp: new Date().toISOString() }]
            setImages(newImages)
            onUpdate({ ...project, metadata_json: { ...project.metadata_json, appendix_images: newImages } })
            toast.success('EVIDENCE CAPTURED')
          }
          reader.readAsDataURL(blob)
        }
      }
    }
  }

  return (
    <div className="space-y-6 outline-none" onPaste={handlePaste} tabIndex={0}>
       <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
             <ImageIcon size={14} /> Evidence Appendix
          </h4>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">CTRL+V TO CAPTURE EVIDENCE</p>
       </div>
       
       <div className="grid grid-cols-2 gap-4">
          {images.map((img: any) => (
            <div key={img.id} className="relative group bg-black/40 border border-white/5 rounded-lg overflow-hidden h-48">
               <img src={img.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Appendix" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4 translate-y-4 group-hover:translate-y-0 transition-transform">
                  <p className="text-[8px] font-black text-blue-400 uppercase">{new Date(img.timestamp).toLocaleString()}</p>
                  <button 
                    onClick={() => {
                      const next = images.filter(i => i.id !== img.id)
                      setImages(next)
                      onUpdate({ ...project, metadata_json: { ...project.metadata_json, appendix_images: next } })
                    }}
                    className="mt-2 w-full py-1.5 bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded text-[8px] font-black uppercase hover:bg-rose-500/40 transition-all"
                  >
                    Purge Evidence
                  </button>
               </div>
            </div>
          ))}
          <div className="border-2 border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center h-48 text-slate-600">
             <Camera size={24} className="mb-2 opacity-20" />
             <p className="text-[8px] font-bold uppercase tracking-widest">Awaiting Capture...</p>
          </div>
       </div>
    </div>
  )
}

const MultiSelectBox = ({ label, items, selected, onToggle, placeholder = "Filter list..." }: any) => {
  const [search, setSearch] = useState('')
  const filtered = items.filter((item: any) => {
    const val = typeof item === 'string' ? item : item.name
    return val.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{label}</label>
      <div className="bg-black/40 border border-white/10 rounded-lg overflow-hidden flex flex-col h-64">
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-black/40 border border-white/5 rounded-lg px-8 py-2 text-[10px] font-bold outline-none focus:border-blue-500/50 uppercase tracking-widest"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
          {filtered.map((item: any) => {
            const id = typeof item === 'string' ? item : item.id
            const label = typeof item === 'string' ? item : item.name
            const isSelected = selected.includes(id)
            return (
              <button
                key={id}
                onClick={() => onToggle(id)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all mb-0.5 flex items-center justify-between ${
                  isSelected ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                <span className="truncate pr-2">{label}</span>
                {isSelected && <Check size={12} />}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-slate-600 text-[9px] font-bold uppercase italic">No items found</div>
          )}
        </div>
      </div>
    </div>
  )
}

const MonthYearPicker = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => {
  const date = value ? new Date(value) : new Date()
  const month = date.getMonth()
  const year = date.getFullYear()

  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i)

  const handleUpdate = (newMonth: number, newYear: number) => {
    const d = new Date(newYear, newMonth, 1)
    onChange(d.toISOString().split('.')[0] + 'Z')
  }

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block px-1">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        <select 
          value={month} 
          onChange={e => handleUpdate(parseInt(e.target.value), year)}
          className="bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold text-white outline-none focus:border-blue-500"
        >
          {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select 
          value={year} 
          onChange={e => handleUpdate(month, parseInt(e.target.value))}
          className="bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold text-white outline-none focus:border-blue-500"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  )
}

export function ProjectForm({ initialData, onSave, isSaving, options, devices, services, onOpenTypeSettings, projectTypeOptions, projectStatusOptions, projectPriorityOptions }: any) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'Strategic',
    status: 'Planning',
    priority: 'Medium',
    start_date: new Date().toISOString().split('.')[0] + 'Z',
    end_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('.')[0] + 'Z',
    owner: '',
    jira_links: [],
    target_systems: [],
    target_assets: [],
    target_services: [],
    problem_statement: '',
    objective: '',
    metadata_json: {},
    ...initialData
  })

  const [jiraInput, setJiraInput] = useState('')

  const toggleArrayItem = (field: string, id: any) => {
    const arr = [...(formData as any)[field]]
    const idx = arr.indexOf(id)
    if (idx > -1) arr.splice(idx, 1)
    else arr.push(id)
    
    // Cascading logic
    const updates: any = { [field]: arr }
    if (field === 'target_systems') {
      const selectedSystems = arr
      const allowedAssets = devices?.filter((d: any) => selectedSystems.includes(d.system)).map((d: any) => String(d.id)) || []
      updates.target_assets = formData.target_assets.filter((id: string) => allowedAssets.includes(id))
      
      const allowedServices = services?.filter((s: any) => updates.target_assets.includes(String(s.device_id))).map((s: any) => String(s.id)) || []
      updates.target_services = formData.target_services.filter((id: string) => allowedServices.includes(id))
    } else if (field === 'target_assets') {
      const selectedAssets = arr
      const allowedServices = services?.filter((s: any) => selectedAssets.includes(String(s.device_id))).map((s: any) => String(s.id)) || []
      updates.target_services = formData.target_services.filter((id: string) => allowedServices.includes(id))
    }

    setFormData({ ...formData, ...updates })
  }

  const addJiraLink = () => {
    if (!jiraInput) return
    setFormData({ ...formData, jira_links: [...formData.jira_links, jiraInput] })
    setJiraInput('')
  }

  const removeJiraLink = (idx: number) => {
    const arr = [...formData.jira_links]
    arr.splice(idx, 1)
    setFormData({ ...formData, jira_links: arr })
  }

  // Cascading lists
  const availableSystems = options?.filter((o: any) => o.category === 'LogicalSystem').map((o: any) => o.value) || []
  const availableAssets = devices?.filter((d: any) => formData.target_systems.length === 0 || formData.target_systems.includes(d.system))
    .map((d: any) => ({ id: String(d.id), name: d.name })) || []
  const availableServices = services?.filter((s: any) => formData.target_assets.length === 0 || formData.target_assets.includes(String(s.device_id)))
    .map((s: any) => ({ id: String(s.id), name: s.name })) || []
  
  const availableOwners = useMemo(() => {
    return ["OPERATOR", "ENGINEERING", "PLATFORM", "SECURITY", "SRE", "DEVOPS", "PRODUCT"]
  }, [])

  return (
    <div className="space-y-6 mt-4">
      {/* 1. Project Title */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block px-1">Project Title</label>
        <input 
          value={formData.name} 
          onChange={e => setFormData({...formData, name: e.target.value})} 
          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all" 
          placeholder="ENTER PROJECT NAME..." 
        />
      </div>

      {/* 2, 3, 4, 5. Type, Status, Start, End */}
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <StyledSelect label="Project Type" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} options={projectTypeOptions} />
              <button 
                onClick={onOpenTypeSettings}
                className="absolute right-0 top-0 p-1 text-slate-600 hover:text-blue-400 transition-colors"
                title="Manage Types"
              >
                <Settings size={10} />
              </button>
            </div>
            <StyledSelect label="Project Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={projectStatusOptions} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MonthYearPicker label="Start (Month/Year)" value={formData.start_date} onChange={v => setFormData({...formData, start_date: v})} />
            <MonthYearPicker label="End (Month/Year)" value={formData.end_date} onChange={v => setFormData({...formData, end_date: v})} />
          </div>
        </div>
        
        <div className="space-y-6">
          <MultiSelectBox 
            label="Owner(s)" 
            items={availableOwners} 
            selected={formData.owner ? formData.owner.split(',').map((s:string)=>s.trim()) : []} 
            onToggle={(id: any) => {
              const current = formData.owner ? formData.owner.split(',').map((s:string)=>s.trim()) : []
              const next = current.includes(id) ? current.filter((s:string)=>s!==id) : [...current, id]
              setFormData({...formData, owner: next.join(', ')})
            }} 
          />
        </div>
      </div>

      {/* 7. Jira Links */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block px-1">Jira Reference Links</label>
        <div className="flex gap-2">
          <input 
            value={jiraInput} 
            onChange={e => setJiraInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addJiraLink()}
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-[10px] font-bold text-white outline-none focus:border-blue-500" 
            placeholder="PROJ-123..."
          />
          <button onClick={addJiraLink} className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-600/40 transition-all"><Plus size={16}/></button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {formData.jira_links.map((link: string, i: number) => (
            <span key={i} className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-bold text-blue-400 flex items-center gap-2">
              {link} <X size={12} className="cursor-pointer hover:text-white" onClick={() => removeJiraLink(i)} />
            </span>
          ))}
        </div>
      </div>

      {/* 8 & 9. Narrative */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block px-1">Problem Statement</label>
          <textarea 
            value={formData.problem_statement} 
            onChange={e => setFormData({...formData, problem_statement: e.target.value})} 
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white h-32 resize-none outline-none focus:border-blue-500 transition-all" 
            placeholder="DESCRIBE PAIN POINTS..." 
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block px-1">Objective</label>
          <textarea 
            value={formData.objective} 
            onChange={e => setFormData({...formData, objective: e.target.value})} 
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs font-bold text-white h-32 resize-none outline-none focus:border-blue-500 transition-all" 
            placeholder="DESCRIBE DESIRED OUTCOME..." 
          />
        </div>
      </div>

      {/* ROI & Impact Metrics */}
      <div className="grid grid-cols-4 gap-4 bg-white/5 p-6 rounded-xl border border-white/10">
        <StyledSelect 
          label="Defense Line" 
          value={formData.roi_defense_line} 
          onChange={e => setFormData({...formData, roi_defense_line: parseInt(e.target.value)})} 
          options={DEFENSE_LINES} 
        />
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block px-1">Man-Hours Saved</label>
          <input 
            type="number"
            value={formData.man_hours_saved} 
            onChange={e => setFormData({...formData, man_hours_saved: parseFloat(e.target.value)})} 
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" 
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block px-1">Stoploss Min.</label>
          <input 
            type="number"
            value={formData.stoploss_minutes_saved} 
            onChange={e => setFormData({...formData, stoploss_minutes_saved: parseFloat(e.target.value)})} 
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" 
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block px-1">Wafers Gained</label>
          <input 
            type="number"
            value={formData.wafers_gained} 
            onChange={e => setFormData({...formData, wafers_gained: parseFloat(e.target.value)})} 
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500" 
          />
        </div>
      </div>

      {/* 10, 11, 12. Scoping */}
      <div className="grid grid-cols-3 gap-8">
        <MultiSelectBox 
          label="Systems Scope" 
          items={availableSystems} 
          selected={formData.target_systems} 
          onToggle={(id: any) => toggleArrayItem('target_systems', id)} 
        />
        <MultiSelectBox 
          label="Assets Scope" 
          items={availableAssets} 
          selected={formData.target_assets} 
          onToggle={(id: any) => toggleArrayItem('target_assets', id)} 
          placeholder="Filter assets..."
        />
        <MultiSelectBox 
          label="Services Scope" 
          items={availableServices} 
          selected={formData.target_services} 
          onToggle={(id: any) => toggleArrayItem('target_services', id)} 
          placeholder="Filter services..."
        />
      </div>

      <button 
        disabled={isSaving || !formData.name} 
        onClick={() => onSave(formData)} 
        className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all mt-4"
      >
        {isSaving ? 'Synchronizing Strategic Matrix...' : (initialData.id ? 'Commit Matrix Update' : 'Initialize New Project Stream')}
      </button>
    </div>
  )
}

const ExecutiveReportModal = ({ project, onClose }: { project: any, onClose: () => void }) => {
  const tasks = project.tasks || []
  const completedTasks = tasks.filter((t: any) => t.status === 'Completed').length
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white text-slate-900 w-[800px] min-h-[1131px] p-12 shadow-2xl relative flex flex-col font-sans"
      >
        {/* Close Button (Hidden in Print) */}
        <button onClick={onClose} className="absolute -right-16 top-0 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all print:hidden">
          <X size={24} />
        </button>

        {/* Report Header */}
        <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <span className="bg-slate-900 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">{project.type} STRATEGY</span>
               <span className="border-2 border-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest">{project.status}</span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-1">{project.name}</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">Strategic Infrastructure Evolution Report // {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Maturity</p>
             <div className="text-4xl font-black leading-none">{progress}%</div>
          </div>
        </div>

        {/* Executive Narrative */}
        <div className="grid grid-cols-2 gap-12 mb-10">
           <div className="space-y-4">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-slate-200 pb-2 flex items-center gap-2">
                 <AlertTriangle size={14} /> Critical Problem Statement
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                "{project.problem_statement || 'No problem statement defined for this strategic vector.'}"
              </p>
           </div>
           <div className="space-y-4">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-slate-200 pb-2 flex items-center gap-2">
                 <Target size={14} /> Mission Objective
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                {project.objective || 'Objective currently being refined by the strategic lead.'}
              </p>
           </div>
        </div>

        {/* ROI & Success Metrics */}
        <div className="mb-10">
           <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-slate-200 pb-2 mb-6 flex items-center gap-2">
              <BarChart3 size={14} /> Quantitative Success Metrics (ROI)
           </h3>
           <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-50 p-6 border border-slate-100 rounded-xl text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Defense Line</p>
                 <p className="text-2xl font-black">L{project.roi_defense_line || 0}</p>
              </div>
              <div className="bg-slate-50 p-6 border border-slate-100 rounded-xl text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Man-Hours Saved</p>
                 <p className="text-2xl font-black text-blue-600">{project.man_hours_saved || 0}h</p>
              </div>
              <div className="bg-slate-50 p-6 border border-slate-100 rounded-xl text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Stoploss Min.</p>
                 <p className="text-2xl font-black text-rose-600">{project.stoploss_minutes_saved || 0}m</p>
              </div>
              <div className="bg-slate-50 p-6 border border-slate-100 rounded-xl text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Wafers Gained</p>
                 <p className="text-2xl font-black text-emerald-600">{project.wafers_gained || 0}</p>
              </div>
           </div>
        </div>

        {/* Strategic Timeline */}
        <div className="mb-10 flex-1">
           <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-slate-200 pb-2 mb-6 flex items-center gap-2">
              <Clock size={14} /> Execution Roadmap & Milestones
           </h3>
           <div className="space-y-4">
              {tasks.length > 0 ? tasks.slice(0, 8).map((t: any) => (
                <div key={t.id} className="flex items-center gap-6">
                   <div className="w-24 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                      {new Date(t.start_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                   </div>
                   <div className="relative flex-1 h-8 bg-slate-50 rounded-full border border-slate-100 overflow-hidden">
                      <div 
                        className={`absolute inset-y-0 left-0 transition-all ${t.status === 'Completed' ? 'bg-emerald-500' : 'bg-slate-900'}`} 
                        style={{ width: `${t.progress}%` }} 
                      />
                      <div className="absolute inset-0 flex items-center px-4 justify-between">
                         <span className={`text-[10px] font-black uppercase ${t.progress > 50 ? 'text-white' : 'text-slate-900'}`}>{t.name}</span>
                         <span className={`text-[9px] font-bold ${t.progress > 90 ? 'text-white' : 'text-slate-500'}`}>{t.status}</span>
                      </div>
                   </div>
                </div>
              )) : (
                <div className="py-20 text-center text-slate-300 font-black uppercase tracking-[0.5em] italic">No Roadmap Data Available</div>
              )}
           </div>
        </div>

        {/* Footer Audit */}
        <div className="border-t border-slate-200 pt-6 mt-auto flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
           <div>Owner: {project.owner} // System Scope: {project.target_systems?.join(', ') || 'N/A'}</div>
           <div>Ref: SYSGRID-PROJ-{project.id} // SECURE DOCUMENT</div>
        </div>

        <button 
          onClick={() => window.print()}
          className="absolute bottom-8 right-8 p-4 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-110 transition-all print:hidden"
        >
          <Download size={20} />
        </button>
      </motion.div>
    </div>
  )
}

const DashboardView = ({ projects }: { projects: any[] }) => {
  const stats = useMemo(() => {
    const total = projects.length
    const completed = projects.filter(p => p.status === 'Completed').length
    const active = projects.filter(p => p.status === 'In Progress').length
    const blocked = projects.filter(p => p.status === 'Blocked').length
    
    const totalManHours = projects.reduce((acc, p) => acc + (p.man_hours_saved || 0), 0)
    const totalStoploss = projects.reduce((acc, p) => acc + (p.stoploss_minutes_saved || 0), 0)
    
    return { total, completed, active, blocked, totalManHours, totalStoploss }
  }, [projects])

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 p-2">
       {/* Stats Grid */}
       <div className="grid grid-cols-4 gap-6">
          {[
            { label: 'Total Initiatives', val: stats.total, color: 'text-white' },
            { label: 'Active Streams', val: stats.active, color: 'text-blue-400' },
            { label: 'Critical Blockers', val: stats.blocked, color: 'text-rose-500', pulse: stats.blocked > 0 },
            { label: 'Total ROI Hours', val: `${stats.totalManHours}h`, color: 'text-emerald-400' }
          ].map((s, i) => (
            <div key={i} className="glass-panel p-8 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">{s.label}</p>
               <p className={`text-4xl font-black ${s.color} ${s.pulse ? 'animate-pulse' : ''}`}>{s.val}</p>
            </div>
          ))}
       </div>

       {/* High Level Progress Bars */}
       <div className="grid grid-cols-2 gap-8">
          <div className="glass-panel p-8 rounded-xl border border-white/5 space-y-6">
             <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <Activity size={14} /> Active Project Trajectory
             </h3>
             <div className="space-y-4">
                {projects.filter(p => p.status === 'In Progress').slice(0, 5).map(p => (
                  <div key={p.id} className="space-y-2">
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-white">{p.name}</span>
                        <span className="text-slate-500">{p.priority} PRIORITY</span>
                     </div>
                     <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${p.tasks?.length ? (p.tasks.filter((t:any)=>t.status==='Completed').length / p.tasks.length)*100 : 0}%` }}
                          className="h-full bg-blue-600 rounded-full"
                        />
                     </div>
                  </div>
                ))}
             </div>
          </div>
          
          <div className="glass-panel p-8 rounded-xl border border-white/5 space-y-6 text-center flex flex-col justify-center">
             <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <TrendingUp size={14} /> Aggregated Strategic Impact
             </h3>
             <div className="flex items-center justify-around py-6">
                <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Wafers Gained</p>
                   <p className="text-5xl font-black text-emerald-400">+{projects.reduce((acc, p) => acc + (p.wafers_gained || 0), 0)}</p>
                </div>
                <div className="w-px h-16 bg-white/5" />
                <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Risk Avoided (Min)</p>
                   <p className="text-5xl font-black text-rose-500">-{projects.reduce((acc, p) => acc + (p.stoploss_minutes_saved || 0), 0)}</p>
                </div>
             </div>
          </div>
       </div>
    </div>
  )
}

// --- Main View ---

export default function Projects() {
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [activeModal, setActiveModal] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'GRID' | 'DASHBOARD'>('GRID')
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, id: null })
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'TASKS' | 'DEPENDENCIES' | 'ADOPTION' | 'QA' | 'APPENDIX' | 'ACTIVITY'>('DETAILS')
  const [searchTerm, setSearchTerm] = useState('')
  const [detailWidth, setDetailWidth] = useState(800)
  const [isMaximized, setIsMaximized] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [registryModal, setRegistryModal] = useState<any>(null)
  const gridRef = useRef<any>(null)

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await (await apiFetch('/api/v1/projects')).json())
  })

  const { data: options } = useQuery({ 
    queryKey: ['settings-options'], 
    queryFn: async () => (await (await apiFetch('/api/v1/settings/options')).json()) 
  })
  
  const { data: devices } = useQuery({ 
    queryKey: ['devices-all'], 
    queryFn: async () => (await (await apiFetch('/api/v1/devices/')).json()) 
  })
  
  const { data: services } = useQuery({ 
    queryKey: ['services-all'], 
    queryFn: async () => (await (await apiFetch('/api/v1/logical-services/')).json()) 
  })

  const projectTypeOptions = useMemo(() => {
    const registryTypes = options?.filter((o: any) => o.category === 'ProjectType').map((o: any) => ({ value: o.value, label: o.label.toUpperCase() })) || []
    return registryTypes.length > 0 ? registryTypes : PROJECT_TYPES
  }, [options])

  const projectStatusOptions = useMemo(() => {
    const registryStatuses = options?.filter((o: any) => o.category === 'ProjectStatus').map((o: any) => ({ value: o.value, label: o.label.toUpperCase() })) || []
    return registryStatuses.length > 0 ? registryStatuses : PROJECT_STATUSES
  }, [options])

  const projectPriorityOptions = useMemo(() => {
    const registryPriorities = options?.filter((o: any) => o.category === 'ProjectPriority').map((o: any) => ({ value: o.value, label: o.label.toUpperCase() })) || []
    return registryPriorities.length > 0 ? registryPriorities : PROJECT_PRIORITIES
  }, [options])

  const columnDefs = useMemo(() => [
    { 
      headerName: "", 
      width: 50,
      minWidth: 50,
      maxWidth: 50,
      checkboxSelection: true, 
      headerCheckboxSelection: true, 
      pinned: 'left' as const, 
      cellClass: 'flex items-center justify-center border-r border-white/5', 
      headerClass: 'flex items-center justify-center border-r border-white/5', 
      suppressSizeToFit: true,
      resizable: false,
      sortable: false,
      filter: false,
    },
    { 
      field: 'name', 
      headerName: 'TITLE', 
      minWidth: 250, 
      editable: true,
      cellClass: 'font-bold uppercase text-white px-4',
      cellEditor: 'agTextCellEditor'
    },
    { 
      field: 'type', 
      headerName: 'TYPE', 
      width: 130,
      editable: true,
      valueFormatter: (p: any) => p.value?.toUpperCase(), 
      cellClass: 'font-bold text-slate-400',
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: projectTypeOptions.map((o: any) => o.value)
      }
    },
    {
      field: 'status',
      headerName: 'STATUS',
      width: 150,
      editable: true,
      cellClass: 'font-bold',
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: projectStatusOptions.map(s => s.value)
      },
      cellRenderer: (p: any) => {
        const val = p.value?.toUpperCase() || 'UNKNOWN'
        const color = 
          p.value === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
          p.value === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
          p.value === 'Planning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
          p.value === 'Blocked' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' :
          'bg-slate-500/10 text-slate-400 border-white/10'
        
        return (
          <div className={`px-2 py-1 rounded-md border ${color} text-[9px] font-black tracking-widest flex items-center gap-1.5`}>
            <div className={`w-1 h-1 rounded-full ${color.split(' ')[1].replace('text-', 'bg-')}`} />
            {val}
          </div>
        )
      }
    },
    {
      field: 'priority',
      headerName: 'PRIORITY',
      width: 130,
      editable: true,
      cellClass: 'font-bold',
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: projectPriorityOptions.map(p => p.value)
      },
      cellRenderer: (p: any) => {
        const val = p.value?.toUpperCase() || 'MEDIUM'
        const color = 
          p.value === 'Highest' ? 'text-rose-500' :
          p.value === 'High' ? 'text-amber-500' :
          p.value === 'Medium' ? 'text-blue-400' :
          'text-slate-500'
        return <span className={color}>{val}</span>
      }
    },
    { 
      field: 'owner', 
      headerName: 'OWNER(S)', 
      width: 180,
      editable: true,
      cellClass: 'font-bold text-slate-300' 
    },
    {
      field: 'target_systems',
      headerName: 'SYSTEM SCOPE',
      width: 150,
      cellRenderer: SystemScopeRenderer,
      cellClass: 'font-bold'
    },
    {
      field: 'stoploss_minutes_saved',
      headerName: 'STOPLOSS (M)',
      width: 120,
      editable: true,
      cellClass: 'font-bold text-rose-400 text-center',
      cellEditor: 'agNumberCellEditor'
    },
    {
      field: 'wafers_gained',
      headerName: 'WAFERS (+)',
      width: 120,
      editable: true,
      cellClass: 'font-bold text-emerald-400 text-center',
      cellEditor: 'agNumberCellEditor'
    },
    {
      headerName: 'TASKS',
      width: 100,
      valueGetter: (p: any) => p.data.tasks?.length || 0,
      cellClass: 'font-bold text-center'
    },
    {
      headerName: 'REPORT',
      width: 100,
      pinned: 'right',
      cellRenderer: (p: any) => (
        <div className="flex items-center justify-center gap-2 h-full">
          <button 
            onClick={() => setActiveModal({ type: 'REPORT', project: p.data })}
            className="p-1.5 hover:bg-blue-600/20 text-blue-400 rounded-md transition-all"
            title="Executive Report"
          >
            <FileText size={14} />
          </button>
          <button 
            onClick={() => setSelectedProjectId(p.data.id)}
            className="p-1.5 hover:bg-emerald-600/20 text-emerald-400 rounded-md transition-all"
            title="Project Insights"
          >
            <BarChart3 size={14} />
          </button>
        </div>
      )
    }
  ], [projects, projectTypeOptions, projectStatusOptions, projectPriorityOptions])

  const onCellValueChanged = (event: any) => {
    const updatedData = { ...event.data, [event.column.colId]: event.newValue }
    mutation.mutate(updatedData)
  }
  const selectedProject = useMemo(() => projects?.find((p: any) => p.id === selectedProjectId), [projects, selectedProjectId])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data.id ? `/api/v1/projects/${data.id}` : '/api/v1/projects'
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(data) })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setActiveModal(null)
      toast.success('Matrix Synchronized')
    },
    onError: (e: any) => toast.error(e.message)
  })

  const cloneMutation = useMutation({
    mutationFn: async (project: any) => {
      const { id, created_at, updated_at, tasks, ...rest } = project
      const clonedProject = {
        ...rest,
        name: `CLONE: ${rest.name}`,
        status: 'Planning',
        tasks: (tasks || []).map(({ id, created_at, updated_at, project_id, ...t }: any) => t)
      }
      const res = await apiFetch('/api/v1/projects', { method: 'POST', body: JSON.stringify(clonedProject) })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Strategic Vector Duplicated')
    },
    onError: (e: any) => toast.error(e.message)
  })

  const getContextMenuItems = (params: any) => {
    const project = params.node.data
    return [
      {
        name: `DUPLICATE STRATEGY`,
        action: () => cloneMutation.mutate(project),
        icon: '<span class="text-blue-400"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></span>'
      },
      'separator',
      {
        name: 'QUICK STATUS: IN PROGRESS',
        action: () => mutation.mutate({ ...project, status: 'In Progress' }),
        disabled: project.status === 'In Progress'
      },
      {
        name: 'FLAG AS BLOCKED',
        action: () => mutation.mutate({ ...project, status: 'Blocked' }),
        disabled: project.status === 'Blocked',
        icon: '<span class="text-rose-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>'
      },
      {
        name: 'MARK COMPLETED',
        action: () => mutation.mutate({ ...project, status: 'Completed' }),
        disabled: project.status === 'Completed'
      },
      'separator',
      {
        name: 'GENERATE EXECUTIVE REPORT',
        action: () => setActiveModal({ type: 'REPORT', project }),
        icon: '<span class="text-emerald-400"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></span>'
      },
      'separator',
      'copy',
      'export'
    ]
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setSelectedProjectId(null)
      setConfirmModal({ isOpen: false, id: null })
      toast.success('Project De-scoped')
    }
  })

  const handleMouseDown = () => setIsResizing(true)

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX
      setDetailWidth(Math.max(400, Math.min(newWidth, 1200)))
    }
  }

  const handleMouseUp = () => {
    setIsResizing(false)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Standard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white italic">Project Matrix</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Strategic Evolution Roadmap</p>
        </div>
        
        <div className="flex items-center space-x-3">
           {/* View Toggle */}
           <div className="flex bg-white/5 p-1 rounded-lg border border-white/5 mr-4">
              <button 
                onClick={() => setViewMode('GRID')}
                className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${viewMode === 'GRID' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Grid
              </button>
              <button 
                onClick={() => setViewMode('DASHBOARD')}
                className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${viewMode === 'DASHBOARD' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Dashboard
              </button>
           </div>

           <div className="flex items-center space-x-3 bg-white/5 p-1 rounded-lg border border-white/5">
             <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  placeholder="SEARCH MATRIX..." 
                  className="bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-blue-500/50 w-64 transition-all" 
                />
             </div>
             <button 
                onClick={() => gridRef.current?.api?.setGridOption('isExternalFilterPresent', () => true)} 
                className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" 
                title="Filter Matrix"
             >
                <Filter size={16} />
             </button>
             <button onClick={() => gridRef.current?.api?.showColumnChooser()} className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Toggle Columns">
                <Sliders size={16} />
             </button>
           </div>

           <button onClick={() => setActiveModal({})} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">+ Initialize Stream</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden space-x-1 relative">
        {viewMode === 'DASHBOARD' ? (
          <DashboardView projects={projects || []} />
        ) : (
          <div className="flex-1 glass-panel rounded-lg border border-white/5 overflow-hidden flex flex-col ag-theme-alpine-dark">
            <AgGridReact 
              ref={gridRef}
              rowData={projects}
              columnDefs={columnDefs}
              rowSelection="multiple"
              onSelectionChanged={(e) => {
                const selected = e.api.getSelectedRows()
                if (selected.length > 0) {
                  setSelectedProjectId(selected[0].id)
                  setIsEditing(false)
                }
              }}
              onCellValueChanged={onCellValueChanged}
              onGridReady={(params) => params.api.sizeColumnsToFit()}
              quickFilterText={searchTerm}
              animateRows={true}
              enableCellTextSelection={true}
              headerHeight={35}
              rowHeight={45}
              undoRedoCellEditing={true}
              undoRedoCellEditingLimit={20}
              enterMovesDown={true}
              enterMovesDownAfterEdit={true}
              defaultColDef={{ 
                resizable: true, 
                sortable: true, 
                filter: true, 
                floatingFilter: true,
                flex: 1,
                minWidth: 100,
                cellStyle: { fontSize: '10px', fontWeight: 'bold' }
              }}
            />
          </div>
        )}

        {/* Detail Pane - Slides Out */}
        <AnimatePresence>
          {selectedProject && (
            <>
              <div 
                onMouseDown={handleMouseDown}
                className={`w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-30 ${isResizing ? 'bg-blue-500' : ''}`}
              />
              
              <motion.div 
                initial={{ x: '100%', opacity: 0 }}
                animate={{ 
                  x: 0, 
                  opacity: 1,
                  width: isMaximized ? '95%' : detailWidth 
                }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="glass-panel border-l border-white/10 bg-[#0a0c14]/40 backdrop-blur-xl flex flex-col z-20 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] rounded-lg"
              >
                {/* Detail Header */}
                <div className="p-6 border-b border-white/5 bg-white/5">
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                         <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                            selectedProject.type === 'Strategic' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                            selectedProject.type === 'Tactical' ? 'text-blue-400 border-blue-500/20 bg-blue-500/5' :
                            'text-amber-400 border-amber-500/20 bg-amber-500/5'
                         }`}>{selectedProject.type}</span>
                         
                         <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                            selectedProject.status === 'In Progress' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                            'text-slate-400 border-white/10 bg-white/5'
                         }`}>{selectedProject.status}</span>

                         <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                           selectedProject.priority === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                           selectedProject.priority === 'High' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                           'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                         }`}>{selectedProject.priority} PRIORITY</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white uppercase mt-2">{selectedProject.name}</h2>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-1">
                        <User size={12}/> {selectedProject.owner} <span className="text-slate-700 mx-1">//</span> <Calendar size={12}/> {new Date(selectedProject.start_date).toLocaleDateString()} — {new Date(selectedProject.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const tasks = selectedProject.tasks || []
                          const completed = tasks.filter((t:any) => t.status === 'Completed').map((t:any) => t.name)
                          const pending = tasks.filter((t:any) => t.status !== 'Completed').map((t:any) => t.name)
                          const update = `**WEEKLY UPDATE: ${selectedProject.name}**\n\n` +
                                        `✅ **COMPLETED:**\n${completed.length ? completed.map(t => `- ${t}`).join('\n') : '- No tasks completed this week.'}\n\n` +
                                        `🚀 **IN PROGRESS / NEXT:**\n${pending.length ? pending.map(t => `- ${t}`).join('\n') : '- No pending tasks.'}\n\n` +
                                        `⚠️ **RISKS/BLOCKERS:**\n${selectedProject.status === 'Blocked' ? '- PROJECT IS CURRENTLY BLOCKED' : '- No major blockers flagged.'}`
                          navigator.clipboard.writeText(update)
                          toast.success('WEEKLY UPDATE COPIED TO CLIPBOARD')
                        }}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase text-blue-400 hover:bg-white/10 transition-all flex items-center gap-2"
                        title="Copy Weekly Update"
                      >
                        <RefreshCcw size={12}/> Update
                      </button>

                      <button 
                        onClick={() => setIsMaximized(!isMaximized)} 
                        className={`p-1.5 border rounded-lg transition-all ${isMaximized ? 'bg-amber-500 border-amber-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                        title={isMaximized ? "Restore Size" : "Maximize View"}
                      >
                        <LayoutGrid size={16}/>
                      </button>

                      <button 
                        onClick={() => cloneMutation.mutate(selectedProject)}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase text-amber-400 hover:bg-white/10 transition-all flex items-center gap-2"
                        title="Duplicate Project"
                      >
                        <PlusCircle size={12}/> Clone
                      </button>

                      <button onClick={() => { setIsEditing(!isEditing); setActiveTab('DETAILS'); }} className={`p-1.5 border rounded-lg transition-all ${isEditing ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                        {isEditing ? <Check size={16}/> : <Edit2 size={16}/>}
                      </button>
                      <button onClick={() => setConfirmModal({ isOpen: true, id: selectedProject.id })} className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-500 transition-all"><Trash2 size={16}/></button>
                      <button onClick={() => { setSelectedProjectId(null); setIsEditing(false); setIsMaximized(false); }} className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all ml-2"><X size={16}/></button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                     {['DETAILS', 'TASKS', 'DEPENDENCIES', 'ADOPTION', 'QA', 'APPENDIX', 'ACTIVITY'].map(tab => (
                       <button 
                         key={tab}
                         onClick={() => setActiveTab(tab as any)}
                         className={`px-6 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'}`}
                       >
                         {tab}
                       </button>
                     ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                  {activeTab === 'DETAILS' && (
                    isEditing ? (
                      <div className="animate-in fade-in zoom-in-95 duration-300">
                        <ProjectForm 
                          initialData={selectedProject} 
                          onSave={(data: any) => {
                            mutation.mutate(data)
                            setIsEditing(false)
                          }} 
                          isSaving={mutation.isPending} 
                          options={options} 
                          devices={devices} 
                          services={services} 
                          onOpenTypeSettings={() => setRegistryModal({ category: 'ProjectType' })}
                          projectTypeOptions={projectTypeOptions}
                          projectStatusOptions={projectStatusOptions}
                          projectPriorityOptions={projectPriorityOptions}
                        />
                        <button 
                          onClick={() => setIsEditing(false)}
                          className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          Cancel Editing
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-2 gap-8">
                           <div className="space-y-4">
                              <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                 <Clipboard size={14} /> Problem Statement
                              </h4>
                              <div className="bg-black/40 p-5 rounded-lg border border-white/5 relative group min-h-[120px]">
                                 <p className="text-[11px] font-bold text-slate-300 leading-relaxed italic">{selectedProject.problem_statement || 'NO PROBLEM STATEMENT DEFINED'}</p>
                              </div>
                           </div>
                           <div className="space-y-4">
                              <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                 <Target size={14} /> Mission Objective
                              </h4>
                              <div className="bg-black/40 p-5 rounded-lg border border-white/5 relative group min-h-[120px]">
                                 <p className="text-[11px] font-bold text-slate-300 leading-relaxed">{selectedProject.objective || 'NO OBJECTIVE DEFINED'}</p>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-3 gap-8">
                           <div className="space-y-3">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Layers size={12} className="text-blue-500"/> Target Systems</p>
                              <div className="flex flex-wrap gap-1.5">
                                 {selectedProject.target_systems?.map((s:string, i:number) => <span key={i} className="px-2.5 py-1 bg-white/5 rounded text-[10px] font-bold text-slate-400 uppercase tracking-tight">{s}</span>)}
                              </div>
                           </div>
                           <div className="space-y-3">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Server size={12} className="text-emerald-500"/> Target Assets</p>
                              <div className="flex flex-wrap gap-1.5">
                                 {selectedProject.target_assets?.map((s:string, i:number) => <span key={i} className="px-2.5 py-1 bg-white/5 rounded text-[10px] font-bold text-slate-400 uppercase tracking-tight">{s}</span>)}
                              </div>
                           </div>
                           <div className="space-y-3">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><ExternalLink size={12} className="text-blue-400"/> Jira Records</p>
                              <div className="flex flex-wrap gap-1.5">
                                 {selectedProject.jira_links?.map((s:string, i:number) => <span key={i} className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded text-[10px] font-black uppercase tracking-tighter hover:bg-blue-500/20 cursor-pointer transition-colors">{s}</span>)}
                              </div>
                           </div>
                        </div>
                      </div>
                    )
                  )}

                  {activeTab === 'ADOPTION' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                       <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                          <Users size={14} /> Adoption & Feedback Metrics
                       </h4>
                       <AdoptionPanel project={selectedProject} />
                    </div>
                  )}

                  {activeTab === 'TASKS' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                           <Calendar size={14} /> Schedule Visualization
                        </h4>
                      </div>
                      <GanttChart project={selectedProject} onUpdate={(data) => mutation.mutate(data)} projectStatusOptions={projectStatusOptions} />
                      
                      <div className="space-y-5">
                         <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Task Matrix</h4>
                            <button onClick={() => toast.error('Task Management requires Edit Mode')} className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">+ Add Task</button>
                         </div>
                         <div className="space-y-3">
                            {selectedProject.tasks?.map((task: any) => (
                              <div key={task.id} className="bg-black/40 p-5 rounded-lg border border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-colors">
                                 <div className="flex items-center gap-5">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-black shadow-inner ${
                                      task.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                       {task.progress}%
                                    </div>
                                    <div>
                                       <h5 className="text-[11px] font-black text-white uppercase tracking-wider">{task.name}</h5>
                                       <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{task.start_date} // {task.end_date}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                                      task.status === 'Completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                    }`}>{task.status}</span>
                                    <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 rounded-lg hover:text-blue-400"><ChevronRight size={16}/></button>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'QA' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                           <HelpCircle size={14} /> Consolidated Q&A
                        </h4>
                        <button className="px-4 py-2 bg-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all active:scale-95">+ ASK QUESTION</button>
                      </div>
                      <div className="overflow-hidden border border-white/5 rounded-lg bg-black/40">
                         <table className="w-full text-left text-[10px] font-black uppercase tracking-widest border-collapse">
                            <thead className="bg-white/5 text-slate-500">
                               <tr>
                                  <th className="p-4 border-b border-white/5">Question</th>
                                  <th className="p-4 border-b border-white/5">Asked By</th>
                                  <th className="p-4 border-b border-white/5">Status</th>
                                  <th className="p-4 border-b border-white/5 text-right">Action</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                               {selectedProject.qa_items?.map((qa:any) => (
                                 <tr key={qa.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 text-white truncate max-w-[200px] font-bold">{qa.question}</td>
                                    <td className="p-4 text-slate-400 font-bold">{qa.asked_by}</td>
                                    <td className="p-4">
                                       <span className={`font-black ${qa.status === 'Answered' ? 'text-emerald-400' : 'text-amber-400'}`}>{qa.status}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                       <button className="text-blue-400 hover:text-blue-300 font-black tracking-tighter opacity-0 group-hover:opacity-100 transition-all">VIEW</button>
                                    </td>
                                 </tr>
                               ))}
                               {selectedProject.qa_items?.length === 0 && (
                                 <tr><td colSpan={4} className="p-12 text-center text-slate-600 font-black italic tracking-[0.2em] opacity-50">No consolidated Q&A items found</td></tr>
                               )}
                            </tbody>
                         </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'APPENDIX' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <AppendixSection
                        project={selectedProject}
                        onUpdate={(data) => mutation.mutate(data)}
                      />
                    </div>
                  )}

                  {activeTab === 'ACTIVITY' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                       <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                          <History size={14} /> Strategic Activity Stream
                       </h4>
                       <div className="flex-1 space-y-4 overflow-y-auto pr-4 custom-scrollbar">
                          {[...(selectedProject.comments || []), ...(selectedProject.qa_items || [])]
                            .sort((a: any, b: any) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime())
                            .map((item: any, i: number) => (
                              <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-lg space-y-2 group hover:border-blue-500/30 transition-all">
                                 <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                       <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black text-white">
                                          {(item.author || item.asked_by || 'U')[0].toUpperCase()}
                                       </div>
                                       <span className="text-[10px] font-black text-slate-300 uppercase">{item.author || item.asked_by}</span>
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase">{new Date(item.timestamp || item.created_at).toLocaleString()}</span>
                                 </div>
                                 <p className="text-[11px] font-bold text-slate-400 leading-relaxed italic">"{item.content || item.question}"</p>
                                 {item.answer && (
                                   <div className="mt-2 pl-4 border-l-2 border-emerald-500/30">
                                      <p className="text-[9px] font-black text-emerald-400 uppercase mb-1 flex items-center gap-1"><CheckCircle2 size={10}/> Answered</p>
                                      <p className="text-[10px] font-bold text-slate-300 italic">"{item.answer}"</p>
                                   </div>
                                 )}
                              </div>
                            ))}
                          {[...(selectedProject.comments || []), ...(selectedProject.qa_items || [])].length === 0 && (
                            <div className="py-20 text-center text-slate-600 font-black italic tracking-[0.2em] opacity-50">No strategic activity recorded</div>
                          )}
                       </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeModal?.type === 'REPORT' && (
          <ExecutiveReportModal project={activeModal.project} onClose={() => setActiveModal(null)} />
        )}

        {activeModal && activeModal.type !== 'REPORT' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-[1100px] max-h-[90vh] overflow-y-auto p-12 rounded-lg border border-blue-500/30 custom-scrollbar shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-8">
                   <div>
                     <h2 className="text-3xl font-bold uppercase text-white tracking-tighter italic">{activeModal.id ? 'COMMIT BASELINE UPDATE' : 'INITIALIZE PROJECT STREAM'}</h2>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Strategic Infrastructure Roadmap Development</p>
                   </div>
                   <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-all"><X size={24}/></button>
                </div>
                <ProjectForm
                  initialData={activeModal}
                  onSave={mutation.mutate}
                  isSaving={mutation.isPending}
                  options={options}
                  devices={devices}
                  services={services}
                  onOpenTypeSettings={() => setRegistryModal({ category: 'ProjectType' })}
                  projectTypeOptions={projectTypeOptions}
                  projectStatusOptions={projectStatusOptions}
                  projectPriorityOptions={projectPriorityOptions}
                />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {registryModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md">
           <div className="glass-panel w-[500px] p-8 rounded-lg border border-blue-500/30">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold uppercase text-white">Manage {registryModal.category}</h3>
                 <button onClick={() => setRegistryModal(null)} className="text-slate-500 hover:text-white"><X size={20}/></button>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mb-4 uppercase">Registry management is handled in Settings. This is a shortcut to the registry values.</p>
              <div className="space-y-2">
                 {options?.filter((o:any) => o.category === registryModal.category).map((o:any) => (
                    <div key={o.id} className="flex justify-between p-3 bg-white/5 rounded border border-white/5 text-[11px] font-bold text-slate-300 uppercase">
                       <span>{o.label}</span>
                       <span className="text-slate-600 italic">{o.value}</span>
                    </div>
                 ))}
              </div>
              <button onClick={() => setRegistryModal(null)} className="w-full mt-6 py-3 bg-blue-600 rounded-lg text-[10px] font-bold uppercase text-white">Close Registry View</button>
           </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={() => deleteMutation.mutate(confirmModal.id)}
        title="DEPRECATE PROJECT STREAM"
        message="THIS WILL PERMANENTLY ARCHIVE THIS STRATEGIC VECTOR FROM THE ACTIVE MATRIX. AUDIT LOGS WILL BE PRESERVED. PROCEED?"
        variant="danger"
      />

      <style>{`
        .ag-theme-alpine-dark {
          --ag-background-color: #1a1b26;
          --ag-header-background-color: #24283b;
          --ag-border-color: rgba(255, 255, 255, 0.05);
          --ag-foreground-color: #f1f5f9;
          --ag-header-foreground-color: #3b82f6;
          --ag-font-family: 'Inter', sans-serif;
        }
        .ag-root-wrapper { border: none !important; border-radius: 8px !important; }
        .ag-header-cell-label { 
            font-weight: 700 !important; 
            text-transform: uppercase !important; 
            letter-spacing: 0.1em !important; 
            font-size: 10px !important; 
            justify-content: center !important; 
        }
        .ag-cell { 
            display: flex; 
            align-items: center; 
            justify-content: center !important; 
            font-size: 10px !important;
            font-weight: bold !important;
        }
        .ag-row-hover { background-color: rgba(255,255,255,0.05) !important; }
        .ag-row-selected { background-color: rgba(59, 130, 246, 0.2) !important; }
        
        /* Make filter popups non-transparent and on top */
        .ag-popup { z-index: 1000 !important; }
        .ag-filter-wrapper { background-color: #24283b !important; border: 1px solid rgba(255,255,255,0.1) !important; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4) !important; border-radius: 8px !important; opacity: 1 !important; }
        .ag-filter-body { background-color: #24283b !important; padding: 12px !important; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}</style>
    </div>
  )
}
