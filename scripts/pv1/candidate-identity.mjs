import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const TRACKED_SOURCE_PREFIXES = ['frontend', 'backend']

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function git(repoRoot, args, options = {}) {
  return execFileSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8', ...options }).trim()
}

function gitBuffer(repoRoot, args) {
  return execFileSync('git', ['-C', repoRoot, ...args], { encoding: 'buffer' })
}

function treeEntries(repoRoot, prefix) {
  const output = gitBuffer(repoRoot, ['ls-tree', '-r', '-z', 'HEAD', '--', prefix]).toString('utf8')
  return output.split('\0').filter(Boolean).map((entry) => {
    const tab = entry.indexOf('\t')
    const [mode, type, object] = entry.slice(0, tab).split(' ')
    return { mode, type, object, path: entry.slice(tab + 1) }
  })
}

function digestTreeEntries(entries) {
  const hash = createHash('sha256')
  for (const entry of entries.sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(`${entry.mode} ${entry.type} ${entry.object}\t${entry.path}\0`)
  }
  return hash.digest('hex')
}

function findMigrationHeads(repoRoot) {
  const entries = treeEntries(repoRoot, 'backend/alembic/versions')
  const revisions = new Set()
  const downRevisions = new Set()
  for (const entry of entries.filter((item) => item.path.endsWith('.py'))) {
    let source
    try {
      source = execFileSync('git', ['-C', repoRoot, 'show', `HEAD:${entry.path}`], { encoding: 'utf8' })
    } catch {
      continue
    }
    for (const match of source.matchAll(/\brevision(?:\s*:\s*[^=]+)?\s*=\s*['"]([^'"]+)['"]/g)) revisions.add(match[1])
    for (const match of source.matchAll(/\bdown_revision(?:\s*:\s*[^=]+)?\s*=\s*([^\n]+)/g)) {
      for (const revision of match[1].matchAll(/['"]([^'"]+)['"]/g)) downRevisions.add(revision[1])
    }
  }
  const heads = [...revisions].filter((revision) => !downRevisions.has(revision)).sort()
  return heads.join(',') || 'unknown'
}

export async function collectCandidateIdentity({ repoRoot }) {
  const trackedPaths = git(repoRoot, ['diff', '--name-only', 'HEAD', '--']).split('\n').filter(Boolean)
  const trackedWorktreeDirty = trackedPaths.length > 0
  const diff = trackedWorktreeDirty ? git(repoRoot, ['diff', '--binary', 'HEAD', '--']) : ''
  const [frontendEntries, backendEntries] = TRACKED_SOURCE_PREFIXES.map((prefix) => treeEntries(repoRoot, prefix))
  return {
    source_commit: git(repoRoot, ['rev-parse', 'HEAD']),
    source_tree: git(repoRoot, ['rev-parse', 'HEAD^{tree}']),
    dirty_patch_sha256: trackedWorktreeDirty ? sha256(diff) : null,
    frontend_digest: digestTreeEntries(frontendEntries),
    backend_digest: digestTreeEntries(backendEntries),
    database_migration_revision: findMigrationHeads(repoRoot),
    tracked_worktree_dirty: trackedWorktreeDirty,
    tracked_dirty_paths: trackedPaths,
    identity_scope: {
      source: 'git:HEAD-tree',
      included: ['the exact committed Git tree identified by source_commit/source_tree', 'tracked Git tree entries under frontend/ and backend/', 'tracked migration blob identities under backend/alembic/versions/'],
      excluded: ['untracked files', 'ignored runtime files', 'SQLite/WAL/SHM databases', 'logs', 'caches', 'temporary files', 'external evidence runs'],
      database_hashes_are: 'evidence_subjects_not_candidate_identity',
    },
  }
}

export function candidateIsReleaseReady(identity) {
  return identity?.tracked_worktree_dirty === false && Boolean(identity?.source_commit && identity?.source_tree)
}
