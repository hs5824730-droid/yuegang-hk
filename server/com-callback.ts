import { cities } from './policy.js';
import { normalizeService } from '../src/enquiry-options.js';
import { META_PIXEL_ID, pixelPrivacyAllowed } from '../src/meta-pixel-policy.js';
import { languageFromPath } from '../src/language-path.js';

const citySet = new Set<string>(cities);
const cityLabels: Record<string, readonly [string, string]> = {
  'Hong Kong Island': ['港島', 'Hong Kong Island'], Kowloon: ['九龍', 'Kowloon'], 'New Territories': ['新界', 'New Territories'], Islands: ['離島', 'Islands'],
};

/** Defaults for a short callback. Present service, language, consent and requestId are left untouched. */
export function prepareLeadBody(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const input: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    input[key] = value;
  }
  if (input.service == null || (typeof input.service === 'string' && input.service.trim() === '')) input.service = 'letting';
  if (input.language == null || (typeof input.language === 'string' && input.language.trim() === '')) input.language = 'zh';
  if (input.consent == null || input.consent === '') delete input.consent;
  if (typeof input.requestId !== 'string' || input.requestId.trim() === '') delete input.requestId;
  else input.requestId = input.requestId.trim();
  const other = typeof input.cityOther === 'string' ? input.cityOther.trim() : '';
  delete input.cityOther;
  if (input.city === 'other') input.city = other;
  else if ((input.city == null || (typeof input.city === 'string' && input.city.trim() === '')) && other) input.city = other;
  return input;
}

export function isUrlEncoded(contentType: string | null | undefined) {
  return (contentType || '').toLowerCase().includes('application/x-www-form-urlencoded');
}

function esc(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export function landingLanguage(url: URL): 'zh' | 'en' {
  if (url.searchParams.get('lang') === 'en' || languageFromPath(url.pathname) === 'en') return 'en';
  return 'zh';
}

function serviceValue(value: unknown) {
  const normalized = normalizeService(typeof value === 'string' ? value : '');
  return normalized && normalized !== 'moving' ? normalized : 'letting';
}

function both(zh: string, en: string) {
  return `<span class="eucove-zh">${zh}</span><span class="eucove-en">${en}</span>`;
}

const style = `<style>
.eucove-callback{box-sizing:border-box;margin:0;padding:14px 14px 8px;background:#fffdfb;color:#21201c;font:16px/1.45 "Noto Sans SC Variable","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}
.eucove-callback *,.eucove-callback *::before,.eucove-callback *::after{box-sizing:border-box}
.eucove-callback [hidden]{display:none!important}
html:not([lang^="en"]) .eucove-zh-only,html:not([lang^="en"]) .eucove-callback .eucove-en,html:not([lang^="en"]) .eucove-callback-sticky .eucove-en{display:none}
html[lang^="en"] .eucove-callback .eucove-zh,html[lang^="en"] .eucove-callback-sticky .eucove-zh{display:none}
.eucove-callback-card{max-width:720px;margin:0 auto;padding:14px;border:1px solid #e7e5e4;background:#fff}
.eucove-callback-card h2{margin:0 0 4px;font-size:22px;line-height:1.25;color:#c2410c}
.eucove-callback-lead{margin:0 0 12px;font-size:14px}
.eucove-callback-fields{display:grid;gap:8px}
.eucove-callback-fields label{display:grid;gap:4px;font-size:14px;font-weight:650}
.eucove-callback-fields input,.eucove-callback-fields select{width:100%;min-height:48px;padding:10px 12px;border:1px solid #d6d3d1;background:#fff;color:#21201c;font:16px/1.3 inherit}
.eucove-callback-card button[type=submit]{width:100%;min-height:48px;margin-top:10px;border:0;background:#c2410c;color:#fff;font:600 16px/1.2 inherit;cursor:pointer}
.eucove-callback-card button[type=submit]:disabled{opacity:.7;cursor:wait}
.eucove-callback-privacy{margin:8px 0 0;font-size:12px;line-height:1.45;font-weight:450;color:#57534e;text-align:center}
.eucove-callback-privacy a{color:#c2410c}
.eucove-hp{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);border:0}
.eucove-callback-status{margin:8px 0 0;font-size:15px}
.eucove-callback-status.is-error{color:#b42318}
.eucove-callback-sticky{display:none}
.eucove-callback-sticky[hidden]{display:none!important}
@media(max-width:760px){
.eucove-callback-sticky{display:flex;position:fixed;z-index:64;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));min-height:48px;align-items:center;justify-content:center;padding:8px 12px;background:#c2410c;color:#fff;text-decoration:none;font:600 16px/1.2 "Noto Sans SC Variable","PingFang SC",sans-serif;box-shadow:0 8px 20px #00000033}
body.has-direct-contact .eucove-callback-sticky{bottom:calc(var(--direct-contact-height, 76px) + 8px)}
}
@media(min-width:800px){.eucove-callback-fields{grid-template-columns:1fr 1fr 1fr;align-items:end}}
</style>`;

function formMarkup(values: Record<string, unknown> | undefined, requestId: string) {
  const selected = typeof values?.city === 'string' && citySet.has(values.city) ? values.city : '';
  const other = selected ? '' : (typeof values?.city === 'string' ? values.city : '');
  const language = values?.language === 'en' ? 'en' : 'zh';
  const option = (value: string, zh: string, en: string, on: boolean) => `<option value="${esc(value)}" data-zh="${esc(zh)}" data-en="${esc(en)}"${on ? ' selected' : ''}>${esc(language === 'en' ? en : zh)}</option>`;
  const options = [option('', '请选择城市', 'Choose a city', !selected && !other)]
    .concat(cities.map(city => option(city, cityLabels[city][0], cityLabels[city][1], selected === city)))
    .concat(option('other', '其他城市', 'Another city', !selected && !!other));
  const name = esc(typeof values?.name === 'string' ? values.name.slice(0, 100) : '');
  const contact = esc(typeof values?.contact === 'string' ? values.contact.slice(0, 160) : '');
  return `<form id="eucove-callback-form" action="/api/leads" method="post" accept-charset="UTF-8">
<div class="eucove-callback-fields">
<label>${both('称呼', 'Name')}<input name="name" required maxlength="100" autocomplete="name" enterkeyhint="next" value="${name}"></label>
<label>${both('电话', 'Phone')}<input name="contact" type="tel" inputmode="tel" required maxlength="160" autocomplete="tel" placeholder="+61 4xx xxx xxx" enterkeyhint="next" value="${contact}"></label>
<label>${both('城市', 'City')}<select name="city" required>${options.join('')}</select></label>
<label data-city-other${other ? '' : ' hidden'}>${both('其他城市名称', 'City name')}<input name="cityOther" maxlength="80" autocomplete="address-level2" value="${esc(other.slice(0, 80))}"${other ? ' required' : ''}></label>
</div>
<div class="eucove-hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off" value=""></label></div>
<input type="hidden" name="service" value="${esc(serviceValue(values?.service))}">
<input type="hidden" name="language" value="${language}">
<input type="hidden" name="contactMethod" value="phone">
<input type="hidden" name="requestId" value="${esc(requestId)}">
<button type="submit">${both('免费评估租金', 'Free rent assessment')}</button>
<p class="eucove-callback-privacy">${both('提交即表示同意<a href="/privacy" target="_blank" rel="noopener noreferrer">隐私政策</a>', 'Submitting means you agree to the <a href="/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>')}</p>
</form>`;
}

/** Marketing pages no longer inject the top callback block. The frozen header stays first. */
export function comCallbackMarkup(_url: URL): string {
  return '';
}

export function renderCallbackResult(options: { status: number; lang: 'zh' | 'en'; requestId: string; values?: Record<string, unknown>; headers: Headers; error: boolean }): string {
  const lang = options.lang === 'en' ? 'en' : 'zh';
  const requestId = /^[0-9a-f-]{36}$/i.test(options.requestId) ? options.requestId : crypto.randomUUID();
  const created = options.status === 201 && !options.error;
  const pixel = created && pixelPrivacyAllowed(options.headers)
    ? `<img height="1" width="1" alt="" hidden referrerpolicy="no-referrer" src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&amp;ev=Lead&amp;noscript=1&amp;dl=https%3A%2F%2Feucove.com%2Fservices">`
    : '';
  const title = options.error ? (lang === 'en' ? 'Please check the form' : '请检查填写内容') : (lang === 'en' ? 'Enquiry received' : '咨询已收到');
  const body = options.error
    ? `<section id="eucove-callback" class="eucove-callback"><div class="eucove-callback-card">${style}
<h2>${esc(title)}</h2>
<p id="eucove-callback-status" class="eucove-callback-status is-error" role="alert">${lang === 'en' ? 'Check your name, phone and city.' : '请填写称呼、电话和城市。'}</p>
${formMarkup({ ...options.values, language: lang }, requestId)}
</div></section><script src="/eucove-callback.js" defer></script>`
    : `<main style="max-width:640px;margin:48px auto;padding:24px;font:16px/1.5 sans-serif"><h1>${esc(title)}</h1><p>${lang === 'en' ? 'We will call you about the rent.' : '我们会用您留下的电话联系您，说明租金评估。'}</p><p><a href="${lang === 'en' ? '/services?lang=en' : '/services'}">${lang === 'en' ? 'Back' : '返回'}</a></p>${pixel}</main>`;
  return `<!doctype html><html lang="${lang === 'en' ? 'en' : 'zh-CN'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} | 桉湾 EUCOVE</title></head><body>${body}</body></html>`;
}
