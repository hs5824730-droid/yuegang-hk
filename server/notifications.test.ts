import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const directory = mkdtempSync(path.join(tmpdir(), 'eucove-notification-test-'));
Object.assign(process.env, {
  DATABASE_PATH: path.join(directory, 'test.sqlite'), UPLOAD_DIR: path.join(directory, 'uploads'),
  SESSION_SECRET: 'notification-tests-only-12345678901234567890', NODE_ENV: 'test',
  TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '', DISABLE_TELEGRAM: 'true',
});
const { db, transaction } = await import('./db.js');
const { config } = await import('./config.js');
const { queueNotification, deliverNotifications } = await import('./notifications.js');

test('notification outbox: retries, leases and deduplication without network', async t => {
  const originalFetch = globalThis.fetch;
  // All delivery requests in this file are intercepted. Never inherit real credentials.
  config.telegramToken = 'mock-token'; config.telegramChatId = 'mock-chat';
  let calls = 0;
  let respond: () => Promise<Response> = async () => new Response('{"ok":true}');
  globalThis.fetch = (async (url, init) => {
    calls++;
    assert.equal(String(url), 'https://api.telegram.org/botmock-token/sendMessage');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.chat_id, 'mock-chat');
    assert.equal(body.text.includes('+61 400 000 000'), true);
    assert.match(body.text,/【客户姓名】Test/);assert.match(body.text,/【房屋所在城市】Hobart/);assert.equal(body.parse_mode,undefined);
    return respond();
  }) as typeof fetch;
  const createLead = () => {
    const id = randomUUID(); const owner = randomUUID();
    db.prepare('INSERT INTO owners(id,contact_key,contact,name,created_at) VALUES(?,?,?,?,?)').run(owner, owner, '+61 400 000 000', 'Test', new Date().toISOString());
    db.prepare('INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,data,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id, randomUUID(), 'test', owner, 'Hobart', 'letting', '{}', new Date().toISOString());
    queueNotification(id);
    return id;
  };
  const row = (id: string) => db.prepare('SELECT * FROM notifications WHERE lead_id=?').get(id) as Record<string, any>;
  const reset = () => { db.exec('DELETE FROM notifications; DELETE FROM leads; DELETE FROM owners'); calls = 0; };
  try {
    await t.test('duplicate queueing and overlapping delivery send only once', async () => {
      reset(); const id = createLead(); queueNotification(id);
      await Promise.all([deliverNotifications(), deliverNotifications()]);
      assert.equal(calls, 1); assert.equal(row(id).status, 'sent');
      assert.equal(row(id).claimed_until, 0);
      await deliverNotifications(); assert.equal(calls, 1);
    });
    await t.test('active leases exclude a row; expired leases recover it', async () => {
      reset(); const id = createLead();
      db.prepare('UPDATE notifications SET claimed_until=?').run(Date.now() + 60000);
      await deliverNotifications(); assert.equal(calls, 0);
      db.prepare('UPDATE notifications SET claimed_until=?').run(Date.now() - 1);
      await deliverNotifications(); assert.equal(calls, 1); assert.equal(row(id).status, 'sent');
    });
    await t.test('HTTP, API, malformed JSON and network failures stop after five attempts', async () => {
      for (const response of [
        async () => new Response('{"ok":false,"error_code":500}', { status: 500 }),
        async () => new Response('{"ok":false,"error_code":400}'),
        async () => new Response('not json'),
        async () => { throw new Error('simulated network timeout'); },
      ]) {
        reset(); const id = createLead(); respond = response;
        for (let attempt = 1; attempt <= 5; attempt++) {
          await deliverNotifications();
          assert.equal(row(id).attempts, attempt);
          assert.equal(row(id).status, attempt === 5 ? 'failed' : 'pending');
          assert.equal(row(id).claimed_until, 0);
          assert.ok(row(id).next_attempt > Date.now());
          await deliverNotifications(); assert.equal(calls, attempt, 'Must not retry before the deadline');
          db.exec('UPDATE notifications SET next_attempt=0');
        }
        await deliverNotifications(); assert.equal(calls, 5);
        assert.equal((db.prepare('SELECT COUNT(*) AS n FROM leads').get() as any).n, 1);
      }
    });
    await t.test('429 updates attempts and defers the whole pending batch', async () => {
      reset(); const id = createLead(); const second = createLead();
      respond = async () => new Response('{"ok":false,"error_code":429,"parameters":{"retry_after":120}}', { status: 429 });
      const before = Date.now(); await deliverNotifications();
      assert.equal(calls, 1); assert.equal(row(id).attempts, 1);
      assert.equal(row(id).last_error, 'telegram_429');
      assert.ok(row(id).next_attempt >= before + 120000);
      assert.ok(row(second).next_attempt >= before + 120000);
      await deliverNotifications(); assert.equal(calls, 1);
    });
    await t.test('manually requeued failure succeeds without creating another lead', async () => {
      reset(); const id = createLead();
      db.exec("UPDATE notifications SET status='failed',attempts=5");
      db.exec("UPDATE notifications SET status='pending',attempts=0,next_attempt=0 WHERE status='failed'");
      respond = async () => new Response('{"ok":true}');
      await deliverNotifications(); assert.equal(row(id).status, 'sent');
      assert.equal(calls, 1);
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM leads').get() as any).n, 1);
    });
    await t.test('transaction rolls back the lead and owner if its outbox cannot persist', () => {
      reset();
      db.exec("CREATE TRIGGER reject_outbox BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT,'simulated disk failure'); END");
      try { assert.throws(() => transaction(createLead), /simulated disk failure/); }
      finally { db.exec('DROP TRIGGER reject_outbox'); }
      for (const table of ['owners', 'leads', 'notifications']) assert.equal((db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as any).n, 0);
    });
  } finally {
    globalThis.fetch = originalFetch; config.telegramToken = ''; config.telegramChatId = ''; db.close();
  }
});
