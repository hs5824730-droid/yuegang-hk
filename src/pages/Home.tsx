import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BadgeCheck, Check, FileSignature, Hammer, HeartHandshake, House, Languages, MapPin, Minus, Search, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { CtaBand } from '../components/sections';
import { useEnquiry } from '../components/Enquiry';
import { Reveal, SmartImg } from '../components/ui';
import { OfferReceipt, QAGrid, SectionHead } from '../components/v2/blocks';
import { cityName, useI18n } from '../i18n';

/** Licensed Wikimedia photographs, credited on /credits. Rotate slowly; a visitor can pick one. */
const HERO_PHOTOS = [
  { city: 'Harbour', img: '/img/hk/harbour-night.webp', pos: '50% 45%' },
  { city: 'Hong Kong Island', img: '/img/hk/hk-island.webp', pos: '62% 50%' },
  { city: 'Kowloon', img: '/img/hk/kowloon.webp', pos: '30% 55%' },
  { city: 'New Territories', img: '/img/hk/new-territories.webp', pos: '55% 45%' },
  { city: 'Islands', img: '/img/hk/islands.webp', pos: '62% 45%' },
];

/** Wikimedia photographs of the four service regions, credited on /credits. */
const REGION_PHOTOS = [
  { city: 'Hong Kong Island', img: '/img/hk/hk-island.webp', pos: '62% 50%' },
  { city: 'Kowloon', img: '/img/hk/kowloon.webp', pos: '22% 55%' },
  { city: 'New Territories', img: '/img/hk/new-territories.webp', pos: '55% 50%' },
  { city: 'Islands', img: '/img/hk/islands.webp', pos: '62% 45%' },
];

export default function Home() {
  const { L, lang } = useI18n();
  const enquire = useEnquiry();
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setScene(i => (i + 1) % HERO_PHOTOS.length), 9000);
    return () => window.clearTimeout(timer);
  }, [scene, paused]);

  const promises = [
    { Icon: ShieldCheck, t: L('交俾我哋，你可以放心', 'Hand it over and relax'), d: L('睇樓、簽約、報維修、續租，我哋本地同事一路跟到尾。', 'Viewings, tenancies, repairs and renewals — followed up locally.') },
    { Icon: Sparkles, t: L('減佣唔減服務', 'Lower fees, same service'), d: L('優惠只係減佣金，放盤宣傳、揀租客、跟維修，一樣都唔會少。', 'Only the fee is lower; marketing, screening and upkeep stay.') },
    { Icon: HeartHandshake, t: L('做一次，做朋友', 'One appointment, a lasting relationship'), d: L('放租、買賣、裝修維修，之後有咩事都可以搵返我哋。', 'Letting, sales, renovation — whatever comes next.') },
  ];

  const compare: [string, boolean][] = [
    [L('放盤宣傳、約人睇樓', 'Marketing and viewings'), true],
    [L('揀租客、簽租約、交吉交收', 'Tenant selection, tenancy, handover'), true],
    [L('收租、同租客傾偈', 'Rent and tenant contact'), false],
    [L('維修、驗樓、續約', 'Repairs, inspections, renewals'), false],
  ];

  const extras = [
    { to: '/home-services', Icon: House, t: L('家居服務', 'Home services'), d: L('清潔、睇屋、吉屋巡查', 'Cleaning, home sitting, vacant-flat checks') },
    { to: '/?service=maintenance', Icon: Wrench, t: L('維修保養', 'Repairs'), d: L('報維修、執執修修、定期檢查', 'Requests, small fixes, checks') },
    { to: '/advisory#renovation', Icon: Hammer, t: L('裝修翻新', 'Renovation'), d: L('放租前執靚、換廚廁', 'Pre-letting refreshes, kitchens, bathrooms') },
    { to: '/?service=buyer-advisory', Icon: Search, t: L('置業查詢', 'Buying advice'), d: L('幫你理清地區、預算、按揭同印花稅', 'Districts, budget, mortgage and stamp duty') },
  ];

  const faq: [string, string][] = [
    [L('佣金點計？', 'How is commission charged?'), L('香港一般做法係：租樓佣金業主同租客各俾半個月租，買賣佣金大家各俾成交價 1% 左右。我哋實際收幾多，會喺簽地產代理協議（表格 3／表格 5）之前白紙黑字寫清楚，唔會有隱藏收費。', 'In Hong Kong, letting commission is customarily half a month’s rent from each side, and sale commission around 1% from each side. Our actual fees are written into the estate agency agreement (Form 3 / Form 5) before we act for you.')],
    [L('我唔喺香港，都可以委託你哋？', 'Can I appoint you from outside Hong Kong?'), L('得㗎！睇樓、交收、驗樓我哋本地同事搞掂，進度會用電話、WhatsApp 或者微信話你知。', 'Yes. Viewings, handovers and inspections are handled locally; we update you by phone, WhatsApp or WeChat.')],
    [L('可唔可以淨係放租，唔使管理？', 'Can I choose letting only?'), L('冇問題。租客入住之後你自己打理；第時想轉做租務管理，隨時同我哋講。', 'Yes. You manage the tenancy after move-in and can switch to management later.')],
    [L('新界同離島都有做？', 'Do you cover the New Territories and Islands?'), L('有！港島、九龍、新界、離島嘅住宅都歡迎搵我哋，我哋會按地址安排附近嘅同事跟。', 'Yes. Homes across Hong Kong Island, Kowloon, the New Territories and the Islands are welcome; we assign a colleague by address.')],
  ];

  const trust = [
    { Icon: BadgeCheck, t: L('持牌經營', 'Licensed'), d: L('我哋跟足《地產代理條例》做嘢，公司同營業員牌照號碼都會喺網站同廣告度公開。', 'We operate under the Estate Agents Ordinance; company and salesperson licence numbers are shown on this site and in our ads.') },
    { Icon: FileSignature, t: L('講清楚先開工', 'In writing first'), d: L('佣金、服務範圍、會唔會做雙邊代理，簽表格 3／表格 5 之前全部同你講清楚。', 'Commission, scope and any dual agency are explained before Form 3 / Form 5 is signed.') },
    { Icon: Languages, t: L('粵語、普通話、English', 'Cantonese, Mandarin, English'), d: L('本地業主、內地同海外客，你講開邊種語言我哋就用邊種。', 'Local, mainland and overseas clients, in the language you prefer.') },
  ];

  return (
    <div className="v-home">
      {/* ---------------------------------------------------------- opening */}
      <section className="hj-hero" aria-labelledby="home-title">
        <div className="hj-hero-photos" aria-hidden>
          {HERO_PHOTOS.map((p, i) => <img key={p.city} src={p.img} alt="" className={i === scene ? 'is-on' : ''} style={{ objectPosition: p.pos }} fetchPriority={i === 0 ? 'high' : 'low'} loading={i === 0 ? 'eager' : 'lazy'} />)}
        </div>
        <span className="hj-hero-shade" aria-hidden />
        <div className="hj-hero-inner">
          <div className="hj-hero-copy">
            <p className="hj-hero-lead">{L('香港住宅放租、租務管理同買賣', 'Hong Kong residential letting, management and sales')}</p>
            <h1 id="home-title"><span>{L('放租交俾我哋，', 'Leave the letting to us.')}</span> <span>{L('你淨係收租就得。', 'You just collect the rent.')}</span></h1>
            <p className="hj-hero-sub">{L('搵租客、收租、維修、同租客溝通，我哋本地團隊幫你一手包辦。粵語、普通話、English 都講得。', 'Finding tenants, rent, repairs and tenant contact, handled by a local team in Cantonese, Mandarin or English.')}</p>
            <div className="hj-hero-actions">
              <button type="button" className="btn btn-primary" onClick={() => enquire({ service: 'letting' })}>{L('免費傾吓', 'Free enquiry')}</button>
              <Link className="btn btn-line" to="/viewings">{L('睇吓盤', 'See listings')}</Link>
            </div>
          </div>
          <p className="hj-sign" aria-hidden lang="zh-HK">悦港<small>{L('放租 · 買賣', 'LETTING · SALES')}</small></p>
        </div>
        <div className="hj-hero-foot">
          <div className="hj-regions" role="group" aria-label={L('揀地區', 'Choose a district')}>
            {HERO_PHOTOS.map((p, i) => <button key={p.city} type="button" aria-pressed={i === scene} onClick={() => { setScene(i); setPaused(true); }}>{p.city === 'Harbour' ? L('維港', 'Victoria Harbour') : cityName(p.city, lang)}</button>)}
          </div>
          <Link className="hj-offer" to="/offer"><strong>{L('業主免佣', 'No owner commission')}</strong><span>{L('首個單位 · 送交吉清潔 · 至 2027年2月', 'First flat · free pre-letting clean · until Feb 2027')}</span><ArrowUpRight size={16} aria-hidden /></Link>
        </div>
      </section>

      {/* --------------------------------------------------------- promises */}
      <section className="v-promises" aria-label={L('我哋嘅承諾', 'Our promise')}>
        <ul className="wrap">
          {promises.map(({ Icon, t, d }) => (
            <li key={t}>
              <Icon size={22} aria-hidden />
              <span>
                <strong>{t}</strong>
                <small>{d}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* -------------------------------------------------------- businesses */}
      <section className="v-sec" id="what-we-do" aria-labelledby="home-biz-title">
        <div className="wrap">
          <SectionHead kicker={L('我哋做咩', 'What we do')} title={L('一個團隊，幫你搞掂層樓三件事', 'One team for three things your flat needs')} id="home-biz-title" />
          <div className="v-bento">
            <Reveal as="article" className="v-tile v-tile-ink v-tile-letting">
              <span id="services" className="v-anchor" />
              <p className="v-kicker">{L('主力 · 放租同租務管理', 'Main service · Letting & management')}</p>
              <h3>{L('幫你租得好，之後都繼續睇住', 'Your flat let well, and looked after')}</h3>
              <p>{L('淨放租：我哋幫你搵啱租客、搞掂交收。租務管理：之後收租、維修、續約都可以交俾我哋。', 'Letting only: we find the tenant and handle handover. Management: rent, repairs and renewals after that too.')}</p>
              <table className="v-compare">
                <caption className="sr-only">{L('淨放租同租務管理比較', 'Letting only vs management')}</caption>
                <thead>
                  <tr>
                    <th scope="col"><span className="sr-only">{L('服務內容', 'Service')}</span></th>
                    <th scope="col">{L('淨放租', 'Letting')}</th>
                    <th scope="col">{L('租務管理', 'Managed')}</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.map(([label, inLetting]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{inLetting ? <><Check size={17} aria-hidden /><span className="sr-only">{L('包含', 'Included')}</span></> : <><Minus size={15} aria-hidden /><span className="v-own">{L('自理', 'You')}</span></>}</td>
                      <td><Check size={17} aria-hidden /><span className="sr-only">{L('包含', 'Included')}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td><Link className="v-link v-link-light" to="/services">{L('睇晒全部服務', 'Full details')}<ArrowUpRight size={15} aria-hidden /></Link></td>
                    <td><button type="button" className="btn btn-line rp-letting-cta" onClick={() => enquire({ service: 'letting' })}>{L('問吓', 'Enquire')}</button></td>
                    <td><button type="button" className="btn btn-primary rp-management-cta" onClick={() => enquire({ service: 'management' })}>{L('問吓', 'Enquire')}</button></td>
                  </tr>
                </tfoot>
              </table>
            </Reveal>

            <Reveal as="article" className="v-tile v-tile-sand v-tile-sales" delay={80}>
              <span id="buy-sell-home" className="v-anchor" />
              <p className="v-kicker">{L('買樓賣樓', 'Buying & selling')}</p>
              <p className="v-big"><span>HK$0</span><small>{L('未簽約，一蚊都唔收', 'nothing to pay before you sign')}</small></p>
              <h3>{L('想買定想賣？先同我哋傾吓你嘅計劃', 'Selling or buying? Start with your plans')}</h3>
              <ul className="v-ticks">
                <li><Check size={16} aria-hidden />{L('免費俾你市價參考', 'Free market price guidance')}</li>
                <li><Check size={16} aria-hidden />{L('佣金喺表格 3／表格 5 寫得清清楚楚', 'Commission set out in Form 3 / Form 5')}</li>
                <li><Check size={16} aria-hidden />{L('物業資料表格、查冊，我哋幫你準備', 'Property information forms and land searches')}</li>
              </ul>
              <div className="v-actions">
                <Link className="btn btn-primary sales-selling-cta" to="/selling-registration">{L('登記放售', 'Register selling needs')}</Link>
                <Link className="btn btn-line sales-buying-cta" to="/buying-registration">{L('登記買樓', 'Register buying needs')}</Link>
              </div>
              <Link className="v-link" to="/buy-sell">{L('了解買賣服務', 'More on buying & selling')}<ArrowUpRight size={15} aria-hidden /></Link>
            </Reveal>

            <Reveal as="article" className="v-tile v-tile-paper v-tile-advisory" delay={120}>
              <span id="advisory-home" className="v-anchor" />
              <figure className="v-tile-photo">
                <SmartImg src="/img/renovation/2.webp" alt={L('光猛嘅廚房（示意）', 'A bright kitchen (illustrative)')} position="50% 55%" />
                <figcaption>{L('示意', 'Illustrative')}</figcaption>
              </figure>
              <div className="v-tile-body">
                <p className="v-kicker">{L('置業顧問 · 裝修翻新', 'Property services · Renovation')}</p>
                <h3>{L('想裝修？我哋免費上門睇先', 'Renovation, starting with a free on-site assessment')}</h3>
                <p>{L('放租前執靚、局部改動、換廚房廁所。我哋先睇、再逐項報價，你點頭先開工。', 'Pre-letting refreshes, makeovers, kitchens and bathrooms. Assessed first, quoted per project, started once you approve.')}</p>
                <div className="v-actions">
                  <Link className="btn btn-primary advisory-home-cta" to="/advisory-registration?service=renovation">{L('登記裝修', 'Register renovation needs')}<ArrowRight size={18} aria-hidden /></Link>
                  <Link className="v-link" to="/advisory">{L('了解置業顧問', 'More on property services')}<ArrowUpRight size={15} aria-hidden /></Link>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="v-extras">
            <h3>{L('仲可以幫你做', 'What else we can do')}</h3>
            <ul>
              {extras.map(({ to, Icon, t, d }) => (
                <li key={to}>
                  <Link to={to}>
                    <Icon size={20} aria-hidden />
                    <span>
                      <strong>{t}</strong>
                      <small>{d}</small>
                    </span>
                    <ArrowUpRight size={16} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- regions */}
      <section className="v-sec v-sec-sage" aria-labelledby="home-cities-title">
        <div className="wrap">
          <SectionHead kicker={L('服務地區', 'Where we work')} title={L('港九新界，我哋都喺你層樓附近', 'Across Hong Kong, near your flat')} id="home-cities-title" lead={L('港島、九龍、新界、離島，撳一下就可以搵我哋。', 'Homes on Hong Kong Island, in Kowloon, the New Territories and the Islands are all welcome.')} />
          <ul className="v-cities v-regions">
            {REGION_PHOTOS.map(({ city, img, pos }) => (
              <li key={city}>
                <button type="button" onClick={() => enquire({ city, service: 'letting' })} aria-label={L(`問吓${cityName(city, lang)}嘅單位`, `Ask about a flat in ${city}`)}>
                  <SmartImg src={img} alt="" position={pos} />
                  <span><MapPin size={15} aria-hidden />{cityName(city, lang)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------------- FAQ */}
      <section className="v-sec" aria-labelledby="home-faq-title">
        <div className="wrap">
          <SectionHead kicker={L('常見問題', 'FAQ')} title={L('業主最常問我哋嘅問題', 'Things owners ask first')} id="home-faq-title" more={{ to: '/services#rental-faq', label: L('仲有其他問題', 'More questions') }} />
          <QAGrid items={faq} />
        </div>
      </section>

      {/* ------------------------------------------------------------- trust */}
      <section className="v-sec v-sec-tight" aria-labelledby="home-about-title">
        <div className="wrap">
          <Reveal className="v-team v-trust">
            <div className="v-team-copy">
              <p className="v-kicker">{L('關於悦港', 'About Harbour Joy')}</p>
              <h2 id="home-about-title">{L('熟悉香港，認真對待每一層樓', 'Local knowledge, careful follow-through')}</h2>
              <p>{L('悦港專做香港住宅放租同租務管理，亦都做買賣同裝修維修。由約人睇樓、核對租客資料、交收，到搵師傅維修，我哋都會親自跟，再用粵語、普通話或者英文即時話你知進度。', 'Harbour Joy focuses on Hong Kong residential letting and management, and also handles sales, renovation and repairs. We organise viewings, check tenant details, handle handovers and coordinate repairs, keeping you updated in Cantonese, Mandarin or English.')}</p>
              <Link className="v-link" to="/about">{L('認識悦港', 'About us')}<ArrowRight size={16} aria-hidden /></Link>
            </div>
            <ul className="v-trust-list">
              {trust.map(({ Icon, t, d }) => (
                <li key={t}><Icon size={22} aria-hidden /><span><strong>{t}</strong><small>{d}</small></span></li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <CtaBand title={L('不如傾吓你層樓？', 'Let’s talk about your flat')} text={L('話我哋知層樓喺邊、想我哋幫咩手，同事好快會搵你。', 'Tell us where the flat is and what you need — a colleague will be in touch.')} />
    </div>
  );
}
