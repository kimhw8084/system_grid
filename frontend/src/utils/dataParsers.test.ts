import { describe, expect, it } from 'vitest'
import { parseCommaSeparatedValues } from './dataParsers'

describe('parseCommaSeparatedValues', () => {
  it('splits, trims, and removes empty values', () => {
    expect(parseCommaSeparatedValues(' alpha, beta ,, gamma ')).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('returns an empty list for nullish inputs', () => {
    expect(parseCommaSeparatedValues(undefined)).toEqual([])
    expect(parseCommaSeparatedValues(null)).toEqual([])
  })
})
