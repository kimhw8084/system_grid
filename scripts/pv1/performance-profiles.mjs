#!/usr/bin/env node

import os from 'node:os'
import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { loadDesignPackage, REPOSITORY_ROOT } from './design-package.mjs'

const PROFILES = {
  Small: {
    projects: 1,
    selected_tasks: 25,
    selected_edges: 30,
    architecture_objects: null,
    architecture_relations: null,
    contextual_projection_objects: null,
  },
  Typical: {
    projects: 100,
    selected_tasks: 500,
    selected_edges: 750,
    architecture_objects: null,
    architecture_relations: null,
    contextual_projection_objects: null,
  },
  Large: {
    projects: 10000,
    selected_tasks: 10000,
    selected_edges: 20000,
    architecture_objects: null,
    architecture_relations: null,
    contextual_projection_objects: null,
  },
  Architecture: {
    projects: null,
    selected_tasks: null,
    selected_edges: null,
    architecture_objects: 5000,
    architecture_relations: 10000,
    contextual_projection_objects: 200,
  },
}

const BUDGETS = {
  local_interaction_p95_ms: 100,
  visible_drag_frame_p95_ms: 32,
  individual_task_max_ms: 100,
  project_home_usable_p95_ms: 2500,
  loaded_destination_switch_p95_ms: 300,
  simple_command_ack_p95_ms: 800,
  schedule_preview_500_task_p95_ms: 200,
  schedule_preview_10000_task_p95_ms: 1500,
  architecture_projection_usable_p95_ms: 2000,
  concurrent_users: 50,
  concurrent_task_writers: 10,
  unexpected_5xx_fraction: 0.001,
}

export const REQUIRED_VARIANTS = [
  'long_names',
  'deep_wbs_to_8_levels',
  'unscheduled_work',
  'dense_dependencies',
  'archived_data',
  'mixed_permissions',
]

function parseArgs(argv) {
  const args = { profile: 'all' }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--profile') args.profile = argv[++index]
    else if (token === '--output-dir') args.outputDir = path.resolve(argv[++index])
    else if (token === '--help' || token === '-h') args.help = true
    else throw new Error(`Unknown argument: ${token}`)
  }
  return args
}

function profileResult(name, definition, design) {
  return {
    profile: name,
    fixture_status: 'DECLARED',
    fixture: {
      ...definition,
      required_variants: REQUIRED_VARIANTS,
      variant_matrix: REQUIRED_VARIANTS.map((variant) => ({ variant, declared: true, instantiated: false, executed: false, artifact_produced: false })),
    },
    budgets: BUDGETS,
    measurement: {
      status: 'NOT_MEASURED',
      reason: 'This deterministic manifest does not substitute for a pinned production-build browser/load run. Execute the profile with the release evidence harness before declaring performance requirements verified.',
    },
    design_sha256: design.specificationSha256,
  }
}

export async function runPerformanceProfiles({ profile = 'all', outputDir } = {}) {
  const design = await loadDesignPackage()
  const selectedNames = profile === 'all' ? Object.keys(PROFILES) : [profile]
  for (const name of selectedNames) {
    if (!PROFILES[name]) throw new Error(`Unknown performance profile: ${name}`)
  }
  const result = {
    schema: 'sysgrid.pv1.performance-profile-manifest.v1',
    generated_at: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu_count: os.cpus().length,
      memory_bytes: os.totalmem(),
      reference_network: { rtt_ms: 100, downstream_mbps: 20 },
      constrained_network: { rtt_ms: 150, downstream_mbps: 10 },
      browser: 'NOT_RECORDED_BY_MANIFEST',
    },
    profiles: selectedNames.map((name) => profileResult(name, PROFILES[name], design)),
  }
  if (outputDir) {
    await mkdir(outputDir, { recursive: true })
    await writeFile(path.join(outputDir, 'performance-profile-manifest.json'), `${JSON.stringify(result, null, 2)}\n`)
  }
  return result
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseArgs(process.argv.slice(2))
    if (args.help) {
      console.log('Usage: node scripts/pv1/performance-profiles.mjs [--profile Small|Typical|Large|Architecture|all] [--output-dir <path>]')
    } else {
      const result = await runPerformanceProfiles(args)
      console.log(JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error(error.stack || error.message)
    process.exitCode = 1
  }
}
