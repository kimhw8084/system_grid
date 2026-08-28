import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
// SYSGRID_ALLOW_SOURCE_OWNERSHIP_ASSERTION — textual ownership is the contract under test.

const source = fs.readFileSync(path.resolve(__dirname, 'ProjectsGolden.tsx'), 'utf8')

describe('Projects golden workspace contract', () => {
  it('declares Projects as a shared golden hybrid workspace', () => {
    expect(source).toContain('<OperationalWorkspaceShell')
    expect(source).toContain('archetype="hybrid"')
    expect(source).toContain('workspace="projects"')
    expect(source).toContain('ToolbarSearch')
    expect(source).toContain('ToolbarSegmented')
    expect(source).toContain('WorkspaceModal')
  })

  it('keeps Project domain extensions first-class instead of converting them into a generic grid', () => {
    expect(source).toContain("value: 'portfolio'")
    expect(source).toContain("value: 'board'")
    expect(source).toContain("value: 'workspace'")
    expect(source).toContain('<LegacyProjects />')
    expect(source).not.toContain('AgGridReact')
  })

  it('removes the routed legacy rail and owns project navigation in the golden shell', () => {
    expect(source).toContain('data-project-legacy-core="true"')
    expect(source).toContain('.project-golden-legacy > div > :nth-child(3) > :first-child')
    expect(source).toContain('display: none !important')
    expect(source).toContain("{ value: 'ALL', label: 'All priority' }")
  })

  it('preserves the existing project API contract for board moves and creation', () => {
    expect(source).toContain("apiFetch('/api/v1/projects')")
    expect(source).toContain("apiFetch(`/api/v1/projects/${project.id}`")
    expect(source).toContain("method: 'PUT'")
    expect(source).toContain("method: 'POST'")
    expect(source).not.toContain('/api/v2/')
  })

  it('restores project and management view from URL query state', () => {
    expect(source).toContain("searchParams.get('view')")
    expect(source).toContain("searchParams.get('id')")
    expect(source).toContain("next.set('view', nextView)")
    expect(source).toContain("next.set('id', String(projectId))")
  })
})
