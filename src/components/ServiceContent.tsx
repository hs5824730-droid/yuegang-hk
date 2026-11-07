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
    [L('出租准备与租金建议', 'Preparation & rent guidance'), true],
    [L('推广、看房与申请筛选', 'Marketing, viewings & applications'), true],
    [L('租约沟通与入住交接', 'Lease & move-in handover'), true],
    [L('租金跟进与租客联络', 'Rent follow-up & tenant contact'), false],
    [L('维修协调与定期巡检', 'Repairs & routine inspections'), false],
    [L('续租与退租交接', 'Renewals & end-of-lease handover'), false],
  ] as const;
  return <div className="service-comparison" id="compare">
    <fieldset className="service-options">
      <legend className="sr-only">{L('选择要咨询的服务', 'Choose a service to enquire about')}</legend>
      {(['letting', 'management'] as const).map(s => <label className={`service-option ${selected === s ? 'selected' : ''}`} key={s}>
        <input type="radio" name={`${uid}-service`} checked={selected === s} onChange={() => setSelected(s)} />
        <span className="service-option-title">{s === 'letting' ? <KeyRound size={20} aria-hidden /> : <ShieldCheck size={20} aria-hidden />}{s === 'letting' ? L('仅招租', 'Letting only') : L('长期托管', 'Management')}</span>
        <span>{s === 'letting' ? L('我们找到租客，入住后由您管理。', 'We find the tenant. You manage the tenancy.') : L('从招租到租期内事务，持续由我们跟进。', 'We let the home and keep managing the tenancy.')}</span>
      </label>)}
    </fieldset>
    <table className="service-matrix" data-selected={selected}>
      <caption className="sr-only">{L('出租与长期托管服务对比', 'Letting and management comparison')}</caption>
      <thead><tr><th scope="col">{L('服务内容', 'Service')}</th><th scope="col">{L('仅招租', 'Letting')}</th><th scope="col">{L('长期托管', 'Management')}</th></tr></thead>
      <tbody>{rows.map(([label, included]) => <tr key={label}><th scope="row">{label}</th><td>{included ? <><Check aria-hidden size={18} /><span className="sr-only">{L('包含', 'Included')}</span></> : <span className="owner-handles">{L('房东自理', 'Owner')}</span>}</td><td><Check aria-hidden size={18} /><span className="sr-only">{L('包含', 'Included')}</span></td></tr>)}</tbody>
    </table>
    <div className="comparison-action">
      <p>{selected === 'management' ? L('适合不便到场，或希望有人持续处理租期事务的房东。', 'For owners who want ongoing help, wherever they live.') : L('适合愿意自行收租、处理维修和联络租客的房东。', 'For owners happy to handle rent, repairs and tenant contact themselves.')}</p>
      <button className="btn btn-primary" type="button" onClick={() => enquire({ service: selected })}>{selected === 'management' ? L('咨询长期托管', 'Enquire about management') : L('咨询仅招租', 'Enquire about letting')}<ArrowRight size={17} aria-hidden /></button>
    </div>
    <p className="fine">{L('具体工作安排、巡检频次及收费在委托前书面确认。', 'Scope, inspection frequency and fees are agreed in writing before appointment.')}</p>
  </div>;
}

export function OwnerBenefits() {
  const { L } = useI18n();
  const benefits = [
    { Icon: Languages, t: L('中文英文都能委托', 'Chinese or English'), s: L('华人房东全程中文，英文客户同样服务', 'Full service in Chinese, and the same service in English'), d: L('华人房东从咨询到委托、报告和确认决定，全程用中文；习惯英文的客户，同样可以委托出租、托管、买卖和置业顾问服务，全程英文对接。', 'Chinese-speaking owners are looked after in Chinese from enquiry to reports and approvals. English-speaking clients get the same letting, management, buying and selling and property services, entirely in English.') },
    { Icon: MapPin, t: L('当地团队处理现场', 'A local team on site'), s: L('看房、巡检、交接不必您到场', 'Viewings, inspections and handovers without you there'), d: L('看房、巡检与交接由当地团队安排；您通过助理了解进展，不必为每件小事亲自到场。', 'Viewings, inspections and handovers are arranged locally, with your assistant keeping you informed.') },
    { Icon: SlidersHorizontal, t: L('招租、托管按需选', 'Choose the help you need'), s: L('只委托招租，或交给我们长期打理', 'Letting only, or ongoing management'), d: L('想自己管理，可以只委托招租；希望租出去后也有人持续照看，可以选择长期托管。', 'Choose letting only if you prefer to manage the tenancy yourself, or management for continuing care.') },
    { Icon: RefreshCcw, t: L('租期持续跟进', 'Care through the tenancy'), s: L('租金、报修、续租都有人跟', 'Rent, repairs and renewals followed up'), d: L('选择长期托管，租金到账、租客报修、维修协调和续租退租都有人跟进，需要您决定时及时说明。', 'With management, rent, repair requests, trades and renewals are followed up, and you are told when a decision is needed.') },
    { Icon: ClipboardCheck, t: L('费用事先说明', 'Fees set out first'), s: L('委托前书面确认，重要决定您参与', 'Agreed in writing; you make the big calls'), d: L('委托前书面说明服务范围与收费；租客选择、重大维修和租约调整，都与您沟通后再推进。', 'Scope and fees are set out in writing before appointment. You are involved in tenant selection, major repairs and lease changes.') },
  ];
  return <div className="owner-benefits">{benefits.map(({ Icon, t, s, d }) => <details key={t}><summary><span className="benefit-icon"><Icon size={22} aria-hidden /></span><span className="benefit-text"><h3>{t}</h3><span>{s}</span></span><Plus className="expand-icon" size={17} aria-hidden /></summary><p>{d}</p></details>)}</div>;
}

export function RentalCampaign({ standalone = false }: { standalone?: boolean }) {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const enquire = useEnquiry();
  const end = formatMonth(config.promotion.endMonth, lang);
  const offers = [
    { n: L('一', '1'), Icon: KeyRound, t: L('第一套房，免出租佣金', 'First property: no letting commission'), d: L('同一位房东委托我们出租的第一套房屋，不收出租佣金。', 'The first property an owner appoints us to let carries no letting commission.') },
    { n: L('二', '2'), Icon: Percent, t: L('第二套房，出租佣金半价', 'Second property: half the letting commission'), d: L('同一位房东委托出租的第二套房屋，出租佣金减半。', 'The second property from the same owner is let at half the usual commission.') },
    { n: L('三', '3'), Icon: Truck, t: L('出租配套，免费搬家', 'Free moving with every letting'), d: L('用于搬入该房屋，房东或租客均可使用；服务区域与具体安排以团队确认为准。', 'For moving into the property, for the owner or the tenant. Areas and arrangements are confirmed by our team.') },
  ];
  return <section className={`rental-campaign ${standalone ? 'campaign-standalone' : 'section'}`} id="offer" aria-labelledby="campaign-title">
    <div className="wrap">
      <div className="offer-head">
        <span className="offer-badge">{L('限时优惠', 'Limited-time offer')}</span>
        {standalone ? <h1 id="campaign-title">{L('房东限时优惠', 'Owner offers')}</h1> : <h2 id="campaign-title">{L('房东限时优惠', 'Owner offers')}</h2>}
        <p>{L(`活动有效期至 ${end}，具体规则以咨询确认为准。`, `Valid until ${end}. Exact terms are confirmed when you enquire.`)}</p>
      </div>
      <ol className="offer-list">{offers.map(({ n, Icon, t, d }) => <li key={n}>
        <span className="offer-num" aria-hidden>{n}</span>
        <div><h3><Icon size={20} aria-hidden />{t}</h3><p>{d}</p></div>
      </li>)}</ol>
      <div className="offer-foot">
        <p>{L('长期托管的管理费单独约定，不在优惠范围内。目前不承接由其他中介转来的委托。', 'Ongoing management fees are agreed separately and are not part of these offers. We do not currently take over appointments from another agency.')}</p>
        <button className="btn btn-primary" type="button" onClick={() => enquire({ service: 'letting' })}>{L('咨询优惠', 'Ask about the offers')}<ArrowRight size={17} aria-hidden /></button>
      </div>
    </div>
  </section>;
}

export function CompanyIntroduction({ full = false }: { full?: boolean }) {
  const { L } = useI18n();
  return <section className={`company-intro section ${full ? 'company-full' : ''}`} id="company">
    <div className="wrap company-layout">
      <figure className="company-image"><SmartImg src={IMG.interior} alt={L('住宅室内风貌', 'Residential interior')} position="50% 60%" /></figure>
      <div className="company-copy">
        <h2>{L('桉湾，让房产服务更清楚。', 'Eucove. Property care, clearly explained.')}</h2>
        <p>{L('桉湾 EUCOVE 专注澳洲房产出租与长期托管，同时提供房屋买卖和在线看房咨询。我们主要服务华人客户，也欢迎英文客户。', 'EUCOVE specialises in Australian property letting and ongoing management, alongside buying, selling and online viewing enquiries. We work in Chinese and English.')}</p>
        <p>{L('当地团队处理看房、交接、巡检等现场工作，助理跟进联络。我们先说明服务范围和费用，再根据房屋情况安排工作；需要房东决定的事项，沟通清楚后再推进。', 'Local teams handle viewings, handovers and inspections, while an assistant follows up communication. We explain scope and fees first, plan work around your property and involve you when a decision is needed.')}</p>
        {!full && <Link className="textlink" to="/about">{L('了解我们的团队', 'Meet Eucove')}<ArrowRight size={17} aria-hidden /></Link>}
      </div>
    </div>
  </section>;
}

export function ServicePractice() {
  const { L } = useI18n();
  const groups = [
    { title: L('出租前：把准备工作说清楚', 'Before letting: prepare the property'), body: L('了解地址、房屋状况和您的出租计划，参考同区域房源提出租金建议，整理清洁、小修与拍照等准备事项。', 'We review the property and your plans, use local listings to inform rent guidance and discuss cleaning, small repairs and photography.'), output: L('您会明确：建议租金、准备事项、服务范围与费用。', 'You receive: rent guidance, preparation tasks, scope and fees.'), owner: L('由您确认出租预期、必要支出与委托安排。', 'You confirm expectations, necessary spending and the appointment.') },
    { title: L('招租中：从看房到签约入住', 'During letting: from viewings to move-in'), body: L('推广房源、安排看房并回应咨询，整理租客申请，与您沟通筛选结果，再跟进租约与钥匙交接。', 'We market the property, arrange viewings, handle enquiries and collate applications, then coordinate the lease and key handover.'), output: L('您会了解：申请情况、租约安排与入住交接事项。', 'You receive: application information, lease arrangements and handover details.'), owner: L('由您参与租客选择，并确认租约及出租条件。', 'You take part in selecting the tenant and confirming lease terms.') },
    { title: L('托管中：租出去以后继续照看', 'During management: care after move-in'), body: L('跟进租金到账和租客日常问题，接收报修、协调维修，安排定期巡检；临近租约结束时跟进续租或退租交接。', 'We follow up rent and tenant queries, coordinate repairs and routine inspections, and handle renewal discussions or end-of-lease handover.'), output: L('您会了解：租金跟进、房屋状况、维修与租约进展。', 'You receive: updates on rent, condition, repairs and the lease.'), owner: L('重大维修支出、租约调整等需您确认；具体授权范围在协议中约定。', 'Significant repair costs and lease changes need your decision, within the authority agreed in writing.') },
  ];
  return <div className="service-practice">{groups.map((g, i) => <details key={g.title} open={i === 0}><summary>{g.title}<Plus size={18} aria-hidden /></summary><div><p>{g.body}</p><p><strong>{g.output}</strong></p><p className="fine">{g.owner}</p>{i === 2 && <p className="fine">{L('以上持续管理工作属于长期托管；仅招租的服务在入住交接完成后结束。', 'Ongoing care is part of management. Letting-only service ends after the move-in handover.')}</p>}</div></details>)}</div>;
}
