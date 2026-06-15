import { clickResilientButton } from './helpers/sysgrid';
import { expect } from '@playwright/test';
import { test } from './helpers/sysgrid-test';

test('debug settings reload', async ({ page }) => {
  await page.goto('/settings')
  await page.waitForTimeout(2000)
  
  console.log('CHANGING THEME TO LIGHT')
  await clickResilientButton(page, 'Light')
  await page.waitForTimeout(1000)
  
  console.log('RELOADING')
  await page.reload()
  await page.waitForTimeout(2000)
  
  const text = await page.textContent('body')
  console.log('PAGE TEXT AFTER RELOAD:', text)
  
  await expect(page.getByText('Infrastructure Domain')).toBeVisible()
})
