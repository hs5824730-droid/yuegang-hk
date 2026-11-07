import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions,Response as MFResponse} from 'miniflare';
import {applyTestMigrations} from './test-migrations';
import {assignReception,saveReception,receptionEvent,receptionReport,type ReceptionDB,type ReceptionTarget} from './reception';
import {deliverDirectContacts,directContactMessage} from './direct-contact-notifications';

const tg={token:'local-fixture',chatId:'local-fixture'},signal={url:'https://local-fixture.up.railway.app',secret:'fixture-only-signal-key-12345678901234567890',appUrl:'https://fixture.invalid'};
function nativeDB(){const db=new DatabaseSync(':memory:');for(const name of readdirSync('migrations').filter(n=>n.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+name,'utf8'));return db;}
function adapter(native:DatabaseSync):ReceptionDB{return{all:async(sql,args=[])=>native.prepare(sql).all(...args as any[]) as any[],batch:async qs=>{native.exec('BEGIN IMMEDIATE');try{for(const q of qs)native.prepare(q.sql).run(...q.args as any[]);native.exec('COMMIT');}catch(e){native.exec('ROLLBACK');throw e;}}};}
const target=(cities:any[],name:string,order:number):ReceptionTarget=>({id:randomUUID(),channel:'whatsapp',enabled:true,cities,queueOrder:order,groupId:'fixture',groupName:'Fixture group',groupOrder:0,targetOrder:order,value:'+44770090000'+(order+1),displayName:name});
const input=(overrides={})=>({requestId:randomUUID(),channel:'whatsapp',source:'website_direct',pagePath:'/services',city:'Hong Kong Island',service:'manage',language:'zh',...overrides});
async function checks(db:ReceptionDB){
 await db.batch([{sql:"UPDATE notification_channels SET enabled=1,enabled_at='2026-01-01T00:00:00Z' WHERE channel='signal'",args:[]}]);
 const a=target(['Hong Kong Island'],'示例 A',0),b=target([],'示例 B',1);await saveReception(db,{targets:[a,b]});
 await assignReception(db,{requestId:randomUUID(),channel:'whatsapp'});assert.equal((await db.all('SELECT * FROM direct_contact_notifications')).length,0,'Existing share links do not create a new direct notification');
 const request=input();const results=await Promise.all(Array.from({length:8},()=>assignReception(db,request)));assert(results.every(r=>r.id===results[0].id));
 assert.equal((await db.all('SELECT * FROM direct_contact_notifications')).length,2);
 assert.equal((await db.all('SELECT * FROM leads')).length,0);assert.equal((await db.all('SELECT * FROM owners')).length,0);assert.equal((await db.all('SELECT * FROM notifications')).length,0);assert.equal((await db.all('SELECT * FROM signal_notifications')).length,0);
 const city=await assignReception(db,input({city:'Kowloon'}));assert.equal(city.target!.id,b.id,'Only global wildcard can match Kowloon');
 await assert.rejects(()=>assignReception(db,{...request,city:'Kowloon'}),/different|其他/);
 await assert.rejects(()=>assignReception(db,input({pagePath:'/admin'})));
 await assert.rejects(()=>assignReception(db,input({leadRequestId:randomUUID()})));
 // Restrict all targets: no cross-city fallback; still one persisted no-match with both statuses.
 await saveReception(db,{targets:[a,{...b,cities:['Hong Kong Island']}]});
 const noMatch=await assignReception(db,input({city:'New Territories'}));assert.equal(noMatch.target,null);assert.equal(noMatch.outcome,'no_city_match');
 const global=await assignReception(db,input({city:undefined,service:undefined}));assert(global.target);assert.equal(global.scope,'global');
 const batch=await Promise.all(Array.from({length:10},()=>assignReception(db,input())));assert.equal(batch.filter(r=>r.target!.id===a.id).length,5);assert.equal(batch.filter(r=>r.target!.id===b.id).length,5);
 const selected=results[0];const snapshot=(await receptionReport(db)).records.find(r=>r.id===selected.id)!;
 await saveReception(db,{targets:[{...a,displayName:'Changed',value:'+447700900099',enabled:false},b]});
 const after=(await receptionReport(db)).records.find(r=>r.id===selected.id)!;assert.deepEqual(after.target,snapshot.target);assert.equal(after.directContext?.source,'website_direct');assert.equal(after.notifications.length,2);assert(after.destinationUrl?.startsWith('https://wa.me/'));
 await receptionEvent(db,{requestId:randomUUID(),assignmentId:selected.id,channel:'whatsapp',type:'whatsapp_click'});await receptionEvent(db,{requestId:randomUUID(),assignmentId:selected.id,channel:'whatsapp',type:'whatsapp_click'});
 assert((await db.all('SELECT revision FROM direct_contact_notifications WHERE assignment_id=?',[selected.id])).every(r=>r.revision===1));
 return selected.id;
}
test('direct contact SQLite: future-only migration, no fake lead, city/global, retries/concurrency and immutable snapshot',async()=>{
 const native=new DatabaseSync(':memory:');for(const name of readdirSync('migrations').filter(n=>n.endsWith('.sql')&&n<'0010').sort())native.exec(readFileSync('migrations/'+name,'utf8'));
 const oldId=randomUUID();native.prepare("INSERT INTO reception_channel_assignments(id,channel,request_id,created_at) VALUES(?,'whatsapp',?,'2026-01-01T00:00:00Z')").run(oldId,randomUUID());const old=native.prepare('SELECT target_data FROM reception_channel_assignments WHERE id=?').get(oldId);
 native.exec(readFileSync('migrations/0010_direct_contact_notifications.sql','utf8')+readFileSync('migrations/0011_direct_phone_events.sql','utf8')+readFileSync('migrations/0012_notification_recipients.sql','utf8'));assert.equal(native.prepare('SELECT COUNT(*) n FROM direct_contact_notifications').get()!.n,0);assert.deepEqual(native.prepare('SELECT target_data FROM reception_channel_assignments WHERE id=?').get(oldId),old);
 try{await checks(adapter(native));}finally{native.close();}
});
test('direct notifications: shared preview, leases, one message + late edit, failure isolation/uncertainty and no historical replay',async()=>{
 const native=nativeDB(),db=adapter(native),original=globalThis.fetch;
 const sent:{transport:string;body:any}[]=[],ids=new Map<string,number>();let failTg=false,uncertainSignal=false;
 globalThis.fetch=(async(url:any,init?:RequestInit)=>{
  const u=new URL(String(url)),body=JSON.parse(String(init?.body));
  if(u.hostname==='api.telegram.org'){if(failTg)throw Error('local network failure');sent.push({transport:'telegram',body});return Response.json({ok:true,result:{message_id:body.message_id||101}});}
  assert.equal(u.hostname,'local-fixture.up.railway.app');assert.match(body.id,/^[a-f0-9-]{36}$/);assert.match(new Headers(init?.headers).get('x-eucove-signature')!,/^[a-f0-9]{64}$/);
  if(uncertainSignal)return Response.json({error:'delivery_uncertain'},{status:409});
  sent.push({transport:'signal',body});const key=body.id+':'+body.revision;if(!ids.has(key))ids.set(key,Date.now());return Response.json({ok:true,timestamp:ids.get(key)});
 }) as typeof fetch;
 try{
  await db.batch([{sql:"UPDATE notification_channels SET enabled=1,enabled_at='2026-01-01' WHERE channel='signal'",args:[]}]);await saveReception(db,{targets:[target([],'示例接待',0)]});
  const assigned=await assignReception(db,input({city:undefined,service:undefined}));const due=()=>db.batch([{sql:'UPDATE direct_contact_notifications SET next_attempt=0,edit_next_attempt=0',args:[]}]);await due();
  await Promise.all([deliverDirectContacts(db,'telegram',tg),deliverDirectContacts(db,'telegram',tg),deliverDirectContacts(db,'signal',signal)]);
  assert.equal(sent.length,2);assert.equal(sent[0].body.text,sent[1].body.text);assert.match(sent[0].body.text,/客户姓名】未提供/);assert.match(sent[0].body.text,/联系电话】未提供/);assert.match(sent[0].body.text,/房屋所在城市】未选择/);assert.match(sent[0].body.text,/动作状态：已分配/);assert.doesNotMatch(sent[0].body.text,/https?:|\/admin|已发送聊天|已读/);
  await receptionEvent(db,{requestId:randomUUID(),assignmentId:assigned.id,channel:'whatsapp',type:'whatsapp_click'});await due();
  await Promise.all([deliverDirectContacts(db,'telegram',tg),deliverDirectContacts(db,'signal',signal)]);assert.equal(sent.length,4);assert.equal(sent[2].body.message_id,101);assert.equal(sent[1].body.id,sent[3].body.id);assert.equal(sent[3].body.revision,1);assert.match(sent[3].body.text,/动作状态：已发起跳转/);
  await Promise.all([deliverDirectContacts(db,'telegram',tg),deliverDirectContacts(db,'signal',signal)]);assert.equal(sent.length,4);
  const failed=await assignReception(db,input());await due();failTg=true;await Promise.all([deliverDirectContacts(db,'telegram',tg),deliverDirectContacts(db,'signal',signal)]);
  const status=(await receptionReport(db)).records.find(r=>r.id===failed.id)!.notifications;assert.equal(status.find((n:{transport:string;status:string})=>n.transport==='telegram')!.status,'uncertain');assert.equal(status.find((n:{transport:string;status:string})=>n.transport==='signal')!.status,'sent');
  failTg=false;await due();await deliverDirectContacts(db,'telegram',tg);assert.equal(sent.filter(s=>s.transport==='telegram').length,2,'Unknown sends are not blindly retried');
  const uncertain=await assignReception(db,input());await due();uncertainSignal=true;await deliverDirectContacts(db,'signal',signal);assert.equal((await db.all("SELECT status FROM direct_contact_notifications WHERE assignment_id=? AND transport='signal'",[uncertain.id]))[0].status,'uncertain');
  await db.batch([{sql:"UPDATE direct_contact_notifications SET next_attempt=9999999999999 WHERE transport='telegram' AND status='pending'",args:[]}]);const crash=await assignReception(db,input());await db.batch([{sql:"UPDATE direct_contact_notifications SET attempts=1,claim_token='interrupted',claimed_until=1,next_attempt=0 WHERE assignment_id=? AND transport='telegram'",args:[crash.id]}]);const sendsBefore=sent.length;await deliverDirectContacts(db,'telegram',tg);assert.equal((await db.all("SELECT status FROM direct_contact_notifications WHERE assignment_id=? AND transport='telegram'",[crash.id]))[0].status,'uncertain');assert.equal(sent.length,sendsBefore,'Expired initial Telegram lease is uncertain, never a blind resend');
  const row={direct_context:JSON.stringify({service:'management'}),channel:'whatsapp',routing_city:'Hong Kong Island',routing_scope:'city',created_at:'2026-10-23T16:00:00Z',target_data:null,actions:0};const text=directContactMessage(row);assert.match(text,/该城暂无可用接待/);assert.match(text,/北京时间：2026-10-24 00:00:00/);assert.match(text,/分配目标：未分配/);
 }finally{globalThis.fetch=original;native.close();}
});
test('real workerd/D1: identical direct assignment/outbox contract, public reads do not allocate, admin status is protected',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'direct-contact-')),bundle=path.join(dir,'worker.mjs');await build({entryPoints:['worker/index.ts'],outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2023',external:['node:*'],logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['MEDIA'],bindings:{APP_URL:'https://fixture.invalid',SESSION_SECRET:'fixture-only-123456789012345678901234567890',DISABLE_TELEGRAM:'true',SIGNAL_ENABLED:'false'},serviceBindings:{ASSETS:()=>new MFResponse('<body>Local fixture</body>',{headers:{'Content-Type':'text/html'}})},outboundService:()=>{throw Error('All external traffic blocked')}}));
 try{
  const d1=await mf.getD1Database('DB');await applyTestMigrations(d1);const db:ReceptionDB={all:async(sql,args=[]) =>(await d1.prepare(sql).bind(...args).all<any>()).results,batch:async qs=>{await d1.batch(qs.map(q=>d1.prepare(q.sql).bind(...q.args)));}};
  await checks(db);
  const before=(await db.all('SELECT COUNT(*) n FROM reception_channel_assignments'))[0].n;assert.equal((await mf.dispatchFetch('https://fixture.invalid/services')).status,200);assert.equal((await db.all('SELECT COUNT(*) n FROM reception_channel_assignments'))[0].n,before);assert.equal((await mf.dispatchFetch('https://fixture.invalid/api/admin/reception')).status,401);
  const send=(body:unknown)=>mf.dispatchFetch('https://fixture.invalid/api/reception/assign',{method:'POST',headers:{Origin:'https://fixture.invalid','Content-Type':'application/json'},body:JSON.stringify(body)});
  const request=input();const first=await send(request);assert.equal(first.status,200);const result=await first.json() as any;assert.equal((await(await send(request)).json() as any).id,result.id);assert.equal((await send(input({pagePath:'/admin'}))).status,400);assert.equal((await db.all('SELECT * FROM leads')).length,0);
 }finally{await mf.dispose();rmSync(dir,{recursive:true,force:true});}
});

test('Node HTTP direct entry: same-origin + validation, protected backend snapshot, no owner/lead creation',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'direct-node-'));Object.assign(process.env,{NODE_ENV:'test',DATABASE_PATH:path.join(dir,'db.sqlite'),UPLOAD_DIR:path.join(dir,'uploads'),SESSION_SECRET:'local-direct-only-key-12345678901234567890',APP_URL:'http://localhost:5173',ADMIN_EMAIL:'direct@example.test',ADMIN_PASSWORD:'LocalDirectFixture2026!',DISABLE_TELEGRAM:'true',SIGNAL_ENABLED:'false'});
 const {createApp}=await import('./app');const {db}=await import('./db');const server=createApp().listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const url='http://127.0.0.1:'+(server.address() as {port:number}).port;
 const post=async(p:string,body:unknown,origin='http://localhost:5173')=>fetch(url+p,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  await saveReception(adapter(db),{targets:[target([],'Local target',0)]});
  assert.equal((await post('/api/reception/assign',input(),'https://evil.invalid')).status,403);
  assert.equal((await post('/api/reception/assign',input({pagePath:'/admin'}))).status,400);
  const request=input();const response=await post('/api/reception/assign',request);assert.equal(response.status,200);const first=await response.json() as any;assert.equal((await(await post('/api/reception/assign',request)).json() as any).id,first.id);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM leads').get()!.n,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM owners').get()!.n,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM notifications').get()!.n,0);
  assert.equal((await fetch(url+'/api/admin/reception')).status,401);
  const login=await post('/api/admin/login',{email:'direct@example.test',password:'LocalDirectFixture2026!'});const cookie=login.headers.get('set-cookie')!.split(';')[0];const report=await(await fetch(url+'/api/admin/reception',{headers:{Cookie:cookie}})).json() as any;
  assert.equal(report.records[0].directContext.source,'website_direct');assert.equal(report.records[0].notifications[0].transport,'telegram');assert(report.records[0].destinationUrl.startsWith('https://wa.me/'));assert.equal(first.target.displayName,undefined);
 }finally{await new Promise<void>(r=>server.close(()=>r()));db.close();}
});
test('activation and lead separation: only new explicit direct contacts enqueue; linked form assignments never duplicate',async()=>{
 const native=nativeDB(),db=adapter(native);
 try{
  await saveReception(db,{targets:[target([],'Local only',0)]});
  const old=await assignReception(db,input());assert.equal((await db.all('SELECT * FROM direct_contact_notifications WHERE assignment_id=?',[old.id])).length,1);
  await db.batch([{sql:"UPDATE notification_channels SET enabled=1,enabled_at='2026-01-01' WHERE channel='signal'",args:[]}]);
  await assignReception(db,input());assert.equal((await db.all('SELECT * FROM direct_contact_notifications')).length,3);assert.equal((await db.all("SELECT * FROM direct_contact_notifications WHERE assignment_id=? AND transport='signal'",[old.id])).length,0);
  const owner=randomUUID(),lead=randomUUID(),request=randomUUID();await db.batch([{sql:'INSERT INTO owners(id,contact_key,contact,name,created_at) VALUES(?,?,?,?,?)',args:[owner,'fixture','fixture-local','Fixture','2026-10-24T00:00:00Z']},{sql:'INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,data,created_at) VALUES(?,?,?,?,?,?,?,?)',args:[lead,request,'fixture',owner,'Hong Kong Island','management','{}','2026-10-24T00:00:00Z']}]);
  await assignReception(db,{requestId:randomUUID(),channel:'whatsapp',leadRequestId:request});assert.equal((await db.all('SELECT * FROM direct_contact_notifications')).length,3);assert.equal((await db.all('SELECT * FROM owners')).length,1);assert.equal((await db.all('SELECT * FROM leads')).length,1);
  const id=await assignReception(db,input());await db.batch([{sql:'UPDATE direct_contact_notifications SET next_attempt=0 WHERE assignment_id=?',args:[id.id]}]);
  const original=globalThis.fetch;let failures=0;globalThis.fetch=(async()=>{failures++;return Response.json({ok:false},{status:429,headers:{'Retry-After':'7'}});}) as typeof fetch;
  try{await deliverDirectContacts(db,'signal',signal);const row=(await db.all("SELECT * FROM direct_contact_notifications WHERE assignment_id=? AND transport='signal'",[id.id]))[0];assert.equal(row.status,'pending');assert(row.next_attempt>Date.now());const count=failures;await deliverDirectContacts(db,'signal',signal);assert.equal(failures,count,'429 pauses this channel');
   await db.batch([{sql:"UPDATE direct_contact_notifications SET attempts=5,claimed_until=0,next_attempt=0 WHERE assignment_id=? AND transport='signal'",args:[id.id]}]);await deliverDirectContacts(db,'signal',signal);assert.equal((await db.all("SELECT status FROM direct_contact_notifications WHERE assignment_id=? AND transport='signal'",[id.id]))[0].status,'failed');
  }finally{globalThis.fetch=original;}
 }finally{native.close();}
});
