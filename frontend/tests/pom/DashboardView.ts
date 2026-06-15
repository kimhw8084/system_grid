import { Page, expect } from '@playwright/test';
import { BaseView } from './BaseView';

export class DashboardView extends BaseView {
  constructor(page: Page) {
    super(page);
  }

  async navigateToTab(tabName: string) {
    await this.page.getByText(tabName, { exact: false }).first().click();
    this.waitForAppIdle();
  }

  async verifyUrlTab(tabName: string, expectedPath: string) {
      await expect(this.page).toHaveURL(new RegExp(`${expectedPath}`));
  }
}
