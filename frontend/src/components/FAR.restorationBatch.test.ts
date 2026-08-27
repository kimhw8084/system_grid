import { describe, expect, it } from 'vitest'

import { buildFarWorkspaceLink } from './FAR.deepLink'
import {
  buildFarWorkspaceRestorationPlan,
  projectFarDurableWorkspaceDefinition,
} from './FAR.restoration'
import { FAR_CONTEXT_DETAIL_TABS } from './FAR.rowActions'
import {
  createDefaultFarQuickFilters,
  filterFarModes,
  groupFarModes,
  normalizeFarQuickFilters,
} from './FAR.workspaceModel'
import { sanitizeFarWorkspaceViewConfig } from './FAR.workspaceState'
import {
  getVisibleLogicalRowIds,
  normalizeSelectedNodeIds,
} from './shared/OperationalGridInteractions'

const modes = [
  {
    id: 11,
    system_name: 'Power',
    failure_type: 'Electrical',
    title: 'Voltage sag',
    effect: 'Rack reboot',
    status: 'Analyzing',
    rpn: 180,
    affected_assets: [{ name: 'Rack A' }],
    causes: [{ title: 'Utility dip' }],
    mitigations: [{ title: 'UPS' }],
    prevention_actions: [{ title: 'Transfer test' }],
    linked_rcas: [{ id: 91, title: 'INC-91' }],
  },
  {
    id: 12,
    system_name: 'Cooling',
    failure_type: 'Thermal',
    title: 'Hot aisle rise',
    status: 'Prevented',
    rpn: 60,
  },
]

describe('FAR restoration/navigation G-batch acceptance', () => {
  it('guards G35-G42/G48 grouping, multidimensional filters, clear-all defaults, and full-domain search together', () => {
    const filters = normalizeFarQuickFilters({
      system_name: ['Power', 'Power'],
      failure_type: ['Electrical'],
      status: ['Analyzing'],
      risk_band: ['critical'],
    })
    expect(filterFarModes(modes, 'utility dip', filters).map((mode) => mode.id)).toEqual([11])
    expect(filterFarModes(modes, 'INC-91', filters).map((mode) => mode.id)).toEqual([11])
    expect(groupFarModes(modes, 'system_name').map((group) => group.label)).toEqual(['Cooling', 'Power'])
    expect(groupFarModes(modes, 'risk_band').map((group) => group.label)).toEqual([
      'Critical · RPN ≥ 150',
      'Controlled · RPN < 80',
    ])
    expect(createDefaultFarQuickFilters()).toEqual({
      system_name: [],
      failure_type: [],
      status: [],
      risk_band: [],
    })
  })

  it('guards G48 selection-scope primitives with stable logical ids and visible-order filtering', () => {
    expect(normalizeSelectedNodeIds([
      { data: { id: 12 } },
      { data: { id: 11 } },
      { data: { id: 12 } },
      { data: { id: null } },
    ])).toEqual([12, 11])

    const api = {
      forEachNodeAfterFilterAndSort: (visit: (node: unknown) => void) => [11, 12, 13].forEach((id) => visit({ data: { id } })),
    }
    expect(getVisibleLogicalRowIds(api, [12])).toEqual([11, 13])
  })

  it('guards G22/G24/G57 durable display/layout state while dossier navigation temporarily owns only lifecycle/search', () => {
    const base = sanitizeFarWorkspaceViewConfig({
      lifecycleScope: 'active',
      fontSize: 13,
      rowDensity: 14,
      hiddenColumns: ['status'],
      groupBy: 'risk_band',
      showFilterBar: false,
      quickFilter: 'power',
      quickFilters: { status: ['Analyzing'] },
      filterModel: { status: { filterType: 'text', filter: 'Analyzing' } },
      sortModel: [{ colId: 'rpn', sort: 'desc' }],
      columnLayoutState: [{ colId: 'title', width: 340 }, { colId: 'rpn', pinned: 'right' }],
    })
    const plan = buildFarWorkspaceRestorationPlan({
      definition: base,
      workspaceSource: 'shared-view',
      dossier: { targetId: 82, lifecycleScope: 'archived', title: 'Archived vector', tab: 'history' },
    })

    expect(plan.config).toMatchObject({
      lifecycleScope: 'archived',
      quickFilter: 'Archived vector',
      fontSize: 13,
      rowDensity: 14,
      hiddenColumns: ['status'],
      groupBy: 'risk_band',
      showFilterBar: false,
      filterModel: base.filterModel,
      sortModel: base.sortModel,
      columnLayoutState: base.columnLayoutState,
    })
    expect(projectFarDurableWorkspaceDefinition({
      currentDefinition: plan.config,
      dossierBaseDefinition: plan.baseConfig,
      dossierActive: true,
    })).toEqual(base)
  })

  it('guards G53/G82 combined context-history navigation with one canonical share/refresh link', () => {
    expect(FAR_CONTEXT_DETAIL_TABS).toEqual({
      detail: 'causal',
      versionHistory: 'versions',
      researchHistory: 'history',
    })
    expect(buildFarWorkspaceLink(
      'https://sysgrid.example/far?tenant=alpha&signals=open',
      { viewId: '17', targetId: 82, tab: FAR_CONTEXT_DETAIL_TABS.researchHistory },
    )).toBe('https://sysgrid.example/far?tenant=alpha&signals=open&view=17&id=82&tab=history')
  })
})
