const fs = require("fs");
const menuFile = fs.readFileSync("frontend/src/components/shared/OperationalRowActionMenu.tsx", "utf8");
["row-action-menu-container", "rounded-xl", "overflow-hidden", "rounded-t-xl"].forEach(p => {
    if (!menuFile.includes(p)) throw new Error(`Missing required pattern: ${p}`);
});

["createPortal", "position: \"fixed\""].forEach(p => {
    if (!menuFile.includes(p)) throw new Error(`Missing required pattern: ${p}`);
});

const geomFile = fs.readFileSync("frontend/src/components/shared/OperationalRowActionGeometry.ts", "utf8");
if (!geomFile.includes("measuredHeight")) throw new Error("Missing measuredHeight usage in OperationalRowActionGeometry.ts");
