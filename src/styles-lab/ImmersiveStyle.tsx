import type { ServiceInput } from '../enquiry-options';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEnquiry } from '../components/Enquiry';
import { cityName, useI18n } from '../i18n';
import { estateName, estates, useListings } from './shared';
import './immersive-style.css';

function useCount(target: number, run: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / 1400); setN(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return n;
}

export default function ImmersiveStyle() {
  const { L, lang } = useI18n();
  const enquire = useEnquiry();
  const data = useListings();
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [slide, setSlide] = useState(0);

  const scenes = [
    { img: '/img/hk/taikoo-shing.webp', no: '01', k: L('放租', 'Letting'), t: L('由睇樓到交收，\n一位顧問跟到尾。', 'From viewing to handover,\none adviser throughout.'), d: L('定租金、放盤宣傳、約人睇樓、揀租客、簽租約，全部有人跟。', 'Pricing, marketing, viewings, tenant selection and the tenancy, all followed through.'), s: 'letting' },
    { img: '/img/hk/city-one.webp', no: '02', k: L('租務管理', 'Management'), t: L('租客入住之後，\n你唔使再煩。', 'After move-in,\nnothing more to worry about.'), d: L('收租、維修、續約、驗樓，定期話你知進度。', 'Rent, repairs, renewals and inspections, with regular updates.'), s: 'management' },
    { img: '/img/hk/mid-levels.webp', no: '03', k: L('買賣物業', 'Sales'), t: L('買定賣，\n先從你嘅計劃講起。', 'Buying or selling\nstarts with your plans.'), d: L('免費市價參考、查冊、物業資料表格，佣金喺表格 3／表格 5 寫明。', 'Free price guidance, land searches and property forms; fees set out in Form 3 / Form 5.'), s: 'selling' },
    { img: '/img/renovation/hk-living.webp', no: '04', k: L('翻新', 'Renovation'), t: L('先上門睇，\n再逐項報價。', 'Seen in person,\nthen quoted item by item.'), d: L('放租前翻新、換廚房浴室，你點頭先開工。', 'Pre-letting refreshes, kitchens and bathrooms. Work starts once you approve.'), s: 'renovation' },
  ];
  const gallery = estates([...data.rent, ...data.sale]).slice(0, 10);
  const total = (['rent', 'sale', 'sold'] as const).map(k => data[k].length);
  const SECTIONS = 1 + scenes.length + 3;

  useEffect(() => {
    const el = root.current; if (!el) return;
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { (e.target as HTMLElement).classList.add('is-in'); setActive(Number((e.target as HTMLElement).dataset.i)); }
    }), { root: el, threshold: .55 });
    el.querySelectorAll('.im-sec').forEach(s => io.observe(s));
    return () => io.disconnect();
  }, [gallery.length]);
  const go = (i: number) => root.current?.querySelector<HTMLElement>(`.im-sec[data-i="${i}"]`)?.scrollIntoView({ behavior: 'smooth' });
  const statsIn = active === scenes.length + 2;
  const c0 = useCount(total[0], statsIn), c1 = useCount(total[1], statsIn), c2 = useCount(total[2], statsIn);
  const lines = (s: string) => s.split('\n').map((x, i) => <span key={i} className="im-line" style={{ transitionDelay: `${150 + i * 120}ms` }}><span>{x}</span></span>);

  return (
    <div className="im" ref={root}>
      <header className="im-top"><b>悦港</b><span>Harbour Joy</span><button type="button" onClick={() => enquire()}>{L('預約顧問', 'Book an adviser')}</button></header>
      <nav className="im-dots" aria-label={L('章節', 'Sections')}>
        {Array.from({ length: SECTIONS }, (_, i) => <button key={i} type="button" aria-current={active === i} onClick={() => go(i)} aria-label={String(i + 1)} />)}
      </nav>

      <section className="im-sec im-open" data-i={0}>
        <img src="/img/hk/harbour-night.webp" alt="" className="im-bg" />
        <div className="im-shade" />
        <div className="im-copy im-center">
          <p className="im-k">{L('香港住宅 · 放租 · 管理 · 買賣', 'Hong Kong residential')}</p>
          <h1>{lines(L('維港兩岸，\n每一層樓都有人跟。', 'Both sides of the harbour,\nevery flat looked after.'))}</h1>
          <button type="button" className="im-down" onClick={() => go(1)}><ArrowDown size={18} />{L('向下滑', 'Scroll')}</button>
        </div>
      </section>

      {scenes.map((s, i) => (
        <section key={s.no} className={`im-sec im-scene ${i % 2 ? 'im-right' : ''}`} data-i={i + 1}>
          <img src={s.img} alt="" className="im-bg" loading="lazy" />
          <div className="im-shade" />
          <div className="im-copy">
            <p className="im-k"><span className="im-no">{s.no}</span>{s.k}</p>
            <h2>{lines(s.t)}</h2>
            <p className="im-d">{s.d}</p>
            <button type="button" className="im-btn" onClick={() => enquire({ service: s.s as ServiceInput })}>{L('了解同預約', 'Learn more & book')}<ArrowRight size={18} /></button>
          </div>
        </section>
      ))}

      <section className="im-sec im-gal" data-i={scenes.length + 1}>
        {gallery.map((l, i) => <img key={l.id} src={l.coverUrl} alt="" className={`im-bg ${i === slide ? 'on' : ''}`} loading="lazy" />)}
        <div className="im-shade" />
        <div className="im-copy">
          <p className="im-k"><span className="im-no">05</span>{L('屋苑', 'Estates')}</p>
          <h2 className="im-gal-name" key={slide}>{gallery[slide] ? estateName(gallery[slide]) : ''}</h2>
          <p className="im-d">{gallery[slide] ? `${gallery[slide].suburb} · ${cityName(gallery[slide].city, lang)} · ${lang === 'en' ? gallery[slide].priceDisplay.en : gallery[slide].priceDisplay.zh}` : ''}</p>
          <div className="im-gal-nav">
            <button type="button" onClick={() => setSlide((slide - 1 + gallery.length) % gallery.length)} aria-label={L('上一個', 'Previous')}><ChevronLeft /></button>
            <span>{String(slide + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')}</span>
            <button type="button" onClick={() => setSlide((slide + 1) % gallery.length)} aria-label={L('下一個', 'Next')}><ChevronRight /></button>
          </div>
          <div className="im-thumbs">{gallery.map((l, i) => <button key={l.id} type="button" className={i === slide ? 'on' : ''} onClick={() => setSlide(i)}><img src={l.coverUrl} alt={estateName(l)} /></button>)}</div>
        </div>
      </section>

      <section className="im-sec im-stats" data-i={scenes.length + 2}>
        <div className="im-copy im-center">
          <p className="im-k">{L('網上睇樓', 'Online viewings')}</p>
          <ul>
            <li><strong>{c0}</strong><span>{L('租盤', 'To let')}</span></li>
            <li><strong>{c1}</strong><span>{L('售盤', 'For sale')}</span></li>
            <li><strong>{c2}</strong><span>{L('成交紀錄', 'Sold records')}</span></li>
          </ul>
          <a className="im-btn" href="/viewings">{L('入去睇樓', 'Browse listings')}<ArrowRight size={18} /></a>
        </div>
      </section>

      <section className="im-sec im-end" data-i={scenes.length + 3}>
        <img src="/img/hk/hk-island.webp" alt="" className="im-bg" loading="lazy" />
        <div className="im-shade" />
        <div className="im-copy im-center">
          <h2>{lines(L('不如傾吓\n你層樓？', 'Let’s talk\nabout your flat.'))}</h2>
          <p className="im-d">{L('業主首個單位免佣，另送交吉清潔，至 2027 年 2 月。', 'No owner commission on your first flat, plus a free pre-letting clean, until February 2027.')}</p>
          <button type="button" className="im-btn im-btn-solid" onClick={() => enquire({ service: 'letting', offer: true })}>{L('留低聯絡方式', 'Leave your details')}<ArrowRight size={18} /></button>
        </div>
      </section>
    </div>
  );
}
