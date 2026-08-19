import { describe, expect, it } from 'vitest'
import {
  buildFarCauseMutationRequest,
  buildFarContextMutationRequest,
  requireFarContextModeId,
} from './FAR.causalIntegrity'

describe('FAR causal intervention integrity', () => {
  it('binds a context mutation to the exact parent id and version', () => {
    expect(buildFarContextMutationRequest(42, 7, { cause_id: 9 })).toEqual({
      cause_id: 9,
      mode_id: 42,
      expected_version: 7,
    })
  })

  it('binds cause creation/update to one explicit parent mode', () => {
    expect(buildFarCauseMutationRequest('42', 7, { cause_text: 'Power loss' })).toEqual({
      cause_text: 'Power loss',
      mode_ids: [42],
      mode_id: 42,
      expected_version: 7,
    })
  })

  it('rejects invalid parent ids before network mutation', () => {
    expect(requireFarContextModeId('9')).toBe(9)
    expect(() => requireFarContextModeId(0)).toThrow(/positive FAR mode id/)
    expect(() => requireFarContextModeId(undefined)).toThrow(/positive FAR mode id/)
  })
})
