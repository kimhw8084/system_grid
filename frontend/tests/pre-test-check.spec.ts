import { expect, test } from '@playwright/test';

test('verify backend and frontend are up', async ({ request }) => {
  // Check backend
  const backendResponse = await request.get('http://127.0.0.1:8000/api/v1/health');
  expect(backendResponse.status()).toBe(200);
  
  // Check frontend (just by fetching the root)
  const frontendResponse = await request.get('http://127.0.0.1:5173/');
  expect(frontendResponse.status()).toBe(200);
});
