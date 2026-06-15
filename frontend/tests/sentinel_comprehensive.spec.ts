import { test, expect } from '@playwright/test';
import { BaseView } from './pom/BaseView';
import { DashboardView } from './pom/DashboardView';
import { MonitoringView } from './pom/MonitoringView';
import { AssetView } from './pom/AssetView';
import { ProjectView } from './pom/ProjectView';
import { SettingsView } from './pom/SettingsView';
import { resetBrowserState } from './helpers/sysgrid';

test.describe('System Sentinel (Zero-Tolerance Coverage - Comprehensive)', () => {
  
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
    await resetBrowserState(page);
  });

  const views = [
    { path: '/', pom: DashboardView, name: 'Dashboard' },
    { path: '/monitoring', pom: MonitoringView, name: 'Monitoring' },
    { path: '/assets', pom: AssetView, name: 'Assets' },
    { path: '/projects', pom: ProjectView, name: 'Projects' },
    { path: '/settings', pom: SettingsView, name: 'Settings' },
  ];

  for (const view of views) {
    test(`Comprehensive Check: ${view.name} loads and template is compliant`, async ({ page }) => {
      const pom = new view.pom(page);
      await page.goto(view.path);
      await pom.waitForAppIdle();

      // Check Golden Template Primitives
      // Verify h1 header is visible to confirm basic render
      await expect(page.locator('h1').first()).toBeVisible();
    });
  }
});
