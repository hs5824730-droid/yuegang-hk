import type { ServiceInput } from '../enquiry-options';
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEnquiry } from '../components/Enquiry';
import { cityName, useI18n } from '../i18n';
import type { ViewingListing } from '../viewing-types';
import { estateName, estates, REGIONS, useListings } from './shared';
import './magazine-style.css';

/** Adds .in to every [data-reveal] element as it scrolls into view. */
function useReveal(dep: unknown) {
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .18 });
    document.querySelectorAll('.mg [data-reveal]').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [dep]);
}

export default function MagazineStyle() {
  const { L, lang } = useI18n();
  const enquire = useEnquiry();
  const data = useListings();
  const all = [...data.rent, ...data.sale];
  const gallery = estates(all).slice(0, 14);
  useReveal(gallery.length);

  const [peek, setPeek] = useState<{ img: string; x: number; y: number } | null>(null);
  const follow = (img: string) => (e: MouseEvent) => setPeek({ img, x: e.clientX, y: e.clientY });

  // Drag-to-scroll gallery with a progress rule.
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const onDown = (e: PointerEvent<HTMLDivElement>) => { if (e.pointerType !== 'mouse' || !rail.current) return; drag.current = { x: e.clientX, left: rail.current.scrollLeft }; rail.current.classList.add('grab'); };
  const onMove = (e: PointerEvent<HTMLDivElement>) => { if (drag.current && rail.current) rail.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x); };
  const onUp = () => { drag.current = null; rail.current?.classList.remove('grab'); };
  const nudge = (dir: number) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * .7, behavior: 'smooth' });

  const issue = new Date();
  const month = lang === 'en' ? issue.toLocaleString('en-GB', { month: 'long', year: 'numeric' }) : `${issue.getFullYear()} 年 ${issue.getMonth() + 1} 月`;

  const contents = [
    { no: '02', t: L('本期屋苑', 'Estates in this issue'), href: '#mg-gallery', img: '/img/hk/taikoo-shing.webp' },
    { no: '04', t: L('放租同租務管理', 'Letting & management'), href: '#mg-letting', img: '/img/hk/city-one.webp' },
    { no: '06', t: L('買賣物業', 'Buying & selling'), href: '#mg-sales', img: '/img/hk/mid-levels.webp' },
    { no: '08', t: L('翻新', 'Renovation'), href: '#mg-reno', img: '/img/renovation/hk-kitchen.webp' },
    { no: '10', t: L('地區索引', 'District index'), href: '#mg-index', img: '/img/hk/tai-po.webp' },
  ];

  const spreads = [
    { id: 'mg-letting', fig: '03', img: '/img/hk/city-one.webp', k: L('專題 · 放租', 'Feature · Letting'), t: L('租出去之後，\n仍然有人睇住。', 'Let, and still\nlooked after.'),
      body: L('香港業主最怕兩件事：租唔出，同埋租出之後冇人理。悦港由上門睇樓、定租金開始，到放盤宣傳、約人睇樓、核對租客資料、簽租約、交吉交收，一位顧問跟到尾。揀租務管理嘅話，收租、維修、續約都可以交俾我哋。', 'Hong Kong owners worry about two things: a flat that will not let, and a tenancy nobody minds afterwards. Harbour Joy starts with a visit and a rent, then marketing, viewings, tenant checks, the tenancy and handover — one adviser throughout. With management, rent, repairs and renewals are ours too.'),
      quote: L('「一位顧問，由第一次睇樓跟到續約。」', '“One adviser, from the first viewing to the renewal.”'), steps: [L('上門睇樓、定租金', 'Visit and set the rent'), L('放盤宣傳、約人睇樓', 'Marketing and viewings'), L('揀租客、簽租約、交收', 'Tenant, tenancy, handover'), L('收租、維修、續約', 'Rent, repairs, renewals')], s: 'management' },
    { id: 'mg-sales', fig: '04', img: '/img/hk/mid-levels.webp', k: L('專題 · 買賣', 'Feature · Sales'), t: L('買定賣，\n先講清楚計劃。', 'Buy or sell —\nstart with the plan.'),
      body: L('未簽約，一蚊都唔收。我哋先同你傾預算同時間，俾你免費市價參考，再準備查冊同物業資料表格。佣金同會唔會做雙邊代理，喺表格 3／表格 5 白紙黑字寫清楚。', 'Nothing is payable before you sign. We start with your budget and timing, give free price guidance, then prepare the land search and property forms. Fees and any dual agency are written into Form 3 or Form 5.'),
      quote: L('「佣金寫清楚，先開始做。」', '“Fees in writing, before we begin.”'), steps: [L('傾預算同時間', 'Budget and timing'), L('免費市價參考', 'Free price guidance'), L('查冊、物業資料表格', 'Land search and forms'), L('議價、簽約、成交', 'Negotiation to completion')], s: 'selling' },
    { id: 'mg-reno', fig: '05', img: '/img/renovation/hk-kitchen.webp', k: L('專題 · 翻新', 'Feature · Renovation'), t: L('先上門睇，\n再逐項報價。', 'Seen first,\nthen quoted.'),
      body: L('放租前執靚、換廚房浴室、局部改動，我哋先免費上門評估，逐項列明工程同價錢，你點頭先開工，完工對照清單驗收。', 'Pre-letting refreshes, new kitchens and bathrooms, partial changes: a free on-site assessment first, an itemised quote, work only once you approve, and sign-off against the list.'),
      quote: L('「你點頭先開工。」', '“Work starts when you say so.”'), steps: [L('免費上門評估', 'Free assessment'), L('逐項報價', 'Itemised quote'), L('你確認先開工', 'Starts on approval'), L('對照清單驗收', 'Signed off on the list')], s: 'renovation' },
  ];

  const byRegion = (r: string) => estates(all.filter(l => l.city === r));
  const count = (name: string) => all.filter(l => estateName(l) === name).length;
  const letters: [string, string][] = [
    [L('佣金點計？', 'How is commission charged?'), L('香港一般做法係：租樓佣金業主同租客各俾半個月租，買賣佣金大家各俾成交價 1% 左右。實際收費喺簽表格 3／表格 5 之前寫清楚。', 'Customarily half a month’s rent from each side for letting, and around 1% each for sales. Our actual fees are written into Form 3 / Form 5 before we act.')],
    [L('我唔喺香港，都可以委託你哋？', 'Can I appoint you from abroad?'), L('得。睇樓、交收、驗樓由本地同事處理，進度用電話、WhatsApp 或微信話你知。', 'Yes. Viewings, handovers and inspections are handled locally, with updates by phone, WhatsApp or WeChat.')],
    [L('可唔可以淨係放租？', 'Can I choose letting only?'), L('可以。租客入住之後你自己打理，第時想轉租務管理隨時講。', 'Yes. You manage after move-in and can switch to management any time.')],
  ];
  const lines = (s: string) => s.split('\n').map((x, i) => <span key={i}>{x}</span>);

  return (
    <div className="mg" onMouseLeave={() => setPeek(null)}>
      <header className="mg-mast">
        <div className="mg-mast-line"><span>{L('第 11 期', 'Issue 11')}</span><span>{month}</span><span>{L('香港住宅 · 放租 · 管理 · 買賣', 'Hong Kong residential')}</span></div>
        <div className="mg-mast-title"><b>悦港</b><i>Harbour Joy</i></div>
        <nav className="mg-mast-nav">{contents.slice(1).map(c => <a key={c.no} href={c.href}>{c.t}</a>)}<button type="button" onClick={() => enquire()}>{L('預約顧問', 'Book an adviser')}</button></nav>
      </header>

      <section className="mg-cover">
        <div className="mg-cover-copy" data-reveal>
          <p className="mg-k">{L('封面故事', 'Cover story')}</p>
          <h1>{lines(L('維港兩岸，\n每一層樓\n都有人跟。', 'Both sides\nof the harbour,\nevery flat looked after.'))}</h1>
          <p className="mg-deck">{L('放租、租務管理、買賣同翻新。本期帶你睇港九新界嘅屋苑，同埋點樣將一層樓放心交出去。', 'Letting, management, sales and renovation. This issue walks through estates across Hong Kong, and how to hand a flat over with confidence.')}</p>
          <button type="button" className="mg-btn" onClick={() => enquire({ service: 'letting' })}>{L('免費諮詢', 'Free consultation')}<ArrowRight size={17} /></button>
        </div>
        <figure className="mg-cover-fig" data-reveal>
          <div className="mg-mask"><img src="/img/hk/harbour-night.webp" alt="" /></div>
          <figcaption><b>{L('圖 01', 'Fig. 01')}</b>{L('維多利亞港夜景，由太平山望向九龍。', 'Victoria Harbour at night, from the Peak towards Kowloon.')}</figcaption>
        </figure>
      </section>

      <section className="mg-contents" aria-labelledby="mg-contents-t">
        <h2 id="mg-contents-t" className="mg-label">{L('目錄', 'Contents')}</h2>
        <ol>
          {contents.map(c => (
            <li key={c.no} onMouseMove={follow(c.img)} onMouseLeave={() => setPeek(null)} data-reveal>
              <a href={c.href}><span className="mg-page">P.{c.no}</span><strong>{c.t}</strong><ArrowRight size={20} /></a>
            </li>
          ))}
        </ol>
      </section>

      <section className="mg-gallery" id="mg-gallery">
        <div className="mg-sec-head">
          <p className="mg-label">P.02 — {L('本期屋苑', 'Estates in this issue')}</p>
          <div className="mg-gal-ctl"><button type="button" onClick={() => nudge(-1)} aria-label={L('向左', 'Left')}><ArrowLeft size={18} /></button><button type="button" onClick={() => nudge(1)} aria-label={L('向右', 'Right')}><ArrowRight size={18} /></button></div>
        </div>
        <div className="mg-rail" ref={rail} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
          onScroll={e => { const t = e.currentTarget; setProgress(t.scrollLeft / Math.max(1, t.scrollWidth - t.clientWidth)); }}>
          {gallery.map((l: ViewingListing, i) => (
            <figure key={l.id} className={`mg-plate ${i % 3 === 0 ? 'tall' : ''}`}>
              <div className="mg-plate-img"><img src={l.coverUrl} alt="" draggable={false} loading="lazy" /></div>
              <figcaption><b>{L('圖', 'Fig.')} {String(i + 2).padStart(2, '0')}</b><strong>{estateName(l)}</strong><span>{l.suburb} · {cityName(l.city, lang)}</span><em>{lang === 'en' ? l.priceDisplay.en : l.priceDisplay.zh}</em></figcaption>
            </figure>
          ))}
        </div>
        <div className="mg-progress"><span style={{ transform: `scaleX(${Math.max(.04, progress)})` }} /></div>
      </section>

      {spreads.map((s, i) => (
        <article key={s.id} id={s.id} className={`mg-spread ${i % 2 ? 'flip' : ''}`}>
          <figure data-reveal><div className="mg-mask"><img src={s.img} alt="" loading="lazy" /></div><figcaption><b>{L('圖', 'Fig.')} {s.fig}</b>{s.k}</figcaption></figure>
          <div className="mg-article" data-reveal>
            <p className="mg-k">{s.k}</p>
            <h2>{lines(s.t)}</h2>
            <p className="mg-body">{s.body}</p>
            <blockquote>{s.quote}</blockquote>
            <ol className="mg-steps">{s.steps.map((x, n) => <li key={x}><span>{String(n + 1).padStart(2, '0')}</span>{x}</li>)}</ol>
            <button type="button" className="mg-btn" onClick={() => enquire({ service: s.s as ServiceInput })}>{L('同顧問傾', 'Talk to an adviser')}<ArrowRight size={17} /></button>
          </div>
        </article>
      ))}

      <section className="mg-index" id="mg-index">
        <p className="mg-label">P.10 — {L('地區索引', 'District index')}</p>
        <div className="mg-index-cols">
          {REGIONS.map(r => (
            <div key={r} data-reveal>
              <h3>{cityName(r, lang)}</h3>
              <ul>{byRegion(r).map(l => <li key={l.id} onMouseMove={follow(l.coverUrl)} onMouseLeave={() => setPeek(null)}><a href="/viewings"><span>{estateName(l)}</span><i />{count(estateName(l))}</a></li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mg-ad" data-reveal>
        <p className="mg-ad-tag">{L('廣告', 'Advertisement')}</p>
        <div className="mg-seal" aria-hidden>悦港<br />免佣</div>
        <h2>{L('業主首個單位，豁免佣金', 'No owner commission on your first flat')}</h2>
        <p>{L('另送交吉清潔一次 · 優惠至 2027 年 2 月', 'Plus a free pre-letting clean · Until February 2027')}</p>
        <button type="button" className="mg-btn mg-btn-ink" onClick={() => enquire({ service: 'letting', offer: true })}>{L('登記放盤', 'List my flat')}<ArrowRight size={17} /></button>
      </section>

      <section className="mg-letters">
        <p className="mg-label">{L('讀者來信', 'Letters')}</p>
        <div className="mg-letter-grid">
          {letters.map(([q, a], i) => <div key={q} data-reveal style={{ transitionDelay: `${i * 90}ms` }}><h3>{q}</h3><p>{a}</p><span>— {L('悦港編輯部', 'Harbour Joy')}</span></div>)}
        </div>
      </section>

      <footer className="mg-colophon">
        <div><b>悦港</b> Harbour Joy</div>
        <p>{L('香港住宅放租、租務管理、買賣同翻新。粵語、普通話、English。', 'Hong Kong residential letting, management, sales and renovation. Cantonese, Mandarin, English.')}</p>
        <button type="button" className="mg-btn" onClick={() => enquire()}>{L('聯絡我哋', 'Contact us')}<ArrowRight size={17} /></button>
      </footer>

      {peek && <img className="mg-peek" src={peek.img} alt="" style={{ left: peek.x, top: peek.y }} />}
    </div>
  );
}
