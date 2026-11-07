/** Offer email as a fourth contact method on the frozen com enquiry form; its validation and labels already support it. */
export function leadEmailComBundle(source){
 const replacements=[
  ['C1=["phone","whatsapp","wechat"]', 'C1=["phone","whatsapp","wechat","email"]'],
  ['e.contact=W.contactMethod==="wechat"?m(', 'e.contact=W.contactMethod==="email"?m("请填写有效的邮箱地址，例如 name@example.com","Enter a valid email address, e.g. name@example.com"):W.contactMethod==="wechat"?m('],
  ['type:W.contactMethod==="wechat"?"text":"tel",inputMode:W.contactMethod==="wechat"?"text":"tel",autoComplete:W.contactMethod==="wechat"?"off":"tel"', 'type:W.contactMethod==="email"?"email":W.contactMethod==="wechat"?"text":"tel",inputMode:W.contactMethod==="email"?"email":W.contactMethod==="wechat"?"text":"tel",autoComplete:W.contactMethod==="email"?"email":W.contactMethod==="wechat"?"off":"tel"'],
  ['placeholder:W.contactMethod==="wechat"?m("您的微信号","Your WeChat ID"):"+61 4xx xxx xxx"', 'placeholder:W.contactMethod==="email"?"name@example.com":W.contactMethod==="wechat"?m("您的微信号","Your WeChat ID"):"+61 4xx xxx xxx"'],
 ];
 for(const [before,after] of replacements){
  if(source.split(before).length!==2)throw Error('Original com enquiry form changed; review email integration');
  source=source.replace(before,after);
 }
 return source;
}
