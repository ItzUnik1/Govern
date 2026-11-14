// Browser end-to-end test (Playwright, phone viewport). Run with the preview server on :4173.
const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const click = async (t, opt = {}) => { await page.getByText(t, { exact: opt.exact ?? false }).first().click(); };
  const must = (cond, msg) => { if (!cond) { errors.push('ASSERT: ' + msg); console.log('FAIL', msg); } else console.log('ok  ', msg); };

  await page.goto('http://localhost:4173/');
  await shot('01-title');
  await click('New career');
  must(await page.getByText('Nepal').first().isVisible(), 'country list shows Nepal');
  must((await page.locator('.country-card').count()) === 8, '8 countries listed');
  await shot('02-select');
  await page.locator('.country-card', { hasText: 'Germany' }).click();
  await shot('03-detail');
  await click('Choose difficulty');
  await click('Take office');
  must(await page.getByText('Chancellor').first().isVisible(), 'Germany leader title Chancellor');
  await shot('04-overview');

  // navigate all tabs
  for (const [label, check] of [['Economy', 'Indicators'], ['Government', 'Budget forecast'], ['Politics', 'Election outlook'], ['More', 'Save / Load'], ['Overview', 'Advance to']]) {
    await page.locator('.nav button', { hasText: label }).click();
    must(await page.getByText(check).first().isVisible(), `tab ${label} renders (${check})`);
  }
  await page.locator('.nav button', { hasText: 'Economy' }).click();
  await click('Trends'); await shot('05-trends-empty');
  await click('Public finances'); await shot('06-finances');

  // change a policy
  await page.locator('.nav button', { hasText: 'Government' }).click();
  const before = await page.locator('.card', { hasText: 'Budget forecast' }).innerText();
  const slider = page.locator('input[type=range]').first();
  await slider.fill('40');
  const after = await page.locator('.card', { hasText: 'Budget forecast' }).innerText();
  must(before !== after, 'changing income tax changes the budget forecast');
  await shot('07-budget');
  await click('Policies'); await click('Enact'); must(await page.getByText('Enacted').first().isVisible(), 'policy can be enacted');
  await click('Actions'); await shot('08-actions');
  await click('Do it'); 

  // play 30 months, resolving events
  await page.locator('.nav button', { hasText: 'Overview' }).click();
  let months = 0, events = 0, elections = 0;
  for (let i = 0; i < 60; i++) {
    const adv = page.locator('.advance .btn');
    if (await page.getByText('Forced out').count() || await page.getByText('Defeated').count()) break;
    if (await adv.isDisabled()) break;
    await adv.click(); months++;
    // briefing
    await page.getByText('Briefing').first().waitFor({ timeout: 3000 });
    if (i === 0) await shot('09-briefing');
    await page.locator('.sheet .btn', { hasText: 'Continue' }).click();
    for (let k = 0; k < 4; k++) {
      if (await page.locator('.choice').count()) {
        events++;
        if (events === 1) await shot('10-event');
        await page.locator('.choice').first().click();
        await page.getByText('Outcome').first().waitFor();
        if (events === 1) await shot('11-outcome');
        await page.locator('.sheet .btn', { hasText: 'Continue' }).click();
      } else if (await page.getByText('Election night').count()) {
        elections++; await shot('12-election');
        await page.locator('.sheet .btn', { hasText: 'Continue' }).click();
      } else break;
    }
    if (await page.getByText('New career').count()) { await shot('13-gameover'); break; }
  }
  console.log('played months', months, 'events', events, 'elections', elections);
  must(months >= 20 || elections > 0, 'played many months or reached election/game over');
  must(events > 0, 'at least one event appeared');

  // save / load / delete
  if (!(await page.getByText('Take office').count()) && !(await page.getByText('New career').count())) {
    await page.locator('.nav button', { hasText: 'Overview' }).click();
    const dateBefore = await page.locator('.topbar .t2').innerText();
    await page.locator('.nav button', { hasText: 'More' }).click();
    await click('Save / Load');
    await page.locator('.card', { hasText: 'Slot 2' }).getByText('Save here').click();
    must(await page.locator('.card', { hasText: 'Slot 2' }).getByText('Overwrite').isVisible(), 'saved into slot 2');
    await shot('14-saveload');
    await page.reload();
    await shot('15-after-reload');
    must(await page.getByText('Continue –').first().isVisible(), 'autosave offered after reload (persistence)');
    await click('Load game');
    await page.locator('.country-card', { hasText: 'Slot 2' }).click();
    must((await page.locator('.topbar .t2').innerText()) === dateBefore, 'loaded slot restores date ' + dateBefore);
    await page.locator('.nav button', { hasText: 'More' }).click(); await click('Save / Load');
    await page.locator('.card', { hasText: 'Slot 2' }).getByText('Delete').click();
    await shot('16-confirm-delete');
    await page.locator('.sheet .btn', { hasText: 'Confirm' }).click();
    must(await page.locator('.card', { hasText: 'Slot 2' }).getByText('Empty').isVisible(), 'slot deleted after confirmation');
  }
  console.log('ERRORS:', JSON.stringify(errors, null, 1));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
