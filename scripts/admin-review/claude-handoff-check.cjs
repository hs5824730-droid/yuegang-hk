// Direct WhatsApp / WeChat hand-off after the enquiry form, all APIs mocked; wa.me is intercepted, never opened.
const { chromium, devices } = require('@playwright/test');
const fs = require('node:fs');
const out = process.argv[2] || 'data/design-review/claude-final';
const QR = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29"><rect width="29" height="29" fill="#fff"/><path d="M4 4h7v7H4zM18 4h7v7h-7zM4 18h7v7H4zM14 14h2v2h-2z" fill="#000"/></svg>');
const NUMBERS = { Sydney: '+61400000001', Melbourne: '+61400000002' };
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' });
  const results = [];
  const scenarios = [
    { method: 'whatsapp', city: 'Sydney', expect: 'wa' },
    { method: 'whatsapp', city: 'Perth', expect: 'unconfigured' },
    { method: 'wechat', city: 'Sydney', expect: 'qr' },
    { method: 'phone', city: 'Sydney', expect: 'phone' },
    { method: 'whatsapp', city: 'Melbourne', expect: 'retry', failFirstAssign: true },
  ];
  for (const vp of [{ name: 'iphone', ...devices['iPhone 13'] }, { name: '1280', viewport: { width: 1280, height: 860 } }])
    for (const lang of ['zh', 'en'])
      for (const sc of scenarios) {
        const { name, ...opts } = vp;
        const c = await b.newContext({ ...opts, reducedMotion: 'reduce' });
        await c.addInitScript((l) => localStorage.setItem('lang', l), lang);
        const calls = { leads: 0, leadIds: new Set(), assign: [], events: 0, wa: [] };
        let failAssign = !!sc.failFirstAssign;
        await c.route('**/api/leads', async (r) => {
          if (r.request().method() !== 'POST') return r.continue();
          const body = r.request().postDataJSON();
          calls.leads++; calls.leadIds.add(body.requestId);
          return r.fulfill({ status: 201, json: { id: 'lead-' + body.requestId.slice(0, 8) } });
        });
        await c.route('**/api/reception/assign', (r) => {
          const body = r.request().postDataJSON();
          calls.assign.push(body);
          if (failAssign) { failAssign = false; return r.fulfill({ status: 503, json: { error: 'mock' } }); }
          if (body.channel === 'wechat') return r.fulfill({ json: { id: 'a-wx', channel: 'wechat', target: { id: 't-wx', value: QR } } });
          const n = NUMBERS[body.city];
          return r.fulfill({ json: n ? { id: 'a-wa', channel: 'whatsapp', target: { id: 't-' + body.city, value: n } } : { id: 'a-wa', channel: 'whatsapp', target: null, reason: 'no_city_target' } });
        });
        await c.route('**/api/reception/events', (r) => { calls.events++; return r.fulfill({ json: { ok: true } }); });
        await c.route('https://wa.me/**', (r) => { if (!calls.wa.includes(r.request().url())) calls.wa.push(r.request().url()); return r.abort(); });
        const p = await c.newPage();
        const errs = [];
        p.on('pageerror', (e) => { if (!/localStorage/.test(e.message)) errs.push(e.message); });
        await p.goto('http://127.0.0.1:5173/' + lang + '/services', { waitUntil: 'networkidle' });
        await p.locator('.rp-letting-cta').first().click();
        const d = p.locator('[role="dialog"]');
        await c.addInitScript(() => {}); 
        await d.locator('.lf-next').click();
        await d.locator(`input[type="radio"][value="${sc.city}"]`).check({ force: true });
        await d.locator('.lf-next').click();
        await d.locator('input[autocomplete="name"]').fill('Mock Owner');
        const label = { phone: lang === 'zh' ? '电话' : 'Phone', whatsapp: 'WhatsApp', wechat: lang === 'zh' ? '微信' : 'WeChat' }[sc.method];
        await d.locator('.lf-contact-options button', { hasText: label }).click();
        await d.locator('input[id$="-contact"]').fill(sc.method === 'wechat' ? 'mockowner2026' : '+61400000099');
        const submitText = await d.locator('.lf-next').innerText();
        await d.locator('.lf-next').click();
        await p.waitForTimeout(1500);
        if (sc.expect === 'retry') {
          await d.locator('.lf-handoff .btn').click();
          await p.waitForTimeout(1500);
        }
        const shot = `${out}/handoff-${sc.method}-${sc.city}-${lang}-${name}.png`;
        await p.screenshot({ path: shot }).catch(() => {});
        const doneText = await d.innerText().catch(() => '');
        const r = {
          vp: name, lang, ...sc, submitText,
          leadPosts: calls.leads, distinctLeadIds: calls.leadIds.size,
          assignCalls: calls.assign.length, assignReqIds: [...new Set(calls.assign.map((a) => a.requestId))].length,
          assignLinked: calls.assign.every((a) => calls.leadIds.has(a.leadRequestId)),
          waNavigations: calls.wa, events: calls.events,
          qrVisible: await d.locator('.lf-qr img').isVisible().catch(() => false),
          unconfiguredNote: /暂未配置|not set up/.test(doneText),
          modalCount: await p.locator('[role="dialog"]').count(),
          overflow: await p.evaluate(() => document.documentElement.scrollWidth > innerWidth).catch(() => null),
          errs,
        };
        r.ok =
          r.leadPosts === 1 && r.distinctLeadIds === 1 && r.modalCount <= 1 && !errs.length &&
          (sc.expect === 'wa' ? r.assignCalls === 1 && r.waNavigations.length === 1 && r.waNavigations[0] === 'https://wa.me/' + NUMBERS[sc.city].slice(1)
            : sc.expect === 'unconfigured' ? r.assignCalls === 1 && r.waNavigations.length === 0 && r.unconfiguredNote
            : sc.expect === 'qr' ? r.assignCalls === 1 && r.qrVisible && r.waNavigations.length === 0
            : sc.expect === 'phone' ? r.assignCalls === 0 && r.waNavigations.length === 0
            : r.assignCalls === 2 && r.assignReqIds === 1 && r.waNavigations.length === 1 && r.assignLinked);
        results.push(r);
        await c.close();
      }
  fs.writeFileSync(`${out}/handoff-check.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ total: results.length, bad: results.filter((r) => !r.ok) }, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
