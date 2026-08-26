import type { FarLifecycleScope } from './FAR.workspaceState'

export type FarLifecycleWorkspaceTransition = {
  lifecycleScope: FarLifecycleScope
  applyLifecycleScope: boolean
  clearSelection: boolean
  clearDossier: boolean
}

export function buildFarLifecycleWorkspaceTransition(
  lifecycleScope: FarLifecycleScope,
  hasExplicitDossierLink: boolean,
): FarLifecycleWorkspaceTransition {
  const applyWorkspaceContext = !hasExplicitDossierLink
  return {
    lifecycleScope,
    applyLifecycleScope: applyWorkspaceContext,
    clearSelection: applyWorkspaceContext,
    clearDossier: applyWorkspaceContext,
  }
}
