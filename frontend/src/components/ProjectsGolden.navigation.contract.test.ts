import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
// SYSGRID_ALLOW_SOURCE_OWNERSHIP_ASSERTION — textual ownership is the contract under test.

const source = fs.readFileSync(path.resolve(__dirname, 'ProjectsGolden.tsx'), 'utf8')

describe('Projects central navigation and progressive disclosure contract', () => {
  it('presents six intent-level destinations while retaining all eight canonical routes', () => {
    for (const label of ['Overview', 'Work', 'Plan', 'Discuss', 'Evidence', 'Outcomes']) expect(source).toContain(`label: '${label}'`)
    for (const view of ['overview', 'tasks', 'timeline', 'board', 'files', 'updates', 'reports', 'insights']) expect(source).toContain(`value: '${view}'`)
    expect(source).toContain('PROJECT_INTENT_OPTIONS')
    expect(source).toContain('projectIntentForView')
    expect(source).toContain('data-project-primary-nav="true"')
  })

  it('uses progressive modes for Work and Outcomes rather than eight equal primary tabs', () => {
    expect(source).toContain('data-project-progressive-modes="work"')
    expect(source).toContain("[['tasks', 'Tasks'], ['board', 'Board']]")
    expect(source).toContain('data-project-progressive-modes="outcomes"')
    expect(source).toContain("[['reports', 'Reports'], ['insights', 'Insights']]")
  })

  it('keeps one central Add menu mapped onto existing authoritative paths', () => {
    expect(source).toContain('data-project-quick-add="true"')
    for (const action of ['Task', 'Update', 'Material', 'Risk / decision', 'Report snapshot']) expect(source).toContain(action)
    expect(source).toContain("action === 'task'")
    expect(source).toContain("action === 'update'")
    expect(source).toContain("action === 'material'")
    expect(source).toContain("action === 'governance'")
    expect(source).toContain("action === 'report'")
    expect(source).toContain("apiFetch(`/api/v1/projects/${nextProject.id}`")
    expect(source).not.toContain('/api/v2/projects')
  })

  it('exposes a discoverable Jump to surface for all canonical project destinations', () => {
    expect(source).toContain('data-project-jump-menu="true"')
    expect(source).toContain('PRIMARY_VIEW_OPTIONS.map')
    expect(source).toContain('<Zap size={12} /> Jump to')
  })

  it('keeps project context persistent and exposes outcome, owner, target, health, value and adoption state', () => {
    expect(source).toContain('data-project-workbench-header="true"')
    for (const label of ['Target', 'Evidence', 'Value', 'Adoption', 'Owner']) expect(source).toContain(`['${label}'`)
    expect(source).toContain('overview.health.level')
    expect(source).toContain("project.objective || project.problem_statement")
    expect(source).toContain('project.metadata_json?.adoption_state')
  })

  it('preserves legacy deep-link canonicalization and separate Portfolio ownership', () => {
    expect(source).toContain("next.set('view', resolveProjectGoldenView(rawView))")
    expect(source).toContain("rawView === 'roadmap'")
    expect(source).toContain("rawView === 'governance'")
    expect(source).toContain('data-project-portfolio-hub="true"')
    expect(source).toContain("const projectView = view !== 'portfolio'")
  })
})
