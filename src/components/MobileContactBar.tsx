import {useEffect,useRef,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import {useI18n} from '../i18n';
import {useEnquiry,useEnquiryOpen} from './Enquiry';
import {useContactPageOptions} from './ContactPageContext';
import {marketingPath} from '../meta-pixel-policy';
import './mobile-contact.css';

export default function MobileContactBar({menuOpen}:{menuOpen:boolean}){
 const location=useLocation(),options=useContactPageOptions(),enquire=useEnquiry(),isOpen=useEnquiryOpen(),{L}=useI18n();
 const [obscured,setObscured]=useState(false),bar=useRef<HTMLDivElement>(null);
 const eligible=!!marketingPath(location.pathname);
 useEffect(()=>{
  const vv=window.visualViewport;
  const check=()=>{const focus=document.activeElement as HTMLElement|null;const editing=!!focus&&(focus.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(focus.tagName));const keyboard=!!vv&&window.innerHeight-vv.height-vv.offsetTop>100;setObscured(editing||keyboard||!!document.querySelector('[role="dialog"][aria-modal="true"],dialog[open]'))};
  const observer=new MutationObserver(check);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','aria-modal']});
  document.addEventListener('focusin',check);document.addEventListener('focusout',check);vv?.addEventListener('resize',check);vv?.addEventListener('scroll',check);check();
  return()=>{observer.disconnect();document.removeEventListener('focusin',check);document.removeEventListener('focusout',check);vv?.removeEventListener('resize',check);vv?.removeEventListener('scroll',check)};
 },[]);
 useEffect(()=>{
  document.body.classList.toggle('has-direct-contact',eligible);
  const resize=()=>{if(bar.current)document.body.style.setProperty('--direct-contact-height',`${bar.current.getBoundingClientRect().height}px`)};
  const observer=new ResizeObserver(resize);if(bar.current)observer.observe(bar.current);resize();
  return()=>{document.body.classList.remove('has-direct-contact');document.body.style.removeProperty('--direct-contact-height');observer.disconnect()};
 },[eligible]);
 if(!eligible)return null;
 return <div ref={bar} className="mobile-contact direct-contact callback-contact" hidden={menuOpen||isOpen||obscured} aria-label={L('留低你嘅聯絡方式','Leave your contact details')}>
  <button type="button" className="btn btn-primary" onClick={()=>enquire(options)} aria-haspopup="dialog"><span>{L('留低你嘅聯絡方式','Leave your contact details')}</span><ArrowUpRight size={17} aria-hidden/></button>
 </div>;
}
