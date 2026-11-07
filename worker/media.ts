import { mediaOriginalFileName } from '../server/media-filename';
import type { AppEnv } from './env';
import type { User } from '../server/schema';
import { audit } from './auth';
import { HttpError, json, notFound, readBytes } from './http';
const mediaName = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;
export async function upload(request: Request, env: AppEnv, user: User) {
  if (user.role === 'assistant') throw new HttpError(403, '没有操作权限 / Permission denied');
  const bytes = await readBytes(request, 8 * 1024 * 1024 + 64 * 1024);
  const form = await new Response(bytes, { headers: { 'Content-Type': request.headers.get('Content-Type') || '' } }).formData().catch(() => { throw new HttpError(400, '上传格式不正确 / Invalid upload'); });
  const files = form.getAll('file'); const file = files[0];
  if (files.length !== 1 || !file || typeof file === 'string' || file.size > 8 * 1024 * 1024) throw new HttpError(400, '请选择一张图片（最大 8MB） / Select one image (8MB maximum)');
  const b = new Uint8Array(await file.arrayBuffer());
  const ext = b[0] === 255 && b[1] === 216 && b[2] === 255 ? 'jpg' : [137,80,78,71,13,10,26,10].every((value, i) => b[i] === value) ? 'png'
    : new TextDecoder().decode(b.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(b.slice(8, 12)) === 'WEBP' ? 'webp' : null;
  if (!ext) throw new HttpError(400, '仅支持 JPEG、PNG、WebP 图片 / JPEG, PNG or WebP images only');
  const filename = crypto.randomUUID() + '.' + ext;
  await env.MEDIA.put(filename, b, { httpMetadata: { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` } });
  await audit(env, user.id, 'media.upload', filename).run();
  return json({ url: '/uploads/' + filename, originalFileName:mediaOriginalFileName(file.name) }, 201);
}
export async function serveMedia(request: Request, env: AppEnv, filename: string) {
  if (!['GET', 'HEAD'].includes(request.method) || !mediaName.test(filename)) return notFound();
  const object = await env.MEDIA.get(filename); if (!object) return notFound();
  const headers = new Headers({ 'Cache-Control': 'public, max-age=86400', ETag: object.httpEtag });
  object.writeHttpMetadata(headers); headers.set('Content-Length', String(object.size));
  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
}
