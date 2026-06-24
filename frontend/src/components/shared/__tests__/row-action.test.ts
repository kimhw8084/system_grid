import { test, expect, describe } from "vitest";
import { computeRowActionGeometry } from "../OperationalRowActionGeometry";

describe("Row-action geometry and placement", () => {
  test("Placement: chooses 'below' if it fits full menu", () => {
    const sections = [{ id: 'quickAccess' as const, items: [{ id: '1', label: 'Details', icon: () => null, onClick: () => {} }] }];
    const viewportHeight = 900;
    const cursorY = 100;
    // belowSpace = 900 - 16 - (100 + 8) = 776
    // panelHeight = ~150
    // Fits below!
    const geometry = computeRowActionGeometry({
        sections, viewportWidth: 1000, viewportHeight, cursorX: 500, cursorY
    });
    expect(geometry.placement).toBe("below");
  });

  test("Placement: chooses 'above' if below does not fit but above does", () => {
    const sections = [{ id: 'quickAccess' as const, items: [{ id: '1', label: 'Details', icon: () => null, onClick: () => {} }] }];
    const viewportHeight = 900;
    const cursorY = 800;
    // belowSpace = 900 - 16 - (800 + 8) = 76.
    // panelHeight = ~150. Does not fit below!
    // aboveSpace = 800 - 8 - 16 = 776. Fits above!
    const geometry = computeRowActionGeometry({
        sections, viewportWidth: 1000, viewportHeight, cursorX: 500, cursorY
    });
    expect(geometry.placement).toBe("above");
    expect(geometry.style.maxHeight).toBe(geometry.panelHeight);
  });
  
  test("Placement: clamps height if neither fits", () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: `${i}`, label: "Button", icon: () => null, onClick: () => {} }));
    const sections = [{ id: "quickAccess" as const, items: items }];
    // Force panelHeight very large
    const geometry = computeRowActionGeometry({
        sections,
        viewportWidth: 1000,
        viewportHeight: 400,
        cursorX: 500,
        cursorY: 200
    });
    // neither fits
    expect(geometry.style.maxHeight).toBeLessThan(geometry.panelHeight);
  });
});

  test("Placement: middle cursor opens above when fits", () => {
    const sections = [{ id: "quickAccess" as const, items: [{ id: "1", label: "Details", icon: () => null, onClick: () => {} }] }];
    const viewportHeight = 900;
    const cursorY = 520;
    const measuredPanelHeight = 430;
    // belowSpace = 900 - 16 - (520 + 8) = 356
    // aboveSpace = 520 - 8 - 16 = 496
    // panelHeight = 430
    // panelHeight > belowSpace (356), but panelHeight <= aboveSpace (496).
    // Placement must be above.

    const geometry = computeRowActionGeometry({
        sections,
        viewportWidth: 1000,
        viewportHeight: 900,
        cursorX: 500,
        cursorY: cursorY,
        measuredHeight: measuredPanelHeight
    });

    expect(geometry.placement).toBe("above");
    expect(geometry.style.bottom).toBeDefined();
    expect(geometry.style.top).toBeUndefined();
    expect(geometry.style.maxHeight).toBe(measuredPanelHeight);
  });
