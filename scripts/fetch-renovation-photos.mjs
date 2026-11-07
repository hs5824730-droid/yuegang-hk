// Public, free Unsplash photographs. No agency/company website assets or invented before/after pairs.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const items = [
  { id: 'HiIo-viWU40', slug: 'spacious-modern-living-room-with-wooden-staircase-and-fireplace', author: 'Clay Banks', subject: '现代木质客厅与采光，首屏示意', location: 'Hankins, New York, USA' },
  { id: 'MP0bgaS_d1c', slug: 'gray-steel-3-door-refrigerator-near-modular-kitchen', author: 'Naomi Hébert', subject: '白色厨房与岛台更新示意', location: 'Boston, USA' },
  { id: 'GDWmu0bFfS4', slug: '2-person-wearing-blue-denim-jeans', author: 'Roselyn Tirado', subject: '粉刷、滚筒与涂料工具示意', location: '原页未标明' },
  { id: 'Te48TPzdcU8', slug: 'man-climbing-on-ladder-inside-room', author: 'Milivoj Kuhar', subject: '室内装修进行中，楼梯与墙面施工示意', location: 'Mursko Središće, Croatia' },
  { id: 'pyJgggne0W4', slug: 'a-modern-looking-living-room', author: 'Lotus Design N Print', subject: '住宅客厅焕新与整理示意', location: '原页未标明' },
  { id: '5eSNyI7XVfQ', slug: 'person-on-roof-painting-a-house-window', author: 'Jon Sailer', subject: '外墙与窗框粉刷维护示意', location: '原页未标明' },
  { id: 'hPfrYoKkxp0', slug: 'interior-renovation-with-construction-materials-and-supplies', author: 'Olek Buzunov', subject: '装修材料、墙面与现场管理示意', location: '原页未标明' },
  { id: 'FL-ZcDK8tMo', slug: 'modern-living-room-with-stylish-furniture-and-large-windows', author: 'Clay Banks', subject: '清洁整理后的现代住宅客厅示意', location: 'Rhinebeck, New York, USA' },
];
await mkdir(path.join(root, 'public/img/renovation'), { recursive: true });
await mkdir(path.join(root, 'data/design-review'), { recursive: true });
const records = [];
for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const page = `https://unsplash.com/photos/${item.slug}-${item.id}`;
  const response = await fetch(page, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Source page unavailable: ${item.id} (${response.status})`);
  const html = await response.text();
  if (!html.includes('Free to use under') || !html.includes('Unsplash License')) throw new Error('Free license could not be confirmed: ' + item.id);
  const original = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)?.[1];
  if (!original) throw new Error('Source image missing: ' + item.id);
  const image = new URL(original.replaceAll('&amp;', '&'));
  image.search = new URLSearchParams({ fm: 'webp', w: '1600', q: '78', fit: 'max' }).toString();
  if (image.hostname !== 'images.unsplash.com') throw new Error('Unexpected source host');
  const download = await fetch(image, { signal: AbortSignal.timeout(90000) });
  if (!download.ok || !download.headers.get('content-type')?.startsWith('image/')) throw new Error('Download failed: ' + item.id);
  const bytes = Buffer.from(await download.arrayBuffer());
  if (bytes.subarray(0, 4).toString() !== 'RIFF' || bytes.subarray(8, 12).toString() !== 'WEBP') throw new Error('Image is not WebP');
  const file = `${i + 1}.webp`;
  await writeFile(path.join(root, 'public/img/renovation', file), bytes);
  records.push({ file, ...item, page, downloadUrl: image.href, license: 'Unsplash License', licenseUrl: 'https://unsplash.com/license', bytes: bytes.length });
  console.log(file, item.author, bytes.length, 'bytes');
}
const lines = ['# 装修与房屋打理图片来源', '', '核实与下载：2026-10-23。全部来自 Unsplash 原始照片页，逐张核实为免费 Unsplash License（非 Unsplash+）。许可允许免费商用和修改，许可原文：https://unsplash.com/license 。', '',
  '图片由 Unsplash CDN 按 WebP、宽度不超过 1600、质量 78 输出。用途为示意，不代表桉湾施工案例；没有使用中介或装修公司网站图片。拍摄地如非澳洲，不将其描述为澳洲真实项目。', '',
  '| 文件 | 内容与建议用途 | 作者 | 原始照片页 | 许可 | 原页拍摄地 |', '|---|---|---|---|---|---|',
  ...records.map(item => `| public/img/renovation/${item.file} | ${item.subject} | ${item.author} | [Unsplash ${item.id}](${item.page}) | [Unsplash License](${item.licenseUrl}) | ${item.location} |`), '',
  '未提供 before-1.webp / after-1.webp：没有找到能证实是同一空间改造前后的免费成对照片，因此不拼接不同场景制造前后对比。现有页面会自动隐藏未提供的对比区域。', '',
  '所有原始下载地址、文件大小与来源元数据另存 renovation-image-sources.json，便于复核和重新下载。', ''];
await writeFile(path.join(root, 'data/design-review/renovation-image-sources.md'), lines.join('\n'));
await writeFile(path.join(root, 'data/design-review/renovation-image-sources.json'), JSON.stringify(records, null, 2) + '\n');
