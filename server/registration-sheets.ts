import {REGISTRATION_STATUSES,REGISTRATION_SERVICES,PROPERTY_KINDS,FURNISHING,RENTAL_MODES,type RentalRegistrationRecord} from '../src/rental-registration.js';
import {notificationBeijingTime} from './notification-message.js';
import {registrationOutput} from './rental-registration.js';
import type {ReceptionDB} from './reception.js';
import {registrationGoogleEffective} from './registration-google-store.js';

export interface RegistrationSheetsEnv {REGISTRATION_SHEETS_ENABLED?:string;REGISTRATION_SHEETS_ID?:string;REGISTRATION_SHEETS_TAB?:string;REGISTRATION_GOOGLE_CLIENT_ID?:string;REGISTRATION_GOOGLE_CLIENT_SECRET?:string;REGISTRATION_GOOGLE_REFRESH_TOKEN?:string;REGISTRATION_SHEETS_KILL_SWITCH?:string;SESSION_SECRET?:string;APP_URL?:string}
export const SHEET_HEADERS=['记录编号','房东姓名','房屋地址','联系电话','电子邮箱','城市','跟进状态','提交时间（北京时间）','街道门牌','Suburb','州','邮编','房屋类型','卧室','卫浴','车位','家具','周租下限（AUD）','周租上限（AUD）','可入住安排','可入住日期','出租方式','所需服务','补充说明','界面语言'];
const label=(items:Record<string,readonly string[]>,key:string)=>items[key]?.[0]||'';
export function registrationSheetValues(r:RentalRegistrationRecord){return [r.id,r.name,[r.street,r.suburb,r.state,r.postcode].filter(Boolean).join(', '),r.phone,r.email,r.city,label(REGISTRATION_STATUSES,r.status),notificationBeijingTime(r.createdAt),r.street,r.suburb,r.state,r.postcode,label(PROPERTY_KINDS,r.propertyType),r.bedrooms??'',r.bathrooms??'',r.parking??'',label(FURNISHING,r.furnishing),r.rentMin??'',r.rentMax??'',({now:'可立即入住',date:'指定日期',undecided:'未定'} as Record<string,string>)[r.availableWhen]||'',r.availableDate,label(RENTAL_MODES,r.rentalMode),r.services.map(s=>REGISTRATION_SERVICES[s][0]).join('、'),r.notes,r.language];}
export const sheetsConfigured=(env:RegistrationSheetsEnv)=>Boolean(env.REGISTRATION_SHEETS_ID&&env.REGISTRATION_SHEETS_TAB&&env.REGISTRATION_GOOGLE_CLIENT_ID&&env.REGISTRATION_GOOGLE_CLIENT_SECRET&&env.REGISTRATION_GOOGLE_REFRESH_TOKEN);
export const registrationSheetUrl=(env:RegistrationSheetsEnv)=>/^[\w-]{10,120}$/.test(env.REGISTRATION_SHEETS_ID||'')?'https://docs.google.com/spreadsheets/d/'+env.REGISTRATION_SHEETS_ID+'/edit':undefined;
export class RegistrationSyncError extends Error{constructor(public code:string){super(code)}}
export interface RegistrationSheetProvider {upsert(record:RentalRegistrationRecord):Promise<void>}
/** Dedicated existing tab only. No append, create, sharing, or edits to any other tab. */
export class RegistrationGoogleClient{
 private token='';constructor(private env:RegistrationSheetsEnv,private transport:typeof fetch=(input,init)=>fetch(input,init)){}
 async request(path:string,init:RequestInit={}){
  if(!/^[\w-]{10,120}$/.test(this.env.REGISTRATION_SHEETS_ID||'')||!this.env.REGISTRATION_SHEETS_TAB||this.env.REGISTRATION_SHEETS_TAB.length>90)throw new RegistrationSyncError('invalid_sheet_configuration');
  if(!this.token){const res=await this.transport('https://oauth2.googleapis.com/token',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),body:new URLSearchParams({grant_type:'refresh_token',client_id:this.env.REGISTRATION_GOOGLE_CLIENT_ID!,client_secret:this.env.REGISTRATION_GOOGLE_CLIENT_SECRET!,refresh_token:this.env.REGISTRATION_GOOGLE_REFRESH_TOKEN!})});const json=await res.json() as any;if(!res.ok||typeof json.access_token!=='string')throw new RegistrationSyncError('google_authorization_failed');this.token=json.access_token;}
  const response=await this.transport('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(this.env.REGISTRATION_SHEETS_ID!)+path,{...init,redirect:'manual',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new RegistrationSyncError(response.status===429?'sheets_rate_limited':'sheets_http_'+response.status);
  return response.json() as Promise<any>;
 }
}
export class GoogleRegistrationSheet implements RegistrationSheetProvider{
 private client:RegistrationGoogleClient;
 constructor(private env:RegistrationSheetsEnv,transport:typeof fetch=(input,init)=>fetch(input,init)){this.client=new RegistrationGoogleClient(env,transport)}
 private request(path:string,init:RequestInit={}){return this.client.request(path,init)}
 async upsert(record:RentalRegistrationRecord){
  const title="'"+this.env.REGISTRATION_SHEETS_TAB!.replaceAll("'","''")+"'",range=(r:string)=>'/values/'+encodeURIComponent(title+'!'+r);
  const headers=await this.request(range('A1:Y1')+'?valueRenderOption=UNFORMATTED_VALUE');
  if(JSON.stringify(headers.values?.[0])!==JSON.stringify(SHEET_HEADERS))throw new RegistrationSyncError('dedicated_tab_header_mismatch');
  // Reconcile the persistent source ID before every retry, including a lost update response.
  const ids=await this.request(range('A2:A')+'?valueRenderOption=UNFORMATTED_VALUE'),matches=(ids.values||[]).map((r:any[],i:number)=>r?.[0]===record.id?i+2:0).filter(Boolean);
  if(matches.length>1)throw new RegistrationSyncError('duplicate_source_id_review');
  const row=matches[0]||record.seq+1;
  if(row>1000){
   const meta=await this.request('?fields=sheets(properties(sheetId,title,gridProperties(rowCount)))'),sheet=meta.sheets?.find((s:any)=>s.properties?.title===this.env.REGISTRATION_SHEETS_TAB)?.properties;
   if(!sheet)throw new RegistrationSyncError('dedicated_tab_missing');
   if(sheet.gridProperties.rowCount<row){const start=sheet.gridProperties.rowCount,end=Math.ceil(row/500)*500,grid={sheetId:sheet.sheetId,startRowIndex:start,endRowIndex:end,startColumnIndex:0,endColumnIndex:SHEET_HEADERS.length};
    await this.request(':batchUpdate',{method:'POST',body:JSON.stringify({requests:[
     {appendDimension:{sheetId:sheet.sheetId,dimension:'ROWS',length:end-start}},
     {repeatCell:{range:grid,cell:{userEnteredFormat:{numberFormat:{type:'TEXT'},wrapStrategy:'WRAP',verticalAlignment:'MIDDLE'}},fields:'userEnteredFormat'}},
     {updateDimensionProperties:{range:{sheetId:sheet.sheetId,dimension:'ROWS',startIndex:start,endIndex:end},properties:{pixelSize:42},fields:'pixelSize'}},
     {setDataValidation:{range:{...grid,startColumnIndex:6,endColumnIndex:7},rule:{condition:{type:'ONE_OF_LIST',values:Object.values(REGISTRATION_STATUSES).map(v=>({userEnteredValue:v[0]}))},strict:true,showCustomUi:true}}},
     {repeatCell:{range:{...grid,startColumnIndex:17,endColumnIndex:19},cell:{userEnteredFormat:{numberFormat:{type:'CURRENCY',pattern:'"A$"#,##0.00'}}},fields:'userEnteredFormat.numberFormat'}},
     {setBasicFilter:{filter:{range:{...grid,startRowIndex:0}}}},
    ]})});
   }
  }
  const existing=await this.request(range(`A${row}:A${row}`)+'?valueRenderOption=UNFORMATTED_VALUE');
  if(existing.values?.[0]?.[0]&&existing.values[0][0]!==record.id)throw new RegistrationSyncError('sheet_row_conflict');
  // RAW preserves + and leading zeroes, and treats formula-looking customer strings as strings.
  await this.request(range(`A${row}:Y${row}`)+'?valueInputOption=RAW',{method:'PUT',body:JSON.stringify({majorDimension:'ROWS',values:[registrationSheetValues(record)]})});
 }
}
export async function syncRentalRegistrations(db:ReceptionDB,env:RegistrationSheetsEnv,provider?:RegistrationSheetProvider,limit=5){
 env=await registrationGoogleEffective(db,env);
 if(env.REGISTRATION_SHEETS_ENABLED!=='true'||!sheetsConfigured(env)&&!provider)return {configured:sheetsConfigured(env),enabled:false};
 const sheet=provider||new GoogleRegistrationSheet(env),now=Date.now();
 await db.batch([{sql:"UPDATE rental_registration_sync SET status='failed',last_error='retry_limit_review',claimed_until=0,claim_token='' WHERE status='pending' AND attempts>=5 AND claimed_until<=?",args:[now]}]);
 const ids=await db.all("SELECT registration_id FROM rental_registration_sync WHERE status='pending' AND attempts<5 AND next_attempt<=? AND claimed_until<=? ORDER BY rowid LIMIT ?",[now,now,limit]);
 for(const item of ids){
  const token=crypto.randomUUID(),[claim]=await db.all("UPDATE rental_registration_sync SET attempts=attempts+1,claimed_until=?,claim_token=? WHERE registration_id=? AND status='pending' AND attempts<5 AND next_attempt<=? AND claimed_until<=? RETURNING *",[Date.now()+180000,token,item.registration_id,Date.now(),Date.now()]);if(!claim)continue;
  const [raw]=await db.all('SELECT r.*,s.status AS sync_status,s.attempts,s.last_error,s.sent_at,s.revision,s.delivered_revision FROM rental_registrations r JOIN rental_registration_sync s ON s.registration_id=r.id WHERE r.id=?',[item.registration_id]);
  // A later admin revision is left pending after this fenced attempt; neither update is discarded.
  const revision=Number(raw.revision);let ok=false,error='sheets_network_unknown';
  try{await sheet.upsert(registrationOutput(raw));ok=true;}catch(e){if(e instanceof RegistrationSyncError)error=e.code;}
  const delay=Math.max(error==='sheets_network_unknown'||/^sheets_http_5/.test(error)?300000:0,Math.min(3600000,30000*2**claim.attempts));
  await db.batch([{sql:"UPDATE rental_registration_sync SET delivered_revision=CASE WHEN ?=1 THEN ? ELSE delivered_revision END,status=CASE WHEN ?=1 AND revision=? THEN 'synced' WHEN revision<>? THEN 'pending' WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,last_error=?,sent_at=CASE WHEN ?=1 THEN ? ELSE sent_at END,next_attempt=?,claimed_until=0,claim_token='' WHERE registration_id=? AND claim_token=?",args:[Number(ok),revision,Number(ok),revision,revision,ok?'':error,Number(ok),new Date().toISOString(),ok?0:Date.now()+delay,item.registration_id,token]}]);
 }
 return {processed:ids.length,enabled:true};
}

/** Previewable batchUpdate plan. Applying it requires a user-selected NEW dedicated tab. */
export function registrationSheetFormat(sheetId:number,title='EUCOVE 房东登记'){
 const orange={red:1,green:.37,blue:.1},ink={red:.13,green:.14,blue:.16},white={red:1,green:1,blue:1},range={sheetId,startRowIndex:0,endRowIndex:1000,startColumnIndex:0,endColumnIndex:SHEET_HEADERS.length};
 return {requests:[
  {addSheet:{properties:{sheetId,title,gridProperties:{rowCount:1000,columnCount:SHEET_HEADERS.length,frozenRowCount:1,frozenColumnCount:3}}}},
  {updateCells:{start:{sheetId,rowIndex:0,columnIndex:0},rows:[{values:SHEET_HEADERS.map(h=>({userEnteredValue:{stringValue:h}}))}],fields:'userEnteredValue'}},
  {repeatCell:{range,cell:{userEnteredFormat:{textFormat:{fontFamily:'Arial',fontSize:11,foregroundColor:ink},verticalAlignment:'MIDDLE',wrapStrategy:'WRAP',numberFormat:{type:'TEXT'}}},fields:'userEnteredFormat'}},
  {repeatCell:{range:{...range,endRowIndex:1},cell:{userEnteredFormat:{backgroundColor:orange,textFormat:{bold:true,foregroundColor:white,fontFamily:'Arial',fontSize:11}}},fields:'userEnteredFormat.backgroundColor,userEnteredFormat.textFormat'}},
  {addBanding:{bandedRange:{range,rowProperties:{headerColor:orange,firstBandColor:white,secondBandColor:{red:1,green:.96,blue:.93}}}}},
  {setBasicFilter:{filter:{range}}},
  {updateDimensionProperties:{range:{sheetId,dimension:'ROWS',startIndex:0,endIndex:1000},properties:{pixelSize:42},fields:'pixelSize'}},
  {updateDimensionProperties:{range:{sheetId,dimension:'COLUMNS',startIndex:0,endIndex:SHEET_HEADERS.length},properties:{pixelSize:140},fields:'pixelSize'}},
  ...[0,2,4,22,23].map(i=>({updateDimensionProperties:{range:{sheetId,dimension:'COLUMNS',startIndex:i,endIndex:i+1},properties:{pixelSize:i===2||i===23?300:210},fields:'pixelSize'}})),
  {setDataValidation:{range:{sheetId,startRowIndex:1,endRowIndex:1000,startColumnIndex:6,endColumnIndex:7},rule:{condition:{type:'ONE_OF_LIST',values:Object.values(REGISTRATION_STATUSES).map(v=>({userEnteredValue:v[0]}))},strict:true,showCustomUi:true}}},
  {repeatCell:{range:{sheetId,startRowIndex:1,endRowIndex:1000,startColumnIndex:17,endColumnIndex:19},cell:{userEnteredFormat:{numberFormat:{type:'CURRENCY',pattern:'"A$"#,##0.00'}}},fields:'userEnteredFormat.numberFormat'}},
  ...Object.values(REGISTRATION_STATUSES).map((v,i)=>({addConditionalFormatRule:{index:i,rule:{ranges:[{sheetId,startRowIndex:1,endRowIndex:1000,startColumnIndex:6,endColumnIndex:7}],booleanRule:{condition:{type:'TEXT_EQ',values:[{userEnteredValue:v[0]}]},format:{backgroundColor:i===3?{red:.85,green:.96,blue:.87}:i===4?{red:.93,green:.93,blue:.93}:{red:1,green:.94-i*.04,blue:.86-i*.05}}}}}})),
 ]};
}
