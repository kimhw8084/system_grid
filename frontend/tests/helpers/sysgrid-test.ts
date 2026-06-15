import { test as base } from '@playwright/test';

// Extend the base test to include a globally pre-configured API client
export const test = base.extend({
  sysApi: async ({ request, baseURL }, use) => {
    // We wrap the raw Playwright request with our deterministic headers
    // ensuring no test ever forgets the tenant or user context.
    const customRequest = {
      post: async (path: string, options?: any) => {
        return request.post(path, {
          ...options,
          headers: {
            'X-User-Id': 'admin_root',
            'X-Tenant-Id': '1',
            ...options?.headers
          }
        });
      },
      get: async (path: string, options?: any) => {
        return request.get(path, {
          ...options,
          headers: {
            'X-User-Id': 'admin_root',
            'X-Tenant-Id': '1',
            ...options?.headers
          }
        });
      },
      patch: async (path: string, options?: any) => {
        return request.patch(path, {
          ...options,
          headers: {
            'X-User-Id': 'admin_root',
            'X-Tenant-Id': '1',
            ...options?.headers
          }
        });
      },
      delete: async (path: string, options?: any) => {
        return request.delete(path, {
          ...options,
          headers: {
            'X-User-Id': 'admin_root',
            'X-Tenant-Id': '1',
            ...options?.headers
          }
        });
      },
      put: async (path: string, options?: any) => {
        return request.put(path, {
          ...options,
          headers: {
            'X-User-Id': 'admin_root',
            'X-Tenant-Id': '1',
            ...options?.headers
          }
        });
      }
    };
    await use(customRequest as any);
  }
});
