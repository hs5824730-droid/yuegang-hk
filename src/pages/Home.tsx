import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEnquiry } from '../components/Enquiry';
import { Reveal, SmartImg } from '../components/ui';
import { cityName, useI18n } from '../i18n';

/** Licensed Wikimedia photographs, credited on /credits. Cross-fade slowly. */
const HERO_PHOTOS = [
  { key: 'harbour', img: '/img/hk/harbour-night.webp', pos: '50% 45%' },
  { key: 'kowloon', img: '/img/hk/kowloon.webp', pos: '30% 55%' },
];

/** Wikimedia photographs of the four service regions, credited on /credits. */
const REGION_PHOTOS = [
  { city: 'Hong Kong Island', img: '/img/hk/mid-levels.webp', pos: '50% 50%' },
  { city: 'Kowloon', img: '/img/hk/kowloon.webp', pos: '22% 55%' },
  { city: 'New Territories', img: '/img/hk/tai-po.webp', pos: '50% 50%' },
  { city: 'Islands', img: '/img/hk/islands.webp', pos: '62% 45%' },
];

export default function Home() {
  const { L, lang } = useI18n();
  const enquire = useEnquiry();
  const [scene, setScene] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setScene(i => (i + 1) % HERO_PHOTOS.length), 11000);
    return () => window.clearTimeout(timer);
  }, [scene]);

  const sceneName = [L('維多利亞港', 'Victoria Harbour'), cityName('Kowloon', lang)];

  const principles: [string, string][] = [
    [L('持牌經營', 'Licensed'), L('依照《地產代理條例》經營，公司及營業員牌照號碼公開列明。', 'We act under the Estate Agents Ordinance; company and salesperson licence numbers are published.')],
    [L('書面先行', 'Agreed in writing'), L('佣金、服務範圍及是否雙邊代理，簽署表格 3／表格 5 之前逐項說明。', 'Fees, scope and any dual agency are set out before Form 3 or Form 5 is signed.')],
    [L('一位顧問', 'One adviser'), L('由睇樓、交收到維修，同一位同事跟進，以粵語、普通話或英文匯報。', 'One colleague follows your property from viewing to repairs, reporting in Cantonese, Mandarin or English.')],
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
        <div className="hx-hero-copy">
          <p className="hx-label">{L('香港住宅物業', 'Hong Kong Residential')}</p>
          <h1 id="home-title">{L('細心打理，', 'Hong Kong homes,')}<br />{L('香港每一個家', 'quietly well kept')}</h1>
          <button type="button" className="hx-link hx-link-light" onClick={() => enquire({ service: 'letting' })}>{L('預約私人諮詢', 'Arrange a private consultation')}</button>
        </div>
        <p className="hx-hero-caption" aria-live="off"><span>{String(scene + 1).padStart(2, '0')}</span>{sceneName[scene]}</p>
      </section>

      {/* ------------------------------------------------------------ intro */}
      <section className="hx-intro" id="what-we-do" aria-label={L('關於悦港', 'About Harbour Joy')}>
        <Reveal className="hx-narrow">
          <p className="hx-label">悦港 · Harbour Joy</p>
          <p className="hx-statement">{L('由放租、租務管理，到買賣與翻新，\n悦港以一位專屬顧問，陪你走過物業嘅每一個階段。', 'From letting and management to sales and renovation, Harbour Joy gives each owner one dedicated adviser for every stage of a property’s life.')}</p>
        </Reveal>
      </section>

      {/* --------------------------------------------------------- services */}
      <section className="hx-features" aria-label={L('服務', 'Services')}>
        <Reveal as="article" className="hx-feature">
          <span id="services" className="v-anchor" />
          <figure className="hx-feature-photo"><SmartImg src="/img/interior.jpg" alt={L('客廳（示意）', 'A living room (illustrative)')} position="50% 50%" /></figure>
          <div className="hx-feature-copy">
            <p className="hx-label"><span>01</span>{L('放租及租務管理', 'Letting & Management')}</p>
            <h2>{L('租得其所，之後亦有人照應', 'Let well, and looked after long after')}</h2>
            <p>{L('我哋為你物色合適租客、處理租約與交收；選擇租務管理嘅話，收租、維修及續約亦一併跟進。', 'We find the right tenant and handle the tenancy and handover. With management, rent, repairs and renewals are followed up too.')}</p>
            <div className="hx-links">
              <Link className="hx-link" to="/services">{L('了解服務', 'Discover more')}</Link>
              <button type="button" className="hx-link rp-management-cta" onClick={() => enquire({ service: 'management' })}>{L('預約諮詢', 'Enquire')}</button>
            </div>
          </div>
        </Reveal>

        <Reveal as="article" className="hx-feature hx-feature-flip">
          <span id="buy-sell-home" className="v-anchor" />
          <figure className="hx-feature-photo"><SmartImg src="/img/hk/mid-levels.webp" alt={L('半山住宅', 'Homes in the Mid-Levels')} position="50% 50%" /></figure>
          <div className="hx-feature-copy">
            <p className="hx-label"><span>02</span>{L('買賣物業', 'Sales & Acquisitions')}</p>
            <h2>{L('買或賣，先從你嘅計劃講起', 'Buying or selling begins with your plans')}</h2>
            <p>{L('免費市價參考、查冊及物業資料表格，佣金喺表格 3／表格 5 寫明；未簽約，不收分文。', 'Market guidance, land searches and property information forms, with fees set out in Form 3 or Form 5. Nothing is payable before you sign.')}</p>
            <div className="hx-links">
              <Link className="hx-link sales-selling-cta" to="/selling-registration">{L('登記放售', 'Selling')}</Link>
              <Link className="hx-link sales-buying-cta" to="/buying-registration">{L('登記買樓', 'Buying')}</Link>
            </div>
          </div>
        </Reveal>

        <Reveal as="article" className="hx-feature">
          <span id="advisory-home" className="v-anchor" />
          <figure className="hx-feature-photo"><SmartImg src="/img/renovation/hk-kitchen.webp" alt={L('翻新後嘅香港單位廚房', 'A renovated Hong Kong kitchen')} position="50% 60%" /></figure>
          <div className="hx-feature-copy">
            <p className="hx-label"><span>03</span>{L('翻新及置業顧問', 'Renovation & Advisory')}</p>
            <h2>{L('先上門細看，再逐項報價', 'Seen in person, then quoted item by item')}</h2>
            <p>{L('放租前翻新、廚房浴室更換，以至置業預算、按揭及印花稅，我哋先了解，你同意先開工。', 'Pre-letting refreshes, kitchens and bathrooms, and advice on budgets, mortgages and stamp duty. Work starts only once you approve.')}</p>
            <div className="hx-links">
              <Link className="hx-link" to="/advisory">{L('了解服務', 'Discover more')}</Link>
              <Link className="hx-link advisory-home-cta" to="/advisory-registration?service=renovation">{L('登記翻新', 'Register')}</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ----------------------------------------------------------- regions */}
      <section className="hx-regions" aria-labelledby="home-cities-title">
        <div className="hx-wrap">
          <header className="hx-head">
            <p className="hx-label">{L('服務地區', 'Where we work')}</p>
            <h2 id="home-cities-title">{L('港九新界及離島', 'Across Hong Kong')}</h2>
          </header>
          <ul>
            {REGION_PHOTOS.map(({ city, img, pos }) => (
              <li key={city}>
                <button type="button" onClick={() => enquire({ city, service: 'letting' })} aria-label={L(`查詢${cityName(city, lang)}嘅物業`, `Enquire about a home in ${city}`)}>
                  <SmartImg src={img} alt="" position={pos} />
                  <span>{cityName(city, lang)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------------- privilege */}
      <section className="hx-privilege" aria-labelledby="home-offer-title">
        <Reveal className="hx-wrap hx-privilege-inner">
          <p className="hx-label">{L('業主禮遇', 'For owners')}</p>
          <div>
            <h2 id="home-offer-title">{L('首個委託單位，豁免業主佣金', 'No owner commission on your first property')}</h2>
            <p>{L('另送交吉清潔一次，適用於 2027 年 2 月底前簽署嘅放租委託。', 'With a complimentary pre-letting clean, for letting appointments signed before the end of February 2027.')}</p>
            <Link className="hx-link" to="/offer">{L('細閱條款', 'Read the terms')}</Link>
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------------- principles */}
      <section className="hx-principles" aria-labelledby="home-about-title">
        <div className="hx-wrap">
          <header className="hx-head">
            <p className="hx-label">{L('我們的做法', 'How we work')}</p>
            <h2 id="home-about-title">{L('熟悉香港，認真對待每一層樓', 'Local knowledge, careful follow-through')}</h2>
          </header>
          <ol>
            {principles.map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 80}>
                <span className="hx-numeral" aria-hidden>{['I', 'II', 'III'][i]}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </Reveal>
            ))}
          </ol>
          <Link className="hx-link" to="/about">{L('認識悦港', 'About Harbour Joy')}</Link>
        </div>
      </section>

      {/* --------------------------------------------------------------- FAQ */}
      <section className="hx-faq" aria-labelledby="home-faq-title">
        <div className="hx-wrap hx-faq-inner">
          <header className="hx-head">
            <p className="hx-label">{L('常見問題', 'Questions')}</p>
            <h2 id="home-faq-title">{L('業主常問', 'What owners ask')}</h2>
            <Link className="hx-link" to="/services#rental-faq">{L('更多問題', 'More questions')}</Link>
          </header>
          <div className="hx-faq-list">
            {faq.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- closing */}
      <section className="hx-closing" aria-labelledby="home-close-title">
        <SmartImg src="/img/hk/hk-island.webp" alt="" position="60% 50%" />
        <span className="hx-hero-shade" aria-hidden />
        <div className="hx-closing-copy">
          <p className="hx-label">{L('私人諮詢', 'Private consultation')}</p>
          <h2 id="home-close-title">{L('同我們談談你的物業', 'Tell us about your property')}</h2>
          <button type="button" className="hx-button" onClick={() => enquire()}>{L('留低聯絡方式', 'Leave your details')}</button>
        </div>
      </section>
    </div>
  );
}
