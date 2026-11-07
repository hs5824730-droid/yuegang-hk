import { useId, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ClipboardList, KeyRound, MessageSquareText, ShieldCheck } from 'lucide-react';
import { formatMonth, useConfig, useI18n } from '../i18n';
import { useEnquiry } from './Enquiry';
import { IMG, SmartImg } from './ui';

export type OwnerService = 'letting' | 'management';

/** A small piece of the cove mark, drawn as paths so it stays sharp on every phone. */
function CoveSignature() {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden className="cove-signature">
    <path d="M48.97 48.97A24 24 0 1 1 48.97 15.03" />
    <path d="M42.61 42.61A15 15 0 1 1 42.61 21.39" />
    <circle cx="32" cy="32" r="5.5" />
  </svg>;
}

export function OwnerHero({ service, onService }: { service: OwnerService; onService: (s: OwnerService) => void }) {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const enquire = useEnquiry();
  const uid = useId();
  const managed = service === 'management';
  const end = formatMonth(config.promotion.endMonth, lang);

  const changeWithKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 'letting' : e.key === 'End' ? 'management' : managed ? 'letting' : 'management';
    onService(next);
    document.getElementById(`${uid}-${next}`)?.focus();
  };

  return <section className="owner-hero" aria-labelledby={`${uid}-title`}>
    <div className="wrap owner-stage" data-service={service}>
      <div className="owner-heading">
        
        <h1 id={`${uid}-title`}>{L('澳洲房产', 'Australian property.')}<br /><span>{L('出租与托管', 'Letting & management.')}</span></h1>
        <p className="owner-subtitle">{L('帮您找到租客，也帮您打理租期里的日常。', 'Find a tenant. Keep the tenancy cared for.')}</p>
      </div>

      <div className="owner-visual">
        <figure className="owner-photo">
          <div className={`owner-photo-layer ${!managed ? 'is-active' : ''}`} aria-hidden={managed}>
            <SmartImg src={IMG.hero} alt={L('住宅风貌配图：树荫中的当代住宅', 'Editorial photograph: a contemporary home among trees')} position="56% 57%" eager />
          </div>
          <div className={`owner-photo-layer ${managed ? 'is-active' : ''}`} aria-hidden={!managed}>
            <SmartImg src={IMG.interior} alt={L('住宅风貌配图：采光明亮的客餐厅', 'Editorial photograph: a light-filled living and dining room')} position="52% 60%" />
          </div>
          
          <div className="owner-photo-caption" key={service} aria-hidden>
            <span>{managed ? 'LOOKED AFTER.' : 'WELCOME HOME.'}</span>
            <strong>{managed ? L('把日常，交给当地团队。', 'Everyday care. A local team.') : L('为房子，找到下一位住客。', 'A new chapter for your home.')}</strong>
          </div>
        </figure>
        <div className="owner-photo-signature" aria-hidden><CoveSignature /><span>Local care.<br />Closer to home.</span></div>
      </div>

      <div className="owner-selector">
        <div className="owner-service-tabs" role="tablist" aria-label={L('选择您需要的服务', 'Choose the service you need')} style={{ ['--selected' as string]: managed ? 1 : 0 }}>
          {(['letting', 'management'] as const).map((s) => <button key={s} type="button" role="tab" id={`${uid}-${s}`} aria-selected={service === s} aria-controls={`${uid}-panel`} tabIndex={service === s ? 0 : -1} onClick={() => onService(s)} onKeyDown={changeWithKey}>
            {s === 'letting' ? <KeyRound size={20} aria-hidden /> : <ShieldCheck size={20} aria-hidden />}
            <span>{s === 'letting' ? L('仅招租', 'Letting only') : L('长期托管', 'Management')}</span>
            <Check className="owner-tab-check" size={15} aria-hidden />
          </button>)}
        </div>
        <div className="owner-service-panel" id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-${service}`}>
          <p key={service}>{managed
            ? L('招租、收租跟进、维修协调、定期巡检，直到续租或退租交接。', 'Letting, rent follow-up, repairs and inspections, through to renewal or end-of-lease handover.')
            : L('推广、看房、筛选申请、签约交接。租客入住后，由您自己打理。', 'Marketing, viewings, applications and handover. You manage the tenancy after move-in.')}</p>
          <div className="owner-actions">
            <button className="btn btn-primary" type="button" onClick={() => enquire({ service })}>
              {managed ? L('咨询长期托管', 'Enquire about management') : L('咨询房屋出租', 'Enquire about letting')}<ArrowRight size={18} aria-hidden />
            </button>
            <a href="#services" className="owner-secondary">{L('具体做什么', 'What’s included')}<ArrowRight size={14} aria-hidden /></a>
          </div>
          <p className="owner-reassure">{L('助理联系您 · 咨询不代表委托', 'An assistant follows up · No commitment to appoint')}</p>
        </div>
      </div>

      <Link to="/offer" className="owner-offer">
        <span className="offer-symbol" aria-hidden>0<span>%</span></span>
        <span><strong>{L('首套免出租佣金，第二套半价', 'First letting commission free. Second half-price.')}</strong><small>{L(`同一房东 · 仅出租佣金 · 至 ${end}`, `Same owner · letting commission only · until ${end}`)}</small></span>
        <ArrowRight size={17} aria-hidden />
      </Link>
    </div>
  </section>;
}

export function OwnerJourney() {
  const { L } = useI18n();
  const enquire = useEnquiry();
  const [stage, setStage] = useState(0);
  const uid = useId();
  const stages = [
    { label: L('出租前', 'Before letting'), title: L('先把房子准备好。', 'Get the property ready.'), img: IMG.white, pos: '50% 48%', icon: <ClipboardList />, scope: L('两种服务均包含', 'Included with both services'), text: L('先了解房子和您的预期，再一起确定挂牌与看房安排。', 'We get to know your property and expectations, then agree how to list and show it.'), items: [L('参考同区域房源，给出租金建议', 'Rent guidance from comparable local listings'), L('清洁、小修与拍照准备建议', 'Advice on cleaning, small repairs and photography'), L('确认服务范围与费用后，再开始', 'Agree scope and fees before we begin')] },
    { label: L('找到租客', 'Finding a tenant'), title: L('从一次看房，到正式入住。', 'From a viewing to moving in.'), img: IMG.hero, pos: '50% 60%', icon: <KeyRound />, scope: L('两种服务均包含', 'Included with both services'), text: L('当地团队跟进招租，申请资料整理清楚，由您参与租客选择。', 'Our local team handles letting and collates applications, with you involved in choosing the tenant.'), items: [L('推广房源，安排看房与咨询', 'Market the home and arrange viewings'), L('整理租客申请，与您沟通筛选', 'Review tenant applications with you'), L('跟进签约、钥匙与入住交接', 'Coordinate the lease, keys and move-in')] },
    { label: L('入住后', 'During the tenancy'), title: L('租出去以后，也有人跟进。', 'Care continues after move-in.'), img: IMG.interior, pos: '50% 60%', icon: <MessageSquareText />, scope: L('选择长期托管时包含', 'Included with ongoing management'), text: L('选择长期托管，我们继续对接租客，需要您决定的事及时说明。', 'With management, we stay in touch with the tenant and explain anything that needs your decision.'), items: [L('跟进租金到账与租客日常联络', 'Follow up rent and day-to-day tenant queries'), L('接收报修，协调维修安排', 'Take repair requests and coordinate trades'), L('用中文或英文向您沟通进展', 'Keep you informed in Chinese or English')] },
  ];
  const item = stages[stage];
  return <section className="section home-journey" id="services">
    <div className="wrap">
      <div className="section-head split-head">
        <div><h2>{L('每一步，我们做什么', 'What we take care of')}</h2><p>{L('点一下，看看出租前后分别由谁来处理。', 'Explore what happens before, during and after letting.')}</p></div>
        <Link to="/services#compare" className="textlink">{L('对比两种服务', 'Compare the services')}<ArrowRight size={16} aria-hidden /></Link>
      </div>
      <div className="journey-tabs" role="tablist" aria-label={L('出租的三个阶段', 'Three stages of letting')}>
        {stages.map((s, i) => <button key={i} role="tab" type="button" id={`${uid}-tab-${i}`} aria-selected={stage === i} aria-controls={`${uid}-panel`} tabIndex={stage === i ? 0 : -1} onClick={() => setStage(i)} onKeyDown={e => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
          e.preventDefault();
          const next = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (stage + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
          setStage(next);
          document.getElementById(`${uid}-tab-${next}`)?.focus();
        }}><span className="journey-index" aria-hidden>0{i + 1}</span><span>{s.label}</span><ArrowRight size={16} aria-hidden /></button>)}
      </div>
      <div className="journey-panel" id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${stage}`}>
        <figure className="journey-photo" key={item.img}>
          <SmartImg src={item.img} alt={L('住宅风貌配图，并非代理房源', 'Editorial home photograph, not a listing')} position={item.pos} />
          <figcaption>{L('住宅风貌配图', 'Editorial photograph')}</figcaption>
        </figure>
        <div className="journey-detail" key={stage}>
          <p className="journey-scope">{item.icon}{item.scope}</p>
          <h3>{item.title}</h3><p className="journey-description">{item.text}</p>
          <ul>{item.items.map(t => <li key={t}><Check size={16} aria-hidden />{t}</li>)}</ul>
          <button type="button" className="journey-enquire" onClick={() => enquire({ service: stage === 2 ? 'management' : 'letting' })}>{L('聊聊我的房子', 'Let’s discuss my property')}<ArrowRight size={17} aria-hidden /></button>
        </div>
      </div>
    </div>
  </section>;
}
