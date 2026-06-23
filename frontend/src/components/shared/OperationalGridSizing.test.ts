import { describe, expect, it } from 'vitest'

import { lockOperationalColumnWidth } from './OperationalGridSizing'

describe('lockOperationalColumnWidth', () => {
  it('ignores stale saved layout widths for locked operational columns', () => {
    const column = lockOperationalColumnWidth(
      {
        colId: 'select',
        operationalLockWidth: true,
        width: 48,
      },
      {
        width: 160,
      },
    )

    expect(column.width).toBe(48)
    expect(column.initialWidth).toBe(48)
    expect(column.minWidth).toBe(48)
    expect(column.maxWidth).toBe(48)
  })
})
