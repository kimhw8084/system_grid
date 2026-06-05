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
  requiredBaseline: string[]
  gridBehaviorContract: string[]
  modalBehaviorContract: string[]
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
    'Native command bar with search, views, display controls, export, registry access, and bulk actions',
    'Operational grid with saved views, grouping, column controls, hover previews, and right-click actions',
    'Add/edit workspace with sticky identity header, full-width focused tab content, collapsible cards, inline validation, and consistent action footer',
    'History, compare, and detail dossier flows for versioned operational records using split-view sidebars where context is required',
  ],
  requiredBaseline: [
    'Consistent page header and toolbar shell',
    'Saved views and display controls where the view is table-centric',
    'Add/edit modal with sticky identity fields, focused full-width sections, and inline validation',
    'Hover previews for dense linked data where scan speed matters',
    'Shared native floating panels for menus, context actions, and linked record browsing',
    'History and archive/restore behavior when the entity lifecycle supports it',
  ],
  gridBehaviorContract: [
    'Saved views persist search, filters, grouping, sort, and column visibility together',
    'Display controls manage density and column presentation without mutating record data',
    'Default grid layouts auto-size visible content columns when longer data arrives, without overriding fixed utility columns or explicit saved/manual layouts',
    'All operational timestamps render in the app runtime local timezone consistently across grid cells, hover previews, detail surfaces, and history flows',
    'Grouping and right-click actions are available only where the entity benefits from operational table workflows',
    'Bulk actions operate on explicit selection state and never on hidden implicit scope',
    'Hover previews expose dense linked data without forcing modal navigation',
    'Context menus preserve anchor behavior while sharing the same native visual shell',
  ],
  modalBehaviorContract: [
    'Add/edit uses a sticky identity header for the primary record fields',
    'Focused content areas occupy the full modal width to maximize horizontal scanning in complex forms',
    'Tabbed sections keep validation visible with field errors and tab-level counts',
    'Large workspace and detail modals use standardized dossier-style shells rather than one-off layouts',
    'Sections can collapse without hiding validation context or breaking save flow',
    'Required fields are marked in the form, not only rejected by the backend',
    'The footer keeps cancel and save actions in a consistent location across views',
    'History, compare, and archive/restore appear only when the backing entity supports them',
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

export const OPERATIONAL_WORKSPACE_MINIMUM_STANDARD = [
  'Shared page header and toolbar shell',
  'Shared table/workspace state model for search, filters, views, and selection',
  'Shared add/edit modal shell with sticky identity, tabs, validation, and footer actions',
  'Per-view adapter contract for schema, actions, validation rules, and linked selectors',
] as const

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
