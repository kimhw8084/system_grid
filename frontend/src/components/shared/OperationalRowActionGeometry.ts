import { OperationalRowActionSectionModel } from './OperationalRowActionMenu'

const CHAR_WIDTH = 8
const ICON_WIDTH = 14
const SECTION_GAP = 8
const SECTION_HORIZONTAL_PADDING = 12
const DEFAULT_BUTTON_MIN_WIDTH = 112

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
  
  // 1. Calculate natural widths
  const sectionMetrics = sections.map(section => {
    const buttonWidths = section.items.map(item => 
      estimateRowActionButtonWidth(item.label, item.confirmLabel, item.confirming)
    )
    
    const naturalRowWidth = buttonWidths.reduce((sum, w) => sum + w + gap, -gap)
    
    return {
      id: section.id,
      buttonWidths,
      naturalRowWidth
    }
  })

  const actionSetWidth = Math.max(...sectionMetrics.map(m => m.naturalRowWidth))

  // 2. Panel size
  const panelWidth = Math.min(actionSetWidth + panelPadding * 2, viewportWidth - edge * 2)
  const panelHeight = 400 // Placeholder, will be refined in rendering

  // 3. Vertical placement
  const belowSpace = viewportHeight - edge - (cursorY + POINT_MENU_CURSOR_GAP)
  const aboveSpace = cursorY - POINT_MENU_CURSOR_GAP - edge
  
  const placement = belowSpace >= panelHeight || belowSpace >= aboveSpace ? 'below' : 'above'
  
  const top = placement === 'below' 
    ? cursorY + POINT_MENU_CURSOR_GAP 
    : undefined
  const bottom = placement === 'above'
    ? viewportHeight - cursorY + POINT_MENU_CURSOR_GAP
    : undefined

  return {
    panelWidth,
    placement,
    style: {
      left: Math.max(edge, Math.min(cursorX, viewportWidth - panelWidth - edge)),
      top,
      bottom,
      width: panelWidth,
      maxHeight: placement === 'below' ? belowSpace : aboveSpace
    },
    sections: sectionMetrics,
    actionSetWidth
  }
}
