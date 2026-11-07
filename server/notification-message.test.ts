import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { notificationMessage, notificationBeijingTime } from './notification-message.js';
const message = (data: Record<string,unknown>, overrides = {}) => notificationMessage({lead_id:'00000000-0000-4000-8000-000000000001',city:'Melbourne',service:'letting',created_at:'2026-10-23T00:00:00Z',data:JSON.stringify(data),...overrides},'https://eucove.com');
test('customer notification uses saved name/phone/property city and plain text, not inferred location',()=>{
 const text=message({name:'虚构客户 <b>测试</b>\n伪标题',contact:'+61 400 000 001',contactMethod:'phone',city:'Sydney',needSummary:'测试\n需求'});
 assert.ok(text.startsWith('【客户姓名】虚构客户 <b>测试</b> 伪标题\n【客户性别】未提供\n【联系电话】+61 400 000 001\n【房屋所在城市】墨尔本'));
 assert.ok(!text.includes('\n伪标题'));assert.ok(!text.includes('需求：'));assert.ok(!text.includes('房屋所在城市】悉尼'));
});
test('WhatsApp contact is a phone; WeChat ID is never made into a phone',()=>{
 assert.match(message({name:'虚构WA',contact:'+61400000002',contactMethod:'whatsapp'}),/【联系电话】\+61400000002/);
 const wx=message({name:'虚构微信',contact:'wechat_fixture',contactMethod:'wechat'});
 assert.match(wx,/【联系电话】未提供/);assert.match(wx,/微信号：wechat_fixture/);
 assert.match(message({contact:'wechat_fixture',contactMethod:'wechat',phone:'0400 000 003'}),/【联系电话】0400 000 003/);
 assert.match(message({contact:'wechat_fixture',contactMethod:'wechat',phone:'not-a-number'}),/【联系电话】未提供/);
});

test('callback staff is durable across normal and imported sources; absent staff is explicit, not the reception target',()=>{
 for(const name of ['江承裕','江牧','江鹏'])for(const data of [{contactMethod:'phone'},{contactMethod:'phone',source:'meta_instant_form',manualAssignment:true,meta:{services:['寻找租客']}}]){
  const text=message({...data,name:'仅虚构示例',contact:'+447700900001'},{reception_recipient:name});
  assert.ok(text.includes(`接粉人员：${name}（${name}组）`));assert.match(text,/分流名称：未设置/);
 }
 assert.match(message({contactMethod:'phone'}),/接粉人员：待分配/);
});
test('legacy owners fallback, real other city, missing phone, length and control characters are truthful',()=>{
 const legacy=message({},{owner_name:'虚构归档客户',owner_contact:'0400000004',city:'黄金海岸'});
 assert.match(legacy,/【客户姓名】虚构归档客户/);assert.match(legacy,/【联系电话】0400000004/);assert.match(legacy,/【房屋所在城市】黄金海岸/);
 assert.match(message({contact:'fixture@example.invalid',contactMethod:'email'}),/【联系电话】未提供/);
 assert.ok(message({name:'x'.repeat(10000),contact:'wechat_fixture',contactMethod:'wechat',needSummary:'x'.repeat(10000)}).length<4096);
 assert.ok(!message({name:'Name\u202e\tValue'}).includes('\u202e'));
});

const snapshot = (overrides: Record<string, unknown> = {}) => JSON.stringify([{id:'snapshot-only',channel:'whatsapp',scope:'city',city:'Melbourne',createdAt:'2026-10-25T10:00:00Z',target:{id:'target-fixture',value:'+61491570006',displayName:'示例接待',groupName:'江鹏组',prefillText:'Hello &?#+🙂',templateVersion:1,...overrides}}]);
test('exact compact copy: saved snapshot only, no links/title/ID/offer/details or assignment time',()=>{
 const text=message({name:'虚构客户',contact:'+61491570006',contactMethod:'whatsapp',offerInterest:true,needSummary:'Hidden',preferredAdvisorId:'andy-xiang'}, {created_at:'2026-10-23T16:00:00Z',routing_json:snapshot()});
 assert.equal(text, ['【客户姓名】虚构客户','【客户性别】未提供','【联系电话】+61491570006','【房屋所在城市】墨尔本','分组：出租与托管','类型：出租招租','','联系方式种类：WhatsApp','分流渠道：WhatsApp','分配目标：+61491570006','分流名称：示例接待','接粉人员：待分配','北京时间：2026-10-24 00:00:00'].join('\n'));
 assert.doesNotMatch(text,/https?:|wa.me|\/uploads|\/admin|192\.168|新的网站咨询|优惠|编号|指定顾问|模板|UTC|2026-10-25|隐藏/);
});
test('chosen Mr or Ms is reported as the customer gender; anything else stays unknown',()=>{
 assert.match(message({name:'虚构先生',contact:'+61491570006',contactMethod:'phone',salutation:'mr'}),/^【客户姓名】虚构先生\n【客户性别】男（先生）\n【联系电话】/);
 assert.match(message({name:'虚构女士',contact:'+61491570006',contactMethod:'phone',salutation:'ms'}),/\n【客户性别】女（女士）\n/);
 for(const salutation of [undefined,'','mrs','__proto__','toString'])assert.match(message({name:'虚构',contact:'+61491570006',salutation}),/\n【客户性别】未提供\n/);
});
test('Beijing created time uses explicit Shanghai h23 across midnight, year boundary and UTC offsets',()=>{
 for(const [utc,expected] of [
  ['2026-10-23T15:59:59Z','2026-10-23 23:59:59'],
  ['2026-10-23T16:00:00Z','2026-10-24 00:00:00'],
  ['2026-12-31T16:00:01.999Z','2027-01-01 00:00:01'],
  ['2026-10-24T03:04:05-04:00','2026-10-24 15:04:05'],
  ['2026-10-23 16:00:00','2026-10-24 00:00:00'],
  ['2026-10-24','2026-10-24 08:00:00'],
  ['invalid','未提供'], ['', '未提供'],
 ]) assert.equal(notificationBeijingTime(utc),expected,utc);
 const previous=process.env.TZ;
 try { for(const tz of ['UTC','America/Los_Angeles','Australia/Sydney']) { process.env.TZ=tz;assert.equal(notificationBeijingTime('2026-10-23 16:00:00'),'2026-10-24 00:00:00'); } }
 finally { if(previous===undefined) delete process.env.TZ;else process.env.TZ=previous; }
});
test('QR snapshot names have truthful fallbacks; phone, awaiting and unmatched never invent a recipient',()=>{
 for(const [names,expected] of [[{displayName:'',originalName:'原图示例'},'原图示例'],[{originalFileName:'original-fixture.webp'},'original-fixture.webp'],[{},'未设置']] as const){
  const raw=JSON.stringify([{channel:'wechat',scope:'city',target:{id:'fixture',value:'/uploads/00000000-0000-4000-8000-000000000001.png',...names}}]);
  const text=message({contactMethod:'wechat',contact:'fixture_wechat'},{routing_json:raw});
  assert.match(text,/【联系电话】未提供/);assert.match(text,/联系方式种类：微信（微信号：fixture_wechat）/);
  assert.ok(text.includes('分流名称：'+expected));assert.match(text,/分配目标：微信二维码/);assert.doesNotMatch(text,/\/uploads|已展示|已显示|Crystal/);
 }
 assert.match(message({contactMethod:'phone',contact:'+61491570006'}),/分流渠道：未分流（电话回访）\n分配目标：未分流\n分流名称：未设置/);
 assert.match(message({contactMethod:'whatsapp'}),/分配目标：等待分配/);
 const unmatched=JSON.stringify([{channel:'whatsapp',scope:'city',target:null}]);
 assert.match(message({contactMethod:'whatsapp'},{routing_json:unmatched}),/分配目标：该城暂无可用接待\n分流名称：未设置/);
 const unconfigured=JSON.stringify([{channel:'wechat',scope:'global',target:null}]);
 assert.match(message({contactMethod:'wechat'},{routing_json:unconfigured}),/分配目标：暂无可用接待/);
});

test('real workerd formats the identical compact notification with explicit Beijing midnight',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'notification-clock-')),bundle=path.join(directory,'fixture.mjs');
 await build({stdin:{contents:`import {notificationMessage} from './server/notification-message.ts';export default{async fetch(request){return Response.json({text:notificationMessage(await request.json(),'https://eucove.com')});}};`,resolveDir:process.cwd(),loader:'ts'},outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2023',logLevel:'silent'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-10-23'}));
 try {
  for(const created_at of ['2026-10-23T16:00:00Z','2026-12-31T15:59:59Z','2026-10-23 16:00:00']) {
   const row={lead_id:'fictional-only',city:'Sydney',service:'letting',created_at,data:JSON.stringify({name:'虚构客户',contact:'+61491570006',contactMethod:'whatsapp'}),routing_json:snapshot()};
   const response=await mf.dispatchFetch('https://fixture.invalid',{method:'POST',body:JSON.stringify(row)});
   const body=await response.json() as {text:string};
   assert.equal(body.text,notificationMessage(row,'http://192.168.100.110:5180'));
   assert.equal(body.text.split('\n').length,13);
   assert.equal(body.text.split('\n').at(-1),'北京时间：'+notificationBeijingTime(created_at));
  }
 } finally {await mf.dispose();rmSync(directory,{recursive:true,force:true});}
});
