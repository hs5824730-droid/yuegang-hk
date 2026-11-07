import {CUSTOMER_SHEET_SPECS,customerSheetValues,sheetColumn} from '../src/customer-registration-sheets';
import {INTAKE_STATUSES,type CustomerRegistrationRecord} from '../src/customer-registration';
import {customerRegistrationOutput} from './customer-registration';
import {notificationBeijingTime} from './notification-message';
import {RegistrationGoogleClient,RegistrationSyncError,sheetsConfigured,type RegistrationSheetsEnv} from './registration-sheets';
import {registrationGoogleEffective,REGISTRATION_GOOGLE_SHEET} from './registration-google-store';
import type {ReceptionDB} from './reception';

export interface CustomerSheetProvider {upsert(record:CustomerRegistrationRecord & {sheetSeq:number}):Promise<void>}
/** Only the three explicitly provisioned tabs in the existing registration workbook. */
export class GoogleCustomerSheet implements CustomerSheetProvider {
 private client:RegistrationGoogleClient;
 constructor(private env:RegistrationSheetsEnv,transport:typeof fetch=(input,init)=>fetch(input,init)){this.client=new RegistrationGoogleClient(env,transport)}
 async upsert(record:CustomerRegistrationRecord & {sheetSeq:number}){
  if(this.env.REGISTRATION_SHEETS_ID!==REGISTRATION_GOOGLE_SHEET)throw new RegistrationSyncError('invalid_sheet_configuration');
  // Original submission type is immutable: reclassification never duplicates or moves a row.
  const spec=CUSTOMER_SHEET_SPECS[record.type],last=sheetColumn(spec.headers.length),range=(r:string)=>'/values/'+encodeURIComponent("'"+spec.title+"'!"+r);
  const meta=await this.client.request('?fields=sheets(properties(sheetId,title,gridProperties(rowCount)))');
  const tab=meta.sheets?.find((s:any)=>s.properties?.sheetId===spec.id)?.properties;
  if(tab?.title!==spec.title)throw new RegistrationSyncError('dedicated_tab_missing');
  const headers=await this.client.request(range('A1:'+last+'1')+'?valueRenderOption=UNFORMATTED_VALUE');
  if(JSON.stringify(headers.values?.[0])!==JSON.stringify(spec.headers))throw new RegistrationSyncError('dedicated_tab_header_mismatch');
  const ids=await this.client.request(range('A2:A')+'?valueRenderOption=UNFORMATTED_VALUE');
  const matches=(ids.values||[]).map((r:any[],i:number)=>r?.[0]===record.id?i+2:0).filter(Boolean);
  if(matches.length>1)throw new RegistrationSyncError('duplicate_source_id_review');
  const row=matches[0]||record.sheetSeq+1;
  if(tab.gridProperties.rowCount<row){
   const start=tab.gridProperties.rowCount,end=Math.ceil(row/500)*500,grid={sheetId:spec.id,startRowIndex:start,endRowIndex:end,startColumnIndex:0,endColumnIndex:spec.headers.length};
   await this.client.request(':batchUpdate',{method:'POST',body:JSON.stringify({requests:[
    {appendDimension:{sheetId:spec.id,dimension:'ROWS',length:end-start}},
    {repeatCell:{range:grid,cell:{userEnteredFormat:{numberFormat:{type:'TEXT'},wrapStrategy:'WRAP',verticalAlignment:'MIDDLE'}},fields:'userEnteredFormat'}},
    {updateDimensionProperties:{range:{sheetId:spec.id,dimension:'ROWS',startIndex:start,endIndex:end},properties:{pixelSize:42},fields:'pixelSize'}},
    {setDataValidation:{range:{...grid,startColumnIndex:6,endColumnIndex:7},rule:{condition:{type:'ONE_OF_LIST',values:Object.values(INTAKE_STATUSES).map(v=>({userEnteredValue:v[0]}))},strict:true,showCustomUi:true}}},
    {setBasicFilter:{filter:{range:{...grid,startRowIndex:0}}}},
   ]})});
  }
  const existing=await this.client.request(range(`A${row}:A${row}`)+'?valueRenderOption=UNFORMATTED_VALUE');
  if(existing.values?.[0]?.[0]&&existing.values[0][0]!==record.id)throw new RegistrationSyncError('sheet_row_conflict');
  await this.client.request(range(`A${row}:${last}${row}`)+'?valueInputOption=RAW',{method:'PUT',body:JSON.stringify({majorDimension:'ROWS',values:[customerSheetValues(record,notificationBeijingTime(record.createdAt))]})});
 }
}
export async function syncCustomerRegistrations(db:ReceptionDB,env:RegistrationSheetsEnv,provider?:CustomerSheetProvider,limit=5){
 env=await registrationGoogleEffective(db,env);
 if(env.REGISTRATION_SHEETS_ENABLED!=='true'||!sheetsConfigured(env)&&!provider)return {configured:sheetsConfigured(env),enabled:false};
 const sheet=provider||new GoogleCustomerSheet(env),now=Date.now();
 await db.batch([{sql:"UPDATE customer_registration_sync SET status='failed',last_error='retry_limit_review',claimed_until=0,claim_token='' WHERE status='pending' AND attempts>=5 AND claimed_until<=?",args:[now]}]);
 const ids=await db.all("SELECT registration_id FROM customer_registration_sync WHERE status='pending' AND attempts<5 AND next_attempt<=? AND claimed_until<=? ORDER BY seq LIMIT ?",[now,now,limit]);
 for(const item of ids){
  const token=crypto.randomUUID(),[claim]=await db.all("UPDATE customer_registration_sync SET attempts=attempts+1,claimed_until=?,claim_token=? WHERE registration_id=? AND status='pending' AND attempts<5 AND next_attempt<=? AND claimed_until<=? RETURNING *",[Date.now()+180000,token,item.registration_id,Date.now(),Date.now()]);if(!claim)continue;
  const [raw]=await db.all('SELECT r.*,s.seq AS sheet_seq,s.revision FROM customer_registrations r JOIN customer_registration_sync s ON s.registration_id=r.id WHERE r.id=?',[item.registration_id]);
  const revision=Number(raw.revision);let ok=false,error='sheets_network_unknown';
  try{await sheet.upsert({...customerRegistrationOutput(raw),sheetSeq:raw.sheet_seq});ok=true;}catch(e){if(e instanceof RegistrationSyncError)error=e.code;}
  const delay=Math.max(error==='sheets_network_unknown'||/^sheets_http_5/.test(error)?300000:0,Math.min(3600000,30000*2**claim.attempts));
  await db.batch([{sql:"UPDATE customer_registration_sync SET delivered_revision=CASE WHEN ?=1 THEN ? ELSE delivered_revision END,status=CASE WHEN ?=1 AND revision=? THEN 'synced' WHEN revision<>? THEN 'pending' WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,last_error=?,sent_at=CASE WHEN ?=1 THEN ? ELSE sent_at END,next_attempt=?,claimed_until=0,claim_token='' WHERE registration_id=? AND claim_token=?",args:[Number(ok),revision,Number(ok),revision,revision,ok?'':error,Number(ok),new Date().toISOString(),ok?0:Date.now()+delay,item.registration_id,token]}]);
 }
 return {processed:ids.length,enabled:true};
}
