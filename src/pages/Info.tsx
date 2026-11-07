import Team from '../components/Team';
import {siteHomeHref} from '../site-home';
import { CompanyIntroduction, RentalCampaign } from '../components/ServiceContent';
import RentalServices, { OfferSection } from '../components/RentalServices';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, KeyRound, Languages, MessageCircle, ShieldCheck } from 'lucide-react';
import { useEnquiry } from '../components/Enquiry';
import LeadForm, { isPublicService } from '../components/LeadForm';
import { PageHead } from '../components/parts';
import { CtaBand, Faq } from '../components/sections';
import { IconBadge, Reveal, SmartImg } from '../components/ui';
import { DrawIcon, SplitHero } from '../components/ds';
import { cityName, formatMonth, useConfig, useI18n } from '../i18n';

/* ================================================================ services */
export function Services() {
  return <RentalServices />;
}
export function Offer() {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const enquire = useEnquiry();
  const end = formatMonth(config.promotion.endMonth, lang);
  return <>
    <div className="ds">
      <SplitHero
        img="/img/hero-house.jpg"
        alt={L('桉树下的现代住宅与庭院', 'A modern home and garden under a gum tree')}
        pos="50% 60%"
        figure={{ value: 'A$0', label: L('首套房的出租佣金', 'Letting commission on your first property') }}
        kicker={L(`房东限时优惠 · 至 ${end}`, `Owner offer · until ${end}`)}
        title={L('首套免出租佣金，第二套半价', 'First property free of letting commission, second at half')}
        lead={L('同一位房东按委托出租顺序计算，出租还配套免费搬家。', 'Counted in order for one owner, with free moving included with letting.')}
      >
        <div className="ds-actions">
          <button type="button" className="btn btn-primary rp-offer-cta" onClick={() => enquire({ service: 'letting', offer: true })}>{L('咨询这项优惠', 'Ask about the offer')}<ArrowRight size={18} aria-hidden /></button>
          <Link className="btn btn-line" to="/services">{L('了解出租与托管', 'Letting & management')}</Link>
        </div>
      </SplitHero>
      <OfferSection />
    </div>
    <section className="section"><div className="wrap"><Faq limit={4} /></div></section>
    <CtaBand />
  </>;
}

/* ================================================================= contact */
export function Contact() {
  const { L } = useI18n();
  const [sp] = useSearchParams();
  const s = sp.get('service');
  const service = isPublicService(s) ? s : 'letting';
  return (
    <>
      <PageHead title={L('留下你的联系方式', 'Leave your contact details')} lead={L('三步完成：选择服务、告诉我们房子在哪、留下联系方式。', 'Three short steps: choose a service, tell us where the property is, and leave your details.')} />
      <section className="section section-tight">
        <div className="wrap contact-grid">
          <div className="card-pad">
            <LeadForm idPrefix="contact" defaultService={service} defaultCity={sp.get('city') || ''} propertyId={sp.get('propertyId') || undefined} propertyAddress={sp.get('address') || undefined} />
          </div>
          <aside className="contact-side">
            <div className="card-pad">
              <h2>{L('发送之后', 'After you send it')}</h2>
              <ul className="icon-list compact">
                <li>
                  <IconBadge>
                    <Languages />
                  </IconBadge>
                  <div>
                    <strong>{L('用您选择的语言联系', 'Contact in your language')}</strong>
                    <span>{L('中文或英文，由专属助理跟进。', 'Chinese or English, through a dedicated assistant.')}</span>
                  </div>
                </li>
                <li>
                  <IconBadge>
                    <Eye />
                  </IconBadge>
                  <div>
                    <strong>{L('资料仅团队可见', 'Only our team can see it')}</strong>
                    <span>{L('联系方式只对负责的同事开放。', 'Your contact details are visible only to the colleagues handling it.')}</span>
                  </div>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

/* =================================================================== about */
export function About() {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const enquire = useEnquiry();
  const values = [
    { Icon: MessageCircle, t: L('清楚沟通', 'Clarity'), d: L('范围、费用与进度，用您听得懂的方式说明。', 'Scope, fees and progress, explained in language that works for you.') },
    { Icon: ShieldCheck, t: L('认真跟进', 'Care'), d: L('从看房到维修，把事情的进展跟进到位。', 'From a viewing to a repair, we follow the work through.') },
    { Icon: KeyRound, t: L('尊重托付', 'Respect'), d: L('重要决定与房东商量，按照约定范围处理。', 'Owners are involved in important decisions; we work within the agreed scope.') },
  ];
  return <>
    <div className="ds">
      <SplitHero
        img="/img/interior.jpg"
        alt={L('明亮的住宅客厅', 'A bright living room')}
        pos="50% 60%"
        labels={[{ k: L('重点城市', 'Focus cities'), v: config.cities.map((c) => cityName(c, lang)).join(' · ') }]}
        figure={{ value: String(config.cities.length), label: L('座重点服务城市，其他城市也欢迎咨询', 'focus cities; other areas are welcome') }}
        kicker={L('关于桉湾', 'About EUCOVE')}
        title={L('让每一次托付，都有人跟进', 'Every property, followed through')}
        lead={L('桉湾 EUCOVE 专注澳洲房产出租与长期托管，也提供买卖和在线看房咨询。团队熟悉当地租务，中文、英文都能沟通。', 'EUCOVE focuses on Australian letting and ongoing management, alongside buying, selling and online viewings. Our team knows local tenancies and works in Chinese or English.')}
      >
        <ul className="ds-split-rows">
          <li><span>{L('现场', 'On site')}</span><strong>{L('看房、交接、巡检由当地团队处理', 'Viewings, handovers, inspections by the local team')}</strong></li>
          <li><span>{L('沟通', 'Contact')}</span><strong>{L('助理跟进，进展及时告诉您', 'An assistant keeps you updated')}</strong></li>
          <li><span>{L('决定', 'Decisions')}</span><strong>{L('先说明范围和费用，再请您确认', 'Scope and fees first, then your call')}</strong></li>
        </ul>
      </SplitHero>

      <section className="ds-sec-tight ds-cream" aria-labelledby="values-title">
        <div className="wrap">
          <h2 id="values-title" className="sr-only">{L('我们重视的三件事', 'What matters to us')}</h2>
          <ul className="ds-values">
            {values.map(({ Icon, t, d }, i) => (
              <Reveal as="li" key={t} delay={i * 80}>
                <DrawIcon><Icon /></DrawIcon>
                <h3>{t}</h3>
                <p>{d}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <Team />

      <section className="ds-sec ds-cream" aria-labelledby="cities-title">
        <div className="wrap ds-cities">
          <div>
            <p className="ds-kicker">{L('服务城市', 'Where we work')}</p>
            <h2 id="cities-title">{L('当地团队，连接您的房产', 'Local teams, close to your property')}</h2>
            <p>{L('以下是重点服务城市。其他澳洲城市也欢迎咨询，我们会结合具体地址确认安排。', 'These are our focus cities. Other Australian cities are welcome; arrangements depend on the address.')}</p>
          </div>
          <ul>
            {config.cities.map((city) => (
              <li key={city}>
                <button type="button" onClick={() => enquire({ city, service: 'management' })}>
                  <span>{cityName(city, lang)}</span>
                  <small>{L('咨询这座城市', 'Ask about this city')}</small>
                  <ArrowRight size={18} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
    <CtaBand />
  </>;
}

/* ================================================================= privacy */
export function Privacy() {
  const { L } = useI18n();
  return (
    <>
      <PageHead title={L('隐私说明', 'Privacy notice')} lead={L('我们收集什么、为什么收集、谁能看到。', 'What we collect, why, and who can see it.')} />
      <section className="section section-tight">
        <div className="wrap prose narrow">
          <h2>{L('我们收集的信息', 'What we collect')}</h2>
          <p>{L('您在咨询和需求登记中填写的称呼、联系方式、房产城市与地址、预算或价格预期、购房用途、房屋情况、服务内容与时间、偏好语言及补充说明。暂未确定的资料可留空，后续沟通时补充。', 'The name, contact details, property city and address, budget or price expectations, buying purpose, property details, requested services and timing, language and notes you enter in enquiries and registrations. Optional details can be added later.')}</p>
          <h2>{L('用途', 'How we use it')}</h2>
          <p>{L('仅用于回复您的咨询、评估并跟进委托。未经您同意，不用于其他目的。', 'Only to respond to your enquiry and follow up on any appointment. We don’t use it for other purposes without your consent.')}</p>
          <h2>{L('谁能查看', 'Who can see it')}</h2>
          <p>{L('经授权的团队成员按城市和职责查看。内部提醒只包含咨询编号、城市、服务类型和提交时间，不含您的联系方式。', 'Authorised team members, by city and role. Internal alerts carry only the reference, city, service and time — not your contact details.')}</p>
          <h2>{L('您的选择', 'Your choices')}</h2>
          <h3>{L('广告效果衡量', 'Advertising measurement')}</h3>
          <p>{L('公开网页使用 Meta Pixel 统计页面访问，并在咨询成功保存后记录一次转化，以衡量广告效果。统计在隔离文档中运行，不读取您填写的姓名、电话、微信、房屋地址或说明，也不传送查询参数、咨询编号或分流目标。不启用自动高级匹配。后台、联系分流页面及本机预览不加载追踪。浏览器开启“请勿追踪”或全局隐私控制时不加载追踪。Meta 仍可能收到浏览器、设备及网络信息。', 'Public pages use Meta Pixel to measure page visits and one conversion after an enquiry is saved. Measurement runs in an isolated document and does not read your entered name, phone, WeChat ID, property address or notes. Query strings, enquiry references and reception targets are not sent. Automatic advanced matching is disabled. Tracking is not loaded on admin pages, contact-routing pages or local previews, or when Do Not Track or Global Privacy Control is enabled. Meta may still receive browser, device and network information.')} <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">{L('Meta 隐私政策', 'Meta Privacy Policy')}</a></p>
          <p>{L('您可以随时要求查看、更正或删除您提交的信息，请通过咨询表单或 WhatsApp 联系我们。', 'You can ask to see, correct or delete what you submitted at any time, via the enquiry form or WhatsApp.')}</p>
          <p className="fine">{L('正式条款以公司最终发布的版本为准。', 'The company’s final published terms prevail.')}</p>
        </div>
      </section>
    </>
  );
}

/* ================================================================= credits */
const WIKI = [
  { file: 'melbourne.jpg', zh: '墨尔本：亚拉河与南岸', en: 'Melbourne: the Yarra River and Southbank', author: 'terrazzo', src: 'https://commons.wikimedia.org/wiki/File:Southbank_skyline_and_Yarra_River.jpg', lic: 'CC BY-SA 2.0', licUrl: 'https://creativecommons.org/licenses/by-sa/2.0/' },
  { file: 'perth.jpg', zh: '珀斯：天鹅河畔市中心', en: 'Perth: the CBD from the Swan River', author: 'JamesBromberger', src: 'https://commons.wikimedia.org/wiki/File:Perth_skyline_from_the_Swan_River,_August_2024.jpg', lic: 'CC BY 4.0', licUrl: 'https://creativecommons.org/licenses/by/4.0/' },
  { file: 'adelaide.jpg', zh: '阿德莱德：托伦斯河畔市中心', en: 'Adelaide: the CBD across the River Torrens', author: 'Yu Chu Chin', src: 'https://commons.wikimedia.org/wiki/File:Adelaide_CBD_skyline_across_the_River_Torrens,_July_2026_(028A8459).jpg', lic: 'CC BY-SA 4.0', licUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  { file: 'canberra.jpg', zh: '堪培拉：伯利格里芬湖与国会大厦', en: 'Canberra: Lake Burley Griffin and Parliament House', author: 'Thennicke', src: 'https://commons.wikimedia.org/wiki/File:Old_and_new_Parliament_Houses;_Canberra_Australia.jpg', lic: 'CC BY-SA 4.0', licUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
];
const UNSPLASH = [
  { file: 'hero-house.jpg', zh: '黄昏中的当代住宅与大树', en: 'Contemporary home and tree at dusk', id: '1600585154340-be6161a56a0c' },
  { file: 'interior.jpg', zh: '开放式客餐厅', en: 'Open-plan living room', id: '1600607687939-ce8a6c25118c' },
  { file: 'queenslander.jpg', zh: '带阳台的木结构住宅', en: 'Timber house with verandah', id: '1564013799919-ab600027ffc6' },
  { file: 'white-house.jpg', zh: '白色几何住宅（拍摄地未标明）', en: 'White geometric house (location not stated)', id: '1523217582562-09d0def993a6' },
  { file: 'apartment-detail.jpg', zh: '公寓立面', en: 'Apartment façade', id: '1448630360428-65456885c650' },
  { file: 'sydney.jpg', zh: '悉尼港与歌剧院', en: 'Sydney Harbour and the Opera House', id: '1506973035872-a4ec16b8e8d9' },
  { file: 'home-services/lawn.webp', zh: '修剪后的草坪（房屋服务页）', en: 'Freshly mown lawn (home services page)', id: '1558904541-efa843a96f01' },
  { file: 'home-services/cleaning.webp', zh: '擦拭窗户的清洁人员（房屋服务页）', en: 'Cleaner wiping a window (home services page)', id: '1581578731548-c64695cc6952' },
  { file: 'home-services/pet.webp', zh: '小猎犬（房屋服务页）', en: 'Beagle (home services page)', id: '1543466835-00a7907e9de1' },
];

export function Credits() {
  const { L } = useI18n();
  return (
    <>
      <PageHead
        title={L('图片来源与署名', 'Photo credits')}
        lead={L('网站中城市与住宅风貌图片的来源。它们是编辑配图，与具体房源无关。', 'Where the city and home-style photographs on this site come from. They are editorial illustrations, unrelated to any listing.')}
      />
      <section className="section section-tight">
        <div className="wrap">
          <h2 className="credits-h">Wikimedia Commons</h2>
          <ul className="credits">
            {WIKI.map((w) => (
              <li key={w.file}>
                <SmartImg src={`/img/${w.file}`} alt={L(w.zh, w.en)} />
                <div>
                  <strong>{L(w.zh, w.en)}</strong>
                  <span>
                    {L('作者：', 'Author: ')}
                    {w.author}
                  </span>
                  <span>
                    {L('许可：', 'Licence: ')}
                    <a href={w.licUrl} target="_blank" rel="noopener noreferrer">
                      {w.lic}
                    </a>
                  </span>
                  <a href={w.src} target="_blank" rel="noopener noreferrer">
                    {L('查看原图', 'View original')}
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <h2 className="credits-h">Unsplash</h2>
          <ul className="credits">
            {UNSPLASH.map((u) => (
              <li key={u.file}>
                <SmartImg src={`/img/${u.file}`} alt={L(u.zh, u.en)} />
                <div>
                  <strong>{L(u.zh, u.en)}</strong>
                  <span>
                    {L('许可：', 'Licence: ')}
                    <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">
                      Unsplash License
                    </a>
                  </span>
                  <a href={`https://images.unsplash.com/photo-${u.id}`} target="_blank" rel="noopener noreferrer">
                    {L('图片来源链接', 'Source link')}
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <div className="prose credits-note">
            <p>{L('所有图片仅按页面版式缩放与裁切显示，未修改画面内容。Wikimedia 图片按其许可条款署名；CC BY-SA 图片的使用遵循相同方式共享的要求。', 'All images are only scaled and cropped to fit the page layout; their content is not altered. Wikimedia images are credited under their licence terms, and CC BY-SA images are used in line with their share-alike requirement.')}</p>
            <p>{L('这些图片用于展示城市与住宅风格，不代表任何具体房源，部分住宅照片未标明拍摄地点。房源页中的照片属于该房源本身。', 'These images illustrate cities and home styles and do not depict any specific listing; some home photos do not state where they were taken. Photos on a listing page belong to that listing.')}</p>
          </div>
        </div>
      </section>
    </>
  );
}

export function NotFound() {
  const { L,lang } = useI18n();
  return (
    <PageHead title={L('找不到这个页面', 'Page not found')} lead={L('链接可能已经更改。', 'The link may have changed.')}>
      <a href={siteHomeHref(lang)} className="btn btn-primary">
        {L('回到首页', 'Back to home')} <ArrowRight size={17} aria-hidden />
      </a>
    </PageHead>
  );
}

