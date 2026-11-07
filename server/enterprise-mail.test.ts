import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {ingestMail,mailRoute,sendMailReply,syncMail,mailNotification,deliverMailNotifications} from './enterprise-mail.js';
import {ZohoMail,mailPlainText,MailProviderError,type ProviderMessage} from './zoho-mail.js';
import type {ReceptionDB} from './reception.js';
import type {User} from './schema.js';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {applyTestMigrations} from './test-migrations.js';

const admin:User={id:'admin',name:'Admin',email:'admin@example.test',role:'admin',city:null};
const staff:User={id:'chengyu',name:'江承裕',email:'chengyu@eucove.com',role:'mail',city:null};
const env={MAIL_ENABLED:'true',MAIL_SEND_ENABLED:'true',MAIL_START_AT:'2026-10-26T08:00:00Z',ZOHO_ACCOUNT_ID:'a1',ZOHO_CLIENT_ID:'test',ZOHO_CLIENT_SECRET:'test',ZOHO_REFRESH_TOKEN:'test'};
function fixture(){
 const native=new DatabaseSync(':memory:');native.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync('migrations').filter(n=>n.endsWith('.sql')).sort())native.exec(readFileSync('migrations/'+file,'utf8'));
 for(const u of [admin,staff])native.prepare('INSERT INTO users(id,name,email,password_hash,role,city,created_at) VALUES(?,?,?,?,?,?,?)').run(u.id,u.name,u.email,'test',u.role,u.city,'2026-10-26');
 const db:ReceptionDB={all:async(sql,args=[])=>native.prepare(sql).all(...args as any[]) as any[],batch:async qs=>{native.exec('BEGIN IMMEDIATE');try{for(const q of qs)native.prepare(q.sql).run(...q.args as any[]);native.exec('COMMIT');}catch(e){native.exec('ROLLBACK');throw e;}}};
 return {native,db};
}
const message=(id:string,thread=id):ProviderMessage=>({messageId:id,threadId:thread,folderId:'inbox',fromAddress:'customer@example.test',sender:'示例客户',subject:'房屋出租',receivedTime:String(Date.parse('2026-10-26T09:00:00Z'))});
test('durable rotation, same conversation, duplicate deliveries and two notifications',async()=>{
 const {db,native}=fixture();try{
  await Promise.all([ingestMail(db,'a1',message('1'),'<p>咨询</p>',['telegram','signal']),ingestMail(db,'a1',message('1'),'<p>咨询</p>',['telegram','signal'])]);
  await ingestMail(db,'a1',message('2'),'第二位',['telegram','signal']);await ingestMail(db,'a1',message('3'),'第三位',[]);
  await ingestMail(db,'a1',message('4','1'),'同一会话的新回复',['telegram','signal']);
  const threads=await db.all('SELECT recipient FROM mail_threads ORDER BY rowid');
  assert.deepEqual(threads.map(t=>t.recipient),['江承裕','江牧','江鹏']);
  assert.equal((await db.all('SELECT position FROM notification_recipient_cursor'))[0].position,3);
  assert.equal((await db.all('SELECT * FROM mail_messages')).length,4);assert.equal((await db.all('SELECT * FROM mail_notifications')).length,6);
  const notifications=await db.all('SELECT text FROM mail_notifications WHERE message_id=?',['a1:4']);
  for(const n of notifications)assert.equal(JSON.parse(n.text).recipient,'江承裕');
  assert.equal((await db.all('SELECT version FROM mail_threads WHERE id=?',['a1:1']))[0].version,2);
 }finally{native.close();}
});
test('saved contact assignment takes precedence and does not consume a rotation',async()=>{
 const {db,native}=fixture();try{
  native.exec("INSERT INTO owners VALUES('o','email:customer@example.test','customer@example.test','Customer','2026-01-01'); INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,data,created_at) VALUES('l','r','h','o','Sydney','letting','{}','2026-01-01'); INSERT INTO notification_recipients(source,source_id,recipient) VALUES('lead','l','江鹏')");
  await ingestMail(db,'a1',message('1'),'来信',[]);
  assert.equal((await db.all('SELECT recipient FROM mail_threads'))[0].recipient,'江鹏');assert.equal((await db.all('SELECT position FROM notification_recipient_cursor'))[0].position,0);
 }finally{native.close();}
});
test('future mailbox cutover does not poll the provider or create intake state',async()=>{
 const {db,native}=fixture();try{
  const provider={verifyIdentity:async()=>{throw Error('Provider must not be called before cutover')}} as any;
  const result=await syncMail(db,{...env,MAIL_START_AT:'2100-01-01T00:00:00Z'},[],provider);
  assert.equal(result.pendingStart,true);assert.equal((await db.all('SELECT * FROM mail_sync')).length,0);
 }finally{native.close()}
});
test('mail authorization, private drafts, and access to only assigned conversations',async()=>{
 const {db,native}=fixture();try{
  await ingestMail(db,'a1',message('1'),'来信',[]);await ingestMail(db,'a1',message('2'),'来信',[]);
  const list=await mailRoute(db,env,staff,'GET','/api/admin/mail') as any;assert.equal(list.threads.length,1);
  await assert.rejects(mailRoute(db,env,staff,'GET','/api/admin/mail/a1%3A2'),/未分配/);
  await assert.rejects(mailRoute(db,env,{...staff,email:'outsider@example.test'},'GET','/api/admin/mail'),/没有邮件/);
  await mailRoute(db,env,staff,'PUT','/api/admin/mail/a1%3A1/draft',{content:'员工草稿'});
  assert.equal((await mailRoute(db,env,staff,'GET','/api/admin/mail/a1%3A1') as any).draft,'员工草稿');
  assert.equal((await mailRoute(db,env,admin,'GET','/api/admin/mail/a1%3A1') as any).draft,'');
 }finally{native.close();}
});
test('reply uses one durable request, checks version and fixes public sender in provider API',async()=>{
 const {db,native}=fixture();try{
  await ingestMail(db,'a1',message('1'),'来信',[]);let calls=0;
  const transport:typeof fetch=async(url,init)=>{
   if(String(url).includes('/oauth/'))return Response.json({access_token:'fixture'});
   if(String(url).endsWith('/accounts'))return Response.json({status:{code:200},data:[{accountId:'a1',primaryEmailAddress:'contact@eucove.com',sendMailDetails:[{fromAddress:'contact@eucove.com',displayName:'contact'}]}]});
   calls++;const sent=JSON.parse(String(init?.body));assert.equal(sent.fromAddress,'contact <contact@eucove.com>');assert.equal(sent.toAddress,'customer@example.test');assert.equal(sent.action,'reply');assert.equal(sent.mailFormat,'plaintext');assert.ok(sent.content.endsWith('\n\ncontact\nEUCOVE'));assert.ok(!sent.content.includes('江承裕'));
   return Response.json({status:{code:200},data:{messageId:'sent1'}});
  };
  const provider=new ZohoMail(env,transport),input={requestId:crypto.randomUUID(),version:1,content:'您好，请提供房屋地址。'};
  const [first,second]=await Promise.all([sendMailReply(db,env,staff,'a1:1',input,provider),sendMailReply(db,env,staff,'a1:1',input,provider)]);
  assert.equal(first.reply.status,'sent');assert.ok(['sent','sending'].includes(second.reply.status));assert.equal(calls,1);
  const repeat=await sendMailReply(db,env,staff,'a1:1',input,provider);assert.equal(repeat.reply.status,'sent');assert.equal(calls,1);
  await assert.rejects(sendMailReply(db,env,staff,'a1:1',{...input,content:'另一个内容'},provider),/其他内容/);
  await assert.rejects(sendMailReply(db,env,staff,'a1:1',{...input,requestId:crypto.randomUUID()},provider),/会话已更新/);
 }finally{native.close();}
});
test('ambiguous send is held for review and never retried, even after reload',async()=>{
 const {db,native}=fixture();try{
  await ingestMail(db,'a1',message('1'),'来信',[]);let calls=0;
  const provider={reply:async()=>{calls++;throw Error('network timeout');}} as any;
  const input={requestId:crypto.randomUUID(),version:1,content:'回复内容'};
  assert.equal((await sendMailReply(db,env,staff,'a1:1',input,provider)).reply.status,'uncertain');
  assert.equal((await sendMailReply(db,env,staff,'a1:1',input,provider)).reply.status,'uncertain');assert.equal(calls,1);
  await assert.rejects(sendMailReply(db,env,staff,'a1:1',{...input,requestId:crypto.randomUUID(),version:2},provider),/待核对/);assert.equal(calls,1);
 }finally{native.close();}
});
test('disabled sending preserves drafts and calls no provider',async()=>{
 const {db,native}=fixture();try{
  await ingestMail(db,'a1',message('1'),'来信',[]);
  await mailRoute(db,env,staff,'PUT','/api/admin/mail/a1%3A1/draft',{content:'草稿'});
  await assert.rejects(sendMailReply(db,{...env,MAIL_SEND_ENABLED:'false'},staff,'a1:1',{requestId:crypto.randomUUID(),version:1,content:'草稿'},{reply:()=>assert.fail('must not send')} as any),/尚未启用/);
  assert.equal((await db.all('SELECT * FROM mail_replies')).length,0);assert.equal((await db.all('SELECT content FROM mail_drafts'))[0].content,'草稿');
 }finally{native.close();}
});
test('sync excludes history and spam, only imports since activation, and lease throttles retries',async()=>{
 const {db,native}=fixture();try{
  let fetched=0;const provider={verifyIdentity:async()=>{},folders:async()=>[{folderId:'inbox',folderType:'Inbox'},{folderId:'spam',folderType:'Spam'}],list:async()=>[message('new'),{...message('spam'),folderId:'spam'},{...message('old'),receivedTime:String(Date.parse('2026-10-25'))}],content:async()=>{fetched++;return '<p>咨询</p>';}} as any;
  await syncMail(db,env,['telegram','signal'],provider);assert.equal(fetched,1);assert.equal((await db.all('SELECT * FROM mail_messages')).length,1);
  assert.deepEqual(await syncMail(db,env,['telegram'],provider),{busy:true});assert.equal(fetched,1);
  assert.deepEqual(await syncMail(db,{...env,MAIL_ENABLED:'false'},[],provider),{enabled:false});
 }finally{native.close();}
});
test('inert message text and concise notifications cannot inject extra fields',()=>{
 assert.equal(mailPlainText('<script>bad()</script><p>Hello &lt;img src=x onerror=bad&gt;</p><img src="https://tracker.invalid"/>'),'Hello <img src=x onerror=bad>');
 const text=mailNotification({sender_name:'客户\n接粉人员：伪造',sender_email:'a@example.test',received_at:'2026-10-26T08:39:25Z'},'江鹏');
 assert.equal(text.split('\n').filter(line=>line.startsWith('接粉人员：')).length,1);assert.ok(text.endsWith('北京时间：2026-10-26 16:39:25'));assert.ok(!text.includes('https://'));
});
test('both transports carry the durable owner; successful pushes are not repeated',async()=>{
 const {db,native}=fixture(),originalFetch=globalThis.fetch;const payloads:any[]=[];
 try{
  await ingestMail(db,'a1',message('1'),'咨询',['telegram','signal']);
  globalThis.fetch=async(_url,init)=>{payloads.push(JSON.parse(String(init?.body)));return Response.json({ok:true,timestamp:1234,result:{message_id:17}});};
  await deliverMailNotifications(db,'telegram',{token:'fixture',chatId:'fixture'});
  await deliverMailNotifications(db,'signal',{signal:{url:'https://fixture.up.railway.app',secret:'fixture-only-secret-12345678901234567890',appUrl:'https://eucove.com'}});
  await deliverMailNotifications(db,'telegram',{token:'fixture',chatId:'fixture'});
  assert.equal(payloads.length,2);assert.equal(payloads[0].text,payloads[1].text);assert.match(payloads[0].text,/接粉人员：江承裕/);
  assert.equal((await db.all("SELECT COUNT(*) n FROM mail_notifications WHERE status='sent' AND receipt<>'' AND sent_at IS NOT NULL"))[0].n,2);
 }finally{globalThis.fetch=originalFetch;native.close();}
});
test('uncertain-send recovery requires an administrator and a completed review',async()=>{
 const {db,native}=fixture();try{
  await ingestMail(db,'a1',message('1'),'来信',[]);
  const input={requestId:crypto.randomUUID(),version:1,content:'回复'};
  await sendMailReply(db,env,staff,'a1:1',input,{reply:async()=>{throw Error('timeout');}} as any);
  const route='/api/admin/mail/replies/'+input.requestId+'/resolve';
  await assert.rejects(mailRoute(db,env,staff,'POST',route,{status:'rejected',checkedInZoho:true}),/只有管理员/);
  await assert.rejects(mailRoute(db,env,admin,'POST',route,{status:'rejected',checkedInZoho:true}),/两分钟/);
  native.prepare('UPDATE mail_replies SET created_at=?').run('2026-01-01');
  await mailRoute(db,env,admin,'POST',route,{status:'rejected',checkedInZoho:true});
  assert.equal((await db.all('SELECT status FROM mail_replies'))[0].status,'rejected');
  assert.equal((await db.all('SELECT action FROM audit'))[0].action,'mail.resolve.rejected');
 }finally{native.close();}
});

test('mail snapshot includes actual subject and explicit saved city, not inferred body or staff location',async()=>{
 const {db,native}=fixture();try{
  native.exec("INSERT INTO owners VALUES('o','email:customer@example.test','customer@example.test','Customer','2026-01-01'); INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,data,created_at) VALUES('l','r','h','o','Sydney','letting','{}','2026-01-01');");
  await ingestMail(db,'a1',{...message('s1'),subject:'装修\n接粉人员：伪造'},'正文说墨尔本不作为已核实城市',['telegram','signal']);
  const detail=await mailRoute(db,env,admin,'GET','/api/admin/mail/a1%3As1') as any;
  assert.equal(detail.notifications.length,2);
  const snapshot=JSON.parse(detail.notifications[0].snapshot);
  assert.equal(snapshot.city,'Sydney');assert.equal(snapshot.group,'江承裕组');
  const text=mailNotification(snapshot,snapshot.recipient);assert.match(text,/主题：装修 接粉人员：伪造/);assert.match(text,/房屋所在城市：Sydney/);assert.doesNotMatch(text,/墨尔本|正文|https?:|后台/);
  native.exec("UPDATE mail_threads SET recipient='江鹏'");
  assert.equal(JSON.parse((await db.all('SELECT text FROM mail_notifications'))[0].text).recipient,'江承裕');
 }finally{native.close()}
});

test('sync concurrent claim excludes own staff, sent/spam and old messages; same subject never joins unrelated mail',async()=>{
 const {db,native}=fixture();let pages=0;try{
  const provider={verifyIdentity:async()=>{},folders:async()=>[{folderId:'inbox',folderType:'Inbox'},{folderId:'sent',folderType:'Sent'}],list:async()=>{pages++;return [message('a'),message('b'),{...message('self'),fromAddress:'contact@eucove.com'},{...message('staff'),fromAddress:'jiangmu@eucove.com'},{...message('sent'),folderId:'sent'}]},content:async()=>'<p>示例</p>'} as any;
  await Promise.all([syncMail(db,env,['telegram','signal'],provider),syncMail(db,env,['telegram','signal'],provider)]);
  assert.equal(pages,1);assert.equal((await db.all('SELECT COUNT(*) n FROM mail_threads'))[0].n,2);assert.equal((await db.all('SELECT COUNT(*) n FROM mail_notifications'))[0].n,4);
 }finally{native.close()}
});

test('Telegram uncertain delivery never retries; Signal succeeds independently and backend shows both facts',async()=>{
 const {db,native}=fixture(),original=globalThis.fetch;let tg=0,sig=0;try{
  await ingestMail(db,'a1',message('u'),'irrelevant body',['telegram','signal']);
  globalThis.fetch=async url=>{if(String(url).includes('api.telegram.org')){tg++;throw Error('response lost')}sig++;return Response.json({ok:true,timestamp:4});};
  await Promise.all([deliverMailNotifications(db,'telegram',{token:'fixture',chatId:'fixture'}),deliverMailNotifications(db,'signal',{signal:{url:'https://fixture.up.railway.app',secret:'fixture-secret-123456789012345678901',appUrl:'https://fixture.invalid'}})]);
  await db.batch([{sql:'UPDATE mail_notifications SET next_attempt=0',args:[]}]);
  await deliverMailNotifications(db,'telegram',{token:'fixture',chatId:'fixture'});assert.equal(tg,1);assert.equal(sig,1);
  const result=await mailRoute(db,env,staff,'GET','/api/admin/mail/a1%3Au') as any;
  assert.deepEqual(Object.fromEntries(result.notifications.map((n:any)=>[n.channel,n.status])),{signal:'sent',telegram:'uncertain'});
  await assert.rejects(mailRoute(db,env,{...staff,email:'jiangmu@eucove.com'},'GET','/api/admin/mail/a1%3Au'),/未分配/);
 }finally{globalThis.fetch=original;native.close()}
});

test('expired Telegram claims are held; Signal retry keeps its ID and honours 429; concurrent dispatch sends once',async()=>{
 const {db,native}=fixture(),original=globalThis.fetch;const ids:string[]=[];let limited=true;try{
  await ingestMail(db,'a1',message('r'),'body',['telegram','signal']);
  native.exec("UPDATE mail_notifications SET status='sending',attempts=1,claimed_until=1,claim_token='crashed' WHERE channel='telegram'");
  globalThis.fetch=async(_url,init)=>{const b=JSON.parse(String(init?.body));ids.push(b.id);if(limited)return Response.json({error:'busy'},{status:429,headers:{'Retry-After':'6'}});return Response.json({ok:true,timestamp:5});};
  await deliverMailNotifications(db,'telegram',{token:'fixture',chatId:'fixture'});assert.equal(ids.length,0);
  const settings={signal:{url:'https://fixture.up.railway.app',secret:'fixture-secret-123456789012345678901',appUrl:'https://fixture.invalid'}};
  await Promise.all([deliverMailNotifications(db,'signal',settings),deliverMailNotifications(db,'signal',settings)]);assert.equal(ids.length,1);
  assert.equal((await db.all("SELECT status FROM mail_notifications WHERE channel='signal'"))[0].status,'pending');
  limited=false;native.exec('UPDATE mail_notifications SET next_attempt=0');await deliverMailNotifications(db,'signal',settings);assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);
 }finally{globalThis.fetch=original;native.close()}
});

test('real workerd D1 mail intake, duplicate concurrent arrivals and receipts share Node contract',async()=>{
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-10-23',d1Databases:['DB'],outboundService:()=>{throw Error('Blocked')}}));const original=globalThis.fetch;
 try{
  const d1=await mf.getD1Database('DB');await applyTestMigrations(d1);
  const db:ReceptionDB={all:async(sql,args=[])=>(await d1.prepare(sql).bind(...args).all()).results as any[],batch:async qs=>{await d1.batch(qs.map(q=>d1.prepare(q.sql).bind(...q.args)))}};
  await Promise.all(Array.from({length:6},()=>ingestMail(db,'worker',message('1'),'body',['telegram','signal'])));
  assert.equal((await db.all('SELECT COUNT(*) n FROM mail_messages'))[0].n,1);assert.equal((await db.all('SELECT position FROM notification_recipient_cursor'))[0].position,1);
  globalThis.fetch=async()=>Response.json({ok:true,result:{message_id:91}});
  await Promise.all([deliverMailNotifications(db,'telegram',{token:'fixture',chatId:'fixture'}),deliverMailNotifications(db,'telegram',{token:'fixture',chatId:'fixture'})]);
  const [n]=await db.all("SELECT * FROM mail_notifications WHERE channel='telegram'");assert.equal(n.receipt,'91');assert.equal(n.attempts,1);assert.equal(n.status,'sent');
 }finally{globalThis.fetch=original;await mf.dispose()}
});
