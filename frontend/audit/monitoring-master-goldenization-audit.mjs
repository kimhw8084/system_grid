#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const defaultConfigPath = path.join(scriptDir, 'monitoring-master-targets.json')

function parseArgs(argv) {
  const args = { repoRoot: path.resolve(scriptDir, '..', '..'), output: null, runtimeDir: null, config: defaultConfigPath }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--repo-root') args.repoRoot = path.resolve(argv[++index])
    else if (arg === '--output') args.output = path.resolve(argv[++index])
    else if (arg === '--runtime-dir') args.runtimeDir = path.resolve(argv[++index])
    else if (arg === '--config') args.config = path.resolve(argv[++index])
    else if (arg === '--help') args.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function resolveExisting(candidates) {
  return candidates.find((candidate) => fs.existsSync(candidate)) || null
}

export function resolveImport(fromFile, importPath) {
  if (!importPath.startsWith('.')) return null
  const base = path.resolve(path.dirname(fromFile), importPath)
  return resolveExisting([
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
  ])
}

export function importClosure(entryFile, sourceRoot) {
  const seen = new Set()
  const queue = [entryFile]
  const importPattern = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g

  while (queue.length) {
    const current = queue.shift()
    if (!current || seen.has(current) || !fs.existsSync(current)) continue
    seen.add(current)
    const text = readText(current)
    for (const match of text.matchAll(importPattern)) {
      const resolved = resolveImport(current, match[1])
      if (resolved && resolved.startsWith(sourceRoot) && !seen.has(resolved)) queue.push(resolved)
    }
  }
  return [...seen]
}

const SIGNALS = {
  shell: /OperationalWorkspaceShell|AssetGoldenShellScaffold|AssetGoldenOperationalWorkspace|VendorGoldenOperationalWorkspace/,
  commandBar: /WorkspaceCommandBar|PageToolbar|WorkspaceShareHeader/,
  grid: /OperationalDataGrid|OperationalGridStandard|AgGridReact|role=["']treegrid["']/,
  savedViews: /savedViews|SavedViews|\bViews\b/,
  display: /\bDisplay\b|display-menu-container|hiddenColumns|columnLayoutState/,
  rowActions: /OperationalRowActionMenu|row-action-menu-container|More actions|contextmenu/,
  bulk: /OperationalBulk|Bulk Actions|selectedRows|selectedIds/,
  flyout: /WorkspaceFlyout|display-menu-container|saved-view|floating|popover/,
  modal: /WorkspaceModal|WorkspaceModalShell|role=["']dialog["']|glass-panel/,
  dirty: /dirty|Dirty|beforeunload|unsaved/i,
  lifecycle: /OperationalDataState|OperationalDataStatus|activeTab|archived|deleted|removed|inactive/,
  importExport: /OperationalImport|BulkImport|ImportModal|Export CSV|Download Template|clipboard/,
  persistence: /localStorage|sessionStorage|settings\/user\/settings|workspace_state/,
  workspaceMarker: /data-workspace/,
}

export function scanSignals(files) {
  const merged = files.map((file) => readText(file)).join('\n')
  return Object.fromEntries(Object.entries(SIGNALS).map(([key, pattern]) => [key, pattern.test(merged)]))
}

export function routeEvidence(appSource, target) {
  const escapedRoute = target.route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const routePattern = new RegExp(`path=["']${escapedRoute}["'][\\s\\S]{0,500}<${target.routeComponent}\\b`)
  const importPattern = new RegExp(`import\\s+${target.routeComponent}\\s+from\\s+["'][^"']+["']`)
  return {
    routeLiteralPresent: appSource.includes(`path="${target.route}"`) || appSource.includes(`path='${target.route}'`),
    routeComponentPresent: routePattern.test(appSource),
    componentImportPresent: importPattern.test(appSource),
  }
}

function runtimeEvidence(runtimeDir, key) {
  if (!runtimeDir) return null
  const filePath = path.join(runtimeDir, `${key}.json`)
  return fs.existsSync(filePath) ? readJson(filePath) : null
}

function status(value, absent = 'FAIL') {
  if (value === null || value === undefined) return 'PARTIAL'
  return value ? 'PASS' : absent
}

function containsAny(values, expected) {
  const haystack = (values || []).map((value) => String(value).toLowerCase())
  return expected.some((item) => haystack.some((value) => value.includes(item.toLowerCase())))
}

export function classify(target, source, runtime) {
  const seeded = runtime?.seeded || null
  const blank = runtime?.blank || null
  const panel = runtime?.panelProbe || null
  const modal = runtime?.modalProbe || null
  const archetype = target.archetype
  const buttons = seeded?.buttons || []
  const inputs = seeded?.placeholders || []
  const routeSourcePass = source.route.routeLiteralPresent && source.route.routeComponentPresent && source.route.componentImportPresent
  const routeStatus = routeSourcePass ? (runtime ? status(runtime.routeLoaded === true) : 'PARTIAL') : 'FAIL'
  const gridApplicable = archetype !== 'custom'
  const fileFlowApplicable = archetype !== 'custom'

  return {
    'route-and-source-wiring': routeStatus,
    'shell-header-toolbar': status(source.signals.shell && source.signals.commandBar && seeded?.headingVisible),
    'search-filter-saved-display': status(
      source.signals.savedViews && source.signals.display &&
      (target.searchPlaceholders.length === 0 || containsAny(inputs, target.searchPlaceholders)) &&
      (target.searchPlaceholders.length === 0 || seeded?.filteredToSeed === true) &&
      containsAny(buttons, ['Views', 'Display']),
      archetype === 'custom' ? 'N/A' : 'FAIL',
    ),
    'grid-or-custom-body': gridApplicable
      ? status(source.signals.grid && seeded?.treegridCount > 0)
      : status(source.signals.workspaceMarker && seeded?.workspaceMarkers?.length > 0),
    'selection-row-context-bulk': gridApplicable
      ? status(source.signals.rowActions && source.signals.bulk && seeded?.rowCount > 0 && seeded?.selectionCheckboxCount > 0)
      : 'N/A',
    'floating-panels': status(source.signals.flyout && panel?.verified === true, archetype === 'custom' ? 'PARTIAL' : 'FAIL'),
    'modal-form-dirty-state': status(source.signals.modal && source.signals.dirty && modal?.verified === true && modal?.closedBeforeResponsive === true),
    'lifecycle-and-blank-state': status(source.signals.lifecycle && blank?.captured === true && blank?.headingVisible === true && blank?.tenant?.backendSelected === true && blank?.tenant?.activeLabelVerified === true),
    'import-export-file-flow': fileFlowApplicable
      ? status(source.signals.importExport && containsAny(buttons, ['Import', 'Export']))
      : 'N/A',
    'domain-preservation': runtime?.seeded?.domainSeedCreated ? 'PARTIAL' : 'FAIL',
    'responsive-layout': runtime?.constrained?.captured && runtime?.constrained?.baseSurfaceClean === true && runtime?.constrained?.modalClosedBeforeCapture === true && runtime?.constrained?.tenant?.activeLabelVerified === true ? 'PARTIAL' : 'FAIL',
    'guard-and-runtime-proof': runtime?.routeLoaded && source.files.length > 0 ? 'PARTIAL' : 'FAIL',
  }
}

function markdownTable(rows, columns) {
  const header = `| ${columns.join(' | ')} |`
  const separator = `| ${columns.map(() => '---').join(' | ')} |`
  return [header, separator, ...rows.map((row) => `| ${columns.map((column) => String(row[column] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`)].join('\n')
}

function writeOutputs(outputDir, report) {
  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, 'ACCEPTANCE_MATRIX_V2.json'), `${JSON.stringify(report, null, 2)}\n`)

  const categories = report.config.acceptanceCategories
  const matrixRows = report.views.map((view) => ({
    View: view.label,
    Archetype: view.archetype,
    ...Object.fromEntries(categories.map((category) => [category, view.classification[category]])),
  }))
  const matrixMd = [
    '# Monitoring Master + Seven-View Acceptance Matrix v2',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Monitoring is the immutable master. A PARTIAL visual or domain cell is intentionally not upgraded without human screenshot review and target-specific workflow proof.',
    '',
    markdownTable(matrixRows, ['View', 'Archetype', ...categories]),
    '',
    '## Cross-target gaps',
    '',
    ...report.crossTargetGaps.map((gap) => `- **${gap.category}**: ${gap.views.join(', ')}`),
    '',
    '## Implementation order',
    '',
    ...report.config.implementationOrder.map((item, index) => `${index + 1}. ${item}`),
    '',
  ].join('\n')
  fs.writeFileSync(path.join(outputDir, 'ACCEPTANCE_MATRIX_V2.md'), matrixMd)

  const evidenceLines = ['# Evidence Index', '']
  for (const view of report.views) {
    evidenceLines.push(`## ${view.label}`, '')
    evidenceLines.push(`- Route: \`${view.route}\``)
    evidenceLines.push(`- Routed source: \`${view.source}\``)
    evidenceLines.push(`- Import closure files: ${view.sourceEvidence.files.length}`)
    for (const screenshot of view.runtimeEvidence?.screenshots || []) evidenceLines.push(`- Screenshot: \`${screenshot}\``)
    evidenceLines.push(`- Runtime record: \`${view.runtimeEvidence?.recordPath || 'missing'}\``, '')
  }
  fs.writeFileSync(path.join(outputDir, 'EVIDENCE_INDEX.md'), `${evidenceLines.join('\n')}\n`)

  const blockers = report.views.flatMap((view) => Object.entries(view.classification)
    .filter(([, value]) => value === 'FAIL' || value === 'PARTIAL')
    .map(([category, value]) => ({ view: view.label, category, status: value })))
  const blockerRows = blockers.map((entry, index) => ({ Rank: index + 1, View: entry.view, Category: entry.category, Status: entry.status }))
  fs.writeFileSync(path.join(outputDir, 'BLOCKER_REGISTER.md'), `# Goldenization Blocker Register\n\n${markdownTable(blockerRows, ['Rank', 'View', 'Category', 'Status'])}\n`)

  const summary = {
    schemaVersion: 1,
    generatedAt: report.generatedAt,
    master: report.config.master.key,
    targets: report.config.targets.map((target) => target.key),
    viewsAudited: report.views.length,
    runtimeRecords: report.views.filter((view) => view.runtimeEvidence).length,
    screenshots: report.views.reduce((sum, view) => sum + (view.runtimeEvidence?.screenshots?.length || 0), 0),
    classificationCounts: report.views.reduce((counts, view) => {
      for (const value of Object.values(view.classification)) counts[value] = (counts[value] || 0) + 1
      return counts
    }, {}),
    auditIntegrity: report.auditIntegrity,
  }
  fs.writeFileSync(path.join(outputDir, 'AUDIT_SUMMARY.json'), `${JSON.stringify(summary, null, 2)}\n`)
}

export function buildReport({ repoRoot, config, runtimeDir }) {
  const frontendRoot = path.join(repoRoot, 'frontend')
  const sourceRoot = path.join(frontendRoot, 'src')
  const appPath = path.join(sourceRoot, 'App.tsx')
  if (!fs.existsSync(appPath)) throw new Error(`Missing frontend route source: ${appPath}`)
  const appSource = readText(appPath)
  const definitions = [config.master, ...config.targets]

  const views = definitions.map((target) => {
    const entryPath = path.join(repoRoot, target.source)
    const files = fs.existsSync(entryPath) ? importClosure(entryPath, sourceRoot) : []
    const sourceEvidence = {
      entryExists: fs.existsSync(entryPath),
      files: files.map((file) => path.relative(repoRoot, file)),
      route: routeEvidence(appSource, target),
      signals: files.length ? scanSignals(files) : Object.fromEntries(Object.keys(SIGNALS).map((key) => [key, false])),
    }
    const runtime = runtimeEvidence(runtimeDir, target.key)
    const classification = classify(target, sourceEvidence, runtime)
    return {
      key: target.key,
      label: target.label,
      route: target.route,
      source: target.source,
      archetype: target.archetype,
      domainMustPreserve: target.domainMustPreserve,
      sourceEvidence,
      runtimeEvidence: runtime,
      classification,
    }
  })

  const crossTargetGaps = config.acceptanceCategories
    .map((category) => ({
      category,
      views: views.filter((view) => view.key !== config.master.key && view.classification[category] !== 'PASS' && view.classification[category] !== 'N/A').map((view) => view.label),
    }))
    .filter((gap) => gap.views.length >= 2)

  const auditIntegrity = {
    masterEntryPresent: views[0].sourceEvidence.entryExists,
    masterRouteWired: Object.values(views[0].sourceEvidence.route).every(Boolean),
    allTargetEntriesPresent: views.slice(1).every((view) => view.sourceEvidence.entryExists),
    allRuntimeRecordsPresent: runtimeDir ? views.every((view) => Boolean(view.runtimeEvidence)) : null,
    allTenantEvidenceVerified: runtimeDir ? views.every((view) => (
      view.runtimeEvidence?.seededTenant?.backendSelected === true &&
      view.runtimeEvidence?.seededTenant?.activeLabelVerified === true &&
      view.runtimeEvidence?.blankTenant?.backendSelected === true &&
      view.runtimeEvidence?.blankTenant?.activeLabelVerified === true
    )) : null,
    allResponsiveBaseSurfacesClean: runtimeDir ? views.every((view) => (
      view.runtimeEvidence?.constrained?.captured === true &&
      view.runtimeEvidence?.constrained?.baseSurfaceClean === true &&
      view.runtimeEvidence?.constrained?.modalClosedBeforeCapture === true
    )) : null,
    allProbeResultsExplicit: runtimeDir ? views.every((view) => (
      typeof view.runtimeEvidence?.panelProbe?.verified === 'boolean' &&
      typeof view.runtimeEvidence?.modalProbe?.verified === 'boolean'
    )) : null,
  }

  return { schemaVersion: 2, generatedAt: new Date().toISOString(), config, views, crossTargetGaps, auditIntegrity }
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv)
  if (args.help) {
    console.log('Usage: node monitoring-master-goldenization-audit.mjs --repo-root <repo> --output <dir> [--runtime-dir <dir>]')
    return 0
  }
  if (!args.output) throw new Error('--output is required')
  const config = readJson(args.config)
  const report = buildReport({ repoRoot: args.repoRoot, config, runtimeDir: args.runtimeDir })
  writeOutputs(args.output, report)
  const integrity = report.auditIntegrity
  if (!integrity.masterEntryPresent || !integrity.masterRouteWired || !integrity.allTargetEntriesPresent) return 2
  if (args.runtimeDir && integrity.allRuntimeRecordsPresent !== true) return 3
  if (args.runtimeDir && integrity.allTenantEvidenceVerified !== true) return 4
  if (args.runtimeDir && integrity.allResponsiveBaseSurfacesClean !== true) return 5
  if (args.runtimeDir && integrity.allProbeResultsExplicit !== true) return 6
  console.log(`PASS: audited ${report.views.length} views; ${report.crossTargetGaps.length} cross-target gap categories recorded.`)
  return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main()
  } catch (error) {
    console.error(error instanceof Error ? error.stack : String(error))
    process.exitCode = 1
  }
}
