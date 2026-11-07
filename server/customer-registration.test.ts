import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions,Response as MFResponse} from 'miniflare';
import {customerRegistrationSchema} from '../src/customer-registration';
import {saveCustomerRegistration,customerRegistrationAdmin} from './customer-registration';
import {saveRentalRegistration} from './rental-registration';
import {applyTestMigrations} from './test-migrations';
import type {ReceptionDB} from './reception';
import type {User} from './schema';

const admin:User={id:crypto.randomUUID(),name:'Fixture admin',email:'admin@example.test',role:'admin',city:null};
const manager:User={...admin,id:crypto.randomUUID(),role:'manager',city:'Sydney'};
const sample=(extra:Record<string,unknown>={})=>({requestId:crypto.randomUUID(),language:'zh',type:'buying',name:'仅本地虚构客户',contactMethod:'phone',contact:'+447700900001',details:{},...extra});
function fixture(){const native=new DatabaseSync(':memory:');native.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())native.exec(readFileSync('migrations/'+f,'utf8'));const db:ReceptionDB={all:async(sql,args=[])=>native.prepare(sql).all(...args as any[]) as any[],batch:async qs=>{native.exec('BEGIN');try{for(const q of qs)native.prepare(q.sql).run(...q.args as any[]);native.exec('COMMIT')}catch(e){native.exec('ROLLBACK');throw e}}};return {db,native};}
const list=async(db:ReceptionDB,user=admin)=>(await customerRegistrationAdmin(db,user,'GET','/api/admin/customer-registrations') as {records:any[]}).records;
const followUp=(extra:Record<string,unknown>={})=>({version:1,status:'contacted',followUp:'仅供内部查看',assignedTo:null,nextFollowUp:'2026-11-01T01:00:00.000Z',category:'buying',...extra});

test('all new services accept only name and one valid contact; unrelated fields and invalid ranges are rejected',()=>{
 for(const contact of [{contactMethod:'phone',contact:'+447700900001'},{contactMethod:'whatsapp',contact:'+447700900001'},{contactMethod:'wechat',contact:'fixture_wechat'},{contactMethod:'email',contact:'fictional@example.test'}])assert(customerRegistrationSchema.safeParse(sample(contact)).success);
 for(const type of ['buying','selling'])assert(customerRegistrationSchema.safeParse(sample({type})).success);
 for(const service of ['buyer-advisory','renovation','house-care','maintenance','other'])assert(customerRegistrationSchema.safeParse(sample({type:'advisory',details:{service}})).success);
 for(const invalid of [{name:''},{contact:''},{contactMethod:'email',contact:'bad'},{contactMethod:'wechat',contact:'123'},{details:{budgetMin:100,budgetMax:99}},{details:{bedrooms:1.5}},{details:{parking:-1}},{details:{rentMin:1}},{type:'selling',details:{budgetMin:100}},{type:'advisory',details:{service:'maintenance',budgetMax:500}},{propertyId:crypto.randomUUID(),type:'selling'},{email:'not-an-email'}])assert(!customerRegistrationSchema.safeParse(sample(invalid)).success,JSON.stringify(invalid));
 const parsed=customerRegistrationSchema.parse(sample({details:{parking:'0',bedrooms:'  ',budgetMin:'  '}}));assert.equal((parsed.details as any).parking,0);assert.equal((parsed.details as any).bedrooms,undefined);assert.equal((parsed.details as any).budgetMin,undefined);
});

test('concurrent retries create one record and receipt; new registrations never enqueue rental sheets or notifications',async()=>{
 const {db,native}=fixture();try{const input=sample();const results=await Promise.all(Array.from({length:12},()=>saveCustomerRegistration(db,input)));assert.equal(new Set(results.map(r=>r.receipt.id)).size,1);assert.equal(results.filter(r=>r.created).length,1);assert.deepEqual(Object.keys(results[0].receipt).sort(),['createdAt','id']);assert.equal((await list(db)).length,1);
  await assert.rejects(saveCustomerRegistration(db,{...input,name:'Changed'}),/不同资料/);await assert.rejects(saveCustomerRegistration(db,sample({website:'spam'})),/无法提交/);
  for(const table of ['leads','notifications','direct_contact_notifications','rental_registration_sync','reception_channel_assignments'])assert.equal((await db.all('SELECT COUNT(*) n FROM '+table))[0].n,0,table);
  await saveRentalRegistration(db,{requestId:crypto.randomUUID(),language:'zh',name:'仅虚构房东',phone:'+447700900001',email:'fixture@example.test'});assert.equal((await db.all('SELECT COUNT(*) n FROM rental_registration_sync'))[0].n,1);
 }finally{native.close()}
});

test('city permissions, mail exclusion, follow-up concurrency, reassignment and buying/advice conversion',async()=>{
 const {db,native}=fixture();try{
  for(const u of [admin,manager])native.prepare('INSERT INTO users(id,name,email,password_hash,role,city,created_at) VALUES(?,?,?,?,?,?,?)').run(u.id,u.name,u.email+u.id,'fixture',u.role,u.city,'2026-10-28');
  const r=await saveCustomerRegistration(db,sample({city:'Sydney'}));await saveCustomerRegistration(db,sample({city:'Hobart'}));await saveCustomerRegistration(db,sample());assert.equal((await list(db,manager)).length,1);
  assert.equal((await list(db,{...manager,city:'Melbourne'})).length,0);await assert.rejects(list(db,{...admin,role:'mail'}),/权限/);
  const route='/api/admin/customer-registrations/'+r.receipt.id;
  await assert.rejects(customerRegistrationAdmin(db,{...manager,city:'Melbourne'},'GET',route),/不存在/);
  await assert.rejects(customerRegistrationAdmin(db,{...manager,role:'assistant'},'PATCH',route,followUp({assignedTo:manager.id})),/助理/);
  await assert.rejects(customerRegistrationAdmin(db,admin,'PATCH',route,followUp({category:'selling'})),/分类/);
  const result=await customerRegistrationAdmin(db,manager,'PATCH',route,followUp({assignedTo:manager.id,category:'advisory'})) as any;assert.equal(result.record.category,'advisory');assert.equal(result.record.type,'buying');assert.equal(result.record.version,2);assert.equal(result.record.assignedTo,manager.id);
  await assert.rejects(customerRegistrationAdmin(db,manager,'PATCH',route,followUp()),/刷新/);
  await customerRegistrationAdmin(db,manager,'PATCH',route,followUp({version:2,category:'buying',status:'completed'}));assert.equal((await list(db,manager))[0].status,'completed');
 }finally{native.close()}
});

test('property location comes from the published sale record; retry works after withdrawal',async()=>{
 const {db,native}=fixture();try{const id=crypto.randomUUID();native.prepare('INSERT INTO properties(id,city,published,data,created_at,updated_at) VALUES(?,?,1,?,?,?)').run(id,'Sydney',JSON.stringify({status:'sale',address:'Fixture Street',suburb:'Fixture Suburb'}),'2026-10-28','2026-10-28');const input=sample({propertyId:id,city:'Perth'});const first=await saveCustomerRegistration(db,input);const saved=(await list(db))[0];assert.equal(saved.city,'Sydney');assert.equal(saved.propertyAddress,'Fixture Street, Fixture Suburb');native.prepare('UPDATE properties SET published=0 WHERE id=?').run(id);assert.deepEqual((await saveCustomerRegistration(db,input)).receipt,first.receipt);await assert.rejects(saveCustomerRegistration(db,sample({propertyId:id})),/房源/);
 }finally{native.close()}
});

test('explicit short-enquiry association requires matching contact and city; does not create another lead',async()=>{
 const {db,native}=fixture();try{const id=crypto.randomUUID(),requestId=crypto.randomUUID(),owner=crypto.randomUUID();native.prepare('INSERT INTO owners(id,contact_key,contact,name,created_at) VALUES(?,?,?,?,?)').run(owner,'fixture','+447700900001','Fixture owner','2026-10-28');native.prepare('INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,data,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id,requestId,'fixture',owner,'Sydney','buying',JSON.stringify({contactMethod:'phone',contact:'+44 7700 900001'}),'2026-10-28');await saveCustomerRegistration(db,sample({leadRequestId:requestId}));assert.equal((await list(db))[0].relatedLeadId,id);assert.equal((await list(db))[0].city,'Sydney');await assert.rejects(saveCustomerRegistration(db,sample({leadRequestId:requestId,contact:'+447700900002'})),/关联咨询/);await assert.rejects(saveCustomerRegistration(db,sample({leadRequestId:requestId,city:'Perth'})),/关联咨询/);assert.equal((await db.all('SELECT COUNT(*) n FROM leads'))[0].n,1);
 }finally{native.close()}
});

test('Worker/D1 API, origin checks, isolated form documents and language routes',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'customer-registration-worker-')),bundle=path.join(dir,'worker.mjs');
 await build({entryPoints:['worker/index.ts'],outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2023',external:['node:*'],logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],serviceBindings:{ASSETS:(request:Request)=>new MFResponse('<html><head><title>Fixture</title></head><body>'+new URL(request.url).pathname+'</body></html>',{headers:{'Content-Type':'text/html'}})},bindings:{APP_URL:'https://fixture.invalid',SESSION_SECRET:'fixture-only-secret-12345678901234567890',DISABLE_TELEGRAM:'true',SIGNAL_ENABLED:'false',MAIL_ENABLED:'false',REGISTRATION_SHEETS_ENABLED:'false'},outboundService:()=>{throw Error('External traffic blocked')}}));
 try{const db=await mf.getD1Database('DB');await applyTestMigrations(db);const send=(input:unknown,origin='https://fixture.invalid')=>mf.dispatchFetch('https://fixture.invalid/api/customer-registrations',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(input)}),input=sample();
  assert.equal((await send(input,'https://untrusted.invalid')).status,403);assert.equal((await send({...input,contact:''})).status,400);const first=await send(input);assert.equal(first.status,201);const receipt=await first.json() as any;const repeats=await Promise.all(Array.from({length:4},()=>send(input)));for(const response of repeats){assert.equal(response.status,200);assert.deepEqual((await response.json() as any).receipt,receipt.receipt)}assert.equal((await send({...input,name:'Changed'})).status,409);assert.equal((await mf.dispatchFetch('https://fixture.invalid/api/admin/customer-registrations')).status,401);
  for(const route of ['registration','buying-registration','selling-registration','advisory-registration']){const response=await mf.dispatchFetch('https://fixture.invalid/en/'+route);assert.equal(response.status,200);const html=await response.text();assert.match(html,/lang="en"/);assert.match(html,/noindex,nofollow/);assert.match(html,/\/admin-shell/);assert(!html.includes('facebook.com/tr'));assert(!html.includes('Property rental registration'));const legacy=await mf.dispatchFetch('https://fixture.invalid/'+route+'?lang=en',{redirect:'manual'});assert.equal(legacy.status,308);assert.equal(legacy.headers.get('Location'),'/en/'+route);}
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM customer_registrations').first() as any).n,1);
 }finally{await mf.dispose();const resolved=path.resolve(dir);assert(resolved.startsWith(path.resolve(tmpdir())+path.sep));rmSync(resolved,{recursive:true,force:true})}
});
