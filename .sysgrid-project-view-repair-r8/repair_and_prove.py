#!/usr/bin/env python3
from __future__ import annotations
import datetime as dt
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile

BASE_COMMIT = "66244b997a70b85e6e887870c96db958f3f0d22d"
BASE_TREE = "0e736196233c7ee98ad91918ab09f07c01613bf0"
GITLINK_PATH = "SysGrid"
GITLINK_OID = "445c225a3dec7c359f8ff0b09934716ee2d91b6e"
RESULT_NAME = "SysGrid-Project-View-Perfection-Repair-8-RESULT.zip"

FILES = {
    "frontend/src/components/ProjectsGolden.tsx": "fc53ae5393ebe860694027a8a306a8b72c7ace56",
    "frontend/src/components/ProjectsWorkspaceLayout.tsx": "87a984c659c80f9f03b91bccb77a1cdafbdb5dbd",
    "frontend/src/components/ProjectsVisualRepair.css": "b2bd92bb77d3d60fffad27a644b41209feec676b",
    "frontend/tests/projects-visual-repair.spec.ts": "9e104744565bb6ef6b11b1b4243ac45a14cbe15c",
}

def run(args, cwd, *, log=None, env=None, check=True):
    started = time.time()
    p = subprocess.run(args, cwd=str(cwd), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env)
    elapsed = round((time.time() - started) * 1000)
    if log:
        pathlib.Path(log).write_text(p.stdout or "", encoding="utf-8")
    if check and p.returncode:
        raise RuntimeError(f"command failed ({p.returncode}): {' '.join(args)}\n{(p.stdout or '')[-5000:]}")
    return {"args": args, "exit_code": p.returncode, "duration_ms": elapsed, "output": p.stdout or ""}

def git(repo, *args, check=True):
    return run(["git", *args], repo, check=check)

def blob(repo, rel):
    return git(repo, "hash-object", "--", rel)["output"].strip()

def blob_bytes(data: bytes) -> str:
    h = hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()

def replace_once(data: bytes, old: bytes, new: bytes, label: str) -> bytes:
    count = data.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one preimage occurrence, found {count}")
    return data.replace(old, new, 1)

def apply_projects_golden(data: bytes) -> bytes:
    data = replace_once(
        data,
        b"import { canonicalTaskStatus } from './ProjectsVisualRepair.geometry'\n",
        b"import { canonicalTaskStatus, readableProjectDate } from './ProjectsVisualRepair.geometry'\n",
        "golden-readable-date-import",
    )
    anchor = b"  } catch { return {} }\n}\n\nfunction MetricCard"
    helper = (
        b"  } catch { return {} }\n}\n\n"
        b"const readProjectSavedViews = async (url: string) => {\n"
        b"  try {\n"
        b"    const response = await apiFetch(url)\n"
        b"    return response.json()\n"
        b"  } catch (error: any) {\n"
        b"    const message = String(error?.message || '').trim()\n"
        b"    const status = Number(error?.status || 0)\n"
        b"    if ([400, 404, 422].includes(status) && /^Unknown workspace key\\.?$/i.test(message)) return []\n"
        b"    throw error\n"
        b"  }\n"
        b"}\n\n"
        b"function MetricCard"
    )
    data = replace_once(data, anchor, helper, "golden-saved-view-capability-helper")

    personal_old = (
        b"const { data: personalSavedViewPayload, isError: isPersonalSavedViewError, isFetched: isPersonalSavedViewFetched } = "
        b"useQuery({ queryKey: PROJECT_PERSONAL_SAVED_VIEW_QUERY_KEY, queryFn: async () => { const response = await "
        b"apiFetch('/api/v1/workspaces/projects/views'); return response.json() }, staleTime: 30_000, retry: 1 })"
    )
    personal_new = (
        b"const { data: personalSavedViewPayload, isError: isPersonalSavedViewError, isFetched: isPersonalSavedViewFetched } = "
        b"useQuery({ queryKey: PROJECT_PERSONAL_SAVED_VIEW_QUERY_KEY, queryFn: () => readProjectSavedViews('/api/v1/workspaces/projects/views'), "
        b"staleTime: 30_000, retry: 1 })"
    )
    data = replace_once(data, personal_old, personal_new, "golden-personal-saved-view-read")

    team_old = (
        b"const { data: teamSavedViewPayload, isError: isTeamSavedViewError, isFetched: isTeamSavedViewFetched } = useQuery({ "
        b"queryKey: currentTeamId ? projectTeamSavedViewQueryKey(currentTeamId) : ['workspace-saved-views', 'projects', 'team', 'none'], "
        b"enabled: Boolean(currentTeamId), queryFn: async () => { const response = await "
        b"apiFetch(`/api/v1/workspaces/projects/views?scope=team&team_id=${currentTeamId}`); return response.json() }, staleTime: 30_000, retry: 1 })"
    )
    team_new = (
        b"const { data: teamSavedViewPayload, isError: isTeamSavedViewError, isFetched: isTeamSavedViewFetched } = useQuery({ "
        b"queryKey: currentTeamId ? projectTeamSavedViewQueryKey(currentTeamId) : ['workspace-saved-views', 'projects', 'team', 'none'], "
        b"enabled: Boolean(currentTeamId), queryFn: () => readProjectSavedViews(`/api/v1/workspaces/projects/views?scope=team&team_id=${currentTeamId}`), "
        b"staleTime: 30_000, retry: 1 })"
    )
    data = replace_once(data, team_old, team_new, "golden-team-saved-view-read")

    data = replace_once(
        data,
        b"function ProjectOverview({ project, onTask, onTimeline, onUpdate, onMeasureOutcome }: any) {\n",
        b"function ProjectOverview({ project, onTask, onTimeline, onUpdate, onEditProject, onMeasureOutcome }: any) {\n",
        "golden-overview-signature",
    )
    overview_anchor = (
        b"  const measurement = outcome.measurement\n"
        b"  return <div className=\"min-h-0 flex-1 overflow-y-auto custom-scrollbar\" data-project-overview=\"true\">\n"
        b"    <section className=\"mb-3 rounded-lg border border-white/5 bg-black/20 p-4\" data-project-outcome-realization=\"true\">"
    )
    overview_new = (
        b"  const measurement = outcome.measurement\n"
        b"  const progress = getProjectExecutionProgress(project)\n"
        b"  const owner = project.owner || (Array.isArray(project.owners) ? project.owners.join(', ') : '') || 'Unassigned'\n"
        b"  const expectedOutcomes = Array.isArray(project.expected_outcomes) ? project.expected_outcomes.filter(Boolean) : []\n"
        b"  return <div className=\"min-h-0 flex-1 overflow-y-auto custom-scrollbar\" data-project-overview=\"true\">\n"
        b"    <section className=\"sg-project-cover mb-3 rounded-xl border p-5\" data-project-cover=\"true\" aria-label=\"Project information\">\n"
        b"      <div className=\"flex flex-wrap items-start justify-between gap-4\"><div className=\"min-w-0 flex-1\"><p className=\"text-[10px] font-black uppercase tracking-[0.16em] text-blue-300\">Project information</p><h1 className=\"mt-1 text-2xl font-black text-white\">{project.name}</h1><p className=\"mt-2 max-w-5xl text-[13px] leading-5 text-slate-300\">{project.objective || project.problem_statement || 'No project objective recorded.'}</p></div><div className=\"flex flex-wrap items-center gap-2\"><StatusPill value={project.status} /><WorkspaceSectionBadge>{project.priority || 'Medium'} priority</WorkspaceSectionBadge></div></div>\n"
        b"      <dl className=\"mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6\" data-project-cover-fields=\"true\"><div><dt>Owner</dt><dd>{owner}</dd></div><div><dt>Status</dt><dd>{project.status || 'Not set'}</dd></div><div><dt>Start</dt><dd>{readableProjectDate(project.start_date)}</dd></div><div><dt>Finish</dt><dd>{readableProjectDate(project.end_date || project.target_date)}</dd></div><div><dt>Progress</dt><dd>{progress}%</dd></div><div><dt>Priority</dt><dd>{project.priority || 'Medium'}</dd></div></dl>\n"
        b"      <div className=\"mt-4 flex flex-wrap items-start justify-between gap-3 border-t border-white/10 pt-4\"><div className=\"min-w-0 flex-1\"><p className=\"text-[10px] font-black uppercase tracking-widest text-slate-500\">Expected outcomes</p><p className=\"mt-1 text-[12px] text-slate-300\">{expectedOutcomes.length ? expectedOutcomes.join(' \xc2\xb7 ') : 'No expected outcomes recorded.'}</p></div><div className=\"flex flex-wrap gap-2\"><ToolbarButton variant=\"secondary\" onClick={onEditProject}>Edit project</ToolbarButton><ToolbarButton variant=\"quiet\" onClick={onMeasureOutcome}><Gauge size={12} /> Measure outcome</ToolbarButton><ToolbarButton variant=\"quiet\" onClick={onTimeline}>Open Timeline <ArrowRight size={11} /></ToolbarButton></div></div>\n"
        b"    </section>\n"
        b"    <section className=\"mb-3 rounded-lg border border-white/5 bg-black/20 p-4\" data-project-outcome-realization=\"true\">"
    )
    data = replace_once(data, overview_anchor, overview_new, "golden-project-cover")

    overview_call_old = (
        b"view === 'overview' ? <ProjectOverview project={selectedProject} onTask={(taskId: any) => openTask(selectedProject.id, taskId)} "
        b"onTimeline={() => setView('timeline')} onUpdate={() => setView('updates')} onMeasureOutcome={() => setOutcomeMeasurementOpen(true)} />"
    )
    overview_call_new = (
        b"view === 'overview' ? <ProjectOverview project={selectedProject} onTask={(taskId: any) => openTask(selectedProject.id, taskId)} "
        b"onTimeline={() => setView('timeline')} onUpdate={() => setView('updates')} onEditProject={() => setIsProjectEditOpen(true)} "
        b"onMeasureOutcome={() => setOutcomeMeasurementOpen(true)} />"
    )
    data = replace_once(data, overview_call_old, overview_call_new, "golden-overview-edit-binding")

    data = replace_once(
        data,
        b"<div className=\"flex min-h-0 flex-1 gap-3\" data-project-unified-shell=\"true\"><ProjectWorkbenchRail",
        b"<div className=\"flex min-h-0 flex-1 gap-3\" data-project-unified-shell=\"true\" data-project-member-view={projectView ? 'true' : 'false'}>{!projectView ? <ProjectWorkbenchRail",
        "golden-member-rail-open",
    )
    data = replace_once(
        data,
        b"portfolioSelected={view === 'portfolio'} /><main className=\"flex min-w-0 min-h-0 flex-1 flex-col gap-3\">",
        b"portfolioSelected={view === 'portfolio'} /> : null}<main className=\"flex min-w-0 min-h-0 flex-1 flex-col gap-3\">",
        "golden-member-rail-close",
    )
    return data

def apply_workspace_layout(data: bytes) -> bytes:
    old = '''export function ProjectsCompactHeader({ project, onEditProject, onMeasureOutcome, onJump, onQuickAction, details }: any) {
  const [expanded, setExpanded] = useState(false)
  if (!project) return null
  const tasks = Array.isArray(project.tasks) ? project.tasks : []
  const done = tasks.filter((task: any) => canonicalTaskStatus(task.status) === 'Completed').length
  const owner = project.owner || (Array.isArray(project.owners) ? project.owners.join(', ') : '') || 'Unassigned'
  return <section className="sg-project-context" data-project-workbench-header="true">
    <div className="sg-context-line"><div className="sg-context-title"><h2 title={project.name}>{project.name}</h2><span>{project.status || 'No status'} · {done}/{tasks.length} tasks complete</span></div>
      <div className="sg-context-actions"><button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? 'Less' : 'Project info'}</button><details><summary>Add / edit</summary><div className="sg-context-menu">
        <button onClick={() => onQuickAction?.('task')}>Add task</button><button onClick={() => onQuickAction?.('update')}>Write update</button><button onClick={() => onQuickAction?.('material')}>Add material</button><button onClick={() => onQuickAction?.('report')}>Capture report</button><button onClick={() => onQuickAction?.('governance')}>Governance</button><button onClick={onEditProject}>Edit project</button><button onClick={onMeasureOutcome}>Measure outcomes</button>
      </div></details></div>
    </div>
    {expanded && <div className="sg-context-expanded">{details || <><p>{project.objective || project.problem_statement || 'No objective recorded.'}</p><span>Owner: {owner}</span><span>Finish: {readableProjectDate(project.end_date || project.target_date)}</span><button onClick={() => onJump?.('overview')}>Open overview</button></>}</div>}
  </section>
}
'''.encode('utf-8')
    new = '''export function ProjectsCompactHeader({ project, onEditProject, onMeasureOutcome, onJump, onQuickAction, details }: any) {
  if (!project) return null
  const tasks = Array.isArray(project.tasks) ? project.tasks : []
  const done = tasks.filter((task: any) => canonicalTaskStatus(task.status) === 'Completed').length
  const owner = project.owner || (Array.isArray(project.owners) ? project.owners.join(', ') : '') || 'Unassigned'
  const finish = readableProjectDate(project.end_date || project.target_date)
  return <section className="sg-project-context" data-project-workbench-header="true">
    <div className="sg-context-line"><div className="sg-context-title"><h2 title={project.name}>{project.name}</h2><span>{project.status || 'No status'} · {done}/{tasks.length} tasks complete · {owner} · Finish {finish}</span></div>
      <div className="sg-context-actions"><button onClick={() => onJump?.('overview')}>Overview</button><details><summary>Add / edit</summary><div className="sg-context-menu">
        <button onClick={() => onQuickAction?.('task')}>Add task</button><button onClick={() => onQuickAction?.('update')}>Write update</button><button onClick={() => onQuickAction?.('material')}>Add material</button><button onClick={() => onQuickAction?.('report')}>Capture report</button><button onClick={() => onQuickAction?.('governance')}>Governance</button><button onClick={onEditProject}>Edit project</button><button onClick={onMeasureOutcome}>Measure outcomes</button>
      </div></details></div>
    </div>
  </section>
}
'''.encode('utf-8')
    return replace_once(data, old, new, "layout-visible-project-context")

def apply_css(data: bytes) -> bytes:
    old_root = b".sg-gantt,.sg-projects-frame,.sg-dialog-shade { --sg-bg:var(--projects-surface-work,#101827); --sg-raised:var(--projects-surface-shell,#0e1624); --sg-line:var(--projects-border-subtle,#29354a); --sg-text:var(--text-primary,#e2e8f0); --sg-muted:var(--projects-text-muted,#a8b4c7); --sg-accent:#60a5fa; color:var(--sg-text); font-family:Inter,ui-sans-serif,system-ui,sans-serif; font-size:13px; line-height:1.4 }\n"
    new_root = b".sg-gantt,.sg-projects-frame,.sg-dialog-shade { --sg-page:var(--bg-primary,#1a1b26); --sg-bg:color-mix(in srgb,var(--sg-page) 94%,white 6%); --sg-raised:color-mix(in srgb,var(--sg-page) 88%,white 12%); --sg-line:var(--projects-border-subtle,#29354a); --sg-text:var(--text-primary,#e2e8f0); --sg-muted:var(--projects-text-muted,#a8b4c7); --sg-accent:#60a5fa; color:var(--sg-text); font-family:Inter,ui-sans-serif,system-ui,sans-serif; font-size:13px; line-height:1.4 }\n"
    data = replace_once(data, old_root, new_root, "css-semantic-surfaces-root")

    old_frame = b".sg-projects-frame { display:flex; flex-direction:column; min-height:0; height:100%; width:100%; min-width:0; gap:8px; container-type:inline-size }\n"
    new_frame = (
        b".sg-projects-frame { display:flex; flex-direction:column; min-height:0; height:100%; width:100%; min-width:0; max-width:none; margin:0; gap:8px; container-type:inline-size; background:var(--sg-page) }\n"
        b".sg-projects-frame [class*=\"bg-black/20\"],.sg-projects-frame [class*=\"bg-black/25\"] { background:var(--sg-bg)!important }\n"
        b".sg-projects-frame [class*=\"bg-black/30\"],.sg-projects-frame [class*=\"bg-[#0b0d14]\"],.sg-projects-frame [class*=\"bg-[#0b1222]\"],.sg-projects-frame [class*=\"bg-[#111827]\"] { background:var(--sg-raised)!important }\n"
        b".sg-projects-frame [data-project-task-drawer] { background:var(--sg-raised)!important }\n"
        b"[data-project-schedule-control-drawer] { background:color-mix(in srgb,var(--bg-primary,#1a1b26) 88%,white 12%)!important }\n"
        b".sg-project-cover { background:var(--sg-raised); border-color:color-mix(in srgb,var(--sg-line) 75%,white 25%); box-shadow:0 8px 24px rgba(0,0,0,.14) }\n"
        b".sg-project-cover dt { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:var(--sg-muted) }\n"
        b".sg-project-cover dd { margin-top:4px; font-size:13px; font-weight:700; color:var(--sg-text) }\n"
    )
    data = replace_once(data, old_frame, new_frame, "css-project-surface-policy")

    old_shell = b".sg-projects-frame [data-project-unified-shell] { min-height:0; flex:1; gap:10px }.sg-projects-frame [data-project-unified-shell]>main { min-height:0; gap:8px }.sg-projects-frame [data-project-unified-shell]>main>div:last-child { min-height:0; overflow:auto; flex:1 }.sg-projects-frame [data-project-primary-nav] {"
    new_shell = b".sg-projects-frame [data-project-unified-shell] { min-height:0; flex:1; gap:10px }.sg-projects-frame [data-project-unified-shell][data-project-member-view=\"true\"] { gap:0 }.sg-projects-frame [data-project-unified-shell][data-project-member-view=\"true\"]>main { width:100%; max-width:none; flex-basis:100% }.sg-projects-frame [data-project-unified-shell]>main { min-height:0; gap:8px }.sg-projects-frame [data-project-unified-shell]>main>div:last-child { min-height:0; overflow:auto; flex:1 }.sg-projects-frame [data-project-primary-nav] {"
    return replace_once(data, old_shell, new_shell, "css-member-full-width")

def apply_visual_test(data: bytes) -> bytes:
    data = replace_once(
        data,
        b" return {id:901,name:'Visual repair acceptance',status:'In Progress',priority:'Medium',owner:'Planner',start_date:iso(base),end_date:iso(base+245),metadata_json:{adoption_state:'Pilot'},tasks}\n",
        b" return {id:901,name:'Visual repair acceptance',status:'In Progress',priority:'Medium',owner:'Planner',objective:'Give every project a clear, usable landing page.',expected_outcomes:['Readable project identity','Fast execution handoff'],start_date:iso(base),end_date:iso(base+245),metadata_json:{adoption_state:'Pilot'},tasks}\n",
        "test-cover-fixture",
    )
    data = replace_once(
        data,
        b"async function setup(page:Page){\n",
        b"async function setup(page:Page,opts:{unsupportedSavedViews?:boolean,view?:string}={}){\n",
        "test-setup-options",
    )
    data = replace_once(
        data,
        b"  else if(p.includes('/workspaces/')&&p.endsWith('/views'))data={views:[]}\n",
        b"  else if(p.includes('/workspaces/')&&p.endsWith('/views')){if(opts.unsupportedSavedViews)return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({detail:'Unknown workspace key.'})});data={views:[]}}\n",
        "test-unsupported-saved-view-route",
    )
    data = replace_once(
        data,
        b" await page.goto('/projects?id=901&view=timeline')\n await expect(page.locator('[data-project-modern-gantt]')).toBeVisible()\n",
        b" await page.goto(opts.view||'/projects?id=901&view=timeline')\n if(!opts.view||opts.view.includes('timeline'))await expect(page.locator('[data-project-modern-gantt]')).toBeVisible()\n",
        "test-setup-view",
    )
    addition = r'''
test('Project overview reload is quiet, full-width, bright, and cover-first',async({page},info)=>{
 await page.setViewportSize({width:1920,height:1080})
 const state=await setup(page,{unsupportedSavedViews:true,view:'/projects?id=901&view=overview'})
 const cover=page.locator('[data-project-cover="true"]')
 await expect(cover).toBeVisible()
 await page.reload()
 await expect(cover).toBeVisible()
 await page.waitForTimeout(150)
 await expect(page.getByText('Unknown workspace key.',{exact:true})).toHaveCount(0)
 await expect(page.locator('[data-project-workbench-rail]')).toHaveCount(0)
 await expect(cover.getByText('Visual repair acceptance',{exact:true})).toBeVisible()
 await expect(cover.getByText('Give every project a clear, usable landing page.',{exact:true})).toBeVisible()
 for(const label of ['Owner','Status','Start','Finish','Progress','Priority','Expected outcomes'])await expect(cover.getByText(label,{exact:true})).toBeVisible()
 await expect(cover.getByRole('button',{name:'Edit project',exact:true})).toBeVisible()
 await expect(cover.getByRole('button',{name:/Measure outcome/i})).toBeVisible()
 const shell=page.locator('[data-project-unified-shell]'),main=page.locator('[data-project-unified-shell]>main')
 const geometry=await Promise.all([shell.boundingBox(),main.boundingBox()])
 expect(geometry[0]).not.toBeNull();expect(geometry[1]).not.toBeNull()
 expect(geometry[1]!.width/geometry[0]!.width,JSON.stringify(geometry)).toBeGreaterThan(0.98)
 const outcome=page.locator('[data-project-outcome-realization="true"]')
 const [coverBox,outcomeBox]=await Promise.all([cover.boundingBox(),outcome.boundingBox()])
 expect(coverBox).not.toBeNull();expect(outcomeBox).not.toBeNull();expect(coverBox!.y).toBeLessThan(outcomeBox!.y)
 const brightness=await page.evaluate(()=>{
  const rgb=(value:string)=>{const m=value.match(/rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/);return m?[Number(m[1]),Number(m[2]),Number(m[3])]:[0,0,0]}
  const lum=(value:string)=>{const c=rgb(value).map(v=>{const x=v/255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
  const color=(selector:string)=>getComputedStyle(document.querySelector(selector) as HTMLElement).backgroundColor
  const body=getComputedStyle(document.body).backgroundColor,frame=color('.sg-projects-frame'),coverColor=color('[data-project-cover="true"]'),outcomeColor=color('[data-project-outcome-realization="true"]')
  return {body,frame,cover:coverColor,outcome:outcomeColor,bodyL:lum(body),frameL:lum(frame),coverL:lum(coverColor),outcomeL:lum(outcomeColor)}
 })
 expect(brightness.frameL,JSON.stringify(brightness)).toBeGreaterThanOrEqual(brightness.bodyL-.002)
 expect(brightness.coverL,JSON.stringify(brightness)).toBeGreaterThan(brightness.bodyL)
 expect(brightness.outcomeL,JSON.stringify(brightness)).toBeGreaterThanOrEqual(brightness.bodyL)
 await info.attach('project-overview-cover',{body:await page.screenshot(),contentType:'image/png'})
 await info.attach('project-overview-geometry-brightness',{body:JSON.stringify({geometry,brightness},null,2),contentType:'application/json'})
 expect(state.puts).toHaveLength(0);expect(state.errors).toEqual([])
})
'''
    if b"Project overview reload is quiet, full-width, bright, and cover-first" in data:
        raise RuntimeError("test already present")
    return data.rstrip() + b"\n\n" + addition.encode("utf-8")

TRANSFORMS = {
    "frontend/src/components/ProjectsGolden.tsx": apply_projects_golden,
    "frontend/src/components/ProjectsWorkspaceLayout.tsx": apply_workspace_layout,
    "frontend/src/components/ProjectsVisualRepair.css": apply_css,
    "frontend/tests/projects-visual-repair.spec.ts": apply_visual_test,
}

def parse_status(repo: pathlib.Path):
    raw = git(repo, "status", "--porcelain=v1", "--untracked-files=all", "-z")["output"]
    tracked, untracked = [], []
    for item in raw.split("\0"):
        if not item: continue
        code, path = item[:2], item[3:]
        if code == "??": untracked.append(path)
        else: tracked.append({"code": code, "path": path})
    return tracked, untracked

def verify_repo(repo: pathlib.Path):
    if not (repo / ".git").exists():
        raise RuntimeError(f"not a git repository root: {repo}")
    head = git(repo, "rev-parse", "HEAD")["output"].strip()
    tree = git(repo, "rev-parse", "HEAD^{tree}")["output"].strip()
    if head != BASE_COMMIT or tree != BASE_TREE:
        raise RuntimeError(f"base mismatch: HEAD={head} tree={tree}; expected {BASE_COMMIT} / {BASE_TREE}")
    gl = git(repo, "ls-tree", "HEAD", "--", GITLINK_PATH)["output"].strip().split()
    if len(gl) < 3 or gl[0] != "160000" or gl[1] != "commit" or gl[2] != GITLINK_OID:
        raise RuntimeError("SysGrid gitlink identity mismatch")
    if git(repo, "diff", "--cached", "--quiet", check=False)["exit_code"] != 0:
        raise RuntimeError("staged tracked changes present")
    tracked, untracked = parse_status(repo)
    if tracked:
        raise RuntimeError(f"tracked worktree must be clean before Repair 8; observed {tracked}")
    observed = {}
    for rel, expected in FILES.items():
        actual = blob(repo, rel)
        observed[rel] = actual
        if actual != expected:
            raise RuntimeError(f"preimage mismatch for {rel}: {actual} != {expected}")
    return {"head": head, "tree": tree, "blobs": observed, "untracked": untracked}

def deterministic_zip(src: pathlib.Path, out: pathlib.Path):
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(x for x in src.rglob("*") if x.is_file()):
            info = zipfile.ZipInfo(p.relative_to(src).as_posix(), (2026, 9, 6, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o644 & 0xFFFF) << 16
            z.writestr(info, p.read_bytes())

def main():
    repo = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else os.getcwd()).resolve()
    result_root = repo / ".sysgrid-project-view-repair-r8-result"
    if result_root.exists(): shutil.rmtree(result_root)
    logs_dir = result_root / "logs"; logs_dir.mkdir(parents=True)
    result = {
        "schema": "SYSGRID_PROJECT_VIEW_REPAIR_LOCAL_RESULT_V1",
        "repair_iteration": 8,
        "objective": "Project View reload/layout/brightness/cover usability correction",
        "status": "FAIL",
        "base_commit": BASE_COMMIT,
        "base_tree": BASE_TREE,
        "local_application": "NOT_ATTEMPTED",
        "started_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "stages": [],
        "non_goals": ["backend/API/schema changes", "alternate Project store", "Gantt semantic weakening", "force/push/remote mutation"],
    }
    try:
        state = verify_repo(repo)
        result["preflight"] = state
        result["stages"].append({"name":"exact-source-preflight","status":"PASS"})

        post = {}
        for rel, transform in TRANSFORMS.items():
            before = (repo / rel).read_bytes()
            after = transform(before)
            if after == before: raise RuntimeError(f"no change produced for {rel}")
            post[rel] = after
        result["candidate_blobs"] = {rel: blob_bytes(data) for rel, data in post.items()}

        with tempfile.TemporaryDirectory(prefix="sysgrid-pv-r8-") as td:
            cand = pathlib.Path(td) / "candidate"
            run(["git","clone","--shared","--no-checkout",str(repo),str(cand)], repo)
            git(cand, "checkout", "--detach", BASE_COMMIT)
            for rel, data in post.items():
                path = cand / rel; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(data)
            source_modules = repo / "frontend/node_modules"
            candidate_modules = cand / "frontend/node_modules"
            if source_modules.exists() and not candidate_modules.exists():
                candidate_modules.symlink_to(source_modules, target_is_directory=True)

            diffcheck = run(["git","diff","--check"], cand, log=logs_dir/"git-diff-check.log", check=False)
            result["stages"].append({"name":"git-diff-check","status":"PASS" if diffcheck["exit_code"]==0 else "FAIL","exit_code":diffcheck["exit_code"],"duration_ms":diffcheck["duration_ms"]})
            if diffcheck["exit_code"]: raise RuntimeError("git diff --check failed")

            visual = run(["node","scripts/run-projects-visual-repair.mjs"], cand/"frontend", log=logs_dir/"projects-visual-repair.log", check=False)
            result["stages"].append({"name":"projects-visual-repair","status":"PASS" if visual["exit_code"]==0 else "FAIL","exit_code":visual["exit_code"],"duration_ms":visual["duration_ms"]})
            if visual["exit_code"]: raise RuntimeError("Project visual proof failed")

            regression = run(["node","scripts/run-projects-out40-slice-h-browser.mjs","--mode","regression"], cand/"frontend", log=logs_dir/"out40-regression.log", check=False)
            result["stages"].append({"name":"out40-regression","status":"PASS" if regression["exit_code"]==0 else "FAIL","exit_code":regression["exit_code"],"duration_ms":regression["duration_ms"]})
            if regression["exit_code"]: raise RuntimeError("OUT-40 retained regression failed")

            verify_repo(repo)
            for rel, data in post.items():
                (repo / rel).write_bytes(data)
            applied = {rel: blob(repo, rel) for rel in post}
            if applied != result["candidate_blobs"]:
                raise RuntimeError(f"applied blob verification mismatch: {applied}")
            result["applied_blobs"] = applied
            result["local_application"] = "APPLIED_VERIFIED_AFTER_BOTH_PROOFS"
            result["status"] = "PASS"
            patch = git(cand, "diff", "--binary", "--", *sorted(post))["output"]
            (result_root / "candidate.patch").write_text(patch, encoding="utf-8")
    except Exception as exc:
        result["error"] = str(exc)
    finally:
        result["completed_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
        (result_root / "RESULT.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        out = repo / RESULT_NAME
        deterministic_zip(result_root, out)
        print(f"STATUS={result['status']}")
        print(f"RESULT_ZIP={out}")
    return 0 if result["status"] == "PASS" else 1

if __name__ == "__main__":
    raise SystemExit(main())
