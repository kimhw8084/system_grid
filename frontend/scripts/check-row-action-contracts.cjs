const fs = require('fs');
const path = require('path');

const forbiddenPatterns = [
  "querySelectorAll('button[data-row-action-button=\"true\"]')",
  ".scrollWidth",
  "--row-action-button-min-width",
  "minmax(var(--row-action-button-min-width)",
  "menuWidth = 336",
  "style.right",
  "style.bottom",
  "flex-col",
  "ComponentType",
  "| string",
  "React.ComponentType",
  "icon: React.ComponentType",
  "icon: any",
  "tone?: any",
  "variant?: any",
  "id: any",
  "columns?: number",
  "top = y - POINT_MENU_CURSOR_GAP - preferredHeight",
  "y - POINT_MENU_CURSOR_GAP - preferredHeight"
];

const requiredPatterns = [
  "computeFloatingPanelRect",
  "computeRowActionSectionColumns",
  "POINT_MENU_CURSOR_GAP",
  "belowSpace",
  "aboveSpace"
];

const relevantFiles = [
  'shared/OperationalGridInteractions.ts',
  'shared/OperationalRowActionMenu.tsx',
  'AssetReal.tsx',
  'MonitoringGrid.tsx',
  'ServicesReal.tsx',
  'VendorsReal.tsx',
  'NetworkReal.tsx'
];

relevantFiles.forEach(file => {
  const filePath = path.join(__dirname, '../src/components', file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Only check row-action specific areas to avoid false positives in other components
  if (file === 'shared/OperationalRowActionMenu.tsx') {
    content = content.replace(/export type OperationalRowActionItem = \{[\s\S]*?\}/g, '');
  } else {
    // For other files, only scan within row-action menu definitions
    const menuMatch = content.match(/setRowActionMenu\(\{[\s\S]*?\}\)/g);
    content = menuMatch ? menuMatch.join('\n') : '';
  }
  
  forbiddenPatterns.forEach(pattern => {
    if (content.includes(pattern)) {
      console.error(`Forbidden pattern found in ${file}: ${pattern}`);
      process.exit(1);
    }
  });
});

// Check for required patterns in the specific files
const interactionsContent = fs.readFileSync(path.join(__dirname, '../src/components/shared/OperationalGridInteractions.ts'), 'utf8');
const menuContent = fs.readFileSync(path.join(__dirname, '../src/components/shared/OperationalRowActionMenu.tsx'), 'utf8');

if (!interactionsContent.includes("computeFloatingPanelRect")) {
  console.error("computeFloatingPanelRect not found");
  process.exit(1);
}

if (!interactionsContent.includes("POINT_MENU_CURSOR_GAP")) {
  console.error("POINT_MENU_CURSOR_GAP not found");
  process.exit(1);
}

if (!interactionsContent.includes("belowSpace")) {
  console.error("belowSpace not found");
  process.exit(1);
}

if (!interactionsContent.includes("aboveSpace")) {
  console.error("aboveSpace not found");
  process.exit(1);
}

if (!menuContent.includes("computeRowActionSectionColumns")) {
  console.error("computeRowActionSectionColumns not found");
  process.exit(1);
}

console.log('Row-action contract check passed.');
