import type {SiteLanguage} from './language-path';
export function isComSite(){return document.documentElement.dataset.site==='com'||window.location.hostname==='eucove.com'||window.location.hostname==='www.eucove.com';}
/** Native home destinations remain valid for each site's independent router. */
export function siteHomeHref(lang:SiteLanguage,hostname=window.location.hostname){
 return hostname==='eucove.com'||hostname==='www.eucove.com'||typeof document!=='undefined'&&document.documentElement.dataset.site==='com'?'/?lang='+lang:'/'+lang;
}
