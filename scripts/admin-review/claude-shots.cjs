// Local screenshot helper for the Claude redesign review. Blocks enquiry and routing writes.
const { chromium } = require('@playwright/test');
const [, , prefix = 'claude', pagesArg, widthsArg, langsArg] = process.argv;
const pages = (pagesArg || '/,services,buy-sell,advisory,viewings,about').split(',');
const widths = (widthsArg || '390,1280').split(',').map(Number);
const langs = (langsArg || 'zh').split(',');
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  for (const w of widths)
    for (const lang of langs) {
      const c = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 }, reducedMotion: 'reduce' });
      await c.addInitScript((l) => localStorage.setItem('lang', l), lang);
      await c.route('**/api/leads', (r) => r.abort());
      await c.route('**/api/reception/**', (r) => r.abort());
      const p = await c.newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      for (const pg of pages) {
        await p.goto('http://127.0.0.1:5173/' + (pg === '/' || pg === 'home' ? '' : pg), { waitUntil: 'networkidle' });
        await p.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 600) {
            scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          scrollTo(0, 0);
        });
        await p.waitForTimeout(400);
        const name = pg === '/' || pg === 'home' ? 'home' : pg.replace(/[^a-z0-9]+/g, '-');
        const out = process.env.OUT_DIR || 'data/design-review';
        await p.screenshot({ path: `${out}/${prefix}-${name}-${lang}-${w}.png`, fullPage: true });
        if (process.env.FOLD) await p.screenshot({ path: `${out}/${prefix}-${name}-${lang}-${w}-fold.png` });
        const ov = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        console.log(pg, w, lang, 'overflow', ov, 'h', await p.evaluate(() => document.body.scrollHeight));
      }
      if (errs.length) console.log('ERR', errs);
      await c.close();
    }
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
