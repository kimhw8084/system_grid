const fs = require('fs')
const path = require('path')

const frontendRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendRoot, '..')
const read = (relative) => fs.readFileSync(path.resolve(repoRoot, relative), 'utf8')
const failures = []

const workspaces = [
  { file: 'frontend/src/components/MonitoringGrid.tsx', key: 'monitoring', route: '/monitoring', archetype: 'table', definitionArchetype: 'table' },
  { file: 'frontend/src/components/assets/AssetGoldenShellScaffold.tsx', key: 'assets', route: '/asset', archetype: 'table', definitionArchetype: 'table' },
  { file: 'frontend/src/components/ServicesReal.tsx', key: 'services', route: '/services', archetype: 'table', definitionArchetype: 'table' },
  { file: 'frontend/src/components/External.tsx', key: 'external', route: '/external', archetype: 'table', definitionArchetype: 'table' },
  { file: 'frontend/src/components/NetworkReal.tsx', key: 'network', route: '/network', archetype: 'hybrid', definitionArchetype: 'topology_hybrid' },
  { file: 'frontend/src/components/FAR.tsx', key: 'far', route: '/far', archetype: 'analytical', definitionArchetype: 'investigation' },
  { file: 'frontend/src/components/Research.tsx', key: 'research', route: '/research', archetype: 'analytical', definitionArchetype: 'research' },
  { file: 'frontend/src/components/vendors/VendorGoldenOperationalWorkspace.tsx', key: 'vendors', route: '/vendors', archetype: 'table', definitionArchetype: 'table' },
]

const app = read('frontend/src/App.tsx')
const backend = read('backend/app/api/workspaces.py')
const routeMatrix = read('frontend/tests/helpers/routeMatrix.ts')
const sharedShell = read('frontend/src/components/shared/OperationalWorkspaceShells.tsx')
if (!sharedShell.includes('workspace: GoldenWorkspaceKey') || sharedShell.includes('workspace?: string')) failures.push('Shared shell must require a typed workspace identity')
if (!sharedShell.includes('archetype: GoldenWorkspaceArchetype') || sharedShell.includes('archetype?: GoldenWorkspaceArchetype')) failures.push('Shared shell must require an explicit archetype')

for (const workspace of workspaces) {
  const absolute = path.resolve(repoRoot, workspace.file)
  if (!fs.existsSync(absolute)) { failures.push(`${workspace.file}: file not found`); continue }
  const source = read(workspace.file)
  if (!source.includes('OperationalWorkspaceShell')) failures.push(`${workspace.file}: missing OperationalWorkspaceShell`)
  if (!source.includes(`workspace="${workspace.key}"`)) failures.push(`${workspace.file}: missing workspace="${workspace.key}"`)
  if (!source.includes(`archetype="${workspace.archetype}"`)) failures.push(`${workspace.file}: missing archetype="${workspace.archetype}"`)
  if (!app.includes(`<Route path="${workspace.route}"`)) failures.push(`App.tsx: missing ${workspace.key} route ${workspace.route}`)
  if (!backend.includes(`"${workspace.key}", "${workspace.route}", "${workspace.definitionArchetype}"`)) failures.push(`Backend workspace definition mismatch for ${workspace.key}`)
  if (!routeMatrix.includes(`key: '${workspace.key}', path: '${workspace.route}'`)) failures.push(`Golden route matrix mismatch for ${workspace.key}`)
}

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const absolute = path.join(dir, entry.name)
  return entry.isDirectory() ? walk(absolute) : [absolute]
})
for (const file of walk(path.resolve(frontendRoot, 'tests')).filter((file) => file.endsWith('.ts'))) {
  if (/['"]\/assets(?:['"?])/.test(fs.readFileSync(file, 'utf8'))) failures.push(`${path.relative(frontendRoot, file)}: stale /assets route`)
}

if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
console.log(`Golden Eight shell, route, identity, and registry contracts validated for ${workspaces.length} workspaces.`)
