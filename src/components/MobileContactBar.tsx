import {useEffect,useRef,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import {cityName,useI18n} from '../i18n';
import {useEnquiry,useEnquiryOpen} from './Enquiry';
import {useContactPageOptions,type ContactPageOptions} from './ContactPageContext';
import {withoutLanguage} from '../language-path';
import {normalizeService,type Service} from '../enquiry-options';
import './mobile-contact.css';

/** Pages that are themselves contact or registration forms do not need the bar. */
const formPage=(path:string)=>/^\/(contact|admin)(\/|$)|registration$/.test(path);
/** Route defaults, used until the visitor scrolls into a section that names its own service. */
const ROUTE_SERVICE:Record<string,Service>={'/services':'letting','/offer':'letting','/buy-sell':'selling','/advisory':'renovation','/home-services':'house-care','/viewings':'buying','/properties':'buying'};

/**
 * The always-present enquiry bar. Sections opt in with data-contact="service" (and optional
 * data-contact-city / data-contact-offer); the bar follows whichever one sits at the reading line.
 */
export default function MobileContactBar({menuOpen}:{menuOpen:boolean}){
 const location=useLocation(),page=useContactPageOptions(),enquire=useEnquiry(),isOpen=useEnquiryOpen(),{L,lang}=useI18n();
 const [obscured,setObscured]=useState(false),[section,setSection]=useState<ContactPageOptions|null>(null),bar=useRef<HTMLDivElement>(null);
 const path=withoutLanguage(location.pathname),eligible=!formPage(path);
 useEffect(()=>{
  const vv=window.visualViewport;
  const check=()=>{const focus=document.activeElement as HTMLElement|null;const editing=!!focus&&!bar.current?.contains(focus)&&(focus.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(focus.tagName));const keyboard=!!vv&&window.innerHeight-vv.height-vv.offsetTop>100;setObscured(editing||keyboard||!!document.querySelector('[role="dialog"][aria-modal="true"],dialog[open]'))};
  const observer=new MutationObserver(check);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','aria-modal']});
  document.addEventListener('focusin',check);document.addEventListener('focusout',check);vv?.addEventListener('resize',check);vv?.addEventListener('scroll',check);check();
  return()=>{observer.disconnect();document.removeEventListener('focusin',check);document.removeEventListener('focusout',check);vv?.removeEventListener('resize',check);vv?.removeEventListener('scroll',check)};
 },[]);
 useEffect(()=>{
  // Follow the section crossing a reading line just above the middle of the screen.
  let frame=0;
  const read=()=>{frame=0;const line=window.innerHeight*.45;let found:HTMLElement|null=null;
   document.querySelectorAll<HTMLElement>('[data-contact]').forEach(el=>{const r=el.getBoundingClientRect();if(r.top<=line&&r.bottom>line)found=el;});
   const el=found as HTMLElement|null,next=el?{service:normalizeService(el.dataset.contact)||undefined,city:el.dataset.contactCity||undefined,offer:el.dataset.contactOffer==='1'||undefined}:null;
   setSection(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);};
  const queue=()=>{if(!frame)frame=requestAnimationFrame(read)};
  window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue);const timer=window.setTimeout(read,300);read();
  return()=>{window.removeEventListener('scroll',queue);window.removeEventListener('resize',queue);window.clearTimeout(timer);if(frame)cancelAnimationFrame(frame)};
 },[location.pathname,location.search]);
 useEffect(()=>{
  document.body.classList.toggle('has-direct-contact',eligible);
  const resize=()=>{if(bar.current)document.body.style.setProperty('--direct-contact-height',`${bar.current.getBoundingClientRect().height}px`)};
  const observer=new ResizeObserver(resize);if(bar.current)observer.observe(bar.current);resize();
  return()=>{document.body.classList.remove('has-direct-contact');document.body.style.removeProperty('--direct-contact-height');observer.disconnect()};
 },[eligible]);
 if(!eligible)return null;
 const options:ContactPageOptions={...page,...(page.service?{}:{service:ROUTE_SERVICE[path]}),...Object.fromEntries(Object.entries(section||{}).filter(([,v])=>v!==undefined))};
 const service=options.service?normalizeService(options.service):undefined;
 const prompt=options.offer?L('首個委託單位，豁免業主佣金','No owner commission on your first property')
  :service==='letting'||service==='management'||service==='moving'?L('想放租，或者交俾我哋管理？','Letting, or leaving it with us to manage?')
  :service==='selling'?L('打算放售物業？','Thinking of selling?')
  :service==='buying'?L('準備買樓？','Looking to buy?')
  :service==='buyer-advisory'?L('想了解置業預算同按揭？','Planning a purchase?')
  :service==='renovation'||service==='maintenance'?L('想翻新或者維修？','Renovation or repairs?')
  :service==='house-care'?L('需要房屋打理？','Need someone to look after your home?')
  :L('有關物業嘅任何問題，都歡迎查詢','Any question about a property, we are here');
 const place=options.city?cityName(options.city,lang):'';
 const kicker=place?L(`${place} · 私人諮詢`,`${place} · Private consultation`):L('私人諮詢','Private consultation');
 return <div ref={bar} className="mobile-contact direct-contact callback-contact hx-dock" hidden={menuOpen||isOpen||obscured} aria-label={L('留低你嘅聯絡方式','Leave your contact details')}>
  <p className="hx-dock-copy" aria-live="polite"><small>{kicker}</small><span key={prompt}>{prompt}</span></p>
  <button type="button" className="btn btn-primary" onClick={()=>enquire(options)} aria-haspopup="dialog"><span>{L('留低你嘅聯絡方式','Leave your contact details')}</span><ArrowUpRight size={17} aria-hidden/></button>
 </div>;
}
