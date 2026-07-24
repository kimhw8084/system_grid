import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config'

export default defineConfig({
  ...baseConfig,
  testIgnore: [
    /(^|[\/])resilience[\/].*\.spec\.ts$/,
    /universal-crawler\.spec\.ts$/,
  ],
  grepInvert: /evidence capture|lock-proof evidence|acceptance cleanup/i,
  outputDir: 'test-results-release',
})
