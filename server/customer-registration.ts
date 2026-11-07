import {customerRegistrationSchema,customerFollowUpSchema,type CustomerRegistrationRecord} from '../src/customer-registration';
import {ReceptionError,receptionCity,type ReceptionDB} from './reception';
import type {User} from './schema';

const normalizeContact=(v:string,method:string)=>method==='email'?v.trim().toLowerCase():method==='wechat'?v.trim():v.replace(/\D/g,'');
export async function saveCustomerRegistration(db:ReceptionDB,body:unknown,resolveListing?:(id:string)=>Promise<{city:string;address:string}|null>){
 const parsed=customerRegistrationSchema.safeParse(body);
 if(!parsed.success)throw new ReceptionError(400,'请检查需求和联系资料 / Check your requirements and contact details');
 const {requestId,website,leadRequestId,...data}=parsed.data;
 if(website)throw new ReceptionError(400,'无法提交 / Unable to submit');
 // Hash the validated original submission: retries remain stable if a listing is later changed or unpublished.
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({...data,leadRequestId})))),b=>b.toString(16).padStart(2,'0')).join('');
 const previous=(await db.all('SELECT id,request_hash,created_at,city FROM customer_registrations WHERE request_id=?',[requestId]))[0];
 if(previous){if(previous.request_hash!==hash)throw new ReceptionError(409,'此提交编号已有不同资料，请核对回执 / Reference already contains different details');return {created:false,receipt:{id:previous.id,createdAt:previous.created_at},city:previous.city};}
 let propertyAddress:string|undefined;
 if(data.propertyId){const [property]=await db.all('SELECT city,data FROM properties WHERE id=? AND published=1',[data.propertyId]);if(!property||JSON.parse(property.data).status!=='sale')throw new ReceptionError(400,'该房源暂未开放咨询，请返回购房登记填写需求 / Listing unavailable; register your buying needs instead');const p=JSON.parse(property.data);data.city=property.city;propertyAddress=[p.address,p.suburb].filter(Boolean).join(', ');}
 if(data.listingId){const listing=resolveListing?await resolveListing(data.listingId):null;if(!listing)throw new ReceptionError(400,'该房源暂未开放咨询，请返回购房登记填写需求 / Listing unavailable; register your buying needs instead');data.city=listing.city;propertyAddress=listing.address;}
 let relatedLeadId:string|null=null;
 if(leadRequestId){const [lead]=await db.all('SELECT id,city,service,data FROM leads WHERE request_id=?',[leadRequestId]);const original=lead?JSON.parse(lead.data):null;const matching=original&&original.contactMethod===data.contactMethod&&normalizeContact(original.contact,data.contactMethod)===normalizeContact(data.contact,data.contactMethod);if(!matching||data.city&&receptionCity(data.city)!==receptionCity(lead.city))throw new ReceptionError(400,'关联咨询与联系资料或城市不一致，请核对或作为新需求登记 / Linked enquiry details differ; check them or register a new request');relatedLeadId=lead.id;if(!data.city)data.city=lead.city;}
 const id=crypto.randomUUID(),now=new Date().toISOString(),city=data.city?receptionCity(data.city):null;
 if(city&&city!=='other')data.city=city;
 await db.batch([{sql:'INSERT INTO customer_registrations(id,request_id,request_hash,data,category,city,related_lead_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(request_id) DO NOTHING',args:[id,requestId,hash,JSON.stringify({...data,...(propertyAddress?{propertyAddress}:{})}),data.type,city,relatedLeadId,now,now]}]);
 const [row]=await db.all('SELECT id,request_hash,created_at,city FROM customer_registrations WHERE request_id=?',[requestId]);
 if(!row||row.request_hash!==hash)throw new ReceptionError(409,'此提交编号已有不同资料，请核对回执 / Reference already contains different details');
 return {created:row.id===id,receipt:{id:row.id,createdAt:row.created_at},city:row.city};
}
export const customerRegistrationOutput=(r:Record<string,any>):CustomerRegistrationRecord=>({...JSON.parse(r.data),id:r.id,category:r.category,status:r.status,followUp:r.follow_up,assignedTo:r.assigned_to,assignedToName:r.assigned_name||'',nextFollowUp:r.next_follow_up,relatedLeadId:r.related_lead_id,version:r.version,createdAt:r.created_at,updatedAt:r.updated_at,...(r.sync_status?{sync:{status:r.sync_status,attempts:r.attempts,lastError:r.last_error,sentAt:r.sent_at}}:{})});
const select='SELECT r.*,(SELECT name FROM users WHERE id=r.assigned_to) AS assigned_name,s.status AS sync_status,s.attempts,s.last_error,s.sent_at FROM customer_registrations r LEFT JOIN customer_registration_sync s ON s.registration_id=r.id';
export async function customerRegistrationAdmin(db:ReceptionDB,user:User,method:string,path:string,body?:unknown){
 if(!['admin','manager','assistant'].includes(user.role))throw new ReceptionError(403,'没有登记资料访问权限 / Registration access denied');
 const match=path.match(/^\/api\/admin\/customer-registrations(?:\/([a-f0-9-]{36})(\/retry)?)?$/);if(!match)throw new ReceptionError(404,'记录不存在 / Not found');
 if(!match[1]&&method==='GET')return {records:(await db.all(select+(user.role==='admin'?'':' WHERE r.city=?')+' ORDER BY r.created_at DESC LIMIT 1000',user.role==='admin'?[]:[user.city])).map(customerRegistrationOutput)};
 const [row]=await db.all(select+' WHERE r.id=?',[match[1]||'']);
 if(!row||user.role!=='admin'&&(!user.city||row.city!==user.city))throw new ReceptionError(404,'记录不存在 / Not found');
 if(match[2]){
  if(method!=='POST')throw new ReceptionError(405,'不支持此操作 / Method not allowed');
  if(user.role!=='admin')throw new ReceptionError(403,'仅管理员可重试同步 / Administrator required');
  await db.batch([{sql:"UPDATE customer_registration_sync SET status='pending',attempts=0,next_attempt=CASE WHEN last_error='sheets_network_unknown' OR last_error LIKE 'sheets_http_5%' THEN next_attempt ELSE 0 END WHERE registration_id=? AND claimed_until<=?",args:[row.id,Date.now()]}]);
  return {record:customerRegistrationOutput((await db.all(select+' WHERE r.id=?',[row.id]))[0])};
 }
 if(method==='GET')return {record:customerRegistrationOutput(row)};
 if(method!=='PATCH')throw new ReceptionError(405,'不支持此操作 / Method not allowed');
 const parsed=customerFollowUpSchema.safeParse(body);if(!parsed.success)throw new ReceptionError(400,'跟进信息格式有误 / Invalid follow-up');
 const p=parsed.data,data=JSON.parse(row.data);
 if(p.category!==row.category&&!((data.type==='buying'||data.type==='advisory'&&data.details.service==='buyer-advisory')&&['buying','advisory'].includes(p.category)))throw new ReceptionError(400,'此需求不能转为该分类 / This request cannot use that category');
 if(user.role==='assistant'&&p.assignedTo!==row.assigned_to)throw new ReceptionError(403,'助理不能调整负责人 / Assistants cannot reassign');
 if(p.assignedTo&&p.assignedTo!==row.assigned_to){const [assignee]=await db.all('SELECT role,city FROM users WHERE id=?',[p.assignedTo]);if(!assignee||!['admin','manager','assistant'].includes(assignee.role)||assignee.role!=='admin'&&(!row.city||row.city==='other'||assignee.city!==row.city))throw new ReceptionError(400,'负责人必须具备该城市权限 / Assignee must have access to this city');}
 const updated=await db.all('UPDATE customer_registrations SET category=?,status=?,follow_up=?,assigned_to=?,next_follow_up=?,version=version+1,updated_at=? WHERE id=? AND version=? RETURNING *',[p.category,p.status,p.followUp,p.assignedTo,p.nextFollowUp,new Date().toISOString(),row.id,p.version]);
 if(!updated.length)throw new ReceptionError(409,'记录已更新，请刷新后再保存 / Record changed; refresh first');
 return {record:customerRegistrationOutput((await db.all(select+' WHERE r.id=?',[row.id]))[0])};
}
