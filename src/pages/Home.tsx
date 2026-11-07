import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BadgeCheck, Check, Hammer, House, Languages, MapPin, Minus, Search, Wrench } from 'lucide-react';
import { useEnquiry } from '../components/Enquiry';
import { Reveal, SmartImg } from '../components/ui';
import { cityName, useI18n } from '../i18n';
import type { Service } from '../enquiry-options';

/** Licensed Wikimedia photographs, credited on /credits. Cross-fade slowly. */
const HERO_PHOTOS = [
  { key: 'harbour', img: '/img/hk/harbour-night.webp', pos: '50% 45%' },
  { key: 'kowloon', img: '/img/hk/kowloon.webp', pos: '30% 55%' },
];

const REGIONS = ['Hong Kong Island', 'Kowloon', 'New Territories', 'Islands'] as const;

/** Wikimedia photographs of the four service regions, credited on /credits. */
const REGION_PHOTOS: Record<(typeof REGIONS)[number], { img: string; pos: string }> = {
  'Hong Kong Island': { img: '/img/hk/mid-levels.webp', pos: '50% 50%' },
  Kowloon: { img: '/img/hk/kowloon.webp', pos: '22% 55%' },
  'New Territories': { img: '/img/hk/tai-po.webp', pos: '50% 50%' },
  Islands: { img: '/img/hk/islands.webp', pos: '62% 45%' },
};

export default function Home() {
  const { L, lang } = useI18n();
  const enquire = useEnquiry();
  const [scene, setScene] = useState(0);
  const [service, setService] = useState<Service>('letting');
  const [region, setRegion] = useState<string>('');
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setScene(i => (i + 1) % HERO_PHOTOS.length), 12000);
    return () => window.clearTimeout(timer);
  }, [scene]);

  const quick: [Service, string][] = [
    ['letting', L('放租', 'Let')], ['management', L('租務管理', 'Manage')], ['selling', L('放售', 'Sell')], ['buying', L('買樓', 'Buy')], ['renovation', L('翻新', 'Renovate')],
  ];

  const facts = [
    { Icon: BadgeCheck, t: L('持牌地產代理', 'Licensed estate agent'), d: L('依《地產代理條例》經營', 'Under the Estate Agents Ordinance') },
    { Icon: Languages, t: L('粵語 · 普通話 · English', 'Cantonese · Mandarin · English'), d: L('用你習慣嘅語言溝通', 'In the language you prefer') },
    { Icon: MapPin, t: L('港九新界及離島', 'All of Hong Kong'), d: L('按地址安排就近同事', 'A colleague near your flat') },
  ];

  const compare: [string, boolean][] = [
    [L('放盤宣傳、約人睇樓', 'Marketing and viewings'), true],
    [L('揀租客、簽租約、交吉交收', 'Tenant selection, tenancy, handover'), true],
    [L('收租、同租客傾偈', 'Rent and tenant contact'), false],
    [L('維修、驗樓、續約', 'Repairs, inspections, renewals'), false],
  ];

  const extras = [
    { to: '/home-services', Icon: House, t: L('房屋服務', 'Home services'), d: L('清潔、睇屋、吉屋巡查', 'Cleaning, sitting, vacant-flat checks') },
    { to: '/?service=maintenance', Icon: Wrench, t: L('維修保養', 'Repairs'), d: L('報維修、定期檢查', 'Requests and checks') },
    { to: '/advisory#renovation', Icon: Hammer, t: L('裝修翻新', 'Renovation'), d: L('放租前執靚、換廚廁', 'Refreshes, kitchens, bathrooms') },
    { to: '/?service=buyer-advisory', Icon: Search, t: L('置業查詢', 'Buying advice'), d: L('預算、按揭、印花稅', 'Budget, mortgage, stamp duty') },
  ];

  const principles: [string, string][] = [
    [L('書面先行', 'Agreed in writing'), L('佣金、服務範圍及是否雙邊代理，簽署表格 3／表格 5 之前逐項說明。', 'Fees, scope and any dual agency are set out before Form 3 or Form 5 is signed.')],
    [L('一位顧問跟到尾', 'One adviser throughout'), L('由睇樓、交收到維修，同一位同事跟進，定期匯報進度。', 'One colleague follows your property from viewing to repairs and keeps you updated.')],
    [L('海外業主都安心', 'Owners overseas are covered'), L('睇樓、交收、驗樓由本地同事處理，進度用電話、WhatsApp 或微信話你知。', 'Viewings, handovers and inspections are handled locally, with updates by phone, WhatsApp or WeChat.')],
  ];

  const faq: [string, string][] = [
    [L('佣金點計？', 'How is commission charged?'), L('香港一般做法係：租樓佣金業主同租客各俾半個月租，買賣佣金大家各俾成交價 1% 左右。我哋實際收幾多，會喺簽地產代理協議（表格 3／表格 5）之前白紙黑字寫清楚，唔會有隱藏收費。', 'In Hong Kong, letting commission is customarily half a month’s rent from each side, and sale commission around 1% from each side. Our actual fees are written into the estate agency agreement (Form 3 / Form 5) before we act for you.')],
    [L('我唔喺香港，都可以委託你哋？', 'Can I appoint you from outside Hong Kong?'), L('得㗎！睇樓、交收、驗樓我哋本地同事搞掂，進度會用電話、WhatsApp 或者微信話你知。', 'Yes. Viewings, handovers and inspections are handled locally; we update you by phone, WhatsApp or WeChat.')],
    [L('可唔可以淨係放租，唔使管理？', 'Can I choose letting only?'), L('冇問題。租客入住之後你自己打理；第時想轉做租務管理，隨時同我哋講。', 'Yes. You manage the tenancy after move-in and can switch to management later.')],
    [L('新界同離島都有做？', 'Do you cover the New Territories and Islands?'), L('有！港島、九龍、新界、離島嘅住宅都歡迎搵我哋，我哋會按地址安排附近嘅同事跟。', 'Yes. Homes across Hong Kong Island, Kowloon, the New Territories and the Islands are welcome; we assign a colleague by address.')],
  ];

  return (
    <div className="hx-home">
      {/* ---------------------------------------------------------- opening */}
      <section className="hx-hero" aria-labelledby="home-title">
        <div className="hx-hero-photos" aria-hidden>
          {HERO_PHOTOS.map((p, i) => <img key={p.key} src={p.img} alt="" className={i === scene ? 'is-on' : ''} style={{ objectPosition: p.pos }} fetchPriority={i === 0 ? 'high' : 'low'} loading={i === 0 ? 'eager' : 'lazy'} />)}
        </div>
        <span className="hx-hero-shade" aria-hidden />
        <div className="hx-wrap hx-hero-grid">
          <div className="hx-hero-copy">
            <p className="hx-eyebrow">{L('香港住宅 · 放租 · 管理 · 買賣', 'Hong Kong residential · Letting · Management · Sales')}</p>
            <h1 id="home-title">{L('你嘅物業，', 'Your Hong Kong property,')}<br /><em>{L('交俾專業團隊打理', 'in professional hands')}</em></h1>
            <p className="hx-lead">{L('由搵租客、收租、維修，到買賣與翻新，悦港一位專屬顧問全程跟進，粵語、普通話、English 隨你揀。', 'From tenants, rent and repairs to sales and renovation, one dedicated Harbour Joy adviser follows everything through, in Cantonese, Mandarin or English.')}</p>
            <div className="hx-actions">
              <button type="button" className="btn btn-primary" onClick={() => enquire({ service: 'letting' })}>{L('預約免費諮詢', 'Book a free consultation')}<ArrowRight size={18} aria-hidden /></button>
              <Link className="btn btn-line" to="/viewings">{L('瀏覽盤源', 'Browse listings')}</Link>
            </div>
          </div>

          <form className="hx-panel hx-quick" onSubmit={e => { e.preventDefault(); enquire({ service, city: region || undefined }); }} aria-labelledby="quick-title">
            <h2 id="quick-title">{L('快速查詢', 'Quick enquiry')}</h2>
            <p>{L('揀服務同地區，同事會盡快聯絡你。', 'Choose a service and district; a colleague will be in touch.')}</p>
            <fieldset>
              <legend>{L('需要咩服務', 'Service')}</legend>
              <div className="hx-chips">
                {quick.map(([value, label]) => (
                  <label key={value} className={service === value ? 'is-on' : ''}>
                    <input type="radio" name="quick-service" value={value} checked={service === value} onChange={() => setService(value)} />{label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="hx-field">
              <span>{L('物業地區', 'District')}</span>
              <select value={region} onChange={e => setRegion(e.target.value)}>
                <option value="">{L('未決定 / 其他', 'Not sure / other')}</option>
                {REGIONS.map(r => <option key={r} value={r}>{cityName(r, lang)}</option>)}
              </select>
            </label>
            <button type="submit" className="btn btn-primary hx-quick-submit">{L('留低聯絡方式', 'Leave your details')}<ArrowUpRight size={17} aria-hidden /></button>
          </form>
        </div>

        <div className="hx-wrap hx-facts-wrap">
          <ul className="hx-panel hx-facts">
            {facts.map(({ Icon, t, d }) => <li key={t}><Icon size={20} aria-hidden /><span><strong>{t}</strong><small>{d}</small></span></li>)}
            <li className="hx-facts-offer"><Link to="/offer"><span><strong>{L('業主首個單位免佣', 'No owner commission, first flat')}</strong><small>{L('另送交吉清潔 · 至 2027年2月', 'Free pre-letting clean · until Feb 2027')}</small></span><ArrowUpRight size={16} aria-hidden /></Link></li>
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------- services */}
      <section className="hx-sec" id="what-we-do" aria-labelledby="home-biz-title">
        <div className="hx-wrap">
          <header className="hx-head">
            <div>
              <p className="hx-eyebrow">{L('核心服務', 'What we do')}</p>
              <h2 id="home-biz-title">{L('一個團隊，打理物業嘅每一步', 'One team for every stage of your property')}</h2>
            </div>
            <Link className="hx-more" to="/services">{L('全部服務', 'All services')}<ArrowUpRight size={16} aria-hidden /></Link>
          </header>

          <div className="hx-cards">
            <Reveal as="article" className="hx-panel hx-card" contact="management">
              <span id="services" className="v-anchor" />
              <figure><SmartImg src="/img/interior.jpg" alt={L('客廳（示意）', 'A living room (illustrative)')} position="50% 50%" /><figcaption>01</figcaption></figure>
              <div className="hx-card-body">
                <p className="hx-eyebrow">{L('放租及租務管理', 'Letting & management')}</p>
                <h3>{L('租得好，之後都有人睇住', 'Let well, and looked after')}</h3>
                <p>{L('物色合適租客、處理租約交收；揀租務管理，收租、維修、續約都交俾我哋。', 'We find the tenant and handle the tenancy; with management, rent, repairs and renewals too.')}</p>
                <div className="hx-card-links">
                  <button type="button" className="btn btn-primary rp-management-cta" onClick={() => enquire({ service: 'management' })}>{L('查詢', 'Enquire')}</button>
                  <Link className="hx-more" to="/services">{L('了解更多', 'Learn more')}<ArrowUpRight size={15} aria-hidden /></Link>
                </div>
              </div>
            </Reveal>

            <Reveal as="article" className="hx-panel hx-card" contact="selling" delay={80}>
              <span id="buy-sell-home" className="v-anchor" />
              <figure><SmartImg src="/img/hk/mid-levels.webp" alt={L('半山住宅', 'Homes in the Mid-Levels')} position="50% 50%" /><figcaption>02</figcaption></figure>
              <div className="hx-card-body">
                <p className="hx-eyebrow">{L('買賣物業', 'Buying & selling')}</p>
                <h3>{L('買定賣，先從你嘅計劃講起', 'Start with your plans')}</h3>
                <p>{L('免費市價參考、查冊及物業資料表格；佣金喺表格 3／表格 5 寫明，未簽約不收分文。', 'Free price guidance, land searches and property forms; fees in Form 3 / Form 5, nothing before you sign.')}</p>
                <div className="hx-card-links">
                  <Link className="btn btn-primary sales-selling-cta" to="/selling-registration">{L('登記放售', 'Sell')}</Link>
                  <Link className="btn btn-line sales-buying-cta" to="/buying-registration">{L('登記買樓', 'Buy')}</Link>
                </div>
              </div>
            </Reveal>

            <Reveal as="article" className="hx-panel hx-card" contact="renovation" delay={160}>
              <span id="advisory-home" className="v-anchor" />
              <figure><SmartImg src="/img/renovation/hk-kitchen.webp" alt={L('翻新後嘅香港單位廚房', 'A renovated Hong Kong kitchen')} position="50% 60%" /><figcaption>03</figcaption></figure>
              <div className="hx-card-body">
                <p className="hx-eyebrow">{L('翻新及置業顧問', 'Renovation & advisory')}</p>
                <h3>{L('先上門睇，再逐項報價', 'Seen first, then quoted item by item')}</h3>
                <p>{L('放租前翻新、換廚房浴室，以至置業預算、按揭及印花稅，你點頭先開工。', 'Refreshes, kitchens and bathrooms, plus budgets, mortgages and stamp duty. Work starts once you approve.')}</p>
                <div className="hx-card-links">
                  <Link className="btn btn-primary advisory-home-cta" to="/advisory-registration?service=renovation">{L('登記翻新', 'Register')}</Link>
                  <Link className="hx-more" to="/advisory">{L('了解更多', 'Learn more')}<ArrowUpRight size={15} aria-hidden /></Link>
                </div>
              </div>
            </Reveal>
          </div>

          <ul className="hx-extras">
            {extras.map(({ to, Icon, t, d }) => (
              <li key={to}>
                <Link className="hx-panel" to={to}><Icon size={20} aria-hidden /><span><strong>{t}</strong><small>{d}</small></span><ArrowUpRight size={16} aria-hidden /></Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------- letting vs managing */}
      <section className="hx-sec hx-sec-band" aria-labelledby="home-plan-title" data-contact="letting">
        <div className="hx-wrap hx-split">
          <div className="hx-split-copy">
            <p className="hx-eyebrow">{L('揀適合你嘅方式', 'Choose your level of service')}</p>
            <h2 id="home-plan-title">{L('淨放租，定係連管理一齊交俾我哋？', 'Letting only, or management as well?')}</h2>
            <p>{L('兩種方式都包放盤宣傳、揀租客同交收。想租客入住之後都唔使煩，就揀租務管理。', 'Both include marketing, tenant selection and handover. Choose management if you would rather not deal with anything after move-in.')}</p>
            <Link className="hx-more" to="/offer">{L('業主優惠詳情', 'Owner offer details')}<ArrowUpRight size={15} aria-hidden /></Link>
          </div>
          <div className="hx-panel hx-table-wrap">
            <table className="hx-compare">
              <caption className="sr-only">{L('淨放租同租務管理比較', 'Letting only vs management')}</caption>
              <thead><tr><th scope="col"><span className="sr-only">{L('服務內容', 'Service')}</span></th><th scope="col">{L('淨放租', 'Letting')}</th><th scope="col">{L('租務管理', 'Managed')}</th></tr></thead>
              <tbody>
                {compare.map(([label, inLetting]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{inLetting ? <><Check size={17} aria-hidden /><span className="sr-only">{L('包含', 'Included')}</span></> : <><Minus size={15} aria-hidden /><span className="hx-own">{L('自理', 'You')}</span></>}</td>
                    <td><Check size={17} aria-hidden /><span className="sr-only">{L('包含', 'Included')}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td /><td><button type="button" className="btn btn-line rp-letting-cta" onClick={() => enquire({ service: 'letting' })}>{L('查詢', 'Enquire')}</button></td><td><button type="button" className="btn btn-primary" onClick={() => enquire({ service: 'management' })}>{L('查詢', 'Enquire')}</button></td></tr></tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- regions */}
      <section className="hx-sec" aria-labelledby="home-cities-title" data-contact="letting">
        <div className="hx-wrap">
          <header className="hx-head">
            <div>
              <p className="hx-eyebrow">{L('服務地區', 'Where we work')}</p>
              <h2 id="home-cities-title">{L('港九新界及離島，都喺你附近', 'Across Hong Kong, near your flat')}</h2>
            </div>
          </header>
          <ul className="hx-regions">
            {REGIONS.map(city => (
              <li key={city}>
                <button type="button" onClick={() => enquire({ city, service: 'letting' })} aria-label={L(`查詢${cityName(city, lang)}嘅物業`, `Enquire about a home in ${city}`)}>
                  <SmartImg src={REGION_PHOTOS[city].img} alt="" position={REGION_PHOTOS[city].pos} />
                  <span><MapPin size={15} aria-hidden />{cityName(city, lang)}<ArrowUpRight size={15} aria-hidden /></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------- principles + FAQ */}
      <section className="hx-sec hx-sec-band" aria-labelledby="home-about-title">
        <div className="hx-wrap hx-trust">
          <div>
            <p className="hx-eyebrow">{L('點解揀悦港', 'Why Harbour Joy')}</p>
            <h2 id="home-about-title">{L('熟悉香港，認真對待每一層樓', 'Local knowledge, careful follow-through')}</h2>
            <ol className="hx-principles">
              {principles.map(([t, d], i) => (
                <li key={t} className="hx-panel"><span className="hx-num">{String(i + 1).padStart(2, '0')}</span><div><h3>{t}</h3><p>{d}</p></div></li>
              ))}
            </ol>
            <Link className="hx-more" to="/about">{L('認識悦港', 'About Harbour Joy')}<ArrowUpRight size={15} aria-hidden /></Link>
          </div>
          <div>
            <p className="hx-eyebrow">{L('常見問題', 'FAQ')}</p>
            <h2 id="home-faq-title">{L('業主最常問', 'What owners ask first')}</h2>
            <div className="hx-panel hx-faq">
              {faq.map(([q, a], i) => (
                <details key={q} open={i === 0}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
            <Link className="hx-more" to="/services#rental-faq">{L('更多問題', 'More questions')}<ArrowUpRight size={15} aria-hidden /></Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- closing */}
      <section className="hx-sec hx-closing" aria-labelledby="home-close-title">
        <div className="hx-wrap">
          <div className="hx-panel hx-closing-panel">
            <SmartImg src="/img/hk/hk-island.webp" alt="" position="60% 50%" />
            <div className="hx-closing-copy">
              <p className="hx-eyebrow">{L('私人諮詢', 'Private consultation')}</p>
              <h2 id="home-close-title">{L('不如傾吓你層樓？', 'Let’s talk about your flat')}</h2>
              <p>{L('話我哋知層樓喺邊、想我哋幫咩手，同事好快會搵你。', 'Tell us where the flat is and what you need — a colleague will be in touch.')}</p>
            </div>
            <div className="hx-actions">
              <button type="button" className="btn btn-primary" onClick={() => enquire()}>{L('開始委託查詢', 'Start an enquiry')}<ArrowRight size={18} aria-hidden /></button>
              <Link className="btn btn-line" to="/contact">{L('其他聯絡方式', 'Other ways to reach us')}</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
