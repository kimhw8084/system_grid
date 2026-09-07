import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, History, Megaphone, Plus, RefreshCcw, ShieldCheck } from 'lucide-react'
import { apiFetch } from '../api/apiClient'
import './ProjectsCommunication.css'

type CommunicationRoute = 'updates' | 'resources' | 'reports'

export function shouldUseProjectsCommunication(pathname: string): { projectId: string; route: CommunicationRoute } | null {
  const match = pathname.match(/^\/projects\/([^/]+)\/(updates|resources|reports)\/?$/)
  return match ? { projectId: decodeURIComponent(match[1]), route: match[2] as CommunicationRoute } : null
}

const uuid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
const jsonOrThrow = async (response: Response) => { if (!response.ok) throw new Error(await response.text()); return response.json() }

function command(projectId: string, type: string, expected: Record<string, unknown>, payload: Record<string, unknown>) {
  const commandId = uuid()
  return apiFetch(`/api/v2/projects/${encodeURIComponent(projectId)}/commands`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': commandId }, body: JSON.stringify({ command_id: commandId, type, expected, payload }) }).then(jsonOrThrow)
}

function Header({ projectId, active }: { projectId: string; active: CommunicationRoute }) {
  const links = [['home', 'Home'], ['work', 'Work'], ['plan', 'Plan'], ['timeline', 'Timeline'], ['updates', 'Updates'], ['reports', 'Reports']] as const
  return <header className="p08-header"><div><p className="p05-eyebrow">Projects · evidence communication</p><h1>{active === 'updates' ? 'Updates' : active === 'resources' ? 'Resources' : 'Reports'}</h1></div><nav aria-label="Project navigation">{links.map(([key, label]) => <a key={key} href={`/projects/${encodeURIComponent(projectId)}/${key}`} aria-current={key === active ? 'page' : undefined}>{label}</a>)}<a href={`/projects/${encodeURIComponent(projectId)}/resources`} aria-current={active === 'resources' ? 'page' : undefined}>Resources</a></nav></header>
}

function State({ message, error = false }: { message: string; error?: boolean }) { return <p className={error ? 'p08-error' : 'p08-state'} role={error ? 'alert' : undefined}>{message}</p> }

function UpdatesView({ projectId, project, refresh }: { projectId: string; project: any; refresh: () => void }) {
  const [commentary, setCommentary] = useState('')
  const [draftDirty, setDraftDirty] = useState(false)
  const query = useQuery({ queryKey: ['p08-updates', projectId], queryFn: () => apiFetch(`/api/v2/projects/${encodeURIComponent(projectId)}/updates?history=true`).then(jsonOrThrow) })
  const activity = useQuery({ queryKey: ['p08-activity', projectId], queryFn: () => apiFetch(`/api/v2/projects/${encodeURIComponent(projectId)}/activity?limit=40`).then(jsonOrThrow) })
  const draft = useMemo(() => (query.data?.items || []).find((item: any) => item.state === 'Draft'), [query.data])
  const create = useMutation({ mutationFn: () => { const id = uuid(); return apiFetch(`/api/v2/projects/${encodeURIComponent(projectId)}/updates/draft`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': id }, body: JSON.stringify({ period_start: new Date().getFullYear() + '-01-01', period_end: new Date().getFullYear() + '-12-31' }) }).then(jsonOrThrow) }, onSuccess: refresh })
  const save = useMutation({ mutationFn: () => command(projectId, 'update.autosave', { project_revision: project.revision }, { draft_id: draft.id, content: { ...(draft.content || {}), commentary }, health_assessment: draft.health_assessment || undefined }), onSuccess: () => { setDraftDirty(false); refresh() } })
  const publish = useMutation({ mutationFn: () => command(projectId, 'update.publish', { project_revision: project.revision }, { update_id: draft.id }), onSuccess: refresh })
  useEffect(() => { setCommentary(draft?.content?.commentary || ''); setDraftDirty(false) }, [draft?.id])
  useEffect(() => {
    if (!draft || !draftDirty || save.isPending) return
    const timer = window.setTimeout(() => save.mutate(), 800)
    return () => window.clearTimeout(timer)
  }, [commentary, draftDirty, draft?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (query.isPending) return <State message="Loading persisted updates…" />
  if (query.isError) return <State error message="Updates unavailable. Retry to reconnect to the canonical project history." />
  return <div className="p08-grid"><section className="p08-card p08-draft" aria-labelledby="draft-title"><div className="p08-card-heading"><div><p className="p05-eyebrow">AI disabled by default</p><h2 id="draft-title">Deterministic draft</h2><p>Facts come from persisted project events and carry their source revisions. A human always publishes.</p></div><button className="p05-button" onClick={() => create.mutate()} disabled={create.isPending}><Plus size={16} /> Draft from facts</button></div>{draft ? <><dl className="p08-meta"><div><dt>Period</dt><dd>{draft.period_start} → {draft.period_end}</dd></div><div><dt>Source revision</dt><dd>{draft.source_revisions?.project_revision || 'Unknown'}</dd></div><div><dt>Computed health</dt><dd>{draft.content?.computed_health?.level || 'Unknown'}</dd></div></dl><div className="p08-fact-sections">{Object.entries(draft.content?.sections || {}).map(([section, values]: [string, any]) => <section key={section}><h3>{section}</h3><ul>{(values || []).map((item: any, index: number) => <li key={`${section}-${index}`}>{item.text}<small>Source: {(item.source_ids || []).join(', ') || 'none'}</small></li>)}</ul></section>)}</div><label className="p08-editor"><span>Human commentary {draftDirty ? '· saving…' : ''}</span><textarea value={commentary} onChange={(event) => { setCommentary(event.target.value); setDraftDirty(true) }} placeholder="Optional narrative; it does not change persisted facts." /></label><div className="p08-actions"><button className="p05-button" onClick={() => save.mutate()} disabled={save.isPending}>Save draft</button><button className="p05-button p08-primary" onClick={() => publish.mutate()} disabled={publish.isPending}>Publish update</button></div></> : <State message="No draft exists. Generate one from persisted facts to begin." />}</section><section className="p08-card" aria-labelledby="history-title"><div className="p08-card-heading"><div><p className="p05-eyebrow">Immutable history</p><h2 id="history-title"><History size={18} /> Published updates</h2></div><button className="p08-icon" aria-label="Refresh updates" onClick={refresh}><RefreshCcw size={16} /></button></div>{(query.data?.items || []).filter((item: any) => item.state !== 'Draft').map((item: any) => <article className="p08-history-row" key={item.id}><strong>{item.content?.title || 'Project update'}</strong><span>{item.state} · {item.published_at || item.withdrawn_at || 'Not published'}</span><small>Source project revision {item.source_revisions?.project_revision || 'unknown'} · later edits do not rewrite this snapshot.</small></article>)}{!(query.data?.items || []).some((item: any) => item.state !== 'Draft') ? <State message="No published update yet." /> : null}</section><section className="p08-card" aria-labelledby="activity-title"><p className="p05-eyebrow">Durable evidence</p><h2 id="activity-title">Activity</h2>{activity.isPending ? <State message="Loading activity…" /> : activity.isError ? <State error message="Activity unavailable." /> : (activity.data?.items || []).slice(0, 12).map((item: any) => <article className="p08-history-row" key={item.id}><strong>{item.summary}</strong><span>{item.category} · {item.actor_id} · {item.timestamp}</span></article>)}</section></div>
}

function ResourcesView({ projectId, project, refresh }: { projectId: string; project: any; refresh: () => void }) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('General note')
  const [content, setContent] = useState('')
  const [upload, setUpload] = useState<Record<string, unknown> | null>(null)
  const query = useQuery({ queryKey: ['p08-resources', projectId], queryFn: () => apiFetch(`/api/v2/projects/${encodeURIComponent(projectId)}/resources`).then(jsonOrThrow) })
  const save = useMutation({ mutationFn: () => command(projectId, 'resource.save', { project_revision: project.revision }, { title, resource_kind: upload ? 'Uploaded file' : kind, content, upload: upload || undefined, pinned: false }), onSuccess: () => { setTitle(''); setContent(''); setUpload(null); refresh() } })
  if (query.isPending) return <State message="Loading authorized resources…" />
  if (query.isError) return <State error message="Resources unavailable. Retry to preserve the project story." />
  return <div className="p08-grid"><section className="p08-card" aria-labelledby="resource-add-title"><p className="p05-eyebrow">Project library</p><h2 id="resource-add-title">Add a native resource</h2><p>Markdown is sanitized on the server. Files remain Pending until a clean scan is recorded.</p><div className="p08-resource-form"><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} /></label><label>Type<select value={kind} onChange={(event) => setKind(event.target.value)}>{['General note', 'Brief supplement', 'Specification', 'Runbook', 'Test evidence', 'Design decision', 'External link'].map((value) => <option key={value}>{value}</option>)}</select></label><label>Sanitized content<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write Markdown; executable markup is rejected." /></label><label>Optional file<input type="file" accept=".pdf,.png,.jpg,.jpeg,.svg,.txt,.md,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setUpload({ filename: file.name, mime_type: file.type || 'text/plain', size_bytes: file.size, content_base64: String(reader.result).split(',')[1] || '' }); reader.readAsDataURL(file) }} />{upload ? <small>Selected file will enter Pending scanning.</small> : null}</label><button className="p05-button p08-primary" onClick={() => save.mutate()} disabled={save.isPending || !title.trim()}><Plus size={16} /> Save resource</button></div></section><section className="p08-card" aria-labelledby="resource-list-title"><div className="p08-card-heading"><div><p className="p05-eyebrow">Authorized library</p><h2 id="resource-list-title"><FileText size={18} /> Resources</h2></div><div className="p08-export-links"><a href={`/api/v2/projects/${encodeURIComponent(projectId)}/resources/export?format=markdown`}>Markdown</a><a href={`/api/v2/projects/${encodeURIComponent(projectId)}/resources/export?format=csv`}>CSV</a><a href={`/api/v2/projects/${encodeURIComponent(projectId)}/resources/export?format=json`}>JSON</a></div></div>{(query.data?.items || []).map((item: any) => <article className="p08-resource-row" key={item.id}><div><strong>{item.title}</strong><span>{item.resource_kind} · revision {item.revision}</span></div><small><ShieldCheck size={14} /> {item.scan_state} · {item.pinned ? 'Pinned' : 'Not pinned'}</small><p>{item.content || (item.scan_state === 'Pending' ? 'File scanning is in progress.' : 'No inline content.')}</p><a href={`/projects/${encodeURIComponent(projectId)}/resources?resource=${encodeURIComponent(item.id)}`}>View version history</a></article>)}{!(query.data?.items || []).length ? <State message="No authorized resources yet." /> : null}</section></div>
}

function ReportsView({ projectId, project }: { projectId: string; project: any }) {
  const queryClient = useQueryClient()
  const reports = useQuery({ queryKey: ['p08-reports', projectId], queryFn: () => apiFetch(`/api/v2/projects/${encodeURIComponent(projectId)}/reports`).then(jsonOrThrow) })
  const capture = useMutation({ mutationFn: (report_type: string) => { const id = uuid(); return apiFetch(`/api/v2/projects/${encodeURIComponent(projectId)}/reports/capture`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': id }, body: JSON.stringify({ report_type, period_start: new Date().getFullYear() + '-01-01', period_end: new Date().getFullYear() + '-12-31' }) }).then(jsonOrThrow) }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['p08-reports', projectId] }) })
  return <section className="p08-card" aria-labelledby="reports-title"><div className="p08-card-heading"><div><p className="p05-eyebrow">Immutable snapshots</p><h2 id="reports-title"><Megaphone size={18} /> Reports from canonical state</h2><p>Reports include source revisions, access labels, and a creation time. They never edit project truth.</p></div></div><div className="p08-report-actions">{['Stakeholder summary', 'Delivery acceptance', 'Outcome review'].map((type) => <button className="p05-button" key={type} onClick={() => capture.mutate(type)} disabled={capture.isPending}>Capture {type}</button>)}</div><div className="p08-report-list">{(reports.data?.items || []).map((report: any) => <article key={report.id}><strong>{report.report_type}</strong><span>Revision {report.project_revision} · {report.created_at}</span><a href={`/api/v2/projects/${encodeURIComponent(projectId)}/reports/${report.id}/export?format=html`}>HTML</a><a href={`/api/v2/projects/${encodeURIComponent(projectId)}/reports/${report.id}/export?format=pdf`}>PDF</a><a href={`/api/v2/projects/${encodeURIComponent(projectId)}/reports/${report.id}/export?format=json`}>JSON</a></article>)}{!(reports.data?.items || []).length ? <State message="No report snapshots captured yet." /> : null}</div></section>
}

export default function ProjectsCommunication() {
  const location = useLocation()
  const navigate = useNavigate()
  const route = shouldUseProjectsCommunication(location.pathname)
  const projectId = route?.projectId || ''
  const project = useQuery({ queryKey: ['p08-project', projectId], queryFn: () => apiFetch(`/api/v2/projects/${encodeURIComponent(projectId)}`).then(jsonOrThrow), enabled: Boolean(projectId) })
  const queryClient = useQueryClient()
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['p08-project', projectId] }); queryClient.invalidateQueries({ queryKey: ['p08-updates', projectId] }); queryClient.invalidateQueries({ queryKey: ['p08-resources', projectId] }); queryClient.invalidateQueries({ queryKey: ['p08-reports', projectId] }) }
  if (!route) return null
  if (project.isPending) return <main className="p08-page"><State message="Loading project communication…" /></main>
  if (project.isError) return <main className="p08-page"><State error message="Project communication is unavailable." /></main>
  return <main className="p08-page" data-p08-communication="true"><Header projectId={projectId} active={route.route} />{route.route === 'updates' ? <UpdatesView projectId={projectId} project={project.data} refresh={refresh} /> : route.route === 'resources' ? <ResourcesView projectId={projectId} project={project.data} refresh={refresh} /> : <ReportsView projectId={projectId} project={project.data} />}<button className="p08-back" onClick={() => navigate(`/projects/${encodeURIComponent(projectId)}/home`)}>Back to Project Home</button></main>
}
