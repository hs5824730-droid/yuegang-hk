/** Isolated LAN acceptance harness. No production DB, device state, secrets or outbound messaging. */
import express from 'express';
import cookieParser from 'cookie-parser';
import {createServer as createViteServer} from 'vite';
import react from '@vitejs/plugin-react';
import {mkdirSync,existsSync,writeFileSync} from 'node:fs';
import {networkInterfaces} from 'node:os';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const port=5180,lan=Object.values(networkInterfaces()).flat().find(a=>a?.family==='IPv4'&&!a.internal&&/^192\.168\./.test(a.address))?.address||'127.0.0.1';
const origin=`http://${lan}:${port}`,directory=path.resolve('data/local-review/signal-acceptance-2026-10-23');mkdirSync(directory,{recursive:true});
const secret='LOCAL-FIXTURE-ONLY-NOT-A-PRODUCTION-SECRET-2026';
Object.assign(process.env,{NODE_ENV:'test',APP_URL:origin,DATABASE_PATH:path.join(directory,'fixture.sqlite'),UPLOAD_DIR:path.join(directory,'uploads'),SESSION_SECRET:secret,ADMIN_EMAIL:'review@example.test',ADMIN_PASSWORD:'LocalReviewOnly2026!',TELEGRAM_BOT_TOKEN:'fixture-only',TELEGRAM_CHAT_ID:'fixture-only',DISABLE_TELEGRAM:'false',SIGNAL_ENABLED:'true',SIGNAL_RELAY_URL:'https://local-fixture.up.railway.app',SIGNAL_RELAY_SECRET:secret,TURNSTILE_ENABLED:'false',TURNSTILE_SECRET:'',WHATSAPP_NUMBER:'',TRUST_PROXY:'false'});
const {createApp}=await import('../server/app.js');const {db,transaction}=await import('../server/db.js');const {saveReception}=await import('../server/reception.js');const {deliverNotifications}=await import('../server/notifications.js');const {readSession,requireUser}=await import('../server/auth.js');
// Persist only synthetic local previews. Never send via Signal Java, Telegram or any external fetch.
db.exec(`CREATE TABLE IF NOT EXISTS local_previews(channel TEXT NOT NULL,id TEXT NOT NULL,revision INTEGER NOT NULL,text TEXT NOT NULL,at TEXT NOT NULL,PRIMARY KEY(channel,id));`);
db.prepare("UPDATE notification_channels SET enabled=1,enabled_at='2026-10-23T00:00:00.000Z' WHERE channel='signal'").run();
const adapter={all:async(sql:string,args:unknown[]=[])=>db.prepare(sql).all(...args as any[]) as any[],batch:async(qs:{sql:string;args:unknown[]}[])=>transaction(()=>{for(const q of qs)db.prepare(q.sql).run(...q.args as any[]);})};
mkdirSync(process.env.UPLOAD_DIR!,{recursive:true});const qr='11111111-1111-4111-8111-111111111111.png',qrFile=path.join(process.env.UPLOAD_DIR!,qr);
if(!existsSync(qrFile)){
 const result=spawnSync('python',['-c',`from PIL import Image,ImageDraw\nimport sys\nim=Image.new('RGB',(600,600),'white');d=ImageDraw.Draw(im);d.rectangle((30,30,570,570),outline='#E86D35',width=5);d.text((90,220),'LOCAL REVIEW',fill='#222222',font_size=48);d.text((80,300),'NOT A WECHAT QR',fill='#444444',font_size=32);im.save(sys.argv[1])`,qrFile],{encoding:'utf8'});if(result.status!==0)throw Error('Local-only QR placeholder could not be created');
}
if(!(db.prepare('SELECT COUNT(*) n FROM reception_targets').get()!.n))await saveReception(adapter,{targets:[
 {id:'22222222-2222-4222-8222-222222222222',channel:'whatsapp',enabled:true,cities:['Melbourne','Sydney'],queueOrder:0,groupId:'fictional-a',groupName:'本地模拟 A',groupOrder:0,targetOrder:0,value:'+61400000001'},
 {id:'33333333-3333-4333-8333-333333333333',channel:'whatsapp',enabled:true,cities:['Melbourne'],queueOrder:1,groupId:'fictional-b',groupName:'本地模拟 B',groupOrder:1,targetOrder:0,value:'+61400000002'},
 {id:'44444444-4444-4444-8444-444444444444',channel:'wechat',enabled:true,cities:[],queueOrder:0,groupId:'fictional-qr',groupName:'本地模拟二维码',groupOrder:2,targetOrder:0,value:'/uploads/'+qr},
]});
const realFetch=globalThis.fetch;let signalMode='ok',telegramMode='ok';let nextTelegramId=Number(db.prepare("SELECT COUNT(*) n FROM local_previews WHERE channel='telegram'").get()!.n)+100;
const savePreview=(channel:string,id:string,revision:number,text:string)=>db.prepare('INSERT INTO local_previews VALUES(?,?,?,?,?) ON CONFLICT(channel,id) DO UPDATE SET revision=excluded.revision,text=excluded.text,at=excluded.at').run(channel,id,revision,text,new Date().toISOString());
const {createRelay}=await import('../signal-relay/relay.mjs');
let activeInput:{id:string;revision:number;text:string}|null=null;
const relay=await createRelay({directory:path.join(directory,'mock-relay'),secret,enabled:()=>true,client:async(command:string,text:string,previous:number|null)=>{
 if(command==='verify')return{verified:true};if(signalMode==='unavailable')return{code:-1,started:false};if(signalMode==='uncertain')return{code:1,started:true};
 if(activeInput)savePreview('signal',activeInput.id,activeInput.revision,text);return{code:0,timestamp:previous||Date.now()};
}});await relay.verify();await new Promise<void>(resolve=>relay.server.listen(0,'127.0.0.1',resolve));
globalThis.fetch=(async(input:any,init?:RequestInit)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 if(url.hostname==='local-fixture.up.railway.app'){
  if(signalMode==='429')return Response.json({error:'busy'},{status:429,headers:{'Retry-After':'5'}});
  if(signalMode==='network')throw Error('Local simulated network failure');
  activeInput=init?.body?JSON.parse(String(init.body)):null;
  return realFetch(`http://127.0.0.1:${(relay.server.address() as import('node:net').AddressInfo).port}${url.pathname}`,init);
 }
 if(url.hostname==='api.telegram.org'&&url.pathname.startsWith('/botfixture-only/')){
  if(telegramMode==='network')throw Error('Local simulated Telegram failure');const body=JSON.parse(String(init?.body));const id=body.message_id||nextTelegramId++;savePreview('telegram',String(id),0,body.text);return Response.json({ok:true,result:{message_id:id}});
 }
 throw Error('External network blocked by isolated local acceptance harness');
}) as typeof fetch;
const app=express();
app.get('/__local',(_req,res)=>res.type('html').send(`<!doctype html><html lang="zh-CN"><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>EUCOVE 本地隔离验收</title><style>body{font:16px/1.6 system-ui;margin:30px auto;padding:0 20px;max-width:920px;background:#faf8f5;color:#242421}h1{font-size:26px}a,button{display:inline-block;padding:12px 16px;margin:6px 6px 6px 0;border:1px solid #ddd;color:inherit;background:white;border-radius:4px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:white;border:1px solid #ddd;padding:16px}label{display:block;margin:8px 0}select{padding:8px}small{color:#666}</style><h1>本地验收 · 不会外发消息</h1><p>独立测试数据库与模拟接待号码；不连接正式 D1、Telegram、Signal 或 WhatsApp。只填虚构姓名与联系方式。</p><p><a href="/?service=rent">打开网站 / 填咨询</a><a href="/admin/leads">后台咨询记录</a><a href="/admin/reception">城市多选与排序</a></p><p>仅本地测试登录：<code>review@example.test</code> / <code>LocalReviewOnly2026!</code>。先到后台登录，再回这里看通知预览。</p><ol><li>Melbourne：两条模拟 WA 轮流分配；Sydney：仅模拟 A。</li><li>Brisbane 等未配置城市：保存咨询，明确无匹配，不跨城。</li><li>微信：独立模拟图片，不能扫码加好友。电话：仅回访。</li><li>WA 自动跳转被替换为本机回执页，绝不打开真实 WA。</li></ol><label>Signal 故障模拟 <select id="signal"><option>ok</option><option>network</option><option>429</option><option>unavailable</option><option>uncertain</option></select></label><label>Telegram 故障模拟 <select id="telegram"><option>ok</option><option>network</option></select></label><button id="save">保存模拟模式</button><button id="retry">立即处理可重试队列</button><small>不重发 uncertain；这是避免重复群消息的人工核查状态。</small><h2>咨询与通知预览</h2><p id="status"></p><div id="records"></div><script>async function load(){const r=await fetch('/__local/data');document.getElementById('status').textContent=r.ok?'所有回执均为本地模拟，不代表真群发送':'请先在后台登录';if(!r.ok)return;const x=await r.json();const root=document.getElementById('records');root.replaceChildren();for(const p of x.previews){const h=document.createElement('h3');h.textContent=p.channel+' · '+p.at+' · revision '+p.revision;const pre=document.createElement('pre');pre.textContent=p.text;root.append(h,pre);}const pre=document.createElement('pre');pre.textContent=JSON.stringify({leads:x.leads,signal:x.signal,telegram:x.telegram},null,2);root.append(pre);}document.getElementById('save').onclick=async()=>{await fetch('/__local/mode',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({signal:document.getElementById('signal').value,telegram:document.getElementById('telegram').value})});await load();};document.getElementById('retry').onclick=async()=>{await fetch('/__local/retry',{method:'POST'});await load();};setInterval(load,2000);load();</script></html>`));
app.get('/__local/whatsapp',(_req,res)=>res.type('html').send('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><h1>仅本地模拟：WhatsApp 直达已拦截</h1><p>咨询及分流已保存到本地测试库，没有打开真实 WhatsApp。</p><a href="/__local">查看两渠道通知预览</a> · <a href="/admin/leads">本地后台</a>'));
app.use('/__local',cookieParser(secret),readSession,requireUser);
app.get('/__local/data',(_req,res)=>res.json({localOnly:true,previews:db.prepare('SELECT * FROM local_previews ORDER BY at DESC LIMIT 30').all(),leads:db.prepare('SELECT id,city,service FROM leads ORDER BY created_at DESC LIMIT 30').all(),signal:db.prepare('SELECT lead_id,status,attempts,revision,delivered_revision,last_error FROM signal_notifications').all(),telegram:db.prepare('SELECT lead_id,status,revision,delivered_revision,last_error FROM notifications').all()}));
app.use('/__local',express.json(),(req,res,next)=>{if(req.method==='POST'&&!new Set([origin,`http://127.0.0.1:${port}`,`http://localhost:${port}`]).has(req.get('origin')||'')){res.sendStatus(403);return;}next();});
app.post('/__local/mode',(req,res)=>{if(!['ok','network','429','unavailable','uncertain'].includes(req.body?.signal)||!['ok','network'].includes(req.body?.telegram)){res.sendStatus(400);return;}signalMode=req.body.signal;telegramMode=req.body.telegram;res.json({localOnly:true,signalMode,telegramMode});});
app.post('/__local/retry',async(_req,res)=>{db.exec('UPDATE signal_notifications SET next_attempt=0,edit_next_attempt=0;UPDATE notifications SET next_attempt=0,edit_next_attempt=0;');await deliverNotifications();res.json({localOnly:true});});
const backend=createApp();app.use((req,res,next)=>{if(req.path.startsWith('/api/')||req.path.startsWith('/uploads/')){res.setHeader('X-EUCOVE-LOCAL-FIXTURE','true');if(req.headers.origin===`http://127.0.0.1:${port}`||req.headers.origin===`http://localhost:${port}`)req.headers.origin=origin;backend(req,res,next);}else next();});
const vite=await createViteServer({configFile:false,plugins:[react(),{name:'isolated-local-review',enforce:'pre',transform(source,id){if(id.replaceAll('\\','/').endsWith('/src/reception-client.ts'))return source.replace('window.location.assign(url);',"window.location.assign('/__local/whatsapp?destination='+encodeURIComponent(url));");},transformIndexHtml(html){return html.replace('<head>',`<head><script>document.addEventListener('DOMContentLoaded',()=>{const bar=document.createElement('a');bar.href='/__local';bar.textContent='本地隔离验收 · 模拟通知 / 不发真实消息';bar.style.cssText='display:block;position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#fff3dc;color:#542900;padding:8px;text-align:center;font:13px system-ui';document.body.append(bar);document.addEventListener('click',e=>{const a=e.target.closest?.('a');if(a&&a.href.startsWith('https://wa.me/')){e.preventDefault();location.assign('/__local/whatsapp');}},true);});window.open=()=>null;</script>`);}}],server:{middlewareMode:true,hmr:false,fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/data/**','**/server/**','**/signal-relay/**']}},appType:'spa'});
app.use(vite.middlewares);const server=app.listen(port,'0.0.0.0',()=>console.log(`Isolated local acceptance ready: ${origin}/__local (no external messaging)`));
const timer=setInterval(()=>void deliverNotifications().catch(()=>{}),1000);timer.unref();
writeFileSync(path.join(directory,'runtime.json'),JSON.stringify({pid:process.pid,origin,port,localOnly:true,database:path.join(directory,'fixture.sqlite'),started:new Date().toISOString()},null,2));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{clearInterval(timer);server.close();void vite.close();relay.server.close();relay.close();db.close();process.exit(0);});
