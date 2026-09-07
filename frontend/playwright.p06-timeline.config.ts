import { defineConfig } from '@playwright/test'

const proofDir = process.env.SYSGRID_P06_PROOF_DIR || 'test-results/p06-timeline'

export default defineConfig({
  testDir: './tests',
  testMatch: 'projects-p06-timeline.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['json', { outputFile: `${proofDir}/playwright-report.json` }]],
  outputDir: `${proofDir}/browser-artifacts`,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
})
