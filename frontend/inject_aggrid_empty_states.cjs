const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, 'src', 'components');

const TARGET_FILES = ['Assets.tsx', 'AssetGrid_Legacy.tsx', 'FAR.tsx', 'Knowledge.tsx', 'Network.tsx', 'Projects.tsx', 'Research.tsx', 'Vendor.tsx', 'External.tsx', 'ServiceRegistry.tsx'];

function injectAgGridEmptyState(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Inject overlayNoRowsTemplate directly into AgGridReact tags if not present
    if (content.includes('<AgGridReact') && !content.includes('overlayNoRowsTemplate')) {
        content = content.replace(/<AgGridReact/g, `<AgGridReact overlayNoRowsTemplate="<div class='flex flex-col items-center justify-center p-8'><span class='text-slate-500 font-semibold text-[12px] uppercase tracking-widest'>No data found for this view</span></div>"`);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Injected empty state into AgGrid in: ${path.basename(filePath)}`);
    }
}

TARGET_FILES.forEach(file => {
    const filePath = path.join(COMPONENTS_DIR, file);
    if (fs.existsSync(filePath)) {
        injectAgGridEmptyState(filePath);
    }
});
