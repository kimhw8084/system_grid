import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function git(repoRoot, args) {
  return execFileSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8' }).trim()
}

async function walkFiles(root, relative = '') {
  const directory = path.join(root, relative)
  const entries = await readdir(directory, { withFileTypes: true })
  const ignored = new Set(['.git', 'node_modules', 'dist', '.vite', 'test-results', '__pycache__', 'venv', '.venv', '.pytest_cache'])
  const files = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (ignored.has(entry.name)) continue
    const childRelative = path.join(relative, entry.name)
    if (entry.isDirectory()) files.push(...await walkFiles(root, childRelative))
    else if (entry.isFile()) files.push(childRelative)
  }
  return files
}

async function digestDirectory(root) {
  const hash = createHash('sha256')
  const files = await walkFiles(root)
  for (const relative of files) {
    hash.update(relative.replaceAll(path.sep, '/') + '\0')
    hash.update(await readFile(path.join(root, relative)))
    hash.update('\0')
  }
  return hash.digest('hex')
}

function findMigrationHeads(repoRoot) {
  const versionsRoot = path.join(repoRoot, 'backend', 'alembic', 'versions')
  let filenames = []
  try {
    filenames = execFileSync('find', [versionsRoot, '-maxdepth', '1', '-type', 'f', '-name', '*.py'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
  } catch {
    return 'unknown'
  }
  const revisions = new Set()
  const downRevisions = new Set()
  for (const filename of filenames) {
    let source
    try { source = readFileSync(filename, 'utf8') } catch { continue }
    for (const match of source.matchAll(/\brevision(?:\s*:\s*[^=]+)?\s*=\s*['"]([^'"]+)['"]/g)) revisions.add(match[1])
    for (const match of source.matchAll(/\bdown_revision(?:\s*:\s*[^=]+)?\s*=\s*([^\n]+)/g)) {
      for (const revision of match[1].matchAll(/['"]([^'"]+)['"]/g)) downRevisions.add(revision[1])
    }
  }
  const heads = [...revisions].filter((revision) => !downRevisions.has(revision)).sort()
  return heads.join(',') || 'unknown'
}

export async function collectCandidateIdentity({ repoRoot }) {
  const status = git(repoRoot, ['status', '--porcelain=v1', '-uall'])
  const diff = git(repoRoot, ['diff', '--binary', 'HEAD', '--'])
  const dirtyPatchSha256 = status || diff ? sha256(`${diff}\n--status-manifest--\n${status}\n`) : null
  const [frontendDigest, backendDigest] = await Promise.all([
    digestDirectory(path.join(repoRoot, 'frontend')),
    digestDirectory(path.join(repoRoot, 'backend')),
  ])
  return {
    source_commit: git(repoRoot, ['rev-parse', 'HEAD']),
    source_tree: git(repoRoot, ['rev-parse', 'HEAD^{tree}']),
    dirty_patch_sha256: dirtyPatchSha256,
    frontend_digest: frontendDigest,
    backend_digest: backendDigest,
    database_migration_revision: findMigrationHeads(repoRoot),
  }
}
