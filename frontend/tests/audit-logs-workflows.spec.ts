import { test, expect } from '@playwright/test';
import { AuditLogsView } from './pom/AuditLogsView';
import { resetBrowserState } from './helpers/sysgrid';

test.describe('Audit Logs Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await resetBrowserState(page);
  });

  test('AuditLogs view loads and is compliant', async ({ page }) => {
    const auditLogs = new AuditLogsView(page);
    await page.goto('/audit');
    await auditLogs.waitForAppIdle();

    // Check Golden Template Primitives
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
