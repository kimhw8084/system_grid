import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { resetBrowserState, waitForAppIdle } from './helpers/sysgrid';

test.describe('Universal View Resilience Crawler (Automated Chaos)', () => {
    test('Automatically crawls all views and injects chaos to verify resilience', async ({ page, chaos, interactionChaos, networkChaos }) => {
        // Increase timeout since this crawls the entire app with chaos
        test.setTimeout(180_000); 

        // Enable chaos globally
        await chaos.enable('interaction-chaos');
        await chaos.enable('network-chaos');
        await networkChaos.stallRequest('/api/v1', 500); // Latency

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

            // 4. Inject Interaction Chaos
            const buttons = page.locator('button').filter({ hasNotText: /close/i });
            const buttonCount = await buttons.count();
            if (buttonCount > 0) {
                const btn = buttons.nth(Math.floor(Math.random() * buttonCount));
                if (await btn.isVisible()) {
                    await interactionChaos.rapidFireClick(btn, 2);
                }
            }

            // 5. Assert no fatal API errors occurred during the load and interaction of this view
            expect(errors).toEqual([]);
        }
        
        await chaos.killAll();
    });
});
