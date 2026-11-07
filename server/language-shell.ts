import {isLanguagePage,isPublicPage,languageFromPath,languageRedirect,withoutLanguage,registrationPageTitle} from '../src/language-path';
import {documentMetadata,sitemap} from '../src/language-seo';
export {languageRedirect};
export function privateLanguagePath(path:string) {
 const plain=withoutLanguage(path);
 return ['/data','/server','/3d-preview','/depth','/reference-media','/brand-concepts','/@fs'].some(p=>plain===p||plain.startsWith(p+'/')) ||
  (!!languageFromPath(path)&&!isLanguagePage(path));
}
export function languageHead(url:URL) {
 const meta=documentMetadata(url);if(!meta)return '';
 return meta.links.map(l=>`<link data-language-seo rel="${l.rel}"${'hreflang' in l?` hreflang="${l.hreflang}"`:''} href="${l.href}">`).join('');
}
export function nodeLanguageHtml(html:string,url:URL) {
 const meta=documentMetadata(url),lang=languageFromPath(url.pathname);
 if(lang)html=html.replace(/<html\b([^>]*)>/i,(_tag,attributes:string)=>`<html${attributes.replace(/\s+lang=(['"])[^'"]*\1/i,'')} lang="${lang==='zh'?'zh-CN':'en'}">`);
 const registrationTitle=registrationPageTitle(url.pathname,lang||'zh');if(registrationTitle)html=html.replace(/<title>[^<]*<\/title>/i,`<title>${registrationTitle}</title>`);
 if(meta)html=html.replace(/<title>[^<]*<\/title>/i,`<title>${meta.title}</title>`).replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/i,`$1${meta.description}$2`).replace('</head>',languageHead(url)+'</head>');
 else html=html.replace('</head>','<meta data-language-seo name="robots" content="noindex,nofollow"></head>');
 return html;
}
export function languageResource(url:URL):{body:string;type:string}|null {
 if(url.pathname==='/sitemap.xml')return {body:sitemap(url.hostname.endsWith('eucove.com')?'https://eucove.com':'https://eucove.net'),type:'application/xml; charset=utf-8'};
 if(url.pathname==='/robots.txt')return {body:'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /contact\nDisallow: /en/contact\nDisallow: /zh/contact\nSitemap: https://'+(url.hostname.endsWith('eucove.com')?'eucove.com':'eucove.net')+'/sitemap.xml\n',type:'text/plain; charset=utf-8'};
 return null;
}
export function publicDocumentStatus(url:URL) {
 const plain=withoutLanguage(url.pathname);
 return isLanguagePage(url.pathname)||plain==='/admin'||plain.startsWith('/admin/')?200:404;
}
