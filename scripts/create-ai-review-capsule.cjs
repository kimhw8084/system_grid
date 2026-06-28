#!/usr/bin/env node
'use strict';

/**
 * SysGrid AI Review Capsule Generator
 *
 * Creates a minimal, source-truth review capsule for a fresh AI chat.
 * The capsule contains objective repo evidence only: diffs, changed files,
 * dependency slices, backend/frontend contract signals, tests, generated maps,
 * warnings, and mechanical indexes. It intentionally does NOT include a task
 * narrative or START_HERE prompt, because user intent belongs outside the zip.
 *
 * Example:
 *   node scripts/create-ai-review-capsule.cjs --mode standard --force
 *   node scripts/create-ai-review-capsule.cjs --mode deep --include-all-essential --force
 *   node scripts/create-ai-review-capsule.cjs --out ../custom-ai-review-capsule.zip --force
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const VERSION = '1.1.0';
const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.txt', '.css', '.scss',
  '.html', '.py', '.toml', '.ini', '.yml', '.yaml', '.sh', '.graphql', '.sql', '.env.example'
]);

const DEFAULT_RULES = {
  modes: {
    quick: { importDepth: 1, backendSearchLimit: 8, testLimit: 12, mapContentBytes: 250000 },
    minimal: { importDepth: 1, backendSearchLimit: 12, testLimit: 20, mapContentBytes: 350000 },
    standard: { importDepth: 2, backendSearchLimit: 30, testLimit: 45, mapContentBytes: 600000 },
    daily: { importDepth: 2, backendSearchLimit: 35, testLimit: 55, mapContentBytes: 700000 },
    deep: { importDepth: 3, backendSearchLimit: 80, testLimit: 120, mapContentBytes: 1200000 },
    fresh: { importDepth: 3, backendSearchLimit: 100, testLimit: 160, mapContentBytes: 1600000 },
    audit: { importDepth: 4, backendSearchLimit: 160, testLimit: 220, mapContentBytes: 2200000 },
    full: { importDepth: 5, backendSearchLimit: 240, testLimit: 320, mapContentBytes: 3000000 },
  },
  projectSpine: [
    'AGENTS.md',
    'README.md',
    'DEPLOYMENT.md',
    'docs/operational-workspace-law.md',
    'frontend/package.json',
    'frontend/tsconfig.json',
    'frontend/tsconfig.node.json',
    'frontend/vite.config.ts',
    'frontend/playwright.config.ts',
    'frontend/vitest.setup.ts',
    'frontend/src/App.tsx',
    'frontend/src/main.tsx',
    'frontend/src/api/apiClient.ts',
    'backend/requirements.txt',
    'backend/pytest.ini',
    'backend/alembic.ini',
    'backend/app/main.py',
    'backend/app/database.py',
    'backend/app/models/models.py',
    'backend/app/schemas/schemas.py',
  ],
  highRiskKeywords: [
    'bulk', 'purge', 'restore', 'archive', 'delete', 'update', 'revert', 'snapshot',
    'credential', 'dependency', 'link', 'tenant', 'owner', 'settings', 'migration',
    'schema', 'action', 'route', 'permission', 'role', 'auth', 'toast', 'selection',
    'saved view', 'saved_view', 'localstorage', 'modal', 'row action', 'row-action'
  ],
  workspaceTerms: [
    'monitoring', 'external', 'service', 'services', 'network', 'networks', 'asset', 'assets',
    'vendor', 'vendors', 'far', 'research', 'project', 'projects', 'settings', 'rack', 'racks',
    'device', 'devices', 'dashboard', 'dataflow', 'data_flow', 'knowledge', 'audit',
    'maintenance', 'intelligence', 'rca', 'tenant', 'tenants', 'site', 'sites'
  ],
  backendRoots: [
    'backend/app/api',
    'backend/app/models',
    'backend/app/schemas',
    'backend/tests',
    'backend'
  ],
  frontendRoots: [
    'frontend/src',
    'frontend/tests'
  ],
  componentSourceRoots: [
    'frontend/src/components',
    'frontend/src/api',
    'frontend/src/stores',
    'frontend/src/utils'
  ],
  backendApiRoot: 'backend/app/api',
  includeAllEssential: {
    frontendComponentGlobs: [
      'frontend/src/components/*.tsx',
      'frontend/src/components/*.ts',
      'frontend/src/components/shared/Operational*.ts',
      'frontend/src/components/shared/Operational*.tsx',
      'frontend/src/api/*.ts',
      'frontend/src/stores/*.ts',
      'frontend/src/utils/*.ts'
    ],
    backendGlobs: [
      'backend/app/api/*.py',
      'backend/app/core/*.py',
      'backend/app/models/*.py',
      'backend/app/schemas/*.py',
      'backend/app/*.py'
    ]
  }
};

const DEFAULT_IGNORE = {
  directories: [
    '.git', 'node_modules', 'venv', '__pycache__', '.pytest_cache', 'coverage', 'dist', 'build',
    'playwright-report', 'test-results', '.ai-review-latest', '.next', '.cache', '.turbo',
    'site-packages'
  ],
  fileNames: ['.DS_Store', '.coverage'],
  extensions: [
    '.zip', '.tgz', '.gz', '.rar', '.7z', '.db', '.sqlite', '.sqlite3', '.db-shm', '.db-wal',
    '.log', '.pyc', '.pyo', '.so', '.dylib', '.dll', '.exe', '.png', '.jpg', '.jpeg', '.gif',
    '.webp', '.ico', '.pdf', '.mp4', '.mov', '.avi', '.woff', '.woff2', '.ttf', '.otf'
  ],
  secretFileNames: ['.env', '.env.local', '.env.local.runtime', '.env.production', '.env.development'],
  allowSecretExamples: ['.env.example']
};

function usage() {
  console.log(`SysGrid AI Review Capsule Generator v${VERSION}\n\n` +
`Usage:\n` +
`  node scripts/create-ai-review-capsule.cjs [options]\n\n` +
`Options:\n` +
`  --out <path>                 Output zip path. Default: ../sysgrid-ai-review-capsule.zip. Must be outside repo unless --allow-repo-output.\n` +
`  --mode <quick|minimal|standard|daily|deep|fresh|audit|full> Default: standard.\n` +
`  --base <git-ref>             Base ref for unstaged diff. Default: HEAD.\n` +
`  --strict                     Turn contract/test warnings into failure where possible.\n` +
`  --allow-empty                Allow no changed files without warning.\n` +
`  --include-all-essential      Include stable project spine + key FE/BE source even when no current diff exists.\n` +
`  --allow-repo-output          Permit output path inside repo. Not recommended.\n` +
`  --force                      Overwrite existing output file.\n` +
`  --max-file-bytes <n>         Warn/exclude non-required files larger than n. Default: 2000000.\n` +
`  --max-diff-bytes <n>         Truncate generated full diff above n with warning. Default: 2500000.\n` +
`  --help                       Show this help.\n`);
}

function parseArgs(argv) {
  const args = {
    mode: 'standard', base: 'HEAD', out: null, strict: false, allowEmpty: false,
    includeAllEssential: false, allowRepoOutput: false, force: false,
    maxFileBytes: 2_000_000, maxDiffBytes: 2_500_000
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { usage(); process.exit(0); }
    if (a === '--strict') { args.strict = true; continue; }
    if (a === '--allow-empty') { args.allowEmpty = true; continue; }
    if (a === '--include-all-essential') { args.includeAllEssential = true; continue; }
    if (a === '--allow-repo-output') { args.allowRepoOutput = true; continue; }
    if (a === '--force') { args.force = true; continue; }
    const needsValue = ['--out', '--mode', '--base', '--max-file-bytes', '--max-diff-bytes'];
    if (needsValue.includes(a)) {
      const v = argv[++i];
      if (!v) die(`Missing value for ${a}`);
      if (a === '--out') args.out = v;
      else if (a === '--mode') args.mode = v;
      else if (a === '--base') args.base = v;
      else if (a === '--max-file-bytes') args.maxFileBytes = Number(v);
      else if (a === '--max-diff-bytes') args.maxDiffBytes = Number(v);
      continue;
    }
    die(`Unknown argument: ${a}`);
  }
  if (!DEFAULT_RULES.modes[args.mode]) die(`Invalid --mode ${args.mode}. Use quick, minimal, standard, daily, deep, fresh, audit, or full.`);
  if (!Number.isFinite(args.maxFileBytes) || args.maxFileBytes < 10000) die('--max-file-bytes must be a number >= 10000.');
  if (!Number.isFinite(args.maxDiffBytes) || args.maxDiffBytes < 10000) die('--max-diff-bytes must be a number >= 10000.');
  return args;
}

function die(message) {
  console.error(`FAIL: ${message}`);
  process.exit(2);
}

function run(cmd, cmdArgs, options = {}) {
  const res = cp.spawnSync(cmd, cmdArgs, {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8',
    maxBuffer: options.maxBuffer || 20 * 1024 * 1024,
    shell: false
  });
  if (res.error && !options.allowFail) throw res.error;
  if (res.status !== 0 && !options.allowFail) {
    throw new Error(`${cmd} ${cmdArgs.join(' ')} failed (${res.status})\n${res.stderr || res.stdout || ''}`);
  }
  return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

function commandExists(name) {
  const res = run('bash', ['-lc', `command -v ${shellQuote(name)}`], { allowFail: true });
  return res.status === 0;
}

function shellQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

function toSlash(p) {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

function normalizeRel(p) {
  return toSlash(path.normalize(p)).replace(/^\.\//, '');
}

function isSubPath(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!!rel && !rel.startsWith('..') && !path.isAbsolute(rel));
}

function getRepoRoot() {
  const res = run('git', ['rev-parse', '--show-toplevel'], { allowFail: true });
  if (res.status !== 0 || !res.stdout.trim()) die('Not inside a Git repository.');
  return path.resolve(res.stdout.trim());
}

function loadJsonIfExists(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return deepMerge(fallback, parsed);
  } catch (e) {
    die(`Failed to parse ${file}: ${e.message}`);
  }
}

function deepMerge(base, extra) {
  if (Array.isArray(base) || Array.isArray(extra)) return extra === undefined ? base : extra;
  if (!base || typeof base !== 'object') return extra === undefined ? base : extra;
  const out = { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    out[k] = deepMerge(base[k], v);
  }
  return out;
}

function readTextSafe(abs, limitBytes = Infinity) {
  try {
    const stat = fs.statSync(abs);
    if (!stat.isFile()) return '';
    const max = Math.min(stat.size, limitBytes);
    const fd = fs.openSync(abs, 'r');
    const buf = Buffer.alloc(max);
    fs.readSync(fd, buf, 0, max, 0);
    fs.closeSync(fd);
    if (buf.includes(0)) return '';
    return buf.toString('utf8');
  } catch {
    return '';
  }
}

function isLikelyTextFile(rel, abs) {
  const lower = rel.toLowerCase();
  if (lower.endsWith('.env.example')) return true;
  const ext = path.extname(lower);
  if (TEXT_EXTENSIONS.has(ext)) return true;
  try {
    const stat = fs.statSync(abs);
    const len = Math.min(stat.size, 4096);
    if (len === 0) return true;
    const fd = fs.openSync(abs, 'r');
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, 0);
    fs.closeSync(fd);
    if (buf.includes(0)) return false;
    return true;
  } catch {
    return false;
  }
}

function forbiddenReason(rel, ignore) {
  const clean = normalizeRel(rel);
  const lower = clean.toLowerCase();
  const parts = lower.split('/').filter(Boolean);
  for (const d of ignore.directories || []) {
    if (parts.includes(d.toLowerCase())) return `forbidden directory: ${d}`;
  }
  const base = path.basename(lower);
  for (const n of ignore.fileNames || []) {
    if (base === n.toLowerCase()) return `forbidden file name: ${n}`;
  }
  for (const n of ignore.secretFileNames || []) {
    if (base === n.toLowerCase()) {
      const allowed = (ignore.allowSecretExamples || []).some(x => base === x.toLowerCase());
      if (!allowed) return `secret/env file excluded: ${n}`;
    }
  }
  if (base.startsWith('.env') && !base.endsWith('.example')) return 'secret/env file excluded';
  for (const ext of ignore.extensions || []) {
    if (lower.endsWith(ext.toLowerCase())) return `forbidden extension: ${ext}`;
  }
  return null;
}

function listGitFiles(repoRoot) {
  const tracked = run('git', ['ls-files'], { cwd: repoRoot, allowFail: true }).stdout.split(/\r?\n/).filter(Boolean);
  const untracked = run('git', ['ls-files', '--others', '--exclude-standard'], { cwd: repoRoot, allowFail: true }).stdout.split(/\r?\n/).filter(Boolean);
  return Array.from(new Set([...tracked, ...untracked].map(normalizeRel))).sort();
}

function parseStatusPorcelain(stdout) {
  const files = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let p = line.slice(3).trim();
    if (p.includes(' -> ')) p = p.split(' -> ').pop().trim();
    if (p.startsWith('"') && p.endsWith('"')) {
      try { p = JSON.parse(p); } catch { /* keep raw */ }
    }
    if (p) files.push(normalizeRel(p));
  }
  return files;
}

function getChangedFiles(repoRoot, base) {
  const sets = [];
  const diff = run('git', ['diff', '--name-only', base], { cwd: repoRoot, allowFail: true }).stdout.split(/\r?\n/).filter(Boolean);
  const cached = run('git', ['diff', '--cached', '--name-only'], { cwd: repoRoot, allowFail: true }).stdout.split(/\r?\n/).filter(Boolean);
  const status = parseStatusPorcelain(run('git', ['status', '--porcelain'], { cwd: repoRoot, allowFail: true }).stdout);
  sets.push(...diff, ...cached, ...status);
  const out = [];
  for (const rel of new Set(sets.map(normalizeRel))) {
    if (!rel) continue;
    const abs = path.join(repoRoot, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) out.push(rel);
  }
  return out.sort();
}

function writeFileEnsured(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function copyFileEnsured(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function addReason(map, rel, reason) {
  const clean = normalizeRel(rel);
  if (!map.has(clean)) map.set(clean, new Set());
  map.get(clean).add(reason);
}

function globLikeMatch(pattern, rel) {
  const p = normalizeRel(pattern);
  const r = normalizeRel(rel);
  if (!p.includes('*')) return p === r;
  const esc = p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`^${esc}$`).test(r);
}

function deriveTermsFromPath(rel, rules) {
  const lower = rel.toLowerCase().replace(/[-_]/g, ' ');
  const terms = new Set();
  for (const t of rules.workspaceTerms) {
    const needle = t.toLowerCase().replace(/[-_]/g, ' ');
    if (lower.includes(needle)) terms.add(t.toLowerCase());
  }
  const base = path.basename(rel, path.extname(rel)).toLowerCase();
  for (const chunk of base.split(/[^a-z0-9]+/)) {
    if (chunk.length >= 4 && rules.workspaceTerms.includes(chunk)) terms.add(chunk);
  }
  return terms;
}

function detectKeywordsInText(text, keywords) {
  const lower = text.toLowerCase();
  const found = new Set();
  for (const k of keywords) {
    const normalized = k.toLowerCase();
    if (lower.includes(normalized)) found.add(k);
  }
  return found;
}

function parseJsImports(text) {
  const imports = new Set();
  const patterns = [
    /import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /export\s+(?:type\s+)?[\s\S]*?\s+from\s+["']([^"']+)["']/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
    /import\(\s*["']([^"']+)["']\s*\)/g
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text))) imports.add(m[1]);
  }
  return Array.from(imports);
}

function parsePyImports(text) {
  const imports = new Set();
  let m;
  const fromRe = /^\s*from\s+([\.a-zA-Z0-9_]+)\s+import\s+/gm;
  const importRe = /^\s*import\s+([a-zA-Z0-9_\.]+)/gm;
  while ((m = fromRe.exec(text))) imports.add(m[1]);
  while ((m = importRe.exec(text))) imports.add(m[1]);
  return Array.from(imports);
}

function resolveJsImport(repoRoot, importerRel, spec) {
  if (!spec.startsWith('.')) return [];
  const importerDir = path.dirname(importerRel);
  const base = path.normalize(path.join(importerDir, spec));
  const candidates = [];
  const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '.css'];
  for (const ext of exts) candidates.push(base + ext);
  for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.json']) candidates.push(path.join(base, 'index' + ext));
  const found = [];
  for (const c of candidates) {
    const rel = normalizeRel(c);
    const abs = path.join(repoRoot, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) found.push(rel);
  }
  return Array.from(new Set(found));
}

function resolvePyImport(repoRoot, importerRel, spec) {
  const out = [];
  let relBase = null;
  if (spec.startsWith('.')) {
    let dots = 0;
    for (const ch of spec) { if (ch === '.') dots++; else break; }
    const rest = spec.slice(dots).replace(/\./g, '/');
    let dir = path.dirname(importerRel);
    for (let i = 1; i < dots; i++) dir = path.dirname(dir);
    relBase = path.join(dir, rest);
  } else if (spec.startsWith('app.')) {
    relBase = path.join('backend', spec.replace(/\./g, '/'));
  } else if (spec.startsWith('backend.')) {
    relBase = spec.replace(/\./g, '/');
  }
  if (!relBase) return [];
  for (const c of [relBase + '.py', path.join(relBase, '__init__.py')]) {
    const rel = normalizeRel(c);
    const abs = path.join(repoRoot, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) out.push(rel);
  }
  return Array.from(new Set(out));
}

function includeImportClosure(repoRoot, rules, ignore, included, excluded, roots, depth, maxBytes) {
  const queue = roots.map(rel => ({ rel, depth: 0 }));
  const seen = new Set();
  const graph = {};
  while (queue.length) {
    const { rel, depth: d } = queue.shift();
    if (seen.has(rel) || d >= depth) continue;
    seen.add(rel);
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
    if (forbiddenReason(rel, ignore)) continue;
    const text = readTextSafe(abs, Math.min(maxBytes, 800000));
    if (!text) continue;
    let resolved = [];
    if (/\.(tsx?|jsx?|css|json)$/.test(rel)) {
      for (const spec of parseJsImports(text)) resolved.push(...resolveJsImport(repoRoot, rel, spec));
    } else if (/\.py$/.test(rel)) {
      for (const spec of parsePyImports(text)) resolved.push(...resolvePyImport(repoRoot, rel, spec));
    }
    resolved = Array.from(new Set(resolved)).filter(x => !forbiddenReason(x, ignore));
    graph[rel] = resolved;
    for (const dep of resolved) {
      addCandidate(repoRoot, ignore, included, excluded, dep, `local import dependency depth ${d + 1} from ${rel}`, { required: false, maxBytes });
      queue.push({ rel: dep, depth: d + 1 });
    }
  }
  return graph;
}

function addCandidate(repoRoot, ignore, included, excluded, rel, reason, opts = {}) {
  const clean = normalizeRel(rel);
  if (!clean || clean.startsWith('..')) return false;
  const abs = path.join(repoRoot, clean);
  const forbid = forbiddenReason(clean, ignore);
  if (forbid) {
    excluded.set(clean, forbid + ` (candidate reason: ${reason})`);
    return false;
  }
  if (!fs.existsSync(abs)) {
    excluded.set(clean, `missing file (candidate reason: ${reason})`);
    return false;
  }
  const st = fs.statSync(abs);
  if (!st.isFile()) {
    excluded.set(clean, `not a regular file (candidate reason: ${reason})`);
    return false;
  }
  if (!isLikelyTextFile(clean, abs)) {
    excluded.set(clean, `binary/non-text file excluded (candidate reason: ${reason})`);
    return false;
  }
  const maxBytes = opts.maxBytes || 2_000_000;
  if (st.size > maxBytes && !opts.required) {
    excluded.set(clean, `large non-required file excluded: ${st.size} bytes (candidate reason: ${reason})`);
    return false;
  }
  addReason(included, clean, reason + (st.size > maxBytes ? ` [large required: ${st.size} bytes]` : ''));
  return true;
}

function findMatchingFiles(allFiles, terms, roots, predicate) {
  const lowerTerms = Array.from(terms).map(t => t.toLowerCase()).filter(Boolean);
  if (!lowerTerms.length) return [];
  const results = [];
  for (const rel of allFiles) {
    const normalized = normalizeRel(rel);
    if (roots && roots.length && !roots.some(root => normalized.startsWith(root.replace(/\/$/, '') + '/') || normalized === root)) continue;
    if (predicate && !predicate(normalized)) continue;
    const relLower = normalized.toLowerCase();
    let score = 0;
    for (const t of lowerTerms) if (relLower.includes(t)) score += 5;
    const ext = path.extname(relLower);
    if (['.py', '.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      const text = readTextSafe(path.join(process.cwd(), normalized), 250000).toLowerCase();
      for (const t of lowerTerms) if (text.includes(t)) score += 1;
    }
    if (score > 0) results.push({ rel: normalized, score });
  }
  return results.sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel)).map(x => x.rel);
}

function buildRepoTreePruned(allFiles, ignore) {
  return allFiles
    .filter(rel => !forbiddenReason(rel, ignore))
    .sort()
    .join('\n') + '\n';
}

function parseExports(text) {
  const exports = new Set();
  let m;
  const re1 = /export\s+(?:default\s+)?(?:function|const|class|interface|type|enum)\s+([A-Za-z0-9_]+)/g;
  while ((m = re1.exec(text))) exports.add(m[1]);
  const re2 = /export\s*\{([^}]+)\}/g;
  while ((m = re2.exec(text))) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name) exports.add(name);
    }
  }
  return Array.from(exports).sort();
}

function buildFrontendComponentMap(repoRoot, allFiles, rules, ignore, maxContentBytes) {
  const out = [];
  for (const rel of allFiles) {
    if (forbiddenReason(rel, ignore)) continue;
    if (!rules.componentSourceRoots.some(root => rel.startsWith(root + '/'))) continue;
    if (!/\.(ts|tsx|js|jsx)$/.test(rel)) continue;
    const abs = path.join(repoRoot, rel);
    const text = readTextSafe(abs, maxContentBytes);
    const imports = parseJsImports(text).filter(x => x.startsWith('.'));
    const exports = parseExports(text);
    const keywords = Array.from(detectKeywordsInText(text, rules.highRiskKeywords)).sort();
    const apiSignals = Array.from(new Set((text.match(/api[A-Z][A-Za-z0-9_]+|fetch\s*\(|axios\.|\/api\/[A-Za-z0-9_\-/]+/g) || []))).slice(0, 30);
    out.push({ file: rel, imports, exports, keywords, apiSignals });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

function buildBackendRouteMap(repoRoot, allFiles, rules, ignore, maxContentBytes) {
  const out = [];
  for (const rel of allFiles) {
    if (!rel.startsWith((rules.backendApiRoot || 'backend/app/api') + '/')) continue;
    if (!rel.endsWith('.py')) continue;
    if (forbiddenReason(rel, ignore)) continue;
    const text = readTextSafe(path.join(repoRoot, rel), maxContentBytes);
    const routes = [];
    let m;
    const routeRe = /@(router|app)\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g;
    while ((m = routeRe.exec(text))) routes.push({ method: m[2].toUpperCase(), path: m[3] });
    const functions = [];
    const fnRe = /^\s*(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(/gm;
    while ((m = fnRe.exec(text))) functions.push(m[1]);
    const keywords = Array.from(detectKeywordsInText(text, rules.highRiskKeywords)).sort();
    out.push({ file: rel, routes, functions: functions.slice(0, 80), keywords });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

function isTestFile(rel) {
  const base = path.basename(rel).toLowerCase();
  return base.includes('test') || base.includes('spec') || rel.includes('/__tests__/') || rel.includes('/tests/');
}

function buildTestMap(allFiles, rules, ignore) {
  const out = {};
  for (const term of rules.workspaceTerms) out[term] = [];
  for (const rel of allFiles) {
    if (forbiddenReason(rel, ignore)) continue;
    if (!isTestFile(rel)) continue;
    const lower = rel.toLowerCase();
    for (const term of rules.workspaceTerms) {
      if (lower.includes(term.toLowerCase())) out[term].push(rel);
    }
  }
  for (const k of Object.keys(out)) {
    out[k] = Array.from(new Set(out[k])).sort();
    if (!out[k].length) delete out[k];
  }
  return out;
}

function buildProjectConfigMap(repoRoot, allFiles, ignore) {
  const wanted = allFiles.filter(rel => {
    if (forbiddenReason(rel, ignore)) return false;
    const base = path.basename(rel);
    return base === 'package.json' || base.startsWith('tsconfig') || base.startsWith('vite.config') ||
      base.startsWith('vitest.config') || base.startsWith('jest.config') || base.startsWith('playwright.config') ||
      base === 'pyproject.toml' || base === 'pytest.ini' || base.startsWith('requirements') || base === 'alembic.ini' ||
      base === '.nvmrc' || base === '.env.example';
  }).sort();
  return wanted.map(rel => {
    const info = { file: rel };
    if (path.basename(rel) === 'package.json') {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, rel), 'utf8'));
        info.scripts = pkg.scripts || {};
        info.dependencies = Object.keys(pkg.dependencies || {}).sort();
        info.devDependencies = Object.keys(pkg.devDependencies || {}).sort();
      } catch (e) { info.parseError = e.message; }
    }
    return info;
  });
}

function buildRiskKeywordMap(repoRoot, files, rules, maxBytes) {
  const out = {};
  for (const rel of files) {
    const text = readTextSafe(path.join(repoRoot, rel), maxBytes);
    const found = Array.from(detectKeywordsInText(text, rules.highRiskKeywords)).sort();
    if (found.length) out[rel] = found;
  }
  return out;
}

function lineNumbered(text) {
  const lines = text.split(/\r?\n/);
  return lines.map((l, idx) => `${String(idx + 1).padStart(6, ' ')}  ${l}`).join('\n');
}

function maybeTruncate(label, text, limit, warnings) {
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes <= limit) return text;
  warnings.push(`${label} truncated from ${bytes} bytes to ${limit} bytes. Increase --max-diff-bytes for full diff.`);
  return text.slice(0, limit) + `\n\n[TRUNCATED: ${label} exceeded ${limit} bytes]\n`;
}

function writeGeneratedFiles(stage, generated) {
  for (const [rel, content] of Object.entries(generated)) {
    writeFileEnsured(path.join(stage, rel), typeof content === 'string' ? content : JSON.stringify(content, null, 2) + '\n');
  }
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function statFileSafe(abs) {
  try { return fs.statSync(abs); } catch { return null; }
}

function collectDirFiles(dir) {
  const out = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile()) out.push(abs);
    }
  }
  walk(dir);
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = getRepoRoot();
  process.chdir(repoRoot);
  const scriptDir = path.dirname(path.resolve(__filename));
  const rules = loadJsonIfExists(path.join(scriptDir, 'ai-review-capsule-rules.json'), DEFAULT_RULES);
  const ignore = loadJsonIfExists(path.join(scriptDir, 'ai-review-capsule-ignore.json'), DEFAULT_IGNORE);
  const modeCfg = rules.modes[args.mode];
  const defaultOut = path.join(repoRoot, '..', 'sysgrid-ai-review-capsule.zip');
  const outAbs = path.resolve(args.out || defaultOut);
  const outParent = path.dirname(outAbs);
  if (!fs.existsSync(outParent)) fs.mkdirSync(outParent, { recursive: true });
  if (!args.allowRepoOutput && isSubPath(repoRoot, outAbs)) {
    die(`Output path is inside repo: ${outAbs}. Use /tmp or pass --allow-repo-output.`);
  }
  if (fs.existsSync(outAbs)) {
    if (!args.force) die(`Output already exists: ${outAbs}. Pass --force to overwrite.`);
    fs.rmSync(outAbs, { force: true });
  }
  if (!commandExists('zip')) die('zip command not found. Install zip or run on a system with zip available.');

  const warnings = [];
  const failures = [];
  const included = new Map();
  const excluded = new Map();
  const allFiles = listGitFiles(repoRoot);
  const changedFiles = getChangedFiles(repoRoot, args.base);

  if (!changedFiles.length && !args.allowEmpty) {
    warnings.push('No changed files detected. Capsule will rely on project spine/maps. Use --include-all-essential for broader review context.');
  }

  for (const rel of changedFiles) {
    addCandidate(repoRoot, ignore, included, excluded, rel, 'changed file from git diff/status', { required: true, maxBytes: args.maxFileBytes });
  }

  for (const rel of rules.projectSpine || []) {
    addCandidate(repoRoot, ignore, included, excluded, rel, 'project spine', { required: false, maxBytes: args.maxFileBytes });
  }

  if (args.includeAllEssential) {
    const globs = [
      ...((rules.includeAllEssential && rules.includeAllEssential.frontendComponentGlobs) || []),
      ...((rules.includeAllEssential && rules.includeAllEssential.backendGlobs) || [])
    ];
    for (const rel of allFiles) {
      if (globs.some(g => globLikeMatch(g, rel))) {
        addCandidate(repoRoot, ignore, included, excluded, rel, 'include-all-essential source spine', { required: false, maxBytes: args.maxFileBytes });
      }
    }
  }

  const initialSourceRoots = Array.from(included.keys()).filter(rel => /\.(ts|tsx|js|jsx|py|json|css)$/.test(rel));
  const importGraph = includeImportClosure(repoRoot, rules, ignore, included, excluded, initialSourceRoots, modeCfg.importDepth, args.maxFileBytes);

  const changedTextFiles = changedFiles.filter(rel => !forbiddenReason(rel, ignore) && fs.existsSync(path.join(repoRoot, rel)) && isLikelyTextFile(rel, path.join(repoRoot, rel)));
  const terms = new Set();
  const highRiskByChangedFile = {};
  for (const rel of changedTextFiles) {
    for (const t of deriveTermsFromPath(rel, rules)) terms.add(t);
    const text = readTextSafe(path.join(repoRoot, rel), Math.min(args.maxFileBytes, 800000));
    const found = Array.from(detectKeywordsInText(text, rules.highRiskKeywords));
    if (found.length) highRiskByChangedFile[rel] = found.sort();
    for (const k of found) terms.add(k.toLowerCase().replace(/\s+/g, '_'));
  }

  const frontendChanged = changedTextFiles.some(rel => rel.startsWith('frontend/') && /\.(ts|tsx|js|jsx)$/.test(rel));
  const backendChanged = changedTextFiles.some(rel => rel.startsWith('backend/') && rel.endsWith('.py'));
  const highRiskDetected = Object.keys(highRiskByChangedFile).length > 0;

  if ((frontendChanged && (highRiskDetected || terms.size)) || args.includeAllEssential) {
    const backendMatches = findMatchingFiles(allFiles, terms, rules.backendRoots, rel => rel.endsWith('.py')).slice(0, modeCfg.backendSearchLimit);
    let apiCount = 0;
    for (const rel of backendMatches) {
      if (rel.startsWith('backend/app/api/')) apiCount++;
      addCandidate(repoRoot, ignore, included, excluded, rel, 'backend/frontend contract match from changed frontend terms', { required: false, maxBytes: args.maxFileBytes });
    }
    if (frontendChanged && highRiskDetected && apiCount === 0) {
      const msg = 'Frontend changed files contain high-risk action/backend keywords but no backend/app/api proof file was matched.';
      if (args.strict) failures.push(msg); else warnings.push(msg);
    }
  }

  if (backendChanged) {
    for (const rel of ['backend/app/main.py', 'backend/app/database.py', 'backend/app/models/models.py', 'backend/app/schemas/schemas.py']) {
      addCandidate(repoRoot, ignore, included, excluded, rel, 'backend API support spine', { required: false, maxBytes: args.maxFileBytes });
    }
  }

  const sharedOperationalChanged = changedTextFiles.some(rel => rel.startsWith('frontend/src/components/shared/Operational'));
  if (sharedOperationalChanged || (args.includeAllEssential && args.mode !== 'minimal')) {
    for (const rel of allFiles) {
      if (/^frontend\/src\/components\/shared\/Operational.*\.(ts|tsx)$/.test(rel)) {
        addCandidate(repoRoot, ignore, included, excluded, rel, 'shared operational contract family', { required: false, maxBytes: args.maxFileBytes });
      }
    }
  }

  const testMatches = findMatchingFiles(allFiles, terms, null, rel => isTestFile(rel) && /\.(ts|tsx|js|jsx|py)$/.test(rel)).slice(0, modeCfg.testLimit);
  for (const rel of testMatches) {
    addCandidate(repoRoot, ignore, included, excluded, rel, 'relevant test match from changed terms', { required: false, maxBytes: args.maxFileBytes });
  }

  for (const rel of changedFiles) {
    const ext = path.extname(rel);
    const baseNoExt = rel.slice(0, rel.length - ext.length);
    const nearby = [
      `${baseNoExt}.test${ext}`, `${baseNoExt}.spec${ext}`,
      path.join(path.dirname(rel), '__tests__', path.basename(baseNoExt) + `.test${ext}`),
      path.join(path.dirname(rel), '__tests__', path.basename(baseNoExt) + `.spec${ext}`),
    ].map(normalizeRel);
    for (const t of nearby) addCandidate(repoRoot, ignore, included, excluded, t, `same/nearby test for ${rel}`, { required: false, maxBytes: args.maxFileBytes });
  }

  if (backendChanged) {
    const backendTestIncluded = Array.from(included.keys()).some(rel => rel.startsWith('backend/') && isTestFile(rel));
    if (!backendTestIncluded) {
      const msg = 'Backend changed but no matching backend test was included.';
      if (args.strict) failures.push(msg); else warnings.push(msg);
    }
  }
  if (sharedOperationalChanged) {
    const sharedTestIncluded = Array.from(included.keys()).some(rel => rel.startsWith('frontend/src/components/shared/') && isTestFile(rel));
    if (!sharedTestIncluded) {
      const msg = 'Shared operational frontend file changed but no shared contract test was included.';
      if (args.strict) failures.push(msg); else warnings.push(msg);
    }
  }

  const forbiddenIncluded = Array.from(included.keys()).filter(rel => forbiddenReason(rel, ignore));
  if (forbiddenIncluded.length) failures.push(`Forbidden files would be included: ${forbiddenIncluded.join(', ')}`);
  if (failures.length) {
    console.error('FAIL: Capsule generation blocked.');
    for (const f of failures) console.error(`- ${f}`);
    process.exit(2);
  }

  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'sysgrid-ai-review-capsule-'));
  const generated = {};
  const gitStatus = run('git', ['status', '--short'], { cwd: repoRoot, allowFail: true }).stdout;
  const branch = run('git', ['branch', '--show-current'], { cwd: repoRoot, allowFail: true }).stdout.trim();
  const head = run('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, allowFail: true }).stdout.trim();
  const diffStat = run('git', ['diff', '--stat', args.base], { cwd: repoRoot, allowFail: true, maxBuffer: 30 * 1024 * 1024 }).stdout;
  const numStat = run('git', ['diff', '--numstat', args.base], { cwd: repoRoot, allowFail: true, maxBuffer: 30 * 1024 * 1024 }).stdout;
  let fullDiff = run('git', ['diff', args.base], { cwd: repoRoot, allowFail: true, maxBuffer: 80 * 1024 * 1024 }).stdout;
  const stagedDiff = run('git', ['diff', '--cached'], { cwd: repoRoot, allowFail: true, maxBuffer: 80 * 1024 * 1024 }).stdout;
  if (stagedDiff.trim()) fullDiff += `\n\n# ===== STAGED DIFF =====\n\n${stagedDiff}`;
  fullDiff = maybeTruncate('FULL_DIFF.diff', fullDiff, args.maxDiffBytes, warnings);

  const includedRows = Array.from(included.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([rel, reasons]) => {
    const st = statFileSafe(path.join(repoRoot, rel));
    return { file: rel, bytes: st ? st.size : null, reasons: Array.from(reasons).sort() };
  });
  const excludedRows = Array.from(excluded.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([file, reason]) => ({ file, reason }));

  const riskKeywordMap = buildRiskKeywordMap(repoRoot, Array.from(included.keys()), rules, Math.min(args.maxFileBytes, 800000));
  const frontendMap = buildFrontendComponentMap(repoRoot, allFiles, rules, ignore, modeCfg.mapContentBytes);
  const backendRouteMap = buildBackendRouteMap(repoRoot, allFiles, rules, ignore, modeCfg.mapContentBytes);
  const testMap = buildTestMap(allFiles, rules, ignore);
  const projectConfigMap = buildProjectConfigMap(repoRoot, allFiles, ignore);
  const contractSignalMap = {
    frontendChanged,
    backendChanged,
    sharedOperationalChanged,
    changedFiles,
    highRiskByChangedFile,
    detectedTerms: Array.from(terms).sort(),
    backendApiIncluded: includedRows.filter(x => x.file.startsWith('backend/app/api/')).map(x => x.file),
    backendTestsIncluded: includedRows.filter(x => x.file.startsWith('backend/') && isTestFile(x.file)).map(x => x.file),
    frontendTestsIncluded: includedRows.filter(x => x.file.startsWith('frontend/') && isTestFile(x.file)).map(x => x.file),
    warnings
  };

  generated['DIFFS/DIFF_STAT.txt'] = diffStat || '[no unstaged diff stat]\n';
  generated['DIFFS/NUMSTAT.txt'] = numStat || '[no unstaged numstat]\n';
  generated['DIFFS/FULL_DIFF.diff'] = fullDiff || '[no unstaged/staged diff]\n';
  generated['DIFFS/FULL_DIFF_NUMBERED.diff'] = lineNumbered(fullDiff || '[no unstaged/staged diff]\n');
  generated['GENERATED_MAPS/REPO_TREE_PRUNED.txt'] = buildRepoTreePruned(allFiles, ignore);
  generated['GENERATED_MAPS/PROJECT_CONFIG_MAP.json'] = projectConfigMap;
  generated['GENERATED_MAPS/FRONTEND_COMPONENT_MAP.json'] = frontendMap;
  generated['GENERATED_MAPS/BACKEND_ROUTE_MAP.json'] = backendRouteMap;
  generated['GENERATED_MAPS/TEST_MAP.json'] = testMap;
  generated['GENERATED_MAPS/RISK_KEYWORD_MAP.json'] = riskKeywordMap;
  generated['GENERATED_MAPS/IMPORT_GRAPH_SLICE.json'] = importGraph;
  generated['GENERATED_MAPS/CONTRACT_SIGNAL_MAP.json'] = contractSignalMap;
  generated['INCLUDED_FILES.txt'] = includedRows.map(x => `${x.file}\t${x.bytes ?? '?'} bytes\t${x.reasons.join(' | ')}`).join('\n') + '\n';
  generated['EXCLUDED_FILES.txt'] = excludedRows.map(x => `${x.file}\t${x.reason}`).join('\n') + '\n';
  generated['WARNINGS_AND_GAPS.md'] = warnings.length ? warnings.map(w => `- ${w}`).join('\n') + '\n' : 'No warnings.\n';
  generated['AI_REVIEW_MANIFEST.md'] = buildManifest({
    args, repoRoot, branch, head, gitStatus, changedFiles, includedRows, excludedRows,
    warnings, generatedKeys: Object.keys(generated).sort(), rulesVersion: VERSION
  });

  writeGeneratedFiles(stage, generated);

  for (const row of includedRows) {
    const src = path.join(repoRoot, row.file);
    const dst = path.join(stage, 'SOURCE_SLICE', row.file);
    copyFileEnsured(src, dst);
  }

  // Final safety scan of staged capsule paths before zipping.
  const stagedFiles = collectDirFiles(stage);
  const badStaged = [];
  for (const abs of stagedFiles) {
    const rel = normalizeRel(path.relative(stage, abs));
    const sourceRel = rel.startsWith('SOURCE_SLICE/') ? rel.slice('SOURCE_SLICE/'.length) : rel;
    const forbid = rel.startsWith('SOURCE_SLICE/') ? forbiddenReason(sourceRel, ignore) : null;
    if (forbid) badStaged.push(`${rel}: ${forbid}`);
  }
  if (badStaged.length) {
    fs.rmSync(stage, { recursive: true, force: true });
    die(`Staged capsule contains forbidden files:\n${badStaged.join('\n')}`);
  }

  const zipRes = run('zip', ['-qr', outAbs, '.'], { cwd: stage, allowFail: true, maxBuffer: 30 * 1024 * 1024 });
  if (zipRes.status !== 0) {
    fs.rmSync(stage, { recursive: true, force: true });
    die(`zip failed:\n${zipRes.stderr || zipRes.stdout}`);
  }

  const outStat = fs.statSync(outAbs);
  const largest = stagedFiles.map(abs => {
    const st = fs.statSync(abs);
    return { rel: normalizeRel(path.relative(stage, abs)), bytes: st.size };
  }).sort((a, b) => b.bytes - a.bytes).slice(0, 20);
  fs.rmSync(stage, { recursive: true, force: true });

  console.log(warnings.length ? 'WARN: Capsule created with warnings.' : 'PASS: Capsule created.');
  console.log(`output: ${outAbs}`);
  console.log(`mode: ${args.mode}`);
  console.log(`size: ${formatBytes(outStat.size)}`);
  console.log(`included_source_files: ${includedRows.length}`);
  console.log(`generated_files: ${Object.keys(generated).length}`);
  if (warnings.length) {
    console.log('\nwarnings:');
    for (const w of warnings) console.log(`- ${w}`);
  }
  console.log('\ntop_largest_capsule_files:');
  for (const item of largest) console.log(`- ${formatBytes(item.bytes)}\t${item.rel}`);
}

function buildManifest(ctx) {
  const topLargestSource = ctx.includedRows.slice().sort((a, b) => (b.bytes || 0) - (a.bytes || 0)).slice(0, 20);
  const grouped = {};
  for (const row of ctx.includedRows) {
    for (const reason of row.reasons) {
      const key = reason.replace(/\s+from\s+.*$/, '').replace(/\s+for\s+.*$/, '');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row.file);
    }
  }
  return `# AI Review Manifest\n\n` +
`This file is a mechanical evidence/index file only. It does not describe user intent, desired solution, PASS/FAIL verdict, Linear state, or task narrative.\n\n` +
`## Generator\n\n` +
`- tool: SysGrid AI Review Capsule Generator\n` +
`- version: ${ctx.rulesVersion}\n` +
`- generated_at: ${new Date().toISOString()}\n` +
`- mode: ${ctx.args.mode}\n` +
`- base_ref: ${ctx.args.base}\n` +
`- strict: ${ctx.args.strict}\n` +
`- include_all_essential: ${ctx.args.includeAllEssential}\n\n` +
`## Git\n\n` +
`- repo_root: ${ctx.repoRoot}\n` +
`- branch: ${ctx.branch || '[unknown]'}\n` +
`- head: ${ctx.head || '[unknown]'}\n\n` +
`### Git status --short\n\n` +
'```\n' + (ctx.gitStatus || '[clean]\n') + '```\n\n' +
`## Changed files\n\n` +
(ctx.changedFiles.length ? ctx.changedFiles.map(f => `- ${f}`).join('\n') : '- [none detected]') + '\n\n' +
`## Generated capsule files\n\n` +
ctx.generatedKeys.map(f => `- ${f}`).join('\n') + '\n\n' +
`## Included source files by reason\n\n` +
Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).map(([reason, files]) => {
  return `### ${reason}\n\n` + Array.from(new Set(files)).sort().map(f => `- ${f}`).join('\n');
}).join('\n\n') + '\n\n' +
`## Included source files flat list\n\n` +
ctx.includedRows.map(x => `- ${x.file} (${x.bytes ?? '?'} bytes)`).join('\n') + '\n\n' +
`## Warnings and gaps\n\n` +
(ctx.warnings.length ? ctx.warnings.map(w => `- ${w}`).join('\n') : '- [none]') + '\n\n' +
`## Excluded candidate files\n\n` +
(ctx.excludedRows.length ? ctx.excludedRows.slice(0, 200).map(x => `- ${x.file}: ${x.reason}`).join('\n') : '- [none]') +
(ctx.excludedRows.length > 200 ? `\n- [truncated ${ctx.excludedRows.length - 200} additional excluded candidates; see EXCLUDED_FILES.txt]\n` : '\n') + '\n' +
`## Top largest included source files\n\n` +
(topLargestSource.length ? topLargestSource.map(x => `- ${x.file}: ${x.bytes ?? '?'} bytes`).join('\n') : '- [none]') + '\n';
}

main();
