import { defineConfig } from '@playwright/test'
import releaseConfig from './playwright.release.config'

export default defineConfig({
  ...releaseConfig,
  testDir: './audit',
  testMatch: /monitoring-master-goldenization\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['./llm-reporter.ts']],
  outputDir: process.env.SYSGRID_GOLDEN_AUDIT_PLAYWRIGHT_OUTPUT || 'test-results-goldenization',
  use: {
    ...(releaseConfig.use || {}),
    viewport: { width: 1920, height: 1080 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
})
