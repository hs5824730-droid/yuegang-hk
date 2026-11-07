import { pixelFrameHeaders, pixelFrameHtml } from '../server/meta-pixel';
import { mapFrameOrigins, tourHosts } from '../server/policy';
import type { AppEnv } from './env';
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const json = (data: unknown, status = 200, headers?: HeadersInit) => Response.json(data, { status, headers });
export const notFound = () => json({ error: '记录不存在 / Record not found' }, 404);
export function secure(response: Response, request: Request) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff'); headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data: blob:; connect-src 'self' https://analytics.jiangyuan.org; frame-src 'self' ${tourHosts.map(host => `https://${host} https://*.${host}`).join(' ')} ${mapFrameOrigins.join(' ')}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`);
  if (pixelFrameHtml(new URL(request.url), request.headers) && response.status === 200) {
    for (const [key, value] of Object.entries(pixelFrameHeaders(new URL(request.url)))) headers.set(key, value);
    headers.delete('X-Frame-Options');
  }
  // Prevent edge analytics/optimizers from injecting another script into these
  // CSP-protected documents, including the privacy-isolated Pixel document.
  if (headers.get('Content-Type')?.includes('text/html')) {
    const cache = headers.get('Cache-Control');
    if (!cache?.includes('no-transform')) headers.set('Cache-Control', cache ? cache + ', no-transform' : 'no-transform');
  }
  if (new URL(request.url).protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000');
  const publicImage=/^\/api\/viewing-samples\/reference-\d{5,12}\/photo\/[a-f0-9]{64}\.webp$/.test(new URL(request.url).pathname)&&[200,206,304].includes(response.status);
  if (new URL(request.url).pathname.startsWith('/api')&&!publicImage) headers.set('Cache-Control', 'private, no-store');
  return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, statusText: response.statusText, headers });
}
export function requireSameOrigin(request: Request, env: AppEnv) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.get('Origin') !== new URL(env.APP_URL).origin) {
    throw new HttpError(403, '请求来源不受信任 / Untrusted request origin');
  }
}
export async function readBytes(request: Request, limit: number) {
  if (Number(request.headers.get('Content-Length')) > limit) throw new HttpError(413, '请求过大 / Request too large');
  const reader = request.body?.getReader(); if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new HttpError(413, '请求过大 / Request too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, '请使用 JSON 格式 / JSON required');
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(await readBytes(request, 1024 * 1024)));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new SyntaxError();
    return parsed as Record<string, unknown>;
  } catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, '请求格式不正确 / Invalid request body'); }
}
