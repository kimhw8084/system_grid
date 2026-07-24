const fs = require('fs');
const path = require('path');

// Re-importing matrix or just defining the map here for simplicity
const WORKSPACE_SHELLS = {
  'src/components/MonitoringGrid.tsx': 'OperationalWorkspaceShell',
  'src/components/External.tsx': 'OperationalWorkspaceShell',
  'src/components/ServicesReal.tsx': 'OperationalWorkspaceShell',
  'src/components/NetworkReal.tsx': 'OperationalWorkspaceShell',
  'src/components/FAR.tsx': 'OperationalWorkspaceShell',
  'src/components/Research.tsx': 'OperationalWorkspaceShell',
  'src/components/assets/AssetGoldenOperationalWorkspace.tsx': 'AssetGoldenShellScaffold',
  'src/components/vendors/VendorGoldenOperationalWorkspace.tsx': 'OperationalWorkspaceShell',
};

function checkShellContract() {
  let failed = false;

  for (const [file, shell] of Object.entries(WORKSPACE_SHELLS)) {
    if (!fs.existsSync(file)) {
      console.error(`File not found: ${file}`);
      failed = true;
      continue;
    }

    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes(shell)) {
      console.error(`Contract Violation: ${file} does not use ${shell}`);
      failed = true;
    }
  }

  if (failed) {
    process.exit(1);
  } else {
    console.log('All shell contracts validated.');
  }
}

checkShellContract();
