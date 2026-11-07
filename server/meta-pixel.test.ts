import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions,Response as MFResponse} from 'miniflare';
import {pixelFrameHtml,pixelFrameHeaders,pixelNoscript} from './meta-pixel';
import {META_PIXEL_ID,marketingPath,productionMarketingUrl} from '../src/meta-pixel-policy';
const headers = new Headers();
const frameSource=readFileSync('public/meta-pixel-frame.js','utf8');
function runFrame(search:string,privacy:Record<string,unknown>={}){
 const scripts:unknown[]=[];
 const parent={};
 const window:any={top:parent,parent,origin:'null',addEventListener(){throw new Error('frame must not listen for messages');}};
 runInNewContext(frameSource,{window,location:{search},navigator:privacy,document:{createElement:()=>({}),head:{appendChild:(script:unknown)=>scripts.push(script)}}});
 const queue=window.fbq?JSON.parse(JSON.stringify(window.fbq.queue.map((args:IArguments)=>Array.from(args)))):null;
 return {queue,scripts};
}
test('Lead document queues one named Lead; the page document stays on PageView',()=>{
 assert.doesNotMatch(frameSource,/fbq\(\s*['"]track['"]\s*\)/);
 assert.match(frameSource,/fbq\(\s*['"]track['"]\s*,\s*['"]Lead['"]\s*\)/);
 assert.doesNotMatch(frameSource,/addEventListener\s*\(|\.postMessage\s*\(|eucove:saved-lead/);
 const page=[['set','autoConfig',false,META_PIXEL_ID],['init',META_PIXEL_ID],['trackSingle',META_PIXEL_ID,'PageView']];
 const viewed=runFrame('?__eucove_pixel=1');
 assert.deepEqual(viewed.queue,page);assert.equal(viewed.scripts.length,1);
 const lead=runFrame('?__eucove_pixel=lead');
 assert.deepEqual(lead.queue,[['set','autoConfig',false,META_PIXEL_ID],['init',META_PIXEL_ID],['track','Lead']]);
 assert.equal(JSON.stringify(lead.queue).includes('PageView'),false);
 assert.equal(lead.queue.some((call:unknown[])=>call[0]==='track'&&call.length<2),false);
 for(const search of ['','?__eucove_pixel=other','?__eucove_pixel=1&phone=fixture','?__eucove_pixel=lead&id=c35953fd']) assert.equal(runFrame(search).queue,null);
 assert.equal(runFrame('?__eucove_pixel=lead',{doNotTrack:'1'}).queue,null);
 assert.equal(runFrame('?__eucove_pixel=lead',{globalPrivacyControl:true}).queue,null);
 const blocked=(()=>{const window:any={top:{},parent:{},origin:'https://eucove.com',addEventListener(){}};runInNewContext(frameSource,{window,location:{search:'?__eucove_pixel=lead'},navigator:{},document:{createElement:()=>({}),head:{appendChild(){}}}});return window.fbq;})();
 assert.equal(blocked,undefined);
 const form=readFileSync('src/components/LeadForm.tsx','utf8');
 const saved=form.indexOf('await api.createLead'),tracked=form.indexOf('trackSavedLead(attemptId)'),failed=form.indexOf('} catch (err)');
 assert.ok(saved>0&&tracked>saved&&failed>tracked);
 assert.doesNotMatch(form.slice(failed),/trackSavedLead/);
 assert.doesNotMatch(form,/void handOff/);
});
test('Parent loads one Lead document per saved attempt and omits the enquiry id',async()=>{
 const built=await build({entryPoints:['src/meta-pixel.ts'],bundle:true,format:'iife',globalName:'pixel',platform:'browser',write:false,logLevel:'silent'});
 const frames:any[]=[];
 let current:any=null;
 const document={
  body:{appendChild(node:any){current=node;}},
  createElement(){
   const el:any={src:'',hidden:false,tabIndex:0,title:'',referrerPolicy:'',attrs:{},setAttribute(name:string,value:string){this.attrs[name]=value;},remove(){if(current===this)current=null;},replaceWith(next:any){if(current===this)current=next;}};
   frames.push(el);return el;
  },
 };
 const sandbox:any={URL,navigator:{},document,requestAnimationFrame:(fn:Function)=>{fn(0);return 1;},cancelAnimationFrame(){}};
 sandbox.window={location:{href:'https://eucove.com/services?fbclid=fixture'},document};
 runInNewContext(built.outputFiles[0].text,sandbox);
 const attempt='11111111-1111-4111-8111-111111111111';
 sandbox.pixel.trackSavedLead('');
 sandbox.pixel.trackSavedLead(attempt);
 assert.equal(frames.length,0);
 sandbox.pixel.trackPublicPageView();
 assert.equal(frames.length,1);
 assert.equal(current.src,'https://eucove.com/services?__eucove_pixel=1');
 sandbox.pixel.trackSavedLead(attempt);
 sandbox.pixel.trackSavedLead(attempt);
 assert.equal(frames.length,2);
 assert.equal(current,frames[1]);
 assert.equal(current.src,'https://eucove.com/services?__eucove_pixel=lead');
 assert.equal(current.src.includes(attempt),false);
 assert.equal(current.src.includes('fbclid'),false);
 sandbox.pixel.trackSavedLead('22222222-2222-4222-8222-222222222222');
 assert.equal(frames.length,3);
 assert.equal(current.src,'https://eucove.com/services?__eucove_pixel=lead');
 assert.equal(current.src.includes('22222222'),false);
});
test('Frozen com /services page loads one Lead document when the success panel appears',()=>{
 const html=readFileSync('site/com/index.html');
 const manifest=JSON.parse(readFileSync('site/com/manifest.json','utf8'));
 assert.equal(createHash('sha256').update(html).digest('hex'),manifest.files['index.html']);
 assert.match(html.toString('utf8'),/src="\/eucove-meta-lead\.js"/);
 const frozen=readFileSync('site/com/assets/index-Db9ODUdG.js','utf8');
 assert.equal(frozen.includes('eucove:saved-lead'),false);
 assert.equal(frozen.includes('trackSavedLead'),false);
 assert.match(frozen,/className:"lf-done"/);
 assert.match(frozen,/Page view measurement/);
 const run=(privacy:Record<string,unknown>)=>{
  const panels:string[]=[];
  const created:any[]=[];
  const observers:Function[]=[];
  let frame:any=null;
  const document:any={
   readyState:'complete',
   documentElement:{},
   addEventListener(){},
   querySelector(sel:string){return sel==='iframe[title="Page view measurement"]'?frame:null;},
   querySelectorAll(sel:string){
    if(sel!=='.lf-done')return [];
    return panels.map(text=>({querySelector(s:string){return s==='.mono'?{textContent:text}:null;}}));
   },
   createElement(){
    const el:any={src:'',hidden:false,tabIndex:0,title:'',referrerPolicy:'',attrs:{},setAttribute(name:string,value:string){this.attrs[name]=value;},replaceWith(next:any){frame=next;}};
    created.push(el);return el;
   },
  };
  runInNewContext(readFileSync('public/eucove-meta-lead.js','utf8'),{
   navigator:privacy,document,
   MutationObserver:class{constructor(fn:Function){observers.push(fn);}observe(){}},
   setInterval(){return 1;},clearInterval(){},
  });
  return {created,panels,frame:()=>frame,scan(){for(const fn of observers)fn();},useFrame(src:string){frame={src,replaceWith(next:any){frame=next;}};}};
 };
 const quiet=run({doNotTrack:'1'});
 quiet.panels.push('eb943f28');quiet.useFrame('https://eucove.com/services?__eucove_pixel=1');quiet.scan();
 assert.equal(quiet.created.length,0);
 const page=run({});
 page.scan();assert.equal(page.created.length,0);
 page.panels.push('c35953fd');page.scan();assert.equal(page.created.length,0);
 page.useFrame('https://eucove.com/services?__eucove_pixel=1');page.scan();
 assert.equal(page.created.length,1);
 assert.equal(page.frame().src,'https://eucove.com/services?__eucove_pixel=lead');
 assert.equal(page.frame().src.includes('c35953fd'),false);
 assert.equal(page.frame().attrs.sandbox,'allow-scripts');
 page.scan();assert.equal(page.created.length,1);
 page.panels.push('48c3f509');page.scan();
 assert.equal(page.created.length,2);
 assert.equal(page.frame().src,'https://eucove.com/services?__eucove_pixel=lead');
 assert.equal(page.frame().src.includes('48c3f509'),false);
});
test('Pixel allowlist: public sections only, canonical paths with no query/fragment/UUID/credentials',()=>{
 for(const p of ['/', '/services', '/offer', '/properties', '/history', '/viewings', '/buy-sell', '/advisory', '/about', '/privacy', '/credits']) assert.equal(marketingPath(p),p);
 for(const p of ['/admin','/admin/login','/admin/reception','/contact','/contact/whatsapp','/contact/wechat','/api/leads','/data/x','/3d-preview','/unknown','/overseas']) assert.equal(marketingPath(p),null);
 assert.equal(productionMarketingUrl(new URL('https://eucove.com/services/?name=Fictional&phone=fixture&lead=00000000-0000-4000-8000-000000000001#contact')),'https://eucove.com/services');
 assert.equal(productionMarketingUrl(new URL('https://eucove.com/properties/00000000-0000-4000-8000-000000000001')),'https://eucove.com/properties');
 for(const u of ['http://eucove.com','http://localhost:5173','https://other.invalid','https://eucove.com:444']) assert.equal(productionMarketingUrl(new URL(u)),null);
});
test('Noscript is public/server gated, opt-out aware and sends only a fixed safe address',()=>{
 const html=pixelNoscript(new URL('https://eucove.com/?name=Fictional&phone=fixture&lead=00000000-0000-4000-8000-000000000001#secret'),headers);
 assert.match(html,new RegExp(META_PIXEL_ID));assert.match(html,/noscript/);assert.match(html,/referrerpolicy="no-referrer"/);
 assert.doesNotMatch(html,/Fictional|fixture|00000000|secret|name=|phone=|lead=/);
 for(const h of [new Headers({DNT:'1'}),new Headers({'Sec-GPC':'1'})]) assert.equal(pixelNoscript(new URL('https://eucove.com/'),h),'');
 for(const p of ['/admin','/admin/leads?search=Fictional','/contact/whatsapp?lead=fixture','/3d-preview','/unknown','/?__eucove_pixel=1','/services?__eucove_pixel=lead']) assert.equal(pixelNoscript(new URL('https://eucove.com'+p),headers),'');
});
test('SDK frame: fixed query, opaque sandbox, strict CSP, no parent inputs in HTML',()=>{
 const url=new URL('https://eucove.com/services?__eucove_pixel=1');const html=pixelFrameHtml(url,headers)!;
 assert.match(html,/meta-pixel-frame.js/);assert.doesNotMatch(html,/unsafe-inline|[?&]name=|phone=|fbq/);
 assert.equal(pixelFrameHtml(new URL(url+'&contact=fixture'),headers),null);
 assert.equal(pixelFrameHtml(new URL('https://eucove.com/admin?__eucove_pixel=1'),headers),null);
 assert.equal(pixelFrameHtml(url,new Headers({DNT:'1'})),null);
 const leadHtml=pixelFrameHtml(new URL('https://eucove.com/services?__eucove_pixel=lead'),headers)!;
 assert.match(leadHtml,/meta-pixel-frame.js/);
 assert.equal(pixelFrameHtml(new URL('https://eucove.com/services?__eucove_pixel=lead&phone=fixture'),headers),null);
 assert.equal(pixelFrameHtml(new URL('https://eucove.com/services?__eucove_pixel=lead&id=c35953fd'),headers),null);
 assert.equal(pixelFrameHtml(new URL('https://eucove.com/services?__eucove_pixel=other'),headers),null);
 assert.equal(pixelFrameHtml(new URL('https://eucove.com/services?__eucove_pixel=lead'),new Headers({'Sec-GPC':'1'})),null);
 const csp=pixelFrameHeaders()['Content-Security-Policy'];assert.match(csp,/sandbox allow-scripts/);assert.doesNotMatch(csp,/allow-same-origin|unsafe-inline|unsafe-eval|\*/);
});
test('real workerd: public-only noscript/SDK frame; admin opt-out CSP and API remain unchanged',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'eucove-pixel-')),bundle=path.join(dir,'worker.mjs');
 await build({entryPoints:['worker/index.ts'],outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2023',external:['node:*'],logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],serviceBindings:{ASSETS:()=>new MFResponse('<!doctype html><body><div id="root"></div></body>',{headers:{'Content-Type':'text/html'}})},outboundService:()=>{throw Error('All external traffic forbidden');}}));
 try{
  const page=await mf.dispatchFetch('https://eucove.com/services?contact=fictional-only');assert.equal(page.status,200);const html=await page.text();assert.match(html,/noscript/);assert.match(html,new RegExp(META_PIXEL_ID));assert.doesNotMatch(html,/fictional-only/);assert.doesNotMatch(page.headers.get('content-security-policy')!,/facebook/);
  assert.match(page.headers.get('cache-control')!,/no-transform/);
  for(const p of ['/admin/login?search=fictional-only','/contact/whatsapp?lead=fictional-only','/unknown']){const r=await mf.dispatchFetch('https://eucove.com'+p);assert.doesNotMatch(await r.text(),/facebook|noscript/);assert.doesNotMatch(r.headers.get('content-security-policy')!,/facebook/);assert.match(r.headers.get('cache-control')!,/no-transform/);}
  for(const h of [{DNT:'1'},{'Sec-GPC':'1'}]) assert.doesNotMatch(await(await mf.dispatchFetch('https://eucove.com/',{headers:h})).text(),/noscript/);
  const frame=await mf.dispatchFetch('https://eucove.com/services?__eucove_pixel=1');assert.equal(frame.status,200);assert.match(await frame.text(),/meta-pixel-frame.js/);assert.match(frame.headers.get('content-security-policy')!,/sandbox allow-scripts/);assert.equal(frame.headers.get('referrer-policy'),'no-referrer');assert.equal(frame.headers.get('x-frame-options'),null);
  const lead=await mf.dispatchFetch('https://eucove.com/services?__eucove_pixel=lead');assert.equal(lead.status,200);assert.match(await lead.text(),/meta-pixel-frame.js/);assert.match(lead.headers.get('content-security-policy')!,/sandbox allow-scripts/);
  for(const p of ['/admin?__eucove_pixel=1','/services?__eucove_pixel=1&phone=fictional-only','/services?__eucove_pixel=lead&id=c35953fd','/services?__eucove_pixel=other']) assert.equal((await mf.dispatchFetch('https://eucove.com'+p)).status,404);
  assert.equal((await mf.dispatchFetch('https://eucove.com/api/health')).status,200);
 }finally{await mf.dispose();rmSync(dir,{recursive:true,force:true});}
});
