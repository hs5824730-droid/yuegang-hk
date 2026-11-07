import {deliverRegistrationNotifications} from '../server/registration-notifications.js';
import type { AppEnv } from './env';
import { deliverOutbox } from '../server/notification-delivery';
import { deliverSignal, type SignalSettings } from '../server/signal-delivery';
import {deliverDirectContacts} from '../server/direct-contact-notifications';
import {runMailWorker} from '../server/mail-worker';
import {syncDispatchTelegram} from '../server/manual-lead-dispatch';
export const signalSettings=(env:AppEnv):SignalSettings=>({url:env.SIGNAL_RELAY_URL||'',secret:env.SIGNAL_RELAY_SECRET||'',appUrl:env.APP_URL});
export const telegramConfigured=(env:AppEnv)=>env.DISABLE_TELEGRAM!=='true'&&Boolean(env.TELEGRAM_BOT_TOKEN&&env.TELEGRAM_CHAT_ID);
export async function deliverNotifications(env:AppEnv,limit=5){
 const db={all:async(sql:string,args:unknown[]=[]) =>(await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results,batch:async(qs:{sql:string;args:unknown[]}[])=>{await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args)));}};
 const results=await Promise.allSettled([
  deliverRegistrationNotifications(db,{telegram:telegramConfigured(env)?{token:env.TELEGRAM_BOT_TOKEN!,chatId:env.TELEGRAM_CHAT_ID!}:undefined,signal:env.SIGNAL_ENABLED==='true'&&env.SIGNAL_RELAY_URL&&env.SIGNAL_RELAY_SECRET?signalSettings(env):undefined},limit),

  runMailWorker(db,env,telegramConfigured(env)?{token:env.TELEGRAM_BOT_TOKEN!,chatId:env.TELEGRAM_CHAT_ID!}:undefined,env.SIGNAL_ENABLED==='true'&&env.SIGNAL_RELAY_URL&&env.SIGNAL_RELAY_SECRET?signalSettings(env):undefined),
  telegramConfigured(env)?deliverOutbox(db,{token:env.TELEGRAM_BOT_TOKEN!,chatId:env.TELEGRAM_CHAT_ID!,appUrl:env.APP_URL},limit):Promise.resolve(),
  env.SIGNAL_ENABLED==='true'&&env.SIGNAL_RELAY_URL&&env.SIGNAL_RELAY_SECRET?deliverSignal(db,signalSettings(env),limit):Promise.resolve(),
  env.PUBLIC_DIRECT_CONTACT_ENABLED!=='false'&&telegramConfigured(env)?deliverDirectContacts(db,'telegram',{token:env.TELEGRAM_BOT_TOKEN!,chatId:env.TELEGRAM_CHAT_ID!},limit):Promise.resolve(),
  env.PUBLIC_DIRECT_CONTACT_ENABLED!=='false'&&env.SIGNAL_ENABLED==='true'&&env.SIGNAL_RELAY_URL&&env.SIGNAL_RELAY_SECRET?deliverDirectContacts(db,'signal',signalSettings(env),limit):Promise.resolve(),
 ]);
 results.forEach((result,index)=>{if(result.status==='rejected')console.error(JSON.stringify({event:'notification_channel_worker_error',channel:index%2===0?'telegram':'signal',source:index<2?'enquiry':'direct'}));});
 if(telegramConfigured(env))await syncDispatchTelegram(db,{token:env.TELEGRAM_BOT_TOKEN!,chatId:env.TELEGRAM_CHAT_ID!},limit);
}
