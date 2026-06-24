const fs = require('fs');
const path = require('path');

const components = ['External.tsx', 'MonitoringGrid.tsx', 'ServicesReal.tsx'];
const invalidClasses = ['text-blue-400', 'text-emerald-400', 'text-amber-400', 'text-rose-300', 'text-white', 'text-emerald-300'];

components.forEach(comp => {
  const filePath = path.join(__dirname, '../src/components', comp);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract OperationalRowActionButton blocks
  const buttonBlocks = content.match(/<OperationalRowActionButton[^>]*>[^<]*<\/OperationalRowActionButton>/gs) || [];
  
  buttonBlocks.forEach(block => {
    invalidClasses.forEach(cls => {
      if (block.includes(cls)) {
        console.error('ERROR: ' + comp + ' contains invalid color class ' + cls + ' in OperationalRowActionButton.');
        process.exit(1);
      }
    });
  });
});

console.log('Row-action contract check passed.');