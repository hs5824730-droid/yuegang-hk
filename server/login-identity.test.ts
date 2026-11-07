import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions,Response as MFResponse} from 'miniflare';
import {loginSchema} from './login-identity';
import {rotateExistingAdmin} from './admin-rotation';
import {passwordHash as portableHash} from '../worker/crypto';
import {applyTestMigrations} from './test-migrations';
import type {ReceptionDB} from './reception';

test('sign-in aliases normalize safely while email clients remain compatible',()=>{
 assert.equal(loginSchema.parse({login:' Review-Admin ',password:'fixture'}).identity,'review-admin');
 assert.equal(loginSchema.parse({email:'Fixture@Example.test',password:'fixture'}).identity,'fixture@example.test');
 for(const value of [{login:'<script>',password:'x'},{password:'x'},{login:'valid',email:'different',password:'x'},{login:'valid',password:''}])assert.equal(loginSchema.safeParse(value).success,false);
});

test('Node: rotation preserves original identity/role/history, revokes sessions, and rejects old passwords',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'eucove-alias-node-'));
 Object.assign(process.env,{NODE_ENV:'test',DATABASE_PATH:path.join(dir,'db.sqlite'),UPLOAD_DIR:path.join(dir,'uploads'),APP_URL:'http://localhost',SESSION_SECRET:'alias-fixture-only-secret-123456789012345678',ADMIN_EMAIL:'alias-fixture@example.test',ADMIN_PASSWORD:'OldAliasFixture2026!',DISABLE_TELEGRAM:'true',SIGNAL_ENABLED:'false',MAIL_ENABLED:'false',MAIL_SEND_ENABLED:'false'});
 const {createApp}=await import('./app');const{db,transaction}=await import('./db');
 const app=createApp(),server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+(server.address() as import('net').AddressInfo).port;
 const adapter:ReceptionDB={all:async(sql,args=[])=>db.prepare(sql).all(...args as any[]) as any[],batch:async qs=>transaction(()=>{for(const q of qs)db.prepare(q.sql).run(...q.args as any[])})};
 const login=async(input:unknown)=>fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost'},body:JSON.stringify(input)});
 try{
  const first=await login({email:'alias-fixture@example.test',password:'OldAliasFixture2026!'});assert.equal(first.status,200);const original=(await first.json()).user,oldCookie=first.headers.get('set-cookie')!.split(';')[0];
  db.prepare("INSERT INTO audit(user_id,action,resource_id,created_at) VALUES(?,'fixture.history',?,'2026-10-26')").run(original.id,original.id);
  const next={loginName:'review-admin',passwordHash:await portableHash('NewAliasFixture2026!..')};
  const rotation=await fetch(base+'/api/admin/account/credentials',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost',Cookie:oldCookie},body:JSON.stringify({...next,currentPassword:'OldAliasFixture2026!'})});assert.equal(rotation.status,200);assert.equal((await rotation.json()).userId,original.id);
  assert.equal((await(await fetch(base+'/api/admin/session',{headers:{Cookie:oldCookie}})).json()).user,null);
  assert.equal((await login({login:'review-admin',password:'OldAliasFixture2026!'})).status,401);
  assert.equal((await login({email:'alias-fixture@example.test',password:'OldAliasFixture2026!'})).status,401);
  const good=await login({login:'REVIEW-ADMIN',password:'NewAliasFixture2026!..'});assert.equal(good.status,200);assert.deepEqual((await good.json()).user,original);
  assert.equal((await login({email:'alias-fixture@example.test',password:'NewAliasFixture2026!..'})).status,200);
  assert.equal((await login({login:'unknown-admin',password:'NewAliasFixture2026!..'})).status,401);
  assert.equal((await login({login:'review-admin',password:'NewAliasFixture2026!'})).status,401,'Trailing punctuation is significant');
  assert.equal(db.prepare("SELECT count(*) n FROM audit WHERE action='fixture.history' AND user_id=?").get(original.id)!.n,1);
  assert.equal(db.prepare('SELECT count(*) n FROM users').get()!.n,1);
  const before=db.prepare('SELECT password_hash FROM users WHERE id=?').get(original.id);
  await assert.rejects(rotateExistingAdmin(adapter,'missing',next));assert.deepEqual(db.prepare('SELECT password_hash FROM users WHERE id=?').get(original.id),before);
  // Applying the additive migration repeatedly does not alter an existing alias.
  db.exec(readFileSync('migrations/0014_user_login_aliases.sql','utf8'));assert.equal(db.prepare('SELECT user_id FROM user_login_aliases').get()!.user_id,original.id);
  db.prepare('INSERT INTO users(id,name,email,password_hash,role,city,created_at) VALUES(?,?,?,?,?,?,?)').run('fixture-assistant','Fixture','assistant@example.test','fixture','assistant','Hong Kong Island','2026-10-26');
  db.prepare('INSERT INTO user_login_aliases VALUES(?,?)').run('taken-alias','fixture-assistant');
  await assert.rejects(rotateExistingAdmin(adapter,'fixture-assistant',next));
  await assert.rejects(rotateExistingAdmin(adapter,original.id,{...next,loginName:'taken-alias',passwordHash:await portableHash('UnusedFixture2026!')}));
  assert.deepEqual(db.prepare('SELECT password_hash FROM users WHERE id=?').get(original.id),before,'Alias conflict must roll back the password update');
  const stillSignedIn=await(await fetch(base+'/api/admin/session',{headers:{Cookie:good.headers.get('set-cookie')!.split(';')[0]}})).json();assert.equal(stillSignedIn.user.id,original.id);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));db.close()}
});

test('real Worker/D1: same alias, same canonical administrator, cookie isolation and old-session revocation',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'eucove-alias-worker-')),bundle=path.join(dir,'worker.mjs');
 await build({entryPoints:['worker/index.ts'],outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2023',external:['node:*'],logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['MEDIA'],bindings:{APP_URL:'https://eucove.com',SESSION_SECRET:'alias-worker-fixture-secret-123456789012345678',ADMIN_EMAIL:'worker@example.test',ADMIN_PASSWORD:'OldWorkerAlias2026!',DISABLE_TELEGRAM:'true',SIGNAL_ENABLED:'false',MAIL_ENABLED:'false',MAIL_SEND_ENABLED:'false'},serviceBindings:{ASSETS:(req:Request)=>new URL(req.url).pathname.endsWith('.html')?new MFResponse(null,{status:307,headers:{Location:'/admin-shell'}}):new MFResponse('fixture')},outboundService:()=>{throw Error('No external calls allowed')}}));
 let serial=0;
 const request=async(route:string,body?:unknown,cookie='')=>{const r=await mf.dispatchFetch('https://eucove.com'+route,{method:body?'POST':'GET',headers:{Origin:'https://eucove.com','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.'+(++serial),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,body:await r.json() as any,cookie:r.headers.get('set-cookie')||''}};
 try{
  const d1=await mf.getD1Database('DB');await applyTestMigrations(d1);
  for(const path of ['/.env','/.env.local','/.dev.vars','/.git/config','/__local','/__local/data','/admin-shell','/admin-shell.html'])assert.equal((await mf.dispatchFetch('https://eucove.com'+path)).status,404);
  assert.equal((await mf.dispatchFetch('https://eucove.com/admin/login')).status,200,'Admin shell must not trigger ASSETS .html canonical redirect');
  const db:ReceptionDB={all:async(sql,args=[])=>(await d1.prepare(sql).bind(...args).all()).results as any[],batch:async qs=>{await d1.batch(qs.map(q=>d1.prepare(q.sql).bind(...q.args)))}};
  const first=await request('/api/admin/login',{email:'worker@example.test',password:'OldWorkerAlias2026!'});assert.equal(first.status,200);const original=first.body.user;
  const next={loginName:'review-admin',passwordHash:await portableHash('NewWorkerAlias2026!')};
  assert.equal((await request('/api/admin/account/credentials',{...next,currentPassword:'OldWorkerAlias2026!'})).status,401);
  assert.equal((await request('/api/admin/account/credentials',{...next,currentPassword:'WrongCurrentFixture2026!'},first.cookie.split(';')[0])).status,401);
  const rotation=await request('/api/admin/account/credentials',{...next,currentPassword:'OldWorkerAlias2026!'},first.cookie.split(';')[0]);assert.equal(rotation.status,200);assert.equal(rotation.body.userId,original.id);
  assert.equal((await request('/api/admin/session',undefined,first.cookie.split(';')[0])).body.user,null);
  for(const login of ['review-admin','worker@example.test'])assert.equal((await request('/api/admin/login',{login,password:'OldWorkerAlias2026!'})).status,401);
  const good=await request('/api/admin/login',{login:'Review-Admin',password:'NewWorkerAlias2026!'});assert.equal(good.status,200);assert.deepEqual(good.body.user,original);assert.match(good.cookie,/HttpOnly; SameSite=Strict/);assert.match(good.cookie,/Secure/);assert.doesNotMatch(good.cookie,/Domain=/);
  assert.equal((await request('/api/admin/session',undefined,good.cookie.split(';')[0])).body.user.id,original.id);
  assert.equal((await request('/api/admin/login',{login:'missing-admin',password:'NewWorkerAlias2026!'})).status,401);
  assert.equal((await request('/api/admin/login',{login:'valid',email:'another',password:'fixture'})).status,400);
  assert.equal((await d1.prepare('SELECT count(*) n FROM users').first<any>()).n,1);
 }finally{await mf.dispose()}
});
