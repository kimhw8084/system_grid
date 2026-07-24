import { expect } from '@playwright/test'
import { test } from './helpers/sysgrid-test'
import { resetBrowserState, waitForAppIdle } from './helpers/sysgrid'

test.describe('Universal View Resilience Crawler (Automated Chaos)', () => {
  test('Automatically crawls all canonical views and injects bounded chaos @chaos', async ({ page, chaos, interactionChaos, networkChaos }) => {
    test.setTimeout(900_000)

    const routeFailures: string[] = []
    const runtimeErrors: string[] = []

    await chaos.enable('interaction-chaos')
    await chaos.enable('network-chaos')
    await networkChaos.stallRequest('/api/v1', 500)

    try {
      await resetBrowserState(page)

      page.on('pageerror', (error) => runtimeErrors.push(error.message))
      page.on('response', (response) => {
        if (response.status() >= 500 && response.url().includes('/api/')) {
          runtimeErrors.push(`API ${response.status()} on ${response.url()}`)
        }
      })

      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 })
      await waitForAppIdle(page)

      const navLinks = await page.locator('a[href^="/"]').evaluateAll((links) => {
        const routes = links
          .map((link) => link.getAttribute('href'))
          .filter((href): href is string => Boolean(href && href.length > 1 && !href.startsWith('http')))
          .map((href) => {
            const url = new URL(href, window.location.origin)
            return url.pathname
          })
        return Array.from(new Set(routes)).sort()
      })

      expect(navLinks.length).toBeGreaterThan(0)
      console.log(`[Auto-Crawler] Discovered ${navLinks.length} canonical views to validate.`)

      for (const route of navLinks) {
        console.log(`[Auto-Crawler] Testing canonical view: ${route}`)
        runtimeErrors.length = 0

        if (page.isClosed()) {
          routeFailures.push(`${route}: page closed before navigation`)
          break
        }

        try {
          await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 })
          await waitForAppIdle(page)

          const mainBody = page.locator('main, #root, #app-root').first()
          await expect(mainBody).toBeVisible({ timeout: 15_000 })

          const safeButtons = page
            .locator('button:not([disabled])')
            .filter({ hasNotText: /close|delete|remove|archive|purge|logout|exit|restore|revert/i })
          const buttonCount = await safeButtons.count()
          if (buttonCount > 0) {
            const button = safeButtons.first()
            if (await button.isVisible()) await interactionChaos.rapidFireClick(button, 1)
          }

          if (runtimeErrors.length > 0) {
            routeFailures.push(`${route}: ${runtimeErrors.join(' | ')}`)
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          routeFailures.push(`${route}: ${message}`)
        }
      }
    } finally {
      await chaos.killAll()
    }

    expect(routeFailures, routeFailures.join('\n')).toEqual([])
  })
})
