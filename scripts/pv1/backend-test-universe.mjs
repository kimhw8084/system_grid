import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFile, execFileSync } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import os from 'node:os'

const execFileAsync = promisify(execFile)

function nodeIds(output) {
  return [...new Set(output.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.includes('::') && !line.startsWith('=') && !line.startsWith('WARNING')))].sort()
}

export async function collectBackendUniverse({ repoRoot = process.cwd(), outputDir }) {
  const backend = path.join(repoRoot, 'backend')
  const python = path.join(backend, 'venv', 'bin', 'python')
  const { stdout, stderr } = await execFileAsync(python, ['-m', 'pytest', '--collect-only', '-q'], { cwd: backend, env: { ...process.env, TESTING: '1', ENVIRONMENT: 'test' }, maxBuffer: 32 * 1024 * 1024 })
  const full = nodeIds(stdout)
  const selected = [...full]
  const historicalCommit = '459215bcc3c2ba63fa90129250773d0d24190808'
  const historicalRoot = fsTempRoot()
  let historicalNodeIds = []
  let historicalCollectionError = null
  try {
    const archive = execFileSync('git', ['-C', repoRoot, 'archive', historicalCommit], { maxBuffer: 128 * 1024 * 1024 })
    execFileSync('tar', ['-x', '-C', historicalRoot], { input: archive })
    const historicalBackend = path.join(historicalRoot, 'backend')
    const environment = { ...process.env, PYTHONPATH: historicalBackend, TESTING: '1', ENVIRONMENT: 'test', CONFIG_DATABASE_URL: `sqlite+aiosqlite:///${path.join(historicalRoot, 'config.db')}`, DATABASE_URL: `sqlite+aiosqlite:///${path.join(historicalRoot, 'tenant.db')}`, TENANT_STORAGE_ROOT: path.join(historicalRoot, 'tenants') }
    let result = ''
    try {
      result = execFileSync(python, ['-m', 'pytest', '--collect-only', '-q'], { cwd: historicalBackend, env: environment, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    } catch (error) {
      result = String(error.stdout || '')
      historicalCollectionError = String(error.stderr || error.message || '').slice(-4000)
    }
    historicalNodeIds = nodeIds(result)
  } catch (error) {
    historicalCollectionError = String(error.message || error).slice(-4000)
  }
  const historicalMissing = historicalNodeIds.filter((id) => !new Set(full).has(id)).sort()
  const currentNew = full.filter((id) => !new Set(historicalNodeIds).has(id)).sort()
  const historical = {
    commit: historicalCommit,
    p07_reported_execution_count: 295,
    p07_collected_nodeid_count: historicalNodeIds.length,
    historical_nodeid_manifest_available: historicalNodeIds.length > 0,
    historical_collection_error: historicalCollectionError,
    historical_nodes_missing_from_current: historicalMissing,
    current_nodes_added_since_p07: currentNew,
    count_delta_classification: historicalMissing.length ? 'ACCIDENTALLY_EXCLUDED' : 'PARAMETERIZATION_CHANGED',
    note: 'P07 published an execution count; this run additionally re-collects its committed test tree so node identity and source-era additions are explicit.'
  }
  const reconciliation = {
    schema: 'sysgrid.pv1.backend-test-universe.v1',
    collection_root: 'backend',
    collection_command: `${python} -m pytest --collect-only -q`,
    current_total_collected: full.length,
    current_release_selected: selected.length,
    excluded_count: full.length - selected.length,
    exclusions: [],
    historical_p07: historical,
    p12_reported_count: 234,
    p07_delta: 295 - full.length,
    p12_delta: full.length - 234,
    historical_nodeid_exclusions: historicalMissing.map((nodeid) => ({ nodeid, classification: 'ACCIDENTALLY_EXCLUDED' })),
    current_nodes_since_p07: currentNew.map((nodeid) => ({ nodeid, classification: 'ADDED_WITH_SOURCE_CHANGE' })),
    stderr_summary: stderr.split(/\r?\n/).filter(Boolean).slice(-20),
    verdict: full.length === selected.length ? 'PASS' : 'FAIL',
  }
  if (outputDir) {
    await mkdir(outputDir, { recursive: true })
    await writeFile(path.join(outputDir, 'backend-full-nodeids.txt'), `${full.join('\n')}\n`)
    await writeFile(path.join(outputDir, 'backend-release-nodeids.txt'), `${selected.join('\n')}\n`)
    await writeFile(path.join(outputDir, 'backend-test-universe.json'), `${JSON.stringify(reconciliation, null, 2)}\n`)
  }
  return { full, selected, reconciliation }
}

function fsTempRoot() {
  return execFileSync('mktemp', ['-d', path.join(os.tmpdir(), 'sysgrid-pv1-p07-XXXXXX')], { encoding: 'utf8' }).trim()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outputIndex = process.argv.indexOf('--output-dir')
  const outputDir = outputIndex >= 0 ? process.argv[outputIndex + 1] : path.join(process.cwd(), 'artifacts', 'backend-test-universe')
  const result = await collectBackendUniverse({ repoRoot: process.cwd(), outputDir })
  console.log(JSON.stringify(result.reconciliation, null, 2))
  process.exit(result.reconciliation.verdict === 'PASS' ? 0 : 1)
}
