import type { ServiceInput } from '../enquiry-options';
import { useEffect, useState, type MouseEvent } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { useEnquiry } from '../components/Enquiry';
import { cityName, useI18n } from '../i18n';
import { area, estateName, estates, useListings } from './shared';
import './cinema-style.css';

const REEL = ['/img/hk/harbour-night.webp', '/img/hk/kowloon.webp', '/img/hk/hk-island.webp', '/img/hk/mid-levels.webp'];

export default function CinemaStyle() {
  const { L, lang } = useI18n();
  const enquire = useEnquiry();
  const data = useListings();
  const [frame, setFrame] = useState(0);
  const [open, setOpen] = useState(0);
  const [svc, setSvc] = useState(0);
  const [spot, setSpot] = useState({ x: 50, y: 50 });
  useEffect(() => { const t = setInterval(() => setFrame(f => (f + 1) % REEL.length), 6000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .2 });
    document.querySelectorAll('.cn [data-reveal]').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [data.rent.length]);

  const reel = estates([...data.sale, ...data.rent]).slice(0, 6);
  const services = [
    { t: L('放租', 'Letting'), d: L('定租金、放盤、睇樓、揀租客、簽約、交收。', 'Rent, marketing, viewings, tenant, tenancy, handover.'), img: '/img/hk/taikoo-shing.webp', s: 'letting' },
    { t: L('租務管理', 'Management'), d: L('收租、維修、續約、驗樓，定期匯報。', 'Rent, repairs, renewals, inspections, regular reports.'), img: '/img/hk/city-one.webp', s: 'management' },
    { t: L('買賣物業', 'Sales'), d: L('市價參考、查冊、表格 3／表格 5、議價成交。', 'Price guidance, searches, Form 3 / 5, completion.'), img: '/img/hk/mid-levels.webp', s: 'selling' },
    { t: L('翻新', 'Renovation'), d: L('免費上門評估，逐項報價，你點頭先開工。', 'Free assessment, itemised quote, work on approval.'), img: '/img/renovation/hk-kitchen.webp', s: 'renovation' },
    { t: L('房屋服務', 'Home services'), d: L('清潔、睇屋、吉屋巡查、維修保養。', 'Cleaning, sitting, vacant-flat checks, repairs.'), img: '/img/renovation/hk-living.webp', s: 'house-care' },
  ];
  const onSpot = (e: MouseEvent<HTMLElement>) => { const r = e.currentTarget.getBoundingClientRect(); setSpot({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); };

  return (
    <div className="cn">
      <header className="cn-top"><b>悦港</b><span>Harbour Joy</span><nav><a href="#cn-reel">{L('屋苑', 'Estates')}</a><a href="#cn-svc">{L('服務', 'Services')}</a><a href="/viewings">{L('睇樓', 'Listings')}</a></nav><button type="button" onClick={() => enquire()}>{L('預約', 'Book')}</button></header>

      <section className="cn-hero">
        {REEL.map((src, i) => <img key={src} src={src} alt="" className={i === frame ? 'on' : ''} />)}
        <div className="cn-bars" aria-hidden />
        <div className="cn-hero-copy">
          <p className="cn-k"><Play size={12} fill="currentColor" />{L('香港住宅 · 2026', 'Hong Kong residential · 2026')}</p>
          <h1>{L('維港兩岸', 'Both sides')}<br /><em>{L('每一層樓都有人跟', 'of the harbour')}</em></h1>
          <span className="cn-rule" />
          <p className="cn-lead">{L('放租、租務管理、買賣同翻新，一位顧問由睇樓跟到交收。', 'Letting, management, sales and renovation — one adviser from viewing to handover.')}</p>
          <div className="cn-actions">
            <button type="button" className="cn-btn" onClick={() => enquire({ service: 'letting' })}>{L('免費諮詢', 'Free consultation')}<ArrowRight size={17} /></button>
            <a className="cn-link" href="#cn-reel">{L('睇屋苑', 'See estates')}</a>
          </div>
        </div>
        <div className="cn-frames">{REEL.map((_, i) => <button key={i} type="button" className={i === frame ? 'on' : ''} onClick={() => setFrame(i)} aria-label={String(i + 1)}><span /></button>)}</div>
      </section>

      <section className="cn-reel" id="cn-reel">
        <div className="cn-head" data-reveal><p className="cn-k">{L('精選屋苑', 'Featured estates')}</p><h2>{L('揀一個，睇清楚', 'Pick one, look closer')}</h2></div>
        <div className="cn-accordion" data-reveal>
          {reel.map((l, i) => (
            <button key={l.id} type="button" className={`cn-panel ${open === i ? 'open' : ''}`} onMouseEnter={() => setOpen(i)} onFocus={() => setOpen(i)} onClick={() => enquire({ service: l.kind === 'rent' ? 'letting' : 'buying', city: l.city })}>
              <img src={l.coverUrl} alt="" loading="lazy" />
              <span className="cn-panel-no">{String(i + 1).padStart(2, '0')}</span>
              <span className="cn-panel-name">{estateName(l)}</span>
              <span className="cn-panel-info">
                <small>{l.suburb} · {cityName(l.city, lang)}</small>
                <strong>{lang === 'en' ? l.priceDisplay.en : l.priceDisplay.zh}</strong>
                <em>{l.beds ? L(`${l.beds} 房`, `${l.beds} bed`) : ''}{area(l) ? ` · ${area(l)}${L('呎', ' ft²')}` : ''}</em>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="cn-svc" id="cn-svc">
        <div className="cn-svc-media">{services.map((s, i) => <img key={s.img} src={s.img} alt="" className={i === svc ? 'on' : ''} loading="lazy" />)}</div>
        <div className="cn-svc-list">
          <p className="cn-k">{L('服務', 'Services')}</p>
          <ol>
            {services.map((s, i) => (
              <li key={s.t} className={i === svc ? 'on' : ''} onMouseEnter={() => setSvc(i)}>
                <button type="button" onClick={() => enquire({ service: s.s as ServiceInput })} onFocus={() => setSvc(i)}>
                  <span className="cn-svc-no">{String(i + 1).padStart(2, '0')}</span>
                  <span className="cn-svc-t">{s.t}</span>
                  <span className="cn-svc-d">{s.d}</span>
                  <ArrowRight size={22} />
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cn-stats" data-reveal>
        {([['rent', L('租盤', 'To let')], ['sale', L('售盤', 'For sale')], ['sold', L('成交紀錄', 'Sold')]] as const).map(([k, t]) => <div key={k}><strong>{data[k].length}</strong><span>{t}</span></div>)}
      </section>

      <section className="cn-end" onMouseMove={onSpot} style={{ ['--x' as string]: `${spot.x}%`, ['--y' as string]: `${spot.y}%` }}>
        <p className="cn-k">{L('業主禮遇 · 至 2027 年 2 月', 'Owner offer · until February 2027')}</p>
        <h2>{L('首個單位，業主免佣', 'Your first flat, no owner commission')}</h2>
        <p className="cn-lead">{L('另送交吉清潔一次。留低聯絡方式，同事好快搵你。', 'Plus a free pre-letting clean. Leave your details and we will be in touch.')}</p>
        <button type="button" className="cn-btn" onClick={() => enquire({ service: 'letting', offer: true })}>{L('留低聯絡方式', 'Leave your details')}<ArrowRight size={17} /></button>
      </section>
    </div>
  );
}
