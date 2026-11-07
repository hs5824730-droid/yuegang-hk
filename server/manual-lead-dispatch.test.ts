import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions, Response as MFResponse } from 'miniflare';
import { applyTestMigrations } from './test-migrations.js';
import type { ReceptionDB } from './reception.js';
import { deliverOutbox } from './notification-delivery.js';
import { deliverSignal } from './signal-delivery.js';
import { deliverDirectContacts } from './direct-contact-notifications.js';
import { ingestMail, deliverMailNotifications } from './enterprise-mail.js';
import { telegramDispatch, TELEGRAM_DISPATCH_PATH, syncDispatchTelegram } from './manual-lead-dispatch.js';

const telegram = { token: 'fixture', chatId: '12345', appUrl: 'https://eucove.com', webhookSecret: 'fixture-webhook-secret-12345678901234567890' };
const signal = { url: 'https://fixture.up.railway.app', secret: 'fixture-relay-secret-12345678901234567890', appUrl: telegram.appUrl };
function callback(id: string, index = 1, user = 12345, messageId = 100) {
  return { update_id: 1, callback_query: { id: 'fixture-callback', from: { id: user }, data: `assign:${id}:${index}`, message: { message_id: messageId, chat: { id: 12345, type: 'private' } } } };
}
function request(body: unknown, secret = telegram.webhookSecret) {
  return new Request(telegram.appUrl + TELEGRAM_DISPATCH_PATH, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': secret }, body: JSON.stringify(body) });
}
async function createLead(db: ReceptionDB, id: string) {
  await db.batch([
    { sql: 'INSERT INTO owners(id,contact_key,contact,name,created_at) VALUES(?,?,?,?,?)', args: [id, id, '+447700900001', '虚构客户', '2026-10-30T10:00:00Z'] },
    { sql: 'INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,data,created_at) VALUES(?,?,?,?,?,?,?,?)', args: [id, id, 'fixture', id, 'Hong Kong Island', 'letting', JSON.stringify({ name: '虚构客户', contact: '+447700900001', contactMethod: 'phone' }), '2026-10-30T10:00:00Z'] },
    { sql: 'INSERT INTO notifications(id,lead_id,sync_enabled) VALUES(?,?,1)', args: [id, id] },
    { sql: 'INSERT INTO signal_notifications(id,lead_id) VALUES(?,?)', args: [id, id] },
  ]);
}
async function checks(db: ReceptionDB) {
  for(const [i,name] of ['江承裕','江牧','江鹏'].entries())await db.batch([{sql:"INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES(?,?,?,'fixture','mail','2026-11-07T00:00:00Z')",args:['staff-'+i,name,'staff-'+i+'@example.test']}]);
  await createLead(db, 'historical');
  const before = (await db.all('SELECT position FROM notification_recipient_cursor'))[0].position;
  await db.batch([{ sql: 'UPDATE lead_dispatch_settings SET enabled=1 WHERE id=1', args: [] }]);
  await createLead(db, 'manual');
  const [dispatch] = await db.all("SELECT * FROM manual_lead_dispatch WHERE source_id='manual'");
  assert.ok(dispatch);
  assert.equal((await db.all('SELECT COUNT(*) n FROM manual_lead_dispatch'))[0].n, 1, 'No backfill');
  assert.equal((await db.all('SELECT position FROM notification_recipient_cursor'))[0].position, before, 'Manual intake does not consume a rotation');
  // Exclude the historical fixture from this delivery check, without modifying its saved owner.
  await db.batch([{ sql: "UPDATE notifications SET status='sent',delivered_revision=revision WHERE lead_id='historical'", args: [] }, { sql: "UPDATE signal_notifications SET status='sent',delivered_revision=revision WHERE lead_id='historical'", args: [] }]);
  const calls: { method: string; body: any }[] = [];
  const original = globalThis.fetch; let failEdit = false, failSignal = false;
  globalThis.fetch = (async (url, init) => {
    const parsed = new URL(String(url)), body = JSON.parse(String(init?.body));
    const method = parsed.hostname === 'api.telegram.org' ? parsed.pathname.split('/').at(-1)! : 'signal';
    assert.ok(parsed.hostname === 'api.telegram.org' || parsed.hostname === 'fixture.up.railway.app', 'All unexpected network is blocked');
    calls.push({ method, body });
    if (method === 'editMessageText' && failEdit) throw Error('fixture network failure');
    if (method === 'signal' && failSignal) return Response.json({ error: 'busy' }, { status: 429 });
    return Response.json(method === 'signal' ? { ok: true, timestamp: 1234567890 } : { ok: true, result: { message_id: 100 } });
  }) as typeof fetch;
  try {
    await deliverSignal(db, signal); assert.equal(calls.length, 0, 'No Signal before a choice');
    assert.equal((await db.all("SELECT attempts FROM signal_notifications WHERE lead_id='manual'"))[0].attempts, 0);
    await deliverOutbox(db, telegram);
    const initial = calls.find(c => c.method === 'sendMessage')!.body;
    assert.match(initial.text, /接粉人员：待你选择/);
    assert.deepEqual(initial.reply_markup.inline_keyboard[0].map((b: any) => b.text), ['江承裕', '江牧', '江鹏']);
    assert.ok(initial.reply_markup.inline_keyboard[0].every((b: any) => Buffer.byteLength(b.callback_data) <= 64));
    assert.equal((await telegramDispatch(request(callback(dispatch.id), 'wrong'), db, telegram)).status, 401);
    await telegramDispatch(request(callback(dispatch.id, 1, 98765)), db, telegram);
    await telegramDispatch(request(callback(dispatch.id, 1, 12345, 999)), db, telegram);
    assert.equal((await db.all('SELECT selected_at FROM manual_lead_dispatch WHERE id=?', [dispatch.id]))[0].selected_at, null);
    await Promise.all([telegramDispatch(request(callback(dispatch.id)), db, telegram), telegramDispatch(request(callback(dispatch.id)), db, telegram)]);
    await telegramDispatch(request(callback(dispatch.id, 2)), db, telegram);
    assert.equal((await db.all("SELECT recipient FROM notification_recipients WHERE source_id='manual'"))[0].recipient, '江牧', 'First choice is durable and cannot be reassigned by replay');
    const [backendOwner]=await db.all("SELECT assigned_to,status FROM leads WHERE id='manual'");
    assert.equal(backendOwner.assigned_to,'staff-1');assert.equal(backendOwner.status,'contacted');
    assert.equal((await db.all('SELECT position FROM notification_recipient_cursor'))[0].position, before);
    failEdit = true;
    await syncDispatchTelegram(db, telegram);
    assert.equal((await db.all('SELECT telegram_dirty FROM manual_lead_dispatch WHERE id=?', [dispatch.id]))[0].telegram_dirty, 1);
    failSignal = true; await deliverSignal(db, signal);
    assert.equal((await db.all("SELECT status FROM signal_notifications WHERE lead_id='manual'"))[0].status, 'pending');
    await db.batch([{ sql: 'UPDATE signal_notifications SET next_attempt=0', args: [] }]);
    failSignal = false; await Promise.all([deliverSignal(db, signal), deliverSignal(db, signal)]);
    assert.equal(calls.filter(c => c.method === 'signal').length, 2, 'One failed attempt and one successful attempt');
    assert.match(calls.filter(c => c.method === 'signal').at(-1)!.body.text, /接粉人员：江牧（江牧组）/);
    assert.equal(calls.filter(c => c.method === 'signal')[0].body.id, calls.filter(c => c.method === 'signal')[1].body.id, 'Retry preserves relay identity');
    await deliverSignal(db, signal); assert.equal(calls.filter(c => c.method === 'signal').length, 2);
    failEdit = false; await db.batch([{ sql: 'UPDATE manual_lead_dispatch SET telegram_next_attempt=0', args: [] }]);
    await syncDispatchTelegram(db, telegram);
    const edit = calls.filter(c => c.method === 'editMessageText').at(-1)!.body;
    assert.match(edit.text, /江牧（江牧组）/); assert.deepEqual(edit.reply_markup.inline_keyboard, []);
    assert.equal((await db.all('SELECT telegram_dirty FROM manual_lead_dispatch WHERE id=?', [dispatch.id]))[0].telegram_dirty, 0);

    await ingestMail(db, 'fixture', { messageId: 'mail1', threadId: 'thread1', folderId: 'inbox', fromAddress: 'customer@example.test', sender: '虚构客户', subject: '咨询', receivedTime: String(Date.now()) }, '虚构邮件', ['telegram', 'signal']);
    const [mail] = await db.all("SELECT * FROM manual_lead_dispatch WHERE source='mail'");
    const count = calls.filter(c => c.method === 'signal').length;
    await deliverMailNotifications(db, 'signal', { signal }); assert.equal(calls.filter(c => c.method === 'signal').length, count);
    assert.equal((await db.all('SELECT recipient FROM mail_threads'))[0].recipient, '');
    await deliverMailNotifications(db, 'telegram', telegram);
    await telegramDispatch(request(callback(mail.id, 2)), db, telegram);
    await deliverMailNotifications(db, 'signal', { signal });
    assert.match(calls.filter(c => c.method === 'signal').at(-1)!.body.text, /接粉人员：江鹏/);
    assert.equal((await db.all('SELECT recipient FROM mail_threads'))[0].recipient, '江鹏');
    await db.batch([
      { sql: "UPDATE notification_channels SET enabled=1,enabled_at='2026-01-01' WHERE channel='signal'", args: [] },
      { sql: "INSERT INTO reception_channel_assignments(id,channel,request_id,direct_context,created_at) VALUES('direct-fixture','wechat','direct-fixture',?,?)", args: [JSON.stringify({ source: 'website_direct', contactMethod: 'wechat' }), new Date().toISOString()] },
      { sql: 'UPDATE direct_contact_notifications SET next_attempt=0', args: [] },
    ]);
    const [direct] = await db.all("SELECT * FROM manual_lead_dispatch WHERE source='direct'");
    const signalBeforeDirect = calls.filter(c => c.method === 'signal').length;
    await deliverDirectContacts(db, 'signal', signal);
    assert.equal(calls.filter(c => c.method === 'signal').length, signalBeforeDirect);
    await deliverDirectContacts(db, 'telegram', telegram);
    await telegramDispatch(request(callback(direct.id, 0)), db, telegram);
    await deliverDirectContacts(db, 'signal', signal);
    assert.equal(calls.filter(c => c.method === 'signal').length, signalBeforeDirect + 1);
    assert.match(calls.filter(c => c.method === 'signal').at(-1)!.body.text, /接粉人员：江承裕（江承裕组）/);
    assert.equal((await db.all('SELECT position FROM notification_recipient_cursor'))[0].position, before);
    assert.equal((await db.all("SELECT recipient FROM notification_recipients WHERE source_id='historical'"))[0].recipient, '江承裕');
  } finally { globalThis.fetch = original; }
}
test('manual dispatch SQLite: future intake, owner-only choice, first-choice wins, Signal gate, retries and mail', async () => {
  const native = new DatabaseSync(':memory:');
  for (const file of readdirSync('migrations').filter(f => f.endsWith('.sql')).sort()) native.exec(readFileSync('migrations/' + file, 'utf8'));
  const db: ReceptionDB = { all: async (sql, args = []) => native.prepare(sql).all(...args as any[]) as any[], batch: async qs => { native.exec('BEGIN'); try { for (const q of qs) native.prepare(q.sql).run(...q.args as any[]); native.exec('COMMIT'); } catch (e) { native.exec('ROLLBACK'); throw e; } } };
  try { await checks(db); } finally { native.close(); }
});
test('manual dispatch real D1 and Worker webhook: authenticated callback bypasses browser Origin only on its own route', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'manual-dispatch-')), bundle = path.join(directory, 'worker.mjs');
  await build({ entryPoints: ['worker/index.ts'], outfile: bundle, bundle: true, format: 'esm', platform: 'browser', target: 'es2023', external: ['node:*'], logLevel: 'silent' });
  const outbound: string[] = [];
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, scriptPath: bundle, compatibilityDate: '2026-10-23', compatibilityFlags: ['nodejs_compat'], d1Databases: ['DB'], r2Buckets: ['MEDIA'], bindings: { APP_URL: telegram.appUrl, TELEGRAM_BOT_TOKEN: telegram.token, TELEGRAM_CHAT_ID: telegram.chatId, TELEGRAM_DISPATCH_WEBHOOK_SECRET: telegram.webhookSecret, DISABLE_TELEGRAM: 'false', SIGNAL_ENABLED: 'true', SIGNAL_RELAY_URL: signal.url, SIGNAL_RELAY_SECRET: signal.secret, MAIL_ENABLED: 'false', PUBLIC_DIRECT_CONTACT_ENABLED: 'false' }, serviceBindings: { ASSETS: () => new MFResponse('fixture') }, outboundService: async req => {
    const url = new URL(req.url); outbound.push(url.hostname);
    assert.ok(['api.telegram.org', 'fixture.up.railway.app'].includes(url.hostname));
    return MFResponse.json(url.hostname === 'api.telegram.org' ? { ok: true, result: { message_id: 100 } } : { ok: true, timestamp: 1234567890 });
  } }));
  try {
    const d1 = await mf.getD1Database('DB'); await applyTestMigrations(d1);
    const db: ReceptionDB = { all: async (sql, args = []) => (await d1.prepare(sql).bind(...args).all()).results as any[], batch: async qs => { await d1.batch(qs.map(q => d1.prepare(q.sql).bind(...q.args))); } };
    await checks(db);
    await createLead(db, 'webhook');
    const [row] = await db.all("SELECT * FROM manual_lead_dispatch WHERE source_id='webhook'");
    const send = (secret: string) => mf.dispatchFetch(telegram.appUrl + TELEGRAM_DISPATCH_PATH, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': secret }, body: JSON.stringify(callback(row.id)) });
    assert.equal((await send('wrong')).status, 401);
    assert.equal((await send(telegram.webhookSecret)).status, 200);
    assert.equal((await db.all("SELECT recipient FROM manual_lead_dispatch WHERE source_id='webhook'"))[0].recipient, '江牧');
    for (let i = 0; i < 40 && !outbound.includes('fixture.up.railway.app'); i++) await new Promise(resolve => setTimeout(resolve, 25));
    assert.ok(outbound.includes('fixture.up.railway.app'), 'Webhook waitUntil starts Signal delivery');
    const forbidden = await mf.dispatchFetch(telegram.appUrl + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(forbidden.status, 403, 'Normal write routes still require browser Origin');
  } finally { await mf.dispose(); }
});
