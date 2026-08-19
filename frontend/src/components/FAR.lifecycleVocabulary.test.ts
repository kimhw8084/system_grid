import { describe, expect, it } from 'vitest'
import {
  buildFarLifecycleRequest,
  buildFarLifecycleRevertPayload,
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

  it('binds lifecycle execution to the versions represented by the previewed rows', () => {
    expect(buildFarLifecycleRequest([7, 9], [
      { id: 7, version: 3 },
      { id: 9, version: 5 },
    ])).toEqual({
      ids: [7, 9],
      expected_versions: { '7': 3, '9': 5 },
    })
    expect(() => buildFarLifecycleRequest([7], [{ id: 7 }])).toThrow(/positive FAR record version/)
  })

  it('binds lifecycle revert to the versions returned by the successful mutation', () => {
    expect(buildFarLifecycleRevertPayload([7, 9], { '7': 4, '9': 6 })).toEqual({
      expected_versions: { '7': 4, '9': 6 },
    })
    expect(buildFarLifecycleRevertPayload([7], {})).toBeNull()
  })

  it('rejects legacy delete and purge vocabulary', () => {
    expect(isFarLifecycleAction('archive')).toBe(true)
    expect(isFarLifecycleAction('restore')).toBe(true)
    expect(isFarLifecycleAction('delete')).toBe(false)
    expect(isFarLifecycleAction('purge')).toBe(false)
    expect(isFarLifecycleAction(undefined)).toBe(false)
  })
})
