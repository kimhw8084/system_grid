// SYSGRID_ALLOW_SOURCE_OWNERSHIP_ASSERTION — exact source ownership is the contract for canonical Projects routing/writes.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(process.cwd(), 'src')
const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8')
const wrapper = fs.readFileSync(path.join(root, 'components/ProjectsSchedulingCompletion.tsx'), 'utf8')
const model = fs.readFileSync(path.join(root, 'components/ProjectsSchedulingCompletion.model.ts'), 'utf8')

describe('OUT-38 source contract', () => {
  it('wraps the accepted ProjectsGolden timeline rather than creating a second scheduler route', () => {
    expect(app).toContain('import Projects from "./components/ProjectsSchedulingCompletion"')
    expect(wrapper).toContain("import ProjectsGolden from './ProjectsGolden'")
    expect(wrapper).toContain('<ProjectsGolden />')
    expect(wrapper).toContain("view === 'timeline'")
  })

  it('uses the canonical Project GET/CAS/full PUT write seam', () => {
    expect(wrapper).toContain("apiFetch('/api/v1/projects')")
    expect(wrapper).toContain('projectFingerprint(remote) !== projectFingerprint(baseProject)')
    expect(wrapper).toContain("apiFetch(`/api/v1/projects/${nextProject.id}`, { method: 'PUT', body: JSON.stringify(nextProject) })")
    expect(wrapper).not.toMatch(/\/api\/v1\/projects\/[^`'\"]*schedule/)
  })

  it('keeps typed scheduling metadata additive and capacity authority explicit', () => {
    expect(model).toContain("project_schedule_v2")
    expect(model).toContain("project_schedule_constraint_v1")
    expect(model).toContain("['FS', 'SS', 'FF', 'SF']")
    expect(model).toContain("status: !authoritative ? 'UNKNOWN'")
  })
})
