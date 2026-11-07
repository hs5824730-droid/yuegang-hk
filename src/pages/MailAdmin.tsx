import {useEffect,useRef,useState} from 'react';
import {Inbox,RefreshCw,Send,Save,ArrowLeft} from 'lucide-react';
import {api,ApiError,type User} from '../api';
import {MAIL_ADDRESS,MAIL_STAFF,type MailDetail,type MailThread} from '../mail-types';
import {useI18n} from '../i18n';
import './mail-admin.css';

function notificationPreview(snapshot:string){
 try{const s=JSON.parse(snapshot);return [s.sender_name,s.sender_email,s.subject,s.city,s.recipient,s.group].filter(v=>typeof v==='string'&&v).join(' · ');}catch{return '';}
}

export default function MailAdmin({user,onExpire}:{user:User;onExpire:()=>void}){
 const {L,lang}=useI18n();
 const [list,setList]=useState<Awaited<ReturnType<typeof api.mailList>>|null>(null);
 const [detail,setDetail]=useState<MailDetail|null>(null),[selected,setSelected]=useState('');
 const [draft,setDraft]=useState(''),[filter,setFilter]=useState(''),[notice,setNotice]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[preview,setPreview]=useState(false);
 const [pending,setPending]=useState<{requestId:string;version:number;content:string}|null>(null);
 const loadVersion=useRef(0),sending=useRef(false);
 const storageKey=(id:string)=>'eucove-mail-draft:'+user.id+':'+id;
 const pendingKey=(id:string)=>'eucove-mail-send:'+user.id+':'+id;
 function error(e:unknown){if(e instanceof ApiError&&e.status===401)onExpire();setNotice(e instanceof Error&&e.message!=='network'?e.message:L('暫時無法連接。內容已保留，請稍後重試。','Connection unavailable. Your content is preserved; try again.'));}
 async function refresh(){setLoading(true);try{setList(await api.mailList());}catch(e){error(e);}finally{setLoading(false);}}
 useEffect(()=>{void refresh();return()=>{loadVersion.current++;};},[]);
 async function open(thread:MailThread){
  if(busy)return;const version=++loadVersion.current;setSelected(thread.id);setDetail(null);setNotice('');setPreview(false);setPending(null);
  try{const result=await api.mailDetail(thread.id);if(version!==loadVersion.current)return;setDetail(result);setDraft(sessionStorage.getItem(storageKey(thread.id))??result.draft);const saved=sessionStorage.getItem(pendingKey(thread.id));if(saved){setPending(JSON.parse(saved));setPreview(true);}}
  catch(e){if(version===loadVersion.current)error(e);}
 }
 function change(value:string){setDraft(value);sessionStorage.setItem(storageKey(selected),value);}
 async function save(){setBusy(true);setNotice('');try{await api.mailDraft(selected,draft);setNotice(L('草稿已保存。','Draft saved.'));}catch(e){error(e);}finally{setBusy(false);}}
 async function send(){
  if(!detail||sending.current)return;sending.current=true;setBusy(true);setNotice('');
  const request=pending||{requestId:crypto.randomUUID(),version:detail.thread.version,content:draft.trim()};
  setPending(request);sessionStorage.setItem(pendingKey(selected),JSON.stringify(request));
  try{
   const result=await api.mailReply(selected,request);
   if(result.reply.status==='sent'){setDraft('');sessionStorage.removeItem(storageKey(selected));setNotice(L('已發送，客戶看到的發件人為 contact。','Sent from contact.'));}
   else setNotice(result.reply.status==='rejected'?L('郵件服務未接受發送。草稿已保留，請檢查後重試。','The mail service rejected this reply. Your draft is preserved.'):L('發送結果待核對，請先查看 Zoho 已發送文件夾，系統不會重複發送。','Delivery needs review in Zoho Sent. The system will not send it again.'));
   sessionStorage.removeItem(pendingKey(selected));setPending(null);setPreview(false);setDetail(await api.mailDetail(selected));await refresh();
  }catch(e){error(e);if(e instanceof ApiError&&e.status===409){sessionStorage.removeItem(pendingKey(selected));setPending(null);setPreview(false);setDetail(await api.mailDetail(selected).catch(()=>detail));}}finally{sending.current=false;setBusy(false);}
 }
 async function resolve(id:string,status:'sent'|'rejected'){
  setBusy(true);try{await api.mailResolve(id,status);setDetail(await api.mailDetail(selected));setNotice(L('核對結果已記錄。','Review recorded.'));}catch(e){error(e);}finally{setBusy(false);}
 }
 const threads=list?.threads.filter(t=>!filter||t.recipient===filter)||[];
 const latest=detail?.messages.at(-1),locked=!!detail?.replies.some(r=>r.status==='sending'||r.status==='uncertain');
 const date=(value:string)=>new Date(value).toLocaleString(lang==='zh'?'zh-HK':'en-HK',{timeZone:'Asia/Shanghai',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
 const replyLabel={sent:L('已發送','Sent'),sending:L('發送結果待核對','Delivery needs review'),uncertain:L('發送結果待核對','Delivery needs review'),rejected:L('未發送','Not sent')};
 const deliveryLabel={pending:L('等待重試','Pending'),sending:L('發送中','Sending'),sent:L('服務已確認','Transport confirmed'),failed:L('未發送成功','Failed'),uncertain:L('結果待核對，未自動重發','Uncertain; automatic retry held')};
 return <div className="admin-page mail-page">
  <div className="page-title-row"><div><h1>{L('客戶郵件','Customer mail')}</h1><p className="admin-subtitle">{MAIL_ADDRESS} · {L('內部按人分配，對外統一回復','Assigned internally, one public sender')}</p></div><button className="btn btn-line" onClick={refresh} disabled={busy||loading}><RefreshCw size={16} aria-hidden/>{L('刷新','Refresh')}</button></div>
  {list&&!list.enabled&&<p className="notice">{L('電郵已開通。此後台的自動收信尚未啓用，可先驗收郵件處理流程。','The mailbox is open. Automatic intake in this console is not yet enabled.')}</p>}
  {list?.sync?.last_error&&<p role="alert" className="field-error">{L('最近一次收信未成功，已保存的郵件仍可查看。請管理員檢查電郵連接。','The latest inbox sync failed. Saved messages remain available; ask an administrator to check the connection.')}</p>}
  {notice&&<p className="admin-feedback" role="status">{notice}</p>}
  <div className={'mail-layout'+(selected?' mail-selected':'')}>
   <section className="admin-card mail-list" aria-label={L('郵件會話','Conversations')}>
    <label className="field">{L('接粉人員','Assigned to')}<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">{L('全部可見郵件','All available mail')}</option>{MAIL_STAFF.map(s=><option key={s.email}>{s.name}</option>)}</select></label>
    {loading&&!list?<p role="status">{L('正在讀取郵件…','Loading mail…')}</p>:threads.length?threads.map(t=><button className={'mail-item'+(selected===t.id?' selected':'')} key={t.id} onClick={()=>open(t)} disabled={busy} aria-current={selected===t.id?'true':undefined}><span className="mail-item-top"><strong>{t.sender_name||t.sender_email}</strong><time>{date(t.updated_at)}</time></span><span className="mail-subject">{t.subject}</span><span className="mail-owner">{L('接粉人員','Assigned to')} · {t.recipient}</span></button>):<div className="mail-empty"><Inbox size={28} aria-hidden/><p>{L('暫無客戶郵件','No customer mail yet')}</p><span>{L('新郵件接入後，負責人會顯示在這裏。','New mail will appear here with its assigned agent.')}</span></div>}
   </section>
   <section className="admin-card mail-conversation" aria-label={L('郵件內容和回覆','Message and reply')} aria-busy={!!selected&&!detail}>
    {!selected?<div className="mail-empty"><Inbox size={32} aria-hidden/><h2>{L('選擇一封客戶郵件','Select a conversation')}</h2><p>{L('查看來信、接粉人員和歷史回覆。','Read incoming mail, ownership and previous replies.')}</p></div>:!detail?<p role="status">{L('正在讀取會話…','Loading conversation…')}</p>:<>
     <button className="btn btn-quiet mail-back" onClick={()=>{loadVersion.current++;setSelected('');setDetail(null);}} disabled={busy}><ArrowLeft size={16} aria-hidden/>{L('返回郵件列表','Back to mail')}</button>
     <header className="mail-thread-head"><h2>{detail.thread.subject}</h2><p>{detail.thread.sender_email}</p><span>{L('接粉人員','Assigned to')}：<strong>{detail.thread.recipient}</strong></span></header>
     {!!detail.notifications?.length&&<section className="mail-delivery" aria-label={L('機器人通知狀態','Bot notification delivery')}><h3>{L('機器人通知','Bot notifications')}</h3><p className="fine">{L('服務回執不代表羣成員已讀；待核對的通知不會盲目重發。','A transport receipt does not prove anyone has read the message. Uncertain delivery is held for review.')}</p>{detail.notifications.map(n=><details key={n.id}><summary>{n.channel==='telegram'?'Telegram':'Signal'} · {deliveryLabel[n.status]} · {L('嘗試','Attempts')} {n.attempts}</summary><p>{L('服務回執','Receipt')}：{n.receipt||'—'}{n.sent_at&&<> · {date(n.sent_at)}</>}</p>{n.last_error&&<p>{L('狀態碼','Status code')}：{n.last_error}</p>}<pre>{notificationPreview(n.snapshot)}</pre></details>)}</section>}
     <div className="mail-history">{detail.messages.map(m=><article className="mail-message" key={m.id}><div className="mail-message-meta"><strong>{m.sender_name||m.sender_email}</strong><time>{date(m.received_at)} {L('北京時間','Beijing time')}</time></div><pre>{m.body||L('（無正文）','(No message body)')}</pre>{!!m.has_attachment&&<p className="fine">{L('此郵件包含附件，請在 Zoho 電郵中查看。','This message has attachments. Open them in Zoho Mail.')}</p>}</article>)}
      {detail.replies.map(r=><article className="mail-message mail-reply" key={r.id}><div className="mail-message-meta"><strong>contact · {replyLabel[r.status]}</strong><time>{date(r.created_at)}</time></div><pre>{r.content}</pre><p className="fine">{L('內部操作人','Internal author')}：{r.actor_name}</p>{user.role==='admin'&&['sending','uncertain'].includes(r.status)&&<details><summary>{L('在 Zoho 核對後處理','Resolve after checking Zoho')}</summary><p>{L('請先檢查 Zoho 已發送文件夾。確認未發送後，才允許再次回覆。','Check Zoho Sent first. Only allow another reply after confirming it was not sent.')}</p><div className="row-actions"><button className="btn btn-line" disabled={busy} onClick={()=>resolve(r.id,'sent')}>{L('已核對，確實已發送','Verified as sent')}</button><button className="btn btn-line" disabled={busy} onClick={()=>resolve(r.id,'rejected')}>{L('已核對，確實未發送','Verified as not sent')}</button></div></details>}</article>)}
     </div>
     <div className="mail-compose">
      <h3>{L('回覆客戶','Reply to customer')}</h3><p className="fine">{L('發件人','From')}：contact &lt;{MAIL_ADDRESS}&gt;<br/>{L('收件人','To')}：{latest?.sender_email}</p>
      {locked?<p role="alert">{L('上一封回覆結果待核對，請先檢查 Zoho 已發送文件夾。','Check the previous reply in Zoho Sent before sending another.')}</p>:<>
       <label htmlFor="mail-reply-content">{L('回覆正文','Reply')}</label><textarea id="mail-reply-content" rows={8} maxLength={20000} value={draft} disabled={busy||preview} onChange={e=>change(e.target.value)} placeholder={L('寫下給客戶的回覆…','Write your reply…')}/>
       {preview&&<section className="mail-preview" aria-label={L('發送預覽','Send preview')}><h4>{L('確認回覆內容','Review your reply')}</h4><pre>{pending?.content||draft.trim()}{'\n\ncontact\nHarbour Joy'}</pre><p className="fine">{L('員工姓名只保留在內部記錄中。','Staff names remain in internal records.')}</p></section>}
       <div className="row-actions"><button className="btn btn-line" disabled={busy||!!pending} onClick={save}><Save size={16} aria-hidden/>{L('保存草稿','Save draft')}</button>{preview?<><button className="btn btn-quiet" disabled={busy||!!pending} onClick={()=>setPreview(false)}>{L('繼續編輯','Edit')}</button><button className="btn btn-primary" disabled={busy||!list?.sendEnabled} onClick={send}><Send size={16} aria-hidden/>{busy?L('正在發送…','Sending…'):pending?L('核對發送結果','Check delivery'):L('確認發送','Send reply')}</button></>:<button className="btn btn-primary" disabled={!draft.trim()||busy} onClick={()=>setPreview(true)}>{L('預覽回覆','Preview reply')}</button>}</div>
       {!list?.sendEnabled&&<p className="fine">{L('發送尚未啓用，草稿可以保存。','Sending is not yet enabled. Drafts can be saved.')}</p>}
      </>}
     </div>
    </>}
   </section>
  </div>
 </div>;
}
