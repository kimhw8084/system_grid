const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '../src/components');
const filesToCheck = ['MonitoringGrid.tsx', 'External.tsx', 'ServicesReal.tsx'];

filesToCheck.forEach(file => {
  const filePath = path.join(componentsDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('useEscapeDismiss') && !content.includes('WorkspaceModal')) {
      console.error(`Error: ${file} uses useEscapeDismiss but not WorkspaceModal!`);
      process.exit(1);
    }
  }
});
console.log('Form contracts check passed.');
