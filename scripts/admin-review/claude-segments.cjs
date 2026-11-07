// Viewport-by-viewport screenshots with normal motion, for reading detail.
// Usage: node claude-segments.cjs <outDir> <page> <width> <lang> [maxSegments] [reduce]
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const [, , out, page, width = '1280', lang = 'zh', max = '12', reduce] = process.argv;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const w = Number(width);
  const h = w < 500 ? 844 : 860;
  const b = await chromium.launch({ channel: 'msedge' });
  const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: reduce ? 'reduce' : 'no-preference', hasTouch: w < 500, isMobile: w < 500 });
  await c.addInitScript((l) => localStorage.setItem('lang', l), lang);
  await c.route('**/api/leads', (r) => r.abort());
  await c.route('**/api/reception/**', (r) => r.abort());
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://127.0.0.1:5173/' + (page === '/' || page === 'home' ? '' : page), { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  const name = page === '/' ? 'home' : page.replace(/[^a-z0-9]+/g, '-');
  let i = 0;
  for (let y = 0; y < total && i < Number(max); y += h - 80, i++) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(1100);
    await p.screenshot({ path: `${out}/${name}-${lang}-${w}-${String(i).padStart(2, '0')}.png` });
  }
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log(JSON.stringify({ page, w, lang, total, segments: i, overflow, errs }));
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
