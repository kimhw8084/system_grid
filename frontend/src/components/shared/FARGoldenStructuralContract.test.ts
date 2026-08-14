import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { OPERATIONAL_GRID_WIDTHS } from './OperationalGridContract'

const componentsRoot = path.resolve(process.cwd(), 'src/components')
const read = (fileName: string) => fs.readFileSync(path.join(componentsRoot, fileName), 'utf8')

describe('FAR Monitoring-golden structural contract', () => {
  it('uses the shared golden select, ID, and row-action builders', () => {
    const far = read('FAR.tsx')
    const standard = read('shared/OperationalGridStandard.tsx')

    expect(far).toContain('...createOperationalUtilityColumns({')
    expect(far).toContain('includeRecentChange: false')
    expect(far).toContain('includeFavorite: false')
    expect(far).toContain('includeWatch: false')
    expect(far).toContain('createOperationalActionColumnDefinition({')
    expect(far).toContain('width: OPERATIONAL_GRID_WIDTHS.standardAction')
    expect(far).toContain('renderOperationalActionButtons([')

    expect(far).not.toContain('width: 50,\n      checkboxSelection: true')
    expect(far).not.toContain('headerName: "Action",\n      width: 100')

    expect(standard).toContain("colId: 'select'")
    expect(standard).toContain("colId: 'id'")
    expect(standard).toContain("colId: 'row_actions'")
    expect(standard).toContain("pinned: 'left'")
    expect(standard).toContain('operationalLockWidth: true')

    expect(OPERATIONAL_GRID_WIDTHS.utilityCheckbox).toBe(64)
    expect(OPERATIONAL_GRID_WIDTHS.id).toBe(90)
    expect(OPERATIONAL_GRID_WIDTHS.standardAction).toBe(208)
  })

  it('keeps FAR header-safe defaults while leaving analytical columns operator-resizable', () => {
    const far = read('FAR.tsx')
    const state = read('FAR.workspaceState.ts')
    const block = (field: string) => far.split(`field: "${field}"`)[1]?.split('    },')[0] || ''

    for (const field of ['system_name', 'failure_type', 'title', 'severity', 'occurrence', 'detection', 'rpn', 'status', 'linked_rcas', 'created_by_user_id']) {
      expect(block(field)).toContain('suppressAutoSize: true')
      expect(block(field)).not.toContain('maxWidth:')
    }
    expect(block('system_name')).toContain('minWidth: 120')
    expect(block('failure_type')).toContain('minWidth: 96')
    expect(block('title')).toContain('width: 260')
    expect(block('title')).toContain('minWidth: 200')
    expect(block('title')).toContain('tooltipField: "title"')
    expect(block('status')).toContain('minWidth: 152')
    expect(block('status')).toContain('operational-grid-badge')
    expect(block('status')).toContain('operational-grid-badge-text')
    expect(far).toContain('colId: "vectors"')
    expect(far).toContain('headerName: "Vectors",\n      width: 160,\n      minWidth: 140,\n      suppressAutoSize: true,')
    expect(state).toContain("'vectors'")
    expect(block('created_by_user_id')).toContain('className="operational-grid-text"')
  })

  it('recovers before FAR loses the golden analytical center viewport', () => {
    const controls = read('FARGoldenWorkspaceControls.tsx')

    expect(controls).toContain('const FAR_MIN_DESKTOP_CENTER_VIEWPORT_WIDTH = 600')
    expect(controls).toContain('centerViewportWidth < FAR_MIN_DESKTOP_CENTER_VIEWPORT_WIDTH')
    expect(controls).toContain('requestedPinnedWidth > Math.max(0, window.innerWidth - FAR_MIN_DESKTOP_CENTER_VIEWPORT_WIDTH)')
    expect(controls).toContain("api.ensureColumnVisible?.('title', 'middle')")
  })

  it('keeps FAR analytical semantics intact while adopting the shared frame', () => {
    const far = read('FAR.tsx')

    for (const token of ['severity', 'occurrence', 'detection', 'rpn', 'Failure Mode', 'Vectors', 'Incidents']) {
      expect(far).toContain(token)
    }
    expect(far).toContain('setShowRpnHelp(true)')
    expect(far).toContain('setShowMaturityHelp(true)')
  })
})
