import { OperationalRowActionSectionModel } from "./OperationalRowActionMenu";

const CHAR_WIDTH = 8;
const ICON_WIDTH = 14;
const SECTION_GAP = 8;
const SECTION_HORIZONTAL_PADDING = 12;

const HEADER_HEIGHT = 70;
const SECTION_TITLE_HEIGHT = 20;
const BUTTON_HEIGHT = 36;
const BODY_PADDING = 12;
const DIVIDER_HEIGHT = 1;

export function estimateRowActionButtonWidth(label: string, confirmLabel?: string, confirming?: boolean): number {
  const text = confirming ? (confirmLabel || "Confirm?") : label;
  const estimatedLabelWidth = text.length * CHAR_WIDTH;
  return SECTION_HORIZONTAL_PADDING * 2 + ICON_WIDTH + SECTION_GAP + estimatedLabelWidth;
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
  sections: OperationalRowActionSectionModel[];
  viewportWidth: number;
  viewportHeight: number;
  cursorX: number;
  cursorY: number;
  edge?: number;
  gap?: number;
  panelPadding?: number;
}) {
  const POINT_MENU_CURSOR_GAP = 8;
  const maxAvailableWidth = viewportWidth - edge * 2 - panelPadding * 2;

  // 1. Initial Calculation (with wrapping)
  let processedSections = sections.map((section) => {
    const rawButtonWidths = section.items.map((item) =>
      estimateRowActionButtonWidth(item.label, item.confirmLabel, item.confirming)
    );
    
    // Attempt wrapping based on maxAvailableWidth
    const rows: { buttonWidths: number[], rowWidth: number }[] = [];
    let currentRow: number[] = [];
    let currentRowWidth = 0;
    
    rawButtonWidths.forEach((w) => {
        if (currentRow.length > 0 && currentRowWidth + gap + w > maxAvailableWidth) {
            rows.push({ buttonWidths: currentRow, rowWidth: currentRowWidth });
            currentRow = [];
            currentRowWidth = 0;
        }
        if (currentRow.length > 0) currentRowWidth += gap;
        currentRow.push(w);
        currentRowWidth += w;
    });
    if (currentRow.length > 0) rows.push({ buttonWidths: currentRow, rowWidth: currentRowWidth });

    return {
      id: section.id,
      showTitle: section.id !== "archive",
      items: section.items,
      rows,
    };
  });

  // Calculate actionSetWidth
  let actionSetWidth = Math.max(...processedSections.flatMap(s => s.rows.map(r => r.rowWidth)), 200);

  // 2. Normalize all rows to actionSetWidth
  processedSections = processedSections.map(section => {
    return {
        ...section,
        rows: section.rows.map(row => {
            const extra = actionSetWidth - row.rowWidth;
            const extraPerButton = extra / row.buttonWidths.length;
            const newButtonWidths = row.buttonWidths.map(w => w + extraPerButton);
            return {
                buttonWidths: newButtonWidths,
                rowWidth: actionSetWidth
            };
        })
    };
  });

  const panelWidth = actionSetWidth + panelPadding * 2;

  // 3. Panel height calculation
  let panelHeight = HEADER_HEIGHT + BODY_PADDING * 2;
  processedSections.forEach((section, idx) => {
      if (section.showTitle) panelHeight += SECTION_TITLE_HEIGHT;
      panelHeight += section.rows.length * BUTTON_HEIGHT + (section.rows.length - 1) * gap;
      if (idx < processedSections.length - 1) panelHeight += SECTION_GAP + DIVIDER_HEIGHT;
  });

  // 4. Vertical placement
  const belowSpace = viewportHeight - edge - (cursorY + POINT_MENU_CURSOR_GAP);
  const aboveSpace = cursorY - POINT_MENU_CURSOR_GAP - edge;
  const placement = (belowSpace >= panelHeight || belowSpace >= aboveSpace) ? "below" : "above";

  return {
    panelWidth,
    panelHeight,
    placement,
    style: {
      left: Math.max(edge, Math.min(cursorX, viewportWidth - panelWidth - edge)),
      top: placement === "below" ? cursorY + POINT_MENU_CURSOR_GAP : undefined,
      bottom: placement === "above" ? viewportHeight - cursorY + POINT_MENU_CURSOR_GAP : undefined,
      width: panelWidth,
      maxHeight: placement === "below" ? belowSpace : aboveSpace,
    },
    sections: processedSections,
    actionSetWidth,
  };
}
