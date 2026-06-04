import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Trash2, Edit2, History, ShieldAlert, Globe, Save, X, MessageSquare, TrendingUp, AlertTriangle, Calendar, Database, Server, FileText, ArrowRight, Link2, Layers, Settings, Target, LayoutGrid, Layout, PanelLeft, PanelRight, Minimize2, Maximize2, Briefcase, Users, Binary
} from 'lucide-react'

import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { apiFetch } from '../api/apiClient'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from './shared/ConfirmationModal'
import { StyledSelect } from './shared/StyledSelect'
import { StatusPill } from './shared/StatusPill'
import { ConfigRegistryModal } from './ConfigRegistry'
import { PageHeader, PageToolbar, ToolbarButton, ToolbarGroup, ToolbarIconButton, ToolbarSearch, ToolbarSegmented } from './shared/LayoutPrimitives'
import { format, differenceInDays, addDays, startOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from 'recharts'
import 'reactflow/dist/style.css'

const PROJECT_STATUSES = [
  { value: 'Not Started', label: 'Not Started' }, { value: 'Planning', label: 'Planning' }, { value: 'In Progress', label: 'In Progress' },
  { value: 'Paused', label: 'Paused' }, { value: 'Blocked', label: 'Blocked' }, { value: 'Cancelled', label: 'Cancelled' }, { value: 'Completed', label: 'Completed' }
]
const PROJECT_PRIORITIES = [
  { value: 'Low', label: 'Low' }, { value: 'Medium', label: 'Medium' }, { value: 'High', label: 'High' }, { value: 'Highest', label: 'Highest' }
]

export const ProjectHUD = ({ project, isEditing, isDirty, onEdit, onSave, onCancel, onDelete, onSettings, isSaving }: any) => {
  if (!project) return <header className="shrink-0 bg-[#0a0c14] border-b border-white/5 px-8 py-4 backdrop-blur-xl z-50"><PageHeader title="PROJECTS DASHBOARD" eyebrow="SYSTEM OVERVIEW" /></header>
  return (
    <header className="shrink-0 bg-[#0a0c14] border-b border-white/5 px-8 py-4 backdrop-blur-xl z-50">
       <div className="flex items-center justify-between gap-6">
          <PageHeader eyebrow={`PROJ-${project.id}`} title={project.name?.toUpperCase()} subtitle={project.description} meta={<ToolbarGroup><StatusPill value={project.status} /><div className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-800 text-slate-500 border border-white/5">{project.priority} Priority</div></ToolbarGroup>} />
          <div className="flex items-center gap-2">
             {isEditing ? (
               <ToolbarGroup><ToolbarButton variant="quiet" onClick={onCancel}>Discard</ToolbarButton><ToolbarButton variant="primary" onClick={onSave} disabled={isSaving || !isDirty}>{isSaving ? 'Saving...' : 'Save Changes'}</ToolbarButton></ToolbarGroup>
             ) : (
               <ToolbarGroup>
                  <ToolbarButton variant="primary" onClick={onEdit}><Edit2 size={12} className="mr-2 inline" /> Edit Project</ToolbarButton>
                  <ToolbarIconButton onClick={() => toast.success('Executive Report Generated')} title="Executive Report"><FileText size={16} /></ToolbarIconButton>
                  <ToolbarIconButton onClick={onSettings} title="Configuration"><Settings size={16} /></ToolbarIconButton>
                  <ToolbarIconButton onClick={onDelete} tone="danger"><Trash2 size={16} /></ToolbarIconButton>
               </ToolbarGroup>
             )}
          </div>
       </div>
    </header>
  )
}

const ProjectRail = ({ projects, selectedId, onSelect, onNew, width, isCollapsed, onToggleCollapse }: any) => {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => (projects || []).filter((p:any) => p.name.toLowerCase().includes(search.toLowerCase())), [projects, search])
  if (isCollapsed) return <div className="w-16 border-r border-white/5 bg-[#0a0c14] flex flex-col items-center py-6 shrink-0 z-40"><button onClick={onToggleCollapse} className="p-3 text-slate-600 hover:text-white transition-all"><PanelLeft size={20} /></button><button onClick={onNew} className="p-3 mt-8 bg-blue-600 rounded-xl text-white shadow-lg"><Plus size={20} /></button></div>
  return (
    <div className="relative border-r border-white/5 bg-[#0a0c14] shrink-0 flex flex-col project-sidebar z-40 shadow-xl" style={{ width }}>

       <div className="p-4 space-y-4">
          <PageToolbar left={<ToolbarButton variant="primary" onClick={onNew} className="flex-1 py-2.5">+ New Project</ToolbarButton>} right={<ToolbarIconButton onClick={onToggleCollapse} title="Collapse Sidebar"><PanelRight size={18} /></ToolbarIconButton>} />
          <button onClick={() => onSelect('HUDDLE')} className={`w-full h-12 rounded-lg flex items-center px-4 gap-3 transition-all border ${selectedId === 'HUDDLE' ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
             <LayoutGrid size={18} /><div className="flex flex-col items-start min-w-0 text-left"><span className="text-[10px] font-black uppercase tracking-widest leading-none">Operations Dashboard</span><span className="text-[8px] font-bold uppercase tracking-[0.1em] mt-1 text-slate-600">System Overview</span></div>
          </button>
          <ToolbarSearch value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="min-w-0" />
       </div>
       <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-8 space-y-2">
          {filtered.map((p: any) => (
             <button key={p.id} title={p.name} onClick={() => onSelect(p.id)} className={`w-full text-left p-3 rounded-lg border transition-all relative overflow-hidden ${String(selectedId) === String(p.id) ? 'bg-blue-600/10 border-blue-500/40 shadow-inner' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}>
                {String(selectedId) === String(p.id) && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />}
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-0.5">PROJ-{p.id}</span>
                <h3 className={`text-[11px] font-black truncate leading-tight tracking-tight uppercase ${String(selectedId) === String(p.id) ? 'text-white' : 'text-slate-300'}`}>{p.name}</h3>
             </button>
          ))}
       </div>
    </div>
  )
}

const PrecisionGantt = ({ project }: any) => {
  const tasks = project?.tasks || []
  return (
    <div className="h-full flex flex-col bg-[#0a0c14] overflow-hidden">
       <div className="h-10 border-b border-white/5 flex items-center px-4 justify-between bg-[#0d0f17]"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Timeline Matrix</span></div>
       <div className="flex-1 p-8 overflow-auto"><h3 className="text-white uppercase font-black">Gantt Visualization (Active Tasks: {tasks.length})</h3></div>
    </div>
  )
}

const RiskHeatmap = ({ projects }: any) => {
  const data = useMemo(() => {
    const matrix: any = { 'Highest': { Low: 0, Medium: 0, High: 0 }, 'High': { Low: 0, Medium: 0, High: 0 }, 'Medium': { Low: 0, Medium: 0, High: 0 }, 'Low': { Low: 0, Medium: 0, High: 0 } };
    (projects || []).forEach((p: any) => {
      const priority = p.priority || 'Medium'; if (!matrix[priority]) return
      let riskLevel: 'Low' | 'Medium' | 'High' = 'Low'; const overdueTasks = (p.tasks || []).filter((t: any) => t.status !== 'Completed' && differenceInDays(new Date(), new Date(t.end_date)) > 0)
      if (overdueTasks.length > 3 || p.status === 'Blocked') riskLevel = 'High'; else if (overdueTasks.length > 0) riskLevel = 'Medium'; matrix[priority][riskLevel]++
    })
    return Object.entries(matrix).map(([priority, risks]: any) => ({ priority, ...risks }))
  }, [projects])
  return (
    <div className="bg-[#0a0c14] border border-white/5 rounded-xl p-6 space-y-4 shadow-2xl">
       <div className="flex items-center gap-2"><AlertTriangle size={14} className="text-rose-500" /><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Heatmap</h4></div>
       <div className="space-y-2">{data.map((row: any) => (<div key={row.priority} className="grid grid-cols-12 items-center gap-2"><div className="col-span-3 text-[8px] font-black text-slate-600 uppercase truncate">{row.priority}</div><div className="col-span-9 flex h-4 gap-1">{['Low', 'Medium', 'High'].map(k => (<div key={k} className={`flex-1 flex items-center justify-center rounded border text-[8px] font-black ${row[k] > 0 ? 'bg-rose-500/20 text-rose-500 border-rose-500/20 shadow-lg' : 'bg-white/[0.01] border-white/5 text-slate-800'}`}>{row[k] > 0 ? row[k] : ''}</div>))}</div></div>))}</div>
    </div>
  )
}

const ResourceLoadMonitor = ({ projects }: any) => {
  const loadData = useMemo(() => {
    const loads: Record<string, number> = {};
    (projects || []).forEach((p: any) => (p.tasks || []).forEach((t: any) => { if (t.status !== 'Completed') { const o = t.owner || 'Unassigned'; loads[o] = (loads[o] || 0) + 1; } }))
    return Object.entries(loads).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [projects])
  return (
    <div className="bg-[#0a0c14] border border-white/5 rounded-xl p-6 space-y-4 shadow-2xl">
       <div className="flex items-center gap-2"><Users size={14} className="text-blue-500" /><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource Load</h4></div>
       <div className="space-y-3">{loadData.map(([o, c]) => (<div key={o} className="space-y-1"><div className="flex justify-between text-[9px] font-black text-slate-300 uppercase"><span>{o}</span><span>{c} TASKS</span></div><div className="h-1 bg-white/5 rounded-full overflow-hidden flex border border-white/5"><div className="h-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" style={{ width: `${Math.min(100, (c/10)*100)}%` }} /></div></div>))}</div>
    </div>
  )
}

const StrategicVelocity = ({ projects }: any) => {
  const data = useMemo(() => [3,2,1,0].map(w => ({ name: `W-${w}`, completed: Math.floor(Math.random() * 10) })), [projects]);
  return (
    <div className="bg-[#0a0c14] border border-white/5 rounded-xl p-6 space-y-4 shadow-2xl col-span-1">
       <div className="flex items-center gap-2"><TrendingUp size={14} className="text-emerald-500" /><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Velocity</h4></div>
       <div className="h-20 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><Area type="monotone" dataKey="completed" stroke="#10b981" fill="#10b98120" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
    </div>
  )
}

const OperationsDashboardView = ({ projects }: any) => {
  const huddleTasks = useMemo(() => {
    if (!projects) return []; const tasks: any[] = []; projects.forEach((p: any) => (p.tasks || []).forEach((t: any) => { if (t.status !== 'Completed') tasks.push({ ...t, projectName: p.name, projectPriority: p.priority }) })); return tasks.sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
  }, [projects])
  const stats = useMemo(() => ({ total: huddleTasks.length, blocked: huddleTasks.filter(t => t.status === 'Blocked').length, critical: huddleTasks.filter(t => differenceInDays(new Date(t.end_date), new Date()) < 3).length }), [huddleTasks])
  return (
    <div className="h-full flex flex-col bg-[#0a0c14] overflow-hidden">
       <div className="h-16 border-b border-white/5 flex items-center px-8 justify-between bg-[#0a0c14] backdrop-blur-xl z-10">
          <div className="flex items-center gap-6">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center border border-white/5"><LayoutGrid size={20} className="text-white" /></div>
             <div><h2 className="text-lg font-black text-white tracking-tighter uppercase leading-none">Operations Dashboard</h2><p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1 italic">System-wide Execution Matrix</p></div>
          </div>
          <div className="flex items-center gap-12">
             <div className="text-center"><p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Active workload</p><p className="text-2xl font-black text-white leading-none tracking-tighter">{stats.total}</p></div>
             <div className="w-px h-8 bg-white/5" /><div className="text-center"><p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Blocked</p><p className="text-2xl font-black text-rose-500 leading-none tracking-tighter">{stats.blocked}</p></div>
             <div className="w-px h-8 bg-white/5" /><div className="text-center"><p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Critical Phase</p><p className="text-2xl font-black text-amber-500 leading-none tracking-tighter">{stats.critical}</p></div>
          </div>
       </div>
       <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#0a0c14]/30">
          <div className="max-w-7xl mx-auto space-y-8">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><RiskHeatmap projects={projects || []} /><ResourceLoadMonitor projects={projects || []} /><StrategicVelocity projects={projects || []} /></div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                {huddleTasks.map((t) => (
                  <div key={t.id} className="group bg-white/[0.02] border border-white/5 rounded-xl p-4 transition-all hover:bg-white/[0.04] cursor-pointer flex flex-col gap-4">
                     <div className="flex justify-between items-start"><span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{t.projectName}</span><div className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${t.projectPriority === 'High' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-800 text-slate-500'}`}>{t.projectPriority}</div></div>
                     <h3 className="text-sm font-black text-white leading-tight uppercase truncate">{t.name}</h3>
                     <div className="space-y-1.5"><div className="flex justify-between text-[8px] font-black text-slate-600 uppercase"><span>Progress</span><span>{t.progress}%</span></div><div className="h-1 bg-white/5 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" style={{ width: `${t.progress}%` }} /></div></div>
                  </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  )
}
const ProjectActivityLog = ({ project, allProjects = [] }: any) => {
  const activities = useMemo(() => {
    const list = project ? [...(project?.tasks || []).flatMap((t:any) => (t?.metadata_json?.history || []).map((h:any) => ({ ...h, type: 'TASK', taskName: t?.name }))), ...(project?.metadata_json?.audit_log || []).map((a:any) => ({ ...a, type: 'PROJECT' }))] : allProjects.flatMap((p:any) => [...(p?.tasks || []).flatMap((t:any) => (t?.metadata_json?.history || []).map((h:any) => ({ ...h, type: 'TASK', taskName: t?.name, projectName: p?.name }))), ...(p?.metadata_json?.audit_log || []).map((a:any) => ({ ...a, type: 'PROJECT', projectName: p?.name }))])
    return list.sort((a:any, b:any) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime())
  }, [project, allProjects])
  return (
    <div className="h-full flex flex-col bg-[#0a0c14] overflow-hidden">
       <div className="h-10 border-b border-white/5 flex items-center px-4 justify-between bg-[#0a0c14] z-10"><div className="flex items-center gap-4"><History size={14} className="text-blue-400" /><span className="text-[10px] font-black text-white uppercase tracking-widest">Execution Ledger</span></div></div>
       <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full border-collapse">
             <thead className="sticky top-0 bg-[#0d0f17] z-10 shadow-sm"><tr className="border-b border-white/5 text-left"><th className="px-6 py-2.5 text-[8px] font-black text-slate-600 uppercase tracking-widest w-40">Timestamp</th><th className="px-6 py-2.5 text-[8px] font-black text-slate-600 uppercase tracking-widest w-24">Type</th><th className="px-6 py-2.5 text-[8px] font-black text-slate-600 uppercase tracking-widest">Description</th><th className="px-6 py-2.5 text-[8px] font-black text-slate-600 uppercase tracking-widest w-32">Operator</th></tr></thead>
             <tbody>{activities.map((item: any, i: number) => (<tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors group text-left"><td className="px-6 py-3 whitespace-nowrap"><span className="text-[9px] font-bold text-slate-500 uppercase">{format(new Date(item.timestamp || item.created_at), 'MMM dd, HH:mm:ss')}</span></td><td className="px-6 py-3 text-left"><div className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase text-center border ${item.type === 'TASK' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>{item.type}</div></td><td className="px-6 py-3 text-left"><div className="flex items-center gap-2">{item.taskName && <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">[{item.taskName}]</span>}<span className="text-[10px] font-bold text-slate-300 leading-relaxed uppercase">{item.content || item.action || 'System Update'}</span></div></td><td className="px-6 py-3 text-left"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.author || 'SYSTEM'}</span></td></tr>))}</tbody>
          </table>
       </div>
    </div>
  )
}

const ProjectAdoptionView = ({ project, onUpdate }: any) => {
  const [newLog, setNewLog] = useState(''); const [newScore, setNewLogScore] = useState(5); 
  const logs = useMemo(() => project?.metadata_json?.adoption_logs || [], [project])
  const chartData = useMemo(() => [...logs].reverse().map((l: any) => ({ date: format(new Date(l.timestamp), 'MMM dd'), score: l.score })), [logs])
  const handleAddLog = () => { if (!newLog.trim()) return; const nt = [{ id: Date.now(), content: newLog, score: newScore, author: 'Lead Engineer', timestamp: new Date().toISOString() }, ...logs]; onUpdate({ ...project, metadata_json: { ...project.metadata_json, adoption_logs: nt } }); setNewLog('') }
  return (
    <div className="h-full flex flex-col p-6 space-y-6 bg-[#0a0c14] overflow-y-auto">
       <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 space-y-6">
             <div className="bg-[#0d0f17] border border-white/5 rounded-xl p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sentiment Drift</h4><span className="text-[14px] font-black text-emerald-500">{(logs.reduce((a:number, l:any) => a + l.score, 0) / (logs.length || 1)).toFixed(1)}/10</span></div>
                <div className="h-40 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} /><XAxis dataKey="date" stroke="#475569" fontSize={8} /><YAxis domain={[0, 10]} stroke="#475569" fontSize={8} /><Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>
             </div>
             <div className="space-y-3">{logs.map((log: any) => (<div key={log.id} className="bg-white/[0.01] border border-white/5 rounded-lg p-4 flex gap-4 group"><div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${log.score >= 7 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-400'}`}>{log.score}</div><div className="flex-1 space-y-1"><div className="flex justify-between items-center"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{log.author}</span><span className="text-[8px] font-bold text-slate-700">{format(new Date(log.timestamp), 'MMM dd')}</span></div><p className="text-xs font-bold text-slate-300 italic">"{log.content}"</p></div></div>))}</div>
          </div>
          <div className="col-span-4 bg-[#0d0f17] border border-white/5 rounded-xl p-6 space-y-6 shadow-2xl h-fit">
             <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Add Adoption Signal</h4>
             <input type="range" min="1" max="10" value={newScore} onChange={e => setNewLogScore(parseInt(e.target.value))} className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500" />
             <textarea value={newLog} onChange={e => setNewLog(e.target.value)} className="w-full h-32 bg-black/40 border border-white/5 rounded-lg p-4 text-xs font-bold text-white outline-none focus:border-blue-500/40 resize-none" placeholder="Enter feedback..." />
             <ToolbarButton variant="primary" className="w-full py-3" onClick={handleAddLog}>Commit Signal</ToolbarButton>
          </div>
       </div>
    </div>
  )
}
const WorkbenchView = ({ project, onUpdate, isEditing, devices, services, options }: any) => {
  const [problemStatement, setProblemStatement] = useState(project?.problem_statement || '')
  const [objective, setObjective] = useState(project?.objective || '')
  useEffect(() => { setProblemStatement(project?.problem_statement || ''); setObjective(project?.objective || '') }, [project])
  const handleFieldChange = (field: string, value: any) => { if (project && project[field] !== value) onUpdate({ ...project, [field]: value }) }
  const systemOptions = useMemo(() => options?.filter((o:any) => o.category === 'LogicalSystem') || [], [options])
  const filteredAssets = useMemo(() => (!project?.target_systems?.length ? devices : devices?.filter((d:any) => project.target_systems.includes(d.system))) || [], [devices, project?.target_systems])
  const filteredServices = useMemo(() => (!project?.target_assets?.length ? services : services?.filter((s:any) => project.target_assets.includes(s.device_id))) || [], [services, project?.target_assets])

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32">
       <div className="grid grid-cols-2 gap-12">
          <section className="space-y-4"><div className="flex items-center gap-3 px-1"><AlertTriangle size={14} className="text-amber-500" /><h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Problem Statement</h4></div><div className="bg-black/40 border border-white/5 p-8 rounded-2xl shadow-inner min-h-[160px]">{isEditing ? (<textarea value={problemStatement} onChange={e => setProblemStatement(e.target.value)} onBlur={() => handleFieldChange('problem_statement', problemStatement)} className="w-full h-full bg-transparent border-none outline-none text-base font-bold text-slate-300 italic resize-none" />) : (<p className="text-base font-bold text-slate-400 italic whitespace-pre-wrap">"{project.problem_statement || 'None.'}"</p>)}</div></section>
          <section className="space-y-4"><div className="flex items-center gap-3 px-1"><Target size={14} className="text-emerald-500" /><h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Strategic Objective</h4></div><div className="bg-black/40 border border-white/5 p-8 rounded-2xl shadow-inner min-h-[160px]">{isEditing ? (<textarea value={objective} onChange={e => setObjective(e.target.value)} onBlur={() => handleFieldChange('objective', objective)} className="w-full h-full bg-transparent border-none outline-none text-base font-bold text-slate-300 italic resize-none" />) : (<p className="text-base font-bold text-slate-400 italic whitespace-pre-wrap">"{project.objective || 'None.'}"</p>)}</div></section>
       </div>
       <section className="bg-white/[0.01] border border-white/5 rounded-3xl p-12 space-y-10 shadow-2xl">
          <div className="flex items-center gap-4 border-b border-white/5 pb-6"><Layers size={20} className="text-blue-500" /><h3 className="text-xl font-black text-white uppercase tracking-tighter">Infrastructure Linkages</h3></div>
          <div className="grid grid-cols-3 gap-10">
             {[{ label: 'Logical Systems', key: 'target_systems', options: systemOptions, icon: Globe }, { label: 'Infrastructure Assets', key: 'target_assets', options: filteredAssets, icon: Server }, { label: 'Logic Services', key: 'target_services', options: filteredServices, icon: Binary }].map(group => (
               <div key={group.key} className="space-y-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3">{group.label}</span>
                  <div className="space-y-1 max-h-80 overflow-y-auto bg-black/60 border border-white/5 rounded-2xl p-4 shadow-inner">
                     {group.options.map((o:any) => (
                        <label key={o.value || o.id} className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all ${isEditing ? 'cursor-pointer' : ''} ${(project[group.key] || []).includes(o.value || o.id) ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-lg' : 'hover:bg-white/5 text-slate-600 opacity-60'}`}>
                           {isEditing && (<input type="checkbox" checked={(project[group.key] || []).includes(o.value || o.id)} onChange={e => { const c = project[group.key] || []; const v = o.value || o.id; handleFieldChange(group.key, e.target.checked ? [...c, v] : c.filter((x:any) => x !== v)) }} className="w-4 h-4 rounded bg-black/40 text-blue-600" />)}
                           <span className="text-[10px] font-black uppercase truncate font-inter leading-none">{o.label || o.name}</span>
                        </label>
                     ))}
                  </div>
               </div>
             ))}
          </div>
       </section>
    </div>
  )
}

export const ProjectForm = ({ initialData, onSave, isSaving, onCancel, devices, services, options }: any) => {
  const [formData, setFormData] = useState({ name: '', type: 'Strategic', status: 'Planning', priority: 'Medium', owner: '', start_date: new Date().toISOString(), end_date: addDays(new Date(), 90).toISOString(), target_systems: [], target_assets: [], target_services: [], ...initialData })
  const years = Array.from({ length: 11 }, (_, i) => 2024 + i); const months = [{ v: 0, l: 'JAN' }, { v: 1, l: 'FEB' }, { v: 2, l: 'MAR' }, { v: 3, l: 'APR' }, { v: 4, l: 'MAY' }, { v: 5, l: 'JUN' }, { v: 6, l: 'JUL' }, { v: 7, l: 'AUG' }, { v: 8, l: 'SEP' }, { v: 9, l: 'OCT' }, { v: 10, l: 'NOV' }, { v: 11, l: 'DEC' }]
  const handleDateChange = (type: 'start' | 'end', part: 'month' | 'year', val: number) => { const d = new Date(formData[`${type}_date`] || new Date()); d.setDate(1); if (part === 'month') d.setMonth(val); else d.setFullYear(val); setFormData({ ...formData, [`${type}_date`]: d.toISOString() }) }
  const startDate = new Date(formData.start_date || new Date()); const endDate = new Date(formData.end_date || new Date())
  const systemOptions = useMemo(() => options?.filter((o:any) => o.category === 'LogicalSystem') || [], [options])
  const filteredAssets = useMemo(() => (!formData.target_systems?.length ? devices : devices?.filter((d:any) => formData.target_systems.includes(d.system))) || [], [devices, formData.target_systems])
  const filteredServices = useMemo(() => (!formData.target_assets?.length ? services : services?.filter((s:any) => formData.target_assets.includes(s.device_id))) || [], [services, formData.target_assets])

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-8 bg-[#0a0c14]/50 rounded-lg border border-white/5 shadow-2xl mt-4">
       <div className="flex items-center gap-3"><Briefcase size={20} className="text-blue-400" /><h3 className="text-lg font-bold uppercase text-white tracking-tighter">Project Configuration</h3></div>
       <div className="grid grid-cols-2 gap-8">
          <div className="space-y-5">
             <div><label className="text-[9px] font-bold text-slate-600 uppercase mb-1.5 block">Project Identifier</label><input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500" placeholder="Name..."/></div>
             <div className="grid grid-cols-2 gap-4"><StyledSelect label="Priority" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} options={PROJECT_PRIORITIES} /><StyledSelect label="Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={PROJECT_STATUSES} /></div>
             <div className="grid grid-cols-2 gap-2 mt-4"><div className="space-y-2"><label className="text-[8px] font-bold text-slate-500 uppercase">Start</label><div className="flex gap-2"><select value={startDate.getMonth()} onChange={e => handleDateChange('start', 'month', parseInt(e.target.value))} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold text-white">{months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}</select><select value={startDate.getFullYear()} onChange={e => handleDateChange('start', 'year', parseInt(e.target.value))} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold text-white">{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div></div><div className="space-y-2"><label className="text-[8px] font-bold text-slate-500 uppercase">End</label><div className="flex gap-2"><select value={endDate.getMonth()} onChange={e => handleDateChange('end', 'month', parseInt(e.target.value))} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold text-white">{months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}</select><select value={endDate.getFullYear()} onChange={e => handleDateChange('end', 'year', parseInt(e.target.value))} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold text-white">{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div></div></div>
          </div>
          <div className="space-y-5">
             <div className="bg-white/[0.02] p-5 rounded-lg border border-white/5 space-y-4">
                <h4 className="text-[9px] font-bold text-blue-400 uppercase mb-1 flex items-center gap-2"><Layers size={12} /> Initial Linkages</h4>
                <div className="grid grid-cols-3 gap-2">
                   {[{ label: 'Systems', key: 'target_systems', options: systemOptions }, { label: 'Assets', key: 'target_assets', options: filteredAssets }, { label: 'Services', key: 'target_services', options: filteredServices }].map(group => (
                     <div key={group.key} className="space-y-2">
                        <span className="text-[8px] font-bold text-slate-600 uppercase">{group.label}</span>
                        <div className="max-h-40 overflow-y-auto bg-black/40 rounded border border-white/5 p-1 custom-scrollbar">
                           {group.options.map((o:any) => (
                              <label key={o.value || o.id} className="flex items-center gap-1.5 px-2 py-1 hover:bg-white/5 rounded cursor-pointer">
                                 <input type="checkbox" checked={(formData[group.key] || []).includes(o.value || o.id)} onChange={e => { const c = formData[group.key] || []; const v = o.value || o.id; setFormData({ ...formData, [group.key]: e.target.checked ? [...c, v] : c.filter((x:any) => x !== v) }) }} className="w-3 h-3 rounded bg-black/40 text-blue-600" />
                                 <span className="text-[9px] font-bold text-slate-400 truncate uppercase">{o.label || o.name}</span>
                              </label>
                           ))}
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
       </div>
       <div className="flex gap-4 pt-4"><button onClick={onCancel} className="flex-1 py-3 bg-white/5 text-slate-600 rounded-lg text-[10px] font-bold uppercase transition-all">Abort</button><button disabled={isSaving || !formData.name} onClick={() => onSave(formData)} className="flex-[2] py-3 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase shadow-lg shadow-blue-500/20">{isSaving ? 'Synchronizing...' : 'Commit Project'}</button></div>
    </div>
  )
}


export default function Projects() {
  const queryClient = useQueryClient(); const [searchParams, setSearchParams] = useSearchParams(); const idParam = searchParams.get('id')
  const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: () => apiFetch('/api/v1/projects').then(r => r.json()) })
  const mutation = useMutation({ mutationFn: async ({ data }: any) => apiFetch(data.id ? `/api/v1/projects/${data.id}` : '/api/v1/projects', { method: data.id ? 'PUT' : 'POST', body: JSON.stringify(data) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }) })
  const [selectedProjectId, setSelectedProjectId] = useState<number | 'HUDDLE' | null>('HUDDLE')
  const [activeTab, setActiveTab] = useState<'WORKSPACE' | 'GANTT' | 'ACTIVITY' | 'ADOPTION'>('WORKSPACE')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); const [railWidth, setRailWidth] = useState(320)
  const syncSelectedProject = useCallback((id: number | 'HUDDLE' | null) => { setSelectedProjectId(id); const nextParams = new URLSearchParams(searchParams); if (typeof id === 'number') nextParams.set('id', String(id)); else nextParams.delete('id'); setSearchParams(nextParams, { replace: true }) }, [searchParams, setSearchParams])
  useEffect(() => { if (idParam && projects) { const tid = parseInt(idParam); if (projects.find((p:any)=>p.id===tid)) setSelectedProjectId(tid) } }, [idParam, projects])
  const selectedProject = useMemo(() => projects?.find((p:any) => String(p.id) == String(selectedProjectId)), [projects, selectedProjectId])
  if (isLoading && !projects) return <div className="h-full flex items-center justify-center bg-[#0a0c14]"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>
  return (
    <div className="h-full flex flex-col bg-[#0a0c14] overflow-hidden">
       <ProjectHUD project={selectedProject} onEdit={()=>{}} onSave={()=>{}} onCancel={()=>{}} onDelete={()=>{}} onSettings={()=>{}} />
       <div className="h-12 border-b border-white/5 bg-[#0a0c14] flex items-center px-4 justify-between shrink-0"><ToolbarSegmented value={activeTab} onChange={(val) => setActiveTab(val as any)} options={[{ label: 'Details', value: 'WORKSPACE' }, { label: 'Gantt', value: 'GANTT' }, { label: 'Log', value: 'ACTIVITY' }, { label: 'Adoption', value: 'ADOPTION' }]} /></div>
       <div className="flex-1 flex overflow-hidden">
          <ProjectRail projects={projects || []} selectedId={selectedProjectId} onSelect={syncSelectedProject} width={railWidth} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
          <div className="flex-1 relative overflow-hidden bg-[#0c0e16]">
             <AnimatePresence mode="wait">
                {selectedProjectId === 'HUDDLE' ? <motion.div key="huddle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full"><OperationsDashboardView projects={projects} onSelectProject={syncSelectedProject} /></motion.div> : (
                   <>
                     {!selectedProject ? <div className="h-full flex items-center justify-center bg-[#0a0c14] text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] italic font-inter">Select a project</div> : (
                          <>
                            {activeTab === 'WORKSPACE' && <motion.div key="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto bg-[#0a0c14]/50"><WorkbenchView project={selectedProject} /></motion.div>}
                            {activeTab === 'GANTT' && <motion.div key="gantt" className="h-full"><PrecisionGantt project={selectedProject} /></motion.div>}
                            {activeTab === 'ACTIVITY' && <motion.div key="activity" className="h-full"><ProjectActivityLog project={selectedProject} /></motion.div>}
                            {activeTab === 'ADOPTION' && <motion.div key="adoption" className="h-full overflow-y-auto"><ProjectAdoptionView project={selectedProject} /></motion.div>}
                          </>
                        )}
                   </>
                )}
             </AnimatePresence>
          </div>
       </div>
       <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }`}</style>
    </div>
  )
}
