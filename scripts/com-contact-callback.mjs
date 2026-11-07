/** Narrow business-flow changes to the verified original .com bundle; no visual redesign. */
export function callbackOnlyComBundle(source){
 const replacements=[
  [',(W.contactMethod==="whatsapp"||W.contactMethod==="wechat")&&Ln(W.contactMethod,Xe,ge.current)',''],
  ['W.contactMethod==="whatsapp"?m("提交并打开 WhatsApp","Send and open WhatsApp"):W.contactMethod==="wechat"?m("提交并查看微信二维码","Send and show WeChat QR"):m("发送咨询","Send enquiry")','m("提交联系方式","Submit contact details")'],
 ];
 for(const [before,after] of replacements){
  if(source.split(before).length!==2)throw Error('Original com contact flow changed; review callback patch before building');
  source=source.replace(before,after);
 }
 return source;
}
