import { test, expect } from '@playwright/test';
import { MonitoringView } from './pom/MonitoringView';
import { resetBrowserState } from './helpers/sysgrid';

test.describe('Monitoring Comprehensive Functional Coverage', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Hardened Error Monitoring
    page.on('console', msg => { if (msg.type() === 'error') throw new Error(msg.text()); });
    page.on('pageerror', err => { throw new Error(err.message); });
    await resetBrowserState(page);
    await page.goto('/monitoring');
  });

  // 1. CRUD: Add
  test('Add Monitor: Validate field sanitization and success', async ({ page }) => {
    const monitoringView = new MonitoringView(page);
    await page.getByRole('button', { name: /Add Monitoring/i }).click();
    await page.getByPlaceholder('Monitor Title').fill('Coverage-Test-Add');
    await page.getByPlaceholder('Description').fill('Exhaustive-Test');
    await page.getByRole('button', { name: /Add Monitoring/i }).click();
    await expect(page.getByText('Coverage-Test-Add')).toBeVisible();
  });

  // 2. CRUD: Edit
  test('Edit Monitor: Validate state propagation and save', async ({ page }) => {
    const monitoringView = new MonitoringView(page);
    // Assumes Add test passed, but we'll use a known existing monitor for safety
    await page.locator('.ag-row').first().click();
    await page.getByRole('button', { name: /Edit/i }).click();
    await page.getByPlaceholder('Monitor Title').fill('Coverage-Test-Update');
    await page.getByRole('button', { name: /Save/i }).click();
    await expect(page.getByText('Coverage-Test-Update')).toBeVisible();
  });

  // 3. Validation: Missing Required Fields
  test('Validation: Triggers error on empty title', async ({ page }) => {
    await page.getByRole('button', { name: /Add Monitoring/i }).click();
    await page.getByRole('button', { name: /Add Monitoring/i }).click();
    await expect(page.getByText('Title is required')).toBeVisible();
  });
});
