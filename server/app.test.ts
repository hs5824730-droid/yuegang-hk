import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

const testDirectory = mkdtempSync(path.join(tmpdir(), 'house-platform-test-'));
Object.assign(process.env, {
  DATABASE_PATH: path.join(testDirectory, 'test.sqlite'), UPLOAD_DIR: path.join(testDirectory, 'uploads'),
  SESSION_SECRET: 'test-session-key-not-for-production-1234567890',
  TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '',
  ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: 'TestPassword!2026Secure',
  APP_URL: 'http://localhost:5173', NODE_ENV: 'test',
});
const { createApp } = await import('./app.js');
const { db } = await import('./db.js');
const { config } = await import('./config.js');
const { leadSchema } = await import('./schema.js');
const { deliverNotifications } = await import('./notifications.js');

test('property platform: persistence, permissions, validation and notifications', async t => {
  const server: Server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const request = async (url: string, method = 'GET', body?: unknown, cookie = '', origin = 'http://localhost:5173') => {
    const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { response, body: await response.json() as any };
  };
  const property = {
    title: { zh: '测试房产', en: 'Test property' }, description: { zh: '测试', en: 'Test' },
    address: '1 Test Street', city: 'Kowloon', suburb: 'Test', postcode: '3000', type: 'house',
    status: 'sale', price: 1000000, priceLabel: { zh: '', en: '' }, beds: 3, baths: 2, cars: 1, area: 200,
    images: [], floorplan: '', tourUrl: '', tourKind: 'none', published: false,
    events: [{ date: '2026-10-22', type: 'listed', price: 1000000, note: { zh: '', en: '' } }],
  };
  let adminCookie = ''; let managerCookie = ''; let assistantCookie = '';
  let leadId = ''; let propertyId = ''; let managerId = '';
  const input = { name: '=Test Owner', contact: '+61 400 123 456', city: 'Kowloon', service: 'management', language: 'zh', message: 'Test only', currentlyManaged: false, consent: true, requestId: randomUUID() };
  try {
    await t.test('production frames allow the exact map origin without widening tour URLs', async () => {
      const previous = config.production;
      let productionServer: Server | undefined;
      try {
        config.production = true;
        productionServer = createApp().listen(0, '127.0.0.1');
        await new Promise<void>(resolve => productionServer!.once('listening', resolve));
        const location = productionServer.address(); assert.ok(location && typeof location !== 'string');
        const response = await fetch(`http://127.0.0.1:${location.port}/api/health`);
        const csp = response.headers.get('content-security-policy')!;
        const frames = csp.split(';').find(d => d.trim().startsWith('frame-src '))!;
        assert.match(frames, /https:\/\/www\.openstreetmap\.org(?:\s|$)/);
        assert.equal(frames.includes('*.openstreetmap.org'), false);
        assert.match(csp, /connect-src 'self'(?:;|$)/);
        assert.match(csp, /script-src 'self'(?:;|$)/);
        const { propertySchema } = await import('./schema.js');
        assert.equal(propertySchema.safeParse({ ...property, tourKind: 'real', tourUrl: 'https://www.openstreetmap.org/export/embed.html' }).success, false);
      } finally {
        config.production = previous;
        if (productionServer) await new Promise<void>(resolve => productionServer!.close(() => resolve()));
      }
    });
    await t.test('internal market reference is never served in production', async () => {
      const wasProduction = config.production;
      try {
        config.production = true;
        const result = await request('/api/market-reference');
        assert.equal(result.response.status, 404);
        assert.equal(result.body.records, undefined);
      } finally { config.production = wasProduction; }
    });
    await t.test('private APIs require login; login returns a protected session', async () => {
      assert.equal((await request('/api/admin/leads')).response.status, 401);
      const invalid = await request('/api/admin/login', 'POST', { email: 'admin@example.test', password: 'wrong' }); assert.equal(invalid.response.status, 401);
      const login = await request('/api/admin/login', 'POST', { email: 'admin@example.test', password: 'TestPassword!2026Secure' });
      assert.equal(login.response.status, 200); adminCookie = login.response.headers.get('set-cookie')!.split(';')[0];
      assert.match(login.response.headers.get('set-cookie')!, /HttpOnly/); assert.match(login.response.headers.get('set-cookie')!, /SameSite=Strict/);
      assert.equal(login.body.user.role, 'admin'); assert.equal(login.body.user.password_hash, undefined);
    });
    await t.test('cross-origin writes are rejected', async () => {
      assert.equal((await request('/api/leads', 'POST', input, '', 'https://untrusted.example')).response.status, 403);
    });
    await t.test('public leads validate consent and refuse agency transfers', async () => {
      assert.equal((await request('/api/leads', 'POST', { ...input, consent: false })).response.status, 400);
      assert.equal((await request('/api/leads', 'POST', { ...input, currentlyManaged: true })).response.status, 422);
      assert.equal((await request('/api/leads', 'POST', { ...input, contact: 'nope!' })).response.status, 400);
    });
    await t.test('submission persists once and creates a durable notification', async () => {
      const first = await request('/api/leads', 'POST', input); assert.equal(first.response.status, 201); leadId = first.body.id;
      const retry = await request('/api/leads', 'POST', input); assert.equal(retry.body.id, leadId);
      const conflict = await request('/api/leads', 'POST', { ...input, name: 'Different' }); assert.equal(conflict.response.status, 409);
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM leads').get() as any).n, 1);
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM notifications').get() as any).n, 1);
      const list = await request('/api/admin/leads', 'GET', undefined, adminCookie); assert.equal(list.body.leads[0].notificationStatus, 'pending');
    });
    await t.test('drafts stay private, publishing exposes details and filters', async () => {
      const created = await request('/api/admin/properties', 'POST', property, adminCookie); assert.equal(created.response.status, 201); propertyId = created.body.property.id;
      assert.equal((await request('/api/properties')).body.properties.length, 0);
      assert.equal((await request('/api/properties/' + propertyId)).response.status, 404);
      const published = await request('/api/admin/properties/' + propertyId, 'PUT', { ...property, published: true }, adminCookie); assert.equal(published.response.status, 200);
      assert.equal((await request('/api/properties?city=Kowloon&beds=3&minPrice=900000')).body.properties.length, 1);
      assert.equal((await request('/api/properties?city=Hong Kong Island')).body.properties.length, 0);
      assert.equal((await request('/api/properties?minPrice=bad')).response.status, 400);
      assert.equal((await request('/api/admin/properties', 'POST', { ...property, tourKind: 'real', tourUrl: 'https://evil.example/tour' }, adminCookie)).response.status, 400);
      assert.equal((await request('/api/admin/properties', 'POST', { ...property, events: [{ ...property.events[0], date: '2026-02-30' }] }, adminCookie)).response.status, 400);
    });
    await t.test('cities and roles limit data access and writes', async () => {
      const manager = await request('/api/admin/users', 'POST', { name: 'Hong Kong Island Manager', email: 'manager@example.test', password: 'TestManagerPassword123', role: 'manager', city: 'Hong Kong Island' }, adminCookie);
      assert.equal(manager.response.status, 201); managerId = manager.body.user.id;
      const assistant = await request('/api/admin/users', 'POST', { name: 'Kowloon Assistant', email: 'assistant@example.test', password: 'TestAssistantPassword123', role: 'assistant', city: 'Kowloon' }, adminCookie); assert.equal(assistant.response.status, 201);
      const login = await request('/api/admin/login', 'POST', { email: 'manager@example.test', password: 'TestManagerPassword123' }); managerCookie = login.response.headers.get('set-cookie')!.split(';')[0];
      const login2 = await request('/api/admin/login', 'POST', { email: 'assistant@example.test', password: 'TestAssistantPassword123' }); assistantCookie = login2.response.headers.get('set-cookie')!.split(';')[0];
      assert.equal((await request('/api/admin/leads', 'GET', undefined, managerCookie)).body.leads.length, 0);
      assert.equal((await request('/api/admin/leads/' + leadId, 'PATCH', { status: 'contacted' }, managerCookie)).response.status, 404);
      assert.equal((await request('/api/admin/properties/' + propertyId, 'PUT', property, managerCookie)).response.status, 404);
      assert.equal((await request('/api/admin/properties', 'POST', property, managerCookie)).response.status, 403);
      assert.equal((await request('/api/admin/properties', 'POST', property, assistantCookie)).response.status, 403);
      assert.equal((await request('/api/admin/users', 'POST', { name: 'x' }, managerCookie)).response.status, 403);
      const update = await request('/api/admin/leads/' + leadId, 'PATCH', { status: 'following', notes: 'Contacted', commissionOrdinal: 1, nextFollowUp: null }, assistantCookie); assert.equal(update.response.status, 200); assert.equal(update.body.lead.nextFollowUp, '');
      assert.equal((await request('/api/admin/leads/' + leadId, 'PATCH', { assignedTo: managerId }, assistantCookie)).response.status, 403);
      assert.equal((await request('/api/admin/leads/' + leadId, 'PATCH', { assignedTo: managerId }, adminCookie)).response.status, 400);
    });
    await t.test('uploads check actual bytes and CSV neutralizes formula injection', async () => {
      const invalid = new FormData(); invalid.append('file', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'bad.png');
      const response = await fetch(base + '/api/admin/uploads', { method: 'POST', headers: { Origin: 'http://localhost:5173', Cookie: adminCookie }, body: invalid }); assert.equal(response.status, 400);
      const good = new FormData(); good.append('file', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRz0AAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), '原始二维码.png');
      const image = await fetch(base + '/api/admin/uploads', { method: 'POST', headers: { Origin: 'http://localhost:5173', Cookie: adminCookie }, body: good }); assert.equal(image.status, 201);
      const uploaded = await image.json() as any; assert.equal(uploaded.originalFileName,'原始二维码.png'); const location = uploaded.url; assert.equal((await fetch(base + location)).status, 200);
      const csv = await fetch(base + '/api/admin/export/leads', { headers: { Cookie: adminCookie } }); assert.equal(csv.status, 200); assert.match(await csv.text(), /'\=Test Owner/);
    });
    await t.test('notification failures retain the lead and later retry succeeds', async () => {
      const originalFetch = globalThis.fetch;
      config.telegramToken = 'mock-token'; config.telegramChatId = 'mock-chat';
      try {
        globalThis.fetch = (async () => new Response(JSON.stringify({ ok: false, error_code: 500 }), { status: 500 })) as typeof fetch;
        await deliverNotifications();
        let row = db.prepare('SELECT * FROM notifications WHERE lead_id=?').get(leadId) as any;
        assert.equal(row.status, 'pending'); assert.equal(row.attempts, 1);
        db.prepare('UPDATE notifications SET next_attempt=0 WHERE lead_id=?').run(leadId);
        globalThis.fetch = (async (_url, init) => {
          const payload = JSON.parse(init!.body as string); assert.equal(payload.chat_id, 'mock-chat'); assert.ok(payload.text.includes(input.contact));
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }) as typeof fetch;
        await deliverNotifications(); row = db.prepare('SELECT * FROM notifications WHERE lead_id=?').get(leadId) as any;
        assert.equal(row.status, 'sent'); assert.equal(row.attempts, 2);
      } finally { globalThis.fetch = originalFetch; config.telegramToken = ''; config.telegramChatId = ''; }
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM leads').get() as any).n, 1);
    });
    await t.test('public leads reject malformed contact details', async () => {
      for (const contact of ['abc1234567', '123456', '+1234567890123456', '12-34']) {
        assert.equal((await request('/api/leads', 'POST', { ...input, contact, requestId: randomUUID() })).response.status, 400, contact);
      }
    });
    await t.test('omitted currentlyManaged is stored as null (to be confirmed), explicit false still accepted', async () => {
      const { currentlyManaged: _omit, ...withoutManaged } = input;
      const created = await request('/api/leads', 'POST', { ...withoutManaged, service: 'letting', contact: '(02) 9000-1234', requestId: randomUUID() });
      assert.equal(created.response.status, 201);
      const legacy = await request('/api/leads', 'POST', { ...input, service: 'letting', contact: '+86 138 0000 0000', requestId: randomUUID() });
      assert.equal(legacy.response.status, 201);
      const leads = (await request('/api/admin/leads', 'GET', undefined, adminCookie)).body.leads as Array<{ id: string; currentlyManaged: boolean | null; contact: string }>;
      const stored = leads.find((lead) => lead.id === created.body.id)!;
      assert.equal(stored.currentlyManaged, null);
      assert.equal(stored.contact, '(02) 9000-1234');
      assert.equal(leads.find((lead) => lead.id === legacy.body.id)!.currentlyManaged, false);
    });
    await t.test('other-city enquiries reach admin without crossing city permissions', async () => {
      const result = await request('/api/leads', 'POST', { ...input, city: ' New Territories ', requestId: randomUUID() });
      assert.equal(result.response.status, 201);
      const all = (await request('/api/admin/leads', 'GET', undefined, adminCookie)).body.leads;
      assert.equal(all.find((lead: any) => lead.id === result.body.id).city, 'New Territories');
      const scoped = (await request('/api/admin/leads', 'GET', undefined, managerCookie)).body.leads;
      assert.ok(!scoped.some((lead: any) => lead.id === result.body.id));
      for (const city of [' ', 'a'.repeat(81), 'Hong Kong Island\nprivate']) {
        assert.equal(leadSchema.safeParse({ ...input, city, requestId: randomUUID() }).success, false);
      }
    });
    await t.test('logout invalidates the session', async () => {
      assert.equal((await request('/api/admin/logout', 'POST', {}, adminCookie)).response.status, 200);
      assert.equal((await request('/api/admin/leads', 'GET', undefined, adminCookie)).response.status, 401);
    });
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close(); }
});
