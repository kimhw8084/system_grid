import { Page } from '@playwright/test';
import { BaseView } from './BaseView';

export class SettingsView extends BaseView {
  constructor(page: Page) {
    super(page);
  }
}
