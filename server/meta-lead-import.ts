import { z } from 'zod';
import { isPhone } from '../src/enquiry-options.js';
import type { ReceptionDB } from './reception.js';
import { signalQueueSql } from './signal-delivery.js';

export const META_IMPORT_PATH = '/api/integrations/meta-leads';
export interface MetaImportSettings { secret?: string; spreadsheetId?: string; formIds?: string; signalEnabled: boolean; }
const text = (max: number) => z.string().trim().max(max).refine(v => !/[\x00-\x1f\x7f]/.test(v));
const schema = z.object({
  spreadsheetId: text(160).min(1), leadId: z.string().regex(/^\d{5,40}$/), formId: z.string().regex(/^\d{5,40}$/),
  submittedAt: z.iso.datetime({ offset: true }), name: text(100).default(''), phone: text(160).min(1).refine(isPhone),
  cities: z.array(text(80).min(1)).min(1).max(10), services: z.array(text(100).min(1)).min(1).max(10),
  campaignName: text(200).default(''), adName: text(200).default(''), startTime: text(200).optional(), salutation: text(100).optional(),
}).strict();
const cityMap: Record<string, string> = { 悉尼:'Sydney',墨尔本:'Melbourne',布里斯班:'Brisbane',珀斯:'Perth',阿德莱德:'Adelaide',堪培拉:'Canberra',其他:'other',其他城市:'other' };
const serviceMap: Record<string, string> = { 寻找租客:'letting',出租招租:'letting',房屋出租:'letting',长期托管:'management',买卖房屋:'other',装修服务:'renovation',装修翻新:'renovation',购房咨询:'buyer-advisory',置业咨询:'buyer-advisory',买房:'buying',卖房:'selling' };
const encoder = new TextEncoder();
const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), b=>b.toString(16).padStart(2,'0')).join('');
const reply = (data: unknown, status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function bodyText(request: Request) {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json') || Number(request.headers.get('Content-Length')) > 65536) throw new Error('body');
  const reader=request.body?.getReader();if(!reader)throw new Error('body');
  const chunks:Uint8Array[]=[];let length=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>65536){await reader.cancel();throw new Error('body');}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(bytes);
}
/** HMAC-authenticated server import; never invokes reception allocation. */
export async function importMetaLead(request: Request, settings: MetaImportSettings, db: ReceptionDB, now=Date.now()) {
  const allowedForms=(settings.formIds||'').split(',').map(s=>s.trim()).filter(Boolean);
  if (!settings.secret || settings.secret.length<32 || !settings.spreadsheetId || !allowedForms.length) return reply({error:'Meta 表格接入尚未启用'},503);
  if(request.method!=='POST')return reply({error:'Method not allowed'},405);
  const time=request.headers.get('x-eucove-time')||'',signature=request.headers.get('x-eucove-signature')||'';
  if(!/^\d{13}$/.test(time)||Math.abs(now-Number(time))>300000||!/^[a-f0-9]{64}$/.test(signature))return reply({error:'接入验证失败'},401);
  let raw:string;try{raw=await bodyText(request);}catch{return reply({error:'请求格式无效'},400);}
  const key=await crypto.subtle.importKey('raw',encoder.encode(settings.secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const signed=[time,'POST',META_IMPORT_PATH,await digest(raw)].join('\n');
  if(!await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g)!,h=>parseInt(h,16)),encoder.encode(signed)))return reply({error:'接入验证失败'},401);
  let parsed:unknown;try{parsed=JSON.parse(raw);}catch{return reply({error:'请求格式无效'},400);}
  const result=schema.safeParse(parsed);if(!result.success)return reply({error:'客户记录字段无效'},422);
  const input=result.data;
  if(input.spreadsheetId!==settings.spreadsheetId||!allowedForms.includes(input.formId))return reply({error:'表格或表单未授权'},403);
  if(Date.parse(input.submittedAt)>now+300000)return reply({error:'客户提交时间无效'},422);
  const selectedCities=[...new Set(input.cities.map(c=>cityMap[c]||c))],selectedServices=[...new Set(input.services)];
  // Multi-select metadata is authoritative; do not choose one answer arbitrarily.
  const city=selectedCities.length===1?selectedCities[0]:'other';
  const service=selectedServices.length===1?(serviceMap[selectedServices[0]]||'other'):'other';
  const stable=await digest('meta_instant_form:'+input.leadId);
  const requestId=`${stable.slice(0,8)}-${stable.slice(8,12)}-5${stable.slice(13,16)}-8${stable.slice(17,20)}-${stable.slice(20,32)}`;
  const meta={leadId:input.leadId,formId:input.formId,submittedAt:input.submittedAt,cities:selectedCities,services:selectedServices,campaignName:input.campaignName,adName:input.adName,...(input.startTime?{startTime:input.startTime}:{}),...(input.salutation?{salutation:input.salutation}:{})};
  const data={name:input.name,contact:input.phone,contactMethod:'phone',city,service,language:'zh',message:'',source:'meta_instant_form',manualAssignment:true,meta};
  const hash=await digest(JSON.stringify(data));
  const prior=await db.all('SELECT id,request_hash FROM leads WHERE request_id=?',[requestId]);
  if(prior.length)return prior[0].request_hash===hash?reply({ok:true,id:prior[0].id,duplicate:true}):reply({error:'同一 Meta 线索内容变化，需人工核对'},409);
  const id=crypto.randomUUID(),owner=crypto.randomUUID(),createdAt=new Date(now).toISOString(),contactKey='meta:'+input.phone.replace(/\D/g,'');
  await db.batch([
    {sql:'INSERT INTO owners(id,contact_key,contact,name,created_at) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM leads WHERE request_id=?) ON CONFLICT(contact_key) DO NOTHING',args:[owner,contactKey,input.phone,input.name,createdAt,requestId]},
    {sql:"INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,assigned_to,data,created_at,moving_status) SELECT ?,?,?,o.id,?,?,NULL,?,?,'none' FROM owners o WHERE o.contact_key=? AND NOT EXISTS(SELECT 1 FROM leads WHERE request_id=?) ON CONFLICT(request_id) DO NOTHING",args:[id,requestId,hash,city,service,JSON.stringify(data),createdAt,contactKey,requestId]},
    {sql:'INSERT INTO notifications(id,lead_id,sync_enabled) SELECT ?,id,1 FROM leads WHERE request_id=? AND request_hash=? ON CONFLICT(lead_id) DO NOTHING',args:[crypto.randomUUID(),requestId,hash]},
    {sql:signalQueueSql,args:[crypto.randomUUID(),0,requestId,hash,settings.signalEnabled?1:0]},
  ]);
  const rows=await db.all('SELECT id,request_hash FROM leads WHERE request_id=?',[requestId]);
  if(!rows.length)throw new Error('meta_import_not_saved');
  if(rows[0].request_hash!==hash)return reply({error:'同一 Meta 线索内容变化，需人工核对'},409);
  return reply({ok:true,id:rows[0].id,duplicate:rows[0].id!==id},rows[0].id===id?201:200);
}
