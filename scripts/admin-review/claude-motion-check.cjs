// Normal-motion and reduced-motion checks for the redesigned pages, plus the advisory comparison slider.
// Enquiry and routing writes are blocked.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const out = process.argv[2] || 'data/design-review/claude-final';
const pages = ['', 'services', 'buy-sell', 'advisory', 'viewings', 'about', 'offer'];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' });
  const res = [];
  for (const motion of ['no-preference', 'reduce'])
    for (const w of [390, 1280]) {
      const c = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 }, reducedMotion: motion, hasTouch: w < 500, isMobile: w < 500 });
      await c.route('**/api/leads**', (r) => r.abort());
      await c.route('**/api/reception/**', (r) => r.abort());
      const p = await c.newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      for (const pg of pages) {
        await p.goto('http://127.0.0.1:5173/' + pg, { waitUntil: 'networkidle' });
        await p.waitForTimeout(400);
        // First screen must show its heading and main action without scrolling.
        const firstScreen = await p.evaluate(() => {
          const h = document.querySelector('main h1');
          if (!h) return { h1: false };
          const r = h.getBoundingClientRect();
          const cs = getComputedStyle(h.closest('.reveal') || h);
          return { h1: r.top < innerHeight && r.bottom > 0, opacity: Number(cs.opacity) };
        });
        const hiddenAtLoad = await p.evaluate(() => [...document.querySelectorAll('.reveal:not(.in)')].length);
        await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } });
        await p.waitForTimeout(1200);
        const hiddenAfterScroll = await p.evaluate(() => [...document.querySelectorAll('.reveal:not(.in)')].length);
        const infinite = await p.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getComputedTiming().iterations === Infinity).map((a) => a.animationName || 'transition'));
        res.push({ motion, w, page: pg || 'home', firstScreen, hiddenAtLoad, hiddenAfterScroll, infinite });
      }
      // In-page index: anchor scroll on /services lands the section under the header.
      await p.goto('http://127.0.0.1:5173/services', { waitUntil: 'networkidle' });
      await p.locator('.ds-index a[href="#management"]').click();
      await p.waitForTimeout(1200);
      const anchor = await p.evaluate(() => ({ top: Math.round(document.getElementById('management').getBoundingClientRect().top), current: document.querySelector('.ds-index a[aria-current="true"]')?.getAttribute('href') }));
      res.push({ motion, w, check: 'services-index', anchor });
      // Advisory comparison: keyboard and pointer/touch.
      await p.goto('http://127.0.0.1:5173/advisory', { waitUntil: 'networkidle' });
      const stage = p.locator('.ds-compare-ba-stage');
      await stage.waitFor({ timeout: 8000 });
      await stage.scrollIntoViewIfNeeded();
      await p.waitForTimeout(900);
      const pos = () => p.locator('.ds-compare-ba').evaluate((el) => el.style.getPropertyValue('--pos'));
      const start = await pos();
      await p.locator('.ds-compare-ba input[type="range"]').focus();
      for (let i = 0; i < 10; i++) await p.keyboard.press('ArrowLeft');
      const afterKeys = await pos();
      const box = await stage.boundingBox();
      let afterPointer;
      if (w < 500) {
        const s = await c.newCDPSession(p);
        const y = box.y + box.height / 2;
        await s.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width * 0.3, y }] });
        for (let i = 1; i <= 6; i++) await s.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width * (0.3 + i * 0.08), y }] });
        await s.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        afterPointer = await pos();
        // A vertical swipe over the slider should still scroll the page.
        const before = await p.evaluate(() => scrollY);
        await s.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: y + 60 }] });
        for (let i = 1; i <= 6; i++) await s.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width / 2, y: y + 60 - i * 40 }] });
        await s.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await p.waitForTimeout(600);
        res.push({ motion, w, check: 'slider-vertical-swipe-scrolls', scrolled: (await p.evaluate(() => scrollY)) - before });
        await s.detach();
      } else {
        await p.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
        await p.mouse.down();
        await p.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 6 });
        await p.mouse.up();
        afterPointer = await pos();
      }
      await stage.screenshot({ path: `${out}/advisory-compare-${motion}-${w}.png` });
      res.push({ motion, w, check: 'advisory-slider', start, afterKeys, afterPointer, errs });
      await c.close();
    }
  fs.writeFileSync(`${out}/motion-check.json`, JSON.stringify(res, null, 2));
  const bad = res.filter((r) => (r.firstScreen && (!r.firstScreen.h1 || r.firstScreen.opacity < 1)) || r.hiddenAfterScroll > 0 || (r.infinite && r.infinite.length) || (r.motion === 'reduce' && r.hiddenAtLoad > 0) || (r.errs && r.errs.length));
  console.log(JSON.stringify({ total: res.length, bad, checks: res.filter((r) => r.check) }, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
