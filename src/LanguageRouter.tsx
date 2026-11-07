import {useLayoutEffect, useState, type ReactNode} from 'react';
import {BrowserRouter, useLocation} from 'react-router-dom';
import {languageFromPath, languageRedirect} from './language-path';
import {useI18n} from './i18n';
import {documentMetadata} from './language-seo';

function initialBase() {
 const target = languageRedirect(new URL(window.location.href));
 if (target) window.history.replaceState(window.history.state, '', target);
 return languageFromPath(window.location.pathname);
}
/** Keep React Router's public Link/useLocation contract relative to the language root. */
export function LanguageRouter({children}: {children: ReactNode}) {
 const [base, setBase] = useState(initialBase);
 useLayoutEffect(() => {
  const update = () => setBase(languageFromPath(window.location.pathname));
  window.addEventListener('popstate', update);
  return () => window.removeEventListener('popstate', update);
 }, []);
 return <BrowserRouter basename={base ? '/' + base : '/'} useTransitions={false}>{children}</BrowserRouter>;
}
export function LanguageSeo() {
 const location = useLocation(), {lang} = useI18n();
 useLayoutEffect(() => {
  const meta = documentMetadata(new URL(window.location.href));
  for (const old of document.head.querySelectorAll('[data-language-seo]')) old.remove();
  if (!meta) {const el=document.createElement('meta');el.name='robots';el.content='noindex,nofollow';el.dataset.languageSeo='';document.head.append(el);return;}
  for (const {rel,href,hreflang} of meta.links) {
   const el = document.createElement('link');el.rel = rel;el.href = href;
   if (hreflang) el.hreflang = hreflang;el.dataset.languageSeo = '';document.head.append(el);
  }
  document.documentElement.lang = lang === 'zh' ? 'zh-HK' : 'en';
 }, [location.pathname, lang]);
 return null;
}
