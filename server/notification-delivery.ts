import { notificationMessage } from './notification-message.js';
import { routingSelect } from './lead-routing.js';
import type { ReceptionDB } from './reception.js';
import { ensureNotificationRecipient, leadRoutedRecipient } from './notification-recipient.js';
import { dispatchPresentation, recordDispatchTelegram } from './manual-lead-dispatch.js';

export async function deliverOutbox(db: ReceptionDB, settings: { token:string;chatId:string;appUrl:string }, limit=5) {
  let now=Date.now();
  await db.batch([{sql:"UPDATE notifications SET status='failed',claim_token='',claimed_until=0 WHERE status='pending' AND attempts>=5 AND claimed_until<=?",args:[now]}]);
  const eligible="((n.status='pending' AND n.attempts<5 AND n.next_attempt<=?) OR (n.status='sent' AND n.sync_enabled=1 AND n.message_id IS NOT NULL AND n.revision>n.delivered_revision AND n.edit_attempts<5 AND n.edit_next_attempt<=?))";
  const rows=await db.all(`SELECT n.id FROM notifications n WHERE ${eligible} AND n.claimed_until<=? ORDER BY n.rowid LIMIT ?`,[now,now,now,limit]);
  for(const item of rows){
    now=Date.now();const token=crypto.randomUUID();
    const claim=await db.all(`UPDATE notifications AS n SET claimed_until=?,claim_token=?,attempts=attempts+CASE WHEN status='pending' THEN 1 ELSE 0 END,edit_attempts=edit_attempts+CASE WHEN status='sent' THEN 1 ELSE 0 END WHERE id=? AND ${eligible} AND claimed_until<=? RETURNING *`,[now+60000,token,item.id,now,now,now]);
    if(!claim.length)continue;
    const row=(await db.all(`SELECT n.*,l.city,l.service,l.data,l.created_at,o.name AS owner_name,o.contact AS owner_contact,${routingSelect} FROM notifications n JOIN leads l ON l.id=n.lead_id JOIN owners o ON o.id=l.owner_id WHERE n.id=? AND n.claim_token=?`,[item.id,token]))[0];
    if(!row)continue;
    row.reception_recipient=await ensureNotificationRecipient(db,'lead',row.lead_id,leadRoutedRecipient(row as any));
    const editing=row.status==='sent', revision=Number(row.revision),attempt=Number(editing?row.edit_attempts:row.attempts);
    let success=false,reason='network',rateUntil=0,messageId:number|null=null;
    try{
      const response=await fetch(`https://api.telegram.org/bot${settings.token}/${editing?'editMessageText':'sendMessage'}`,{
        method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(12000),
        body:JSON.stringify({chat_id:settings.chatId,...(editing?{message_id:row.message_id}:{}),...await dispatchPresentation(db,'lead',row.lead_id,notificationMessage(row as any,settings.appUrl)),link_preview_options:{is_disabled:true}}),
      });
      const body=await response.json() as {ok?:boolean;error_code?:number;description?:string;result?:{message_id?:number};parameters?:{retry_after?:number}};
      success=response.ok&&body.ok===true||editing&&body.error_code===400&&Boolean(body.description?.includes('message is not modified'));
      messageId=Number.isSafeInteger(body.result?.message_id)?body.result!.message_id!:null;
      reason=body.error_code?`telegram_${body.error_code}`:`http_${response.status}`;
      if(response.status===429||body.error_code===429){const seconds=body.parameters?.retry_after;rateUntil=Date.now()+(typeof seconds==='number'&&Number.isFinite(seconds)?Math.min(86400,Math.max(30,seconds)):60)*1000;}
    }catch{/* Never log token URLs, customer data, or remote error text. */}
    const fence=' WHERE id=? AND claim_token=?';
    const clear="claimed_until=0,claim_token=''";
    if(success){
      await recordDispatchTelegram(db,'lead',row.lead_id,editing?Number(row.message_id):messageId);
      await db.batch([{sql:editing?`UPDATE notifications SET delivered_revision=?,edit_error='',${clear}${fence}`:`UPDATE notifications SET status='sent',message_id=?,delivered_revision=?,last_error='',sent_at=?,${clear}${fence}`,args:editing?[revision,item.id,token]:[messageId,revision,new Date().toISOString(),item.id,token]}]);
    }else{
      const next=rateUntil||Date.now()+Math.min(3600000,30000*2**attempt);
      await db.batch([{sql:editing?`UPDATE notifications SET edit_error=?,edit_next_attempt=?,${clear}${fence}`:`UPDATE notifications SET status=?,last_error=?,next_attempt=?,${clear}${fence}`,args:editing?[reason,next,item.id,token]:[attempt>=5?'failed':'pending',reason,next,item.id,token]}]);
      if(rateUntil){await db.batch([{sql:"UPDATE notifications SET next_attempt=MAX(next_attempt,?),edit_next_attempt=MAX(edit_next_attempt,?) WHERE status IN ('pending','sent')",args:[rateUntil,rateUntil]}]);break;}
    }
  }
}
