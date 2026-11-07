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
        
        <h1 id={`${uid}-title`}>{L('香港房產', 'Hong Kong property.')}<br /><span>{L('放租同管理', 'Letting & management.')}</span></h1>
        <p className="owner-subtitle">{L('幫你搵到租客，都幫你打理租期裏嘅日常。', 'Find a tenant. Keep the tenancy cared for.')}</p>
      </div>

      <div className="owner-visual">
        <figure className="owner-photo">
          <div className={`owner-photo-layer ${!managed ? 'is-active' : ''}`} aria-hidden={managed}>
            <SmartImg src={IMG.hero} alt={L('住宅風貌配圖：樹蔭中嘅當代住宅', 'Editorial photograph: a contemporary home among trees')} position="56% 57%" eager />
          </div>
          <div className={`owner-photo-layer ${managed ? 'is-active' : ''}`} aria-hidden={!managed}>
            <SmartImg src={IMG.interior} alt={L('住宅風貌配圖：採光明亮嘅客餐廳', 'Editorial photograph: a light-filled living and dining room')} position="52% 60%" />
          </div>
          
          <div className="owner-photo-caption" key={service} aria-hidden>
            <span>{managed ? 'LOOKED AFTER.' : 'WELCOME HOME.'}</span>
            <strong>{managed ? L('將日常，交俾本地團隊。', 'Everyday care. A local team.') : L('為單位，搵到下一位住客。', 'A new chapter for your home.')}</strong>
          </div>
        </figure>
        <div className="owner-photo-signature" aria-hidden><CoveSignature /><span>Local care.<br />Closer to home.</span></div>
      </div>

      <div className="owner-selector">
        <div className="owner-service-tabs" role="tablist" aria-label={L('揀你需要嘅服務', 'Choose the service you need')} style={{ ['--selected' as string]: managed ? 1 : 0 }}>
          {(['letting', 'management'] as const).map((s) => <button key={s} type="button" role="tab" id={`${uid}-${s}`} aria-selected={service === s} aria-controls={`${uid}-panel`} tabIndex={service === s ? 0 : -1} onClick={() => onService(s)} onKeyDown={changeWithKey}>
            {s === 'letting' ? <KeyRound size={20} aria-hidden /> : <ShieldCheck size={20} aria-hidden />}
            <span>{s === 'letting' ? L('只放租', 'Letting only') : L('租務管理', 'Management')}</span>
            <Check className="owner-tab-check" size={15} aria-hidden />
          </button>)}
        </div>
        <div className="owner-service-panel" id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-${service}`}>
          <p key={service}>{managed
            ? L('放租、收租跟進、維修協調、定期巡檢，直到續租或退租交收。', 'Letting, rent follow-up, repairs and inspections, through to renewal or end-of-lease handover.')
            : L('推廣、睇樓、篩揀申請、簽約交收。租客入住後，由你自己打理。', 'Marketing, viewings, applications and handover. You manage the tenancy after move-in.')}</p>
          <div className="owner-actions">
            <button className="btn btn-primary" type="button" onClick={() => enquire({ service })}>
              {managed ? L('查詢租務管理', 'Enquire about management') : L('查詢房屋出租', 'Enquire about letting')}<ArrowRight size={18} aria-hidden />
            </button>
            <a href="#services" className="owner-secondary">{L('具體做咩', 'What’s included')}<ArrowRight size={14} aria-hidden /></a>
          </div>
          <p className="owner-reassure">{L('同事聯絡你 · 查詢唔代表委託', 'An assistant follows up · No commitment to appoint')}</p>
        </div>
      </div>

      <Link to="/offer" className="owner-offer">
        <span className="offer-symbol" aria-hidden>0<span>%</span></span>
        <span><strong>{L('首個單位免出租佣金，第二個單位半價', 'First letting commission free. Second half-price.')}</strong><small>{L(`同一業主 · 僅出租佣金 · 至 ${end}`, `Same owner · letting commission only · until ${end}`)}</small></span>
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
    { label: L('出租前', 'Before letting'), title: L('先將單位準備好。', 'Get the property ready.'), img: IMG.white, pos: '50% 48%', icon: <ClipboardList />, scope: L('兩種服務均包含', 'Included with both services'), text: L('先了解單位同你嘅預期，再一齊確定掛牌同睇樓安排。', 'We get to know your property and expectations, then agree how to list and show it.'), items: [L('參考同區域樓盤，俾出租金建議', 'Rent guidance from comparable local listings'), L('清潔、小修同拍照準備建議', 'Advice on cleaning, small repairs and photography'), L('確認服務範圍同費用後，再開始', 'Agree scope and fees before we begin')] },
    { label: L('搵到租客', 'Finding a tenant'), title: L('由一次睇樓，到正式入住。', 'From a viewing to moving in.'), img: IMG.hero, pos: '50% 60%', icon: <KeyRound />, scope: L('兩種服務均包含', 'Included with both services'), text: L('本地團隊跟進放租，申請資料整理清楚，由你參與租客揀。', 'Our local team handles letting and collates applications, with you involved in choosing the tenant.'), items: [L('推廣樓盤，安排睇樓同查詢', 'Market the home and arrange viewings'), L('整理租客申請，同你溝通篩揀', 'Review tenant applications with you'), L('跟進簽約、鑰匙同交收入住', 'Coordinate the lease, keys and move-in')] },
    { label: L('入住後', 'During the tenancy'), title: L('租出去之後，都有人跟進。', 'Care continues after move-in.'), img: IMG.interior, pos: '50% 60%', icon: <MessageSquareText />, scope: L('揀租務管理時包含', 'Included with ongoing management'), text: L('揀租務管理，我哋繼續對接租客，需要你決定嘅事即時說明。', 'With management, we stay in touch with the tenant and explain anything that needs your decision.'), items: [L('跟進租金到賬同租客日常聯絡', 'Follow up rent and day-to-day tenant queries'), L('接收報修，協調維修安排', 'Take repair requests and coordinate trades'), L('用粵語、普通話或者英文向你溝通進展', 'Keep you informed in Chinese or English')] },
  ];
  const item = stages[stage];
  return <section className="section home-journey" id="services">
    <div className="wrap">
      <div className="section-head split-head">
        <div><h2>{L('每一步，我哋做咩', 'What we take care of')}</h2><p>{L('點一下，睇吓出租前後分別由邊個來處理。', 'Explore what happens before, during and after letting.')}</p></div>
        <Link to="/services#compare" className="textlink">{L('對比兩種服務', 'Compare the services')}<ArrowRight size={16} aria-hidden /></Link>
      </div>
      <div className="journey-tabs" role="tablist" aria-label={L('出租嘅三個階段', 'Three stages of letting')}>
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
          <SmartImg src={item.img} alt={L('住宅風貌配圖，並非代理樓盤', 'Editorial home photograph, not a listing')} position={item.pos} />
          <figcaption>{L('住宅風貌配圖', 'Editorial photograph')}</figcaption>
        </figure>
        <div className="journey-detail" key={stage}>
          <p className="journey-scope">{item.icon}{item.scope}</p>
          <h3>{item.title}</h3><p className="journey-description">{item.text}</p>
          <ul>{item.items.map(t => <li key={t}><Check size={16} aria-hidden />{t}</li>)}</ul>
          <button type="button" className="journey-enquire" onClick={() => enquire({ service: stage === 2 ? 'management' : 'letting' })}>{L('傾吓我嘅單位', 'Let’s discuss my property')}<ArrowRight size={17} aria-hidden /></button>
        </div>
      </div>
    </div>
  </section>;
}
