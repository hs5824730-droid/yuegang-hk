import {recipientSelect} from './notification-recipient.js';
import {saveRentalRegistration,registrationAdmin} from './rental-registration.js';
import {saveCustomerRegistration,customerRegistrationAdmin} from './customer-registration.js';
import {sheetsConfigured,registrationSheetUrl} from './registration-sheets.js';
import {registrationGoogleEffective,registrationGoogleStatus} from './registration-google-store.js';
import {registrationGoogleStart,registrationGoogleCallback,GOOGLE_CALLBACK} from './registration-google.js';
import { pixelFrameRequest, pixelFrameHtml, pixelFrameHeaders, pixelNoscript } from './meta-pixel.js';
import {languageRedirect,languageResource,privateLanguagePath,publicDocumentStatus,nodeLanguageHtml} from './language-shell.js';
import {getWhatsappPrefill,saveWhatsappPrefill} from './whatsapp-prefill.js';
import { mediaOriginalFileName } from './media-filename.js';
import { leadRouting, routingSelect } from './lead-routing.js';
import { assignReception, receptionEvent, saveReception, receptionReport, ReceptionError, type ReceptionDB } from './reception.js';
import {publicViewingListing} from './public-viewing.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { cities, config, tourHosts } from './config.js';
import { mapFrameOrigins } from './policy.js';
import { audit, db, transaction } from './db.js';
import { bootstrapAdmin, canAccessCity, canManageCity, checkPassword, createSession, passwordHash, readSession, requireAdmin, requireUser, tokenHash } from './auth.js';
import {loginSchema,loginUserSql} from './login-identity.js';
import {adminRotationRequestSchema,rotateExistingAdmin} from './admin-rotation.js';
import { leadPatch, leadSchema, propertySchema, userSchema, type User } from './schema.js';
import { comCallbackMarkup, landingLanguage, prepareLeadBody } from './com-callback.js';
import { queueNotification, telegramConfigured } from './notifications.js';
import {deliverNotifications} from './notifications.js';
import {TELEGRAM_DISPATCH_PATH,telegramDispatch} from './manual-lead-dispatch.js';
import { marketFileSchema } from './market-reference.js';
import { findAdvisor, serviceGroup } from '../src/enquiry-options.js';
import { readViewingManifest, viewingSamplesRouter } from './viewing-samples.js';
import {relayRequest,signalStatusSelect} from './signal-delivery.js';
import { importMetaLead, META_IMPORT_PATH } from './meta-lead-import.js';
import { mailRoute } from './enterprise-mail.js';

const receptionDb: ReceptionDB = { all: async (sql, args=[]) => db.prepare(sql).all(...args as any[]) as Record<string, any>[], batch: async queries => { transaction(() => { for(const q of queries) db.prepare(q.sql).run(...q.args as any[]); }); } };
type Row = Record<string, any>;
const notFound = { error: '记录不存在 / Record not found' };
const forbidden = { error: '没有操作权限 / Permission denied' };
const propertyOutput = (row: Row) => ({ ...JSON.parse(row.data), id: row.id, createdAt: row.created_at, updatedAt: row.updated_at });
const leadOutput = (row: Row) => {
  const data = JSON.parse(row.data);
  return { ...data, serviceGroup: serviceGroup(data.service), preferredAdvisorName: findAdvisor(data.preferredAdvisorId)?.name || '', id: row.id, ownerId: row.owner_id, status: row.status, assignedTo: row.assigned_to, notes: row.notes, nextFollowUp: row.next_follow_up, commissionOrdinal: row.commission_ordinal, movingStatus: row.moving_status, createdAt: row.created_at, receptionRecipient:row.reception_recipient||'', routing:leadRouting(data,row.city,row.routing_json), signalNotification:row.signal_json?JSON.parse(row.signal_json):null, notificationSyncStatus:row.notification_sync_status||'pending', notificationStatus: row.notification_status || 'pending' };
};
const leadSelect = `SELECT l.*,n.status AS notification_status,CASE WHEN n.status<>'sent' THEN n.status WHEN n.sync_enabled=0 OR n.revision<=n.delivered_revision THEN 'synced' WHEN n.message_id IS NULL THEN 'message_id_missing' WHEN n.edit_attempts>=5 THEN 'failed' ELSE 'pending' END AS notification_sync_status,${routingSelect},${signalStatusSelect},${recipientSelect} FROM leads l LEFT JOIN notifications n ON n.lead_id=l.id`;
function getLead(id: string) { return db.prepare(leadSelect + ' WHERE l.id=?').get(id) as Row | undefined; }
function listLeads(user: User) { return (user.role === 'admin' ? db.prepare(leadSelect + ' ORDER BY l.created_at DESC LIMIT 5000').all() : db.prepare(leadSelect + ' WHERE l.city=? ORDER BY l.created_at DESC LIMIT 5000').all(user.city!)) as Row[]; }

export function createApp() {
  if (!config.sessionSecret || config.sessionSecret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters; configure .env.local');
  bootstrapAdmin();
  mkdirSync(config.uploadDir, { recursive: true });
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: config.production ? { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'https:', 'data:', 'blob:'],
    frameSrc: ["'self'", ...tourHosts.map(host => 'https://' + host), ...tourHosts.map(host => 'https://*.' + host), ...mapFrameOrigins],
    connectSrc: ["'self'"], objectSrc: ["'none'"], upgradeInsecureRequests: [],
  } } : false, crossOriginEmbedderPolicy: false }));
  // Authenticate this machine-only endpoint before the browser Origin middleware.
  app.post(META_IMPORT_PATH,express.raw({type:'application/json',limit:'64kb'}),async(req,res,next)=>{
    try{
      const request=new Request(new URL(META_IMPORT_PATH,config.appUrl),{method:'POST',headers:{'Content-Type':req.get('content-type')||'','x-eucove-time':req.get('x-eucove-time')||'','x-eucove-signature':req.get('x-eucove-signature')||''},body:Buffer.isBuffer(req.body)?new Uint8Array(req.body):new Uint8Array()});
      const response=await importMetaLead(request,{secret:process.env.META_SHEETS_IMPORT_SECRET,spreadsheetId:process.env.META_SHEETS_SPREADSHEET_ID,formIds:process.env.META_LEAD_FORM_IDS,signalEnabled:process.env.SIGNAL_ENABLED==='true'},receptionDb);
      res.set('Cache-Control','no-store').status(response.status).type('json').send(await response.text());
    }catch(error){next(error);}
  });
  app.post(TELEGRAM_DISPATCH_PATH,express.raw({type:'application/json',limit:'64kb'}),async(req,res,next)=>{
    try{
      const request=new Request(new URL(TELEGRAM_DISPATCH_PATH,config.appUrl),{method:'POST',headers:{'Content-Type':req.get('content-type')||'','X-Telegram-Bot-Api-Secret-Token':req.get('X-Telegram-Bot-Api-Secret-Token')||''},body:Buffer.isBuffer(req.body)?new Uint8Array(req.body):new Uint8Array()});
      const result=await telegramDispatch(request,receptionDb,{token:config.telegramToken,chatId:config.telegramChatId,webhookSecret:process.env.TELEGRAM_DISPATCH_WEBHOOK_SECRET});
      res.set('Cache-Control','no-store').status(result.status).type('json').send(await result.text());
      if(result.ok)void deliverNotifications().catch(()=>console.error(JSON.stringify({event:'dispatch_notification_error'})));
    }catch(error){next(error);}
  });
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser(config.sessionSecret));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }
    const origin = req.get('origin');
    const allowed = new Set([new URL(config.appUrl).origin]);
    if (!config.production) { allowed.add('http://localhost:5173'); allowed.add('http://127.0.0.1:5173'); allowed.add('http://localhost:3001'); allowed.add('http://127.0.0.1:3001'); }
    if (!origin || !allowed.has(origin)) { res.status(403).json({ error: '请求来源不受信任 / Untrusted request origin' }); return; }
    next();
  });
  app.use(readSession);

  app.get('/api/health', (_req, res) => { res.json({ ok: true }); });
  app.get('/api/config', (_req, res) => { res.json({ brand: config.brand, whatsappNumber: config.whatsappNumber, telegramConfigured: telegramConfigured(), cities, promotion: { endMonth: '2027-02' } }); });
  app.use('/api/viewing-samples', viewingSamplesRouter());
  // User-approved internal research. This file is outside public/ and production never serves it.
  app.get('/api/market-reference', async (_req, res) => {
    if (config.production) { res.status(404).json(notFound); return; }
    try {
      const reference = marketFileSchema.parse(JSON.parse(await readFile(path.resolve('data/market-reference.json'), 'utf8')));
      res.json(reference);
    } catch { res.status(404).json(notFound); }
  });
  app.get('/api/properties', (req, res) => {
    let properties = (db.prepare('SELECT * FROM properties WHERE published=1 ORDER BY created_at DESC').all() as Row[]).map(propertyOutput);
    const stringQuery = (key: string) => typeof req.query[key] === 'string' ? req.query[key] as string : '';
    for (const key of ['city', 'status', 'type']) { const value = stringQuery(key); if (value) properties = properties.filter(item => item[key] === value); }
    const q = stringQuery('q').trim().toLowerCase();
    if (q) properties = properties.filter(item => [item.address, item.suburb, item.title.zh, item.title.en].some(value => String(value).toLowerCase().includes(q)));
    for (const key of ['minPrice', 'maxPrice', 'beds']) {
      const value = stringQuery(key); if (!value) continue;
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) { res.status(400).json({ error: '筛选条件无效 / Invalid filter' }); return; }
      properties = properties.filter(item => key === 'beds' ? item.beds >= number : item.price !== null && (key === 'minPrice' ? item.price >= number : item.price <= number));
    }
    res.json({ properties });
  });
  app.get('/api/properties/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM properties WHERE id=? AND published=1').get(req.params.id) as Row | undefined;
    if (!row) { res.status(404).json(notFound); return; } res.json({ property: propertyOutput(row) });
  });
  const submitLimit = rateLimit({ windowMs: 3600000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: '提交过于频繁，请稍后再试 / Too many submissions. Please try later.' } });
  const registrationLimit=rateLimit({windowMs:3600000,limit:15,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'登记提交过于频繁，请稍后再试 / Too many registration attempts'}});
  app.post('/api/rental-registrations',registrationLimit,async(req,res)=>{const result=await saveRentalRegistration(receptionDb,req.body);res.status(result.created?201:200).json(result);});
  app.post('/api/customer-registrations',registrationLimit,async(req,res)=>{const result=await saveCustomerRegistration(receptionDb,req.body,async id=>{const listing=config.production?publicViewingListing(id):await readViewingManifest(id);return listing?{city:listing.city,address:[listing.address,listing.suburb].filter(Boolean).join(', ')}:null});res.status(result.created?201:200).json(result);});
  app.get(GOOGLE_CALLBACK,async(req,res)=>{const response=await registrationGoogleCallback(receptionDb,{...process.env,APP_URL:config.appUrl,SESSION_SECRET:config.sessionSecret},new Request(new URL(req.originalUrl,config.appUrl),{headers:{Cookie:req.headers.cookie||''}}));res.status(response.status);response.headers.forEach((v,k)=>res.setHeader(k,v));res.send(await response.text());});
  const receptionLimit = rateLimit({ windowMs: 60000, limit: 90, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: '操作过于频繁，请稍后再试 / Too many requests' } });
  const directLimit = rateLimit({windowMs:60000,limit:8,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'操作过于频繁，请稍后再试 / Too many requests'}});
  app.use(['/api/reception/assign','/api/reception/events'],(req,res,next)=>{if(req.method==='POST'&&process.env.PUBLIC_DIRECT_CONTACT_ENABLED==='false'){res.status(410).json({error:'请留下联系方式，团队会与您联系 / Leave your contact details and our team will contact you'});return;}next();});
  app.post('/api/reception/assign', receptionLimit,(req,res,next)=>req.body?.source==='website_direct'?directLimit(req,res,next):next(), async (req,res) => res.json(await assignReception(receptionDb, req.body)));
  app.post('/api/reception/events', receptionLimit, async (req,res) => res.json(await receptionEvent(receptionDb, req.body)));
  app.post('/api/leads', submitLimit, async (req, res) => {
    const input = leadSchema.parse(prepareLeadBody(req.body));
    if (input.listingId) {
      const listing = config.production?publicViewingListing(input.listingId):await readViewingManifest(input.listingId);
      if (!listing) { res.status(400).json({ error: '看房样品不存在或暂未开放 / Viewing sample unavailable' }); return; }
      // Derive the reference location from verified source data, not editable URL fields.
      input.city = listing.city;
      input.propertyAddress = `${listing.address}, ${listing.suburb}, ${listing.city} ${listing.postcode}`;
    }
    if (input.website) { res.status(400).json({ error: '无法提交，请检查表单 / Unable to submit form' }); return; }
    if (input.currentlyManaged && ['letting', 'management'].includes(input.service)) { res.status(422).json({ error: '暂不承接从其他中介转来的出租委托 / Transfers from other agencies are not accepted' }); return; }
    const { website: _website, requestId, ...data } = input;
    const requestHash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    const result = transaction(() => {
      // Read and insert under one SQLite write lock, including across server processes.
      const existing = db.prepare('SELECT id,request_hash FROM leads WHERE request_id=?').get(requestId) as Row | undefined;
      if (existing) return existing.request_hash === requestHash
        ? { id: existing.id as string, status: 200 }
        : { status: 409, error: '请重新提交新的咨询 / Please start a new enquiry' };
      if (input.propertyId) {
        const property = db.prepare('SELECT city FROM properties WHERE id=? AND published=1').get(input.propertyId) as Row | undefined;
        if (!property) return { status: 400, error: '关联房源不存在 / Invalid property' };
        if (property.city !== input.city) return { status: 400, error: '城市与房源不匹配 / City does not match the property' };
      }
      const id = randomUUID(); const now = new Date().toISOString();
      const contactKey = input.contactMethod === 'wechat' ? 'wechat:' + input.contact.toLowerCase()
        : input.contact.includes('@') ? 'email:' + input.contact.toLowerCase() : input.contact.replace(/[^0-9]/g, '');
      let owner = db.prepare('SELECT id FROM owners WHERE contact_key=?').get(contactKey) as Row | undefined;
      if (!owner) {
        owner = { id: randomUUID() };
        db.prepare('INSERT INTO owners(id,contact_key,contact,name,created_at) VALUES(?,?,?,?,?)').run(owner.id, contactKey, input.contact, input.name, now);
      }
      const manager = db.prepare("SELECT id FROM users WHERE city=? AND role='manager' ORDER BY created_at LIMIT 1").get(input.city) as Row | undefined;
      db.prepare('INSERT INTO leads(id,request_id,request_hash,owner_id,city,service,assigned_to,data,created_at,moving_status) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .run(id, requestId, requestHash, owner.id, input.city, input.service, manager?.id || null, JSON.stringify(data), now, input.service === 'moving' ? 'requested' : 'none');
      queueNotification(id);
      return { id, status: 201 };
    });
    res.status(result.status).json(result.error ? { error: result.error } : { id: result.id, city: input.city, requestId });
  });

  app.get('/api/admin/session', (req, res) => { res.json({ user: req.user || null }); });
  const loginLimit = rateLimit({ windowMs: 15 * 60000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: '登录尝试过多，请稍后再试 / Too many login attempts' } });
  app.post('/api/admin/login', loginLimit, (req, res) => {
    const input = loginSchema.parse(req.body);
    const row = db.prepare(loginUserSql).get(input.identity,input.identity) as Row | undefined;
    // Always perform a password derivation, even when the account does not exist.
    const digest = row?.password_hash || '00000000000000000000000000000000:' + '00'.repeat(64);
    if (!checkPassword(input.password, digest) || !row) { res.status(401).json({ error: '账号或密码不正确 / Incorrect sign-in name or password' }); return; }
    if (typeof req.signedCookies?.house_session === 'string') db.prepare('DELETE FROM sessions WHERE id=?').run(tokenHash(req.signedCookies.house_session));
    createSession(res, row.id); audit(row.id, 'login', row.id);
    res.json({ user: { id: row.id, name: row.name, email: row.email, role: row.role, city: row.city } });
  });
  app.post('/api/admin/logout', (req, res) => {
    if (typeof req.signedCookies?.house_session === 'string') db.prepare('DELETE FROM sessions WHERE id=?').run(tokenHash(req.signedCookies.house_session));
    res.clearCookie('house_session', { httpOnly: true, secure: config.production, sameSite: 'strict', path: '/' }); res.json({ ok: true });
  });
  app.use('/api/admin', requireUser);
  app.use('/api/admin',async(req,res,next)=>{
    const googleEnv={...process.env,APP_URL:config.appUrl,SESSION_SECRET:config.sessionSecret};
    if(req.path==='/customer-registrations'||req.path.startsWith('/customer-registrations/')){const result=await customerRegistrationAdmin(receptionDb,req.user!,req.method,'/api/admin'+req.path,req.body);if(req.method==='PATCH')audit(req.user!.id,'customer_registration.update',req.path.split('/').pop()!);res.json(result);return;}
    if(req.path==='/registration-google/start'&&req.method==='GET'){const response=await registrationGoogleStart(receptionDb,googleEnv,req.user!);res.status(response.status);response.headers.forEach((v,k)=>res.setHeader(k,v));res.send(await response.text());return;}
    if(req.path==='/rental-registrations'||req.path.startsWith('/rental-registrations/')){const result=await registrationAdmin(receptionDb,req.user!,req.method,'/api/admin'+req.path,req.body),effective=await registrationGoogleEffective(receptionDb,googleEnv);res.json({...result,sheetsConfigured:sheetsConfigured(effective),sheetsEnabled:effective.REGISTRATION_SHEETS_ENABLED==='true',...(req.user!.role==='admin'?{sheetUrl:registrationSheetUrl(process.env),google:await registrationGoogleStatus(receptionDb,googleEnv)}:{})});return;}
    if(req.path==='/mail'||req.path.startsWith('/mail/')){res.json(await mailRoute(receptionDb,process.env,req.user!,req.method,'/api/admin'+req.path,req.body));return;}
    if(req.user!.role==='mail'){res.status(403).json({error:'邮件接待账号仅可访问分配给自己的邮件'});return;}
    next();
  });
  app.get('/api/admin/signal/status',requireAdmin,async(_req,res)=>{
   if(!process.env.SIGNAL_RELAY_URL||!process.env.SIGNAL_RELAY_SECRET){res.json({configured:false,enabled:false});return;}
   try{const response=await relayRequest({url:process.env.SIGNAL_RELAY_URL,secret:process.env.SIGNAL_RELAY_SECRET,appUrl:config.appUrl},'/v1/status');const body=await response.json() as Record<string,unknown>;res.json({configured:true,enabled:process.env.SIGNAL_ENABLED==='true',healthy:response.ok&&body.ok===true,stateLoaded:body.stateLoaded===true,targetVerified:body.targetVerified===true,sendEnabled:body.sendEnabled===true});}catch{res.status(503).json({configured:true,healthy:false});}
  });
  app.post('/api/admin/account/credentials',requireAdmin,rateLimit({windowMs:15*60000,limit:5,standardHeaders:'draft-8',legacyHeaders:false}),async(req,res)=>{
    const input=adminRotationRequestSchema.parse(req.body);
    const row=db.prepare('SELECT password_hash FROM users WHERE id=?').get(req.user!.id) as {password_hash:string}|undefined;
    if(!row||!checkPassword(input.currentPassword,row.password_hash)){res.status(401).json({error:'当前密码不正确 / Incorrect current password'});return;}
    const result=await rotateExistingAdmin(receptionDb,req.user!.id,input,row.password_hash);
    res.clearCookie('house_session',{httpOnly:true,secure:config.production,sameSite:'strict',path:'/'});res.json(result);
  });
  app.get('/api/admin/reception/whatsapp-prefill',requireAdmin,async(_req,res)=>res.json(await getWhatsappPrefill(receptionDb)));
  app.put('/api/admin/reception/whatsapp-prefill',requireAdmin,async(req,res)=>{const result=await saveWhatsappPrefill(receptionDb,req.body);audit(req.user!.id,'reception.whatsapp_prefill','settings');res.json(result)});
  app.get('/api/admin/reception', requireAdmin, async (_req,res) => res.json(await receptionReport(receptionDb)));
  app.put('/api/admin/reception', requireAdmin, async (req,res) => { const result=await saveReception(receptionDb,req.body); audit(req.user!.id,'reception.configure','targets'); res.json(result); });
  app.get('/api/admin/stats', (req, res) => {
    const leads = listLeads(req.user!);
    const properties = db.prepare('SELECT city,data FROM properties WHERE published=1').all() as Row[];
    res.json({ totalLeads: leads.length, newLeads: leads.filter(row => row.status === 'new').length, activeProperties: properties.filter(row => canAccessCity(req.user!, row.city) && ['sale', 'rent'].includes(JSON.parse(row.data).status)).length, pendingNotifications: leads.filter(row => row.notification_status !== 'sent').length });
  });
  app.get('/api/admin/leads', (req, res) => { res.json({ leads: listLeads(req.user!).map(leadOutput) }); });
  app.patch('/api/admin/leads/:id', (req, res) => {
    const row = getLead(req.params.id);
    if (!row || !canAccessCity(req.user!, row.city)) { res.status(404).json(notFound); return; }
    const input = leadPatch.parse(req.body);
    if (input.assignedTo !== undefined && req.user!.role === 'assistant') { res.status(403).json(forbidden); return; }
    if (input.assignedTo && input.assignedTo !== row.assigned_to) {
      const user = db.prepare('SELECT role,city FROM users WHERE id=?').get(input.assignedTo) as Row | undefined;
      if (!user || (user.role !== 'admin' && user.city !== row.city)) { res.status(400).json({ error: '负责人必须具备该城市权限 / Assignee must have access to this city' }); return; }
    }
    db.prepare('UPDATE leads SET status=?,assigned_to=?,notes=?,next_follow_up=?,commission_ordinal=?,moving_status=? WHERE id=?')
      .run(input.status ?? row.status, input.assignedTo === undefined ? row.assigned_to : input.assignedTo, input.notes ?? row.notes, input.nextFollowUp ?? row.next_follow_up, input.commissionOrdinal === undefined ? row.commission_ordinal : input.commissionOrdinal, input.movingStatus ?? row.moving_status, row.id);
    audit(req.user!.id, 'lead.update', row.id); res.json({ lead: leadOutput(getLead(row.id)!) });
  });
  app.get('/api/admin/users', (req, res) => {
    const user = req.user!;
    const users = user.role === 'admin' ? db.prepare('SELECT id,name,email,role,city FROM users ORDER BY name').all() : db.prepare('SELECT id,name,email,role,city FROM users WHERE city=? OR id=? ORDER BY name').all(user.city!, user.id);
    res.json({ users });
  });
  app.post('/api/admin/users', requireAdmin, (req, res) => {
    const input = userSchema.parse(req.body);
    if (db.prepare('SELECT id FROM users WHERE email=?').get(input.email)) { res.status(409).json({ error: '邮箱已存在 / Email already registered' }); return; }
    const id = randomUUID();
    db.prepare('INSERT INTO users(id,name,email,password_hash,role,city,created_at) VALUES(?,?,?,?,?,?,?)')
      .run(id, input.name, input.email, passwordHash(input.password), input.role, ['admin','mail'].includes(input.role) ? null : input.city!, new Date().toISOString());
    audit(req.user!.id, 'user.create', id); res.status(201).json({ user: { id, name: input.name, email: input.email, role: input.role, city: input.role === 'admin' ? null : input.city } });
  });
  app.get('/api/admin/properties', (req, res) => {
    const rows = req.user!.role === 'admin' ? db.prepare('SELECT * FROM properties ORDER BY created_at DESC').all() : db.prepare('SELECT * FROM properties WHERE city=? ORDER BY created_at DESC').all(req.user!.city!);
    res.json({ properties: (rows as Row[]).map(propertyOutput) });
  });
  app.post('/api/admin/properties', (req, res) => {
    const input = propertySchema.parse(req.body);
    if (!canManageCity(req.user!, input.city)) { res.status(403).json(forbidden); return; }
    const id = randomUUID(); const now = new Date().toISOString();
    db.prepare('INSERT INTO properties(id,city,published,data,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(id, input.city, Number(input.published), JSON.stringify(input), now, now);
    audit(req.user!.id, 'property.create', id); res.status(201).json({ property: { ...input, id, createdAt: now, updatedAt: now } });
  });
  app.put('/api/admin/properties/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM properties WHERE id=?').get(req.params.id) as Row | undefined;
    if (!row || !canAccessCity(req.user!, row.city)) { res.status(404).json(notFound); return; }
    const input = propertySchema.parse(req.body);
    if (!canManageCity(req.user!, row.city) || !canManageCity(req.user!, input.city)) { res.status(403).json(forbidden); return; }
    const now = new Date().toISOString();
    db.prepare('UPDATE properties SET city=?,published=?,data=?,updated_at=? WHERE id=?').run(input.city, Number(input.published), JSON.stringify(input), now, row.id);
    audit(req.user!.id, 'property.update', row.id); res.json({ property: { ...input, id: row.id, createdAt: row.created_at, updatedAt: now } });
  });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
  app.post('/api/admin/uploads', (req, res, next) => { if (req.user!.role === 'assistant') { res.status(403).json(forbidden); return; } next(); }, upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) { res.status(400).json({ error: '请选择图片 / Select an image' }); return; }
    const b = file.buffer;
    const ext = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? 'jpg' : b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'png' : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' ? 'webp' : null;
    if (!ext) { res.status(400).json({ error: '仅支持 JPEG、PNG、WebP 图片 / JPEG, PNG or WebP images only' }); return; }
    const filename = randomUUID() + '.' + ext;
    writeFileSync(path.join(config.uploadDir, filename), b, { flag: 'wx' });
    audit(req.user!.id, 'media.upload', filename); res.status(201).json({ url: '/uploads/' + filename, originalFileName:mediaOriginalFileName(file.originalname,true) });
  });
  app.post('/api/admin/notifications/retry', requireAdmin, (req, res) => {
    const result = db.prepare("UPDATE notifications SET status=CASE WHEN status='failed' THEN 'pending' ELSE status END,attempts=CASE WHEN status='failed' THEN 0 ELSE attempts END,next_attempt=0,edit_attempts=0,edit_next_attempt=0,claimed_until=0,claim_token='' WHERE status='failed' OR (status='sent' AND sync_enabled=1 AND message_id IS NOT NULL AND revision>delivered_revision AND edit_attempts>=5)").run();
    audit(req.user!.id, 'notification.retry', String(result.changes)); res.json({ queued: Number(result.changes) });
  });
  app.get('/api/admin/export/leads', (req, res) => {
    const cell = (value: unknown) => { let text = String(value ?? ''); if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"'; };
    const keys = ['id', 'name', 'contact', 'city', 'service', 'status', 'createdAt', 'notes'];
    const csv = [keys, ...listLeads(req.user!).map(row => { const lead = leadOutput(row); return keys.map(key => lead[key]); })].map(values => values.map(cell).join(',')).join('\r\n');
    audit(req.user!.id, 'lead.export', 'csv'); res.type('text/csv; charset=utf-8').attachment('enquiries.csv').send('\uFEFF' + csv);
  });
  app.use('/api', (_req, res) => { res.status(404).json(notFound); });
  app.use('/uploads', express.static(config.uploadDir, { dotfiles: 'deny', index: false, setHeaders: res => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Security-Policy', "default-src 'none'"); } }));
  const dist = path.resolve('dist');
  app.get('/{*path}', (req, res, next) => {
    const url = new URL(req.originalUrl, config.appUrl);
    if (!pixelFrameRequest(url)) { next(); return; }
    const html = pixelFrameHtml(url, new Headers({ DNT: req.get('DNT') || '', 'Sec-GPC': req.get('Sec-GPC') || '' }));
    if (!html) { res.status(404).json(notFound); return; }
    res.removeHeader('X-Frame-Options'); res.set(pixelFrameHeaders(url)).send(html);
  });
  if (existsSync(path.join(dist, 'index.html'))) {
    app.use((req,res,next)=>{
      if(!['GET','HEAD'].includes(req.method)){next();return;}
      const url=new URL(req.originalUrl,config.appUrl);
      if(privateLanguagePath(url.pathname)){res.status(404).json(notFound);return;}
      const resource=languageResource(url);if(resource){res.type(resource.type).send(resource.body);return;}
      const redirect=languageRedirect(url);if(redirect){res.redirect(308,redirect);return;}
      next();
    });
    app.use(express.static(dist, { index: false }));
    app.get('/{*path}', (req, res) => {
      const url=new URL(req.originalUrl,config.appUrl);
      const fallback = pixelNoscript(url, new Headers({ DNT: req.get('DNT') || '', 'Sec-GPC': req.get('Sec-GPC') || '' }));
      const shell = readFileSync(path.join(dist, 'index.html'), 'utf8');
      let html = nodeLanguageHtml(shell, url);
      if (shell.includes('eucove-meta-lead.js')) {
        const landing = comCallbackMarkup(url);
        if (landing) {
          html = html.replace('<body>', '<body>' + landing);
          const lang = landingLanguage(url) === 'en' ? 'en' : 'zh-CN';
          html = html.replace(/<html\b([^>]*)>/i, (_tag, attributes: string) => `<html${attributes.replace(/\s+lang=(['"])[^'"]*\1/i, '')} lang="${lang}">`);
        }
      }
      res.status(publicDocumentStatus(url)).set({ 'Cache-Control': 'private, no-store, no-transform', Vary: 'DNT, Sec-GPC' }).type('html').send(html.replace('</body>', fallback + '</body>'));
    });
  }
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof z.ZodError) { res.status(400).json({ error: '请检查填写内容 / Please check the form', fields: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) }); return; }
    if (error instanceof ReceptionError) { res.status(error.status).json({ error: error.message }); return; }
    if (error instanceof multer.MulterError) { res.status(400).json({ error: '图片上传失败，请检查文件大小（最大 8MB） / Image upload failed (8MB maximum)' }); return; }
    if (error instanceof SyntaxError) { res.status(400).json({ error: '请求格式不正确 / Invalid request body' }); return; }
    console.error('Request failed:', error instanceof Error ? error.name : 'UnknownError');
    res.status(500).json({ error: '暂时无法处理，请稍后重试 / Unable to process request. Please try again.' });
  });
  return app;
}
