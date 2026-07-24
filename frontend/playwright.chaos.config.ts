import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config'

export default defineConfig({
  ...baseConfig,
  testMatch: [
    /(^|[\/])resilience[\/].*\.spec\.ts$/,
    /universal-crawler\.spec\.ts$/,
  ],
  timeout: 900_000,
  outputDir: 'test-results-chaos',
})
