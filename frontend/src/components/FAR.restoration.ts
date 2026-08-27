import type { FarDossierTab } from './FAR.rowActions'
import {
  DEFAULT_FAR_VIEW_CONFIG,
  sanitizeFarWorkspaceViewConfig,
  type FarLifecycleScope,
  type FarWorkspaceViewConfig,
} from './FAR.workspaceState'

export type FarWorkspaceRestorationSource =
  | 'shared-view'
  | 'remote-working-state'
  | 'local-working-state'
  | 'current-workspace'
  | 'default'

export type FarRestorationDossierContext = {
  targetId: number
  lifecycleScope: FarLifecycleScope
  title: string
  tab: FarDossierTab
}

export type FarRestorationFieldSource = FarWorkspaceRestorationSource | 'explicit-dossier'

export type FarRestorationFieldSources = {
  lifecycleScope: FarRestorationFieldSource
  quickFilter: FarRestorationFieldSource
  filters: FarWorkspaceRestorationSource
  sort: FarWorkspaceRestorationSource
  grouping: FarWorkspaceRestorationSource
  display: FarWorkspaceRestorationSource
  columnLayout: FarWorkspaceRestorationSource
  dossier: 'explicit-dossier' | 'none'
}

export type FarWorkspaceRestorationPlan = {
  baseConfig: FarWorkspaceViewConfig
  config: FarWorkspaceViewConfig
  workspaceSource: FarWorkspaceRestorationSource
  dossier: FarRestorationDossierContext | null
  fieldSources: FarRestorationFieldSources
}

export type FarRestorationBaseSelection =
  | { kind: 'pending' }
  | {
      kind: 'ready'
      definition: FarWorkspaceViewConfig
      source: FarWorkspaceRestorationSource
      activeViewId?: string | null
      clearRequestedView: boolean
    }

export function farRestorationDossierKey(dossier: FarRestorationDossierContext | null): string | null {
  if (!dossier) return null
  return `${dossier.targetId}:${dossier.lifecycleScope}:${dossier.tab}:${dossier.title}`
}

export function selectFarRestorationBase({
  requestedViewId,
  requestedViewConfig,
  collaborativeStatus,
  userSettingsReady,
  remoteWorkingDefinition,
  localWorkingDefinition,
}: {
  requestedViewId: string | null
  requestedViewConfig: unknown | null
  collaborativeStatus: string
  userSettingsReady: boolean
  remoteWorkingDefinition: unknown | null
  localWorkingDefinition: unknown
}): FarRestorationBaseSelection {
  if (requestedViewId) {
    if (requestedViewConfig) {
      return {
        kind: 'ready',
        definition: sanitizeFarWorkspaceViewConfig(requestedViewConfig),
        source: 'shared-view',
        activeViewId: requestedViewId,
        clearRequestedView: false,
      }
    }
    if (collaborativeStatus === 'loading' || !userSettingsReady) return { kind: 'pending' }
  } else if (!userSettingsReady) {
    return { kind: 'pending' }
  }

  if (remoteWorkingDefinition) {
    return {
      kind: 'ready',
      definition: sanitizeFarWorkspaceViewConfig(remoteWorkingDefinition),
      source: 'remote-working-state',
      activeViewId: null,
      clearRequestedView: Boolean(requestedViewId),
    }
  }

  if (localWorkingDefinition) {
    return {
      kind: 'ready',
      definition: sanitizeFarWorkspaceViewConfig(localWorkingDefinition),
      source: 'local-working-state',
      activeViewId: null,
      clearRequestedView: Boolean(requestedViewId),
    }
  }

  return {
    kind: 'ready',
    definition: DEFAULT_FAR_VIEW_CONFIG,
    source: 'default',
    activeViewId: null,
    clearRequestedView: Boolean(requestedViewId),
  }
}

export function buildFarWorkspaceRestorationPlan({
  definition,
  workspaceSource,
  dossier,
}: {
  definition: unknown
  workspaceSource: FarWorkspaceRestorationSource
  dossier: FarRestorationDossierContext | null
}): FarWorkspaceRestorationPlan {
  const baseConfig = sanitizeFarWorkspaceViewConfig(definition)
  const dossierTitle = dossier?.title?.trim().slice(0, 500) || ''
  const config = dossier
    ? sanitizeFarWorkspaceViewConfig({
        ...baseConfig,
        lifecycleScope: dossier.lifecycleScope,
        quickFilter: dossierTitle || baseConfig.quickFilter,
      })
    : baseConfig
  const dossierOverridesQuickFilter = Boolean(dossier && dossierTitle)

  return {
    baseConfig,
    config,
    workspaceSource,
    dossier,
    fieldSources: {
      lifecycleScope: dossier ? 'explicit-dossier' : workspaceSource,
      quickFilter: dossierOverridesQuickFilter ? 'explicit-dossier' : workspaceSource,
      filters: workspaceSource,
      sort: workspaceSource,
      grouping: workspaceSource,
      display: workspaceSource,
      columnLayout: workspaceSource,
      dossier: dossier ? 'explicit-dossier' : 'none',
    },
  }
}

export function projectFarDurableWorkspaceDefinition({
  currentDefinition,
  dossierBaseDefinition,
  dossierActive,
}: {
  currentDefinition: unknown
  dossierBaseDefinition: unknown | null
  dossierActive: boolean
}): FarWorkspaceViewConfig {
  const current = sanitizeFarWorkspaceViewConfig(currentDefinition)
  if (!dossierActive || !dossierBaseDefinition) return current
  const base = sanitizeFarWorkspaceViewConfig(dossierBaseDefinition)
  return sanitizeFarWorkspaceViewConfig({
    ...current,
    lifecycleScope: base.lifecycleScope,
    quickFilter: base.quickFilter,
  })
}
