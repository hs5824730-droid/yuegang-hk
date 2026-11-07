/** URL language is authoritative. Shared by browser, Node and the net edge shell. */
export type SiteLanguage = 'zh' | 'en';
export const LANGUAGE_SWITCH_EVENT = 'eucove:language-switch';
export const publicPagePaths = ['/', '/services', '/offer', '/properties', '/history', '/viewings', '/buy-sell', '/advisory', '/home-services', '/about', '/privacy', '/credits'] as const;
export function languageFromPath(path: string): SiteLanguage | null {
 return path.match(/^\/(zh|en)(?:\/|$)/)?.[1] as SiteLanguage | undefined || null;
}
export function withoutLanguage(path: string): string {
 const stripped = path.replace(/^\/(?:zh|en)(?=\/|$)/, '');
 return stripped.replace(/\/$/, '') || '/';
}
export function isPublicPage(path: string): boolean {
 const plain = withoutLanguage(path);
 return (publicPagePaths as readonly string[]).includes(plain) || /^\/properties\/[a-f0-9-]{36}$/i.test(plain);
}
export function isLanguagePage(path: string): boolean {
 const plain = withoutLanguage(path);
 return isPublicPage(path) || plain === '/overseas' || /^\/(?:registration|(?:rental|buying|selling|advisory)-registration)$/.test(plain) || /^\/contact(?:\/(?:phone|whatsapp|wechat))?$/.test(plain);
}
export function registrationPageTitle(path:string,lang:SiteLanguage):string|null {
 const titles:Record<string,readonly string[]>={'/registration':['需求登记','Register your needs'],'/rental-registration':['房屋出租委托登记','Property rental registration'],'/buying-registration':['购房需求登记','Buying registration'],'/selling-registration':['卖房需求登记','Selling registration'],'/advisory-registration':['置业服务登记','Property services registration']};
 const names=titles[withoutLanguage(path)];return names?names[lang==='zh'?0:1]+(lang==='zh'?' | 桉湾 EUCOVE':' | EUCOVE'):null;
}
export function localizedHref(href: string, lang: SiteLanguage): string {
 if (!href.startsWith('/') || href.startsWith('//')) return href;
 const url = new URL(href, 'https://eucove.net');
 if (!isLanguagePage(url.pathname)) return href;
 const plain = withoutLanguage(url.pathname);url.searchParams.delete('lang');
 return '/' + lang + (plain === '/' ? '' : plain) + url.search + url.hash;
}
/** Legacy ads keep every business parameter; only the obsolete language query is consumed. */
export function languageRedirect(url: URL): string | null {
 if (!isLanguagePage(url.pathname)) return null;
 const queryLang = url.searchParams.get('lang');
 const lang = languageFromPath(url.pathname) || (queryLang === 'en' ? 'en' : 'zh');
 const target = localizedHref(url.pathname + url.search + url.hash, lang);
 return target === url.pathname + url.search + url.hash ? null : target;
}
export function isLanguageSwitchEvent(event: Event): boolean {
 return (event as Event & { eucoveLanguageSwitch?: boolean }).eucoveLanguageSwitch === true;
}
