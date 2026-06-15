import { clickResilientButton } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';
import { createInvestigation, resetBrowserState } from './helpers/sysgrid'

test.describe('Research workflows', () => {
  test('filters by real years and rejects blank intelligence pulses', async ({ page, sysApi: request }) => {
    await resetBrowserState(page)
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const research2037 = await createInvestigation(request, {
      title: `PW-RESEARCH-A-${stamp}`,
      status: 'ANALYZING',
      priority: 'HIGH',
      systems: [`PW-SYS-A-${stamp}`],
      initiation_at: '2037-02-03T04:05:00'
    })

    await createInvestigation(request, {
      title: `PW-RESEARCH-B-${stamp}`,
      status: 'OPEN',
      priority: 'LOW',
      systems: [`PW-SYS-B-${stamp}`],
      initiation_at: '2038-06-07T08:09:00'
    })

    await page.goto('/research')
    await expect(page.getByRole('button', { name: '2037' })).toBeVisible()
    await expect(page.getByRole('button', { name: '2038' })).toBeVisible()

    await clickResilientButton(page, '2037')
    await page.getByPlaceholder('SCAN RESEARCH...').fill(research2037.title)
    await expect(page.getByText(research2037.title)).toBeVisible()

    await page.getByTitle('Inspect Record').first().click()
    await clickResilientButton(page, 'INTELLIGENCE STREAM')
    await clickResilientButton(page, /Record Intelligence/i)
    await expect(page.getByRole('paragraph').filter({ hasText: 'Intelligence pulse text is required' })).toBeVisible()
  })
})
