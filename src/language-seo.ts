import {SITE_ORIGIN} from './hk-site';
import {isPublicPage, languageFromPath, localizedHref, publicPagePaths, withoutLanguage} from './language-path';
export function documentMetadata(url: URL) {
 if (!isPublicPage(url.pathname)) return null;
 const lang = languageFromPath(url.pathname) || (url.searchParams.get('lang') === 'en' ? 'en' : 'zh');
 // The redesigned net is its own published site; never canonicalize to absent com translations.
 const origin = SITE_ORIGIN || url.origin;
 const path = withoutLanguage(url.pathname);
 const names:Record<string,[string,string]> = {'/services':['放租同管理','Letting & management'],'/buy-sell':['買賣物業','Buying & selling'],'/advisory':['置業顧問','Property services'],'/home-services':['房屋服務：翻修、園藝、清潔同居家睇住','Home services: renovation, garden, cleaning and home sitting'],'/viewings':['網上睇樓','Online viewings'],'/about':['關於我哋','About us'],'/offer':['限時優惠','Special offers'],'/privacy':['隱私說明','Privacy'],'/credits':['素材說明','Credits']};
 const title = (names[path]?.[lang === 'zh' ? 0 : 1] || (lang === 'zh' ? '香港房產放租同管理' : 'Hong Kong letting & property management')) + ' | 悦港 Harbour Joy';
 const description=path==='/home-services'?(lang==='zh'?'悦港 Harbour Joy 房屋服務：翻修維修、草坪園藝、清潔、空置同居家睇住。推廣期人工費半價，免費上門評估。':'Harbour Joy home services: renovation and repairs, lawn and garden, cleaning, vacancy checks and home sitting. Half-price labour during the launch offer, with a free on-site assessment.'):lang==='zh'?'悦港 Harbour Joy 為香港業主提供房屋出租、租務管理及買賣查詢，粵語、普通話、英文都講得，本地團隊跟進。':'Harbour Joy offers Hong Kong property letting, ongoing management, buying and selling support, with local teams and Chinese and English communication.';
 return {lang:lang === 'zh' ? 'zh-HK' : 'en',title,description,links:[
  {rel:'canonical',href:origin + localizedHref(path,lang)},
  {rel:'alternate',hreflang:'zh-HK',href:origin + localizedHref(path,'zh')},
  {rel:'alternate',hreflang:'en',href:origin + localizedHref(path,'en')},
  {rel:'alternate',hreflang:'x-default',href:origin + localizedHref(path,'zh')},
 ]};
}
export function sitemap(origin = SITE_ORIGIN || 'http://localhost:5173') {
 const urls = publicPagePaths.flatMap(path => ['zh','en'].map(lang => {
  const p = localizedHref(path,lang as 'zh'|'en');
  return `<url><loc>${origin}${p}</loc><xhtml:link rel="alternate" hreflang="zh-HK" href="${origin}${localizedHref(path,'zh')}"/><xhtml:link rel="alternate" hreflang="en" href="${origin}${localizedHref(path,'en')}"/></url>`;
 }));
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'+urls.join('')+'</urlset>';
}
