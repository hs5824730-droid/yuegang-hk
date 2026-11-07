import { normalizeService, SERVICES } from './enquiry-options';

export interface WhatsappPrefillConfig { zh:string; en:string; version:number; updatedAt?:string; }
export const DEFAULT_WHATSAPP_PREFILL = {
 zh:'您好，我通过桉湾 EUCOVE 网站咨询。我想了解{房屋城市}的{服务类型}，请与我联系。',
 en:'Hello, I found EUCOVE online. I would like to discuss {service} in {city}. Please contact me.',
};
export const PREFILL_VARIABLES=['房屋城市','服务类型','city','service'] as const;
const cityNames:Record<string,string>={Melbourne:'墨尔本',Sydney:'悉尼',Perth:'珀斯',Adelaide:'阿德莱德',Canberra:'堪培拉',Brisbane:'布里斯班'};
const clean=(value:string)=>new TextDecoder().decode(new TextEncoder().encode(value)).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'');
export function validPrefillTemplate(value:string){
 if(value.length>500||/<\/?[a-z][^>]*>/i.test(value)||/(?:\b[a-z][a-z0-9+.-]*:\/\/|(?:javascript|vbscript|data|file|tel|mailto|whatsapp|weixin):|www\.|wa\.me\/|(?:^|\s)\/\/\S)/i.test(value))return false;
 const stripped=value.replace(/\{([^{}]*)\}/g,(token,key)=>PREFILL_VARIABLES.includes(key)?'':token);
 return !/[{}]/.test(stripped)&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(value);
}
// Bound the encoded URL while retaining whole Unicode characters, including emoji.
export function boundedPrefill(value:string){let text='',size=0;for(const char of clean(value)){const n=encodeURIComponent(char).length;if(size+n>1200)break;text+=char;size+=n;}return text.trim();}
export function renderWhatsappPrefill(config:Pick<WhatsappPrefillConfig,'zh'|'en'>,context:{city?:string;service?:string;language?:string}){
 const lang=context.language==='en'?'en':'zh',template=config[lang];if(!template.trim())return '';
 const city=context.city&&context.city!=='other'?clean(context.city).replace(/\s+/g,' ').trim().slice(0,80):'';
 const normalized=normalizeService(context.service),service=normalized?SERVICES[normalized][lang]:'';
 const canonical=Object.keys(cityNames).find(key=>key.toLowerCase()===city.toLowerCase()||cityNames[key]===city)||city;
 const cityLabel=lang==='zh'?(cityNames[canonical]||city):canonical;
 if(template===DEFAULT_WHATSAPP_PREFILL[lang]&&(!city||!service))return boundedPrefill(lang==='zh'?`您好，我通过桉湾 EUCOVE 网站咨询。我想了解${cityLabel?cityLabel+'的':''}${service||'房产服务'}，请与我联系。`:`Hello, I found EUCOVE online. I would like to discuss ${service||'property services'}${city?' in '+canonical:''}. Please contact me.`);
 return boundedPrefill(template.replace(/\{(房屋城市|city|服务类型|service)\}/g,(_,key)=>key==='房屋城市'||key==='city'?cityLabel||(lang==='zh'?'相关地区':'your area'):service||(lang==='zh'?'房产服务':'property services')));
}
export function whatsappDestination(value:string,text=''){
 if(!/^\+[1-9]\d{6,14}$/.test(value))return null;
 return 'https://wa.me/'+value.slice(1)+(text?'?text='+encodeURIComponent(boundedPrefill(text)):'');
}
