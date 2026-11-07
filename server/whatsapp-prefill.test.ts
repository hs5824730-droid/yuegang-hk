import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions,Response as MFResponse} from 'miniflare';
import {applyTestMigrations} from './test-migrations';
import {assignReception,saveReception,type ReceptionDB} from './reception';
import {getWhatsappPrefill,saveWhatsappPrefill,whatsappPrefillSchema} from './whatsapp-prefill';
import {DEFAULT_WHATSAPP_PREFILL,renderWhatsappPrefill,whatsappDestination} from '../src/whatsapp-prefill';
import {waLink,receptionRequestId} from '../src/reception-client';
import {leadRouting,routingSelect} from './lead-routing';
import {deliverOutbox} from './notification-delivery';
import {deliverSignal} from './signal-delivery';
import {notificationMessage} from './notification-message';

test('prefill: controlled variables, Unicode/encoding, blank and missing context, official recipient only',()=>{
 const provider={getRandomValues:crypto.getRandomValues.bind(crypto)} as Crypto;const ids=Array.from({length:30},()=>receptionRequestId(provider));assert.equal(new Set(ids).size,30);assert(ids.every(id=>/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)));
 const zh=renderWhatsappPrefill(DEFAULT_WHATSAPP_PREFILL,{city:'Kowloon',service:'manage',language:'zh'});assert.match(zh,/九龍.*租務管理/);
 assert.match(renderWhatsappPrefill(DEFAULT_WHATSAPP_PREFILL,{city:'Hong Kong Island',service:'buy',language:'en'}),/Buying in Hong Kong Island/);assert.match(renderWhatsappPrefill(DEFAULT_WHATSAPP_PREFILL,{city:'九龍',service:'buy',language:'en'}),/Buying in Kowloon/);
 assert.match(renderWhatsappPrefill(DEFAULT_WHATSAPP_PREFILL,{}),/我想了解房产服务/);
 assert.doesNotMatch(renderWhatsappPrefill(DEFAULT_WHATSAPP_PREFILL,{city:'other',language:'en'}),/\{|other|undefined/);
 const text=renderWhatsappPrefill({zh:'咨询 {房屋城市}\n{服务类型} &?#+🙂',en:'Hello {city}: {service}\n&?#+🙂'},{city:'Kowloon',service:'rent'});
 const url=whatsappDestination('+61400000001',text)!;assert.equal(new URL(url).searchParams.get('text'),text);assert.match(url,/%26%3F%23%2B/);assert.match(text,/\n/);assert.match(text,/🙂/);assert.equal(waLink('+61400000001',url),url);
 for(const value of['https://evil.invalid/x','javascript:alert(1)','https://wa.me/61400000002?text=hello','https://wa.me/61400000001?redirect=x','https://wa.me/61400000001#x'])assert.equal(waLink('+61400000001',value),null);
 assert.equal(renderWhatsappPrefill({zh:' \n ',en:''},{city:'Kowloon'}),'');assert.equal(renderWhatsappPrefill({zh:'hello\r\nworld',en:''},{}),'hello\nworld');assert.equal(whatsappDestination('+61400000001',''),'https://wa.me/61400000001');
 for(const zh of['{姓名}','{unknown}','{city','<script>x</script>','https://evil.invalid','javascript:alert(1)','ftp://example.test','mailto:test@example.test','x'.repeat(501)])assert.equal(whatsappPrefillSchema.safeParse({zh,en:'',expectedVersion:1}).success,false,zh);
 const long=renderWhatsappPrefill({zh:'{city}'.repeat(80),en:''},{city:'九龍'.repeat(20)});assert(encodeURIComponent(long).length<=1200);assert.doesNotMatch(long,/\{/);
});
async function persistentChecks(db:ReceptionDB){
 const initial=await getWhatsappPrefill(db);assert.equal(initial.zh,DEFAULT_WHATSAPP_PREFILL.zh);
 const a={id:randomUUID(),channel:'whatsapp',enabled:true,cities:[],queueOrder:0,groupId:'fixture',groupName:'Fictional',groupOrder:0,targetOrder:0,value:'+61400000001'},b={...a,id:randomUUID(),queueOrder:1,value:'+61400000002'},wx={...a,id:randomUUID(),channel:'wechat',value:'/uploads/'+randomUUID()+'.png'};
 await saveReception(db,{targets:[a,b,wx]});const owner=randomUUID(),lead=randomUUID(),requestId=randomUUID();
 await db.batch([{sql:'INSERT INTO owners(id,name,contact_key,contact,created_at) VALUES(?,?,?,?,?)',args:[owner,'Fictional fixture',owner,'+61400000099','2026-10-24']},{sql:'INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,data,created_at) VALUES(?,?,?,?,?,?,?,?)',args:[lead,requestId,'fixture',owner,'Kowloon','management',JSON.stringify({name:'Fictional fixture',contact:'+61400000099',contactMethod:'whatsapp',language:'en'}),'2026-10-24']}]);
 const first=await assignReception(db,{requestId,leadRequestId:requestId,channel:'whatsapp',service:'buy',language:'zh'});assert.equal(first.target!.id,a.id);const text=new URL(first.target!.url!).searchParams.get('text')!;assert.match(text,/Ongoing management in Kowloon/);assert.doesNotMatch(text,/Fictional|61400000099|Buying/);
 const cursor=await db.all('SELECT * FROM reception_city_cursor ORDER BY channel,city');
 const saved=await saveWhatsappPrefill(db,{zh:'新版本 {房屋城市} &?#+🙂',en:'Updated {city} {service}\n&?#+🙂',expectedVersion:initial.version});assert.equal(saved.version,initial.version+1);
 await assert.rejects(()=>saveWhatsappPrefill(db,{zh:'stale',en:'',expectedVersion:initial.version}));assert.equal((await getWhatsappPrefill(db)).en,saved.en);
 const retries=await Promise.all(Array.from({length:10},()=>assignReception(db,{requestId,leadRequestId:requestId,channel:'whatsapp'})));assert(retries.every(r=>r.target!.url===first.target!.url));assert.deepEqual(await db.all('SELECT * FROM reception_city_cursor ORDER BY channel,city'),cursor);
 const second=await assignReception(db,{requestId:randomUUID(),channel:'whatsapp',city:'Kowloon',service:'buy',language:'en'});assert.equal(second.target!.id,b.id);assert.match(new URL(second.target!.url!).searchParams.get('text')!,/Updated Kowloon Buying/);
 const row=(await db.all(`SELECT l.*,${routingSelect} FROM leads l WHERE l.id=?`,[lead]))[0];const routing=leadRouting(JSON.parse(row.data),row.city,row.routing_json);assert.equal(routing.assignments[0].target!.url,first.target!.url);assert.equal(routing.assignments[0].target!.prefillText,text);assert.equal(routing.assignments[0].target!.templateVersion,initial.version);
 const message=notificationMessage({lead_id:lead,city:row.city,service:row.service,data:row.data,created_at:row.created_at,routing_json:row.routing_json},'https://eucove.com');assert(!message.includes(first.target!.url!));assert(message.includes('分配目标：'+first.target!.value));assert.doesNotMatch(message,/\/admin|登录后台|Log.?in.*admin|192\.168|机器人连通测试/i);
 const wechat=await assignReception(db,{requestId:randomUUID(),channel:'wechat',city:'Kowloon'});assert.equal(wechat.target!.url,wx.value);assert.doesNotMatch(wechat.target!.url!,/text=/);
 const current=await getWhatsappPrefill(db);await saveWhatsappPrefill(db,{zh:'',en:'',expectedVersion:current.version});const empty=await assignReception(db,{requestId:randomUUID(),channel:'whatsapp'});assert.equal(new URL(empty.target!.url!).search,'');
 assert.equal((await db.all('SELECT whatsapp_text FROM reception_channel_assignments WHERE id=?',[first.id]))[0].whatsapp_text,text);
}
test('SQLite: persistent global template, saved-lead authority, immutable snapshot, rotation and retry',async()=>{
 const native=new DatabaseSync(':memory:');try{for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())native.exec(readFileSync('migrations/'+f,'utf8'));const db:ReceptionDB={all:async(sql,args=[])=>native.prepare(sql).all(...args as any[]) as any[],batch:async qs=>{native.exec('BEGIN IMMEDIATE');try{for(const q of qs)native.prepare(q.sql).run(...q.args as any[]);native.exec('COMMIT');}catch(e){native.exec('ROLLBACK');throw e;}}};await persistentChecks(db);}finally{native.close();}
});
test('real workerd/D1: same template snapshots and admin-only GET/PUT validation',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'wa-prefill-')),bundle=path.join(directory,'worker.mjs');await build({entryPoints:['worker/index.ts'],outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2023',external:['node:*'],logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['MEDIA'],bindings:{APP_URL:'https://eucove.com',SESSION_SECRET:'fixture-only-session-key-1234567890123456789',ADMIN_EMAIL:'prefill@example.test',ADMIN_PASSWORD:'PrefillFixturePassword2026',DISABLE_TELEGRAM:'true',SIGNAL_ENABLED:'false'},serviceBindings:{ASSETS:()=>new MFResponse('fixture')},outboundService:()=>{throw Error('External network forbidden');}}));
 try{const native=await mf.getD1Database('DB');await applyTestMigrations(native);const db:ReceptionDB={all:async(sql,args=[])=>(await native.prepare(sql).bind(...args).all()).results as any[],batch:async qs=>{await native.batch(qs.map(q=>native.prepare(q.sql).bind(...q.args)));}};await persistentChecks(db);
 const req=async(path:string,method='GET',body?:unknown,cookie='',origin='https://eucove.com')=>{const response=await mf.dispatchFetch('https://eucove.com'+path,{method,headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return{status:response.status,body:await response.json() as any,cookie:response.headers.get('set-cookie')?.split(';')[0]||''};};
 const endpoint='/api/admin/reception/whatsapp-prefill';assert.equal((await req(endpoint)).status,401);const login=await req('/api/admin/login','POST',{email:'prefill@example.test',password:'PrefillFixturePassword2026'});assert.equal(login.status,200);const loaded=await req(endpoint,'GET',undefined,login.cookie);assert.equal(loaded.status,200);
 assert.equal((await req(endpoint,'PUT',{zh:'{name}',en:'',expectedVersion:loaded.body.version},login.cookie)).status,400);assert.equal((await req(endpoint,'PUT',{zh:'',en:'x'.repeat(501),expectedVersion:loaded.body.version},login.cookie)).status,400);assert.equal((await req(endpoint,'PUT',{zh:'',en:'',expectedVersion:loaded.body.version},login.cookie,'https://evil.invalid')).status,403);
 const save=await req(endpoint,'PUT',{...DEFAULT_WHATSAPP_PREFILL,expectedVersion:loaded.body.version},login.cookie);assert.equal(save.status,200);assert.equal((await req(endpoint,'GET',undefined,login.cookie)).body.version,save.body.version);
 await req('/api/admin/users','POST',{name:'Fictional manager',email:'prefill-manager@example.test',password:'ManagerFixturePassword2026',role:'manager',city:'Hong Kong Island'},login.cookie);const manager=await req('/api/admin/login','POST',{email:'prefill-manager@example.test',password:'ManagerFixturePassword2026'});assert.equal((await req(endpoint,'GET',undefined,manager.cookie)).status,403);assert.equal((await req(endpoint,'PUT',{...DEFAULT_WHATSAPP_PREFILL,expectedVersion:save.body.version},manager.cookie)).status,403);
 }finally{await mf.dispose();}
});

test('Telegram and Signal share compact snapshot text and Beijing time; backend retains links',async()=>{
 const native=new DatabaseSync(':memory:');for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())native.exec(readFileSync('migrations/'+f,'utf8'));
 const db:ReceptionDB={all:async(sql,args=[])=>native.prepare(sql).all(...args as any[]) as any[],batch:async qs=>{native.exec('BEGIN');try{for(const q of qs)native.prepare(q.sql).run(...q.args as any[]);native.exec('COMMIT');}catch(e){native.exec('ROLLBACK');throw e;}}};
 const wa={id:randomUUID(),channel:'whatsapp',enabled:true,cities:[],groupId:'fixture',groupName:'Fictional',groupOrder:0,targetOrder:0,value:'+61400000001'},wx={...wa,id:randomUUID(),channel:'wechat',value:'/uploads/'+randomUUID()+'.png'};await saveReception(db,{targets:[wa,wx]});
 const previous=globalThis.fetch,calls:{channel:string;text:string}[]=[];
 globalThis.fetch=(async(url,init)=>{const body=JSON.parse(String(init?.body));const signal=String(url).includes('.up.railway.app');calls.push({channel:signal?'signal':'telegram',text:body.text});return Response.json(signal?{ok:true,timestamp:1700000000000}:{ok:true,result:{message_id:42+calls.length}});}) as typeof fetch;
 try{for(const channel of ['whatsapp','wechat']){const id=randomUUID(),requestId=randomUUID(),owner=randomUUID();await db.batch([
  {sql:'INSERT INTO owners(id,contact_key,contact,name,created_at) VALUES(?,?,?,?,?)',args:[owner,owner,'fixture_wechat','Fictional <&> fixture','2026-10-24']},
  {sql:'INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,data,created_at) VALUES(?,?,?,?,?,?,?,?)',args:[id,requestId,'fixture',owner,'Kowloon','letting',JSON.stringify({name:'Fictional <&> fixture',contactMethod:channel,contact:channel==='wechat'?'fixture_wechat':'+61400000099',language:'zh'}),'2026-10-24']},
  {sql:'INSERT INTO notifications(id,lead_id,sync_enabled) VALUES(?,?,1)',args:[randomUUID(),id]},
  {sql:'INSERT INTO signal_notifications(id,lead_id) VALUES(?,?)',args:[randomUUID(),id]},
 ]);const assigned=await assignReception(db,{requestId,leadRequestId:requestId,channel});await deliverOutbox(db,{token:'fixture',chatId:'fixture',appUrl:'https://eucove.com'},5);await deliverSignal(db,{url:'https://fixture.up.railway.app',secret:'fixture-signature-secret-12345678901234567890',appUrl:'https://eucove.com'},5);
 const telegram=calls.filter(c=>c.channel==='telegram').at(-1)!.text,signal=calls.filter(c=>c.channel==='signal').at(-1)!.text;assert.equal(signal,telegram);assert.doesNotMatch(signal,/\/admin|192\.168|登录后台|后台查看|log.?in.*admin|机器人连通测试/i);assert(signal.includes('分配目标：'+(channel==='whatsapp'?assigned.target!.value:'微信二维码')));assert.doesNotMatch(signal,/https?:|wa.me|编号：|优惠|新的网站咨询/);assert.match(signal,/北京时间：2026-10-24 08:00:00/);assert.match(signal,/Fictional <&> fixture/);if(channel==='wechat'){assert.match(signal,/联系电话】未提供/);assert.match(signal,/微信号：fixture_wechat/);}
 const row=(await db.all(`SELECT l.*,${routingSelect} FROM leads l WHERE l.id=?`,[id]))[0];const local=notificationMessage({lead_id:id,city:row.city,service:row.service,data:row.data,created_at:row.created_at,routing_json:row.routing_json},'http://192.168.100.110:5180');assert.doesNotMatch(local,/192\.168|\/admin|登录后台/);
 }}finally{globalThis.fetch=previous;native.close();}
});
