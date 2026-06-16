import { Page } from '@playwright/test';
import { ChaosTool } from './chaosController';

/**
 * StateChaos: Implements tools to simulate component unmounting during async operations.
 */
export class StateChaos implements ChaosTool {
  name = 'state-chaos';
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
  }

  /**
   * navKill: Navigates away mid-request.
   */
  async navKill(targetPath: string): Promise<void> {
    if (!this.enabled) return;
    await this.page.goto(targetPath);
  }

  /**
   * unmountTarget: Navigates to a dummy route to unmount the target component.
   */
  async unmountTarget(): Promise<void> {
    if (!this.enabled) return;
    // Navigating to a non-existent or blank route forces React to unmount components in the current view
    await this.page.goto('/about:blank'); 
  }
}
