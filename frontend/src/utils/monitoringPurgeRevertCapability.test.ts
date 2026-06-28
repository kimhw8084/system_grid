import { describe, expect, it } from 'vitest'
import { monitoringSupportsRestorePurged } from './monitoringPurgeRevertCapability'

describe('monitoringSupportsRestorePurged', () => {
  it('treats the stale backend unsupported action error as no restore capability', () => {
    expect(monitoringSupportsRestorePurged({
      data: { detail: 'Unsupported bulk action' },
    })).toBe(false)
  })

  it('treats current backend validation errors as restore capability present', () => {
    expect(monitoringSupportsRestorePurged({
      data: { detail: 'restore_purged requires payload.snapshots' },
    })).toBe(true)
  })

  it('falls back to generic errors as supported so truthful backends keep revert enabled', () => {
    expect(monitoringSupportsRestorePurged(new Error('API error: 500'))).toBe(true)
  })
})
