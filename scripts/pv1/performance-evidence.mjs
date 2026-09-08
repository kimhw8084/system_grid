import { readFile, writeFile } from 'node:fs/promises'

export function percentile(values, fraction) {
  const ordered = [...values].sort((left, right) => left - right)
  if (!ordered.length) return null
  return ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * fraction))]
}

export function validateMeasurement(measurement, requiredSampleCount = 100) {
  const errors = []
  const warmup = Array.isArray(measurement?.warmup_samples) ? measurement.warmup_samples : []
  const measured = Array.isArray(measurement?.measured_samples) ? measurement.measured_samples : []
  if (measurement?.status === 'NOT_APPLICABLE') return errors
  if (warmup.length !== Number(measurement?.warmup_sample_count)) errors.push('warmup_sample_count does not match warmup_samples')
  if (measured.length !== Number(measurement?.measured_sample_count)) errors.push('measured_sample_count does not match measured_samples')
  if (measured.length !== requiredSampleCount) errors.push(`measured sample count must be exactly ${requiredSampleCount}`)
  if (Number(measurement?.sample_count) !== measured.length) errors.push('sample_count includes non-measured samples')
  if (measurement?.p50_ms !== percentile(measured, 0.5)) errors.push('p50_ms does not match measured_samples')
  if (measurement?.p95_ms !== percentile(measured, 0.95)) errors.push('p95_ms does not match measured_samples')
  if (measurement?.max_ms !== (measured.length ? Math.max(...measured) : null)) errors.push('max_ms does not match measured_samples')
  return errors
}

export function validateProfileMeasurements(record, requiredSampleCount = 100) {
  const errors = []
  for (const [name, measurement] of Object.entries(record?.measurements || {})) {
    for (const error of validateMeasurement(measurement, requiredSampleCount)) errors.push(`${record?.profile || 'unknown'}:${record?.variant || 'unknown'}:${name}: ${error}`)
  }
  return errors
}

function recordsFromPayload(payload) {
  if (Array.isArray(payload?.variant_runs)) return payload.variant_runs
  if (Array.isArray(payload?.profiles)) return payload.profiles.flatMap((profile) => profile.variant_runs || [])
  if (payload && typeof payload === 'object' && payload.measurements && typeof payload.measurements === 'object') return [payload]
  return []
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const inputIndex = process.argv.indexOf('--input')
  if (inputIndex < 0) throw new Error('--input is required')
  const payload = JSON.parse(await readFile(process.argv[inputIndex + 1], 'utf8'))
  const errors = recordsFromPayload(payload).flatMap((record) => validateProfileMeasurements(record))
  const result = { schema: 'sysgrid.pv1.performance-evidence-integrity.v1', record_count: recordsFromPayload(payload).length, errors, verdict: errors.length === 0 }
  const outputIndex = process.argv.indexOf('--output')
  if (outputIndex >= 0) await writeFile(process.argv[outputIndex + 1], `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.verdict ? 0 : 1)
}
