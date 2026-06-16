import { expect } from '@playwright/test';
import { test } from '../helpers/sysgrid-test';
import { 
  resetBrowserState, 
  seedOperationalScenario, 
  getPrimaryGrid
} from '../helpers/sysgrid';

test('Monitoring bulk action resilience: Network Stall + Rapid Interaction', async ({ page, sysApi: request, chaos, interactionChaos, networkChaos }) => {
  await resetBrowserState(page);
  await seedOperationalScenario(request);

  await page.goto('/monitoring');
  
  const grid = getPrimaryGrid(page);
  // Assume first row is interactive
  const firstRow = grid.locator('.ag-row').first();
  await firstRow.click();
  
  const bulkDeleteBtn = page.getByRole('button', { name: /Bulk Delete/i });
  
  // 1. Stall the delete request
  await networkChaos.enable();
  await interactionChaos.enable();
  await networkChaos.stallRequest('/api/v1/monitoring', 2000);
  
  // 2. Rapid-fire bulk delete
  await interactionChaos.rapidFireClick(bulkDeleteBtn, 3);
  
  // Verify UI handles the stall
  await expect(bulkDeleteBtn).toBeDisabled(); 
  
  // 3. Disable chaos
  await networkChaos.disable();
  await interactionChaos.disable();
  
  // 4. Verify consistency
  // Assuming it should be removed or reflect deleted status
});
