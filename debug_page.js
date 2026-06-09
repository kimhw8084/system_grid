import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4173/settings');
  await page.waitForTimeout(2000); // Wait for animations
  const content = await page.content();
  console.log(content);
  await browser.close();
})();
