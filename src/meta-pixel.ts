import { PIXEL_FRAME_FLAG, productionMarketingUrl } from './meta-pixel-policy';
export { META_PIXEL_ID } from './meta-pixel-policy';
let lastPath = '';
let pendingPath = '';
let pending = 0;
let frame: HTMLIFrameElement | undefined;
export function trackPublicPageView() {
  try {
    const location = new URL(window.location.href);
    const allowed = navigator.doNotTrack !== '1' && !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
    const canonical = allowed ? productionMarketingUrl(location) : null;
    if (!canonical) {
      cancelAnimationFrame(pending); pendingPath = ''; lastPath = ''; frame?.remove(); frame = undefined;
      return;
    }
    const key = location.pathname.replace(/\/$/, '') || '/';
    // Path-only visits: StrictMode, query edits and room/hash changes are not new pages.
    if (lastPath === key || pendingPath === key) return;
    cancelAnimationFrame(pending);
    pendingPath = key;
    pending = requestAnimationFrame(() => {
      pendingPath = '';
      frame?.remove();
      frame = document.createElement('iframe');
      frame.hidden = true; frame.tabIndex = -1; frame.setAttribute('aria-hidden', 'true');
      frame.title = 'Page view measurement'; frame.referrerPolicy = 'no-referrer';
      // The SDK cannot access the parent URL, form, admin state or site storage.
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.src = canonical + '?' + PIXEL_FRAME_FLAG + '=1';
      document.body.appendChild(frame);
      lastPath = key;
    });
  } catch { /* Analytics never interrupts navigation or a saved enquiry. */ }
}
const sentLeads = new Set<string>();
/** Load a fresh Lead-only pixel document. A second enquiry gets its own frame, so a repeated src still fires. */
export function trackSavedLead(attemptId: string) {
  try {
    if (!attemptId || sentLeads.has(attemptId) || !frame?.src) return;
    const next = document.createElement('iframe');
    next.hidden = true; next.tabIndex = -1; next.setAttribute('aria-hidden', 'true');
    next.title = 'Page view measurement'; next.referrerPolicy = 'no-referrer';
    next.setAttribute('sandbox', 'allow-scripts');
    next.src = frame.src.split('?')[0] + '?' + PIXEL_FRAME_FLAG + '=lead';
    frame.replaceWith(next);
    frame = next;
    sentLeads.add(attemptId);
  } catch { /* A saved enquiry must not depend on analytics. */ }
}
