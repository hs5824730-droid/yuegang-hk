import RentalOfferStamp from './RentalOfferStamp';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { useEnquiry } from './Enquiry';
import { IMG, SmartImg, reducedMotion, scrollBehavior } from './ui';

const SEEN = 'eucove-intro-seen';

/**
 * Full-bleed opening screen. The entrance plays once per session; after that the
 * page simply loads. Scrolling (never hijacked) drives a light zoom/lift through a
 * CSS variable, and "Explore" scrolls to the first section.
 */
export default function HomeIntro({ nextId }: { nextId: string }) {
  const { L } = useI18n();
  const enquire = useEnquiry();
  const ref = useRef<HTMLElement>(null);
  const [play] = useState(() => {
    try {
      return !sessionStorage.getItem(SEEN) && !reducedMotion();
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try { sessionStorage.setItem(SEEN, '1'); } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = el.offsetHeight || 1;
      const p = Math.min(1, Math.max(0, window.scrollY / h));
      el.style.setProperty('--p', p.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const explore = () => document.getElementById(nextId)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });

  return <section ref={ref} className={`home-intro ${play ? 'intro-play' : ''}`} aria-labelledby="intro-title">
    <div className="intro-media">
      <SmartImg src={IMG.hero} alt={L('樹蔭中嘅當代住宅（配圖）', 'A contemporary home among trees (editorial photo)')} position="58% 60%" eager />
    </div>
    <div className="intro-shade" aria-hidden />
    <div className="wrap intro-content">
      <p className="intro-kicker">{L('悦港 Harbour Joy · 香港房產放租同管理', 'Harbour Joy · Hong Kong letting & property management')}</p>
      <h1 id="intro-title">
        <span className="line">{L('出租交俾我哋，', 'Leave the letting to us.')}</span>
        <span className="line">{L('你只管收租。', 'You just collect the rent.')}</span>
      </h1>
      <p className="intro-sub">{L('搵租客、收租、維修、同租客溝通，都有我哋跟進。', 'Finding tenants, collecting rent, repairs and tenant contact — we follow it all up.')}</p>
      <RentalOfferStamp />
      <div className="intro-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => enquire({ service: 'letting' })}>{L('免費查詢', 'Free enquiry')}<ArrowRight size={18} aria-hidden /></button>
        <button type="button" className="intro-explore" onClick={explore}>{L('開始了解', 'Explore')}<ArrowDown size={18} aria-hidden /></button>
      </div>
    </div>
    <button type="button" className="intro-scroll" onClick={explore} aria-label={L('向下瀏覽', 'Scroll down')}><span /></button>
  </section>;
}
