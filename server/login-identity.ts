import {z} from 'zod';

export const loginNameSchema=z.string().trim().min(3).max(64).regex(/^[A-Za-z][A-Za-z0-9._-]*$/).transform(value=>value.toLowerCase());
const identity=z.string().trim().min(1).max(160).refine(value=>loginNameSchema.safeParse(value).success||z.email().safeParse(value).success,'Invalid sign-in name');
/** `email` remains accepted for existing clients. Never derive or replace a user's email from an alias. */
export const loginSchema=z.object({login:identity.optional(),email:identity.optional(),password:z.string().min(1).max(128)})
 .refine(value=>!!(value.login||value.email),'Sign-in name required')
 .refine(value=>!value.login||!value.email||value.login.toLowerCase()===value.email.toLowerCase(),'Conflicting sign-in names')
 .transform(value=>({identity:(value.login||value.email!).toLowerCase(),password:value.password}));
export const loginUserSql=`SELECT u.id,u.name,u.email,u.password_hash,u.role,u.city FROM users u
 LEFT JOIN user_login_aliases a ON a.user_id=u.id WHERE u.email=? OR a.login_name=?`;
