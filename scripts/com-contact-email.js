/* Callback and intake links for the original .com UI. No tracking or API calls. */
(() => {
 let queued=false;
 function updateRegistrationLinks(en){
  if(!document.getElementById('eucove-intake-layout')){const style=document.createElement('style');style.id='eucove-intake-layout';style.textContent='[data-eucove-intake]{max-width:100%;white-space:normal}@media(max-width:600px){.advisory-page .ds-split>*{min-width:0}.advisory-page .ds-split{overflow:hidden}.mobile-contact.direct-contact{max-width:100%;min-width:0}.mobile-contact.direct-contact>.btn{min-width:0;white-space:normal;flex:1}}';document.head.append(style);}
  const prefix=en?'/en':'/zh';
  const links=[['.sales-selling-cta','/selling-registration','登记卖房需求','Register selling needs'],['.sales-buying-cta','/buying-registration','登记购房需求','Register buying needs'],['.advisory-home-cta,.advisory-hero-cta','/advisory-registration?service=renovation','登记装修需求','Register renovation needs']];
  for(const [selector,path,zh,english] of links)for(const reference of document.querySelectorAll(selector)){
   let link=reference.nextElementSibling;
   if(!link?.matches('a[data-eucove-intake]')){link=document.createElement('a');link.dataset.eucoveIntake='';link.className='btn btn-line';reference.insertAdjacentElement('afterend',link);}
   const href=prefix+path,label=en?english:zh;if(link.getAttribute('href')!==href)link.setAttribute('href',href);if(link.textContent!==label)link.textContent=label;
  }
  for(const reference of document.querySelectorAll('.advisory-page a[href*="service="]')){
   if(reference.matches('[data-eucove-intake],.advisory-home-cta,.advisory-hero-cta'))continue;
   const service=new URL(reference.href,location.href).searchParams.get('service');const mapped={renovation:'renovation',care:'house-care','house-care':'house-care',maintenance:'maintenance',buying:'buyer-advisory','buyer-advisory':'buyer-advisory'}[service];if(!mapped)continue;
   // A service tile is already a full-card link. A second 100%-height link
   // inside the same list item stretches into the following renovation section.
   if(reference.closest('.ds-tiles')){
    const duplicate=reference.nextElementSibling;if(duplicate?.matches('a[data-eucove-intake]'))duplicate.remove();
    const href=prefix+'/advisory-registration?service='+mapped;if(reference.getAttribute('href')!==href)reference.setAttribute('href',href);
    continue;
   }
   let link=reference.nextElementSibling;
   if(!link?.matches('a[data-eucove-intake]')){link=document.createElement('a');link.dataset.eucoveIntake='';link.className='btn btn-line';reference.insertAdjacentElement('afterend',link)}
   const href=prefix+'/advisory-registration?service='+mapped,label=en?'Register service needs':'登记此项服务需求';if(link.getAttribute('href')!==href)link.setAttribute('href',href);if(link.textContent!==label)link.textContent=label;
  }
  const footer=document.querySelector('.site-footer .footer-nav');
  if(footer){let link=footer.querySelector('[data-eucove-registration-hub]');if(!link){link=document.createElement('a');link.dataset.eucoveRegistrationHub='';footer.prepend(link)}const href=prefix+'/registration',label=en?'Register your needs':'需求登记';if(link.getAttribute('href')!==href)link.setAttribute('href',href);if(link.textContent!==label)link.textContent=label;}
  const property=location.pathname.match(/^\/properties\/([a-f0-9-]{36})\/?$/i),aside=document.querySelector('.detail-side');
  if(property&&aside&&/咨询这套房|Enquire about this property/i.test(aside.querySelector('h2')?.textContent||'')){let link=aside.querySelector('[data-eucove-property-intake]');if(!link){link=document.createElement('a');link.dataset.eucovePropertyIntake='';link.className='btn btn-line btn-block';aside.querySelector('.card-pad')?.append(link)}const href=prefix+'/buying-registration?propertyId='+property[1],label=en?'Register interest in this home':'登记这套房的购房需求';if(link.getAttribute('href')!==href)link.setAttribute('href',href);if(link.textContent!==label)link.textContent=label;}
 }
 function contactHref(en){const url=new URL((en?'/en':'/zh')+'/contact',location.origin);for(const key of ['city','service','listing','propertyId','address','member','offer']){const value=new URLSearchParams(location.search).get(key);if(value)url.searchParams.set(key,value)}return url.pathname+url.search}
 function update(){queued=false;const en=document.documentElement.lang.toLowerCase().startsWith('en'),label=en?'Leave your contact details':'留下你的联系方式';
  updateRegistrationLinks(en);
  if(!document.getElementById('eucove-callback-layout')){const style=document.createElement('style');style.id='eucove-callback-layout';style.textContent='.mobile-contact.direct-contact{grid-template-columns:minmax(0,1fr)!important}.mobile-contact.direct-contact>.btn-line{display:none!important}#direct-contact-dialog{display:none!important}.header-cta{white-space:normal;max-width:220px}@media(max-width:600px){.site-header .header-cta{display:none!important}}';document.head.append(style)}
  for(const el of document.querySelectorAll('.direct-contact-open span,.header-cta,#enq-title'))if(el.textContent!==label)el.textContent=label;
  const primary=document.querySelector('.mobile-contact .direct-contact-open');if(primary){primary.removeAttribute('aria-controls');primary.removeAttribute('aria-expanded')}
  const directDialog=document.querySelector('#direct-contact-dialog');if(directDialog?.open)directDialog.close();
  const footer=document.querySelector('.site-footer .footer-brand');
  if(footer&&!footer.querySelector('[data-eucove-callback]')){const link=document.createElement('a');link.dataset.eucoveCallback='';footer.append(link)}
  for(const link of document.querySelectorAll('a[data-eucove-callback],a[href^="mailto:"],a[href^="tel:"],a[href*="wa.me/"],a[href*="api.whatsapp.com/"]')){
   const href=contactHref(en);if(link.getAttribute('href')!==href)link.setAttribute('href',href);if(link.textContent!==label)link.textContent=label;link.removeAttribute('target');link.dataset.eucoveCallback='';
  }
 }
 function start(){new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(update)}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['lang']});update()}
 // Enter the current standalone forms through their own document, while the
 // marketing SPA keeps its original components and styles on this domain.
 document.addEventListener('click',event=>{
  const button=event.target instanceof Element?event.target.closest('button.direct-contact-open'):null;
  if(button){event.preventDefault();event.stopImmediatePropagation();const formButton=button.parentElement?.querySelector('button.btn-line');if(formButton)formButton.click();else location.assign(contactHref(document.documentElement.lang.toLowerCase().startsWith('en')));return;}
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const link=event.target instanceof Element?event.target.closest('a[href]'):null;
  if(!link||link.hasAttribute('download')||link.target&&link.target!=='_self')return;
  const url=new URL(link.href,location.href);
  if(url.origin!==location.origin||!/^\/(?:(?:zh|en)\/)?(?:(?:registration|(?:rental|buying|selling|advisory)-registration)\/?$|contact(?:\/|$))/.test(url.pathname))return;
  event.preventDefault();location.assign(url.href);
 },true);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
