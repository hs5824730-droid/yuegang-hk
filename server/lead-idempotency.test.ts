import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const directory = mkdtempSync(path.join(tmpdir(), 'eucove-lead-retry-test-'));
Object.assign(process.env, {
  DATABASE_PATH: path.join(directory, 'test.sqlite'), UPLOAD_DIR: path.join(directory, 'uploads'),
  SESSION_SECRET: 'lead-retry-tests-only-12345678901234567890', NODE_ENV: 'test',
  ADMIN_EMAIL: '', ADMIN_PASSWORD: '', DISABLE_TELEGRAM: 'true', APP_URL: 'http://localhost:5173',
});
const { createApp } = await import('./app.js');
const { db } = await import('./db.js');

test('lead retries: concurrent requests and changed property visibility preserve one enquiry', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const propertyId = randomUUID();
  db.prepare('INSERT INTO properties(id,city,published,data,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(propertyId, 'Brisbane', 1, '{}', '2026-10-23', '2026-10-23');
  const input = { name: 'Retry test', contact: '+61 400 000 001', city: 'Brisbane', service: 'letting', language: 'zh', consent: true, website: '', requestId: randomUUID(), propertyId };
  const submit = async (body = input) => {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/leads`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' }, body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as { id?: string } };
  };
  try {
    const responses = await Promise.all(Array.from({ length: 5 }, () => submit()));
    assert.equal(responses.filter(result => result.status === 201).length, 1);
    assert.equal(responses.filter(result => result.status === 200).length, 4);
    const id = responses[0].body.id;
    assert.ok(id); assert.ok(responses.every(result => result.body.id === id));
    db.prepare('UPDATE properties SET published=0 WHERE id=?').run(propertyId);
    const retry = await submit(); assert.equal(retry.status, 200); assert.equal(retry.body.id, id);
    assert.equal((await submit({ ...input, name: 'Changed details' })).status, 409);
    for (const table of ['leads', 'notifications', 'owners']) assert.equal((db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as any).n, 1);
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close();
  }
});
