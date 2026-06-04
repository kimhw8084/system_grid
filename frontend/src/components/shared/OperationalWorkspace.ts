export type WorkspaceCapability =
  | 'savedViews'
  | 'displayControls'
  | 'grouping'
  | 'contextMenu'
  | 'bulkActions'
  | 'hoverPreviews'
  | 'history'
  | 'compare'
  | 'linkedRecords'
  | 'archiveRestore'
  | 'stickyIdentityHeader'
  | 'frontendValidation'
  | 'searchableSelectors'

export interface WorkspaceDefinition {
  workspaceName: string
  standardSurface: string[]
  sharedCapabilities: WorkspaceCapability[]
  monitoringSpecificFeatures: string[]
}

// Canonical visual tokens extracted from the Monitoring workspace.
// Future operational views should compose these tokens rather than copy raw class strings.
export const OPERATIONAL_WORKSPACE_VISUALS = {
  shellRadius: 'rounded-lg',
  panelSurface: 'rounded-lg border border-white/10 bg-white/[0.03]',
  insetSurface: 'rounded-lg border border-white/10 bg-black/20',
  floatingSurface: 'rounded-lg border border-white/10 bg-[#020617]',
  controlSurface: 'rounded-lg border border-white/10 bg-slate-950/70',
  toolbarSurface: 'rounded-lg border border-white/5 bg-white/5',
  titleText: 'text-sm font-black tracking-tight text-slate-100',
  subtitleText: 'text-[10px] font-semibold text-slate-400',
  hintText: 'text-[10px] font-semibold text-slate-500',
  fieldLabelText: 'text-[clamp(10px,0.82vw,12px)] font-black text-slate-500',
  fieldErrorText: 'text-[clamp(10px,0.78vw,11px)] font-black text-rose-400',
  bodyControlText: 'text-[clamp(12px,0.95vw,14px)] font-bold text-white',
  selectionText: 'text-[clamp(11px,0.9vw,13px)] font-black',
} as const

// Monitoring is the source-of-truth operational workspace.
// This checklist is the contract future applicable views should inherit by default.
export const MONITORING_WORKSPACE_STANDARD: WorkspaceDefinition = {
  workspaceName: 'Monitoring',
  standardSurface: [
    'Page header with title, subtitle, actions, and active/archive segmented state',
    'Toolbar with search, views, display controls, export, registry access, and bulk actions',
    'Operational grid with saved views, grouping, column controls, hover previews, and right-click actions',
    'Add/edit modal with sticky identity header, tabbed sections, inline validation, and consistent action footer',
    'History and compare flows for versioned operational records',
  ],
  sharedCapabilities: [
    'savedViews',
    'displayControls',
    'grouping',
    'contextMenu',
    'bulkActions',
    'hoverPreviews',
    'history',
    'compare',
    'linkedRecords',
    'archiveRestore',
    'stickyIdentityHeader',
    'frontendValidation',
    'searchableSelectors',
  ],
  monitoringSpecificFeatures: [
    'Logic editor with syntax-aware CodeMirror behavior',
    'Critical severity recovery-document enforcement',
    'Monitoring platform and frequency guardrail validation',
    'Team-or-individual ownership exclusivity for monitors',
    'Monitoring URL sanitization and safety rules',
  ],
}

// Adapter shape for future view migrations after schema stabilization.
export interface OperationalWorkspaceAdapter {
  entityLabel: string
  supports: WorkspaceCapability[]
  hasAdvancedEditor?: boolean
  hasLinkedKnowledge?: boolean
  hasVersioning?: boolean
}

export const OPERATIONAL_WORKSPACE_CAPABILITY_MATRIX: Record<string, OperationalWorkspaceAdapter> = {
  monitoring: {
    entityLabel: 'Monitor',
    supports: MONITORING_WORKSPACE_STANDARD.sharedCapabilities,
    hasAdvancedEditor: true,
    hasLinkedKnowledge: true,
    hasVersioning: true,
  },
  architecture: {
    entityLabel: 'Architecture flow',
    supports: ['savedViews', 'displayControls', 'grouping', 'contextMenu', 'bulkActions', 'hoverPreviews', 'history', 'linkedRecords', 'archiveRestore', 'stickyIdentityHeader', 'frontendValidation', 'searchableSelectors'],
    hasAdvancedEditor: false,
    hasLinkedKnowledge: true,
    hasVersioning: true,
  },
  knowledge: {
    entityLabel: 'Knowledge entry',
    supports: ['savedViews', 'displayControls', 'grouping', 'contextMenu', 'bulkActions', 'hoverPreviews', 'history', 'compare', 'linkedRecords', 'archiveRestore', 'stickyIdentityHeader', 'frontendValidation', 'searchableSelectors'],
    hasAdvancedEditor: true,
    hasLinkedKnowledge: false,
    hasVersioning: true,
  },
  vendors: {
    entityLabel: 'Vendor record',
    supports: ['savedViews', 'displayControls', 'grouping', 'contextMenu', 'bulkActions', 'hoverPreviews', 'history', 'linkedRecords', 'archiveRestore', 'stickyIdentityHeader', 'frontendValidation', 'searchableSelectors'],
    hasAdvancedEditor: false,
    hasLinkedKnowledge: false,
    hasVersioning: false,
  },
  rca: {
    entityLabel: 'RCA record',
    supports: ['savedViews', 'displayControls', 'grouping', 'contextMenu', 'bulkActions', 'hoverPreviews', 'history', 'compare', 'linkedRecords', 'archiveRestore', 'stickyIdentityHeader', 'frontendValidation', 'searchableSelectors'],
    hasAdvancedEditor: true,
    hasLinkedKnowledge: true,
    hasVersioning: true,
  },
  projects: {
    entityLabel: 'Project',
    supports: ['savedViews', 'displayControls', 'grouping', 'contextMenu', 'bulkActions', 'hoverPreviews', 'history', 'linkedRecords', 'archiveRestore', 'stickyIdentityHeader', 'frontendValidation', 'searchableSelectors'],
    hasAdvancedEditor: false,
    hasLinkedKnowledge: false,
    hasVersioning: true,
  },
}
