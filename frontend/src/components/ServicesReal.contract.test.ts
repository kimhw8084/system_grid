import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('ServicesReal source contract', () => {
  it('stays on OperationalDataGrid, shared columns, and shared detail routing', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/components/ServicesReal.tsx'), 'utf8')
    const rowActionMenuStart = source.indexOf('panelKey="row-action-menu"')
    const rowActionMenuEnd = rowActionMenuStart >= 0
      ? source.indexOf("{groupBy === 'raw' ? (", rowActionMenuStart)
      : -1
    const rowActionMenuSource = rowActionMenuStart >= 0
      ? source.slice(
        rowActionMenuStart,
        rowActionMenuEnd > rowActionMenuStart ? rowActionMenuEnd : rowActionMenuStart + 9000,
      )
      : source
    const bulkEditSaveButtonStart = source.indexOf('Save Bulk Edit')
    const bulkEditSaveButtonSource = bulkEditSaveButtonStart >= 0
      ? source.slice(Math.max(0, bulkEditSaveButtonStart - 250), bulkEditSaveButtonStart + 100)
      : source

    expect(source).not.toMatch(/\bOperationalGridSurface\b/)
    expect(source).not.toMatch(/\bOperationalGridMatrix\b/)
    expect(source).not.toMatch(/\bcellClass\s*:/)
    expect(source).not.toMatch(/\bheaderClass\s*:/)
    expect(source).toMatch(/\buseOperationalDetailRoute\b/)
    expect(source).not.toMatch(/\bopenNetworkDetail\b/)
    expect(source).not.toMatch(/\bcloseNetworkDetail\b/)
    expect(source).not.toMatch(/\buseSearchParams\b/)
    expect(source).not.toMatch(/requestAnimationFrame[\s\S]{0,200}detailRoute\.openDetail/)
    expect(rowActionMenuSource).toMatch(/\btoggleFavorite\b/)
    expect(rowActionMenuSource).toMatch(/\btoggleWatch\b/)
    expect(rowActionMenuSource).toMatch(/\bArchive\b/)
    expect(rowActionMenuSource).not.toMatch(/\bDe-activate\b/)
    expect(rowActionMenuSource).not.toMatch(/\bDeactivate\b/)
    expect(rowActionMenuSource).not.toMatch(/\bDelete\b/)
    expect(bulkEditSaveButtonSource).not.toMatch(/\bmr-2\b/)
  })
})
