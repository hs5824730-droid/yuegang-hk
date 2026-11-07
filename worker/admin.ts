import {recipientSelect} from '../server/notification-recipient';
import {registrationAdmin} from '../server/rental-registration';
import {customerRegistrationAdmin} from '../server/customer-registration';
import {sheetsConfigured,registrationSheetUrl} from '../server/registration-sheets';
import {registrationGoogleEffective,registrationGoogleStatus} from '../server/registration-google-store';
import {registrationGoogleStart} from '../server/registration-google';
import {getWhatsappPrefill,saveWhatsappPrefill} from '../server/whatsapp-prefill';
import { leadRouting, routingSelect } from '../server/lead-routing';
import { saveReception, receptionReport, type ReceptionDB } from '../server/reception';
import { leadPatch, propertySchema, userSchema, type User } from '../server/schema';
import { findAdvisor, serviceGroup } from '../src/enquiry-options';
import type { AppEnv } from './env';
import { audit, canAccessCity, canManageCity, requireAdmin } from './auth';
import { passwordHash } from './crypto';
import { HttpError, json, notFound, readJson } from './http';
import { upload } from './media';
import {relayRequest,signalStatusSelect} from '../server/signal-delivery';
import {signalSettings} from './notifications';
import {mailRoute} from '../server/enterprise-mail';
export interface PropertyRow { id: string; city: string; published: number; data: string; created_at: string; updated_at: string; }
interface LeadRow { reception_recipient?:string; id: string; owner_id: string; city: string; service: string; data: string; status: string; assigned_to: string | null; notes: string; next_follow_up: string; commission_ordinal: number | null; moving_status: string; created_at: string; notification_status: string | null; notification_sync_status:string; routing_json:string; signal_json:string|null; }
export const propertyOutput = (row: PropertyRow) => ({ ...JSON.parse(row.data), id: row.id, createdAt: row.created_at, updatedAt: row.updated_at });
const leadSelect = `SELECT l.*,n.status AS notification_status,CASE WHEN n.status<>'sent' THEN n.status WHEN n.sync_enabled=0 OR n.revision<=n.delivered_revision THEN 'synced' WHEN n.message_id IS NULL THEN 'message_id_missing' WHEN n.edit_attempts>=5 THEN 'failed' ELSE 'pending' END AS notification_sync_status,${routingSelect},${signalStatusSelect},${recipientSelect} FROM leads l LEFT JOIN notifications n ON n.lead_id=l.id`;
export function leadOutput(row: LeadRow) {
  const data = JSON.parse(row.data);
  return { ...data, serviceGroup: serviceGroup(data.service), preferredAdvisorName: findAdvisor(data.preferredAdvisorId)?.name || '', id: row.id, ownerId: row.owner_id, status: row.status, assignedTo: row.assigned_to, notes: row.notes, nextFollowUp: row.next_follow_up, commissionOrdinal: row.commission_ordinal, movingStatus: row.moving_status, createdAt: row.created_at, receptionRecipient:row.reception_recipient||'', routing:leadRouting(data,row.city,row.routing_json), signalNotification:row.signal_json?JSON.parse(row.signal_json):null, notificationSyncStatus:row.notification_sync_status||'pending', notificationStatus: row.notification_status || 'pending' };
}
async function leads(env: AppEnv, user: User) {
  const query = user.role === 'admin' ? env.DB.prepare(leadSelect + ' ORDER BY l.created_at DESC LIMIT 5000') : env.DB.prepare(leadSelect + ' WHERE l.city=? ORDER BY l.created_at DESC LIMIT 5000').bind(user.city);
  return (await query.all<LeadRow>()).results;
}
export async function admin(request: Request, env: AppEnv, user: User, path: string) {
  const method = request.method;
  if(path==='/api/admin/customer-registrations'||path.startsWith('/api/admin/customer-registrations/')){
   const db:ReceptionDB={all:async(sql,args=[])=>(await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results,batch:async qs=>{await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args)));}};
   const result=await customerRegistrationAdmin(db,user,method,path,method==='PATCH'?await readJson(request):undefined);
   if(method==='PATCH')await audit(env,user.id,'customer_registration.update',path.split('/').pop()!).run();
   return json(result);
  }
  if(path==='/api/admin/registration-google/start'&&method==='GET'){
    const db:ReceptionDB={all:async(sql,args=[])=>(await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results,batch:async qs=>{await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args)));}};
    return registrationGoogleStart(db,env,user);
  }
  if(path==='/api/admin/rental-registrations'||path.startsWith('/api/admin/rental-registrations/')){
   const db:ReceptionDB={all:async(sql,args=[])=>(await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results,batch:async qs=>{await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args)));}};
   const effective=await registrationGoogleEffective(db,env);
   return json({...await registrationAdmin(db,user,method,path,['POST','PATCH'].includes(method)?await readJson(request):undefined),sheetsConfigured:sheetsConfigured(effective),sheetsEnabled:effective.REGISTRATION_SHEETS_ENABLED==='true',...(user.role==='admin'?{sheetUrl:registrationSheetUrl(env),google:await registrationGoogleStatus(db,env)}:{})});
  }
  if(path==='/api/admin/mail'||path.startsWith('/api/admin/mail/')){
    const db:ReceptionDB={all:async(sql,args=[])=>(await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results,batch:async qs=>{await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args)));}};
    return json(await mailRoute(db,env,user,method,path,['POST','PUT'].includes(method)?await readJson(request):undefined));
  }
  if(user.role==='mail')throw new HttpError(403,'邮件接待账号仅可访问分配给自己的邮件');
  if(path==='/api/admin/signal/status'&&method==='GET'){
   requireAdmin(user);
   if(!env.SIGNAL_RELAY_URL||!env.SIGNAL_RELAY_SECRET)return json({configured:false,enabled:false});
   try{const response=await relayRequest(signalSettings(env),'/v1/status');const body=await response.json() as Record<string,unknown>;return json({configured:true,enabled:env.SIGNAL_ENABLED==='true',healthy:response.ok&&body.ok===true,stateLoaded:body.stateLoaded===true,targetVerified:body.targetVerified===true,sendEnabled:body.sendEnabled===true,clientVersion:body.clientVersion==='0.14.9'?'0.14.9':'unknown'});}catch{return json({configured:true,enabled:env.SIGNAL_ENABLED==='true',healthy:false},503);}
  }
  if(path==='/api/admin/reception/whatsapp-prefill'){
   requireAdmin(user);const db:ReceptionDB={all:async(sql,args=[])=>(await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results,batch:async qs=>{await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args)));}};
   if(method==='GET')return json(await getWhatsappPrefill(db));
   if(method==='PUT'){const result=await saveWhatsappPrefill(db,await readJson(request));await audit(env,user.id,'reception.whatsapp_prefill','settings').run();return json(result);}
  }
  if (path === '/api/admin/reception') {
    requireAdmin(user);
    const db: ReceptionDB = { all: async (sql,args=[]) => (await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results, batch: async qs => { await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args))); } };
    if (method === 'GET') return json(await receptionReport(db));
    if (method === 'PUT') { const result=await saveReception(db,await readJson(request)); await audit(env,user.id,'reception.configure','targets').run(); return json(result); }
  }
  if (path === '/api/admin/stats' && method === 'GET') {
    const rows = await leads(env, user);
    const properties = await (user.role === 'admin' ? env.DB.prepare('SELECT data FROM properties WHERE published=1') : env.DB.prepare('SELECT data FROM properties WHERE published=1 AND city=?').bind(user.city)).all<{ data: string }>();
    return json({ totalLeads: rows.length, newLeads: rows.filter(row => row.status === 'new').length, activeProperties: properties.results.filter(row => ['sale', 'rent'].includes(JSON.parse(row.data).status)).length, pendingNotifications: rows.filter(row => row.notification_status !== 'sent').length });
  }
  if (path === '/api/admin/leads' && method === 'GET') return json({ leads: (await leads(env, user)).map(leadOutput) });
  const leadMatch = path.match(/^\/api\/admin\/leads\/([^/]+)$/);
  if (leadMatch && method === 'PATCH') {
    const row = await env.DB.prepare(leadSelect + ' WHERE l.id=?').bind(leadMatch[1]).first<LeadRow>();
    if (!row || !canAccessCity(user, row.city)) return notFound();
    const input = leadPatch.parse(await readJson(request));
    if (input.assignedTo !== undefined && user.role === 'assistant') throw new HttpError(403, '没有操作权限 / Permission denied');
    if (input.assignedTo && input.assignedTo !== row.assigned_to) {
      const assignee = await env.DB.prepare('SELECT role,city FROM users WHERE id=?').bind(input.assignedTo).first<{ role: string; city: string }>();
      if (!assignee || (assignee.role !== 'admin' && assignee.city !== row.city)) throw new HttpError(400, '负责人必须具备该城市权限 / Assignee must have access to this city');
    }
    const result = await env.DB.batch<LeadRow>([
      env.DB.prepare('UPDATE leads SET status=?,assigned_to=?,notes=?,next_follow_up=?,commission_ordinal=?,moving_status=? WHERE id=?')
        .bind(input.status ?? row.status, input.assignedTo === undefined ? row.assigned_to : input.assignedTo, input.notes ?? row.notes, input.nextFollowUp ?? row.next_follow_up, input.commissionOrdinal === undefined ? row.commission_ordinal : input.commissionOrdinal, input.movingStatus ?? row.moving_status, row.id),
      audit(env, user.id, 'lead.update', row.id), env.DB.prepare(leadSelect + ' WHERE l.id=?').bind(row.id),
    ]);
    return json({ lead: leadOutput(result[2].results[0]) });
  }
  if (path === '/api/admin/users') {
    if (method === 'GET') {
      const query = user.role === 'admin' ? env.DB.prepare('SELECT id,name,email,role,city FROM users ORDER BY name') : env.DB.prepare('SELECT id,name,email,role,city FROM users WHERE city=? OR id=? ORDER BY name').bind(user.city, user.id);
      return json({ users: (await query.all<User>()).results });
    }
    if (method === 'POST') {
      requireAdmin(user); const input = userSchema.parse(await readJson(request));
      if (await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(input.email).first()) throw new HttpError(409, '邮箱已存在 / Email already registered');
      const id = crypto.randomUUID(); const city = ['admin','mail'].includes(input.role) ? null : input.city!;
      await env.DB.batch([env.DB.prepare('INSERT INTO users(id,name,email,password_hash,role,city,created_at) VALUES(?,?,?,?,?,?,?)').bind(id, input.name, input.email, await passwordHash(input.password), input.role, city, new Date().toISOString()), audit(env, user.id, 'user.create', id)]);
      return json({ user: { id, name: input.name, email: input.email, role: input.role, city } }, 201);
    }
  }
  if (path === '/api/admin/properties') {
    if (method === 'GET') {
      const query = user.role === 'admin' ? env.DB.prepare('SELECT * FROM properties ORDER BY created_at DESC') : env.DB.prepare('SELECT * FROM properties WHERE city=? ORDER BY created_at DESC').bind(user.city);
      return json({ properties: (await query.all<PropertyRow>()).results.map(propertyOutput) });
    }
    if (method === 'POST') {
      const input = propertySchema.parse(await readJson(request));
      if (!canManageCity(user, input.city)) throw new HttpError(403, '没有操作权限 / Permission denied');
      const id = crypto.randomUUID(); const now = new Date().toISOString();
      await env.DB.batch([env.DB.prepare('INSERT INTO properties(id,city,published,data,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(id, input.city, Number(input.published), JSON.stringify(input), now, now), audit(env, user.id, 'property.create', id)]);
      return json({ property: { ...input, id, createdAt: now, updatedAt: now } }, 201);
    }
  }
  const propertyMatch = path.match(/^\/api\/admin\/properties\/([^/]+)$/);
  if (propertyMatch && method === 'PUT') {
    const row = await env.DB.prepare('SELECT * FROM properties WHERE id=?').bind(propertyMatch[1]).first<PropertyRow>();
    if (!row || !canAccessCity(user, row.city)) return notFound();
    const input = propertySchema.parse(await readJson(request));
    if (!canManageCity(user, row.city) || !canManageCity(user, input.city)) throw new HttpError(403, '没有操作权限 / Permission denied');
    const now = new Date().toISOString();
    const result = await env.DB.batch([env.DB.prepare('UPDATE properties SET city=?,published=?,data=?,updated_at=? WHERE id=? AND city=?').bind(input.city, Number(input.published), JSON.stringify(input), now, row.id, row.city), audit(env, user.id, 'property.update', row.id)]);
    if (!result[0].meta.changes) throw new HttpError(409, '记录已更新，请刷新 / Record changed. Please refresh.');
    return json({ property: { ...input, id: row.id, createdAt: row.created_at, updatedAt: now } });
  }
  if (path === '/api/admin/uploads' && method === 'POST') return upload(request, env, user);
  if (path === '/api/admin/notifications/retry' && method === 'POST') {
    requireAdmin(user);
    const result = await env.DB.batch([env.DB.prepare("UPDATE notifications SET status=CASE WHEN status='failed' THEN 'pending' ELSE status END,attempts=CASE WHEN status='failed' THEN 0 ELSE attempts END,next_attempt=0,edit_attempts=0,edit_next_attempt=0,claimed_until=0,claim_token='' WHERE status='failed' OR (status='sent' AND sync_enabled=1 AND message_id IS NOT NULL AND revision>delivered_revision AND edit_attempts>=5)"), audit(env, user.id, 'notification.retry', 'failed')]);
    return json({ queued: result[0].meta.changes });
  }
  if (path === '/api/admin/export/leads' && method === 'GET') {
    const cell = (value: unknown) => { let text = String(value ?? ''); if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"'; };
    const keys = ['id', 'name', 'contact', 'city', 'service', 'status', 'createdAt', 'notes'];
    const csv = [keys, ...(await leads(env, user)).map(row => { const lead = leadOutput(row); return keys.map(key => lead[key]); })].map(values => values.map(cell).join(',')).join('\r\n');
    await audit(env, user.id, 'lead.export', 'csv').run();
    return new Response('\uFEFF' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="enquiries.csv"' } });
  }
  return notFound();
}
