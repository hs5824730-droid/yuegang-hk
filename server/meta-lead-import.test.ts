import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions, Response as MR } from 'miniflare';
import { applyTestMigrations } from './test-migrations';
import { importMetaLead, META_IMPORT_PATH } from './meta-lead-import';
import { notificationMessage } from './notification-message';
import { deliverOutbox } from './notification-delivery';
import { deliverSignal } from './signal-delivery';

const settings={secret:'fixture-meta-sheets-secret-12345678901234567890',spreadsheetId:'fixture-sheet',formIds:'123456789',signalEnabled:true};
const now=Date.now();
const payload={spreadsheetId:settings.spreadsheetId,leadId:'123456789012345',formId:'123456789',submittedAt:new Date(now-1000).toISOString(),name:'',phone:'+61 400 000 001',cities:['港島','九龍'],services:['寻找租客','租務管理'],campaignName:'Fixture',adName:'Fixture image'};
function request(data:unknown=payload,time=String(now),secret=settings.secret){
 const raw=JSON.stringify(data),hash=createHash('sha256').update(raw).digest('hex');
 return new Request('https://eucove.com'+META_IMPORT_PATH,{method:'POST',headers:{'Content-Type':'application/json','x-eucove-time':time,'x-eucove-signature':createHmac('sha256',secret).update([time,'POST',META_IMPORT_PATH,hash].join('\n')).digest('hex')},body:raw});
}
async function fixture(){
 const sql=new DatabaseSync(':memory:');await applyTestMigrations({prepare:query=>({run:async()=>sql.prepare(query).run()})});
 sql.exec("UPDATE notification_channels SET enabled=1,enabled_at='2000-01-01T00:00:00Z' WHERE channel='signal'");
 const db={all:async(query:string,args:unknown[]=[])=>sql.prepare(query).all(...args as any[]) as Record<string,any>[],batch:async(qs:{sql:string;args:unknown[]}[])=>{sql.exec('BEGIN IMMEDIATE');try{for(const q of qs)sql.prepare(q.sql).run(...q.args as any[]);sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}}};
 return {sql,db};
}
test('signed import preserves all selections, queues both transports, never allocates, retries once',async()=>{
 const {sql,db}=await fixture();try{
  const first=await importMetaLead(request(),settings,db,now);assert.equal(first.status,201);const body=await first.json() as {id:string};
  const row=sql.prepare('SELECT * FROM leads').get()!;const data=JSON.parse(String(row.data));
  assert.equal(row.assigned_to,null);assert.equal(row.city,'other');assert.equal(row.service,'other');
  assert.deepEqual(data.meta.cities,['Hong Kong Island','Kowloon']);assert.deepEqual(data.meta.services,payload.services);
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM reception_channel_assignments').get()!.n,0);
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM notifications').get()!.n,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM signal_notifications').get()!.n,1);
  const repeat=await importMetaLead(request(),settings,db,now);assert.equal(repeat.status,200);assert.equal((await repeat.json() as {id:string}).id,body.id);
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM leads').get()!.n,1);
  assert.equal((await importMetaLead(request({...payload,phone:'+61 400 000 002'}),settings,db,now)).status,409);
  const text=notificationMessage({lead_id:body.id,city:String(row.city),service:String(row.service),data:String(row.data),created_at:String(row.created_at)},'https://eucove.com');
  assert.match(text,/【客户姓名】未提供/);assert.match(text,/【房屋所在城市】港島、九龍/);assert.match(text,/分组：放租同管理\n类型：寻找租客、租務管理/);
  assert.match(text,/分流渠道：未自动分流\n分配目标：等待主动分配\n分流名称：未设置/);assert.doesNotMatch(text,/https?:|\+61.*\+61|undefined/);
 }finally{sql.close();}
});
test('authentication, timestamp, allowlists and invalid phones fail without DB mutations',async()=>{
 const {sql,db}=await fixture();try{
  for(const [req,config,status] of [
   [request(payload,String(now),'wrong-secret'),settings,401],
   [request(payload,String(now-360000)),settings,401],
   [request({...payload,spreadsheetId:'other'}),settings,403],
   [request({...payload,formId:'987654321'}),settings,403],
   [request({...payload,phone:'not-a-phone'}),settings,422],
   [request(),{...settings,secret:''},503],
  ] as const)assert.equal((await importMetaLead(req,config,db,now)).status,status);
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM leads').get()!.n,0);
 }finally{sql.close();}
});
test('both existing delivery queues send the exact manual-assignment copy once using mocked transports',async()=>{
 const {sql,db}=await fixture(),original=globalThis.fetch;const texts:string[]=[];
 try{
  await importMetaLead(request(),settings,db,now);
  globalThis.fetch=async(url,init)=>{const target=new URL(String(url));const body=JSON.parse(String(init?.body));
   assert(['api.telegram.org','fixture-meta.up.railway.app'].includes(target.hostname));texts.push(body.text);
   return Response.json(target.hostname==='api.telegram.org'?{ok:true,result:{message_id:1}}:{ok:true,timestamp:123456789});};
  await deliverOutbox(db,{token:'fixture-only',chatId:'fixture-only',appUrl:'https://eucove.com'});
  await deliverSignal(db,{url:'https://fixture-meta.up.railway.app',secret:'fixture-relay-secret-12345678901234567890',appUrl:'https://eucove.com'});
  await deliverOutbox(db,{token:'fixture-only',chatId:'fixture-only',appUrl:'https://eucove.com'});
  await deliverSignal(db,{url:'https://fixture-meta.up.railway.app',secret:'fixture-relay-secret-12345678901234567890',appUrl:'https://eucove.com'});
  assert.equal(texts.length,2);assert.equal(texts[0],texts[1]);assert.match(texts[0],/等待主动分配/);assert.match(texts[0],/接粉人员：江承裕/);
 }finally{globalThis.fetch=original;sql.close();}
});
test('real Worker accepts signed machine requests without browser Origin; public form still requires Origin',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'meta-import-')),bundle=path.join(dir,'worker.mjs');
 await build({entryPoints:['worker/index.ts'],outfile:bundle,bundle:true,format:'esm',platform:'browser',external:['node:*'],target:'es2023',logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],serviceBindings:{ASSETS:()=>new MR('')},bindings:{APP_URL:'https://eucove.com',META_SHEETS_IMPORT_SECRET:settings.secret,META_SHEETS_SPREADSHEET_ID:settings.spreadsheetId,META_LEAD_FORM_IDS:settings.formIds,SIGNAL_ENABLED:'false',DISABLE_TELEGRAM:'true'},outboundService:()=>{throw Error('External traffic forbidden');}}));
 try{
  const d1=await mf.getD1Database('DB');
  await applyTestMigrations(d1);
  const req=request();const res=await mf.dispatchFetch(req.url,{method:'POST',headers:Object.fromEntries(req.headers),body:await req.text()});assert.equal(res.status,201);
  assert.equal((await mf.dispatchFetch('https://eucove.com/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
 }finally{await mf.dispose();rmSync(dir,{recursive:true,force:true});}
});
