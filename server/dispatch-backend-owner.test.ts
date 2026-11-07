import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {saveCustomerRegistration,customerRegistrationAdmin} from './customer-registration.js';
import {saveRentalRegistration,registrationAdmin} from './rental-registration.js';
import {telegramDispatch} from './manual-lead-dispatch.js';
import type {ReceptionDB} from './reception.js';

function fixture(){
 const native=new DatabaseSync(':memory:');for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())native.exec(readFileSync('migrations/'+f,'utf8'));
 const staff=['江承裕','江牧','江鹏'].map(name=>{const id=crypto.randomUUID();native.prepare("INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES(?,?,?,'fixture','mail','2026-11-07T00:00:00Z')").run(id,name,id+'@example.test');return id;});
 const db:ReceptionDB={all:async(sql,args=[])=>native.prepare(sql).all(...args as any[]) as any[],batch:async qs=>{native.exec('BEGIN');try{for(const q of qs)native.prepare(q.sql).run(...q.args as any[]);native.exec('COMMIT');}catch(e){native.exec('ROLLBACK');throw e;}}};
 return {db,native,staff};
}
test('TG selection atomically assigns backend owner/contacted for a lead and linked registration without granting account access',async()=>{
 const {db,native,staff}=fixture();try{
  native.exec("UPDATE lead_dispatch_settings SET enabled=1; INSERT INTO owners(id,contact_key,contact,name,created_at) VALUES('o','o','+447700900001','fixture','2026-11-07T00:00:00Z'); INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,data,created_at) VALUES('lead','request','hash','o','Sydney','letting','{}','2026-11-07T00:00:00Z');");
  const linked=await saveCustomerRegistration(db,{requestId:crypto.randomUUID(),type:'buying',language:'zh',name:'虚构测试',contactMethod:'email',contact:'fixture@example.test',city:'Sydney',details:{}});
  native.prepare("UPDATE customer_registrations SET related_lead_id='lead' WHERE id=?").run(linked.receipt.id);
  native.prepare("UPDATE manual_lead_dispatch SET recipient='江牧',selected_at='2026-11-07T01:00:00Z' WHERE source='lead' AND source_id='lead'").run();
  assert.deepEqual({...native.prepare("SELECT assigned_to,status FROM leads WHERE id='lead'").get()},{assigned_to:staff[1],status:'contacted'});
  const row=native.prepare('SELECT assigned_to,status,version FROM customer_registrations WHERE id=?').get(linked.receipt.id)!;
  assert.equal(row.assigned_to,staff[1]);assert.equal(row.status,'contacted');assert.equal(row.version,2);
  assert.equal(native.prepare('SELECT role FROM users WHERE id=?').get(staff[1])!.role,'mail');
  native.exec("UPDATE leads SET status='completed'; UPDATE manual_lead_dispatch SET telegram_dirty=0");
  assert.equal(native.prepare("SELECT status FROM leads WHERE id='lead'").get()!.status,'completed');
 }finally{native.close();}
});
test('rental and customer detail show the chosen owner; later progress is not regressed and retaining the owner permits follow-up edits',async()=>{
 const {db,native,staff}=fixture();try{
  native.exec('UPDATE registration_notification_settings SET enabled=1');
  const rental=await saveRentalRegistration(db,{requestId:crypto.randomUUID(),language:'zh',name:'测试',phone:'+447700900001',email:'fixture@example.test'});
  const customer=await saveCustomerRegistration(db,{requestId:crypto.randomUUID(),type:'buying',language:'zh',name:'测试',contactMethod:'email',contact:'fixture@example.test',city:'Sydney',details:{}});
  native.prepare("UPDATE customer_registrations SET status='completed' WHERE id=?").run(customer.receipt.id);
  native.exec("UPDATE registration_notifications SET recipient='江承裕',selected_at='2026-11-07T01:00:00Z'");
  const admin={id:'admin',role:'admin',city:null} as any;
  const r=await registrationAdmin(db,admin,'GET','/api/admin/rental-registrations/'+rental.receipt.id) as any;
  assert.equal(r.record.assignedTo,staff[0]);assert.equal(r.record.assignedToName,'江承裕');assert.equal(r.record.status,'contacted');
  const c=await customerRegistrationAdmin(db,admin,'GET','/api/admin/customer-registrations/'+customer.receipt.id) as any;
  assert.equal(c.record.assignedTo,staff[0]);assert.equal(c.record.assignedToName,'江承裕');assert.equal(c.record.status,'completed');
  await customerRegistrationAdmin(db,admin,'PATCH','/api/admin/customer-registrations/'+customer.receipt.id,{version:c.record.version,status:'completed',category:'buying',followUp:'更新跟进',assignedTo:staff[0],nextFollowUp:''});
  assert.equal(native.prepare('SELECT COUNT(*) n FROM registration_notifications').get()!.n,2);
 }finally{native.close();}
});
test('a missing or duplicate staff account does not commit a selection or release Signal',async()=>{
 const {db,native}=fixture(),original=globalThis.fetch;
 globalThis.fetch=(async()=>Response.json({ok:true})) as typeof fetch;
 try{
  native.exec('UPDATE registration_notification_settings SET enabled=1');await saveRentalRegistration(db,{requestId:crypto.randomUUID(),language:'zh',name:'测试',phone:'+447700900001',email:'fixture@example.test'});
  const row=native.prepare('SELECT id FROM registration_notifications').get()!;
  const select=()=>telegramDispatch(new Request('https://eucove.com/api/integrations/telegram-dispatch',{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Bot-Api-Secret-Token':'fixture-secret-123456789012345678901234'},body:JSON.stringify({callback_query:{id:'fixture',from:{id:12345},data:'assign:'+row.id+':0',message:{message_id:1,chat:{id:12345,type:'private'}}}})}),db,{token:'fixture',chatId:'12345',webhookSecret:'fixture-secret-123456789012345678901234'});
  native.exec("UPDATE users SET name='other' WHERE name='江承裕'");await select();assert.equal(native.prepare('SELECT selected_at FROM registration_notifications').get()!.selected_at,null);
  native.exec("UPDATE users SET name='江承裕'");await select();assert.equal(native.prepare('SELECT selected_at FROM registration_notifications').get()!.selected_at,null);
 }finally{globalThis.fetch=original;native.close();}
});
