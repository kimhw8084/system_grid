import { Page, expect, Locator } from '@playwright/test';

export class BaseView {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForAppIdle() {
    const loaders = ['Scanning monitoring matrix...', 'Synchronizing Matrix...', 'Loading...'];
    for (const loader of loaders) {
      await this.page.getByText(loader).waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }

  async getToast() {
    return this.page.locator('.go3958317564'); // Standard toast selector
  }
}
