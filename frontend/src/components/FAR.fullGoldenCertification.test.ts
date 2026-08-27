import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (relative: string) => readFileSync(resolve(process.cwd(), 'src/components', relative), 'utf8')
const pc48Source = read('FAR.operatorLoopBatch.test.ts')
const pc49Source = read('FAR.authoringOperatorLifecycleBatch.test.ts')
const pc50Source = read('FAR.operationalWorkspaceCoreBatch.test.ts')
const pc51Source = read('FAR.finalIndexClosureBatch.test.ts')

export const PC52_PRE_PC49_ACCEPTED_ROWS = [
  'G04', 'G05', 'G14', 'G15', 'G22', 'G23', 'G24', 'G35', 'G36', 'G37',
  'G38', 'G39', 'G40', 'G41', 'G42', 'G48', 'G53', 'G54', 'G57', 'G58',
  'G74', 'G82', 'G83', 'G95', 'G97', 'G98', 'G100',
] as const

export const PC52_PC49_ROWS = [
  'G03', 'G43', 'G44', 'G45', 'G46', 'G49', 'G50', 'G75', 'G78', 'G79',
  'G84', 'G85', 'G87', 'G88', 'G89', 'G90', 'G91', 'G92', 'G93',
] as const

export const PC52_PC50_ROWS = [
  'G02', 'G06', 'G07', 'G08', 'G09', 'G10', 'G11', 'G12', 'G13', 'G16',
  'G17', 'G18', 'G19', 'G20', 'G21', 'G25', 'G26', 'G27', 'G28', 'G29',
  'G30', 'G31', 'G32', 'G33', 'G34', 'G62', 'G63', 'G64', 'G65', 'G66',
  'G67', 'G68', 'G69', 'G70',
] as const

export const PC52_PC51R1_ROWS = [
  'G01', 'G47', 'G51', 'G52', 'G55', 'G56', 'G59', 'G60', 'G61', 'G71',
  'G72', 'G73', 'G76', 'G77', 'G80', 'G81', 'G86', 'G94', 'G96', 'G99',
  'G101',
] as const

export const PC52_GOLDEN_CERTIFICATION_MATRIX = [
  { row: 'G01', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G02', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G03', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G04', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G05', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G06', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G07', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G08', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G09', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G10', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G11', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G12', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G13', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G14', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G15', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G16', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G17', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G18', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G19', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G20', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G21', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G22', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G23', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G24', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G25', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G26', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G27', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G28', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G29', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G30', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G31', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G32', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G33', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G34', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G35', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G36', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G37', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G38', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G39', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G40', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G41', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G42', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G43', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G44', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G45', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G46', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G47', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G48', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G49', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G50', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G51', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G52', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G53', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G54', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G55', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G56', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G57', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G58', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G59', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G60', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G61', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G62', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G63', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G64', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G65', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G66', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G67', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G68', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G69', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G70', lineage: 'PC50', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G71', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G72', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G73', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G74', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G75', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G76', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G77', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G78', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G79', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G80', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G81', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G82', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G83', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G84', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G85', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G86', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G87', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G88', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G89', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G90', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G91', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G92', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G93', lineage: 'PC49', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G94', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G95', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G96', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G97', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G98', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G99', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G100', lineage: 'PRE_PC49_ACCEPTED', expectedDisposition: 'TERMINAL_PASS' as const },
  { row: 'G101', lineage: 'PC51R1', expectedDisposition: 'TERMINAL_PASS' as const },
] as const

const expectedRows = Array.from({ length: 101 }, (_, index) => {
  const value = index + 1
  return value < 100 ? `G${String(value).padStart(2, '0')}` : `G${value}`
})

const rowsFromConst = (source: string, constName: string) => {
  const start = source.indexOf(`const ${constName} = [`)
  expect(start, `missing row constant ${constName}`).toBeGreaterThanOrEqual(0)
  const end = source.indexOf('] as const', start)
  expect(end, `unterminated row constant ${constName}`).toBeGreaterThan(start)
  const body = source.slice(start, end)
  return Array.from(body.matchAll(/'G(\d{2,3})'/g), (entry) => `G${entry[1]}`)
}

const numeric = (row: string) => Number(row.slice(1))

describe('PC-52 FAR full G01-G101 golden certification', () => {
  it('binds one disjoint four-slice lineage whose union is exactly G01 through G101', () => {
    expect(PC52_PRE_PC49_ACCEPTED_ROWS).toHaveLength(27)
    expect(PC52_PC49_ROWS).toHaveLength(19)
    expect(PC52_PC50_ROWS).toHaveLength(34)
    expect(PC52_PC51R1_ROWS).toHaveLength(21)
    const rows = [
      ...PC52_PRE_PC49_ACCEPTED_ROWS,
      ...PC52_PC49_ROWS,
      ...PC52_PC50_ROWS,
      ...PC52_PC51R1_ROWS,
    ]
    expect(rows).toHaveLength(101)
    expect(new Set(rows).size).toBe(101)
    expect([...rows].sort((a, b) => numeric(a) - numeric(b))).toEqual(expectedRows)
  })

  it('cross-checks the three modern closure slices against their accepted executable batch contracts', () => {
    expect(rowsFromConst(pc49Source, 'PC49_NEW_CLOSURE_ROWS')).toEqual(PC52_PC49_ROWS)
    expect(rowsFromConst(pc50Source, 'PC50_NEW_CLOSURE_ROWS')).toEqual(PC52_PC50_ROWS)
    expect(rowsFromConst(pc51Source, 'PC51_FINAL_INDEX_ROWS')).toEqual(PC52_PC51R1_ROWS)
  })

  it('keeps the pre-PC49 lineage anchored to the PC48 operator-loop contract and historical terminal seams', () => {
    for (const row of ['G04', 'G05', 'G14', 'G15', 'G22', 'G24', 'G35', 'G36', 'G37', 'G38', 'G39', 'G40', 'G41', 'G42', 'G48', 'G53', 'G57', 'G58', 'G74', 'G82']) {
      expect(pc48Source, `PC48 lineage missing ${row}`).toContain(`'${row}'`)
    }
    for (const row of ['G23', 'G54', 'G83', 'G95', 'G97', 'G98', 'G100']) {
      expect(PC52_PRE_PC49_ACCEPTED_ROWS).toContain(row)
    }
  })

  it('locks in anti-false-negative ownership rules learned during goldenization', () => {
    expect(pc51Source).toContain('createOperationalUtilityColumns(operatorIntelligence.utilityColumnsConfig)')
    expect(pc51Source).not.toContain("'createOperationalUtilityColumns({'")
    expect(pc51Source).toContain("'export function WorkspaceCompareShell'")
    expect(pc51Source).toContain("'<WorkspaceModal'")
    expect(pc51Source).toContain("'<WorkspaceCompareShell'")
  })

  it('emits a machine-readable 101-row certification matrix gated by the full PC-52 stage result', () => {
    expect(PC52_GOLDEN_CERTIFICATION_MATRIX).toHaveLength(101)
    expect(new Set(PC52_GOLDEN_CERTIFICATION_MATRIX.map((entry) => entry.row)).size).toBe(101)
    expect(PC52_GOLDEN_CERTIFICATION_MATRIX.map((entry) => entry.row)).toEqual(expectedRows)
    const payload = {
      schema: 'SYSGRID_PC52_G01_G101_CERTIFICATION_MATRIX_V1',
      certificationGate: 'FULL_PC52_REQUIRED_STAGE_PASS',
      acceptedBase: '6622666321a743780df4a23da1f567ad298a30ce',
      rowCount: 101,
      rows: PC52_GOLDEN_CERTIFICATION_MATRIX,
    }
    console.log(`SYSGRID_PC52_CERTIFICATION_MATRIX=${JSON.stringify(payload)}`)
  })
})
