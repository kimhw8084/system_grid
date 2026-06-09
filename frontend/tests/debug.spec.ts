import { expect, test } from '@playwright/test'

test('debug settings reload', async ({ page }) => {
  await page.goto('/settings')
  await page.waitForTimeout(2000)
  
  console.log('CHANGING THEME TO LIGHT')
  await page.getByRole('button', { name: /^Light$/ }).click()
  await page.waitForTimeout(1000)
  
  console.log('RELOADING')
  await page.reload()
  await page.waitForTimeout(2000)
  
  const text = await page.textContent('body')
  console.log('PAGE TEXT AFTER RELOAD:', text)
  
  await expect(page.getByText('Core Infrastructure')).toBeVisible()
})
