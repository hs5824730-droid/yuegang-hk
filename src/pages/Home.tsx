import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeCheck, BedDouble, Building2, Check, ChevronDown, Hammer, House, KeyRound, Languages, MapPin, Ruler, Sparkles } from 'lucide-react';
import { useEnquiry } from '../components/Enquiry';
import { Reveal } from '../components/ui';
import { cityName, useI18n } from '../i18n';
import type { ServiceInput } from '../enquiry-options';
import { area, estateName, FullPhoto, REGIONS, unitName, useListings, type Kind } from '../styles-lab/shared';
import './home.css';

export default function Home() {
  const { L, lang } = useI18n();
  const enquire = useEnquiry();
  const data = useListings();
  const [kind, setKind] = useState<Kind>('rent');
  const [qService, setQService] = useState<ServiceInput>('letting');
  const [qRegion, setQRegion] = useState('');
  const rail = useRef<HTMLDivElement>(null);

  const quickSubmit = (e: FormEvent) => { e.preventDefault(); enquire({ service: qService, city: qRegion || undefined }); };
  const listings = useMemo(() => {
    const list = data[kind];
    return kind === 'sold' ? [...list].sort((a, b) => (b.soldDate || '').localeCompare(a.soldDate || '')).slice(0, 12) : list.slice(0, 12);
  }, [data, kind]);
  const slide = (dir: number) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * .8, behavior: 'smooth' });

  const services = [
    { Icon: KeyRound, s: 'letting' as ServiceInput, img: '/img/hk/taikoo-shing.webp', t: L('放租', 'Letting'), d: L('幫你搵到合適租客', 'The right tenant, found for you'),
      points: [L('免費上門估租', 'Free on-site rent appraisal'), L('多平台放盤、安排睇樓', 'Marketing and viewings'), L('核對租客、簽約、交收', 'Tenant checks, tenancy, handover')], to: '/services' },
    { Icon: House, s: 'management' as ServiceInput, img: '/img/hk/city-one.webp', t: L('租務管理', 'Property management'), d: L('租出之後都有人跟', 'Looked after after move-in'),
      points: [L('每月收租、跟進欠租', 'Monthly rent collection'), L('維修報價、安排師傅', 'Repairs quoted and arranged'), L('續約、退租驗樓', 'Renewals and check-out')], to: '/services' },
    { Icon: Building2, s: 'selling' as ServiceInput, img: '/img/hk/mid-levels.webp', t: L('買賣物業', 'Buying & selling'), d: L('未簽約，唔收任何費用', 'Nothing to pay before you sign'),
      points: [L('免費市價評估', 'Free market appraisal'), L('查冊、物業資料表格', 'Land search and property forms'), L('議價、簽約到成交', 'Negotiation to completion')], to: '/buy-sell' },
    { Icon: Hammer, s: 'renovation' as ServiceInput, img: '/img/hk/park-island.webp', t: L('翻新及維修', 'Renovation & repairs'), d: L('放租前執靚，租得更快', 'Refresh before letting'),
      points: [L('免費上門評估', 'Free on-site assessment'), L('逐項報價，你確認先開工', 'Itemised quote, starts on approval'), L('完工對照清單驗收', 'Signed off against the list')], to: '/advisory' },
  ];

  const steps = [
    [L('免費估租', 'Free appraisal'), L('同事上門睇樓，按同區成交同叫價建議租金。', 'We visit and suggest a rent from nearby lettings.')],
    [L('簽委託', 'Appoint us'), L('佣金同服務範圍喺表格 3／表格 5 寫清楚先開始。', 'Fees and scope are set out in Form 3 / Form 5 first.')],
    [L('放盤睇樓', 'Market & view'), L('拍相、放盤、篩選租客、陪同睇樓。', 'Photos, listings, tenant screening and viewings.')],
    [L('簽約交收', 'Let & hand over'), L('核對文件、簽租約、點收交吉，之後可轉租務管理。', 'Documents, tenancy, handover — then management if you wish.')],
  ];

  const faq: [string, string][] = [
    [L('佣金點計？', 'How is commission charged?'), L('香港一般做法係：租樓佣金業主同租客各俾半個月租，買賣佣金各俾成交價 1% 左右。我哋實際收幾多，會喺簽表格 3／表格 5 之前白紙黑字寫清楚，冇隱藏收費。', 'Customarily half a month’s rent from each side for letting and around 1% each for sales. Our actual fees are written into Form 3 / Form 5 before we act — no hidden charges.')],
    [L('業主免佣點樣計？', 'How does the owner offer work?'), L('同一位業主委託放租，首個單位免業主佣金，第二個單位半價；租客入伙前送交吉深層清潔同冷氣機清洗。優惠至 2027 年 2 月。', 'For the same owner, no owner commission on the first flat let and half on the second, plus a deep clean and air-conditioner service before move-in. Until February 2027.')],
    [L('我唔喺香港，都可以委託？', 'Can I appoint you from abroad?'), L('可以。睇樓、交收、驗樓由本地同事處理，進度用電話、WhatsApp 或微信話你知。', 'Yes. Viewings, handovers and inspections are handled locally, with updates by phone, WhatsApp or WeChat.')],
    [L('邊啲地區有做？', 'Which districts do you cover?'), L('港島、九龍、新界、離島嘅住宅都可以，我哋按地址安排就近同事。', 'Homes across Hong Kong Island, Kowloon, the New Territories and the Islands; we assign a colleague near you.')],
  ];

  return (
    <div className="hp-root">
      {/* ------------------------------------------------------------ hero */}
      <section className="hp-hero" aria-labelledby="hp-title" data-contact="letting" data-contact-offer="1">
        <FullPhoto src="/img/hk/harbour-night.webp" className="hp-hero-bg" eager />
        <div className="hp-hero-shade" />
        <div className="hp-wrap hp-hero-grid">
          <div className="hp-hero-copy">
            <Link to="/offer" className="hp-offer"><Sparkles size={15} />{L('限時優惠：業主首個單位免佣', 'Offer: no owner commission on your first flat')}<ArrowRight size={14} /></Link>
            <h1 id="hp-title">{L('香港放租同租務管理', 'Hong Kong letting')}<br /><span>{L('交俾悦港，你淨係收租', 'and management, done for you')}</span></h1>
            <p className="hp-lead">{L('搵租客、收租、維修、續約，一位顧問由睇樓跟到交收。買賣同翻新都可以一齊幫你。', 'Tenants, rent, repairs and renewals — one adviser from viewing to handover. Sales and renovation too.')}</p>
            <div className="hp-actions">
              <button type="button" className="hp-btn hp-btn-gold" onClick={() => enquire({ service: 'letting', offer: true })}>{L('免費估租 / 放盤', 'Free rent appraisal')}<ArrowRight size={18} /></button>
              <Link to="/viewings" className="hp-btn hp-btn-ghost">{L('睇盤源', 'Browse listings')}</Link>
            </div>
            <ul className="hp-trust">
              <li><BadgeCheck size={16} />{L('持牌地產代理', 'Licensed agent')}</li>
              <li><Languages size={16} />{L('粵語 · 普通話 · English', 'Cantonese · Mandarin · English')}</li>
              <li><MapPin size={16} />{L('港九新界離島', 'All of Hong Kong')}</li>
            </ul>
          </div>

          <form className="hp-quick" onSubmit={quickSubmit} aria-labelledby="hp-quick-t">
            <h2 id="hp-quick-t">{L('30 秒免費查詢', 'Free enquiry in 30 seconds')}</h2>
            <p>{L('揀服務同地區，同事一個工作天內聯絡你。', 'Pick a service and district; we reply within one working day.')}</p>
            <div className="hp-seg" role="radiogroup" aria-label={L('服務', 'Service')}>
              {([['letting', L('放租', 'Let')], ['management', L('管理', 'Manage')], ['selling', L('放售', 'Sell')], ['buying', L('買樓', 'Buy')]] as [ServiceInput, string][]).map(([v, t]) => (
                <button key={v} type="button" role="radio" aria-checked={qService === v} onClick={() => setQService(v)}>{t}</button>
              ))}
            </div>
            <label className="hp-select"><span>{L('物業地區', 'District')}</span>
              <select value={qRegion} onChange={e => setQRegion(e.target.value)}>
                <option value="">{L('未決定 / 其他', 'Not sure / other')}</option>
                {REGIONS.map(r => <option key={r} value={r}>{cityName(r, lang)}</option>)}
              </select><ChevronDown size={16} />
            </label>
            <button type="submit" className="hp-btn hp-btn-navy hp-block">{L('下一步：留低聯絡方式', 'Next: your contact details')}<ArrowRight size={18} /></button>
            <small>{L('免費諮詢，唔會有任何收費。', 'Free, with no obligation.')}</small>
          </form>
        </div>
        <div className="hp-wrap">
          <ul className="hp-stats">
            <li><strong>{data.rent.length || '—'}</strong><span>{L('租盤', 'To let')}</span></li>
            <li><strong>{data.sale.length || '—'}</strong><span>{L('售盤', 'For sale')}</span></li>
            <li><strong>{data.sold.length || '—'}</strong><span>{L('成交紀錄', 'Sold records')}</span></li>
            <li><strong>18</strong><span>{L('區都有做', 'districts covered')}</span></li>
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------------- services */}
      <section className="hp-sec" id="services" aria-labelledby="hp-svc-t">
        <div className="hp-wrap">
          <header className="hp-head">
            <p className="hp-k">{L('我哋做咩', 'What we do')}</p>
            <h2 id="hp-svc-t">{L('業主最需要嘅四項服務', 'Four services owners need most')}</h2>
          </header>
          <div className="hp-svc">
            {services.map((s, i) => (
              <Reveal as="article" key={s.t} className="hp-card" delay={i * 70} contact={s.s}>
                <figure><FullPhoto src={s.img} /><span className="hp-card-ico"><s.Icon size={20} /></span></figure>
                <div className="hp-card-body">
                  <h3>{s.t}</h3>
                  <p className="hp-card-d">{s.d}</p>
                  <ul>{s.points.map(p => <li key={p}><Check size={15} />{p}</li>)}</ul>
                  <div className="hp-card-cta">
                    <button type="button" className="hp-btn hp-btn-navy" onClick={() => enquire({ service: s.s })}>{L('查詢', 'Enquire')}</button>
                    <Link to={s.to} className="hp-more">{L('詳情', 'Details')}<ArrowRight size={15} /></Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- listings */}
      <section className="hp-sec hp-sec-alt" aria-labelledby="hp-list-t" data-contact={kind === 'rent' ? 'letting' : 'buying'}>
        <div className="hp-wrap">
          <header className="hp-head hp-head-row">
            <div>
              <p className="hp-k">{L('網上睇樓', 'Listings')}</p>
              <h2 id="hp-list-t">{L('最新盤源', 'Latest listings')}</h2>
            </div>
            <div className="hp-tabs" role="tablist">
              {(['rent', 'sale', 'sold'] as Kind[]).map(k => (
                <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => { setKind(k); rail.current?.scrollTo({ left: 0 }); }}>
                  {k === 'rent' ? L('租盤', 'To let') : k === 'sale' ? L('售盤', 'For sale') : L('成交', 'Sold')}<small>{data[k].length}</small>
                </button>
              ))}
            </div>
          </header>
          <div className="hp-rail-wrap">
            <button type="button" className="hp-arrow hp-arrow-l" onClick={() => slide(-1)} aria-label={L('向左', 'Previous')}><ArrowLeft size={18} /></button>
            <div className="hp-rail" ref={rail} key={kind}>
              {listings.map((l, i) => (
                <Link key={l.id} to="/viewings" className="hp-listing" style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
                  <div className="hp-listing-img"><img src={l.coverUrl} alt="" loading="lazy" /><span>{kind === 'rent' ? L('租', 'Let') : kind === 'sale' ? L('售', 'Sale') : L('已成交', 'Sold')}</span></div>
                  <strong className="hp-price">{lang === 'en' ? l.priceDisplay.en : l.priceDisplay.zh}</strong>
                  <span className="hp-title">{estateName(l)} <small>{unitName(l)}</small></span>
                  <span className="hp-meta">{l.suburb} · {cityName(l.city, lang)}{l.beds ? <> · <BedDouble size={13} />{l.beds}</> : null}{area(l) ? <> · <Ruler size={13} />{area(l)}{L('呎', ' ft²')}</> : null}{kind === 'sold' && l.soldDate ? ` · ${l.soldDate.slice(0, 7)}` : ''}</span>
                </Link>
              ))}
            </div>
            <button type="button" className="hp-arrow hp-arrow-r" onClick={() => slide(1)} aria-label={L('向右', 'Next')}><ArrowRight size={18} /></button>
          </div>
          <div className="hp-center"><Link to="/viewings" className="hp-btn hp-btn-line">{L('睇全部盤源', 'See all listings')}<ArrowRight size={17} /></Link></div>
        </div>
      </section>

      {/* ------------------------------------------------ process + offer */}
      <section className="hp-band" aria-labelledby="hp-steps-t" data-contact="letting" data-contact-offer="1">
        <FullPhoto src="/img/hk/hk-island.webp" className="hp-band-bg" />
        <div className="hp-band-shade" />
        <div className="hp-wrap hp-band-grid">
          <div>
            <p className="hp-k hp-k-light">{L('放租流程', 'How letting works')}</p>
            <h2 id="hp-steps-t">{L('四步放租，進度一路話你知', 'Four steps, with updates all the way')}</h2>
            <ol className="hp-steps">
              {steps.map(([t, d], i) => <li key={t}><span>{i + 1}</span><div><strong>{t}</strong><p>{d}</p></div></li>)}
            </ol>
          </div>
          <div className="hp-offer-card">
            <p className="hp-offer-tag">{L('業主優惠 · 至 2027 年 2 月', 'Owner offer · until Feb 2027')}</p>
            <div className="hp-offer-row"><strong>{L('免佣', '$0')}</strong><span>{L('第 1 個單位', '1st flat')}<small>{L('業主佣金', 'owner commission')}</small></span></div>
            <div className="hp-offer-row"><strong>{L('半價', '50%')}</strong><span>{L('第 2 個單位', '2nd flat')}<small>{L('業主佣金', 'owner commission')}</small></span></div>
            <div className="hp-offer-row"><strong>{L('送', 'Free')}</strong><span>{L('交吉深層清潔', 'Deep clean')}<small>{L('同冷氣機清洗', 'and A/C service')}</small></span></div>
            <button type="button" className="hp-btn hp-btn-gold hp-block" onClick={() => enquire({ service: 'letting', offer: true })}>{L('用優惠放盤', 'List with the offer')}<ArrowRight size={18} /></button>
            <Link to="/offer" className="hp-more hp-more-light">{L('優惠條款', 'Terms')}<ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- FAQ */}
      <section className="hp-sec" aria-labelledby="hp-faq-t">
        <div className="hp-wrap hp-faq-grid">
          <header className="hp-head">
            <p className="hp-k">{L('常見問題', 'FAQ')}</p>
            <h2 id="hp-faq-t">{L('業主最常問', 'What owners ask')}</h2>
            <p className="hp-faq-lead">{L('仲有其他問題？直接搵我哋，一個工作天內回覆。', 'Anything else? Ask us — we reply within one working day.')}</p>
            <button type="button" className="hp-btn hp-btn-navy" onClick={() => enquire()}>{L('問我哋', 'Ask us')}<ArrowRight size={17} /></button>
          </header>
          <div className="hp-faq">
            {faq.map(([q, a], i) => <details key={q} open={i === 0}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>
    </div>
  );
}
