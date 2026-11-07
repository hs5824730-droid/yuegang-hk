import { z } from 'zod';
import { ReceptionError,type ReceptionDB } from './reception.js';
import {DEFAULT_WHATSAPP_PREFILL,validPrefillTemplate,type WhatsappPrefillConfig} from '../src/whatsapp-prefill.js';
const template=z.string().max(500).refine(validPrefillTemplate,'仅纯文本及城市/服务变量，不支持HTML、网址或未知变量 / Use plain text and city/service variables only');
export const whatsappPrefillSchema=z.strictObject({zh:template,en:template,expectedVersion:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER)});
export async function getWhatsappPrefill(db:ReceptionDB):Promise<WhatsappPrefillConfig>{
 const row=(await db.all("SELECT data,version,updated_at FROM reception_settings WHERE key='whatsapp_prefill'"))[0];
 return row?{...JSON.parse(row.data),version:Number(row.version),updatedAt:row.updated_at}:{...DEFAULT_WHATSAPP_PREFILL,version:1};
}
export async function saveWhatsappPrefill(db:ReceptionDB,body:unknown){
 const {zh,en,expectedVersion}=whatsappPrefillSchema.parse(body);
 const rows=await db.all("UPDATE reception_settings SET data=?,version=version+1,updated_at=? WHERE key='whatsapp_prefill' AND version=? RETURNING data,version,updated_at",[JSON.stringify({zh,en}),new Date().toISOString(),expectedVersion]);
 if(!rows.length)throw new ReceptionError(409,'进线语已在其他窗口修改，请先重新载入 / The template changed in another window; reload before saving');
 return {...JSON.parse(rows[0].data),version:Number(rows[0].version),updatedAt:rows[0].updated_at} as WhatsappPrefillConfig;
}
