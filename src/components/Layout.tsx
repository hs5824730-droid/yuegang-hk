import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { useConfig, useI18n } from '../i18n';
import { EnquiryProvider, useEnquiry } from './Enquiry';
import { scrollBehavior } from './ui';
import MobileContactBar from './MobileContactBar';
import LanguageMenu from './LanguageMenu';
import {ContactPageProvider} from './ContactPageContext';
import '../v2.css';
import '../site-additions.css';
import {siteHomeHref,isComSite} from '../site-home';
import {registrationPageTitle} from '../language-path';
import {documentMetadata} from '../language-seo';

export function Mark({ size = 36 }: { size?: number }) {
  // Harbour Joy / 悦港 mark: towers over a harbour wave, traced from the brand logo (no lettering).
  return <svg viewBox="370 75 510 510" width={size} height={size} aria-hidden className="mark"><g fill="currentColor"><path d="M497 270 670 172V452L633 443V237L546 288V428H497Z"/><path d="M685 290 783 335V462H738V350L685 325Z"/><path d="M383 490C430 455 520 440 600 452C680 465 760 490 868 455C780 500 700 490 640 478C560 462 470 450 383 490Z"/></g></svg>;
}
export function Logo({ light = false }: { light?: boolean }) {
  const { config } = useConfig();
  return <span className={`logo ${light ? 'logo-light' : ''}`}><Mark /><span className="logo-type"><span className="logo-name">{config.brand.en}</span><span className="logo-secondary">{config.brand.zh}</span></span></span>;
}
/** Kept for existing callers (enquiry drawer, admin); renders the three-language menu. */
export function LangToggle({ compact = false }: { compact?: boolean }) {
  return <LanguageMenu compact={compact} />;
}
function Shell() {
  const { L, pick, lang } = useI18n();
  const { config } = useConfig();
  const enquire = useEnquiry();
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [overIntro, setOverIntro] = useState(false);
  useEffect(() => {
    if (loc.pathname !== '/') { setOverIntro(false); return; }
    const on = () => setOverIntro(window.scrollY < window.innerHeight * 0.75);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [loc.pathname]);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setMenuOpen(false);
    if (!loc.hash) window.scrollTo(0, 0);
    else { const timer = setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: scrollBehavior() }), 60); return () => clearTimeout(timer); }
  }, [loc.pathname, loc.hash]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);
  const nav = [
    { to: '/', label: L('首頁', 'Home') },
    { to: '/services', label: L('放租同管理', 'Letting') },
    { to: '/buy-sell', label: L('買賣物業', 'Buy & sell') },
    { to: '/advisory', label: L('置業顧問', 'Advisory') },
    { to: '/home-services', label: L('房屋服務', 'Home services') },
    { to: '/viewings', label: L('網上睇樓', 'Listings') },
    { to: '/about', label: L('關於我哋', 'About') },
  ];
  useEffect(() => {
    const page = nav.find(n => n.to !== '/' && loc.pathname.startsWith(n.to))?.label;
    document.title = registrationPageTitle(loc.pathname,lang)||`${page || L('香港房產放租同管理', 'Hong Kong letting & property management')} | ${pick(config.brand)}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', documentMetadata(new URL(window.location.href))?.description || L('悦港 Harbour Joy 為香港業主提供房屋出租、租務管理及買賣查詢，粵語、普通話、英文都講得，本地團隊跟進。', 'Harbour Joy offers Hong Kong property letting, ongoing management, buying and selling support, with local teams and Chinese and English communication.'));
  }, [loc.pathname, L, config, pick]);
  useEffect(() => {
    // The shared business pages must retain .com's existing visual shell.
    if (isComSite()) return;
    document.body.classList.add('v2'); return () => document.body.classList.remove('v2');
  }, []);
  const openEnquiry = () => { setMenuOpen(false); enquire(); };
  return <>
    <a className="skip" href="#main">{L('跳到正文', 'Skip to content')}</a>
    <header className={`site-header ${overIntro && !menuOpen ? 'over-intro' : ''}`}>
      <div className="wrap header-row">
        <a href={siteHomeHref(lang)} className="logo-link" aria-label={L('悦港首頁', 'Harbour Joy home')}><Logo /></a>
        <nav className="main-nav" aria-label={L('主導航', 'Main navigation')}>{nav.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>{n.label}</NavLink>)}</nav>
        <div className="header-actions"><LangToggle /><button className="btn btn-primary header-cta" type="button" onClick={openEnquiry}>{L('留低聯絡方式', 'Contact us')}</button><button ref={menuButton} className="icon-btn menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? L('關閉揀單', 'Close menu') : L('打開揀單', 'Open menu')} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div>
      </div>
      {menuOpen && <nav id="mobile-navigation" className="mobile-navigation" aria-label={L('主導航', 'Main navigation')}><div className="wrap">{nav.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setMenuOpen(false)}>{n.label}<ArrowUpRight size={18} aria-hidden /></NavLink>)}</div></nav>}
    </header>
    {menuOpen && <button className="nav-backdrop" aria-label={L('關閉揀單', 'Close menu')} tabIndex={-1} onClick={() => setMenuOpen(false)} />}
    <main id="main"><div className="page-enter" key={loc.pathname}><Outlet /></div></main>
    <footer className="site-footer"><div className="wrap">
      <div className="footer-top">
        <div className="footer-brand">
          <a href={siteHomeHref(lang)} className="footer-logo" aria-label={L('悦港首頁', 'Harbour Joy home')}><Logo /></a>
          <p>{L('香港住宅放租、租務管理同買賣。粵語、普通話、English 溝通，本地團隊跟進。', 'Hong Kong residential letting, management and sales. Cantonese, Mandarin and English, followed up locally.')}</p>
          <Link to="/contact">{L('留低你嘅聯絡方式', 'Leave your contact details')}</Link>
        </div>
        <nav className="footer-nav" aria-label={L('頁腳導航', 'Footer navigation')}>
          <Link to="/registration"><span>{L('需求登記','Register your needs')}</span><ArrowUpRight size={14} aria-hidden/></Link>
          {nav.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'}><span>{n.label}</span><ArrowUpRight size={14} aria-hidden /></NavLink>)}
        </nav>
      </div>
      <div className="footer-base">
        <div><p>© {new Date().getFullYear()} 悦港 Harbour Joy</p></div>
        <nav className="footer-legal" aria-label={L('其他連結', 'More links')}><Link to="/privacy">{L('私隱政策', 'Privacy')}</Link><a href="/admin">{L('團隊登入', 'Team sign-in')}</a></nav>
      </div>
    </div></footer>
    <MobileContactBar menuOpen={menuOpen}/>
  </>;
}
export default function Layout() { return <ContactPageProvider><EnquiryProvider><Shell /></EnquiryProvider></ContactPageProvider>; }
