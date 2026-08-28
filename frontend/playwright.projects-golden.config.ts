import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config'

const candidateBaseURL = 'http://127.0.0.1:43177'

export default defineConfig({
  ...baseConfig,
  use: {
    ...(baseConfig.use ?? {}),
    baseURL: candidateBaseURL,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 43177 --strictPort',
    url: candidateBaseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
