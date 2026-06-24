import { computeRowActionGeometry } from '../src/components/shared/OperationalRowActionGeometry'
import { expect, test } from 'vitest'

test('computeRowActionGeometry layout', () => {
  const sections = [
    { id: 'quickAccess' as const, items: [{ id: '1', label: 'Details', icon: () => null, onClick: () => {} }] },
  ]
  const viewportWidth = 800
  const viewportHeight = 800
  const cursorX = 100
  const cursorY = 100

  const geometry = computeRowActionGeometry({
    sections,
    viewportWidth,
    viewportHeight,
    cursorX,
    cursorY,
  })

  expect(geometry.panelWidth).toBeGreaterThan(0)
  expect(geometry.placement).toBe('below')
  expect(geometry.style.top).toBe(cursorY + 8) // POINT_MENU_CURSOR_GAP = 8
})
