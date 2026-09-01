import { describe, expect, it } from 'vitest'
import {
  buildProjectHierarchyRailRows,
  buildProjectSelectorOptions,
  getProjectHierarchyContext,
  getTopLevelProjects,
  getValidParentProjects,
} from './ProjectsGolden.hierarchy'

const fixture = Array.from({ length: 10 }, (_, index) => ({ id: index + 1, name: `P${String(index + 1).padStart(2, '0')}`, parent_project_id: null })).concat([
  { id: 11, name: 'P10 child', parent_project_id: 10 },
  { id: 12, name: 'orphan', parent_project_id: 999 },
] as any)

describe('Projects hierarchy semantics', () => {
  it('keeps the validation fixture at exactly ten top-level outcomes', () => {
    expect(getTopLevelProjects(fixture as any)).toHaveLength(10)
  })

  it('nests the P10 child in the rail and does not promote it', () => {
    const rows = buildProjectHierarchyRailRows(fixture as any, fixture.slice(0, 11) as any, 11)
    const child = rows.find((row) => row.id === 11)
    expect(child?.__hierarchyDepth).toBe(1)
    expect(child?.__isSubproject).toBe(true)
  })

  it('marks a missing parent without promoting the orphan', () => {
    const context = getProjectHierarchyContext(fixture as any, fixture[11] as any)
    expect(context.parent).toBeNull()
    expect(context.parentMissing).toBe(true)
  })

  it('removes self and descendants from valid parent choices', () => {
    const candidates = getValidParentProjects(fixture as any, 10).map((row) => row.id)
    expect(candidates).not.toContain(10)
    expect(candidates).not.toContain(11)
  })

  it('keeps child options visibly nested', () => {
    const option = buildProjectSelectorOptions(fixture as any).find((row) => row.value === 11)
    expect(option?.label).toContain('↳')
  })
})
