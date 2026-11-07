// Local isolated fixture: no real mail credentials, no bots, no customer data.
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const directory=mkdtempSync(path.join(tmpdir(),'eucove-mail-review-'));
process.env.PORT='3093';process.env.APP_URL='http://127.0.0.1:3093';
process.env.DATABASE_PATH=path.join(directory,'review.sqlite');process.env.UPLOAD_DIR=path.join(directory,'uploads');
process.env.DISABLE_TELEGRAM='true';process.env.SIGNAL_ENABLED='false';process.env.MAIL_ENABLED='false';process.env.MAIL_SEND_ENABLED='false';
process.env.ADMIN_EMAIL='review@example.invalid';process.env.ADMIN_PASSWORD='LocalMailReview2026!';
process.env.SESSION_SECRET='local-mail-review-only-secret-20261026-123456789';process.env.NODE_ENV='test';
for(const key of ['ZOHO_CLIENT_ID','ZOHO_CLIENT_SECRET','ZOHO_REFRESH_TOKEN','ZOHO_ACCOUNT_ID'])delete process.env[key];
const {createApp}=await import('../server/app.js');const {db,transaction}=await import('../server/db.js');
const {passwordHash}=await import('../server/password.js');const {ingestMail}=await import('../server/enterprise-mail.js');
const {MAIL_STAFF}=await import('../src/mail-types.js');
const app=createApp();
const adapter={all:async(sql:string,args:unknown[]=[])=>db.prepare(sql).all(...args as any[]) as any[],batch:async(qs:{sql:string;args:unknown[]}[])=>{transaction(()=>{for(const q of qs)db.prepare(q.sql).run(...q.args as any[]);});}};
const examples=[['示例客户 A','悉尼房屋招租咨询','您好，我在悉尼有一套两房公寓，希望了解招租服务。请问接下来需要准备哪些资料？'],['示例客户 B','想了解长期托管','您好，想了解长期托管的服务内容和费用，方便邮件联系。'],['示例客户 C','房产咨询','您好，希望了解你们的房产咨询服务。']];
for(let i=0;i<MAIL_STAFF.length;i++){
 const s=MAIL_STAFF[i];db.prepare('INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES(?,?,?,?,?,?)').run('mail-review-'+i,s.name,s.email,passwordHash('LocalMailReview2026!'),'mail',new Date().toISOString());
 const [sender,subject,content]=examples[i];await ingestMail(adapter,'preview',{messageId:String(i+1),threadId:String(i+1),folderId:'inbox',fromAddress:`customer${i+1}@example.invalid`,sender,subject,receivedTime:String(Date.parse('2026-10-26T09:00:00Z')+i*60000)},content,[]);
}
app.listen(3093,'127.0.0.1',()=>console.log('本机邮件验收：http://127.0.0.1:3093/admin/mail（虚构数据，真实发送关闭）'));
