import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {build} from 'esbuild';import {Miniflare,convertV4MiniflareOptions,Response as MFResponse} from 'miniflare';
import {ADVISORY_NEEDS,CARE_SERVICES,customerRegistrationSchema} from '../src/customer-registration';
import {comMarketingRedirect} from './com-marketing';
import {isPublicPage,languageRedirect} from '../src/language-path';
import {documentMetadata,sitemap} from '../src/language-seo';
import {homeServicesComBundle} from '../scripts/com-home-services.mjs';

const sample=(details:Record<string,unknown>)=>({requestId:crypto.randomUUID(),language:'zh',name:'虚构验收',contactMethod:'phone',contact:'+447700900001',type:'advisory',details});

test('garden, cleaning and home sitting register with the shared care details only',()=>{
 for(const service of ['garden','cleaning','home-sitting']){
  assert.ok(CARE_SERVICES.includes(service as never));assert.ok(Object.hasOwn(ADVISORY_NEEDS,service));
  const parsed=customerRegistrationSchema.parse(sample({service,street:'1 Fictional St',occupancy:'vacant',scope:'割草',frequency:'regular',timing:'asap'}));
  assert.equal((parsed.details as any).service,service);
  assert.equal(customerRegistrationSchema.safeParse(sample({service,issue:'漏水'})).success,false);
  assert.equal(customerRegistrationSchema.safeParse(sample({service,budgetMax:500})).success,false);
 }
 assert.ok(customerRegistrationSchema.safeParse(sample({service:'house-care',scope:'旧链接仍可用'})).success);
});

test('home services is an indexable language page that com serves outside its frozen router',()=>{
 for(const lang of ['zh','en']){
  assert.ok(isPublicPage('/'+lang+'/home-services'));
  assert.equal(comMarketingRedirect(new URL('https://eucove.com/'+lang+'/home-services')),null);
  const meta=documentMetadata(new URL('https://eucove.com/'+lang+'/home-services'))!;
  assert.match(meta.title,lang==='zh'?/房屋服务/:/Home services/);assert.match(meta.description,lang==='zh'?/人工费半价/:/Half-price labour/);
  assert.equal(meta.links[0].href,'https://eucove.com/'+lang+'/home-services');
 }
 assert.equal(languageRedirect(new URL('https://eucove.com/home-services?lang=en')),'/en/home-services');
 assert.match(sitemap('https://eucove.com'),/https:\/\/eucove.com\/en\/home-services/);
});

test('frozen com navigation and tiles link to home services without changing the layout',()=>{
 const source=readFileSync('site/com/assets/index-Db9ODUdG.js','utf8');
 const result=homeServicesComBundle(source);
 assert.equal(result.split('i("/zh/home-services","/en/home-services")').length,4);
 assert.ok(result.includes('{to:"/advisory",label:i("置業顧問","Property services")},{to:i("/zh/home-services","/en/home-services"),label:i("房屋服务","Home services")},'));
 assert.equal(result.split('reloadDocument:').length-source.split('reloadDocument:').length,5);
 assert.equal((result.match(/className:/g)||[]).length,(source.match(/className:/g)||[]).length);
 assert.doesNotMatch(result,/service=care"|service=house-care"/);
 assert.throws(()=>homeServicesComBundle(source.replace('to:"/?service=care"','to:"/?service=other"')),/Original com tiles changed/);
});

test('real com Worker serves home services from the current bundle with SEO links and no noindex',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'com-home-services-')),file=path.join(dir,'worker.mjs');
 await build({entryPoints:['worker/index.ts'],outfile:file,bundle:true,format:'esm',platform:'browser',target:'es2023',external:['node:*'],logLevel:'silent'});
 const requested:string[]=[];
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:file,compatibilityDate:'2026-10-23',compatibilityFlags:['nodejs_compat'],serviceBindings:{ASSETS:(request:Request)=>{requested.push(new URL(request.url).pathname);return new MFResponse('<html lang="zh-CN" data-site="com"><head><title>EUCOVE</title><meta name="description" content="generic"></head><body>shell</body></html>',{headers:{'Content-Type':'text/html'}})}},outboundService:()=>{throw Error('No external traffic')}}));
 try{
  const plain=await mf.dispatchFetch('https://eucove.com/home-services?lang=en',{redirect:'manual'});
  assert.equal(plain.status,308);assert.equal(plain.headers.get('location'),'/en/home-services');
  const page=await mf.dispatchFetch('https://eucove.com/en/home-services');const html=await page.text();
  assert.equal(page.status,200);assert.equal(requested.at(-1),'/admin-shell');
  assert.match(html,/<html lang="en"/);assert.match(html,/<title>Home services/);assert.match(html,/content="EUCOVE home services/);
  assert.match(html,/rel="canonical" href="https:\/\/eucove.com\/en\/home-services"/);assert.doesNotMatch(html,/noindex/);
 }finally{await mf.dispose();rmSync(dir,{recursive:true,force:true})}
});
