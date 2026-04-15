import React, { useMemo, useState, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Briefcase, X, RefreshCcw, Search, Edit2, LayoutGrid, List, FileText, Calendar, Clock, CheckCircle2, AlertCircle, BarChart3, Users, DollarSign, Target, ChevronRight, ArrowRight, Layers, Server } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { apiFetch } from "../api/apiClient"
import { StyledSelect } from "./shared/StyledSelect"
import { ConfirmationModal } from "./shared/ConfirmationModal"

// --- Gantt Chart Component ---
const GanttChart = ({ tasks }: { tasks: any[] }) => {
  if (!tasks || tasks.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-600 border-2 border-dashed border-white/5 rounded-[30px]">
       <Calendar size={48} className="mb-4 opacity-20" />
       <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Schedule Data Available</p>
    </div>
  )

  // Calculate time range
  const startDates = tasks.map(t => new Date(t.start).getTime())
  const endDates = tasks.map(t => new Date(t.end).getTime())
  const minDate = Math.min(...startDates)
  const maxDate = Math.max(...endDates)
  const duration = maxDate - minDate
  
  // 10% padding
  const chartStart = minDate - duration * 0.05
  const chartEnd = maxDate + duration * 0.05
  const chartDuration = chartEnd - chartStart

  return (
    <div className="space-y-4 p-6 bg-black/20 rounded-[30px] border border-white/5 overflow-x-auto custom-scrollbar">
      <div className="min-w-[800px] space-y-2">
        {tasks.map((task, idx) => {
          const startPct = ((new Date(task.start).getTime() - chartStart) / chartDuration) * 100
          const endPct = ((new Date(task.end).getTime() - chartStart) / chartDuration) * 100
          const widthPct = endPct - startPct

          return (
            <div key={idx} className="group relative h-12 flex items-center">
              <div className="w-48 flex-shrink-0 text-[10px] font-black uppercase text-slate-500 truncate pr-4 group-hover:text-blue-400 transition-colors">
                {task.name}
              </div>
              <div className="flex-1 h-2 bg-white/5 rounded-full relative overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%`, left: `${startPct}%` }}
                  transition={{ duration: 1, delay: idx * 0.1 }}
                  className={`absolute h-full rounded-full flex items-center shadow-lg ${
                    task.progress === 100 ? 'bg-emerald-500 shadow-emerald-500/20' : 
                    task.progress > 50 ? 'bg-blue-500 shadow-blue-500/20' : 
                    'bg-amber-500 shadow-amber-500/20'
                  }`}
                >
                  <div 
                    className="h-full bg-white/20 transition-all duration-1000" 
                    style={{ width: `${task.progress}%` }} 
                  />
                </motion.div>
              </div>
              <div className="w-12 text-right text-[9px] font-black text-slate-600 ml-4 group-hover:text-white transition-colors">
                {task.progress}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const ProjectForm = ({ initialData, onSave, isSaving }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Planning',
    priority: 'Medium',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    owner: '',
    budget: 0,
    team_members: [],
    tasks_json: [],
    ...initialData
  })

  const [newTask, setNewTask] = useState({ name: '', start: '', end: '', progress: 0 })

  const addTask = () => {
    if (!newTask.name || !newTask.start || !newTask.end) return
    setFormData({
      ...formData,
      tasks_json: [...formData.tasks_json, { ...newTask, id: Date.now() }]
    })
    setNewTask({ name: '', start: '', end: '', progress: 0 })
  }

  return (
    <div className="space-y-8 mt-6">
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-1 block mb-2">Project Identity *</label>
            <input 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all" 
              placeholder="E.G. DATA CENTER MIGRATION 2026" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StyledSelect
              label="Status"
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
              options={[
                { value: 'Planning', label: 'PLANNING' },
                { value: 'In Progress', label: 'IN PROGRESS' },
                { value: 'On Hold', label: 'ON HOLD' },
                { value: 'Completed', label: 'COMPLETED' }
              ]}
            />
            <StyledSelect
              label="Priority"
              value={formData.priority}
              onChange={e => setFormData({...formData, priority: e.target.value})}
              options={[
                { value: 'Low', label: 'LOW' },
                { value: 'Medium', label: 'MEDIUM' },
                { value: 'High', label: 'HIGH' },
                { value: 'Critical', label: 'CRITICAL' }
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 px-1">Start Date</label>
              <input type="date" value={formData.start_date.split('T')[0]} onChange={e => setFormData({...formData, start_date: new Date(e.target.value).toISOString()})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 px-1">End Date</label>
              <input type="date" value={formData.end_date.split('T')[0]} onChange={e => setFormData({...formData, end_date: new Date(e.target.value).toISOString()})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 px-1">Project Lead / Owner</label>
            <input value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none" placeholder="E.G. JONATHAN REED" />
          </div>
        </div>

        <div className="space-y-4">
           <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 px-1">Project Objective</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-sm font-bold text-white h-[140px] resize-none outline-none focus:border-blue-500" placeholder="Describe the project scope and expected outcomes..." />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 px-1">Budget Allocation (USD)</label>
            <div className="relative">
               <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
               <input type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: parseFloat(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-white outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
         <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-[11px] font-black uppercase text-blue-400 tracking-widest flex items-center space-x-2">
               <Calendar size={14}/> <span>Schedule Milestones & Tasks</span>
            </h3>
         </div>
         <div className="grid grid-cols-4 gap-4 items-end bg-white/5 p-6 rounded-3xl border border-white/5">
            <div className="col-span-1">
               <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block">Task Name</label>
               <input value={newTask.name} onChange={e => setNewTask({...newTask, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none" placeholder="Phase 1: Analysis" />
            </div>
            <div>
               <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block">Start</label>
               <input type="date" value={newTask.start} onChange={e => setNewTask({...newTask, start: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none" />
            </div>
            <div>
               <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block">End</label>
               <input type="date" value={newTask.end} onChange={e => setNewTask({...newTask, end: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none" />
            </div>
            <button onClick={addTask} className="h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all">+ Add Task</button>
         </div>

         <div className="space-y-2">
            {formData.tasks_json.map((task: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between bg-white/5 px-6 py-3 rounded-2xl group">
                 <div className="flex items-center space-x-6">
                    <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-black flex items-center justify-center border border-blue-500/20">{idx + 1}</span>
                    <span className="text-[11px] font-black text-white uppercase tracking-tight">{task.name}</span>
                    <span className="text-[9px] font-black text-slate-500 uppercase">{task.start} // {task.end}</span>
                 </div>
                 <div className="flex items-center space-x-4">
                    <input type="number" min="0" max="100" value={task.progress} onChange={e => {
                      const newTasks = [...formData.tasks_json];
                      newTasks[idx].progress = parseInt(e.target.value);
                      setFormData({...formData, tasks_json: newTasks});
                    }} className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-center text-[10px] font-black text-blue-400" />
                    <button onClick={() => setFormData({...formData, tasks_json: formData.tasks_json.filter((_:any, i:number) => i !== idx)})} className="text-slate-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                 </div>
              </div>
            ))}
         </div>
      </div>

      <div className="flex space-x-4 pt-8 border-t border-white/5">
        <button 
          disabled={isSaving || !formData.name} 
          onClick={() => onSave(formData)} 
          className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
        >
          {isSaving ? 'Synchronizing Execution Plan...' : (initialData.id ? 'Update Project Baseline' : 'Initialize Project Stream')}
        </button>
      </div>
    </div>
  )
}

export default function Projects() {
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [activeModal, setActiveModal] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, id: null })

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project Registry Synchronized')
      setActiveModal(null)
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
      toast.success('Project Deprecated & Archived')
    },
    onError: (e: any) => toast.error(e.message)
  })

  const selectedProject = useMemo(() => projects?.find((p: any) => p.id === selectedProjectId), [projects, selectedProjectId])

  useEffect(() => {
    if (!selectedProjectId && projects?.length > 0) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const stats = useMemo(() => {
    if (!projects) return { active: 0, completion: 0, budget: 0 }
    const active = projects.filter((p: any) => p.status === 'In Progress').length
    const totalProgress = projects.reduce((acc: number, p: any) => {
      if (!p.tasks_json?.length) return acc
      const pProgress = p.tasks_json.reduce((tacc: number, t: any) => tacc + (t.progress || 0), 0) / p.tasks_json.length
      return acc + pProgress
    }, 0)
    const budget = projects.reduce((acc: number, p: any) => acc + (p.budget || 0), 0)
    return { 
      active, 
      completion: projects.length ? Math.round(totalProgress / projects.length) : 0,
      budget: budget.toLocaleString()
    }
  }, [projects])

  return (
    <div className="h-full flex flex-col space-y-8">
      {/* Dynamic Header & Stats */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-5">
           <div className="w-14 h-14 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 border-t border-white/20">
              <Briefcase size={28} />
           </div>
           <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-white italic">Project Matrix</h1>
              <p className="text-[11px] text-slate-500 uppercase tracking-[0.3em] font-black mt-1">Infrastructure Evolution & Strategic Roadmap</p>
           </div>
        </div>

        <div className="flex items-center space-x-6">
           <div className="flex items-center space-x-8 px-8 py-3 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md">
              <div className="text-center">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Streams</p>
                 <p className="text-xl font-black text-blue-400">{stats.active}</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Avg Progress</p>
                 <p className="text-xl font-black text-emerald-400">{stats.completion}%</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Budget</p>
                 <p className="text-xl font-black text-white">${stats.budget}</p>
              </div>
           </div>
           <button onClick={() => setActiveModal({})} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[24px] text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 active:scale-95 transition-all">+ New Stream</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden space-x-8">
        {/* Project Vertical Nav */}
        <div className="w-80 flex flex-col glass-panel rounded-[40px] border border-white/5 overflow-hidden shadow-2xl bg-[#0a0c14]/40">
           <div className="p-6 border-b border-white/5 bg-white/5">
              <div className="relative">
                 <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                 <input placeholder="Filter Streams..." className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-[11px] font-black uppercase text-white outline-none focus:border-blue-500/50 transition-all" />
              </div>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {projects?.map((p: any) => (
                <button 
                  key={p.id} 
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`w-full flex flex-col p-5 rounded-[28px] transition-all text-left relative group ${selectedProjectId === p.id ? 'bg-blue-600 shadow-xl shadow-blue-600/20' : 'hover:bg-white/5'}`}
                >
                   <div className="flex items-center justify-between mb-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${selectedProjectId === p.id ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-400'}`}>{p.status}</span>
                      <span className={`text-[10px] font-black ${selectedProjectId === p.id ? 'text-white/60' : 'text-slate-600'}`}>{p.priority}</span>
                   </div>
                   <span className={`font-black text-[13px] uppercase tracking-tighter leading-tight ${selectedProjectId === p.id ? 'text-white' : 'text-slate-200'}`}>{p.name}</span>
                   <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                         <Users size={12} className={selectedProjectId === p.id ? 'text-white/60' : 'text-slate-500'} />
                         <span className={`text-[10px] font-black ${selectedProjectId === p.id ? 'text-white/60' : 'text-slate-500'}`}>{p.owner || 'NO LEAD'}</span>
                      </div>
                      <ChevronRight size={16} className={selectedProjectId === p.id ? 'text-white' : 'text-slate-700'} />
                   </div>
                   {selectedProjectId === p.id && <motion.div layoutId="p-active" className="absolute left-0 top-4 bottom-4 w-1 bg-white rounded-r-full" />}
                </button>
              ))}
              {(!projects || projects.length === 0) && !isLoading && (
                <div className="py-20 text-center opacity-20 flex flex-col items-center">
                   <Target size={48} className="mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest">No Strategic Projects</p>
                </div>
              )}
           </div>
        </div>

        {/* Project Detailed View */}
        <div className="flex-1 glass-panel rounded-[50px] border border-white/5 overflow-y-auto custom-scrollbar bg-[#0a0c14]/20 p-12">
           {selectedProject ? (
             <div className="space-y-12">
                <div className="flex items-start justify-between">
                   <div className="space-y-4 max-w-2xl">
                      <div className="flex items-center space-x-3">
                         <span className="px-4 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full text-[11px] font-black text-blue-400 uppercase tracking-widest">{selectedProject.priority} PRIORITY</span>
                         <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[11px] font-black text-slate-400 uppercase tracking-widest">{selectedProject.status}</span>
                      </div>
                      <h2 className="text-5xl font-black uppercase tracking-tighter text-white leading-none">{selectedProject.name}</h2>
                      <p className="text-slate-400 font-bold text-sm leading-relaxed">{selectedProject.description || 'No mission objective defined for this strategic stream.'}</p>
                   </div>
                   <div className="flex flex-col items-end space-y-4">
                      <div className="flex space-x-3">
                         <button onClick={() => setActiveModal(selectedProject)} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all"><Edit2 size={20}/></button>
                         <button onClick={() => setConfirmModal({ isOpen: true, id: selectedProject.id })} className="p-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-2xl text-rose-500 transition-all"><Trash2 size={20}/></button>
                      </div>
                      <div className="bg-black/40 p-6 rounded-[30px] border border-white/5 text-right min-w-[200px]">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Project Budget</p>
                         <p className="text-3xl font-black text-white">${selectedProject.budget?.toLocaleString()}</p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-8">
                   <div className="glass-panel p-8 rounded-[40px] bg-blue-600/5 border-blue-500/10 space-y-4">
                      <div className="flex items-center justify-between">
                         <Target size={24} className="text-blue-400" />
                         <span className="text-[10px] font-black text-blue-400/60 uppercase">Operational KPI</span>
                      </div>
                      <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Time Remaining</h4>
                      <p className="text-2xl font-black text-white">42 DAYS</p>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500" style={{ width: '65%' }} />
                      </div>
                   </div>
                   <div className="glass-panel p-8 rounded-[40px] bg-emerald-600/5 border-emerald-500/10 space-y-4">
                      <div className="flex items-center justify-between">
                         <BarChart3 size={24} className="text-emerald-400" />
                         <span className="text-[10px] font-black text-emerald-400/60 uppercase">Aggregated Flow</span>
                      </div>
                      <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Resource Load</h4>
                      <p className="text-2xl font-black text-white">{selectedProject.team_members?.length || 0} MEMBERS</p>
                      <div className="flex -space-x-2">
                         {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#0a0c14] flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">P{i}</div>)}
                      </div>
                   </div>
                   <div className="glass-panel p-8 rounded-[40px] bg-amber-600/5 border-amber-500/10 space-y-4">
                      <div className="flex items-center justify-between">
                         <Clock size={24} className="text-amber-400" />
                         <span className="text-[10px] font-black text-amber-400/60 uppercase">Temporal State</span>
                      </div>
                      <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Project Lead</h4>
                      <p className="text-2xl font-black text-white truncate uppercase">{selectedProject.owner || 'UNASSIGNED'}</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">SINCE {new Date(selectedProject.start_date).toLocaleDateString()}</p>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <h3 className="text-xl font-black uppercase tracking-tighter text-white flex items-center space-x-4">
                         <Calendar size={24} className="text-blue-500" />
                         <span>Strategic Timeline (Gantt Visualization)</span>
                      </h3>
                      <div className="flex items-center space-x-6 text-[10px] font-black uppercase tracking-widest">
                         <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-slate-400">Completed</span>
                         </div>
                         <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-slate-400">In Progress</span>
                         </div>
                         <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500" />
                            <span className="text-slate-400">Backlog</span>
                         </div>
                      </div>
                   </div>
                   <GanttChart tasks={selectedProject.tasks_json} />
                </div>

                <div className="grid grid-cols-2 gap-12 pb-20">
                   <div className="space-y-6">
                      <h3 className="text-xl font-black uppercase tracking-tighter text-white flex items-center space-x-4">
                         <Layers size={24} className="text-indigo-500" />
                         <span>Linked Infrastructure Assets</span>
                      </h3>
                      <div className="space-y-2">
                         {selectedProject.linked_device_ids?.length > 0 ? (
                           selectedProject.linked_device_ids.map((id: number) => (
                             <div key={id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                                <div className="flex items-center space-x-4">
                                   <Server size={18} className="text-indigo-400" />
                                   <span className="text-xs font-black text-slate-300 uppercase tracking-widest">ASSET-ID: {id}</span>
                                </div>
                                <ArrowRight size={16} className="text-slate-700 group-hover:text-indigo-400 transition-all" />
                             </div>
                           ))
                         ) : (
                           <div className="p-10 text-center border-2 border-dashed border-white/5 rounded-3xl text-[10px] font-black uppercase text-slate-600 tracking-widest">No infrastructure binds</div>
                         )}
                      </div>
                   </div>

                   <div className="space-y-6">
                      <h3 className="text-xl font-black uppercase tracking-tighter text-white flex items-center space-x-4">
                         <CheckCircle2 size={24} className="text-emerald-500" />
                         <span>Execution Checklist</span>
                      </h3>
                      <div className="space-y-2">
                        {selectedProject.tasks_json.map((task: any, idx: number) => (
                           <div key={idx} className="flex items-center space-x-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.progress === 100 ? 'bg-emerald-500 border-emerald-500' : 'border-white/10'}`}>
                                 {task.progress === 100 && <CheckCircle2 size={14} className="text-white" />}
                              </div>
                              <div className="flex-1">
                                 <p className={`text-xs font-black uppercase tracking-widest ${task.progress === 100 ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{task.name}</p>
                                 <div className="h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full bg-emerald-500/50" style={{ width: `${task.progress}%` }} />
                                 </div>
                              </div>
                           </div>
                        ))}
                      </div>
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-20">
                <div className="w-32 h-32 rounded-[40px] bg-white/5 border border-white/10 flex items-center justify-center">
                   <Briefcase size={64} />
                </div>
                <p className="text-[12px] font-black uppercase tracking-[0.5em] italic">Select Stream for Matrix Analysis</p>
             </div>
           )}
        </div>
      </div>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-10">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel w-[1000px] max-h-[90vh] overflow-y-auto p-12 rounded-[60px] border border-blue-500/30 custom-scrollbar shadow-2xl">
               <div className="flex items-center justify-between border-b border-white/5 pb-8">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-[28px] bg-blue-600 flex items-center justify-center text-white shadow-xl">
                       <Target size={32}/>
                    </div>
                    <div>
                      <h2 className="text-4xl font-black uppercase text-white tracking-tighter">{activeModal.id ? 'Modify Strategic Baseline' : 'Initialize Project Stream'}</h2>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1 italic">Define Objectives, Budget & Execution Timeline</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-4 rounded-full"><X size={32}/></button>
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
        title="Archive Project Stream"
        message="This will deprecate the project stream and archive all associated task data and resource linkages. This action is recorded in the audit registry. Proceed?"
        variant="danger"
      />
    </div>
  )
}
