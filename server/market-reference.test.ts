import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { marketFileSchema, marketRecordSchema } from './market-reference.js';

const file = JSON.parse(readFileSync('data/market-reference.json', 'utf8'));
test('market reference: every record matches the page contract', () => {
  const data = marketFileSchema.parse(file);
  assert.ok(data.records.length > 0);
  const leased = data.records.filter(record => record.kind === 'leased');
  assert.ok(leased.some(record => record.priceBasis === 'historical_asking_weekly_rent'));
  for (const record of leased) {
    assert.ok(['undisclosed', 'historical_asking_weekly_rent'].includes(record.priceBasis));
    assert.match(record.sourceUrl, /\/leased-residential\//);
    assert.notEqual(record.beds, undefined);
    assert.notEqual(record.baths, undefined);
  }
  assert.equal(data.publicReuseApproved, false, 'Internal sources must not silently gain public reuse approval');
});

test('market reference: reject incorrect price basis, dates, unsafe links and duplicates', () => {
  const record = file.records.find((r: { kind: string; priceAmount: number | null }) => r.kind === 'leased' && r.priceAmount != null);
  for (const change of [
    { priceBasis: 'asking_weekly_rent' }, { priceBasis: 'achieved_sale' },
    { priceAmount: null }, { priceMax: 100 }, { eventDate: '2026-02-30' },
    { eventDate: '2026-10-24' }, { checkedAt: 'invalid' },
    { sourceUrl: 'javascript:alert(1)' }, { sourceUrl: 'http://example.test' },
    { beds: 2.5 }, { beds: -1 }, { baths: 7 },
  ]) assert.equal(marketRecordSchema.safeParse({ ...record, ...change }).success, false, JSON.stringify(change));
  assert.equal(marketFileSchema.safeParse({ ...file, records: [record, record] }).success, false);
  assert.equal(marketRecordSchema.safeParse({ ...record, priceBasis: 'undisclosed' }).success, false);
});
