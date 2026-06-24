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
  "ComponentType",
  "| string",
  "React.ComponentType",
  "icon: React.ComponentType",
  "icon: any",
  "tone?: any",
  "variant?: any",
  "id: any",
  "columns?: number"
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
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  
  const filteredLines = lines.filter(line => {
    if (file === 'shared/OperationalRowActionMenu.tsx') {
        if (line.trim().startsWith('export type OperationalRowAction')) return false;
        if (line.trim().includes('icon: React.ComponentType')) return false;
    }
    return true;
  });

  const content = filteredLines.join('\n');
  
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

if (!menuContent.includes("computeRowActionSectionColumns")) {
  console.error("computeRowActionSectionColumns not found");
  process.exit(1);
}

if (!menuContent.includes("minmax(0, 1fr)")) {
  console.error("minmax(0, 1fr) not found");
  process.exit(1);
}

console.log('Row-action contract check passed.');
