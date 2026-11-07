import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  Check,
  ClipboardCheck,
  Clock,
  FileSignature,
  Handshake,
  KeyRound,
  MessageSquareText,
  Minus,
  PhoneCall,
  Plus,
  Receipt,
  ShieldCheck,
  UserSearch,
  Wrench,
} from 'lucide-react';
import { cityName, formatMonth, useConfig, useI18n } from '../i18n';
import { useEnquiry } from './Enquiry';
import { Leaf } from './v2/Art';
import { IMG, IconBadge, SmartImg, scrollBehavior } from './ui';

type LFn = (zh: string, en: string) => string;

/* ------------------------------------------------------------------ cities */
const POS: Record<string, string> = { Melbourne: '35% 100%', Sydney: '30% 45%', Perth: '40% 55%', Adelaide: '55% 60%', Canberra: '50% 45%' };

function cityCopy(c: string, L: LFn) {
  switch (c) {
    case 'Melbourne':
      return { state: L('维多利亚州', 'Victoria'), note: L('墨尔本当地团队在城市负责人安排下，处理看房、入住交接等现场事务。', 'In Melbourne, our local team handles viewings, move-in handover and other on-site work, arranged by the city lead.'), photo: L('亚拉河与南岸', 'The Yarra River and Southbank') };
    case 'Sydney':
      return { state: L('新南威尔士州', 'New South Wales'), note: L('悉尼当地团队在城市负责人安排下处理招租与托管的现场事务。', 'In Sydney, our local team handles on-site letting and management work, arranged by the city lead.'), photo: L('悉尼港与歌剧院', 'Sydney Harbour and the Opera House') };
    case 'Perth':
      return { state: L('西澳大利亚州', 'Western Australia'), note: L('珀斯当地团队在城市负责人安排下，处理看房、交接等现场事务。', 'In Perth, our local team handles viewings, handover and other on-site work, arranged by the city lead.'), photo: L('天鹅河畔的珀斯市中心', 'Perth CBD from the Swan River') };
    case 'Adelaide':
      return { state: L('南澳大利亚州', 'South Australia'), note: L('阿德莱德当地团队在城市负责人安排下，处理推广、看房和租客联络。', 'In Adelaide, our local team handles marketing, viewings and tenant contact, arranged by the city lead.'), photo: L('托伦斯河畔的阿德莱德市中心', 'Adelaide CBD across the River Torrens') };
    default:
      return { state: L('澳大利亚首都领地', 'Australian Capital Territory'), note: L('堪培拉负责人对接本地房东，招租与托管事务就近处理。', 'Our Canberra lead works with local owners and handles letting and management nearby.'), photo: L('伯利格里芬湖与国会大厦', 'Lake Burley Griffin and Parliament House') };
  }
}

export function CityAtlas({ selected, onSelect, visual = false }: { selected?: string; onSelect?: (c: string) => void; visual?: boolean }) {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const enquire = useEnquiry();
  const [own, setOwn] = useState(config.cities[0]);
  const city = selected ?? own;
  const select = onSelect ?? setOwn;
  const copy = cityCopy(city, L);
  const uid = useId();
  const tablist = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = tablist.current;
    const active = list?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    const bounds = list.getBoundingClientRect();
    const button = active.getBoundingClientRect();
    if (button.left < bounds.left || button.right > bounds.right) {
      list.scrollTo({ left: list.scrollLeft + button.left - bounds.left - (list.clientWidth - button.width) / 2, behavior: scrollBehavior() });
    }
  }, [city]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = config.cities.length;
    let j = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = (i + 1) % n;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = (i - 1 + n) % n;
    if (e.key === 'Home') j = 0;
    if (e.key === 'End') j = n - 1;
    if (j < 0) return;
    e.preventDefault();
    select(config.cities[j]);
    document.getElementById(`${uid}-city-${config.cities[j]}`)?.focus({ preventScroll: true });
  };

  return (
    <div className={`atlas ${visual ? 'atlas-visual' : ''}`}>
      <div className="atlas-list" role="tablist" ref={tablist} aria-label={L('选择城市', 'Choose a city')}>
        {config.cities.map((c, i) => (
          <button
            key={c}
            id={`${uid}-city-${c}`}
            role="tab"
            aria-selected={c === city}
            aria-controls={`${uid}-city-panel`}
            tabIndex={c === city ? 0 : -1}
            className={c === city ? 'on' : ''}
            onClick={() => select(c)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {visual && <span className="atlas-thumb" aria-hidden><SmartImg src={IMG[c as keyof typeof IMG]} alt="" position={POS[c]} /></span>}
            <span>{cityName(c, lang)}</span>
            {visual && <ArrowRight size={15} aria-hidden className="atlas-tab-arrow" />}
          </button>
        ))}
      </div>
      <div className="atlas-panel" id={`${uid}-city-panel`} role="tabpanel" aria-labelledby={`${uid}-city-${city}`}>
        <figure className="atlas-photo" key={city}>
          <SmartImg src={IMG[city as keyof typeof IMG] || IMG.hero} alt={copy.photo} position={POS[city]} />
          <figcaption>{copy.photo}</figcaption>
        </figure>
        <div className="atlas-text">
          <h3>
            {cityName(city, lang)} <span>{copy.state}</span>
          </h3>
          <p>{copy.note}</p>
          <button type="button" className="btn btn-primary" onClick={() => enquire({ city, service: 'letting' })}>
            {L(`咨询${cityName(city, lang)}的房子`, `Ask about a ${city} property`)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- services */
export function serviceRows(L: LFn): { icon: ReactNode; t: string; d: string; letting: boolean | string; manage: boolean | string }[] {
  return [
    { icon: <ClipboardCheck />, t: L('出租前准备建议', 'Pre-letting advice'), d: L('清洁、小修、拍照等准备事项的建议清单', 'A checklist for cleaning, small repairs and photography'), letting: true, manage: true },
    { icon: <Receipt />, t: L('租金建议', 'Rent guidance'), d: L('参考同区域在租房源，给出挂牌租金建议', 'A suggested asking rent based on comparable local listings'), letting: true, manage: true },
    { icon: <Camera />, t: L('推广与看房', 'Marketing and viewings'), d: L('发布房源，统一安排看房，回应租客咨询', 'Listing, scheduled viewings and answering tenant enquiries'), letting: true, manage: true },
    { icon: <UserSearch />, t: L('申请筛选', 'Applicant screening'), d: L('整理申请资料，与您沟通后确定租客', 'We collate applications and agree the tenant with you'), letting: true, manage: true },
    { icon: <FileSignature />, t: L('签约与入住交接', 'Lease and move-in'), d: L('租约沟通、钥匙交接与入住记录', 'Lease discussions, key handover and move-in records'), letting: true, manage: true },
    { icon: <Clock />, t: L('租金跟进', 'Rent follow-up'), d: L('关注租金到账，逾期时及时与租客沟通', 'Watching rent payments and following up with tenants when late'), letting: false, manage: true },
    { icon: <Wrench />, t: L('维修协调', 'Repairs coordination'), d: L('接收报修，联系维修方并向您确认', 'Taking repair requests, arranging trades and checking with you'), letting: false, manage: true },
    { icon: <MessageSquareText />, t: L('租客日常联络', 'Day-to-day tenant contact'), d: L('租期内的问题由我们统一对接', 'We are the tenant’s point of contact during the lease'), letting: false, manage: true },
    { icon: <PhoneCall />, t: L('定期向您沟通', 'Regular updates to you'), d: L('用中文或英文，告诉您房子的情况', 'Updates on the property, in Chinese or English'), letting: false, manage: true },
  ];
}

export function ServicePicker({ tab: ctl, onTab, compact = false }: { tab?: 'letting' | 'management'; onTab?: (t: 'letting' | 'management') => void; compact?: boolean } = {}) {
  const { L } = useI18n();
  const enquire = useEnquiry();
  const [own, setOwn] = useState<'letting' | 'management'>('letting');
  const uid = useId();
  const tab = ctl ?? own;
  const setTab = onTab ?? setOwn;
  const allRows = serviceRows(L);
  const rows = compact ? (tab === 'letting' ? [allRows[1], allRows[2], allRows[4]] : [allRows[5], allRows[6], allRows[7]]) : allRows.filter((r) => (tab === 'letting' ? r.letting : r.manage));
  const data =
    tab === 'letting'
      ? {
          img: IMG.white,
          pos: '50% 50%',
          title: L('仅招租', 'Letting only'),
          lead: L('我们负责把房子顺利租出去：从准备、推广、看房到签约交接。租客入住后，日常事务由您自己处理。', 'We get the property let: preparation, marketing, viewings, lease and handover. Once the tenant moves in, you look after day-to-day matters yourself.'),
          fit: L('适合在澳洲本地、愿意自己打理租期事务的房东。', 'Suits owners in Australia who are happy to manage the tenancy themselves.'),
        }
      : {
          img: IMG.interior,
          pos: '50% 60%',
          title: L('长期托管', 'Ongoing management'),
          lead: L('招租完成后继续由团队代管：租金跟进、维修协调、租客联络，并定期用中文或英文向您沟通。', 'After letting, our team keeps looking after it: rent follow-up, repairs, tenant contact and regular updates to you in Chinese or English.'),
          fit: L('适合名下有多套房，或没时间处理租期事务的房东。', 'Suits owners with several properties, or without time to handle the tenancy.'),
        };
  return (
    <div className={`picker ${compact ? 'picker-compact' : ''}`}>
      <div className="seg seg-slide" role="tablist" aria-label={L('选择服务', 'Choose a service')} style={{ ['--n' as string]: 2, ['--i' as string]: tab === 'letting' ? 0 : 1 }}>
        {(['letting', 'management'] as const).map((k) => (
          <button key={k} role="tab" id={`${uid}-${k}`} aria-controls={`${uid}-panel`} aria-selected={tab === k} tabIndex={tab === k ? 0 : -1} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} onKeyDown={(e) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
            e.preventDefault();
            const next = e.key === 'Home' ? 'letting' : e.key === 'End' ? 'management' : k === 'letting' ? 'management' : 'letting';
            setTab(next);
            document.getElementById(`${uid}-${next}`)?.focus();
          }}>
            {k === 'letting' ? <KeyRound size={18} aria-hidden /> : <ShieldCheck size={18} aria-hidden />}
            {k === 'letting' ? L('仅招租', 'Letting only') : L('长期托管', 'Ongoing management')}
          </button>
        ))}
      </div>
      <div className="picker-body" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-${tab}`} key={tab}>
        <div className="picker-img">
          <SmartImg src={data.img} alt={L('编辑配图：当代住宅', 'Editorial photo: a contemporary home')} position={data.pos} />
        </div>
        <div className="picker-copy">
          <h3>{data.title}</h3>
          <p className="picker-lead">{data.lead}</p>
          <ul className="icon-list">
            {rows.map((r) => (
              <li key={r.t}>
                <IconBadge>{r.icon}</IconBadge>
                <div>
                  <strong>{r.t}</strong>
                  <span>{r.d}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="picker-fit">{data.fit}</p>
          <div className="row-actions">
            <button type="button" className="btn btn-primary" onClick={() => enquire({ service: tab })}>
              {tab === 'letting' ? L('咨询仅招租', 'Ask about letting') : L('咨询长期托管', 'Ask about management')}
            </button>
            <Link to="/services#compare" className="btn btn-quiet">
              {L('看完整对比', 'Compare in full')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompareTable() {
  const { L } = useI18n();
  const cell = (v: boolean | string) =>
    v === true ? (
      <span className="yes">
        <Check size={18} strokeWidth={2.4} aria-hidden />
        <span className="sr-only">{L('包含', 'Included')}</span>
      </span>
    ) : (
      <span className="no">{L('房东自理', 'Owner')}</span>
    );
  return (
    <div className="compare" id="compare">
      <table>
        <caption className="sr-only">{L('仅招租与长期托管服务对比', 'Letting only vs ongoing management')}</caption>
        <thead>
          <tr>
            <th scope="col">{L('服务内容', 'What’s included')}</th>
            <th scope="col">{L('仅招租', 'Letting only')}</th>
            <th scope="col" className="hl">
              {L('长期托管', 'Management')}
            </th>
          </tr>
        </thead>
        <tbody>
          {serviceRows(L).map((r) => (
            <tr key={r.t}>
              <th scope="row">
                <IconBadge>{r.icon}</IconBadge>
                <span>
                  <strong>{r.t}</strong>
                  <small>{r.d}</small>
                </span>
              </th>
              <td>{cell(r.letting)}</td>
              <td className="hl">{cell(r.manage)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="fine">{L('具体服务范围与收费在委托前书面说明，以双方签署的协议为准。', 'Exact scope and fees are set out in writing before you appoint us, as agreed in the signed agreement.')}</p>
    </div>
  );
}

/* ----------------------------------------------------------------- process */
export function Process() {
  const { L } = useI18n();
  const steps = [
    { icon: <MessageSquareText />, t: L('告诉我们房子的情况', 'Tell us about the property'), d: L('留下城市、服务需求和联系电话。', 'Share the city, service you need and a contact number.') },
    { icon: <PhoneCall />, t: L('助理联系您', 'An assistant gets in touch'), d: L('用您习惯的语言，了解房子和您的期望。', 'In your preferred language, to understand the home and what you want.') },
    { icon: <ClipboardCheck />, t: L('确认方案与费用', 'Agree scope and fees'), d: L('选择仅招租或长期托管，服务内容与费用书面说明。', 'Choose letting only or management; scope and fees are put in writing.') },
    { icon: <Handshake />, t: L('签署委托，开始招租', 'Sign and start letting'), d: L('当地团队开始招租，进展由助理告诉您。', 'The local team starts letting; your assistant keeps you posted.') },
  ];
  return (
    <ol className="process">
      {steps.map((s, i) => (
        <li key={s.t}>
          <span className="process-n" aria-hidden>
            {i + 1}
          </span>
          <div>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------- offer */
export function OfferMeter() {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const [n, setN] = useState(2);
  const end = formatMonth(config.promotion.endMonth, lang);
  const rows = Array.from({ length: n }, (_, i) => i + 1);
  return (
    <div className="meter">
      <div className="meter-head">
        <p>{L('您名下准备委托出租的房子', 'Properties you plan to let with us')}</p>
        <div className="stepper" role="group" aria-label={L('房屋数量', 'Number of properties')}>
          <button type="button" onClick={() => setN(Math.max(1, n - 1))} disabled={n <= 1} aria-label={L('减少一套', 'One fewer')}>
            <Minus size={16} />
          </button>
          <output aria-live="polite">{L(`${n} 套`, `${n}`)}</output>
          <button type="button" onClick={() => setN(Math.min(4, n + 1))} disabled={n >= 4} aria-label={L('增加一套', 'One more')}>
            <Plus size={16} />
          </button>
        </div>
      </div>
      <ol className="meter-rows">
        {rows.map((r) => (
          <li key={r} className={`m-${Math.min(r, 3)}`}>
            <span className="m-label">{L(`第 ${r} 套`, `Property ${r}`)}</span>
            <span className="m-val">{r === 1 ? L('免出租佣金', 'No letting commission') : r === 2 ? L('出租佣金半价', 'Half letting commission') : L('按正常标准', 'Standard terms')}</span>
          </li>
        ))}
      </ol>
      <p className="meter-note">
        {L(`按同一房东委托的房屋顺序计算，优惠至 ${end}。仅针对出租佣金，不含销售佣金与管理费。`, `Counted in order across one owner’s properties, until ${end}. Letting commission only; sales commission and management fees are not included.`)}
      </p>
    </div>
  );
}

/* --------------------------------------------------------------------- FAQ */
export function faqItems(L: LFn, end: string) {
  return [
    {
      q: L('仅招租和长期托管，我该选哪个？', 'Letting only or ongoing management — which should I choose?'),
      a: L('愿意自己处理租期内的事情，仅招租就够了；名下有多套房，或不想处理维修和租客沟通，可以选长期托管。拿不准也没关系，助理会根据您的情况给建议。', 'If you are happy to handle the tenancy yourself, letting only is enough. If you own several properties or would rather not deal with repairs and tenants, choose management. Not sure? Our assistant will suggest what fits.'),
    },
    {
      q: L('首套免出租佣金是怎么算的？', 'How does the first-property offer work?'),
      a: L(`按同一位房东委托出租的房屋顺序计算：第一套免出租佣金，第二套出租佣金半价，优惠至 ${end}。优惠只针对出租佣金，不包括长期托管的管理费、销售佣金或其他费用，具体以书面委托协议为准。`, `Counted in order across the properties one owner appoints us to let: the first has no letting commission, the second is at half. Runs until ${end}. It applies to letting commission only — not management fees, sales commission or other charges — as set out in the written agreement.`),
    },
    {
      q: L('我的房子现在由其他中介管理，可以转过来吗？', 'My property is with another agency. Can I move it to you?'),
      a: L('目前我们不承接由其他中介转来的出租或托管委托。如果您的情况比较特殊，可以先联系助理确认。', 'We don’t currently take over lettings or management from another agency. If your situation is unusual, please check with our assistant first.'),
    },
    {
      q: L('管理费怎么收？', 'What are the management fees?'),
      a: L('费用和房产情况、服务范围有关，助理会在您委托之前书面说明。', 'Fees depend on the property and the services you choose. Our assistant sets them out in writing before you appoint us.'),
    },
    {
      q: L('租客入住时，可以帮忙搬家吗？', 'Can you help with moving when a tenant moves in?'),
      a: L('仅招租与长期托管的出租配套都提供免费搬家服务，主要围绕入住这套房子的搬家，房东或租客都可以使用。服务区域、次数等具体安排由助理确认。', 'Free moving comes with letting, under both letting only and management, mainly for the move into the property, and either the owner or the tenant can use it. Areas and other details are confirmed by our assistant.'),
    },
    {
      q: L('我也想卖房，或者在澳洲买房？', 'Can you also help me sell or buy?'),
      a: L('可以。我们同样提供卖房委托和买房咨询；尚未到澳洲的买家可以远程咨询在售房源，有实景 3D 导览的房源会单独标注。', 'Yes. We also handle sales and buying enquiries. Buyers who haven’t arrived in Australia yet can enquire about homes for sale remotely; any listing with a real 3D tour is labelled as such.'),
    },
  ];
}

export function Faq({ limit }: { limit?: number }) {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const items = faqItems(L, formatMonth(config.promotion.endMonth, lang)).slice(0, limit);
  return (
    <div className="faq">
      {items.map((it, i) => (
        <details key={i} className="faq-item">
          <summary>
            <span>{it.q}</span>
            <Plus size={20} aria-hidden className="faq-icon" />
          </summary>
          <div className="faq-a">
            <p>{it.a}</p>
          </div>
        </details>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------- CTA */
export function CtaBand({ title, text }: { title?: string; text?: string; img?: string }) {
  const { L } = useI18n();
  const enquire = useEnquiry();
  return (
    <section className="v-cta cta-band">
      <div className="wrap">
        <div className="v-cta-panel">
          <Leaf className="v-cta-leaf" />
          <div className="v-cta-copy">
            <h2>{title || L('从一套房开始聊', 'Start with one property')}</h2>
            <p>{text || L('告诉我们房子在哪座城市、想要哪种服务，助理会联系您说明下一步。', 'Tell us the city and the service you have in mind; our assistant will explain what happens next.')}</p>
          </div>
          <div className="v-actions">
            <button type="button" className="btn btn-primary" onClick={() => enquire()}>
              {L('开始委托咨询', 'Start an enquiry')}
              <ArrowRight size={18} aria-hidden />
            </button>
            <Link to="/services" className="btn btn-line">
              {L('了解服务', 'See services')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
