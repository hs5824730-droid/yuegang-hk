import { isUrlEncoded, prepareLeadBody, renderCallbackResult } from '../server/com-callback';
import { leadSchema } from '../server/schema';
import type { AppEnv } from './env';
import { sha256 } from './crypto';
import { rateLimit } from './auth';
import { HttpError, json, readBytes, readJson } from './http';
import { deliverNotifications } from './notifications';
import { publicViewingListing } from '../server/public-viewing';
import {signalQueueSql} from '../server/signal-delivery';
async function readForm(request: Request) {
  const text = new TextDecoder().decode(await readBytes(request, 32 * 1024));
  const params = new URLSearchParams(text);
  const body: Record<string, unknown> = {};
  for (const [key, value] of params) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    body[key] = value;
  }
  return body;
}
function finish(request: Request, status: number, payload: { id?: string; city?: string; requestId: string; error?: string }, values?: Record<string, unknown>) {
  if (!isUrlEncoded(request.headers.get('Content-Type'))) return payload.error ? json({ error: payload.error }, status) : json({ id: payload.id, city: payload.city, requestId: payload.requestId }, status);
  const lang = values?.language === 'en' ? 'en' : 'zh';
  const html = renderCallbackResult({ status, lang, requestId: payload.requestId, values, headers: request.headers, error: Boolean(payload.error) || status >= 400 });
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' } });
}
export async function createLead(request: Request, env: AppEnv, ctx: ExecutionContext) {
  await rateLimit(request, env, 'lead', 15, 3600000);
  const form = isUrlEncoded(request.headers.get('Content-Type'));
  let body: Record<string, unknown>;
  try { body = form ? await readForm(request) : await readJson(request); }
  catch (error) {
    if (!form) throw error;
    return finish(request, error instanceof HttpError ? error.status : 400, { requestId: crypto.randomUUID(), error: '请检查填写内容 / Please check the form' });
  }
  const prepared = prepareLeadBody(body) as Record<string, unknown>;
  const parsed = leadSchema.safeParse(prepared);
  if (!parsed.success) {
    if (form) return finish(request, 400, { requestId: crypto.randomUUID(), error: '请检查填写内容 / Please check the form' }, prepared);
    return json({ error: '请检查填写内容 / Please check the form', fields: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) }, 400);
  }
  const input = parsed.data;
  if (input.website) {
    if (form) return finish(request, 400, { requestId: input.requestId, error: '无法提交，请检查表单 / Unable to submit form' }, prepared);
    throw new HttpError(400, '无法提交，请检查表单 / Unable to submit form');
  }
  if (input.listingId) {const listing=publicViewingListing(input.listingId);if(!listing)throw new HttpError(400,'房源不存在或未开放 / Listing unavailable');input.city=listing.city;input.propertyAddress=`${listing.address}, ${listing.suburb}, ${listing.city} ${listing.postcode}`;}
  if (input.currentlyManaged && ['letting', 'management'].includes(input.service)) throw new HttpError(422, '暂不承接从其他中介转来的出租委托 / Transfers from other agencies are not accepted');
  const { website: _, requestId, ...data } = input;
  const hash = await sha256(JSON.stringify(data));
  const existing = await env.DB.prepare('SELECT id,request_hash FROM leads WHERE request_id=?').bind(requestId).first<{ id: string; request_hash: string }>();
  const retry = (row: { id: string; request_hash: string }) => row.request_hash === hash
    ? finish(request, 200, { id: row.id, city: input.city, requestId }, prepared)
    : finish(request, 409, { requestId, error: '请重新提交新的咨询 / Please start a new enquiry' }, prepared);
  // An unchanged retry remains valid if its associated property has since been unpublished.
  if (existing) return retry(existing);
  if (env.TURNSTILE_ENABLED === 'true') {
    if (!env.TURNSTILE_SECRET || typeof body.turnstileToken !== 'string' || !body.turnstileToken || body.turnstileToken.length > 2048) throw new HttpError(400, '请完成验证 / Complete verification');
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: body.turnstileToken,
        remoteip: request.headers.get('CF-Connecting-IP') || '', idempotency_key: requestId }), signal: AbortSignal.timeout(10000),
    });
    const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
    if (!response.ok || !result.success || result.hostname !== new URL(env.APP_URL).hostname || result.action !== 'enquiry') throw new HttpError(400, '验证未通过，请重试 / Verification failed. Please try again.');
  }
  const id = crypto.randomUUID(); const ownerId = crypto.randomUUID(); const now = new Date().toISOString();
  const contactKey = input.contactMethod === 'wechat' ? 'wechat:' + input.contact.toLowerCase() : input.contact.includes('@') ? 'email:' + input.contact.toLowerCase() : input.contact.replace(/[^0-9]/g, '');
  // The existence and city checks run INSIDE the write batch, so concurrent unpublishing cannot create an invalid lead.
  const propertyGuard = '(? IS NULL OR EXISTS(SELECT 1 FROM properties WHERE id=? AND published=1 AND city=?))';
  const property = input.propertyId ?? null;
  const statements = [
    env.DB.prepare(`INSERT INTO owners(id,contact_key,contact,name,created_at) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM leads WHERE request_id=?) AND ${propertyGuard} ON CONFLICT(contact_key) DO NOTHING`)
      .bind(ownerId, contactKey, input.contact, input.name, now, requestId, property, property, input.city),
    env.DB.prepare(`INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,assigned_to,data,created_at,moving_status) SELECT ?,?,?,owners.id,?,?,(SELECT id FROM users WHERE city=? AND role='manager' ORDER BY created_at LIMIT 1),?,?,? FROM owners WHERE contact_key=? AND NOT EXISTS(SELECT 1 FROM leads WHERE request_id=?) AND ${propertyGuard} ON CONFLICT(request_id) DO NOTHING`)
      .bind(id, requestId, hash, input.city, input.service, input.city, JSON.stringify(data), now, input.service === 'moving' ? 'requested' : 'none', contactKey, requestId, property, property, input.city),
    env.DB.prepare(`INSERT INTO notifications(id,lead_id,sync_enabled) SELECT ?,id,1 FROM leads WHERE request_id=? AND request_hash=? ON CONFLICT(lead_id) DO NOTHING`).bind(crypto.randomUUID(), requestId, hash),
    // Make the first Signal attempt in this request. A future next_attempt here
    // misses waitUntil delivery and otherwise waits for the next minute cron.
    env.DB.prepare(signalQueueSql).bind(crypto.randomUUID(),0,requestId,hash,env.SIGNAL_ENABLED==='true'?1:0),
    env.DB.prepare('SELECT id,request_hash FROM leads WHERE request_id=?').bind(requestId),
  ];
  const result = await env.DB.batch<{ id: string; request_hash: string }>(statements);
  const row = result[4].results[0];
  if (!row) throw new HttpError(400, '关联房源不存在或城市不匹配 / Invalid property or city');
  // Limit request-time delivery to one HTTP timeout; cron resumes all remaining durable work.
  ctx.waitUntil(deliverNotifications(env, 1).catch(() => console.error(JSON.stringify({ event: 'notification_worker_error' }))));
  return row.request_hash !== hash ? retry(row) : finish(request, row.id === id ? 201 : 200, { id: row.id, city: input.city, requestId }, prepared);
}
