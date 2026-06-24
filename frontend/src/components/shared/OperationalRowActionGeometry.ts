import { OperationalRowActionSectionModel, OperationalRowActionItem } from "./OperationalRowActionMenu";

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
  const viewportSafeWidth = Math.max(0, viewportWidth - edge * 2);
  const contentSafeWidth = Math.max(0, viewportSafeWidth - panelPadding * 2);

  // 1. Initial Calculation (with wrapping)
  let processedSections = sections.map((section) => {
    const rawButtonWidths = section.items.map((item) =>
      estimateRowActionButtonWidth(item.label, item.confirmLabel, item.confirming)
    );
    
    // Attempt wrapping based on contentSafeWidth
    const rows: { items: OperationalRowActionItem[], buttonWidths: number[], rowWidth: number, allowWrap: boolean }[] = [];
    let currentRowItems: OperationalRowActionItem[] = [];
    let currentRowButtonWidths: number[] = [];
    let currentRowWidth = 0;
    
    section.items.forEach((item, idx) => {
        const w = rawButtonWidths[idx];
        const isConstrained = w >= contentSafeWidth;

        if (currentRowItems.length > 0 && (currentRowWidth + gap + w > contentSafeWidth || isConstrained)) {
            rows.push({ items: currentRowItems, buttonWidths: currentRowButtonWidths, rowWidth: currentRowWidth, allowWrap: false });
            currentRowItems = [];
            currentRowButtonWidths = [];
            currentRowWidth = 0;
        }

        if (currentRowItems.length > 0) currentRowWidth += gap;
        currentRowItems.push(item);
        currentRowButtonWidths.push(w);
        currentRowWidth += w;

        // If this item is constrained, close row immediately
        if (isConstrained) {
            rows.push({ items: currentRowItems, buttonWidths: currentRowButtonWidths, rowWidth: currentRowWidth, allowWrap: true });
            currentRowItems = [];
            currentRowButtonWidths = [];
            currentRowWidth = 0;
        }
    });
    if (currentRowItems.length > 0) rows.push({ items: currentRowItems, buttonWidths: currentRowButtonWidths, rowWidth: currentRowWidth, allowWrap: false });

    return {
      id: section.id,
      showTitle: section.id !== "archive",
      items: section.items,
      rows,
    };
  });

  // Calculate actionSetWidth - must be <= contentSafeWidth
  let actionSetWidth = Math.max(...processedSections.flatMap(s => s.rows.map(r => r.rowWidth)), 200);
  actionSetWidth = Math.min(actionSetWidth, contentSafeWidth);
  
  // 2. Normalize all rows to actionSetWidth
  processedSections = processedSections.map(section => {
    return {
        ...section,
        rows: section.rows.map(row => {
            const extra = actionSetWidth - row.rowWidth;
            const extraPerButton = row.buttonWidths.length > 0 ? extra / row.buttonWidths.length : 0;
            const newButtonWidths = row.buttonWidths.map(w => w + extraPerButton);
            return {
                items: row.items,
                buttonWidths: newButtonWidths,
                rowWidth: actionSetWidth,
                allowWrap: row.allowWrap
            };
        })
    };
  });

  const panelWidth = Math.min(actionSetWidth + panelPadding * 2, viewportSafeWidth);

  // 3. Panel height calculation
  let panelHeight = HEADER_HEIGHT + BODY_PADDING * 2;
  processedSections.forEach((section, idx) => {
      if (section.showTitle) panelHeight += SECTION_TITLE_HEIGHT;
      panelHeight += section.rows.length * BUTTON_HEIGHT + (section.rows.length - 1) * gap;
      if (idx < processedSections.length - 1) panelHeight += SECTION_GAP + DIVIDER_HEIGHT;
  });

  // 4. Vertical placement logic
  const belowSpace = viewportHeight - edge - (cursorY + POINT_MENU_CURSOR_GAP);
  const aboveSpace = cursorY - POINT_MENU_CURSOR_GAP - edge;
  
  let placement: "below" | "above" = "below";
  let top: number | undefined;
  let bottom: number | undefined;
  let maxHeight: number;

  if (panelHeight <= belowSpace) {
      placement = "below";
      top = cursorY + POINT_MENU_CURSOR_GAP;
      maxHeight = panelHeight;
  } else if (panelHeight <= aboveSpace) {
      placement = "above";
      bottom = viewportHeight - cursorY + POINT_MENU_CURSOR_GAP;
      maxHeight = panelHeight;
  } else if (belowSpace >= aboveSpace) {
      placement = "below";
      top = cursorY + POINT_MENU_CURSOR_GAP;
      maxHeight = Math.max(0, belowSpace);
  } else {
      placement = "above";
      bottom = viewportHeight - cursorY + POINT_MENU_CURSOR_GAP;
      maxHeight = Math.max(0, aboveSpace);
  }

  return {
    panelWidth,
    panelHeight,
    placement,
    style: {
      left: Math.max(edge, Math.min(cursorX, viewportWidth - panelWidth - edge)),
      top,
      bottom,
      width: panelWidth,
      maxHeight,
    },
    sections: processedSections,
    actionSetWidth,
  };
}
