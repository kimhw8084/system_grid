import { describe, expect, it, vi } from 'vitest'
import { formatAppDate, formatAppDay, formatAppTime, parseAppDate } from './dateUtils'

describe('dateUtils', () => {
  it('returns safe fallbacks for empty or invalid values', () => {
    expect(formatAppDate(null)).toBe('N/A')
    expect(formatAppDate('not-a-date')).toBe('Invalid Date')
    expect(parseAppDate(undefined)).toBeNull()
    expect(parseAppDate('invalid')).toBeNull()
  })

  it('treats naive ISO timestamps as UTC and preserves zoned timestamps', () => {
    const naive = parseAppDate('2025-05-01T12:30:00')
    const zoned = parseAppDate('2025-05-01T12:30:00Z')

    expect(naive?.toISOString()).toBe('2025-05-01T12:30:00.000Z')
    expect(zoned?.toISOString()).toBe('2025-05-01T12:30:00.000Z')
  })

  it('formats date-only and time-only variants consistently', () => {
    const value = '2025-05-01T12:30:45Z'

    expect(formatAppTime(value)).not.toContain('2025')
    expect(formatAppDay(value)).not.toContain('12:30')
    expect(formatAppDate(value)).toContain('05')
  })

  it('leaves non-ISO date-only strings untouched for parsing and formatting', () => {
    expect(parseAppDate('2025-05-01')?.toISOString()).toContain('2025-05-01')
    expect(formatAppDate('2025-05-01')).not.toBe('Invalid Date')
  })

  it('gracefully handles unexpected runtime exceptions', () => {
    const noisyConsole = vi.spyOn(console, 'error').mockImplementation(() => {})
    const explosiveValue = {
      includes() {
        throw new Error('boom')
      },
      toString() {
        return '2025-05-01T12:30:00'
      },
    } as unknown as string

    expect(formatAppDate(explosiveValue)).toBe('Error')
    expect(parseAppDate(explosiveValue)).toBeNull()
    expect(noisyConsole).toHaveBeenCalled()
  })
})
