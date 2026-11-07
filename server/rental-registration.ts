import {rentalRegistrationSchema,registrationPatchSchema,type RentalRegistrationRecord} from '../src/rental-registration.js';
import {ReceptionError,type ReceptionDB} from './reception.js';
import type {User} from './schema.js';

async function fingerprint(value:unknown){const b=new TextEncoder().encode(JSON.stringify(value));return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join('');}
export async function saveRentalRegistration(db:ReceptionDB,body:unknown){
 const parsed=rentalRegistrationSchema.safeParse(body);
 if(!parsed.success)throw new ReceptionError(400,'登记资料不完整或格式有误 / Please check the registration fields');
 const {requestId,website,...data}=parsed.data;if(website)throw new ReceptionError(400,'无法提交 / Unable to submit');
 if(data.availableWhen!=='date')data.availableDate='';
 const hash=await fingerprint(data),id=crypto.randomUUID(),now=new Date().toISOString();
 await db.batch([{sql:'INSERT INTO rental_registrations(id,request_id,request_hash,data,city,created_at,updated_at) SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM rental_registrations WHERE request_id=?) ON CONFLICT(request_id) DO NOTHING',args:[id,requestId,hash,JSON.stringify(data),data.city||null,now,now,requestId]}]);
 const [record]=await db.all('SELECT id,request_hash,created_at FROM rental_registrations WHERE request_id=?',[requestId]);
 if(!record||record.request_hash!==hash)throw new ReceptionError(409,'此提交编号已用于其他资料，请核对回执 / This submission already contains different details');
 return {created:record.id===id,receipt:{id:record.id,createdAt:record.created_at}};
}
const select=`SELECT r.*,(SELECT name FROM users WHERE id=r.assigned_to) AS assigned_name,s.status AS sync_status,s.attempts,s.last_error,s.sent_at,s.revision,s.delivered_revision FROM rental_registrations r JOIN rental_registration_sync s ON s.registration_id=r.id`;
export const registrationOutput=(r:Record<string,any>):RentalRegistrationRecord=>({...JSON.parse(r.data),id:r.id,seq:r.seq,assignedTo:r.assigned_to||null,assignedToName:r.assigned_name||'',status:r.status,followUp:r.follow_up,version:r.version,createdAt:r.created_at,sync:{status:r.sync_status,attempts:r.attempts,error:r.last_error,sentAt:r.sent_at,revision:r.revision,deliveredRevision:r.delivered_revision}});
function allowed(user:User){if(!['admin','manager','assistant'].includes(user.role))throw new ReceptionError(403,'没有登记资料访问权限 / Registration access denied');}
export async function registrationAdmin(db:ReceptionDB,user:User,method:string,path:string,body?:unknown){
 allowed(user);const match=path.match(/^\/api\/admin\/rental-registrations(?:\/([a-f0-9-]{36})(?:\/(retry))?)?$/);if(!match)throw new ReceptionError(404,'记录不存在 / Not found');
 const id=match[1];
 if(!id&&method==='GET'){const rows=await db.all(select+(user.role==='admin'?'':' WHERE r.city=?')+' ORDER BY r.created_at DESC LIMIT 1000',user.role==='admin'?[]:[user.city]);return {records:rows.map(registrationOutput)};}
 const [row]=await db.all(select+' WHERE r.id=?',[id]);if(!row||user.role!=='admin'&&row.city!==user.city)throw new ReceptionError(404,'记录不存在 / Not found');
 if(method==='GET')return {record:registrationOutput(row)};
 if(method==='PATCH'&&!match[2]){
  const parsed=registrationPatchSchema.safeParse(body);if(!parsed.success)throw new ReceptionError(400,'跟进信息格式有误 / Invalid follow-up');
  const p=parsed.data,updated=await db.all('UPDATE rental_registrations SET status=?,follow_up=?,version=version+1,updated_at=? WHERE id=? AND version=? RETURNING id',[p.status,p.followUp,new Date().toISOString(),id,p.version]);
  if(!updated.length)throw new ReceptionError(409,'记录已更新，请刷新后再保存 / Record changed; refresh first');
  return {record:registrationOutput((await db.all(select+' WHERE r.id=?',[id]))[0])};
 }
 if(method==='POST'&&match[2]==='retry'){
  if(user.role!=='admin')throw new ReceptionError(403,'需要管理员权限 / Admin required');
  await db.batch([{sql:"UPDATE rental_registration_sync SET status='pending',attempts=0,next_attempt=CASE WHEN last_error='sheets_network_unknown' OR last_error LIKE 'sheets_http_5%' THEN MAX(next_attempt,?) ELSE 0 END WHERE registration_id=? AND status<>'synced' AND claimed_until<?",args:[Date.now(),id,Date.now()]}]);return {queued:true};
 }
 throw new ReceptionError(405,'不支持此操作 / Method not allowed');
}
