import { defineConfig } from '@playwright/test'

const canonicalGate = process.env.SYSGRID_CANONICAL_GATE === '1'
const normalize = (value: string) => value.replace(/\/$/, '')
const baseURL = normalize(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173')
const apiBase = normalize(process.env.PW_API_BASE || 'http://127.0.0.1:8000/api/v1')

if (canonicalGate) {
  const expectedFrontend = process.env.SYSGRID_EXPECTED_FRONTEND_ORIGIN
  const expectedApi = process.env.SYSGRID_EXPECTED_API_BASE
  if (!process.env.PLAYWRIGHT_BASE_URL || !process.env.PW_API_BASE || !expectedFrontend || !expectedApi) {
    throw new Error('Canonical SysGrid gate requires explicit frontend and API runtime bindings')
  }
  if (baseURL !== normalize(expectedFrontend) || apiBase !== normalize(expectedApi)) {
    throw new Error(`Canonical SysGrid runtime mismatch: frontend=${baseURL} api=${apiBase}`)
  }
}

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }], ['./llm-reporter.ts']],
  workers: 1,
  metadata: { canonicalGate, frontendOrigin: baseURL, apiBase },
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    extraHTTPHeaders: { 'X-User-Id': process.env.USER_ID || 'haewon.kim' }
  }
})
