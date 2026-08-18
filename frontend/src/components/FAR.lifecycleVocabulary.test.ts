import { describe, expect, it } from 'vitest'
import {
  getFarLifecycleEndpoint,
  getFarLifecycleRevertAction,
  isFarLifecycleAction,
} from './FAR.lifecycleVocabulary'

describe('FAR lifecycle vocabulary', () => {
  it('maps canonical archive and restore actions to canonical endpoints', () => {
    expect(getFarLifecycleEndpoint('archive')).toBe('/api/v1/far/modes/bulk-archive')
    expect(getFarLifecycleEndpoint('restore')).toBe('/api/v1/far/modes/bulk-restore')
  })

  it('keeps lifecycle revert symmetric', () => {
    expect(getFarLifecycleRevertAction('archive')).toBe('restore')
    expect(getFarLifecycleRevertAction('restore')).toBe('archive')
  })

  it('rejects legacy delete and purge vocabulary', () => {
    expect(isFarLifecycleAction('archive')).toBe(true)
    expect(isFarLifecycleAction('restore')).toBe(true)
    expect(isFarLifecycleAction('delete')).toBe(false)
    expect(isFarLifecycleAction('purge')).toBe(false)
    expect(isFarLifecycleAction(undefined)).toBe(false)
  })
})
