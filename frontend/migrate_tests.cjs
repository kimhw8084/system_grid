const fs = require('fs');
const path = require('path');

const TESTS_DIR = path.join(__dirname, 'tests');

function processFile(filePath) {
    if (filePath.includes('sysgrid-test.ts')) return; // Skip fixture
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Migrate Test Fixture Imports
    const relPath = path.relative(path.dirname(filePath), path.join(TESTS_DIR, 'helpers', 'sysgrid-test'));
    const importPath = relPath.startsWith('.') ? relPath.replace(/\.ts$/, '') : './' + relPath.replace(/\.ts$/, '');

    // Replace combined import
    if (content.match(/import\s+\{\s*(test,\s*expect|expect,\s*test)\s*\}\s*from\s*['"]@playwright\/test['"]/)) {
        content = content.replace(/import\s+\{\s*(test,\s*expect|expect,\s*test)\s*\}\s*from\s*['"]@playwright\/test['"]/g, 
        `import { expect } from '@playwright/test';\nimport { test } from '${importPath}';`);
    } else if (content.includes(`import { test } from '@playwright/test'`)) {
        content = content.replace(/import\s+\{\s*test\s*\}\s*from\s*['"]@playwright\/test['"]/g, 
        `import { test } from '${importPath}';`);
    }

    // Add clickResilientButton import if missing
    if (!content.includes('clickResilientButton') && !filePath.includes('helpers')) {
        const helperRelPath = path.relative(path.dirname(filePath), path.join(TESTS_DIR, 'helpers', 'sysgrid'));
        const helperImport = helperRelPath.startsWith('.') ? helperRelPath : './' + helperRelPath;
        content = `import { clickResilientButton } from '${helperImport}';\n` + content;
    }

    // 2. Migrate request to sysApi
    content = content.replace(/async\s*\(\{\s*page\s*,\s*request\s*\}\)/g, 'async ({ page, sysApi: request })');
    content = content.replace(/async\s*\(\{\s*request\s*,\s*page\s*\}\)/g, 'async ({ sysApi: request, page })');
    content = content.replace(/async\s*\(\{\s*request\s*\}\)/g, 'async ({ sysApi: request })');

    // Remove obsolete headers
    content = content.replace(/headers:\s*\{\s*['"]X-User-Id['"]:\s*['"][^'"]+['"](?:,\s*['"]X-Tenant-Id['"]:\s*['"][^'"]+['"])?\s*\}/g, '/* headers auto-injected */');

    // 3. Fix Linter Violations (AST / Regex mapping)
    // buttons
    content = content.replace(/await\s+page\.getByRole\('button',\s*\{\s*name:\s*(['"`/].*?['"`/][a-z]*)(?:,\s*exact:\s*true)?\s*\}\)\.first\(\)\.click\(\{.*\}\)/g, "await clickResilientButton(page, $1)");
    content = content.replace(/await\s+page\.getByRole\('button',\s*\{\s*name:\s*(['"`/].*?['"`/][a-z]*)(?:,\s*exact:\s*true)?\s*\}\)\.first\(\)\.click\(\)/g, "await clickResilientButton(page, $1)");
    content = content.replace(/await\s+page\.getByRole\('button',\s*\{\s*name:\s*(['"`/].*?['"`/][a-z]*)(?:,\s*exact:\s*true)?\s*\}\)\.click\(\{.*\}\)/g, "await clickResilientButton(page, $1)");
    content = content.replace(/await\s+page\.getByRole\('button',\s*\{\s*name:\s*(['"`/].*?['"`/][a-z]*)(?:,\s*exact:\s*true)?\s*\}\)\.click\(\)/g, "await clickResilientButton(page, $1)");
    content = content.replace(/await\s+page\.getByRole\('button',\s*\{\s*name:\s*new\s*RegExp\((.*?)\)\s*\}\)\.click\(\)/g, "await clickResilientButton(page, new RegExp($1))");
    
    // exact text
    content = content.replace(/await\s+page\.getByText\((['"`/].*?['"`/][a-z]*)(?:,\s*\{\s*exact:\s*true\s*\})?\)\.click\(\)/g, "await clickResilientButton(page, $1)");

    // Save
    fs.writeFileSync(filePath, content, 'utf8');
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.spec.ts')) {
            processFile(fullPath);
        }
    }
}

console.log('Running test migration...');
walkDir(TESTS_DIR);
console.log('Migration complete.');
