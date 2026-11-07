import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createRelay,signature} from './relay.mjs';

test('authenticated fixed-target relay: replay, edits, persistence, uncertainty, pause and errors',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'eucove-relay-')),secret='fixture-only-'.repeat(5);let enabled=false,calls=0,mode='ok';
 const client=async(command,text,previous)=>command==='verify'?{verified:true}:{code:mode==='ok'?0:1,started:mode!=='unavailable',timestamp:previous||1700000000000+(++calls)};
 let app;
 async function start(){app=await createRelay({directory,secret,enabled:()=>enabled,client});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));await app.verify();}
 async function stop(){await new Promise(r=>app.server.close(r));app.close();}
 async function request(url,body,headers){const raw=body?JSON.stringify(body):'',time=String(Date.now()),nonce=randomUUID(),method=body?'POST':'GET';const signed=headers||{'x-eucove-time':time,'x-eucove-nonce':nonce,'x-eucove-signature':signature(secret,time,nonce,method,url,raw)};const response=await fetch(`http://127.0.0.1:${app.server.address().port}${url}`,{method,body:raw||undefined,headers:{...signed,'Content-Type':'application/json'}});return {status:response.status,body:await response.json(),headers:signed};}
 try{
 await start();assert.equal((await request('/v1/status',null,{})).status,401);
 const oldTime=String(Date.now()-100000),oldNonce=randomUUID();assert.equal((await request('/v1/status',null,{'x-eucove-time':oldTime,'x-eucove-nonce':oldNonce,'x-eucove-signature':signature(secret,oldTime,oldNonce,'GET','/v1/status')})).status,401);
 const status=await request('/v1/status');assert.equal(status.body.targetVerified,true);assert.equal((await request('/v1/status',null,status.headers)).status,409);
 const input={id:randomUUID(),revision:0,text:'Entirely fictional fixture'};
 assert.equal((await request('/v1/messages',input)).status,503);enabled=true;
 assert.equal((await request('/v1/messages',{...input,groupId:'forbidden'})).status,400);
 const sent=await request('/v1/messages',input);assert.equal(sent.status,200);assert.equal(calls,1);
 assert.equal((await request('/v1/messages',input)).body.timestamp,sent.body.timestamp);assert.equal(calls,1);
 assert.equal((await request('/v1/messages',{...input,text:'conflict'})).status,409);
 assert.equal((await request('/v1/messages',{...input,revision:1,text:'Fictional routing update'})).body.timestamp,sent.body.timestamp);
 await stop();await start();assert.equal((await request('/v1/messages',input)).body.timestamp,sent.body.timestamp);
 mode='unavailable';const retry={...input,id:randomUUID()};assert.equal((await request('/v1/messages',retry)).status,503);mode='ok';assert.equal((await request('/v1/messages',retry)).status,200);
 mode='uncertain';const uncertain={...input,id:randomUUID()};assert.equal((await request('/v1/messages',uncertain)).body.error,'delivery_uncertain');mode='ok';assert.equal((await request('/v1/messages',uncertain)).body.error,'delivery_uncertain');assert.equal((await request('/v1/messages',{...uncertain,revision:1})).body.error,'delivery_uncertain');
 await stop();const crashId=randomUUID(),ledger=new DatabaseSync(path.join(directory,'relay.sqlite'));ledger.prepare("INSERT INTO deliveries(id,revision,hash,status) VALUES(?,0,'fixture','running')").run(crashId);ledger.close();await start();assert.equal((await request('/v1/messages',{...input,id:crashId,revision:1})).body.error,'delivery_uncertain');
 assert.equal((await request('/rpc')).status,404);
 }finally{await stop();rmSync(directory,{recursive:true,force:true});}
});
test('single Signal process: concurrent busy and bounded rate limit without real messages',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'eucove-relay-rate-')),secret='fixture-rate-limit-secret-1234567890123456';let release,entered;const started=new Promise(r=>{entered=r;});let blocked=true;
 const app=await createRelay({directory,secret,enabled:()=>true,client:async command=>{if(command==='verify')return{verified:true};if(blocked){blocked=false;entered();await new Promise(r=>{release=r;});}return{code:0,timestamp:Date.now()};}});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));await app.verify();
 const request=async()=>{const body=JSON.stringify({id:randomUUID(),revision:0,text:'Fictional rate fixture'}),time=String(Date.now()),nonce=randomUUID();return fetch(`http://127.0.0.1:${app.server.address().port}/v1/messages`,{method:'POST',body,headers:{'x-eucove-time':time,'x-eucove-nonce':nonce,'x-eucove-signature':signature(secret,time,nonce,'POST','/v1/messages',body)}});};
 try{const first=request();await started;assert.equal((await request()).status,429);release();assert.equal((await first).status,200);for(let i=0;i<19;i++)assert.equal((await request()).status,200);assert.equal((await request()).status,429);}finally{await new Promise(r=>app.server.close(r));app.close();rmSync(directory,{recursive:true,force:true});}
});
