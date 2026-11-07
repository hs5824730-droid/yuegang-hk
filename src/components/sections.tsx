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
const POS: Record<string, string> = { 'Hong Kong Island': '62% 50%', Kowloon: '22% 55%', 'New Territories': '55% 50%', Islands: '62% 45%' };

function cityCopy(c: string, L: LFn) {
  switch (c) {
    case 'Hong Kong Island':
      return { state: L('中西區 · 灣仔 · 東區 · 南區', 'Central & Western · Wan Chai · Eastern · Southern'), note: L('港島區由同事負責睇樓、交收及維修跟進，涵蓋半山、鰂魚湧、太古、南區等住宅區。', 'On Hong Kong Island we handle viewings, handovers and repairs across Mid-Levels, Quarry Bay, Taikoo, the Southern District and more.'), photo: L('由尖沙咀望向港島', 'Hong Kong Island from Tsim Sha Tsui') };
    case 'Kowloon':
      return { state: L('油尖旺 · 九龍城 · 深水埗 · 觀塘', 'Yau Tsim Mong · Kowloon City · Sham Shui Po · Kwun Tong'), note: L('九龍區同事熟悉西九、紅磡、何文田、九龍灣等屋苑，就近安排睇樓同交收。', 'In Kowloon we know West Kowloon, Hung Hom, Ho Man Tin, Kowloon Bay and more, and arrange viewings nearby.'), photo: L('維港旁嘅環球貿易廣場', 'ICC on Victoria Harbour') };
    case 'New Territories':
      return { state: L('沙田 · 大埔 · 將軍澳 · 荃灣 · 元朗', 'Sha Tin · Tai Po · Tseung Kwan O · Tsuen Wan · Yuen Long'), note: L('新界新市鎮屋苑多、面積較大，適閤家庭租客；同事按地址安排跟進。', 'New Territories new towns offer larger family homes; a colleague is assigned by address.'), photo: L('沙田城門河畔', 'The Shing Mun River in Sha Tin') };
    default:
      return { state: L('東湧 · 愉景灣 · 馬灣', 'Tung Chung · Discovery Bay · Ma Wan'), note: L('離島住宅鄰近機場及大自然，同事可安排實地或視像睇樓。', 'Island homes sit near the airport and countryside; we arrange in-person or video viewings.'), photo: L('東湧新市鎮', 'Tung Chung new town') };
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
      <div className="atlas-list" role="tablist" ref={tablist} aria-label={L('揀地區', 'Choose a city')}>
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
            {L(`查詢${cityName(city, lang)}嘅單位`, `Ask about a ${city} property`)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- services */
export function serviceRows(L: LFn): { icon: ReactNode; t: string; d: string; letting: boolean | string; manage: boolean | string }[] {
  return [
    { icon: <ClipboardCheck />, t: L('出租前準備建議', 'Pre-letting advice'), d: L('清潔、小修、拍照等準備事項嘅建議清單', 'A checklist for cleaning, small repairs and photography'), letting: true, manage: true },
    { icon: <Receipt />, t: L('租金建議', 'Rent guidance'), d: L('參考同區域在租樓盤，俾出掛牌租金建議', 'A suggested asking rent based on comparable local listings'), letting: true, manage: true },
    { icon: <Camera />, t: L('推廣同睇樓', 'Marketing and viewings'), d: L('發佈樓盤，統一安排睇樓，回應租客查詢', 'Listing, scheduled viewings and answering tenant enquiries'), letting: true, manage: true },
    { icon: <UserSearch />, t: L('申請篩揀', 'Applicant screening'), d: L('整理申請資料，同你溝通後確定租客', 'We collate applications and agree the tenant with you'), letting: true, manage: true },
    { icon: <FileSignature />, t: L('簽約同交收入住', 'Lease and move-in'), d: L('租約溝通、鑰匙交收同入住記錄', 'Lease discussions, key handover and move-in records'), letting: true, manage: true },
    { icon: <Clock />, t: L('租金跟進', 'Rent follow-up'), d: L('關注租金到賬，逾期時即時同租客溝通', 'Watching rent payments and following up with tenants when late'), letting: false, manage: true },
    { icon: <Wrench />, t: L('維修協調', 'Repairs coordination'), d: L('接收報修，聯絡維修方並向你確認', 'Taking repair requests, arranging trades and checking with you'), letting: false, manage: true },
    { icon: <MessageSquareText />, t: L('租客日常聯絡', 'Day-to-day tenant contact'), d: L('租期內嘅問題由我哋統一對接', 'We are the tenant’s point of contact during the lease'), letting: false, manage: true },
    { icon: <PhoneCall />, t: L('定期向你溝通', 'Regular updates to you'), d: L('用粵語、普通話或者英文，話你單位嘅情況', 'Updates on the property, in Chinese or English'), letting: false, manage: true },
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
          title: L('只放租', 'Letting only'),
          lead: L('我哋負責將單位順利租出去：由準備、推廣、睇樓到簽約交收。租客入住後，日常事務由你自己處理。', 'We get the property let: preparation, marketing, viewings, lease and handover. Once the tenant moves in, you look after day-to-day matters yourself.'),
          fit: L('適合喺香港本地、願意自己打理租期事務嘅業主。', 'Suits owners in Hong Kong who are happy to manage the tenancy themselves.'),
        }
      : {
          img: IMG.interior,
          pos: '50% 60%',
          title: L('租務管理', 'Ongoing management'),
          lead: L('放租完成後繼續由團隊代管：租金跟進、維修協調、租客聯絡，並定期用粵語、普通話或者英文向你溝通。', 'After letting, our team keeps looking after it: rent follow-up, repairs, tenant contact and regular updates to you in Chinese or English.'),
          fit: L('適合名下有多層樓，或沒時間處理租期事務嘅業主。', 'Suits owners with several properties, or without time to handle the tenancy.'),
        };
  return (
    <div className={`picker ${compact ? 'picker-compact' : ''}`}>
      <div className="seg seg-slide" role="tablist" aria-label={L('揀服務', 'Choose a service')} style={{ ['--n' as string]: 2, ['--i' as string]: tab === 'letting' ? 0 : 1 }}>
        {(['letting', 'management'] as const).map((k) => (
          <button key={k} role="tab" id={`${uid}-${k}`} aria-controls={`${uid}-panel`} aria-selected={tab === k} tabIndex={tab === k ? 0 : -1} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} onKeyDown={(e) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
            e.preventDefault();
            const next = e.key === 'Home' ? 'letting' : e.key === 'End' ? 'management' : k === 'letting' ? 'management' : 'letting';
            setTab(next);
            document.getElementById(`${uid}-${next}`)?.focus();
          }}>
            {k === 'letting' ? <KeyRound size={18} aria-hidden /> : <ShieldCheck size={18} aria-hidden />}
            {k === 'letting' ? L('只放租', 'Letting only') : L('租務管理', 'Ongoing management')}
          </button>
        ))}
      </div>
      <div className="picker-body" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-${tab}`} key={tab}>
        <div className="picker-img">
          <SmartImg src={data.img} alt={L('編輯配圖：當代住宅', 'Editorial photo: a contemporary home')} position={data.pos} />
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
              {tab === 'letting' ? L('查詢只放租', 'Ask about letting') : L('查詢租務管理', 'Ask about management')}
            </button>
            <Link to="/services#compare" className="btn btn-quiet">
              {L('睇完整對比', 'Compare in full')}
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
      <span className="no">{L('業主自理', 'Owner')}</span>
    );
  return (
    <div className="compare" id="compare">
      <table>
        <caption className="sr-only">{L('只放租同租務管理服務對比', 'Letting only vs ongoing management')}</caption>
        <thead>
          <tr>
            <th scope="col">{L('服務內容', 'What’s included')}</th>
            <th scope="col">{L('只放租', 'Letting only')}</th>
            <th scope="col" className="hl">
              {L('租務管理', 'Management')}
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
      <p className="fine">{L('具體服務範圍同收費喺委託前書面說明，以雙方簽署嘅協議為準。', 'Exact scope and fees are set out in writing before you appoint us, as agreed in the signed agreement.')}</p>
    </div>
  );
}

/* ----------------------------------------------------------------- process */
export function Process() {
  const { L } = useI18n();
  const steps = [
    { icon: <MessageSquareText />, t: L('話我哋單位嘅情況', 'Tell us about the property'), d: L('留低地區、服務需求同聯絡電話。', 'Share the city, service you need and a contact number.') },
    { icon: <PhoneCall />, t: L('同事聯絡你', 'An assistant gets in touch'), d: L('用你習慣嘅語言，了解單位同你嘅期望。', 'In your preferred language, to understand the home and what you want.') },
    { icon: <ClipboardCheck />, t: L('確認方案同費用', 'Agree scope and fees'), d: L('揀只放租或租務管理，服務內容同費用書面說明。', 'Choose letting only or management; scope and fees are put in writing.') },
    { icon: <Handshake />, t: L('簽署委託，開始放租', 'Sign and start letting'), d: L('本地團隊開始放租，進展由同事話你。', 'The local team starts letting; your assistant keeps you posted.') },
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
        <p>{L('你名下準備委託出租嘅單位', 'Properties you plan to let with us')}</p>
        <div className="stepper" role="group" aria-label={L('房屋數量', 'Number of properties')}>
          <button type="button" onClick={() => setN(Math.max(1, n - 1))} disabled={n <= 1} aria-label={L('減少一套', 'One fewer')}>
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
            <span className="m-val">{r === 1 ? L('免出租佣金', 'No letting commission') : r === 2 ? L('出租佣金半價', 'Half letting commission') : L('按正常標準', 'Standard terms')}</span>
          </li>
        ))}
      </ol>
      <p className="meter-note">
        {L(`按同一業主委託嘅房屋順序計算，優惠至 ${end}。僅針對出租佣金，不含銷售佣金同管理費。`, `Counted in order across one owner’s properties, until ${end}. Letting commission only; sales commission and management fees are not included.`)}
      </p>
    </div>
  );
}

/* --------------------------------------------------------------------- FAQ */
export function faqItems(L: LFn, end: string) {
  return [
    {
      q: L('只放租同租務管理，我應該揀邊個？', 'Letting only or ongoing management — which should I choose?'),
      a: L('願意自己處理租期內嘅事情，只放租就夠了；名下有多層樓，或唔想處理維修同租客溝通，可以揀租務管理。拿不準都沒關係，同事會根據你嘅情況俾建議。', 'If you are happy to handle the tenancy yourself, letting only is enough. If you own several properties or would rather not deal with repairs and tenants, choose management. Not sure? Our assistant will suggest what fits.'),
    },
    {
      q: L('首個單位免出租佣金係點樣算嘅？', 'How does the first-property offer work?'),
      a: L(`按同一位業主委託出租嘅房屋順序計算：第一個單位免出租佣金，第二個單位出租佣金半價，優惠至 ${end}。優惠只針對出租佣金，唔包括租務管理嘅管理費、銷售佣金或其他費用，具體以書面委託協議為準。`, `Counted in order across the properties one owner appoints us to let: the first has no letting commission, the second is at half. Runs until ${end}. It applies to letting commission only — not management fees, sales commission or other charges — as set out in the written agreement.`),
    },
    {
      q: L('我嘅單位而家由其他代理管理，可以轉過嚟嗎？', 'My property is with another agency. Can I move it to you?'),
      a: L('目前我哋唔接由其他代理轉嚟嘅出租或託管委託。如果你嘅情況比較特殊，可以先聯絡同事確認。', 'We don’t currently take over lettings or management from another agency. If your situation is unusual, please check with our assistant first.'),
    },
    {
      q: L('管理費點樣收？', 'What are the management fees?'),
      a: L('費用同房產情況、服務範圍有關，同事會在你委託之前書面說明。', 'Fees depend on the property and the services you choose. Our assistant sets them out in writing before you appoint us.'),
    },
    {
      q: L('租客入住時，可以幫忙搬屋嗎？', 'Can you help with moving when a tenant moves in?'),
      a: L('只放租同租務管理嘅出租配套都提供免費搬屋服務，主要圍繞入住呢層單位嘅搬屋，業主或租客都可以使用。服務區域、次數等具體安排由同事確認。', 'Free moving comes with letting, under both letting only and management, mainly for the move into the property, and either the owner or the tenant can use it. Areas and other details are confirmed by our assistant.'),
    },
    {
      q: L('我都想賣樓，或者喺香港買樓？', 'Can you also help me sell or buy?'),
      a: L('可以。我哋同樣提供賣樓委託同買樓查詢；尚未到香港嘅買家可以遠程查詢在售樓盤，有實景 3D 導覽嘅樓盤會單獨標註。', 'Yes. We also handle sales and buying enquiries. Buyers who haven’t arrived in Hong Kong yet can enquire about homes for sale remotely; any listing with a real 3D tour is labelled as such.'),
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
            <h2>{title || L('由一層樓開始傾', 'Start with one property')}</h2>
            <p>{text || L('話我哋單位喺邊區、想要邊種服務，同事會聯絡你講下一步點做。', 'Tell us the city and the service you have in mind; our assistant will explain what happens next.')}</p>
          </div>
          <div className="v-actions">
            <button type="button" className="btn btn-primary" onClick={() => enquire()}>
              {L('開始委託查詢', 'Start an enquiry')}
              <ArrowRight size={18} aria-hidden />
            </button>
            <Link to="/services" className="btn btn-line">
              {L('了解服務', 'See services')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
