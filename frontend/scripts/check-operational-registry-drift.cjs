#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const cliTargets = process.argv.slice(2)
const knownDefaultTargets = [
  // AssetReal remains legacy/deferred until its dedicated migration run.
  // Keep it out of the default sweep, but still allow explicit CLI scans.
  'src/components/ServicesReal.tsx',
  'src/components/NetworkReal.tsx',
  'src/components/VendorsReal.tsx',
]
const defaultTargets = cliTargets.length > 0
  ? cliTargets
  : knownDefaultTargets.filter((target) => fs.existsSync(path.resolve(repoRoot, target)))

const checks = [
  {
    pattern: /\bMonitoringForm\b/g,
    message: 'MonitoringForm referenced in non-monitoring target',
  },
  {
    pattern: /\bbuildMonitoringFormErrors\b/g,
    message: 'buildMonitoringFormErrors referenced in non-monitoring target',
  },
  {
    pattern: /\bgetMonitoringTabErrorCounts\b/g,
    message: 'getMonitoringTabErrorCounts referenced in non-monitoring target',
  },
  {
    pattern: /\/api\/v1\/monitoring\/[^'"`\s]+\/history/g,
    message: 'monitoring history endpoint referenced in non-monitoring target',
  },
  {
    pattern: /\/api\/v1\/monitoring\/[^'"`\s]+\/restore/g,
    message: 'monitoring restore endpoint referenced in non-monitoring target',
  },
  {
    pattern: /\bMONITORING_[A-Z0-9_]+\b/g,
    message: 'MONITORING_* constant referenced in non-monitoring target',
  },
]

if (defaultTargets.length === 0) {
  console.log('No target files available to scan for monitoring clone drift.')
  process.exit(0)
}

const failures = []

for (const target of defaultTargets) {
  const absolutePath = path.resolve(repoRoot, target)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${target}: file not found`)
    continue
  }

  const source = fs.readFileSync(absolutePath, 'utf8')
  for (const check of checks) {
    check.pattern.lastIndex = 0
    if (check.pattern.test(source)) {
      failures.push(`${target}: ${check.message}`)
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`No monitoring clone drift markers found in ${defaultTargets.length} file(s).`)
