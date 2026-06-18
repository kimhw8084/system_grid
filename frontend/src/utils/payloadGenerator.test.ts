import { describe, expect, it, vi } from 'vitest'
import { PayloadGenerator } from './payloadGenerator'

describe('PayloadGenerator', () => {
  it('drops a required field from a copied payload', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const validData = { title: 'Service', severity: 'High' }

    const payload = PayloadGenerator.getMissingFieldPayload(['title', 'severity'], validData)

    expect(payload).toEqual({ severity: 'High' })
    expect(validData).toEqual({ title: 'Service', severity: 'High' })
  })

  it('injects an invalid object type into the targeted field', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const validData = { title: 'Service', severity: 'High' }

    const payload = PayloadGenerator.getInvalidTypePayload(['title', 'severity'], validData)

    expect(payload).toEqual({
      title: 'Service',
      severity: { invalid: 'object' },
    })
    expect(validData).toEqual({ title: 'Service', severity: 'High' })
  })
})
