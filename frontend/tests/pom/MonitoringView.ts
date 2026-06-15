import { Page, expect, Locator } from '@playwright/test';
import { BaseView } from './BaseView';

export class MonitoringView extends BaseView {
  constructor(page: Page) {
    super(page);
  }

  async search(term: string) {
    await this.page.getByPlaceholder('Scan matrix...').fill(term);
    await this.page.keyboard.press('Enter');
    await this.waitForAppIdle();
  }

  async openItem(title: string) {
    await this.page.getByText(title).first().click();
  }

  async getModal() {
    return this.page.locator('[role="dialog"]').first();
  }

  async clickShareLink() {
    await this.getModal().getByTitle('Share direct link').click();
  }

  async getMonitorTitle() {
    return this.getModal().locator('h2'); 
  }

  async openRecovery() {
      await this.getModal().getByRole('button', { name: /Recovery/i }).click();
  }
}
