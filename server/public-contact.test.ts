import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions,Response as MFResponse} from 'miniflare';
import {assignReception,saveReception} from './reception';
import {applyTestMigrations} from './test-migrations';
const input={requestId:crypto.randomUUID(),name:'Callback-only fixture',contact:'+447700900001',contactMethod:'whatsapp',city:'Hong Kong Island',service:'letting',language:'zh',consent:true};
const vars={APP_URL:'https://fixture.invalid',SESSION_SECRET:'local-public-contact-fixture-secret-only',PUBLIC_DIRECT_CONTACT_ENABLED:'false',DISABLE_TELEGRAM:'true',SIGNAL_ENABLED:'false',MAIL_ENABLED:'false',MAIL_SEND_ENABLED:'false',REGISTRATION_SHEETS_ENABLED:'false'};
test('retired public direct API cannot allocate or notify; validated contact form still persists once in real D1',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'callback-only-')),bundle=path.join(directory,'worker.mjs');
 await build({entryPoints:['worker/index.ts'],outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2023',external:['node:*'],logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:vars,outboundService:()=>{throw Error('External traffic prohibited')}}));
 try{const db=await mf.getD1Database('DB');await applyTestMigrations(db);const post=(endpoint:string,body:unknown)=>mf.dispatchFetch(vars.APP_URL+endpoint,{method:'POST',headers:{Origin:vars.APP_URL,'Content-Type':'application/json'},body:JSON.stringify(body)});
 for(const contactMethod of ['phone','whatsapp','wechat'])assert.equal((await post('/api/reception/assign',{requestId:crypto.randomUUID(),channel:contactMethod==='wechat'?'wechat':'whatsapp',contactMethod,source:'website_direct',pagePath:'/services'})).status,410);
 assert.equal((await post('/api/reception/events',{})).status,410);assert.equal((await post('/api/leads',{...input,contact:''})).status,400);assert.equal((await post('/api/leads',input)).status,201);assert.equal((await post('/api/leads',input)).status,200);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM leads').first() as any).n,1);for(const table of ['reception_channel_assignments','reception_channel_events','reception_phone_events','direct_contact_notifications'])assert.equal((await db.prepare('SELECT COUNT(*) n FROM '+table).first() as any).n,0);
 assert.equal((await db.prepare('SELECT sum(ordinal) n FROM reception_channel_cursor').first() as any).n,0);assert.equal((await mf.dispatchFetch(vars.APP_URL+'/api/admin/reception')).status,401);
 }finally{await mf.dispose();assert(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep));rmSync(directory,{recursive:true,force:true})}
});
test('Node callback-only mode blocks legacy direct requests without losing submitted contact details',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'callback-node-'));Object.assign(process.env,vars,{NODE_ENV:'test',APP_URL:'http://localhost:5173',DATABASE_PATH:path.join(directory,'fixture.sqlite'),UPLOAD_DIR:path.join(directory,'uploads'),ADMIN_EMAIL:'callback@example.test',ADMIN_PASSWORD:'CallbackFixturePassword2026!'});
 const {createApp}=await import('./app');const {db}=await import('./db');const server=createApp().listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address() as {port:number};const post=(endpoint:string,body:unknown)=>fetch('http://127.0.0.1:'+address.port+endpoint,{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify(body)});
 try{assert.equal((await post('/api/reception/assign',{})).status,410);assert.equal((await post('/api/reception/events',{})).status,410);assert.equal((await post('/api/leads',{...input,requestId:crypto.randomUUID(),contactMethod:'wechat',contact:'callback_fixture'})).status,201);assert.equal((db.prepare('SELECT COUNT(*) n FROM leads').get() as any).n,1);assert.equal((db.prepare('SELECT COUNT(*) n FROM direct_contact_notifications').get() as any).n,0);}finally{await new Promise<void>(r=>server.close(()=>r()));db.close();assert(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep));rmSync(directory,{recursive:true,force:true})}
});
test('verified original com forms submit contact details without automatic external hand-off',()=>{
 const output=execFileSync(process.execPath,['--input-type=module','-e',`import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {callbackOnlyComBundle} from './scripts/com-contact-callback.mjs';const original=readFileSync('site/com/assets/index-Db9ODUdG.js','utf8');const updated=callbackOnlyComBundle(original);assert(!updated.includes('&&Ln(W.contactMethod,Xe,ge.current)'));assert(!updated.includes('Send and open WhatsApp'));assert(updated.includes('Submit contact details'));assert.throws(()=>callbackOnlyComBundle(updated),/review callback patch/);console.log('ok')`],{encoding:'utf8'});assert.equal(output.trim(),'ok');
});

test('callback-only scheduled worker pauses old direct notifications while still delivering saved enquiries',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'callback-cron-')),bundle=path.join(directory,'worker.mjs');
 await build({stdin:{contents:`import worker from './worker/index';export default{async fetch(request,env,ctx){if(new URL(request.url).pathname==='/__cron_fixture'){const pending=[];await worker.scheduled({},env,{waitUntil:p=>pending.push(p)});await Promise.all(pending);return Response.json({ok:true})}return worker.fetch(request,env,ctx)}}`,resolveDir:process.cwd()},outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2023',external:['node:*'],logLevel:'silent'});
 let messages=0;const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{...vars,DISABLE_TELEGRAM:'false',TELEGRAM_BOT_TOKEN:'fixture-only',TELEGRAM_CHAT_ID:'fixture-only'},outboundService:async(request:Request)=>{assert.equal(new URL(request.url).hostname,'api.telegram.org');const body=await request.json() as any;assert(!body.text.includes('网站直接联系'));messages++;return MFResponse.json({ok:true,result:{message_id:messages}})}}));
 try{const d1=await mf.getD1Database('DB');await applyTestMigrations(d1);const db={all:async(sql:string,args:unknown[]=[]) =>(await d1.prepare(sql).bind(...args).all()).results,batch:async(qs:{sql:string;args:unknown[]}[])=>{await d1.batch(qs.map(q=>d1.prepare(q.sql).bind(...q.args)))}};
 await saveReception(db,{targets:[{id:crypto.randomUUID(),channel:'whatsapp',enabled:true,cities:[],groupId:'fixture',groupName:'Fixture group',groupOrder:0,targetOrder:0,value:'+447700900001'}]});
 await assignReception(db,{requestId:crypto.randomUUID(),channel:'whatsapp',source:'website_direct',contactMethod:'phone',pagePath:'/services'});await db.batch([{sql:'UPDATE direct_contact_notifications SET next_attempt=0',args:[]}]);
 await mf.dispatchFetch(vars.APP_URL+'/__cron_fixture');assert.equal(messages,0);assert.equal((await db.all('SELECT attempts FROM direct_contact_notifications'))[0].attempts,0);
 const response=await mf.dispatchFetch(vars.APP_URL+'/api/leads',{method:'POST',headers:{Origin:vars.APP_URL,'Content-Type':'application/json'},body:JSON.stringify({...input,requestId:crypto.randomUUID(),contactMethod:'phone'})});assert.equal(response.status,201);
 await mf.dispatchFetch(vars.APP_URL+'/__cron_fixture');assert(messages>=1);assert.equal((await db.all('SELECT attempts FROM direct_contact_notifications'))[0].attempts,0);
 }finally{await mf.dispose();assert(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep));rmSync(directory,{recursive:true,force:true})}
});
