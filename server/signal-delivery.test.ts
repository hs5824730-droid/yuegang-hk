import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHmac,createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions,Response as MFResponse} from 'miniflare';
import {applyTestMigrations} from './test-migrations.js';
import {assignReception,receptionEvent,saveReception,type ReceptionDB} from './reception.js';
import {deliverSignal,signalQueueSql} from './signal-delivery.js';
const settings={url:'https://fixture.up.railway.app',secret:'fictional-relay-secret-for-testing-only-123456',appUrl:'https://eucove.com'};
function verifyRequest(url:string,init?:RequestInit){const h=new Headers(init?.headers),body=String(init?.body||''),time=h.get('x-eucove-time')!,nonce=h.get('x-eucove-nonce')!;assert.ok(Math.abs(Date.now()-Number(time))<90000);assert.match(nonce,/^[a-f0-9-]{36}$/);assert.equal(h.get('x-eucove-signature'),createHmac('sha256',settings.secret).update([time,nonce,init?.method||'GET',new URL(url).pathname,createHash('sha256').update(body).digest('hex')].join('\n')).digest('hex'));}
async function checks(db:ReceptionDB){
 const read=async(id:string)=>(await db.all('SELECT * FROM signal_notifications WHERE lead_id=?',[id]))[0];
 const create=async(active=true,createdAt=new Date().toISOString())=>{
  const lead=randomUUID(),request=randomUUID(),owner=randomUUID();await db.batch([
   {sql:'INSERT INTO owners VALUES(?,?,?,?,?)',args:[owner,owner,'+61400000001','Fictional Signal fixture',createdAt]},
   {sql:'INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,data,created_at) VALUES(?,?,?,?,?,?,?,?)',args:[lead,request,'fixture',owner,'Melbourne','letting',JSON.stringify({name:'Fictional <&> fixture',contact:'+61400000001',contactMethod:'whatsapp'}),createdAt]},
   {sql:signalQueueSql,args:[randomUUID(),0,request,'fixture',Number(active)]},
  ]);return {id:lead,requestId:request};
 };
 assert.equal(await read((await create()).id),undefined,'Disabled channels never enqueue');
 await db.batch([{sql:"UPDATE notification_channels SET enabled=1,enabled_at='2026-10-23T00:00:00.000Z' WHERE channel='signal'",args:[]}]);
 assert.equal(await read((await create(true,'2026-10-22T23:59:59Z')).id),undefined,'No historical backfill');assert.equal(await read((await create(false)).id),undefined,'Runtime switch is required too');
 const wa={id:randomUUID(),channel:'whatsapp',enabled:true,cities:['Melbourne'],groupId:'fixture',groupName:'Fictional group',groupOrder:0,targetOrder:0,value:'+61400000002'};await saveReception(db,{targets:[wa]});
 const lead=await create(true,'2026-10-23T16:00:00Z');const original=globalThis.fetch;const calls:any[]=[];let mode='ok';let onSend:(()=>Promise<void>)|null=null;
 globalThis.fetch=(async(url,init)=>{verifyRequest(String(url),init);const input=JSON.parse(String(init?.body));assert.deepEqual(Object.keys(input).sort(),['id','revision','text']);calls.push(input);if(onSend){const action=onSend;onSend=null;await action();}if(mode==='network')throw Error('simulated');if(mode==='429')return Response.json({error:'busy'},{status:429,headers:{'Retry-After':'90'}});if(mode==='uncertain')return Response.json({error:'delivery_uncertain'},{status:409});return Response.json({ok:true,timestamp:1700000000000});}) as typeof fetch;
 const send=()=>deliverSignal(db,settings,20);
 try{
 await Promise.all([send(),send()]);assert.equal(calls.length,1);assert.match(calls[0].text,/等待分配/);assert.equal((await read(lead.id)).status,'sent');await send();assert.equal(calls.length,1);
 const assignment=await assignReception(db,{requestId:lead.requestId,leadRequestId:lead.requestId,channel:'whatsapp'});await send();assert.equal(calls.length,2);assert.equal(calls[0].id,calls[1].id);assert.ok(calls[1].revision>calls[0].revision);assert.match(calls[1].text,/分配目标：\+61400000002/);assert(calls.slice(0,2).every(call=>call.text.endsWith('北京时间：2026-10-24 00:00:00')),'Late Signal revision keeps lead creation time');
 await saveReception(db,{targets:[{...wa,value:'+61400000099',enabled:false}]});await receptionEvent(db,{requestId:randomUUID(),assignmentId:assignment.id,channel:'whatsapp',type:'whatsapp_click'});await send();assert.match(calls.at(-1).text,/61400000002/);assert.doesNotMatch(calls.at(-1).text,/61400000099/);
 const racing=await create();onSend=async()=>{await assignReception(db,{requestId:racing.requestId,leadRequestId:racing.requestId,channel:'whatsapp'});};await send();assert.ok((await read(racing.id)).revision>(await read(racing.id)).delivered_revision);await send();assert.match(calls.at(-1).text,/该城暂无可用接待/);
 mode='network';const failed=await create();for(let i=0;i<5;i++){await send();await db.batch([{sql:'UPDATE signal_notifications SET next_attempt=0',args:[]}]);}assert.equal((await read(failed.id)).status,'failed');assert.equal((await read(failed.id)).attempts,5);
 mode='429';const limited=await create();await send();assert.ok((await read(limited.id)).next_attempt>Date.now()+60000);mode='ok';await db.batch([{sql:'UPDATE signal_notifications SET next_attempt=0',args:[]}]);await send();assert.equal((await read(limited.id)).status,'sent');
 mode='uncertain';const uncertain=await create();await send();assert.equal((await read(uncertain.id)).status,'uncertain');mode='ok';const count=calls.length;await assignReception(db,{requestId:uncertain.requestId,leadRequestId:uncertain.requestId,channel:'whatsapp'});await send();assert.equal(calls.length,count,'Uncertain sends are never blindly retried, including later routing revisions');
 }finally{globalThis.fetch=original;}
}
test('Signal outbox SQLite: activation, independent leases, retries, HMAC, immutable routing and late events',async()=>{
 const db=new DatabaseSync(':memory:');for(const file of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+file,'utf8'));
 const adapter:ReceptionDB={all:async(sql,args=[])=>db.prepare(sql).all(...args as any[]) as any[],batch:async qs=>{db.exec('BEGIN');try{for(const q of qs)db.prepare(q.sql).run(...q.args as any[]);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}};try{await checks(adapter);}finally{db.close();}
});
test('real workerd/D1: future-only enqueue and independent Telegram/Signal delivery; no external traffic',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'eucove-signal-worker-')),bundle=path.join(directory,'worker.mjs');
 await build({stdin:{contents:`import worker from './worker/index.ts';import{deliverNotifications,signalSettings}from'./worker/notifications.ts';import{relayRequest}from'./server/signal-delivery.ts';export default{...worker,async fetch(request,env,ctx){if(new URL(request.url).pathname==='/__fixture/check'){try{const r=await relayRequest(signalSettings(env),'/v1/status');return Response.json({status:r.status});}catch(e){return Response.json({error:e.name,message:e.message});}}if(new URL(request.url).pathname==='/__fixture/notify'){await deliverNotifications(env,20);return Response.json({ok:true});}return worker.fetch(request,env,ctx);}};`,resolveDir:process.cwd(),loader:'ts'},outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2023',external:['node:*'],logLevel:'silent'});
 let signalCalls=0,tgCalls=0;const outboundErrors:string[]=[];
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['MEDIA'],bindings:{APP_URL:'https://eucove.com',SESSION_SECRET:'fixture-secret-12345678901234567890123456789',DISABLE_TELEGRAM:'false',TELEGRAM_BOT_TOKEN:'fixture',TELEGRAM_CHAT_ID:'fixture',SIGNAL_ENABLED:'true',SIGNAL_RELAY_URL:settings.url,SIGNAL_RELAY_SECRET:settings.secret,WHATSAPP_NUMBER:'',BRAND_ZH:'桉湾',BRAND_EN:'EUCOVE'},serviceBindings:{ASSETS:()=>new MFResponse('fixture')},outboundService:async request=>{
  const body=await request.text();if(new URL(request.url).hostname==='fixture.up.railway.app'){signalCalls++;try{verifyRequest(request.url,{method:request.method,headers:Object.fromEntries(request.headers),body});}catch(e){outboundErrors.push(e instanceof Error?e.message:'signature failure');}return new MFResponse(JSON.stringify({error:'busy'}),{status:429,headers:{'Content-Type':'application/json'}});}if(new URL(request.url).hostname==='api.telegram.org'){tgCalls++;return new MFResponse(JSON.stringify({ok:true,result:{message_id:123}}),{headers:{'Content-Type':'application/json'}});}throw Error('All other network blocked');
 }}));
 try{const d1=await mf.getD1Database('DB');await applyTestMigrations(d1);const adapter:ReceptionDB={all:async(sql,args=[])=>(await d1.prepare(sql).bind(...args).all()).results as any[],batch:async qs=>{await d1.batch(qs.map(q=>d1.prepare(q.sql).bind(...q.args)));}};await checks(adapter);
 await d1.prepare('DELETE FROM signal_notifications').run();const requestId=randomUUID();const input={name:'Fictional HTTP fixture',contact:'+61400000003',contactMethod:'whatsapp',city:'Sydney',service:'rent',language:'zh',consent:true,requestId};
 const post=()=>mf.dispatchFetch('https://eucove.com/api/leads',{method:'POST',headers:{Origin:'https://eucove.com','Content-Type':'application/json'},body:JSON.stringify(input)});
 assert.equal((await post()).status,201);for(let i=0;i<30&&signalCalls===0;i++)await new Promise(r=>setTimeout(r,25));assert.equal(signalCalls,1,'The request-time waitUntil makes the first Signal attempt immediately');
 assert.equal((await post()).status,200);assert.equal((await d1.prepare('SELECT COUNT(*) n FROM signal_notifications').first())!.n,1);assert.equal(signalCalls,1,'An idempotent lead retry does not send again');
 await d1.prepare('UPDATE signal_notifications SET next_attempt=0').run();await mf.dispatchFetch('https://eucove.com/__fixture/notify');assert.equal(signalCalls,2,JSON.stringify(await d1.prepare('SELECT status,attempts,last_error,claimed_until FROM signal_notifications').all()));assert.deepEqual(outboundErrors,[]);assert.ok(tgCalls>=1);assert.equal((await d1.prepare('SELECT status FROM signal_notifications').first())!.status,'pending');assert.equal((await d1.prepare("SELECT status FROM notifications WHERE lead_id=(SELECT id FROM leads WHERE request_id=?)").bind(requestId).first())!.status,'sent','Signal rate limit does not block Telegram');
 }finally{await mf.dispose();rmSync(directory,{recursive:true,force:true});}
});
