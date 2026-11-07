import type {ReceptionDB} from './reception.js';
import {notificationBeijingTime,notificationLine} from './notification-message.js';
import {dispatchPresentation,recordDispatchTelegram} from './manual-lead-dispatch.js';
import {relayRequest,type SignalSettings} from './signal-delivery.js';
import {ADVISORY_NEEDS,INTAKE_TYPES} from '../src/customer-registration.js';
import {REGISTRATION_SERVICES} from '../src/rental-registration.js';

type Settings={telegram?:{token:string;chatId:string};signal?:SignalSettings};
const cities:Record<string,string>={Sydney:'悉尼',Melbourne:'墨尔本',Brisbane:'布里斯班',Perth:'珀斯',Adelaide:'阿德莱德',Canberra:'堪培拉','Gold Coast':'黄金海岸'};
export function registrationNotificationText(row:Record<string,any>){
 const d=JSON.parse(row.data),rental=row.source_type==='rental';
 const method=rental?'phone':d.contactMethod;
 const contact=rental?d.phone:d.contact;
 const type=rental?'出租与托管':INTAKE_TYPES[d.type as keyof typeof INTAKE_TYPES]?.[0]||'客户登记';
 const services=rental?(d.services||[]).map((key:keyof typeof REGISTRATION_SERVICES)=>REGISTRATION_SERVICES[key]?.[0]).filter(Boolean).join('、'):d.type==='advisory'?ADVISORY_NEEDS[d.details?.service as keyof typeof ADVISORY_NEEDS]?.[0]:type;
 return [
  `【客户姓名】${notificationLine(d.name,100)||'未提供'}`,
  `【联系电话】${['phone','whatsapp'].includes(method)?notificationLine(contact)||'未提供':'未提供'}`,
  `【房屋所在城市】${notificationLine(cities[row.city]||row.city,80)||'未提供'}`,
  `分组：${type}`,`类型：${notificationLine(services,300)||type}`,
  '',`联系方式种类：${({phone:'电话',whatsapp:'WhatsApp',wechat:'微信',email:'邮箱'} as Record<string,string>)[method]||'未提供'}`,
  ...(['wechat','email'].includes(method)?[`联系方式：${notificationLine(contact)}`]:[]),
  '分流渠道：未自动分流','分配目标：等待主动分配','分流名称：未设置',
  `接粉人员：${row.recipient?row.recipient+'（'+row.recipient+'组）':'待你选择'}`,
  `北京时间：${notificationBeijingTime(row.created_at)}`,
 ].join('\n');
}

/** Independent per-transport leases. Telegram ambiguity is held, Signal uses its relay ledger. */
export async function deliverRegistrationNotifications(db:ReceptionDB,settings:Settings,limit=5){
 const now=Date.now();
 // An expired Telegram claim may already have sent: never blindly send it again.
 await db.batch([{sql:"UPDATE registration_notifications SET tg_status='uncertain',tg_error='delivery_unknown',tg_claim='',tg_claimed_until=0 WHERE tg_status='pending' AND tg_claim<>'' AND tg_claimed_until<=?",args:[now]}]);
 for(const channel of ['tg','signal'] as const){
  if(channel==='tg'&&!settings.telegram||channel==='signal'&&!settings.signal)continue;
  const ready=channel==='signal'?" AND tg_status='sent' AND selected_at IS NOT NULL AND recipient IN ('江承裕','江牧','江鹏')":'';
  const eligible=`${channel}_status='pending' AND ${channel}_attempts<5 AND ${channel}_next_attempt<=? AND ${channel}_claimed_until<=?${ready}`;
  const rows=await db.all(`SELECT id FROM registration_notifications WHERE ${eligible} ORDER BY created_at LIMIT ?`,[Date.now(),Date.now(),limit]);
  for(const item of rows){
   const token=crypto.randomUUID(),time=Date.now();
   const [row]=await db.all(`UPDATE registration_notifications SET ${channel}_claim=?,${channel}_claimed_until=?,${channel}_attempts=${channel}_attempts+1 WHERE id=? AND ${eligible} RETURNING *`,[token,time+90000,item.id,time,time]);
   if(!row)continue;
   let status='pending',error='network',receipt:number|null=null,retry=Date.now()+Math.min(3600000,30000*2**Number(row[channel+'_attempts']));
   try{
    if(channel==='tg'){
     // Persist the presentation before sending, so a fast callback cannot race the message receipt.
     const presentation=await dispatchPresentation(db,'registration',row.source_id,registrationNotificationText(row));
     const response=await fetch(`https://api.telegram.org/bot${settings.telegram!.token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:settings.telegram!.chatId,...presentation,link_preview_options:{is_disabled:true}}),signal:AbortSignal.timeout(15000)});
     const body=await response.json() as any;
     if(response.ok&&body.ok===true&&Number.isSafeInteger(body.result?.message_id)){status='sent';error='';receipt=body.result.message_id;await recordDispatchTelegram(db,'registration',row.source_id,receipt);}
     else if(response.status===429){error='rate_limited';retry=Date.now()+Math.min(86400,Math.max(30,Number(body.parameters?.retry_after)||60))*1000;}
     else if(response.status>=500){status='uncertain';error='delivery_unknown';}
     else {status='failed';error='telegram_'+response.status;}
    }else{
     const response=await relayRequest(settings.signal!,'/v1/messages',{id:`${row.id.slice(0,8)}-${row.id.slice(8,12)}-4${row.id.slice(13,16)}-8${row.id.slice(17,20)}-${row.id.slice(20,32)}`,revision:0,text:registrationNotificationText(row)});
     const body=await response.json() as any;
     if(response.ok&&body.ok===true&&Number.isSafeInteger(body.timestamp)){status='sent';error='';receipt=body.timestamp;}
     else if(response.status===409){status=body.error==='delivery_uncertain'?'uncertain':'failed';error='relay_conflict';}
     else if(response.status===429){error='rate_limited';retry=Date.now()+Math.min(300,Math.max(5,Number(response.headers.get('Retry-After'))||30))*1000;}
     else error='relay_'+response.status;
    }
   }catch{if(channel==='tg'){status='uncertain';error='delivery_unknown';}}
   if(status==='pending'&&Number(row[channel+'_attempts'])>=5)status='failed';
   await db.batch([{sql:`UPDATE registration_notifications SET ${channel}_status=?,${channel}_error=?,${channel}_next_attempt=?,${channel}_claimed_until=0,${channel}_claim='',${channel==='tg'?'telegram_message_id':'signal_receipt'}=COALESCE(?,${channel==='tg'?'telegram_message_id':'signal_receipt'}),${channel}_sent_at=CASE WHEN ?='sent' THEN ? ELSE ${channel}_sent_at END WHERE id=? AND ${channel}_claim=?`,args:[status,error,retry,receipt,status,new Date().toISOString(),row.id,token]}]);
   if(error==='rate_limited')break;
  }
 }
}
