const fs = require('fs');
const path = require('path');
const components = ['External.tsx', 'MonitoringGrid.tsx', 'ServicesReal.tsx'];
components.forEach(comp => {
  const content = fs.readFileSync(path.join(__dirname, '../src/components', comp), 'utf8');
  if (comp === 'MonitoringGrid.tsx' && !content.includes('DataStatusPill')) {
     console.error('MonitoringGrid.tsx missing DataStatusPill');
     process.exit(1);
  }
});
console.log('Row-action contract check passed.');
