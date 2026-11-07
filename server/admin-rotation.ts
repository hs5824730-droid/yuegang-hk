import {z} from 'zod';
import {loginNameSchema} from './login-identity';
import type {ReceptionDB} from './reception';

export const adminRotationSchema=z.object({
 loginName:loginNameSchema,
 passwordHash:z.string().regex(/^pbkdf2-sha256\$100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/),
});
export const adminRotationRequestSchema=adminRotationSchema.extend({currentPassword:z.string().min(1).max(128)});
/** Explicit deployment step only. Not called on bootstrap/login/cron. Receives hashes, never a plain password. */
export async function rotateExistingAdmin(db:ReceptionDB,userId:string,prepared:unknown,expectedHash?:string){
 const input=adminRotationSchema.parse(prepared);
 const rows=await db.all('SELECT id,role,password_hash FROM users WHERE id=?',[userId]);
 const user=rows[0];if(!user||user.role!=='admin')throw Error('Existing administrator must be selected explicitly');
 const old=String(user.password_hash);
 if(expectedHash&&old!==expectedHash)throw Error('Credentials changed concurrently');
 await db.batch([
  {sql:'UPDATE users SET password_hash=? WHERE id=? AND role=\'admin\' AND password_hash=?',args:[input.passwordHash,userId,old]},
  {sql:`INSERT INTO user_login_aliases(login_name,user_id) SELECT ?,id FROM users WHERE id=? AND password_hash=?
   ON CONFLICT(user_id) DO UPDATE SET login_name=excluded.login_name`,args:[input.loginName,userId,input.passwordHash]},
  {sql:'DELETE FROM sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND password_hash=?)',args:[userId,userId,input.passwordHash]},
  {sql:`INSERT INTO audit(user_id,action,resource_id,created_at) SELECT id,'admin.credentials.rotate',id,? FROM users WHERE id=? AND password_hash=?`,args:[new Date().toISOString(),userId,input.passwordHash]},
 ]);
 const check=(await db.all('SELECT u.id FROM users u JOIN user_login_aliases a ON a.user_id=u.id WHERE u.id=? AND u.password_hash=? AND a.login_name=?',[userId,input.passwordHash,input.loginName]))[0];
 if(!check)throw Error('Credentials changed concurrently; re-read current state before attempting rotation');
 return{userId,loginName:input.loginName,sessionsRevoked:true};
}
