import type {ReceptionDB} from './reception';import type {RegistrationSheetsEnv} from './registration-sheets';import {SHEET_HEADERS} from './registration-sheets';import type {User} from './schema';
import {base64url,googleClientConfigured,oauthHash,sealGoogle,openGoogle,REGISTRATION_GOOGLE_SHEET} from './registration-google-store';
export const GOOGLE_CALLBACK='/api/registration-google/callback',GOOGLE_SCOPE='https://www.googleapis.com/auth/spreadsheets';
const cookieName='eucove_registration_oauth',random=()=>base64url(crypto.getRandomValues(new Uint8Array(32))),cookie=(v:string,clear=false)=>`${cookieName}=${v}; Path=${GOOGLE_CALLBACK}; HttpOnly; Secure; SameSite=Lax; Max-Age=${clear?0:600}`;
function origin(env:RegistrationSheetsEnv){const value=new URL(env.APP_URL||'https://eucove.com');if(value.protocol!=='https:')throw Error('google_https_required');return value.origin}
const json=(error:string,status:number)=>new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function registrationGoogleStart(db:ReceptionDB,env:RegistrationSheetsEnv,user:User):Promise<Response>{
 if(user.role!=='admin')return json('没有操作权限 / Permission denied',403);
 if(!googleClientConfigured(env))return json('Google 专用客户端尚未配置 / Google client is not configured',503);
 const now=Date.now();await db.batch([{sql:'DELETE FROM registration_google_oauth_states WHERE expires_at<?',args:[now]}]);
 const [count]=await db.all('SELECT count(*) AS n FROM registration_google_oauth_states WHERE user_id=? AND used_at=0',[user.id]);if(Number(count.n)>=8)return json('请稍后重试 / Please try later',429);
 const state=random(),nonce=random(),verifier=random()+random(),challenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
 await db.batch([{sql:'INSERT INTO registration_google_oauth_states(state_hash,cookie_hash,verifier_cipher,user_id,expires_at) VALUES(?,?,?,?,?)',args:[await oauthHash(state),await oauthHash(nonce),await sealGoogle(verifier,env.SESSION_SECRET!),user.id,now+600000]}]);
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:env.REGISTRATION_GOOGLE_CLIENT_ID!,redirect_uri:origin(env)+GOOGLE_CALLBACK,response_type:'code',scope:GOOGLE_SCOPE,access_type:'offline',prompt:'consent',state,code_challenge:challenge,code_challenge_method:'S256'}).toString();
 return new Response(null,{status:302,headers:{Location:url.href,'Set-Cookie':cookie(nonce),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
export async function registrationGoogleCallback(db:ReceptionDB,env:RegistrationSheetsEnv,request:Request,transport:typeof fetch=fetch):Promise<Response>{
 const fail=(code:string)=>new Response(null,{status:303,headers:{Location:origin(env)+'/admin/rental-registrations?google='+code,'Set-Cookie':cookie('',true),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 if(!googleClientConfigured(env))return fail('not_configured');
 let stage='state';
 try{
  const url=new URL(request.url),state=url.searchParams.get('state')||'',code=url.searchParams.get('code')||'',nonce=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
  if(!/^[\w-]{43}$/.test(state)||!/^[\w-]{43}$/.test(nonce))return fail('invalid_state');
  const rows=await db.all('UPDATE registration_google_oauth_states SET used_at=? WHERE state_hash=? AND cookie_hash=? AND used_at=0 AND expires_at>? RETURNING verifier_cipher,user_id',[Date.now(),await oauthHash(state),await oauthHash(nonce),Date.now()]);
  if(rows.length!==1)return fail('expired_state');const saved=rows[0];
  const [account]=await db.all('SELECT role FROM users WHERE id=?',[saved.user_id]);if(account?.role!=='admin')return fail('permission_changed');
  if(url.searchParams.has('error'))return fail('declined');if(!code||code.length>2048)return fail('invalid_code');
  stage='verifier';const verifier=await openGoogle(String(saved.verifier_cipher),env.SESSION_SECRET!);
  stage='token_request';
  const response=await transport('https://oauth2.googleapis.com/token',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(20000),body:new URLSearchParams({client_id:env.REGISTRATION_GOOGLE_CLIENT_ID!,client_secret:env.REGISTRATION_GOOGLE_CLIENT_SECRET!,grant_type:'authorization_code',code,redirect_uri:origin(env)+GOOGLE_CALLBACK,code_verifier:verifier})});const tokens=await response.json() as Record<string,unknown>;
  if(!response.ok||typeof tokens.access_token!=='string'||typeof tokens.refresh_token!=='string'||tokens.refresh_token.length>4096)return fail('authorization_failed');
  if(typeof tokens.scope==='string'&&tokens.scope.split(' ').filter(Boolean).some(scope=>scope!==GOOGLE_SCOPE))return fail('unexpected_scope');
  stage='sheet_request';const range=encodeURIComponent("'"+(env.REGISTRATION_SHEETS_TAB||'房东登记').replaceAll("'","''")+"'!A1:Y1");
  const sheet=await transport('https://sheets.googleapis.com/v4/spreadsheets/'+REGISTRATION_GOOGLE_SHEET+'/values/'+range+'?valueRenderOption=UNFORMATTED_VALUE',{headers:{Authorization:'Bearer '+tokens.access_token},redirect:'manual',signal:AbortSignal.timeout(20000)});const headers=await sheet.json() as {values?:unknown[][]};
  if(!sheet.ok||JSON.stringify(headers.values?.[0])!==JSON.stringify(SHEET_HEADERS))return fail('sheet_check_failed');
  stage='save_connection';await db.batch([{sql:'INSERT INTO registration_google_connection(id,token_cipher,enabled,connected_at,connected_by) VALUES(1,?,1,?,?) ON CONFLICT(id) DO UPDATE SET token_cipher=excluded.token_cipher,enabled=1,connected_at=excluded.connected_at,connected_by=excluded.connected_by',args:[await sealGoogle(tokens.refresh_token,env.SESSION_SECRET!),new Date().toISOString(),saved.user_id]}]);
  return fail('connected');
 }catch{return fail('connection_failed_'+stage)}
}
