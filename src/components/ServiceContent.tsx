import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, KeyRound, ShieldCheck, Truck, Plus, Percent, Languages, MapPin, SlidersHorizontal, ClipboardCheck, RefreshCcw } from 'lucide-react';
import { formatMonth, useConfig, useI18n } from '../i18n';
import { useEnquiry } from './Enquiry';
import { IMG, SmartImg } from './ui';

export function ServiceComparison() {
  const { L } = useI18n();
  const enquire = useEnquiry();
  const [selected, setSelected] = useState<'letting' | 'management'>('management');
  const uid = useId();
  const rows = [
    [L('出租準備同租金建議', 'Preparation & rent guidance'), true],
    [L('推廣、睇樓同申請篩揀', 'Marketing, viewings & applications'), true],
    [L('租約溝通同交收入住', 'Lease & move-in handover'), true],
    [L('租金跟進同租客聯絡', 'Rent follow-up & tenant contact'), false],
    [L('維修協調同定期巡檢', 'Repairs & routine inspections'), false],
    [L('續租同退租交收', 'Renewals & end-of-lease handover'), false],
  ] as const;
  return <div className="service-comparison" id="compare">
    <fieldset className="service-options">
      <legend className="sr-only">{L('揀要查詢嘅服務', 'Choose a service to enquire about')}</legend>
      {(['letting', 'management'] as const).map(s => <label className={`service-option ${selected === s ? 'selected' : ''}`} key={s}>
        <input type="radio" name={`${uid}-service`} checked={selected === s} onChange={() => setSelected(s)} />
        <span className="service-option-title">{s === 'letting' ? <KeyRound size={20} aria-hidden /> : <ShieldCheck size={20} aria-hidden />}{s === 'letting' ? L('只放租', 'Letting only') : L('租務管理', 'Management')}</span>
        <span>{s === 'letting' ? L('我哋搵到租客，入住後由你管理。', 'We find the tenant. You manage the tenancy.') : L('由放租到租期內事務，持續由我哋跟進。', 'We let the home and keep managing the tenancy.')}</span>
      </label>)}
    </fieldset>
    <table className="service-matrix" data-selected={selected}>
      <caption className="sr-only">{L('出租同租務管理服務對比', 'Letting and management comparison')}</caption>
      <thead><tr><th scope="col">{L('服務內容', 'Service')}</th><th scope="col">{L('只放租', 'Letting')}</th><th scope="col">{L('租務管理', 'Management')}</th></tr></thead>
      <tbody>{rows.map(([label, included]) => <tr key={label}><th scope="row">{label}</th><td>{included ? <><Check aria-hidden size={18} /><span className="sr-only">{L('包含', 'Included')}</span></> : <span className="owner-handles">{L('業主自理', 'Owner')}</span>}</td><td><Check aria-hidden size={18} /><span className="sr-only">{L('包含', 'Included')}</span></td></tr>)}</tbody>
    </table>
    <div className="comparison-action">
      <p>{selected === 'management' ? L('適合不便到場，或希望有人持續處理租期事務嘅業主。', 'For owners who want ongoing help, wherever they live.') : L('適合願意自行收租、處理維修同聯絡租客嘅業主。', 'For owners happy to handle rent, repairs and tenant contact themselves.')}</p>
      <button className="btn btn-primary" type="button" onClick={() => enquire({ service: selected })}>{selected === 'management' ? L('查詢租務管理', 'Enquire about management') : L('查詢只放租', 'Enquire about letting')}<ArrowRight size={17} aria-hidden /></button>
    </div>
    <p className="fine">{L('具體工作安排、巡檢頻次及收費喺委託前書面確認。', 'Scope, inspection frequency and fees are agreed in writing before appointment.')}</p>
  </div>;
}

export function OwnerBenefits() {
  const { L } = useI18n();
  const benefits = [
    { Icon: Languages, t: L('中文英文都能委託', 'Chinese or English'), s: L('華人業主全程中文，英文客戶同樣服務', 'Full service in Chinese, and the same service in English'), d: L('華人業主由查詢到委託、報告同確認決定，全程用中文；習慣英文嘅客戶，同樣可以委託出租、託管、買賣同置業顧問服務，全程英文對接。', 'Chinese-speaking owners are looked after in Chinese from enquiry to reports and approvals. English-speaking clients get the same letting, management, buying and selling and property services, entirely in English.') },
    { Icon: MapPin, t: L('本地團隊處理現場', 'A local team on site'), s: L('睇樓、巡檢、交收唔使你到場', 'Viewings, inspections and handovers without you there'), d: L('睇樓、巡檢同交收由本地團隊安排；你通過同事了解進展，唔使為每件小事親自到場。', 'Viewings, inspections and handovers are arranged locally, with your assistant keeping you informed.') },
    { Icon: SlidersHorizontal, t: L('放租、託管按需揀', 'Choose the help you need'), s: L('只委託放租，或交俾我哋長期打理', 'Letting only, or ongoing management'), d: L('想自己管理，可以只委託放租；希望租出去後都有人持續睇住，可以揀租務管理。', 'Choose letting only if you prefer to manage the tenancy yourself, or management for continuing care.') },
    { Icon: RefreshCcw, t: L('租期持續跟進', 'Care through the tenancy'), s: L('租金、報修、續租都有人跟', 'Rent, repairs and renewals followed up'), d: L('揀租務管理，租金到賬、租客報修、維修協調同續租退租都有人跟進，需要你決定時即時說明。', 'With management, rent, repair requests, trades and renewals are followed up, and you are told when a decision is needed.') },
    { Icon: ClipboardCheck, t: L('費用事先說明', 'Fees set out first'), s: L('委託前書面確認，重要決定你參與', 'Agreed in writing; you make the big calls'), d: L('委託前書面說明服務範圍同收費；租客揀、重大維修同租約調整，都同你溝通後再推進。', 'Scope and fees are set out in writing before appointment. You are involved in tenant selection, major repairs and lease changes.') },
  ];
  return <div className="owner-benefits">{benefits.map(({ Icon, t, s, d }) => <details key={t}><summary><span className="benefit-icon"><Icon size={22} aria-hidden /></span><span className="benefit-text"><h3>{t}</h3><span>{s}</span></span><Plus className="expand-icon" size={17} aria-hidden /></summary><p>{d}</p></details>)}</div>;
}

export function RentalCampaign({ standalone = false }: { standalone?: boolean }) {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const enquire = useEnquiry();
  const end = formatMonth(config.promotion.endMonth, lang);
  const offers = [
    { n: L('一', '1'), Icon: KeyRound, t: L('第一層樓，免出租佣金', 'First property: no letting commission'), d: L('同一位業主委託我哋出租嘅第一層樓屋，唔收出租佣金。', 'The first property an owner appoints us to let carries no letting commission.') },
    { n: L('二', '2'), Icon: Percent, t: L('第二層樓，出租佣金半價', 'Second property: half the letting commission'), d: L('同一位業主委託出租嘅第二層樓屋，出租佣金減半。', 'The second property from the same owner is let at half the usual commission.') },
    { n: L('三', '3'), Icon: Truck, t: L('出租配套，免費搬屋', 'Free moving with every letting'), d: L('用於搬入該房屋，業主或租客均可使用；服務區域同具體安排以團隊確認為準。', 'For moving into the property, for the owner or the tenant. Areas and arrangements are confirmed by our team.') },
  ];
  return <section className={`rental-campaign ${standalone ? 'campaign-standalone' : 'section'}`} id="offer" aria-labelledby="campaign-title">
    <div className="wrap">
      <div className="offer-head">
        <span className="offer-badge">{L('限時優惠', 'Limited-time offer')}</span>
        {standalone ? <h1 id="campaign-title">{L('業主限時優惠', 'Owner offers')}</h1> : <h2 id="campaign-title">{L('業主限時優惠', 'Owner offers')}</h2>}
        <p>{L(`活動有效期至 ${end}，具體規則以查詢確認為準。`, `Valid until ${end}. Exact terms are confirmed when you enquire.`)}</p>
      </div>
      <ol className="offer-list">{offers.map(({ n, Icon, t, d }) => <li key={n}>
        <span className="offer-num" aria-hidden>{n}</span>
        <div><h3><Icon size={20} aria-hidden />{t}</h3><p>{d}</p></div>
      </li>)}</ol>
      <div className="offer-foot">
        <p>{L('租務管理嘅管理費單獨約定，唔喺優惠範圍內。目前唔接由其他代理轉嚟嘅委託。', 'Ongoing management fees are agreed separately and are not part of these offers. We do not currently take over appointments from another agency.')}</p>
        <button className="btn btn-primary" type="button" onClick={() => enquire({ service: 'letting' })}>{L('查詢優惠', 'Ask about the offers')}<ArrowRight size={17} aria-hidden /></button>
      </div>
    </div>
  </section>;
}

export function CompanyIntroduction({ full = false }: { full?: boolean }) {
  const { L } = useI18n();
  return <section className={`company-intro section ${full ? 'company-full' : ''}`} id="company">
    <div className="wrap company-layout">
      <figure className="company-image"><SmartImg src={IMG.interior} alt={L('住宅室內風貌', 'Residential interior')} position="50% 60%" /></figure>
      <div className="company-copy">
        <h2>{L('悦港，等房產服務更清楚。', 'Eucove. Property care, clearly explained.')}</h2>
        <p>{L('悦港 Harbour Joy 專注香港房產出租同租務管理，同時提供房屋買賣同網上睇樓查詢。我哋主要服務華人客戶，都歡迎英文客戶。', 'Harbour Joy specialises in Hong Kong property letting and ongoing management, alongside buying, selling and online viewing enquiries. We work in Chinese and English.')}</p>
        <p>{L('本地團隊處理睇樓、交收、巡檢等現場工作，同事跟進聯絡。我哋先說明服務範圍同費用，再根據房屋情況安排工作；需要業主決定嘅事項，溝通清楚後再推進。', 'Local teams handle viewings, handovers and inspections, while an assistant follows up communication. We explain scope and fees first, plan work around your property and involve you when a decision is needed.')}</p>
        {!full && <Link className="textlink" to="/about">{L('了解我哋嘅團隊', 'Meet Eucove')}<ArrowRight size={17} aria-hidden /></Link>}
      </div>
    </div>
  </section>;
}

export function ServicePractice() {
  const { L } = useI18n();
  const groups = [
    { title: L('出租前：將準備工作講清楚', 'Before letting: prepare the property'), body: L('了解地址、房屋狀況同你嘅出租計劃，參考同區域樓盤提出租金建議，整理清潔、小修同拍照等準備事項。', 'We review the property and your plans, use local listings to inform rent guidance and discuss cleaning, small repairs and photography.'), output: L('你會明確：建議租金、準備事項、服務範圍同費用。', 'You receive: rent guidance, preparation tasks, scope and fees.'), owner: L('由你確認出租預期、必要支出同委託安排。', 'You confirm expectations, necessary spending and the appointment.') },
    { title: L('放租中：由睇樓到簽約入住', 'During letting: from viewings to move-in'), body: L('推廣樓盤、安排睇樓並回應查詢，整理租客申請，同你溝通篩揀結果，再跟進租約同鑰匙交收。', 'We market the property, arrange viewings, handle enquiries and collate applications, then coordinate the lease and key handover.'), output: L('你會了解：申請情況、租約安排同交收入住事項。', 'You receive: application information, lease arrangements and handover details.'), owner: L('由你參與租客揀，並確認租約及出租條件。', 'You take part in selecting the tenant and confirming lease terms.') },
    { title: L('託管中：租出去之後繼續睇住', 'During management: care after move-in'), body: L('跟進租金到賬同租客日常問題，接收報修、協調維修，安排定期巡檢；臨近租約結束時跟進續租或退租交收。', 'We follow up rent and tenant queries, coordinate repairs and routine inspections, and handle renewal discussions or end-of-lease handover.'), output: L('你會了解：租金跟進、房屋狀況、維修同租約進展。', 'You receive: updates on rent, condition, repairs and the lease.'), owner: L('重大維修支出、租約調整等需你確認；具體授權範圍在協議中約定。', 'Significant repair costs and lease changes need your decision, within the authority agreed in writing.') },
  ];
  return <div className="service-practice">{groups.map((g, i) => <details key={g.title} open={i === 0}><summary>{g.title}<Plus size={18} aria-hidden /></summary><div><p>{g.body}</p><p><strong>{g.output}</strong></p><p className="fine">{g.owner}</p>{i === 2 && <p className="fine">{L('以上持續管理工作屬於租務管理；只放租嘅服務在交收入住完成後結束。', 'Ongoing care is part of management. Letting-only service ends after the move-in handover.')}</p>}</div></details>)}</div>;
}
