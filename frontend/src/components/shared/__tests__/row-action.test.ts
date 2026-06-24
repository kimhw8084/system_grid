import { test, expect } from "vitest";
import { computeRowActionGeometry } from "../OperationalRowActionGeometry";

test.describe("Row-action rectangle law", () => {
  test("Viewport clamp and actionSetWidth normalization", () => {
    const sections = [
      { id: 'quickAccess' as const, items: [{ id: '1', label: 'Details', icon: () => null, onClick: () => {} }, { id: '2', label: 'Edit', icon: () => null, onClick: () => {} }] },
      { id: 'followOptions' as const, items: [{ id: '3', label: 'Watch', icon: () => null, onClick: () => {} }, { id: '4', label: 'Pin', icon: () => null, onClick: () => {} }] },
      { id: 'archive' as const, items: [{ id: '5', label: 'Archive', icon: () => null, onClick: () => {} }] }
    ];
    
    const viewportWidth = 240;
    const viewportHeight = 800;
    const geometry = computeRowActionGeometry({
        sections,
        viewportWidth,
        viewportHeight,
        cursorX: 100,
        cursorY: 100
    });

    expect(geometry.panelWidth).toBeLessThanOrEqual(viewportWidth - 32);
    
    geometry.sections.forEach(section => {
        section.rows.forEach(row => {
            expect(row.rowWidth).toBe(geometry.actionSetWidth);
        });
    });
  });

  test("Placement: prefers above when it fits and below does not", () => {
    const sections = [
      { id: "quickAccess" as const, items: [{ id: "1", label: "Details", icon: () => null, onClick: () => {} }] }
    ];
    const geometry = computeRowActionGeometry({
        sections,
        viewportWidth: 1000,
        viewportHeight: 900,
        cursorX: 500,
        cursorY: 800
    });

    expect(geometry.placement).toBe("above");
    expect(geometry.style.bottom).toBeDefined();
    expect(geometry.style.top).toBeUndefined();
    expect(geometry.style.maxHeight).toBe(geometry.panelHeight);
  });
});
