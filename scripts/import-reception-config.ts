import { readFileSync } from 'node:fs';
import { db, transaction, audit } from '../server/db';
import { receptionReport, saveReception, type ReceptionDB } from '../server/reception';
const filename=process.argv[2];
if(!filename)throw new Error('Usage: npx tsx scripts/import-reception-config.ts <local-config.json>');
const adapter:ReceptionDB={all:async(sql,args=[])=>db.prepare(sql).all(...args as any[]) as any[],batch:async qs=>{transaction(()=>{for(const q of qs)db.prepare(q.sql).run(...q.args as any[])})}};
try {
 const input=JSON.parse(readFileSync(filename,'utf8'));
 const groupIds=new Set(input.targets.map((a:{groupId:string})=>a.groupId));
 const current=await receptionReport(adapter);
 await saveReception(adapter,{targets:[...current.targets.filter(a=>!groupIds.has(a.groupId)),...input.targets]});
 audit('local-operator','reception.local-config','groups');
 console.log('已更新指定本地接待组；未重置游标、未外联、未发送消息。');
} finally {db.close()}
