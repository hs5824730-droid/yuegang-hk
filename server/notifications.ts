import {deliverRegistrationNotifications} from './registration-notifications.js';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { db,transaction } from './db.js';
import { deliverOutbox } from './notification-delivery.js';
import {deliverSignal,signalQueueSql} from './signal-delivery.js';
import {deliverDirectContacts} from './direct-contact-notifications.js';
import {runMailWorker} from './mail-worker.js';
import {syncDispatchTelegram} from './manual-lead-dispatch.js';
export const telegramConfigured=()=>Boolean(config.telegramToken&&config.telegramChatId);
export function queueNotification(leadId:string){
 db.prepare('INSERT INTO notifications(id,lead_id,sync_enabled) VALUES(?,?,1) ON CONFLICT(lead_id) DO NOTHING').run(randomUUID(),leadId);
 const row=db.prepare('SELECT request_id,request_hash FROM leads WHERE id=?').get(leadId) as {request_id:string;request_hash:string};
 db.prepare(signalQueueSql).run(randomUUID(),Date.now()+2000,row.request_id,row.request_hash,process.env.SIGNAL_ENABLED==='true'?1:0);
}
let busy=false;
export async function deliverNotifications(){
 if(busy)return;busy=true;
 const adapter={all:async(sql:string,args:unknown[]=[])=>db.prepare(sql).all(...args as any[]) as any[],batch:async(qs:{sql:string;args:unknown[]}[])=>{transaction(()=>{for(const q of qs)db.prepare(q.sql).run(...q.args as any[]);});}};
 try{const results=await Promise.allSettled([
  deliverRegistrationNotifications(adapter,{telegram:telegramConfigured()?{token:config.telegramToken,chatId:config.telegramChatId}:undefined,signal:process.env.SIGNAL_ENABLED==='true'&&process.env.SIGNAL_RELAY_URL&&process.env.SIGNAL_RELAY_SECRET?{url:process.env.SIGNAL_RELAY_URL,secret:process.env.SIGNAL_RELAY_SECRET,appUrl:config.appUrl}:undefined}),

  runMailWorker(adapter,process.env,telegramConfigured()?{token:config.telegramToken,chatId:config.telegramChatId}:undefined,process.env.SIGNAL_ENABLED==='true'&&process.env.SIGNAL_RELAY_URL&&process.env.SIGNAL_RELAY_SECRET?{url:process.env.SIGNAL_RELAY_URL,secret:process.env.SIGNAL_RELAY_SECRET,appUrl:config.appUrl}:undefined),
  telegramConfigured()?deliverOutbox(adapter,{token:config.telegramToken,chatId:config.telegramChatId,appUrl:config.appUrl}):Promise.resolve(),
  process.env.SIGNAL_ENABLED==='true'&&process.env.SIGNAL_RELAY_URL&&process.env.SIGNAL_RELAY_SECRET?deliverSignal(adapter,{url:process.env.SIGNAL_RELAY_URL,secret:process.env.SIGNAL_RELAY_SECRET,appUrl:config.appUrl}):Promise.resolve(),
  process.env.PUBLIC_DIRECT_CONTACT_ENABLED!=='false'&&telegramConfigured()?deliverDirectContacts(adapter,'telegram',{token:config.telegramToken,chatId:config.telegramChatId}):Promise.resolve(),
  process.env.PUBLIC_DIRECT_CONTACT_ENABLED!=='false'&&process.env.SIGNAL_ENABLED==='true'&&process.env.SIGNAL_RELAY_URL&&process.env.SIGNAL_RELAY_SECRET?deliverDirectContacts(adapter,'signal',{url:process.env.SIGNAL_RELAY_URL,secret:process.env.SIGNAL_RELAY_SECRET,appUrl:config.appUrl}):Promise.resolve(),
 ]);results.forEach((result,index)=>{if(result.status==='rejected')console.error(JSON.stringify({event:'notification_channel_worker_error',channel:index%2===0?'telegram':'signal',source:index<2?'enquiry':'direct'}));});
 if(telegramConfigured())await syncDispatchTelegram(adapter,{token:config.telegramToken,chatId:config.telegramChatId});
 }finally{busy=false;}
}
