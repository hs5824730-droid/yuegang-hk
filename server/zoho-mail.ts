import { MAIL_ADDRESS } from '../src/mail-types.js';

export interface MailEnv {
 MAIL_ENABLED?:string; MAIL_SEND_ENABLED?:string; MAIL_START_AT?:string;
 ZOHO_CLIENT_ID?:string; ZOHO_CLIENT_SECRET?:string; ZOHO_REFRESH_TOKEN?:string; ZOHO_ACCOUNT_ID?:string;
}
export function mailConfigured(env:MailEnv) { return Boolean(env.ZOHO_CLIENT_ID&&env.ZOHO_CLIENT_SECRET&&env.ZOHO_REFRESH_TOKEN&&env.ZOHO_ACCOUNT_ID); }
export class MailProviderError extends Error { constructor(public code:string,public definitive=false){super(code);} }
export interface ProviderMessage { messageId:string;threadId?:string;folderId:string;fromAddress:string;sender?:string;subject?:string;receivedTime:string;hasAttachment?:string|number; }
export class ZohoMail {
 private token='';
 constructor(private env:MailEnv,private transport:typeof fetch=fetch){}
 private async authenticate(){
  if(this.token)return;
  if(!mailConfigured(this.env))throw new MailProviderError('mail_not_configured');
  const transport=this.transport;
  const response=await transport('https://accounts.zoho.com/oauth/v2/token',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),body:new URLSearchParams({grant_type:'refresh_token',client_id:this.env.ZOHO_CLIENT_ID!,client_secret:this.env.ZOHO_CLIENT_SECRET!,refresh_token:this.env.ZOHO_REFRESH_TOKEN!})});
  const data=await response.json() as any;
  if(!response.ok||typeof data.access_token!=='string')throw new MailProviderError('mail_authorization_failed');
  this.token=data.access_token;
 }
 async request(path:string,body?:unknown):Promise<any>{
  await this.authenticate();
  const transport=this.transport;
  const response=await transport('https://mail.zoho.com/api/'+path,{method:body?'POST':'GET',redirect:'manual',headers:{Authorization:'Zoho-oauthtoken '+this.token,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),...(body?{body:JSON.stringify(body)}:{})});
  const result=await response.json() as any;
  if(!response.ok||Number(result.status?.code)!==200)throw new MailProviderError('mail_api_'+response.status,response.status>=400&&response.status<500);
  return result.data;
 }
 async verifyIdentity(){
  const accounts=await this.request('accounts');
  const own=accounts.find((a:any)=>String(a.accountId)===this.env.ZOHO_ACCOUNT_ID);
  if(own?.primaryEmailAddress?.toLowerCase()!==MAIL_ADDRESS)throw new MailProviderError('mail_identity_mismatch');
  return own;
 }
 async folders(){return this.request(`accounts/${this.env.ZOHO_ACCOUNT_ID}/folders`) as Promise<{folderId:string;folderType:string}[]>;}
 async list(start=1){
  const query=new URLSearchParams({start:String(start),limit:'200',status:'all',sortBy:'date',sortorder:'false',includeto:'true',includesent:'false',includearchive:'true',threadedMails:'false'});
  return this.request(`accounts/${this.env.ZOHO_ACCOUNT_ID}/messages/view?${query}`) as Promise<ProviderMessage[]>;
 }
 async content(folderId:string,messageId:string){
  const data=await this.request(`accounts/${this.env.ZOHO_ACCOUNT_ID}/folders/${encodeURIComponent(folderId)}/messages/${encodeURIComponent(messageId)}/content?includeBlockContent=true`);
  return String(data.content||'');
 }
 async reply(messageId:string,toAddress:string,subject:string,content:string){
  const own=await this.verifyIdentity();
  if(!own.sendMailDetails?.some((d:any)=>d.fromAddress===MAIL_ADDRESS&&d.displayName==='contact'))throw new MailProviderError('mail_sender_not_contact',true);
  return this.request(`accounts/${this.env.ZOHO_ACCOUNT_ID}/messages/${encodeURIComponent(messageId)}`,{fromAddress:`contact <${MAIL_ADDRESS}>`,toAddress,subject,content,action:'reply',mailFormat:'plaintext',encoding:'UTF-8',askReceipt:'no'});
 }
}

/** Render remote HTML only as inert text. No remote images, links, scripts or tracking. */
export function mailPlainText(input:string){
 const entities:Record<string,string>={nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
 return input.slice(0,500000).replace(/<(script|style|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<\s*(br|\/p|\/div|\/tr|\/li)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&(nbsp|amp|lt|gt|quot|apos);/g,(_,x)=>entities[x]||'').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,x)=>{const n=x[0].toLowerCase()==='x'?parseInt(x.slice(1),16):Number(x);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,100000);
}
