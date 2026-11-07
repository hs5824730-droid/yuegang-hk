import { getWhatsappPrefill } from './whatsapp-prefill.js';
import { renderWhatsappPrefill,whatsappDestination } from '../src/whatsapp-prefill.js';
import { normalizeService } from '../src/enquiry-options.js';
import { z } from 'zod';
import {marketingPath} from '../src/meta-pixel-policy.js';
import {targetUrl} from './lead-routing.js';
import { cities } from './policy.js';
export const receptionCities = [...cities, 'other'] as const;
export type ReceptionCity = typeof receptionCities[number];
export function receptionCity(value: string): ReceptionCity {
 const aliases: Record<string, ReceptionCity> = { '墨尔本':'Melbourne', '悉尼':'Sydney', '珀斯':'Perth', '阿德莱德':'Adelaide', '堪培拉':'Canberra', '布里斯班':'Brisbane' };
 return aliases[value.trim()] || receptionCities.find(city => city.toLowerCase() === value.trim().toLowerCase()) || 'other';
}
export type ReceptionChannel = 'whatsapp' | 'wechat';
const channelSchema = z.enum(['whatsapp', 'wechat']);
export const receptionTargetSchema = z.object({
 id:z.uuid(), channel:channelSchema, enabled:z.boolean(),queueOrder:z.number().int().min(0).max(10000).optional(),
 displayName:z.string().trim().max(80).optional(),originalName:z.string().trim().max(80).optional(),
 originalFileName:z.string().trim().max(160).refine(v=>!/[\\/<>\u0000-\u001f\u007f]/.test(v)&&v!=='.'&&v!=='..','仅文件名 / Filename only').optional(),
 fileNameSource:z.enum(['upload','archive']).optional(),note:z.string().trim().max(300).optional(),
 cities:z.array(z.enum(receptionCities)).max(7).default([]).transform(values=>[...new Set(values)]),
 groupId:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),groupName:z.string().trim().min(1).max(80),
 groupOrder:z.number().int().min(0).max(10000),targetOrder:z.number().int().min(0).max(10000),value:z.string().max(180),
}).refine(t=>!t.enabled&&!t.value || (t.channel==='whatsapp'? /^\+[1-9]\d{6,14}$/.test(t.value):/^\/uploads\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(t.value)), 'WhatsApp 请填写 +国家码；微信仅使用本站上传二维码 / Use international WhatsApp number or uploaded QR image');
export const receptionConfigSchema=z.object({targets:z.array(receptionTargetSchema).max(100)}).refine(c=>new Set(c.targets.map(t=>t.id)).size===c.targets.length,'目标 ID 重复 / Duplicate target ID');
export type ReceptionTarget=z.input<typeof receptionTargetSchema>;
export const assignmentSchema=z.object({requestId:z.uuid(),channel:channelSchema,leadRequestId:z.uuid().optional(),city:z.string().trim().min(1).max(80).optional(),service:z.string().max(40).refine(v=>!!normalizeService(v)).optional(),language:z.enum(['zh','en']).optional(),source:z.literal('website_direct').optional(),pagePath:z.string().max(120).refine(v=>marketingPath(v)===v||v==='/contact').optional(),contactMethod:z.enum(['phone','wechat','whatsapp']).optional()}).refine(v=>!v.source||(!v.leadRequestId&&!!v.pagePath),'Direct contact requires a public page and no enquiry').refine(v=>!v.contactMethod||(v.source==='website_direct'&&!v.leadRequestId&&v.channel===(v.contactMethod==='wechat'?'wechat':'whatsapp')),'Contact method must match its independent target pool');
export const receptionEventSchema=z.object({requestId:z.uuid(),assignmentId:z.uuid(),channel:channelSchema,type:z.enum(['whatsapp_click','wechat_qr_view','phone_dial'])});
export interface ReceptionDB { all(sql:string,args?:unknown[]):Promise<Record<string,any>[]>;batch(queries:{sql:string;args:unknown[]}[]):Promise<void>; }
export class ReceptionError extends Error {constructor(public status:number,message:string){super(message)}}
export const receptionMigration=`
CREATE TABLE IF NOT EXISTS reception_targets(id TEXT PRIMARY KEY,channel TEXT NOT NULL CHECK(channel IN ('whatsapp','wechat')),position INTEGER NOT NULL,enabled INTEGER NOT NULL,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reception_channel_cursor(channel TEXT PRIMARY KEY CHECK(channel IN ('whatsapp','wechat')),ordinal INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO reception_channel_cursor(channel,ordinal) VALUES('whatsapp',0),('wechat',0);
CREATE TABLE IF NOT EXISTS reception_channel_assignments(id TEXT PRIMARY KEY,channel TEXT NOT NULL CHECK(channel IN ('whatsapp','wechat')),request_id TEXT NOT NULL,lead_id TEXT REFERENCES leads(id),target_data TEXT,created_at TEXT NOT NULL,UNIQUE(channel,request_id));
CREATE TABLE IF NOT EXISTS reception_channel_events(request_id TEXT NOT NULL,channel TEXT NOT NULL CHECK(channel IN ('whatsapp','wechat')),assignment_id TEXT NOT NULL REFERENCES reception_channel_assignments(id),type TEXT NOT NULL CHECK(type IN ('whatsapp_click','wechat_qr_view')),created_at TEXT NOT NULL,PRIMARY KEY(channel,request_id));
CREATE INDEX IF NOT EXISTS reception_channel_event_assignment ON reception_channel_events(assignment_id);
CREATE INDEX IF NOT EXISTS reception_channel_assignment_created ON reception_channel_assignments(created_at);
CREATE TRIGGER IF NOT EXISTS reception_channel_allocate AFTER INSERT ON reception_channel_assignments
WHEN EXISTS(SELECT 1 FROM reception_targets WHERE enabled=1 AND channel=NEW.channel)
BEGIN
 UPDATE reception_channel_assignments SET target_data=(SELECT data FROM reception_targets WHERE enabled=1 AND channel=NEW.channel ORDER BY position,id LIMIT 1 OFFSET (SELECT ordinal % (SELECT COUNT(*) FROM reception_targets WHERE enabled=1 AND channel=NEW.channel) FROM reception_channel_cursor WHERE channel=NEW.channel)) WHERE id=NEW.id;
 UPDATE reception_channel_cursor SET ordinal=ordinal+1 WHERE channel=NEW.channel;
END;
`;
export async function assignReception(db:ReceptionDB,body:unknown){
 const input=assignmentSchema.parse(body);let context={city:input.city,service:input.service,language:input.language};let leadId:string|null=null,city:ReceptionCity|null=input.city?receptionCity(input.city):null;
 if(input.leadRequestId){const lead=(await db.all('SELECT id,city,service,data FROM leads WHERE request_id=?',[input.leadRequestId]))[0];if(!lead)throw new ReceptionError(400,'咨询尚未提交成功 / Enquiry has not been submitted');leadId=String(lead.id);const savedCity=receptionCity(String(lead.city));if(city&&city!==savedCity)throw new ReceptionError(409,'城市与已保存咨询不一致 / City differs from saved enquiry');city=savedCity;const saved=JSON.parse(lead.data||'{}');context={city:String(lead.city),service:lead.service||saved.service,language:saved.language||'zh'};}
 const settings=input.channel==='whatsapp'&&input.contactMethod!=='phone'?await getWhatsappPrefill(db):null;const prefill=settings?renderWhatsappPrefill(settings,context):null;
 const scope=city?'city':'global';
 const direct=input.source?JSON.stringify({source:input.source,pagePath:input.pagePath,city:input.city,service:normalizeService(input.service),language:input.language||'zh',...(input.contactMethod?{contactMethod:input.contactMethod}:{})}):null;
 await db.batch([{sql:'INSERT INTO reception_channel_assignments(id,channel,request_id,lead_id,created_at,routing_city,routing_scope,routing_version,outcome,whatsapp_text,whatsapp_template_version,direct_context) VALUES(?,?,?,?,?,?,?,1,?,?,?,?) ON CONFLICT(channel,request_id) DO NOTHING',args:[crypto.randomUUID(),input.channel,input.requestId,leadId,new Date().toISOString(),city,scope,scope==='city'?'no_city_match':'unconfigured',prefill,settings?.version??null,direct]}]);
 const row=(await db.all('SELECT * FROM reception_channel_assignments WHERE channel=? AND request_id=?',[input.channel,input.requestId]))[0];
 if((input.leadRequestId&&row.lead_id!==leadId)||(input.city&&row.routing_city!==city)||(input.leadRequestId&&Number(row.routing_version)>0&&row.routing_city!==city))throw new ReceptionError(409,'此次分配已绑定其他城市或咨询 / Assignment is bound to a different city or enquiry');
 if(input.source&&(row.lead_id!==null||row.direct_context!==direct||row.routing_city!==city))throw new ReceptionError(409,'此次直联已绑定其他上下文 / Direct contact is bound to a different context');
 const target:(ReceptionTarget&{prefillText?:string})|null=row.target_data?JSON.parse(row.target_data):null;
 const method=row.direct_context?(JSON.parse(row.direct_context).contactMethod||row.channel):row.channel;
 return {id:row.id as string,channel:input.channel,contactMethod:method,city:row.routing_city as ReceptionCity|null,scope:row.routing_scope as 'city'|'global',outcome:target?'assigned':row.routing_scope==='city'?'no_city_match':'unconfigured',target:target?{id:target.id,value:target.value,url:method==='phone'?(/^\+[1-9]\d{6,14}$/.test(target.value)?'tel:'+target.value:null):input.channel==='whatsapp'?whatsappDestination(target.value,target.prefillText||''):target.value}:null};
}
export async function receptionEvent(db:ReceptionDB,body:unknown){
 const input=receptionEventSchema.parse(body);const row=(await db.all('SELECT target_data,direct_context FROM reception_channel_assignments WHERE id=? AND channel=?',[input.assignmentId,input.channel]))[0];
 const phone=row?.direct_context&&JSON.parse(row.direct_context).contactMethod==='phone';
 const expected=phone?'phone_dial':input.channel==='whatsapp'?'whatsapp_click':'wechat_qr_view';
 if(!row?.target_data||input.type!==expected)throw new ReceptionError(404,'分流方式不匹配 / Contact method unavailable');
 if(phone){
  const previous=(await db.all('SELECT assignment_id FROM reception_phone_events WHERE request_id=?',[input.requestId]))[0];
  if(previous&&previous.assignment_id!==input.assignmentId)throw new ReceptionError(409,'动作已绑定其他分配 / Action belongs to another assignment');
  await db.batch([{sql:'INSERT INTO reception_phone_events(request_id,assignment_id,created_at) VALUES(?,?,?) ON CONFLICT DO NOTHING',args:[input.requestId,input.assignmentId,new Date().toISOString()]}]);
 }else await db.batch([{sql:'INSERT INTO reception_channel_events(request_id,channel,assignment_id,type,created_at) VALUES(?,?,?,?,?) ON CONFLICT(channel,request_id) DO NOTHING',args:[input.requestId,input.channel,input.assignmentId,input.type,new Date().toISOString()]}]);return {ok:true};
}
export async function saveReception(db:ReceptionDB,body:unknown){
 const {targets}=receptionConfigSchema.parse(body);
 for(const target of targets){if(targets.some(t=>t.groupId===target.groupId&&(t.groupName!==target.groupName||t.groupOrder!==target.groupOrder)))throw new ReceptionError(400,'同组名称和顺序需要一致 / Group name and order must match');}
 // Existing JSON remains valid. Explicit per-channel queue order uses the existing position column.
 // Labels never constrain a manual cross-group move; neither cursor nor history is reset.
 const legacy=[...targets].sort((a,b)=>a.groupOrder-b.groupOrder||a.targetOrder-b.targetOrder);
 const legacyIndex=new Map(legacy.map((t,i)=>[t.id,i]));
 targets.sort((a,b)=>a.channel.localeCompare(b.channel)||(a.queueOrder??legacyIndex.get(a.id)!)-(b.queueOrder??legacyIndex.get(b.id)!));
 await db.batch([{sql:targets.length?'DELETE FROM reception_targets WHERE id NOT IN ('+targets.map(()=>'?').join(',')+')':'DELETE FROM reception_targets',args:targets.map(t=>t.id)},...targets.map((t,index)=>({sql:'INSERT INTO reception_targets(id,channel,position,enabled,data) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET channel=excluded.channel,position=excluded.position,enabled=excluded.enabled,data=excluded.data',args:[t.id,t.channel,index,Number(t.enabled),JSON.stringify(t)]}))]);return {ok:true};
}
export async function receptionReport(db:ReceptionDB){
 const targets=(await db.all('SELECT data FROM reception_targets ORDER BY position,id')).map(r=>({...JSON.parse(r.data),cities:JSON.parse(r.data).cities||[]}) as ReceptionTarget);
 const totals=await db.all('SELECT channel,COUNT(*) AS visits,COUNT(target_data) AS assigned FROM reception_channel_assignments GROUP BY channel');
 const events=await db.all("SELECT channel,type,COUNT(*) AS count FROM reception_channel_events GROUP BY channel,type UNION ALL SELECT 'whatsapp' AS channel,'phone_dial' AS type,COUNT(*) AS count FROM reception_phone_events HAVING COUNT(*)>0");
 const records=(await db.all(`SELECT a.*,(SELECT recipient FROM notification_recipients r WHERE r.source='direct' AND r.source_id=a.id) AS reception_recipient,((SELECT COUNT(*) FROM reception_channel_events e WHERE e.assignment_id=a.id)+(SELECT COUNT(*) FROM reception_phone_events e WHERE e.assignment_id=a.id)) AS actions,(SELECT json_group_array(json_object('transport',n.transport,'status',n.status,'syncStatus',CASE WHEN n.status<>'sent' THEN n.status WHEN n.revision<=n.delivered_revision THEN 'synced' WHEN n.edit_attempts>=5 THEN 'failed' ELSE 'pending' END,'attempts',n.attempts,'sentAt',n.sent_at,'error',n.last_error)) FROM direct_contact_notifications n WHERE n.assignment_id=a.id) AS direct_notifications FROM reception_channel_assignments a ORDER BY created_at DESC,id LIMIT 200`)).map(r=>{const target=r.target_data?JSON.parse(r.target_data):null;return {id:r.id,channel:r.channel,leadId:r.lead_id,city:r.routing_city,scope:r.routing_scope,outcome:target?'assigned':r.routing_scope==='city'?'no_city_match':'unconfigured',target,destinationUrl:target?r.direct_context&&JSON.parse(r.direct_context).contactMethod==='phone'&&/^\+[1-9]\d{6,14}$/.test(target.value)?'tel:'+target.value:targetUrl(r.channel,target.value,target.prefillText||''):null,createdAt:r.created_at,receptionRecipient:r.reception_recipient||'',actions:r.actions,directContext:r.direct_context?JSON.parse(r.direct_context):null,notifications:JSON.parse(r.direct_notifications||'[]')};});
 const breakdown=await db.all(`SELECT channel,json_extract(target_data,'$.groupId') AS groupId,json_extract(target_data,'$.groupName') AS groupName,json_extract(target_data,'$.id') AS targetId,COUNT(*) AS assignments,SUM((SELECT COUNT(*) FROM reception_channel_events e WHERE e.assignment_id=a.id)+(SELECT COUNT(*) FROM reception_phone_events e WHERE e.assignment_id=a.id)) AS actions FROM reception_channel_assignments a WHERE target_data IS NOT NULL GROUP BY channel,groupId,targetId ORDER BY channel,groupId,targetId`);
 return {targets,totals,events,records,breakdown};
}
