import { describe, expect, it } from 'vitest'
import {
  buildFarMitigationFormState,
  buildFarMitigationPayload,
  getFarMitigationStatusOptions,
  normalizeFarMitigationStatus,
  validateFarExternalBkmUrl,
} from './FAR.mitigationModel'

describe('FAR mitigation model', () => {
  it('preserves canonical status and Process Change', () => {
    expect(normalizeFarMitigationStatus('Not Started')).toBe('Not Started')
    expect(normalizeFarMitigationStatus('In Progress')).toBe('In Progress')
    expect(normalizeFarMitigationStatus('Completed')).toBe('Completed')
    const state = buildFarMitigationFormState('WORKAROUND', {
      mitigation_type: 'Process Change',
      mitigation_steps: 'Require peer review before deployment',
      status: 'Not Started',
    })
    expect(state.mitigation_type).toBe('Process Change')
    expect(buildFarMitigationPayload(state, 7, 9)).toEqual({
      mitigation_type: 'Process Change',
      mitigation_steps: 'Require peer review before deployment',
      responsible_team: null,
      status: 'Not Started',
      mode_ids: [7],
      cause_id: 9,
    })
  })

  it('only offers the current or next status while editing', () => {
    expect(getFarMitigationStatusOptions('Not Started')).toEqual(['Not Started', 'In Progress'])
    expect(getFarMitigationStatusOptions('In Progress')).toEqual(['In Progress', 'Completed'])
    expect(getFarMitigationStatusOptions('Completed')).toEqual(['Completed'])
  })

  it('requires Monitoring provenance and strips unrelated provenance', () => {
    const state = buildFarMitigationFormState('MONITORING')
    state.mitigation_steps = 'Alert on sustained queue depth'
    expect(() => buildFarMitigationPayload(state, 1, 2)).toThrow('Monitoring reference is required')
    state.monitoring_item_id = '42'
    state.bkm_id = '99'
    expect(buildFarMitigationPayload(state, 1, 2)).toMatchObject({ monitoring_item_id: 42 })
    expect(buildFarMitigationPayload(state, 1, 2)).not.toHaveProperty('knowledge_bkm_id')
  })

  it('keeps direct and external Workaround provenance mutually exclusive', () => {
    const state = buildFarMitigationFormState('WORKAROUND')
    state.mitigation_steps = 'Use the documented recovery sequence'
    state.bkm_id = '12'
    state.external_bkm_url = 'https://example.com/ignored'
    expect(buildFarMitigationPayload(state, 1, 2)).toMatchObject({ knowledge_bkm_id: 12 })
    expect(buildFarMitigationPayload(state, 1, 2)).not.toHaveProperty('external_bkm_url')

    state.bkm_mode = 'input'
    expect(buildFarMitigationPayload(state, 1, 2)).toMatchObject({ external_bkm_url: 'https://example.com/ignored' })
    expect(buildFarMitigationPayload(state, 1, 2)).not.toHaveProperty('knowledge_bkm_id')
  })

  it('rejects malformed, unsafe, and credential-bearing external BKM URLs', () => {
    expect(() => validateFarExternalBkmUrl('javascript:alert(1)')).toThrow()
    expect(() => validateFarExternalBkmUrl('https://user:secret@example.com/runbook')).toThrow('embedded credentials')
    expect(() => validateFarExternalBkmUrl(`https://example.com/${'a'.repeat(2050)}`)).toThrow('too long')
    expect(() => validateFarExternalBkmUrl('not a url')).toThrow()
    expect(validateFarExternalBkmUrl('https://example.com/runbook')).toBe('https://example.com/runbook')
  })
})
