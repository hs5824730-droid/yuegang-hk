import type {ReceptionDB} from './reception';
import type {RegistrationSheetsEnv} from './registration-sheets';
const enc=new TextEncoder(),context=enc.encode('eucove-registration-google-v1');
export const REGISTRATION_GOOGLE_SHEET='17qZqF0GvUsK4X9L_31uQvDwC1rUNGyXTgRy8aISddh0';
export const googleClientConfigured=(env:RegistrationSheetsEnv)=>Boolean(env.REGISTRATION_GOOGLE_CLIENT_ID&&env.REGISTRATION_GOOGLE_CLIENT_SECRET&&env.SESSION_SECRET&&env.SESSION_SECRET.length>=32&&env.REGISTRATION_SHEETS_ID===REGISTRATION_GOOGLE_SHEET);
export function base64url(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
const decode=(value:string)=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export async function oauthHash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))),b=>b.toString(16).padStart(2,'0')).join('')}
async function key(secret:string){if(secret.length<32)throw Error('google_key_unavailable');return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode('registration/google/'+secret)),{name:'AES-GCM'},false,['encrypt','decrypt'])}
export async function sealGoogle(value:string,secret:string){const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:context},await key(secret),enc.encode(value));return 'v1.'+base64url(iv)+'.'+base64url(new Uint8Array(cipher))}
export async function openGoogle(cipher:string,secret:string){const [version,iv,text]=cipher.split('.');if(version!=='v1'||!iv||!text||cipher.length>12000)throw Error('google_cipher_invalid');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv),additionalData:context},await key(secret),decode(text)))}
export async function registrationGoogleEffective(db:ReceptionDB,env:RegistrationSheetsEnv):Promise<RegistrationSheetsEnv>{
 if(env.REGISTRATION_SHEETS_KILL_SWITCH==='true')return {...env,REGISTRATION_SHEETS_ENABLED:'false',REGISTRATION_GOOGLE_REFRESH_TOKEN:undefined};
 if(!googleClientConfigured(env))return env;
 const [row]=await db.all('SELECT token_cipher,enabled FROM registration_google_connection WHERE id=1');
 if(!row)return env;
 if(!row.enabled||env.REGISTRATION_SHEETS_KILL_SWITCH==='true')return {...env,REGISTRATION_SHEETS_ENABLED:'false',REGISTRATION_GOOGLE_REFRESH_TOKEN:undefined};
 try{return {...env,REGISTRATION_GOOGLE_REFRESH_TOKEN:await openGoogle(String(row.token_cipher),env.SESSION_SECRET!),REGISTRATION_SHEETS_ENABLED:'true'}}catch{return {...env,REGISTRATION_GOOGLE_REFRESH_TOKEN:undefined,REGISTRATION_SHEETS_ENABLED:'false'}}
}
export async function registrationGoogleStatus(db:ReceptionDB,env:RegistrationSheetsEnv){const [row]=await db.all('SELECT connected_at FROM registration_google_connection WHERE id=1'),effective=await registrationGoogleEffective(db,env);return {clientConfigured:googleClientConfigured(env),connected:Boolean(row),enabled:effective.REGISTRATION_SHEETS_ENABLED==='true'&&Boolean(effective.REGISTRATION_GOOGLE_REFRESH_TOKEN),connectedAt:row?.connected_at||null,startUrl:new URL('/api/admin/registration-google/start',env.APP_URL||'https://eucove.com').href}}
