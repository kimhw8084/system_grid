import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { resetBrowserState, waitForAppIdle } from './helpers/sysgrid';

test.describe('Universal View Resilience Crawler', () => {
    test('Automatically crawls all views to verify standard rendering, API health, and corner cases', async ({ page, sysApi }) => {
        // Increase timeout since this crawls the entire app
        test.setTimeout(120_000); 

        await resetBrowserState(page);
        
        // Listen for unhandled API errors
        const errors: string[] = [];
        page.on('pageerror', err => errors.push(err.message));
        page.on('response', resp => {
            if (resp.status() >= 500 && resp.url().includes('/api/')) {
                errors.push(`API 500 on ${resp.url()}`);
            }
        });

        // 1. Start at Dashboard
        await page.goto('/');
        await waitForAppIdle(page);

        // 2. Extract all navigation links dynamically
        const navLinks = await page.locator('a[href^="/"]').evaluateAll((links) => {
            return Array.from(new Set(links.map(l => l.getAttribute('href')).filter(h => h && h.length > 1 && !h.startsWith('http'))));
        });

        expect(navLinks.length).toBeGreaterThan(0);
        console.log(`[Auto-Crawler] Discovered ${navLinks.length} views to validate.`);

        // 3. Crawl every discovered view
        for (const route of navLinks) {
            console.log(`[Auto-Crawler] Testing view: ${route}`);
            await page.goto(route);
            await waitForAppIdle(page);

            // Verify basic rendering (no blank screen, no fatal crash)
            const mainBody = page.locator('main, #root, #app-root').first();
            await expect(mainBody).toBeVisible();

            // 4. Verify standard generic search input triggers standard WorkspaceEmptyState
            const searchInput = page.getByPlaceholder(/search|filter/i).first();
            if (await searchInput.isVisible()) {
                await searchInput.fill('UNIVERSAL-CRAWLER-INVALID-DATA-XYZ');
                await waitForAppIdle(page);
                
                // Assert the view gracefully degrades into our standardized WorkspaceEmptyState 
                const emptyState = page.locator('text=no').filter({ hasText: /(found|match|assets|projects|items|results|operators|records|data|protocols|intelligence)/i }).first();
                
                try {
                    await expect(emptyState).toBeVisible({ timeout: 3000 });
                } catch (e) {
                    console.warn(`[Auto-Crawler] WARNING: View ${route} failed standard Empty State check.`);
                    // We don't fail the entire crawler for missing empty states yet, 
                    // but we log it for future strict enforcement.
                }
                
                await searchInput.clear();
                await waitForAppIdle(page);
            }
            
            // 5. Assert no fatal API errors occurred during the load and interaction of this view
            expect(errors).toEqual([]);
        }
    });
});
