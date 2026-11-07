import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {saveCustomerRegistration} from './customer-registration.js';
import {saveRentalRegistration} from './rental-registration.js';
import {deliverRegistrationNotifications,registrationNotificationText} from './registration-notifications.js';
import {telegramDispatch,syncDispatchTelegram} from './manual-lead-dispatch.js';
import type {ReceptionDB} from './reception.js';

const settings={telegram:{token:'fixture',chatId:'12345'},signal:{url:'https://fixture.up.railway.app',secret:'fixture-relay-secret-12345678901234567890',appUrl:'https://eucove.com'}};
function fixture(){
 const native=new DatabaseSync(':memory:');for(const file of readdirSync('migrations').filter(n=>n.endsWith('.sql')).sort())native.exec(readFileSync('migrations/'+file,'utf8'));
 for(const [i,name] of ['江承裕','江牧','江鹏'].entries())native.prepare("INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES(?,?,?,'fixture','mail','2026-11-07T00:00:00Z')").run('staff-'+i,name,'staff-'+i+'@example.test');
 const db:ReceptionDB={all:async(sql,args=[])=>native.prepare(sql).all(...args as any[]) as any[],batch:async qs=>{native.exec('BEGIN');try{for(const q of qs)native.prepare(q.sql).run(...q.args as any[]);native.exec('COMMIT');}catch(error){native.exec('ROLLBACK');throw error;}}};
 return {native,db};
}
const customer=()=>({requestId:crypto.randomUUID(),type:'buying',language:'zh',name:'虚构登记测试',contactMethod:'wechat',contact:'fixture-wechat',city:'Hong Kong Island',details:{}});
test('new registrations only: disabled history, idempotent submissions, four business types, edits do not notify',async()=>{
 const {native,db}=fixture();try{
  await saveCustomerRegistration(db,customer());
  native.exec('UPDATE registration_notification_settings SET enabled=1');
  assert.equal(native.prepare('SELECT COUNT(*) n FROM registration_notifications').get()!.n,0);
  const input=customer();await saveCustomerRegistration(db,input);await saveCustomerRegistration(db,input);
  await saveCustomerRegistration(db,{...customer(),type:'selling'});
  await saveCustomerRegistration(db,{...customer(),type:'advisory',details:{service:'cleaning'}});
  await saveRentalRegistration(db,{requestId:crypto.randomUUID(),language:'zh',name:'虚构房东测试',phone:'+447700900001',email:'fixture@example.test'});
  native.exec("UPDATE customer_registrations SET status='contacted',follow_up='内部备注不外发'");
  assert.equal(native.prepare('SELECT COUNT(*) n FROM registration_notifications').get()!.n,4);
  const rows=await db.all('SELECT * FROM registration_notifications');
  assert.match(registrationNotificationText(rows[0]),/联系方式：fixture-wechat/);
  assert.match(registrationNotificationText(rows[0]),/【联系电话】未提供/);
  assert.ok(rows.every(row=>!registrationNotificationText(row).includes('内部备注')));
 }finally{native.close();}
});
test('Telegram three choices, authenticated first choice wins; Signal waits, retries with stable UUID and sends once',async()=>{
 const {native,db}=fixture(),original=globalThis.fetch,calls:any[]=[];let failSignal=true;
 globalThis.fetch=(async(url:any,init:any)=>{const body=JSON.parse(init.body);calls.push({url:String(url),body});if(String(url).includes('api.telegram.org'))return Response.json({ok:true,result:{message_id:100}});return failSignal?Response.json({error:'unavailable'},{status:503}):Response.json({ok:true,timestamp:123456789});}) as typeof fetch;
 try{
  native.exec('UPDATE registration_notification_settings SET enabled=1');await saveCustomerRegistration(db,customer());
  await Promise.all([deliverRegistrationNotifications(db,settings),deliverRegistrationNotifications(db,settings)]);
  assert.equal(calls.length,1);assert.deepEqual(calls[0].body.reply_markup.inline_keyboard[0].map((b:any)=>b.text),['江承裕','江牧','江鹏']);
  const [row]=await db.all('SELECT * FROM registration_notifications');
  assert.equal(row.signal_attempts,0);assert.equal(row.tg_status,'sent');
  const secret='fixture-webhook-secret-12345678901234567890';
  const choose=(index:number,user=12345)=>telegramDispatch(new Request('https://eucove.com/api/integrations/telegram-dispatch',{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Bot-Api-Secret-Token':secret},body:JSON.stringify({callback_query:{id:'fixture-callback',from:{id:user},data:`assign:${row.id}:${index}`,message:{message_id:100,chat:{id:12345,type:'private'}}}})}),db,{...settings.telegram,webhookSecret:secret});
  await choose(0,999);assert.equal((await db.all('SELECT selected_at FROM registration_notifications'))[0].selected_at,null);
  await choose(1);await choose(2);assert.equal((await db.all('SELECT recipient FROM registration_notifications'))[0].recipient,'江牧');
  const [assigned]=await db.all('SELECT assigned_to,status FROM customer_registrations');assert.equal(assigned.assigned_to,'staff-1');assert.equal(assigned.status,'contacted');
  await deliverRegistrationNotifications(db,settings);const firstSignal=calls.find(c=>c.url.includes('.railway.app'));
  assert.match(firstSignal.body.id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.match(firstSignal.body.text,/接粉人员：江牧（江牧组）/);
  failSignal=false;native.exec('UPDATE registration_notifications SET signal_next_attempt=0');await deliverRegistrationNotifications(db,settings);await deliverRegistrationNotifications(db,settings);
  const signals=calls.filter(c=>c.url.includes('.railway.app'));assert.equal(signals.length,2);assert.deepEqual(signals[0].body,signals[1].body);
  assert.equal((await db.all('SELECT signal_status FROM registration_notifications'))[0].signal_status,'sent');
  await syncDispatchTelegram(db,settings.telegram);assert.deepEqual(calls.at(-1).body.reply_markup.inline_keyboard,[]);
 }finally{globalThis.fetch=original;native.close();}
});
test('ambiguous Telegram result is held for review and never blindly resent',async()=>{
 const {native,db}=fixture(),original=globalThis.fetch;let calls=0;
 globalThis.fetch=(async()=>{calls++;throw Error('lost reply');}) as typeof fetch;
 try{native.exec('UPDATE registration_notification_settings SET enabled=1');await saveCustomerRegistration(db,customer());await deliverRegistrationNotifications(db,settings);await deliverRegistrationNotifications(db,settings);assert.equal(calls,1);assert.equal((await db.all('SELECT tg_status,signal_attempts FROM registration_notifications'))[0].tg_status,'uncertain');assert.equal((await db.all('SELECT signal_attempts FROM registration_notifications'))[0].signal_attempts,0);}finally{globalThis.fetch=original;native.close();}
});
