import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { useConfig, useI18n } from '../i18n';
import { EnquiryProvider, useEnquiry } from './Enquiry';
import { scrollBehavior } from './ui';
import MobileContactBar from './MobileContactBar';
import {ContactPageProvider} from './ContactPageContext';
import '../v2.css';
import '../site-additions.css';
import {siteHomeHref,isComSite} from '../site-home';
import {registrationPageTitle} from '../language-path';
import {documentMetadata} from '../language-seo';

export function Mark({ size = 36 }: { size?: number }) {
  return <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className="mark"><g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"><path d="M48.97 48.97A24 24 0 1 1 48.97 15.03" /><path d="M42.61 42.61A15 15 0 1 1 42.61 21.39" /></g><circle cx="32" cy="32" r="5.5" fill="currentColor" /></svg>;
}
export function Logo({ light = false }: { light?: boolean }) {
  const { config } = useConfig();
  return <span className={`logo ${light ? 'logo-light' : ''}`}><Mark /><span className="logo-type"><span className="logo-name">{config.brand.en.toLowerCase()}</span><span className="logo-secondary">{config.brand.zh}</span></span></span>;
}
export function LangToggle() {
  const { lang, setLang } = useI18n();
  return <button type="button" className="lang-toggle" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} aria-label={lang === 'zh' ? 'Switch to English' : '切换为中文'}>{lang === 'zh' ? 'EN' : '中文'}</button>;
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
    { to: '/', label: L('首页', 'Home') },
    { to: '/services', label: L('出租与托管', 'Letting & management') },
    { to: '/buy-sell', label: L('买卖房屋', 'Buying & selling') },
    { to: '/advisory', label: L('置业顾问', 'Property services') },
    { to: '/home-services', label: L('房屋服务', 'Home services') },
    { to: '/viewings', label: L('在线看房', 'Online viewings') },
    { to: '/about', label: L('关于我们', 'About us') },
  ];
  useEffect(() => {
    const page = nav.find(n => n.to !== '/' && loc.pathname.startsWith(n.to))?.label;
    document.title = registrationPageTitle(loc.pathname,lang)||`${page || L('澳洲房产出租与托管', 'Australian letting & property management')} | ${pick(config.brand)}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', documentMetadata(new URL(window.location.href))?.description || L('桉湾 EUCOVE 为澳洲房东提供房屋出租、长期托管及买卖咨询，中英文沟通，当地团队跟进。', 'EUCOVE offers Australian property letting, ongoing management, buying and selling support, with local teams and Chinese and English communication.'));
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
        <a href={siteHomeHref(lang)} className="logo-link" aria-label={L('桉湾首页', 'Eucove home')}><Logo /></a>
        <nav className="main-nav" aria-label={L('主导航', 'Main navigation')}>{nav.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>{n.label}</NavLink>)}</nav>
        <div className="header-actions"><LangToggle /><button className="btn btn-primary header-cta" type="button" onClick={openEnquiry}>{L('留下你的联系方式', 'Leave your contact details')}</button><button ref={menuButton} className="icon-btn menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? L('关闭菜单', 'Close menu') : L('打开菜单', 'Open menu')} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div>
      </div>
      {menuOpen && <nav id="mobile-navigation" className="mobile-navigation" aria-label={L('主导航', 'Main navigation')}><div className="wrap">{nav.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setMenuOpen(false)}>{n.label}<ArrowUpRight size={18} aria-hidden /></NavLink>)}</div></nav>}
    </header>
    {menuOpen && <button className="nav-backdrop" aria-label={L('关闭菜单', 'Close menu')} tabIndex={-1} onClick={() => setMenuOpen(false)} />}
    <main id="main"><div className="page-enter" key={loc.pathname}><Outlet /></div></main>
    <footer className="site-footer"><div className="wrap">
      <div className="footer-top">
        <div className="footer-brand">
          <a href={siteHomeHref(lang)} className="footer-logo" aria-label={L('桉湾首页', 'Eucove home')}><Logo /></a>
          <p>{L('澳洲房产出租、托管与买卖。中英文沟通，当地团队跟进。', 'Letting, management and property sales in Australia. Local teams, Chinese and English service.')}</p>
          <Link to="/contact">{L('留下你的联系方式', 'Leave your contact details')}</Link>
        </div>
        <nav className="footer-nav" aria-label={L('页脚导航', 'Footer navigation')}>
          <Link to="/registration"><span>{L('需求登记','Register your needs')}</span><ArrowUpRight size={14} aria-hidden/></Link>
          {nav.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'}><span>{n.label}</span><ArrowUpRight size={14} aria-hidden /></NavLink>)}
        </nav>
      </div>
      <div className="footer-base">
        <p>© {new Date().getFullYear()} 桉湾 EUCOVE</p>
        <nav className="footer-legal" aria-label={L('其他链接', 'More links')}><Link to="/privacy">{L('隐私说明', 'Privacy')}</Link><a href="/admin">{L('团队登录', 'Team sign-in')}</a></nav>
      </div>
    </div></footer>
    <MobileContactBar menuOpen={menuOpen}/>
  </>;
}
export default function Layout() { return <ContactPageProvider><EnquiryProvider><Shell /></EnquiryProvider></ContactPageProvider>; }
