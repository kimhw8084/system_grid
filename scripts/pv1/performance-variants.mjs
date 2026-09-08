import { readFile, writeFile } from 'node:fs/promises'
import { REQUIRED_VARIANTS } from './performance-profiles.mjs'

export function validateVariantEvidence(records, requiredVariants = REQUIRED_VARIANTS) {
  const executed = new Set(records.filter((record) => record?.executed === true && record?.artifact_produced === true).map((record) => record.variant))
  const missing = requiredVariants.filter((variant) => !executed.has(variant))
  return { required: [...requiredVariants], instantiated: [...new Set(records.filter((record) => record?.instantiated === true).map((record) => record.variant))].sort(), executed: [...executed].sort(), missing, verdict: missing.length === 0 }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const index = process.argv.indexOf('--input')
  if (index < 0) throw new Error('--input is required')
  const payload = JSON.parse(await readFile(process.argv[index + 1], 'utf8'))
  const result = validateVariantEvidence(payload.variant_runs || payload.variants || [])
  const outputIndex = process.argv.indexOf('--output')
  if (outputIndex >= 0) await writeFile(process.argv[outputIndex + 1], `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.verdict ? 0 : 1)
}
