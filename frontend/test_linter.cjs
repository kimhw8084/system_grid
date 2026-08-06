const fs = require('fs');
const path = require('path');

const TESTS_DIR = path.join(__dirname, 'tests');

const BRITTLE_LOCATOR_REGEX = /await page\.(getByText|locator|getByRole)\(/g;
const EXEMPT_FILES = ['helpers', 'debug.spec.ts', 'smoke.spec.ts']; 

function scanFile(filePath) {
    if (EXEMPT_FILES.some(ex => filePath.includes(ex))) return 0;
    
    const content = fs.readFileSync(filePath, 'utf8');
    let violations = 0;

    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (line.includes('// eslint-disable-next-line')) return;
        
        const matches = [...line.matchAll(BRITTLE_LOCATOR_REGEX)];
        if (matches.length > 0) {
            // EXEMPTIONS FOR VALID USE CASES
            if (
                line.includes('expect(') || 
                line.includes("getByRole('heading") || 
                line.includes("getByRole('dialog") ||
                line.includes("getByRole('link") || // Links are distinct from standard buttons
                line.includes('.fill(') ||          // Filling inputs is valid
                line.includes('.selectOption(') ||  // Dropdowns are valid
                line.includes('.check(') ||         // Checkboxes are valid
                line.includes('rf__node-') ||       // ReactFlow node canvas interacts
                line.includes('.ag-') ||            // AgGrid specific DOM manipulation
                line.includes('getByText(') && !line.includes('.click()') // Checking text presence
            ) {
                return;
            }

            // If we are strictly clicking a button/menu item via getByText that isn't data-driven
            // Allow data-driven exact matches like: getByText(rackA2.name) 
            if (line.includes('.click()') && line.match(/getByText\([a-zA-Z0-9_]+\.name/)) {
                 return;
            }
            
            // Allow specific glass-panel cross-out closing (hard to abstract generically)
            if (line.includes('.glass-panel') && line.includes('border-b > button')) {
                return;
            }

            if (
                line.includes('.bulk-menu-container') || // Specific UI wrapper without aria-label
                line.includes('button:has(svg.') ||     // Icon-only buttons
                line.includes('filter({ hasText') ||      // Advanced filtering that bypasses simple regex
                line.includes('.evaluateAll(')          // Valid dynamic crawler link discovery
            ) {
                return;
            }

            console.log(`[LINTER ERROR] ${filePath}:${index + 1}`);
            console.log(`  > Found raw brittle locator: ${line.trim()}`);
            console.log(`  > FIX: Use 'clickResilientButton' or proper abstracted helpers.`);
            violations++;
        }
    });
    
    return violations;
}

function walkDir(dir) {
    let totalViolations = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            totalViolations += walkDir(fullPath);
        } else if (fullPath.endsWith('.spec.ts')) {
            totalViolations += scanFile(fullPath);
        }
    }
    return totalViolations;
}

console.log('Running SysGrid Test Architecture Linter...');
const violations = walkDir(TESTS_DIR);

if (violations > 0) {
    console.error(`\nLINTER FAILED: ${violations} anti-fragile violations found. Please use sysgrid.ts helpers.`);
    process.exit(1);
} else {
    console.log('\nLINTER PASSED: Test architecture is compliant.');
    process.exit(0);
}
