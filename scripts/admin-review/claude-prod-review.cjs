// Read-only production review: GET only, every non-GET request is aborted.
const { chromium } = require('@playwright/test');
const out = 'data/design-review/claude-review-prod';
const base = process.argv[2] || 'https://eucove.com';
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const log = [];
  for (const w of [320, 390, 1280]) for (const lang of ['zh', 'en']) {
    const c = await b.newContext({ viewport: { width: w, height: w < 500 ? 780 : 860 }, hasTouch: w < 500, isMobile: w < 500 });
    await c.addInitScript((l) => localStorage.setItem('lang', l), lang);
    await c.route('**/*', (r) => (r.request().method() === 'GET' ? r.continue() : r.abort()));
    const p = await c.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    for (const pg of ['', 'services', 'buy-sell', 'advisory', 'viewings', 'about', 'contact']) {
      await p.goto(base + '/' + pg, { waitUntil: 'networkidle', timeout: 60000 });
      await p.waitForTimeout(800);
      const m = await p.evaluate(() => {
        const nav = [...document.querySelectorAll('.site-header nav a')].filter((a) => { const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight; });
        const cut = nav.filter((a) => a.scrollWidth > a.clientWidth + 1).map((a) => a.textContent);
        const small = nav.filter((a) => a.getBoundingClientRect().height < 43).map((a) => a.textContent);
        const header = document.querySelector('.site-header')?.getBoundingClientRect().height;
        const imgsBroken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getBoundingClientRect().width > 0).map((i) => i.src).slice(0, 5);
        return { navVisible: nav.length, navCut: cut, navSmall: small, header: Math.round(header || 0), overflow: document.documentElement.scrollWidth > innerWidth, height: document.body.scrollHeight, imgsBroken };
      });
      log.push({ w, lang, pg: pg || 'home', ...m });
      await p.screenshot({ path: `${out}/${pg || 'home'}-${lang}-${w}.png`, fullPage: w < 500 && ['', 'services'].includes(pg) });
    }
    log.push({ w, lang, errs });
    await c.close();
  }
  console.log(log.map((l) => JSON.stringify(l)).join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
