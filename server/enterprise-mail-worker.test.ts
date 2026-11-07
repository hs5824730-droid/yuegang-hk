import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions,Response as MFResponse} from 'miniflare';
import {applyTestMigrations} from './test-migrations.js';
import {ingestMail} from './enterprise-mail.js';
import type {ReceptionDB} from './reception.js';

test('real D1 and Worker: mail role isolation, persistent drafts, identity and public sender',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'eucove-mail-worker-')),bundle=path.join(dir,'worker.mjs');let sendCount=0;const paths:string[]=[];
 await build({entryPoints:['worker/index.ts'],outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2023',external:['node:*'],logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['MEDIA'],bindings:{APP_URL:'https://eucove.com',DISABLE_TELEGRAM:'true',SIGNAL_ENABLED:'false',MAIL_ENABLED:'false',MAIL_SEND_ENABLED:'true',SESSION_SECRET:'mail-worker-fixture-secret-123456789012345678',ADMIN_EMAIL:'test@example.test',ADMIN_PASSWORD:'MailWorkerFixture2026!',ZOHO_ACCOUNT_ID:'a1',ZOHO_CLIENT_ID:'fixture',ZOHO_CLIENT_SECRET:'fixture',ZOHO_REFRESH_TOKEN:'fixture'},serviceBindings:{ASSETS:()=>new MFResponse('fixture')},outboundService:async request=>{
  const url=new URL(request.url);paths.push(url.origin+url.pathname);
  if(url.origin==='https://accounts.zoho.com')return MFResponse.json({access_token:'fixture'});
  assert.equal(url.origin,'https://mail.zoho.com','No unexpected outbound requests');
  if(url.pathname==='/api/accounts')return MFResponse.json({status:{code:200},data:[{accountId:'a1',primaryEmailAddress:'contact@eucove.com',sendMailDetails:[{fromAddress:'contact@eucove.com',displayName:'contact'}]}]});
  assert.equal(request.method,'POST');sendCount++;const body=await request.json() as any;assert.equal(body.fromAddress,'contact <contact@eucove.com>');assert.equal(body.toAddress,'customer1@example.test');assert.ok(body.content.endsWith('contact\nEUCOVE'));
  return MFResponse.json({status:{code:200},data:{messageId:'sent1'}});
 }}));
 let serial=0;
 const request=async(route:string,method='GET',body?:unknown,cookie='')=>{
  const res=await mf.dispatchFetch('https://eucove.com'+route,{method,headers:{Origin:'https://eucove.com','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.'+(++serial),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:res.status,body:await res.json() as any,cookie:res.headers.get('set-cookie')?.split(';')[0]||''};
 };
 try{
  const d1=await mf.getD1Database('DB');await applyTestMigrations(d1);
  const db:ReceptionDB={all:async(sql,args=[])=>(await d1.prepare(sql).bind(...args).all()).results as any[],batch:async qs=>{await d1.batch(qs.map(q=>d1.prepare(q.sql).bind(...q.args)));}};
  const admin=await request('/api/admin/login','POST',{email:'test@example.test',password:'MailWorkerFixture2026!'});assert.equal(admin.status,200);
  const create=await request('/api/admin/users','POST',{name:'江承裕',email:'chengyu@eucove.com',password:'StaffFixturePassword2026!',role:'mail'},admin.cookie);assert.equal(create.status,201,JSON.stringify(create.body));
  const login=await request('/api/admin/login','POST',{email:'chengyu@eucove.com',password:'StaffFixturePassword2026!'});assert.equal(login.status,200);
  for(const id of ['1','2'])await ingestMail(db,'a1',{messageId:id,threadId:id,folderId:'inbox',fromAddress:'customer'+id+'@example.test',sender:'示例客户',subject:'咨询',receivedTime:String(Date.now())},'咨询正文',[]);
  const list=await request('/api/admin/mail','GET',undefined,login.cookie);assert.equal(list.body.threads.length,1);assert.equal(list.body.threads[0].recipient,'江承裕');
  for(const route of ['/api/admin/leads','/api/admin/users','/api/admin/stats','/api/admin/properties','/api/admin/reception'])assert.equal((await request(route,'GET',undefined,login.cookie)).status,403);
  assert.equal((await request('/api/admin/mail/a1%3A2','GET',undefined,login.cookie)).status,404);
  assert.equal((await request('/api/admin/mail','GET')).status,401);
  assert.equal((await request('/api/admin/mail/a1%3A1/draft','PUT',{content:'您好，请提供地址。'},login.cookie)).status,200);
  assert.equal((await request('/api/admin/mail/a1%3A1','GET',undefined,login.cookie)).body.draft,'您好，请提供地址。');
  const input={requestId:crypto.randomUUID(),version:1,content:'您好，请提供地址。'};
  const send=await request('/api/admin/mail/a1%3A1/reply','POST',input,login.cookie);assert.equal(send.status,200,JSON.stringify(send.body));assert.equal(send.body.reply.status,'sent',JSON.stringify({paths,sendCount}));
  await request('/api/admin/mail/a1%3A1/reply','POST',input,login.cookie);assert.equal(sendCount,1);
  assert.equal((await request('/api/admin/mail/a1%3A1','GET',undefined,login.cookie)).body.draft,'');
  const logout=await request('/api/admin/logout','POST',{},login.cookie);assert.equal(logout.status,200);
 }finally{await mf.dispose();if(!path.relative(tmpdir(),dir).startsWith('..'))rmSync(dir,{recursive:true,force:true});}
});
