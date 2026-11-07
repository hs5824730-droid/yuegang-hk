// Read-only screenshots of public reference sites for the Claude redesign.
// No typing, no clicking, no form submission; third-party requests are only loaded, never posted to.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const out = process.env.OUT_DIR || 'data/design-review/refs';
fs.mkdirSync(out, { recursive: true });
const urls = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const log = [];
  for (const [i, url] of urls.entries())
    for (const w of [1280, 390]) {
      const c = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 } });
      await c.route('**/*', (r) => (r.request().method() === 'GET' ? r.continue() : r.abort()));
      const p = await c.newPage();
      p.setDefaultTimeout(10000);
      try {
        await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await p.waitForTimeout(3500);
        const name = `${String(i + 1).padStart(2, '0')}-${w}`;
        await p.screenshot({ path: `${out}/${name}-fold.png`, timeout: 10000, animations: 'disabled' });
        // Avoid running scrolling loops in third-party page JavaScript: some
        // sites suspend timers. Full-page capture may include unloaded images.
        await p.screenshot({ path: `${out}/${name}-full.png`, fullPage: true, clip: undefined, timeout: 10000, animations: 'disabled' });
        log.push({ url, width: w, final: p.url(), title: await p.title() });
      } catch (e) {
        log.push({ url, width: w, error: String(e.message).slice(0, 200) });
      }
      await Promise.race([c.close(), new Promise((resolve) => setTimeout(resolve, 3000))]);
      fs.writeFileSync(`${out}/refs.json`, JSON.stringify(log, null, 2));
      console.log('Checked', url, w);
    }
  fs.writeFileSync(`${out}/refs.json`, JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log, null, 2));
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
