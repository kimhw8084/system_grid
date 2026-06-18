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
