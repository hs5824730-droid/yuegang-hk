import test from 'node:test';import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {build} from 'esbuild';import {Miniflare,convertV4MiniflareOptions,Response as MFResponse} from 'miniflare';
import {saveRentalRegistration,registrationAdmin} from './rental-registration.js';
import {GoogleRegistrationSheet,syncRentalRegistrations,registrationSheetValues,registrationSheetFormat,SHEET_HEADERS,RegistrationSyncError} from './registration-sheets.js';
import {rentalRegistrationSchema,type RentalRegistrationRecord} from '../src/rental-registration.js';
import {applyTestMigrations} from './test-migrations.js';import type {ReceptionDB} from './reception.js';import type {User} from './schema.js';
const admin:User={id:'admin',name:'Fixture',email:'admin@example.test',role:'admin',city:null},manager:User={...admin,role:'manager',city:'Hong Kong Island'};
const sample=(extra={})=>({requestId:crypto.randomUUID(),language:'zh',name:'仅虚构房东',phone:'+447700900001',email:'fictional@example.test',...extra});
function fixture(){const native=new DatabaseSync(':memory:');native.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())native.exec(readFileSync('migrations/'+f,'utf8'));const db:ReceptionDB={all:async(sql,args=[])=>native.prepare(sql).all(...args as any[]) as any[],batch:async qs=>{native.exec('BEGIN');try{for(const q of qs)native.prepare(q.sql).run(...q.args as any[]);native.exec('COMMIT')}catch(e){native.exec('ROLLBACK');throw e}}};return{db,native};}
const list=async(db:ReceptionDB)=>(await registrationAdmin(db,admin,'GET','/api/admin/rental-registrations') as {records:RentalRegistrationRecord[]}).records;
const env={REGISTRATION_SHEETS_ENABLED:'true',REGISTRATION_SHEETS_ID:'only-designated-fixture-sheet',REGISTRATION_SHEETS_TAB:'房东登记',REGISTRATION_GOOGLE_CLIENT_ID:'fixture',REGISTRATION_GOOGLE_CLIENT_SECRET:'fixture',REGISTRATION_GOOGLE_REFRESH_TOKEN:'fixture'};

test('only owner name, phone and email are required; optional blanks and explicit zero stay distinct',async()=>{
 const {db,native}=fixture();try{
  const input=sample(),first=await saveRentalRegistration(db,input),repeat=await saveRentalRegistration(db,input);assert.equal(first.created,true);assert.equal(repeat.created,false);assert.equal(first.receipt.id,repeat.receipt.id);
  const [r]=await list(db);assert.equal(r.city,'');assert.equal(r.street,'');assert.equal(r.bedrooms,undefined);assert.equal(r.parking,undefined);assert.equal((await db.all('SELECT city FROM rental_registrations'))[0].city,null);
  const values=registrationSheetValues(r);assert.equal(values[13],'');assert.equal(values[15],'');assert.equal(values[2],'');assert.equal(values[5],'');
  await saveRentalRegistration(db,sample({parking:0,bedrooms:'',bathrooms:null}));const zero=(await list(db)).find(r=>r.parking===0)!;assert(zero);assert.equal(registrationSheetValues(zero)[15],0);
  assert.equal((await db.all('SELECT COUNT(*) n FROM leads'))[0].n,0);assert.equal((await db.all('SELECT COUNT(*) n FROM reception_channel_assignments'))[0].n,0);assert.equal((await db.all('SELECT COUNT(*) n FROM notifications'))[0].n,0);
 }finally{native.close()}
});

test('missing, null, whitespace and invalid required values reject before any intake or outbox writes',async()=>{
 const {db,native}=fixture();try{
  for(const field of ['name','phone','email'])for(const value of [undefined,null,'','   '])await assert.rejects(saveRentalRegistration(db,sample({[field]:value})),/格式/);
  for(const extra of [{phone:'nobody'},{phone:'+123'},{email:'bad@'},{postcode:'abc'},{rentMin:800,rentMax:700},{parking:true},{bedrooms:2.5},{availableWhen:'date',availableDate:'2026-99-99'},{services:['invented']}])await assert.rejects(saveRentalRegistration(db,sample(extra)),/格式/);
  assert.equal((await db.all('SELECT COUNT(*) n FROM rental_registrations'))[0].n,0);assert.equal((await db.all('SELECT COUNT(*) n FROM rental_registration_sync'))[0].n,0);
 }finally{native.close()}
});

test('concurrent idempotency, private city-scoped admin access and follow-up conflict protection',async()=>{
 const {db,native}=fixture();try{
  const input=sample({city:'Hong Kong Island',street:'100 Fictional Street',suburb:'Example',state:'NSW',postcode:'2000',services:['management','marketing','management']}),results=await Promise.all(Array.from({length:12},()=>saveRentalRegistration(db,input)));
  assert.equal(new Set(results.map(r=>r.receipt.id)).size,1);assert.equal((await list(db)).length,1);const [r]=await list(db);assert.deepEqual(r.services,['management','marketing']);
  assert.equal((await db.all('SELECT seq FROM sqlite_sequence WHERE name=?',['rental_registrations']))[0].seq,1,'Retries do not reserve empty spreadsheet rows');
  await assert.rejects(saveRentalRegistration(db,{...input,name:'Different'}),/其他资料/);
  await assert.rejects(registrationAdmin(db,{...admin,role:'mail'},'GET','/api/admin/rental-registrations'),/权限/);
  assert.equal((await registrationAdmin(db,{...manager,city:'Kowloon'},'GET','/api/admin/rental-registrations') as any).records.length,0);
  await assert.rejects(registrationAdmin(db,{...manager,city:'Kowloon'},'GET','/api/admin/rental-registrations/'+r.id),/不存在/);
  await registrationAdmin(db,manager,'PATCH','/api/admin/rental-registrations/'+r.id,{version:1,status:'following',followUp:'仅内部跟进'});
  await assert.rejects(registrationAdmin(db,manager,'PATCH','/api/admin/rental-registrations/'+r.id,{version:1,status:'paused'}),/刷新/);
  assert.equal((await db.all('SELECT revision FROM rental_registration_sync'))[0].revision,2);
 }finally{native.close()}
});

test('sync failure never loses intake; lease prevents concurrent writes and later admin revisions stay pending',async()=>{
 const {db,native}=fixture();try{
  await saveRentalRegistration(db,sample());let calls=0;
  const provider={upsert:async(r:RentalRegistrationRecord)=>{calls++;if(calls===1)throw Error('timeout');if(calls===2)await registrationAdmin(db,admin,'PATCH','/api/admin/rental-registrations/'+r.id,{version:r.version,status:'contacted'});}};
  await Promise.all([syncRentalRegistrations(db,env,provider),syncRentalRegistrations(db,env,provider)]);assert.equal(calls,1);assert.equal((await list(db)).length,1);assert.equal((await list(db))[0].sync.status,'pending');
  const held=(await db.all('SELECT next_attempt FROM rental_registration_sync'))[0].next_attempt;assert(held>Date.now()+290000);const r=(await list(db))[0];await registrationAdmin(db,admin,'POST','/api/admin/rental-registrations/'+r.id+'/retry');assert.equal((await db.all('SELECT next_attempt FROM rental_registration_sync'))[0].next_attempt,held);
  native.exec('UPDATE rental_registration_sync SET next_attempt=0');await syncRentalRegistrations(db,env,provider);assert.equal((await list(db))[0].sync.status,'pending');await syncRentalRegistrations(db,env,provider);assert.equal((await list(db))[0].sync.status,'synced');assert.equal((await list(db))[0].sync.deliveredRevision,2);
 }finally{native.close()}
});

test('unconfigured or disabled Sheets does not call provider or consume retry attempts',async()=>{
 const {db,native}=fixture();try{await saveRentalRegistration(db,sample());await syncRentalRegistrations(db,{});await syncRentalRegistrations(db,{REGISTRATION_SHEETS_ENABLED:'false'},{upsert:async()=>{assert.fail('must not send')}});assert.equal((await list(db))[0].sync.attempts,0);}finally{native.close()}
});

function googleMock(){const rows=new Map<number,any[]>(),writes:any[]=[],expansions:any[]=[];let loseResponse=false;const transport:typeof fetch=async(url,init)=>{
 const u=new URL(String(url));if(u.hostname==='oauth2.googleapis.com')return Response.json({access_token:'fixture-only'});assert.equal(u.hostname,'sheets.googleapis.com');assert(u.pathname.startsWith('/v4/spreadsheets/'+env.REGISTRATION_SHEETS_ID));const range=decodeURIComponent(u.pathname.split('/values/')[1]||'');
 if(u.pathname.endsWith(':batchUpdate')){expansions.push(JSON.parse(String(init?.body)));return Response.json({replies:[]})}
 if(!u.pathname.includes('/values/'))return Response.json({sheets:[{properties:{sheetId:270017,title:'房东登记',gridProperties:{rowCount:1000}}}]});
 if(init?.method==='PUT'){assert.equal(u.searchParams.get('valueInputOption'),'RAW');const value=JSON.parse(String(init.body)).values[0],row=Number(range.match(/!A(\d+)/)![1]);rows.set(row,value);writes.push({row,value});if(loseResponse){loseResponse=false;throw Error('lost response')}return Response.json({updatedRows:1})}
 if(range.endsWith('!A1:Y1'))return Response.json({values:[SHEET_HEADERS]});if(range.endsWith('!A2:A')){const max=Math.max(1,...rows.keys());return Response.json({values:Array.from({length:max-1},(_,i)=>rows.has(i+2)?[rows.get(i+2)![0]]:[])})}const row=Number(range.match(/!A(\d+)/)![1]);return Response.json({values:rows.has(row)?[[rows.get(row)![0]]]:[]});
 };return{rows,writes,expansions,transport,lose:()=>{loseResponse=true}};}

test('Google RAW writes formula-looking values literally and retains phone + / leading zero; lost response reconciles same ID',async()=>{
 const {db,native}=fixture(),g=googleMock();try{
  await saveRentalRegistration(db,sample({name:'=IMPORTXML("https://invalid","x")',phone:'0412345678',notes:'=1+1\n<script>fixture</script>'}));const [r]=await list(db);const provider=new GoogleRegistrationSheet(env,g.transport);g.lose();await assert.rejects(provider.upsert(r),/lost response/);assert.equal(g.rows.size,1);await provider.upsert(r);assert.equal(g.rows.size,1);assert.equal(g.writes[0].row,g.writes[1].row);assert.equal(g.writes[0].value[1],r.name);assert.equal(g.writes[0].value[3],'0412345678');assert.equal(g.writes[0].value[23],r.notes);
  g.rows.set(7,g.rows.get(2)!);g.rows.delete(2);await provider.upsert(r);assert.equal(g.writes.at(-1).row,7);
  g.rows.set(2,g.rows.get(7)!);await assert.rejects(provider.upsert(r),/duplicate_source_id/);
 }finally{native.close()}
});

test('row conflicts and unexpected dedicated headers never overwrite another row or tab',async()=>{
 const {db,native}=fixture(),g=googleMock();try{await saveRentalRegistration(db,sample());const [r]=await list(db);g.rows.set(2,['another-source-id']);await assert.rejects(new GoogleRegistrationSheet(env,g.transport).upsert(r),/row_conflict/);assert.equal(g.writes.length,0);
  const wrong:typeof fetch=async(url,init)=>String(url).includes('/token')?g.transport(url,init):Response.json({values:[['Unrelated existing tab']]});await assert.rejects(new GoogleRegistrationSheet(env,wrong).upsert(r),/header_mismatch/);
  const plan=registrationSheetFormat(10);assert.equal((plan.requests[0] as any).addSheet.properties.gridProperties.frozenColumnCount,3);assert(!plan.requests.some(r=>'mergeCells' in r));
 }finally{native.close()}
});

test('capacity grows only the verified dedicated tab and does not require a second file',async()=>{
 const {db,native}=fixture(),g=googleMock();try{await saveRentalRegistration(db,sample());const [record]=await list(db);await new GoogleRegistrationSheet(env,g.transport).upsert({...record,seq:1005});assert.equal(g.expansions.length,1);assert.deepEqual(g.expansions[0].requests[0],{appendDimension:{sheetId:270017,dimension:'ROWS',length:500}});assert.equal(g.writes[0].row,1006);assert(!g.expansions[0].requests.some((r:any)=>r.addSheet||r.deleteSheet));}finally{native.close()}
});

test('real Worker/D1 accepts only the three mandatory fields, rejects missing values and keeps one source record',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'rental-registration-worker-'));const bundle=path.join(dir,'worker.mjs');
 await build({entryPoints:['worker/index.ts'],outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2023',external:['node:*'],logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],serviceBindings:{ASSETS:(request:Request)=>new MFResponse('<html><head><title>Fixture</title></head><body>'+new URL(request.url).pathname+'</body></html>',{headers:{'Content-Type':'text/html'}})},bindings:{APP_URL:'https://fixture.invalid',SESSION_SECRET:'fixture-registration-only-secret-123456789',DISABLE_TELEGRAM:'true',SIGNAL_ENABLED:'false',MAIL_ENABLED:'false',REGISTRATION_SHEETS_ENABLED:'false'},outboundService:()=>{throw Error('External traffic blocked')}}));
 try{const db=await mf.getD1Database('DB');await applyTestMigrations(db);const input=sample(),send=(body:unknown)=>mf.dispatchFetch('https://fixture.invalid/api/rental-registrations',{method:'POST',headers:{Origin:'https://fixture.invalid','Content-Type':'application/json'},body:JSON.stringify(body)});
  for(const field of ['name','phone','email'])assert.equal((await send({...input,[field]:''})).status,400);const first=await send(input);assert.equal(first.status,201);const receipt=await first.json() as any;const repeat=await send(input);assert.equal(repeat.status,200);assert.deepEqual((await repeat.json() as any).receipt,receipt.receipt);assert.equal((await db.prepare('SELECT COUNT(*) n FROM rental_registrations').first() as any).n,1);assert.equal((await db.prepare('SELECT COUNT(*) n FROM leads').first() as any).n,0);
  const replay=await Promise.all(Array.from({length:6},()=>send(input)));for(const r of replay){assert.equal(r.status,200);assert.deepEqual((await r.json() as any).receipt,receipt.receipt)}assert.equal((await db.prepare("SELECT seq FROM sqlite_sequence WHERE name='rental_registrations'").first() as any).seq,1);
  assert.equal((await mf.dispatchFetch('https://fixture.invalid/api/admin/rental-registrations')).status,401);
  const english=await mf.dispatchFetch('https://fixture.invalid/en/rental-registration');assert.equal(english.status,200);const html=await english.text();assert.match(html,/<html lang="en">/);assert.match(html,/noindex,nofollow/);assert.match(html,/\/admin-shell/);assert(!html.includes('facebook.com/tr'));
  const contact=await(await mf.dispatchFetch('https://fixture.invalid/en/contact')).text();assert.match(contact,/<html lang="en">/);assert.match(contact,/\/admin-shell/);assert(!contact.includes('facebook.com/tr'));
  const legacy=await mf.dispatchFetch('https://fixture.invalid/rental-registration?lang=en',{redirect:'manual'});assert.equal(legacy.status,308);assert.equal(legacy.headers.get('Location'),'/en/rental-registration');const home=await(await mf.dispatchFetch('https://fixture.invalid/')).text();assert(!home.includes('/admin-shell'));
 }finally{await mf.dispose();rmSync(dir,{recursive:true,force:true})}
});
