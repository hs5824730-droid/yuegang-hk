import {registrationSheetFormat} from '../server/registration-sheets.js';
const targetId=270017,overviewId=270018,orange={red:1,green:.37,blue:.1};
const plan=registrationSheetFormat(targetId,'房东登记');
const requests:Record<string,unknown>[]=[...plan.requests,
 {addSheet:{properties:{sheetId:overviewId,title:'使用与概览',gridProperties:{rowCount:30,columnCount:5,frozenRowCount:1}}}},
 {updateCells:{start:{sheetId:overviewId,rowIndex:0,columnIndex:0},rows:[
  {values:[{userEnteredValue:{stringValue:'桉湾 EUCOVE｜出租委托登记'}}]},
  {values:[{userEnteredValue:{stringValue:'数据来源'}},{userEnteredValue:{stringValue:'网站房东登记；后台为真源，表格为查看副本'}}]},
  {values:[{userEnteredValue:{stringValue:'必填资料'}},{userEnteredValue:{stringValue:'房东姓名、联系电话、电子邮箱；其他全部选填'}}]},
  {values:[{userEnteredValue:{stringValue:'登记数量'}},{userEnteredValue:{formulaValue:"=COUNTA('房东登记'!A2:A)"}}]},
  ...['待联系','已联系','跟进中','已委托','暂缓'].map(s=>({values:[{userEnteredValue:{stringValue:s}},{userEnteredValue:{formulaValue:`=COUNTIF('房东登记'!G2:G,"${s}")`}}]})),
  {values:[{userEnteredValue:{stringValue:'同步规则'}},{userEnteredValue:{stringValue:'按记录编号去重；不会复制历史客户。持续后台授权待接入后生效。'}}]},
  {values:[{userEnteredValue:{stringValue:'隐私'}},{userEnteredValue:{stringValue:'表链接仅交用户和后台；不放在客户登记页面。'}}]},
 ],fields:'userEnteredValue'}},
 {repeatCell:{range:{sheetId:overviewId,startRowIndex:0,endRowIndex:1,startColumnIndex:0,endColumnIndex:5},cell:{userEnteredFormat:{backgroundColor:orange,textFormat:{bold:true,foregroundColor:{red:1,green:1,blue:1},fontSize:14}}},fields:'userEnteredFormat'}},
 {updateDimensionProperties:{range:{sheetId:overviewId,dimension:'COLUMNS',startIndex:0,endIndex:1},properties:{pixelSize:180},fields:'pixelSize'}},
 {updateDimensionProperties:{range:{sheetId:overviewId,dimension:'COLUMNS',startIndex:1,endIndex:2},properties:{pixelSize:600},fields:'pixelSize'}},
 {repeatCell:{range:{sheetId:overviewId,startRowIndex:1,endRowIndex:20,startColumnIndex:0,endColumnIndex:5},cell:{userEnteredFormat:{wrapStrategy:'WRAP',verticalAlignment:'MIDDLE'}},fields:'userEnteredFormat'}},
 {updateDimensionProperties:{range:{sheetId:overviewId,dimension:'ROWS',startIndex:0,endIndex:20},properties:{pixelSize:42},fields:'pixelSize'}},
 {updateSpreadsheetProperties:{properties:{locale:'zh_CN',timeZone:'Asia/Shanghai'},fields:'locale,timeZone'}},
 {deleteSheet:{sheetId:1979366}},
];
console.log(JSON.stringify({requests}));
