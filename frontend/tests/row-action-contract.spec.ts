import { computeFloatingPanelRect } from '../src/components/shared/OperationalGridInteractions'
import { computeRowActionSectionColumns } from '../src/components/shared/OperationalRowActionMenu'
import { expect, test } from 'vitest'

test('computeFloatingPanelRect positioning', () => {
  const edge = 16
  const viewportWidth = 800
  const viewportHeight = 800
  const preferredWidth = 560
  const preferredHeight = 300

  // 1. Bottom-edge flip
  const cursorY = 760
  const rect = computeFloatingPanelRect({
    x: 50,
    y: cursorY,
    preferredWidth,
    preferredHeight,
    viewportWidth,
    viewportHeight,
    edge,
  })
  expect(rect.top + rect.maxHeight).toBeLessThanOrEqual(cursorY - 8)

  // 2. Normal below placement
  const normalY = 100
  const rect2 = computeFloatingPanelRect({
    x: 50,
    y: normalY,
    preferredWidth,
    preferredHeight,
    viewportWidth,
    viewportHeight,
    edge,
  })
  expect(rect2.top).toBe(normalY + 8)

  // 3. Small viewport flips
  const smallRect = computeFloatingPanelRect({
    x: 50,
    y: 50,
    preferredWidth,
    preferredHeight: 800,
    viewportWidth,
    viewportHeight: 200,
    edge,
  })
  expect(smallRect.maxHeight).toBeLessThan(800)
  
  // 4. Right-edge x clamping
  const rightEdgeRect = computeFloatingPanelRect({
    x: 750,
    y: 50,
    preferredWidth,
    preferredHeight,
    viewportWidth,
    viewportHeight,
    edge,
  })
  expect(rightEdgeRect.left + rightEdgeRect.width).toBeLessThanOrEqual(viewportWidth - edge)
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
