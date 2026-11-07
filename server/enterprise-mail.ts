import { z } from 'zod';
import { MAIL_ADDRESS, MAIL_STAFF } from '../src/mail-types.js';
import { ReceptionError, type ReceptionDB } from './reception.js';
import type { User } from './schema.js';
import { leadRoutedRecipient } from './notification-recipient.js';
import { routingSelect } from './lead-routing.js';
import { notificationLine, notificationBeijingTime } from './notification-message.js';
import { mailConfigured, MailProviderError, mailPlainText, ZohoMail, type MailEnv, type ProviderMessage } from './zoho-mail.js';
import { relayRequest, type SignalSettings } from './signal-delivery.js';
import { dispatchReadySql, dispatchPresentation, recordDispatchTelegram } from './manual-lead-dispatch.js';

export const mailStaffName=(user:User)=>MAIL_STAFF.find(s=>s.email===user.email.toLowerCase())?.name||'';
export function requireMailUser(user:User){if(user.role!=='admin'&&!mailStaffName(user))throw new ReceptionError(403,'此账号没有邮件处理权限');}
async function ownThread(db:ReceptionDB,user:User,id:string){
 requireMailUser(user);
 const [thread]=await db.all('SELECT * FROM mail_threads WHERE id=?',[id]);
 if(!thread||(user.role!=='admin'&&thread.recipient!==mailStaffName(user)))throw new ReceptionError(404,'邮件会话不存在或未分配给你');
 return thread;
}
export function mailNotification(message:{sender_name:string;sender_email:string;received_at:string;subject?:string;city?:string;group?:string},recipient:string){
 return [`【客户姓名】${notificationLine(message.sender_name,100)||'未提供'}`,`【客户邮箱】${notificationLine(message.sender_email,160)}`,`主题：${notificationLine(message.subject,180)||'（无主题）'}`,
  ...(message.city?[`房屋所在城市：${notificationLine(message.city,80)}`]:[]),`接粉人员：${notificationLine(recipient,80)||'未分配'}`,`接待组：${notificationLine(message.group,80)||(MAIL_STAFF.some(s=>s.name===recipient)?recipient+'组':'未分配')}`,`北京时间：${notificationBeijingTime(message.received_at)}`].join('\n');
}
async function savedRecipient(db:ReceptionDB,email:string){
 const rows=await db.all(`SELECT l.*,${routingSelect},n.recipient AS saved_recipient FROM leads l JOIN owners o ON o.id=l.owner_id LEFT JOIN notification_recipients n ON n.source='lead' AND n.source_id=l.id WHERE o.contact_key=? ORDER BY l.created_at DESC LIMIT 1`,['email:'+email]);
 if(!rows.length)return {recipient:'',city:''};
 const value=leadRoutedRecipient(rows[0] as any)||rows[0].saved_recipient||'';
 return {recipient:MAIL_STAFF.some(s=>s.name===value)?value:'',city:String(rows[0].city||'')};
}
export async function ingestMail(db:ReceptionDB,accountId:string,message:ProviderMessage,html:string,channels:('telegram'|'signal')[]){
 const parsed=z.email().safeParse(message.fromAddress?.trim().toLowerCase());
 if(!parsed.success||[MAIL_ADDRESS,...MAIL_STAFF.map(s=>s.email)].includes(parsed.data))return;
 if(!message.messageId||!Number.isFinite(Number(message.receivedTime)))return;
 const email=parsed.data,receivedAt=new Date(Number(message.receivedTime)).toISOString();
 const providerThread=message.threadId&&message.threadId!=='0'?message.threadId:message.messageId;
 // A provider conversation ID is authoritative; subjects and display names never join conversations.
 const threadId=accountId+':'+providerThread;
 const messageId=accountId+':'+message.messageId;
 if((await db.all('SELECT id FROM mail_messages WHERE id=?',[messageId])).length)return;
 const context=await savedRecipient(db,email),recipient=context.recipient;
 await db.batch([
  {sql:"INSERT INTO mail_threads(id,account_id,provider_thread_id,subject,sender_email,sender_name,recipient,created_at,updated_at) VALUES(?,?,?,?,?,?,CASE WHEN (SELECT enabled FROM lead_dispatch_settings WHERE id=1)=1 THEN '' ELSE ? END,?,?) ON CONFLICT(account_id,provider_thread_id) DO NOTHING",args:[threadId,accountId,providerThread,notificationLine(message.subject,300)||'（无主题）',email,notificationLine(message.sender,100),recipient,receivedAt,receivedAt]},
  {sql:'INSERT INTO mail_messages(id,thread_id,account_id,provider_message_id,folder_id,sender_email,sender_name,subject,body,received_at,has_attachment) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id,provider_message_id) DO NOTHING',args:[messageId,threadId,accountId,message.messageId,message.folderId,email,notificationLine(message.sender,100),notificationLine(message.subject,300)||'（无主题）',mailPlainText(html),receivedAt,Number(message.hasAttachment)>0?1:0]},
  // Queue creation is in the same transaction as intake. Notification text uses the durable owner.
  ...channels.map(channel=>({sql:`INSERT INTO mail_notifications(id,message_id,channel,text) SELECT ?,m.id,?,json_object('sender_name',m.sender_name,'sender_email',m.sender_email,'received_at',m.received_at,'subject',m.subject,'city',?,'recipient',t.recipient,'group',CASE WHEN t.recipient IN ('江承裕','江牧','江鹏') THEN t.recipient||'组' ELSE '' END) FROM mail_messages m JOIN mail_threads t ON t.id=m.thread_id WHERE m.id=? ON CONFLICT(message_id,channel) DO NOTHING`,args:[crypto.randomUUID(),channel,context.city,messageId]})),
 ]);
}
export async function syncMail(db:ReceptionDB,env:MailEnv,channels:('telegram'|'signal')[],provider=new ZohoMail(env)){
 if(env.MAIL_ENABLED!=='true'||!mailConfigured(env))return {enabled:false};
 if(!env.MAIL_START_AT||!Number.isFinite(Date.parse(env.MAIL_START_AT)))throw new MailProviderError('mail_start_time_required');
 // Future activation must not poll the provider or inspect historical mail before cutover.
 if(Date.parse(env.MAIL_START_AT)>Date.now())return {enabled:true,pendingStart:true};
 const accountId=env.ZOHO_ACCOUNT_ID!,now=Date.now(),token=crypto.randomUUID();
 await db.batch([{sql:'INSERT INTO mail_sync(account_id,started_at) VALUES(?,?) ON CONFLICT(account_id) DO NOTHING',args:[accountId,new Date(env.MAIL_START_AT).toISOString()]}]);
 const [state]=await db.all('UPDATE mail_sync SET lease_until=?,claim_token=? WHERE account_id=? AND lease_until<? AND checked_at<? RETURNING *',[now+240000,token,accountId,now,now-300000]);
 if(!state)return {busy:true};
 try{
  await provider.verifyIdentity();
  const folders=new Set((await provider.folders()).filter(f=>['Inbox','Archive'].includes(f.folderType)).map(f=>String(f.folderId)));
  const floor=Math.max(Date.parse(state.started_at),Number(state.watermark)-3600000);
  let newest=Number(state.watermark),complete=false,imported=0;
  for(let page=0;page<10;page++){
   const list=await provider.list(page*200+1);
   if(!Array.isArray(list))throw new MailProviderError('mail_invalid_response');
   for(const message of [...list].reverse()){
    const time=Number(message.receivedTime);
    if(!Number.isFinite(time)||time<floor||!folders.has(String(message.folderId)))continue;
    if((await db.all('SELECT id FROM mail_messages WHERE account_id=? AND provider_message_id=?',[accountId,String(message.messageId)])).length)continue;
    const content=await provider.content(String(message.folderId),String(message.messageId));
    await ingestMail(db,accountId,message,content,channels);newest=Math.max(newest,time);imported++;
   }
   if(list.length<200||list.some(m=>Number(m.receivedTime)<floor)){complete=true;break;}
  }
  if(!complete)throw new MailProviderError('mail_backlog_needs_review');
  await db.batch([{sql:"UPDATE mail_sync SET watermark=?,checked_at=?,lease_until=0,claim_token='',last_error='' WHERE account_id=? AND claim_token=?",args:[newest,Date.now(),accountId,token]}]);
  return {imported};
 }catch(error){
  const reason=error instanceof MailProviderError?error.code:'mail_sync_failed';
  await db.batch([{sql:"UPDATE mail_sync SET checked_at=?,lease_until=0,claim_token='',last_error=? WHERE account_id=? AND claim_token=?",args:[Date.now(),reason,accountId,token]}]);
  throw new MailProviderError(reason);
 }
}
export async function deliverMailNotifications(db:ReceptionDB,channel:'telegram'|'signal',settings:{token?:string;chatId?:string;signal?:SignalSettings},limit=5){
 if(channel==='telegram'&&(!settings.token||!settings.chatId)||channel==='signal'&&!settings.signal)return;
 const now=Date.now();
 // Telegram has no idempotent send API. An interrupted send must be reviewed, never blindly repeated.
 // Signal reuses the same durable relay ID after interrupted requests, so its receipt ledger fences retries.
 await db.batch([{sql:"UPDATE mail_notifications SET status=?,last_error='send_interrupted',claimed_until=0,claim_token='' WHERE channel=? AND status='sending' AND claimed_until<=?",args:[channel==='telegram'?'uncertain':'pending',channel,now]}]);
 await db.batch([{sql:"UPDATE mail_notifications SET status='failed' WHERE channel=? AND status='pending' AND attempts>=5 AND claimed_until<=?",args:[channel,now]}]);
 const ready=channel==='signal'?' AND '+dispatchReadySql('mail','mail_notifications.message_id'):'';
 const rows=await db.all(`SELECT id FROM mail_notifications WHERE channel=? AND status='pending' AND attempts<5 AND next_attempt<=? AND claimed_until<?${ready} ORDER BY rowid LIMIT ?`,[channel,now,now,limit]);
 for(const row of rows){
  const token=crypto.randomUUID();
  const [item]=await db.all(`UPDATE mail_notifications SET status='sending',claim_token=?,claimed_until=?,attempts=attempts+1 WHERE id=? AND status='pending' AND attempts<5 AND claimed_until<?${ready} RETURNING *`,[token,Date.now()+90000,row.id,Date.now()]);
  if(!item)continue;
  const stored=JSON.parse(item.text);
  const [dispatch]=await db.all("SELECT recipient FROM manual_lead_dispatch WHERE source='mail' AND source_id=?",[item.message_id]);
  const text=mailNotification(dispatch?{...stored,group:''}:stored,dispatch?dispatch.recipient:stored.recipient);
  let status=channel==='telegram'?'uncertain':'pending',error='network',receipt='',nextAttempt=Date.now()+Math.min(3600000,30000*2**item.attempts);
  try{
   const response=channel==='signal'?await relayRequest(settings.signal!,'/v1/messages',{id:item.id,revision:1,text}):await fetch(`https://api.telegram.org/bot${settings.token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:settings.chatId,...await dispatchPresentation(db,'mail',item.message_id,text),link_preview_options:{is_disabled:true}}),signal:AbortSignal.timeout(15000)});
   const result=await response.json() as any;
   const id=channel==='signal'?result.timestamp:result.result?.message_id;
   if(response.ok&&result.ok===true&&Number.isSafeInteger(id)){status='sent';error='';receipt=String(id);if(channel==='telegram')await recordDispatchTelegram(db,'mail',item.message_id,id);}
   else if(channel==='signal'&&response.status===409){status=result.error==='delivery_uncertain'?'uncertain':'failed';error='relay_conflict';}
   else if(response.status===429){status='pending';error='rate_limited';nextAttempt=Date.now()+Math.min(3600,Math.max(5,Number(result.parameters?.retry_after)||Number(response.headers.get('Retry-After'))||30))*1000;}
   else if(channel==='telegram'&&result.ok===false&&response.status>=400&&response.status<500){status='failed';error='delivery_'+response.status;}
   else error='delivery_'+response.status;
  }catch{/* Keep customer content and secrets out of logs. */}
  if(status==='pending'&&item.attempts>=5)status='failed';
  await db.batch([{sql:"UPDATE mail_notifications SET status=?,last_error=?,next_attempt=?,receipt=?,sent_at=?,claimed_until=0,claim_token='' WHERE id=? AND claim_token=?",args:[status,error,nextAttempt,receipt,status==='sent'?new Date().toISOString():null,item.id,token]}]);
 }
}
const replyInput=z.object({requestId:z.uuid(),version:z.number().int().nonnegative(),content:z.string().trim().min(1).max(20000)}).strict();
export async function sendMailReply(db:ReceptionDB,env:MailEnv,user:User,threadId:string,input:unknown,provider=new ZohoMail(env)){
 const thread=await ownThread(db,user,threadId),body=replyInput.parse(input);
 const [existing]=await db.all('SELECT * FROM mail_replies WHERE id=?',[body.requestId]);
 if(existing){if(existing.thread_id!==threadId||existing.user_id!==user.id||existing.content!==body.content)throw new ReceptionError(409,'此次发送请求已用于其他内容');return {reply:existing};}
 if(env.MAIL_SEND_ENABLED!=='true'||!mailConfigured(env))throw new ReceptionError(409,'发送尚未启用，草稿可保存；验收后再开通发送');
 const [latest]=await db.all('SELECT * FROM mail_messages WHERE thread_id=? ORDER BY received_at DESC,provider_message_id DESC LIMIT 1',[threadId]);
 if(!latest)throw new ReceptionError(409,'还没有可回复的客户邮件');
 const [reserved]=await db.all(`INSERT INTO mail_replies(id,thread_id,user_id,actor_name,message_id,to_address,content,created_at) SELECT ?,id,?,?,?,?,?,? FROM mail_threads WHERE id=? AND version=? AND NOT EXISTS(SELECT 1 FROM mail_replies WHERE thread_id=? AND status IN ('sending','uncertain')) ON CONFLICT(id) DO NOTHING RETURNING *`,[body.requestId,user.id,user.name,latest.provider_message_id,latest.sender_email,body.content,new Date().toISOString(),threadId,body.version,threadId]);
 if(!reserved){
  const [concurrent]=await db.all('SELECT * FROM mail_replies WHERE id=?',[body.requestId]);
  if(concurrent&&concurrent.thread_id===threadId&&concurrent.user_id===user.id&&concurrent.content===body.content)return {reply:concurrent};
  throw new ReceptionError(409,'会话已更新或上一封发送结果待核对，请刷新后检查');
 }
 let status='uncertain',providerId='';
 try{
  const response=await provider.reply(latest.provider_message_id,latest.sender_email,/^re:/i.test(latest.subject)?latest.subject:'Re: '+latest.subject,body.content+'\n\ncontact\nEUCOVE');
  if(response?.messageId){status='sent';providerId=String(response.messageId);}
 }catch(error){if(error instanceof MailProviderError&&error.definitive)status='rejected';}
 await db.batch([
  {sql:'UPDATE mail_replies SET status=?,provider_message_id=? WHERE id=?',args:[status,providerId,body.requestId]},
  {sql:"DELETE FROM mail_drafts WHERE thread_id=? AND user_id=? AND content=? AND EXISTS(SELECT 1 FROM mail_replies WHERE id=? AND status='sent')",args:[threadId,user.id,body.content,body.requestId]},
 ]);
 return {reply:{...reserved,status,provider_message_id:providerId}};
}
/** The same authenticated routes are used by Node and Workers. */
export async function mailRoute(db:ReceptionDB,env:MailEnv,user:User,method:string,path:string,body?:unknown){
 requireMailUser(user);
 if(path==='/api/admin/mail'&&method==='GET'){
  const threads=await db.all('SELECT * FROM mail_threads'+(user.role==='admin'?'':' WHERE recipient=?')+' ORDER BY updated_at DESC LIMIT 300',user.role==='admin'?[]:[mailStaffName(user)]);
  const [sync]=await db.all('SELECT checked_at,last_error FROM mail_sync WHERE account_id=?',[env.ZOHO_ACCOUNT_ID||'']);
  return {threads,configured:mailConfigured(env),enabled:env.MAIL_ENABLED==='true',sendEnabled:env.MAIL_SEND_ENABLED==='true'&&mailConfigured(env),sync:sync||null};
 }
 const resolve=path.match(/^\/api\/admin\/mail\/replies\/([^/]+)\/resolve$/);
 if(resolve&&method==='POST'){
  if(user.role!=='admin')throw new ReceptionError(403,'只有管理员可以核对发送结果');
  const input=z.object({status:z.enum(['sent','rejected']),checkedInZoho:z.literal(true)}).strict().parse(body);
  const id=decodeURIComponent(resolve[1]);
  const changed=await db.all("UPDATE mail_replies SET status=? WHERE id=? AND status IN ('sending','uncertain') AND created_at<? RETURNING thread_id",[input.status,id,new Date(Date.now()-120000).toISOString()]);
  if(!changed.length)throw new ReceptionError(409,'发送可能仍在处理中，请两分钟后核对，或刷新已处理的记录');
  await db.batch([{sql:'INSERT INTO audit(user_id,action,resource_id,created_at) VALUES(?,?,?,?)',args:[user.id,'mail.resolve.'+input.status,id,new Date().toISOString()]}]);
  return {resolved:true};
 }
 const match=path.match(/^\/api\/admin\/mail\/([^/]+)(?:\/(draft|reply))?$/);
 if(!match)throw new ReceptionError(404,'邮件页面不存在');
 const id=decodeURIComponent(match[1]),thread=await ownThread(db,user,id);
 if(!match[2]&&method==='GET')return {thread,messages:await db.all('SELECT * FROM mail_messages WHERE thread_id=? ORDER BY received_at,provider_message_id',[id]),notifications:await db.all('SELECT n.id,n.message_id,n.channel,n.status,n.attempts,n.last_error,n.receipt,n.sent_at,n.text AS snapshot FROM mail_notifications n JOIN mail_messages m ON m.id=n.message_id WHERE m.thread_id=? ORDER BY m.received_at,n.channel',[id]),replies:await db.all('SELECT id,content,status,created_at,actor_name FROM mail_replies WHERE thread_id=? ORDER BY created_at',[id]),draft:(await db.all('SELECT content FROM mail_drafts WHERE thread_id=? AND user_id=?',[id,user.id]))[0]?.content||''};
 if(match[2]==='draft'&&method==='PUT'){
  const input=z.object({content:z.string().max(20000)}).strict().parse(body);
  await db.batch([{sql:'INSERT INTO mail_drafts(thread_id,user_id,content,updated_at) VALUES(?,?,?,?) ON CONFLICT(thread_id,user_id) DO UPDATE SET content=excluded.content,updated_at=excluded.updated_at',args:[id,user.id,input.content,new Date().toISOString()]}]);
  return {saved:true};
 }
 if(match[2]==='reply'&&method==='POST')return sendMailReply(db,env,user,id,body);
 throw new ReceptionError(405,'此邮件操作不支持');
}
