import { describe, expect, it } from 'vitest'

import {
  BULK_NO_CHANGES_MESSAGE,
  buildOperationalLifecycleToastMessage,
} from './OperationalLifecycleToasts'

describe('buildOperationalLifecycleToastMessage', () => {
  it('returns the shared no-op message for archive no-ops', () => {
    expect(buildOperationalLifecycleToastMessage({
      action: 'archive',
      totalSelected: 3,
      changedCount: 0,
    })).toBe(BULK_NO_CHANGES_MESSAGE)
  })

  it('returns the shared no-op message for restore no-ops', () => {
    expect(buildOperationalLifecycleToastMessage({
      action: 'restore',
      totalSelected: 2,
      changedCount: 0,
    })).toBe(BULK_NO_CHANGES_MESSAGE)
  })

  it('returns the shared no-op message for purge no-ops', () => {
    expect(buildOperationalLifecycleToastMessage({
      action: 'purge',
      totalSelected: 4,
      changedCount: 0,
    })).toBe(BULK_NO_CHANGES_MESSAGE)
  })

  it('returns the shared no-op message for update no-ops', () => {
    expect(buildOperationalLifecycleToastMessage({
      action: 'update',
      totalSelected: 1,
      changedCount: 0,
      fieldLabel: 'Status',
    })).toBe(BULK_NO_CHANGES_MESSAGE)
  })

  it('preserves changed archive wording', () => {
    expect(buildOperationalLifecycleToastMessage({
      action: 'archive',
      totalSelected: 3,
      changedCount: 2,
    })).toBe('Archived 2 of 3 selected records.')
  })

  it('preserves changed restore wording', () => {
    expect(buildOperationalLifecycleToastMessage({
      action: 'restore',
      totalSelected: 3,
      changedCount: 2,
    })).toBe('Restored 2 of 3 selected records.')
  })

  it('preserves changed purge wording', () => {
    expect(buildOperationalLifecycleToastMessage({
      action: 'purge',
      totalSelected: 3,
      changedCount: 2,
    })).toBe('Permanently purged 2 of 3 selected records.')
  })

  it('gracefully handles missing, undefined, or unknown actions without throwing', () => {
    expect(buildOperationalLifecycleToastMessage({
      action: undefined as any,
      totalSelected: 3,
      changedCount: 2,
    })).toBe('Completed 2 of 3 selected records.')

    expect(buildOperationalLifecycleToastMessage({
      action: 'unknown_action' as any,
      totalSelected: 3,
      changedCount: 2,
    })).toBe('Unknown_action 2 of 3 selected records.')
  })
})
