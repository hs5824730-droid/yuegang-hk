import {notificationBeijingTime,notificationLine} from './notification-message.js';
import {SERVICES,SERVICE_GROUPS,type Service} from '../src/enquiry-options.js';
import {relayRequest,type SignalSettings} from './signal-delivery.js';
import type {ReceptionDB} from './reception.js';
import {ensureNotificationRecipient,recipientFromTarget,notificationRecipientLabel} from './notification-recipient.js';
import {dispatchReadySql,dispatchPresentation,recordDispatchTelegram} from './manual-lead-dispatch.js';

const cityNames:Record<string,string>={'Hong Kong Island':'港島',Kowloon:'九龍','New Territories':'新界',Islands:'離島',other:'其他地區'};
/** Source facts only: an assigned staff number can never become the visitor's telephone. */
export function directContactMessage(row:Record<string,any>){
 const context=JSON.parse(row.direct_context||'{}'),target=row.target_data?JSON.parse(row.target_data):null;
 const service=SERVICES[context.service as Service];
 const name=target&&(notificationLine(target.displayName,80)||notificationLine(target.originalName,80)||notificationLine(target.originalFileName,160));
 const outcome=target?'assigned':row.routing_scope==='city'?'no_city_match':'unconfigured';
 const method=context.contactMethod||row.channel;
 const status=target?row.actions>0?(method==='phone'?'已发起拨号':method==='whatsapp'?'已发起跳转':'二维码已显示'):'已分配':outcome==='no_city_match'?'该城暂无可用接待':'暂无可用接待';
 return ['联系来源：网站直接联系','【客户姓名】未提供','【联系电话】未提供',
  `【房屋所在城市】${notificationLine(cityNames[context.city||row.routing_city]||context.city||row.routing_city,80)||'未选择'}`,
  `分组：${service?SERVICE_GROUPS[service.group].zh:'未选择'}`,`类型：${service?.zh||'未选择'}`,'',
  `联系方式种类：${method==='phone'?'电话':method==='whatsapp'?'WhatsApp':'微信'}`,
  `分流渠道：${method==='phone'?'电话（WhatsApp号码池）':method==='whatsapp'?'WhatsApp':'微信'}`,
  `分配目标：${target?row.channel==='whatsapp'?notificationLine(target.value):'微信二维码':'未分配'}`,
  `分流名称：${name||'未设置'}`,
  `接粉人员：${notificationLine(notificationRecipientLabel(row.reception_recipient),100)}`,
  `动作状态：${status}`,
  `北京时间：${notificationBeijingTime(row.created_at)}`].join('\n');
}

type TelegramSettings={token:string;chatId:string};
/** Independent durable transport rows. No business leads/owners or existing lead queues are used. */
export async function deliverDirectContacts(db:ReceptionDB,transport:'telegram'|'signal',settings:TelegramSettings|SignalSettings,limit=5){
 let now=Date.now();
 // A worker may have stopped after Telegram accepted a send but before its receipt was saved.
 // Unlike the signed Signal ledger, Telegram cannot safely replay this uncertain first send.
 if(transport==='telegram')await db.batch([{sql:"UPDATE direct_contact_notifications SET status='uncertain',last_error='delivery_uncertain',claim_token='',claimed_until=0 WHERE transport='telegram' AND status='pending' AND attempts>0 AND claim_token<>'' AND claimed_until<=?",args:[now]}]);
 await db.batch([{sql:"UPDATE direct_contact_notifications SET status='failed' WHERE transport=? AND status='pending' AND attempts>=5 AND claimed_until<=?",args:[transport,now]}]);
 const eligible=`((status='pending' AND attempts<5 AND next_attempt<=?) OR (status='sent' AND receipt IS NOT NULL AND revision>delivered_revision AND edit_attempts<5 AND edit_next_attempt<=?))${transport==='signal'?' AND '+dispatchReadySql('direct','direct_contact_notifications.assignment_id'):''}`;
 const ids=await db.all(`SELECT id FROM direct_contact_notifications WHERE transport=? AND ${eligible} AND claimed_until<=? ORDER BY rowid LIMIT ?`,[transport,now,now,now,limit]);
 for(const item of ids){
  now=Date.now();const claimToken=crypto.randomUUID();
  const claimed=await db.all(`UPDATE direct_contact_notifications SET claimed_until=?,claim_token=?,attempts=attempts+CASE WHEN status='pending' THEN 1 ELSE 0 END,edit_attempts=edit_attempts+CASE WHEN status='sent' THEN 1 ELSE 0 END WHERE id=? AND transport=? AND ${eligible} AND claimed_until<=? RETURNING *`,[now+90000,claimToken,item.id,transport,now,now,now]);
  if(!claimed.length)continue;
  const row=(await db.all(`SELECT n.*,a.direct_context,a.target_data,a.routing_city,a.routing_scope,a.channel,a.created_at,((SELECT COUNT(*) FROM reception_channel_events e WHERE e.assignment_id=a.id)+(SELECT COUNT(*) FROM reception_phone_events e WHERE e.assignment_id=a.id)) AS actions FROM direct_contact_notifications n JOIN reception_channel_assignments a ON a.id=n.assignment_id WHERE n.id=? AND n.claim_token=?`,[item.id,claimToken]))[0];
  if(!row)continue;
  row.reception_recipient=await ensureNotificationRecipient(db,'direct',row.assignment_id,recipientFromTarget(row.target_data?JSON.parse(row.target_data):null));
  const editing=row.status==='sent',revision=Number(row.revision),attempt=Number(editing?row.edit_attempts:row.attempts);
  let success=false,uncertain=false,permanent=false,receipt:number|null=null,reason='network',rateUntil=0;
  try{
   const text=directContactMessage(row);
   if(transport==='signal'){
    const response=await relayRequest(settings as SignalSettings,'/v1/messages',{id:row.id,revision,text});
    const body=await response.json() as {ok?:boolean;timestamp?:number;error?:string};
    success=response.ok&&body.ok===true&&Number.isSafeInteger(body.timestamp);receipt=success?body.timestamp!:null;
    uncertain=response.status===409&&body.error==='delivery_uncertain';permanent=response.status===409&&body.error==='idempotency_conflict';
    reason=uncertain?'delivery_uncertain':permanent?'idempotency_conflict':`relay_${response.status}`;
    if(response.status===429)rateUntil=Date.now()+Math.min(300,Math.max(5,Number(response.headers.get('Retry-After'))||30))*1000;
   }else{
    const tg=settings as TelegramSettings;
    const response=await fetch(`https://api.telegram.org/bot${tg.token}/${editing?'editMessageText':'sendMessage'}`,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(12000),body:JSON.stringify({chat_id:tg.chatId,...(editing?{message_id:row.receipt}:{}),...await dispatchPresentation(db,'direct',row.assignment_id,text),link_preview_options:{is_disabled:true}})});
    // Telegram has no idempotency key. After an ambiguous initial send do not blindly retry.
    uncertain=!editing&&response.status>=500;
    const body=await response.json() as {ok?:boolean;error_code?:number;description?:string;result?:{message_id?:number};parameters?:{retry_after?:number}};
    success=response.ok&&body.ok===true&&Number.isSafeInteger(body.result?.message_id)||editing&&body.error_code===400&&Boolean(body.description?.includes('message is not modified'));
    receipt=Number.isSafeInteger(body.result?.message_id)?body.result!.message_id!:row.receipt;
    if(response.ok&&body.ok===true&&!success)uncertain=true;
    reason=body.error_code?`telegram_${body.error_code}`:`http_${response.status}`;
    if(response.status===429||body.error_code===429){uncertain=false;rateUntil=Date.now()+Math.min(86400,Math.max(30,Number(body.parameters?.retry_after)||60))*1000;}
   }
  }catch{uncertain=transport==='telegram'&&!editing;reason=uncertain?'delivery_uncertain':'network';/* No PII, token URLs or provider text in logs. */}
  if(success&&transport==='telegram')await recordDispatchTelegram(db,'direct',row.assignment_id,editing?Number(row.receipt):receipt);
  const fence="claimed_until=0,claim_token='' WHERE id=? AND claim_token=?";
  if(success)await db.batch([{sql:`UPDATE direct_contact_notifications SET status='sent',receipt=?,sent_at=COALESCE(sent_at,?),delivered_revision=?,last_error='',${fence}`,args:[receipt,new Date().toISOString(),revision,item.id,claimToken]}]);
  else if(uncertain||permanent)await db.batch([{sql:`UPDATE direct_contact_notifications SET status=?,last_error=?,${fence}`,args:[uncertain?'uncertain':'failed',uncertain?'delivery_uncertain':reason,item.id,claimToken]}]);
  else{
   const next=rateUntil||Date.now()+Math.min(3600000,30000*2**attempt);
   await db.batch([{sql:editing?`UPDATE direct_contact_notifications SET last_error=?,edit_next_attempt=?,${fence}`:`UPDATE direct_contact_notifications SET status=?,last_error=?,next_attempt=?,${fence}`,args:editing?[reason,next,item.id,claimToken]:[attempt>=5?'failed':'pending',reason,next,item.id,claimToken]}]);
   if(rateUntil){await db.batch([{sql:'UPDATE direct_contact_notifications SET next_attempt=MAX(next_attempt,?),edit_next_attempt=MAX(edit_next_attempt,?) WHERE transport=?',args:[rateUntil,rateUntil,transport]}]);break;}
  }
 }
}
