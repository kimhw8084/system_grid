const fs = require("fs");
const menuFile = fs.readFileSync("src/components/shared/OperationalRowActionMenu.tsx", "utf8");
["row-action-menu-container", "rounded-xl", "overflow-hidden", "rounded-t-xl", "createPortal"].forEach(p => {
    if (!menuFile.includes(p)) throw new Error(`Missing required pattern: ${p}`);
});
