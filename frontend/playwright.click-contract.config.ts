import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config'

export default defineConfig({
  ...baseConfig,
  testDir: './tests/resilience',
  testMatch: /click-resilient-button\.contract\.spec\.ts/,
  timeout: 20_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['./llm-reporter.ts']],
  outputDir: 'test-results-click-contract',
  use: {
    ...(baseConfig.use || {}),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
})
