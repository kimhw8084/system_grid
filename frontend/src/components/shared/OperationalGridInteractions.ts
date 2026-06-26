import React, { useCallback, useEffect, useRef } from "react";
import { useWorkspaceDismissHandlers } from "./OperationalWorkspaceHooks";

export const FLOATING_PANEL_EDGE = 16;
export const POINT_MENU_CURSOR_GAP = 8;

export function computeFloatingPanelRect({
  x,
  y,
  preferredWidth,
  preferredHeight,
  viewportWidth,
  viewportHeight,
}: {
  x: number;
  y: number;
  preferredWidth: number;
  preferredHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}): {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
} {
  const edge = FLOATING_PANEL_EDGE;
  const viewportSafeWidth = Math.max(0, viewportWidth - edge * 2);
  const width = Math.min(preferredWidth, viewportSafeWidth);
  const left = Math.min(Math.max(x, edge), Math.max(edge, viewportWidth - width - edge));

  const belowSpace = viewportHeight - edge - (y + POINT_MENU_CURSOR_GAP);
  const aboveSpace = y - POINT_MENU_CURSOR_GAP - edge;

  if (preferredHeight <= belowSpace) {
    return {
      left,
      width,
      maxHeight: preferredHeight,
      top: y + POINT_MENU_CURSOR_GAP,
    };
  } else if (preferredHeight <= aboveSpace) {
    return {
      left,
      width,
      maxHeight: preferredHeight,
      bottom: viewportHeight - y + POINT_MENU_CURSOR_GAP,
    };
  } else if (belowSpace >= aboveSpace) {
    return {
      left,
      width,
      maxHeight: Math.max(0, belowSpace),
      top: y + POINT_MENU_CURSOR_GAP,
    };
  } else {
    return {
      left,
      width,
      maxHeight: Math.max(0, aboveSpace),
      bottom: viewportHeight - y + POINT_MENU_CURSOR_GAP,
    };
  }
}

export function shouldIgnoreRowSelection(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return Boolean(
    element.closest("button, a, input, textarea, select, label") ||
    element.closest(".ag-selection-checkbox") ||
    element.closest(".ag-checkbox-input-wrapper") ||
    element.closest(".row-action-menu-container")
  );
}

export const getAnchoredFloatingStyle = ({
  rect,
  width,
  height,
  zIndex,
  offset = 4,
}: {
  rect: DOMRect;
  width: number;
  height: number;
  zIndex: number;
  offset?: number;
}) => {
  const vW = window.innerWidth;
  const vH = window.innerHeight;
  
  let left = rect.right - width;
  let top = rect.bottom + offset;

  if (left < FLOATING_PANEL_EDGE) left = rect.left;
  if (top + height > vH - FLOATING_PANEL_EDGE) top = rect.top - height - offset;
  
  left = Math.max(FLOATING_PANEL_EDGE, Math.min(left, vW - width - FLOATING_PANEL_EDGE));
  top = Math.max(FLOATING_PANEL_EDGE, Math.min(top, vH - height - FLOATING_PANEL_EDGE));

  return {
    position: "fixed" as const,
    top: Math.floor(top),
    left: Math.floor(left),
    width,
    maxHeight: `calc(100vh - ${FLOATING_PANEL_EDGE * 2}px)`,
    zIndex,
  };
};

export const getPointFloatingStyle = ({
  x,
  y,
  width,
  height,
  zIndex,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}) => {
  const rect = computeFloatingPanelRect({
    x,
    y,
    preferredWidth: width,
    preferredHeight: height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  });

  const style: React.CSSProperties = {
    position: "fixed",
    left: rect.left,
    width: rect.width,
    maxHeight: rect.maxHeight,
    zIndex,
  };

  if (rect.top !== undefined) {
    style.top = rect.top;
  } else if (rect.bottom !== undefined) {
    style.bottom = rect.bottom;
  }

  return style;
};

export function useOperationalRowInteractions({
  onRowDoubleClick,
  pendingIds = [],
}: {
  onRowDoubleClick?: (data: any) => void;
  pendingIds?: number[];
} = {}) {
  const selectionAnchorRef = useRef<number | null>(null);

  const handleRowClicked = useCallback((event: any) => {
    if (!event?.node || shouldIgnoreRowSelection(event.event?.target)) return;
    if (event.data && pendingIds.includes(Number(event.data.id))) return;
    const mouseEvent = event.event as MouseEvent | undefined;
    const isToggleSelection = Boolean(mouseEvent?.metaKey || mouseEvent?.ctrlKey);
    const isRangeSelection = Boolean(mouseEvent?.shiftKey);

    if (isRangeSelection && selectionAnchorRef.current !== null) {
      const currentIndex = event.node.rowIndex;
      if (currentIndex === null || currentIndex === undefined) return;

      const start = Math.min(selectionAnchorRef.current, currentIndex);
      const end = Math.max(selectionAnchorRef.current, currentIndex);
      event.api.deselectAll();
      event.api.forEachNodeAfterFilterAndSort((node: any) => {
        if (node.rowIndex !== null && node.rowIndex >= start && node.rowIndex <= end) {
          if (!node.data || !pendingIds.includes(Number(node.data.id))) {
            node.setSelected(true);
          }
        }
      });
    } else {
      if (isToggleSelection) {
        event.node.setSelected(!event.node.isSelected());
      } else {
        event.api.deselectAll();
        event.node.setSelected(true);
      }
      selectionAnchorRef.current = event.node.rowIndex;
    }
  }, [pendingIds]);

  const handleRowDoubleClicked = useCallback((event: any) => {
    if (!event?.data || shouldIgnoreRowSelection(event.event?.target)) return;
    if (pendingIds.includes(Number(event.data.id))) return;
    onRowDoubleClick?.(event.data);
  }, [onRowDoubleClick, pendingIds]);

  return {
    handleRowClicked,
    handleRowDoubleClicked,
    selectionAnchorRef,
  };
}

export function useOperationalContextMenu({
  onOpenRowActionMenu,
}: {
  onOpenRowActionMenu: (item: any, point: { x: number; y: number }) => void;
}) {
  const openRowActionMenuAtPoint = useCallback((item: any, x: number, y: number) => {
    onOpenRowActionMenu(item, { x, y });
  }, [onOpenRowActionMenu]);

  const handleCellContextMenu = useCallback((e: any) => {
    if (!e?.data || shouldIgnoreRowSelection(e.event?.target)) return;
    const mouseEvent = e.event as MouseEvent;
    mouseEvent?.preventDefault?.();
    openRowActionMenuAtPoint(e.data, mouseEvent.clientX, mouseEvent.clientY);
  }, [openRowActionMenuAtPoint]);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".ag-root-wrapper") || target.closest(".row-action-menu-container")) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  return {
    handleCellContextMenu,
    openRowActionMenuAtPoint,
  };
}

export function useOperationalDismissController({
  active,
  onDismiss,
  bulkMenuButtonRef,
  bulkMenuPanelRef,
  displayMenuButtonRef,
  displayMenuPanelRef,
  viewsMenuButtonRef,
  viewsMenuPanelRef,
  showBulkMenu,
  showDisplayMenu,
  showViewsMenu,
  hasRowActionMenu,
}: {
  active: boolean;
  onDismiss: () => void;
  bulkMenuButtonRef: React.RefObject<HTMLElement | null>;
  bulkMenuPanelRef: React.RefObject<HTMLElement | null>;
  displayMenuButtonRef: React.RefObject<HTMLElement | null>;
  displayMenuPanelRef: React.RefObject<HTMLElement | null>;
  viewsMenuButtonRef: React.RefObject<HTMLElement | null>;
  viewsMenuPanelRef: React.RefObject<HTMLElement | null>;
  showBulkMenu: boolean;
  showDisplayMenu: boolean;
  showViewsMenu: boolean;
  hasRowActionMenu: boolean;
}) {
  useWorkspaceDismissHandlers({
    active,
    onDismiss,
    shouldDismiss: (target) => {
      if (target.closest("[data-workspace-panel]")) return false;
      if (showBulkMenu && !bulkMenuButtonRef.current?.contains(target) && !bulkMenuPanelRef.current?.contains(target)) return true;
      if (showDisplayMenu && !displayMenuButtonRef.current?.contains(target) && !displayMenuPanelRef.current?.contains(target)) return true;
      if (showViewsMenu && !viewsMenuButtonRef.current?.contains(target) && !viewsMenuPanelRef.current?.contains(target)) return true;
      if (hasRowActionMenu && !target.closest(".row-action-menu-container")) return true;
      return false;
    },
  });
}
