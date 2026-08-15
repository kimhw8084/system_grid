import { describe, expect, it } from 'vitest'
import {
  buildFarAuthoringDraft,
  buildFarAuthoringErrors,
  changeFarAuthoringSystem,
  getFarAuthoringFirstErrorTab,
  getFarAuthoringTabErrorCounts,
  sanitizeFarAuthoringPayload,
} from './FAR.authoringModel'

describe('FAR authoring model', () => {
  it('normalizes relationship-shaped assets without losing FAR authoring fields', () => {
    const draft = buildFarAuthoringDraft({
      id: 42,
      system_name: 'Payments',
      failure_type: 'Software',
      title: 'Timeout',
      severity: 8,
      occurrence: 4,
      detection: 3,
      affected_assets: [{ id: 7, name: 'api-01' }, { id: 9, name: 'api-02' }],
    })

    expect(draft.affected_assets).toEqual([7, 9])
    expect(draft.system_name).toBe('Payments')
    expect(draft.failure_type).toBe('Software')
    expect(draft.title).toBe('Timeout')
  })

  it('preserves the existing writable payload contract while stripping relationship and read-only fields', () => {
    const payload = sanitizeFarAuthoringPayload({
      id: 42,
      system_name: 'Payments',
      failure_type: 'Software',
      title: 'Timeout',
      effect: 'Requests fail',
      severity: 8,
      occurrence: 4,
      detection: 3,
      rpn: 96,
      status: 'Open',
      metadata_json: { linked_research_ids: [5] },
      affected_assets: [{ id: 7 }, 9],
      causes: [{ id: 1 }],
      mitigations: [{ id: 2 }],
      prevention_actions: [{ id: 3 }],
      linked_rcas: [{ id: 4 }],
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
      created_by_user_id: 11,
      version: 4,
      is_deleted: false,
    })

    expect(payload).toEqual({
      id: 42,
      system_name: 'Payments',
      failure_type: 'Software',
      title: 'Timeout',
      effect: 'Requests fail',
      severity: 8,
      occurrence: 4,
      detection: 3,
      rpn: 96,
      status: 'Open',
      metadata_json: { linked_research_ids: [5] },
      affected_assets: [7, 9],
    })
  })

  it('routes required identity and score failures to the correct authoring tabs', () => {
    const errors = buildFarAuthoringErrors({
      system_name: '',
      failure_type: '',
      title: '   ',
      severity: 0,
      occurrence: 11,
      detection: 2.5,
      affected_assets: [],
    })

    expect(errors).toMatchObject({
      system_name: expect.any(String),
      failure_type: expect.any(String),
      title: expect.any(String),
      severity: expect.any(String),
      occurrence: expect.any(String),
      detection: expect.any(String),
    })
    expect(getFarAuthoringTabErrorCounts(errors)).toEqual({ definition: 3, risk: 3, impact: 0 })
    expect(getFarAuthoringFirstErrorTab(errors)).toBe('definition')
  })

  it('accepts the existing valid FAR scoring domain', () => {
    expect(buildFarAuthoringErrors({
      system_name: 'Payments',
      failure_type: 'Software',
      title: 'Timeout',
      severity: 1,
      occurrence: 10,
      detection: 6,
    })).toEqual({})
  })

  it('clears stale asset mappings only when the operational domain actually changes', () => {
    const draft = { system_name: 'Payments', affected_assets: [7, 9], title: 'Timeout' }

    expect(changeFarAuthoringSystem(draft, 'Payments')).toBe(draft)
    expect(changeFarAuthoringSystem(draft, 'Identity')).toEqual({
      system_name: 'Identity',
      affected_assets: [],
      title: 'Timeout',
    })
  })
})
