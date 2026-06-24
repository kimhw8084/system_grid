import { computeFloatingPanelRect } from '../src/components/shared/OperationalGridInteractions'
import { computeRowActionSectionColumns } from '../src/components/shared/OperationalRowActionMenu'
import { expect, test } from 'vitest'

test('computeFloatingPanelRect positioning', () => {
  const viewportWidth = 800
  const viewportHeight = 800
  const preferredWidth = 560
  const preferredHeight = 300

  // 1. Bottom-edge uses bottom anchor
  const cursorY = 760
  const rect = computeFloatingPanelRect({
    x: 50,
    y: cursorY,
    preferredWidth,
    preferredHeight,
    viewportWidth,
    viewportHeight,
  })
  expect(rect.bottom).toBe(viewportHeight - cursorY + 8) // POINT_MENU_CURSOR_GAP is 8
  expect(rect.top).toBeUndefined()
  expect(rect.maxHeight).toBeLessThanOrEqual(cursorY - 8 - 16) // edge is 16

  // 2. Normal top placement
  const normalY = 100
  const rect2 = computeFloatingPanelRect({
    x: 50,
    y: normalY,
    preferredWidth,
    preferredHeight,
    viewportWidth,
    viewportHeight,
  })
  expect(rect2.top).toBe(normalY + 8)
  expect(rect2.bottom).toBeUndefined()

  // 3. Above placement does not subtract preferredHeight
  // (already implicitly covered by bottom-edge test, but can add)
  
  // 4. Right-edge x clamping
  const rightEdgeRect = computeFloatingPanelRect({
    x: 750,
    y: 50,
    preferredWidth,
    preferredHeight,
    viewportWidth,
    viewportHeight,
  })
  expect(rightEdgeRect.left + rightEdgeRect.width).toBeLessThanOrEqual(viewportWidth - 16)
})

test('computeRowActionSectionColumns column count', () => {
  const gap = 8
  const padding = 10
  const minColumnWidth = 100
  const preferredColumns = 5

  const wideCols = computeRowActionSectionColumns({
    containerWidth: 1000,
    preferredColumns,
    minColumnWidth,
    gap,
    horizontalPadding: padding,
  })
  expect(wideCols).toBe(5)

  const narrowCols = computeRowActionSectionColumns({
    containerWidth: 100,
    preferredColumns,
    minColumnWidth,
    gap,
    horizontalPadding: padding,
  })
  expect(narrowCols).toBe(1)
})
