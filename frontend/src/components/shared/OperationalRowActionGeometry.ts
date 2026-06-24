import { OperationalRowActionSectionModel } from './OperationalRowActionMenu'

const CHAR_WIDTH = 8
const ICON_WIDTH = 14
const SECTION_GAP = 8
const SECTION_HORIZONTAL_PADDING = 12
const DEFAULT_BUTTON_MIN_WIDTH = 112

const HEADER_HEIGHT = 70
const SECTION_TITLE_HEIGHT = 20
const BUTTON_HEIGHT = 36
const BODY_PADDING = 12
const DIVIDER_HEIGHT = 1

export function estimateRowActionButtonWidth(label: string, confirmLabel?: string, confirming?: boolean): number {
  const text = confirming ? (confirmLabel || 'Confirm?') : label
  const estimatedLabelWidth = text.length * CHAR_WIDTH
  return SECTION_HORIZONTAL_PADDING * 2 + ICON_WIDTH + SECTION_GAP + estimatedLabelWidth
}

export function computeRowActionGeometry({
  sections,
  viewportWidth,
  viewportHeight,
  cursorX,
  cursorY,
  edge = 16,
  gap = SECTION_GAP,
  panelPadding = SECTION_HORIZONTAL_PADDING,
}: {
  sections: OperationalRowActionSectionModel[]
  viewportWidth: number
  viewportHeight: number
  cursorX: number
  cursorY: number
  edge?: number
  gap?: number
  panelPadding?: number
}) {
  const POINT_MENU_CURSOR_GAP = 8
  
  // 1. Calculate natural widths and layout
  const processedSections = sections.map(section => {
    const buttonWidths = section.items.map(item => 
      estimateRowActionButtonWidth(item.label, item.confirmLabel, item.confirming)
    )
    
    // Simple wrapping logic
    const rows: { buttonWidths: number[], rowWidth: number }[] = []
    let currentRow: number[] = []
    let currentRowWidth = 0
    const maxRowWidth = viewportWidth - edge * 2 - panelPadding * 2

    buttonWidths.forEach((w, i) => {
        if (currentRowWidth + w + (currentRow.length > 0 ? gap : 0) > maxRowWidth) {
            rows.push({ buttonWidths: currentRow, rowWidth: currentRowWidth })
            currentRow = [w]
            currentRowWidth = w
        } else {
            currentRow.push(w)
            currentRowWidth += w + (currentRow.length > 1 ? gap : 0)
        }
    })
    if (currentRow.length > 0) {
        rows.push({ buttonWidths: currentRow, rowWidth: currentRowWidth })
    }

    return {
      id: section.id,
      showTitle: section.id !== 'archive',
      items: section.items,
      rows
    }
  })

  const actionSetWidth = Math.max(...processedSections.map(s => Math.max(...s.rows.map(r => r.rowWidth))))

  // 2. Panel size
  const panelWidth = Math.min(actionSetWidth + panelPadding * 2, viewportWidth - edge * 2)
  
  // 3. Panel height calculation
  let totalHeight = HEADER_HEIGHT + BODY_PADDING * 2
  processedSections.forEach((section, idx) => {
    if (section.showTitle) {
        totalHeight += SECTION_TITLE_HEIGHT
    }
    totalHeight += section.rows.length * BUTTON_HEIGHT + (section.rows.length - 1) * gap
    if (idx < processedSections.length - 1) {
        totalHeight += SECTION_GAP + DIVIDER_HEIGHT
    }
  })
  const panelHeight = totalHeight

  // 4. Vertical placement
  const belowSpace = viewportHeight - edge - (cursorY + POINT_MENU_CURSOR_GAP)
  const aboveSpace = cursorY - POINT_MENU_CURSOR_GAP - edge
  
  const placement = (belowSpace >= panelHeight || belowSpace >= aboveSpace) ? 'below' : 'above'
  
  const top = placement === 'below' 
    ? cursorY + POINT_MENU_CURSOR_GAP 
    : undefined
  const bottom = placement === 'above'
    ? viewportHeight - cursorY + POINT_MENU_CURSOR_GAP
    : undefined

  return {
    panelWidth,
    panelHeight,
    placement,
    style: {
      left: Math.max(edge, Math.min(cursorX, viewportWidth - panelWidth - edge)),
      top,
      bottom,
      width: panelWidth,
      maxHeight: placement === 'below' ? belowSpace : aboveSpace
    },
    sections: processedSections,
    actionSetWidth
  }
}
