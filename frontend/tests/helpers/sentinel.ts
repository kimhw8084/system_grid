import { expect, type Page } from '@playwright/test'

const KNOWN_BENIGN_BROWSER_DIAGNOSTICS = new Set([
  'ResizeObserver loop completed with undelivered notifications.',
])

export type StrictAppMonitoring = { failures: string[]; diagnostics: string[] }

function isKnownBenignBrowserDiagnostic(message: string) {
  return KNOWN_BENIGN_BROWSER_DIAGNOSTICS.has(message.trim())
}

export function installStrictAppMonitoring(page: Page) {
  const monitoring: StrictAppMonitoring = { failures: [], diagnostics: [] }

  const recordKnownDiagnostic = (source: 'console.error' | 'pageerror', message: string) => {
    const diagnostic = `${source}: ${message.trim()}`
    monitoring.diagnostics.push(diagnostic)
    console.info(`[known-browser-diagnostic] ${diagnostic}`)
  }

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      if (isKnownBenignBrowserDiagnostic(msg.text())) {
        recordKnownDiagnostic('console.error', msg.text())
        return
      }
      void Promise.all(
        msg.args().map(async (arg) => {
          try {
            return JSON.stringify(await arg.jsonValue())
          } catch {
            return null
          }
        }),
      ).then((serializedArgs) => {
        const details = serializedArgs.filter(Boolean).join(' | ')
        monitoring.failures.push(`console.error: ${msg.text()}${details ? ` :: args=${details}` : ''}`)
      })
    }
  })

  page.on('pageerror', (err) => {
    if (isKnownBenignBrowserDiagnostic(err.message)) {
      recordKnownDiagnostic('pageerror', err.message)
      return
    }
    monitoring.failures.push(`pageerror: ${err.message}`)
  })

  page.on('response', async (response) => {
    if (response.status() < 500 || !response.url().includes('/api/')) return
    let details = ''
    try {
      details = await response.text()
    } catch {
      details = ''
    }
    monitoring.failures.push(`api.${response.status()}: ${response.url()}${details ? ` :: ${details}` : ''}`)
  })

  return monitoring
}

export async function expectNoAppFailures(monitoring: StrictAppMonitoring, context: string) {
  expect(
    monitoring.failures,
    `${context} emitted app failures:\n${monitoring.failures.join('\n')}`,
  ).toEqual([])
}

export async function expectHealthyShell(page: Page) {
  await expect(page.locator('main')).toBeVisible()
  await expect(page.getByText('System Failure')).toHaveCount(0)
  await expect(page.getByText('Access Denied')).toHaveCount(0)
  await expect(page.getByText('The UI layer has encountered a fatal exception.')).toHaveCount(0)
}
