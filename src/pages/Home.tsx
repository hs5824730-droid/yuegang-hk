import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BadgeCheck, Building2, Check, FileText, Hammer, House, KeyRound, Languages, MapPin, Minus, Search, Wrench } from 'lucide-react';
import { useEnquiry } from '../components/Enquiry';
import { Reveal } from '../components/ui';
import HkMap from '../components/HkMap';
import { useI18n } from '../i18n';

type Plan = 'letting' | 'management';

export default function Home() {
  const { L } = useI18n();
  const enquire = useEnquiry();
  const [plan, setPlan] = useState<Plan>('management');
  const [openCard, setOpenCard] = useState(0);

  const facts = [
    { Icon: BadgeCheck, t: L('持牌地產代理', 'Licensed estate agent'), d: L('依《地產代理條例》經營', 'Under the Estate Agents Ordinance') },
    { Icon: Languages, t: L('粵語 · 普通話 · English', 'Cantonese · Mandarin · English'), d: L('用你習慣嘅語言溝通', 'In the language you prefer') },
    { Icon: MapPin, t: L('十八區都有做', 'All 18 districts'), d: L('按地址安排就近同事', 'A colleague near your flat') },
  ];

  const cards = [
    {
      Icon: KeyRound, contact: 'management', anchor: 'services', kicker: L('放租及租務管理', 'Letting & management'),
      t: L('租得好，之後都有人睇住', 'Let well, and looked after'),
      d: L('物色合適租客、處理租約交收；揀租務管理，收租、維修、續約都交俾我哋。', 'We find the tenant and handle the tenancy; with management, rent, repairs and renewals too.'),
      steps: [L('上門睇樓、定租金', 'Visit and set the rent'), L('放盤宣傳、約人睇樓', 'Marketing and viewings'), L('揀租客、簽租約、交收', 'Tenant, tenancy, handover'), L('收租、維修、續約', 'Rent, repairs, renewals')],
      cta: <button type="button" className="btn btn-primary rp-management-cta" onClick={() => enquire({ service: 'management' })}>{L('查詢放租', 'Enquire')}<ArrowRight size={17} aria-hidden /></button>,
      more: '/services',
    },
    {
      Icon: Building2, contact: 'selling', anchor: 'buy-sell-home', kicker: L('買賣物業', 'Buying & selling'),
      t: L('買定賣，先從你嘅計劃講起', 'Start with your plans'),
      d: L('免費市價參考、查冊及物業資料表格；佣金喺表格 3／表格 5 寫明，未簽約不收分文。', 'Free price guidance, land searches and property forms; fees in Form 3 / Form 5, nothing before you sign.'),
      steps: [L('傾清楚預算同時間', 'Budget and timing'), L('免費市價參考', 'Free price guidance'), L('查冊、物業資料表格', 'Land search and property forms'), L('議價、簽約、成交', 'Negotiation to completion')],
      cta: <><Link className="btn btn-primary sales-selling-cta" to="/selling-registration">{L('登記放售', 'Sell')}</Link><Link className="btn btn-line sales-buying-cta" to="/buying-registration">{L('登記買樓', 'Buy')}</Link></>,
      more: '/buy-sell',
    },
    {
      Icon: Hammer, contact: 'renovation', anchor: 'advisory-home', kicker: L('翻新及置業顧問', 'Renovation & advisory'),
      t: L('先上門睇，再逐項報價', 'Seen first, then quoted item by item'),
      d: L('放租前翻新、換廚房浴室，以至置業預算、按揭及印花稅，你點頭先開工。', 'Refreshes, kitchens and bathrooms, plus budgets, mortgages and stamp duty. Work starts once you approve.'),
      steps: [L('免費上門評估', 'Free on-site assessment'), L('逐項報價', 'Itemised quote'), L('你確認先開工', 'Starts once you approve'), L('對照清單驗收', 'Signed off against the list')],
      cta: <Link className="btn btn-primary advisory-home-cta" to="/advisory-registration?service=renovation">{L('登記翻新', 'Register')}<ArrowRight size={17} aria-hidden /></Link>,
      more: '/advisory',
    },
  ];

  const extras = [
    { to: '/home-services', Icon: House, t: L('房屋服務', 'Home services'), d: L('清潔、睇屋、吉屋巡查', 'Cleaning, sitting, vacant-flat checks') },
    { to: '/?service=maintenance', Icon: Wrench, t: L('維修保養', 'Repairs'), d: L('報維修、定期檢查', 'Requests and checks') },
    { to: '/viewings', Icon: FileText, t: L('網上睇樓', 'Listings'), d: L('租盤、售盤、成交紀錄', 'To let, for sale, sold') },
    { to: '/?service=buyer-advisory', Icon: Search, t: L('置業查詢', 'Buying advice'), d: L('預算、按揭、印花稅', 'Budget, mortgage, stamp duty') },
  ];

  const compare: [string, boolean][] = [
    [L('放盤宣傳、約人睇樓', 'Marketing and viewings'), true],
    [L('揀租客、簽租約、交吉交收', 'Tenant selection, tenancy, handover'), true],
    [L('收租、同租客傾偈', 'Rent and tenant contact'), false],
    [L('維修、驗樓、續約', 'Repairs, inspections, renewals'), false],
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
      {/* ------------------------------------------------- opening: the map */}
      <section className="hx-app" aria-labelledby="home-title">
        <div className="hx-wrap">
          <div className="hx-app-head">
            <div>
              <p className="hx-eyebrow">{L('香港住宅 · 放租 · 管理 · 買賣', 'Hong Kong residential · Letting · Management · Sales')}</p>
              <h1 id="home-title">{L('你嘅物業喺邊區？', 'Where is your property?')}</h1>
              <p className="hx-lead">{L('揀服務、撳地區，即刻睇到嗰區嘅盤源同服務，一鍵預約悦港顧問。', 'Pick a service and a district to see listings and services there, then book a Harbour Joy adviser in one tap.')}</p>
            </div>
            <Link className="hx-offer-chip" to="/offer"><strong>{L('業主首個單位免佣', 'No owner commission, first flat')}</strong><span>{L('另送交吉清潔 · 至 2027年2月', 'Free pre-letting clean · until Feb 2027')}</span><ArrowUpRight size={16} aria-hidden /></Link>
          </div>
          <HkMap />
          <ul className="hx-facts">
            {facts.map(({ Icon, t, d }) => <li key={t}><Icon size={20} aria-hidden /><span><strong>{t}</strong><small>{d}</small></span></li>)}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------- services */}
      <section className="hx-sec hx-sec-band" id="what-we-do" aria-labelledby="home-biz-title">
        <div className="hx-wrap">
          <header className="hx-head">
            <div>
              <p className="hx-eyebrow">{L('核心服務', 'What we do')}</p>
              <h2 id="home-biz-title">{L('一個團隊，打理物業嘅每一步', 'One team for every stage of your property')}</h2>
            </div>
            <Link className="hx-more" to="/services">{L('全部服務', 'All services')}<ArrowUpRight size={16} aria-hidden /></Link>
          </header>

          <div className="hx-cards">
            {cards.map((c, i) => (
              <Reveal as="article" key={c.anchor} className={`hx-panel hx-card ${openCard === i ? 'is-open' : ''}`} contact={c.contact} delay={i * 80}>
                <span id={c.anchor} className="v-anchor" />
                <button type="button" className="hx-card-top" aria-expanded={openCard === i} onClick={() => setOpenCard(i)} onMouseEnter={() => setOpenCard(i)}>
                  <span className="hx-card-icon"><c.Icon size={22} aria-hidden /></span>
                  <span className="hx-card-no">0{i + 1}</span>
                </button>
                <div className="hx-card-body">
                  <p className="hx-eyebrow">{c.kicker}</p>
                  <h3>{c.t}</h3>
                  <p>{c.d}</p>
                  <ol className="hx-steps">{c.steps.map((s, n) => <li key={s} style={{ transitionDelay: `${n * 60}ms` }}><span>{n + 1}</span>{s}</li>)}</ol>
                  <div className="hx-card-links">
                    {c.cta}
                    <Link className="hx-more" to={c.more}>{L('了解更多', 'Learn more')}<ArrowUpRight size={15} aria-hidden /></Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <ul className="hx-extras">
            {extras.map(({ to, Icon, t, d }) => (
              <li key={to}><Link className="hx-panel" to={to}><Icon size={20} aria-hidden /><span><strong>{t}</strong><small>{d}</small></span><ArrowUpRight size={16} aria-hidden /></Link></li>
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------- letting vs managing */}
      <section className="hx-sec" aria-labelledby="home-plan-title" data-contact={plan}>
        <div className="hx-wrap hx-split">
          <div className="hx-split-copy">
            <p className="hx-eyebrow">{L('揀適合你嘅方式', 'Choose your level of service')}</p>
            <h2 id="home-plan-title">{L('淨放租，定係連管理一齊交俾我哋？', 'Letting only, or management as well?')}</h2>
            <p>{L('兩種方式都包放盤宣傳、揀租客同交收。撳一下右邊，即刻睇到兩者分別。', 'Both include marketing, tenant selection and handover. Switch on the right to see the difference.')}</p>
            <div className="hx-toggle" role="radiogroup" aria-label={L('揀方式', 'Choose a plan')} data-on={plan}>
              <span aria-hidden />
              <button type="button" role="radio" aria-checked={plan === 'letting'} onClick={() => setPlan('letting')}>{L('淨放租', 'Letting only')}</button>
              <button type="button" role="radio" aria-checked={plan === 'management'} onClick={() => setPlan('management')}>{L('租務管理', 'Management')}</button>
            </div>
          </div>
          <div className="hx-panel hx-plan">
            <ul>
              {compare.map(([label, inLetting]) => {
                const on = plan === 'management' || inLetting;
                return (
                  <li key={label} className={on ? 'is-on' : ''}>
                    <span className="hx-plan-mark">{on ? <Check size={16} aria-hidden /> : <Minus size={14} aria-hidden />}</span>
                    <span>{label}</span>
                    <small>{on ? L('我哋負責', 'We handle it') : L('業主自理', 'You handle it')}</small>
                  </li>
                );
              })}
            </ul>
            <button type="button" className={`btn btn-primary ${plan === 'letting' ? 'rp-letting-cta' : ''}`} onClick={() => enquire({ service: plan })}>{plan === 'letting' ? L('查詢淨放租', 'Enquire about letting') : L('查詢租務管理', 'Enquire about management')}<ArrowRight size={17} aria-hidden /></button>
          </div>
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
          <div className="hx-closing-panel">
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
