import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
// SYSGRID_ALLOW_SOURCE_OWNERSHIP_ASSERTION — textual ownership is the contract under test.

const source = fs.readFileSync(path.resolve(__dirname, 'ProjectsGolden.tsx'), 'utf8')
const model = fs.readFileSync(path.resolve(__dirname, 'ProjectsGolden.model.ts'), 'utf8')

describe('Projects complete task workbench golden contract', () => {
  it('keeps Projects on the shared hybrid workspace shell while adding one unified workbench shell', () => {
    expect(source).toContain('<OperationalWorkspaceShell')
    expect(source).toContain('archetype="hybrid"')
    expect(source).toContain('workspace="projects"')
    expect(source).toContain('data-project-unified-shell="true"')
    expect(source).toContain('data-project-workbench-rail="true"')
    expect(source).toContain('data-project-workbench-header="true"')
    expect(source).toContain('data-project-primary-nav="true"')
  })

  it('owns the eight member-first project views plus a separate portfolio utility surface', () => {
    for (const view of ['overview', 'tasks', 'timeline', 'board', 'files', 'updates', 'reports', 'insights']) expect(source).toContain(`value: '${view}'`)
    expect(model).toContain("PROJECT_GOLDEN_VIEWS = ['overview', 'tasks', 'timeline', 'board', 'files', 'updates', 'reports', 'insights', 'portfolio']")
    expect(source).toContain('data-project-portfolio-hub="true"')
    expect(source).not.toContain('AgGridReact')
  })

  it('preserves legacy project deep links but canonicalizes them into the new workbench hierarchy', () => {
    expect(model).toContain("workspace: 'timeline'")
    expect(model).toContain("roadmap: 'portfolio'")
    expect(model).toContain("owners: 'portfolio'")
    expect(model).toContain("review: 'insights'")
    expect(model).toContain("governance: 'insights'")
    expect(source).toContain("next.set('section', rawView)")
  })

  it('makes Overview, Tasks, Timeline, Updates, Reports and task context first-class useful surfaces', () => {
    expect(source).toContain('data-project-overview="true"')
    expect(source).toContain('data-project-tasks-foundation="true"')
    expect(source).toContain('data-project-report-preview="true"')
    expect(source).toContain('data-project-task-drawer="true"')
    expect(source).toContain('<LegacyEmbeddedHost mode="GANTT" label="Project Timeline" />')
    expect(source).toContain('<LegacyEmbeddedHost mode="ACTIVITY" label="Project Updates" />')
    expect(source).toContain('data-project-direct-surface={mode.toLowerCase()}')
  })

  it('removes the visible nested legacy navigation while retaining the proven planning/activity engines', () => {
    expect(source).toContain('data-project-embedded-rail="true"')
    expect(source).toContain('data-project-embedded-hud="true"')
    expect(source).toContain('data-project-embedded-tabs="true"')
    expect(source).toContain("GANTT: 'Precision Gantt'")
    expect(source).toContain("ACTIVITY: 'Stream'")
    expect(source).not.toContain(':nth-child(')
    expect(source).toContain('<LegacyProjects />')
  })

  it('restores working context from URL plus the migrated local workbench state', () => {
    expect(source).toContain("STORAGE_KEY = 'sysgrid_projects_workbench_v1'")
    expect(source).toContain("LEGACY_STORAGE_KEY = 'sysgrid_projects_execution_intelligence_v1'")
    expect(source).toContain("searchParams.get('view')")
    expect(source).toContain("searchParams.get('id')")
    expect(source).toContain("searchParams.get('task')")
    expect(source).toContain('lastProjectId: selectedProjectId')
    expect(source).toContain('lastView: view')
    expect(source).toContain('recentIds')
  })

  it('keeps one optimistic stale-safe Project PUT mutation path for task, governance and workbench edits', () => {
    expect(source).toContain("apiFetch(`/api/v1/projects/${nextProject.id}`")
    expect(source).toContain("method: 'PUT'")
    expect(source).toContain("queryClient.setQueryData(['projects']")
    expect(source).toContain('Project changed since this view loaded')
    expect(source).toContain('projectFingerprint(nextProject) === projectFingerprint(current)')
    expect(source).not.toContain('/api/v2/')
  })

  it('replaces raw dependency-id authoring with human-readable predecessor selection', () => {
    expect(source).toContain('Choose a predecessor by task name…')
    expect(source).toContain('aria-label="Dependency task"')
    expect(source).not.toContain('Dependencies · task IDs')
  })

  it('derives Overview and Reports from existing canonical execution/governance truth', () => {
    for (const marker of ['buildProjectOverview', 'buildProjectReportSummary', 'getProjectExecutionProgress', 'getProjectHealth', 'getProjectForecast', 'getEvidenceReadiness']) expect(model).toContain(marker)
    expect(source).toContain('Live Project Report')
    expect(source).toContain('Next actions')
    expect(source).toContain('Needs attention')
  })

  it('preserves accepted execution, roadmap, owner, review and governance intelligence behind the member workflow', () => {
    expect(source).toContain('Attention Queue 2.0')
    expect(source).toContain('data-project-execution-board="true"')
    expect(source).toContain('data-project-roadmap="true"')
    expect(source).toContain('data-project-owner-cockpit="true"')
    expect(source).toContain('data-project-review-mode="true"')
    expect(source).toContain('data-project-governance="true"')
    expect(source).toContain('data-project-forecast="true"')
    expect(source).toContain('data-project-stage-gates="true"')
    expect(source).toContain('data-project-change-intelligence="true"')
  })

  it('preserves deterministic governance/forecasting and existing Project metadata ownership', () => {
    expect(model).toContain("PROJECT_GOVERNANCE_KEY = 'project_governance_v1'")
    expect(model).toContain('simulateProjectScenario')
    expect(model).toContain('forecastFinishOrdinal')
    expect(model).toContain('captureProjectReviewSnapshot')
    expect(model).toContain('.slice(0, 24)')
    expect(source).not.toContain('ai_score')
    expect(source).not.toContain('forecast_score')
    expect(source).not.toContain('/api/v1/project-governance')
    expect(source).not.toContain('/api/v1/project-forecast')
  })

  it('promotes Tasks into a high-speed inline workbench instead of a read-only foundation list', () => {
    expect(source).toContain('data-project-task-workbench="true"')
    expect(source).toContain('Inline authoring · WBS hierarchy · bulk operations')
    for (const marker of ['Task name ${task.id}', 'Owner ${task.id}', 'Start date ${task.id}', 'Finish date ${task.id}', 'Status ${task.id}', 'Progress ${task.id}', 'Priority ${task.id}']) expect(source).toContain(marker)
    expect(source).toContain('Type a task and press Enter…')
    expect(source).toContain('Enter creates another row · Tab moves through fields')
  })

  it('owns WBS hierarchy, collapse, indent/outdent and subtree reorder through the canonical task model', () => {
    for (const marker of ['buildProjectTaskHierarchy', 'getProjectTaskParentId', 'getProjectTaskDescendantIds', 'setProjectTaskParent', 'indentProjectTask', 'outdentProjectTask', 'reorderProjectTaskBefore']) expect(model).toContain(marker)
    expect(source).toContain('data-task-depth={String(row.depth)}')
    expect(source).toContain('Reorder ${task.name}')
    expect(source).toContain('Indent ${task.name}')
    expect(source).toContain('Outdent ${task.name}')
  })

  it('adds spreadsheet paste, multi-select and bounded bulk task operations without a second task store', () => {
    expect(source).toContain('data-project-task-paste="true"')
    expect(source).toContain('data-project-task-bulkbar="true"')
    expect(source).toContain('Paste rows from Excel / Sheets')
    expect(model).toContain('parseProjectTaskPaste')
    expect(model).toContain('bulkUpdateProjectTasks')
    expect(source).toContain('Select visible tasks')
    expect(source).toContain('Shift days')
    expect(source).toContain('Milestone')
  })

  it('makes the persistent task drawer directly editable and preserves deep task context', () => {
    expect(source).toContain('data-project-task-drawer-editable="true"')
    expect(source).toContain('data-project-task-checklist="true"')
    expect(source).toContain('data-project-task-dependencies="true"')
    expect(source).toContain('Choose predecessor by task name…')
    expect(source).toContain('autosaves on blur')
    expect(source).toContain('WBS parent')
    expect(source).toContain('Comments & project material')
    expect(source).toContain('Recent task activity')
  })

  it('serializes rapid authoritative Project writes and provides bounded undo/redo history', () => {
    expect(source).toContain("scope: { id: 'projects-authoritative-write' }")
    expect(source).toContain('taskHistory')
    expect(source).toContain(".slice(-40)")
    expect(source).toContain('Task workbench undo')
    expect(source).toContain('Task workbench redo')
    expect(source).toContain('structuredClone(selectedProject.tasks || [])')
  })

  it('extends stale-write fingerprints to hierarchy, ordering, descriptions and task metadata', () => {
    expect(model).toContain('description: task?.description')
    expect(model).toContain('order_index: task?.order_index')
    expect(model).toContain('metadata_json: task?.metadata_json')
    expect(model).toContain('metadata_json: project?.metadata_json || null')
  })

  it('keeps direct inline edits canonical for completed and reopened progress semantics', () => {
    expect(model).toContain("if (next.status === 'Completed') next.progress = 100")
    expect(model).toContain("task?.status === 'Completed'")
    expect(model).toContain('Math.min(99')
  })

  it('does not introduce a task-workbench backend schema or alternate Project API family', () => {
    expect(source).not.toContain('/api/v1/project-tasks')
    expect(source).not.toContain('/api/v2/projects')
    expect(model).toContain('wbs_parent_id')
    expect(model).toContain('is_milestone')
  })

})
