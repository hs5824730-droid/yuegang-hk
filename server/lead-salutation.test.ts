import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {transform} from 'esbuild';
import {leadSchema} from './schema.js';
import {leadSalutationComBundle} from '../scripts/com-lead-salutation.mjs';
import {leadEmailComBundle} from '../scripts/com-lead-email.mjs';
import {notificationMessage} from './notification-message.js';

const lead=(extra:Record<string,unknown>={})=>({name:'虚构验收',contact:'+447700900001',contactMethod:'phone',city:'Hong Kong Island',service:'letting',language:'zh',...extra});

test('callback leads accept an optional Mr or Ms and nothing else',()=>{
 assert.equal(leadSchema.parse(lead({salutation:'mr'})).salutation,'mr');
 assert.equal(leadSchema.parse(lead({salutation:'ms'})).salutation,'ms');
 assert.equal('salutation' in leadSchema.parse(lead()),false);
 for(const salutation of ['','mrs','先生',1,null])assert.equal(leadSchema.safeParse(lead({salutation})).success,false);
});

test('frozen com enquiry form gains the Mr / Ms row in its own button style and sends the choice',async()=>{
 const source=readFileSync('site/com/assets/index-Db9ODUdG.js','utf8');
 const result=leadSalutationComBundle(source);
 assert.ok(result.includes('m("先生／女士（选填）","Mr / Ms (optional)")'));
 assert.ok(result.includes('...W.salutation?{salutation:W.salutation}:{}'));
 assert.equal((result.match(/className:"lf-contact-options"/g)||[]).length,(source.match(/className:"lf-contact-options"/g)||[]).length+1);
 await transform(result,{loader:'js',format:'esm'});
 assert.throws(()=>leadSalutationComBundle(source.replace('Hn("name")]})','Hn("other")]})')),/Original com enquiry form changed/);
});

test('callback leads accept email as the contact method and the frozen com form offers it',async()=>{
 assert.equal(leadSchema.parse(lead({contactMethod:'email',contact:'fictional@example.test'})).contactMethod,'email');
 assert.equal(leadSchema.safeParse(lead({contactMethod:'email',contact:'not-an-email'})).success,false);
 const source=readFileSync('site/com/assets/index-Db9ODUdG.js','utf8');
 const result=leadEmailComBundle(source);
 assert.ok(result.includes('C1=["phone","whatsapp","wechat","email"]'));
 assert.ok(result.includes('type:W.contactMethod==="email"?"email"'));
 assert.ok(result.includes('placeholder:W.contactMethod==="email"?"name@example.com"'));
 await transform(leadEmailComBundle(leadSalutationComBundle(source)),{loader:'js',format:'esm'});
 assert.throws(()=>leadEmailComBundle(source.replace('C1=["phone","whatsapp","wechat"]','C1=["phone"]')),/Original com enquiry form changed/);
});

test('email leads are reported with the address and an email-reply channel',()=>{
 const text=notificationMessage({lead_id:'x',city:'Hong Kong Island',service:'house-care',created_at:'2026-11-02T00:00:00Z',data:JSON.stringify({name:'虚构',contact:'fictional@example.test',contactMethod:'email',salutation:'ms'})},'');
 assert.match(text,/【客户性别】女（女士）\n【联系电话】未提供\n/);
 assert.match(text,/联系方式种类：邮箱（fictional@example.test）\n分流渠道：未分流（邮件回复）\n/);
});
