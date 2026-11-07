import {isPublicPage, languageFromPath, localizedHref, publicPagePaths, withoutLanguage} from './language-path';
export function documentMetadata(url: URL) {
 if (!isPublicPage(url.pathname)) return null;
 const lang = languageFromPath(url.pathname) || (url.searchParams.get('lang') === 'en' ? 'en' : 'zh');
 // The redesigned net is its own published site; never canonicalize to absent com translations.
 const origin = /^(?:www\.)?eucove\.com$/.test(url.hostname) ? 'https://eucove.com' : 'https://eucove.net';
 const path = withoutLanguage(url.pathname);
 const names:Record<string,[string,string]> = {'/services':['出租与托管','Letting & management'],'/buy-sell':['买卖房屋','Buying & selling'],'/advisory':['置业顾问','Property services'],'/home-services':['房屋服务：翻修、园艺、清洁与居家照看','Home services: renovation, garden, cleaning and home sitting'],'/viewings':['在线看房','Online viewings'],'/about':['关于我们','About us'],'/offer':['限时优惠','Special offers'],'/privacy':['隐私说明','Privacy'],'/credits':['素材说明','Credits']};
 const title = (names[path]?.[lang === 'zh' ? 0 : 1] || (lang === 'zh' ? '澳洲房产出租与托管' : 'Australian letting & property management')) + ' | 桉湾 EUCOVE';
 const description=path==='/home-services'?(lang==='zh'?'桉湾 EUCOVE 房屋服务：翻修维修、草坪园艺、清洁、空置与居家照看。推广期人工费半价，免费上门评估。':'EUCOVE home services: renovation and repairs, lawn and garden, cleaning, vacancy checks and home sitting. Half-price labour during the launch offer, with a free on-site assessment.'):lang==='zh'?'桉湾 EUCOVE 为澳洲房东提供房屋出租、长期托管及买卖咨询，中英文沟通，当地团队跟进。':'EUCOVE offers Australian property letting, ongoing management, buying and selling support, with local teams and Chinese and English communication.';
 return {lang:lang === 'zh' ? 'zh-CN' : 'en',title,description,links:[
  {rel:'canonical',href:origin + localizedHref(path,lang)},
  {rel:'alternate',hreflang:'zh-Hans',href:origin + localizedHref(path,'zh')},
  {rel:'alternate',hreflang:'en',href:origin + localizedHref(path,'en')},
  {rel:'alternate',hreflang:'x-default',href:origin + localizedHref(path,'zh')},
 ]};
}
export function sitemap(origin = 'https://eucove.net') {
 const urls = publicPagePaths.flatMap(path => ['zh','en'].map(lang => {
  const p = localizedHref(path,lang as 'zh'|'en');
  return `<url><loc>${origin}${p}</loc><xhtml:link rel="alternate" hreflang="zh-Hans" href="${origin}${localizedHref(path,'zh')}"/><xhtml:link rel="alternate" hreflang="en" href="${origin}${localizedHref(path,'en')}"/></url>`;
 }));
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'+urls.join('')+'</urlset>';
}
