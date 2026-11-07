// Remaining public pages with mocked routing/enquiry APIs (nothing reaches the real queue or lead table).
// Usage: node claude-rest.cjs <outDir> <prefix> [widths] [langs] [motion: reduce|normal]
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const [, , out = 'data/design-review/claude-final', prefix = 'rest', widthsArg = '390,1280', langsArg = 'zh,en', motion = 'reduce'] = process.argv;
const QR = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29"><rect width="29" height="29" fill="#fff"/><path d="M4 4h7v7H4zM18 4h7v7h-7zM4 18h7v7H4zM14 14h2v2h-2zM18 18h3v3h-3zM22 22h3v3h-3z" fill="#000"/></svg>');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' });
  const log = [];
  for (const w of widthsArg.split(',').map(Number))
    for (const lang of langsArg.split(',')) {
      const c = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 }, hasTouch: w < 500, reducedMotion: motion === 'normal' ? 'no-preference' : 'reduce' });
      await c.addInitScript((l) => localStorage.setItem('lang', l), lang);
      const real = [];
      await c.route('**/api/leads**', (r) => { real.push(r.request().url()); return r.abort(); });
      await c.route('**/api/reception/assign', (r) => {
        const body = r.request().postDataJSON();
        return r.fulfill({ json: { id: 'mock-assign', channel: body.channel, target: { id: 'mock-target', value: body.channel === 'whatsapp' ? '+61400000000' : QR } } });
      });
      await c.route('**/api/reception/events', (r) => r.fulfill({ json: { ok: true } }));
      const p = await c.newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(m.text()));
      for (const [name, path] of [['history', 'history'], ['detail-missing', 'properties/not-a-real-id'], ['contact', 'contact'], ['contact-whatsapp', 'contact/whatsapp'], ['contact-wechat', 'contact/wechat']]) {
        await p.goto('http://127.0.0.1:5173/' + path, { waitUntil: 'networkidle' });
        await p.waitForTimeout(motion === 'normal' ? 1500 : 500);
        await p.screenshot({ path: `${out}/${prefix}-${name}-${lang}-${w}.png`, fullPage: true });
        log.push({ name, w, lang, overflow: await p.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
      }
      // Enquiry drawer: three steps, without sending.
      await p.goto('http://127.0.0.1:5173/services', { waitUntil: 'networkidle' });
      await p.locator('.rp-letting-cta').first().click();
      await p.waitForTimeout(500);
      await p.screenshot({ path: `${out}/${prefix}-drawer-1-${lang}-${w}.png` });
      const dialog = p.locator('[role="dialog"]');
      await dialog.locator('button[type="submit"], .lf-next, button:has-text("下一步"), button:has-text("Continue")').last().click().catch(() => {});
      await p.waitForTimeout(400);
      await p.screenshot({ path: `${out}/${prefix}-drawer-2-${lang}-${w}.png` });
      // FAQ open state on the offer page (shared Faq component).
      await p.goto('http://127.0.0.1:5173/offer', { waitUntil: 'networkidle' });
      const faq = p.locator('.faq details, .ds-faq details').first();
      await faq.scrollIntoViewIfNeeded();
      await faq.locator('summary').click();
      await p.waitForTimeout(400);
      await faq.screenshot({ path: `${out}/${prefix}-faq-${lang}-${w}.png` });
      log.push({ w, lang, realPosts: real.length, errs });
      await c.close();
    }
  console.log(JSON.stringify(log));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
