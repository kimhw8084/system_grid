import { Page, expect } from '@playwright/test';
import { BaseView } from './BaseView';

export class AuditLogsView extends BaseView {
  constructor(page: Page) {
    super(page);
  }
}
