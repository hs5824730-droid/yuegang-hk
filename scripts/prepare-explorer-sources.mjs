// Downloads only the finite, manually reviewed picks prepared by prepare-explorer-metadata.py.
// No source discovery, no image editing and no watermark removal. Private data/ only.
import { readFile, writeFile, readdir, mkdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
const base = path.join(root, 'data/viewing-source');
const response = await fetch('https://cdn6.ep.dynamics.net/robots.txt');
if (!response.ok || !(await response.text()).includes('Allow: /')) throw new Error('Review CDN robots before downloading');
for (const entry of await readdir(base, { withFileTypes: true })) {
  if (!entry.isDirectory() || !/^reference-\d+$/.test(entry.name)) continue;
  const folder = path.join(base, entry.name);
  const prepared = path.join(folder, 'prepared-manifest.json');
  if (!await stat(prepared).catch(() => null)) continue;
  const manifest = JSON.parse(await readFile(prepared, 'utf8'));
  if (manifest.publicReuseApproved !== false || !manifest.rooms.every(room => room.watermarked === false)) throw new Error('Unreviewed source');
  const html = await readFile(path.join(folder, 'source-page.html'), 'utf8');
  for (const room of manifest.rooms) {
    if (!html.includes(room.originalUrl) || !/^room-\d+-[a-z-]+\.jpg$/.test(room.file)) throw new Error('Source mismatch');
    room.downloadUrl = room.originalUrl + '?width=1600&quality=90&format=jpg&scale=down';
    const destination = path.join(folder, room.file);
    let bytes = await readFile(destination).catch(() => null);
    if (!bytes) {
      const r = await fetch(room.downloadUrl, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error('Source image unavailable ' + r.status);
      bytes = Buffer.from(await r.arrayBuffer());
      if (bytes[0] !== 255 || bytes[1] !== 216) throw new Error('JPEG expected');
      await writeFile(destination, bytes, { flag: 'wx' });
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    room.fileSha256 = createHash('sha256').update(bytes).digest('hex');
    room.assetTransform = 'Source CDN resize/downscale and JPEG format only; no crop, watermark removal or generated edits.';
  }
  execFileSync('python', [path.join(root, 'scripts/create-viewing-thumbnails.py'), prepared], { stdio: 'pipe' });
  await writeFile(path.join(folder, 'manifest.next.json'), JSON.stringify(manifest, null, 2) + '\n');
  await rename(path.join(folder, 'manifest.next.json'), path.join(folder, 'manifest.json'));
  await mkdir(path.join(root, 'data/viewing-video', manifest.id), { recursive: true });
  console.log(manifest.id, manifest.kind, manifest.rooms.length, 'recommended frames ready');
}
