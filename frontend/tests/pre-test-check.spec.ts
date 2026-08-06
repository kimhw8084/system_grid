import { expect, test } from '@playwright/test';
import { testApiBase, testFrontendOrigin } from './helpers/sysgrid';

test('verify backend and frontend are up', async ({ request }) => {
  // Check backend
  const backendResponse = await request.get(`${testApiBase}/health`);
  expect(backendResponse.status()).toBe(200);
  
  // Check frontend (just by fetching the root)
  const frontendResponse = await request.get(testFrontendOrigin);
  expect(frontendResponse.status()).toBe(200);
});
