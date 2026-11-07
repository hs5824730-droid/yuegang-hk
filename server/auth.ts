import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { config } from './config.js';
import type { User } from './schema.js';

declare global { namespace Express { interface Request { user?: User; } } }
export { passwordHash, checkPassword } from './password.js';
import { passwordHash } from './password.js';
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export function createSession(res: Response, userId: string) {
  const token = randomBytes(32).toString('base64url');
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  db.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').run(tokenHash(token), userId, Date.now() + 8 * 3600000);
  res.cookie('house_session', token, { signed: true, httpOnly: true, secure: config.production, sameSite: 'strict', maxAge: 8 * 3600000, path: '/' });
}
export function readSession(req: Request, _res: Response, next: NextFunction) {
  const token = req.signedCookies?.house_session;
  if (typeof token === 'string') req.user = db.prepare(`SELECT u.id,u.name,u.email,u.role,u.city FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?`).get(tokenHash(token), Date.now()) as User | undefined;
  next();
}
export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) { res.status(401).json({ error: '请先登录 / Sign in required' }); return; }
  next();
}
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') { res.status(403).json({ error: '没有操作权限 / Permission denied' }); return; }
  next();
}
export const canAccessCity = (user: User, city: string) => user.role === 'admin' || user.city === city;
export const canManageCity = (user: User, city: string) => user.role !== 'assistant' && canAccessCity(user, city);
export function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  if (!db.prepare('SELECT id FROM users WHERE email=?').get(email)) {
    db.prepare('INSERT INTO users(id,name,email,password_hash,role,city,created_at) VALUES(?,?,?,?,?,?,?)')
      .run(randomUUID(), 'Administrator', email, passwordHash(password), 'admin', null, new Date().toISOString());
  }
}
