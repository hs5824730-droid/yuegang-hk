import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Hammer, HeartHandshake, House, Languages, MapPin, Minus, Search, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { CtaBand } from '../components/sections';
import { useEnquiry } from '../components/Enquiry';
import { MEMBERS } from '../components/Team';
import { Reveal, SmartImg } from '../components/ui';
import { OfferReceipt, QAGrid, SectionHead } from '../components/v2/blocks';
import { cityName, useI18n } from '../i18n';

/** Wikimedia city photographs with recorded authors and licences (see /credits). */
const CITY_PHOTOS = [
  { city: 'Melbourne', img: '/img/melbourne.jpg', pos: '50% 55%' },
  { city: 'Perth', img: '/img/perth.jpg', pos: '50% 60%' },
  { city: 'Adelaide', img: '/img/adelaide.jpg', pos: '50% 55%' },
  { city: 'Canberra', img: '/img/canberra.jpg', pos: '50% 50%' },
  { city: 'Sydney', img: '/img/sydney.jpg', pos: '35% 50%' },
];

export default function Home() {
  const { L, lang } = useI18n();
  const enquire = useEnquiry();

  const promises = [
    { Icon: ShieldCheck, t: L('交给我们，省心安心', 'Hand it over and relax'), d: L('看房、签约、报修、续租，当地团队跟进。', 'Viewings, leases, repairs, renewals — followed up locally.') },
    { Icon: Sparkles, t: L('减价不减服务', 'Lower fees, same service'), d: L('优惠只减佣金，推广、筛选、维护一项不少。', 'Only the fee is lower; marketing, screening and upkeep stay.') },
    { Icon: HeartHandshake, t: L('一次合作，终生合作', 'One appointment, a lasting relationship'), d: L('出租、买卖、装修维修，以后也找我们。', 'Letting, sales, renovation — whatever comes next.') },
  ];

  const compare: [string, boolean][] = [
    [L('出租准备、推广看房', 'Preparation, marketing, viewings'), true],
    [L('筛选租客、签约入住', 'Tenant selection, lease, move-in'), true],
    [L('收租与租客联络', 'Rent and tenant contact'), false],
    [L('维修、巡检与续租', 'Repairs, inspections, renewals'), false],
  ];

  const extras = [
    { to: '/home-services', Icon: House, t: L('房屋服务', 'Home services'), d: L('园艺、清洁、居家照看，人工半价', 'Garden, cleaning, home sitting; half-price labour') },
    { to: '/?service=maintenance', Icon: Wrench, t: L('维修维护', 'Repairs'), d: L('报修跟进、小修、定期检查', 'Requests, small fixes, checks') },
    { to: '/advisory#renovation', Icon: Hammer, t: L('装修翻新', 'Renovation'), d: L('出租前焕新、厨卫更新', 'Refreshes, kitchens, bathrooms') },
    { to: '/?service=buyer-advisory', Icon: Search, t: L('购房咨询', 'Buying advice'), d: L('城市、区域与预算梳理', 'City, area and budget') },
  ];

  const faq: [string, string][] = [
    [L('费用怎么收？', 'How are fees charged?'), L('出租佣金和管理费分开计算，委托前书面说明，确认后再开始。', 'Letting commission and management fees are separate, set out in writing before you appoint us.')],
    [L('人不在澳洲，可以委托吗？', 'Can I appoint you from overseas?'), L('可以。看房、交接、巡检由当地团队处理，进展通过电话或 WhatsApp 告诉您。', 'Yes. Viewings, handovers and inspections are handled locally; we update you by phone or WhatsApp.')],
    [L('可以只招租、不托管吗？', 'Can I choose letting only?'), L('可以。租客入住后由您自己管理，之后想改为托管也可以再沟通。', 'Yes. You manage the tenancy after move-in, and can switch to management later.')],
    [L('其他城市也能服务吗？', 'Do you cover other cities?'), L('重点在六座城市，但不限于此；其他城市的房子也欢迎咨询。', 'We focus on six cities but are not limited to them; ask us about other areas.')],
  ];

  return (
    <div className="v-home">
      {/* ---------------------------------------------------------- opening */}
      <section className="v-hero v-home-hero has-bg" aria-labelledby="home-title">
        <img className="v-hero-bg" src="/img/renovation/1.webp" alt="" style={{ objectPosition: '60% 55%' }} fetchPriority="high" />
        <span className="v-hero-shade" aria-hidden />
        <div className="wrap v-hero-grid">
          <div className="v-hero-copy">
            <p className="v-pill"><Languages size={15} aria-hidden />{L('澳洲房产出租与托管 · 中文 / English', 'Australian letting & management · 中文 / English')}</p>
            <h1 id="home-title">
              {L('出租交给我们，', 'Leave the letting to us.')}
              <em>{L('您只管收租。', 'You just collect the rent.')}</em>
            </h1>
            <p className="v-lead">{L('找租客、收租、维修、和租客沟通，当地团队一路跟进。', 'Finding tenants, rent, repairs and tenant contact — followed up by a local team.')}</p>
            <div className="v-actions">
              <button type="button" className="btn btn-primary v-hero-cta" onClick={() => enquire({ service: 'letting' })}>
                {L('免费咨询', 'Free enquiry')}
                <ArrowRight size={18} aria-hidden />
              </button>
              <Link className="btn btn-line" to="/services">{L('看看怎么收费', 'See how it works')}</Link>
            </div>
          </div>
          <div className="v-hero-aside">
            <OfferReceipt
              className="v-hero-receipt"
              cta={<>
                <Link className="btn btn-primary ds-offer-cta" to="/?service=rent&offer=1">{L('咨询这项优惠', 'Ask about the offer')}</Link>
                <Link className="v-link" to="/offer">{L('优惠说明', 'Offer details')}<ArrowUpRight size={15} aria-hidden /></Link>
              </>}
            />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- promises */}
      <section className="v-promises" aria-label={L('我们的承诺', 'Our promise')}>
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
          <SectionHead kicker={L('我们做什么', 'What we do')} title={L('一个团队，照看房子的三件事', 'One team for three things your property needs')} id="home-biz-title" />
          <div className="v-bento">
            <Reveal as="article" className="v-tile v-tile-ink v-tile-letting">
              <span id="services" className="v-anchor" />
              <p className="v-kicker">{L('主营 · 出租与托管', 'Main service · Letting & management')}</p>
              <h3>{L('帮您把房子租好，也一直照看好', 'Your home let well, and looked after')}</h3>
              <p>{L('仅招租：找到合适租客并完成入住。长期托管：之后的收租、报修、续租也交给我们。', 'Letting only: we find the tenant and handle move-in. Management: rent, repairs and renewals after that too.')}</p>
              <table className="v-compare">
                <caption className="sr-only">{L('仅招租和长期托管对照', 'Letting only vs management')}</caption>
                <thead>
                  <tr>
                    <th scope="col"><span className="sr-only">{L('服务内容', 'Service')}</span></th>
                    <th scope="col">{L('仅招租', 'Letting')}</th>
                    <th scope="col">{L('长期托管', 'Managed')}</th>
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
                    <td><Link className="v-link v-link-light" to="/services">{L('完整服务', 'Full details')}<ArrowUpRight size={15} aria-hidden /></Link></td>
                    <td><button type="button" className="btn btn-line rp-letting-cta" onClick={() => enquire({ service: 'letting' })}>{L('咨询', 'Enquire')}</button></td>
                    <td><button type="button" className="btn btn-primary rp-management-cta" onClick={() => enquire({ service: 'management' })}>{L('咨询', 'Enquire')}</button></td>
                  </tr>
                </tfoot>
              </table>
            </Reveal>

            <Reveal as="article" className="v-tile v-tile-sand v-tile-sales" delay={80}>
              <span id="buy-sell-home" className="v-anchor" />
              <p className="v-kicker">{L('买卖房屋', 'Buying & selling')}</p>
              <p className="v-big"><span>30%</span><small>{L('佣金比同行低', 'lower commission than competitors')}</small></p>
              <h3>{L('想卖房或买房，先聊清您的打算', 'Selling or buying? Start with your plans')}</h3>
              <ul className="v-ticks">
                <li><Check size={16} aria-hidden />{L('佣金比同行低30%', 'Commission 30% lower than competitors')}</li>
                <li><Check size={16} aria-hidden />{L('免费咨询', 'Free consultation')}</li>
                <li><Check size={16} aria-hidden />{L('买卖前期不收取服务费', 'No upfront service fee')}</li>
              </ul>
              <div className="v-actions">
                <Link className="btn btn-primary sales-selling-cta" to="/selling-registration">{L('登记卖房需求', 'Register selling needs')}</Link>
                <Link className="btn btn-line sales-buying-cta" to="/buying-registration">{L('登记购房需求', 'Register buying needs')}</Link>
              </div>
              <Link className="v-link" to="/buy-sell">{L('了解买卖服务', 'More on buying & selling')}<ArrowUpRight size={15} aria-hidden /></Link>
            </Reveal>

            <Reveal as="article" className="v-tile v-tile-paper v-tile-advisory" delay={120}>
              <span id="advisory-home" className="v-anchor" />
              <figure className="v-tile-photo">
                <SmartImg src="/img/renovation/2.webp" alt={L('明亮的厨房（示意）', 'A bright kitchen (illustrative)')} position="50% 55%" />
                <figcaption>{L('示意', 'Illustrative')}</figcaption>
              </figure>
              <div className="v-tile-body">
                <p className="v-kicker">{L('置业顾问 · 房屋装修', 'Property services · Renovation')}</p>
                <h3>{L('装修翻新，从免费上门评估开始', 'Renovation, starting with a free on-site assessment')}</h3>
                <p>{L('出租前焕新、局部改造、厨卫更新。先评估、再按项目报价，确认方案后才开工。', 'Pre-letting refreshes, makeovers, kitchens and bathrooms. Assessed first, quoted per project, started once you approve.')}</p>
                <div className="v-actions">
                  <Link className="btn btn-primary advisory-home-cta" to="/advisory-registration?service=renovation">{L('登记装修需求', 'Register renovation needs')}<ArrowRight size={18} aria-hidden /></Link>
                  <Link className="v-link" to="/advisory">{L('了解置业顾问', 'More on property services')}<ArrowUpRight size={15} aria-hidden /></Link>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="v-extras">
            <h3>{L('我们还能做什么', 'What else we can do')}</h3>
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

      {/* ------------------------------------------------------------ cities */}
      <section className="v-sec v-sec-sage" aria-labelledby="home-cities-title">
        <div className="wrap">
          <SectionHead kicker={L('服务城市', 'Where we work')} title={L('当地团队，就在您的房子附近', 'A local team near your property')} id="home-cities-title" lead={L('重点服务六座城市，其他城市也欢迎咨询。', 'Six focus cities; other areas are welcome too.')} />
          <ul className="v-cities">
            {CITY_PHOTOS.map(({ city, img, pos }) => (
              <li key={city}>
                <button type="button" onClick={() => enquire({ city, service: 'letting' })} aria-label={L(`咨询${cityName(city, lang)}的房子`, `Ask about a property in ${city}`)}>
                  <SmartImg src={img} alt="" position={pos} />
                  <span><MapPin size={15} aria-hidden />{cityName(city, lang)}</span>
                </button>
              </li>
            ))}
            {['Brisbane'].map((city) => (
              <li key={city} className="v-city-text">
                <button type="button" onClick={() => enquire({ city, service: 'letting' })}>
                  <span><MapPin size={15} aria-hidden />{cityName(city, lang)}</span>
                  <small>{L('咨询这座城市', 'Ask about this city')}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------------- FAQ */}
      <section className="v-sec" aria-labelledby="home-faq-title">
        <div className="wrap">
          <SectionHead kicker={L('常见问题', 'FAQ')} title={L('您可能想先知道', 'Things owners ask first')} id="home-faq-title" more={{ to: '/services#rental-faq', label: L('更多问题', 'More questions') }} />
          <QAGrid items={faq} />
        </div>
      </section>

      {/* -------------------------------------------------------------- team */}
      <section className="v-sec v-sec-tight" aria-labelledby="home-about-title">
        <div className="wrap">
          <Reveal className="v-team">
            <div className="v-team-copy">
              <p className="v-kicker">{L('专业团队', 'Our team')}</p>
              <h2 id="home-about-title">{L('熟悉当地，认真做好每份托付', 'Local knowledge, careful follow-through')}</h2>
              <p>{L('桉湾 EUCOVE 专注澳洲房产出租与长期托管，也做买卖和装修维修。团队成员在墨尔本、悉尼、珀斯、布里斯班等城市跟进当地租务：组织看房、核对申请、办理入住、协调维修，并用中文或英文及时告诉您进展。', 'EUCOVE focuses on Australian letting and management, and also handles sales, renovation and repairs. Team members in Melbourne, Sydney, Perth, Brisbane and other cities look after viewings, applications, move-ins and repairs, keeping you updated in Chinese or English.')}</p>
              <Link className="v-link" to="/about">{L('认识团队', 'Meet the team')}<ArrowRight size={16} aria-hidden /></Link>
            </div>
            <ul className="v-team-faces" aria-label={L('团队成员', 'Team members')}>
              {MEMBERS.map((m) => (
                <li key={m.id}>
                  <SmartImg src={`/team/${m.id}.webp`} alt={L(m.zh, m.en)} position="50% 18%" />
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <CtaBand title={L('聊聊您的房子吧', 'Let’s talk about your property')} text={L('告诉我们房子在哪、想要什么帮助，助理会联系您。', 'Tell us where the property is and what you need — an assistant will be in touch.')} />
    </div>
  );
}
