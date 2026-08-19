import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  applyFarBulkScoreResultVersions,
  buildFarBulkScorePreview,
  buildFarBulkScoreRequest,
  buildFarBulkScoreRevertPayload,
} from './FAR.bulkScore'

const rows = [
  { id: 11, version: 3, is_deleted: false, severity: 4, occurrence: 5, detection: 6 },
  { id: 12, version: 7, is_deleted: false, severity: 4, occurrence: 3, detection: 2 },
]

describe('FAR contextual bulk score contract', () => {
  it('builds an exact optimistic-version request', () => {
    expect(buildFarBulkScoreRequest([11, 12], rows, { severity: 8 })).toEqual({
      ids: [11, 12],
      field: 'severity',
      value: 8,
      expected_versions: { '11': 3, '12': 7 },
    })
  })

  it('classifies changed, unchanged, archived, and missing rows before execution', () => {
    expect(buildFarBulkScorePreview(
      [11, 12, 13, 14],
      [
        ...rows,
        { id: 13, version: 2, is_deleted: true, severity: 1, occurrence: 1, detection: 1 },
      ],
      { severity: 4 },
    )).toMatchObject({
      changed_ids: [],
      unchanged_ids: [11, 12],
      blocked_count: 1,
      missing_ids: [14],
      can_execute: false,
    })
  })

  it('propagates result versions for the exact changed records', () => {
    expect(applyFarBulkScoreResultVersions(rows, { '11': 4, '12': 8 }).map((row) => row.version))
      .toEqual([4, 8])
  })

  it('creates a homogeneous optimistic revert and rejects mixed previous values', () => {
    expect(buildFarBulkScoreRevertPayload(rows, { severity: 8 }, { '11': 4, '12': 8 })).toEqual({
      severity: 4,
      _expected_versions: { '11': 4, '12': 8 },
    })

    expect(buildFarBulkScoreRevertPayload(
      [{ ...rows[0], severity: 4 }, { ...rows[1], severity: 5 }],
      { severity: 8 },
      { '11': 4, '12': 8 },
    )).toBeNull()
  })

  it('wires the selected flyout and bulk-score endpoint into the FAR workspace', () => {
    const farSource = readFileSync('src/components/FAR.tsx', 'utf8')
    const controlsSource = readFileSync('src/components/FARGoldenWorkspaceControls.tsx', 'utf8')

    expect(farSource).toContain("apiFetch('/api/v1/far/modes/bulk-score'")
    expect(farSource).toContain("onBulkScoreSelected: (field: FarBulkScoreField, value: number)")
    expect(controlsSource).toContain("['severity', 'Severity']")
    expect(controlsSource).toContain("['occurrence', 'Occurrence']")
    expect(controlsSource).toContain("['detection', 'Detection']")
    expect(controlsSource).toContain('onBulkScoreSelected(field, value)')
  })
})
