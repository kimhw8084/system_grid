import { describe, expect, it } from 'vitest'
import {
  getFarMutationFailureMessage,
  requireFarExpectedVersion,
  withFarExpectedVersion,
} from './FAR.mutationIntegrity'

describe('FAR mutation integrity', () => {
  it('binds every content mutation to one positive current version', () => {
    expect(withFarExpectedVersion(7, { title: 'Timeout' })).toEqual({ title: 'Timeout', expected_version: 7 })
    expect(requireFarExpectedVersion('9')).toBe(9)
    expect(() => requireFarExpectedVersion(0)).toThrow(/positive FAR record version/)
    expect(() => requireFarExpectedVersion(undefined)).toThrow(/positive FAR record version/)
  })

  it('turns version conflicts into an actionable refresh message', () => {
    expect(getFarMutationFailureMessage({
      detail: {
        code: 'far_mode_version_conflict',
        id: 42,
        expected_version: 3,
        actual_version: 4,
      },
    }, 409)).toContain('expected v3, current v4')
    expect(getFarMutationFailureMessage({
      detail: { code: 'far_mode_archived_read_only', id: 42, actual_version: 4 },
    }, 409)).toContain('Archived failure vectors are read-only')
    expect(getFarMutationFailureMessage({
      detail: {
        code: 'far_lifecycle_precondition_failed',
        missing_ids: [],
        version_conflicts: [{ id: 42, expected_version: 4, actual_version: 5 }],
      },
    }, 409)).toContain('expected v4, current v5')
  })

  it('explains forensic-history restore blockers without exposing raw structured errors', () => {
    expect(getFarMutationFailureMessage({
      detail: { code: 'far_history_no_core_change', version: 4, restore_scope: 'core_content' },
    }, 409)).toContain('no restorable core-content difference')
    expect(getFarMutationFailureMessage({
      detail: { code: 'far_history_restore_missing_assets', missing_ids: [7, 8] },
    }, 409)).toContain('2 asset records no longer exist')
    expect(getFarMutationFailureMessage({
      detail: { code: 'far_history_restore_missing_causes', missing_ids: [11] },
    }, 409)).toContain('1 root-cause record no longer exists')
  })
})
