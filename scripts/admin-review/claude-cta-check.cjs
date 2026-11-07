// Clicks the main CTAs on the redesigned pages and records which service the form preselects.
// Enquiry and routing POSTs are blocked; nothing is submitted.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const out = process.argv[2] || 'data/design-review';
const cases = [
  ['services', '.rp-letting-cta', 'letting'],
  ['services', '.rp-management-cta', 'management'],
  ['services', '.rp-offer-cta', 'letting'],
  ['buy-sell', '.sales-selling-cta', 'selling'],
  ['buy-sell', '.sales-buying-cta', 'buying'],
  ['', '.ds-offer-cta', 'letting'],
  ['', '.v-compare .rp-letting-cta', 'letting'],
  ['', '.v-compare .rp-management-cta', 'management'],
  ['', '.sales-selling-cta', 'selling'],
  ['', '.advisory-home-cta', 'renovation'],
  ['advisory', '.advisory-hero-cta', 'renovation'],
];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' });
  const results = [];
  for (const w of [390, 1280])
    for (const lang of ['zh', 'en']) {
      const c = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 }, hasTouch: w < 500 });
      await c.addInitScript((l) => localStorage.setItem('lang', l), lang);
      const posts = [];
      await c.route('**/api/leads**', (r) => { posts.push(r.request().url()); return r.abort(); });
      await c.route('**/api/reception/**', (r) => { posts.push(r.request().url()); return r.abort(); });
      const p = await c.newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      for (const [page, sel, expected] of cases) {
        await p.goto('http://127.0.0.1:5173/' + page, { waitUntil: 'networkidle' });
        const btn = p.locator(sel).first();
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
        await p.waitForTimeout(500);
        const dialog = p.locator('[role="dialog"]');
        const open = await dialog.isVisible().catch(() => false);
        const checked = open ? await dialog.locator('input[type="radio"]:checked').evaluateAll((els) => els.map((e) => e.value)) : [];
        const offer = open ? await dialog.locator('input[type="checkbox"]').count() : 0;
        results.push({ w, lang, page: page || 'home', sel, expected, open, checked, ok: open && checked.includes(expected), offerCheckboxes: offer });
        if (w === 390 && lang === 'zh' && sel === '.rp-letting-cta') await p.screenshot({ path: `${out}/cta-form-390.png` });
        if (w === 1280 && lang === 'en' && sel === '.sales-selling-cta') await p.screenshot({ path: `${out}/cta-form-1280.png` });
      }
      results.push({ w, lang, posts: posts.length, errs });
      await c.close();
    }
  fs.writeFileSync(`${out}/cta-check.json`, JSON.stringify(results, null, 2));
  const bad = results.filter((r) => r.sel && !r.ok);
  console.log(JSON.stringify({ total: results.filter((r) => r.sel).length, bad, posts: results.filter((r) => r.posts).map((r) => r.posts), errs: results.flatMap((r) => r.errs || []) }, null, 2));
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
