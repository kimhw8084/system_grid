import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { resetBrowserState, waitForAppIdle } from './helpers/sysgrid';

test.describe('Blank Slate Crash Audit', () => {
    test('Navigates all views in a pristine, unseeded tenant to guarantee zero fatal React crashes', async ({ page, sysApi }) => {
        test.setTimeout(60_000); 

        // 1. Force a completely empty tenant context for this test
        const emptyTenantId = 'blank-slate-tenant-' + Date.now();
        
        // Wrap request to use the empty tenant
        const emptyApi = {
            post: (path: string, opts?: any) => sysApi.post(path, { ...opts, headers: { ...opts?.headers, 'X-Tenant-Id': emptyTenantId } }),
            get: (path: string, opts?: any) => sysApi.get(path, { ...opts, headers: { ...opts?.headers, 'X-Tenant-Id': emptyTenantId } })
        };

        // Create the tenant
        await emptyApi.post('/settings/tenants', {
            data: { id: emptyTenantId, name: 'Blank Slate Test Tenant', status: 'Active' }
        });

        // Set the browser to use this tenant
        await page.addInitScript((tenantId) => {
            window.localStorage.setItem('SYSGRID_TENANT_ID', tenantId);
        }, emptyTenantId);

        await resetBrowserState(page);
        
        const errors: string[] = [];
        page.on('pageerror', err => errors.push(err.message));

        await page.goto('/');
        await waitForAppIdle(page);

        // Discover views
        const navLinks = await page.locator('a[href^="/"]').evaluateAll((links) => {
            return Array.from(new Set(links.map(l => l.getAttribute('href')).filter(h => h && h.length > 1 && !h.startsWith('http'))));
        });
        
        console.log(`[Blank-Slate] Discovered ${navLinks.length} views to audit.`);
        expect(navLinks.length).toBeGreaterThan(0);

        for (const route of navLinks) {
            await page.goto(route);
            await waitForAppIdle(page);

            // Assert React did not crash (main root still exists and has content)
            const mainBody = page.locator('main, #root, #app-root').first();
            await expect(mainBody).toBeVisible();
            
            // Fail fast if a React error was thrown
            expect(errors).toEqual([]);
        }
    });
});
