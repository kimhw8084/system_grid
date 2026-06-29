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

function toLogicalRowId(value: any): number | null {
  const id = Number(value?.data?.id ?? value?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function forEachGridNode(api: any, callback: (node: any) => void) {
  if (typeof api?.forEachNodeAfterFilterAndSort === "function") {
    api.forEachNodeAfterFilterAndSort(callback);
    return true;
  }
  if (typeof api?.forEachNode === "function") {
    api.forEachNode(callback);
    return true;
  }
  return false;
}

export function normalizeSelectedNodeIds(selectedNodes: any[]): number[] {
  const uniqueIds = new Set<number>();
  selectedNodes.forEach((node) => {
    const id = toLogicalRowId(node);
    if (id !== null) uniqueIds.add(id);
  });
  return Array.from(uniqueIds);
}

export function getVisibleLogicalRowIds(api: any, pendingIds: number[] = []): number[] {
  const pendingIdSet = new Set(pendingIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0));
  const orderedIds: number[] = [];
  const seenIds = new Set<number>();

  forEachGridNode(api, (node: any) => {
    const id = toLogicalRowId(node);
    if (id === null || pendingIdSet.has(id) || seenIds.has(id)) return;
    seenIds.add(id);
    orderedIds.push(id);
  });

  return orderedIds;
}

function setLogicalRowSelection(api: any, logicalIds: Set<number>, selected: boolean) {
  return forEachGridNode(api, (node: any) => {
    const id = toLogicalRowId(node);
    if (id === null || !logicalIds.has(id)) return;
    node.setSelected(selected);
  });
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
  selectionScopeKey,
}: {
  onRowDoubleClick?: (data: any) => void;
  pendingIds?: number[];
  selectionScopeKey?: string | number | null;
} = {}) {
  const selectionAnchorRef = useRef<number | null>(null);

  const handleRowClicked = useCallback((event: any) => {
    if (!event?.node || shouldIgnoreRowSelection(event.event?.target)) return;
    if (event.data && pendingIds.includes(Number(event.data.id))) return;
    const clickedId = toLogicalRowId(event.node);
    if (clickedId === null) return;
    const mouseEvent = event.event as MouseEvent | undefined;
    const isToggleSelection = Boolean(mouseEvent?.metaKey || mouseEvent?.ctrlKey);
    const isRangeSelection = Boolean(mouseEvent?.shiftKey);

    if (isRangeSelection && selectionAnchorRef.current !== null) {
      const visibleIds = getVisibleLogicalRowIds(event.api, pendingIds);
      const anchorIndex = visibleIds.indexOf(selectionAnchorRef.current);
      const clickedIndex = visibleIds.indexOf(clickedId);

      if (anchorIndex !== -1 && clickedIndex !== -1) {
        const start = Math.min(anchorIndex, clickedIndex);
        const end = Math.max(anchorIndex, clickedIndex);
        const rangeIds = new Set(visibleIds.slice(start, end + 1));
        event.api.deselectAll();
        setLogicalRowSelection(event.api, rangeIds, true);
        return;
      }
    }

    if (isToggleSelection) {
      const currentlySelectedIds = normalizeSelectedNodeIds(event.api?.getSelectedNodes?.() || []);
      const shouldSelect = !currentlySelectedIds.includes(clickedId);
      const updated = setLogicalRowSelection(event.api, new Set([clickedId]), shouldSelect);
      if (!updated) event.node.setSelected(shouldSelect);
    } else {
      event.api.deselectAll();
      const updated = setLogicalRowSelection(event.api, new Set([clickedId]), true);
      if (!updated) event.node.setSelected(true);
    }

    selectionAnchorRef.current = clickedId;
  }, [pendingIds]);

  const handleRowDoubleClicked = useCallback((event: any) => {
    if (!event?.data || shouldIgnoreRowSelection(event.event?.target)) return;
    if (pendingIds.includes(Number(event.data.id))) return;
    onRowDoubleClick?.(event.data);
  }, [onRowDoubleClick, pendingIds]);

  useEffect(() => {
    selectionAnchorRef.current = null;
  }, [selectionScopeKey]);

  return {
    handleRowClicked,
    handleRowDoubleClicked,
    selectionAnchorRef,
  };
}

export function useOperationalGroupedSelection({
  setSelectedIds,
  selectionScopeKey,
}: {
  setSelectedIds: (ids: number[]) => void;
  selectionScopeKey?: string | number | null;
}) {
  const groupSelectionsRef = useRef<Record<string, number[]>>({});

  const handleSelectionChanged = useCallback((event: any, groupKey: string = "raw") => {
    const ids = normalizeSelectedNodeIds(event?.api?.getSelectedNodes?.() || []);
    groupSelectionsRef.current[groupKey] = ids;
    setSelectedIds(Array.from(new Set(Object.values(groupSelectionsRef.current).flat())));
  }, [setSelectedIds]);

  const resetGroupedSelection = useCallback(() => {
    groupSelectionsRef.current = {};
    setSelectedIds([]);
  }, [setSelectedIds]);

  useEffect(() => {
    resetGroupedSelection();
  }, [resetGroupedSelection, selectionScopeKey]);

  return {
    handleSelectionChanged,
    resetGroupedSelection,
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
  allTriggerRefs,
  ...panels
}: {
  active: boolean;
  onDismiss: () => void;
  allTriggerRefs: React.RefObject<HTMLElement | null>[];
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
      if (allTriggerRefs.some((ref) => ref.current?.contains(target))) return false;
      if (panels.showBulkMenu && !panels.bulkMenuButtonRef.current?.contains(target) && !panels.bulkMenuPanelRef.current?.contains(target)) return true;
      if (panels.showDisplayMenu && !panels.displayMenuButtonRef.current?.contains(target) && !panels.displayMenuPanelRef.current?.contains(target)) return true;
      if (panels.showViewsMenu && !panels.viewsMenuButtonRef.current?.contains(target) && !panels.viewsMenuPanelRef.current?.contains(target)) return true;
      if (panels.hasRowActionMenu && !target.closest(".row-action-menu-container")) return true;
      return false;
    },
  });
}
