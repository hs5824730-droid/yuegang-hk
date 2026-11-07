import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions, Response as MiniflareResponse } from 'miniflare';
import { comCallbackMarkup, prepareLeadBody } from './com-callback.js';
import { leadSchema } from './schema.js';
import { applyTestMigrations } from './test-migrations.js';

const legacyId = '11111111-1111-4111-8111-111111111111';
const legacy = { name: 'Hash Owner', contact: '+61 400 000 111', city: 'Melbourne', service: 'management', language: 'en' as const, message: 'Kept', currentlyManaged: false, consent: true as const, website: '', requestId: legacyId };

test('missing consent is implied and an explicit true is unchanged', () => {
  assert.deepEqual(leadSchema.parse(prepareLeadBody(legacy)), leadSchema.parse(legacy));
  const parsed = leadSchema.parse(prepareLeadBody({ name: '王女士', contact: '0412 345 678', city: 'Sydney' }));
  assert.equal(parsed.consent, 'implied');
  assert.equal(parsed.service, 'letting');
  assert.equal(parsed.language, 'zh');
  assert.match(parsed.requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(leadSchema.parse(prepareLeadBody({ name: '王女士', contact: '0412 345 678', city: 'Sydney', consent: true, requestId: legacyId })).consent, true);
  assert.equal(leadSchema.safeParse(prepareLeadBody({ name: '王女士', contact: '0412 345 678', city: 'Sydney', consent: false })).success, false);
  assert.equal(leadSchema.safeParse(prepareLeadBody({ contact: '0412345678', city: 'Sydney' })).success, false);
});

test('com home and services do not inject the top callback form', () => {
  for (const href of ['https://eucove.com/', 'https://eucove.com/services?utm_source=facebook&fbclid=fictional-only', 'https://eucove.com/about']) {
    const html = comCallbackMarkup(new URL(href));
    assert.equal(html, '');
    assert.equal(html.includes('eucove-callback'), false);
    assert.equal(html.includes('免费评估租金'), false);
  }
  assert.equal(comCallbackMarkup(new URL('https://eucove.com/admin')), '');
  const frozen = readFileSync('site/com/assets/index-Db9ODUdG.js', 'utf8');
  assert.equal(frozen.split('留下联系方式，我们回电').length - 1, 2);
  assert.equal(frozen.includes('直接联系我们'), false);
  assert.equal(readFileSync('worker/net.ts', 'utf8').includes('eucove-callback'), false);
  assert.equal(readFileSync('src/components/LeadForm.tsx', 'utf8').includes('免费评估租金'), false);
});

test('callback script fires Lead only after a saved enquiry and does not send consent', async () => {
  const source = readFileSync('public/eucove-callback.js', 'utf8');
  const failure = source.indexOf('if (!response.ok)');
  const call = source.indexOf('fireLead(payload.requestId)');
  assert.ok(failure > 0 && call > failure);
  assert.doesNotMatch(source, /consent|fbq\s*\(|wa\.me|whatsapp/i);

  async function run(options: { status?: number; dnt?: boolean; valid?: boolean }) {
    const frames: { src: string }[] = [];
    let posted: Record<string, unknown> | null = null;
    const values: Record<string, { value: string }> = {
      name: { value: '王' }, contact: { value: '0412345678' }, city: { value: 'Sydney' }, cityOther: { value: '' },
      service: { value: 'letting' }, language: { value: 'zh' }, website: { value: '' }, requestId: { value: legacyId },
    };
    const status = { hidden: true, className: '', textContent: '' };
    const form: { handler?: (event: { preventDefault: () => void }) => void; dataset: Record<string, string>; hidden: boolean; parentElement: { querySelector: () => null }; querySelector: (selector: string) => unknown; checkValidity: () => boolean; reportValidity: () => void; addEventListener: (type: string, fn: (event: { preventDefault: () => void }) => void) => void } = {
      dataset: {}, hidden: false, parentElement: { querySelector: () => null },
      querySelector(selector: string) {
        const name = selector.match(/name="([^"]+)"/)?.[1];
        if (name) return values[name];
        if (selector === '[data-city-other]') return { hidden: true };
        if (selector === 'button[type="submit"]') return { disabled: false };
        return null;
      },
      checkValidity: () => options.valid !== false, reportValidity() {},
      addEventListener(_type, fn) { form.handler = fn; },
    };
    runInNewContext(source, {
      document: {
        readyState: 'complete', documentElement: { lang: 'zh-CN' }, body: { appendChild() {} },
        getElementById(id: string) { return id === 'eucove-callback-form' ? form : id === 'eucove-callback-status' ? status : id === 'eucove-callback' ? {} : null; },
        querySelector(selector: string) { return selector === '.eucove-callback-sticky' ? { hidden: false } : null; },
        createElement() { const frame = { src: '', hidden: false, tabIndex: 0, title: '', referrerPolicy: '', setAttribute() {}, replaceWith() {} }; frames.push(frame); return frame; },
        addEventListener() {},
      },
      navigator: options.dnt ? { doNotTrack: '1' } : {},
      location: { protocol: 'https:', hostname: 'eucove.com', pathname: '/services', search: '?utm_source=facebook&fbclid=fictional-only' },
      crypto, fetch: async (_url: string, init: { body: string }) => { posted = JSON.parse(init.body); return { ok: (options.status ?? 201) < 400, status: options.status ?? 201 }; },
      MutationObserver: class { observe() {} }, IntersectionObserver: class { observe() {} },
    });
    form.handler?.({ preventDefault() {} });
    await new Promise(resolve => setImmediate(resolve));
    return { frames, posted, status };
  }
  const invalid = await run({ valid: false });
  assert.equal(invalid.posted, null); assert.equal(invalid.frames.length, 0);
  const failed = await run({ status: 400 });
  assert.equal(failed.frames.length, 0);
  const saved = await run({});
  assert.equal(saved.frames.length, 1);
  assert.equal(saved.frames[0].src, 'https://eucove.com/services?__eucove_pixel=lead');
  assert.equal(saved.frames[0].src.includes('fictional-only'), false);
  assert.equal(Object.hasOwn(saved.posted || {}, 'consent'), false);
  const blocked = await run({ dnt: true });
  assert.equal(blocked.frames.length, 0);
});

test('com worker shows the callback form and stores implied consent', async () => {
  const directory = mkdtempSync(path.join(process.cwd(), '.tmp-callback-'));
  const bundle = path.join(directory, 'worker.mjs');
  await build({ entryPoints: ['worker/index.ts'], outfile: bundle, bundle: true, format: 'esm', platform: 'browser', target: 'es2023', external: ['node:*'], logLevel: 'silent' });
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, scriptPath: bundle, compatibilityDate: '2026-10-23', compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    bindings: { APP_URL: 'https://eucove.com', BRAND_ZH: '桉湾', BRAND_EN: 'EUCOVE', WHATSAPP_NUMBER: '', DISABLE_TELEGRAM: 'true', SIGNAL_ENABLED: 'false', TURNSTILE_ENABLED: 'false', SESSION_SECRET: 'callback-fixture-key-123456789012345678901', ADMIN_EMAIL: 'callback@example.test', ADMIN_PASSWORD: 'CallbackFixturePassword2026' },
    serviceBindings: { ASSETS: () => new MiniflareResponse('<!doctype html><html lang="zh-CN"><body><div id="root"></div></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }) },
    outboundService: () => { throw new Error('external traffic is not used'); },
  }));
  try {
    const db = await mf.getD1Database('DB');
    await applyTestMigrations(db);
    const home = await (await mf.dispatchFetch('https://eucove.com/?utm_source=facebook&fbclid=fictional-only')).text();
    const services = await (await mf.dispatchFetch('https://eucove.com/services?utm_source=facebook&utm_medium=paid&fbclid=fictional-only')).text();
    for (const html of [home, services]) {
      assert.match(html, /id="root"/);
      assert.equal(html.includes('eucove-callback'), false);
      assert.equal(html.includes('免费评估租金'), false);
      assert.doesNotMatch(html, /fictional-only/);
    }
    const post = async (body: unknown, ip: string) => {
      const response = await mf.dispatchFetch('https://eucove.com/api/leads', { method: 'POST', headers: { Origin: 'https://eucove.com', 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify(body) });
      return { status: response.status, body: await response.json() as { id?: string; requestId?: string; error?: string } };
    };
    const created = await post({ name: '王女士', contact: '+61 400 111 222', city: 'Sydney' }, '192.0.2.40');
    assert.equal(created.status, 201);
    assert.match(created.body.requestId || '', /^[0-9a-f-]{36}$/i);
    const retry = await post({ name: '王女士', contact: '+61 400 111 222', city: 'Sydney', requestId: created.body.requestId }, '192.0.2.40');
    assert.equal(retry.status, 200); assert.equal(retry.body.id, created.body.id);
    const stored = await db.prepare('SELECT service,data FROM leads WHERE id=?').bind(created.body.id).first<{ service: string; data: string }>();
    const data = JSON.parse(stored!.data);
    assert.equal(stored?.service, 'letting');
    assert.equal(data.language, 'zh');
    assert.equal(data.consent, 'implied');
    const explicit = await post({ name: '李先生', contact: '+61 400 111 223', city: 'Melbourne', service: 'letting', language: 'zh', consent: true, requestId: randomUUID() }, '192.0.2.41');
    assert.equal(explicit.status, 201);
    const explicitRow = await db.prepare('SELECT data FROM leads WHERE id=?').bind(explicit.body.id).first<{ data: string }>();
    assert.equal(JSON.parse(explicitRow!.data).consent, true);
    assert.equal((await post({ name: '王女士', contact: '+61 400 111 224', city: 'Sydney', consent: false, requestId: randomUUID() }, '192.0.2.42')).status, 400);
  } finally { await mf.dispose(); rmSync(directory, { recursive: true, force: true }); }
});
