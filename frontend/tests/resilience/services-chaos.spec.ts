import { expect } from '@playwright/test';
import { test } from '../helpers/sysgrid-test';
import { 
  resetBrowserState, 
  waitForAppIdle
} from '../helpers/sysgrid';

test('Service registration resilience: Network Stall + Rapid Interaction', async ({ page, chaos, interactionChaos, networkChaos }) => {
  await resetBrowserState(page);

  await page.goto('/services');
  await waitForAppIdle(page);
  
  // 1. Open the registration modal
  const addBtn = page.getByRole('button', { name: /\+ Register Service/i });
  await addBtn.click();
  
  // Fill form - Playwright should find the input by placeholder
  await page.locator('input[placeholder="e.g. ERP DB Prod 01"]').fill('Chaos Service');
  
  // 2. Stall the registration request
  await networkChaos.enable();
  await interactionChaos.enable();
  await networkChaos.stallRequest('/api/v1/logical-services', 5000); 
  
  // 3. Simple click
  const saveBtn = page.getByRole('button', { name: /Commit/i });
  await saveBtn.click();
  
  // Verify UI handles the stall
  await expect(saveBtn).toBeDisabled(); 
  
  // 4. Disable chaos
  await networkChaos.disable();
  await interactionChaos.disable();
  
  // 5. Verify consistency
  // Modal should close upon successful commit
  await expect(page.getByRole('button', { name: /Commit/i })).not.toBeVisible({ timeout: 5000 });
});
