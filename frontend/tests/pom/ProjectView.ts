import { Page } from '@playwright/test';
import { BaseView } from './BaseView';

export class ProjectView extends BaseView {
  constructor(page: Page) {
    super(page);
  }
}
