import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config'

export default defineConfig({
  ...baseConfig,
  grep: /evidence capture|lock-proof evidence|acceptance cleanup/i,
  timeout: 900_000,
  outputDir: 'test-results-evidence',
})
