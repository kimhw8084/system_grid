import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const golden = fs.readFileSync(path.resolve(__dirname, 'ProjectsGolden.tsx'), 'utf8')
const navigation = fs.readFileSync(path.resolve(__dirname, 'ProjectsNavigation.ts'), 'utf8')
const panel = fs.readFileSync(path.resolve(__dirname, 'ProjectsDetailPanelHost.tsx'), 'utf8')
const css = fs.readFileSync(path.resolve(__dirname, 'ProjectsPV1.css'), 'utf8')

describe('PV1 Projects shell ownership', () => {
  it('owns the canonical six project destinations and global navigation', () => {
    for (const label of ['Home', 'Work', 'Plan', 'Timeline', 'Updates', 'Outcomes']) expect(navigation).toContain(`label: '${label}'`)
    for (const marker of ['data-pv1-global-nav="true"', 'data-pv1-project-selector="true"', 'data-pv1-new-project="true"', 'data-pv1-destination']) expect(golden).toContain(marker)
    expect(golden).toContain('data-project-primary-nav="true"')
  })

  it('does not render the redundant Project workbench rail', () => {
    expect(golden).toContain('function ProjectWorkbenchRail')
    expect(golden).not.toContain('<ProjectWorkbenchRail projects=')
    expect(panel).toContain('data-pv1-detail-panel="true"')
  })

  it('binds the PV1 token ladder and responsive detail panel geometry', () => {
    for (const token of ['#1a1b26', '#23242f', '#2c2d37', '#353640', '#f8fafc', '#ffffff']) expect(css.toLowerCase()).toContain(token)
    for (const marker of ['width:440px', 'width:min(480px', 'inset:0', 'prefers-reduced-motion']) expect(css).toContain(marker)
  })
})
