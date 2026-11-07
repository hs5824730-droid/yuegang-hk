/** Public identifier; these routes contain no consultation/account identifiers. */
import {languageFromPath,withoutLanguage} from './language-path';
export const META_PIXEL_ID = '1774502991020855';
export const PIXEL_FRAME_FLAG = '__eucove_pixel';
const publicPaths = new Set(['/', '/services', '/offer', '/properties', '/history', '/viewings', '/buy-sell', '/advisory', '/about', '/privacy', '/credits']);
export function marketingPath(pathname: string): string | null {
  const path = withoutLanguage(pathname),lang=languageFromPath(pathname),prefix=lang?'/'+lang:'';
  if (publicPaths.has(path)) return prefix+(path==='/'?'':path)||'/';
  // Published property details are counted under their public section, without UUIDs.
  return /^\/properties\/[a-f0-9-]{36}$/i.test(path) ? prefix+'/properties' : null;
}
export function productionMarketingUrl(url: URL): string | null {
  const path = marketingPath(url.pathname);
  return url.protocol === 'https:' && ['eucove.com', 'www.eucove.com','eucove.net','www.eucove.net'].includes(url.hostname) && !url.port && path
    ? 'https://' + url.hostname.replace(/^www\./,'') + path : null;
}
export function pixelPrivacyAllowed(headers: Headers) {
  return headers.get('DNT') !== '1' && headers.get('Sec-GPC') !== '1';
}
