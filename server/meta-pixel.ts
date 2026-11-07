import { META_PIXEL_ID, PIXEL_FRAME_FLAG, pixelPrivacyAllowed, productionMarketingUrl } from '../src/meta-pixel-policy';
export function pixelFrameRequest(url: URL) { return url.searchParams.has(PIXEL_FRAME_FLAG); }
function pixelFrameSearch(url: URL) {
  return url.search === '?' + PIXEL_FRAME_FLAG + '=1' || url.search === '?' + PIXEL_FRAME_FLAG + '=lead';
}
export function pixelFrameHtml(url: URL, headers: Headers): string | null {
  const canonical = productionMarketingUrl(url);
  if (!canonical || !pixelPrivacyAllowed(headers) || !pixelFrameSearch(url)) return null;
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow"><script src="/meta-pixel-frame.js" defer></script></head><body></body></html>';
}
export function pixelFrameHeaders(url?: URL) {
  const origin = url?.hostname.endsWith('eucove.net') ? 'https://eucove.net' : 'https://eucove.com';
  return {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store, no-transform',
    'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow',
    'Content-Security-Policy': `default-src 'none'; script-src ${origin}/meta-pixel-frame.js https://connect.facebook.net/en_US/fbevents.js; img-src https://www.facebook.com; connect-src https://www.facebook.com; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; sandbox allow-scripts`,
  };
}
export function pixelNoscript(url: URL, headers: Headers): string {
  const canonical = productionMarketingUrl(url);
  if (!canonical || !pixelPrivacyAllowed(headers) || pixelFrameRequest(url)) return '';
  const source = `https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1&dl=${encodeURIComponent(canonical)}`;
  return `<noscript><img height="1" width="1" hidden alt="" referrerpolicy="no-referrer" src="${source.replaceAll('&', '&amp;')}" /></noscript>`;
}
