import {isLanguagePage,localizedHref,LANGUAGE_SWITCH_EVENT,type SiteLanguage} from './language-path';
/** Browser-only navigation, kept out of the shared edge URL policy. */
export function navigateLanguage(lang:SiteLanguage):boolean {
 if (!isLanguagePage(window.location.pathname)) return false;
 const target = localizedHref(window.location.pathname + window.location.search + window.location.hash, lang);
 if (target === window.location.pathname + window.location.search + window.location.hash) return true;
 const old = window.history.state || {}, state = { ...old };
 const sheet = state['enquiry-sheet'] === true;delete state['enquiry-sheet'];
 if (!sheet && typeof state.idx === 'number') state.idx++;
 window.history[sheet ? 'replaceState' : 'pushState'](state, '', target);
 window.dispatchEvent(new Event(LANGUAGE_SWITCH_EVENT));
 const event = new PopStateEvent('popstate', { state });
 Object.defineProperty(event, 'eucoveLanguageSwitch', { value: true });
 window.dispatchEvent(event);return true;
}
