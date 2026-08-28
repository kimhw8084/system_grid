import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
// SYSGRID_ALLOW_SOURCE_OWNERSHIP_ASSERTION — textual ownership is the contract under test.

const source = fs.readFileSync(path.resolve(__dirname, 'ProjectsGolden.tsx'), 'utf8')
const model = fs.readFileSync(path.resolve(__dirname, 'ProjectsGolden.model.ts'), 'utf8')

describe('Projects governance and forecasting golden contract', () => {
  it('keeps Projects on the shared hybrid workspace shell', () => {
    expect(source).toContain('<OperationalWorkspaceShell')
    expect(source).toContain('archetype="hybrid"')
    expect(source).toContain('workspace="projects"')
    expect(source).toContain('ToolbarSearch')
    expect(source).toContain('ToolbarSegmented')
    expect(source).toContain('WorkspaceModal')
  })

  it('owns seven domain views without generic-grid conversion', () => {
    for (const view of ['portfolio', 'board', 'roadmap', 'owners', 'review', 'governance', 'workspace']) expect(source).toContain(`value: '${view}'`)
    expect(source).toContain('<LegacyProjects />')
    expect(source).not.toContain('AgGridReact')
  })

  it('adds governance, forecasting and change-intelligence surfaces', () => {
    expect(source).toContain('data-project-governance="true"')
    expect(source).toContain('data-project-forecast="true"')
    expect(source).toContain('data-project-raid="true"')
    expect(source).toContain('data-project-stage-gates="true"')
    expect(source).toContain('data-project-change-intelligence="true"')
    expect(source).toContain('Deterministic schedule forecast')
    expect(source).toContain('What-if scenario')
    expect(source).toContain('Decision & change log')
    expect(source).toContain('Benefits target → realized')
  })

  it('persists governance only through the existing Project metadata and PUT contract', () => {
    expect(model).toContain("PROJECT_GOVERNANCE_KEY = 'project_governance_v1'")
    expect(source).toContain("apiFetch(`/api/v1/projects/${nextProject.id}`")
    expect(source).toContain("method: 'PUT'")
    expect(source).not.toContain('/api/v2/')
    expect(source).not.toContain('/api/v1/project-governance')
    expect(source).not.toContain('/api/v1/project-forecast')
  })

  it('keeps forecast and scenario planning deterministic rather than AI-scored', () => {
    for (const marker of ['getProjectForecast', 'simulateProjectScenario', 'forecastFinishOrdinal', 'varianceVsPlanDays']) expect(model).toContain(marker)
    expect(source).toContain('no opaque score')
    expect(source).not.toContain('ai_score')
    expect(source).not.toContain('forecast_score')
  })

  it('stores bounded review snapshots and derives explainable change intelligence', () => {
    expect(model).toContain('captureProjectReviewSnapshot')
    expect(model).toContain('buildProjectChangeIntelligence')
    expect(model).toContain('.slice(0, 24)')
    expect(source).toContain('Capture review snapshot')
    expect(source).toContain('Since last review')
  })

  it('adds RAID, durable decisions, stage gates and evidence readiness without a schema migration', () => {
    for (const marker of ['upsertRaidItem', 'upsertDecisionRecord', 'upsertStageGate', 'toggleStageGateEvidence', 'getEvidenceReadiness']) expect(model).toContain(marker)
    expect(source).toContain('RAID Center')
    expect(source).toContain('Stage gates & evidence readiness')
    expect(source).toContain('Stored inside the existing Project metadata contract; no new backend schema.')
  })

  it('makes benefit targets explicit and keeps realized values sourced from existing Project fields', () => {
    expect(model).toContain('setProjectBenefitTargets')
    expect(model).toContain('getBenefitRealization')
    expect(model).toContain("realized: Number(project?.man_hours_saved) || 0")
    expect(source).toContain('Target not set')
  })

  it('extends stale-write protection to governance and schedule/value truth', () => {
    expect(model).toContain('governance: project?.metadata_json?.[PROJECT_GOVERNANCE_KEY] || null')
    expect(model).toContain('stoploss_minutes_saved')
    expect(model).toContain('dependencies_json')
    expect(source).toContain('Project changed since this view loaded')
  })

  it('preserves the semantic embedded-host adapter and existing execution intelligence surfaces', () => {
    expect(source).toContain('data-project-embedded-host="true"')
    expect(source).not.toContain(':nth-child(')
    expect(source).toContain('Attention Queue 2.0')
    expect(source).toContain('data-project-milestone-tower="true"')
    expect(source).toContain('data-project-roadmap="true"')
    expect(source).toContain('data-project-owner-cockpit="true"')
    expect(source).toContain('WIP limits')
  })
})
