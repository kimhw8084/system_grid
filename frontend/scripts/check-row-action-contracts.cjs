const fs = require("fs");
const menuFile = fs.readFileSync("src/components/shared/OperationalRowActionMenu.tsx", "utf8");

// Forbidden
["rounded-xl", "rounded-t-xl", "rounded-b-xl"].forEach(p => {
    if (menuFile.includes(p)) throw new Error(`Forbidden pattern found: ${p}`);
});

// Required
["row-action-menu-container", "overflow-hidden", "createPortal"].forEach(p => {
    if (!menuFile.includes(p)) throw new Error(`Missing required pattern: ${p}`);
});
