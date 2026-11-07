// Prepare only the three explicitly selected public listings. No discovery crawler or API scraping.
// Source HTML/robots were read with an ordinary browser; /api/ paths were not scraped.
// Superseded: do not run this old selection after the no-watermark review.
// Run after saving the approved source documents and candidates.json under data/viewing-source/<id>/.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
throw new Error('旧选图脚本已停用。请使用 prepare-explorer-metadata.py 和 prepare-explorer-sources.mjs，保留无水印审核标记。');
const reference = JSON.parse(await readFile(path.join(root, 'data/market-reference.json'), 'utf8'));
const selection = {
  'reference-3601464': [[2, 'living', '客厅', 'Living room'], [4, 'kitchen', '厨房', 'Kitchen'], [5, 'bedroom', '卧室', 'Bedroom'], [6, 'bathroom', '卫浴', 'Bathroom'], [1, 'exterior', '门面与入口', 'Exterior & entrance']],
  'reference-3600395': [[1, 'living', '客餐厅', 'Living & dining'], [2, 'kitchen', '厨房', 'Kitchen'], [3, 'bedroom', '卧室', 'Bedroom'], [4, 'bathroom', '卫浴', 'Bathroom']],
  'reference-3598987': [[4, 'living', '客厅', 'Living room'], [6, 'kitchen', '厨房', 'Kitchen'], [8, 'bedroom', '卧室', 'Bedroom'], [10, 'bathroom', '卫浴', 'Bathroom'], [1, 'exterior', '外观与车道', 'Exterior & driveway']],
};
const robots = await fetch('https://cdn6.ep.dynamics.net/robots.txt');
if (!robots.ok || !(await robots.text()).includes('Allow: /')) throw new Error('Review media robots policy before downloading');
for (const [id, picks] of Object.entries(selection)) {
  const record = reference.records.find(record => record.id === id);
  if (!record || record.kind !== 'rent') throw new Error('Selection must come from reference rental records');
  const directory = path.join(root, 'data/viewing-source', id);
  const html = await readFile(path.join(directory, 'source-page.html'), 'utf8');
  const json = JSON.parse(html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1] || '{}');
  if (json.address?.streetAddress !== record.address) throw new Error('Source address does not match');
  const urls = JSON.parse(await readFile(path.join(directory, 'candidates.json'), 'utf8'));
  const rooms = [];
  for (let i = 0; i < picks.length; i++) {
    const [number, label, zh, en] = picks[i];
    const originalUrl = urls[number - 1];
    if (!originalUrl || !html.includes(originalUrl)) throw new Error('Image was not present on the public listing page');
    const file = `room-${i + 1}-${label}.jpg`;
    const downloadUrl = originalUrl + '?width=1600&quality=90&format=jpg&scale=down';
    const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Source image unavailable: ' + response.status);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes[0] !== 255 || bytes[1] !== 216) throw new Error('Expected original JPEG');
    await writeFile(path.join(directory, file), bytes);
    rooms.push({ id: label, order: i + 1, label: { zh, en }, file, thumbnailFile: file.replace('.jpg', '.thumb.jpg'), originalUrl, downloadUrl,
      sourceImageNumber: number, recommended: true, recommendation: '人工目视核对：房间用途可辨、构图相对开阔；建议小幅平移/推近，保留原有门窗和墙面关系，不生成未展示空间。',
      videoFile: `room-${i + 1}.mp4`, videoPath: `data/viewing-video/${id}/room-${i + 1}.mp4` });
    console.log(id, file, bytes.length);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  const available = json.event?.find(event => event.name === 'Available')?.startDate?.slice(0, 10) || null;
  const sourceParking = html.match(/"carSpaces":(\d+)/)?.[1];
  const manifest = { version: 1, ...record, cars: sourceParking === undefined ? record.cars : Number(sourceParking), usage: 'internal-viewing-sample', publicReuseApproved: false, listingDate: null, availableDate: available,
    geo: { latitude: json.geo.latitude, longitude: json.geo.longitude }, coverRoom: rooms.some(room => room.id === 'exterior') ? 'exterior' : 'living',
    robotsCheckedAt: '2026-10-23', robotsPolicy: 'Site User-agent:* allows public property pages; /api/ was not scraped. Media CDN allows /. Source pages: ordinary browser. Media: sequential, at least 1.5 seconds between selected images.',
    rights: 'Third-party listing photographs. Internal sample only. Not licensed for public reuse; do not copy to public/.', rooms };
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await mkdir(path.join(root, 'data/viewing-video', id), { recursive: true });
}
console.log('Run Python/Pillow thumbnail step after this script. All assets stay under data/.');
