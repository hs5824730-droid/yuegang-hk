import { scrypt } from 'node:crypto';
const encode = (value: string) => new TextEncoder().encode(value);
export const hex = (bytes: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
const unhex = (value: string) => Uint8Array.from(value.match(/../g) || [], byte => parseInt(byte, 16));
export const sha256 = async (value: string) => hex(await crypto.subtle.digest('SHA-256', encode(value)));
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function hmac(secret: string, value: string) {
  return hex(await crypto.subtle.sign('HMAC', await hmacKey(secret), encode(value)));
}
async function constantEqual(a: Uint8Array, b: Uint8Array) {
  // Compare via HMAC verification rather than value-dependent JavaScript string comparisons.
  const key = await hmacKey(randomToken());
  return crypto.subtle.verify('HMAC', key, await crypto.subtle.sign('HMAC', key, new Uint8Array(a).buffer), new Uint8Array(b).buffer);
}
const iterations = 100000;
async function derive(password: string, salt: Uint8Array, rounds: number) {
  const key = await crypto.subtle.importKey('raw', encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt).buffer, iterations: rounds }, key, 256));
}
export async function passwordHash(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${iterations}$${hex(salt)}$${hex(await derive(password, salt, iterations))}`;
}
export async function checkPassword(password: string, hash: string) {
  const parts = hash.split('$');
  if (parts[0] === 'pbkdf2-sha256') {
    const rounds = Number(parts[1]);
    if (parts.length !== 4 || rounds !== iterations || !/^[a-f0-9]{32}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3])) return false;
    return constantEqual(await derive(password, unhex(parts[2]), rounds), unhex(parts[3]));
  }
  // Backward compatibility for the existing Node scrypt password hashes. Upgrade on successful login.
  const [salt, digest] = hash.split(':');
  if (!/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(digest || '')) return false;
  const actual = await new Promise<Uint8Array>((resolve, reject) => scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key)));
  return constantEqual(actual, unhex(digest));
}
export async function signCookie(token: string, secret: string) {
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), encode(token)));
  return encodeURIComponent(`s:${token}.${btoa(String.fromCharCode(...bytes)).replace(/=+$/, '')}`);
}
export async function readCookie(header: string | null, secret: string) {
  try {
    const raw = header?.split(';').map(part => part.trim()).find(part => part.startsWith('house_session='))?.slice(14);
    if (!raw) return null;
    const value = decodeURIComponent(raw);
    if (!value.startsWith('s:')) return null;
    const split = value.lastIndexOf('.'); const token = value.slice(2, split); const signature = value.slice(split + 1);
    if (!/^[a-zA-Z0-9_-]{32,128}$/.test(token) || !/^[A-Za-z0-9+/]{43}$/.test(signature)) return null;
    const bytes = Uint8Array.from(atob(signature + '='), char => char.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', await hmacKey(secret), bytes, encode(token)) ? token : null;
  } catch { return null; }
}
