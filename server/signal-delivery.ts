import { notificationMessage } from './notification-message.js';
import { routingSelect } from './lead-routing.js';
import type { ReceptionDB } from './reception.js';
import { ensureNotificationRecipient, leadRoutedRecipient } from './notification-recipient.js';
import { dispatchReadySql } from './manual-lead-dispatch.js';
export type SignalSettings={url:string;secret:string;appUrl:string};
const hex=(buffer:ArrayBuffer)=>Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
export async function relayRequest(settings:SignalSettings,path:'/v1/status'|'/v1/messages',input?:unknown){
 const url=new URL(settings.url);if(settings.secret.length<32||url.protocol!=='https:'||url.port||url.username||url.password||url.search||url.hash||url.pathname!=='/'||!url.hostname.endsWith('.up.railway.app'))throw Error('invalid_signal_endpoint');
 const body=input?JSON.stringify(input):'',time=String(Date.now()),nonce=crypto.randomUUID(),method=input?'POST':'GET';
 const encoder=new TextEncoder(),digest=hex(await crypto.subtle.digest('SHA-256',encoder.encode(body)));
 const key=await crypto.subtle.importKey('raw',encoder.encode(settings.secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=hex(await crypto.subtle.sign('HMAC',key,encoder.encode([time,nonce,method,path,digest].join('\n'))));
 const response=await fetch(url.origin+path,{method,headers:{'Content-Type':'application/json','x-eucove-time':time,'x-eucove-nonce':nonce,'x-eucove-signature':signature},body:body||undefined,signal:AbortSignal.timeout(20000),redirect:'manual'});
 if(response.status>=300&&response.status<400)throw Error('signal_redirect_refused');
 return response;
}
export const signalQueueSql=`INSERT INTO signal_notifications(id,lead_id,next_attempt) SELECT ?,l.id,? FROM leads l JOIN notification_channels c ON c.channel='signal' AND c.enabled=1 AND l.created_at>=c.enabled_at WHERE l.request_id=? AND l.request_hash=? AND ?=1 ON CONFLICT(lead_id) DO NOTHING`;
export const signalStatusSelect=`(SELECT json_object('status',s.status,'syncStatus',CASE WHEN s.status<>'sent' THEN s.status WHEN s.revision<=s.delivered_revision THEN 'synced' WHEN s.edit_attempts>=5 THEN 'failed' ELSE 'pending' END,'attempts',s.attempts,'revision',s.revision,'deliveredRevision',s.delivered_revision,'editAttempts',s.edit_attempts,'receipt',s.receipt,'sentAt',s.sent_at,'error',s.last_error) FROM signal_notifications s WHERE s.lead_id=l.id) AS signal_json`;
export async function deliverSignal(db:ReceptionDB,settings:SignalSettings,limit=5){
 let now=Date.now();
 await db.batch([{sql:"UPDATE signal_notifications SET status='failed' WHERE status='pending' AND attempts>=5 AND claimed_until<=?",args:[now]}]);
 const eligible=`((n.status='pending' AND n.attempts<5 AND n.next_attempt<=?) OR (n.status='sent' AND n.revision>n.delivered_revision AND n.edit_attempts<5 AND n.edit_next_attempt<=?)) AND ${dispatchReadySql('lead','n.lead_id')}`;
 const rows=await db.all(`SELECT n.id FROM signal_notifications n WHERE ${eligible} AND n.claimed_until<=? ORDER BY n.rowid LIMIT ?`,[now,now,now,limit]);
 for(const item of rows){
  now=Date.now();const token=crypto.randomUUID();
  const claim=await db.all(`UPDATE signal_notifications AS n SET claimed_until=?,claim_token=?,attempts=attempts+CASE WHEN status='pending' THEN 1 ELSE 0 END,edit_attempts=edit_attempts+CASE WHEN status='sent' THEN 1 ELSE 0 END WHERE id=? AND ${eligible} AND claimed_until<=? RETURNING *`,[now+90000,token,item.id,now,now,now]);if(!claim.length)continue;
  const row=(await db.all(`SELECT n.*,l.city,l.service,l.data,l.created_at,o.name AS owner_name,o.contact AS owner_contact,${routingSelect} FROM signal_notifications n JOIN leads l ON l.id=n.lead_id JOIN owners o ON o.id=l.owner_id WHERE n.id=? AND n.claim_token=?`,[item.id,token]))[0];if(!row)continue;
  row.reception_recipient=await ensureNotificationRecipient(db,'lead',row.lead_id,leadRoutedRecipient(row as any));
  let success=false,uncertain=false,permanent=false,receipt:number|null=null,reason='network',rateUntil=0;
  const revision=Number(row.revision),editing=row.status==='sent',attempt=Number(editing?row.edit_attempts:row.attempts);
  try{
   const response=await relayRequest(settings,'/v1/messages',{id:row.id,revision,text:notificationMessage(row as any,settings.appUrl)});
   const body=await response.json() as {ok?:boolean;timestamp?:number;error?:string};
   success=response.ok&&body.ok===true&&Number.isSafeInteger(body.timestamp);receipt=success?body.timestamp!:null;
   uncertain=response.status===409&&body.error==='delivery_uncertain';permanent=response.status===409&&body.error==='idempotency_conflict';reason=uncertain?'delivery_uncertain':permanent?'idempotency_conflict':`relay_${response.status}`;
   if(response.status===429)rateUntil=Date.now()+Math.min(300,Math.max(5,Number(response.headers.get('Retry-After'))||30))*1000;
  }catch{/* No customer content, relay secrets, or remote text in logs. */}
  const fence="claimed_until=0,claim_token='' WHERE id=? AND claim_token=?";
  if(success)await db.batch([{sql:`UPDATE signal_notifications SET status='sent',receipt=?,sent_at=COALESCE(sent_at,?),delivered_revision=?,last_error='',${fence}`,args:[receipt,new Date().toISOString(),revision,item.id,token]}]);
  else if(uncertain||permanent)await db.batch([{sql:`UPDATE signal_notifications SET status=?,last_error=?,${fence}`,args:[uncertain?'uncertain':'failed',reason,item.id,token]}]);
  else{const next=rateUntil||Date.now()+Math.min(3600000,30000*2**attempt);await db.batch([{sql:editing?`UPDATE signal_notifications SET edit_next_attempt=?,last_error=?,${fence}`:`UPDATE signal_notifications SET status=?,next_attempt=?,last_error=?,${fence}`,args:editing?[next,reason,item.id,token]:[attempt>=5?'failed':'pending',next,reason,item.id,token]}]);if(rateUntil)break;}
 }
}
