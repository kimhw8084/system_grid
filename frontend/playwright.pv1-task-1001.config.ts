import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'projects-out40-slice-h-gantt-modernization.spec.ts',
  testIgnore: [],
  grep: /P12 dedicated task-1001 virtualization regression evidence/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1920, height: 1080 },
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
})
