import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions,Response as MFResponse} from 'miniflare';
import {applyTestMigrations} from './test-migrations.js';
import {assignReception,receptionEvent,saveReception,type ReceptionDB} from './reception.js';
import {deliverOutbox} from './notification-delivery.js';
import {leadRouting,routingSelect} from './lead-routing.js';
import {leadSchema} from './schema.js';
import {PUBLIC_SERVICES} from '../src/enquiry-options.js';
import release from './public-viewing-release.json';

test('required contact: all 9 services and 3 methods reject missing/blank/invalid contacts',()=>{
 assert.equal(PUBLIC_SERVICES.length,9);
 for(const service of PUBLIC_SERVICES)for(const [contactMethod,valid] of [['phone','+61 400 000 001'],['whatsapp','0400000002'],['wechat','fixture_wechat']]){
  const fixture={name:'Fictional fixture',city:'Melbourne',service,language:'zh',consent:true,requestId:randomUUID(),contactMethod};
  for(const contact of [undefined,null,'','   ','\t\n','!invalid','123'])assert.equal(leadSchema.safeParse({...fixture,contact}).success,false,`${service}/${contactMethod}/${contact}`);
  assert.equal(leadSchema.safeParse({...fixture,contact:valid}).success,true);
 }
});
function sqliteDB(){const native=new DatabaseSync(':memory:');for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())native.exec(readFileSync('migrations/'+f,'utf8'));const adapter:ReceptionDB={all:async(sql,args=[])=>native.prepare(sql).all(...args as any[]) as any[],batch:async qs=>{native.exec('BEGIN IMMEDIATE');try{for(const q of qs)native.prepare(q.sql).run(...q.args as any[]);native.exec('COMMIT');}catch(e){native.exec('ROLLBACK');throw e;}}};return{native,adapter};}
async function routingSyncChecks(db:ReceptionDB){
 const wa={id:randomUUID(),channel:'whatsapp',enabled:true,cities:['Melbourne'],groupId:'fixture',groupName:'Fictional group',groupOrder:0,targetOrder:0,value:'+61400000001'};
 const wx={...wa,id:randomUUID(),channel:'wechat',cities:[],value:'/uploads/'+randomUUID()+'.png'};
 await saveReception(db,{targets:[wa,wx]});
 const create=async(method:string,sync=1)=>{const id=randomUUID(),requestId=randomUUID(),owner=randomUUID();await db.batch([
  {sql:'INSERT INTO owners(id,contact_key,contact,name,created_at) VALUES(?,?,?,?,?)',args:[owner,owner,method==='wechat'?'fixture_wechat':'+61400000002','Fictional fixture','2026-10-23T16:00:00Z']},
  {sql:'INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,data,created_at) VALUES(?,?,?,?,?,?,?,?)',args:[id,requestId,'fixture',owner,'Melbourne','letting',JSON.stringify({name:'Fictional fixture',contact:method==='wechat'?'fixture_wechat':'+61400000002',contactMethod:method}),'2026-10-23T16:00:00Z']},
  {sql:'INSERT INTO notifications(id,lead_id,sync_enabled) VALUES(?,?,?)',args:[randomUUID(),id,sync]},
 ]);return{id,requestId};};
 const read=async(id:string)=>(await db.all(`SELECT l.*,${routingSelect} FROM leads l WHERE l.id=?`,[id]))[0];
 const original=globalThis.fetch;const calls:{url:string;body:any}[]=[];let fail=false;let onSend:(()=>Promise<void>)|null=null;
 globalThis.fetch=(async(url,init)=>{calls.push({url:String(url),body:JSON.parse(String(init?.body))});if(onSend){const action=onSend;onSend=null;await action();}return Response.json(fail?{ok:false,error_code:500}:{ok:true,result:{message_id:77}},{status:fail?500:200});}) as typeof fetch;
 const deliver=()=>deliverOutbox(db,{token:'fixture-only',chatId:'fixture-only',appUrl:'https://eucove.com'},50);
 try{
  const lead=await create('whatsapp');await deliver();assert.equal(calls.length,1);assert.match(calls[0].body.text,/等待分配/);
  await assert.rejects(()=>assignReception(db,{requestId:lead.requestId,leadRequestId:lead.requestId,channel:'whatsapp',city:'Sydney'}));
  const assigned=await assignReception(db,{requestId:lead.requestId,leadRequestId:lead.requestId,channel:'whatsapp'});assert.equal(assigned.city,'Melbourne');assert.equal(assigned.target!.id,wa.id);
  await Promise.all([deliver(),deliver()]);assert.equal(calls.length,2);assert.match(calls[1].url,/editMessageText$/);assert.equal(calls[1].body.message_id,77);assert.match(calls[1].body.text,/分配目标：\+61400000001/);
  const snapshot=leadRouting(JSON.parse((await read(lead.id)).data),'Melbourne',(await read(lead.id)).routing_json);assert.equal(snapshot.assignments[0].target!.url,assigned.target!.url);assert.match(new URL(assigned.target!.url!).searchParams.get('text')!,/墨尔本.*出租招租/);assert.equal(snapshot.assignments[0].whatsappOpenAttempted,false);
  await saveReception(db,{targets:[{...wa,value:'+61400000099',enabled:false},wx]});
  const event={requestId:randomUUID(),assignmentId:assigned.id,channel:'whatsapp',type:'whatsapp_click'};await receptionEvent(db,event);await receptionEvent(db,event);await deliver();assert.equal(calls.length,3);assert.match(calls[2].body.text,/61400000001/);assert.doesNotMatch(calls[2].body.text,/61400000099/);
  assert.equal(leadRouting({},'Melbourne',(await read(lead.id)).routing_json).assignments[0].whatsappOpenAttempted,true);
  const no=await create('whatsapp');await assignReception(db,{requestId:no.requestId,leadRequestId:no.requestId,channel:'whatsapp'});await deliver();assert.match(calls.at(-1)!.body.text,/该城暂无可用接待/);assert.doesNotMatch(calls.at(-1)!.body.text,/实际目标链接/);
  const chat=await create('wechat');const qr=await assignReception(db,{requestId:chat.requestId,leadRequestId:chat.requestId,channel:'wechat'});await deliver();assert.match(calls.at(-1)!.body.text,/【联系电话】未提供/);assert.match(calls.at(-1)!.body.text,/分配目标：微信二维码/);assert.doesNotMatch(calls.at(-1)!.body.text,/已显示微信/);
  fail=true;await receptionEvent(db,{requestId:randomUUID(),assignmentId:qr.id,channel:'wechat',type:'wechat_qr_view'});const before=calls.length;await deliver();assert.match(calls.at(-1)!.url,/editMessageText$/);assert.equal(calls.length,before+1);fail=false;await db.batch([{sql:'UPDATE notifications SET edit_next_attempt=0',args:[]}]);await deliver();assert.doesNotMatch(calls.at(-1)!.body.text,/已显示微信二维码/);assert.equal(leadRouting({},'Melbourne',(await read(chat.id)).routing_json).assignments[0].wechatQrDisplayed,true);assert.equal(calls.filter(c=>/sendMessage$/.test(c.url)).length,3);
  const racing=await create('wechat');onSend=async()=>{await assignReception(db,{requestId:racing.requestId,leadRequestId:racing.requestId,channel:'wechat'});};await deliver();const n=(await db.all('SELECT * FROM notifications WHERE lead_id=?',[racing.id]))[0];assert.ok(n.revision>n.delivered_revision);await deliver();assert.match(calls.at(-1)!.url,/editMessageText$/);
  const phone=await create('phone');await deliver();assert.match(calls.at(-1)!.body.text,/未分流（电话回访）/);
  await assignReception(db,{requestId:phone.requestId,leadRequestId:phone.requestId,channel:'wechat'});await deliver();assert.equal(leadRouting({contactMethod:'phone'},'Melbourne',(await read(phone.id)).routing_json).state,'assigned');assert.match(calls.at(-1)!.body.text,/分流渠道：微信\n分配目标：微信二维码/,'A later actual assignment supersedes the original phone callback state');
  assert(calls.every(call=>call.body.text.endsWith('北京时间：2026-10-24 00:00:00')),'Initial sends, late assignments/events and edit retries preserve the original enquiry time');
  const legacy=await create('wechat',0);await db.batch([{sql:"UPDATE notifications SET status='sent',message_id=3,delivered_revision=0 WHERE lead_id=?",args:[legacy.id]}]);const count=calls.length;await assignReception(db,{requestId:legacy.requestId,leadRequestId:legacy.requestId,channel:'wechat'});await deliver();assert.equal(calls.length,count,'Never replay/edit historical sent customers');
 }finally{globalThis.fetch=original;}
}
test('SQLite routing, immutable snapshot and same-message Telegram consistency, early/late events and retries',async()=>{const{native,adapter}=sqliteDB();try{await routingSyncChecks(adapter);}finally{native.close();}});

test('publication allowlist is exactly 36 available +12 sold, 182 rooms and 364 validated processed objects',()=>{
 assert.equal(release.listings.filter(l=>l.kind==='rent'&&l.availabilityStatus==='available').length,36);assert.equal(release.listings.filter(l=>l.kind==='sold').length,12);
 assert.equal(release.listings.reduce((n,l)=>n+l.rooms.length,0),182);assert.equal(Object.keys(release.media).length,364);
 for(const l of release.listings){assert.equal(l.publicReuseApproved,false);assert.ok(l.sourceUrl.startsWith('https://'));for(const room of l.rooms){assert.equal(room.watermarked,false);assert.equal(room.videoUrl,null);for(const url of [room.photoUrl,room.thumbnailUrl])assert.ok(Object.hasOwn(release.media,url));}}
 for(const [url,media] of Object.entries(release.media)){assert.match(url,/^\/api\/viewing-samples\/reference-\d+\/photo\/[a-f0-9]{64}\.webp$/);assert.match(media.key,/^viewing-public\/2026-10-23\/[a-f0-9]{64}\.webp$/);const bytes=readFileSync('data/viewing-publication/2026-10-23/media/'+media.sha256+'.webp');assert.equal(bytes.length,media.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),media.sha256);assert.equal(bytes.toString('ascii',8,12),'WEBP');}
});

test('real workerd/D1/R2: routing sync parity, required-contact rollback, publication Range and private guards',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'eucove-release-'));const bundle=path.join(directory,'worker.mjs');await build({entryPoints:['worker/index.ts'],outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2023',external:['node:*'],logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['MEDIA'],bindings:{APP_URL:'https://eucove.com',SESSION_SECRET:'fixture-only-release-secret-12345678901234567890',DISABLE_TELEGRAM:'true',WHATSAPP_NUMBER:'',BRAND_ZH:'桉湾',BRAND_EN:'EUCOVE'},serviceBindings:{ASSETS:()=>new MFResponse('fixture')},outboundService:()=>{throw new Error('Unexpected network blocked');}}));
 try{const db=await mf.getD1Database('DB');await applyTestMigrations(db);const adapter:ReceptionDB={all:async(sql,args=[])=>(await db.prepare(sql).bind(...args).all()).results as any[],batch:async qs=>{await db.batch(qs.map(q=>db.prepare(q.sql).bind(...q.args)));}};await routingSyncChecks(adapter);
 const count=async()=>(await db.prepare('SELECT (SELECT COUNT(*) FROM owners) AS owners,(SELECT COUNT(*) FROM leads) AS leads,(SELECT COUNT(*) FROM notifications) AS notifications,(SELECT COUNT(*) FROM reception_channel_assignments) AS assignments').first());const before=await count();let serial=0;
 for(const contact of [undefined,null,'','  ','!invalid'])for(const contactMethod of ['phone','whatsapp','wechat']){const response=await mf.dispatchFetch('https://eucove.com/api/leads',{method:'POST',headers:{Origin:'https://eucove.com','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.'+(++serial)},body:JSON.stringify({name:'Fictional invalid',city:'Melbourne',service:'rent',language:'zh',consent:true,requestId:randomUUID(),contactMethod,contact})});assert.equal(response.status,400);}
 assert.deepEqual(await count(),before);
 for(const [contactMethod,contact]of[['phone','+61400000031'],['whatsapp','+61400000032'],['wechat','fixture_http_wx']]){
  const body={name:'Fictional HTTP fixture',city:'Melbourne',service:'rent',language:'zh',consent:true,requestId:randomUUID(),contactMethod,contact};
  const send=()=>mf.dispatchFetch('https://eucove.com/api/leads',{method:'POST',headers:{Origin:'https://eucove.com','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.'+(++serial)},body:JSON.stringify(body)});
  const first=await send();assert.equal(first.status,201);const id=((await first.json()) as any).id;const repeat=await send();assert.equal(repeat.status,200);assert.equal(((await repeat.json()) as any).id,id);
 }
 const after=await count();assert.equal(Number(after!.leads),Number(before!.leads)+3);assert.equal(Number(after!.notifications),Number(before!.notifications)+3);assert.equal(after!.assignments,before!.assignments,'Lead submission itself never consumes a routing turn');
 for(const [kind,n]of[['rent',36],['sold',12],['sale',1]]){const r=await mf.dispatchFetch('https://eucove.com/api/viewing-samples?kind='+kind);assert.equal(r.status,200);const listings=((await r.json()) as any).listings;assert.equal(listings.length,n);if(kind==='sale')assert.equal(listings[0].id,'reference-20261031001');assert.equal(listings.some((item:{id:string})=>item.id==='reference-20261031001'),kind==='sale');}
 const [url,meta]=Object.entries(release.media)[0];const bytes=readFileSync('data/viewing-publication/2026-10-23/media/'+meta.sha256+'.webp');const bucket=await mf.getR2Bucket('MEDIA') as unknown as {put(key:string,value:Uint8Array):Promise<unknown>};await bucket.put(meta.key,bytes);
 const full=await mf.dispatchFetch('https://eucove.com'+url);assert.equal(full.status,200);assert.match(full.headers.get('cache-control')!,/immutable/);assert.equal(createHash('sha256').update(Buffer.from(await full.arrayBuffer())).digest('hex'),meta.sha256);
 const range=await mf.dispatchFetch('https://eucove.com'+url,{headers:{Range:'bytes=10-19'}});assert.equal(range.status,206);assert.deepEqual(Buffer.from(await range.arrayBuffer()),bytes.subarray(10,20));
 assert.equal((await mf.dispatchFetch('https://eucove.com'+url,{headers:{Range:'bytes=999999999-'}})).status,416);assert.equal((await mf.dispatchFetch('https://eucove.com'+url,{headers:{'If-None-Match':'"'+meta.sha256+'"'}})).status,304);
 for(const p of ['/data/viewing-source/x/manifest.json','/api/market-reference','/3d-preview','/depth/interior.webp','/api/viewing-samples/reference-3600395/manifest.json','/api/viewing-samples/reference-3600395/photo/room-1-living.jpg','/api/viewing-samples/reference-3600395/video/room-1.mp4'])assert.equal((await mf.dispatchFetch('https://eucove.com'+p)).status,404);
 }finally{await mf.dispose();rmSync(directory,{recursive:true,force:true});}
});

test('Node HTTP requires contact before any writes and saves phone/WhatsApp/WeChat once with one outbox',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'eucove-node-contact-'));
 Object.assign(process.env,{DATABASE_PATH:path.join(directory,'fixture.sqlite'),UPLOAD_DIR:path.join(directory,'uploads'),SESSION_SECRET:'fixture-contact-only-secret-12345678901234567890',DISABLE_TELEGRAM:'true',TELEGRAM_BOT_TOKEN:'',TELEGRAM_CHAT_ID:'',NODE_ENV:'test',APP_URL:'https://fixture.invalid',ADMIN_EMAIL:'fixture@example.invalid',ADMIN_PASSWORD:'FixtureOnlyPassword2026'});
 const {createApp}=await import('./app.js');const {db}=await import('./db.js');const server=createApp().listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+(server.address() as import('node:net').AddressInfo).port;
 const send=(body:unknown)=>fetch(base+'/api/leads',{method:'POST',headers:{Origin:'https://fixture.invalid','Content-Type':'application/json'},body:JSON.stringify(body)});
 const baseBody={name:'Fictional Node fixture',city:'Melbourne',service:'rent',language:'zh',consent:true};
 try{
  for(const contact of [undefined,null,'   '])assert.equal((await send({...baseBody,contact,requestId:randomUUID()})).status,400);
  for(const table of ['owners','leads','notifications','reception_channel_assignments'])assert.equal(db.prepare('SELECT COUNT(*) n FROM '+table).get()!.n,0);
  for(const [contactMethod,contact]of[['phone','+61400000041'],['whatsapp','+61400000042'],['wechat','fixture_node_wx']]){const body={...baseBody,contactMethod,contact,requestId:randomUUID()};const first=await send(body);assert.equal(first.status,201);const id=((await first.json()) as any).id;const again=await send(body);assert.equal(again.status,200);assert.equal(((await again.json()) as any).id,id);}
  assert.equal(db.prepare('SELECT COUNT(*) n FROM leads').get()!.n,3);assert.equal(db.prepare('SELECT COUNT(*) n FROM notifications').get()!.n,3);assert.equal(db.prepare('SELECT COUNT(*) n FROM reception_channel_assignments').get()!.n,0);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));db.close();rmSync(directory,{recursive:true,force:true});}
});
