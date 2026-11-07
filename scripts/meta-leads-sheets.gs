/** EUCOVE Meta Instant Forms bridge. Secrets live in Script Properties, never cells. */
const EUCOVE_META_PATH = '/api/integrations/meta-leads';
const EUCOVE_META_STATUS = ['EUCOVE接入状态','EUCOVE咨询编号','EUCOVE更新时间','EUCOVE下次重试'];

function eucoveMetaConfig_() {
  const p=PropertiesService.getScriptProperties().getProperties();
  if(!p.SHEET_ID||!p.TAB_NAME||!p.FORM_ID||!p.IMPORT_SECRET||p.IMPORT_SECRET.length<32||!p.SYNC_START_AT)throw Error('请配置表格、表单、签名及启用时间');
  const start=Date.parse(p.SYNC_START_AT);if(!Number.isFinite(start))throw Error('启用时间必须为带时区的 ISO 时间');
  const endpoint=p.IMPORT_URL||'https://eucove.com'+EUCOVE_META_PATH;
  if(endpoint!=='https://eucove.com'+EUCOVE_META_PATH)throw Error('接收地址必须为桉湾正式接入接口');
  const map=JSON.parse(p.COLUMN_MAP||'{}');
  for(const key of ['leadId','submittedAt','phone','cities','services'])if(typeof map[key]!=='string'||!map[key])throw Error('请核对字段映射：'+key);
  return {p,map,start,endpoint};
}
function eucoveMetaAnswers_(value) {
  const text=String(value||'').trim();if(!text)return [];
  if(text.startsWith('[')){const list=JSON.parse(text);if(!Array.isArray(list))throw Error('多选字段格式无效');return list.map(String).map(s=>s.trim()).filter(Boolean);}
  return text.split(/[,;，；、\n]+/).map(s=>s.trim()).filter(Boolean);
}
function eucoveMetaTime_(raw,display) {
  if(raw instanceof Date&&!Number.isNaN(raw.getTime()))return raw.toISOString();
  const text=String(display||'').trim();
  // Do not guess the timezone of unqualified local date text.
  if(!/^\d{4}-\d\d-\d\d[T ]\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:?\d\d)$/.test(text))throw Error('提交时间缺少时区，需核对表格列');
  const value=new Date(text.replace(' ','T'));if(Number.isNaN(value.getTime()))throw Error('提交时间无效');return value.toISOString();
}
function eucoveMetaHex_(bytes) {return bytes.map(b=>(b&255).toString(16).padStart(2,'0')).join('');}
function eucoveMetaSignature_(time,raw,secret) {
  const hash=eucoveMetaHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,raw,Utilities.Charset.UTF_8));
  return eucoveMetaHex_(Utilities.computeHmacSha256Signature([time,'POST',EUCOVE_META_PATH,hash].join('\n'),secret,Utilities.Charset.UTF_8));
}
function eucoveMetaRow_(display,raw,index,map,config) {
  const get=key=>map[key]&&index[map[key]]!==undefined?String(display[index[map[key]]]||'').trim():'';
  const leadId=get('leadId').replace(/^l:/,'');if(!/^\d{5,40}$/.test(leadId))throw Error('Meta 线索编号必须是完整文本，不能是科学计数法');
  const submittedAt=eucoveMetaTime_(raw[index[map.submittedAt]],get('submittedAt'));
  const rowForm=get('formId').replace(/^f:/,'');if(rowForm&&rowForm!==config.p.FORM_ID)throw Error('表单编号与配置不一致');
  const phone=get('phone').replace(/^p:/,''),cities=eucoveMetaAnswers_(get('cities')),services=eucoveMetaAnswers_(get('services'));
  if(!phone||!cities.length||!services.length)throw Error('记录仍未写入完整');
  return {spreadsheetId:config.p.SHEET_ID,leadId,formId:config.p.FORM_ID,submittedAt,name:get('name'),phone,cities,services,campaignName:get('campaignName'),adName:get('adName'),...(config.autoMap?{startTime:get('startTime'),salutation:get('salutation')}: {})};
}
function eucoveMetaWriteStatus_(sheet,index,idColumn,leadId,values) {
  // Find by immutable ID again: a user may have sorted the sheet during the request.
  const ids=sheet.getRange(2,idColumn+1,Math.max(0,sheet.getLastRow()-1),1).getDisplayValues();
  const row=ids.findIndex(r=>String(r[0]).trim().replace(/^l:/,'')===leadId)+2;if(row<2)return;
  EUCOVE_META_STATUS.forEach((name,i)=>sheet.getRange(row,index[name]+1).setValue(values[i]));
}
function eucoveMetaSyncOne_(config) {
  if(config.p.SYNC_ENABLED!=='true')return;
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
  try {
    const sheet=SpreadsheetApp.openById(config.p.SHEET_ID).getSheetByName(config.p.TAB_NAME);if(!sheet)throw Error('配置的工作表不存在');
    if(sheet.getLastRow()<1)return;
    let headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0].map(String);
    for(const name of EUCOVE_META_STATUS)if(!headers.includes(name)){sheet.getRange(1,headers.length+1).setValue(name);headers.push(name);}
    const index={};headers.forEach((name,i)=>{if(index[name]!==undefined)throw Error('存在重复表头，请人工核对');index[name]=i;});
    if(config.autoMap) {
      const find=(pattern)=>headers.find(h=>pattern.test(h))||'';
      config.map={leadId:'id',submittedAt:'created_time',formId:'form_id',phone:find(/电话|phone_number/i),cities:find(/城市/),services:find(/需要.*服务|哪些服务/),campaignName:'campaign_name',adName:'ad_name',startTime:find(/什么时候|何时/),salutation:find(/称呼/)};
    }
    for(const key of ['leadId','submittedAt','phone','cities','services'])if(index[config.map[key]]===undefined)throw Error('字段映射对应的表头不存在：'+key);
    const range=sheet.getDataRange(),display=range.getDisplayValues(),raw=range.getValues();
    let attempted=0;const deadline=Date.now()+50000;
    for(let r=1;r<display.length&&attempted<20&&Date.now()<deadline;r++) {
      const status=String(display[r][index[EUCOVE_META_STATUS[0]]]||'');
      if(['后台已接收','启用前记录未自动导入','需人工核对'].includes(status))continue;
      const retryAt=Date.parse(display[r][index[EUCOVE_META_STATUS[3]]]||'');if(Number.isFinite(retryAt)&&retryAt>Date.now())continue;
      let payload;
      try{payload=eucoveMetaRow_(display[r],raw[r],index,config.map,config);}catch{continue;} // Partial/native delivery rows remain retryable.
      const mark=(state,id='',retry='')=>eucoveMetaWriteStatus_(sheet,index,index[config.map.leadId],payload.leadId,[state,id,new Date().toISOString(),retry]);
      if(Date.parse(payload.submittedAt)<config.start){mark('启用前记录未自动导入');continue;}
      attempted++;
      const body=JSON.stringify(payload),time=String(Date.now());
      try {
        const response=UrlFetchApp.fetch(config.endpoint,{method:'post',contentType:'application/json',payload:body,headers:{'x-eucove-time':time,'x-eucove-signature':eucoveMetaSignature_(time,body,config.p.IMPORT_SECRET)},muteHttpExceptions:true,followRedirects:false});
        const code=response.getResponseCode();
        if(code>=200&&code<300){const result=JSON.parse(response.getContentText());if(result.ok&&typeof result.id==='string')mark('后台已接收',result.id);else mark('等待重试','',new Date(Date.now()+300000).toISOString());}
        else if(code===409||code===422)mark('需人工核对');
        else {mark('等待重试','',new Date(Date.now()+300000).toISOString());if([401,403,503].includes(code))break;}
      } catch {mark('等待重试','',new Date(Date.now()+300000).toISOString());}
    }
  } finally {lock.releaseLock();}
}
function syncEucoveMetaLeads() {
  const old=eucoveMetaConfig_();
  eucoveMetaSyncOne_(old);
  const forms=JSON.parse(old.p.EXTRA_FORMS||'[]');
  for(const [tab,id] of forms) eucoveMetaSyncOne_({ ...old, p:{...old.p,TAB_NAME:tab,FORM_ID:id}, autoMap:true });
}
/** One-time retry of the existing rental row after the backend allowlist was updated. */
function retryFirstEucoveRentalLead() {
  const config=eucoveMetaConfig_();
  const forms=JSON.parse(config.p.EXTRA_FORMS||'[]');
  const rental=forms.find(([,id])=>id==='1514382803854555');
  if(!rental)throw Error('出租托管表单未配置');
  const sheet=SpreadsheetApp.openById(config.p.SHEET_ID).getSheetByName(rental[0]);
  if(!sheet||sheet.getLastRow()<2)throw Error('出租托管工作表没有线索');
  const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
  const status=headers.indexOf(EUCOVE_META_STATUS[0])+1,receipt=headers.indexOf(EUCOVE_META_STATUS[1])+1;
  if(!status||!receipt)throw Error('接入状态列尚未生成');
  if(sheet.getRange(2,status).getDisplayValue()==='需人工核对'&&!sheet.getRange(2,receipt).getDisplayValue())sheet.getRange(2,status).clearContent();
  syncEucoveMetaLeads();
}
/** Run once only after backend deployment + local approval; does not send a test lead. */
function installEucoveMetaTrigger() {
  eucoveMetaConfig_();
  if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='syncEucoveMetaLeads'))ScriptApp.newTrigger('syncEucoveMetaLeads').timeBased().everyMinutes(1).create();
}
