const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, 'src', 'components');

const FIX_MAP = {
    'Projects.tsx': {
        condition: 'sortedAndFiltered.length === 0',
        wrapper: '<div className="h-full flex items-center justify-center"><WorkspaceEmptyState title="No projects found" description="Create your first project vector to get started." /></div>'
    },
    'Assets.tsx': {
        condition: 'assets.length === 0',
        wrapper: '<div className="h-full flex items-center justify-center"><WorkspaceEmptyState title="No assets found" description="Register your first infrastructure asset." /></div>'
    },
    'DataFlowDesigner.tsx': {
        condition: 'nodes.length === 0',
        wrapper: '<div className="h-full flex items-center justify-center"><WorkspaceEmptyState title="No architecture nodes found" description="Drag a component to the canvas to start designing." /></div>'
    },
    'Research.tsx': {
        condition: 'timelines.length === 0',
        wrapper: '<div className="h-full flex items-center justify-center"><WorkspaceEmptyState title="No research timelines found" description="Start a new research investigation." /></div>'
    },
    'Vendor.tsx': {
        condition: 'vendors.length === 0',
        wrapper: '<div className="h-full flex items-center justify-center"><WorkspaceEmptyState title="No vendors found" description="Add a vendor to begin registry management." /></div>'
    }
};

function fixEmptyState(filePath, config) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if imported
    if (!content.includes('WorkspaceEmptyState')) {
        content = content.replace(/(import .*?from '.*)';?/, `$1;\nimport { WorkspaceEmptyState } from "./shared/OperationalWorkspacePrimitives";`);
    }

    // This is hard to do safely with regex across all components.
    // I will look for the Reorder.Group or similar container and add a conditional render.
    console.log(`Manually patch required for: ${filePath}. I have the logic, I need to look closer at the file content first.`);
}

// I will do this manually for the 5 files to be safe.
EOF
