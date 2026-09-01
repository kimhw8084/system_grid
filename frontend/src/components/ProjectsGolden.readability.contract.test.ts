import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
// SYSGRID_ALLOW_SOURCE_OWNERSHIP_ASSERTION — stylesheet wiring and Projects-only selector ownership are the contract under test.

const frontendRoot = path.resolve(__dirname, '../..')
const indexSource = fs.readFileSync(path.join(frontendRoot, 'index.html'), 'utf8')
const css = fs.readFileSync(path.join(frontendRoot, 'public/projects-readability.css'), 'utf8')
const projectsSource = fs.readFileSync(path.join(__dirname, 'ProjectsGolden.tsx'), 'utf8')

describe('Projects readability foundation source contract', () => {
  it('loads exactly one versioned Projects readability stylesheet from the app document', () => {
    expect(indexSource).toContain('<link rel="stylesheet" href="/projects-readability.css" data-projects-readability="v1" />')
    expect(indexSource.match(/data-projects-readability=/g)).toHaveLength(1)
  })

  it('keeps the visual layer scoped to Projects and dark theme identities', () => {
    expect(css).toContain("[data-workspace='projects']")
    for (const theme of ['nordic-frost-v1', 'industrial-slate', 'ocean-deep', 'cyber-emerald', 'dark']) {
      expect(css).toContain(`html[data-theme='${theme}']`)
    }
    expect(css).toContain("body:has([data-workspace='projects']) [role='dialog']")
    expect(css).not.toMatch(/(^|\})\s*(html|body|:root)\s*\{/m)
  })

  it('enforces the 12px functional floor for every current Projects microtype token', () => {
    for (const px of [7, 8, 9, 10, 11]) expect(css).toContain(`[class~='text-[${px}px]']`)
    expect(css).toContain('font-size: 12px;')
  })

  it('promotes the known weak slate roles and defines an explicit readable surface ladder', () => {
    expect(css).toContain(':is(.text-slate-700, .text-slate-600)')
    expect(css).toContain('.text-slate-500')
    for (const token of [
      '--projects-surface-base: #0a0c14',
      '--projects-surface-shell: #0f1420',
      '--projects-surface-work: #111827',
      '--projects-surface-raised: #141b2a',
      '--projects-surface-elevated: #182235',
      '--projects-text-muted: #94a3b8',
      '--projects-text-soft: #a8b3c5',
      '--projects-focus: #60a5fa',
    ]) expect(css).toContain(token)
  })

  it('preserves capability ownership rather than hiding or disabling existing Projects surfaces', () => {
    expect(css).not.toContain('display: none')
    expect(css).not.toContain('visibility: hidden')
    expect(css).not.toContain('pointer-events: none')
    for (const marker of [
      'data-project-overview="true"',
      'data-project-tasks-foundation="true"',
      'data-project-flagship-gantt="true"',
      'data-project-execution-hub="true"',
      'data-project-updates-native="true"',
      'data-project-report-preview="true"',
      'data-project-task-drawer="true"',
    ]) expect(projectsSource).toContain(marker)
  })
})
