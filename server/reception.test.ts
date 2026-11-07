import test from 'node:test';
import { applyTestMigrations } from './test-migrations.js';
import {receptionDefaultsMigration} from './reception-defaults';
import {mediaOriginalFileName} from './media-filename';
import {notificationMessage} from './notification-message';
import {leadRouting} from './lead-routing';
import {receptionCityMigration} from './reception-city';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions,Response as MFResponse} from 'miniflare';
import {receptionMigration,assignReception,saveReception,receptionEvent,receptionReport,type ReceptionDB,type ReceptionTarget} from './reception';
const target=(channel:'whatsapp'|'wechat',order:number,groupOrder=1):ReceptionTarget=>({id:randomUUID(),channel,cities:['Hong Kong Island','Kowloon'],enabled:true,groupId:'group-'+groupOrder,groupName:'Group '+groupOrder,groupOrder,targetOrder:order,value:channel==='whatsapp'?'+6140000000'+order:'/uploads/'+randomUUID()+'.png'});
function sqliteAdapter(db:DatabaseSync):ReceptionDB{return {all:async(sql,args=[])=>db.prepare(sql).all(...args as any[]) as any[],batch:async qs=>{db.exec('BEGIN IMMEDIATE');try{for(const q of qs)db.prepare(q.sql).run(...q.args as any[]);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}}}
async function independentChecks(db:ReceptionDB){
 const empty=await assignReception(db,{requestId:randomUUID(),channel:'whatsapp'});assert.equal(empty.target,null);
 const a=target('whatsapp',1),b=target('whatsapp',2),off={...target('whatsapp',3),enabled:false},x=target('wechat',1),y=target('wechat',2),z=target('wechat',1,2);
 await saveReception(db,{targets:[z,b,x,off,y,a]});const id=randomUUID();const wa=await assignReception(db,{requestId:id,channel:'whatsapp'});const wx=await assignReception(db,{requestId:id,channel:'wechat'});assert.equal(wa.target!.id,a.id);assert.equal(wx.target!.id,x.id);assert.notEqual(wa.id,wx.id);assert.equal((wa.target as any).groupName,undefined);
 const retries=await Promise.all(Array.from({length:12},()=>assignReception(db,{requestId:id,channel:'whatsapp'})));assert(retries.every(r=>r.id===wa.id));
 const concurrent=await Promise.all(Array.from({length:20},()=>assignReception(db,{requestId:randomUUID(),channel:'whatsapp'})));assert.equal(concurrent.filter(r=>r.target!.id===a.id).length,10);assert.equal(concurrent.filter(r=>r.target!.id===b.id).length,10);
 assert.equal((await assignReception(db,{requestId:randomUUID(),channel:'wechat'})).target!.id,y.id);
 const event={requestId:randomUUID(),assignmentId:wa.id,channel:'whatsapp',type:'whatsapp_click'};await receptionEvent(db,event);await receptionEvent(db,event);await receptionEvent(db,{...event,assignmentId:wx.id,channel:'wechat',type:'wechat_qr_view'});await assert.rejects(()=>receptionEvent(db,{...event,channel:'wechat'}));await assert.rejects(()=>receptionEvent(db,{...event,type:'wechat_qr_view'}));
 const report=await receptionReport(db);assert.equal(report.events.find(e=>e.channel==='whatsapp')!.count,1);assert.equal(report.events.find(e=>e.channel==='wechat')!.count,1);assert.equal(report.breakdown.find(r=>r.targetId===a.id)!.assignments,11);
 await saveReception(db,{targets:[{...a,enabled:false},b,x,y,z]});assert.equal((await assignReception(db,{requestId:randomUUID(),channel:'whatsapp'})).target!.id,b.id);assert.equal((await assignReception(db,{requestId:randomUUID(),channel:'wechat'})).target!.id,z.id);
 // A manual cross-group queue order survives reload and never resets either cursor/history.
 const beforeCursor=await db.all('SELECT * FROM reception_channel_cursor ORDER BY channel');
 const beforeAssignments=await db.all('SELECT * FROM reception_channel_assignments ORDER BY id');
 await saveReception(db,{targets:[{...a,queueOrder:1}, {...b,queueOrder:0}, {...x,queueOrder:2}, {...y,queueOrder:1}, {...z,queueOrder:0}]});
 const ordered=await receptionReport(db);
 assert.deepEqual(ordered.targets.filter(t=>t.channel==='wechat').map(t=>t.id),[z.id,y.id,x.id]);
 assert.deepEqual(ordered.targets.filter(t=>t.channel==='whatsapp').map(t=>t.id),[b.id,a.id]);
 assert.deepEqual(await db.all('SELECT * FROM reception_channel_cursor ORDER BY channel'),beforeCursor);
 assert.deepEqual(await db.all('SELECT * FROM reception_channel_assignments ORDER BY id'),beforeAssignments);
 assert.equal((await assignReception(db,{requestId:randomUUID(),channel:'whatsapp'})).target!.id,b.id);
 assert.equal((await assignReception(db,{requestId:randomUUID(),channel:'wechat'})).target!.id,z.id);
 assert.equal((await assignReception(db,{requestId:id,channel:'whatsapp'})).id,wa.id);
 await assert.rejects(()=>saveReception(db,{targets:[{...a,value:'https://evil.test'}]}));await assert.rejects(()=>saveReception(db,{targets:[{...x,value:'javascript:alert(1)'}]}));await assert.rejects(()=>assignReception(db,{requestId:randomUUID(),channel:'wechat',leadRequestId:randomUUID()}));
 await cityChecks(db);
 await wildcardChecks(db);
}
async function cityChecks(db:ReceptionDB){
 const a={...target('whatsapp',1),cities:['Hong Kong Island','Kowloon'],queueOrder:0};
 const b={...target('whatsapp',2),cities:['Hong Kong Island'],queueOrder:1};const m={...target('whatsapp',3),cities:['Kowloon'],queueOrder:2};
 const wx={...target('wechat',1),cities:[]};
 await saveReception(db,{targets:[m,b,wx,a]});
 const globalBefore=await db.all('SELECT * FROM reception_channel_cursor ORDER BY channel');
 const cityAssign=(city:string,requestId=randomUUID())=>assignReception(db,{channel:'whatsapp',city,requestId});
 assert.equal((await cityAssign('Hong Kong Island')).target!.id,a.id);assert.equal((await cityAssign('Hong Kong Island')).target!.id,b.id);
 assert.equal((await cityAssign('Kowloon')).target!.id,a.id);assert.equal((await cityAssign('Kowloon')).target!.id,m.id);
 const noMatchId=randomUUID();const no=await cityAssign('New Territories',noMatchId);assert.equal(no.target,null);assert.equal(no.outcome,'no_city_match');assert.equal(no.scope,'city');
 const other=await cityAssign('Gold Coast');assert.equal(other.city,'other');assert.equal(other.outcome,'no_city_match');
 const same=randomUUID();const first=await cityAssign('Hong Kong Island',same);const sameRows=await Promise.all(Array.from({length:12},()=>cityAssign('Hong Kong Island',same)));assert.ok(sameRows.every(row=>row.id===first.id));
 await assert.rejects(()=>cityAssign('Kowloon',same),/different city|其他城市/);
 const concurrent=await Promise.all(Array.from({length:20},()=>cityAssign('Hong Kong Island')));assert.equal(concurrent.filter(row=>row.target!.id===a.id).length,10);assert.equal(concurrent.filter(row=>row.target!.id===b.id).length,10);
 assert.deepEqual(await db.all('SELECT * FROM reception_channel_cursor ORDER BY channel'),globalBefore);
 assert.equal((await assignReception(db,{requestId:randomUUID(),channel:'wechat',city:'New Territories'})).target!.id,wx.id,'WeChat matches its independent city pool; empty cities covers all');
 await saveReception(db,{targets:[{...a,enabled:false,value:'+61400999999'},b,m,wx]});assert.equal((await cityAssign('Hong Kong Island',same)).target!.value,first.target!.value,'Historic target snapshot never changes');
 assert.equal((await cityAssign('Hong Kong Island')).target!.id,b.id);assert.equal((await cityAssign('New Territories',noMatchId)).target,null,'An idempotent no-match is never reassigned later');
 await saveReception(db,{targets:[{...b,cities:[]},wx]});assert.equal((await cityAssign('Hong Kong Island')).target!.id,b.id,'Empty cities matches all cities');
 assert.equal((await assignReception(db,{requestId:randomUUID(),channel:'whatsapp'})).target!.id,b.id,'City-less sharing retains original global pool');
}
test('SQLite: independent persistent channel cursors, same-ID cross-channel isolation, concurrency, retry and analytics',async()=>{const file=path.join(mkdtempSync(path.join(tmpdir(),'reception-channels-')),'db.sqlite');const db=new DatabaseSync(file);db.exec('CREATE TABLE leads(id TEXT PRIMARY KEY,request_id TEXT UNIQUE,city TEXT);'+receptionMigration+receptionCityMigration+receptionDefaultsMigration+readFileSync('migrations/0009_whatsapp_prefill.sql','utf8')+readFileSync('migrations/0007_signal_outbox.sql','utf8')+readFileSync('migrations/0010_direct_contact_notifications.sql','utf8')+readFileSync('migrations/0011_direct_phone_events.sql','utf8')+readFileSync('migrations/0012_notification_recipients.sql','utf8'));assert.equal(readFileSync('migrations/0003_reception.sql','utf8').replace(/\r\n/g,'\n'),receptionMigration.replace(/\r\n/g,'\n'));await independentChecks(sqliteAdapter(db));const before=db.prepare('SELECT * FROM reception_channel_cursor ORDER BY channel').all();db.close();const reopened=new DatabaseSync(file);assert.deepEqual(reopened.prepare('SELECT * FROM reception_channel_cursor ORDER BY channel').all(),before);reopened.close()});
test('real Worker/D1: same independent allocation plus protected config, channel validation and lead association',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'reception-channels-worker-'));const bundle=path.join(directory,'worker.mjs');await build({entryPoints:['worker/index.ts'],outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2023',external:['node:*'],logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['MEDIA'],bindings:{APP_URL:'https://eucove.com',SESSION_SECRET:'fixture-contact-only-secret-1234567890123456789',ADMIN_EMAIL:'reception@example.test',ADMIN_PASSWORD:'ReceptionFixturePassword2026',DISABLE_TELEGRAM:'true',WHATSAPP_NUMBER:'',BRAND_ZH:'桉湾',BRAND_EN:'EUCOVE'},serviceBindings:{ASSETS:()=>new MFResponse('fixture')},outboundService:()=>{throw new Error('External network forbidden')}}));
 try{const db=await mf.getD1Database('DB');await applyTestMigrations(db);const adapter:ReceptionDB={all:async(sql,args=[])=>(await db.prepare(sql).bind(...args).all()).results as any[],batch:async qs=>{await db.batch(qs.map(q=>db.prepare(q.sql).bind(...q.args)))}};await independentChecks(adapter);
 const request=async(url:string,method='GET',body?:unknown,cookie='',origin='https://eucove.com')=>{const r=await mf.dispatchFetch('https://eucove.com'+url,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json() as any,headers:r.headers}};
 assert.equal((await request('/api/admin/reception')).status,401);assert.equal((await request('/api/reception/assign')).status,404);assert.equal((await request('/api/reception/assign','POST',{requestId:randomUUID(),channel:'whatsapp'},'','https://evil.test')).status,403);assert.equal((await request('/api/reception/assign','POST',{requestId:randomUUID()})).status,400);
 const login=await request('/api/admin/login','POST',{email:'reception@example.test',password:'ReceptionFixturePassword2026'});const cookie=login.headers.get('set-cookie')!.split(';')[0];assert.equal((await request('/api/admin/reception','GET',undefined,cookie)).status,200);await request('/api/admin/users','POST',{name:'Manager',email:'channel-manager@example.test',password:'ManagerFixturePassword2026',role:'manager',city:'Hong Kong Island'},cookie);const manager=await request('/api/admin/login','POST',{email:'channel-manager@example.test',password:'ManagerFixturePassword2026'});assert.equal((await request('/api/admin/reception','GET',undefined,manager.headers.get('set-cookie')!.split(';')[0])).status,403);
 const input={requestId:randomUUID(),name:'Fixture',contact:'+61400000000',city:'Hong Kong Island',service:'management',language:'zh',consent:true,website:''};const lead=await request('/api/leads','POST',input);assert.equal(lead.status,201);const linked=await request('/api/reception/assign','POST',{requestId:randomUUID(),channel:'wechat',leadRequestId:input.requestId});assert.equal((await request('/api/admin/reception','GET',undefined,cookie)).body.records.find((r:any)=>r.id===linked.body.id).leadId,lead.body.id);
 }finally{await mf.dispose()}
});
test('Node HTTP: same origin/admin permissions, no GET turn, no allocation during lead submit, raster QR safety',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'routing-http-'));Object.assign(process.env,{DATABASE_PATH:path.join(directory,'db.sqlite'),UPLOAD_DIR:path.join(directory,'uploads'),SESSION_SECRET:'routing-fixture-only-key-123456789012345678901',DISABLE_TELEGRAM:'true',ADMIN_EMAIL:'routing@example.test',ADMIN_PASSWORD:'RoutingFixturePassword2026',APP_URL:'http://localhost:5173',NODE_ENV:'test'});const {createApp}=await import('./app');const {db}=await import('./db');const server=createApp().listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const location=server.address() as {port:number};
 const request=async(url:string,method='GET',body?:unknown,cookie='',origin='http://localhost:5173')=>{const r=await fetch(`http://127.0.0.1:${location.port}`+url,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json() as any,headers:r.headers}};
 try{assert.equal((await request('/api/admin/reception')).status,401);assert.equal((await request('/api/reception/assign')).status,404);assert.equal((await request('/api/reception/assign','POST',{requestId:randomUUID(),channel:'whatsapp'},'','https://evil.test')).status,403);const login=await request('/api/admin/login','POST',{email:'routing@example.test',password:'RoutingFixturePassword2026'});const cookie=login.headers.get('set-cookie')!.split(';')[0];const templatePath='/api/admin/reception/whatsapp-prefill';assert.equal((await request(templatePath)).status,401);const template=(await request(templatePath,'GET',undefined,cookie)).body;assert.equal((await request(templatePath,'PUT',{zh:'{unknown}',en:'',expectedVersion:template.version},cookie)).status,400);const updated=await request(templatePath,'PUT',{zh:'Node {city} {service}\n&?#+🙂',en:'Node {city} {service}',expectedVersion:template.version},cookie);assert.equal(updated.status,200);assert.equal((await request(templatePath,'GET',undefined,cookie)).body.zh,'Node {city} {service}\n&?#+🙂');assert.equal((await request('/api/admin/reception','PUT',{targets:[target('whatsapp',1),target('wechat',1)]},cookie)).status,200);
 const input={requestId:randomUUID(),name:'Fixture',contact:'+61400000000',city:'Hong Kong Island',service:'management',language:'zh',consent:true,website:''};const lead=await request('/api/leads','POST',input);assert.equal(lead.status,201);assert.equal((await request('/api/admin/reception','GET',undefined,cookie)).body.records.length,0);const id=randomUUID();const wa=await request('/api/reception/assign','POST',{requestId:id,channel:'whatsapp',leadRequestId:input.requestId});const wx=await request('/api/reception/assign','POST',{requestId:id,channel:'wechat',leadRequestId:input.requestId});assert.notEqual(wa.body.id,wx.body.id);assert.equal((await request('/api/reception/assign','POST',{requestId:id,channel:'whatsapp'})).body.id,wa.body.id);assert.equal(wa.body.target.groupName,undefined);
 const report=(await request('/api/admin/reception','GET',undefined,cookie)).body;assert(report.records.every((r:any)=>r.leadId===lead.body.id));const form=new FormData();form.append('file',new Blob(['<svg/>'],{type:'image/svg+xml'}),'qr.svg');assert.equal((await fetch(`http://127.0.0.1:${location.port}/api/admin/uploads`,{method:'POST',headers:{Origin:'http://localhost:5173',Cookie:cookie},body:form})).status,400);
 }finally{await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));db.close()}
});
test('local export preserves both channel cursors and QR snapshots without advancing allocation on import',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'routing-export-'));const file=path.join(dir,'db.sqlite');const source=new DatabaseSync(file),destination=new DatabaseSync(':memory:');const migration=readFileSync('migrations/0001_existing_schema.sql','utf8')+readFileSync('migrations/0002_worker_leases_and_limits.sql','utf8')+receptionMigration+receptionCityMigration+receptionDefaultsMigration+readFileSync('migrations/0009_whatsapp_prefill.sql','utf8')+readFileSync('migrations/0007_signal_outbox.sql','utf8')+readFileSync('migrations/0010_direct_contact_notifications.sql','utf8')+readFileSync('migrations/0011_direct_phone_events.sql','utf8')+readFileSync('migrations/0012_notification_recipients.sql','utf8');source.exec(migration);destination.exec(migration);const adapter=sqliteAdapter(source);await saveReception(adapter,{targets:[target('whatsapp',1),target('wechat',1)]});await assignReception(adapter,{channel:'whatsapp',requestId:randomUUID()});await assignReception(adapter,{channel:'wechat',requestId:randomUUID()});const output=path.join(dir,'import.sql');execFileSync(process.execPath,['scripts/export-cloudflare-data.mjs','--database',file,'--out',output]);destination.exec(readFileSync(output,'utf8'));assert.deepEqual(destination.prepare('SELECT * FROM reception_channel_cursor ORDER BY channel').all(),source.prepare('SELECT * FROM reception_channel_cursor ORDER BY channel').all());assert.deepEqual(destination.prepare('SELECT * FROM reception_channel_assignments ORDER BY id').all(),source.prepare('SELECT * FROM reception_channel_assignments ORDER BY id').all());assert.equal(JSON.parse(readFileSync(output+'.media.json','utf8')).files.length,1);source.close();destination.close();
});

async function wildcardChecks(db:ReceptionDB){
 const base={displayName:'QR admin label',originalName:'Source nickname',originalFileName:'original.png',fileNameSource:'upload' as const};
 const wa={...target('whatsapp',1),cities:[],queueOrder:0};
 const wx={...target('wechat',1),...base,cities:[],queueOrder:0};
 const sx={...target('wechat',2),cities:['Hong Kong Island','New Territories'],queueOrder:1};
 const off={...target('wechat',3),cities:[],enabled:false,queueOrder:2};
 await saveReception(db,{targets:[wa,wx,sx,off]});
 const globals=await db.all('SELECT * FROM reception_channel_cursor ORDER BY channel');
 const assign=(channel:string,city:string,requestId=randomUUID())=>assignReception(db,{channel,city,requestId});
 for(const channel of ['whatsapp','wechat'])for(const city of ['New Territories','Islands','Islands','other']){
  const a=await assign(channel,city);assert.equal(a.scope,'city');assert.equal(a.target!.id,channel==='whatsapp'?wa.id:wx.id);
  assert.equal((a.target as any).displayName,undefined,'Public QR assignment never leaks admin metadata');
 }
 const ids=await Promise.all(Array.from({length:20},()=>assign('wechat','New Territories')));assert.equal(ids.filter(r=>r.target!.id===wx.id).length,10);assert.equal(ids.filter(r=>r.target!.id===sx.id).length,10);
 assert.deepEqual(await db.all('SELECT * FROM reception_channel_cursor ORDER BY channel'),globals,'City turns never advance global cursors');
 const id=randomUUID(),a=await assign('wechat','Kowloon',id);assert.equal(a.target!.id,wx.id);
 const cityBefore=await db.all('SELECT * FROM reception_city_cursor ORDER BY channel,city');
 const retries=await Promise.all(Array.from({length:15},()=>assign('wechat','Kowloon',id)));assert(retries.every(r=>r.id===a.id));
 assert.deepEqual(await db.all('SELECT * FROM reception_city_cursor ORDER BY channel,city'),cityBefore);
 await assert.rejects(()=>assign('wechat','Hong Kong Island',id));
 const old=(await db.all('SELECT * FROM reception_channel_assignments WHERE id=?',[a.id]))[0];
 await saveReception(db,{targets:[wa,{...wx,...base,displayName:'Edited',cities:['Hong Kong Island'],enabled:false},sx,off]});
 assert.deepEqual((await db.all('SELECT * FROM reception_channel_assignments WHERE id=?',[a.id]))[0],old,'Editing names/cities/enabled never mutates prior snapshots');
 assert.equal((await assign('wechat','Kowloon')).outcome,'no_city_match','Explicit Hong Kong Island/New Territories targets never cross city boundaries');
 assert.equal((await assign('wechat','Hong Kong Island')).target!.id,sx.id);
 const legacy={...wa};delete (legacy as any).cities;await saveReception(db,{targets:[legacy]});assert.equal((await assign('whatsapp','New Territories')).target!.id,wa.id,'Missing cities is compatible with wildcard');
 await assert.rejects(()=>saveReception(db,{targets:[{...wx,originalFileName:'../../secret.png'}]}));
 await assert.rejects(()=>saveReception(db,{targets:[{...wx,originalFileName:'C:\\secret.png'}]}));
 await assert.rejects(()=>saveReception(db,{targets:[{...wx,originalFileName:'a'.repeat(161)}]}));
 const raw=JSON.stringify([{id:a.id,channel:'wechat',city:'Kowloon',scope:'city',outcome:'assigned',createdAt:old.created_at,target:JSON.parse(old.target_data),qr:0}]);
 const routing=leadRouting({contactMethod:'wechat'},'Kowloon',raw);assert.equal(routing.assignments[0].target!.displayName,base.displayName);assert.equal(routing.assignments[0].wechatQrDisplayed,false);
 const message=notificationMessage({lead_id:randomUUID(),city:'Kowloon',service:'rent',data:JSON.stringify({name:'Mock only',contact:'FixtureWX',contactMethod:'wechat'}),created_at:old.created_at,routing_json:raw},'https://example.test');
 assert.match(message,/分流名称：QR admin label/);assert.doesNotMatch(message,/原图昵称：|上传原文件名：/);assert.doesNotMatch(message,/已显示微信二维码/);
 const report=await receptionReport(db);assert.equal(report.records.find(r=>r.id===a.id)!.target!.originalName,base.originalName);
}

test('filename metadata is a bounded basename; new migration preserves snapshots/cursors and target rows',async()=>{
 assert.equal(mediaOriginalFileName('C:\\fakepath\\my-qr.png'),'my-qr.png');assert.equal(mediaOriginalFileName('../unsafe/<qr>.png'),'qr.png');assert.equal(mediaOriginalFileName('a'.repeat(200)).length,160);assert.equal(mediaOriginalFileName('原始二维码.png'),'原始二维码.png');assert.equal(mediaOriginalFileName('é.png',true),'é.png');
 assert.equal(readFileSync('migrations/0008_reception_default_cities.sql','utf8').replace(/\r\n/g,'\n'),receptionDefaultsMigration.replace(/\r\n/g,'\n'));
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE leads(id TEXT PRIMARY KEY,request_id TEXT,city TEXT);'+receptionMigration+receptionCityMigration);const adapter=sqliteAdapter(db);
 const t=target('wechat',1);await saveReception(adapter,{targets:[t]});await adapter.batch([{sql:'INSERT INTO reception_channel_assignments(id,channel,request_id,created_at) VALUES(?,?,?,?)',args:[randomUUID(),'wechat',randomUUID(),'2026-10-24']}]);
 const old=db.prepare('SELECT * FROM reception_channel_assignments').all();const cursors=db.prepare('SELECT * FROM reception_channel_cursor ORDER BY channel').all();
 db.exec(receptionDefaultsMigration);assert.deepEqual(db.prepare('SELECT * FROM reception_channel_assignments').all(),old);assert.deepEqual(db.prepare('SELECT * FROM reception_channel_cursor ORDER BY channel').all(),cursors);
 db.exec("CREATE TRIGGER prevent_target_delete BEFORE DELETE ON reception_targets BEGIN SELECT RAISE(ABORT,'Existing target deleted'); END;");
 db.exec(readFileSync('migrations/0007_signal_outbox.sql','utf8')+readFileSync('migrations/0010_direct_contact_notifications.sql','utf8')+readFileSync('migrations/0011_direct_phone_events.sql','utf8')+readFileSync('migrations/0012_notification_recipients.sql','utf8'));
 await saveReception(adapter,{targets:[{...t,displayName:'Updated',cities:[]}]});assert.equal((await receptionReport(adapter)).targets[0].id,t.id);db.close();
});
