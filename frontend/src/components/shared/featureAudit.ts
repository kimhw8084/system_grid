export type FeatureAuditStatus = 'unreviewed' | 'validated' | 'followup' | 'problematic' | 'not_applicable'

export interface FeatureAuditItem {
  id: string
  title: string
  type: 'new' | 'improved' | 'fixed'
  category: 'Command' | 'Assets' | 'Monitoring' | 'Search' | 'Audit' | 'Settings' | 'FAR'
  route: string
  summary: string
  verification: string[]
}

export const FEATURE_AUDIT_ITEMS: FeatureAuditItem[] = [
  {
    id: 'feature-audit-hud-v2',
    title: 'Feature Audit HUD v2',
    type: 'new',
    category: 'Command',
    route: '/',
    summary: 'Centralized rollout HUD with validation states, verification steps, and direct navigation for every major change.',
    verification: [
      'Open the bottom-right Feature Audit HUD from any page.',
      'Change an item status to Validated, Follow-up Needed, and Problematic.',
      'Reload the app and confirm the chosen statuses persist.'
    ]
  },
  {
    id: 'leadership-cockpit',
    title: 'Leadership Cockpit',
    type: 'new',
    category: 'Command',
    route: '/',
    summary: 'Role-aware dashboard card that surfaces audit progress, unstable monitors, and direct paths for validation.',
    verification: [
      'Visit Home and locate the Leadership Cockpit card.',
      'Confirm it shows audit progress, critical monitor count, and direct action buttons.',
      'Use one action button and verify it routes to the intended view.'
    ]
  },
  {
    id: 'global-search-expansion',
    title: 'Expanded Global Search',
    type: 'improved',
    category: 'Search',
    route: '/',
    summary: 'Global search now reaches services, monitoring, knowledge, and network fabric instead of stopping at assets, projects, and FAR.',
    verification: [
      'Press Ctrl/Cmd+K and search for a service, monitor, knowledge title, or network endpoint.',
      'Confirm grouped results appear for the new record types.',
      'Open at least one result from each new type and verify the target view opens with the item selected.'
    ]
  },
  {
    id: 'audit-ledger-actions',
    title: 'Actionable Audit Ledger',
    type: 'improved',
    category: 'Audit',
    route: '/logs',
    summary: 'Audit logs can now export, open the affected entity directly, and show raw change payloads.',
    verification: [
      'Visit Audit Logs and click Export CSV.',
      'Use the entity action on a log row and confirm it navigates to the relevant record.',
      'Open a row change payload and verify the modal shows structured data.'
    ]
  },
  {
    id: 'theme-consistency-fix',
    title: 'Theme Preference Consistency',
    type: 'fixed',
    category: 'Settings',
    route: '/settings',
    summary: 'Theme values are normalized across app shell and settings so the chosen mode persists reliably.',
    verification: [
      'Open Settings and switch between light and dark themes.',
      'Reload the app and confirm the same theme remains active.',
      'Return to Settings and verify the selected theme button still matches the live theme.'
    ]
  },
  {
    id: 'monitoring-incident-jump',
    title: 'Monitoring Incident Jump',
    type: 'improved',
    category: 'Monitoring',
    route: '/monitoring',
    summary: 'Monitoring detail workflows now expose faster escalation paths into related assets, knowledge, and FAR checks.',
    verification: [
      'Open a monitoring record from Monitoring or a dashboard alert.',
      'Use the available incident or related-context actions.',
      'Confirm you can move into the linked asset or related context without manually searching again.'
    ]
  },
  {
    id: 'model-master-v3',
    title: 'Model Master Discovery',
    type: 'improved',
    category: 'Assets',
    route: '/asset',
    summary: 'Discovery engine still triggers when templates exist but are empty, with fuzzy model matching for operators.',
    verification: [
      'Open Assets and start adding an asset.',
      'Enter a model like Firepower 4110.',
      'Confirm discovery assistance appears even when no topography is mapped yet.'
    ]
  },
  {
    id: 'compare-sync-v3',
    title: 'Compare Sync Visibility and Locking',
    type: 'improved',
    category: 'Assets',
    route: '/asset',
    summary: 'Compare view keeps sync actions visible on mismatches and clearly locks unsafe unique-field synchronization.',
    verification: [
      'Select multiple assets and enter Compare mode.',
      'Find a mismatch row and confirm sync is visible for safe fields.',
      'Confirm unique fields show a lock or shield explanation instead of a dangerous sync.'
    ]
  },
  {
    id: 'drift-analysis-ui',
    title: 'Forensic Drift Overlay',
    type: 'new',
    category: 'Assets',
    route: '/asset',
    summary: 'Asset network views flag physical-versus-logical drift directly on ports and topology overlays.',
    verification: [
      'Open an asset detail view and switch to its network context.',
      'Inspect physical topography and look for amber drift indicators.',
      'Confirm drift details are understandable without opening a separate report.'
    ]
  },
  {
    id: 'far-risk-badge',
    title: 'Asset Risk Badge from FAR',
    type: 'new',
    category: 'FAR',
    route: '/asset',
    summary: 'Assets surface live FAR linkage so engineers can see risk context without leaving the system view.',
    verification: [
      'Open an asset that has associated FAR entries.',
      'Confirm the header shows a visible risk badge.',
      'Use the badge or adjacent action to continue into FAR context.'
    ]
  },
  {
    id: 'far-edit-persistence',
    title: 'FAR Edit Persistence',
    type: 'fixed',
    category: 'FAR',
    route: '/far',
    summary: 'Failure mode edits persist cleanly, including updates that previously tripped SQLite datetime handling.',
    verification: [
      'Open a FAR record and enter edit mode.',
      'Change a text field and commit the edit.',
      'Confirm the change persists and no SQLite datetime error appears.'
    ]
  }
]
