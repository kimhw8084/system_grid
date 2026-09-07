#!/usr/bin/env node

import path from 'node:path'
import { runProductionGate } from './pv1/gate.mjs'

function parseArgs(argv) {
  const args = { profile: 'release' }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--profile') args.profile = argv[++index]
    else if (token === '--output-dir') args.outputDir = path.resolve(argv[++index])
    else if (token === '--help' || token === '-h') args.help = true
    else throw new Error(`Unknown argument: ${token}`)
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  console.log('Usage: node scripts/run-project-view-production-gate.mjs --profile release [--output-dir <path>]')
  process.exit(0)
}

try {
  const result = await runProductionGate(args)
  console.log(JSON.stringify({
    phase: result.phase,
    profile: result.profile,
    verdict: result.verdict,
    exit_code: result.exit_code,
    total_required: result.arithmetic.total_required,
    verified: result.arithmetic.verified,
    failed: result.arithmetic.failed,
    blocked: result.arithmetic.blocked,
    not_evaluated: result.arithmetic.not_evaluated,
    output_dir: result.output_dir,
  }, null, 2))
  process.exitCode = result.exit_code
} catch (error) {
  console.error(error.stack || error.message)
  process.exitCode = 1
}
