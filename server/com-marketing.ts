import {isPublicPage,languageFromPath,withoutLanguage} from '../src/language-path';
/** .com's frozen marketing router predates language basenames. Preserve its UI and language query. */
export function comMarketingRedirect(url:URL):string|null {
 if(!['eucove.com','www.eucove.com'].includes(url.hostname))return null;
 const lang=languageFromPath(url.pathname);
 if(!lang||!isPublicPage(url.pathname)&&withoutLanguage(url.pathname)!=='/overseas')return null;
 // Home services is a standalone page in the current bundle, served under its language path.
 if(withoutLanguage(url.pathname)==='/home-services')return null;
 const next=new URL(url);next.pathname=withoutLanguage(url.pathname);next.searchParams.set('lang',lang);
 return next.pathname+next.search+next.hash;
}
