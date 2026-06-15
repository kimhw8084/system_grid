import { Page } from '@playwright/test';
import { BaseView } from './BaseView';

export class AssetView extends BaseView {
  constructor(page: Page) {
    super(page);
  }
}
