// Isolated local preview. No production data, external messaging, Google writes or deployment.
import express from 'express';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {languageRedirect} from '../src/language-path';
import {nodeLanguageHtml,publicDocumentStatus,privateLanguagePath} from '../server/language-shell';
import {comMarketingRedirect} from '../server/com-marketing';

const root=path.resolve('.'),directory=path.join(root,'data/local-review/customer-registration');mkdirSync(directory,{recursive:true});
Object.assign(process.env,{NODE_ENV:'test',APP_URL:'http://127.0.0.1:5273',DATABASE_PATH:path.join(directory,'fixture.sqlite'),UPLOAD_DIR:path.join(directory,'uploads'),SESSION_SECRET:'local-registration-fixture-secret-only-2026',ADMIN_EMAIL:'smoke@example.test',ADMIN_PASSWORD:'BrowserSmokePassword2026',DISABLE_TELEGRAM:'true',SIGNAL_ENABLED:'false',MAIL_ENABLED:'false',MAIL_SEND_ENABLED:'false',REGISTRATION_SHEETS_ENABLED:'false',REGISTRATION_GOOGLE_CLIENT_ID:'',REGISTRATION_GOOGLE_CLIENT_SECRET:'',REGISTRATION_GOOGLE_REFRESH_TOKEN:'',TELEGRAM_BOT_TOKEN:'',SIGNAL_RELAY_URL:'',WHATSAPP_NUMBER:''});
globalThis.fetch=async()=>{throw new Error('External requests are disabled in the local registration preview')};
const {createApp}=await import('../server/app');
const backend=createApp();
const {db}=await import('../server/db');
const {saveCustomerRegistration}=await import('../server/customer-registration');
const {saveRentalRegistration}=await import('../server/rental-registration');
const adapter={all:async(sql:string,args:unknown[]=[])=>db.prepare(sql).all(...args as any[]) as Record<string,any>[],batch:async(qs:{sql:string;args:unknown[]}[])=>{db.exec('BEGIN');try{for(const q of qs)db.prepare(q.sql).run(...q.args as any[]);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}};
if(!(db.prepare('SELECT COUNT(*) n FROM customer_registrations').get() as {n:number}).n){for(const type of ['buying','selling','advisory'])await saveCustomerRegistration(adapter,{requestId:crypto.randomUUID(),type,language:'zh',name:'本地演示 · '+({buying:'购房',selling:'卖房',advisory:'装修'} as Record<string,string>)[type],contactMethod:'phone',contact:'+447700900001',city:'Sydney',details:type==='advisory'?{service:'renovation',scope:'仅本地模拟：出租前整理厨房',budgetMin:10000,budgetMax:30000}:type==='buying'?{budgetMin:800000,budgetMax:1200000,purpose:'home'}:{expectedPrice:1000000,occupancy:'vacant'}});}
if(!(db.prepare('SELECT COUNT(*) n FROM rental_registrations').get() as {n:number}).n)await saveRentalRegistration(adapter,{requestId:crypto.randomUUID(),language:'zh',name:'本地演示 · 出租',phone:'+447700900001',email:'fixture@example.test',city:'Sydney'});
const banner=`<script>document.addEventListener('DOMContentLoaded',()=>{const bar=document.createElement('div');bar.textContent='本地隔离预览 · 模拟资料 · 不发送真实通知或同步表格';bar.style.cssText='padding:8px 16px;text-align:center;font:13px sans-serif;background:#fff3e5;color:#743500';document.body.prepend(bar);document.addEventListener('click',event=>{const a=event.target.closest?.('a[href]');if(a&&(a.href.startsWith('tel:')||a.href.startsWith('https://wa.me/'))){event.preventDefault();alert('本地预览已拦截，不会真实拨号或打开聊天。')}},true)});</script>`;
const servers=[];
for(const [site,port] of [['com',5273],['net',5274]] as const){const app=express(),dist=path.join(root,site==='com'?'dist':'dist-net');
 app.use((req,res,next)=>{res.setHeader('X-EUCOVE-LOCAL-FIXTURE','true');if(req.path.startsWith('/api/')||req.path.startsWith('/uploads/')){if(req.headers.origin&&['http://127.0.0.1:5273','http://127.0.0.1:5274'].includes(req.headers.origin))req.headers.origin='http://127.0.0.1:5273';backend(req,res,next)}else next()});
 app.get('/__local',(_req,res)=>res.type('html').send('<meta charset="utf-8"><h1>桉湾需求登记，本地隔离预览</h1><p>所有资料均为模拟资料，无外部消息与表格写入。</p><p><a href="/zh/registration">打开需求登记</a> · <a href="/admin/registrations">打开后台</a></p><p>本地测试账号：smoke@example.test<br>本地测试密码：BrowserSmokePassword2026</p>'));
 app.use((req,res,next)=>{const url=new URL(req.originalUrl,'http://127.0.0.1:'+port);if(privateLanguagePath(url.pathname)||/^\/(?:admin-shell(?:\.html)?|data|server|\.env|\.git)(?:\/|$)/.test(url.pathname)){res.sendStatus(404);return;}const isStandalone=/^\/(?:(?:zh|en)\/)?(?:registration|(?:rental|buying|selling|advisory)-registration|contact)(?:\/|$)/.test(url.pathname);const redirect=site==='com'?comMarketingRedirect(new URL(req.originalUrl,'https://eucove.com'))||(isStandalone?languageRedirect(url):null):languageRedirect(url);if(redirect){res.redirect(308,redirect);return;}next()});
 app.use(express.static(dist,{index:false}));
 app.get('/{*path}',(req,res)=>{const standalone=/^\/(?:(?:zh|en)\/)?(?:admin(?:\/|$)|registration$|(?:rental|buying|selling|advisory)-registration$|contact(?:\/|$))/.test(req.path),url=new URL(req.originalUrl,'http://127.0.0.1:'+port);let html=readFileSync(path.join(dist,site==='com'&&standalone?'admin-shell.html':'index.html'),'utf8');html=nodeLanguageHtml(html,url).replace('<head>','<head>'+banner);res.status(publicDocumentStatus(url)).set('Cache-Control','no-store').type('html').send(html)});
 servers.push(app.listen(port,'127.0.0.1',()=>console.log(`Local ${site} preview: http://127.0.0.1:${port}/zh/registration`)));
}
writeFileSync(path.join(directory,'runtime.json'),JSON.stringify({pid:process.pid,ports:[5273,5274],localOnly:true,startedAt:new Date().toISOString()},null,2));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const server of servers)server.close();db.close();process.exit(0)});
