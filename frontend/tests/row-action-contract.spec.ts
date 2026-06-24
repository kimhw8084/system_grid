import { computeFloatingPanelRect } from '../src/components/shared/OperationalGridInteractions'
import { computeRowActionSectionColumns } from '../src/components/shared/OperationalRowActionMenu'
import { expect, test } from 'vitest'

test('computeFloatingPanelRect positioning', () => {
  const edge = 16
  const viewportWidth = 200
  const viewportHeight = 200
  const preferredWidth = 560
  const preferredHeight = 520

  const rect = computeFloatingPanelRect({
    x: 50,
    y: 50,
    preferredWidth,
    preferredHeight,
    viewportWidth,
    viewportHeight,
    edge,
  })

  expect(rect.width).toBeLessThanOrEqual(viewportWidth - edge * 2)
  expect(rect.width).toBe(168)
  expect(rect.left).toBeGreaterThanOrEqual(edge)
  expect(rect.left + rect.width).toBeLessThanOrEqual(viewportWidth - edge)

  // Right-edge click
  const rightEdgeRect = computeFloatingPanelRect({
    x: 190,
    y: 50,
    preferredWidth,
    preferredHeight,
    viewportWidth,
    viewportHeight,
    edge,
  })
  expect(rightEdgeRect.left + rightEdgeRect.width).toBeLessThanOrEqual(viewportWidth - edge)

  // Bottom-row click
  const bottomEdgeRect = computeFloatingPanelRect({
    x: 50,
    y: 190,
    preferredWidth,
    preferredHeight,
    viewportWidth,
    viewportHeight,
    edge,
  })
  expect(bottomEdgeRect.top + bottomEdgeRect.maxHeight).toBeLessThanOrEqual(viewportHeight - edge)

  // Wide viewport
  const wideRect = computeFloatingPanelRect({
    x: 50,
    y: 50,
    preferredWidth,
    preferredHeight,
    viewportWidth: 1000,
    viewportHeight: 1000,
    edge,
  })
  expect(wideRect.width).toBe(preferredWidth)
})

test('computeRowActionSectionColumns column count', () => {
  const gap = 8
  const padding = 10
  const minColumnWidth = 100
  const preferredColumns = 5

  // Wide container: 5 columns
  const wideCols = computeRowActionSectionColumns({
    containerWidth: 1000,
    preferredColumns,
    minColumnWidth,
    gap,
    horizontalPadding: padding,
  })
  expect(wideCols).toBe(5)

  // Medium container: reduces columns
  const mediumCols = computeRowActionSectionColumns({
    containerWidth: 360,
    preferredColumns,
    minColumnWidth,
    gap,
    horizontalPadding: padding,
  })
  expect(mediumCols).toBeLessThan(5)

  // Narrow container: 1 column
  const narrowCols = computeRowActionSectionColumns({
    containerWidth: 100,
    preferredColumns,
    minColumnWidth,
    gap,
    horizontalPadding: padding,
  })
  expect(narrowCols).toBe(1)
})
