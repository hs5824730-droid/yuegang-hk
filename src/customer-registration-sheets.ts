import {ADVISORY_NEEDS,CARE_FREQUENCIES,INTAKE_STATUSES,INTAKE_TYPES,OCCUPANCIES,PROPERTY_TYPES,PURPOSES,TIMINGS,URGENCIES,YES_NO,type CustomerRegistrationRecord,type IntakeType} from './customer-registration';
import {CONTACT_METHODS} from './enquiry-options';

const common=['記錄編號','客戶姓名','房屋地址','聯繫電話','電子電郵','地區','跟進狀態','提交時間（北京時間）','首選聯繫方式','聯繫帳戶','當前需求分類'];
export const CUSTOMER_SHEET_SPECS={
 selling:{id:270019,title:'賣樓登記',headers:[...common,'所在區','房屋類型','卧室','衞浴','車位','房屋目前情況','預計出售時間','期望售價（AUD）','其他代理掛牌','補充說明','界面語言']},
 buying:{id:270020,title:'買樓登記',headers:[...common,'意向區域','總預算下限（AUD）','總預算上限（AUD）','置業用途','房屋類型','卧室','車位','預計購買時間','意向樓盤','關聯樓盤編號','補充說明','界面語言']},
 advisory:{id:270021,title:'置業服務登記',headers:[...common,'所需服務','關注區域','查詢問題','所需工作及位置','房屋目前情況','服務頻率','希望安排時間','處理緊急程度','預算下限（AUD）','預算上限（AUD）','補充說明','界面語言']},
} as const;
const label=(vocab:Record<string,readonly string[]>,value:unknown)=>vocab[String(value)]?.[0]||'';
export function customerSheetValues(record:CustomerRegistrationRecord,beijingTime:string){
 const d=record.details as Record<string,unknown>;
 const address=record.propertyAddress||[d.street,d.suburb].filter(Boolean).join(', ');
 const values:unknown[]=[record.id,record.name,address,['phone','whatsapp'].includes(record.contactMethod)?record.contact:'',record.contactMethod==='email'?record.contact:record.email,record.city,INTAKE_STATUSES[record.status][0],beijingTime,CONTACT_METHODS[record.contactMethod].zh,record.contact,INTAKE_TYPES[record.category][0]];
 if(record.type==='selling')values.push(d.suburb,label(PROPERTY_TYPES,d.propertyType),d.bedrooms??'',d.bathrooms??'',d.parking??'',label(OCCUPANCIES,d.occupancy),label(TIMINGS,d.timing),d.expectedPrice??'',label(YES_NO,d.listedElsewhere));
 else if(record.type==='buying')values.push(d.suburb,d.budgetMin??'',d.budgetMax??'',label(PURPOSES,d.purpose),label(PROPERTY_TYPES,d.propertyType),d.bedrooms??'',d.parking??'',label(TIMINGS,d.timing),d.desiredProperty,record.propertyId||record.listingId||'');
 else values.push(label(ADVISORY_NEEDS,d.service),d.suburb||'',d.question||'',d.scope||d.issue||'',label(OCCUPANCIES,d.occupancy),label(CARE_FREQUENCIES,d.frequency),label(TIMINGS,d.timing),label(URGENCIES,d.urgency),d.budgetMin??'',d.budgetMax??'');
 values.push(record.notes,record.language);
 return values.map(value=>value??'');
}
export function sheetColumn(count:number){let result='';for(let n=count;n>0;n=Math.floor((n-1)/26))result=String.fromCharCode(65+(n-1)%26)+result;return result;}
export function customerSheetFormat(type:IntakeType){
 const spec=CUSTOMER_SHEET_SPECS[type],sheetId=spec.id,range={sheetId,startRowIndex:0,endRowIndex:1000,startColumnIndex:0,endColumnIndex:spec.headers.length};
 return [
  {addSheet:{properties:{sheetId,title:spec.title,gridProperties:{rowCount:1000,columnCount:spec.headers.length,frozenRowCount:1,frozenColumnCount:3}}}},
  {updateCells:{start:{sheetId,rowIndex:0,columnIndex:0},rows:[{values:spec.headers.map(h=>({userEnteredValue:{stringValue:h}}))}],fields:'userEnteredValue'}},
  {repeatCell:{range,cell:{userEnteredFormat:{numberFormat:{type:'TEXT'},wrapStrategy:'WRAP',verticalAlignment:'MIDDLE',textFormat:{fontFamily:'Arial',fontSize:11}}},fields:'userEnteredFormat'}},
  {repeatCell:{range:{...range,endRowIndex:1},cell:{userEnteredFormat:{backgroundColor:{red:1,green:.37,blue:.1},textFormat:{bold:true,foregroundColor:{red:1,green:1,blue:1},fontFamily:'Arial',fontSize:11}}},fields:'userEnteredFormat.backgroundColor,userEnteredFormat.textFormat'}},
  {addBanding:{bandedRange:{range,rowProperties:{headerColor:{red:1,green:.37,blue:.1},firstBandColor:{red:1,green:1,blue:1},secondBandColor:{red:1,green:.96,blue:.93}}}}},
  {setBasicFilter:{filter:{range}}},
  {updateDimensionProperties:{range:{sheetId,dimension:'ROWS',startIndex:0,endIndex:1000},properties:{pixelSize:42},fields:'pixelSize'}},
  {updateDimensionProperties:{range:{sheetId,dimension:'COLUMNS',startIndex:0,endIndex:spec.headers.length},properties:{pixelSize:160},fields:'pixelSize'}},
  ...[0,2,4,9,spec.headers.length-2].map(index=>({updateDimensionProperties:{range:{sheetId,dimension:'COLUMNS',startIndex:index,endIndex:index+1},properties:{pixelSize:index===2||index===spec.headers.length-2?300:220},fields:'pixelSize'}})),
  {setDataValidation:{range:{sheetId,startRowIndex:1,endRowIndex:1000,startColumnIndex:6,endColumnIndex:7},rule:{condition:{type:'ONE_OF_LIST',values:Object.values(INTAKE_STATUSES).map(names=>({userEnteredValue:names[0]}))},strict:true,showCustomUi:true}}},
 ];
}
