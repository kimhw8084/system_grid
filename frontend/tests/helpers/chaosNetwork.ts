import { Page } from '@playwright/test';
import { ChaosTool } from './chaosController';

/**
 * NetworkChaos: Implements tools to simulate unstable network conditions.
 */
export class NetworkChaos implements ChaosTool {
  name = 'network-chaos';
  enabled = false;
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
    this.page.unroute('**/*');
  }

  /**
   * stallRequest: Injects artificial latency into specific API requests.
   */
  async stallRequest(endpointPattern: string, durationMs: number): Promise<void> {
    if (!this.enabled) return;
    await this.page.route(`**/*${endpointPattern}*`, async (route) => {
      await new Promise(resolve => setTimeout(resolve, durationMs));
      await route.continue();
    });
  }

  /**
   * interruptRequest: Aborts the fetch request mid-stream.
   */
  async interruptRequest(endpointPattern: string): Promise<void> {
    if (!this.enabled) return;
    await this.page.route(`**/*${endpointPattern}*`, async (route) => {
      await route.abort('failed');
    });
  }

  /**
   * fluctuateStatus: Forces server errors (e.g., 500, 503) for testing error boundaries.
   */
  async fluctuateStatus(endpointPattern: string, status: number = 500): Promise<void> {
    if (!this.enabled) return;
    await this.page.route(`**/*${endpointPattern}*`, async (route) => {
      await route.fulfill({ status });
    });
  }
}
