import { expect } from '@playwright/test';
import { test } from '../helpers/sysgrid-test';
import { 
  resetBrowserState, 
  waitForAppIdle
} from '../helpers/sysgrid';

test('DataFlow resilience: Stalling node interaction', async ({ page, chaos, interactionChaos, networkChaos }) => {
  await resetBrowserState(page);

  await page.goto('/architecture');
  await waitForAppIdle(page);
  
  // Locate a node in ReactFlow - DeviceNodes have 'glass-panel' class
  const node = page.locator('.glass-panel').first();
  await node.click();
  
  // 1. Stall the data-flow API
  await networkChaos.enable();
  await interactionChaos.enable();
  await networkChaos.stallRequest('/api/v1', 2000); 
  
  // 2. Rapid-fire interaction (e.g., trying to trigger a node update)
  await interactionChaos.rapidFireClick(node, 3);
  
  // Verify UI handles the stall (e.g., no crash, spinner)
  // DataFlow might have a global loader
  
  // 3. Disable chaos
  await networkChaos.disable();
  await interactionChaos.disable();
  
  // 4. Verify consistency
  // UI should be responsive and node still present
  await expect(node).toBeVisible();
});
