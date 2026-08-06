import { expect } from '@playwright/test';
import { test } from '../helpers/sysgrid-test';
import { 
  resetBrowserState, 
  seedOperationalScenario, 
  createFarCause, 
  createFarMitigation
} from '../helpers/sysgrid';

test('FAR mitigation deletion resilience: Network Stall + Rapid Click', async ({ page, sysApi: request, chaos, interactionChaos, networkChaos }) => {
  page.on('pageerror', err => console.log(`UNHANDLED EXCEPTION: ${err}`));
  await resetBrowserState(page);
  const { far } = await seedOperationalScenario(request);
  
  const cause = await createFarCause(request, {
    cause_text: 'Transient dependency fault',
    occurrence_level: 4,
    responsible_team: 'Operations',
    mode_ids: [far.id],
  });
  
  await createFarMitigation(request, {
    mitigation_type: 'Monitoring',
    mitigation_steps: 'Watch the service and alert on regression',
    responsible_team: 'Operations',
    status: 'Not Started',
    cause_id: cause.id,
    mode_ids: [far.id],
  });

  await page.goto(`/far?id=${far.id}`);
  const roadmapTab = page.getByRole('button', { name: /Strategic Roadmap/i });
  await expect(roadmapTab).toBeVisible();
  await roadmapTab.click();
  
  const mitigationRow = page.locator('tr', { hasText: 'Watch the service' });
  const deleteBtn = mitigationRow.getByRole('button').first();

  // Setup Chaos
  await networkChaos.enable();
  await interactionChaos.enable();
  
  // 1. Stall the delete request for 1 second
  await networkChaos.stallRequest('/api/v1/far/mitigations', 1000);
  
  // 2. Click once
  await deleteBtn.click();
  
  // Verify UI handles the stall gracefully (e.g., showing a loading indicator)
  await expect(deleteBtn).toBeDisabled(); 
  
  // 3. Disable network chaos to allow eventual completion
  await networkChaos.disable();
  
  // 4. Verify mitigation is eventually deleted
  await expect(mitigationRow).not.toBeVisible({ timeout: 5000 });
});
