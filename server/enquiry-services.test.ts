import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ADVISORS, normalizeServiceQuery, PUBLIC_SERVICES, SERVICES } from '../src/enquiry-options.js';

const directory = mkdtempSync(path.join(tmpdir(), 'eucove-service-test-'));
Object.assign(process.env, { DATABASE_PATH: path.join(directory, 'test.sqlite'), UPLOAD_DIR: path.join(directory, 'uploads'),
  SESSION_SECRET: 'service-tests-only-12345678901234567890', NODE_ENV: 'test', DISABLE_TELEGRAM: 'true',
  TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '', ADMIN_EMAIL: 'service@example.test', ADMIN_PASSWORD: 'ServiceTestPassword2026', APP_URL: 'http://localhost:5173' });
const { leadSchema } = await import('./schema.js');
const { createApp } = await import('./app.js');
const { db } = await import('./db.js');
const { config } = await import('./config.js');
const { deliverNotifications } = await import('./notifications.js');
const base = { name: 'Service Test', contact: '+61 400 000 099', city: 'Brisbane', service: 'letting', language: 'zh', consent: true, requestId: randomUUID() };

test('service vocabulary: all groups, legacy aliases and advisory URL aliases', () => {
  for (const service of [...PUBLIC_SERVICES, 'moving']) assert.equal(leadSchema.parse({ ...base, service }).service, service);
  for (const [input, output] of Object.entries({ rent: 'letting', manage: 'management', sell: 'selling', buy: 'buying', care: 'house-care' })) assert.equal(leadSchema.parse({ ...base, service: input }).service, output);
  assert.equal(leadSchema.parse({ ...base, service: 'buying' }).service, 'buying');
  assert.equal(normalizeServiceQuery('buying'), 'buyer-advisory'); assert.equal(normalizeServiceQuery('care'), 'house-care');
  assert.equal(normalizeServiceQuery('buy'), 'buying'); assert.equal(normalizeServiceQuery('__proto__'), undefined);
  for (const service of PUBLIC_SERVICES) assert.ok(['rental', 'sales', 'advisory', 'other'].includes(SERVICES[service].group));
});
test('new optional fields validate contacts, preference and sensible bounds', () => {
  for (const input of [
    { contactMethod: 'email', contact: 'owner@example.test' }, { contact: 'owner@example.test' },
    { contactMethod: 'wechat', contact: 'Owner_2026' }, { contactMethod: 'whatsapp', contact: '+86 138 0000 0000' },
    { propertyType: 'house', bedrooms: 0, offerInterest: true, preferredAdvisorId: ADVISORS[0].id },
    { service: 'renovation', needSummary: 'Kitchen and paint', startTime: '1-3-months' },
    { service: 'buyer-advisory', budgetRange: 'A$800,000–1,000,000' },
  ]) assert.equal(leadSchema.safeParse({ ...base, ...input }).success, true, JSON.stringify(input));
  for (const input of [
    { contactMethod: 'email', contact: 'wrong@' }, { contactMethod: 'phone', contact: 'owner@example.test' },
    { contactMethod: 'wechat', contact: '12 bad' }, { contactMethod: 'wechat', contact: 'a'.repeat(21) },
    { contactMethod: 'other' }, { bedrooms: -1 }, { bedrooms: 2.5 }, { bedrooms: 21 },
    { preferredAdvisorId: 'unknown-person' }, { offerInterest: 'yes' }, { needSummary: 'a'.repeat(1001) },
    { startTime: 'tomorrow' }, { budgetRange: 'a'.repeat(161) }, { service: 'unknown' },
  ]) assert.equal(leadSchema.safeParse({ ...base, ...input }).success, false, JSON.stringify(input));
  const legacy = leadSchema.parse(base);
  assert.equal(Object.hasOwn(legacy, 'contactMethod'), false); assert.equal(Object.hasOwn(legacy, 'offerInterest'), false);
});

test('enquiry API stores optional fields, separates email owners, deduplicates aliases and formats mock notifications', async () => {
  const server = createApp().listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  const post = async (input: object) => { const response = await fetch(url + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' }, body: JSON.stringify(input) }); return { status: response.status, data: await response.json() as any }; };
  const originalFetch = globalThis.fetch;
  try {
    const input = { ...base, service: 'manage', contactMethod: 'email', contact: 'first@example.test', bedrooms: 3, propertyType: 'house', offerInterest: true, preferredAdvisorId: 'andy-xiang' };
    const first = await post(input); assert.equal(first.status, 201);
    const retry = await post({ ...input, service: 'management' }); assert.equal(retry.status, 200); assert.equal(retry.data.id, first.data.id);
    assert.equal((await post({ ...input, bedrooms: 4 })).status, 409);
    assert.equal((await post({ ...input, contact: 'second@example.test', service: 'renovation', requestId: randomUUID(), needSummary: 'Paint kitchen', startTime: 'asap' })).status, 201);
    const owners = db.prepare('SELECT contact_key FROM owners').all() as any[];
    assert.deepEqual(owners.map(owner => owner.contact_key).sort(), ['email:first@example.test', 'email:second@example.test']);
    const login = await fetch(url + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' }, body: JSON.stringify({ email: 'service@example.test', password: 'ServiceTestPassword2026' }) });
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    const list = await (await fetch(url + '/api/admin/leads', { headers: { Cookie: cookie } })).json() as any;
    const lead = list.leads.find((item: any) => item.id === first.data.id);
    assert.equal(lead.service, 'management'); assert.equal(lead.serviceGroup, 'rental');
    assert.equal(lead.preferredAdvisorName, 'Andy Xiang'); assert.equal(lead.bedrooms, 3); assert.equal(lead.offerInterest, true);
    const messages: string[] = [];
    config.telegramToken = 'mock-token'; config.telegramChatId = 'mock-chat';
    globalThis.fetch = (async (_url, init) => { messages.push(JSON.parse(String(init?.body)).text); return new Response('{"ok":true}'); }) as typeof fetch;
    await deliverNotifications();
    assert.equal(messages.length, 2);
    const management = messages.find(message => message.includes('类型：长期托管'))!;
    assert.match(management, /分组：出租与托管/); assert.doesNotMatch(management, /指定顾问：/);
    assert.doesNotMatch(management, /卧室数：|咨询限时优惠：/);
    assert.ok(messages.some(message => message.includes('@example.test')));
    assert.ok(messages.some(message => message.includes('类型：装修翻新') && !message.includes('希望开始：')));
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM leads').get() as any).n, 2);
  } finally { globalThis.fetch = originalFetch; config.telegramToken = ''; config.telegramChatId = ''; server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close(); }
});
