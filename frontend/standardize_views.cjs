const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, 'src', 'components');

const TARGET_FILES = ['Assets.tsx', 'AssetGrid_Legacy.tsx', 'FAR.tsx', 'Knowledge.tsx', 'Network.tsx', 'Projects.tsx', 'Research.tsx', 'Service.tsx'];

function standardizeEmptyStates(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Inject import if not present
    if (!content.includes('WorkspaceEmptyState')) {
        // Find existing primitives import
        if (content.includes('./shared/OperationalWorkspacePrimitives')) {
            content = content.replace(/import\s+\{([^}]*)\}\s+from\s+['"].\/shared\/OperationalWorkspacePrimitives['"]/, (match, p1) => {
                return `import { WorkspaceEmptyState, ${p1.trim()} } from "./shared/OperationalWorkspacePrimitives"`;
            });
        } else {
             // Add below react
             content = content.replace(/(import React.*?from 'react';?)/, `$1\nimport { WorkspaceEmptyState } from "./shared/OperationalWorkspacePrimitives";`);
        }
    }

    // Crude Regex replacements for common unstandardized empty states we found
    // Ex: <div className="py-20 text-center text-slate-600 font-bold uppercase tracking-widest">No matching assets</div>
    content = content.replace(/<div[^>]*>\s*No matching assets\s*<\/div>/gi, 
        `<WorkspaceEmptyState title="No matching assets" description="Adjust your filters or add new assets to the matrix." />`);
    
    // Ex: <tr><td colSpan={6} className="...">No active network links found in fabric</td></tr>
    content = content.replace(/<tr[^>]*>\s*<td[^>]*>\s*No active network links found in fabric\s*<\/td>\s*<\/tr>/gi, 
        `<tr><td colSpan={8}><WorkspaceEmptyState compact title="No active network links found in fabric" /></td></tr>`);

    content = content.replace(/<tr[^>]*>\s*<td[^>]*>\s*No hardware mappings found\s*<\/td>\s*<\/tr>/gi, 
        `<tr><td colSpan={8}><WorkspaceEmptyState compact title="No hardware mappings found" /></td></tr>`);

    // Ex: <p className="text-sm font-black uppercase tracking-[0.3em]">No Intelligence Found</p>
    content = content.replace(/<p[^>]*>\s*No Intelligence Found\s*<\/p>/gi, 
        `<WorkspaceEmptyState title="No Intelligence Found" description="The database query returned zero records." />`);

    content = content.replace(/<p[^>]*>\s*No guidance protocols found\s*<\/p>/gi, 
        `<WorkspaceEmptyState title="No guidance protocols found" description="No standard operating procedures are linked." />`);

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Standardized empty states in: ${path.basename(filePath)}`);
    }
}

TARGET_FILES.forEach(file => {
    const filePath = path.join(COMPONENTS_DIR, file);
    if (fs.existsSync(filePath)) {
        standardizeEmptyStates(filePath);
    }
});
