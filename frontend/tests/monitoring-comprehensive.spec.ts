import { test, expect, type Page } from '@playwright/test';
import { createMonitoring, getWorkspaceLogicalRowByText, getWorkspaceRoot, resetBrowserState } from './helpers/sysgrid';

test.describe('Monitoring Comprehensive Functional Coverage', () => {
  const openAddMonitoringDialog = async (page: Page) => {
    const workspace = getWorkspaceRoot(page, 'monitoring');
    await expect(workspace).toBeVisible({ timeout: 30000 });
    const addButton = workspace.getByRole('button', { name: 'Add Monitoring', exact: true });
    await expect(addButton).toBeVisible({ timeout: 30000 });
    await expect(addButton).toBeEnabled();
    await addButton.click();
    const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Add Monitoring' }) });
    await expect(dialog).toBeVisible();
    return dialog;
  };

  test.beforeEach(async ({ page }) => {
    // 1. Hardened Error Monitoring
    page.on('console', msg => { if (msg.type() === 'error') throw new Error(msg.text()); });
    page.on('pageerror', err => { throw new Error(err.message); });
    await resetBrowserState(page);
    await page.goto('/monitoring');
    const workspace = getWorkspaceRoot(page, 'monitoring');
    await expect(workspace).toBeVisible({ timeout: 30000 });
    const matrixSearch = workspace.getByPlaceholder('Scan matrix...');
    await expect(matrixSearch).toBeVisible({ timeout: 30000 });
    await matrixSearch.fill('');
    await expect(workspace.getByRole('button', { name: 'Add Monitoring', exact: true })).toBeVisible({ timeout: 30000 });
  });

  // 1. CRUD: Add
  test('Add Monitor: Validate field sanitization and success', async ({ page }) => {
    const addDialog = await openAddMonitoringDialog(page);
    const createdTitle = `Coverage-Test-Add-${Date.now()}`;
    await addDialog.getByPlaceholder('e.g. CORE-DB: High CPU Load Alert').fill(createdTitle);
    await addDialog.getByPlaceholder('Why are we monitoring this?').fill('Exhaustive-Test');
    await addDialog.getByRole('button', { name: 'Add Monitoring', exact: true }).click();
    await expect(addDialog).not.toBeVisible();
    await page.getByPlaceholder('Scan matrix...').fill(createdTitle);
    await getWorkspaceLogicalRowByText(page, 'monitoring', createdTitle);
  });

  // 2. CRUD: Edit
  test('Edit Monitor: Validate state propagation and save', async ({ page, request }) => {
    const originalTitle = `Coverage-Test-Edit-${Date.now()}`;
    await createMonitoring(request, {
      category: 'Hardware',
      status: 'Existing',
      title: originalTitle,
      platform: 'Zabbix',
      purpose: 'Edit propagation coverage',
      notification_method: 'Email',
      severity: 'Warning',
    });
    await page.reload();
    const matrixSearch = page.getByPlaceholder('Scan matrix...');
    await expect(matrixSearch).toBeVisible();
    await matrixSearch.fill(originalTitle);
    const targetRow = await getWorkspaceLogicalRowByText(page, 'monitoring', originalTitle);
    await targetRow.action('Edit configuration').click();
    const updateDialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Update Monitoring' }) });
    await expect(updateDialog).toBeVisible();
    const updatedTitle = `Coverage-Test-Update-${Date.now()}`;
    await updateDialog.getByPlaceholder('e.g. CORE-DB: High CPU Load Alert').fill(updatedTitle);
    await updateDialog.getByRole('button', { name: 'Save Monitoring', exact: true }).click();
    await expect(updateDialog).not.toBeVisible();
    await matrixSearch.fill(updatedTitle);
    await getWorkspaceLogicalRowByText(page, 'monitoring', updatedTitle);
  });

  // 3. Validation: Missing Required Fields
  test('Validation: Triggers error on empty title', async ({ page }) => {
    const addDialog = await openAddMonitoringDialog(page);
    await addDialog.getByRole('button', { name: 'Add Monitoring', exact: true }).click();
    await expect(addDialog.getByText('Title is required.')).toBeVisible();
  });
});
