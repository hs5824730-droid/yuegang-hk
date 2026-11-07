import { pixelFrameRequest, pixelFrameHtml, pixelFrameHeaders, pixelNoscript } from '../server/meta-pixel';
import { comCallbackMarkup, landingLanguage } from '../server/com-callback';
import {saveRentalRegistration} from '../server/rental-registration';
import {saveCustomerRegistration} from '../server/customer-registration';
import {publicViewingListing} from '../server/public-viewing';
import {languageHead,languageRedirect,languageResource} from '../server/language-shell';
import {documentMetadata} from '../src/language-seo';
import {comMarketingRedirect} from '../server/com-marketing';
import {registrationGoogleCallback,GOOGLE_CALLBACK} from '../server/registration-google';
import {languageFromPath,registrationPageTitle} from '../src/language-path';
import {syncRentalRegistrations} from '../server/registration-sheets';
import {syncCustomerRegistrations} from '../server/customer-registration-sheets';
import { assignReception, receptionEvent, ReceptionError, type ReceptionDB } from '../server/reception';
import { rateLimit } from './auth';
import { z } from 'zod';
import { cities } from '../server/policy';
import type { AppEnv } from './env';
import { admin, propertyOutput, type PropertyRow } from './admin';
import { login, logout, readSession } from './auth';
import { createLead } from './leads';
import { importMetaSheetLead } from './meta-leads';
import { META_IMPORT_PATH } from '../server/meta-lead-import';
import {adminRotationRequestSchema,rotateExistingAdmin} from '../server/admin-rotation';
import {checkPassword} from './crypto';
import { deliverNotifications, telegramConfigured } from './notifications';
import {TELEGRAM_DISPATCH_PATH,telegramDispatch} from '../server/manual-lead-dispatch';
import { serveMedia } from './media';
import { HttpError, json, notFound, requireSameOrigin, secure, readJson } from './http';
import { publishedViewings } from './viewing';
async function route(request: Request, env: AppEnv, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url); const path = url.pathname.replace(/\/$/, '') || '/';
  if (url.hostname === 'www.eucove.com') return Response.redirect('https://eucove.com' + url.pathname + url.search, 308);
  if(/^\/(?:\.env(?:[./]|$)|\.dev\.vars(?:[./]|$)|\.git(?:\/|$)|__local(?:\/|$))/.test(path))return notFound();
  if (['/data', '/server', '/3d-preview', '/depth', '/reference-media', '/brand-concepts'].some(prefix => path === prefix || path.startsWith(prefix + '/')) || path.startsWith('/@fs/')) return notFound();
  if (path.startsWith('/uploads/')) return serveMedia(request, env, path.slice(9));
  if (path !== '/api' && !path.startsWith('/api/')) {
    if (!['GET', 'HEAD'].includes(request.method)) return notFound();
    if (pixelFrameRequest(url)) {
      const html = pixelFrameHtml(url, request.headers);
      return html ? new Response(html, { headers: pixelFrameHeaders() }) : notFound();
    }
    // Serve robots.txt and sitemap.xml before ASSETS so the SPA fallback cannot replace them.
    const resource=languageResource(url);if(resource)return new Response(resource.body,{headers:{'Content-Type':resource.type}});
    // .com marketing assets remain frozen. The console and standalone customer forms
    // use the current bundle, retaining one backend and host-only console cookies.
    if(path==='/admin-shell.html'||path==='/admin-shell')return notFound();
    const legacyMarketing=comMarketingRedirect(url);
    if(legacyMarketing)return new Response(null,{status:308,headers:{Location:legacyMarketing}});
    // ASSETS canonicalizes explicit .html URLs. Fetch the extensionless alias
    // internally so /admin remains the browser URL and the router renders Admin.
    const registration=/^\/(?:(?:zh|en)\/)?(?:registration|(?:rental|buying|selling|advisory)-registration)$/.test(path);
    const contact=/^\/(?:(?:zh|en)\/)?contact(?:\/(?:phone|wechat|whatsapp))?$/.test(path);
    const homeServices=/^\/(?:(?:zh|en)\/)?home-services$/.test(path);
    if(registration||contact||homeServices){const redirect=languageRedirect(url);if(redirect)return new Response(null,{status:308,headers:{Location:redirect}});}
    const response = await env.ASSETS.fetch(path==='/admin'||path.startsWith('/admin/')||registration||contact||homeServices?new Request(new URL('/admin-shell',url),request):request);
    // Home services is a public, indexable page rendered by the current bundle in .com's original design.
    if(homeServices&&response.status===200&&response.headers.get('Content-Type')?.includes('text/html')){
     const meta=documentMetadata(url)!,headers=new Headers(response.headers);headers.delete('ETag');headers.delete('Content-Length');
     const html=new HTMLRewriter().on('html',{element(e){e.setAttribute('lang',meta.lang)}}).on('title',{element(e){e.setInnerContent(meta.title)}}).on('meta[name="description"]',{element(e){e.setAttribute('content',meta.description)}}).on('head',{element(e){e.append(languageHead(url),{html:true})}}).transform(response);return new Response(html.body,{status:200,headers});
    }
    // A new standalone form can use the current bundle without replacing frozen .com marketing pages.
    if((registration||contact)&&response.status===200&&response.headers.get('Content-Type')?.includes('text/html')){
     const lang=languageFromPath(path)||'zh',headers=new Headers(response.headers);headers.set('Cache-Control','private, no-store');headers.delete('ETag');headers.delete('Content-Length');
     const html=new HTMLRewriter().on('html',{element(e){e.setAttribute('lang',lang==='en'?'en':'zh-CN')}}).on('head',{element(e){e.append('<meta name="robots" content="noindex,nofollow">',{html:true})}}).on('title',{element(e){e.setInnerContent(registration?registrationPageTitle(path,lang)!:(lang==='en'?'Contact EUCOVE':'联系桉湾 EUCOVE'))}}).transform(response);return new Response(html.body,{status:200,headers});
    }
    const htmlDocument = response.status === 200 && response.headers.get('Content-Type')?.includes('text/html');
    const landing = htmlDocument ? comCallbackMarkup(url) : '';
    const fallback = pixelNoscript(url, request.headers);
    if (!landing && (!fallback || !htmlDocument)) return response;
    const headers = new Headers(response.headers); headers.delete('ETag'); headers.delete('Content-Length');
    headers.set('Cache-Control', 'private, no-store'); headers.set('Vary', 'DNT, Sec-GPC');
    const lang = landingLanguage(url) === 'en' ? 'en' : 'zh-CN';
    const transformed = new HTMLRewriter()
      .on('html', { element(element) { if (landing) element.setAttribute('lang', lang); } })
      .on('body', { element(element) { if (landing) element.prepend(landing, { html: true }); if (fallback) element.append(fallback, { html: true }); } })
      .transform(response);
    return new Response(transformed.body, { status: response.status, headers });
  }
  if (path === META_IMPORT_PATH) return importMetaSheetLead(request, env, ctx);
  if(path===TELEGRAM_DISPATCH_PATH){
    const db:ReceptionDB={all:async(sql,args=[])=>(await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results,batch:async qs=>{await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args)));}};
    const result=await telegramDispatch(request,db,{token:env.TELEGRAM_BOT_TOKEN||'',chatId:env.TELEGRAM_CHAT_ID||'',webhookSecret:env.TELEGRAM_DISPATCH_WEBHOOK_SECRET});
    if(result.ok)ctx.waitUntil(deliverNotifications(env,5).catch(()=>console.error(JSON.stringify({event:'dispatch_notification_error'}))));
    return result;
  }
  if(path===GOOGLE_CALLBACK&&request.method==='GET'){
    const db:ReceptionDB={all:async(sql,args=[])=>(await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results,batch:async qs=>{await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args)));}};
    return registrationGoogleCallback(db,env,request);
  }
  requireSameOrigin(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  // Only the explicit selected publication is served; archives/3D/other market datasets stay private.
  if (path === '/api/market-reference') return notFound();
  if (path==='/api/viewing-samples'||path.startsWith('/api/viewing-samples/')) return publishedViewings(request,env,path);
  if (path === '/api/health' && ['GET', 'HEAD'].includes(request.method)) return json({ ok: true });
  if (path === '/api/config' && request.method === 'GET') return json({ brand: { zh: env.BRAND_ZH, en: env.BRAND_EN }, whatsappNumber: env.WHATSAPP_NUMBER.replace(/[^0-9]/g, ''), telegramConfigured: telegramConfigured(env), cities, promotion: { endMonth: '2027-02' } });
  if (path === '/api/properties' && request.method === 'GET') {
    let properties = (await env.DB.prepare('SELECT * FROM properties WHERE published=1 ORDER BY created_at DESC').all<PropertyRow>()).results.map(propertyOutput);
    for (const key of ['city', 'status', 'type']) { const value = url.searchParams.get(key); if (value) properties = properties.filter(item => item[key] === value); }
    const q = url.searchParams.get('q')?.trim().toLowerCase();
    if (q) properties = properties.filter(item => [item.address, item.suburb, item.title.zh, item.title.en].some(value => String(value).toLowerCase().includes(q)));
    for (const key of ['minPrice', 'maxPrice', 'beds']) {
      const value = url.searchParams.get(key); if (!value) continue;
      const number = Number(value); if (!Number.isFinite(number) || number < 0) throw new HttpError(400, '筛选条件无效 / Invalid filter');
      properties = properties.filter(item => key === 'beds' ? item.beds >= number : item.price !== null && (key === 'minPrice' ? item.price >= number : item.price <= number));
    }
    return json({ properties });
  }
  const match = path.match(/^\/api\/properties\/([^/]+)$/);
  if (match && request.method === 'GET') {
    const row = await env.DB.prepare('SELECT * FROM properties WHERE id=? AND published=1').bind(match[1]).first<PropertyRow>();
    return row ? json({ property: propertyOutput(row) }) : notFound();
  }
  if (['/api/reception/assign','/api/reception/events'].includes(path) && request.method === 'POST') {
    if(env.PUBLIC_DIRECT_CONTACT_ENABLED==='false')return json({error:'请留下联系方式，团队会与您联系 / Leave your contact details and our team will contact you'},410);
    await rateLimit(request,env,'reception',90,60000);
    const db: ReceptionDB = { all: async (sql,args=[]) => (await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results, batch: async qs => { await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args))); } };
    const body=await readJson(request);
    if(path.endsWith('/assign')&&(body as {source?:string})?.source==='website_direct')await rateLimit(request,env,'direct_contact',8,60000);
    const result=await (path.endsWith('/assign') ? assignReception(db,body) : receptionEvent(db,body));
    ctx.waitUntil(deliverNotifications(env,1).catch(()=>console.error(JSON.stringify({event:'notification_worker_error'}))));
    return json(result);
  }
  if (path === '/api/leads' && request.method === 'POST') return createLead(request, env, ctx);
  if(path==='/api/customer-registrations'&&request.method==='POST'){
   await rateLimit(request,env,'rental_registration',15,3600000);
   const db:ReceptionDB={all:async(sql,args=[])=>(await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results,batch:async qs=>{await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args)));}};
   const result=await saveCustomerRegistration(db,await readJson(request),async id=>{const listing=publicViewingListing(id);return listing?{city:listing.city,address:[listing.address,listing.suburb].filter(Boolean).join(', ')}:null});return json(result,result.created?201:200);
  }
  if(path==='/api/rental-registrations'&&request.method==='POST'){
   await rateLimit(request,env,'rental_registration',15,3600000);
   const db:ReceptionDB={all:async(sql,args=[])=>(await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results,batch:async qs=>{await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args)));}};
   const result=await saveRentalRegistration(db,await readJson(request));return json(result,result.created?201:200);
  }
  if (path === '/api/admin/login' && request.method === 'POST') return login(request, env);
  if (path === '/api/admin/logout' && request.method === 'POST') return logout(request, env);
  if (path === '/api/admin/session' && request.method === 'GET') return json({ user: await readSession(request, env) });
  if (path.startsWith('/api/admin/')) {
    const user = await readSession(request, env); if (!user) throw new HttpError(401, '请先登录 / Sign in required');
    if(path==='/api/admin/account/credentials'&&request.method==='POST'){
      if(user.role!=='admin')throw new HttpError(403,'没有操作权限 / Permission denied');
      await rateLimit(request,env,'credentials',5,15*60000);
      const input=adminRotationRequestSchema.parse(await readJson(request));
      const row=await env.DB.prepare('SELECT password_hash FROM users WHERE id=?').bind(user.id).first<{password_hash:string}>();
      if(!row||!await checkPassword(input.currentPassword,row.password_hash))throw new HttpError(401,'当前密码不正确 / Incorrect current password');
      const db:ReceptionDB={all:async(sql,args=[])=>(await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results,batch:async qs=>{await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args)))}};
      const result=await rotateExistingAdmin(db,user.id,input,row.password_hash);
      return json(result,200,{'Set-Cookie':'house_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});
    }
    return admin(request, env, user, path);
  }
  return notFound();
}
export default {
  async fetch(request: Request, env: AppEnv, ctx: ExecutionContext) {
    let response: Response;
    try { response = await route(request, env, ctx); }
    catch (error) {
      if (error instanceof HttpError || error instanceof ReceptionError) response = json({ error: error.message }, error.status);
      else if (error instanceof z.ZodError) response = json({ error: '请检查填写内容 / Please check the form', fields: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) }, 400);
      else {
        console.error(JSON.stringify({ event: 'request_error', error: error instanceof Error ? error.name : 'UnknownError' }));
        response = json({ error: '暂时无法处理，请稍后重试 / Unable to process request. Please try again.' }, 500);
      }
    }
    return secure(response, request);
  },
  async scheduled(_controller: ScheduledController, env: AppEnv, ctx: ExecutionContext) {
    ctx.waitUntil((async () => {
      const registrationDb:ReceptionDB={all:async(sql,args=[])=>(await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results,batch:async qs=>{await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args)));}};
      await Promise.allSettled([deliverNotifications(env),syncRentalRegistrations(registrationDb,env).catch(()=>console.error(JSON.stringify({event:'registration_sheet_worker_error'}))),syncCustomerRegistrations(registrationDb,env).catch(()=>console.error(JSON.stringify({event:'customer_sheet_worker_error'})))]);
      await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()), env.DB.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(Date.now())]);
    })().catch(() => console.error(JSON.stringify({ event: 'scheduled_error' }))));
  },
} satisfies ExportedHandler<AppEnv>;
