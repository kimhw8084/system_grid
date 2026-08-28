import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
// SYSGRID_ALLOW_SOURCE_OWNERSHIP_ASSERTION — textual ownership is the contract under test.

const source = fs.readFileSync(path.resolve(__dirname, 'ProjectsGolden.tsx'), 'utf8')
const model = fs.readFileSync(path.resolve(__dirname, 'ProjectsGolden.model.ts'), 'utf8')

describe('Projects execution intelligence golden contract', () => {
  it('keeps Projects on the shared hybrid workspace shell', () => {
    expect(source).toContain('<OperationalWorkspaceShell')
    expect(source).toContain('archetype="hybrid"')
    expect(source).toContain('workspace="projects"')
    expect(source).toContain('ToolbarSearch')
    expect(source).toContain('ToolbarSegmented')
    expect(source).toContain('WorkspaceModal')
  })

  it('owns six domain views without generic-grid conversion', () => {
    for (const view of ['portfolio', 'board', 'roadmap', 'owners', 'review', 'workspace']) expect(source).toContain(`value: '${view}'`)
    expect(source).toContain('<LegacyProjects />')
    expect(source).not.toContain('AgGridReact')
  })

  it('adds the approved execution intelligence surfaces', () => {
    expect(source).toContain('data-project-control-tower="true"')
    expect(source).toContain('Attention Queue 2.0')
    expect(source).toContain('data-project-milestone-tower="true"')
    expect(source).toContain('data-project-roadmap="true"')
    expect(source).toContain('data-project-owner-cockpit="true"')
    expect(source).toContain('data-project-my-work="true"')
    expect(source).toContain('data-project-review-mode="true"')
    expect(source).toContain('Quick Task')
    expect(source).toContain('WIP limits')
  })

  it('removes positional nth-child embedding and uses a semantic embedded-host adapter', () => {
    expect(source).toContain('data-project-embedded-host="true"')
    expect(source).toContain('[aria-label="New Vector"]')
    expect(source).toContain('data-project-embedded-rail')
    expect(source).not.toContain(':nth-child(')
  })

  it('preserves the existing project API contract and adds stale-write protection', () => {
    expect(source).toContain("apiFetch('/api/v1/projects')")
    expect(source).toContain("apiFetch(`/api/v1/projects/${nextProject.id}`")
    expect(source).toContain("method: 'PUT'")
    expect(source).toContain("method: 'POST'")
    expect(source).not.toContain('/api/v2/')
    expect(source).toContain('projectFingerprint(remote) !== baseFingerprint')
    expect(source).toContain('Project changed since this view loaded')
  })

  it('validates supporting form APIs before using JSON payloads', () => {
    expect(source).toContain('if (!response.ok) throw new Error(`${key} unavailable:')
    expect(source).toContain("useSafeListQuery('devices'")
    expect(source).toContain("useSafeListQuery('logical-services'")
    expect(source).toContain("useSafeListQuery('settings-options'")
  })

  it('restores project and management view from URL state and persists the operating lens', () => {
    expect(source).toContain("searchParams.get('view')")
    expect(source).toContain("searchParams.get('id')")
    expect(source).toContain("next.set('view', nextView)")
    expect(source).toContain("next.set('id', String(projectId))")
    expect(source).toContain('sysgrid_projects_execution_intelligence_v1')
    expect(source).toContain('Project view saved locally')
  })

  it('uses one deterministic model for progress, health, dates, attention, owners, roadmap and critical path', () => {
    for (const marker of ['getTaskProgress', 'getProjectHealth', 'getDaysToDue', 'diversifyAttentionItems', 'buildOwnerWorkload', 'buildRoadmapRows', 'getCriticalTaskIds']) expect(model).toContain(marker)
    expect(model).toContain("if (task?.status === 'Completed') return 100")
    expect(model).toContain("return project")
  })

  it('keeps deterministic health explainable instead of adding an opaque backend score', () => {
    expect(model).toContain("level: score >= 7 ? 'red' : score >= 3 ? 'amber' : 'green'")
    expect(model).toContain('reasons')
    expect(source).not.toContain('/api/v1/project-health')
    expect(source).not.toContain('ai_score')
  })
})
