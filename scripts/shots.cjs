// Captures README screenshots (phone viewport, 2x). Run with `vite preview --port 4173` already running.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 })).newPage();
  const out = 'docs/screenshots';
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
  const click = (t) => page.getByText(t, { exact: false }).first().click();
  await page.goto('http://localhost:4173/');
  await shot('1-title');
  await click('New career');
  await shot('2-countries');
  await page.locator('.country-card', { hasText: 'Japan' }).click();
  await click('Choose difficulty'); await click('Choose your party'); await click('Take office');
  const adv = async (n) => {
    for (let i = 0; i < n; i++) {
      const btn = page.locator('.advance .btn');
      if (await btn.isDisabled()) break;
      await btn.click();
      await page.getByText('Briefing').first().waitFor({ timeout: 3000 });
      await page.locator('.sheet .btn', { hasText: 'Continue' }).click();
      for (let k = 0; k < 5; k++) {
        if (await page.getByText('Form a government').count()) {
          const f = page.locator('.sheet .btn', { hasText: /Form (minority )?government/ });
          if (await f.isEnabled()) await f.click(); else await page.getByText('Go into opposition').click();
          await page.waitForTimeout(200);
        } else if (await page.locator('.choice').count()) {
          await page.locator('.choice').first().click(); await page.getByText('Outcome').first().waitFor();
          await page.locator('.sheet .btn', { hasText: 'Continue' }).click();
        } else if (await page.getByText('Election night').count()) {
          await page.locator('.sheet .btn', { hasText: 'Continue' }).click();
        } else break;
      }
    }
  };
  await adv(14);
  await page.locator('.nav button', { hasText: 'Home' }).click(); await shot('3-overview');
  await page.locator('.nav button', { hasText: 'Economy' }).click(); await shot('4-economy');
  await page.locator('.nav button', { hasText: 'World' }).click(); await shot('5-world');
  await page.locator('.nav button', { hasText: 'Menu' }).click(); await shot('6-menu');
  await page.locator('.menu-card .mc-main', { hasText: 'Parliament' }).click(); await shot('7-parliament');
  await page.locator('.nav button', { hasText: 'Menu' }).click();
  await page.locator('.menu-card .mc-main', { hasText: 'Projects' }).click(); await shot('8-projects');
  await b.close();
})();
