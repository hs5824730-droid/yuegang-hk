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
 function error(e:unknown){if(e instanceof ApiError&&e.status===401)onExpire();setNotice(e instanceof Error&&e.message!=='network'?e.message:L('暂时无法连接。内容已保留，请稍后重试。','Connection unavailable. Your content is preserved; try again.'));}
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
   if(result.reply.status==='sent'){setDraft('');sessionStorage.removeItem(storageKey(selected));setNotice(L('已发送，客户看到的发件人为 contact。','Sent from contact.'));}
   else setNotice(result.reply.status==='rejected'?L('邮件服务未接受发送。草稿已保留，请检查后重试。','The mail service rejected this reply. Your draft is preserved.'):L('发送结果待核对，请先查看 Zoho 已发送文件夹，系统不会重复发送。','Delivery needs review in Zoho Sent. The system will not send it again.'));
   sessionStorage.removeItem(pendingKey(selected));setPending(null);setPreview(false);setDetail(await api.mailDetail(selected));await refresh();
  }catch(e){error(e);if(e instanceof ApiError&&e.status===409){sessionStorage.removeItem(pendingKey(selected));setPending(null);setPreview(false);setDetail(await api.mailDetail(selected).catch(()=>detail));}}finally{sending.current=false;setBusy(false);}
 }
 async function resolve(id:string,status:'sent'|'rejected'){
  setBusy(true);try{await api.mailResolve(id,status);setDetail(await api.mailDetail(selected));setNotice(L('核对结果已记录。','Review recorded.'));}catch(e){error(e);}finally{setBusy(false);}
 }
 const threads=list?.threads.filter(t=>!filter||t.recipient===filter)||[];
 const latest=detail?.messages.at(-1),locked=!!detail?.replies.some(r=>r.status==='sending'||r.status==='uncertain');
 const date=(value:string)=>new Date(value).toLocaleString(lang==='zh'?'zh-CN':'en-AU',{timeZone:'Asia/Shanghai',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
 const replyLabel={sent:L('已发送','Sent'),sending:L('发送结果待核对','Delivery needs review'),uncertain:L('发送结果待核对','Delivery needs review'),rejected:L('未发送','Not sent')};
 const deliveryLabel={pending:L('等待重试','Pending'),sending:L('发送中','Sending'),sent:L('服务已确认','Transport confirmed'),failed:L('未发送成功','Failed'),uncertain:L('结果待核对，未自动重发','Uncertain; automatic retry held')};
 return <div className="admin-page mail-page">
  <div className="page-title-row"><div><h1>{L('客户邮件','Customer mail')}</h1><p className="admin-subtitle">{MAIL_ADDRESS} · {L('内部按人分配，对外统一回复','Assigned internally, one public sender')}</p></div><button className="btn btn-line" onClick={refresh} disabled={busy||loading}><RefreshCw size={16} aria-hidden/>{L('刷新','Refresh')}</button></div>
  {list&&!list.enabled&&<p className="notice">{L('邮箱已开通。此后台的自动收信尚未启用，可先验收邮件处理流程。','The mailbox is open. Automatic intake in this console is not yet enabled.')}</p>}
  {list?.sync?.last_error&&<p role="alert" className="field-error">{L('最近一次收信未成功，已保存的邮件仍可查看。请管理员检查邮箱连接。','The latest inbox sync failed. Saved messages remain available; ask an administrator to check the connection.')}</p>}
  {notice&&<p className="admin-feedback" role="status">{notice}</p>}
  <div className={'mail-layout'+(selected?' mail-selected':'')}>
   <section className="admin-card mail-list" aria-label={L('邮件会话','Conversations')}>
    <label className="field">{L('接粉人员','Assigned to')}<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">{L('全部可见邮件','All available mail')}</option>{MAIL_STAFF.map(s=><option key={s.email}>{s.name}</option>)}</select></label>
    {loading&&!list?<p role="status">{L('正在读取邮件…','Loading mail…')}</p>:threads.length?threads.map(t=><button className={'mail-item'+(selected===t.id?' selected':'')} key={t.id} onClick={()=>open(t)} disabled={busy} aria-current={selected===t.id?'true':undefined}><span className="mail-item-top"><strong>{t.sender_name||t.sender_email}</strong><time>{date(t.updated_at)}</time></span><span className="mail-subject">{t.subject}</span><span className="mail-owner">{L('接粉人员','Assigned to')} · {t.recipient}</span></button>):<div className="mail-empty"><Inbox size={28} aria-hidden/><p>{L('暂无客户邮件','No customer mail yet')}</p><span>{L('新邮件接入后，负责人会显示在这里。','New mail will appear here with its assigned agent.')}</span></div>}
   </section>
   <section className="admin-card mail-conversation" aria-label={L('邮件内容和回复','Message and reply')} aria-busy={!!selected&&!detail}>
    {!selected?<div className="mail-empty"><Inbox size={32} aria-hidden/><h2>{L('选择一封客户邮件','Select a conversation')}</h2><p>{L('查看来信、接粉人员和历史回复。','Read incoming mail, ownership and previous replies.')}</p></div>:!detail?<p role="status">{L('正在读取会话…','Loading conversation…')}</p>:<>
     <button className="btn btn-quiet mail-back" onClick={()=>{loadVersion.current++;setSelected('');setDetail(null);}} disabled={busy}><ArrowLeft size={16} aria-hidden/>{L('返回邮件列表','Back to mail')}</button>
     <header className="mail-thread-head"><h2>{detail.thread.subject}</h2><p>{detail.thread.sender_email}</p><span>{L('接粉人员','Assigned to')}：<strong>{detail.thread.recipient}</strong></span></header>
     {!!detail.notifications?.length&&<section className="mail-delivery" aria-label={L('机器人通知状态','Bot notification delivery')}><h3>{L('机器人通知','Bot notifications')}</h3><p className="fine">{L('服务回执不代表群成员已读；待核对的通知不会盲目重发。','A transport receipt does not prove anyone has read the message. Uncertain delivery is held for review.')}</p>{detail.notifications.map(n=><details key={n.id}><summary>{n.channel==='telegram'?'Telegram':'Signal'} · {deliveryLabel[n.status]} · {L('尝试','Attempts')} {n.attempts}</summary><p>{L('服务回执','Receipt')}：{n.receipt||'—'}{n.sent_at&&<> · {date(n.sent_at)}</>}</p>{n.last_error&&<p>{L('状态码','Status code')}：{n.last_error}</p>}<pre>{notificationPreview(n.snapshot)}</pre></details>)}</section>}
     <div className="mail-history">{detail.messages.map(m=><article className="mail-message" key={m.id}><div className="mail-message-meta"><strong>{m.sender_name||m.sender_email}</strong><time>{date(m.received_at)} {L('北京时间','Beijing time')}</time></div><pre>{m.body||L('（无正文）','(No message body)')}</pre>{!!m.has_attachment&&<p className="fine">{L('此邮件包含附件，请在 Zoho 邮箱中查看。','This message has attachments. Open them in Zoho Mail.')}</p>}</article>)}
      {detail.replies.map(r=><article className="mail-message mail-reply" key={r.id}><div className="mail-message-meta"><strong>contact · {replyLabel[r.status]}</strong><time>{date(r.created_at)}</time></div><pre>{r.content}</pre><p className="fine">{L('内部操作人','Internal author')}：{r.actor_name}</p>{user.role==='admin'&&['sending','uncertain'].includes(r.status)&&<details><summary>{L('在 Zoho 核对后处理','Resolve after checking Zoho')}</summary><p>{L('请先检查 Zoho 已发送文件夹。确认未发送后，才允许再次回复。','Check Zoho Sent first. Only allow another reply after confirming it was not sent.')}</p><div className="row-actions"><button className="btn btn-line" disabled={busy} onClick={()=>resolve(r.id,'sent')}>{L('已核对，确实已发送','Verified as sent')}</button><button className="btn btn-line" disabled={busy} onClick={()=>resolve(r.id,'rejected')}>{L('已核对，确实未发送','Verified as not sent')}</button></div></details>}</article>)}
     </div>
     <div className="mail-compose">
      <h3>{L('回复客户','Reply to customer')}</h3><p className="fine">{L('发件人','From')}：contact &lt;{MAIL_ADDRESS}&gt;<br/>{L('收件人','To')}：{latest?.sender_email}</p>
      {locked?<p role="alert">{L('上一封回复结果待核对，请先检查 Zoho 已发送文件夹。','Check the previous reply in Zoho Sent before sending another.')}</p>:<>
       <label htmlFor="mail-reply-content">{L('回复正文','Reply')}</label><textarea id="mail-reply-content" rows={8} maxLength={20000} value={draft} disabled={busy||preview} onChange={e=>change(e.target.value)} placeholder={L('写下给客户的回复…','Write your reply…')}/>
       {preview&&<section className="mail-preview" aria-label={L('发送预览','Send preview')}><h4>{L('确认回复内容','Review your reply')}</h4><pre>{pending?.content||draft.trim()}{'\n\ncontact\nEUCOVE'}</pre><p className="fine">{L('员工姓名只保留在内部记录中。','Staff names remain in internal records.')}</p></section>}
       <div className="row-actions"><button className="btn btn-line" disabled={busy||!!pending} onClick={save}><Save size={16} aria-hidden/>{L('保存草稿','Save draft')}</button>{preview?<><button className="btn btn-quiet" disabled={busy||!!pending} onClick={()=>setPreview(false)}>{L('继续编辑','Edit')}</button><button className="btn btn-primary" disabled={busy||!list?.sendEnabled} onClick={send}><Send size={16} aria-hidden/>{busy?L('正在发送…','Sending…'):pending?L('核对发送结果','Check delivery'):L('确认发送','Send reply')}</button></>:<button className="btn btn-primary" disabled={!draft.trim()||busy} onClick={()=>setPreview(true)}>{L('预览回复','Preview reply')}</button>}</div>
       {!list?.sendEnabled&&<p className="fine">{L('发送尚未启用，草稿可以保存。','Sending is not yet enabled. Drafts can be saved.')}</p>}
      </>}
     </div>
    </>}
   </section>
  </div>
 </div>;
}
