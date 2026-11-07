/** Synthetic, isolated acceptance report. No production secrets or external messaging. */
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createHash, createHmac } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { applyTestMigrations } from '../server/test-migrations';
import { importMetaLead, META_IMPORT_PATH } from '../server/meta-lead-import';
import { deliverOutbox } from '../server/notification-delivery';
import { deliverSignal } from '../server/signal-delivery';

const sql=new DatabaseSync(':memory:');
await applyTestMigrations({prepare:q=>({run:async()=>sql.prepare(q).run()})});
sql.exec("UPDATE notification_channels SET enabled=1,enabled_at='2000-01-01T00:00:00Z' WHERE channel='signal'");
const db={all:async(q:string,args:unknown[]=[])=>sql.prepare(q).all(...args as any[]) as Record<string,any>[],batch:async(qs:{sql:string;args:unknown[]}[])=>{
 sql.exec('BEGIN IMMEDIATE');try{for(const q of qs)sql.prepare(q.sql).run(...q.args as any[]);sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}
}};
const settings={secret:'local-fixture-meta-secret-12345678901234567890',spreadsheetId:'fixture-sheet',formIds:'123456789',signalEnabled:true};
const now=Date.now(),payload={spreadsheetId:'fixture-sheet',leadId:'123456789012345',formId:'123456789',submittedAt:new Date(now).toISOString(),name:'',phone:'+61 400 000 001',cities:['悉尼','墨尔本'],services:['寻找租客','长期托管'],campaignName:'本机虚构测试',adName:'图片测试'};
const request=()=>{const raw=JSON.stringify(payload),time=String(now),digest=createHash('sha256').update(raw).digest('hex');return new Request('https://eucove.com'+META_IMPORT_PATH,{method:'POST',headers:{'Content-Type':'application/json','x-eucove-time':time,'x-eucove-signature':createHmac('sha256',settings.secret).update([time,'POST',META_IMPORT_PATH,digest].join('\n')).digest('hex')},body:raw});};
const first=await importMetaLead(request(),settings,db,now),repeat=await importMetaLead(request(),settings,db,now);
const previews:{channel:string;text:string}[]=[];
globalThis.fetch=async(input,init)=>{
 const host=new URL(String(input)).hostname;
 if(!['api.telegram.org','fixture-meta.up.railway.app'].includes(host))throw Error('Local review forbids external requests');
 const body=JSON.parse(String(init?.body));previews.push({channel:host==='api.telegram.org'?'TG':'Signal',text:body.text});
 return Response.json(host==='api.telegram.org'?{ok:true,result:{message_id:1}}:{ok:true,timestamp:123456789});
};
for(let i=0;i<2;i++){
 await deliverOutbox(db,{token:'fixture-only',chatId:'fixture-only',appUrl:'https://eucove.com'});
 await deliverSignal(db,{url:'https://fixture-meta.up.railway.app',secret:'fixture-relay-secret-12345678901234567890',appUrl:'https://eucove.com'});
}
const count=sql.prepare('SELECT COUNT(*) n FROM leads').get()!.n;
const assigned=sql.prepare('SELECT assigned_to FROM leads').get()!.assigned_to;
if(first.status!==201||repeat.status!==200||count!==1||assigned!==null||previews.length!==2||previews[0].text!==previews[1].text)throw Error('Local review failed');
const report=[
 'EUCOVE｜Meta 即时表单通知 · 本机验收',
 '本页全部为虚构数据；真实 Google 表格未被写入，TG 和 Signal 均未实际发送。',
 '',
 '已验证：首次导入成功；重复导入仍只有 1 条咨询；两个渠道各产生 1 份模拟通知；未自动分配客户。',
 '正式接入：Google 表格「3008房产中介」/「工作表1」。',
 '当前状态：脚本已保存，自动同步关闭；网站接收接口尚未部署。',
 '启用后：约每分钟检查新记录；启用前历史线索不补发。姓名未收集时显示“未提供”。',
 '',...previews.flatMap(p=>[`${p.channel} 通知预览`, '────────────────────',p.text,'']),
 '表格状态“后台已接收”仅表示线索已进入后台；真实发送状态以后台通知队列为准。',
].join('\n');
mkdirSync('data/meta-sheets-20261025',{recursive:true});
writeFileSync('data/meta-sheets-20261025/local-review.txt',report);
const port=5191,lan=Object.values(networkInterfaces()).flat().find(a=>a?.family==='IPv4'&&!a.internal&&/^192\.168\./.test(a.address))?.address;
const server=createServer((req,res)=>{if(req.url!=='/'&&req.url!=='/review'){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(report);});
server.listen(port,'0.0.0.0',()=>{
 const runtime={pid:process.pid,port,localUrl:`http://127.0.0.1:${port}/review`,lanUrl:lan?`http://${lan}:${port}/review`:null,isolated:true};
 writeFileSync('data/meta-sheets-20261025/review-runtime.json',JSON.stringify(runtime,null,2));console.log(JSON.stringify(runtime));
});
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{server.close();sql.close();process.exit(0);});
