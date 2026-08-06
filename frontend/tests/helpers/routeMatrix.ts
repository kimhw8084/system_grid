export const goldenWorkspaceRouteMatrix = [
  { key: 'monitoring', path: '/monitoring', name: 'Monitoring', archetype: 'table', definitionArchetype: 'table' },
  { key: 'assets', path: '/asset', name: 'Assets', archetype: 'table', definitionArchetype: 'table' },
  { key: 'services', path: '/services', name: 'Services', archetype: 'table', definitionArchetype: 'table' },
  { key: 'external', path: '/external', name: 'External', archetype: 'table', definitionArchetype: 'table' },
  { key: 'network', path: '/network', name: 'Network', archetype: 'hybrid', definitionArchetype: 'topology_hybrid' },
  { key: 'far', path: '/far', name: 'FAR', archetype: 'analytical', definitionArchetype: 'investigation' },
  { key: 'research', path: '/research', name: 'Research', archetype: 'analytical', definitionArchetype: 'research' },
  { key: 'vendors', path: '/vendors', name: 'Vendors', archetype: 'table', definitionArchetype: 'table' },
] as const

export const appRouteMatrix = [
  { path: '/', name: 'Dashboard' },
  { path: '/projects', name: 'Projects' },
  { path: '/racks', name: 'Racks' },
  { path: '/asset', name: 'Assets' },
  { path: '/services', name: 'Services' },
  { path: '/external', name: 'External' },
  { path: '/network', name: 'Network' },
  { path: '/architecture', name: 'Architecture' },
  { path: '/research', name: 'Research' },
  { path: '/far', name: 'FAR' },
  { path: '/monitoring', name: 'Monitoring' },
  { path: '/vendors', name: 'Vendors' },
  { path: '/knowledge', name: 'Knowledge' },
  { path: '/logs', name: 'Audit Logs' },
  { path: '/settings', name: 'Settings' },
] as const

export const protectedAppRoutes = appRouteMatrix
  .filter((route) => route.path !== '/')
  .map((route) => route.path)
