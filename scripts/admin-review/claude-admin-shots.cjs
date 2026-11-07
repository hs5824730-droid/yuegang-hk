// Admin screenshots against the isolated fixture API (no real data, writes stay in memory).
const { chromium } = require('@playwright/test');
const { setup } = require('./fixture.cjs');
const fs = require('node:fs');
const out = process.argv[2] || 'data/design-review';
const prefix = process.argv[3] || 'admin';
const widths = (process.argv[4] || '390,1280').split(',').map(Number);
const langs = (process.argv[5] || 'zh').split(',');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' });
  const log = [];
  for (const w of widths)
    for (const lang of langs) {
      const c = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 }, hasTouch: w < 500, reducedMotion: 'reduce' });
      await c.addInitScript((l) => localStorage.setItem('lang', l), lang);
      const mock = await setup(c);
      const p = await c.newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      mock.setLogged(false);
      await p.goto('http://127.0.0.1:5173/admin');
      await p.waitForTimeout(600);
      await p.screenshot({ path: `${out}/${prefix}-login-${lang}-${w}.png`, fullPage: true });
      mock.setLogged(true);
      for (const tab of ['overview', 'leads', 'properties', 'team', 'reception']) {
        await p.goto('http://127.0.0.1:5173/admin' + (tab === 'overview' ? '' : '/' + tab));
        await p.locator('.admin-body').waitFor();
        await p.waitForTimeout(400);
        await p.screenshot({ path: `${out}/${prefix}-${tab}-${lang}-${w}.png`, fullPage: true });
        log.push({ w, lang, tab, overflow: await p.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
        if (tab === 'leads') {
          const open = p.locator('.lead-table tbody tr button, .lead-card button, [data-lead] button').first();
          if (await open.count()) {
            await open.click();
            await p.waitForTimeout(400);
            await p.screenshot({ path: `${out}/${prefix}-lead-detail-${lang}-${w}.png` });
            await p.keyboard.press('Escape');
          }
        }
      }
      log.push({ w, lang, errs, writes: mock.writes.length });
      await c.close();
    }
  console.log(JSON.stringify(log));
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
