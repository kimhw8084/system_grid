import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('OperationalDataGrid source contract', () => {
  it('keeps explicit query-error state without reviving legacy overlay props', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/components/shared/OperationalDataGrid.tsx'), 'utf8')

    expect(source).not.toMatch(/\bemptyOverlay\b/)
    expect(source).not.toMatch(/\bshowEmptyOverlay\b/)
    expect(source).toMatch(/\bdataState\?: OperationalDataState\b/)
    expect(source).toMatch(/\bWorkspaceEmptyState\b/)
    expect(source).toMatch(/dataState\?\.kind === 'query-error'/)
  })
})
