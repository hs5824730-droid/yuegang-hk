import {loginSchema,loginUserSql} from '../server/login-identity';
import type { User } from '../server/schema';
import type { AppEnv } from './env';
import { checkPassword, hmac, passwordHash, randomToken, readCookie, sha256, signCookie } from './crypto';
import { HttpError, json, readJson } from './http';
export const canAccessCity = (user: User, city: string) => user.role === 'admin' || user.city === city;
export const canManageCity = (user: User, city: string) => user.role !== 'assistant' && canAccessCity(user, city);
export function requireAdmin(user: User) { if (user.role !== 'admin') throw new HttpError(403, '没有操作权限 / Permission denied'); }
export function requireSecret(env: AppEnv) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new HttpError(503, '服务尚未配置 / Service not configured');
  return env.SESSION_SECRET;
}
export async function readSession(request: Request, env: AppEnv) {
  if (!env.SESSION_SECRET) return null;
  const token = await readCookie(request.headers.get('Cookie'), env.SESSION_SECRET);
  if (!token) return null;
  return env.DB.prepare('SELECT u.id,u.name,u.email,u.role,u.city FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?').bind(await sha256(token), Date.now()).first<User>();
}
export const audit = (env: AppEnv, userId: string, action: string, resource: string) => env.DB.prepare('INSERT INTO audit(user_id,action,resource_id,created_at) VALUES(?,?,?,?)').bind(userId, action, resource, new Date().toISOString());
export async function rateLimit(request: Request, env: AppEnv, action: string, limit: number, windowMs: number) {
  const now = Date.now(); const window = Math.floor(now / windowMs);
  const key = await hmac(requireSecret(env), `${action}:${request.headers.get('CF-Connecting-IP') || 'local'}:${window}`);
  const row = await env.DB.prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count')
    .bind(key, (window + 1) * windowMs).first<{ count: number }>();
  if (!row || row.count > limit) throw new HttpError(429, '操作过于频繁，请稍后再试 / Too many requests. Please try later.');
}
export async function login(request: Request, env: AppEnv) {
  const secret = requireSecret(env);
  await rateLimit(request, env, 'login', 10, 15 * 60000);
  const input = loginSchema.parse(await readJson(request));
  const email = input.identity;
  let row = await env.DB.prepare(loginUserSql).bind(email,email).first<User & { password_hash: string }>();
  if (!row && email === env.ADMIN_EMAIL?.trim().toLowerCase() && env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length >= 12) {
    await env.DB.prepare('INSERT INTO users(id,name,email,password_hash,role,city,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING')
      .bind(crypto.randomUUID(), 'Administrator', email, await passwordHash(env.ADMIN_PASSWORD), 'admin', null, new Date().toISOString()).run();
    row = await env.DB.prepare('SELECT id,name,email,password_hash,role,city FROM users WHERE email=?').bind(email).first<User & { password_hash: string }>();
  }
  // Equal-cost derivation when the user does not exist; never expose a password hash.
  const dummy = 'pbkdf2-sha256$100000$00000000000000000000000000000000$' + '00'.repeat(32);
  if (!await checkPassword(input.password, row?.password_hash || dummy) || !row) throw new HttpError(401, '账号或密码不正确 / Incorrect sign-in name or password');
  const oldToken = await readCookie(request.headers.get('Cookie'), secret);
  const token = randomToken(); const expires = Date.now() + 8 * 3600000;
  const batch = [env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()), env.DB.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').bind(await sha256(token), row.id, expires), audit(env, row.id, 'login', row.id)];
  if (oldToken) batch.push(env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(await sha256(oldToken)));
  if (!row.password_hash.startsWith('pbkdf2-sha256$')) batch.push(env.DB.prepare('UPDATE users SET password_hash=? WHERE id=? AND password_hash=?').bind(await passwordHash(input.password), row.id, row.password_hash));
  await env.DB.batch(batch);
  const { password_hash: _, ...user } = row;
  return json({ user }, 200, { 'Set-Cookie': `house_session=${await signCookie(token, secret)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` });
}
export async function logout(request: Request, env: AppEnv) {
  const token = await readCookie(request.headers.get('Cookie'), requireSecret(env));
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(await sha256(token)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': `house_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` });
}
