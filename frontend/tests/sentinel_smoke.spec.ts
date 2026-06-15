import { test, expect } from '@playwright/test';
import { DashboardView } from './pom/DashboardView';
import { MonitoringView } from './pom/MonitoringView';
import { AssetView } from './pom/AssetView';
import { ProjectView } from './pom/ProjectView';
import { SettingsView } from './pom/SettingsView';

test.describe('System Sentinel (Zero-Tolerance Coverage)', () => {
  
  test.beforeEach(async ({ page }) => {
    // 1. Strict Error Monitoring: Fail test if ANY console error occurs
    page.on('console', msg => {
      if (msg.type() === 'error') {
        throw new Error(`Browser Console Error: ${msg.text()}`);
      }
    });
    page.on('pageerror', err => {
      throw new Error(`Browser Runtime Error: ${err.message}`);
    });
  });

  const views = [
    { path: '/', pom: DashboardView, name: 'Dashboard' },
    { path: '/monitoring', pom: MonitoringView, name: 'Monitoring' },
    { path: '/assets', pom: AssetView, name: 'Assets' },
    { path: '/projects', pom: ProjectView, name: 'Projects' },
    { path: '/settings', pom: SettingsView, name: 'Settings' },
  ];

  for (const view of views) {
    test(`Integrity Check: ${view.name} loads and template is compliant`, async ({ page }) => {
      const pom = new view.pom(page);
      await page.goto(view.path);
      await pom.waitForAppIdle();

      // Check Golden Template Primitives
      // All views should have a main header or identity
      await expect(page.locator('h1').first()).toBeVisible();
    });
  }

  test('Monitoring View: Golden Template Deep Link & Share Integrity', async ({ page }) => {
    const monitoringView = new MonitoringView(page);
    await page.goto('/monitoring');
    await monitoringView.waitForAppIdle();

    // Select first item with wait
    const firstRow = page.locator('.ag-row').first();
    await firstRow.scrollIntoViewIfNeeded();
    await firstRow.waitFor({ state: 'visible' });
    await firstRow.click();
    
    // Verify Deep Linking
    await expect(page).toHaveURL(/id=/);

    // Verify Golden Template Header & Share functionality
    const modal = await monitoringView.getModal();
    await expect(modal).toBeVisible();
    const shareButton = modal.getByTitle('Share direct link');
    await expect(shareButton).toBeVisible();
    
    // Catch-all: Ensure no ReferenceError occurs in the modal
    await expect(modal.locator('h2')).toBeVisible();
  });
});
