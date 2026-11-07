import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash,createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync('scripts/meta-leads-sheets.gs','utf8');
const cryptoUtilities={Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_algorithm:string,value:string)=>[...createHash('sha256').update(value).digest()],computeHmacSha256Signature:(value:string,key:string)=>[...createHmac('sha256',key).update(value).digest()]};
test('Apps Script signing matches intake contract; all answers remain; ambiguous times are rejected',()=>{
 const ctx:Record<string,any>={Utilities:cryptoUtilities,Date};runInNewContext(source,ctx);
 const raw='{"phone":"+61491570006"}',time=String(Date.now()),secret='fixture-only-secret';
 const expected=createHmac('sha256',secret).update([time,'POST','/api/integrations/meta-leads',createHash('sha256').update(raw).digest('hex')].join('\n')).digest('hex');
 assert.equal(ctx.eucoveMetaSignature_(time,raw,secret),expected);
 assert.deepEqual(Array.from(ctx.eucoveMetaAnswers_('港島、九龍')),['港島','九龍']);
 assert.deepEqual(Array.from(ctx.eucoveMetaAnswers_('["寻找租客","租務管理"]')),['寻找租客','租務管理']);
 assert.throws(()=>ctx.eucoveMetaTime_(null,'2026-10-25 12:30:00'));
 assert.equal(ctx.eucoveMetaTime_(null,'2026-10-25T12:30:00+08:00'),'2026-10-25T04:30:00.000Z');
 const map={leadId:'id',submittedAt:'created_time',phone:'phone',cities:'city',services:'needs',formId:'form'};
 const index={id:0,created_time:1,phone:2,city:3,needs:4,form:5};
 const row=['l:100000000000001','2026-10-25T12:30:00+08:00','p:+61491570006','港島','寻找租客','f:123456789'];
 const native=ctx.eucoveMetaRow_(row,row,index,map,{p:{SHEET_ID:'fixture',FORM_ID:'123456789'}});
 assert.equal(native.leadId,'100000000000001');assert.equal(native.phone,'+61491570006');assert.equal(native.formId,'123456789');
});
test('scheduled sheet bridge skips historical/incomplete rows, retries failed import, and marks receipt only',()=>{
 const headers=['lead_id','created_time','phone_number','city','needs'];
 const date=new Date().toISOString(),old='2025-01-01T00:00:00Z';
 const rows:any[][]=[headers.slice(),['l:100000000000001',old,'p:+61491570006','港島','寻找租客'],['l:100000000000002',date,'p:+61491570006','港島、九龍','寻找租客、租務管理'],['100000000000003',date,'','港島','寻找租客']];
 const props={SHEET_ID:'fixture-sheet',TAB_NAME:'Meta',FORM_ID:'123456789',IMPORT_SECRET:'fixture-meta-secret-12345678901234567890',SYNC_ENABLED:'true',SYNC_START_AT:'2026-01-01T00:00:00Z',COLUMN_MAP:JSON.stringify({leadId:'lead_id',submittedAt:'created_time',phone:'phone_number',cities:'city',services:'needs'})};
 const range=(r:number,c:number,h=1,w=1)=>({getDisplayValues:()=>Array.from({length:h},(_,a)=>Array.from({length:w},(_,b)=>String(rows[r-1+a]?.[c-1+b]??''))),getValues:()=>Array.from({length:h},(_,a)=>Array.from({length:w},(_,b)=>rows[r-1+a]?.[c-1+b]??'')),setValue:(v:unknown)=>{rows[r-1]??=[];rows[r-1][c-1]=v;}});
 const sheet={getLastRow:()=>rows.length,getLastColumn:()=>rows[0].length,getRange:range,getDataRange:()=>range(1,1,rows.length,rows[0].length)};
 const calls:{url:string;options:any}[]=[];let fail=true,locked=false;
 const ctx:Record<string,any>={Utilities:cryptoUtilities,Date,PropertiesService:{getScriptProperties:()=>({getProperties:()=>props})},LockService:{getScriptLock:()=>({tryLock:()=>{if(locked)return false;locked=true;return true;},releaseLock:()=>{locked=false;}})},SpreadsheetApp:{openById:(id:string)=>{assert.equal(id,props.SHEET_ID);return {getSheetByName:()=>sheet};}},UrlFetchApp:{fetch:(url:string,options:any)=>{calls.push({url,options});return {getResponseCode:()=>fail?503:201,getContentText:()=>JSON.stringify({ok:true,id:'saved-fixture-id'})};}}};
 runInNewContext(source,ctx);ctx.syncEucoveMetaLeads();
 assert.equal(calls.length,1);assert.equal(rows[1][5],'启用前记录未自动导入');assert.equal(rows[2][5],'等待重试');assert.equal(rows[3][5],undefined);
 assert.equal(JSON.parse(calls[0].options.payload).leadId,'100000000000002');assert.equal(calls[0].options.followRedirects,false);
 ctx.syncEucoveMetaLeads();assert.equal(calls.length,1); // retry deadline, not lost/marked sent
 rows[2][8]='2000-01-01T00:00:00Z';fail=false;ctx.syncEucoveMetaLeads();
 assert.equal(calls.length,2);assert.equal(rows[2][5],'后台已接收');assert.equal(rows[2][6],'saved-fixture-id');
 assert.equal(calls[0].options.payload,calls[1].options.payload);
 ctx.syncEucoveMetaLeads();assert.equal(calls.length,2);assert.equal(locked,false);
});
