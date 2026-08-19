import { describe, expect, it } from 'vitest'
import {
  formatFarHistoryValue,
  getFarHistoryRestoreAction,
} from './FAR.versionHistoryContract'

describe('FAR forensic history convergence', () => {
  it('formats structured intervention deltas without object coercion loss', () => {
    expect(formatFarHistoryValue([{ id: 4, status: 'Verified' }])).toBe('[{"id":4,"status":"Verified"}]')
    expect(formatFarHistoryValue([1, 2, 3])).toBe('1, 2, 3')
    expect(formatFarHistoryValue([])).toBe('—')
  })

  it('allows only safe core restores', () => {
    expect(getFarHistoryRestoreAction({ isArchived: false, isCurrent: false, isPending: false, coreRestoreAvailable: true, version: 4 })).toEqual({
      disabled: false,
      label: 'Restore core v4',
      title: 'Restore FAR-owned core content while preserving current intervention objects and lifecycle state',
    })
    expect(getFarHistoryRestoreAction({ isArchived: false, isCurrent: false, isPending: false, coreRestoreAvailable: false, version: 3 }).label).toBe('No core change')
  })

  it('keeps lifecycle and current-version blockers explicit', () => {
    expect(getFarHistoryRestoreAction({ isArchived: true, isCurrent: false, isPending: false, coreRestoreAvailable: true, version: 2 }).label).toBe('Restore lifecycle first')
    expect(getFarHistoryRestoreAction({ isArchived: false, isCurrent: true, isPending: false, coreRestoreAvailable: false, version: 7 }).label).toBe('Current content')
  })
})
