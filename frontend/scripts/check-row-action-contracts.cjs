const fs = require('fs');
const path = require('path');

const forbiddenPatterns = [
  "panelHeight = 400",
  "repeat(${section.items.length}, 1fr)",
  "repeat(section.items.length, 1fr)",
  "minmax(0, 1fr)",
  "overflow-x-auto",
  "overflow-x-scroll",
  "truncate",
  "text-overflow",
  "menuWidth: 336",
  "menuWidth: 280",
  "querySelectorAll",
  "scrollWidth",
  "row-action-button-min-width",
  "OperationalAnchoredPanel"
];

const requiredPatterns = [
  "computeRowActionGeometry",
  "estimateRowActionButtonWidth",
  "actionSetWidth",
  "buttonWidths",
  "panelHeight",
  "POINT_MENU_CURSOR_GAP",
  "belowSpace",
  "aboveSpace",
  "whitespace-nowrap",
  "justify-center"
];

const relevantFiles = [
  'shared/OperationalRowActionMenu.tsx',
  'MonitoringGrid.tsx',
  'ServicesReal.tsx',
  'External.tsx'
];

relevantFiles.forEach(file => {
  const filePath = path.join(__dirname, '../src/components', file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Only scan within row-action menu definitions if it's a grid/view file
  if (file !== 'shared/OperationalRowActionMenu.tsx') {
    const menuMatch = content.match(/setRowActionMenu\(\{[\s\S]*?\}\)/g);
    const renderMatch = content.match(/<OperationalRowActionMenu[\s\S]*?\/>/g);
    content = (menuMatch ? menuMatch.join('\n') : '') + '\n' + (renderMatch ? renderMatch.join('\n') : '');
  }
  
  forbiddenPatterns.forEach(pattern => {
    if (content.includes(pattern)) {
      console.error(`Forbidden pattern found in ${file}: ${pattern}`);
      process.exit(1);
    }
  });
});

// Specific checks
const menuContent = fs.readFileSync(path.join(__dirname, '../src/components/shared/OperationalRowActionMenu.tsx'), 'utf8');
const geoContent = fs.readFileSync(path.join(__dirname, '../src/components/shared/OperationalRowActionGeometry.ts'), 'utf8');
const externalContent = fs.readFileSync(path.join(__dirname, '../src/components/External.tsx'), 'utf8');

requiredPatterns.forEach(pattern => {
  if (!geoContent.includes(pattern) && !menuContent.includes(pattern)) {
    console.error(`Required pattern not found: ${pattern}`);
    process.exit(1);
  }
});

if (!externalContent.includes("cursorX={rowActionMenu.point.x}") || !externalContent.includes("cursorY={rowActionMenu.point.y}")) {
  console.error("External.tsx must pass cursorX and cursorY to OperationalRowActionMenu");
  process.exit(1);
}

if (menuContent.includes('SECTION_TITLE_MAP["archive"]')) {
    console.error("Archive title should not be rendered");
    process.exit(1);
}

console.log('Row-action contract check passed.');
