import { describe, expect, it } from 'vitest'
import { buildFarLifecycleWorkspaceTransition } from './FAR.lifecycleWorkspace'

describe('FAR lifecycle workspace transition', () => {
  it('clears selection and stale dossier state for ordinary lifecycle/view changes', () => {
    expect(buildFarLifecycleWorkspaceTransition('archived', false)).toEqual({
      lifecycleScope: 'archived',
      applyLifecycleScope: true,
      clearSelection: true,
      clearDossier: true,
    })
  })

  it('keeps an explicit dossier deep link authoritative over saved-view lifecycle context', () => {
    expect(buildFarLifecycleWorkspaceTransition('active', true)).toEqual({
      lifecycleScope: 'active',
      applyLifecycleScope: false,
      clearSelection: false,
      clearDossier: false,
    })
  })
})
