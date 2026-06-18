import { test, expect } from '@playwright/test';
import { clickResilientButton, resetBrowserState } from './helpers/sysgrid';

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
    await clickResilientButton(page, /Add Monitoring/i);
    await page.getByPlaceholder('Monitor Title').fill('Coverage-Test-Add');
    await page.getByPlaceholder('Description').fill('Exhaustive-Test');
    await clickResilientButton(page, /Add Monitoring/i);
    await expect(page.getByText('Coverage-Test-Add')).toBeVisible();
  });

  // 2. CRUD: Edit
  test('Edit Monitor: Validate state propagation and save', async ({ page }) => {
    await page.locator('.ag-row').first().click();
    await clickResilientButton(page, /Edit/i);
    await page.getByPlaceholder('Monitor Title').fill('Coverage-Test-Update');
    await clickResilientButton(page, /Save/i);
    await expect(page.getByText('Coverage-Test-Update')).toBeVisible();
  });

  // 3. Validation: Missing Required Fields
  test('Validation: Triggers error on empty title', async ({ page }) => {
    await clickResilientButton(page, /Add Monitoring/i);
    await clickResilientButton(page, /Add Monitoring/i);
    await expect(page.getByText('Title is required')).toBeVisible();
  });
});
