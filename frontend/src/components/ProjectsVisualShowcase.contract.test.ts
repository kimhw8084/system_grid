// SYSGRID_ALLOW_SOURCE_OWNERSHIP_ASSERTION — this test intentionally verifies the narrow Reports integration/source-ownership boundary.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(process.cwd(), 'src', 'components')
const golden = fs.readFileSync(path.join(root, 'ProjectsGolden.tsx'), 'utf8')
const visual = fs.readFileSync(path.join(root, 'ProjectsVisualShowcase.tsx'), 'utf8')
const model = fs.readFileSync(path.join(root, 'ProjectsVisualShowcase.model.ts'), 'utf8')

describe('Projects visual/showcase source contract', () => {
  it('integrates only through the existing Reports view and preserves sparse Overview', () => {
    expect(golden).toContain("from './ProjectsVisualShowcase'")
    expect(golden).toContain('Executive showcase')
    expect(golden).toContain('Team review')
    expect(golden).toContain("view === 'reports' ? <ProjectReportPreview")
    const overviewStart = golden.indexOf('function ProjectOverview(')
    const overviewEnd = golden.indexOf('function InlineTaskText', overviewStart)
    expect(golden.slice(overviewStart, overviewEnd)).not.toContain('ProjectVisualShowcase')
  })

  it('has identity-scoped visual, source, snapshot and fallback proof anchors', () => {
    for (const marker of ['data-project-showcase=', 'data-project-showcase-snapshot=', 'data-project-visual-id=', 'data-project-visual-source="true"', 'data-project-visual-fallback="true"']) expect(visual).toContain(marker)
  })

  it('uses existing Project metadata instead of a second presentation store or API', () => {
    expect(model).toContain("PROJECT_REPORTING_SHOWCASE_KEY = 'project_reporting_v1'")
    expect(model).not.toMatch(/fetch\(|apiFetch\(|localStorage|sessionStorage/)
    expect(visual).not.toMatch(/fetch\(|apiFetch\(|localStorage|sessionStorage/)
  })

  it('explicitly prevents live borrowing for frozen schedule/capacity/dependency truth', () => {
    expect(model).toContain('live values are intentionally not borrowed')
    expect(model).toContain('Capacity analysis was not captured in this report snapshot')
    expect(model).toContain('Dependency topology was not captured in this report snapshot')
  })
})
