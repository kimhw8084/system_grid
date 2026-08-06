import { test as base } from '@playwright/test';
import { ChaosController } from './chaosController.ts';
import { InteractionChaos } from './chaosInteractions.ts';
import { NetworkChaos } from './chaosNetwork.ts';
import { StateChaos } from './chaosState.ts';
import { resolveTestApiUrl, selectAndVerifyTestTenant, testApiHeaders, testTenantId, testUserId } from './sysgrid.ts';

// Extend the base test to include a globally pre-configured API client and ChaosController
export const test = base.extend<{ 
  chaos: ChaosController, 
  interactionChaos: InteractionChaos, 
  networkChaos: NetworkChaos,
  stateChaos: StateChaos,
  sysApi: any,
  canonicalTenantGuard: void
}>({
  chaos: async ({}, use) => {
    const controller = new ChaosController();
    await use(controller);
    // Cleanup chaos state after each test
    controller.killAll();
  },
  interactionChaos: async ({ page, chaos }, use) => {
    const interactionTool = new InteractionChaos(page);
    chaos.register(interactionTool);
    await use(interactionTool);
  },
  networkChaos: async ({ page, chaos }, use) => {
    const networkTool = new NetworkChaos(page);
    chaos.register(networkTool);
    await use(networkTool);
  },
  stateChaos: async ({ page, chaos }, use) => {
    const stateTool = new StateChaos(page);
    chaos.register(stateTool);
    await use(stateTool);
  },
  canonicalTenantGuard: [async ({ playwright }, use) => {
    const request = await playwright.request.newContext({
      extraHTTPHeaders: { 'X-User-Id': testUserId, 'X-Tenant-Id': testTenantId },
    });
    try {
      await selectAndVerifyTestTenant(request, testTenantId, testUserId);
      await use();
    } finally {
      try {
        await selectAndVerifyTestTenant(request, testTenantId, testUserId);
      } finally {
        await request.dispose();
      }
    }
  }, { auto: true }],
  sysApi: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({ extraHTTPHeaders: testApiHeaders });
    // We wrap the raw Playwright request with our deterministic headers
    // ensuring no test ever forgets the tenant or user context.
    const customRequest = {
      post: async (path: string, options?: any) => {
        return request.post(resolveTestApiUrl(path), {
          ...options,
          headers: {
            ...testApiHeaders,
            ...options?.headers
          }
        });
      },
      get: async (path: string, options?: any) => {
        return request.get(resolveTestApiUrl(path), {
          ...options,
          headers: {
            ...testApiHeaders,
            ...options?.headers
          }
        });
      },
      patch: async (path: string, options?: any) => {
        return request.patch(resolveTestApiUrl(path), {
          ...options,
          headers: {
            ...testApiHeaders,
            ...options?.headers
          }
        });
      },
      delete: async (path: string, options?: any) => {
        return request.delete(resolveTestApiUrl(path), {
          ...options,
          headers: {
            ...testApiHeaders,
            ...options?.headers
          }
        });
      },
      put: async (path: string, options?: any) => {
        return request.put(resolveTestApiUrl(path), {
          ...options,
          headers: {
            ...testApiHeaders,
            ...options?.headers
          }
        });
      }
    };
    await use(customRequest as any);
    await request.dispose();
  }
});
