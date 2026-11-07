import {syncMail,deliverMailNotifications} from './enterprise-mail.js';
import type {ReceptionDB} from './reception.js';
import type {MailEnv} from './zoho-mail.js';
import type {SignalSettings} from './signal-delivery.js';
export async function runMailWorker(db:ReceptionDB,env:MailEnv,telegram?:{token:string;chatId:string},signal?:SignalSettings){
 if(env.MAIL_ENABLED!=='true')return;
 const channels:('telegram'|'signal')[]=[];
 if(telegram)channels.push('telegram');if(signal)channels.push('signal');
 try{await syncMail(db,env,channels);}catch{console.error(JSON.stringify({event:'mail_sync_failed'}));}
 const results=await Promise.allSettled(channels.map(channel=>deliverMailNotifications(db,channel,{...telegram,signal})));
 for(const result of results)if(result.status==='rejected')console.error(JSON.stringify({event:'mail_notification_failed'}));
}
