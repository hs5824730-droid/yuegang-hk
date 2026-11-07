import { normalizeService, SERVICES } from './enquiry-options';

export interface WhatsappPrefillConfig { zh:string; en:string; version:number; updatedAt?:string; }
export const DEFAULT_WHATSAPP_PREFILL = {
 zh:'你好，我通過悦港 Harbour Joy 網站查詢。我想了解{房屋地區}嘅{服務類型}，請同我聯絡。',
 en:'Hello, I found Harbour Joy online. I would like to discuss {service} in {city}. Please contact me.',
};
export const PREFILL_VARIABLES=['房屋地區','服務類型','city','service'] as const;
const cityNames:Record<string,string>={'Hong Kong Island':'港島',Kowloon:'九龍','New Territories':'新界',Islands:'離島'};
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
 if(template===DEFAULT_WHATSAPP_PREFILL[lang]&&(!city||!service))return boundedPrefill(lang==='zh'?`你好，我通過悦港 Harbour Joy 網站查詢。我想了解${cityLabel?cityLabel+'嘅':''}${service||'房產服務'}，請同我聯絡。`:`Hello, I found Harbour Joy online. I would like to discuss ${service||'property services'}${city?' in '+canonical:''}. Please contact me.`);
 return boundedPrefill(template.replace(/\{(房屋地區|city|服務類型|service)\}/g,(_,key)=>key==='房屋地區'||key==='city'?cityLabel||(lang==='zh'?'相關地區':'your area'):service||(lang==='zh'?'房產服務':'property services')));
}
export function whatsappDestination(value:string,text=''){
 if(!/^\+[1-9]\d{6,14}$/.test(value))return null;
 return 'https://wa.me/'+value.slice(1)+(text?'?text='+encodeURIComponent(boundedPrefill(text)):'');
}
