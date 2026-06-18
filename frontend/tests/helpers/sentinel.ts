import { expect, type Page } from '@playwright/test'

export function installStrictAppMonitoring(page: Page) {
  const failures: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
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
        failures.push(`console.error: ${msg.text()}${details ? ` :: args=${details}` : ''}`)
      })
    }
  })

  page.on('pageerror', (err) => {
    failures.push(`pageerror: ${err.message}`)
  })

  page.on('response', async (response) => {
    if (response.status() < 500 || !response.url().includes('/api/')) return
    let details = ''
    try {
      details = await response.text()
    } catch {
      details = ''
    }
    failures.push(`api.${response.status()}: ${response.url()}${details ? ` :: ${details}` : ''}`)
  })

  return failures
}

export async function expectNoAppFailures(failures: string[], context: string) {
  expect(
    failures,
    `${context} emitted app failures:\n${failures.join('\n')}`,
  ).toEqual([])
}

export async function expectHealthyShell(page: Page) {
  await expect(page.locator('main')).toBeVisible()
  await expect(page.getByText('System Failure')).toHaveCount(0)
  await expect(page.getByText('Access Denied')).toHaveCount(0)
  await expect(page.getByText('The UI layer has encountered a fatal exception.')).toHaveCount(0)
}
