import { expect, test } from '@playwright/test'
import { clickResilientButton } from '../helpers/sysgrid'

test.describe('clickResilientButton browser contract', () => {
  test('reacquires a stable replacement after detach/remount', async ({ page }) => {
    await page.setContent(`
      <style>@keyframes move { from { transform: translateX(0) } to { transform: translateX(12px) } }</style>
      <button id="target" style="animation: move 40ms linear infinite">Save Monitoring</button>
      <script>
        window.clicked = '';
        setTimeout(() => {
          const replacement = document.createElement('button');
          replacement.textContent = 'Save Monitoring';
          replacement.addEventListener('click', () => { window.clicked = 'replacement'; });
          document.querySelector('#target').replaceWith(replacement);
        }, 120);
      </script>
    `)

    await clickResilientButton(page, 'Save Monitoring')
    await expect.poll(() => page.evaluate(() => (window as any).clicked)).toBe('replacement')
  })

  test('waits for a temporarily disabled button to become enabled', async ({ page }) => {
    await page.setContent(`
      <button id="target" disabled>Confirm Action</button>
      <script>
        window.clicked = false;
        const target = document.querySelector('#target');
        target.addEventListener('click', () => { window.clicked = true; });
        setTimeout(() => { target.disabled = false; }, 180);
      </script>
    `)

    await clickResilientButton(page, 'Confirm Action')
    await expect.poll(() => page.evaluate(() => (window as any).clicked)).toBe(true)
  })

  test('prefers the topmost interactable dialog over an exiting dialog and page button', async ({ page }) => {
    await page.setContent(`
      <button id="page-button">Apply</button>
      <div role="dialog" id="exiting" style="position: fixed; z-index: 3500; opacity: 0.01; pointer-events: none">
        <button id="old-button">Apply</button>
      </div>
      <div role="dialog" id="active" style="position: fixed; z-index: 3500; opacity: 1">
        <button id="active-button">Apply</button>
      </div>
      <script>
        window.clicked = '';
        document.querySelector('#page-button').addEventListener('click', () => { window.clicked = 'page'; });
        document.querySelector('#old-button').addEventListener('click', () => { window.clicked = 'old'; });
        document.querySelector('#active-button').addEventListener('click', () => { window.clicked = 'active'; });
      </script>
    `)

    await clickResilientButton(page, 'Apply')
    await expect.poll(() => page.evaluate(() => (window as any).clicked)).toBe('active')
  })

  test('waits for a disabled button in the newest dialog instead of clicking an older dialog', async ({ page }) => {
    await page.setContent(`
      <div role="dialog" id="old-dialog" style="position: fixed; z-index: 3500; opacity: 1">
        <button id="old-button">Save</button>
      </div>
      <div role="dialog" id="new-dialog" style="position: fixed; z-index: 3500; opacity: 1">
        <button id="new-button" disabled>Save</button>
      </div>
      <script>
        window.clicked = '';
        document.querySelector('#old-button').addEventListener('click', () => { window.clicked = 'old'; });
        const next = document.querySelector('#new-button');
        next.addEventListener('click', () => { window.clicked = 'new'; });
        setTimeout(() => { next.disabled = false; }, 180);
      </script>
    `)

    await clickResilientButton(page, 'Save')
    await expect.poll(() => page.evaluate(() => (window as any).clicked)).toBe('new')
  })

  test('prefers a nested higher interaction layer inside the active dialog', async ({ page }) => {
    await page.setContent(`
      <div role="dialog" style="position: fixed; z-index: 3500; opacity: 1">
        <button id="underlying">Close</button>
        <div id="confirm" style="position: absolute; z-index: 3600; opacity: 1">
          <button id="confirm-close">Close</button>
        </div>
      </div>
      <script>
        window.clicked = '';
        document.querySelector('#underlying').addEventListener('click', () => { window.clicked = 'underlying'; });
        document.querySelector('#confirm-close').addEventListener('click', () => { window.clicked = 'confirm'; });
      </script>
    `)

    await clickResilientButton(page, 'Close')
    await expect.poll(() => page.evaluate(() => (window as any).clicked)).toBe('confirm')
  })

  test('rejects genuine ambiguity inside the active scope', async ({ page }) => {
    await page.setContent(`
      <div role="dialog" style="position: fixed; z-index: 3500; opacity: 1">
        <button>Continue</button>
        <button>Continue</button>
      </div>
    `)

    await expect(clickResilientButton(page, 'Continue')).rejects.toThrow(/Ambiguous button Continue/)
  })

  test('preserves non-modal page button behavior', async ({ page }) => {
    await page.setContent(`
      <button id="target">Refresh</button>
      <script>
        window.clicked = false;
        document.querySelector('#target').addEventListener('click', () => { window.clicked = true; });
      </script>
    `)

    await clickResilientButton(page, 'Refresh')
    await expect.poll(() => page.evaluate(() => (window as any).clicked)).toBe(true)
  })

  test('delegates descendant pointer-event overrides to native Playwright actionability', async ({ page }) => {
    await page.setContent(`
      <div style="pointer-events: none">
        <button id="target" style="pointer-events: auto">History</button>
      </div>
      <script>
        window.clicked = false;
        document.querySelector('#target').addEventListener('click', () => { window.clicked = true; });
      </script>
    `)

    await clickResilientButton(page, 'History')
    await expect.poll(() => page.evaluate(() => (window as any).clicked)).toBe(true)
  })

  test('retries native actionability after a temporary overlay stops intercepting the button', async ({ page }) => {
    await page.setContent(`
      <button id="target">Deploy</button>
      <div id="overlay" style="position: fixed; inset: 0; z-index: 9999; background: transparent"></div>
      <script>
        window.clicked = false;
        document.querySelector('#target').addEventListener('click', () => { window.clicked = true; });
        setTimeout(() => document.querySelector('#overlay').remove(), 1350);
      </script>
    `)

    await clickResilientButton(page, 'Deploy')
    await expect.poll(() => page.evaluate(() => (window as any).clicked)).toBe(true)
  })

})
