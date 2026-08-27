import { describe, expect, it } from 'vitest'
import {
  buildFarWorkspaceRestorationPlan,
  farRestorationDossierKey,
  projectFarDurableWorkspaceDefinition,
  selectFarRestorationBase,
} from './FAR.restoration'
import { sanitizeFarWorkspaceViewConfig } from './FAR.workspaceState'

const localWorking = sanitizeFarWorkspaceViewConfig({
  lifecycleScope: 'active',
  quickFilter: 'local search',
  groupBy: 'risk_band',
  hiddenColumns: ['status'],
})
const remoteWorking = sanitizeFarWorkspaceViewConfig({
  lifecycleScope: 'archived',
  quickFilter: 'remote search',
  rowDensity: 12,
})
const sharedView = sanitizeFarWorkspaceViewConfig({
  lifecycleScope: 'active',
  quickFilter: 'team search',
  groupBy: 'system_name',
  filterModel: { status: { filterType: 'text', filter: 'Analyzing' } },
  sortModel: [{ colId: 'rpn', sort: 'desc' }],
  columnLayoutState: [{ colId: 'title', width: 320 }],
})

const archivedDossier = {
  targetId: 82,
  lifecycleScope: 'archived' as const,
  title: 'Archived power loss',
  tab: 'versions' as const,
}

describe('FAR restoration coordinator', () => {
  it('enforces shared-view > remote working-state > local working-state precedence', () => {
    expect(selectFarRestorationBase({
      requestedViewId: '17',
      requestedViewConfig: sharedView,
      collaborativeStatus: 'synced',
      userSettingsReady: true,
      remoteWorkingDefinition: remoteWorking,
      localWorkingDefinition: localWorking,
    })).toMatchObject({ kind: 'ready', source: 'shared-view', activeViewId: '17', clearRequestedView: false })

    expect(selectFarRestorationBase({
      requestedViewId: null,
      requestedViewConfig: null,
      collaborativeStatus: 'synced',
      userSettingsReady: true,
      remoteWorkingDefinition: remoteWorking,
      localWorkingDefinition: localWorking,
    })).toMatchObject({ kind: 'ready', source: 'remote-working-state' })

    expect(selectFarRestorationBase({
      requestedViewId: null,
      requestedViewConfig: null,
      collaborativeStatus: 'synced',
      userSettingsReady: true,
      remoteWorkingDefinition: null,
      localWorkingDefinition: localWorking,
    })).toMatchObject({ kind: 'ready', source: 'local-working-state' })
  })

  it('waits for authoritative view/settings hydration before declaring a missing shared view', () => {
    expect(selectFarRestorationBase({
      requestedViewId: '404',
      requestedViewConfig: null,
      collaborativeStatus: 'loading',
      userSettingsReady: false,
      remoteWorkingDefinition: null,
      localWorkingDefinition: localWorking,
    })).toEqual({ kind: 'pending' })

    expect(selectFarRestorationBase({
      requestedViewId: '404',
      requestedViewConfig: null,
      collaborativeStatus: 'synced',
      userSettingsReady: true,
      remoteWorkingDefinition: remoteWorking,
      localWorkingDefinition: localWorking,
    })).toMatchObject({
      kind: 'ready',
      source: 'remote-working-state',
      activeViewId: null,
      clearRequestedView: true,
    })
  })

  it('lets an explicit dossier own lifecycle and record search while preserving compatible view filters/layout', () => {
    const plan = buildFarWorkspaceRestorationPlan({
      definition: sharedView,
      workspaceSource: 'shared-view',
      dossier: archivedDossier,
    })

    expect(plan.config.lifecycleScope).toBe('archived')
    expect(plan.config.quickFilter).toBe('Archived power loss')
    expect(plan.config.groupBy).toBe('system_name')
    expect(plan.config.filterModel).toEqual(sharedView.filterModel)
    expect(plan.config.sortModel).toEqual(sharedView.sortModel)
    expect(plan.config.columnLayoutState).toEqual(sharedView.columnLayoutState)
    expect(plan.fieldSources).toEqual({
      lifecycleScope: 'explicit-dossier',
      quickFilter: 'explicit-dossier',
      filters: 'shared-view',
      sort: 'shared-view',
      grouping: 'shared-view',
      display: 'shared-view',
      columnLayout: 'shared-view',
      dossier: 'explicit-dossier',
    })
  })

  it('projects dossier-only lifecycle/search overrides out of durable working state without losing compatible edits', () => {
    const visibleDuringDossier = sanitizeFarWorkspaceViewConfig({
      ...sharedView,
      lifecycleScope: 'archived',
      quickFilter: 'Archived power loss',
      rowDensity: 14,
      hiddenColumns: ['status', 'linked_rcas'],
    })
    const durable = projectFarDurableWorkspaceDefinition({
      currentDefinition: visibleDuringDossier,
      dossierBaseDefinition: sharedView,
      dossierActive: true,
    })

    expect(durable.lifecycleScope).toBe('active')
    expect(durable.quickFilter).toBe('team search')
    expect(durable.rowDensity).toBe(14)
    expect(durable.hiddenColumns).toEqual(['status', 'linked_rcas'])
  })

  it('uses a deterministic dossier key for record/lifecycle/tab/back-forward transitions', () => {
    expect(farRestorationDossierKey(archivedDossier)).toBe('82:archived:versions:Archived power loss')
    expect(farRestorationDossierKey({ ...archivedDossier, tab: 'history' })).not.toBe(farRestorationDossierKey(archivedDossier))
    expect(farRestorationDossierKey(null)).toBeNull()
  })
})
