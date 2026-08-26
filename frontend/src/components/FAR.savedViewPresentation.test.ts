import { describe, expect, it } from 'vitest'
import { describeFarSavedViewConfig } from './FAR.savedViewPresentation'
import { sanitizeFarWorkspaceViewConfig } from './FAR.workspaceState'

describe('FAR saved-view lifecycle presentation', () => {
  it('distinguishes active and archived views even when every other view setting matches', () => {
    const active = sanitizeFarWorkspaceViewConfig({
      lifecycleScope: 'active',
      groupBy: 'risk_band',
      hiddenColumns: ['status'],
      quickFilters: { status: ['Analyzing'] },
    })
    const archived = sanitizeFarWorkspaceViewConfig({
      ...active,
      lifecycleScope: 'archived',
    })

    const activeDescription = describeFarSavedViewConfig(active)
    const archivedDescription = describeFarSavedViewConfig(archived)

    expect(activeDescription).toContain('Active ·')
    expect(archivedDescription).toContain('Archived ·')
    expect(activeDescription.replace('Active', 'Archived')).toBe(archivedDescription)
  })

  it('labels legacy saved-view definitions as active after backward-compatible normalization', () => {
    const legacy = sanitizeFarWorkspaceViewConfig({ groupBy: 'raw' })
    expect(describeFarSavedViewConfig(legacy)).toMatch(/^Active ·/)
  })
})
