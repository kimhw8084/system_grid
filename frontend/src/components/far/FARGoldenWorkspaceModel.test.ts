import { describe, expect, test } from 'vitest'
import {
  applyFARFilters,
  extractFARRows,
  farRiskBand,
  normalizeFARRecord,
  readFARRecordId,
  sanitizeFARSavedViewDefinition,
  updateFARRecordSearch,
  type FARFilterState,
} from './FARGoldenWorkspaceModel'

const now = new Date('2026-08-01T12:00:00Z')

const filters: FARFilterState = {
  preset: 'all',
  status: 'all',
  riskBand: 'all',
  owner: 'all',
  systems: [],
  searchTerm: '',
  mode: 'failure_modes',
}

function rawRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 17,
    title: 'Cooling loop pressure loss',
    system_name: 'Core Cooling',
    failure_type: 'Mechanical',
    effect: 'Reduced heat extraction',
    severity: 9,
    occurrence: 6,
    detection: 5,
    rpn: 270,
    risk_band: 'High',
    maturity_level: 6,
    status: 'Analyzing',
    version: 3,
    owner_user_id: null,
    owner_team: 'Reliability',
    due_at: '2026-07-01T00:00:00Z',
    is_retired: false,
    affected_assets: [{ name: 'pump-01' }],
    causes: [{ cause_text: 'Seal fatigue' }],
    mitigations: [{ mitigation_steps: 'Pressure alarm' }],
    prevention_actions: [{ prevention_action: 'Quarterly seal inspection' }],
    linked_rcas: [{ title: 'RCA-12' }],
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-07-30T00:00:00Z',
    ...overrides,
  }
}

describe('FAR authoritative workspace model', () => {
  test('normalizes the backend-aligned FAR payload without fictional fallback identity', () => {
    const record = normalizeFARRecord(rawRecord(), 0, now)

    expect(record.id).toBe(17)
    expect(record.rpn).toBe(270)
    expect(record.riskBand).toBe('High')
    expect(record.owner).toBe('Reliability')
    expect(record.affectedAssets).toEqual(['pump-01'])
    expect(record.causes).toEqual(['Seal fatigue'])
    expect(record.mitigations).toEqual(['Pressure alarm'])
    expect(record.preventionActions).toEqual(['Quarterly seal inspection'])
    expect(record.linkedRcas).toEqual(['RCA-12'])
    expect(record.overdue).toBe(true)
    expect(record.searchText).toContain('seal fatigue')
  })

  test('fails closed on malformed required fields, score mismatches, and unknown lifecycle values', () => {
    expect(() => normalizeFARRecord(rawRecord({ id: null }), 0, now)).toThrow(/Invalid FAR id/)
    expect(() => normalizeFARRecord(rawRecord({ title: null }), 0, now)).toThrow(/Invalid FAR title/)
    expect(() => normalizeFARRecord(rawRecord({ severity: 8, rpn: 270 }), 0, now)).toThrow(/RPN mismatch/)
    expect(() => normalizeFARRecord(rawRecord({ status: 'Open' }), 0, now)).toThrow(/Unknown FAR status/)
  })

  test('extracts envelopes and composes preset, system, risk, owner, status, mode, and search filters with AND semantics', () => {
    const rows = extractFARRows({ items: [
      rawRecord({ id: 1, title: 'Critical power loss', system_name: 'Power', status: 'Analyzing', severity: 10, occurrence: 8, detection: 5, rpn: 400, risk_band: 'Critical', owner_team: 'SRE' }),
      rawRecord({ id: 2, title: 'Minor sensor drift', system_name: 'Sensors', status: 'Eliminated', severity: 2, occurrence: 2, detection: 2, rpn: 8, risk_band: 'Low', owner_team: null, owner_user_id: null, causes: [], mitigations: [], prevention_actions: [] }),
    ] }, now)

    expect(applyFARFilters(rows, { ...filters, preset: 'high-risk' }, now).map((row) => row.id)).toEqual([1])
    expect(applyFARFilters(rows, { ...filters, preset: 'unassigned' }, now).map((row) => row.id)).toEqual([2])
    expect(applyFARFilters(rows, { ...filters, searchTerm: 'power', owner: 'SRE', status: 'Analyzing', systems: ['Power'] }, now).map((row) => row.id)).toEqual([1])
    expect(applyFARFilters(rows, { ...filters, mode: 'causes', systems: ['Sensors'] }, now)).toEqual([])
  })

  test('classifies risk thresholds at exact boundaries', () => {
    expect(farRiskBand(99)).toBe('Low')
    expect(farRiskBand(100)).toBe('Moderate')
    expect(farRiskBand(199)).toBe('Moderate')
    expect(farRiskBand(200)).toBe('High')
    expect(farRiskBand(299)).toBe('High')
    expect(farRiskBand(300)).toBe('Critical')
  })

  test('sanitizes durable saved-view state and discards unsupported grid fields', () => {
    const sanitized = sanitizeFARSavedViewDefinition({
      filters: { preset: 'high-risk', mode: 'causes', systems: ['Power', 'Power', 7] },
      fontSize: 100,
      rowDensity: -2,
      hiddenColumns: ['owner', 'owner', 4],
      columnLayoutState: [
        { colId: 'title', width: 450, sort: 'asc', malicious: 'discard' },
        { colId: '', width: 200 },
      ],
      arbitrary: 'discard',
    })
    expect(sanitized.filters.systems).toEqual(['Power'])
    expect(sanitized.fontSize).toBe(14)
    expect(sanitized.rowDensity).toBe(4)
    expect(sanitized.hiddenColumns).toEqual(['owner'])
    expect(sanitized.columnLayoutState).toEqual([{ colId: 'title', width: 450, sort: 'asc' }])
  })

  test('reads legacy links but writes only canonical FAR links while preserving unrelated query state', () => {
    expect(readFARRecordId('?view=12&far=44')).toBe(44)
    expect(readFARRecordId('?view=12&id=9')).toBe(9)
    expect(readFARRecordId('?view=12&record=10')).toBe(10)
    expect(updateFARRecordSearch('?view=12&id=9', 44)).toBe('?view=12&far=44')
    expect(updateFARRecordSearch('?view=12&far=44', null)).toBe('?view=12')
  })
})
