import test from 'node:test';
import { applyTestMigrations } from './test-migrations.js';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID, scryptSync } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions, Response as MiniflareResponse } from 'miniflare';
import { checkPassword as checkWorkerPassword, passwordHash as workerPasswordHash, readCookie, signCookie } from '../worker/crypto';
import { checkPassword as checkNodePassword } from './password.js';

test('Worker crypto preserves Node passwords and signed cookies', async () => {
  const password = 'CloudflareFixturePassword2026'; const salt = '12'.repeat(16);
  const legacy = salt + ':' + scryptSync(password, salt, 64).toString('hex');
  assert.equal(await checkWorkerPassword(password, legacy), true); assert.equal(await checkWorkerPassword('wrong', legacy), false);
  const hash = await workerPasswordHash(password);
  assert.equal(await checkWorkerPassword(password, hash), true); assert.equal(checkNodePassword(password, hash), true);
  assert.equal(await checkWorkerPassword('wrong', hash), false);
  const secret = 'worker-crypto-test-key-only-1234567890123456789'; const token = 'ab'.repeat(32);
  const cookie = await signCookie(token, secret);
  assert.equal(await readCookie('house_session=' + cookie, secret), token);
  assert.equal(await readCookie('house_session=' + cookie + 'x', secret), null);
});

test('local D1 export preserves data and hashes, drops sessions and excludes private sample media', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'eucove-export-'));
  const filename = path.join(directory, 'source.sqlite'); const output = path.join(directory, 'import.sql');
  const source = new DatabaseSync(filename); const destination = new DatabaseSync(':memory:');
  try {
    const migration = readFileSync('migrations/0001_existing_schema.sql', 'utf8') + readFileSync('migrations/0002_worker_leases_and_limits.sql', 'utf8');
    source.exec(migration); destination.exec(migration);
    source.prepare('INSERT INTO users(id,name,email,password_hash,role,city,created_at) VALUES(?,?,?,?,?,?,?)').run('u', 'Admin', 'export@example.test', 'hash-preserved', 'admin', null, '2026-10-23');
    source.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').run('old-session', 'u', Date.now() + 3600000);
    const image = randomUUID() + '.jpg';
    source.prepare('INSERT INTO properties(id,city,published,data,created_at,updated_at) VALUES(?,?,?,?,?,?)').run('p', 'Sydney', 0, JSON.stringify({ images: ['/uploads/' + image, '/data/viewing-source/private.jpg'], floorplan: '' }), '2026-10-23', '2026-10-23');
    source.prepare('INSERT INTO owners(id,contact_key,contact,name,created_at) VALUES(?,?,?,?,?)').run('o', '123456789', '123456789', "O'Neil", '2026-10-23');
    source.prepare('INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,data,created_at) VALUES(?,?,?,?,?,?,?,?)').run('l', randomUUID(), 'request-hash-preserved', 'o', 'Sydney', 'letting', JSON.stringify({ name: "O'Neil" }), '2026-10-23');
    source.prepare('INSERT INTO notifications(id,lead_id,claimed_until,claim_token) VALUES(?,?,?,?)').run('n', 'l', Date.now() + 60000, 'old-lease');
    const stdout = execFileSync(process.execPath, ['scripts/export-cloudflare-data.mjs', '--database', filename, '--out', output], { encoding: 'utf8' }); assert.equal(stdout.includes("O'Neil"), false);
    destination.exec(readFileSync(output, 'utf8'));
    assert.equal((destination.prepare('SELECT password_hash FROM users').get() as { password_hash: string }).password_hash, 'hash-preserved');
    assert.equal((destination.prepare('SELECT name FROM owners').get() as { name: string }).name, "O'Neil");
    assert.equal((destination.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n, 0);
    const notification = destination.prepare('SELECT claimed_until,claim_token FROM notifications').get(); assert.equal(notification!.claimed_until, 0); assert.equal(notification!.claim_token, '');
    assert.equal((source.prepare('SELECT claim_token FROM notifications').get() as { claim_token: string }).claim_token, 'old-lease');
    const media = JSON.parse(readFileSync(output + '.media.json', 'utf8')); assert.deepEqual(media.files, [image]); assert.ok(media.excluded.includes('data/viewing-source'));
  } finally { source.close(); destination.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('Cloudflare Worker runs real workerd, D1 and R2 without external network', async t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'eucove-worker-'));
  const bundle = path.join(directory, 'worker.mjs');
  // Test-only entry: production entry contains no test routes. All outbound traffic is intercepted below.
  await build({ stdin: { contents: `import worker from './worker/index.ts'; import { deliverNotifications } from './worker/notifications.ts';
    export default { ...worker, async fetch(request, env, ctx) {
      const url=new URL(request.url);
      if(url.pathname==='/__test/notify'){await deliverNotifications({...env,DISABLE_TELEGRAM:'false',TELEGRAM_BOT_TOKEN:'fixture-only',TELEGRAM_CHAT_ID:'fixture-only'});return Response.json({ok:true});}
      if(url.pathname==='/__test/cron'){const work=[];await worker.scheduled({},env,{waitUntil:p=>work.push(p)});await Promise.all(work);return Response.json({ok:true});}
      if(url.pathname==='/__test/turnstile/api/leads'){url.pathname='/api/leads';return worker.fetch(new Request(url,request),{...env,TURNSTILE_ENABLED:'true',TURNSTILE_SECRET:'fixture-only'},ctx);}
      return worker.fetch(request,env,ctx);
    }};`, resolveDir: process.cwd(), loader: 'ts' }, outfile: bundle, bundle: true, format: 'esm', platform: 'browser', target: 'es2023', external: ['node:*'], logLevel: 'silent' });
  const sent: { text: string; chat_id: string }[] = []; let telegramMode = 'ok'; let verifyValid = true;
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, scriptPath: bundle, compatibilityDate: '2026-10-23', compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'], r2Buckets: ['MEDIA'],
    bindings: { APP_URL: 'https://eucove.com', BRAND_ZH: '桉湾', BRAND_EN: 'EUCOVE', WHATSAPP_NUMBER: '', DISABLE_TELEGRAM: 'true', TURNSTILE_ENABLED: 'false', SESSION_SECRET: 'worker-fixture-only-key-123456789012345678901', ADMIN_EMAIL: 'worker@example.test', ADMIN_PASSWORD: 'WorkerFixturePassword2026' },
    serviceBindings: { ASSETS: () => new MiniflareResponse('<!doctype html><title>SPA fixture</title>', { headers: { 'Content-Type': 'text/html' } }) },
    outboundService: async request => {
      const url = new URL(request.url);
      if (url.hostname === 'challenges.cloudflare.com') return MiniflareResponse.json({ success: verifyValid, hostname: 'eucove.com', action: 'enquiry' });
      assert.equal(url.hostname, 'api.telegram.org', 'Unexpected network call blocked');
      sent.push(await request.json() as { text: string; chat_id: string });
      if (telegramMode === '429') return MiniflareResponse.json({ ok: false, error_code: 429, parameters: { retry_after: 90 } }, { status: 429 });
      if (telegramMode === 'error') return MiniflareResponse.json({ ok: false, error_code: 500 }, { status: 500 });
      return MiniflareResponse.json({ ok: true });
    },
  }));
  let adminCookie = ''; let managerCookie = ''; let assistantCookie = ''; let propertyId = ''; let leadId = ''; let managerId = '';
  let serial = 0;
  const request = async (url: string, method = 'GET', body?: unknown, cookie = '', ip?: string) => {
    const response = await mf.dispatchFetch('https://eucove.com' + url, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', Origin: 'https://eucove.com', 'CF-Connecting-IP': ip || `192.0.2.${++serial % 250 + 1}`, ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { response, body: response.headers.get('content-type')?.includes('application/json') ? await response.json() as any : null };
  };
  const input = { name: '=Worker Owner', contact: '+61 400 222 991', city: 'Brisbane', service: 'manage', language: 'zh', consent: true, preferredAdvisorId: 'andy-xiang', offerInterest: true, salutation: 'ms', requestId: randomUUID() };
  const property = { title: { zh: '测试住宅', en: 'Fixture home' }, description: { zh: '', en: '' }, address: '1 Fixture Street', city: 'Brisbane', suburb: 'Fixture', postcode: '4000', type: 'house', status: 'rent', price: 700, priceLabel: { zh: '', en: '' }, beds: 3, baths: 2, cars: 1, area: null, images: [], floorplan: '', tourUrl: '', tourKind: 'none', published: false, events: [] };
  try {
    const db = await mf.getD1Database('DB');
    await applyTestMigrations(db);
    await t.test('SPA/security headers, canonical www redirect, API errors and private sample gates', async () => {
      const spa = await mf.dispatchFetch('https://eucove.com/advisory'); assert.equal(spa.status, 200); assert.match(await spa.text(), /SPA fixture/);
      assert.equal(spa.headers.get('x-content-type-options'), 'nosniff'); assert.match(spa.headers.get('content-security-policy')!, /frame-ancestors 'none'/);
      const csp = spa.headers.get('content-security-policy')!;
      const frames = csp.split(';').find(d => d.trim().startsWith('frame-src '))!;
      assert.match(frames, /https:\/\/www\.openstreetmap\.org(?:\s|$)/);
      assert.equal(frames.includes('*.openstreetmap.org'), false);
      assert.match(csp, /script-src 'self'(?:;|$)/);
      assert.match(csp, /connect-src 'self' https:\/\/analytics\.jiangyuan\.org(?:;|$)/);
      const www = await mf.dispatchFetch('https://www.eucove.com/advisory?a=1', { redirect: 'manual' }); assert.equal(www.status, 308); assert.equal(www.headers.get('location'), 'https://eucove.com/advisory?a=1');
      for (const url of ['/api/missing', '/api/market-reference', '/api/viewing-samples/reference-3600395/photo/room-1-living.jpg', '/data/viewing-source/reference-3600395/manifest.json', '/3d-preview', '/3d-preview/index.html', '/depth/interior.webp', '/brand-concepts/index.html', '/reference-media/source.jpg']) assert.equal((await request(url)).response.status, 404);
      const evil = await mf.dispatchFetch('https://eucove.com/api/leads', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); assert.equal(evil.status, 403); assert.equal(evil.headers.has('access-control-allow-origin'), false);
      assert.equal((await request('/api/admin/leads')).response.status, 401);
      assert.equal((await request('/api/leads', 'POST', { ...input, consent: false })).response.status, 400);
      assert.equal((await request('/api/leads', 'POST', { ...input, listingId: 'reference-999999999999' })).response.status, 400);
    });
    await t.test('bootstrap/login/logout sessions use HttpOnly signed secure cookies', async () => {
      const login = await request('/api/admin/login', 'POST', { email: 'worker@example.test', password: 'WorkerFixturePassword2026' }); assert.equal(login.response.status, 200, JSON.stringify(login.body));
      adminCookie = login.response.headers.get('set-cookie')!.split(';')[0]; assert.match(login.response.headers.get('set-cookie')!, /HttpOnly/); assert.match(login.response.headers.get('set-cookie')!, /Secure/); assert.equal(login.body.user.password_hash, undefined);
      assert.equal((await request('/api/admin/session', 'GET', undefined, adminCookie)).body.user.role, 'admin');
      assert.equal((await request('/api/admin/session', 'GET', undefined, adminCookie + 'x')).body.user, null);
    });
    await t.test('existing scrypt users log in inside workerd and upgrade to Web Crypto hashes', async () => {
      const salt = 'ab'.repeat(16); const password = 'LegacyFixturePassword2026';
      await db.prepare('INSERT INTO users(id,name,email,password_hash,role,city,created_at) VALUES(?,?,?,?,?,?,?)').bind('legacy', 'Legacy', 'legacy@example.test', salt + ':' + scryptSync(password, salt, 64).toString('hex'), 'assistant', 'Perth', new Date().toISOString()).run();
      const result = await request('/api/admin/login', 'POST', { email: 'legacy@example.test', password }); assert.equal(result.response.status, 200, JSON.stringify(result.body));
      const row = await db.prepare('SELECT password_hash FROM users WHERE id=?').bind('legacy').first<{ password_hash: string }>(); assert.match(row!.password_hash, /^pbkdf2-sha256\$/);
    });
    await t.test('roles/city scopes and published property contracts match Node API', async () => {
      for (const [role, email, city] of [['manager', 'manager@example.test', 'Sydney'], ['assistant', 'assistant@example.test', 'Brisbane']]) {
        const created = await request('/api/admin/users', 'POST', { name: role, email, city, role, password: 'CityFixturePassword2026' }, adminCookie); assert.equal(created.response.status, 201);
        const login = await request('/api/admin/login', 'POST', { email, password: 'CityFixturePassword2026' });
        if (role === 'manager') { managerId = created.body.user.id; managerCookie = login.response.headers.get('set-cookie')!.split(';')[0]; } else assistantCookie = login.response.headers.get('set-cookie')!.split(';')[0];
      }
      const created = await request('/api/admin/properties', 'POST', property, adminCookie); assert.equal(created.response.status, 201); propertyId = created.body.property.id;
      assert.equal((await request('/api/properties')).body.properties.length, 0); assert.equal((await request('/api/properties/' + propertyId)).response.status, 404);
      assert.equal((await request('/api/admin/properties/' + propertyId, 'PUT', { ...property, published: true }, managerCookie)).response.status, 404);
      assert.equal((await request('/api/admin/properties', 'POST', property, assistantCookie)).response.status, 403);
      assert.equal((await request('/api/admin/properties/' + propertyId, 'PUT', { ...property, published: true }, adminCookie)).response.status, 200);
      assert.equal((await request('/api/properties?city=Brisbane&beds=3&maxPrice=700')).body.properties.length, 1); assert.equal((await request('/api/properties?minPrice=bad')).response.status, 400);
    });
    await t.test('concurrent identical leads create one owner, lead and atomic outbox; edited replay conflicts', async () => {
      const payload = { ...input, propertyId };
      const results = await Promise.all(Array.from({ length: 5 }, () => request('/api/leads', 'POST', payload)));
      assert.equal(results.filter(result => result.response.status === 201).length, 1, JSON.stringify(results.map(r => r.body))); assert.equal(results.filter(result => result.response.status === 200).length, 4);
      leadId = results[0].body.id; assert.ok(results.every(result => result.body.id === leadId));
      for (const table of ['owners', 'leads', 'notifications']) assert.equal((await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>())!.n, 1);
      await request('/api/admin/properties/' + propertyId, 'PUT', property, adminCookie);
      assert.equal((await request('/api/leads', 'POST', payload)).body.id, leadId);
      assert.equal((await request('/api/leads', 'POST', { ...payload, name: 'Changed' })).response.status, 409);
      assert.equal((await request('/api/leads', 'POST', { ...payload, contact: '+61400222992', requestId: randomUUID() })).response.status, 400);
      const data = JSON.parse((await db.prepare('SELECT data FROM leads WHERE id=?').bind(leadId).first<{ data: string }>())!.data); assert.equal(data.service, 'management'); assert.equal(data.offerInterest, true);
    });
    await t.test('failing outbox insert rolls back the whole D1 batch', async () => {
      await db.prepare("CREATE TRIGGER block_notification BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT,'fixture outbox failure'); END").run();
      const result = await request('/api/leads', 'POST', { ...input, contact: '+61400222993', requestId: randomUUID() }); assert.equal(result.response.status, 500);
      await db.prepare('DROP TRIGGER block_notification').run();
      assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM leads').first<{ n: number }>())!.n, 1); assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM owners').first<{ n: number }>())!.n, 1);
    });
    await t.test('admin lead details, assignments, scoped export and retry permissions', async () => {
      assert.equal((await request('/api/admin/leads', 'GET', undefined, managerCookie)).body.leads.length, 0);
      assert.equal((await request('/api/admin/leads/' + leadId, 'PATCH', { status: 'contacted' }, managerCookie)).response.status, 404);
      assert.equal((await request('/api/admin/leads/' + leadId, 'PATCH', { assignedTo: managerId }, assistantCookie)).response.status, 403);
      assert.equal((await request('/api/admin/leads/' + leadId, 'PATCH', { assignedTo: managerId }, adminCookie)).response.status, 400);
      const patched = await request('/api/admin/leads/' + leadId, 'PATCH', { status: 'following', notes: 'Fixture follow-up', nextFollowUp: null }, assistantCookie); assert.equal(patched.response.status, 200); assert.equal(patched.body.lead.nextFollowUp, '');
      assert.equal(patched.body.lead.preferredAdvisorName, 'Andy Xiang'); assert.equal(patched.body.lead.serviceGroup, 'rental');
      const csv = await mf.dispatchFetch('https://eucove.com/api/admin/export/leads', { headers: { Cookie: adminCookie } }); assert.match(await csv.text(), /'=Worker Owner/);
      assert.equal((await request('/api/admin/notifications/retry', 'POST', {}, assistantCookie)).response.status, 403);
    });
    await t.test('R2 upload validates bytes and serves only random image keys', async () => {
      const form = new FormData(); form.append('file', new Blob([new Uint8Array([255,216,255,225,0,1,2])], { type: 'image/jpeg' }), '原始二维码.jpg');
      const serialized = new Request('https://eucove.com/api/admin/uploads', { method: 'POST', body: form });
      const response = await mf.dispatchFetch(serialized.url, { method: 'POST', headers: { Origin: 'https://eucove.com', Cookie: adminCookie, 'Content-Type': serialized.headers.get('Content-Type')! }, body: new Uint8Array(await serialized.arrayBuffer()) });
      const body = await response.json() as { url: string;originalFileName:string }; assert.equal(response.status, 201, JSON.stringify(body)); assert.equal(body.originalFileName,'原始二维码.jpg'); const image = await mf.dispatchFetch('https://eucove.com' + body.url); assert.equal(image.status, 200); assert.equal(image.headers.get('content-type'), 'image/jpeg'); assert.equal((await image.arrayBuffer()).byteLength, 7);
      const bad = new FormData(); bad.append('file', new Blob(['<svg>bad</svg>'], { type: 'image/jpeg' }), 'bad.jpg');
      const badRequest = new Request('https://eucove.com/api/admin/uploads', { method: 'POST', body: bad });
      assert.equal((await mf.dispatchFetch(badRequest.url, { method: 'POST', headers: { Origin: 'https://eucove.com', Cookie: adminCookie, 'Content-Type': badRequest.headers.get('Content-Type')! }, body: new Uint8Array(await badRequest.arrayBuffer()) })).status, 400);
      assert.equal((await request('/uploads/manifest.json')).response.status, 404);
    });
    await t.test('notification leases exclude overlapping delivery and format Chinese service preferences', async () => {
      assert.equal(sent.length, 0);
      await Promise.all([request('/__test/notify'), request('/__test/notify')]); assert.equal(sent.length, 1);
      assert.doesNotMatch(sent[0].text, /指定顾问：|咨询限时优惠：|https?:|编号：/); assert.match(sent[0].text, /长期托管/); assert.equal(sent[0].text.includes(input.contact), true); assert.match(sent[0].text, /【客户姓名】=Worker Owner\n【客户性别】女（女士）\n/); assert.match(sent[0].text, /【房屋所在城市】布里斯班/);
      assert.equal((await db.prepare('SELECT status FROM notifications').first<{ status: string }>())!.status, 'sent');
    });
    await t.test('retry ceiling, expired leases, 429 delay and manual retry are durable', async () => {
      telegramMode = 'error'; await db.prepare("UPDATE notifications SET status='pending',attempts=0,next_attempt=0,claimed_until=?").bind(Date.now() + 60000).run();
      await request('/__test/notify'); assert.equal(sent.length, 1);
      await db.prepare('UPDATE notifications SET claimed_until=0').run();
      for (let i = 0; i < 5; i++) { await request('/__test/notify'); await db.prepare('UPDATE notifications SET next_attempt=0').run(); }
      assert.equal(sent.length, 6); const failed = await db.prepare('SELECT status,attempts FROM notifications').first<{ status: string; attempts: number }>(); assert.equal(failed!.status, 'failed'); assert.equal(failed!.attempts, 5);
      await request('/__test/notify'); assert.equal(sent.length, 6);
      assert.equal((await request('/api/admin/notifications/retry', 'POST', {}, adminCookie)).body.queued, 1);
      telegramMode = '429'; await request('/__test/notify'); const delayed = await db.prepare('SELECT next_attempt FROM notifications').first<{ next_attempt: number }>(); assert.ok(delayed!.next_attempt > Date.now() + 80000);
      await request('/__test/notify'); assert.equal(sent.length, 7);
      await db.prepare('UPDATE notifications SET next_attempt=0').run(); telegramMode = 'ok'; await request('/__test/notify'); assert.equal(sent.length, 8);
    });
    await t.test('optional Turnstile checks and persistent per-IP limits', async () => {
      const payload = { ...input, requestId: randomUUID() };
      assert.equal((await request('/__test/turnstile/api/leads', 'POST', payload)).response.status, 400);
      verifyValid = false; assert.equal((await request('/__test/turnstile/api/leads', 'POST', { ...payload, turnstileToken: 'fixture' })).response.status, 400);
      verifyValid = true; assert.equal((await request('/__test/turnstile/api/leads', 'POST', { ...payload, turnstileToken: 'fixture' })).response.status, 201);
      for (let i = 0; i < 15; i++) assert.notEqual((await request('/api/leads', 'POST', { ...input, consent: false }, '', '198.51.100.1')).response.status, 429);
      assert.equal((await request('/api/leads', 'POST', input, '', '198.51.100.1')).response.status, 429);
    });
    await t.test('cron cleans expired state; logout invalidates the persisted session', async () => {
      await db.prepare("INSERT INTO rate_limits(key,count,expires_at) VALUES('expired',1,0)").run(); await request('/__test/cron');
      assert.equal(await db.prepare("SELECT key FROM rate_limits WHERE key='expired'").first(), null);
      assert.equal((await request('/api/admin/logout', 'POST', {}, adminCookie)).response.status, 200); assert.equal((await request('/api/admin/leads', 'GET', undefined, adminCookie)).response.status, 401);
    });
  } finally { await mf.dispose(); rmSync(directory, { recursive: true, force: true }); }
});
