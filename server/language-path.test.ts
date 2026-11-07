import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions,Response as MFResponse} from 'miniflare';
import {languageFromPath,languageRedirect,localizedHref,withoutLanguage} from '../src/language-path';
import {documentMetadata,sitemap} from '../src/language-seo';
import {nodeLanguageHtml,privateLanguagePath} from './language-shell';
import {productionMarketingUrl} from '../src/meta-pixel-policy';

test('Language paths override old query and preserve business context without prefixing private endpoints',()=>{
 assert.equal(languageFromPath('/en/services'),'en');assert.equal(languageFromPath('/zh'),'zh');assert.equal(withoutLanguage('/en/services/'),'/services');assert.equal(languageFromPath('/english'),null);
 assert.equal(languageRedirect(new URL('https://eucove.net/services?lang=en&service=manage&city=Hong Kong Island&offer=1&listing=fixture#compare')),'/en/services?service=manage&city=Hong Kong Island&offer=1&listing=fixture#compare');
 assert.equal(languageRedirect(new URL('https://eucove.com/en/services?lang=zh&member=fixture')),'/en/services?member=fixture');
 assert.equal(languageRedirect(new URL('https://eucove.net/zh/offer?city=New Territories')),null);
 for(const p of ['/admin','/api/health','/assets/index.js','/uploads/example.png'])assert.equal(localizedHref(p,'en'),p);
 assert.equal(localizedHref('/zh/contact/whatsapp?city=New Territories&service=buy&lang=zh','en'),'/en/contact/whatsapp?city=New Territories&service=buy');
 for(const p of ['/en/api/health','/zh/admin','/en/data/file','/zh/3d-preview','/en/missing'])assert(privateLanguagePath(p));
});
test('Node HTML and SEO are language-specific, no query/visitor values leak into canonical/Pixel/sitemap',()=>{
 const url=new URL('https://eucove.net/en/services?phone=fictional&city=New Territories#form');
 const meta=documentMetadata(url)!;assert.equal(meta.lang,'en');assert.equal(meta.links[0].href,'https://eucove.net/en/services');assert(meta.links.some(l=>l.href==='https://eucove.net/zh/services'&&l.hreflang==='zh-Hans'));
 const html=nodeLanguageHtml('<html lang="zh-CN"><head><title>old</title></head><body></body></html>',url);assert.match(html,/<html lang="en">/);assert.doesNotMatch(html,/fictional|phone=|city=/);
 assert.equal(productionMarketingUrl(url),'https://eucove.net/en/services');assert.equal(productionMarketingUrl(new URL('https://eucove.com/zh/about?lead=fixture')),'https://eucove.com/zh/about');
 for(const p of ['/en/contact/whatsapp','/admin','/zh/admin'])assert.equal(productionMarketingUrl(new URL('https://eucove.net'+p)),null);
 const xml=sitemap();assert.match(xml,/https:\/\/eucove.net\/en\/services/);assert.doesNotMatch(xml,/admin|contact|phone|listing=/);
});
test('Real workerd net shell: localized redirects, deep links, HTML/Pixel CSP, root API/service origin isolation',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'eucove-net-')),file=path.join(dir,'worker.mjs'),requests:{url:string;origin:string|null;method:string;override:string|null;cookie:string|null}[]=[];
 await build({entryPoints:['worker/net.ts'],outfile:file,bundle:true,format:'esm',platform:'browser',target:'es2023',external:['node:*'],logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:file,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],bindings:{APP_URL:'https://eucove.net'},serviceBindings:{
  ASSETS:()=>new MFResponse('<!doctype html><html lang="zh-CN"><head><title>base</title></head><body><div id="root"></div></body></html>',{headers:{'Content-Type':'text/html'}}),
  BACKEND:async(req:Request)=>{requests.push({url:req.url,origin:req.headers.get('Origin'),method:req.method,override:req.headers.get('Cloudflare-Workers-Version-Overrides'),cookie:req.headers.get('Cookie')});return new MFResponse(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':'session=fixture; HttpOnly; Secure; SameSite=Strict; Path=/'}})},
 },outboundService:()=>{throw Error('External traffic prohibited')}}));
 try{
  for(const lang of ['zh','en']){const r=await mf.dispatchFetch('https://eucove.net/'+lang+'/services?city=New Territories');assert.equal(r.status,200);const html=await r.text();assert.match(html,new RegExp('<html lang="'+(lang==='en'?'en':'zh-CN')+'"'));assert.match(html,new RegExp('canonical.*https://eucove.net/'+lang+'/services'));assert.doesNotMatch(html,/city=New Territories/);assert.match(r.headers.get('Content-Security-Policy')!,/frame-ancestors 'none'/);}
  const old=await mf.dispatchFetch('https://eucove.net/offer?lang=en&offer=1',{redirect:'manual'});assert.equal(old.status,308);assert.equal(old.headers.get('location'),'/en/offer?offer=1');
  const samePath=await mf.dispatchFetch('https://eucove.net/en/services?lang=zh&city=New Territories',{redirect:'manual'});assert.equal(samePath.headers.get('location'),'/en/services?city=New Territories');
  for(const p of ['/zh/admin','/en/api/health','/data/private','/en/missing'])assert.equal((await mf.dispatchFetch('https://eucove.net'+p)).status,404);
  assert.equal((await mf.dispatchFetch('https://eucove.net/admin/login')).status,200);assert.doesNotMatch(await(await mf.dispatchFetch('https://eucove.net/admin')).text(),/facebook/);
  const frame=await mf.dispatchFetch('https://eucove.net/en/services?__eucove_pixel=1');assert.equal(frame.status,200);assert.match(frame.headers.get('Content-Security-Policy')!,/https:\/\/eucove.net\/meta-pixel-frame.js/);assert.doesNotMatch(frame.headers.get('Content-Security-Policy')!,/allow-same-origin|unsafe-inline/);
  assert.equal((await mf.dispatchFetch('https://eucove.net/en/contact?__eucove_pixel=1')).status,404);assert.equal((await mf.dispatchFetch('https://eucove.net/en/services?__eucove_pixel=1&name=fixture')).status,404);
  assert.doesNotMatch(await(await mf.dispatchFetch('https://eucove.net/en',{headers:{DNT:'1'}})).text(),/noscript/);
  const invalid=await mf.dispatchFetch('https://eucove.net/api/leads',{method:'POST',headers:{Origin:'https://evil.invalid'},body:'{}'});assert.equal(invalid.status,403);assert.equal(requests.length,0);
  const forwarded=await mf.dispatchFetch('https://eucove.net/api/leads',{method:'POST',headers:{Origin:'https://eucove.net',Cookie:'session=fixture','Cloudflare-Workers-Version-Overrides':'forbidden'},body:'{}'});assert.equal(forwarded.status,200);assert.deepEqual(requests[0],{url:'https://eucove.com/api/leads',origin:'https://eucove.com',method:'POST',override:null,cookie:'session=fixture'});assert.doesNotMatch(forwarded.headers.get('set-cookie')!,/Domain=/i);assert.equal(forwarded.headers.get('access-control-allow-origin'),null);
  assert.equal((await mf.dispatchFetch('https://eucove.net/api/health')).status,200);assert.equal((await mf.dispatchFetch('https://www.eucove.net/en/services',{redirect:'manual'})).headers.get('location'),'https://eucove.net/en/services');
  assert.match(await(await mf.dispatchFetch('https://eucove.net/sitemap.xml')).text(),/\/zh\/services/);
 }finally{await mf.dispose();rmSync(dir,{recursive:true,force:true})}
});
