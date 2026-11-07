import { randomBytes, scryptSync, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function checkPassword(password: string, hash: string) {
  if (hash.startsWith('pbkdf2-sha256$')) {
    const [_, rounds, salt, digest] = hash.split('$');
    return hash.split('$').length === 4 && rounds === '100000' && /^[a-f0-9]{32}$/.test(salt || '') && /^[a-f0-9]{64}$/.test(digest || '')
      && timingSafeEqual(pbkdf2Sync(password, Buffer.from(salt, 'hex'), 100000, 32, 'sha256'), Buffer.from(digest, 'hex'));
  }
  const [salt, digest] = hash.split(':');
  if (!salt || !digest || digest.length !== 128) return false;
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(digest, 'hex'));
}
