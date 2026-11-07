import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';

const directory = mkdtempSync(path.join(tmpdir(), 'viewing-sample-test-'));
Object.assign(process.env, { NODE_ENV: 'test', DISABLE_TELEGRAM: 'true', TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '',
  SESSION_SECRET: 'viewing-test-only-key-12345678901234567890', APP_URL: 'http://localhost:5173',
  DATABASE_PATH: path.join(directory, 'test.sqlite'), UPLOAD_DIR: path.join(directory, 'uploads'),
  VIEWING_SOURCE_DIR: path.join(directory, 'photos'), VIEWING_VIDEO_DIR: path.join(directory, 'videos'),
  ADMIN_EMAIL: '', ADMIN_PASSWORD: '' });
const { createApp } = await import('./app.js');
const { config } = await import('./config.js');
const { db } = await import('./db.js');
const { viewingManifestSchema } = await import('./viewing-samples.js');
const id = 'reference-9999901';
const photos = path.join(directory, 'photos', id); const videos = path.join(directory, 'videos', id);
mkdirSync(photos, { recursive: true }); mkdirSync(videos, { recursive: true });
const original = JSON.parse(readFileSync('data/viewing-source/reference-3600395/manifest.json', 'utf8'));
const manifest = { ...original, id, coverRoom: 'living', rooms: [original.rooms[0]] };
const soldId = 'reference-9999902';
const soldDirectory = path.join(directory, 'photos', soldId); mkdirSync(soldDirectory, { recursive: true });
writeFileSync(path.join(soldDirectory, 'manifest.json'), JSON.stringify({ ...manifest, id: soldId, kind: 'sold', soldPrice: 1500000, soldDate: '2026-09-15', priceBasis: 'sold_price', priceDisplay: { zh: 'A$1,500,000', en: 'A$1,500,000' }, availableDate: null }));
writeFileSync(path.join(photos, 'manifest.json'), JSON.stringify(manifest));
for (const filename of [manifest.rooms[0].file, manifest.rooms[0].thumbnailFile]) {
  writeFileSync(path.join(photos, filename), readFileSync(path.join('data/viewing-source/reference-3600395', filename)));
}
writeFileSync(path.join(photos, 'source-page.html'), 'private original source');

test('private viewing samples: room media, isolation and enquiry linkage', async t => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const request = (url: string, options?: RequestInit) => fetch(base + url, options);
  const submit = (body: unknown) => request('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' }, body: JSON.stringify(body) });
  const input = { name: 'Viewing fixture', contact: '+61 400 888 991', city: 'New Territories', propertyAddress: 'Forged address', service: 'rent', listingId: id,
    language: 'zh', consent: true, currentlyManaged: false, message: '', requestId: randomUUID() };
  try {
    await t.test('only manifest-listed photographs are exposed; original documents stay private', async () => {
      const index = await (await request('/api/viewing-samples')).json();
      assert.equal(index.internalSample, true); assert.equal(index.publicReuseApproved, false);
      assert.equal(index.listings.length, 1); assert.equal(index.listings[0].rooms[0].videoUrl, null);
      assert.match(index.listings[0].mapUrl, /-33\.915244,151\.237195/);
      const photo = await request(index.listings[0].rooms[0].photoUrl);
      assert.equal(photo.status, 200); assert.match(photo.headers.get('content-type')!, /image\/jpeg/);
      assert.equal(photo.headers.get('cache-control'), 'private, no-store');
      for (const file of ['manifest.json', 'source-page.html', 'candidates.json', 'room-9-secret.jpg', '%2e%2e%2fmanifest.json']) {
        assert.equal((await request(`/api/viewing-samples/${id}/photo/${file}`)).status, 404);
      }
      assert.equal((await request('/api/viewing-samples/reference-1111111/photo/room-1-living.jpg')).status, 404);
    });
    await t.test('video range delivery supports seeking and rejects unknown files', async () => {
      const file = manifest.rooms[0].videoFile;
      const url = `/api/viewing-samples/${id}/video/${file}`;
      assert.equal((await request(url)).status, 404);
      writeFileSync(path.join(videos, file), Buffer.from('0123456789abcdef'));
      const index = await (await request('/api/viewing-samples')).json();
      assert.equal(index.listings[0].rooms[0].videoUrl, url);
      const range = await request(url, { headers: { Range: 'bytes=2-5' } });
      assert.equal(range.status, 206); assert.equal(range.headers.get('content-range'), 'bytes 2-5/16'); assert.equal(await range.text(), '2345');
      assert.match(range.headers.get('content-type')!, /video\/mp4/);
      assert.equal((await request(url, { headers: { Range: 'bytes=999-1000' } })).status, 416);
      assert.equal((await request(`/api/viewing-samples/${id}/video/room-9.mp4`)).status, 404);
    });
    await t.test('rental availability is explicit, dated and never inferred from old missing fields', async () => {
      const initial = (await (await request('/api/viewing-samples')).json()).listings[0];
      assert.equal(initial.availabilityStatus, 'available');
      assert.equal(initial.availabilityCheckedAt, manifest.availabilityCheckedAt);
      const legacy = { ...manifest }; delete legacy.availabilityStatus; delete legacy.availabilityCheckedAt; delete legacy.availabilityEvidence;
      try {
        writeFileSync(path.join(photos, 'manifest.json'), JSON.stringify(legacy));
        const unknown = (await (await request('/api/viewing-samples')).json()).listings[0];
        assert.equal(unknown.availabilityStatus, 'unknown'); assert.equal(unknown.availabilityCheckedAt, null);
        writeFileSync(path.join(photos, 'manifest.json'), JSON.stringify({ ...legacy, availabilityStatus: 'leased' }));
        assert.equal((await (await request('/api/viewing-samples/' + id)).json()).listing.availabilityStatus, 'leased');
      } finally { writeFileSync(path.join(photos, 'manifest.json'), JSON.stringify(manifest)); }
      assert.equal(viewingManifestSchema.safeParse({ ...legacy, availabilityStatus: 'available' }).success, false);
      assert.equal(viewingManifestSchema.safeParse({ ...manifest, availabilityEvidence: { ...manifest.availabilityEvidence, sourceUrl: 'https://example.com/unrelated' } }).success, false);
      assert.equal(viewingManifestSchema.safeParse({ ...manifest, availabilityStatus: 'rented' }).success, false);
      const current = ['reference-3591974', 'reference-3600395'].map(listingId => viewingManifestSchema.parse(JSON.parse(readFileSync(`data/viewing-source/${listingId}/manifest.json`, 'utf8'))));
      for (const listing of current) {
        assert.equal(listing.availabilityStatus, 'available');
        const evidence = JSON.parse(readFileSync(listing.availabilityEvidence!.evidenceFile, 'utf8'));
        assert.equal(evidence.officialPageReadable, true); assert.equal(evidence.sourceUrl, listing.sourceUrl);
        assert.equal(evidence.checkedAt, listing.availabilityCheckedAt);
      }
      const unverified = viewingManifestSchema.parse(JSON.parse(readFileSync('data/viewing-source/reference-3601464/manifest.json', 'utf8')));
      assert.equal(unverified.availabilityStatus, 'unknown');
    });
    await t.test('rent/sold filters and detail preserve numeric sold price and exact geography', async () => {
      assert.equal((await request('/api/viewing-samples?kind=invalid')).status, 400);
      const sold = await (await request('/api/viewing-samples?kind=sold')).json();
      assert.equal(sold.listings.length, 1); assert.equal(sold.listings[0].kind, 'sold'); assert.equal(sold.listings[0].soldPrice, 1500000);
      assert.equal(sold.listings[0].soldDate, '2026-09-15'); assert.equal(sold.listings[0].publicReuseApproved, false);
      assert.deepEqual(sold.listings[0].geo, original.geo);
      const detail = await (await request('/api/viewing-samples/' + soldId)).json(); assert.equal(detail.listing.id, soldId);
      assert.equal((await request('/api/viewing-samples?kind=rent')).status, 200);
      assert.equal((await submit({ ...input, listingId: soldId, service: 'buy', requestId: randomUUID() })).status, 201);
      // This fixture enquiry is only for testing; keep later count assertions independent.
      db.prepare('DELETE FROM notifications').run(); db.prepare('DELETE FROM leads').run(); db.prepare('DELETE FROM owners').run();
    });
    await t.test('watermarked and unreviewed rooms are excluded from cover, index and direct media URLs', async () => {
      const blocked = { ...manifest.rooms[0], id: 'watermarked', order: 2, file: 'room-2-watermarked.jpg', thumbnailFile: 'room-2-watermarked.thumb.jpg', videoFile: 'room-2.mp4', watermarked: true };
      writeFileSync(path.join(photos, blocked.file), readFileSync(path.join(photos, manifest.rooms[0].file)));
      const changed = { ...manifest, coverRoom: blocked.id, rooms: [...manifest.rooms, blocked] };
      writeFileSync(path.join(photos, 'manifest.json'), JSON.stringify(changed));
      const listing = (await (await request('/api/viewing-samples')).json()).listings[0];
      assert.equal(listing.rooms.length, 1); assert.equal(listing.rooms[0].watermarked, false); assert.match(listing.coverUrl, /room-1-living/);
      assert.equal((await request(`/api/viewing-samples/${id}/photo/${blocked.file}`)).status, 404);
      assert.equal((await request(`/api/viewing-samples/${id}/video/${blocked.videoFile}`)).status, 404);
      writeFileSync(path.join(photos, 'manifest.json'), JSON.stringify({ ...manifest, rooms: [{ ...manifest.rooms[0], watermarked: true }] }));
      assert.equal((await request(`/api/viewing-samples/${id}`)).status, 404);
      writeFileSync(path.join(photos, 'manifest.json'), JSON.stringify(manifest));
      const unreviewed = { ...manifest.rooms[0] }; delete unreviewed.watermarked;
      assert.equal(viewingManifestSchema.parse({ ...manifest, rooms: [unreviewed] }).rooms[0].watermarked, true);
    });
    await t.test('listing enquiries use source location and preserve idempotency', async () => {
      const first = await submit(input); assert.equal(first.status, 201); const result = await first.json();
      const retry = await submit(input); assert.equal(retry.status, 200); assert.equal((await retry.json()).id, result.id);
      const row = db.prepare('SELECT city,data FROM leads WHERE id=?').get(result.id) as { city: string; data: string };
      const data = JSON.parse(row.data);
      assert.equal(row.city, 'Hong Kong Island'); assert.equal(data.listingId, id);
      assert.equal(data.propertyAddress, '2/24B Arthur Street, Randwick, Hong Kong Island 2031');
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM notifications').get() as { n: number }).n, 1);
      assert.equal((await submit({ ...input, listingId: 'reference-1111111', requestId: randomUUID() })).status, 400);
      assert.equal((await submit({ ...input, propertyId: randomUUID(), requestId: randomUUID() })).status, 400);
    });
    await t.test('production cannot expose or enquire about private samples', async () => {
      const previous = config.production;
      try {
        config.production = true;
        for (const url of [ `/api/viewing-samples/${id}/photo/${manifest.rooms[0].file}`, `/api/viewing-samples/${id}/video/${manifest.rooms[0].videoFile}`]) {
          assert.equal((await request(url)).status, 404);
        }
        assert.equal((await request('/api/viewing-samples?kind=sold')).status, 200);
        assert.equal((await (await request('/api/viewing-samples')).json()).listings.length,37);
        assert.equal((await (await request('/api/viewing-samples?publicReuseApproved=true')).json()).listings.length,37);
        assert.equal((await request('/api/viewing-samples/' + soldId)).status, 404);
        assert.equal((await submit({ ...input, requestId: randomUUID() })).status, 400);
      } finally { config.production = previous; }
    });
    await t.test('all three real source manifests and fourteen recommended frames remain valid', () => {
      let count = 0;
      for (const listingId of ['reference-3601464', 'reference-3600395', 'reference-3598987']) {
        const folder = path.join('data/viewing-source', listingId);
        const source = readFileSync(path.join(folder, 'source-page.html'), 'utf8');
        const listing = viewingManifestSchema.parse(JSON.parse(readFileSync(path.join(folder, 'manifest.json'), 'utf8')));
        assert.equal(listing.publicReuseApproved, false); assert.equal(listing.listingDate, null);
        for (const room of listing.rooms) {
          assert.ok(source.includes(room.originalUrl));
          for (const filename of [room.file, room.thumbnailFile]) {
            const bytes = readFileSync(path.join(folder, filename)); assert.equal(bytes[0], 255); assert.equal(bytes[1], 216);
          }
          count++;
        }
      }
      assert.equal(count, 14);
      assert.equal(viewingManifestSchema.safeParse({ ...manifest, publicReuseApproved: true }).success, false);
      assert.equal(viewingManifestSchema.safeParse({ ...manifest, rooms: [...manifest.rooms, manifest.rooms[0]] }).success, false);
    });
    await t.test('sold references reject made-up date/price semantics', () => {
      const base = { ...manifest, kind: 'sold', soldDate: '2026-09-15', soldPrice: null, priceBasis: 'undisclosed' };
      assert.ok(viewingManifestSchema.safeParse(base).success);
      assert.equal(viewingManifestSchema.safeParse({ ...base, soldDate: '2024-01-01' }).success, false);
      assert.equal(viewingManifestSchema.safeParse({ ...base, soldDate: '2027-01-01' }).success, false);
      assert.equal(viewingManifestSchema.safeParse({ ...base, soldPrice: 1000000 }).success, false);
      assert.equal(viewingManifestSchema.safeParse({ ...base, soldDate: null }).success, false);
    });
    await t.test('real explorer inventory matches its reviewed room register, dated rental evidence and private media hashes', () => {
      const approvals = JSON.parse(readFileSync('data/design-review/rental-expansion-2026-10-23/approved-room-selections.json', 'utf8')) as Record<string, { rooms: [number, string][] }>;
      const completion = JSON.parse(readFileSync('data/design-review/rental-completion-2026-10-23/approved-room-selections.json', 'utf8')) as Record<string, { kind: 'rent' | 'sold'; rooms: [number, string][] }>;
      assert.ok(Object.keys(completion).every(key => !approvals[key]), 'Review batches must not count the same listing twice');
      const reviewed = { ...approvals, ...completion };
      const root = 'data/viewing-source'; let rentals = 0; let available = 0; let sales = 0; let images = 0;
      const cities = new Set<string>();
      for (const entry of readdirSync(root)) {
        if (!/^reference-\d+$/.test(entry)) continue;
        let raw: any;
        try { raw = JSON.parse(readFileSync(path.join(root, entry, 'manifest.json'), 'utf8')); } catch { continue; }
        const listing = viewingManifestSchema.parse(raw);
        if (!listing.displayEligible) continue;
        const clear = listing.rooms.filter(room => !room.watermarked);
        assert.ok(clear.length >= 3 && clear.length <= 5);
        const html = readFileSync(path.join(root, entry, 'source-page.html'), 'utf8');
        if (raw.sourceFormat) {
          assert.equal(createHash('sha256').update(readFileSync(path.join(root, entry, 'source-page.html'))).digest('hex'), raw.sourceSha256);
          assert.ok(reviewed[entry], 'A new provider requires an explicit human review register');
          assert.deepEqual(raw.rooms.map((room: any) => [room.sourceImageNumber, room.id]), reviewed[entry].rooms);
        }
        if (raw.sourceFormat === 'ljhooker-official-html') {
          // This source carries generic agency JSON-LD. Its actual address/map
          // are in the listing overview; generic structured data is not proof.
          const visibleAddress = html.match(/class="property-overview__address"[^>]*>([^<]+)</)![1].trim();
          assert.equal(visibleAddress, `${listing.address}, ${listing.suburb}`);
          const position = html.match(/const position\s*=\s*\{\s*lat:\s*([-\d.]+)\s*,\s*lng:\s*([-\d.]+)/)!;
          assert.equal(listing.geo.latitude, Number(position[1])); assert.equal(listing.geo.longitude, Number(position[2]));
          assert.equal(createHash('sha256').update(readFileSync(path.join(root, entry, 'source-page.html'))).digest('hex'), raw.sourceSha256);
          assert.match(html, /<h[2-6][^>]*>\s*For Rent\s*<\/h[2-6]>/i);
          assert.ok(reviewed[entry], 'New rental requires a human-reviewed selection register');
          assert.deepEqual(raw.rooms.map((room: any) => [room.sourceImageNumber, room.id]), reviewed[entry].rooms);
          const priceText = html.match(/id="property-information"[^>]*>([\s\S]*?)<\/p>/)![1].replace(/<[^>]+>/g, '').trim();
          assert.doesNotMatch(priceText, /LEASED|UNDER\s+APPLICATION/i);
          const amount = priceText.match(/\$?([\d,]+(?:\.\d+)?)\s*\/?\s*(?:pw|wk|per\s+week|a\s+week)/i)!;
          assert.equal(raw.priceAmount, Number(amount[1].replaceAll(',', '')));
          assert.equal(listing.priceBasis, 'asking_weekly_rent');
        } else if (raw.sourceFormat === 'barryplant-official-next-html') {
          const data = JSON.parse(html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)![1]).props.pageProps.propertyData;
          assert.equal(listing.address, data.address_street_display.trim()); assert.equal(listing.suburb, data.address_suburb);
          assert.equal(listing.geo.latitude, data.location.coordinates[1]); assert.equal(listing.geo.longitude, data.location.coordinates[0]);
          assert.equal(data.address_display, true); assert.equal(data.hide_listing, false);
          if (listing.kind === 'rent') {
            assert.equal(data.status, 'current'); assert.equal(data.listing_type, 'lease'); assert.equal(data.rent_period, 'weekly');
            assert.equal(data.leased_date, null); assert.equal(data.underOffer, false); assert.equal(raw.priceAmount, data.rent);
            assert.equal(listing.availableDate, data.dateAvailable?.slice(0, 10) ?? null);
          }
        } else if (raw.sourceFormat === 'nelsonalexander-official-html') {
          const address = html.match(/<h1[^>]+class="address"[^>]*>([\s\S]*?)<\/h1>/)![1].trim();
          assert.equal(address, `${listing.address}, ${listing.suburb} VIC ${listing.postcode}`);
          const position = html.match(/<meta name="geo.position" content="([-\d.]+),([-\d.]+)"/)!;
          assert.equal(listing.geo.latitude, Number(position[1])); assert.equal(listing.geo.longitude, Number(position[2]));
          if (listing.kind === 'rent') {
            const index = readFileSync(raw.activeIndexEvidence.sourceFile, 'utf8');
            assert.equal(createHash('sha256').update(Buffer.from(index)).digest('hex'), raw.activeIndexEvidence.sourceSha256);
            const card = index.split(/<div class="property-card /).slice(1).find(card => card.includes(`/property/${raw.sourceCode}/`));
            assert.ok(card); assert.doesNotMatch(card, /leased-overlay|sold-overlay/);
            assert.match(html, /<h2>Available<\/h2>\s*<h3>/); assert.doesNotMatch(html, /<h2>Property Leased<\/h2>|<strong>Leased<\/strong>/);
            const price = html.match(/<h3[^>]+class="price"[^>]*>([\s\S]*?)<\/h3>/)![1].replace(/<[^>]+>/g, ' ');
            const amount = price.match(/\$([\d,]+)(?:\.00)?\s*(?:pw|p\/w|per week)/i)!;
            assert.equal(raw.priceAmount, Number(amount[1].replaceAll(',', '')));
          }
        } else {
          const ld = JSON.parse(html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)![1]);
          assert.equal(listing.address, ld.address.streetAddress); assert.equal(listing.geo.latitude, ld.geo.latitude); assert.equal(listing.geo.longitude, ld.geo.longitude);
        }
        if (listing.kind === 'sold') {
          sales++; cities.add(listing.city);
          const visible = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          assert.ok(visible.includes(raw.sourceEventText), 'Sale evidence must be publicly visible');
          if (raw.sourceFormat === 'nelsonalexander-official-html') {
            const [year, month, day] = listing.soldDate!.split('-');
            assert.match(html, /<h2>Property Sold<\/h2>/); assert.ok(raw.sourceEventText.includes(`${day}/${month}/${year}`));
            assert.ok(raw.sourceEventText.includes(listing.soldPrice === null ? 'Undisclosed' : `$${listing.soldPrice.toLocaleString('en-AU')}`));
          } else assert.ok(html.includes(`"soldDate":"${listing.soldDate}"`));
          assert.equal(listing.priceBasis, listing.soldPrice === null ? 'undisclosed' : 'sold_price');
        } else {
          rentals++;
          if (listing.availabilityStatus === 'available') {
            available++;
            const evidence = JSON.parse(readFileSync(listing.availabilityEvidence!.evidenceFile, 'utf8'));
            assert.equal(evidence.officialPageReadable, true); assert.equal(evidence.sourceUrl, listing.sourceUrl);
            assert.equal(evidence.checkedAt, listing.availabilityCheckedAt);
          }
        }
        for (const room of clear) {
          assert.ok(html.includes(room.originalUrl));
          const bytes = readFileSync(path.join(root, entry, room.file));
          assert.equal(bytes[0], 255); assert.equal(bytes[1], 216);
          assert.ok(readFileSync(path.join(root, entry, room.thumbnailFile)).length > 1000);
          const provenance = raw.rooms.find((item: { id: string }) => item.id === room.id);
          assert.match(provenance.fileSha256, /^[a-f0-9]{64}$/);
          assert.equal(createHash('sha256').update(bytes).digest('hex'), provenance.fileSha256);
          if (raw.sourceFormat) {
            const originalBytes = readFileSync(path.join(root, entry, 'candidates', `${provenance.sourceImageNumber}.jpg`));
            assert.equal(createHash('sha256').update(originalBytes).digest('hex'), provenance.originalSha256);
            assert.match(provenance.assetTransform, /no crop or watermark editing/i);
            if (raw.sourceFormat === 'nelsonalexander-official-html') assert.ok(room.originalUrl.includes(`/${raw.sourceCode.padStart(8, '0')}_img_`), 'Room must belong to this listing, never a similar-property card');
          }
          images++;
        }
      }
      const newRentals = Object.values(completion).filter(item => item.kind === 'rent').length;
      const newSales = Object.values(completion).filter(item => item.kind === 'sold').length;
      assert.equal(rentals, 3 + Object.keys(approvals).length + newRentals); assert.equal(sales, 8 + newSales);
      assert.equal(available, 2 + Object.keys(approvals).length + newRentals);
      assert.equal(images, 47 + Object.values(reviewed).reduce((sum, item) => sum + item.rooms.length, 0));
      assert.deepEqual([...cities].sort(), ['New Territories', 'Kowloon', 'New Territories', 'Hong Kong Island']);
      const excluded = JSON.parse(readFileSync('data/viewing-source/reference-3598987/manifest.json', 'utf8'));
      assert.equal(excluded.displayEligible, false); assert.ok(excluded.rooms.every((room: { watermarked: boolean }) => room.watermarked));
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    db.close(); rmSync(directory, { recursive: true, force: true });
  }
});
