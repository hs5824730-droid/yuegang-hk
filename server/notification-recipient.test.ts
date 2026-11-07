import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { applyTestMigrations } from './test-migrations.js';
import { ensureNotificationRecipient, recipientFromTarget } from './notification-recipient.js';
import { assignReception, saveReception, type ReceptionDB } from './reception.js';
import { deliverOutbox } from './notification-delivery.js';
import { deliverSignal } from './signal-delivery.js';
import { deliverDirectContacts } from './direct-contact-notifications.js';

const migration = readFileSync('migrations/0012_notification_recipients.sql', 'utf8');
const telegram = { token: 'fixture-only', chatId: 'fixture-only', appUrl: 'https://fixture.invalid' };
const signal = { url: 'https://fixture-only.up.railway.app', secret: 'fixture-only-secret-12345678901234567890', appUrl: telegram.appUrl };
function migrate(db: DatabaseSync) {
  for (const file of readdirSync('migrations').filter(f => f.endsWith('.sql')).sort()) db.exec(readFileSync('migrations/' + file, 'utf8'));
}
function adapter(db: DatabaseSync): ReceptionDB {
  return {
    all: async (sql, args = []) => db.prepare(sql).all(...args as any[]) as any[],
    batch: async queries => {
      db.exec('BEGIN IMMEDIATE');
      try { for (const q of queries) db.prepare(q.sql).run(...q.args as any[]); db.exec('COMMIT'); }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
}

async function deliveryChecks(db: ReceptionDB) {
  await db.batch([{ sql: "UPDATE notification_channels SET enabled=1,enabled_at='2026-01-01' WHERE channel='signal'", args: [] }]);
  const create = async (name: string, method = 'phone') => {
    const id = randomUUID(), owner = randomUUID(), requestId = randomUUID();
    await db.batch([
      { sql: 'INSERT INTO owners VALUES(?,?,?,?,?)', args: [owner, owner, '+447700900001', name, '2026-10-26T08:39:25Z'] },
      { sql: 'INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,data,created_at) VALUES(?,?,?,?,?,?,?,?)', args: [id, requestId, 'fixture', owner, 'Hong Kong Island', 'letting', JSON.stringify({ name, contact: '+447700900001', contactMethod: method }), '2026-10-26T08:39:25Z'] },
      { sql: 'INSERT INTO notifications(id,lead_id,sync_enabled) VALUES(?,?,1)', args: [randomUUID(), id] },
      { sql: 'INSERT INTO signal_notifications(id,lead_id) VALUES(?,?)', args: [randomUUID(), id] },
    ]);
    return { id, requestId };
  };
  const saved = () => db.all('SELECT * FROM notification_recipients ORDER BY rowid');
  const position = async () => (await db.all('SELECT position FROM notification_recipient_cursor WHERE id=1'))[0].position;
  const sent: { transport: string; body: any }[] = [], original = globalThis.fetch;
  let failOnce = true;
  globalThis.fetch = (async (url, init) => {
    const hostname = new URL(String(url)).hostname, body = JSON.parse(String(init?.body));
    assert.ok(['api.telegram.org', 'fixture-only.up.railway.app'].includes(hostname));
    const transport = hostname === 'api.telegram.org' ? 'telegram' : 'signal';
    sent.push({ transport, body });
    assert.match(body.text, /接粉人员：/);
    assert.doesNotMatch(body.text, /接粉人员：待分配/);
    if (transport === 'telegram' && failOnce) { failOnce = false; return Response.json({ ok: false, error_code: 500 }, { status: 500 }); }
    return Response.json(transport === 'telegram' ? { ok: true, result: { message_id: 123 } } : { ok: true, timestamp: 123456789 });
  }) as typeof fetch;
  const send = () => Promise.all([deliverOutbox(db, telegram, 20), deliverSignal(db, signal, 20)]);
  try {
    const leads = [];
    for (let i = 0; i < 4; i++) leads.push(await create('虚构回访' + i));
    assert.deepEqual((await saved()).map(r=>r.recipient),['江承裕','江牧','江鹏','江承裕'],'Callback ownership is saved in the intake transaction, before either notification sends');
    await send();
    const expected = ['江承裕', '江牧', '江鹏', '江承裕'];
    assert.deepEqual((await saved()).map(r => r.recipient), expected);
    for (let i = 0; i < 4; i++) {
      const messages = sent.filter(s => s.body.text.includes('虚构回访' + i));
      assert.equal(messages.length, 2);
      assert.equal(messages[0].body.text, messages[1].body.text);
      assert.ok(messages[0].body.text.includes('接粉人员：'+expected[i]));
    }
    await db.batch([{ sql: 'UPDATE notifications SET next_attempt=0', args: [] }]);
    await send();
    assert.equal(sent.length, 9);
    assert.match(sent.at(-1)!.body.text,/接粉人员：江承裕/);
    assert.equal(await position(), 4, 'A failed transport does not consume another turn');
    await send(); assert.equal(sent.length, 9, 'Completed messages are not replayed');

    const qr = { id: randomUUID(), channel: 'wechat', enabled: true, cities: ['Hong Kong Island'], groupId: 'jiang-peng', groupName: '江鹏组', groupOrder: 0, targetOrder: 0, value: '/uploads/' + randomUUID() + '.png', displayName: '二维码昵称' };
    await saveReception(db, { targets: [qr] });
    await assignReception(db, { requestId: randomUUID(), leadRequestId: leads[0].requestId, channel: 'wechat' });
    await send();
    assert.equal(sent.length, 11);
    assert.equal(sent[9].body.text, sent[10].body.text);
    assert.match(sent[9].body.text, /分流名称：二维码昵称\n接粉人员：江承裕（江承裕组）\n北京时间：/);
    assert.match(sent[9].body.text, /北京时间：2026-10-26 16:39:25$/);
    assert.equal(await position(), 4, 'A later destination does not change the callback owner or rotate');

    const routed = await create('虚构已分流', 'wechat');
    await assignReception(db, { requestId: randomUUID(), leadRequestId: routed.requestId, channel: 'wechat' });
    await saveReception(db, { targets: [{ ...qr, groupName: '江牧组' }] });
    await send();
    assert.match(sent.at(-1)!.body.text,/接粉人员：江鹏/);
    assert.equal(await position(), 4, 'Saved assignment group wins over edited configuration');

    // Direct visits use their own stable identity, with the same fallback staff pool.
    await assignReception(db, { requestId: randomUUID(), channel: 'whatsapp', contactMethod: 'phone', source: 'website_direct', pagePath: '/services', city: 'New Territories' });
    await assignReception(db, { requestId: randomUUID(), channel: 'wechat', source: 'website_direct', pagePath: '/services', city: 'Hong Kong Island' });
    await db.batch([{ sql: 'UPDATE direct_contact_notifications SET next_attempt=0', args: [] }]);
    const before = sent.length;
    await Promise.all([deliverDirectContacts(db, 'telegram', telegram), deliverDirectContacts(db, 'signal', signal)]);
    assert.equal(sent.length - before, 4);
    assert.equal(await position(), 5);
    assert.equal((await saved()).filter(r => r.source === 'direct').length, 2);
    for (const city of ['新界', '港島']) {
      const messages = sent.slice(before).filter(s => s.body.text.includes('房屋所在城市】' + city));
      assert.equal(messages.length, 2); assert.equal(messages[0].body.text, messages[1].body.text);
      assert.match(messages[0].body.text,/接粉人员：/);
    }
  } finally { globalThis.fetch = original; }
}

test('recipients SQLite: three-person rotation, both transports, retry, late routing, saved groups and direct visits', async () => {
  const native = new DatabaseSync(':memory:'); migrate(native);
  try { await deliveryChecks(adapter(native)); } finally { native.close(); }
});

test('recipients D1: shared persistent rotation and transport contract under concurrent delivery', async () => {
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default {fetch(){return new Response("fixture")}}', compatibilityDate: '2026-10-23', d1Databases: ['DB'], outboundService: () => { throw Error('External traffic blocked'); } }));
  try {
    const d1 = await mf.getD1Database('DB'); await applyTestMigrations(d1);
    const db: ReceptionDB = { all: async (sql, args = []) => (await d1.prepare(sql).bind(...args).all<any>()).results, batch: async qs => { await d1.batch(qs.map(q => d1.prepare(q.sql).bind(...q.args))); } };
    await deliveryChecks(db);
    const same = await Promise.all(Array.from({ length: 12 }, () => ensureNotificationRecipient(db, 'lead', 'concurrent-fixture', '')));
    assert.deepEqual(new Set(same), new Set(['江鹏']));
    assert.equal((await db.all('SELECT position FROM notification_recipient_cursor'))[0].position, 6);
    const unique = await Promise.all(Array.from({ length: 30 }, (_, i) => ensureNotificationRecipient(db, 'lead', 'parallel-' + i, '')));
    for (const name of ['江承裕', '江牧', '江鹏']) assert.equal(unique.filter(n => n === name).length, 10);
  } finally { await mf.dispose(); }
});

test('fallback migration/restart/export preserve assignment and cursors; failed transactions do not consume turns', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'recipient-export-')), file = path.join(directory, 'fixture.sqlite');
  let db = new DatabaseSync(file); migrate(db);
  try {
    assert.equal(recipientFromTarget({ groupName: ' 江鹏组 ' }), '江鹏');
    assert.equal(recipientFromTarget({ groupId: 'jiang-mu' }), '江牧');
    await ensureNotificationRecipient(adapter(db), 'lead', 'first', '');
    const cursor = db.prepare('SELECT * FROM reception_channel_cursor ORDER BY channel').all();
    db.exec(migration);
    assert.deepEqual(db.prepare('SELECT * FROM reception_channel_cursor ORDER BY channel').all(), cursor);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM notifications').get()!.n, 0);
    db.exec('BEGIN'); db.prepare("INSERT INTO notification_recipients(source,source_id) VALUES('lead','rollback')").run(); db.exec('ROLLBACK');
    db.close(); db = new DatabaseSync(file);
    assert.equal(await ensureNotificationRecipient(adapter(db), 'lead', 'first', ''), '江承裕');
    assert.equal(await ensureNotificationRecipient(adapter(db), 'lead', 'second', ''), '江牧');
    const output = path.join(directory, 'export.sql');
    execFileSync(process.execPath, ['scripts/export-cloudflare-data.mjs', '--database', file, '--out', output], { stdio: 'pipe' });
    const imported = new DatabaseSync(':memory:'); migrate(imported);
    try {
      imported.exec(readFileSync(output, 'utf8'));
      assert.deepEqual(imported.prepare('SELECT * FROM notification_recipients ORDER BY rowid').all(), db.prepare('SELECT * FROM notification_recipients ORDER BY rowid').all());
      assert.equal(await ensureNotificationRecipient(adapter(imported), 'lead', 'third', ''), '江鹏');
    } finally { imported.close(); }
  } finally { db.close(); rmSync(directory, { recursive: true, force: true }); }
});
