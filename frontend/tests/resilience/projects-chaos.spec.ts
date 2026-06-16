import { expect } from '@playwright/test';
import { test } from '../helpers/sysgrid-test';
import { 
  resetBrowserState, 
  createProject,
  clickResilientButton,
  waitForAppIdle
} from '../helpers/sysgrid';

test('Projects task update resilience: Network Stall + Rapid Interaction', async ({ page, sysApi: request, chaos, interactionChaos, networkChaos }) => {
  await resetBrowserState(page);
  
  const project = await createProject(request, {
    name: `PW-CHAOS-PROJ-${Date.now()}`,
    type: 'Strategic',
    status: 'Planning',
    priority: 'Medium',
    tasks: [{ name: 'Chaos Task 1', status: 'To Do' }]
  });

  await page.goto(`/projects?id=${project.id}`);
  await waitForAppIdle(page);
  
  // Switch to Gantt tab
  await page.getByText('Precision Gantt').click();
  await waitForAppIdle(page);
  
  // Find a task row using the task name span
  const taskRow = page.locator('[data-testid^="task-name-"]').first();
  await taskRow.click({ force: true });
  
  // 1. Stall the update request for 2 seconds
  await networkChaos.enable();
  await interactionChaos.enable();
  await networkChaos.stallRequest('/api/v1/projects', 2000); // Projects edit API
  
  // 2. Rapid-fire save clicks
  const saveBtn = page.getByTestId('project-commit-btn');
  await interactionChaos.rapidFireClick(saveBtn, 3);
  
  // Verify UI handles the stall
  // await expect(saveBtn).toBeDisabled(); 
  
  // 3. Disable chaos
  await networkChaos.disable();
  await interactionChaos.disable();
  
  // 4. Verify consistency
  await expect(page.getByText('Edit Task')).not.toBeVisible({ timeout: 10000 });
});
