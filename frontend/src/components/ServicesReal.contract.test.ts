import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('ServicesReal source contract', () => {
  it('stays on OperationalDataGrid and shared column factories', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/components/ServicesReal.tsx'), 'utf8')

    expect(source).not.toMatch(/\bOperationalGridSurface\b/)
    expect(source).not.toMatch(/\bOperationalGridMatrix\b/)
    expect(source).not.toMatch(/\bcellClass\s*:/)
    expect(source).not.toMatch(/\bheaderClass\s*:/)
  })
})
